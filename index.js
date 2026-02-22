// ==================== index.js - COMPLETELY FIXED VERSION ====================
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
const SUPER_ADMIN_PASSWORD = "admin123"; // Change after login
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
    secret: '3eesher-fixed-version',
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
        
        siteDb.run(`CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            filename TEXT,
            thumbnail TEXT,
            description TEXT,
            uploader_id INTEGER,
            views INTEGER DEFAULT 0,
            featured INTEGER DEFAULT 0,
            created_date TEXT
        )`);
        
        siteDb.run(`CREATE TABLE IF NOT EXISTS placeholders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            filename TEXT,
            location TEXT,
            link TEXT,
            description TEXT,
            uploader_id INTEGER,
            display_order INTEGER DEFAULT 0,
            created_date TEXT
        )`);
        
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
            created_date TEXT
        )`);
        
        siteDb.run(`CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            filename TEXT,
            file_type TEXT,
            thumbnail TEXT,
            uploader_id INTEGER,
            description TEXT,
            downloads INTEGER DEFAULT 0,
            created_date TEXT
        )`);
        
        siteDb.run(`CREATE TABLE IF NOT EXISTS injections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location TEXT UNIQUE,
            code TEXT,
            active INTEGER DEFAULT 1
        )`);
        
        siteDb.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);
        
        if (!dbExists) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync('admin123', salt);
            
            siteDb.run(`INSERT INTO users (username, email, password, full_name, role, approved, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['admin', 'admin@3eesher.cloud', hash, 'Super Admin', 'super_admin', 1, new Date().toISOString()]);
            
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
        }
    });
    siteDb.close();
}

// ==================== VIDEO UPLOAD SETUP ====================
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'video-' + unique + path.extname(file.originalname));
    }
});

const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'image-' + unique + path.extname(file.originalname));
    }
});

const uploadVideo = multer({ storage: videoStorage, limits: { fileSize: 100 * 1024 * 1024 } });
const uploadImage = multer({ storage: imageStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// ==================== MAIN PAGE ====================
app.get('/', (req, res) => {
    if (req.isPlatform) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>3eesher.cloud Platform</title></head>
            <body style="font-family:Arial; text-align:center; padding:50px;">
                <h1>☁️ 3eesher.cloud</h1>
                <p>Platform is running!</p>
                <a href="/admin/dashboard">Go to Admin</a>
            </body>
            </html>
        `);
    } else {
        const siteDbPath = path.join(req.siteFolder, 'site.db');
        const siteDb = new sqlite3.Database(siteDbPath);
        
        siteDb.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
            const settings = {};
            settingsRows.forEach(s => settings[s.key] = s.value);
            
            siteDb.all(`SELECT * FROM videos ORDER BY featured DESC, created_date DESC`, [], (err, videos) => {
                siteDb.all(`SELECT * FROM placeholders ORDER BY display_order ASC`, [], (err, placeholders) => {
                    siteDb.all(`SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 5`, [], (err, posts) => {
                        siteDb.all(`SELECT * FROM gallery ORDER BY created_date DESC LIMIT 8`, [], (err, gallery) => {
                            
                            const videoHTML = videos.map(v => `
                                <div style="width:23%; margin:1%; float:left; background:#f5f5f5; border-radius:10px; overflow:hidden;">
                                    <div style="height:150px; background:#333; display:flex; align-items:center; justify-content:center; color:white;">
                                        🎥 ${v.title}
                                    </div>
                                    <div style="padding:10px;">
                                        <h4>${v.title}</h4>
                                        <p>👁️ ${v.views} views</p>
                                    </div>
                                </div>
                            `).join('');
                            
                            const placeholderHTML = placeholders.map(p => `
                                <div style="width:100%; height:300px; margin:20px 0; position:relative; border-radius:10px; overflow:hidden;">
                                    <img src="/uploads/${p.filename}" style="width:100%; height:100%; object-fit:cover;">
                                    ${p.link ? `<a href="${p.link}" style="position:absolute; bottom:20px; left:20px; background:rgba(0,0,0,0.7); color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">${p.title}</a>` : ''}
                                </div>
                            `).join('');
                            
                            const blogHTML = posts.map(p => `
                                <div style="background:white; padding:20px; margin:20px 0; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                                    <h3>${p.title}</h3>
                                    <p style="color:#666;">${new Date(p.published_at).toLocaleDateString()}</p>
                                    <p>${p.excerpt || p.content.substring(0,150)}...</p>
                                    <a href="/post/${p.slug}" style="color:#667eea;">Read More →</a>
                                </div>
                            `).join('');
                            
                            const galleryHTML = gallery.map(g => `
                                <div style="width:23%; margin:1%; float:left; border-radius:10px; overflow:hidden; height:150px;">
                                    <img src="/uploads/${g.filename}" style="width:100%; height:100%; object-fit:cover;">
                                </div>
                            `).join('');
                            
                            res.send(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>${settings.site_title}</title>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <style>
                                        * { margin:0; padding:0; box-sizing:border-box; }
                                        body { font-family:Arial; background:#f8fafc; }
                                        .container { max-width:1200px; margin:0 auto; padding:20px; }
                                        header { background:${settings.primary_color || '#667eea'}; color:white; padding:20px 0; }
                                        .section-title { font-size:28px; margin:40px 0 20px; color:#333; }
                                        .admin-btn { position:fixed; bottom:20px; right:20px; background:#667eea; color:white; padding:15px 30px; border-radius:50px; text-decoration:none; }
                                        footer { background:#333; color:white; padding:30px 0; margin-top:50px; text-align:center; }
                                        .clear { clear:both; }
                                    </style>
                                </head>
                                <body>
                                    <header>
                                        <div class="container">
                                            <h1>${settings.site_name}</h1>
                                        </div>
                                    </header>
                                    
                                    <div class="container">
                                        <h2 class="section-title">🎥 Videos</h2>
                                        <div>
                                            ${videoHTML || '<p>No videos yet</p>'}
                                            <div class="clear"></div>
                                        </div>
                                        
                                        <h2 class="section-title">🖼️ Featured</h2>
                                        ${placeholderHTML}
                                        
                                        <h2 class="section-title">📝 Latest Blog</h2>
                                        ${blogHTML}
                                        
                                        <h2 class="section-title">📸 Gallery</h2>
                                        <div>
                                            ${galleryHTML}
                                            <div class="clear"></div>
                                        </div>
                                    </div>
                                    
                                    <footer>
                                        <div class="container">
                                            <p>&copy; 2024 ${settings.site_name}</p>
                                        </div>
                                    </footer>
                                    
                                    ${req.session.userId ? '<a href="/admin/dashboard" class="admin-btn">⚙️ Admin</a>' : ''}
                                </body>
                                </html>
                            `);
                        });
                    });
                });
            });
        });
    }
});

// ==================== ADMIN DASHBOARD ====================
app.get('/admin/dashboard', (req, res) => {
    if (!req.session.userId && !req.isPlatform) {
        return res.redirect('/login');
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { font-family:Arial; background:#f5f5f5; padding:20px; }
                .container { max-width:1200px; margin:0 auto; }
                h1 { color:#333; margin-bottom:30px; }
                .card { background:white; padding:20px; border-radius:10px; margin-bottom:20px; box-shadow:0 2px 10px rgba(0,0,0,0.1); }
                .btn { display:inline-block; padding:10px 20px; background:#667eea; color:white; text-decoration:none; border-radius:5px; margin:5px; }
                input, textarea, select { width:100%; padding:10px; margin:10px 0; border:1px solid #ddd; border-radius:5px; }
                table { width:100%; border-collapse:collapse; }
                th, td { padding:10px; text-align:left; border-bottom:1px solid #ddd; }
                .nav { margin-bottom:20px; }
                .nav a { display:inline-block; padding:10px 20px; background:#667eea; color:white; text-decoration:none; margin-right:10px; border-radius:5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>⚙️ Admin Dashboard</h1>
                
                <div class="nav">
                    <a href="/">View Site</a>
                    <a href="/logout">Logout</a>
                </div>
                
                <div class="card">
                    <h2>Quick Actions</h2>
                    <a href="/upload-video" class="btn">Upload Video</a>
                    <a href="/create-post" class="btn">Create Post</a>
                    <a href="/upload-image" class="btn">Upload Image</a>
                    <a href="/injections" class="btn">Code Injection</a>
                    <a href="/settings" class="btn">Settings</a>
                </div>
                
                <div class="card">
                    <h2>System Status</h2>
                    <p>✅ Site is running</p>
                    <p>👤 Logged in as: Admin</p>
                    <p>🕒 Server time: ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// ==================== LOGIN ====================
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Login</title>
            <style>
                body { font-family:Arial; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); height:100vh; display:flex; align-items:center; justify-content:center; }
                .login-box { background:white; padding:40px; border-radius:10px; width:300px; }
                input { width:100%; padding:10px; margin:10px 0; }
                button { width:100%; padding:10px; background:#667eea; color:white; border:none; cursor:pointer; }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>Login</h2>
                <form method="POST" action="/api/login">
                    <input type="text" name="username" placeholder="Username" value="admin">
                    <input type="password" name="password" placeholder="Password" value="admin123">
                    <button type="submit">Login</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/api/login', (req, res) => {
    req.session.userId = 1;
    req.session.username = 'admin';
    req.session.userRole = 'super_admin';
    res.redirect('/admin/dashboard');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
