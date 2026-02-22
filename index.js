// ==================== SIMPLIFIED WORKING VERSION ====================
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
    secret: 'simple-3eesher',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// --- DATABASE ---
const db = new sqlite3.Database('./site.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'viewer'
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        description TEXT,
        views INTEGER DEFAULT 0,
        created_date TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        created_date TEXT
    )`);
    
    // Create default admin
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
        ['admin', hash, 'super_admin']);
});

// --- UPLOAD SETUP ---
const upload = multer({ dest: UPLOADS_FOLDER });

// ==================== MAIN PAGE ====================
app.get('/', (req, res) => {
    db.all(`SELECT * FROM videos ORDER BY created_date DESC`, [], (err, videos) => {
        db.all(`SELECT * FROM posts ORDER BY created_date DESC LIMIT 5`, [], (err, posts) => {
            
            const videoHTML = videos.map(v => `
                <div style="width:23%; margin:1%; float:left; background:#f5f5f5; padding:10px; border-radius:10px;">
                    <h4>${v.title}</h4>
                    <video width="100%" controls>
                        <source src="/uploads/${v.filename}" type="video/mp4">
                    </video>
                    <p>👁️ ${v.views} views</p>
                </div>
            `).join('');
            
            const postHTML = posts.map(p => `
                <div style="background:white; padding:20px; margin:20px 0; border-radius:10px;">
                    <h3>${p.title}</h3>
                    <p>${p.content.substring(0, 200)}...</p>
                </div>
            `).join('');
            
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>3eesher.cloud</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        * { margin:0; padding:0; box-sizing:border-box; }
                        body { font-family:Arial; background:#f0f2f5; }
                        .container { max-width:1200px; margin:0 auto; padding:20px; }
                        header { background:#667eea; color:white; padding:20px 0; text-align:center; }
                        .section-title { font-size:28px; margin:40px 0 20px; }
                        .admin-btn { position:fixed; bottom:20px; right:20px; background:#667eea; color:white; padding:15px 30px; border-radius:50px; text-decoration:none; }
                        .clear { clear:both; }
                    </style>
                </head>
                <body>
                    <header>
                        <div class="container">
                            <h1>3eesher.cloud</h1>
                        </div>
                    </header>
                    
                    <div class="container">
                        <h2 class="section-title">🎥 Videos</h2>
                        <div>${videoHTML || '<p>No videos yet</p>'}<div class="clear"></div></div>
                        
                        <h2 class="section-title">📝 Latest Posts</h2>
                        ${postHTML || '<p>No posts yet</p>'}
                    </div>
                    
                    ${req.session.userId ? '<a href="/admin" class="admin-btn">⚙️ Admin</a>' : ''}
                </body>
                </html>
            `);
        });
    });
});

// ==================== ADMIN ====================
app.get('/admin', (req, res) => {
    if (!req.session.userId) {
        res.send(`
            <form method="POST" action="/login" style="max-width:300px; margin:100px auto; padding:20px; background:white; border-radius:10px;">
                <h2>Login</h2>
                <input type="text" name="username" value="admin" style="width:100%; padding:10px; margin:10px 0;">
                <input type="password" name="password" value="admin123" style="width:100%; padding:10px; margin:10px 0;">
                <button type="submit" style="width:100%; padding:10px; background:#667eea; color:white; border:none;">Login</button>
            </form>
        `);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Admin</title></head>
            <body style="padding:20px;">
                <h1>Admin Dashboard</h1>
                <h2>Upload Video</h2>
                <form method="POST" action="/upload" enctype="multipart/form-data">
                    <input type="text" name="title" placeholder="Video Title" required><br>
                    <input type="file" name="video" accept="video/*" required><br>
                    <button type="submit">Upload</button>
                </form>
                
                <h2>Create Post</h2>
                <form method="POST" action="/post">
                    <input type="text" name="title" placeholder="Post Title" required><br>
                    <textarea name="content" placeholder="Content" rows="5" required></textarea><br>
                    <button type="submit">Create Post</button>
                </form>
                
                <p><a href="/">View Site</a> | <a href="/logout">Logout</a></p>
            </body>
            </html>
        `);
    }
});

// ==================== API ROUTES ====================
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

app.post('/upload', upload.single('video'), (req, res) => {
    if (!req.session.userId) return res.redirect('/admin');
    db.run(`INSERT INTO videos (title, filename, created_date) VALUES (?, ?, ?)`,
        [req.body.title, req.file.filename, new Date().toISOString()]);
    res.redirect('/admin');
});

app.post('/post', (req, res) => {
    if (!req.session.userId) return res.redirect('/admin');
    db.run(`INSERT INTO posts (title, content, created_date) VALUES (?, ?, ?)`,
        [req.body.title, req.body.content, new Date().toISOString()]);
    res.redirect('/admin');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Visit: http://localhost:${PORT}`);
    console.log(`👤 Login: admin / admin123`);
});
