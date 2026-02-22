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

// Setup folders
const UPLOADS_FOLDER = './uploads';
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_FOLDER));
app.use(session({
    secret: '3eesher-final',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// Database setup
const db = new sqlite3.Database('./3eesher.db');
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'viewer'
    )`);
    
    // Videos table
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        thumbnail TEXT,
        description TEXT,
        views INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0
    )`);
    
    // Placeholders table
    db.run(`CREATE TABLE IF NOT EXISTS placeholders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        link TEXT
    )`);
    
    // Posts table
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        image TEXT,
        views INTEGER DEFAULT 0
    )`);
    
    // Gallery table
    db.run(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT
    )`);
    
    // Payment methods table
    db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT,
        enabled INTEGER DEFAULT 1
    )`);
    
    // Ad placements table
    db.run(`CREATE TABLE IF NOT EXISTS ad_placements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        location TEXT,
        code TEXT,
        enabled INTEGER DEFAULT 1
    )`);
    
    // Injections table
    db.run(`CREATE TABLE IF NOT EXISTS injections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        location TEXT,
        code TEXT,
        active INTEGER DEFAULT 1
    )`);
    
    // Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);
    
    // Create super admin
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
        ['admin', hash, 'super_admin']);
    
    // Default settings
    const settings = [
        ['site_name', '3eesher.cloud'],
        ['site_title', '3eesher.cloud - Share Your World'],
        ['primary_color', '#667eea'],
        ['secondary_color', '#764ba2'],
        ['google_analytics', 'G-HD01MF5SL9']
    ];
    
    settings.forEach(([key, value]) => {
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });
    
    // Default payment methods
    const payments = [
        ['Stripe', 'stripe', 1],
        ['PayPal', 'paypal', 1],
        ['Bitcoin', 'crypto', 1],
        ['Ethereum', 'crypto', 1]
    ];
    
    payments.forEach(([name, type, enabled]) => {
        db.run(`INSERT OR IGNORE INTO payment_methods (name, type, enabled) VALUES (?, ?, ?)`,
            [name, type, enabled]);
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
        db.run(`INSERT OR IGNORE INTO ad_placements (name, location, code, enabled) VALUES (?, ?, ?, ?)`,
            [name, location, code, enabled]);
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
        db.run(`INSERT OR IGNORE INTO injections (name, location, code, active) VALUES (?, ?, ?, ?)`,
            [name, location, code, active]);
    });
    
    // Sample videos
    db.get(`SELECT COUNT(*) as count FROM videos`, [], (err, row) => {
        if (row.count === 0) {
            const videos = [
                ['Welcome Video', 'sample1.mp4', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 'Welcome to 3eesher.cloud'],
                ['Video Tips', 'sample2.mp4', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 'Video creation tips']
            ];
            videos.forEach(([title, filename, thumb, desc]) => {
                db.run(`INSERT INTO videos (title, filename, thumbnail, description) VALUES (?, ?, ?, ?)`,
                    [title, filename, thumb, desc]);
            });
        }
    });
    
    // Sample placeholders
    db.get(`SELECT COUNT(*) as count FROM placeholders`, [], (err, row) => {
        if (row.count === 0) {
            const placeholders = [
                ['Welcome', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=1200', '/videos'],
                ['Create', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200', '/blog']
            ];
            placeholders.forEach(([title, filename, link]) => {
                db.run(`INSERT INTO placeholders (title, filename, link) VALUES (?, ?, ?)`,
                    [title, filename, link]);
            });
        }
    });
    
    // Sample posts
    db.get(`SELECT COUNT(*) as count FROM posts`, [], (err, row) => {
        if (row.count === 0) {
            const posts = [
                ['Getting Started', '<h1>Welcome</h1><p>Start here.</p>', 'https://images.unsplash.com-1519389950473?w=400'],
                ['Video Tips', '<h1>Tips</h1><p>Learn video creation.</p>', 'https://images.unsplash.com-1492619375914?w=400']
            ];
            posts.forEach(([title, content, image]) => {
                db.run(`INSERT INTO posts (title, content, image) VALUES (?, ?, ?)`,
                    [title, content, image]);
            });
        }
    });
    
    // Sample gallery
    db.get(`SELECT COUNT(*) as count FROM gallery`, [], (err, row) => {
        if (row.count === 0) {
            const images = [
                ['Image 1', 'https://images.unsplash.com-1522071820081?w=400'],
                ['Image 2', 'https://images.unsplash.com-1497366216548?w=400']
            ];
            images.forEach(([title, filename]) => {
                db.run(`INSERT INTO gallery (title, filename) VALUES (?, ?)`,
                    [title, filename]);
            });
        }
    });
});

// Upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ==================== MAIN PAGE ====================
app.get('/', (req, res) => {
    db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
        const settings = {};
        settingsRows.forEach(s => settings[s.key] = s.value);
        
        db.all(`SELECT * FROM videos`, [], (err, videos) => {
            db.all(`SELECT * FROM placeholders`, [], (err, placeholders) => {
                db.all(`SELECT * FROM posts`, [], (err, posts) => {
                    db.all(`SELECT * FROM gallery`, [], (err, gallery) => {
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
                                
                                // Video HTML
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
                                            <h3>${p.title}</h3>
                                            <p>${p.content.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                                            <a href="/post/${p.id}" class="read-more">Read More →</a>
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
                                            * { margin:0; padding:0; box-sizing:border-box; }
                                            body {
                                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                line-height: 1.6;
                                                color: #333;
                                            }
                                            
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
                                            
                                            .read-more {
                                                color: ${settings.primary_color};
                                                text-decoration: none;
                                                font-weight: 600;
                                            }
                                            
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
                                            
                                            .footer-bottom {
                                                text-align: center;
                                                padding-top: 20px;
                                                border-top: 1px solid #2d3748;
                                            }
                                            
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
                                                    <a href="#gallery">Gallery</a>
                                                    ${req.session.userId ? 
                                                        '<a href="/admin" class="login-btn">Dashboard</a>' : 
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
                                        
                                        <div class="container" id="videos">
                                            <h2 class="section-title">🎥 Videos</h2>
                                            
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
                                                    ${adsByLocation['sidebar_bottom'] ? `<div class="ad-sidebar">${adsByLocation['sidebar_bottom']}</div>` : ''}
                                                </aside>
                                            </div>
                                            
                                            ${adsByLocation['content_bottom'] ? `<div class="ad-content">${adsByLocation['content_bottom']}</div>` : ''}
                                        </div>
                                        
                                        <div class="container" id="blog">
                                            <h2 class="section-title">📝 Blog</h2>
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
                                        
                                        ${adsByLocation['footer'] ? `<div class="ad-footer">${adsByLocation['footer']}</div>` : ''}
                                        
                                        <footer>
                                            <div class="footer-container">
                                                <div class="footer-bottom">
                                                    <p>${settings.footer_text || '© 2024 3eesher.cloud'}</p>
                                                </div>
                                            </div>
                                        </footer>
                                        
                                        ${bodyEndInjection}
                                        
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

// ==================== POST PAGE ====================
app.get('/post/:id', (req, res) => {
    const id = req.params.id;
    
    db.get(`SELECT * FROM posts WHERE id = ?`, [id], (err, post) => {
        if (!post) return res.redirect('/');
        
        db.run(`UPDATE posts SET views = views + 1 WHERE id = ?`, [id]);
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>${post.title}</title></head>
            <body style="max-width:800px; margin:0 auto; padding:20px;">
                <a href="/">← Back</a>
                <h1>${post.title}</h1>
                <img src="${post.image}" style="max-width:100%;">
                <div>${post.content}</div>
            </body>
            </html>
        `);
    });
});

// ==================== DOWNLOAD ====================
app.get('/download/video/:id', (req, res) => {
    const id = req.params.id;
    
    db.get(`SELECT filename FROM videos WHERE id = ?`, [id], (err, video) => {
        if (video) {
            db.run(`UPDATE videos SET downloads = downloads + 1 WHERE id = ?`, [id]);
            res.redirect(`/uploads/${video.filename}`);
        } else {
            res.redirect('/');
        }
    });
});

// ==================== ADMIN PANEL ====================
app.get('/admin', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.get(`SELECT * FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (!user || user.role !== 'super_admin') return res.redirect('/');
        
        db.all(`SELECT * FROM videos`, [], (err, videos) => {
            db.all(`SELECT * FROM placeholders`, [], (err, placeholders) => {
                db.all(`SELECT * FROM posts`, [], (err, posts) => {
                    db.all(`SELECT * FROM gallery`, [], (err, gallery) => {
                        db.all(`SELECT * FROM payment_methods`, [], (err, payments) => {
                            db.all(`SELECT * FROM ad_placements`, [], (err, ads) => {
                                db.all(`SELECT * FROM injections`, [], (err, injections) => {
                                    db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
                                        const settings = {};
                                        settingsRows.forEach(s => settings[s.key] = s.value);
                                        
                                        res.send(`
                                            <!DOCTYPE html>
                                            <html>
                                            <head>
                                                <title>Super Admin</title>
                                                <style>
                                                    * { margin:0; padding:0; box-sizing:border-box; }
                                                    body { font-family: Arial; background: #f5f5f5; padding: 20px; }
                                                    .container { max-width: 1200px; margin: 0 auto; }
                                                    h1 { color: #333; }
                                                    .tabs {
                                                        display: flex;
                                                        gap: 10px;
                                                        flex-wrap: wrap;
                                                        margin: 20px 0;
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
                                                            </tr>
                                                            ${videos.map(v => `
                                                                <tr>
                                                                    <td>${v.id}</td>
                                                                    <td>${v.title}</td>
                                                                    <td>${v.views}</td>
                                                                    <td>${v.downloads}</td>
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
                                                                <th>Status</th>
                                                                <th>Actions</th>
                                                            </tr>
                                                            ${payments.map(p => `
                                                                <tr>
                                                                    <td>${p.name}</td>
                                                                    <td>${p.type}</td>
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
                                                                <th>Status</th>
                                                                <th>Actions</th>
                                                            </tr>
                                                            ${ads.map(a => `
                                                                <tr>
                                                                    <td>${a.name}</td>
                                                                    <td>${a.location}</td>
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
                                                                        <label>Google Analytics ID</label>
                                                                        <input type="text" name="google_analytics" value="${settings.google_analytics}">
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
                                                    
                                                    function togglePayment(id) {
                                                        fetch('/admin/toggle-payment/' + id, {method:'POST'}).then(()=>location.reload());
                                                    }
                                                    
                                                    function toggleAd(id) {
                                                        fetch('/admin/toggle-ad/' + id, {method:'POST'}).then(()=>location.reload());
                                                    }
                                                    
                                                    function editAd(id) {
                                                        const code = prompt('Enter new ad code:');
                                                        if(code) fetch('/admin/update-ad/' + id, {
                                                            method:'POST',
                                                            headers:{'Content-Type':'application/json'},
                                                            body:JSON.stringify({code})
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
        db.run(`INSERT INTO videos (title, filename, thumbnail, description) VALUES (?, ?, ?, ?)`,
            [req.body.title, video.filename, thumb?.filename || 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', req.body.description]);
    }
    res.redirect('/admin');
});

// Upload placeholder
app.post('/admin/upload-placeholder', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO placeholders (title, filename, link) VALUES (?, ?, ?)`,
        [req.body.title, req.file.filename, req.body.link]);
    res.redirect('/admin');
});

// Create post
app.post('/admin/create-post', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO posts (title, content, image) VALUES (?, ?, ?)`,
        [req.body.title, req.body.content, req.file?.filename || 'https://images.unsplash.com-1519389950473?w=400']);
    res.redirect('/admin');
});

// Upload gallery
app.post('/admin/upload-gallery', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO gallery (title, filename) VALUES (?, ?)`,
        [req.body.title || 'Gallery', req.file.filename]);
    res.redirect('/admin');
});

// Add ad
app.post('/admin/add-ad', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO ad_placements (name, location, code) VALUES (?, ?, ?)`,
        [req.body.name, req.body.location, req.body.code]);
    res.redirect('/admin');
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

// Save injection
app.post('/admin/save-injection', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { location, code } = req.body;
    db.run(`INSERT OR REPLACE INTO injections (location, code) VALUES (?, ?)`,
        [location, code]);
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

// ==================== START ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 3EESHER.CLOUD IS WORKING!`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`👤 Admin: http://localhost:${PORT}/admin`);
    console.log(`🔑 Login: admin / admin123`);
    console.log(``);
    console.log(`✅ SUPER ADMIN HAS:`);
    console.log(`   - Videos (upload, play, download)`);
    console.log(`   - Placeholders (hero carousel)`);
    console.log(`   - Blog (create posts)`);
    console.log(`   - Gallery (upload images)`);
    console.log(`   - Payments (Stripe, PayPal, Crypto)`);
    console.log(`   - Ads (8 placements with edit)`);
    console.log(`   - Code Injections (5 points)`);
    console.log(`   - Settings (colors, Google Analytics)`);
    console.log(`   - Password Change`);
});
