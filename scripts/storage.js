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
  let patients = getPatientsArray();
  selectPatientTableBody.innerHTML = '';

  // 🔹 Sort patients so newest ID appears first
  patients.sort((a, b) => b.id.localeCompare(a.id));

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

    const tdId = document.createElement('td');
    tdId.textContent = patient.id;
    tr.appendChild(tdId);

    const tdName = document.createElement('td');
    tdName.textContent = patient.name;
    tr.appendChild(tdName);

    const tdNumber = document.createElement('td');
    tdNumber.textContent = patient.number;
    tr.appendChild(tdNumber);

    const tdAction = document.createElement('td');
    const newPrescriptionSelectPatientBtn = document.createElement('button');
    newPrescriptionSelectPatientBtn.textContent = 'Select';
    newPrescriptionSelectPatientBtn.addEventListener('click', () => {
      loadPatientToProfileForm(patient);
      showNewPrescriptionSubview(newPrescriptionPatientForm);
      document.getElementById('finalPrescriptionFormContainer').classList.add('hidden');
    });
    tdAction.appendChild(newPrescriptionSelectPatientBtn);
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
  // Allow letters, digits, spaces — uppercase letters
  selectPatientSearchInput.value = selectPatientSearchInput.value
    .replace(/[^A-Za-z0-9 ]+/g, '')  // allow letters, digits, spaces
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trimStart();

  const query = selectPatientSearchInput.value.toLowerCase();
  const rows = selectPatientTableBody.querySelectorAll('tr');

  rows.forEach(row => {
    if (row.querySelector('td[colspan]')) return; // skip "Empty" / no results row

    const id = row.children[0].textContent.toLowerCase();
    const name = row.children[1].textContent.toLowerCase();
    const number = row.children[2].textContent.toLowerCase();

    // Search by ID, Name, or Number
    if (id.includes(query) || name.includes(query) || number.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });

  // Count visible rows
  let visibleCount = 0;
  rows.forEach(row => {
    if (row.style.display !== 'none' && !row.querySelector('td[colspan]')) {
      visibleCount++;
    }
  });

  // Remove previous message
  const existingMsg = selectPatientTableBody.querySelector('.no-results');
  if (existingMsg) existingMsg.remove();

  // If nothing visible — show subtle message row
  if (visibleCount === 0) {
    const tr = document.createElement('tr');
    tr.classList.add('no-results');

    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = 'No matching records found';
    td.style.opacity = '0.6';
    td.style.textAlign = 'center';

    tr.appendChild(td);
    selectPatientTableBody.appendChild(tr);
  }
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

