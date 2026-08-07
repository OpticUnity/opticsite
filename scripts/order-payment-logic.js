// ================================================================
//  order-payment-logic.js — OpticUnity
//  Split-tender payments: methods, provider names, add/edit/remove,
//  the non-cash cap + duplicate/locked-row guards, and the payment-
//  side totals (Amount Paid / Balance / Change Due).
//
//  Split out of order-form-logic.js — see that file's header for the
//  full split rationale. Shares global scope with it; soOrderRows,
//  soItemsLocked, soLockedTotal, soRecalcOrderTotals, soRenderInfoRow
//  etc. all live there and are referenced here directly.
// ================================================================

// ── Split-tender payments state ──
// Payments start empty — every entry is added via a validated Add/Edit modal, so there's
// no "permanent first row" concept needed anymore (a half-filled row can no longer exist).
let soPayments = []; // [{ method: 'cash'|'ewallet'|'bank'|'card', provider?: string, amount: number }]

// Consolidated to 4 broad methods. Cash needs nothing further; the other three prompt
// for a provider name in the modal (e.g. which e-wallet, which bank, which card network) —
// that name gets combined into the payment row's display label ("E-Wallet | GCash"), the
// same way an item row combines its type + typed-in details into one description.
const SO_PAYMENT_METHODS = [
    { value: 'cash',    label: 'Cash',          needsProvider: false, providerHint: '' },
    { value: 'ewallet', label: 'E-Wallet',      needsProvider: true,  providerHint: 'e.g. GCash, Maya' },
    { value: 'bank',    label: 'Bank Transfer', needsProvider: true,  providerHint: 'e.g. BDO, BPI' },
    { value: 'card',    label: 'Card',          needsProvider: true,  providerHint: 'e.g. Visa, Mastercard' }
];

// null = modal is in "Add" mode; a number = editing that soPayments index
let _soPaymentModalIndex = null;

// ── Combined "Method | Provider" display label — mirrors how an item row combines its
// type + typed-in details into one description. The pieces stay stored separately on the
// payment object (method, provider) so Edit Payment can still pre-fill each field on its own;
// this just builds the one-line label for display. ──
function soFormatPaymentLabel(p) {
    const methodDef = SO_PAYMENT_METHODS.find(m => m.value === p.method);
    const label = methodDef?.label || p.method;
    return (methodDef?.needsProvider && p.provider) ? `${label} | ${p.provider}` : label;
}

function soRenderPaymentRows() {
    const container = document.getElementById('paymentRowsContainer');
    if (!container) return;

    if (soPayments.length === 0) {
        container.innerHTML = `<p class="so-payments-empty">No payments added yet.</p>`;
    } else {
        container.innerHTML = soPayments.map((p, i) => {
            const methodLabel = soFormatPaymentLabel(p);
            const isLocked    = !!p.locked;

            // Locked (auto-zero) entries are display-only — nothing to edit or remove.
            const actionsHtml = isLocked
                ? `<span class="so-payment-auto-badge">Free Order</span>`
                : `<button type="button" class="so-edit-payment-btn" title="Edit payment"
                       onclick="soOpenEditPaymentModal(${i})">${SO_ICON_EDIT}</button>
                   <button type="button" class="so-remove-payment-btn" title="Remove payment"
                       onclick="soRemovePayment(${i})">&#10005;</button>`;

            return `
                <div class="so-payment-row ${isLocked ? 'so-payment-row-locked' : ''}" data-index="${i}">
                    <div class="so-payment-actions">
                        ${actionsHtml}
                    </div>
                    <div class="so-payment-fields">
                        <input type="text" class="so-payment-method-label" value="${escapeHtml(methodLabel)}" title="${escapeHtml(methodLabel)}" readonly>
                        <input type="text" class="so-payment-amount-label" value="${(p.amount || 0).toFixed(2)}" readonly>
                    </div>
                </div>`;
        }).join('');
    }

    soUpdateAddPaymentButtonState();
}

// "+ Add Payment" is only gated on: is there a bill to pay, and are there any methods left to use.
// No more "is the previous row filled" concern — that class of problem no longer exists.
function soUpdateAddPaymentButtonState() {
    const addBtn = document.getElementById('addPaymentBtn');
    if (!addBtn) return;
    const isFreeOrder = soItemsLocked && soLockedTotal === 0; // nothing left to collect

    // Once tendered meets/exceeds Total, there's nothing left to pay — lock Add Payment
    // outright rather than only capping a new non-cash entry's value. Cash itself is left
    // alone here (soConfirmPaymentModal never caps cash — that's how change is produced),
    // this just stops a *new* payment method from being opened once balance is already 0.
    const tendered    = soPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const balanceMet  = soItemsLocked && soLockedTotal > 0 && tendered >= soLockedTotal;

    addBtn.disabled = !soItemsLocked || isFreeOrder || balanceMet || soPayments.length >= SO_PAYMENT_METHODS.length;
}

// ── Populate the modal's Method dropdown, excluding methods already used by OTHER rows ──
function _soPopulatePaymentModalMethods(currentMethod) {
    const select = document.getElementById('paymentModalMethod');
    if (!select) return;

    const usedByOthers = soPayments
        .filter((p, i) => i !== _soPaymentModalIndex)
        .map(p => p.method)
        .filter(Boolean);

    const options = SO_PAYMENT_METHODS
        .filter(m => !usedByOthers.includes(m.value))
        .map(m => `<option value="${m.value}" ${m.value === currentMethod ? 'selected' : ''}>${m.label}</option>`)
        .join('');

    select.innerHTML = `<option value="">-- Select --</option>${options}`;
}

// ── Show/hide the Provider Name field based on the selected method, and swap its
// placeholder to match (e.g. "e.g. GCash, Maya" for E-Wallet). Cash has no provider,
// so the field stays hidden and its value gets cleared rather than left stale. ──
function soOnPaymentMethodChange() {
    const method       = document.getElementById('paymentModalMethod')?.value;
    const methodDef     = SO_PAYMENT_METHODS.find(m => m.value === method);
    const needsProvider = !!methodDef?.needsProvider;

    const providerLabel = document.getElementById('paymentModalProviderLabel');
    const providerInput = document.getElementById('paymentModalProvider');
    if (!providerLabel || !providerInput) return;

    providerLabel.classList.toggle('hidden', !needsProvider);
    providerInput.classList.toggle('hidden', !needsProvider);
    providerInput.placeholder = methodDef?.providerHint || '';
    if (!needsProvider) providerInput.value = '';
}

// ── Open modal in Add mode ──
function soOpenAddPaymentModal() {
    if (!soItemsLocked) return;                                    // payment phase not started yet
    if (soLockedTotal === 0) return;                               // free order — auto-locked ₱0 Cash, nothing to add
    if (soPayments.length >= SO_PAYMENT_METHODS.length) return;    // all methods already used
    const tendered = soPayments.reduce((s, p) => s + (p.amount || 0), 0);
    if (tendered >= soLockedTotal) return;                         // balance already fully met

    _soPaymentModalIndex = null;
    document.getElementById('paymentModalHeader').textContent = 'Add Payment';
    _soPopulatePaymentModalMethods('');
    document.getElementById('paymentModalAmount').value = '';
    document.getElementById('paymentModalProvider').value = '';
    soOnPaymentMethodChange(); // no method selected yet — provider field starts hidden
    document.getElementById('paymentModal').classList.add('active');
    soScrollModalToTop('paymentModal');
}

// ── Open modal in Edit mode, pre-filled with the row's current values ──
function soOpenEditPaymentModal(index) {
    const p = soPayments[index];
    if (!p || p.locked) return; // auto-zero entries on free orders aren't editable

    _soPaymentModalIndex = index;
    document.getElementById('paymentModalHeader').textContent = 'Edit Payment';
    _soPopulatePaymentModalMethods(p.method);
    document.getElementById('paymentModalAmount').value = p.amount || '';
    document.getElementById('paymentModalProvider').value = p.provider || '';
    soOnPaymentMethodChange(); // show/hide + placeholder for this payment's method
    document.getElementById('paymentModal').classList.add('active');
    soScrollModalToTop('paymentModal');
}

function soCancelPaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    document.getElementById('paymentModalMethod').value = '';
    document.getElementById('paymentModalAmount').value = '';
    document.getElementById('paymentModalProvider').value = '';
    _soPaymentModalIndex = null;
}

function soConfirmPaymentModal() {
    const method   = document.getElementById('paymentModalMethod').value;
    let amount     = parseFloat(document.getElementById('paymentModalAmount').value);
    const provider = document.getElementById('paymentModalProvider').value.trim();
    const methodDef = SO_PAYMENT_METHODS.find(m => m.value === method);

    // Defense-in-depth: these two invariants are also enforced by the functions that
    // normally lead here (soOpenAddPaymentModal's dropdown excludes used methods;
    // soOpenEditPaymentModal refuses to open on a locked row) — but this is the function
    // that actually writes soPayments, so it shouldn't rely solely on its callers behaving.
    if (_soPaymentModalIndex !== null && soPayments[_soPaymentModalIndex]?.locked) {
        return; // editing a locked (auto-zero free-order) row is never allowed
    }
    if (_soPaymentModalIndex === null && soPayments.some(p => p.method === method)) {
        openAlert({ title: 'Method Already Used', body: `${methodDef?.label || method} has already been added to this order.` });
        return;
    }

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
    if (!amount || amount <= 0 || isNaN(amount)) {
        openAlert({ title: 'Amount Required', body: 'Please enter a payment amount greater than zero.' });
        return;
    }

    // Non-cash rows are capped at what's still owed (excluding this row's own current amount
    // when editing, so re-saving the same value doesn't get clamped against itself). Reads
    // soLockedTotal, not a live computation — Total can't change mid-payment-phase by design.
    if (method !== 'cash') {
        const total = soLockedTotal;
        const othersSum = soPayments.reduce((s, p, i) => i === _soPaymentModalIndex ? s : s + (p.amount || 0), 0);
        const maxAllowed = Math.max(0, total - othersSum);
        if (amount > maxAllowed) amount = maxAllowed;
        if (amount <= 0) {
            openAlert({ title: 'Already Fully Paid', body: 'The remaining balance for non-cash methods is already covered.' });
            return;
        }
    }

    const paymentEntry = methodDef?.needsProvider ? { method, provider, amount } : { method, amount };

    if (_soPaymentModalIndex === null) {
        soPayments.push(paymentEntry);
    } else {
        soPayments[_soPaymentModalIndex] = paymentEntry;
    }

    document.getElementById('paymentModal').classList.remove('active');
    document.getElementById('paymentModalMethod').value = '';
    document.getElementById('paymentModalAmount').value = '';
    document.getElementById('paymentModalProvider').value = '';
    _soPaymentModalIndex = null;

    soRenderPaymentRows();
    soRecalcPaymentSummary();
}

function soRemovePayment(index) {
    const p = soPayments[index];
    if (!p || p.locked) return; // auto-zero entries on free orders can't be removed

    const methodLabel = soFormatPaymentLabel(p);

    openModal({
        title:       'Remove Payment?',
        body:        `Remove this ${escapeHtml(methodLabel)} payment of ${(p.amount || 0).toFixed(2)}?`,
        confirmText: 'Remove',
        cancelText:  'Cancel',
        onConfirm: () => {
            soPayments.splice(index, 1);
            soRenderPaymentRows();
            soRecalcPaymentSummary();
        }
    });
}

// ── Derive payment status from amount paid vs total ──
function soPaymentStatus(amountPaid, total) {
    if (total === 0) return 'paid'; // nothing owed — free/full-discount order
    if (amountPaid <= 0) return 'unpaid';
    if (amountPaid < total) return 'partial';
    return 'paid';
}

// ── Payment-derived totals: Amount Paid / Balance / Change Due. Only ever runs while items
// are locked, and reads soLockedTotal (cached once at lock time) — never soOrderRows directly.
// That's the whole point of the lock: Total can't drift out from under an in-progress payment. ──
function soRecalcPaymentSummary() {
    const total = soLockedTotal;

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

    const hasCash  = soPayments.some(p => p.method === 'cash');
    const tendered = soPayments.reduce((s, p) => s + (p.amount || 0), 0);

    let amountPaid, changeDue;
    if (tendered >= total) {
        amountPaid = total;
        changeDue  = hasCash ? +(tendered - total).toFixed(2) : 0;
    } else {
        amountPaid = tendered;
        changeDue  = 0;
    }

    const balance = Math.max(0, +(total - amountPaid).toFixed(2));

    setVal('summaryAmountPaid', amountPaid.toFixed(2));
    setVal('summaryBalance',    balance.toFixed(2));
    setVal('summaryChangeDue',  changeDue.toFixed(2));

    const changeRow = document.getElementById('summaryChangeRow');
    if (changeRow) changeRow.classList.toggle('hidden', changeDue <= 0);

    soUpdateAddPaymentButtonState();
}