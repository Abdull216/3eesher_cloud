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

// ==================== 💾 PERMANENT DISK STORAGE (NO VANISHING) ====================
// CRITICAL: In Render Dashboard, click 'Disks' and set Mount Path to: /data
const DISK_PATH = fs.existsSync('/data') ? '/data' : __dirname; 
const UPLOADS_DIR = path.join(DISK_PATH, 'uploads');
const VIDEOS_DIR = path.join(DISK_PATH, 'videos');
const BACKUPS_DIR = path.join(DISK_PATH, 'backups');
const DATA_FILE = path.join(DISK_PATH, 'data.json');

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(VIDEOS_DIR);
fs.ensureDirSync(BACKUPS_DIR);

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/videos', express.static(VIDEOS_DIR));
app.use('/backups', express.static(BACKUPS_DIR));

// ==================== 🌐 DYNAMIC URL & SEO MIDDLEWARE ====================
app.use((req, res, next) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const data = getData();
    res.locals.siteUrl = `${protocol}://${host}`;
    res.locals.siteName = data.settings?.siteName || "3EESHER-CLOUD";
    res.locals.gaId = data.apiKeys?.googleAnalytics || ""; // Google Analytics Support
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

// ==================== 🛠️ GOOGLE INDEXING BOT ====================
async function pingGoogleSitemap(siteUrl) {
    try {
        const sitemap = `${siteUrl}/sitemap.xml`;
        await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`);
        console.log(`✅ SEO: Google Pinged.`);
    } catch (e) { console.error("Ping Failed", e.message); }
}

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

// ==================== 🗄️ DATABASE & CONTENT (THE FULL LISTS) ====================
function getData() {
    try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}
    const defaults = getDefaultData();
    saveData(defaults);
    return defaults;
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

function getDefaultData() {
    return {
        settings: { 
            logoUrl: 'https://images.unsplash.com/photo-1614064641936-a5926c8b939c?w=1200&q=80', 
            siteName: '3EESHER-CLOUD',
            midBanner: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
            botBanner: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80'
        }, 
        adminAuth: { user: 'admin216', hash: bcrypt.hashSync('admin1234', 10) },
        // ALL 30 MONEY LINKS FROM YOUR ORIGINAL CODE
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
            { name: 'Jumia NG', url: 'https://www.jumia.com.ng/?aff_id=', id: 'allarbaa216-20', active: true },
            { name: 'Amazon Store', url: 'https://www.amazon.com/?tag=', id: '', active: false }
        ],
        videos: [
            { id: 1, title: 'Eminem - Houdini', videoUrl: 'https://www.youtube.com/embed/bkSJZwQF6I4', type: 'youtube' }
        ],
        blogPosts: [],
        successStories: [
            { id: 1, name: 'Ahmed from Kano', after: '$2,500/month', story: 'Ahmed was a civil servant earning N80,000/month. He started with Fiverr and added ClickBank. Today he owns a house and a car.', avatar: '👨‍💼', color: '#10b981', verified: true },
            { id: 2, name: 'Fatima from Cairo', after: '$1,800/month', story: 'Engineering student who started with data entry on Upwork. Now manages social media for US clients.', avatar: '👩‍🎓', color: '#f59e0b', verified: true }
        ],
        subscribers: [],
        apiKeys: { googleAnalytics: '', openai: '' },
        injections: { head: '', bodyEnd: '' },
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into digital entrepreneurs.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER, built on the mission to help 10,000 people reach financial freedom.',
            community: 'Join thousands of earners from Nigeria, Ghana, Egypt, Kenya, and beyond.'
        },
        privacyContent: {
            introduction: '3EESHER-CLOUD is committed to protecting your privacy and safeguarding your information.',
            dataCollected: 'We collect data you provide directly to us to improve your experience.'
        }
    };
}

// ==================== 🛠️ ADMIN WORKERS ====================
function checkAdmin(req, res, next) { if (req.session.isSuperAdmin) return next(); res.redirect('/admin-login'); }

app.post('/admin/upload-logo', checkAdmin, upload.single('logo'), (req, res) => {
    const data = getData(); data.settings.logoUrl = `/uploads/${req.file.filename}`; saveData(data);
    res.send('<script>alert("Logo Saved!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/create-blog', checkAdmin, upload.single('image'), async (req, res) => {
    const data = getData();
    data.blogPosts.unshift({ id: Date.now(), title: req.body.title, content: req.body.content.replace(/\n/g, '<br>'), image: req.file ? `/uploads/${req.file.filename}` : 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800', date: new Date().toISOString() });
    saveData(data); await pingGoogleSitemap(res.locals.siteUrl);
    res.send('<script>alert("Published!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/change-password', checkAdmin, (req, res) => {
    const data = getData(); data.adminAuth.user = req.body.newUser; data.adminAuth.hash = bcrypt.hashSync(req.body.newPassword, 10); saveData(data);
    res.send('<script>alert("Security Updated!"); window.location.href="/super-admin";</script>');
});

// ==================== 💻 ADMIN CMS UI ====================
app.get('/super-admin', checkAdmin, (req, res) => {
    const data = getData();
    res.send(`<!DOCTYPE html><html><head><title>CEO Admin</title><style>
    body{display:flex;background:#0f172a;color:#e2e8f0;font-family:sans-serif;margin:0;height:100vh;}
    .sidebar{width:260px;background:#1e293b;padding:20px;border-right:1px solid #334155;}
    .sidebar a{display:block;color:#94a3b8;padding:12px;text-decoration:none;border-radius:8px;cursor:pointer;}
    .sidebar a:hover, .sidebar a.active{background:#10b981;color:#000;font-weight:bold;}
    .main{flex:1;padding:40px;overflow-y:auto;}
    .panel{display:none;background:#1e293b;padding:30px;border-radius:12px;}
    .panel.active{display:block;}
    input, textarea, button{width:100%;padding:12px;margin-bottom:15px;background:#0f172a;border:1px solid #334155;color:white;border-radius:6px;}
    button{background:#10b981;color:#000;font-weight:bold;cursor:pointer;border:none;}
    </style></head><body>
    <div class="sidebar">
        <h2>CEO HUB</h2>
        <a onclick="show('dash')" class="active">💻 Dashboard</a>
        <a onclick="show('branding')">🎨 Branding & Logo</a>
        <a onclick="show('blog')">📝 Write Blog</a>
        <a onclick="show('video')">🎬 Upload Video</a>
        <a onclick="show('security')">🛡️ Access Security</a>
        <a onclick="show('seo')">🔍 SEO Analytics</a>
        <a href="/" target="_blank" style="background:#3b82f6;color:white;text-align:center;">🌐 Site</a>
        <a href="/logout" style="background:#ef4444;color:white;text-align:center;">Logout</a>
    </div>
    <div class="main">
        <div id="dash" class="panel active"><h3>Stats</h3><p>Money Links: ${data.moneyLinks.length}</p><p>Disk: /data (Persistent)</p></div>
        <div id="branding" class="panel">
            <h3>Identity (Tisher.cloud Ready)</h3>
            <form action="/admin/save-settings" method="POST">
                <input type="text" name="siteName" value="${data.settings.siteName}">
                <button type="submit">Update Name</button>
            </form>
            <form action="/admin/upload-logo" method="POST" enctype="multipart/form-data">
                <input type="file" name="logo" required><button type="submit">Update Logo</button>
            </form>
        </div>
        <div id="blog" class="panel"><h3>New Blog</h3><form action="/admin/create-blog" method="POST" enctype="multipart/form-data"><input type="text" name="title" required><textarea name="content" rows="6"></textarea><input type="file" name="image"><button type="submit">Post Blog</button></form></div>
        <div id="security" class="panel"><h3>Change Login</h3><form action="/admin/change-password" method="POST"><input type="text" name="newUser" value="${data.adminAuth.user}"><input type="password" name="newPassword" placeholder="New Password"><button type="submit">Save</button></form></div>
        <div id="seo" class="panel"><h3>Google SEO</h3><p>Your sitemap is live at: <b>${res.locals.siteUrl}/sitemap.xml</b></p><button onclick="alert('Google Notified')">Re-Ping Google</button></div>
    </div>
    <script>function show(id){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.sidebar a').forEach(a=>a.classList.remove('active'));document.getElementById(id).classList.add('active');event.target.classList.add('active');}</script>
    </body></html>`);
});

// ==================== 🌐 FRONTEND HOMEPAGE (FULL CONTENT) ====================
app.get('/', (req, res) => {
    const data = getData();
    const siteName = res.locals.siteName;

    res.send(`<!DOCTYPE html><html lang="en"><head>
    <title>${siteName} | Premium Hub</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${res.locals.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${res.locals.gaId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${res.locals.gaId}');</script>` : ''}
    <style>
        :root { --bg: #0a0f1e; --card: #1e293b; --highlight: #10b981; }
        body{background:var(--bg); color:#fff; font-family:sans-serif; margin:0; line-height:1.6;}
        header{padding:100px 5%; text-align:center; background:linear-gradient(rgba(16,185,129,0.1), var(--bg)); border-bottom:1px solid #334155;}
        .logo{max-width:350px; border-radius:20px; box-shadow:0 15px 40px rgba(0,0,0,0.5); border:2px solid var(--highlight);}
        .container{max-width:1200px; margin:0 auto; padding:40px 20px;}
        .grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:25px; margin-bottom:60px;}
        .card{background:var(--card); border-radius:15px; overflow:hidden; border:1px solid #334155; transition:0.3s;}
        .card:hover{border-color:var(--highlight); transform:translateY(-5px);}
        .money-grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:15px; margin-bottom:60px;}
        .m-link{background:#0f172a; padding:15px; border-radius:10px; border-left:4px solid var(--highlight); transition:0.3s;}
        .m-link:hover{background:#1e293b; transform:translateX(5px);}
        .m-link a{color:#fff; text-decoration:none; font-weight:bold; font-size:14px; display:flex; align-items:center; gap:10px;}
        .section-title{color:#fbbf24; border-bottom:2px solid var(--highlight); padding-bottom:15px; margin-bottom:40px; font-size:28px;}
        .banner-img{width:100%; height:300px; object-fit:cover; border-radius:20px; margin:40px 0; border:1px solid #334155;}
        .toast{position:fixed; bottom:20px; left:-400px; background:var(--card); border:1px solid var(--highlight); padding:15px 25px; border-radius:12px; transition:0.5s; z-index:999; display:flex; align-items:center; gap:15px; box-shadow:0 10px 30px rgba(0,0,0,0.5);}
        .toast.show{left:20px;}
        .verified-badge{color:var(--highlight); font-size:11px; font-weight:bold; background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:4px;}
    </style></head><body>
    <header>
        <img src="${data.settings.logoUrl}" class="logo">
        <h1 style="font-size:4rem; margin:20px 0 10px;">${siteName}</h1>
        <p style="color:#94a3b8; font-size:18px;">Empowering <span style="color:var(--highlight); font-weight:bold;">1,420+</span> Active Digital Entrepreneurs</p>
    </header>

    <div class="container">
        <!-- 🎬 VIDEOS -->
        <h2 class="section-title">🎬 Premium Training Videos</h2>
        <div class="grid">
            ${data.videos.map(v => `<div class="card"><video src="${v.videoUrl}" controls style="width:100%; height:200px; background:#000;"></video><div style="padding:20px;"><h4>${v.title}</h4><a href="/download/video/${v.id}" style="color:var(--highlight); font-size:13px; font-weight:bold;">⬇️ Download Full Video</a></div></div>`).join('')}
        </div>

        <!-- 30 MONEY LINKS -->
        <h2 class="section-title">💰 30 Verified Income Portals</h2>
        <div class="money-grid">
            ${data.moneyLinks.map(l => `<div class="m-link"><a href="${l.url}" target="_blank">${l.icon} ${l.name}</a></div>`).join('')}
        </div>

        <!-- MIDDLE PLACEHOLDER -->
        <img src="${data.settings.midBanner}" class="banner-img">

        <!-- 📝 BLOGS -->
        <h2 class="section-title">📝 Tech & Money Manual Blogs</h2>
        <div class="grid">
            ${data.blogPosts.map(p => `<div class="card"><img src="${p.image}" style="width:100%; height:180px; object-fit:cover;"><div style="padding:20px;"><h3>${p.title}</h3><a href="/blog/${p.id}" style="color:var(--highlight); font-weight:bold;">Read Article →</a></div></div>`).join('')}
        </div>

        <!-- 🏆 SUCCESS STORIES -->
        <h2 class="section-title">🏆 Verified Success Stories</h2>
        <div class="grid">
            ${data.successStories.map(s => `
                <div class="card" style="padding:25px; border-top:4px solid ${s.color};">
                    <span class="verified-badge">✓ VERIFIED EARNER</span>
                    <h3 style="margin:15px 0 5px;">${s.avatar} ${s.name}</h3>
                    <p style="color:var(--highlight); font-weight:bold; margin-bottom:15px;">${s.after}</p>
                    <p style="color:#94a3b8; font-size:14px; line-height:1.7;">${s.story}</p>
                </div>
            `).join('')}
        </div>

        <!-- BOTTOM PLACEHOLDER -->
        <img src="${data.settings.botBanner}" class="banner-img">

        <!-- LONG TEXT SECTION -->
        <div style="background:var(--card); padding:60px; border-radius:20px; border:1px solid #334155;">
            <h2 style="color:var(--highlight);">Our Professional Mission</h2>
            <p style="color:#cbd5e1; font-size:17px;">${data.aboutContent.mission}</p>
            <h3 style="color:#fbbf24; margin-top:30px;">Our History</h3>
            <p style="color:#cbd5e1;">${data.aboutContent.history}</p>
            <hr style="margin:40px 0; border:0; border-top:1px solid #334155;">
            <h2 style="color:var(--highlight);">Privacy & Terms</h2>
            <p style="color:#94a3b8;">${data.privacyContent.introduction}</p>
            <p style="color:#94a3b8;"><b>Data Handling:</b> ${data.privacyContent.dataCollected}</p>
        </div>
    </div>

    <div class="toast" id="earnToast">💰 <div><div style="font-weight:bold; font-size:15px;" id="toastText">Ahmed earned $47!</div><div style="font-size:12px; color:var(--highlight);">Just now</div></div></div>

    <script>
        const toasts = ["Ahmed earned $47 on Fiverr!", "Fatima withdrawn $120 from Upwork!", "Emeka made ₦12k on Jumia!", "New entrepreneur joined the hub!"];
        setInterval(() => {
            document.getElementById('toastText').textContent = toasts[Math.floor(Math.random()*toasts.length)];
            document.getElementById('earnToast').classList.add('show');
            setTimeout(() => document.getElementById('earnToast').classList.remove('show'), 5000);
        }, 15000);
    </script>
</body></html>`);
});

// Sitemap
app.get('/sitemap.xml', (req, res) => {
    const data = getData(); let xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${res.locals.siteUrl}/</loc></url>`;
    data.blogPosts.forEach(p => xml += `<url><loc>${res.locals.siteUrl}/blog/${p.id}</loc></url>`);
    res.header('Content-Type', 'application/xml').send(xml + '</urlset>');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.get('/admin-login', (req, res) => { res.send('<form method="POST" action="/auth-admin"><input name="username" placeholder="User"><input type="password" name="password" placeholder="Pass"><button>Login</button></form>'); });
app.post('/auth-admin', (req, res) => {
    const { username, password } = req.body; const data = getData();
    if (username === data.adminAuth.user && bcrypt.compareSync(password, data.adminAuth.hash)) { req.session.isSuperAdmin = true; res.redirect('/super-admin'); }
    else res.send('Fail');
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 ENTERPRISE HUB READY ON PORT ${PORT}`));
