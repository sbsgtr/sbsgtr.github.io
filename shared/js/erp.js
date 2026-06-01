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

/* ── Load ERP Header (dynamically) ── */
function loadSidebar() {
    // Sidebar is already static HTML in each page for simplicity
    // This function is a placeholder for future dynamic loading
    checkAuth();
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

/* ── Print Preview Helper ── */
function openPrintPreview(title, contentHtml) {
    closePrintPreview();

    const overlay = document.createElement('div');
    overlay.id = 'printPreviewOverlay';
    overlay.innerHTML = `
        <div class="print-preview-container">
            <div class="print-preview-header">
                <h3><i class="fas fa-file-pdf"></i> ${escapeHtml(title)}</h3>
                <div>
                    <button class="btn-green" onclick="window.print()" style="margin-right:8px;"><i class="fas fa-print"></i> Print</button>
                    <button class="btn-close" onclick="closePrintPreview()">&times;</button>
                </div>
            </div>
            <div class="print-preview-body" id="printPreviewBody"></div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('printPreviewBody').innerHTML = contentHtml;
    document.body.classList.add('print-preview-active');
    document.body.style.overflow = 'hidden';
    preparePrintPagination();

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closePrintPreview();
    });
}

function preparePrintPagination() {
    const doc = document.querySelector('#printPreviewBody .print-document');
    if (!doc) return;
    requestAnimationFrame(() => {
        const pageHeightPx = (297 - 30) * (96 / 25.4);
        if (doc.scrollHeight <= pageHeightPx * 1.08) {
            doc.classList.add('single-page');
        }
    });
}

function closePrintPreview() {
    const el = document.getElementById('printPreviewOverlay');
    if (el) el.remove();
    document.body.classList.remove('print-preview-active');
    document.body.style.overflow = '';
}
window.closePrintPreview = closePrintPreview;

function formatDocMoney(amount) {
    return 'LKR ' + parseFloat(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDocDate(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function buildPrintDoc(config) {
    const { type, number, date, customer, items, totals, notes, footnotes, company, po_number } = config;
    const ref = number || '';
    const companyName = company?.company_name || 'NEXWAVE Solutions (Pvt) Ltd';
    const companyAddr = company?.address || 'Colombo, Sri Lanka';
    const companyPhone = company?.phone || '+94 11 234 5678';
    const companyEmail = company?.email || 'info@nexwave.lk';
    const companyWeb = company?.website || 'www.nexwavex.com';
    const companyInfo = company?.company_info || '';
    const generalNote = company?.general_note || '';

    const typeLabel = type === 'estimate' ? 'ESTIMATE'
        : type === 'dn' ? 'DELIVERY NOTE'
        : type === 'proforma' ? 'PROFORMA INVOICE'
        : 'INVOICE';

    const isDn = type === 'dn';

    const lineItems = items || [];
    let itemsHtml = '';
    if (lineItems.length > 0) {
        lineItems.forEach((item, idx) => {
            const desc = item.description || item.product_name || item.name || '';
            const notesText = item.notes || '';
            const qty = item.quantity || item.qty || 0;
            const price = item.unit_price || item.price || 0;
            const total = item.total || (qty * price) || 0;
            if (isDn) {
                itemsHtml += `<tr>
                    <td class="col-num">${idx + 1}</td>
                    <td class="col-desc">${escapeHtml(desc)}${notesText ? `<br><small>${escapeHtml(notesText)}</small>` : ''}</td>
                    <td class="col-qty">${qty}</td>
                </tr>`;
            } else {
                itemsHtml += `<tr>
                    <td class="col-num">${idx + 1}</td>
                    <td class="col-desc">${escapeHtml(desc)}${notesText ? `<br><small>${escapeHtml(notesText)}</small>` : ''}</td>
                    <td class="col-qty">${qty}</td>
                    <td class="col-price">${formatDocMoney(price)}</td>
                    <td class="col-total">${formatDocMoney(total)}</td>
                </tr>`;
            }
        });
    }

    const grandTotal = totals?.total || totals?.grand_total || lineItems.reduce((s, i) => s + (i.total || 0), 0);
    const statusLabel = totals?.status ? String(totals.status).replace(/_/g, ' ').toUpperCase() : '';
    const showStatus = type === 'invoice' || type === 'proforma';

    const customerLines = [
        customer?.contact_person || customer?.name ? `<strong>${escapeHtml(customer.contact_person || customer.name)}</strong>` : '',
        customer?.company_name ? escapeHtml(customer.company_name) : '',
        customer?.address ? escapeHtml(customer.address) : '',
        customer?.city ? escapeHtml(customer.city) : '',
        customer?.contact_number ? `<i class="fas fa-phone"></i> ${escapeHtml(customer.contact_number)}` : '',
        customer?.email ? `<i class="fas fa-envelope"></i> ${escapeHtml(customer.email)}` : ''
    ].filter(Boolean).join('<br>');

    const companyInfoHtml = companyInfo ? escapeHtml(companyInfo).replace(/\n/g, '<br>') : '';
    const generalNoteHtml = generalNote ? escapeHtml(generalNote).replace(/\n/g, '<br>') : '';

    return `
        <div class="print-document" data-ref="${escapeHtml(ref)}">
            <header class="doc-header">
                <div class="doc-brand">
                    <div class="doc-brand-top">
                        <img class="doc-logo" src="../logo.png" alt="NEXWAVE">
                        <div class="doc-brand-text"><span class="brand-nex">NEX</span><span class="brand-wave">WAVE</span></div>
                    </div>
                    <div class="doc-company">
                        <div class="doc-company-name">${escapeHtml(companyName)}</div>
                        <div class="doc-company-addr">${escapeHtml(companyAddr)}</div>
                        <div class="doc-contact-row">
                            <span>${escapeHtml(companyWeb)}</span>
                            <span class="doc-contact-sep">|</span>
                            <span>${escapeHtml(companyEmail)}</span>
                        </div>
                        <div class="doc-contact-row">
                            <span>${escapeHtml(companyPhone)}</span>
                        </div>
                        ${companyInfoHtml ? `<div class="doc-company-info">${companyInfoHtml}</div>` : ''}
                    </div>
                </div>
                <div class="doc-meta">
                    <div class="doc-type-badge">${escapeHtml(typeLabel)}</div>
                    <div class="doc-number">${escapeHtml(ref)}</div>
                    <div class="doc-meta-grid">
                        <span class="meta-label">Date</span>
                        <span class="meta-value">${formatDocDate(date)}</span>
                        ${customer?.contact_person || customer?.name ? `<span class="meta-label">Customer</span><span class="meta-value"><strong>${escapeHtml(customer.contact_person || customer.name)}</strong></span>` : ''}
                        ${customer?.contact_number ? `<span class="meta-label">Phone</span><span class="meta-value"><i class="fas fa-phone"></i> ${escapeHtml(customer.contact_number)}</span>` : ''}
                        ${type === 'invoice' && po_number ? `<span class="meta-label">PO No</span><span class="meta-value">${escapeHtml(po_number)}</span>` : ''}
                        ${showStatus ? `<span class="meta-label">Status</span><span class="meta-value meta-status">${escapeHtml(statusLabel || 'PENDING')}</span>` : ''}
                    </div>
                </div>
            </header>

            <div class="doc-parties">
                <div class="doc-party">
                    <div class="doc-party-label">Bill To</div>
                    <div class="doc-party-body">${customerLines || '—'}</div>
                </div>
                <div class="doc-party doc-party-ref">
                    <div class="doc-party-label">Reference</div>
                    <div class="doc-party-body">
                        <strong>${escapeHtml(ref)}</strong><br>
                        Document Type: ${escapeHtml(typeLabel)}
                    </div>
                </div>
            </div>

            <table class="doc-items${isDn ? ' doc-items-dn' : ''}">
                <thead>
                    <tr>
                        <th class="col-num">#</th>
                        <th class="col-desc${isDn ? ' col-desc-dn' : ''}">Description</th>
                        <th class="col-qty">${isDn ? 'Qty' : 'Qty'}</th>
                        ${isDn ? '' : '<th class="col-price">Unit Price</th>'}
                        ${isDn ? '' : '<th class="col-total">Amount</th>'}
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml || `<tr><td colspan="${isDn ? 3 : 5}" class="doc-empty">No items</td></tr>`}
                </tbody>
            </table>

            ${isDn ? '' : `
            <div class="doc-totals-wrap">
                <div class="doc-totals">
                    <div class="doc-total-row">
                        <span>Subtotal</span>
                        <span>${formatDocMoney(grandTotal)}</span>
                    </div>
                    <div class="doc-total-row doc-grand-total">
                        <span>Grand Total</span>
                        <span>${formatDocMoney(grandTotal)}</span>
                    </div>
                </div>
            </div>`}

            ${notes ? `<div class="doc-notes"><strong>Notes</strong><p>${escapeHtml(notes)}</p></div>` : ''}

            <div class="doc-signatory">
                <div class="doc-sign-line"></div>
                <span>Authorized Signature</span>
            </div>

            <hr class="doc-footer-divider">
            ${footnotes ? `<div class="doc-general-note"><strong>Payment Terms</strong><p>${escapeHtml(footnotes)}</p></div>` : ''}
            ${footnotes && generalNoteHtml ? '<hr class="doc-footer-divider">' : ''}
            ${generalNoteHtml ? `<div class="doc-general-note"><strong>General Note</strong><p>${generalNoteHtml}</p></div>` : ''}

            <div class="print-page-footer">
                <span class="print-footer-ref">${escapeHtml(ref)}</span><span class="print-footer-pages"></span>
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
    if (section) section.classList.add('active');
    const btn = document.querySelector(`.tab-btn[data-group="${tabGroup}"][data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
}
