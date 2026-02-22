// ==================== COMPLETE 3EESHER.CLOUD - ALL FEATURES WORKING ====================
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
    secret: '3eesher-complete-v2',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// ==================== DATABASE SETUP ====================
const db = new sqlite3.Database('./3eesher.db');
db.serialize(() => {
    // ========== USERS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        bio TEXT,
        avatar TEXT,
        role TEXT DEFAULT 'user',
        approved INTEGER DEFAULT 1,
        created_date TEXT,
        last_login TEXT
    )`);

    // ========== VIDEOS TABLE (Main) ==========
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        thumbnail TEXT,
        description TEXT,
        duration TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0,
        category TEXT,
        created_date TEXT
    )`);

    // ========== USER VIDEOS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS user_videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        filename TEXT,
        thumbnail TEXT,
        description TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        created_date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // ========== BLOG POSTS TABLE (Main) ==========
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        slug TEXT UNIQUE,
        content TEXT,
        excerpt TEXT,
        image TEXT,
        category TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        published_date TEXT,
        created_date TEXT
    )`);

    // ========== USER BLOGS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS user_blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        content TEXT,
        image TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // ========== AFFILIATE STORES TABLE (NEW) ==========
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

    // ========== PLACEHOLDERS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS placeholders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        location TEXT,
        link TEXT,
        display_order INTEGER DEFAULT 0,
        created_date TEXT
    )`);

    // ========== GALLERY TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        type TEXT,
        created_date TEXT
    )`);

    // ========== COMMENTS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content_type TEXT,
        content_id INTEGER,
        comment TEXT,
        likes INTEGER DEFAULT 0,
        created_date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // ========== LIKES TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content_type TEXT,
        content_id INTEGER,
        created_date TEXT,
        UNIQUE(user_id, content_type, content_id)
    )`);

    // ========== NEWSLETTER SUBSCRIBERS ==========
    db.run(`CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        created_date TEXT
    )`);

    // ========== CATEGORIES TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        slug TEXT UNIQUE,
        icon TEXT,
        color TEXT
    )`);

    // ========== PAYMENT METHODS TABLE ==========
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

    // ========== AD PLACEMENTS TABLE ==========
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

    // ========== CONVERSION TRACKING TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        provider TEXT,
        pixel_code TEXT,
        enabled INTEGER DEFAULT 1,
        created_date TEXT
    )`);

    // ========== RETARGETING PIXELS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS retargeting (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        provider TEXT,
        pixel_code TEXT,
        enabled INTEGER DEFAULT 1,
        created_date TEXT
    )`);

    // ========== INJECTIONS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS injections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        location TEXT,
        code TEXT,
        active INTEGER DEFAULT 1,
        created_date TEXT
    )`);

    // ========== SETTINGS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // ========== MESSAGES TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        subject TEXT,
        message TEXT,
        read INTEGER DEFAULT 0,
        created_date TEXT
    )`);

    // ==================== DEFAULT DATA ====================

    // Create super admin
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, full_name, role, approved, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['admin', 'admin@3eesher.cloud', hash, 'Super Admin', 'super_admin', 1, new Date().toISOString()]);

    // Default settings
    const settings = [
        ['site_name', '3eesher.cloud'],
        ['site_title', '3eesher.cloud - Share Your World'],
        ['site_description', 'A complete platform for videos, blogs, and community'],
        ['primary_color', '#667eea'],
        ['secondary_color', '#764ba2'],
        ['hero_title', 'Welcome to 3eesher.cloud'],
        ['hero_subtitle', 'Share videos, write blogs, connect with creators'],
        ['footer_text', '© 2024 3eesher.cloud. All rights reserved.'],
        ['contact_email', 'abdullahharuna216@gmail.com'],
        ['contact_phone', '+2348080335353'],
        ['contact_address', 'Digital City'],
        ['currency', 'USD'],
        ['currency_symbol', '$'],
        ['google_analytics', 'G-HD01MF5SL9'],
        ['ads_enabled', 'true'],
        ['payments_enabled', 'true']
    ];

    settings.forEach(([key, value]) => {
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });

    // Default categories
    const categories = [
        ['Technology', 'tech', '💻', '#4299e1'],
        ['Music', 'music', '🎵', '#ed64a6'],
        ['Education', 'education', '📚', '#48bb78'],
        ['Entertainment', 'entertainment', '🎬', '#f6ad55'],
        ['Gaming', 'gaming', '🎮', '#9f7aea'],
        ['Sports', 'sports', '⚽', '#f56565']
    ];

    categories.forEach(([name, slug, icon, color]) => {
        db.run(`INSERT OR IGNORE INTO categories (name, slug, icon, color) VALUES (?, ?, ?, ?)`,
            [name, slug, icon, color]);
    });

    // Default payment methods
    const payments = [
        ['Stripe', 'stripe', 1, 'pk_test_...', 'sk_test_...', 2.9],
        ['PayPal', 'paypal', 1, 'client_id_...', 'secret_...', 3.5],
        ['Bitcoin', 'crypto', 1, 'BTC', '', 1.0],
        ['Ethereum', 'crypto', 1, 'ETH', '', 1.0],
        ['USDT', 'crypto', 1, 'USDT', '', 1.0]
    ];

    payments.forEach(([name, type, enabled, key, secret, fee]) => {
        db.run(`INSERT OR IGNORE INTO payment_methods (name, type, enabled, api_key, api_secret, fee_percentage, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, type, enabled, key, secret, fee, new Date().toISOString()]);
    });

    // Default ad placements
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

    // Default conversions
    const conversions = [
        ['Google Analytics', 'google', `<script async src="https://www.googletagmanager.com/gtag/js?id=G-HD01MF5SL9"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-HD01MF5SL9');
</script>`, 1]
    ];

    conversions.forEach(([name, provider, code, enabled]) => {
        db.run(`INSERT OR IGNORE INTO conversions (name, provider, pixel_code, enabled, created_date) VALUES (?, ?, ?, ?, ?)`,
            [name, provider, code, enabled, new Date().toISOString()]);
    });

    // Default injections
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

    // ==================== SAMPLE AFFILIATE STORES ====================
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

    // ==================== SAMPLE VIDEOS ====================
    db.get(`SELECT COUNT(*) as count FROM videos`, [], (err, row) => {
        if (row.count === 0) {
            const videos = [
                ['Getting Started with 3eesher.cloud', 'sample1.mp4', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 'Learn how to use our platform', '4:30', 1250, 45, 1],
                ['Video Creation Tips', 'sample2.mp4', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 'Professional tips for better videos', '6:15', 890, 32, 1],
                ['Behind the Scenes', 'sample3.mp4', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 'See how we create content', '3:45', 567, 28, 1],
                ['Community Spotlight', 'sample4.mp4', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'Amazing videos from our community', '5:20', 432, 19, 1]
            ];

            videos.forEach(([title, filename, thumb, desc, duration, views, likes, featured]) => {
                db.run(`INSERT INTO videos (title, filename, thumbnail, description, duration, views, likes, featured, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [title, filename, thumb, desc, duration, views, likes, featured, new Date().toISOString()]);
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
                ['Learn from Experts', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200', 'hero', '/about', 4],
                ['Start Earning Today', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200', 'hero', '/contact', 5]
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
                ['Getting Started on 3eesher.cloud', 'getting-started', '<h1>Welcome to 3eesher.cloud!</h1><p>We\'re excited to have you here. This platform allows you to share videos, write blog posts, and connect with creators from around the world.</p>', 'Welcome to our platform!', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', 'Tutorial', 342, 23],
                ['10 Tips for Better Videos', 'video-tips', '<h1>10 Tips for Creating Amazing Videos</h1><p>Creating engaging video content doesn\'t have to be complicated.</p>', 'Learn how to create videos that viewers love.', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 'Tips', 267, 18],
                ['Monetizing Your Content', 'monetization', '<h1>How to Make Money from Your Content</h1><p>There are multiple ways to monetize your content on 3eesher.cloud.</p>', 'Explore different ways to earn from your content.', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', 'Business', 189, 12]
            ];

            posts.forEach(([title, slug, content, excerpt, image, category, views, likes]) => {
                db.run(`INSERT INTO posts (title, slug, content, excerpt, image, category, views, likes, published_date, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [title, slug, content, excerpt, image, category, views, likes, new Date().toISOString(), new Date().toISOString()]);
            });
        }
    });

    // ==================== SAMPLE GALLERY ====================
    db.get(`SELECT COUNT(*) as count FROM gallery`, [], (err, row) => {
        if (row.count === 0) {
            const images = [
                ['Team Meeting', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', 'image'],
                ['Office Space', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', 'image'],
                ['Creative Work', 'https://images.unsplash.com/photo-1517245386807-9b4d0a6e4b9c?w=400', 'image'],
                ['Video Shoot', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 'image'],
                ['Studio Setup', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 'image'],
                ['Team Lunch', 'https://images.unsplash.com/photo-1517245386807-9b4d0a6e4b9c?w=400', 'image'],
                ['Workshop', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', 'image'],
                ['Conference', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', 'image']
            ];

            images.forEach(([title, filename, type]) => {
                db.run(`INSERT INTO gallery (title, filename, type, created_date) VALUES (?, ?, ?, ?)`,
                    [title, filename, type, new Date().toISOString()]);
            });
        }
    });

    // ==================== SAMPLE USERS ====================
    db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'user'`, [], (err, row) => {
        if (row.count === 0) {
            const userSalt = bcrypt.genSaltSync(10);
            const userHash = bcrypt.hashSync('user123', userSalt);
            
            const users = [
                ['john_doe', 'john@example.com', userHash, 'John Doe', 'Video creator and tech enthusiast', 'https://randomuser.me/api/portraits/men/1.jpg'],
                ['jane_smith', 'jane@example.com', userHash, 'Jane Smith', 'Musician and content creator', 'https://randomuser.me/api/portraits/women/1.jpg'],
                ['mike_wilson', 'mike@example.com', userHash, 'Mike Wilson', 'Gaming and entertainment', 'https://randomuser.me/api/portraits/men/2.jpg']
            ];

            users.forEach(([username, email, password, full_name, bio, avatar]) => {
                db.run(`INSERT INTO users (username, email, password, full_name, bio, avatar, role, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [username, email, password, full_name, bio, avatar, 'user', new Date().toISOString()]);
            });
        }
    });

    // ==================== SAMPLE USER BLOGS ====================
    db.get(`SELECT COUNT(*) as count FROM user_blogs`, [], (err, row) => {
        if (row.count === 0) {
            db.all(`SELECT id FROM users WHERE role = 'user' LIMIT 3`, [], (err, users) => {
                if (users && users.length > 0) {
                    const blogs = [
                        [users[0].id, 'My First Video', 'Just uploaded my first video! Check it out and let me know what you think.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', 45, 12],
                        [users[0].id, 'Tech Tips 2024', 'Here are my top 10 tech tips for beginners.', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 78, 23],
                        [users[1].id, 'Music Production', 'How I produce music at home with cheap equipment.', 'https://images.unsplash.com/photo-1517245386807-9b4d0a6e4b9c?w=400', 34, 8],
                        [users[2].id, 'Gaming Setup', 'My complete gaming setup tour 2024', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 56, 15]
                    ];

                    blogs.forEach(([user_id, title, content, image, views, likes]) => {
                        db.run(`INSERT INTO user_blogs (user_id, title, content, image, views, likes, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [user_id, title, content, image, views, likes, new Date().toISOString()]);
                    });
                }
            });
        }
    });

    // ==================== SAMPLE USER VIDEOS ====================
    db.get(`SELECT COUNT(*) as count FROM user_videos`, [], (err, row) => {
        if (row.count === 0) {
            db.all(`SELECT id FROM users WHERE role = 'user' LIMIT 3`, [], (err, users) => {
                if (users && users.length > 0) {
                    const videos = [
                        [users[0].id, 'Tech Review 2024', 'sample1.mp4', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 'Latest tech review', 120, 34, 5],
                        [users[0].id, 'How to Code', 'sample2.mp4', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 'Learn coding basics', 89, 23, 3],
                        [users[1].id, 'Music Cover', 'sample3.mp4', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 'Cover of popular song', 67, 18, 2],
                        [users[2].id, 'Gameplay', 'sample4.mp4', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'Epic gaming moments', 156, 45, 8]
                    ];

                    videos.forEach(([user_id, title, filename, thumbnail, description, views, likes, downloads]) => {
                        db.run(`INSERT INTO user_videos (user_id, title, filename, thumbnail, description, views, likes, downloads, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [user_id, title, filename, thumbnail, description, views, likes, downloads, new Date().toISOString()]);
                    });
                }
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
const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ==================== MAIN PAGE ====================
app.get('/', (req, res) => {
    db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
        const settings = {};
        settingsRows.forEach(s => settings[s.key] = s.value);

        db.all(`SELECT * FROM videos ORDER BY featured DESC, views DESC LIMIT 10`, [], (err, videos) => {
            db.all(`SELECT * FROM posts ORDER BY views DESC LIMIT 5`, [], (err, posts) => {
                db.all(`SELECT * FROM user_videos ORDER BY views DESC LIMIT 6`, [], (err, userVideos) => {
                    db.all(`SELECT * FROM user_blogs ORDER BY views DESC LIMIT 4`, [], (err, userBlogs) => {
                        db.all(`SELECT * FROM users WHERE role = 'user' ORDER BY id DESC LIMIT 6`, [], (err, users) => {
                            db.all(`SELECT * FROM affiliate_stores WHERE active = 1 ORDER BY display_order ASC LIMIT 5`, [], (err, stores) => {
                                db.all(`SELECT * FROM categories`, [], (err, categories) => {
                                    db.all(`SELECT * FROM placeholders WHERE location = 'hero' ORDER BY display_order ASC`, [], (err, placeholders) => {
                                        db.all(`SELECT * FROM ad_placements WHERE enabled = 1`, [], (err, ads) => {
                                            db.all(`SELECT * FROM conversions WHERE enabled = 1`, [], (err, conversions) => {
                                                db.all(`SELECT * FROM retargeting WHERE enabled = 1`, [], (err, retargeting) => {
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

                                                        // Affiliate Stores HTML
                                                        const storesHTML = stores.map(s => `
                                                            <div class="store-card">
                                                                <img src="${s.image}" alt="${s.name}" class="store-image">
                                                                <h3 class="store-name">${s.name}</h3>
                                                                <p class="store-description">${s.description}</p>
                                                                <a href="${s.url}" target="_blank" rel="nofollow" class="store-btn">${s.button_text}</a>
                                                            </div>
                                                        `).join('');

                                                        // Video HTML
                                                        const videoHTML = videos.map(v => `
                                                            <div class="video-card" data-id="${v.id}">
                                                                <div class="video-thumbnail" onclick="playVideo('${v.filename}')">
                                                                    <img src="${v.thumbnail}" alt="${v.title}">
                                                                    <span class="video-duration">${v.duration || '3:45'}</span>
                                                                </div>
                                                                <div class="video-info">
                                                                    <h3><a href="#" onclick="playVideo('${v.filename}'); return false;">${v.title}</a></h3>
                                                                    <p class="video-meta">${v.views} views • ${new Date(v.created_date).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                        `).join('');

                                                        // Blog HTML
                                                        const blogHTML = posts.map(p => `
                                                            <article class="blog-card">
                                                                ${p.image ? `<img src="${p.image}" alt="${p.title}" class="blog-image">` : ''}
                                                                <div class="blog-content">
                                                                    <h3><a href="/post/${p.id}">${p.title}</a></h3>
                                                                    <p class="blog-meta">${new Date(p.published_date).toLocaleDateString()} • ${p.views} views</p>
                                                                    <p>${p.excerpt || p.content.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                                                                    <a href="/post/${p.id}" class="read-more">Read more</a>
                                                                </div>
                                                            </article>
                                                        `).join('');

                                                        // User Videos HTML
                                                        const userVideoHTML = userVideos.map(v => `
                                                            <div class="video-card small" data-id="${v.id}">
                                                                <div class="video-thumbnail" onclick="playVideo('${v.filename}')">
                                                                    <img src="${v.thumbnail}" alt="${v.title}">
                                                                </div>
                                                                <div class="video-info">
                                                                    <h4><a href="#" onclick="playVideo('${v.filename}'); return false;">${v.title}</a></h4>
                                                                    <p class="video-meta">${v.views} views</p>
                                                                </div>
                                                            </div>
                                                        `).join('');

                                                        // Categories HTML
                                                        const categoriesHTML = categories.map(c => `
                                                            <button class="category-btn" style="background: ${c.color}20; color: ${c.color};" onclick="filterByCategory('${c.slug}')">
                                                                ${c.icon} ${c.name}
                                                            </button>
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

                                                                <!-- CONVERSION PIXELS -->
                                                                ${conversionPixels}

                                                                <style>
                                                                    * { margin: 0; padding: 0; box-sizing: border-box; }

                                                                    :root {
                                                                        --primary: ${settings.primary_color || '#667eea'};
                                                                        --secondary: ${settings.secondary_color || '#764ba2'};
                                                                        --dark: #1a202c;
                                                                        --light: #f8fafc;
                                                                        --text: #4a5568;
                                                                    }

                                                                    body {
                                                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                                        line-height: 1.6;
                                                                        color: var(--text);
                                                                        background: var(--light);
                                                                    }

                                                                    /* Header */
                                                                    header {
                                                                        background: linear-gradient(135deg, var(--primary), var(--secondary));
                                                                        color: white;
                                                                        padding: 1rem 0;
                                                                        position: sticky;
                                                                        top: 0;
                                                                        z-index: 1000;
                                                                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
                                                                        text-decoration: none;
                                                                    }

                                                                    .nav-menu {
                                                                        display: flex;
                                                                        gap: 20px;
                                                                    }

                                                                    .nav-menu a {
                                                                        color: white;
                                                                        text-decoration: none;
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
                                                                        font-size: 3rem;
                                                                        margin-bottom: 1rem;
                                                                    }

                                                                    .hero-btn {
                                                                        display: inline-block;
                                                                        padding: 12px 30px;
                                                                        background: white;
                                                                        color: var(--primary);
                                                                        text-decoration: none;
                                                                        border-radius: 5px;
                                                                        font-weight: 500;
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

                                                                    /* Main Container */
                                                                    .container {
                                                                        max-width: 1200px;
                                                                        margin: 0 auto;
                                                                        padding: 40px 20px;
                                                                    }

                                                                    .section-title {
                                                                        font-size: 2rem;
                                                                        margin: 40px 0 20px;
                                                                        color: var(--primary);
                                                                        font-weight: 600;
                                                                    }

                                                                    /* Affiliate Stores Grid */
                                                                    .stores-grid {
                                                                        display: grid;
                                                                        grid-template-columns: repeat(5, 1fr);
                                                                        gap: 20px;
                                                                        margin: 30px 0;
                                                                    }

                                                                    .store-card {
                                                                        background: white;
                                                                        border-radius: 8px;
                                                                        overflow: hidden;
                                                                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                                                                        text-align: center;
                                                                        transition: transform 0.2s;
                                                                    }

                                                                    .store-card:hover {
                                                                        transform: translateY(-4px);
                                                                        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                                                                    }

                                                                    .store-image {
                                                                        width: 100%;
                                                                        height: 120px;
                                                                        object-fit: cover;
                                                                    }

                                                                    .store-name {
                                                                        font-size: 16px;
                                                                        font-weight: 600;
                                                                        margin: 12px 0 4px;
                                                                    }

                                                                    .store-description {
                                                                        font-size: 13px;
                                                                        color: #666;
                                                                        margin-bottom: 12px;
                                                                        padding: 0 8px;
                                                                    }

                                                                    .store-btn {
                                                                        display: inline-block;
                                                                        background: var(--primary);
                                                                        color: white;
                                                                        padding: 6px 12px;
                                                                        border-radius: 4px;
                                                                        text-decoration: none;
                                                                        font-size: 13px;
                                                                        margin-bottom: 12px;
                                                                    }

                                                                    /* Video Grid */
                                                                    .video-grid {
                                                                        display: grid;
                                                                        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                                                                        gap: 20px;
                                                                        margin: 30px 0;
                                                                    }

                                                                    .video-card {
                                                                        background: white;
                                                                        border-radius: 8px;
                                                                        overflow: hidden;
                                                                        transition: transform 0.2s;
                                                                    }

                                                                    .video-card:hover {
                                                                        transform: translateY(-4px);
                                                                        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                                                                    }

                                                                    .video-card.small {
                                                                        min-width: 160px;
                                                                    }

                                                                    .video-thumbnail {
                                                                        position: relative;
                                                                        aspect-ratio: 16/9;
                                                                        background: #f0f0f0;
                                                                        cursor: pointer;
                                                                    }

                                                                    .video-thumbnail img {
                                                                        width: 100%;
                                                                        height: 100%;
                                                                        object-fit: cover;
                                                                    }

                                                                    .video-duration {
                                                                        position: absolute;
                                                                        bottom: 8px;
                                                                        right: 8px;
                                                                        background: rgba(0,0,0,0.8);
                                                                        color: white;
                                                                        padding: 2px 6px;
                                                                        border-radius: 4px;
                                                                        font-size: 12px;
                                                                    }

                                                                    .video-info {
                                                                        padding: 12px;
                                                                    }

                                                                    .video-info h3 {
                                                                        font-size: 16px;
                                                                        margin-bottom: 6px;
                                                                        font-weight: 500;
                                                                    }

                                                                    .video-info h3 a {
                                                                        color: #333;
                                                                        text-decoration: none;
                                                                    }

                                                                    .video-info h4 a {
                                                                        color: #333;
                                                                        text-decoration: none;
                                                                        font-size: 14px;
                                                                    }

                                                                    .video-meta {
                                                                        font-size: 13px;
                                                                        color: #666;
                                                                    }

                                                                    /* Blog Grid */
                                                                    .blog-grid {
                                                                        display: grid;
                                                                        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                                                                        gap: 30px;
                                                                        margin: 30px 0;
                                                                    }

                                                                    .blog-card {
                                                                        background: white;
                                                                        border-radius: 8px;
                                                                        overflow: hidden;
                                                                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                                                                    }

                                                                    .blog-image {
                                                                        width: 100%;
                                                                        aspect-ratio: 16/9;
                                                                        object-fit: cover;
                                                                    }

                                                                    .blog-content {
                                                                        padding: 20px;
                                                                    }

                                                                    .blog-content h3 {
                                                                        font-size: 18px;
                                                                        margin-bottom: 8px;
                                                                    }

                                                                    .blog-content h3 a {
                                                                        color: #333;
                                                                        text-decoration: none;
                                                                    }

                                                                    .blog-meta {
                                                                        font-size: 13px;
                                                                        color: #666;
                                                                        margin-bottom: 10px;
                                                                    }

                                                                    .read-more {
                                                                        display: inline-block;
                                                                        margin-top: 12px;
                                                                        color: var(--primary);
                                                                        text-decoration: none;
                                                                        font-size: 14px;
                                                                    }

                                                                    /* Trending Videos */
                                                                    .trending-scroll {
                                                                        display: flex;
                                                                        gap: 20px;
                                                                        overflow-x: auto;
                                                                        padding: 20px 0;
                                                                        scrollbar-width: thin;
                                                                    }

                                                                    .trending-scroll::-webkit-scrollbar {
                                                                        height: 6px;
                                                                    }

                                                                    .trending-scroll::-webkit-scrollbar-thumb {
                                                                        background: #ccc;
                                                                        border-radius: 3px;
                                                                    }

                                                                    /* Categories */
                                                                    .categories {
                                                                        display: flex;
                                                                        gap: 10px;
                                                                        flex-wrap: wrap;
                                                                        margin: 20px 0;
                                                                    }

                                                                    .category-btn {
                                                                        padding: 8px 16px;
                                                                        border: none;
                                                                        border-radius: 20px;
                                                                        cursor: pointer;
                                                                        font-size: 14px;
                                                                    }

                                                                    /* Newsletter */
                                                                    .newsletter {
                                                                        background: linear-gradient(135deg, var(--primary), var(--secondary));
                                                                        color: white;
                                                                        padding: 40px;
                                                                        border-radius: 8px;
                                                                        text-align: center;
                                                                        margin: 40px 0;
                                                                    }

                                                                    .newsletter input {
                                                                        padding: 12px;
                                                                        width: 300px;
                                                                        border: none;
                                                                        border-radius: 4px;
                                                                        margin-right: 10px;
                                                                    }

                                                                    .newsletter button {
                                                                        padding: 12px 30px;
                                                                        background: white;
                                                                        color: var(--primary);
                                                                        border: none;
                                                                        border-radius: 4px;
                                                                        cursor: pointer;
                                                                    }

                                                                    /* Footer */
                                                                    footer {
                                                                        background: var(--dark);
                                                                        color: white;
                                                                        padding: 60px 0 20px;
                                                                        margin-top: 60px;
                                                                    }

                                                                    .footer-grid {
                                                                        max-width: 1200px;
                                                                        margin: 0 auto;
                                                                        padding: 0 20px;
                                                                        display: grid;
                                                                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                                                                        gap: 40px;
                                                                    }

                                                                    .footer-col h3 {
                                                                        color: var(--primary);
                                                                        margin-bottom: 15px;
                                                                    }

                                                                    .footer-col a {
                                                                        color: #a0aec0;
                                                                        text-decoration: none;
                                                                        display: block;
                                                                        margin-bottom: 8px;
                                                                    }

                                                                    .footer-col p {
                                                                        color: #a0aec0;
                                                                        margin-bottom: 8px;
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
                                                                        text-decoration: none;
                                                                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                                                        z-index: 9999;
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
                                                                        text-decoration: none;
                                                                        z-index: 9999;
                                                                    }

                                                                    /* Video Modal */
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

                                                                    /* Responsive */
                                                                    @media (max-width: 768px) {
                                                                        .hero-content h1 { font-size: 2rem; }
                                                                        .stores-grid { grid-template-columns: repeat(2, 1fr); }
                                                                        .video-grid { grid-template-columns: 1fr; }
                                                                        .blog-grid { grid-template-columns: 1fr; }
                                                                        .newsletter input { width: 100%; margin-bottom: 10px; }
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
                                                                            <a href="#videos">Videos</a>
                                                                            <a href="#blog">Blog</a>
                                                                            <a href="#stores">Stores</a>
                                                                            ${req.session.userId ? 
                                                                                '<a href="/profile">👤 Profile</a>' : 
                                                                                '<a href="/login" class="login-btn">Login</a>'
                                                                            }
                                                                        </nav>
                                                                    </div>
                                                                </header>

                                                                <div class="hero-carousel">
                                                                    ${placeholderHTML || '<div class="hero-slide active" style="background: linear-gradient(135deg, var(--primary), var(--secondary));"><div class="hero-content"><h1>Welcome to 3eesher.cloud</h1></div></div>'}
                                                                    <div class="carousel-nav">
                                                                        <button class="carousel-prev">❮</button>
                                                                        <button class="carousel-next">❯</button>
                                                                    </div>
                                                                    <div class="carousel-dots">
                                                                        ${placeholders.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
                                                                    </div>
                                                                </div>

                                                                <div class="container" id="stores">
                                                                    <h2 class="section-title">🏪 Featured Stores</h2>
                                                                    ${adsByLocation['content_top'] ? `<div class="ad-content">${adsByLocation['content_top']}</div>` : ''}
                                                                    
                                                                    <div class="stores-grid">
                                                                        ${storesHTML}
                                                                    </div>
                                                                </div>

                                                                <div class="container" id="videos">
                                                                    <h2 class="section-title">🎥 Featured Videos</h2>
                                                                    
                                                                    <div class="video-grid">
                                                                        ${videoHTML}
                                                                    </div>
                                                                </div>

                                                                <div class="container">
                                                                    <h2 class="section-title">🔥 Trending Videos</h2>
                                                                    <div class="trending-scroll">
                                                                        ${userVideoHTML}
                                                                    </div>
                                                                </div>

                                                                <div class="container" id="blog">
                                                                    <h2 class="section-title">📝 Latest Blog Posts</h2>
                                                                    <div class="blog-grid">
                                                                        ${blogHTML}
                                                                    </div>
                                                                </div>

                                                                <div class="container">
                                                                    <div class="newsletter">
                                                                        <h2>📧 Subscribe to Newsletter</h2>
                                                                        <p>Get updates on new videos and blog posts</p>
                                                                        <input type="email" id="newsletterEmail" placeholder="Your email">
                                                                        <button onclick="subscribe()">Subscribe</button>
                                                                    </div>
                                                                </div>

                                                                ${adsByLocation['content_bottom'] ? `<div class="ad-content">${adsByLocation['content_bottom']}</div>` : ''}

                                                                <footer>
                                                                    <div class="footer-grid">
                                                                        <div class="footer-col">
                                                                            <h3>About 3eesher.cloud</h3>
                                                                            <p>${settings.site_description}</p>
                                                                        </div>
                                                                        <div class="footer-col">
                                                                            <h3>Quick Links</h3>
                                                                            <a href="#" onclick="showPage('about'); return false;">About Us</a>
                                                                            <a href="#" onclick="showPage('privacy'); return false;">Privacy Policy</a>
                                                                            <a href="#" onclick="showPage('terms'); return false;">Terms of Service</a>
                                                                            <a href="#" onclick="showPage('contact'); return false;">Contact</a>
                                                                        </div>
                                                                        <div class="footer-col">
                                                                            <h3>Contact</h3>
                                                                            <p>📧 ${settings.contact_email}</p>
                                                                            <p>📞 ${settings.contact_phone}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div class="footer-bottom">
                                                                        <p>${settings.footer_text}</p>
                                                                    </div>
                                                                </footer>

                                                                ${bodyEndInjection}

                                                                <a href="https://wa.me/${settings.contact_phone.replace('+', '')}" class="whatsapp-btn" target="_blank">💬</a>

                                                                ${req.session.role === 'super_admin' ? '<a href="/admin" class="admin-btn">⚙️ Admin</a>' : ''}

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

                                                                <!-- Page Modals -->
                                                                <div id="aboutPage" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:white; z-index:10002; overflow-y:auto; padding:40px;">
                                                                    <button onclick="document.getElementById('aboutPage').style.display='none'" style="position:fixed; top:20px; right:20px; background:none; border:none; font-size:30px;">✖</button>
                                                                    <div style="max-width:800px; margin:0 auto;">
                                                                        <h1 style="color:var(--primary);">About 3eesher.cloud</h1>
                                                                        <p>3eesher.cloud is a complete platform for creators to share videos, write blogs, and connect with community.</p>
                                                                        <p>Founded in 2024, we provide tools for content creators to monetize their work and build audiences.</p>
                                                                        <p>Our platform features video hosting, blog publishing, affiliate marketing, and community engagement tools.</p>
                                                                    </div>
                                                                </div>

                                                                <div id="privacyPage" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:white; z-index:10002; overflow-y:auto; padding:40px;">
                                                                    <button onclick="document.getElementById('privacyPage').style.display='none'" style="position:fixed; top:20px; right:20px; background:none; border:none; font-size:30px;">✖</button>
                                                                    <div style="max-width:800px; margin:0 auto;">
                                                                        <h1 style="color:var(--primary);">Privacy Policy</h1>
                                                                        <p>Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.</p>
                                                                        <h3>Information We Collect</h3>
                                                                        <p>We collect information you provide directly, such as when you create an account, upload content, or contact us.</p>
                                                                        <h3>How We Use Information</h3>
                                                                        <p>We use your information to provide and improve our services, communicate with you, and ensure platform security.</p>
                                                                        <h3>Data Security</h3>
                                                                        <p>We implement reasonable security measures to protect your information from unauthorized access.</p>
                                                                    </div>
                                                                </div>

                                                                <div id="termsPage" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:white; z-index:10002; overflow-y:auto; padding:40px;">
                                                                    <button onclick="document.getElementById('termsPage').style.display='none'" style="position:fixed; top:20px; right:20px; background:none; border:none; font-size:30px;">✖</button>
                                                                    <div style="max-width:800px; margin:0 auto;">
                                                                        <h1 style="color:var(--primary);">Terms of Service</h1>
                                                                        <p>By using 3eesher.cloud, you agree to these terms.</p>
                                                                        <h3>User Responsibilities</h3>
                                                                        <p>You are responsible for all content you post and must not violate others' rights.</p>
                                                                        <h3>Content Ownership</h3>
                                                                        <p>You retain ownership of your content, but grant us license to display it on our platform.</p>
                                                                        <h3>Termination</h3>
                                                                        <p>We may terminate accounts that violate these terms.</p>
                                                                    </div>
                                                                </div>

                                                                <div id="contactPage" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:white; z-index:10002; overflow-y:auto; padding:40px;">
                                                                    <button onclick="document.getElementById('contactPage').style.display='none'" style="position:fixed; top:20px; right:20px; background:none; border:none; font-size:30px;">✖</button>
                                                                    <div style="max-width:800px; margin:0 auto;">
                                                                        <h1 style="color:var(--primary);">Contact Us</h1>
                                                                        <p>📧 Email: ${settings.contact_email}</p>
                                                                        <p>📞 Phone: ${settings.contact_phone}</p>
                                                                        <p>💬 WhatsApp: ${settings.contact_phone}</p>
                                                                    </div>
                                                                </div>

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

                                                                    // Video Player
                                                                    function playVideo(filename) {
                                                                        const modal = document.createElement('div');
                                                                        modal.className = 'video-modal';
                                                                        modal.innerHTML = '<span class="close-modal" onclick="this.parentElement.remove()">✖</span><video src="/uploads/' + filename + '" controls autoplay></video>';
                                                                        document.body.appendChild(modal);
                                                                    }

                                                                    // Newsletter
                                                                    function subscribe() {
                                                                        const email = document.getElementById('newsletterEmail').value;
                                                                        if (email) {
                                                                            fetch('/subscribe', {
                                                                                method: 'POST',
                                                                                headers: {'Content-Type': 'application/json'},
                                                                                body: JSON.stringify({email})
                                                                            }).then(() => {
                                                                                alert('Subscribed! Thank you.');
                                                                                document.getElementById('newsletterEmail').value = '';
                                                                            });
                                                                        }
                                                                    }

                                                                    // Show pages
                                                                    function showPage(page) {
                                                                        document.getElementById(page + 'Page').style.display = 'block';
                                                                    }

                                                                    // Filter by category
                                                                    function filterByCategory(category) {
                                                                        alert('Filtering by: ' + category);
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
                });
            });
        });
    });
});

// ==================== NEWSLETTER SUBSCRIPTION ====================
app.post('/subscribe', (req, res) => {
    const { email } = req.body;

    db.run(`INSERT OR IGNORE INTO subscribers (email, created_date) VALUES (?, ?)`,
        [email, new Date().toISOString()]);
    res.json({ success: true });
});

// ==================== POST PAGE ====================
app.get('/post/:id', (req, res) => {
    const id = req.params.id;

    db.get(`SELECT * FROM posts WHERE id = ?`, [id], (err, post) => {
        if (!post) return res.redirect('/');

        db.run(`UPDATE posts SET views = views + 1 WHERE id = ?`, [id]);

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${post.title} - 3eesher.cloud</title>
                <style>
                    body { font-family: Arial; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #667eea; }
                    .meta { color: #666; margin: 20px 0; }
                    img { max-width: 100%; border-radius: 8px; margin: 20px 0; }
                    .back { display: inline-block; margin-top: 30px; color: #667eea; text-decoration: none; }
                </style>
            </head>
            <body>
                <a href="/" class="back">← Back to Home</a>
                <h1>${post.title}</h1>
                <div class="meta">Published: ${new Date(post.published_date).toLocaleDateString()} | Views: ${post.views}</div>
                ${post.image ? `<img src="${post.image}" alt="${post.title}">` : ''}
                <div>${post.content}</div>
            </body>
            </html>
        `);
    });
});

// ==================== USER REGISTRATION ====================
app.get('/register', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Register - 3eesher.cloud</title>
            <style>
                body {
                    font-family: Arial;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 20px;
                }
                .register-box {
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                }
                h2 { text-align: center; color: #333; margin-bottom: 30px; }
                .form-group { margin-bottom: 20px; }
                label { display: block; margin-bottom: 5px; color: #666; font-weight: 600; }
                input, textarea {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e2e8f0;
                    border-radius: 5px;
                    font-size: 14px;
                }
                button {
                    width: 100%;
                    padding: 14px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 10px;
                }
                button:hover { background: #5a67d8; }
                .links { text-align: center; margin-top: 20px; }
                .links a { color: #667eea; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="register-box">
                <h2>📝 Create Account</h2>
                <form action="/register" method="POST" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" name="username" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" name="full_name" required>
                    </div>
                    <div class="form-group">
                        <label>Bio (Optional)</label>
                        <textarea name="bio" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Profile Picture</label>
                        <input type="file" name="avatar" accept="image/*">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" required>
                    </div>
                    <button type="submit">Register</button>
                </form>
                <div class="links">
                    Already have an account? <a href="/login">Login here</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/register', upload.single('avatar'), (req, res) => {
    const { username, email, full_name, bio, password } = req.body;
    const avatar = req.file ? req.file.filename : 'https://randomuser.me/api/portraits/lego/1.jpg';

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    db.run(`INSERT INTO users (username, email, password, full_name, bio, avatar, role, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, email, hash, full_name, bio, avatar, 'user', new Date().toISOString()],
        function(err) {
            if (err) {
                res.send('Username or email already exists. <a href="/register">Try again</a>');
            } else {
                res.send('Registration successful! <a href="/login">Login here</a>');
            }
        });
});

// ==================== USER LOGIN ====================
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Login - 3eesher.cloud</title>
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
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                }
                h2 { text-align: center; color: #333; margin-bottom: 30px; }
                .form-group { margin-bottom: 20px; }
                input {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e2e8f0;
                    border-radius: 5px;
                }
                button {
                    width: 100%;
                    padding: 14px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                }
                .links { text-align: center; margin-top: 20px; }
                .links a { color: #667eea; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>🔐 Login</h2>
                <form action="/login" method="POST">
                    <div class="form-group">
                        <input type="text" name="username" placeholder="Username or Email" required>
                    </div>
                    <div class="form-group">
                        <input type="password" name="password" placeholder="Password" required>
                    </div>
                    <button type="submit">Login</button>
                </form>
                <div class="links">
                    Don't have an account? <a href="/register">Register here</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, username], (err, user) => {
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            res.redirect('/profile');
        } else {
            res.send('Invalid credentials. <a href="/login">Try again</a>');
        }
    });
});

// ==================== USER PROFILE ====================
app.get('/profile', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.get(`SELECT * FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        db.all(`SELECT * FROM user_blogs WHERE user_id = ? ORDER BY created_date DESC`, [req.session.userId], (err, blogs) => {
            db.all(`SELECT * FROM user_videos WHERE user_id = ? ORDER BY created_date DESC`, [req.session.userId], (err, videos) => {

                const blogHTML = blogs.map(b => `
                    <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h3>${b.title}</h3>
                        <p>${b.content.substring(0, 150)}...</p>
                        <small>👁️ ${b.views} views</small>
                        <br>
                        <a href="/profile/blog/${b.id}">Read More</a>
                    </div>
                `).join('');

                const videoHTML = videos.map(v => `
                    <div style="width: 30%; margin: 1.5%; float: left; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <video src="/uploads/${v.filename}" style="width: 100%; height: 150px; object-fit: cover;" controls></video>
                        <div style="padding: 15px;">
                            <h4>${v.title}</h4>
                            <p>👁️ ${v.views}</p>
                        </div>
                    </div>
                `).join('');

                res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${user.full_name} - Profile</title>
                        <style>
                            * { margin:0; padding:0; box-sizing:border-box; }
                            body { font-family: Arial; background: #f5f5f5; }
                            .header {
                                background: linear-gradient(135deg, #667eea, #764ba2);
                                color: white;
                                padding: 40px 20px;
                                text-align: center;
                            }
                            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                            .profile-card {
                                background: white;
                                border-radius: 15px;
                                padding: 30px;
                                margin-top: -50px;
                                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                                display: flex;
                                gap: 30px;
                                align-items: center;
                            }
                            .avatar {
                                width: 120px;
                                height: 120px;
                                border-radius: 50%;
                                object-fit: cover;
                                border: 5px solid white;
                            }
                            .nav {
                                background: white;
                                padding: 15px 20px;
                                border-radius: 10px;
                                margin: 20px 0;
                                display: flex;
                                gap: 20px;
                            }
                            .nav a {
                                color: #667eea;
                                text-decoration: none;
                                padding: 8px 15px;
                            }
                            .section-title {
                                font-size: 24px;
                                margin: 40px 0 20px;
                                color: #333;
                            }
                            .clear { clear: both; }
                            .footer {
                                background: #333;
                                color: white;
                                padding: 30px;
                                text-align: center;
                                margin-top: 40px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>👤 ${user.full_name}'s Profile</h1>
                        </div>

                        <div class="container">
                            <div class="profile-card">
                                <img src="/uploads/${user.avatar}" class="avatar">
                                <div>
                                    <h2>${user.full_name}</h2>
                                    <p>@${user.username}</p>
                                    <p>${user.bio || 'No bio yet'}</p>
                                    <p>Member since: ${new Date(user.created_date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div class="nav">
                                <a href="/">🏠 Home</a>
                                <a href="/profile">👤 My Profile</a>
                                <a href="/profile/create-blog">📝 Create Blog</a>
                                <a href="/profile/upload-video">📹 Upload Video</a>
                                ${req.session.role === 'super_admin' ? '<a href="/admin" style="background:#667eea; color:white; border-radius:5px;">⚙️ Admin</a>' : ''}
                                <a href="/logout" style="color: #ff4444;">🚪 Logout</a>
                            </div>

                            <h2 class="section-title">📹 My Videos</h2>
                            ${videoHTML || '<p>No videos yet. <a href="/profile/upload-video">Upload your first video!</a></p>'}
                            <div class="clear"></div>

                            <h2 class="section-title">📝 My Blog Posts</h2>
                            ${blogHTML || '<p>No blog posts yet. <a href="/profile/create-blog">Write your first post!</a></p>'}
                        </div>

                        <div class="footer">
                            <p>© 2024 3eesher.cloud - All rights reserved</p>
                        </div>
                    </body>
                    </html>
                `);
            });
        });
    });
});

// ==================== CREATE BLOG POST ====================
app.get('/profile/create-blog', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Create Blog Post</title>
            <style>
                body { font-family: Arial; background: #f5f5f5; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
                h1 { color: #667eea; }
                .form-group { margin-bottom: 20px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input, textarea {
                    width: 100%;
                    padding: 10px;
                    border: 2px solid #e2e8f0;
                    border-radius: 5px;
                }
                textarea { min-height: 200px; }
                button {
                    padding: 12px 30px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📝 Create Blog Post</h1>
                <form action="/profile/create-blog" method="POST" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="title" required>
                    </div>
                    <div class="form-group">
                        <label>Content</label>
                        <textarea name="content" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Featured Image (optional)</label>
                        <input type="file" name="image" accept="image/*">
                    </div>
                    <button type="submit">Publish Post</button>
                    <a href="/profile" style="margin-left: 20px;">Cancel</a>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/profile/create-blog', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO user_blogs (user_id, title, content, image, created_date) VALUES (?, ?, ?, ?, ?)`,
        [req.session.userId, req.body.title, req.body.content, req.file?.filename || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', new Date().toISOString()]);
    res.redirect('/profile');
});

// ==================== UPLOAD USER VIDEO ====================
app.get('/profile/upload-video', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Upload Video</title>
            <style>
                body { font-family: Arial; background: #f5f5f5; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
                h1 { color: #667eea; }
                .form-group { margin-bottom: 20px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input, textarea {
                    width: 100%;
                    padding: 10px;
                    border: 2px solid #e2e8f0;
                    border-radius: 5px;
                }
                button {
                    padding: 12px 30px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📹 Upload Video</h1>
                <form action="/profile/upload-video" method="POST" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="title" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Video File</label>
                        <input type="file" name="video" accept="video/*" required>
                    </div>
                    <div class="form-group">
                        <label>Thumbnail (optional)</label>
                        <input type="file" name="thumbnail" accept="image/*">
                    </div>
                    <button type="submit">Upload Video</button>
                    <a href="/profile" style="margin-left: 20px;">Cancel</a>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/profile/upload-video', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const video = req.files['video']?.[0];
    const thumb = req.files['thumbnail']?.[0];

    if (video) {
        db.run(`INSERT INTO user_videos (user_id, title, filename, thumbnail, description, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.userId, req.body.title, video.filename, thumb?.filename || 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', req.body.description, new Date().toISOString()]);
    }
    res.redirect('/profile');
});

// ==================== VIEW OTHER USER PROFILES ====================
app.get('/user/:id', (req, res) => {
    const userId = req.params.id;

    db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
        if (!user) return res.redirect('/');

        db.all(`SELECT * FROM user_blogs WHERE user_id = ? ORDER BY created_date DESC`, [userId], (err, blogs) => {
            db.all(`SELECT * FROM user_videos WHERE user_id = ? ORDER BY created_date DESC`, [userId], (err, videos) => {

                const blogHTML = blogs.map(b => `
                    <div style="background: white; padding: 15px; margin-bottom: 15px; border-radius: 10px;">
                        <h3>${b.title}</h3>
                        <p>${b.content.substring(0, 100)}...</p>
                        <small>👁️ ${b.views} views</small>
                    </div>
                `).join('');

                const videoHTML = videos.map(v => `
                    <div style="width: 30%; margin: 1.5%; float: left;">
                        <video src="/uploads/${v.filename}" style="width:100%; height:150px; object-fit:cover;" controls></video>
                        <p>${v.title}</p>
                    </div>
                `).join('');

                res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${user.full_name} - User Profile</title>
                        <style>
                            body { font-family: Arial; background: #f5f5f5; }
                            .header {
                                background: linear-gradient(135deg, #667eea, #764ba2);
                                color: white;
                                padding: 40px 20px;
                                text-align: center;
                            }
                            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                            .profile-card {
                                background: white;
                                border-radius: 15px;
                                padding: 30px;
                                margin-top: -50px;
                                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                                display: flex;
                                gap: 30px;
                                align-items: center;
                            }
                            .avatar {
                                width: 100px;
                                height: 100px;
                                border-radius: 50%;
                                object-fit: cover;
                            }
                            .nav {
                                background: white;
                                padding: 15px;
                                border-radius: 10px;
                                margin: 20px 0;
                            }
                            .nav a { color: #667eea; text-decoration: none; margin-right: 20px; }
                            .clear { clear: both; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>👤 ${user.full_name}'s Profile</h1>
                        </div>

                        <div class="container">
                            <div class="profile-card">
                                <img src="/uploads/${user.avatar}" class="avatar">
                                <div>
                                    <h2>${user.full_name}</h2>
                                    <p>@${user.username}</p>
                                    <p>${user.bio || 'No bio'}</p>
                                    <p>Joined: ${new Date(user.created_date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div class="nav">
                                <a href="/">🏠 Home</a>
                                <a href="/profile">👤 My Profile</a>
                            </div>

                            <h2>📹 Videos</h2>
                            ${videoHTML || '<p>No videos yet</p>'}
                            <div class="clear"></div>

                            <h2 style="margin-top:40px;">📝 Blog Posts</h2>
                            ${blogHTML || '<p>No blog posts yet</p>'}
                        </div>
                    </body>
                    </html>
                `);
            });
        });
    });
});

// ==================== SUPER ADMIN PANEL ====================
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
                            db.all(`SELECT * FROM affiliate_stores ORDER BY display_order`, [], (err, stores) => {
                                db.all(`SELECT * FROM payment_methods`, [], (err, payments) => {
                                    db.all(`SELECT * FROM ad_placements`, [], (err, ads) => {
                                        db.all(`SELECT * FROM conversions`, [], (err, conversions) => {
                                            db.all(`SELECT * FROM retargeting`, [], (err, retargeting) => {
                                                db.all(`SELECT * FROM injections`, [], (err, injections) => {
                                                    db.all(`SELECT * FROM users`, [], (err, users) => {
                                                        db.all(`SELECT * FROM messages ORDER BY created_date DESC LIMIT 10`, [], (err, messages) => {

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
                                                                        .header {
                                                                            display: flex;
                                                                            justify-content: space-between;
                                                                            align-items: center;
                                                                            margin-bottom: 30px;
                                                                        }
                                                                        .header a {
                                                                            padding: 10px 20px;
                                                                            background: #667eea;
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
                                                                            background: white;
                                                                            padding: 20px;
                                                                            border-radius: 10px;
                                                                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                                                        }
                                                                        .tab-btn {
                                                                            padding: 12px 24px;
                                                                            background: #f0f2f5;
                                                                            border: none;
                                                                            border-radius: 5px;
                                                                            cursor: pointer;
                                                                            font-weight: 600;
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
                                                                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                                                        }
                                                                        .tab-content.active { display: block; }
                                                                        
                                                                        .grid {
                                                                            display: grid;
                                                                            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                                                                            gap: 20px;
                                                                            margin-bottom: 30px;
                                                                        }
                                                                        
                                                                        .card {
                                                                            background: #f8fafc;
                                                                            padding: 25px;
                                                                            border-radius: 10px;
                                                                            border: 1px solid #e2e8f0;
                                                                        }
                                                                        
                                                                        .form-group {
                                                                            margin-bottom: 15px;
                                                                        }
                                                                        
                                                                        label {
                                                                            display: block;
                                                                            margin-bottom: 5px;
                                                                            font-weight: 600;
                                                                            color: #4a5568;
                                                                        }
                                                                        
                                                                        input, textarea, select {
                                                                            width: 100%;
                                                                            padding: 10px;
                                                                            border: 2px solid #e2e8f0;
                                                                            border-radius: 5px;
                                                                            font-size: 14px;
                                                                        }
                                                                        
                                                                        textarea {
                                                                            min-height: 100px;
                                                                            font-family: monospace;
                                                                        }
                                                                        
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
                                                                            padding: 12px;
                                                                            text-align: left;
                                                                            border-bottom: 1px solid #e2e8f0;
                                                                        }
                                                                        
                                                                        th {
                                                                            background: #f7f9fc;
                                                                            color: #667eea;
                                                                        }
                                                                        
                                                                        .badge {
                                                                            display: inline-block;
                                                                            padding: 4px 8px;
                                                                            border-radius: 4px;
                                                                            font-size: 12px;
                                                                            font-weight: 600;
                                                                        }
                                                                        
                                                                        .badge-success {
                                                                            background: #c6f6d5;
                                                                            color: #22543d;
                                                                        }
                                                                        
                                                                        .badge-warning {
                                                                            background: #feebc8;
                                                                            color: #744210;
                                                                        }
                                                                        
                                                                        .injection-grid {
                                                                            display: grid;
                                                                            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                                                                            gap: 20px;
                                                                        }
                                                                        
                                                                        .injection-card {
                                                                            background: #f8fafc;
                                                                            border: 2px solid #e2e8f0;
                                                                            border-radius: 10px;
                                                                            padding: 20px;
                                                                        }
                                                                        
                                                                        .injection-card h3 {
                                                                            color: #667eea;
                                                                            margin-bottom: 15px;
                                                                        }
                                                                        
                                                                        .password-section {
                                                                            background: #f0f9ff;
                                                                            border: 2px solid #667eea;
                                                                            padding: 30px;
                                                                            border-radius: 10px;
                                                                            margin-bottom: 30px;
                                                                        }
                                                                    </style>
                                                                </head>
                                                                <body>
                                                                    <div class="container">
                                                                        <div class="header">
                                                                            <h1>⚙️ Super Admin - ${settings.site_name}</h1>
                                                                            <div>
                                                                                <a href="/">View Site</a>
                                                                                <a href="/logout">Logout</a>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div class="tabs">
                                                                            <button class="tab-btn active" onclick="showTab('dashboard')">📊 Dashboard</button>
                                                                            <button class="tab-btn" onclick="showTab('videos')">🎥 Videos</button>
                                                                            <button class="tab-btn" onclick="showTab('placeholders')">🖼️ Placeholders</button>
                                                                            <button class="tab-btn" onclick="showTab('blog')">📝 Blog</button>
                                                                            <button class="tab-btn" onclick="showTab('gallery')">📸 Gallery</button>
                                                                            <button class="tab-btn" onclick="showTab('stores')">🏪 Affiliate Stores</button>
                                                                            <button class="tab-btn" onclick="showTab('payments')">💰 Payments</button>
                                                                            <button class="tab-btn" onclick="showTab('ads')">📺 Ads</button>
                                                                            <button class="tab-btn" onclick="showTab('conversions')">🎯 Conversions</button>
                                                                            <button class="tab-btn" onclick="showTab('retargeting')">🔄 Retargeting</button>
                                                                            <button class="tab-btn" onclick="showTab('injections')">💉 Injections</button>
                                                                            <button class="tab-btn" onclick="showTab('messages')">📨 Messages</button>
                                                                            <button class="tab-btn" onclick="showTab('users')">👥 Users</button>
                                                                            <button class="tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
                                                                            <button class="tab-btn" onclick="showTab('password')">🔐 Password</button>
                                                                        </div>
                                                                        
                                                                        <!-- DASHBOARD TAB -->
                                                                        <div id="dashboard-tab" class="tab-content active">
                                                                            <h2>Dashboard</h2>
                                                                            <div class="grid">
                                                                                <div class="card">
                                                                                    <h3>🎥 Videos</h3>
                                                                                    <p style="font-size: 2rem;">${videos.length}</p>
                                                                                </div>
                                                                                <div class="card">
                                                                                    <h3>📝 Posts</h3>
                                                                                    <p style="font-size: 2rem;">${posts.length}</p>
                                                                                </div>
                                                                                <div class="card">
                                                                                    <h3>📸 Gallery</h3>
                                                                                    <p style="font-size: 2rem;">${gallery.length}</p>
                                                                                </div>
                                                                                <div class="card">
                                                                                    <h3>🏪 Stores</h3>
                                                                                    <p style="font-size: 2rem;">${stores.length}</p>
                                                                                </div>
                                                                                <div class="card">
                                                                                    <h3>👥 Users</h3>
                                                                                    <p style="font-size: 2rem;">${users.length}</p>
                                                                                </div>
                                                                                <div class="card">
                                                                                    <h3>📨 Messages</h3>
                                                                                    <p style="font-size: 2rem;">${messages.length}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <!-- VIDEOS TAB -->
                                                                        <div id="videos-tab" class="tab-content">
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
                                                                                        <div class="form-group">
                                                                                            <label>Duration (e.g., 3:45)</label>
                                                                                            <input type="text" name="duration" placeholder="3:45">
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
                                                                                    <th>Likes</th>
                                                                                    <th>Downloads</th>
                                                                                    <th>Featured</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                ${videos.map(v => `
                                                                                    <tr>
                                                                                        <td>${v.id}</td>
                                                                                        <td>${v.title}</td>
                                                                                        <td>${v.views}</td>
                                                                                        <td>${v.likes}</td>
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
                                                                            <h2>Add Placeholder Image</h2>
                                                                            <form action="/admin/upload-placeholder" method="POST" enctype="multipart/form-data">
                                                                                <div class="grid">
                                                                                    <div>
                                                                                        <div class="form-group">
                                                                                            <label>Title</label>
                                                                                            <input type="text" name="title" required>
                                                                                        </div>
                                                                                        <div class="form-group">
                                                                                            <label>Link URL (optional)</label>
                                                                                            <input type="text" name="link" placeholder="https://...">
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
                                                                                <button type="submit">Upload Placeholder</button>
                                                                            </form>
                                                                            
                                                                            <h2 style="margin-top:40px;">Current Placeholders</h2>
                                                                            <table>
                                                                                <tr>
                                                                                    <th>ID</th>
                                                                                    <th>Title</th>
                                                                                    <th>Order</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                ${placeholders.map(p => `
                                                                                    <tr>
                                                                                        <td>${p.id}</td>
                                                                                        <td>${p.title}</td>
                                                                                        <td>${p.display_order}</td>
                                                                                        <td>
                                                                                            <button onclick="deletePlaceholder(${p.id})">Delete</button>
                                                                                        </td>
                                                                                    </tr>
                                                                                `).join('')}
                                                                            </table>
                                                                        </div>
                                                                        
                                                                        <!-- BLOG TAB -->
                                                                        <div id="blog-tab" class="tab-content">
                                                                            <h2>Create Blog Post</h2>
                                                                            <form action="/admin/create-post" method="POST" enctype="multipart/form-data">
                                                                                <div class="grid">
                                                                                    <div>
                                                                                        <div class="form-group">
                                                                                            <label>Title</label>
                                                                                            <input type="text" name="title" required>
                                                                                        </div>
                                                                                        <div class="form-group">
                                                                                            <label>Slug (URL)</label>
                                                                                            <input type="text" name="slug" placeholder="leave empty to auto-generate">
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div class="form-group">
                                                                                            <label>Excerpt</label>
                                                                                            <textarea name="excerpt" rows="3"></textarea>
                                                                                        </div>
                                                                                        <div class="form-group">
                                                                                            <label>Featured Image</label>
                                                                                            <input type="file" name="image" accept="image/*">
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="form-group">
                                                                                    <label>Content</label>
                                                                                    <textarea name="content" rows="10" required></textarea>
                                                                                </div>
                                                                                <button type="submit">Publish Post</button>
                                                                            </form>
                                                                            
                                                                            <h2 style="margin-top:40px;">Recent Posts</h2>
                                                                            <table>
                                                                                <tr>
                                                                                    <th>ID</th>
                                                                                    <th>Title</th>
                                                                                    <th>Views</th>
                                                                                    <th>Likes</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                ${posts.map(p => `
                                                                                    <tr>
                                                                                        <td>${p.id}</td>
                                                                                        <td>${p.title}</td>
                                                                                        <td>${p.views}</td>
                                                                                        <td>${p.likes}</td>
                                                                                        <td>
                                                                                            <button onclick="deletePost(${p.id})">Delete</button>
                                                                                        </td>
                                                                                    </tr>
                                                                                `).join('')}
                                                                            </table>
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
                                                                            
                                                                            <h2 style="margin-top:40px;">Gallery</h2>
                                                                            <table>
                                                                                <tr>
                                                                                    <th>ID</th>
                                                                                    <th>Title</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                ${gallery.map(g => `
                                                                                    <tr>
                                                                                        <td>${g.id}</td>
                                                                                        <td>${g.title}</td>
                                                                                        <td>
                                                                                            <button onclick="deleteGallery(${g.id})">Delete</button>
                                                                                        </td>
                                                                                    </tr>
                                                                                `).join('')}
                                                                            </table>
                                                                        </div>
                                                                        
                                                                        <!-- AFFILIATE STORES TAB -->
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
                                                                            
                                                                            <h2 style="margin-top:40px;">Affiliate Stores</h2>
                                                                            <table>
                                                                                <tr>
                                                                                    <th>ID</th>
                                                                                    <th>Name</th>
                                                                                    <th>URL</th>
                                                                                    <th>Order</th>
                                                                                    <th>Status</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                ${stores.map(s => `
                                                                                    <tr>
                                                                                        <td>${s.id}</td>
                                                                                        <td>${s.name}</td>
                                                                                        <td><a href="${s.url}" target="_blank">Link</a></td>
                                                                                        <td>${s.display_order}</td>
                                                                                        <td><span class="badge ${s.active ? 'badge-success' : 'badge-warning'}">${s.active ? 'Active' : 'Inactive'}</span></td>
                                                                                        <td>
                                                                                            <button onclick="toggleStore(${s.id})">Toggle</button>
                                                                                            <button onclick="deleteStore(${s.id})">Delete</button>
                                                                                        </td>
                                                                                    </tr>
                                                                                `).join('')}
                                                                            </table>
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
                                                                                        <td><span class="badge ${p.enabled ? 'badge-success' : 'badge-warning'}">${p.enabled ? 'Enabled' : 'Disabled'}</span></td>
                                                                                        <td>
                                                                                            <button onclick="togglePayment(${p.id})">Toggle</button>
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
                                                                                        <td><span class="badge ${a.enabled ? 'badge-success' : 'badge-warning'}">${a.enabled ? 'Active' : 'Inactive'}</span></td>
                                                                                        <td>
                                                                                            <button onclick="editAd(${a.id})">Edit Code</button>
                                                                                            <button onclick="toggleAd(${a.id})">Toggle</button>
                                                                                        </td>
                                                                                    </tr>
                                                                                `).join('')}
                                                                            </table>
                                                                            
                                                                            <h2 style="margin-top:40px;">Add Ad Placement</h2>
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
                                                                                <button type="submit">Add Placement</button>
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
                                                                                        <td><span class="badge ${c.enabled ? 'badge-success' : 'badge-warning'}">${c.enabled ? 'Active' : 'Inactive'}</span></td>
                                                                                        <td>
                                                                                            <button onclick="editConversion(${c.id})">Edit Pixel</button>
                                                                                            <button onclick="toggleConversion(${c.id})">Toggle</button>
                                                                                        </td>
                                                                                    </tr>
                                                                                `).join('')}
                                                                            </table>
                                                                        </div>
                                                                        
                                                                        <!-- RETARGETING TAB -->
                                                                        <div id="retargeting-tab" class="tab-content">
                                                                            <h2>Retargeting Pixels</h2>
                                                                            <table>
                                                                                <tr>
                                                                                    <th>Name</th>
                                                                                    <th>Provider</th>
                                                                                    <th>Status</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                ${retargeting.map(r => `
                                                                                    <tr>
                                                                                        <td>${r.name}</td>
                                                                                        <td>${r.provider}</td>
                                                                                        <td><span class="badge ${r.enabled ? 'badge-success' : 'badge-warning'}">${r.enabled ? 'Active' : 'Inactive'}</span></td>
                                                                                        <td>
                                                                                            <button onclick="toggleRetargeting(${r.id})">Toggle</button>
                                                                                        </td>
                                                                                    </tr>
                                                                                `).join('')}
                                                                            </table>
                                                                        </div>
                                                                        
                                                                        <!-- INJECTIONS TAB -->
                                                                        <div id="injections-tab" class="tab-content">
                                                                            <h2>Code Injections (Super Admin Only)</h2>
                                                                            <div class="injection-grid">
                                                                                ${['head', 'body_start', 'body_end', 'custom_css', 'custom_js'].map(loc => {
                                                                                    const inj = injections.find(i => i.location === loc);
                                                                                    return `
                                                                                        <div class="injection-card">
                                                                                            <h3>${loc.toUpperCase().replace('_', ' ')}</h3>
                                                                                            <textarea id="inj-${loc}" rows="8" style="width:100%; font-family:monospace;">${inj?.code || ''}</textarea>
                                                                                            <button onclick="saveInjection('${loc}')">Save</button>
                                                                                        </div>
                                                                                    `;
                                                                                }).join('')}
                                                                            </div>
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
                                                                        
                                                                        <!-- USERS TAB -->
                                                                        <div id="users-tab" class="tab-content">
                                                                            <h2>Users</h2>
                                                                            <table>
                                                                                <tr>
                                                                                    <th>ID</th>
                                                                                    <th>Username</th>
                                                                                    <th>Email</th>
                                                                                    <th>Role</th>
                                                                                    <th>Actions</th>
                                                                                </tr>
                                                                                ${users.map(u => `
                                                                                    <tr>
                                                                                        <td>${u.id}</td>
                                                                                        <td>${u.username}</td>
                                                                                        <td>${u.email}</td>
                                                                                        <td>${u.role}</td>
                                                                                        <td>
                                                                                            ${u.role !== 'super_admin' ? `<button onclick="deleteUser(${u.id})">Delete</button>` : ''}
                                                                                        </td>
                                                                                    </tr>
                                                                                `).join('')}
                                                                            </table>
                                                                        </div>
                                                                        
                                                                        <!-- SETTINGS TAB -->
                                                                        <div id="settings-tab" class="tab-content">
                                                                            <h2>Site Settings</h2>
                                                                            <form action="/admin/save-settings" method="POST">
                                                                                <div class="grid">
                                                                                    <div>
                                                                                        <h3>General</h3>
                                                                                        <div class="form-group">
                                                                                            <label>Site Name</label>
                                                                                            <input type="text" name="site_name" value="${settings.site_name}">
                                                                                        </div>
                                                                                        <div class="form-group">
                                                                                            <label>Site Title</label>
                                                                                            <input type="text" name="site_title" value="${settings.site_title}">
                                                                                        </div>
                                                                                        <div class="form-group">
                                                                                            <label>Site Description</label>
                                                                                            <textarea name="site_description">${settings.site_description}</textarea>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h3>Colors</h3>
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
                                                                                        <h3>Hero</h3>
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
                                                                                        <h3>Contact</h3>
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
                                                                                        <h3>Analytics</h3>
                                                                                        <div class="form-group">
                                                                                            <label>Google Analytics ID</label>
                                                                                            <input type="text" name="google_analytics" value="${settings.google_analytics}">
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h3>Footer</h3>
                                                                                        <div class="form-group">
                                                                                            <label>Footer Text</label>
                                                                                            <input type="text" name="footer_text" value="${settings.footer_text}">
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
                                                                        
                                                                        function saveInjection(location) {
                                                                            const code = document.getElementById('inj-' + location).value;
                                                                            fetch('/admin/save-injection', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ location, code })
                                                                            }).then(() => alert('Injection saved!'));
                                                                        }
                                                                        
                                                                        function toggleVideo(id) {
                                                                            fetch('/admin/toggle-video/' + id, { method: 'POST' })
                                                                                .then(() => location.reload());
                                                                        }
                                                                        
                                                                        function deleteVideo(id) {
                                                                            if (confirm('Delete this video?')) {
                                                                                fetch('/admin/delete-video/' + id, { method: 'POST' })
                                                                                    .then(() => location.reload());
                                                                            }
                                                                        }
                                                                        
                                                                        function deletePlaceholder(id) {
                                                                            if (confirm('Delete this placeholder?')) {
                                                                                fetch('/admin/delete-placeholder/' + id, { method: 'POST' })
                                                                                    .then(() => location.reload());
                                                                            }
                                                                        }
                                                                        
                                                                        function deletePost(id) {
                                                                            if (confirm('Delete this post?')) {
                                                                                fetch('/admin/delete-post/' + id, { method: 'POST' })
                                                                                    .then(() => location.reload());
                                                                            }
                                                                        }
                                                                        
                                                                        function deleteGallery(id) {
                                                                            if (confirm('Delete this item?')) {
                                                                                fetch('/admin/delete-gallery/' + id, { method: 'POST' })
                                                                                    .then(() => location.reload());
                                                                            }
                                                                        }
                                                                        
                                                                        function toggleStore(id) {
                                                                            fetch('/admin/toggle-store/' + id, { method: 'POST' })
                                                                                .then(() => location.reload());
                                                                        }
                                                                        
                                                                        function deleteStore(id) {
                                                                            if (confirm('Delete this store?')) {
                                                                                fetch('/admin/delete-store/' + id, { method: 'POST' })
                                                                                    .then(() => location.reload());
                                                                            }
                                                                        }
                                                                        
                                                                        function togglePayment(id) {
                                                                            fetch('/admin/toggle-payment/' + id, { method: 'POST' })
                                                                                .then(() => location.reload());
                                                                        }
                                                                        
                                                                        function toggleAd(id) {
                                                                            fetch('/admin/toggle-ad/' + id, { method: 'POST' })
                                                                                .then(() => location.reload());
                                                                        }
                                                                        
                                                                        function editAd(id) {
                                                                            const code = prompt('Enter new ad code:');
                                                                            if (code) {
                                                                                fetch('/admin/update-ad/' + id, {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify({ code })
                                                                                }).then(() => location.reload());
                                                                            }
                                                                        }
                                                                        
                                                                        function toggleConversion(id) {
                                                                            fetch('/admin/toggle-conversion/' + id, { method: 'POST' })
                                                                                .then(() => location.reload());
                                                                        }
                                                                        
                                                                        function editConversion(id) {
                                                                            const code = prompt('Enter new pixel code:');
                                                                            if (code) {
                                                                                fetch('/admin/update-conversion/' + id, {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify({ pixel_code: code })
                                                                                }).then(() => location.reload());
                                                                            }
                                                                        }
                                                                        
                                                                        function toggleRetargeting(id) {
                                                                            fetch('/admin/toggle-retargeting/' + id, { method: 'POST' })
                                                                                .then(() => location.reload());
                                                                        }
                                                                        
                                                                        function deleteUser(id) {
                                                                            if (confirm('Delete this user? This will also delete all their content.')) {
                                                                                fetch('/admin/delete-user/' + id, { method: 'POST' })
                                                                                    .then(() => location.reload());
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
            res.send('Password changed successfully! <a href="/admin">Back to Admin</a>');
        } else {
            res.send('Current password is incorrect');
        }
    });
});

// Upload video
app.post('/admin/upload-video', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const videoFile = req.files['video']?.[0];
    const thumbFile = req.files['thumbnail']?.[0];

    if (videoFile) {
        db.run(`INSERT INTO videos (title, filename, thumbnail, description, duration, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
            [req.body.title, videoFile.filename, thumbFile?.filename || 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', req.body.description, req.body.duration || '3:45', new Date().toISOString()]);
    }
    res.redirect('/admin');
});

// Toggle video featured
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

// Upload placeholder
app.post('/admin/upload-placeholder', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO placeholders (title, filename, link, display_order, location, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.body.title, req.file.filename, req.body.link, req.body.display_order, 'hero', new Date().toISOString()]);
    res.redirect('/admin');
});

// Delete placeholder
app.post('/admin/delete-placeholder/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM placeholders WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Create post
app.post('/admin/create-post', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const slug = req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    db.run(`INSERT INTO posts (title, slug, content, excerpt, image, published_date, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.body.title, slug, req.body.content, req.body.excerpt, req.file?.filename || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', new Date().toISOString(), new Date().toISOString()]);
    res.redirect('/admin');
});

// Delete post
app.post('/admin/delete-post/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM posts WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Upload gallery
app.post('/admin/upload-gallery', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO gallery (title, filename, type, created_date) VALUES (?, ?, ?, ?)`,
        [req.body.title || 'Gallery Image', req.file.filename, 'image', new Date().toISOString()]);
    res.redirect('/admin');
});

// Delete gallery
app.post('/admin/delete-gallery/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM gallery WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Add affiliate store
app.post('/admin/add-store', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO affiliate_stores (name, image, url, description, button_text, display_order, active, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.body.name, req.file.filename, req.body.url, req.body.description, req.body.button_text, req.body.display_order, 1, new Date().toISOString()]);
    res.redirect('/admin');
});

// Toggle store
app.post('/admin/toggle-store/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE affiliate_stores SET active = NOT active WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Delete store
app.post('/admin/delete-store/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM affiliate_stores WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Toggle payment
app.post('/admin/toggle-payment/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE payment_methods SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Add ad
app.post('/admin/add-ad', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    db.run(`INSERT INTO ad_placements (name, location, code, created_date) VALUES (?, ?, ?, ?)`,
        [req.body.name, req.body.location, req.body.code, new Date().toISOString()]);
    res.redirect('/admin');
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

// Toggle retargeting
app.post('/admin/toggle-retargeting/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE retargeting SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
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

// Delete user
app.post('/admin/delete-user/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });

    db.get(`SELECT role FROM users WHERE id = ?`, [req.session.userId], (err, admin) => {
        if (admin && admin.role === 'super_admin') {
            db.run(`DELETE FROM users WHERE id = ?`, [req.params.id]);
            db.run(`DELETE FROM user_blogs WHERE user_id = ?`, [req.params.id]);
            db.run(`DELETE FROM user_videos WHERE user_id = ?`, [req.params.id]);
            db.run(`DELETE FROM comments WHERE user_id = ?`, [req.params.id]);
            db.run(`DELETE FROM likes WHERE user_id = ?`, [req.params.id]);
        }
        res.json({ success: true });
    });
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
    console.log(`   - Video Gallery with play/download`);
    console.log(`   - 5 Affiliate Store Cards on Main Page`);
    console.log(`   - Blog System with full posts`);
    console.log(`   - User Profiles with their own content`);
    console.log(`   - Hero Carousel with placeholders`);
    console.log(`   - Photo Gallery`);
    console.log(`   - Newsletter Subscription`);
    console.log(`   - WhatsApp Button with your number`);
    console.log(`   - About/Privacy/Terms/Contact pages`);
    console.log(`   - Google Analytics: G-HD01MF5SL9`);
    console.log(`   - Full Admin Panel with 15+ tabs`);
    console.log(`   - Code Injection (5 points)`);
    console.log(`   - Ad Placements (8 locations)`);
    console.log(`   - Payment Methods (Stripe, PayPal, Crypto)`);
    console.log(`   - Conversion Tracking`);
    console.log(`   - Retargeting Pixels`);
    console.log(`   - Dark Mode Toggle`);
    console.log(`   - Mobile Responsive`);
});
