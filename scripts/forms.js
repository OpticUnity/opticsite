//--------------- JS-Generated Form Components ---------------
// Replaces static HTML form structures with dynamically injected equivalents.

// Global state arrays for AR Images
window._arImages = [];
window._erxArImages = [];

// Lightbox helper function
function openLightbox(base64Src) {
    let modal = document.getElementById('arLightboxModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'arLightboxModal';
        modal.className = 'lightbox-modal';
        modal.innerHTML = `
            <div class="lightbox-content-container">
                <button class="lightbox-close-btn">&times;</button>
                <img id="lightboxImg" src="" alt="AR Slip Scan">
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.lightbox-close-btn').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
    const img = modal.querySelector('#lightboxImg');
    img.src = base64Src;
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}
window.openLightbox = openLightbox;

// Handle files selection, canvas compression, and array storage
function handleArImageUpload(files, targetArray, galleryElement) {
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Compression boundaries: max 600px width, max 800px height
                const maxW = 600;
                const maxH = 800;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxW) {
                        height = Math.round((height * maxW) / width);
                        width = maxW;
                    }
                } else {
                    if (height > maxH) {
                        width = Math.round((width * maxH) / height);
                        height = maxH;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                
                targetArray.push(dataUrl);
                renderArGallery(targetArray, galleryElement);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}
window.handleArImageUpload = handleArImageUpload;

// Re-render gallery elements with thumbnails and removal handlers
function renderArGallery(imagesArray, galleryElement) {
    if (!galleryElement) return;
    galleryElement.innerHTML = '';
    imagesArray.forEach((imgSrc, index) => {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'ar-image-thumb-container';
        
        const img = document.createElement('img');
        img.src = imgSrc;
        img.addEventListener('click', () => openLightbox(imgSrc));
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-thumb-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            imagesArray.splice(index, 1);
            renderArGallery(imagesArray, galleryElement);
        });
        
        thumbContainer.appendChild(img);
        thumbContainer.appendChild(removeBtn);
        galleryElement.appendChild(thumbContainer);
    });
}
window.renderArGallery = renderArGallery;

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

// ---- Person Form ----
function buildPersonForm(type) {
    const isPatient = type === 'patient';
    const capitalized = isPatient ? 'Patient' : 'Customer';
    const lower = isPatient ? 'patient' : 'customer';

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
          <input id="${lower}InputName" class="uppercase" placeholder="NAME SURNAME" maxlength="30">

          <label for="${lower}InputNumber">Contact Number :</label>
          <input id="${lower}InputNumber" maxlength="11">

          <label for="${lower}InputEmail">Email :</label>
          <input id="${lower}InputEmail" maxlength="40" class="lowercase">

          <label>Sex :</label>
          <select id="${lower}InputSex">
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
        </form>`;
    return section;
}

// ---- HRx Block ----
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

// ---- VT7 Block ----
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
        <h4 class="eye-test-label-header">Prescription Details</h4>
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
    // Reset temporary image array for new prescription
    window._arImages = [];

    const wrapper = document.createElement('div');
    wrapper.className = 'ar-clp-container flex-row';
    wrapper.innerHTML = `
        <!-- AR Scan (Photo/File Upload) -->
        <div class="ar-form-container flex-column">
            <h4>AR Findings</h4>
            <div class="ar-upload-area" id="arUploadArea">
                <i class="fa-solid fa-camera"></i>
                <span>Take Photo / Upload scan</span>
                <p>Snaps will be optimized and saved</p>
                <input type="file" id="arImageInput" accept="image/*" capture="environment" multiple style="display: none;">
            </div>
            <div class="ar-image-gallery" id="arImageGallery"></div>
            
            <div class="ar-form-notes" style="margin-top: 15px;">
                <label for="arNotes">AR Notes : </label>
                <textarea id="arNotes" placeholder="Enter findings manually or write comments here..."></textarea>
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

    const uploadArea = wrapper.querySelector('#arUploadArea');
    const fileInput = wrapper.querySelector('#arImageInput');
    const gallery = wrapper.querySelector('#arImageGallery');

    if (uploadArea && fileInput && gallery) {
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            handleArImageUpload(e.target.files, window._arImages, gallery);
        });
    }

    return wrapper;
}

// ---- FIXED: Edit Rx UI ----
function buildEditRxUI(rx) {
    const wrapper = document.createElement('div');
    wrapper.className = 'edit-rx-ui';

    const isEyeExam  = rx.rxMethod === 'eyeExam';
    const isCopyRx   = rx.rxMethod === 'copyPrescription';
    const isCopyRxCl = rx.rxMethod === 'copyPrescriptionCl';

    function pf(val) { return val || ''; }

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
                    <input id="erx_${prefix}DistanceSph" maxlength="8" value="${pf(d.distSph)}">
                    <input id="erx_${prefix}DistanceCyl" maxlength="8" value="${pf(d.distCyl)}">
                    <input id="erx_${prefix}DistanceAxis" maxlength="3" value="${pf(d.distAxis)}">
                    <input id="erx_${prefix}DistancePd" maxlength="5" value="${pf(d.distPd)}">
                    <input id="erx_${prefix}DistanceVa" maxlength="8" value="${pf(d.distVa)}" class="uppercase">
                </div>
                <div class="prescription-format-near flex-row">
                    <label class="prescription-format-side-label">Near : </label>
                    <input id="erx_${prefix}NearSph" maxlength="8" value="${pf(d.nearSph)}">
                    <input id="erx_${prefix}NearCyl" maxlength="8" value="${pf(d.nearCyl)}">
                    <input id="erx_${prefix}NearAxis" maxlength="3" value="${pf(d.nearAxis)}">
                    <input id="erx_${prefix}NearPd" maxlength="5" value="${pf(d.nearPd)}">
                    <input id="erx_${prefix}NearVa" maxlength="8" value="${pf(d.nearVa)}" class="uppercase">
                </div>
                <div class="prescription-format-add">
                    <label class="prescription-format-side-label">Add : </label>
                    <input id="erx_${prefix}AddSph" maxlength="8" value="${pf(d.addSph)}">
                </div>
            </div>`;
    }

    function prefilledClEye(eyeLabel, prefix, data) {
        const d = data || {};
        return `
            <div class="flex-row">
                <label class="contact-lens-side-label">${eyeLabel} : </label>
                <input id="erx_${prefix}Sph" maxlength="8" value="${pf(d.sph)}">
                <input id="erx_${prefix}Cyl" maxlength="8" value="${pf(d.cyl)}">
                <input id="erx_${prefix}Axis" maxlength="3" value="${pf(d.axis)}">
                <input id="erx_${prefix}Bc" maxlength="5" value="${pf(d.bc)}">
                <input id="erx_${prefix}Dia" maxlength="5" value="${pf(d.dia)}">
                <input id="erx_${prefix}Va" maxlength="8" value="${pf(d.va)}" class="uppercase">
            </div>`;
    }

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
                        <h4>AR Findings</h4>
                        <div class="ar-upload-area" id="erx_arUploadArea">
                            <i class="fa-solid fa-camera"></i>
                            <span>Take Photo / Upload scan</span>
                            <p>Snaps will be optimized and saved</p>
                            <input type="file" id="erx_arImageInput" accept="image/*" capture="environment" multiple style="display: none;">
                        </div>
                        <div class="ar-image-gallery" id="erx_arImageGallery"></div>
                        
                        <div class="ar-form-notes" style="margin-top: 15px;">
                            <label>AR Notes : </label>
                            <textarea id="erx_arNotes" placeholder="Enter findings manually or write comments here...">${pf(ar.notes)}</textarea>
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
                                <input id="erx_clpOdBc" maxlength="5" value="${pf(rx.clParameters?.od?.bc)}">
                                <input id="erx_clpOdHvid" maxlength="5" value="${pf(rx.clParameters?.od?.hvid)}">
                                <input id="erx_clpOdDia" maxlength="5" value="${pf(rx.clParameters?.od?.dia)}">
                            </div>
                            <div>
                                <label>OS : </label>
                                <input id="erx_clpOsBc" maxlength="5" value="${pf(rx.clParameters?.os?.bc)}">
                                <input id="erx_clpOsHvid" maxlength="5" value="${pf(rx.clParameters?.os?.hvid)}">
                                <input id="erx_clpOsDia" maxlength="5" value="${pf(rx.clParameters?.os?.dia)}">
                            </div>
                        </div>
                        <div class="clp-form-notes">
                            <label>Notes : </label>
                            <textarea id="erx_clParametersNotes">${pf(rx.clParameters?.notes)}</textarea>
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
                    <textarea id="erx_vt7Notes">${pf(vt7.notes)}</textarea>
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
            <h4 class="eye-test-label-header">Prescription Details</h4>
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

    if (isEyeExam) {
        // Initialize edit image array with existing images
        window._erxArImages = Array.isArray(rx.ar?.images) ? [...rx.ar.images] : [];

        const uploadArea = wrapper.querySelector('#erx_arUploadArea');
        const fileInput = wrapper.querySelector('#erx_arImageInput');
        const gallery = wrapper.querySelector('#erx_arImageGallery');

        if (uploadArea && fileInput && gallery) {
            uploadArea.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                handleArImageUpload(e.target.files, window._erxArImages, gallery);
            });
            
            // Render existing images
            setTimeout(() => {
                renderArGallery(window._erxArImages, gallery);
            }, 0);
        }
    }

    return wrapper;
}

// ---- Preliminary Block ----
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
    document.getElementById('customerFormMount')?.replaceWith(buildPersonForm('customer'));
    document.getElementById('patientFormMount')?.replaceWith(buildPersonForm('patient'));
    document.getElementById('copyRxSpecsMount')?.replaceWith(buildCopyRxSpecsForm());
    document.getElementById('copyRxClMount')?.replaceWith(buildCopyRxClForm());
    document.getElementById('frxMount')?.replaceWith(buildFrxForm());
    document.getElementById('arClpMount')?.replaceWith(buildArClpBlock());
    document.getElementById('preliminaryMount')?.replaceWith(buildPreliminaryBlock());

    const hrxMount = document.getElementById('hrxMount');
    const vt7Mount = document.getElementById('vt7Mount');
    if (hrxMount) hrxMount.replaceWith(buildHrxBlock());
    if (vt7Mount) vt7Mount.replaceWith(buildVt7Block());
}

// mountForms() is called explicitly from main.js inside initStorage().then()
// so that form inputs exist in the DOM before initFormLogic()/generateID() run.