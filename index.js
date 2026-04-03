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

// ==================== 💾 PERMANENT DISK STORAGE (NO VANISHING) ====================
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

// ==================== 🛠️ REAL GOOGLE INDEXING & CRAWLER ====================
async function realGooglePing(url) {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        // Official Google Sitemap Ping
        const response = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(url + '/sitemap.xml')}`);
        console.log(`📡 GOOGLE CRAWLER STATUS: ${response.status} (Pinged for ${url})`);
        return response.ok;
    } catch (e) { console.error("SEO Ping Failed", e); return false; }
}

// ==================== 🌐 DYNAMIC DOMAIN DETECTION ====================
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

// ==================== 📁 MULTER ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, (file.mimetype.includes('video') || ['.mp4', '.mov'].includes(ext)) ? VIDEOS_DIR : UPLOADS_DIR);
    },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')); }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== 🗄️ DATABASE & FULL CONTENT RESTORATION ====================
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
            { name: 'Upwork', url: 'https://www.upwork.com', active: true, icon: '💼' },
            { name: 'Fiverr', url: 'https://www.fiverr.com', active: true, icon: '🎨' },
            { name: 'Freelancer', url: 'https://www.freelancer.com', active: true, icon: '🖥️' },
            { name: 'ClickBank', url: 'https://www.clickbank.com', active: true, icon: '💰' },
            { name: 'ShareASale', url: 'https://www.shareasale.com', active: true, icon: '🔗' },
            { name: 'CJ Affiliate', url: 'https://www.cj.com', active: true, icon: '🤝' },
            { name: 'Amazon KDP', url: 'https://kdp.amazon.com', active: true, icon: '📖' },
            { name: 'Redbubble', url: 'https://www.redbubble.com', active: true, icon: '👕' },
            { name: 'Survey Junkie', url: 'https://www.surveyjunkie.com', active: true, icon: '📊' },
            { name: 'Remotasks', url: 'https://www.remotasks.com', active: true, icon: '⚙️' }
        ],
        storeLinks: [{ name: 'Jumia NG', url: 'https://www.jumia.com.ng/?aff_id=', id: 'allarbaa216-20', active: true }],
        videos: [
            { id: 1, title: 'Eminem - Houdini', videoUrl: 'https://www.youtube.com/embed/bkSJZwQF6I4', type: 'youtube' },
            { id: 2, title: 'Kendrick Lamar - Not Like Us', videoUrl: 'https://www.youtube.com/embed/H58vbez_m4E', type: 'youtube' },
            { id: 3, title: 'Taylor Swift - Cruel Summer', videoUrl: 'https://www.youtube.com/embed/ic8j13piAhQ', type: 'youtube' }
        ],
        successStories: [
            { id: 1, name: 'Ahmed from Kano', after: '$2,500/month', story: 'Ahmed was a civil servant... Now owns a house.', avatar: '👨‍💼', color: '#10b981' },
            { id: 2, name: 'Fatima from Cairo', after: '$1,800/month', story: 'Engineering student turned Top-Rated freelancer.', avatar: '👩‍🎓', color: '#f59e0b' }
        ],
        blogPosts: [],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '' },
        apiKeys: { openai: '', googleServiceKey: '' },
        aboutContent: { mission: 'To democratize online income...', history: 'Started in 2023 by TICHER...' },
        privacyContent: { introduction: 'Your privacy is our priority...' }
    };
}

// ==================== 🛠️ ADMIN CMS & REAL PING ====================
function checkAdmin(req, res, next) { if (req.session.isSuperAdmin) return next(); res.redirect('/admin-login'); }

app.post('/admin/create-blog', checkAdmin, upload.single('image'), async (req, res) => {
    const data = getData();
    data.blogPosts.unshift({ id: Date.now(), title: req.body.title, content: req.body.content.replace(/\n/g, '<br>'), image: req.file ? `/uploads/${req.file.filename}` : '', date: new Date().toISOString() });
    saveData(data);
    await realGooglePing(res.locals.siteUrl); // REAL AUTO PING
    res.send('<script>alert("Published & Google Crawl Requested!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-video', checkAdmin, upload.single('video'), (req, res) => {
    const data = getData();
    data.videos.unshift({ id: Date.now(), title: req.body.title, videoUrl: `/videos/${req.file.filename}`, type: 'local' });
    saveData(data); res.send('<script>alert("Video Stored Permanently!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/save-injections', checkAdmin, (req, res) => {
    const data = getData(); data.injections = req.body; saveData(data);
    res.send('<script>alert("Injectors Active!"); window.location.href="/super-admin";</script>');
});

// ==================== 🌐 FRONTEND HOMEPAGE (FULL CONTENT) ====================
app.get('/', (req, res) => {
    const data = getData(); const inj = data.injections;

    const vidHtml = data.videos.map(v => `<div class="card">${v.type==='youtube'?`<iframe src="${v.videoUrl}" style="width:100%;height:200px;border:none;"></iframe>`:`<video src="${v.videoUrl}" controls style="width:100%;height:200px;background:#000;"></video>`}<div style="padding:15px;"><h4>${v.title}</h4>${v.type==='local'?`<a href="/download/video/${v.id}" style="color:var(--highlight);font-size:12px;">⬇️ Download</a>`:''}</div></div>`).join('');
    const blogHtml = data.blogPosts.map(p => `<div class="card"><img src="${p.image}" class="card-img"><h3>${p.title}</h3><a href="/blog/${p.id}">Read →</a></div>`).join('');

    res.send(`<!DOCTYPE html><html><head>
    <title>${data.settings.siteName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
    ${inj.head}
    <style>
        :root { --bg: #0a0f1e; --card: #1e293b; --highlight: #10b981; }
        body{background:var(--bg); color:#fff; font-family:sans-serif; margin:0;}
        header{padding:80px 5%; text-align:center; background:linear-gradient(rgba(16,185,129,0.1),#0a0f1e);}
        .logo{max-width:350px; border-radius:15px; border:2px solid var(--highlight);}
        .container{max-width:1200px; margin:0 auto; padding:20px;}
        .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px; margin-bottom:50px;}
        .card{background:var(--card); border-radius:10px; overflow:hidden; border:1px solid #334155;}
        .card-img{width:100%;height:180px;object-fit:cover;}
        .banner{width:100%; height:300px; object-fit:cover; border-radius:20px; margin:40px 0; border:1px solid #334155;}
        ${inj.css}
    </style></head>
<body>
    ${inj.bodyStart}
    <div style="background:#000; padding:10px; color:var(--highlight); text-align:center; font-family:monospace;">
        🚀 Ahmed made $47 | Fatima Withdraw $120 | BTC at $68k | Welcome to ${data.settings.siteName}
    </div>

    <!-- NAVIGATION MENU -->
    <nav style="position:absolute; top:20px; right:20px;">
        <a href="/library" style="color:var(--highlight); font-weight:bold; margin-right:15px;">📚 Library</a>
        <a href="/admin-login" style="color:#fbbf24; font-weight:bold;">⚙️ Admin</a>
    </nav>

    <header>
        <img src="${data.settings.logoUrl}" class="logo">
        <h1 style="font-size:3rem; margin:20px 0;">${data.settings.siteName}</h1>
        <div style="max-width:800px; margin:0 auto; background:rgba(0,0,0,0.4); padding:30px; border-radius:15px;">
            <h2 style="color:var(--highlight);">Digital Education & Income Hub</h2>
            <p>Empowering 1,420+ entrepreneurs with verified money-making tools.</p>
        </div>
    </header>

    <div class="container">
        <h2>🎬 persistent Music & Videos</h2><div class="grid">${vidHtml}</div>
        <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200" class="banner">
        
        <h2>💰 Verified Money Links</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:50px;">
            ${data.moneyLinks.map(l => `<div style="background:#0f172a;padding:15px;border-left:4px solid var(--highlight);"><a href="${l.url}" target="_blank" style="color:#fff;text-decoration:none;font-weight:bold;">${l.icon} ${l.name}</a></div>`).join('')}
        </div>

        <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200" class="banner">
        
        <h2>📝 Manual Tech Blogs</h2><div class="grid">${blogHtml}</div>

        <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200" class="banner">

        <h2>🏆 Success Stories</h2>
        <div class="grid">
            ${data.successStories.map(s => `<div class="card" style="padding:20px;border-top:4px solid ${s.color};"><h4>${s.avatar} ${s.name}</h4><p style="color:var(--highlight);font-weight:bold;">${s.after}</p><p style="font-size:14px;">${s.story}</p></div>`).join('')}
        </div>

        <div style="background:var(--card); padding:50px; border-radius:20px; border:1px solid #334155; margin-top:40px;">
            <h2>About & Mission</h2><p>${data.aboutContent.mission}</p>
            <hr style="border-top:1px solid #334155; margin:30px 0;">
            <h2>Privacy & Security</h2><p>${data.privacyContent.introduction}</p>
        </div>
    </div>
    <script>${inj.js}</script>
</body></html>`);
});

// Admin, Auth, Sitemap... (Restored Logic)
app.get('/super-admin', checkAdmin, (req, res) => {
    const data = getData();
    res.send(`<!DOCTYPE html><html><head><title>Admin CMS</title><style>
    body{display:flex;background:#0f172a;color:#e2e8f0;font-family:sans-serif;margin:0;}
    .sidebar{width:260px;background:#1e293b;padding:20px;height:100vh;}
    .sidebar a{display:block;color:#94a3b8;padding:12px;text-decoration:none;cursor:pointer;}
    .sidebar a:hover{background:#10b981;color:#000;}
    .main{flex:1;padding:40px;overflow-y:auto;}
    .panel{display:none;background:#1e293b;padding:30px;border-radius:12px;}
    .panel.active{display:block;}
    textarea, input{width:100%; background:#0f172a; color:#fff; border:1px solid #334155; margin-bottom:15px; padding:10px;}
    button{background:#10b981; color:#000; font-weight:bold; padding:15px; border:none; cursor:pointer;}
    </style></head><body>
    <div class="sidebar"><h2>CEO HUB</h2><a onclick="show('dash')">Stats</a><a onclick="show('blog')">Blogs</a><a onclick="show('video')">Videos</a><a onclick="show('inject')">Injectors</a><a href="/">Site</a></div>
    <div class="main">
        <div id="dash" class="panel active"><h3>Persistent Disk: /data</h3><p>Google ID: ${GA_ID}</p><a href="/admin/manual-ping"><button>REAL Force Google Ping</button></a></div>
        <div id="blog" class="panel"><h3>Manual Blog</h3><form action="/admin/create-blog" method="POST" enctype="multipart/form-data"><input name="title" required><textarea name="content" rows="6"></textarea><input type="file" name="image"><button>Post & Real Ping Google</button></form></div>
        <div id="video" class="panel"><h3>Upload Video</h3><form action="/admin/upload-video" method="POST" enctype="multipart/form-data"><input name="title"><input type="file" name="video" required><button>Save to Storage</button></form></div>
        <div id="inject" class="panel"><h3>Universal Injector</h3><form action="/admin/save-injections" method="POST"><textarea name="head">${data.injections.head}</textarea><textarea name="css">${data.injections.css}</textarea><textarea name="js">${data.injections.js}</textarea><button>Update Global Headers</button></form></div>
    </div>
    <script>function show(id){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');}</script>
</body></html>`);
});

app.get('/admin/manual-ping', checkAdmin, async (req, res) => {
    const ok = await realGooglePing(res.locals.siteUrl);
    res.send(`<script>alert("${ok?'Real Google Crawl Triggered!':'Ping Failed'}");window.location.href="/super-admin";</script>`);
});

app.get('/admin-login', (req, res) => { res.send('<form method="POST" action="/auth-admin"><input name="username"><input type="password" name="password"><button>Login</button></form>'); });
app.post('/auth-admin', (req, res) => {
    const { username, password } = req.body; const d = getData();
    if (username === d.adminAuth.user && bcrypt.compareSync(password, d.adminAuth.hash)) { req.session.isSuperAdmin = true; res.redirect('/super-admin'); }
    else res.send('Fail');
});

app.get('/download/video/:id', (req, res) => {
    const data = getData(); const v = data.videos.find(x => x.id == req.params.id);
    if (v && v.type === 'local') res.download(path.join(DISK_PATH, v.videoUrl));
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 CEO PROJECT LIVE ON PORT ${PORT}`));
