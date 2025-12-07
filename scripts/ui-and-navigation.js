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
  "#fff"        // --ui-bg
];

// Function to apply theme colors
function applyThemeColors(colors) {
  root.style.setProperty("--white", colors[0]);
  root.style.setProperty("--text-color", colors[1]);
  root.style.setProperty("--primary-color", colors[2]);
  root.style.setProperty("--secondary-color", colors[3]);
  root.style.setProperty("--ui-bg", colors[4]);
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

navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    navLinks.forEach(nav => nav.classList.remove("active-nav"));
    link.classList.add("active-nav");

    sections.forEach(sec => sec.classList.remove("active-section"));
    const targetID = link.getAttribute("href").substring(1);
    document.getElementById(targetID).classList.add("active-section");
    navLinksContainer.classList.remove('show');
  });
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


//--------------- Menu Navigation Class Logic ---------------

//Calling Menu and Button Ids
const nav2Main   = document.getElementById("nav2Main");
const nav2NewCustomer   = document.getElementById("nav2NewCustomer");
const nav2NewPatient   = document.getElementById("nav2NewPatient");
const nav2NewPrescription   = document.getElementById("nav2NewPrescription");

const newCustomerBtn   = document.getElementById("newCustomerBtn");
const newCustomerBackBtn   = document.getElementById("newCustomerBackBtn");
const newPatientBtn   = document.getElementById("newPatientBtn");
const newPatientBackBtn   = document.getElementById("newPatientBackBtn");
const newPrescriptionBtn   = document.getElementById("newPrescriptionBtn");
const newPrescriptionBackBtn   = document.getElementById("newPrescriptionBackBtn");
const nav2NewPrescriptionSelectPatientMenuBtn = document.getElementById("nav2NewPrescriptionSelectPatientMenuBtn");
const nav2NewPrescriptionSelectPatientMenuBackBtn = document.getElementById("nav2NewPrescriptionSelectPatientMenuBackBtn");

// New Customer Inputs
const newCustomerInputId = document.getElementById("newCustomerInputId");
const newCustomerDateCreatedMM = document.getElementById("newCustomerDateCreatedMM");
const newCustomerDateCreatedDD = document.getElementById("newCustomerDateCreatedDD");
const newCustomerDateCreatedYYYY = document.getElementById("newCustomerDateCreatedYYYY");
const newCustomerInputName = document.getElementById("newCustomerInputName");
const newCustomerInputNumber = document.getElementById("newCustomerInputNumber");
const newCustomerInputEmail = document.getElementById("newCustomerInputEmail");
const newCustomerInputSex = document.getElementById("newCustomerInputSex");
const newCustomerInputAddress = document.getElementById("newCustomerInputAddress");
const newCustomerBirthdayMM = document.getElementById("newCustomerBirthdayMM");
const newCustomerBirthdayDD = document.getElementById("newCustomerBirthdayDD");
const newCustomerBirthdayYYYY = document.getElementById("newCustomerBirthdayYYYY");
const newCustomerInputAge = document.getElementById("newCustomerInputAge");
const newCustomerAddBtn = document.getElementById("newCustomerAddBtn");

// New Patient Inputs (NEW)
const newPatientInputId = document.getElementById("newPatientInputId");
const newPatientDateCreatedMM = document.getElementById("newPatientDateCreatedMM");
const newPatientDateCreatedDD = document.getElementById("newPatientDateCreatedDD");
const newPatientDateCreatedYYYY = document.getElementById("newPatientDateCreatedyYYYY"); // Fixed ID in HTML/JS
const newPatientInputName = document.getElementById("newPatientInputName");
const newPatientInputNumber = document.getElementById("newPatientInputNumber");
const newPatientInputEmail = document.getElementById("newPatientInputEmail");
const newPatientInputSex = document.getElementById("newPatientInputSex");
const newPatientInputAddress = document.getElementById("newPatientInputAddress");
const newPatientBirthdayMM = document.getElementById("newPatientBirthdayMM");
const newPatientBirthdayDD = document.getElementById("newPatientBirthdayDD");
const newPatientBirthdayYYYY = document.getElementById("newPatientBirthdayYYYY");
const newPatientInputAge = document.getElementById("newPatientInputAge");
const newPatientAddBtn = document.getElementById("newPatientAddBtn");

// ----- Modal: copy customer -> patient -----
const copyCustomerModal = document.getElementById("copyCustomerDetailsToPatientDetailsPrompt");
const copyCustomerYesBtn = document.getElementById("copyCustomerYesBtn");
const copyCustomerNoBtn = document.getElementById("copyCustomerNoBtn");


//show one menu, hide the others
function showMenu(menuToShow) {
  [nav2Main, nav2NewCustomer, nav2NewPatient, nav2NewPrescription].forEach(menu => {
    if (menu === menuToShow) {
      menu.classList.remove("hidden");
    } else {
      menu.classList.add("hidden");
    }
  });
}

const newPrescriptionSelectPatientMenu = document.getElementById("newPrescriptionSelectPatientMenu");
const nav2NewPrescriptionSelectPatientMenu = document.getElementById("nav2NewPrescriptionSelectPatientMenu");
const newPrescriptionPatientForm = document.getElementById("newPrescriptionPatientForm");

const PATIENTS_PER_PAGE = 10;
let currentSelectPatientPage = 1;
let filteredPatients = []; // Patients currently being displayed (after search/filter)
const selectPatientPagination = document.getElementById("selectPatientPagination");

function showNewPrescriptionSubview(viewToShow) {
  const views = [newPrescriptionSelectPatientMenu, nav2NewPrescriptionSelectPatientMenu, newPrescriptionPatientForm];

  views.forEach(view => {
    if (view === viewToShow) {
      view.classList.remove("hidden");
    } else {
      view.classList.add("hidden");
    }
  });

  // Hide main back button while in Select Patient menu
  if (viewToShow === nav2NewPrescriptionSelectPatientMenu) {
    newPrescriptionBackBtn.classList.add("hidden");
  } else {
    newPrescriptionBackBtn.classList.remove("hidden");
  }
}

// event listeners
newCustomerBtn.addEventListener("click", () => {
  showMenu(nav2NewCustomer);
  // set up form after showing
  setupNewCustomerForm();
});
newCustomerBackBtn.addEventListener("click", () => showMenu(nav2Main));

newPatientBtn.addEventListener("click", () => { // (MODIFIED)
  showMenu(nav2NewPatient);
  // set up form after showing
  setupNewPatientForm();
});
newPatientBackBtn.addEventListener("click", () => showMenu(nav2Main));

// When entering New Prescription from main nav
newPrescriptionBtn.addEventListener("click", () => {
  showMenu(nav2NewPrescription);                  // show whole screen
  showNewPrescriptionSubview(newPrescriptionSelectPatientMenu); // show "Select a Patient" step
});

newPrescriptionBackBtn.addEventListener("click", () => {
  showMenu(nav2Main);
});

// "Select" button -> go to the select patient menu block
nav2NewPrescriptionSelectPatientMenuBtn.addEventListener("click", () => {
  showNewPrescriptionSubview(nav2NewPrescriptionSelectPatientMenu);
  loadSelectPatientTable();
});

// "Back" inside the select patient menu -> go back to first subview
nav2NewPrescriptionSelectPatientMenuBackBtn.addEventListener("click", () => {
  showNewPrescriptionSubview(newPrescriptionSelectPatientMenu);
});

// Later you can add something like:
function goToPatientForm() {
  showNewPrescriptionSubview(newPrescriptionPatientForm);
}

// ----------------- SELECT PATIENT TABLE LOGIC -----------------

function loadSelectPatientTable() {
  let allPatients = getPatientsArray();
  
  // NEW ADDITION: Sort patients by ID in descending order (latest recorded patient first)
  // This assumes the patient 'id' field follows a sequential pattern (e.g., PX0001, PX0002, etc.)
  allPatients.sort((a, b) => b.id.localeCompare(a.id)); //
  
  const searchTerm = selectPatientSearchBarInput.value.trim().toUpperCase(); //

  // 1. Filter patients based on search term
  if (searchTerm) { //
    filteredPatients = allPatients.filter(p =>
      p.name.includes(searchTerm) ||
      p.id.includes(searchTerm) ||
      p.number.includes(searchTerm)
    );
  } else {
    // Use the newly sorted allPatients list
    filteredPatients = allPatients; //
  }

  // Reset to first page after a new search/load
  currentSelectPatientPage = 1; //

  // 2. Render the table and setup pagination
  renderSelectPatientTable(filteredPatients, currentSelectPatientPage); //
  setupPaginationControls(filteredPatients.length, PATIENTS_PER_PAGE, currentSelectPatientPage); //
}


function renderSelectPatientTable(patients, page) {
  selectPatientTableBody.innerHTML = ''; // Clear existing rows //

  if (patients.length === 0) { //
    const tr = document.createElement('tr'); //
    const td = document.createElement('td'); //
    td.colSpan = 4; //
    td.textContent = selectPatientSearchBarInput.value ? "No patients found matching your search." : "No patient records available."; //
    tr.appendChild(td); //
    selectPatientTableBody.appendChild(tr); //
    return; //
  }

  // Calculate slice for current page (Pagination Logic)
  const start = (page - 1) * PATIENTS_PER_PAGE; //
  const end = start + PATIENTS_PER_PAGE; //
  const patientsToRender = patients.slice(start, end); //

  patientsToRender.forEach(patient => { //
    // ... table row creation logic remains the same
    const tr = document.createElement('tr'); //
    const tdId = document.createElement('td'); //
    tdId.textContent = patient.id; //
    tr.appendChild(tdId); //
    // ... (tdName, tdNumber, tdAction creation)
    const tdName = document.createElement('td'); //
    tdName.textContent = patient.name; //
    tr.appendChild(tdName); //

    const tdNumber = document.createElement('td'); //
    tdNumber.textContent = patient.number; //
    tr.appendChild(tdNumber); //

    const tdAction = document.createElement('td'); //
    const newPrescriptionSelectPatientBtn = document.createElement('button'); //
    newPrescriptionSelectPatientBtn.textContent = 'Select'; //
    newPrescriptionSelectPatientBtn.classList.add('select-patient-button');
    newPrescriptionSelectPatientBtn.addEventListener('click', () => { //
      loadPatientToProfileForm(patient); //
      showNewPrescriptionSubview(newPrescriptionPatientForm); //
      document.getElementById('finalPrescriptionFormContainer').classList.add('hidden'); //
      document.getElementById('newPrescriptionSelectPatientMenu').classList.remove('hidden');
    });
    tdAction.appendChild(newPrescriptionSelectPatientBtn); //
    tr.appendChild(tdAction); //

    selectPatientTableBody.appendChild(tr); //
  });
}

// C. Pagination Control Generation and Click Handler (NEW)
function setupPaginationControls(totalPatients, itemsPerPage, currentPage) {
  selectPatientPagination.innerHTML = '';

  const totalPages = Math.ceil(totalPatients / itemsPerPage);

  if (totalPages <= 1) return;

  // Function to handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    currentSelectPatientPage = newPage;
    renderSelectPatientTable(filteredPatients, currentSelectPatientPage);
    setupPaginationControls(totalPatients, itemsPerPage, currentSelectPatientPage);
  };
  
  // 1. Previous Button
  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Previous';
  if (currentPage === 1) prevBtn.classList.add('disabled-page');
  else prevBtn.addEventListener('click', () => handlePageChange(currentPage - 1));
  selectPatientPagination.appendChild(prevBtn);

  // 2. Page Number Logic (e.g., 1, 2, 3, ..., 10)
  const maxPagesToShow = 5; // Max number buttons to show directly
  let startPage, endPage;

  if (totalPages <= maxPagesToShow) {
    // Show all pages if total is small
    startPage = 1;
    endPage = totalPages;
  } else {
    // Determine the window of pages around the current page
    let sidePages = Math.floor((maxPagesToShow - 1) / 2);
    startPage = currentPage - sidePages;
    endPage = currentPage + sidePages;

    if (startPage < 1) {
      startPage = 1;
      endPage = maxPagesToShow;
    }

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = totalPages - maxPagesToShow + 1;
    }
  }
  
  // Ensure '1' is always shown if not in the window
  if (startPage > 1) {
    addPageButton(1);
    if (startPage > 2) addEllipsis();
  }

  // Show pages in the calculated window
  for (let i = startPage; i <= endPage; i++) {
    addPageButton(i);
  }
  
  // Ensure the last page is always shown if not in the window
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) addEllipsis();
    addPageButton(totalPages);
  }

  function addPageButton(pageNumber) {
    const btn = document.createElement('button');
    btn.textContent = pageNumber;
    if (pageNumber === currentPage) btn.classList.add('active-page');
    else btn.addEventListener('click', () => handlePageChange(pageNumber));
    selectPatientPagination.appendChild(btn);
  }

  function addEllipsis() {
    const span = document.createElement('span');
    span.textContent = '...';
    span.style.margin = '0 5px';
    span.style.fontSize = '18px';
    selectPatientPagination.appendChild(span);
  }

  // 3. Next Button
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  if (currentPage === totalPages) nextBtn.classList.add('disabled-page');
  else nextBtn.addEventListener('click', () => handlePageChange(currentPage + 1));
  selectPatientPagination.appendChild(nextBtn);
}
