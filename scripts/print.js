// ================================================================
//  print.js — OpticSite / OpticUnity
//  Handles prescription printing and document export.
//
//  PLATFORM DETECTION — automatic, no manual switching needed.
//  storage.js detects window.__TAURI__ at boot; this file reads
//  the same _IS_TAURI flag for downloadAsWord().
//  Everything else (Storage.getItem, printRx, _triggerPrint)
//  is fully platform-agnostic.
// ================================================================


// ---- Helpers ----
function _v(val) {
    return val || '—';
}

function _hasAny(...vals) {
    return vals.some(v => v !== null && v !== undefined && v !== '');
}


// ================================================================
//  Table Builders
//  Platform-agnostic — no changes needed when switching.
// ================================================================

// ---- Build Specs Table ----
function _buildSpecsTable(od, os) {
    const hasCyl  = _hasAny(od.distCyl, os.distCyl);
    const hasAdd  = _hasAny(od.addSph,  os.addSph);
    const hasNear = _hasAny(od.nearSph, os.nearSph);
    const hasPd   = _hasAny(od.distPd,  os.distPd);
    const hasVa   = _hasAny(od.distVa,  os.distVa);

    const cols = ['', 'SPH', 'CYL', 'AXIS'];
    if (hasPd) cols.push('PD');
    if (hasVa) cols.push('VA');

    const headerRow = cols.map(c => `<th>${c}</th>`).join('');

    function buildEyeRow(label, eye, sph, cyl, axis, pd, va) {
        let cells = `<td><strong>${label}</strong></td>
            <td>${_v(sph)}</td>
            <td>${_v(cyl)}</td>
            <td>${_v(axis)}</td>`;
        if (hasPd) cells += `<td>${_v(pd)}</td>`;
        if (hasVa) cells += `<td>${_v(va)}</td>`;
        return `<tr>${cells}</tr>`;
    }

    let html = `
        <table class="rx-print-table">
            <thead>
                <tr><th colspan="${cols.length}" class="rx-section-label">Distance</th></tr>
                <tr>${headerRow}</tr>
            </thead>
            <tbody>
                ${buildEyeRow('OD', od, od.distSph, od.distCyl, od.distAxis, od.distPd, od.distVa)}
                ${buildEyeRow('OS', os, os.distSph, os.distCyl, os.distAxis, os.distPd, os.distVa)}
            </tbody>
        </table>`;

    if (hasNear) {
        const nearCols = ['', 'SPH', 'CYL', 'AXIS'];
        const hasNearPd = _hasAny(od.nearPd, os.nearPd);
        const hasNearVa = _hasAny(od.nearVa, os.nearVa);
        if (hasNearPd) nearCols.push('PD');
        if (hasNearVa) nearCols.push('VA');

        const nearHeader = nearCols.map(c => `<th>${c}</th>`).join('');

        function buildNearRow(label, sph, cyl, axis, pd, va) {
            let cells = `<td><strong>${label}</strong></td>
                <td>${_v(sph)}</td>
                <td>${_v(cyl)}</td>
                <td>${_v(axis)}</td>`;
            if (hasNearPd) cells += `<td>${_v(pd)}</td>`;
            if (hasNearVa) cells += `<td>${_v(va)}</td>`;
            return `<tr>${cells}</tr>`;
        }

        html += `
        <table class="rx-print-table" style="margin-top:8px;">
            <thead>
                <tr><th colspan="${nearCols.length}" class="rx-section-label">Near</th></tr>
                <tr>${nearHeader}</tr>
            </thead>
            <tbody>
                ${buildNearRow('OD', od.nearSph, od.nearCyl, od.nearAxis, od.nearPd, od.nearVa)}
                ${buildNearRow('OS', os.nearSph, os.nearCyl, os.nearAxis, os.nearPd, os.nearVa)}
            </tbody>
        </table>`;
    }

    if (hasAdd) {
        html += `
        <table class="rx-print-table" style="margin-top:8px;">
            <thead>
                <tr><th colspan="2" class="rx-section-label">Addition</th></tr>
                <tr><th></th><th>ADD</th></tr>
            </thead>
            <tbody>
                <tr><td><strong>OD</strong></td><td>${_v(od.addSph)}</td></tr>
                <tr><td><strong>OS</strong></td><td>${_v(os.addSph)}</td></tr>
            </tbody>
        </table>`;
    }

    return html;
}

// ---- Build CL Table ----
function _buildClTable(od, os) {
    const hasCyl = _hasAny(od.cyl, os.cyl);

    const cols = ['', 'SPH'];
    if (hasCyl) { cols.push('CYL'); cols.push('AXIS'); }
    cols.push('BC', 'DIA', 'VA');

    const headerRow = cols.map(c => `<th>${c}</th>`).join('');

    function buildClRow(label, eye) {
        let cells = `<td><strong>${label}</strong></td><td>${_v(eye.sph)}</td>`;
        if (hasCyl) cells += `<td>${_v(eye.cyl)}</td><td>${_v(eye.axis)}</td>`;
        cells += `<td>${_v(eye.bc)}</td><td>${_v(eye.dia)}</td><td>${_v(eye.va)}</td>`;
        return `<tr>${cells}</tr>`;
    }

    return `
        <table class="rx-print-table">
            <thead>
                <tr><th colspan="${cols.length}" class="rx-section-label">Contact Lens</th></tr>
                <tr>${headerRow}</tr>
            </thead>
            <tbody>
                ${buildClRow('OD', od)}
                ${buildClRow('OS', os)}
            </tbody>
        </table>`;
}


// ================================================================
//  _buildPrintDocument
//  Builds the full HTML of the medical certificate.
//  Platform-agnostic — Storage.getItem works on both platforms.
// ================================================================

function _buildPrintDocument(rx, patient, paperSize) {
    const settings = JSON.parse(Storage.getItem('clinicSettings') || '{}');

    const clinicName    = escapeHtml(settings.clinicName)    || 'Optical Clinic';
    const clinicAddress = escapeHtml(settings.clinicAddress) || '';
    const clinicContact = escapeHtml(settings.clinicContact) || '';
    const doctorName    = escapeHtml(settings.doctorName)    || '[Name]';
    const prcNumber     = escapeHtml(settings.prcNumber)     || '___________________';

    const specs = rx.frxSpecs;
    const cl    = rx.frxCl;

    // -- Naked VA (UVA) --
    const uvaOdDist = (rx.uva?.odDist || '—').toUpperCase();
    const uvaOsDist = (rx.uva?.osDist || '—').toUpperCase();
    const uvaOdNear = rx.uva?.odNear ? `  ${rx.uva.odNear.toUpperCase()}` : '';
    const uvaOsNear = rx.uva?.osNear ? `  ${rx.uva.osNear.toUpperCase()}` : '';
    const uvaOuDist = rx.uva?.ouDist ? rx.uva.ouDist.toUpperCase() : null;
    const uvaOuNear = rx.uva?.ouNear ? `  ${rx.uva.ouNear.toUpperCase()}` : '';

    // -- Final Rx values --
    const odSph  = specs?.od?.distSph  || '—';
    const odCyl  = specs?.od?.distCyl  || '';
    const odAxis = specs?.od?.distAxis || '';
    const osSph  = specs?.os?.distSph  || '—';
    const osCyl  = specs?.os?.distCyl  || '';
    const osAxis = specs?.os?.distAxis || '';
    const addOd  = specs?.od?.addSph   || '';
    const addOs  = specs?.os?.addSph   || '';

    function fmtRx(sph, cyl, axis) {
        let str = sph;
        if (cyl && axis) str += `  ${cyl} x ${axis}`;
        else if (cyl)    str += `  ${cyl}`;
        str = str.replace(/([+-]?\d+\.?\d*)/g, '$1 Dsph');
        if (cyl) str = str.replace(/Dsph\s+([+-]?\d+\.?\d*)/, 'Dsph $1 Dcyl');
        return str;
    }

    // -- BCVA --
    const bcvaOdDist = (specs?.od?.distVa || '—').toUpperCase();
    const bcvaOsDist = (specs?.os?.distVa || '—').toUpperCase();
    const bcvaOdNear = specs?.od?.nearVa ? `  ${specs.od.nearVa.toUpperCase()}` : '';
    const bcvaOsNear = specs?.os?.nearVa ? `  ${specs.os.nearVa.toUpperCase()}` : '';

    function fmtBcva(dist, near) {
        return dist + near;
    }

    // -- ADD Line --
    let addLine = '';
    if (_hasAny(addOd, addOs)) {
        if (addOd === addOs && addOd !== '') {
            addLine = `<tr><td></td><td>ADD: ${addOd} Dsph</td><td></td><td></td></tr>`;
        } else {
            addLine = `<tr><td></td><td>ADD: OD: ${addOd || '—'} Dsph &nbsp;|&nbsp; OS: ${addOs || '—'} Dsph</td><td></td><td></td></tr>`;
        }
    }

    // -- CL Section --
    const clSection = cl ? `
        <tr><td colspan="4" style="padding-top:10px;"><strong>Contact Lens Prescription:</strong></td></tr>
        <tr>
            <td class="cert-label">CL Rx:</td>
            <td>OD: ${_v(cl.od?.sph)}${cl.od?.cyl ? '  ' + cl.od.cyl + ' x ' + (cl.od.axis||'—') : ''} &nbsp; BC: ${_v(cl.od?.bc)} &nbsp; DIA: ${_v(cl.od?.dia)}</td>
            <td class="cert-label">BCVA:</td>
            <td>OD: ${_v(cl.od?.va)}</td>
        </tr>
        <tr>
            <td></td>
            <td>OS: ${_v(cl.os?.sph)}${cl.os?.cyl ? '  ' + cl.os.cyl + ' x ' + (cl.os.axis||'—') : ''} &nbsp; BC: ${_v(cl.os?.bc)} &nbsp; DIA: ${_v(cl.os?.dia)}</td>
            <td></td>
            <td>OS: ${_v(cl.os?.va)}</td>
        </tr>` : '';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Medical Certificate — ${escapeHtml(patient.name) || 'Patient'} — ${rx.dateCreated}</title>
    <style>
        @page { size: ${paperSize}; margin: 20mm 20mm 15mm 20mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Arial', sans-serif; }
        body { font-size: 12px; color: #000; background: #fff; line-height: 1.6; }
        .cert-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .cert-clinic-name { font-size: 22px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
        .cert-clinic-sub { font-size: 11px; color: #333; margin-top: 2px; }
        .cert-title { text-align: center; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; text-decoration: underline; }
        .cert-date { text-align: right; font-size: 12px; margin-bottom: 16px; }
        .cert-body { margin-bottom: 16px; font-size: 12px; line-height: 1.8; }
        .cert-findings { width: 100%; border-collapse: collapse; margin: 12px 0 16px 0; font-size: 12px; table-layout: fixed; }
        .cert-findings td { padding: 3px 8px; vertical-align: top; }
        .cert-label { font-weight: bold; white-space: nowrap; width: 160px; }
        .cert-blank-line { margin: 8px 0; display: flex; align-items: baseline; gap: 6px; }
        .cert-field-label { font-weight: bold; white-space: nowrap; }
        .cert-underline { border-bottom: 1px solid #000; flex: 1; min-width: 200px; display: inline-block; }
        .cert-footer { margin-top: 40px; text-align: left; }
        .cert-signature-block { display: inline-block; text-align: left; width: 220px; }
        .cert-signature-line { border-top: 1px solid #000; margin-bottom: 4px; }
        .cert-signature-name { font-weight: bold; }
        .cert-signature-title { font-size: 11px; }
        .cert-signature-lic { font-size: 11px; }
        .cert-disclaimer { margin-top: 20px; font-size: 9px; color: #777; text-align: center; border-top: 1px dashed #ccc; padding-top: 6px; }
    </style>
</head>
<body>
    <div class="cert-header">
        <div class="cert-clinic-name">${clinicName}</div>
        <div class="cert-clinic-sub">${clinicAddress}</div>
        <div class="cert-clinic-sub">${clinicContact}</div>
    </div>

    <div class="cert-title">Certification</div>
    <div class="cert-date">Date: ${rx.dateCreated}</div>

    <div class="cert-body">
        <p>To Whom It May Concern:</p>
        <br>
        <p>This is to certify that patient <strong>${escapeHtml(patient.name) || '—'}</strong>,
        <strong>${escapeHtml(patient.age) || '—'}</strong> years old, residing at
        <strong>${escapeHtml(patient.address) || '—'}</strong>, has undergone a comprehensive
        eye examination at our clinic today.</p>
        <br>
        <p>Clinical findings are as follows:</p>
    </div>

    <table class="cert-findings">
        <tbody>
            <tr>
                <td class="cert-label">Naked Visual Acuity:</td>
                <td>OD: ${uvaOdDist}${uvaOdNear}</td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td></td>
                <td>OS: ${uvaOsDist}${uvaOsNear}</td>
                <td></td>
                <td></td>
            </tr>
            ${uvaOuDist ? `<tr><td></td><td>OU: ${uvaOuDist}${uvaOuNear}</td><td></td><td></td></tr>` : ''}

            ${specs ? `
            <tr>
                <td class="cert-label" style="padding-top:8px;">Prescription:</td>
                <td style="padding-top:8px;">OD: ${fmtRx(odSph, odCyl, odAxis)}</td>
                <td class="cert-label" style="padding-top:8px;">BCVA:</td>
                <td style="padding-top:8px;">OD: ${fmtBcva(bcvaOdDist, bcvaOdNear)}</td>
            </tr>
            <tr>
                <td></td>
                <td>OS: ${fmtRx(osSph, osCyl, osAxis)}</td>
                <td></td>
                <td>OS: ${fmtBcva(bcvaOsDist, bcvaOsNear)}</td>
            </tr>
            ${addLine}` : ''}

            ${clSection}
        </tbody>
    </table>

    <div class="cert-blank-line">
        <span class="cert-field-label">Final Diagnosis:</span>
        <span class="cert-underline">&nbsp;</span>
    </div>
    <div class="cert-blank-line">
        <span class="cert-field-label">Remarks:</span>
        <span class="cert-underline">&nbsp;</span>
    </div>
    <div class="cert-blank-line">
        <span class="cert-field-label">Recommendation:</span>
        <span class="cert-underline">&nbsp;</span>
    </div>

    <div class="cert-body" style="margin-top:16px;">
        <p>This medical certificate is issued upon request of the patient.</p>
        <br>
        <p>Respectfully yours,</p>
    </div>

    <div class="cert-footer">
        <div class="cert-signature-block">
            <div class="cert-signature-line"></div>
            <div class="cert-signature-name">${doctorName}</div>
            <div class="cert-signature-title">Optometrist</div>
            <div class="cert-signature-lic">PRC Lic. No.: ${prcNumber}</div>
        </div>
    </div>

    <div class="cert-disclaimer">
        This is a computer-generated medical certificate. Valid only with the authorized signature of the examining practitioner.
    </div>
</body>
</html>`;
}


// ================================================================
//  _buildWordHTML
//  Shared helper — builds the tighter-spaced Word document HTML.
//  Platform-agnostic, used by both downloadAsWord() adapters.
// ================================================================

function _buildWordHTML(rx, patient) {
    const htmlContent = _buildPrintDocument(rx, patient, 'A4');
    const bodyContent = htmlContent.split('<body>')[1].split('</body>')[0];
    const fileName    = `Medical_Certificate_${(patient.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '_')}_${rx.dateCreated || 'Date'}.doc`;

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Medical Certificate</title>
    <style>
        @page { size: A4; margin: 15mm 18mm 12mm 18mm; }
        body { font-family: Arial, sans-serif; font-size: 11.5px; line-height: 1.4; margin: 0; padding: 0; }
        .cert-header { text-align: center !important; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
        .cert-clinic-name { font-size: 21px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
        .cert-clinic-sub { font-size: 10.5px; color: #333; margin-top: 1px; }
        .cert-title { text-align: center !important; font-size: 14.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; text-decoration: underline; }
        .cert-date { text-align: right !important; font-size: 11.5px; margin-bottom: 12px; }
        .cert-body { margin-bottom: 12px; font-size: 11.5px; line-height: 1.5; }
        .cert-findings { width: 100%; border-collapse: collapse; margin: 10px 0 12px 0; font-size: 11.5px; }
        .cert-findings td { padding: 2px 6px; vertical-align: top; }
        .cert-label { font-weight: bold; white-space: nowrap; width: 155px; }
        .cert-blank-line { margin: 6px 0; }
        .cert-underline { border-bottom: 1px solid #000; min-width: 280px; display: inline-block; }
        .cert-footer { margin-top: 30px; text-align: left; }
        .cert-signature-block { display: inline-block; text-align: left; width: 220px; }
        .cert-disclaimer { margin-top: 15px; font-size: 9px; color: #777; text-align: center; border-top: 1px dashed #ccc; padding-top: 5px; }
    </style>
</head>
<body>
    ${bodyContent}
</body>
</html>`;

    return { fullHTML, fileName };
}


// ================================================================
//  downloadAsWord — auto-detects platform
// ================================================================

function downloadAsWord(rx, patient) {
    const { fullHTML, fileName } = _buildWordHTML(rx, patient);

    if (_IS_TAURI) {
        // [MAC-TODO] — The '.doc' extension triggers a "not a real Word file" warning on macOS
        // because this is actually HTML-wrapped-as-doc (MIME: application/msword), not true OOXML.
        // On macOS, consider changing the extension to '.html' and advising users to open in Pages/Word,
        // OR use a proper docx library (e.g. docx.js) to generate a real .docx file.
        // Also verify that window.__TAURI__.dialog.save() and fs.writeTextFile() behave
        // identically on macOS — they should, but test the native dialog appearance on Mac.
        // Native save dialog
        window.__TAURI__.dialog.save({
            defaultPath: fileName,
            filters: [{ name: 'Word Document', extensions: ['doc'] }]
        }).then(savePath => {
            if (!savePath) return;
            window.__TAURI__.fs.writeTextFile(savePath, fullHTML)
                .then(() => openAlert({ title: 'Saved', body: 'File saved successfully!' }))
                .catch(err => openAlert({ title: 'Error', body: `Failed to save:\n${err}` }));
        });
    } else {
        // Browser file download
        const blob = new Blob([fullHTML], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href     = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    }
}


// ================================================================
//  printRx + _triggerPrint
//  Platform-agnostic — iframe + window.print() works everywhere.
// ================================================================

function printRx(rx, patientId) {
    const patients = JSON.parse(Storage.getItem('patients') || '[]');

    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient record not found.');
        return;
    }

    openModal({
        title: 'Generate Prescription',
        body: `
            <p><strong>Select Output:</strong></p>
            <select id="outputTypeSelect" style="width:100%; padding:8px; margin:10px 0;">
                <option value="word">📄 Word Document (.doc)</option>
                <option value="print">🖨️ Print / Save as PDF</option>
            </select>
            <select id="printPaperSizeSelect" style="width:100%; padding:8px; margin-top:8px;">
                <option value="A4">A4 Paper</option>
                <option value="Letter">Letter Paper</option>
            </select>
        `,
        confirmText: 'Continue',
        cancelText:  'Cancel',
        onConfirm: () => {
            const outputType = document.getElementById('outputTypeSelect').value;
            if (outputType === 'word') {
                downloadAsWord(rx, patient);
            } else {
                const paperSize = document.getElementById('printPaperSizeSelect').value;
                _triggerPrint(rx, patient, paperSize);
            }
        }
    });
}

function _triggerPrint(rx, patient, paperSize) {
    const html = _buildPrintDocument(rx, patient, paperSize);

    let iframe = document.getElementById('rxPrintFrame');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'rxPrintFrame';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
        document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
        iframe.contentWindow.focus();
        // [MAC-TODO] — window.print() works on macOS but the system print dialog
        // looks different from Windows. On macOS, 'Save as PDF' is a built-in option in
        // the print dialog (bottom-left dropdown), so no special handling is needed.
        // However, test that iframe print styling (page breaks, margins) renders correctly
        // in Safari's print preview on Mac — WebKit handles @media print slightly differently.
        iframe.contentWindow.print();
    };
}

// ================================================================
//  Sales Order Printing — Receipt + Job Order Stub(s)
//  Receipt-printer width (80mm), not A4/Letter — a deliberately
//  different template from the Rx printer above, not a variant of
//  it. Shares only the iframe + window.print() trigger mechanic.
// ================================================================

function _soMoney(n) {
    return `₱${(n || 0).toFixed(2)}`;
}

// Saved order.items no longer live in soOrderRows once you've left the New Order page —
// this is the print-time equivalent of soFindRowById(), operating on the persisted array.
function _soFindItemByRowId(items, rowId) {
    return items.find(i => i.rowId === rowId) || null;
}

// ── Shared 80mm receipt shell — every stub (Claim or Job Order) is wrapped in this.
// Monospace + dashed dividers read cleanly at receipt width; a real spec/price table
// (like the Rx printer's) won't fit 72mm cleanly, so this is a single-column stacked
// layout throughout instead. ──
function _buildReceiptShellHTML(title, bodyHTML) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 72mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #000;
  }
  .stub { page-break-after: always; padding-bottom: 4mm; }
  .stub:last-child { page-break-after: auto; }
  .stub-center { text-align: center; }
  .stub-clinic-name { font-size: 14px; font-weight: 700; }
  .stub-clinic-sub { font-size: 11px; font-weight: 700; }
  .stub-title { font-size: 13px; font-weight: 700; margin-top: 4px; }
  .stub-divider { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  .stub-row { display: flex; justify-content: space-between; gap: 6px; font-weight: 700; }
  .stub-row .label { white-space: nowrap; }
  .stub-item { margin-bottom: 5px; font-weight: 700; }
  .stub-item-desc { padding-left: 4px; }
  .stub-total-row { font-weight: 700; font-size: 13px; }
  .stub-footer { text-align: center; margin-top: 8px; font-size: 11px; font-weight: 700; }
  .stub-grade-title { font-weight: 700; font-size: 11px; margin-top: 4px; }
  .stub-grade-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 11px; margin-top: 2px; }
  .stub-grade-table th, .stub-grade-table td { text-align: right; padding: 1px 2px; font-weight: 700; }
  .stub-grade-table th:first-child, .stub-grade-table td:first-child { text-align: left; font-weight: 700; }
</style>
</head>
<body>${bodyHTML}</body>
</html>`;
}

function _soTriggerReceiptPrint(html) {
    let iframe = document.getElementById('soReceiptPrintFrame');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'soReceiptPrintFrame';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
        document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    };
}

// ── Receipt — one per order, customer-facing. Pricing + payments, no job/lab detail.
// Renamed from "Claim Stub" — customers already read a receipt as their claim proof,
// so a separate "Claim Stub" label was redundant terminology. ──
function printReceipt(order) {
    const settings   = JSON.parse(Storage.getItem('clinicSettings') || '{}');
    const clinicName = escapeHtml(settings.clinicName)    || 'Optical Clinic';
    const clinicAddr = escapeHtml(settings.clinicAddress) || '';
    const clinicTel  = escapeHtml(settings.clinicContact) || '';

    let customerName = 'Walk-in';
    if (!order.isWalkIn && order.customerId) {
        const customers = JSON.parse(Storage.getItem('customers') || '[]');
        const customer  = customers.find(c => c.id === order.customerId);
        if (customer) customerName = customer.name;
    }

    const itemsHTML = (order.items || []).map(item => {
        const discLine = item.discVal > 0
            ? `<div class="stub-row"><span>${escapeHtml(item.discName ? `Promo: ${item.discName}` : 'Discount')}</span><span>-${_soMoney(item.discVal)}</span></div>`
            : '';
        return `
            <div class="stub-item">
                <div>${item.qty}x ${escapeHtml(item.description || item.type)}</div>
                <div class="stub-row stub-item-desc"><span>@ ${_soMoney(item.price)}</span><span>${_soMoney(item.total)}</span></div>
                ${discLine}
            </div>`;
    }).join('');

    const paymentsHTML = (order.payments || []).map(p =>
        `<div class="stub-row"><span>${escapeHtml(soFormatPaymentLabel(p))}</span><span>${_soMoney(p.amount)}</span></div>`
    ).join('');

    const body = `
        <div class="stub">
            <div class="stub-center">
                <div class="stub-clinic-name">${clinicName}</div>
                ${clinicAddr ? `<div class="stub-clinic-sub">${clinicAddr}</div>` : ''}
                ${clinicTel  ? `<div class="stub-clinic-sub">${clinicTel}</div>`  : ''}
                <div class="stub-title">RECEIPT</div>
            </div>
            <hr class="stub-divider">
            <div class="stub-row"><span class="label">Order ID:</span><span>${escapeHtml(order.id)}</span></div>
            <div class="stub-row"><span class="label">Date:</span><span>${escapeHtml(order.dateCreated)}</span></div>
            <div class="stub-row"><span class="label">Customer:</span><span>${escapeHtml(customerName)}</span></div>
            <hr class="stub-divider">
            ${itemsHTML}
            <hr class="stub-divider">
            <div class="stub-row"><span>Gross Total</span><span>${_soMoney(order.grossTotal)}</span></div>
            <div class="stub-row"><span>Discount</span><span>-${_soMoney(order.discount)}</span></div>
            <div class="stub-row stub-total-row"><span>TOTAL</span><span>${_soMoney(order.total)}</span></div>
            <hr class="stub-divider">
            ${paymentsHTML}
            <div class="stub-row"><span>Amount Paid</span><span>${_soMoney(order.amountPaid)}</span></div>
            <div class="stub-row"><span>Balance</span><span>${_soMoney(order.balance)}</span></div>
            ${order.changeDue > 0 ? `<div class="stub-row"><span>Change Due</span><span>${_soMoney(order.changeDue)}</span></div>` : ''}
            <div class="stub-footer">Thank you!</div>
        </div>`;

    _soTriggerReceiptPrint(_buildReceiptShellHTML(`Receipt — ${order.id}`, body));
}

// ── Grade cell helper — plain hyphen for missing values (not em-dash; keeps this
// table's rendering independent of any em-dash/thermal-font question elsewhere). ──
function _soGradeCell(val) {
    return val ? escapeHtml(val) : '-';
}

// ── Job Order Stub grade tables — Lens/CL only, Frame/Service rows return ''. Reads
// straight from row.itemData, which already holds the grade regardless of whether it
// came from a linked Rx or was typed manually (soCaptureModalFields captures every
// SO_MODAL_FIELDS id generically) — no dependency on linkedRx being present. Print-only:
// deliberately not folded into soRenderJobOrderBlock, which is shared with the on-screen
// Job Order Summary panel — this only affects the printed stub. ──
function soRenderJobOrderGrade(row) {
    const d = row.itemData || {};

    if (row.type === 'lens') {
        return `
            <div class="stub-grade-title">Prescription</div>
            <table class="stub-grade-table">
                <tr><th></th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th><th>PD</th></tr>
                <tr><td>OD</td><td>${_soGradeCell(d.lensOdSph)}</td><td>${_soGradeCell(d.lensOdCyl)}</td><td>${_soGradeCell(d.lensOdAxis)}</td><td>${_soGradeCell(d.lensOdAdd)}</td><td>${_soGradeCell(d.lensOdPd)}</td></tr>
                <tr><td>OS</td><td>${_soGradeCell(d.lensOsSph)}</td><td>${_soGradeCell(d.lensOsCyl)}</td><td>${_soGradeCell(d.lensOsAxis)}</td><td>${_soGradeCell(d.lensOsAdd)}</td><td>${_soGradeCell(d.lensOsPd)}</td></tr>
            </table>`;
    }

    if (row.type === 'cl') {
        // ADD is a rare multifocal-CL case — only added as a column when at least one
        // eye actually has it, rather than always reserving the space (unlike Lens,
        // where ADD/PD are common enough to always show for table-shape consistency).
        const hasAdd    = !!(d.clOdAdd || d.clOsAdd);
        const addHeader = hasAdd ? '<th>ADD</th>' : '';
        const addOdCell = hasAdd ? `<td>${_soGradeCell(d.clOdAdd)}</td>` : '';
        const addOsCell = hasAdd ? `<td>${_soGradeCell(d.clOsAdd)}</td>` : '';

        return `
            <div class="stub-grade-title">Prescription</div>
            <table class="stub-grade-table">
                <tr><th></th><th>SPH</th><th>CYL</th><th>AXIS</th>${addHeader}</tr>
                <tr><td>OD</td><td>${_soGradeCell(d.clOdSph)}</td><td>${_soGradeCell(d.clOdCyl)}</td><td>${_soGradeCell(d.clOdAxis)}</td>${addOdCell}</tr>
                <tr><td>OS</td><td>${_soGradeCell(d.clOsSph)}</td><td>${_soGradeCell(d.clOsCyl)}</td><td>${_soGradeCell(d.clOsAxis)}</td>${addOsCell}</tr>
            </table>
            <div class="stub-grade-title">Parameters</div>
            <table class="stub-grade-table">
                <tr><th></th><th>BC</th><th>DIA</th></tr>
                <tr><td>OD</td><td>${_soGradeCell(d.clOdBc)}</td><td>${_soGradeCell(d.clOdDia)}</td></tr>
                <tr><td>OS</td><td>${_soGradeCell(d.clOsBc)}</td><td>${_soGradeCell(d.clOsDia)}</td></tr>
            </table>`;
    }

    return '';
}

// ── Builds one .stub div's HTML for a single job-stub-eligible row — shared by
// printJobOrderStubs() (all jobs in an order) and printSingleJobOrderStub() (one job
// only), so the stub template lives in exactly one place. ──
function _soBuildJobOrderStubHTML(row, items, order, clinicName) {
    const ownBlock = soRenderJobOrderBlock(row);
    const gradeBlock = soRenderJobOrderGrade(row);
    const frame = soRowNeedsFramePairing(row) && row.pairedWith
        ? _soFindItemByRowId(items, row.pairedWith)
        : null;
    const frameBlock = frame ? `<hr class="stub-divider">${soRenderJobOrderBlock(frame)}` : '';

    const patientLine = row.linkedPatient
        ? `<div class="stub-row"><span class="label">Patient:</span><span>${escapeHtml(row.linkedPatient.name)}</span></div>`
        : '';
    const rxLine = row.linkedRx
        ? `<div class="stub-row"><span class="label">Rx ID:</span><span>${escapeHtml(row.linkedRx.id)}</span></div>`
        : '';

    return `
        <div class="stub">
            <div class="stub-center">
                <div class="stub-clinic-name">${clinicName}</div>
                <div class="stub-title">JOB ORDER</div>
            </div>
            <hr class="stub-divider">
            <div class="stub-row"><span class="label">Order ID:</span><span>${escapeHtml(order.id)}</span></div>
            <div class="stub-row"><span class="label">Date:</span><span>${escapeHtml(order.dateCreated)}</span></div>
            ${patientLine}
            ${rxLine}
            <hr class="stub-divider">
            ${ownBlock}
            ${gradeBlock}
            ${frameBlock}
        </div>`;
}

// ── Job Order Stub(s) — one stub per job (Lens+paired Frame / CL / Frame Repair), each
// its own page via .stub's page-break-after so a multi-job order still prints as one
// window.print() call (one dialog) instead of stacking several — see the reasoning in
// _soShowPrintPromptModal. Reuses soRowGetsJobStub/soRowNeedsFramePairing/
// soGetJobOrderHeaderAndBody from order-form-logic.js unchanged — same eligibility and
// header/body logic as the on-screen Job Order Summary panel, just fed from the saved
// items array via _soFindItemByRowId instead of soFindRowById/soOrderRows. ──
function printJobOrderStubs(order) {
    const items = order.items || [];
    const stubRows = items.filter(soRowGetsJobStub);

    if (stubRows.length === 0) return; // button is disabled in this case, but guard anyway

    const settings   = JSON.parse(Storage.getItem('clinicSettings') || '{}');
    const clinicName = escapeHtml(settings.clinicName) || 'Optical Clinic';

    const stubsHTML = stubRows.map(row => _soBuildJobOrderStubHTML(row, items, order, clinicName)).join('');

    _soTriggerReceiptPrint(_buildReceiptShellHTML(`Job Order Stubs — ${order.id}`, stubsHTML));
}

// ── Single Job Order Stub — reprint for exactly one job, by orderId + jobId. Used by the
// Job Orders page's per-row Print button (all three tabs — see job-orders-logic.js), which
// operates at job granularity, not order granularity. Deliberately does NOT reuse
// printJobOrderStubs(order) as-is, since that always prints every eligible job in the
// order — clicking Print on one row in Job Orders shouldn't also print sibling jobs that
// may be in a different status or already claimed. Looks the order up fresh from Storage
// (job-orders-logic.js's flattened job list doesn't carry the full order/items array
// needed for frame-pairing). ──
function printSingleJobOrderStub(orderId, jobId) {
    const orders = JSON.parse(Storage.getItem('salesOrders') || '[]');
    const order  = orders.find(o => o.id === orderId);
    if (!order) {
        openAlert({ title: 'Not Found', body: `Order ${orderId} could not be found.` });
        return;
    }

    const items = order.items || [];
    const row = items.find(i => i.jobId === jobId);
    if (!row) {
        openAlert({ title: 'Not Found', body: `Job ${jobId} could not be found in order ${orderId}.` });
        return;
    }

    const settings   = JSON.parse(Storage.getItem('clinicSettings') || '{}');
    const clinicName = escapeHtml(settings.clinicName) || 'Optical Clinic';

    const stubHTML = _soBuildJobOrderStubHTML(row, items, order, clinicName);
    _soTriggerReceiptPrint(_buildReceiptShellHTML(`Job Order Stub — ${jobId}`, stubHTML));
}