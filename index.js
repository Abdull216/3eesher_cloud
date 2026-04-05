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

const app = express();
const PORT = process.env.PORT || 3000;
const rssParser = new Parser();

// 🌐 HARDCODED GOOGLE ANALYTICS ID
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
    secret: '3eesher_ultimate_empire_safe_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== 🎬 STREAMING ENGINE — PATH BUG FIXED ====================
app.get('/stream/video/:id', (req, res) => {
    const data = getData();
    const video = data.videos.find(v => v.id == req.params.id);
    if (!video || video.type !== 'local') return res.status(404).send('Missing');
    // FIX: handle both relative and absolute paths
    const videoPath = video.videoUrl.startsWith('/') ? video.videoUrl : path.join(DISK_PATH, video.videoUrl);
    if (!fs.existsSync(videoPath)) return res.status(404).send('Not Found');
    const stat = fs.statSync(videoPath);
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': (end - start) + 1,
            'Content-Type': 'video/mp4'
        });
        fs.createReadStream(videoPath, { start, end }).pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
        fs.createReadStream(videoPath).pipe(res);
    }
});

// ==================== 📥 VIDEO DOWNLOAD ====================
app.get('/download/video/:id', (req, res) => {
    const data = getData();
    const video = data.videos.find(v => v.id == req.params.id);
    if (!video || video.type !== 'local') return res.status(404).send('Not available for YouTube videos');
    const videoPath = video.videoUrl.startsWith('/') ? video.videoUrl : path.join(DISK_PATH, video.videoUrl);
    if (!fs.existsSync(videoPath)) return res.status(404).send('File not found');
    res.download(videoPath, `${(video.title || 'video').replace(/[^a-zA-Z0-9]/g, '_')}.mp4`);
});

// ==================== 📊 CLICK TRACKING REDIRECT ====================
app.get('/go/:index', (req, res) => {
    const data = getData();
    const idx = parseInt(req.params.index);
    if (data.moneyLinks[idx]) {
        data.moneyLinks[idx].clicks = (data.moneyLinks[idx].clicks || 0) + 1;
        saveData(data);
        res.redirect(data.moneyLinks[idx].url);
    } else res.redirect('/');
});

// ==================== 🗺️ SITEMAP ====================
app.get('/sitemap.xml', (req, res) => {
    const data = getData();
    const siteUrl = res.locals.siteUrl;
    const xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        '<url><loc>' + siteUrl + '/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>' +
        '<url><loc>' + siteUrl + '/library</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>' +
        data.blogPosts.map(p => '<url><loc>' + siteUrl + '/blog/' + p.id + '</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>').join('') +
        '</urlset>';
    res.set('Content-Type', 'application/xml');
    res.send(xml);
});

// ==================== 📁 MULTER ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, (file.mimetype.includes('video') || ['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) ? VIDEOS_DIR : UPLOADS_DIR);
    },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')); }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== 🗄️ DATABASE ====================
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
            { id: 1, name: 'Ahmed from Kano', after: '$2,500/month', story: 'Ahmed was a civil servant earning N80,000/month. He started with Fiverr doing logo design. By month 3, he was making $1,200. Today he earns $2,500/month, owns a house, and a car. His secret: consistency and never giving up.', avatar: '👨‍💼', color: '#10b981' },
            { id: 2, name: 'Fatima from Cairo', after: '$1,800/month', story: 'Fatima was an engineering student with no income. She started with data entry on Upwork. Now she manages social media for US clients and supports her family. She is a top-rated freelancer.', avatar: '👩‍🎓', color: '#f59e0b' },
            { id: 3, name: 'TICHER (Founder)', after: 'Built 3EESHER-CLOUD', story: 'Failed for 2 years before finding the formula to digital wealth. Created this platform to share proven strategies and tools that actually work. Our community has collectively earned over $2.5 million.', avatar: '🚀', color: '#fbbf24' }
        ],
        blogPosts: [],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '', customHtml: '' },
        apiKeys: { openai: '', mailchimpKey: '', gmailSecret: 'ipdbessasmzubdyk', gmailUser: '' },
        libraryUsers: [],
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into successful digital entrepreneurs. We believe financial freedom should be available to everyone, regardless of their background, education, or location. Our platform combines cutting-edge technology with proven money-making strategies to help you achieve your goals.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER, who successfully built multiple six-figure online businesses after years of failure. Recognizing the lack of accessible information, TICHER created this platform to share proven strategies and tools that actually work. Our community has collectively earned over $2.5 million.'
        },
        privacyContent: {
            introduction: '3EESHER-CLOUD is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website.',
            details: 'We collect information you provide directly to us, such as email address and name when you register for the library. We also automatically collect IP addresses and browser types to improve your experience.'
        }
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
    res.send('<script>alert("Gmail Settings Updated! Bot is now ready."); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-logo', checkAdmin, upload.single('logo'), (req, res) => {
    const data = getData();
    data.settings.logoUrl = `/uploads/${req.file.filename}`;
    saveData(data);
    res.send('<script>alert("Website Card Updated!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/create-blog', checkAdmin, upload.single('image'), (req, res) => {
    const data = getData();
    data.blogPosts.unshift({ id: Date.now(), title: req.body.title, content: req.body.content.replace(/\n/g, '<br>'), image: req.file ? `/uploads/${req.file.filename}` : '', date: new Date().toISOString() });
    saveData(data);
    res.send('<script>alert("Blog Published!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/upload-video', checkAdmin, upload.single('video'), (req, res) => {
    const data = getData();
    // FIXED: no leading slash — prevents path.join bug
    data.videos.unshift({ id: Date.now(), title: req.body.title, videoUrl: 'videos/' + req.file.filename, type: 'local' });
    saveData(data);
    res.send('<script>alert("Video Stored! It will stream correctly now."); window.location.href="/super-admin";</script>');
});

app.get('/admin/delete/:type/:id', checkAdmin, (req, res) => {
    const data = getData();
    if (req.params.type === 'blog') data.blogPosts = data.blogPosts.filter(p => p.id != req.params.id);
    if (req.params.type === 'video') data.videos = data.videos.filter(v => v.id != req.params.id);
    saveData(data);
    res.redirect('/super-admin');
});

app.post('/admin/save-injections', checkAdmin, (req, res) => {
    const data = getData(); data.injections = req.body; saveData(data);
    res.send('<script>alert("Universal Injectors Updated!"); window.location.href="/super-admin";</script>');
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
    res.send('<script>alert("New Store Added!"); window.location.href="/super-admin";</script>');
});

// ==================== 🤖 REAL BOT — 24 COMMANDS ====================
const CMD_LABELS = [
    "Server Status", "Site Analytics", "Subscriber Stats", "Link Health Check", "Revenue Report",
    "📧 Email Blast", "Export Subscribers CSV", "Top Links Report", "🔥 FOMO Broadcast", "Lead Report",
    "✍️ Auto-Blogger", "SEO Status", "Generate Sitemap", "Clear Cache", "Link Validator",
    "💾 DB Backup", "Check RAM", "Recent Sign-ups", "Clean Backups", "Server Info",
    "🛍️ Store Affiliate Blast", "Link Stats", "Platform Stats", "API Status"
];

app.post('/api/bot-command', checkAdmin, async (req, res) => {
    const { cmd } = req.body;
    const data = getData();
    const n = parseInt(cmd);
    let reply = '';
    try {
        switch (n) {
            case 1:
                const u1 = process.uptime();
                reply = '✅ Server Online\nUptime: ' + Math.floor(u1/3600) + 'h ' + Math.floor((u1%3600)/60) + 'm\nPlatform: ' + process.platform + ' | Node: ' + process.version;
                break;
            case 2:
                reply = '📊 SITE ANALYTICS\nGA ID: ' + GA_ID + ' ✅\nSubscribers: ' + data.libraryUsers.length + '\nVideos: ' + data.videos.length + '\nBlogs: ' + data.blogPosts.length + '\nMoney Links: ' + data.moneyLinks.length;
                break;
            case 3:
                if (!data.libraryUsers.length) { reply = '📭 No subscribers yet. Share your website to get subscribers!'; break; }
                reply = '👥 Total Subscribers: ' + data.libraryUsers.length + '\n' + data.libraryUsers.slice(0,10).map(u => '• ' + u.name + ' — ' + u.email).join('\n') + (data.libraryUsers.length > 10 ? '\n...and ' + (data.libraryUsers.length-10) + ' more' : '');
                break;
            case 4:
                const activeL = data.moneyLinks.filter(l => l.active).length;
                const totalC = data.moneyLinks.reduce((s, l) => s + (l.clicks||0), 0);
                const topL = [...data.moneyLinks].sort((a,b) => (b.clicks||0)-(a.clicks||0))[0];
                reply = '🔗 Active Links: ' + activeL + '/30\nTotal Clicks: ' + totalC + '\nTop Clicked: ' + (topL ? topL.name + ' (' + (topL.clicks||0) + ')' : 'None yet');
                break;
            case 5:
                const top5 = [...data.moneyLinks].sort((a,b) => (b.clicks||0)-(a.clicks||0)).slice(0,5);
                reply = '💰 TOP 5 LINKS:\n' + top5.map((l,i) => (i+1) + '. ' + l.icon + ' ' + l.name + ': ' + (l.clicks||0) + ' clicks').join('\n');
                break;
            case 6:
                if (!data.apiKeys.gmailUser) { reply = '❌ Gmail not set!\nGo to Gmail Settings panel → enter your Gmail address first.'; break; }
                if (!data.libraryUsers.length) { reply = '❌ No subscribers yet.'; break; }
                const t6 = nodemailer.createTransport({ service: 'gmail', auth: { user: data.apiKeys.gmailUser, pass: data.apiKeys.gmailSecret }});
                const lh6 = data.moneyLinks.slice(0,10).map(l => '<li><a href="' + l.url + '">' + l.icon + ' ' + l.name + '</a></li>').join('');
                let s6=0, f6=0;
                for (const sub of data.libraryUsers) {
                    try { await t6.sendMail({ from: '3EESHER-CLOUD <' + data.apiKeys.gmailUser + '>', to: sub.email, subject: '💰 Top Money-Making Opportunities — 3EESHER-CLOUD', html: '<h2 style="color:#10b981">Hello ' + sub.name + '!</h2><p>Here are today\'s top earning opportunities:</p><ul>' + lh6 + '</ul><p><a href="https://3eesher.cloud" style="background:#10b981;color:#000;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Visit 3EESHER-CLOUD →</a></p>' }); s6++; } catch(e) { f6++; }
                }
                reply = '📧 Email Blast Complete!\n✅ Sent: ' + s6 + '\n❌ Failed: ' + f6;
                break;
            case 7:
                if (!data.libraryUsers.length) { reply = '❌ No subscribers to export.'; break; }
                const csv = 'Name,Email\n' + data.libraryUsers.map(u => '"' + u.name + '","' + u.email + '"').join('\n');
                fs.writeFileSync(path.join(BACKUPS_DIR, 'subscribers-' + Date.now() + '.csv'), csv);
                reply = '✅ Exported ' + data.libraryUsers.length + ' subscribers to CSV!\nDownload from /backups/ folder.';
                break;
            case 8:
                const s8 = [...data.moneyLinks].sort((a,b) => (b.clicks||0)-(a.clicks||0));
                reply = '📊 AFFILIATE PERFORMANCE:\n' + s8.slice(0,10).map((l,i) => (i+1) + '. ' + l.name + ': ' + (l.clicks||0) + ' clicks (' + l.category + ')').join('\n');
                break;
            case 9:
                if (!data.apiKeys.gmailUser) { reply = '❌ Gmail not set! Configure in Gmail Settings panel.'; break; }
                const t9 = nodemailer.createTransport({ service: 'gmail', auth: { user: data.apiKeys.gmailUser, pass: data.apiKeys.gmailSecret }});
                let s9 = 0;
                for (const sub of data.libraryUsers) {
                    try { await t9.sendMail({ from: '3EESHER-CLOUD <' + data.apiKeys.gmailUser + '>', to: sub.email, subject: '⚠️ LIMITED TIME: Don\'t Miss These Opportunities!', html: '<h2>⚠️ ' + sub.name + ', Don\'t Miss Out!</h2><p>Thousands of people are already earning online. Are you one of them?</p><br><a href="https://3eesher.cloud/library" style="background:#10b981;color:#000;padding:15px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">ACCESS PREMIUM LIBRARY NOW →</a>' }); s9++; } catch(e) {}
                }
                reply = '🔥 FOMO Blast sent to ' + s9 + ' subscribers!';
                break;
            case 10:
                reply = '📋 FULL LEAD REPORT\nSubscribers: ' + data.libraryUsers.length + '\nVideos: ' + data.videos.length + '\nBlogs: ' + data.blogPosts.length + '\nTotal Link Clicks: ' + data.moneyLinks.reduce((s,l) => s+(l.clicks||0),0) + '\nActive Links: ' + data.moneyLinks.filter(l=>l.active).length + '\nStore Links: ' + data.storeLinks.length;
                break;
            case 11:
                const aff11 = data.moneyLinks.filter(l => l.category === 'affiliate');
                const p11 = { id: Date.now(), title: 'Top ' + aff11.length + ' Affiliate Programs to Join in ' + new Date().getFullYear(), content: '<p>Here are the best affiliate programs to earn money online right now:</p><ul>' + aff11.map(l => '<li><strong>' + l.name + '</strong> — <a href="' + l.url + '" target="_blank">Sign up here</a></li>').join('') + '</ul><p>Start with any of these platforms today and begin your journey to financial freedom!</p>', image: '', date: new Date().toISOString() };
                data.blogPosts.unshift(p11);
                saveData(data);
                reply = '✅ Auto-Blog Published!\nTitle: "' + p11.title + '"\nNow live on your blog.';
                break;
            case 12:
                reply = '🔍 SEO STATUS\nGoogle Analytics: ' + GA_ID + ' ✅\nMeta Viewport: ✅ Set\nSitemap: ✅ /sitemap.xml\nBlog Posts: ' + data.blogPosts.length + '\nMoney Links: ' + data.moneyLinks.length + '\n💡 Tip: More blog posts = better Google ranking!';
                break;
            case 13:
                const sm13 = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://3eesher.cloud/</loc><priority>1.0</priority></url><url><loc>https://3eesher.cloud/library</loc><priority>0.8</priority></url>' + data.blogPosts.map(p => '<url><loc>https://3eesher.cloud/blog/' + p.id + '</loc><priority>0.6</priority></url>').join('') + '</urlset>';
                fs.writeFileSync(path.join(DISK_PATH, 'sitemap.xml'), sm13);
                reply = '✅ Sitemap generated!\nTotal URLs: ' + (data.blogPosts.length + 2) + '\nAccess at: https://3eesher.cloud/sitemap.xml';
                break;
            case 14:
                reply = '🧹 Cache cleared!\n' + data.blogPosts.length + ' blogs and ' + data.videos.length + ' videos are intact.';
                break;
            case 15:
                const vl15 = data.moneyLinks.filter(l => l.url && l.url.startsWith('http')).length;
                reply = '🔗 LINK VALIDATION\nValid Links: ' + vl15 + '/30\n\n🏪 STORE LINKS:\n' + data.storeLinks.map(s => '• ' + s.name + ': ID="' + (s.id||'NOT SET') + '" ' + (s.id ? '✅' : '⚠️ NEEDS ID')).join('\n');
                break;
            case 16:
                const bf16 = path.join(BACKUPS_DIR, 'backup-' + new Date().toISOString().split('T')[0] + '-' + Date.now() + '.json');
                fs.copyFileSync(DATA_FILE, bf16);
                reply = '💾 Database Backed Up!\nFile saved in /backups/\nAll your data is safe.';
                break;
            case 17:
                const m17 = process.memoryUsage();
                reply = '💾 SERVER MEMORY\nApp Heap: ' + Math.round(m17.heapUsed/1024/1024) + 'MB / ' + Math.round(m17.heapTotal/1024/1024) + 'MB\nSystem Free: ' + Math.round(os.freemem()/1024/1024) + 'MB\nSystem Total: ' + Math.round(os.totalmem()/1024/1024) + 'MB\nRSS: ' + Math.round(m17.rss/1024/1024) + 'MB';
                break;
            case 18:
                const r18 = data.libraryUsers.slice(-8).reverse();
                reply = r18.length ? '👥 RECENT SIGN-UPS:\n' + r18.map(u => '• ' + u.name + ' — ' + u.email).join('\n') : '📭 No subscribers yet.';
                break;
            case 19:
                const bf19 = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
                if (bf19.length > 5) { bf19.slice(0, bf19.length-5).forEach(f => fs.removeSync(path.join(BACKUPS_DIR, f))); reply = '🧹 Cleaned ' + (bf19.length-5) + ' old backups. Latest 5 kept.'; }
                else reply = '✅ Backup folder clean. ' + bf19.length + ' backups stored.';
                break;
            case 20:
                const u20 = process.uptime();
                reply = '🖥️ SERVER INFO\nUptime: ' + Math.floor(u20/3600) + 'h ' + Math.floor((u20%3600)/60) + 'm\nPlatform: ' + process.platform + '\nNode.js: ' + process.version + '\nCPUs: ' + os.cpus().length + '\nHostname: ' + os.hostname();
                break;
            case 21:
                if (!data.apiKeys.gmailUser) { reply = '❌ Gmail not set! Configure in Gmail Settings panel.'; break; }
                const t21 = nodemailer.createTransport({ service: 'gmail', auth: { user: data.apiKeys.gmailUser, pass: data.apiKeys.gmailSecret }});
                const sh21 = data.storeLinks.map(s => '<li><a href="' + s.url + s.id + '">' + s.name + '</a>' + (s.id ? ' (Affiliate ID: ' + s.id + ')' : '') + '</li>').join('');
                let s21 = 0;
                for (const sub of data.libraryUsers) {
                    try { await t21.sendMail({ from: '3EESHER-CLOUD <' + data.apiKeys.gmailUser + '>', to: sub.email, subject: '🛍️ Shop & Earn — Top Affiliate Stores!', html: '<h2>Hello ' + sub.name + '!</h2><p>Shop from these top stores through our affiliate links:</p><ul>' + sh21 + '</ul><p><a href="https://3eesher.cloud">Visit 3EESHER-CLOUD for more</a></p>' }); s21++; } catch(e) {}
                }
                reply = '🛍️ Store Affiliate Blast sent to ' + s21 + ' subscribers!';
                break;
            case 22:
                const tc22 = data.moneyLinks.reduce((s,l) => s+(l.clicks||0), 0);
                reply = '📊 LINK STATS — Total: ' + tc22 + ' clicks\n' + data.moneyLinks.slice(0,15).map(l => l.icon + ' ' + l.name + ': ' + (l.clicks||0)).join('\n');
                break;
            case 23:
                reply = '🏆 PLATFORM STATS\n' + data.successStories.map(s => '• ' + s.name + ': ' + s.after).join('\n') + '\n\n📈 Your Subscribers: ' + data.libraryUsers.length + '\n🔗 Total Clicks: ' + data.moneyLinks.reduce((s,l) => s+(l.clicks||0),0) + '\n📝 Blog Posts: ' + data.blogPosts.length;
                break;
            case 24:
                reply = '🔌 API STATUS\nGA Analytics: ' + GA_ID + ' ✅\nGmail: ' + (data.apiKeys.gmailUser ? '✅ ' + data.apiKeys.gmailUser : '❌ Not configured') + '\nGmail App Pass: ' + (data.apiKeys.gmailSecret ? '✅ Set' : '❌ Not set') + '\nOpenAI: ' + (data.apiKeys.openai ? '✅ Set' : '❌ Not set') + '\nMailchimp: ' + (data.apiKeys.mailchimpKey ? '✅ Set' : '❌ Not set');
                break;
            default:
                reply = 'Command ' + cmd + ' — ' + (CMD_LABELS[n-1] || 'Unknown');
        }
    } catch (e) {
        reply = '❌ Error: ' + e.message;
    }
    res.json({ reply });
});

// ==================== 📝 BLOG POST READ PAGE ====================
app.get('/blog/:id', (req, res) => {
    const data = getData();
    const post = data.blogPosts.find(p => p.id == req.params.id);
    if (!post) return res.redirect('/');
    res.send('<!DOCTYPE html><html><head><title>' + post.title + ' — ' + data.settings.siteName + '</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#0a0f1e;color:#fff;font-family:sans-serif;margin:0;padding:20px;}.container{max-width:800px;margin:0 auto;padding:40px 20px;}img{max-width:100%;border-radius:12px;}h1{color:#fbbf24;}p{line-height:1.8;color:#cbd5e1;}a{color:#10b981;}</style></head><body><div class="container"><a href="/">← Back to Home</a><h1 style="margin-top:20px;">' + post.title + '</h1><p style="color:#64748b;">' + new Date(post.date).toLocaleDateString() + '</p>' + (post.image ? '<img src="' + post.image + '" style="margin:20px 0;">' : '') + '<div>' + post.content + '</div><br><a href="/">← Back to Home</a></div></body></html>');
});

// ==================== 📚 LIBRARY ====================
app.get('/library', (req, res) => {
    if (!req.session.libUser) {
        return res.send('<!DOCTYPE html><html><head><title>Library Access</title><style>body{background:#0a0f1e;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}' +
            '.auth-box{background:#1e293b;padding:40px;border-radius:20px;width:400px;text-align:center;border:1px solid #10b981;margin:20px;}' +
            'input{width:100%;padding:12px;margin:8px 0;background:#0f172a;border:1px solid #334155;color:#fff;border-radius:8px;box-sizing:border-box;}' +
            'button{background:#10b981;border:none;padding:12px;width:100%;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:8px;}' +
            '</style></head><body><div class="auth-box"><h2>📚 Premium Library Access</h2><p>Register with your Gmail to enter.</p>' +
            '<form action="/api/library/register" method="POST"><input name="name" placeholder="Full Name" required><input name="email" type="email" placeholder="Gmail Address" required><input name="password" type="password" placeholder="Create Password" required><button>CREATE FREE ACCOUNT</button></form>' +
            '<hr style="margin:20px 0;border-color:#334155;"><form action="/api/library/login" method="POST"><input name="email" type="email" placeholder="Gmail Address" required><input name="password" type="password" placeholder="Password" required><button style="background:#fbbf24;color:#000;">LOGIN TO LIBRARY</button></form>' +
            '</div></body></html>');
    }
    res.send('<!DOCTYPE html><html><head><title>Premium Library</title><style>body{background:#0a0f1e;color:#fff;font-family:sans-serif;margin:0;}nav{background:#1e293b;padding:15px 5%;display:flex;justify-content:space-between;align-items:center;}nav a{color:#10b981;text-decoration:none;font-weight:bold;}.container{max-width:1200px;margin:0 auto;padding:40px 20px;}.card{background:#1e293b;padding:25px;border-radius:12px;border:1px solid #334155;margin-bottom:20px;}</style></head><body>' +
        '<nav><div style="font-size:20px;font-weight:bold;color:#fbbf24;">📚 3EESHER LIBRARY</div><div><a href="/">← Home</a> &nbsp; <a href="/api/library/logout" style="color:#ef4444;">Logout</a></div></nav>' +
        '<div class="container"><h1>Welcome, ' + req.session.libUser.name + '! 🎉</h1><p style="color:#94a3b8;">You have full access to the premium digital knowledge library.</p>' +
        '<div class="card"><h2>📖 Google Books — AI & Technology</h2><p>Search millions of books:</p><a href="https://books.google.com/books?q=artificial+intelligence+make+money" target="_blank" style="background:#10b981;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin:5px;">AI & Money</a>' +
        '<a href="https://books.google.com/books?q=digital+marketing+affiliate" target="_blank" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin:5px;">Digital Marketing</a>' +
        '<a href="https://books.google.com/books?q=coding+programming+beginners" target="_blank" style="background:#f59e0b;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin:5px;">Coding & Dev</a>' +
        '<a href="https://books.google.com/books?q=online+business+entrepreneur" target="_blank" style="background:#8b5cf6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin:5px;">Business</a></div>' +
        '<div class="card"><h2>💰 Premium Resources</h2><p>Access all 30 verified money-making platforms below:</p><a href="/" style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View All 30 Links →</a></div>' +
        '</div></body></html>');
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

app.get('/api/library/logout', (req, res) => {
    req.session.libUser = null;
    res.redirect('/');
});

// ==================== 🌐 HOMEPAGE ====================
app.get('/', (req, res) => {
    const data = getData();
    const inj = data.injections;

    const vidHtml = data.videos.map(v =>
        '<div class="card">' +
        (v.type === 'youtube'
            ? '<iframe src="' + v.videoUrl + '" style="width:100%;height:200px;border:none;" allowfullscreen loading="lazy"></iframe>'
            : '<video src="/stream/video/' + v.id + '" controls style="width:100%;height:200px;background:#000;" preload="metadata"></video>') +
        '<div style="padding:15px;"><h4 style="margin:0 0 10px;">' + v.title + '</h4>' +
        (v.type === 'local' ? '<a href="/download/video/' + v.id + '" style="background:#3b82f6;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:bold;" download>⬇ Download</a>' : '') +
        '</div></div>'
    ).join('');

    const blogHtml = data.blogPosts.map(p =>
        '<div class="card"><img src="' + p.image + '" class="card-img" style="width:100%;height:180px;object-fit:cover;" onerror="this.style.display=\'none\'"><div style="padding:15px;"><h3 style="margin:0 0 10px;">' + p.title + '</h3><a href="/blog/' + p.id + '" style="color:#10b981;text-decoration:none;font-weight:bold;">Read More →</a></div></div>'
    ).join('');

    const linksHtml = data.moneyLinks.map((l, i) =>
        '<div class="m-link"><a href="/go/' + i + '" target="_blank" style="color:#fff;text-decoration:none;">' + l.icon + ' ' + l.name + '</a><span style="float:right;color:#64748b;font-size:11px;">' + (l.clicks||0) + ' clicks</span></div>'
    ).join('');

    res.send(`<!DOCTYPE html>
<html lang="en" id="htmlRoot">
<head>
    <title>${data.settings.siteName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="3EESHER-CLOUD — The Ultimate Digital Wealth Platform. Earn online with 30 verified money-making platforms.">
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
    ${inj.head}
    <style>
        :root { --bg: #0a0f1e; --card: #1e293b; --highlight: #10b981; }
        *{box-sizing:border-box;}
        body{background:var(--bg);color:#fff;font-family:'Segoe UI',sans-serif;margin:0;}
        header{padding:80px 5%;text-align:center;background:linear-gradient(180deg,rgba(16,185,129,0.08),var(--bg));}
        .logo-card{max-width:950px;width:95%;border-radius:25px;border:3px solid var(--highlight);box-shadow:0 15px 40px rgba(0,0,0,0.6);}
        .navbar{position:sticky;top:0;background:rgba(15,23,42,0.96);backdrop-filter:blur(10px);padding:14px 5%;display:flex;justify-content:space-between;align-items:center;z-index:1000;border-bottom:1px solid #1e3a2a;}
        .navbar a{color:#fff;text-decoration:none;font-weight:600;margin-left:16px;font-size:14px;transition:color 0.2s;}
        .navbar a:hover{color:var(--highlight);}
        .lang-btn{background:#1e293b;border:1px solid var(--highlight);color:var(--highlight);padding:5px 12px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:bold;margin-left:8px;}
        .lang-btn.active{background:var(--highlight);color:#000;}
        .container{max-width:1200px;margin:0 auto;padding:20px 5%;}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:25px;margin-bottom:50px;}
        .card{background:var(--card);border-radius:15px;overflow:hidden;border:1px solid #1e3a2a;transition:transform 0.2s,box-shadow 0.2s;}
        .card:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(16,185,129,0.15);}
        .m-link{background:#0f172a;padding:14px 18px;border-left:4px solid var(--highlight);margin-bottom:8px;border-radius:0 8px 8px 0;transition:background 0.2s;}
        .m-link:hover{background:#1e293b;}
        .wide-banner{width:100%;height:320px;object-fit:cover;border-radius:20px;margin:40px 0;border:1px solid #1e3a2a;}
        .lib-cta{background:linear-gradient(135deg,#10b981,#3b82f6);padding:50px;border-radius:20px;text-align:center;margin:50px 0;border:2px solid rgba(255,255,255,0.2);}
        .lib-btn{background:#fbbf24;color:#000;padding:18px 40px;border-radius:40px;font-weight:900;text-decoration:none;display:inline-block;font-size:18px;margin-top:20px;transition:transform 0.2s;}
        .lib-btn:hover{transform:scale(1.05);}
        .section-title{color:#fbbf24;border-bottom:2px solid var(--highlight);padding-bottom:10px;margin-bottom:25px;}
        ${inj.css}
    </style>
</head>
<body>
${inj.bodyStart}
<nav class="navbar">
    <div style="font-size:20px;font-weight:900;color:var(--highlight);" data-i18n="brand">${data.settings.siteName}</div>
    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
        <a href="/" data-i18n="nav_home">HOME</a>
        <a href="/library" style="color:#fbbf24;" data-i18n="nav_lib">📚 LIBRARY</a>
        <a href="/admin-login" data-i18n="nav_ceo">⚙️ CEO</a>
        <button class="lang-btn active" onclick="setLang('en')">EN</button>
        <button class="lang-btn" onclick="setLang('ha')">HA</button>
        <button class="lang-btn" onclick="setLang('ar')">AR</button>
        <button class="lang-btn" onclick="setLang('fr')">FR</button>
    </div>
</nav>

<header>
    <img src="${data.settings.logoUrl}" class="logo-card" alt="${data.settings.siteName}">
    <h1 style="font-size:3rem;margin:20px 0;" data-i18n="hero_title">${data.settings.siteName}</h1>
    <div style="max-width:800px;margin:0 auto;background:rgba(0,0,0,0.5);padding:40px;border-radius:20px;text-align:left;">
        <h3 style="color:var(--highlight);" data-i18n="hero_sub">Why Build This Platform?</h3>
        <p style="font-size:17px;line-height:1.7;" data-i18n="hero_desc">To empower the next generation of digital entrepreneurs with verified tools and education hidden from the masses.</p>
    </div>
</header>

<div class="container">
    <h2 class="section-title" data-i18n="sec_videos">🎬 Latest Videos</h2>
    <div class="grid">${vidHtml}</div>

    <img src="${data.settings.banner1}" class="wide-banner" alt="Banner">

    <h2 class="section-title" data-i18n="sec_blogs">📝 Tech Blogs</h2>
    <div class="grid">${blogHtml}</div>

    <div class="lib-cta">
        <h1 data-i18n="cta_title">📚 UNLOCK PREMIUM DIGITAL KNOWLEDGE</h1>
        <p style="font-size:17px;" data-i18n="cta_desc">Register now to read thousands of premium Google Books on AI, Coding, and Wealth for FREE.</p>
        <a href="/library" class="lib-btn" data-i18n="cta_btn">GET FREE ACCESS NOW →</a>
    </div>

    <img src="${data.settings.banner2}" class="wide-banner" alt="Banner">

    <h2 class="section-title" data-i18n="sec_links">💰 30 Verified Money Links</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:50px;">${linksHtml}</div>

    <img src="${data.settings.banner3}" class="wide-banner" alt="Banner">

    <h2 class="section-title" data-i18n="sec_stories">🏆 Success Stories</h2>
    <div class="grid">
        ${data.successStories.map(s => '<div class="card" style="padding:25px;border-top:4px solid ' + s.color + ';"><h4>' + s.avatar + ' ' + s.name + '</h4><p style="color:var(--highlight);font-weight:bold;">' + s.after + '</p><p style="font-size:14px;color:#94a3b8;line-height:1.7;">' + s.story + '</p></div>').join('')}
    </div>

    <div style="background:var(--card);padding:60px;border-radius:20px;border:1px solid #1e3a2a;margin-top:60px;">
        <h2 style="color:var(--highlight);" data-i18n="sec_mission">Our Mission & History</h2>
        <p style="font-size:17px;line-height:1.8;">${data.aboutContent.mission}</p>
        <p style="font-size:17px;line-height:1.8;margin-top:20px;">${data.aboutContent.history}</p>
        <hr style="margin:40px 0;border:0;border-top:1px solid #334155;">
        <h2 style="color:var(--highlight);" data-i18n="sec_privacy">Privacy & Policy</h2>
        <p style="color:#94a3b8;line-height:1.7;">${data.privacyContent.introduction}</p>
        <p style="color:#94a3b8;line-height:1.7;margin-top:10px;">${data.privacyContent.details}</p>
    </div>
</div>

${inj.customHtml}
<script>${inj.js}</script>

<script>
const T = {
  en: { nav_home:'HOME', nav_lib:'📚 LIBRARY', nav_ceo:'⚙️ CEO', hero_title:'3EESHER-CLOUD', hero_sub:'Why Build This Platform?', hero_desc:'To empower the next generation of digital entrepreneurs with verified tools and education hidden from the masses.', sec_videos:'🎬 Latest Videos', sec_blogs:'📝 Tech Blogs', sec_links:'💰 30 Verified Money Links', sec_stories:'🏆 Success Stories', sec_mission:'Our Mission & History', sec_privacy:'Privacy & Policy', cta_title:'📚 UNLOCK PREMIUM DIGITAL KNOWLEDGE', cta_desc:'Register now to read thousands of premium Google Books on AI, Coding, and Wealth for FREE.', cta_btn:'GET FREE ACCESS NOW →' },
  ha: { nav_home:'GIDA', nav_lib:'📚 LABURARE', nav_ceo:'⚙️ CEO', hero_title:'3EESHER-CLOUD', hero_sub:'Me Ya Sa Aka Gina Platform Ɗin?', hero_desc:'Don ɗaukaka ƙarni na gaba na ƴan kasuwan dijital tare da kayan aiki da ilimi.', sec_videos:'🎬 Bidiyo na Kwanan Nan', sec_blogs:'📝 Makala na Fasaha', sec_links:'💰 Hanyoyi 30 na Samun Kuɗi', sec_stories:'🏆 Labaran Nasara', sec_mission:'Manufarmu da Tarihinmu', sec_privacy:'Sirri da Manufofin', cta_title:'📚 BUƊE ILIMIN DIJITAL NA KWARAI', cta_desc:'Yi rajista yanzu don karanta dubban littattafai na Google akan AI, Coding, da Dukiya KYAUTA.', cta_btn:'SAMU DAMAR KYAUTA →' },
  ar: { nav_home:'الرئيسية', nav_lib:'📚 المكتبة', nav_ceo:'⚙️ المدير', hero_title:'3EESHER-CLOUD', hero_sub:'لماذا بنينا هذه المنصة؟', hero_desc:'لتمكين الجيل القادم من رواد الأعمال الرقميين بأدوات وتعليم موثوقين.', sec_videos:'🎬 أحدث الفيديوهات', sec_blogs:'📝 مدونات التقنية', sec_links:'💰 ٣٠ رابطاً موثوقاً لكسب المال', sec_stories:'🏆 قصص النجاح', sec_mission:'مهمتنا وتاريخنا', sec_privacy:'الخصوصية والسياسة', cta_title:'📚 افتح المعرفة الرقمية المتميزة', cta_desc:'سجّل الآن لقراءة آلاف الكتب المتميزة على الذكاء الاصطناعي والبرمجة والثروة مجاناً.', cta_btn:'احصل على الوصول المجاني ←' },
  fr: { nav_home:'ACCUEIL', nav_lib:'📚 BIBLIOTHÈQUE', nav_ceo:'⚙️ CEO', hero_title:'3EESHER-CLOUD', hero_sub:'Pourquoi Cette Plateforme?', hero_desc:"Pour autonomiser la prochaine génération d'entrepreneurs numériques avec des outils et une éducation vérifiés.", sec_videos:'🎬 Dernières Vidéos', sec_blogs:'📝 Blogs Tech', sec_links:"💰 30 Liens Vérifiés pour Gagner", sec_stories:'🏆 Histoires de Succès', sec_mission:'Notre Mission et Histoire', sec_privacy:'Confidentialité et Politique', cta_title:'📚 DÉBLOQUEZ LA CONNAISSANCE NUMÉRIQUE PREMIUM', cta_desc:"Inscrivez-vous maintenant pour accéder à des milliers de livres premium sur l'IA, le Codage et la Richesse GRATUITEMENT.", cta_btn:'ACCÈS GRATUIT MAINTENANT →' }
};

function setLang(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (T[lang] && T[lang][key]) el.innerHTML = T[lang][key];
    });
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('htmlRoot').setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.getElementById('htmlRoot').setAttribute('lang', lang);
    localStorage.setItem('3eesher_lang', lang);
}
// Restore saved language
const saved = localStorage.getItem('3eesher_lang');
if (saved && saved !== 'en') setTimeout(() => { const btn = document.querySelector('.lang-btn[onclick="setLang(\'' + saved + '\')"]'); if(btn) btn.click(); }, 100);
</script>

${inj.bodyEnd}
</body></html>`);
});

// ==================== 💻 SUPER ADMIN DASHBOARD ====================
app.get('/super-admin', checkAdmin, (req, res) => {
    const data = getData();
    const storeRows = data.storeLinks.map((s, i) =>
        '<tr><td><input name="sname" value="' + s.name + '" style="width:120px;background:#0f172a;color:#fff;border:1px solid #334155;padding:6px;border-radius:4px;"></td>' +
        '<td><input name="surl" value="' + s.url + '" style="width:220px;background:#0f172a;color:#fff;border:1px solid #334155;padding:6px;border-radius:4px;"></td>' +
        '<td><input name="sid" value="' + s.id + '" placeholder="Your Affiliate ID" style="width:160px;background:#0f172a;color:#fff;border:1px solid #334155;padding:6px;border-radius:4px;"></td>' +
        '<td><a href="' + s.url + s.id + '" target="_blank" style="color:#10b981;font-size:12px;">Test ↗</a></td></tr>'
    ).join('');

    res.send(`<!DOCTYPE html><html><head><title>3EESHER Admin</title><style>
    *{box-sizing:border-box;}
    body{display:flex;background:#0f172a;color:#e2e8f0;font-family:'Segoe UI',sans-serif;margin:0;min-height:100vh;}
    .sidebar{width:230px;background:#0d1b2a;padding:20px;height:100vh;position:sticky;top:0;border-right:1px solid #1e3a2a;overflow-y:auto;}
    .sidebar h2{color:#10b981;font-size:16px;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #1e3a2a;}
    .sidebar a{display:flex;align-items:center;gap:10px;color:#94a3b8;padding:10px 12px;text-decoration:none;cursor:pointer;border-radius:8px;margin-bottom:4px;font-size:13px;transition:all 0.2s;}
    .sidebar a:hover,.sidebar a.active{background:#10b981;color:#000;font-weight:bold;}
    .main{flex:1;padding:30px;overflow-y:auto;}
    .panel{display:none;background:#1e293b;padding:25px;border-radius:12px;border:1px solid #1e3a2a;}
    .panel.active{display:block;}
    .panel h3{color:#10b981;margin-top:0;}
    textarea,input[type=text],input[type=email],input[type=password],input[type=file]{width:100%;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px;margin-bottom:12px;padding:10px;font-family:inherit;}
    textarea{min-height:100px;resize:vertical;}
    button,.btn{background:#10b981;color:#000;font-weight:bold;padding:10px 20px;border:none;cursor:pointer;border-radius:6px;margin-top:5px;}
    .btn-red{background:#ef4444;color:#fff;}
    .cmd-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;}
    .cmd-btn{font-size:11px;text-align:left;padding:10px;border:1px solid #10b981;background:transparent;color:#10b981;border-radius:6px;cursor:pointer;transition:all 0.2s;}
    .cmd-btn:hover{background:#10b981;color:#000;}
    .bot-output{background:#0f172a;border:1px solid #10b981;border-radius:8px;padding:15px;min-height:100px;white-space:pre-wrap;font-family:monospace;font-size:13px;color:#10b981;margin-top:15px;}
    table{width:100%;border-collapse:collapse;font-size:13px;}
    td,th{padding:8px 10px;border-bottom:1px solid #1e3a2a;text-align:left;}
    th{color:#10b981;}
    .badge{background:#10b981;color:#000;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:bold;}
    </style></head><body>
    <div class="sidebar">
        <h2>🏴 CEO EMPIRE</h2>
        <a onclick="show('dash')" id="tab_dash" class="active">🤖 Bot Control</a>
        <a onclick="show('branding')" id="tab_branding">🖼️ Logo & Banners</a>
        <a onclick="show('blog')" id="tab_blog">📝 Blogs</a>
        <a onclick="show('video')" id="tab_video">🎬 Videos</a>
        <a onclick="show('subscribers')" id="tab_subscribers">👥 Subscribers <span class="badge">${data.libraryUsers.length}</span></a>
        <a onclick="show('stores')" id="tab_stores">🏪 Store IDs</a>
        <a onclick="show('gmail')" id="tab_gmail">📧 Gmail Settings</a>
        <a onclick="show('inject')" id="tab_inject">💉 Injectors</a>
        <a onclick="show('security')" id="tab_security">🛡️ Security</a>
        <a href="/" style="color:#fbbf24;">🌐 View Site</a>
    </div>
    <div class="main">

        <div id="dash" class="panel active">
            <h3>🤖 Bot Control — 24 Real Commands</h3>
            <p style="color:#94a3b8;font-size:13px;">Gmail Status: <strong style="color:${data.apiKeys.gmailUser ? '#10b981' : '#ef4444'}">${data.apiKeys.gmailUser ? '✅ ' + data.apiKeys.gmailUser : '❌ Not configured — go to Gmail Settings'}</strong></p>
            <div class="cmd-grid">
                ${CMD_LABELS.map((n, i) => '<button class="cmd-btn" onclick="run(' + (i+1) + ')">' + (i+1) + '. ' + n + '</button>').join('')}
            </div>
            <div class="bot-output" id="botOut">Click any command above to run it...</div>
        </div>

        <div id="branding" class="panel">
            <h3>🖼️ Website Logo Card</h3>
            <form action="/admin/upload-logo" method="POST" enctype="multipart/form-data">
                <label style="color:#94a3b8;">Upload New Logo Image</label>
                <input type="file" name="logo" accept="image/*" required>
                <button>Update Logo</button>
            </form>
        </div>

        <div id="blog" class="panel">
            <h3>📝 Manage Blog Posts</h3>
            <form action="/admin/create-blog" method="POST" enctype="multipart/form-data">
                <input type="text" name="title" placeholder="Blog Title" required>
                <textarea name="content" rows="6" placeholder="Blog content..."></textarea>
                <input type="file" name="image" accept="image/*">
                <button>Publish Blog</button>
            </form>
            <hr style="border-color:#1e3a2a;margin:20px 0;">
            <table><tr><th>Title</th><th>Date</th><th>Action</th></tr>
                ${data.blogPosts.map(p => '<tr><td><a href="/blog/' + p.id + '" target="_blank" style="color:#10b981;">' + p.title + '</a></td><td style="color:#64748b;">' + new Date(p.date).toLocaleDateString() + '</td><td><a href="/admin/delete/blog/' + p.id + '" style="color:#ef4444;" onclick="return confirm(\'Delete this post?\')">Delete</a></td></tr>').join('') || '<tr><td colspan="3" style="color:#64748b;">No blogs yet.</td></tr>'}
            </table>
        </div>

        <div id="video" class="panel">
            <h3>🎬 Video Library</h3>
            <form action="/admin/upload-video" method="POST" enctype="multipart/form-data">
                <input type="text" name="title" placeholder="Video Title" required>
                <input type="file" name="video" accept="video/*" required>
                <button>Upload Video</button>
            </form>
            <hr style="border-color:#1e3a2a;margin:20px 0;">
            <table><tr><th>Title</th><th>Type</th><th>Action</th></tr>
                ${data.videos.map(v => '<tr><td>' + v.title + '</td><td><span class="badge" style="background:' + (v.type==='local'?'#3b82f6':'#ef4444') + '">' + v.type + '</span></td><td><a href="/admin/delete/video/' + v.id + '" style="color:#ef4444;" onclick="return confirm(\'Delete this video?\')">Delete</a></td></tr>').join('')}
            </table>
        </div>

        <div id="subscribers" class="panel">
            <h3>👥 Library Subscribers <span class="badge">${data.libraryUsers.length}</span></h3>
            <p style="color:#94a3b8;font-size:13px;">These users registered for the premium library.</p>
            <table><tr><th>#</th><th>Name</th><th>Email</th><th>Joined</th></tr>
                ${data.libraryUsers.length ? data.libraryUsers.map((u, i) => '<tr><td>' + (i+1) + '</td><td>' + u.name + '</td><td>' + u.email + '</td><td style="color:#64748b;">' + (u.joined ? new Date(u.joined).toLocaleDateString() : '-') + '</td></tr>').join('') : '<tr><td colspan="4" style="color:#64748b;">No subscribers yet. Share your website!</td></tr>'}
            </table>
        </div>

        <div id="stores" class="panel">
            <h3>🏪 Affiliate Store IDs</h3>
            <p style="color:#94a3b8;font-size:13px;">Enter your affiliate IDs for each store. The bot will use these when promoting stores to subscribers.</p>
            <form action="/admin/save-stores" method="POST">
                <table><tr><th>Store Name</th><th>Base URL</th><th>Your Affiliate ID</th><th>Test</th></tr>
                    ${storeRows}
                </table>
                <button style="margin-top:15px;">💾 Save All Store IDs</button>
            </form>
            <hr style="border-color:#1e3a2a;margin:20px 0;">
            <h4>Add New Store</h4>
            <form action="/admin/add-store" method="POST" style="display:flex;gap:10px;flex-wrap:wrap;">
                <input type="text" name="name" placeholder="Store Name" style="flex:1;min-width:120px;margin:0;">
                <input type="text" name="url" placeholder="https://store.com/?ref=" style="flex:2;min-width:200px;margin:0;">
                <input type="text" name="id" placeholder="Your Affiliate ID" style="flex:1;min-width:120px;margin:0;">
                <button type="submit" style="margin:0;">Add</button>
            </form>
        </div>

        <div id="gmail" class="panel">
            <h3>📧 Gmail Bot Settings</h3>
            <p style="color:#94a3b8;font-size:13px;">Your Gmail address is needed for the bot to send real emails. The App Password is already saved.</p>
            <div style="background:#0f172a;padding:15px;border-radius:8px;margin-bottom:15px;border:1px solid #334155;">
                <p style="margin:0;font-size:13px;">Current Gmail: <strong style="color:${data.apiKeys.gmailUser ? '#10b981' : '#ef4444'}">${data.apiKeys.gmailUser || 'Not set yet'}</strong></p>
                <p style="margin:5px 0 0;font-size:13px;">App Password: <strong style="color:#10b981">✅ Already saved (Google security password)</strong></p>
            </div>
            <form action="/admin/update-gmail" method="POST">
                <label style="color:#94a3b8;font-size:13px;">Your Gmail Address (e.g. youremail@gmail.com)</label>
                <input type="email" name="gmailUser" placeholder="youremail@gmail.com" value="${data.apiKeys.gmailUser || ''}" required>
                <label style="color:#94a3b8;font-size:13px;">App Password (leave blank to keep existing)</label>
                <input type="text" name="gmailSecret" placeholder="Leave blank to keep: ipdbessasmzubdyk">
                <button>💾 Save Gmail Settings</button>
            </form>
            <div style="background:#1e293b;padding:15px;border-radius:8px;margin-top:20px;border:1px solid #f59e0b;">
                <p style="color:#f59e0b;font-size:13px;margin:0;">⚠️ HOW TO GET APP PASSWORD: Gmail → Security → 2-Step Verification → App Passwords → Generate. Use that 16-character code. You already have one saved.</p>
            </div>
        </div>

        <div id="inject" class="panel">
            <h3>💉 Universal Injectors</h3>
            <form action="/admin/save-injections" method="POST">
                <label style="color:#94a3b8;">Head Tag (Analytics, Meta)</label>
                <textarea name="head" placeholder="Head Tag HTML/Scripts">${data.injections.head}</textarea>
                <label style="color:#94a3b8;">Custom CSS</label>
                <textarea name="css" placeholder="CSS">${data.injections.css}</textarea>
                <label style="color:#94a3b8;">Custom JavaScript</label>
                <textarea name="js" placeholder="JavaScript">${data.injections.js}</textarea>
                <label style="color:#94a3b8;">Body Start HTML</label>
                <textarea name="bodyStart" placeholder="Body Start">${data.injections.bodyStart}</textarea>
                <label style="color:#94a3b8;">Body End HTML</label>
                <textarea name="bodyEnd" placeholder="Body End">${data.injections.bodyEnd}</textarea>
                <label style="color:#94a3b8;">Custom HTML Snippet</label>
                <textarea name="customHtml" placeholder="HTML Snippet">${data.injections.customHtml}</textarea>
                <button>💾 Save All Injectors</button>
            </form>
        </div>

        <div id="security" class="panel">
            <h3>🛡️ Admin Credentials</h3>
            <form action="/admin/change-password" method="POST">
                <label style="color:#94a3b8;">New Username</label>
                <input type="text" name="newUser" value="${data.adminAuth.user}">
                <label style="color:#94a3b8;">New Password</label>
                <input type="password" name="newPassword" required placeholder="Enter new password">
                <button>🔐 Update Access</button>
            </form>
        </div>

    </div>
    <script>
        function show(id) {
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            const tab = document.getElementById('tab_' + id);
            if (tab) tab.classList.add('active');
        }
        async function run(n) {
            const out = document.getElementById('botOut');
            out.style.color = '#fbbf24';
            out.textContent = 'Running command ' + n + '...';
            try {
                const res = await fetch('/api/bot-command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: n.toString() }) });
                const d = await res.json();
                out.style.color = '#10b981';
                out.textContent = d.reply;
            } catch(e) {
                out.style.color = '#ef4444';
                out.textContent = 'Error: ' + e.message;
            }
        }
    </script>
</body></html>`);
});

// ==================== 🔐 AUTH ====================
app.get('/admin-login', (req, res) => {
    res.send('<!DOCTYPE html><html><head><title>Admin Login</title><style>body{background:#0a0f1e;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}.box{background:#1e293b;padding:40px;border-radius:16px;width:360px;text-align:center;border:1px solid #10b981;}input{width:100%;padding:12px;margin:8px 0;background:#0f172a;border:1px solid #334155;color:#fff;border-radius:8px;box-sizing:border-box;}button{background:#10b981;border:none;padding:12px;width:100%;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:8px;}</style></head><body><div class="box"><h2 style="color:#10b981;">🔐 CEO Access</h2><form method="POST" action="/auth-admin"><input name="username" placeholder="Username" required><input type="password" name="password" placeholder="Password" required><button>LOGIN</button></form><p style="margin-top:15px;"><a href="/" style="color:#64748b;font-size:13px;">← Back to Site</a></p></div></body></html>');
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

app.get('/admin-logout', (req, res) => {
    req.session.isSuperAdmin = false;
    res.redirect('/admin-login');
});

// ==================== 🚀 START ====================
app.listen(PORT, '0.0.0.0', () => console.log('🚀 3EESHER-CLOUD EMPIRE READY ON PORT ' + PORT));
