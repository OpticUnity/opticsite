// ================================================================
//  order-form-logic.js — OpticUnity
//  Sales Order: order items table, item modals, payment summary,
//  and save handler. Called via initOrderFormLogic() from main.js.
// ================================================================

// ── Config ──
const SO_TABLE_COLS  = 9;
const SO_ICON_EDIT   = `<svg viewBox="0 0 512 512" aria-hidden="true"><path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 79.7l-145 145c-4.5 4.5-7.6 10.1-8.9 16.2l-23.4 117.1 117.1-23.4c6.1-1.3 11.7-4.4 16.2-8.9l145-145c21.9-21.9 21.9-57.3 0-79.2L251.7 101.4c-21.9-21.8-57.3-21.8-79.2 0zM80 352c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16h64c8.8 0 16-7.2 16-16V384h32c8.8 0 16-7.2 16-16s-7.2-16-16-16H96 80z"/></svg>`;
const SO_ICON_TRASH  = `<svg viewBox="0 0 448 512" aria-hidden="true"><path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0h120.4c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128h384v320c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"/></svg>`;

const SO_TYPE_TO_MODAL = {
    lens:    'modalLens',
    frame:   'modalFrame',
    cl:      'modalCL',
    service: 'modalService',
    item:    'modalItem',
};

// Field IDs captured/prefilled per item type — single source of truth
const SO_MODAL_FIELDS = {
    lens:    ['lensBrand', 'lensBrandCustom', 'lensType', 'lensTypeOther', 'lensCoating', 'lensIndex',
              'lensOdSph', 'lensOdCyl', 'lensOdAxis', 'lensOdAdd',
              'lensOsSph', 'lensOsCyl', 'lensOsAxis', 'lensOsAdd',
              'lensNotes'],
    frame:   ['frameType', 'frameTypeOther', 'frameMaterial', 'frameMaterialOther',
              'frameBrandModel', 'frameColor', 'frameShape', 'frameNotes'],
    cl:      ['clBrand', 'clType',
              'clOdSph', 'clOdBc', 'clOdDia',
              'clOsSph', 'clOsBc', 'clOsDia',
              'clNotes'],
    service: ['serviceType', 'serviceNotes'],
    item:    ['itemCategory', 'itemName', 'itemNotes'],
};

// ── State ──
let _soActiveRowIndex = null; // which row triggered the open modal
let _soIsEditingRow   = false; // true = re-confirm overwrites in place
let soOrderRows       = [];
let soIsWalkIn        = false; // true = walk-in order (no customer record) — restricts item types that need a customer on file

// Type dropdown options — single source of truth for value + label
const SO_TYPE_OPTIONS = [
    { value: 'service', label: 'Service' },
    { value: 'lens',    label: 'Lens' },
    { value: 'frame',   label: 'Frame' },
    { value: 'cl',      label: 'Contact Lens' },
    { value: 'item',    label: 'Acc. & Sol.' },
];

// Item types that require a customer profile on file (job claiming reference)
const SO_TYPES_REQUIRE_CUSTOMER = ['lens', 'service'];

// ── Empty row factory ──
function soEmptyRowData() {
    return {
        type: '', description: '', itemData: null,
        qty: 1, price: null,
        discType: 'none', discPct: 0, discVal: 0,
        discName: '',
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

    const qtyVal   = row.type ? (row.qty   || '') : '';
    const priceVal = (row.type && row.price !== null) ? row.price : '';
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
          <input type="number" min="1" value="${qtyVal}" id="so-qty-${index}"
            oninput="soOnNumChange(${index})" placeholder="—" ${d.qty ? 'disabled' : ''}>
        </td>
        <td class="so-col-price">
          <input type="number" min="0" value="${priceVal}" id="so-price-${index}"
            oninput="soOnNumChange(${index})" placeholder="0.00" ${d.price ? 'disabled' : ''}>
        </td>
        <td class="so-col-disctype">
          <select id="so-disctype-${index}" onchange="soOnDiscTypeChange(${index})" ${d.disctype ? 'disabled' : ''}>
            <option value="none"   ${row.discType === 'none'   ? 'selected' : ''}>None</option>
            <option value="senior" ${row.discType === 'senior' ? 'selected' : ''}>Senior</option>
            <option value="pwd"    ${row.discType === 'pwd'    ? 'selected' : ''}>PWD</option>
            <option value="promo"  ${row.discType === 'promo'  ? 'selected' : ''}>Promo</option>
          </select>
        </td>
        <td class="so-col-discpct">
          <input type="number" min="0" max="100" value="${discPct}" id="so-discpct-${index}"
            oninput="soOnDiscPctChange(${index})" placeholder="0" ${d.discpct ? 'disabled' : ''}>
        </td>
        <td class="so-col-discval">
          <input type="number" min="0" value="${discVal}" id="so-discval-${index}"
            oninput="soOnDiscValChange(${index})" placeholder="0.00" ${d.discval ? 'disabled' : ''}>
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

function soEscapeAttr(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

// ── Build <option>s for the type dropdown — disabled (walk-in-restricted) types sink to the bottom.
// The blank "--" option is omitted once the row already has a confirmed item — switching to
// "nothing" via the dropdown isn't a real action; use the trash icon to clear the row instead. ──
function soBuildTypeOptions(selectedType, hasConfirmedItem = false) {
    const isRestricted = (val) => soIsWalkIn && SO_TYPES_REQUIRE_CUSTOMER.includes(val);

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
    soRecalcSummary();
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
    setDisabled('so-price-',    d.price);
    setDisabled('so-disctype-', d.disctype);
    setDisabled('so-discpct-',  d.discpct);
    setDisabled('so-discval-',  d.discval);
    setDisabled('so-rowtotal-', d.total);

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

// ── Rows whose qty is fixed and non-editable (currently: lens — always 1 per line, locked once confirmed) ──
function soIsQtyFixed(index) {
    const row = soOrderRows[index];
    return !!(row && ['lens', 'service', 'frame'].includes(row.type) && row.description);
}

// ── Single source of truth for a row's field-level disabled states ──
// Column 1 (Type) is the only thing enabled until an item type is
// successfully confirmed (modal confirmed → row.description set).
// Qty / Price / Discount Type unlock once confirmed.
// Disc % / Disc ₱ only unlock once a real discount type (not "none") is chosen.
function soComputeFieldDisabled(index) {
    const row           = soOrderRows[index];
    const rowLocked     = index > 0 && !soIsRowValid(index - 1);
    const itemConfirmed = !!(row && row.type && row.description);
    const baseDisabled  = rowLocked || !itemConfirmed;
    const discActive    = !!(row && row.discType && row.discType !== 'none');

    return {
        rowLocked,
        type:     rowLocked,
        qty:      baseDisabled || soIsQtyFixed(index),
        price:    baseDisabled,
        disctype: baseDisabled,
        discpct:  baseDisabled || !discActive,
        discval:  baseDisabled || !discActive,
        total:    baseDisabled
    };
}

function soSetActionsState(index) {
    const tr = document.querySelector(`tr[data-index="${index}"]`);
    if (!tr) return;

    const locked     = tr.classList.contains('so-row-locked');
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
    if (soIsWalkIn && SO_TYPES_REQUIRE_CUSTOMER.includes(type)) {
        const tr     = document.querySelector(`tr[data-index="${index}"]`);
        const select = tr?.querySelector(`#so-type-${index}`);
        if (select) select.value = soOrderRows[index].type || '';
        openAlert({ title: 'Customer Record Required', body: 'This item type requires a customer record on file for job claiming reference.\nPlease select a customer instead of walk-in to add this item.' });
        return;
    }

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
        soRecalcSummary();
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
    document.getElementById(SO_TYPE_TO_MODAL[type]).classList.add('active');
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

// ── Modal: Confirm ──
function confirmModal(modalId, type) {
    if (_soActiveRowIndex === null) return;

    // ── Validation: Service must have a Service Type selected — fail the confirm otherwise ──
    if (type === 'service') {
        const serviceTypeEl = document.getElementById('serviceType');
        if (!serviceTypeEl || !serviceTypeEl.value) {
            openAlert({ title: 'Service Type Required', body: 'Please select a Service Type before confirming.' });
            return; // modal stays open, nothing is saved
        }
    }

    // ── Validation: Lens must have a Brand + Coating; Custom brand / Other type can't be blank ──
    // (Rx fields intentionally not validated yet — wiring pending UI/UX cleanup)
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

    document.getElementById(modalId).classList.remove('active');

    const index = _soActiveRowIndex;
    const desc  = soBuildDescription(type);
    soOrderRows[index].description = desc;
    soOrderRows[index].itemData    = soCaptureModalFields(type);
    soRefreshTypeSelect(index); // item now confirmed — drop the blank "--" option

    // Service is always qty 1 per line (no per-item qty splitting) — fix + lock it only after a successful confirm
    if (type === 'service') {
        const qtyEl = document.getElementById(`so-qty-${index}`);
        if (qtyEl) {
            qtyEl.value    = 1;
            qtyEl.disabled = true;
        }
        soOrderRows[index].qty = 1;
        soRecalcRow(index);
        soRecalcSummary();
    }

    // Lens is always qty 1 per line (no per-item qty splitting) — fix + lock it only after a successful confirm
    if (type === 'lens') {
        const qtyEl = document.getElementById(`so-qty-${index}`);
        if (qtyEl) {
            qtyEl.value    = 1;
            qtyEl.disabled = true;
        }
        soOrderRows[index].qty = 1;
        soRecalcRow(index);
        soRecalcSummary();
    }

    // Frame is always qty 1 per line (no per-item qty splitting) — fix + lock it only after a successful confirm
    if (type === 'frame') {
        const qtyEl = document.getElementById(`so-qty-${index}`);
        if (qtyEl) {
            qtyEl.value    = 1;
            qtyEl.disabled = true;
        }
        soOrderRows[index].qty = 1;

        // Customer supplied their own frame — default price to 0.00 since the clinic
        // didn't provide the frame stock. Still editable in case a clinic charges a
        // separate processing/handling fee for customer-owned frames.
        if (soOrderRows[index].itemData.frameSource === 'own') {
            const priceEl = document.getElementById(`so-price-${index}`);
            if (priceEl) priceEl.value = '0.00';
        }

        soRecalcRow(index);
        soRecalcSummary();
    }

    soClearModalFields(modalId);
    soSetActionsState(index);
    soRenderInfoRow(index);

    if (!_soIsEditingRow && index === soOrderRows.length - 1 && soIsRowValid(index)) soAddRow();

    soUpdateRowLocks();
    _soActiveRowIndex = null;
    _soIsEditingRow   = false;

    // Auto-focus Price right after a successful confirm — it's re-enabled by soUpdateRowLocks
    // just above, so it's ready to receive focus by the time we get here.
    // Skip the auto-select for Customer's Frame — the 0.00 is already correct by default,
    // so highlighting it reads as "type something" when there's nothing to fix.
    const priceEl = document.getElementById(`so-price-${index}`);
    const skipSelect = type === 'frame' && soOrderRows[index].itemData.frameSource === 'own';
    if (priceEl && !priceEl.disabled) {
        priceEl.focus();
        if (!skipSelect) priceEl.select();
    }
}

// ── Clear modal fields ──
function soClearModalFields(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('input[type="text"], textarea').forEach(el => el.value = '');
    modal.querySelectorAll('select').forEach(el => el.selectedIndex = 0);

    if (modalId === 'modalLens') {
        document.getElementById('lensBrandCustom')?.classList.add('hidden');
        document.getElementById('lensTypeOther')?.classList.add('hidden');
    }
    if (modalId === 'modalFrame') {
        document.getElementById('frameTypeOther')?.classList.add('hidden');
        document.getElementById('frameMaterialOther')?.classList.add('hidden');
        const clinicRadio = document.getElementById('frameSourceClinic');
        if (clinicRadio) clinicRadio.checked = true;
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
        optionsHtml += `<option value="${soEscapeAttr(name)}">${soEscapeAttr(name)}</option>`;
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
    const row = soOrderRows[index];
    if (!row || !row.type) return;

    _soActiveRowIndex = index;
    _soIsEditingRow   = true;

    const modalId = SO_TYPE_TO_MODAL[row.type];
    soClearModalFields(modalId);

    if (row.type === 'lens') soPopulateLensBrandOptions();

    soPrefillModalFields(row.type, row.itemData);

    // Legacy fallback — orders saved before Brand/Model were combined into
    // one field still have separate frameBrand / frameModel keys.
    if (row.type === 'frame' && row.itemData && !row.itemData.frameBrandModel) {
        const legacyBrand = (row.itemData.frameBrand || '').trim();
        const legacyModel = (row.itemData.frameModel || '').trim();
        const combined = [legacyBrand, legacyModel].filter(Boolean).join(' ');
        if (combined) document.getElementById('frameBrandModel').value = combined;
    }

    if (row.type === 'lens') {
        soOnLensBrandChange(document.getElementById('lensBrand'));
        soOnLensTypeChange(document.getElementById('lensType'));
    }
    if (row.type === 'frame') {
        soOnFrameTypeChange(document.getElementById('frameType'));
        soOnFrameMaterialChange(document.getElementById('frameMaterial'));
    }

    document.getElementById(modalId).classList.add('active');
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

            const base = [frameType, material, brandModel, color, shape].filter(Boolean).join(' — ') || 'Frame';
            return isOwnFrame ? `${base} (Own Frame)` : base;
        }
        case 'cl': {
            const brand  = document.getElementById('clBrand').value.trim();
            const clType = document.getElementById('clType').value;
            return [brand, clType].filter(Boolean).join(' — ') || 'Contact Lens';
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
    const row = soOrderRows[index];
    if (row && row.discType !== 'none' && row.discPct > 0) {
        const qty   = parseFloat(document.getElementById(`so-qty-${index}`)?.value)   || 0;
        const price = parseFloat(document.getElementById(`so-price-${index}`)?.value) || 0;
        const newVal = +((qty * price) * (row.discPct / 100)).toFixed(2);
        document.getElementById(`so-discval-${index}`).value = newVal || '';
    }

    soRecalcRow(index);
    soRecalcSummary();

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
    soRecalcSummary();
}

// ── Disc % changed → derive ₱ ──
function soOnDiscPctChange(index) {
    const pct   = parseFloat(document.getElementById(`so-discpct-${index}`)?.value)  || 0;
    const qty   = parseFloat(document.getElementById(`so-qty-${index}`)?.value)      || 0;
    const price = parseFloat(document.getElementById(`so-price-${index}`)?.value)    || 0;
    const val   = +((qty * price) * (pct / 100)).toFixed(2);

    document.getElementById(`so-discval-${index}`).value = val || '';
    soOrderRows[index].discPct = pct;

    soRecalcRow(index);
    soRecalcSummary();
}

// ── Disc ₱ changed → derive % ──
function soOnDiscValChange(index) {
    const val   = parseFloat(document.getElementById(`so-discval-${index}`)?.value)  || 0;
    const qty   = parseFloat(document.getElementById(`so-qty-${index}`)?.value)      || 0;
    const price = parseFloat(document.getElementById(`so-price-${index}`)?.value)    || 0;
    const base  = qty * price;
    const pct   = base > 0 ? +((val / base) * 100).toFixed(2) : 0;

    document.getElementById(`so-discpct-${index}`).value = pct || '';
    soOrderRows[index].discPct = pct;

    soRecalcRow(index);
    soRecalcSummary();
}

// ── Delete row with confirmation ──
function soDeleteRow(index) {
    const row = soOrderRows[index];
    if (!row || !soRowHasContent(index)) return;

    const label = row.description || row.type || `Line #${index + 1}`;

    openModal({
        title:       'Delete Line Item?',
        body:        `Remove "${label}" from this order?\nThis cannot be undone.`,
        confirmText: 'Delete',
        cancelText:  'Cancel',
        onConfirm: () => {
            soOrderRows.splice(index, 1);
            if (soOrderRows.length === 0) soOrderRows.push(soEmptyRowData());
            soRebuildTable();
            const lastIndex = soOrderRows.length - 1;
            if (soIsRowValid(lastIndex)) soAddRow();
            soUpdateRowLocks();
            soRecalcSummary();
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
    if (!row || !row.description) return; // nothing confirmed yet — stay hidden

    const isPromo = row.discType === 'promo';

    const detailRow = document.createElement('tr');
    detailRow.classList.add('so-disc-detail-row');
    detailRow.dataset.parent = String(index);

    detailRow.innerHTML = `
        <td colspan="${SO_TABLE_COLS}">
          <div class="so-disc-detail-content">
            <div class="so-disc-desc-block">
              <label>Description:</label>
              <input type="text" readonly value="${soEscapeAttr(row.description)}">
            </div>
            <div class="so-disc-promo-block">
              <label class="${isPromo ? '' : 'so-disc-label-disabled'}">Promo Name:</label>
              <input type="text" id="so-discname-${index}" placeholder="e.g. Back to School Promo"
                oninput="soOnDiscNameChange(${index})" ${isPromo ? '' : 'disabled'}>
            </div>
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

// ── Summary recalc: Gross Total → Discount → Subtotal → Total ──
function soRecalcSummary() {
    const grossTotal = soOrderRows.reduce((sum, r) => sum + ((r.qty || 0) * (r.price || 0)), 0);
    const discount   = soOrderRows.reduce((sum, r) => sum + (r.discVal || 0), 0);
    const subtotal   = Math.max(0, grossTotal - discount);

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('summaryGrossTotal', grossTotal.toFixed(2));
    setVal('summaryDiscount',   discount.toFixed(2));
    setVal('summarySubtotal',   subtotal.toFixed(2));
    setVal('summaryTotal',      subtotal.toFixed(2));

    const deposit  = parseFloat(document.getElementById('summaryDeposit')?.value) || 0;
    const balance  = Math.max(0, subtotal - deposit);
    setVal('summaryBalance', balance.toFixed(2));
}

// ── Save Order ──
function handleSaveOrder() {
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
    const orderId    = _resolveUniqueOrderID();
    const customerId = document.getElementById('customerProfileIdNumber')?.value.trim() || '';
    const deposit    = parseFloat(document.getElementById('summaryDeposit')?.value)     || 0;
    const payMethod  = document.getElementById('paymentMethod')?.value                  || '';

    const grossTotal  = soOrderRows.reduce((sum, r) => sum + ((r.qty || 0) * (r.price || 0)), 0);
    const discount    = soOrderRows.reduce((sum, r) => sum + (r.discVal || 0), 0);
    const subtotal    = Math.max(0, grossTotal - discount);
    const balance     = Math.max(0, subtotal - deposit);

    // Only save rows that have content
    const itemsToSave = soOrderRows
        .filter((r, i) => soIsRowValid(i))
        .map(r => ({
            type:        r.type,
            description: r.description,
            qty:         r.qty,
            price:       r.price,
            discType:    r.discType,
            discPct:     r.discPct,
            discVal:     r.discVal,
            discName:    r.discName,
            total:       r.total,
            itemData:    r.itemData
        }));

    const order = {
        id:          orderId,
        customerId:  customerId,
        dateCreated: dateCreated,
        items:       itemsToSave,
        grossTotal:  +grossTotal.toFixed(2),
        discount:    +discount.toFixed(2),
        subtotal:    +subtotal.toFixed(2),
        total:       +subtotal.toFixed(2),
        deposit:     +deposit.toFixed(2),
        balance:     +balance.toFixed(2),
        paymentMethod: payMethod,
        status:      'pending'
    };

    const orders = JSON.parse(Storage.getItem('salesOrders') || '[]');
    orders.push(order);
    Storage.setItem('salesOrders', JSON.stringify(orders));

    openAlert({
        title: 'Order Saved',
        body:  `Order ${orderId} saved successfully!`,
        onOk:  () => { window.location.hash = '#salesPage'; }
    });
}

// ── Reset order form (called when leaving the page or changing customer) ──
function soResetOrderForm() {
    soInitTable();
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('summaryGrossTotal', '0.00');
    setVal('summaryDiscount',   '0.00');
    setVal('summarySubtotal',   '0.00');
    setVal('summaryTotal',      '0.00');
    setVal('summaryDeposit',    '0');
    setVal('summaryBalance',    '0.00');
    const pmEl = document.getElementById('paymentMethod');
    if (pmEl) pmEl.selectedIndex = 0;
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
    // Wire Save Order button
    document.getElementById('saveOrderBtn')?.addEventListener('click', handleSaveOrder);

    // Wire Deposit field for live balance recalc
    document.getElementById('summaryDeposit')?.addEventListener('input', soRecalcSummary);

    // Wire order date fields to existing blur validators from validation.js
    if (typeof attachDatePartValidators === 'function') attachDatePartValidators('order');

    // Build the initial table
    soInitTable();
}