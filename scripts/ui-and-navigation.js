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
  "#F3F4F6"     // --object-bg
];

// Function to apply theme colors
function applyThemeColors(colors) {
  root.style.setProperty("--white", colors[0]);
  root.style.setProperty("--text-color", colors[1]);
  root.style.setProperty("--primary-color", colors[2]);
  root.style.setProperty("--secondary-color", colors[3]);
  root.style.setProperty("--ui-bg", colors[4]);
  root.style.setProperty("--object-bg", colors[5]);
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
    
  } else {
    // Switch to light mode
    darkToggle.classList.replace("fa-sun", "fa-moon");
    toggleDarkMode(false);
    applyThemeColors(defaultLightModeColors); // Apply the default light mode colors
    darkToggle.parentElement.title = "Dark Mode";

  }
});

//--------------- Tab Navigation logic ---------------

const navLinks = document.querySelectorAll(".nav-links a");
const sections = document.querySelectorAll(".page-content");

function handleRouting() {
  const currentHash = window.location.hash || "#homePage";
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
            // Check if user is mid-edit on a patient profile
            return typeof window._isViewRecordsEditDirty === 'function'
                && window._isViewRecordsEditDirty();
        },
        cleanup: () => {
            // If edit mode is active, cancel it cleanly before resetting nav
            if (typeof exitEditMode === 'function') exitEditMode(true);
            // Reset all sub-menus back to main menu
            document.getElementById('viewRecordsMainMenu')?.classList.remove('hidden');
            document.getElementById('viewRecordsCustomerMenu')?.classList.add('hidden');
            document.getElementById('viewRecordsPatientMenu')?.classList.add('hidden');
            // Also reset patient sub-sections in case user was deep in a profile
            document.getElementById('viewPatientProfileMenu')?.classList.add('hidden');
            document.getElementById('viewPatientSelectMenu')?.classList.remove('hidden');
            // Clear the search bar
            const searchBar = document.getElementById('viewPatientSearchBarInput');
            if (searchBar) searchBar.value = '';
        }
    }
};

let previousHash = window.location.hash || '#homePage';

function handleHashChange(e) {
    const newHash = window.location.hash || '#homePage';
    const guard = dirtyGuardPages[previousHash];

    if (guard && guard.isDirty()) {
        const leave = confirm("You have unsaved changes that will not be saved. Leave anyway?");
        if (!leave) {
            // Revert the hash without triggering another hashchange
            history.replaceState(null, '', previousHash);
            return;
        }
        guard.cleanup();
    } else if (guard && !guard.isDirty()) {
        // No prompt needed but still run cleanup (e.g. viewRecordsMenu reset)
        guard.cleanup();
    }

    previousHash = newHash;
    handleRouting();
}

// Listen for the URL changing and page loading
window.addEventListener("hashchange", handleHashChange);
window.addEventListener("load", () => {
    previousHash = window.location.hash || '#homePage';
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