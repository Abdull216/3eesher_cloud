// ==================== COMPLETE 3EESHER.CLOUD - ALL FEATURES ====================
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// --- SETUP FOLDERS ---
const UPLOADS_FOLDER = './uploads';
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_FOLDER));
app.use(session({
    secret: '3eesher-complete-v5',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== DATABASE SETUP ====================
const db = new sqlite3.Database('./3eesher.db');
db.serialize(() => {
    // USERS TABLE - ONLY ADMIN
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'admin',
        created_date TEXT
    )`);

    // VIDEOS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        thumbnail TEXT,
        description TEXT,
        views INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        created_date TEXT
    )`);

    // PLACEHOLDERS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS placeholders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        link TEXT,
        display_order INTEGER DEFAULT 0,
        created_date TEXT
    )`);

    // BLOG POSTS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        image TEXT,
        views INTEGER DEFAULT 0,
        created_date TEXT
    )`);

    // GALLERY TABLE
    db.run(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        created_date TEXT
    )`);

    // AFFILIATE STORES TABLE
    db.run(`CREATE TABLE IF NOT EXISTS affiliate_stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        image TEXT,
        url TEXT,
        description TEXT,
        button_text TEXT DEFAULT 'Visit Store',
        display_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_date TEXT
    )`);

    // MONEY LINKS TABLE - 30 WEBSITES
    db.run(`CREATE TABLE IF NOT EXISTS money_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        url TEXT,
        description TEXT,
        category TEXT,
        image TEXT,
        display_order INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_date TEXT
    )`);

    // AD PLACEMENTS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS ad_placements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        location TEXT,
        code TEXT,
        enabled INTEGER DEFAULT 1,
        created_date TEXT
    )`);

    // INJECTIONS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS injections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        location TEXT,
        code TEXT,
        active INTEGER DEFAULT 1,
        created_date TEXT
    )`);

    // SETTINGS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // ==================== CREATE ADMIN ONLY ====================
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.run(`INSERT OR IGNORE INTO users (username, password, role, created_date) VALUES (?, ?, ?, ?)`,
        ['admin', hash, 'super_admin', new Date().toISOString()]);

    // DEFAULT SETTINGS
    const settings = [
        ['site_name', '3eesher.cloud'],
        ['site_title', '3eesher.cloud - 30 Money Sites & Video Platform'],
        ['site_description', '30 verified money-making websites and video sharing platform'],
        ['primary_color', '#2563eb'],
        ['secondary_color', '#7c3aed'],
        ['bg_color', '#0f1117'],
        ['text_color', '#e2e8f0'],
        ['hero_title', 'Welcome to 3eesher.cloud'],
        ['hero_subtitle', '30 money-making websites + video platform'],
        ['footer_text', '© 2024 3eesher.cloud. All rights reserved.'],
        ['contact_email', 'abdullahharuna216@gmail.com'],
        ['contact_phone', '+2348080335353'],
        ['google_analytics', 'G-HD01MF5SL9'],
        ['about_text', '3eesher.cloud is your complete platform for making money online and sharing videos. We provide 30 verified money-making websites and a full video sharing platform where you can upload, share, and monetize your content.'],
        ['privacy_text', 'Your privacy is important to us. We only collect necessary information to provide our services. We never sell your personal data to third parties. All information is stored securely and used only for platform functionality.'],
        ['terms_text', 'By using 3eesher.cloud, you agree to our terms and conditions. You are responsible for the content you post. We reserve the right to remove any content that violates our guidelines.']
    ];

    settings.forEach(([key, value]) => {
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });

    // DEFAULT AD PLACEMENTS
    const ads = [
        ['Header Banner', 'header', '<!-- Header Ad Space -->', 1],
        ['Sidebar Top', 'sidebar_top', '<!-- Sidebar Top Ad -->', 1],
        ['Sidebar Bottom', 'sidebar_bottom', '<!-- Sidebar Bottom Ad -->', 1],
        ['Content Top', 'content_top', '<!-- Content Top Ad -->', 1],
        ['Content Middle', 'content_middle', '<!-- Content Middle Ad -->', 1],
        ['Content Bottom', 'content_bottom', '<!-- Content Bottom Ad -->', 1],
        ['Footer Banner', 'footer', '<!-- Footer Ad -->', 1],
        ['Popup Ad', 'popup', '<!-- Popup Ad -->', 1]
    ];

    ads.forEach(([name, location, code, enabled]) => {
        db.run(`INSERT OR IGNORE INTO ad_placements (name, location, code, enabled, created_date) VALUES (?, ?, ?, ?, ?)`,
            [name, location, code, enabled, new Date().toISOString()]);
    });

    // DEFAULT INJECTIONS
    const injections = [
        ['Head Scripts', 'head', '<!-- Head Injections -->', 1],
        ['Body Start', 'body_start', '<!-- Body Start -->', 1],
        ['Body End', 'body_end', '<!-- Body End -->', 1],
        ['Custom CSS', 'custom_css', '/* Custom CSS */', 1],
        ['Custom JS', 'custom_js', '// Custom JavaScript', 1]
    ];

    injections.forEach(([name, location, code, active]) => {
        db.run(`INSERT OR IGNORE INTO injections (name, location, code, active, created_date) VALUES (?, ?, ?, ?, ?)`,
            [name, location, code, active, new Date().toISOString()]);
    });

    // SAMPLE PLACEHOLDERS
    db.get(`SELECT COUNT(*) as count FROM placeholders`, [], (err, row) => {
        if (row.count === 0) {
            const placeholders = [
                ['30 Money-Making Websites', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200', '/money-links', 1],
                ['Share Your Videos', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=1200', '/videos', 2],
                ['Start Earning Today', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200', '/money-links', 3],
                ['Join Our Community', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200', '/blog', 4],
                ['Learn and Grow', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200', '/about', 5]
            ];

            placeholders.forEach(([title, filename, link, order]) => {
                db.run(`INSERT INTO placeholders (title, filename, link, display_order, created_date) VALUES (?, ?, ?, ?, ?)`,
                    [title, filename, link, order, new Date().toISOString()]);
            });
        }
    });

    // SAMPLE VIDEOS WITH REAL WORKING VIDEOS
    db.get(`SELECT COUNT(*) as count FROM videos`, [], (err, row) => {
        if (row.count === 0) {
            const videos = [
                ['Welcome to 3eesher.cloud', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 'Start your journey here'],
                ['Video Creation Tips', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 'Learn to create amazing videos'],
                ['Behind the Scenes', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 'See how we create content'],
                ['Community Spotlight', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'Amazing videos from community'],
                ['Tutorial Video', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', 'Step by step tutorial'],
                ['Animation Sample', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 'Beautiful animations']
            ];

            videos.forEach(([title, filename, thumb, desc]) => {
                db.run(`INSERT INTO videos (title, filename, thumbnail, description, created_date) VALUES (?, ?, ?, ?, ?)`,
                    [title, filename, thumb, desc, new Date().toISOString()]);
            });
        }
    });

    // SAMPLE BLOG POSTS
    db.get(`SELECT COUNT(*) as count FROM posts`, [], (err, row) => {
        if (row.count === 0) {
            const posts = [
                ['Getting Started on 3eesher.cloud', '<h1>Welcome to 3eesher.cloud!</h1><p>Your complete platform for making money online and sharing videos. Here you will find 30 verified money-making websites and a full video sharing platform.</p>', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400'],
                ['10 Tips for Better Videos', '<h1>10 Tips for Creating Amazing Videos</h1><p>1. Plan your content<br>2. Use good lighting<br>3. Clear audio is crucial<br>4. Keep it concise<br>5. Engage with your audience</p>', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400'],
                ['How to Make Money Online', '<h1>Ways to Earn from Your Content</h1><p>1. Affiliate marketing<br>2. Ad revenue<br>3. Sponsored content<br>4. Premium subscriptions</p>', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400']
            ];

            posts.forEach(([title, content, image]) => {
                db.run(`INSERT INTO posts (title, content, image, created_date) VALUES (?, ?, ?, ?)`,
                    [title, content, image, new Date().toISOString()]);
            });
        }
    });

    // SAMPLE GALLERY
    db.get(`SELECT COUNT(*) as count FROM gallery`, [], (err, row) => {
        if (row.count === 0) {
            const images = [
                ['Team Meeting', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400'],
                ['Office Space', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400'],
                ['Creative Work', 'https://images.unsplash.com/photo-1517245386807-9b4d0a6e4b9c?w=400'],
                ['Video Shoot', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400'],
                ['Studio Setup', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400'],
                ['Team Lunch', 'https://images.unsplash.com/photo-1517245386807-9b4d0a6e4b9c?w=400'],
                ['Workshop', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400'],
                ['Conference', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400']
            ];

            images.forEach(([title, filename]) => {
                db.run(`INSERT INTO gallery (title, filename, created_date) VALUES (?, ?, ?)`,
                    [title, filename, new Date().toISOString()]);
            });
        }
    });

    // SAMPLE AFFILIATE STORES
    db.get(`SELECT COUNT(*) as count FROM affiliate_stores`, [], (err, row) => {
        if (row.count === 0) {
            const stores = [
                ['Amazon', 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=400', 'https://amazon.com', 'Shop millions of products', 'Shop Now', 1],
                ['eBay', 'https://images.unsplash.com/photo-1561715276-a2d1c41904a3?w=400', 'https://ebay.com', 'Buy and sell anything', 'Browse', 2],
                ['AliExpress', 'https://images.unsplash.com/photo-1604608683240-1c6c7b1b1b1b?w=400', 'https://aliexpress.com', 'Global shopping platform', 'Shop', 3],
                ['Walmart', 'https://images.unsplash.com/photo-1604608683240-1c6c7b1b1b1b?w=400', 'https://walmart.com', 'Everything you need', 'Visit', 4],
                ['Target', 'https://images.unsplash.com/photo-1604608683240-1c6c7b1b1b1b?w=400', 'https://target.com', 'Style and savings', 'Explore', 5]
            ];

            stores.forEach(([name, image, url, description, button_text, order]) => {
                db.run(`INSERT INTO affiliate_stores (name, image, url, description, button_text, display_order, active, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [name, image, url, description, button_text, order, 1, new Date().toISOString()]);
            });
        }
    });

    // 30 MONEY LINKS - COMPLETE LIST
    db.get(`SELECT COUNT(*) as count FROM money_links`, [], (err, row) => {
        if (row.count === 0) {
            const links = [
                ['Freelancer.com', 'https://freelancer.com', 'Freelance platform for all skills', 'Freelancing', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', 1],
                ['Fiverr', 'https://fiverr.com', 'Sell your services starting at $5', 'Freelancing', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', 2],
                ['Upwork', 'https://upwork.com', 'Find remote work opportunities', 'Freelancing', 'https://images.unsplash.com/photo-1517245386807-9b4d0a6e4b9c?w=400', 3],
                ['Amazon Mechanical Turk', 'https://mturk.com', 'Micro-tasks for money', 'Micro-work', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', 4],
                ['Swagbucks', 'https://swagbucks.com', 'Earn rewards for surveys', 'Surveys', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', 5],
                ['InboxDollars', 'https://inboxdollars.com', 'Paid emails and surveys', 'Surveys', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', 6],
                ['Survey Junkie', 'https://surveyjunkie.com', 'Paid online surveys', 'Surveys', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 7],
                ['UserTesting', 'https://usertesting.com', 'Get paid to test websites', 'Testing', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 8],
                ['TryMyUI', 'https://trymyui.com', 'Website testing platform', 'Testing', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 9],
                ['Userlytics', 'https://userlytics.com', 'Paid user testing', 'Testing', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 10],
                ['Clickworker', 'https://clickworker.com', 'Micro tasks and surveys', 'Micro-work', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 11],
                ['Appen', 'https://appen.com', 'AI training and data collection', 'Data entry', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', 12],
                ['Lionbridge', 'https://lionbridge.com', 'Internet ratings and tasks', 'Ratings', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', 13],
                ['Teachable', 'https://teachable.com', 'Create and sell online courses', 'Courses', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 14],
                ['Udemy', 'https://udemy.com', 'Sell your courses', 'Courses', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 15],
                ['Skillshare', 'https://skillshare.com', 'Teach your skills', 'Courses', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 16],
                ['Etsy', 'https://etsy.com', 'Sell handmade products', 'E-commerce', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 17],
                ['eBay', 'https://ebay.com', 'Sell products online', 'E-commerce', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 18],
                ['Poshmark', 'https://poshmark.com', 'Sell fashion items', 'E-commerce', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', 19],
                ['Depop', 'https://depop.com', 'Vintage and streetwear', 'E-commerce', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', 20],
                ['Redbubble', 'https://redbubble.com', 'Sell your designs', 'Print on demand', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 21],
                ['Teespring', 'https://teespring.com', 'Create and sell merch', 'Print on demand', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 22],
                ['Printful', 'https://printful.com', 'Print on demand service', 'Print on demand', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 23],
                ['Shopify', 'https://shopify.com', 'Build your online store', 'E-commerce', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 24],
                ['WooCommerce', 'https://woocommerce.com', 'WordPress e-commerce', 'E-commerce', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 25],
                ['ClickBank', 'https://clickbank.com', 'Affiliate marketplace', 'Affiliate', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', 26],
                ['ShareASale', 'https://shareasale.com', 'Affiliate network', 'Affiliate', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', 27],
                ['CJ Affiliate', 'https://cj.com', 'Affiliate marketing', 'Affiliate', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 28],
                ['Rakuten', 'https://rakuten.com', 'Cashback and rewards', 'Cashback', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 29],
                ['Honey', 'https://joinhoney.com', 'Browser extension for savings', 'Cashback', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 30]
            ];

            links.forEach(([title, url, description, category, image, order]) => {
                db.run(`INSERT INTO money_links (title, url, description, category, image, display_order, active, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [title, url, description, category, image, order, 1, new Date().toISOString()]);
            });
        }
    });
});

// ==================== UPLOAD SETUP ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 500 * 1024 * 1024 } });

// ==================== MAIN PAGE ====================
app.get('/', (req, res) => {
    db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
        const settings = {};
        settingsRows.forEach(s => settings[s.key] = s.value);

        db.all(`SELECT * FROM videos ORDER BY created_date DESC`, [], (err, videos) => {
            db.all(`SELECT * FROM placeholders ORDER BY display_order ASC`, [], (err, placeholders) => {
                db.all(`SELECT * FROM posts ORDER BY created_date DESC LIMIT 3`, [], (err, posts) => {
                    db.all(`SELECT * FROM gallery ORDER BY created_date DESC LIMIT 8`, [], (err, gallery) => {
                        db.all(`SELECT * FROM affiliate_stores WHERE active = 1 ORDER BY display_order ASC LIMIT 5`, [], (err, stores) => {
                            db.all(`SELECT * FROM money_links WHERE active = 1 ORDER BY display_order ASC`, [], (err, moneyLinks) => {
                                db.all(`SELECT * FROM ad_placements WHERE enabled = 1`, [], (err, ads) => {
                                    db.all(`SELECT * FROM injections WHERE active = 1`, [], (err, injections) => {

                                        // Group injections
                                        const headInjection = injections.find(i => i.location === 'head')?.code || '';
                                        const bodyStartInjection = injections.find(i => i.location === 'body_start')?.code || '';
                                        const bodyEndInjection = injections.find(i => i.location === 'body_end')?.code || '';
                                        const customCSS = injections.find(i => i.location === 'custom_css')?.code || '';
                                        const customJS = injections.find(i => i.location === 'custom_js')?.code || '';

                                        // Group ads
                                        const adsByLocation = {};
                                        ads.forEach(ad => adsByLocation[ad.location] = ad.code);

                                        // Placeholder carousel
                                        const placeholderHTML = placeholders.map((p, index) => `
                                            <div class="hero-slide ${index === 0 ? 'active' : ''}" style="background-image: url('${p.filename}');">
                                                <div class="hero-overlay"></div>
                                                <div class="hero-content">
                                                    <h1>${p.title}</h1>
                                                    ${p.link ? `<a href="${p.link}" class="hero-btn">Explore</a>` : ''}
                                                </div>
                                            </div>
                                        `).join('');

                                        // Affiliate stores HTML
                                        const storesHTML = stores.map(s => `
                                            <div class="store-card">
                                                <img src="${s.image}" alt="${s.name}" class="store-image">
                                                <h3 class="store-name">${s.name}</h3>
                                                <p class="store-description">${s.description}</p>
                                                <a href="${s.url}" target="_blank" class="store-btn">${s.button_text}</a>
                                            </div>
                                        `).join('');

                                        // 30 Money Links HTML
                                        const moneyLinksHTML = moneyLinks.map(l => `
                                            <div class="money-link-card">
                                                <img src="${l.image}" alt="${l.title}" class="money-link-image">
                                                <div class="money-link-content">
                                                    <h3><a href="${l.url}" target="_blank">${l.title}</a></h3>
                                                    <p class="money-link-desc">${l.description}</p>
                                                    <span class="money-link-category">${l.category}</span>
                                                    <a href="${l.url}" target="_blank" class="money-link-btn">Visit Site →</a>
                                                </div>
                                            </div>
                                        `).join('');

                                        // Video HTML
                                        const videoHTML = videos.map(v => `
                                            <div class="video-card">
                                                <video class="video-player" src="${v.filename}" controls preload="metadata" poster="${v.thumbnail}"></video>
                                                <div class="video-info">
                                                    <h3>${v.title}</h3>
                                                    <p>${v.description || ''}</p>
                                                    <div class="video-stats">
                                                        <span>👁️ ${v.views} views</span>
                                                        <a href="/download/video/${v.id}" class="download-link">⬇ Download</a>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('');

                                        // Blog HTML
                                        const blogHTML = posts.map(p => `
                                            <article class="blog-card">
                                                ${p.image ? `<img src="${p.image}" alt="${p.title}" class="blog-image">` : ''}
                                                <div class="blog-content">
                                                    <h3><a href="/post/${p.id}">${p.title}</a></h3>
                                                    <p class="blog-meta">${new Date(p.created_date).toLocaleDateString()} • 👁️ ${p.views}</p>
                                                    <p>${p.content.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                                                    <a href="/post/${p.id}" class="read-more">Read more</a>
                                                </div>
                                            </article>
                                        `).join('');

                                        // Gallery HTML
                                        const galleryHTML = gallery.map(g => `
                                            <div class="gallery-item" onclick="openImage('${g.filename}')">
                                                <img src="${g.filename}" alt="${g.title}">
                                            </div>
                                        `).join('');

                                        res.send(`
                                            <!DOCTYPE html>
                                            <html lang="en">
                                            <head>
                                                <meta charset="UTF-8">
                                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                                <title>${settings.site_title}</title>

                                                <!-- Google Analytics -->
                                                <script async src="https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics}"></script>
                                                <script>
                                                    window.dataLayer = window.dataLayer || [];
                                                    function gtag(){dataLayer.push(arguments);}
                                                    gtag('js', new Date());
                                                    gtag('config', '${settings.google_analytics}');
                                                </script>

                                                <!-- HEAD INJECTION -->
                                                ${headInjection}

                                                <style>
                                                    * { margin: 0; padding: 0; box-sizing: border-box; }

                                                    :root {
                                                        --primary: ${settings.primary_color};
                                                        --secondary: ${settings.secondary_color};
                                                        --bg: ${settings.bg_color};
                                                        --text: ${settings.text_color};
                                                        --card-bg: #1a1e2b;
                                                        --border: #2d3748;
                                                    }

                                                    body {
                                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                        background: var(--bg);
                                                        color: var(--text);
                                                        line-height: 1.6;
                                                    }

                                                    a {
                                                        color: var(--primary);
                                                        text-decoration: none;
                                                    }

                                                    /* Header */
                                                    header {
                                                        background: linear-gradient(135deg, var(--primary), var(--secondary));
                                                        color: white;
                                                        padding: 1rem 0;
                                                        position: sticky;
                                                        top: 0;
                                                        z-index: 100;
                                                        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                                                    }

                                                    .header-container {
                                                        max-width: 1200px;
                                                        margin: 0 auto;
                                                        padding: 0 20px;
                                                        display: flex;
                                                        justify-content: space-between;
                                                        align-items: center;
                                                    }

                                                    .logo {
                                                        font-size: 2rem;
                                                        font-weight: 700;
                                                        color: white;
                                                    }

                                                    .nav-menu {
                                                        display: flex;
                                                        gap: 20px;
                                                    }

                                                    .nav-menu a {
                                                        color: white;
                                                        padding: 8px 12px;
                                                    }

                                                    .login-btn {
                                                        background: white;
                                                        color: var(--primary) !important;
                                                        border-radius: 5px;
                                                    }

                                                    /* Hero Carousel */
                                                    .hero-carousel {
                                                        position: relative;
                                                        height: 400px;
                                                        overflow: hidden;
                                                    }

                                                    .hero-slide {
                                                        position: absolute;
                                                        top: 0;
                                                        left: 0;
                                                        width: 100%;
                                                        height: 100%;
                                                        background-size: cover;
                                                        background-position: center;
                                                        opacity: 0;
                                                        transition: opacity 0.5s;
                                                        display: flex;
                                                        align-items: center;
                                                        justify-content: center;
                                                    }

                                                    .hero-slide.active {
                                                        opacity: 1;
                                                    }

                                                    .hero-overlay {
                                                        position: absolute;
                                                        top: 0;
                                                        left: 0;
                                                        right: 0;
                                                        bottom: 0;
                                                        background: rgba(0,0,0,0.6);
                                                    }

                                                    .hero-content {
                                                        position: relative;
                                                        z-index: 2;
                                                        text-align: center;
                                                        color: white;
                                                        max-width: 800px;
                                                        padding: 0 20px;
                                                    }

                                                    .hero-content h1 {
                                                        font-size: 3rem;
                                                        margin-bottom: 1rem;
                                                    }

                                                    .hero-btn {
                                                        display: inline-block;
                                                        padding: 12px 30px;
                                                        background: white;
                                                        color: var(--primary);
                                                        border-radius: 5px;
                                                    }

                                                    .carousel-nav {
                                                        position: absolute;
                                                        top: 50%;
                                                        transform: translateY(-50%);
                                                        width: 100%;
                                                        display: flex;
                                                        justify-content: space-between;
                                                        padding: 0 20px;
                                                        z-index: 10;
                                                    }

                                                    .carousel-nav button {
                                                        background: rgba(255,255,255,0.3);
                                                        border: none;
                                                        color: white;
                                                        font-size: 24px;
                                                        padding: 10px 15px;
                                                        cursor: pointer;
                                                        border-radius: 50%;
                                                    }

                                                    .carousel-dots {
                                                        position: absolute;
                                                        bottom: 20px;
                                                        left: 50%;
                                                        transform: translateX(-50%);
                                                        display: flex;
                                                        gap: 10px;
                                                        z-index: 10;
                                                    }

                                                    .dot {
                                                        width: 12px;
                                                        height: 12px;
                                                        background: rgba(255,255,255,0.5);
                                                        border-radius: 50%;
                                                        cursor: pointer;
                                                    }

                                                    .dot.active {
                                                        background: white;
                                                    }

                                                    /* Container */
                                                    .container {
                                                        max-width: 1200px;
                                                        margin: 0 auto;
                                                        padding: 40px 20px;
                                                    }

                                                    .section-title {
                                                        font-size: 2rem;
                                                        margin: 40px 0 20px;
                                                        color: var(--primary);
                                                    }

                                                    /* Money Links Grid - 30 websites */
                                                    .money-links-grid {
                                                        display: grid;
                                                        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                                                        gap: 20px;
                                                        margin: 30px 0;
                                                    }

                                                    .money-link-card {
                                                        background: var(--card-bg);
                                                        border-radius: 8px;
                                                        overflow: hidden;
                                                        display: flex;
                                                        border: 1px solid var(--border);
                                                    }

                                                    .money-link-image {
                                                        width: 100px;
                                                        height: 100px;
                                                        object-fit: cover;
                                                    }

                                                    .money-link-content {
                                                        padding: 15px;
                                                        flex: 1;
                                                    }

                                                    .money-link-content h3 {
                                                        font-size: 16px;
                                                        margin-bottom: 5px;
                                                    }

                                                    .money-link-content h3 a {
                                                        color: var(--primary);
                                                    }

                                                    .money-link-desc {
                                                        font-size: 13px;
                                                        color: #a0aec0;
                                                        margin-bottom: 8px;
                                                    }

                                                    .money-link-category {
                                                        display: inline-block;
                                                        background: var(--secondary);
                                                        color: white;
                                                        padding: 2px 8px;
                                                        border-radius: 3px;
                                                        font-size: 11px;
                                                        margin-bottom: 8px;
                                                    }

                                                    .money-link-btn {
                                                        display: inline-block;
                                                        color: var(--primary);
                                                        font-size: 13px;
                                                        font-weight: 500;
                                                    }

                                                    /* Affiliate Stores Grid */
                                                    .stores-grid {
                                                        display: grid;
                                                        grid-template-columns: repeat(5, 1fr);
                                                        gap: 20px;
                                                        margin: 30px 0;
                                                    }

                                                    .store-card {
                                                        background: var(--card-bg);
                                                        border-radius: 8px;
                                                        overflow: hidden;
                                                        text-align: center;
                                                        border: 1px solid var(--border);
                                                    }

                                                    .store-image {
                                                        width: 100%;
                                                        height: 120px;
                                                        object-fit: cover;
                                                    }

                                                    .store-name {
                                                        font-size: 16px;
                                                        margin: 12px 0 4px;
                                                    }

                                                    .store-description {
                                                        font-size: 13px;
                                                        color: #a0aec0;
                                                        padding: 0 8px;
                                                        margin-bottom: 12px;
                                                    }

                                                    .store-btn {
                                                        display: inline-block;
                                                        background: var(--primary);
                                                        color: white;
                                                        padding: 6px 12px;
                                                        border-radius: 4px;
                                                        font-size: 13px;
                                                        margin-bottom: 12px;
                                                    }

                                                    /* Video Grid */
                                                    .video-grid {
                                                        display: grid;
                                                        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                                                        gap: 30px;
                                                        margin: 30px 0;
                                                    }

                                                    .video-card {
                                                        background: var(--card-bg);
                                                        border-radius: 12px;
                                                        overflow: hidden;
                                                        border: 1px solid var(--border);
                                                    }

                                                    .video-player {
                                                        width: 100%;
                                                        height: 200px;
                                                        background: #000;
                                                    }

                                                    .video-info {
                                                        padding: 15px;
                                                    }

                                                    .video-info h3 {
                                                        font-size: 18px;
                                                        margin-bottom: 8px;
                                                    }

                                                    .video-stats {
                                                        display: flex;
                                                        justify-content: space-between;
                                                        align-items: center;
                                                        margin-top: 10px;
                                                        color: #a0aec0;
                                                    }

                                                    .download-link {
                                                        color: var(--primary);
                                                        font-weight: 500;
                                                    }

                                                    /* Blog Grid */
                                                    .blog-grid {
                                                        display: grid;
                                                        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                                                        gap: 30px;
                                                        margin: 30px 0;
                                                    }

                                                    .blog-card {
                                                        background: var(--card-bg);
                                                        border-radius: 8px;
                                                        overflow: hidden;
                                                        border: 1px solid var(--border);
                                                    }

                                                    .blog-image {
                                                        width: 100%;
                                                        height: 200px;
                                                        object-fit: cover;
                                                    }

                                                    .blog-content {
                                                        padding: 20px;
                                                    }

                                                    .blog-content h3 a {
                                                        color: var(--primary);
                                                    }

                                                    .blog-meta {
                                                        color: #a0aec0;
                                                        font-size: 14px;
                                                        margin: 8px 0;
                                                    }

                                                    .read-more {
                                                        display: inline-block;
                                                        margin-top: 12px;
                                                        color: var(--primary);
                                                    }

                                                    /* Gallery Grid */
                                                    .gallery-grid {
                                                        display: grid;
                                                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                                                        gap: 15px;
                                                        margin: 30px 0;
                                                    }

                                                    .gallery-item {
                                                        position: relative;
                                                        aspect-ratio: 1;
                                                        cursor: pointer;
                                                        overflow: hidden;
                                                        border-radius: 8px;
                                                        border: 1px solid var(--border);
                                                    }

                                                    .gallery-item img {
                                                        width: 100%;
                                                        height: 100%;
                                                        object-fit: cover;
                                                        transition: transform 0.3s;
                                                    }

                                                    .gallery-item:hover img {
                                                        transform: scale(1.1);
                                                    }

                                                    /* Footer with long descriptions */
                                                    footer {
                                                        background: #0a0c12;
                                                        color: white;
                                                        padding: 60px 0 20px;
                                                        margin-top: 60px;
                                                        border-top: 1px solid var(--border);
                                                    }

                                                    .footer-grid {
                                                        max-width: 1200px;
                                                        margin: 0 auto;
                                                        padding: 0 20px;
                                                        display: grid;
                                                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                                                        gap: 40px;
                                                    }

                                                    .footer-col h3 {
                                                        color: var(--primary);
                                                        margin-bottom: 15px;
                                                    }

                                                    .footer-col p {
                                                        color: #a0aec0;
                                                        line-height: 1.8;
                                                        margin-bottom: 15px;
                                                    }

                                                    .footer-bottom {
                                                        text-align: center;
                                                        padding-top: 20px;
                                                        margin-top: 20px;
                                                        border-top: 1px solid #2d3748;
                                                        color: #a0aec0;
                                                    }

                                                    /* WhatsApp Button */
                                                    .whatsapp-btn {
                                                        position: fixed;
                                                        bottom: 80px;
                                                        right: 20px;
                                                        background: #25D366;
                                                        color: white;
                                                        width: 56px;
                                                        height: 56px;
                                                        border-radius: 50%;
                                                        display: flex;
                                                        align-items: center;
                                                        justify-content: center;
                                                        font-size: 28px;
                                                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                                        z-index: 99;
                                                    }

                                                    /* Admin Button */
                                                    .admin-btn {
                                                        position: fixed;
                                                        bottom: 20px;
                                                        right: 20px;
                                                        background: var(--primary);
                                                        color: white;
                                                        padding: 12px 24px;
                                                        border-radius: 50px;
                                                        z-index: 99;
                                                    }

                                                    /* Image Modal */
                                                    .image-modal {
                                                        position: fixed;
                                                        top: 0;
                                                        left: 0;
                                                        right: 0;
                                                        bottom: 0;
                                                        background: rgba(0,0,0,0.95);
                                                        display: flex;
                                                        align-items: center;
                                                        justify-content: center;
                                                        z-index: 1000;
                                                    }

                                                    .image-modal img {
                                                        max-width: 90%;
                                                        max-height: 90%;
                                                        border-radius: 8px;
                                                    }

                                                    .close-modal {
                                                        position: absolute;
                                                        top: 20px;
                                                        right: 30px;
                                                        color: white;
                                                        font-size: 40px;
                                                        cursor: pointer;
                                                    }

                                                    /* Responsive */
                                                    @media (max-width: 768px) {
                                                        .stores-grid { grid-template-columns: repeat(2, 1fr); }
                                                        .money-links-grid { grid-template-columns: 1fr; }
                                                        .video-grid { grid-template-columns: 1fr; }
                                                        .blog-grid { grid-template-columns: 1fr; }
                                                        .hero-content h1 { font-size: 2rem; }
                                                    }

                                                    @media (max-width: 480px) {
                                                        .stores-grid { grid-template-columns: 1fr; }
                                                    }

                                                    /* Custom CSS Injection */
                                                    ${customCSS}
                                                </style>
                                            </head>
                                            <body>
                                                ${bodyStartInjection}

                                                ${adsByLocation['header'] ? `<div class="ad-header">${adsByLocation['header']}</div>` : ''}

                                                <header>
                                                    <div class="header-container">
                                                        <a href="/" class="logo">☁️ 3eesher.cloud</a>
                                                        <nav class="nav-menu">
                                                            <a href="#money-links">30 Money Sites</a>
                                                            <a href="#stores">Stores</a>
                                                            <a href="#videos">Videos</a>
                                                            <a href="#blog">Blog</a>
                                                            ${req.session.userId ? 
                                                                '<a href="/admin" class="login-btn">Admin</a>' : 
                                                                '<a href="/login" class="login-btn">Login</a>'
                                                            }
                                                        </nav>
                                                    </div>
                                                </header>

                                                <div class="hero-carousel">
                                                    ${placeholderHTML}
                                                    <div class="carousel-nav">
                                                        <button class="carousel-prev">❮</button>
                                                        <button class="carousel-next">❯</button>
                                                    </div>
                                                    <div class="carousel-dots">
                                                        ${placeholders.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
                                                    </div>
                                                </div>

                                                <div class="container" id="money-links">
                                                    <h2 class="section-title">💰 30 Verified Money-Making Websites</h2>
                                                    ${adsByLocation['content_top'] ? `<div class="ad-content">${adsByLocation['content_top']}</div>` : ''}
                                                    <div class="money-links-grid">
                                                        ${moneyLinksHTML}
                                                    </div>
                                                </div>

                                                <div class="container" id="stores">
                                                    <h2 class="section-title">🏪 Featured Affiliate Stores</h2>
                                                    <div class="stores-grid">
                                                        ${storesHTML}
                                                    </div>
                                                </div>

                                                <div class="container" id="videos">
                                                    <h2 class="section-title">🎥 Latest Videos</h2>
                                                    <div class="video-grid">
                                                        ${videoHTML}
                                                    </div>
                                                    ${adsByLocation['content_middle'] ? `<div class="ad-content">${adsByLocation['content_middle']}</div>` : ''}
                                                </div>

                                                <div class="container" id="blog">
                                                    <h2 class="section-title">📝 Latest Posts</h2>
                                                    <div class="blog-grid">
                                                        ${blogHTML}
                                                    </div>
                                                </div>

                                                <div class="container" id="gallery">
                                                    <h2 class="section-title">📸 Gallery</h2>
                                                    <div class="gallery-grid">
                                                        ${galleryHTML}
                                                    </div>
                                                </div>

                                                ${adsByLocation['content_bottom'] ? `<div class="ad-content">${adsByLocation['content_bottom']}</div>` : ''}
                                                ${adsByLocation['footer'] ? `<div class="ad-footer">${adsByLocation['footer']}</div>` : ''}

                                                <footer>
                                                    <div class="footer-grid">
                                                        <div class="footer-col">
                                                            <h3>About 3eesher.cloud</h3>
                                                            <p>${settings.about_text}</p>
                                                            <p>${settings.site_description}</p>
                                                        </div>
                                                        <div class="footer-col">
                                                            <h3>Privacy Policy</h3>
                                                            <p>${settings.privacy_text}</p>
                                                            <p>We only collect necessary information to provide our services. Your data is never sold to third parties. All information is stored securely.</p>
                                                        </div>
                                                        <div class="footer-col">
                                                            <h3>Terms of Service</h3>
                                                            <p>${settings.terms_text}</p>
                                                            <p>By using this platform, you agree to our terms. Content you post must comply with our guidelines. We reserve the right to remove inappropriate content.</p>
                                                        </div>
                                                        <div class="footer-col">
                                                            <h3>Contact Information</h3>
                                                            <p>📧 Email: ${settings.contact_email}</p>
                                                            <p>📞 Phone: ${settings.contact_phone}</p>
                                                            <p>💬 WhatsApp: ${settings.contact_phone}</p>
                                                            <p>📍 Location: Available worldwide</p>
                                                        </div>
                                                    </div>
                                                    <div class="footer-bottom">
                                                        <p>${settings.footer_text}</p>
                                                    </div>
                                                </footer>

                                                ${bodyEndInjection}

                                                <a href="https://wa.me/${settings.contact_phone.replace('+', '')}" class="whatsapp-btn" target="_blank">💬</a>

                                                ${req.session.userId ? '<a href="/admin" class="admin-btn">⚙️ Admin</a>' : ''}

                                                ${adsByLocation['popup'] ? `
                                                    <div id="popupAd" class="popup-ad">
                                                        <span class="popup-close" onclick="this.parentElement.style.display='none'">✖</span>
                                                        ${adsByLocation['popup']}
                                                    </div>
                                                    <script>
                                                        setTimeout(() => {
                                                            document.getElementById('popupAd').style.display = 'block';
                                                        }, 5000);
                                                    </script>
                                                ` : ''}

                                                <script>
                                                    // Carousel
                                                    document.addEventListener('DOMContentLoaded', function() {
                                                        const slides = document.querySelectorAll('.hero-slide');
                                                        const dots = document.querySelectorAll('.dot');
                                                        const prev = document.querySelector('.carousel-prev');
                                                        const next = document.querySelector('.carousel-next');
                                                        let current = 0;

                                                        function showSlide(index) {
                                                            slides.forEach(s => s.classList.remove('active'));
                                                            dots.forEach(d => d.classList.remove('active'));
                                                            slides[index].classList.add('active');
                                                            dots[index].classList.add('active');
                                                            current = index;
                                                        }

                                                        if (prev && next) {
                                                            prev.addEventListener('click', () => {
                                                                current = (current - 1 + slides.length) % slides.length;
                                                                showSlide(current);
                                                            });

                                                            next.addEventListener('click', () => {
                                                                current = (current + 1) % slides.length;
                                                                showSlide(current);
                                                            });

                                                            dots.forEach((dot, i) => {
                                                                dot.addEventListener('click', () => showSlide(i));
                                                            });

                                                            setInterval(() => {
                                                                current = (current + 1) % slides.length;
                                                                showSlide(current);
                                                            }, 5000);
                                                        }
                                                    });

                                                    // Open image
                                                    function openImage(src) {
                                                        const modal = document.createElement('div');
                                                        modal.className = 'image-modal';
                                                        modal.innerHTML = '<span class="close-modal" onclick="this.parentElement.remove()">✖</span><img src="' + src + '">';
                                                        document.body.appendChild(modal);
                                                    }

                                                    // Track video views
                                                    document.querySelectorAll('video').forEach(video => {
                                                        video.addEventListener('play', function() {
                                                            const videoId = this.closest('.video-card')?.dataset.id;
                                                            if (videoId) {
                                                                fetch('/api/view/video/' + videoId, { method: 'POST' });
                                                            }
                                                        });
                                                    });

                                                    ${customJS}
                                                </script>
                                            </body>
                                            </html>
                                        `);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// ==================== POST PAGE ====================
app.get('/post/:id', (req, res) => {
    const id = req.params.id;

    db.get(`SELECT * FROM posts WHERE id = ?`, [id], (err, post) => {
        if (!post) return res.redirect('/');

        db.run(`UPDATE posts SET views = views + 1 WHERE id = ?`, [id]);

        db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
            const settings = {};
            settingsRows.forEach(s => settings[s.key] = s.value);

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${post.title} - ${settings.site_name}</title>
                    <style>
                        body { font-family: Arial; line-height:1.8; max-width:800px; margin:0 auto; padding:20px; background: var(--bg); color: var(--text); }
                        :root { --bg: ${settings.bg_color}; --text: ${settings.text_color}; --primary: ${settings.primary_color}; }
                        h1 { color: var(--primary); }
                        .meta { color: #a0aec0; margin:20px 0; }
                        img { max-width:100%; border-radius:8px; }
                        .back { display:inline-block; margin-top:30px; color: var(--primary); text-decoration:none; }
                    </style>
                </head>
                <body>
                    <a href="/" class="back">← Back</a>
                    <h1>${post.title}</h1>
                    <div class="meta">${new Date(post.created_date).toLocaleDateString()} • 👁️ ${post.views}</div>
                    ${post.image ? `<img src="${post.image}" alt="${post.title}">` : ''}
                    <div>${post.content}</div>
                </body>
                </html>
            `);
        });
    });
});

// ==================== DOWNLOAD VIDEO ====================
app.get('/download/video/:id', (req, res) => {
    const id = req.params.id;

    db.get(`SELECT filename, title FROM videos WHERE id = ?`, [id], (err, video) => {
        if (video) {
            db.run(`UPDATE videos SET downloads = downloads + 1, views = views + 1 WHERE id = ?`, [id]);
            
            if (video.filename.startsWith('http')) {
                return res.redirect(video.filename);
            }
            
            const filePath = path.join(UPLOADS_FOLDER, video.filename);
            if (fs.existsSync(filePath)) {
                res.download(filePath, video.title + '.mp4');
            } else {
                res.redirect(video.filename);
            }
        } else {
            res.redirect('/');
        }
    });
});

// ==================== TRACK VIEW ====================
app.post('/api/view/video/:id', (req, res) => {
    db.run(`UPDATE videos SET views = views + 1 WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// ==================== LOGIN - ONLY ADMIN ====================
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login - 3eesher.cloud</title>
            <style>
                body {
                    font-family: Arial;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .login-box {
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    width: 350px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                }
                h2 { text-align: center; color: #333; margin-bottom: 30px; }
                input {
                    width: 100%;
                    padding: 12px;
                    margin: 10px 0;
                    border: 2px solid #e2e8f0;
                    border-radius: 5px;
                }
                button {
                    width: 100%;
                    padding: 14px;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }
                .note {
                    text-align: center;
                    margin-top: 20px;
                    color: #666;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>🔐 Admin Login</h2>
                <form action="/login" method="POST">
                    <input type="text" name="username" placeholder="Username" value="admin" required>
                    <input type="password" name="password" placeholder="Password" value="admin123" required>
                    <button type="submit">Login</button>
                </form>
                <div class="note">Only admin can login. Use: admin / admin123</div>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            res.redirect('/admin');
        } else {
            res.send('Invalid credentials. <a href="/login">Try again</a>');
        }
    });
});

// ==================== ADMIN PANEL ====================
app.get('/admin', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.get(`SELECT * FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (!user || user.role !== 'super_admin') return res.redirect('/');

        db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
            const settings = {};
            settingsRows.forEach(s => settings[s.key] = s.value);

            db.all(`SELECT * FROM videos ORDER BY created_date DESC`, [], (err, videos) => {
                db.all(`SELECT * FROM placeholders ORDER BY display_order`, [], (err, placeholders) => {
                    db.all(`SELECT * FROM posts ORDER BY created_date DESC`, [], (err, posts) => {
                        db.all(`SELECT * FROM gallery ORDER BY created_date DESC`, [], (err, gallery) => {
                            db.all(`SELECT * FROM affiliate_stores ORDER BY display_order`, [], (err, stores) => {
                                db.all(`SELECT * FROM money_links ORDER BY display_order`, [], (err, moneyLinks) => {
                                    db.all(`SELECT * FROM ad_placements`, [], (err, ads) => {
                                        db.all(`SELECT * FROM injections`, [], (err, injections) => {

                                            res.send(`
                                                <!DOCTYPE html>
                                                <html>
                                                <head>
                                                    <title>Admin - ${settings.site_name}</title>
                                                    <style>
                                                        * { margin:0; padding:0; box-sizing:border-box; }
                                                        body { font-family: Arial; background: #0f1117; color: #e2e8f0; padding: 20px; }
                                                        .container { max-width: 1400px; margin: 0 auto; }
                                                        h1 { color: #2563eb; margin-bottom: 20px; }
                                                        .header {
                                                            display: flex;
                                                            justify-content: space-between;
                                                            align-items: center;
                                                            margin-bottom: 30px;
                                                        }
                                                        .header a {
                                                            padding: 10px 20px;
                                                            background: #2563eb;
                                                            color: white;
                                                            text-decoration: none;
                                                            border-radius: 5px;
                                                            margin-left: 10px;
                                                        }
                                                        .tabs {
                                                            display: flex;
                                                            gap: 10px;
                                                            flex-wrap: wrap;
                                                            margin-bottom: 30px;
                                                            background: #1a1e2b;
                                                            padding: 20px;
                                                            border-radius: 10px;
                                                        }
                                                        .tab-btn {
                                                            padding: 12px 24px;
                                                            background: #2d3748;
                                                            border: none;
                                                            border-radius: 5px;
                                                            cursor: pointer;
                                                            color: white;
                                                        }
                                                        .tab-btn.active {
                                                            background: #2563eb;
                                                        }
                                                        .tab-content {
                                                            display: none;
                                                            background: #1a1e2b;
                                                            padding: 30px;
                                                            border-radius: 10px;
                                                        }
                                                        .tab-content.active { display: block; }
                                                        
                                                        .form-group { margin-bottom: 15px; }
                                                        label { display: block; margin-bottom: 5px; font-weight: bold; color: #a0aec0; }
                                                        input, textarea, select {
                                                            width: 100%;
                                                            padding: 10px;
                                                            background: #0f1117;
                                                            border: 1px solid #2d3748;
                                                            border-radius: 5px;
                                                            color: white;
                                                        }
                                                        textarea { min-height: 100px; }
                                                        button {
                                                            padding: 10px 20px;
                                                            background: #2563eb;
                                                            color: white;
                                                            border: none;
                                                            border-radius: 5px;
                                                            cursor: pointer;
                                                            margin: 5px;
                                                        }
                                                        table {
                                                            width: 100%;
                                                            border-collapse: collapse;
                                                            margin: 20px 0;
                                                        }
                                                        th, td {
                                                            padding: 12px;
                                                            text-align: left;
                                                            border-bottom: 1px solid #2d3748;
                                                        }
                                                        th { background: #2d3748; color: white; }
                                                        .grid {
                                                            display: grid;
                                                            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                                                            gap: 20px;
                                                        }
                                                        .injection-grid {
                                                            display: grid;
                                                            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                                                            gap: 20px;
                                                        }
                                                        .injection-card {
                                                            background: #0f1117;
                                                            padding: 20px;
                                                            border-radius: 10px;
                                                            border: 1px solid #2d3748;
                                                        }
                                                        .injection-card h3 {
                                                            color: #2563eb;
                                                            margin-bottom: 15px;
                                                        }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="container">
                                                        <div class="header">
                                                            <h1>⚙️ Admin Dashboard</h1>
                                                            <div>
                                                                <a href="/">View Site</a>
                                                                <a href="/logout">Logout</a>
                                                            </div>
                                                        </div>
                                                        
                                                        <div class="tabs">
                                                            <button class="tab-btn active" onclick="showTab('videos')">🎥 Videos</button>
                                                            <button class="tab-btn" onclick="showTab('placeholders')">🖼️ Placeholders</button>
                                                            <button class="tab-btn" onclick="showTab('blog')">📝 Blog</button>
                                                            <button class="tab-btn" onclick="showTab('gallery')">📸 Gallery</button>
                                                            <button class="tab-btn" onclick="showTab('stores')">🏪 Stores</button>
                                                            <button class="tab-btn" onclick="showTab('money')">💰 Money Links</button>
                                                            <button class="tab-btn" onclick="showTab('ads')">📺 Ads</button>
                                                            <button class="tab-btn" onclick="showTab('injections')">💉 Injections</button>
                                                            <button class="tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
                                                            <button class="tab-btn" onclick="showTab('password')">🔐 Password</button>
                                                        </div>
                                                        
                                                        <!-- VIDEOS TAB -->
                                                        <div id="videos-tab" class="tab-content active">
                                                            <h2>Upload Video</h2>
                                                            <form action="/admin/upload-video" method="POST" enctype="multipart/form-data">
                                                                <div class="grid">
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Title</label>
                                                                            <input type="text" name="title" required>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Description</label>
                                                                            <textarea name="description"></textarea>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Video File</label>
                                                                            <input type="file" name="video" accept="video/*" required>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Thumbnail</label>
                                                                            <input type="file" name="thumbnail" accept="image/*">
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button type="submit">Upload Video</button>
                                                            </form>
                                                            
                                                            <h2 style="margin-top:40px;">Videos</h2>
                                                            <table>
                                                                <tr>
                                                                    <th>ID</th>
                                                                    <th>Title</th>
                                                                    <th>Views</th>
                                                                    <th>Downloads</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                                ${videos.map(v => `
                                                                    <tr>
                                                                        <td>${v.id}</td>
                                                                        <td>${v.title}</td>
                                                                        <td>${v.views}</td>
                                                                        <td>${v.downloads}</td>
                                                                        <td>
                                                                            <button onclick="deleteVideo(${v.id})">Delete</button>
                                                                        </td>
                                                                    </tr>
                                                                `).join('')}
                                                            </table>
                                                        </div>
                                                        
                                                        <!-- PLACEHOLDERS TAB -->
                                                        <div id="placeholders-tab" class="tab-content">
                                                            <h2>Add Placeholder</h2>
                                                            <form action="/admin/upload-placeholder" method="POST" enctype="multipart/form-data">
                                                                <div class="grid">
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Title</label>
                                                                            <input type="text" name="title" required>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Link URL</label>
                                                                            <input type="text" name="link">
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Display Order</label>
                                                                            <input type="number" name="display_order" value="1">
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>Image File</label>
                                                                    <input type="file" name="image" accept="image/*" required>
                                                                </div>
                                                                <button type="submit">Add Placeholder</button>
                                                            </form>
                                                        </div>
                                                        
                                                        <!-- BLOG TAB -->
                                                        <div id="blog-tab" class="tab-content">
                                                            <h2>Create Blog Post</h2>
                                                            <form action="/admin/create-post" method="POST" enctype="multipart/form-data">
                                                                <div class="form-group">
                                                                    <label>Title</label>
                                                                    <input type="text" name="title" required>
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>Content</label>
                                                                    <textarea name="content" rows="10" required></textarea>
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>Image</label>
                                                                    <input type="file" name="image" accept="image/*">
                                                                </div>
                                                                <button type="submit">Publish</button>
                                                            </form>
                                                        </div>
                                                        
                                                        <!-- GALLERY TAB -->
                                                        <div id="gallery-tab" class="tab-content">
                                                            <h2>Upload to Gallery</h2>
                                                            <form action="/admin/upload-gallery" method="POST" enctype="multipart/form-data">
                                                                <div class="form-group">
                                                                    <label>Title</label>
                                                                    <input type="text" name="title">
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>Image File</label>
                                                                    <input type="file" name="image" accept="image/*" required>
                                                                </div>
                                                                <button type="submit">Upload to Gallery</button>
                                                            </form>
                                                        </div>
                                                        
                                                        <!-- STORES TAB -->
                                                        <div id="stores-tab" class="tab-content">
                                                            <h2>Add Affiliate Store</h2>
                                                            <form action="/admin/add-store" method="POST" enctype="multipart/form-data">
                                                                <div class="grid">
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Store Name</label>
                                                                            <input type="text" name="name" required>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>URL</label>
                                                                            <input type="url" name="url" required>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Description</label>
                                                                            <input type="text" name="description" required>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Button Text</label>
                                                                            <input type="text" name="button_text" value="Visit Store">
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>Store Image</label>
                                                                    <input type="file" name="image" accept="image/*" required>
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>Display Order</label>
                                                                    <input type="number" name="display_order" value="1">
                                                                </div>
                                                                <button type="submit">Add Store</button>
                                                            </form>
                                                            
                                                            <h2 style="margin-top:40px;">Stores</h2>
                                                            <table>
                                                                <tr>
                                                                    <th>Name</th>
                                                                    <th>URL</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                                ${stores.map(s => `
                                                                    <tr>
                                                                        <td>${s.name}</td>
                                                                        <td><a href="${s.url}" target="_blank">Link</a></td>
                                                                        <td>
                                                                            <button onclick="deleteStore(${s.id})">Delete</button>
                                                                        </td>
                                                                    </tr>
                                                                `).join('')}
                                                            </table>
                                                        </div>
                                                        
                                                        <!-- MONEY LINKS TAB -->
                                                        <div id="money-tab" class="tab-content">
                                                            <h2>Add Money Link</h2>
                                                            <form action="/admin/add-money-link" method="POST" enctype="multipart/form-data">
                                                                <div class="grid">
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Title</label>
                                                                            <input type="text" name="title" required>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>URL</label>
                                                                            <input type="url" name="url" required>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Description</label>
                                                                            <input type="text" name="description" required>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Category</label>
                                                                            <input type="text" name="category" required>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>Image</label>
                                                                    <input type="file" name="image" accept="image/*" required>
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>Display Order</label>
                                                                    <input type="number" name="display_order" value="1">
                                                                </div>
                                                                <button type="submit">Add Money Link</button>
                                                            </form>
                                                            
                                                            <h2 style="margin-top:40px;">Money Links</h2>
                                                            <table>
                                                                <tr>
                                                                    <th>Title</th>
                                                                    <th>URL</th>
                                                                    <th>Category</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                                ${moneyLinks.map(l => `
                                                                    <tr>
                                                                        <td>${l.title}</td>
                                                                        <td><a href="${l.url}" target="_blank">Link</a></td>
                                                                        <td>${l.category}</td>
                                                                        <td>
                                                                            <button onclick="deleteMoneyLink(${l.id})">Delete</button>
                                                                        </td>
                                                                    </tr>
                                                                `).join('')}
                                                            </table>
                                                        </div>
                                                        
                                                        <!-- ADS TAB -->
                                                        <div id="ads-tab" class="tab-content">
                                                            <h2>Ad Placements</h2>
                                                            <table>
                                                                <tr>
                                                                    <th>Name</th>
                                                                    <th>Location</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                                ${ads.map(a => `
                                                                    <tr>
                                                                        <td>${a.name}</td>
                                                                        <td>${a.location}</td>
                                                                        <td>
                                                                            <button onclick="editAd(${a.id})">Edit Code</button>
                                                                            <button onclick="toggleAd(${a.id})">Toggle</button>
                                                                        </td>
                                                                    </tr>
                                                                `).join('')}
                                                            </table>
                                                        </div>
                                                        
                                                        <!-- INJECTIONS TAB -->
                                                        <div id="injections-tab" class="tab-content">
                                                            <h2>Code Injections</h2>
                                                            <div class="injection-grid">
                                                                ${['head', 'body_start', 'body_end', 'custom_css', 'custom_js'].map(loc => {
                                                                    const inj = injections.find(i => i.location === loc);
                                                                    return `
                                                                        <div class="injection-card">
                                                                            <h3>${loc.toUpperCase()}</h3>
                                                                            <textarea id="inj-${loc}" rows="8" style="width:100%;">${inj?.code || ''}</textarea>
                                                                            <button onclick="saveInjection('${loc}')">Save</button>
                                                                        </div>
                                                                    `;
                                                                }).join('')}
                                                            </div>
                                                        </div>
                                                        
                                                        <!-- SETTINGS TAB -->
                                                        <div id="settings-tab" class="tab-content">
                                                            <h2>Settings</h2>
                                                            <form action="/admin/save-settings" method="POST">
                                                                <div class="grid">
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Site Name</label>
                                                                            <input type="text" name="site_name" value="${settings.site_name}">
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Site Title</label>
                                                                            <input type="text" name="site_title" value="${settings.site_title}">
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Description</label>
                                                                            <textarea name="site_description">${settings.site_description}</textarea>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Primary Color</label>
                                                                            <input type="color" name="primary_color" value="${settings.primary_color}">
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Secondary Color</label>
                                                                            <input type="color" name="secondary_color" value="${settings.secondary_color}">
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Background Color</label>
                                                                            <input type="color" name="bg_color" value="${settings.bg_color}">
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Text Color</label>
                                                                            <input type="color" name="text_color" value="${settings.text_color}">
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>About Text</label>
                                                                            <textarea name="about_text">${settings.about_text}</textarea>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Privacy Text</label>
                                                                            <textarea name="privacy_text">${settings.privacy_text}</textarea>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Terms Text</label>
                                                                            <textarea name="terms_text">${settings.terms_text}</textarea>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Contact Email</label>
                                                                            <input type="email" name="contact_email" value="${settings.contact_email}">
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div class="form-group">
                                                                            <label>Contact Phone</label>
                                                                            <input type="text" name="contact_phone" value="${settings.contact_phone}">
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Google Analytics</label>
                                                                            <input type="text" name="google_analytics" value="${settings.google_analytics}">
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button type="submit">Save All Settings</button>
                                                            </form>
                                                        </div>
                                                        
                                                        <!-- PASSWORD TAB -->
                                                        <div id="password-tab" class="tab-content">
                                                            <h2>Change Password</h2>
                                                            <form action="/admin/change-password" method="POST" style="max-width:400px;">
                                                                <div class="form-group">
                                                                    <label>Current Password</label>
                                                                    <input type="password" name="current_password" required>
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>New Password</label>
                                                                    <input type="password" name="new_password" required>
                                                                </div>
                                                                <div class="form-group">
                                                                    <label>Confirm New Password</label>
                                                                    <input type="password" name="confirm_password" required>
                                                                </div>
                                                                <button type="submit">Change Password</button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                    
                                                    <script>
                                                        function showTab(tabName) {
                                                            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                                                            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                                                            event.target.classList.add('active');
                                                            document.getElementById(tabName + '-tab').classList.add('active');
                                                        }
                                                        
                                                        function saveInjection(loc) {
                                                            const code = document.getElementById('inj-' + loc).value;
                                                            fetch('/admin/save-injection', {
                                                                method: 'POST',
                                                                headers: {'Content-Type': 'application/json'},
                                                                body: JSON.stringify({location: loc, code})
                                                            }).then(() => alert('Saved!'));
                                                        }
                                                        
                                                        function deleteVideo(id) {
                                                            if(confirm('Delete this video?')) {
                                                                fetch('/admin/delete-video/' + id, {method:'POST'})
                                                                    .then(() => location.reload());
                                                            }
                                                        }
                                                        
                                                        function deleteStore(id) {
                                                            if(confirm('Delete this store?')) {
                                                                fetch('/admin/delete-store/' + id, {method:'POST'})
                                                                    .then(() => location.reload());
                                                            }
                                                        }
                                                        
                                                        function deleteMoneyLink(id) {
                                                            if(confirm('Delete this money link?')) {
                                                                fetch('/admin/delete-money-link/' + id, {method:'POST'})
                                                                    .then(() => location.reload());
                                                            }
                                                        }
                                                        
                                                        function toggleAd(id) {
                                                            fetch('/admin/toggle-ad/' + id, {method:'POST'})
                                                                .then(() => location.reload());
                                                        }
                                                        
                                                        function editAd(id) {
                                                            const code = prompt('Enter new ad code:');
                                                            if(code) {
                                                                fetch('/admin/update-ad/' + id, {
                                                                    method:'POST',
                                                                    headers:{'Content-Type':'application/json'},
                                                                    body:JSON.stringify({code})
                                                                }).then(() => location.reload());
                                                            }
                                                        }
                                                    </script>
                                                </body>
                                                </html>
                                            `);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// ==================== ADMIN API ROUTES ====================

// Change password
app.post('/admin/change-password', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const { current_password, new_password, confirm_password } = req.body;
    if (new_password !== confirm_password) return res.send('Passwords do not match');

    db.get(`SELECT * FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (user && bcrypt.compareSync(current_password, user.password)) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(new_password, salt);
            db.run(`UPDATE users SET password = ? WHERE id = ?`, [hash, req.session.userId]);
            res.send('Password changed! <a href="/admin">Back</a>');
        } else {
            res.send('Current password incorrect');
        }
    });
});

// Upload video
app.post('/admin/upload-video', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const video = req.files['video']?.[0];
    const thumb = req.files['thumbnail']?.[0];

    if (video) {
        db.run(`INSERT INTO videos (title, filename, thumbnail, description, created_date) VALUES (?, ?, ?, ?, ?)`,
            [req.body.title, video.filename, thumb?.filename || 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', req.body.description, new Date().toISOString()]);
    }
    res.redirect('/admin');
});

// Delete video
app.post('/admin/delete-video/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM videos WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Upload placeholder
app.post('/admin/upload-placeholder', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO placeholders (title, filename, link, display_order, created_date) VALUES (?, ?, ?, ?, ?)`,
        [req.body.title, req.file.filename, req.body.link, req.body.display_order, new Date().toISOString()]);
    res.redirect('/admin');
});

// Create post
app.post('/admin/create-post', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO posts (title, content, image, created_date) VALUES (?, ?, ?, ?)`,
        [req.body.title, req.body.content, req.file?.filename || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', new Date().toISOString()]);
    res.redirect('/admin');
});

// Upload gallery
app.post('/admin/upload-gallery', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO gallery (title, filename, created_date) VALUES (?, ?, ?)`,
        [req.body.title || 'Gallery', req.file.filename, new Date().toISOString()]);
    res.redirect('/admin');
});

// Add store
app.post('/admin/add-store', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO affiliate_stores (name, image, url, description, button_text, display_order, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.body.name, req.file.filename, req.body.url, req.body.description, req.body.button_text, req.body.display_order, new Date().toISOString()]);
    res.redirect('/admin');
});

// Delete store
app.post('/admin/delete-store/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM affiliate_stores WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Add money link
app.post('/admin/add-money-link', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO money_links (title, url, description, category, image, display_order, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.body.title, req.body.url, req.body.description, req.body.category, req.file.filename, req.body.display_order, new Date().toISOString()]);
    res.redirect('/admin');
});

// Delete money link
app.post('/admin/delete-money-link/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM money_links WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Toggle ad
app.post('/admin/toggle-ad/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE ad_placements SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Update ad
app.post('/admin/update-ad/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE ad_placements SET code = ? WHERE id = ?`, [req.body.code, req.params.id]);
    res.json({ success: true });
});

// Save injection
app.post('/admin/save-injection', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });

    const { location, code } = req.body;
    db.run(`INSERT OR REPLACE INTO injections (location, code, created_date) VALUES (?, ?, ?)`,
        [location, code, new Date().toISOString()]);
    res.json({ success: true });
});

// Save settings
app.post('/admin/save-settings', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    Object.entries(req.body).forEach(([key, value]) => {
        db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });
    res.redirect('/admin');
});

// ==================== LOGOUT ====================
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3EESHER.CLOUD IS LIVE!`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`👤 Admin: http://localhost:${PORT}/admin`);
    console.log(`🔑 Login: admin / admin123`);
    console.log(``);
    console.log(`✅ FEATURES:`);
    console.log(`   - 30 Money-Making Websites (like allarbaa.cloud)`);
    console.log(`   - 5 Affiliate Store Cards`);
    console.log(`   - Video Gallery with working videos`);
    console.log(`   - Blog System`);
    console.log(`   - Photo Gallery`);
    console.log(`   - Full Admin Panel with 10+ tabs`);
    console.log(`   - Code Injection (5 points)`);
    console.log(`   - Ad Placements (8 locations)`);
    console.log(`   - Long About/Privacy/Terms in footer`);
    console.log(`   - WhatsApp Button with your number`);
    console.log(`   - Google Analytics: G-HD01MF5SL9`);
    console.log(`   - Dark Background with Light Text`);
});
