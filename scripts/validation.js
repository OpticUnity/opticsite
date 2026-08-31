//--------------- Validation & Input Formatting ---------------
// Reusable across New Rx, Edit Rx, View Records edit mode

// ---- Utility ----

// Round to nearest 0.25
function roundToQuarter(value) {
    return Math.round(value * 4) / 4;
}

// Format to signed 2 decimal string e.g +1.50 / -0.75
function formatSigned(value) {
    const rounded = roundToQuarter(value);
    return (rounded >= 0 ? '+' : '') + rounded.toFixed(2);
}

// ---- Live Input Filters (on input event) ----

// SPH / CYL / ADD — allow sign, digits, one dot
function liveFilterSignedDecimal(e) {
    const input = e.target;
    let val = input.value;
    // Allow only: optional leading +/-, digits, one dot
    val = val.replace(/[^\d.\-\+]/g, '');
    // Only one sign at start
    val = val.replace(/(?!^)[\+\-]/g, '');
    // Only one dot
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts[1];
    // Max 2 decimal places
    if (parts[1] && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
    input.value = val;
}

// AXIS — digits only, max 3
function liveFilterAxis(e) {
    const input = e.target;
    input.value = input.value.replace(/[^\d]/g, '').slice(0, 3);
}

// PD — digits and one dot
function liveFilterPd(e) {
    const input = e.target;
    let val = input.value.replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts[1];
    input.value = val;
}

// BC — digits and one dot
function liveFilterBc(e) {
    const input = e.target;
    let val = input.value.replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts[1];
    if (parts[1] && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
    input.value = val;
}

// DIA — digits and one dot, 1 decimal place
function liveFilterDia(e) {
    const input = e.target;
    let val = input.value.replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts[1];
    if (parts[1] && parts[1].length > 1) val = parts[0] + '.' + parts[1].slice(0, 1);
    input.value = val;
}

// Lens Index — digits and one dot, 2 decimal places (same shape as BC)
function liveFilterIndex(e) {
    const input = e.target;
    let val = input.value.replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts[1];
    if (parts[1] && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
    input.value = val;
}

// PRICE — digits and one dot, 2 decimal places. Also strips '+' and scientific-notation
// 'e', both of which native type="number" inputs otherwise accept as valid typed
// characters (e.g. "1e6" parses to 1000000) — same class of gap that motivated this pass.
function liveFilterPrice(e) {
    const input = e.target;
    let val = input.value.replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts[1];
    if (parts[1] && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
    input.value = val;
}

// VA / UVA / PH — auto uppercase
function liveFilterUppercase(e) {
    const input = e.target;
    input.value = input.value.toUpperCase();
}

// ---- Blur Validators (on blur event) ----

// SPH — ±20.00, 0.25 increments, 0.00 valid, blank valid
function blurSph(e) {
    const input = e.target;
    const val = input.value.trim();
    if (val === '' || val === '-' || val === '+' || val === '.' || val === '-.' || val === '+.') {
        input.value = '';
        return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || Math.abs(num) > 20) {
        input.value = '';
        return;
    }
    input.value = formatSigned(num);
}

// CYL — same as SPH but 0.00 = blank
function blurCyl(e) {
    const input = e.target;
    const val = input.value.trim();
    if (val === '' || val === '-' || val === '+' || val === '.' || val === '-.' || val === '+.') {
        input.value = '';
        return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || Math.abs(num) > 20 || num === 0) {
        input.value = '';
        return;
    }
    input.value = formatSigned(num);
}

// ADD — always positive, 0.25 increments, 0.00 = blank, min +0.25
function blurAdd(e) {
    const input = e.target;
    const val = input.value.trim();
    if (val === '' || val === '+' || val === '.') {
        input.value = '';
        return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0 || num > 20) {
        input.value = '';
        return;
    }
    const rounded = roundToQuarter(num);
    input.value = '+' + rounded.toFixed(2);
}

// AXIS — 1-180, integer only
function blurAxis(e) {
    const input = e.target;
    const val = parseInt(input.value.trim(), 10);
    if (isNaN(val) || val < 1 || val > 180) {
        input.value = '';
        return;
    }
    input.value = val.toString();
}

// PD — 1-99, loose
function blurPd(e) {
    const input = e.target;
    const val = parseFloat(input.value.trim());
    if (isNaN(val) || val < 1 || val > 99) {
        input.value = '';
        return;
    }
    input.value = val.toString();
}

// BC and DIA — no blur validator. Removed per Marc's request: the forced toFixed(2)/
// toFixed(1) reformat here was producing "8.20"/"8.0" instead of letting the user's
// plain "8.2" stand, and — unlike every other field type — 'bc'/'dia' were used
// exclusively by frxCl/copyRxCl (New Rx and Edit Rx both route through the same
// attachValidator below). CL Parameters never went through this function at all (see
// its own inline wiring further down), so it never had this problem; frxCl/copyRxCl
// BC/DIA now match that same plain-typing behavior — live filter only, no forced
// reformat. blurBc/blurDia themselves are gone; re-add if a future field genuinely
// wants the old strict "reject out-of-range, force Nd.p." behavior.

// Lens Index — 1.30 to 2.00. Out-of-range rejects to blank (like BC/DIA), not a soft
// clamp like Price — an out-of-range index is more likely a genuine typo than a
// fat-finger extra zero.
function blurIndex(e) {
    const input = e.target;
    const val = parseFloat(input.value.trim());
    if (isNaN(val) || val < 1.30 || val > 2.00) {
        input.value = '';
        return;
    }
    input.value = val.toFixed(2);
}

// PRICE — 0 up to 999,999.99. A fat-finger extra zero gets capped at the ceiling
// rather than wiped — the cashier keeps their typed value, just trimmed to the max,
// instead of having to retype from a blank field.
function blurPrice(e) {
    const input = e.target;
    const val = input.value.trim();
    if (val === '' || val === '.') {
        input.value = '';
        return;
    }
    let num = parseFloat(val);
    if (isNaN(num) || num < 0) {
        input.value = '';
        return;
    }
    if (num > 999999.99) num = 999999.99;
    input.value = num.toFixed(2);
}

// ---- Date Part Blur Validators ----
// Clamp MM, DD, YYYY on blur. Zero-pads MM and DD.
// Leaves empty fields alone — required check handles those at submit.

function blurDateMM(e) {
    const raw = e.target.value.trim();
    if (raw === '') return;
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 1) { e.target.value = '01'; }
    else if (num > 12)         { e.target.value = '12'; }
    else                       { e.target.value = String(num).padStart(2, '0'); }
    e.target.dispatchEvent(new Event('input')); // re-triggers calculateAge
}

function blurDateDD(e) {
    const raw = e.target.value.trim();
    if (raw === '') return;
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 1) { e.target.value = '01'; }
    else if (num > 31)         { e.target.value = '31'; }
    else                       { e.target.value = String(num).padStart(2, '0'); }
    e.target.dispatchEvent(new Event('input')); // re-triggers calculateAge
}

function blurDateYYYY(e) {
    const raw = e.target.value.trim();
    if (raw === '') return;
    const num = parseInt(raw, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(num) || num < 1900) { e.target.value = '1900'; }
    else if (num > currentYear)   { e.target.value = String(currentYear); }
    else                          { e.target.value = String(num); }
    e.target.dispatchEvent(new Event('input')); // re-triggers calculateAge
}

// Wire blur validators to all date parts of a given form prefix.
// Covers both Birthday (MM/DD/YYYY) and DateCreated (MM/DD/YYYY).
// prefix: 'customer' | 'patient'
function attachDatePartValidators(prefix) {
    const birthdayMM   = document.getElementById(`${prefix}BirthdayMM`);
    const birthdayDD   = document.getElementById(`${prefix}BirthdayDD`);
    const birthdayYYYY = document.getElementById(`${prefix}BirthdayYYYY`);
    const createdMM    = document.getElementById(`${prefix}DateCreatedMM`);
    const createdDD    = document.getElementById(`${prefix}DateCreatedDD`);
    const createdYYYY  = document.getElementById(`${prefix}DateCreatedYYYY`);

    if (birthdayMM)   birthdayMM.addEventListener('blur',   blurDateMM);
    if (birthdayDD)   birthdayDD.addEventListener('blur',   blurDateDD);
    if (birthdayYYYY) birthdayYYYY.addEventListener('blur', blurDateYYYY);
    if (createdMM)    createdMM.addEventListener('blur',    blurDateMM);
    if (createdDD)    createdDD.addEventListener('blur',    blurDateDD);
    if (createdYYYY)  createdYYYY.addEventListener('blur',  blurDateYYYY);
}

// ---- CYL → AXIS Dependency Check ----
// Call on blur of any CYL field to check if paired AXIS is required
function checkAxisRequired(cylInputId, axisInputId) {
    const cylInput = document.getElementById(cylInputId);
    const axisInput = document.getElementById(axisInputId);
    if (!cylInput || !axisInput) return;

    if (cylInput.value.trim() !== '') {
        // CYL has value — AXIS is required, highlight if empty
        if (axisInput.value.trim() === '') {
            axisInput.classList.add('input-error');
        } else {
            axisInput.classList.remove('input-error');
        }
    } else {
        // CYL is empty — AXIS not required, clear any error
        axisInput.classList.remove('input-error');
        axisInput.value = '';
    }
}

// ---- Attach Validators to a Set of Fields ----
// Pass an array of field config objects to wire up live + blur validation
// fieldType: 'sph' | 'cyl' | 'add' | 'axis' | 'pd' | 'bc' | 'dia' | 'va' | 'price' | 'index'
// pairedAxisId: only needed for cyl fields

function attachValidator(inputId, fieldType, pairedAxisId = null) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Live filter
    switch (fieldType) {
        case 'sph':
        case 'cyl':
        case 'add':
            input.addEventListener('input', liveFilterSignedDecimal);
            break;
        case 'axis':
            input.addEventListener('input', liveFilterAxis);
            break;
        case 'pd':
            input.addEventListener('input', liveFilterPd);
            break;
        case 'bc':
            input.addEventListener('input', liveFilterBc);
            break;
        case 'dia':
            input.addEventListener('input', liveFilterDia);
            break;
        case 'index':
            input.addEventListener('input', liveFilterIndex);
            break;
        case 'price':
            input.addEventListener('input', liveFilterPrice);
            break;
        case 'va':
            input.addEventListener('input', liveFilterUppercase);
            break;
    }

    // Blur validator
    switch (fieldType) {
        case 'sph': input.addEventListener('blur', blurSph); break;
        case 'cyl':
            input.addEventListener('blur', blurCyl);

            break;
        case 'add': input.addEventListener('blur', blurAdd); break;
        case 'axis': input.addEventListener('blur', blurAxis); break;
        case 'pd': input.addEventListener('blur', blurPd); break;
        case 'index': input.addEventListener('blur', blurIndex); break;
        case 'price': input.addEventListener('blur', blurPrice); break;
        case 'va': break;
    }
}

// ---- Master Setup ----
// Call this once on load to wire up all prescription input fields

function initValidation() {

    // -- UVA and PH  --
    attachValidator('uvaOdDist', 'va');
    attachValidator('uvaOdNear', 'va');
    attachValidator('uvaOsDist', 'va');
    attachValidator('uvaOsNear', 'va');
    attachValidator('uvaOuDist', 'va');
    attachValidator('uvaOuNear', 'va');
    attachValidator('phOd', 'va');
    attachValidator('phOs', 'va');

    // -- VT7 OD --
    attachValidator('vt7OdDistanceSph', 'sph');
    attachValidator('vt7OdDistanceCyl', 'cyl', 'vt7OdDistanceAxis');
    attachValidator('vt7OdDistanceAxis', 'axis');
    attachValidator('vt7OdDistancePd', 'pd');
    attachValidator('vt7OdNearSph', 'sph');
    attachValidator('vt7OdNearCyl', 'cyl', 'vt7OdNearAxis');
    attachValidator('vt7OdNearAxis', 'axis');
    attachValidator('vt7OdNearPd', 'pd');
    attachValidator('vt7OdAddSph', 'add');

    // -- VT7 OS --
    attachValidator('vt7OsDistanceSph', 'sph');
    attachValidator('vt7OsDistanceCyl', 'cyl', 'vt7OsDistanceAxis');
    attachValidator('vt7OsDistanceAxis', 'axis');
    attachValidator('vt7OsDistancePd', 'pd');
    attachValidator('vt7OsNearSph', 'sph');
    attachValidator('vt7OsNearCyl', 'cyl', 'vt7OsNearAxis');
    attachValidator('vt7OsNearAxis', 'axis');
    attachValidator('vt7OsNearPd', 'pd');
    attachValidator('vt7OsAddSph', 'add');

    // -- Final Rx OD --
    attachValidator('frxOdDistanceSph', 'sph');
    attachValidator('frxOdDistanceCyl', 'cyl', 'frxOdDistanceAxis');
    attachValidator('frxOdDistanceAxis', 'axis');
    attachValidator('frxOdDistancePd', 'pd');
    attachValidator('frxOdDistanceVa', 'va');
    attachValidator('frxOdNearSph', 'sph');
    attachValidator('frxOdNearCyl', 'cyl', 'frxOdNearAxis');
    attachValidator('frxOdNearAxis', 'axis');
    attachValidator('frxOdNearPd', 'pd');
    attachValidator('frxOdNearVa', 'va');
    attachValidator('frxOdAddSph', 'add');

    // -- Final Rx OS --
    attachValidator('frxOsDistanceSph', 'sph');
    attachValidator('frxOsDistanceCyl', 'cyl', 'frxOsDistanceAxis');
    attachValidator('frxOsDistanceAxis', 'axis');
    attachValidator('frxOsDistancePd', 'pd');
    attachValidator('frxOsDistanceVa', 'va');
    attachValidator('frxOsNearSph', 'sph');
    attachValidator('frxOsNearCyl', 'cyl', 'frxOsNearAxis');
    attachValidator('frxOsNearAxis', 'axis');
    attachValidator('frxOsNearPd', 'pd');
    attachValidator('frxOsNearVa', 'va');
    attachValidator('frxOsAddSph', 'add');

    // -- HRx OD --
    attachValidator('hrxOdDistanceSph', 'sph');
    attachValidator('hrxOdDistanceCyl', 'cyl', 'hrxOdDistanceAxis');
    attachValidator('hrxOdDistanceAxis', 'axis');
    attachValidator('hrxOdDistancePd', 'pd');
    attachValidator('hrxOdDistanceVa', 'va');
    attachValidator('hrxOdNearSph', 'sph');
    attachValidator('hrxOdNearCyl', 'cyl', 'hrxOdNearAxis');
    attachValidator('hrxOdNearAxis', 'axis');
    attachValidator('hrxOdNearPd', 'pd');
    attachValidator('hrxOdNearVa', 'va');
    attachValidator('hrxOdAddSph', 'add');

    // -- HRx OS --
    attachValidator('hrxOsDistanceSph', 'sph');
    attachValidator('hrxOsDistanceCyl', 'cyl', 'hrxOsDistanceAxis');
    attachValidator('hrxOsDistanceAxis', 'axis');
    attachValidator('hrxOsDistancePd', 'pd');
    attachValidator('hrxOsDistanceVa', 'va');
    attachValidator('hrxOsNearSph', 'sph');
    attachValidator('hrxOsNearCyl', 'cyl', 'hrxOsNearAxis');
    attachValidator('hrxOsNearAxis', 'axis');
    attachValidator('hrxOsNearPd', 'pd');
    attachValidator('hrxOsNearVa', 'va');
    attachValidator('hrxOsAddSph', 'add');

    // -- AR OD --
    attachValidator('arOdSph', 'sph');
    attachValidator('arOdCyl', 'cyl', 'arOdAxis');
    attachValidator('arOdAxis', 'axis');

    // -- AR OS --
    attachValidator('arOsSph', 'sph');
    attachValidator('arOsCyl', 'cyl', 'arOsAxis');
    attachValidator('arOsAxis', 'axis');

    // -- AR KR (decimal only) --
    ['arOdKr', 'arOsKr'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', liveFilterBc);
    });

    // -- CL Parameters (BC, HVID, DIA — decimal only) --
    ['clpOdBc', 'clpOdHvid', 'clpOdDia', 'clpOsBc', 'clpOsHvid', 'clpOsDia'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', liveFilterBc);
    });

    // -- Copy Rx OD --
    attachValidator('copyRxOdDistanceSph', 'sph');
    attachValidator('copyRxOdDistanceCyl', 'cyl', 'copyRxOdDistanceAxis');
    attachValidator('copyRxOdDistanceAxis', 'axis');
    attachValidator('copyRxOdDistancePd', 'pd');
    attachValidator('copyRxOdDistanceVa', 'va');
    attachValidator('copyRxOdNearSph', 'sph');
    attachValidator('copyRxOdNearCyl', 'cyl', 'copyRxOdNearAxis');
    attachValidator('copyRxOdNearAxis', 'axis');
    attachValidator('copyRxOdNearPd', 'pd');
    attachValidator('copyRxOdNearVa', 'va');
    attachValidator('copyRxOdAddSph', 'add');

    // -- Copy Rx OS --
    attachValidator('copyRxOsDistanceSph', 'sph');
    attachValidator('copyRxOsDistanceCyl', 'cyl', 'copyRxOsDistanceAxis');
    attachValidator('copyRxOsDistanceAxis', 'axis');
    attachValidator('copyRxOsDistancePd', 'pd');
    attachValidator('copyRxOsDistanceVa', 'va');
    attachValidator('copyRxOsNearSph', 'sph');
    attachValidator('copyRxOsNearCyl', 'cyl', 'copyRxOsNearAxis');
    attachValidator('copyRxOsNearAxis', 'axis');
    attachValidator('copyRxOsNearPd', 'pd');
    attachValidator('copyRxOsNearVa', 'va');
    attachValidator('copyRxOsAddSph', 'add');

    // -- Copy Rx CL OD --
    attachValidator('copyRxClOdSph', 'sph');
    attachValidator('copyRxClOdCyl', 'cyl', 'copyRxClOdAxis');
    attachValidator('copyRxClOdAxis', 'axis');
    attachValidator('copyRxClOdBc', 'bc');
    attachValidator('copyRxClOdDia', 'dia');
    attachValidator('copyRxClOdVa', 'va');

    // -- Copy Rx CL OS --
    attachValidator('copyRxClOsSph', 'sph');
    attachValidator('copyRxClOsCyl', 'cyl', 'copyRxClOsAxis');
    attachValidator('copyRxClOsAxis', 'axis');
    attachValidator('copyRxClOsBc', 'bc');
    attachValidator('copyRxClOsDia', 'dia');
    attachValidator('copyRxClOsVa', 'va');

    // -- Final Rx CL OD --
    attachValidator('frxClOdSph', 'sph');
    attachValidator('frxClOdCyl', 'cyl', 'frxClOdAxis');
    attachValidator('frxClOdAxis', 'axis');
    attachValidator('frxClOdBc', 'bc');
    attachValidator('frxClOdDia', 'dia');
    attachValidator('frxClOdVa', 'va');

    // -- Final Rx CL OS --
    attachValidator('frxClOsSph', 'sph');
    attachValidator('frxClOsCyl', 'cyl', 'frxClOsAxis');
    attachValidator('frxClOsAxis', 'axis');
    attachValidator('frxClOsBc', 'bc');
    attachValidator('frxClOsDia', 'dia');
    attachValidator('frxClOsVa', 'va');

    // -- Date Part Validators (Birthday + DateCreated) --
    attachDatePartValidators('customer');
    attachDatePartValidators('patient');
    attachDatePartValidators('prescription');

    // -- Sales Order Form — CL Grade (manual-entry scenario) --
    // clOdSph/clOdBc/clOdDia etc. also serve the Rx-pulled path, but those stay
    // readonly-locked (soFillAndLockRxFields) so live/blur listeners just sit inert
    // there — this is what actually activates once "Enter Manually" unlocks them.
    // CYL/AXIS intentionally NOT wired: manual CL entry is sphere-only by design,
    // those fields are hidden and cleared in that mode (soSetClFieldMode).
    attachValidator('clOdSph', 'sph');
    attachValidator('clOdBc',  'bc');
    attachValidator('clOdDia', 'dia');
    attachValidator('clOsSph', 'sph');
    attachValidator('clOsBc',  'bc');
    attachValidator('clOsDia', 'dia');

    // -- Sales Order Form — Price (all five item types) --
    attachValidator('lensPrice',    'price');
    attachValidator('framePrice',   'price');
    attachValidator('clPrice',      'price');
    attachValidator('servicePrice', 'price');
    attachValidator('itemPrice',    'price');

    // -- Sales Order Form — Lens Index --
    attachValidator('lensIndex', 'index');

    // -- Sales Order Form — CL Add (Multifocal/Others) — uses 'va', not 'add': some labs
    // specify multifocal add power as LO/MED/HI rather than a numeric value, so it needs
    // to accept letters (force-uppercased, no restriction), same as VA fields elsewhere.
    // The Confirm-time "required for Multifocal" check (order-form-logic.js) just checks
    // for non-blank, so it works the same regardless of whether the value is numeric or text.
    attachValidator('clOdAdd', 'va');
    attachValidator('clOsAdd', 'va');

    // -- Sales Order Form — Payment Amount (reuses 'price': same peso-value shape and
    // sanity ceiling as item Price; layers under the existing non-cash remaining-balance
    // clamp in soConfirmPaymentModal, doesn't replace it) --
    attachValidator('paymentModalAmount', 'price');
}

// initValidation is called from main.js after mountForms()
// so all DOM elements exist before listeners are attached.

// ---- Near SPH ↔ ADD Bidirectional Sync ----
// ADD → Near SPH: distSph + add = nearSph
// Near SPH → ADD: nearSph - distSph = add
// CYL and AXIS are readonly on near — copied from dist when ADD is valid, cleared when ADD is blank

// -- Core compute --

function computeNearFromAdd(distSphId, addId, nearSphId, nearCylId, nearAxisId, distCylId, distAxisId, distPdId = null, nearPdId = null) {
    const distSph = parseFloat(document.getElementById(distSphId)?.value);
    const add     = parseFloat(document.getElementById(addId)?.value);

    const nearSphEl  = document.getElementById(nearSphId);
    const nearCylEl  = document.getElementById(nearCylId);
    const nearAxisEl = document.getElementById(nearAxisId);
    const nearPdEl   = (distPdId && nearPdId) ? document.getElementById(nearPdId) : null;
    if (!nearSphEl || !nearCylEl || !nearAxisEl) return;

    if (isNaN(add) || add <= 0) {
        // ADD cleared or invalid — wipe near fields, PD included (no near correction
        // in use means no near PD needed either — same reasoning as the distance-only
        // case).
        nearSphEl.value  = '';
        nearCylEl.value  = '';
        nearAxisEl.value = '';
        if (nearPdEl) nearPdEl.value = '';
        return;
    }

    if (isNaN(distSph)) {
        // No dist SPH yet — can't compute, leave near alone
        return;
    }

    const nearSph = roundToQuarter(distSph + add);
    nearSphEl.value = formatSigned(nearSph);

    // Copy CYL + AXIS from dist if present
    const distCyl  = document.getElementById(distCylId)?.value.trim()  || '';
    const distAxis = document.getElementById(distAxisId)?.value.trim() || '';
    nearCylEl.value  = distCyl;
    nearAxisEl.value = distAxis;

    // -- PD: dist PD - 1, same mirror-or-blank pattern as CYL/AXIS above — no dist PD
    // means no near PD, not a placeholder value. --
    if (nearPdEl) {
        const distPd = parseFloat(document.getElementById(distPdId)?.value);
        nearPdEl.value = (!isNaN(distPd) && distPd >= 1) ? (distPd - 1).toString() : '';
    }
}

function computeAddFromNear(distSphId, nearSphId, addId, distCylId, distAxisId, nearCylId, nearAxisId, distPdId = null, nearPdId = null) {
    const distSph = parseFloat(document.getElementById(distSphId)?.value);
    const nearSph = parseFloat(document.getElementById(nearSphId)?.value);
    const addEl   = document.getElementById(addId);
    const nearPdEl = (distPdId && nearPdId) ? document.getElementById(nearPdId) : null;
    if (!addEl) return;

    if (isNaN(distSph) || isNaN(nearSph)) {
        addEl.value = '';
        if (nearPdEl) nearPdEl.value = '';
        return;
    }

    const add = roundToQuarter(nearSph - distSph);
    if (add <= 0) {
        addEl.value = '';
        if (nearPdEl) nearPdEl.value = '';
        return;
    }
    addEl.value = '+' + add.toFixed(2);

    // Copy dist CYL + AXIS into near — covers lensometry workflow where
    // nearSph is written before ADD is filled in.
    if (distCylId && distAxisId && nearCylId && nearAxisId) {
        const nearCylEl  = document.getElementById(nearCylId);
        const nearAxisEl = document.getElementById(nearAxisId);
        if (nearCylEl)  nearCylEl.value  = document.getElementById(distCylId)?.value.trim()  || '';
        if (nearAxisEl) nearAxisEl.value = document.getElementById(distAxisId)?.value.trim() || '';
    }

    // -- PD: same mirror-or-blank pattern as CYL/AXIS --
    if (nearPdEl) {
        const distPd = parseFloat(document.getElementById(distPdId)?.value);
        nearPdEl.value = (!isNaN(distPd) && distPd >= 1) ? (distPd - 1).toString() : '';
    }
}

// -- Wire up one eye's near↔add sync --
// Needs: distSph, distCyl, distAxis, nearSph, nearCyl (readonly), nearAxis (readonly), add,
// and now distPd/nearPd — folded in here rather than kept as the separate
// attachNearPdSync system, so PD Near participates in the same ADD/Near-driven autofill
// as CYL/AXIS: printing an ADD (or writing Near SPH straight off a lensometer) now also
// fills PD Near, not just SPH/CYL/AXIS.

function attachNearAddSync(ids, flag) {
    // flag: { od: bool } or { os: bool } — passed by reference as object so mutation works
    const {
        distSphId, distCylId, distAxisId,
        nearSphId, nearCylId, nearAxisId,
        addId, distPdId = null, nearPdId = null
    } = ids;

    const addEl     = document.getElementById(addId);
    const nearSphEl = document.getElementById(nearSphId);
    if (!addEl || !nearSphEl) return;

    // ADD blur → recompute Near SPH + copy CYL/AXIS + PD
    addEl.addEventListener('blur', () => {
        if (flag.syncing) return;
        flag.syncing = true;
        computeNearFromAdd(distSphId, addId, nearSphId, nearCylId, nearAxisId, distCylId, distAxisId, distPdId, nearPdId);
        flag.syncing = false;
    });

    // Dist SPH blur → recompute Near SPH (+CYL/AXIS/PD) if ADD already has a value
    document.getElementById(distSphId)?.addEventListener('blur', () => {
        if (flag.syncing) return;
        const addVal = document.getElementById(addId)?.value.trim();
        if (!addVal) return;
        flag.syncing = true;
        computeNearFromAdd(distSphId, addId, nearSphId, nearCylId, nearAxisId, distCylId, distAxisId, distPdId, nearPdId);
        flag.syncing = false;
    });

    // Dist CYL/AXIS/PD blur → refresh near CYL/AXIS/PD copy if ADD is present
    [distCylId, distAxisId, distPdId].forEach(srcId => {
        if (!srcId) return;
        document.getElementById(srcId)?.addEventListener('blur', () => {
            if (flag.syncing) return;
            const addVal = document.getElementById(addId)?.value.trim();
            if (!addVal) return;
            flag.syncing = true;
            computeNearFromAdd(distSphId, addId, nearSphId, nearCylId, nearAxisId, distCylId, distAxisId, distPdId, nearPdId);
            flag.syncing = false;
        });
    });

    // Near SPH blur → recompute ADD + copy dist CYL/AXIS/PD into near
    nearSphEl.addEventListener('blur', () => {
        if (flag.syncing) return;
        flag.syncing = true;
        computeAddFromNear(distSphId, nearSphId, addId, distCylId, distAxisId, nearCylId, nearAxisId, distPdId, nearPdId);
        flag.syncing = false;
    });
}

// -- Init all form sections --

function initNearAddSync() {

    // -- VT7 OD --
    attachNearAddSync({
        distSphId: 'vt7OdDistanceSph', distCylId: 'vt7OdDistanceCyl', distAxisId: 'vt7OdDistanceAxis',
        nearSphId: 'vt7OdNearSph',     nearCylId: 'vt7OdNearCyl',     nearAxisId: 'vt7OdNearAxis',
        addId:     'vt7OdAddSph',      distPdId:  'vt7OdDistancePd',  nearPdId:   'vt7OdNearPd'
    }, { syncing: false });

    // -- VT7 OS --
    attachNearAddSync({
        distSphId: 'vt7OsDistanceSph', distCylId: 'vt7OsDistanceCyl', distAxisId: 'vt7OsDistanceAxis',
        nearSphId: 'vt7OsNearSph',     nearCylId: 'vt7OsNearCyl',     nearAxisId: 'vt7OsNearAxis',
        addId:     'vt7OsAddSph',      distPdId:  'vt7OsDistancePd',  nearPdId:   'vt7OsNearPd'
    }, { syncing: false });

    // -- Final Rx OD --
    attachNearAddSync({
        distSphId: 'frxOdDistanceSph', distCylId: 'frxOdDistanceCyl', distAxisId: 'frxOdDistanceAxis',
        nearSphId: 'frxOdNearSph',     nearCylId: 'frxOdNearCyl',     nearAxisId: 'frxOdNearAxis',
        addId:     'frxOdAddSph',      distPdId:  'frxOdDistancePd',  nearPdId:   'frxOdNearPd'
    }, { syncing: false });

    // -- Final Rx OS --
    attachNearAddSync({
        distSphId: 'frxOsDistanceSph', distCylId: 'frxOsDistanceCyl', distAxisId: 'frxOsDistanceAxis',
        nearSphId: 'frxOsNearSph',     nearCylId: 'frxOsNearCyl',     nearAxisId: 'frxOsNearAxis',
        addId:     'frxOsAddSph',      distPdId:  'frxOsDistancePd',  nearPdId:   'frxOsNearPd'
    }, { syncing: false });

    // -- HRx OD --
    attachNearAddSync({
        distSphId: 'hrxOdDistanceSph', distCylId: 'hrxOdDistanceCyl', distAxisId: 'hrxOdDistanceAxis',
        nearSphId: 'hrxOdNearSph',     nearCylId: 'hrxOdNearCyl',     nearAxisId: 'hrxOdNearAxis',
        addId:     'hrxOdAddSph',      distPdId:  'hrxOdDistancePd',  nearPdId:   'hrxOdNearPd'
    }, { syncing: false });

    // -- HRx OS --
    attachNearAddSync({
        distSphId: 'hrxOsDistanceSph', distCylId: 'hrxOsDistanceCyl', distAxisId: 'hrxOsDistanceAxis',
        nearSphId: 'hrxOsNearSph',     nearCylId: 'hrxOsNearCyl',     nearAxisId: 'hrxOsNearAxis',
        addId:     'hrxOsAddSph',      distPdId:  'hrxOsDistancePd',  nearPdId:   'hrxOsNearPd'
    }, { syncing: false });

    // -- Copy Rx OD --
    attachNearAddSync({
        distSphId: 'copyRxOdDistanceSph', distCylId: 'copyRxOdDistanceCyl', distAxisId: 'copyRxOdDistanceAxis',
        nearSphId: 'copyRxOdNearSph',     nearCylId: 'copyRxOdNearCyl',     nearAxisId: 'copyRxOdNearAxis',
        addId:     'copyRxOdAddSph',      distPdId:  'copyRxOdDistancePd',  nearPdId:   'copyRxOdNearPd'
    }, { syncing: false });

    // -- Copy Rx OS --
    attachNearAddSync({
        distSphId: 'copyRxOsDistanceSph', distCylId: 'copyRxOsDistanceCyl', distAxisId: 'copyRxOsDistanceAxis',
        nearSphId: 'copyRxOsNearSph',     nearCylId: 'copyRxOsNearCyl',     nearAxisId: 'copyRxOsNearAxis',
        addId:     'copyRxOsAddSph',      distPdId:  'copyRxOsDistancePd',  nearPdId:   'copyRxOsNearPd'
    }, { syncing: false });
}

// initNearAddSync is called from main.js after mountForms().
//
// PD Near is now handled entirely inside attachNearAddSync/computeNearFromAdd/
// computeAddFromNear above (folded in per Marc's request), so the standalone
// attachNearPdSync/initNearPdSync system that only fired off Dist PD's own blur has
// been retired — it's fully superseded, not run alongside it.

// Force uppercase value on all .uppercase inputs
document.addEventListener('input', (e) => {
    if (e.target.classList.contains('uppercase')) {
        const pos = e.target.selectionStart;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(pos, pos);
    }
});

// Force digits only on .digits-only inputs
document.addEventListener('input', (e) => {
    if (e.target.classList.contains('digits-only')) {
        e.target.value = e.target.value.replace(/\D/g, '');
    }
});