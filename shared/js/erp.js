/* ══════════════════════════════════════════════════
   NEXWAVE CORE - Shared ERP Scripts
   ══════════════════════════════════════════════════ */

/* ── Supabase Config ── */
const ERP_SUPABASE_URL = 'https://kklpalpobkkkxzzgkfro.supabase.co';
const ERP_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbHBhbHBvYmtra3h6emdrZnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg4MjcsImV4cCI6MjA5NDk0NDgyN30.OZtAI0tJLR6iUaARpmqrG07tcL21u1xDiYn3UK4OU3s';

/* ── Safe storage for Supabase (handles browser tracking prevention) ── */
const safeStorage = {
    getItem: function(key) {
        try { return localStorage.getItem(key); } catch(e) { return null; }
    },
    setItem: function(key, value) {
        try { localStorage.setItem(key, value); } catch(e) { /* tracking prevention */ }
    },
    removeItem: function(key) {
        try { localStorage.removeItem(key); } catch(e) { /* tracking prevention */ }
    }
};

let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient && typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(ERP_SUPABASE_URL, ERP_SUPABASE_ANON_KEY, {
            auth: {
                storage: safeStorage,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
    }
    return supabaseClient;
}

/* ── Auth Check (verifies admin status) ── */
async function checkAuth() {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('[ERP] Supabase client not available — scripts may be blocked by tracking prevention.');
        return;
    }
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

// Auto-close sidebar on nav link click on mobile
(function setupSidebarNavClicks() {
    document.addEventListener('click', function(e) {
        const link = e.target.closest('.nav-link');
        if (link && window.innerWidth <= 900) {
            closeSidebar();
        }
    });
})();

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
    // Theme color meta tag
    if (!document.querySelector('meta[name="theme-color"]')) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#0b2b0f';
        document.head.appendChild(meta);
    }
    // Apple status bar styling for iOS PWA
    if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
        const meta = document.createElement('meta');
        meta.name = 'apple-mobile-web-app-status-bar-style';
        meta.content = 'black-translucent';
        document.head.appendChild(meta);
    }
    // Apple title for iOS
    if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) {
        const meta = document.createElement('meta');
        meta.name = 'apple-mobile-web-app-title';
        meta.content = 'NEXWAVE';
        document.head.appendChild(meta);
    }

    // Apple touch icon for iOS home screen
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const link = document.createElement('link');
        link.rel = 'apple-touch-icon';
        link.href = '../icons/icon-192-maskable.png';
        document.head.appendChild(link);
    }

    // ── Install Prompt Handling ──
    let deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        // Show an install button if one exists in the DOM
        const installBtn = document.getElementById('pwaInstallBtn');
        if (installBtn) {
            installBtn.style.display = 'inline-flex';
            installBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (deferredInstallPrompt) {
                    deferredInstallPrompt.prompt();
                    deferredInstallPrompt.userChoice.then((choice) => {
                        if (choice.outcome === 'accepted') {
                            console.log('[PWA] User accepted install');
                        }
                        deferredInstallPrompt = null;
                        installBtn.style.display = 'none';
                    });
                }
            });
        }
    });
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        const installBtn = document.getElementById('pwaInstallBtn');
        if (installBtn) installBtn.style.display = 'none';
        console.log('[PWA] App installed successfully');
    });

    // ── Service Worker Registration ──
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('../sw.js').then((registration) => {
                // Check for SW updates every 30 minutes
                setInterval(() => {
                    registration.update();
                }, 30 * 60 * 1000);

                // Detect new SW waiting to activate
                if (registration.waiting) {
                    notifySWUpdate(registration);
                }

                // Listen for new SW installing
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                notifySWUpdate(registration);
                            }
                        });
                    }
                });
            }).catch(() => {});

            // Listen for messages from the SW
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_UPDATED') {
                    console.log('[PWA] Service worker updated:', event.data.cache);
                }
            });
        });
    }

    // Show a toast notification when a SW update is available
    function notifySWUpdate(registration) {
        if (window._swUpdateNotified) return;
        window._swUpdateNotified = true;

        setTimeout(() => {
            showToast('A new version is available. Tap to update.', 'success');
            const toasts = document.querySelectorAll('div[style*="position: fixed"][style*="bottom: 30px"]');
            const lastToast = toasts[toasts.length - 1];
            if (lastToast) {
                lastToast.style.cursor = 'pointer';
                lastToast.title = 'Click to update and reload';
                lastToast.addEventListener('click', () => {
                    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                });
            }
        }, 2000);
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

    const mq = window.matchMedia('(max-width: 768px)');
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

/* ── QR Code API — generates QR image URL using goqr.me API (no JS library needed) ── */
function getQRImageUrl(text) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=' + encodeURIComponent(text);
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
                    <button class="btn-ghost" onclick="downloadPDF()" title="Save as PDF — opens print dialog, choose 'Save as PDF' destination"><i class="fas fa-file-pdf"></i> Print / Save as PDF</button>
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
        styleEl.textContent = '@media print { @page { size: A4 portrait; margin: 0; } }';
    } else {
        styleEl.textContent = '@media print { @page { size: ' + size + ' portrait; margin: 0; } }';
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

    // Generate QR code image URL using API (no JS library dependency)
    var qrImgUrl = null;
    var qrTargetUrl = null;
    if (id && (type === 'invoice' || type === 'proforma' || type === 'estimate')) {
        qrTargetUrl = window.location.origin + '/pages/verify.html?id=' + encodeURIComponent(id);
        qrImgUrl = getQRImageUrl(qrTargetUrl);
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
                    <img src="${qrImgUrl}" class="doc-qr-img" alt="Scan to verify" width="100" height="100"
                         onerror="this.style.display='none';var d=document.createElement('div');d.className='doc-qr-code';d.setAttribute('data-id','${escapeHtml(id)}');this.parentNode.insertBefore(d,this);setTimeout(function(){generatePrintQRs();},100);">
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

/* ── Send document email to customer via Resend edge function ── */
async function sendDocumentEmail(config) {
    const customer = config.customer;
    if (!customer || !customer.email) {
        showToast('Customer has no email address on file.', 'error');
        return false;
    }

    const typeLabel = config.type === 'estimate' ? 'Estimate'
        : config.type === 'proforma' ? 'Proforma Invoice'
        : config.type === 'dn' ? 'Debit Note'
        : 'Invoice';

    const company = config.company || {};
    const companyName = company.company_name || 'NEXWAVE Solutions (Pvt) Ltd';
    const companyEmail = company.email || 'info@nexwave.lk';
    const companyPhone = company.phone || '+94 11 234 5678';
    const grandTotal = config.totals?.total || 0;
    const customerName = customer.company_name || customer.contact_person || customer.name || 'Valued Client';

    // Build line items HTML for the email
    const lineItems = config.items || [];
    let itemsHtml = '';
    lineItems.forEach(function(item) {
        const desc = escapeHtml(item.description || item.product_name || item.name || 'Item');
        const qty = item.quantity || item.qty || 1;
        const price = parseFloat(item.unit_price || item.price || 0);
        const total = parseFloat(item.total || (qty * price) || 0);
        itemsHtml += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px 12px;font-size:13px;color:#333;">' + desc + '</td>' +
            '<td style="padding:10px 12px;font-size:13px;text-align:center;color:#555;">' + qty + '</td>' +
            '<td style="padding:10px 12px;font-size:13px;text-align:right;color:#555;">LKR ' + price.toLocaleString() + '</td>' +
            '<td style="padding:10px 12px;font-size:13px;text-align:right;font-weight:600;color:#1b5e20;">LKR ' + total.toLocaleString() + '</td>' +
        '</tr>';
    });

    const verifyUrl = window.location.origin + '/pages/verify.html?id=' + encodeURIComponent(config.id || config.number || '');
    const dateStr = config.date ? new Date(config.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    const emailHtml = '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
    '<div style="max-width:600px;margin:0 auto;background:#fff;">' +
        // Header
        '<div style="background:linear-gradient(135deg,#0b2b0f,#1b5e20);padding:30px 40px;text-align:center;">' +
            '<h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:2px;color:#fff;">NEX<span style="color:#66bb6a;">WAVE</span></h1>' +
            '<p style="margin:4px 0 0;font-size:11px;color:#a5d6a7;letter-spacing:3px;text-transform:uppercase;">SOLUTIONS</p>' +
        '</div>' +
        // Document type badge
        '<div style="text-align:center;padding:24px 40px 8px;">' +
            '<span style="display:inline-block;background:#e8f5e9;color:#1b5e20;font-size:12px;font-weight:700;padding:6px 18px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;">' + escapeHtml(typeLabel) + '</span>' +
            '<h2 style="margin:12px 0 4px;font-size:22px;color:#222;">' + escapeHtml(config.number || '') + '</h2>' +
            '<p style="margin:0;font-size:13px;color:#888;">Date: ' + dateStr + '</p>' +
        '</div>' +
        // Greeting
        '<div style="padding:8px 40px 16px;">' +
            '<p style="font-size:15px;color:#333;line-height:1.6;">Dear <strong>' + escapeHtml(customerName) + '</strong>,</p>' +
            '<p style="font-size:14px;color:#555;line-height:1.6;">Please find your ' + typeLabel.toLowerCase() + ' attached below. Thank you for choosing NEXWAVE Solutions.</p>' +
        '</div>' +
        // Items table
        '<div style="padding:0 40px;">' +
            '<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">' +
                '<thead><tr style="background:#1b5e20;color:#fff;">' +
                    '<th style="padding:12px;font-size:12px;font-weight:600;text-align:left;">Description</th>' +
                    '<th style="padding:12px;font-size:12px;font-weight:600;text-align:center;">Qty</th>' +
                    '<th style="padding:12px;font-size:12px;font-weight:600;text-align:right;">Rate</th>' +
                    '<th style="padding:12px;font-size:12px;font-weight:600;text-align:right;">Amount</th>' +
                '</tr></thead>' +
                '<tbody>' + (itemsHtml || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#999;">No items</td></tr>') + '</tbody>' +
            '</table>' +
        '</div>' +
        // Total
        '<div style="padding:20px 40px;text-align:right;">' +
            '<div style="border-top:2px solid #1b5e20;padding-top:12px;">' +
                '<span style="font-size:16px;color:#555;font-weight:600;">Total Amount: </span>' +
                '<span style="font-size:24px;font-weight:800;color:#1b5e20;">LKR ' + grandTotal.toLocaleString() + '</span>' +
            '</div>' +
        '</div>' +
        // Bank details
        '<div style="padding:0 40px 16px;">' +
            '<div style="background:#f9fbe7;border:1px solid #e8f5e9;border-radius:8px;padding:16px;">' +
                '<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1b5e20;text-transform:uppercase;letter-spacing:1px;">Bank Details</p>' +
                '<p style="margin:0;font-size:13px;color:#555;line-height:1.6;">' +
                    escapeHtml(company.bank_details || 'Commercial Bank PLC · Branch: Siddamulla · Account: 1000234567').replace(/\n/g, '<br>') +
                '</p>' +
            '</div>' +
        '</div>' +
        // Verify button
        (config.id ? '<div style="padding:8px 40px 24px;text-align:center;">' +
            '<a href="' + verifyUrl + '" style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">🔍 Verify Online</a>' +
            '<p style="margin:8px 0 0;font-size:11px;color:#999;">Scan the QR code on your document or click above to verify</p>' +
        '</div>' : '') +
        // Footer
        '<div style="background:#f5f5f5;padding:20px 40px;text-align:center;border-top:1px solid #e0e0e0;">' +
            '<p style="margin:0 0 4px;font-size:12px;color:#888;"><strong>' + escapeHtml(companyName) + '</strong></p>' +
            '<p style="margin:0 0 4px;font-size:12px;color:#888;">' + escapeHtml(companyEmail) + ' | ' + escapeHtml(companyPhone) + '</p>' +
            '<p style="margin:0;font-size:11px;color:#aaa;">Engineering precision turnkey solutions · Colombo, Sri Lanka</p>' +
        '</div>' +
    '</div></body></html>';

    const subject = typeLabel + ' ' + (config.number || '') + ' from NEXWAVE Solutions';

    try {
        const response = await fetch(ERP_SUPABASE_URL + '/functions/v1/resend-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': ERP_SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + ERP_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                to: customer.email,
                subject: subject,
                html: emailHtml
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to send email');
        }

        showToast(typeLabel + ' sent to ' + customer.email + '!', 'success');
        return true;
    } catch (err) {
        console.warn('Email send failed:', err);
        showToast('Failed to send email: ' + (err.message || err), 'error');
        return false;
    }
}
window.sendDocumentEmail = sendDocumentEmail;

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