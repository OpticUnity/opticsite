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
const nav2NewPrescriptionSelectPatientBtn = document.getElementById("nav2NewPrescriptionSelectPatientBtn");
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
nav2NewPrescriptionSelectPatientBtn.addEventListener("click", () => {
  showNewPrescriptionSubview(nav2NewPrescriptionSelectPatientMenu);
});

// "Back" inside the select patient menu -> go back to first subview
nav2NewPrescriptionSelectPatientMenuBackBtn.addEventListener("click", () => {
  showNewPrescriptionSubview(newPrescriptionSelectPatientMenu);
});

// Later you can add something like:
function goToPatientForm() {
  showNewPrescriptionSubview(newPrescriptionPatientForm);
}



// ----------------- ID GENERATION UTILITIES -----------------

function currentYearTwoDigits() {
  const d = new Date();
  return String(d.getFullYear()).slice(-2);
}

function padNumber(num, size=4){
  return String(num).padStart(size, '0');
}

function incrementLetters(twoLetters){
  // twoLetters is like 'AA' .. 'ZZ'
  const A = 'A'.charCodeAt(0);
  let first = twoLetters.charCodeAt(0) - A;
  let second = twoLetters.charCodeAt(1) - A;
  // increment
  if (second < 25) {
    second += 1;
  } else {
    second = 0;
    if (first < 25) first += 1;
    else return null; // overflow beyond ZZ
  }
  return String.fromCharCode(A + first) + String.fromCharCode(A + second);
}

function incrementId(lastId, ID_PREFIX){
  // lastId example: OC25AA0001 or PX25AA0001
  // returns next id string
  if (!lastId || !lastId.startsWith(ID_PREFIX)) {
    return `${ID_PREFIX}${currentYearTwoDigits()}AA${padNumber(1)}`;
  }
  const year = currentYearTwoDigits();
  // If lastId has different year, start AA0001 for current year
  const lastYear = lastId.substring(2,4);
  let letters = lastId.substring(4,6);
  let number = parseInt(lastId.substring(6));

  if (lastYear !== year) {
    return `${ID_PREFIX}${year}AA${padNumber(1)}`;
  }

  if (number < 9999) {
    number += 1;
    return `${ID_PREFIX}${year}${letters}${padNumber(number)}`;
  }

  // number rolled over
  const nextLetters = incrementLetters(letters);
  if (!nextLetters) return null; // overflow
  return `${ID_PREFIX}${year}${nextLetters}${padNumber(1)}`;
}

// ---------------- MODAL FOR COPY CUSTOMER TO PATIENT -------------------
function showCopyCustomerModal() {
  copyCustomerModal.style.display = "block";
}

function hideCopyCustomerModal() {
  copyCustomerModal.style.display = "none";
}

// When user clicks "Yes": create patient from last created customer
copyCustomerYesBtn.addEventListener('click', () => {
  const src = window._lastCreatedCustomerForCopy;
  if (!src) {
    hideCopyCustomerModal();
    return;
  }

  // Generate next patient ID
  const patientId = generateNextPatientId();

  // Build patient object from customer details
  const patient = {
    id: patientId,
    created: src.created,      // you can also use today's date if you prefer
    name: src.name,
    number: src.number,
    email: src.email,
    sex: src.sex,
    address: src.address,
    birthday: src.birthday
  };

  savePatientToStorage(patient);
  alert('Patient created from customer: ' + patient.id);

  // Optional: if New Patient form is currently visible, you could refresh its ID:
  if (!nav2NewPatient.classList.contains('hidden')) {
    // regenerate next ID for the next patient entry
    const nextPid = generateNextPatientId();
    if (nextPid) newPatientInputId.value = nextPid;
  }

  hideCopyCustomerModal();
  // clear the temp
  window._lastCreatedCustomerForCopy = null;
});

// When user clicks "No": just close
copyCustomerNoBtn.addEventListener('click', () => {
  hideCopyCustomerModal();
  window._lastCreatedCustomerForCopy = null;
});


// ----- Check for patient by name and birthday -------
function findPatientByNameBirthdayAndNumber(name, birthday, number) {
  const patients = getPatientsArray();
  return patients.find(p =>
    p.name === name &&
    p.birthday === birthday &&
    p.number === number
  ) || null;
}

// ----- Check for customer by name, number, and birthday (NEW UTILITY) -------
function findCustomerByNameBirthdayAndNumber(name, birthday, number) {
  const customers = getCustomersArray();
  return customers.find(c =>
    c.name === name &&
    c.birthday === birthday &&
    c.number === number
  ) || null;
}

// ----------------- CUSTOMER ID GENERATION -----------------
// Format: OC25AA0001
const CUSTOMER_ID_PREFIX = 'OC';

function getLastCustomerIdFromStorage(){
  const raw = localStorage.getItem('customers');
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    // assume customers appended in chronological order, take last
    return arr[arr.length - 1].id || null;
  } catch (e) {
    return null;
  }
}

function generateNextCustomerId(){
  const last = getLastCustomerIdFromStorage();
  const next = incrementId(last, CUSTOMER_ID_PREFIX);
  if (!next) {
    alert('No more available customer IDs (reached ZZ9999).');
    return '';
  }
  return next;
}

// ----------------- PATIENT ID GENERATION (NEW) -----------------
// Format: PX25AA0001
const PATIENT_ID_PREFIX = 'PX';

function getLastPatientIdFromStorage(){
  const raw = localStorage.getItem('patients'); // Separate storage key
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    // assume patients appended in chronological order, take last
    return arr[arr.length - 1].id || null;
  } catch (e) {
    return null;
  }
}

function generateNextPatientId(){
  const last = getLastPatientIdFromStorage();
  const next = incrementId(last, PATIENT_ID_PREFIX);
  if (!next) {
    alert('No more available patient IDs (reached ZZ9999).');
    return '';
  }
  return next;
}


// ----------------- DATE UTILITIES & VALIDATION -----------------
function isLeapYear(y){
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function daysInMonth(m, y){
  m = parseInt(m,10);
  if ([1,3,5,7,8,10,12].includes(m)) return 31;
  if ([4,6,9,11].includes(m)) return 30;
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return 0;
}

function isValidDateParts(mm, dd, yyyy){
  if (!/^[0-9]{1,2}$/.test(mm) || !/^[0-9]{1,2}$/.test(dd) || !/^[0-9]{4}$/.test(yyyy)) return false;
  const m = parseInt(mm,10);
  const d = parseInt(dd,10);
  const y = parseInt(yyyy,10);
  if (m < 1 || m > 12) return false;
  const dim = daysInMonth(m, y);
  if (d < 1 || d > dim) return false;
  return true;
}

function toDateObject(mm, dd, yyyy){
  return new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
}

// ----------------- INPUT RESTRICTIONS -----------------

// allow only digits for certain inputs
const numericOnly = (el, maxLen=null) => {
  el.addEventListener('input', () => {
    el.value = el.value.replace(/\D+/g, '');
    if (maxLen) el.value = el.value.slice(0, maxLen);
  });
};

function setupNameInput(inputElement) { // (NEW UTILITY)
    inputElement.addEventListener('input', () => {
        // allow letters and spaces only, convert to uppercase
        inputElement.value = inputElement.value.replace(/[^A-Za-z ]+/g, '').toUpperCase();
    });
    inputElement.addEventListener('blur', () => {
        // collapse multiple spaces into single and trim edges
        inputElement.value = inputElement.value.replace(/\s+/g, ' ').trim();
    });
}

function setupEmailInput(inputElement) { // (NEW UTILITY)
    inputElement.addEventListener('input', () => {
        // email: no spaces allowed
        inputElement.value = inputElement.value.replace(/\s+/g, '');
    });
}

function setupAddressInput(inputElement) { // (NEW UTILITY)
    inputElement.addEventListener('input', () => {
        // address: allow letters, numbers, space, dot, comma
        inputElement.value = inputElement.value.replace(/[^A-Za-z0-9\., ]+/g, '');
    });
}


// --- Customer Restrictions ---
setupNameInput(newCustomerInputName);
// phone number: digits only, max 11, strict 11 on validation
numericOnly(newCustomerInputNumber, 11);
setupEmailInput(newCustomerInputEmail);
setupAddressInput(newCustomerInputAddress);

// date parts: numeric only and length limits
numericOnly(newCustomerDateCreatedMM, 2);
numericOnly(newCustomerDateCreatedDD, 2);
numericOnly(newCustomerDateCreatedYYYY, 4);
numericOnly(newCustomerBirthdayMM, 2);
numericOnly(newCustomerBirthdayDD, 2);
numericOnly(newCustomerBirthdayYYYY, 4);


// --- Patient Restrictions (NEW) ---
setupNameInput(newPatientInputName);
// phone number: digits only, max 11, strict 11 on validation
numericOnly(newPatientInputNumber, 11);
setupEmailInput(newPatientInputEmail);
setupAddressInput(newPatientInputAddress);

// date parts: numeric only and length limits
numericOnly(newPatientDateCreatedMM, 2);
numericOnly(newPatientDateCreatedDD, 2);
numericOnly(newPatientDateCreatedYYYY, 4);
numericOnly(newPatientBirthdayMM, 2);
numericOnly(newPatientBirthdayDD, 2);
numericOnly(newPatientBirthdayYYYY, 4);


// ----------------- AGE CALCULATION (readonly) -----------------
function computeAgeAndSet(dateCreatedMM, dateCreatedDD, dateCreatedYYYY, birthdayMM, birthdayDD, birthdayYYYY, ageOutputElement){
  // if date created or birthday invalid -> set empty
  const mmC = dateCreatedMM.value;
  const ddC = dateCreatedDD.value;
  const yyC = dateCreatedYYYY.value;

  const mmB = birthdayMM.value;
  const ddB = birthdayDD.value;
  const yyB = birthdayYYYY.value;

  if (!isValidDateParts(mmC, ddC, yyC) || !isValidDateParts(mmB, ddB, yyB)){
    ageOutputElement.value = '';
    return;
  }

  const dateCreated = toDateObject(mmC, ddC, yyC);
  const birthday = toDateObject(mmB, ddB, yyB);

  if (birthday >= dateCreated) {
    ageOutputElement.value = 'Invalid';
    return;
  }

  let age = dateCreated.getFullYear() - birthday.getFullYear();
  const mDiff = dateCreated.getMonth() - birthday.getMonth();
  if (mDiff < 0 || (mDiff === 0 && dateCreated.getDate() < birthday.getDate())){
    age -= 1;
  }
  ageOutputElement.value = String(age);
}

// Age function for Customer form (MODIFIED)
function computeCustomerAgeAndSet() {
  computeAgeAndSet(
    newCustomerDateCreatedMM, newCustomerDateCreatedDD, newCustomerDateCreatedYYYY,
    newCustomerBirthdayMM, newCustomerBirthdayDD, newCustomerBirthdayYYYY,
    newCustomerInputAge
  );
}

// Age function for Patient form (NEW)
function computePatientAgeAndSet() {
  computeAgeAndSet(
    newPatientDateCreatedMM, newPatientDateCreatedDD, newPatientDateCreatedYYYY,
    newPatientBirthdayMM, newPatientBirthdayDD, newPatientBirthdayYYYY,
    newPatientInputAge
  );
}


// auto-update customer age when relevant fields change (MODIFIED)
[newCustomerDateCreatedMM, newCustomerDateCreatedDD, newCustomerDateCreatedYYYY,
 newCustomerBirthdayMM, newCustomerBirthdayDD, newCustomerBirthdayYYYY].forEach(el => {
  el.addEventListener('input', computeCustomerAgeAndSet);
  el.addEventListener('blur', computeCustomerAgeAndSet);
});

// auto-update patient age when relevant fields change (NEW)
[newPatientDateCreatedMM, newPatientDateCreatedDD, newPatientDateCreatedYYYY,
 newPatientBirthdayMM, newPatientBirthdayDD, newPatientBirthdayYYYY].forEach(el => {
  el.addEventListener('input', computePatientAgeAndSet);
  el.addEventListener('blur', computePatientAgeAndSet);
});


// ----------------- FORM VALIDATION UTILITIES -----------------
function markInvalid(el){
  el.style.border = '2px solid red';
}
function clearMark(el){
  el.style.border = '';
}

// ----------------- CUSTOMER FORM VALIDATION -----------------
function validateForm(){
  const errors = [];
  const fields = [
    newCustomerDateCreatedMM, newCustomerDateCreatedDD, newCustomerDateCreatedYYYY,
    newCustomerInputName, newCustomerInputNumber, newCustomerInputEmail,
    newCustomerInputSex, newCustomerInputAddress, newCustomerBirthdayMM,
    newCustomerBirthdayDD, newCustomerBirthdayYYYY
  ];
  // clear previous marks
  fields.forEach(clearMark);

  // Date created
  if (!isValidDateParts(newCustomerDateCreatedMM.value, newCustomerDateCreatedDD.value, newCustomerDateCreatedYYYY.value)){
    errors.push('Date Created is invalid');
    markInvalid(newCustomerDateCreatedMM);
    markInvalid(newCustomerDateCreatedDD);
    markInvalid(newCustomerDateCreatedYYYY);
  }

  // Name
  if (!/^[A-Z]+(?: [A-Z]+)*$/.test(newCustomerInputName.value)){
    errors.push('Name must be uppercase letters and spaces only');
    markInvalid(newCustomerInputName);
  }

  // Number: strict 11 digits
  if (!/^\d{11}$/.test(newCustomerInputNumber.value)){
    errors.push('Number must be exactly 11 digits');
    markInvalid(newCustomerInputNumber);
  }

  // Email: basic validation
  const email = newCustomerInputEmail.value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email.length === 0 || !emailRegex.test(email)){
    errors.push('Email is invalid');
    markInvalid(newCustomerInputEmail);
  }

  // Sex
  if (!newCustomerInputSex.value){
    errors.push('Sex must be selected');
    markInvalid(newCustomerInputSex);
  }

  // Address
  if (newCustomerInputAddress.value.trim().length === 0){
    errors.push('Address is required');
    markInvalid(newCustomerInputAddress);
  }

  // Birthday
  if (!isValidDateParts(newCustomerBirthdayMM.value, newCustomerBirthdayDD.value, newCustomerBirthdayYYYY.value)){
    errors.push('Birthday is invalid');
    markInvalid(newCustomerBirthdayMM);
    markInvalid(newCustomerBirthdayDD);
    markInvalid(newCustomerBirthdayYYYY);
  } else {
    // check age logic
    const dateCreated = toDateObject(newCustomerDateCreatedMM.value, newCustomerDateCreatedDD.value, newCustomerDateCreatedYYYY.value);
    const birthday = toDateObject(newCustomerBirthdayMM.value, newCustomerBirthdayDD.value, newCustomerBirthdayYYYY.value);
    if (birthday >= dateCreated){
      errors.push('Birthday must be earlier than Date Created');
      markInvalid(newCustomerBirthdayMM);
      markInvalid(newCustomerBirthdayDD);
      markInvalid(newCustomerBirthdayYYYY);
    }
  }

  return errors;
}

// ----------------- PATIENT FORM VALIDATION (NEW) -----------------
function validatePatientForm(){
  const errors = [];
  const fields = [
    newPatientDateCreatedMM, newPatientDateCreatedDD, newPatientDateCreatedYYYY,
    newPatientInputName, newPatientInputNumber, newPatientInputEmail,
    newPatientInputSex, newPatientInputAddress, newPatientBirthdayMM,
    newPatientBirthdayDD, newPatientBirthdayYYYY
  ];
  // clear previous marks
  fields.forEach(clearMark);

  // Date created
  if (!isValidDateParts(newPatientDateCreatedMM.value, newPatientDateCreatedDD.value, newPatientDateCreatedYYYY.value)){
    errors.push('Date Created is invalid');
    markInvalid(newPatientDateCreatedMM);
    markInvalid(newPatientDateCreatedDD);
    markInvalid(newPatientDateCreatedYYYY);
  }

  // Name
  if (!/^[A-Z]+(?: [A-Z]+)*$/.test(newPatientInputName.value)){
    errors.push('Name must be uppercase letters and spaces only');
    markInvalid(newPatientInputName);
  }

  // Number: strict 11 digits
  if (!/^\d{11}$/.test(newPatientInputNumber.value)){
    errors.push('Number must be exactly 11 digits');
    markInvalid(newPatientInputNumber);
  }

  // Email: basic validation
  const email = newPatientInputEmail.value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email.length === 0 || !emailRegex.test(email)){
    errors.push('Email is invalid');
    markInvalid(newPatientInputEmail);
  }

  // Sex
  if (!newPatientInputSex.value){
    errors.push('Sex must be selected');
    markInvalid(newPatientInputSex);
  }

  // Address
  if (newPatientInputAddress.value.trim().length === 0){
    errors.push('Address is required');
    markInvalid(newPatientInputAddress);
  }

  // Birthday
  if (!isValidDateParts(newPatientBirthdayMM.value, newPatientBirthdayDD.value, newPatientBirthdayYYYY.value)){
    errors.push('Birthday is invalid');
    markInvalid(newPatientBirthdayMM);
    markInvalid(newPatientBirthdayDD);
    markInvalid(newPatientBirthdayYYYY);
  } else {
    // check age logic
    const dateCreated = toDateObject(newPatientDateCreatedMM.value, newPatientDateCreatedDD.value, newPatientDateCreatedYYYY.value);
    const birthday = toDateObject(newPatientBirthdayMM.value, newPatientBirthdayDD.value, newPatientBirthdayYYYY.value);
    if (birthday >= dateCreated){
      errors.push('Birthday must be earlier than Date Created');
      markInvalid(newPatientBirthdayMM);
      markInvalid(newPatientBirthdayDD);
      markInvalid(newPatientBirthdayYYYY);
    }
  }

  return errors;
}


// ----------------- STORAGE UTILITIES -----------------

// --- Customer Storage ---
function getCustomersArray(){
  try {
    const raw = localStorage.getItem('customers');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e){
    return [];
  }
}

function saveCustomerToStorage(customerObj){
  const arr = getCustomersArray();
  arr.push(customerObj);
  localStorage.setItem('customers', JSON.stringify(arr));
}

// --- Patient Storage (NEW) ---
function getPatientsArray(){
  try {
    const raw = localStorage.getItem('patients'); // Separate storage key
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e){
    return [];
  }
}

function savePatientToStorage(patientObj){
  const arr = getPatientsArray();
  arr.push(patientObj);
  localStorage.setItem('patients', JSON.stringify(arr));
}


// ----------------- INITIALIZATION & HANDLERS -----------------
function fillDateDefaults(mmInput, ddInput, yyyyInput){ // (NEW UTILITY)
  const now = new Date();
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const yyyy = String(now.getFullYear());
  
  if (!mmInput.value) mmInput.value = mm;
  if (!ddInput.value) ddInput.value = dd;
  if (!yyyyInput.value) yyyyInput.value = yyyy;
}

// --- Customer Handlers ---
function setupNewCustomerForm(){
  // Generate next ID
  const nextId = generateNextCustomerId();
  newCustomerInputId.value = nextId;

  // Fill date created with device date if empty
  fillDateDefaults(newCustomerDateCreatedMM, newCustomerDateCreatedDD, newCustomerDateCreatedYYYY);

  computeCustomerAgeAndSet();
}

newCustomerAddBtn.addEventListener('click', () => {
  const errors = validateForm();
  if (errors.length > 0){
    alert('Please fix the following errors:\n' + errors.join('\n'));
    return;
  }

  // --- START DUPLICATE CHECK FOR CUSTOMER ---
  const formattedBirthday = `${newCustomerBirthdayMM.value.padStart(2,'0')}-${newCustomerBirthdayDD.value.padStart(2,'0')}-${newCustomerBirthdayYYYY.value}`;
  const existingCustomer = findCustomerByNameBirthdayAndNumber(
    newCustomerInputName.value,
    formattedBirthday,
    newCustomerInputNumber.value
  );

  if (existingCustomer) {
    alert('Record already exists: A customer with the same Name, Number, and Birthday already exists.');
    return; // STOP SUBMISSION
  }
  // --- END DUPLICATE CHECK FOR CUSTOMER ---


  const customer = {
    id: newCustomerInputId.value,
    created: `${newCustomerDateCreatedMM.value.padStart(2,'0')}-${newCustomerDateCreatedDD.value.padStart(2,'0')}-${newCustomerDateCreatedYYYY.value}`,
    name: newCustomerInputName.value,
    number: newCustomerInputNumber.value,
    email: newCustomerInputEmail.value,
    sex: newCustomerInputSex.value.toUpperCase(),
    address: newCustomerInputAddress.value,
    birthday: formattedBirthday // Use the already formatted birthday
  };

  // 1) Save customer
  saveCustomerToStorage(customer);
  alert('Customer saved: ' + customer.id);

  // 2) Check if there is already a patient with same name + birthday + number
  const existingPatient = findPatientByNameBirthdayAndNumber(
    customer.name,
    customer.birthday,
    customer.number
  );

  // If no existing patient, show modal asking to copy
  if (!existingPatient) {
    window._lastCreatedCustomerForCopy = customer;
    showCopyCustomerModal();
  }
  // 3) Prepare for next entry (same as before)
  const nextId = incrementId(customer.id, CUSTOMER_ID_PREFIX);
  if (nextId) newCustomerInputId.value = nextId; else newCustomerInputId.value = '';

  // keep date created as-is, clear other inputs
  newCustomerInputName.value = '';
  newCustomerInputNumber.value = '';
  newCustomerInputEmail.value = '';
  newCustomerInputSex.value = '';
  newCustomerInputAddress.value = '';
  newCustomerBirthdayMM.value = '';
  newCustomerBirthdayDD.value = '';
  newCustomerBirthdayYYYY.value = '';
  newCustomerInputAge.value = '';
});


// --- Patient Handlers (NEW) ---
function setupNewPatientForm(){
  // Generate next ID
  const nextId = generateNextPatientId();
  newPatientInputId.value = nextId;

  // Fill date created with device date if empty
  fillDateDefaults(newPatientDateCreatedMM, newPatientDateCreatedDD, newPatientDateCreatedYYYY);

  computePatientAgeAndSet();
}

newPatientAddBtn.addEventListener('click', () => {
  const errors = validatePatientForm();
  if (errors.length > 0){
    alert('Please fix the following errors:\n' + errors.join('\n'));
    return;
  }

  // --- START DUPLICATE CHECK FOR PATIENT ---
  const formattedBirthday = `${newPatientBirthdayMM.value.padStart(2,'0')}-${newPatientBirthdayDD.value.padStart(2,'0')}-${newPatientBirthdayYYYY.value}`;
  const existingPatient = findPatientByNameBirthdayAndNumber(
    newPatientInputName.value,
    formattedBirthday,
    newPatientInputNumber.value
  );

  if (existingPatient) {
    alert('Record already exists: A patient with the same Name, Number, and Birthday already exists.');
    return; // STOP SUBMISSION
  }
  // --- END DUPLICATE CHECK FOR PATIENT ---

  const patient = {
    id: newPatientInputId.value,
    created: `${newPatientDateCreatedMM.value.padStart(2,'0')}-${newPatientDateCreatedDD.value.padStart(2,'0')}-${newPatientDateCreatedYYYY.value}`,
    name: newPatientInputName.value,
    number: newPatientInputNumber.value,
    email: newPatientInputEmail.value,
    sex: newPatientInputSex.value.toUpperCase(),
    address: newPatientInputAddress.value,
    birthday: formattedBirthday // Use the already formatted birthday
  };

  savePatientToStorage(patient);
  alert('Patient saved: ' + patient.id);

  // prepare for next entry: generate next id and clear fields except date
  const nextId = incrementId(patient.id, PATIENT_ID_PREFIX);
  if (nextId) newPatientInputId.value = nextId; else newPatientInputId.value = '';

  // keep date created as-is, clear other inputs
  newPatientInputName.value = '';
  newPatientInputNumber.value = '';
  newPatientInputEmail.value = '';
  newPatientInputSex.value = '';
  newPatientInputAddress.value = '';
  newPatientBirthdayMM.value = '';
  newPatientBirthdayDD.value = '';
  newPatientBirthdayYYYY.value = '';
  newPatientInputAge.value = '';
});



// Export helpers for potential reuse (not necessary but useful for debugging)
window._OpticSite = {
  generateNextCustomerId,
  getCustomersArray,
  generateNextPatientId, // (NEW)
  getPatientsArray // (NEW)
};

// On load: nothing to do until user opens the New Customer form

// ----------------- CLEAR DATA BUTTON -----------------
const clearDataBtn = document.getElementById("clearDataBtn");
if (clearDataBtn) {
clearDataBtn.addEventListener('click', () => {
if (confirm('This will delete ALL saved customers and patients data. Continue?')) { // (MODIFIED confirmation)
localStorage.clear();
alert('All saved data has been cleared.');
}
});
}

// ----- Select Patient Table Population -----
const selectPatientSearchInput = document.querySelector('.select-patient-search-area input');
const selectPatientTableBody = document.querySelector('.select-patient-main-table tbody');

function populateSelectPatientTable() {
  const patients = getPatientsArray();
  selectPatientTableBody.innerHTML = ''; // clear

  if (patients.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = 'Empty';
    tr.appendChild(td);
    selectPatientTableBody.appendChild(tr);
    return;
  }

  patients.forEach(patient => {
    const tr = document.createElement('tr');

    // ID
    const tdId = document.createElement('td');
    tdId.textContent = patient.id;
    tr.appendChild(tdId);

    // Name
    const tdName = document.createElement('td');
    tdName.textContent = patient.name;
    tr.appendChild(tdName);

    // Number
    const tdNumber = document.createElement('td');
    tdNumber.textContent = patient.number;
    tr.appendChild(tdNumber);

    // Action
    const tdAction = document.createElement('td');
    const selectBtn = document.createElement('button');
    selectBtn.textContent = 'Select';
    selectBtn.addEventListener('click', () => {
      loadPatientToProfileForm(patient);
      showNewPrescriptionSubview(newPrescriptionPatientForm);
      // Hide final prescription as requested
      document.getElementById('finalPrescriptionFormContainer').classList.add('hidden');
    });
    tdAction.appendChild(selectBtn);
    tr.appendChild(tdAction);

    selectPatientTableBody.appendChild(tr);
  });
}

// Wrap showNewPrescriptionSubview to auto-populate table when showing select menu
const originalShowNewPrescriptionSubview = showNewPrescriptionSubview;
showNewPrescriptionSubview = function(view) {
  originalShowNewPrescriptionSubview(view);
  if (view === nav2NewPrescriptionSelectPatientMenu) {
    populateSelectPatientTable();
    selectPatientSearchInput.value = ''; // Reset search
  }
};

// Search filtering
selectPatientSearchInput.addEventListener('input', () => {
  const query = selectPatientSearchInput.value.toLowerCase();
  const rows = selectPatientTableBody.querySelectorAll('tr');
  rows.forEach(row => {
    if (row.querySelector('td[colspan]')) return; // skip empty row
    const id = row.children[0].textContent.toLowerCase();
    const name = row.children[1].textContent.toLowerCase();
    const number = row.children[2].textContent.toLowerCase();
    if (id.includes(query) || name.includes(query) || number.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
});

// ----- Load Patient to Profile Form -----
const patientProfileIdNumber = document.getElementById('patientProfileIdNumber');
const patientProfileDateCreated = document.getElementById('patientProfileDateCreated');
const patientProfileName = document.getElementById('patientProfileName');
const patientProfileNumber = document.getElementById('patientProfileNumber');
const patientProfileEmail = document.getElementById('patientProfileEmail');
const patientProfileSex = document.getElementById('patientProfileSex');
const patientProfileAddress = document.getElementById('patientProfileAddress');
const patientProfileBirthday = document.getElementById('patientProfileBirthday');
const patientProfileAge = document.getElementById('patientProfileAge');

function loadPatientToProfileForm(patient) {
  patientProfileIdNumber.value = patient.id;
  patientProfileDateCreated.value = patient.created;
  patientProfileName.value = patient.name;
  patientProfileNumber.value = patient.number;
  patientProfileEmail.value = patient.email;
  patientProfileSex.value = patient.sex;
  patientProfileAddress.value = patient.address;
  patientProfileBirthday.value = patient.birthday;

  // Compute current age (as of today)
  const [mmB, ddB, yyyyB] = patient.birthday.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - yyyyB;
  const mDiff = (now.getMonth() + 1) - mmB;
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < ddB)) {
    age -= 1;
  }
  patientProfileAge.value = age;
}