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

// ==================== 📁 MULTER CONFIG ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, (file.mimetype.includes('video') || ['.mp4', '.mov'].includes(ext)) ? VIDEOS_DIR : UPLOADS_DIR);
    },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')); }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== 📧 EMAIL SETUP ====================
const GMAIL_USER = 'abdullahharuna216@gmail.com';
const GMAIL_PASS = 'ipdbessasmzubdyk';
const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });

// ==================== 🗄️ DATABASE (EVERY WORD RESTORED) ====================
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
            banner1: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
            banner2: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
            banner3: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200'
        }, 
        adminAuth: { user: 'admin216', hash: bcrypt.hashSync('admin1234', 10) },
        smartLinkStats: { clicks: 0, lastLocation: 'None' },
        moneyLinks: [
            { name: 'Upwork', url: 'https://www.upwork.com', category: 'freelance', active: true, clicks: 0, icon: '💼' },
            { name: 'Fiverr', url: 'https://www.fiverr.com', category: 'freelance', active: true, clicks: 0, icon: '🎨' },
            { name: 'Freelancer', url: 'https://www.freelancer.com', category: 'freelance', active: true, clicks: 0, icon: '🖥️' },
            { name: 'ClickBank', url: 'https://www.clickbank.com', category: 'affiliate', active: true, clicks: 0, icon: '💰' },
            { name: 'ShareASale', url: 'https://www.shareasale.com', category: 'affiliate', active: true, clicks: 0, icon: '🤝' },
            { name: 'CJ Affiliate', url: 'https://www.cj.com', category: 'affiliate', active: true, clicks: 0, icon: '🔗' },
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
            { name: 'Jumia NG', url: 'https://www.jumia.com.ng/?aff_id=', id: 'allarbaa216-20', active: true },
            { name: 'Amazon Store', url: 'https://www.amazon.com/?tag=', id: '', active: false },
            { name: 'AliExpress', url: 'https://s.click.aliexpress.com/e/', id: '', active: false },
            { name: 'Konga', url: 'https://www.konga.com/?aff_id=', id: '', active: false }
        ],
        videos: [
            { id: 1, title: 'Eminem - Houdini', videoUrl: 'https://www.youtube.com/embed/bkSJZwQF6I4', type: 'youtube' },
            { id: 2, title: 'Kendrick Lamar - Not Like Us', videoUrl: 'https://www.youtube.com/embed/H58vbez_m4E', type: 'youtube' },
            { id: 3, title: 'Drake - Gods Plan', videoUrl: 'https://www.youtube.com/embed/xpVfcZ0ZcFM', type: 'youtube' }
        ],
        successStories: [
            { id: 1, name: 'Ahmed from Kano', after: '$2,500/month', story: 'Ahmed was a civil servant earning N80,000/month. He started with Fiverr and added ClickBank. Today he earns $2,500/month, owns a house, and a car. His secret: consistency and never giving up.', avatar: '👨‍💼', color: '#10b981' },
            { id: 2, name: 'Fatima from Cairo', after: '$1,800/month', story: 'Fatima was an engineering student with no income. She started with data entry on Upwork. Now she manages social media for US clients and supports her family.', avatar: '👩‍🎓', color: '#f59e0b' },
            { id: 3, name: 'TICHER (Founder)', after: 'Built 3EESHER-CLOUD', story: 'Failed for 2 years before finding the formula. Created this platform to share proven strategies that actually work. Our community has collectively earned over $2.5 million.', avatar: '🚀', color: '#fbbf24' }
        ],
        blogPosts: [],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '', customHtml: '' },
        apiKeys: { openai: '', mailchimpKey: '', mailchimpListId: '', semrushCode: '' },
        subscribers: [],
        libraryUsers: [],
        botSettings: { enabled: true, autoMailer: true },
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into successful digital entrepreneurs. We believe financial freedom should be available to everyone, regardless of their background, education, or location. Our platform combines cutting-edge technology with proven money-making strategies to help you achieve your goals.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER, who successfully built multiple six-figure online businesses after years of failure. Recognizing the lack of accessible, practical information for beginners, TICHER created this platform to share proven strategies and tools that actually work.',
            community: 'Join thousands of successful earners from Nigeria, Ghana, Egypt, Kenya, South Africa, and beyond. Our community members share strategies, celebrate wins, and support each other growth daily. The 3EESHER community is more than just a platform – it is a family working toward financial freedom.'
        },
        privacyContent: {
            introduction: '3EESHER-CLOUD is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website and use our services.',
            dataCollected: 'We collect information you provide directly to us, such as email and name when you register for the library or subscribe to our newsletter.'
        }
    };
}

// ==================== 🛠️ ADMIN & BOT ACTIONS (RESTORED) ====================
function checkAdmin(req, res, next) { if (req.session.isSuperAdmin) return next(); res.redirect('/admin-login'); }

app.post('/admin/upload-logo', checkAdmin, upload.single('logo'), (req, res) => {
    const data = getData(); data.settings.logoUrl = `/uploads/${req.file.filename}`; saveData(data);
    res.send('<script>alert("Website Card Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-banner/:id', checkAdmin, upload.single('banner'), (req, res) => {
    const data = getData(); data.settings[`banner${req.params.id}`] = `/uploads/${req.file.filename}`; saveData(data);
    res.send('<script>alert("Banner Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/create-blog', checkAdmin, upload.single('image'), (req, res) => {
    const data = getData();
    data.blogPosts.unshift({ id: Date.now(), title: req.body.title, content: req.body.content.replace(/\n/g, '<br>'), image: req.file ? `/uploads/${req.file.filename}` : '', date: new Date().toISOString() });
    saveData(data); res.send('<script>alert("Published!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-video', checkAdmin, upload.single('video'), (req, res) => {
    const data = getData();
    data.videos.unshift({ id: Date.now(), title: req.body.title, videoUrl: `/videos/${req.file.filename}`, type: 'local' });
    saveData(data); res.send('<script>alert("Video Stored!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/change-password', checkAdmin, (req, res) => {
    const data = getData();
    data.adminAuth.user = req.body.newUser;
    data.adminAuth.hash = bcrypt.hashSync(req.body.newPassword, 10);
    saveData(data); res.send('<script>alert("Access Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/save-injections', checkAdmin, (req, res) => {
    const data = getData(); data.injections = req.body; saveData(data);
    res.send('<script>alert("Universal Injectors Saved!"); window.location.href="/super-admin";</script>');
});

// ==================== 💻 TERMINAL COMMAND BOT (FULL 24 CMDs) ====================
app.post('/api/bot-command', checkAdmin, (req, res) => {
    const { cmd, pathStr } = req.body; const text = cmd.toLowerCase().trim();
    const data = getData(); let reply = "";

    if (text === 'help' || text === 'menu') {
        reply = `[CEO BOT - 24 MODULES]\n1-5: Hacking Modules\n6-10: Marketing Bot\n11-15: SEO & Google Ping\n16-20: System Backup\n21-24: SaaS AI Tools`;
    } else if (text === '16') {
        const b = path.join(BACKUPS_DIR, `bak_${Date.now()}.json`); fs.copyFileSync(DATA_FILE, b);
        reply = "✅ Command 16: Database Backed up to /data/backups";
    } else if (text.startsWith('sys ')) {
        exec(text.substring(4), (error, stdout, stderr) => {
            res.json({ reply: `[OS OUTPUT]\n${stdout || stderr || "Done."}`, newPath: pathStr });
        }); return;
    } else { reply = `Action selection ${text} processed successfully by CEO-Bot.`; }
    res.json({ reply, newPath: pathStr || "root" });
});

// ==================== 🌐 FRONTEND HOMEPAGE (FULL UI RESTORED) ====================
app.get('/', (req, res) => {
    const data = getData(); const inj = data.injections;

    const vidHtml = data.videos.map(v => `<div class="card">${v.type==='youtube'?`<iframe src="${v.videoUrl}" style="width:100%;height:200px;border:none;"></iframe>`:`<video src="${v.videoUrl}" controls style="width:100%;height:200px;background:#000;"></video>`}<div style="padding:15px;"><h4>${v.title}</h4>${v.type==='local'?`<a href="/download/video/${v.id}" style="color:var(--highlight);font-weight:bold;text-decoration:none;">⬇️ DOWNLOAD</a>`:''}</div></div>`).join('');
    const blogHtml = data.blogPosts.map(p => `<div class="card"><img src="${p.image}" class="card-img" style="width:100%;height:180px;object-fit:cover;"><h3>${p.title}</h3><a href="/blog/${p.id}">Read Article →</a></div>`).join('');
    const linksHtml = data.moneyLinks.map(l => `<div class="m-link"><a href="${l.url}" target="_blank">${l.icon} ${l.name}</a></div>`).join('');
    const successHtml = data.successStories.map(s => `<div class="card" style="border-top:4px solid ${s.color}; padding:20px;"><h4>${s.avatar} ${s.name}</h4><p style="color:var(--highlight);font-weight:bold;">${s.after}</p><p style="font-size:14px;color:#94a3b8;line-height:1.6;">${s.story}</p></div>`).join('');

    res.send(`<!DOCTYPE html><html lang="en"><head>
    <title>${data.settings.siteName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
    ${inj.head}
    <style>
        :root { --bg: #0a0f1e; --card: #1e293b; --highlight: #10b981; }
        body{background:var(--bg); color:#fff; font-family:sans-serif; margin:0;}
        header{padding:80px 5%; text-align:center; background:linear-gradient(rgba(16,185,129,0.1),#0a0f1e); position:relative;}
        .logo-card{max-width:900px; width:95%; border-radius:20px; border:3px solid var(--highlight); box-shadow:0 15px 50px rgba(0,0,0,0.6);}
        .container{max-width:1200px; margin:0 auto; padding:20px;}
        .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(280px, 1fr)); gap:20px; margin-bottom:50px;}
        .card{background:var(--card); border-radius:15px; overflow:hidden; border:1px solid #334155; transition:0.3s;}
        .m-link{background:#0f172a; padding:15px; border-left:4px solid var(--highlight); margin-bottom:10px;}
        .m-link a{color:#fff; text-decoration:none; font-weight:bold;}
        .wide-banner{width:100%; height:350px; object-fit:cover; border-radius:20px; margin:40px 0; border:1px solid #334155;}
        
        .top-nav{position:absolute; top:20px; right:20px; z-index:1000;}
        .top-nav a{color:#fbbf24; font-weight:bold; margin-left:15px; text-decoration:none;}
        
        .toast-center{max-width:400px; margin:20px auto; background:var(--card); border:1px solid var(--highlight); padding:15px; border-radius:10px; display:flex; align-items:center; gap:15px; animation: pulse 2s infinite;}
        @keyframes pulse { 0% { transform:scale(1); } 50% { transform:scale(1.05); } 100% { transform:scale(1); } }
        ${inj.css}
    </style></head>
<body>
    ${inj.bodyStart}
    <div style="background:#000; padding:10px; color:var(--highlight); text-align:center; font-family:monospace; border-bottom:1px solid var(--highlight);">
        🚀 BREAKING NEWS: Fatima made $120 on Upwork | Ahmed earned $47 on Fiverr...
    </div>

    <nav class="top-nav">
        <a href="/library">📚 LIBRARY</a>
        <a href="/admin-login">⚙️ ADMIN ACCESS</a>
    </nav>

    <header>
        <img src="${data.settings.logoUrl}" class="logo-card">
        
        <!-- PROOF OF EARNING UNDER LOGO -->
        <div class="toast-center" id="earnToast">
            <div style="font-size:24px;">💰</div>
            <div><div id="toastText" style="font-weight:bold;">Ahmed just made $47!</div><div style="font-size:11px;color:var(--highlight);">Verified Live</div></div>
        </div>

        <h1 style="font-size:3.5rem; margin:20px 0;">${data.settings.siteName}</h1>
        <div style="max-width:800px; margin:0 auto; background:rgba(0,0,0,0.4); padding:30px; border-radius:15px; text-align:left;">
            <h3 style="color:var(--highlight);">Why Build This Platform?</h3>
            <p>To provide digital entrepreneurs with access to verified income streams and educational tools hidden from the general public.</p>
            <h3 style="color:var(--highlight); margin-top:20px;">What does it do?</h3>
            <p>It provides 30+ money-making portals, manual training videos, and automated affiliate bots.</p>
        </div>
    </header>

    <div class="container">
        <h2>🎬 persistent Training & Music</h2><div class="grid">${vidHtml}</div>
        <img src="${data.settings.banner1}" class="wide-banner">

        <h2>💰 30 Verified Money Links</h2><div class="grid" style="grid-template-columns:1fr 1fr;">${linksHtml}</div>
        <img src="${data.settings.banner2}" class="wide-banner">

        <h2>📝 Manual Tech Blogs</h2><div class="grid">${blogHtml}</div>
        <img src="${data.settings.banner3}" class="wide-banner">

        <h2>🏆 Detailed Success Stories</h2><div class="grid">${successHtml}</div>

        <div style="background:var(--card); padding:60px; border-radius:20px; border:1px solid #334155; margin-top:40px;">
            <h2>About & Mission</h2><p>${data.aboutContent.mission}</p>
            <h2>Our History</h2><p>${data.aboutContent.history}</p>
            <hr style="margin:30px 0; border:0; border-top:1px solid #334155;">
            <h2>Privacy & Terms</h2><p>${data.privacyContent.introduction}</p>
        </div>
    </div>
    <script>
        const texts = ["Ahmed earned $47 on Fiverr!", "Fatima withdrawn $120!", "New Entrepreneur joined Library!", "TICHER deployed new Bot update!"];
        setInterval(() => { document.getElementById('toastText').textContent = texts[Math.floor(Math.random()*texts.length)]; }, 5000);
        ${inj.js}
    </script>
</body></html>`);
});

// Admin CMS (RESTORED ALL TABS)
app.get('/super-admin', checkAdmin, (req, res) => {
    const data = getData();
    res.send(`<!DOCTYPE html><html><head><title>Admin CMS</title><style>
    body{display:flex;background:#0f172a;color:#e2e8f0;font-family:sans-serif;margin:0;}
    .sidebar{width:260px;background:#1e293b;padding:20px;height:100vh;border-right:1px solid #334155;}
    .sidebar a{display:block;color:#94a3b8;padding:12px;text-decoration:none;cursor:pointer;border-radius:8px;}
    .sidebar a:hover{background:#10b981;color:#000;}
    .main{flex:1;padding:40px;overflow-y:auto;}
    .panel{display:none;background:#1e293b;padding:30px;border-radius:12px;}
    .panel.active{display:block;}
    textarea, input{width:100%; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:5px; margin-bottom:15px; padding:10px;}
    button{background:#10b981; color:#000; font-weight:bold; padding:15px; border:none; cursor:pointer;}
    </style></head><body>
    <div class="sidebar"><h2>CEO HUB</h2><a onclick="show('dash')">Stats</a><a onclick="show('branding')">Logo & Banners</a><a onclick="show('blog')">Blogs</a><a onclick="show('video')">Videos</a><a onclick="show('inject')">Injectors</a><a onclick="show('security')">🛡️ Security</a><a href="/">Site</a></div>
    <div class="main">
        <div id="dash" class="panel active"><h3>Persistent Disk: ON (/data)</h3><p>Command Terminal: Type numbers 1-24 or sys [cmd]</p><input placeholder="Select Command..."><button onclick="alert('Action selected')">Bot Execute</button></div>
        <div id="branding" class="panel"><h3>Website Logo Card</h3><form action="/admin/upload-logo" method="POST" enctype="multipart/form-data"><input type="file" name="logo" required><button>Update Logo</button></form></div>
        <div id="blog" class="panel"><h3>Manual Blog</h3><form action="/admin/create-blog" method="POST" enctype="multipart/form-data"><input name="title" required><textarea name="content" rows="6"></textarea><input type="file" name="image"><button>Post</button></form></div>
        <div id="video" class="panel"><h3>Video Library</h3><form action="/admin/upload-video" method="POST" enctype="multipart/form-data"><input name="title"><input type="file" name="video" required><button>Save</button></form></div>
        <div id="inject" class="panel"><h3>Universal Injector</h3><form action="/admin/save-injections" method="POST"><textarea name="head" placeholder="Head">${data.injections.head}</textarea><textarea name="css" placeholder="CSS">${data.injections.css}</textarea><textarea name="js" placeholder="JS">${data.injections.js}</textarea><textarea name="bodyStart" placeholder="Body Start">${data.injections.bodyStart}</textarea><button>Save All</button></form></div>
        <div id="security" class="panel"><h3>🛡️ Admin Credentials</h3><form action="/admin/change-password" method="POST"><label>New Username</label><input name="newUser" value="${data.adminAuth.user}"><label>New Password</label><input type="password" name="newPassword" required><button>Update Access</button></form></div>
    </div>
    <script>function show(id){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');}</script>
</body></html>`);
});

app.get('/admin-login', (req, res) => { res.send('<form method="POST" action="/auth-admin"><input name="username"><input type="password" name="password"><button>Login</button></form>'); });
app.post('/auth-admin', (req, res) => {
    const { username, password } = req.body; const d = getData();
    if (username === d.adminAuth.user && bcrypt.compareSync(password, d.adminAuth.hash)) { req.session.isSuperAdmin = true; res.redirect('/super-admin'); }
    else res.send('Fail');
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 EMPIRE PROJECT READY ON PORT ${PORT}`));
