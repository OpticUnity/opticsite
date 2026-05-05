//--------------- View Records Logic ---------------

// ---- Navigation ----
function initViewRecordsNav() {
    document.getElementById('customerMenuBtn')?.addEventListener('click', () => {
        document.getElementById('viewRecordsMainMenu').classList.add('hidden');
        document.getElementById('viewRecordsCustomerMenu').classList.remove('hidden');
    });

    document.getElementById('patientMenuBtn')?.addEventListener('click', () => {
        document.getElementById('viewRecordsMainMenu').classList.add('hidden');
        document.getElementById('viewRecordsPatientMenu').classList.remove('hidden');
        renderViewPatientTable();
    });

    document.getElementById('viewRecordsCtmBackBtn')?.addEventListener('click', () => {
        document.getElementById('viewRecordsCustomerMenu').classList.add('hidden');
        document.getElementById('viewRecordsMainMenu').classList.remove('hidden');
    });

    document.getElementById('viewRecordsPtmBackBtn')?.addEventListener('click', () => {
        document.getElementById('viewRecordsPatientMenu').classList.add('hidden');
        document.getElementById('viewRecordsMainMenu').classList.remove('hidden');
    });

    // Search bar
    document.getElementById('viewPatientSearchBarInput')?.addEventListener('input', (e) => {
        renderViewPatientTable(e.target.value);
    });
}

// ---- Render Patient Select Table ----
function renderViewPatientTable(filter = "", page = 1) {
    const tableBody = document.querySelector('#viewPatientTable tbody');
    if (!tableBody) return;

    const rowsPerPage = 10;
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');

    // --- Handle empty storage ---
    if (patients.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="4" style="color:gray;font-style:italic;padding:20px;text-align:center;">
                No patients yet
            </td></tr>`;
        document.getElementById('viewPatientPagination').innerHTML = '';
        return;
    }

    const filtered = patients
        .filter(p => {
            const search = filter.toLowerCase();
            return p.id.toLowerCase().includes(search) ||
                   p.name.toLowerCase().includes(search) ||
                   p.number.toLowerCase().includes(search);
        })
        .reverse();

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="4" style="color:gray;font-style:italic;padding:20px;text-align:center;">
                No Match Found
            </td></tr>`;
        document.getElementById('viewPatientPagination').innerHTML = '';
        return;
    }

    const start = (page - 1) * rowsPerPage;
    const pageItems = filtered.slice(start, start + rowsPerPage);

    pageItems.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${patient.id}</td>
            <td class="uppercase">${patient.name}</td>
            <td>${patient.number}</td>
            <td><button class="select-patient-button view-select-btn">Select</button></td>
        `;
        row.querySelector('.view-select-btn').addEventListener('click', () => {
            viewPatient(patient);
        });
        tableBody.appendChild(row);
    });

    createPagination(
        'viewPatientPagination',
        filtered,
        page,
        rowsPerPage,
        (newPage) => renderViewPatientTable(filter, newPage)
    );
}

// ---- View Selected Patient ----
function viewPatient(patient) {
    // Populate profile fields
    document.getElementById('viewPatientIdNumber').value   = patient.id;
    document.getElementById('viewPatientDateCreated').value = patient.dateCreated;
    document.getElementById('viewPatientName').value       = patient.name;
    document.getElementById('viewPatientNumber').value     = patient.number;
    document.getElementById('viewPatientEmail').value      = patient.email;
    document.getElementById('viewPatientSex').value        = patient.sex;
    document.getElementById('viewPatientAddress').value    = patient.address;
    document.getElementById('viewPatientBirthday').value   = patient.birthday;
    document.getElementById('viewPatientAge').value        = patient.age;
    document.getElementById('viewPatientNotes').value      = patient.patientNotes || '';
    document.getElementById('viewPatientGenHealthHx').value = patient.genHealthHx || '';
    document.getElementById('viewPatientOcuHx').value      = patient.ocuHx || '';

    // Render Rx table
    renderRxTable(patient);

    // Show profile, hide select
    document.getElementById('viewPatientSelectMenu').classList.add('hidden');
    document.getElementById('viewPatientProfileMenu').classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Render Rx Table ----
function renderRxTable(patient) {
    const tableBody = document.getElementById('viewRxTableBody');
    tableBody.innerHTML = '';

    const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
    const patientRxIds = patient.prescriptions || [];

    // Filter prescriptions belonging to this patient
    const patientRxs = prescriptions
        .filter(rx => patientRxIds.includes(rx.id))
        .sort((a, b) => {
            const dateDiff = new Date(b.dateCreated) - new Date(a.dateCreated);
            if (dateDiff !== 0) return dateDiff;
            // Same date: sort by Rx ID descending (latest ID first)
            return b.id.localeCompare(a.id, undefined, { numeric: true });
        });

    if (patientRxs.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="4" style="color:gray;font-style:italic;padding:20px;text-align:center;">
                No Prescription Records Yet
            </td></tr>`;
        return;
    }

    patientRxs.forEach(rx => {
        const row = createRxMainRow(rx);
        tableBody.appendChild(row);
    });
}

// ---- Create Rx Row ----
function createRxMainRow(rx) {
    const row = document.createElement('tr');

    const methodLabels = {
        eyeExam: 'Eye Exam',
        copyPrescription: 'Copy Rx',
        copyPrescriptionCl: 'Copy Rx (CL)'
    };

    const methodText = methodLabels[rx.rxMethod] || rx.rxMethod;

    row.innerHTML = `
        <td>${rx.id}</td>
        <td>${rx.dateCreated}</td>
        <td>${methodText}</td>
        <td>
            <button class="toggle-btn" title="Quick View">▼</button>
            ${rx.rxMethod === 'eyeExam' ? `<button class="toggle-btn print-rx-btn" title="Generate Medical Certificate"><i class="fa-solid fa-file-medical"></i></button>` : ''}
            <button class="toggle-btn edit-rx-btn" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="toggle-btn delete-rx-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;

    row.dataset.rx = JSON.stringify(rx);

    if (rx.rxMethod === 'eyeExam') {
        row.querySelector('.print-rx-btn').addEventListener('click', () => {
            // TODO: print medical certificate logic
        });
    }

    row.querySelector('.edit-rx-btn').addEventListener('click', () => {
        // TODO: edit Rx logic (future)
    });

    row.querySelector('.delete-rx-btn').addEventListener('click', () => {
        // TODO: delete Rx logic (future)
    });

    row.querySelector('.toggle-btn').addEventListener('click', (e) => {
        const next = row.nextElementSibling;

        if (next && next.classList.contains('details-row')) {
            // Also remove cl-details-row if it's sitting right after the detail row
            const afterNext = next.nextElementSibling;
            if (afterNext && afterNext.classList.contains('cl-details-row')) {
                afterNext.remove();
            }
            next.remove();
            e.target.textContent = '▼';
            return;
        }

        const detailRow = createRxDetailRow(rx);
        row.after(detailRow);
        e.target.textContent = '▲';
    });

    return row;
}

// ---- Create Rx Detail Row ----
function createRxDetailRow(rx) {
    const detailRow = document.createElement('tr');
    detailRow.classList.add('details-row');

    let content = '';

    if (rx.rxMethod === 'eyeExam') {
        const frx = rx.frxSpecs || {};
        const od = frx.od || {};
        const os = frx.os || {};
        const cl = rx.frxCl;

        content = `
            <table class="inner-table">
                <thead>
                    <tr>
                        <th>F-RX</th>
                        <th>SPH</th>
                        <th>CYL</th>
                        <th>AXIS</th>
                        <th>ADD</th>
                        <th>PD</th>
                        <th>Dist VA</th>
                        <th>Near VA</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>OD</strong></td>
                        <td>${od.distSph || '-'}</td>
                        <td>${od.distCyl || '-'}</td>
                        <td>${od.distAxis || '-'}</td>
                        <td>${od.addSph || '-'}</td>
                        <td>${od.distPd || '-'}</td>
                        <td>${od.distVa || '-'}</td>
                        <td>${od.nearVa || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>OS</strong></td>
                        <td>${os.distSph || '-'}</td>
                        <td>${os.distCyl || '-'}</td>
                        <td>${os.distAxis || '-'}</td>
                        <td>${os.addSph || '-'}</td>
                        <td>${os.distPd || '-'}</td>
                        <td>${os.distVa || '-'}</td>
                        <td>${os.nearVa || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Notes</strong></td>
                        <td colspan="6" style="text-align:left;">
                            ${frx.notes || '-'}
                        </td>
                        <td>${cl ? `<button class="toggle-btn cl-toggle-btn">CL ▼</button>` : '-'}</td>
                    </tr>
                </tbody>
            </table>
        `;

        // Set innerHTML first so the DOM exists, then wire up the CL button
        detailRow.innerHTML = `<td colspan="4" style="padding:15px;">${content}</td>`;

        if (cl) {
            const clBtn = detailRow.querySelector('.cl-toggle-btn');
            clBtn.addEventListener('click', () => {
                // Check if a CL detail row already exists right after this detailRow
                const existingClRow = detailRow.nextElementSibling;
                if (existingClRow && existingClRow.classList.contains('cl-details-row')) {
                    existingClRow.remove();
                    clBtn.textContent = 'CL ▼';
                    return;
                }

                // Build and insert the CL sub-row
                const clRow = document.createElement('tr');
                clRow.classList.add('details-row', 'cl-details-row');

                const clOd = cl.od || {};
                const clOs = cl.os || {};
                clRow.innerHTML = `
                    <td colspan="4" style="padding:15px;">
                        <table class="inner-table">
                            <thead>
                                <tr>
                                    <th>F-RX (CL)</th>
                                    <th>SPH</th>
                                    <th>CYL</th>
                                    <th>AXIS</th>
                                    <th>BC</th>
                                    <th>DIA</th>
                                    <th>VA</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>OD</strong></td>
                                    <td>${clOd.sph || '-'}</td>
                                    <td>${clOd.cyl || '-'}</td>
                                    <td>${clOd.axis || '-'}</td>
                                    <td>${clOd.bc || '-'}</td>
                                    <td>${clOd.dia || '-'}</td>
                                    <td>${clOd.va || '-'}</td>
                                </tr>
                                <tr>
                                    <td><strong>OS</strong></td>
                                    <td>${clOs.sph || '-'}</td>
                                    <td>${clOs.cyl || '-'}</td>
                                    <td>${clOs.axis || '-'}</td>
                                    <td>${clOs.bc || '-'}</td>
                                    <td>${clOs.dia || '-'}</td>
                                    <td>${clOs.va || '-'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Notes</strong></td>
                                    <td colspan="6" style="text-align:left;">
                                        ${cl.notes || '-'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                `;

                detailRow.after(clRow);
                clBtn.textContent = 'CL ▲';
            });
        }

        return detailRow;

    } else if (rx.rxMethod === 'copyPrescription') {
        const frx = rx.frxSpecs || {};
        const od = frx.od || {};
        const os = frx.os || {};
        content = `
            <table class="inner-table">
                <thead>
                    <tr>
                        <th>C-RX</th>
                        <th>SPH</th>
                        <th>CYL</th>
                        <th>AXIS</th>
                        <th>ADD</th>
                        <th>PD</th>
                        <th>Dist VA</th>
                        <th>Near VA</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>OD</strong></td>
                        <td>${od.distSph || '-'}</td>
                        <td>${od.distCyl || '-'}</td>
                        <td>${od.distAxis || '-'}</td>
                        <td>${od.addSph || '-'}</td>
                        <td>${od.distPd || '-'}</td>
                        <td>${od.distVa || '-'}</td>
                        <td>${od.nearVa || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>OS</strong></td>
                        <td>${os.distSph || '-'}</td>
                        <td>${os.distCyl || '-'}</td>
                        <td>${os.distAxis || '-'}</td>
                        <td>${os.addSph || '-'}</td>
                        <td>${os.distPd || '-'}</td>
                        <td>${os.distVa || '-'}</td>
                        <td>${os.nearVa || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Notes</strong></td>
                        <td colspan="7" style="text-align:left; max-width:300px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
                            ${frx.notes || '-'}
                        </td>
                    </tr>
                </tbody>
            </table>
        `;

    } else if (rx.rxMethod === 'copyPrescriptionCl') {
        const cl = rx.frxCl || {};
        const od = cl.od || {};
        const os = cl.os || {};
        content = `
            <table class="inner-table">
                <thead>
                    <tr>
                        <th>C-RX (CL)</th>
                        <th>SPH</th>
                        <th>CYL</th>
                        <th>AXIS</th>
                        <th>BC</th>
                        <th>DIA</th>
                        <th>VA</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>OD</strong></td>
                        <td>${od.sph || '-'}</td>
                        <td>${od.cyl || '-'}</td>
                        <td>${od.axis || '-'}</td>
                        <td>${od.bc || '-'}</td>
                        <td>${od.dia || '-'}</td>
                        <td>${od.va || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>OS</strong></td>
                        <td>${os.sph || '-'}</td>
                        <td>${os.cyl || '-'}</td>
                        <td>${os.axis || '-'}</td>
                        <td>${os.bc || '-'}</td>
                        <td>${os.dia || '-'}</td>
                        <td>${os.va || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Notes</strong></td>
                        <td colspan="6" style="text-align:left; max-width:300px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
                            ${cl.notes || '-'}
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    detailRow.innerHTML = `<td colspan="4" style="padding:15px;">${content}</td>`;
    return detailRow;
}

// ---- Edit Patient Profile Logic ----

// Fields that can be edited (ID, dateCreated, birthday, age are readonly always)
const EDIT_PATIENT_FIELDS = [
    'viewPatientName',
    'viewPatientNumber',
    'viewPatientEmail',
    'viewPatientAddress',
    'viewPatientNotes',
    'viewPatientGenHealthHx',
    'viewPatientOcuHx'
];

// Sex field needs special handling (input → select swap)
const SEX_INPUT_ID = 'viewPatientSex';

// Snapshot of original values before edit begins — used for dirty check and cancel
let _editPatientSnapshot = null;

// Whether a sex <select> is currently injected
let _sexSelectInjected = false;

// -- Attach edit mode input restrictions --
function _attachEditValidators() {
    // Name — uppercase live
    const nameEl = document.getElementById('viewPatientName');
    if (nameEl) {
        nameEl._editUppercase = (e) => { e.target.value = e.target.value.toUpperCase(); };
        nameEl.addEventListener('input', nameEl._editUppercase);
    }

    // Number — digits only, keydown block
    const numEl = document.getElementById('viewPatientNumber');
    if (numEl) {
        numEl._editKeydown = (e) => {
            const controlKeys = ['Backspace','Tab','ArrowLeft','ArrowRight','Delete','Enter'];
            if (!/[0-9]/.test(e.key) && !controlKeys.includes(e.key)) e.preventDefault();
        };
        numEl.addEventListener('keydown', numEl._editKeydown);
    }

    // Email — blur trim only, no special filter needed
    // Address — free text, no filter needed
}

// -- Remove edit mode input restrictions --
function _detachEditValidators() {
    const nameEl = document.getElementById('viewPatientName');
    if (nameEl?._editUppercase) {
        nameEl.removeEventListener('input', nameEl._editUppercase);
        delete nameEl._editUppercase;
    }

    const numEl = document.getElementById('viewPatientNumber');
    if (numEl?._editKeydown) {
        numEl.removeEventListener('keydown', numEl._editKeydown);
        delete numEl._editKeydown;
    }
}

// -- Enter edit mode --
function enterEditMode() {
    // Snapshot current displayed values
    _editPatientSnapshot = {};
    EDIT_PATIENT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) _editPatientSnapshot[id] = el.value;
    });
    _editPatientSnapshot[SEX_INPUT_ID] = document.getElementById(SEX_INPUT_ID)?.value || '';

    // Unlock editable fields
    EDIT_PATIENT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.removeAttribute('readonly');
    });

    // Replace the Sex input with a <select>
    _injectSexSelect(_editPatientSnapshot[SEX_INPUT_ID]);

    // Wire up input restrictions
    _attachEditValidators();

    // Swap button panels — hide main actions, show edit actions
    document.getElementById('viewPatientMainBtnContainer').classList.add('hidden');
    document.getElementById('editPatientActionBtns').classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -- Exit edit mode (cancel or after save) --
function exitEditMode(restoreSnapshot = false) {
    // Resolve snapshot sex value before any state is cleared
    const snapshotSexValue = (restoreSnapshot && _editPatientSnapshot)
        ? _editPatientSnapshot[SEX_INPUT_ID]
        : null;

    if (restoreSnapshot && _editPatientSnapshot) {
        EDIT_PATIENT_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = _editPatientSnapshot[id];
        });
    }

    // Restore Sex input
    _restoreSexInput(snapshotSexValue);

    // Re-lock all editable fields and clear any validation errors
    EDIT_PATIENT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.setAttribute('readonly', true);
            el.classList.remove('input-error');
        }
    });

    // Remove input restrictions
    _detachEditValidators();

    // Swap button panels back
    document.getElementById('editPatientActionBtns').classList.add('hidden');
    document.getElementById('viewPatientMainBtnContainer').classList.remove('hidden');

    _editPatientSnapshot = null;
}

// -- Check if any field changed from snapshot --
function isEditDirty() {
    if (!_editPatientSnapshot) return false;

    for (const id of EDIT_PATIENT_FIELDS) {
        const el = document.getElementById(id);
        if (el && el.value !== _editPatientSnapshot[id]) return true;
    }

    // Check sex — could be a select now
    const sexEl = _sexSelectInjected
        ? document.getElementById('viewPatientSexSelect')
        : document.getElementById(SEX_INPUT_ID);
    if (sexEl && sexEl.value !== _editPatientSnapshot[SEX_INPUT_ID]) return true;

    return false;
}

// -- Inject a <select> in place of the Sex <input> --
function _injectSexSelect(currentValue) {
    const input = document.getElementById(SEX_INPUT_ID);
    if (!input || _sexSelectInjected) return;

    const select = document.createElement('select');
    select.id = 'viewPatientSexSelect';
    // Copy classes so it inherits the same styling
    select.className = input.className;

    const options = [
        { value: '', label: '- SELECT -', disabled: true },
        { value: 'male', label: 'MALE' },
        { value: 'female', label: 'FEMALE' }
    ];
    options.forEach(({ value, label, disabled }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        if (disabled) opt.disabled = true;
        select.appendChild(opt);
    });

    // Match currently stored value (case-insensitive since stored values are lowercase)
    select.value = currentValue?.toLowerCase() || '';

    input.replaceWith(select);
    _sexSelectInjected = true;
}

// -- Restore the original Sex <input> --
function _restoreSexInput(displayValue) {
    if (!_sexSelectInjected) return;

    const select = document.getElementById('viewPatientSexSelect');
    if (!select) return;

    const input = document.createElement('input');
    input.id = SEX_INPUT_ID;
    input.className = select.className;
    input.setAttribute('readonly', true);

    // If displayValue passed (cancel), restore snapshot; otherwise keep whatever select has
    input.value = displayValue !== null && displayValue !== undefined
        ? displayValue
        : (select.value || '');

    select.replaceWith(input);
    _sexSelectInjected = false;
}

// -- Read current sex value regardless of which element is live --
function _readSexValue() {
    if (_sexSelectInjected) {
        return document.getElementById('viewPatientSexSelect')?.value || '';
    }
    return document.getElementById(SEX_INPUT_ID)?.value || '';
}

// -- Validate edit form before saving --
function validateEditPatientForm() {
    let valid = true;

    // Required non-empty fields (notes/hx are optional)
    const requiredFields = [
        'viewPatientName',
        'viewPatientNumber',
        'viewPatientAddress'
    ];

    requiredFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!el.value.trim()) {
            el.classList.add('input-error');
            valid = false;
        } else {
            el.classList.remove('input-error');
        }
    });

    // Sex (select)
    const sexVal = _readSexValue();
    const sexEl = _sexSelectInjected
        ? document.getElementById('viewPatientSexSelect')
        : document.getElementById(SEX_INPUT_ID);
    if (!sexVal) {
        sexEl?.classList.add('input-error');
        valid = false;
    } else {
        sexEl?.classList.remove('input-error');
    }

    if (!valid) {
        alert('Please fill in all required fields correctly.');
    }

    return valid;
}

// -- Save edits to localStorage --
function saveEditPatient() {
    if (!validateEditPatientForm()) return;

    const patientId = document.getElementById('viewPatientIdNumber').value.trim();
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const idx = patients.findIndex(p => p.id === patientId);

    if (idx === -1) {
        alert('Error: Patient record not found. Cannot save.');
        return;
    }

    // Update the patient record — only mutable fields
    patients[idx].name           = document.getElementById('viewPatientName').value.toUpperCase().trim();
    patients[idx].number         = document.getElementById('viewPatientNumber').value.trim();
    patients[idx].email          = document.getElementById('viewPatientEmail').value.trim();
    patients[idx].sex            = _readSexValue();
    patients[idx].address        = document.getElementById('viewPatientAddress').value.trim();
    patients[idx].patientNotes   = document.getElementById('viewPatientNotes').value.trim();
    patients[idx].genHealthHx    = document.getElementById('viewPatientGenHealthHx').value.trim();
    patients[idx].ocuHx          = document.getElementById('viewPatientOcuHx').value.trim();

    localStorage.setItem('patients', JSON.stringify(patients));

    alert(`Patient ${patientId} updated successfully.`);
    exitEditMode(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -- Wire up edit patient buttons --
function initEditPatientProfile() {
    document.getElementById('editPatientProfileBtn')?.addEventListener('click', () => {
        enterEditMode();
    });

    document.getElementById('cancelEditPatientBtn')?.addEventListener('click', () => {
        if (isEditDirty()) {
            const leave = confirm('Discard unsaved changes?');
            if (!leave) return;
        }
        exitEditMode(true);
    });

    document.getElementById('saveEditPatientBtn')?.addEventListener('click', () => {
        saveEditPatient();
    });

    // Guard: intercept Back button while in edit mode
    document.getElementById('viewPatientToSelectionBackBtn')?.addEventListener('click', () => {
        // Button is disabled during edit mode, so this only fires in read mode
        document.getElementById('viewPatientProfileMenu').classList.add('hidden');
        document.getElementById('viewPatientSelectMenu').classList.remove('hidden');
        const searchBar = document.getElementById('viewPatientSearchBarInput');
        if (searchBar) searchBar.value = '';
        renderViewPatientTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Update dirtyGuardPages in ui-and-navigation to also catch edit mode when navigating away
// This is done by exposing a global flag that the nav guard can read
function isViewRecordsEditDirty() {
    return _editPatientSnapshot !== null && isEditDirty();
}
window._isViewRecordsEditDirty = isViewRecordsEditDirty;

// ---- Init ----

window.addEventListener('load', () => {
    initViewRecordsNav();
    initEditPatientProfile();
});