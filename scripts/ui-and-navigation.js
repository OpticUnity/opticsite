//--------------- Dark Mode toggle logic ---------------

const darkToggle = document.querySelector(".dark-mode-btn i");
const colorText = document.querySelectorAll(".color-text");
const boxElements = document.querySelectorAll(".box");
const root = document.querySelector(":root");

// Default colors for light mode (CSS variables)
const defaultLightModeColors = [
  "#fff",       // --white
  "#000000",    // --text-color
  "#000",       // --primary-color
  "#272B2F",    // --secondary-color
  "#fff",       // --ui-bg
  "#F3F4F6",    // --object-bg
  "#555",       // --border-color
  "#ddd",       // --cancel-hover-bg
  "#000",       // --so-group-border
  "#e0e0e0"     // --so-row-divider
];

// Function to apply theme colors
function applyThemeColors(colors) {
  root.style.setProperty("--white", colors[0]);
  root.style.setProperty("--text-color", colors[1]);
  root.style.setProperty("--primary-color", colors[2]);
  root.style.setProperty("--secondary-color", colors[3]);
  root.style.setProperty("--ui-bg", colors[4]);
  root.style.setProperty("--object-bg", colors[5]);
  root.style.setProperty("--border-color", colors[6]);
  root.style.setProperty("--cancel-hover-bg", colors[7]);
  root.style.setProperty("--so-group-border", colors[8]);
  root.style.setProperty("--so-row-divider", colors[9]);
}

// Function to toggle dark mode classes
function toggleDarkMode(darkModeStyle) {
  const method = darkModeStyle ? "add" : "remove";
  colorText.forEach(el => el.classList[method]("darkMode"));
  boxElements.forEach(el => el.classList[method]("darkMode"));
}

// Handle dark mode toggle
darkToggle.addEventListener("click", () => {
  const isDarkMode = darkToggle.classList.contains("fa-moon");
  const colorData = darkToggle.getAttribute("data-color").split(" "); // Get color data from the button
  
  if (isDarkMode) {
    // Switch to dark mode
    darkToggle.classList.replace("fa-moon", "fa-sun");
    toggleDarkMode(true);
    applyThemeColors(colorData); // Apply the color theme when dark mode is activated
    darkToggle.parentElement.title = "Light Mode";
    if (window.Storage) Storage.setItem('themePreference', 'darkMode');

  } else {
    // Switch to light mode
    darkToggle.classList.replace("fa-sun", "fa-moon");
    toggleDarkMode(false);
    applyThemeColors(defaultLightModeColors); // Apply the default light mode colors
    darkToggle.parentElement.title = "Dark Mode";
    if (window.Storage) Storage.setItem('themePreference', 'lightMode');

  }
});

// applyTheme — called from main.js after Storage is ready
function applyTheme(preference) {
  // Always remove the preload class — it has done its job preventing
  // the flash and applyThemeColors() now takes full control.
  document.documentElement.classList.remove('darkMode-preload');

  if (preference === 'darkMode') {
    const colorData = darkToggle.getAttribute("data-color").split(" ");
    darkToggle.classList.replace("fa-moon", "fa-sun");
    toggleDarkMode(true);
    applyThemeColors(colorData);
    darkToggle.parentElement.title = "Light Mode";
  }
  // lightMode / null — default state, nothing to apply
}

//--------------- Tab Navigation logic ---------------

const navLinks = document.querySelectorAll(".nav-links a");
const sections = document.querySelectorAll(".page-content");

function handleRouting() {
  const currentHash = window.location.hash || "#homePage";
  const navbar = document.querySelector('nav');
  const footer = document.querySelector('.footer');
  const isIntro = currentHash === '#introPage';
  if (navbar) navbar.style.display = isIntro ? 'none' : '';
  if (footer) footer.style.display = isIntro ? 'none' : '';
  const activeSection = document.querySelector(currentHash);
  const parentID = activeSection ? activeSection.getAttribute("data-parent") : null;

  navLinks.forEach(link => {
    const linkHref = link.getAttribute("href");
    const isMatched = (linkHref === currentHash || linkHref === parentID);
    link.classList.toggle("active-nav", isMatched);
  });

  sections.forEach(sec => {
    const isSectionActive = `#${sec.id}` === currentHash;
    
    if (isSectionActive) {
      sec.classList.add("active-section");
      sec.classList.remove("hidden");
    } else {
      sec.classList.remove("active-section");
      sec.classList.add("hidden");
    }
  });

  if (typeof navLinksContainer !== 'undefined' && navLinksContainer) {
    navLinksContainer.classList.remove('show');
  }

  // Remove preload guard now that the correct section is visible.
  document.documentElement.classList.remove('preload-hide-pages');
}

// ----- View Records Mini Navigation Logic -----

// ----- Global Navigation Dirty Guard -----

// Pages that have dirty-checkable forms, and how to check + clean them
const dirtyGuardPages = {
    '#newCustomerMenu': {
        isDirty: () => ['customerInputName', 'customerInputNumber', 'customerInputEmail',
                        'customerInputSex', 'customerInputAddress',
                        'customerBirthdayMM', 'customerBirthdayDD', 'customerBirthdayYYYY']
                        .some(id => { const el = document.getElementById(id); return el && el.value.trim() !== ''; }),
        cleanup: () => {
            const form = document.getElementById('customerForm');
            if (form) {
                form.reset();
                form.querySelectorAll('input, select').forEach(el => el.classList.remove('input-error'));
                if (typeof generateID === 'function') generateID('customer');
                if (typeof setDateCreated === 'function') setDateCreated('customer');
            }
        }
    },
    '#newPatientMenu': {
        isDirty: () => ['patientInputName', 'patientInputNumber', 'patientInputEmail',
                        'patientInputSex', 'patientInputAddress',
                        'patientBirthdayMM', 'patientBirthdayDD', 'patientBirthdayYYYY']
                        .some(id => { const el = document.getElementById(id); return el && el.value.trim() !== ''; }),
        cleanup: () => {
            const form = document.getElementById('patientForm');
            if (form) {
                form.reset();
                form.querySelectorAll('input, select').forEach(el => el.classList.remove('input-error'));
                if (typeof generateID === 'function') generateID('patient');
                if (typeof setDateCreated === 'function') setDateCreated('patient');
            }
        }
    },
    '#newPrescriptionMenu': {
        isDirty: () => {
            const patientSelected = !document.getElementById('patientProfileForm')?.classList.contains('hidden');
            if (!patientSelected) return false;
            // Also check if notes were modified from their original loaded values
            const orig = window._originalPatientNotes || {};
            const notesDirty =
                document.getElementById('patientProfilePatientNotes')?.value !== orig.patientNotes ||
                document.getElementById('patientProfileGenHealthHxNotes')?.value !== orig.genHealthHx ||
                document.getElementById('patientProfileOcuHxNotes')?.value !== orig.ocuHx;
            const formDirty = ['mainEyeExaminationForm', 'mainFinalPrescription', 'frxClForm',
                'copyPrescriptionForm', 'copyPrescriptionFormCl']
                .some(sectionId => {
                    const section = document.getElementById(sectionId);
                    if (!section || section.classList.contains('hidden')) return false;
                    return [...section.querySelectorAll('input, textarea')].some(el => el.value.trim() !== '');
                });
            return notesDirty || formDirty || patientSelected;
        },
        cleanup: () => {
            if (typeof changePatient === 'function') changePatient();
        }
    },
    '#viewRecordsMenu': {
        isDirty: () => {
            // Check if user is mid-edit on a patient/customer profile or in edit Rx mode
            return window._isEditRxActive === true
                || (typeof window._isViewRecordsEditDirty === 'function'
                    && window._isViewRecordsEditDirty())
                || (typeof window._isViewRecordsCustomerEditDirty === 'function'
                    && window._isViewRecordsCustomerEditDirty());
        },
        cleanup: () => {
            // Close edit Rx UI if active
            if (window._isEditRxActive && typeof closeEditRxUI === 'function') closeEditRxUI();
            // If patient edit mode is active, cancel it cleanly
            if (typeof exitEditMode === 'function') exitEditMode(true);
            // If customer edit mode is active, cancel it cleanly too
            if (typeof exitCustomerEditMode === 'function') exitCustomerEditMode(true);
            // Reset all sub-menus back to main menu
            document.getElementById('viewRecordsMainMenu')?.classList.remove('hidden');
            document.getElementById('viewRecordsCustomerMenu')?.classList.add('hidden');
            document.getElementById('viewRecordsPatientMenu')?.classList.add('hidden');
            // Also reset patient sub-sections in case user was deep in a profile
            document.getElementById('viewPatientProfileMenu')?.classList.add('hidden');
            document.getElementById('viewPatientSelectMenu')?.classList.remove('hidden');
            // Same for customer sub-sections
            document.getElementById('viewCustomerProfileMenu')?.classList.add('hidden');
            document.getElementById('viewCustomerSelectMenu')?.classList.remove('hidden');
            // Clear the search bars
            const patientSearchBar = document.getElementById('viewPatientSearchBarInput');
            if (patientSearchBar) patientSearchBar.value = '';
            const customerSearchBar = document.getElementById('viewCustomerSearchBarInput');
            if (customerSearchBar) customerSearchBar.value = '';
        }
    }

    ,
    '#clinicSetupPage': {
        isDirty: () => {
            const saved = JSON.parse(Storage.getItem('clinicSettings') || '{}');
            return (
                (document.getElementById('setupClinicName')?.value.trim()    || '') !== (saved.clinicName    || '') ||
                (document.getElementById('setupClinicAddress')?.value.trim() || '') !== (saved.clinicAddress || '') ||
                (document.getElementById('setupClinicContact')?.value.trim() || '') !== (saved.clinicContact || '') ||
                (document.getElementById('setupDoctorName')?.value.trim()    || '') !== (saved.doctorName    || '') ||
                (document.getElementById('setupPrcNumber')?.value.trim()     || '') !== (saved.prcNumber     || '')
            );
        },
        cleanup: () => {
            const saved = JSON.parse(Storage.getItem('clinicSettings') || '{}');
            if (document.getElementById('setupClinicName'))    document.getElementById('setupClinicName').value    = saved.clinicName    || '';
            if (document.getElementById('setupClinicAddress')) document.getElementById('setupClinicAddress').value = saved.clinicAddress || '';
            if (document.getElementById('setupClinicContact')) document.getElementById('setupClinicContact').value = saved.clinicContact || '';
            if (document.getElementById('setupDoctorName'))    document.getElementById('setupDoctorName').value    = saved.doctorName    || '';
            if (document.getElementById('setupPrcNumber'))     document.getElementById('setupPrcNumber').value     = saved.prcNumber     || '';
            ['setupClinicName','setupClinicAddress','setupClinicContact','setupDoctorName','setupPrcNumber']
                .forEach(id => document.getElementById(id)?.classList.remove('input-error'));
        }
    }

    ,
    // Sales/New Order — dirty the moment a customer/walk-in is picked (orderIdBlock
    // becomes visible), same threshold #newPrescriptionMenu uses (patientSelected alone
    // counts, not just non-empty fields) — mirrors that precedent rather than requiring
    // actual item content, so this also covers the highest-stakes moment: mid-payment
    // entry, where orderIdBlock has stayed visible the whole time. cleanup reuses
    // changeCustomer() from sales-form-logic.js, which already does the full reset
    // (profile fields, block visibility, soResetOrderForm()) — same reset onEnterNewOrder
    // itself runs unconditionally on arrival; this just stops it from happening
    // silently on the way OUT.
    '#salesNewOrder': {
        isDirty: () => !document.getElementById('orderIdBlock')?.classList.contains('hidden'),
        cleanup: () => {
            if (typeof changeCustomer === 'function') changeCustomer();
        }
    }

};

// ── On-entry refresh — DOM-driven ────────────────────────────────
// When arriving at a page, checks if its <section> has a
// data-on-entry="fnName" attribute and calls that function.
//
// To add refresh behaviour to any new page in the future:
//   1. Open index.html
//   2. Find the <section> for that page
//   3. Add:  data-on-entry="yourRenderFunction"
//   Done. No changes to this file ever needed.

function _runOnEntry(hash) {
    const id = hash.replace('#', '');
    const section = document.getElementById(id);
    if (!section) return;

    const fnName = section.getAttribute('data-on-entry');
    if (!fnName) return;

    const fn = window[fnName];
    if (typeof fn === 'function') {
        fn();
    } else {
        console.warn(`[onEntry] "${fnName}" is not a function (page: ${hash})`);
    }
}

let previousHash = window.location.hash || '#homePage';

function handleHashChange(e) {
    const newHash = window.location.hash || '#homePage';
    const guard = dirtyGuardPages[previousHash];

    if (guard && guard.isDirty()) {
        // Revert hash immediately while we wait for user response
        history.replaceState(null, '', previousHash);

        openModal({
            title: 'Unsaved Changes',
            body: 'You have unsaved changes that will not be saved. Leave anyway?',
            confirmText: 'Leave',
            cancelText: 'Stay',
            onConfirm: () => {
                guard.cleanup();
                previousHash = newHash;
                window.location.hash = newHash;
                _runOnEntry(newHash);
            },
            onCancel: () => {
                // Already reverted, do nothing
            }
        });
        return;
    } else if (guard && !guard.isDirty()) {
        guard.cleanup();
    }

    _runOnEntry(newHash);

    previousHash = newHash;
    handleRouting();
}
// Listen for the URL changing and page loading
window.addEventListener("hashchange", handleHashChange);
window.addEventListener("load", () => {
    previousHash = window.location.hash || '#homePage';
    _runOnEntry(previousHash);
    handleRouting();
});

// 

document.getElementById('customerMenuBtn')?.addEventListener('click', () => {
    document.getElementById('viewRecordsMainMenu').classList.add('hidden');
    document.getElementById('viewRecordsCustomerMenu').classList.remove('hidden');
});

document.getElementById('patientMenuBtn')?.addEventListener('click', () => {
    document.getElementById('viewRecordsMainMenu').classList.add('hidden');
    document.getElementById('viewRecordsPatientMenu').classList.remove('hidden');
});

document.getElementById('viewRecordsCtmBackBtn')?.addEventListener('click', () => {
    document.getElementById('viewRecordsCustomerMenu').classList.add('hidden');
    document.getElementById('viewRecordsMainMenu').classList.remove('hidden');
});

document.getElementById('viewRecordsPtmBackBtn')?.addEventListener('click', () => {
    document.getElementById('viewRecordsPatientMenu').classList.add('hidden');
    document.getElementById('viewRecordsMainMenu').classList.remove('hidden');
});

//------------ Backup Page Display Platform Adaptor -----------

function _initBackupPage() {
    const isTauri = !!window.__TAURI__;
    // [MAC-TODO] — This currently shows one panel for ALL Tauri builds (Windows + macOS + Linux).
    // If the backup panel's instructions mention Windows-specific paths or UI (e.g. "C:\Users\..."),
    // consider adding a 'backupPanelMac' panel in index.html with macOS-appropriate wording
    // (e.g. "~/Library/Application Support/...") and toggling it based on OS detection:
    //   const { platform } = window.__TAURI__.os;
    //   const os = await platform(); // use to show Mac vs Windows specific instructions
    document.getElementById('backupPanelTauri')?.classList.toggle('hidden', !isTauri);
    document.getElementById('backupPanelBrowser')?.classList.toggle('hidden', isTauri);
}



//--------------- Nav Menu logic for Phones ---------------

const toggle = document.querySelector('.nav-links-menu-toggle');
const navLinksContainer = document.querySelector('.nav-links');

// Toggle mobile menu visibility
toggle.onclick = (e) => {
  e.stopPropagation(); // Prevent the toggle click from immediately closing
  navLinksContainer.classList.toggle('show');
};

// Close nav when clicking outside
document.addEventListener('click', (e) => {
  if (!navLinksContainer.contains(e.target) && !toggle.contains(e.target)) {
    navLinksContainer.classList.remove('show');
  }
});

//--------------- Intro Restore Modal ---------------

document.getElementById('introRestoreToggle')?.addEventListener('click', function() {
    openModal({
        title: 'Restore from Save File',
        body: 'Continuing from another device?\nClick Import and choose your save file.',
        confirmText: 'Import Save File',
        cancelText: 'Cancel',
        onConfirm: () => {
            if (typeof importBackupIntro === 'function') importBackupIntro();
        }
    });
});