// -------------------- PROTOTYPING DELETE ON FINAL PUBLICATION --------------------



// PROTOTYPE DATA STORAGE & ID COUNTER
let patientsData = [
  // Start with a few sample patients if needed, e.g.,
  { id: 'PX0001', name: 'ADAM SMITH', number: '1234567890', created: '10-25-2023', email: 'a@mail.com', sex: 'MALE', address: '123 Main St', birthday: '01-01-1990' },
  { id: 'PX0002', name: 'JANE DOE', number: '0987654321', created: '11-15-2023', email: 'j@mail.com', sex: 'FEMALE', address: '456 Oak Ave', birthday: '05-10-1985' },
];

// Helper to determine the next ID
let patientIdCounter = patientsData.length > 0 
    ? parseInt(patientsData[patientsData.length - 1].id.replace('PX', '')) 
    : 0;

// The function used by loadSelectPatientTable
function getPatientsArray() {
    return patientsData;
}

// Helper function to generate a random date in MM-DD-YYYY format
function getRandomDate(startYear) {
    const today = new Date();
    const start = new Date(startYear, 0, 1);
    const date = new Date(start.getTime() + Math.random() * (today.getTime() - start.getTime()));
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
}

// Function to generate a single random patient
function generateRandomPatient() {
    patientIdCounter++;
    const nextId = 'PX' + String(patientIdCounter).padStart(4, '0');
    const firstNames = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'ZETA', 'IOTA', 'KAPPA'];
    const lastNames = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const sex = Math.random() < 0.5 ? 'MALE' : 'FEMALE';
    
    return {
        id: nextId,
        name: `${firstName} ${lastName}`,
        number: String(Math.floor(1000000000 + Math.random() * 9000000000)), // 10-digit number
        created: getRandomDate(2023),
        email: `${firstName.toLowerCase()}@sample.com`,
        sex: sex,
        address: `${Math.floor(Math.random() * 999) + 1} Random Street`,
        birthday: getRandomDate(1950) // Date of birth between 1950 and now
    };
}

// Find the new prototype button
const add10SamplesOfPxBtn = document.getElementById('add10SamplesOfPx');

// Logic for adding 10 sample patients
add10SamplesOfPxBtn.addEventListener('click', () => {
    console.log("Adding 10 sample patients...");
    
    for (let i = 0; i < 10; i++) {
        const newPatient = generateRandomPatient();
        patientsData.push(newPatient); // Add to the global data array
    }
    
    // Reload the table, which triggers sorting and updates pagination
    loadSelectPatientTable(); 
    
    console.log(`Added 10 patients. Total patients: ${patientsData.length}`);
});


