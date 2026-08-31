//--------------- Reusable Modal System ---------------

// openModal(options) — renders and shows a modal
//
// options:
//   title        {string}   — modal header text
//   body         {string}   — main message (supports \n for line breaks)
//   confirmText  {string}   — confirm button label (default: 'Confirm')
//   cancelText   {string}   — cancel button label (default: 'Cancel')
//   requireTyping {string}  — if set, user must type this exact string to enable confirm
//   onConfirm    {function} — called when user confirms
//   onCancel     {function} — optional, called when user cancels

let _modal = null;

function _buildModal() {
    const overlay = document.createElement('div');
    overlay.className = 'app-modal';
    overlay.innerHTML = `
        <div class="app-modal-content">
            <div class="app-modal-header"></div>
            <div class="app-modal-body"></div>
            <div class="app-modal-actions">
                <button class="modal-cancel-btn"></button>
                <button class="modal-confirm-btn"></button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function _getModal() {
    if (!_modal) _modal = _buildModal();
    return _modal;
}

// ── Reset confirm/cancel buttons to a clean, listener-free state before wiring new
// handlers. openModal and openAlert both reuse the SAME singleton overlay/buttons (see
// _getModal) — every call used to attach a fresh { once: true } listener without ever
// removing a PRIOR invocation's listener that never fired (e.g. the confirm-button
// listener from a modal the user cancelled via the cancel button). { once: true } only
// self-removes the listener that actually fires — it does nothing for its sibling on
// the other button. Left unattended, that stale listener stays armed and fires again
// — alongside whatever the next unrelated modal's confirm button is actually supposed
// to do — the next time literally any modal's confirm gets clicked. Cloning the
// buttons strips every listener atomically, which is more reliable here than tracking
// exact function references across two different call sites (openModal vs openAlert). ──
function _resetModalButtons(overlay) {
    const oldConfirm = overlay.querySelector('.modal-confirm-btn');
    const oldCancel  = overlay.querySelector('.modal-cancel-btn');
    const confirmBtn = oldConfirm.cloneNode(true);
    const cancelBtn  = oldCancel.cloneNode(true);
    oldConfirm.replaceWith(confirmBtn);
    oldCancel.replaceWith(cancelBtn);
    return { confirmBtn, cancelBtn };
}

function openModal(options = {}) {
    const {
        title        = 'Confirm',
        body         = '',
        confirmText  = 'Confirm',
        cancelText   = 'Cancel',
        requireTyping = null,
        onConfirm    = () => {},
        onCancel     = () => {}
    } = options;

    const overlay = _getModal();
    const header   = overlay.querySelector('.app-modal-header');
    const bodyEl   = overlay.querySelector('.app-modal-body');
    const { confirmBtn, cancelBtn } = _resetModalButtons(overlay);

    // Set content
    header.textContent  = title;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent  = cancelText;
    cancelBtn.style.display = ''; // openAlert hides this — make sure a reused overlay isn't stuck hidden

    // Build body — support \n as line breaks, render as <p> tags. NOT escaped here —
    // some callers (e.g. printRx's output-type picker) deliberately embed real HTML
    // (a <select>) in body. Free-text values get escaped at their own call sites instead.
    bodyEl.innerHTML = body
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<p>${line}</p>`)
        .join('');

    // Typing requirement
    if (requireTyping) {
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.placeholder = `Type ${requireTyping} to confirm`;
        inputEl.id = 'modalTypingInput';
        bodyEl.appendChild(inputEl);

        confirmBtn.disabled = true;

        inputEl.addEventListener('input', () => {
            confirmBtn.disabled = inputEl.value !== requireTyping;
        });
    } else {
        confirmBtn.disabled = false;
    }
    _wireButtons(overlay, confirmBtn, cancelBtn, onConfirm, onCancel);

    overlay.classList.add('active');

    // ESC to close — tracked on the overlay and cleaned up centrally in closeModal(),
    // same as _outsideClick below, so it's removed no matter which of the four
    // dismissal paths (confirm/cancel click, ESC, outside click) actually fires.
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            onCancel();
        }
    };
    overlay._escHandler = escHandler;
    document.addEventListener('keydown', escHandler);

    // Click outside to cancel
    overlay._outsideClick = (e) => {
        if (e.target === overlay) {
            closeModal();
            onCancel();
        }
    };
    overlay.addEventListener('click', overlay._outsideClick);
}

function _wireButtons(overlay, confirmBtn, cancelBtn, onConfirm, onCancel) {
    confirmBtn.addEventListener('click', () => {
        closeModal();
        onConfirm();
    }, { once: true });

    cancelBtn.addEventListener('click', () => {
        closeModal();
        onCancel();
    }, { once: true });
}

function closeModal() {
    if (!_modal) return;
    _modal.classList.remove('active');
    if (_modal._outsideClick) {
        _modal.removeEventListener('click', _modal._outsideClick);
        delete _modal._outsideClick;
    }
    if (_modal._escHandler) {
        document.removeEventListener('keydown', _modal._escHandler);
        delete _modal._escHandler;
    }
}
// openAlert(options) — single OK button, no cancel
//
// options:
//   title      {string}   — modal header text
//   body       {string}   — message (supports \n for line breaks)
//   okText     {string}   — button label (default: 'OK')
//   onOk       {function} — optional callback when dismissed

function openAlert(options = {}) {
    const {
        title  = 'Notice',
        body   = '',
        okText = 'OK',
        onOk   = () => {}
    } = options;

    const overlay = _getModal();
    const header   = overlay.querySelector('.app-modal-header');
    const bodyEl   = overlay.querySelector('.app-modal-body');
    const { confirmBtn, cancelBtn } = _resetModalButtons(overlay);

    header.textContent      = title;
    confirmBtn.textContent  = okText;
    confirmBtn.disabled     = false;
    cancelBtn.style.display = 'none';

    bodyEl.innerHTML = body
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<p>${line}</p>`)
        .join('');

    confirmBtn.addEventListener('click', () => {
        cancelBtn.style.display = '';
        closeModal();
        onOk();
    }, { once: true });

    // ESC or click outside also dismisses — same centralized cleanup as openModal
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            cancelBtn.style.display = '';
            closeModal();
            onOk();
        }
    };
    overlay._escHandler = escHandler;
    document.addEventListener('keydown', escHandler);

    overlay._outsideClick = (e) => {
        if (e.target === overlay) {
            cancelBtn.style.display = '';
            closeModal();
            onOk();
        }
    };
    overlay.addEventListener('click', overlay._outsideClick);

    overlay.classList.add('active');
}