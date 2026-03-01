// ==================== 3EESHER.CLOUD - FIXED VERSION ====================
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

// 🔐 Firebase Admin SDK - from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://allarbaa-com-default-rtdb.firebaseio.com",
  storageBucket: "allarbaa-com.appspot.com" // ✅ THIS WAS MISSING
});

const db = admin.database();
const app = express();
const PORT = process.env.PORT || 3000;

// --- SETUP ---
const UPLOADS_FOLDER = './uploads';
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_FOLDER));
app.use(session({
    secret: '3eesher-fixed',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== DATABASE REFERENCES ====================
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
const commentsRef = db.ref('comments');
const likesRef = db.ref('likes');
const subscribersRef = db.ref('subscribers');
const notificationsRef = db.ref('notifications');
const botLogsRef = db.ref('bot_logs');
const userLibraryRef = db.ref('user_library');

// ==================== INITIALIZE DATA ====================
async function initializeData() {
    try {
        const settingsSnapshot = await settingsRef.once('value');
        if (!settingsSnapshot.exists()) {
            console.log('Initializing Firebase with default data...');
            
            // Default settings with LONG DESCRIPTIONS
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
                
                about_text: `3eesher.cloud is a comprehensive online platform founded in 2024 with a mission to provide free, high-quality educational resources to learners worldwide. Our platform combines entertainment and education through carefully curated videos, insightful blog posts, and an extensive library of free e-books.`,
                
                privacy_text: `Your privacy is important to us. We collect only necessary information to provide our services. We never sell your personal data to third parties. All information is stored securely and used only for platform functionality.`,
                
                terms_text: `By using 3eesher.cloud, you agree to our terms and conditions. You are responsible for the content you post. We reserve the right to remove any content that violates our guidelines.`,
                
                bot_enabled: 'true'
            };
            await settingsRef.set(defaultSettings);
            
            // Default videos
            const defaultVideos = [
                { title: 'How to Host Website on GitHub Pages', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', description: 'Learn how to host any static website on GitHub for free', category: 'Tech', views: 0, likes: 0, downloads: 0, created_date: new Date().toISOString() },
                { title: 'Create Website in 10 Minutes with GitHub', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', description: 'Quick website creation guide', category: 'Tech', views: 0, likes: 0, downloads: 0, created_date: new Date().toISOString() },
                { title: 'Add Custom Domain to GitHub Pages', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', thumbnail: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', description: 'Connect your own domain to GitHub Pages', category: 'Tech', views: 0, likes: 0, downloads: 0, created_date: new Date().toISOString() },
                { title: 'Big Buck Bunny - Full Cartoon', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', thumbnail: 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', description: 'Watch the classic 10-minute cartoon', category: 'Entertainment', views: 0, likes: 0, downloads: 0, created_date: new Date().toISOString() }
            ];
            
            for (let i = 0; i < defaultVideos.length; i++) {
                await videosRef.push(defaultVideos[i]);
            }
            
            // Default ebooks by subject
            const defaultEbooks = [
                { title: 'HTML & CSS QuickStart Guide', author: 'John Smith', description: 'Master HTML5 and CSS3', cover_image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', category: 'Web Development', pages: 220, difficulty: 'Beginner', views: 0, featured: 1, created_date: new Date().toISOString() },
                { title: 'JavaScript from Zero to Hero', author: 'Sarah Johnson', description: '100+ exercises covering variables, functions', cover_image: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', category: 'Web Development', pages: 310, difficulty: 'Intermediate', views: 0, featured: 1, created_date: new Date().toISOString() },
                { title: 'React.js for Beginners', author: 'Michael Chen', description: 'Learn React hooks, components, state management', cover_image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', category: 'Web Development', pages: 280, difficulty: 'Intermediate', views: 0, featured: 1, created_date: new Date().toISOString() },
                { title: 'ChatGPT Prompt Engineering', author: 'Priya Patel', description: '200+ proven prompts for content creation', cover_image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', category: 'Artificial Intelligence', pages: 180, difficulty: 'Beginner', views: 0, featured: 1, created_date: new Date().toISOString() },
                { title: 'SQL Database Design', author: 'Robert Taylor', description: 'Master database design, normalization, queries', cover_image: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', category: 'Database Creation', pages: 210, difficulty: 'Beginner', views: 0, featured: 1, created_date: new Date().toISOString() },
                { title: 'Affiliate Marketing Secrets', author: 'Chris Martin', description: 'How to earn $500-$5000/month with affiliate links', cover_image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', category: 'Make Money Online', pages: 210, difficulty: 'Beginner', views: 0, featured: 1, created_date: new Date().toISOString() }
            ];
            
            for (let i = 0; i < defaultEbooks.length; i++) {
                await ebooksRef.push(defaultEbooks[i]);
            }
            
            // Default placeholders
            const defaultPlaceholders = [
                { title: 'Learn Web Development', filename: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200', link: '/videos', display_order: 1, created_date: new Date().toISOString() },
                { title: 'Master AI & ChatGPT', filename: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200', link: '/library', display_order: 2, created_date: new Date().toISOString() },
                { title: 'Build Databases', filename: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200', link: '/library', display_order: 3, created_date: new Date().toISOString() },
                { title: 'Make Money Online', filename: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200', link: '/money', display_order: 4, created_date: new Date().toISOString() }
            ];
            
            for (let i = 0; i < defaultPlaceholders.length; i++) {
                await placeholdersRef.push(defaultPlaceholders[i]);
            }
            
            // Default ads and injections (simplified)
            await adsRef.push({ name: 'Header Banner', location: 'header', code: '<!-- Ad Space -->', enabled: 1, created_date: new Date().toISOString() });
            await injectionsRef.push({ name: 'Head Scripts', location: 'head', code: '<!-- Head Injections -->', active: 1, created_date: new Date().toISOString() });
            await injectionsRef.push({ name: 'Body Start', location: 'body_start', code: '<!-- Body Start -->', active: 1, created_date: new Date().toISOString() });
            await injectionsRef.push({ name: 'Body End', location: 'body_end', code: '<!-- Body End -->', active: 1, created_date: new Date().toISOString() });
            
            console.log('✅ Firebase initialized with default data');
        }
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
}

initializeData();

// ==================== CREATE ADMIN USER ====================
async function createAdminUser() {
    try {
        const adminSnapshot = await usersRef.orderByChild('email').equalTo('admin@3eesher.cloud').once('value');
        if (!adminSnapshot.exists()) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync('admin123', salt);
            await usersRef.push({
                email: 'admin@3eesher.cloud',
                password: hash,
                full_name: 'Super Admin',
                role: 'super_admin',
                created_date: new Date().toISOString()
            });
            console.log('✅ Admin user created');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
    }
}

createAdminUser();

// ==================== AUTO-BLOGGER ====================
const parser = new Parser();

async function runAutoBlogger() {
    try {
        console.log('🤖 Auto-blogger running');
        const feed = await parser.parseURL('https://hnrss.org/frontpage?count=2');
        
        for (const item of feed.items.slice(0, 2)) {
            const exists = await postsRef.orderByChild('title').equalTo(item.title).once('value');
            if (!exists.exists()) {
                await postsRef.push({
                    title: item.title,
                    content: `<h1>${item.title}</h1><p>${item.contentSnippet || 'Read more'}</p><img src="https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800" style="width:100%;">`,
                    source: item.link,
                    category: 'Tech',
                    views: 0,
                    likes: 0,
                    created_date: new Date().toISOString()
                });
            }
        }
        console.log('✅ Auto-blogger completed');
    } catch (error) {
        console.error('Error in auto-blogger:', error);
    }
}

cron.schedule('0 9 * * *', runAutoBlogger);
cron.schedule('0 19 * * *', runAutoBlogger);

// ==================== UPLOAD SETUP ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ==================== HELPER FUNCTION ====================
async function getAllData() {
    const [settings, videos, placeholders, posts, gallery, stores, moneyLinks, ads, injections, ebooks] = await Promise.all([
        settingsRef.once('value'),
        videosRef.once('value'),
        placeholdersRef.once('value'),
        postsRef.orderByChild('created_date').limitToLast(6).once('value'),
        galleryRef.once('value'),
        storesRef.once('value'),
        moneyLinksRef.once('value'),
        adsRef.once('value'),
        injectionsRef.once('value'),
        ebooksRef.once('value')
    ]);
    
    return {
        settings: settings.val() || {},
        videos: videos.val() ? Object.values(videos.val()) : [],
        placeholders: placeholders.val() ? Object.values(placeholders.val()).sort((a,b) => (a.display_order||0)-(b.display_order||0)) : [],
        posts: posts.val() ? Object.values(posts.val()).reverse() : [],
        gallery: gallery.val() ? Object.values(gallery.val()) : [],
        stores: stores.val() ? Object.values(stores.val()).filter(s => s.active === 1) : [],
        moneyLinks: moneyLinks.val() ? Object.values(moneyLinks.val()).filter(m => m.active === 1) : [],
        ads: ads.val() ? Object.values(ads.val()).filter(a => a.enabled === 1) : [],
        injections: injections.val() ? Object.values(injections.val()).filter(i => i.active === 1) : [],
        ebooks: ebooks.val() ? Object.values(ebooks.val()) : []
    };
}

// ==================== MAIN PAGE ====================
app.get('/', async (req, res) => {
    try {
        const data = await getAllData();
        const settings = data.settings;
        
        const headInjection = data.injections.find(i => i.location === 'head')?.code || '';
        const bodyStartInjection = data.injections.find(i => i.location === 'body_start')?.code || '';
        const bodyEndInjection = data.injections.find(i => i.location === 'body_end')?.code || '';
        const customCSS = data.injections.find(i => i.location === 'custom_css')?.code || '';
        
        const adsByLocation = {};
        data.ads.forEach(ad => adsByLocation[ad.location] = ad.code);

        const placeholderHTML = data.placeholders.map((p, i) => `
            <div class="hero-slide ${i === 0 ? 'active' : ''}" style="background-image: url('${p.filename}'); background-position: left center;">
                <div class="hero-overlay"></div>
                <div class="hero-content" style="text-align: left; padding-left: 10%;">
                    <h1>${p.title}</h1>
                    ${p.link ? `<a href="${p.link}" class="hero-btn">Explore</a>` : ''}
                </div>
            </div>
        `).join('');

        const techVideos = data.videos.filter(v => v.category === 'Tech').slice(0, 4).map(v => `
            <div class="video-card">
                <video class="video-player" src="${v.filename}" controls poster="${v.thumbnail}"></video>
                <div class="video-info"><h3>${v.title}</h3></div>
            </div>
        `).join('');

        const entertainmentVideos = data.videos.filter(v => v.category === 'Entertainment').slice(0, 2).map(v => `
            <div class="video-card small">
                <video class="video-player" src="${v.filename}" controls poster="${v.thumbnail}"></video>
                <div class="video-info"><h4>${v.title}</h4></div>
            </div>
        `).join('');

        const blogHTML = data.posts.slice(0, 3).map(p => `
            <div class="blog-card">
                <div class="blog-content">
                    <h3><a href="/post/${p.id}">${p.title}</a></h3>
                    <p>${p.created_date ? new Date(p.created_date).toLocaleDateString() : ''}</p>
                    <p>${(p.content || '').replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                </div>
            </div>
        `).join('');

        const ebooksByCategory = {};
        data.ebooks.forEach(book => {
            if (!ebooksByCategory[book.category]) ebooksByCategory[book.category] = [];
            ebooksByCategory[book.category].push(book);
        });

        const subjectCards = Object.keys(ebooksByCategory).map(cat => `
            <div class="subject-card">
                <h3>📚 ${cat}</h3>
                <p>${ebooksByCategory[cat].length} books</p>
                <a href="/library" class="signup-btn">🔓 SIGN UP TO READ FREE</a>
            </div>
        `).join('');

        res.send(`<!DOCTYPE html>
<html>
<head>
    <title>${settings.site_title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.google_analytics}');</script>
    ${headInjection}
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        :root { --primary: ${settings.primary_color}; --secondary: ${settings.secondary_color}; --bg: ${settings.bg_color}; --text: ${settings.text_color}; --card-bg: #1a1e2b; --border: #2d3748; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height:1.6; }
        a { color: var(--primary); text-decoration:none; }
        header { background: linear-gradient(135deg, var(--primary), var(--secondary)); color:white; padding:1rem 0; position:sticky; top:0; z-index:100; }
        .header-container { max-width:1400px; margin:0 auto; padding:0 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; }
        .logo { font-size:2.5rem; font-weight:800; color:white; text-shadow:2px 2px 4px rgba(0,0,0,0.3); }
        .nav-menu { display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
        .nav-menu a { color:white; padding:8px 15px; }
        .signup-btn-nav { background:#fbbf24; color:#1e293b !important; font-weight:bold; border-radius:50px; padding:10px 20px !important; }
        .hero-carousel { position:relative; height:450px; overflow:hidden; }
        .hero-slide { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; background-position:left center; opacity:0; transition:opacity 0.5s; display:flex; align-items:center; }
        .hero-slide.active { opacity:1; }
        .hero-overlay { position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); }
        .hero-content { position:relative; z-index:2; color:white; max-width:600px; padding-left:10%; }
        .hero-content h1 { font-size:3rem; margin-bottom:1rem; }
        .hero-btn { display:inline-block; padding:12px 30px; background:white; color:var(--primary); border-radius:50px; }
        .carousel-nav { position:absolute; top:50%; transform:translateY(-50%); width:100%; display:flex; justify-content:space-between; padding:0 20px; z-index:10; }
        .carousel-nav button { background:rgba(255,255,255,0.3); border:none; color:white; font-size:24px; padding:10px 15px; cursor:pointer; border-radius:50%; }
        .carousel-dots { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); display:flex; gap:10px; z-index:10; }
        .dot { width:12px; height:12px; background:rgba(255,255,255,0.5); border-radius:50%; cursor:pointer; }
        .dot.active { background:white; }
        .main-container { max-width:1400px; margin:0 auto; padding:40px 20px; display:grid; grid-template-columns:1fr 350px; gap:30px; }
        .section-title { font-size:2rem; margin:40px 0 20px; color:var(--primary); border-bottom:2px solid var(--primary); padding-bottom:10px; }
        .video-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:25px; margin:30px 0; }
        .video-card { background:var(--card-bg); border-radius:12px; overflow:hidden; border:1px solid var(--border); }
        .video-player { width:100%; height:180px; background:#000; }
        .video-info { padding:15px; }
        .video-info h3 { font-size:16px; color:white; }
        .subject-card { background:var(--card-bg); border-radius:12px; padding:25px; margin-bottom:20px; border:1px solid var(--border); }
        .subject-card h3 { color:var(--primary); font-size:1.3rem; }
        .signup-btn { display:block; text-align:center; padding:12px; background:var(--primary); color:white; border-radius:8px; font-weight:bold; margin-top:15px; }
        .blog-card { background:var(--card-bg); border-radius:8px; padding:20px; margin-bottom:20px; border:1px solid var(--border); }
        footer { background:#0a0c12; color:white; padding:60px 0 20px; margin-top:60px; }
        .footer-grid { max-width:1200px; margin:0 auto; padding:0 20px; display:grid; grid-template-columns:repeat(4,1fr); gap:40px; }
        .footer-col h3 { color:var(--primary); margin-bottom:15px; }
        .footer-col p { color:#a0aec0; line-height:1.8; }
        .footer-bottom { text-align:center; padding-top:20px; margin-top:20px; border-top:1px solid #2d3748; color:#a0aec0; }
        .whatsapp-btn { position:fixed; bottom:80px; right:20px; background:#25D366; color:white; width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; z-index:99; }
        .admin-floating-btn { position:fixed; bottom:20px; right:20px; background:var(--primary); color:white; padding:12px 24px; border-radius:50px; z-index:99; }
        @media (max-width:1000px) { .main-container { grid-template-columns:1fr; } }
        @media (max-width:768px) { .hero-content h1 { font-size:2rem; } }
        ${customCSS}
    </style>
</head>
<body>
    ${bodyStartInjection}
    ${adsByLocation['header'] ? `<div class="ad-header">${adsByLocation['header']}</div>` : ''}
    <header>
        <div class="header-container">
            <a href="/" class="logo">☁️ 3EESHER.CLOUD</a>
            <nav class="nav-menu">
                <a href="#videos">Videos</a>
                <a href="#library">Library</a>
                <a href="#money">Money</a>
                ${req.session.userId ? '<a href="/dashboard">Dashboard</a>' : '<a href="/library" class="signup-btn-nav">✨ SIGN UP FREE</a>'}
                <a href="/admin">🔐 Admin</a>
            </nav>
        </div>
    </header>
    <div class="hero-carousel">
        ${placeholderHTML}
        <div class="carousel-nav"><button class="carousel-prev">❮</button><button class="carousel-next">❯</button></div>
        <div class="carousel-dots">${data.placeholders.map((_,i)=>`<span class="dot ${i===0?'active':''}" data-index="${i}"></span>`).join('')}</div>
    </div>
    <div class="main-container">
        <div class="left-column">
            <div id="videos"><h2 class="section-title">🎥 Tech Tutorials</h2><div class="video-grid">${techVideos}</div>${entertainmentVideos?`<h2 class="section-title">🍿 Entertainment</h2><div>${entertainmentVideos}</div>`:''}</div>
            <div id="blog"><h2 class="section-title">📝 Latest Articles</h2>${blogHTML}</div>
        </div>
        <div class="right-column" id="library">
            <div style="background:linear-gradient(135deg,var(--primary),var(--secondary));padding:25px;border-radius:15px;margin-bottom:25px;text-align:center;">
                <h2 style="color:white;font-size:1.8rem;">📚 Free Library</h2>
                <p style="color:white;">Access 15+ free e-books</p>
                <a href="/library" style="display:inline-block;background:white;color:var(--primary);padding:12px 30px;border-radius:50px;font-weight:bold;margin-top:15px;">✨ SIGN UP FREE</a>
            </div>
            ${subjectCards}
        </div>
    </div>
    <footer>
        <div class="footer-grid">
            <div class="footer-col"><h3>About</h3><p>${settings.about_text}</p><p>📧 ${settings.contact_email}<br>📞 ${settings.contact_phone}</p></div>
            <div class="footer-col"><h3>Privacy</h3><p>${settings.privacy_text}</p></div>
            <div class="footer-col"><h3>Terms</h3><p>${settings.terms_text}</p></div>
            <div class="footer-col"><h3>Contact</h3><p>📧 ${settings.contact_email}<br>📞 ${settings.contact_phone}<br>💬 WhatsApp: ${settings.contact_phone}</p></div>
        </div>
        <div class="footer-bottom"><p>${settings.footer_text} | GA: ${settings.google_analytics}</p></div>
    </footer>
    ${bodyEndInjection}
    <a href="https://wa.me/${settings.contact_phone.replace('+','')}" class="whatsapp-btn" target="_blank">💬</a>
    ${req.session.userId ? '<a href="/admin" class="admin-floating-btn">⚙️ Admin</a>' : ''}
    <script>
        document.addEventListener('DOMContentLoaded',function(){
            const slides=document.querySelectorAll('.hero-slide'),dots=document.querySelectorAll('.dot'),prev=document.querySelector('.carousel-prev'),next=document.querySelector('.carousel-next');let current=0;
            function showSlide(i){slides.forEach(s=>s.classList.remove('active'));dots.forEach(d=>d.classList.remove('active'));slides[i].classList.add('active');dots[i].classList.add('active');current=i;}
            if(prev&&next){prev.addEventListener('click',()=>{current=(current-1+slides.length)%slides.length;showSlide(current);});
            next.addEventListener('click',()=>{current=(current+1)%slides.length;showSlide(current);});
            dots.forEach((dot,i)=>{dot.addEventListener('click',()=>showSlide(i));});
            setInterval(()=>{current=(current+1)%slides.length;showSlide(current);},5000);}
        });
    </script>
</body>
</html>`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading page');
    }
});

// ==================== ADMIN API ROUTES ====================
app.post('/admin/save-injection', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { location, code } = req.body;
    const snapshot = await injectionsRef.orderByChild('location').equalTo(location).once('value');
    if (snapshot.exists()) {
        const key = Object.keys(snapshot.val())[0];
        await injectionsRef.child(key).update({ code });
    } else {
        await injectionsRef.push({ name: location + ' injection', location, code, active: 1, created_date: new Date().toISOString() });
    }
    res.json({ success: true });
});

// ==================== LOGIN ====================
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>Admin Login</title></head><body style="font-family:Arial;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;justify-content:center;align-items:center;height:100vh;"><div style="background:white;padding:40px;border-radius:10px;width:350px;"><h2 style="text-align:center;">🔐 Admin Login</h2><form method="POST" action="/login"><input type="text" name="username" placeholder="Email" value="admin@3eesher.cloud" style="width:100%;padding:12px;margin:10px 0;"><input type="password" name="password" placeholder="Password" value="admin123" style="width:100%;padding:12px;margin:10px 0;"><button type="submit" style="width:100%;padding:14px;background:#2563eb;color:white;border:none;">Login</button></form></div></body></html>`);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const snapshot = await usersRef.orderByChild('email').equalTo(username).once('value');
    if (snapshot.exists()) {
        const userId = Object.keys(snapshot.val())[0];
        const user = snapshot.val()[userId];
        if (bcrypt.compareSync(password, user.password) && user.role === 'super_admin') {
            req.session.userId = userId;
            return res.redirect('/admin');
        }
    }
    res.send('Invalid credentials');
});

// ==================== ADMIN PANEL ====================
app.get('/admin', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const user = await usersRef.child(req.session.userId).once('value');
    if (!user.val() || user.val().role !== 'super_admin') return res.redirect('/');
    res.send(`<!DOCTYPE html><html><head><title>Admin Dashboard</title><style>body{background:#0f1117;color:#e2e8f0;padding:20px;font-family:Arial;}.container{max-width:1200px;margin:0 auto;}h1{color:#2563eb;}.tabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;background:#1a1e2b;padding:20px;border-radius:10px;}.tab-btn{padding:12px 24px;background:#2d3748;border:none;color:white;cursor:pointer;}.tab-content{display:none;background:#1a1e2b;padding:30px;border-radius:10px;}.active{display:block;}.form-group{margin-bottom:15px;}label{color:#a0aec0;}input,textarea{width:100%;padding:10px;background:#0f1117;border:1px solid #2d3748;color:white;}button{padding:10px 20px;background:#2563eb;color:white;border:none;cursor:pointer;margin:5px;}</style></head><body><div class="container"><h1>⚙️ Admin Dashboard</h1><div><a href="/">View Site</a> | <a href="/logout">Logout</a></div><div class="tabs"><button class="tab-btn" onclick="showTab('injections')">💉 Injections</button><button class="tab-btn" onclick="showTab('settings')">⚙️ Settings</button></div><div id="injections-tab" class="tab-content active"><h2>Code Injections</h2><div class="form-group"><label>Head</label><textarea id="inj-head" rows="5">${(await injectionsRef.orderByChild('location').equalTo('head').once('value')).val()?Object.values((await injectionsRef.orderByChild('location').equalTo('head').once('value')).val())[0].code:''}</textarea></div><div class="form-group"><label>Body Start</label><textarea id="inj-body_start" rows="5">${(await injectionsRef.orderByChild('location').equalTo('body_start').once('value')).val()?Object.values((await injectionsRef.orderByChild('location').equalTo('body_start').once('value')).val())[0].code:''}</textarea></div><div class="form-group"><label>Body End</label><textarea id="inj-body_end" rows="5">${(await injectionsRef.orderByChild('location').equalTo('body_end').once('value')).val()?Object.values((await injectionsRef.orderByChild('location').equalTo('body_end').once('value')).val())[0].code:''}</textarea></div><button onclick="saveInjections()">Save All Injections</button></div><div id="settings-tab" class="tab-content"><h2>Settings</h2><form method="POST" action="/admin/save-settings"><div class="form-group"><label>Site Name</label><input type="text" name="site_name" value="3eesher.cloud"></div><div class="form-group"><label>Contact Email</label><input type="email" name="contact_email" value="abdullahharuna216@gmail.com"></div><div class="form-group"><label>Contact Phone</label><input type="text" name="contact_phone" value="+2348080335353"></div><button type="submit">Save</button></form></div></div><script>function showTab(tab){document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));event.target.classList.add('active');document.getElementById(tab+'-tab').classList.add('active');}
function saveInjections(){const inj={head:document.getElementById('inj-head').value,body_start:document.getElementById('inj-body_start').value,body_end:document.getElementById('inj-body_end').value};for(let loc in inj){fetch('/admin/save-injection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:loc,code:inj[loc]})});}alert('Injections saved!');}</script></body></html>`);
});

app.post('/admin/save-settings', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    await settingsRef.set(req.body);
    res.redirect('/admin');
});

// ==================== LOGOUT ====================
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3EESHER.CLOUD IS LIVE!`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`🔑 Admin: http://localhost:${PORT}/admin`);
    console.log(`✅ Firebase fixed with storageBucket added!`);
});
