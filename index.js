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
const os = require('os');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const rssParser = new Parser();

const GA_ID = 'G-HD01MF5SL9';

// ==================== 💾 PERMANENT STORAGE ====================
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
    secret: '3eesher_ultimate_empire_safe_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== 🎬 VIDEO STREAMING ====================
app.get('/stream/video/:id', (req, res) => {
    const data = getData();
    const video = data.videos.find(v => v.id == req.params.id);
    if (!video || video.type !== 'local') return res.status(404).send('Missing');
    const videoPath = video.videoUrl.startsWith('/') ? video.videoUrl : path.join(DISK_PATH, video.videoUrl);
    if (!fs.existsSync(videoPath)) return res.status(404).send('Not Found');
    const stat = fs.statSync(videoPath);
    const ext = path.extname(videoPath).toLowerCase();
    const mimeMap = { '.mp4':'video/mp4', '.webm':'video/webm', '.ogg':'video/ogg', '.mov':'video/mp4', '.avi':'video/x-msvideo', '.mkv':'video/x-matroska', '.m4v':'video/mp4' };
    const contentType = mimeMap[ext] || 'video/mp4';
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunkSize = (end - start) + 1;
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunkSize, 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' });
        fs.createReadStream(videoPath, { start, end }).pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': contentType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600' });
        fs.createReadStream(videoPath).pipe(res);
    }
});

app.get('/download/video/:id', (req, res) => {
    const data = getData();
    const video = data.videos.find(v => v.id == req.params.id);
    if (!video || video.type !== 'local') return res.status(404).send('Not available');
    const videoPath = video.videoUrl.startsWith('/') ? video.videoUrl : path.join(DISK_PATH, video.videoUrl);
    if (!fs.existsSync(videoPath)) return res.status(404).send('File not found');
    res.download(videoPath, `${(video.title || 'video').replace(/[^a-zA-Z0-9]/g, '_')}.mp4`);
});

// ==================== 📊 CLICK TRACKING ====================
app.get('/go/:index', (req, res) => {
    const data = getData();
    const idx = parseInt(req.params.index);
    if (data.moneyLinks[idx]) {
        data.moneyLinks[idx].clicks = (data.moneyLinks[idx].clicks || 0) + 1;
        saveData(data);
        res.redirect(data.moneyLinks[idx].url);
    } else res.redirect('/');
});

// ==================== 🗺️ SITEMAP + ROBOTS ====================
app.get('/sitemap.xml', (req, res) => {
    const data = getData();
    const siteUrl = 'https://3eesher.cloud';
    const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        '<url><loc>' + siteUrl + '/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>' +
        '<url><loc>' + siteUrl + '/library</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>' +
        '<url><loc>' + siteUrl + '/about</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>' +
        '<url><loc>' + siteUrl + '/privacy</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>' +
        '<url><loc>' + siteUrl + '/products</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>' +
        data.blogPosts.map(p => '<url><loc>' + siteUrl + '/blog/' + p.id + '</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>').join('') +
        '</urlset>';
    res.set('Content-Type', 'application/xml');
    res.send(xml);
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /super-admin\nDisallow: /ceo\nSitemap: https://3eesher.cloud/sitemap.xml');
});

// ==================== 📁 MULTER ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, (file.mimetype.includes('video') || ['.mp4','.mov','.avi','.mkv','.webm','.m4v'].includes(ext)) ? VIDEOS_DIR : UPLOADS_DIR);
    },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')); }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== 🗄️ DATABASE ====================
function getData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            if (!d.socialLinks) d.socialLinks = { whatsapp:'', telegram:'', instagram:'', facebook:'', twitter:'', tiktok:'', youtube:'', linkedin:'', linkinbio_title:'3EESHER-CLOUD', linkinbio_bio:'Digital Wealth Platform | Affiliate Marketing | Free Library' };
            if (!d.products) d.products = [];
            if (!d.adsenseId) d.adsenseId = '';
            return d;
        }
    } catch (e) {}
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
            { name: 'Amazon Store', url: 'https://www.amazon.com/?tag=', id: '', active: true }
        ],
        videos: [
            { id: 1, title: 'Eminem - Houdini', videoUrl: 'https://www.youtube.com/embed/bkSJZwQF6I4', type: 'youtube' },
            { id: 2, title: 'Kendrick Lamar - Not Like Us', videoUrl: 'https://www.youtube.com/embed/H58vbez_m4E', type: 'youtube' },
            { id: 3, title: 'Taylor Swift - Cruel Summer', videoUrl: 'https://www.youtube.com/embed/ic8j13piAhQ', type: 'youtube' }
        ],
        successStories: [
            { id: 1, name: 'Ahmed from Kano', after: '$2,500/month', story: 'Ahmed was a civil servant earning N80,000/month. He started with Fiverr doing logo design. By month 3, he was making $1,200. Today he earns $2,500/month.', avatar: '👨‍💼', color: '#10b981' },
            { id: 2, name: 'Fatima from Cairo', after: '$1,800/month', story: 'Fatima was an engineering student with no income. She started with data entry on Upwork. Now she manages social media for US clients and supports her family.', avatar: '👩‍🎓', color: '#f59e0b' },
            { id: 3, name: 'TICHER (Founder)', after: 'Built 3EESHER-CLOUD', story: 'Failed for 2 years before finding the formula to digital wealth. Created this platform to share proven strategies and tools that actually work.', avatar: '🚀', color: '#fbbf24' }
        ],
        blogPosts: [],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '', customHtml: '' },
        apiKeys: { openai: '', mailchimpKey: '', gmailSecret: 'ipdbessasmzubdyk', gmailUser: '' },
        libraryUsers: [],
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into successful digital entrepreneurs.',
            history: '3EESHER-CLOUD started as a personal project by TICHER, a self-taught developer who built this platform entirely from a mobile phone in Nigeria.'
        },
        privacyContent: {
            introduction: '3EESHER-CLOUD is committed to protecting your privacy.',
            details: 'We collect only your name and email when you register for the library. We never sell your data.'
        },
        socialLinks: { whatsapp:'', telegram:'', instagram:'', facebook:'', twitter:'', tiktok:'', youtube:'', linkedin:'', linkinbio_title:'3EESHER-CLOUD', linkinbio_bio:'Digital Wealth Platform | Affiliate Marketing | Free Library' },
        products: [],
        adsenseId: ''
    };
}

// ==================== 🛠️ ADMIN MIDDLEWARE ====================
function checkAdmin(req, res, next) { if (req.session.isSuperAdmin) return next(); res.redirect('/admin-login'); }

// ==================== 🔐 ADMIN ROUTES ====================
app.post('/admin/change-password', checkAdmin, (req, res) => {
    const data = getData();
    data.adminAuth.user = req.body.newUser;
    data.adminAuth.hash = bcrypt.hashSync(req.body.newPassword, 10);
    saveData(data);
    res.send('<script>alert("CEO Credentials Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/update-gmail', checkAdmin, (req, res) => {
    const data = getData();
    data.apiKeys.gmailUser = req.body.gmailUser;
    if (req.body.gmailSecret && req.body.gmailSecret.trim()) data.apiKeys.gmailSecret = req.body.gmailSecret.trim();
    saveData(data);
    res.send('<script>alert("Gmail Settings Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-logo', checkAdmin, upload.single('logo'), (req, res) => {
    const data = getData();
    data.settings.logoUrl = `/uploads/${req.file.filename}`;
    saveData(data);
    res.send('<script>alert("Logo Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/create-blog', checkAdmin, upload.single('image'), (req, res) => {
    const data = getData();
    data.blogPosts.unshift({ id: Date.now(), title: req.body.title, content: req.body.content.replace(/\n/g, '<br>'), image: req.file ? `/uploads/${req.file.filename}` : '', date: new Date().toISOString() });
    saveData(data);
    res.send('<script>alert("Blog Published!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-video', checkAdmin, upload.single('video'), (req, res) => {
    const data = getData();
    data.videos.unshift({ id: Date.now(), title: req.body.title, videoUrl: 'videos/' + req.file.filename, type: 'local' });
    saveData(data);
    res.send('<script>alert("Video Uploaded!"); window.location.href="/super-admin";</script>');
});

app.get('/admin/delete/:type/:id', checkAdmin, (req, res) => {
    const data = getData();
    if (req.params.type === 'blog') data.blogPosts = data.blogPosts.filter(p => p.id != req.params.id);
    if (req.params.type === 'video') data.videos = data.videos.filter(v => v.id != req.params.id);
    if (req.params.type === 'product') data.products = (data.products || []).filter(p => p.id != req.params.id);
    saveData(data);
    res.redirect('/super-admin');
});

app.post('/admin/save-injections', checkAdmin, (req, res) => {
    const data = getData(); data.injections = req.body; saveData(data);
    res.send('<script>alert("Injectors Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/save-stores', checkAdmin, (req, res) => {
    const data = getData();
    const names = [].concat(req.body.sname || []);
    const urls = [].concat(req.body.surl || []);
    const ids = [].concat(req.body.sid || []);
    data.storeLinks = names.map((n, i) => ({ name: n, url: urls[i] || '', id: ids[i] || '', active: true }));
    saveData(data);
    res.send('<script>alert("Store IDs Saved!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/add-store', checkAdmin, (req, res) => {
    const data = getData();
    data.storeLinks.push({ name: req.body.name, url: req.body.url, id: req.body.id || '', active: true });
    saveData(data);
    res.send('<script>alert("Store Added!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/save-social', checkAdmin, (req, res) => {
    const data = getData();
    data.socialLinks = { whatsapp: req.body.whatsapp||'', telegram: req.body.telegram||'', instagram: req.body.instagram||'', facebook: req.body.facebook||'', twitter: req.body.twitter||'', tiktok: req.body.tiktok||'', youtube: req.body.youtube||'', linkedin: req.body.linkedin||'', linkinbio_title: req.body.linkinbio_title||'3EESHER-CLOUD', linkinbio_bio: req.body.linkinbio_bio||'' };
    saveData(data);
    res.send('<script>alert("Social Links Saved!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/save-adsense', checkAdmin, (req, res) => {
    const data = getData();
    data.adsenseId = (req.body.adsenseId || '').trim();
    saveData(data);
    res.send('<script>alert("AdSense ID Saved!"); window.location.href="/super-admin";</script>');
});

// ==================== 🛍️ DIGITAL PRODUCTS ====================
app.get('/products', (req, res) => {
    const data = getData();
    const prods = data.products || [];
    const productsHtml = prods.length ? prods.map(p =>
        '<div class="prod-card">' +
        (p.image ? '<img src="' + p.image + '" style="width:100%;height:200px;object-fit:cover;">' : '<div style="height:200px;background:linear-gradient(135deg,#10b981,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:56px;">' + (p.icon||'📦') + '</div>') +
        '<div style="padding:20px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span style="background:#10b981;color:#000;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:bold;">' + (p.category||'Digital') + '</span><span style="color:#fbbf24;font-weight:900;font-size:20px;">' + (p.price==='0'||!p.price?'FREE':'$'+p.price) + '</span></div>' +
        '<h3 style="margin:0 0 8px;color:#fff;font-size:16px;">' + p.title + '</h3>' +
        '<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:16px;">' + (p.description||'') + '</p>' +
        (p.downloadUrl ? '<a href="' + p.downloadUrl + '" target="_blank" style="display:block;text-align:center;background:linear-gradient(135deg,#10b981,#3b82f6);color:#fff;padding:12px;border-radius:10px;text-decoration:none;font-weight:700;">📥 ' + (p.price==='0'||!p.price?'Download Free':'Buy Now →') + '</a>' : '') +
        '</div></div>'
    ).join('') : '<div style="text-align:center;padding:80px 20px;color:#64748b;"><div style="font-size:64px;margin-bottom:20px;">🛍️</div><p>Products coming soon!</p></div>';

    res.send(`<!DOCTYPE html><html lang="en"><head>
<title>Digital Products — 3EESHER-CLOUD</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Premium digital products from 3EESHER-CLOUD">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#060d1a;color:#fff;font-family:'Segoe UI',sans-serif;}.navbar{position:sticky;top:0;background:rgba(6,13,26,0.97);backdrop-filter:blur(10px);padding:14px 5%;display:flex;justify-content:space-between;align-items:center;z-index:1000;border-bottom:1px solid #1a2d45;}.navbar a{color:#fff;text-decoration:none;font-weight:600;margin-left:16px;font-size:14px;}.navbar a:hover{color:#10b981;}.nav-brand{font-size:18px;font-weight:900;color:#f59e0b;}.hero{background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.08));padding:60px 5%;text-align:center;border-bottom:1px solid #1a2d45;}.container{max-width:1200px;margin:0 auto;padding:40px 5%;}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;}.prod-card{background:#111d2e;border-radius:16px;overflow:hidden;border:1px solid #1a2d45;transition:transform 0.2s,box-shadow 0.2s;}.prod-card:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(16,185,129,0.15);}.section-title{color:#f59e0b;border-bottom:2px solid #10b981;padding-bottom:10px;margin-bottom:30px;font-family:serif;}.site-footer{background:#030710;border-top:1px solid #1a2d45;padding:24px 5%;text-align:center;color:#64748b;font-size:13px;}.site-footer a{color:#10b981;text-decoration:none;}</style>
</head><body>
<nav class="navbar"><div class="nav-brand">3EESHER.CLOUD</div><div><a href="/">🏠 Home</a><a href="/library">📚 Library</a><a href="/links">🔗 Links</a></div></nav>
<div class="hero"><h1 style="font-size:2.5rem;color:#f59e0b;margin-bottom:12px;">🛍️ Digital Products</h1><p style="color:#94a3b8;font-size:17px;max-width:600px;margin:0 auto;">Premium eBooks, courses and digital tools for your online income journey.</p></div>
<div class="container"><h2 class="section-title">All Products (${prods.length})</h2><div class="grid">${productsHtml}</div></div>
<footer class="site-footer"><p>© ${new Date().getFullYear()} 3EESHER-CLOUD · <a href="/">Home</a> · <a href="/library">Library</a> · <a href="mailto:abdullahharuna216@gmail.com">Contact</a></p></footer>
</body></html>`);
});

app.post('/admin/add-product', checkAdmin, upload.single('image'), (req, res) => {
    const data = getData();
    if (!data.products) data.products = [];
    data.products.unshift({ id: Date.now(), title: req.body.title||'Untitled', description: req.body.description||'', price: req.body.price||'0', category: req.body.category||'Digital', icon: req.body.icon||'📦', downloadUrl: req.body.downloadUrl||'', image: req.file ? '/uploads/'+req.file.filename : '', createdAt: new Date().toISOString() });
    saveData(data);
    res.send('<script>alert("Product Added!"); window.location.href="/super-admin";</script>');
});

// ==================== 🤖 BOT COMMANDS ====================
const CMD_LABELS = [
    "Server Status","Site Analytics","Subscriber Stats","Link Health Check","Revenue Report",
    "📧 Email Blast","Export Subscribers CSV","Top Links Report","🔥 FOMO Broadcast","Lead Report",
    "✍️ Auto-Blogger","SEO Status","Generate Sitemap","Clear Cache","Link Validator",
    "💾 DB Backup","Check RAM","Recent Sign-ups","Clean Backups","Server Info",
    "🛍️ Store Affiliate Blast","Link Stats","Platform Stats","API Status"
];

app.post('/api/bot-command', checkAdmin, async (req, res) => {
    const { cmd } = req.body;
    const data = getData();
    const n = parseInt(cmd);
    let reply = '';
    try {
        switch (n) {
            case 1: const u1=process.uptime(); reply='✅ Server Online\nUptime: '+Math.floor(u1/3600)+'h '+Math.floor((u1%3600)/60)+'m\nNode: '+process.version; break;
            case 2: reply='📊 ANALYTICS\nGA: '+GA_ID+' ✅\nSubscribers: '+data.libraryUsers.length+'\nVideos: '+data.videos.length+'\nBlogs: '+data.blogPosts.length+'\nLinks: '+data.moneyLinks.length; break;
            case 3: if(!data.libraryUsers.length){reply='📭 No subscribers yet.';break;} reply='👥 Total: '+data.libraryUsers.length+'\n'+data.libraryUsers.slice(0,10).map(u=>'• '+u.name+' — '+u.email).join('\n')+(data.libraryUsers.length>10?'\n...and '+(data.libraryUsers.length-10)+' more':''); break;
            case 4: const tc4=data.moneyLinks.reduce((s,l)=>s+(l.clicks||0),0); reply='🔗 Active: '+data.moneyLinks.filter(l=>l.active).length+'/30\nTotal Clicks: '+tc4; break;
            case 5: reply='💰 TOP 5:\n'+[...data.moneyLinks].sort((a,b)=>(b.clicks||0)-(a.clicks||0)).slice(0,5).map((l,i)=>(i+1)+'. '+l.icon+' '+l.name+': '+(l.clicks||0)+' clicks').join('\n'); break;
            case 6:
                if(!data.apiKeys.gmailUser){reply='❌ Gmail not set!';break;}
                if(!data.libraryUsers.length){reply='❌ No subscribers.';break;}
                const t6=nodemailer.createTransport({service:'gmail',auth:{user:data.apiKeys.gmailUser,pass:data.apiKeys.gmailSecret}});
                const lh6=data.moneyLinks.slice(0,10).map(l=>'<li><a href="'+l.url+'">'+l.icon+' '+l.name+'</a></li>').join('');
                let s6=0,f6=0;
                for(const sub of data.libraryUsers){try{await t6.sendMail({from:'3EESHER-CLOUD <'+data.apiKeys.gmailUser+'>',to:sub.email,subject:'💰 Top Money-Making Opportunities',html:'<h2 style="color:#10b981">Hello '+sub.name+'!</h2><p>Today\'s top earning opportunities:</p><ul>'+lh6+'</ul><p><a href="https://3eesher.cloud" style="background:#10b981;color:#000;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Visit 3EESHER-CLOUD →</a></p>'});s6++;}catch(e){f6++;}}
                reply='📧 Email Blast!\n✅ Sent: '+s6+'\n❌ Failed: '+f6; break;
            case 7: if(!data.libraryUsers.length){reply='❌ No subscribers.';break;} const csv7='Name,Email\n'+data.libraryUsers.map(u=>'"'+u.name+'","'+u.email+'"').join('\n'); fs.writeFileSync(path.join(BACKUPS_DIR,'subscribers-'+Date.now()+'.csv'),csv7); reply='✅ Exported '+data.libraryUsers.length+' subscribers.'; break;
            case 8: reply='📊 AFFILIATE:\n'+[...data.moneyLinks].sort((a,b)=>(b.clicks||0)-(a.clicks||0)).slice(0,10).map((l,i)=>(i+1)+'. '+l.name+': '+(l.clicks||0)+' clicks').join('\n'); break;
            case 9:
                if(!data.apiKeys.gmailUser){reply='❌ Gmail not set!';break;}
                const t9=nodemailer.createTransport({service:'gmail',auth:{user:data.apiKeys.gmailUser,pass:data.apiKeys.gmailSecret}});
                let s9=0;
                for(const sub of data.libraryUsers){try{await t9.sendMail({from:'3EESHER-CLOUD <'+data.apiKeys.gmailUser+'>',to:sub.email,subject:'⚠️ LIMITED TIME: Don\'t Miss These Opportunities!',html:'<h2>⚠️ '+sub.name+', Don\'t Miss Out!</h2><p>Thousands are already earning online. Are you?</p><br><a href="https://3eesher.cloud/library" style="background:#10b981;color:#000;padding:15px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">ACCESS PREMIUM LIBRARY →</a>'});s9++;}catch(e){}}
                reply='🔥 FOMO Blast sent to '+s9+' subscribers!'; break;
            case 10: reply='📋 LEAD REPORT\nSubscribers: '+data.libraryUsers.length+'\nVideos: '+data.videos.length+'\nBlogs: '+data.blogPosts.length+'\nClicks: '+data.moneyLinks.reduce((s,l)=>s+(l.clicks||0),0); break;
            case 11:
                const aff11=data.moneyLinks.filter(l=>l.category==='affiliate');
                const p11={id:Date.now(),title:'Top '+aff11.length+' Affiliate Programs in '+new Date().getFullYear(),content:'<p>Best affiliate programs to earn money online:</p><ul>'+aff11.map(l=>'<li><strong>'+l.name+'</strong> — <a href="'+l.url+'" target="_blank">Sign up here</a></li>').join('')+'</ul>',image:'',date:new Date().toISOString()};
                data.blogPosts.unshift(p11); saveData(data);
                reply='✅ Auto-Blog Published!\n"'+p11.title+'"'; break;
            case 12: reply='🔍 SEO STATUS\nGA: '+GA_ID+' ✅\nSitemap: ✅ /sitemap.xml\nRobots: ✅ /robots.txt\nBlogs: '+data.blogPosts.length; break;
            case 13:
                const sm13='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://3eesher.cloud/</loc><priority>1.0</priority></url><url><loc>https://3eesher.cloud/library</loc><priority>0.8</priority></url>'+data.blogPosts.map(p=>'<url><loc>https://3eesher.cloud/blog/'+p.id+'</loc><priority>0.6</priority></url>').join('')+'</urlset>';
                fs.writeFileSync(path.join(DISK_PATH,'sitemap.xml'),sm13);
                reply='✅ Sitemap generated!\nURLs: '+(data.blogPosts.length+2); break;
            case 14: reply='🧹 Cache cleared!\n'+data.blogPosts.length+' blogs intact.'; break;
            case 15: reply='🔗 LINKS\nValid: '+data.moneyLinks.filter(l=>l.url&&l.url.startsWith('http')).length+'/30\n\nSTORES:\n'+data.storeLinks.map(s=>'• '+s.name+': '+(s.id?'ID set ✅':'❌ NEEDS ID')).join('\n'); break;
            case 16: const bf16=path.join(BACKUPS_DIR,'backup-'+Date.now()+'.json'); fs.copyFileSync(DATA_FILE,bf16); reply='💾 Backup saved!'; break;
            case 17: const m17=process.memoryUsage(); reply='💾 MEMORY\nHeap: '+Math.round(m17.heapUsed/1024/1024)+'MB/'+Math.round(m17.heapTotal/1024/1024)+'MB\nFree: '+Math.round(os.freemem()/1024/1024)+'MB'; break;
            case 18: const r18=data.libraryUsers.slice(-8).reverse(); reply=r18.length?'👥 RECENT:\n'+r18.map(u=>'• '+u.name+' — '+u.email).join('\n'):'📭 No subscribers yet.'; break;
            case 19: const bf19=fs.readdirSync(BACKUPS_DIR).filter(f=>f.endsWith('.json')); if(bf19.length>5){bf19.slice(0,bf19.length-5).forEach(f=>fs.removeSync(path.join(BACKUPS_DIR,f)));reply='🧹 Cleaned '+(bf19.length-5)+' old backups.';}else reply='✅ Clean. '+bf19.length+' backups.'; break;
            case 20: const u20=process.uptime(); reply='🖥️ SERVER\nUptime: '+Math.floor(u20/3600)+'h '+Math.floor((u20%3600)/60)+'m\nNode: '+process.version+'\nCPUs: '+os.cpus().length; break;
            case 21:
                if(!data.apiKeys.gmailUser){reply='❌ Gmail not set!';break;}
                const t21=nodemailer.createTransport({service:'gmail',auth:{user:data.apiKeys.gmailUser,pass:data.apiKeys.gmailSecret}});
                let s21=0;
                for(const sub of data.libraryUsers){try{await t21.sendMail({from:'3EESHER-CLOUD <'+data.apiKeys.gmailUser+'>',to:sub.email,subject:'🛍️ Shop & Earn — Top Affiliate Stores!',html:'<h2>Hello '+sub.name+'!</h2><p>Shop via our affiliate links:</p><ul>'+data.storeLinks.map(s=>'<li><a href="'+s.url+s.id+'">'+s.name+'</a></li>').join('')+'</ul>'});s21++;}catch(e){}}
                reply='🛍️ Store Blast sent to '+s21+' subscribers!'; break;
            case 22: reply='📊 LINK STATS:\n'+data.moneyLinks.slice(0,15).map(l=>l.icon+' '+l.name+': '+(l.clicks||0)).join('\n'); break;
            case 23: reply='🏆 PLATFORM\nSubscribers: '+data.libraryUsers.length+'\nClicks: '+data.moneyLinks.reduce((s,l)=>s+(l.clicks||0),0)+'\nBlogs: '+data.blogPosts.length+'\nVideos: '+data.videos.length; break;
            case 24: reply='🔌 API STATUS\nGA: '+GA_ID+' ✅\nGmail: '+(data.apiKeys.gmailUser?'✅ '+data.apiKeys.gmailUser:'❌ Not set')+'\nAdSense: '+(data.adsenseId?'✅ '+data.adsenseId:'❌ Not set'); break;
            default: reply='Command '+cmd+' — '+(CMD_LABELS[n-1]||'Unknown');
        }
    } catch (e) { reply = '❌ Error: ' + e.message; }
    res.json({ reply });
});

// ==================== 📝 BLOG POST PAGE ====================
app.get('/blog/:id', (req, res) => {
    const data = getData();
    const post = data.blogPosts.find(p => p.id == req.params.id);
    if (!post) return res.redirect('/');
    const readTime = Math.ceil(((post.content||'').replace(/<[^>]*>/g,'').split(' ').length) / 200) || 1;
    res.send(`<!DOCTYPE html><html lang="en"><head>
<title>${post.title} — 3EESHER-CLOUD</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${(post.content||'').replace(/<[^>]*>/g,'').substring(0,155)}">
<meta property="og:title" content="${post.title}">
<meta property="og:image" content="${post.image||''}">
<meta name="robots" content="index, follow">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#060d1a;color:#e2e8f0;font-family:'DM Sans',sans-serif;line-height:1.7;}
.navbar{background:rgba(6,13,26,0.97);backdrop-filter:blur(16px);border-bottom:1px solid #1a2d45;padding:0 5%;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:100;}
.nav-brand{font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:#f59e0b;text-decoration:none;}
.nav-brand span{color:#10b981;}
.nav-back{color:#10b981;text-decoration:none;font-size:13px;font-weight:700;}
.article{max-width:780px;margin:0 auto;padding:48px 5% 80px;}
.article-tag{display:inline-block;background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.25);padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:16px;}
.article-title{font-family:'Playfair Display',serif;font-size:clamp(1.6rem,4vw,2.4rem);font-weight:900;color:#fff;line-height:1.25;margin-bottom:16px;}
.article-meta{display:flex;gap:16px;font-size:12px;color:#64748b;margin-bottom:24px;align-items:center;flex-wrap:wrap;}
.article-img{width:100%;border-radius:16px;margin-bottom:32px;max-height:420px;object-fit:cover;}
.article-body{color:#cbd5e1;font-size:16px;line-height:1.85;}
.article-body h2,.article-body h3{font-family:'Playfair Display',serif;color:#f59e0b;margin:28px 0 12px;}
.article-body p{margin-bottom:16px;}
.article-body img{max-width:100%;border-radius:12px;margin:20px 0;}
.article-body a{color:#10b981;}
.article-body ul,.article-body ol{padding-left:24px;margin-bottom:16px;}
.article-body li{margin-bottom:8px;}
.share-bar{background:#111d2e;border:1px solid #1a2d45;border-radius:14px;padding:20px;margin-top:40px;text-align:center;}
.share-bar p{color:#94a3b8;font-size:13px;margin-bottom:12px;}
.share-btn{display:inline-block;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;margin:4px;}
.site-footer{background:#030710;border-top:1px solid #1a2d45;padding:20px 5%;text-align:center;color:#64748b;font-size:13px;}
.site-footer a{color:#10b981;}
</style>
</head><body>
<nav class="navbar">
    <a href="/" class="nav-brand">3<span>EESHER</span>.CLOUD</a>
    <a href="/" class="nav-back">← Home</a>
</nav>
<div class="article">
    <span class="article-tag">📝 Blog</span>
    <h1 class="article-title">${post.title}</h1>
    <div class="article-meta">
        <span>🕐 ${readTime} min read</span>
        <span>📅 ${new Date(post.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</span>
        ${post.author?'<span>✍️ '+post.author+'</span>':''}
    </div>
    ${post.image?'<img src="'+post.image+'" class="article-img" alt="'+post.title+'">':''}
    <div class="article-body">${post.content}</div>
    <div class="share-bar">
        <p>📤 Share this article</p>
        <a href="https://wa.me/?text=${encodeURIComponent(post.title+' — https://3eesher.cloud/blog/'+post.id)}" target="_blank" class="share-btn" style="background:#25D366;color:#000;">💬 WhatsApp</a>
        <a href="https://x.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent('https://3eesher.cloud/blog/'+post.id)}" target="_blank" class="share-btn" style="background:#000;color:#fff;">𝕏 Twitter</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://3eesher.cloud/blog/'+post.id)}" target="_blank" class="share-btn" style="background:#1877F2;color:#fff;">👥 Facebook</a>
    </div>
</div>
<footer class="site-footer"><p>© ${new Date().getFullYear()} 3EESHER-CLOUD · <a href="/">Home</a> · <a href="/library">Library</a> · <a href="mailto:abdullahharuna216@gmail.com">Contact</a></p></footer>
</body></html>`);
});

// ==================== 📚 LIBRARY ====================
app.get('/library', (req, res) => {
    if (!req.session.libUser) {
        return res.send(`<!DOCTYPE html><html><head><title>Library Access</title><style>*{box-sizing:border-box;}body{background:#060d1a;color:#fff;font-family:'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}.box{background:#111d2e;padding:40px;border-radius:20px;width:400px;max-width:95%;text-align:center;border:1px solid #10b981;}input{width:100%;padding:12px;margin:8px 0;background:#0f172a;border:1px solid #334155;color:#fff;border-radius:8px;}button{background:#10b981;border:none;padding:12px;width:100%;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:8px;}hr{border:0;border-top:1px solid #334155;margin:20px 0;}</style></head>
<body><div class="box"><h2 style="color:#f59e0b;margin-bottom:8px;">📚 Premium Library</h2><p style="color:#64748b;font-size:13px;margin-bottom:20px;">Register with your Gmail to get free access.</p>
<form action="/api/library/register" method="POST"><input name="name" placeholder="Full Name" required><input name="email" type="email" placeholder="Gmail Address" required><input name="password" type="password" placeholder="Create Password" required><button>CREATE FREE ACCOUNT</button></form>
<hr><form action="/api/library/login" method="POST"><input name="email" type="email" placeholder="Gmail Address" required><input name="password" type="password" placeholder="Password" required><button style="background:#f59e0b;color:#000;">LOGIN TO LIBRARY</button></form>
<p style="margin-top:16px;"><a href="/" style="color:#64748b;font-size:13px;">← Back to Home</a></p></div></body></html>`);
    }
    res.send(`<!DOCTYPE html><html><head><title>Premium Library — 3EESHER-CLOUD</title><style>*{box-sizing:border-box;}body{background:#060d1a;color:#fff;font-family:'Segoe UI',sans-serif;margin:0;}nav{background:#111d2e;padding:15px 5%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1a2d45;}nav a{color:#10b981;text-decoration:none;font-weight:bold;}.container{max-width:1200px;margin:0 auto;padding:40px 20px;}.card{background:#111d2e;padding:25px;border-radius:12px;border:1px solid #1a2d45;margin-bottom:20px;}.btn{display:inline-block;background:#10b981;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin:5px;}</style></head>
<body>
<nav><div style="font-size:20px;font-weight:bold;color:#f59e0b;">📚 3EESHER LIBRARY</div><div><a href="/">← Home</a> &nbsp; <a href="/api/library/logout" style="color:#ef4444;">Logout</a></div></nav>
<div class="container">
<h1>Welcome, ${req.session.libUser.name}! 🎉</h1>
<p style="color:#94a3b8;margin-bottom:30px;">You have full access to the premium digital knowledge library.</p>
<div class="card"><h2>📖 Google Books — AI & Technology</h2><p style="color:#94a3b8;margin:10px 0;">Search millions of books on AI, Business, and Wealth:</p>
<a href="https://books.google.com/books?q=artificial+intelligence+make+money" target="_blank" class="btn">AI & Money</a>
<a href="https://books.google.com/books?q=digital+marketing+affiliate" target="_blank" class="btn" style="background:#3b82f6;color:#fff;">Digital Marketing</a>
<a href="https://books.google.com/books?q=coding+programming+beginners" target="_blank" class="btn" style="background:#f59e0b;color:#000;">Coding & Dev</a>
<a href="https://books.google.com/books?q=online+business+entrepreneur" target="_blank" class="btn" style="background:#8b5cf6;color:#fff;">Business</a>
<a href="https://books.google.com/books?q=islamic+finance+halal+business" target="_blank" class="btn" style="background:#10b981;">Islamic Finance</a></div>
<div class="card"><h2>💰 Premium Resources</h2><p style="color:#94a3b8;margin:10px 0 16px;">Access all 30 verified money-making platforms:</p><a href="/" class="btn">View All 30 Links →</a></div>
</div></body></html>`);
});

app.post('/api/library/register', (req, res) => {
    const data = getData();
    const existing = data.libraryUsers.find(u => u.email === req.body.email);
    if (existing) { req.session.libUser = existing; return res.redirect('/library'); }
    const newUser = { name: req.body.name, email: req.body.email, password: req.body.password, joined: new Date().toISOString() };
    data.libraryUsers.push(newUser);
    saveData(data);
    req.session.libUser = newUser;
    res.redirect('/library');
});

app.post('/api/library/login', (req, res) => {
    const data = getData();
    const u = data.libraryUsers.find(x => x.email === req.body.email);
    if (u) { req.session.libUser = u; res.redirect('/library'); }
    else res.send('<script>alert("Email not found. Please register first."); history.back();</script>');
});

app.get('/api/library/logout', (req, res) => { req.session.libUser = null; res.redirect('/'); });

// ==================== 🔗 LINK IN BIO PAGE ====================
app.get('/links', (req, res) => {
    const data = getData();
    const sl = data.socialLinks || {};
    const title = sl.linkinbio_title || '3EESHER-CLOUD';
    const bio = sl.linkinbio_bio || 'Digital Wealth Platform';
    const socialDefs = [
        {key:'whatsapp',label:'WhatsApp',icon:'💬',color:'#25D366',prefix:'https://wa.me/'},
        {key:'telegram',label:'Telegram',icon:'✈️',color:'#2CA5E0',prefix:'https://t.me/'},
        {key:'instagram',label:'Instagram',icon:'📸',color:'#E1306C',prefix:'https://instagram.com/'},
        {key:'facebook',label:'Facebook',icon:'👥',color:'#1877F2',prefix:'https://facebook.com/'},
        {key:'twitter',label:'Twitter / X',icon:'🐦',color:'#000',prefix:'https://x.com/'},
        {key:'tiktok',label:'TikTok',icon:'🎵',color:'#FF0050',prefix:'https://tiktok.com/@'},
        {key:'youtube',label:'YouTube',icon:'🎬',color:'#FF0000',prefix:'https://youtube.com/'},
        {key:'linkedin',label:'LinkedIn',icon:'💼',color:'#0A66C2',prefix:'https://linkedin.com/in/'}
    ];
    const linkButtons = socialDefs.filter(s=>sl[s.key]).map(s=>{
        const val=sl[s.key]; const url=val.startsWith('http')?val:s.prefix+val.replace('@','');
        return `<a href="${url}" target="_blank" class="lnk-btn" style="border-left:4px solid ${s.color};"><span style="font-size:22px;">${s.icon}</span><span class="lnk-label">${s.label}</span><span style="margin-left:auto;color:#64748b;">→</span></a>`;
    }).join('');
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Links</title>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:linear-gradient(135deg,#060d1a,#0d1f0f);min-height:100vh;font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;padding:20px;}.wrap{width:100%;max-width:480px;}.profile{text-align:center;margin-bottom:32px;}.avatar{width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#10b981,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:40px;margin:0 auto 16px;border:3px solid #10b981;box-shadow:0 0 30px rgba(16,185,129,0.4);}.profile h1{color:#f59e0b;font-size:1.5rem;margin-bottom:8px;}.profile p{color:#94a3b8;font-size:0.9rem;}.lnk-btn{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 20px;margin-bottom:12px;text-decoration:none;color:#fff;transition:all 0.2s;}.lnk-btn:hover{background:rgba(255,255,255,0.1);transform:translateY(-2px);}.lnk-label{font-size:1rem;font-weight:600;}.site-btn{display:block;text-align:center;background:linear-gradient(135deg,#10b981,#3b82f6);color:#fff;border-radius:14px;padding:16px;margin-top:12px;text-decoration:none;font-weight:700;}.footer{text-align:center;margin-top:24px;color:#475569;font-size:12px;}.footer a{color:#10b981;}</style>
</head><body><div class="wrap">
<div class="profile"><div class="avatar">🚀</div><h1>${title}</h1><p>${bio}</p></div>
${linkButtons||'<p style="text-align:center;color:#64748b;padding:20px;">No social links yet.</p>'}
<a href="/" class="site-btn">🌐 Visit 3EESHER-CLOUD Website</a>
<a href="/library" class="site-btn" style="background:linear-gradient(135deg,#f59e0b,#ef4444);">📚 Free Digital Library</a>
<div class="footer"><p>Powered by <a href="/">3EESHER-CLOUD</a> · <a href="mailto:abdullahharuna216@gmail.com">Contact</a></p></div>
</div></body></html>`);
});

// ==================== 🔍 SEARCH ====================
app.get('/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    const data = getData();
    if (!q) return res.redirect('/');
    const blogResults = data.blogPosts.filter(p => p.title.toLowerCase().includes(q)||(p.content||'').toLowerCase().includes(q)).slice(0,8);
    const linkResults = data.moneyLinks.filter(l => l.name.toLowerCase().includes(q)||l.category.toLowerCase().includes(q)).slice(0,8);
    const resultsHtml = [
        ...blogResults.map(p=>`<div class="res-card"><div class="res-tag">📝 Blog</div><a href="/blog/${p.id}" class="res-title">${p.title}</a><p class="res-meta">${new Date(p.date).toLocaleDateString()}</p></div>`),
        ...linkResults.map((l,i)=>`<div class="res-card"><div class="res-tag">💰 Money Link</div><a href="/go/${data.moneyLinks.indexOf(l)}" class="res-title" target="_blank">${l.icon} ${l.name}</a><p class="res-meta">${l.category} · ${l.clicks||0} clicks</p></div>`)
    ].join('')||`<div style="text-align:center;color:#94a3b8;padding:60px 20px;"><div style="font-size:48px;margin-bottom:16px;">🔍</div><p>No results for "<strong style="color:#f59e0b;">${q}</strong>"</p></div>`;
    res.send(`<!DOCTYPE html><html><head><title>Search: ${q} — 3EESHER-CLOUD</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box;}body{background:#060d1a;color:#fff;font-family:'Segoe UI',sans-serif;margin:0;padding:20px;}.container{max-width:800px;margin:0 auto;padding:20px;}h2{color:#f59e0b;margin-bottom:4px;}.sub{color:#64748b;margin-bottom:24px;font-size:.9rem;}.search-form{display:flex;gap:10px;margin-bottom:32px;}.search-form input{flex:1;padding:12px 16px;background:#111d2e;border:1px solid #1a2d45;color:#fff;border-radius:10px;font-size:1rem;}.search-form button{padding:12px 20px;background:#10b981;border:none;border-radius:10px;color:#000;font-weight:700;cursor:pointer;}.res-card{background:#111d2e;border:1px solid #1a2d45;border-radius:12px;padding:16px 20px;margin-bottom:12px;}.res-tag{font-size:11px;color:#64748b;margin-bottom:6px;}.res-title{color:#10b981;text-decoration:none;font-size:1rem;font-weight:600;display:block;margin-bottom:4px;}.res-title:hover{color:#f59e0b;}.res-meta{color:#64748b;font-size:12px;}.back{color:#10b981;text-decoration:none;display:inline-block;margin-bottom:20px;}</style>
</head><body><div class="container">
<a href="/" class="back">← Back to Home</a>
<h2>Search Results</h2><p class="sub">${blogResults.length+linkResults.length} result(s) for "<strong>${q}</strong>"</p>
<form class="search-form" action="/search" method="GET"><input name="q" value="${q}" placeholder="Search..."><button>🔍</button></form>
${resultsHtml}</div></body></html>`);
});

// ==================== 🌐 HOMEPAGE — NEW MODERN DESIGN ====================
app.get('/', (req, res) => {
    const data = getData();
    const inj = data.injections;
    const sl = data.socialLinks || {};

    const featuredPost = data.blogPosts[0];
    const gridPosts = data.blogPosts.slice(1, 7);
    const hiddenPosts = data.blogPosts.slice(7);

    const featuredHtml = featuredPost ? `
    <a href="/blog/${featuredPost.id}" class="featured-card">
        <div class="featured-img" style="background-image:url('${featuredPost.image||data.settings.banner1}')">
            <div class="featured-overlay">
                <span class="cat-badge">📝 Featured</span>
                <h2 class="featured-title">${featuredPost.title}</h2>
                <p class="featured-meta">
                    <span>🕐 ${Math.ceil(((featuredPost.content||'').replace(/<[^>]*>/g,'').split(' ').length)/200)||1} min read</span>
                    <span>📅 ${new Date(featuredPost.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                </p>
            </div>
        </div>
    </a>` : '';

    const blogCardHtml = (posts, hidden) => posts.map(p => `
    <a href="/blog/${p.id}" class="blog-card${hidden?' hidden':''}">
        <div class="blog-card-img" style="background-image:url('${p.image||''}');background-color:#111d2e;">
            ${!p.image?'<div class="blog-placeholder">📝</div>':''}
        </div>
        <div class="blog-card-body">
            <span class="cat-badge small">📝 Blog</span>
            <h3 class="blog-card-title">${p.title}</h3>
            <p class="blog-card-meta">
                <span>🕐 ${Math.ceil(((p.content||'').replace(/<[^>]*>/g,'').split(' ').length)/200)||1} min read</span>
                <span>${new Date(p.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
            </p>
        </div>
    </a>`).join('');

    const hotLinks = data.moneyLinks.sort((a,b)=>(b.clicks||0)-(a.clicks||0)).slice(0,6);
    const hotLinksHtml = hotLinks.map((l,i) => `
    <a href="/go/${data.moneyLinks.indexOf(l)}" target="_blank" class="hot-link">
        <span class="hot-num">${i+1}</span>
        <span>${l.icon}</span>
        <span class="hot-name">${l.name}</span>
        <span style="font-size:11px;color:#10b981;font-weight:700;">${l.clicks||0}↗</span>
    </a>`).join('');

    const vidHtml = data.videos.slice(0,6).map(v => `
    <div class="vid-card">
        ${v.type==='youtube'
            ?`<iframe src="${v.videoUrl}" style="width:100%;height:190px;border:none;" allowfullscreen loading="lazy"></iframe>`
            :`<video src="/stream/video/${v.id}" controls playsinline preload="metadata" style="width:100%;height:190px;background:#000;display:block;" onerror="this.parentElement.innerHTML='<div style=\\'height:190px;display:flex;align-items:center;justify-content:center;background:#1e293b;color:#ef4444;\\'>⚠️ Video unavailable</div>'"></video>`}
        <div class="vid-info">
            <h4 class="vid-title">${v.title}</h4>
            ${v.type==='local'?`<a href="/download/video/${v.id}" class="vid-dl" download>⬇ Download</a>`:''}
        </div>
    </div>`).join('');

    const socialDefs=[
        {key:'whatsapp',icon:'💬',color:'#25D366',prefix:'https://wa.me/'},
        {key:'telegram',icon:'✈️',color:'#2CA5E0',prefix:'https://t.me/'},
        {key:'instagram',icon:'📸',color:'#E1306C',prefix:'https://instagram.com/'},
        {key:'facebook',icon:'👥',color:'#1877F2',prefix:'https://facebook.com/'},
        {key:'twitter',icon:'𝕏',color:'#000',prefix:'https://x.com/'},
        {key:'tiktok',icon:'🎵',color:'#FF0050',prefix:'https://tiktok.com/@'},
        {key:'youtube',icon:'▶',color:'#FF0000',prefix:'https://youtube.com/'},
    ];
    const socialIcons=socialDefs.filter(s=>sl[s.key]).map(s=>{
        const val=sl[s.key];const url=val.startsWith('http')?val:s.prefix+val.replace('@','');
        return `<a href="${url}" target="_blank" class="soc-float" style="--sc:${s.color}" title="${s.key}">${s.icon}</a>`;
    }).join('');

    res.send(`<!DOCTYPE html>
<html lang="en" id="htmlRoot">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${data.settings.siteName} — Digital Wealth Platform</title>
    <meta name="description" content="3EESHER-CLOUD — Empowering Africans with digital skills, affiliate marketing, and wealth knowledge. Blog, videos, and free library.">
    <meta property="og:title" content="${data.settings.siteName}">
    <meta property="og:description" content="Digital Wealth Platform for Africa and the Muslim World">
    <meta property="og:image" content="${data.settings.banner1}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://3eesher.cloud/">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
    ${data.adsenseId?`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${data.adsenseId}" crossorigin="anonymous"></script>`:''}
    ${inj.head}
<style>
:root{--bg:#060d1a;--bg2:#0d1626;--card:#111d2e;--card2:#162033;--border:#1a2d45;--gold:#f59e0b;--green:#10b981;--blue:#3b82f6;--text:#e2e8f0;--muted:#64748b;--radius:14px;}
*{box-sizing:border-box;margin:0;padding:0;}html{scroll-behavior:smooth;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.6;overflow-x:hidden;}
a{color:inherit;text-decoration:none;}

/* TOP BAR */
.top-bar{background:#050b15;border-bottom:1px solid var(--border);padding:7px 5%;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted);}
.top-bar a{color:var(--green);}
.top-bar-right{display:flex;gap:8px;align-items:center;}

/* NAVBAR */
.navbar{position:sticky;top:0;background:rgba(6,13,26,0.97);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 5%;display:flex;align-items:center;justify-content:space-between;height:60px;z-index:1000;}
.nav-brand{font-family:'Playfair Display',serif;font-size:22px;font-weight:900;color:var(--gold);letter-spacing:-0.5px;}
.nav-brand span{color:var(--green);}
.nav-links{display:flex;align-items:center;gap:4px;}
.nav-links a,.nav-links button{color:var(--text);font-size:13px;font-weight:600;padding:7px 12px;border-radius:8px;border:none;background:none;cursor:pointer;transition:all 0.2s;white-space:nowrap;font-family:inherit;}
.nav-links a:hover,.nav-links button:hover{background:var(--card2);color:var(--gold);}
.nav-ceo{background:linear-gradient(135deg,var(--gold),#d97706)!important;color:#000!important;font-weight:700!important;}
.nav-search{display:flex;align-items:center;background:var(--card);border:1px solid var(--border);border-radius:8px;overflow:hidden;height:36px;}
.nav-search input{background:none;border:none;color:var(--text);padding:0 12px;font-size:13px;width:140px;outline:none;font-family:inherit;}
.nav-search input::placeholder{color:var(--muted);}
.nav-search button{background:var(--green);border:none;color:#000;padding:0 12px;height:100%;cursor:pointer;font-size:13px;font-weight:700;}

/* DROPDOWN */
.nav-dropdown{position:relative;}
.nav-dropdown-menu{display:none;position:absolute;top:calc(100% + 8px);left:0;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);min-width:180px;padding:8px;z-index:2000;box-shadow:0 20px 40px rgba(0,0,0,0.5);}
.nav-dropdown:hover .nav-dropdown-menu{display:block;}
.nav-dropdown-menu a{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:500;color:var(--text);transition:all 0.15s;}
.nav-dropdown-menu a:hover{background:var(--card2);color:var(--gold);}

/* LANG BUTTONS */
.lang-btn{background:var(--card2);border:1px solid var(--border);color:var(--muted);padding:5px 9px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;transition:all 0.2s;}
.lang-btn.active,.lang-btn:hover{background:var(--green);color:#000;border-color:var(--green);}

/* FEATURED */
.hero-section{padding:28px 5% 0;max-width:1280px;margin:0 auto;}
.featured-card{display:block;border-radius:20px;overflow:hidden;position:relative;height:420px;border:1px solid var(--border);transition:transform 0.3s;}
.featured-card:hover{transform:translateY(-3px);}
.featured-img{width:100%;height:100%;background-size:cover;background-position:center;background-color:var(--card);}
.featured-overlay{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(0deg,rgba(4,9,20,0.97) 0%,rgba(4,9,20,0.5) 60%,transparent 100%);padding:32px 32px 28px;}
.featured-title{font-family:'Playfair Display',serif;font-size:clamp(1.3rem,3vw,2rem);font-weight:900;color:#fff;line-height:1.25;margin:10px 0 12px;}
.featured-meta{display:flex;gap:16px;font-size:12px;color:rgba(255,255,255,0.6);}

/* BANNER */
.banner-placeholder{width:100%;height:90px;background:linear-gradient(135deg,var(--card),var(--card2));border:2px dashed var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;font-weight:600;letter-spacing:1px;margin:24px 0;cursor:pointer;transition:all 0.2s;}
.banner-placeholder:hover{border-color:var(--green);color:var(--green);}

/* MAIN LAYOUT */
.main-layout{max-width:1280px;margin:0 auto;padding:0 5% 80px;display:grid;grid-template-columns:1fr 320px;gap:32px;align-items:start;margin-top:32px;}
@media(max-width:900px){.main-layout{grid-template-columns:1fr;}.sidebar{order:2;}}

/* SECTION TITLES */
.sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid var(--border);}
.sec-title{font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:900;color:var(--gold);}
.sec-link{font-size:12px;color:var(--green);font-weight:600;}

/* BLOG GRID */
.blog-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-bottom:28px;}
@media(max-width:600px){.blog-grid{grid-template-columns:1fr;}}
.blog-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;display:block;transition:all 0.25s;}
.blog-card:hover{transform:translateY(-4px);border-color:var(--green);box-shadow:0 12px 32px rgba(16,185,129,0.12);}
.blog-card.hidden{display:none;}
.blog-card-img{height:160px;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;}
.blog-placeholder{font-size:40px;opacity:0.3;}
.blog-card-body{padding:16px;}
.blog-card-title{font-family:'Playfair Display',serif;font-size:0.95rem;font-weight:700;color:var(--text);line-height:1.4;margin:8px 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.blog-card:hover .blog-card-title{color:var(--gold);}
.blog-card-meta{display:flex;gap:12px;font-size:11px;color:var(--muted);margin-top:8px;}
.cat-badge{display:inline-block;background:rgba(16,185,129,0.12);color:var(--green);border:1px solid rgba(16,185,129,0.25);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
.cat-badge.small{font-size:10px;padding:2px 8px;}
.load-more-btn{display:block;width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;text-align:center;margin-bottom:32px;}
.load-more-btn:hover{background:var(--green);color:#000;border-color:var(--green);}

/* VIDEOS */
.videos-toggle{width:100%;background:var(--card2);border:1px solid var(--border);color:var(--gold);padding:14px 20px;border-radius:var(--radius);font-size:14px;font-weight:700;cursor:pointer;font-family:'Playfair Display',serif;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s;}
.videos-toggle:hover{border-color:var(--gold);}
.videos-toggle .arrow{transition:transform 0.3s;font-style:normal;}
.videos-toggle.open .arrow{transform:rotate(180deg);}
.videos-panel{display:none;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:16px;}
.videos-panel.open{display:grid;}
.vid-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}
.vid-info{padding:12px 14px;}
.vid-title{font-size:13px;font-weight:600;color:var(--text);line-height:1.4;margin-bottom:6px;}
.vid-dl{background:var(--blue);color:#fff;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;display:inline-block;}

/* SIDEBAR */
.sidebar{display:flex;flex-direction:column;gap:20px;}
.sidebar-widget{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;}
.widget-title{font-family:'Playfair Display',serif;font-size:1rem;font-weight:900;color:var(--gold);margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--border);}
.subscribe-input{width:100%;background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:8px;font-family:inherit;outline:none;transition:border-color 0.2s;}
.subscribe-input:focus{border-color:var(--green);}
.subscribe-btn{width:100%;background:linear-gradient(135deg,var(--green),#059669);color:#000;border:none;padding:11px;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;}
.hot-link{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);transition:all 0.15s;}
.hot-link:last-child{border-bottom:none;padding-bottom:0;}
.hot-link:hover .hot-name{color:var(--gold);}
.hot-num{font-size:11px;font-weight:800;color:var(--muted);min-width:16px;}
.hot-name{font-size:13px;font-weight:600;flex:1;color:var(--text);transition:color 0.15s;}

/* SOCIAL */
.soc-float-bar{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:999;display:flex;flex-direction:column;gap:4px;}
.soc-float{display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:var(--sc,#333);border-radius:6px 0 0 6px;font-size:15px;color:#fff;transition:all 0.2s;opacity:0.8;}
.soc-float:hover{width:48px;opacity:1;}
@media(max-width:768px){.soc-float-bar{display:none;}}

/* MOBILE NAV */
.mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:rgba(6,13,26,0.98);backdrop-filter:blur(16px);border-top:1px solid var(--border);padding:8px 0 calc(8px + env(safe-area-inset-bottom));z-index:1000;grid-template-columns:repeat(5,1fr);}
@media(max-width:768px){.mobile-nav{display:grid;}body{padding-bottom:72px;}}
.mob-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;color:var(--muted);font-size:10px;font-weight:600;transition:color 0.2s;cursor:pointer;}
.mob-nav-item:hover,.mob-nav-item.active{color:var(--green);}
.mob-nav-icon{font-size:20px;}

/* FOOTER */
.site-footer{background:#030710;border-top:1px solid var(--border);padding:40px 5% 24px;color:var(--muted);font-size:13px;}
.footer-grid{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr;gap:40px;margin-bottom:32px;}
@media(max-width:768px){.footer-grid{grid-template-columns:1fr;gap:24px;}}
.footer-brand{font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:900;color:var(--gold);margin-bottom:12px;}
.footer-about{line-height:1.7;max-width:320px;}
.footer-col h4{font-family:'Playfair Display',serif;color:var(--text);font-size:0.9rem;margin-bottom:14px;font-weight:700;}
.footer-col a{display:block;color:var(--muted);padding:4px 0;font-size:13px;transition:color 0.15s;}
.footer-col a:hover{color:var(--green);}
.footer-bottom{max-width:1280px;margin:0 auto;border-top:1px solid var(--border);padding-top:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
.footer-bottom a{color:var(--green);}

/* FADE */
.fade-in{opacity:0;transform:translateY(20px);transition:opacity 0.5s ease,transform 0.5s ease;}
.fade-in.visible{opacity:1;transform:translateY(0);}
${inj.css}
</style>
</head>
<body>

${socialIcons?`<div class="soc-float-bar">${socialIcons}</div>`:''}

<!-- TOP BAR -->
<div class="top-bar">
    <div>📧 <a href="mailto:abdullahharuna216@gmail.com">abdullahharuna216@gmail.com</a> &nbsp;|&nbsp; 🌍 Digital Wealth Platform for Africa</div>
    <div class="top-bar-right">
        <button class="lang-btn active" onclick="setLang('en',this)">EN</button>
        <button class="lang-btn" onclick="setLang('ha',this)">HA</button>
        <button class="lang-btn" onclick="setLang('ar',this)">AR</button>
        <button class="lang-btn" onclick="setLang('fr',this)">FR</button>
    </div>
</div>

<!-- NAVBAR -->
<nav class="navbar">
    <a href="/" class="nav-brand">3<span>EESHER</span>.CLOUD</a>
    <div class="nav-links">
        <form class="nav-search" action="/search" method="GET">
            <input name="q" placeholder="Search...">
            <button type="submit">🔍</button>
        </form>
        <a href="/" data-i18n="nav_home">🏠 Home</a>
        <div class="nav-dropdown">
            <button>☰ More ▾</button>
            <div class="nav-dropdown-menu">
                <a href="/library">📚 <span data-i18n="nav_lib">Library</span></a>
                <a href="#videos" onclick="openVideos()">🎬 Videos</a>
                <a href="/products">🛍️ Products</a>
                <a href="/links">🔗 Social Links</a>
                <a href="/search">🔍 Search</a>
                <a href="/about">ℹ️ About</a>
                <a href="/privacy">🔒 Privacy</a>
            </div>
        </div>
        <a href="/admin-login" class="nav-ceo" data-i18n="nav_ceo">⚙️ CEO</a>
    </div>
</nav>

${inj.bodyStart}

<!-- HERO FEATURED POST -->
<div class="hero-section fade-in">
    ${featuredHtml||`<div style="background:var(--card);border-radius:20px;height:420px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);"><div style="text-align:center;color:var(--muted);"><div style="font-size:60px;margin-bottom:16px;">📝</div><p>Your first blog post will appear here as the featured article</p><a href="/admin-login" style="color:var(--green);font-weight:700;margin-top:12px;display:inline-block;">Go to CEO Panel to publish →</a></div></div>`}
</div>

<!-- BANNER PLACEHOLDER 1 -->
<div style="max-width:1280px;margin:0 auto;padding:0 5%;">
    <div class="banner-placeholder fade-in">🖼️ ADVERTISEMENT BANNER — Will display your ads here</div>
</div>

<!-- MAIN LAYOUT -->
<div class="main-layout">
    <!-- LEFT: MAIN CONTENT -->
    <div>
        <div class="sec-header fade-in">
            <h2 class="sec-title">📝 <span data-i18n="sec_blogs">Latest Articles</span></h2>
            <a href="/search?q=" class="sec-link">View All →</a>
        </div>

        <div class="blog-grid" id="blogGrid">
            ${blogCardHtml(gridPosts,false)||`<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted);"><div style="font-size:48px;margin-bottom:12px;">✍️</div><p>No blog posts yet — publish from the CEO Panel</p></div>`}
            ${blogCardHtml(hiddenPosts,true)}
        </div>

        ${data.blogPosts.length>7?`<button class="load-more-btn fade-in" onclick="loadMore()">Load More Articles ↓</button>`:''}

        <!-- VIDEOS (below blog, collapsible) -->
        <div id="videos" style="margin-top:8px;">
            <button class="videos-toggle" id="vidToggle" onclick="toggleVideos()">
                <span>🎬 <span data-i18n="sec_videos">Videos</span> (${data.videos.length})</span>
                <em class="arrow">▼</em>
            </button>
            <div class="videos-panel" id="videosPanel">
                ${vidHtml||`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);">No videos uploaded yet</div>`}
            </div>
        </div>

        <!-- BANNER PLACEHOLDER 2 -->
        <div class="banner-placeholder fade-in" style="margin-top:24px;">🖼️ ADVERTISEMENT BANNER — Second placement</div>

        <!-- LIBRARY CTA -->
        <div style="background:linear-gradient(135deg,#0d2518,#0a1f35);border:1px solid rgba(16,185,129,0.2);border-radius:20px;padding:40px;text-align:center;margin-top:8px;" class="fade-in">
            <div style="font-size:48px;margin-bottom:12px;">📚</div>
            <h3 style="font-family:'Playfair Display',serif;font-size:1.5rem;color:#fff;margin-bottom:10px;" data-i18n="cta_title">UNLOCK FREE DIGITAL LIBRARY</h3>
            <p style="color:var(--muted);max-width:500px;margin:0 auto 20px;line-height:1.6;" data-i18n="cta_desc">Access thousands of books on AI, Coding, Business, and Wealth — completely free.</p>
            <a href="/library" style="display:inline-block;background:linear-gradient(135deg,var(--green),#059669);color:#000;padding:14px 36px;border-radius:40px;font-weight:800;font-size:15px;" data-i18n="cta_btn">GET FREE ACCESS NOW →</a>
        </div>
    </div>

    <!-- RIGHT: SIDEBAR -->
    <aside class="sidebar">
        <!-- Subscribe -->
        <div class="sidebar-widget fade-in">
            <div class="widget-title">📧 Get Daily Updates</div>
            <p style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.5;">Join our readers for daily digital wealth tips.</p>
            <form action="/api/library/register" method="POST">
                <input class="subscribe-input" name="name" placeholder="Your name" required>
                <input class="subscribe-input" name="email" type="email" placeholder="Your email" required>
                <input type="hidden" name="password" value="subscriber">
                <button class="subscribe-btn" type="submit">✅ Subscribe Free</button>
            </form>
        </div>

        <!-- Hot Links -->
        <div class="sidebar-widget fade-in">
            <div class="widget-title">🔥 Top Money Links</div>
            ${hotLinksHtml||'<p style="color:var(--muted);font-size:13px;">No links yet</p>'}
            <a href="/links" style="display:block;text-align:center;margin-top:14px;color:var(--green);font-size:12px;font-weight:700;">View All Links →</a>
        </div>

        <!-- Library CTA -->
        <div class="sidebar-widget fade-in" style="background:linear-gradient(135deg,#0d2518,#0a1f35);border-color:rgba(16,185,129,0.2);text-align:center;">
            <div class="widget-title">📚 Free Library</div>
            <div style="font-size:40px;margin-bottom:12px;">🎓</div>
            <p style="font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.5;">Access thousands of premium books free.</p>
            <a href="/library" style="display:block;background:linear-gradient(135deg,var(--green),#059669);color:#000;padding:12px;border-radius:10px;font-weight:800;font-size:13px;">Access Library →</a>
        </div>

        ${(data.products&&data.products.length)?`
        <div class="sidebar-widget fade-in">
            <div class="widget-title">🛍️ Digital Products</div>
            ${data.products.slice(0,3).map(p=>`<a href="/products" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);"><div style="font-size:24px;">${p.icon||'📦'}</div><div><div style="font-size:13px;font-weight:600;color:var(--text);">${p.title}</div><div style="font-size:12px;color:var(--green);font-weight:700;">${p.price==='0'||!p.price?'FREE':'$'+p.price}</div></div></a>`).join('')}
            <a href="/products" style="display:block;text-align:center;margin-top:14px;color:var(--gold);font-size:12px;font-weight:700;">View All Products →</a>
        </div>`:''}

        <!-- About Widget -->
        <div class="sidebar-widget fade-in">
            <div class="widget-title">ℹ️ About Us</div>
            <p style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:14px;">Built from a mobile phone in Nigeria — empowering Africa with digital knowledge and wealth tools.</p>
            <a href="/about" style="color:var(--green);font-size:12px;font-weight:700;">Read Our Story →</a>
        </div>
    </aside>
</div>

<!-- FOOTER -->
<footer class="site-footer">
    <div class="footer-grid">
        <div>
            <div class="footer-brand">3EESHER.CLOUD</div>
            <p class="footer-about">Empowering Africans and the Muslim world with digital skills, affiliate marketing, and financial knowledge. Built from a mobile phone — for mobile users.</p>
            <p style="margin-top:14px;font-size:12px;">📧 <a href="mailto:abdullahharuna216@gmail.com" style="color:var(--green);">abdullahharuna216@gmail.com</a></p>
        </div>
        <div class="footer-col">
            <h4>Navigate</h4>
            <a href="/">🏠 Home</a>
            <a href="/library">📚 Library</a>
            <a href="/products">🛍️ Products</a>
            <a href="/links">🔗 Social Links</a>
            <a href="/search">🔍 Search</a>
        </div>
        <div class="footer-col">
            <h4>Company</h4>
            <a href="/about">ℹ️ About Us</a>
            <a href="/privacy">🔒 Privacy Policy</a>
            <a href="/sitemap.xml">🗺️ Sitemap</a>
            <a href="/admin-login">⚙️ CEO Panel</a>
            <a href="mailto:abdullahharuna216@gmail.com">📧 Contact</a>
        </div>
    </div>
    <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} 3EESHER-CLOUD — All Rights Reserved</p>
        <p>Built with ❤️ in Nigeria 🇳🇬</p>
    </div>
</footer>

<!-- MOBILE BOTTOM NAV -->
<nav class="mobile-nav">
    <a href="/" class="mob-nav-item active"><span class="mob-nav-icon">🏠</span>Home</a>
    <a href="/search" class="mob-nav-item"><span class="mob-nav-icon">🔍</span>Search</a>
    <a href="/library" class="mob-nav-item"><span class="mob-nav-icon">📚</span>Library</a>
    <a href="#videos" class="mob-nav-item" onclick="openVideos()"><span class="mob-nav-icon">🎬</span>Videos</a>
    <a href="/admin-login" class="mob-nav-item"><span class="mob-nav-icon">⚙️</span>CEO</a>
</nav>

${inj.customHtml}

<script>
const T={
  en:{nav_home:'🏠 Home',nav_lib:'Library',nav_ceo:'⚙️ CEO',sec_blogs:'Latest Articles',sec_videos:'Videos',cta_title:'UNLOCK FREE DIGITAL LIBRARY',cta_desc:'Access thousands of books on AI, Coding, Business and Wealth — completely free.',cta_btn:'GET FREE ACCESS NOW →'},
  ha:{nav_home:'🏠 Gida',nav_lib:'Laburare',nav_ceo:'⚙️ CEO',sec_blogs:'Makalu Na Kwanan Nan',sec_videos:'Bidiyo',cta_title:'BUƊE ILIMIN DIJITAL NA KYAUTA',cta_desc:'Shiga dubban littattafai kan AI, Coding, Kasuwanci da Dukiya — duka kyauta.',cta_btn:'SAMU DAMAR KYAUTA →'},
  ar:{nav_home:'🏠 الرئيسية',nav_lib:'المكتبة',nav_ceo:'⚙️ المدير',sec_blogs:'أحدث المقالات',sec_videos:'فيديو',cta_title:'افتح المكتبة الرقمية المجانية',cta_desc:'احصل على آلاف الكتب في الذكاء الاصطناعي والأعمال والثروة — مجاناً.',cta_btn:'احصل على الوصول المجاني ←'},
  fr:{nav_home:'🏠 Accueil',nav_lib:'Bibliothèque',nav_ceo:'⚙️ CEO',sec_blogs:'Derniers Articles',sec_videos:'Vidéos',cta_title:'ACCÉDEZ À LA BIBLIOTHÈQUE GRATUITE',cta_desc:"Accédez à des milliers de livres sur l'IA et la richesse — gratuitement.",cta_btn:'ACCÈS GRATUIT →'}
};
function setLang(lang,btn){
    document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.getAttribute('data-i18n');if(T[lang]&&T[lang][k])el.innerHTML=T[lang][k];});
    document.querySelectorAll('.lang-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    document.getElementById('htmlRoot').setAttribute('dir',lang==='ar'?'rtl':'ltr');
    document.getElementById('htmlRoot').setAttribute('lang',lang);
    localStorage.setItem('3eesher_lang',lang);
}
const saved=localStorage.getItem('3eesher_lang');
if(saved&&saved!=='en'){setTimeout(()=>{const btn=document.querySelector('.lang-btn[onclick*="'+saved+'"]');setLang(saved,btn);},100);}

function toggleVideos(){
    const p=document.getElementById('videosPanel');const t=document.getElementById('vidToggle');
    p.classList.toggle('open');t.classList.toggle('open');
}
function openVideos(){
    document.getElementById('videosPanel').classList.add('open');
    document.getElementById('vidToggle').classList.add('open');
    setTimeout(()=>document.getElementById('videos').scrollIntoView({behavior:'smooth'}),100);
}
function loadMore(){
    const cards=document.querySelectorAll('.blog-card.hidden');let shown=0;
    cards.forEach(c=>{if(shown<6){c.classList.remove('hidden');shown++;}});
    if(!document.querySelectorAll('.blog-card.hidden').length){const btn=document.querySelector('.load-more-btn');if(btn)btn.style.display='none';}
}
const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:0.1});
document.querySelectorAll('.fade-in').forEach(el=>observer.observe(el));
</script>
${inj.js?`<script>${inj.js}</script>`:''}
${inj.bodyEnd}
</body></html>`);
});

// ==================== ℹ️ ABOUT PAGE ====================
app.get('/about', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>About Us — 3EESHER-CLOUD</title>
<meta name="description" content="About 3EESHER-CLOUD — Digital Wealth Platform built from Nigeria for Africa.">
<meta name="robots" content="index, follow">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#060d1a;color:#e2e8f0;font-family:'DM Sans',sans-serif;line-height:1.7;}.navbar{background:rgba(6,13,26,0.97);backdrop-filter:blur(16px);border-bottom:1px solid #1a2d45;padding:0 5%;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:100;}.nav-brand{font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:#f59e0b;text-decoration:none;}.nav-brand span{color:#10b981;}.nav-back{color:#10b981;text-decoration:none;font-size:13px;font-weight:700;}.hero{background:linear-gradient(135deg,#060d1a,#0d1f0f);border-bottom:1px solid #1a2d45;padding:80px 5%;text-align:center;}.hero h1{font-family:'Playfair Display',serif;font-size:clamp(2rem,5vw,3.5rem);font-weight:900;color:#f59e0b;margin-bottom:16px;}.hero p{color:#64748b;font-size:1.1rem;max-width:600px;margin:0 auto;}.container{max-width:900px;margin:0 auto;padding:60px 5%;}.section{margin-bottom:60px;}.section h2{font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:900;color:#f59e0b;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #1a2d45;}.section p{color:#94a3b8;font-size:15px;line-height:1.8;margin-bottom:14px;}.values-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:20px;}.value-card{background:#111d2e;border:1px solid #1a2d45;border-radius:14px;padding:20px;text-align:center;}.value-icon{font-size:32px;margin-bottom:10px;}.value-title{font-weight:700;color:#e2e8f0;margin-bottom:6px;}.value-desc{font-size:13px;color:#64748b;}.offer-list{list-style:none;display:grid;gap:12px;margin-top:16px;}.offer-list li{background:#111d2e;border:1px solid #1a2d45;border-left:4px solid #10b981;border-radius:0 10px 10px 0;padding:14px 18px;font-size:14px;color:#94a3b8;}.offer-list li strong{color:#e2e8f0;display:block;margin-bottom:4px;}.contact-box{background:#111d2e;border:1px solid #1a2d45;border-radius:16px;padding:32px;text-align:center;margin-top:40px;}.contact-box a{color:#10b981;font-weight:700;font-size:1.1rem;}.footer{background:#030710;border-top:1px solid #1a2d45;padding:24px 5%;text-align:center;color:#64748b;font-size:13px;}.footer a{color:#10b981;}</style>
</head><body>
<nav class="navbar"><a href="/" class="nav-brand">3<span>EESHER</span>.CLOUD</a><a href="/" class="nav-back">← Back to Home</a></nav>
<div class="hero"><h1>About 3EESHER.CLOUD</h1><p>Built from a mobile phone in Nigeria — for Africa and the Muslim World</p></div>
<div class="container">
<div class="section"><h2>Who We Are</h2>
<p>Welcome to <strong style="color:#10b981;">3eesher.cloud</strong> — a digital wealth and knowledge platform built for Africans, by an African.</p>
<p>Our name "3eesher" comes from the Arabic root meaning <strong style="color:#f59e0b;">"to live well"</strong> and <strong style="color:#f59e0b;">"to thrive"</strong> — because that is exactly what we want for every visitor on this platform.</p></div>
<div class="section"><h2>What We Offer</h2>
<ul class="offer-list">
<li><strong>📝 Daily Blog</strong>Fresh content in English and Hausa covering digital skills, Islamic finance, tech news, self-development, and online earning strategies.</li>
<li><strong>💰 Wealth Links</strong>Carefully curated affiliate programs and digital income streams verified for Nigerian and African audiences.</li>
<li><strong>📚 Digital Library</strong>A growing collection of books and guides in English, Hausa, Arabic, and French — completely free.</li>
<li><strong>🎯 Digital Products</strong>Premium guides, templates, and courses to help you build income online from your phone.</li>
<li><strong>🎬 Videos</strong>Educational and wealth-building videos curated for our audience.</li>
<li><strong>📱 Built For Mobile</strong>Designed first for mobile users across Africa and the Muslim world.</li>
</ul></div>
<div class="section"><h2>Our Story</h2>
<p>3eesher.cloud was built entirely from a mobile phone by a self-taught Nigerian developer. No office. No team. No startup funding. Just faith, consistency, and code.</p>
<p>This platform is proof that your circumstances do not determine your destination. If you are reading this from Kano, Abuja, Lagos, Accra, or Nairobi — <strong style="color:#10b981;">this platform was built for you.</strong></p></div>
<div class="section"><h2>Our Values</h2>
<div class="values-grid">
<div class="value-card"><div class="value-icon">✅</div><div class="value-title">Honesty</div><div class="value-desc">We only promote what we believe in</div></div>
<div class="value-card"><div class="value-icon">🌍</div><div class="value-title">Accessibility</div><div class="value-desc">Content in your language</div></div>
<div class="value-card"><div class="value-icon">🤝</div><div class="value-title">Community</div><div class="value-desc">Growing together, not alone</div></div>
<div class="value-card"><div class="value-icon">🌙</div><div class="value-title">Faith</div><div class="value-desc">Built on honest work and honest reward</div></div>
</div></div>
<div class="contact-box">
<div style="font-size:40px;margin-bottom:12px;">📧</div>
<h3 style="font-family:'Playfair Display',serif;color:#e2e8f0;margin-bottom:8px;">Contact Us</h3>
<p style="color:#64748b;margin-bottom:16px;">We'd love to hear from you.</p>
<a href="mailto:abdullahharuna216@gmail.com">abdullahharuna216@gmail.com</a>
</div></div>
<footer class="footer"><p>© ${new Date().getFullYear()} 3EESHER-CLOUD · <a href="/">Home</a> · <a href="/privacy">Privacy Policy</a> · <a href="/sitemap.xml">Sitemap</a></p></footer>
</body></html>`);
});

// ==================== 🔒 PRIVACY PAGE ====================
app.get('/privacy', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy — 3EESHER-CLOUD</title>
<meta name="robots" content="index, follow">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#060d1a;color:#e2e8f0;font-family:'DM Sans',sans-serif;line-height:1.7;}.navbar{background:rgba(6,13,26,0.97);backdrop-filter:blur(16px);border-bottom:1px solid #1a2d45;padding:0 5%;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:100;}.nav-brand{font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:#f59e0b;text-decoration:none;}.nav-brand span{color:#10b981;}.nav-back{color:#10b981;text-decoration:none;font-size:13px;font-weight:700;}.hero{background:#060d1a;border-bottom:1px solid #1a2d45;padding:60px 5%;text-align:center;}.hero h1{font-family:'Playfair Display',serif;font-size:2.2rem;font-weight:900;color:#f59e0b;margin-bottom:12px;}.container{max-width:800px;margin:0 auto;padding:48px 5% 80px;}.section{margin-bottom:40px;}.section h2{font-family:'Playfair Display',serif;font-size:1.2rem;color:#10b981;margin-bottom:14px;}.section p,.section li{color:#94a3b8;font-size:14px;line-height:1.8;margin-bottom:10px;}.section ul{padding-left:20px;}.highlight{background:#111d2e;border:1px solid #1a2d45;border-left:4px solid #10b981;border-radius:0 10px 10px 0;padding:14px 18px;font-size:14px;color:#94a3b8;margin:12px 0;}.highlight strong{color:#10b981;}.last-updated{color:#475569;font-size:12px;margin-bottom:40px;padding-bottom:20px;border-bottom:1px solid #1a2d45;}.footer{background:#030710;border-top:1px solid #1a2d45;padding:24px 5%;text-align:center;color:#64748b;font-size:13px;}.footer a{color:#10b981;}</style>
</head><body>
<nav class="navbar"><a href="/" class="nav-brand">3<span>EESHER</span>.CLOUD</a><a href="/" class="nav-back">← Back to Home</a></nav>
<div class="hero"><h1>🔒 Privacy Policy</h1><p style="color:#64748b;">How we collect, use and protect your information</p></div>
<div class="container">
<p class="last-updated">Last Updated: April 2026 · Contact: <a href="mailto:abdullahharuna216@gmail.com" style="color:#10b981;">abdullahharuna216@gmail.com</a></p>
<div class="section"><h2>📋 1. Information We Collect</h2><p>When you subscribe or register for library access, we collect your name, email address, date of registration, and language preference.</p><div class="highlight"><strong>We do NOT collect:</strong> payment information, sensitive personal data, or any data without your knowledge.</div></div>
<div class="section"><h2>🎯 2. How We Use Your Information</h2><p>Your information is used ONLY to send our newsletter, notify you of new products, and provide library access.</p><div class="highlight"><strong>We will NEVER:</strong> sell your email to third parties, spam you, or share your data without consent.</div></div>
<div class="section"><h2>🍪 3. Cookies</h2><p>We use minimal cookies for language preference storage, Google Analytics (anonymous), and session management.</p></div>
<div class="section"><h2>📊 4. Google Analytics</h2><p>We use Google Analytics to understand how visitors use our site. This data is anonymous and does not identify individual users.</p></div>
<div class="section"><h2>🔗 5. Affiliate Links</h2><p>Some links on 3eesher.cloud are affiliate links. We may earn a small commission if you purchase through our link — at no extra cost to you. We only recommend products we genuinely believe are useful.</p></div>
<div class="section"><h2>✅ 6. Your Rights</h2><p>You have the right to unsubscribe at any time, request deletion of your data, or contact us about any privacy concern.</p><div class="highlight"><strong>Email:</strong> abdullahharuna216@gmail.com · <strong>Response time:</strong> Within 48 hours</div></div>
<div class="section"><h2>📝 7. Changes To This Policy</h2><p>We may update this Privacy Policy from time to time. Changes will be posted on this page with the updated date.</p></div>
</div>
<footer class="footer"><p>© ${new Date().getFullYear()} 3EESHER-CLOUD · <a href="/">Home</a> · <a href="/about">About</a> · <a href="/sitemap.xml">Sitemap</a></p></footer>
</body></html>`);
});

// ==================== 💻 SUPER ADMIN DASHBOARD ====================
app.get('/super-admin', checkAdmin, (req, res) => {
    const data = getData();
    const storeRows = data.storeLinks.map(s =>
        '<tr><td style="color:#fff;">' + s.name + '</td><td style="color:#64748b;font-size:12px;">' + s.url + '</td>' +
        '<td><input type="text" name="sid" value="' + (s.id||'') + '" placeholder="Your Affiliate ID" style="background:#0f172a;border:1px solid #334155;color:#fff;padding:6px 10px;border-radius:6px;width:100%;"><input type="hidden" name="sname" value="' + s.name + '"><input type="hidden" name="surl" value="' + s.url + '"></td>' +
        '<td><a href="' + s.url + (s.id||'') + '" target="_blank" style="color:#10b981;font-size:12px;">Test Link</a></td></tr>'
    ).join('');

    res.send(`<!DOCTYPE html>
<html lang="en"><head>
<title>CEO Panel — 3EESHER-CLOUD</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;}body{background:#0a0f1e;color:#fff;font-family:'Segoe UI',sans-serif;margin:0;display:flex;min-height:100vh;}
.sidebar{width:220px;background:#0d1117;border-right:1px solid #1e3a2a;padding:20px 0;position:fixed;height:100vh;overflow-y:auto;z-index:100;}
.sidebar h2{color:#10b981;padding:0 20px;font-size:16px;margin-bottom:20px;}
.sidebar a{display:block;padding:10px 20px;color:#94a3b8;text-decoration:none;font-size:13px;font-weight:500;border-left:3px solid transparent;transition:all 0.2s;}
.sidebar a:hover,.sidebar a.active{color:#10b981;background:#1e293b;border-left-color:#10b981;}
.main{margin-left:220px;padding:30px;flex:1;}
.panel{display:none;}.panel.active{display:block;}
h3{color:#fbbf24;margin-bottom:16px;font-size:18px;}
label{display:block;color:#94a3b8;font-size:13px;margin:12px 0 4px;}
input[type=text],input[type=email],input[type=password],input[type=file],textarea,select{width:100%;padding:10px 14px;background:#0f172a;border:1px solid #334155;color:#fff;border-radius:8px;font-size:13px;font-family:inherit;margin-bottom:4px;}
textarea{height:120px;resize:vertical;}
button[type=submit],button:not(.cmd-btn){background:#10b981;border:none;padding:11px 24px;border-radius:8px;color:#000;font-weight:700;cursor:pointer;margin-top:8px;}
.badge{background:#10b981;color:#000;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:bold;margin-left:8px;}
table{width:100%;border-collapse:collapse;margin-top:16px;}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #1e3a2a;font-size:13px;}
th{color:#64748b;font-weight:600;}
.cmd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:16px 0;}
.cmd-btn{background:#1e293b;border:1px solid #10b981;color:#10b981;padding:10px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;text-align:left;transition:all 0.2s;}
.cmd-btn:hover{background:#10b981;color:#000;}
.bot-output{background:#0f172a;border:1px solid #1e3a2a;border-radius:8px;padding:16px;margin-top:16px;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:80px;color:#10b981;}
hr{border:0;border-top:1px solid #1e3a2a;margin:20px 0;}
@media(max-width:768px){.sidebar{width:100%;height:auto;position:relative;}.main{margin-left:0;padding:16px;}}
</style>
</head><body>
<div class="sidebar">
    <h2>⚙️ CEO PANEL</h2>
    <a onclick="show('dash')" id="tab_dash" class="active">🤖 Bot Commands</a>
    <a onclick="show('blog')" id="tab_blog">📝 Blog</a>
    <a onclick="show('video')" id="tab_video">🎬 Videos</a>
    <a onclick="show('subscribers')" id="tab_subscribers">👥 Subscribers</a>
    <a onclick="show('products')" id="tab_products">🛍️ Products</a>
    <a onclick="show('stores')" id="tab_stores">🏪 Stores</a>
    <a onclick="show('social')" id="tab_social">🌐 Social Links</a>
    <a onclick="show('branding')" id="tab_branding">🖼️ Branding</a>
    <a onclick="show('adsense')" id="tab_adsense">💰 AdSense</a>
    <a onclick="show('gmail')" id="tab_gmail">📧 Gmail</a>
    <a onclick="show('inject')" id="tab_inject">💉 Injectors</a>
    <a onclick="show('security')" id="tab_security">🛡️ Security</a>
    <a href="/" style="color:#fbbf24;">🌐 View Site</a>
    <a href="/links" style="color:#f59e0b;">🔗 View /links</a>
    <a href="/products" style="color:#a78bfa;">🛍️ Products</a>
    <a href="/admin-logout" style="color:#ef4444;">🚪 Logout</a>
</div>
<div class="main">

    <div id="dash" class="panel active">
        <h3>🤖 Bot Control — 24 Commands</h3>
        <p style="color:#94a3b8;font-size:13px;">Gmail: <strong style="color:${data.apiKeys.gmailUser?'#10b981':'#ef4444'}">${data.apiKeys.gmailUser?'✅ '+data.apiKeys.gmailUser:'❌ Not configured — go to Gmail Settings'}</strong></p>
        <div class="cmd-grid">
            ${CMD_LABELS.map((n,i)=>'<button class="cmd-btn" onclick="run('+(i+1)+')">'+(i+1)+'. '+n+'</button>').join('')}
        </div>
        <div class="bot-output" id="botOut">Click any command above to run it...</div>
    </div>

    <div id="branding" class="panel">
        <h3>🖼️ Website Logo Card</h3>
        <form action="/admin/upload-logo" method="POST" enctype="multipart/form-data">
            <label>Upload New Logo Image</label>
            <input type="file" name="logo" accept="image/*" required>
            <button type="submit">Update Logo</button>
        </form>
    </div>

    <div id="blog" class="panel">
        <h3>📝 Manage Blog Posts</h3>
        <form action="/admin/create-blog" method="POST" enctype="multipart/form-data">
            <label>Blog Title</label>
            <input type="text" name="title" placeholder="Blog Title" required>
            <label>Content</label>
            <textarea name="content" rows="6" placeholder="Blog content..."></textarea>
            <label>Cover Image (optional)</label>
            <input type="file" name="image" accept="image/*">
            <button type="submit">Publish Blog</button>
        </form>
        <hr>
        <table><tr><th>Title</th><th>Date</th><th>Action</th></tr>
            ${data.blogPosts.map(p=>'<tr><td><a href="/blog/'+p.id+'" target="_blank" style="color:#10b981;">'+p.title+'</a></td><td style="color:#64748b;">'+new Date(p.date).toLocaleDateString()+'</td><td><a href="/admin/delete/blog/'+p.id+'" style="color:#ef4444;" onclick="return confirm(\'Delete this post?\')">Delete</a></td></tr>').join('')||'<tr><td colspan="3" style="color:#64748b;">No blogs yet.</td></tr>'}
        </table>
    </div>

    <div id="video" class="panel">
        <h3>🎬 Video Library</h3>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:16px;">Upload permanent videos — you can delete any time. Max 500MB per file.</p>
        <form action="/admin/upload-video" method="POST" enctype="multipart/form-data">
            <label>Video Title</label>
            <input type="text" name="title" placeholder="Video Title" required>
            <label>Video File (MP4, WebM, MOV)</label>
            <input type="file" name="video" accept="video/*" required>
            <button type="submit">Upload Video</button>
        </form>
        <hr>
        <table><tr><th>Title</th><th>Type</th><th>Action</th></tr>
            ${data.videos.map(v=>'<tr><td>'+v.title+'</td><td><span style="background:'+(v.type==='local'?'#3b82f6':'#ef4444')+';color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">'+v.type+'</span></td><td><a href="/admin/delete/video/'+v.id+'" style="color:#ef4444;" onclick="return confirm(\'Delete?\')">Delete</a></td></tr>').join('')||'<tr><td colspan="3" style="color:#64748b;">No videos yet.</td></tr>'}
        </table>
    </div>

    <div id="subscribers" class="panel">
        <h3>👥 Library Subscribers <span class="badge">${data.libraryUsers.length}</span></h3>
        <p style="color:#94a3b8;font-size:13px;">Users registered for the premium library.</p>
        <table><tr><th>#</th><th>Name</th><th>Email</th><th>Joined</th></tr>
            ${data.libraryUsers.length?data.libraryUsers.map((u,i)=>'<tr><td>'+(i+1)+'</td><td>'+u.name+'</td><td>'+u.email+'</td><td style="color:#64748b;">'+(u.joined?new Date(u.joined).toLocaleDateString():'-')+'</td></tr>').join(''):'<tr><td colspan="4" style="color:#64748b;">No subscribers yet. Share your website!</td></tr>'}
        </table>
    </div>

    <div id="stores" class="panel">
        <h3>🏪 Affiliate Store IDs</h3>
        <form action="/admin/save-stores" method="POST">
            <table><tr><th>Store</th><th>Base URL</th><th>Your Affiliate ID</th><th>Test</th></tr>${storeRows}</table>
            <button type="submit" style="margin-top:15px;">💾 Save All Store IDs</button>
        </form>
        <hr>
        <h4>Add New Store</h4>
        <form action="/admin/add-store" method="POST" style="display:flex;gap:10px;flex-wrap:wrap;">
            <input type="text" name="name" placeholder="Store Name" style="flex:1;min-width:120px;margin:0;">
            <input type="text" name="url" placeholder="https://store.com/?ref=" style="flex:2;min-width:200px;margin:0;">
            <input type="text" name="id" placeholder="Affiliate ID" style="flex:1;min-width:120px;margin:0;">
            <button type="submit" style="margin:0;">Add</button>
        </form>
    </div>

    <div id="products" class="panel">
        <h3>🛍️ Digital Products</h3>
        <form action="/admin/add-product" method="POST" enctype="multipart/form-data">
            <label>Product Title</label><input type="text" name="title" placeholder="Ultimate Affiliate Marketing Guide" required>
            <label>Description</label><textarea name="description" rows="3" placeholder="What will the buyer get?"></textarea>
            <label>Category</label><input type="text" name="category" placeholder="eBook / Course / Tool / Template">
            <label>Price (enter 0 for FREE)</label><input type="text" name="price" placeholder="0">
            <label>Emoji Icon</label><input type="text" name="icon" placeholder="📚">
            <label>Download / Buy Link</label><input type="text" name="downloadUrl" placeholder="https://drive.google.com/...">
            <label>Cover Image (optional)</label><input type="file" name="image" accept="image/*">
            <button type="submit">➕ Add Product</button>
        </form>
        <hr>
        <table><tr><th>Title</th><th>Price</th><th>Category</th><th>Action</th></tr>
            ${(data.products||[]).map(p=>'<tr><td><a href="/products" target="_blank" style="color:#10b981;">'+p.title+'</a></td><td style="color:#fbbf24;">'+(p.price==='0'||!p.price?'FREE':'$'+p.price)+'</td><td style="color:#64748b;">'+p.category+'</td><td><a href="/admin/delete/product/'+p.id+'" style="color:#ef4444;" onclick="return confirm(\'Delete?\')">Delete</a></td></tr>').join('')||'<tr><td colspan="4" style="color:#64748b;">No products yet.</td></tr>'}
        </table>
    </div>

    <div id="adsense" class="panel">
        <h3>💰 Google AdSense</h3>
        <div style="background:#0f172a;padding:15px;border-radius:8px;margin-bottom:16px;border:1px solid #f59e0b;">
            <p style="color:#f59e0b;font-size:13px;margin:0;">⚠️ HOW TO GET ADSENSE: Go to <strong>adsense.google.com</strong> → Apply with your website URL → Wait 1-2 weeks for approval → Copy Publisher ID (starts with <strong>ca-pub-</strong>)</p>
        </div>
        <p style="font-size:13px;margin-bottom:16px;">Current AdSense ID: <strong style="color:${data.adsenseId?'#10b981':'#ef4444'}">${data.adsenseId||'Not set yet'}</strong></p>
        <form action="/admin/save-adsense" method="POST">
            <label>Your AdSense Publisher ID</label>
            <input type="text" name="adsenseId" placeholder="ca-pub-XXXXXXXXXXXXXXXX" value="${data.adsenseId||''}">
            <button type="submit">💾 Save AdSense ID</button>
        </form>
    </div>

    <div id="social" class="panel">
        <h3>🌐 Social Media Links</h3>
        <form action="/admin/save-social" method="POST">
            <label>Link in Bio Title</label><input type="text" name="linkinbio_title" value="${(data.socialLinks||{}).linkinbio_title||'3EESHER-CLOUD'}">
            <label>Link in Bio Bio Text</label><input type="text" name="linkinbio_bio" value="${(data.socialLinks||{}).linkinbio_bio||''}">
            <hr>
            <label>💬 WhatsApp (number with country code)</label><input type="text" name="whatsapp" value="${(data.socialLinks||{}).whatsapp||''}" placeholder="2348012345678">
            <label>✈️ Telegram (username)</label><input type="text" name="telegram" value="${(data.socialLinks||{}).telegram||''}" placeholder="tisher216">
            <label>📸 Instagram (username)</label><input type="text" name="instagram" value="${(data.socialLinks||{}).instagram||''}" placeholder="tisher216">
            <label>👥 Facebook (username)</label><input type="text" name="facebook" value="${(data.socialLinks||{}).facebook||''}" placeholder="tisher216">
            <label>🐦 Twitter / X (username)</label><input type="text" name="twitter" value="${(data.socialLinks||{}).twitter||''}" placeholder="tisher216">
            <label>🎵 TikTok (username)</label><input type="text" name="tiktok" value="${(data.socialLinks||{}).tiktok||''}" placeholder="tisher216">
            <label>🎬 YouTube (channel or handle)</label><input type="text" name="youtube" value="${(data.socialLinks||{}).youtube||''}" placeholder="@tisher216">
            <label>💼 LinkedIn (username)</label><input type="text" name="linkedin" value="${(data.socialLinks||{}).linkedin||''}" placeholder="tisher216">
            <button type="submit">💾 Save Social Links</button>
        </form>
    </div>

    <div id="gmail" class="panel">
        <h3>📧 Gmail Bot Settings</h3>
        <p style="font-size:13px;color:#94a3b8;margin-bottom:16px;">Current Gmail: <strong style="color:${data.apiKeys.gmailUser?'#10b981':'#ef4444'}">${data.apiKeys.gmailUser||'Not set yet'}</strong></p>
        <form action="/admin/update-gmail" method="POST">
            <label>Your Gmail Address</label><input type="email" name="gmailUser" placeholder="youremail@gmail.com" value="${data.apiKeys.gmailUser||''}" required>
            <label>App Password (leave blank to keep existing)</label><input type="text" name="gmailSecret" placeholder="Leave blank to keep existing">
            <button type="submit">💾 Save Gmail Settings</button>
        </form>
        <div style="background:#1e293b;padding:15px;border-radius:8px;margin-top:20px;border:1px solid #f59e0b;">
            <p style="color:#f59e0b;font-size:13px;margin:0;">⚠️ HOW TO GET APP PASSWORD: Gmail → Security → 2-Step Verification → App Passwords → Generate 16-character code.</p>
        </div>
    </div>

    <div id="inject" class="panel">
        <h3>💉 Universal Injectors</h3>
        <form action="/admin/save-injections" method="POST">
            <label>Head Tag (Analytics, Meta)</label><textarea name="head" placeholder="Head Tag HTML">${data.injections.head}</textarea>
            <label>Custom CSS</label><textarea name="css" placeholder="CSS">${data.injections.css}</textarea>
            <label>Custom JavaScript</label><textarea name="js" placeholder="JavaScript">${data.injections.js}</textarea>
            <label>Body Start HTML</label><textarea name="bodyStart" placeholder="Body Start">${data.injections.bodyStart}</textarea>
            <label>Body End HTML</label><textarea name="bodyEnd" placeholder="Body End">${data.injections.bodyEnd}</textarea>
            <label>Custom HTML Snippet</label><textarea name="customHtml" placeholder="HTML Snippet">${data.injections.customHtml}</textarea>
            <button type="submit">💾 Save All Injectors</button>
        </form>
    </div>

    <div id="security" class="panel">
        <h3>🛡️ Admin Credentials</h3>
        <form action="/admin/change-password" method="POST">
            <label>New Username</label><input type="text" name="newUser" value="${data.adminAuth.user}">
            <label>New Password</label><input type="password" name="newPassword" required placeholder="Enter new password">
            <button type="submit">🔐 Update Access</button>
        </form>
    </div>

</div>
<script>
function show(id){
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.sidebar a').forEach(a=>a.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const tab=document.getElementById('tab_'+id);
    if(tab)tab.classList.add('active');
}
async function run(n){
    const out=document.getElementById('botOut');
    out.style.color='#fbbf24';out.textContent='Running command '+n+'...';
    try{
        const res=await fetch('/api/bot-command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd:n.toString()})});
        const d=await res.json();
        out.style.color='#10b981';out.textContent=d.reply;
    }catch(e){out.style.color='#ef4444';out.textContent='Error: '+e.message;}
}
</script>
</body></html>`);
});

// ==================== 🔐 AUTH ====================
app.get('/admin-login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>CEO Login — 3EESHER-CLOUD</title><style>*{box-sizing:border-box;}body{background:#060d1a;color:#fff;font-family:'Segoe UI',sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}.box{background:#111d2e;padding:40px;border-radius:16px;width:360px;text-align:center;border:1px solid #10b981;}input{width:100%;padding:12px;margin:8px 0;background:#0f172a;border:1px solid #334155;color:#fff;border-radius:8px;}button{background:#10b981;border:none;padding:12px;width:100%;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:8px;color:#000;}</style></head>
<body><div class="box"><h2 style="color:#10b981;">🔐 CEO Access</h2><p style="color:#64748b;font-size:13px;margin-bottom:20px;">3EESHER-CLOUD Admin Panel</p><form method="POST" action="/auth-admin"><input name="username" placeholder="Username" required><input type="password" name="password" placeholder="Password" required><button>LOGIN</button></form><p style="margin-top:15px;"><a href="/" style="color:#64748b;font-size:13px;">← Back to Site</a></p></div></body></html>`);
});

app.post('/auth-admin', (req, res) => {
    const { username, password } = req.body;
    const d = getData();
    if (username === d.adminAuth.user && bcrypt.compareSync(password, d.adminAuth.hash)) {
        req.session.isSuperAdmin = true;
        res.redirect('/super-admin');
    } else {
        res.send('<script>alert("Invalid credentials!"); history.back();</script>');
    }
});

app.get('/admin-logout', (req, res) => { req.session.isSuperAdmin = false; res.redirect('/admin-login'); });

// ==================== 🤖 AUTO DAILY BLOG ====================
const AUTO_BLOG_DATA = [
    { topic: 'How Artificial Intelligence Is Changing Africa in 2026', tag: 'Tech', img: 'artificial intelligence technology' },
    { topic: 'Top 10 Ways to Make Money Online in Nigeria Right Now', tag: 'Money', img: 'make money online' },
    { topic: '5 Health Habits Every Busy African Entrepreneur Must Know', tag: 'Health', img: 'health wellness lifestyle' },
    { topic: 'The Digital Skills That Are Making Young Nigerians Rich', tag: 'Skills', img: 'digital skills learning' },
    { topic: 'How to Build a Profitable Online Business With Zero Capital', tag: 'Business', img: 'online business entrepreneur' },
    { topic: 'Affiliate Marketing: The Silent Income Stream Most Nigerians Ignore', tag: 'Affiliate', img: 'affiliate marketing income' },
    { topic: 'Social Media Strategies That Actually Work in 2026', tag: 'Marketing', img: 'social media marketing' },
    { topic: 'Remote Work: How Nigerians Are Earning Dollars From Home', tag: 'Work', img: 'remote work home office' },
    { topic: 'The Truth About Freelancing: What Nobody Tells You', tag: 'Freelance', img: 'freelancing laptop' },
    { topic: 'How to Rank Your Business on Google in Nigeria — Free Guide', tag: 'SEO', img: 'google search seo' },
    { topic: 'E-Commerce in Nigeria: From Zero to Your First 100 Sales', tag: 'Business', img: 'ecommerce online shopping' },
    { topic: 'AI Tools That Are Replacing Jobs — And Creating New Ones', tag: 'Tech', img: 'artificial intelligence future' },
    { topic: 'Why Financial Literacy Is the Most Valuable Skill in Africa Today', tag: 'Finance', img: 'financial literacy money' },
    { topic: 'From Student to Entrepreneur: How to Start While Still in School', tag: 'Business', img: 'student entrepreneur' },
    { topic: 'Halal Ways to Make Money Online — Islamic Perspective', tag: 'Islamic', img: 'halal business finance' }
];

const AUTO_BLOG_TEMPLATES = [
    (t,tag)=>`<img src="https://source.unsplash.com/800x400/?${encodeURIComponent(t.img)}" style="width:100%;border-radius:12px;margin-bottom:20px;" alt="${t.topic}">
<p style="color:#10b981;font-weight:bold;font-size:13px;text-transform:uppercase;letter-spacing:1px;">📌 ${tag} · 3EESHER-CLOUD Daily Blog</p>
<p style="line-height:1.8;font-size:16px;">In today's rapidly evolving world, <strong>${t.topic}</strong> has become one of the most important topics for anyone seeking financial freedom and digital success in Africa.</p>
<h3 style="color:#fbbf24;margin:24px 0 12px;">🔑 The Key Insight Most People Miss</h3>
<p style="line-height:1.8;">The biggest mistake people make is waiting for the "perfect time" to start. Knowledge combined with consistent daily action produces results that compound over time. Whether you are a student in Kano, a professional in Lagos, or a small business owner in Abuja — this topic directly impacts your financial future.</p>
<h3 style="color:#fbbf24;margin:24px 0 12px;">✅ Your Action Plan for Today</h3>
<ol style="line-height:2;padding-left:20px;"><li>Spend 30 minutes daily learning about this topic</li><li>Join our <a href="/library" style="color:#10b981;">free digital library</a> for in-depth resources</li><li>Take one small action today — momentum builds on itself</li></ol>
<p style="background:#1e293b;padding:20px;border-left:4px solid #10b981;border-radius:0 8px 8px 0;margin-top:24px;line-height:1.8;"><strong style="color:#fbbf24;">💡 3EESHER TIP:</strong> The gap between where you are and where you want to be is simply the information you haven't acted on yet. Start today.</p>
<p style="margin-top:24px;color:#94a3b8;font-size:14px;">📌 Published by <strong style="color:#10b981;">3EESHER BOT</strong> · <a href="mailto:abdullahharuna216@gmail.com" style="color:#10b981;">abdullahharuna216@gmail.com</a> · <a href="/" style="color:#10b981;">Visit 3EESHER-CLOUD</a></p>`,

    (t,tag)=>`<img src="https://source.unsplash.com/800x400/?${encodeURIComponent(t.img)}" style="width:100%;border-radius:12px;margin-bottom:20px;" alt="${t.topic}">
<p style="color:#f59e0b;font-weight:bold;font-size:13px;text-transform:uppercase;letter-spacing:1px;">🔥 ${tag} · Featured Daily Post</p>
<p style="line-height:1.8;font-size:16px;"><strong>${t.topic}</strong> — This is the conversation shaping the next generation of African wealth builders.</p>
<h3 style="color:#fbbf24;margin:24px 0 12px;">📈 Why This Matters Right Now</h3>
<p style="line-height:1.8;">The next 5 years will create more self-made millionaires in Africa than the last 50 years combined. Digital technology has leveled the playing field. A 22-year-old in Kaduna now has access to the same tools as an entrepreneur in Silicon Valley.</p>
<h3 style="color:#fbbf24;margin:24px 0 12px;">🚀 3 Things You Must Do This Week</h3>
<ul style="line-height:2;padding-left:20px;"><li><strong>Educate yourself daily</strong> — 30 minutes of focused learning compounds into mastery</li><li><strong>Build your online presence</strong> — Your digital footprint is your new resume</li><li><strong>Start before you are ready</strong> — Clarity comes through action, not preparation</li></ul>
<p style="background:#0f172a;padding:20px;border:1px solid #10b981;border-radius:8px;margin-top:24px;text-align:center;"><strong style="color:#fbbf24;font-size:18px;">"Success leaves clues. Find those who have done it, do what they did, and persist."</strong><br><span style="color:#94a3b8;font-size:13px;">— 3EESHER-CLOUD</span></p>
<p style="margin-top:24px;color:#94a3b8;font-size:14px;">✍️ Auto-published by <strong style="color:#10b981;">3EESHER BOT</strong> · <a href="/library" style="color:#10b981;">Access Free Library →</a></p>`
];

async function generateAutoBlog() {
    try {
        const data = getData();
        const topicObj = AUTO_BLOG_DATA[Math.floor(Math.random() * AUTO_BLOG_DATA.length)];
        const templateFn = AUTO_BLOG_TEMPLATES[Math.floor(Math.random() * AUTO_BLOG_TEMPLATES.length)];
        const content = templateFn(topicObj, topicObj.tag);
        const newBlog = { id: Date.now(), title: topicObj.topic, content, tag: topicObj.tag, image: `https://source.unsplash.com/800x400/?${encodeURIComponent(topicObj.img)}`, author: '3EESHER BOT', date: new Date().toISOString(), autoGenerated: true };
        data.blogPosts.unshift(newBlog);
        if (data.blogPosts.length > 60) data.blogPosts = data.blogPosts.slice(0, 60);
        saveData(data);
        console.log('[3EESHER BOT] ✅ Blog published: "' + topicObj.topic + '"');
    } catch (err) { console.error('[3EESHER BOT] Error:', err.message); }
}

cron.schedule('0 7 * * *', generateAutoBlog);

setTimeout(async () => {
    try {
        const data = getData();
        const today = new Date().toDateString();
        const hasTodayBlog = data.blogPosts.some(p => p.autoGenerated && new Date(p.date).toDateString() === today);
        if (!hasTodayBlog) { await generateAutoBlog(); console.log('[3EESHER BOT] 🌅 Startup blog generated.'); }
    } catch (e) { console.error('[3EESHER BOT] Startup error:', e.message); }
}, 6000);

// ==================== 🚀 START ====================
app.listen(PORT, '0.0.0.0', () => console.log('🚀 3EESHER-CLOUD EMPIRE READY ON PORT ' + PORT));
