//--------------- Prescription Save Logic ---------------
// Handles saving for all 3 Rx methods

// -- Helper: read value or null --
function val(id) {
    const el = document.getElementById(id);
    return el ? (el.value.trim() || null) : null;
}

// -- Collect Patient Notes (always saved back to patient record) --
function collectPatientNotes() {
    return {
        patientNotes: val('patientProfilePatientNotes'),
        genHealthHx:  val('patientProfileGenHealthHxNotes'),
        ocuHx:        val('patientProfileOcuHxNotes')
    };
}

// -- Collect Eye Exam Data --
function collectEyeExamData() {
    return {
        // Preliminary
        uva: {
            odDist: val('uvaOdDist'), odNear: val('uvaOdNear'),
            osDist: val('uvaOsDist'), osNear: val('uvaOsNear')
        },
        ph: {
            od: val('phOd'),
            os: val('phOs')
        },
        // HRx
        hrx: {
            od: {
                distSph: val('hrxOdDistanceSph'), distCyl: val('hrxOdDistanceCyl'),
                distAxis: val('hrxOdDistanceAxis'), distPd: val('hrxOdDistancePd'),
                distVa: val('hrxOdDistanceVa'), nearSph: val('hrxOdNearSph'),
                nearCyl: val('hrxOdNearCyl'), nearAxis: val('hrxOdNearAxis'),
                nearPd: val('hrxOdNearPd'), nearVa: val('hrxOdNearVa'),
                addSph: val('hrxOdAddSph')
            },
            os: {
                distSph: val('hrxOsDistanceSph'), distCyl: val('hrxOsDistanceCyl'),
                distAxis: val('hrxOsDistanceAxis'), distPd: val('hrxOsDistancePd'),
                distVa: val('hrxOsDistanceVa'), nearSph: val('hrxOsNearSph'),
                nearCyl: val('hrxOsNearCyl'), nearAxis: val('hrxOsNearAxis'),
                nearPd: val('hrxOsNearPd'), nearVa: val('hrxOsNearVa'),
                addSph: val('hrxOsAddSph')
            }
        },
        // AR
        ar: {
            od: { sph: val('arOdSph'), cyl: val('arOdCyl'), axis: val('arOdAxis') },
            os: { sph: val('arOsSph'), cyl: val('arOsCyl'), axis: val('arOsAxis') }
        },
        // VT7
        vt7: {
            od: {
                distSph: val('vt7OdDistanceSph'), distCyl: val('vt7OdDistanceCyl'),
                distAxis: val('vt7OdDistanceAxis'), distPd: val('vt7OdDistancePd'),
                distVa: val('vt7OdDistanceVa'), nearSph: val('vt7OdNearSph'),
                nearCyl: val('vt7OdNearCyl'), nearAxis: val('vt7OdNearAxis'),
                nearPd: val('vt7OdNearPd'), nearVa: val('vt7OdNearVa'),
                addSph: val('vt7OdAddSph')
            },
            os: {
                distSph: val('vt7OsDistanceSph'), distCyl: val('vt7OsDistanceCyl'),
                distAxis: val('vt7OsDistanceAxis'), distPd: val('vt7OsDistancePd'),
                distVa: val('vt7OsDistanceVa'), nearSph: val('vt7OsNearSph'),
                nearCyl: val('vt7OsNearCyl'), nearAxis: val('vt7OsNearAxis'),
                nearPd: val('vt7OsNearPd'), nearVa: val('vt7OsNearVa'),
                addSph: val('vt7OsAddSph')
            }
        },
        // Final Rx Specs
        frxSpecs: {
            od: {
                distSph: val('frxOdDistanceSph'), distCyl: val('frxOdDistanceCyl'),
                distAxis: val('frxOdDistanceAxis'), distPd: val('frxOdDistancePd'),
                distVa: val('frxOdDistanceVa'), nearSph: val('frxOdNearSph'),
                nearCyl: val('frxOdNearCyl'), nearAxis: val('frxOdNearAxis'),
                nearPd: val('frxOdNearPd'), nearVa: val('frxOdNearVa'),
                addSph: val('frxOdAddSph')
            },
            os: {
                distSph: val('frxOsDistanceSph'), distCyl: val('frxOsDistanceCyl'),
                distAxis: val('frxOsDistanceAxis'), distPd: val('frxOsDistancePd'),
                distVa: val('frxOsDistanceVa'), nearSph: val('frxOsNearSph'),
                nearCyl: val('frxOsNearCyl'), nearAxis: val('frxOsNearAxis'),
                nearPd: val('frxOsNearPd'), nearVa: val('frxOsNearVa'),
                addSph: val('frxOsAddSph')
            },
            notes: val('frxNotes')
        },
        // Final Rx CL — only if form is visible
        frxCl: document.getElementById('frxClForm').classList.contains('hidden') ? null : {
            od: {
                sph: val('frxClOdSph'), cyl: val('frxClOdCyl'),
                axis: val('frxClOdAxis'), bc: val('frxClOdBc'),
                dia: val('frxClOdDia'), va: val('frxClOdVa')
            },
            os: {
                sph: val('frxClOsSph'), cyl: val('frxClOsCyl'),
                axis: val('frxClOsAxis'), bc: val('frxClOsBc'),
                dia: val('frxClOsDia'), va: val('frxClOsVa')
            },
            notes: val('frxClNotes')
        }
    };
}

// -- Collect Copy Rx Specs Data --
function collectCopyRxData() {
    return {
        frxSpecs: {
            od: {
                distSph: val('copyRxOdDistanceSph'), distCyl: val('copyRxOdDistanceCyl'),
                distAxis: val('copyRxOdDistanceAxis'), distPd: val('copyRxOdDistancePd'),
                distVa: val('copyRxOdDistanceVa'), nearSph: val('copyRxOdNearSph'),
                nearCyl: val('copyRxOdNearCyl'), nearAxis: val('copyRxOdNearAxis'),
                nearPd: val('copyRxOdNearPd'), nearVa: val('copyRxOdNearVa'),
                addSph: val('copyRxOdAddSph')
            },
            os: {
                distSph: val('copyRxOsDistanceSph'), distCyl: val('copyRxOsDistanceCyl'),
                distAxis: val('copyRxOsDistanceAxis'), distPd: val('copyRxOsDistancePd'),
                distVa: val('copyRxOsDistanceVa'), nearSph: val('copyRxOsNearSph'),
                nearCyl: val('copyRxOsNearCyl'), nearAxis: val('copyRxOsNearAxis'),
                nearPd: val('copyRxOsNearPd'), nearVa: val('copyRxOsNearVa'),
                addSph: val('copyRxOsAddSph')
            },
            notes: val('copyRxNotes')
        },
        frxCl: null
    };
}

// -- Collect Copy Rx CL Data --
function collectCopyRxClData() {
    return {
        frxSpecs: null,
        frxCl: {
            od: {
                sph: val('copyRxClOdSph'), cyl: val('copyRxClOdCyl'),
                axis: val('copyRxClOdAxis'), bc: val('copyRxClOdBc'),
                dia: val('copyRxClOdDia'), va: val('copyRxClOdVa')
            },
            os: {
                sph: val('copyRxClOsSph'), cyl: val('copyRxClOsCyl'),
                axis: val('copyRxClOsAxis'), bc: val('copyRxClOsBc'),
                dia: val('copyRxClOsDia'), va: val('copyRxClOsVa')
            },
            notes: val('copyRxClNotes')
        }
    };
}

// -- Main Save Handler --
function handleAddPrescription() {
    const rxMethod = document.getElementById('rxSelect').value;
    const patientId = document.getElementById('patientProfileIdNumber').value.trim();
    const prescriptionId = document.getElementById('prescriptionID').value.trim();

    // -- Validate based on active method --
    if (rxMethod === 'eyeExam') {
        const odValid = isEyeValid('frxOdDistanceSph', 'frxOdDistanceCyl', 'frxOdDistanceAxis');
        const osValid = isEyeValid('frxOsDistanceSph', 'frxOsDistanceCyl', 'frxOsDistanceAxis');
        if (!odValid || !osValid) {
            alert("Final Rx minimum required per eye: SPH alone, or CYL + AXIS together.");
            return;
        }
    } else if (rxMethod === 'copyPrescription') {
        if (!validateCopyRx()) return;
    } else if (rxMethod === 'copyPrescriptionCl') {
        if (!validateCopyRxCl()) return;
    }

    // -- Collect prescription data based on method --
    let rxData = {};
    if (rxMethod === 'eyeExam') {
        rxData = collectEyeExamData();
    } else if (rxMethod === 'copyPrescription') {
        rxData = collectCopyRxData();
    } else if (rxMethod === 'copyPrescriptionCl') {
        rxData = collectCopyRxClData();
    }

    // -- Build prescription record --
    const prescription = {
        id: prescriptionId,
        patientId: patientId,
        dateCreated: `${val('prescriptionDateCreatedYYYY')}-${val('prescriptionDateCreatedMM')}-${val('prescriptionDateCreatedDD')}`,
        rxMethod: rxMethod,
        ...rxData
    };

    // -- Save prescription to localStorage --
    const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
    prescriptions.push(prescription);
    localStorage.setItem('prescriptions', JSON.stringify(prescriptions));

    // -- Update patient record: push Rx ID into patient.prescriptions array --
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const patientIndex = patients.findIndex(p => p.id === patientId);
    if (patientIndex !== -1) {
        if (!patients[patientIndex].prescriptions) {
            patients[patientIndex].prescriptions = [];
        }
        patients[patientIndex].prescriptions.push(prescriptionId);

        // -- Also save patient notes back to patient record --
        const notes = collectPatientNotes();
        patients[patientIndex].patientNotes = notes.patientNotes;
        patients[patientIndex].genHealthHx  = notes.genHealthHx;
        patients[patientIndex].ocuHx        = notes.ocuHx;

        localStorage.setItem('patients', JSON.stringify(patients));
    }

    alert(`Prescription ${prescriptionId} saved successfully!`);

    // -- Reset form back to select patient --
    changePatient();
}

// -- Wire up Add button --
window.addEventListener('load', () => {
    document.getElementById('addPrescriptionBtn')?.addEventListener('click', handleAddPrescription);
});