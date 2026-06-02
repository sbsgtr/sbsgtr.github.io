/* ══════════════════════════════════════════════════
   NEXWAVE CORE - Shared ERP Scripts
   ══════════════════════════════════════════════════ */

/* ── Supabase Config ── */
const ERP_SUPABASE_URL = 'https://kklpalpobkkkxzzgkfro.supabase.co';
const ERP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbHBhbHBvYmtra3h6emdrZnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg4MjcsImV4cCI6MjA5NDk0NDgyN30.OZtAI0tJLR6iUaARpmqrG07tcL21u1xDiYn3UK4OU3s';

let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient && typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(ERP_SUPABASE_URL, ERP_SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

/* ── Auth Check (verifies admin status) ── */
async function checkAuth() {
    const client = getSupabaseClient();
    if (!client) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
        window.location.href = '../pages/login.html';
        return;
    }
    // Verify user is an ERP admin — prevent non-admin public users from accessing ERP
    try {
        const { data: adminCheck, error: adminErr } = await client.from('admin_users').select('id').eq('email', user.email).maybeSingle();
        if (adminErr || !adminCheck) {
            window.location.href = '../pages/index.html';
            return;
        }
    } catch (e) {
        // admin_users table missing or query failed — redirect to public site
        window.location.href = '../pages/index.html';
        return;
    }
    const emailEl = document.getElementById('userEmail');
    if (emailEl) emailEl.innerText = user.email;
}

/* ── Sidebar Toggle ── */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('menuToggle');
    const backdrop = document.querySelector('.sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('open');
    if (toggle) toggle.classList.toggle('active');
    if (backdrop) backdrop.classList.toggle('open');
}
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('menuToggle');
    const backdrop = document.querySelector('.sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (toggle) toggle.classList.remove('active');
    if (backdrop) backdrop.classList.remove('open');
}

/* ── Sign Out ── */
async function signOut() {
    const client = getSupabaseClient();
    if (client) {
        await client.auth.signOut();
    }
    window.location.href = '../pages/index.html';
}

// Auto-check auth on page load so user email shows in all ERP pages
checkAuth();

/* ── PWA: Inject manifest + service worker ── */
(function setupPWA() {
    // Manifest link
    if (!document.querySelector('link[rel="manifest"]')) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '../manifest.json';
        document.head.appendChild(link);
    }
    // Theme color
    if (!document.querySelector('meta[name="theme-color"]')) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#0b2b0f';
        document.head.appendChild(meta);
    }
    // Service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('../sw.js').catch(() => {});
        });
    }
})();

/* ── Sidebar Backdrop ── */
(function createBackdrop() {
    const existing = document.querySelector('.sidebar-backdrop');
    if (existing) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.addEventListener('click', closeSidebar);
    document.body.appendChild(backdrop);
})();

/* ── Notification helper ── */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 30px; right: 30px; z-index: 9999;
        padding: 14px 24px; border-radius: 12px; font-size: 14px;
        background: ${type === 'success' ? '#2e7d32' : '#c62828'};
        color: white; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out; max-width: 360px;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

/* ── Format currency ── */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2
    }).format(amount);
}

/* ── Generate ID ── */
function generateId(prefix = '') {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return prefix ? `${prefix}-${ts}${rand}` : `${ts}${rand}`;
}

/* ── Shared Form Helpers ── */
function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
}

/* ── Mobile table card-view helper ── */
(function initResponsiveTables() {
    function labelTables() {
        document.querySelectorAll('.main-content table').forEach(table => {
            const headers = [];
            table.querySelectorAll('thead th').forEach(th => {
                headers.push(th.textContent.trim());
            });
            if (headers.length === 0) return;
            table.querySelectorAll('tbody tr').forEach(row => {
                row.querySelectorAll('td').forEach((td, i) => {
                    if (i < headers.length) {
                        td.setAttribute('data-label', headers[i]);
                    }
                });
            });
        });
    }

    const mq = window.matchMedia('(max-width: 600px)');
    function toggleCardView(e) {
        document.querySelectorAll('.main-content table').forEach(table => {
            table.classList.toggle('card-view', e.matches);
        });
    }
    if (mq.addEventListener) {
        mq.addEventListener('change', toggleCardView);
    }
    // Run now
    labelTables();
    toggleCardView(mq);
})();

/* ── Render line item row ── */
function addLineItem(containerId, product, desc, qty, price) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'line-item';
    row.innerHTML = `
        <input type="text" class="li-product" placeholder="Product/Service" value="${escapeHtml(product || '')}">
        <input type="text" class="li-desc" placeholder="Description" value="${escapeHtml(desc || '')}">
        <input type="number" class="li-qty" placeholder="Qty" value="${qty || 1}" min="0.01" step="0.01" onchange="recalcLineItem(this)">
        <input type="number" class="li-price" placeholder="Unit Price" value="${price || 0}" min="0" step="0.01" onchange="recalcLineItem(this)">
        <input type="text" class="li-total" placeholder="Total" readonly>
        <button class="btn-sm red" onclick="this.parentElement.remove(); recalcTotals('${containerId}')"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
    recalcLineItem(row.querySelector('.li-qty'));
}

function recalcLineItem(el) {
    const row = el.closest('.line-item');
    if (!row) return;
    const qty = parseFloat(row.querySelector('.li-qty').value) || 0;
    const price = parseFloat(row.querySelector('.li-price').value) || 0;
    row.querySelector('.li-total').value = (qty * price).toFixed(2);
    const containerId = row.closest('[id]')?.id;
    if (containerId) recalcTotals(containerId);
}

function recalcTotals(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let subtotal = 0;
    container.querySelectorAll('.line-item').forEach(row => {
        subtotal += parseFloat(row.querySelector('.li-total').value) || 0;
    });
    const totalEl = document.getElementById(containerId.replace('Items', 'Total'));
    if (totalEl) totalEl.value = subtotal.toFixed(2);
    const displayEl = document.getElementById(containerId.replace('Items', 'Display'));
    if (displayEl) displayEl.innerText = 'LKR ' + subtotal.toLocaleString() + '.00';
    return subtotal;
}

function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function getLineItems(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.line-item')).map(row => ({
        description: row.querySelector('.li-product').value,
        notes: row.querySelector('.li-desc').value,
        quantity: parseFloat(row.querySelector('.li-qty').value) || 0,
        unit_price: parseFloat(row.querySelector('.li-price').value) || 0,
        total: parseFloat(row.querySelector('.li-total').value) || 0
    }));
}

/* ── Invoice Details Lookup ── */
// Uses window.nexwaveClient (from public.js) — must be loaded before calling
async function getInvoiceDetails(invoiceNumber) {
    const client = window.nexwaveClient || getSupabaseClient();
    if (!client) throw new Error('Supabase not initialized');
    
    // Fetch invoice by invoice_number
    const { data: invoice, error } = await client
        .from('invoices')
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .single();
    
    if (error) throw error;
    if (!invoice) throw new Error('Invoice not found');

    // Fetch related customer
    const { data: customer, error: cError } = await client
        .from('customers')
        .select('id, contact_person, company_name, address, city, email, contact_number, tax_number')
        .eq('id', invoice.customer_id)
        .single();
    
    if (!cError && customer) {
        invoice.customer = customer;
    }
    
    // Parse items column (JSONB) — handle string, object, or array
    if (invoice.items && typeof invoice.items === 'string') {
        try { invoice.items = JSON.parse(invoice.items); } catch (e) { invoice.items = []; }
    }
    if (!Array.isArray(invoice.items)) {
        invoice.items = [];
    }
    
    return invoice;
}

/* ── Debit Note Functions ── */
async function recordDebitNoteAsExpense(data) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not initialized');
    
    const payload = {
        date: data.date || new Date().toISOString().split('T')[0],
        amount: data.amount || 0,
        description: data.description || 'Debit Note',
        category: data.category || 'debit_note',
        vendor: data.vendor || '',
        invoice_no: data.reference_number || '',
        notes: data.notes || '',
        has_invoice: false,
        is_recurring: false
    };
    
    const { data: result, error } = await client.from('expenses').insert(payload).select().single();
    if (error) throw error;
    return result;
}

/* ── Eagerly load QR library on page init so it's ready for print ── */
(function preloadQRLib() {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    s.async = true;
    s.onerror = function() {
        var s2 = document.createElement('script');
        s2.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
        s2.async = true;
        document.head.appendChild(s2);
    };
    document.head.appendChild(s);
})();

/* ── Generate QR code data URI synchronously (if library is loaded) ── */
function generateQRDataUri(text) {
    try {
        if (typeof qrcode_generator !== 'undefined') {
            var qr = qrcode_generator(0, 'L');
            qr.addData(text);
            qr.make();
            return qr.createDataURL(4, 0);
        } else if (typeof QRCode !== 'undefined') {
            // QRCode library needs a DOM element — we'll handle async fallback
            return null;
        }
    } catch (e) {
        console.warn('QR generation error:', e);
    }
    return null;
}

/* ── Print Preview Helper ── */
function openPrintPreview(title, contentHtml) {
    closePrintPreview();

    const overlay = document.createElement('div');
    overlay.id = 'printPreviewOverlay';
    overlay.innerHTML = `
        <div class="print-preview-container">
            <div class="print-preview-header">                        <h3><i class="fas fa-file-pdf"></i> ${escapeHtml(title)}</h3>
                <div class="print-preview-actions">
                    <span class="paper-size-wrap">
                        <select class="paper-size-select" onchange="setPaperSize(this.value)" title="Paper size">
                            <option value="A4">A4</option>
                            <option value="Letter">Letter</option>
                            <option value="Legal">Legal</option>
                        </select>
                    </span>
                    <button class="btn-ghost" onclick="downloadPDF()" title="Save as PDF — opens print dialog, choose 'Save as PDF' destination"><i class="fas fa-file-pdf"></i> Download PDF</button>
                    <button class="btn-green" onclick="window.print()" title="Print (Ctrl+P)"><i class="fas fa-print"></i> Print</button>
                    <button class="btn-close" onclick="closePrintPreview()" title="Close preview">&times;</button>
                </div>
            </div>
            <div class="print-preview-body" id="printPreviewBody"></div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('printPreviewBody').innerHTML = contentHtml;
    document.body.classList.add('print-preview-active');
    document.body.style.overflow = 'hidden';

    // Sync the dropdown to the current paper size and apply preview dimensions
    var sel = overlay.querySelector('.paper-size-select');
    if (sel) sel.value = _currentPaperSize;
    if (_currentPaperSize !== 'A4') {
        setPaperSize(_currentPaperSize);
    }

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closePrintPreview();
    });

    // Apply the current paper size CSS class so CSS handles dimensions (not JS)
    applyPaperSizeClass(_currentPaperSize);

    // Generate QR codes for any remaining (unrendered) verification elements
    setTimeout(function() {
        generatePrintQRs();
    }, 50);
}

/* ── Generate QR codes in the print document ── */
function generatePrintQRs() {
    var qrContainers = document.querySelectorAll('.doc-qr-code[data-id]');
    if (qrContainers.length === 0) return;        // Load QR code library if not present
    if (typeof qrcode_generator !== 'undefined') {
        renderAllQRs(qrContainers);
    } else if (typeof QRCode !== 'undefined') {
        renderAllQRs(qrContainers);
    } else {
        var script = document.createElement('script');
        // Try multiple CDN sources for reliability
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
        script.onload = function() { renderAllQRs(qrContainers); };
        script.onerror = function() {
            // Fallback: try another CDN source
            var script2 = document.createElement('script');
            script2.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
            script2.onload = function() { renderAllQRs(qrContainers); };
            script2.onerror = function() { renderQRFallback(qrContainers); };
            document.head.appendChild(script2);
        };
        document.head.appendChild(script);
    }
}

function renderAllQRs(containers) {
    var baseUrl = window.location.origin + '/pages/verify.html?id=';
    containers.forEach(function(el) {
        var invoiceId = el.getAttribute('data-id');
        if (!invoiceId || el.querySelector('img, canvas')) return;
        try {
            var qr;
            if (typeof qrcode_generator !== 'undefined') {
                qr = qrcode_generator(0, 'L');
                qr.addData(baseUrl + encodeURIComponent(invoiceId));
                qr.make();
                // Generate at high resolution for crisp rendering at 2cm display size
                var imgData = qr.createDataURL(6, 0);
                var img = document.createElement('img');
                img.src = imgData;
                img.alt = 'Verify Invoice';
                img.style.cssText = 'width:100%;height:100%;display:block;';
                el.appendChild(img);
            } else if (typeof QRCode !== 'undefined') {
                new QRCode(el, {
                    text: baseUrl + encodeURIComponent(invoiceId),
                    width: 100,
                    height: 100,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.L
                });
            }
        } catch(e) {
            console.warn('QR generation error:', e);
        }
    });
}

function renderQRFallback(containers) {
    // If QR library fails to load, show a text link instead
    var baseUrl = window.location.origin + '/pages/verify.html?id=';
    containers.forEach(function(el) {
        var invoiceId = el.getAttribute('data-id');
        if (!invoiceId) return;
        var link = document.createElement('a');
        link.href = baseUrl + encodeURIComponent(invoiceId);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.innerHTML = '<i class="fas fa-shield-alt"></i> Verify';
        link.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#2e7d32;text-decoration:none;padding:6px 10px;border:1px solid #2e7d32;border-radius:6px;';
        el.appendChild(link);
    });
}

function closePrintPreview() {
    const el = document.getElementById('printPreviewOverlay');
    if (el) {
        el.remove();
    }
    document.body.classList.remove('print-preview-active');
    document.body.style.overflow = '';
}
window.closePrintPreview = closePrintPreview;

/* ── Paper Size Configuration ── */
var _currentPaperSize = 'A4';

function setPaperSize(size) {
    if (!size) return;
    _currentPaperSize = size;

    // Update the @page rule for actual printing
    // For non-A4 sizes we need to override the CSS baseline @page rule
    var styleId = 'print-paper-size-style';
    var styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }
    if (size === 'A4') {
        styleEl.textContent = '@media print { @page { size: A4 portrait; margin: 10mm; } }';
    } else {
        styleEl.textContent = '@media print { @page { size: ' + size + ' portrait; margin: 10mm; } }';
    }
}
window.setPaperSize = setPaperSize;

// Apply the paper size CSS class to the document so CSS can handle dimensions.
// The base CSS rule already sets A4 (210mm x 297mm), so we only need to
// add override classes for non-A4 sizes.
function applyPaperSizeClass(size) {
    var doc = document.querySelector('#printPreviewBody .print-document');
    if (!doc) return;
    doc.classList.remove('paper-letter', 'paper-legal');
    if (size !== 'A4') {
        doc.classList.add('paper-' + size.toLowerCase());
    }
}

function downloadPDF() {
    // Triggers the browser's print dialog, where the user can select
    // "Save as PDF" as the destination. Works in Chrome, Edge, Firefox, Safari.
    window.print();
}
window.downloadPDF = downloadPDF;



function formatDocMoney(amount) {
    return 'LKR ' + parseFloat(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDocDate(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function buildPrintDoc(config) {
    const { type, number, date, due_date, customer, items, totals, notes, footnotes, company, po_number, id } = config;
    const ref = number || '';
    const companyName = company?.company_name || 'NEXWAVE Solutions (Pvt) Ltd';
    const companyAddr = company?.address || 'Colombo, Sri Lanka';
    const companyPhone = company?.phone || '+94 11 234 5678';
    const companyEmail = company?.email || 'info@nexwave.lk';
    const companyTax = company?.tax_number || '';
    const taxRate = parseFloat(company?.default_tax) || 0;

    const typeLabel = type === 'estimate' ? 'ESTIMATE'
        : type === 'dn' ? 'DELIVERY NOTE'
        : type === 'proforma' ? 'PROFORMA INVOICE'
        : 'INVOICE';

    const isDn = type === 'dn';

    const lineItems = items || [];
    let itemsHtml = '';
    lineItems.forEach((item) => {
        const desc = item.description || item.product_name || item.name || 'Item';
        const notesText = item.notes || '';
        const qty = item.quantity || item.qty || 0;
        const price = item.unit_price || item.price || 0;
        const total = item.total || (qty * price) || 0;
        const unit = item.unit || 'Unit';
        
        itemsHtml += `
            <tr>
              <td>
                <div class="item-name">${escapeHtml(desc)}</div>
                ${notesText ? `<div class="item-desc">${escapeHtml(notesText)}</div>` : ''}
              </td>
              <td class="r col-qty">${qty}</td>
              <td class="r col-unit">${escapeHtml(unit)}</td>
              ${isDn ? '<td class="r col-price" colspan="2">—</td>' : `
              <td class="r col-price">${formatDocMoney(price)}</td>
              <td class="r col-total">${formatDocMoney(total)}</td>`}
            </tr>
        `;
    });

    // Generate QR code data URI for inline embedding (reliable for print)
    var qrDataUrl = null;
    var qrTargetUrl = null;
    if (id && (type === 'invoice' || type === 'proforma' || type === 'estimate')) {
        qrTargetUrl = window.location.origin + '/pages/verify.html?id=' + encodeURIComponent(id);
        qrDataUrl = generateQRDataUri(qrTargetUrl);
    }

    const grandTotal = totals?.total || totals?.grand_total || lineItems.reduce((s, i) => s + (i.total || 0), 0);
    const vatAmount = grandTotal * (taxRate / 100);
    const totalWithTax = grandTotal + vatAmount;
    const customerName = customer?.company_name || customer?.contact_person || customer?.name || 'Client';
    const customerDetails = [
        customer?.address ? escapeHtml(customer.address) : '',
        customer?.city ? escapeHtml(customer.city) : '',
        customer?.contact_person && customer?.company_name ? `Attn: ${escapeHtml(customer.contact_person)}` : '',
        customer?.email ? `<i class="fas fa-envelope"></i> ${escapeHtml(customer.email)}` : ''
    ].filter(Boolean).join('<br>');

    return `
        <div class="print-document" data-ref="${escapeHtml(ref)}">
            <header class="doc-header">
                <div class="doc-brand">
                    <div class="doc-brand-top">
                        <span class="doc-brand-text"><span class="brand-nex">NEX</span><span class="brand-wave">WAVE</span></span>
                    </div>
                    <div class="doc-company-name">${escapeHtml(companyName)}</div>
                    <div class="doc-company-addr">
                        ${companyAddr.replace(/\n/g, '<br>')}
                    </div>
                    <div class="doc-contact-row">
                        <span>${escapeHtml(companyEmail)}</span>
                        <span class="doc-contact-sep">|</span>
                        <span>${escapeHtml(companyPhone)}</span>
                        ${companyTax ? `<span class="doc-contact-sep">|</span><span>VAT: ${escapeHtml(companyTax)}</span>` : ''}
                    </div>
                </div>
                <div class="doc-meta">
                    <div class="doc-type-badge">${escapeHtml(typeLabel)}</div>
                    <div class="doc-number">No. ${escapeHtml(ref)}</div>
                    <div class="doc-meta-grid">
                        <span class="meta-label">Date</span><span class="meta-value">${formatDocDate(date)}</span>
                        <span class="meta-label">Due</span><span class="meta-value meta-status">${formatDocDate(due_date)}</span>
                        <span class="meta-label">Ref</span><span class="meta-value">${escapeHtml(po_number || '—')}</span>
                        <span class="meta-label">Currency</span><span class="meta-value">LKR</span>
                        <span class="meta-label">Terms</span><span class="meta-value">${escapeHtml(footnotes || 'Net 30')}</span>
                    </div>
                </div>
            </header>

            <div class="doc-parties">
                <div class="doc-party">
                    <div class="doc-party-label">From</div>
                    <div class="doc-party-body">
                        <strong>${escapeHtml(companyName)}</strong><br>
                        ${companyAddr.replace(/\n/g, '<br>')}<br>
                        ${escapeHtml(companyEmail)}
                    </div>
                </div>
                <div class="doc-party${!customer?.email && !customer?.address ? ' doc-party-ref' : ''}">
                    <div class="doc-party-label">Bill To</div>
                    <div class="doc-party-body">
                        <strong>${escapeHtml(customerName)}</strong><br>
                        ${customerDetails.replace(/<br>/g, '<br>')}
                    </div>
                </div>
            </div>

            <div class="items-section">
                <table class="doc-items">
                    <thead>
                        <tr>
                            <th style="width:44%">Description</th>
                            <th class="col-qty" style="width:10%">Qty</th>
                            <th class="col-unit" style="width:12%">Unit</th>
                            <th class="col-price" style="width:16%">Rate</th>
                            <th class="col-total" style="width:18%">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml || `<tr><td colspan="5" class="doc-empty">No items recorded</td></tr>`}
                    </tbody>
                </table>
            </div>

            <div class="doc-totals-wrap">
                <div class="doc-totals">
                    <div class="doc-total-row"><span>Subtotal</span><span>${formatDocMoney(grandTotal)}</span></div>
                    ${taxRate > 0 ? `<div class="doc-total-row" style="font-size:8pt;color:#888;"><span>VAT (${taxRate}%)</span><span>${formatDocMoney(vatAmount)}</span></div>` : ''}
                    <div class="doc-grand-total">
                        <span>Total Due</span>
                        <span>${formatDocMoney(totalWithTax)}</span>
                    </div>
                </div>
            </div>

            <div class="doc-notes">
                <strong>Bank Details</strong>
                <p>${company?.bank_details ? escapeHtml(company.bank_details).replace(/\n/g, '<br>') : 'Commercial Bank PLC · Branch: Siddamulla · Account: 1000234567'}</p>
            </div>

            <div class="doc-general-note">
                <strong>Notes</strong>
                <p>${notes ? escapeHtml(notes).replace(/\n/g, '<br>') : 'Thank you for your business. Please make payment by the due date.'}</p>
            </div>

            <hr class="doc-footer-divider">

            <div class="doc-signatory">
                ${id && (type === 'invoice' || type === 'proforma' || type === 'estimate') ? `
                <div class="doc-qr-signature-wrap">
                    ${qrDataUrl
                        ? `<img src="${qrDataUrl}" class="doc-qr-img" alt="Scan to verify" width="80" height="80">`
                        : `<div class="doc-qr-code" id="qr-${escapeHtml(id)}" data-id="${escapeHtml(id)}"></div>`
                    }
                    <div class="doc-qr-signature-text">System Generated Document<br>Scan to verify</div>
                </div>
                ` : `
                <div class="doc-sign-line"></div>
                Authorized Signature<br>
                <small>${escapeHtml(companyName)}</small>
                `}
            </div>

            <div class="doc-company-info">
                ${escapeHtml(companyName)} · Engineering precision turnkey solutions ${companyTax ? '· ' + escapeHtml(companyTax) : ''} · ${escapeHtml(companyEmail)}
            </div>

            <!-- Static page footer — shown on every printed page via position:fixed in @media print -->
            <div class="print-page-footer">
                <div class="print-footer-content">
                    <span class="print-footer-ref">${escapeHtml(companyName)}</span>
                    <span class="print-footer-pages">Page</span>
                </div>
            </div>
        </div>
    `;
}

/* ── Tabs ── */
function switchTab(tabGroup, tabName) {
    document.querySelectorAll(`.tab-section[data-group="${tabGroup}"]`).forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll(`.tab-btn[data-group="${tabGroup}"]`).forEach(el => {
        el.classList.remove('active');
    });
    const section = document.querySelector(`.tab-section[data-group="${tabGroup}"][data-tab="${tabName}"]`);
    const btn = document.querySelector(`.tab-btn[data-group="${tabGroup}"][data-tab="${tabName}"]`);
    if (section) section.classList.add('active');
    if (btn) btn.classList.add('active');
}