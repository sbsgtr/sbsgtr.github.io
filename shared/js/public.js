/* ══════════════════════════════════════════════════
   NEXWAVE Solutions - Shared Public Scripts
   ══════════════════════════════════════════════════ */

/* ── CURSOR ── */
(function initCursor() {
    const cur = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    if (!cur || !ring) return;
    document.addEventListener('mousemove', e => {
        cur.style.left = e.clientX - 5 + 'px';
        cur.style.top  = e.clientY - 5 + 'px';
        ring.style.left = e.clientX - 18 + 'px';
        ring.style.top  = e.clientY - 18 + 'px';
    });
    document.querySelectorAll('a, button, .svc-card, .btn-primary, .btn-outline, .btn-send, .chat-btn').forEach(el => {
        el.addEventListener('mouseenter', () => { cur.style.transform = 'scale(2)'; ring.style.transform = 'scale(1.5)'; });
        el.addEventListener('mouseleave', () => { cur.style.transform = 'scale(1)'; ring.style.transform = 'scale(1)'; });
    });
})();

/* ── HEADER SCROLL ── */
(function initHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 40);
    });
})();

/* ── REVEAL ON SCROLL ── */
(function initReveal() {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                revealObserver.unobserve(e.target);
            }
        });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
})();

/* ── MENU ── */
function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const toggle = document.getElementById('menuToggle');
    if (menu) menu.classList.toggle('open');
    if (toggle) toggle.classList.toggle('active');
}
function closeMenu() {
    const menu = document.getElementById('sideMenu');
    const toggle = document.getElementById('menuToggle');
    if (menu) menu.classList.remove('open');
    if (toggle) toggle.classList.remove('active');
}

/* ── CAPTCHA ── */
let captchaN1, captchaN2;
function generateCaptcha() {
    captchaN1 = Math.floor(Math.random() * 10) + 1;
    captchaN2 = Math.floor(Math.random() * 10) + 1;
    const n1El = document.getElementById('num1');
    const n2El = document.getElementById('num2');
    if (n1El) n1El.innerText = captchaN1;
    if (n2El) n2El.innerText = captchaN2;
}
function validateForm() {
    const input = document.getElementById('captchaInput');
    if (parseInt(input ? input.value : 0) === (captchaN1 + captchaN2)) {
        alert('Message sent! We will be in touch shortly.');
        return true;
    } else {
        alert('Incorrect answer. Please try again.');
        generateCaptcha();
        return false;
    }
}

/* ── SUPABASE AUTH (Public Pages) ── */
const NEXWAVE_SUPABASE_URL = 'https://kklpalpobkkkxzzgkfro.supabase.co';
const NEXWAVE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbHBhbHBvYmtra3h6emdrZnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg4MjcsImV4cCI6MjA5NDk0NDgyN30.OZtAI0tJLR6iUaARpmqrG07tcL21u1xDiYn3UK4OU3s';

(function initSupabaseAuth() {
    if (typeof supabase === 'undefined') return;
    const nexwaveClient = supabase.createClient(NEXWAVE_SUPABASE_URL, NEXWAVE_SUPABASE_ANON_KEY);
    window.nexwaveClient = nexwaveClient;

    /* ── Check if current user is an ERP admin ── */
    async function checkIsAdmin(client) {
        try {
            const { data: { user } } = await client.auth.getUser();
            if (!user || !user.email) return false;
            const { data } = await client.from('admin_users').select('id').eq('email', user.email).maybeSingle();
            return !!data;
        } catch (e) {
            return false;
        }
    }

    async function initAuth() {
        const { data: settings } = await nexwaveClient.from('app_settings').select('maintenance_mode').limit(1).maybeSingle();
        const { data: { session } } = await nexwaveClient.auth.getSession();

        // Store admin status globally
        window.__isAdmin = session ? await checkIsAdmin(nexwaveClient) : false;

        // Allow login page to always load so admins can sign in to disable maintenance mode
        if (settings?.maintenance_mode === true && !session && !window.location.pathname.includes('login')) {
            window.location.href = 'countdown.html';
            return;
        }

        if (session) {
            const erpLink = document.getElementById('erpLink');
            const erpLinkDesktop = document.getElementById('erpLinkDesktop');
            if (erpLink) erpLink.style.display = window.__isAdmin ? 'flex' : 'none';
            if (erpLinkDesktop) erpLinkDesktop.style.display = window.__isAdmin ? 'block' : 'none';

            // Only redirect to ERP from login page if user is an admin
            if (window.location.pathname.includes('login')) {
                if (window.__isAdmin) {
                    window.location.href = '../erp/corporate.html';
                }
                // Non-admin users on login page: stay, show a message
            }
        }

        // Show/hide public sign-in elements based on initial state
        updatePublicAuthUI(session);
    }

    /* ── Update side menu with sign-in / user state ── */
    function updatePublicAuthUI(session) {
        // Set global auth vars for NEXi and other features
        window.__isSignedIn = !!session;
        window.__userEmail = session?.user?.email || null;
        window.__userName = session?.user?.user_metadata?.full_name
            || session?.user?.user_metadata?.name
            || (session?.user?.email?.split('@')[0])
            || null;

        const emailBox = document.getElementById('userEmail');
        const loginBtn = document.getElementById('loginBtn');
        const loginBtnD = document.getElementById('loginBtnDesktop');
        const signOutBtn = document.getElementById('signOutBtn');
        const erpLink = document.getElementById('erpLink');
        const erpLinkD = document.getElementById('erpLinkDesktop');
        const publicGoogleBtn = document.getElementById('publicGoogleBtn');
        const publicGithubBtn = document.getElementById('publicGithubBtn');
        const publicSignInSep = document.getElementById('publicSignInSep');
        const newsletterLink = document.getElementById('newsletterLink');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userInitials = document.getElementById('userInitials');
        const userEmailSub = document.getElementById('userEmailSub');

        if (session?.user) {
            const displayName = window.__userName || 'User';
            if (emailBox) emailBox.innerText = session.user.email;
            if (userAvatar) userAvatar.style.display = 'flex';
            if (userName) userName.innerText = displayName;
            if (userInitials) userInitials.innerText = displayName.charAt(0).toUpperCase();
            if (userEmailSub) userEmailSub.innerText = session.user.email;
            if (loginBtn) loginBtn.style.display = window.__isAdmin ? 'flex' : 'none';
            if (loginBtnD) loginBtnD.style.display = window.__isAdmin ? 'block' : 'none';
            if (signOutBtn) signOutBtn.style.display = 'flex';
            if (erpLink) erpLink.style.display = window.__isAdmin ? 'flex' : 'none';
            if (erpLinkD) erpLinkD.style.display = window.__isAdmin ? 'block' : 'none';
            if (publicGoogleBtn) publicGoogleBtn.style.display = 'none';
            if (publicGithubBtn) publicGithubBtn.style.display = 'none';
            if (publicSignInSep) publicSignInSep.style.display = 'none';
            if (newsletterLink) newsletterLink.style.display = 'flex';
        } else {
            if (emailBox) emailBox.innerText = '';
            if (userAvatar) userAvatar.style.display = 'none';
            if (userName) userName.innerText = '';
            if (userInitials) userInitials.innerText = '';
            if (userEmailSub) userEmailSub.innerText = '';
            if (loginBtn) loginBtn.style.display = 'flex';
            if (loginBtnD) loginBtnD.style.display = 'block';
            if (signOutBtn) signOutBtn.style.display = 'none';
            if (erpLink) erpLink.style.display = 'none';
            if (erpLinkD) erpLinkD.style.display = 'none';
            if (publicGoogleBtn) publicGoogleBtn.style.display = 'flex';
            if (publicGithubBtn) publicGithubBtn.style.display = 'flex';
            if (publicSignInSep) publicSignInSep.style.display = 'block';
            if (newsletterLink) newsletterLink.style.display = 'none';
        }
    }

    initAuth();

    nexwaveClient.auth.onAuthStateChange(async (event, session) => {
        // Re-check admin status on auth change
        window.__isAdmin = session ? await checkIsAdmin(nexwaveClient) : false;
        updatePublicAuthUI(session);

        // Don't auto-redirect — let users browse the public site
    });

    /* ── Public Sign-In (for NEXi identity & newsletter) ── */
    window.signInWithPublicGoogle = async function() {
        await nexwaveClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
    };

    window.signInWithPublicGithub = async function() {
        await nexwaveClient.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.href }
        });
    };

    window.signOut = async function() {
        await nexwaveClient.auth.signOut();
        window.location.href = 'index.html';
    };

    /* ── Newsletter Subscription ── */
    window.subscribeToNewsletter = async function(email, name) {
        const { error } = await nexwaveClient.from('newsletter_subscribers').insert({
            email: email,
            name: name || '',
            source: 'countdown'
        });
        if (error && error.code !== '23505') { // 23505 = unique violation (already subscribed)
            throw error;
        }
    };

    // Auto-init captcha if captcha elements exist on the page
    if (document.getElementById('num1') && document.getElementById('num2') && document.getElementById('captchaInput')) {
        generateCaptcha();
    }
})();

/* ── NEXi CHAT WIDGET ── */
(function initChat() {
    const NEXI_SYSTEM_PROMPT = `You are NEXi, an AI assistant for NEXWAVE Solutions (Pvt) Ltd, Sri Lanka. You are NOT Gemini — you are NEXi, a professional sales assistant.

CONVERSATION FLOW — Collect these 4 first (in order):
1. Greet warmly → Name
2. Company
3. Contact Number
4. Requirement

Use [REMEMBERED USER CONTEXT] to skip any you already know. Don't discuss requirements until you have all 4. Keep it friendly, not like a form.

NEXWAVE SERVICES (reference):
1. Automation & Control — PLC, SCADA, pneumatics, HMI, retrofit
2. CNC Solutions — Fiber laser, lathe tools, cutting inserts, boring bars
3. PCB & Electronics — Layout (1-12 layers, 0.1mm gap), SMT/THT assembly, AOI
4. Structural & Infrastructure — LV/MV distribution, compressed air, steel, data cabling
5. Professional Acoustics — PA systems, conference audio, emergency evacuation
6. Smart Systems — Agri automation, smart home, kitchen automation, energy mgmt
7. Technical Consultancy — Feasibility studies, factory layout, cost estimates
8. Hospitality Projects — Villa BMS, security, AV, power/data

LANGUAGE: Respond in the same language the visitor writes in (Sinhala, Tamil, English, etc).

RULES:
- Within scope (automation, CNC, electronics, infrastructure, etc.) but NOT on our list? Answer helpfully, then offer a quote — this is a SALES OPPORTUNITY. Collect contact info.
- Completely unrelated (cooking, politics, celebrities)? Politely redirect.
- Be warm, conversational, professional.
- Never claim to be Gemini — you are NEXi.`;

    const VISITOR_ID = (() => {
        let id = localStorage.getItem('nexwave_visitor_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('nexwave_visitor_id', id);
        }
        return id;
    })();

    // Use auth identity when available
    function getVisitorName() {
        if (window.__isSignedIn && window.__userEmail) {
            return window.__userName || window.__userEmail.split('@')[0];
        }
        return null;
    }

    let nexwaveSessionId = localStorage.getItem('nexwave_session_id');
    let nexwaveHistory = [];
    let chatLoading = false;
    let typingTimeout = null;

    function typeMessage(el, text, speed = 18) {
        if (typingTimeout) clearTimeout(typingTimeout);
        el.classList.add('typing-cursor');
        let i = 0;
        el.innerText = '';
        const container = el.closest('.chat-messages');
        function addChar() {
            if (i < text.length) {
                el.innerText += text[i];
                i++;
                if (container) container.scrollTop = container.scrollHeight;
                typingTimeout = setTimeout(addChar, speed);
            } else {
                el.classList.remove('typing-cursor');
            }
        }
        addChar();
    }

    window.toggleChat = async function() {
        const box = document.getElementById('chatBox');
        if (!box) return;
        const isOpen = box.classList.contains('open');

        if (!isOpen && !chatLoading) {
            chatLoading = true;
            await loadChatHistory();
            chatLoading = false;
        }

        box.classList.toggle('open');
    };

    async function loadChatHistory() {
        try {
            const response = await fetch(NEXWAVE_SUPABASE_URL + '/functions/v1/gemini-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'load',
                    sessionId: nexwaveSessionId,
                    visitorId: VISITOR_ID
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Load failed');

            if (data.sessionId) {
                nexwaveSessionId = data.sessionId;
                localStorage.setItem('nexwave_session_id', data.sessionId);
            }

            const container = document.getElementById('chatMessages');
            if (!container) return;
            container.innerHTML = '';

            // Use auth identity if available for personalized greeting
            const authName = getVisitorName();
            const userName = authName || (data.userInfo && data.userInfo.name);

            if (userName) {
                const companyNote = data.userInfo && data.userInfo.company ? ` from ${data.userInfo.company}` : '';
                const welcomeDiv = document.createElement('div');
                welcomeDiv.className = 'msg ai';
                container.appendChild(welcomeDiv);
                setTimeout(() => typeMessage(welcomeDiv, `👋 Welcome back${companyNote}, ${userName}! How can I help you today?`), 300);
            } else {
                // First time — standard greeting
                const welcomeDiv = document.createElement('div');
                welcomeDiv.className = 'msg ai';
                container.appendChild(welcomeDiv);
                setTimeout(() => typeMessage(welcomeDiv, "Hello! 👋 I'm NEXi from NEXWAVE Solutions. May I know your name please?"), 300);
            }

            if (data.history && data.history.length > 0) {
                nexwaveHistory = data.history;
                data.history.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = 'msg ' + (msg.role === 'user' ? 'user' : 'ai');
                    div.innerText = msg.content;
                    container.appendChild(div);
                });
                container.scrollTop = container.scrollHeight;
            }
        } catch (err) {
            console.warn("Could not load chat history:", err);
            const container = document.getElementById('chatMessages');
            if (container && container.children.length === 0) {
                const authName = getVisitorName();
                const div = document.createElement('div');
                div.className = 'msg ai';
                container.appendChild(div);
                if (authName) {
                    setTimeout(() => typeMessage(div, `👋 Hi ${authName}! I'm NEXi. How can I help you today?`), 300);
                } else {
                    setTimeout(() => typeMessage(div, "Hello! 👋 I'm NEXi from NEXWAVE Solutions. May I know your name please?"), 300);
                }
            }
        }
    }

    window.sendChatMessage = async function() {
        const input = document.getElementById('chatInput');
        const container = document.getElementById('chatMessages');
        if (!input || !container) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = '';

        const userDiv = document.createElement('div');
        userDiv.className = 'msg user';
        userDiv.innerText = text;
        container.appendChild(userDiv);
        container.scrollTop = container.scrollHeight;

        const aiDiv = document.createElement('div');
        aiDiv.className = 'msg ai';
        aiDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        container.appendChild(aiDiv);

        try {
            const response = await fetch(NEXWAVE_SUPABASE_URL + '/functions/v1/gemini-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    systemPrompt: NEXI_SYSTEM_PROMPT,
                    sessionId: nexwaveSessionId,
                    visitorId: VISITOR_ID
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unknown Error");
            aiDiv.innerHTML = '';
            typeMessage(aiDiv, data.reply);

            if (data.sessionId) {
                nexwaveSessionId = data.sessionId;
                localStorage.setItem('nexwave_session_id', data.sessionId);
            }

            nexwaveHistory.push({ role: 'user', content: text });
            nexwaveHistory.push({ role: 'assistant', content: data.reply });
        } catch (err) {
            console.error("Chat Error:", err);
            aiDiv.innerText = "Error: " + err.message;
        }
    };

    // Allow Enter key to send
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'chatInput') {
            window.sendChatMessage();
        }
    });
})();

/* ── PWA: Inject manifest + register service worker ── */
(function setupPublicPWA() {
    // Manifest link (relative: pages/ → root, also handles root-level pages)
    if (!document.querySelector('link[rel="manifest"]')) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        // Determine path: if in a subdirectory, need ../, otherwise ./
        const inSubdir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('/erp/');
        link.href = inSubdir ? '../manifest.json' : './manifest.json';
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
            const inSubdir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('/erp/');
            navigator.serviceWorker.register(inSubdir ? '../sw.js' : './sw.js').catch(() => {});
        });
    }
})();
