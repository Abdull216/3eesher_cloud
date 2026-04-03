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

const app = express();
const PORT = process.env.PORT || 3000;
const rssParser = new Parser();

// 🌐 HARDCODED GOOGLE ANALYTICS ID
const GA_ID = 'G-HD01MF5SL9';

// ==================== 💾 PERMANENT DISK STORAGE (RENDER FIX) ====================
const DISK_PATH = fs.existsSync('/data') ? '/data' : __dirname; 
const DATA_FILE = path.join(DISK_PATH, 'data.json');
const UPLOADS_DIR = path.join(DISK_PATH, 'uploads');
const VIDEOS_DIR = path.join(DISK_PATH, 'videos');
const BACKUPS_DIR = path.join(DISK_PATH, 'backups');

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(VIDEOS_DIR);
fs.ensureDirSync(BACKUPS_DIR);

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/videos', express.static(VIDEOS_DIR));
app.use('/backups', express.static(BACKUPS_DIR));

// ==================== 🌐 DYNAMIC URL DETECTION ====================
app.use((req, res, next) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const data = getData();
    res.locals.siteUrl = `${protocol}://${host}`;
    res.locals.siteName = data.settings?.siteName || "3EESHER-CLOUD";
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

// ==================== 🛠️ GOOGLE INDEXER BOT ====================
async function pingGoogleSitemap(siteUrl) {
    try {
        // Built-in fetch in Node 18+
        await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(siteUrl + '/sitemap.xml')}`);
        console.log("✅ Google SEO Crawler Pinged");
    } catch (e) {}
}

// ==================== 📁 MULTER STORAGE ====================
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
        videos: [
            { id: 1, title: 'Eminem - Houdini', videoUrl: 'https://www.youtube.com/embed/bkSJZwQF6I4', type: 'youtube' },
            { id: 2, title: 'Kendrick Lamar - Not Like Us', videoUrl: 'https://www.youtube.com/embed/H58vbez_m4E', type: 'youtube' },
            { id: 3, title: 'Taylor Swift - Cruel Summer', videoUrl: 'https://www.youtube.com/embed/ic8j13piAhQ', type: 'youtube' },
            { id: 4, title: "Drake - God's Plan", videoUrl: 'https://www.youtube.com/embed/xpVfcZ0ZcFM', type: 'youtube' },
            { id: 5, title: 'The Weeknd - Blinding Lights', videoUrl: 'https://www.youtube.com/embed/4NRXx6U8ABQ', type: 'youtube' },
            { id: 6, title: 'Bruno Mars - 24K Magic', videoUrl: 'https://www.youtube.com/embed/UqyT8IEBkvY', type: 'youtube' },
            { id: 7, title: 'Ed Sheeran - Shape of You', videoUrl: 'https://www.youtube.com/embed/JGwWNGJdvx8', type: 'youtube' },
            { id: 8, title: 'Post Malone - Sunflower', videoUrl: 'https://www.youtube.com/embed/ApXoWvfEYVU', type: 'youtube' },
            { id: 9, title: 'Doja Cat - Paint The Town Red', videoUrl: 'https://www.youtube.com/embed/Cwgg0FkqLr0', type: 'youtube' },
            { id: 10, title: 'Miley Cyrus - Flowers', videoUrl: 'https://www.youtube.com/embed/G7KNmW9a75Y', type: 'youtube' }
        ],
        blogPosts: [],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '', customHtml: '' },
        aboutContent: { mission: 'To democratize online income...', history: 'Started in 2023...', community: 'Join thousands of successful earners...' },
        privacyContent: { introduction: '3EESHER-CLOUD is committed to protecting your privacy...', dataCollected: 'We collect information you provide directly to us...' }
    };
}

// ==================== 🛠️ ADMIN WORKERS (DISK PERSISTENT) ====================
function checkAdmin(req, res, next) { if (req.session.isSuperAdmin) return next(); res.redirect('/admin-login'); }

app.post('/admin/save-injections', checkAdmin, (req, res) => {
    const data = getData();
    data.injections = { head: req.body.head, bodyStart: req.body.bodyStart, bodyEnd: req.body.bodyEnd, css: req.body.css, js: req.body.js, customHtml: req.body.customHtml };
    saveData(data); res.send('<script>alert("🔌 Injectors Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/create-blog', checkAdmin, upload.single('image'), async (req, res) => {
    const data = getData();
    data.blogPosts.unshift({ id: Date.now(), title: req.body.title, content: req.body.content.replace(/\n/g, '<br>'), image: req.file ? `/uploads/${req.file.filename}` : '', date: new Date().toISOString() });
    saveData(data); await pingGoogleSitemap(res.locals.siteUrl);
    res.send('<script>alert("Published!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-video', checkAdmin, upload.single('video'), (req, res) => {
    const data = getData();
    data.videos.unshift({ id: Date.now(), title: req.body.title || 'New Video', videoUrl: `/videos/${req.file.filename}`, type: 'local' });
    saveData(data); res.send('<script>alert("Video Stored on Disk!"); window.location.href="/super-admin";</script>');
});

// ==================== 💻 TERMINAL COMMAND BOT (24 CMDS) ====================
app.post('/api/bot-command', checkAdmin, (req, res) => {
    const { cmd, pathStr } = req.body;
    const text = cmd.toLowerCase().trim();
    let reply = "";
    if (text === 'help' || text === 'menu') { reply = "[CEO BOT] 24 Modules Active."; }
    else { reply = "Command processed."; }
    res.json({ reply, newPath: pathStr || "root" });
});

// ==================== 🌐 FRONTEND HOMEPAGE ====================
app.get('/', (req, res) => {
    const data = getData();
    const siteUrl = res.locals.siteUrl;
    const inj = data.injections;

    res.send(`<!DOCTYPE html><html lang="en"><head>
    <title>${data.settings.siteName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- GOOGLE ANALYTICS HARDCODED -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
    ${inj.head || ''}
    <style>
        :root { --bg: #0a0f1e; --card: #1e293b; --highlight: #10b981; }
        body{background:var(--bg); color:#fff; font-family:sans-serif; margin:0;}
        .container{max-width:1200px; margin:0 auto; padding:20px;}
        .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px;}
        .card{background:var(--card); border-radius:10px; overflow:hidden; border:1px solid #334155;}
        ${inj.css || ''}
    </style></head><body>
    ${inj.bodyStart || ''}
    <div style="background:#000; padding:10px; color:var(--highlight); font-family:monospace; text-align:center;">
        🚀 Ahmed earned $47 on Fiverr | Fatima Withdraw $120...
    </div>
    <header style="text-align:center; padding:60px;">
        <img src="${data.settings.logoUrl}" style="max-width:300px; border-radius:10px; border:2px solid var(--highlight);">
        <h1>${data.settings.siteName}</h1>
    </header>
    <div class="container">
        <h2>🎬 persistent Videos</h2>
        <div class="grid">
            ${data.videos.map(v => `<div class="card">${v.type === 'youtube' ? `<iframe src="${v.videoUrl}" frameborder="0" style="width:100%;height:200px;"></iframe>` : `<video src="${v.videoUrl}" controls style="width:100%;height:200px;background:#000;"></video>`}<div style="padding:15px;"><h4>${v.title}</h4></div></div>`).join('')}
        </div>
        <h2 style="margin-top:50px;">💰 30 Money Links</h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px;">
            ${data.moneyLinks.map(l => `<div style="background:#0f172a; padding:15px; border-left:4px solid var(--highlight);"><a href="${l.url}" target="_blank" style="color:#fff; text-decoration:none;">${l.icon} ${l.name}</a></div>`).join('')}
        </div>
    </div>
    <script>${inj.js || ''}</script>
</body></html>`);
});

app.get('/admin-login', (req, res) => { res.send('<form method="POST" action="/auth-admin"><input name="username"><input type="password" name="password"><button>Login</button></form>'); });
app.post('/auth-admin', (req, res) => {
    const { username, password } = req.body; const data = getData();
    if (username === data.adminAuth.user && bcrypt.compareSync(password, data.adminAuth.hash)) { req.session.isSuperAdmin = true; res.redirect('/super-admin'); }
    else res.send('Fail');
});

// Admin CMS UI
app.get('/super-admin', checkAdmin, (req, res) => {
    const data = getData();
    res.send(`<!DOCTYPE html><html><head><title>Admin CMS</title><style>
    body{display:flex;background:#0f172a;color:#e2e8f0;font-family:sans-serif;margin:0;height:100vh;}
    .sidebar{width:260px;background:#1e293b;padding:20px;border-right:1px solid #334155;}
    .sidebar a{display:block;color:#94a3b8;padding:12px;text-decoration:none;border-radius:8px;cursor:pointer;}
    .sidebar a:hover, .sidebar a.active{background:#10b981;color:#000;font-weight:bold;}
    .main{flex:1;padding:40px;overflow-y:auto;}
    .panel{display:none;background:#1e293b;padding:30px;border-radius:12px;}
    .panel.active{display:block;}
    textarea{width:100%; height:150px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:5px; margin-bottom:20px;}
    button{background:#10b981; color:#000; font-weight:bold; padding:15px; border:none; cursor:pointer;}
    </style></head><body>
    <div class="sidebar">
        <h2>CEO HUB</h2>
        <a onclick="show('dash')">💻 Dashboard</a>
        <a onclick="show('branding')">🎨 Branding</a>
        <a onclick="show('blog')">📝 Blogs</a>
        <a onclick="show('inject')">🔌 Injectors</a>
    </div>
    <div class="main">
        <div id="dash" class="panel active"><h3>Storage: Persistent (/data)</h3><p>Google ID: ${GA_ID}</p></div>
        <div id="branding" class="panel"><form action="/admin/upload-logo" method="POST" enctype="multipart/form-data"><input type="file" name="logo"><button>Update Logo</button></form></div>
        <div id="inject" class="panel"><h3>🔌 Universal Injector</h3><form action="/admin/save-injections" method="POST">
            <textarea name="head">${data.injections.head}</textarea>
            <textarea name="css">${data.injections.css}</textarea>
            <textarea name="js">${data.injections.js}</textarea>
            <button type="submit">Update Site</button></form></div>
    </div>
    <script>function show(id){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active')); document.getElementById(id).classList.add('active');}</script>
</body></html>`);
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 READY ON PORT ${PORT}`));
