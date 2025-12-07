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

