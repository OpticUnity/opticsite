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

// BC — 1.00-15.00, 2 decimal places
function blurBc(e) {
    const input = e.target;
    const val = parseFloat(input.value.trim());
    if (isNaN(val) || val < 1 || val > 15) {
        input.value = '';
        return;
    }
    input.value = val.toFixed(2);
}

// DIA — loose, 1 decimal place
function blurDia(e) {
    const input = e.target;
    const val = parseFloat(input.value.trim());
    if (isNaN(val) || val <= 0) {
        input.value = '';
        return;
    }
    input.value = val.toFixed(1);
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
// fieldType: 'sph' | 'cyl' | 'add' | 'axis' | 'pd' | 'bc' | 'dia' | 'va'
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
        case 'va':
            break; // free text, no live filter
    }

    // Blur validator
    switch (fieldType) {
        case 'sph': input.addEventListener('blur', blurSph); break;
        case 'cyl':
            input.addEventListener('blur', blurCyl);
            if (pairedAxisId) {
                input.addEventListener('blur', () => checkAxisRequired(inputId, pairedAxisId));
            }
            break;
        case 'add': input.addEventListener('blur', blurAdd); break;
        case 'axis': input.addEventListener('blur', blurAxis); break;
        case 'pd': input.addEventListener('blur', blurPd); break;
        case 'bc': input.addEventListener('blur', blurBc); break;
        case 'dia': input.addEventListener('blur', blurDia); break;
        case 'va': break;
    }
}

// ---- Master Setup ----
// Call this once on load to wire up all prescription input fields

function initValidation() {

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
}

window.addEventListener('load', initValidation);