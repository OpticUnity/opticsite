//--------------- Unified Form Logic (Customer & Patient) ---------------

// 1. Restrict to Numbers Only
function allowOnlyNumbers(event) {
    const isControlKey = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'].includes(event.key);
    if (!/[0-9]/.test(event.key) && !isControlKey) {
        event.preventDefault();
    }
}

// 2. ID Series Helper (AA -> AB ... AZ -> BA)
function incrementSeries(series) {
    let first = series.charCodeAt(0);
    let second = series.charCodeAt(1);

    second++;
    if (second > 90) { // If 'Z' is exceeded (ASCII 90)
        second = 65; // Reset to 'A' (ASCII 65)
        first++;
        if (first > 90) {
            return "ZZ"; // Maximum series reached
        }
    }
    return String.fromCharCode(first) + String.fromCharCode(second);
}

// 3. Generate Unique ID (OC for Customer, OP for Patient)
function generateID(type) {
    const isPatient = type === 'patient';
    const storageKey = isPatient ? 'patients' : 'customers';
    const prefix = isPatient ? 'OP' : 'OC';
    const inputId = isPatient ? 'patientIdInput' : 'customerIdInput';

    const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const currentYearShort = new Date().getFullYear().toString().slice(-2); 
    
    let nextNumber = 1;
    let series = "AA";

    if (records.length > 0) {
        const lastRecord = records[records.length - 1];
        const lastID = lastRecord.id; 
        const lastYear = lastID.substring(2, 4); 
        const lastSeries = lastID.substring(4, 6);
        const lastNumPart = parseInt(lastID.substring(6));
        
        if (lastYear === currentYearShort) {
            if (lastNumPart >= 9999) {
                series = incrementSeries(lastSeries);
                nextNumber = 1; 
            } else {
                series = lastSeries;
                nextNumber = lastNumPart + 1;
            }
        }
    }

    const paddedNum = String(nextNumber).padStart(4, '0');
    const newID = `${prefix}${currentYearShort}${series}${paddedNum}`;
    
    const inputEl = document.getElementById(inputId);
    if (inputEl) inputEl.value = newID;

    return newID; // ← ADD THIS
}

// 4. Calculate Age
function calculateAge(prefix) {
    const mm = document.getElementById(`${prefix}BirthdayMM`).value;
    const dd = document.getElementById(`${prefix}BirthdayDD`).value;
    const yyyy = document.getElementById(`${prefix}BirthdayYYYY`).value;
    const ageInput = document.getElementById(`${prefix}InputAge`);

    if (mm && dd && yyyy.length === 4) {
        const birthDate = new Date(yyyy, mm - 1, dd);
        const today = new Date();
        
        if (birthDate > today) {
            ageInput.value = "Invalid Date";
            return;
        }

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        ageInput.value = age < 1 ? "Invalid (Min 1yo)" : age;
    } else {
        ageInput.value = ""; 
    }
}

//--------------- Prescription: Select Patient Table Logic ---------------

//--------------- Reusable Pagination Logic ---------------

function createPagination(containerId, items, currentPage, rowsPerPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = Math.ceil(items.length / rowsPerPage);
    container.innerHTML = "";

    if (totalPages <= 1) return; // No pagination needed

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Prev";
    prevBtn.classList.toggle("disabled-page", currentPage === 1);
    if (currentPage > 1) prevBtn.addEventListener("click", () => onPageChange(currentPage - 1));
    container.appendChild(prevBtn);

    const pageInfo = document.createElement("span");
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    pageInfo.style.padding = "0 10px";
    pageInfo.style.lineHeight = "35px";
    container.appendChild(pageInfo);

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next →";
    nextBtn.classList.toggle("disabled-page", currentPage === totalPages);
    if (currentPage < totalPages) nextBtn.addEventListener("click", () => onPageChange(currentPage + 1));
    container.appendChild(nextBtn);
}

//--------------- Select Patient Logic ---------------

function selectPatient(patient) {
    // Populate patient profile fields
    document.getElementById("patientProfileIdNumber").value   = patient.id;
    document.getElementById("patientProfileDateCreated").value = patient.dateCreated;
    document.getElementById("patientProfileName").value       = patient.name;
    document.getElementById("patientProfileNumber").value     = patient.number;
    document.getElementById("patientProfileEmail").value      = patient.email;
    document.getElementById("patientProfileSex").value        = patient.sex;
    document.getElementById("patientProfileAddress").value    = patient.address;
    document.getElementById("patientProfileBirthday").value   = patient.birthday;
    document.getElementById("patientProfileAge").value        = patient.age;

    // Generate Prescription ID and date
    generatePrescriptionID();
    setDateCreated('prescription');

    // Hide the select patient menu, show the prescription form
    document.getElementById("newPrescriptionSelectPatientMenu").classList.add("hidden");
    document.getElementById("changePatientContainer").classList.remove("hidden");
    document.getElementById("patientProfileForm").classList.remove("hidden");
    document.getElementById("prescriptionMethodSelection").classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changePatient() {
    // Clear all profile fields
    ["patientProfileIdNumber", "patientProfileDateCreated", "patientProfileName",
     "patientProfileNumber", "patientProfileEmail", "patientProfileSex",
     "patientProfileAddress", "patientProfileBirthday", "patientProfileAge"]
    .forEach(id => document.getElementById(id).value = "");

    // Reset search bar
    const searchBar = document.getElementById("selectPatientSearchBarInput");
    if (searchBar) searchBar.value = "";

    // Reset rx select dropdown
    document.getElementById('rxSelect').selectedIndex = 0;

    // Hide everything
    document.getElementById('mainEyeExaminationForm').classList.add('hidden');
    document.getElementById('copyPrescriptionForm').classList.add('hidden');
    document.getElementById('copyPrescriptionFormCl').classList.add('hidden');
    document.getElementById('addPrescriptionContainer').classList.add('hidden');
    document.getElementById('prescriptionIdBlock').classList.add('hidden');
    document.getElementById('mainFinalPrescription').classList.add('hidden');
    document.getElementById('patientProfileForm').classList.add('hidden');
    document.getElementById('prescriptionMethodSelection').classList.add('hidden');
    document.getElementById('changePatientContainer').classList.add('hidden');

    // Show table
    document.getElementById("newPrescriptionSelectPatientMenu").classList.remove("hidden");

    renderSelectPatientTable();
}

// 5. Render/Filter the Patient Table
function renderSelectPatientTable(filter = "", page = 1) {
    const tableBody = document.querySelector("#newPrescriptionSelectPatientMenu tbody");
    if (!tableBody) return;

    const rowsPerPage = 10;
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');

    const filteredPatients = patients
        .filter(p => {
            const search = filter.toLowerCase();
            return p.id.toLowerCase().includes(search) ||
                   p.name.toLowerCase().includes(search) ||
                   p.number.toLowerCase().includes(search);
        })
        .reverse();

    tableBody.innerHTML = "";

    if (filteredPatients.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="4" style="color: gray; font-style: italic; padding: 20px; text-align: center;">
                No Match Found
            </td>`;
        tableBody.appendChild(row);
        document.getElementById("selectPatientPagination").innerHTML = "";
        return;
    }

    // Slice for current page
    const start = (page - 1) * rowsPerPage;
    const pageItems = filteredPatients.slice(start, start + rowsPerPage);

    pageItems.forEach(patient => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${patient.id}</td>
            <td class="uppercase">${patient.name}</td>
            <td>${patient.number}</td>
            <td><button class="select-patient-button">Select</button></td>
        `;

        // Select button logic
        row.querySelector(".select-patient-button").addEventListener("click", () => {
            selectPatient(patient);
        });

        tableBody.appendChild(row);
    });

    // Render pagination — reusable call
    createPagination(
        "selectPatientPagination",  // container ID
        filteredPatients,           // full filtered list
        page,                       // current page
        rowsPerPage,                // rows per page
        (newPage) => renderSelectPatientTable(filter, newPage) // on page change
    );
}

//--------------- DEBUG: Add 10 Sample Patients --------------- DELETE BEFORE FINAL PRODUCT -------------

function addSamplePatients() {
    const firstNames = ["Maria", "Jose", "Ana", "Juan", "Rosa", "Carlo", "Lena", "Marco", "Nina", "Diego"];
    const lastNames = ["Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres", "Flores", "Ramos", "Dela Cruz"];
    const sexes = ["Male", "Female"];
    const streets = ["123 Rizal St", "456 Mabini Ave", "789 Bonifacio Blvd", "321 Luna St", "654 Aguinaldo Rd"];
    const cities = ["Quezon City", "Manila", "Makati", "Pasig", "Caloocan"];

    for (let i = 0; i < 10; i++) {
        const patients = JSON.parse(localStorage.getItem('patients') || '[]');

        // Random details
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const name = `${lastName}, ${firstName}`.toUpperCase();
        const sex = sexes[Math.floor(Math.random() * sexes.length)];
        const address = `${streets[Math.floor(Math.random() * streets.length)]}, ${cities[Math.floor(Math.random() * cities.length)]}`;

        // Random birthday (age 10 - 80)
        const age = Math.floor(Math.random() * 70) + 10;
        const birthYear = new Date().getFullYear() - age;
        const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const birthday = `${birthYear}-${birthMonth}-${birthDay}`;

        // Random contact number (PH format)
        const number = `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;

        // Random email
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}@email.com`;

        // Date created = today
        const now = new Date();
        const dateCreated = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Generate ID using existing function (obeys ID rules)
        const id = generateID('patient');

        const newPatient = { id, dateCreated, name, number, email, sex, address, birthday, age: String(age) };
        patients.push(newPatient);

        // Save after each push so generateID reads the latest list next iteration
        localStorage.setItem('patients', JSON.stringify(patients));
    }

    alert("10 sample patients added!");
    renderSelectPatientTable();
    generateID('patient'); // Refresh the ID field to next available
}

//--------------- Unified Save & Clear Logic ---------------

// 6. Unified Save Logic
function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const isPatient = form.id === 'patientForm';
    const storageKey = isPatient ? 'patients' : 'customers';
    const prefix = isPatient ? 'patient' : 'customer';
    const idInput = isPatient ? 'patientIdInput' : 'customerIdInput';

    const inputsToValidate = form.querySelectorAll('input:not([readonly]), select');
    let isValid = true;
    inputsToValidate.forEach(input => {
        if (!input.value.trim() || input.value.includes("Invalid")) {
            input.classList.add('input-error'); 
            isValid = false;
        } else {
            input.classList.remove('input-error');
        }
    });
    if (!isValid) return alert("Please fill in all fields correctly.");

    const name = document.getElementById(`${prefix}InputName`).value.toUpperCase().trim();
    const number = document.getElementById(`${prefix}InputNumber`).value.trim();
    const birthday = `${document.getElementById(`${prefix}BirthdayYYYY`).value}-${document.getElementById(`${prefix}BirthdayMM`).value}-${document.getElementById(`${prefix}BirthdayDD`).value}`;

    const currentRecords = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const isDuplicate = currentRecords.some(r => 
        r.name === name && 
        r.number === number && 
        r.birthday === birthday
    );

    if (isDuplicate) {
        alert(`ACCESS DENIED: A matching record for "${name}" already exists.`);
        return; 
    }

    const newData = {
        id: document.getElementById(idInput).value,
        dateCreated: `${document.getElementById(`${prefix}DateCreatedYYYY`).value}-${document.getElementById(`${prefix}DateCreatedMM`).value}-${document.getElementById(`${prefix}DateCreatedDD`).value}`,
        name: name,
        number: number,
        email: document.getElementById(`${prefix}InputEmail`).value,
        sex: document.getElementById(`${prefix}InputSex`).value,
        address: document.getElementById(`${prefix}InputAddress`).value,
        birthday: birthday,
        age: document.getElementById(`${prefix}InputAge`).value
    };

    currentRecords.push(newData);
    localStorage.setItem(storageKey, JSON.stringify(currentRecords));
    alert(`${isPatient ? 'Patient' : 'Customer'} saved successfully.`);

    // One-Way Sync
    if (!isPatient) {
        const patientRecords = JSON.parse(localStorage.getItem('patients') || '[]');
        const existsInPatients = patientRecords.some(p => p.name === name && p.birthday === birthday);

        if (!existsInPatients && confirm("Create a Patient record for this customer?")) {
        const newPatientID = generateID('patient');
        patientRecords.push({ ...newData, id: newPatientID });
        localStorage.setItem('patients', JSON.stringify(patientRecords)); // ← ADD THIS
        }
    }

    form.reset();
    // Only refresh the table if the prescription page is currently visible
    if (document.querySelector("#newPrescriptionSelectPatientMenu tbody")) {
        renderSelectPatientTable();
    }
}

// 7. Clear Data Logic
function clearAllData() {
    if (confirm("Are you sure? This will delete all records.")) {
        localStorage.clear();
        alert("Database cleared.");
        window.location.reload(); 
    }
}

// 8. Auto-set "Date Created"
function setDateCreated(prefix) {
    const now = new Date();
    const mmEl = document.getElementById(`${prefix}DateCreatedMM`);
    const ddEl = document.getElementById(`${prefix}DateCreatedDD`);
    const yyyyEl = document.getElementById(`${prefix}DateCreatedYYYY`);

    if (mmEl) mmEl.value = String(now.getMonth() + 1).padStart(2, '0');
    if (ddEl) ddEl.value = String(now.getDate()).padStart(2, '0');
    if (yyyyEl) yyyyEl.value = now.getFullYear();
}

// 9. Generate Prescription ID
function generatePrescriptionID() {
    const records = JSON.parse(localStorage.getItem('prescriptions') || '[]');
    const currentYearShort = new Date().getFullYear().toString().slice(-2);

    let nextNumber = 1;
    let series = "AA";

    if (records.length > 0) {
        const lastRecord = records[records.length - 1];
        const lastID = lastRecord.id;
        const lastYear = lastID.substring(2, 4);
        const lastSeries = lastID.substring(4, 6);
        const lastNumPart = parseInt(lastID.substring(6));

        if (lastYear === currentYearShort) {
            if (lastNumPart >= 9999) {
                series = incrementSeries(lastSeries);
                nextNumber = 1;
            } else {
                series = lastSeries;
                nextNumber = lastNumPart + 1;
            }
        }
    }

    const paddedNum = String(nextNumber).padStart(4, '0');
    const newID = `RX${currentYearShort}${series}${paddedNum}`;

    const inputEl = document.getElementById("prescriptionID");
    if (inputEl) inputEl.value = newID;

    return newID;
}

//--------------- Initialization ---------------

function initFormLogic() {
    // A. Numeric Restrictions
    const numericInputs = document.querySelectorAll('.date-part, #customerInputNumber, #patientInputNumber');
    numericInputs.forEach(input => {
        input.removeEventListener('keydown', allowOnlyNumbers);
        input.addEventListener('keydown', allowOnlyNumbers);
    });

    // B. Age Calculation Listeners
    const setupBirthday = (prefix) => {
        ['MM', 'DD', 'YYYY'].forEach(part => {
            const el = document.getElementById(`${prefix}Birthday${part}`);
            if (el) el.addEventListener('input', () => calculateAge(prefix));
        });
    };
    setupBirthday('customer');
    setupBirthday('patient');

    // C. Form Submissions
    document.getElementById('customerForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('patientForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('clearDataBtn')?.addEventListener('click', clearAllData);
    document.getElementById('patientSampleBtn')?.addEventListener('click', addSamplePatients);
    document.getElementById('selectDifferentPatientBtn')?.addEventListener('click', changePatient);
    document.getElementById('generateRxBtn')?.addEventListener('click', handleGenerateRx);

    // D. Rx Method Selection
    document.getElementById('rxSelect')?.addEventListener('change', (e) => {
        // hide all forms first
        document.getElementById('mainEyeExaminationForm').classList.add('hidden');
        document.getElementById('copyPrescriptionForm').classList.add('hidden');
        document.getElementById('copyPrescriptionFormCl').classList.add('hidden');
        document.getElementById('addPrescriptionContainer').classList.add('hidden');
        document.getElementById('prescriptionIdBlock').classList.add('hidden');

        // show selected
        if (e.target.value === 'eyeExam') {
                document.getElementById('mainEyeExaminationForm').classList.remove('hidden');
                document.getElementById('prescriptionIdBlock').classList.remove('hidden'); // ← show
            } else if (e.target.value === 'copyPrescription') {
                document.getElementById('copyPrescriptionForm').classList.remove('hidden');
                document.getElementById('addPrescriptionContainer').classList.remove('hidden');
                document.getElementById('prescriptionIdBlock').classList.remove('hidden'); // ← show
            } else if (e.target.value === 'copyPrescriptionCl') {
                document.getElementById('copyPrescriptionFormCl').classList.remove('hidden');
                document.getElementById('addPrescriptionContainer').classList.remove('hidden');
                document.getElementById('prescriptionIdBlock').classList.remove('hidden'); // ← show
            }
    });


    // E. Search Bar Listener
    const searchBar = document.getElementById("selectPatientSearchBarInput");
    if (searchBar) {
        searchBar.addEventListener("input", (e) => {
            renderSelectPatientTable(e.target.value);
        });
    }

    // F. Set Defaults
    setDateCreated('customer');
    setDateCreated('patient');  
    generateID('customer'); 
    generateID('patient');
    renderSelectPatientTable(); // Initial load of the table

}

//--------------- Generate Rx Logic ---------------

function handleGenerateRx() {

    // Helper — checks if an eye's distance inputs meet minimum requirement
    function isEyeValid(sphId, cylId, axisId) {
        const sph = document.getElementById(sphId).value.trim();
        const cyl = document.getElementById(cylId).value.trim();
        const axis = document.getElementById(axisId).value.trim();

        const hasSph = sph !== '';
        const hasCyl = cyl !== '';
        const hasAxis = axis !== '';

        // CYL without AXIS or AXIS without CYL → always invalid
        if (hasCyl && !hasAxis) return false;
        if (hasAxis && !hasCyl) return false;

        // Must have at least SPH or (CYL + AXIS)
        return hasSph || (hasCyl && hasAxis);
    }

    const odValid = isEyeValid('vt7OdDistanceSph', 'vt7OdDistanceCyl', 'vt7OdDistanceAxis');
    const osValid = isEyeValid('vt7OsDistanceSph', 'vt7OsDistanceCyl', 'vt7OsDistanceAxis');

    if (!odValid || !osValid) {
        alert("Minimum required per eye: SPH alone, or CYL + AXIS together.");
        return;
    }

    // -- Copy VT7 OD → Final Rx OD --
    document.getElementById('frxOdDistanceSph').value   = document.getElementById('vt7OdDistanceSph').value;
    document.getElementById('frxOdDistanceCyl').value   = document.getElementById('vt7OdDistanceCyl').value;
    document.getElementById('frxOdDistanceAxis').value  = document.getElementById('vt7OdDistanceAxis').value;
    document.getElementById('frxOdDistancePd').value    = document.getElementById('vt7OdDistancePd').value;
    document.getElementById('frxOdDistanceVa').value    = document.getElementById('vt7OdDistanceVa').value;
    document.getElementById('frxOdNearSph').value       = document.getElementById('vt7OdNearSph').value;
    document.getElementById('frxOdNearCyl').value       = document.getElementById('vt7OdNearCyl').value;
    document.getElementById('frxOdNearAxis').value      = document.getElementById('vt7OdNearAxis').value;
    document.getElementById('frxOdNearPd').value        = document.getElementById('vt7OdNearPd').value;
    document.getElementById('frxOdNearVa').value        = document.getElementById('vt7OdNearVa').value;
    document.getElementById('frxOdAddSph').value        = document.getElementById('vt7OdAddSph').value;

    // -- Copy VT7 OS → Final Rx OS --
    document.getElementById('frxOsDistanceSph').value   = document.getElementById('vt7OsDistanceSph').value;
    document.getElementById('frxOsDistanceCyl').value   = document.getElementById('vt7OsDistanceCyl').value;
    document.getElementById('frxOsDistanceAxis').value  = document.getElementById('vt7OsDistanceAxis').value;
    document.getElementById('frxOsDistancePd').value    = document.getElementById('vt7OsDistancePd').value;
    document.getElementById('frxOsDistanceVa').value    = document.getElementById('vt7OsDistanceVa').value;
    document.getElementById('frxOsNearSph').value       = document.getElementById('vt7OsNearSph').value;
    document.getElementById('frxOsNearCyl').value       = document.getElementById('vt7OsNearCyl').value;
    document.getElementById('frxOsNearAxis').value      = document.getElementById('vt7OsNearAxis').value;
    document.getElementById('frxOsNearPd').value        = document.getElementById('vt7OsNearPd').value;
    document.getElementById('frxOsNearVa').value        = document.getElementById('vt7OsNearVa').value;
    document.getElementById('frxOsAddSph').value        = document.getElementById('vt7OsAddSph').value;

    // Show Final Rx and Add button
    document.getElementById('mainFinalPrescription').classList.remove('hidden');
    document.getElementById('addPrescriptionContainer').classList.remove('hidden');

    // Scroll to Final Rx
    document.getElementById('mainFinalPrescription').scrollIntoView({ behavior: 'smooth' });
}

window.addEventListener('load', initFormLogic);