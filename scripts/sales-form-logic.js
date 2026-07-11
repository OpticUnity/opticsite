//--------------- Sales: Select Customer Table Logic ---------------

// -- Render / Filter the Customer Table --
function renderSelectCustomerTable(filter = "", page = 1) {
    const tableBody = document.querySelector("#newOrderSelectCustomerMenu tbody");
    if (!tableBody) return;

    const rowsPerPage = 10;
    const customers = JSON.parse(Storage.getItem('customers') || '[]');

    // --- 1. TOTALLY EMPTY ---
    if (customers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="color: gray; font-style: italic; padding: 20px; text-align: center;">
                    No customers yet
                </td>
            </tr>`;
        document.getElementById("selectCustomerPagination").innerHTML = "";
        return;
    }

    // --- 2. FILTER ---
    const filteredCustomers = customers
        .filter(c => {
            const search = filter.toLowerCase();
            const id     = (c.id     || '').toLowerCase();
            const name   = (c.name   || '').toLowerCase();
            const number = (c.number || '').toLowerCase();
            return id.includes(search) || name.includes(search) || number.includes(search);
        })
        .reverse();

    tableBody.innerHTML = "";

    // --- 3. NO SEARCH RESULTS ---
    if (filteredCustomers.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="4" style="color: gray; font-style: italic; padding: 20px; text-align: center;">
                No Match Found
            </td>`;
        tableBody.appendChild(row);
        document.getElementById("selectCustomerPagination").innerHTML = "";
        return;
    }

    // --- 4. PAGINATE ---
    const start     = (page - 1) * rowsPerPage;
    const pageItems = filteredCustomers.slice(start, start + rowsPerPage);

    pageItems.forEach(customer => {
        const isDeleted = customer.deleted === true;
        const row = document.createElement("tr");
        if (isDeleted) row.classList.add('record-deleted');
        row.innerHTML = `
            <td>${customer.id}</td>
            <td class="uppercase">${isDeleted ? '[DELETED]' : customer.name}</td>
            <td>${isDeleted ? '—' : customer.number}</td>
            <td>${isDeleted
                ? '<span class="deleted-label">Deleted</span>'
                : '<button class="select-patient-button">Select</button>'
            }</td>
        `;

        if (!isDeleted) {
            row.querySelector(".select-patient-button").addEventListener("click", () => {
                selectCustomer(customer);
            });
        }

        tableBody.appendChild(row);
    });

    // --- 5. PAGINATION CONTROLS ---
    createPagination(
        "selectCustomerPagination",
        filteredCustomers,
        page,
        rowsPerPage,
        (newPage) => renderSelectCustomerTable(filter, newPage)
    );
}

// -- Select a Customer --
function selectCustomer(customer) {
    soIsWalkIn = false;
    if (typeof soRebuildTable === 'function') soRebuildTable();

    document.getElementById("customerProfileIdNumber").value    = customer.id;
    document.getElementById("customerProfileDateCreated").value = customer.dateCreated;
    document.getElementById("customerProfileName").value        = customer.name;
    document.getElementById("customerProfileNumber").value      = customer.number;
    document.getElementById("customerProfileEmail").value       = customer.email    || '';
    document.getElementById("customerProfileSex").value         = customer.sex      || '';
    document.getElementById("customerProfileAddress").value     = customer.address  || '';
    document.getElementById("customerProfileBirthday").value    = customer.birthday || '';
    document.getElementById("customerProfileAge").value         = customer.age      || '';

    // Hide table, show profile + change button
    document.getElementById("newOrderSelectCustomerMenu").classList.add("hidden");
    document.getElementById("changeCustomerContainer").classList.remove("hidden");
    document.getElementById("customerProfileForm").classList.remove("hidden");

    // Generate order ID and date, reveal ID block + order table
    generateOrderID();
    setDateCreated('order');
    document.getElementById("orderIdBlock").classList.remove("hidden");
    document.getElementById("orderItemsBlock").classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -- Walk-in (no customer record) --
function walkIn() {
    soIsWalkIn = true;
    if (typeof soRebuildTable === 'function') soRebuildTable();

    // Hide table, hide customer profile (no customer to show)
    document.getElementById("newOrderSelectCustomerMenu").classList.add("hidden");
    document.getElementById("customerProfileForm").classList.add("hidden");
    document.getElementById("changeCustomerContainer").classList.remove("hidden");
    document.getElementById("walkinCustomerHeader").classList.remove("hidden");

    // Generate order ID and date, reveal ID block + order table
    generateOrderID();
    setDateCreated('order');
    document.getElementById("orderIdBlock").classList.remove("hidden");
    document.getElementById("orderItemsBlock").classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -- Change / Reset Customer --
function changeCustomer() {
    // Clear profile fields
    [
        "customerProfileIdNumber", "customerProfileDateCreated", "customerProfileName",
        "customerProfileNumber",   "customerProfileEmail",       "customerProfileSex",
        "customerProfileAddress",  "customerProfileBirthday",    "customerProfileAge"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    // Reset search bar
    const searchBar = document.getElementById("selectCustomerSearchBarInput");
    if (searchBar) searchBar.value = "";

    // Hide profile + ID block + order table, show customer selection
    document.getElementById("customerProfileForm").classList.add("hidden");
    document.getElementById("changeCustomerContainer").classList.add("hidden");
    document.getElementById("orderIdBlock").classList.add("hidden");
    document.getElementById("walkinCustomerHeader").classList.add("hidden");
    document.getElementById("orderItemsBlock").classList.add("hidden");
    document.getElementById("newOrderSelectCustomerMenu").classList.remove("hidden");

    // Reset walk-in state along with the order table and summary
    soIsWalkIn = false;
    if (typeof soResetOrderForm === 'function') soResetOrderForm();

    renderSelectCustomerTable();
}

//--------------- Order ID Generation ---------------

// -- Generate Order ID (OR prefix) --
function generateOrderID() {
    const records = JSON.parse(Storage.getItem('salesOrders') || '[]');
    const currentYearShort = new Date().getFullYear().toString().slice(-2);

    let nextNumber = 1;
    let series = "AA";

    if (records.length > 0) {
        const lastRecord = records[records.length - 1];
        const lastID = lastRecord.id;
        const lastYear   = lastID.substring(2, 4);
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
    const newID = `OR${currentYearShort}${series}${paddedNum}`;

    const inputEl = document.getElementById("orderID");
    if (inputEl) inputEl.value = newID;

    return newID;
}

// -- Collision Guard: re-check at save time --
function _resolveUniqueOrderID() {
    const inputEl     = document.getElementById('orderID');
    const displayedID = inputEl ? inputEl.value.trim() : '';

    const records = JSON.parse(Storage.getItem('salesOrders') || '[]');
    const idTaken = records.some(r => r.id === displayedID);

    if (!idTaken) return displayedID;

    console.warn(`[ID Guard] ${displayedID} already exists in salesOrders. Regenerating...`);
    return generateOrderID();
}

//--------------- Init ---------------

function initSalesFormLogic() {
    // Search bar
    const searchBar = document.getElementById("selectCustomerSearchBarInput");
    if (searchBar) {
        searchBar.addEventListener("input", (e) => {
            renderSelectCustomerTable(e.target.value);
        });
    }

    // "Select Different Customer" button
    document.getElementById("selectDifferentCustomerBtn")?.addEventListener("click", () => {
        changeCustomer();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Walk-in button
    document.getElementById("walkInBtn")?.addEventListener("click", walkIn);

    // Sample button (debug)
    document.getElementById("customerSampleBtn")?.addEventListener("click", addSampleCustomers);

    // Initial table render
    renderSelectCustomerTable();
}

//--------------- DEBUG: Add 10 Sample Customers --------------- DELETE BEFORE FINAL PRODUCT ---------------

function addSampleCustomers() {
    const firstNames = ["Maria", "Jose", "Ana", "Juan", "Rosa", "Carlo", "Lena", "Marco", "Nina", "Diego"];
    const lastNames  = ["Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres", "Flores", "Ramos", "Dela Cruz"];
    const sexes      = ["Male", "Female"];
    const streets    = ["123 Rizal St", "456 Mabini Ave", "789 Bonifacio Blvd", "321 Luna St", "654 Aguinaldo Rd"];
    const cities     = ["Quezon City", "Manila", "Makati", "Pasig", "Caloocan"];

    for (let i = 0; i < 10; i++) {
        const customers = JSON.parse(Storage.getItem('customers') || '[]');

        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName  = lastNames[Math.floor(Math.random() * lastNames.length)];
        const name      = `${firstName} ${lastName}`.toUpperCase();
        const sex       = sexes[Math.floor(Math.random() * sexes.length)];
        const address   = `${streets[Math.floor(Math.random() * streets.length)]}, ${cities[Math.floor(Math.random() * cities.length)]}`;

        const age       = Math.floor(Math.random() * 70) + 10;
        const birthYear = new Date().getFullYear() - age;
        const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const birthDay   = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const birthday   = `${birthYear}-${birthMonth}-${birthDay}`;

        const number = `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
        const email  = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}@email.com`;

        const now = new Date();
        const dateCreated = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const id = generateID('customer');

        const newCustomer = { id, dateCreated, name, number, email, sex, address, birthday, age: String(age) };
        customers.push(newCustomer);
        Storage.setItem('customers', JSON.stringify(customers));
    }

    openAlert({ title: 'Done', body: '10 sample customers added!' });
    renderSelectCustomerTable();
    generateID('customer');
}