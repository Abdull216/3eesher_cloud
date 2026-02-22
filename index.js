// ==================== index.js - COMPLETE WITH MAIN PAGE GALLERY ====================
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const SUPER_ADMIN_PASSWORD = "admin123"; // Default - change after login
const SITES_FOLDER = './sites';
const UPLOADS_FOLDER = './uploads';

// --- SETUP FOLDERS ---
if (!fs.existsSync(SITES_FOLDER)) fs.mkdirSync(SITES_FOLDER, { recursive: true });
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_FOLDER));

// Session
app.use(session({
    secret: '3eesher-main-gallery',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// --- MASTER DATABASE ---
const masterDb = new sqlite3.Database('./3eesher_platform.db');
masterDb.serialize(() => {
    masterDb.run(`CREATE TABLE IF NOT EXISTS sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        domain TEXT UNIQUE,
        folder TEXT UNIQUE,
        created_date TEXT
    )`);
});

// --- MIDDLEWARE: Site Resolution ---
app.use((req, res, next) => {
    const host = req.get('host').split(':')[0];
    
    if (host === '3eesher.cloud' || host === 'localhost' || host === `localhost:${PORT}`) {
        req.siteId = 0;
        req.siteFolder = null;
        req.isPlatform = true;
        next();
    } else {
        masterDb.get(`SELECT * FROM sites WHERE domain = ? OR (domain = '' AND name = ?)`, 
            [host, host.split('.')[0]], (err, site) => {
            if (site) {
                req.siteId = site.id;
                req.siteName = site.name;
                req.siteFolder = path.join(SITES_FOLDER, site.folder);
                initSiteDb(req.siteFolder);
                next();
            } else {
                res.status(404).send('Site not found');
            }
        });
    }
});

// --- INIT SITE DATABASE ---
function initSiteDb(folder) {
    const dbPath = path.join(folder, 'site.db');
    const dbExists = fs.existsSync(dbPath);
    
    const siteDb = new sqlite3.Database(dbPath);
    siteDb.serialize(() => {
        // ========== USERS ==========
        siteDb.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT,
            full_name TEXT,
            role TEXT DEFAULT 'viewer',
            approved INTEGER DEFAULT 0,
            created_date TEXT
        )`);
        
        // ========== VIDEOS (Top Priority) ==========
        siteDb.run(`CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            filename TEXT,
            thumbnail TEXT,
            description TEXT,
            uploader_id INTEGER,
            views INTEGER DEFAULT 0,
            featured INTEGER DEFAULT 0,
            created_date TEXT,
            FOREIGN KEY (uploader_id) REFERENCES users(id)
        )`);
        
        // ========== PLACEHOLDER PICTURES ==========
        siteDb.run(`CREATE TABLE IF NOT EXISTS placeholders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            filename TEXT,
            location TEXT, -- 'hero', 'featured', 'gallery', 'sidebar'
            link TEXT,
            description TEXT,
            uploader_id INTEGER,
            display_order INTEGER DEFAULT 0,
            created_date TEXT,
            FOREIGN KEY (uploader_id) REFERENCES users(id)
        )`);
        
        // ========== BLOG POSTS ==========
        siteDb.run(`CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            slug TEXT UNIQUE,
            content TEXT,
            excerpt TEXT,
            featured_image TEXT,
            author_id INTEGER,
            category TEXT,
            tags TEXT,
            views INTEGER DEFAULT 0,
            status TEXT DEFAULT 'published',
            published_at TEXT,
            created_date TEXT,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )`);
        
        // ========== GALLERY (All Uploads) ==========
        siteDb.run(`CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            filename TEXT,
            file_type TEXT, -- 'image', 'video', 'document'
            thumbnail TEXT,
            uploader_id INTEGER,
            description TEXT,
            downloads INTEGER DEFAULT 0,
            created_date TEXT,
            FOREIGN KEY (uploader_id) REFERENCES users(id)
        )`);
        
        // ========== INJECTIONS ==========
        siteDb.run(`CREATE TABLE IF NOT EXISTS injections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location TEXT UNIQUE,
            code TEXT,
            active INTEGER DEFAULT 1
        )`);
        
        // ========== SETTINGS ==========
        siteDb.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);
        
        // Insert default data if new site
        if (!dbExists) {
            // Create super admin
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync('admin123', salt);
            
            siteDb.run(`INSERT INTO users (username, email, password, full_name, role, approved, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['admin', 'admin@3eesher.cloud', hash, 'Super Admin', 'super_admin', 1, new Date().toISOString()]);
            
            // Default settings
            const defaultSettings = [
                ['site_name', 'My 3eesher Site'],
                ['site_title', 'Welcome to My Site'],
                ['site_description', 'Video Gallery & Blog Platform'],
                ['primary_color', '#667eea'],
                ['secondary_color', '#764ba2'],
                ['videos_per_row', '4'],
                ['show_blog_on_home', 'true'],
                ['show_gallery_on_home', 'true']
            ];
            
            defaultSettings.forEach(([key, value]) => {
                siteDb.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value]);
            });
            
            // Sample video
            siteDb.run(`INSERT INTO videos (title, filename, description, views, featured, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
                ['Welcome Video', 'sample-video.mp4', 'Welcome to 3eesher.cloud', 0, 1, new Date().toISOString()]);
            
            // Sample placeholder
            siteDb.run(`INSERT INTO placeholders (title, filename, location, description, display_order, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
                ['Hero Image', 'hero-placeholder.jpg', 'hero', 'Main hero image', 1, new Date().toISOString()]);
            
            // Sample blog post
            siteDb.run(`INSERT INTO posts (title, slug, content, excerpt, author_id, status, published_at, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                ['First Blog Post', 'first-post', '<p>Welcome to my blog!</p>', 'Welcome post', 1, 'published', new Date().toISOString(), new Date().toISOString()]);
        }
    });
    siteDb.close();
}

// ==================== VIDEO UPLOAD SETUP ====================
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'video-' + unique + path.extname(file.originalname));
    }
});

const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'image-' + unique + path.extname(file.originalname));
    }
});

const uploadVideo = multer({ 
    storage: videoStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

const uploadImage = multer({ 
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ==================== MAIN PAGE HANDLER ====================
app.get('/', (req, res) => {
    if (req.isPlatform) {
        res.send(platformHomeHTML());
    } else {
        showMainPage(req, res);
    }
});

function showMainPage(req, res) {
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    // Get all data for main page in the correct order
    siteDb.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
        const settings = {};
        settingsRows.forEach(s => settings[s.key] = s.value);
        
        // 1. GET VIDEOS (Top Priority)
        siteDb.all(`SELECT * FROM videos ORDER BY featured DESC, created_date DESC`, [], (err, videos) => {
            
            // 2. GET PLACEHOLDER PICTURES
            siteDb.all(`SELECT * FROM placeholders ORDER BY display_order ASC`, [], (err, placeholders) => {
                
                // 3. GET BLOG POSTS
                siteDb.all(`SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC`, [], (err, posts) => {
                    
                    // 4. GET GALLERY (All uploads)
                    siteDb.all(`SELECT * FROM gallery ORDER BY created_date DESC`, [], (err, gallery) => {
                        
                        // 5. GET INJECTIONS
                        siteDb.all(`SELECT * FROM injections WHERE active = 1`, [], (err, injections) => {
                            
                            // Group injections
                            const headInjection = injections.find(i => i.location === 'head')?.code || '';
                            const bodyStartInjection = injections.find(i => i.location === 'body_start')?.code || '';
                            const beforeVideosInjection = injections.find(i => i.location === 'before_videos')?.code || '';
                            const afterVideosInjection = injections.find(i => i.location === 'after_videos')?.code || '';
                            const beforeBlogInjection = injections.find(i => i.location === 'before_blog')?.code || '';
                            const afterBlogInjection = injections.find(i => i.location === 'after_blog')?.code || '';
                            const bodyEndInjection = injections.find(i => i.location === 'body_end')?.code || '';
                            const customCSS = injections.find(i => i.location === 'custom_css')?.code || '';
                            const customJS = injections.find(i => i.location === 'custom_js')?.code || '';
                            
                            // Check if user is admin
                            const isAdmin = req.session.userId ? true : false;
                            
                            // Generate Video Gallery HTML
                            const videosPerRow = parseInt(settings.videos_per_row) || 4;
                            const videoWidth = Math.floor(100 / videosPerRow) - 2;
                            
                            const videoHTML = videos.map(v => `
                                <div class="video-item" style="width: ${videoWidth}%; margin: 1%;">
                                    <div class="video-thumbnail">
                                        ${v.thumbnail ? 
                                            `<img src="/uploads/${v.thumbnail}" alt="${v.title}">` : 
                                            `<div class="video-placeholder">🎥</div>`
                                        }
                                        <video controls style="display:none;" id="video-${v.id}">
                                            <source src="/uploads/${v.filename}" type="video/mp4">
                                        </video>
                                    </div>
                                    <h4>${v.title}</h4>
                                    <p>${v.description || ''}</p>
                                    <button onclick="playVideo(${v.id})" class="play-btn">▶ Play</button>
                                    <span class="views">👁️ ${v.views} views</span>
                                </div>
                            `).join('');
                            
                            // Generate Placeholder HTML
                            const placeholderHTML = placeholders.map(p => `
                                <div class="placeholder-item">
                                    <img src="/uploads/${p.filename}" alt="${p.title}">
                                    ${p.link ? `<a href="${p.link}" class="placeholder-overlay">${p.title}</a>` : ''}
                                </div>
                            `).join('');
                            
                            // Generate Blog HTML
                            const blogHTML = posts.map(p => `
                                <article class="blog-post">
                                    ${p.featured_image ? `<img src="/uploads/${p.featured_image}" alt="${p.title}" class="blog-image">` : ''}
                                    <div class="blog-content">
                                        <h3><a href="/post/${p.slug}">${p.title}</a></h3>
                                        <p class="blog-meta">${new Date(p.published_at).toLocaleDateString()} | 👁️ ${p.views} views</p>
                                        <p class="blog-excerpt">${p.excerpt || p.content.substring(0, 200)}...</p>
                                        <a href="/post/${p.slug}" class="read-more">Read More →</a>
                                    </div>
                                </article>
                            `).join('');
                            
                            // Generate Gallery HTML
                            const galleryHTML = gallery.map(g => `
                                <div class="gallery-item">
                                    ${g.file_type === 'video' ? 
                                        `<video src="/uploads/${g.filename}" controls></video>` :
                                        `<img src="/uploads/${g.filename}" alt="${g.title}">`
                                    }
                                    <div class="gallery-overlay">
                                        <h4>${g.title}</h4>
                                        <p>${g.description || ''}</p>
                                    </div>
                                </div>
                            `).join('');
                            
                            res.send(`<!DOCTYPE html>
                            <html>
                            <head>
                                <title>${settings.site_title}</title>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <meta name="description" content="${settings.site_description}">
                                
                                <!-- HEAD INJECTION -->
                                ${headInjection}
                                
                                <style>
                                    * { margin:0; padding:0; box-sizing:border-box; }
                                    body {
                                        font-family: 'Segoe UI', sans-serif;
                                        background: #f8fafc;
                                        color: #333;
                                    }
                                    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
                                    
                                    /* Header */
                                    header {
                                        background: linear-gradient(135deg, ${settings.primary_color || '#667eea'} 0%, ${settings.secondary_color || '#764ba2'} 100%);
                                        color: white;
                                        padding: 20px 0;
                                        margin-bottom: 30px;
                                    }
                                    .header-content {
                                        display: flex;
                                        justify-content: space-between;
                                        align-items: center;
                                        flex-wrap: wrap;
                                    }
                                    .logo { font-size: 24px; font-weight: bold; }
                                    nav ul {
                                        display: flex;
                                        list-style: none;
                                        gap: 20px;
                                    }
                                    nav a {
                                        color: white;
                                        text-decoration: none;
                                        padding: 5px 10px;
                                    }
                                    
                                    /* Section Titles */
                                    .section-title {
                                        font-size: 32px;
                                        margin: 40px 0 20px;
                                        color: ${settings.primary_color || '#667eea'};
                                        border-bottom: 3px solid ${settings.secondary_color || '#764ba2'};
                                        padding-bottom: 10px;
                                    }
                                    
                                    /* VIDEO GALLERY - TOP PRIORITY */
                                    .video-gallery {
                                        display: flex;
                                        flex-wrap: wrap;
                                        margin: -1%;
                                        background: white;
                                        padding: 30px;
                                        border-radius: 15px;
                                        box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                                    }
                                    .video-item {
                                        background: #f1f5f9;
                                        border-radius: 10px;
                                        overflow: hidden;
                                        transition: transform 0.3s;
                                        margin-bottom: 20px;
                                    }
                                    .video-item:hover {
                                        transform: translateY(-5px);
                                        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                                    }
                                    .video-thumbnail {
                                        height: 180px;
                                        background: #334155;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        color: white;
                                        font-size: 48px;
                                        position: relative;
                                    }
                                    .video-thumbnail img {
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                    }
                                    .video-item h4 {
                                        padding: 15px 15px 5px;
                                        font-size: 18px;
                                    }
                                    .video-item p {
                                        padding: 0 15px 10px;
                                        color: #64748b;
                                        font-size: 14px;
                                    }
                                    .play-btn {
                                        margin: 0 15px 15px;
                                        padding: 8px 15px;
                                        background: ${settings.primary_color || '#667eea'};
                                        color: white;
                                        border: none;
                                        border-radius: 5px;
                                        cursor: pointer;
                                    }
                                    .views {
                                        float: right;
                                        margin-right: 15px;
                                        color: #94a3b8;
                                    }
                                    
                                    /* PLACEHOLDER PICTURES */
                                    .placeholder-grid {
                                        display: grid;
                                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                                        gap: 20px;
                                        margin: 30px 0;
                                    }
                                    .placeholder-item {
                                        position: relative;
                                        border-radius: 10px;
                                        overflow: hidden;
                                        height: 250px;
                                    }
                                    .placeholder-item img {
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                        transition: transform 0.5s;
                                    }
                                    .placeholder-item:hover img {
                                        transform: scale(1.1);
                                    }
                                    .placeholder-overlay {
                                        position: absolute;
                                        bottom: 0;
                                        left: 0;
                                        right: 0;
                                        background: linear-gradient(transparent, rgba(0,0,0,0.8));
                                        color: white;
                                        padding: 20px;
                                        text-decoration: none;
                                        font-size: 20px;
                                        font-weight: bold;
                                    }
                                    
                                    /* BLOG SECTION */
                                    .blog-grid {
                                        display: grid;
                                        gap: 30px;
                                    }
                                    .blog-post {
                                        display: flex;
                                        background: white;
                                        border-radius: 10px;
                                        overflow: hidden;
                                        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                                    }
                                    .blog-image {
                                        width: 300px;
                                        height: 200px;
                                        object-fit: cover;
                                    }
                                    .blog-content {
                                        padding: 25px;
                                        flex: 1;
                                    }
                                    .blog-content h3 {
                                        font-size: 24px;
                                        margin-bottom: 10px;
                                    }
                                    .blog-content h3 a {
                                        color: #333;
                                        text-decoration: none;
                                    }
                                    .blog-content h3 a:hover {
                                        color: ${settings.primary_color || '#667eea'};
                                    }
                                    .blog-meta {
                                        color: #64748b;
                                        margin-bottom: 15px;
                                    }
                                    .blog-excerpt {
                                        color: #475569;
                                        line-height: 1.6;
                                        margin-bottom: 20px;
                                    }
                                    .read-more {
                                        color: ${settings.primary_color || '#667eea'};
                                        text-decoration: none;
                                        font-weight: 600;
                                    }
                                    
                                    /* GALLERY SECTION */
                                    .gallery-grid {
                                        display: grid;
                                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                                        gap: 20px;
                                        margin: 30px 0;
                                    }
                                    .gallery-item {
                                        position: relative;
                                        border-radius: 10px;
                                        overflow: hidden;
                                        height: 200px;
                                    }
                                    .gallery-item img, .gallery-item video {
                                        width: 100%;
                                        height: 100%;
                                        object-fit: cover;
                                    }
                                    .gallery-overlay {
                                        position: absolute;
                                        bottom: 0;
                                        left: 0;
                                        right: 0;
                                        background: rgba(0,0,0,0.7);
                                        color: white;
                                        padding: 15px;
                                        transform: translateY(100%);
                                        transition: transform 0.3s;
                                    }
                                    .gallery-item:hover .gallery-overlay {
                                        transform: translateY(0);
                                    }
                                    
                                    /* Admin Button */
                                    .admin-btn {
                                        position: fixed;
                                        bottom: 20px;
                                        right: 20px;
                                        background: ${settings.primary_color || '#667eea'};
                                        color: white;
                                        padding: 12px 24px;
                                        border-radius: 50px;
                                        text-decoration: none;
                                        font-weight: 600;
                                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                                        z-index: 9999;
                                    }
                                    
                                    /* Footer */
                                    footer {
                                        background: #1e293b;
                                        color: white;
                                        padding: 40px 0;
                                        margin-top: 60px;
                                    }
                                    
                                    /* Responsive */
                                    @media (max-width: 768px) {
                                        .blog-post {
                                            flex-direction: column;
                                        }
                                        .blog-image {
                                            width: 100%;
                                            height: 200px;
                                        }
                                        .video-item {
                                            width: 100% !important;
                                            margin: 10px 0 !important;
                                        }
                                    }
                                    
                                    /* CUSTOM CSS INJECTION */
                                    ${customCSS}
                                </style>
                            </head>
                            <body>
                                <!-- BODY START INJECTION -->
                                ${bodyStartInjection}
                                
                                <header>
                                    <div class="container header-content">
                                        <div class="logo">${settings.site_name}</div>
                                        <nav>
                                            <ul>
                                                <li><a href="/">Home</a></li>
                                                <li><a href="/videos">Videos</a></li>
                                                <li><a href="/blog">Blog</a></li>
                                                <li><a href="/gallery">Gallery</a></li>
                                                ${!req.session.userId ? 
                                                    '<li><a href="/login">Login</a></li>' : 
                                                    '<li><a href="/admin/dashboard">Dashboard</a></li>'
                                                }
                                            </ul>
                                        </nav>
                                    </div>
                                </header>
                                
                                <div class="container">
                                    <!-- BEFORE VIDEOS INJECTION -->
                                    ${beforeVideosInjection}
                                    
                                    <!-- 1. VIDEO GALLERY SECTION (TOP PRIORITY) -->
                                    <h2 class="section-title">🎥 Featured Videos</h2>
                                    <div class="video-gallery">
                                        ${videoHTML || '<p style="width:100%; text-align:center;">No videos yet. Be the first to upload!</p>'}
                                    </div>
                                    
                                    <!-- AFTER VIDEOS INJECTION -->
                                    ${afterVideosInjection}
                                    
                                    <!-- 2. PLACEHOLDER PICTURES SECTION -->
                                    ${placeholders.length > 0 ? `
                                        <h2 class="section-title">🖼️ Featured Images</h2>
                                        <div class="placeholder-grid">
                                            ${placeholderHTML}
                                        </div>
                                    ` : ''}
                                    
                                    <!-- BEFORE BLOG INJECTION -->
                                    ${beforeBlogInjection}
                                    
                                    <!-- 3. BLOG SECTION -->
                                    ${settings.show_blog_on_home === 'true' && posts.length > 0 ? `
                                        <h2 class="section-title">📝 Latest Blog Posts</h2>
                                        <div class="blog-grid">
                                            ${blogHTML}
                                        </div>
                                        <div style="text-align:center; margin:30px 0;">
                                            <a href="/blog" style="color:${settings.primary_color};">View All Posts →</a>
                                        </div>
                                    ` : ''}
                                    
                                    <!-- AFTER BLOG INJECTION -->
                                    ${afterBlogInjection}
                                    
                                    <!-- 4. GALLERY SECTION -->
                                    ${settings.show_gallery_on_home === 'true' && gallery.length > 0 ? `
                                        <h2 class="section-title">📸 Recent Uploads</h2>
                                        <div class="gallery-grid">
                                            ${galleryHTML.slice(0, 8)} <!-- Show first 8 -->
                                        </div>
                                        <div style="text-align:center; margin:30px 0;">
                                            <a href="/gallery" style="color:${settings.primary_color};">View Full Gallery →</a>
                                        </div>
                                    ` : ''}
                                </div>
                                
                                <footer>
                                    <div class="container">
                                        <p>&copy; 2024 ${settings.site_name}. All rights reserved.</p>
                                    </div>
                                </footer>
                                
                                <!-- BODY END INJECTION -->
                                ${bodyEndInjection}
                                
                                <!-- Admin Button (Only visible to logged in users) -->
                                ${req.session.userId ? `
                                    <a href="/admin/dashboard" class="admin-btn">⚙️ Admin Console</a>
                                ` : ''}
                                
                                <script>
                                    function playVideo(id) {
                                        const video = document.getElementById('video-' + id);
                                        const thumbnail = video.previousElementSibling;
                                        thumbnail.style.display = 'none';
                                        video.style.display = 'block';
                                        video.play();
                                        
                                        // Track view
                                        fetch('/api/track-video-view/' + id, { method: 'POST' });
                                    }
                                    
                                    ${customJS}
                                </script>
                            </body>
                            </html>`);
                        });
                    });
                });
            });
        });
    });
}

function platformHomeHTML() {
    return `<!DOCTYPE html>
    <html>
    <head>
        <title>3eesher.cloud Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                text-align: center;
            }
            .container { max-width: 800px; padding: 20px; }
            h1 { font-size: 48px; margin-bottom: 20px; }
            .btn {
                display: inline-block;
                padding: 15px 40px;
                background: white;
                color: #667eea;
                text-decoration: none;
                border-radius: 50px;
                margin: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>☁️ 3eesher.cloud</h1>
            <p>The Ultimate Video Gallery & Blog Platform</p>
            <a href="/admin/dashboard" class="btn">Platform Admin</a>
        </div>
    </body>
    </html>`;
}

// ==================== ADMIN DASHBOARD ====================
app.get('/admin/dashboard', (req, res) => {
    if (!req.session.userId && !req.isPlatform) {
        return res.redirect('/login');
    }
    
    if (req.isPlatform) {
        masterDb.all(`SELECT * FROM sites`, [], (err, sites) => {
            res.send(platformAdminHTML(sites));
        });
        return;
    }
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    siteDb.all(`SELECT * FROM users`, [], (err, users) => {
        siteDb.all(`SELECT * FROM videos ORDER BY created_date DESC`, [], (err, videos) => {
            siteDb.all(`SELECT * FROM placeholders ORDER BY display_order`, [], (err, placeholders) => {
                siteDb.all(`SELECT * FROM posts ORDER BY created_date DESC`, [], (err, posts) => {
                    siteDb.all(`SELECT * FROM gallery ORDER BY created_date DESC`, [], (err, gallery) => {
                        siteDb.all(`SELECT * FROM injections`, [], (err, injections) => {
                            siteDb.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
                                
                                const settings = {};
                                settingsRows.forEach(s => settings[s.key] = s.value);
                                
                                res.send(adminDashboardHTML(settings, users, videos, placeholders, posts, gallery, injections, req.siteName));
                            });
                        });
                    });
                });
            });
        });
    });
});

function platformAdminHTML(sites) {
    return `<!DOCTYPE html>
    <html>
    <head>
        <title>Platform Admin</title>
        <style>
            body { font-family: Arial; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            input { width: 100%; padding: 10px; margin: 10px 0; }
            button { padding: 10px 20px; background: #667eea; color: white; border: none; cursor: pointer; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Platform Admin</h1>
            
            <div class="card">
                <h2>Create New Site</h2>
                <form method="POST" action="/api/create-site">
                    <input type="text" name="name" placeholder="Site Name" required>
                    <button type="submit">Create Site</button>
                </form>
            </div>
            
            <div class="card">
                <h2>Sites</h2>
                <table>
                    <tr>
                        <th>Name</th>
                        <th>Domain</th>
                        <th>Created</th>
                    </tr>
                    ${sites.map(s => `
                        <tr>
                            <td>${s.name}</td>
                            <td>${s.domain || 'subdomain'}</td>
                            <td>${new Date(s.created_date).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </div>
    </body>
    </html>`;
}

function adminDashboardHTML(settings, users, videos, placeholders, posts, gallery, injections, siteName) {
    return `<!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard | ${siteName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body {
                font-family: 'Segoe UI', sans-serif;
                background: #f7f9fc;
                padding: 20px;
            }
            .container { max-width: 1400px; margin: 0 auto; }
            h1 { color: #333; margin-bottom: 30px; }
            .tabs {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 30px;
                background: white;
                padding: 20px;
                border-radius: 10px;
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
            }
            .tab-content.active { display: block; }
            
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                font-weight: 600;
                margin-bottom: 8px;
            }
            input, textarea, select {
                width: 100%;
                padding: 10px;
                border: 2px solid #e2e8f0;
                border-radius: 5px;
            }
            button {
                padding: 12px 24px;
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
            th { background: #f7f9fc; }
            .upload-box {
                border: 2px dashed #667eea;
                padding: 30px;
                text-align: center;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>⚙️ Admin Dashboard - ${siteName}</h1>
            
            <div class="tabs">
                <button class="tab-btn active" onclick="showTab('videos')">🎥 Videos</button>
                <button class="tab-btn" onclick="showTab('placeholders')">🖼️ Placeholders</button>
                <button class="tab-btn" onclick="showTab('blog')">📝 Blog</button>
                <button class="tab-btn" onclick="showTab('gallery')">📸 Gallery</button>
                <button class="tab-btn" onclick="showTab('injections')">💉 Injections</button>
                <button class="tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
                <button class="tab-btn" onclick="showTab('users')">👥 Users</button>
            </div>
            
            <!-- VIDEOS TAB -->
            <div id="videos-tab" class="tab-content active">
                <h2>Upload Video</h2>
                <form method="POST" action="/api/upload-video" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Video Title</label>
                        <input type="text" name="title" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Thumbnail (optional)</label>
                        <input type="file" name="thumbnail" accept="image/*">
                    </div>
                    <div class="upload-box">
                        <input type="file" name="video" accept="video/*" required>
                    </div>
                    <button type="submit">Upload Video</button>
                </form>
                
                <h3 style="margin-top:40px;">Videos</h3>
                <table>
                    <tr>
                        <th>Title</th>
                        <th>Views</th>
                        <th>Featured</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                    ${videos.map(v => `
                        <tr>
                            <td>${v.title}</td>
                            <td>${v.views}</td>
                            <td>${v.featured ? '⭐ Yes' : 'No'}</td>
                            <td>${new Date(v.created_date).toLocaleDateString()}</td>
                            <td>
                                <button onclick="toggleFeatured(${v.id})">Toggle Featured</button>
                                <button onclick="deleteVideo(${v.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </table>
            </div>
            
            <!-- PLACEHOLDERS TAB -->
            <div id="placeholders-tab" class="tab-content">
                <h2>Add Placeholder Image</h2>
                <form method="POST" action="/api/upload-placeholder" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="title" required>
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <select name="location">
                            <option value="hero">Hero Section</option>
                            <option value="featured">Featured</option>
                            <option value="gallery">Gallery</option>
                            <option value="sidebar">Sidebar</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Link URL (optional)</label>
                        <input type="text" name="link">
                    </div>
                    <div class="upload-box">
                        <input type="file" name="image" accept="image/*" required>
                    </div>
                    <button type="submit">Upload Placeholder</button>
                </form>
                
                <h3>Current Placeholders</h3>
                <table>
                    <tr>
                        <th>Title</th>
                        <th>Location</th>
                        <th>Order</th>
                        <th>Actions</th>
                    </tr>
                    ${placeholders.map(p => `
                        <tr>
                            <td>${p.title}</td>
                            <td>${p.location}</td>
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
                <form method="POST" action="/api/create-post" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="title" required>
                    </div>
                    <div class="form-group">
                        <label>Content</label>
                        <textarea name="content" rows="10" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Excerpt</label>
                        <textarea name="excerpt" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Featured Image</label>
                        <input type="file" name="image" accept="image/*">
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <input type="text" name="category">
                    </div>
                    <button type="submit">Publish Post</button>
                </form>
                
                <h3>Recent Posts</h3>
                <table>
                    <tr>
                        <th>Title</th>
                        <th>Views</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                    ${posts.map(p => `
                        <tr>
                            <td>${p.title}</td>
                            <td>${p.views}</td>
                            <td>${new Date(p.published_at).toLocaleDateString()}</td>
                            <td>
                                <button onclick="editPost(${p.id})">Edit</button>
                                <button onclick="deletePost(${p.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </table>
            </div>
            
            <!-- GALLERY TAB -->
            <div id="gallery-tab" class="tab-content">
                <h2>Upload to Gallery</h2>
                <form method="POST" action="/api/upload-gallery" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="title">
                    </div>
                    <div class="upload-box">
                        <input type="file" name="file" required>
                    </div>
                    <button type="submit">Upload to Gallery</button>
                </form>
                
                <h3>Gallery Items</h3>
                <table>
                    <tr>
                        <th>File</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                    ${gallery.map(g => `
                        <tr>
                            <td>${g.filename}</td>
                            <td>${g.file_type}</td>
                            <td>${new Date(g.created_date).toLocaleDateString()}</td>
                            <td>
                                <button onclick="deleteGallery(${g.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </table>
            </div>
            
            <!-- INJECTIONS TAB -->
            <div id="injections-tab" class="tab-content">
                <h2>Code Injections (Super Admin Only)</h2>
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(400px,1fr)); gap:20px;">
                    ${['head', 'body_start', 'before_videos', 'after_videos', 'before_blog', 'after_blog', 'body_end', 'custom_css', 'custom_js'].map(loc => {
                        const inj = injections.find(i => i.location === loc);
                        return `
                            <div style="background:#f8fafc; padding:20px; border-radius:10px;">
                                <h3>${loc.replace(/_/g,' ').toUpperCase()}</h3>
                                <textarea id="inj-${loc}" rows="6" style="width:100%; font-family:monospace;">${inj?.code || ''}</textarea>
                                <button onclick="saveInjection('${loc}')" style="margin-top:10px;">Save</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- SETTINGS TAB -->
            <div id="settings-tab" class="tab-content">
                <h2>Site Settings</h2>
                <form method="POST" action="/api/update-settings">
                    <div class="form-group">
                        <label>Site Name</label>
                        <input type="text" name="site_name" value="${settings.site_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Site Title</label>
                        <input type="text" name="site_title" value="${settings.site_title || ''}">
                    </div>
                    <div class="form-group">
                        <label>Site Description</label>
                        <textarea name="site_description">${settings.site_description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Primary Color</label>
                        <input type="color" name="primary_color" value="${settings.primary_color || '#667eea'}">
                    </div>
                    <div class="form-group">
                        <label>Secondary Color</label>
                        <input type="color" name="secondary_color" value="${settings.secondary_color || '#764ba2'}">
                    </div>
                    <div class="form-group">
                        <label>Videos Per Row</label>
                        <input type="number" name="videos_per_row" value="${settings.videos_per_row || '4'}">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="show_blog_on_home" value="true" ${settings.show_blog_on_home === 'true' ? 'checked' : ''}>
                            Show Blog on Homepage
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="show_gallery_on_home" value="true" ${settings.show_gallery_on_home === 'true' ? 'checked' : ''}>
                            Show Gallery on Homepage
                        </label>
                    </div>
                    <button type="submit">Save Settings</button>
                </form>
            </div>
            
            <!-- USERS TAB -->
            <div id="users-tab" class="tab-content">
                <h2>Users</h2>
                <table>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                    ${users.map(u => `
                        <tr>
                            <td>${u.username}</td>
                            <td>${u.email}</td>
                            <td>${u.role}</td>
                            <td>${u.approved ? '✅ Approved' : '⏳ Pending'}</td>
                            <td>
                                ${!u.approved ? `<button onclick="approveUser(${u.id})">Approve</button>` : ''}
                            </td>
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
            
            function saveInjection(location) {
                const code = document.getElementById('inj-' + location).value;
                
                fetch('/api/save-injection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ location, code })
                }).then(() => alert('Injection saved!'));
            }
            
            function toggleFeatured(id) {
                fetch('/api/toggle-featured/' + id, { method: 'POST' })
                    .then(() => window.location.reload());
            }
            
            function deleteVideo(id) {
                if (confirm('Delete this video?')) {
                    fetch('/api/delete-video/' + id, { method: 'POST' })
                        .then(() => window.location.reload());
                }
            }
            
            function deletePlaceholder(id) {
                if (confirm('Delete this placeholder?')) {
                    fetch('/api/delete-placeholder/' + id, { method: 'POST' })
                        .then(() => window.location.reload());
                }
            }
            
            function deletePost(id) {
                if (confirm('Delete this post?')) {
                    fetch('/api/delete-post/' + id, { method: 'POST' })
                        .then(() => window.location.reload());
                }
            }
            
            function deleteGallery(id) {
                if (confirm('Delete this item?')) {
                    fetch('/api/delete-gallery/' + id, { method: 'POST' })
                        .then(() => window.location.reload());
                }
            }
            
            function approveUser(id) {
                fetch('/api/approve-user/' + id, { method: 'POST' })
                    .then(() => window.location.reload());
            }
            
            function editPost(id) {
                alert('Edit post ' + id + ' - Add modal in production');
            }
        </script>
    </body>
    </html>`;
}

// ==================== API ROUTES ====================

// Upload video
app.post('/api/upload-video', uploadVideo.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    const videoFile = req.files['video']?.[0];
    const thumbFile = req.files['thumbnail']?.[0];
    
    if (videoFile) {
        siteDb.run(`INSERT INTO videos (title, filename, thumbnail, description, uploader_id, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
            [req.body.title, videoFile.filename, thumbFile?.filename, req.body.description, req.session.userId, new Date().toISOString()]);
    }
    
    siteDb.close();
    res.redirect('/admin/dashboard');
});

// Upload placeholder
app.post('/api/upload-placeholder', uploadImage.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    siteDb.run(`INSERT INTO placeholders (title, filename, location, link, uploader_id, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.body.title, req.file.filename, req.body.location, req.body.link, req.session.userId, new Date().toISOString()]);
    
    siteDb.close();
    res.redirect('/admin/dashboard');
});

// Create post
app.post('/api/create-post', uploadImage.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    const slug = req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    siteDb.run(`INSERT INTO posts (title, slug, content, excerpt, featured_image, category, author_id, published_at, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.body.title, slug, req.body.content, req.body.excerpt, req.file?.filename, req.body.category, req.session.userId, new Date().toISOString(), new Date().toISOString()]);
    
    siteDb.close();
    res.redirect('/admin/dashboard');
});

// Upload to gallery
app.post('/api/upload-gallery', uploadImage.single('file'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    const fileType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    
    siteDb.run(`INSERT INTO gallery (title, filename, file_type, uploader_id, created_date) VALUES (?, ?, ?, ?, ?)`,
        [req.body.title || req.file.originalname, req.file.filename, fileType, req.session.userId, new Date().toISOString()]);
    
    siteDb.close();
    res.redirect('/admin/dashboard');
});

// Save injection
app.post('/api/save-injection', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    const { location, code } = req.body;
    
    siteDb.run(`INSERT OR REPLACE INTO injections (location, code) VALUES (?, ?)`,
        [location, code]);
    
    siteDb.close();
    res.json({ success: true });
});

// Toggle featured
app.post('/api/toggle-featured/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    siteDb.run(`UPDATE videos SET featured = NOT featured WHERE id = ?`, [req.params.id]);
    siteDb.close();
    
    res.json({ success: true });
});

// Track video view
app.post('/api/track-video-view/:id', (req, res) => {
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    siteDb.run(`UPDATE videos SET views = views + 1 WHERE id = ?`, [req.params.id]);
    siteDb.close();
    
    res.json({ success: true });
});

// Delete video
app.post('/api/delete-video/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    // Get filename first
    siteDb.get(`SELECT filename FROM videos WHERE id = ?`, [req.params.id], (err, row) => {
        if (row) {
            try {
                fs.unlinkSync(path.join(UPLOADS_FOLDER, row.filename));
            } catch (e) {}
        }
        
        siteDb.run(`DELETE FROM videos WHERE id = ?`, [req.params.id]);
        siteDb.close();
        res.json({ success: true });
    });
});

// Delete placeholder
app.post('/api/delete-placeholder/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    siteDb.get(`SELECT filename FROM placeholders WHERE id = ?`, [req.params.id], (err, row) => {
        if (row) {
            try {
                fs.unlinkSync(path.join(UPLOADS_FOLDER, row.filename));
            } catch (e) {}
        }
        
        siteDb.run(`DELETE FROM placeholders WHERE id = ?`, [req.params.id]);
        siteDb.close();
        res.json({ success: true });
    });
});

// Delete post
app.post('/api/delete-post/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    siteDb.get(`SELECT featured_image FROM posts WHERE id = ?`, [req.params.id], (err, row) => {
        if (row?.featured_image) {
            try {
                fs.unlinkSync(path.join(UPLOADS_FOLDER, row.featured_image));
            } catch (e) {}
        }
        
        siteDb.run(`DELETE FROM posts WHERE id = ?`, [req.params.id]);
        siteDb.close();
        res.json({ success: true });
    });
});

// Delete gallery
app.post('/api/delete-gallery/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    siteDb.get(`SELECT filename FROM gallery WHERE id = ?`, [req.params.id], (err, row) => {
        if (row) {
            try {
                fs.unlinkSync(path.join(UPLOADS_FOLDER, row.filename));
            } catch (e) {}
        }
        
        siteDb.run(`DELETE FROM gallery WHERE id = ?`, [req.params.id]);
        siteDb.close();
        res.json({ success: true });
    });
});

// Update settings
app.post('/api/update-settings', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    Object.entries(req.body).forEach(([key, value]) => {
        siteDb.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });
    
    siteDb.close();
    res.redirect('/admin/dashboard');
});

// Approve user
app.post('/api/approve-user/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const siteDbPath = path.join(req.siteFolder, 'site.db');
    const siteDb = new sqlite3.Database(siteDbPath);
    
    siteDb.run(`UPDATE users SET approved = 1 WHERE id = ?`, [req.params.id]);
    siteDb.close();
    
    res.json({ success: true });
});

// Create site
app.post('/api/create-site', (req, res) => {
    const { name } = req.body;
    const folder = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const siteFolder = path.join(SITES_FOLDER, folder);
    
    fs.mkdirSync(siteFolder, { recursive: true });
    
    masterDb.run(`INSERT INTO sites (name, folder, created_date) VALUES (?, ?, ?)`,
        [name, folder, new Date().toISOString()]);
    
    initSiteDb(siteFolder);
    
    res.redirect('/admin/dashboard');
});

// ==================== LOGIN ====================
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html>
    <html>
    <head>
        <title>Login</title>
        <style>
            body {
                font-family: Arial;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .login-box {
                background: white;
                padding: 40px;
                border-radius: 10px;
                width: 300px;
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
            <h2>Login</h2>
            <form method="POST" action="/api/login">
                <input type="text" name="username" placeholder="Username" value="admin" required>
                <input type="password" name="password" placeholder="Password" value="admin123" required>
                <button type="submit">Login</button>
            </form>
        </div>
    </body>
    </html>`;
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (req.isPlatform) {
        if (username === 'admin' && password === SUPER_ADMIN_PASSWORD) {
            req.session.userId = 1;
            req.session.username = 'admin';
            req.session.userRole = 'super_admin';
            return res.redirect('/admin/dashboard');
        }
    } else {
        const siteDbPath = path.join(req.siteFolder, 'site.db');
        const siteDb = new sqlite3.Database(siteDbPath);
        
        siteDb.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
            if (user && bcrypt.compareSync(password, user.password)) {
                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.userRole = user.role;
                siteDb.close();
                res.redirect('/admin/dashboard');
            } else {
                siteDb.close();
                res.send('Invalid login');
            }
        });
        return;
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3eesher.cloud running on http://localhost:${PORT}`);
    console.log(`📝 Login: admin / admin123`);
    console.log(`✅ Main page shows: Videos → Placeholders → Blog → Gallery`);
});
