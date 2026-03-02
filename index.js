// ==================== COMPLETE 3EESHER.CLOUD - ENVIRONMENT VARIABLES VERSION ====================
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

// 🔐 SAFE: Firebase credentials from environment variable (NOT in code)
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  // Fix for newlines in private key
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
} catch (error) {
  console.error('❌ Failed to parse Firebase key from environment variable');
  console.error('Please set FIREBASE_SERVICE_ACCOUNT in Render environment variables');
  process.exit(1);
}

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
                <a href="/courses">Courses</a>
                <a href="/blog">Blog</a>
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
        .logo { font-size:2.2rem; font-weight:800; color:white; text-shadow:2px 2px 4px rgba(0,0,0,0.3); }
        .mobile-menu-btn { display:none; background:none; border:none; color:white; font-size:2rem; cursor:pointer;}
        .nav-menu { display:flex; gap:15px; align-items:center; flex-wrap:wrap; }
        .nav-menu a { color:white; padding:8px 15px; border-radius:5px; font-weight:500; transition:0.3s; }
        .nav-menu a:hover { background:rgba(255,255,255,0.2); }
        .signup-btn-nav { background:#fbbf24; color:#1e293b !important; font-weight:bold; border-radius:50px; padding:10px 20px !important; }
        
        /* Hero Section */
        .hero-section { position:relative; height:500px; background:url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600') center/cover; display:flex; align-items:center; }
        .hero-section::after { content:''; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); }
        .hero-content { position:relative; z-index:2; max-width:800px; margin:0 auto; text-align:center; color:white; padding:20px; }
        .hero-content h1 { font-size:3.5rem; margin-bottom:20px; }
        .hero-content p { font-size:1.2rem; margin-bottom:30px; }
        
        /* Layout */
        .main-container { max-width:1400px; margin:0 auto; padding:40px 20px; display:grid; grid-template-columns:1fr 350px; gap:30px; }
        .page-container { max-width:1200px; margin:40px auto; padding:30px; background:var(--card-bg); border-radius:15px; border:1px solid var(--border);}
        .section-title { font-size:2rem; border-bottom:2px solid var(--primary); padding-bottom:10px; margin-bottom:20px; }
        
        /* Video Grid */
        .video-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:30px; margin:30px 0; }
        .video-card { background:var(--card-bg); border-radius:12px; overflow:hidden; border:1px solid var(--border); transition:transform 0.3s; }
        .video-card:hover { transform:translateY(-5px); box-shadow:0 10px 20px rgba(0,0,0,0.3); }
        .video-player { width:100%; height:200px; background:#000; }
        .video-info { padding:15px; }
        
        /* Blog */
        .blog-grid { display:grid; gap:25px; }
        .blog-card { background:var(--card-bg); border-radius:12px; overflow:hidden; border:1px solid var(--border); display:flex; transition:0.3s; }
        .blog-card:hover { border-color:var(--primary); }
        .blog-card img { width:250px; height:200px; object-fit:cover; }
        .blog-content { padding:20px; flex:1; }
        .blog-meta { color:#9ca3af; margin:10px 0; }
        
        /* E-Book Grid */
        .ebook-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; margin:30px 0; }
        .ebook-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; transition:0.3s; }
        .ebook-card:hover { transform:translateY(-5px); border-color:var(--primary); }
        .ebook-card img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; }
        .ebook-title { font-size: 1.2rem; font-weight: bold; color: var(--primary); margin:10px 0; }
        .ebook-author { color: #9ca3af; font-size: 0.9rem; }
        .ebook-difficulty { display:inline-block; padding:4px 10px; background:var(--primary); color:white; border-radius:20px; font-size:0.8rem; margin:10px 0; }
        .download-btn { display: block; background: #10b981; color: white; padding: 12px; border-radius: 8px; margin-top: 15px; font-weight:bold; text-align:center; }
        .download-btn:hover { background: #059669; }
        
        /* Course Grid */
        .course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }
        .course-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; position:relative; }
        .course-badge { position:absolute; top:10px; right:10px; background:var(--primary); color:white; padding:5px 10px; border-radius:20px; font-size:0.8rem; }
        .course-progress { height:8px; background:#2d3748; border-radius:4px; margin:15px 0; overflow:hidden; }
        .course-progress-bar { height:100%; background:var(--primary); width:0%; }
        
        /* Forms */
        .auth-form { max-width:400px; margin:100px auto; background:var(--card-bg); padding:40px; border-radius:15px; text-align:center; border:1px solid var(--border); }
        .auth-form input { width:100%; padding:15px; margin:10px 0; background:var(--bg); border:1px solid var(--border); color:white; border-radius:8px; }
        .auth-form button { width:100%; padding:15px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; }
        
        /* Admin Panel */
        .admin-container { max-width:1400px; margin:0 auto; padding:20px; }
        .stats-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:20px; margin:30px 0; }
        .stat-card { background:var(--card-bg); padding:25px; border-radius:10px; text-align:center; border:1px solid var(--border); }
        .stat-number { font-size:2.5rem; color:var(--primary); font-weight:bold; }
        .admin-tabs { display:flex; gap:10px; flex-wrap:wrap; margin:30px 0; background:var(--card-bg); padding:20px; border-radius:10px; }
        .admin-tab-btn { padding:12px 24px; background:#2d3748; border:none; color:white; cursor:pointer; border-radius:5px; font-weight:500; }
        .admin-tab-btn.active { background:var(--primary); }
        .admin-section { display:none; background:var(--card-bg); padding:30px; border-radius:10px; border:1px solid var(--border); }
        .admin-section.active { display:block; }
        .data-table { width:100%; border-collapse:collapse; margin-top:20px; }
        .data-table th { background:#2d3748; padding:12px; text-align:left; color:white; }
        .data-table td { padding:12px; border-bottom:1px solid var(--border); }
        
        /* Injection Grid */
        .injection-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(400px,1fr)); gap:20px; }
        .injection-card { background:var(--bg); padding:20px; border-radius:10px; border:1px solid var(--border); }
        .injection-card textarea { width:100%; height:150px; background:var(--card-bg); color:white; border:1px solid var(--border); padding:10px; border-radius:5px; font-family:monospace; }
        
        /* Ad Containers */
        .ad-container { text-align:center; margin:20px 0; padding:15px; background:var(--card-bg); border:1px dashed var(--border); position:relative; }
        .ad-container::before { content:'Advertisement'; position:absolute; top:5px; right:10px; font-size:10px; color:#9ca3af; }
        
        /* Responsive */
        @media (max-width:1000px) { .main-container { grid-template-columns:1fr; } }
        @media (max-width:768px) {
            .mobile-menu-btn { display:block; }
            .nav-menu { display:none; flex-direction:column; position:absolute; top:100%; left:0; width:100%; background:var(--primary); padding:20px; z-index:1000; }
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
            console.log('Initializing Firebase with complete data...');
            
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
                about_text: '3eesher.cloud is a comprehensive online platform founded in 2024 with a mission to provide free, high-quality educational resources to learners worldwide. Our platform combines entertainment and education through carefully curated videos, insightful blog posts, and an extensive library of free e-books.',
                privacy_text: 'At 3eesher.cloud, your privacy is our priority. We collect only necessary information to provide our services. We never sell your personal data to third parties.',
                terms_text: 'Welcome to 3eesher.cloud. By accessing or using our platform, you agree to be bound by these Terms of Service.',
                bot_enabled: 'true'
            };
            await settingsRef.set(defaultSettings);
            
            // Default ads - 8 placements
            const defaultAds = [
                { name: 'Header Banner', location: 'header', code: '<!-- Ad Space -->', enabled: 1, clicks: 0, created_date: new Date().toISOString() },
                { name: 'Sidebar Top', location: 'sidebar_top', code: '<!-- Ad Space -->', enabled: 1, clicks: 0, created_date: new Date().toISOString() },
                { name: 'Sidebar Bottom', location: 'sidebar_bottom', code: '<!-- Ad Space -->', enabled: 1, clicks: 0, created_date: new Date().toISOString() },
                { name: 'Content Top', location: 'content_top', code: '<!-- Ad Space -->', enabled: 1, clicks: 0, created_date: new Date().toISOString() },
                { name: 'Content Middle', location: 'content_middle', code: '<!-- Ad Space -->', enabled: 1, clicks: 0, created_date: new Date().toISOString() },
                { name: 'Content Bottom', location: 'content_bottom', code: '<!-- Ad Space -->', enabled: 1, clicks: 0, created_date: new Date().toISOString() },
                { name: 'Footer Banner', location: 'footer', code: '<!-- Ad Space -->', enabled: 1, clicks: 0, created_date: new Date().toISOString() },
                { name: 'Popup Ad', location: 'popup', code: '<!-- Popup Ad -->', enabled: 0, clicks: 0, created_date: new Date().toISOString() }
            ];
            
            for (let ad of defaultAds) {
                await adsRef.push(ad);
            }
            
            // Default injections - 5 points
            const defaultInjections = [
                { name: 'Head Scripts', location: 'head', code: '<!-- Head Injections -->', active: 1, created_date: new Date().toISOString() },
                { name: 'Body Start', location: 'body_start', code: '<!-- Body Start -->', active: 1, created_date: new Date().toISOString() },
                { name: 'Body End', location: 'body_end', code: '<!-- Body End -->', active: 1, created_date: new Date().toISOString() },
                { name: 'Custom CSS', location: 'custom_css', code: '/* Custom CSS */', active: 1, created_date: new Date().toISOString() },
                { name: 'Custom JS', location: 'custom_js', code: '// Custom JavaScript', active: 1, created_date: new Date().toISOString() }
            ];
            
            for (let inj of defaultInjections) {
                await injectionsRef.push(inj);
            }
            
            // Default videos
            const videos = [
                { title: 'Big Buck Bunny - Full Cartoon', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', thumbnail: 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', description: 'Watch the classic 10-minute cartoon', category: 'Entertainment', views: 0, created_date: new Date().toISOString() },
                { title: 'Elephant Dream - Animated Short', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', description: 'Beautiful 15-minute animation', category: 'Entertainment', views: 0, created_date: new Date().toISOString() },
                { title: 'Sintel - Fantasy Animation', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', thumbnail: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', description: 'Epic 14-minute fantasy film', category: 'Entertainment', views: 0, created_date: new Date().toISOString() },
                { title: 'Tears of Steel - Sci-Fi', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', description: 'Action-packed 12-minute short', category: 'Entertainment', views: 0, created_date: new Date().toISOString() },
                { title: 'How to Host Website on GitHub', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', description: 'Learn to host your site for free', category: 'Tech', views: 0, created_date: new Date().toISOString() },
                { title: 'GitHub Pages Custom Domain', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', description: 'Connect your own domain to GitHub Pages', category: 'Tech', views: 0, created_date: new Date().toISOString() },
                { title: 'Deploy React to GitHub Pages', filename: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', thumbnail: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', description: 'Step-by-step React deployment guide', category: 'Tech', views: 0, created_date: new Date().toISOString() }
            ];
            
            for (let video of videos) {
                await videosRef.push(video);
            }
            
            // Default e-books - 15 complete books
            const ebooks = [
                { title: 'HTML & CSS Mastery', author: 'John Smith', description: 'Complete guide to modern web development with HTML5 and CSS3. Includes responsive design, flexbox, grid, and animations.', cover_image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', category: 'Web Development', pages: 320, difficulty: 'Beginner', downloads: 0, created_date: new Date().toISOString() },
                { title: 'JavaScript from Zero to Hero', author: 'Sarah Johnson', description: 'Master JavaScript with 100+ exercises. Learn DOM manipulation, async programming, ES6+, and build real projects.', cover_image: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', category: 'Web Development', pages: 450, difficulty: 'Intermediate', downloads: 0, created_date: new Date().toISOString() },
                { title: 'React.js Complete Guide', author: 'Michael Chen', description: 'Build modern web apps with React. Hooks, context, routing, state management, and real-world projects.', cover_image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', category: 'Web Development', pages: 380, difficulty: 'Intermediate', downloads: 0, created_date: new Date().toISOString() },
                { title: 'Node.js Backend Development', author: 'David Kim', description: 'Create REST APIs, authentication, databases, and deploy production-ready applications.', cover_image: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', category: 'Backend', pages: 420, difficulty: 'Advanced', downloads: 0, created_date: new Date().toISOString() },
                { title: 'Python for Beginners', author: 'Lisa Brown', description: 'Learn Python from scratch. Covers variables, loops, functions, OOP, and real projects.', cover_image: 'https://images.unsplash.com/photo-1526379095098-400a3a5f7b6d?w=400', category: 'Programming', pages: 350, difficulty: 'Beginner', downloads: 0, created_date: new Date().toISOString() },
                { title: 'SQL Database Design', author: 'Robert Taylor', description: 'Master database design, normalization, complex queries, and optimization.', cover_image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400', category: 'Database', pages: 310, difficulty: 'Intermediate', downloads: 0, created_date: new Date().toISOString() },
                { title: 'MongoDB - The Complete Guide', author: 'Emma Wilson', description: 'Learn NoSQL databases with MongoDB. Schema design, aggregation, indexing.', cover_image: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', category: 'Database', pages: 350, difficulty: 'Intermediate', downloads: 0, created_date: new Date().toISOString() },
                { title: 'ChatGPT Prompt Engineering', author: 'Priya Patel', description: '200+ proven prompts for content creation, coding, business, and learning.', cover_image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', category: 'AI', pages: 280, difficulty: 'Beginner', downloads: 0, created_date: new Date().toISOString() },
                { title: 'Machine Learning Basics', author: 'Alex Wong', description: 'Introduction to ML with Python. Cover scikit-learn, TensorFlow basics.', cover_image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400', category: 'AI', pages: 390, difficulty: 'Intermediate', downloads: 0, created_date: new Date().toISOString() },
                { title: 'Affiliate Marketing Secrets', author: 'Chris Martin', description: 'How to earn $500-$5000/month with affiliate links. Find profitable niches.', cover_image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', category: 'Money', pages: 240, difficulty: 'Beginner', downloads: 0, created_date: new Date().toISOString() },
                { title: 'Freelance Success Guide', author: 'Rachel Green', description: 'Find clients, set rates, create proposals, and build a 6-figure freelance business.', cover_image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', category: 'Money', pages: 280, difficulty: 'Intermediate', downloads: 0, created_date: new Date().toISOString() },
                { title: 'Print on Demand Mastery', author: 'James Lee', description: 'Create and sell custom products with zero inventory.', cover_image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', category: 'Money', pages: 220, difficulty: 'Beginner', downloads: 0, created_date: new Date().toISOString() },
                { title: 'SEO That Works in 2026', author: 'Maria Garcia', description: 'Rank #1 on Google with modern SEO strategies.', cover_image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', category: 'Marketing', pages: 300, difficulty: 'Intermediate', downloads: 0, created_date: new Date().toISOString() },
                { title: 'Social Media Growth Hacks', author: 'John Doe', description: 'Grow from 0 to 100K followers on Instagram, TikTok, YouTube.', cover_image: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', category: 'Marketing', pages: 260, difficulty: 'Beginner', downloads: 0, created_date: new Date().toISOString() },
                { title: 'Email Marketing Playbook', author: 'Jane Smith', description: 'Build email lists, write high-converting emails, automate campaigns.', cover_image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', category: 'Marketing', pages: 240, difficulty: 'Beginner', downloads: 0, created_date: new Date().toISOString() }
            ];
            
            for (let book of ebooks) {
                await ebooksRef.push(book);
            }
            
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
            
            console.log('✅ Firebase initialized with complete data');
        }
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
}
initializeFirebase();

// ==================== AUTO-BLOGGER ====================
const parser = new Parser();
async function runAutoBlogger() {
    try {
        const settings = await settingsRef.child('bot_enabled').once('value');
        if (settings.val() === 'false') return;
        
        const feed = await parser.parseURL('https://hnrss.org/frontpage?count=2');
        for (const item of feed.items.slice(0, 2)) {
            const exists = await postsRef.orderByChild('title').equalTo(item.title).once('value');
            if (!exists.exists()) {
                await postsRef.push({
                    title: item.title,
                    content: `<h1>${item.title}</h1><p>${item.contentSnippet || 'Read full article.'}</p><a href="${item.link}" target="_blank">Source Link</a><img src="https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800" style="width:100%; margin-top:20px;">`,
                    image: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800',
                    source: item.link,
                    category: 'Technology',
                    views: 0,
                    likes: 0,
                    created_date: new Date().toISOString()
                });
            }
        }
        console.log('🤖 Auto-blogger completed');
    } catch (error) {
        console.error('Error in auto-blogger:', error);
    }
}
cron.schedule('0 9,19 * * *', runAutoBlogger);
setTimeout(runAutoBlogger, 30000);

// ==================== UPLOAD SETUP ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 1000 * 1024 * 1024 } }); // 1GB limit

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

// ==================== GET ALL DATA ====================
async function getAllData() {
    try {
        const [settings, videos, posts, placeholders, gallery, stores, moneyLinks, ads, injections, ebooks] = await Promise.all([
            settingsRef.once('value').catch(() => ({ val: () => ({}) })),
            videosRef.once('value').catch(() => ({ val: () => ({}) })),
            postsRef.orderByChild('created_date').limitToLast(6).once('value').catch(() => ({ val: () => ({}) })),
            placeholdersRef.once('value').catch(() => ({ val: () => ({}) })),
            galleryRef.once('value').catch(() => ({ val: () => ({}) })),
            storesRef.once('value').catch(() => ({ val: () => ({}) })),
            moneyLinksRef.orderByChild('display_order').once('value').catch(() => ({ val: () => ({}) })),
            adsRef.once('value').catch(() => ({ val: () => ({}) })),
            injectionsRef.once('value').catch(() => ({ val: () => ({}) })),
            ebooksRef.once('value').catch(() => ({ val: () => ({}) }))
        ]);
        
        return {
            settings: settings.val() || {},
            videos: videos.val() ? Object.entries(videos.val()).map(([id, val]) => ({...val, id})) : [],
            posts: posts.val() ? Object.entries(posts.val()).map(([id, val]) => ({...val, id})).reverse() : [],
            placeholders: placeholders.val() ? Object.entries(placeholders.val()).map(([id, val]) => ({...val, id})).sort((a,b) => (a.display_order||0)-(b.display_order||0)) : [],
            gallery: gallery.val() ? Object.entries(gallery.val()).map(([id, val]) => ({...val, id})) : [],
            stores: stores.val() ? Object.entries(stores.val()).map(([id, val]) => ({...val, id})).filter(s => s.active) : [],
            moneyLinks: moneyLinks.val() ? Object.entries(moneyLinks.val()).map(([id, val]) => ({...val, id})).filter(m => m.active) : [],
            ads: ads.val() ? Object.entries(ads.val()).map(([id, val]) => ({...val, id})).filter(a => a.enabled) : [],
            injections: injections.val() ? Object.entries(injections.val()).map(([id, val]) => ({...val, id})).filter(i => i.active) : [],
            ebooks: ebooks.val() ? Object.entries(ebooks.val()).map(([id, val]) => ({...val, id})) : []
        };
    } catch (error) {
        console.error('Error in getAllData:', error);
        return { settings: {}, videos: [], posts: [], placeholders: [], gallery: [], stores: [], moneyLinks: [], ads: [], injections: [], ebooks: [] };
    }
}

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

        // Video HTML
        const videoHTML = (data.videos || []).slice(0, 10).map(v => `
            <div class="video-card">
                <video class="video-player" src="${v.filename}" controls poster="${v.thumbnail}"></video>
                <div class="video-info">
                    <h3>${v.title}</h3>
                    <p>${v.views || 0} views</p>
                </div>
            </div>
        `).join('');

        // Blog HTML
        const blogHTML = (data.posts || []).slice(0, 3).map(p => `
            <article class="blog-card">
                <img src="${p.image || 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400'}" alt="${p.title}">
                <div class="blog-content">
                    <h3><a href="/post/${p.id}">${p.title}</a></h3>
                    <p class="blog-meta">${new Date(p.created_date).toLocaleDateString()} • ${p.views || 0} views</p>
                    <p>${(p.content || '').replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                    <a href="/post/${p.id}" style="color:var(--primary); font-weight:bold;">Read More →</a>
                </div>
            </article>
        `).join('');

        // E-Book HTML
        const bookHTML = (data.ebooks || []).slice(0, 6).map(book => `
            <div class="ebook-card">
                <img src="${book.cover_image || 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400'}" alt="${book.title}">
                <div class="ebook-title">${book.title}</div>
                <div class="ebook-author">${book.author || 'Unknown'}</div>
                <span class="ebook-difficulty">${book.difficulty || 'Beginner'}</span>
                <a href="/ebook/${book.id}" class="download-btn">📖 Read Now</a>
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
                <h2 class="section-title">🎥 Featured Videos</h2>
                ${renderAd(adsLoc['content_top'])}
                <div class="video-grid">${videoHTML || '<p>No videos yet</p>'}</div>
                ${renderAd(adsLoc['content_middle'])}
            </section>

            <section id="blog">
                <h2 class="section-title">📝 Latest Articles</h2>
                ${renderAd(adsLoc['content_bottom'])}
                <div class="blog-grid">${blogHTML || '<p>No posts yet</p>'}</div>
            </section>
        </div>

        <div class="right-column">
            <div style="background:linear-gradient(135deg,var(--primary),var(--secondary));padding:30px;border-radius:15px;text-align:center;margin-bottom:30px;">
                <h2 style="color:white; font-size:1.8rem;">📚 Free Library</h2>
                <p style="color:white; margin:10px 0;">Access 15+ premium e-books</p>
                ${!req.session.userId ? 
                    `<a href="/signup" style="display:block;background:white;color:var(--primary);padding:15px;border-radius:50px;font-weight:bold;">Sign Up to Read</a>` : 
                    `<a href="/library" style="display:block;background:#10b981;color:white;padding:15px;border-radius:50px;font-weight:bold;">Browse Library</a>`
                }
            </div>
            
            ${renderAd(adsLoc['sidebar_top'])}
            
            <div style="background:var(--card-bg); padding:20px; border-radius:10px; margin:20px 0;">
                <h3 style="color:var(--primary); margin-bottom:15px;">📊 Trending Now</h3>
                <p>Coming soon...</p>
            </div>
            
            ${renderAd(adsLoc['sidebar_bottom'])}
        </div>
    </div>

    <div class="main-container" style="padding-top:0;">
        <div class="left-column">
            <h2 class="section-title">📚 Popular E-Books</h2>
            <div class="ebook-grid">${bookHTML}</div>
            <div style="text-align:center; margin:30px 0;">
                <a href="/library" style="display:inline-block; background:var(--primary); color:white; padding:12px 30px; border-radius:50px; font-weight:bold;">View All Books →</a>
            </div>
        </div>
        <div class="right-column"></div>
    </div>

    ${renderAd(adsLoc['footer'])}
    
    <footer style="background:#0a0c12; padding:60px 20px 20px; margin-top:50px; text-align:center; border-top:1px solid #2d3748;">
        <div style="max-width:1200px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:40px; text-align:left; margin-bottom:40px;">
            <div>
                <h3 style="color:var(--primary); margin-bottom:15px;">About 3eesher.cloud</h3>
                <p style="color:#a0aec0;">${settings.about_text?.substring(0, 150)}...</p>
            </div>
            <div>
                <h3 style="color:var(--primary); margin-bottom:15px;">Privacy Policy</h3>
                <p style="color:#a0aec0;">${settings.privacy_text?.substring(0, 150)}...</p>
            </div>
            <div>
                <h3 style="color:var(--primary); margin-bottom:15px;">Terms of Service</h3>
                <p style="color:#a0aec0;">${settings.terms_text?.substring(0, 150)}...</p>
            </div>
            <div>
                <h3 style="color:var(--primary); margin-bottom:15px;">Contact</h3>
                <p style="color:#a0aec0;">📧 ${settings.contact_email}</p>
                <p style="color:#a0aec0;">📞 ${settings.contact_phone}</p>
                <p style="color:#a0aec0;">💬 WhatsApp: ${settings.contact_phone}</p>
            </div>
        </div>
        <p style="color:#a0aec0;">${settings.footer_text} | Google Analytics: ${settings.google_analytics}</p>
    </footer>

    ${bodyEndInjection}
    
    <a href="https://wa.me/${settings.contact_phone.replace('+','')}" style="position:fixed;bottom:20px;right:20px;background:#25D366;color:white;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;z-index:99;box-shadow:0 4px 10px rgba(0,0,0,0.3);" target="_blank">💬</a>
    
    <script>
        // Mobile menu toggle
        document.querySelector('.mobile-menu-btn')?.addEventListener('click', function(){
            document.querySelector('.nav-menu').classList.toggle('active');
        });
        
        ${customJS}
    </script>
</body>
</html>`);
    } catch (error) {
        console.error('Error in main page:', error);
        res.status(500).send('Error loading page');
    }
});

// ==================== USER AUTHENTICATION ====================
app.get('/signup', async (req, res) => {
    const data = await getAllData();
    res.send(`<!DOCTYPE html>
<html><head><title>Sign Up</title>${getStyles(data.settings, '')}</head><body>
    ${getHeader(data.settings, req.session.userId, req.session.userRole)}
    <div class="auth-form">
        <h2>Create Free Account</h2>
        <p style="color:#9ca3af; margin-bottom:20px;">Unlock the learning library instantly</p>
        <form method="POST" action="/signup">
            <input type="text" name="name" placeholder="Full Name" required>
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Sign Up</button>
        </form>
        <p style="margin-top:20px;">Already have an account? <a href="/login">Login</a></p>
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
        <p style="margin-top:20px;">Don't have an account? <a href="/signup">Sign up</a></p>
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
    const settings = data.settings;
    
    const booksHTML = (data.ebooks || []).map(book => `
        <div class="ebook-card">
            <img src="${book.cover_image || 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400'}" alt="${book.title}">
            <div class="ebook-title">${book.title}</div>
            <div class="ebook-author">By ${book.author || 'Unknown'}</div>
            <span class="ebook-difficulty">${book.difficulty || 'Beginner'}</span>
            <p style="color:#9ca3af; font-size:0.9rem; margin:10px 0;">${(book.description || '').substring(0, 100)}...</p>
            <a href="/ebook/${book.id}" class="download-btn">📖 Read Now</a>
        </div>
    `).join('') || '<p style="grid-column:1/-1; text-align:center;">No books available</p>';

    res.send(`<!DOCTYPE html>
<html><head>
    <title>Library - ${settings.site_name}</title>
    ${getStyles(settings, '')}
</head><body>
    ${getHeader(settings, req.session.userId, req.session.userRole)}
    <div class="page-container">
        <h1 style="color:var(--primary); font-size:2.5rem; margin-bottom:10px;">📚 Free Learning Library</h1>
        <p style="color:#9ca3af; margin-bottom:30px;">Access all 15+ premium e-books for free. Start learning today!</p>
        <div class="ebook-grid">
            ${booksHTML}
        </div>
    </div>
</body></html>`);
});

// ==================== EBOOK DETAIL PAGE ====================
app.get('/ebook/:id', async (req, res) => {
    if (!req.session.userId) return res.redirect('/signup');
    
    const bookId = req.params.id;
    const bookSnap = await ebooksRef.child(bookId).once('value');
    const book = bookSnap.val();
    if (!book) return res.redirect('/library');
    
    // Increment download count
    await ebooksRef.child(bookId).update({ downloads: (book.downloads || 0) + 1 });
    
    const data = await getAllData();
    const settings = data.settings;
    
    res.send(`<!DOCTYPE html>
<html><head>
    <title>${book.title} - Library</title>
    ${getStyles(settings, '')}
    <style>
        .book-container { max-width:800px; margin:40px auto; background:var(--card-bg); border-radius:15px; padding:40px; border:1px solid var(--border); }
        .book-cover { width:100%; max-height:400px; object-fit:contain; border-radius:10px; margin-bottom:30px; }
        .book-meta { display:flex; gap:20px; margin:20px 0; color:#9ca3af; }
        .book-content { line-height:1.8; margin:30px 0; }
        .chapter-list { background:var(--bg); padding:20px; border-radius:10px; margin:20px 0; }
        .chapter-item { padding:10px; border-bottom:1px solid var(--border); }
        .chapter-item:last-child { border-bottom:none; }
    </style>
</head><body>
    ${getHeader(settings, req.session.userId, req.session.userRole)}
    <div class="book-container">
        <h1 style="color:var(--primary); font-size:2.2rem;">${book.title}</h1>
        <p style="color:#9ca3af; font-size:1.2rem;">By ${book.author || 'Unknown Author'}</p>
        
        <div class="book-meta">
            <span>📄 ${book.pages || 250} pages</span>
            <span>🏷️ ${book.category || 'General'}</span>
            <span>📊 ${book.difficulty || 'Beginner'}</span>
        </div>
        
        <img src="${book.cover_image || 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400'}" alt="${book.title}" class="book-cover">
        
        <div class="book-content">
            <h3 style="color:var(--primary);">About this book:</h3>
            <p>${book.description || 'No description available.'}</p>
            
            <h3 style="color:var(--primary); margin-top:30px;">What you'll learn:</h3>
            <ul style="margin-left:20px; line-height:2;">
                <li>Fundamental concepts and best practices</li>
                <li>Hands-on projects and exercises</li>
                <li>Real-world applications and case studies</li>
                <li>Troubleshooting and debugging techniques</li>
            </ul>
            
            <div class="chapter-list">
                <h4 style="color:var(--primary); margin-bottom:15px;">📑 Table of Contents</h4>
                <div class="chapter-item">Chapter 1: Introduction to ${book.category}</div>
                <div class="chapter-item">Chapter 2: Core Concepts</div>
                <div class="chapter-item">Chapter 3: Practical Examples</div>
                <div class="chapter-item">Chapter 4: Advanced Techniques</div>
                <div class="chapter-item">Chapter 5: Real-world Projects</div>
            </div>
        </div>
        
        <div style="text-align:center; margin:40px 0;">
            <a href="#" class="download-btn" style="display:inline-block; padding:15px 40px; font-size:1.2rem;" onclick="alert('PDF download would start here. In production, this would be a link to the actual PDF.')">📥 Download PDF</a>
        </div>
        
        <a href="/library" style="display:block; text-align:center; color:var(--primary); margin-top:20px;">← Back to Library</a>
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
    <div class="page-container" style="max-width:800px; text-align:center; padding:50px;">
        <div style="width:100px; height:100px; background:var(--primary); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:40px; margin:0 auto 20px;">👤</div>
        <h1>Welcome, ${user.full_name}!</h1>
        <p style="color:#9ca3af; margin-bottom:30px;">Email: ${user.email} | Member since: ${new Date(user.created_date).toLocaleDateString()}</p>
        
        <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:20px; margin:40px 0;">
            <a href="/library" style="background:var(--primary); color:white; padding:20px; border-radius:10px; text-decoration:none;">
                <div style="font-size:2rem; margin-bottom:10px;">📚</div>
                <div style="font-weight:bold;">Go to Library</div>
            </a>
            <a href="/profile" style="background:var(--card-bg); color:white; padding:20px; border-radius:10px; text-decoration:none; border:1px solid var(--border);">
                <div style="font-size:2rem; margin-bottom:10px;">👤</div>
                <div style="font-weight:bold;">Edit Profile</div>
            </a>
        </div>
        
        ${user.role === 'super_admin' ? `
            <div style="margin-top:30px;">
                <a href="/admin" style="background:#dc2626; color:white; padding:15px 30px; border-radius:5px; display:inline-block; font-weight:bold;">⚙️ Super Admin Panel</a>
            </div>
        ` : ''}
    </div>
</body></html>`);
});

// ==================== POST PAGE ====================
app.get('/post/:id', async (req, res) => {
    const data = await getAllData();
    const post = (data.posts || []).find(p => p.id === req.params.id);
    if(!post) return res.status(404).send('Post not found');
    
    // Update views
    await postsRef.child(post.id).update({ views: (post.views || 0) + 1 });

    res.send(`<!DOCTYPE html>
<html><head><title>${post.title}</title>${getStyles(data.settings, '')}
<style>.article-content img {max-width:100%; height:auto; border-radius:10px; margin:20px 0;} .article-content p {font-size:1.1rem; line-height:1.8; margin-bottom:20px;}</style></head><body>
${getHeader(data.settings, req.session.userId, req.session.userRole)}
<div class="page-container" style="max-width:800px;">
    <h1 style="font-size:2.5rem; margin-bottom:15px;">${post.title}</h1>
    <p style="color:#9ca3af; margin-bottom:30px;">Published on ${new Date(post.created_date).toLocaleDateString()} • ${post.views + 1} views</p>
    ${post.image ? `<img src="${post.image}" style="width:100%; max-height:400px; object-fit:cover; border-radius:10px; margin-bottom:30px;">` : ''}
    <div class="article-content">${post.content}</div>
    <a href="/" style="display:inline-block; margin-top:40px; background:var(--border); padding:10px 20px; border-radius:5px; color:white;">← Back to Home</a>
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
        await injectionsRef.push({ name: location, location, code, active: 1, created_date: new Date().toISOString() });
    }
    res.json({ success: true });
});

app.post('/admin/toggle-ad/:id', async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const ad = await adsRef.child(req.params.id).once('value');
    if (ad.exists()) {
        await adsRef.child(req.params.id).update({ enabled: ad.val().enabled ? 0 : 1 });
    }
    res.json({ success: true });
});

app.post('/admin/update-ad/:id', async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    await adsRef.child(req.params.id).update({ code: req.body.code });
    res.json({ success: true });
});

app.post('/admin/upload-video', upload.fields([{ name: 'video' }, { name: 'thumbnail' }]), async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') return res.redirect('/login');
    
    const video = req.files?.['video']?.[0];
    const thumb = req.files?.['thumbnail']?.[0];
    
    if (video) {
        await videosRef.push({
            title: req.body.title,
            filename: '/uploads/' + video.filename,
            thumbnail: thumb ? ('/uploads/' + thumb.filename) : 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400',
            description: req.body.description || '',
            category: 'User Upload',
            views: 0,
            created_date: new Date().toISOString()
        });
    }
    res.redirect('/admin');
});

app.post('/admin/delete/:ref/:id', async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const allowedRefs = ['videos', 'posts', 'ebooks'];
    if (allowedRefs.includes(req.params.ref)) {
        await db.ref(req.params.ref).child(req.params.id).remove();
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid reference' });
    }
});

app.post('/admin/save-settings', async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') return res.redirect('/login');
    await settingsRef.update(req.body);
    res.redirect('/admin');
});

// ==================== ADMIN PANEL ====================
app.get('/admin', async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') return res.redirect('/login');
    
    const data = await getAllData();
    
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Super Admin Panel</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${getStyles(data.settings, '')}
    <style>
        .injection-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(400px,1fr)); gap:20px; margin:20px 0; }
        .injection-card { background:var(--bg); padding:20px; border-radius:10px; border:1px solid var(--border); }
        .injection-card textarea { width:100%; height:150px; background:var(--card-bg); color:white; border:1px solid var(--border); padding:10px; border-radius:5px; font-family:monospace; margin:10px 0; }
        .upload-form { max-width:600px; margin-bottom:40px; }
        .form-group { margin-bottom:20px; }
        .form-group label { display:block; margin-bottom:5px; color:#a0aec0; }
        .form-group input, .form-group textarea { width:100%; padding:10px; background:var(--bg); border:1px solid var(--border); color:white; border-radius:5px; }
        .form-group input[type="file"] { padding:10px; }
        button { padding:12px 24px; background:var(--primary); color:white; border:none; border-radius:5px; cursor:pointer; margin:5px; }
        .btn-danger { background:#dc2626; }
        .data-table { width:100%; border-collapse:collapse; margin-top:20px; }
        .data-table th { background:#2d3748; padding:12px; text-align:left; color:white; }
        .data-table td { padding:12px; border-bottom:1px solid var(--border); }
    </style>
</head>
<body>
    ${getHeader(data.settings, req.session.userId, req.session.userRole)}
    
    <div class="admin-container">
        <h1>⚙️ Super Admin Dashboard</h1>
        
        <!-- Stats Overview -->
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-number">${data.videos.length}</div><div>Videos</div></div>
            <div class="stat-card"><div class="stat-number">${data.posts.length}</div><div>Blog Posts</div></div>
            <div class="stat-card"><div class="stat-number">${data.ebooks.length}</div><div>E-Books</div></div>
            <div class="stat-card"><div class="stat-number">${data.ads.length}</div><div>Ad Placements</div></div>
        </div>
        
        <!-- Admin Tabs -->
        <div class="admin-tabs">
            <button class="admin-tab-btn active" onclick="showTab('videos')">🎥 Videos</button>
            <button class="admin-tab-btn" onclick="showTab('blog')">📝 Blog</button>
            <button class="admin-tab-btn" onclick="showTab('library')">📚 E-Books</button>
            <button class="admin-tab-btn" onclick="showTab('ads')">📺 Ads</button>
            <button class="admin-tab-btn" onclick="showTab('injections')">💉 Injections</button>
            <button class="admin-tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
        </div>
        
        <!-- VIDEOS TAB -->
        <div id="videos-section" class="admin-section active">
            <h2>Upload New Video</h2>
            <form action="/admin/upload-video" method="POST" enctype="multipart/form-data" class="upload-form">
                <div class="form-group"><label>Title</label><input type="text" name="title" required></div>
                <div class="form-group"><label>Description</label><textarea name="description"></textarea></div>
                <div class="form-group"><label>Video File (MP4, up to 1GB)</label><input type="file" name="video" accept="video/*" capture="camcorder" required></div>
                <div class="form-group"><label>Thumbnail (optional)</label><input type="file" name="thumbnail" accept="image/*"></div>
                <button type="submit">📤 Upload Video</button>
            </form>
            
            <h3 style="margin-top:40px;">Current Videos</h3>
            <table class="data-table">
                <tr><th>Title</th><th>Views</th><th>Actions</th></tr>
                ${data.videos.map(v => `<tr><td>${v.title}</td><td>${v.views||0}</td><td><button class="btn-danger" onclick="deleteItem('videos', '${v.id}')">Delete</button></td></tr>`).join('')}
            </table>
        </div>
        
        <!-- BLOG TAB -->
        <div id="blog-section" class="admin-section">
            <h2>Create Manual Blog Post</h2>
            <form action="/admin/create-post" method="POST" enctype="multipart/form-data" class="upload-form">
                <div class="form-group"><label>Title</label><input type="text" name="title" required></div>
                <div class="form-group"><label>Content (HTML allowed)</label><textarea name="content" rows="10"></textarea></div>
                <div class="form-group"><label>Featured Image</label><input type="file" name="image" accept="image/*"></div>
                <button type="submit">📝 Publish Post</button>
            </form>
            
            <h3 style="margin-top:40px;">Recent Posts</h3>
            <table class="data-table">
                <tr><th>Title</th><th>Views</th><th>Date</th><th>Actions</th></tr>
                ${data.posts.map(p => `<tr><td>${p.title}</td><td>${p.views||0}</td><td>${new Date(p.created_date).toLocaleDateString()}</td><td><button class="btn-danger" onclick="deleteItem('posts', '${p.id}')">Delete</button></td></tr>`).join('')}
            </table>
        </div>
        
        <!-- E-BOOKS TAB -->
        <div id="library-section" class="admin-section">
            <h2>Add New E-Book</h2>
            <form action="/admin/add-ebook" method="POST" enctype="multipart/form-data" class="upload-form">
                <div class="form-group"><label>Title</label><input type="text" name="title" required></div>
                <div class="form-group"><label>Author</label><input type="text" name="author" required></div>
                <div class="form-group"><label>Description</label><textarea name="description" rows="5" required></textarea></div>
                <div class="form-group"><label>Category</label><input type="text" name="category" required></div>
                <div class="form-group"><label>Difficulty</label>
                    <select name="difficulty">
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                </div>
                <div class="form-group"><label>Cover Image</label><input type="file" name="image" accept="image/*" required></div>
                <button type="submit">📚 Add E-Book</button>
            </form>
            
            <h3 style="margin-top:40px;">Current E-Books</h3>
            <table class="data-table">
                <tr><th>Title</th><th>Author</th><th>Downloads</th><th>Actions</th></tr>
                ${data.ebooks.map(b => `<tr><td>${b.title}</td><td>${b.author}</td><td>${b.downloads||0}</td><td><button class="btn-danger" onclick="deleteItem('ebooks', '${b.id}')">Delete</button></td></tr>`).join('')}
            </table>
        </div>
        
        <!-- ADS TAB -->
        <div id="ads-section" class="admin-section">
            <h2>Ad Placements</h2>
            <table class="data-table">
                <tr><th>Location</th><th>Status</th><th>Clicks</th><th>Actions</th></tr>
                ${data.ads.map(a => `<tr>
                    <td>${a.location}</td>
                    <td><span class="badge ${a.enabled?'badge-success':'badge-warning'}" style="background:${a.enabled?'#10b981':'#f59e0b'}; color:white; padding:5px 10px; border-radius:20px;">${a.enabled?'Active':'Paused'}</span></td>
                    <td><strong>${a.clicks||0}</strong></td>
                    <td>
                        <button onclick="editAd('${a.id}')">Edit Code</button>
                        <button onclick="toggleAd('${a.id}')">${a.enabled?'Pause':'Activate'}</button>
                    </td>
                </tr>`).join('')}
            </table>
            
            <h3 style="margin-top:40px;">Add New Ad</h3>
            <form action="/admin/add-ad" method="POST" class="upload-form">
                <div class="form-group"><label>Name</label><input type="text" name="name" required></div>
                <div class="form-group"><label>Location</label>
                    <select name="location">
                        <option value="header">Header</option>
                        <option value="sidebar_top">Sidebar Top</option>
                        <option value="sidebar_bottom">Sidebar Bottom</option>
                        <option value="content_top">Content Top</option>
                        <option value="content_middle">Content Middle</option>
                        <option value="content_bottom">Content Bottom</option>
                        <option value="footer">Footer</option>
                        <option value="popup">Popup</option>
                    </select>
                </div>
                <div class="form-group"><label>Ad Code</label><textarea name="code" rows="5" required></textarea></div>
                <button type="submit">➕ Add Ad</button>
            </form>
        </div>
        
        <!-- INJECTIONS TAB -->
        <div id="injections-section" class="admin-section">
            <h2>Code Injections (5 Points)</h2>
            <div class="injection-grid">
                ${['head', 'body_start', 'body_end', 'custom_css', 'custom_js'].map(loc => {
                    const inj = data.injections.find(i => i.location === loc);
                    return `
                    <div class="injection-card">
                        <h3 style="color:var(--primary);">${loc.toUpperCase()}</h3>
                        <textarea id="inj-${loc}">${inj?.code || ''}</textarea>
                        <button onclick="saveInjection('${loc}')">💾 Save Injection</button>
                    </div>`;
                }).join('')}
            </div>
        </div>
        
        <!-- SETTINGS TAB -->
        <div id="settings-section" class="admin-section">
            <h2>Site Settings</h2>
            <form action="/admin/save-settings" method="POST" class="upload-form">
                <div class="form-group"><label>Site Name</label><input type="text" name="site_name" value="${data.settings.site_name || ''}"></div>
                <div class="form-group"><label>Site Title</label><input type="text" name="site_title" value="${data.settings.site_title || ''}"></div>
                <div class="form-group"><label>Contact Email</label><input type="email" name="contact_email" value="${data.settings.contact_email || ''}"></div>
                <div class="form-group"><label>Contact Phone</label><input type="text" name="contact_phone" value="${data.settings.contact_phone || ''}"></div>
                <div class="form-group"><label>Google Analytics ID</label><input type="text" name="google_analytics" value="${data.settings.google_analytics || ''}"></div>
                <div class="form-group"><label>Primary Color</label><input type="color" name="primary_color" value="${data.settings.primary_color || '#2563eb'}"></div>
                <div class="form-group"><label>Background Color</label><input type="color" name="bg_color" value="${data.settings.bg_color || '#0f1117'}"></div>
                <div class="form-group"><label>Auto-Blogger</label>
                    <select name="bot_enabled">
                        <option value="true" ${data.settings.bot_enabled==='true'?'selected':''}>Enabled (2x daily)</option>
                        <option value="false" ${data.settings.bot_enabled==='false'?'selected':''}>Disabled</option>
                    </select>
                </div>
                <button type="submit">💾 Save Settings</button>
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
            }).then(() => alert('Injection saved!'));
        }
        
        function deleteItem(ref, id){
            if(confirm('Delete this item?')){
                fetch('/admin/delete/'+ref+'/'+id, {method:'POST'})
                    .then(() => location.reload());
            }
        }
        
        function toggleAd(id){
            fetch('/admin/toggle-ad/'+id, {method:'POST'})
                .then(() => location.reload());
        }
        
        function editAd(id){
            const code = prompt('Enter new ad code:');
            if(code){
                fetch('/admin/update-ad/'+id, {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({code})
                }).then(() => location.reload());
            }
        }
    </script>
</body>
</html>`);
});

// ==================== ADDITIONAL ADMIN ROUTES ====================
app.post('/admin/add-ad', async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') return res.redirect('/login');
    await adsRef.push({
        name: req.body.name,
        location: req.body.location,
        code: req.body.code,
        enabled: 1,
        clicks: 0,
        created_date: new Date().toISOString()
    });
    res.redirect('/admin');
});

app.post('/admin/add-ebook', upload.single('image'), async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') return res.redirect('/login');
    await ebooksRef.push({
        title: req.body.title,
        author: req.body.author,
        description: req.body.description,
        cover_image: req.file ? ('/uploads/' + req.file.filename) : 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400',
        category: req.body.category,
        pages: 250,
        difficulty: req.body.difficulty || 'Beginner',
        downloads: 0,
        created_date: new Date().toISOString()
    });
    res.redirect('/admin');
});

app.post('/admin/create-post', upload.single('image'), async (req, res) => {
    if (!req.session.userId || req.session.userRole !== 'super_admin') return res.redirect('/login');
    await postsRef.push({
        title: req.body.title,
        content: req.body.content,
        image: req.file ? ('/uploads/' + req.file.filename) : 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800',
        category: 'Manual',
        views: 0,
        likes: 0,
        created_date: new Date().toISOString()
    });
    res.redirect('/admin');
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3EESHER.CLOUD IS LIVE!`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`🔑 Admin: http://localhost:${PORT}/admin`);
    console.log(`📧 Admin Login: admin@3eesher.cloud / admin123`);
    console.log(`✅ Firebase connected via environment variable (SAFE)`);
    console.log(`✅ Features: Videos, Blog, Library (15+ e-books), Ads, Injections, Super Admin`);
});
