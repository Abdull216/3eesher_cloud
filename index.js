// ==================== COMPLETE 3EESHER.CLOUD - EVERYTHING WORKING ====================
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
    secret: '3eesher-final-working',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== DATABASE SETUP ====================
const db = new sqlite3.Database('./3eesher.db');
db.serialize(() => {
    // USERS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'viewer',
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
        featured INTEGER DEFAULT 0,
        created_date TEXT
    )`);
    
    // PLACEHOLDERS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS placeholders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        location TEXT,
        link TEXT,
        display_order INTEGER DEFAULT 0,
        created_date TEXT
    )`);
    
    // BLOG POSTS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        slug TEXT UNIQUE,
        content TEXT,
        excerpt TEXT,
        image TEXT,
        views INTEGER DEFAULT 0,
        published_date TEXT,
        created_date TEXT
    )`);
    
    // GALLERY TABLE
    db.run(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        type TEXT,
        created_date TEXT
    )`);
    
    // PAYMENT METHODS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT,
        enabled INTEGER DEFAULT 1,
        api_key TEXT,
        api_secret TEXT,
        fee_percentage REAL DEFAULT 2.9,
        created_date TEXT
    )`);
    
    // AD PLACEMENTS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS ad_placements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        location TEXT,
        code TEXT,
        enabled INTEGER DEFAULT 1,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        created_date TEXT
    )`);
    
    // CONVERSION TRACKING TABLE
    db.run(`CREATE TABLE IF NOT EXISTS conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        provider TEXT,
        pixel_code TEXT,
        enabled INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // RETARGETING PIXELS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS retargeting (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        provider TEXT,
        pixel_code TEXT,
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
    
    // PAGES TABLE
    db.run(`CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        slug TEXT UNIQUE,
        content TEXT,
        published INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // MESSAGES TABLE
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        subject TEXT,
        message TEXT,
        read INTEGER DEFAULT 0,
        created_date TEXT
    )`);
    
    // ==================== CREATE SUPER ADMIN ====================
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.run(`INSERT OR IGNORE INTO users (username, password, role, created_date) VALUES (?, ?, ?, ?)`,
        ['admin', hash, 'super_admin', new Date().toISOString()]);
    
    // ==================== DEFAULT SETTINGS ====================
    const settings = [
        ['site_name', '3eesher.cloud'],
        ['site_title', '3eesher.cloud - Share Your World'],
        ['site_description', 'A complete platform for videos, blogs, and community'],
        ['primary_color', '#667eea'],
        ['secondary_color', '#764ba2'],
        ['hero_title', 'Welcome to 3eesher.cloud'],
        ['hero_subtitle', 'Share videos, write blogs, connect with creators'],
        ['footer_text', '© 2024 3eesher.cloud. All rights reserved.'],
        ['contact_email', 'contact@3eesher.cloud'],
        ['contact_phone', '+1 (555) 123-4567'],
        ['contact_address', '123 Creator Street, Digital City, DC 12345'],
        ['currency', 'USD'],
        ['currency_symbol', '$'],
        ['google_analytics_id', 'G-HD01MF5SL9'],
        ['ads_enabled', 'true'],
        ['payments_enabled', 'true']
    ];
    
    settings.forEach(([key, value]) => {
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });
    
    // ==================== DEFAULT PAYMENT METHODS ====================
    const payments = [
        ['Stripe', 'stripe', 1, 'pk_test_...', 'sk_test_...', 2.9],
        ['PayPal', 'paypal', 1, 'client_id_...', 'secret_...', 3.5],
        ['Credit Card', 'credit_card', 1, '', '', 2.9],
        ['Bitcoin', 'crypto', 1, 'BTC', '', 1.0],
        ['Ethereum', 'crypto', 1, 'ETH', '', 1.0],
        ['USDT', 'crypto', 1, 'USDT', '', 1.0],
        ['Bank Transfer', 'bank', 1, '', '', 0]
    ];
    
    payments.forEach(([name, type, enabled, key, secret, fee]) => {
        db.run(`INSERT OR IGNORE INTO payment_methods (name, type, enabled, api_key, api_secret, fee_percentage, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, type, enabled, key, secret, fee, new Date().toISOString()]);
    });
    
    // ==================== DEFAULT AD PLACEMENTS ====================
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
    
    // ==================== DEFAULT CONVERSION PIXELS ====================
    const conversions = [
        ['Google Analytics', 'google', `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-HD01MF5SL9"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-HD01MF5SL9');
</script>`, 1],
        ['Facebook Pixel', 'facebook', '<!-- Facebook Pixel Code -->', 1]
    ];
    
    conversions.forEach(([name, provider, code, enabled]) => {
        db.run(`INSERT OR IGNORE INTO conversions (name, provider, pixel_code, enabled, created_date) VALUES (?, ?, ?, ?, ?)`,
            [name, provider, code, enabled, new Date().toISOString()]);
    });
    
    // ==================== DEFAULT INJECTIONS ====================
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
    
    // ==================== DEFAULT PAGES ====================
    const pages = [
        ['About Us', 'about', generateAboutPage(), 1],
        ['Privacy Policy', 'privacy', generatePrivacyPage(), 1],
        ['Terms of Service', 'terms', generateTermsPage(), 1],
        ['Affiliate Disclosure', 'disclosure', generateDisclosurePage(), 1],
        ['Cookie Policy', 'cookies', generateCookiePage(), 1],
        ['Contact Us', 'contact', generateContactPage(), 1],
        ['Earnings Disclaimer', 'earnings', generateEarningsPage(), 1],
        ['Refund Policy', 'refunds', generateRefundPage(), 1]
    ];
    
    pages.forEach(([title, slug, content, published]) => {
        db.run(`INSERT OR IGNORE INTO pages (title, slug, content, published, created_date) VALUES (?, ?, ?, ?, ?)`,
            [title, slug, content, published, new Date().toISOString()]);
    });
    
    // ==================== SAMPLE VIDEOS ====================
    db.get(`SELECT COUNT(*) as count FROM videos`, [], (err, row) => {
        if (row.count === 0) {
            const videos = [
                ['Getting Started with 3eesher.cloud', 'sample1.mp4', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 'Learn how to use our platform', 1250, 1],
                ['Video Creation Tips', 'sample2.mp4', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 'Professional tips for better videos', 890, 1],
                ['Behind the Scenes', 'sample3.mp4', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 'See how we create content', 567, 1],
                ['Community Spotlight', 'sample4.mp4', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'Amazing videos from our community', 432, 1]
            ];
            
            videos.forEach(([title, filename, thumb, desc, views, featured]) => {
                db.run(`INSERT INTO videos (title, filename, thumbnail, description, views, featured, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [title, filename, thumb, desc, views, featured, new Date().toISOString()]);
            });
        }
    });
    
    // ==================== SAMPLE PLACEHOLDERS ====================
    db.get(`SELECT COUNT(*) as count FROM placeholders`, [], (err, row) => {
        if (row.count === 0) {
            const placeholders = [
                ['Welcome to 3eesher.cloud', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=1200', 'hero', '/videos', 1],
                ['Create Amazing Videos', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200', 'hero', '/blog', 2],
                ['Join Our Community', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200', 'hero', '/gallery', 3],
                ['Learn from Experts', 'https://images.unsplash.com-1557804506-669a67965ba0?w=1200', 'hero', '/about', 4],
                ['Start Earning Today', 'https://images.unsplash.com-1554224155-6726b3ff858f?w=1200', 'hero', '/contact', 5]
            ];
            
            placeholders.forEach(([title, filename, location, link, order]) => {
                db.run(`INSERT INTO placeholders (title, filename, location, link, display_order, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
                    [title, filename, location, link, order, new Date().toISOString()]);
            });
        }
    });
    
    // ==================== SAMPLE BLOG POSTS ====================
    db.get(`SELECT COUNT(*) as count FROM posts`, [], (err, row) => {
        if (row.count === 0) {
            const posts = [
                ['Getting Started on 3eesher.cloud', 'getting-started', '<h1>Welcome to 3eesher.cloud!</h1><p>We\'re excited to have you here. This platform allows you to share videos, write blog posts, and connect with creators from around the world.</p>', 'Welcome to our platform!', 'https://images.unsplash.com-1519389950473?w=400', 342],
                ['10 Tips for Better Videos', 'video-tips', '<h1>10 Tips for Creating Amazing Videos</h1><p>Creating engaging video content doesn\'t have to be complicated.</p>', 'Learn how to create videos that viewers love.', 'https://images.unsplash.com-1492619375914?w=400', 267],
                ['Monetizing Your Content', 'monetization', '<h1>How to Make Money from Your Content</h1><p>There are multiple ways to monetize your content on 3eesher.cloud.</p>', 'Explore different ways to earn from your content.', 'https://images.unsplash.com-1554224155?w=400', 189]
            ];
            
            posts.forEach(([title, slug, content, excerpt, image, views]) => {
                db.run(`INSERT INTO posts (title, slug, content, excerpt, image, views, published_date, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [title, slug, content, excerpt, image, views, new Date().toISOString(), new Date().toISOString()]);
            });
        }
    });
    
    // ==================== SAMPLE GALLERY ====================
    db.get(`SELECT COUNT(*) as count FROM gallery`, [], (err, row) => {
        if (row.count === 0) {
            const images = [
                ['Team Meeting', 'https://images.unsplash.com-1522071820081?w=400', 'image'],
                ['Office Space', 'https://images.unsplash.com-1497366216548?w=400', 'image'],
                ['Creative Work', 'https://images.unsplash.com-1517245386807?w=400', 'image'],
                ['Video Shoot', 'https://images.unsplash.com-1492619375914?w=400', 'image'],
                ['Studio Setup', 'https://images.unsplash.com-1579165466741?w=400', 'image'],
                ['Team Lunch', 'https://images.unsplash.com-1517245386807?w=400', 'image'],
                ['Workshop', 'https://images.unsplash.com-1519389950473?w=400', 'image'],
                ['Conference', 'https://images.unsplash.com-1557804506?w=400', 'image']
            ];
            
            images.forEach(([title, filename, type]) => {
                db.run(`INSERT INTO gallery (title, filename, type, created_date) VALUES (?, ?, ?, ?)`,
                    [title, filename, type, new Date().toISOString()]);
            });
        }
    });
});

// ==================== PAGE CONTENT GENERATORS ====================
function generateAboutPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">About 3eesher.cloud</h1>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <h2 style="margin-bottom: 20px;">Our Mission</h2>
                <p style="font-size: 18px; line-height: 1.8;">To empower creators worldwide with the tools they need to share their stories, connect with audiences, and build sustainable careers through their content.</p>
            </div>
            <div style="margin: 40px 0;">
                <p style="line-height: 1.8; color: #666;">Founded in 2024, 3eesher.cloud was born from a simple idea: creators deserve a platform that gives them complete control. We built a system that combines powerful features with ease of use, allowing anyone to share their passion with the world.</p>
            </div>
        </div>
    `;
}

function generatePrivacyPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Privacy Policy</h1>
            <p style="color: #666; margin-bottom: 30px;">Last Updated: February 2024</p>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p>Your privacy is critically important to us. At 3eesher.cloud, we have a few fundamental principles.</p>
            </div>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h3 style="margin-bottom: 15px;">Information We Collect</h3>
                <p>When you register, we collect your name, email address, and profile information.</p>
            </div>
        </div>
    `;
}

function generateTermsPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Terms of Service</h1>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p>By accessing 3eesher.cloud, you agree to be bound by these Terms.</p>
            </div>
        </div>
    `;
}

function generateDisclosurePage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Affiliate Disclosure</h1>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p>Some of the links on this site are affiliate links. This means if you click on the link and purchase an item, we may receive an affiliate commission at no extra cost to you.</p>
            </div>
        </div>
    `;
}

function generateCookiePage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Cookie Policy</h1>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p>We use cookies to enhance your experience on 3eesher.cloud.</p>
            </div>
        </div>
    `;
}

function generateContactPage() {
    return `
        <div style="max-width: 1000px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px; text-align: center;">Contact Us</h1>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px;">
                    <h2 style="margin-bottom: 30px;">Get in Touch</h2>
                    <div style="margin-bottom: 25px;">
                        <h3>📍 Address</h3>
                        <p>123 Creator Street, Digital City, DC 12345</p>
                    </div>
                    <div style="margin-bottom: 25px;">
                        <h3>📧 Email</h3>
                        <p>contact@3eesher.cloud</p>
                    </div>
                    <div style="margin-bottom: 25px;">
                        <h3>📞 Phone</h3>
                        <p>+1 (555) 123-4567</p>
                    </div>
                </div>
                <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    <h2 style="margin-bottom: 30px;">Send Message</h2>
                    <form action="/contact/submit" method="POST">
                        <div style="margin-bottom: 20px;">
                            <input type="text" name="name" placeholder="Your Name" required style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:8px;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <input type="email" name="email" placeholder="Your Email" required style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:8px;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <input type="text" name="subject" placeholder="Subject" required style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:8px;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <textarea name="message" placeholder="Your Message" rows="5" required style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:8px;"></textarea>
                        </div>
                        <button type="submit" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border: none; border-radius: 8px; width:100%; cursor:pointer;">Send Message</button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function generateEarningsPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Earnings Disclaimer</h1>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p>Results may vary. Past performance doesn't guarantee future results.</p>
            </div>
        </div>
    `;
}

function generateRefundPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Refund Policy</h1>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p>If you're not satisfied with our paid services, you can request a full refund within 30 days of purchase.</p>
            </div>
        </div>
    `;
}

// ==================== UPLOAD SETUP ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ==================== MAIN WEBSITE ====================
app.get('/', (req, res) => {
    db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
        const settings = {};
        settingsRows.forEach(s => settings[s.key] = s.value);
        
        db.all(`SELECT * FROM videos ORDER BY featured DESC, created_date DESC`, [], (err, videos) => {
            db.all(`SELECT * FROM placeholders WHERE location = 'hero' ORDER BY display_order ASC`, [], (err, placeholders) => {
                db.all(`SELECT * FROM posts ORDER BY published_date DESC LIMIT 3`, [], (err, posts) => {
                    db.all(`SELECT * FROM gallery ORDER BY created_date DESC LIMIT 8`, [], (err, gallery) => {
                        db.all(`SELECT * FROM ad_placements WHERE enabled = 1`, [], (err, ads) => {
                            db.all(`SELECT * FROM conversions WHERE enabled = 1`, [], (err, conversions) => {
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
                                    
                                    // Conversion pixels
                                    const conversionPixels = conversions.map(c => c.pixel_code).join('\n');
                                    
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
                                    
                                    // Video HTML with play button
                                    const videoHTML = videos.map(v => `
                                        <div class="video-card">
                                            <div class="video-thumbnail">
                                                <img src="${v.thumbnail}" alt="${v.title}">
                                                <div class="video-overlay">
                                                    <button class="play-btn" onclick="playVideo('${v.filename}')">▶ Play</button>
                                                    <a href="/download/video/${v.id}" class="download-btn">⬇ Download</a>
                                                </div>
                                                <span class="video-views">👁️ ${v.views} views</span>
                                            </div>
                                            <div class="video-info">
                                                <h3>${v.title}</h3>
                                                <p>${v.description || ''}</p>
                                            </div>
                                        </div>
                                    `).join('');
                                    
                                    // Blog HTML
                                    const blogHTML = posts.map(p => `
                                        <article class="blog-card">
                                            <img src="${p.image}" alt="${p.title}" class="blog-image">
                                            <div class="blog-content">
                                                <h3><a href="/post/${p.slug}">${p.title}</a></h3>
                                                <p class="blog-meta">${new Date(p.published_date).toLocaleDateString()} | 👁️ ${p.views} views</p>
                                                <p>${p.excerpt}</p>
                                                <a href="/post/${p.slug}" class="read-more">Read More →</a>
                                            </div>
                                        </article>
                                    `).join('');
                                    
                                    // Gallery HTML
                                    const galleryHTML = gallery.map(g => `
                                        <div class="gallery-item" onclick="openImage('${g.filename}')">
                                            <img src="${g.filename}" alt="${g.title}">
                                            <div class="gallery-overlay">${g.title}</div>
                                        </div>
                                    `).join('');
                                    
                                    res.send(`
                                        <!DOCTYPE html>
                                        <html>
                                        <head>
                                            <title>${settings.site_title}</title>
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                            
                                            <!-- Google Analytics -->
                                            <script async src="https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}"></script>
                                            <script>
                                                window.dataLayer = window.dataLayer || [];
                                                function gtag(){dataLayer.push(arguments);}
                                                gtag('js', new Date());
                                                gtag('config', '${settings.google_analytics_id}');
                                            </script>
                                            
                                            <!-- HEAD INJECTION -->
                                            ${headInjection}
                                            
                                            <!-- CONVERSION PIXELS -->
                                            ${conversionPixels}
                                            
                                            <style>
                                                * { margin:0; padding:0; box-sizing:border-box; }
                                                body {
                                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                    line-height: 1.6;
                                                    color: #333;
                                                }
                                                
                                                /* HEADER */
                                                header {
                                                    background: linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color});
                                                    color: white;
                                                    padding: 1rem 0;
                                                    position: sticky;
                                                    top: 0;
                                                    z-index: 1000;
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
                                                    font-size: 2.5rem;
                                                    font-weight: 800;
                                                    color: white;
                                                    text-decoration: none;
                                                }
                                                
                                                .nav-menu {
                                                    display: flex;
                                                    gap: 20px;
                                                }
                                                
                                                .nav-menu a {
                                                    color: white;
                                                    text-decoration: none;
                                                    padding: 8px 15px;
                                                }
                                                
                                                .login-btn {
                                                    background: white;
                                                    color: ${settings.primary_color} !important;
                                                    border-radius: 5px;
                                                }
                                                
                                                /* HERO CAROUSEL */
                                                .hero-carousel {
                                                    position: relative;
                                                    height: 500px;
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
                                                    background: rgba(0,0,0,0.5);
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
                                                    font-size: 3.5rem;
                                                    margin-bottom: 1rem;
                                                }
                                                
                                                .hero-btn {
                                                    display: inline-block;
                                                    padding: 15px 40px;
                                                    background: white;
                                                    color: ${settings.primary_color};
                                                    text-decoration: none;
                                                    border-radius: 50px;
                                                    font-weight: 600;
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
                                                    background: rgba(255,255,255,0.5);
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
                                                
                                                /* CONTAINER */
                                                .container {
                                                    max-width: 1200px;
                                                    margin: 0 auto;
                                                    padding: 40px 20px;
                                                }
                                                
                                                .section-title {
                                                    font-size: 2.5rem;
                                                    margin: 40px 0 20px;
                                                    color: #333;
                                                    position: relative;
                                                    padding-bottom: 15px;
                                                }
                                                
                                                .section-title::after {
                                                    content: '';
                                                    position: absolute;
                                                    bottom: 0;
                                                    left: 0;
                                                    width: 80px;
                                                    height: 4px;
                                                    background: linear-gradient(to right, ${settings.primary_color}, ${settings.secondary_color});
                                                }
                                                
                                                /* VIDEO GRID */
                                                .video-grid {
                                                    display: grid;
                                                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                                                    gap: 30px;
                                                    margin: 40px 0;
                                                }
                                                
                                                .video-card {
                                                    background: white;
                                                    border-radius: 15px;
                                                    overflow: hidden;
                                                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                                                }
                                                
                                                .video-thumbnail {
                                                    position: relative;
                                                    height: 180px;
                                                }
                                                
                                                .video-thumbnail img {
                                                    width: 100%;
                                                    height: 100%;
                                                    object-fit: cover;
                                                }
                                                
                                                .video-overlay {
                                                    position: absolute;
                                                    top: 0;
                                                    left: 0;
                                                    right: 0;
                                                    bottom: 0;
                                                    background: rgba(0,0,0,0.7);
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;
                                                    gap: 10px;
                                                    opacity: 0;
                                                    transition: opacity 0.3s;
                                                }
                                                
                                                .video-card:hover .video-overlay {
                                                    opacity: 1;
                                                }
                                                
                                                .play-btn, .download-btn {
                                                    padding: 8px 15px;
                                                    border: none;
                                                    border-radius: 5px;
                                                    cursor: pointer;
                                                    text-decoration: none;
                                                }
                                                
                                                .play-btn {
                                                    background: ${settings.primary_color};
                                                    color: white;
                                                }
                                                
                                                .download-btn {
                                                    background: white;
                                                    color: ${settings.primary_color};
                                                }
                                                
                                                .video-views {
                                                    position: absolute;
                                                    bottom: 10px;
                                                    right: 10px;
                                                    background: rgba(0,0,0,0.7);
                                                    color: white;
                                                    padding: 4px 8px;
                                                    border-radius: 5px;
                                                }
                                                
                                                .video-info {
                                                    padding: 20px;
                                                }
                                                
                                                /* BLOG SECTION */
                                                .blog-grid {
                                                    display: grid;
                                                    gap: 30px;
                                                }
                                                
                                                .blog-card {
                                                    display: flex;
                                                    background: white;
                                                    border-radius: 15px;
                                                    overflow: hidden;
                                                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                                                }
                                                
                                                .blog-image {
                                                    width: 300px;
                                                    object-fit: cover;
                                                }
                                                
                                                .blog-content {
                                                    padding: 25px;
                                                    flex: 1;
                                                }
                                                
                                                .blog-content h3 a {
                                                    color: #333;
                                                    text-decoration: none;
                                                }
                                                
                                                .blog-meta {
                                                    color: #666;
                                                    font-size: 0.9rem;
                                                    margin: 10px 0;
                                                }
                                                
                                                .read-more {
                                                    color: ${settings.primary_color};
                                                    text-decoration: none;
                                                    font-weight: 600;
                                                }
                                                
                                                /* GALLERY */
                                                .gallery-grid {
                                                    display: grid;
                                                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                                                    gap: 20px;
                                                }
                                                
                                                .gallery-item {
                                                    position: relative;
                                                    border-radius: 10px;
                                                    overflow: hidden;
                                                    aspect-ratio: 1;
                                                    cursor: pointer;
                                                }
                                                
                                                .gallery-item img {
                                                    width: 100%;
                                                    height: 100%;
                                                    object-fit: cover;
                                                    transition: transform 0.5s;
                                                }
                                                
                                                .gallery-item:hover img {
                                                    transform: scale(1.1);
                                                }
                                                
                                                .gallery-overlay {
                                                    position: absolute;
                                                    bottom: 0;
                                                    left: 0;
                                                    right: 0;
                                                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                                                    color: white;
                                                    padding: 15px;
                                                    transform: translateY(100%);
                                                    transition: transform 0.3s;
                                                }
                                                
                                                .gallery-item:hover .gallery-overlay {
                                                    transform: translateY(0);
                                                }
                                                
                                                /* AD PLACEMENTS */
                                                .ad-header, .ad-footer {
                                                    text-align: center;
                                                    margin: 20px 0;
                                                    padding: 10px;
                                                    background: #f5f5f5;
                                                }
                                                
                                                .ad-sidebar {
                                                    margin: 20px 0;
                                                    padding: 10px;
                                                    background: #f5f5f5;
                                                }
                                                
                                                .ad-content {
                                                    margin: 20px 0;
                                                    padding: 10px;
                                                    background: #f5f5f5;
                                                }
                                                
                                                /* FOOTER */
                                                footer {
                                                    background: #1a202c;
                                                    color: white;
                                                    padding: 60px 0 20px;
                                                    margin-top: 60px;
                                                }
                                                
                                                .footer-container {
                                                    max-width: 1200px;
                                                    margin: 0 auto;
                                                    padding: 0 20px;
                                                }
                                                
                                                .footer-grid {
                                                    display: grid;
                                                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                                                    gap: 40px;
                                                    margin-bottom: 40px;
                                                }
                                                
                                                .footer-col a {
                                                    color: #a0aec0;
                                                    text-decoration: none;
                                                }
                                                
                                                .footer-bottom {
                                                    text-align: center;
                                                    padding-top: 20px;
                                                    border-top: 1px solid #2d3748;
                                                }
                                                
                                                /* ADMIN BUTTON */
                                                .admin-btn {
                                                    position: fixed;
                                                    bottom: 20px;
                                                    right: 20px;
                                                    background: linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color});
                                                    color: white;
                                                    padding: 15px 30px;
                                                    border-radius: 50px;
                                                    text-decoration: none;
                                                    z-index: 9999;
                                                }
                                                
                                                /* VIDEO MODAL */
                                                .video-modal {
                                                    position: fixed;
                                                    top: 0;
                                                    left: 0;
                                                    right: 0;
                                                    bottom: 0;
                                                    background: rgba(0,0,0,0.9);
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;
                                                    z-index: 10000;
                                                }
                                                
                                                .video-modal video {
                                                    max-width: 90%;
                                                    max-height: 90%;
                                                }
                                                
                                                .close-modal {
                                                    position: absolute;
                                                    top: 20px;
                                                    right: 30px;
                                                    color: white;
                                                    font-size: 40px;
                                                    cursor: pointer;
                                                }
                                                
                                                /* POPUP AD */
                                                .popup-ad {
                                                    position: fixed;
                                                    top: 50%;
                                                    left: 50%;
                                                    transform: translate(-50%, -50%);
                                                    background: white;
                                                    padding: 20px;
                                                    border-radius: 10px;
                                                    z-index: 10001;
                                                    display: none;
                                                }
                                                
                                                .popup-close {
                                                    float: right;
                                                    font-size: 20px;
                                                    cursor: pointer;
                                                }
                                                
                                                /* CUSTOM CSS */
                                                ${customCSS}
                                            </style>
                                        </head>
                                        <body>
                                            <!-- BODY START INJECTION -->
                                            ${bodyStartInjection}
                                            
                                            <!-- HEADER AD -->
                                            ${adsByLocation['header'] ? `<div class="ad-header">${adsByLocation['header']}</div>` : ''}
                                            
                                            <header>
                                                <div class="header-container">
                                                    <a href="/" class="logo">☁️ 3eesher.cloud</a>
                                                    <nav class="nav-menu">
                                                        <a href="#videos">Videos</a>
                                                        <a href="#blog">Blog</a>
                                                        <a href="#gallery">Gallery</a>
                                                        <a href="/about">About</a>
                                                        <a href="/privacy">Privacy</a>
                                                        <a href="/contact">Contact</a>
                                                        ${req.session.userId ? 
                                                            '<a href="/admin" class="login-btn">Dashboard</a>' : 
                                                            '<a href="/login" class="login-btn">Login</a>'
                                                        }
                                                    </nav>
                                                </div>
                                            </header>
                                            
                                            <!-- HERO CAROUSEL -->
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
                                            
                                            <!-- VIDEOS SECTION -->
                                            <div class="container" id="videos">
                                                <h2 class="section-title">🎥 Featured Videos</h2>
                                                
                                                ${adsByLocation['content_top'] ? `<div class="ad-content">${adsByLocation['content_top']}</div>` : ''}
                                                
                                                <div style="display: grid; grid-template-columns: 1fr 300px; gap: 30px;">
                                                    <div>
                                                        <div class="video-grid">
                                                            ${videoHTML}
                                                        </div>
                                                        ${adsByLocation['content_middle'] ? `<div class="ad-content">${adsByLocation['content_middle']}</div>` : ''}
                                                    </div>
                                                    
                                                    <aside>
                                                        ${adsByLocation['sidebar_top'] ? `<div class="ad-sidebar">${adsByLocation['sidebar_top']}</div>` : ''}
                                                        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                                            <h3>Quick Links</h3>
                                                            <ul style="list-style:none;">
                                                                <li><a href="/about">About Us</a></li>
                                                                <li><a href="/privacy">Privacy Policy</a></li>
                                                                <li><a href="/terms">Terms</a></li>
                                                            </ul>
                                                        </div>
                                                        ${adsByLocation['sidebar_bottom'] ? `<div class="ad-sidebar">${adsByLocation['sidebar_bottom']}</div>` : ''}
                                                    </aside>
                                                </div>
                                                
                                                ${adsByLocation['content_bottom'] ? `<div class="ad-content">${adsByLocation['content_bottom']}</div>` : ''}
                                            </div>
                                            
                                            <!-- BLOG SECTION -->
                                            <div class="container" id="blog">
                                                <h2 class="section-title">📝 Latest from Blog</h2>
                                                <div class="blog-grid">
                                                    ${blogHTML}
                                                </div>
                                            </div>
                                            
                                            <!-- GALLERY SECTION -->
                                            <div class="container" id="gallery">
                                                <h2 class="section-title">📸 Photo Gallery</h2>
                                                <div class="gallery-grid">
                                                    ${galleryHTML}
                                                </div>
                                            </div>
                                            
                                            <!-- FOOTER AD -->
                                            ${adsByLocation['footer'] ? `<div class="ad-footer">${adsByLocation['footer']}</div>` : ''}
                                            
                                            <footer>
                                                <div class="footer-container">
                                                    <div class="footer-grid">
                                                        <div class="footer-col">
                                                            <h3>About</h3>
                                                            <p style="color: #a0aec0;">${settings.site_description}</p>
                                                        </div>
                                                        <div class="footer-col">
                                                            <h3>Legal</h3>
                                                            <ul>
                                                                <li><a href="/privacy">Privacy</a></li>
                                                                <li><a href="/terms">Terms</a></li>
                                                                <li><a href="/disclosure">Disclosure</a></li>
                                                            </ul>
                                                        </div>
                                                        <div class="footer-col">
                                                            <h3>Contact</h3>
                                                            <ul>
                                                                <li>${settings.contact_email}</li>
                                                                <li>${settings.contact_phone}</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                    <div class="footer-bottom">
                                                        <p>${settings.footer_text}</p>
                                                    </div>
                                                </div>
                                            </footer>
                                            
                                            <!-- BODY END INJECTION -->
                                            ${bodyEndInjection}
                                            
                                            ${req.session.userId ? '<a href="/admin" class="admin-btn">⚙️ Admin</a>' : ''}
                                            
                                            <!-- POPUP AD -->
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
                                                
                                                // Video player
                                                function playVideo(filename) {
                                                    const modal = document.createElement('div');
                                                    modal.className = 'video-modal';
                                                    modal.innerHTML = \`
                                                        <span class="close-modal" onclick="this.parentElement.remove()">✖</span>
                                                        <video src="/uploads/\${filename}" controls autoplay></video>
                                                    \`;
                                                    document.body.appendChild(modal);
                                                }
                                                
                                                // Image viewer
                                                function openImage(src) {
                                                    const modal = document.createElement('div');
                                                    modal.className = 'video-modal';
                                                    modal.innerHTML = \`
                                                        <span class="close-modal" onclick="this.parentElement.remove()">✖</span>
                                                        <img src="\${src}" style="max-width:90%; max-height:90%; border-radius:10px;">
                                                    \`;
                                                    document.body.appendChild(modal);
                                                }
                                                
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

// ==================== PAGE ROUTES ====================
app.get('/post/:slug', (req, res) => {
    const slug = req.params.slug;
    
    db.get(`SELECT * FROM posts WHERE slug = ?`, [slug], (err, post) => {
        if (!post) return res.redirect('/');
        
        db.run(`UPDATE posts SET views = views + 1 WHERE id = ?`, [post.id]);
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>${post.title}</title></head>
            <body style="max-width:800px; margin:0 auto; padding:20px;">
                <a href="/">← Back</a>
                <h1>${post.title}</h1>
                <p>${new Date(post.published_date).toLocaleDateString()} | Views: ${post.views}</p>
                <img src="${post.image}" style="max-width:100%;">
                <div>${post.content}</div>
            </body>
            </html>
        `);
    });
});

app.get('/:page', (req, res) => {
    const slug = req.params.page;
    
    db.get(`SELECT * FROM pages WHERE slug = ? AND published = 1`, [slug], (err, page) => {
        if (!page) return res.redirect('/');
        res.send(page.content);
    });
});

// ==================== CONTACT FORM ====================
app.post('/contact/submit', (req, res) => {
    const { name, email, subject, message } = req.body;
    
    db.run(`INSERT INTO messages (name, email, subject, message, created_date) VALUES (?, ?, ?, ?, ?)`,
        [name, email, subject, message, new Date().toISOString()]);
    
    res.send('<h1>Thank You!</h1><p>Message sent.</p><a href="/">Home</a>');
});

// ==================== DOWNLOAD VIDEO ====================
app.get('/download/video/:id', (req, res) => {
    const id = req.params.id;
    
    db.get(`SELECT filename, title FROM videos WHERE id = ?`, [id], (err, video) => {
        if (video) {
            db.run(`UPDATE videos SET downloads = downloads + 1 WHERE id = ?`, [id]);
            res.redirect(video.thumbnail);
        } else {
            res.redirect('/');
        }
    });
});

// ==================== ADMIN DASHBOARD ====================
app.get('/admin', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.get(`SELECT * FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (!user || user.role !== 'super_admin') return res.redirect('/');
        
        db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
            const settings = {};
            settingsRows.forEach(s => settings[s.key] = s.value);
            
            db.all(`SELECT * FROM videos`, [], (err, videos) => {
                db.all(`SELECT * FROM placeholders`, [], (err, placeholders) => {
                    db.all(`SELECT * FROM posts`, [], (err, posts) => {
                        db.all(`SELECT * FROM gallery`, [], (err, gallery) => {
                            db.all(`SELECT * FROM payment_methods`, [], (err, payments) => {
                                db.all(`SELECT * FROM ad_placements`, [], (err, ads) => {
                                    db.all(`SELECT * FROM conversions`, [], (err, conversions) => {
                                        db.all(`SELECT * FROM retargeting`, [], (err, retargeting) => {
                                            db.all(`SELECT * FROM injections`, [], (err, injections) => {
                                                db.all(`SELECT * FROM messages`, [], (err, messages) => {
                                                    
                                                    res.send(`
                                                        <!DOCTYPE html>
                                                        <html>
                                                        <head>
                                                            <title>Super Admin - ${settings.site_name}</title>
                                                            <style>
                                                                * { margin:0; padding:0; box-sizing:border-box; }
                                                                body { font-family: Arial; background: #f5f5f5; padding: 20px; }
                                                                .container { max-width: 1400px; margin: 0 auto; }
                                                                h1 { color: #333; margin-bottom: 20px; }
                                                                .tabs {
                                                                    display: flex;
                                                                    gap: 10px;
                                                                    flex-wrap: wrap;
                                                                    margin-bottom: 20px;
                                                                    background: white;
                                                                    padding: 20px;
                                                                    border-radius: 10px;
                                                                }
                                                                .tab-btn {
                                                                    padding: 10px 20px;
                                                                    background: #f0f0f0;
                                                                    border: none;
                                                                    border-radius: 5px;
                                                                    cursor: pointer;
                                                                }
                                                                .tab-btn.active {
                                                                    background: #667eea;
                                                                    color: white;
                                                                }
                                                                .tab-content {
                                                                    display: none;
                                                                    background: white;
                                                                    padding: 30px;
                                                                    border-radius: 10px;
                                                                }
                                                                .tab-content.active { display: block; }
                                                                .form-group { margin-bottom: 15px; }
                                                                label { display: block; margin-bottom: 5px; font-weight: bold; }
                                                                input, textarea, select {
                                                                    width: 100%;
                                                                    padding: 10px;
                                                                    border: 1px solid #ddd;
                                                                    border-radius: 5px;
                                                                }
                                                                textarea { min-height: 100px; }
                                                                button {
                                                                    padding: 10px 20px;
                                                                    background: #667eea;
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
                                                                    padding: 10px;
                                                                    text-align: left;
                                                                    border-bottom: 1px solid #ddd;
                                                                }
                                                                th { background: #f5f5f5; }
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
                                                                    background: #f9f9f9;
                                                                    padding: 20px;
                                                                    border-radius: 10px;
                                                                    border: 1px solid #ddd;
                                                                }
                                                            </style>
                                                        </head>
                                                        <body>
                                                            <div class="container">
                                                                <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                                                                    <h1>⚙️ Super Admin - ${settings.site_name}</h1>
                                                                    <div>
                                                                        <a href="/" style="padding:10px 20px; background:#667eea; color:white; text-decoration:none; border-radius:5px;">View Site</a>
                                                                        <a href="/logout" style="padding:10px 20px; background:#dc3545; color:white; text-decoration:none; border-radius:5px;">Logout</a>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div class="tabs">
                                                                    <button class="tab-btn active" onclick="showTab('videos')">🎥 Videos</button>
                                                                    <button class="tab-btn" onclick="showTab('placeholders')">🖼️ Placeholders</button>
                                                                    <button class="tab-btn" onclick="showTab('blog')">📝 Blog</button>
                                                                    <button class="tab-btn" onclick="showTab('gallery')">📸 Gallery</button>
                                                                    <button class="tab-btn" onclick="showTab('payments')">💰 Payments</button>
                                                                    <button class="tab-btn" onclick="showTab('ads')">📺 Ads</button>
                                                                    <button class="tab-btn" onclick="showTab('conversions')">🎯 Conversions</button>
                                                                    <button class="tab-btn" onclick="showTab('injections')">💉 Injections</button>
                                                                    <button class="tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
                                                                    <button class="tab-btn" onclick="showTab('password')">🔐 Password</button>
                                                                    <button class="tab-btn" onclick="showTab('messages')">📨 Messages</button>
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
                                                                            <th>Featured</th>
                                                                            <th>Actions</th>
                                                                        </tr>
                                                                        ${videos.map(v => `
                                                                            <tr>
                                                                                <td>${v.id}</td>
                                                                                <td>${v.title}</td>
                                                                                <td>${v.views}</td>
                                                                                <td>${v.downloads}</td>
                                                                                <td>${v.featured ? '✅' : '❌'}</td>
                                                                                <td>
                                                                                    <button onclick="toggleVideo(${v.id})">Toggle Feature</button>
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
                                                                                    <label>Location</label>
                                                                                    <select name="location">
                                                                                        <option value="hero">Hero Carousel</option>
                                                                                    </select>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div class="form-group">
                                                                                    <label>Link URL</label>
                                                                                    <input type="text" name="link">
                                                                                </div>
                                                                                <div class="form-group">
                                                                                    <label>Order</label>
                                                                                    <input type="number" name="display_order" value="1">
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Image</label>
                                                                            <input type="file" name="image" accept="image/*" required>
                                                                        </div>
                                                                        <button type="submit">Upload</button>
                                                                    </form>
                                                                </div>
                                                                
                                                                <!-- BLOG TAB -->
                                                                <div id="blog-tab" class="tab-content">
                                                                    <h2>Create Post</h2>
                                                                    <form action="/admin/create-post" method="POST" enctype="multipart/form-data">
                                                                        <div class="form-group">
                                                                            <label>Title</label>
                                                                            <input type="text" name="title" required>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Excerpt</label>
                                                                            <textarea name="excerpt"></textarea>
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
                                                                            <label>Image</label>
                                                                            <input type="file" name="image" accept="image/*" required>
                                                                        </div>
                                                                        <button type="submit">Upload</button>
                                                                    </form>
                                                                </div>
                                                                
                                                                <!-- PAYMENTS TAB -->
                                                                <div id="payments-tab" class="tab-content">
                                                                    <h2>Payment Methods</h2>
                                                                    <table>
                                                                        <tr>
                                                                            <th>Name</th>
                                                                            <th>Type</th>
                                                                            <th>Fee</th>
                                                                            <th>Status</th>
                                                                            <th>Actions</th>
                                                                        </tr>
                                                                        ${payments.map(p => `
                                                                            <tr>
                                                                                <td>${p.name}</td>
                                                                                <td>${p.type}</td>
                                                                                <td>${p.fee_percentage}%</td>
                                                                                <td>${p.enabled ? 'Enabled' : 'Disabled'}</td>
                                                                                <td><button onclick="togglePayment(${p.id})">Toggle</button></td>
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
                                                                            <th>Impressions</th>
                                                                            <th>Clicks</th>
                                                                            <th>Revenue</th>
                                                                            <th>Status</th>
                                                                            <th>Actions</th>
                                                                        </tr>
                                                                        ${ads.map(a => `
                                                                            <tr>
                                                                                <td>${a.name}</td>
                                                                                <td>${a.location}</td>
                                                                                <td>${a.impressions}</td>
                                                                                <td>${a.clicks}</td>
                                                                                <td>$${a.revenue}</td>
                                                                                <td>${a.enabled ? 'Active' : 'Inactive'}</td>
                                                                                <td>
                                                                                    <button onclick="editAd(${a.id})">Edit</button>
                                                                                    <button onclick="toggleAd(${a.id})">Toggle</button>
                                                                                </td>
                                                                            </tr>
                                                                        `).join('')}
                                                                    </table>
                                                                    
                                                                    <h2>Add Ad</h2>
                                                                    <form action="/admin/add-ad" method="POST">
                                                                        <div class="grid">
                                                                            <div>
                                                                                <div class="form-group">
                                                                                    <label>Name</label>
                                                                                    <input type="text" name="name" required>
                                                                                </div>
                                                                                <div class="form-group">
                                                                                    <label>Location</label>
                                                                                    <select name="location">
                                                                                        <option value="header">Header</option>
                                                                                        <option value="sidebar_top">Sidebar Top</option>
                                                                                        <option value="sidebar_bottom">Sidebar Bottom</option>
                                                                                        <option value="content_top">Content Top</option>
                                                                                        <option value="content_middle">Content Middle</option>
                                                                                        <option value="content_bottom">Content Bottom</option>
                                                                                        <option value="footer">Footer</option>
                                                                                        <option value="popup">Popup</option>
                                                                                    </select>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div class="form-group">
                                                                            <label>Ad Code</label>
                                                                            <textarea name="code" rows="5" required></textarea>
                                                                        </div>
                                                                        <button type="submit">Add Ad</button>
                                                                    </form>
                                                                </div>
                                                                
                                                                <!-- CONVERSIONS TAB -->
                                                                <div id="conversions-tab" class="tab-content">
                                                                    <h2>Conversion Pixels</h2>
                                                                    <table>
                                                                        <tr>
                                                                            <th>Name</th>
                                                                            <th>Provider</th>
                                                                            <th>Status</th>
                                                                            <th>Actions</th>
                                                                        </tr>
                                                                        ${conversions.map(c => `
                                                                            <tr>
                                                                                <td>${c.name}</td>
                                                                                <td>${c.provider}</td>
                                                                                <td>${c.enabled ? 'Active' : 'Inactive'}</td>
                                                                                <td>
                                                                                    <button onclick="editConversion(${c.id})">Edit</button>
                                                                                    <button onclick="toggleConversion(${c.id})">Toggle</button>
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
                                                                    <h2>Site Settings</h2>
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
                                                                                    <label>Hero Title</label>
                                                                                    <input type="text" name="hero_title" value="${settings.hero_title}">
                                                                                </div>
                                                                                <div class="form-group">
                                                                                    <label>Hero Subtitle</label>
                                                                                    <input type="text" name="hero_subtitle" value="${settings.hero_subtitle}">
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div class="form-group">
                                                                                    <label>Contact Email</label>
                                                                                    <input type="email" name="contact_email" value="${settings.contact_email}">
                                                                                </div>
                                                                                <div class="form-group">
                                                                                    <label>Contact Phone</label>
                                                                                    <input type="text" name="contact_phone" value="${settings.contact_phone}">
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div class="form-group">
                                                                                    <label>Google Analytics ID</label>
                                                                                    <input type="text" name="google_analytics_id" value="${settings.google_analytics_id}">
                                                                                </div>
                                                                                <div class="form-group">
                                                                                    <label>Currency</label>
                                                                                    <select name="currency">
                                                                                        <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD</option>
                                                                                        <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                                                                                    </select>
                                                                                </div>
                                                                                <div class="form-group">
                                                                                    <label>Currency Symbol</label>
                                                                                    <input type="text" name="currency_symbol" value="${settings.currency_symbol}">
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <button type="submit">Save Settings</button>
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
                                                                
                                                                <!-- MESSAGES TAB -->
                                                                <div id="messages-tab" class="tab-content">
                                                                    <h2>Contact Messages</h2>
                                                                    <table>
                                                                        <tr>
                                                                            <th>Name</th>
                                                                            <th>Email</th>
                                                                            <th>Subject</th>
                                                                            <th>Date</th>
                                                                        </tr>
                                                                        ${messages.map(m => `
                                                                            <tr>
                                                                                <td>${m.name}</td>
                                                                                <td>${m.email}</td>
                                                                                <td>${m.subject}</td>
                                                                                <td>${new Date(m.created_date).toLocaleString()}</td>
                                                                            </tr>
                                                                        `).join('')}
                                                                    </table>
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
                                                                
                                                                function toggleVideo(id) {
                                                                    fetch('/admin/toggle-video/' + id, {method:'POST'}).then(()=>location.reload());
                                                                }
                                                                
                                                                function deleteVideo(id) {
                                                                    if(confirm('Delete?')) fetch('/admin/delete-video/' + id, {method:'POST'}).then(()=>location.reload());
                                                                }
                                                                
                                                                function togglePayment(id) {
                                                                    fetch('/admin/toggle-payment/' + id, {method:'POST'}).then(()=>location.reload());
                                                                }
                                                                
                                                                function toggleAd(id) {
                                                                    fetch('/admin/toggle-ad/' + id, {method:'POST'}).then(()=>location.reload());
                                                                }
                                                                
                                                                function toggleConversion(id) {
                                                                    fetch('/admin/toggle-conversion/' + id, {method:'POST'}).then(()=>location.reload());
                                                                }
                                                                
                                                                function editAd(id) {
                                                                    const code = prompt('Enter new ad code:');
                                                                    if(code) fetch('/admin/update-ad/' + id, {
                                                                        method:'POST',
                                                                        headers:{'Content-Type':'application/json'},
                                                                        body:JSON.stringify({code})
                                                                    }).then(()=>location.reload());
                                                                }
                                                                
                                                                function editConversion(id) {
                                                                    const code = prompt('Enter new pixel code:');
                                                                    if(code) fetch('/admin/update-conversion/' + id, {
                                                                        method:'POST',
                                                                        headers:{'Content-Type':'application/json'},
                                                                        body:JSON.stringify({pixel_code:code})
                                                                    }).then(()=>location.reload());
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
            const hash = bcrypt.hashSync(new_password, 10);
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

// Upload placeholder
app.post('/admin/upload-placeholder', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO placeholders (title, filename, location, link, display_order, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.body.title, req.file.filename, req.body.location, req.body.link, req.body.display_order, new Date().toISOString()]);
    res.redirect('/admin');
});

// Create post
app.post('/admin/create-post', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const slug = req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    db.run(`INSERT INTO posts (title, slug, content, excerpt, image, published_date, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.body.title, slug, req.body.content, req.body.excerpt, req.file?.filename || 'https://images.unsplash.com-1519389950473?w=400', new Date().toISOString(), new Date().toISOString()]);
    res.redirect('/admin');
});

// Upload gallery
app.post('/admin/upload-gallery', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO gallery (title, filename, type, created_date) VALUES (?, ?, ?, ?)`,
        [req.body.title || 'Gallery', req.file.filename, 'image', new Date().toISOString()]);
    res.redirect('/admin');
});

// Add ad
app.post('/admin/add-ad', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO ad_placements (name, location, code, created_date) VALUES (?, ?, ?, ?)`,
        [req.body.name, req.body.location, req.body.code, new Date().toISOString()]);
    res.redirect('/admin');
});

// Toggle video
app.post('/admin/toggle-video/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE videos SET featured = NOT featured WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Delete video
app.post('/admin/delete-video/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM videos WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Toggle payment
app.post('/admin/toggle-payment/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE payment_methods SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
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

// Toggle conversion
app.post('/admin/toggle-conversion/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE conversions SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Update conversion
app.post('/admin/update-conversion/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE conversions SET pixel_code = ? WHERE id = ?`, [req.body.pixel_code, req.params.id]);
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

// ==================== LOGIN ====================
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Login</title>
            <style>
                body {
                    font-family: Arial;
                    background: linear-gradient(135deg, #667eea, #764ba2);
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
                }
                input {
                    width: 100%;
                    padding: 10px;
                    margin: 10px 0;
                }
                button {
                    width: 100%;
                    padding: 10px;
                    background: #667eea;
                    color: white;
                    border: none;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>☁️ 3eesher.cloud Login</h2>
                <form method="POST" action="/login">
                    <input type="text" name="username" placeholder="Username" value="admin">
                    <input type="password" name="password" placeholder="Password" value="admin123">
                    <button type="submit">Login</button>
                </form>
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
            res.send('Invalid login');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3eesher.cloud is LIVE!`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`👤 Super Admin: http://localhost:${PORT}/admin`);
    console.log(`🔑 Login: admin / admin123`);
    console.log(``);
    console.log(`✅ SUPER ADMIN HAS:`);
    console.log(`   - Video Management (upload, feature, delete)`);
    console.log(`   - Placeholder Management (hero carousel)`);
    console.log(`   - Blog Publication (create, publish)`);
    console.log(`   - Gallery Management`);
    console.log(`   - Payment Methods (Stripe, PayPal, Crypto, Cards)`);
    console.log(`   - Ad Placements (8 locations)`);
    console.log(`   - Conversion Tracking (Google Analytics, Facebook Pixel)`);
    console.log(`   - Code Injection (5 injection points)`);
    console.log(`   - Site Settings (colors, text, contact)`);
    console.log(`   - Password Change`);
    console.log(`   - Contact Messages`);
    console.log(``);
    console.log(`✅ MAIN PAGE HAS:`);
    console.log(`   - Big 3eesher.cloud logo`);
    console.log(`   - Auto-playing hero carousel`);
    console.log(`   - Video gallery with play/download`);
    console.log(`   - Blog posts`);
    console.log(`   - Photo gallery`);
    console.log(`   - Ad placements everywhere`);
    console.log(`   - Your Google Analytics ID: G-HD01MF5SL9`);
});
