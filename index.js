// ==========================================================
// 3EESHER CLOUD - DYNAMIC INJECTION & LAYOUT ENGINE (2026)
// ==========================================================
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');

// 🔐 FIREBASE SECURE SETUP
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://allarbaa-com-default-rtdb.firebaseio.com",
  storageBucket: "allarbaa-com.appspot.com"
});
const db = admin.database();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(session({ secret: '3eesher-injection-system', resave: false, saveUninitialized: true }));

// ==========================================================
// 1. DYNAMIC PAGE BUILDER (THE "BRAIN")
// ==========================================================
async function getDynamicLayout() {
    const injections = await db.ref('site_injections').once('value');
    let headExtra = '';
    let bodyExtra = '';
    let footerExtra = '';

    injections.forEach(child => {
        const data = child.val();
        if (data.active) {
            if (data.position === 'head') headExtra += data.code;
            if (data.position === 'body_start') bodyExtra += data.code;
            if (data.position === 'footer') footerExtra += data.code;
        }
    });

    return { headExtra, bodyExtra, footerExtra };
}

// ==========================================================
// 2. MAIN HOMEPAGE (FULLY ADJUSTABLE BY YOUR CODE)
// ==========================================================
app.get('/', async (req, res) => {
    const { headExtra, bodyExtra, footerExtra } = await getDynamicLayout();
    const vSnap = await db.ref('videos').once('value');
    
    let videoCards = '';
    vSnap.forEach(v => {
        videoCards += `<div class="v-card"><video controls style="width:100%"><source src="${v.val().filename}"></video><h4>${v.val().title}</h4></div>`;
    });

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>3EESHER CLOUD</title>
        <style id="base-styles">
            body { background: #0b0e14; color: white; font-family: sans-serif; margin:0; }
            .content-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding: 20px; }
            .v-card { background: #161b22; padding: 10px; border-radius: 8px; border: 1px solid #333; }
            header { background: #1c2128; padding: 20px; text-align:center; font-size: 24px; font-weight: bold; }
        </style>
        ${headExtra}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-HD01MF5SL9"></script>
        <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-HD01MF5SL9');</script>
    </head>
    <body>
        ${bodyExtra}

        <header>3EESHER CLOUD</header>
        
        <main class="content-grid" id="mainGrid">
            ${videoCards}
        </main>

        ${footerExtra}
    </body>
    </html>`);
});

// ==========================================================
// 3. SUPER ADMIN - THE INJECTOR CONSOLE
// ==========================================================
app.get('/admin/super-console', (req, res) => {
    res.send(`
    <style>
        body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
        .box { background: #f4f4f4; padding: 20px; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 20px; }
        textarea { width: 100%; font-family: monospace; padding: 10px; background: #2d2d2d; color: #82d082; }
        select, button { padding: 10px; margin-top: 10px; cursor: pointer; }
    </style>
    <h1>3EESHER CLOUD - System Injector</h1>
    
    <div class="box">
        <h3>Live Layout & Code Injection</h3>
        <p>Paste CSS, JavaScript, or HTML. It will automatically adjust the website live.</p>
        <form action="/admin/inject-code" method="POST">
            <label>Placement:</label><br>
            <select name="position">
                <option value="head">Inside Head (CSS / SEO)</option>
                <option value="body_start">Top of Body (Header Ads / Popups)</option>
                <option value="footer">Footer (Tracking / Scripts)</option>
            </select>
            <br><br>
            <textarea name="code" rows="10" placeholder="<style> body { background: red !important; } </style>"></textarea>
            <br>
            <button type="submit" style="background: #2563eb; color: white;">INJECT & SYNC WEBSITE</button>
        </form>
    </div>

    <div class="box">
        <h3>Manual Video Sync</h3>
        <form action="/admin/publish-video" method="POST" enctype="multipart/form-data">
            <input type="text" name="title" placeholder="Video Title" style="width: 100%; margin-bottom: 10px;">
            <input type="file" name="videoFile" accept="video/*">
            <button type="submit">Upload to Main Grid</button>
        </form>
    </div>
    `);
});

// ==========================================================
// 4. BACKEND HANDLERS
// ==========================================================

// Handle the Code Injection
app.post('/admin/inject-code', async (req, res) => {
    const { position, code } = req.body;
    await db.ref('site_injections').push({
        position,
        code,
        active: true,
        created_at: new Date().toISOString()
    });
    res.send("<h1>Code Injected! Website updated.</h1><a href='/'>View Changes</a>");
});

// Handle Video Upload
const upload = multer({ dest: 'uploads/' });
app.post('/admin/publish-video', upload.single('videoFile'), async (req, res) => {
    await db.ref('videos').push({
        title: req.body.title || 'Untitled Video',
        filename: `/uploads/${req.file.filename}`,
        created_at: new Date().toISOString()
    });
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("System Running"));
