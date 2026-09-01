// ================================================================
//  storage.js — OpticSite / OpticUnity
//  Centralized storage abstraction layer
// ================================================================
//
//  PLATFORM DETECTION — automatic, no manual switching needed.
//
//  ➜ Running inside Tauri (.exe):
//      window.__TAURI_INTERNALS__ exists → Tauri adapter activates.
//      (NOT window.__TAURI__ — that's only populated when withGlobalTauri
//      is set in tauri.conf.json, which we do set, but __TAURI_INTERNALS__
//      is always present regardless, so it's the more robust check.)
//      Uses readTextFile / writeTextFile via Tauri FS API — available as
//      window.__TAURI__.fs.* / .path.* / .dialog.* thanks to withGlobalTauri,
//      backed by the tauri-plugin-fs / tauri-plugin-dialog Rust plugins
//      (registered in lib.rs) with permissions granted in
//      src-tauri/capabilities/default.json, scoped to $APPDATA.
//      Atomic write (.tmp → rename) protects against corruption.
//      Export uses native save dialog.
//
//  ➜ Running in a browser (web build):
//      window.__TAURI_INTERNALS__ is undefined → Browser adapter activates.
//      Uses localStorage. No atomic write needed.
//      Export triggers a file download.
//
//  Both adapters expose the same interface:
//      Storage.getItem(key)
//      Storage.setItem(key, value)
//      Storage.removeItem(key)
//      Storage.clear()
//      Storage.exportBackup()
//      Storage.importBackup()
//
//  importBackup() validation chain:
//      1. File must be readable and valid JSON         → hard reject
//      2. Must have a `version` key (OpticSite file)   → hard reject
//      3. Version mismatch                             → warn, allow
//      4. Missing patients / prescriptions keys        → warn, allow
//      5. Confirm overwrite (requireTyping: 'RESTORE') → safety gate
//      6. Overwrite _dataCache → persist → reload
//
//  initStorage() must be awaited before anything else runs.
//  It is called once in main.js on load.
//
// ================================================================

const DATA_FILE    = 'opticsite_data.json';
const DATA_VERSION = '0.1-emr';
const DATA_KEY     = 'opticsite_data';   // browser localStorage key

let _dataCache = null;
const _IS_TAURI = !!(window.__TAURI_INTERNALS__);

// ================================================================
//  initStorage — detects platform and initializes the right adapter
// ================================================================

async function initStorage() {
    if (_IS_TAURI) {
        await _initTauri();
    } else {
        _initBrowser();
    }
}

// ================================================================
//  TAURI ADAPTER
// ================================================================

async function _initTauri() {
    const { readTextFile, writeTextFile, exists, mkdir } = window.__TAURI__.fs;
    const { appDataDir } = window.__TAURI__.path;

    const appDataPath = await appDataDir();
    // [MAC-TODO] — '\\' is a Windows-only path separator and will break on macOS/Linux.
    // Replace with Tauri's path.join() API so the separator resolves per-platform:
    //   const { join } = window.__TAURI__.path;  (add 'join' to the destructure above)
    //   window._tauriFilePath = await join(appDataPath, DATA_FILE);
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

    // Cross-tab cache sync — fires in THIS tab whenever ANOTHER tab
    // writes to localStorage. Keeps _dataCache live so that the next
    // getItem / setItem in this tab sees the latest data immediately.
    window.addEventListener('storage', (e) => {
        if (e.key === DATA_KEY && e.newValue) {
            try {
                _dataCache = JSON.parse(e.newValue);
                console.log('[Storage] Cache synced from another tab.');
            } catch (_) {}
        }
    });

    console.log('[Storage] Browser adapter initialized.');
}

function _persistBrowser() {
    localStorage.setItem(DATA_KEY, JSON.stringify(_dataCache));
}

// ================================================================
//  Unified _persist — calls the right adapter automatically
// ================================================================

function _persist() {
    if (_IS_TAURI) {
        _persistTauri();   // async, fire-and-forget is fine —
    } else {               // _dataCache is always the source of truth.
        _persistBrowser(); // reads never touch the file, only _dataCache.
    }
}

// ================================================================
//  Storage — public interface, same for both platforms
// ================================================================

const Storage = {
    getItem(key) {
        // Browser: always pull from live localStorage so another tab's writes
        // are immediately visible — _dataCache is per-tab and can be stale.
        if (!_IS_TAURI) {
            const raw = localStorage.getItem(DATA_KEY);
            if (raw) { try { _dataCache = JSON.parse(raw); } catch (_) {} }
        }
        return _dataCache[key] !== undefined ? _dataCache[key] : null;
    },
    setItem(key, value) {
        // Browser: re-sync before writing too, so we don't clobber keys
        // that another tab saved between our last read and now.
        if (!_IS_TAURI) {
            const raw = localStorage.getItem(DATA_KEY);
            if (raw) { try { _dataCache = JSON.parse(raw); } catch (_) {} }
        }
        _dataCache[key] = value;
        _persist();
    },
    removeItem(key) {
        delete _dataCache[key];
        _persist();
    },
    clear() {
        _dataCache = { version: DATA_VERSION };
        _persist();
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
        const fileName = `OpticSite_SaveFile_${date}.json`;

        if (_IS_TAURI) {
            // Native save dialog
            window.__TAURI__.dialog.save({
                defaultPath: fileName,
                filters: [{ name: 'JSON Save File', extensions: ['json'] }]
            }).then(savePath => {
                if (!savePath) return;
                window.__TAURI__.fs.writeTextFile(savePath, JSON.stringify(_dataCache, null, 2))
                    .then(() => openAlert({ title: 'Save File Exported', body: 'Save file exported successfully!' }))
                    .catch(err => openAlert({ title: 'Error', body: `Failed to export save file:\n${err}` }));
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
            openAlert({ title: 'Save File Download', body: 'Save file will be downloaded to the chosen destination.' });
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
        openAlert({ title: 'Invalid File', body: 'This file is not valid JSON.\nPlease select a valid OpticSite save file.' });
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
        openAlert({ title: 'Wrong File', body: 'This does not look like an OpticSite save file.\nMake sure you selected the correct .json save file.' });
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
        warningLines += `\nWarning: Save file version (${parsed.version}) differs from current app version (${DATA_VERSION}). Restoring may cause minor issues.`;
    }
    if (missingKeys.length > 0) {
        warningLines += `\nWarning: Save file is missing data for: ${missingKeys.join(', ')}. Those records will be empty after restore.`;
    }

    // ── 5. Typed confirm before overwriting ───────────────────────
    openModal({
        title:        'Confirm Import',
        body:         `This will overwrite ALL current data with the selected save file. This cannot be undone.${warningLines}\n\nType RESTORE to confirm.`,
        confirmText:  'Restore',
        cancelText:   'Cancel',
        requireTyping: 'RESTORE',
        onConfirm: () => {
            // ── 6. Overwrite and persist ──────────────────────────
            _dataCache = parsed;
            _persist();

            openAlert({
                title: 'Import Complete',
                body:  'Save file imported successfully!\nThe app will now reload.',
                onOk:  () => { window.location.reload(); }
            });
        }
    });
}

// Intro-only import — skips the overwrite confirm modal since there is
// no existing data to protect on first launch. Still runs all file
// validation checks (JSON, OpticSite format, version, missing keys).
function _processIntroImport(rawText) {

    // ── 1. Parse JSON ─────────────────────────────────────────────
    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch (e) {
        openAlert({ title: 'Invalid File', body: 'This file is not valid JSON.\nPlease select a valid OpticSite save file.' });
        return;
    }

    // ── 2. Must be an OpticSite backup ────────────────────────────
    const isOpticSiteBackup = (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof parsed.version === 'string' &&
        /^\d+\.\d+.*-emr$/.test(parsed.version)
    );
    if (!isOpticSiteBackup) {
        openAlert({ title: 'Wrong File', body: 'This does not look like an OpticSite save file.\nMake sure you selected the correct .json save file.' });
        return;
    }

    // ── 3. Version mismatch — warn but allow ──────────────────────
    // ── 4. Missing key data — warn but allow ──────────────────────
    const versionMismatch = parsed.version !== DATA_VERSION;
    const missingKeys = [];
    if (!parsed.patients)      missingKeys.push('patients');
    if (!parsed.prescriptions) missingKeys.push('prescriptions');

    let warningLines = '';
    if (versionMismatch) {
        warningLines += `\nNote: Save file version (${parsed.version}) differs from current app version (${DATA_VERSION}). Restoring may cause minor issues.`;
    }
    if (missingKeys.length > 0) {
        warningLines += `\nNote: Save file is missing data for: ${missingKeys.join(', ')}. Those records will be empty after restore.`;
    }

    // ── 5. Restore directly — no overwrite guard needed on fresh state ──
    _dataCache = parsed;
    _persist();
    openAlert({
        title: 'Import Complete',
        body:  `Save file imported successfully!${warningLines}\nThe app will now launch.`,
        onOk:  () => { window.location.reload(); }
    });
}

// Intro-path file picker — calls _processIntroImport instead of _processImport
function importBackupIntro() {
    if (_IS_TAURI) {
        window.__TAURI__.dialog.open({
            multiple: false,
            filters: [{ name: 'JSON Save File', extensions: ['json'] }]
        }).then(selectedPath => {
            if (!selectedPath) return;
            window.__TAURI__.fs.readTextFile(selectedPath)
                .then(raw => _processIntroImport(raw))
                .catch(err => openAlert({ title: 'Read Error', body: `Could not read the file:\n${err}` }));
        });
    } else {
        let fileInput = document.getElementById('_introImportFileInput');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json,application/json';
            fileInput.id = '_introImportFileInput';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }

        fileInput.value = '';

        fileInput.onchange = () => {
            const file = fileInput.files[0];
            if (!file) return;

            if (!file.name.toLowerCase().endsWith('.json')) {
                openAlert({ title: 'Wrong File Type', body: 'Please select a .json save file.' });
                return;
            }

            const BROWSER_STORAGE_LIMIT = 5 * 1024 * 1024;
            if (file.size > BROWSER_STORAGE_LIMIT) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                openAlert({
                    title: 'File Too Large',
                    body:  `This save file is ${sizeMB} MB, which exceeds the browser storage limit of 5 MB.\n\nUse the desktop app (.exe) to import large save files.`
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => _processIntroImport(e.target.result);
            reader.onerror = () => openAlert({ title: 'Read Error', body: 'Could not read the selected file.' });
            reader.readAsText(file);
        };

        fileInput.click();
    }
}

// Tauri path — native open dialog
function _importBackupTauri() {
    window.__TAURI__.dialog.open({
        multiple: false,
        filters: [{ name: 'JSON Save File', extensions: ['json'] }]
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
            openAlert({ title: 'Wrong File Type', body: 'Please select a .json save file.' });
            return;
        }

        // Browser localStorage limit is ~5MB. Reject before reading if the
        // file is already too large to fit — avoids a pointless FileReader
        // load and a cryptic QuotaExceededError on write.
        const BROWSER_STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > BROWSER_STORAGE_LIMIT) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            openAlert({
                title: 'File Too Large',
                body:  `This save file is ${sizeMB} MB, which exceeds the browser storage limit of 5 MB.\n\nUse the desktop app (.exe) to import large save files.`
            });
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
//  Cross-tab/cross-window ID collision guard — Web Locks API
//  ────────────────────────────────────────────────────────────
//  localStorage has no built-in cross-tab transaction guarantee: two
//  tabs/windows can both read the same array, both compute the same
//  next ID, and whichever writes second silently overwrites the
//  first's save (not just an ID collision — actual record loss).
//  The existing _resolveUnique*ID() functions narrow that window by
//  re-checking right before save, but that's still a "read now,
//  hope nothing else writes before I do" pattern — no real guarantee.
//
//  navigator.locks is a genuine mutex, scoped per browser origin —
//  shared across every tab/window of the same app (in Tauri, every
//  window of the same app, since they share one webview storage
//  partition by default). Only one holder of a given lock name can
//  run at a time; everyone else queues and waits their turn. This
//  makes ID collision structurally impossible while the lock is
//  held, not just unlikely.
//
//  Usage: await soWithStorageLock('salesOrders', async () => {
//      ...generate ID, build record, Storage.setItem()...
//      return record;
//  });
//  Only wrap the true critical section (ID check → write) — never
//  validation/alerts, which don't touch shared storage and shouldn't
//  make other tabs queue behind a user reading a dialog.
//
//  Falls back to calling criticalSectionFn() directly, unguarded, on
//  any browser/webview old enough to lack navigator.locks — same
//  best-effort behavior the app already had, never a hard failure.
// ================================================================

async function soWithStorageLock(lockName, criticalSectionFn) {
    if (!navigator.locks) {
        console.warn(`[Storage Lock] navigator.locks unavailable — running "${lockName}" unguarded.`);
        return criticalSectionFn();
    }
    return navigator.locks.request(`opticsite:${lockName}`, criticalSectionFn);
}

// ================================================================
//  Expose globally
// ================================================================

window.Storage            = Storage;
window.initStorage        = initStorage;
window.importBackupIntro  = importBackupIntro;
window.soWithStorageLock  = soWithStorageLock;