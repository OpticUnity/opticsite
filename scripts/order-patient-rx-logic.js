// ================================================================
//  order-patient-rx-logic.js — OpticUnity
//  Patient Link + Rx wizard for Lens/CL order rows: the Name+Birthday
//  matching engine, the Select Patient / Select Prescription sub-modals,
//  and filling+locking the grade fields from a pulled prescription.
//
//  Split out of order-form-logic.js — see that file's header for the
//  full split rationale. Shares global scope with it; confirmModal()
//  (in the core file) calls into _soPendingLinkedPatient/_soPendingLinkedRx
//  here directly as part of validating/saving a Lens or CL row.
// ================================================================

// Patient-link sub-modal state (Lens/CL only). _soPendingLinkedPatient is draft state —
// it isn't written to soOrderRows[index] until the calling item modal's own Confirm is
// clicked, same treatment as every other field in these modals.
let _soPendingLinkedPatient = null; // { id, name, birthday } | null

let _soPatientLinkForType   = null; // 'lens' | 'cl' — which modal to return to on close

// Rx-link state (Lens/CL only). Same draft-until-Confirm treatment as the patient link.
// manual:true (CL only) means the grade fields are user-typed, not pulled from a record —
// they stay editable. Any other shape means the fields were pulled from a prescription
// and are locked (per Marc: "users were given a chance to finalize the Rx during the
// eye exam panel" — the order form is not the place to second-guess it).
let _soPendingLinkedRx = null; // { id, dateCreated, manual:false, data:{...} } | { manual:true } | null

let _soRxPickerForType = null; // 'lens' | 'cl' — which modal to return to on close

// ── Normalize helpers — exact-after-normalization only, no fuzzy/typo matching.
// This feeds a vision-correction record, so a wrong guess is worse than no guess. ──
function soNormalizeName(s) {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function soNormalizePhone(s) {
    return (s || '').replace(/\D/g, '');
}

// ── Compute candidate patients for the CURRENT order's customer, tiered:
//   - Name is the required anchor — nothing is suggested without it matching.
//   - Birthday, when present on both sides, either confirms (strong tier) or
//     disqualifies entirely (a conflicting birthday is evidence of a different
//     person, not just a weaker match).
//   - Phone only ever strengthens a name-based match as a tiebreaker — it never
//     promotes or substitutes for one on its own. A guardian's number is often on
//     file for more than one patient, so phone-only agreement is the least
//     trustworthy signal here, not a bonus one. ──
function soComputePatientMatches() {
    if (soIsWalkIn) return []; // no customer profile to seed from — walk-ins can't reach Lens/CL anyway

    const custName     = soNormalizeName(document.getElementById('customerProfileName')?.value);
    const custBirthday = (document.getElementById('customerProfileBirthday')?.value || '').trim();
    const custPhone    = soNormalizePhone(document.getElementById('customerProfileNumber')?.value);
    if (!custName) return [];

    const patients = JSON.parse(Storage.getItem('patients') || '[]').filter(p => !p.deleted);
    const matches = [];

    for (const p of patients) {
        if (soNormalizeName(p.name) !== custName) continue; // required anchor — no exceptions

        const pBirthday = (p.birthday || '').trim();
        const bothHaveBirthday = custBirthday && pBirthday;
        if (bothHaveBirthday && custBirthday !== pBirthday) continue; // conflicting birthday disqualifies

        const phoneAgrees = custPhone && soNormalizePhone(p.number) === custPhone;
        matches.push({
            patient: p,
            tier: bothHaveBirthday ? 'strong' : 'medium',
            phoneAgrees
        });
    }

    matches.sort((a, b) => {
        if (a.tier !== b.tier) return a.tier === 'strong' ? -1 : 1;
        return (b.phoneAgrees ? 1 : 0) - (a.phoneAgrees ? 1 : 0);
    });

    return matches.slice(0, 3); // cap so a common name doesn't flood the panel
}

// ── Update the readonly Patient display inside the calling item modal's summary block ──
function soRefreshPatientLinkDisplay(type) {
    const displayEl = document.getElementById(type === 'lens' ? 'lensPatientDisplay' : 'clPatientDisplay');
    if (!displayEl || !_soPendingLinkedPatient) return;
    displayEl.value = `${_soPendingLinkedPatient.name} (${_soPendingLinkedPatient.id})`;
}

// ── Update the readonly Rx display inside the calling item modal's summary block ──
function soRefreshRxDisplay(type) {
    const displayEl = document.getElementById(type === 'lens' ? 'lensRxDisplay' : 'clRxDisplay');
    if (!displayEl || !_soPendingLinkedRx) return;
    displayEl.value = _soPendingLinkedRx.manual
        ? 'Entered manually'
        : _soPendingLinkedRx.id;
}

// ── Master display function for the Lens/CL wizard — one place that decides which of
// the three stages (Select Patient / Select Prescription / full form) is showing, driven
// entirely by whether _soPendingLinkedPatient and _soPendingLinkedRx are set. Every state
// change (select, change, clear) funnels through this rather than each caller toggling
// classes itself, so the three stages can never fall out of sync with the actual state. ──
function soUpdateLensClStage(type) {
    const summaryBlock = document.getElementById(type === 'lens' ? 'lensSummaryBlock' : 'clSummaryBlock');
    const rxSummaryRow = document.getElementById(type === 'lens' ? 'lensRxSummaryRow' : 'clRxSummaryRow');
    const gatePatient   = document.getElementById(type === 'lens' ? 'lensGatePatient' : 'clGatePatient');
    const gateRx         = document.getElementById(type === 'lens' ? 'lensGateRx' : 'clGateRx');
    const formFields      = document.getElementById(type === 'lens' ? 'lensFormFields' : 'clFormFields');
    const confirmBtn      = document.querySelector(`#${type === 'lens' ? 'modalLens' : 'modalCL'} .so-modal-ok-btn`);

    const hasPatient = !!_soPendingLinkedPatient;
    const hasRx      = !!_soPendingLinkedRx;

    summaryBlock?.classList.toggle('hidden', !hasPatient);
    rxSummaryRow?.classList.toggle('hidden', !hasRx);
    gatePatient?.classList.toggle('hidden', hasPatient);
    gateRx?.classList.toggle('hidden', !hasPatient || hasRx);
    formFields?.classList.toggle('hidden', !hasPatient || !hasRx);
    confirmBtn?.classList.toggle('hidden', !hasPatient || !hasRx);

    if (hasPatient) soRefreshPatientLinkDisplay(type);
    if (hasRx) soRefreshRxDisplay(type);
}

// ── Open the sub-modal from Lens or CL — hides the calling modal, shows this one on top ──
function soOpenPatientLinkModal(type) {
    _soPatientLinkForType = type;
    document.getElementById(type === 'lens' ? 'modalLens' : 'modalCL')?.classList.remove('active');

    soRenderPatientMatchSuggestions();
    const searchInput = document.getElementById('patientLinkSearchInput');
    if (searchInput) searchInput.value = '';
    soRenderPatientLinkTable();

    document.getElementById('patientLinkModal').classList.add('active');
    soScrollModalToTop('patientLinkModal');
}

// ── Cancel — no change to _soPendingLinkedPatient, just return to the calling modal ──
function soCancelPatientLinkModal() {
    document.getElementById('patientLinkModal').classList.remove('active');
    if (_soPatientLinkForType) {
        const backModalId = _soPatientLinkForType === 'lens' ? 'modalLens' : 'modalCL';
        document.getElementById(backModalId)?.classList.add('active');
        soScrollModalToTop(backModalId);
    }
    _soPatientLinkForType = null;
}

// ── Render the "Possible Match" suggestion cards, hidden entirely when there are none ──
function soRenderPatientMatchSuggestions() {
    const container = document.getElementById('patientLinkSuggestions');
    const cardsEl    = document.getElementById('patientLinkSuggestionCards');
    if (!container || !cardsEl) return;

    const matches = soComputePatientMatches();
    if (matches.length === 0) {
        container.classList.add('hidden');
        cardsEl.innerHTML = '';
        return;
    }

    cardsEl.innerHTML = matches.map(m => {
        const p = m.patient;
        const bday = p.birthday || '—';
        return `
            <div class="so-patient-match-card">
                <span class="so-patient-suggestion-name">${escapeHtml(p.name)}</span>
                <span class="so-patient-suggestion-meta">${escapeHtml(bday)}</span>
                <span class="so-patient-suggestion-meta">${escapeHtml(p.id)}</span>
                <button type="button" class="select-patient-button" onclick='soSelectLinkedPatientById(${JSON.stringify(p.id)})'>Select</button>
            </div>`;
    }).join('');

    container.classList.remove('hidden');
}

// ── Searchable/paginated full patient table — mirrors renderSelectPatientTable
// (New Prescription) exactly, just scoped to this sub-modal's containers and wired
// to soSelectLinkedPatient instead of navigating into a prescription. Deleted patients
// are excluded outright here (rather than shown-but-disabled) — this is a picker for a
// new link, not a historical browsing view. ──
function soRenderPatientLinkTable(filter = '', page = 1) {
    const tableBody = document.getElementById('patientLinkTableBody');
    if (!tableBody) return;

    const rowsPerPage = 10;
    const patients = JSON.parse(Storage.getItem('patients') || '[]').filter(p => !p.deleted);

    if (patients.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="4" style="color: gray; font-style: italic; padding: 20px; text-align: center;">
                No patients yet
            </td></tr>`;
        document.getElementById('patientLinkPagination').innerHTML = '';
        return;
    }

    const filteredPatients = patients
        .filter(p => {
            const search = filter.toLowerCase();
            const id     = (p.id     || '').toLowerCase();
            const name   = (p.name   || '').toLowerCase();
            const number = (p.number || '').toLowerCase();
            return id.includes(search) || name.includes(search) || number.includes(search);
        })
        .reverse();

    tableBody.innerHTML = '';

    if (filteredPatients.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="4" style="color: gray; font-style: italic; padding: 20px; text-align: center;">
                No Match Found
            </td></tr>`;
        document.getElementById('patientLinkPagination').innerHTML = '';
        return;
    }

    const start = (page - 1) * rowsPerPage;
    const pageItems = filteredPatients.slice(start, start + rowsPerPage);

    pageItems.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(patient.id)}</td>
            <td class="uppercase">${escapeHtml(patient.name)}</td>
            <td>${escapeHtml(patient.number)}</td>
            <td><button class="select-patient-button">Select</button></td>
        `;
        row.querySelector('.select-patient-button').addEventListener('click', () => {
            soSelectLinkedPatient(patient);
        });
        tableBody.appendChild(row);
    });

    createPagination(
        'patientLinkPagination',
        filteredPatients,
        page,
        rowsPerPage,
        (newPage) => soRenderPatientLinkTable(filter, newPage)
    );
}

// ── Suggestion card click — looks the patient back up by id rather than embedding the
// full patient object (with whatever characters its fields might contain) inline ──
function soSelectLinkedPatientById(patientId) {
    const patients = JSON.parse(Storage.getItem('patients') || '[]');
    const patient = patients.find(p => p.id === patientId);
    if (patient) soSelectLinkedPatient(patient);
}

// ── Confirm the link — sets draft state, returns to the calling item modal ──
function soSelectLinkedPatient(patient) {
    _soPendingLinkedPatient = { id: patient.id, name: patient.name, birthday: patient.birthday || '' };
    _soPendingLinkedRx      = null; // Rx is specific to a patient — a new patient invalidates any prior Rx choice

    document.getElementById('patientLinkModal').classList.remove('active');
    const type = _soPatientLinkForType;
    if (type) {
        const backModalId = type === 'lens' ? 'modalLens' : 'modalCL';
        document.getElementById(backModalId)?.classList.add('active');
        soScrollModalToTop(backModalId);
        soUnlockRxFields(type); // in case fields were left locked from the previous patient's Rx
        soUpdateLensClStage(type);
    }
    _soPatientLinkForType = null;
}

// ── "Change" button in the summary block — clears the current link and goes straight
// back into the picker, rather than dropping to a blank state the user has to click
// through again ──
function soChangeLinkedPatient(type) {
    _soPendingLinkedPatient = null;
    _soPendingLinkedRx      = null;
    soUnlockRxFields(type);
    soOpenPatientLinkModal(type);
}

// ── Prescriptions for a patient that actually have the field this item type needs.
// A prescription can exist without Final Rx Specs (lens-relevant) or without Final Rx
// CL (contact-lens-relevant) depending on how it was created — only ones with the
// relevant block populated count as "qualifying". Most recent first. ──
function soGetQualifyingPrescriptions(patientId, type) {
    const all = JSON.parse(Storage.getItem('prescriptions') || '[]');
    const field = type === 'lens' ? 'frxSpecs' : 'frxCl';
    return all
        .filter(rx => rx.patientId === patientId && rx[field])
        .sort((a, b) => (b.dateCreated || '').localeCompare(a.dateCreated || ''));
}

// ── Map a prescription's Final Rx Specs onto the Lens modal's grade fields.
// Distance SPH/CYL/AXIS + Add — the standard spec set for grinding a finished lens. ──
function soExtractLensRxData(prescription) {
    const f = prescription.frxSpecs;
    if (!f) return null;
    return {
        odSph: f.od?.distSph || '', odCyl: f.od?.distCyl || '', odAxis: f.od?.distAxis || '', odAdd: f.od?.addSph || '',
        osSph: f.os?.distSph || '', osCyl: f.os?.distCyl || '', osAxis: f.os?.distAxis || '', osAdd: f.os?.addSph || ''
    };
}

// ── Map a prescription's Final Rx (Contact Lens) onto the CL modal's grade fields.
// Now mirrors the full frxCl block (SPH/CYL/AXIS/BC/DIA) — previously only SPH/BC/DIA
// were pulled here, but the order form's grade section was widened to match. ──
function soExtractClRxData(prescription) {
    const f = prescription.frxCl;
    if (!f) return null;
    return {
        odSph: f.od?.sph || '', odCyl: f.od?.cyl || '', odAxis: f.od?.axis || '', odBc: f.od?.bc || '', odDia: f.od?.dia || '',
        osSph: f.os?.sph || '', osCyl: f.os?.cyl || '', osAxis: f.os?.axis || '', osBc: f.os?.bc || '', osDia: f.os?.dia || ''
    };
}

const SO_RX_FIELD_MAP = {
    lens: {
        ids:  ['lensOdSph', 'lensOdCyl', 'lensOdAxis', 'lensOdAdd', 'lensOsSph', 'lensOsCyl', 'lensOsAxis', 'lensOsAdd'],
        keys: ['odSph', 'odCyl', 'odAxis', 'odAdd', 'osSph', 'osCyl', 'osAxis', 'osAdd']
    },
    cl: {
        ids:  ['clOdSph', 'clOdCyl', 'clOdAxis', 'clOdBc', 'clOdDia', 'clOsSph', 'clOsCyl', 'clOsAxis', 'clOsBc', 'clOsDia'],
        keys: ['odSph', 'odCyl', 'odAxis', 'odBc', 'odDia', 'osSph', 'osCyl', 'osAxis', 'osBc', 'osDia']
    }
};

// ── Fill the grade fields from a pulled prescription and lock them. Marc: "users were
// given a chance to finalize the prescription during the eye exam panel" — so once an
// Rx is chosen here, it's the single source of truth, not a suggestion to override. ──
function soFillAndLockRxFields(type) {
    if (!_soPendingLinkedRx || _soPendingLinkedRx.manual) return;
    const map = SO_RX_FIELD_MAP[type];
    const data = _soPendingLinkedRx.data;
    map.ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = data[map.keys[i]] || '';
        el.readOnly = true;
        el.classList.add('so-rx-locked');
    });
    if (type === 'cl') soSetClFieldMode('rx');
    if (type === 'lens') soUpdateLensTypeOptionsForAdd();
}

// ── CL only — manual entry is for ready-made spherical lenses, so the grade is
// SPH-only: CYL/AXIS and the CYL/AXIS-driven Parameters split are Rx-pull concepts
// that don't apply here. 'manual' physically moves BC/DIA back into the grade grid
// (right next to SPH, matching the original single-row design) and hides CYL/AXIS;
// 'rx' moves them back out into their own Parameters block. ──
function soSetClFieldMode(mode) {
    const grid    = document.getElementById('clGradeGrid');
    const params  = document.getElementById('clParamsBlock');
    const paramsGrid = document.getElementById('clParamsGrid');
    if (!grid || !params || !paramsGrid) return;

    grid.querySelectorAll('.cl-cyl-axis').forEach(el => el.classList.toggle('hidden', mode === 'manual'));
    params.classList.toggle('hidden', mode === 'manual');

    const bcHeader  = document.getElementById('clBcHeader');
    const diaHeader = document.getElementById('clDiaHeader');
    const odBc = document.getElementById('clOdBc'), odDia = document.getElementById('clOdDia');
    const osBc = document.getElementById('clOsBc'), osDia = document.getElementById('clOsDia');

    if (mode === 'manual') {
        const gradeOdEye = document.getElementById('clGradeOdEye');
        const gradeOsEye = document.getElementById('clGradeOsEye');
        grid.insertBefore(bcHeader, gradeOdEye);
        grid.insertBefore(diaHeader, gradeOdEye);
        grid.insertBefore(odBc, gradeOsEye);
        grid.insertBefore(odDia, gradeOsEye);
        grid.appendChild(osBc);
        grid.appendChild(osDia);
    } else {
        const paramsOdEye = document.getElementById('clParamsOdEye');
        const paramsOsEye = document.getElementById('clParamsOsEye');
        paramsGrid.insertBefore(bcHeader, paramsOdEye);
        paramsGrid.insertBefore(diaHeader, paramsOdEye);
        paramsGrid.insertBefore(odBc, paramsOsEye);
        paramsGrid.insertBefore(odDia, paramsOsEye);
        paramsGrid.appendChild(osBc);
        paramsGrid.appendChild(osDia);
    }
}

// ── Unlock the grade fields — used when changing/clearing the Rx link, or switching
// a CL row to manual entry ──
function soUnlockRxFields(type) {
    SO_RX_FIELD_MAP[type].ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.readOnly = false;
        el.classList.remove('so-rx-locked');
    });
}

// ── "Select Prescription" — auto-resolves if there's exactly one qualifying Rx,
// opens a picker if there's more than one, alerts if there's none. ──
function soOpenRxSelectModal(type) {
    if (!_soPendingLinkedPatient) return;
    const qualifying = soGetQualifyingPrescriptions(_soPendingLinkedPatient.id, type);

    if (qualifying.length === 0) {
        const fieldLabel = type === 'lens' ? 'Final Rx Specs' : 'Final Rx (Contact Lens)';
        openAlert({
            title: 'No Prescription Found',
            body:  `${_soPendingLinkedPatient.name} has no recorded prescription with ${fieldLabel} on file.` +
                   (type === 'cl' ? ' You can still enter the grade manually.' : ' Select a different patient, or record a prescription for them first.')
        });
        return;
    }

    if (qualifying.length === 1) {
        soSelectRx(qualifying[0].id, type);
        return;
    }

    _soRxPickerForType = type;
    document.getElementById(type === 'lens' ? 'modalLens' : 'modalCL')?.classList.remove('active');
    soRenderRxPickerCards(qualifying, type);
    document.getElementById('rxPickerManualBtn')?.classList.toggle('hidden', type !== 'cl');
    document.getElementById('rxPickerModal').classList.add('active');
    soScrollModalToTop('rxPickerModal');
}

// ── Render the Rx picker cards — reuses the suggestion-card styling from Patient Link ──
function soRenderRxPickerCards(prescriptions, type) {
    const cardsEl = document.getElementById('rxPickerCards');
    if (!cardsEl) return;

    cardsEl.innerHTML = prescriptions.map(rx => {
        const f = type === 'lens' ? rx.frxSpecs : rx.frxCl;
        const odSph = type === 'lens' ? f?.od?.distSph : f?.od?.sph;
        const osSph = type === 'lens' ? f?.os?.distSph : f?.os?.sph;
        const preview = `OD ${odSph || '—'} · OS ${osSph || '—'}`;
        return `
            <button type="button" class="so-patient-suggestion-card" onclick='soSelectRx(${JSON.stringify(rx.id)}, ${JSON.stringify(type)})'>
                <span class="so-patient-suggestion-name">${escapeHtml(rx.id)} — ${escapeHtml(rx.dateCreated || '')}</span>
                <span class="so-patient-suggestion-meta">${escapeHtml(preview)}</span>
            </button>`;
    }).join('');
}

// ── Confirm the Rx link — fills + locks the fields, returns to the calling item modal ──
function soSelectRx(rxId, type) {
    const all = JSON.parse(Storage.getItem('prescriptions') || '[]');
    const rx = all.find(r => r.id === rxId);
    if (!rx) return;

    const data = type === 'lens' ? soExtractLensRxData(rx) : soExtractClRxData(rx);
    if (!data) return;

    _soPendingLinkedRx = { id: rx.id, dateCreated: rx.dateCreated || '', manual: false, data };

    document.getElementById('rxPickerModal')?.classList.remove('active');
    if (_soRxPickerForType) {
        const backModalId = _soRxPickerForType === 'lens' ? 'modalLens' : 'modalCL';
        document.getElementById(backModalId)?.classList.add('active');
        soScrollModalToTop(backModalId);
    }
    _soRxPickerForType = null;

    soFillAndLockRxFields(type);
    soUpdateLensClStage(type);
}

function soCancelRxPickerModal() {
    document.getElementById('rxPickerModal').classList.remove('active');
    if (_soRxPickerForType) {
        const backModalId = _soRxPickerForType === 'lens' ? 'modalLens' : 'modalCL';
        document.getElementById(backModalId)?.classList.add('active');
        soScrollModalToTop(backModalId);
    }
    _soRxPickerForType = null;
}

// ── "Enter Manually" from inside the picker — same escape hatch as the initial
// gate's manual-entry button, but reachable from soChangeLinkedRx()'s picker path too
// (previously a dead end once more than one qualifying prescription existed). ──
function soEnterRxManuallyFromPicker() {
    const type = _soRxPickerForType;
    if (!type) return;

    document.getElementById('rxPickerModal').classList.remove('active');
    const backModalId = type === 'lens' ? 'modalLens' : 'modalCL';
    document.getElementById(backModalId)?.classList.add('active');
    soScrollModalToTop(backModalId);
    _soRxPickerForType = null;

    soEnterRxManually(type);
}

// ── CL only — no Rx on file, or the cashier just prefers to type it in directly.
// Fields stay fully editable since there's no record backing them. ──
function soEnterRxManually(type) {
    _soPendingLinkedRx = { manual: true };
    soUnlockRxFields(type);
    SO_RX_FIELD_MAP[type].ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = ''; // clear anything left over from a previously-selected Rx
    });
    if (type === 'cl') soSetClFieldMode('manual');
    soUpdateLensClStage(type);
}

// ── "Change" button on the Rx summary row — clears the current Rx and goes straight
// back into re-selecting, mirroring soChangeLinkedPatient ──
function soChangeLinkedRx(type) {
    _soPendingLinkedRx = null;
    soUnlockRxFields(type);
    soOpenRxSelectModal(type);
}