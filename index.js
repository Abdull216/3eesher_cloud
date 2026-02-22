// ==================== COMPLETE 3EESHER.CLOUD MONETIZATION PLATFORM ====================
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
const UPLOADS_FOLDER = './uploads';
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_FOLDER));
app.use(session({
    secret: '3eesher-monetization',
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
        email TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        role TEXT DEFAULT 'viewer',
        earnings REAL DEFAULT 0,
        wallet_address TEXT,
        approved INTEGER DEFAULT 1,
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
        revenue REAL DEFAULT 0,
        featured INTEGER DEFAULT 0,
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
        revenue REAL DEFAULT 0,
        published_date TEXT,
        created_date TEXT
    )`);
    
    // ========== PAYMENT METHODS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT, -- 'stripe', 'paypal', 'credit_card', 'crypto', 'bank'
        enabled INTEGER DEFAULT 1,
        api_key TEXT,
        api_secret TEXT,
        webhook_secret TEXT,
        fee_percentage REAL DEFAULT 2.9,
        fee_fixed REAL DEFAULT 0.30,
        min_amount REAL DEFAULT 1,
        max_amount REAL DEFAULT 10000,
        currencies TEXT, -- JSON array
        countries TEXT, -- JSON array
        display_order INTEGER DEFAULT 0,
        created_date TEXT
    )`);
    
    // ========== CRYPTO WALLETS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS crypto_wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency TEXT, -- 'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOT', 'MATIC'
        network TEXT, -- 'bitcoin', 'ethereum', 'bsc', 'polygon', 'solana'
        address TEXT,
        qr_code TEXT,
        label TEXT,
        enabled INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // ========== TRANSACTIONS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL,
        currency TEXT,
        payment_method TEXT,
        payment_id TEXT,
        status TEXT, -- 'pending', 'completed', 'failed', 'refunded'
        type TEXT, -- 'payment', 'withdrawal', 'refund'
        description TEXT,
        created_date TEXT,
        completed_date TEXT
    )`);
    
    // ========== AD NETWORKS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS ad_networks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, -- 'Google AdSense', 'Taboola', 'Outbrain', 'Mediavine', 'Ezoic', 'AdThrive', 'Direct'
        type TEXT, -- 'display', 'native', 'video', 'popup'
        enabled INTEGER DEFAULT 1,
        publisher_id TEXT,
        api_key TEXT,
        api_secret TEXT,
        config TEXT, -- JSON config
        created_date TEXT
    )`);
    
    // ========== AD PLACEMENTS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS ad_placements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        location TEXT, -- 'header', 'sidebar_top', 'sidebar_middle', 'sidebar_bottom', 'content_top', 'content_middle', 'content_bottom', 'footer', 'popup', 'interstitial', 'infeed'
        code TEXT,
        network_id INTEGER,
        devices TEXT, -- 'all', 'desktop', 'mobile', 'tablet'
        countries TEXT, -- JSON array
        user_roles TEXT, -- JSON array
        min_views INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        created_date TEXT,
        FOREIGN KEY (network_id) REFERENCES ad_networks(id)
    )`);
    
    // ========== AD CAMPAIGNS TABLE (For Direct Ads) ==========
    db.run(`CREATE TABLE IF NOT EXISTS ad_campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        advertiser TEXT,
        budget REAL,
        spent REAL DEFAULT 0,
        target_url TEXT,
        target_impressions INTEGER DEFAULT 0,
        target_clicks INTEGER DEFAULT 0,
        cost_per_impression REAL DEFAULT 0, -- CPM
        cost_per_click REAL DEFAULT 0, -- CPC
        start_date TEXT,
        end_date TEXT,
        countries TEXT, -- JSON array
        devices TEXT, -- JSON array
        placements TEXT, -- JSON array
        status TEXT DEFAULT 'active', -- 'active', 'paused', 'ended'
        created_date TEXT
    )`);
    
    // ========== AD TRACKING TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS ad_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        placement_id INTEGER,
        campaign_id INTEGER,
        user_id INTEGER,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        country TEXT,
        device TEXT,
        browser TEXT,
        impression_id TEXT,
        click_id TEXT,
        conversion_id TEXT,
        conversion_value REAL,
        revenue REAL,
        timestamp TEXT
    )`);
    
    // ========== CONVERSION TRACKING TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS conversion_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        provider TEXT, -- 'google', 'facebook', 'tiktok', 'twitter', 'linkedin', 'pinterest', 'snapchat'
        pixel_code TEXT,
        event_name TEXT, -- 'Purchase', 'Lead', 'SignUp', 'ViewContent', 'AddToCart'
        value REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        enabled INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // ========== RETARGETING PIXELS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS retargeting_pixels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        provider TEXT, -- 'facebook', 'google', 'tiktok', 'twitter', 'pinterest', 'criteo', 'adroll'
        pixel_id TEXT,
        pixel_code TEXT,
        events TEXT, -- JSON array of events to track
        enabled INTEGER DEFAULT 1,
        placement TEXT, -- 'header', 'footer'
        created_date TEXT
    )`);
    
    // ========== INJECTIONS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS injections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        location TEXT, -- 'head', 'body_start', 'before_content', 'after_content', 'footer', 'body_end', 'custom_css', 'custom_js'
        code TEXT,
        active INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // ========== SETTINGS TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);
    
    // ========== PAGES TABLE ==========
    db.run(`CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        slug TEXT UNIQUE,
        content TEXT,
        published INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // ==================== DEFAULT DATA ====================
    
    // Create admin user
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, full_name, role, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
        ['admin', 'admin@3eesher.cloud', hash, 'Super Admin', 'super_admin', new Date().toISOString()]);
    
    // Default settings
    const settings = [
        ['site_name', '3eesher.cloud'],
        ['site_title', '3eesher.cloud - Monetization Platform'],
        ['site_description', 'Earn money with videos, blog, and ads'],
        ['primary_color', '#667eea'],
        ['secondary_color', '#764ba2'],
        ['hero_title', 'Create. Share. Earn.'],
        ['hero_subtitle', 'Join thousands of creators making money'],
        ['footer_text', '© 2024 3eesher.cloud. All rights reserved.'],
        ['currency', 'USD'],
        ['currency_symbol', '$'],
        ['default_payment_method', 'stripe'],
        ['ads_enabled', 'true'],
        ['payments_enabled', 'true'],
        ['affiliate_enabled', 'true'],
        ['crypto_enabled', 'true'],
        ['min_withdrawal', '10'],
        ['withdrawal_fee', '1']
    ];
    
    settings.forEach(([key, value]) => {
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });
    
    // ========== DEFAULT PAYMENT METHODS ==========
    const payments = [
        ['Stripe', 'stripe', 1, 'pk_live_...', 'sk_live_...', 'whsec_...', 2.9, 0.30, 1, 10000, '["USD","EUR","GBP"]', '[]', 1],
        ['PayPal', 'paypal', 1, 'client_id_...', 'secret_...', '', 3.5, 0, 1, 10000, '["USD","EUR","GBP"]', '[]', 2],
        ['Credit Card', 'credit_card', 1, '', '', '', 2.9, 0.30, 1, 10000, '["USD","EUR","GBP"]', '[]', 3],
        ['Visa', 'credit_card', 1, '', '', '', 2.9, 0.30, 1, 10000, '["USD","EUR","GBP"]', '[]', 4],
        ['Mastercard', 'credit_card', 1, '', '', '', 2.9, 0.30, 1, 10000, '["USD","EUR","GBP"]', '[]', 5],
        ['American Express', 'credit_card', 1, '', '', '', 3.5, 0.30, 1, 10000, '["USD","EUR","GBP"]', '[]', 6],
        ['Discover', 'credit_card', 1, '', '', '', 2.9, 0.30, 1, 10000, '["USD"]', '[]', 7],
        ['Bank Transfer', 'bank', 1, '', '', '', 0, 0, 10, 10000, '["USD","EUR","GBP"]', '[]', 8]
    ];
    
    payments.forEach(([name, type, enabled, key, secret, webhook, fee_pct, fee_fixed, min, max, currencies, countries, order]) => {
        db.run(`INSERT OR IGNORE INTO payment_methods (name, type, enabled, api_key, api_secret, webhook_secret, fee_percentage, fee_fixed, min_amount, max_amount, currencies, countries, display_order, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, type, enabled, key, secret, webhook, fee_pct, fee_fixed, min, max, currencies, countries, order, new Date().toISOString()]);
    });
    
    // ========== DEFAULT CRYPTO WALLETS ==========
    const wallets = [
        ['BTC', 'bitcoin', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', '', 'Bitcoin Main', 1],
        ['ETH', 'ethereum', '0x742d35Cc6634C0532925a3b844Bc9e7593f0bA9c', '', 'Ethereum Main', 1],
        ['USDT', 'ethereum', '0x742d35Cc6634C0532925a3b844Bc9e7593f0bA9c', '', 'USDT (ERC20)', 1],
        ['USDT', 'bsc', '0x742d35Cc6634C0532925a3b844Bc9e7593f0bA9c', '', 'USDT (BSC)', 1],
        ['BNB', 'bsc', '0x742d35Cc6634C0532925a3b844Bc9e7593f0bA9c', '', 'Binance Coin', 1],
        ['SOL', 'solana', '5K1x8KjzB5Q9qQ9qQ9qQ9qQ9qQ9qQ9qQ9qQ9qQ9', '', 'Solana', 1],
        ['XRP', 'ripple', 'rLHzPsX6oXkzU2qLqkzU2qLqkzU2qLqkzU2qLqkzU', '', 'Ripple', 1],
        ['ADA', 'cardano', 'addr1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', '', 'Cardano', 1],
        ['DOT', 'polkadot', '1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', '', 'Polkadot', 1],
        ['MATIC', 'polygon', '0x742d35Cc6634C0532925a3b844Bc9e7593f0bA9c', '', 'Polygon', 1]
    ];
    
    wallets.forEach(([currency, network, address, qr, label, enabled]) => {
        db.run(`INSERT OR IGNORE INTO crypto_wallets (currency, network, address, qr_code, label, enabled, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [currency, network, address, qr, label, enabled, new Date().toISOString()]);
    });
    
    // ========== DEFAULT AD NETWORKS ==========
    const adNetworks = [
        ['Google AdSense', 'display', 1, 'pub-0000000000000000', '', '', '{}'],
        ['Taboola', 'native', 1, 'taboola_000000', '', '', '{}'],
        ['Outbrain', 'native', 1, 'outbrain_000000', '', '', '{}'],
        ['Mediavine', 'display', 1, 'mediavine_000000', '', '', '{}'],
        ['Ezoic', 'display', 1, 'ezoic_000000', '', '', '{}'],
        ['AdThrive', 'display', 1, 'adthrive_000000', '', '', '{}'],
        ['Direct Ads', 'display', 1, '', '', '', '{}'],
        ['Amazon Associates', 'affiliate', 1, 'amzn_assoc_tracking_id', '', '', '{}'],
        ['ShareASale', 'affiliate', 1, 'shareasale_000000', '', '', '{}'],
        ['CJ Affiliate', 'affiliate', 1, 'cj_000000', '', '', '{}']
    ];
    
    adNetworks.forEach(([name, type, enabled, pub_id, key, secret, config]) => {
        db.run(`INSERT OR IGNORE INTO ad_networks (name, type, enabled, publisher_id, api_key, api_secret, config, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, type, enabled, pub_id, key, secret, config, new Date().toISOString()]);
    });
    
    // ========== DEFAULT AD PLACEMENTS ==========
    const adPlacements = [
        ['Header Banner', 'header', '<!-- Google AdSense Header -->', 1, 'all', '[]', '[]', 0, 1, 1],
        ['Sidebar Top', 'sidebar_top', '<!-- Sidebar Top Ad -->', 1, 'desktop', '[]', '[]', 0, 1, 2],
        ['Sidebar Middle', 'sidebar_middle', '<!-- Sidebar Middle Ad -->', 1, 'desktop', '[]', '[]', 0, 1, 3],
        ['Sidebar Bottom', 'sidebar_bottom', '<!-- Sidebar Bottom Ad -->', 1, 'desktop', '[]', '[]', 0, 1, 4],
        ['Content Top', 'content_top', '<!-- Content Top Ad -->', 1, 'all', '[]', '[]', 0, 1, 5],
        ['Content Middle', 'content_middle', '<!-- Content Middle Ad -->', 1, 'all', '[]', '[]', 0, 1, 6],
        ['Content Bottom', 'content_bottom', '<!-- Content Bottom Ad -->', 1, 'all', '[]', '[]', 0, 1, 7],
        ['Footer Banner', 'footer', '<!-- Footer Ad -->', 1, 'all', '[]', '[]', 0, 1, 8],
        ['Popup Ad', 'popup', '<!-- Popup Ad -->', 1, 'all', '[]', '[]', 0, 1, 9],
        ['In-feed Ad', 'infeed', '<!-- In-feed Ad -->', 1, 'all', '[]', '[]', 0, 1, 10],
        ['Interstitial', 'interstitial', '<!-- Interstitial Ad -->', 1, 'mobile', '[]', '[]', 0, 1, 11]
    ];
    
    adPlacements.forEach(([name, location, code, network_id, devices, countries, roles, min_views, enabled, priority]) => {
        db.run(`INSERT OR IGNORE INTO ad_placements (name, location, code, network_id, devices, countries, user_roles, min_views, enabled, priority, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, location, code, network_id, devices, countries, roles, min_views, enabled, priority, new Date().toISOString()]);
    });
    
    // ========== DEFAULT CONVERSION TRACKING ==========
    const conversions = [
        ['Google Ads Purchase', 'google', '<!-- Google Ads Conversion -->', 'Purchase', 0, 'USD', 1],
        ['Facebook Pixel Purchase', 'facebook', '<!-- Facebook Pixel -->', 'Purchase', 0, 'USD', 1],
        ['TikTok Pixel', 'tiktok', '<!-- TikTok Pixel -->', 'CompletePayment', 0, 'USD', 1],
        ['Twitter Pixel', 'twitter', '<!-- Twitter Pixel -->', 'Purchase', 0, 'USD', 1],
        ['LinkedIn Pixel', 'linkedin', '<!-- LinkedIn Pixel -->', 'Lead', 0, 'USD', 1],
        ['Pinterest Pixel', 'pinterest', '<!-- Pinterest Pixel -->', 'Checkout', 0, 'USD', 1],
        ['Snapchat Pixel', 'snapchat', '<!-- Snapchat Pixel -->', 'Purchase', 0, 'USD', 1]
    ];
    
    conversions.forEach(([name, provider, code, event_name, value, currency, enabled]) => {
        db.run(`INSERT OR IGNORE INTO conversion_tracking (name, provider, pixel_code, event_name, value, currency, enabled, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, provider, code, event_name, value, currency, enabled, new Date().toISOString()]);
    });
    
    // ========== DEFAULT RETARGETING PIXELS ==========
    const retargeting = [
        ['Facebook Retargeting', 'facebook', '123456789', '<!-- Facebook Pixel -->', '["PageView","ViewContent","AddToCart","Purchase"]', 1, 'header'],
        ['Google Remarketing', 'google', 'AW-123456789', '<!-- Google Remarketing -->', '["page_view","add_to_cart","purchase"]', 1, 'header'],
        ['TikTok Retargeting', 'tiktok', '123456789', '<!-- TikTok Pixel -->', '["PageView","CompletePayment"]', 1, 'header'],
        ['Twitter Retargeting', 'twitter', '123456789', '<!-- Twitter Pixel -->', '["PageView","Purchase"]', 1, 'header'],
        ['Pinterest Retargeting', 'pinterest', '123456789', '<!-- Pinterest Pixel -->', '["PageVisit","Checkout"]', 1, 'header'],
        ['Criteo', 'criteo', '123456789', '<!-- Criteo -->', '["view","add_to_cart","purchase"]', 1, 'header'],
        ['AdRoll', 'adroll', '123456789', '<!-- AdRoll -->', '["pageView","addToCart","purchase"]', 1, 'header']
    ];
    
    retargeting.forEach(([name, provider, pixel_id, code, events, enabled, placement]) => {
        db.run(`INSERT OR IGNORE INTO retargeting_pixels (name, provider, pixel_id, pixel_code, events, enabled, placement, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, provider, pixel_id, code, events, enabled, placement, new Date().toISOString()]);
    });
    
    // ========== DEFAULT PAGES ==========
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
});

// ==================== PAGE CONTENT GENERATORS ====================
function generateAboutPage() {
    return `
        <div class="about-page">
            <h1>About 3eesher.cloud</h1>
            <p>We're a complete monetization platform helping creators earn from their content.</p>
        </div>
    `;
}

function generatePrivacyPage() {
    return `
        <div class="privacy-page">
            <h1>Privacy Policy</h1>
            <p>Your privacy is important to us. This policy explains how we handle your data.</p>
        </div>
    `;
}

function generateTermsPage() {
    return `
        <div class="terms-page">
            <h1>Terms of Service</h1>
            <p>By using our platform, you agree to these terms.</p>
        </div>
    `;
}

function generateDisclosurePage() {
    return `
        <div class="disclosure-page">
            <h1>Affiliate Disclosure</h1>
            <p>We may earn commissions from affiliate links.</p>
        </div>
    `;
}

function generateCookiePage() {
    return `
        <div class="cookie-page">
            <h1>Cookie Policy</h1>
            <p>We use cookies to improve your experience.</p>
        </div>
    `;
}

function generateContactPage() {
    return `
        <div class="contact-page">
            <h1>Contact Us</h1>
            <p>Email: support@3eesher.cloud</p>
        </div>
    `;
}

function generateEarningsPage() {
    return `
        <div class="earnings-page">
            <h1>Earnings Disclaimer</h1>
            <p>Results may vary. Past performance doesn't guarantee future results.</p>
        </div>
    `;
}

function generateRefundPage() {
    return `
        <div class="refund-page">
            <h1>Refund Policy</h1>
            <p>Refunds are handled according to our terms.</p>
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
        
        db.all(`SELECT * FROM videos ORDER BY created_date DESC`, [], (err, videos) => {
            db.all(`SELECT * FROM posts ORDER BY published_date DESC LIMIT 3`, [], (err, posts) => {
                db.all(`SELECT * FROM ad_placements WHERE enabled = 1`, [], (err, ads) => {
                    db.all(`SELECT * FROM conversion_tracking WHERE enabled = 1`, [], (err, conversions) => {
                        db.all(`SELECT * FROM retargeting_pixels WHERE enabled = 1`, [], (err, pixels) => {
                            db.all(`SELECT * FROM injections WHERE active = 1`, [], (err, injections) => {
                                
                                // Group injections
                                const headInjection = injections.find(i => i.location === 'head')?.code || '';
                                const bodyStartInjection = injections.find(i => i.location === 'body_start')?.code || '';
                                const bodyEndInjection = injections.find(i => i.location === 'body_end')?.code || '';
                                const customCSS = injections.find(i => i.location === 'custom_css')?.code || '';
                                const customJS = injections.find(i => i.location === 'custom_js')?.code || '';
                                
                                // Group ads by location
                                const adsByLocation = {};
                                ads.forEach(ad => adsByLocation[ad.location] = ad.code);
                                
                                // Conversion pixels
                                const conversionPixels = conversions.map(c => c.pixel_code).join('\n');
                                
                                // Retargeting pixels
                                const retargetingPixels = pixels.map(p => p.pixel_code).join('\n');
                                
                                // Video HTML
                                const videoHTML = videos.map(v => `
                                    <div class="video-card">
                                        <video src="/uploads/${v.filename}" controls></video>
                                        <h3>${v.title}</h3>
                                        <p>👁️ ${v.views} views | 💰 $${v.revenue}</p>
                                    </div>
                                `).join('');
                                
                                // Blog HTML
                                const blogHTML = posts.map(p => `
                                    <article class="blog-card">
                                        <h3><a href="/post/${p.slug}">${p.title}</a></h3>
                                        <p>${p.excerpt || p.content.substring(0,150)}...</p>
                                        <small>👁️ ${p.views} views | 💰 $${p.revenue}</small>
                                    </article>
                                `).join('');
                                
                                res.send(`
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <title>${settings.site_title}</title>
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        
                                        <!-- HEAD INJECTION -->
                                        ${headInjection}
                                        
                                        <!-- CONVERSION PIXELS -->
                                        ${conversionPixels}
                                        
                                        <!-- RETARGETING PIXELS -->
                                        ${retargetingPixels}
                                        
                                        <style>
                                            * { margin:0; padding:0; box-sizing:border-box; }
                                            body {
                                                font-family: Arial, sans-serif;
                                                line-height: 1.6;
                                                color: #333;
                                            }
                                            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                                            header {
                                                background: linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color});
                                                color: white;
                                                padding: 20px 0;
                                            }
                                            .ad-header, .ad-footer, .ad-sidebar, .ad-content {
                                                text-align: center;
                                                margin: 20px 0;
                                                padding: 10px;
                                                background: #f5f5f5;
                                                border: 1px dashed #ccc;
                                            }
                                            .admin-btn {
                                                position: fixed;
                                                bottom: 20px;
                                                right: 20px;
                                                background: #667eea;
                                                color: white;
                                                padding: 15px 30px;
                                                border-radius: 50px;
                                                text-decoration: none;
                                            }
                                            .video-grid {
                                                display: grid;
                                                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                                                gap: 20px;
                                            }
                                            .video-card {
                                                background: white;
                                                border-radius: 10px;
                                                overflow: hidden;
                                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                            }
                                            .video-card video {
                                                width: 100%;
                                                height: 200px;
                                                object-fit: cover;
                                            }
                                            .video-card h3, .video-card p {
                                                padding: 10px;
                                            }
                                            ${customCSS}
                                        </style>
                                    </head>
                                    <body>
                                        <!-- BODY START INJECTION -->
                                        ${bodyStartInjection}
                                        
                                        <header>
                                            <div class="container">
                                                <h1>☁️ ${settings.site_name}</h1>
                                            </div>
                                        </header>
                                        
                                        <!-- HEADER AD -->
                                        ${adsByLocation['header'] ? `<div class="ad-header">${adsByLocation['header']}</div>` : ''}
                                        
                                        <div class="container">
                                            <div style="display: grid; grid-template-columns: 1fr 300px; gap: 20px;">
                                                <main>
                                                    <h2>🎥 Videos</h2>
                                                    <div class="video-grid">
                                                        ${videoHTML}
                                                    </div>
                                                    
                                                    <!-- CONTENT MIDDLE AD -->
                                                    ${adsByLocation['content_middle'] ? `<div class="ad-content">${adsByLocation['content_middle']}</div>` : ''}
                                                    
                                                    <h2 style="margin-top:40px;">📝 Latest Posts</h2>
                                                    ${blogHTML}
                                                    
                                                    <!-- CONTENT BOTTOM AD -->
                                                    ${adsByLocation['content_bottom'] ? `<div class="ad-content">${adsByLocation['content_bottom']}</div>` : ''}
                                                </main>
                                                
                                                <aside>
                                                    <!-- SIDEBAR TOP AD -->
                                                    ${adsByLocation['sidebar_top'] ? `<div class="ad-sidebar">${adsByLocation['sidebar_top']}</div>` : ''}
                                                    
                                                    <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                                        <h3>Quick Links</h3>
                                                        <ul>
                                                            <li><a href="/about">About</a></li>
                                                            <li><a href="/privacy">Privacy</a></li>
                                                            <li><a href="/terms">Terms</a></li>
                                                            <li><a href="/contact">Contact</a></li>
                                                        </ul>
                                                    </div>
                                                    
                                                    <!-- SIDEBAR BOTTOM AD -->
                                                    ${adsByLocation['sidebar_bottom'] ? `<div class="ad-sidebar">${adsByLocation['sidebar_bottom']}</div>` : ''}
                                                </aside>
                                            </div>
                                        </div>
                                        
                                        <!-- FOOTER AD -->
                                        ${adsByLocation['footer'] ? `<div class="ad-footer">${adsByLocation['footer']}</div>` : ''}
                                        
                                        <footer style="background: #333; color: white; padding: 40px 0; margin-top: 40px;">
                                            <div class="container">
                                                <p>${settings.footer_text}</p>
                                            </div>
                                        </footer>
                                        
                                        <!-- BODY END INJECTION -->
                                        ${bodyEndInjection}
                                        
                                        ${req.session.userId ? '<a href="/admin" class="admin-btn">⚙️ Admin</a>' : ''}
                                        
                                        <!-- POPUP AD -->
                                        ${adsByLocation['popup'] ? `
                                            <div id="popup" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:20px; border-radius:10px; z-index:10000;">
                                                <button onclick="this.parentElement.style.display='none'" style="float:right;">✖</button>
                                                ${adsByLocation['popup']}
                                            </div>
                                            <script>
                                                setTimeout(() => {
                                                    document.getElementById('popup').style.display = 'block';
                                                }, 5000);
                                            </script>
                                        ` : ''}
                                        
                                        <script>
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
            <body>
                <h1>${post.title}</h1>
                <div>${post.content}</div>
                <a href="/">← Back</a>
            </body>
            </html>
        `);
    });
});

app.get('/:page', (req, res) => {
    const slug = req.params.page;
    
    db.get(`SELECT * FROM pages WHERE slug = ? AND published = 1`, [slug], (err, page) => {
        if (!page) return res.redirect('/');
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>${page.title}</title></head>
            <body>
                ${page.content}
                <a href="/">← Back</a>
            </body>
            </html>
        `);
    });
});

// ==================== ADMIN PANEL ====================
app.get('/admin', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
        const settings = {};
        settingsRows.forEach(s => settings[s.key] = s.value);
        
        db.all(`SELECT * FROM payment_methods ORDER BY display_order`, [], (err, payments) => {
            db.all(`SELECT * FROM crypto_wallets`, [], (err, wallets) => {
                db.all(`SELECT * FROM ad_networks`, [], (err, networks) => {
                    db.all(`SELECT * FROM ad_placements ORDER BY priority`, [], (err, ads) => {
                        db.all(`SELECT * FROM conversion_tracking`, [], (err, conversions) => {
                            db.all(`SELECT * FROM retargeting_pixels`, [], (err, pixels) => {
                                db.all(`SELECT * FROM injections`, [], (err, injections) => {
                                    db.all(`SELECT * FROM videos`, [], (err, videos) => {
                                        db.all(`SELECT * FROM posts`, [], (err, posts) => {
                                            db.all(`SELECT * FROM users`, [], (err, users) => {
                                                
                                                res.send(`
                                                    <!DOCTYPE html>
                                                    <html>
                                                    <head>
                                                        <title>Admin Dashboard</title>
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
                                                            textarea { min-height: 100px; font-family: monospace; }
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
                                                            .card {
                                                                background: #f9f9f9;
                                                                padding: 20px;
                                                                border-radius: 10px;
                                                                border: 1px solid #eee;
                                                            }
                                                        </style>
                                                    </head>
                                                    <body>
                                                        <div class="container">
                                                            <h1>⚙️ Admin Dashboard - ${settings.site_name}</h1>
                                                            
                                                            <div class="tabs">
                                                                <button class="tab-btn active" onclick="showTab('dashboard')">📊 Dashboard</button>
                                                                <button class="tab-btn" onclick="showTab('payments')">💰 Payments</button>
                                                                <button class="tab-btn" onclick="showTab('crypto')">₿ Crypto</button>
                                                                <button class="tab-btn" onclick="showTab('ads')">📺 Ads</button>
                                                                <button class="tab-btn" onclick="showTab('conversions')">🎯 Conversions</button>
                                                                <button class="tab-btn" onclick="showTab('retargeting')">🔄 Retargeting</button>
                                                                <button class="tab-btn" onclick="showTab('injections')">💉 Injections</button>
                                                                <button class="tab-btn" onclick="showTab('content')">📹 Content</button>
                                                                <button class="tab-btn" onclick="showTab('users')">👥 Users</button>
                                                                <button class="tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
                                                            </div>
                                                            
                                                            <!-- DASHBOARD TAB -->
                                                            <div id="dashboard-tab" class="tab-content active">
                                                                <h2>Dashboard</h2>
                                                                <div class="grid">
                                                                    <div class="card">
                                                                        <h3>💰 Total Revenue</h3>
                                                                        <p style="font-size: 2rem;">${settings.currency_symbol}0.00</p>
                                                                    </div>
                                                                    <div class="card">
                                                                        <h3>📺 Ad Impressions</h3>
                                                                        <p style="font-size: 2rem;">0</p>
                                                                    </div>
                                                                    <div class="card">
                                                                        <h3>🎯 Conversions</h3>
                                                                        <p style="font-size: 2rem;">0</p>
                                                                    </div>
                                                                    <div class="card">
                                                                        <h3>👥 Users</h3>
                                                                        <p style="font-size: 2rem;">${users.length}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <!-- PAYMENTS TAB -->
                                                            <div id="payments-tab" class="tab-content">
                                                                <h2>Payment Methods</h2>
                                                                <table>
                                                                    <tr>
                                                                        <th>Name</th>
                                                                        <th>Type</th>
                                                                        <th>Fee</th>
                                                                        <th>Min/Max</th>
                                                                        <th>Status</th>
                                                                        <th>Actions</th>
                                                                    </tr>
                                                                    ${payments.map(p => `
                                                                        <tr>
                                                                            <td>${p.name}</td>
                                                                            <td>${p.type}</td>
                                                                            <td>${p.fee_percentage}% + ${settings.currency_symbol}${p.fee_fixed}</td>
                                                                            <td>${settings.currency_symbol}${p.min_amount} - ${settings.currency_symbol}${p.max_amount}</td>
                                                                            <td><span style="color:${p.enabled ? 'green' : 'red'}">${p.enabled ? 'Enabled' : 'Disabled'}</span></td>
                                                                            <td>
                                                                                <button onclick="editPayment(${p.id})">Edit</button>
                                                                                <button onclick="togglePayment(${p.id})">Toggle</button>
                                                                            </td>
                                                                        </tr>
                                                                    `).join('')}
                                                                </table>
                                                                
                                                                <h2>Add Payment Method</h2>
                                                                <form action="/admin/add-payment" method="POST" class="form">
                                                                    <div class="grid">
                                                                        <div>
                                                                            <label>Name</label>
                                                                            <input type="text" name="name" required>
                                                                        </div>
                                                                        <div>
                                                                            <label>Type</label>
                                                                            <select name="type">
                                                                                <option value="stripe">Stripe</option>
                                                                                <option value="paypal">PayPal</option>
                                                                                <option value="credit_card">Credit Card</option>
                                                                                <option value="crypto">Crypto</option>
                                                                                <option value="bank">Bank Transfer</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label>API Key</label>
                                                                            <input type="text" name="api_key">
                                                                        </div>
                                                                        <div>
                                                                            <label>API Secret</label>
                                                                            <input type="text" name="api_secret">
                                                                        </div>
                                                                        <div>
                                                                            <label>Fee %</label>
                                                                            <input type="number" step="0.1" name="fee_percentage" value="2.9">
                                                                        </div>
                                                                        <div>
                                                                            <label>Fixed Fee</label>
                                                                            <input type="number" step="0.01" name="fee_fixed" value="0.30">
                                                                        </div>
                                                                    </div>
                                                                    <button type="submit">Add Payment Method</button>
                                                                </form>
                                                            </div>
                                                            
                                                            <!-- CRYPTO TAB -->
                                                            <div id="crypto-tab" class="tab-content">
                                                                <h2>Crypto Wallets</h2>
                                                                <table>
                                                                    <tr>
                                                                        <th>Currency</th>
                                                                        <th>Network</th>
                                                                        <th>Address</th>
                                                                        <th>Label</th>
                                                                        <th>Status</th>
                                                                        <th>Actions</th>
                                                                    </tr>
                                                                    ${wallets.map(w => `
                                                                        <tr>
                                                                            <td>${w.currency}</td>
                                                                            <td>${w.network}</td>
                                                                            <td><small>${w.address.substring(0,20)}...</small></td>
                                                                            <td>${w.label}</td>
                                                                            <td><span style="color:${w.enabled ? 'green' : 'red'}">${w.enabled ? 'Active' : 'Inactive'}</span></td>
                                                                            <td>
                                                                                <button onclick="toggleWallet(${w.id})">Toggle</button>
                                                                                <button onclick="editWallet(${w.id})">Edit</button>
                                                                            </td>
                                                                        </tr>
                                                                    `).join('')}
                                                                </table>
                                                                
                                                                <h2>Add Wallet</h2>
                                                                <form action="/admin/add-wallet" method="POST">
                                                                    <div class="grid">
                                                                        <div>
                                                                            <label>Currency</label>
                                                                            <select name="currency">
                                                                                <option value="BTC">Bitcoin (BTC)</option>
                                                                                <option value="ETH">Ethereum (ETH)</option>
                                                                                <option value="USDT">Tether (USDT)</option>
                                                                                <option value="BNB">Binance Coin (BNB)</option>
                                                                                <option value="SOL">Solana (SOL)</option>
                                                                                <option value="XRP">Ripple (XRP)</option>
                                                                                <option value="ADA">Cardano (ADA)</option>
                                                                                <option value="DOT">Polkadot (DOT)</option>
                                                                                <option value="MATIC">Polygon (MATIC)</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label>Network</label>
                                                                            <select name="network">
                                                                                <option value="bitcoin">Bitcoin</option>
                                                                                <option value="ethereum">Ethereum</option>
                                                                                <option value="bsc">Binance Smart Chain</option>
                                                                                <option value="polygon">Polygon</option>
                                                                                <option value="solana">Solana</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label>Address</label>
                                                                            <input type="text" name="address" required>
                                                                        </div>
                                                                        <div>
                                                                            <label>Label</label>
                                                                            <input type="text" name="label" placeholder="Main Wallet">
                                                                        </div>
                                                                    </div>
                                                                    <button type="submit">Add Wallet</button>
                                                                </form>
                                                            </div>
                                                            
                                                            <!-- ADS TAB -->
                                                            <div id="ads-tab" class="tab-content">
                                                                <h2>Ad Networks</h2>
                                                                <table>
                                                                    <tr>
                                                                        <th>Name</th>
                                                                        <th>Type</th>
                                                                        <th>Publisher ID</th>
                                                                        <th>Status</th>
                                                                        <th>Actions</th>
                                                                    </tr>
                                                                    ${networks.map(n => `
                                                                        <tr>
                                                                            <td>${n.name}</td>
                                                                            <td>${n.type}</td>
                                                                            <td>${n.publisher_id}</td>
                                                                            <td><span style="color:${n.enabled ? 'green' : 'red'}">${n.enabled ? 'Enabled' : 'Disabled'}</span></td>
                                                                            <td>
                                                                                <button onclick="editNetwork(${n.id})">Edit</button>
                                                                                <button onclick="toggleNetwork(${n.id})">Toggle</button>
                                                                            </td>
                                                                        </tr>
                                                                    `).join('')}
                                                                </table>
                                                                
                                                                <h2 style="margin-top:40px;">Ad Placements</h2>
                                                                <table>
                                                                    <tr>
                                                                        <th>Name</th>
                                                                        <th>Location</th>
                                                                        <th>Devices</th>
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
                                                                            <td>${a.devices}</td>
                                                                            <td>${a.impressions}</td>
                                                                            <td>${a.clicks}</td>
                                                                            <td>${settings.currency_symbol}${a.revenue}</td>
                                                                            <td><span style="color:${a.enabled ? 'green' : 'red'}">${a.enabled ? 'Active' : 'Inactive'}</span></td>
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
                                                                            <label>Name</label>
                                                                            <input type="text" name="name" required>
                                                                        </div>
                                                                        <div>
                                                                            <label>Location</label>
                                                                            <select name="location">
                                                                                <option value="header">Header</option>
                                                                                <option value="sidebar_top">Sidebar Top</option>
                                                                                <option value="sidebar_middle">Sidebar Middle</option>
                                                                                <option value="sidebar_bottom">Sidebar Bottom</option>
                                                                                <option value="content_top">Content Top</option>
                                                                                <option value="content_middle">Content Middle</option>
                                                                                <option value="content_bottom">Content Bottom</option>
                                                                                <option value="footer">Footer</option>
                                                                                <option value="popup">Popup</option>
                                                                                <option value="infeed">In-feed</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label>Network</label>
                                                                            <select name="network_id">
                                                                                ${networks.map(n => `<option value="${n.id}">${n.name}</option>`).join('')}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label>Devices</label>
                                                                            <select name="devices">
                                                                                <option value="all">All Devices</option>
                                                                                <option value="desktop">Desktop Only</option>
                                                                                <option value="mobile">Mobile Only</option>
                                                                            </select>
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
                                                                <h2>Conversion Tracking</h2>
                                                                <table>
                                                                    <tr>
                                                                        <th>Name</th>
                                                                        <th>Provider</th>
                                                                        <th>Event</th>
                                                                        <th>Status</th>
                                                                        <th>Actions</th>
                                                                    </tr>
                                                                    ${conversions.map(c => `
                                                                        <tr>
                                                                            <td>${c.name}</td>
                                                                            <td>${c.provider}</td>
                                                                            <td>${c.event_name}</td>
                                                                            <td><span style="color:${c.enabled ? 'green' : 'red'}">${c.enabled ? 'Active' : 'Inactive'}</span></td>
                                                                            <td>
                                                                                <button onclick="editConversion(${c.id})">Edit Pixel</button>
                                                                                <button onclick="toggleConversion(${c.id})">Toggle</button>
                                                                            </td>
                                                                        </tr>
                                                                    `).join('')}
                                                                </table>
                                                                
                                                                <h2 style="margin-top:40px;">Add Conversion Pixel</h2>
                                                                <form action="/admin/add-conversion" method="POST">
                                                                    <div class="grid">
                                                                        <div>
                                                                            <label>Name</label>
                                                                            <input type="text" name="name" required>
                                                                        </div>
                                                                        <div>
                                                                            <label>Provider</label>
                                                                            <select name="provider">
                                                                                <option value="google">Google Ads</option>
                                                                                <option value="facebook">Facebook</option>
                                                                                <option value="tiktok">TikTok</option>
                                                                                <option value="twitter">Twitter</option>
                                                                                <option value="linkedin">LinkedIn</option>
                                                                                <option value="pinterest">Pinterest</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label>Event Name</label>
                                                                            <select name="event_name">
                                                                                <option value="Purchase">Purchase</option>
                                                                                <option value="Lead">Lead</option>
                                                                                <option value="SignUp">Sign Up</option>
                                                                                <option value="ViewContent">View Content</option>
                                                                                <option value="AddToCart">Add to Cart</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <div class="form-group">
                                                                        <label>Pixel Code</label>
                                                                        <textarea name="pixel_code" rows="3" required></textarea>
                                                                    </div>
                                                                    <button type="submit">Add Pixel</button>
                                                                </form>
                                                            </div>
                                                            
                                                            <!-- RETARGETING TAB -->
                                                            <div id="retargeting-tab" class="tab-content">
                                                                <h2>Retargeting Pixels</h2>
                                                                <table>
                                                                    <tr>
                                                                        <th>Name</th>
                                                                        <th>Provider</th>
                                                                        <th>Pixel ID</th>
                                                                        <th>Events</th>
                                                                        <th>Status</th>
                                                                        <th>Actions</th>
                                                                    </tr>
                                                                    ${pixels.map(p => `
                                                                        <tr>
                                                                            <td>${p.name}</td>
                                                                            <td>${p.provider}</td>
                                                                            <td>${p.pixel_id}</td>
                                                                            <td>${p.events}</td>
                                                                            <td><span style="color:${p.enabled ? 'green' : 'red'}">${p.enabled ? 'Active' : 'Inactive'}</span></td>
                                                                            <td>
                                                                                <button onclick="editPixel(${p.id})">Edit</button>
                                                                                <button onclick="togglePixel(${p.id})">Toggle</button>
                                                                            </td>
                                                                        </tr>
                                                                    `).join('')}
                                                                </table>
                                                                
                                                                <h2 style="margin-top:40px;">Add Retargeting Pixel</h2>
                                                                <form action="/admin/add-pixel" method="POST">
                                                                    <div class="grid">
                                                                        <div>
                                                                            <label>Name</label>
                                                                            <input type="text" name="name" required>
                                                                        </div>
                                                                        <div>
                                                                            <label>Provider</label>
                                                                            <select name="provider">
                                                                                <option value="facebook">Facebook</option>
                                                                                <option value="google">Google</option>
                                                                                <option value="tiktok">TikTok</option>
                                                                                <option value="twitter">Twitter</option>
                                                                                <option value="pinterest">Pinterest</option>
                                                                                <option value="criteo">Criteo</option>
                                                                                <option value="adroll">AdRoll</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label>Pixel ID</label>
                                                                            <input type="text" name="pixel_id" required>
                                                                        </div>
                                                                    </div>
                                                                    <div class="form-group">
                                                                        <label>Pixel Code</label>
                                                                        <textarea name="pixel_code" rows="5" required></textarea>
                                                                    </div>
                                                                    <div class="form-group">
                                                                        <label>Events (JSON array)</label>
                                                                        <input type="text" name="events" value='["PageView","Purchase"]'>
                                                                    </div>
                                                                    <button type="submit">Add Pixel</button>
                                                                </form>
                                                            </div>
                                                            
                                                            <!-- INJECTIONS TAB -->
                                                            <div id="injections-tab" class="tab-content">
                                                                <h2>Code Injections (Super Admin Only)</h2>
                                                                <div class="grid">
                                                                    ${['head', 'body_start', 'body_end', 'custom_css', 'custom_js'].map(loc => {
                                                                        const inj = injections.find(i => i.location === loc);
                                                                        return `
                                                                            <div class="card">
                                                                                <h3>${loc.toUpperCase()}</h3>
                                                                                <textarea id="inj-${loc}" rows="8" style="width:100%;">${inj?.code || ''}</textarea>
                                                                                <button onclick="saveInjection('${loc}')">Save</button>
                                                                            </div>
                                                                        `;
                                                                    }).join('')}
                                                                </div>
                                                            </div>
                                                            
                                                            <!-- CONTENT TAB -->
                                                            <div id="content-tab" class="tab-content">
                                                                <h2>Upload Video</h2>
                                                                <form action="/admin/upload-video" method="POST" enctype="multipart/form-data">
                                                                    <div class="grid">
                                                                        <div>
                                                                            <label>Title</label>
                                                                            <input type="text" name="title" required>
                                                                        </div>
                                                                        <div>
                                                                            <label>Video File</label>
                                                                            <input type="file" name="video" accept="video/*" required>
                                                                        </div>
                                                                    </div>
                                                                    <button type="submit">Upload Video</button>
                                                                </form>
                                                                
                                                                <h2 style="margin-top:40px;">Create Blog Post</h2>
                                                                <form action="/admin/create-post" method="POST">
                                                                    <div class="grid">
                                                                        <div>
                                                                            <label>Title</label>
                                                                            <input type="text" name="title" required>
                                                                        </div>
                                                                        <div>
                                                                            <label>Slug</label>
                                                                            <input type="text" name="slug" placeholder="auto-generate">
                                                                        </div>
                                                                    </div>
                                                                    <div class="form-group">
                                                                        <label>Content</label>
                                                                        <textarea name="content" rows="10" required></textarea>
                                                                    </div>
                                                                    <button type="submit">Create Post</button>
                                                                </form>
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
                                                                        <th>Earnings</th>
                                                                        <th>Actions</th>
                                                                    </tr>
                                                                    ${users.map(u => `
                                                                        <tr>
                                                                            <td>${u.id}</td>
                                                                            <td>${u.username}</td>
                                                                            <td>${u.email}</td>
                                                                            <td>${u.role}</td>
                                                                            <td>${settings.currency_symbol}${u.earnings}</td>
                                                                            <td>
                                                                                <button onclick="editUser(${u.id})">Edit</button>
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
                                                                                <label>Description</label>
                                                                                <textarea name="site_description">${settings.site_description}</textarea>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <h3>Colors</h3>
                                                                            <div class="form-group">
                                                                                <label>Primary</label>
                                                                                <input type="color" name="primary_color" value="${settings.primary_color}">
                                                                            </div>
                                                                            <div class="form-group">
                                                                                <label>Secondary</label>
                                                                                <input type="color" name="secondary_color" value="${settings.secondary_color}">
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <h3>Currency</h3>
                                                                            <div class="form-group">
                                                                                <label>Currency</label>
                                                                                <select name="currency">
                                                                                    <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD</option>
                                                                                    <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                                                                                    <option value="GBP" ${settings.currency === 'GBP' ? 'selected' : ''}>GBP</option>
                                                                                </select>
                                                                            </div>
                                                                            <div class="form-group">
                                                                                <label>Symbol</label>
                                                                                <input type="text" name="currency_symbol" value="${settings.currency_symbol}">
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <h3>Withdrawals</h3>
                                                                            <div class="form-group">
                                                                                <label>Min Withdrawal</label>
                                                                                <input type="number" name="min_withdrawal" value="${settings.min_withdrawal}">
                                                                            </div>
                                                                            <div class="form-group">
                                                                                <label>Withdrawal Fee</label>
                                                                                <input type="number" name="withdrawal_fee" value="${settings.withdrawal_fee}">
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <button type="submit">Save All Settings</button>
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
                                                                }).then(() => alert('Saved!'));
                                                            }
                                                            
                                                            function togglePayment(id) {
                                                                fetch('/admin/toggle-payment/' + id, { method: 'POST' })
                                                                    .then(() => location.reload());
                                                            }
                                                            
                                                            function toggleWallet(id) {
                                                                fetch('/admin/toggle-wallet/' + id, { method: 'POST' })
                                                                    .then(() => location.reload());
                                                            }
                                                            
                                                            function toggleNetwork(id) {
                                                                fetch('/admin/toggle-network/' + id, { method: 'POST' })
                                                                    .then(() => location.reload());
                                                            }
                                                            
                                                            function toggleAd(id) {
                                                                fetch('/admin/toggle-ad/' + id, { method: 'POST' })
                                                                    .then(() => location.reload());
                                                            }
                                                            
                                                            function toggleConversion(id) {
                                                                fetch('/admin/toggle-conversion/' + id, { method: 'POST' })
                                                                    .then(() => location.reload());
                                                            }
                                                            
                                                            function togglePixel(id) {
                                                                fetch('/admin/toggle-pixel/' + id, { method: 'POST' })
                                                                    .then(() => location.reload());
                                                            }
                                                            
                                                            function editPayment(id) { alert('Edit payment ' + id); }
                                                            function editWallet(id) { alert('Edit wallet ' + id); }
                                                            function editNetwork(id) { alert('Edit network ' + id); }
                                                            function editAd(id) { alert('Edit ad ' + id); }
                                                            function editConversion(id) { alert('Edit conversion ' + id); }
                                                            function editPixel(id) { alert('Edit pixel ' + id); }
                                                            function editUser(id) { alert('Edit user ' + id); }
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

// ==================== ADMIN API ROUTES ====================

// Add payment method
app.post('/admin/add-payment', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO payment_methods (name, type, api_key, api_secret, fee_percentage, fee_fixed, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.body.name, req.body.type, req.body.api_key, req.body.api_secret, req.body.fee_percentage, req.body.fee_fixed, new Date().toISOString()]);
    res.redirect('/admin');
});

// Toggle payment
app.post('/admin/toggle-payment/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE payment_methods SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Add wallet
app.post('/admin/add-wallet', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO crypto_wallets (currency, network, address, label, created_date) VALUES (?, ?, ?, ?, ?)`,
        [req.body.currency, req.body.network, req.body.address, req.body.label, new Date().toISOString()]);
    res.redirect('/admin');
});

// Toggle wallet
app.post('/admin/toggle-wallet/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE crypto_wallets SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Toggle network
app.post('/admin/toggle-network/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE ad_networks SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Add ad placement
app.post('/admin/add-ad', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO ad_placements (name, location, code, network_id, devices, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.body.name, req.body.location, req.body.code, req.body.network_id, req.body.devices, new Date().toISOString()]);
    res.redirect('/admin');
});

// Toggle ad
app.post('/admin/toggle-ad/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE ad_placements SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Add conversion
app.post('/admin/add-conversion', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO conversion_tracking (name, provider, pixel_code, event_name, created_date) VALUES (?, ?, ?, ?, ?)`,
        [req.body.name, req.body.provider, req.body.pixel_code, req.body.event_name, new Date().toISOString()]);
    res.redirect('/admin');
});

// Toggle conversion
app.post('/admin/toggle-conversion/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE conversion_tracking SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Add pixel
app.post('/admin/add-pixel', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO retargeting_pixels (name, provider, pixel_id, pixel_code, events, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.body.name, req.body.provider, req.body.pixel_id, req.body.pixel_code, req.body.events, new Date().toISOString()]);
    res.redirect('/admin');
});

// Toggle pixel
app.post('/admin/toggle-pixel/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`UPDATE retargeting_pixels SET enabled = NOT enabled WHERE id = ?`, [req.params.id]);
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

// Upload video
app.post('/admin/upload-video', upload.single('video'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO videos (title, filename, created_date) VALUES (?, ?, ?)`,
        [req.body.title, req.file.filename, new Date().toISOString()]);
    res.redirect('/admin');
});

// Create post
app.post('/admin/create-post', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const slug = req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    db.run(`INSERT INTO posts (title, slug, content, published_date, created_date) VALUES (?, ?, ?, ?, ?)`,
        [req.body.title, slug, req.body.content, new Date().toISOString(), new Date().toISOString()]);
    res.redirect('/admin');
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
    db.get(`SELECT * FROM users WHERE username = ?`, [req.body.username], (err, user) => {
        if (user && bcrypt.compareSync(req.body.password, user.password)) {
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

// ==================== AD TRACKING ====================
app.get('/track/impression/:id', (req, res) => {
    const placementId = req.params.id;
    const sessionId = req.session.id;
    const ip = req.ip;
    const ua = req.get('User-Agent');
    
    db.run(`UPDATE ad_placements SET impressions = impressions + 1 WHERE id = ?`, [placementId]);
    
    db.run(`INSERT INTO ad_tracking (placement_id, session_id, ip_address, user_agent, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [placementId, sessionId, ip, ua, new Date().toISOString()]);
    
    res.sendStatus(200);
});

app.get('/track/click/:id', (req, res) => {
    const placementId = req.params.id;
    const sessionId = req.session.id;
    
    db.run(`UPDATE ad_placements SET clicks = clicks + 1 WHERE id = ?`, [placementId]);
    
    res.redirect(req.query.url || '/');
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3eesher.cloud MONETIZATION PLATFORM`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`👤 Admin: http://localhost:${PORT}/admin`);
    console.log(`🔑 Login: admin / admin123`);
    console.log(``);
    console.log(`✅ PAYMENT METHODS:`);
    console.log(`   - Stripe, PayPal, Credit Cards (Visa, Mastercard, Amex, Discover)`);
    console.log(`   - Crypto (BTC, ETH, USDT, BNB, SOL, XRP, ADA, DOT, MATIC)`);
    console.log(`   - Bank Transfer`);
    console.log(``);
    console.log(`✅ AD NETWORKS:`);
    console.log(`   - Google AdSense, Taboola, Outbrain, Mediavine, Ezoic, AdThrive`);
    console.log(`   - Direct Ads, Amazon Associates, ShareASale, CJ Affiliate`);
    console.log(``);
    console.log(`✅ AD PLACEMENTS:`);
    console.log(`   - Header, Sidebar (Top, Middle, Bottom), Content (Top, Middle, Bottom)`);
    console.log(`   - Footer, Popup, In-feed, Interstitial`);
    console.log(``);
    console.log(`✅ CONVERSION TRACKING:`);
    console.log(`   - Google, Facebook, TikTok, Twitter, LinkedIn, Pinterest, Snapchat`);
    console.log(``);
    console.log(`✅ RETARGETING:`);
    console.log(`   - Facebook, Google, TikTok, Twitter, Pinterest, Criteo, AdRoll`);
    console.log(``);
    console.log(`✅ CODE INJECTION:`);
    console.log(`   - Head, Body Start, Body End, Custom CSS, Custom JS`);
});
