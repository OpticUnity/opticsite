// ================================================================
//  storage.js — OpticSite / OpticUnity
//  Centralized storage abstraction layer with SQLite / FastAPI backend
// ================================================================
//
//  PLATFORM & BACKEND DETECTION — automatic fallback chain:
//
//  1. FastAPI Backend (Local Server):
//      Attempts to query `/api/storage`. If successful, the app upgrades
//      to use SQLite storage via the local FastAPI server.
//
//  2. Tauri Desktop Mode (.exe / .app):
//      If backend is absent and window.__TAURI__ exists → Tauri adapter activates.
//      Uses readTextFile / writeTextFile via Tauri FS API.
//      Atomic write (.tmp → rename) protects against corruption.
//      Export uses native save dialog.
//
//  3. Browser Mode (Local Storage fallback):
//      If backend is absent and not in Tauri → Browser adapter activates.
//      Uses localStorage. No atomic write needed.
//      Export triggers a file download.
//
//  All adapters expose the same interface:
//      Storage.getItem(key)
//      Storage.setItem(key, value)
//      Storage.removeItem(key)
//      Storage.clear()
//      Storage.exportBackup()
//      Storage.importBackup()
//
//  initStorage() must be awaited before anything else runs.
//  It is called once in main.js on load.
//
// ================================================================

const DATA_FILE    = 'opticsite_data.json';
const DATA_VERSION = '0.1-emr';
const DATA_KEY     = 'opticsite_data';   // browser localStorage key

let _dataCache = null;
let _useBackend = false;
const _IS_TAURI = !!(window.__TAURI__);

// ================================================================
//  initStorage — detects platform/backend and initializes the right adapter
// ================================================================

async function initStorage() {
    // 1. Try FastAPI/SQLite Backend first
    try {
        const response = await fetch('/api/storage');
        if (response.ok) {
            _dataCache = await response.json();
            _useBackend = true;
            console.log('[Storage] SQLite/FastAPI backend adapter initialized successfully.');
            return;
        }
    } catch (e) {
        console.warn('[Storage] Backend server not detected, falling back to local files/storage.', e);
    }

    // 2. Fallback to Tauri or Browser
    if (_IS_TAURI) {
        await _initTauri();
    } else {
        _initBrowser();
    }
}

// ================================================================
//  BACKEND WRITER HELPERS
// ================================================================

async function _persistKey(key, value) {
    if (_useBackend) {
        try {
            await fetch('/api/storage/' + encodeURIComponent(key), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: value })
            });
        } catch (err) {
            console.error('[Storage] Backend save failed for key:', key, err);
        }
    } else {
        _persist();
    }
}

async function _deleteKey(key) {
    if (_useBackend) {
        try {
            await fetch('/api/storage/' + encodeURIComponent(key), {
                method: 'DELETE'
            });
        } catch (err) {
            console.error('[Storage] Backend delete failed for key:', key, err);
        }
    } else {
        _persist();
    }
}

async function _clearBackend() {
    if (_useBackend) {
        try {
            await fetch('/api/storage-clear', {
                method: 'POST'
            });
        } catch (err) {
            console.error('[Storage] Backend clear failed:', err);
        }
    } else {
        _persist();
    }
}

async function _bulkPersistBackend() {
    if (_useBackend) {
        try {
            await fetch('/api/storage-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: _dataCache })
            });
        } catch (err) {
            console.error('[Storage] Backend bulk persist failed:', err);
        }
    } else {
        _persist();
    }
}

// ================================================================
//  TAURI ADAPTER
// ================================================================

async function _initTauri() {
    const { readTextFile, writeTextFile, exists, mkdir } = window.__TAURI__.fs;
    const { appDataDir } = window.__TAURI__.path;

    const appDataPath = await appDataDir();
    window._tauriFilePath = appDataPath + '\\' + DATA_FILE;

    const dirExists = await exists(appDataPath);
    if (!dirExists) {
        await mkdir(appDataPath, { recursive: true });
    }

    const fileExists = await exists(window._tauriFilePath);
    if (!fileExists) {
        _dataCache = { version: DATA_VERSION };
        await writeTextFile(window._tauriFilePath, JSON.stringify(_dataCache));
    } else {
        const raw  = await readTextFile(window._tauriFilePath);
        _dataCache = JSON.parse(raw);
    }

    console.log('[Storage] Tauri adapter initialized:', window._tauriFilePath);
}

// Atomic write — .tmp first, then rename.
// Protects against a corrupt data file if the app is force-closed mid-write.
async function _persistTauri() {
    const tempPath = window._tauriFilePath + '.tmp';
    await window.__TAURI__.fs.writeTextFile(tempPath, JSON.stringify(_dataCache));
    await window.__TAURI__.fs.rename(tempPath, window._tauriFilePath);
}

// ================================================================
//  BROWSER ADAPTER
// ================================================================

function _initBrowser() {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) {
        _dataCache = { version: DATA_VERSION };
        localStorage.setItem(DATA_KEY, JSON.stringify(_dataCache));
    } else {
        _dataCache = JSON.parse(raw);
    }

    console.log('[Storage] Browser adapter initialized.');
}

function _persistBrowser() {
    localStorage.setItem(DATA_KEY, JSON.stringify(_dataCache));
}

// ================================================================
//  Unified _persist — calls the right fallback adapter automatically
// ================================================================

function _persist() {
    if (_IS_TAURI) {
        _persistTauri();   // async, fire-and-forget
    } else {
        _persistBrowser();
    }
}

// ================================================================
//  Storage — public interface, same for both platforms + backend
// ================================================================

const Storage = {
    getItem(key) {
        return _dataCache[key] !== undefined ? _dataCache[key] : null;
    },
    setItem(key, value) {
        _dataCache[key] = value;
        _persistKey(key, value);
    },
    removeItem(key) {
        delete _dataCache[key];
        _deleteKey(key);
    },
    clear() {
        _dataCache = { version: DATA_VERSION };
        _clearBackend();
    },

    // ── importBackup ─────────────────────────────────────────────
    // Opens a file picker (native on Tauri, <input> on browser),
    // validates the selected JSON, then overwrites current data
    // after a typed confirmation. Reloads the page on success.
    importBackup() {
        if (_IS_TAURI) {
            _importBackupTauri();
        } else {
            _importBackupBrowser();
        }
    },

    exportBackup() {
        const date     = new Date().toISOString().split('T')[0];
        const fileName = `OpticSite_Backup_${date}.json`;

        if (_IS_TAURI) {
            // Native save dialog
            window.__TAURI__.dialog.save({
                defaultPath: fileName,
                filters: [{ name: 'JSON Backup', extensions: ['json'] }]
            }).then(savePath => {
                if (!savePath) return;
                window.__TAURI__.fs.writeTextFile(savePath, JSON.stringify(_dataCache, null, 2))
                    .then(() => openAlert({ title: 'Backup Saved', body: 'Backup saved successfully!' }))
                    .catch(err => openAlert({ title: 'Error', body: `Failed to save backup:\n${err}` }));
            });
        } else {
            // Browser file download
            const blob = new Blob([JSON.stringify(_dataCache, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            openAlert({ title: 'Backup Download', body: 'Backup will be saved to the chosen destination.' });
        }
    }
};

// ================================================================
//  importBackup — internal helpers
// ================================================================

// Shared validation + confirm + restore logic.
// Called by both platform paths once they have the raw file text.
function _processImport(rawText) {

    // ── 1. Parse JSON ─────────────────────────────────────────────
    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch (e) {
        openAlert({ title: 'Invalid File', body: 'This file is not valid JSON.\nPlease select a valid OpticSite backup file.' });
        return;
    }

    // ── 2. Must be an OpticSite backup ────────────────────────────
    // Checks that `version` exists AND matches the OpticSite format
    // (e.g. '0.1-emr'). This blocks Tauri config files and any other
    // random JSON that happens to have a `version` key.
    const isOpticSiteBackup = (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof parsed.version === 'string' &&
        /^\d+\.\d+.*-emr$/.test(parsed.version)
    );
    if (!isOpticSiteBackup) {
        openAlert({ title: 'Wrong File', body: 'This does not look like an OpticSite backup file.\nMake sure you selected the correct .json backup.' });
        return;
    }

    // ── 3. Version mismatch — warn but allow ──────────────────────
    const versionMismatch = parsed.version !== DATA_VERSION;

    // ── 4. Missing key data — warn but allow ──────────────────────
    const missingKeys = [];
    if (!parsed.patients)      missingKeys.push('patients');
    if (!parsed.prescriptions) missingKeys.push('prescriptions');

    // Build a warning string to show in the confirm modal if needed
    let warningLines = '';
    if (versionMismatch) {
        warningLines += `\nWarning: Backup version (${parsed.version}) differs from current app version (${DATA_VERSION}). Restoring may cause minor issues.`;
    }
    if (missingKeys.length > 0) {
        warningLines += `\nWarning: Backup is missing data for: ${missingKeys.join(', ')}. Those records will be empty after restore.`;
    }

    // ── 5. Typed confirm before overwriting ───────────────────────
    openModal({
        title:        'Confirm Restore',
        body:         `This will overwrite ALL current data with the selected backup. This cannot be undone.${warningLines}\n\nType RESTORE to confirm.`,
        confirmText:  'Restore',
        cancelText:   'Cancel',
        requireTyping: 'RESTORE',
        onConfirm: async () => {
            // ── 6. Overwrite and persist ──────────────────────────
            _dataCache = parsed;
            if (_useBackend) {
                await _bulkPersistBackend();
            } else {
                _persist();
            }

            openAlert({
                title: 'Restore Complete',
                body:  'Backup restored successfully!\nThe app will now reload.',
                onOk:  () => { window.location.reload(); }
            });
        }
    });
}

// Tauri path — native open dialog
function _importBackupTauri() {
    window.__TAURI__.dialog.open({
        multiple: false,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
    }).then(selectedPath => {
        if (!selectedPath) return; // user cancelled
        window.__TAURI__.fs.readTextFile(selectedPath)
            .then(raw => _processImport(raw))
            .catch(err => openAlert({ title: 'Read Error', body: `Could not read the file:\n${err}` }));
    });
}

// Browser path — hidden <input type="file"> click
function _importBackupBrowser() {
    let fileInput = document.getElementById('_importBackupFileInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';
        fileInput.id = '_importBackupFileInput';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }

    // Reset so the same file can be re-selected if needed
    fileInput.value = '';

    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (!file) return;

        // Extra guard: reject non-.json by name (browser accept isn't enforced everywhere)
        if (!file.name.toLowerCase().endsWith('.json')) {
            openAlert({ title: 'Wrong File Type', body: 'Please select a .json backup file.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => _processImport(e.target.result);
        reader.onerror = () => openAlert({ title: 'Read Error', body: 'Could not read the selected file.' });
        reader.readAsText(file);
    };

    fileInput.click();
}

// ================================================================
//  Expose globally
// ================================================================

window.Storage     = Storage;
window.initStorage = initStorage;