(function () {
    if (window.__TAURI__) return; // Desktop app — skip entirely

    const _gateKey = atob("R0RMU0MxMDU=");
    const _storageKey = "opticsite_unlocked";

    if (localStorage.getItem(_storageKey) === "true") return; // Already unlocked

    // Block the page until unlocked
    const overlay = document.createElement("div");
    overlay.id = "lockOverlay";
    overlay.style.cssText = `
        position:fixed; inset:0; z-index:99999;
        background:var(--ui-bg, #fff);
        display:flex; flex-direction:column;
        align-items:center; justify-content:center; gap:12px;
    `;
    overlay.innerHTML = `
        <img src="assets/favicon.png" style="width:56px; margin-bottom:8px;" alt="OpticSite" />
        <h2 style="margin:0;">OpticSite</h2>
        <p>Room number of former clinicians' classroom, now a coffee shop</p>
        <p style="margin:0; opacity:0.6; font-size:0.9rem;">Enter access code to continue</p>
        <input id="lockInput" type="password" placeholder="example : CDL312"
            style="padding:8px 12px; font-size:1rem; border:1px solid #ccc; border-radius:6px; width:220px; text-align:center; text-transform:uppercase;"" />
        <button id="lockSubmitBtn"
            style="padding:8px 24px; font-size:1rem; border-radius:6px; cursor:pointer;">Unlock</button>
        <p id="lockError" style="color:red; font-size:0.85rem; min-height:1em;"></p>
    `;
    document.body.appendChild(overlay);

    function tryUnlock() {
        const input = document.getElementById("lockInput");
        if (input.value.toUpperCase() === _gateKey) {
            localStorage.setItem(_storageKey, "true");
            overlay.remove();
        } else {
            document.getElementById("lockError").textContent = "Incorrect access code.";
            input.value = "";
            input.focus();
        }
    }

    document.getElementById("lockSubmitBtn").addEventListener("click", tryUnlock);
    document.getElementById("lockInput").addEventListener("keydown", e => {
        if (e.key === "Enter") tryUnlock();
    });
})();

const _gateKey = atob("R0RMU0MxMDU=");
