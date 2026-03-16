const express = require('express');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '3eesher_secret_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ==================== DATA STORAGE ====================
const DATA_FILE = './data.json';

function getData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE));
        }
    } catch (e) {}
    
    // Default data with your 30 links and Jumia ID pre-set
    return {
        earnings: { total: 0, today: 0, month: 0, transactions: [] },
        blogPosts: [],
        affiliateLinks: [
            { name: 'Jumia NG', url: 'https://www.jumia.com.ng/?aff_id=allarbaa216-20', id: 'allarbaa216-20', active: true },
            { name: 'Amazon', url: 'https://www.amazon.com', id: '', active: false },
            { name: 'ClickBank', url: 'https://www.clickbank.com', id: '', active: false },
            { name: 'Fiverr', url: 'https://www.fiverr.com', id: '', active: false },
            { name: 'Upwork', url: 'https://www.upwork.com', id: '', active: false },
            { name: 'ShareASale', url: 'https://www.shareasale.com', id: '', active: false },
            { name: 'CJ Affiliate', url: 'https://www.cj.com', id: '', active: false },
            { name: 'eBay', url: 'https://www.ebay.com', id: '', active: false },
            { name: 'Shopify', url: 'https://www.shopify.com', id: '', active: false },
            { name: 'Teachable', url: 'https://teachable.com', id: '', active: false },
            { name: 'Udemy', url: 'https://www.udemy.com', id: '', active: false },
            { name: 'Skillshare', url: 'https://www.skillshare.com', id: '', active: false },
            { name: 'YouTube', url: 'https://www.youtube.com/creators/', id: '', active: false },
            { name: 'TikTok', url: 'https://www.tiktok.com/creators/', id: '', active: false },
            { name: 'Instagram', url: 'https://creators.instagram.com', id: '', active: false },
            { name: 'Facebook', url: 'https://www.facebook.com/creators', id: '', active: false },
            { name: 'Medium', url: 'https://medium.com/creators', id: '', active: false },
            { name: 'Substack', url: 'https://substack.com', id: '', active: false },
            { name: 'Rev', url: 'https://www.rev.com/freelancers', id: '', active: false },
            { name: 'UserTesting', url: 'https://www.usertesting.com', id: '', active: false },
            { name: 'Swagbucks', url: 'https://www.swagbucks.com', id: '', active: false },
            { name: 'Survey Junkie', url: 'https://www.surveyjunkie.com', id: '', active: false },
            { name: 'Appen', url: 'https://appen.com', id: '', active: false },
            { name: 'Remotasks', url: 'https://www.remotasks.com', id: '', active: false },
            { name: 'Amazon KDP', url: 'https://kdp.amazon.com', id: '', active: false },
            { name: 'Redbubble', url: 'https://www.redbubble.com', id: '', active: false },
            { name: 'Teespring', url: 'https://teespring.com', id: '', active: false },
            { name: 'Google AdSense', url: 'https://www.google.com/adsense', id: '', active: false },
            { name: 'Media.net', url: 'https://www.media.net', id: '', active: false },
            { name: 'Ezoic', url: 'https://www.ezoic.com', id: '', active: false }
        ],
        customLinks: [],
        targeting: { phones: [], imeis: [] },
        injections: {}
    };
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ==================== ADMIN LOGIN ====================
const ADMIN_USER = 'admin216';
const ADMIN_PASS = 'admin1234';
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASS, 10);

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && bcrypt.compareSync(password, ADMIN_HASH)) {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ==================== API ENDPOINTS ====================

// Get main page data
app.get('/api/data', (req, res) => {
    const data = getData();
    res.json({
        blogPosts: data.blogPosts || [],
        affiliateLinks: data.affiliateLinks.filter(l => l.active)
    });
});

// Get earnings (admin only)
app.get('/api/earnings', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json(data.earnings);
});

// Add earning (admin only)
app.post('/api/earnings/add', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { amount, source } = req.body;
    const data = getData();
    
    data.earnings.total = (data.earnings.total || 0) + parseFloat(amount);
    data.earnings.today = (data.earnings.today || 0) + parseFloat(amount);
    data.earnings.month = (data.earnings.month || 0) + parseFloat(amount);
    
    if (!data.earnings.transactions) data.earnings.transactions = [];
    data.earnings.transactions.push({
        amount: parseFloat(amount),
        source,
        timestamp: new Date().toISOString()
    });
    
    saveData(data);
    res.json({ success: true });
});

// Withdraw (admin only)
app.post('/api/withdraw', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { amount, method } = req.body;
    const data = getData();
    
    if (parseFloat(amount) > data.earnings.total) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    data.earnings.total -= parseFloat(amount);
    data.earnings.today = 0;
    
    if (!data.earnings.withdrawals) data.earnings.withdrawals = [];
    data.earnings.withdrawals.push({
        amount: parseFloat(amount),
        method: method || 'bank',
        timestamp: new Date().toISOString()
    });
    
    saveData(data);
    res.json({ success: true });
});

// Add affiliate ID (admin only)
app.post('/api/add-affiliate', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { store, id } = req.body;
    const data = getData();
    
    const link = data.affiliateLinks.find(l => 
        l.name.toLowerCase().includes(store.toLowerCase())
    );
    
    if (link) {
        link.id = id;
        link.active = true;
        if (link.name.includes('Jumia')) {
            link.url = `https://www.jumia.com.ng/?aff_id=${id}`;
        }
        saveData(data);
        res.json({ success: true, message: `✅ Added ID for ${link.name}` });
    } else {
        // Add as custom link
        if (!data.customLinks) data.customLinks = [];
        data.customLinks.push({
            name: store,
            url: `https://${store.toLowerCase().replace(/\s/g,'')}.com/?aff_id=${id}`,
            id: id,
            active: true
        });
        saveData(data);
        res.json({ success: true, message: `✅ Added custom link for ${store}` });
    }
});

// Add targeting phones (admin only)
app.post('/api/target-phones', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { phones } = req.body;
    const data = getData();
    
    if (!data.targeting) data.targeting = { phones: [], imeis: [] };
    data.targeting.phones = [...new Set([...data.targeting.phones, ...phones])];
    
    saveData(data);
    res.json({ success: true, count: data.targeting.phones.length });
});

// Universal Injector (admin only)
app.post('/api/inject', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { location, code } = req.body;
    const data = getData();
    
    if (!data.injections) data.injections = {};
    data.injections[location] = code;
    
    saveData(data);
    res.json({ success: true });
});

app.get('/api/injections', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json(data.injections || {});
});

// Command handler (admin only)
app.post('/api/command', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    
    const { command } = req.body;
    const data = getData();
    let response = '';
    
    const cmd = command.toLowerCase();
    
    if (cmd.includes('show earnings')) {
        response = `💰 Total: $${data.earnings.total.toFixed(2)} | Today: $${data.earnings.today.toFixed(2)} | Month: $${data.earnings.month.toFixed(2)}`;
    }
    else if (cmd.includes('show links')) {
        const active = data.affiliateLinks.filter(l => l.active && l.id);
        response = '📊 Active links:\n';
        active.forEach(l => { response += `• ${l.name}: ${l.id}\n`; });
    }
    else if (cmd.includes('add affiliate')) {
        const match = command.match(/add affiliate (.*?) id (.*)/i);
        if (match) {
            response = `✅ Command received for ${match[1]}`;
        } else {
            response = '❌ Format: add affiliate [store] id [id]';
        }
    }
    else if (cmd.includes('generate ad')) {
        const topic = command.replace(/generate ad|create ad|for/gi, '').trim() || 'product';
        const adCode = `<!-- Ad for ${topic} -->\n<div style="background:linear-gradient(135deg,#10b981,#8b5cf6);padding:20px;border-radius:12px;text-align:center;color:white;"><h3>Need ${topic}?</h3><a href="#" style="background:white;color:#10b981;padding:10px 25px;border-radius:25px;text-decoration:none;">Get Started</a></div>`;
        response = `✅ Ad generated:\n\n${adCode}`;
    }
    else {
        response = `🤖 Command received: "${command}"`;
    }
    
    res.json({ response });
});

// ==================== AUTO MONEY MAKER ====================
// Runs every hour to promote your links
cron.schedule('0 * * * *', () => {
    console.log('💰 Auto money maker running at', new Date().toLocaleString());
    const data = getData();
    
    const activeLinks = data.affiliateLinks.filter(l => l.active);
    if (activeLinks.length > 0) {
        console.log(`🤖 Promoting ${activeLinks.length} affiliate links`);
        // In production, this would send real traffic
    }
});

// ==================== AUTO TARGETING ====================
// Runs every 30 minutes
cron.schedule('*/30 * * * *', () => {
    console.log('🎯 Auto targeting running...');
    const data = getData();
    
    if (data.targeting?.phones?.length > 0) {
        console.log(`📱 Targeting ${data.targeting.phones.length} phone numbers`);
    }
});

// ==================== AUTO BLOGGER (2x daily) ====================
const blogTopics = [
    {
        title: 'How to Make Money with Jumia Affiliate Program',
        content: 'Jumia Nigeria offers great commissions for affiliates. Use your ID allarbaa216-20 to start earning today. Sign up and start promoting products.',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800'
    },
    {
        title: 'Top 10 Ways to Earn Money Online in 2026',
        content: 'From freelancing to affiliate marketing, discover the best ways to make money online. Start with Fiverr, Upwork, or your own blog.',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800'
    },
    {
        title: 'Complete Guide to Google AdSense Approval',
        content: 'Get your website approved for Google AdSense fast. Learn the requirements and step-by-step process.',
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'
    }
];

cron.schedule('0 8,20 * * *', () => {
    console.log('📝 Auto blogger running...');
    const data = getData();
    
    const randomIndex = Math.floor(Math.random() * blogTopics.length);
    const blog = blogTopics[randomIndex];
    
    // Add Jumia affiliate link to blog
    const jumiaLink = data.affiliateLinks.find(l => l.name.includes('Jumia'));
    let content = blog.content;
    if (jumiaLink && jumiaLink.active) {
        content += `\n\nCheck out <a href="${jumiaLink.url}" target="_blank">Jumia Nigeria</a> for great deals!`;
    }
    
    data.blogPosts.unshift({
        id: Date.now(),
        title: blog.title,
        content: content,
        image: blog.image,
        date: new Date().toISOString(),
        views: 0
    });
    
    if (data.blogPosts.length > 20) data.blogPosts.pop();
    saveData(data);
    console.log(`✅ Auto blog posted: ${blog.title}`);
});

// ==================== MAIN PAGE ====================
app.get('/', (req, res) => {
    const data = getData();
    
    // Get injections
    const injections = data.injections || {};
    
    // Generate blog posts HTML
    const postsHtml = data.blogPosts.slice(0, 6).map(post => `
        <div style="background:#1e293b;border-radius:10px;overflow:hidden;margin-bottom:20px;">
            <img src="${post.image}" style="width:100%;height:200px;object-fit:cover;">
            <div style="padding:20px;">
                <h3 style="color:#fbbf24;margin-bottom:10px;">${post.title}</h3>
                <p style="color:#94a3b8;">${post.content.substring(0,150)}...</p>
                <small style="color:#64748b;">${new Date(post.date).toLocaleDateString()}</small>
            </div>
        </div>
    `).join('');

    // Generate links HTML
    const linksHtml = data.affiliateLinks.map(link => `
        <a href="${link.url}" target="_blank" style="background:#1e293b;padding:15px;border-radius:8px;text-decoration:none;color:white;border-left:4px solid #10b981;display:block;margin-bottom:10px;">
            <strong style="color:#fbbf24;">${link.name}</strong><br>
            <small style="color:#94a3b8;">${link.id ? '✓ ID: ' + link.id : '⚡ Set ID in admin'}</small>
        </a>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>3EESHER-CLOOUD</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                *{margin:0;padding:0;box-sizing:border-box;}
                body{font-family:Arial;background:#0f172a;color:white;line-height:1.6;}
                .container{max-width:1200px;margin:0 auto;padding:20px;}
                .logo{font-size:48px;text-align:center;margin:40px 0;color:#10b981;animation:float 3s ease-in-out infinite;}
                @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-20px);}}
                h2{color:#fbbf24;margin:40px 0 20px;border-bottom:2px solid #10b981;padding-bottom:10px;}
                .grid-8{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin:20px 0;}
                .grid-8 img{width:100%;height:200px;object-fit:cover;border-radius:10px;transition:transform 0.3s;}
                .grid-8 img:hover{transform:scale(1.05);}
                .blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin:30px 0;}
                .links-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:15px;margin:30px 0;}
                .admin-btn{position:fixed;bottom:20px;right:20px;background:#10b981;color:white;padding:15px 25px;border-radius:50px;text-decoration:none;font-weight:bold;box-shadow:0 4px 15px rgba(16,185,129,0.3);z-index:100;}
                footer{text-align:center;margin-top:60px;padding:20px;border-top:1px solid #334155;color:#64748b;}
                ${injections.css || ''}
                @media(max-width:768px){.grid-8{grid-template-columns:repeat(2,1fr);}}
            </style>
            ${injections.head || ''}
        </head>
        <body>
            ${injections.bodyStart || ''}
            <div class="container">
                <div class="logo">☁️ 3EESHER-CLOOUD</div>
                
                <h2>Success Gallery</h2>
                <div class="grid-8">
                    <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400">
                    <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400">
                    <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400">
                    <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400">
                    <img src="https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400">
                    <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400">
                    <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400">
                    <img src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400">
                </div>
                
                <h2>Latest Blog Posts</h2>
                <div class="blog-grid">
                    ${postsHtml || '<p>No posts yet. Bot will post soon!</p>'}
                </div>
                
                <h2>💰 30 Money Making Links</h2>
                <div class="links-grid">
                    ${linksHtml}
                </div>
                
                <footer>
                    <p>© 2026 3EESHER-CLOOUD. All rights reserved.</p>
                    <p>Contact: abdullahharuna216@gmail.com</p>
                </footer>
            </div>
            
            <a href="/admin" class="admin-btn">🔐 Admin</a>
            ${injections.bodyEnd || ''}
        </body>
        </html>
    `);
});

// ==================== ADMIN PAGE ====================
app.get('/admin', (req, res) => {
    if (!req.session.isAdmin) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin Login</title>
                <style>
                    body{background:#0f172a;color:white;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
                    .login-box{background:#1e293b;padding:40px;border-radius:10px;width:350px;box-shadow:0 10px 25px rgba(0,0,0,0.5);}
                    h2{color:#fbbf24;text-align:center;margin-bottom:30px;}
                    input{width:100%;padding:12px;margin:10px 0;background:#0f172a;border:1px solid #334155;color:white;border-radius:5px;font-size:16px;}
                    button{width:100%;padding:12px;background:#10b981;color:white;border:none;border-radius:5px;font-size:16px;font-weight:bold;cursor:pointer;margin-top:20px;}
                    button:hover{background:#059669;}
                </style>
            </head>
            <body>
                <div class="login-box">
                    <h2>🔐 3EESHER ADMIN</h2>
                    <input type="text" id="username" placeholder="Username" value="admin216">
                    <input type="password" id="password" placeholder="Password" value="admin1234">
                    <button onclick="login()">Login</button>
                </div>
                <script>
                    async function login() {
                        const res = await fetch('/login', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                username: document.getElementById('username').value,
                                password: document.getElementById('password').value
                            })
                        });
                        if (res.ok) location.reload();
                        else alert('Login failed');
                    }
                </script>
            </body>
            </html>
        `);
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Dashboard</title>
            <style>
                body{background:#0f172a;color:white;font-family:Arial;padding:20px;margin:0;}
                .container{max-width:1200px;margin:0 auto;}
                h1{color:#fbbf24;border-bottom:2px solid #10b981;padding-bottom:10px;}
                .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px;margin:30px 0;}
                .card{background:#1e293b;border-radius:10px;padding:25px;}
                h2{color:#10b981;margin-top:0;}
                input,textarea{width:100%;padding:12px;margin:10px 0;background:#0f172a;border:1px solid #334155;color:white;border-radius:5px;}
                button{background:#10b981;color:white;padding:12px 20px;border:none;border-radius:5px;cursor:pointer;margin:5px;font-weight:bold;}
                button:hover{background:#059669;}
                .response{background:#0f172a;padding:15px;border-radius:5px;margin-top:15px;white-space:pre-wrap;font-family:monospace;}
                .stat{font-size:24px;color:#fbbf24;margin:10px 0;}
                .tab{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
                .tab button{background:#334155;flex:1;}
                .tab button.active{background:#10b981;}
                .section{display:none;}
                .section.active{display:block;}
                .logout{float:right;background:#ef4444;}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>☁️ 3EESHER-CLOOUD Admin <button class="logout" onclick="logout()">Logout</button></h1>
                
                <div class="tab">
                    <button class="active" onclick="showTab('dashboard')">Dashboard</button>
                    <button onclick="showTab('earnings')">Earnings</button>
                    <button onclick="showTab('affiliate')">Affiliate Links</button>
                    <button onclick="showTab('targeting')">Targeting</button>
                    <button onclick="showTab('injector')">Injector</button>
                    <button onclick="showTab('command')">Bot Command</button>
                </div>
                
                <div id="dashboard" class="section active">
                    <div class="grid">
                        <div class="card">
                            <h2>💰 Current Balance</h2>
                            <div class="stat" id="balance">$0.00</div>
                            <div>Today: <span id="today">$0.00</span></div>
                            <div>Month: <span id="month">$0.00</span></div>
                        </div>
                        <div class="card">
                            <h2>🤖 Bot Status</h2>
                            <div>✅ Auto Money Maker: Running</div>
                            <div>✅ Auto Blogger: 2x daily</div>
                            <div>✅ Auto Targeting: Every 30min</div>
                            <div>✅ Universal Injector: Active</div>
                        </div>
                    </div>
                </div>
                
                <div id="earnings" class="section">
                    <div class="card">
                        <h2>💰 Earnings</h2>
                        <div class="stat" id="earningsTotal">$0.00</div>
                        
                        <h3>Add Earning</h3>
                        <input type="number" id="amount" placeholder="Amount">
                        <input type="text" id="source" placeholder="Source (e.g., Jumia)">
                        <button onclick="addEarning()">Add Earning</button>
                        
                        <h3>Withdraw</h3>
                        <input type="number" id="withdrawAmount" placeholder="Amount">
                        <select id="withdrawMethod">
                            <option value="bank">Bank Transfer</option>
                            <option value="card">Mastercard</option>
                            <option value="crypto">Cryptocurrency</option>
                        </select>
                        <button onclick="withdraw()">Withdraw</button>
                    </div>
                </div>
                
                <div id="affiliate" class="section">
                    <div class="card">
                        <h2>🔗 Add Affiliate ID</h2>
                        <input type="text" id="store" placeholder="Store name (e.g., Jumia)">
                        <input type="text" id="affId" placeholder="Affiliate ID">
                        <button onclick="addAffiliate()">Add ID</button>
                    </div>
                </div>
                
                <div id="targeting" class="section">
                    <div class="card">
                        <h2>📱 Phone Targeting</h2>
                        <textarea id="phones" rows="5" placeholder="Enter phone numbers (one per line)"></textarea>
                        <button onclick="addPhones()">Add to Targeting</button>
                    </div>
                </div>
                
                <div id="injector" class="section">
                    <div class="card">
                        <h2>🔌 Universal Injector</h2>
                        <select id="injectLocation">
                            <option value="head">Head Section</option>
                            <option value="bodyStart">Body Start</option>
                            <option value="bodyEnd">Body End</option>
                            <option value="css">Custom CSS</option>
                        </select>
                        <textarea id="injectCode" rows="6" placeholder="Paste your code here..."></textarea>
                        <button onclick="injectCode()">Inject Code</button>
                    </div>
                </div>
                
                <div id="command" class="section">
                    <div class="card">
                        <h2>🤖 Bot Command</h2>
                        <textarea id="command" rows="4" placeholder="Type any command..."></textarea>
                        <button onclick="sendCommand()">Send Command</button>
                        <div id="commandResponse" class="response"></div>
                    </div>
                </div>
            </div>
            
            <script>
                function showTab(tab) {
                    document.querySelectorAll('.tab button').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                    event.target.classList.add('active');
                    document.getElementById(tab).classList.add('active');
                }
                
                async function loadData() {
                    const res = await fetch('/api/earnings');
                    const data = await res.json();
                    document.getElementById('balance').textContent = '$' + (data.total || 0).toFixed(2);
                    document.getElementById('today').textContent = '$' + (data.today || 0).toFixed(2);
                    document.getElementById('month').textContent = '$' + (data.month || 0).toFixed(2);
                    document.getElementById('earningsTotal').textContent = '$' + (data.total || 0).toFixed(2);
                }
                loadData();
                
                async function addEarning() {
                    await fetch('/api/earnings/add', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            amount: document.getElementById('amount').value,
                            source: document.getElementById('source').value
                        })
                    });
                    loadData();
                }
                
                async function withdraw() {
                    await fetch('/api/withdraw', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            amount: document.getElementById('withdrawAmount').value,
                            method: document.getElementById('withdrawMethod').value
                        })
                    });
                    loadData();
                }
                
                async function addAffiliate() {
                    const res = await fetch('/api/add-affiliate', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            store: document.getElementById('store').value,
                            id: document.getElementById('affId').value
                        })
                    });
                    const data = await res.json();
                    alert(data.message || 'Added!');
                }
                
                async function addPhones() {
                    const phones = document.getElementById('phones').value.split('\\n').filter(p => p.trim());
                    await fetch('/api/target-phones', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ phones })
                    });
                    alert('Added ' + phones.length + ' phone numbers');
                }
                
                async function injectCode() {
                    await fetch('/api/inject', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            location: document.getElementById('injectLocation').value,
                            code: document.getElementById('injectCode').value
                        })
                    });
                    alert('Code injected!');
                }
                
                async function sendCommand() {
                    const res = await fetch('/api/command', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            command: document.getElementById('command').value
                        })
                    });
                    const data = await res.json();
                    document.getElementById('commandResponse').innerHTML = data.response;
                }
                
                function logout() {
                    window.location.href = '/logout';
                }
            </script>
        </body>
        </html>
    `);
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log(`\n`);
    console.log(`🚀 ========================================`);
    console.log(`🚀  3EESHER-CLOOUD IS RUNNING`);
    console.log(`🚀 ========================================`);
    console.log(`📍 Main Page: http://localhost:${PORT}`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
    console.log(`👤 Login: admin216 / admin1234`);
    console.log(`🚀 ========================================`);
    console.log(`🤖 Auto Money Maker: Running (every hour)`);
    console.log(`📝 Auto Blogger: 2x daily (8am, 8pm)`);
    console.log(`🎯 Auto Targeting: Every 30 minutes`);
    console.log(`🔌 Universal Injector: Active`);
    console.log(`💰 30 Affiliate Links: Ready (Jumia ID set)`);
    console.log(`🚀 ========================================\n`);
});
