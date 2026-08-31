// ================================================================
//  pending-orders-logic.js — OpticUnity
//  Pending Orders page — lists every saved order with anything still
//  open: balance > 0, OR any job that isn't both 'done' AND
//  'claimed' yet (i.e. still pending/processing, or done-but-
//  unclaimed). Widened from an earlier, narrower "balance>0 OR
//  done-but-unclaimed" rule per Marc — this is deliberately meant as
//  a single-glance "is there anything left to follow up on, on
//  either the money side or the lab side" overview, not just a
//  today-actionable queue. An empty list means every order is fully
//  paid AND every job has been claimed — nothing left anywhere.
//  Two new capabilities live here:
//
//   1. "Pay Balance" — a parallel payment path that reads/writes a
//      SAVED order object straight out of Storage. This is
//      deliberately NOT soOpenAddPaymentModal/soConfirmPaymentModal
//      from order-payment-logic.js — those are wired to the live
//      New Order session (soOrderRows/soItemsLocked/soLockedTotal/
//      soPayments as globals) and have no saved-order concept at
//      all. Reuses what's genuinely shared (SO_PAYMENT_METHODS,
//      soFormatPaymentLabel, soPaymentStatus) rather than
//      duplicating those, per Marc's call in the handoff.
//      Unlike order-creation payments, Pay Balance does NOT enforce
//      "one method per order" — that rule exists there to avoid
//      redundant same-sitting entries (two separate Cash lines in
//      one transaction), but Pay Balance spans multiple future
//      visits, so the same method legitimately recurs (e.g. cash
//      today, more cash next week). Each visit is its own payment
//      entry with its own timestamp, same as any other method.
//
//   2. Claim — per-job customer pickup, flat-gated on
//      jobStatus==='done' && order.balance===0 (see handleSaveOrder's
//      comment in order-form-logic.js for why jobStatus and claimed
//      are kept orthogonal). Lives here (not Job Orders) because it
//      needs the parent order's balance, which Job Orders' pure
//      lab-status view doesn't carry.
//
//  Both write paths go through soWithStorageLock('salesOrders', ...)
//  like every other salesOrders mutation, so this is cross-tab safe.
// ================================================================

let _poActiveOrderId = null; // order the Pay Balance modal is currently open for

// ── Does this order belong in Pending Orders? balance>0 OR any job not yet
// done-and-claimed (pending, processing, or done-but-unclaimed all count). Deliberately
// a live computation, not a stored flag — same anti-drift reasoning as "Ready for
// Pickup" in view-records.js: once every job is claimed and balance hits ₱0, the order
// should just stop appearing here on its own, nothing to "close out". ──
function _poOrderIsOutstanding(order) {
    if ((order.balance || 0) > 0) return true;
    return (order.items || []).some(i => i.jobId && (i.jobStatus !== 'done' || !i.claimed));
}

function initPendingOrdersNav() {
    document.getElementById('pendingOrdersNavLink')?.addEventListener('click', () => {
        renderPendingOrdersTable();
    });

    document.getElementById('pendingOrdersSearchBarInput')?.addEventListener('input', (e) => {
        renderPendingOrdersTable(e.target.value);
    });

    document.getElementById('payBalanceModalMethod')?.addEventListener('change', poOnPayBalanceMethodChange);
}

function renderPendingOrdersTable(filter = "", page = 1) {
    const tableBody = document.querySelector('#pendingOrdersTable tbody');
    if (!tableBody) return;

    const rowsPerPage = 10;
    const orders    = JSON.parse(Storage.getItem('salesOrders') || '[]');
    const customers = JSON.parse(Storage.getItem('customers')   || '[]');

    const outstanding = orders.filter(_poOrderIsOutstanding);

    if (outstanding.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="6" style="color:gray;font-style:italic;padding:20px;text-align:center;">
                Nothing outstanding — every order is fully paid and every job is claimed.
            </td></tr>`;
        document.getElementById('pendingOrdersPagination').innerHTML = '';
        return;
    }

    const search = filter.toLowerCase();
    const filtered = outstanding
        .filter(o => {
            const customer     = customers.find(c => c.id === o.customerId);
            const customerName = o.isWalkIn ? 'walk-in' : (customer?.name || '').toLowerCase();
            const jobIds        = (o.items || []).map(i => (i.jobId || '').toLowerCase());
            return o.id.toLowerCase().includes(search)
                || customerName.includes(search)
                || jobIds.some(j => j.includes(search));
        })
        .reverse();

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="6" style="color:gray;font-style:italic;padding:20px;text-align:center;">
                No Match Found
            </td></tr>`;
        document.getElementById('pendingOrdersPagination').innerHTML = '';
        return;
    }

    const start     = (page - 1) * rowsPerPage;
    const pageItems = filtered.slice(start, start + rowsPerPage);

    pageItems.forEach(order => {
        tableBody.appendChild(createPendingOrderRow(order, customers));
    });

    createPagination(
        'pendingOrdersPagination',
        filtered,
        page,
        rowsPerPage,
        (newPage) => renderPendingOrdersTable(filter, newPage)
    );
}

function createPendingOrderRow(order, customers) {
    const row = document.createElement('tr');

    const customer     = customers.find(c => c.id === order.customerId);
    const customerName = order.isWalkIn ? 'Walk-in' : (customer?.name || '—');
    const payStatus     = SO_PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus;
    const jobSummary     = _soOrderJobStatusSummary(order);

    row.innerHTML = `
        <td>${escapeHtml(order.id)}</td>
        <td class="uppercase">${escapeHtml(customerName)}</td>
        <td>${_soMoney(order.balance)}</td>
        <td><span class="so-status-badge so-status-${order.paymentStatus}">${escapeHtml(payStatus)}</span></td>
        <td><span class="so-status-badge so-status-${jobSummary.cls}">${escapeHtml(jobSummary.label)}</span></td>
        <td>
            <button class="toggle-btn" title="View">▼</button>
        </td>
    `;

    row.querySelector('.toggle-btn').addEventListener('click', (e) => {
        const next = row.nextElementSibling;
        if (next && next.classList.contains('details-row')) {
            next.remove();
            e.target.textContent = '▼';
            return;
        }
        row.after(createPendingOrderDetailRow(order));
        e.target.textContent = '▲';
    });

    return row;
}

function createPendingOrderDetailRow(order) {
    const detailRow = document.createElement('tr');
    detailRow.classList.add('details-row');

    const jobs = (order.items || []).filter(i => i.jobId);

    const jobRows = jobs.map(job => {
        const canClaim = job.jobStatus === 'done' && !job.claimed && order.balance === 0;
        const claimCell = job.claimed
            ? `✓ ${_soFormatTimestamp(job.claimedAt)}`
            : (canClaim
                ? `<button type="button" class="toggle-btn po-claim-btn" data-job-id="${escapeHtml(job.jobId)}">Claim</button>`
                : '—');

        return `
            <tr>
                <td style="text-align:left;">${escapeHtml(job.description || job.type)}</td>
                <td>${escapeHtml(job.jobId)}</td>
                <td><span class="so-status-badge so-status-${job.jobStatus}">${escapeHtml(SO_JOB_STATUS_LABELS[job.jobStatus] || job.jobStatus)}</span></td>
                <td>${claimCell}</td>
            </tr>`;
    }).join('');

    const paymentRows = (order.payments || []).map(p => `
        <tr><td colspan="2" style="text-align:left;">${escapeHtml(soFormatPaymentLabel(p))} <span style="opacity:0.6;font-size:11px;">${_soFormatTimestamp(p.timestamp)}</span></td><td colspan="2">${_soMoney(p.amount)}</td></tr>`
    ).join('');

    const payBalanceBtn = order.balance > 0
        ? `<button type="button" class="so-add-payment-btn po-pay-balance-btn">+ Pay Balance (${_soMoney(order.balance)} due)</button>`
        : '';

    detailRow.innerHTML = `
        <td colspan="6">
            ${jobs.length > 0 ? `
            <table class="inner-table">
                <thead><tr><th>Item</th><th>Job ID</th><th>Status</th><th>Claim</th></tr></thead>
                <tbody>${jobRows}</tbody>
            </table>` : ''}
            <table class="inner-table">
                <thead><tr><th colspan="2">Payments</th><th colspan="2">Amount</th></tr></thead>
                <tbody>${paymentRows || '<tr><td colspan="4" style="color:gray;font-style:italic;">No payments recorded</td></tr>'}</tbody>
            </table>
            ${payBalanceBtn}
        </td>`;

    detailRow.querySelector('.po-pay-balance-btn')?.addEventListener('click', () => poOpenPayBalanceModal(order.id));
    detailRow.querySelectorAll('.po-claim-btn').forEach(btn => {
        btn.addEventListener('click', () => claimJob(order.id, btn.dataset.jobId));
    });

    return detailRow;
}

// ================================================================
//  Pay Balance — parallel payment path against a SAVED order.
//  Same amount rules as soConfirmPaymentModal (non-cash capped to
//  what's left, cash free to exceed for change), re-derived against
//  order.balance / order.payments instead of soLockedTotal /
//  soPayments. Unlike order creation, methods CAN repeat here — see
//  the file header comment for why. No ₱0 entries here either —
//  unlike order creation, there's no "explicit zero downpayment"
//  concept once an order already exists and has a real balance;
//  ₱0 would just be a no-op click.
// ================================================================

function poOpenPayBalanceModal(orderId) {
    const orders = JSON.parse(Storage.getItem('salesOrders') || '[]');
    const order  = orders.find(o => o.id === orderId);
    if (!order || order.balance <= 0) return;

    _poActiveOrderId = orderId;

    const select = document.getElementById('payBalanceModalMethod');
    const options = SO_PAYMENT_METHODS
        .map(m => `<option value="${m.value}">${m.label}</option>`)
        .join('');
    select.innerHTML = `<option value="">-- Select --</option>${options}`;

    document.getElementById('payBalanceModalHeader').textContent = `Pay Balance — ${order.id}`;
    document.getElementById('payBalanceModalDue').textContent = `Balance due: ${_soMoney(order.balance)}`;
    document.getElementById('payBalanceModalAmount').value = '';
    document.getElementById('payBalanceModalProvider').value = '';
    poOnPayBalanceMethodChange();

    document.getElementById('payBalanceModal').classList.add('active');
    if (typeof soScrollModalToTop === 'function') soScrollModalToTop('payBalanceModal');
}

function poOnPayBalanceMethodChange() {
    const method     = document.getElementById('payBalanceModalMethod')?.value;
    const methodDef  = SO_PAYMENT_METHODS.find(m => m.value === method);
    const needsProvider = !!methodDef?.needsProvider;

    const providerLabel = document.getElementById('payBalanceModalProviderLabel');
    const providerInput = document.getElementById('payBalanceModalProvider');
    if (!providerLabel || !providerInput) return;

    providerLabel.classList.toggle('hidden', !needsProvider);
    providerInput.classList.toggle('hidden', !needsProvider);
    providerInput.placeholder = methodDef?.providerHint || '';
    if (!needsProvider) providerInput.value = '';
}

function poCancelPayBalanceModal() {
    document.getElementById('payBalanceModal').classList.remove('active');
    document.getElementById('payBalanceModalMethod').value = '';
    document.getElementById('payBalanceModalAmount').value = '';
    document.getElementById('payBalanceModalProvider').value = '';
    _poActiveOrderId = null;
}

async function poConfirmPayBalance() {
    const orderId  = _poActiveOrderId;
    const method   = document.getElementById('payBalanceModalMethod').value;
    let amount     = parseFloat(document.getElementById('payBalanceModalAmount').value);
    const provider = document.getElementById('payBalanceModalProvider').value.trim();
    const methodDef = SO_PAYMENT_METHODS.find(m => m.value === method);

    if (!orderId) return;

    if (!method) {
        openAlert({ title: 'Method Required', body: 'Please select a payment method before saving.' });
        return;
    }
    if (methodDef?.needsProvider && !provider) {
        openAlert({
            title: 'Provider Name Required',
            body:  `Please enter which ${methodDef.label.toLowerCase()} was used (${methodDef.providerHint}).`
        });
        return;
    }
    if (amount === null || amount === undefined || isNaN(amount) || amount <= 0) {
        openAlert({ title: 'Amount Required', body: 'Please enter a valid payment amount greater than zero.' });
        return;
    }

    // ── Critical section: re-read the order fresh under the lock (another tab may have
    // added a payment/claim since the modal opened), re-validate against ITS numbers,
    // then write. Mirrors handleSaveOrder's "everything above stays outside the lock"
    // shape — the alerts above never touch shared storage. ──
    const result = await soWithStorageLock('salesOrders', async () => {
        const orders = JSON.parse(Storage.getItem('salesOrders') || '[]');
        const order  = orders.find(o => o.id === orderId);
        if (!order) return { ok: false, reason: 'gone' };
        if (order.balance <= 0) return { ok: false, reason: 'already-paid' };

        let amt = amount;
        if (method !== 'cash') {
            amt = Math.min(amt, order.balance);
        }

        const timestamp = new Date().toISOString();
        const paymentEntry = methodDef?.needsProvider ? { method, provider, amount: amt, timestamp } : { method, amount: amt, timestamp };
        order.payments = [...(order.payments || []), paymentEntry];

        const tendered  = order.payments.reduce((s, p) => s + (p.amount || 0), 0);
        const hasCash   = order.payments.some(p => p.method === 'cash');
        const newPaid   = Math.min(tendered, order.total);
        const newChange = (tendered > order.total && hasCash) ? +(tendered - order.total).toFixed(2) : 0;
        const newBalance = Math.max(0, +(order.total - newPaid).toFixed(2));

        order.amountPaid    = +newPaid.toFixed(2);
        order.changeDue     = newChange;
        order.balance       = newBalance;
        order.paymentStatus = soPaymentStatus(newPaid, order.total);

        Storage.setItem('salesOrders', JSON.stringify(orders));
        return { ok: true, order };
    });

    if (!result.ok) {
        const messages = {
            'gone':         'This order could not be found — it may have been modified elsewhere.',
            'already-paid': 'This order\'s balance was already covered — nothing left to pay.'
        };
        openAlert({ title: 'Could Not Add Payment', body: messages[result.reason] || 'Please try again.' });
        poCancelPayBalanceModal();
        renderPendingOrdersTable(document.getElementById('pendingOrdersSearchBarInput')?.value || '');
        return;
    }

    poCancelPayBalanceModal();
    renderPendingOrdersTable(document.getElementById('pendingOrdersSearchBarInput')?.value || '');
}

// ================================================================
//  Claim — per-job customer pickup. Flat rule, no exceptions:
//  jobStatus==='done' && order.balance===0. Re-checked under the
//  lock, not just trusted from the button having rendered — the
//  button's enabled state can go stale if another tab claims/pays
//  first.
// ================================================================

async function claimJob(orderId, jobId) {
    const result = await soWithStorageLock('salesOrders', async () => {
        const orders = JSON.parse(Storage.getItem('salesOrders') || '[]');
        const order  = orders.find(o => o.id === orderId);
        if (!order) return { ok: false };

        const item = (order.items || []).find(i => i.jobId === jobId);
        if (!item) return { ok: false };
        if (item.jobStatus !== 'done' || item.claimed || order.balance !== 0) return { ok: false, reason: 'not-eligible' };

        item.claimed   = true;
        item.claimedAt = new Date().toISOString();

        Storage.setItem('salesOrders', JSON.stringify(orders));
        return { ok: true };
    });

    if (!result.ok && result.reason === 'not-eligible') {
        openAlert({ title: 'Not Claimable', body: 'This job can only be claimed once it\'s Done and the order balance is fully paid.' });
    }

    renderPendingOrdersTable(document.getElementById('pendingOrdersSearchBarInput')?.value || '');
}