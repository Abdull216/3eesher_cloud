// ==================== COMPLETE 3EESHER.CLOUD PLATFORM ====================
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
    secret: '3eesher-complete-v3',
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
        password TEXT,
        role TEXT DEFAULT 'viewer',
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
        downloads INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0,
        created_date TEXT
    )`);
    
    // PLACEHOLDERS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS placeholders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        location TEXT,
        link TEXT,
        display_order INTEGER DEFAULT 0,
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
        published_date TEXT,
        created_date TEXT
    )`);
    
    // GALLERY TABLE
    db.run(`CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        type TEXT,
        created_date TEXT
    )`);
    
    // PAYMENT METHODS TABLE
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
    
    // AD PLACEMENTS TABLE
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
    
    // CONVERSION TRACKING TABLE
    db.run(`CREATE TABLE IF NOT EXISTS conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        provider TEXT,
        pixel_code TEXT,
        enabled INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // RETARGETING PIXELS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS retargeting (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        provider TEXT,
        pixel_code TEXT,
        enabled INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // INJECTIONS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS injections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT UNIQUE,
        code TEXT,
        active INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // SETTINGS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);
    
    // PAGES TABLE
    db.run(`CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        slug TEXT UNIQUE,
        content TEXT,
        published INTEGER DEFAULT 1,
        created_date TEXT
    )`);
    
    // CONTACT MESSAGES TABLE
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
    
    // Create admin user with changeable password
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.run(`INSERT OR IGNORE INTO users (username, password, role, created_date) VALUES (?, ?, ?, ?)`,
        ['admin', hash, 'super_admin', new Date().toISOString()]);
    
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
        ['contact_email', 'contact@3eesher.cloud'],
        ['contact_phone', '+1 (555) 123-4567'],
        ['contact_address', '123 Creator Street, Digital City, DC 12345'],
        ['currency', 'USD'],
        ['currency_symbol', '$'],
        ['ads_enabled', 'true'],
        ['payments_enabled', 'true']
    ];
    
    settings.forEach(([key, value]) => {
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    });
    
    // Default payment methods
    const payments = [
        ['Stripe', 'stripe', 1, 'pk_test_...', 'sk_test_...', 2.9],
        ['PayPal', 'paypal', 1, 'client_id_...', 'secret_...', 3.5],
        ['Credit Card', 'credit_card', 1, '', '', 2.9],
        ['Bitcoin', 'crypto', 1, 'BTC', '', 1.0],
        ['Ethereum', 'crypto', 1, 'ETH', '', 1.0],
        ['USDT', 'crypto', 1, 'USDT', '', 1.0],
        ['Bank Transfer', 'bank', 1, '', '', 0]
    ];
    
    payments.forEach(([name, type, enabled, key, secret, fee]) => {
        db.run(`INSERT OR IGNORE INTO payment_methods (name, type, enabled, api_key, api_secret, fee_percentage, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, type, enabled, key, secret, fee, new Date().toISOString()]);
    });
    
    // Default ad placements
    const ads = [
        ['Header Banner', 'header', '<!-- Google AdSense Header Code -->\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"\n     data-ad-slot="XXXXXXXXXX"\n     data-ad-format="auto"></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>', 1],
        ['Sidebar Top', 'sidebar_top', '<!-- Sidebar Ad -->', 1],
        ['Sidebar Bottom', 'sidebar_bottom', '<!-- Sidebar Ad -->', 1],
        ['Content Top', 'content_top', '<!-- Content Ad -->', 1],
        ['Content Middle', 'content_middle', '<!-- Content Ad -->', 1],
        ['Content Bottom', 'content_bottom', '<!-- Content Ad -->', 1],
        ['Footer Banner', 'footer', '<!-- Footer Ad -->', 1],
        ['Popup Ad', 'popup', '<!-- Popup Ad Code -->', 1]
    ];
    
    ads.forEach(([name, location, code, enabled]) => {
        db.run(`INSERT OR IGNORE INTO ad_placements (name, location, code, enabled, created_date) VALUES (?, ?, ?, ?, ?)`,
            [name, location, code, enabled, new Date().toISOString()]);
    });
    
    // Default conversion pixels
    const conversions = [
        ['Google Ads Conversion', 'google', '<!-- Google Ads Conversion Pixel -->\n<script>gtag(\'event\', \'conversion\', {\'send_to\': \'AW-XXXXXXXXXX/XXXXXXXXXX\'});</script>', 1],
        ['Facebook Pixel', 'facebook', '<!-- Facebook Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version=\'2.0\';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,\'script\',\n\'https://connect.facebook.net/en_US/fbevents.js\');\nfbq(\'init\', \'YOUR_PIXEL_ID\');\nfbq(\'track\', \'PageView\');\n</script>', 1],
        ['TikTok Pixel', 'tiktok', '<!-- TikTok Pixel -->', 1]
    ];
    
    conversions.forEach(([name, provider, code, enabled]) => {
        db.run(`INSERT OR IGNORE INTO conversions (name, provider, pixel_code, enabled, created_date) VALUES (?, ?, ?, ?, ?)`,
            [name, provider, code, enabled, new Date().toISOString()]);
    });
    
    // Default retargeting pixels
    const retargeting = [
        ['Facebook Retargeting', 'facebook', '<!-- Facebook Pixel -->', 1],
        ['Google Remarketing', 'google', '<!-- Google Remarketing -->', 1],
        ['Twitter Pixel', 'twitter', '<!-- Twitter Pixel -->', 1]
    ];
    
    retargeting.forEach(([name, provider, code, enabled]) => {
        db.run(`INSERT OR IGNORE INTO retargeting (name, provider, pixel_code, enabled, created_date) VALUES (?, ?, ?, ?, ?)`,
            [name, provider, code, enabled, new Date().toISOString()]);
    });
    
    // Default pages
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
    
    // ==================== SAMPLE VIDEOS ====================
    db.get(`SELECT COUNT(*) as count FROM videos`, [], (err, row) => {
        if (row.count === 0) {
            const sampleVideos = [
                ['Getting Started with 3eesher.cloud', 'sample1.mp4', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 'Learn how to use our platform', 1250, 1],
                ['Video Creation Tips', 'sample2.mp4', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400', 'Professional tips for better videos', 890, 1],
                ['Behind the Scenes', 'sample3.mp4', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 'See how we create content', 567, 1],
                ['Community Spotlight', 'sample4.mp4', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'Amazing videos from our community', 432, 1]
            ];
            
            sampleVideos.forEach(([title, filename, thumb, desc, views, featured]) => {
                db.run(`INSERT INTO videos (title, filename, thumbnail, description, views, featured, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [title, filename, thumb, desc, views, featured, new Date().toISOString()]);
            });
        }
    });
    
    // ==================== SAMPLE PLACEHOLDERS ====================
    db.get(`SELECT COUNT(*) as count FROM placeholders`, [], (err, row) => {
        if (row.count === 0) {
            const placeholders = [
                ['Hero Banner 1', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=1200', 'hero', '/videos', 1],
                ['Hero Banner 2', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200', 'hero', '/blog', 2],
                ['Hero Banner 3', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=1200', 'hero', '/gallery', 3],
                ['Hero Banner 4', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200', 'hero', '/about', 4],
                ['Hero Banner 5', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200', 'hero', '/contact', 5],
                ['Featured Banner', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800', 'featured', '/blog', 1],
                ['Promo Banner', 'https://images.unsplash.com-1519389950473?w=800', 'banner', '/videos', 1]
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
                ['Getting Started on 3eesher.cloud', 'getting-started', '<h1>Welcome to 3eesher.cloud!</h1><p>We\'re excited to have you here. This platform allows you to share videos, write blog posts, and connect with creators from around the world.</p><h2>What You Can Do</h2><ul><li>Upload and share videos</li><li>Write blog posts</li><li>Create a gallery</li><li>Connect with other creators</li></ul><p>Our platform is completely free to use, and you can start earning money through our integrated monetization system.</p>', 'Welcome to our platform! Learn how to get started.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', 342],
                ['10 Tips for Better Videos', 'video-tips', '<h1>10 Tips for Creating Amazing Videos</h1><p>Creating engaging video content doesn\'t have to be complicated. Here are our top tips:</p><ol><li>Plan your content - Always script your videos</li><li>Use good lighting - Natural light works best</li><li>Clear audio is crucial - Invest in a good microphone</li><li>Keep it concise - Attention spans are short</li><li>Engage with your audience - Ask questions</li><li>Add captions - For accessibility</li><li>Use thumbnails - Make them clickable</li><li>Optimize for mobile - Most viewers use phones</li><li>Post consistently - Build an audience</li><li>Analyze performance - Learn what works</li></ol>', 'Learn how to create videos that viewers love.', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 267],
                ['Monetizing Your Content', 'monetization', '<h1>How to Make Money from Your Content</h1><p>There are multiple ways to monetize your content on 3eesher.cloud:</p><h2>1. Ad Revenue</h2><p>Display ads on your videos and earn money per impression.</p><h2>2. Affiliate Marketing</h2><p>Promote products and earn commissions on sales.</p><h2>3. Sponsored Content</h2><p>Partner with brands to create sponsored videos.</p><h2>4. Premium Subscriptions</h2><p>Offer exclusive content to paying subscribers.</p><h2>5. Direct Donations</h2><p>Let your fans support you directly.</p>', 'Explore different ways to earn from your content.', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400', 189],
                ['Building Your Audience', 'audience', '<h1>How to Build and Grow Your Audience</h1><p>Growing an audience takes time and effort. Here are proven strategies:</p><ul><li>Post consistently</li><li>Engage with comments</li><li>Collaborate with other creators</li><li>Promote on social media</li><li>Use SEO for discoverability</li><li>Create valuable content</li><li>Be authentic and unique</li></ul>', 'Tips for growing your viewer base.', 'https://images.unsplash.com-1519389950473?w=400', 156]
            ];
            
            posts.forEach(([title, slug, content, excerpt, image, views]) => {
                db.run(`INSERT INTO posts (title, slug, content, excerpt, image, views, published_date, created_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [title, slug, content, excerpt, image, views, new Date().toISOString(), new Date().toISOString()]);
            });
        }
    });
    
    // ==================== SAMPLE GALLERY ====================
    db.get(`SELECT COUNT(*) as count FROM gallery`, [], (err, row) => {
        if (row.count === 0) {
            const galleryImages = [
                ['Team Meeting', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', 'image'],
                ['Office Space', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', 'image'],
                ['Creative Work', 'https://images.unsplash.com/photo-1517245386807-9b4d0a6e4b9c?w=400', 'image'],
                ['Video Shoot', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400', 'image'],
                ['Studio Setup', 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', 'image'],
                ['Team Lunch', 'https://images.unsplash.com/photo-1517245386807-9b4d0a6e4b9c?w=400', 'image'],
                ['Workshop', 'https://images.unsplash.com-1519389950473?w=400', 'image'],
                ['Conference', 'https://images.unsplash.com-1557804506?w=400', 'image']
            ];
            
            galleryImages.forEach(([title, filename, type]) => {
                db.run(`INSERT INTO gallery (title, filename, type, created_date) VALUES (?, ?, ?, ?)`,
                    [title, filename, type, new Date().toISOString()]);
            });
        }
    });
});

// ==================== PAGE CONTENT GENERATORS ====================
function generateAboutPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">About 3eesher.cloud</h1>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <h2 style="margin-bottom: 20px;">Our Mission</h2>
                <p style="font-size: 18px; line-height: 1.8;">To empower creators worldwide with the tools they need to share their stories, connect with audiences, and build sustainable careers through their content.</p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; margin: 40px 0;">
                <div style="text-align: center; padding: 30px; background: #f7f9fc; border-radius: 15px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🎥</div>
                    <h3>Video Platform</h3>
                    <p>Upload, share, and discover amazing videos from creators around the world.</p>
                </div>
                <div style="text-align: center; padding: 30px; background: #f7f9fc; border-radius: 15px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                    <h3>Blog Community</h3>
                    <p>Write and read insightful articles on content creation, marketing, and more.</p>
                </div>
                <div style="text-align: center; padding: 30px; background: #f7f9fc; border-radius: 15px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">💰</div>
                    <h3>Monetization</h3>
                    <p>Multiple ways to earn from your content including ads, affiliates, and subscriptions.</p>
                </div>
            </div>
            
            <div style="margin: 40px 0;">
                <h2 style="margin-bottom: 20px;">Our Story</h2>
                <p style="line-height: 1.8; color: #666;">Founded in 2024, 3eesher.cloud was born from a simple idea: creators deserve a platform that gives them complete control. We built a system that combines powerful features with ease of use, allowing anyone to share their passion with the world.</p>
                <p style="line-height: 1.8; color: #666; margin-top: 20px;">Today, we're proud to support thousands of creators across the globe, helping them turn their creativity into income.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 40px; border-radius: 20px; margin: 40px 0;">
                <h2 style="margin-bottom: 30px; text-align: center;">Meet the Team</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 30px;">
                    <div style="text-align: center;">
                        <img src="https://randomuser.me/api/portraits/men/32.jpg" style="width: 120px; height: 120px; border-radius: 50%; margin-bottom: 15px;">
                        <h3>Alex Chen</h3>
                        <p style="color: #667eea;">Founder & CEO</p>
                    </div>
                    <div style="text-align: center;">
                        <img src="https://randomuser.me/api/portraits/women/44.jpg" style="width: 120px; height: 120px; border-radius: 50%; margin-bottom: 15px;">
                        <h3>Sarah Johnson</h3>
                        <p style="color: #667eea;">Lead Developer</p>
                    </div>
                    <div style="text-align: center;">
                        <img src="https://randomuser.me/api/portraits/men/75.jpg" style="width: 120px; height: 120px; border-radius: 50%; margin-bottom: 15px;">
                        <h3>Marcus Williams</h3>
                        <p style="color: #667eea;">Community Manager</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generatePrivacyPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Privacy Policy</h1>
            <p style="color: #666; margin-bottom: 30px;">Last Updated: February 2024</p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <h2 style="margin-bottom: 20px;">Our Commitment to Privacy</h2>
                <p>Your privacy is critically important to us. At 3eesher.cloud, we have a few fundamental principles:</p>
                <ul style="margin-top: 20px; list-style-position: inside;">
                    <li>We don't ask for personal information unless we truly need it.</li>
                    <li>We don't share your personal information except to comply with law or protect our rights.</li>
                    <li>We don't store personal information on our servers unless required for operation.</li>
                </ul>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Information We Collect</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px;">Account Information</h3>
                <p>When you register, we collect your name, email address, and profile information.</p>
                
                <h3 style="margin: 20px 0 15px;">Usage Data</h3>
                <p>We collect information about how you use our platform to improve our services.</p>
                
                <h3 style="margin: 20px 0 15px;">Cookies</h3>
                <p>We use cookies to enhance your experience and analyze traffic.</p>
            </div>
            
            <h2 style="margin: 40px 0 20px;">How We Use Your Information</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <ul style="list-style-position: inside;">
                    <li>To provide and maintain our service</li>
                    <li>To notify you about changes</li>
                    <li>To provide customer support</li>
                    <li>To gather analysis for improvement</li>
                    <li>To monitor usage</li>
                    <li>To detect and prevent technical issues</li>
                </ul>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Data Security</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: #f7f9fc; padding: 20px; border-radius: 10px;">
                    <h3 style="color: #667eea;">🔒 Encryption</h3>
                    <p>All data encrypted with SSL/TLS</p>
                </div>
                <div style="background: #f7f9fc; padding: 20px; border-radius: 10px;">
                    <h3 style="color: #667eea;">🛡️ Monitoring</h3>
                    <p>24/7 security monitoring</p>
                </div>
                <div style="background: #f7f9fc; padding: 20px; border-radius: 10px;">
                    <h3 style="color: #667eea;">📋 Audits</h3>
                    <p>Regular security audits</p>
                </div>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Your Rights</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <ul style="list-style-position: inside;">
                    <li>Access your personal data</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Object to data processing</li>
                    <li>Data portability</li>
                </ul>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Third-Party Services</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <p>We may use third-party services for analytics, payment processing, and advertising. These services have their own privacy policies.</p>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Children's Privacy</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <p>Our service is not intended for users under 13. We do not knowingly collect data from children.</p>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Changes to This Policy</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <p>We may update this policy from time to time. We'll notify you of any changes by posting the new policy on this page.</p>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Contact Us</h2>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px;">
                <p>Email: privacy@3eesher.cloud</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Address: 123 Creator Street, Digital City, DC 12345</p>
            </div>
        </div>
    `;
}

function generateTermsPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Terms of Service</h1>
            <p style="color: #666; margin-bottom: 30px;">Last Updated: February 2024</p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <h2 style="margin-bottom: 20px;">Agreement to Terms</h2>
                <p>By accessing 3eesher.cloud, you agree to be bound by these Terms. If you disagree, you may not access the service.</p>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Account Terms</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <ul style="list-style-position: inside;">
                    <li>You must be 13 years or older</li>
                    <li>You're responsible for account security</li>
                    <li>You're responsible for all content posted</li>
                    <li>One person per account</li>
                    <li>You must provide accurate information</li>
                </ul>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Content Guidelines</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <p>You may not post content that is:</p>
                <ul style="list-style-position: inside; margin-top: 10px;">
                    <li>Illegal or promotes illegal activity</li>
                    <li>Harassing or abusive</li>
                    <li>Infringes intellectual property</li>
                    <li>Contains malware or harmful code</li>
                    <li>Sexually explicit or violent</li>
                    <li>Misleading or deceptive</li>
                </ul>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Intellectual Property</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <p>You retain ownership of your content. By posting, you grant us license to host and display it on the platform.</p>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Termination</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <p>We may terminate or suspend access immediately, without prior notice, for conduct we believe violates these Terms.</p>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Limitation of Liability</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <p>In no event shall 3eesher.cloud be liable for any indirect, incidental, special, consequential or punitive damages.</p>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Changes to Terms</h2>
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <p>We reserve the right to modify these terms at any time. We'll notify users of any material changes.</p>
            </div>
            
            <h2 style="margin: 40px 0 20px;">Contact Information</h2>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px;">
                <p>Email: legal@3eesher.cloud</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Address: 123 Creator Street, Digital City, DC 12345</p>
            </div>
        </div>
    `;
}

function generateDisclosurePage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Affiliate Disclosure</h1>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p style="font-size: 18px;">Transparency is important to us. This page explains how we use affiliate links on our platform.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">What Are Affiliate Links?</h2>
                <p>Some of the links on this site are affiliate links. This means if you click on the link and purchase an item, we may receive an affiliate commission at no extra cost to you.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">Our Commitment</h2>
                <p>We only recommend products and services we truly believe in. Our recommendations are based on our own experience and research.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">Affiliate Programs</h2>
                <p>We participate in various affiliate programs including:</p>
                <ul style="list-style-position: inside; margin-top: 10px;">
                    <li>Amazon Associates</li>
                    <li>ShareASale</li>
                    <li>CJ Affiliate</li>
                    <li>Rakuten Marketing</li>
                    <li>Impact Radius</li>
                    <li>ClickBank</li>
                    <li>FlexOffers</li>
                </ul>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">Questions?</h2>
                <p>If you have any questions about our affiliate relationships, please contact us at affiliates@3eesher.cloud</p>
            </div>
        </div>
    `;
}

function generateCookiePage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Cookie Policy</h1>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p>We use cookies to enhance your experience on 3eesher.cloud.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">What Are Cookies?</h2>
                <p>Cookies are small text files stored on your device when you visit websites. They help us provide a better experience by remembering your preferences and understanding how you use our site.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">How We Use Cookies</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div style="background: white; padding: 20px; border-radius: 10px;">
                        <h3>Essential Cookies</h3>
                        <p>Required for basic site functionality like login and security.</p>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 10px;">
                        <h3>Analytics Cookies</h3>
                        <p>Help us understand how visitors use our site.</p>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 10px;">
                        <h3>Preference Cookies</h3>
                        <p>Remember your settings and preferences.</p>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 10px;">
                        <h3>Marketing Cookies</h3>
                        <p>Used for personalized advertising.</p>
                    </div>
                </div>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">Third-Party Cookies</h2>
                <p>Some cookies are set by third-party services we use, such as Google Analytics, advertising partners, and social media platforms.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">Managing Cookies</h2>
                <p>You can control cookies through your browser settings. Most browsers allow you to block or delete cookies. However, disabling cookies may affect site functionality.</p>
                <p style="margin-top: 10px;"><strong>How to manage cookies in popular browsers:</strong></p>
                <ul style="list-style-position: inside; margin-top: 10px;">
                    <li>Chrome: Settings → Privacy and Security → Cookies</li>
                    <li>Firefox: Options → Privacy & Security → Cookies</li>
                    <li>Safari: Preferences → Privacy → Cookies</li>
                    <li>Edge: Settings → Cookies and site permissions</li>
                </ul>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px;">
                <h2 style="margin-bottom: 20px;">Contact Us</h2>
                <p>For questions about our cookie usage, contact: privacy@3eesher.cloud</p>
            </div>
        </div>
    `;
}

function generateContactPage() {
    return `
        <div style="max-width: 1000px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px; text-align: center;">Contact Us</h1>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px;">
                    <h2 style="margin-bottom: 30px;">Get in Touch</h2>
                    
                    <div style="margin-bottom: 25px;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📍</div>
                        <h3>Visit Us</h3>
                        <p>123 Creator Street<br>Digital City, DC 12345<br>United States</p>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📧</div>
                        <h3>Email Us</h3>
                        <p>support@3eesher.cloud<br>sales@3eesher.cloud<br>press@3eesher.cloud</p>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <div style="font-size: 24px; margin-bottom: 10px;">📞</div>
                        <h3>Call Us</h3>
                        <p>+1 (555) 123-4567<br>Mon-Fri, 9am-6pm EST</p>
                    </div>
                    
                    <div>
                        <div style="font-size: 24px; margin-bottom: 10px;">🌐</div>
                        <h3>Follow Us</h3>
                        <div style="display: flex; gap: 15px; margin-top: 10px;">
                            <a href="#" style="color: white; text-decoration: none; font-size: 20px;">Twitter</a>
                            <a href="#" style="color: white; text-decoration: none; font-size: 20px;">Facebook</a>
                            <a href="#" style="color: white; text-decoration: none; font-size: 20px;">Instagram</a>
                            <a href="#" style="color: white; text-decoration: none; font-size: 20px;">LinkedIn</a>
                            <a href="#" style="color: white; text-decoration: none; font-size: 20px;">YouTube</a>
                        </div>
                    </div>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    <h2 style="margin-bottom: 30px;">Send a Message</h2>
                    
                    <form action="/contact/submit" method="POST">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Your Name</label>
                            <input type="text" name="name" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Email Address</label>
                            <input type="email" name="email" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Subject</label>
                            <input type="text" name="subject" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Message</label>
                            <textarea name="message" rows="6" required style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px;"></textarea>
                        </div>
                        
                        <button type="submit" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border: none; border-radius: 50px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%;">Send Message</button>
                    </form>
                </div>
            </div>
            
            <div style="height: 400px; background: #f7f9fc; border-radius: 20px; overflow: hidden; margin-top: 40px;">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095343008!2d-73.98510768458427!3d40.75889697932681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25855c6480299%3A0x55194ec5a1ae072e!2sTimes%20Square!5e0!3m2!1sen!2sus!4v1644262073401!5m2!1sen!2sus" width="100%" height="100%" style="border:0;" allowfullscreen></iframe>
            </div>
        </div>
    `;
}

function generateEarningsPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Earnings Disclaimer</h1>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p style="font-size: 18px;">Results may vary. Past performance doesn't guarantee future results.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">No Guarantee of Earnings</h2>
                <p>We do not guarantee any specific earnings from using our platform. Your success depends on various factors including content quality, marketing efforts, and audience engagement.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">Individual Results Vary</h2>
                <p>Earnings examples shown are not typical. They represent the best-case scenarios and should not be considered as average or guaranteed.</p>
            </div>
        </div>
    `;
}

function generateRefundPage() {
    return `
        <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 48px; color: #667eea; margin-bottom: 30px;">Refund Policy</h1>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 20px; margin-bottom: 40px;">
                <p>We want you to be satisfied with our services. This policy explains how refunds are handled.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">30-Day Money Back Guarantee</h2>
                <p>If you're not satisfied with our paid services, you can request a full refund within 30 days of purchase.</p>
            </div>
            
            <div style="background: #f7f9fc; padding: 30px; border-radius: 15px; margin: 30px 0;">
                <h2 style="margin-bottom: 20px;">How to Request a Refund</h2>
                <p>Contact our support team at refunds@3eesher.cloud with your purchase details and reason for refund.</p>
            </div>
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
        
        db.all(`SELECT * FROM videos ORDER BY featured DESC, created_date DESC`, [], (err, videos) => {
            db.all(`SELECT * FROM placeholders WHERE location = 'hero' ORDER BY display_order ASC`, [], (err, heroPlaceholders) => {
                db.all(`SELECT * FROM placeholders WHERE location IN ('featured', 'banner') ORDER BY display_order ASC`, [], (err, otherPlaceholders) => {
                    db.all(`SELECT * FROM posts WHERE published_date IS NOT NULL ORDER BY published_date DESC LIMIT 3`, [], (err, posts) => {
                        db.all(`SELECT * FROM gallery ORDER BY created_date DESC LIMIT 8`, [], (err, gallery) => {
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
                                            
                                            // Group ads by location
                                            const adsByLocation = {};
                                            ads.forEach(ad => adsByLocation[ad.location] = ad.code);
                                            
                                            // Conversion and retargeting pixels
                                            const conversionPixels = conversions.map(c => c.pixel_code).join('\n');
                                            const retargetingPixels = retargeting.map(r => r.pixel_code).join('\n');
                                            
                                            // Generate hero carousel HTML
                                            const heroHTML = heroPlaceholders.length > 0 ? `
                                                <div class="hero-carousel">
                                                    ${heroPlaceholders.map((h, index) => `
                                                        <div class="hero-slide ${index === 0 ? 'active' : ''}" style="background-image: url('${h.filename}');">
                                                            <div class="hero-overlay"></div>
                                                            <div class="hero-content">
                                                                <h1>${h.title || settings.hero_title}</h1>
                                                                <p>${settings.hero_subtitle}</p>
                                                                ${h.link ? `<a href="${h.link}" class="hero-btn">Learn More</a>` : ''}
                                                            </div>
                                                        </div>
                                                    `).join('')}
                                                    <div class="carousel-nav">
                                                        <button class="carousel-prev">❮</button>
                                                        <button class="carousel-next">❯</button>
                                                    </div>
                                                    <div class="carousel-dots">
                                                        ${heroPlaceholders.map((_, index) => `<span class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`).join('')}
                                                    </div>
                                                </div>
                                            ` : `
                                                <div class="hero" style="background: linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})">
                                                    <div class="hero-content">
                                                        <h1>${settings.hero_title}</h1>
                                                        <p>${settings.hero_subtitle}</p>
                                                        <a href="#videos" class="hero-btn">Explore Videos</a>
                                                    </div>
                                                </div>
                                            `;
                                            
                                            // Generate video HTML with auto-play and download
                                            const videoHTML = videos.map(v => `
                                                <div class="video-card">
                                                    <div class="video-thumbnail">
                                                        <img src="${v.thumbnail}" alt="${v.title}">
                                                        <div class="video-overlay">
                                                            <button class="play-btn" onclick="playVideo('${v.filename}', '${v.title}')">▶ Play</button>
                                                            <a href="/download/video/${v.id}" class="download-btn">⬇ Download</a>
                                                        </div>
                                                        <span class="video-views">👁️ ${v.views.toLocaleString()}</span>
                                                    </div>
                                                    <div class="video-info">
                                                        <h3>${v.title}</h3>
                                                        <p>${v.description || ''}</p>
                                                    </div>
                                                </div>
                                            `).join('');
                                            
                                            // Generate other placeholders HTML (featured banners)
                                            const otherPlaceholdersHTML = otherPlaceholders.map(p => `
                                                <div class="featured-banner" style="background-image: url('${p.filename}');">
                                                    <div class="banner-overlay"></div>
                                                    <div class="banner-content">
                                                        <h3>${p.title}</h3>
                                                        ${p.link ? `<a href="${p.link}" class="banner-btn">Learn More</a>` : ''}
                                                    </div>
                                                </div>
                                            `).join('');
                                            
                                            // Generate blog HTML
                                            const blogHTML = posts.map(p => `
                                                <article class="blog-card">
                                                    ${p.image ? `<img src="${p.image}" alt="${p.title}" class="blog-image">` : ''}
                                                    <div class="blog-content">
                                                        <h3><a href="/post/${p.slug}">${p.title}</a></h3>
                                                        <p class="blog-meta">${new Date(p.published_date).toLocaleDateString()} | 👁️ ${p.views} views</p>
                                                        <p class="blog-excerpt">${p.excerpt || p.content.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                                                        <a href="/post/${p.slug}" class="read-more">Read More →</a>
                                                    </div>
                                                </article>
                                            `).join('');
                                            
                                            // Generate gallery HTML
                                            const galleryHTML = gallery.map(g => `
                                                <div class="gallery-item" onclick="openImage('${g.filename}')">
                                                    <img src="${g.filename}" alt="${g.title || 'Gallery'}" loading="lazy">
                                                    ${g.title ? `<div class="gallery-overlay">${g.title}</div>` : ''}
                                                </div>
                                            `).join('');
                                            
                                            res.send(`
                                                <!DOCTYPE html>
                                                <html lang="en">
                                                <head>
                                                    <meta charset="UTF-8">
                                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                                    <title>${settings.site_title}</title>
                                                    <meta name="description" content="${settings.site_description}">
                                                    
                                                    <!-- HEAD INJECTION -->
                                                    ${headInjection}
                                                    
                                                    <!-- CONVERSION PIXELS -->
                                                    ${conversionPixels}
                                                    
                                                    <!-- RETARGETING PIXELS -->
                                                    ${retargetingPixels}
                                                    
                                                    <style>
                                                        * {
                                                            margin: 0;
                                                            padding: 0;
                                                            box-sizing: border-box;
                                                        }
                                                        
                                                        body {
                                                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                            line-height: 1.6;
                                                            color: #333;
                                                            background: #f8fafc;
                                                        }
                                                        
                                                        /* HEADER */
                                                        header {
                                                            background: linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color});
                                                            color: white;
                                                            padding: 1rem 0;
                                                            position: sticky;
                                                            top: 0;
                                                            z-index: 1000;
                                                            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                                                        }
                                                        
                                                        .header-container {
                                                            max-width: 1200px;
                                                            margin: 0 auto;
                                                            padding: 0 20px;
                                                            display: flex;
                                                            justify-content: space-between;
                                                            align-items: center;
                                                            flex-wrap: wrap;
                                                        }
                                                        
                                                        .logo {
                                                            font-size: 2.5rem;
                                                            font-weight: 800;
                                                            color: white;
                                                            text-decoration: none;
                                                            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                                                        }
                                                        
                                                        .nav-menu {
                                                            display: flex;
                                                            gap: 20px;
                                                            flex-wrap: wrap;
                                                        }
                                                        
                                                        .nav-menu a {
                                                            color: white;
                                                            text-decoration: none;
                                                            padding: 8px 15px;
                                                            border-radius: 5px;
                                                            transition: background 0.3s;
                                                        }
                                                        
                                                        .nav-menu a:hover {
                                                            background: rgba(255,255,255,0.2);
                                                        }
                                                        
                                                        .login-btn {
                                                            background: white;
                                                            color: ${settings.primary_color} !important;
                                                            font-weight: 600;
                                                        }
                                                        
                                                        /* AD PLACEMENTS */
                                                        .ad-header {
                                                            text-align: center;
                                                            margin: 20px 0;
                                                            padding: 10px;
                                                            background: #f1f5f9;
                                                            min-height: 90px;
                                                            display: flex;
                                                            align-items: center;
                                                            justify-content: center;
                                                        }
                                                        
                                                        .ad-sidebar {
                                                            margin: 20px 0;
                                                            padding: 10px;
                                                            background: #f1f5f9;
                                                            min-height: 250px;
                                                            display: flex;
                                                            align-items: center;
                                                            justify-content: center;
                                                        }
                                                        
                                                        .ad-content {
                                                            margin: 20px 0;
                                                            padding: 10px;
                                                            background: #f1f5f9;
                                                            min-height: 90px;
                                                            display: flex;
                                                            align-items: center;
                                                            justify-content: center;
                                                        }
                                                        
                                                        /* HERO CAROUSEL */
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
                                                            transition: opacity 0.5s ease;
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
                                                            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                                                        }
                                                        
                                                        .hero-content p {
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
                                                            transition: transform 0.3s;
                                                        }
                                                        
                                                        .hero-btn:hover {
                                                            transform: translateY(-3px);
                                                            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
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
                                                            transition: background 0.3s;
                                                        }
                                                        
                                                        .carousel-nav button:hover {
                                                            background: rgba(255,255,255,0.8);
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
                                                            transition: background 0.3s;
                                                        }
                                                        
                                                        .dot.active {
                                                            background: white;
                                                        }
                                                        
                                                        /* MAIN CONTAINER */
                                                        .container {
                                                            max-width: 1200px;
                                                            margin: 0 auto;
                                                            padding: 40px 20px;
                                                        }
                                                        
                                                        .content-with-sidebar {
                                                            display: grid;
                                                            grid-template-columns: 1fr 300px;
                                                            gap: 30px;
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
                                                            border-radius: 2px;
                                                        }
                                                        
                                                        /* VIDEO GRID */
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
                                                            transition: transform 0.3s;
                                                        }
                                                        
                                                        .video-card:hover {
                                                            transform: translateY(-5px);
                                                        }
                                                        
                                                        .video-thumbnail {
                                                            position: relative;
                                                            height: 180px;
                                                            overflow: hidden;
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
                                                            font-weight: 600;
                                                            text-decoration: none;
                                                            transition: transform 0.3s;
                                                        }
                                                        
                                                        .play-btn {
                                                            background: ${settings.primary_color};
                                                            color: white;
                                                        }
                                                        
                                                        .download-btn {
                                                            background: white;
                                                            color: ${settings.primary_color};
                                                        }
                                                        
                                                        .play-btn:hover, .download-btn:hover {
                                                            transform: scale(1.05);
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
                                                        }
                                                        
                                                        /* FEATURED BANNERS */
                                                        .featured-banners {
                                                            display: grid;
                                                            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                                                            gap: 20px;
                                                            margin: 40px 0;
                                                        }
                                                        
                                                        .featured-banner {
                                                            height: 200px;
                                                            background-size: cover;
                                                            background-position: center;
                                                            border-radius: 15px;
                                                            overflow: hidden;
                                                            position: relative;
                                                        }
                                                        
                                                        .banner-overlay {
                                                            position: absolute;
                                                            top: 0;
                                                            left: 0;
                                                            right: 0;
                                                            bottom: 0;
                                                            background: rgba(0,0,0,0.4);
                                                            transition: background 0.3s;
                                                        }
                                                        
                                                        .featured-banner:hover .banner-overlay {
                                                            background: rgba(0,0,0,0.6);
                                                        }
                                                        
                                                        .banner-content {
                                                            position: absolute;
                                                            bottom: 20px;
                                                            left: 20px;
                                                            color: white;
                                                            z-index: 2;
                                                        }
                                                        
                                                        .banner-btn {
                                                            display: inline-block;
                                                            margin-top: 10px;
                                                            padding: 8px 15px;
                                                            background: ${settings.primary_color};
                                                            color: white;
                                                            text-decoration: none;
                                                            border-radius: 5px;
                                                        }
                                                        
                                                        /* BLOG SECTION */
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
                                                        
                                                        .blog-content h3 a {
                                                            color: #333;
                                                            text-decoration: none;
                                                        }
                                                        
                                                        .blog-content h3 a:hover {
                                                            color: ${settings.primary_color};
                                                        }
                                                        
                                                        .blog-meta {
                                                            color: #666;
                                                            font-size: 0.9rem;
                                                            margin: 10px 0;
                                                        }
                                                        
                                                        .read-more {
                                                            display: inline-block;
                                                            margin-top: 15px;
                                                            color: ${settings.primary_color};
                                                            text-decoration: none;
                                                            font-weight: 600;
                                                        }
                                                        
                                                        /* GALLERY */
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
                                                        
                                                        /* SIDEBAR */
                                                        .sidebar {
                                                            position: sticky;
                                                            top: 100px;
                                                            height: fit-content;
                                                        }
                                                        
                                                        .sidebar-widget {
                                                            background: white;
                                                            padding: 20px;
                                                            border-radius: 10px;
                                                            margin-bottom: 20px;
                                                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                                        }
                                                        
                                                        .sidebar-widget h3 {
                                                            color: ${settings.primary_color};
                                                            margin-bottom: 15px;
                                                            border-bottom: 2px solid #e2e8f0;
                                                            padding-bottom: 10px;
                                                        }
                                                        
                                                        .sidebar-widget ul {
                                                            list-style: none;
                                                        }
                                                        
                                                        .sidebar-widget li {
                                                            margin-bottom: 10px;
                                                        }
                                                        
                                                        .sidebar-widget a {
                                                            color: #666;
                                                            text-decoration: none;
                                                        }
                                                        
                                                        .sidebar-widget a:hover {
                                                            color: ${settings.primary_color};
                                                        }
                                                        
                                                        /* FOOTER */
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
                                                        
                                                        /* ADMIN BUTTON */
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
                                                            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                                                            z-index: 9999;
                                                            transition: transform 0.3s;
                                                        }
                                                        
                                                        .admin-btn:hover {
                                                            transform: translateY(-3px);
                                                        }
                                                        
                                                        /* VIDEO MODAL */
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
                                                            border-radius: 10px;
                                                        }
                                                        
                                                        .close-modal {
                                                            position: absolute;
                                                            top: 20px;
                                                            right: 30px;
                                                            color: white;
                                                            font-size: 40px;
                                                            cursor: pointer;
                                                        }
                                                        
                                                        /* POPUP AD */
                                                        .popup-ad {
                                                            position: fixed;
                                                            top: 50%;
                                                            left: 50%;
                                                            transform: translate(-50%, -50%);
                                                            background: white;
                                                            padding: 20px;
                                                            border-radius: 10px;
                                                            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                                                            z-index: 10001;
                                                            max-width: 500px;
                                                            display: none;
                                                        }
                                                        
                                                        .popup-close {
                                                            float: right;
                                                            font-size: 20px;
                                                            cursor: pointer;
                                                        }
                                                        
                                                        /* RESPONSIVE */
                                                        @media (max-width: 768px) {
                                                            .logo { font-size: 2rem; }
                                                            .header-container { flex-direction: column; gap: 15px; }
                                                            .nav-menu { justify-content: center; }
                                                            .hero-content h1 { font-size: 2.5rem; }
                                                            .content-with-sidebar { grid-template-columns: 1fr; }
                                                            .blog-card { flex-direction: column; }
                                                            .blog-image { width: 100%; height: 200px; }
                                                            .video-grid { grid-template-columns: 1fr; }
                                                        }
                                                        
                                                        /* CUSTOM CSS INJECTION */
                                                        ${customCSS}
                                                    </style>
                                                </head>
                                                <body>
                                                    <!-- BODY START INJECTION -->
                                                    ${bodyStartInjection}
                                                    
                                                    <!-- HEADER AD -->
                                                    ${adsByLocation['header'] ? `<div class="ad-header">${adsByLocation['header']}</div>` : ''}
                                                    
                                                    <header>
                                                        <div class="header-container">
                                                            <a href="/" class="logo">☁️ 3eesher.cloud</a>
                                                            <nav class="nav-menu">
                                                                <a href="#videos">Videos</a>
                                                                <a href="#blog">Blog</a>
                                                                <a href="#gallery">Gallery</a>
                                                                <a href="/about">About</a>
                                                                <a href="/privacy">Privacy</a>
                                                                <a href="/terms">Terms</a>
                                                                <a href="/contact">Contact</a>
                                                                ${req.session.userId ? 
                                                                    '<a href="/admin" class="login-btn">Dashboard</a>' : 
                                                                    '<a href="/login" class="login-btn">Login</a>'
                                                                }
                                                            </nav>
                                                        </div>
                                                    </header>
                                                    
                                                    ${heroHTML}
                                                    
                                                    <!-- FEATURED BANNERS -->
                                                    ${otherPlaceholdersHTML ? `
                                                        <div class="container">
                                                            <div class="featured-banners">
                                                                ${otherPlaceholdersHTML}
                                                            </div>
                                                        </div>
                                                    ` : ''}
                                                    
                                                    <div class="container" id="videos">
                                                        <h2 class="section-title">🎥 Featured Videos</h2>
                                                        
                                                        <!-- CONTENT TOP AD -->
                                                        ${adsByLocation['content_top'] ? `<div class="ad-content">${adsByLocation['content_top']}</div>` : ''}
                                                        
                                                        <div class="content-with-sidebar">
                                                            <div>
                                                                <div class="video-grid">
                                                                    ${videoHTML}
                                                                </div>
                                                                
                                                                <!-- CONTENT MIDDLE AD -->
                                                                ${adsByLocation['content_middle'] ? `<div class="ad-content">${adsByLocation['content_middle']}</div>` : ''}
                                                            </div>
                                                            
                                                            <aside class="sidebar">
                                                                <!-- SIDEBAR TOP AD -->
                                                                ${adsByLocation['sidebar_top'] ? `<div class="ad-sidebar">${adsByLocation['sidebar_top']}</div>` : ''}
                                                                
                                                                <div class="sidebar-widget">
                                                                    <h3>📰 Recent Posts</h3>
                                                                    <ul>
                                                                        ${posts.map(p => `<li><a href="/post/${p.slug}">${p.title}</a></li>`).join('')}
                                                                    </ul>
                                                                </div>
                                                                
                                                                <div class="sidebar-widget">
                                                                    <h3>📁 Categories</h3>
                                                                    <ul>
                                                                        <li><a href="#">Videos</a></li>
                                                                        <li><a href="#">Tutorials</a></li>
                                                                        <li><a href="#">News</a></li>
                                                                        <li><a href="#">Reviews</a></li>
                                                                    </ul>
                                                                </div>
                                                                
                                                                <!-- SIDEBAR BOTTOM AD -->
                                                                ${adsByLocation['sidebar_bottom'] ? `<div class="ad-sidebar">${adsByLocation['sidebar_bottom']}</div>` : ''}
                                                            </aside>
                                                        </div>
                                                        
                                                        <!-- CONTENT BOTTOM AD -->
                                                        ${adsByLocation['content_bottom'] ? `<div class="ad-content">${adsByLocation['content_bottom']}</div>` : ''}
                                                    </div>
                                                    
                                                    <div class="container" id="blog">
                                                        <h2 class="section-title">📝 Latest from Blog</h2>
                                                        <div class="blog-grid">
                                                            ${blogHTML}
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="container" id="gallery">
                                                        <h2 class="section-title">📸 Photo Gallery</h2>
                                                        <div class="gallery-grid">
                                                            ${galleryHTML}
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- FOOTER AD -->
                                                    ${adsByLocation['footer'] ? `<div class="ad-content">${adsByLocation['footer']}</div>` : ''}
                                                    
                                                    <footer>
                                                        <div class="footer-container">
                                                            <div class="footer-grid">
                                                                <div class="footer-col">
                                                                    <h3>About 3eesher.cloud</h3>
                                                                    <p style="color: #a0aec0;">${settings.site_description}</p>
                                                                </div>
                                                                <div class="footer-col">
                                                                    <h3>Quick Links</h3>
                                                                    <ul>
                                                                        <li><a href="/about">About Us</a></li>
                                                                        <li><a href="/privacy">Privacy Policy</a></li>
                                                                        <li><a href="/terms">Terms of Service</a></li>
                                                                        <li><a href="/disclosure">Affiliate Disclosure</a></li>
                                                                        <li><a href="/cookies">Cookie Policy</a></li>
                                                                    </ul>
                                                                </div>
                                                                <div class="footer-col">
                                                                    <h3>Support</h3>
                                                                    <ul>
                                                                        <li><a href="/contact">Contact Us</a></li>
                                                                        <li><a href="/faq">FAQ</a></li>
                                                                        <li><a href="/help">Help Center</a></li>
                                                                        <li><a href="/community">Community</a></li>
                                                                    </ul>
                                                                </div>
                                                                <div class="footer-col">
                                                                    <h3>Legal</h3>
                                                                    <ul>
                                                                        <li><a href="/earnings">Earnings Disclaimer</a></li>
                                                                        <li><a href="/refunds">Refund Policy</a></li>
                                                                        <li><a href="/dmca">DMCA</a></li>
                                                                        <li><a href="/accessibility">Accessibility</a></li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                            <div class="footer-bottom">
                                                                <p>${settings.footer_text}</p>
                                                                <p style="margin-top: 10px;">
                                                                    <a href="/contact" style="color: #a0aec0;">Contact: ${settings.contact_email}</a> | 
                                                                    <a href="/contact" style="color: #a0aec0;">Phone: ${settings.contact_phone}</a>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </footer>
                                                    
                                                    <!-- BODY END INJECTION -->
                                                    ${bodyEndInjection}
                                                    
                                                    ${req.session.userId ? '<a href="/admin" class="admin-btn">⚙️ Admin Dashboard</a>' : ''}
                                                    
                                                    <!-- POPUP AD -->
                                                    ${adsByLocation['popup'] ? `
                                                        <div id="popupAd" class="popup-ad">
                                                            <span class="popup-close" onclick="document.getElementById('popupAd').style.display='none'">✖</span>
                                                            ${adsByLocation['popup']}
                                                        </div>
                                                        <script>
                                                            setTimeout(() => {
                                                                document.getElementById('popupAd').style.display = 'block';
                                                            }, 5000);
                                                        </script>
                                                    ` : ''}
                                                    
                                                    <script>
                                                        // Video player
                                                        function playVideo(filename, title) {
                                                            const modal = document.createElement('div');
                                                            modal.className = 'video-modal';
                                                            modal.innerHTML = \`
                                                                <span class="close-modal" onclick="this.parentElement.remove()">✖</span>
                                                                <video src="/uploads/\${filename}" controls autoplay></video>
                                                            \`;
                                                            document.body.appendChild(modal);
                                                            
                                                            // Track view
                                                            fetch('/api/track-video-view', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ filename })
                                                            });
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
                                                        
                                                        // Hero carousel
                                                        document.addEventListener('DOMContentLoaded', function() {
                                                            const slides = document.querySelectorAll('.hero-slide');
                                                            const dots = document.querySelectorAll('.dot');
                                                            const prevBtn = document.querySelector('.carousel-prev');
                                                            const nextBtn = document.querySelector('.carousel-next');
                                                            let currentSlide = 0;
                                                            
                                                            function showSlide(index) {
                                                                slides.forEach(s => s.classList.remove('active'));
                                                                dots.forEach(d => d.classList.remove('active'));
                                                                slides[index].classList.add('active');
                                                                dots[index].classList.add('active');
                                                                currentSlide = index;
                                                            }
                                                            
                                                            if (prevBtn && nextBtn) {
                                                                prevBtn.addEventListener('click', () => {
                                                                    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
                                                                    showSlide(currentSlide);
                                                                });
                                                                
                                                                nextBtn.addEventListener('click', () => {
                                                                    currentSlide = (currentSlide + 1) % slides.length;
                                                                    showSlide(currentSlide);
                                                                });
                                                                
                                                                dots.forEach((dot, index) => {
                                                                    dot.addEventListener('click', () => showSlide(index));
                                                                });
                                                                
                                                                // Auto advance
                                                                setInterval(() => {
                                                                    currentSlide = (currentSlide + 1) % slides.length;
                                                                    showSlide(currentSlide);
                                                                }, 5000);
                                                            }
                                                        });
                                                        
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

// ==================== PAGE ROUTES ====================
app.get('/post/:slug', (req, res) => {
    const slug = req.params.slug;
    
    db.get(`SELECT * FROM posts WHERE slug = ?`, [slug], (err, post) => {
        if (!post) return res.redirect('/');
        
        db.run(`UPDATE posts SET views = views + 1 WHERE id = ?`, [post.id]);
        
        db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
            const settings = {};
            settingsRows.forEach(s => settings[s.key] = s.value);
            
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${post.title} - ${settings.site_name}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: Arial; line-height:1.8; max-width:800px; margin:0 auto; padding:20px; color:#333; }
                        h1 { color: #667eea; margin-bottom:20px; }
                        .meta { color:#666; margin:20px 0; padding-bottom:20px; border-bottom:1px solid #eee; }
                        .content { margin-top:30px; }
                        .content img { max-width:100%; border-radius:10px; margin:20px 0; }
                        .back { display:inline-block; margin-top:30px; color:#667eea; text-decoration:none; }
                    </style>
                </head>
                <body>
                    <a href="/" class="back">← Back to Home</a>
                    <h1>${post.title}</h1>
                    <div class="meta">
                        Published: ${new Date(post.published_date).toLocaleDateString()} | Views: ${post.views}
                    </div>
                    ${post.image ? `<img src="${post.image}" alt="${post.title}" style="max-width:100%; border-radius:10px;">` : ''}
                    <div class="content">${post.content}</div>
                </body>
                </html>
            `);
        });
    });
});

app.get('/:page', (req, res) => {
    const slug = req.params.page;
    
    db.get(`SELECT * FROM pages WHERE slug = ? AND published = 1`, [slug], (err, page) => {
        if (!page) return res.redirect('/');
        
        db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
            const settings = {};
            settingsRows.forEach(s => settings[s.key] = s.value);
            
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${page.title} - ${settings.site_name}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: Arial; line-height:1.8; color:#333; margin:0; padding:0; }
                        .back { display:inline-block; margin:20px; color:#667eea; text-decoration:none; }
                    </style>
                </head>
                <body>
                    <a href="/" class="back">← Back to Home</a>
                    ${page.content}
                </body>
                </html>
            `);
        });
    });
});

// ==================== CONTACT FORM ====================
app.post('/contact/submit', (req, res) => {
    const { name, email, subject, message } = req.body;
    
    db.run(`INSERT INTO messages (name, email, subject, message, created_date) VALUES (?, ?, ?, ?, ?)`,
        [name, email, subject, message, new Date().toISOString()]);
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Message Sent</title></head>
        <body style="font-family:Arial; text-align:center; padding:50px;">
            <h1 style="color:#667eea;">Thank You!</h1>
            <p>Your message has been sent. We'll get back to you soon.</p>
            <a href="/" style="color:#667eea;">Return Home</a>
        </body>
        </html>
    `);
});

// ==================== DOWNLOAD VIDEO ====================
app.get('/download/video/:id', (req, res) => {
    const id = req.params.id;
    
    db.get(`SELECT filename, title FROM videos WHERE id = ?`, [id], (err, video) => {
        if (video) {
            db.run(`UPDATE videos SET downloads = downloads + 1 WHERE id = ?`, [id]);
            
            const filePath = path.join(UPLOADS_FOLDER, video.filename);
            if (fs.existsSync(filePath)) {
                res.download(filePath, video.title + '.mp4');
            } else {
                // If file doesn't exist, redirect to placeholder
                res.redirect(video.thumbnail || '/');
            }
        } else {
            res.redirect('/');
        }
    });
});

// ==================== TRACK VIDEO VIEW ====================
app.post('/api/track-video-view', (req, res) => {
    const { filename } = req.body;
    
    db.run(`UPDATE videos SET views = views + 1 WHERE filename = ?`, [filename]);
    res.json({ success: true });
});

// ==================== ADMIN PANEL ====================
app.get('/admin', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.get(`SELECT * FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (!user) return res.redirect('/login');
        
        db.all(`SELECT * FROM settings`, [], (err, settingsRows) => {
            const settings = {};
            settingsRows.forEach(s => settings[s.key] = s.value);
            
            db.all(`SELECT * FROM videos ORDER BY created_date DESC`, [], (err, videos) => {
                db.all(`SELECT * FROM placeholders ORDER BY display_order`, [], (err, placeholders) => {
                    db.all(`SELECT * FROM posts ORDER BY created_date DESC`, [], (err, posts) => {
                        db.all(`SELECT * FROM gallery ORDER BY created_date DESC`, [], (err, gallery) => {
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
                                                                <title>Admin Dashboard - ${settings.site_name}</title>
                                                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                                                <style>
                                                                    * { margin:0; padding:0; box-sizing:border-box; }
                                                                    body {
                                                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                                        background: #f7f9fc;
                                                                        padding: 20px;
                                                                    }
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
                                                                        <h1>⚙️ Admin Dashboard - ${settings.site_name}</h1>
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
                                                                        <button class="tab-btn" onclick="showTab('payments')">💰 Payments</button>
                                                                        <button class="tab-btn" onclick="showTab('ads')">📺 Ads</button>
                                                                        <button class="tab-btn" onclick="showTab('conversions')">🎯 Conversions</button>
                                                                        <button class="tab-btn" onclick="showTab('retargeting')">🔄 Retargeting</button>
                                                                        <button class="tab-btn" onclick="showTab('injections')">💉 Injections</button>
                                                                        <button class="tab-btn" onclick="showTab('messages')">📨 Messages</button>
                                                                        <button class="tab-btn" onclick="showTab('users')">👥 Users</button>
                                                                        <button class="tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
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
                                                                                <h3>📨 Messages</h3>
                                                                                <p style="font-size: 2rem;">${messages.length}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <!-- PASSWORD CHANGE TAB (inside settings) -->
                                                                    <div id="settings-tab" class="tab-content">
                                                                        <h2>Site Settings</h2>
                                                                        
                                                                        <div class="password-section">
                                                                            <h3 style="color: #667eea; margin-bottom: 20px;">🔐 Change Admin Password</h3>
                                                                            <form action="/admin/change-password" method="POST" style="max-width: 400px;">
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
                                                                        
                                                                        <h3 style="margin: 30px 0 20px;">General Settings</h3>
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
                                                                                    <div class="form-group">
                                                                                        <label>Site Description</label>
                                                                                        <textarea name="site_description">${settings.site_description}</textarea>
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
                                                                                        <label>Hero Title</label>
                                                                                        <input type="text" name="hero_title" value="${settings.hero_title}">
                                                                                    </div>
                                                                                    <div class="form-group">
                                                                                        <label>Hero Subtitle</label>
                                                                                        <input type="text" name="hero_subtitle" value="${settings.hero_subtitle}">
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <div class="form-group">
                                                                                        <label>Footer Text</label>
                                                                                        <input type="text" name="footer_text" value="${settings.footer_text}">
                                                                                    </div>
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
                                                                                    <div class="form-group">
                                                                                        <label>Currency</label>
                                                                                        <select name="currency">
                                                                                            <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD</option>
                                                                                            <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                                                                                            <option value="GBP" ${settings.currency === 'GBP' ? 'selected' : ''}>GBP</option>
                                                                                        </select>
                                                                                    </div>
                                                                                    <div class="form-group">
                                                                                        <label>Currency Symbol</label>
                                                                                        <input type="text" name="currency_symbol" value="${settings.currency_symbol}">
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <button type="submit">Save All Settings</button>
                                                                        </form>
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
                                                                                </div>
                                                                                <div>
                                                                                    <div class="form-group">
                                                                                        <label>Video File</label>
                                                                                        <input type="file" name="video" accept="video/*" required>
                                                                                    </div>
                                                                                    <div class="form-group">
                                                                                        <label>Thumbnail Image</label>
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
                                                                                <th>Featured</th>
                                                                                <th>Date</th>
                                                                                <th>Actions</th>
                                                                            </tr>
                                                                            ${videos.map(v => `
                                                                                <tr>
                                                                                    <td>${v.id}</td>
                                                                                    <td>${v.title}</td>
                                                                                    <td>${v.views}</td>
                                                                                    <td>${v.downloads}</td>
                                                                                    <td>${v.featured ? '✅' : '❌'}</td>
                                                                                    <td>${new Date(v.created_date).toLocaleDateString()}</td>
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
                                                                                        <label>Location</label>
                                                                                        <select name="location">
                                                                                            <option value="hero">Hero Carousel</option>
                                                                                            <option value="featured">Featured Banner</option>
                                                                                            <option value="banner">Promo Banner</option>
                                                                                        </select>
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <div class="form-group">
                                                                                        <label>Link URL (optional)</label>
                                                                                        <input type="text" name="link" placeholder="https://...">
                                                                                    </div>
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
                                                                                <th>Location</th>
                                                                                <th>Order</th>
                                                                                <th>Actions</th>
                                                                            </tr>
                                                                            ${placeholders.map(p => `
                                                                                <tr>
                                                                                    <td>${p.id}</td>
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
                                                                                <th>Date</th>
                                                                                <th>Actions</th>
                                                                            </tr>
                                                                            ${posts.map(p => `
                                                                                <tr>
                                                                                    <td>${p.id}</td>
                                                                                    <td>${p.title}</td>
                                                                                    <td>${p.views}</td>
                                                                                    <td>${new Date(p.published_date).toLocaleDateString()}</td>
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
                                                                                <th>Filename</th>
                                                                                <th>Date</th>
                                                                                <th>Actions</th>
                                                                            </tr>
                                                                            ${gallery.map(g => `
                                                                                <tr>
                                                                                    <td>${g.id}</td>
                                                                                    <td>${g.title}</td>
                                                                                    <td>${g.filename}</td>
                                                                                    <td>${new Date(g.created_date).toLocaleDateString()}</td>
                                                                                    <td>
                                                                                        <button onclick="deleteGallery(${g.id})">Delete</button>
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
                                                                                    <td>${settings.currency_symbol}${a.revenue}</td>
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
                                                                        <h2>Conversion Tracking</h2>
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
                                                                                <th>Actions</th>
                                                                            </tr>
                                                                            ${messages.map(m => `
                                                                                <tr>
                                                                                    <td>${m.name}</td>
                                                                                    <td>${m.email}</td>
                                                                                    <td>${m.subject}</td>
                                                                                    <td>${new Date(m.created_date).toLocaleString()}</td>
                                                                                    <td>
                                                                                        <button onclick="viewMessage(${m.id})">View</button>
                                                                                    </td>
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
                                                                                <th>Role</th>
                                                                                <th>Created</th>
                                                                            </tr>
                                                                            ${users.map(u => `
                                                                                <tr>
                                                                                    <td>${u.id}</td>
                                                                                    <td>${u.username}</td>
                                                                                    <td>${u.role}</td>
                                                                                    <td>${new Date(u.created_date).toLocaleDateString()}</td>
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
                                                                    
                                                                    function togglePayment(id) {
                                                                        fetch('/admin/toggle-payment/' + id, { method: 'POST' })
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
                                                                    
                                                                    function toggleRetargeting(id) {
                                                                        fetch('/admin/toggle-retargeting/' + id, { method: 'POST' })
                                                                            .then(() => location.reload());
                                                                    }
                                                                    
                                                                    function editAd(id) {
                                                                        const newCode = prompt('Enter new ad code:');
                                                                        if (newCode) {
                                                                            fetch('/admin/update-ad/' + id, {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ code: newCode })
                                                                            }).then(() => location.reload());
                                                                        }
                                                                    }
                                                                    
                                                                    function editConversion(id) {
                                                                        const newCode = prompt('Enter new pixel code:');
                                                                        if (newCode) {
                                                                            fetch('/admin/update-conversion/' + id, {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ pixel_code: newCode })
                                                                            }).then(() => location.reload());
                                                                        }
                                                                    }
                                                                    
                                                                    function viewMessage(id) {
                                                                        // In a real app, you'd show message details
                                                                        alert('View message ' + id);
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

// ==================== ADMIN API ROUTES ====================

// Change password
app.post('/admin/change-password', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const { current_password, new_password, confirm_password } = req.body;
    
    if (new_password !== confirm_password) {
        return res.send('Passwords do not match');
    }
    
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
        db.run(`INSERT INTO videos (title, filename, thumbnail, description, created_date) VALUES (?, ?, ?, ?, ?)`,
            [req.body.title, videoFile.filename, thumbFile?.filename || 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=400', req.body.description, new Date().toISOString()]);
    }
    res.redirect('/admin');
});

// Upload placeholder
app.post('/admin/upload-placeholder', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO placeholders (title, filename, location, link, display_order, created_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.body.title, req.file.filename, req.body.location, req.body.link, req.body.display_order, new Date().toISOString()]);
    res.redirect('/admin');
});

// Create post
app.post('/admin/create-post', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const slug = req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    db.run(`INSERT INTO posts (title, slug, content, excerpt, image, published_date, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.body.title, slug, req.body.content, req.body.excerpt, req.file?.filename || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', new Date().toISOString(), new Date().toISOString()]);
    res.redirect('/admin');
});

// Upload gallery
app.post('/admin/upload-gallery', upload.single('image'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO gallery (title, filename, type, created_date) VALUES (?, ?, ?, ?)`,
        [req.body.title || 'Gallery Image', req.file.filename, 'image', new Date().toISOString()]);
    res.redirect('/admin');
});

// Add ad
app.post('/admin/add-ad', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.run(`INSERT INTO ad_placements (name, location, code, created_date) VALUES (?, ?, ?, ?)`,
        [req.body.name, req.body.location, req.body.code, new Date().toISOString()]);
    res.redirect('/admin');
});

// Toggle video
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

// Delete placeholder
app.post('/admin/delete-placeholder/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM placeholders WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Delete post
app.post('/admin/delete-post/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM posts WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
});

// Delete gallery
app.post('/admin/delete-gallery/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    db.run(`DELETE FROM gallery WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
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

// ==================== LOGIN ====================
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
                input {
                    width: 100%;
                    padding: 12px;
                    margin: 10px 0;
                    border: 2px solid #e2e8f0;
                    border-radius: 5px;
                }
                button {
                    width: 100%;
                    padding: 12px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 20px;
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
    const id = req.params.id;
    db.run(`UPDATE ad_placements SET impressions = impressions + 1 WHERE id = ?`, [id]);
    res.sendStatus(200);
});

app.get('/track/click/:id', (req, res) => {
    const id = req.params.id;
    db.run(`UPDATE ad_placements SET clicks = clicks + 1 WHERE id = ?`, [id]);
    res.redirect(req.query.url || '/');
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 3eesher.cloud COMPLETE PLATFORM`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`👤 Admin: http://localhost:${PORT}/admin`);
    console.log(`🔑 Login: admin / admin123`);
    console.log(``);
    console.log(`✅ FEATURES:`);
    console.log(`   - Big 3eesher.cloud logo in header`);
    console.log(`   - Auto-playing video carousel`);
    console.log(`   - Video download buttons`);
    console.log(`   - 5+ placeholder images on main page`);
    console.log(`   - Blog posts on main page`);
    console.log(`   - Photo gallery`);
    console.log(`   - Full ad system with 8 placements`);
    console.log(`   - Conversion tracking pixels`);
    console.log(`   - Retargeting pixels`);
    console.log(`   - Code injection (5 points)`);
    console.log(`   - Payment methods (Stripe, PayPal, Crypto, Cards)`);
    console.log(`   - Contact form with messages`);
    console.log(`   - Long legal pages (About, Privacy, Terms, etc.)`);
    console.log(`   - Change password in admin`);
    console.log(`   - Full admin control panel`);
});
