// ==================== FULL 3EESHER.CLOUD WEBSITE ====================
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// --- SETUP ---
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

// --- DATABASE ---
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
        description TEXT,
        thumbnail TEXT,
        views INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0,
        created_date TEXT
    )`);
    
    // Blog posts table
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        image TEXT,
        views INTEGER DEFAULT 0,
        created_date TEXT
    )`);
    
    // Gallery table
    db.run(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        type TEXT,
        created_date TEXT
    )`);
    
    // Placeholders table
    db.run(`CREATE TABLE IF NOT EXISTS placeholders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        link TEXT,
        location TEXT,
        created_date TEXT
    )`);
    
    // Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);
    
    // Create default admin
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
        ['admin', hash, 'super_admin']);
    
    // Default settings
    const settings = [
        ['site_name', '3eesher.cloud'],
        ['site_title', '3eesher.cloud - Video Gallery & Blog Platform'],
        ['site_description', 'Share your videos and stories with the world'],
        ['primary_color', '#667eea'],
        ['secondary_color', '#764ba2'],
        ['hero_title', 'Welcome to 3eesher.cloud'],
        ['hero_subtitle', 'Share your videos and connect with creators'],
        ['footer_text', '© 2024 3eesher.cloud. All rights reserved.']
    ];
    
    settings.forEach(([key, value]) => {
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });
    
    // Add sample data if empty
    db.get(`SELECT COUNT(*) as count FROM videos`, [], (err, row) => {
        if (row.count === 0) {
            db.run(`INSERT INTO videos (title, description, views, featured, created_date) VALUES 
                ('Welcome Video', 'Welcome to 3eesher.cloud!', 1250, 1, datetime('now')),
                ('How to Create Videos', 'Learn video creation tips', 890, 1, datetime('now')),
                ('Behind the Scenes', 'Watch how we make content', 567, 0, datetime('now'))`);
        }
    });
    
    db.get(`SELECT COUNT(*) as count FROM posts`, [], (err, row) => {
        if (row.count === 0) {
            db.run(`INSERT INTO posts (title, content, views, created_date) VALUES 
                ('Getting Started on 3eesher.cloud', 'Welcome to our platform! Here you can share videos, write blog posts, and connect with others.', 342, datetime('now')),
                ('Top Video Tips for Beginners', 'Learn the best practices for creating engaging video content that viewers love.', 267, datetime('now')),
                ('Community Spotlight', 'Check out amazing content from our community members.', 189, datetime('now'))`);
        }
    });
});

// --- UPLOAD SETUP ---
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
    // Get all settings
    db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
        const settings = {};
        settingsRows.forEach(s => settings[s.key] = s.value);
        
        // Get videos
        db.all(`SELECT * FROM videos ORDER BY featured DESC, created_date DESC`, [], (err, videos) => {
            
            // Get blog posts
            db.all(`SELECT * FROM posts ORDER BY created_date DESC LIMIT 3`, [], (err, posts) => {
                
                // Get gallery images
                db.all(`SELECT * FROM gallery ORDER BY created_date DESC LIMIT 8`, [], (err, gallery) => {
                    
                    // Get placeholders
                    db.all(`SELECT * FROM placeholders WHERE location = 'hero' LIMIT 1`, [], (err, hero) => {
                        
                        // Generate video HTML
                        const videoHTML = videos.map(v => `
                            <div class="video-card">
                                <div class="video-thumbnail">
                                    ${v.thumbnail ? 
                                        `<img src="/uploads/${v.thumbnail}" alt="${v.title}">` : 
                                        `<div class="video-placeholder">🎥</div>`
                                    }
                                    <span class="video-views">👁️ ${v.views.toLocaleString()}</span>
                                </div>
                                <div class="video-info">
                                    <h3>${v.title}</h3>
                                    <p>${v.description || ''}</p>
                                    <button class="play-btn" onclick="playVideo('${v.filename}')">▶ Play</button>
                                </div>
                            </div>
                        `).join('');
                        
                        // Generate blog HTML
                        const blogHTML = posts.map(p => `
                            <article class="blog-card">
                                ${p.image ? `<img src="/uploads/${p.image}" alt="${p.title}" class="blog-image">` : ''}
                                <div class="blog-content">
                                    <h3>${p.title}</h3>
                                    <p class="blog-meta">${new Date(p.created_date).toLocaleDateString()} | 👁️ ${p.views} views</p>
                                    <p>${p.content.substring(0, 150)}...</p>
                                    <a href="/post/${p.id}" class="read-more">Read More →</a>
                                </div>
                            </article>
                        `).join('');
                        
                        // Generate gallery HTML
                        const galleryHTML = gallery.map(g => `
                            <div class="gallery-item">
                                <img src="/uploads/${g.filename}" alt="${g.title || 'Gallery image'}" loading="lazy">
                                ${g.title ? `<div class="gallery-overlay">${g.title}</div>` : ''}
                            </div>
                        `).join('');
                        
                        // Hero section HTML
                        const heroHTML = hero.length > 0 ? 
                            `<div class="hero" style="background-image: url('/uploads/${hero[0].filename}')">
                                <div class="hero-content">
                                    <h1>${settings.hero_title}</h1>
                                    <p>${settings.hero_subtitle}</p>
                                    <a href="#videos" class="hero-btn">Watch Videos</a>
                                </div>
                            </div>` :
                            `<div class="hero" style="background: linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})">
                                <div class="hero-content">
                                    <h1>${settings.hero_title}</h1>
                                    <p>${settings.hero_subtitle}</p>
                                    <a href="#videos" class="hero-btn">Get Started</a>
                                </div>
                            </div>`;
                        
                        // Send the FULL website
                        res.send(`
                            <!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>${settings.site_title}</title>
                                <meta name="description" content="${settings.site_description}">
                                <style>
                                    * {
                                        margin: 0;
                                        padding: 0;
                                        box-sizing: border-box;
                                    }
                                    
                                    body {
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                                        line-height: 1.6;
                                        color: #333;
                                    }
                                    
                                    /* Header */
                                    header {
                                        background: linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color});
                                        color: white;
                                        padding: 1rem 0;
                                        position: sticky;
                                        top: 0;
                                        z-index: 1000;
                                        box-shadow: 0 2px 20px rgba(0,0,0,0.1);
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
                                        font-size: 1.8rem;
                                        font-weight: bold;
                                        text-decoration: none;
                                        color: white;
                                    }
                                    
                                    .nav-links {
                                        display: flex;
                                        gap: 30px;
                                    }
                                    
                                    .nav-links a {
                                        color: white;
                                        text-decoration: none;
                                        font-weight: 500;
                                        transition: opacity 0.3s;
                                    }
                                    
                                    .nav-links a:hover {
                                        opacity: 0.8;
                                    }
                                    
                                    .login-btn {
                                        background: white;
                                        color: ${settings.primary_color} !important;
                                        padding: 8px 20px;
                                        border-radius: 50px;
                                        font-weight: 600;
                                    }
                                    
                                    /* Hero Section */
                                    .hero {
                                        min-height: 500px;
                                        background-size: cover;
                                        background-position: center;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        text-align: center;
                                        color: white;
                                        position: relative;
                                    }
                                    
                                    .hero::before {
                                        content: '';
                                        position: absolute;
                                        top: 0;
                                        left: 0;
                                        right: 0;
                                        bottom: 0;
                                        background: rgba(0,0,0,0.5);
                                    }
                                    
                                    .hero-content {
                                        position: relative;
                                        z-index: 1;
                                        max-width: 800px;
                                        padding: 0 20px;
                                    }
                                    
                                    .hero h1 {
                                        font-size: 3.5rem;
                                        margin-bottom: 1rem;
                                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                                    }
                                    
                                    .hero p {
                                        font-size: 1.2rem;
                                        margin-bottom: 2rem;
                                        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                                    }
                                    
                                    .hero-btn {
                                        display: inline-block;
                                        padding: 15px 40px;
                                        background: white;
                                        color: ${settings.primary_color};
                                        text-decoration: none;
                                        border-radius: 50px;
                                        font-weight: 600;
                                        font-size: 1.1rem;
                                        transition: transform 0.3s;
                                    }
                                    
                                    .hero-btn:hover {
                                        transform: translateY(-3px);
                                        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                                    }
                                    
                                    /* Main Container */
                                    .container {
                                        max-width: 1200px;
                                        margin: 0 auto;
                                        padding: 40px 20px;
                                    }
                                    
                                    .section-title {
                                        font-size: 2.5rem;
                                        margin-bottom: 30px;
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
                                        border-radius: 2px;
                                    }
                                    
                                    /* Video Grid */
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
                                        transition: transform 0.3s, box-shadow 0.3s;
                                    }
                                    
                                    .video-card:hover {
                                        transform: translateY(-5px);
                                        box-shadow: 0 15px 30px rgba(0,0,0,0.15);
                                    }
                                    
                                    .video-thumbnail {
                                        height: 180px;
                                        background: #2d3748;
                                        position: relative;
                                        overflow: hidden;
                                    }
                                    
                                    .video-thumbnail img {
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                    }
                                    
                                    .video-placeholder {
                                        width: 100%;
                                        height: 100%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 3rem;
                                        background: linear-gradient(135deg, #667eea, #764ba2);
                                        color: white;
                                    }
                                    
                                    .video-views {
                                        position: absolute;
                                        bottom: 10px;
                                        right: 10px;
                                        background: rgba(0,0,0,0.7);
                                        color: white;
                                        padding: 4px 8px;
                                        border-radius: 5px;
                                        font-size: 0.8rem;
                                    }
                                    
                                    .video-info {
                                        padding: 20px;
                                    }
                                    
                                    .video-info h3 {
                                        margin-bottom: 10px;
                                        color: #333;
                                    }
                                    
                                    .video-info p {
                                        color: #666;
                                        margin-bottom: 15px;
                                        font-size: 0.95rem;
                                    }
                                    
                                    .play-btn {
                                        padding: 8px 20px;
                                        background: linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color});
                                        color: white;
                                        border: none;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-weight: 600;
                                        transition: opacity 0.3s;
                                    }
                                    
                                    .play-btn:hover {
                                        opacity: 0.9;
                                    }
                                    
                                    /* Blog Section */
                                    .blog-grid {
                                        display: grid;
                                        gap: 30px;
                                        margin: 40px 0;
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
                                    
                                    .blog-content h3 {
                                        font-size: 1.5rem;
                                        margin-bottom: 10px;
                                        color: #333;
                                    }
                                    
                                    .blog-meta {
                                        color: #666;
                                        font-size: 0.9rem;
                                        margin-bottom: 15px;
                                    }
                                    
                                    .read-more {
                                        display: inline-block;
                                        margin-top: 15px;
                                        color: ${settings.primary_color};
                                        text-decoration: none;
                                        font-weight: 600;
                                    }
                                    
                                    /* Gallery Section */
                                    .gallery-grid {
                                        display: grid;
                                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                                        gap: 20px;
                                        margin: 40px 0;
                                    }
                                    
                                    .gallery-item {
                                        position: relative;
                                        border-radius: 10px;
                                        overflow: hidden;
                                        aspect-ratio: 1;
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
                                    
                                    /* Footer */
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
                                    
                                    .footer-col h3 {
                                        margin-bottom: 20px;
                                        color: white;
                                    }
                                    
                                    .footer-col ul {
                                        list-style: none;
                                    }
                                    
                                    .footer-col li {
                                        margin-bottom: 10px;
                                    }
                                    
                                    .footer-col a {
                                        color: #a0aec0;
                                        text-decoration: none;
                                        transition: color 0.3s;
                                    }
                                    
                                    .footer-col a:hover {
                                        color: white;
                                    }
                                    
                                    .footer-bottom {
                                        text-align: center;
                                        padding-top: 20px;
                                        border-top: 1px solid #2d3748;
                                        color: #a0aec0;
                                    }
                                    
                                    /* Admin Button */
                                    .admin-btn {
                                        position: fixed;
                                        bottom: 20px;
                                        right: 20px;
                                        background: linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color});
                                        color: white;
                                        padding: 15px 30px;
                                        border-radius: 50px;
                                        text-decoration: none;
                                        font-weight: 600;
                                        box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
                                        z-index: 9999;
                                        transition: transform 0.3s;
                                    }
                                    
                                    .admin-btn:hover {
                                        transform: translateY(-3px);
                                    }
                                    
                                    /* Responsive */
                                    @media (max-width: 768px) {
                                        .hero h1 {
                                            font-size: 2.5rem;
                                        }
                                        
                                        .blog-card {
                                            flex-direction: column;
                                        }
                                        
                                        .blog-image {
                                            width: 100%;
                                            height: 200px;
                                        }
                                        
                                        .nav-links {
                                            gap: 15px;
                                        }
                                    }
                                    
                                    @media (max-width: 480px) {
                                        .header-container {
                                            flex-direction: column;
                                            gap: 15px;
                                        }
                                        
                                        .hero h1 {
                                            font-size: 2rem;
                                        }
                                    }
                                </style>
                            </head>
                            <body>
                                <header>
                                    <div class="header-container">
                                        <a href="/" class="logo">☁️ 3eesher.cloud</a>
                                        <nav class="nav-links">
                                            <a href="#videos">Videos</a>
                                            <a href="#blog">Blog</a>
                                            <a href="#gallery">Gallery</a>
                                            <a href="/about">About</a>
                                            ${req.session.userId ? 
                                                '<a href="/admin" class="login-btn">Dashboard</a>' : 
                                                '<a href="/login" class="login-btn">Login</a>'
                                            }
                                        </nav>
                                    </div>
                                </header>
                                
                                ${heroHTML}
                                
                                <div class="container" id="videos">
                                    <h2 class="section-title">🎥 Featured Videos</h2>
                                    <div class="video-grid">
                                        ${videoHTML}
                                    </div>
                                </div>
                                
                                <div class="container" id="blog">
                                    <h2 class="section-title">📝 Latest from Blog</h2>
                                    <div class="blog-grid">
                                        ${blogHTML}
                                    </div>
                                </div>
                                
                                ${gallery.length > 0 ? `
                                    <div class="container" id="gallery">
                                        <h2 class="section-title">📸 Photo Gallery</h2>
                                        <div class="gallery-grid">
                                            ${galleryHTML}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <footer>
                                    <div class="footer-container">
                                        <div class="footer-grid">
                                            <div class="footer-col">
                                                <h3>About</h3>
                                                <p style="color: #a0aec0;">${settings.site_description}</p>
                                            </div>
                                            <div class="footer-col">
                                                <h3>Quick Links</h3>
                                                <ul>
                                                    <li><a href="#videos">Videos</a></li>
                                                    <li><a href="#blog">Blog</a></li>
                                                    <li><a href="#gallery">Gallery</a></li>
                                                    <li><a href="/about">About</a></li>
                                                </ul>
                                            </div>
                                            <div class="footer-col">
                                                <h3>Legal</h3>
                                                <ul>
                                                    <li><a href="/privacy">Privacy</a></li>
                                                    <li><a href="/terms">Terms</a></li>
                                                    <li><a href="/contact">Contact</a></li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="footer-bottom">
                                            <p>${settings.footer_text}</p>
                                        </div>
                                    </div>
                                </footer>
                                
                                ${req.session.userId ? 
                                    '<a href="/admin" class="admin-btn">⚙️ Admin Dashboard</a>' : 
                                    ''
                                }
                                
                                <script>
                                    function playVideo(filename) {
                                        // Create video modal
                                        const modal = document.createElement('div');
                                        modal.style.cssText = '
                                            position:fixed;
                                            top:0;
                                            left:0;
                                            right:0;
                                            bottom:0;
                                            background:rgba(0,0,0,0.9);
                                            display:flex;
                                            align-items:center;
                                            justify-content:center;
                                            z-index:10000;
                                        ';
                                        
                                        const video = document.createElement('video');
                                        video.src = '/uploads/' + filename;
                                        video.controls = true;
                                        video.style.maxWidth = '90%';
                                        video.style.maxHeight = '90%';
                                        
                                        modal.onclick = function(e) {
                                            if (e.target === modal) {
                                                document.body.removeChild(modal);
                                            }
                                        };
                                        
                                        modal.appendChild(video);
                                        document.body.appendChild(modal);
                                        video.play();
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

// ==================== ADMIN PANEL ====================
app.get('/admin', (req, res) => {
    if (!req.session.userId) {
        res.redirect('/login');
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin Dashboard - 3eesher.cloud</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: #f7f9fc;
                        padding: 20px;
                    }
                    .container { max-width: 1200px; margin: 0 auto; }
                    h1 { color: #333; margin-bottom: 30px; }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 30px;
                    }
                    .nav a {
                        display: inline-block;
                        padding: 10px 20px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-left: 10px;
                    }
                    .grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .card {
                        background: white;
                        padding: 25px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .card h2 {
                        color: #667eea;
                        margin-bottom: 20px;
                    }
                    .form-group {
                        margin-bottom: 15px;
                    }
                    label {
                        display: block;
                        margin-bottom: 5px;
                        color: #666;
                    }
                    input, textarea, select {
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #e2e8f0;
                        border-radius: 5px;
                        font-size: 14px;
                    }
                    button {
                        padding: 10px 20px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    button:hover {
                        background: #5a67d8;
                    }
                    table {
                        width: 100%;
                        background: white;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⚙️ Admin Dashboard</h1>
                        <div class="nav">
                            <a href="/">View Site</a>
                            <a href="/logout">Logout</a>
                        </div>
                    </div>
                    
                    <div class="grid">
                        <div class="card">
                            <h2>📹 Upload Video</h2>
                            <form action="/upload-video" method="POST" enctype="multipart/form-data">
                                <div class="form-group">
                                    <label>Title</label>
                                    <input type="text" name="title" required>
                                </div>
                                <div class="form-group">
                                    <label>Description</label>
                                    <textarea name="description" rows="3"></textarea>
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
                            </form>
                        </div>
                        
                        <div class="card">
                            <h2>📝 Create Blog Post</h2>
                            <form action="/create-post" method="POST" enctype="multipart/form-data">
                                <div class="form-group">
                                    <label>Title</label>
                                    <input type="text" name="title" required>
                                </div>
                                <div class="form-group">
                                    <label>Content</label>
                                    <textarea name="content" rows="5" required></textarea>
                                </div>
                                <div class="form-group">
                                    <label>Featured Image (optional)</label>
                                    <input type="file" name="image" accept="image/*">
                                </div>
                                <button type="submit">Publish Post</button>
                            </form>
                        </div>
                        
                        <div class="card">
                            <h2>📸 Upload to Gallery</h2>
                            <form action="/upload-gallery" method="POST" enctype="multipart/form-data">
                                <div class="form-group">
                                    <label>Title (optional)</label>
                                    <input type="text" name="title">
                                </div>
                                <div class="form-group">
                                    <label>Image</label>
                                    <input type="file" name="image" accept="image/*" required>
                                </div>
                                <button type="submit">Upload to Gallery</button>
                            </form>
                        </div>
                        
                        <div class="card">
                            <h2>🖼️ Hero Image</h2>
                            <form action="/upload-hero" method="POST" enctype="multipart/form-data">
                                <div class="form-group">
                                    <label>Hero Image</label>
                                    <input type="file" name="image" accept="image/*" required>
                                </div>
                                <div class="form-group">
                                    <label>Link URL (optional)</label>
                                    <input type="text" name="link">
                                </div>
                                <button type="submit">Set Hero Image</button>
                            </form>
                        </div>
                    </div>
                    
                    <h2 style="margin: 30px 0 20px;">Recent Videos</h2>
                    <table>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Views</th>
                            <th>Date</th>
                        </tr>
                        ${getVideosTable()}
                    </table>
                </div>
            </body>
            </html>
        `);
    }
});

// Helper function for videos table
function getVideosTable() {
    let html = '';
    db.all(`SELECT * FROM videos ORDER BY created_date DESC LIMIT 5`, [], (err, rows) => {
        rows.forEach(r => {
            html += `<tr><td>${r.id}</td><td>${r.title}</td><td>${r.views}</td><td>${new Date(r.created_date).toLocaleDateString()}</td></tr>`;
        });
    });
    return html || '<tr><td colspan="4">No videos yet</td></tr>';
}

// ==================== LOGIN ====================
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Login - 3eesher.cloud</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
                h2 {
                    text-align: center;
                    color: #333;
                    margin-bottom: 30px;
                }
                input {
                    width: 100%;
                    padding: 12px;
                    margin: 10px 0;
                    border: 2px solid #e2e8f0;
                    border-radius: 5px;
                    font-size: 14px;
                }
                button {
                    width: 100%;
                    padding: 12px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 20px;
                }
                button:hover {
                    background: #5a67d8;
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
    db.get(`SELECT * FROM users WHERE username = ?`, [req.body.username], (err, user) => {
        if (user && bcrypt.compareSync(req.body.password, user.password)) {
            req.session.userId = user.id;
            res.redirect('/admin');
        } else {
            res.send('Invalid login');
        }
    });
});

// ==================== UPLOAD ROUTES ====================
app.post('/upload-video', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const videoFile = req.files['video']?.[0];
    const thumbFile = req.files['thumbnail']?.[0];
    
    if (videoFile) {
        db.run(`INSERT INTO videos (title, filename, thumbnail, description, created_date) VALUES (?, ?, ?, ?, ?)`,
            [req.body.title, videoFile.filename, thumbFile?.filename, req.body.description, new Date().toISOString()]);
    }
    res.redirect('/admin');
});

app.post('/create-post', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO posts (title, content, image, created_date) VALUES (?, ?, ?, ?)`,
        [req.body.title, req.body.content, req.file?.filename, new Date().toISOString()]);
    res.redirect('/admin');
});

app.post('/upload-gallery', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO gallery (title, filename, type, created_date) VALUES (?, ?, ?, ?)`,
        [req.body.title || 'Gallery image', req.file.filename, 'image', new Date().toISOString()]);
    res.redirect('/admin');
});

app.post('/upload-hero', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    // Delete old hero
    db.run(`DELETE FROM placeholders WHERE location = 'hero'`);
    
    db.run(`INSERT INTO placeholders (title, filename, link, location, created_date) VALUES (?, ?, ?, ?, ?)`,
        ['Hero Image', req.file.filename, req.body.link, 'hero', new Date().toISOString()]);
    res.redirect('/admin');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3eesher.cloud is LIVE!`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`👤 Admin: http://localhost:${PORT}/admin`);
    console.log(`🔑 Login: admin / admin123`);
});
