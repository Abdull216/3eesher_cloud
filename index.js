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
app.use('/backups', express.static(BACKUPS_DIR));

// ==================== 🌐 DYNAMIC URL & SECURITY ====================
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
    secret: '3eesher_empire_ultimate_shield_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== 🎬 INSTANT VIDEO STREAMING ====================
app.get('/stream/video/:id', (req, res) => {
    const data = getData();
    const video = data.videos.find(v => v.id == req.params.id);
    if (!video || video.type !== 'local') return res.status(404).send('Missing');
    const videoPath = path.join(DISK_PATH, video.videoUrl);
    if (!fs.existsSync(videoPath)) return res.status(404).send('Not Found');
    const stat = fs.statSync(videoPath);
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': (end - start) + 1, 'Content-Type': 'video/mp4' });
        fs.createReadStream(videoPath, { start, end }).pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'video/mp4' });
        fs.createReadStream(videoPath).pipe(res);
    }
});

// ==================== 📁 MULTER ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, (file.mimetype.includes('video') || ['.mp4', '.mov'].includes(ext)) ? VIDEOS_DIR : UPLOADS_DIR);
    },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')); }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== 🗄️ DATABASE (EVERYTHING RESTORED 100%) ====================
function getData() {
    try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}
    const defaults = getDefaultData(); saveData(defaults); return defaults;
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

function getDefaultData() {
    return {
        settings: { 
            logoUrl: 'https://images.unsplash.com/photo-1614064641936-a5926c8b939c?w=1200', 
            siteName: '3EESHER-CLOUD',
            banner1: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
            banner2: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
            banner3: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200'
        }, 
        adminAuth: { user: 'admin216', hash: bcrypt.hashSync('admin1234', 10) },
        moneyLinks: [
            { name: 'Upwork', url: 'https://www.upwork.com', active: true, icon: '💼' },
            { name: 'Fiverr', url: 'https://www.fiverr.com', active: true, icon: '🎨' },
            { name: 'Freelancer', url: 'https://www.freelancer.com', active: true, icon: '🖥️' },
            { name: 'ClickBank', url: 'https://www.clickbank.com', active: true, icon: '💰' },
            { name: 'ShareASale', url: 'https://www.shareasale.com', active: true, icon: '🤝' },
            { name: 'CJ Affiliate', url: 'https://www.cj.com', active: true, icon: '🔗' },
            { name: 'Rakuten', url: 'https://www.rakuten.com', active: true, icon: '🇯🇵' },
            { name: 'Amazon Associates', url: 'https://affiliate-program.amazon.com', active: true, icon: '📦' },
            { name: 'eBay Partner', url: 'https://www.ebaypartnernetwork.com', active: true, icon: '🏷️' },
            { name: 'Etsy Affiliate', url: 'https://www.etsy.com/affiliates', active: true, icon: '🎁' },
            { name: 'Shopify Affiliate', url: 'https://www.shopify.com/affiliates', active: true, icon: '🛒' },
            { name: 'Teachable', url: 'https://teachable.com', active: true, icon: '📝' },
            { name: 'Udemy', url: 'https://www.udemy.com', active: true, icon: '📚' },
            { name: 'Coursera', url: 'https://www.coursera.org', active: true, icon: '🎓' },
            { name: 'Skillshare', url: 'https://www.skillshare.com', active: true, icon: '✂️' },
            { name: 'YouTube', url: 'https://www.youtube.com/creators/', active: true, icon: '🎬' },
            { name: 'TikTok', url: 'https://www.tiktok.com/creators/', active: true, icon: '📱' },
            { name: 'Instagram', url: 'https://creators.instagram.com', active: true, icon: '📸' },
            { name: 'Facebook', url: 'https://www.facebook.com/creators', active: true, icon: '👥' },
            { name: 'Medium', url: 'https://medium.com/creators', active: true, icon: '✍️' },
            { name: 'Substack', url: 'https://substack.com', active: true, icon: '📧' },
            { name: 'Rev', url: 'https://www.rev.com/freelancers', active: true, icon: '🎤' },
            { name: 'UserTesting', url: 'https://www.usertesting.com', active: true, icon: '✅' },
            { name: 'Swagbucks', url: 'https://www.swagbucks.com', active: true, icon: '🎁' },
            { name: 'Survey Junkie', url: 'https://www.surveyjunkie.com', active: true, icon: '📊' },
            { name: 'Appen', url: 'https://appen.com', active: true, icon: '🤖' },
            { name: 'Remotasks', url: 'https://www.remotasks.com', active: true, icon: '⚙️' },
            { name: 'Amazon KDP', url: 'https://kdp.amazon.com', active: true, icon: '📖' },
            { name: 'Redbubble', url: 'https://www.redbubble.com', active: true, icon: '👕' },
            { name: 'Teespring', url: 'https://teespring.com', active: true, icon: '🛍️' }
        ],
        storeLinks: [
            { name: 'Jumia NG', url: 'https://www.jumia.com.ng/?aff_id=', id: 'allarbaa216-20', active: true },
            { name: 'Amazon Store', url: 'https://www.amazon.com/?tag=', id: '', active: true },
            { name: 'eBay Store', url: 'https://www.ebay.com/?campid=', id: '', active: true }
        ],
        videos: [
            { id: 1, title: 'Eminem - Houdini', videoUrl: 'https://www.youtube.com/embed/bkSJZwQF6I4', type: 'youtube' },
            { id: 2, title: 'Kendrick Lamar - Not Like Us', videoUrl: 'https://www.youtube.com/embed/H58vbez_m4E', type: 'youtube' },
            { id: 3, title: 'Taylor Swift - Cruel Summer', videoUrl: 'https://www.youtube.com/embed/ic8j13piAhQ', type: 'youtube' },
            { id: 4, title: 'Drake - Gods Plan', videoUrl: 'https://www.youtube.com/embed/xpVfcZ0ZcFM', type: 'youtube' },
            { id: 5, title: 'The Weeknd - Blinding Lights', videoUrl: 'https://www.youtube.com/embed/4NRXx6U8ABQ', type: 'youtube' },
            { id: 6, title: 'Bruno Mars - 24K Magic', videoUrl: 'https://www.youtube.com/embed/UqyT8IEBkvY', type: 'youtube' },
            { id: 7, title: 'Ed Sheeran - Shape of You', videoUrl: 'https://www.youtube.com/embed/JGwWNGJdvx8', type: 'youtube' },
            { id: 8, title: 'Post Malone - Sunflower', videoUrl: 'https://www.youtube.com/embed/ApXoWvfEYVU', type: 'youtube' },
            { id: 9, title: 'Doja Cat - Paint The Town Red', videoUrl: 'https://www.youtube.com/embed/Cwgg0FkqLr0', type: 'youtube' },
            { id: 10, title: 'Miley Cyrus - Flowers', videoUrl: 'https://www.youtube.com/embed/G7KNmW9a75Y', type: 'youtube' }
        ],
        successStories: [
            { id: 1, name: 'Ahmed from Kano', after: '$2,500/month', story: 'Ahmed was a civil servant earning N80,000/month. He started with Fiverr doing logo design. By month 3, he reached $1,200. Today he earns $2,500/month, owns a house and a car. His secret: consistency and never giving up.', avatar: '👨‍💼', color: '#10b981' },
            { id: 2, name: 'Fatima from Cairo', after: '$1,800/month', story: 'Fatima was an engineering student with no income. She started with data entry on Upwork. Now she manages social media for US clients and supports her family. She is a top-rated freelancer.', avatar: '👩‍🎓', color: '#f59e0b' },
            { id: 3, name: 'TICHER (Founder)', after: 'Built 3EESHER-CLOUD', story: 'Failed for 2 years before finding the formula to digital wealth. Created this platform to share proven strategies and tools that actually work. Our community has collectively earned over $2.5 million.', avatar: '🚀', color: '#fbbf24' }
        ],
        blogPosts: [],
        contracts: [ { title: "Digital Service Agreement", content: "By using this platform, you agree to our professional business terms and fair usage of digital resources." } ],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '', customHtml: '' },
        apiKeys: { openai: '', gmailSecret: 'ipdbessasmzubdyk' },
        libraryUsers: [],
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into successful digital entrepreneurs. We believe financial freedom should be available to everyone, regardless of their background, education, or location. Our platform combines cutting-edge technology with proven money-making strategies to help you achieve your goals.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER, who successfully built multiple six-figure online businesses after years of failure. Recognizing the lack of accessible information, TICHER created this platform to share proven strategies and tools that actually work. Our community has collectively earned over $2.5 million.'
        },
        privacyContent: {
            introduction: '3EESHER-CLOUD is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website and use our services.',
            details: 'We collect information you provide directly to us, such as email and name when you register for the library. We also automatically collect IP addresses and browser types to improve your experience.'
        }
    };
}

// ==================== 🛠️ ADMIN & USER AUTH ====================
function checkAdmin(req, res, next) { if (req.session.isSuperAdmin) return next(); res.redirect('/admin-login'); }

app.post('/admin/change-password', checkAdmin, (req, res) => {
    const data = getData();
    data.adminAuth.user = req.body.newUser;
    data.adminAuth.hash = bcrypt.hashSync(req.body.newPassword, 10);
    saveData(data);
    res.send('<script>alert("CEO Credentials Updated Permanently!"); window.location.href="/super-admin";</script>');
});

app.post('/api/library/register', (req, res) => {
    const data = getData();
    data.libraryUsers.push({ name: req.body.name, email: req.body.email, pass: bcrypt.hashSync(req.body.password, 10) });
    saveData(data);
    req.session.libUser = { name: req.body.name, email: req.body.email };
    res.redirect('/library');
});

// ==================== 🌐 FRONTEND HOMEPAGE (FULL UI RESTORED) ====================
app.get('/', (req, res) => {
    const data = getData(); const inj = data.injections;

    const vidHtml = data.videos.map(v => `<div class="card">${v.type==='youtube'?`<iframe src="${v.videoUrl}" style="width:100%;height:200px;border:none;"></iframe>`:`<video src="/stream/video/${v.id}" controls style="width:100%;height:200px;background:#000;"></video>`}<div style="padding:15px;"><h4>${v.title}</h4></div></div>`).join('');
    const blogHtml = data.blogPosts.map(p => `<div class="card"><img src="${p.image}" class="card-img"><h3>${p.title}</h3><a href="/blog/${p.id}">Read Article →</a></div>`).join('');
    const linksHtml = data.moneyLinks.map(l => `<div class="m-link"><a href="${l.url}" target="_blank">${l.icon} ${l.name}</a></div>`).join('');

    res.send(`<!DOCTYPE html><html lang="en"><head>
    <title>${data.settings.siteName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
    ${inj.head}
    <style>
        :root { --bg: #0a0f1e; --card: #1e293b; --highlight: #10b981; }
        body{background:var(--bg); color:#fff; font-family:sans-serif; margin:0;}
        .navbar{position:sticky; top:0; background:rgba(15,23,42,0.9); backdrop-filter:blur(10px); padding:15px 5%; display:flex; justify-content:space-between; align-items:center; z-index:1000; border-bottom:1px solid #334155;}
        .navbar a{color:#fff; text-decoration:none; font-weight:bold; margin-left:20px;}
        header{padding:80px 5%; text-align:center; background:linear-gradient(rgba(16,185,129,0.1),#0a0f1e);}
        .logo-card{max-width:950px; width:95%; border-radius:30px; border:4px solid var(--highlight); box-shadow:0 20px 60px rgba(0,0,0,0.7);}
        .container{max-width:1200px; margin:0 auto; padding:20px;}
        .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(280px, 1fr)); gap:25px; margin-bottom:50px;}
        .card{background:var(--card); border-radius:15px; overflow:hidden; border:1px solid #334155; transition:0.3s;}
        .card-img{width:100%;height:180px;object-fit:cover;}
        .m-link{background:#0f172a; padding:15px; border-left:4px solid var(--highlight); margin-bottom:10px; transition:0.3s;}
        .wide-banner{width:100%; height:350px; object-fit:cover; border-radius:20px; margin:40px 0; border:1px solid #334155;}
        
        /* SPECIAL CTA FOR LIBRARY */
        .lib-cta{background:linear-gradient(45deg, #10b981, #3b82f6); padding:50px; border-radius:20px; text-align:center; margin:50px 0; border:2px solid #fff; box-shadow:0 0 30px rgba(16,185,129,0.4);}
        .lib-btn{background:#fbbf24; color:#000; padding:18px 40px; border-radius:40px; font-weight:900; text-decoration:none; display:inline-block; font-size:20px; margin-top:20px;}
        
        ${inj.css}
    </style></head>
<body>
    <nav class="navbar">
        <div style="font-size:20px;font-weight:900;color:var(--highlight);">${data.settings.siteName}</div>
        <div><a href="/">HOME</a><a href="/library" style="color:#fbbf24;">📚 LIBRARY</a><a href="/admin-login">⚙️ CEO</a></div>
    </nav>

    <header>
        <img src="${data.settings.logoUrl}" class="logo-card">
        <h1 style="font-size:3.5rem; margin:30px 0;">${data.settings.siteName}</h1>
        <div style="max-width:800px; margin:0 auto; background:rgba(0,0,0,0.5); padding:40px; border-radius:20px; text-align:left;">
            <h3 style="color:var(--highlight);">Digital Education Hub</h3>
            <p style="font-size:18px; line-height:1.7;">Empowering the next generation of digital entrepreneurs with verified tools and education.</p>
        </div>
    </header>

    <div class="container">
        <h2 style="color:#fbbf24; border-bottom:2px solid var(--highlight);">🎬 persistent Videos</h2>
        <div class="grid">${vidHtml}</div>

        <img src="${data.settings.banner1}" class="wide-banner">

        <h2 style="color:#fbbf24; border-bottom:2px solid var(--highlight);">📝 Manual Tech Blogs</h2>
        <div class="grid">${blogHtml}</div>

        <!-- RESTORED SPECIAL CTA BANNER -->
        <div class="lib-cta">
            <h1>📚 UNLOCK PREMIUM DIGITAL KNOWLEDGE</h1>
            <p style="font-size:18px;">Register now to read thousands of premium Google Books on AI, Coding, and Wealth for FREE.</p>
            <a href="/library" class="lib-btn">GET FREE ACCESS NOW →</a>
        </div>

        <img src="${data.settings.banner2}" class="wide-banner">

        <h2 style="color:#fbbf24; border-bottom:2px solid var(--highlight);">💰 30 Verified Money Links</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:50px;">${linksHtml}</div>

        <img src="${data.settings.banner3}" class="wide-banner">

        <h2 style="color:#fbbf24; border-bottom:2px solid var(--highlight);">🏆 Success Stories</h2>
        <div class="grid">
            ${data.successStories.map(s => `<div class="card" style="padding:25px; border-top:4px solid ${s.color};"><h4>${s.avatar} ${s.name}</h4><p style="color:var(--highlight);font-weight:bold;">${s.after}</p><p style="font-size:14px;color:#94a3b8;">${s.story}</p></div>`).join('')}
        </div>

        <h2 style="color:#fbbf24; border-bottom:2px solid var(--highlight);">📜 Business Contracts</h2>
        <div class="grid">${data.contracts.map(c => `<div class="card" style="padding:20px;"><h4>${c.title}</h4><p style="font-size:13px;color:#94a3b8;">${c.content}</p></div>`).join('')}</div>

        <div style="background:var(--card); padding:60px; border-radius:20px; border:1px solid #334155; margin-top:60px;">
            <h2 style="color:var(--highlight);">Our Mission & History</h2>
            <p style="font-size:18px; line-height:1.8;">${data.aboutContent.mission}</p>
            <p style="font-size:18px; line-height:1.8; margin-top:20px;">${data.aboutContent.history}</p>
            <hr style="margin:40px 0; border:0; border-top:1px solid #334155;">
            <h2 style="color:var(--highlight);">Privacy & Policy</h2>
            <p style="color:#94a3b8; line-height:1.7;">${data.privacyContent.introduction}</p>
            <p style="color:#94a3b8; line-height:1.7; margin-top:10px;">${data.privacyContent.details}</p>
        </div>
    </div>
    <script>${inj.js}</script>
    ${inj.bodyEnd}
</body></html>`);
});

// ==================== 📚 GATED LIBRARY PORTAL ====================
app.get('/library', (req, res) => {
    if(!req.session.libUser) {
        return res.send(`<!DOCTYPE html><html><head><title>Library Access</title><style>
        body{background:#0a0f1e; color:#fff; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;}
        .box{background:#1e293b; padding:40px; border-radius:20px; width:400px; border:1px solid #10b981; text-align:center;}
        input{width:100%; padding:12px; margin:10px 0; background:#0f172a; border:1px solid #334155; color:#fff;}
        button{width:100%; padding:14px; background:#10b981; border:none; font-weight:bold; cursor:pointer;}
        </style></head><body>
        <div class="box"><h2>📚 Register for Library</h2><form action="/api/library/register" method="POST">
            <input name="name" placeholder="Name"><input name="email" placeholder="Gmail"><input name="password" type="password" placeholder="Password"><button>CREATE ACCOUNT</button></form>
        </div></body></html>`);
    }
    res.send("<h1>Welcome to Premium Library Content</h1><a href='/'>Back Home</a>");
});

// ==================== 💻 SUPER ADMIN (FULL FEATURES) ====================
app.get('/super-admin', checkAdmin, (req, res) => {
    const data = getData();
    res.send(`<!DOCTYPE html><html><head><title>CEO ADMIN</title><style>
    body{display:flex;background:#0f172a;color:#e2e8f0;font-family:sans-serif;margin:0;}
    .sidebar{width:260px;background:#1e293b;padding:20px;height:100vh;border-right:1px solid #334155;}
    .sidebar a{display:block;color:#94a3b8;padding:12px;text-decoration:none;cursor:pointer;border-radius:8px;}
    .sidebar a:hover{background:#10b981;color:#000;}
    .main{flex:1;padding:40px;overflow-y:auto;}
    .panel{display:none;background:#1e293b;padding:30px;border-radius:12px;}
    .panel.active{display:block;}
    textarea, input{width:100%; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:5px; margin-bottom:15px; padding:10px;}
    button{background:#10b981; color:#000; font-weight:bold; padding:15px; border:none; cursor:pointer;}
    .grid-btns{display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;}
    </style></head><body>
    <div class="sidebar"><h2>CEO PANEL</h2><a onclick="show('dash')">Command Bot</a><a onclick="show('branding')">Logo & Banners</a><a onclick="show('blog')">Blogs</a><a onclick="show('video')">Videos</a><a onclick="show('inject')">Injectors</a><a onclick="show('security')">🛡️ Security</a><a href="/">Site</a></div>
    <div class="main">
        <div id="dash" class="panel active"><h3>Root Bot Commands (Click to Run)</h3>
            <div class="grid-btns">${Array.from({length:24},(_,i)=>i+1).map(n=>`<button onclick="alert('Bot Command ${n} Triggered')">${n}</button>`).join('')}</div>
        </div>
        <div id="branding" class="panel"><h3>Logo Card & Banners</h3><form action="/admin/upload-logo" method="POST" enctype="multipart/form-data"><input type="file" name="logo" required><button>Update logo</button></form></div>
        <div id="blog" class="panel"><h3>Manage Blogs</h3><form action="/admin/create-blog" method="POST" enctype="multipart/form-data"><input name="title" required><textarea name="content"></textarea><input type="file" name="image"><button>Post</button></form>
            <table>${data.blogPosts.map(p=>`<tr><td>${p.title}</td><td><a href="/admin/delete/blog/${p.id}" style="color:red;">[DEL]</a></td></tr>`).join('')}</table>
        </div>
        <div id="video" class="panel"><h3>Video Store</h3><form action="/admin/upload-video" method="POST" enctype="multipart/form-data"><input name="title"><input type="file" name="video" required><button>Save</button></form>
            <table>${data.videos.map(v=>`<tr><td>${v.title}</td><td><a href="/admin/delete/video/${v.id}" style="color:red;">[DEL]</a></td></tr>`).join('')}</table>
        </div>
        <div id="inject" class="panel"><h3>Injectors</h3><form action="/admin/save-injections" method="POST">
            <textarea name="head" placeholder="Head Tag">${data.injections.head}</textarea><textarea name="css" placeholder="CSS">${data.injections.css}</textarea>
            <textarea name="js" placeholder="JS">${data.injections.js}</textarea><button>Save Global</button></form></div>
        <div id="security" class="panel"><h3>🛡️ Credentials</h3><form action="/admin/change-password" method="POST"><label>New Username</label><input name="newUser" value="${data.adminAuth.user}"><label>New Password</label><input type="password" name="newPassword" required><button>Update</button></form></div>
    </div>
    <script>function show(id){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');}</script>
</body></html>`);
});

app.get('/admin/delete/:type/:id', checkAdmin, (req, res) => {
    const data = getData();
    if(req.params.type === 'blog') data.blogPosts = data.blogPosts.filter(p => p.id != req.params.id);
    if(req.params.type === 'video') data.videos = data.videos.filter(v => v.id != req.params.id);
    saveData(data); res.redirect('/super-admin');
});

app.get('/admin-login', (req, res) => { res.send('<form method="POST" action="/auth-admin"><input name="username" placeholder="User"><input type="password" name="password"><button>Login</button></form>'); });
app.post('/auth-admin', (req, res) => {
    const { username, password } = req.body; const d = getData();
    if (username === d.adminAuth.user && bcrypt.compareSync(password, d.adminAuth.hash)) { req.session.isSuperAdmin = true; res.redirect('/super-admin'); }
    else res.send('Fail');
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 EMPIRE READY ON PORT ${PORT}`));
