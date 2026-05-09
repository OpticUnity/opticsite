//--------------- JS-Generated Form Components ---------------
// Replaces static HTML form structures with dynamically injected equivalents.
// Keeps index.html lean — forms are built on demand and mounted to their containers.

// ---- Shared Builders ----

// Build one eye division (OD or OS) for any specs-format form
// eyeLabel: 'OD' / 'OS', prefix: e.g. 'hrxOd', 'vt7Od', 'frxOd', 'copyRxOd'
function _buildSpecsEyeDivision(eyeLabel, prefix) {
    return `
        <div class="prescription-format-division">
            <div class="prescription-format-label flex-row">
                <label>${eyeLabel}</label>
                <label>SPH</label>
                <label>CYL</label>
                <label>AXIS</label>
                <label>PD</label>
                <label>VA</label>
            </div>
            <div>
                <label>Distance : </label>
                <input id="${prefix}DistanceSph" maxlength="8">
                <input id="${prefix}DistanceCyl" maxlength="8">
                <input id="${prefix}DistanceAxis" maxlength="3">
                <input id="${prefix}DistancePd" maxlength="5">
                <input id="${prefix}DistanceVa" class="uppercase" maxlength="8">
            </div>
            <div class="prescription-format-near flex-row">
                <label class="prescription-format-side-label">Near : </label>
                <input id="${prefix}NearSph" maxlength="8">
                <input id="${prefix}NearCyl" maxlength="8">
                <input id="${prefix}NearAxis" maxlength="3">
                <input id="${prefix}NearPd" maxlength="5">
                <input id="${prefix}NearVa" class="uppercase" maxlength="8">
            </div>
            <div class="prescription-format-add">
                <label class="prescription-format-side-label">Add : </label>
                <input id="${prefix}AddSph" maxlength="8">
            </div>
        </div>`;
}

// Build one eye row for a CL form
function _buildClEyeRow(eyeLabel, prefix) {
    return `
        <div class="flex-row">
            <label class="contact-lens-side-label">${eyeLabel} : </label>
            <input id="${prefix}Sph" maxlength="8">
            <input id="${prefix}Cyl" maxlength="8">
            <input id="${prefix}Axis" maxlength="3">
            <input id="${prefix}Bc" maxlength="5">
            <input id="${prefix}Dia" maxlength="5">
            <input id="${prefix}Va" class="uppercase" maxlength="8">
        </div>`;
}

// ---- Shared Customer/Patient Form Builder ----

function buildPersonForm(type) {
    const isPatient = type === 'patient';

    const capitalized = isPatient
        ? 'Patient'
        : 'Customer';

    const lower = isPatient
        ? 'patient'
        : 'customer';

    const section = document.createElement('div');
    section.classList.add('new-person-form');
    section.innerHTML = `
        <h2>New ${capitalized}</h2>

        <form id="${lower}Form" class="fill-out-form">

          <label for="${lower}IdInput">${capitalized} ID :</label>
          <input id="${lower}IdInput" readonly>

          <label>Date Created:</label>
          <div class="date-field">
            <input id="${lower}DateCreatedMM" type="text" maxlength="2" placeholder="MM" class="date-part">
            <span> / </span>
            <input id="${lower}DateCreatedDD" type="text" maxlength="2" placeholder="DD" class="date-part">
            <span> / </span>
            <input id="${lower}DateCreatedYYYY" type="text" maxlength="4" placeholder="YYYY" class="date-part">
          </div>

          <label for="${lower}InputName">Name :</label>
          <input
            id="${lower}InputName"
            class="uppercase"
            placeholder="NAME SURNAME"
            maxlength="30"
          >

          <label for="${lower}InputNumber">Contact Number :</label>
          <input id="${lower}InputNumber" maxlength="11">

          <label for="${lower}InputEmail">Email :</label>
          <input
            id="${lower}InputEmail"
            maxlength="40"
            class="lowercase"
          >

          <label>Sex :</label>
          <select id="${lower}InputSex" name="sex">
            <option value="" disabled selected>- SELECT -</option>
            <option value="male">MALE</option>
            <option value="female">FEMALE</option>
          </select>

          <label for="${lower}InputAddress">Address :</label>
          <input id="${lower}InputAddress" maxlength="30">

          <label for="${lower}InputBirthday">Birthday :</label>
          <div class="date-field">
            <input id="${lower}BirthdayMM" type="text" maxlength="2" placeholder="MM" class="date-part">
            <span> / </span>
            <input id="${lower}BirthdayDD" type="text" maxlength="2" placeholder="DD" class="date-part">
            <span> / </span>
            <input id="${lower}BirthdayYYYY" type="text" maxlength="4" placeholder="YYYY" class="date-part">
          </div>

          <label for="${lower}InputAge">Age :</label>
          <input id="${lower}InputAge" readonly>

          <div class="form-action-buttons flex-column">
            <button type="submit" id="${lower}AddBtn">Add</button>
            <a href="#recordsPage" class="back-btn-link">Back</a>
          </div>

        </form>
    `;

    return section;
}

// ---- HRx Block (injected inside mainEyeExaminationForm) ----

function buildHrxBlock() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; flex-direction:column; align-items:center; width:100%;';
    wrapper.innerHTML = `
        <label class="eye-test-label-hrx">HRX</label>
        <div class="prescription-format-form">
            ${_buildSpecsEyeDivision('OD', 'hrxOd')}
            ${_buildSpecsEyeDivision('OS', 'hrxOs')}
        </div>
        <div class="prescription-format-notes">
            <label for="hrxNotes" class="prescription-format-notes-label">Notes : </label>
            <textarea id="hrxNotes"></textarea>
        </div>`;
    return wrapper;
}

// ---- VT7 Block (injected inside mainEyeExaminationForm) ----

function buildVt7Block() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; flex-direction:column; align-items:center; width:100%;';
    wrapper.innerHTML = `
        <h4 class="vt7-header">VT 7</h4>
        <div class="prescription-format-form">
            ${_buildSpecsEyeDivision('OD', 'vt7Od')}
            ${_buildSpecsEyeDivision('OS', 'vt7Os')}
        </div>
        <div class="prescription-format-notes">
            <label for="vt7Notes" class="prescription-format-notes-label">Notes : </label>
            <textarea id="vt7Notes"></textarea>
        </div>`;
    return wrapper;
}

// ---- Final Rx Form ----

function buildFrxForm() {
    const form = document.createElement('form');
    form.id = 'mainFinalPrescription';
    form.className = 'main-final-prescription fill-out-form hidden';

    form.innerHTML = `
        <div class="final-prescription-container">
            <h3 id="frxHeader" class="frx-header">Final Prescription</h3>
            <p>Apply necessary adjustment and modifications below</p>
            <div class="prescription-format-form">
                ${_buildSpecsEyeDivision('OD', 'frxOd')}
                ${_buildSpecsEyeDivision('OS', 'frxOs')}
            </div>
            <div class="prescription-format-notes flex-column">
                <label for="frxNotes" class="prescription-format-notes-label">Notes :</label>
                <textarea id="frxNotes"></textarea>
            </div>
        </div>

        <div class="contact-lens-frx-btn-selection">
            <h3>Generate Contact Lens Rx</h3>
            <p>Choose whether to generate toric or spherical equivalent contact lens prescription (Optional)</p>
            <div class="contact-lens-frx-btn-container flex-row">
                <button type="button" id="generateToricBtn">Toric</button>
                <button type="button" id="generateSphereBtn">Sphere</button>
            </div>
        </div>

        <div id="frxClForm" class="contact-lens-form hidden">
            <h3>Contact Lens Prescription</h3>
            <p>Apply necessary adjustment and modifications below</p>
            <div class="flex-column">
                <div class="contact-lens-label flex-row">
                    <label>SPH</label>
                    <label>CYL</label>
                    <label>AXIS</label>
                    <label>BC</label>
                    <label>DIA</label>
                    <label>VA</label>
                </div>
                ${_buildClEyeRow('OD', 'frxClOd')}
                ${_buildClEyeRow('OS', 'frxClOs')}
            </div>
            <p>(Above are converted contact lens power from the final prescription)</p>
            <div class="prescription-format-notes flex-column">
                <label for="frxClNotes" class="prescription-format-notes-label">Notes :</label>
                <textarea id="frxClNotes"></textarea>
            </div>
        </div>`;

    return form;
}

// ---- Copy Rx Specs Form ----

function buildCopyRxSpecsForm() {
    const form = document.createElement('form');
    form.id = 'copyPrescriptionForm';
    form.className = 'copy-prescription-form hidden';

    form.innerHTML = `
        <h4 class="eye-test-label-hrx">Prescription Details</h4>
        <div class="prescription-format-form">
            ${_buildSpecsEyeDivision('OD', 'copyRxOd')}
            ${_buildSpecsEyeDivision('OS', 'copyRxOs')}
        </div>
        <div class="prescription-format-notes">
            <label for="copyRxNotes" class="prescription-format-notes-label">Notes : </label>
            <textarea id="copyRxNotes"></textarea>
        </div>`;

    return form;
}

// ---- Copy Rx CL Form ----

function buildCopyRxClForm() {
    const form = document.createElement('form');
    form.id = 'copyPrescriptionFormCl';
    form.className = 'copy-prescription-form-cl hidden';

    form.innerHTML = `
        <div class="contact-lens-form">
            <h4 class="copy-prescription-form-cl-header">Contact Lens Prescription Details</h4>
            <div class="copy-prescription-contact-lens-label flex-row">
                <label>SPH</label>
                <label>CYL</label>
                <label>AXIS</label>
                <label>BC</label>
                <label>DIA</label>
                <label>VA</label>
            </div>
            ${_buildClEyeRow('OD', 'copyRxClOd')}
            ${_buildClEyeRow('OS', 'copyRxClOs')}
        </div>
        <div class="prescription-format-notes copy-rx-cl-notes-container flex-column">
            <label for="copyRxClNotes" class="prescription-format-notes-label">Notes :</label>
            <textarea id="copyRxClNotes"></textarea>
        </div>`;

    return form;
}

// ---- AR + CL Parameters Block ----

function buildArClpBlock() {
    const wrapper = document.createElement('div');
    wrapper.className = 'ar-clp-container flex-row';
    wrapper.innerHTML = `

        <!-- AR -->
        <div class="ar-form-container flex-column">
            <h4>AR</h4>
            <div>
                <div class="ar-label-container">
                    <label class="ar-sph-label">SPH</label>
                    <label class="ar-cyl-label">CYL</label>
                    <label class="ar-axis-label">AXIS</label>
                    <label class="ar-kr-label">KR</label>
                </div>
                <div>
                    <label>OD : </label>
                    <input id="arOdSph" maxlength="8">
                    <input id="arOdCyl" maxlength="8">
                    <input id="arOdAxis" maxlength="3">
                    <input id="arOdKr" maxlength="6">
                </div>
                <div>
                    <label>OS : </label>
                    <input id="arOsSph" maxlength="8">
                    <input id="arOsCyl" maxlength="8">
                    <input id="arOsAxis" maxlength="3">
                    <input id="arOsKr" maxlength="6">
                </div>
            </div>
            <div class="ar-form-notes">
                <label for="arNotes">Notes : </label>
                <textarea id="arNotes"></textarea>
            </div>
        </div>

        <div class="v-line-ar-clp"></div>

        <!-- CL Parameters -->
        <div>
            <h4>CL Parameters</h4>
            <div>
                <div class="clp-label-container">
                    <label>BC</label>
                    <label>HVID</label>
                    <label>DIA</label>
                </div>
                <div>
                    <label>OD : </label>
                    <input id="clpOdBc" maxlength="5">
                    <input id="clpOdHvid" maxlength="5">
                    <input id="clpOdDia" maxlength="5">
                </div>
                <div>
                    <label>OS : </label>
                    <input id="clpOsBc" maxlength="5">
                    <input id="clpOsHvid" maxlength="5">
                    <input id="clpOsDia" maxlength="5">
                </div>
            </div>
            <div class="clp-form-notes">
                <label for="clParametersNotes">Notes : </label>
                <textarea id="clParametersNotes"></textarea>
            </div>
        </div>`;

    return wrapper;
}

// ---- Edit Rx Full UI ----
// Builds a full edit UI matching the original form layout, pre-filled with rx data

function buildEditRxUI(rx) {
    const wrapper = document.createElement('div');
    wrapper.className = 'edit-rx-ui';

    const isEyeExam  = rx.rxMethod === 'eyeExam';
    const isCopyRx   = rx.rxMethod === 'copyPrescription';
    const isCopyRxCl = rx.rxMethod === 'copyPrescriptionCl';

    // -- Pre-fill helper --
    function pf(val) { return val || ''; }

    // -- Build pre-filled specs eye division --
    function prefilledSpecsEye(eyeLabel, prefix, data) {
        const d = data || {};
        return `
            <div class="prescription-format-division">
                <div class="prescription-format-label flex-row">
                    <label>${eyeLabel}</label>
                    <label>SPH</label><label>CYL</label><label>AXIS</label>
                    <label>PD</label><label>VA</label>
                </div>
                <div>
                    <label>Distance : </label>
                    <input id="erx_${prefix}DistanceSph"  maxlength="8" value="${pf(d.distSph)}">
                    <input id="erx_${prefix}DistanceCyl"  maxlength="8" value="${pf(d.distCyl)}">
                    <input id="erx_${prefix}DistanceAxis" maxlength="3" value="${pf(d.distAxis)}">
                    <input id="erx_${prefix}DistancePd"   maxlength="5" value="${pf(d.distPd)}">
                    <input id="erx_${prefix}DistanceVa"   maxlength="8" value="${pf(d.distVa)}" class="uppercase">
                </div>
                <div class="prescription-format-near flex-row">
                    <label class="prescription-format-side-label">Near : </label>
                    <input id="erx_${prefix}NearSph"  maxlength="8" value="${pf(d.nearSph)}">
                    <input id="erx_${prefix}NearCyl"  maxlength="8" value="${pf(d.nearCyl)}">
                    <input id="erx_${prefix}NearAxis" maxlength="3" value="${pf(d.nearAxis)}">
                    <input id="erx_${prefix}NearPd"   maxlength="5" value="${pf(d.nearPd)}">
                    <input id="erx_${prefix}NearVa"   maxlength="8" value="${pf(d.nearVa)}" class="uppercase">
                </div>
                <div class="prescription-format-add">
                    <label class="prescription-format-side-label">Add : </label>
                    <input id="erx_${prefix}AddSph" maxlength="8" value="${pf(d.addSph)}">
                </div>
            </div>`;
    }

    // -- Build pre-filled CL eye row --
    function prefilledClEye(eyeLabel, prefix, data) {
        const d = data || {};
        return `
            <div class="flex-row">
                <label class="contact-lens-side-label">${eyeLabel} : </label>
                <input id="erx_${prefix}Sph"  maxlength="8" value="${pf(d.sph)}">
                <input id="erx_${prefix}Cyl"  maxlength="8" value="${pf(d.cyl)}">
                <input id="erx_${prefix}Axis" maxlength="3" value="${pf(d.axis)}">
                <input id="erx_${prefix}Bc"   maxlength="5" value="${pf(d.bc)}">
                <input id="erx_${prefix}Dia"  maxlength="5" value="${pf(d.dia)}">
                <input id="erx_${prefix}Va"   maxlength="8" value="${pf(d.va)}" class="uppercase">
            </div>`;
    }

    // -- Build form content per method --
    let formContent = '';

    if (isEyeExam) {
        const hrx = rx.hrx || {};
        const ar  = rx.ar  || {};
        const vt7 = rx.vt7 || {};
        const frx = rx.frxSpecs || {};
        const cl  = rx.frxCl;
        const uva = rx.uva || {};
        const ph  = rx.ph  || {};

        formContent = `
            <!-- Preliminary -->
            <div class="eye-examination-form flex-column">
                <h4 class="preliminary-header">Preliminary</h4>
                <div class="eye-examination-form-preliminary flex-row">
                    <div class="preliminary-uva flex-column">
                        <label class="eye-test-label-uva">UVA</label>
                        <div>
                            <div class="flex-row">
                                <label class="eye-test-label-uva-dist">DIST</label>
                                <label class="eye-test-label-uva-near">NEAR</label>
                            </div>
                            <div class="flex-row">
                                <label class="eye-test-label-0">OD : </label>
                                <input id="erx_uvaOdDist" class="uppercase" maxlength="8" value="${pf(uva.odDist)}">
                                <input id="erx_uvaOdNear" class="uppercase" maxlength="8" value="${pf(uva.odNear)}">
                            </div>
                            <div class="flex-row">
                                <label class="eye-test-label-0">OS : </label>
                                <input id="erx_uvaOsDist" class="uppercase" maxlength="8" value="${pf(uva.osDist)}">
                                <input id="erx_uvaOsNear" class="uppercase" maxlength="8" value="${pf(uva.osNear)}">
                            </div>
                            <div class="flex-row">
                                <label class="eye-test-label-0">OU : </label>
                                <input id="erx_uvaOuDist" class="uppercase" maxlength="8" value="${pf(uva.ouDist)}">
                                <input id="erx_uvaOuNear" class="uppercase" maxlength="8" value="${pf(uva.ouNear)}">
                            </div>
                        </div>
                    </div>
                    <div class="v-line-uva-pa"></div>
                    <div class="preliminary-ph flex-column">
                        <label class="eye-test-label-ph">PINHOLE</label>
                        <div>
                            <div class="flex-row">
                                <label class="eye-test-label-ph-dist">DIST</label>
                            </div>
                            <div class="flex-row">
                                <label class="eye-test-label-1">OD : </label>
                                <input id="erx_phOd" class="uppercase" maxlength="8" value="${pf(ph.od)}">
                            </div>
                            <div class="flex-row">
                                <label class="eye-test-label-1">OS : </label>
                                <input id="erx_phOs" class="uppercase" maxlength="8" value="${pf(ph.os)}">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- HRx -->
                <div style="display:flex;flex-direction:column;align-items:center;width:100%;">
                    <label class="eye-test-label-hrx">HRX</label>
                    <div class="prescription-format-form">
                        ${prefilledSpecsEye('OD', 'hrxOd', hrx.od)}
                        ${prefilledSpecsEye('OS', 'hrxOs', hrx.os)}
                    </div>
                </div>
            </div>

            <!-- AR + CLP -->
            <div style="display:flex;flex-direction:column;align-items:center;width:100%;">
                <div class="ar-clp-container flex-row">
                    <div class="ar-form-container flex-column">
                        <h4>AR</h4>
                        <div>
                            <div class="ar-label-container">
                                <label class="ar-sph-label">SPH</label>
                                <label class="ar-cyl-label">CYL</label>
                                <label class="ar-axis-label">AXIS</label>
                                <label class="ar-kr-label">KR</label>
                            </div>
                            <div>
                                <label>OD : </label>
                                <input id="erx_arOdSph"  maxlength="8" value="${pf(ar.od?.sph)}">
                                <input id="erx_arOdCyl"  maxlength="8" value="${pf(ar.od?.cyl)}">
                                <input id="erx_arOdAxis" maxlength="3" value="${pf(ar.od?.axis)}">
                                <input id="erx_arOdKr"   maxlength="6" value="">
                            </div>
                            <div>
                                <label>OS : </label>
                                <input id="erx_arOsSph"  maxlength="8" value="${pf(ar.os?.sph)}">
                                <input id="erx_arOsCyl"  maxlength="8" value="${pf(ar.os?.cyl)}">
                                <input id="erx_arOsAxis" maxlength="3" value="${pf(ar.os?.axis)}">
                                <input id="erx_arOsKr"   maxlength="6" value="">
                            </div>
                        </div>
                        <div class="ar-form-notes">
                            <label>Notes : </label>
                            <textarea id="erx_arNotes">${pf(rx.arNotes)}</textarea>
                        </div>
                    </div>
                    <div class="v-line-ar-clp"></div>
                    <div>
                        <h4>CL Parameters</h4>
                        <div>
                            <div class="clp-label-container">
                                <label>BC</label><label>HVID</label><label>DIA</label>
                            </div>
                            <div>
                                <label>OD : </label>
                                <input id="erx_clpOdBc"   maxlength="5" value="">
                                <input id="erx_clpOdHvid" maxlength="5" value="">
                                <input id="erx_clpOdDia"  maxlength="5" value="">
                            </div>
                            <div>
                                <label>OS : </label>
                                <input id="erx_clpOsBc"   maxlength="5" value="">
                                <input id="erx_clpOsHvid" maxlength="5" value="">
                                <input id="erx_clpOsDia"  maxlength="5" value="">
                            </div>
                        </div>
                        <div class="clp-form-notes">
                            <label>Notes : </label>
                            <textarea id="erx_clParametersNotes">${pf(rx.clParametersNotes)}</textarea>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VT7 -->
            <div style="display:flex;flex-direction:column;align-items:center;width:100%;">
                <h4 class="vt7-header">VT 7</h4>
                <div class="prescription-format-form">
                    ${prefilledSpecsEye('OD', 'vt7Od', vt7.od)}
                    ${prefilledSpecsEye('OS', 'vt7Os', vt7.os)}
                </div>
                <div class="prescription-format-notes">
                    <label class="prescription-format-notes-label">Notes : </label>
                    <textarea id="erx_vt7Notes">${pf(rx.vt7Notes)}</textarea>
                </div>
            </div>

            <!-- Final Rx -->
            <div class="final-prescription-container">
                <h3 class="frx-header">Final Prescription</h3>
                <p>Apply necessary adjustment and modifications below</p>
                <div class="prescription-format-form">
                    ${prefilledSpecsEye('OD', 'frxOd', frx.od)}
                    ${prefilledSpecsEye('OS', 'frxOs', frx.os)}
                </div>
                <div class="prescription-format-notes flex-column">
                    <label class="prescription-format-notes-label">Notes :</label>
                    <textarea id="erx_frxNotes">${pf(frx.notes)}</textarea>
                </div>
            </div>

            <!-- CL Gen Buttons -->
            <div class="contact-lens-frx-btn-selection">
                <h3>Generate Contact Lens Rx</h3>
                <p>Choose whether to generate toric or spherical equivalent contact lens prescription (Optional)</p>
                <div class="contact-lens-frx-btn-container flex-row">
                    <button type="button" id="erx_generateToricBtn">Toric</button>
                    <button type="button" id="erx_generateSphereBtn">Sphere</button>
                </div>
            </div>

            <!-- CL Rx -->
            <div id="erx_frxClForm" class="contact-lens-form ${cl ? '' : 'hidden'}">
                <h3>Contact Lens Prescription</h3>
                <p>Apply necessary adjustment and modifications below</p>
                <div class="flex-column">
                    <div class="contact-lens-label flex-row">
                        <label>SPH</label><label>CYL</label><label>AXIS</label>
                        <label>BC</label><label>DIA</label><label>VA</label>
                    </div>
                    ${prefilledClEye('OD', 'frxClOd', cl?.od)}
                    ${prefilledClEye('OS', 'frxClOs', cl?.os)}
                </div>
                <div class="prescription-format-notes flex-column">
                    <label class="prescription-format-notes-label">Notes :</label>
                    <textarea id="erx_frxClNotes">${pf(cl?.notes)}</textarea>
                </div>
            </div>`;
    }

    if (isCopyRx) {
        const frx = rx.frxSpecs || {};
        formContent = `
            <h4 class="eye-test-label-hrx">Prescription Details</h4>
            <div class="prescription-format-form">
                ${prefilledSpecsEye('OD', 'copyRxOd', frx.od)}
                ${prefilledSpecsEye('OS', 'copyRxOs', frx.os)}
            </div>
            <div class="prescription-format-notes">
                <label class="prescription-format-notes-label">Notes : </label>
                <textarea id="erx_copyRxNotes">${pf(frx.notes)}</textarea>
            </div>`;
    }

    if (isCopyRxCl) {
        const cl = rx.frxCl || {};
        formContent = `
            <div class="contact-lens-form">
                <h4 class="copy-prescription-form-cl-header">Contact Lens Prescription Details</h4>
                <div class="copy-prescription-contact-lens-label flex-row">
                    <label>SPH</label><label>CYL</label><label>AXIS</label>
                    <label>BC</label><label>DIA</label><label>VA</label>
                </div>
                ${prefilledClEye('OD', 'copyRxClOd', cl.od)}
                ${prefilledClEye('OS', 'copyRxClOs', cl.os)}
            </div>
            <div class="prescription-format-notes copy-rx-cl-notes-container flex-column">
                <label class="prescription-format-notes-label">Notes :</label>
                <textarea id="erx_copyRxClNotes">${pf(cl.notes)}</textarea>
            </div>`;
    }

    wrapper.innerHTML = `
        <div class="edit-rx-header">
            <h3>Prescription</h3>
            <h4>ID Number: <span class="font-weight-normal">${rx.id}</span></h4>
            <div class="edit-rx-date-created">
                <strong>Date Created:</strong> 
                <span>${rx.dateCreated || 'N/A'}</span>
            </div>

            <p class="edit-rx-note">Any modification below will overwrite the prescription save permanently.</p>
        </div>
        <div class="edit-rx-form-body">
            ${formContent}
        </div>
        <div class="edit-rx-actions view-patient-action-btn-container">
            <div class="view-patient-action-btn-item">
                <h4>Back to Profile</h4>
                <button id="cancelEditRxBtn">Back</button>
            </div>
            <div class="view-patient-action-btn-item">
                <h4>Save Correction</h4>
                <button id="saveEditRxBtn">Save</button>
            </div>
        </div>`;

    return wrapper;
}

// ---- Preliminary Block (UVA + PH) ----

function buildPreliminaryBlock() {
    const wrapper = document.createElement('div');
    wrapper.className = 'eye-examination-form-preliminary flex-row';
    wrapper.innerHTML = `
        <div class="preliminary-uva flex-column">
            <label class="eye-test-label-uva">UVA</label>
            <div>
                <div class="flex-row">
                    <label class="eye-test-label-uva-dist">DIST</label>
                    <label class="eye-test-label-uva-near">NEAR</label>
                </div>
                <div class="flex-row">
                    <label class="eye-test-label-0">OD : </label>
                    <input id="uvaOdDist" class="uppercase" maxlength="8">
                    <input id="uvaOdNear" class="uppercase" maxlength="8">
                </div>
                <div class="flex-row">
                    <label class="eye-test-label-0">OS : </label>
                    <input id="uvaOsDist" class="uppercase" maxlength="8">
                    <input id="uvaOsNear" class="uppercase" maxlength="8">
                </div>
                <div class="flex-row">
                    <label class="eye-test-label-0">OU : </label>
                    <input id="uvaOuDist" class="uppercase" maxlength="8">
                    <input id="uvaOuNear" class="uppercase" maxlength="8">
                </div>
            </div>
        </div>

        <div class="v-line-uva-pa"></div>

        <div class="preliminary-ph flex-column">
            <label class="eye-test-label-ph">PINHOLE</label>
            <div>
                <div class="flex-row">
                    <label class="eye-test-label-ph-dist">DIST</label>
                </div>
                <div class="flex-row">
                    <label class="eye-test-label-1">OD : </label>
                    <input id="phOd" class="uppercase" maxlength="8">
                </div>
                <div class="flex-row">
                    <label class="eye-test-label-1">OS : </label>
                    <input id="phOs" class="uppercase" maxlength="8">
                </div>
            </div>
        </div>`;
    return wrapper;
}

// ---- Mount All Forms ----

function mountForms() {

    // ---- Customer / Patient Forms ----

    document
        .getElementById('customerFormMount')
        ?.replaceWith(buildPersonForm('customer'));

    document
        .getElementById('patientFormMount')
        ?.replaceWith(buildPersonForm('patient'));


    // ---- Copy Rx ----

    document
        .getElementById('copyRxSpecsMount')
        ?.replaceWith(buildCopyRxSpecsForm());

    document
        .getElementById('copyRxClMount')
        ?.replaceWith(buildCopyRxClForm());


    // ---- Final Rx ----

    document
        .getElementById('frxMount')
        ?.replaceWith(buildFrxForm());


    // ---- AR + CL Parameters ----
    document.getElementById('arClpMount')?.replaceWith(buildArClpBlock());

    // ---- Preliminary (UVA + PH) ----
    document.getElementById('preliminaryMount')?.replaceWith(buildPreliminaryBlock());

    // ---- HRx + VT7 ----

    const hrxMount = document.getElementById('hrxMount');
    const vt7Mount = document.getElementById('vt7Mount');

    hrxMount?.replaceWith(buildHrxBlock());
    vt7Mount?.replaceWith(buildVt7Block());
}

window.addEventListener('load', mountForms);