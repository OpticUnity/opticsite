// ================================================================
//  job-orders-logic.js — OpticUnity
//  Job Orders page — flat, cross-order list of every job (a
//  soRowGetsJobStub-eligible item with a jobId), filtered by
//  lab/production status: Pending → Processing → Done.
//
//  Deliberately does NOT show payment info or a Claim button — this
//  page is pure lab workflow. Claiming (customer pickup) lives in
//  Pending Orders instead, since it's payment-gated (job done AND
//  parent order's balance is ₱0) and needs order context this page
//  doesn't have. See handleSaveOrder's comment in order-form-logic.js
//  for why jobStatus and claimed are kept as separate, orthogonal
//  fields rather than one combined status.
//
//  Status transitions are forward-only (no revert/skip-ahead) for
//  v1 — simplest model that matches the agreed 3-stage flow.
// ================================================================

let _jobOrdersActiveTab = 'pending';

const JOB_STATUS_NEXT          = { pending: 'processing', processing: 'done' }; // 'done' has no next
const JOB_STATUS_ACTION_LABEL  = { pending: 'Start Processing', processing: 'Mark Done' }; // full text, used as the button's title tooltip
const JOB_STATUS_BUTTON_TEXT   = { pending: 'Start',            processing: 'Done' }; // visible button text — both shortened, full action stays in the title tooltip

function initJobOrdersNav() {
    document.getElementById('jobOrdersNavLink')?.addEventListener('click', () => {
        renderJobOrdersTable();
    });

    document.getElementById('jobOrdersSearchBarInput')?.addEventListener('input', (e) => {
        renderJobOrdersTable(e.target.value);
    });
}

// ── Two-line date/time for the Started/Done columns — a local variant, not a change to
// the shared _soFormatTimestamp() in view-records.js. That function is also used inline
// (checkmark-prefixed claim timestamps in Pending Orders, small payment-timestamp spans
// in Sales History), where a forced line break would look cramped, not cleaner — so this
// stays scoped to just these two Job Orders columns instead. ──
function _soFormatTimestampTwoLine(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const datePart = d.toLocaleDateString();
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${escapeHtml(datePart)}<br>${escapeHtml(timePart)}`;
}

function setJobOrdersTab(status) {
    _jobOrdersActiveTab = status;
    document.querySelectorAll('.so-job-orders-tab').forEach(btn => {
        btn.classList.toggle('active-page', btn.dataset.status === status);
    });
    renderJobOrdersTable(document.getElementById('jobOrdersSearchBarInput')?.value || '');
}

// ── Flatten every job across every saved order into one list, each carrying a reference
// back to its parent order — needed for Order ID/customer display here, and reused by the
// future Pending Orders Claim flow to look up the order's balance for the claim gate. ──
function _soGetAllJobs() {
    const orders    = JSON.parse(Storage.getItem('salesOrders') || '[]');
    const customers = JSON.parse(Storage.getItem('customers')   || '[]');
    const jobs = [];

    orders.forEach(order => {
        const customer     = customers.find(c => c.id === order.customerId);
        const customerName = order.isWalkIn ? 'Walk-in' : (customer?.name || '—');

        (order.items || []).forEach(item => {
            if (!item.jobId) return;
            jobs.push({ ...item, orderId: order.id, customerName });
        });
    });

    return jobs;
}

function renderJobOrdersTable(filter = "", page = 1) {
    const tableBody = document.querySelector('#jobOrdersTable tbody');
    if (!tableBody) return;

    const rowsPerPage = 10;
    const allJobs = _soGetAllJobs();

    if (allJobs.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="7" style="color:gray;font-style:italic;padding:20px;text-align:center;">
                No jobs yet
            </td></tr>`;
        document.getElementById('jobOrdersPagination').innerHTML = '';
        return;
    }

    const search = filter.toLowerCase();
    const filtered = allJobs
        .filter(j => j.jobStatus === _jobOrdersActiveTab)
        .filter(j =>
            j.jobId.toLowerCase().includes(search) ||
            j.orderId.toLowerCase().includes(search) ||
            j.customerName.toLowerCase().includes(search)
        )
        .reverse();

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="7" style="color:gray;font-style:italic;padding:20px;text-align:center;">
                No matching jobs in this tab
            </td></tr>`;
        document.getElementById('jobOrdersPagination').innerHTML = '';
        return;
    }

    const start     = (page - 1) * rowsPerPage;
    const pageItems = filtered.slice(start, start + rowsPerPage);

    pageItems.forEach(job => {
        tableBody.appendChild(createJobOrderRow(job));
    });

    createPagination(
        'jobOrdersPagination',
        filtered,
        page,
        rowsPerPage,
        (newPage) => renderJobOrdersTable(filter, newPage)
    );
}

function createJobOrderRow(job) {
    const row = document.createElement('tr');

    const nextStatus = JOB_STATUS_NEXT[job.jobStatus];
    const advanceBtn = nextStatus
        ? `<button type="button" class="toggle-btn so-job-advance-btn" title="${escapeHtml(JOB_STATUS_ACTION_LABEL[job.jobStatus])}">${escapeHtml(JOB_STATUS_BUTTON_TEXT[job.jobStatus])}</button>`
        : '';

    row.innerHTML = `
        <td>${escapeHtml(job.jobId)}</td>
        <td>${escapeHtml(job.orderId)}</td>
        <td style="text-align:left;">${escapeHtml(job.description || job.type)}</td>
        <td class="uppercase">${escapeHtml(job.customerName)}</td>
        <td>${_soFormatTimestampTwoLine(job.processingStartedAt)}</td>
        <td>${_soFormatTimestampTwoLine(job.doneAt)}</td>
        <td>
            <div class="so-row-actions">
                ${advanceBtn}
                <button type="button" class="toggle-btn so-job-print-btn" title="Print Job Order Stub"><i class="fa-solid fa-print"></i></button>
            </div>
        </td>
    `;

    row.querySelector('.so-job-advance-btn')?.addEventListener('click', () => advanceJobStatus(job.orderId, job.jobId));
    row.querySelector('.so-job-print-btn').addEventListener('click', () => printSingleJobOrderStub(job.orderId, job.jobId));

    return row;
}

// ── Advances a job Pending→Processing or Processing→Done, writing back into the parent
// order's items array. Locked the same as every other salesOrders write — see
// soWithStorageLock in storage.js — so this is cross-tab safe like everything else. ──
async function advanceJobStatus(orderId, jobId) {
    await soWithStorageLock('salesOrders', async () => {
        const orders = JSON.parse(Storage.getItem('salesOrders') || '[]');
        const order  = orders.find(o => o.id === orderId);
        if (!order) return;

        const item = (order.items || []).find(i => i.jobId === jobId);
        if (!item) return;

        const next = JOB_STATUS_NEXT[item.jobStatus];
        if (!next) return; // already Done — nothing further to advance here

        item.jobStatus = next;
        const now = new Date().toISOString();
        if (next === 'processing') item.processingStartedAt = now;
        if (next === 'done')       item.doneAt = now;

        Storage.setItem('salesOrders', JSON.stringify(orders));
    });

    renderJobOrdersTable(document.getElementById('jobOrdersSearchBarInput')?.value || '');
}