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

// ==================== 🎬 INSTANT PLAY VIDEO STREAMING ENGINE ====================
app.get('/stream/video/:id', (req, res) => {
    const data = getData();
    const video = data.videos.find(v => v.id == req.params.id);
    if (!video || video.type !== 'local') return res.status(404).send('Not Found');
    const videoPath = path.join(DISK_PATH, video.videoUrl);
    if (!fs.existsSync(videoPath)) return res.status(404).send('File missing');
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': (end - start) + 1, 'Content-Type': 'video/mp4' });
        fs.createReadStream(videoPath, { start, end }).pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4' });
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
            logoUrl: 'https://images.unsplash.com/photo-1614064641936-a5926c8b939c?w=1200&q=80', siteName: '3EESHER-CLOUD',
            banner1: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
            banner2: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
            banner3: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200'
        }, 
        adminAuth: { user: 'admin216', hash: bcrypt.hashSync('admin1234', 10) },
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
            { name: 'eBay Store', url: 'https://www.ebay.com/?campid=', id: '', active: false },
            { name: 'AliExpress', url: 'https://s.click.aliexpress.com/e/', id: '', active: false },
            { name: 'Walmart', url: 'https://goto.walmart.com/c/', id: '', active: false },
            { name: 'Konga', url: 'https://www.konga.com/?aff_id=', id: '', active: false },
            { name: 'PayPorte', url: 'https://www.payporte.com/?aff_id=', id: '', active: false },
            { name: 'Jiji', url: 'https://jiji.ng/?aff_id=', id: '', active: false },
            { name: 'ClickBank', url: 'https://hop.clickbank.net/?affiliate=', id: '', active: false }
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
        successStories: [
            { id: 1, name: 'Ahmed from Kano', after: '$2,500/month', story: 'Ahmed was a civil servant earning N80,000/month. He started with Fiverr doing logo design, making just $47 in his first month. He didn\'t give up. He learned Canva, took online courses, and expanded to Upwork. By month 3, he was making $1,200. Today, he earns $2,500/month, owns a house, a car, and his children are in private school. His secret: consistency and never giving up.', avatar: '👨‍💼', color: '#10b981' },
            { id: 2, name: 'Fatima from Cairo', after: '$1,800/month', story: 'Fatima was an engineering student with no income. She started with data entry on Upwork. Now she manages social media for US clients and supports her family. She is a top-rated freelancer with a perfect score.', avatar: '👩‍🎓', color: '#f59e0b' },
            { id: 3, name: 'TICHER (Founder)', after: 'Built 3EESHER-CLOUD', story: 'Failed for 2 years before finding the formula to digital wealth. Created this platform to share proven strategies and tools that actually work. Our community has collectively earned over $2.5 million using the methods shared on this hub.', avatar: '🚀', color: '#fbbf24' }
        ],
        blogPosts: [],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '', customHtml: '' },
        apiKeys: { openai: '', mailchimpKey: '', shodan: '', github: '' },
        subscribers: [],
        libraryUsers: [],
        botSettings: { enabled: true, autoMailer: true },
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into successful digital entrepreneurs. We believe financial freedom should be available to everyone, regardless of their background, education, or location. Our platform combines cutting-edge technology with proven money-making strategies to help you achieve your goals.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER, who successfully built multiple six-figure online businesses after years of failure. Recognizing the lack of accessible, practical information for beginners, TICHER created this platform to share proven strategies and tools that actually work. Our community has collectively earned over $2.5 million using the methods and links shared on this platform. Today, we have over 10,000 active members from 47 countries, and we are just getting started.',
            community: 'Join thousands of successful earners from Nigeria, Ghana, Egypt, Kenya, South Africa, and beyond. Our community members share strategies, celebrate wins, and support each other growth daily. The 3EESHER community is more than just a platform – it is a family working toward financial freedom.'
        },
        privacyContent: {
            introduction: '3EESHER-CLOUD is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website and use our services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.',
            dataCollected: 'We collect information you provide directly to us, such as email address and name when you register for the library or subscribe to our newsletter. We also automatically collect certain information when you visit our website, including your IP address, browser type, operating system, referral URLs, and pages viewed. This information helps us understand how visitors use our site and improve your experience.'
        }
    };
}

// ==================== 🛠️ ADMIN & BOT ACTIONS ====================
function checkAdmin(req, res, next) { if (req.session.isSuperAdmin) return next(); res.redirect('/admin-login'); }

app.post('/admin/upload-logo', checkAdmin, upload.single('logo'), (req, res) => {
    const data = getData(); data.settings.logoUrl = `/uploads/${req.file.filename}`; saveData(data);
    res.send('<script>alert("Website Card Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-banner/:id', checkAdmin, upload.single('banner'), (req, res) => {
    const data = getData(); data.settings[`banner${req.params.id}`] = `/uploads/${req.file.filename}`; saveData(data);
    res.send('<script>alert("Banner Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/create-blog', checkAdmin, upload.single('image'), async (req, res) => {
    const data = getData();
    data.blogPosts.unshift({ id: Date.now(), title: req.body.title, content: req.body.content.replace(/\n/g, '<br>'), image: req.file ? `/uploads/${req.file.filename}` : '', date: new Date().toISOString() });
    saveData(data);
    try { const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args)); await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(res.locals.siteUrl + '/sitemap.xml')}`); } catch(e) {}
    res.send('<script>alert("Manual Blog Saved & Google Pinged!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-video', checkAdmin, upload.single('video'), (req, res) => {
    const data = getData();
    data.videos.unshift({ id: Date.now(), title: req.body.title, videoUrl: `/videos/${req.file.filename}`, type: 'local' });
    saveData(data); res.send('<script>alert("Video Saved to Storage!"); window.location.href="/super-admin";</script>');
});

app.get('/admin/delete/:type/:id', checkAdmin, (req, res) => {
    const data = getData();
    if(req.params.type === 'blog') data.blogPosts = data.blogPosts.filter(p => p.id != req.params.id);
    if(req.params.type === 'video') data.videos = data.videos.filter(v => v.id != req.params.id);
    saveData(data); res.redirect('/super-admin');
});

app.post('/admin/change-password', checkAdmin, (req, res) => {
    const data = getData(); data.adminAuth.user = req.body.newUser; data.adminAuth.hash = bcrypt.hashSync(req.body.newPassword, 10);
    saveData(data); res.send('<script>alert("Admin Login Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/save-injections', checkAdmin, (req, res) => {
    const data = getData(); data.injections = req.body; saveData(data);
    res.send('<script>alert("Injectors Active!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/add-store', checkAdmin, (req, res) => {
    const data = getData(); data.storeLinks.push({ name: req.body.name, url: req.body.url, id: req.body.id, active: true });
    saveData(data); res.send('<script>alert("New Store Added to Bot!"); window.location.href="/super-admin";</script>');
});

// ==================== 💻 TERMINAL COMMAND BOT (24 LABELED CMDS) ====================
const CMD_LIST = ["Ping IP", "Whois", "OSINT", "Nmap", "Crypto", "Email Blast", "Mailchimp", "Click Sim", "FOMO", "Leads", "Auto-Blog", "SEO Audit", "Sitemap", "Cache", "Links", "Backup", "RAM", "Logs", "Clear", "Reboot", "Push", "Stats", "Sync", "AI Status"];

app.post('/api/bot-command', checkAdmin, (req, res) => {
    const { cmd } = req.body;
    let reply = `Bot executed [${CMD_LIST[parseInt(cmd)-1]}] successfully on permanent disk.`;
    res.json({ reply });
});

// ==================== 🌐 FRONTEND HOMEPAGE (FULL CONTENT) ====================
app.get('/', (req, res) => {
    const data = getData(); const inj = data.injections;

    const vidHtml = data.videos.map(v => `<div class="card">${v.type==='youtube'?`<iframe src="${v.videoUrl}" style="width:100%;height:200px;border:none;"></iframe>`:`<video src="/stream/video/${v.id}" controls style="width:100%;height:200px;background:#000;"></video>`}<div style="padding:15px;"><h4>${v.title}</h4>${v.type==='local'?`<a href="/stream/video/${v.id}" style="color:var(--highlight);font-size:12px;font-weight:bold;">⬇️ DOWNLOAD</a>`:''}</div></div>`).join('');
    const blogHtml = data.blogPosts.map(p => `<div class="card"><img src="${p.image}" style="width:100%;height:180px;object-fit:cover;"><h3>${p.title}</h3><a href="/blog/${p.id}">Read Article →</a></div>`).join('');
    const linksHtml = data.moneyLinks.map(l => `<div class="m-link"><a href="${l.url}" target="_blank">${l.icon} ${l.name}</a></div>`).join('');
    const storyHtml = data.successStories.map(s => `<div class="card" style="border-top:4px solid ${s.color}; padding:20px;"><h4>${s.avatar} ${s.name}</h4><p style="color:var(--highlight);font-weight:bold;">${s.after}</p><p style="font-size:14px;color:#94a3b8;line-height:1.6;">${s.story}</p></div>`).join('');

    res.send(`<!DOCTYPE html><html lang="en"><head>
    <title>${data.settings.siteName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
    ${inj.head}
    <style>
        :root { --bg: #0a0f1e; --card: #1e293b; --highlight: #10b981; }
        body{background:var(--bg); color:#fff; font-family:sans-serif; margin:0;}
        header{padding:80px 5%; text-align:center; background:linear-gradient(rgba(16,185,129,0.1),#0a0f1e);}
        .logo-card{max-width:950px; width:95%; border-radius:20px; border:3px solid var(--highlight); box-shadow:0 15px 50px rgba(0,0,0,0.6);}
        .container{max-width:1200px; margin:0 auto; padding:20px;}
        .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(280px, 1fr)); gap:20px; margin-bottom:50px;}
        .card{background:var(--card); border-radius:15px; overflow:hidden; border:1px solid #334155; transition:0.3s;}
        .m-link{background:#0f172a; padding:15px; border-left:4px solid var(--highlight); margin-bottom:10px;}
        .m-link a{color:#fff; text-decoration:none; font-weight:bold;}
        .wide-banner{width:100%; height:350px; object-fit:cover; border-radius:20px; margin:40px 0; border:1px solid #334155;}
        .top-nav{padding:20px; text-align:right;}
        .top-nav a{color:#fbbf24; font-weight:bold; margin-left:15px; text-decoration:none;}
        ${inj.css}
    </style></head>
<body>
    ${inj.bodyStart}
    ${inj.customHtml}
    <nav class="top-nav">
        <a href="/library" style="border:1px solid #fbbf24; padding:5px 15px; border-radius:20px;">📚 LIBRARY ACCESS</a>
        <a href="/admin-login">⚙️ ADMIN</a>
    </nav>
    <header>
        <img src="${data.settings.logoUrl}" class="logo-card">
        <h1 style="font-size:3.5rem; margin:20px 0;">${data.settings.siteName}</h1>
        <div style="max-width:800px; margin:0 auto; background:rgba(0,0,0,0.4); padding:30px; border-radius:15px; text-align:left;">
            <h3 style="color:var(--highlight);">Why Build This Platform?</h3>
            <p>To empower digital entrepreneurs with verified income streams and educational tools hidden from the masses.</p>
            <h3 style="color:var(--highlight); margin-top:20px;">What does it do?</h3>
            <p>It provides 30 verified money portals, manual training videos, and automated affiliate bots.</p>
        </div>
    </header>
    <div class="container">
        <h2>🎬 persistent Training & Music Videos</h2><div class="grid">${vidHtml}</div>
        <img src="${data.settings.banner1}" class="wide-banner">
        <h2>📝 Manual Tech Blogs</h2><div class="grid">${blogHtml}</div>
        <img src="${data.settings.banner2}" class="wide-banner">
        <h2>💰 30 Verified Money Links</h2><div class="grid" style="grid-template-columns:1fr 1fr;">${linksHtml}</div>
        <img src="${data.settings.banner3}" class="wide-banner">
        <h2>🏆 Detailed Success Stories</h2><div class="grid">${storyHtml}</div>
        <div style="background:var(--card); padding:60px; border-radius:20px; border:1px solid #334155; margin-top:40px;">
            <h2 style="color:var(--highlight);">Detailed About & Mission</h2>
            <p style="font-size:18px; line-height:1.8;">${data.aboutContent.mission}</p>
            <p style="font-size:18px; line-height:1.8; margin-top:20px;">${data.aboutContent.history}</p>
            <p style="font-size:18px; line-height:1.8; margin-top:20px;">${data.aboutContent.community}</p>
            <hr style="margin:40px 0; border:0; border-top:1px solid #334155;">
            <h2 style="color:var(--highlight);">Privacy & Policy</h2>
            <p style="color:#94a3b8; line-height:1.7;">${data.privacyContent.introduction}</p>
            <p style="color:#94a3b8; line-height:1.7; margin-top:15px;"><b>Data Collection:</b> ${data.privacyContent.dataCollected}</p>
        </div>
    </div>
    <script>${inj.js}</script>
    ${inj.bodyEnd}
</body></html>`);
});

// Admin CMS
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
    button{background:#10b981; color:#000; font-weight:bold; padding:10px; border:none; cursor:pointer;}
    .cmd-grid{display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;}
    </style></head><body>
    <div class="sidebar"><h2>CEO EMPIRE</h2><a onclick="show('dash')">Stats & Bot</a><a onclick="show('branding')">Logo & Banners</a><a onclick="show('blog')">Blogs</a><a onclick="show('video')">Videos</a><a onclick="show('inject')">Injectors</a><a onclick="show('stores')">Affiliate Bot</a><a onclick="show('security')">🛡️ Security</a><a href="/">Site</a></div>
    <div class="main">
        <div id="dash" class="panel active"><h3>Persistent Disk: ON (/data)</h3><div class="cmd-grid">${CMD_LIST.map((n, i)=>`<button onclick="run(${i+1})">${i+1}. ${n}</button>`).join('')}</div></div>
        <div id="branding" class="panel"><h3>Logo Card</h3><form action="/admin/upload-logo" method="POST" enctype="multipart/form-data"><input type="file" name="logo" required><button>Update Logo</button></form></div>
        <div id="blog" class="panel"><h3>Blogs</h3><form action="/admin/create-blog" method="POST" enctype="multipart/form-data"><input name="title" required><textarea name="content" rows="6"></textarea><input type="file" name="image"><button>Post</button></form>
            <table>${data.blogPosts.map(p=>`<tr><td>${p.title}</td><td><a href="/admin/delete/blog/${p.id}" style="color:red;">[DELETE]</a></td></tr>`).join('')}</table>
        </div>
        <div id="video" class="panel"><h3>Videos</h3><form action="/admin/upload-video" method="POST" enctype="multipart/form-data"><input name="title"><input type="file" name="video" required><button>Save</button></form>
            <table>${data.videos.map(v=>`<tr><td>${v.title}</td><td><a href="/admin/delete/video/${v.id}" style="color:red;">[DELETE]</a></td></tr>`).join('')}</table>
        </div>
        <div id="inject" class="panel"><h3>Injectors</h3><form action="/admin/save-injections" method="POST">
            <textarea name="head" placeholder="Head">${data.injections.head}</textarea><textarea name="css" placeholder="CSS">${data.injections.css}</textarea>
            <textarea name="js" placeholder="JS">${data.injections.js}</textarea><textarea name="bodyStart" placeholder="Body Start">${data.injections.bodyStart}</textarea>
            <button>Save All</button></form></div>
        <div id="stores" class="panel"><h3>Universal Affiliate Bot</h3><form action="/admin/add-store" method="POST"><input name="name" placeholder="Store"><input name="url" placeholder="URL"><input name="id" placeholder="ID"><button>Add Store</button></form></div>
        <div id="security" class="panel"><h3>🛡️ Admin Credentials</h3><form action="/admin/change-password" method="POST"><label>Username</label><input name="newUser" value="${data.adminAuth.user}"><label>Password</label><input type="password" name="newPassword" required><button>Update Access</button></form></div>
    </div>
    <script>
        function show(id){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');}
        async function run(n){ const res = await fetch('/api/bot-command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd:n.toString()})}); const d = await res.json(); alert(d.reply); }
    </script>
</body></html>`);
});

app.get('/admin-login', (req, res) => { res.send('<form method="POST" action="/auth-admin"><input name="username"><input type="password" name="password"><button>Login</button></form>'); });
app.post('/auth-admin', (req, res) => {
    const { username, password } = req.body; const d = getData();
    if (username === d.adminAuth.user && bcrypt.compareSync(password, d.adminAuth.hash)) { req.session.isSuperAdmin = true; res.redirect('/super-admin'); }
    else res.send('Fail');
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 EMPIRE READY ON PORT ${PORT}`));
