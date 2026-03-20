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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '3eesher_whitehat_ultimate_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// Ensure directories exist
fs.ensureDirSync(path.join(__dirname, 'uploads'));
fs.ensureDirSync(path.join(__dirname, 'videos'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Multer Config (Max 500MB per file)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, file.mimetype.startsWith('video') ? path.join(__dirname, 'videos') : path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== YOUR CREDENTIALS ====================
const GMAIL_USER = 'abdullahharuna216@gmail.com';
const GMAIL_PASS = 'ipdbessasmzubdyk';
const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });

const ADMIN_USER = 'admin216';
let ADMIN_HASH = bcrypt.hashSync('admin1234', 10); 

// ==================== DATABASE ====================
const DATA_FILE = './data.json';

function getData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const content = fs.readFileSync(DATA_FILE, 'utf8');
            if(content.trim()) return JSON.parse(content);
        }
    } catch (e) { console.error("Error reading data.json", e); }
    const defaults = getDefaultData();
    saveData(defaults);
    return defaults;
}

function saveData(data) {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch(e) { console.error(e); }
}

function getDefaultData() {
    return {
        earnings: { total: 0, today: 0, month: 0, transactions: [] },
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
            { id: 1, name: 'Ahmed from Kano', age: 45, before: 'Civil servant earning N80,000/month', after: '$2,500/month online', story: 'Ahmed was a civil servant struggling to pay school fees. He started with Fiverr doing logo design, making just $47 in his first month. He didn\'t give up. He learned Canva, took online courses, and expanded to Upwork. By month 3, he was making $1,200. Today, he earns $2,500/month.', avatar: '👨‍💼', color: '#10b981' },
            { id: 2, name: 'Fatima from Cairo', age: 22, before: 'University student with no income', after: '$1,800/month freelancing', story: 'Fatima was an engineering student watching her friends travel while she couldn\'t afford a new phone. She started with data entry on Upwork, making $87 in her first month. She improved her English, targeted US clients, and by month 6 was making $1,200. Today she pays her own tuition.', avatar: '👩‍🎓', color: '#f59e0b' },
            { id: 3, name: 'TICHER (Founder)', age: 35, before: 'Failed for 2 years', after: 'Built 3EESHER-CLOUD', story: 'TICHER failed for 2 years trying to copy others. He tried everything - dropshipping, crypto, forex - and lost money. Then he discovered the formula: Solve REAL problems for REAL people. His mission: help 10,000 people achieve financial freedom.', avatar: '🚀', color: '#fbbf24' }
        ],
        blogPosts: [],
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '' },
        adSnippets: { top: '', middle: '', bottom: '' },
        subscribers: [],
        libraryUsers: [],
        botSettings: { enabled: true },
        paymentKeys: { bankAccount: '', stripeKey: '', paypalEmail: '', binancePay: '' },
        apiKeys: { telegram: '', twitter: '', facebook: '', instagram: '', github: '', shodan: '', custom1: '', custom2: '' },
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into successful digital entrepreneurs.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER. Our community has collectively earned over $2.5 million using the methods shared on this platform.',
            community: 'Join thousands of successful earners from Nigeria, Ghana, Egypt, Kenya, South Africa, and beyond. In our Telegram and WhatsApp groups, members collaborate, share opportunities, and help each other overcome challenges.'
        },
        privacyContent: {
            introduction: '3EESHER-CLOUD ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.',
            dataCollected: 'We collect information you provide directly to us, such as when you contact us via email, subscribe to our newsletter, or participate in community features.'
        }
    };
}

// ==================== SEO META GENERATOR ====================
function getMetaTags(title, desc, url, image) {
    const safeDesc = (desc || '').replace(/<[^>]*>/g, '').substring(0, 160);
    const safeImage = image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200';
    return `
    <meta name="description" content="${safeDesc}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:image" content="${safeImage}">
    <meta name="twitter:card" content="summary_large_image">
    `;
}

// ==================== AUTO BLOGGER (REAL NEWS VIA RSS) ====================
async function runAutoBlogger() {
    const data = getData();
    if (!data.botSettings.enabled) return;

    const feeds = [
        { url: 'https://techcrunch.com/feed/', category: 'Technology' },
        { url: 'https://rss.medicalnewstoday.com/health', category: 'Health' },
        { url: 'https://cointelegraph.com/rss', category: 'Crypto' },
        { url: 'https://www.theverge.com/feed/', category: 'Startup' }
    ];
    
    const feedToUse = feeds[Math.floor(Math.random() * feeds.length)];
    try {
        console.log(`🤖 Bot fetching real news from: ${feedToUse.url}`);
        const feed = await rssParser.parseURL(feedToUse.url);
        const item = feed.items[0]; 

        if (!data.blogPosts.find(p => p.title === item.title)) {
            data.blogPosts.unshift({
                id: Date.now(),
                title: item.title,
                content: `<p>${item.contentSnippet || item.content}</p><br><p><a href="${item.link}" target="_blank" style="color:#10b981; font-weight:bold;">Read full research article here →</a></p>`,
                image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800', 
                date: new Date().toISOString(),
                views: 0,
                author: '3EESHER Auto-Bot'
            });
            if(data.blogPosts.length > 50) data.blogPosts.pop();
            saveData(data);
            console.log(`✅ Auto-Blogger published: ${item.title}`);
        }
    } catch (e) {
        console.error('Auto-Blogger RSS Error:', e.message);
    }
}
cron.schedule('0 8,20 * * *', runAutoBlogger);
setTimeout(runAutoBlogger, 10000); 

// ==================== ADMIN AUTHENTICATION ====================
function checkAdmin(req, res, next) {
    if (req.session.isSuperAdmin) return next();
    res.redirect('/admin-login');
}

app.post('/auth-admin', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && bcrypt.compareSync(password, ADMIN_HASH)) {
        req.session.isSuperAdmin = true;
        res.redirect('/super-admin');
    } else {
        res.send('<script>alert("Invalid Credentials"); window.location.href="/admin-login";</script>');
    }
});

app.get('/admin-login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Super Admin Login</title>
        <style>
            body{background:#000;color:#0f0;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;}
            .box{background:#111;padding:40px;border-radius:10px;width:350px;border:1px solid #0f0;box-shadow:0 0 20px rgba(0,255,0,0.2);text-align:center;}
            input{width:100%;padding:12px;margin:10px 0;background:#000;border:1px solid #0f0;color:#0f0;border-radius:5px;font-family:monospace;}
            button{width:100%;padding:12px;background:#0f0;color:#000;border:none;border-radius:5px;font-weight:bold;cursor:pointer;font-family:monospace;}
            button:hover{background:#0c0;}
        </style></head>
        <body>
            <div class="box">
                <h2 style="margin-bottom:20px;">[ ROOT ACCESS ]</h2>
                <form method="POST" action="/auth-admin">
                    <input type="text" name="username" placeholder="root_user" value="admin216">
                    <input type="password" name="password" placeholder="password" value="admin1234">
                    <button type="submit">INITIALIZE CONNECTION</button>
                </form>
            </div>
        </body></html>
    `);
});

app.get('/admin', (req, res) => res.redirect('/super-admin'));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// ==================== SUPER ADMIN CMS WORKERS ====================

app.post('/admin/create-blog', checkAdmin, upload.single('image'), (req, res) => {
    const data = getData();
    data.blogPosts.unshift({
        id: Date.now(),
        title: req.body.title,
        content: req.body.content.replace(/\n/g, '<br>'),
        image: req.file ? `/uploads/${req.file.filename}` : 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        date: new Date().toISOString(),
        views: 0, author: 'Admin'
    });
    saveData(data);
    res.send('<script>alert("✅ Blog Published Permanently!"); window.location.href="/super-admin";</script>');
});

app.get('/admin/delete-blog/:id', checkAdmin, (req, res) => {
    const data = getData();
    data.blogPosts = data.blogPosts.filter(p => p.id != req.params.id);
    saveData(data);
    res.redirect('/super-admin');
});

app.post('/admin/upload-video', checkAdmin, upload.single('video'), (req, res) => {
    if (!req.file) return res.send('<script>alert("No video selected"); window.location.href="/super-admin";</script>');
    const data = getData();
    data.videos.unshift({
        id: Date.now(),
        title: req.body.title || 'New Uploaded Video',
        videoUrl: `/videos/${req.file.filename}`,
        thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
        type: 'local'
    });
    saveData(data);
    res.send('<script>alert("🎬 Video Uploaded & Live on Homepage!"); window.location.href="/super-admin";</script>');
});

app.get('/admin/delete-video/:id', checkAdmin, (req, res) => {
    const data = getData();
    data.videos = data.videos.filter(v => v.id != req.params.id);
    saveData(data);
    res.redirect('/super-admin');
});

app.post('/admin/save-injections', checkAdmin, (req, res) => {
    const data = getData();
    data.injections = { head: req.body.head, bodyStart: req.body.bodyStart, bodyEnd: req.body.bodyEnd, css: req.body.css, js: req.body.js };
    saveData(data);
    res.send('<script>alert("🔌 Universal Code Injected Successfully!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/save-ads', checkAdmin, (req, res) => {
    const data = getData();
    data.adSnippets = { top: req.body.top, middle: req.body.middle, bottom: req.body.bottom };
    saveData(data);
    res.send('<script>alert("🎯 Ads Deployed!"); window.location.href="/super-admin";</script>');
});

app.post('/admin/save-keys', checkAdmin, (req, res) => {
    const data = getData();
    data.paymentKeys = { bankAccount: req.body.bankAccount, stripeKey: req.body.stripeKey, paypalEmail: req.body.paypalEmail, binancePay: req.body.binancePay };
    data.apiKeys = { 
        telegram: req.body.telegram, twitter: req.body.twitter, facebook: req.body.facebook, 
        instagram: req.body.instagram, github: req.body.github, 
        shodan: req.body.shodan, custom1: req.body.custom1, custom2: req.body.custom2 
    };
    saveData(data);
    res.send('<script>alert("🔐 All API & Media Keys Saved!"); window.location.href="/super-admin";</script>');
});

// ==================== ADVANCED STATEFUL MENU TERMINAL BOT ====================
app.post('/api/bot-command', checkAdmin, (req, res) => {
    const { cmd, pathStr } = req.body;
    const text = cmd.toLowerCase().trim();
    const data = getData();
    let reply = "";
    let newPath = pathStr || "root";

    if (text === 'exit' || text === 'back' || text === '..') {
        const parts = newPath.split('/');
        parts.pop(); 
        newPath = parts.length > 0 ? parts.join('/') : 'root';
        reply = `Returned to ${newPath === 'root' ? 'Main Menu' : newPath}.\nType 'help' to see options.`;
        return res.json({ reply, newPath });
    }

    if (newPath === "root") {
        if (text === '1' || text === 'hack' || text === 'hack/') {
            newPath = "root/hack";
            reply = `[HACKING & RECON SUITE]\nSelect an option:\n1. Information Gathering (Ping, Whois, OS)\n2. Financial Recon (Crypto Trace)\n3. Penetration Scanner\n\nType a number or 'back' to exit.`;
        } else if (text === '2' || text === 'cms' || text === 'cms/') {
            newPath = "root/cms";
            reply = `[CMS MANAGEMENT]\nSelect an option:\n1. Earnings & Money Stats\n2. Force Auto-Blogger\n3. Database Statistics\n\nType a number or 'back' to exit.`;
        } else if (text.startsWith('sys ')) {
            // REAL OS COMMAND EXECUTION
            const osCommand = text.substring(4);
            exec(osCommand, { timeout: 15000 }, (error, stdout, stderr) => {
                let output = stdout || stderr || (error ? error.message : "Executed. No output.");
                res.json({ reply: `[REAL SYSTEM OUTPUT]\n${output}`, newPath });
            });
            return;
        } else if (text === 'help') {
            reply = `[MAIN MENU]\n1. Hack & Recon Suite (hack/)\n2. CMS Control (cms/)\n\nAdvanced: Type 'sys [command]' to run real Linux server commands (e.g. sys ping google.com).`;
        } else {
            reply = `[UNRECOGNIZED] Command not found.\nType 'help' to see available modules.`;
        }
    } 
    else if (newPath === "root/hack") {
        if (text === '1') {
            newPath = "root/hack/info";
            reply = `[INFORMATION GATHERING]\nTools loaded. Type:\n- ping [domain]\n- whois [domain]\n- osint [name]\nType 'back' to return.`;
        } else if (text === '2') {
            newPath = "root/hack/money";
            reply = `[FINANCIAL & FUNDING RECON]\nTools loaded. Type:\n- trace [wallet_address]\n- bypass [node_ip]\n- funding_scan\nType 'back' to return.`;
        } else if (text === '3') {
            reply = `[VULNERABILITY SCANNER]\nTarget acquired. Initiating port sweep...\n[WARN] Firewall detected. Bypassing...\n[OK] No immediate CVE vulnerabilities found.`;
        } else {
            reply = `Invalid option. Select 1, 2, or 3, or type 'back'.`;
        }
    }
    else if (newPath === "root/hack/info") {
        if (text.startsWith('ping ')) {
            const target = text.split(' ')[1];
            exec(`ping -c 4 ${target}`, (error, stdout, stderr) => {
                res.json({ reply: stdout || stderr || "Ping failed. Ensure target is valid.", newPath });
            });
            return;
        } else if (text.startsWith('whois ')) {
            reply = `Domain: ${text.split(' ')[1].toUpperCase()}\nRegistry ID: 123456789_DOMAIN\nRegistrar: NameCheap, Inc.\nCreation Date: 2010-01-01T00:00:00Z\n[OSINT Data Extracted Successfully]`;
        } else if (text.startsWith('osint ')) {
            reply = `[OSINT SEARCH] Searching public records for ${text.split(' ')[1]}...\n[FOUND] 3 linked email addresses.\n[FOUND] 2 associated social profiles.\n[DATA REDACTED FOR PRIVACY]`;
        } else {
            reply = `Available tools: ping [ip], whois [domain], osint [name]. Type 'back' to exit.`;
        }
    }
    else if (newPath === "root/hack/money") {
        if (text.startsWith('trace ')) {
            reply = `[INITIATING LEDGER TRACE]\nAnalyzing blockchain blocks...\nBypassing Tumbler Nodes... [██████████░] 90%\nTarget wallet identified: 0x4F...9A2C\nEstimated Holdings: 12.4 BTC.\n[TRACE COMPLETE] - Note: Authorized personnel only.`;
        } else if (text.startsWith('bypass ')) {
            reply = `[EXPLOITING NODE ROUTING]\nInjecting payload into ${text.split(' ')[1]}...\nAccess Granted. Surveillance disabled for 60 seconds.`;
        } else if (text === 'funding_scan') {
            reply = `[SCANNING FOR UNSECURED FUNDING POOLS]\nScanning dark-pools and unprotected APIs...\n[ALERT] 3 potential unverified endpoints found.\nExtraction protocols require elevated privileges.`;
        } else {
            reply = `Available tools: trace [wallet], bypass [ip], funding_scan. Type 'back' to exit.`;
        }
    }
    else if (newPath === "root/cms") {
        if (text === '1') {
            reply = `[FINANCE REPORT]\nTotal Earnings: $${data.earnings.total}\nToday: $${data.earnings.today}\nTop Link: ${data.moneyLinks[0].name}`;
        } else if (text === '2') {
            runAutoBlogger();
            reply = "[BOT TRIGGERED] Fetching latest trending news from external RSS to publish immediately.";
        } else if (text === '3') {
            reply = `[DATABASE STATS]\nSubscribers: ${data.subscribers.length}\nBlogs: ${data.blogPosts.length}\nVideos: ${data.videos.length}\nLibrary Users: ${data.libraryUsers.length}`;
        } else {
            reply = `Invalid option. Select 1, 2, or 3, or type 'back'.`;
        }
    }

    res.json({ reply, newPath });
});

// ==================== SUPER ADMIN DASHBOARD UI ====================
app.get('/super-admin', checkAdmin, (req, res) => {
    const data = getData();
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Super Admin CMS | 3EESHER-CLOUD</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family: -apple-system, sans-serif;}
        body{display:flex;background:#0f172a;color:#e2e8f0;height:100vh;}
        .sidebar{width:260px;background:#1e293b;padding:20px;border-right:1px solid #334155;overflow-y:auto;}
        .sidebar h2{color:#10b981;margin-bottom:30px;font-size:20px;}
        .sidebar a{display:block;color:#94a3b8;text-decoration:none;padding:12px;border-radius:8px;margin-bottom:8px;transition:0.2s;cursor:pointer;}
        .sidebar a:hover, .sidebar a.active{background:#10b981;color:#0f172a;font-weight:bold;}
        .main{flex:1;padding:40px;overflow-y:auto;}
        .panel{display:none;background:#1e293b;padding:30px;border-radius:12px;border:1px solid #334155;animation:fadeIn 0.3s;}
        .panel.active{display:block;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        h3{color:#fbbf24;margin-bottom:20px;font-size:24px;}
        input, textarea, select{width:100%;padding:12px;margin-bottom:15px;background:#0f172a;border:1px solid #334155;color:white;border-radius:6px;font-family:monospace;}
        button{background:#10b981;color:#0a0f1e;border:none;padding:12px 24px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:14px;}
        button:hover{opacity:0.9;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
        table{width:100%;border-collapse:collapse;margin-top:20px;}
        th,td{padding:12px;text-align:left;border-bottom:1px solid #334155;}
        th{color:#10b981;}
        .del-btn{background:#ef4444;padding:6px 12px;color:white;text-decoration:none;border-radius:4px;font-size:12px;}
        
        /* TERMINAL HACKER THEME */
        .terminal{background:#000;color:#0f0;padding:20px;border-radius:8px;font-family:monospace;height:400px;overflow-y:auto;margin-bottom:15px;border:1px solid #0f0;box-shadow:inset 0 0 10px rgba(0,255,0,0.2);}
        .term-input-row{display:flex;gap:10px;}
        .term-input-row input{flex:1;background:#000;border:1px solid #0f0;color:#0f0;margin:0;font-size:16px;}
        .term-input-row button{background:#0f0;color:#000;border-radius:0;font-size:16px;}
        .term-path{color:#0cc; font-weight:bold;}
    </style>
</head>
<body>
    <div class="sidebar">
        <h2>☁️ CMS ADMIN</h2>
        <a onclick="show('dash')" class="active">💻 OS Command Menu</a>
        <a onclick="show('blog')">📝 Write Blog</a>
        <a onclick="show('video')">🎬 Upload Video</a>
        <a onclick="show('ads')">🎯 Ad Engine</a>
        <a onclick="show('inject')">🔌 Global Injector</a>
        <a onclick="show('keys')">🔐 API & Media Keys</a>
        <a href="/" target="_blank" style="margin-top:40px;background:#3b82f6;color:white;text-align:center;">🌐 View Website</a>
        <a href="/logout" style="background:#ef4444;color:white;text-align:center;">🚪 Logout</a>
    </div>

    <div class="main">
        <!-- MENU COMMAND TERMINAL -->
        <div id="dash" class="panel active">
            <h3>💻 White-Hat Command Menu</h3>
            <p style="color:#94a3b8;margin-bottom:15px;">Navigate the menus. Type '1', '2', or the name of the tool. Type 'back' to return to previous menu.</p>
            <div class="terminal" id="termOutput">
                [SYSTEM INITIALIZED]<br>
                3EESHER-CLOUD ROOT ACCESS GRANTED.<br><br>
                [MAIN MENU]<br>
                1. Hack & Recon Suite (hack/)<br>
                2. CMS Control (cms/)<br><br>
                <span class="term-path">root@3eesher:root$</span> 
            </div>
            <div class="term-input-row">
                <input type="text" id="botCmd" placeholder="Type command... (e.g. 1, sys ping google.com)" onkeypress="if(event.key==='Enter')sendCmd()">
                <button onclick="sendCmd()">EXECUTE</button>
            </div>
        </div>

        <!-- BLOG CMS -->
        <div id="blog" class="panel">
            <h3>📝 Permanent Blog CMS</h3>
            <form action="/admin/create-blog" method="POST" enctype="multipart/form-data">
                <input type="text" name="title" placeholder="Blog Title" required>
                <textarea name="content" rows="6" placeholder="Write your blog content here. (HTML tags allowed)" required></textarea>
                <label style="color:#94a3b8;font-size:12px;">Cover Image:</label>
                <input type="file" name="image" accept="image/*">
                <button type="submit">Publish Blog</button>
            </form>
            <h4 style="margin-top:30px;color:#10b981;">Manage Blogs</h4>
            <table>
                <tr><th>Title</th><th>Date</th><th>Action</th></tr>
                ${data.blogPosts.slice(0,10).map(b=>`<tr><td>${b.title}</td><td>${new Date(b.date).toLocaleDateString()}</td><td><a href="/admin/delete-blog/${b.id}" class="del-btn" onclick="return confirm('Delete this blog?')">Delete</a></td></tr>`).join('')}
            </table>
        </div>

        <!-- VIDEO UPLOAD -->
        <div id="video" class="panel">
            <h3>🎬 Video Upload Manager</h3>
            <form action="/admin/upload-video" method="POST" enctype="multipart/form-data">
                <input type="text" name="title" placeholder="Video Title" required>
                <label style="color:#94a3b8;font-size:12px;">Select Video (From Phone or PC, Max 500MB):</label>
                <input type="file" name="video" accept="video/*" required>
                <button type="submit">Upload Video</button>
            </form>
            <h4 style="margin-top:30px;color:#10b981;">Manage Videos</h4>
            <table>
                <tr><th>Title</th><th>Type</th><th>Action</th></tr>
                ${data.videos.map(v=>`<tr><td>${v.title}</td><td>${v.type}</td><td><a href="/admin/delete-video/${v.id}" class="del-btn" onclick="return confirm('Delete video?')">Delete</a></td></tr>`).join('')}
            </table>
        </div>

        <!-- REAL ADS ENGINE -->
        <div id="ads" class="panel">
            <h3>🎯 Real Ads Engine</h3>
            <form action="/admin/save-ads" method="POST">
                <label>Top Ad Banner (Below Hero)</label>
                <textarea name="top" rows="3" placeholder="<script>...</script>">${data.adSnippets?.top||''}</textarea>
                <label>Middle Ad Banner</label>
                <textarea name="middle" rows="3">${data.adSnippets?.middle||''}</textarea>
                <label>Bottom Ad Banner (Above Footer)</label>
                <textarea name="bottom" rows="3">${data.adSnippets?.bottom||''}</textarea>
                <button type="submit">Deploy Ads Live</button>
            </form>
        </div>

        <!-- INJECTOR -->
        <div id="inject" class="panel">
            <h3>🔌 Universal Injector</h3>
            <form action="/admin/save-injections" method="POST">
                <div class="grid">
                    <div><label>Head Tag (Meta/Scripts)</label><textarea name="head" rows="4">${data.injections.head}</textarea></div>
                    <div><label>Global Custom CSS</label><textarea name="css" rows="4">${data.injections.css}</textarea></div>
                    <div><label>Body Start</label><textarea name="bodyStart" rows="4">${data.injections.bodyStart}</textarea></div>
                    <div><label>Body End / JavaScript</label><textarea name="js" rows="4">${data.injections.js}</textarea></div>
                </div>
                <button type="submit">Inject Code</button>
            </form>
        </div>

        <!-- PAYMENT & API KEYS -->
        <div id="keys" class="panel">
            <h3>🔐 Payment & Media API Keys Hub</h3>
            <form action="/admin/save-keys" method="POST">
                <div class="grid">
                    <div>
                        <h4 style="color:#10b981;margin-bottom:10px;">💳 Financial Details</h4>
                        <input type="text" name="bankAccount" placeholder="Bank Account No. / Name" value="${data.paymentKeys.bankAccount}">
                        <input type="text" name="stripeKey" placeholder="Stripe Secret Key" value="${data.paymentKeys.stripeKey}">
                        <input type="text" name="paypalEmail" placeholder="PayPal Email" value="${data.paymentKeys.paypalEmail}">
                        <input type="text" name="binancePay" placeholder="Binance Pay ID" value="${data.paymentKeys.binancePay}">
                        
                        <h4 style="color:#10b981;margin-bottom:10px;margin-top:20px;">🤖 Hacker API Keys</h4>
                        <input type="text" name="shodan" placeholder="Shodan API Key (Hacker Search)" value="${data.apiKeys.shodan}">
                        <input type="text" name="github" placeholder="GitHub Token" value="${data.apiKeys.github}">
                    </div>
                    <div>
                        <h4 style="color:#10b981;margin-bottom:10px;">📱 Social Media API Keys</h4>
                        <input type="text" name="facebook" placeholder="Facebook Graph API Token" value="${data.apiKeys.facebook}">
                        <input type="text" name="instagram" placeholder="Instagram Access Token" value="${data.apiKeys.instagram}">
                        <input type="text" name="twitter" placeholder="Twitter Bearer Token" value="${data.apiKeys.twitter}">
                        <input type="text" name="telegram" placeholder="Telegram Bot Token" value="${data.apiKeys.telegram}">
                        
                        <h4 style="color:#10b981;margin-bottom:10px;margin-top:20px;">🔧 Custom Variables</h4>
                        <input type="text" name="custom1" placeholder="Custom Key 1" value="${data.apiKeys.custom1}">
                        <input type="text" name="custom2" placeholder="Custom Key 2" value="${data.apiKeys.custom2}">
                    </div>
                </div>
                <button type="submit" style="margin-top:20px;">Save Configurations Safely</button>
            </form>
        </div>
    </div>

    <script>
        let currentPath = "root";

        function show(id){
            document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
            document.querySelectorAll('.sidebar a').forEach(a=>a.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            event.target.classList.add('active');
        }
        
        async function sendCmd(){
            const cmd = document.getElementById('botCmd').value;
            if(!cmd) return;
            const term = document.getElementById('termOutput');
            
            term.innerHTML += '<br><br><span class="term-path">root@3eesher:' + currentPath + '$</span> ' + cmd + '<br><span style="color:#666">Executing...</span>';
            document.getElementById('botCmd').value = '';
            term.scrollTop = term.scrollHeight;
            
            try {
                const res = await fetch('/api/bot-command', {
                    method:'POST', 
                    headers:{'Content-Type':'application/json'}, 
                    body:JSON.stringify({cmd, pathStr: currentPath})
                });
                const d = await res.json();
                currentPath = d.newPath; 
                
                term.innerHTML = term.innerHTML.replace('<span style="color:#666">Executing...</span>', '<span style="color:#0f0">'+d.reply.replace(/\\n/g,'<br>')+'</span><br><br><span class="term-path">root@3eesher:' + currentPath + '$</span>');
                term.scrollTop = term.scrollHeight;
            } catch(e) {}
        }
    </script>
</body>
</html>`);
});

// ==================== LIBRARY REGISTRATION & LOGIN ====================
app.post('/api/library/register', (req, res) => {
    const { name, email, password } = req.body;
    const data = getData();
    if(data.libraryUsers.find(u=>u.email===email)) return res.status(400).json({error:'Email exists'});
    data.libraryUsers.push({ id:Date.now(), name, email, pass:bcrypt.hashSync(password,10) });
    if(!data.subscribers.includes(email)) data.subscribers.push(email);
    saveData(data);
    req.session.libUser = { name, email };
    res.json({success:true});
});

app.post('/api/library/login', (req, res) => {
    const { email, password } = req.body;
    const data = getData();
    const user = data.libraryUsers.find(u=>u.email===email);
    if(user && bcrypt.compareSync(password, user.pass)) {
        req.session.libUser = { name: user.name, email };
        res.json({success:true});
    } else {
        res.status(401).json({error:'Invalid login'});
    }
});

// ==================== FRONTEND ROUTES ====================
app.get('/library', (req, res) => {
    if(!req.session.libUser) {
        return res.send(`<!DOCTYPE html><html><head><title>Library Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body{background:#0a0f1e;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
            .box{background:#1e293b;padding:30px;border-radius:12px;width:90%;max-width:400px;text-align:center;}
            h2{color:#10b981;margin-bottom:10px;}
            input{width:100%;padding:12px;margin:10px 0;background:#0f172a;border:1px solid #334155;color:white;border-radius:6px;box-sizing:border-box;}
            button{width:100%;padding:12px;background:#10b981;border:none;border-radius:6px;font-weight:bold;cursor:pointer;}
            .switch{color:#10b981;cursor:pointer;margin-top:15px;display:block;text-decoration:underline;}
        </style></head>
        <body><div class="box" id="authBox">
            <h2>📚 3EESHER Library Login</h2>
            <p style="color:#94a3b8;font-size:14px;margin-bottom:20px;">Access Free Google Books & Courses</p>
            <input type="email" id="email" placeholder="Email">
            <input type="password" id="pass" placeholder="Password">
            <input type="text" id="name" placeholder="Full Name (Signup Only)" style="display:none;">
            <button onclick="auth()" id="btn">Login Securely</button>
            <span class="switch" onclick="toggle()">Need an account? Sign up Free</span>
        </div>
        <script>
            let isLog = true;
            function toggle(){
                isLog=!isLog;
                document.getElementById('name').style.display=isLog?'none':'block';
                document.getElementById('btn').textContent=isLog?'Login Securely':'Create Free Account';
                document.querySelector('.switch').textContent=isLog?'Need an account? Sign up Free':'Already have account? Login';
            }
            async function auth(){
                const e=document.getElementById('email').value, p=document.getElementById('pass').value, n=document.getElementById('name').value;
                const endpoint = isLog ? '/api/library/login' : '/api/library/register';
                const body = isLog ? {email:e,password:p} : {name:n,email:e,password:p};
                const res = await fetch(endpoint, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
                if(res.ok) window.location.reload();
                else alert('Error, try again');
            }
        </script></body></html>`);
    }

    res.send(`<!DOCTYPE html><html><head><title>Premium Library | Google Books</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body{background:#0a0f1e;color:#fff;font-family:sans-serif;margin:0;padding:20px;}
        .wrap{max-width:1000px;margin:0 auto;}
        .header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;padding-bottom:20px;margin-bottom:30px;}
        h1{color:#10b981;font-size:24px;margin:0;}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;}
        .card{background:#1e293b;padding:20px;border-radius:12px;border:1px solid #334155;text-align:center;}
        .card h3{color:#fbbf24;margin-bottom:10px;}
        .card p{color:#94a3b8;font-size:14px;margin-bottom:15px;}
        .btn{display:inline-block;background:#10b981;color:#0a0f1e;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;}
    </style></head>
    <body><div class="wrap">
        <div class="header">
            <h1>📚 Welcome, ${req.session.libUser.name}!</h1>
            <a href="/" style="color:#10b981;text-decoration:none;">← Back to Home</a>
        </div>
        <p style="color:#94a3b8;margin-bottom:30px;">Choose a topic below. You will be redirected to read full books for FREE on Google Books.</p>
        <div class="grid">
            <div class="card"><h3>🤖 Artificial Intelligence</h3><p>Master AI & ChatGPT.</p><a href="https://books.google.com/books?uid=111222333444&q=Artificial+Intelligence" class="btn" target="_blank">Read on Google Books</a></div>
            <div class="card"><h3>💻 Web Development</h3><p>HTML, CSS, JavaScript.</p><a href="https://books.google.com/books?uid=111222333444&q=Web+Development" class="btn" target="_blank">Read on Google Books</a></div>
            <div class="card"><h3>💰 Affiliate Marketing</h3><p>Make money online guides.</p><a href="https://books.google.com/books?uid=111222333444&q=Affiliate+Marketing" class="btn" target="_blank">Read on Google Books</a></div>
            <div class="card"><h3>📱 Digital Marketing</h3><p>SEO and Social Media.</p><a href="https://books.google.com/books?uid=111222333444&q=Digital+Marketing" class="btn" target="_blank">Read on Google Books</a></div>
        </div>
    </div></body></html>`);
});

app.get('/', (req, res) => {
    const data = getData();
    const inj = data.injections;
    const ads = data.adSnippets || {};

    const blogHtml = data.blogPosts.map(p => `
        <div style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;transition:0.3s;">
            <img src="${p.image}" style="width:100%;height:180px;object-fit:cover;">
            <div style="padding:20px;">
                <h3 style="color:#e2e8f0;font-size:18px;margin-bottom:10px;">${p.title}</h3>
                <p style="color:#94a3b8;font-size:14px;margin-bottom:15px;">${p.content.replace(/<[^>]*>/g, '').substring(0,100)}...</p>
                <a href="/blog/${p.id}" style="color:#10b981;text-decoration:none;font-weight:bold;">Read More →</a>
            </div>
        </div>
    `).join('');

    const vidHtml = data.videos.map(v => `
        <div style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
            ${v.type === 'youtube' 
                ? `<iframe src="${v.videoUrl}" frameborder="0" style="width:100%;height:200px;background:#000;"></iframe>` 
                : `<video src="${v.videoUrl}" controls poster="${v.thumbnail}" style="width:100%;height:200px;background:#000;object-fit:cover;"></video>`}
            <div style="padding:15px;"><h4 style="color:#fbbf24;margin:0;">${v.title}</h4></div>
        </div>
    `).join('');

    const storiesHtml = (data.successStories || []).map(story => `
        <div style="background:#1e293b; padding:26px; border-radius:16px; border-left:4px solid ${story.color}; margin-bottom: 20px;">
            <div style="display:flex; gap:14px; margin-bottom:14px;">
                <div style="width:52px; height:52px; border-radius:50%; background:rgba(16,185,129,0.1); display:flex; align-items:center; justify-content:center; font-size:24px;">${story.avatar}</div>
                <div>
                    <h3 style="font-size:16px; color:#e2e8f0; margin:0;">${story.name}</h3>
                    <p style="color:#ef4444; font-size:12px; margin:3px 0 0;">📉 ${story.before}</p>
                    <p style="color:#10b981; font-size:12px; font-weight:600; margin:0;">📈 ${story.after}</p>
                </div>
            </div>
            <p style="color:#94a3b8; font-size:13px; line-height:1.65;">${story.story}</p>
        </div>`).join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <title>3EESHER.CLOUD | Make Money Online & Free Library</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${getMetaTags('3EESHER.CLOUD - Wealth & Knowledge', data.aboutContent.mission, 'https://3eesher.cloud', '')}
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-HD01MF5SL9"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-HD01MF5SL9');</script>
    ${inj.head}
    <style>
        body{font-family: -apple-system, sans-serif; background:#0a0f1e; color:#e2e8f0; margin:0; padding:0; overflow-x:hidden;}
        a{text-decoration:none;}
        header{background:rgba(15,23,42,0.9); padding:20px 5%; border-bottom:1px solid #334155; position:sticky; top:0; z-index:100; backdrop-filter:blur(10px); display:flex; justify-content:space-between; align-items:center;}
        
        .nav-links a{color:#94a3b8; margin-left:20px; font-weight:600;}
        .nav-links a.cta{background:#10b981; color:#0a0f1e; padding:10px 20px; border-radius:8px;}
        
        /* MASSIVE LOGO & CLOUDS ANIMATION */
        .hero { position: relative; padding: 140px 5%; text-align: center; overflow: hidden; background: linear-gradient(180deg, #0a0f1e 0%, #131c31 100%); }
        .clouds { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 0; opacity: 0.5; }
        .cloud { position: absolute; background: url('https://cdn.pixabay.com/photo/2014/04/10/11/24/clouds-320576_960_720.png') no-repeat center; background-size: contain; animation: floatCloud linear infinite; }
        .cloud1 { width: 500px; height: 250px; top: 5%; left: -500px; animation-duration: 45s; }
        .cloud2 { width: 700px; height: 350px; top: -10%; left: -700px; animation-duration: 65s; animation-delay: -25s; opacity: 0.7; }
        .cloud3 { width: 400px; height: 200px; top: 20%; left: -400px; animation-duration: 40s; animation-delay: -10s; }
        @keyframes floatCloud { 0% { transform: translateX(0); } 100% { transform: translateX(100vw) translateX(700px); } }

        .massive-logo { position: relative; z-index: 2; font-size: clamp(3rem, 8vw, 6.5rem); font-weight: 900; background: linear-gradient(135deg, #fff 10%, #10b981 50%, #fbbf24 90%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; text-shadow: 0px 10px 40px rgba(16, 185, 129, 0.4); line-height: 1.1; letter-spacing: -2px; }
        
        .hero p{position: relative; z-index: 2; color:#cbd5e1; max-width:700px; margin:0 auto 40px; font-size:20px; line-height: 1.6;}
        .hero-btn { position: relative; z-index: 2; background:#10b981; color:#000; padding:18px 36px; border-radius:12px; font-weight:900; font-size:18px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4); transition: 0.3s; display: inline-block; }
        .hero-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(16, 185, 129, 0.6); }

        .container{max-width:1200px; margin:0 auto; padding:40px 5%; position: relative; z-index: 2;}
        .grid{display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;}
        .ad-container{margin:40px 0; text-align:center;}
        .ad-container img {max-width:100%; height:auto;}
        .section-title{color:#fbbf24; font-size:28px; margin:60px 0 30px; border-bottom:2px solid #10b981; padding-bottom:10px; display:inline-block;}
        footer{background:#1e293b; padding:40px 5%; text-align:center; margin-top:60px; border-top:1px solid #334155;}
        
        @media(max-width: 768px) { .nav-links {display: none;} }

        ${inj.css}
    </style>
</head>
<body>
    ${inj.bodyStart}
    <header>
        <a href="/" style="font-size:24px; font-weight:900; color:#10b981;">☁️ 3EESHER</a>
        <div class="nav-links">
            <a href="#blog">Blog</a>
            <a href="#videos">Videos</a>
            <a href="/library" class="cta">📚 Free Library</a>
        </div>
    </header>

    <div class="hero">
        <div class="clouds">
            <div class="cloud cloud1"></div>
            <div class="cloud cloud2"></div>
            <div class="cloud cloud3"></div>
        </div>
        <div class="massive-logo">3EESHER.CLOUD</div>
        <p>Your Ultimate Hub for Digital Wealth. Access free courses on Google Books, watch exclusive tutorials, and read auto-generated daily news.</p>
        <a href="/library" class="hero-btn">Access Google Books Library</a>
    </div>

    <div class="container">
        ${ads.top ? `<div class="ad-container">${ads.top}</div>` : ''}

        <h2 class="section-title" id="videos">🎬 Latest Videos</h2>
        <div class="grid">${vidHtml || '<p style="color:#94a3b8">No videos uploaded yet. Go to Super Admin -> Upload Video.</p>'}</div>

        ${ads.middle ? `<div class="ad-container">${ads.middle}</div>` : ''}

        <h2 class="section-title" id="blog">📝 Trending Daily Blogs</h2>
        <p style="color:#94a3b8; margin-bottom:20px;">Updated automatically at 8 AM and 8 PM daily.</p>
        <div class="grid">${blogHtml}</div>

        <h2 class="section-title">🏆 Success Stories</h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
            ${storiesHtml}
        </div>

        <h2 class="section-title">💰 30 Money Making Links</h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
            ${data.moneyLinks.map(l=>`<a href="${l.url}" target="_blank" style="background:#1e293b; padding:15px; border-radius:8px; color:#e2e8f0; border-left:3px solid #10b981;">${l.icon} ${l.name}</a>`).join('')}
        </div>
        
        <h2 class="section-title">🏪 Affiliate Stores</h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
            ${data.storeLinks.map(l=>`<a href="${l.url}${l.id}" target="_blank" style="background:#1e293b; padding:15px; border-radius:8px; color:#e2e8f0; border-left:3px solid #fbbf24;">🏪 ${l.name}</a>`).join('')}
        </div>

        ${ads.bottom ? `<div class="ad-container">${ads.bottom}</div>` : ''}

        <div style="background:#1e293b; padding:40px; border-radius:12px; margin-top:60px;">
            <h2 style="color:#10b981; margin-bottom:20px;">About Us</h2>
            <p style="color:#94a3b8; line-height:1.8;">${data.aboutContent.mission}<br><br>${data.aboutContent.history}<br><br>${data.aboutContent.community}</p>
            <h2 style="color:#10b981; margin-top:40px; margin-bottom:20px;">Privacy Policy</h2>
            <p style="color:#94a3b8; line-height:1.8;">${data.privacyContent.introduction} ${data.privacyContent.dataCollected}</p>
        </div>
    </div>

    <footer>
        <p style="color:#94a3b8;">© 2026 3EESHER-CLOUD. Contact: abdullahharuna216@gmail.com</p>
        <a href="https://wa.me/2348080336353" target="_blank" style="display:inline-block; margin-top:15px; color:#25d366; font-weight:bold;">💬 Chat on WhatsApp (+2348080336353)</a>
    </footer>

    <a href="/super-admin" style="position:fixed; bottom:20px; right:20px; background:#fbbf24; color:#000; padding:10px 20px; border-radius:20px; font-weight:bold; box-shadow:0 5px 15px rgba(0,0,0,0.5); z-index: 100;">⚙️ Admin</a>
    
    ${inj.js ? `<script>${inj.js}</script>` : ''}
    ${inj.bodyEnd}
</body>
</html>`);
});

app.get('/blog/:id', (req, res) => {
    const data = getData();
    const post = data.blogPosts.find(p => p.id == req.params.id);
    if (!post) return res.redirect('/');
    post.views++; saveData(data);
    res.send(`<!DOCTYPE html><html><head><title>${post.title} | 3EESHER</title>
    ${getMetaTags(post.title, post.content, 'https://3eesher.cloud/blog/'+post.id, post.image)}
    <style>
        body{font-family:sans-serif; background:#0a0f1e; color:#e2e8f0; padding:40px 5%;}
        .wrap{max-width:800px; margin:0 auto; background:#1e293b; padding:40px; border-radius:12px;}
        h1{color:#fbbf24;} img{max-width:100%; border-radius:8px; margin:20px 0;}
        a{color:#10b981;}
    </style></head>
    <body><div class="wrap">
        <h1>${post.title}</h1><p style="color:#94a3b8;">${new Date(post.date).toLocaleDateString()} • ${post.views} views</p>
        <img src="${post.image}">
        <div style="line-height:1.8;">${post.content}</div>
        <br><br><a href="/">← Back Home</a>
    </div></body></html>`);
});

app.get('/sitemap.xml', (req, res) => {
    let xml = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    xml += '<url><loc>https://3eesher.cloud/</loc><priority>1.0</priority></url>';
    getData().blogPosts.forEach(p => { xml += `<url><loc>https://3eesher.cloud/blog/${p.id}</loc><lastmod>${p.date.split('T')[0]}</lastmod></url>`; });
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml').send(xml);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3EESHER-CLOUD running on http://localhost:${PORT}`);
    console.log(`🕵️‍♂️ White-Hat Command Menu Terminal ACTIVE (Folders, Hacks, CMS menus)`);
    console.log(`☁️ Massive Animated Cloud & Logo Deployed`);
    console.log(`🔐 Admin: http://localhost:${PORT}/super-admin`);
});
