/* 
   TISHER CLOUD ENTERPRISE HUB v2.0
   CEO: abdullahharuna216@gmail.com
   GA_ID: G-HD01MF5SL9
   STORAGE: PERSISTENT (/data)
*/

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

// ==================== 🛠️ REAL SEO & BOT LOGIC ====================
async function realGooglePing(url) {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(url + '/sitemap.xml')}`);
        return true;
    } catch (e) { return false; }
}

// ==================== 📁 MULTER ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, (file.mimetype.includes('video') || ['.mp4', '.mov'].includes(ext)) ? VIDEOS_DIR : UPLOADS_DIR);
    },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')); }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== 🗄️ DATABASE (COMPLETE NO-LOSS CONTENT) ====================
function getData() {
    try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}
    const defaults = getDefaultData(); saveData(defaults); return defaults;
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

function getDefaultData() {
    return {
        settings: { 
            logoUrl: 'https://images.unsplash.com/photo-1614064641936-a5926c8b939c?w=1200&q=80', 
            siteName: '3EESHER-CLOUD',
            maintenance: false,
            banner1: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
            banner2: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
            banner3: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
            heroTitle: 'Why build this platform?',
            heroDesc: 'To provide a centralized digital education hub and instant income portals for entrepreneurs.',
            gaId: 'G-HD01MF5SL9'
        }, 
        adminAuth: { user: 'admin216', hash: bcrypt.hashSync('admin1234', 10) },
        moneyLinks: [
            { name: 'Upwork', url: 'https://www.upwork.com', category: 'freelance', active: true, clicks: 0, icon: '💼' },
            { name: 'Fiverr', url: 'https://www.fiverr.com', category: 'freelance', active: true, clicks: 0, icon: '🎨' },
            { name: 'Freelancer', url: 'https://www.freelancer.com', category: 'freelance', active: true, clicks: 0, icon: '🖥️' },
            { name: 'ClickBank', url: 'https://www.clickbank.com', category: 'affiliate', active: true, clicks: 0, icon: '💰' },
            { name: 'Amazon Associates', url: 'https://affiliate-program.amazon.com', category: 'affiliate', active: true, clicks: 0, icon: '📦' },
            { name: 'Survey Junkie', url: 'https://www.surveyjunkie.com', category: 'surveys', active: true, clicks: 0, icon: '📊' },
            { name: 'Remotasks', url: 'https://www.remotasks.com', category: 'ai', active: true, clicks: 0, icon: '⚙️' },
            { name: 'Appen', url: 'https://appen.com', category: 'ai', active: true, clicks: 0, icon: '🤖' },
            { name: 'Amazon KDP', url: 'https://kdp.amazon.com', category: 'publishing', active: true, clicks: 0, icon: '📖' },
            { name: 'Redbubble', url: 'https://www.redbubble.com', category: 'pod', active: true, clicks: 0, icon: '👕' }
        ],
        storeLinks: [
            { name: 'Jumia NG', url: 'https://www.jumia.com.ng/?aff_id=', id: 'allarbaa216-20', active: true, clicks: 0 },
            { name: 'Amazon Store', url: 'https://www.amazon.com/?tag=', id: '', active: false, clicks: 0 }
        ],
        videos: [
            { id: 1, title: 'Eminem - Houdini', videoUrl: 'https://www.youtube.com/embed/bkSJZwQF6I4', type: 'youtube' },
            { id: 2, title: 'Kendrick Lamar - Not Like Us', videoUrl: 'https://www.youtube.com/embed/H58vbez_m4E', type: 'youtube' },
            { id: 3, title: 'Taylor Swift - Cruel Summer', videoUrl: 'https://www.youtube.com/embed/ic8j13piAhQ', type: 'youtube' }
        ],
        successStories: [
            { id: 1, name: 'Ahmed from Kano', after: '$2,500/month', story: 'Ahmed was a civil servant earning N80,000/month. He started with Fiverr and added ClickBank. Today he owns a house and a car.', avatar: '👨‍💼', color: '#10b981' },
            { id: 2, name: 'Fatima from Cairo', after: '$1,800/month', story: 'Engineering student who started on Upwork. Now she supports her family.', avatar: '👩‍🎓', color: '#f59e0b' }
        ],
        socialFeed: [ { id: 1, text: "Welcome to the new Enterprise Hub!", date: new Date().toISOString() } ],
        blogPosts: [],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '', customHtml: '' },
        apiKeys: { openai: '', mailchimpKey: '' },
        subscribers: [],
        libraryUsers: [],
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into digital entrepreneurs. We believe financial freedom should be available to everyone.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER, who successfully built multiple businesses after years of failure. Now it serves thousands globally.'
        },
        privacyContent: { introduction: '3EESHER-CLOUD is committed to protecting your privacy. We safeguard all data securely.' }
    };
}

// ==================== 🛠️ ADMIN & BOTS ====================
function checkAdmin(req, res, next) { if (req.session.isSuperAdmin) return next(); res.redirect('/admin-login'); }

// Dynamic Rebrand Middleware
app.use((req, res, next) => {
    const data = getData();
    if (data.settings.maintenance && !req.session.isSuperAdmin && req.path !== '/admin-login' && req.path !== '/auth-admin') {
        return res.send('<h1>Site Under Maintenance</h1><p>The CEO is upgrading the hub. Back shortly.</p>');
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    res.locals.siteUrl = `${protocol}://${req.get('host')}`;
    res.locals.siteName = data.settings.siteName;
    next();
});

// Admin Actions
app.post('/admin/save-settings', checkAdmin, (req, res) => {
    const data = getData();
    data.settings.siteName = req.body.siteName;
    data.settings.maintenance = req.body.maintenance === 'on';
    data.settings.heroTitle = req.body.heroTitle;
    data.settings.heroDesc = req.body.heroDesc;
    saveData(data);
    res.send('<script>alert("Settings Applied!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-banner/:id', checkAdmin, upload.single('banner'), (req, res) => {
    const data = getData();
    data.settings[`banner${req.params.id}`] = `/uploads/${req.file.filename}`;
    saveData(data);
    res.send('<script>alert("Banner Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/create-status', checkAdmin, (req, res) => {
    const data = getData();
    data.socialFeed.unshift({ id: Date.now(), text: req.body.text, date: new Date().toISOString() });
    saveData(data); res.redirect('/super-admin');
});

// ==================== 🌐 FRONTEND HOMEPAGE (SOCIAL + HUB) ====================
app.get('/', (req, res) => {
    const data = getData(); const inj = data.injections;

    const vidHtml = data.videos.map(v => `<div class="card">${v.type==='youtube'?`<iframe src="${v.videoUrl}" style="width:100%;height:200px;border:none;"></iframe>`:`<video src="${v.videoUrl}" controls style="width:100%;height:200px;background:#000;"></video>`}<div style="padding:15px;"><h4>${v.title}</h4>${v.type==='local'?`<a href="/download/video/${v.id}" style="color:var(--highlight);font-size:12px;font-weight:bold;">⬇️ DOWNLOAD</a>`:''}</div></div>`).join('');
    const blogHtml = data.blogPosts.map(p => `<div class="card"><img src="${p.image}" class="card-img"><h3>${p.title}</h3><a href="/blog/${p.id}">Read Post →</a></div>`).join('');
    const linksHtml = data.moneyLinks.map(l => `<div class="m-link"><a href="${l.url}" onclick="fetch('/api/click/${l.name}')" target="_blank">${l.icon} ${l.name}</a></div>`).join('');
    const feedHtml = data.socialFeed.map(f => `<div style="background:#0f172a; padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #334155;"><p style="margin:0;">${f.text}</p><small style="color:#64748b;">${new Date(f.date).toLocaleString()}</small></div>`).join('');

    res.send(`<!DOCTYPE html><html lang="en"><head>
    <title>${data.settings.siteName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
    ${inj.head}
    <style>
        :root { --bg: #0a0f1e; --card: #1e293b; --highlight: #10b981; }
        body{background:var(--bg); color:#fff; font-family:sans-serif; margin:0;}
        header{padding:100px 5%; text-align:center; background:linear-gradient(rgba(16,185,129,0.1),#0a0f1e);}
        .logo{max-width:800px; width:95%; border-radius:20px; border:2px solid var(--highlight); box-shadow:0 15px 40px rgba(0,0,0,0.5);}
        .container{max-width:1200px; margin:0 auto; padding:20px;}
        .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px; margin-bottom:50px;}
        .card{background:var(--card); border-radius:15px; overflow:hidden; border:1px solid #334155; transition:0.3s;}
        .m-link{background:#0f172a; padding:15px; border-left:4px solid var(--highlight); margin-bottom:10px;}
        .m-link a{color:#fff; text-decoration:none; font-weight:bold; display:flex; align-items:center; gap:10px;}
        .wide-banner{width:100%; height:300px; object-fit:cover; border-radius:20px; margin:40px 0; border:1px solid #334155;}
        .toast{position:fixed; bottom:20px; left:-300px; background:var(--card); border:1px solid var(--highlight); padding:15px; border-radius:10px; transition:0.5s; z-index:999; display:flex; gap:10px;}
        .toast.show{left:20px;}
        .floating-wa{position:fixed; bottom:20px; right:20px; background:#25d366; color:#fff; width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:30px; box-shadow:0 10px 20px rgba(0,0,0,0.4); z-index:1000;}
        ${inj.css}
    </style></head>
<body>
    ${inj.bodyStart}
    <div style="background:#000; padding:10px; color:var(--highlight); text-align:center; font-family:monospace;">
        🚀 FATIMA MADE $120 | AHMED EARNED $47 | BTC $68K | WELCOME TO THE EMPIRE
    </div>

    <!-- TOP MENU -->
    <nav style="position:absolute; top:20px; right:20px;">
        <a href="/library" style="color:var(--highlight); font-weight:bold; margin-right:15px;">📚 LIBRARY</a>
        <a href="/admin-login" style="color:#fbbf24; font-weight:bold;">⚙️ ADMIN</a>
    </nav>

    <header>
        <img src="${data.settings.logoUrl}" class="logo">
        <h1 style="font-size:3.5rem; margin:20px 0;">${data.settings.siteName}</h1>
        <div style="max-width:800px; margin:0 auto; background:rgba(0,0,0,0.5); padding:30px; border-radius:20px; text-align:left;">
            <h2 style="color:var(--highlight);">${data.settings.heroTitle}</h2>
            <p style="font-size:18px;">${data.settings.heroDesc}</p>
        </div>
    </header>

    <div class="container">
        <!-- SOCIAL STATUS FEED -->
        <h2 style="color:#fbbf24;">⚡ Status Updates</h2>
        <div style="max-width:600px; margin-bottom:50px;">${feedHtml}</div>

        <h2>🎬 Persistent Training & Music</h2><div class="grid">${vidHtml}</div>
        <img src="${data.settings.banner1}" class="wide-banner">

        <h2>💰 30 Verified Money Links</h2><div class="grid">${linksHtml}</div>
        <img src="${data.settings.banner2}" class="wide-banner">

        <h2>📝 Manual Blogs</h2><div class="grid">${blogHtml}</div>
        <img src="${data.settings.banner3}" class="wide-banner">

        <h2>🏆 Success Stories</h2>
        <div class="grid">
            ${data.successStories.map(s => `<div class="card" style="padding:20px; border-top:4px solid ${s.color};"><h4>${s.avatar} ${s.name}</h4><p style="color:var(--highlight);font-weight:bold;">${s.after}</p><p style="font-size:14px;">${s.story}</p></div>`).join('')}
        </div>
    </div>

    <a href="https://wa.me/2348080336353" class="floating-wa" target="_blank">💬</a>
    <div class="toast" id="earnToast">💰 <div id="toastText">Someone earned $50!</div></div>
    <script>
        setInterval(() => {
            document.getElementById('earnToast').classList.add('show');
            setTimeout(() => document.getElementById('earnToast').classList.remove('show'), 5000);
        }, 15000);
        ${inj.js}
    </script>
</body></html>`);
});

// ==================== 💻 ADMIN COMMAND CENTER ====================
app.get('/super-admin', checkAdmin, (req, res) => {
    const data = getData();
    res.send(`<!DOCTYPE html><html><head><title>CEO MASTER ADMIN</title><style>
    body{display:flex;background:#0f172a;color:#e2e8f0;font-family:sans-serif;margin:0;}
    .sidebar{width:260px;background:#1e293b;padding:20px;height:100vh;border-right:1px solid #334155;}
    .sidebar a{display:block;color:#94a3b8;padding:12px;text-decoration:none;cursor:pointer;border-radius:8px;}
    .sidebar a:hover, .sidebar a.active{background:#10b981;color:#000;}
    .main{flex:1;padding:40px;overflow-y:auto;}
    .panel{display:none;background:#1e293b;padding:30px;border-radius:12px;}
    .panel.active{display:block;}
    textarea, input{width:100%; background:#0f172a; color:#fff; border:1px solid #334155; margin-bottom:15px; padding:10px; border-radius:5px;}
    button{background:#10b981; color:#000; font-weight:bold; padding:15px; border:none; cursor:pointer; border-radius:5px;}
    </style></head><body>
    <div class="sidebar">
        <h2>CEO EMPIRE</h2>
        <a onclick="show('dash')" class="active">💻 Dashboard</a>
        <a onclick="show('rebrand')">🎨 Rebrand & Banners</a>
        <a onclick="show('feed')">⚡ Status Updates</a>
        <a onclick="show('blog')">📝 Blogs</a>
        <a onclick="show('video')">🎬 Videos</a>
        <a onclick="show('inject')">🔌 Injectors</a>
        <a onclick="show('users')">👤 User Manager</a>
        <a href="/">🌐 View Site</a>
    </div>
    <div class="main">
        <div id="dash" class="panel active"><h3>Persistent Disk: ON (/data)</h3><p>Registered Users: ${data.libraryUsers.length}</p></div>
        <div id="rebrand" class="panel">
            <form action="/admin/save-settings" method="POST">
                <label>Site Name</label><input name="siteName" value="${data.settings.siteName}">
                <label>Hero Title</label><input name="heroTitle" value="${data.settings.heroTitle}">
                <label>Hero Desc</label><textarea name="heroDesc">${data.settings.heroDesc}</textarea>
                <button>Update Branding</button>
            </form>
            <hr><p>Upload Banners (3 Separate)</p>
            <form action="/admin/upload-banner/1" method="POST" enctype="multipart/form-data"><input type="file" name="banner"><button>Update Banner 1</button></form>
            <form action="/admin/upload-banner/2" method="POST" enctype="multipart/form-data"><input type="file" name="banner"><button>Update Banner 2</button></form>
            <form action="/admin/upload-banner/3" method="POST" enctype="multipart/form-data"><input type="file" name="banner"><button>Update Banner 3</button></form>
        </div>
        <div id="feed" class="panel"><h3>Social Status Wall</h3><form action="/admin/create-status" method="POST"><textarea name="text" placeholder="What's happening?"></textarea><button>Post Update</button></form></div>
        <div id="users" class="panel"><h3>Registered Library Users</h3><table>${data.libraryUsers.map(u=>`<tr><td>${u.name}</td><td>${u.email}</td></tr>`).join('')}</table></div>
    </div>
    <script>function show(id){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active')); document.getElementById(id).classList.add('active');}</script>
</body></html>`);
});

// Click Analytics
app.get('/api/click/:name', (req, res) => {
    const data = getData(); const l = data.moneyLinks.find(x=>x.name===req.params.name);
    if(l) { l.clicks++; saveData(data); } res.sendStatus(200);
});

// Rest of original Auth, Library, Blog routes...
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 EMPIRE PROJECT READY ON PORT ${PORT}`));
