// ==================== COMPLETE 3EESHER.CLOUD - FIXED VERSION ====================
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const axios = require('axios');
const Parser = require('rss-parser');
const admin = require('firebase-admin');

// 🔐 FIXED: Use a different approach for Firebase credentials
// Instead of parsing, we'll use the raw environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://allarbaa-com-default-rtdb.firebaseio.com",
  storageBucket: "allarbaa-com.appspot.com"
});

const db = admin.database();
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== FIREBASE DATABASE REFERENCES ====================
const usersRef = db.ref('users');
const videosRef = db.ref('videos');
const postsRef = db.ref('posts');
const placeholdersRef = db.ref('placeholders');
const galleryRef = db.ref('gallery');
const storesRef = db.ref('affiliate_stores');
const moneyLinksRef = db.ref('money_links');
const adsRef = db.ref('ad_placements');
const injectionsRef = db.ref('injections');
const settingsRef = db.ref('settings');
const ebooksRef = db.ref('ebooks');
const botLogsRef = db.ref('bot_logs');

// --- SETUP FOLDERS ---
const UPLOADS_FOLDER = './uploads';
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_FOLDER));
app.use(session({
    secret: '3eesher-ultimate-v3',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== HELPER FUNCTION FOR HEADER ====================
function getHeader(settings, userId, userRole) {
    return `
    <header>
        <div class="header-container">
            <a href="/" class="logo">☁️ 3EESHER.CLOUD</a>
            <button class="mobile-menu-btn" onclick="document.querySelector('.nav-menu').classList.toggle('active')">☰</button>
            <nav class="nav-menu">
                <a href="/">Home</a>
                <a href="/#videos">Videos</a>
                <a href="/library">Library</a>
                ${userId ? 
                    `<a href="/dashboard">Dashboard</a>
                     <a href="/logout">Logout</a>` : 
                    `<a href="/signup" class="signup-btn-nav">✨ SIGN UP FREE</a>
                     <a href="/login">Login</a>`
                }
                ${userRole === 'super_admin' ? '<a href="/admin" style="background:#dc2626; padding:8px 15px; border-radius:5px;">⚙️ Admin</a>' : ''}
            </nav>
        </div>
    </header>`;
}

// ==================== STYLES FUNCTION ====================
function getStyles(settings, customCSS) {
    return `
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        :root { --primary: ${settings.primary_color}; --secondary: ${settings.secondary_color}; --bg: ${settings.bg_color}; --text: ${settings.text_color}; --card-bg: #1a1e2b; --border: #2d3748; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); line-height:1.6; }
        a { color: var(--primary); text-decoration:none; }
        
        /* Header */
        header { background: linear-gradient(135deg, var(--primary), var(--secondary)); color:white; padding:15px 0; position:sticky; top:0; z-index:100; }
        .header-container { max-width:1400px; margin:0 auto; padding:0 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; }
        .logo { font-size:2rem; font-weight:800; color:white; }
        .mobile-menu-btn { display:none; background:none; border:none; color:white; font-size:2rem; cursor:pointer;}
        .nav-menu { display:flex; gap:15px; align-items:center; flex-wrap:wrap; }
        .nav-menu a { color:white; padding:8px 15px; border-radius:5px; }
        .nav-menu a:hover { background:rgba(255,255,255,0.2); }
        .signup-btn-nav { background:#fbbf24; color:#1e293b !important; font-weight:bold; border-radius:50px; padding:10px 20px !important; }
        
        /* Hero */
        .hero-section { position:relative; height:500px; background:url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600') center/cover; display:flex; align-items:center; }
        .hero-section::after { content:''; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); }
        .hero-content { position:relative; z-index:2; max-width:800px; margin:0 auto; text-align:center; color:white; padding:20px; }
        .hero-content h1 { font-size:3.5rem; margin-bottom:20px; }
        
        /* Layout */
        .main-container { max-width:1400px; margin:0 auto; padding:40px 20px; display:grid; grid-template-columns:1fr 350px; gap:30px; }
        .page-container { max-width:1200px; margin:40px auto; padding:20px; background:var(--card-bg); border-radius:15px; border:1px solid var(--border);}
        .section-title { font-size:2rem; border-bottom:2px solid var(--primary); padding-bottom:10px; margin-bottom:20px; }
        
        /* Video Grid */
        .video-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:25px; margin:30px 0; }
        .video-card { background:var(--card-bg); border-radius:12px; overflow:hidden; border:1px solid var(--border); }
        .video-player { width:100%; height:200px; background:#000; }
        .video-info { padding:15px; }
        
        /* Blog */
        .blog-card { background:var(--card-bg); border-radius:12px; overflow:hidden; border:1px solid var(--border); margin-bottom:20px; display:flex; }
        .blog-card img { width:250px; height:180px; object-fit:cover; }
        .blog-content { padding:20px; flex:1; }
        
        /* E-Book Grid */
        .ebook-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 25px; }
        .ebook-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
        .ebook-card img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; }
        .ebook-title { font-size: 1.2rem; font-weight: bold; color: var(--primary); }
        .ebook-author { color: #9ca3af; font-size: 0.9rem; }
        .download-btn { display: block; background: #10b981; color: white; padding: 12px; border-radius: 8px; margin-top: 15px; }
        
        /* Forms */
        .auth-form { max-width:400px; margin:100px auto; background:var(--card-bg); padding:40px; border-radius:15px; text-align:center; }
        .auth-form input { width:100%; padding:15px; margin:10px 0; background:var(--bg); border:1px solid var(--border); color:white; border-radius:8px;}
        .auth-form button { width:100%; padding:15px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:pointer; }
        
        /* Admin */
        .admin-container { max-width:1400px; margin:0 auto; padding:20px; }
        .stats-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:20px; }
        .stat-card { background:var(--card-bg); padding:25px; border-radius:10px; text-align:center; }
        .stat-number { font-size:2.5rem; color:var(--primary); }
        .admin-tabs { display:flex; gap:10px; flex-wrap:wrap; margin:30px 0; background:var(--card-bg); padding:20px; border-radius:10px; }
        .admin-tab-btn { padding:12px 24px; background:#2d3748; border:none; color:white; cursor:pointer; border-radius:5px; }
        .admin-tab-btn.active { background:var(--primary); }
        .admin-section { display:none; background:var(--card-bg); padding:30px; border-radius:10px; }
        .admin-section.active { display:block; }
        .data-table { width:100%; border-collapse:collapse; }
        .data-table th { background:#2d3748; padding:12px; text-align:left; }
        .data-table td { padding:12px; border-bottom:1px solid var(--border); }
        
        /* Responsive */
        @media (max-width:1000px) { .main-container { grid-template-columns:1fr; } }
        @media (max-width:768px) {
            .mobile-menu-btn { display:block; }
            .nav-menu { display:none; flex-direction:column; position:absolute; top:100%; left:0; width:100%; background:var(--primary); padding:20px; }
            .nav-menu.active { display:flex; }
            .hero-content h1 { font-size:2rem; }
            .blog-card { flex-direction:column; }
            .blog-card img { width:100%; height:200px; }
        }
        ${customCSS}
    </style>`;
}

function renderAd(ad) {
    if(!ad) return '';
    return `<div class="ad-container" data-adid="${ad.id}" onclick="fetch('/api/track-ad/${ad.id}', {method:'POST'})">${ad.code}</div>`;
}

// ==================== INITIALIZE FIREBASE WITH DEFAULT DATA ====================
async function initializeFirebase() {
    try {
        const settingsSnapshot = await settingsRef.once('value');
        if (!settingsSnapshot.exists()) {
            console.log('Initializing Firebase with default data...');
            
            const defaultSettings = {
                site_name: '3eesher.cloud',
                site_title: '3eesher.cloud - Videos, Blog & Free Learning Library',
                site_description: 'Watch videos, read blogs, and access 15+ free e-books',
                primary_color: '#2563eb',
                secondary_color: '#7c3aed',
                bg_color: '#0f1117',
                text_color: '#e2e8f0',
                hero_title: 'Welcome to 3eesher.cloud',
                hero_subtitle: 'Watch videos, read blogs, learn for free',
                footer_text: '© 2024 3eesher.cloud. All rights reserved.',
                contact_email: 'abdullahharuna216@gmail.com',
                contact_phone: '+2348080335353',
                google_analytics: 'G-HD01MF5SL9',
                about_text: '3eesher.cloud is a comprehensive online platform founded in 2024...',
                privacy_text: 'Your privacy is important to us...',
                terms_text: 'Terms of Service...',
                bot_enabled: 'true'
            };
            await settingsRef.set(defaultSettings);
            
            // Create admin user
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync('admin123', salt);
            await usersRef.push({
                email: 'admin@3eesher.cloud',
                password: hash,
                full_name: 'Super Admin',
                role: 'super_admin',
                created_date: new Date().toISOString()
            });
            
            console.log('✅ Firebase initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
}
initializeFirebase();

// ==================== API ROUTES ====================
app.post('/api/track-ad/:id', async (req, res) => {
    try {
        const adRef = adsRef.child(req.params.id);
        const ad = await adRef.once('value');
        if (ad.exists()) {
            await adRef.update({ clicks: (ad.val().clicks || 0) + 1 });
        }
        res.sendStatus(200);
    } catch(e) { res.sendStatus(500); }
});

// ==================== MAIN PAGE ====================
app.get('/', async (req, res) => {
    try {
        const data = await getAllData();
        const settings = data.settings;
        
        const headInjection = data.injections?.find(i => i.location === 'head')?.code || '';
        const bodyStartInjection = data.injections?.find(i => i.location === 'body_start')?.code || '';
        const bodyEndInjection = data.injections?.find(i => i.location === 'body_end')?.code || '';
        const customCSS = data.injections?.find(i => i.location === 'custom_css')?.code || '';
        const customJS = data.injections?.find(i => i.location === 'custom_js')?.code || '';
        
        const adsLoc = {};
        data.ads?.forEach(ad => adsLoc[ad.location] = ad);

        const videoHTML = (data.videos || []).slice(0, 10).map(v => `
            <div class="video-card">
                <video class="video-player" src="${v.filename}" controls poster="${v.thumbnail}"></video>
                <div class="video-info">
                    <h3>${v.title}</h3>
                    <p>${v.views || 0} views</p>
                </div>
            </div>
        `).join('');

        const blogHTML = (data.posts || []).slice(0, 3).map(p => `
            <article class="blog-card">
                <img src="${p.image}" alt="${p.title}">
                <div class="blog-content">
                    <h3><a href="/post/${p.id}">${p.title}</a></h3>
                    <p>${new Date(p.created_date).toLocaleDateString()}</p>
                    <p>${(p.content || '').replace(/<[^>]*>/g, '').substring(0, 120)}...</p>
                    <a href="/post/${p.id}">Read More →</a>
                </div>
            </article>
        `).join('');

        res.send(`<!DOCTYPE html>
<html>
<head>
    <title>${settings.site_title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.google_analytics}');</script>
    ${headInjection}
    ${getStyles(settings, customCSS)}
</head>
<body>
    ${bodyStartInjection}
    ${getHeader(settings, req.session.userId, req.session.userRole)}
    ${renderAd(adsLoc['header'])}
    
    <div class="hero-section">
        <div class="hero-content">
            <h1>${settings.hero_title}</h1>
            <p>${settings.hero_subtitle}</p>
            ${!req.session.userId ? 
                `<a href="/signup" class="signup-btn-nav">Start Learning Free</a>` : 
                `<a href="/library" style="background:#10b981; padding:15px 40px; color:white; border-radius:50px;">Go to Library</a>`
            }
        </div>
    </div>

    <div class="main-container">
        <div class="left-column">
            <section id="videos">
                <h2 class="section-title">🎥 Videos</h2>
                ${renderAd(adsLoc['content_top'])}
                <div class="video-grid">${videoHTML || '<p>No videos yet</p>'}</div>
                ${renderAd(adsLoc['content_middle'])}
            </section>

            <section id="blog">
                <h2 class="section-title">📝 Latest Articles</h2>
                ${blogHTML || '<p>No posts yet</p>'}
            </section>
            ${renderAd(adsLoc['content_bottom'])}
        </div>

        <div class="right-column">
            <div style="background:linear-gradient(135deg,var(--primary),var(--secondary));padding:30px;border-radius:15px;text-align:center;margin-bottom:30px;">
                <h2 style="color:white;">📚 Free Library</h2>
                <p style="color:white;">15+ premium e-books</p>
                ${!req.session.userId ? 
                    `<a href="/signup" style="display:block;background:white;color:var(--primary);padding:15px;border-radius:50px;margin-top:15px;">Sign Up to Read</a>` : 
                    `<a href="/library" style="display:block;background:#10b981;color:white;padding:15px;border-radius:50px;margin-top:15px;">Open Library</a>`
                }
            </div>
            ${renderAd(adsLoc['sidebar_top'])}
            ${renderAd(adsLoc['sidebar_bottom'])}
        </div>
    </div>

    ${renderAd(adsLoc['footer'])}
    
    <footer style="background:#0a0c12; padding:40px 20px; text-align:center; margin-top:50px;">
        <p style="color:#a0aec0;">${settings.footer_text}</p>
        <p style="color:#a0aec0;">📧 ${settings.contact_email} | 📞 ${settings.contact_phone}</p>
    </footer>

    ${bodyEndInjection}
    
    <a href="https://wa.me/${settings.contact_phone.replace('+','')}" style="position:fixed;bottom:20px;right:20px;background:#25D366;color:white;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;z-index:99;" target="_blank">💬</a>
    
    <script>
        document.querySelector('.mobile-menu-btn')?.addEventListener('click', function(){
            document.querySelector('.nav-menu').classList.toggle('active');
        });
        ${customJS}
    </script>
</body>
</html>`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading page');
    }
});

// ==================== HELPER FUNCTION TO GET ALL DATA ====================
async function getAllData() {
    try {
        const [settings, videos, posts, placeholders, gallery, stores, moneyLinks, ads, injections, ebooks] = await Promise.all([
            settingsRef.once('value').catch(() => ({ val: () => ({}) })),
            videosRef.once('value').catch(() => ({ val: () => ({}) })),
            postsRef.once('value').catch(() => ({ val: () => ({}) })),
            placeholdersRef.once('value').catch(() => ({ val: () => ({}) })),
            galleryRef.once('value').catch(() => ({ val: () => ({}) })),
            storesRef.once('value').catch(() => ({ val: () => ({}) })),
            moneyLinksRef.once('value').catch(() => ({ val: () => ({}) })),
            adsRef.once('value').catch(() => ({ val: () => ({}) })),
            injectionsRef.once('value').catch(() => ({ val: () => ({}) })),
            ebooksRef.once('value').catch(() => ({ val: () => ({}) }))
        ]);
        
        return {
            settings: settings.val() || {},
            videos: videos.val() ? Object.entries(videos.val()).map(([id, val]) => ({...val, id})) : [],
            posts: posts.val() ? Object.entries(posts.val()).map(([id, val]) => ({...val, id})).reverse() : [],
            placeholders: placeholders.val() ? Object.values(placeholders.val()) : [],
            gallery: gallery.val() ? Object.values(gallery.val()) : [],
            stores: stores.val() ? Object.values(stores.val()).filter(s => s.active) : [],
            moneyLinks: moneyLinks.val() ? Object.values(moneyLinks.val()).filter(m => m.active) : [],
            ads: ads.val() ? Object.entries(ads.val()).map(([id, val]) => ({...val, id})).filter(a => a.enabled) : [],
            injections: injections.val() ? Object.values(injections.val()).filter(i => i.active) : [],
            ebooks: ebooks.val() ? Object.entries(ebooks.val()).map(([id, val]) => ({...val, id})) : []
        };
    } catch (error) {
        console.error('Error in getAllData:', error);
        return {
            settings: {}, videos: [], posts: [], placeholders: [], gallery: [], 
            stores: [], moneyLinks: [], ads: [], injections: [], ebooks: []
        };
    }
}

// ==================== USER AUTHENTICATION ====================
app.get('/signup', async (req, res) => {
    const data = await getAllData();
    res.send(`<!DOCTYPE html>
<html><head><title>Sign Up</title>${getStyles(data.settings, '')}</head><body>
    ${getHeader(data.settings, req.session.userId, req.session.userRole)}
    <div class="auth-form">
        <h2>Create Free Account</h2>
        <form method="POST" action="/signup">
            <input type="text" name="name" placeholder="Full Name" required>
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Sign Up</button>
        </form>
        <p>Already have an account? <a href="/login">Login</a></p>
    </div>
</body></html>`);
});

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const exists = await usersRef.orderByChild('email').equalTo(email).once('value');
    if (exists.exists()) {
        return res.send('<script>alert("Email already registered!"); window.location="/login";</script>');
    }
    
    const hash = bcrypt.hashSync(password, 10);
    const newUser = await usersRef.push({ 
        full_name: name, 
        email, 
        password: hash, 
        role: 'user', 
        created_date: new Date().toISOString() 
    });
    
    req.session.userId = newUser.key;
    req.session.userRole = 'user';
    res.redirect('/library');
});

app.get('/login', async (req, res) => {
    const data = await getAllData();
    res.send(`<!DOCTYPE html>
<html><head><title>Login</title>${getStyles(data.settings, '')}</head><body>
    ${getHeader(data.settings, req.session.userId, req.session.userRole)}
    <div class="auth-form">
        <h2>Login</h2>
        <form method="POST" action="/login">
            <input type="email" name="username" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
        <p>Don't have an account? <a href="/signup">Sign up</a></p>
    </div>
</body></html>`);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const snapshot = await usersRef.orderByChild('email').equalTo(username).once('value');
    if (snapshot.exists()) {
        const userId = Object.keys(snapshot.val())[0];
        const user = snapshot.val()[userId];
        if (bcrypt.compareSync(password, user.password)) {
            req.session.userId = userId;
            req.session.userRole = user.role;
            if (user.role === 'super_admin') return res.redirect('/admin');
            return res.redirect('/dashboard');
        }
    }
    res.send('<script>alert("Invalid Credentials"); window.location="/login";</script>');
});

app.get('/logout', (req, res) => { 
    req.session.destroy(); 
    res.redirect('/'); 
});

// ==================== LIBRARY PAGE ====================
app.get('/library', async (req, res) => {
    if (!req.session.userId) return res.redirect('/signup');
    const data = await getAllData();
    
    const booksHTML = (data.ebooks || []).map(book => `
        <div class="ebook-card">
            <img src="${book.cover_image || 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400'}" alt="${book.title}">
            <div class="ebook-title">${book.title}</div>
            <div class="ebook-author">${book.author || 'Unknown'}</div>
            <a href="/ebook/${book.id}" class="download-btn">📖 Read Now</a>
        </div>
    `).join('') || '<p>No books available</p>';

    res.send(`<!DOCTYPE html>
<html><head><title>Library</title>${getStyles(data.settings, '')}</head><body>
    ${getHeader(data.settings, req.session.userId, req.session.userRole)}
    <div class="page-container">
        <h1 style="color:var(--primary);">📚 Free Learning Library</h1>
        <div class="ebook-grid">${booksHTML}</div>
    </div>
</body></html>`);
});

// ==================== EBOOK DETAIL PAGE ====================
app.get('/ebook/:id', async (req, res) => {
    if (!req.session.userId) return res.redirect('/signup');
    
    const bookSnap = await ebooksRef.child(req.params.id).once('value');
    const book = bookSnap.val();
    if (!book) return res.redirect('/library');
    
    const data = await getAllData();
    
    res.send(`<!DOCTYPE html>
<html><head><title>${book.title}</title>${getStyles(data.settings, '')}</head><body>
    ${getHeader(data.settings, req.session.userId, req.session.userRole)}
    <div class="page-container" style="max-width:800px;">
        <h1>${book.title}</h1>
        <p>By ${book.author}</p>
        <img src="${book.cover_image}" style="width:100%; max-height:400px; object-fit:contain;">
        <p>${book.description}</p>
        <a href="/library">← Back to Library</a>
    </div>
</body></html>`);
});

// ==================== DASHBOARD ====================
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const userSnap = await usersRef.child(req.session.userId).once('value');
    const user = userSnap.val();
    const data = await getAllData();
    
    res.send(`<!DOCTYPE html>
<html><head><title>Dashboard</title>${getStyles(data.settings, '')}</head><body>
    ${getHeader(data.settings, req.session.userId, req.session.userRole)}
    <div class="page-container" style="text-align:center;">
        <h1>Welcome, ${user.full_name}</h1>
        <p>Email: ${user.email}</p>
        <a href="/library" class="signup-btn-nav">Go to Library</a>
        ${user.role === 'super_admin' ? '<a href="/admin" style="background:#ef4444; padding:15px 30px; color:white; border-radius:5px; display:inline-block; margin-top:20px;">Admin Panel</a>' : ''}
    </div>
</body></html>`);
});

// ==================== POST PAGE ====================
app.get('/post/:id', async (req, res) => {
    const data = await getAllData();
    const post = (data.posts || []).find(p => p.id === req.params.id);
    if(!post) return res.status(404).send('Not found');
    
    res.send(`<!DOCTYPE html>
<html><head><title>${post.title}</title>${getStyles(data.settings, '')}</head><body>
${getHeader(data.settings, req.session.userId, req.session.userRole)}
<div class="page-container">
    <h1>${post.title}</h1>
    <p>${new Date(post.created_date).toLocaleDateString()}</p>
    <div>${post.content}</div>
    <a href="/">← Back</a>
</div></body></html>`);
});

// ==================== ADMIN API ROUTES ====================
app.post('/admin/save-injection', async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { location, code } = req.body;
    
    const snapshot = await injectionsRef.orderByChild('location').equalTo(location).once('value');
    if (snapshot.exists()) {
        const key = Object.keys(snapshot.val())[0];
        await injectionsRef.child(key).update({ code });
    } else {
        await injectionsRef.push({ location, code, active: 1 });
    }
    res.json({ success: true });
});

app.post('/admin/upload-video', upload.fields([{ name: 'video' }, { name: 'thumbnail' }]), async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') return res.redirect('/login');
    
    const video = req.files?.['video']?.[0];
    if (video) {
        await videosRef.push({
            title: req.body.title,
            filename: '/uploads/' + video.filename,
            thumbnail: req.files?.['thumbnail']?.[0] ? '/uploads/' + req.files['thumbnail'][0].filename : null,
            views: 0,
            created_date: new Date().toISOString()
        });
    }
    res.redirect('/admin');
});

// ==================== ADMIN PANEL ====================
app.get('/admin', async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') return res.redirect('/login');
    
    const data = await getAllData();
    
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Admin Panel</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${getStyles(data.settings, '')}
    <style>
        .injection-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(400px,1fr)); gap:20px; }
        .injection-card { background:#0f1117; padding:20px; border-radius:10px; }
        .injection-card textarea { width:100%; height:150px; background:#1a1e2b; color:white; border:1px solid #2d3748; padding:10px; }
    </style>
</head>
<body>
    ${getHeader(data.settings, req.session.userId, req.session.userRole)}
    
    <div class="admin-container">
        <h1>⚙️ Super Admin Panel</h1>
        
        <div class="admin-tabs">
            <button class="admin-tab-btn active" onclick="showTab('videos')">🎥 Videos</button>
            <button class="admin-tab-btn" onclick="showTab('injections')">💉 Injections</button>
            <button class="admin-tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
        </div>
        
        <div id="videos-section" class="admin-section active">
            <h2>Upload Video</h2>
            <form action="/admin/upload-video" method="POST" enctype="multipart/form-data">
                <input type="text" name="title" placeholder="Video Title" required><br>
                <input type="file" name="video" accept="video/*" capture="camcorder" required><br>
                <input type="file" name="thumbnail" accept="image/*"><br>
                <button type="submit">Upload</button>
            </form>
            <h3>Videos</h3>
            <table class="data-table">
                ${(data.videos || []).map(v => `<tr><td>${v.title}</td><td>${v.views||0} views</td></tr>`).join('')}
            </table>
        </div>
        
        <div id="injections-section" class="admin-section">
            <h2>Code Injections</h2>
            <div class="injection-grid">
                ${['head', 'body_start', 'body_end', 'custom_css', 'custom_js'].map(loc => {
                    const inj = (data.injections || []).find(i => i.location === loc);
                    return `
                    <div class="injection-card">
                        <h3>${loc.toUpperCase()}</h3>
                        <textarea id="inj-${loc}">${inj?.code || ''}</textarea>
                        <button onclick="saveInjection('${loc}')">Save</button>
                    </div>`;
                }).join('')}
            </div>
        </div>
        
        <div id="settings-section" class="admin-section">
            <h2>Settings</h2>
            <form action="/admin/save-settings" method="POST">
                <p>Site Name: <input type="text" name="site_name" value="${data.settings.site_name || ''}"></p>
                <p>Contact Email: <input type="email" name="contact_email" value="${data.settings.contact_email || ''}"></p>
                <p>Contact Phone: <input type="text" name="contact_phone" value="${data.settings.contact_phone || ''}"></p>
                <button type="submit">Save</button>
            </form>
        </div>
    </div>
    
    <script>
        function showTab(tab){
            document.querySelectorAll('.admin-tab-btn').forEach(b=>b.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tab+'-section').classList.add('active');
        }
        
        function saveInjection(loc){
            const code = document.getElementById('inj-'+loc).value;
            fetch('/admin/save-injection', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({location: loc, code})
            }).then(() => alert('Saved!'));
        }
    </script>
</body>
</html>`);
});

app.post('/admin/save-settings', async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') return res.redirect('/login');
    await settingsRef.update(req.body);
    res.redirect('/admin');
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3EESHER.CLOUD IS LIVE!`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🔑 Admin: /admin (admin@3eesher.cloud / admin123)`);
});
