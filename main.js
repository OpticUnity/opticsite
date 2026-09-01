// ================================================================
//  main.js — OpticSite / OpticUnity
//  App entry point. Storage is handled entirely by storage.js.
//  initStorage() is called once here on load, then the rest
//  of the app runs inside its .then() callback as before.
// ================================================================

// Init storage on load — storage.js exposes window.initStorage
initStorage().then(() => {

    // ── Restore theme preference ─────────────────────────────────
    const savedTheme = Storage.getItem('themePreference');
    if (typeof applyTheme === 'function') applyTheme(savedTheme);

    // ── Show Windows download section on browser only ─────────────
    if (!window.__TAURI_INTERNALS__) {
        // [MAC-TODO] — This block shows the Windows-only download section on the browser build.
        // When shipping a macOS build, add a parallel 'macDownloadSection' element in index.html
        // and show it here using platform detection. Tauri v2 detects OS via the plugin-os
        // package (not a window.__TAURI__.os global like v1) — install @tauri-apps/plugin-os,
        // then: import { platform } from '@tauri-apps/plugin-os'; const os = platform();
        // Returns 'windows' | 'macos' | 'linux'. Then toggle the correct section per platform.
        document.getElementById('windowsDownloadSection').style.display = 'flex';
    }

    // ── First launch check ────────────────────────────────────────
    const firstLaunchComplete = Storage.getItem('firstLaunchComplete');
    if (!firstLaunchComplete) {
        window.location.hash = '#introPage';
    } else {
        if (window.location.hash === '#introPage' || !window.location.hash) {
            window.location.hash = '#homePage';
        }
    }

    // ── Intro step navigation ─────────────────────────────────────
    document.getElementById('introNext1Btn')?.addEventListener('click', () => {
        document.getElementById('introStep1').classList.add('hidden');
        document.getElementById('introStep2').classList.remove('hidden');
    });

    document.getElementById('introNext2Btn')?.addEventListener('click', () => {
        document.getElementById('introStep2').classList.add('hidden');
        document.getElementById('introStep3').classList.remove('hidden');
    });

    // ── Intro Step 3: Restore backup link ────────────────────────
    // Subtle option at the bottom of the clinic setup form.
    // Uses importBackupIntro() — lighter path that skips the overwrite
    // confirm modal since there is no existing data on first launch.


    document.getElementById('introCompleteBtn')?.addEventListener('click', () => {
        const clinicNameEl = document.getElementById('introClinicName');
        const doctorNameEl = document.getElementById('introDoctorName');
        const prcNumberEl  = document.getElementById('introPrcNumber');
        const contactEl    = document.getElementById('introClinicContact');

        // Clear errors
        [clinicNameEl, doctorNameEl, prcNumberEl, contactEl]
            .forEach(el => el?.classList.remove('input-error'));

        let valid = true;

        // Required fields
        [clinicNameEl, doctorNameEl, prcNumberEl].forEach(el => {
            if (!el.value.trim()) {
                el.classList.add('input-error');
                valid = false;
            }
        });

        // PRC — digits only
        if (prcNumberEl.value.trim() && !/^\d+$/.test(prcNumberEl.value.trim())) {
            prcNumberEl.classList.add('input-error');
            valid = false;
        }

        // Contact — digits only
        if (contactEl.value.trim() && !/^\d+$/.test(contactEl.value.trim())) {
            contactEl.classList.add('input-error');
            valid = false;
        }

        if (!valid) {
            openAlert({ title: 'Required Fields', body: 'Please check the highlighted fields.' });
            return;
        }

        const settings = {
            clinicName:    clinicNameEl.value.trim(),
            clinicAddress: document.getElementById('introClinicAddress').value.trim(),
            clinicContact: contactEl.value.trim(),
            doctorName:    doctorNameEl.value.trim(),
            prcNumber:     prcNumberEl.value.trim()
        };

        Storage.setItem('clinicSettings', JSON.stringify(settings));
        Storage.setItem('firstLaunchComplete', 'true');

        openAlert({
            title: 'Welcome to OpticSite!',
            body:  "Setup complete. Let's get started!",
            onOk:  () => { window.location.hash = '#homePage'; }
        });
    });

    // ── Mount dynamic forms FIRST so DOM inputs exist ────────────
    // forms.js no longer auto-mounts on 'load' — we mount here
    // explicitly so patientIdInput / customerIdInput are in the DOM
    // before initFormLogic() / generateID() try to write to them.
    console.log('[Main] Storage initialized. Bootstrapping app...');
    if (typeof mountForms              === 'function') mountForms();
    if (typeof initValidation          === 'function') initValidation();
    if (typeof initNearAddSync         === 'function') initNearAddSync();
    if (typeof initFormLogic           === 'function') initFormLogic();
    if (typeof initSalesFormLogic      === 'function') initSalesFormLogic();
    if (typeof initOrderFormLogic      === 'function') initOrderFormLogic();
    if (typeof initViewRecordsNav      === 'function') initViewRecordsNav();
    if (typeof initSalesHistoryNav     === 'function') initSalesHistoryNav();
    if (typeof initJobOrdersNav        === 'function') initJobOrdersNav();
    if (typeof initPendingOrdersNav    === 'function') initPendingOrdersNav();
    if (typeof initEditPatientProfile  === 'function') initEditPatientProfile();
    if (typeof initEditCustomerProfile === 'function') initEditCustomerProfile();
    if (typeof generateID              === 'function') { generateID('patient'); generateID('customer'); }
    if (typeof setDateCreated          === 'function') { setDateCreated('patient'); setDateCreated('customer'); }

    // ── Load saved clinic settings into Clinic Setup form ─────────
    _loadClinicSettingsIntoForm();

    // ── Clinic Setup save button ──────────────────────────────────
    document.getElementById('saveClinicSetupBtn')?.addEventListener('click', _handleSaveClinicSetup);

});


// ── Export / Import Save File buttons ───────────────────────────────
// Delegates to Storage.exportBackup() / Storage.importBackup() which
// handle the correct platform behavior (Tauri: native dialog / Browser: file).
window.addEventListener('load', () => {
    document.getElementById('exportBackupBtn')?.addEventListener('click', () => {
        Storage.exportBackup();
    });
    document.getElementById('importBackupBtn')?.addEventListener('click', () => {
        Storage.importBackup();
    });
});


// ================================================================
//  Clinic Setup Helpers
//  Separated into named functions to avoid duplication —
//  previously this logic appeared twice in main.js.
// ================================================================


function _loadClinicSettingsIntoForm() {
    const saved = JSON.parse(Storage.getItem('clinicSettings') || '{}');
    if (saved.clinicName)    document.getElementById('setupClinicName').value    = saved.clinicName;
    if (saved.clinicAddress) document.getElementById('setupClinicAddress').value = saved.clinicAddress;
    if (saved.clinicContact) document.getElementById('setupClinicContact').value = saved.clinicContact;
    if (saved.doctorName)    document.getElementById('setupDoctorName').value    = saved.doctorName;
    if (saved.prcNumber)     document.getElementById('setupPrcNumber').value     = saved.prcNumber;
}

function _handleSaveClinicSetup() {
    const clinicNameEl = document.getElementById('setupClinicName');
    const doctorNameEl = document.getElementById('setupDoctorName');
    const prcNumberEl  = document.getElementById('setupPrcNumber');
    const contactEl    = document.getElementById('setupClinicContact');

    // Clear previous errors
    [clinicNameEl, doctorNameEl, prcNumberEl, contactEl]
        .forEach(el => el?.classList.remove('input-error'));

    let valid = true;

    // Required fields
    [clinicNameEl, doctorNameEl, prcNumberEl].forEach(el => {
        if (!el.value.trim()) {
            el.classList.add('input-error');
            valid = false;
        }
    });

    // PRC — digits only
    if (prcNumberEl.value.trim() && !/^\d+$/.test(prcNumberEl.value.trim())) {
        prcNumberEl.classList.add('input-error');
        valid = false;
    }

    // Contact — digits only if filled
    if (contactEl.value.trim() && !/^\d+$/.test(contactEl.value.trim())) {
        contactEl.classList.add('input-error');
        valid = false;
    }

    if (!valid) {
        openAlert({ title: 'Check Fields', body: 'Please check the highlighted fields.' });
        return;
    }

    const settings = {
        clinicName:    clinicNameEl.value.trim(),
        clinicAddress: document.getElementById('setupClinicAddress').value.trim(),
        clinicContact: contactEl.value.trim(),
        doctorName:    doctorNameEl.value.trim(),
        prcNumber:     prcNumberEl.value.trim()
    };

    Storage.setItem('clinicSettings', JSON.stringify(settings));
    openAlert({
        title: 'Saved',
        body:  'Clinic settings saved successfully!',
        onOk:  () => { window.location.hash = '#settingsPage'; }
    });
}