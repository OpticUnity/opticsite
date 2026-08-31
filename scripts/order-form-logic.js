// ================================================================
//  order-form-logic.js — OpticUnity
//  Sales Order: order items table, item modals, shared state, and
//  the item-lock <-> payment-lock lifecycle (Save Order, Edit Items,
//  Proceed to Payment).
//
//  Split from a single 2200+ line file into three, by subsystem:
//    - order-form-logic.js          (this file) — the core above
//    - order-payment-logic.js       — split-tender payments
//    - order-patient-rx-logic.js    — Patient Link + Rx wizard (Lens/CL)
//
//  All three share one global scope (plain <script> tags, no modules),
//  same as the rest of the app — functions/state here are called
//  directly from the other two files and vice versa. Load order
//  between these three doesn't matter (no top-level code in any of
//  them depends on another at parse time), but all three must load
//  before initOrderFormLogic() runs from main.js.
// ================================================================

// ── Config ──
const SO_TABLE_COLS  = 9;

const SO_ICON_EDIT   = `<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>`;

const SO_ICON_TRASH  = `<svg viewBox="0 0 448 512" aria-hidden="true"><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0h120.4c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128h384v320c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"/></svg>`;

const SO_TYPE_TO_MODAL = {
    lens:    'modalLens',
    frame:   'modalFrame',
    cl:      'modalCL',
    service: 'modalService',
    item:    'modalItem',
};

// Price lives in each type's modal now (not in itemData — same tier as Qty, captured/prefilled separately)
const SO_TYPE_TO_PRICE_FIELD = {
    lens:    'lensPrice',
    frame:   'framePrice',
    cl:      'clPrice',
    service: 'servicePrice',
    item:    'itemPrice',
};

// Field IDs captured/prefilled per item type — single source of truth
const SO_MODAL_FIELDS = {
    lens:    ['lensBrand', 'lensBrandCustom', 'lensType', 'lensTypeOther', 'lensCoating', 'lensIndex',
              'lensOdSph', 'lensOdCyl', 'lensOdAxis', 'lensOdAdd', 'lensOdPd',
              'lensOsSph', 'lensOsCyl', 'lensOsAxis', 'lensOsAdd', 'lensOsPd',
              'lensNotes'],
    frame:   ['frameBrandModel', 'frameMaterial', 'frameMaterialOther', 'frameType', 'frameTypeOther',
              'frameShape', 'frameColor', 'frameParameters', 'frameNotes'],
    cl:      ['clBrand', 'clBrandCustom', 'clMaterial', 'clMaterialOther', 'clDesign', 'clDesignOther', 'clModality',
              'clOdSph', 'clOdCyl', 'clOdAxis', 'clOdAdd', 'clOdBc', 'clOdDia',
              'clOsSph', 'clOsCyl', 'clOsAxis', 'clOsAdd', 'clOsBc', 'clOsDia',
              'clNotes'],
    service: ['serviceType', 'serviceFrameDescription', 'serviceNotes'],
    item:    ['itemCategory', 'itemName', 'itemNotes'],
};

// ── State ──
let _soActiveRowIndex = null; // which row triggered the open modal

let _soIsEditingRow   = false; // true = re-confirm overwrites in place

let soOrderRows       = [];

// ── Job Order pairing uses stable row IDs, never raw array indices — soDeleteRow splices
// soOrderRows, which shifts every later row's index down by one. A pairing stored as a
// plain index would silently point at the wrong row after any earlier row is deleted.
// IDs are assigned once at row creation and never reused or renumbered. ──
let _soNextRowId = 1;

// ── Items lock state ── Order items and Payment Summary are mutually exclusive phases:
// items are freely editable until "Proceed to Payment" is clicked, at which point every
// row locks and Total is cached. Payments can only ever be touched while items are locked,
// so there's no way for Total to drift out from under an in-progress payment. Going back
// to edit items clears soPayments and re-locks the Payment Summary.
let soItemsLocked = false;

let soLockedTotal = 0;

let soIsWalkIn        = false; // true = walk-in order (no customer record) — restricts item types that need a customer on file

// Type dropdown options — single source of truth for value + label
const SO_TYPE_OPTIONS = [
    { value: 'service', label: 'Service' },
    { value: 'lens',    label: 'Lens' },
    { value: 'frame',   label: 'Frame' },
    { value: 'cl',      label: 'Contact Lens' },
    { value: 'item',    label: 'Other Products' },
];

// Only "Other Products" can be sold to a walk-in (no customer record). Lens, Frame,
// Contact Lens, and Service all require a registered customer on file: Contact Lens is
// a prescription item with legal record-keeping reasons, and Frame/Lens/Service all
// benefit from a traceable buyer in case of any future concern, warranty, or job-claiming
// reference. Deliberately an allow-list (not a "these require a customer" exclude-list) —
// a new item type added later defaults to restricted unless explicitly added here.
const SO_TYPES_ALLOWED_FOR_WALKIN = ['item'];

// ── Empty row factory ──
// ══════════════════════════════════════════════════════════════════════════
// ── Job Order Summary — pairing (Lens / Lens Transfer ⇄ Frame) ──
// Frame never gets its own job-order stub; a Lens or a "Lens Transfer" Service must be
// paired to a Frame row before payment can proceed. CL and "Frame Repair" get a stub but
// never need pairing — Eye Checkup / Others don't get a stub at all (not lab/frame jobs).
// All lookups use rowId, never array index — see the note above soOrderRows for why. ──
// ══════════════════════════════════════════════════════════════════════════

function soFindRowById(rowId) {
    return soOrderRows.find(r => r.rowId === rowId) || null;
}

function soRowNeedsFramePairing(row) {
    if (!row || !row.description) return false;
    if (row.type === 'lens') return true;
    if (row.type === 'service' && row.itemData?.serviceType === 'Lens Transfer') return true;
    return false;
}

function soRowGetsJobStub(row) {
    if (!row || !row.description) return false;
    if (row.type === 'lens' || row.type === 'cl') return true;
    if (row.type === 'service') return ['Lens Transfer', 'Frame Repair'].includes(row.itemData?.serviceType);
    return false;
}

function soRowIsAvailableFrame(row) {
    return !!(row && row.type === 'frame' && row.description && !row.pairedWith);
}

// ── Breaks a pairing from either side — the single choke point used by the manual 'x'
// unpair button AND the automatic guards (delete, type change) below. Always re-finds the
// partner by rowId rather than trusting a stale reference. ──
function soUnlinkRowPairing(rowId) {
    const row = soFindRowById(rowId);
    if (!row || !row.pairedWith) return;
    const partner = soFindRowById(row.pairedWith);
    if (partner) partner.pairedWith = null;
    row.pairedWith = null;
}

// Pairing is an item-phase concern — once soItemsLocked (payment phase), Job Order Summary
// is display-only until "Edit Items" is clicked, same as every other item control. Guarded
// here too (not just via the disabled attribute in soRenderJobOrderPanel) for defense-in-depth,
// matching the pattern already used throughout order-payment-logic.js.
function soUnpairJobOrder(rowId) {
    if (soItemsLocked) return;
    soUnlinkRowPairing(rowId);
    soRecalcOrderTotals(); // re-renders the panel too — see the hook in soRecalcOrderTotals
}

// ── Frame picker — always opens regardless of availability (deliberate: no pre-computed
// disabled button state to keep reactively in sync across every add/delete/pair/unpair;
// the check runs once, lazily, at the moment of the click, same as everything else that
// already worked this way in this file). Shows available frames, or a guiding empty state. ──
let _soFramePairForRowId = null;

function soOpenFramePairModal(rowId) {
    if (soItemsLocked) return; // payment phase — pairing is frozen until Edit Items
    _soFramePairForRowId = rowId;
    const cardsEl = document.getElementById('framePairCards');
    if (!cardsEl) return;

    const availableFrames = soOrderRows.filter(soRowIsAvailableFrame);

    cardsEl.innerHTML = availableFrames.length === 0
        ? `<div style="color: gray; font-style: italic; padding: 20px; text-align: center;">No available frame yet.<br>Please add a frame (clinic's or patient's) to this order first.</div>`
        : availableFrames.map(f => `
            <div class="so-patient-suggestion-card" onclick="soSelectFramePair(${f.rowId})">
                <div class="so-patient-suggestion-name">${escapeHtml(f.description)}</div>
            </div>
        `).join('');

    document.getElementById('framePairModal')?.classList.add('active');
    soScrollModalToTop('framePairModal');
}

function soCancelFramePairModal() {
    document.getElementById('framePairModal')?.classList.remove('active');
    _soFramePairForRowId = null;
}

function soSelectFramePair(frameRowId) {
    const lensRow  = soFindRowById(_soFramePairForRowId);
    const frameRow = soFindRowById(frameRowId);
    if (!lensRow || !frameRow) { soCancelFramePairModal(); return; }

    lensRow.pairedWith  = frameRow.rowId;
    frameRow.pairedWith = lensRow.rowId;

    soCancelFramePairModal();
    soRecalcOrderTotals();
}

// ── Renders the Job Order Summary panel. Called from soRecalcOrderTotals (see hook
// there), which is already invoked after every meaningful order mutation across this
// file — reusing that existing, comprehensively-wired call point instead of hunting down
// and individually hooking every add/delete/edit/pair path a second time. ──
// ── Header + body text for one job-order block. Lens/CL/Frame use row.description
// directly (it's just Brand—Type—Coating—Index etc., no type name baked in, so no
// redundancy against the header). Service is different — row.description already
// starts with the Service Type itself ("Lens Transfer: ..."), so using it verbatim here
// would duplicate the header; itemData.serviceType/serviceNotes are read separately
// instead, keeping header and body genuinely distinct pieces of information. ──
function soGetJobOrderHeaderAndBody(row) {
    if (row.type === 'lens')  return { header: 'Lens',          body: row.description };
    if (row.type === 'cl')    return { header: 'Contact Lens',  body: row.description };
    if (row.type === 'frame') return { header: 'Frame',         body: row.description };
    if (row.type === 'service') {
        const serviceType = row.itemData?.serviceType || 'Service';
        const notes       = (row.itemData?.serviceNotes || '').trim();
        // Frame Repair prepends Frame Description ahead of Notes — it's the whole reason
        // that field exists (identifies which frame the job is for on the stub), so it
        // needs to lead the body, not just tag along after freeform notes.
        if (serviceType === 'Frame Repair') {
            const frameDesc = (row.itemData?.serviceFrameDescription || '').trim();
            return { header: serviceType, body: [frameDesc, notes].filter(Boolean).join(' — ') };
        }
        return { header: serviceType, body: notes };
    }
    return { header: row.description, body: '' };
}

// ── Renders one header+body block — used for both the job's own line and (when paired)
// the Frame's line, so the two always look identical/consistent. ──
function soRenderJobOrderBlock(row) {
    const { header, body } = soGetJobOrderHeaderAndBody(row);
    const hasBody = !!(body && body.trim());
    return `
        <div class="so-job-order-header">${escapeHtml(header)}</div>
        <div class="so-job-order-body${hasBody ? '' : ' so-job-order-body-empty'}">${hasBody ? escapeHtml(body) : 'No description'}</div>`;
}

function soRenderJobOrderPanel() {
    const panel = document.getElementById('jobOrderStubs');
    if (!panel) return;

    const stubRows = soOrderRows.filter(soRowGetsJobStub);

    if (stubRows.length === 0) {
        panel.innerHTML = `<div class="so-job-order-empty">No job orders yet... add a Lens, Contact Lens, Lens Transfer, or Frame Repair item to see it here.</div>`;
        return;
    }

    panel.innerHTML = stubRows.map(row => {
        const ownBlock = soRenderJobOrderBlock(row);

        if (!soRowNeedsFramePairing(row)) {
            return `
                <div class="so-job-order-row">
                    <div class="so-job-order-stub">${ownBlock}</div>
                    <div class="so-job-order-btn-spacer"></div>
                </div>`;
        }

        if (row.pairedWith) {
            const frame = soFindRowById(row.pairedWith);
            const frameBlock = frame ? soRenderJobOrderBlock(frame) : '';
            return `
                <div class="so-job-order-row">
                    <div class="so-job-order-stub so-job-order-paired">
                        ${ownBlock}
                        <hr class="so-job-order-divider">
                        ${frameBlock}
                    </div>
                    <div class="so-job-order-btn-group">
                        <span class="so-job-order-btn-label">Frame</span>
                        <button type="button" class="so-job-order-unpair-btn" onclick="soUnpairJobOrder(${row.rowId})"
                            title="${soItemsLocked ? 'Locked — click Edit Items to unpair' : 'Unpair'}" ${soItemsLocked ? 'disabled' : ''}><i class="fa-solid fa-x"></i></button>
                    </div>
                </div>`;
        }

        return `
            <div class="so-job-order-row">
                <div class="so-job-order-stub so-job-order-unpaired">${ownBlock}</div>
                <div class="so-job-order-btn-group so-job-order-btn-group-unpaired">
                    <span class="so-job-order-btn-label">Frame</span>
                    <button type="button" class="so-job-order-pair-btn" onclick="soOpenFramePairModal(${row.rowId})"
                        title="${soItemsLocked ? 'Locked — click Edit Items to pair' : 'Pair with a frame'}" ${soItemsLocked ? 'disabled' : ''}><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>`;
    }).join('');
}

function soEmptyRowData() {
    return {
        rowId: _soNextRowId++, // stable, splice-immune identity — see note above soOrderRows
        type: '', description: '', itemData: null,
        qty: 1, price: null,
        discType: 'none', discPct: 0, discVal: 0,
        discName: '',
        linkedPatient: null, // { id, name, birthday } — Lens/CL only, for Rx reference
        linkedRx: null, // { id, dateCreated, manual, data } — Lens/CL only, the prescription used
        pairedWith: null, // partner row's rowId — Lens/Lens Transfer ⇄ Frame job pairing only
        total: 0, valid: false
    };
}

// ── Build initial rows ──
function soInitTable() {
    const tbody = document.getElementById('orderTableBody');
    if (!tbody) return;
    soOrderRows = [];
    tbody.innerHTML = '';
    for (let i = 0; i < 10; i++) soAddRow();
    soSetRowLocked(0);
}

function soAddRow() {
    if (soItemsLocked) return;
    const index = soOrderRows.length;
    soOrderRows.push(soEmptyRowData());
    document.getElementById('orderTableBody').appendChild(soCreateRowTr(index));
    soSetActionsState(index);
}

// ── Create a table row element from soOrderRows[index] ──
// ── Wipe Qty/Price/Discount back to defaults — used when a row's type is cleared or switched,
// so the previous item's numbers never silently carry over to the new one. ──
function soResetRowNumericFields(index) {
    const row = soOrderRows[index];
    if (!row) return;

    row.qty      = 0;
    row.price    = null;
    row.discType = 'none';
    row.discPct  = 0;
    row.discVal  = 0;
    row.discName = '';
    row.total    = 0;

    const setVal = (prefix, v) => { const el = document.getElementById(`${prefix}${index}`); if (el) el.value = v; };
    setVal('so-qty-',     '');
    setVal('so-price-',   '');
    setVal('so-discpct-', '');
    setVal('so-discval-', '');
    setVal('so-rowtotal-', '');

    const discTypeEl = document.getElementById(`so-disctype-${index}`);
    if (discTypeEl) discTypeEl.value = 'none';

    const qtyEl = document.getElementById(`so-qty-${index}`);
    if (qtyEl) {
        qtyEl.disabled = false; // re-sync in case it was fixed by a previous lens confirm
        qtyEl.classList.remove('so-qty-fixed');
    }
}

function soCreateRowTr(index) {
    const row = soOrderRows[index];
    const d   = soComputeFieldDisabled(index);

    const tr = document.createElement('tr');
    tr.dataset.index = index;
    if (d.rowLocked) tr.classList.add('so-row-locked');

    const qtyVal        = row.type ? (row.qty   || '') : '';
    const priceVal       = (row.type && row.price !== null) ? row.price : '';
    const priceConfirmed = !!(row && row.description);
    // Group-box class (so-row-boxed-top) is set here for a freshly-built tr AND kept in
    // sync afterwards by soRenderInfoRow — soCreateRowTr only runs on full table rebuilds
    // (soRebuildTable), not on confirmModal's in-place patch of an existing row, so
    // soRenderInfoRow is the single place that has to own toggling it whenever the
    // detail row itself is added or removed.
    if (priceConfirmed) tr.classList.add('so-row-boxed-top');
    const discPct  = row.discPct ? row.discPct : '';
    const discVal  = row.discVal  ? row.discVal  : '';
    const totalVal = row.type    ? row.total.toFixed(2) : '';

    tr.innerHTML = `
        <td class="so-col-num">${index + 1}</td>
        <td class="so-col-type">
          <select onchange="soOnTypeChange(${index}, this)" id="so-type-${index}" ${d.type ? 'disabled' : ''}>
            ${soBuildTypeOptions(row.type, !!row.description)}
          </select>
        </td>
        <td class="so-col-qty">
          <input type="number" min="1" max="100" value="${qtyVal}" id="so-qty-${index}"
            oninput="soOnNumChange(${index})" placeholder="—" ${d.qty ? 'disabled' : ''}>
        </td>
        <td class="so-col-price">
          <input type="number" min="0" value="${priceVal}" id="so-price-${index}"
            placeholder="0.00" ${priceConfirmed ? 'readonly' : 'disabled'}>
        </td>
        <td class="so-col-disctype">
          <select id="so-disctype-${index}" onchange="soOnDiscTypeChange(${index})" ${d.disctype ? 'disabled' : ''}>
            <option value="none"   ${row.discType === 'none'   ? 'selected' : ''}>None</option>
            <!-- Senior/PWD disabled on walk-in rows — an audited Senior/PWD discount requires
                 a customer record by design; walk-ins can still use Promo instead. -->
            <option value="senior" ${soIsWalkIn ? 'disabled' : ''} ${row.discType === 'senior' ? 'selected' : ''}>Senior</option>
            <option value="pwd"    ${soIsWalkIn ? 'disabled' : ''} ${row.discType === 'pwd'    ? 'selected' : ''}>PWD</option>
            <option value="promo"  ${row.discType === 'promo'  ? 'selected' : ''}>Promo</option>
          </select>
        </td>
        <td class="so-col-discpct">
          <div class="so-input-suffix-wrap">
            <input type="number" min="0" max="100" value="${discPct}" id="so-discpct-${index}"
              oninput="soOnDiscPctChange(${index})" placeholder="0" ${d.discpct ? 'disabled' : ''}>
            <span class="so-input-suffix">%</span>
          </div>
        </td>
        <td class="so-col-discval">
          <div class="so-input-prefix-wrap">
            <span class="so-input-prefix">₱</span>
            <input type="number" min="0" value="${discVal}" id="so-discval-${index}"
              oninput="soOnDiscValChange(${index})" placeholder="0.00" ${d.discval ? 'disabled' : ''}>
          </div>
        </td>
        <td class="so-col-rowtotal">
          <input type="text" readonly id="so-rowtotal-${index}" class="so-row-total-display" value="${totalVal}" ${d.total ? 'disabled' : ''}>
        </td>
        <td class="so-col-actions">
          <div class="so-actions-cell">
            <button type="button" class="so-action-btn so-edit-item-btn" id="so-editbtn-${index}"
              onclick="soEditRowItem(${index})" disabled title="Edit Item">${SO_ICON_EDIT}</button>
            <button type="button" class="so-action-btn so-delete-row-btn" id="so-deletebtn-${index}"
              onclick="soDeleteRow(${index})" disabled title="Delete">${SO_ICON_TRASH}</button>
          </div>
        </td>
    `;
    return tr;
}

// ── Shared across the whole app (Sales + EMR) — any free-text value that ends up
// interpolated into an innerHTML template string needs this first. Not Sales-specific
// despite living in this file; the app's plain-global-scope architecture means any
// script loaded after this one can call it. Covers all 5 HTML-significant characters,
// correct for both attribute-value and text-content contexts. ──
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Build <option>s for the type dropdown — disabled (walk-in-restricted) types sink to the bottom.
// The blank "--" option is omitted once the row already has a confirmed item — switching to
// "nothing" via the dropdown isn't a real action; use the trash icon to clear the row instead. ──
function soBuildTypeOptions(selectedType, hasConfirmedItem = false) {
    const isRestricted = (val) => soIsWalkIn && !SO_TYPES_ALLOWED_FOR_WALKIN.includes(val);

    const ordered = [...SO_TYPE_OPTIONS].sort((a, b) => {
        const aR = isRestricted(a.value), bR = isRestricted(b.value);
        if (aR === bR) return 0;
        return aR ? 1 : -1; // restricted (disabled) options go last
    });

    const optionsHtml = ordered.map(opt => {
        const disabled = isRestricted(opt.value);
        const label    = disabled ? `${opt.label} (needs customer record)` : opt.label;
        return `<option value="${opt.value}" ${selectedType === opt.value ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${label}</option>`;
    }).join('');

    const blankOption = hasConfirmedItem ? '' : `<option value="">--</option>`;
    return `${blankOption}${optionsHtml}`;
}

// ── Rebuild a row's Type <select> options + selected value from current row state ──
function soRefreshTypeSelect(index) {
    const select = document.getElementById(`so-type-${index}`);
    const row    = soOrderRows[index];
    if (!select || !row) return;
    select.innerHTML = soBuildTypeOptions(row.type, !!row.description);
    select.value = row.type || '';
}

function soRebuildTable() {
    const tbody = document.getElementById('orderTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    soOrderRows.forEach((_, i) => {
        tbody.appendChild(soCreateRowTr(i));
        soRenderInfoRow(i);
    });
    soUpdateRowLocks();
    soOrderRows.forEach((_, i) => soSetActionsState(i));
    soRecalcOrderTotals();
}

// ── Lock / unlock a row ──
function soSetRowLocked(index) {
    const tr = document.querySelector(`tr[data-index="${index}"]`);
    if (!tr) return;

    const d = soComputeFieldDisabled(index);
    tr.classList.toggle('so-row-locked', d.rowLocked);

    const setDisabled = (prefix, disabled) => {
        const el = tr.querySelector(`#${prefix}${index}`);
        if (el) el.disabled = disabled;
    };
    setDisabled('so-type-',     d.type);
    setDisabled('so-qty-',      d.qty);
    setDisabled('so-disctype-', d.disctype);
    setDisabled('so-discpct-',  d.discpct);
    setDisabled('so-discval-',  d.discval);
    setDisabled('so-rowtotal-', d.total);

    // Price: greyed out + disabled while unconfirmed, solid + readonly once confirmed
    // (still not directly typable either way — editing goes through the item modal).
    const priceEl        = tr.querySelector(`#so-price-${index}`);
    const priceConfirmed = !!(soOrderRows[index] && soOrderRows[index].description);
    if (priceEl) {
        priceEl.disabled  = !priceConfirmed;
        priceEl.readOnly  = priceConfirmed;
    }

    // Qty fixed at 1 (Lens/Service/Frame) is an intentional lock, not an
    // "unfilled row" state — style it distinctly so it doesn't look broken/washed-out.
    const qtyEl = tr.querySelector(`#so-qty-${index}`);
    if (qtyEl) qtyEl.classList.toggle('so-qty-fixed', soIsQtyFixed(index));

    soSetActionsState(index);
}

function soRowHasContent(index) {
    const row = soOrderRows[index];
    if (!row) return false;
    return !!(row.type || row.description || row.price > 0 || row.discVal > 0);
}

// ── Rows whose qty is fixed and non-editable (lens/service/frame/cl — always 1 per line, locked once confirmed) ──
function soIsQtyFixed(index) {
    const row = soOrderRows[index];
    return !!(row && ['lens', 'service', 'frame', 'cl'].includes(row.type) && row.description);
}

// ── Single source of truth for a row's field-level disabled states ──
// Column 1 (Type) is the only thing enabled until an item type is
// successfully confirmed (modal confirmed → row.description set).
// Qty / Price / Discount Type unlock once confirmed.
// Disc % / Disc ₱ only unlock once a real discount type (not "none") is chosen.
function soComputeFieldDisabled(index) {
    // Items are frozen for the whole payment phase — overrides the normal per-row cascade below.
    if (soItemsLocked) {
        return { rowLocked: true, type: true, qty: true, disctype: true, discpct: true, discval: true, total: true };
    }

    const row           = soOrderRows[index];
    const rowLocked     = index > 0 && !soIsRowValid(index - 1);
    const itemConfirmed = !!(row && row.type && row.description);
    const baseDisabled  = rowLocked || !itemConfirmed;
    const discActive    = !!(row && row.discType && row.discType !== 'none');

    return {
        rowLocked,
        type:     rowLocked,
        qty:      baseDisabled || soIsQtyFixed(index),
        // price handled separately (readonly once confirmed, disabled until then) — see soCreateRowTr / soSetRowLocked
        disctype: baseDisabled,
        discpct:  baseDisabled || !discActive,
        discval:  baseDisabled || !discActive,
        total:    baseDisabled
    };
}

function soSetActionsState(index) {
    const tr = document.querySelector(`tr[data-index="${index}"]`);
    if (!tr) return;

    const locked     = soItemsLocked || tr.classList.contains('so-row-locked');
    const hasDetails = !!soOrderRows[index]?.description;

    const editBtn   = tr.querySelector(`#so-editbtn-${index}`);
    const deleteBtn = tr.querySelector(`#so-deletebtn-${index}`);

    if (editBtn)   editBtn.disabled   = locked || !hasDetails;
    if (deleteBtn) deleteBtn.disabled = locked || !hasDetails;
}

// ── Row validity: type set AND price > 0 ──
// ── Row validity: type set AND price is an explicit number (blank/null invalid, 0 and up is fine) ──
function soIsRowValid(index) {
    const row = soOrderRows[index];
    return !!(row && row.type !== '' && row.price !== null && !isNaN(row.price) && row.price >= 0);
}

// ── Re-evaluate sequential row locks after any change ──
function soUpdateRowLocks() {
    for (let i = 0; i < soOrderRows.length; i++) {
        soSetRowLocked(i);
    }
}

// ── Type dropdown changed ──
function soOnTypeChange(index, selectEl) {
    const newType    = selectEl.value;
    const row        = soOrderRows[index];
    const hadDetails = !!row.description;
    const oldType    = row.type;

    if (hadDetails && newType !== oldType) {
        openModal({
            title:       'Change Item Type?',
            body:        'This row already has confirmed item details.\nSwitching type will erase them.',
            confirmText: 'Switch Type',
            cancelText:  'Keep Current',
            onConfirm:   () => soApplyTypeChange(index, newType),
            onCancel:    () => { selectEl.value = oldType; }
        });
        return;
    }

    soApplyTypeChange(index, newType);
}

function soApplyTypeChange(index, type) {
    // Defensive guard: walk-in orders can't use types that require a customer record on file
    if (soIsWalkIn && !SO_TYPES_ALLOWED_FOR_WALKIN.includes(type)) {
        const tr     = document.querySelector(`tr[data-index="${index}"]`);
        const select = tr?.querySelector(`#so-type-${index}`);
        if (select) select.value = soOrderRows[index].type || '';
        openAlert({ title: 'Customer Record Required', body: 'This item type requires a customer record on file for job claiming reference.\nPlease select a customer instead of walk-in to add this item.' });
        return;
    }

    // Whatever this row was (Lens, Frame, Lens Transfer...), it's about to lose its
    // identity — any job-order pairing it held needs to break now, on either side.
    soUnlinkRowPairing(soOrderRows[index].rowId);

    soOrderRows[index].type = type;

    if (!type) {
        soOrderRows[index].description = '';
        soOrderRows[index].itemData    = null;
        soOrderRows[index].valid       = false;
        soResetRowNumericFields(index);
        soRefreshTypeSelect(index);
        soSetActionsState(index);
        soRenderInfoRow(index);
        soRecalcRow(index);
        soRecalcOrderTotals();
        soUpdateRowLocks();
        return;
    }

    soOrderRows[index].description = '';
    soOrderRows[index].itemData    = null;
    soResetRowNumericFields(index); // switching types — old item's Price/Qty/Discount don't carry over
    soSetActionsState(index);
    soRenderInfoRow(index);
    soUpdateRowLocks(); // re-lock qty/price/discount on this row until the new type's modal is confirmed

    _soActiveRowIndex = index;
    _soIsEditingRow   = false;
    soClearModalFields(SO_TYPE_TO_MODAL[type]);
    if (type === 'lens') soPopulateLensBrandOptions();
    if (type === 'lens' || type === 'cl') {
        _soPendingLinkedPatient = null;
        _soPendingLinkedRx      = null;
        soUpdateLensClStage(type);
    }
    document.getElementById(SO_TYPE_TO_MODAL[type]).classList.add('active');
    soScrollModalToTop(SO_TYPE_TO_MODAL[type]);
}

// ── Reset a long/scrollable order modal's body to the top on open. Confirm/Cancel sit
// at the bottom of .so-item-modal-body (overflow-y: auto) — without this, a modal left
// scrolled down from a previous open (or, in some browsers, focus-follows-scroll on a
// pre-filled edit) can show up mid-scroll instead of at the top. Called right after every
// order-modal `classList.add('active')` across order-form-logic.js, order-patient-rx-logic.js,
// and order-payment-logic.js. ──
function soScrollModalToTop(modalId) {
    document.getElementById(modalId)?.querySelector('.so-item-modal-body')?.scrollTo(0, 0);
}

// ── Modal: Cancel ──
function cancelModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    soClearModalFields(modalId);

    if (_soIsEditingRow) {
        _soActiveRowIndex = null;
        _soIsEditingRow   = false;
        return;
    }

    if (_soActiveRowIndex !== null) {
        const index = _soActiveRowIndex;
        soOrderRows[index].type        = '';
        soOrderRows[index].description = '';
        soOrderRows[index].valid       = false;
        soRefreshTypeSelect(index);
        soSetActionsState(index);
        soRenderInfoRow(index);
        soUpdateRowLocks();
    }
    _soActiveRowIndex = null;
}

//--------------- Patient Link (Lens/CL) ---------------
// Links a patient record to a Lens/CL row for future Rx reference. No prescription
// pulling yet — this just establishes which patient the item is for.

// ── Modal: Confirm ──
function confirmModal(modalId, type) {
    if (_soActiveRowIndex === null) return;

    // ── Validation: Service must have a Service Type selected — fail the confirm otherwise ──
    // ── Defense-in-depth: the Confirm button is hidden until both Patient and Rx are
    // resolved (soUpdateLensClStage), but this guards the actual write in case confirmModal
    // is ever reached some other way — same reasoning as the payment-modal duplicate/locked
    // checks added earlier. ──
    if ((type === 'lens' || type === 'cl') && (!_soPendingLinkedPatient || !_soPendingLinkedRx)) {
        return;
    }

    if (type === 'service') {
        const serviceTypeEl = document.getElementById('serviceType');
        if (!serviceTypeEl || !serviceTypeEl.value) {
            openAlert({ title: 'Service Type Required', body: 'Please select a Service Type before confirming.' });
            return; // modal stays open, nothing is saved
        }

        // Frame Repair skips the Lens/Frame pairing flow (soRowNeedsFramePairing), so this
        // is the only place on the whole order that records which frame the job is for —
        // required, not optional, or the claim stub goes out with no way to identify it.
        if (serviceTypeEl.value === 'Frame Repair') {
            const frameDesc = document.getElementById('serviceFrameDescription')?.value.trim();
            if (!frameDesc) {
                openAlert({ title: 'Frame Description Required', body: 'Please describe the frame being repaired (Brand, Type, Shape, Color, Etc.) before confirming.' });
                return;
            }
        }
    }

    // ── Validation: Lens must have a Brand + Coating; Custom brand / Other type can't be blank ──
    if (type === 'lens') {
        const brandSelect = document.getElementById('lensBrand')?.value;
        const brandCustom = document.getElementById('lensBrandCustom')?.value.trim();

        if (!brandSelect) {
            openAlert({ title: 'Lens Brand Required', body: 'Please select a lens brand before confirming.' });
            return;
        }
        if (brandSelect === '__custom__' && !brandCustom) {
            openAlert({ title: 'Brand Required', body: 'Please enter the custom brand / lab name before confirming.' });
            return;
        }

        const typeSelect = document.getElementById('lensType')?.value;
        const typeOther  = document.getElementById('lensTypeOther')?.value.trim();
        if (!typeSelect) {
            openAlert({ title: 'Lens Type Required', body: 'Please select a lens type before confirming.' });
            return;
        }
        if (typeSelect === '__other__' && !typeOther) {
            openAlert({ title: 'Lens Type Required', body: 'Please specify the lens type before confirming.' });
            return;
        }

        const coating = document.getElementById('lensCoating')?.value.trim();
        if (!coating) {
            openAlert({ title: 'Coating Required', body: 'Please enter the lens coating before confirming.' });
            return;
        }
    }

    // ── Validation: Frame Type, Material, Color, and Shape are required. Others popups
    // mandatory if chosen for Type or Material. Brand/Model is optional overall. ──
    if (type === 'frame') {
        const typeSelect = document.getElementById('frameType')?.value;
        const typeOther  = document.getElementById('frameTypeOther')?.value.trim();
        if (!typeSelect) {
            openAlert({ title: 'Frame Type Required', body: 'Please select a frame type before confirming.' });
            return;
        }
        if (typeSelect === '__other__' && !typeOther) {
            openAlert({ title: 'Frame Type Required', body: 'Please specify the frame type before confirming.' });
            return;
        }

        const materialSelect = document.getElementById('frameMaterial')?.value;
        const materialOther  = document.getElementById('frameMaterialOther')?.value.trim();
        if (!materialSelect) {
            openAlert({ title: 'Material Required', body: 'Please select a frame material before confirming.' });
            return;
        }
        if (materialSelect === '__other__' && !materialOther) {
            openAlert({ title: 'Material Required', body: 'Please specify the frame material before confirming.' });
            return;
        }

        const color = document.getElementById('frameColor')?.value.trim();
        if (!color) {
            openAlert({ title: 'Color Required', body: 'Please enter the frame color before confirming.' });
            return;
        }

        const shape = document.getElementById('frameShape')?.value.trim();
        if (!shape) {
            openAlert({ title: 'Shape Required', body: 'Please enter the frame shape before confirming.' });
            return;
        }
    }

    // ── Validation: CL Brand, Material, and Optical Design are required. Others popups
    // mandatory if chosen for either. Modality stays optional. Grade is optional in
    // Rx-pulled mode (locked from the prescription) but SPH is required in manual mode. ──
    if (type === 'cl') {
        const brandSelect = document.getElementById('clBrand')?.value;
        const brandCustom = document.getElementById('clBrandCustom')?.value.trim();
        if (!brandSelect) {
            openAlert({ title: 'Brand Required', body: 'Please select a contact lens brand before confirming.' });
            return;
        }
        if (brandSelect === '__custom__' && !brandCustom) {
            openAlert({ title: 'Brand Required', body: 'Please enter the custom brand name before confirming.' });
            return;
        }

        const materialSelect = document.getElementById('clMaterial')?.value;
        const materialOther  = document.getElementById('clMaterialOther')?.value.trim();
        if (!materialSelect) {
            openAlert({ title: 'Material Required', body: 'Please select a contact lens material before confirming.' });
            return;
        }
        if (materialSelect === '__other__' && !materialOther) {
            openAlert({ title: 'Material Required', body: 'Please specify the contact lens material before confirming.' });
            return;
        }

        const designSelect = document.getElementById('clDesign')?.value;
        const designOther  = document.getElementById('clDesignOther')?.value.trim();
        if (!designSelect) {
            openAlert({ title: 'Optical Design Required', body: 'Please select an optical design before confirming.' });
            return;
        }
        if (designSelect === '__other__' && !designOther) {
            openAlert({ title: 'Optical Design Required', body: 'Please specify the optical design before confirming.' });
            return;
        }

        // ADD is only required when Design is Multifocal — for Others, it's shown (in
        // case their custom design needs it too) but stays optional, per Marc's call.
        // Uses the 'va' validator (validation.js), not 'add' — some labs specify add
        // power as LO/MED/HI rather than a number, so no format is enforced beyond
        // force-uppercasing. This check just makes the field itself mandatory (non-blank)
        // specifically for Multifocal, regardless of whether the value is numeric or text.
        if (designSelect === 'Multifocal') {
            const clOdAdd = document.getElementById('clOdAdd')?.value.trim();
            const clOsAdd = document.getElementById('clOsAdd')?.value.trim();
            if (!clOdAdd || !clOsAdd) {
                openAlert({ title: 'Add Required', body: 'Please enter the ADD power for both eyes before confirming.' });
                return;
            }
        }

        // Manual entry only — SPH is required for both eyes (0.00 is a valid value,
        // blurSph keeps it as "+0.00" rather than collapsing it to blank like CYL does,
        // so this check only catches a truly empty field). Rx-pulled mode is untouched —
        // those fields are locked/populated straight from the prescription.
        if (_soPendingLinkedRx && _soPendingLinkedRx.manual) {
            const clOdSph = document.getElementById('clOdSph')?.value.trim();
            const clOsSph = document.getElementById('clOsSph')?.value.trim();
            if (!clOdSph || !clOsSph) {
                openAlert({ title: 'Grade Required', body: 'Please enter the SPH grade for both eyes before confirming.' });
                return;
            }
        }
    }

    // ── Validation: Product Type and Description are required. Notes stays optional. ──
    if (type === 'item') {
        const itemType = document.getElementById('itemCategory')?.value;
        if (!itemType) {
            openAlert({ title: 'Type Required', body: 'Please select a product type before confirming.' });
            return;
        }

        const description = document.getElementById('itemName')?.value.trim();
        if (!description) {
            openAlert({ title: 'Description Required', body: 'Please enter a description before confirming.' });
            return;
        }
    }

    // ── Validation: Price is required for every type — blank is invalid, 0 and up is fine.
    // This is the one rule shared by all 5 modals, so it lives here once instead of per-type. ──
    const priceFieldId = SO_TYPE_TO_PRICE_FIELD[type];
    const priceRaw      = (document.getElementById(priceFieldId)?.value ?? '').trim();
    if (priceRaw === '') {
        openAlert({ title: 'Price Required', body: 'Please enter a price before confirming (0 is allowed, blank is not).' });
        return;
    }
    const priceVal = parseFloat(priceRaw);
    if (isNaN(priceVal) || priceVal < 0) {
        openAlert({ title: 'Invalid Price', body: 'Please enter a valid price of 0 or more.' });
        return;
    }
    // Ceiling is normally already enforced by blurPrice (validation.js), but guarded
    // again here at the actual save point too — same belt-and-suspenders reasoning as
    // the payment write-function guards: don't trust the UI entry point alone.
    const priceCapped = Math.min(priceVal, 999999.99);

    document.getElementById(modalId).classList.remove('active');

    const index = _soActiveRowIndex;
    const desc  = soBuildDescription(type);
    soOrderRows[index].description = desc;
    soOrderRows[index].itemData    = soCaptureModalFields(type);
    soOrderRows[index].price       = priceCapped;
    if (type === 'lens' || type === 'cl') {
        soOrderRows[index].linkedPatient = _soPendingLinkedPatient;
        soOrderRows[index].linkedRx      = _soPendingLinkedRx;
    }
    soRefreshTypeSelect(index); // item now confirmed — drop the blank "--" option

    // Table's price cell is now a locked display only — synced from the modal, never typed into directly
    const tablePriceEl = document.getElementById(`so-price-${index}`);
    if (tablePriceEl) tablePriceEl.value = priceCapped.toFixed(2);

    // Keep the discount in sync with the price that was just confirmed — see
    // soRefreshDiscountForPriceChange below for what this covers.
    soRefreshDiscountForPriceChange(index);

    // Service is always qty 1 per line (no per-item qty splitting) — fix + lock it only after a successful confirm
    if (type === 'service') {
        const qtyEl = document.getElementById(`so-qty-${index}`);
        if (qtyEl) {
            qtyEl.value    = 1;
            qtyEl.disabled = true;
        }
        soOrderRows[index].qty = 1;
    }

    // Lens is always qty 1 per line (no per-item qty splitting) — fix + lock it only after a successful confirm
    if (type === 'lens') {
        const qtyEl = document.getElementById(`so-qty-${index}`);
        if (qtyEl) {
            qtyEl.value    = 1;
            qtyEl.disabled = true;
        }
        soOrderRows[index].qty = 1;
    }

    // Frame is always qty 1 per line (no per-item qty splitting) — fix + lock it only after a successful confirm
    if (type === 'frame') {
        const qtyEl = document.getElementById(`so-qty-${index}`);
        if (qtyEl) {
            qtyEl.value    = 1;
            qtyEl.disabled = true;
        }
        soOrderRows[index].qty = 1;
        // Customer's-frame → price default is now handled live inside the Frame modal
        // itself (soOnFrameSourceChange), not here — price arrives already correct.
    }

    // CL is always qty 1 per line (no per-item qty splitting) — fix + lock it only after a successful confirm
    if (type === 'cl') {
        const qtyEl = document.getElementById(`so-qty-${index}`);
        if (qtyEl) {
            qtyEl.value    = 1;
            qtyEl.disabled = true;
        }
        soOrderRows[index].qty = 1;
    }

    // Other Products (the only type that DOES allow per-item qty splitting) — just seeds
    // the field with a starting default of 1 instead of leaving it blank after confirm, so
    // the cashier increases from a real number rather than typing into an empty box. Left
    // enabled/editable on purpose, unlike the qty-locked types above. Gated on
    // !_soIsEditingRow — this same function also runs when RE-confirming an already-saved
    // row (soEditRowItem), and without this guard a cashier who'd already bumped qty to,
    // say, 5 would have it silently reset back to 1 just by re-editing the price or
    // description and confirming again.
    if (type === 'item' && !_soIsEditingRow) {
        const qtyEl = document.getElementById(`so-qty-${index}`);
        if (qtyEl) qtyEl.value = 1;
        soOrderRows[index].qty = 1;
    }

    // Price is now always set programmatically (never typed inline), for every type —
    // so this recalc has to run unconditionally here instead of per-type as before.
    soRecalcRow(index);
    soRecalcOrderTotals();

    soClearModalFields(modalId);
    soSetActionsState(index);
    soRenderInfoRow(index);

    if (!_soIsEditingRow && index === soOrderRows.length - 1 && soIsRowValid(index)) soAddRow();

    soUpdateRowLocks();
    _soActiveRowIndex = null;
    _soIsEditingRow   = false;
}

// ── Clear modal fields ──
function soClearModalFields(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => el.value = '');
    modal.querySelectorAll('select').forEach(el => el.selectedIndex = 0);

    if (modalId === 'modalLens') {
        document.getElementById('lensBrandCustom')?.classList.add('hidden');
        document.getElementById('lensTypeOther')?.classList.add('hidden');
        // lensOdAdd/lensOsAdd are already blank from the clear above (values reset to ''),
        // so this will correctly re-enable all Lens Type options for the fresh row —
        // same "explicit call needed since selectedIndex=0 doesn't fire onchange" reasoning
        // as the CL fix below, though here it's clearing lensOdAdd's value, not the select.
        soUpdateLensTypeOptionsForAdd();
    }
    if (modalId === 'modalFrame') {
        document.getElementById('frameTypeOther')?.classList.add('hidden');
        document.getElementById('frameMaterialOther')?.classList.add('hidden');
        const clinicRadio = document.getElementById('frameSourceClinic');
        if (clinicRadio) clinicRadio.checked = true;
    }
    if (modalId === 'modalService') {
        document.getElementById('serviceFrameDescriptionLabel')?.classList.add('hidden');
        document.getElementById('serviceFrameDescription')?.classList.add('hidden');
    }
    if (modalId === 'modalCL') {
        document.getElementById('clBrandCustom')?.classList.add('hidden');
        document.getElementById('clMaterialOther')?.classList.add('hidden');
        document.getElementById('clDesignOther')?.classList.add('hidden');
        // clDesign.selectedIndex = 0 above doesn't fire onchange, so soUpdateClAddVisibility
        // needs an explicit call here too, or a stale "Multifocal was selected on the last
        // row" state (ADD visible, 4-column grid) would leak into this fresh/blank row.
        soUpdateClAddVisibility();
    }
}

// ── Lens Brand: populate dropdown from Storage-backed 'laboratories' list + Homebrand/Custom ──
// Settings → Laboratories (future) just needs to push into the 'laboratories' Storage key —
// this always re-reads it fresh so new labs show up without any other wiring.
function soPopulateLensBrandOptions(selectedValue) {
    const select = document.getElementById('lensBrand');
    if (!select) return;

    const labs = JSON.parse(Storage.getItem('laboratories') || '[]');
    let optionsHtml = `<option value="">-- Select --</option><option value="Homebrand">Homebrand</option>`;

    labs.forEach(lab => {
        const name = typeof lab === 'string' ? lab : (lab?.name || '');
        if (!name) return;
        optionsHtml += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    });

    optionsHtml += `<option value="__custom__">Custom...</option>`;
    select.innerHTML = optionsHtml;
    select.value = selectedValue || '';
}

// ── Lens Brand dropdown changed — reveal free-text input only for Custom ──
function soOnLensBrandChange(selectEl) {
    const customInput = document.getElementById('lensBrandCustom');
    if (!customInput) return;
    if (selectEl.value === '__custom__') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customInput.value = '';
    }
}

// ── CL Brand dropdown changed — reveal free-text input only for Custom ──
function soOnClBrandChange(selectEl) {
    const customInput = document.getElementById('clBrandCustom');
    if (!customInput) return;
    if (selectEl.value === '__custom__') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customInput.value = '';
    }
}

// ── Lens Type dropdown changed — reveal free-text input only for Other ──
function soOnLensTypeChange(selectEl) {
    const otherInput = document.getElementById('lensTypeOther');
    if (!otherInput) return;
    if (selectEl.value === '__other__') {
        otherInput.classList.remove('hidden');
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
        otherInput.value = '';
    }
    // Lens Type determines which PD (Distance vs Near) is correct — re-derive it every
    // time the type changes, not just at Rx-pull time. No-op if no Rx is linked yet, or
    // if the row is in manual mode (PD stays plain-editable there).
    if (typeof soApplyLensPdFromRx === 'function') soApplyLensPdFromRx();
}

// ── Lens Type options that require an ADD (near/multifocal designs) only make sense if
// the pulled Final Rx actually has one recorded. If neither eye has an ADD value, those
// four options are disabled, leaving Single Vision (Dist.) and Other as the only choices
// — a plain-distance Rx can't produce a near-add lens type. If a different Rx replaces
// the current one and the previously-selected type becomes invalid, the selection resets
// to blank rather than silently keeping an inconsistent choice active. ──
const SO_LENS_TYPES_REQUIRING_ADD = ['Single Vision (Near)', 'Kryptok', 'Flattop', 'Progressive'];

function soUpdateLensTypeOptionsForAdd() {
    const typeSelect = document.getElementById('lensType');
    if (!typeSelect) return;

    const odAdd = document.getElementById('lensOdAdd')?.value.trim();
    const osAdd = document.getElementById('lensOsAdd')?.value.trim();
    const hasAdd = !!(odAdd || osAdd);

    SO_LENS_TYPES_REQUIRING_ADD.forEach(val => {
        const opt = typeSelect.querySelector(`option[value="${val}"]`);
        if (opt) opt.disabled = !hasAdd;
    });

    if (!hasAdd && SO_LENS_TYPES_REQUIRING_ADD.includes(typeSelect.value)) {
        typeSelect.value = '';
        soOnLensTypeChange(typeSelect);
    }
}

// ── Frame Type dropdown changed — reveal free-text input only for Others ──
function soOnFrameTypeChange(selectEl) {
    const otherInput = document.getElementById('frameTypeOther');
    if (!otherInput) return;
    if (selectEl.value === '__other__') {
        otherInput.classList.remove('hidden');
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
        otherInput.value = '';
    }
}

// ── Frame Source toggled — Customer's Frame auto-fills Price to 0.00 (clinic didn't supply
// the frame stock, still editable for a processing/handling fee). Clinic's Frame clears
// Price back to blank so a real price has to be typed — no stale 0.00 left behind. ──
function soOnFrameSourceChange() {
    const priceEl = document.getElementById('framePrice');
    if (!priceEl) return;
    const isOwnFrame = document.getElementById('frameSourceOwn')?.checked;
    priceEl.value = isOwnFrame ? '0.00' : '';
}

// ── Product Type changed — swap the Description hint to match ──
const ITEM_DESCRIPTION_HINTS = {
    'Specialized Eyewear':   'e.g. Sports Goggles, Polarized Sunglasses...',
    'Contact Lens Solution': 'e.g. Brand & Volume (mL)...',
    'Eye Drops':              'e.g. Brand & Volume (mL)...',
    'Accessories':            'e.g. Nosepads, Screws, Earhook...'
};

function soOnItemCategoryChange(selectEl) {
    const nameInput = document.getElementById('itemName');
    if (!nameInput) return;
    nameInput.placeholder = ITEM_DESCRIPTION_HINTS[selectEl.value] || 'Product description...';
}

// ── Frame Material dropdown changed — reveal free-text input only for Others ──
function soOnFrameMaterialChange(selectEl) {
    const otherInput = document.getElementById('frameMaterialOther');
    if (!otherInput) return;
    if (selectEl.value === '__other__') {
        otherInput.classList.remove('hidden');
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
        otherInput.value = '';
    }
}

// ── Service Type dropdown changed — reveal Frame Description only for Frame Repair.
// This field isn't part of soBuildDescription's Type: Notes join (order table row stays
// as-is) — it exists solely so the Job Order Summary panel can show which frame a repair
// job belongs to, since Frame Repair deliberately skips the Lens/Frame pairing flow. ──
function soOnServiceTypeChange(selectEl) {
    const label = document.getElementById('serviceFrameDescriptionLabel');
    const input = document.getElementById('serviceFrameDescription');
    if (!label || !input) return;
    if (selectEl.value === 'Frame Repair') {
        label.classList.remove('hidden');
        input.classList.remove('hidden');
    } else {
        label.classList.add('hidden');
        input.classList.add('hidden');
        input.value = '';
    }
}

// ── CL Material dropdown changed — reveal free-text input only for Others ──
function soOnClMaterialChange(selectEl) {
    const otherInput = document.getElementById('clMaterialOther');
    if (!otherInput) return;
    if (selectEl.value === '__other__') {
        otherInput.classList.remove('hidden');
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
        otherInput.value = '';
    }
}

// ── CL Optical Design dropdown changed — reveal free-text input only for Others ──
function soOnClDesignChange(selectEl) {
    const otherInput = document.getElementById('clDesignOther');
    if (otherInput) {
        if (selectEl.value === '__other__') {
            otherInput.classList.remove('hidden');
            otherInput.focus();
        } else {
            otherInput.classList.add('hidden');
            otherInput.value = '';
        }
    }

    soUpdateClAddVisibility();
}

// ── ADD is only relevant for Multifocal (or Others, since a custom design might also
// need it — user's own call there, not required for Others). Independent of the
// manual-vs-Rx-pulled grade toggle entirely: EMR doesn't capture an ADD value on CL
// prescriptions, so there's nothing to lock this from — it's always a free-typed field
// whenever shown, in both modes (matches real stock multifocal lenses being sold via
// manual entry just as often as an Rx-pulled multifocal). Toggling grid-template-columns
// alongside visibility because CSS grid auto-placement needs the column count to match
// the actual visible item count per row, or the 5th cell wraps into a broken new row. ──
function soUpdateClAddVisibility() {
    const design = document.getElementById('clDesign')?.value;
    const showAdd = design === 'Multifocal' || design === '__other__';

    document.querySelectorAll('.cl-add-field').forEach(el => el.classList.toggle('hidden', !showAdd));

    const grid = document.getElementById('clGradeGrid');
    if (grid) grid.style.gridTemplateColumns = showAdd ? '36px repeat(4, 1fr)' : '36px repeat(3, 1fr)';

    if (!showAdd) {
        const odAdd = document.getElementById('clOdAdd');
        const osAdd = document.getElementById('clOsAdd');
        if (odAdd) odAdd.value = '';
        if (osAdd) osAdd.value = '';
    }
}

// ── Capture raw field values for a row ──
function soCaptureModalFields(type) {
    const fields = SO_MODAL_FIELDS[type] || [];
    const data = {};
    fields.forEach(id => {
        const el = document.getElementById(id);
        data[id] = el ? el.value : '';
    });

    // Frame Source is a radio group (not a single-ID field), captured separately
    if (type === 'frame') {
        data.frameSource = document.querySelector('input[name="frameSource"]:checked')?.value || 'clinic';
    }

    return data;
}

// ── Prefill modal fields from stored row data ──
function soPrefillModalFields(type, data) {
    if (!data) return;
    const fields = SO_MODAL_FIELDS[type] || [];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el && data[id] !== undefined) el.value = data[id];
    });

    // Frame Source is a radio group — prefill separately, default to Clinic Frame
    // for legacy rows saved before this field existed.
    if (type === 'frame') {
        const source = data.frameSource || 'clinic';
        const radio = document.querySelector(`input[name="frameSource"][value="${source}"]`);
        if (radio) radio.checked = true;
    }
}

// ── Edit button: reopen modal prefilled ──
function soEditRowItem(index) {
    if (soItemsLocked) return;
    const row = soOrderRows[index];
    if (!row || !row.type) return;

    _soActiveRowIndex = index;
    _soIsEditingRow   = true;

    const modalId = SO_TYPE_TO_MODAL[row.type];
    soClearModalFields(modalId);

    if (row.type === 'lens') soPopulateLensBrandOptions();

    if (row.type === 'lens' || row.type === 'cl') {
        _soPendingLinkedPatient = row.linkedPatient || null;
        _soPendingLinkedRx      = row.linkedRx || null;
        soUnlockRxFields(row.type); // clean baseline — re-locked below if this wasn't manual entry
    }

    soPrefillModalFields(row.type, row.itemData);

    // soPrefillModalFields above already restored the grade values (they were captured
    // into itemData at confirm time same as everything else) — this just reapplies the
    // lock, since prefill only sets .value, not the readOnly state. Lens PD included
    // separately since (like soUnlockRxFields) it sits outside SO_RX_FIELD_MAP's 1:1 map —
    // its value is already correct from the prefill above, this only restores the
    // visual lock to match.
    if ((row.type === 'lens' || row.type === 'cl') && _soPendingLinkedRx && !_soPendingLinkedRx.manual) {
        SO_RX_FIELD_MAP[row.type].ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.readOnly = true; el.classList.add('so-rx-locked'); }
        });
        if (row.type === 'lens') {
            ['lensOdPd', 'lensOsPd'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.readOnly = true; el.classList.add('so-rx-locked'); }
            });
        }
    }

    // Restore the CL grade layout (rx-pulled split vs merged manual row) to match
    // how this row was actually saved — soPrefillModalFields/the lock loop above only
    // handle values and readOnly state, not which grid the BC/DIA fields live in.
    if (row.type === 'cl' && typeof soSetClFieldMode === 'function') {
        soSetClFieldMode((_soPendingLinkedRx && !_soPendingLinkedRx.manual) ? 'rx' : 'manual');
    }

    // Same reasoning as the CL layout restore above — soPrefillModalFields already put
    // the ADD value back (if any) via the SO_MODAL_FIELDS list, but ADD's visibility and
    // the grid's column count are separate DOM state that needs recomputing here too.
    if (row.type === 'cl' && typeof soUpdateClAddVisibility === 'function') {
        soUpdateClAddVisibility();
    }

    // Restore Lens Type option availability — soPrefillModalFields already restored the
    // saved lensType value, but the disabled-state of the near-add options is separate
    // DOM state that needs recomputing against this row's actual ADD value.
    if (row.type === 'lens' && typeof soUpdateLensTypeOptionsForAdd === 'function') {
        soUpdateLensTypeOptionsForAdd();
    }

    if (row.type === 'lens' || row.type === 'cl') {
        soUpdateLensClStage(row.type);
    }

    // Price lives on row.price directly (not itemData) — prefill it separately, same
    // treatment as Qty. Falls back to blank for legacy rows saved before this existed.
    const priceFieldId = SO_TYPE_TO_PRICE_FIELD[row.type];
    const priceEl = document.getElementById(priceFieldId);
    if (priceEl) priceEl.value = (row.price !== null && row.price !== undefined) ? row.price : '';

    // Legacy fallback — orders saved before Brand/Model were combined into
    // one field still have separate frameBrand / frameModel keys.
    if (row.type === 'frame' && row.itemData && !row.itemData.frameBrandModel) {
        const legacyBrand = (row.itemData.frameBrand || '').trim();
        const legacyModel = (row.itemData.frameModel || '').trim();
        const combined = [legacyBrand, legacyModel].filter(Boolean).join(' ');
        if (combined) document.getElementById('frameBrandModel').value = combined;
    }

    // Legacy fallback — CL rows saved before Brand became a Homebrand/Custom dropdown
    // had a free-text value directly in clBrand (e.g. "Belcon"). Route anything that
    // isn't one of the dropdown's own values into Custom, same treatment as Frame's
    // Brand/Model consolidation above — old orders keep their brand instead of losing
    // it the moment the row is reopened for editing.
    if (row.type === 'cl' && row.itemData) {
        const rawBrand = (row.itemData.clBrand || '').trim();
        if (rawBrand && rawBrand !== 'Homebrand' && rawBrand !== '__custom__') {
            document.getElementById('clBrand').value = '__custom__';
            document.getElementById('clBrandCustom').value = rawBrand;
        }
    }

    if (row.type === 'lens') {
        soOnLensBrandChange(document.getElementById('lensBrand'));
        soOnLensTypeChange(document.getElementById('lensType'));
    }
    if (row.type === 'frame') {
        soOnFrameTypeChange(document.getElementById('frameType'));
        soOnFrameMaterialChange(document.getElementById('frameMaterial'));
    }
    if (row.type === 'cl') {
        soOnClBrandChange(document.getElementById('clBrand'));
        soOnClMaterialChange(document.getElementById('clMaterial'));
        soOnClDesignChange(document.getElementById('clDesign'));
    }
    if (row.type === 'item') {
        soOnItemCategoryChange(document.getElementById('itemCategory'));
    }
    if (row.type === 'service') {
        soOnServiceTypeChange(document.getElementById('serviceType'));
    }

    document.getElementById(modalId).classList.add('active');
    soScrollModalToTop(modalId);
}

// ── Build human-readable description from modal fields ──
function soBuildDescription(type) {
    switch (type) {
        case 'lens': {
            const brandSelect = document.getElementById('lensBrand').value;
            const brandCustom = document.getElementById('lensBrandCustom').value.trim();
            const brand = brandSelect === '__custom__' ? brandCustom : brandSelect;

            const typeSelect = document.getElementById('lensType').value;
            const typeOther  = document.getElementById('lensTypeOther').value.trim();
            const lensType   = typeSelect === '__other__' ? typeOther : typeSelect;

            const coating = document.getElementById('lensCoating').value.trim();
            const index   = document.getElementById('lensIndex').value.trim();
            return [brand, lensType, coating, index].filter(Boolean).join(' — ') || 'Lens';
        }
        case 'frame': {
            const typeSelect = document.getElementById('frameType').value;
            const typeOther  = document.getElementById('frameTypeOther').value.trim();
            const frameType  = typeSelect === '__other__' ? typeOther : typeSelect;

            const materialSelect = document.getElementById('frameMaterial').value;
            const materialOther  = document.getElementById('frameMaterialOther').value.trim();
            const material        = materialSelect === '__other__' ? materialOther : materialSelect;

            const brandModel = document.getElementById('frameBrandModel').value.trim();
            const color = document.getElementById('frameColor').value.trim();
            const shape = document.getElementById('frameShape').value.trim();
            const isOwnFrame = document.querySelector('input[name="frameSource"]:checked')?.value === 'own';

            const base = [brandModel, material, frameType, shape, color].filter(Boolean).join(' — ') || 'Frame';
            return isOwnFrame ? `${base} (Own Frame)` : base;
        }
        case 'cl': {
            const brandSelect = document.getElementById('clBrand').value;
            const brandCustom = document.getElementById('clBrandCustom').value.trim();
            const brand = brandSelect === '__custom__' ? brandCustom : brandSelect;

            const materialSelect = document.getElementById('clMaterial').value;
            const materialOther  = document.getElementById('clMaterialOther').value.trim();
            const material = materialSelect === '__other__' ? materialOther : materialSelect;

            const designSelect = document.getElementById('clDesign').value;
            const designOther  = document.getElementById('clDesignOther').value.trim();
            const design = designSelect === '__other__' ? designOther : designSelect;

            const modality = document.getElementById('clModality').value.trim();
            return [brand, material, design, modality].filter(Boolean).join(' — ') || 'Contact Lens';
        }
        case 'service': {
            const sType = document.getElementById('serviceType').value;
            const notes = document.getElementById('serviceNotes').value.trim();
            return [sType, notes].filter(Boolean).join(': ') || 'Service';
        }
        case 'item': {
            const cat  = document.getElementById('itemCategory').value;
            const name = document.getElementById('itemName').value.trim();
            return [cat, name].filter(Boolean).join(' — ') || 'Item';
        }
        default: return '';
    }
}

// ── Numeric field changed (qty / price) ──
function soOnNumChange(index) {
    // Qty ceiling — soft-clamped live, same reasoning as Price's ceiling. Qty is a
    // dynamically-created per-row field (regenerated on every soAddRow/soCreateRowTr),
    // so it can't go through the static attachValidator pipeline like Price does —
    // this inline check is the equivalent guard for a per-row field.
    const qtyEl = document.getElementById(`so-qty-${index}`);
    if (qtyEl && parseFloat(qtyEl.value) > 100) qtyEl.value = 100;

    const row = soOrderRows[index];
    if (row && row.discType !== 'none' && row.discPct > 0) {
        const qty   = parseFloat(document.getElementById(`so-qty-${index}`)?.value)   || 0;
        const price = parseFloat(document.getElementById(`so-price-${index}`)?.value) || 0;
        const newVal = +((qty * price) * (row.discPct / 100)).toFixed(2);
        document.getElementById(`so-discval-${index}`).value = newVal || '';
    }

    soRecalcRow(index);
    soRecalcOrderTotals();

    if (index === soOrderRows.length - 1 && soIsRowValid(index)) soAddRow();

    soUpdateRowLocks();
}

function soRecalcRow(index) {
    const qty       = parseFloat(document.getElementById(`so-qty-${index}`)?.value) || 0;
    const priceRaw  = (document.getElementById(`so-price-${index}`)?.value ?? '').trim();
    const price     = priceRaw === '' ? null : (parseFloat(priceRaw) || 0);
    const discVal   = parseFloat(document.getElementById(`so-discval-${index}`)?.value) || 0;
    const total     = Math.max(0, (qty * (price ?? 0)) - discVal);

    soOrderRows[index].qty     = qty;
    soOrderRows[index].price   = price;
    soOrderRows[index].discVal = discVal;
    soOrderRows[index].total   = total;

    const totalEl = document.getElementById(`so-rowtotal-${index}`);
    if (totalEl) totalEl.value = soOrderRows[index].type ? total.toFixed(2) : '';
}

// ── Discount Type dropdown changed ──
// ── Keep the discount in sync when Price changes via item-edit (Confirm) — this is
// the fix for the "edit item, discount doesn't recompute" bug: soOnNumChange already
// recomputes discVal from discPct when Qty changes (table field, live), but Price only
// ever changes through the modal's Confirm flow, which never called that same recompute.
// This is that missing counterpart.
//
// Also enforces: no discount type can be active on a ₱0 item — if one was selected and
// price just dropped to 0, it's reset to 'none' (via the existing soOnDiscTypeChange
// 'none' branch, not a new one) and all three options are disabled so none can be
// re-picked while price stays 0. Deliberately NOT special-cased for "allow discount on
// free items" — at ₱0 the qty*price*(pct/100) recompute below already lands on 0 by
// itself, no extra code needed for that part.
//
// Senior/PWD are ALSO disabled independently on walk-in rows (an audited Senior/PWD
// discount requires a customer record by design — walk-ins can still use Promo). That
// check is combined with the zero-price one below, not overwritten by it — otherwise a
// walk-in row's Senior/PWD would incorrectly re-enable the moment price goes non-zero. ──
function soRefreshDiscountForPriceChange(index) {
    const row = soOrderRows[index];
    if (!row) return;

    const disctypeEl   = document.getElementById(`so-disctype-${index}`);
    const seniorOption = disctypeEl?.querySelector('option[value="senior"]');
    const pwdOption    = disctypeEl?.querySelector('option[value="pwd"]');
    const promoOption  = disctypeEl?.querySelector('option[value="promo"]');
    const isZeroPrice  = !(row.price > 0);

    if (seniorOption) seniorOption.disabled = isZeroPrice || soIsWalkIn;
    if (pwdOption)    pwdOption.disabled    = isZeroPrice || soIsWalkIn;
    if (promoOption)  promoOption.disabled  = isZeroPrice;

    if (isZeroPrice && row.discType !== 'none') {
        if (disctypeEl) disctypeEl.value = 'none';
        soOnDiscTypeChange(index); // reuses the existing 'none' reset — clears pct/val/name, re-locks fields, recalcs
        return;
    }

    if (row.discType !== 'none' && row.discPct > 0) {
        const qty    = parseFloat(document.getElementById(`so-qty-${index}`)?.value) || 0;
        const newVal = +((qty * row.price) * (row.discPct / 100)).toFixed(2);
        const valEl  = document.getElementById(`so-discval-${index}`);
        if (valEl) valEl.value = newVal || '';
        row.discVal = newVal;
    }
}

function soOnDiscTypeChange(index) {
    const select   = document.getElementById(`so-disctype-${index}`);
    const discType = select.value;
    soOrderRows[index].discType = discType;

    const pctEl = document.getElementById(`so-discpct-${index}`);
    const valEl = document.getElementById(`so-discval-${index}`);

    if (discType === 'none') {
        pctEl.value = '';
        valEl.value = '';
        soOrderRows[index].discPct  = 0;
        soOrderRows[index].discVal  = 0;
        soOrderRows[index].discName = '';
    } else if (discType === 'senior' || discType === 'pwd') {
        const qty   = parseFloat(document.getElementById(`so-qty-${index}`)?.value)   || 0;
        const price = parseFloat(document.getElementById(`so-price-${index}`)?.value) || 0;
        pctEl.value = 20;
        valEl.value = +((qty * price) * 0.20).toFixed(2) || '';
        soOrderRows[index].discPct  = 20;
        soOrderRows[index].discName = '';
    } else if (discType === 'promo') {
        pctEl.value = '';
        valEl.value = '';
        soOrderRows[index].discPct = 0;
        soOrderRows[index].discVal = 0;
    }

    // Refresh the info row so the Promo Name field's enabled/disabled state stays in sync
    soRenderInfoRow(index);

    // Disc % / Disc ₱ only unlock once a real discount type (not "none") is chosen
    soSetRowLocked(index);

    soRecalcRow(index);
    soRecalcOrderTotals();
}

// ── Disc % changed → derive ₱ ──
function soOnDiscPctChange(index) {
    // Same soft-clamp reasoning as Price/Qty — native max="100" on the input doesn't
    // stop someone typing past it, this catches it live.
    const pctEl = document.getElementById(`so-discpct-${index}`);
    if (pctEl && parseFloat(pctEl.value) > 100) pctEl.value = 100;

    const pct   = parseFloat(pctEl?.value)  || 0;
    const qty   = parseFloat(document.getElementById(`so-qty-${index}`)?.value)      || 0;
    const price = parseFloat(document.getElementById(`so-price-${index}`)?.value)    || 0;
    const val   = +((qty * price) * (pct / 100)).toFixed(2);

    document.getElementById(`so-discval-${index}`).value = val || '';
    soOrderRows[index].discPct = pct;

    soRecalcRow(index);
    soRecalcOrderTotals();
}

// ── Disc ₱ changed → derive % ──
function soOnDiscValChange(index) {
    const qty   = parseFloat(document.getElementById(`so-qty-${index}`)?.value)      || 0;
    const price = parseFloat(document.getElementById(`so-price-${index}`)?.value)    || 0;
    const base  = qty * price;

    // Dynamic ceiling — a discount can never exceed the item's own subtotal. Not a
    // fixed sanity number like Price's ceiling; it's clamped against qty*price itself,
    // so it self-adjusts correctly if qty or price changes later.
    const valEl = document.getElementById(`so-discval-${index}`);
    if (valEl && parseFloat(valEl.value) > base) valEl.value = base ? base.toFixed(2) : '';

    const val   = parseFloat(valEl?.value)  || 0;
    const pct   = base > 0 ? +((val / base) * 100).toFixed(2) : 0;

    document.getElementById(`so-discpct-${index}`).value = pct || '';
    soOrderRows[index].discPct = pct;

    soRecalcRow(index);
    soRecalcOrderTotals();
}

// ── Delete row with confirmation ──
function soDeleteRow(index) {
    if (soItemsLocked) return;
    const row = soOrderRows[index];
    if (!row || !soRowHasContent(index)) return;

    const label = row.description || row.type || `Line #${index + 1}`;

    openModal({
        title:       'Delete Line Item?',
        body:        `Remove "${escapeHtml(label)}" from this order?\nThis cannot be undone.`,
        confirmText: 'Delete',
        cancelText:  'Cancel',
        onConfirm: () => {
            soUnlinkRowPairing(row.rowId);
            soOrderRows.splice(index, 1);
            if (soOrderRows.length === 0) soOrderRows.push(soEmptyRowData());
            soRebuildTable();
            const lastIndex = soOrderRows.length - 1;
            if (soIsRowValid(lastIndex)) soAddRow();
            soUpdateRowLocks();
            soRecalcOrderTotals();
        }
    });
}

// ── Info sub-row: description (left) + promo name (aligned under Discount col) ──
// Auto-shown once a row has a confirmed description — no manual toggle needed.
function soRenderInfoRow(index) {
    const tr = document.querySelector(`tr[data-index="${index}"]`);
    if (!tr) return;

    // Always clear any existing sub-row first, then rebuild if needed
    const next = tr.nextElementSibling;
    if (next && next.classList.contains('so-disc-detail-row') && next.dataset.parent === String(index)) {
        next.remove();
    }

    const row = soOrderRows[index];
    if (!row || !row.description) {
        tr.classList.remove('so-row-boxed-top'); // item cleared — no detail row to box against anymore
        return; // nothing confirmed yet — stay hidden
    }
    tr.classList.add('so-row-boxed-top');

    const isPromo = row.discType === 'promo';
    const showsPatientLink = row.type === 'lens' || row.type === 'cl';

    // During payment mode the whole row is frozen, but Promo Name specifically should
    // stay readonly rather than disabled — it's a record of what was actually applied,
    // and a greyed-out/disabled input reads as "not set" at a glance. readonly keeps the
    // text fully legible while still blocking edits, matching the Price field's pattern.
    const promoLockedForPayment = isPromo && soItemsLocked;

    const detailRow = document.createElement('tr');
    detailRow.classList.add('so-disc-detail-row', 'so-row-boxed-bottom');
    detailRow.dataset.parent = String(index);

    const patientText = row.linkedPatient
        ? `${row.linkedPatient.name} (${row.linkedPatient.id})`
        : 'No patient linked';

    const rxText = row.linkedRx
        ? (row.linkedRx.manual ? 'Entered manually' : row.linkedRx.id)
        : 'No prescription linked';

    detailRow.innerHTML = `
        <td colspan="${SO_TABLE_COLS}">
          <div class="so-disc-detail-content">
            <div class="so-disc-desc-block">
              <label>Description:</label>
              <input type="text" readonly value="${escapeHtml(row.description)}">
            </div>
            <div class="so-disc-promo-block">
              <label class="${isPromo ? '' : 'so-disc-label-disabled'}">Promo Name:</label>
              <input type="text" id="so-discname-${index}" placeholder="e.g. Back to School Promo"
                oninput="soOnDiscNameChange(${index})" ${!isPromo ? 'disabled' : (promoLockedForPayment ? 'readonly' : '')}>
            </div>
            ${showsPatientLink ? `
            <div class="so-disc-patient-rx-row">
              <div class="so-disc-patient-block">
                <label>Patient:</label>
                <input type="text" readonly value="${escapeHtml(patientText)}">
              </div>
              <div class="so-disc-rx-block">
                <label>Rx:</label>
                <input type="text" readonly value="${escapeHtml(rxText)}">
              </div>
            </div>` : ''}
          </div>
        </td>
    `;
    tr.after(detailRow);

    const nameEl = document.getElementById(`so-discname-${index}`);
    if (nameEl && row.discName) nameEl.value = row.discName;
}

function soOnDiscNameChange(index) {
    const el = document.getElementById(`so-discname-${index}`);
    soOrderRows[index].discName = el ? el.value.trim() : '';
}

// ── Split-tender payments: locked list + Add/Edit modal ──
// Every entry that lands in soPayments is already fully valid (method + amount > 0),
// enforced at modal Save time — there's no partially-filled row state to guard against.

// Payments unlock once at least one item has been successfully confirmed — not tied to
// Total being above zero, so a legitimately free/promo/zero-priced item can still go
// through a payment flow (e.g. issuing a receipt for a freebie).
function soHasConfirmedItem() {
    return soOrderRows.some(r => r.description);
}

// ── Summary recalc: Gross Total → Discount → Total → Payments → Balance / Change ──
// ── Item-derived totals: Gross Total / Discount / Total. Live while items are unlocked;
// also keeps the "Proceed to Payment" button's enabled state in sync. Returns Total so
// soLockOrderItems can cache it without a second, separate computation. ──
function soRecalcOrderTotals() {
    const grossTotal = soOrderRows.reduce((sum, r) => sum + ((r.qty || 0) * (r.price || 0)), 0);
    const discount   = soOrderRows.reduce((sum, r) => sum + (r.discVal || 0), 0);
    const total      = Math.max(0, grossTotal - discount);

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('summaryGrossTotal', grossTotal.toFixed(2));
    setVal('summaryDiscount',   discount.toFixed(2));
    setVal('summaryTotal',      total.toFixed(2));

    soUpdateProceedButtonState();
    soRenderJobOrderPanel();
    return total;
}

// ── "Proceed to Payment" unlocks once at least one item is confirmed — mirrors what
// soHasConfirmedItem used to gate directly on the Payment side before this lock existed. ──
function soUpdateProceedButtonState() {
    const block = document.getElementById('proceedPaymentBlock');
    if (!block) return;
    // Hidden entirely (not just disabled) until there's a confirmed item, and hidden again
    // once items are locked (the block's job is done — soLockOrderItems already hides it too,
    // this just keeps the same rule authoritative if soRecalcOrderTotals ever fires again).
    const shouldShow = !soItemsLocked && soHasConfirmedItem();
    block.classList.toggle('hidden', !shouldShow);
}

// ── Lock order items, cache Total, and reveal the Payment Summary ──
function soLockOrderItems() {
    if (!soHasConfirmedItem()) return;

    const unpairedJobs = soOrderRows.filter(r => soRowNeedsFramePairing(r) && !r.pairedWith);
    if (unpairedJobs.length > 0) {
        const plural = unpairedJobs.length > 1;
        openAlert({
            title: 'Job Order Pairing Required',
            body: `${unpairedJobs.length} job order${plural ? 's still need' : ' still needs'} a paired frame before proceeding to payment.\nPlease resolve all pairings in the Job Order Summary panel first.`
        });
        return;
    }

    soItemsLocked = true;
    soLockedTotal = soRecalcOrderTotals(); // one last recompute, captured as the frozen Total

    // ── Zero-total orders (freebies / full-discount promos) skip the payment step
    // entirely. There's no valid method to "collect" ₱0 through, so instead of leaving
    // Payments empty and asking the user to pick one, auto-record a single locked Cash
    // entry at ₱0.00. It can't be edited or removed, and Add Payment stays disabled —
    // there's nothing left to add. This still gives the order a payment record for
    // receipt/history purposes and resolves Payment Status to 'paid' (see soPaymentStatus). ──
    soPayments = (soLockedTotal === 0) ? [{ method: 'cash', amount: 0, locked: true, timestamp: new Date().toISOString() }] : [];

    soUpdateRowLocks();
    soOrderRows.forEach((_, i) => soSetActionsState(i));
    soOrderRows.forEach((_, i) => soRenderInfoRow(i)); // re-evaluate Promo Name's readonly state now that soItemsLocked changed
    document.getElementById('orderTable')?.classList.add('so-payment-mode');

    document.getElementById('proceedPaymentBlock')?.classList.add('hidden');
    document.getElementById('editItemsBlock')?.classList.remove('hidden');
    document.getElementById('paymentLockedSection')?.classList.remove('hidden');
    document.getElementById('saveOrderBlock')?.classList.remove('hidden');
    document.getElementById('saveOrderBtn').disabled = false;

    soRenderPaymentRows();
    soRecalcPaymentSummary();
}

// ── Go back to editing items — clears payments and re-locks the Payment Summary.
// Deliberate, single button click with a fully predictable outcome, so a plain
// confirm here is enough; this isn't the reactive dirty-checking we scrapped earlier. ──
function soUnlockOrderItemsForEditing() {
    if (!soItemsLocked) return;

    const hasPayments = soPayments.length > 0;
    const body = hasPayments
        ? 'Editing items will clear the payments you\'ve entered so far. Continue?'
        : 'Go back and edit order items?';

    openModal({
        title:       'Edit Order Items?',
        body:        body,
        confirmText: 'Edit Items',
        cancelText:  'Cancel',
        onConfirm: () => {
            soPayments      = [];
            soItemsLocked   = false;
            soLockedTotal   = 0;

            soRenderPaymentRows();
            document.getElementById('paymentLockedSection')?.classList.add('hidden');
            document.getElementById('editItemsBlock')?.classList.add('hidden');
            document.getElementById('proceedPaymentBlock')?.classList.remove('hidden');
            document.getElementById('saveOrderBlock')?.classList.add('hidden');
            document.getElementById('saveOrderBtn').disabled = true;

            soUpdateRowLocks();
            soOrderRows.forEach((_, i) => soSetActionsState(i));
            soOrderRows.forEach((_, i) => soRenderInfoRow(i)); // Promo Name goes back to editable now that soItemsLocked is false
            document.getElementById('orderTable')?.classList.remove('so-payment-mode');
            soRecalcOrderTotals();
        }
    });
}

// ── Save Order ──
async function handleSaveOrder() {
    // Save is only reachable once items are locked and the payment phase has started
    if (!soItemsLocked) {
        openAlert({ title: 'Items Not Finalized', body: 'Please click "Proceed to Payment" before saving the order.' });
        return;
    }

    // Validate: at least one valid row
    const hasItems = soOrderRows.some((r, i) => soIsRowValid(i));
    if (!hasItems) {
        openAlert({ title: 'No Items', body: 'Please add at least one item before saving.' });
        return;
    }

    // Validate: date fields must be filled (blur validators already clamp values)
    const mm   = document.getElementById('orderDateCreatedMM')?.value.trim();
    const dd   = document.getElementById('orderDateCreatedDD')?.value.trim();
    const yyyy = document.getElementById('orderDateCreatedYYYY')?.value.trim();

    if (!mm || !dd || !yyyy) {
        openAlert({ title: 'Invalid Date', body: 'Please enter a valid date for this order (MM / DD / YYYY).' });
        return;
    }

    const dateCreated = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
    const customerId = document.getElementById('customerProfileIdNumber')?.value.trim() || '';

    const grossTotal = soOrderRows.reduce((sum, r) => sum + ((r.qty || 0) * (r.price || 0)), 0);
    const discount   = soOrderRows.reduce((sum, r) => sum + (r.discVal || 0), 0);
    const total      = soLockedTotal; // items are frozen — this is the one true Total, not a recomputation

    // amount > 0 covers real tendered payments; `locked` lets the auto ₱0 Cash record
    // from a free/full-discount order through too, so the saved order keeps a payment
    // entry for receipt/history purposes instead of an empty payments array.
    // amount >= 0 (not > 0) — a manually-entered ₱0 Cash row is a deliberate, valid record
    // now (see soConfirmPaymentModal), not something to silently drop. This also already
    // covers the auto-locked free-order entry (also amount:0), so the old separate
    // `|| p.locked` clause is redundant and removed.
    const validPayments = soPayments.filter(p => p.method && p.amount >= 0);
    const tendered  = validPayments.reduce((sum, p) => sum + p.amount, 0);
    const hasCash   = validPayments.some(p => p.method === 'cash');
    const amountPaid = Math.min(tendered, total);
    const changeDue  = (tendered > total && hasCash) ? +(tendered - total).toFixed(2) : 0;
    const balance    = Math.max(0, +(total - amountPaid).toFixed(2));

    // Nothing recorded in Payments at all — never allowed through, walk-in or not. A
    // free/full-discount order (total===0) always has at least the auto-locked ₱0 Cash
    // entry from soLockOrderItems by this point, so this only ever fires when the cashier
    // genuinely never touched Add Payment on an order that has a real balance due.
    //
    // Message branches on soIsWalkIn — the "add ₱0 Cash to record zero downpayment" advice
    // only makes sense for a registered customer (who's allowed to leave with a balance
    // owed). Suggesting it to a walk-in would be actively misleading: they'd add the ₱0
    // row, click Confirm again, and immediately hit the walk-in-must-pay-in-full check
    // right below this one anyway — so walk-ins get told the real requirement instead.
    if (validPayments.length === 0) {
        const body = soIsWalkIn
            ? 'Please add a payment covering the full total — walk-in orders must be paid in full before confirming.'
            : 'Please add at least one payment. If planning to proceed with zero downpayment, add cash with ₱0 as its value.';
        openAlert({ title: 'No Payment Recorded', body });
        return;
    }

    // Walk-ins have no customer record to follow up with later, so unlike a registered
    // customer's order, they can't be allowed to leave with a balance owed — there's no
    // one to collect it from. Cash is still free to go over (that's Change Due, already
    // reflected as balance=0 above), this only blocks an actual unpaid remainder.
    if (soIsWalkIn && balance > 0) {
        openAlert({
            title: 'Full Payment Required',
            body:  `Walk-in orders must be paid in full. Remaining: ₱${balance.toFixed(2)}.`
        });
        return;
    }

    // ── Critical section: Order ID + Job ID generation, record build, and the Storage
    // write all happen inside ONE lock, in that order — not just the ID checks alone.
    // Splitting "check ID" from "write" would still leave a gap for another tab to sneak
    // in between them; this way nothing about salesOrders can be read OR written by any
    // other tab/window while this is in flight. Everything above this point (validation,
    // alerts) deliberately stays outside the lock — it never touches shared storage and
    // shouldn't make another tab queue behind a user reading a dialog. See soWithStorageLock
    // in storage.js for what this actually guarantees vs. the old check-then-write pattern. ──
    const order = await soWithStorageLock('salesOrders', async () => {
        const orderId = _resolveUniqueOrderID();

        // Only save rows that have content. rowId/pairedWith/linkedPatient/linkedRx are
        // persisted (not just live in soOrderRows) so a saved order can be reprinted later
        // from Records/History with its Lens⇄Frame pairing and Patient/Rx links intact —
        // see printJobOrderStubs() in print.js, which reconstructs the Job Order Summary
        // panel's logic from these same fields off the saved array instead of soOrderRows.
        //
        // jobId/jobStatus: one Job ID minted per soRowGetsJobStub-eligible row (a paired
        // Lens+Frame is ONE job/ONE id, matching printJobOrderStubs' grouping — the paired
        // Frame row itself gets jobId:null, its details are folded into the Lens's stub).
        //
        // jobStatus is lab/production state ONLY: 'pending' → 'processing' → 'done'. Claim
        // (customer pickup) is deliberately a SEPARATE boolean+timestamp, not a 4th status
        // value — a job can be 'done' for days before anyone claims it, and claiming is
        // gated on its own rule (done && parent order's balance is ₱0) that has nothing to
        // do with lab progress. Keeping them orthogonal is what makes the Job Orders page
        // (pure lab status, no payment awareness) and the future Pending Orders Claim
        // button (payment-gated, per-job) each simple on their own instead of one field
        // trying to encode two different lifecycles. processingStartedAt/doneAt/claimedAt
        // all start null — this is the data-model foundation the Job Orders page reads
        // from and writes into (Job Orders / Claim flow built starting this session).
        const validRows  = soOrderRows.filter((r, i) => soIsRowValid(i));
        const jobIdQueue = _soMakeJobIdSequence(validRows.filter(soRowGetsJobStub).length);
        let jobIdCursor  = 0;

        const itemsToSave = validRows.map(r => {
            const isJob = soRowGetsJobStub(r);
            return {
                rowId:               r.rowId,
                type:                r.type,
                description:         r.description,
                qty:                 r.qty,
                price:               r.price,
                discType:            r.discType,
                discPct:             r.discPct,
                discVal:             r.discVal,
                discName:            r.discName,
                total:               r.total,
                itemData:            r.itemData,
                pairedWith:          r.pairedWith,
                linkedPatient:       r.linkedPatient || null,
                linkedRx:            r.linkedRx || null,
                jobId:               isJob ? jobIdQueue[jobIdCursor++] : null,
                jobStatus:           isJob ? 'pending' : null, // 'pending' | 'processing' | 'done'
                processingStartedAt: null, // set when Pending → Processing
                doneAt:              null, // set when Processing → Done
                claimed:             isJob ? false : null,
                claimedAt:           null  // set when claimed — gated on done && order.balance===0
            };
        });

        const newOrder = {
            id:            orderId,
            customerId:    customerId,
            isWalkIn:      soIsWalkIn,
            dateCreated:   dateCreated,
            items:         itemsToSave,
            grossTotal:    +grossTotal.toFixed(2),
            discount:      +discount.toFixed(2),
            total:         +total.toFixed(2),
            payments:      validPayments,
            amountPaid:    +amountPaid.toFixed(2),
            changeDue:     changeDue,
            balance:       balance,
            paymentStatus: soPaymentStatus(amountPaid, total), // 'unpaid' | 'partial' | 'paid'
            status:        'pending' // order fulfillment status — separate from paymentStatus
        };

        const orders = JSON.parse(Storage.getItem('salesOrders') || '[]');
        orders.push(newOrder);
        Storage.setItem('salesOrders', JSON.stringify(orders));

        return newOrder;
    });

    // Belt-and-suspenders: soResetOrderForm() (fired via onEnterNewOrder on the next visit)
    // already clears this, but resetting it here too means the lock never dangles in a
    // "saved but still locked" state even if that entry hook ever fails to fire.
    soItemsLocked = false;

    // Mark the page "clean" the instant the order is safely persisted — the dirtyGuardPages
    // '#salesNewOrder' check keys off orderIdBlock's visibility, and without this it would
    // still read as visible (only onEnterNewOrder hides it, which doesn't run until the next
    // arrival) and incorrectly warn "Unsaved Changes" the moment Done navigates away from an
    // order that was, in fact, just successfully saved.
    document.getElementById('orderIdBlock')?.classList.add('hidden');

    _soShowPrintPromptModal(order, {
        title: 'Order Saved',
        message: `Order ${order.id} saved successfully!`,
        onDone: () => { window.location.hash = '#salesPage'; }
    });
}

// ── Post-save / reprint print prompt — deliberately its own small overlay rather than
// going through modal.js's openModal()/openAlert(). Those only support a single
// Confirm + Cancel pair; this needs three independent actions (Print Receipt / Print
// Job Order Stub(s) / Done) that don't close the modal on click (so the cashier can print
// one, then the other, then Done) — a shape neither existing helper covers. Reuses the
// same .app-modal-* classes for visual consistency, just with its own overlay element
// instead of touching modal.js's shared singleton.
//
// Used two ways: right after Save (title "Order Saved", onDone navigates to Sales), and
// later as a reprint from Records/History (title "Reprint", onDone just closes). Either
// way it reads from the saved `order` object, not soOrderRows/soPayments — those don't
// exist once you've left the New Order page, which is the whole reason handleSaveOrder()
// now persists rowId/pairedWith/linkedPatient/linkedRx: printJobOrderStubs() rebuilds the
// Job Order Summary panel's pairing logic purely off this saved array. ──
function _soShowPrintPromptModal(order, { title, message, onDone }) {
    const hasJobStub = (order.items || []).some(soRowGetsJobStub);

    // Job-less orders (pure accessory/service sales — nothing soRowGetsJobStub-eligible)
    // don't get a "Print Job Order(s)" slot at all, rather than a disabled button sitting
    // there with nothing to do — there's no job stub concept for these orders to begin
    // with, so a disabled button just raised "why is this here?" without an answer.
    const jobBtn = hasJobStub
        ? `<button type="button" id="_soPrintJobBtn">Print Job Order(s)</button>`
        : '';

    const overlay = document.createElement('div');
    overlay.className = 'app-modal active';
    overlay.innerHTML = `
        <div class="app-modal-content so-print-prompt-content">
            <div class="app-modal-header">${escapeHtml(title)}</div>
            <div class="app-modal-body"><p>${escapeHtml(message)}</p></div>
            <div class="app-modal-actions so-print-prompt-actions">
                <button type="button" id="_soPrintReceiptBtn">Print Receipt</button>
                ${jobBtn}
                <button type="button" id="_soPrintDoneBtn">Done</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const close = () => { overlay.remove(); onDone(); };

    document.getElementById('_soPrintReceiptBtn').addEventListener('click', () => printReceipt(order));
    document.getElementById('_soPrintJobBtn')?.addEventListener('click', () => printJobOrderStubs(order));
    document.getElementById('_soPrintDoneBtn').addEventListener('click', close);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
// ── Reset order form (called when leaving the page or changing customer) ──
function soResetOrderForm() {
    // soItemsLocked MUST be cleared before soInitTable() runs — soInitTable() calls
    // soAddRow() in a loop, and soAddRow() silently no-ops while soItemsLocked is true.
    // Getting this order backwards means every order after the first one in a session
    // (soItemsLocked is never reset by handleSaveOrder either) ends up with a table
    // that "resets" to zero rows instead of ten.
    soItemsLocked = false;
    soLockedTotal = 0;
    soInitTable();
    soPayments    = [];
    soRenderPaymentRows();

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('summaryGrossTotal', '0.00');
    setVal('summaryDiscount',   '0.00');
    setVal('summaryTotal',      '0.00');
    setVal('summaryAmountPaid', '0.00');
    setVal('summaryBalance',    '0.00');
    setVal('summaryChangeDue',  '0.00');
    document.getElementById('summaryChangeRow')?.classList.add('hidden');

    // Back to "building the order" phase — Payment Summary re-hides, Proceed button re-shows
    document.getElementById('paymentLockedSection')?.classList.add('hidden');
    document.getElementById('editItemsBlock')?.classList.add('hidden');
    document.getElementById('proceedPaymentBlock')?.classList.remove('hidden');
    document.getElementById('orderTable')?.classList.remove('so-payment-mode');
    const saveBtn = document.getElementById('saveOrderBtn');
    if (saveBtn) saveBtn.disabled = true;
    document.getElementById('saveOrderBlock')?.classList.add('hidden');
    soUpdateProceedButtonState();
}

// ── Called via data-on-entry every time #salesNewOrder is visited ──
function onEnterNewOrder() {
    // Reset walk-in state — the upcoming customer/walk-in choice will set it again
    soIsWalkIn = false;

    // Hide order table and reset it
    document.getElementById('orderItemsBlock')?.classList.add('hidden');
    document.getElementById('orderIdBlock')?.classList.add('hidden');
    document.getElementById('customerProfileForm')?.classList.add('hidden');
    document.getElementById('changeCustomerContainer')?.classList.add('hidden');
    document.getElementById('walkinCustomerHeader')?.classList.add('hidden');
    document.getElementById('newOrderSelectCustomerMenu')?.classList.remove('hidden');

    // Reset search bar
    const searchBar = document.getElementById('selectCustomerSearchBarInput');
    if (searchBar) searchBar.value = '';

    // Reset order table + summary
    soResetOrderForm();

    // Re-render customer selection table
    renderSelectCustomerTable();
}

// ── Init: called from main.js ──
function initOrderFormLogic() {
    // Wire Save Order button — only reachable once items are locked (see handleSaveOrder guard)
    document.getElementById('saveOrderBtn')?.addEventListener('click', handleSaveOrder);

    // Wire the new items-lock ⇄ payment-unlock flow
    document.getElementById('proceedPaymentBtn')?.addEventListener('click', soLockOrderItems);
    const editItemsBtnEl = document.getElementById('editItemsBtn');
    if (editItemsBtnEl) {
        editItemsBtnEl.innerHTML = `${SO_ICON_EDIT}<span>Edit Items</span>`;
        editItemsBtnEl.addEventListener('click', soUnlockOrderItemsForEditing);
    }

    // Wire "+ Add Payment" button and render any existing payment rows
    document.getElementById('addPaymentBtn')?.addEventListener('click', soOpenAddPaymentModal);
    soRenderPaymentRows();

    // Wire order date fields to existing blur validators from validation.js
    if (typeof attachDatePartValidators === 'function') attachDatePartValidators('order');

    // Wire the Patient Link sub-modal's search bar (Lens/CL "Select Patient")
    document.getElementById('patientLinkSearchInput')?.addEventListener('input', (e) => {
        soRenderPatientLinkTable(e.target.value);
    });

    // Build the initial table
    soInitTable();
}