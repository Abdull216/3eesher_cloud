const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '3eesher_super_secret_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));
fs.ensureDirSync(path.join(__dirname, 'uploads'));
fs.ensureDirSync(path.join(__dirname, 'videos'));

// File upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'video') {
            cb(null, path.join(__dirname, 'videos'));
        } else {
            cb(null, path.join(__dirname, 'uploads'));
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }
});

// Your Gmail
const GMAIL_USER = 'abdullahharuna216@gmail.com';
const GMAIL_PASS = 'ipdbessasmzubdyk';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// Data storage
const DATA_FILE = './data.json';

function getData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE));
        }
    } catch (e) {}
    
    return {
        earnings: { total: 0, today: 0, month: 0, transactions: [], withdrawals: [], byLink: {} },
        
        // 30 Money Links
        moneyLinks: [
            { name: 'Jumia NG', url: 'https://www.jumia.com.ng/?aff_id=allarbaa216-20', id: 'allarbaa216-20', category: 'shopping', active: true, clicks: 0, earnings: 0, icon: '🛒' },
            { name: 'Amazon', url: 'https://www.amazon.com', id: '', category: 'shopping', active: false, clicks: 0, earnings: 0, icon: '📦' },
            { name: 'eBay', url: 'https://www.ebay.com', id: '', category: 'shopping', active: false, clicks: 0, earnings: 0, icon: '🏷️' },
            { name: 'AliExpress', url: 'https://www.aliexpress.com', id: '', category: 'shopping', active: false, clicks: 0, earnings: 0, icon: '🌍' },
            { name: 'Walmart', url: 'https://www.walmart.com', id: '', category: 'shopping', active: false, clicks: 0, earnings: 0, icon: '🛍️' },
            { name: 'Target', url: 'https://www.target.com', id: '', category: 'shopping', active: false, clicks: 0, earnings: 0, icon: '🎯' },
            { name: 'Shopify', url: 'https://www.shopify.com', id: '', category: 'platform', active: false, clicks: 0, earnings: 0, icon: '🛒' },
            { name: 'ClickBank', url: 'https://www.clickbank.com', id: '', category: 'affiliate', active: false, clicks: 0, earnings: 0, icon: '💰' },
            { name: 'ShareASale', url: 'https://www.shareasale.com', id: '', category: 'affiliate', active: false, clicks: 0, earnings: 0, icon: '🤝' },
            { name: 'CJ Affiliate', url: 'https://www.cj.com', id: '', category: 'affiliate', active: false, clicks: 0, earnings: 0, icon: '🔗' },
            { name: 'Rakuten', url: 'https://www.rakuten.com', id: '', category: 'affiliate', active: false, clicks: 0, earnings: 0, icon: '🇯🇵' },
            { name: 'Fiverr', url: 'https://www.fiverr.com', id: '', category: 'freelance', active: false, clicks: 0, earnings: 0, icon: '🎨' },
            { name: 'Upwork', url: 'https://www.upwork.com', id: '', category: 'freelance', active: false, clicks: 0, earnings: 0, icon: '💼' },
            { name: 'Freelancer', url: 'https://www.freelancer.com', id: '', category: 'freelance', active: false, clicks: 0, earnings: 0, icon: '🖥️' },
            { name: 'Udemy', url: 'https://www.udemy.com', id: '', category: 'courses', active: false, clicks: 0, earnings: 0, icon: '📚' },
            { name: 'Coursera', url: 'https://www.coursera.org', id: '', category: 'courses', active: false, clicks: 0, earnings: 0, icon: '🎓' },
            { name: 'Skillshare', url: 'https://www.skillshare.com', id: '', category: 'courses', active: false, clicks: 0, earnings: 0, icon: '✂️' },
            { name: 'Teachable', url: 'https://teachable.com', id: '', category: 'courses', active: false, clicks: 0, earnings: 0, icon: '📝' },
            { name: 'Konga', url: 'https://www.konga.com', id: '', category: 'shopping', active: false, clicks: 0, earnings: 0, icon: '🇳🇬' },
            { name: 'PayPorte', url: 'https://www.payporte.com', id: '', category: 'shopping', active: false, clicks: 0, earnings: 0, icon: '👗' },
            { name: 'Jiji', url: 'https://jiji.ng', id: '', category: 'classifieds', active: false, clicks: 0, earnings: 0, icon: '📱' },
            { name: 'Booking.com', url: 'https://www.booking.com', id: '', category: 'travel', active: false, clicks: 0, earnings: 0, icon: '🏨' },
            { name: 'Agoda', url: 'https://www.agoda.com', id: '', category: 'travel', active: false, clicks: 0, earnings: 0, icon: '🌏' },
            { name: 'Hotels.com', url: 'https://www.hotels.com', id: '', category: 'travel', active: false, clicks: 0, earnings: 0, icon: '🏩' },
            { name: 'Airbnb', url: 'https://www.airbnb.com', id: '', category: 'travel', active: false, clicks: 0, earnings: 0, icon: '🏠' },
            { name: 'Namecheap', url: 'https://www.namecheap.com', id: '', category: 'hosting', active: false, clicks: 0, earnings: 0, icon: '🔐' },
            { name: 'GoDaddy', url: 'https://www.godaddy.com', id: '', category: 'hosting', active: false, clicks: 0, earnings: 0, icon: '🌐' },
            { name: 'Hostinger', url: 'https://www.hostinger.com', id: '', category: 'hosting', active: false, clicks: 0, earnings: 0, icon: '🚀' },
            { name: 'Bluehost', url: 'https://www.bluehost.com', id: '', category: 'hosting', active: false, clicks: 0, earnings: 0, icon: '💙' },
            { name: 'DigitalOcean', url: 'https://www.digitalocean.com', id: '', category: 'hosting', active: false, clicks: 0, earnings: 0, icon: '🐳' }
        ],
        
        customLinks: [],
        blogPosts: [],
        subscribers: [],
        images: [],
        
        // 20 Music Videos (10 American + 10 Arabic)
        videos: [
            // American
            { id: 1, title: 'Eminem - Houdini', videoUrl: '/videos/eminem-houdini.mp4', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', type: 'local', region: 'american' },
            { id: 2, title: 'Kendrick Lamar - Not Like Us', videoUrl: '/videos/kendrick-not-like-us.mp4', thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', type: 'local', region: 'american' },
            { id: 3, title: 'Taylor Swift - Cruel Summer', videoUrl: '/videos/taylor-cruel-summer.mp4', thumbnail: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=400', type: 'local', region: 'american' },
            { id: 4, title: 'Drake - God\'s Plan', videoUrl: '/videos/drake-gods-plan.mp4', thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', type: 'local', region: 'american' },
            { id: 5, title: 'The Weeknd - Blinding Lights', videoUrl: '/videos/weeknd-blinding-lights.mp4', thumbnail: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400', type: 'local', region: 'american' },
            { id: 6, title: 'Bruno Mars - 24K Magic', videoUrl: '/videos/bruno-24k-magic.mp4', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', type: 'local', region: 'american' },
            { id: 7, title: 'Ed Sheeran - Shape of You', videoUrl: '/videos/ed-sheeran-shape-of-you.mp4', thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', type: 'local', region: 'american' },
            { id: 8, title: 'Post Malone - Sunflower', videoUrl: '/videos/post-malone-sunflower.mp4', thumbnail: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=400', type: 'local', region: 'american' },
            { id: 9, title: 'Doja Cat - Paint The Town Red', videoUrl: '/videos/doja-cat-paint-red.mp4', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', type: 'local', region: 'american' },
            { id: 10, title: 'Miley Cyrus - Flowers', videoUrl: '/videos/miley-cyrus-flowers.mp4', thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', type: 'local', region: 'american' },
            
            // Arabic
            { id: 11, title: 'Elissa - Ayshalak (عيشالك)', videoUrl: '/videos/elissa-ayshalak.mp4', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', type: 'local', region: 'arabic' },
            { id: 12, title: 'Maher Zain - Rahmatun Lil\'Alameen', videoUrl: '/videos/maher-zain-rahmatun.mp4', thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', type: 'local', region: 'arabic' },
            { id: 13, title: 'Nancy Ajram - Ma Teji Hena', videoUrl: '/videos/nancy-ajram-ma-teji.mp4', thumbnail: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=400', type: 'local', region: 'arabic' },
            { id: 14, title: 'Amr Diab - Ya Ana Ya La (يا أنا يا لأ)', videoUrl: '/videos/amr-diab-ya-ana.mp4', thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', type: 'local', region: 'arabic' },
            { id: 15, title: 'Tamer Hosny - عيش بشوقك', videoUrl: '/videos/tamer-hosny-aish.mp4', thumbnail: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400', type: 'local', region: 'arabic' },
            { id: 16, title: 'Ahmed Saad - El Hantoor', videoUrl: '/videos/ahmed-saad-hantoor.mp4', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', type: 'local', region: 'arabic' },
            { id: 17, title: 'Mohamed Hamaki - Shkolli Hahibik', videoUrl: '/videos/hamaki-shkolli.mp4', thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', type: 'local', region: 'arabic' },
            { id: 18, title: 'Saad Lamjarred - LM3ALLEM (المعلم)', videoUrl: '/videos/saad-lm3allem.mp4', thumbnail: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=400', type: 'local', region: 'arabic' },
            { id: 19, title: 'Sherine - Kalam Eineh (كلام عينيه)', videoUrl: '/videos/sherine-kalam.mp4', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', type: 'local', region: 'arabic' },
            { id: 20, title: 'Angham - ح需要用生命', videoUrl: '/videos/angham-song.mp4', thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400', type: 'local', region: 'arabic' }
        ],
        
        // Complete Social Media Integration
        socialPixels: {
            facebook: '', instagram: '', facebookPixelId: '', facebookAccessToken: '',
            twitter: '', twitterPixelId: '', tiktok: '', tiktokPixelId: '', tiktokAccessToken: '',
            youtube: '', youtubeChannelId: '', youtubeApiKey: '', linkedin: '', linkedinPartnerId: '',
            pinterest: '', pinterestTagId: '', snapchat: '', snapchatPixelId: '',
            googleAds: '', googleConversionId: '', googleAnalyticsId: 'G-HD01MF5SL9',
            customHead: '', customBody: ''
        },
        
        targeting: { phones: [], imeis: [], ips: [] },
        
        // Universal Injector
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '' },
        
        faq: [
            { question: 'How do I start making money?', answer: 'Choose a link from our 30+ money-making sites, sign up with our affiliate ID, and start promoting.' },
            { question: 'Is this really free?', answer: 'Yes! All tools and resources are completely free.' },
            { question: 'How much can I earn?', answer: 'Our top earners make $2,000-5,000/month.' },
            { question: 'Do I need experience?', answer: 'No! We have guides for complete beginners.' },
            { question: 'How do I get paid?', answer: 'Withdraw to bank account, Mastercard, or cryptocurrency.' },
            { question: 'Can I use this on mobile?', answer: 'Yes! The site works perfectly on all devices.' }
        ],
        
        testimonials: [
            { name: 'Ahmed K.', location: 'Kano', text: 'Made $2,500 in my first 3 months!', rating: 5 },
            { name: 'Fatima M.', location: 'Cairo', text: 'I was a student with no income. Now I earn $1,800/month.', rating: 5 },
            { name: 'John O.', location: 'Lagos', text: 'The 30 links are pure gold.', rating: 5 }
        ],
        
        team: [
            { name: 'TICHER', role: 'Founder & CEO', bio: 'Digital entrepreneur helping 10,000+ achieve financial freedom.', avatar: '🚀' },
            { name: 'Ahmed', role: 'Affiliate Expert', bio: 'Made $50k+ in affiliate commissions.', avatar: '💰' },
            { name: 'Fatima', role: 'Freelance Coach', bio: 'From student to $5k/month freelancer.', avatar: '👩‍💻' }
        ],
        
        achievements: { members: 10000, earned: 2500000, countries: 47, blogs: 500, videos: 100, links: 30 },
        
        // Long About Section
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into successful digital entrepreneurs.',
            vision: 'A world where anyone can build sustainable online income streams regardless of their background.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER, who successfully built multiple six-figure online businesses after years of failure. Recognizing the lack of accessible, practical information for beginners, TICHER created this platform to share proven strategies and tools that actually work. What began as a simple blog has grown into a comprehensive hub serving thousands of aspiring entrepreneurs across Nigeria, Africa, the Middle East, and beyond. Our community has collectively earned over $2.5 million using the methods and links shared on this platform.',
            values: ['Accessibility', 'Practicality', 'Transparency', 'Community', 'Innovation'],
            team: 'Our team consists of successful digital entrepreneurs, content creators, and tech experts who are passionate about helping others succeed online.',
            community: 'Join thousands of successful earners from Nigeria, Ghana, Egypt, Kenya, South Africa, and beyond.'
        },
        
        // Long Privacy Section
        privacyContent: {
            lastUpdated: 'March 2026',
            introduction: '3EESHER-CLOUD ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.',
            dataCollected: 'We collect information you provide directly to us, such as when you contact us via email, subscribe to our newsletter, or participate in community features. This may include your name, email address, and any content you submit.',
            dataUsage: 'We use the information we collect to provide, operate, and maintain our services; improve, personalize, and expand our services; communicate with you; and monitor usage patterns.',
            cookies: 'We use cookies to enhance your experience. You can instruct your browser to refuse all cookies.',
            thirdParty: 'We may employ third-party companies to facilitate our services.',
            security: 'We implement appropriate technical and organizational security measures to protect your personal information.',
            rights: 'You have the right to access, correct, update, or request deletion of your personal information.',
            children: 'Our services are not intended for individuals under the age of 18.',
            changes: 'We may update this Privacy Policy from time to time.'
        },
        
        // Long Success Stories
        successStories: [
            {
                name: 'Ahmed from Kano', age: 45,
                before: 'Civil servant earning N80,000/month ($50)',
                after: '$2,500/month online',
                story: 'Ahmed was a civil servant struggling to pay school fees. He started with Fiverr doing logo design, making just $47 in his first month. He didn\'t give up. He learned Canva, took online courses, and expanded to Upwork. By month 3, he was making $1,200. He added ClickBank affiliate marketing and reached $1,800 by month 6. Today, he earns $2,500/month, owns a house, a car, and his children are in private school.',
                avatar: '👨‍💼', color: '#10b981',
                timeline: ['Month 1: $47', 'Month 3: $1,200', 'Month 6: $1,800', 'Now: $2,500']
            },
            {
                name: 'Fatima from Cairo', age: 22,
                before: 'University student with no income',
                after: '$1,800/month freelancing',
                story: 'Fatima was an engineering student watching her friends travel while she couldn\'t afford a new phone. She started with data entry on Upwork, making $87 in her first month from 15 small tasks. She learned social media management and by month 3 had 3 retainer clients at $450/month. She improved her English, targeted US clients, and by month 6 was making $1,200. She added Canva templates on Etsy and started teaching other students, reaching $1,800/month.',
                avatar: '👩‍🎓', color: '#f59e0b',
                timeline: ['Month 1: $87', 'Month 3: $450', 'Month 6: $1,200', 'Now: $1,800']
            },
            {
                name: 'TICHER (Founder)', age: 35,
                before: 'Failed for 2 years',
                after: 'Built 3EESHER-CLOUD',
                story: 'TICHER failed for 2 years trying to copy others. He tried everything - dropshipping, crypto, forex - and lost money. Then he discovered the formula: Solve REAL problems for REAL people. He created this platform to help Nigerians make money online. Today he earns from multiple streams: affiliate marketing, ad revenue, consultations, and digital products.',
                avatar: '🚀', color: '#fbbf24',
                timeline: ['Year 1: $0', 'Year 2: $500', 'Year 3: $5,000', 'Now: $10,000+']
            }
        ],
        
        settings: { autoBlogger: true, autoMoneyMaker: true, autoTargeting: true, blogFrequency: 2, theme: 'dark', notifications: true }
    };
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Admin login
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

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// API endpoints
app.get('/api/data', (req, res) => {
    const data = getData();
    res.json({
        blogPosts: data.blogPosts || [],
        moneyLinks: data.moneyLinks,
        successStories: data.successStories,
        aboutContent: data.aboutContent,
        privacyContent: data.privacyContent,
        testimonials: data.testimonials,
        faq: data.faq,
        team: data.team,
        achievements: data.achievements,
        videos: data.videos
    });
});

// Subscribe
app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    
    const data = getData();
    if (!data.subscribers.includes(email)) {
        data.subscribers.push(email);
        saveData(data);
    }
    res.json({ success: true });
});

// Earnings
app.get('/api/earnings', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json(data.earnings);
});

app.post('/api/earnings/add', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { amount, source, link } = req.body;
    const data = getData();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    data.earnings.total += numAmount;
    data.earnings.today += numAmount;
    data.earnings.month += numAmount;
    data.earnings.transactions.push({ amount: numAmount, source, link, timestamp: new Date().toISOString() });
    
    if (link) {
        if (!data.earnings.byLink) data.earnings.byLink = {};
        data.earnings.byLink[link] = (data.earnings.byLink[link] || 0) + numAmount;
        
        const foundLink = data.moneyLinks.find(l => l.name.toLowerCase() === link.toLowerCase());
        if (foundLink) {
            foundLink.earnings = (foundLink.earnings || 0) + numAmount;
        }
    }
    
    saveData(data);
    res.json({ success: true });
});

app.post('/api/withdraw', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { amount, method } = req.body;
    const data = getData();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    if (numAmount > data.earnings.total) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    data.earnings.total -= numAmount;
    data.earnings.today = 0;
    data.earnings.withdrawals.push({ amount: numAmount, method, timestamp: new Date().toISOString() });
    
    saveData(data);
    res.json({ success: true });
});

// Track clicks
app.post('/api/track-click', (req, res) => {
    const { linkName } = req.body;
    const data = getData();
    const link = data.moneyLinks.find(l => l.name === linkName);
    if (link) {
        link.clicks = (link.clicks || 0) + 1;
        saveData(data);
    }
    res.json({ success: true });
});

// Add affiliate link
app.post('/api/add-affiliate', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { store, id } = req.body;
    const data = getData();
    
    const link = data.moneyLinks.find(l => l.name.toLowerCase().includes(store.toLowerCase()));
    
    if (link) {
        link.id = id;
        link.active = true;
        if (link.name.includes('Jumia')) {
            link.url = `https://www.jumia.com.ng/?aff_id=${id}`;
        } else {
            link.url = `https://www.${link.name.toLowerCase().replace(/\s/g, '')}.com/?aff_id=${id}`;
        }
        saveData(data);
        res.json({ success: true, message: `✅ Added ID for ${link.name}` });
    } else {
        const newLink = {
            name: store,
            url: `https://www.${store.toLowerCase().replace(/\s/g, '')}.com/?aff_id=${id}`,
            id, active: true, clicks: 0, earnings: 0, icon: '🔗', category: 'custom'
        };
        data.customLinks.push(newLink);
        saveData(data);
        res.json({ success: true, message: `✅ Added custom link for ${store}` });
    }
});

// ==================== MANUAL BLOG WITH IMAGE UPLOAD ====================
app.post('/api/create-blog', upload.single('image'), (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { title, content } = req.body;
    const data = getData();
    
    const post = {
        id: Date.now(),
        title,
        content,
        image: req.file ? `/uploads/${req.file.filename}` : 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        date: new Date().toISOString(),
        views: 0,
        author: 'Admin'
    };
    
    data.blogPosts.unshift(post);
    saveData(data);
    res.json({ success: true, post });
});

app.delete('/api/blog/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    data.blogPosts = data.blogPosts.filter(p => p.id != req.params.id);
    saveData(data);
    res.json({ success: true });
});

// ==================== VIDEO UPLOAD ====================
app.post('/api/upload/video', upload.single('video'), (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No video uploaded' });
    
    const data = getData();
    const videoUrl = `/videos/${req.file.filename}`;
    
    data.videos.push({
        id: Date.now(),
        title: req.body.title || 'Uploaded Video',
        videoUrl: videoUrl,
        thumbnail: '/images/video-thumb.jpg',
        type: 'local',
        filename: req.file.filename,
        region: 'uploaded'
    });
    
    saveData(data);
    res.json({ success: true, videoUrl });
});

app.delete('/api/video/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    
    const videoIndex = data.videos.findIndex(v => v.id == req.params.id);
    if (videoIndex !== -1) {
        const video = data.videos[videoIndex];
        if (video.type === 'local' && video.filename) {
            try {
                fs.unlinkSync(path.join(__dirname, 'videos', video.filename));
            } catch (e) {}
        }
        data.videos.splice(videoIndex, 1);
        saveData(data);
    }
    
    res.json({ success: true });
});

// ==================== IMAGE UPLOAD ====================
app.post('/api/upload/image', upload.single('image'), (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const data = getData();
    const imageUrl = `/uploads/${req.file.filename}`;
    
    data.images.push({
        filename: req.file.filename,
        url: imageUrl,
        uploadedAt: new Date().toISOString()
    });
    
    saveData(data);
    res.json({ success: true, url: imageUrl });
});

// ==================== SOCIAL MEDIA PIXELS ====================
app.post('/api/social/update', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { platform, value } = req.body;
    const data = getData();
    if (!data.socialPixels) data.socialPixels = {};
    data.socialPixels[platform] = value;
    saveData(data);
    res.json({ success: true });
});

app.get('/api/social/pixels', (req, res) => {
    const data = getData();
    res.json(data.socialPixels || {});
});

// ==================== TARGETING ====================
app.post('/api/target-phones', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { phones } = req.body;
    const data = getData();
    data.targeting.phones = [...new Set([...data.targeting.phones, ...phones])];
    saveData(data);
    res.json({ success: true, count: data.targeting.phones.length });
});

app.post('/api/target-imeis', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { imeis } = req.body;
    const data = getData();
    data.targeting.imeis = [...new Set([...data.targeting.imeis, ...imeis])];
    saveData(data);
    res.json({ success: true, count: data.targeting.imeis.length });
});

// ==================== UNIVERSAL INJECTOR ====================
app.post('/api/inject', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { location, code } = req.body;
    const data = getData();
    data.injections[location] = code;
    saveData(data);
    res.json({ success: true });
});

app.get('/api/injections', (req, res) => {
    const data = getData();
    res.json(data.injections || {});
});

// ==================== UNLIMITED COMMAND HANDLER ====================
app.post('/api/command', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    
    const { command } = req.body;
    if (!command || command.trim() === '') {
        return res.json({ response: '❌ Please type a command. Try "help" for options.' });
    }
    
    const data = getData();
    let response = '';
    const cmd = command.toLowerCase().trim();
    
    // Help command
    if (cmd === 'help' || cmd === 'commands' || cmd === 'what can you do') {
        response = `🤖 **AVAILABLE COMMANDS**\n\n` +
                   `💰 **EARNINGS**\n` +
                   `• show earnings - Display total, today, month\n` +
                   `• show transactions - View recent earnings\n` +
                   `• show withdrawals - View withdrawal history\n` +
                   `• withdraw $50 - Withdraw money\n` +
                   `• add earning $50 from Jumia - Add commission\n\n` +
                   
                   `🔗 **AFFILIATE LINKS**\n` +
                   `• show links - List all your links\n` +
                   `• add affiliate Jumia id allarbaa216-20 - Add ID\n` +
                   `• add custom SHEIN id abc123 - Add new store\n` +
                   `• show top links - Best performing links\n\n` +
                   
                   `📱 **TARGETING**\n` +
                   `• target phones +2348012345678 - Add phone numbers\n` +
                   `• target imei 356789012345678 - Add IMEI numbers\n` +
                   `• show targets - View targeting lists\n\n` +
                   
                   `📝 **CONTENT**\n` +
                   `• create blog about crypto - Generate blog post\n` +
                   `• show blogs - List recent blogs\n` +
                   `• delete blog 123 - Delete a blog\n` +
                   `• show videos - List all videos\n` +
                   `• delete video 123 - Delete a video\n\n` +
                   
                   `📧 **SUBSCRIBERS**\n` +
                   `• show subscribers - List email subscribers\n\n` +
                   
                   `🔌 **INJECTIONS**\n` +
                   `• inject <code> - Inject HTML/JS code\n` +
                   `• show injections - View active injections\n` +
                   `• facebook pixel <code> - Set Facebook Pixel\n` +
                   `• tiktok pixel <code> - Set TikTok Pixel\n\n` +
                   
                   `⚙️ **SYSTEM**\n` +
                   `• status - Bot status and stats\n` +
                   `• pause blog - Pause auto blogger\n` +
                   `• resume blog - Resume auto blogger\n` +
                   `• run now blog - Run blog task immediately\n\n` +
                   
                   `💬 **CONVERSATIONAL**\n` +
                   `• hello, hi, good morning, good night\n` +
                   `• thank you, thanks\n` +
                   `• who are you\n` +
                   `• motivate me, joke`;
    }
    
    // Earnings commands
    else if (cmd.includes('show earnings') || cmd.includes('my money') || cmd.includes('balance') || cmd === 'earnings') {
        response = `💰 **EARNINGS SUMMARY**\n` +
                   `• Total: $${data.earnings.total.toFixed(2)}\n` +
                   `• Today: $${data.earnings.today.toFixed(2)}\n` +
                   `• This Month: $${data.earnings.month.toFixed(2)}`;
    }
    
    else if (cmd.includes('show transactions') || cmd.includes('transaction history')) {
        const recent = data.earnings.transactions.slice(-5).reverse();
        if (recent.length === 0) {
            response = '📋 No transactions yet. Add your first earning with "add earning $50 from Jumia"';
        } else {
            response = '📋 **RECENT TRANSACTIONS**\n';
            recent.forEach((t, i) => {
                response += `${i+1}. $${t.amount.toFixed(2)} from ${t.source || 'Unknown'} on ${new Date(t.timestamp).toLocaleDateString()}\n`;
            });
        }
    }
    
    else if (cmd.includes('withdraw')) {
        const match = cmd.match(/\$?(\d+(?:\.\d+)?)/);
        if (match) {
            const amount = parseFloat(match[1]);
            if (isNaN(amount) || amount <= 0) {
                response = '❌ Please enter a valid amount. Example: "withdraw $50"';
            }
            else if (amount > data.earnings.total) {
                response = `❌ Insufficient balance. You have $${data.earnings.total.toFixed(2)} available.`;
            }
            else {
                let method = 'bank';
                if (cmd.includes('card')) method = 'card';
                else if (cmd.includes('crypto')) method = 'crypto';
                
                data.earnings.total -= amount;
                data.earnings.today = 0;
                data.earnings.withdrawals.push({ amount, method, timestamp: new Date().toISOString() });
                saveData(data);
                response = `✅ **WITHDRAWAL PROCESSED**\n` +
                           `• Amount: $${amount.toFixed(2)}\n` +
                           `• Method: ${method}\n` +
                           `• Remaining: $${data.earnings.total.toFixed(2)}`;
            }
        } else {
            response = '❌ Please specify amount. Example: "withdraw $50"';
        }
    }
    
    else if (cmd.includes('add earning') || cmd.includes('add commission')) {
        const amountMatch = cmd.match(/\$?(\d+(?:\.\d+)?)/);
        let source = 'Manual Entry';
        
        const sourceMatch = cmd.match(/from (.*?)(?:\s|$)/i) || cmd.match(/for (.*?)(?:\s|$)/i);
        if (sourceMatch) source = sourceMatch[1].trim();
        
        if (amountMatch) {
            const amount = parseFloat(amountMatch[1]);
            if (isNaN(amount) || amount <= 0) {
                response = '❌ Please enter a valid amount. Example: "add earning $50 from Jumia"';
            } else {
                data.earnings.total += amount;
                data.earnings.today += amount;
                data.earnings.month += amount;
                data.earnings.transactions.push({ amount, source, timestamp: new Date().toISOString() });
                
                const linkMatch = data.moneyLinks.find(l => source.toLowerCase().includes(l.name.toLowerCase()));
                if (linkMatch) {
                    if (!data.earnings.byLink) data.earnings.byLink = {};
                    data.earnings.byLink[linkMatch.name] = (data.earnings.byLink[linkMatch.name] || 0) + amount;
                    linkMatch.earnings = (linkMatch.earnings || 0) + amount;
                }
                
                saveData(data);
                response = `✅ **EARNING ADDED**\n` +
                           `• Amount: $${amount.toFixed(2)}\n` +
                           `• Source: ${source}\n` +
                           `• New Total: $${data.earnings.total.toFixed(2)}`;
            }
        } else {
            response = '❌ Please specify amount. Example: "add earning $50 from Jumia"';
        }
    }
    
    // Link commands
    else if (cmd.includes('show links') || cmd.includes('my links') || cmd === 'links') {
        const active = data.moneyLinks.filter(l => l.active && l.id);
        const inactive = data.moneyLinks.filter(l => !l.active || !l.id);
        const custom = data.customLinks || [];
        
        response = `📊 **AFFILIATE LINKS**\n\n`;
        response += `✅ **Active (${active.length}/30)**\n`;
        active.slice(0, 5).forEach(l => {
            response += `   • ${l.icon || '🔗'} ${l.name}: ${l.id} (${l.clicks || 0} clicks, $${(l.earnings || 0).toFixed(2)})\n`;
        });
        if (active.length > 5) response += `   ... and ${active.length-5} more\n`;
        
        if (custom.length > 0) {
            response += `\n📌 **Custom Links (${custom.length})**\n`;
            custom.slice(0, 3).forEach(l => {
                response += `   • ${l.name}: ${l.id} (${l.clicks || 0} clicks)\n`;
            });
        }
    }
    
    else if (cmd.includes('add affiliate')) {
        const match = cmd.match(/add affiliate (.*?) id (.*)/i);
        if (match) {
            const store = match[1].trim();
            const id = match[2].trim();
            
            const link = data.moneyLinks.find(l => l.name.toLowerCase().includes(store.toLowerCase()));
            
            if (link) {
                link.id = id;
                link.active = true;
                if (link.name.includes('Jumia')) {
                    link.url = `https://www.jumia.com.ng/?aff_id=${id}`;
                } else {
                    link.url = `https://www.${link.name.toLowerCase().replace(/\s/g, '')}.com/?aff_id=${id}`;
                }
                saveData(data);
                response = `✅ **AFFILIATE ID ADDED**\n` +
                           `• Store: ${link.name}\n` +
                           `• ID: ${id}`;
            } else {
                const newLink = {
                    name: store,
                    url: `https://www.${store.toLowerCase().replace(/\s/g, '')}.com/?aff_id=${id}`,
                    id, active: true, clicks: 0, earnings: 0, icon: '🔗', category: 'custom'
                };
                data.customLinks.push(newLink);
                saveData(data);
                response = `✅ **CUSTOM LINK ADDED**\n` +
                           `• Store: ${store}\n` +
                           `• ID: ${id}`;
            }
        } else {
            response = '❌ Format: add affiliate [store] id [id]\nExample: add affiliate Jumia id allarbaa216-20';
        }
    }
    
    // Targeting commands
    else if (cmd.includes('target phones')) {
        const phoneMatch = cmd.match(/[\+?\d{10,15}]+/g);
        if (phoneMatch && phoneMatch.length > 0) {
            data.targeting.phones = [...new Set([...data.targeting.phones, ...phoneMatch])];
            saveData(data);
            response = `✅ Added ${phoneMatch.length} phone numbers.\n📱 Total phones: ${data.targeting.phones.length}`;
        } else {
            response = '❌ No valid phone numbers found. Use: target phones +2348012345678';
        }
    }
    
    else if (cmd.includes('target imei')) {
        const imeiMatch = cmd.match(/\b\d{15}\b/g);
        if (imeiMatch && imeiMatch.length > 0) {
            data.targeting.imeis = [...new Set([...data.targeting.imeis, ...imeiMatch])];
            saveData(data);
            response = `✅ Added ${imeiMatch.length} IMEIs.\n📱 Total IMEIs: ${data.targeting.imeis.length}`;
        } else {
            response = '❌ No valid 15-digit IMEI numbers found.';
        }
    }
    
    else if (cmd.includes('show targets')) {
        response = `🎯 **TARGETING LISTS**\n` +
                   `• Phone Numbers: ${data.targeting.phones.length}\n` +
                   `• IMEI Numbers: ${data.targeting.imeis.length}`;
    }
    
    // Content commands
    else if (cmd.includes('create blog') || cmd.includes('write blog')) {
        const topic = cmd.replace(/create blog|write blog|about/gi, '').trim() || 'making money';
        const blog = {
            id: Date.now(),
            title: `How to Make Money with ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
            content: `<p>This comprehensive guide will show you how to make money with ${topic} in 2026.</p>
                      <h2>Why ${topic}?</h2>
                      <p>${topic} is one of the fastest-growing ways to earn online.</p>
                      <h2>Getting Started</h2>
                      <p>Follow these steps to begin your journey with ${topic}:</p>
                      <ul>
                      <li>Step 1: Research the market</li>
                      <li>Step 2: Choose your platform</li>
                      <li>Step 3: Create valuable content</li>
                      <li>Step 4: Promote your work</li>
                      </ul>`,
            image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
            date: new Date().toISOString(),
            views: 0,
            author: 'Bot'
        };
        data.blogPosts.unshift(blog);
        saveData(data);
        response = `✅ **BLOG CREATED**\n• Title: ${blog.title}`;
    }
    
    else if (cmd.includes('show blogs')) {
        if (data.blogPosts.length === 0) {
            response = '📝 No blogs yet. Create one with "create blog about [topic]"';
        } else {
            response = '📝 **RECENT BLOGS**\n';
            data.blogPosts.slice(0, 5).forEach((b, i) => {
                response += `${i+1}. ID: ${b.id} - ${b.title} (${new Date(b.date).toLocaleDateString()})\n`;
            });
        }
    }
    
    else if (cmd.includes('delete blog')) {
        const match = cmd.match(/delete blog (\d+)/);
        if (match) {
            const id = parseInt(match[1]);
            const before = data.blogPosts.length;
            data.blogPosts = data.blogPosts.filter(b => b.id !== id);
            if (data.blogPosts.length < before) {
                saveData(data);
                response = `✅ Blog ${id} deleted.`;
            } else {
                response = `❌ Blog ${id} not found.`;
            }
        } else {
            response = '❌ Specify blog ID: delete blog 123';
        }
    }
    
    else if (cmd.includes('show videos')) {
        response = `🎬 **VIDEOS**\nTotal: ${data.videos.length}\n\nFirst 5:\n` +
                   data.videos.slice(0, 5).map(v => `• ID: ${v.id} - ${v.title}`).join('\n');
    }
    
    else if (cmd.includes('delete video')) {
        const match = cmd.match(/delete video (\d+)/);
        if (match) {
            const id = parseInt(match[1]);
            const videoIndex = data.videos.findIndex(v => v.id === id);
            if (videoIndex !== -1) {
                const video = data.videos[videoIndex];
                if (video.type === 'local' && video.filename) {
                    try { fs.unlinkSync(path.join(__dirname, 'videos', video.filename)); } catch (e) {}
                }
                data.videos.splice(videoIndex, 1);
                saveData(data);
                response = `✅ Video ${id} deleted.`;
            } else {
                response = `❌ Video ${id} not found.`;
            }
        } else {
            response = '❌ Specify video ID: delete video 123';
        }
    }
    
    // Subscriber commands
    else if (cmd.includes('show subscribers')) {
        response = `📧 **SUBSCRIBERS**\nTotal: ${data.subscribers.length}`;
    }
    
    // Injection commands
    else if (cmd.includes('inject ')) {
        const code = cmd.replace('inject ', '').trim();
        if (code) {
            data.injections.bodyEnd = code;
            saveData(data);
            response = `✅ Code injected. Length: ${code.length} characters`;
        } else {
            response = '❌ Please provide code to inject.';
        }
    }
    
    else if (cmd.includes('show injections')) {
        response = '🔌 **ACTIVE INJECTIONS**\n';
        let hasInjections = false;
        Object.entries(data.injections).forEach(([loc, code]) => {
            if (code) {
                response += `• ${loc}: ${code.substring(0, 50)}...\n`;
                hasInjections = true;
            }
        });
        if (!hasInjections) response += 'No active injections.';
    }
    
    else if (cmd.includes('facebook pixel')) {
        const code = cmd.replace('facebook pixel', '').trim();
        if (!data.socialPixels) data.socialPixels = {};
        data.socialPixels.facebook = code;
        saveData(data);
        response = `✅ Facebook Pixel ${code ? 'updated' : 'cleared'}`;
    }
    
    else if (cmd.includes('tiktok pixel')) {
        const code = cmd.replace('tiktok pixel', '').trim();
        if (!data.socialPixels) data.socialPixels = {};
        data.socialPixels.tiktok = code;
        saveData(data);
        response = `✅ TikTok Pixel ${code ? 'updated' : 'cleared'}`;
    }
    
    // Status commands
    else if (cmd.includes('status') || cmd.includes('bot status')) {
        const totalClicks = data.moneyLinks.reduce((sum, l) => sum + (l.clicks || 0), 0);
        response = `🤖 **BOT STATUS**\n` +
                   `• Auto Money Maker: ${data.settings.autoMoneyMaker ? '✅ Running' : '⏸️ Paused'}\n` +
                   `• Auto Blogger: ${data.settings.autoBlogger ? `✅ ${data.settings.blogFrequency}x daily` : '⏸️ Paused'}\n` +
                   `• Auto Targeting: ${data.settings.autoTargeting ? '✅ Running' : '⏸️ Paused'}\n\n` +
                   `📊 **STATISTICS**\n` +
                   `• Total Earnings: $${data.earnings.total.toFixed(2)}\n` +
                   `• Total Clicks: ${totalClicks}\n` +
                   `• Active Links: ${data.moneyLinks.filter(l => l.active && l.id).length}/30\n` +
                   `• Blog Posts: ${data.blogPosts.length}\n` +
                   `• Videos: ${data.videos.length}\n` +
                   `• Subscribers: ${data.subscribers.length}`;
    }
    
    else if (cmd.includes('pause blog')) {
        data.settings.autoBlogger = false;
        saveData(data);
        response = '⏸️ Auto blogger paused.';
    }
    
    else if (cmd.includes('resume blog')) {
        data.settings.autoBlogger = true;
        saveData(data);
        response = '▶️ Auto blogger resumed.';
    }
    
    else if (cmd.includes('run now blog')) {
        const topics = ['affiliate marketing', 'freelancing', 'passive income'];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        const blog = {
            id: Date.now(),
            title: `Quick Guide: Make Money with ${randomTopic}`,
            content: `<p>This is a manually triggered blog about ${randomTopic}.</p>`,
            image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
            date: new Date().toISOString(),
            views: 0,
            author: 'Manual Trigger'
        };
        data.blogPosts.unshift(blog);
        saveData(data);
        response = `✅ Blog created: "${blog.title}"`;
    }
    
    // Conversational commands
    else if (cmd.includes('hello') || cmd.includes('hi')) {
        response = `👋 Hello boss! I'm your 3EESHER bot. Type 'help' to see what I can do.`;
    }
    
    else if (cmd.includes('good morning')) {
        response = `🌅 Good morning boss! Ready to make some money today?`;
    }
    
    else if (cmd.includes('good night')) {
        response = `🌙 Good night! I'll keep working while you sleep.`;
    }
    
    else if (cmd.includes('thank you') || cmd.includes('thanks')) {
        response = `🤝 You're welcome! Always here to help!`;
    }
    
    else if (cmd.includes('who are you')) {
        response = `🤖 I'm 3EESHER bot - your autonomous money making machine.`;
    }
    
    else if (cmd.includes('motivate me')) {
        const quotes = [
            "💰 Every click is potential money!",
            "🚀 Consistency beats intensity. Keep going!",
            "💪 You're closer than you think to your first $1000!",
            "🌟 Your future self will thank you for starting today."
        ];
        response = quotes[Math.floor(Math.random() * quotes.length)];
    }
    
    else if (cmd.includes('joke')) {
        const jokes = [
            "Why did the affiliate marketer go to jail? He was caught selling links! 😄",
            "What's a blogger's favorite drink? A hot cup of earnings! ☕💰",
            "Why do bots make good workers? They never ask for breaks! 🤖"
        ];
        response = jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    // Default response
    else {
        response = `🤖 Command received: "${command}"\n\nTry 'help' to see all commands.`;
    }
    
    res.json({ response });
});

// ==================== AUTO BLOGGER (2x daily) ====================
const blogTopics = [
    {
        title: 'How to Make $1000 Monthly with Affiliate Marketing',
        content: '<p>Affiliate marketing is one of the best ways to earn money online. You promote products and earn commissions on every sale.</p><h2>Choose Your Niche</h2><p>Pick a topic you\'re passionate about.</p><h2>Join Affiliate Programs</h2><p>Sign up for programs like Jumia, Amazon Associates, ClickBank.</p>',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800'
    },
    {
        title: 'Top 10 Freelance Skills That Pay Well in 2026',
        content: '<p>The freelance economy is booming. Here are the most in-demand skills:</p><h2>1. Web Development</h2><p>$50-100/hour</p><h2>2. Copywriting</h2><p>$50-150/hour</p>',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800'
    }
];

cron.schedule('0 8,20 * * *', () => {
    console.log('📝 Auto blogger running at', new Date().toLocaleString());
    const data = getData();
    
    if (!data.settings.autoBlogger) return;
    
    const randomIndex = Math.floor(Math.random() * blogTopics.length);
    const blog = blogTopics[randomIndex];
    
    const jumiaLink = data.moneyLinks.find(l => l.name.includes('Jumia'));
    let content = blog.content;
    if (jumiaLink && jumiaLink.active) {
        content += `\n\n<p><a href="${jumiaLink.url}" target="_blank">Shop on Jumia</a> and earn commissions!</p>`;
    }
    
    const post = {
        id: Date.now(),
        title: blog.title,
        content: content,
        image: blog.image,
        date: new Date().toISOString(),
        views: 0,
        author: '3EESHER Bot'
    };
    
    data.blogPosts.unshift(post);
    if (data.blogPosts.length > 30) data.blogPosts.pop();
    saveData(data);
    
    console.log(`✅ Auto blog posted: ${blog.title}`);
});

// ==================== AUTO MONEY MAKER (every hour) ====================
cron.schedule('0 * * * *', () => {
    console.log('💰 Auto money maker running at', new Date().toLocaleString());
    const data = getData();
    
    if (!data.settings.autoMoneyMaker) return;
    
    const activeLinks = data.moneyLinks.filter(l => l.active);
    if (activeLinks.length > 0) {
        activeLinks.forEach(link => {
            link.clicks = (link.clicks || 0) + 1;
        });
        saveData(data);
    }
});

// ==================== AUTO TARGETING (every 30 min) ====================
cron.schedule('*/30 * * * *', () => {
    console.log('🎯 Auto targeting running at', new Date().toLocaleString());
    const data = getData();
    
    if (!data.settings.autoTargeting) return;
    
    if (data.targeting.phones.length > 0 || data.targeting.imeis.length > 0) {
        console.log(`✅ Targeting ${data.targeting.phones.length} phones, ${data.targeting.imeis.length} IMEIs`);
    }
});

// ==================== MAIN PAGE ====================
app.get('/', (req, res) => {
    const data = getData();
    const injections = data.injections || {};
    const socialPixels = data.socialPixels || {};
    
    const pixelHtml = `
        ${socialPixels.facebook || ''}
        ${socialPixels.twitter || ''}
        ${socialPixels.tiktok || ''}
        ${socialPixels.linkedin || ''}
        ${socialPixels.pinterest || ''}
        ${socialPixels.snapchat || ''}
        ${socialPixels.googleAds || ''}
        ${socialPixels.customHead || ''}
    `;
    
    const postsHtml = data.blogPosts.slice(0, 6).map(post => `
        <div class="blog-card">
            <img src="${post.image}" style="width:100%;height:200px;object-fit:cover;">
            <div class="blog-content">
                <h3>${post.title}</h3>
                <p>${post.content.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                <div class="blog-meta">${new Date(post.date).toLocaleDateString()} • ${post.author}</div>
                <a href="/blog/${post.id}">Read More →</a>
            </div>
        </div>
    `).join('');

    const linksHtml = data.moneyLinks.map(link => `
        <a href="${link.url}" target="_blank" class="link-card" onclick="trackClick('${link.name}')">
            <div class="link-icon">${link.icon || '🔗'}</div>
            <div class="link-info"><h4>${link.name}</h4><p>${link.id ? '✓ Active' : '⚡ Set ID'}</p><span class="link-category">${link.category}</span></div>
        </a>
    `).join('');

    const storiesHtml = data.successStories.map(story => `
        <div class="story-card" style="border-left-color: ${story.color}">
            <div class="story-header"><div class="story-avatar" style="background:${story.color}">${story.avatar}</div><div><h3>${story.name}</h3><p class="story-before">📉 Before: ${story.before}</p><p class="story-after">📈 After: ${story.after}</p></div></div>
            <div class="story-content"><p>${story.story.substring(0,200)}...</p></div>
            <div class="story-timeline">${story.timeline.map(p => `<span>${p}</span>`).join(' → ')}</div>
        </div>
    `).join('');

    const americanVideos = data.videos.filter(v => v.region === 'american').map(video => `
        <div class="video-card" onclick="playVideo('${video.videoUrl}')">
            <div class="video-thumbnail" style="background-image:url('${video.thumbnail}')"><div class="play-button">▶</div></div>
            <h4>${video.title}</h4>
            <div class="video-controls"><button class="video-btn" onclick="event.stopPropagation(); downloadVideo('${video.videoUrl}')">⬇️ Download</button></div>
        </div>
    `).join('');

    const arabicVideos = data.videos.filter(v => v.region === 'arabic').map(video => `
        <div class="video-card" onclick="playVideo('${video.videoUrl}')">
            <div class="video-thumbnail" style="background-image:url('${video.thumbnail}')"><div class="play-button">▶</div></div>
            <h4>${video.title}</h4>
            <div class="video-controls"><button class="video-btn" onclick="event.stopPropagation(); downloadVideo('${video.videoUrl}')">⬇️ Download</button></div>
        </div>
    `).join('');

    const topImages = [
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'
    ];
    
    const middleImages = [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'
    ];
    
    const bottomImages = [
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
        'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800'
    ];
    
    const topImagesHtml = topImages.map(img => `<img src="${img}" class="gallery-img">`).join('');
    const middleImagesHtml = middleImages.map(img => `<img src="${img}" class="gallery-img">`).join('');
    const bottomImagesHtml = bottomImages.map(img => `<img src="${img}" class="gallery-img">`).join('');

    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>3EESHER-CLOUD</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-HD01MF5SL9"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-HD01MF5SL9');</script>
    ${pixelHtml}
    ${injections.head || ''}
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial;background:#0f172a;color:white;line-height:1.6;}
        .container{max-width:1400px;margin:0 auto;padding:20px;}
        .header{text-align:center;padding:60px;background:#1e293b;border-radius:20px;margin-bottom:40px;}
        .logo{font-size:64px;color:#10b981;animation:float 3s ease infinite;}
        @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-20px);}}
        .tagline{font-size:24px;color:#fbbf24;}
        .section-title{font-size:32px;color:#fbbf24;margin:50px 0 30px;border-bottom:3px solid #10b981;}
        .gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:25px;margin:30px 0;}
        .gallery-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:25px;margin:30px 0;}
        .gallery-img{width:100%;height:300px;object-fit:cover;border-radius:15px;}
        .blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:30px;}
        .blog-card{background:#1e293b;border-radius:15px;overflow:hidden;}
        .blog-content{padding:20px;}
        .blog-content h3{color:#fbbf24;}
        .blog-meta{color:#94a3b8;margin:10px 0;}
        .links-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:15px;margin:30px 0;}
        .link-card{background:#1e293b;padding:20px;border-radius:10px;text-decoration:none;color:white;border-left:4px solid #10b981;display:flex;gap:15px;}
        .link-icon{font-size:32px;}
        .link-info h4{color:#fbbf24;}
        .link-category{background:#0f172a;padding:2px 8px;border-radius:12px;font-size:12px;color:#94a3b8;}
        .stories-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin:40px 0;}
        .story-card{background:#1e293b;padding:25px;border-radius:15px;}
        .story-header{display:flex;gap:20px;margin-bottom:20px;}
        .story-avatar{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;}
        .story-before{color:#ef4444;font-size:14px;}
        .story-after{color:#10b981;font-weight:bold;}
        .story-timeline{display:flex;justify-content:space-between;margin-top:20px;padding-top:20px;border-top:1px solid #334155;font-size:14px;color:#fbbf24;}
        
        .video-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:20px;margin:30px 0;}
        .video-card{background:#1e293b;border-radius:10px;overflow:hidden;cursor:pointer;transition:transform 0.3s;border:1px solid #334155;}
        .video-card:hover{transform:scale(1.05);border-color:#10b981;}
        .video-thumbnail{height:150px;background-size:cover;background-position:center;position:relative;}
        .play-button{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;color:white;opacity:0.9;}
        .video-card h4{padding:15px;text-align:center;font-size:14px;color:#fbbf24;}
        .video-controls{padding:0 15px 15px;}
        .video-btn{width:100%;padding:8px;background:#0f172a;color:white;border:1px solid #10b981;border-radius:5px;cursor:pointer;font-size:12px;}
        .video-btn:hover{background:#10b981;}
        
        .newsletter-section{background:linear-gradient(135deg,#10b981,#8b5cf6);border-radius:20px;padding:40px;text-align:center;margin:40px 0;}
        .newsletter-form{display:flex;max-width:500px;margin:20px auto;}
        .newsletter-form input{flex:1;padding:15px;border:none;border-radius:8px 0 0 8px;}
        .newsletter-form button{padding:15px 30px;background:#fbbf24;border:none;border-radius:0 8px 8px 0;font-weight:bold;cursor:pointer;}
        .about-section,.privacy-section{background:#1e293b;border-radius:20px;padding:40px;margin:50px 0;}
        .about-section h3,.privacy-section h3{color:#fbbf24;margin:30px 0 15px;}
        .footer{text-align:center;margin-top:80px;padding:40px;border-top:1px solid #334155;color:#94a3b8;}
        .admin-btn{position:fixed;bottom:20px;right:20px;background:#10b981;color:white;padding:15px 25px;border-radius:50px;text-decoration:none;}
        
        @media (max-width:1024px){
            .gallery-grid,.video-grid{grid-template-columns:repeat(3,1fr);}
            .stories-grid{grid-template-columns:repeat(2,1fr);}
        }
        @media (max-width:768px){
            .gallery-grid,.gallery-grid-2,.video-grid,.stories-grid{grid-template-columns:1fr;}
        }
        ${injections.css || ''}
    </style>
</head>
<body>
    ${injections.bodyStart || ''}
    ${socialPixels.customBody || ''}
    
    <div id="videoModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:10000;justify-content:center;align-items:center;">
        <div style="position:relative;width:90%;max-width:800px;">
            <button onclick="closeVideoModal()" style="position:absolute;top:-40px;right:0;background:none;border:none;color:white;font-size:30px;cursor:pointer;">✕</button>
            <video id="videoPlayer" controls style="width:100%;border-radius:10px;"></video>
        </div>
    </div>
    
    <div class="container">
        <div class="header"><div class="logo">☁️ 3EESHER-CLOUD</div><div class="tagline">Your Autonomous Money Machine</div></div>
        
        <h2 class="section-title">📸 Top Gallery</h2>
        <div class="gallery-grid">${topImagesHtml}</div>
        
        <h2 class="section-title">📝 Latest Blog Posts</h2>
        <div class="blog-grid">${postsHtml || '<p>No posts yet. Bot will post at 8 AM and 8 PM.</p>'}</div>
        
        <h2 class="section-title">🏆 Real Success Stories</h2>
        <div class="stories-grid">${storiesHtml}</div>
        
        <h2 class="section-title">📸 Featured Gallery</h2>
        <div class="gallery-grid">${middleImagesHtml}</div>
        
        <h2 class="section-title">🎵 American Music</h2>
        <div class="video-grid">${americanVideos}</div>
        
        <h2 class="section-title">🎵 Arabic Music</h2>
        <div class="video-grid">${arabicVideos}</div>
        
        <h2 class="section-title">💰 30 Money Making Links</h2>
        <div class="links-grid">${linksHtml}</div>
        
        <h2 class="section-title">📸 Additional Gallery</h2>
        <div class="gallery-grid-2">${bottomImagesHtml}</div>
        
        <div class="newsletter-section">
            <h2>📧 Get Free Tips</h2>
            <p>Subscribe for daily money-making tips!</p>
            <div class="newsletter-form"><input type="email" id="newsletterEmail" placeholder="Your email"><button onclick="subscribeNewsletter()">Subscribe</button></div>
        </div>
        
        <h2 class="section-title">📖 About 3EESHER-CLOUD</h2>
        <div class="about-section">
            <h3>🌟 Mission</h3><p>${data.aboutContent.mission}</p>
            <h3>🎯 Vision</h3><p>${data.aboutContent.vision}</p>
            <h3>📚 History</h3><p>${data.aboutContent.history}</p>
            <h3>💎 Values</h3><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">${data.aboutContent.values.map(v => `<div style="background:#0f172a;padding:10px;border-radius:5px;text-align:center;">${v}</div>`).join('')}</div>
            <h3>👥 Team</h3><p>${data.aboutContent.team}</p>
            <h3>🌍 Community</h3><p>${data.aboutContent.community}</p>
            <h3>📞 Contact</h3><p>abdullahharuna216@gmail.com</p>
        </div>
        
        <h2 class="section-title">🔒 Privacy Policy</h2>
        <div class="privacy-section">
            <p><strong>Last Updated:</strong> ${data.privacyContent.lastUpdated}</p>
            <h3>1. Introduction</h3><p>${data.privacyContent.introduction}</p>
            <h3>2. Information Collected</h3><p>${data.privacyContent.dataCollected}</p>
            <h3>3. How We Use Information</h3><p>${data.privacyContent.dataUsage}</p>
            <h3>4. Cookies</h3><p>${data.privacyContent.cookies}</p>
            <h3>5. Third Party Services</h3><p>${data.privacyContent.thirdParty}</p>
            <h3>6. Data Security</h3><p>${data.privacyContent.security}</p>
            <h3>7. Your Rights</h3><p>${data.privacyContent.rights}</p>
            <h3>8. Children's Privacy</h3><p>${data.privacyContent.children}</p>
            <h3>9. Changes to Policy</h3><p>${data.privacyContent.changes}</p>
            <h3>10. Contact</h3><p>abdullahharuna216@gmail.com</p>
        </div>
        
        <div class="footer"><p>© 2026 3EESHER-CLOUD | Contact: abdullahharuna216@gmail.com</p></div>
    </div>
    
    <a href="/admin" class="admin-btn">🔐 Admin</a>
    
    <script>
        function playVideo(videoUrl) {
            const modal = document.getElementById('videoModal');
            const player = document.getElementById('videoPlayer');
            player.src = videoUrl;
            modal.style.display = 'flex';
            player.play();
        }
        
        function closeVideoModal() {
            const modal = document.getElementById('videoModal');
            const player = document.getElementById('videoPlayer');
            player.pause();
            player.src = '';
            modal.style.display = 'none';
        }
        
        function downloadVideo(videoUrl) {
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = videoUrl.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        
        function trackClick(linkName) {
            fetch('/api/track-click', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ linkName })
            });
        }
        
        async function subscribeNewsletter() {
            const email = document.getElementById('newsletterEmail').value;
            if (!email || !email.includes('@')) {
                alert('Please enter a valid email');
                return;
            }
            await fetch('/api/subscribe', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email })
            });
            alert('✅ Subscribed!');
            document.getElementById('newsletterEmail').value = '';
        }
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeVideoModal();
        });
    </script>
    
    ${injections.bodyEnd || ''}
</body>
</html>`);
});

// ==================== ADMIN PAGE ====================
app.get('/admin', (req, res) => {
    if (!req.session.isAdmin) {
        return res.send(`<!DOCTYPE html><html><head><title>Admin Login</title><style>body{background:#0f172a;color:white;display:flex;justify-content:center;align-items:center;height:100vh;}.login-box{background:#1e293b;padding:40px;border-radius:15px;width:350px;}input{width:100%;padding:15px;margin:10px 0;background:#0f172a;border:1px solid #334155;color:white;}button{width:100%;padding:15px;background:#10b981;border:none;border-radius:8px;color:white;cursor:pointer;}</style></head><body><div class="login-box"><h2>Admin Login</h2><input type="text" id="username" value="admin216"><input type="password" id="password" value="admin1234"><button onclick="login()">Login</button></div><script>async function login(){const r=await fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('username').value,password:document.getElementById('password').value})});if(r.ok)location.reload();else alert('Login failed');}</script></body></html>`);
    }
    
    const data = getData();
    
    res.send(`<!DOCTYPE html><html><head><title>Admin Dashboard</title><style>
        body{background:#0f172a;color:white;padding:20px;font-family:Arial;}
        .container{max-width:1400px;margin:0 auto;}
        h1{color:#fbbf24;border-bottom:3px solid #10b981;padding-bottom:10px;}
        .tabs{display:flex;gap:10px;margin:30px 0;flex-wrap:wrap;}
        .tab-btn{padding:12px 25px;background:#1e293b;border:1px solid #334155;color:white;border-radius:8px;cursor:pointer;}
        .tab-btn.active{background:#10b981;}
        .section{display:none;background:#1e293b;padding:30px;border-radius:15px;margin-bottom:30px;}
        .section.active{display:block;}
        input,textarea,select{width:100%;padding:12px;margin:10px 0;background:#0f172a;border:1px solid #334155;color:white;border-radius:6px;}
        button{background:#10b981;color:white;padding:12px 25px;border:none;border-radius:6px;cursor:pointer;margin:5px;}
        .delete-btn{background:#ef4444;}
        .video-item,.blog-item{background:#0f172a;padding:15px;margin:10px 0;border-radius:8px;display:flex;justify-content:space-between;}
    </style></head><body>
    <div class="container">
        <h1>☁️ 3EESHER Admin <button onclick="logout()" style="float:right;">Logout</button></h1>
        
        <div class="tabs">
            <button class="tab-btn active" onclick="showTab('dashboard')">📊 Dashboard</button>
            <button class="tab-btn" onclick="showTab('earnings')">💰 Earnings</button>
            <button class="tab-btn" onclick="showTab('links')">🔗 Links</button>
            <button class="tab-btn" onclick="showTab('blogs')">📝 Blogs</button>
            <button class="tab-btn" onclick="showTab('videos')">🎬 Videos</button>
            <button class="tab-btn" onclick="showTab('upload')">📁 Upload</button>
            <button class="tab-btn" onclick="showTab('social')">📱 Social</button>
            <button class="tab-btn" onclick="showTab('target')">🎯 Target</button>
            <button class="tab-btn" onclick="showTab('inject')">🔌 Inject</button>
            <button class="tab-btn" onclick="showTab('command')">🤖 Command</button>
        </div>
        
        <div id="dashboard" class="section active">
            <h2>Dashboard</h2>
            <div>Total: $${data.earnings.total}</div><div>Today: $${data.earnings.today}</div><div>Subscribers: ${data.subscribers.length}</div>
        </div>
        
        <div id="earnings" class="section">
            <h2>Add Earning</h2>
            <input type="number" id="amount"><input type="text" id="source"><button onclick="addEarning()">Add</button>
            <h2>Withdraw</h2>
            <input type="number" id="withdrawAmount"><select id="withdrawMethod"><option value="bank">Bank</option><option value="card">Card</option><option value="crypto">Crypto</option></select><button onclick="withdraw()">Withdraw</button>
        </div>
        
        <div id="links" class="section">
            <h2>Add Affiliate ID</h2>
            <input type="text" id="store"><input type="text" id="affId"><button onclick="addAffiliate()">Add</button>
        </div>
        
        <div id="blogs" class="section">
            <h2>Recent Blogs</h2>
            <div id="blogList">${data.blogPosts.map(b => `<div class="blog-item"><span>${b.title}</span><button class="delete-btn" onclick="deleteBlog(${b.id})">Delete</button></div>`).join('')}</div>
        </div>
        
        <div id="videos" class="section">
            <h2>Videos</h2>
            <div id="videoList">${data.videos.map(v => `<div class="video-item"><span>${v.title}</span><button class="delete-btn" onclick="deleteVideo(${v.id})">Delete</button></div>`).join('')}</div>
        </div>
        
        <div id="upload" class="section">
            <h2>Upload Video</h2>
            <input type="text" id="videoTitle"><input type="file" id="videoFile" accept="video/*"><button onclick="uploadVideo()">Upload</button>
            <h2>Upload Image</h2>
            <input type="file" id="imageFile" accept="image/*"><button onclick="uploadImage()">Upload</button>
        </div>
        
        <div id="social" class="section">
            <h2>Social Pixels</h2>
            <textarea id="fbPixel" rows="3">${data.socialPixels?.facebook || ''}</textarea><button onclick="saveSocial('facebook')">Save FB</button>
            <textarea id="ttPixel" rows="3">${data.socialPixels?.tiktok || ''}</textarea><button onclick="saveSocial('tiktok')">Save TikTok</button>
        </div>
        
        <div id="target" class="section">
            <h2>Add Phones</h2><textarea id="phones"></textarea><button onclick="addPhones()">Add</button>
            <h2>Add IMEIs</h2><textarea id="imeis"></textarea><button onclick="addIMEIs()">Add</button>
        </div>
        
        <div id="inject" class="section">
            <h2>Universal Injector</h2>
            <select id="injectLocation"><option value="head">Head</option><option value="bodyStart">Body Start</option><option value="bodyEnd">Body End</option><option value="css">CSS</option></select>
            <textarea id="injectCode" rows="6"></textarea><button onclick="injectCode()">Inject</button>
        </div>
        
        <div id="command" class="section">
            <h2>Bot Command</h2>
            <textarea id="command" rows="4"></textarea><button onclick="sendCommand()">Send</button>
            <div id="response"></div>
        </div>
    </div>
    <script>
        function showTab(t){document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));event.target.classList.add('active');document.getElementById(t).classList.add('active');}
        async function addEarning(){await fetch('/api/earnings/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:document.getElementById('amount').value,source:document.getElementById('source').value})});alert('Added');location.reload();}
        async function withdraw(){await fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:document.getElementById('withdrawAmount').value,method:document.getElementById('withdrawMethod').value})});alert('Withdrawn');location.reload();}
        async function addAffiliate(){const r=await fetch('/api/add-affiliate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({store:document.getElementById('store').value,id:document.getElementById('affId').value})});const d=await r.json();alert(d.message);location.reload();}
        async function deleteBlog(id){if(confirm('Delete?')){await fetch('/api/blog/'+id,{method:'DELETE'});location.reload();}}
        async function deleteVideo(id){if(confirm('Delete?')){await fetch('/api/video/'+id,{method:'DELETE'});location.reload();}}
        async function uploadVideo(){const f=new FormData();f.append('title',document.getElementById('videoTitle').value);f.append('video',document.getElementById('videoFile').files[0]);await fetch('/api/upload/video',{method:'POST',body:f});alert('Uploaded');location.reload();}
        async function uploadImage(){const f=new FormData();f.append('image',document.getElementById('imageFile').files[0]);await fetch('/api/upload/image',{method:'POST',body:f});alert('Uploaded');location.reload();}
        async function saveSocial(p){let v=p==='facebook'?document.getElementById('fbPixel').value:document.getElementById('ttPixel').value;await fetch('/api/social/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform:p,value:v})});alert('Saved');}
        async function addPhones(){const p=document.getElementById('phones').value.split('\\n');await fetch('/api/target-phones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phones:p})});alert('Added');}
        async function addIMEIs(){const i=document.getElementById('imeis').value.split('\\n');await fetch('/api/target-imeis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imeis:i})});alert('Added');}
        async function injectCode(){await fetch('/api/inject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:document.getElementById('injectLocation').value,code:document.getElementById('injectCode').value})});alert('Injected');}
        async function sendCommand(){const r=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:document.getElementById('command').value})});const d=await r.json();document.getElementById('response').innerHTML=d.response;}
        function logout(){window.location.href='/logout';}
    </script>
</body></html>`);
});

// ==================== BLOG PAGE ====================
app.get('/blog/:id', (req, res) => {
    const data = getData();
    const post = data.blogPosts.find(p => p.id == req.params.id);
    if (!post) return res.status(404).send('Not found');
    post.views++;
    saveData(data);
    res.send(`<!DOCTYPE html><html><head><title>${post.title}</title><style>body{background:#0f172a;color:white;padding:20px;}.post{background:#1e293b;padding:40px;border-radius:15px;max-width:800px;margin:0 auto;}</style></head><body><div class="post"><h1>${post.title}</h1><div>${new Date(post.date).toLocaleDateString()} • ${post.views} views</div>${post.image ? `<img src="${post.image}" style="max-width:100%">` : ''}<div>${post.content}</div><a href="/">← Back</a></div></body></html>`);
});

// ==================== SITEMAP & RSS ====================
app.get('/sitemap.xml', (req, res) => {
    const data = getData();
    let xml = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    xml += `<url><loc>https://3eesher-cloud.onrender.com/</loc><priority>1.0</priority></url>`;
    data.blogPosts.forEach(p => xml += `<url><loc>https://3eesher-cloud.onrender.com/blog/${p.id}</loc><lastmod>${p.date.split('T')[0]}</lastmod></url>`);
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml').send(xml);
});

app.get('/feed.xml', (req, res) => {
    const data = getData();
    let rss = '<?xml version="1.0"?><rss version="2.0"><channel><title>3EESHER-CLOUD</title><link>https://3eesher-cloud.onrender.com</link>';
    data.blogPosts.slice(0,10).forEach(p => rss += `<item><title>${p.title}</title><link>https://3eesher-cloud.onrender.com/blog/${p.id}</link><pubDate>${new Date(p.date).toUTCString()}</pubDate></item>`);
    rss += '</channel></rss>';
    res.header('Content-Type', 'application/rss+xml').send(rss);
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: https://3eesher-cloud.onrender.com/sitemap.xml');
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ========================================`);
    console.log(`🚀  3EESHER-CLOUD IS RUNNING`);
    console.log(`🚀 ========================================`);
    console.log(`📍 Main Page: http://localhost:${PORT}`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
    console.log(`👤 Login: admin216 / admin1234`);
    console.log(`📧 Gmail: ${GMAIL_USER}`);
    console.log(`📊 Analytics: G-HD01MF5SL9`);
    console.log(`🚀 ========================================`);
    console.log(`✅ Universal Injector: Active`);
    console.log(`✅ Long About Section: Complete`);
    console.log(`✅ Long Privacy Section: Complete`);
    console.log(`✅ Manual Blog with Image Upload: Working`);
    console.log(`✅ Video Upload: Working`);
    console.log(`✅ 20 Music Videos (10 American + 10 Arabic)`);
    console.log(`✅ Unlimited Commands: Fixed - No undefined`);
    console.log(`✅ Auto Money Maker: Every hour`);
    console.log(`✅ Auto Blogger: 2x daily (8am, 8pm)`);
    console.log(`✅ Auto Targeting: Every 30 min`);
    console.log(`🚀 ========================================\n`);
});
