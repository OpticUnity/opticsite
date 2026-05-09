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
            const name   = (p.name   || '').toLowerCase();
            const number = (p.number || '').toLowerCase();
            const id     = (p.id     || '').toLowerCase();
            return id.includes(search) || name.includes(search) || number.includes(search);
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
        const isDeleted = patient.deleted === true;
        const row = document.createElement('tr');
        if (isDeleted) row.classList.add('record-deleted');
        row.innerHTML = `
            <td>${patient.id}</td>
            <td class="uppercase">${isDeleted ? '[DELETED]' : patient.name}</td>
            <td>${isDeleted ? '—' : patient.number}</td>
            <td>${isDeleted
                ? '<span class="deleted-label">Deleted</span>'
                : '<button class="select-patient-button view-select-btn">Select</button>'
            }</td>
        `;
        if (!isDeleted) {
            row.querySelector('.view-select-btn').addEventListener('click', () => {
                viewPatient(patient);
            });
        }
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
    const isDeleted = rx.deleted === true;

    if (isDeleted) {
        row.classList.add('record-deleted');
        row.innerHTML = `
            <td>${rx.id}</td>
            <td>${rx.dateCreated}</td>
            <td><span class="deleted-label">[DELETED]</span></td>
            <td>—</td>
        `;
        return row;
    }

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
            const patientId = document.getElementById('viewPatientIdNumber').value.trim();
            printRx(rx, patientId);
        });
    }

    row.querySelector('.edit-rx-btn').addEventListener('click', () => {
        openEditRxUI(rx);
    });

    row.querySelector('.delete-rx-btn').addEventListener('click', () => {
        const currentPatientId = document.getElementById('viewPatientIdNumber').value.trim();
        openModal({
            title: 'Delete Prescription',
            body: `Delete prescription ${rx.id}?\nID and date will remain visible in the table. All clinical data will be permanently wiped.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: () => deleteRx(rx.id, currentPatientId)
        });
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

// ---- Edit Rx UI ----

function openEditRxUI(rx) {
    window._isEditRxActive = true;

    // Hide main btn container and Rx table
    document.getElementById('viewPatientMainBtnContainer').classList.add('hidden');
    document.getElementById('viewRxTableSection').classList.add('hidden');

    // Build and mount the edit UI
    const panel = document.getElementById('editRxPanel');
    panel.innerHTML = '';
    panel.appendChild(buildEditRxUI(rx));
    panel.classList.remove('hidden');

    // Wire CL gen buttons for Eye Exam
    if (rx.rxMethod === 'eyeExam') {
        document.getElementById('erx_generateToricBtn')?.addEventListener('click', () => {
            generateClFromErx('toric');
        });
        document.getElementById('erx_generateSphereBtn')?.addEventListener('click', () => {
            generateClFromErx('sphere');
        });
    }

    // -- Snapshot for dirty detection --
    const _editRxSnapshot = {};
    panel.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.id) _editRxSnapshot[el.id] = el.value;
    });

    function _isEditRxDirty() {
        return [...panel.querySelectorAll('input, textarea, select')].some(el => {
            return el.id && _editRxSnapshot[el.id] !== el.value;
        });
    }

    // -- Hide Save button until a change is made --
    const saveBtn = document.getElementById('saveEditRxBtn');
    const saveBtnItem = saveBtn?.closest('.view-patient-action-btn-item');
    if (saveBtnItem) saveBtnItem.classList.add('hidden');

    panel.addEventListener('input', () => {
        if (_isEditRxDirty() && saveBtnItem) {
            saveBtnItem.classList.remove('hidden');
        }
    });

    // -- Wire near/add and near PD sync --
    if (rx.rxMethod === 'eyeExam') {
        ['hrxOd', 'hrxOs', 'vt7Od', 'vt7Os', 'frxOd', 'frxOs'].forEach(p => {
            attachNearAddSync({
                distSphId:  `erx_${p}DistanceSph`,
                distCylId:  `erx_${p}DistanceCyl`,
                distAxisId: `erx_${p}DistanceAxis`,
                nearSphId:  `erx_${p}NearSph`,
                nearCylId:  `erx_${p}NearCyl`,
                nearAxisId: `erx_${p}NearAxis`,
                addId:      `erx_${p}AddSph`
            }, { syncing: false });
            attachNearPdSync(`erx_${p}DistancePd`, `erx_${p}NearPd`);
        });
    }

    if (rx.rxMethod === 'copyPrescription') {
        ['copyRxOd', 'copyRxOs'].forEach(p => {
            attachNearAddSync({
                distSphId:  `erx_${p}DistanceSph`,
                distCylId:  `erx_${p}DistanceCyl`,
                distAxisId: `erx_${p}DistanceAxis`,
                nearSphId:  `erx_${p}NearSph`,
                nearCylId:  `erx_${p}NearCyl`,
                nearAxisId: `erx_${p}NearAxis`,
                addId:      `erx_${p}AddSph`
            }, { syncing: false });
            attachNearPdSync(`erx_${p}DistancePd`, `erx_${p}NearPd`);
        });
    }

    // -- Back — only prompt if dirty --
    document.getElementById('cancelEditRxBtn').addEventListener('click', () => {
        if (_isEditRxDirty()) {
            openModal({
                title: 'Discard Changes',
                body: 'You have unsaved changes. Discard and return to patient profile?',
                confirmText: 'Yes, Discard',
                cancelText: 'Keep Editing',
                onConfirm: () => closeEditRxUI()
            });
        } else {
            closeEditRxUI();
        }
    });

    // Save
    document.getElementById('saveEditRxBtn').addEventListener('click', () => {
        const patientId = document.getElementById('viewPatientIdNumber').value.trim();
        const newRxData = collectEditRxData(rx);

        openModal({
            title: 'Save Changes',
            body: `Modifications will overwrite the current Rx ${rx.id}.\nContinue?`,
            confirmText: 'Save',
            cancelText: 'Cancel',
            onConfirm: () => {
                saveRxCorrection(rx, newRxData, patientId);
                closeEditRxUI();
            }
        });
    });
}

function closeEditRxUI() {
    window._isEditRxActive = false;
    document.getElementById('editRxPanel').classList.add('hidden');
    document.getElementById('editRxPanel').innerHTML = '';
    document.getElementById('viewPatientMainBtnContainer').classList.remove('hidden');
    document.getElementById('viewRxTableSection').classList.remove('hidden');
}

function collectEditRxData(rx) {
    function v(id) {
        const el = document.getElementById(`erx_${id}`);
        return el ? (el.value.trim() || null) : null;
    }

    function collectSpecs(prefix) {
        return {
            od: {
                distSph:  v(`${prefix}OdDistanceSph`),  distCyl:  v(`${prefix}OdDistanceCyl`),
                distAxis: v(`${prefix}OdDistanceAxis`),  distPd:   v(`${prefix}OdDistancePd`),
                distVa:   v(`${prefix}OdDistanceVa`),   nearSph:  v(`${prefix}OdNearSph`),
                nearCyl:  v(`${prefix}OdNearCyl`),      nearAxis: v(`${prefix}OdNearAxis`),
                nearPd:   v(`${prefix}OdNearPd`),       nearVa:   v(`${prefix}OdNearVa`),
                addSph:   v(`${prefix}OdAddSph`)
            },
            os: {
                distSph:  v(`${prefix}OsDistanceSph`),  distCyl:  v(`${prefix}OsDistanceCyl`),
                distAxis: v(`${prefix}OsDistanceAxis`),  distPd:   v(`${prefix}OsDistancePd`),
                distVa:   v(`${prefix}OsDistanceVa`),   nearSph:  v(`${prefix}OsNearSph`),
                nearCyl:  v(`${prefix}OsNearCyl`),      nearAxis: v(`${prefix}OsNearAxis`),
                nearPd:   v(`${prefix}OsNearPd`),       nearVa:   v(`${prefix}OsNearVa`),
                addSph:   v(`${prefix}OsAddSph`)
            },
            notes: v(`${prefix === 'frx' ? 'frx' : 'copyRx'}Notes`)
        };
    }

    function collectCl(prefix) {
        return {
            od: {
                sph: v(`${prefix}OdSph`), cyl: v(`${prefix}OdCyl`), axis: v(`${prefix}OdAxis`),
                bc:  v(`${prefix}OdBc`),  dia: v(`${prefix}OdDia`), va:   v(`${prefix}OdVa`)
            },
            os: {
                sph: v(`${prefix}OsSph`), cyl: v(`${prefix}OsCyl`), axis: v(`${prefix}OsAxis`),
                bc:  v(`${prefix}OsBc`),  dia: v(`${prefix}OsDia`), va:   v(`${prefix}OsVa`)
            },
            notes: v(`${prefix === 'frxCl' ? 'frxCl' : 'copyRxCl'}Notes`)
        };
    }

    if (rx.rxMethod === 'eyeExam') {
        const clForm = document.getElementById('erx_frxClForm');
        const hasCl  = clForm && !clForm.classList.contains('hidden');
        return {
            uva: {
                odDist: v('uvaOdDist'), odNear: v('uvaOdNear'),
                osDist: v('uvaOsDist'), osNear: v('uvaOsNear'),
                ouDist: v('uvaOuDist'), ouNear: v('uvaOuNear')
            },
            ph: { od: v('phOd'), os: v('phOs') },
            hrx: {
                od: { distSph: v('hrxOdDistanceSph'), distCyl: v('hrxOdDistanceCyl'), distAxis: v('hrxOdDistanceAxis'), distPd: v('hrxOdDistancePd'), distVa: v('hrxOdDistanceVa'), nearSph: v('hrxOdNearSph'), nearCyl: v('hrxOdNearCyl'), nearAxis: v('hrxOdNearAxis'), nearPd: v('hrxOdNearPd'), nearVa: v('hrxOdNearVa'), addSph: v('hrxOdAddSph') },
                os: { distSph: v('hrxOsDistanceSph'), distCyl: v('hrxOsDistanceCyl'), distAxis: v('hrxOsDistanceAxis'), distPd: v('hrxOsDistancePd'), distVa: v('hrxOsDistanceVa'), nearSph: v('hrxOsNearSph'), nearCyl: v('hrxOsNearCyl'), nearAxis: v('hrxOsNearAxis'), nearPd: v('hrxOsNearPd'), nearVa: v('hrxOsNearVa'), addSph: v('hrxOsAddSph') }
            },
            ar: {
                od: { sph: v('arOdSph'), cyl: v('arOdCyl'), axis: v('arOdAxis') },
                os: { sph: v('arOsSph'), cyl: v('arOsCyl'), axis: v('arOsAxis') }
            },
            vt7: {
                od: { distSph: v('vt7OdDistanceSph'), distCyl: v('vt7OdDistanceCyl'), distAxis: v('vt7OdDistanceAxis'), distPd: v('vt7OdDistancePd'), distVa: v('vt7OdDistanceVa'), nearSph: v('vt7OdNearSph'), nearCyl: v('vt7OdNearCyl'), nearAxis: v('vt7OdNearAxis'), nearPd: v('vt7OdNearPd'), nearVa: v('vt7OdNearVa'), addSph: v('vt7OdAddSph') },
                os: { distSph: v('vt7OsDistanceSph'), distCyl: v('vt7OsDistanceCyl'), distAxis: v('vt7OsDistanceAxis'), distPd: v('vt7OsDistancePd'), distVa: v('vt7OsDistanceVa'), nearSph: v('vt7OsNearSph'), nearCyl: v('vt7OsNearCyl'), nearAxis: v('vt7OsNearAxis'), nearPd: v('vt7OsNearPd'), nearVa: v('vt7OsNearVa'), addSph: v('vt7OsAddSph') }
            },
            frxSpecs: collectSpecs('frx'),
            frxCl: hasCl ? collectCl('frxCl') : null
        };
    }

    if (rx.rxMethod === 'copyPrescription') {
        return { frxSpecs: collectSpecs('copyRx'), frxCl: null };
    }

    if (rx.rxMethod === 'copyPrescriptionCl') {
        return { frxSpecs: null, frxCl: collectCl('copyRxCl') };
    }

    return {};
}

// -- CL Generation for Edit Rx (mirrors form-logic but reads/writes erx_ prefixed fields)
function generateClFromErx(type) {
    const clForm = document.getElementById('erx_frxClForm');
    if (!clForm) return;

    const odSph  = parseFloat(document.getElementById('erx_frxOdDistanceSph')?.value) || 0;
    const odCyl  = parseFloat(document.getElementById('erx_frxOdDistanceCyl')?.value) || 0;
    const odAxis = document.getElementById('erx_frxOdDistanceAxis')?.value || '';
    const osSph  = parseFloat(document.getElementById('erx_frxOsDistanceSph')?.value) || 0;
    const osCyl  = parseFloat(document.getElementById('erx_frxOsDistanceCyl')?.value) || 0;
    const osAxis = document.getElementById('erx_frxOsDistanceAxis')?.value || '';

    function fmt(num) { return (num >= 0 ? '+' : '') + num.toFixed(2); }
    function rnd(n)   { return Math.round(n * 4) / 4; }

    if (type === 'toric') {
        document.getElementById('erx_frxClOdSph').value  = fmt(rnd(odSph));
        document.getElementById('erx_frxClOdCyl').value  = odCyl ? fmt(rnd(odCyl)) : '';
        document.getElementById('erx_frxClOdAxis').value = odAxis;
        document.getElementById('erx_frxClOsSph').value  = fmt(rnd(osSph));
        document.getElementById('erx_frxClOsCyl').value  = osCyl ? fmt(rnd(osCyl)) : '';
        document.getElementById('erx_frxClOsAxis').value = osAxis;
    } else {
        // Spherical equivalent: SPH + CYL/2
        document.getElementById('erx_frxClOdSph').value  = fmt(rnd(odSph + odCyl / 2));
        document.getElementById('erx_frxClOdCyl').value  = '';
        document.getElementById('erx_frxClOdAxis').value = '';
        document.getElementById('erx_frxClOsSph').value  = fmt(rnd(osSph + osCyl / 2));
        document.getElementById('erx_frxClOsCyl').value  = '';
        document.getElementById('erx_frxClOsAxis').value = '';
    }

    clForm.classList.remove('hidden');
}

// ---- Save Rx Overwrite ----
function saveRxCorrection(oldRx, newRxData, patientId) {
    const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
    const patients      = JSON.parse(localStorage.getItem('patients') || '[]');
    const patientIdx    = patients.findIndex(p => p.id === patientId);

    const idx = prescriptions.findIndex(rx => rx.id === oldRx.id);
    if (idx === -1) {
        alert('Rx record not found. Cannot save.');
        return;
    }

    // Overwrite in place — keep id, patientId, dateCreated, rxMethod
    prescriptions[idx] = {
        id:          oldRx.id,
        patientId:   patientId,
        dateCreated: oldRx.dateCreated,
        rxMethod:    oldRx.rxMethod,
        ...newRxData
    };

    localStorage.setItem('prescriptions', JSON.stringify(prescriptions));

    alert(`Rx ${oldRx.id} updated successfully.`);

    // Re-render Rx table
    const patient = patients[patientIdx];
    if (patient) renderRxTable(patient);
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
}

// ---- Delete Rx ----
function deleteRx(rxId, patientId) {
    const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
    const idx = prescriptions.findIndex(rx => rx.id === rxId);
    if (idx === -1) return;

    // Wipe all clinical fields, keep id + dateCreated
    prescriptions[idx] = {
        id:          prescriptions[idx].id,
        dateCreated: prescriptions[idx].dateCreated,
        patientId:   prescriptions[idx].patientId,
        deleted:     true
    };

    localStorage.setItem('prescriptions', JSON.stringify(prescriptions));

    // Re-render Rx table for current patient
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const patient  = patients.find(p => p.id === patientId);
    if (patient) renderRxTable(patient);
}

// ---- Delete Patient ----
function deletePatient(patientId) {
    const patients     = JSON.parse(localStorage.getItem('patients') || '[]');
    const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');

    const idx = patients.findIndex(p => p.id === patientId);
    if (idx === -1) return;

    const rxIds = patients[idx].prescriptions || [];

    // Wipe all Rx records belonging to this patient
    rxIds.forEach(rxId => {
        const rxIdx = prescriptions.findIndex(rx => rx.id === rxId);
        if (rxIdx === -1) return;
        prescriptions[rxIdx] = {
            id:          prescriptions[rxIdx].id,
            dateCreated: prescriptions[rxIdx].dateCreated,
            patientId:   patientId,
            deleted:     true
        };
    });

    // Wipe patient fields, keep id + dateCreated + prescriptions array
    patients[idx] = {
        id:            patients[idx].id,
        dateCreated:   patients[idx].dateCreated,
        prescriptions: rxIds,
        deleted:       true
    };

    localStorage.setItem('patients',      JSON.stringify(patients));
    localStorage.setItem('prescriptions', JSON.stringify(prescriptions));

    // Go back to patient selection
    document.getElementById('viewPatientProfileMenu').classList.add('hidden');
    document.getElementById('viewPatientSelectMenu').classList.remove('hidden');
    renderViewPatientTable();
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

    document.getElementById('deletePatientBtn')?.addEventListener('click', () => {
        const patientId = document.getElementById('viewPatientIdNumber').value.trim();
        const patientName = document.getElementById('viewPatientName').value.trim() || patientId;
        openModal({
            title: 'Delete Patient Record',
            body: `You are about to delete ${patientName}.\nAll associated prescriptions will also be permanently wiped.\nType DELETE to confirm.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            requireTyping: 'DELETE',
            onConfirm: () => deletePatient(patientId)
        });
    });
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