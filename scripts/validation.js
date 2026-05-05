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
        case 'bc': input.addEventListener('blur', blurBc); break;
        case 'dia': input.addEventListener('blur', blurDia); break;
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

// ---- Near SPH ↔ ADD Bidirectional Sync ----
// ADD → Near SPH: distSph + add = nearSph
// Near SPH → ADD: nearSph - distSph = add
// CYL and AXIS are readonly on near — copied from dist when ADD is valid, cleared when ADD is blank

// -- Core compute --

function computeNearFromAdd(distSphId, addId, nearSphId, nearCylId, nearAxisId, distCylId, distAxisId) {
    const distSph = parseFloat(document.getElementById(distSphId)?.value);
    const add     = parseFloat(document.getElementById(addId)?.value);

    const nearSphEl  = document.getElementById(nearSphId);
    const nearCylEl  = document.getElementById(nearCylId);
    const nearAxisEl = document.getElementById(nearAxisId);
    if (!nearSphEl || !nearCylEl || !nearAxisEl) return;

    if (isNaN(add) || add <= 0) {
        // ADD cleared or invalid — wipe near fields
        nearSphEl.value  = '';
        nearCylEl.value  = '';
        nearAxisEl.value = '';
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
}

function computeAddFromNear(distSphId, nearSphId, addId) {
    const distSph = parseFloat(document.getElementById(distSphId)?.value);
    const nearSph = parseFloat(document.getElementById(nearSphId)?.value);
    const addEl   = document.getElementById(addId);
    if (!addEl) return;

    if (isNaN(distSph) || isNaN(nearSph)) {
        addEl.value = '';
        return;
    }

    const add = roundToQuarter(nearSph - distSph);
    if (add <= 0) {
        addEl.value = '';
        return;
    }
    addEl.value = '+' + add.toFixed(2);
}

// -- Wire up one eye's near↔add sync --
// Needs: distSph, distCyl, distAxis, nearSph, nearCyl (readonly), nearAxis (readonly), add

function attachNearAddSync(ids, flag) {
    // flag: { od: bool } or { os: bool } — passed by reference as object so mutation works
    const {
        distSphId, distCylId, distAxisId,
        nearSphId, nearCylId, nearAxisId,
        addId
    } = ids;

    const addEl     = document.getElementById(addId);
    const nearSphEl = document.getElementById(nearSphId);
    if (!addEl || !nearSphEl) return;

    // ADD blur → recompute Near SPH + copy CYL/AXIS
    addEl.addEventListener('blur', () => {
        if (flag.syncing) return;
        flag.syncing = true;
        computeNearFromAdd(distSphId, addId, nearSphId, nearCylId, nearAxisId, distCylId, distAxisId);
        flag.syncing = false;
    });

    // Dist SPH blur → recompute Near SPH if ADD already has a value
    document.getElementById(distSphId)?.addEventListener('blur', () => {
        if (flag.syncing) return;
        const addVal = document.getElementById(addId)?.value.trim();
        if (!addVal) return;
        flag.syncing = true;
        computeNearFromAdd(distSphId, addId, nearSphId, nearCylId, nearAxisId, distCylId, distAxisId);
        flag.syncing = false;
    });

    // Dist CYL/AXIS blur → refresh near CYL/AXIS copy if ADD is present
    [distCylId, distAxisId].forEach(srcId => {
        document.getElementById(srcId)?.addEventListener('blur', () => {
            if (flag.syncing) return;
            const addVal = document.getElementById(addId)?.value.trim();
            if (!addVal) return;
            flag.syncing = true;
            computeNearFromAdd(distSphId, addId, nearSphId, nearCylId, nearAxisId, distCylId, distAxisId);
            flag.syncing = false;
        });
    });

    // Near SPH blur → recompute ADD
    nearSphEl.addEventListener('blur', () => {
        if (flag.syncing) return;
        flag.syncing = true;
        computeAddFromNear(distSphId, nearSphId, addId);
        flag.syncing = false;
    });
}

// -- Init all form sections --

function initNearAddSync() {

    // -- VT7 OD --
    attachNearAddSync({
        distSphId: 'vt7OdDistanceSph', distCylId: 'vt7OdDistanceCyl', distAxisId: 'vt7OdDistanceAxis',
        nearSphId: 'vt7OdNearSph',     nearCylId: 'vt7OdNearCyl',     nearAxisId: 'vt7OdNearAxis',
        addId:     'vt7OdAddSph'
    }, { syncing: false });

    // -- VT7 OS --
    attachNearAddSync({
        distSphId: 'vt7OsDistanceSph', distCylId: 'vt7OsDistanceCyl', distAxisId: 'vt7OsDistanceAxis',
        nearSphId: 'vt7OsNearSph',     nearCylId: 'vt7OsNearCyl',     nearAxisId: 'vt7OsNearAxis',
        addId:     'vt7OsAddSph'
    }, { syncing: false });

    // -- Final Rx OD --
    attachNearAddSync({
        distSphId: 'frxOdDistanceSph', distCylId: 'frxOdDistanceCyl', distAxisId: 'frxOdDistanceAxis',
        nearSphId: 'frxOdNearSph',     nearCylId: 'frxOdNearCyl',     nearAxisId: 'frxOdNearAxis',
        addId:     'frxOdAddSph'
    }, { syncing: false });

    // -- Final Rx OS --
    attachNearAddSync({
        distSphId: 'frxOsDistanceSph', distCylId: 'frxOsDistanceCyl', distAxisId: 'frxOsDistanceAxis',
        nearSphId: 'frxOsNearSph',     nearCylId: 'frxOsNearCyl',     nearAxisId: 'frxOsNearAxis',
        addId:     'frxOsAddSph'
    }, { syncing: false });

    // -- HRx OD --
    attachNearAddSync({
        distSphId: 'hrxOdDistanceSph', distCylId: 'hrxOdDistanceCyl', distAxisId: 'hrxOdDistanceAxis',
        nearSphId: 'hrxOdNearSph',     nearCylId: 'hrxOdNearCyl',     nearAxisId: 'hrxOdNearAxis',
        addId:     'hrxOdAddSph'
    }, { syncing: false });

    // -- HRx OS --
    attachNearAddSync({
        distSphId: 'hrxOsDistanceSph', distCylId: 'hrxOsDistanceCyl', distAxisId: 'hrxOsDistanceAxis',
        nearSphId: 'hrxOsNearSph',     nearCylId: 'hrxOsNearCyl',     nearAxisId: 'hrxOsNearAxis',
        addId:     'hrxOsAddSph'
    }, { syncing: false });

    // -- Copy Rx OD --
    attachNearAddSync({
        distSphId: 'copyRxOdDistanceSph', distCylId: 'copyRxOdDistanceCyl', distAxisId: 'copyRxOdDistanceAxis',
        nearSphId: 'copyRxOdNearSph',     nearCylId: 'copyRxOdNearCyl',     nearAxisId: 'copyRxOdNearAxis',
        addId:     'copyRxOdAddSph'
    }, { syncing: false });

    // -- Copy Rx OS --
    attachNearAddSync({
        distSphId: 'copyRxOsDistanceSph', distCylId: 'copyRxOsDistanceCyl', distAxisId: 'copyRxOsDistanceAxis',
        nearSphId: 'copyRxOsNearSph',     nearCylId: 'copyRxOsNearCyl',     nearAxisId: 'copyRxOsNearAxis',
        addId:     'copyRxOsAddSph'
    }, { syncing: false });
}

window.addEventListener('load', initNearAddSync);

// ---- Near PD Auto-fill (distPd - 1) ----
// On blur of dist PD, compute near PD = dist PD - 1

function attachNearPdSync(distPdId, nearPdId) {
    const distEl = document.getElementById(distPdId);
    const nearEl = document.getElementById(nearPdId);
    if (!distEl || !nearEl) return;

    distEl.addEventListener('blur', () => {
        const val = parseFloat(distEl.value.trim());
        if (isNaN(val) || val < 1) {
            nearEl.value = '';
            return;
        }
        const nearVal = val - 1;
        nearEl.value = nearVal.toString();
    });
}

function initNearPdSync() {
    // -- VT7 --
    attachNearPdSync('vt7OdDistancePd', 'vt7OdNearPd');
    attachNearPdSync('vt7OsDistancePd', 'vt7OsNearPd');

    // -- Final Rx --
    attachNearPdSync('frxOdDistancePd', 'frxOdNearPd');
    attachNearPdSync('frxOsDistancePd', 'frxOsNearPd');

    // -- HRx --
    attachNearPdSync('hrxOdDistancePd', 'hrxOdNearPd');
    attachNearPdSync('hrxOsDistancePd', 'hrxOsNearPd');

    // -- Copy Rx --
    attachNearPdSync('copyRxOdDistancePd', 'copyRxOdNearPd');
    attachNearPdSync('copyRxOsDistancePd', 'copyRxOsNearPd');
}

window.addEventListener('load', initNearPdSync);