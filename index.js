const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const multer = require('multer');
const Parser = require('rss-parser'); 
const { exec } = require('child_process');

console.log("✅ Starting Enterprise Server...");

const app = express();
const PORT = process.env.PORT || 3000;
const rssParser = new Parser();

// 🌐 HARDCODED GOOGLE ANALYTICS ID
const GA_ID = 'G-HD01MF5SL9';

// ==================== 💾 PERMANENT DISK STORAGE (NO VANISHING) ====================
// CRITICAL: In Render Dashboard -> Disks -> Set Mount Path to: /data
const DISK_PATH = fs.existsSync('/data') ? '/data' : __dirname; 
const UPLOADS_DIR = path.join(DISK_PATH, 'uploads');
const VIDEOS_DIR = path.join(DISK_PATH, 'videos');
const BACKUPS_DIR = path.join(DISK_PATH, 'backups');
const DATA_FILE = path.join(DISK_PATH, 'data.json');

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(VIDEOS_DIR);
fs.ensureDirSync(BACKUPS_DIR);
console.log(`💾 Persistent Disk Path set to: ${DISK_PATH}`);

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/videos', express.static(VIDEOS_DIR));
app.use('/backups', express.static(BACKUPS_DIR));

// ==================== 🌐 DYNAMIC URL DETECTION ====================
app.use((req, res, next) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    res.locals.siteUrl = `${protocol}://${host}`;
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '3eesher_whitehat_ultimate_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== 📁 MULTER CONFIG ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const isVideo = file.mimetype.includes('video') || ['.mp4', '.mov', '.mkv', '.avi', '.webm'].includes(ext);
        cb(null, isVideo ? VIDEOS_DIR : UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== 🗄️ DATABASE (EVERYTHING RESTORED) ====================
function getData() {
    try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}
    const defaults = getDefaultData(); saveData(defaults); return defaults;
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

function getDefaultData() {
    return {
        settings: { logoUrl: 'https://images.unsplash.com/photo-1614064641936-a5926c8b939c?w=1200&q=80', siteName: '3EESHER-CLOUD' }, 
        adminAuth: { user: 'admin216', hash: bcrypt.hashSync('admin1234', 10) },
        moneyLinks: [
            { name: 'Upwork', url: 'https://www.upwork.com', category: 'freelance', active: true, clicks: 0, icon: '💼' },
            { name: 'Fiverr', url: 'https://www.fiverr.com', category: 'freelance', active: true, clicks: 0, icon: '🎨' },
            { name: 'Freelancer', url: 'https://www.freelancer.com', category: 'freelance', active: true, clicks: 0, icon: '🖥️' },
            { name: 'ClickBank', url: 'https://www.clickbank.com', category: 'affiliate', active: true, clicks: 0, icon: '💰' },
            { name: 'ShareASale', url: 'https://www.shareasale.com', category: 'affiliate', active: true, clicks: 0, icon: '🔗' },
            { name: 'CJ Affiliate', url: 'https://www.cj.com', category: 'affiliate', active: true, clicks: 0, icon: '🤝' },
            { name: 'Rakuten', url: 'https://www.rakuten.com', category: 'affiliate', active: true, clicks: 0, icon: '🇯🇵' },
            { name: 'Amazon Associates', url: 'https://affiliate-program.amazon.com', category: 'affiliate', active: true, clicks: 0, icon: '📦' },
            { name: 'eBay Partner', url: 'https://www.ebaypartnernetwork.com', category: 'affiliate', active: true, clicks: 0, icon: '🏷️' },
            { name: 'Etsy Affiliate', url: 'https://www.etsy.com/affiliates', category: 'affiliate', active: true, clicks: 0, icon: '🎁' },
            { name: 'Shopify Affiliate', url: 'https://www.shopify.com/affiliates', category: 'affiliate', active: true, clicks: 0, icon: '🛒' },
            { name: 'Teachable', url: 'https://teachable.com', category: 'courses', active: true, clicks: 0, icon: '📝' },
            { name: 'Udemy', url: 'https://www.udemy.com', category: 'courses', active: true, clicks: 0, icon: '📚' },
            { name: 'Coursera', url: 'https://www.coursera.org', category: 'courses', active: true, clicks: 0, icon: '🎓' },
            { name: 'Skillshare', url: 'https://www.skillshare.com', category: 'courses', active: true, clicks: 0, icon: '✂️' },
            { name: 'YouTube', url: 'https://www.youtube.com/creators/', category: 'social', active: true, clicks: 0, icon: '🎬' },
            { name: 'TikTok', url: 'https://www.tiktok.com/creators/', category: 'social', active: true, clicks: 0, icon: '📱' },
            { name: 'Instagram', url: 'https://creators.instagram.com', category: 'social', active: true, clicks: 0, icon: '📸' },
            { name: 'Facebook', url: 'https://www.facebook.com/creators', category: 'social', active: true, clicks: 0, icon: '👥' },
            { name: 'Medium', url: 'https://medium.com/creators', category: 'writing', active: true, clicks: 0, icon: '✍️' },
            { name: 'Substack', url: 'https://substack.com', category: 'writing', active: true, clicks: 0, icon: '📧' },
            { name: 'Rev', url: 'https://www.rev.com/freelancers', category: 'freelance', active: true, clicks: 0, icon: '🎤' },
            { name: 'UserTesting', url: 'https://www.usertesting.com', category: 'testing', active: true, clicks: 0, icon: '✅' },
            { name: 'Swagbucks', url: 'https://www.swagbucks.com', category: 'rewards', active: true, clicks: 0, icon: '🎁' },
            { name: 'Survey Junkie', url: 'https://www.surveyjunkie.com', category: 'surveys', active: true, clicks: 0, icon: '📊' },
            { name: 'Appen', url: 'https://appen.com', category: 'ai', active: true, clicks: 0, icon: '🤖' },
            { name: 'Remotasks', url: 'https://www.remotasks.com', category: 'ai', active: true, clicks: 0, icon: '⚙️' },
            { name: 'Amazon KDP', url: 'https://kdp.amazon.com', category: 'publishing', active: true, clicks: 0, icon: '📖' },
            { name: 'Redbubble', url: 'https://www.redbubble.com', category: 'pod', active: true, clicks: 0, icon: '👕' },
            { name: 'Teespring', url: 'https://teespring.com', category: 'pod', active: true, clicks: 0, icon: '🛍️' }
        ],
        storeLinks: [
            { name: 'Jumia NG', url: 'https://www.jumia.com.ng/?aff_id=', id: 'allarbaa216-20', active: true, clicks: 0 },
            { name: 'Amazon Store', url: 'https://www.amazon.com/?tag=', id: '', active: false, clicks: 0 },
            { name: 'Konga', url: 'https://www.konga.com/?aff_id=', id: '', active: false, clicks: 0 }
        ],
        videos: [
            { id: 1, title: 'Eminem - Houdini', videoUrl: 'https://www.youtube.com/embed/bkSJZwQF6I4', thumbnail: 'https://img.youtube.com/vi/bkSJZwQF6I4/0.jpg', type: 'youtube' },
            { id: 2, title: 'Kendrick Lamar - Not Like Us', videoUrl: 'https://www.youtube.com/embed/H58vbez_m4E', thumbnail: 'https://img.youtube.com/vi/H58vbez_m4E/0.jpg', type: 'youtube' },
            { id: 3, title: 'Taylor Swift - Cruel Summer', videoUrl: 'https://www.youtube.com/embed/ic8j13piAhQ', thumbnail: 'https://img.youtube.com/vi/ic8j13piAhQ/0.jpg', type: 'youtube' },
            { id: 4, title: "Drake - God's Plan", videoUrl: 'https://www.youtube.com/embed/xpVfcZ0ZcFM', thumbnail: 'https://img.youtube.com/vi/xpVfcZ0ZcFM/0.jpg', type: 'youtube' },
            { id: 5, title: 'The Weeknd - Blinding Lights', videoUrl: 'https://www.youtube.com/embed/4NRXx6U8ABQ', thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/0.jpg', type: 'youtube' },
            { id: 6, title: 'Bruno Mars - 24K Magic', videoUrl: 'https://www.youtube.com/embed/UqyT8IEBkvY', thumbnail: 'https://img.youtube.com/vi/UqyT8IEBkvY/0.jpg', type: 'youtube' },
            { id: 7, title: 'Ed Sheeran - Shape of You', videoUrl: 'https://www.youtube.com/embed/JGwWNGJdvx8', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/0.jpg', type: 'youtube' },
            { id: 8, title: 'Post Malone - Sunflower', videoUrl: 'https://www.youtube.com/embed/ApXoWvfEYVU', thumbnail: 'https://img.youtube.com/vi/ApXoWvfEYVU/0.jpg', type: 'youtube' },
            { id: 9, title: 'Doja Cat - Paint The Town Red', videoUrl: 'https://www.youtube.com/embed/Cwgg0FkqLr0', thumbnail: 'https://img.youtube.com/vi/Cwgg0FkqLr0/0.jpg', type: 'youtube' },
            { id: 10, title: 'Miley Cyrus - Flowers', videoUrl: 'https://www.youtube.com/embed/G7KNmW9a75Y', thumbnail: 'https://img.youtube.com/vi/G7KNmW9a75Y/0.jpg', type: 'youtube' }
        ],
        successStories: [
            { id: 1, name: 'Ahmed from Kano', after: '$2,500/month', story: 'Ahmed was a civil servant...', avatar: '👨‍💼', color: '#10b981' },
            { id: 2, name: 'Fatima from Cairo', after: '$1,800/month', story: 'Fatima was an engineering student...', avatar: '👩‍🎓', color: '#f59e0b' },
            { id: 3, name: 'TICHER (Founder)', after: 'Built 3EESHER-CLOUD', story: 'The visionary behind the platform...', avatar: '🚀', color: '#fbbf24' }
        ],
        blogPosts: [],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '', customHtml: '' },
        apiKeys: { telegram: '', openai: '', mailchimpKey: '' },
        aboutContent: { mission: 'To democratize online income...', history: 'Started by TICHER in 2023...', community: 'Join thousands...' },
        privacyContent: { introduction: 'Your privacy is our priority...', dataCollected: 'We collect your data...' }
    };
}

// ==================== 🛠️ ADMIN WORKERS ====================
function checkAdmin(req, res, next) { if (req.session.isSuperAdmin) return next(); res.redirect('/admin-login'); }

app.post('/admin/save-injections', checkAdmin, (req, res) => {
    const data = getData();
    data.injections = { head: req.body.head, bodyStart: req.body.bodyStart, bodyEnd: req.body.bodyEnd, css: req.body.css, js: req.body.js, customHtml: req.body.customHtml };
    saveData(data); res.send('<script>alert("🔌 Injectors Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-logo', checkAdmin, upload.single('logo'), (req, res) => {
    const data = getData(); data.settings.logoUrl = `/uploads/${req.file.filename}`; saveData(data);
    res.send('<script>alert("🎨 Logo Saved!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/create-blog', checkAdmin, upload.single('image'), async (req, res) => {
    const data = getData();
    data.blogPosts.unshift({ id: Date.now(), title: req.body.title, content: req.body.content.replace(/\n/g, '<br>'), image: req.file ? `/uploads/${req.file.filename}` : '', date: new Date().toISOString() });
    saveData(data);
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(res.locals.siteUrl + '/sitemap.xml')}`);
    } catch(e) {}
    res.send('<script>alert("✅ Published & Google Notified!"); window.location.href="/super-admin";</script>');
});

// ==================== 🌐 FRONTEND HOMEPAGE (FULL UI RESTORED) ====================
app.get('/', (req, res) => {
    const data = getData();
    const siteName = data.settings.siteName;
    const inj = data.injections;

    res.send(`<!DOCTYPE html><html lang="en"><head>
    <title>${siteName} | Ultimate Hub</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- CEO GOOGLE ANALYTICS -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
    
    ${inj.head || ''}
    <style>
        :root { --bg: #0a0f1e; --card: #1e293b; --highlight: #10b981; }
        body{background:var(--bg); color:#fff; font-family:sans-serif; margin:0;}
        header{padding:80px 5%; text-align:center; background:linear-gradient(rgba(16,185,129,0.1),#0a0f1e);}
        .logo{max-width:300px; border-radius:15px; border:2px solid var(--highlight);}
        .container{max-width:1200px; margin:0 auto; padding:20px;}
        .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:25px; margin-bottom:60px;}
        .card{background:var(--card); border-radius:12px; overflow:hidden; border:1px solid #334155;}
        .m-link{background:#0f172a; padding:15px; border-left:4px solid var(--highlight); margin-bottom:12px;}
        .m-link a{color:#fff; text-decoration:none; font-weight:bold;}
        ${inj.css || ''}
    </style></head>
<body>
    ${inj.bodyStart || ''}
    ${inj.customHtml || ''}
    <div style="background:#000; padding:10px; color:var(--highlight); font-family:monospace; text-align:center;">
        🚀 BREAKING: BTC hits $68k | Ahmed earned $47 on Fiverr | Fatima withdrawing $120...
    </div>
    <header><img src="${data.settings.logoUrl}" class="logo"><h1>${siteName}</h1></header>
    <div class="container">
        <h2>🎬 persistent Videos</h2>
        <div class="grid">
            ${data.videos.map(v => `<div class="card">${v.type === 'youtube' ? `<iframe src="${v.videoUrl}" style="width:100%;height:200px;border:none;"></iframe>` : `<video src="${v.videoUrl}" controls style="width:100%;height:200px;background:#000;"></video>`}<div style="padding:15px;"><h4>${v.title}</h4></div></div>`).j
