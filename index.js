// ==========================================================
// 3EESHER CLOUD - FULL DYNAMIC ENGINE (SECURE LIBRARY VER.)
// ==========================================================
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');

// 🔐 FIREBASE SECURE CONNECTION
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://allarbaa-com-default-rtdb.firebaseio.com"
});
const db = admin.database();
const app = express();
const PORT = process.env.PORT || 3000;

// --- APP CONFIG ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(session({
    secret: '3eesher-ultra-secure-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 Week Session
}));

// --- STORAGE FOR MOBILE UPLOADS ---
const upload = multer({ dest: 'uploads/' });

// ==========================================================
// 1. THE LAYOUT ENGINE (HANDLES INJECTIONS & MENUS)
// ==========================================================
async function getLayout(title, content, req) {
    const injections = await db.ref('site_injections').once('value');
    let headInject = ''; let bodyInject = '';
    injections.forEach(s => {
        if (s.val().active) {
            if (s.val().position === 'head') headInject += s.val().code;
            if (s.val().position === 'body') bodyInject += s.val().code;
        }
    });

    const stores = await db.ref('money_links').limitToFirst(30).once('value');
    let storeBar = '';
    stores.forEach(s => { storeBar += `<a href="/go/${s.val().slug}" class="s-link">${s.val().name}</a>`; });

    const userMenu = req.session.userId 
        ? `<a href="/logout">Logout</a>` 
        : `<a href="/login">Login/Register</a>`;

    return `
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | 3EESHER CLOUD</title>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-HD01MF5SL9"></script>
        <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-HD01MF5SL9');</script>
        ${headInject}
        <style>
            :root { --main: #2563eb; --bg: #0b0e14; --card: #161b22; }
            body { background: var(--bg); color: white; font-family: sans-serif; margin: 0; }
            nav { background: #1c2128; padding: 15px 5%; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--main); }
            .money-strip { background: #1e293b; padding: 10px; overflow-x: auto; white-space: nowrap; text-align: center; border-bottom: 1px solid #333; }
            .s-link { background: var(--main); color: white; padding: 5px 12px; border-radius: 20px; text-decoration: none; margin: 0 5px; font-size: 12px; }
            .container { max-width: 1200px; margin: auto; padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
            .card { background: var(--card); border-radius: 12px; overflow: hidden; border: 1px solid #333; }
            .btn { background: var(--main); color: white; padding: 10px; border-radius: 5px; text-decoration: none; display: inline-block; }
        </style>
    </head>
    <body>
        ${bodyInject}
        <nav>
            <a href="/" style="font-size: 22px; font-weight: 800; color: var(--main); text-decoration: none;">3EESHER CLOUD</a>
            <div class="menu">
                <a href="/" style="color:white; text-decoration:none; margin-left:15px;">Home</a>
                <a href="/library" style="color:white; text-decoration:none; margin-left:15px;">Library</a>
                ${userMenu}
            </div>
        </nav>
        <div class="money-strip">${storeBar}</div>
        <div class="container">${content}</div>
    </body>
    </html>`;
}

// ==========================================================
// 2. AUTHENTICATION (GMAIL/PASSWORD LOGIN)
// ==========================================================
app.get('/login', async (req, res) => {
    const form = `
    <div style="max-width:400px; margin: 100px auto; background:#161b22; padding:30px; border-radius:10px; border:1px solid #333;">
        <h2>Join 3EESHER CLOUD</h2>
        <p>Login or Register to access the Library</p>
        <form action="/auth/action" method="POST">
            <input type="email" name="email" placeholder="Gmail Address" required style="width:100%; padding:10px; margin-bottom:10px; background:#0b0e14; color:white; border:1px solid #444;">
            <input type="password" name="password" placeholder="Password" required style="width:100%; padding:10px; margin-bottom:15px; background:#0b0e14; color:white; border:1px solid #444;">
            <button type="submit" class="btn" style="width:100%;">Enter Library</button>
        </form>
    </div>`;
    res.send(await getLayout("Login", form, req));
});

app.post('/auth/action', async (req, res) => {
    const { email, password } = req.body;
    const userSnap = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    
    if (userSnap.exists()) {
        const user = Object.values(userSnap.val())[0];
        if (bcrypt.compareSync(password, user.password)) {
            req.session.userId = email;
            req.session.role = user.role || 'member';
            return res.redirect('/library');
        }
    } else {
        // Auto-Register new users
        const hash = bcrypt.hashSync(password, 10);
        await db.ref('users').push({ email, password: hash, role: 'member' });
        req.session.userId = email;
        res.redirect('/library');
    }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// ==========================================================
// 3. SECURE LIBRARY (LOCKED)
// ==========================================================
app.get('/library', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    const bSnap = await db.ref('ebooks').once('value');
    let content = '<h1>Premium Programming Library</h1><div class="grid">';
    bSnap.forEach(b => {
        content += `<div class="card" style="padding:15px;">
            <h3>${b.val().title}</h3>
            <p>${b.val().description || 'Professional Tech Guide'}</p>
            <a href="/library/read/${b.key}" class="btn">READ BOOK</a>
        </div>`;
    });
    content += '</div>';
    res.send(await getLayout("Library", content, req));
});

// ==========================================================
// 4. MAIN HOMEPAGE (PUBLIC VIDEOS)
// ==========================================================
app.get('/', async (req, res) => {
    const vSnap = await db.ref('videos').once('value');
    let grid = '<div class="grid">';
    vSnap.forEach(v => {
        grid += `<div class="card"><video controls preload="none" style="width:100%"><source src="${v.val().filename}"></video><div style="padding:15px;"><h4>${v.val().title}</h4></div></div>`;
    });
    grid += '</div>';
    res.send(await getLayout("Home", grid, req));
});

// ==========================================================
// 5. SUPER ADMIN (MANAGEMENT)
// ==========================================================
app.get('/admin/super-console', async (req, res) => {
    if (req.session.role !== 'super_admin') return res.send("Unauthorized. Log in as Super Admin.");
    
    res.send(`
    <body style="font-family:sans-serif; padding:20px; background:#f4f4f4;">
        <h1>3EESHER CONSOLE</h1>
        <div style="background:white; padding:20px; border-radius:10px; margin-bottom:20px;">
            <h3>System Code Injection (Adjust Website)</h3>
            <form action="/admin/inject" method="POST">
                <select name="position"><option value="head">Head</option><option value="body">Body</option></select><br>
                <textarea name="code" rows="5" style="width:100%; margin-top:10px;"></textarea><br>
                <button type="submit" class="btn">Apply Code</button>
            </form>
        </div>
        <div style="background:white; padding:20px; border-radius:10px;">
            <h3>Sync New Video</h3>
            <form action="/admin/publish-video" method="POST" enctype="multipart/form-data">
                <input name="title" placeholder="Title"><br>
                <input type="file" name="videoFile" accept="video/*"><br>
                <button type="submit" class="btn">Upload</button>
            </form>
        </div>
    </body>`);
});

// --- ADMIN HANDLERS ---
app.post('/admin/inject', async (req, res) => {
    await db.ref('site_injections').push({ position: req.body.position, code: req.body.code, active: true });
    res.redirect('/');
});

app.post('/admin/publish-video', upload.single('videoFile'), async (req, res) => {
    await db.ref('videos').push({ title: req.body.title, filename: `/uploads/${req.file.filename}` });
    res.redirect('/');
});

app.get('/go/:slug', async (req, res) => {
    const snap = await db.ref('money_links').orderByChild('slug').equalTo(req.params.slug).once('value');
    if (snap.exists()) {
        const key = Object.keys(snap.val())[0];
        await db.ref('money_links').child(key).update({ clicks: (snap.val()[key].clicks || 0) + 1 });
        return res.redirect(snap.val()[key].url);
    }
    res.redirect('/');
});

// ==========================================================
// 6. INITIALIZE
// ==========================================================
app.listen(PORT, '0.0.0.0', async () => {
    console.log("3EESHER CLOUD Ready");
    const adminEmail = 'admin@3eesher.cloud';
    const check = await db.ref('users').orderByChild('email').equalTo(adminEmail).once('value');
    if (!check.exists()) {
        const hash = bcrypt.hashSync('admin123', 10);
        await db.ref('users').push({ email: adminEmail, password: hash, role: 'super_admin' });
    }
});
