//--------------- Print Prescription (Medical Certificate) ---------------

// ---- Helpers ----
function _v(val) {
    return val || '—';
}

function _hasAny(...vals) {
    return vals.some(v => v !== null && v !== undefined && v !== '');
}

// ---- Build Specs Table ----
function _buildSpecsTable(od, os) {
    const hasCyl  = _hasAny(od.distCyl, os.distCyl);
    const hasAdd  = _hasAny(od.addSph,  os.addSph);
    const hasNear = _hasAny(od.nearSph, os.nearSph);
    const hasPd   = _hasAny(od.distPd,  os.distPd);
    const hasVa   = _hasAny(od.distVa,  os.distVa);

    const cols = ['', 'SPH', 'CYL', 'AXIS'];
    if (hasPd)  cols.push('PD');
    if (hasVa)  cols.push('VA');

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

// ---- Build Full Print Document HTML ----
function _buildPrintDocument(rx, patient, paperSize) {
    const settings = JSON.parse(localStorage.getItem('clinicSettings') || '{}');
    const clinicName    = settings.clinicName    || 'Optical Clinic';
    const clinicAddress = settings.clinicAddress || 'Address';
    const clinicContact = settings.clinicContact || 'Contact';

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
    <title>Medical Certificate — ${patient.name || 'Patient'} — ${rx.dateCreated}</title>
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

        .cert-findings {
            width: 100%; border-collapse: collapse; margin: 12px 0 16px 0;
            font-size: 12px; table-layout: fixed;
        }
        .cert-findings td { padding: 3px 8px; vertical-align: top; }
        .cert-label { font-weight: bold; white-space: nowrap; width: 160px; }
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
        <p>This is to certify that patient <strong>${patient.name || '—'}</strong>,
        <strong>${patient.age || '—'}</strong> years old, residing at
        <strong>${patient.address || '—'}</strong>, has undergone a comprehensive
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
            <div class="cert-signature-name">[Name]</div>
            <div class="cert-signature-title">Optometrist</div>
            <div class="cert-signature-lic">PRC Lic. No.: ___________________</div>
        </div>
    </div>

    <div class="cert-disclaimer">
        This is a computer-generated medical certificate. Valid only with the authorized signature of the examining practitioner.
    </div>
</body>
</html>`;
}

// ==================== DOWNLOAD AS WORD (Tighter Spacing) ====================
function downloadAsWord(rx, patient) {
    const htmlContent = _buildPrintDocument(rx, patient, 'A4');

    const bodyContent = htmlContent.split('<body>')[1].split('</body>')[0];

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Medical Certificate</title>
    <style>
        @page { size: A4; margin: 15mm 18mm 12mm 18mm; }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11.5px; 
            line-height: 1.4; 
            margin: 0; 
            padding: 0;
        }
        .cert-header { 
            text-align: center !important; 
            border-bottom: 2px solid #000; 
            padding-bottom: 8px; 
            margin-bottom: 15px; 
        }
        .cert-clinic-name { 
            font-size: 21px; 
            font-weight: bold; 
            letter-spacing: 1px; 
            text-transform: uppercase; 
        }
        .cert-clinic-sub { 
            font-size: 10.5px; 
            color: #333; 
            margin-top: 1px; 
        }
        .cert-title { 
            text-align: center !important; 
            font-size: 14.5px; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 2px; 
            margin-bottom: 12px; 
            text-decoration: underline; 
        }
        .cert-date { 
            text-align: right !important; 
            font-size: 11.5px; 
            margin-bottom: 12px; 
        }
        .cert-body { 
            margin-bottom: 12px; 
            font-size: 11.5px; 
            line-height: 1.5; 
        }
        .cert-findings { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0 12px 0; 
            font-size: 11.5px; 
        }
        .cert-findings td { 
            padding: 2px 6px; 
            vertical-align: top; 
        }
        .cert-label { 
            font-weight: bold; 
            white-space: nowrap; 
            width: 155px; 
        }
        .cert-blank-line { 
            margin: 6px 0; 
        }
        .cert-underline { 
            border-bottom: 1px solid #000; 
            min-width: 280px; 
            display: inline-block; 
        }
        .cert-footer { 
            margin-top: 30px; 
            text-align: right; 
        }
        .cert-signature-block { 
            display: inline-block; 
            text-align: center; 
            width: 220px; 
        }
        .cert-disclaimer { 
            margin-top: 15px; 
            font-size: 9px; 
            color: #777; 
            text-align: center; 
            border-top: 1px dashed #ccc; 
            padding-top: 5px; 
        }
    </style>
</head>
<body>
    ${bodyContent}
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Medical_Certificate_${(patient.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '_')}_${rx.dateCreated || 'Date'}.doc`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ---- Main Print Function (with Word Option) ----
function printRx(rx, patientId) {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const patient  = patients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient record not found.');
        return;
    }

    openModal({
        title: 'Generate Prescription',
        body: `
            <p><strong>Select Output:</strong></p>
            <select id="outputTypeSelect" style="width:100%; padding:8px; margin:10px 0;">
                <option value="print">🖨️ Print / Save as PDF</option>
                <option value="word">📄 Download as Word Document (.doc)</option>
            </select>
            <select id="printPaperSizeSelect" style="width:100%; padding:8px; margin-top:8px;">
                <option value="A4">A4 Paper</option>
                <option value="Letter">Letter Paper</option>
            </select>
        `,
        confirmText: 'Continue',
        cancelText: 'Cancel',
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
        iframe.contentWindow.print();
    };
}