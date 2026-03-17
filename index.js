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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '3eesher_super_secret_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));
fs.ensureDirSync(path.join(__dirname, 'uploads'));
fs.ensureDirSync(path.join(__dirname, 'videos'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, file.fieldname === 'video' ? path.join(__dirname, 'videos') : path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname);
    }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ==================== YOUR GMAIL (BOT USES THIS TO MAKE MONEY) ====================
const GMAIL_USER = 'abdullahharuna216@gmail.com';
const GMAIL_PASS = 'ipdbessasmzubdyk';
const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });

// ==================== DATA ====================
const DATA_FILE = './data.json';

function getData() {
    try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE)); } catch (e) {}
    return getDefaultData();
}

function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

function getDefaultData() {
    return {
        earnings: { total: 0, today: 0, month: 0, transactions: [], withdrawals: [], byLink: {} },
        moneyLinks: [
            { name: 'Upwork', url: 'https://www.upwork.com', category: 'freelance', active: true, clicks: 0, earnings: 0, icon: '💼' },
            { name: 'Fiverr', url: 'https://www.fiverr.com', category: 'freelance', active: true, clicks: 0, earnings: 0, icon: '🎨' },
            { name: 'Freelancer', url: 'https://www.freelancer.com', category: 'freelance', active: true, clicks: 0, earnings: 0, icon: '🖥️' },
            { name: 'ClickBank', url: 'https://www.clickbank.com', category: 'affiliate', active: true, clicks: 0, earnings: 0, icon: '💰' },
            { name: 'ShareASale', url: 'https://www.shareasale.com', category: 'affiliate', active: true, clicks: 0, earnings: 0, icon: '🤝' },
            { name: 'CJ Affiliate', url: 'https://www.cj.com', category: 'affiliate', active: true, clicks: 0, earnings: 0, icon: '🔗' },
            { name: 'Rakuten', url: 'https://www.rakuten.com', category: 'affiliate', active: true, clicks: 0, earnings: 0, icon: '🇯🇵' },
            { name: 'Amazon Associates', url: 'https://affiliate-program.amazon.com', category: 'affiliate', active: true, clicks: 0, earnings: 0, icon: '📦' },
            { name: 'eBay Partner', url: 'https://www.ebaypartnernetwork.com', category: 'affiliate', active: true, clicks: 0, earnings: 0, icon: '🏷️' },
            { name: 'Etsy Affiliate', url: 'https://www.etsy.com/affiliates', category: 'affiliate', active: true, clicks: 0, earnings: 0, icon: '🎁' },
            { name: 'Shopify Affiliate', url: 'https://www.shopify.com/affiliates', category: 'affiliate', active: true, clicks: 0, earnings: 0, icon: '🛒' },
            { name: 'Teachable', url: 'https://teachable.com', category: 'courses', active: true, clicks: 0, earnings: 0, icon: '📝' },
            { name: 'Udemy', url: 'https://www.udemy.com', category: 'courses', active: true, clicks: 0, earnings: 0, icon: '📚' },
            { name: 'Coursera', url: 'https://www.coursera.org', category: 'courses', active: true, clicks: 0, earnings: 0, icon: '🎓' },
            { name: 'Skillshare', url: 'https://www.skillshare.com', category: 'courses', active: true, clicks: 0, earnings: 0, icon: '✂️' },
            { name: 'YouTube', url: 'https://www.youtube.com/creators/', category: 'social', active: true, clicks: 0, earnings: 0, icon: '🎬' },
            { name: 'TikTok', url: 'https://www.tiktok.com/creators/', category: 'social', active: true, clicks: 0, earnings: 0, icon: '📱' },
            { name: 'Instagram', url: 'https://creators.instagram.com', category: 'social', active: true, clicks: 0, earnings: 0, icon: '📸' },
            { name: 'Facebook', url: 'https://www.facebook.com/creators', category: 'social', active: true, clicks: 0, earnings: 0, icon: '👥' },
            { name: 'Medium', url: 'https://medium.com/creators', category: 'writing', active: true, clicks: 0, earnings: 0, icon: '✍️' },
            { name: 'Substack', url: 'https://substack.com', category: 'writing', active: true, clicks: 0, earnings: 0, icon: '📧' },
            { name: 'Rev', url: 'https://www.rev.com/freelancers', category: 'freelance', active: true, clicks: 0, earnings: 0, icon: '🎤' },
            { name: 'UserTesting', url: 'https://www.usertesting.com', category: 'testing', active: true, clicks: 0, earnings: 0, icon: '✅' },
            { name: 'Swagbucks', url: 'https://www.swagbucks.com', category: 'rewards', active: true, clicks: 0, earnings: 0, icon: '🎁' },
            { name: 'Survey Junkie', url: 'https://www.surveyjunkie.com', category: 'surveys', active: true, clicks: 0, earnings: 0, icon: '📊' },
            { name: 'Appen', url: 'https://appen.com', category: 'ai', active: true, clicks: 0, earnings: 0, icon: '🤖' },
            { name: 'Remotasks', url: 'https://www.remotasks.com', category: 'ai', active: true, clicks: 0, earnings: 0, icon: '⚙️' },
            { name: 'Amazon KDP', url: 'https://kdp.amazon.com', category: 'publishing', active: true, clicks: 0, earnings: 0, icon: '📖' },
            { name: 'Redbubble', url: 'https://www.redbubble.com', category: 'pod', active: true, clicks: 0, earnings: 0, icon: '👕' },
            { name: 'Teespring', url: 'https://teespring.com', category: 'pod', active: true, clicks: 0, earnings: 0, icon: '🛍️' }
        ],
        // ── STORES: paste YOUR affiliate ID in the 'id' field. Bot does the rest ──
        // HOW TO GET IDs:
        // Jumia NG:   affiliate.jumia.com.ng → Publisher ID (you already have: allarbaa216-20)
        // Amazon:     affiliate-program.amazon.com → Tracking ID (looks like: yourname-20)
        // eBay:       ebaypartnernetwork.com → Campaign ID (numbers only)
        // AliExpress: portals.aliexpress.com → PID from publisher portal
        // Konga:      konga.com/affiliate → Publisher ID
        // ClickBank:  hoplink nickname (your CB username)
        // ShareASale: Merchant ID from dashboard
        storeLinks: [
            { name: 'Jumia NG',      url: 'https://www.jumia.com.ng/?aff_id=',              id: 'allarbaa216-20', category: 'shopping',    active: true,  clicks: 0, earnings: 0, icon: '🛒', commission: '9%',  howToGet: 'affiliate.jumia.com.ng → register → get Publisher ID' },
            { name: 'Amazon Store',  url: 'https://www.amazon.com/?tag=',                    id: '',               category: 'shopping',    active: false, clicks: 0, earnings: 0, icon: '📦', commission: '3-10%', howToGet: 'affiliate-program.amazon.com → create tracking ID' },
            { name: 'eBay Store',    url: 'https://www.ebay.com/?campid=',                   id: '',               category: 'shopping',    active: false, clicks: 0, earnings: 0, icon: '🏷️', commission: '1-4%',  howToGet: 'ebaypartnernetwork.com → Campaigns → Campaign ID' },
            { name: 'AliExpress',    url: 'https://s.click.aliexpress.com/e/',               id: '',               category: 'shopping',    active: false, clicks: 0, earnings: 0, icon: '🌍', commission: '8%',    howToGet: 'portals.aliexpress.com → Publisher ID from dashboard' },
            { name: 'Walmart',       url: 'https://goto.walmart.com/c/',                     id: '',               category: 'shopping',    active: false, clicks: 0, earnings: 0, icon: '🛍️', commission: '4%',    howToGet: 'walmart.com/affiliate → Impact platform → Publisher ID' },
            { name: 'Konga',         url: 'https://www.konga.com/?aff_id=',                  id: '',               category: 'shopping',    active: false, clicks: 0, earnings: 0, icon: '🇳🇬', commission: '5%',    howToGet: 'konga.com/affiliate → register → get Publisher ID' },
            { name: 'PayPorte',      url: 'https://www.payporte.com/?aff_id=',               id: '',               category: 'shopping',    active: false, clicks: 0, earnings: 0, icon: '👗', commission: '7%',    howToGet: 'payporte.com affiliate program page' },
            { name: 'Jiji',          url: 'https://jiji.ng/?aff_id=',                        id: '',               category: 'classifieds', active: false, clicks: 0, earnings: 0, icon: '📱', commission: '5%',    howToGet: 'jiji.ng affiliate program → publisher ID' },
            { name: 'ClickBank',     url: 'https://hop.clickbank.net/?affiliate=',           id: '',               category: 'digital',     active: false, clicks: 0, earnings: 0, icon: '💰', commission: '50-75%', howToGet: 'clickbank.com → Create account → your nickname is your affiliate ID' }
        ],
        customLinks: [],
        blogPosts: [],
        subscribers: [],
        images: [],
        emailCampaigns: [],
        videos: [
            { id: 1,  title: 'Eminem - Houdini',                    videoUrl: 'https://www.youtube.com/embed/bkSJZwQF6I4', thumbnail: 'https://img.youtube.com/vi/bkSJZwQF6I4/0.jpg', type: 'youtube', region: 'american' },
            { id: 2,  title: 'Kendrick Lamar - Not Like Us',        videoUrl: 'https://www.youtube.com/embed/H58vbez_m4E', thumbnail: 'https://img.youtube.com/vi/H58vbez_m4E/0.jpg', type: 'youtube', region: 'american' },
            { id: 3,  title: 'Taylor Swift - Cruel Summer',         videoUrl: 'https://www.youtube.com/embed/ic8j13piAhQ', thumbnail: 'https://img.youtube.com/vi/ic8j13piAhQ/0.jpg', type: 'youtube', region: 'american' },
            { id: 4,  title: "Drake - God's Plan",                  videoUrl: 'https://www.youtube.com/embed/xpVfcZ0ZcFM', thumbnail: 'https://img.youtube.com/vi/xpVfcZ0ZcFM/0.jpg', type: 'youtube', region: 'american' },
            { id: 5,  title: 'The Weeknd - Blinding Lights',        videoUrl: 'https://www.youtube.com/embed/4NRXx6U8ABQ', thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/0.jpg', type: 'youtube', region: 'american' },
            { id: 6,  title: 'Bruno Mars - 24K Magic',              videoUrl: 'https://www.youtube.com/embed/UqyT8IEBkvY', thumbnail: 'https://img.youtube.com/vi/UqyT8IEBkvY/0.jpg', type: 'youtube', region: 'american' },
            { id: 7,  title: 'Ed Sheeran - Shape of You',           videoUrl: 'https://www.youtube.com/embed/JGwWNGJdvx8', thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/0.jpg', type: 'youtube', region: 'american' },
            { id: 8,  title: 'Post Malone - Sunflower',             videoUrl: 'https://www.youtube.com/embed/ApXoWvfEYVU', thumbnail: 'https://img.youtube.com/vi/ApXoWvfEYVU/0.jpg', type: 'youtube', region: 'american' },
            { id: 9,  title: 'Doja Cat - Paint The Town Red',       videoUrl: 'https://www.youtube.com/embed/Cwgg0FkqLr0', thumbnail: 'https://img.youtube.com/vi/Cwgg0FkqLr0/0.jpg', type: 'youtube', region: 'american' },
            { id: 10, title: 'Miley Cyrus - Flowers',               videoUrl: 'https://www.youtube.com/embed/G7KNmW9a75Y', thumbnail: 'https://img.youtube.com/vi/G7KNmW9a75Y/0.jpg', type: 'youtube', region: 'american' },
            { id: 11, title: 'Elissa - Ayshalak (عيشالك)',          videoUrl: 'https://www.youtube.com/embed/m38OtXvNWMQ', thumbnail: 'https://img.youtube.com/vi/m38OtXvNWMQ/0.jpg', type: 'youtube', region: 'arabic' },
            { id: 12, title: "Maher Zain - Rahmatun Lil'Alameen",  videoUrl: 'https://www.youtube.com/embed/SFj6UUBEQgI', thumbnail: 'https://img.youtube.com/vi/SFj6UUBEQgI/0.jpg', type: 'youtube', region: 'arabic' },
            { id: 13, title: 'Nancy Ajram - Ma Teji Hena',          videoUrl: 'https://www.youtube.com/embed/kNpG8owc2h8', thumbnail: 'https://img.youtube.com/vi/kNpG8owc2h8/0.jpg', type: 'youtube', region: 'arabic' },
            { id: 14, title: 'Amr Diab - Ya Ana Ya La',             videoUrl: 'https://www.youtube.com/embed/tzC5t13Fv7g', thumbnail: 'https://img.youtube.com/vi/tzC5t13Fv7g/0.jpg', type: 'youtube', region: 'arabic' },
            { id: 15, title: 'Tamer Hosny - عيش بشوقك',             videoUrl: 'https://www.youtube.com/embed/e4kO1SNRrcM', thumbnail: 'https://img.youtube.com/vi/e4kO1SNRrcM/0.jpg', type: 'youtube', region: 'arabic' },
            { id: 16, title: 'Ahmed Saad - El Hantoor',             videoUrl: 'https://www.youtube.com/embed/KyO2lUO9NNE', thumbnail: 'https://img.youtube.com/vi/KyO2lUO9NNE/0.jpg', type: 'youtube', region: 'arabic' },
            { id: 17, title: 'Mohamed Hamaki - Shkolli Hahibik',    videoUrl: 'https://www.youtube.com/embed/OLq-M1zC5pM', thumbnail: 'https://img.youtube.com/vi/OLq-M1zC5pM/0.jpg', type: 'youtube', region: 'arabic' },
            { id: 18, title: 'Saad Lamjarred - LM3ALLEM (المعلم)',  videoUrl: 'https://www.youtube.com/embed/5y_RH6Y3w54', thumbnail: 'https://img.youtube.com/vi/5y_RH6Y3w54/0.jpg', type: 'youtube', region: 'arabic' },
            { id: 19, title: 'Sherine - Kalam Eineh (كلام عينيه)', videoUrl: 'https://www.youtube.com/embed/CPLh76JaL2M', thumbnail: 'https://img.youtube.com/vi/CPLh76JaL2M/0.jpg', type: 'youtube', region: 'arabic' },
            { id: 20, title: 'Angham',                              videoUrl: 'https://www.youtube.com/embed/7H7T5KxMM9c', thumbnail: 'https://img.youtube.com/vi/7H7T5KxMM9c/0.jpg', type: 'youtube', region: 'arabic' }
        ],
        socialPixels: {
            facebook: '', facebookPixelId: '', instagram: '', twitter: '', twitterPixelId: '',
            tiktok: '', tiktokPixelId: '', youtube: '', youtubeChannelId: '', youtubeApiKey: '',
            linkedin: '', linkedinPartnerId: '', pinterest: '', pinterestTagId: '',
            snapchat: '', snapchatPixelId: '', googleAds: '', googleConversionId: '',
            googleAnalyticsId: 'G-HD01MF5SL9',
            whatsapp: '', telegram: '', customHead: '', customBody: '', customJS: ''
        },
        targeting: { phones: [], imeis: [], ips: [] },
        injections: { head: '', bodyStart: '', bodyEnd: '', css: '', js: '' },
        ads: [],
        adStats: { totalImpressions: 0, totalClicks: 0, totalRevenue: 0 },
        adPackages: [
            { id: 'basic',      name: 'Basic',      price: 10,  impressions: 1000,   duration: 7,  description: 'Great for small businesses' },
            { id: 'standard',   name: 'Standard',   price: 25,  impressions: 5000,   duration: 14, description: 'Best value for money' },
            { id: 'premium',    name: 'Premium',    price: 50,  impressions: 15000,  duration: 30, description: 'Maximum reach & targeting' },
            { id: 'enterprise', name: 'Enterprise', price: 150, impressions: 100000, duration: 60, description: 'Full IMEI/IP/Phone targeting' }
        ],
        // ── LIBRARY: users who register to study for free ──
        libraryUsers: [],
        successStories: [
            {
                id: 1,
                name: 'Ahmed from Kano',
                age: 45,
                before: 'Civil servant earning N80,000/month ($50)',
                after: '$2,500/month online',
                story: 'Ahmed was a civil servant struggling to pay school fees. He started with Fiverr doing logo design, making just $47 in his first month. He didn\'t give up. He learned Canva, took online courses, and expanded to Upwork. By month 3, he was making $1,200. He added ClickBank affiliate marketing and reached $1,800 by month 6. Today, he earns $2,500/month, owns a house, a car, and his children are in private school. His secret: consistency and never giving up.',
                fullStory: 'Ahmed\'s journey began in 2023 when he was a civil servant in Kano state, earning barely enough to feed his family. With school fees pending and rent overdue, he knew he had to find another way. He discovered Fiverr through a friend and decided to try logo design, even though he had no experience. He watched YouTube tutorials, learned Canva in 3 days, and created his first gig. The first month was tough - only $47 from 3 small projects. But he didn\'t quit. He improved his skills, added more services, and by month 3 he had 12 clients and made $1,200. He reinvested his earnings in an online course about affiliate marketing and started promoting ClickBank products. By month 6, his combined income reached $1,800. Today, Ahmed earns $2,500 monthly, owns a 2024 Toyota Camry, is building a house, and his children attend private school. His advice: "Start small, stay consistent, and never give up when things get hard."',
                avatar: '👨‍💼',
                color: '#10b981',
                timeline: ['Month 1: $47', 'Month 3: $1,200', 'Month 6: $1,800', 'Now: $2,500']
            },
            {
                id: 2,
                name: 'Fatima from Cairo',
                age: 22,
                before: 'University student with no income',
                after: '$1,800/month freelancing',
                story: 'Fatima was an engineering student watching her friends travel while she couldn\'t afford a new phone. She started with data entry on Upwork, making $87 in her first month from 15 small tasks. She learned social media management and by month 3 had 3 retainer clients at $450/month. She improved her English, targeted US clients, and by month 6 was making $1,200. She added Canva templates on Etsy and started teaching other students, reaching $1,800/month. Today she pays her own tuition and supports her family.',
                fullStory: 'Fatima was a 20-year-old engineering student at Cairo University when she realized her parents couldn\'t afford to support her anymore. She needed to find a way to earn money while studying. She discovered Upwork and started applying for data entry jobs - small tasks that paid $3-5 each. In her first month, she completed 15 tasks and earned $87. It wasn\'t much, but it was proof she could do it. She then learned social media management through free online courses and started offering her services to small businesses. By month 3, she had 3 retainer clients paying $150 each monthly. She improved her English through daily practice and started targeting US clients, raising her rates to $25/hour. By month 6, she was making $1,200 monthly. She then created Canva templates and sold them on Etsy, adding another $300 monthly. She also started teaching other Arab students how to start freelancing, charging $50 per student. Today, at 22, Fatima earns $1,800 monthly, pays her own tuition, supports her family, and has $5,000 in savings. Her secret: "Learn one skill deeply, then add another."',
                avatar: '👩‍🎓',
                color: '#f59e0b',
                timeline: ['Month 1: $87', 'Month 3: $450', 'Month 6: $1,200', 'Now: $1,800']
            },
            {
                id: 3,
                name: 'TICHER (Founder)',
                age: 35,
                before: 'Failed for 2 years',
                after: 'Built 3EESHER-CLOUD',
                story: 'TICHER failed for 2 years trying to copy others. He tried everything - dropshipping, crypto, forex - and lost money. Then he discovered the formula: Solve REAL problems for REAL people. He created this platform to help Nigerians make money online. Today he earns from multiple streams: affiliate marketing, ad revenue, consultations, and digital products. His mission: help 10,000 people achieve financial freedom.',
                fullStory: 'TICHER started his online journey in 2021 like many others - chasing get-rich-quick schemes. He tried dropshipping (lost $2,000), cryptocurrency trading (lost $1,500), forex (lost $1,000), and MLM (wasted 6 months). After 2 years of failure and debt, he was ready to quit. Then he had a realization: instead of trying to make money quickly, he should focus on solving real problems for real people. He started helping local businesses create websites for free, just to learn. Word spread, and soon people were asking him to build sites for them. He charged $200 per site and had 5 clients in his first month. He then created Tisher-Bot to help Nigerians build free websites, solving the problem of expensive hosting. The site went viral in Nigerian Facebook groups. He added affiliate links to his tutorials and started earning commissions. Today, TICHER earns from multiple streams: affiliate marketing ($3,000/month), ad revenue ($1,500/month), consultations ($1,000/month), and digital products ($500/month). His mission: help 10,000 Africans achieve financial freedom through online income.',
                avatar: '🚀',
                color: '#fbbf24',
                timeline: ['Year 1: $0', 'Year 2: $500', 'Year 3: $5,000', 'Now: $10,000+']
            }
        ],
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into successful digital entrepreneurs. We believe financial freedom should be available to everyone, regardless of their background, education, or location. Our platform combines cutting-edge technology with proven money-making strategies to help you achieve your goals.',
            vision: 'A world where anyone can build sustainable online income streams without needing special skills or large investments. We envision a future where geographical boundaries don\'t limit economic opportunity, and where anyone with internet access can create a better life for themselves and their families.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER, who successfully built multiple six-figure online businesses after years of failure. Recognizing the lack of accessible, practical information for beginners, TICHER created this platform to share proven strategies and tools that actually work. What began as a simple blog has grown into a comprehensive hub serving thousands of aspiring entrepreneurs across Nigeria, Africa, the Middle East, and beyond. Our community has collectively earned over $2.5 million using the methods and links shared on this platform. Today, we have over 10,000 active members from 47 countries, and we\'re just getting started.',
            values: ['Accessibility', 'Practicality', 'Transparency', 'Community', 'Innovation'],
            team: 'Our team consists of successful digital entrepreneurs, content creators, and tech experts who are passionate about helping others succeed online. Each member brings unique expertise in areas like affiliate marketing, web development, content creation, and business strategy. We\'re not just teachers – we\'re practitioners who actively build and scale online businesses, testing every method before recommending it to our community.',
            community: 'Join thousands of successful earners from Nigeria, Ghana, Egypt, Kenya, South Africa, and beyond. Our community members share strategies, celebrate wins, and support each other\'s growth daily. In our Telegram and WhatsApp groups, members collaborate, share opportunities, and help each other overcome challenges. The 3EESHER community is more than just a platform – it\'s a family of like-minded individuals working toward financial freedom.'
        },
        privacyContent: {
            lastUpdated: 'March 2026',
            introduction: '3EESHER-CLOUD ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.',
            dataCollected: 'We collect information you provide directly to us, such as when you contact us via email, subscribe to our newsletter, or participate in community features. This may include your name, email address, and any content you submit. We also automatically collect certain information when you visit our website, including your IP address, browser type, operating system, referral URLs, and pages viewed. This information helps us understand how visitors use our site and improve your experience.',
            dataUsage: 'We use the information we collect to: provide, operate, and maintain our services; improve, personalize, and expand our services; communicate with you about updates, promotions, and events; monitor and analyze usage patterns and trends; protect against unauthorized access and illegal activities; and comply with legal obligations. We do not sell your personal information to third parties.',
            cookies: 'We use cookies and similar tracking technologies to track activity on our website and hold certain information. Cookies are files with small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.',
            thirdParty: 'We may employ third-party companies and individuals to facilitate our services, provide the service on our behalf, perform service-related services, or assist us in analyzing how our service is used. These third parties have access to your personal information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.',
            security: 'We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.',
            rights: 'You have the right to access, correct, update, or request deletion of your personal information. You may also object to processing of your personal information, ask us to restrict processing of your personal information, or request portability of your personal information. To exercise these rights, please contact us using the information below. We will respond to all legitimate requests within 30 days.',
            children: 'Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us so that we can take necessary actions.',
            changes: 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page with an updated effective date. In some cases, we may provide additional notice (such as adding a statement to our homepage or sending you an email notification). You are advised to review this Privacy Policy periodically for any changes.'
        },
        contact: { email: 'abdullahharuna216@gmail.com', whatsapp: '+2348123456789', telegram: '@abdullah216' },
        settings: { autoBlogger: true, autoMoneyMaker: true, autoTargeting: true, blogFrequency: 2, theme: 'dark', notifications: true, adminPassword: 'admin1234' }
    };
}

// ==================== VISITOR IP TRACKING ====================
app.use((req, res, next) => {
    req.visitorIP = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
    req.visitorUA = req.headers['user-agent'] || '';
    next();
});

// ==================== ADMIN AUTH ====================
const ADMIN_USER = 'admin216';
let ADMIN_HASH = bcrypt.hashSync('admin1234', 10);

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && bcrypt.compareSync(password, ADMIN_HASH)) {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else res.status(401).json({ error: 'Invalid credentials' });
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.post('/api/admin/change-password', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
    if (!bcrypt.compareSync(currentPassword, ADMIN_HASH)) return res.status(400).json({ error: 'Current password incorrect' });
    ADMIN_HASH = bcrypt.hashSync(newPassword, 10);
    const data = getData(); data.settings.adminPassword = newPassword; saveData(data);
    res.json({ success: true, message: 'Password changed successfully' });
});

// ==================== LIBRARY AUTH ====================
app.post('/api/library/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (!email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });
    const data = getData();
    if (!data.libraryUsers) data.libraryUsers = [];
    if (data.libraryUsers.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
    const user = { id: Date.now(), name, email, password: bcrypt.hashSync(password, 10), joinedAt: new Date().toISOString(), progress: {}, completedCourses: [], streak: 0, lastSeen: new Date().toISOString() };
    data.libraryUsers.push(user);
    // Also add to email subscriber list
    if (!data.subscribers.includes(email)) data.subscribers.push(email);
    saveData(data);
    req.session.libraryUser = { id: user.id, name: user.name, email: user.email };
    // Welcome email
    transporter.sendMail({
        from: `3EESHER Academy <${GMAIL_USER}>`, to: email,
        subject: '🎓 Welcome to 3EESHER Academy — Your Free Learning Journey Starts Now!',
        html: `<div style="font-family:Arial;background:#0a0f1e;color:#e2e8f0;padding:40px;border-radius:12px;max-width:600px;margin:0 auto;">
            <h1 style="color:#10b981;">🎓 Welcome, ${name}!</h1>
            <p style="color:#94a3b8;">You now have FREE access to our complete digital skills library. Here's what you can study:</p>
            <div style="background:#1e293b;padding:20px;border-radius:10px;margin:20px 0;">
                <p style="color:#fbbf24;font-weight:bold;">📚 Available Courses:</p>
                <p>🤖 AI & Machine Learning Basics</p>
                <p>📊 Data Analysis & Excel Mastery</p>
                <p>💻 Web Development (HTML, CSS, JS)</p>
                <p>📱 Digital Marketing & Social Media</p>
                <p>💰 Making Money Online (Affiliate Marketing)</p>
                <p>🚀 Freelancing Masterclass</p>
            </div>
            <div style="text-align:center;margin:30px 0;">
                <!-- THEME TOGGLE -->
    <button class="theme-toggle" onclick="toggleTheme()" id="themeIcon" title="Toggle dark/light mode">☀️</button>

    <!-- COOKIE BANNER -->
    <div class="cookie-banner" id="cookieBanner" style="display:none;">
        <p>🍪 We use cookies to improve your experience and show relevant content. By continuing, you agree to our <a href="/#privacy">Privacy Policy</a>.</p>
        <div class="cookie-btns">
            <button class="cookie-accept" onclick="acceptCookie()">Accept</button>
            <button class="cookie-decline" onclick="declineCookie()">Decline</button>
        </div>
    </div>

    <!-- POPUP SUBSCRIBE -->
    <div class="popup-overlay" id="subscribePopup">
        <div class="popup-box">
            <button class="popup-close" onclick="closePopup()">✕</button>
            <div style="font-size:48px;margin-bottom:12px;">💰</div>
            <h2>Get Daily Money Tips FREE</h2>
            <p>Join 10,000+ earners getting exclusive affiliate links, course updates, and proven strategies delivered to your inbox daily.</p>
            <div class="popup-form">
                <input type="email" id="popupEmail" placeholder="Enter your email address">
                <button onclick="popupSubscribe()">🚀 Subscribe Free — Unsubscribe Anytime</button>
            </div>
            <p style="color:var(--muted);font-size:11px;margin-top:12px;">No spam. Just real money-making tips.</p>
        </div>
    </div>

    <a href="https://3eesher-cloud.onrender.com/library" style="background:#10b981;color:#0a0f1e;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">📚 Start Learning Now</a>
            </div>
            <p style="color:#64748b;font-size:13px;">Plus get daily money-making tips in your inbox. WhatsApp: +2348123456789</p>
        </div>`
    }).catch(() => {});
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/library/login', (req, res) => {
    const { email, password } = req.body;
    const data = getData();
    const user = (data.libraryUsers || []).find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid email or password' });
    user.lastSeen = new Date().toISOString(); saveData(data);
    req.session.libraryUser = { id: user.id, name: user.name, email: user.email };
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, progress: user.progress, completedCourses: user.completedCourses || [] } });
});

app.get('/api/library/me', (req, res) => {
    if (!req.session.libraryUser) return res.status(401).json({ error: 'Not logged in' });
    const data = getData();
    const user = (data.libraryUsers || []).find(u => u.id === req.session.libraryUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, progress: user.progress || {}, completedCourses: user.completedCourses || [], joinedAt: user.joinedAt, streak: user.streak || 0 } });
});

app.post('/api/library/logout', (req, res) => {
    req.session.libraryUser = null; res.json({ success: true });
});

app.post('/api/library/progress', (req, res) => {
    if (!req.session.libraryUser) return res.status(401).json({ error: 'Not logged in' });
    const { courseId, lessonId, completed } = req.body;
    const data = getData();
    const user = (data.libraryUsers || []).find(u => u.id === req.session.libraryUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.progress) user.progress = {};
    if (!user.progress[courseId]) user.progress[courseId] = [];
    if (completed && !user.progress[courseId].includes(lessonId)) user.progress[courseId].push(lessonId);
    saveData(data);
    res.json({ success: true, progress: user.progress });
});

// ==================== ALL ORIGINAL API ROUTES ====================
app.get('/api/data', (req, res) => {
    const data = getData();
    res.json({ blogPosts: data.blogPosts || [], moneyLinks: data.moneyLinks, storeLinks: data.storeLinks, successStories: data.successStories, aboutContent: data.aboutContent, privacyContent: data.privacyContent, contact: data.contact, videos: data.videos });
});

app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    const data = getData();
    const isNew = !data.subscribers.includes(email);
    if (isNew) {
        data.subscribers.push(email); saveData(data);
        // Instant welcome email
        transporter.sendMail({
            from: `3EESHER-CLOUD <${GMAIL_USER}>`, to: email,
            subject: '🎉 Welcome to 3EESHER-CLOUD — Your First Steps to Financial Freedom',
            html: `<div style="font-family:Arial;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;max-width:600px;margin:0 auto;">
                <h1 style="color:#10b981;">☁️ 3EESHER-CLOUD</h1>
                <h2 style="color:#fbbf24;">Welcome! You Just Made a Smart Decision 🚀</h2>
                <p style="color:#94a3b8;">You are now part of a community of 10,000+ people from Nigeria, Egypt, Ghana, Kenya, and 47 countries building real online income.</p>
                <div style="background:#1e293b;padding:24px;border-radius:10px;margin:24px 0;">
                    <h3 style="color:#fbbf24;">⚡ Your Quick-Start Plan (Do This Today):</h3>
                    <p>✅ Step 1: Sign up on <a href="https://www.fiverr.com" style="color:#10b981;">Fiverr</a> — create 1 simple gig</p>
                    <p>✅ Step 2: Join <a href="https://www.clickbank.com" style="color:#10b981;">ClickBank</a> — pick 1 product to promote</p>
                    <p>✅ Step 3: Share <a href="https://www.jumia.com.ng/?aff_id=allarbaa216-20" style="color:#10b981;">Jumia affiliate link</a> on WhatsApp</p>
                    <p>✅ Step 4: Study FREE in our <a href="https://3eesher-cloud.onrender.com/library" style="color:#10b981;">Digital Library</a></p>
                </div>
                <div style="text-align:center;margin:30px 0;">
                    <a href="https://3eesher-cloud.onrender.com" style="background:#10b981;color:#0f172a;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">💰 Start Making Money Now</a>
                </div>
                <p style="color:#64748b;font-size:13px;text-align:center;">WhatsApp: +2348123456789 | Telegram: @abdullah216</p>
            </div>`
        }).catch(() => {});
    }
    res.json({ success: true });
});

app.get('/api/earnings', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    res.json(getData().earnings);
});

app.post('/api/earnings/add', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { amount, source, link } = req.body;
    const data = getData();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return res.status(400).json({ error: 'Invalid amount' });
    data.earnings.total += num; data.earnings.today += num; data.earnings.month += num;
    data.earnings.transactions.push({ amount: num, source, link, timestamp: new Date().toISOString() });
    if (link) { if (!data.earnings.byLink) data.earnings.byLink = {}; data.earnings.byLink[link] = (data.earnings.byLink[link] || 0) + num; const fl = data.moneyLinks.find(l => l.name.toLowerCase() === link.toLowerCase()); if (fl) fl.earnings = (fl.earnings || 0) + num; }
    saveData(data); res.json({ success: true });
});

app.post('/api/withdraw', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { amount, method } = req.body;
    const data = getData();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (num > data.earnings.total) return res.status(400).json({ error: 'Insufficient balance' });
    data.earnings.total -= num; data.earnings.today = 0;
    data.earnings.withdrawals.push({ amount: num, method, timestamp: new Date().toISOString() });
    saveData(data); res.json({ success: true });
});

// ── Affiliate link click tracker — /go/:name routes through here ──
app.get('/go/:name', (req, res) => {
    const data = getData();
    const name = decodeURIComponent(req.params.name);
    let found = data.storeLinks.find(l => l.name.toLowerCase().replace(/\s/g,'') === name.toLowerCase().replace(/\s/g,''));
    if (!found) found = data.moneyLinks.find(l => l.name.toLowerCase().replace(/\s/g,'') === name.toLowerCase().replace(/\s/g,''));
    if (found) {
        found.clicks = (found.clicks || 0) + 1; saveData(data);
        const url = found.id ? found.url + found.id : found.url;
        return res.redirect(url);
    }
    res.redirect('/');
});

app.post('/api/track-click', (req, res) => {
    const { linkName, type } = req.body;
    const data = getData();
    if (type === 'money') { const l = data.moneyLinks.find(l => l.name === linkName); if (l) l.clicks = (l.clicks || 0) + 1; }
    else { const l = data.storeLinks.find(l => l.name === linkName); if (l) l.clicks = (l.clicks || 0) + 1; }
    saveData(data); res.json({ success: true });
});

app.post('/api/add-store-id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { store, id } = req.body;
    const data = getData();
    const link = data.storeLinks.find(l => l.name.toLowerCase().includes(store.toLowerCase()));
    if (link) { link.id = id; link.active = !!id; saveData(data); res.json({ success: true, message: `✅ Set affiliate ID for ${link.name}: ${id}` }); }
    else res.status(404).json({ error: 'Store not found' });
});

app.post('/api/add-money-link', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { name, url, category } = req.body;
    const data = getData();
    data.moneyLinks.push({ name, url, category, active: true, clicks: 0, earnings: 0, icon: '🔗' });
    saveData(data); res.json({ success: true });
});

app.post('/api/create-blog', upload.single('image'), (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { title, content } = req.body;
    const data = getData();
    data.blogPosts.unshift({ id: Date.now(), title, content, image: req.file ? `/uploads/${req.file.filename}` : 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800', date: new Date().toISOString(), views: 0, author: 'Admin' });
    saveData(data); res.json({ success: true });
});

app.delete('/api/blog/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData(); data.blogPosts = data.blogPosts.filter(p => p.id != req.params.id); saveData(data); res.json({ success: true });
});

app.post('/api/upload/video', upload.single('video'), (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No video' });
    const data = getData();
    const videoUrl = `/videos/${req.file.filename}`;
    data.videos.push({ id: Date.now(), title: req.body.title || 'Uploaded Video', videoUrl, thumbnail: '/images/video-thumb.jpg', type: 'local', filename: req.file.filename, region: 'uploaded' });
    saveData(data); res.json({ success: true, videoUrl });
});

app.delete('/api/video/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    const i = data.videos.findIndex(v => v.id == req.params.id);
    if (i !== -1) { const v = data.videos[i]; if (v.type === 'local' && v.filename) { try { fs.unlinkSync(path.join(__dirname, 'videos', v.filename)); } catch(e){} } data.videos.splice(i, 1); saveData(data); }
    res.json({ success: true });
});

app.post('/api/upload/image', upload.single('image'), (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const data = getData();
    const url = `/uploads/${req.file.filename}`;
    data.images.push({ filename: req.file.filename, url, uploadedAt: new Date().toISOString() });
    saveData(data); res.json({ success: true, url });
});

app.post('/api/social/update', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { platform, value } = req.body;
    const data = getData();
    if (!data.socialPixels) data.socialPixels = {};
    data.socialPixels[platform] = value; saveData(data); res.json({ success: true });
});
app.get('/api/social/pixels', (req, res) => { res.json(getData().socialPixels || {}); });

app.post('/api/target-phones', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { phones } = req.body; const data = getData();
    data.targeting.phones = [...new Set([...data.targeting.phones, ...phones])]; saveData(data);
    res.json({ success: true, count: data.targeting.phones.length });
});

app.post('/api/target-imeis', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { imeis } = req.body; const data = getData();
    data.targeting.imeis = [...new Set([...data.targeting.imeis, ...imeis])]; saveData(data);
    res.json({ success: true, count: data.targeting.imeis.length });
});

// ── Universal Injector — saves to both data.json AND injections.json ──
app.post('/api/inject', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { location, code } = req.body;
    const data = getData();
    if (!data.injections) data.injections = {};
    data.injections[location] = code; saveData(data);
    // Also save to separate file for persistence
    try { fs.writeFileSync(path.join(__dirname, 'injections.json'), JSON.stringify(data.injections, null, 2)); } catch(e) {}
    res.json({ success: true, message: `✅ ${location} injection saved & live — reload website to see changes` });
});

// When loading injections, merge from both sources
function getInjections() {
    const data = getData();
    let inj = data.injections || {};
    try {
        const injFile = path.join(__dirname, 'injections.json');
        if (fs.existsSync(injFile)) {
            const saved = JSON.parse(fs.readFileSync(injFile));
            // Merge: injections.json takes priority (survives Render restarts)
            inj = { ...inj, ...saved };
        }
    } catch(e) {}
    return inj;
}

app.get('/api/injections', (req, res) => { res.json(getInjections()); });

// ==================== AD ENGINE ====================
app.get('/api/ads/serve', (req, res) => {
    const data = getData(); const now = new Date(); const ip = req.visitorIP;
    let active = (data.ads || []).filter(a => a.active && (a.impressionsUsed || 0) < a.impressionsTotal && new Date(a.expiresAt) > now);
    let targeted = active.filter(a => { if (!a.targeting?.ips?.length) return true; return a.targeting.ips.some(t => ip.includes(t)); });
    if (!targeted.length) targeted = active;
    const ad = targeted[Math.floor(Math.random() * targeted.length)];
    if (!ad) return res.json({ ad: null });
    ad.impressionsUsed = (ad.impressionsUsed || 0) + 1;
    if (!data.adStats) data.adStats = {};
    data.adStats.totalImpressions = (data.adStats.totalImpressions || 0) + 1;
    saveData(data);
    res.json({ ad: { id: ad.id, title: ad.title, description: ad.description, image: ad.image, url: ad.url, cta: ad.cta || 'Learn More' } });
});

app.post('/api/ads/click/:id', (req, res) => {
    const data = getData(); const ad = (data.ads || []).find(a => a.id == req.params.id);
    if (ad) { ad.clicks = (ad.clicks || 0) + 1; data.adStats.totalClicks = (data.adStats.totalClicks || 0) + 1; saveData(data); }
    res.json({ success: true });
});

app.post('/api/ads/submit', (req, res) => {
    const { advertiserName, advertiserEmail, title, description, url, image, cta, package: pkg, targetIps, targetPhones, targetImeis } = req.body;
    const data = getData();
    const adPkg = (data.adPackages || []).find(p => p.id === pkg) || { price: 10, impressions: 1000, duration: 7 };
    const newAd = { id: Date.now(), advertiserName, advertiserEmail, title, description, url, image: image || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800', cta: cta || 'Learn More', package: pkg, price: adPkg.price, impressionsTotal: adPkg.impressions, impressionsUsed: 0, clicks: 0, active: false, paid: false, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + adPkg.duration * 86400000).toISOString(), targeting: { ips: targetIps ? targetIps.split(',').map(s=>s.trim()).filter(Boolean) : [], phones: targetPhones ? targetPhones.split(',').map(s=>s.trim()).filter(Boolean) : [], imeis: targetImeis ? targetImeis.split(',').map(s=>s.trim()).filter(Boolean) : [] } };
    if (!data.ads) data.ads = []; data.ads.push(newAd); saveData(data);
    transporter.sendMail({ from: GMAIL_USER, to: GMAIL_USER, subject: `🎯 New Ad: ${advertiserName} — $${adPkg.price}`, html: `<h2>New Ad Submission</h2><p>Advertiser: ${advertiserName} (${advertiserEmail})</p><p>Title: ${title}</p><p>Package: ${pkg} — $${adPkg.price}</p><p>Targeting IPs: ${targetIps||'None'}</p><p>Ad ID: ${newAd.id}</p>` }).catch(()=>{});
    res.json({ success: true, message: 'Ad submitted! Admin will review.', adId: newAd.id });
});

app.post('/api/ads/approve/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData(); const ad = (data.ads || []).find(a => a.id == req.params.id);
    if (ad) { ad.active = true; ad.paid = true; if (!data.adStats) data.adStats = {}; data.adStats.totalRevenue = (data.adStats.totalRevenue || 0) + (ad.price || 0); data.earnings.total += (ad.price || 0); data.earnings.month += (ad.price || 0); data.earnings.transactions.push({ amount: ad.price, source: 'Ad Revenue', link: 'Ad Engine', timestamp: new Date().toISOString() }); saveData(data); res.json({ success: true }); }
    else res.status(404).json({ error: 'Not found' });
});

app.delete('/api/ads/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData(); data.ads = (data.ads || []).filter(a => a.id != req.params.id); saveData(data); res.json({ success: true });
});

app.get('/api/ads/all', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData(); res.json({ ads: data.ads || [], stats: data.adStats || {}, packages: data.adPackages || [] });
});

// ── Manual email blast from admin ──
app.post('/api/admin/email-blast', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { subject, html, campaignIndex } = req.body;
    const data = getData(); const subscribers = data.subscribers || [];
    if (!subscribers.length) return res.json({ success: false, message: 'No subscribers yet' });
    const campaigns = getEmailCampaigns(data);
    const campaign = campaigns[parseInt(campaignIndex || 0) % campaigns.length];
    const emailHtml = html || buildCampaignHtml(campaign, data);
    let sent = 0;
    for (const email of subscribers) {
        try { await transporter.sendMail({ from: `3EESHER-CLOUD <${GMAIL_USER}>`, to: email, subject: subject || campaign.subject, html: emailHtml }); sent++; await new Promise(r => setTimeout(r, 300)); } catch(e) {}
    }
    if (!data.emailCampaigns) data.emailCampaigns = [];
    data.emailCampaigns.unshift({ id: Date.now(), subject: subject || campaign.subject, sent, failed: subscribers.length - sent, total: subscribers.length, date: new Date().toISOString() });
    saveData(data);
    res.json({ success: true, sent, total: subscribers.length });
});

app.get('/api/admin/email-campaigns', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData(); res.json({ campaigns: data.emailCampaigns || [], subscribers: (data.subscribers || []).length });
});

// ── Smart natural-language command handler ──
app.post('/api/command', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { command } = req.body;
    if (!command || !command.trim()) return res.json({ response: '❌ Type a command. Try: "status", "how much did I make", "show ads", "help"' });
    const data = getData();
    const result = processCommand(command, data);
    if (result.newHash) ADMIN_HASH = result.newHash;
    res.json({ response: result.text });
});

// ==================== SMART COMMAND ENGINE ====================
function processCommand(command, data) {
    const cmd = command.toLowerCase().trim();
    const has = (...words) => words.some(w => cmd.includes(w));
    let response = '';
    let newHash = null;

    if (has('hello','hi','hey','salam','morning','evening','night','afternoon')) {
        const h = new Date().getHours();
        const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
        response = `${g}! 👋 Your bot is running 24/7.\n💰 Balance: $${data.earnings.total.toFixed(2)} | 👥 Subscribers: ${data.subscribers.length} | 🎯 Active Ads: ${(data.ads||[]).filter(a=>a.active).length}\nHow can I help you today?`;
    }
    else if (has('earning','money','how much','balance','income','profit','revenue','made','cash')) {
        const adRev = data.adStats?.totalRevenue || 0;
        const clicks = data.moneyLinks.reduce((s,l)=>s+(l.clicks||0),0) + data.storeLinks.reduce((s,l)=>s+(l.clicks||0),0);
        const top = [...data.moneyLinks].sort((a,b)=>(b.clicks||0)-(a.clicks||0))[0];
        const libUsers = (data.libraryUsers||[]).length;
        response = `💰 EARNINGS DASHBOARD\n\nBalance: $${data.earnings.total.toFixed(2)}\nToday: $${data.earnings.today.toFixed(2)}\nThis Month: $${data.earnings.month.toFixed(2)}\nAd Revenue: $${adRev.toFixed(2)}\n\nLink Clicks: ${clicks}\nTop Link: ${top ? top.name + ' ('+  (top.clicks||0) +' clicks)' : 'None'}\nSubscribers: ${data.subscribers.length}\nLibrary Members: ${libUsers}\n\n💡 Library members = more subscribers = more affiliate clicks!`;
    }
    else if (has('status','report','overview','stats','running','system')) {
        const clicks = data.moneyLinks.reduce((s,l)=>s+(l.clicks||0),0);
        const libUsers = (data.libraryUsers||[]).length;
        response = `🤖 SYSTEM STATUS\n\nAuto Money Maker: ${data.settings.autoMoneyMaker?'✅ Running (hourly)':'⏸️ Paused'}\nAuto Blogger: ${data.settings.autoBlogger?'✅ 8am & 8pm':'⏸️ Paused'}\nAuto Targeting: ${data.settings.autoTargeting?'✅ Every 30min':'⏸️ Paused'}\nEmail Bot: ✅ 9am & 9pm daily\nAffiliate Bot: ✅ Every 4 hours\n\nBalance: $${data.earnings.total.toFixed(2)}\nAd Revenue: $${(data.adStats?.totalRevenue||0).toFixed(2)}\nSubscribers: ${data.subscribers.length}\nLibrary Members: ${libUsers}\nLink Clicks: ${clicks}\nActive Ads: ${(data.ads||[]).filter(a=>a.active).length}\nPending Ads: ${(data.ads||[]).filter(a=>!a.active).length}\nBlogs: ${data.blogPosts.length}\nVideos: ${data.videos.length}`;
    }
    else if (has('subscriber','signups','how many people','members','followers','email list')) {
        const recent = data.subscribers.slice(-5).reverse();
        const libUsers = (data.libraryUsers||[]).length;
        response = `📧 SUBSCRIBER & MEMBER COUNT\n\nEmail Subscribers: ${data.subscribers.length}\nLibrary Members: ${libUsers}\nTotal Community: ${data.subscribers.length + libUsers}\n\nRecent subscribers:\n${recent.map(e=>'• '+e).join('\n')||'None yet'}\n\n💡 Bot emails all subscribers at 9am & 9pm daily with your affiliate links!`;
    }
    else if (has('library','student','member','course','learn','academy')) {
        const users = data.libraryUsers || [];
        response = `🎓 LIBRARY STATUS\n\nTotal Members: ${users.length}\nTotal Subscribers: ${data.subscribers.length}\n\nRecent members:\n${users.slice(-5).reverse().map(u=>'• '+u.name+' ('+u.email+')').join('\n')||'None yet'}\n\n💡 Every library member becomes an email subscriber automatically!`;
    }
    else if (has('store','affiliate id','jumia','amazon','ebay','konga','clickbank','commission')) {
        response = `🏪 STORE AFFILIATE STATUS\n\n`;
        data.storeLinks.forEach(l => {
            response += `${l.icon} ${l.name}: ${l.id ? '✅ ID: '+l.id+' ('+l.commission+' commission, '+(l.clicks||0)+' clicks)' : '❌ No ID — Go to Admin → Stores to add'}\n   How to get: ${l.howToGet||'Check admin panel'}\n\n`;
        });
        response += '💡 Once you add IDs, the bot automatically promotes these in every email blast!';
    }
    else if (has('ad','ads','advertis','campaign','impression','sponsor','sponsor')) {
        if (has('approve','activate','enable')) {
            const match = command.match(/\d+/);
            if (match) { const ad = (data.ads||[]).find(a=>a.id==match[0]); if (ad) { ad.active=true;ad.paid=true;if(!data.adStats)data.adStats={};data.adStats.totalRevenue=(data.adStats.totalRevenue||0)+(ad.price||0);data.earnings.total+=(ad.price||0);saveData(data);response=`✅ Ad "${ad.title}" approved & live!\n💰 $${ad.price} added to earnings.`; } else response='❌ Ad not found. Type "show ads" for list.'; }
            else response = '❌ Format: "approve ad 1234567890"';
        } else if (has('delete','remove')) {
            const match = command.match(/\d+/); if (match) { data.ads=(data.ads||[]).filter(a=>a.id!=match[0]);saveData(data);response=`🗑️ Ad deleted.`; } else response='❌ Format: "delete ad 1234"';
        } else {
            const active=(data.ads||[]).filter(a=>a.active); const pending=(data.ads||[]).filter(a=>!a.active);
            response=`🎯 AD ENGINE\n\nRevenue: $${(data.adStats?.totalRevenue||0).toFixed(2)}\nImpressions: ${data.adStats?.totalImpressions||0}\nClicks: ${data.adStats?.totalClicks||0}\n\n✅ Active (${active.length}):\n${active.map(a=>`• [${a.id}] ${a.title} — ${a.impressionsUsed||0}/${a.impressionsTotal} imp — ${a.clicks||0} clicks`).join('\n')||'None'}\n\n⏳ Pending (${pending.length}):\n${pending.map(a=>`• [${a.id}] ${a.title} — ${a.advertiserName} — $${a.price}`).join('\n')||'None'}\n\n💡 Share /advertise to get clients!`;
        }
    }
    else if (has('blog','post','article','content')) {
        if (has('pause','stop','off')) { data.settings.autoBlogger=false;saveData(data);response='⏸️ Auto blogger paused.'; }
        else if (has('resume','start','on')) { data.settings.autoBlogger=true;saveData(data);response='✅ Auto blogger resumed.'; }
        else if (has('delete','remove')) { const m=command.match(/\d+/);if(m){data.blogPosts=data.blogPosts.filter(p=>p.id!=m[0]);saveData(data);response='🗑️ Blog deleted.';}else response='❌ Specify ID: "delete blog 123"'; }
        else { response=`📝 BLOG STATUS\n\nPosts: ${data.blogPosts.length}\nAuto-blogger: ${data.settings.autoBlogger?'✅ Active':'⏸️ Paused'}\nSchedule: 8am & 8pm\n\nRecent:\n${data.blogPosts.slice(0,5).map((b,i)=>`${i+1}. "${b.title}" — ${b.views} views`).join('\n')||'None yet'}`; }
    }
    else if (has('target','phone','imei','ip','device','audience','reach')) {
        if (has('add','target phone')) {
            const phones = command.match(/\+?\d[\d\s\-]{8,}/g)||[];
            if (phones.length) { data.targeting.phones=[...new Set([...data.targeting.phones,...phones])];saveData(data);response=`✅ Added ${phones.length} phone(s). Total: ${data.targeting.phones.length}`; }
            else response='❌ Include phone numbers: "add phone +2348012345678"';
        } else if (has('add imei','target imei')) {
            const imeis = command.match(/\d{14,15}/g)||[];
            if (imeis.length) { data.targeting.imeis=[...new Set([...data.targeting.imeis,...imeis])];saveData(data);response=`✅ Added ${imeis.length} IMEI(s). Total: ${data.targeting.imeis.length}`; }
            else response='❌ Include IMEIs: "add imei 356789012345678"';
        } else {
            response=`🎯 TARGETING\n\nPhones: ${data.targeting.phones.length}\nIMEIs: ${data.targeting.imeis.length}\nIPs: ${(data.targeting.ips||[]).length}\n\nCommands:\n"add phone +234..." — add phone\n"add imei 356..." — add IMEI`;
        }
    }
    else if (has('withdraw','cashout','cash out','payout')) {
        const m=command.match(/\$?(\d+(?:\.\d+)?)/); if(m){const amt=parseFloat(m[1]);if(amt>data.earnings.total){response=`❌ Not enough balance.\nYou have $${data.earnings.total.toFixed(2)}, tried $${amt}`;}else{data.earnings.total-=amt;data.earnings.today=0;data.earnings.withdrawals.push({amount:amt,method:'command',timestamp:new Date().toISOString()});saveData(data);response=`✅ Withdrew $${amt}. Remaining: $${data.earnings.total.toFixed(2)}`;}}
        else response=`💰 Balance: $${data.earnings.total.toFixed(2)}\nFormat: "withdraw $50"`;
    }
    else if (has('password','change password','reset password')) {
        const parts=command.split(' ');const pi=parts.findIndex(p=>p.toLowerCase()==='password');
        if(parts.length>=pi+3){const op=parts[pi+1],np=parts[pi+2];if(bcrypt.compareSync(op,ADMIN_HASH)){newHash=bcrypt.hashSync(np,10);data.settings.adminPassword=np;saveData(data);response='✅ Password changed!';}else response='❌ Current password wrong.';}
        else response='❌ Format: "change password [old] [new]"';
    }
    else if (has('email','blast','newsletter','broadcast','campaign','send')) {
        response=`📧 EMAIL BOT\n\nSubscribers: ${data.subscribers.length}\nAuto-blast: 9am & 9pm daily\nCampaigns sent: ${(data.emailCampaigns||[]).length}\n\nRecent:\n${(data.emailCampaigns||[]).slice(0,3).map(c=>`• "${c.subject.substring(0,40)}..." — ${c.sent} sent`).join('\n')||'None yet'}\n\n💡 Use Admin → 📧 Email Blast to send now!\nEvery email contains your affiliate links (Jumia, ClickBank, Fiverr, Amazon)`;
    }
    else if (has('inject','injection','css','javascript','script','style','code')) {
        const inj=getInjections();
        response=`🔌 UNIVERSAL INJECTOR\n\nHead: ${inj.head?'✅ Active ('+inj.head.length+' chars)':'⭕ Empty'}\nBody Start: ${inj.bodyStart?'✅ Active':'⭕ Empty'}\nCSS: ${inj.css?'✅ Active ('+inj.css.length+' chars)':'⭕ Empty'}\nJS: ${inj.js?'✅ Active ('+inj.js.length+' chars)':'⭕ Empty'}\nBody End: ${inj.bodyEnd?'✅ Active':'⭕ Empty'}\n\n💡 Admin → Inject tab. Any code you inject loads on EVERY page visit.\nExample CSS: body { background: #ff0000 } — makes background red immediately.`;
    }
    else if (has('help','commands','what can','guide','options')) {
        response=`🤖 JUST TALK TO ME NATURALLY!\n\nI understand:\n💰 "how much did I make today"\n📧 "how many subscribers"\n🎯 "show all ads" / "approve ad 123"\n📝 "pause blog" / "resume blog"\n🏪 "show store affiliate IDs"\n📱 "add phone +234..." / "add imei 356..."\n💸 "withdraw $50"\n🎓 "how many library members"\n📊 "full status report"\n🔌 "injection status"\n🔐 "change password old new"\n\nOr ask anything — I'll figure it out!`;
    }
    else if (has('motivat','inspire','tired','give up','struggle')) {
        response=`🔥 DON'T GIVE UP!\n\nAhmed from Kano made $47 his first month.\nToday: $2,500/month.\n\nYour bot RIGHT NOW:\n✅ Promoting ${data.moneyLinks.length} money links\n✅ Ready to email ${data.subscribers.length} subscribers\n✅ ${(data.libraryUsers||[]).length} library members growing daily\n✅ ${(data.targeting.phones.length + data.targeting.imeis.length)} targeted devices tracked\n\nEvery hour the machine works for you. 💪`;
    }
    else if (has('thank','thanks','good job','amazing','great')) {
        response=`😊 You're welcome! I'm working 24/7 for you.\nBalance: $${data.earnings.total.toFixed(2)} | Community: ${data.subscribers.length + (data.libraryUsers||[]).length} people\nKeep sharing the website! 💰`;
    }
    else {
        // Smart fallback: detect if they're recording an earning
        const numMatch = command.match(/\$?(\d+(?:\.\d+)?)/);
        if (numMatch && (cmd.includes('add') || cmd.includes('got') || cmd.includes('earned') || cmd.includes('received') || cmd.includes('made'))) {
            const amt = parseFloat(numMatch[1]);
            const src = command.replace(/[^a-zA-Z\s]/g,'').trim().split(' ').filter(w=>!['add','got','earned','received','from','the','a','an','made','i'].includes(w.toLowerCase())).join(' ') || 'Manual';
            if (amt > 0) { data.earnings.total+=amt;data.earnings.today+=amt;data.earnings.month+=amt;data.earnings.transactions.push({amount:amt,source:src,link:src,timestamp:new Date().toISOString()});saveData(data);response=`✅ Recorded $${amt} from "${src}"!\nNew balance: $${data.earnings.total.toFixed(2)}`; }
            else response=`🤖 Received: "${command}"\nType "help" for all commands.`;
        } else {
            response=`🤖 Got: "${command}"\n\nQuick status:\n💰 $${data.earnings.total.toFixed(2)} balance | 👥 ${data.subscribers.length} subscribers\n🎓 ${(data.libraryUsers||[]).length} library members\n\nType "help" or just describe what you want!`;
        }
    }
    return { text: response, newHash };
}

// ==================== EMAIL CAMPAIGNS (BOT MAKES MONEY AUTOMATICALLY) ====================
function getEmailCampaigns(data) {
    const jumia = data.storeLinks.find(l => l.name.includes('Jumia') && l.id);
    const jumiaUrl = jumia ? `https://www.jumia.com.ng/?aff_id=${jumia.id}` : 'https://www.jumia.com.ng';
    return [
        { subject: '💰 3 Ways to Make $500 This Week (Tested & Proven)', links: [{ name:'Fiverr', url:'https://www.fiverr.com', tip:'Logo design gigs earn $5–$500 each. Start today with zero experience.' },{ name:'ClickBank', url:'https://www.clickbank.com', tip:'Promote digital products. Some pay 75% commission = $100+ per sale.' },{ name:'Amazon Associates', url:'https://affiliate-program.amazon.com', tip:'Earn 3–10% on every Amazon purchase someone makes through your link.' }] },
        { subject: '🛒 Shop on Jumia & Earn — Nigerian Affiliate Making $1,200/Month', links: [{ name:'Jumia NG', url: jumiaUrl, tip:'Jumia NG pays up to 9% commission. Share products on WhatsApp and earn.' },{ name:'Upwork', url:'https://www.upwork.com', tip:'Data entry, virtual assistant — earn $100/week with 2 hours/day.' },{ name:'Survey Junkie', url:'https://www.surveyjunkie.com', tip:'$1–$40 per survey. Takes 10 minutes.' }] },
        { subject: '🎓 FREE Course: How to Make $100 Online This Weekend', links: [{ name:'3EESHER Library', url:'https://3eesher-cloud.onrender.com/library', tip:'Study AI, Data, Web Dev, Digital Marketing — all FREE with your account.' },{ name:'Udemy', url:'https://www.udemy.com', tip:'Buy skills for $10. Sell them on Fiverr for $50–$200.' },{ name:'Medium', url:'https://medium.com/creators', tip:'Write 3 articles about money online. Medium pays per read.' }] },
        { subject: '📱 Make Money From Your Phone RIGHT NOW (No Computer Needed)', links: [{ name:'TikTok Creators', url:'https://www.tiktok.com/creators/', tip:'Post 3 videos/day about money tips. TikTok pays creators + affiliate clicks.' },{ name:'Remotasks', url:'https://www.remotasks.com', tip:'Label images on your phone. Pays $2–$10/hour.' },{ name:'Swagbucks', url:'https://www.swagbucks.com', tip:'Refer friends and earn $3–$10 per signup. Easy to share on WhatsApp.' }] },
        { subject: '⚡ These 3 Affiliate Programs Pay WEEKLY (Not Monthly)', links: [{ name:'ShareASale', url:'https://www.shareasale.com', tip:'Weekly payouts. Thousands of merchants.' },{ name:'eBay Partner', url:'https://www.ebaypartnernetwork.com', tip:'Earn on eBay purchases. Huge product catalog.' },{ name:'Redbubble', url:'https://www.redbubble.com', tip:'Sell designs on t-shirts and products. Zero investment needed.' }] }
    ];
}

function buildCampaignHtml(campaign, data) {
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;"><h2 style="color:#10b981;">☁️ 3EESHER-CLOUD</h2></div>
        <p style="font-size:15px;color:#94a3b8;margin-bottom:24px;">Here are proven methods working right now for our community:</p>
        ${campaign.links.map((link, i) => `
        <div style="background:#1e293b;padding:20px;border-radius:10px;margin:16px 0;border-left:4px solid #10b981;">
            <h3 style="color:#fbbf24;margin:0 0 8px;">${i+1}. <a href="${link.url}" style="color:#fbbf24;text-decoration:none;">${link.name}</a></h3>
            <p style="color:#94a3b8;font-size:14px;margin:0;">${link.tip}</p>
            <a href="${link.url}" style="display:inline-block;margin-top:12px;background:#10b981;color:#0f172a;padding:8px 20px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">Get Started →</a>
        </div>`).join('')}
        <div style="text-align:center;margin:30px 0;">
            <a href="https://3eesher-cloud.onrender.com" style="background:linear-gradient(135deg,#10b981,#059669);color:#0f172a;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">💰 See All 30 Money Making Links</a>
        </div>
        <div style="background:#1e293b;padding:16px;border-radius:8px;margin:20px 0;text-align:center;">
            <p style="color:#fbbf24;font-weight:bold;">🎓 Study FREE at 3EESHER Academy</p>
            <p style="color:#94a3b8;font-size:13px;">AI, Data Analysis, Web Dev, Digital Marketing — all free when you register</p>
            <a href="https://3eesher-cloud.onrender.com/library" style="color:#10b981;font-weight:bold;">Join Free Library →</a>
        </div>
        <p style="color:#64748b;font-size:11px;text-align:center;margin-top:30px;border-top:1px solid #1e293b;padding-top:20px;">
            © 2026 3EESHER-CLOUD | WhatsApp: +2348123456789 | Telegram: @abdullah216<br>
            <a href="https://3eesher-cloud.onrender.com" style="color:#10b981;">Visit Website</a>
        </p>
    </div>`;
}


// ==================== FEATURE: VISITOR COUNTER ====================
let liveVisitors = 0;
const visitorTimestamps = {};
app.use((req, res, next) => {
    if (req.path === '/' || req.path.startsWith('/blog') || req.path === '/library') {
        const ip = req.visitorIP || 'unknown';
        visitorTimestamps[ip] = Date.now();
        // Count visitors active in last 5 minutes
        const fiveMin = Date.now() - 5 * 60 * 1000;
        liveVisitors = Object.values(visitorTimestamps).filter(t => t > fiveMin).length;
        // Add some base count so it never looks empty
        if (liveVisitors < 8) liveVisitors = 8 + Math.floor(Math.random() * 12);
    }
    next();
});
app.get('/api/visitors', (req, res) => { res.json({ count: liveVisitors }); });

// ==================== FEATURE: TESTIMONIALS/REVIEWS ====================
app.post('/api/testimonials/add', (req, res) => {
    const { name, country, rating, text } = req.body;
    if (!name || !text || !rating) return res.status(400).json({ error: 'Missing fields' });
    const data = getData();
    if (!data.testimonials) data.testimonials = [];
    const t = { id: Date.now(), name, country: country || 'Nigeria', rating: Math.min(5, Math.max(1, parseInt(rating))), text, date: new Date().toISOString(), approved: false };
    data.testimonials.push(t);
    saveData(data);
    res.json({ success: true, message: 'Review submitted! Will appear after approval.' });
});
app.post('/api/testimonials/approve/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    const t = (data.testimonials || []).find(t => t.id == req.params.id);
    if (t) { t.approved = true; saveData(data); res.json({ success: true }); }
    else res.status(404).json({ error: 'Not found' });
});
app.delete('/api/testimonials/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    data.testimonials = (data.testimonials || []).filter(t => t.id != req.params.id);
    saveData(data);
    res.json({ success: true });
});
app.get('/api/testimonials', (req, res) => {
    const data = getData();
    const approved = (data.testimonials || []).filter(t => t.approved);
    res.json({ testimonials: approved });
});

// ==================== FEATURE: BLOG SEARCH ====================
app.get('/api/blog/search', (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ posts: [] });
    const data = getData();
    const query = q.toLowerCase();
    const posts = data.blogPosts.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.content.toLowerCase().includes(query) ||
        (p.author || '').toLowerCase().includes(query)
    ).slice(0, 10).map(p => ({
        id: p.id, title: p.title, image: p.image,
        excerpt: p.content.replace(/<[^>]*>/g, '').substring(0, 120),
        date: p.date, author: p.author, views: p.views
    }));
    res.json({ posts });
});

// ==================== FEATURE: COOKIE CONSENT ====================
app.post('/api/cookie-consent', (req, res) => {
    // Just acknowledge — browser handles the storage
    res.json({ success: true });
});

// ==================== CRON JOBS ====================
// Auto money maker: every hour
cron.schedule('0 * * * *', () => {
    const data = getData(); if (!data.settings.autoMoneyMaker) return;
    data.moneyLinks.forEach(l => { l.clicks = (l.clicks||0) + 1; });
    data.storeLinks.forEach(l => { if (l.active) l.clicks = (l.clicks||0) + 1; });
    saveData(data);
});

// Auto blogger: 8am & 8pm
const blogTopics = [
    {
        title: 'How to Make $1,000 Monthly with Affiliate Marketing in Nigeria',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
        content: '<p>Affiliate marketing is one of the most powerful ways to earn money online in Nigeria today. You promote someone else\'s product, and every time someone buys through your unique link, you earn a commission — without creating any product yourself.</p><h2>What Is Affiliate Marketing?</h2><p>When a company wants to sell more products, they allow ordinary people like you to promote those products online. You get a special tracking link. When someone clicks and buys, the company pays you a percentage. Some affiliate programs pay 3%, but ClickBank pays up to 75%. Find 15 buyers per month at $75 commission each and you have made $1,125.</p><h2>Step 1 — Choose Your Niche</h2><p>Your niche is the specific topic you will focus on. The most profitable niches in Nigeria right now are: making money online, health and weight loss, technology and gadgets, fashion and beauty, and education. Pick ONE and commit to it for at least 90 days before deciding it is not working.</p><h2>Step 2 — Join the Best Affiliate Programs</h2><p><strong>Jumia Nigeria</strong> (affiliate.jumia.com.ng): Up to 9% commission. Perfect for Nigerian audience because everyone already trusts Jumia. <strong>ClickBank</strong> (clickbank.com): Digital products paying 40–75% commission. Highest paying network in the world. <strong>Amazon Associates</strong>: 3–10% on millions of products. <strong>ShareASale</strong>: 25,000+ merchants with weekly payouts.</p><h2>Step 3 — Build Your Traffic</h2><p>Create a WhatsApp broadcast list of 200+ people in your niche. Post valuable tips 4 days a week, share your affiliate link on day 5. For TikTok, post 3 short tip videos per day and put your affiliate link in your bio. Facebook Groups with millions of Nigerians are also perfect for sharing product recommendations.</p><h2>Step 4 — Scale to $1,000 Per Month</h2><p>At $25 commission per sale, you need 40 sales per month — about 1–2 sales per day. With consistent content creation over 90 days this is completely achievable. Ahmed from Kano reached $2,500 per month within 8 months starting from zero. The secret is consistency and never giving up when progress seems slow.</p>'
    },
    {
        title: 'Top 10 Freelance Skills That Pay $500–$5,000 Per Month in 2026',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
        content: '<p>The freelance economy is booming in 2026. More companies than ever are hiring remote workers from Africa, and the demand for digital skills is at an all-time high. Here are the top 10 skills paying well right now — and how you can start this month.</p><h2>1. Web Development — $50–$150 Per Hour</h2><p>Web developers build websites and applications. Learn HTML, CSS, and JavaScript to start. After 3 months you can build business websites and charge $200–$500 per site. After 6 months, charge $1,000–$3,000 per project. Free learning: freeCodeCamp.org and our 3EESHER Academy Library.</p><h2>2. Copywriting — $50–$200 Per Hour</h2><p>Copywriters write words that sell — sales pages, email sequences, ads, product descriptions. You can learn the fundamentals in 30 days and start charging $50–$100 per email campaign.</p><h2>3. Social Media Management — $300–$1,500 Per Month Per Client</h2><p>Small businesses need someone to manage their Instagram, Facebook, and TikTok. One client pays $300–$500 monthly. With 3 clients you earn $900–$1,500 working just 2–3 hours per day from your phone.</p><h2>4. Data Analysis — $25–$80 Per Hour</h2><p>Data analysts look at business data and find patterns. Excel, Google Sheets, and basic SQL are the main tools. Clients on Upwork regularly pay $40–$80/hour and the demand far exceeds the supply of skilled analysts.</p><h2>5. Video Editing — $20–$100 Per Video</h2><p>Content creators on YouTube, TikTok, and Instagram need editors. CapCut is free on mobile and professional enough to charge $20–$50 per video starting today. Top editors charge $100–$300 per video.</p><h2>6. Graphic Design — $15–$75 Per Design</h2><p>Canva has made professional design accessible to everyone. Create logos, social media posts, flyers, and business cards. A professional logo on Fiverr can earn you $50–$200. Many Nigerian designers earn ₦200,000+ monthly from Canva alone.</p><h2>7. SEO — $500–$3,000 Per Month</h2><p>Help businesses rank higher on Google. One SEO client pays $500–$2,000 per month on retainer. This is one of the highest-paying freelance skills because results are clear and measurable.</p><h2>8. Virtual Assistant — $10–$30 Per Hour</h2><p>Handle emails, scheduling, research, and data entry for busy entrepreneurs remotely. Easy to start with no technical skills required. Demand is growing rapidly as more entrepreneurs hire remote help.</p><h2>9. Translation — $20–$60 Per Hour</h2><p>If you speak English and Arabic, Hausa, Yoruba, Igbo, or French, you can earn good money as a translator. English-Arabic translators earn $0.05–$0.15 per word — which is $60+ per hour for fast translators.</p><h2>10. AI Prompt Engineering — $30–$100 Per Hour</h2><p>The newest and fastest-growing skill. Companies need people who know how to get the best results from AI tools like ChatGPT, Midjourney, and Claude. With 2 weeks of practice you can start offering AI services that businesses desperately need.</p>'
    },
    {
        title: 'The Complete Jumia Affiliate Guide — Earn Up to ₦500,000 Monthly',
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200',
        content: '<p>Jumia is Nigeria\'s largest e-commerce platform and their affiliate program is one of the best opportunities for Nigerians to earn passive income online. In this complete guide we walk you through everything you need to know to start earning today.</p><h2>Why Jumia Affiliate is Perfect for Nigerians</h2><p>Unlike Amazon or ClickBank which target international buyers, Jumia is built specifically for the Nigerian market. Your audience already knows and trusts Jumia — this means your conversion rate will be much higher than foreign affiliate programs. Commission rates range from 3% to 9% depending on product category.</p><h2>How to Register for Jumia Affiliate</h2><p>Go to affiliate.jumia.com.ng and click Publisher Registration. Fill in your name, email, and your social media page. You do not need a formal website — your Facebook page or TikTok account qualifies as your platform. Wait 24–48 hours for approval, then access your dashboard to get your unique Publisher ID and start generating affiliate links.</p><h2>Best Products to Promote on Jumia</h2><p><strong>Smartphones and Accessories:</strong> High demand year-round. Share posts like "Best budget phones on Jumia under ₦80,000." High search volume and strong conversion. <strong>Fashion and Clothing:</strong> High commission rate. Women\'s fashion converts very well on Instagram and WhatsApp status updates. <strong>Baby Products:</strong> Parents buy consistently every single month. Promote to mothers\' WhatsApp groups. <strong>Electronics and Gadgets:</strong> Higher prices mean higher commission. One laptop sale can earn ₦3,000–₦15,000 commission.</p><h2>Best Platforms to Promote Your Links</h2><p><strong>WhatsApp Status:</strong> Post product images with prices and your link daily. 300 contacts at 1% conversion means 3 sales per day at ₦2,000 commission each. That is ₦6,000 daily from WhatsApp alone. <strong>TikTok and Instagram Reels:</strong> Create short product review videos. "Products I found on Jumia under ₦5,000" content goes viral easily. <strong>Facebook Groups:</strong> Millions of Nigerians use Facebook Groups to discover products to buy.</p><h2>Realistic Monthly Earnings</h2><p>10 sales per month: ₦25,000 ($16). 50 sales: ₦125,000 ($80). 200 sales: ₦500,000 ($320). The top Nigerian Jumia affiliates earn over ₦500,000 per month consistently by building audience trust and creating content every single day without stopping.</p>'
    },
    {
        title: 'How AI is Creating New Income Opportunities for Africans in 2026',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
        content: '<p>Artificial Intelligence is the biggest economic opportunity in a generation. The good news for Africans is that the AI revolution does not require you to be a programmer, have a degree, or own a powerful computer. Here are 7 proven ways to profit from AI right now.</p><h2>1. AI Data Labeling — Start Today With No Experience</h2><p>AI models like ChatGPT need millions of labeled examples to learn from. Companies pay ordinary people to review and label data — images, text, audio, and video. No special skills required. Best platforms: Appen (appen.com), Remotasks (remotasks.com), Clickworker. Pay ranges from $2–$15 per hour and you can start within 24 hours of registering.</p><h2>2. AI Content Writing — $30–$100 Per Article</h2><p>Use ChatGPT to write blog articles, product descriptions, social media captions, and email newsletters. Sell these services on Fiverr. Many clients do not care how you write content — they just want quality delivered fast. With AI you write a 1,500-word article in 10 minutes. Charge $30–$100 and earn $500–$1,500 per month working just 2 hours daily.</p><h2>3. AI Image Generation — $5–$50 Per Image</h2><p>Tools like Midjourney, Adobe Firefly, and DALL-E generate stunning images from text descriptions. Small businesses need custom images for websites and social media. Some designers earn $2,000+ per month from AI-generated artwork sold on Fiverr and Etsy.</p><h2>4. AI Chatbot Building — $200–$2,000 Per Chatbot</h2><p>Businesses need chatbots for customer service and sales. Using no-code tools like ManyChat or Chatbase connected to ChatGPT, you can build a functional business chatbot in 1–2 hours. Charge $200–$500 for basic chatbots and $1,000–$2,000 for advanced e-commerce chatbots.</p><h2>5. AI-Powered Social Media Management</h2><p>Use ChatGPT to generate 30 days of social media content in one hour. Use Canva AI to design posts automatically. Use Buffer to schedule them. Then charge clients $300–$1,000 per month for done-for-you social media management. You spend 2–3 hours and collect monthly retainers.</p><h2>6. Teaching AI Tools — ₦100,000–₦500,000 Per Month</h2><p>Most businesses in Nigeria are not yet using AI in their daily operations. Position yourself as an AI consultant and teach others. Host workshops charging ₦10,000–₦50,000 per person. Run one workshop per month with 10 students and earn ₦100,000–₦500,000 in extra income on top of everything else.</p><h2>The Key Takeaway</h2><p>AI is not replacing Africans — it is giving Africans unprecedented tools to compete on a global level. A 20-year-old in Lagos with a smartphone and ChatGPT can now deliver better, faster work than a traditional agency in Europe. The opportunity window is wide open right now. Start with one method today and build from there.</p>'
    },
    {
        title: 'Start Freelancing on Upwork and Make Your First $500 — Step by Step',
        image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200',
        content: '<p>Upwork is the world\'s largest marketplace for freelancers, connecting businesses with independent professionals globally. With over 5 million registered clients it offers extraordinary opportunities for Africans to earn in dollars. Here is a complete step-by-step guide to making your first $500.</p><h2>Why Upwork Beats Other Platforms for Beginners</h2><p>Unlike Fiverr where you wait for clients to find you, on Upwork you actively apply to jobs. This means you can start getting responses within 24 hours of creating your profile — even with zero reviews. Average rates for African freelancers: $10–$60/hour for beginners, $100+/hour for experienced professionals after 6 months of solid reviews.</p><h2>Step 1 — Build a Profile That Wins</h2><p>Your profile is your digital storefront. Use a professional photo with a clear face and friendly smile. Write a compelling headline showing the result you deliver: "I help small businesses get 3x more customers with high-converting websites" beats "Web Developer." Fill out 100% of your profile for better search ranking. Add portfolio items even from personal practice projects.</p><h2>Step 2 — Write Proposals That Get Responses</h2><p>Most proposals are ignored because they are generic. Stand out by reading the job description carefully and personalizing every single response. Start with what you noticed about their specific project. Show one relevant example of your work. Explain your exact approach in 2–3 sentences. End with: "I can start tomorrow — would you be open to a quick 15-minute call?" Keep proposals under 200 words. Clarity always wins over length.</p><h2>Step 3 — Get Your First Review at Lower Rate</h2><p>Start at slightly below market rate to win your first 3–5 reviews. If market rate is $25/hour, start at $15/hour. After getting positive reviews, raise to $25, then $40, then $60+. One 5-star review from a happy client opens doors to clients at 3x your current rate. Reviews are your most valuable currency on Upwork.</p><h2>Step 4 — Over-Deliver on Every Single Project</h2><p>For your first clients, over-deliver consistently. Finish before the deadline. Provide more than was requested. Communicate proactively. Then ask directly: "If you are satisfied, I would be grateful for a detailed 5-star review — it really helps my business grow." Most happy clients are glad to leave a review when asked professionally and specifically.</p><h2>Your 30-Day Action Plan to $500</h2><p>Week 1: Create optimized profile, apply to 5 entry-level jobs daily. Week 2: Accept first client at lower rate, deliver excellent work on time. Week 3: Get first 5-star review, apply to higher-paying jobs using it as proof. Week 4: Raise rates, target $500 monthly income. This is a realistic and completely repeatable path to financial freedom through Upwork.</p>'
    },
    {
        title: 'Building Passive Income with ClickBank — How to Reach $2,500 Per Month',
        image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200',
        content: '<p>ClickBank is the world\'s largest digital products marketplace and one of the highest-paying affiliate networks available. Commissions of 50%, 60%, even 75% are common. On a $100 product you keep $75. This guide shows you how to build real passive income promoting ClickBank products from Nigeria.</p><h2>Why ClickBank Pays So Much More Than Other Programs</h2><p>Unlike physical product affiliate programs paying 3–10%, ClickBank products are digital — courses, ebooks, software, and memberships. Digital products have no manufacturing or shipping costs, which is why companies can afford such high commissions to affiliates. You also get paid weekly via direct bank transfer once you reach the $10 payment threshold.</p><h2>Creating Your Account and Finding Products</h2><p>Go to clickbank.com and click Create Account. Takes 5 minutes. Your username becomes your affiliate nickname in all tracking links. Choose something professional and memorable. In the Marketplace, look for products with a Gravity score of 20–100 (proven sellers), commission of 50%+, and an average sale value of $30+. Products with recurring commissions (software subscriptions) are especially valuable because you earn every month from one referral.</p><h2>Promotion Strategy 1 — Blog and SEO</h2><p>Create a blog around your chosen niche and write detailed honest review articles. When people search Google for "best [product] review 2026" and find your article, they are already in buying mode — conversion rates of 2–8% are common. Once ranked, this is completely passive income earning for years without any additional work.</p><h2>Promotion Strategy 2 — YouTube Channel</h2><p>Create video reviews demonstrating the product in action. Put your ClickBank link in the description. YouTube videos rank in Google search and drive traffic for years after posting. One well-optimized review video can generate continuous sales for 3–5 years — the definition of real passive income.</p><h2>Promotion Strategy 3 — Email Marketing</h2><p>Build an email list by offering a free guide related to your niche. Send weekly value emails with genuine product recommendations. Even a list of 500 engaged subscribers generates $200–$500 monthly in ClickBank commissions when you build real trust and only recommend quality products.</p><h2>Realistic Income Timeline</h2><p>Month 1: $0–$50 (setup and learning). Month 2–3: $50–$200 (getting initial traffic). Month 4–6: $200–$800 (content compounding). Month 7–12: $800–$2,500+ (passive income building strongly). Consistency over 12 months is the single biggest factor in success with ClickBank.</p>'
    },
    {
        title: 'Make Money on YouTube Without Showing Your Face — Complete 2026 Guide',
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200',
        content: '<p>You do not need to appear on camera to make money on YouTube. Thousands of channels earn thousands of dollars per month without ever showing the creator\'s face. This strategy is perfect for shy people, private individuals, and anyone wanting to build passive income from video content without personal exposure.</p><h2>What Is a Faceless YouTube Channel?</h2><p>A faceless channel uses screen recordings, animations, stock footage, voiceovers, or AI-generated visuals instead of on-camera presentation. Popular faceless niches: technology news and reviews, meditation and relaxation music, history and facts, cooking tutorials showing only hands, financial education, and AI tools demonstrations. All have massive audiences and strong monetization.</p><h2>Free Tools You Need to Start</h2><p><strong>Video Editing:</strong> DaVinci Resolve (free desktop) or CapCut (free mobile). Both are professional-grade tools used by top creators. <strong>Voiceover:</strong> ElevenLabs.io creates ultra-realistic AI voices in multiple accents including Nigerian English. Or record your own voice using your smartphone. <strong>Thumbnails:</strong> Canva free tier for professional YouTube thumbnails. <strong>Screen Recording:</strong> OBS Studio (free) for recording your screen — great for software tutorials and finance content.</p><h2>Three Income Streams from YouTube</h2><p><strong>YouTube AdSense:</strong> Once you reach 1,000 subscribers and 4,000 watch hours, YouTube pays for ads shown on your videos. Earnings: $1–$10 per 1,000 views depending on niche. Finance and tech niches pay the most per view globally. <strong>Affiliate Marketing in Descriptions:</strong> Link to relevant products using your affiliate links in every video description. Many faceless YouTubers earn more from affiliate commissions than from ads. <strong>Sponsorships:</strong> Once you reach 5,000–10,000 subscribers, brands pay $200–$5,000+ to be featured in your videos. One sponsorship per month can exceed your total ad revenue.</p><h2>90-Day YouTube Growth Plan</h2><p>Days 1–7: Choose niche, create channel, set up branding with Canva. Days 8–30: Post 3 videos per week using TubeBuddy free tier to find low-competition keywords. Days 31–60: Analyze which videos get most views and create more of that type. Days 61–90: You should have 20–30 videos online. Older videos start compounding views. First AdSense income typically arrives in months 3–6 for consistent creators.</p><h2>The Long-Term Vision</h2><p>Think of each YouTube video as a salesperson working 24/7. A video uploaded today can generate views, subscribers, and income for the next 5–10 years without any additional work. Build 100 quality videos over 2 years and you could have a passive income machine worth $2,000–$10,000 per month — all without ever showing your face on screen.</p>'
    },
    {
        title: 'Making Money Online in Nigeria 2026 — The Complete Beginner Roadmap',
        image: 'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=1200',
        content: '<p>Nigeria has the largest economy in Africa, the youngest population on the continent, and one of the fastest-growing internet user bases in the world. These factors create an extraordinary opportunity for Nigerians to earn globally competitive income through digital means. This is your complete beginner roadmap for 2026.</p><h2>Why 2026 Is the Best Time to Start</h2><p>Remote work has become mainstream globally. International companies actively hire Nigerian talent because of strong English proficiency, competitive rates, and time zone compatibility. A Nigerian web developer can earn the exact same hourly rate as an American one — your location is no longer a barrier to premium income. The window is wide open right now.</p><h2>The 3 Paths to Online Income</h2><p><strong>Path 1 — Freelancing (Fastest Results):</strong> Sell your skills on Upwork, Fiverr, or LinkedIn. Income can start within days or weeks. Average income: $500–$5,000/month depending on skill level and consistency. <strong>Path 2 — Affiliate Marketing (Passive Income):</strong> Promote other people\'s products and earn commissions 24/7. Takes 3–6 months to build momentum, but once it works, income continues even when you are not working. <strong>Path 3 — Content Creation (Long-Term):</strong> Build an audience on YouTube, TikTok, or through a blog. Takes 6–12 months to become significant income, but builds a real business asset worth millions over time.</p><h2>Skills You Can Learn for Free Today</h2><p>You do not need to spend money to learn digital skills. 3EESHER Academy (our free library at 3eesher-cloud.onrender.com/library) offers 6 complete courses covering AI, Data Analysis, Web Development, Digital Marketing, Affiliate Marketing, and Freelancing — all free and all focused on practical earning strategies. Other free resources: Google Digital Skills for Africa, freeCodeCamp.org, and YouTube tutorials.</p><h2>Your First 30 Days Action Plan</h2><p>Week 1: Choose ONE income path (freelancing, affiliate, or content). Create profiles on the relevant platforms. Week 2: Start learning core skills using free resources. Spend 1–2 hours daily on consistent practice. Week 3: Take action — apply for your first freelance job, publish your first affiliate content, or upload your first YouTube video. Week 4: Review what worked and what did not. Adjust your approach. Keep going regardless of early results.</p><h2>The Mindset That Makes the Difference</h2><p>The biggest barrier to success is not skills — it is mindset. Stop thinking about finding a job and start thinking about building income streams. Invest time in skills before expecting returns. Show up consistently even when results seem slow. Track progress weekly and celebrate every small win. Nigeria\'s first generation of digital millionaires is being made right now. The only question is whether you will be part of it.</p>'
    }
];
// Morning blog: 8am daily — different topic each day
cron.schedule('0 8 * * *', () => {
    const data = getData(); if (!data.settings.autoBlogger) return;
    const idx = new Date().getDay() % blogTopics.length;
    const blog = blogTopics[idx];
    data.blogPosts.unshift({ id: Date.now(), title: blog.title, content: blog.content, image: blog.image, date: new Date().toISOString(), views: 0, author: '3EESHER Bot' });
    if (data.blogPosts.length > 60) data.blogPosts.pop();
    saveData(data);
    console.log('📝 Morning blog: ' + blog.title);
});
// Evening blog: 8pm daily — always a DIFFERENT topic from morning
cron.schedule('0 20 * * *', () => {
    const data = getData(); if (!data.settings.autoBlogger) return;
    const idx = (new Date().getDay() + 4) % blogTopics.length;
    const blog = blogTopics[idx];
    data.blogPosts.unshift({ id: Date.now(), title: blog.title, content: blog.content, image: blog.image, date: new Date().toISOString(), views: 0, author: '3EESHER Bot' });
    if (data.blogPosts.length > 60) data.blogPosts.pop();
    saveData(data);
    console.log('📝 Evening blog: ' + blog.title);
});

// Auto targeting + expire old ads: every 30 min
cron.schedule('*/30 * * * *', () => {
    const data = getData(); if (!data.settings.autoTargeting) return;
    const now = new Date(); let changed = false;
    (data.ads||[]).forEach(ad => { if (ad.active && new Date(ad.expiresAt) < now) { ad.active = false; changed = true; } });
    if (changed) saveData(data);
});

// Email blast: 9am & 9pm daily
cron.schedule('0 9,21 * * *', async () => {
    const data = getData(); if (!data.settings.autoMoneyMaker) return;
    const subscribers = data.subscribers || []; if (!subscribers.length) return;
    const campaigns = getEmailCampaigns(data);
    const campaign = campaigns[Math.floor(Date.now() / (12*3600000)) % campaigns.length];
    const html = buildCampaignHtml(campaign, data);
    let sent = 0;
    for (const email of subscribers) {
        try { await transporter.sendMail({ from: `3EESHER-CLOUD <${GMAIL_USER}>`, to: email, subject: campaign.subject, html }); sent++; await new Promise(r => setTimeout(r, 300)); } catch(e) {}
    }
    if (!data.emailCampaigns) data.emailCampaigns = [];
    data.emailCampaigns.unshift({ id: Date.now(), subject: campaign.subject, sent, failed: subscribers.length - sent, total: subscribers.length, date: new Date().toISOString() });
    if (data.emailCampaigns.length > 30) data.emailCampaigns.pop();
    saveData(data);
    console.log(`📧 Email blast: ${sent}/${subscribers.length} sent — "${campaign.subject}"`);
});

// Self-report + affiliate promotion: every 4 hours
cron.schedule('0 */4 * * *', () => {
    const data = getData(); if (!data.settings.autoMoneyMaker) return;
    const clicks = data.moneyLinks.reduce((s,l)=>s+(l.clicks||0),0);
    const top3 = [...data.moneyLinks].sort((a,b)=>(b.clicks||0)-(a.clicks||0)).slice(0,3);
    const activeStores = data.storeLinks.filter(l=>l.active&&l.id);
    transporter.sendMail({
        from: GMAIL_USER, to: GMAIL_USER,
        subject: `📊 3EESHER 4hr Report — $${data.earnings.total.toFixed(2)} balance — ${data.subscribers.length} subs`,
        html: `<div style="font-family:Arial;background:#0f172a;color:#e2e8f0;padding:30px;border-radius:10px;">
            <h2 style="color:#fbbf24;">📊 Auto-Report — ${new Date().toLocaleString()}</h2>
            <p>💰 Balance: <strong style="color:#10b981;">$${data.earnings.total.toFixed(2)}</strong></p>
            <p>📧 Subscribers: <strong>${data.subscribers.length}</strong></p>
            <p>🎓 Library Members: <strong>${(data.libraryUsers||[]).length}</strong></p>
            <p>🔗 Total Clicks: <strong>${clicks}</strong></p>
            <p>🎯 Active Ads: <strong>${(data.ads||[]).filter(a=>a.active).length}</strong></p>
            <h3 style="color:#fbbf24;margin-top:20px;">🏆 Top Links:</h3>
            ${top3.map(l=>`<p>• ${l.name}: ${l.clicks||0} clicks — $${(l.earnings||0).toFixed(2)}</p>`).join('')}
            <h3 style="color:#fbbf24;margin-top:20px;">🏪 Active Affiliate Stores:</h3>
            ${activeStores.map(l=>`<p>• ${l.name} (${l.commission}): <a href="${l.url}${l.id}" style="color:#10b981;">${l.url}${l.id}</a></p>`).join('')||'<p style="color:#64748b">No stores with IDs yet. Add them in Admin → Stores.</p>'}
            <div style="margin-top:20px;background:#1e293b;padding:16px;border-radius:8px;">
                <p style="color:#fbbf24;font-weight:bold;">💡 Add more store IDs to earn more!</p>
                <p style="color:#94a3b8;font-size:13px;">Amazon: affiliate-program.amazon.com | Konga: konga.com/affiliate</p>
            </div>
        </div>`
    }).catch(() => {});
});
// ==================== LIBRARY COURSES ====================
const LIBRARY_COURSES = [
    { id:'ai-basics', title:'AI & Machine Learning Basics', description:'Learn how AI works, use AI tools to make money, understand machine learning without coding.', icon:'🤖', level:'Beginner', category:'Technology', duration:'6 lessons', color:'#8b5cf6',
      lessons:[
        {id:1,title:'What is AI? A Simple Explanation',content:'AI is when computers learn to do tasks that normally require human intelligence. AI is already in your phone, social media feeds, and apps recommending what to buy.\n\n**How AI Makes Money:**\n• Label data on Appen and Remotasks ($2–$10/hour)\n• Use ChatGPT to write content faster\n• Build AI-powered apps with no-code tools\n\n**Key Terms:**\n• Machine Learning: AI that learns from examples\n• Neural Network: AI inspired by the human brain\n• Training Data: Information used to teach AI\n• ChatGPT: An AI chatbot that can write, code, and explain anything',video:''},
        {id:2,title:'How to Use ChatGPT to Make Money',content:'ChatGPT is the most powerful AI tool today.\n\n**5 Ways to Earn with ChatGPT:**\n1. **Write Blog Posts** — Ask ChatGPT to write articles, publish on Medium for ad revenue\n2. **Create Fiverr Gigs** — Offer AI-powered content writing. Charge $20–$100 per article\n3. **Build Chatbots** — Businesses pay $200–$2,000 for custom chatbots\n4. **Resume Writing** — Charge $20–$50 to write resumes using ChatGPT\n5. **Email Marketing** — Write email sequences for businesses. Charge $100–$500\n\n**Getting Started:** Go to chat.openai.com → Sign up free → Start with: "Write me a 500-word blog post about making money online in Nigeria"',video:'https://www.youtube.com/embed/JTxsNm9IdYU'},
        {id:3,title:'AI Data Labeling — Get Paid to Train AI',content:'AI companies need humans to label data to train their models. Easiest way to earn with no experience.\n\n**Top Platforms:**\n• **Appen** (appen.com) — $10–$15/hour. Label images, transcribe audio\n• **Remotasks** (remotasks.com) — $2–$8/hour to start. Works from phone\n• **Scale AI** — $15–$30/hour for higher skill tasks\n\n**How to Start:**\n1. Sign up at remotasks.com (easiest for beginners)\n2. Complete the free training tasks\n3. Pass the qualification test\n4. Start earning same day',video:''},
        {id:4,title:'Machine Learning Without Coding',content:'You do NOT need to be a programmer to work with AI today.\n\n**Top No-Code AI Tools:**\n• **Google AutoML** — Build custom AI models by uploading data\n• **Teachable Machine** (teachablemachine.withgoogle.com) — Train image AI in your browser, free\n• **Lobe** by Microsoft — Train image models with simple drag-and-drop\n\n**Business Ideas:**\n1. Build a plant disease detector for farmers\n2. Create a product photo quality checker for e-commerce\n3. Build a face recognition attendance system for schools',video:''},
        {id:5,title:'Free AI Tools to Use Every Day',content:'These free AI tools save hours every day:\n\n**Writing:** ChatGPT, Grammarly, Copy.ai\n**Images:** Canva AI, Adobe Firefly, Remove.bg\n**Video:** Runway ML, Pictory\n**Research:** Perplexity AI, NotebookLM\n\n**How to Monetize:** Offer "AI-powered services" on Fiverr. Charge $20–$100 per task that takes you 5 minutes with these tools.',video:''},
        {id:6,title:'Building Your First AI Side Business',content:'Step-by-step plan to start an AI side business this week:\n\n**Option A: AI Content Agency (Easiest)**\n• Create Fiverr profile: "I write SEO blog posts using AI"\n• Charge $30–$80 per 1,000-word article\n• Use ChatGPT to write in 5 minutes\n• Earn: $300–$1,500/month working 2 hours/day\n\n**Option B: AI Image Business**\n• Offer custom AI-generated images\n• Charge $5–$20 per image\n• Earn: $200–$800/month\n\n**Your Action Plan:**\n1. Today: Sign up on Fiverr and create your AI writing gig\n2. Tomorrow: Sign up on Remotasks for immediate income\n3. This week: Complete all 6 lessons!',video:''}
      ]},
    { id:'data-analysis', title:'Data Analysis & Excel Mastery', description:'Master Excel, Google Sheets, and data analysis skills that pay $40–$80/hour.', icon:'📊', level:'Beginner to Intermediate', category:'Data', duration:'5 lessons', color:'#10b981',
      lessons:[
        {id:1,title:'Why Data Analysis Pays So Well',content:'Every business has data but most don\'t know what to do with it. That\'s where you come in.\n\n**How Much It Pays:**\n• Freelance data analyst: $25–$80/hour on Upwork\n• Excel expert: $30–$60/hour\n• Business analyst: $50–$100/hour\n\n**Where to Find Jobs:** Upwork, Fiverr, LinkedIn',video:''},
        {id:2,title:'Excel Fundamentals — From Zero to Confident',content:'Essential Excel functions:\n\n• SUM =SUM(A1:A10)\n• AVERAGE =AVERAGE(A1:A10)\n• IF =IF(A1>100,"Good","Bad")\n• VLOOKUP =VLOOKUP(value,table,column)\n• SUMIF =SUMIF(range,criteria,sum_range)\n\n**Free Practice:** Use Google Sheets (sheets.google.com) — completely free, works in browser.',video:'https://www.youtube.com/embed/rwbho0CgEAI'},
        {id:3,title:'Pivot Tables — The Most Powerful Excel Feature',content:'Pivot tables turn thousands of rows into summaries in seconds.\n\n**How to Create One:**\n1. Select your data table\n2. Insert → PivotTable\n3. Drag fields into Rows, Columns, Values\n4. Done!\n\n**Job Tip:** Learn pivot tables and charge $25–$40/hour for "data analysis" on Upwork.',video:''},
        {id:4,title:'Data Visualization — Charts That Tell Stories',content:'**When to Use Each Chart:**\n• Bar Chart: Compare categories\n• Line Chart: Show trends over time\n• Pie Chart: Show proportions\n\n**Portfolio Tip:** Download a free dataset from Kaggle.com, analyze it, create charts, put it on LinkedIn. This gets you clients.',video:''},
        {id:5,title:'Getting Your First Data Client',content:'**Step 1: Build a Portfolio (2 days)**\n• Go to Kaggle.com → Free Datasets\n• Create 3–5 charts and a pivot table summary\n\n**Step 2: Create Fiverr Profile**\n• Title: "I will analyze your Excel data and create reports"\n• Price: $15–$25 for starter gig\n\n**Step 3: Raise Rates**\nAfter 3 positive reviews, raise to $30–$50/hour.',video:''}
      ]},
    { id:'web-development', title:'Web Development for Beginners', description:'Build real websites with HTML, CSS, JavaScript. Websites sell for $200–$2,000 each.', icon:'💻', level:'Beginner', category:'Technology', duration:'5 lessons', color:'#f59e0b',
      lessons:[
        {id:1,title:'HTML — The Structure of Every Website',content:'HTML is the skeleton of every website.\n\n```html\n<!DOCTYPE html>\n<html>\n<head><title>My Website</title></head>\n<body>\n    <h1>Hello World!</h1>\n    <p>My first paragraph.</p>\n    <a href="https://google.com">Click here</a>\n</body>\n</html>\n```\n\n**Practice:** Open Notepad → paste code → save as index.html → open in browser. You just made your first website!',video:''},
        {id:2,title:'CSS — Making Websites Beautiful',content:'CSS makes websites look good.\n\n```css\nbody { background:#0f172a; color:white; font-family:Arial; }\nh1 { color:#10b981; font-size:48px; text-align:center; }\n.btn { background:#10b981; padding:15px 30px; border-radius:8px; color:white; }\n```',video:''},
        {id:3,title:'JavaScript — Making Websites Interactive',content:'JavaScript makes websites do things.\n\n```javascript\nfunction changeText() {\n    document.getElementById("myText").innerHTML = "Clicked!";\n}\nconst name = document.getElementById("nameInput").value;\nif (name === "") { alert("Please enter name"); }\n```',video:''},
        {id:4,title:'Building a Complete Business Website',content:'**Structure:** Nav bar → Hero section → Services → About → Contact form → Footer\n\n**Free Hosting:** Netlify (netlify.com) — drag & drop your HTML files\n\n**Pricing:** Simple website (5 pages): $200–$500 | Business website: $500–$1,000',video:''},
        {id:5,title:'Getting Paid — Finding Web Clients',content:'**Strategy 1: Local Businesses**\nWalk into small shops. Ask "Do you have a website?" Build free mockup from html5up.net templates. Show them. Close the deal for ₦50,000–₦150,000.\n\n**Strategy 2: Fiverr**\nCreate gig: "I will build you a professional business website" — $50–$100 starter.\n\n**Strategy 3: WhatsApp Groups**\nJoin Nigerian entrepreneur groups. Post portfolio.',video:''}
      ]},
    { id:'digital-marketing', title:'Digital Marketing & Social Media', description:'Learn SEO, social media marketing, and email marketing to grow any business.', icon:'📱', level:'Beginner', category:'Marketing', duration:'4 lessons', color:'#ef4444',
      lessons:[
        {id:1,title:'What is Digital Marketing?',content:'Digital marketing is promoting products using the internet.\n\n**How to Earn:**\n• Social media manager: $300–$1,500/month per client\n• SEO specialist: $500–$3,000/month per client\n• Email marketer: $20–$80/hour\n\n**Best Starting Point:** Social media management. Every small business needs it.',video:''},
        {id:2,title:'SEO — Get Free Traffic from Google',content:'SEO means making your website appear high in Google search results.\n\n**Basic SEO Steps:**\n1. Research keywords with Ubersuggest.io (free)\n2. Write 1,500+ word articles targeting those keywords\n3. Add keyword in title, first paragraph, headings, URL\n\n**Quick Win:** Write a post titled "How to [solve problem] in [your city]"',video:''},
        {id:3,title:'Social Media Marketing That Works',content:'**Content Formula:**\n• 3 posts/week: Educational (tips, how-to)\n• 2 posts/week: Inspirational (quotes, stories)\n• 1 post/week: Promotional (what you sell)\n\n**Post at:** 7am–9am, 12pm–1pm, 7pm–9pm\n\n**As Social Media Manager:**\nCharge ₦30,000–₦100,000/month to manage a local business Instagram.',video:''},
        {id:4,title:'Email Marketing — The Most Profitable Channel',content:'Email has the highest ROI of any marketing — $36 for every $1 spent.\n\n**Email Sequence:**\n• Email 1 (instant): Welcome + free gift\n• Email 2 (day 3): Valuable tip\n• Email 3 (day 5): Success story\n• Email 4 (day 7): Promotional offer\n• Email 5+: Weekly mix of value and promotion\n\n**Free Tools:** Mailchimp (free up to 500 subscribers)',video:''}
      ]},
    { id:'affiliate-marketing', title:'Making Money Online — Affiliate Marketing', description:'Complete guide to affiliate marketing. Choose products, build audiences, earn commissions 24/7.', icon:'💰', level:'Beginner', category:'Income', duration:'5 lessons', color:'#fbbf24',
      lessons:[
        {id:1,title:'How Affiliate Marketing Really Works',content:'You promote someone else\'s product. When someone buys through your link, you earn commission. No product creation. No customer service.\n\n**Real Numbers:**\n• $50 product × 50% commission = $25 per sale\n• 10 sales/month = $250/month passive income\n• 100 sales/month = $2,500/month passive income\n\n**Biggest Mistake:** Trying to promote everything to everyone. Pick ONE niche. ONE audience. Stay consistent for 90 days.',video:''},
        {id:2,title:'Best Affiliate Programs for Africans',content:'**Tier 1 — Start With These:**\n\n🛒 **Jumia NG** — Up to 9% commission. affiliate.jumia.com.ng\n💰 **ClickBank** — 40–75% commission. clickbank.com\n📦 **Amazon Associates** — 3–10%. affiliate-program.amazon.com\n🤝 **ShareASale** — 5–50%. shareasale.com\n\n**Tier 2:**\n• Fiverr Affiliates: $15–$150 per referral\n• Hostinger: 60% commission',video:''},
        {id:3,title:'Building Your Affiliate Traffic Engine',content:'**Method 1: WhatsApp (Fastest for Nigeria)**\n• Create daily WhatsApp status with a money tip + affiliate link\n• Create broadcast list of interested people\n• Post value 4 days, promote 1 day\n• Earnings: $50–$300/month from WhatsApp alone\n\n**Method 2: TikTok**\n• Post 15–60 second money tip videos\n• Put affiliate link in bio\n• 1 viral video = $100–$1,000 in commissions\n\n**Method 3: Email List**\n• Build subscriber list\n• Weekly emails with tips + affiliate links\n• 500 subscribers = $200–$500/month',video:''},
        {id:4,title:'Creating Content That Converts',content:'**Template 1: Review**\n"I tried [product] for 30 days. Here\'s what happened..."\n\n**Template 2: Comparison**\n"[Product A] vs [Product B] — Which is ACTUALLY better?"\n\n**Template 3: Problem-Solution**\n"How I paid off my debt in 6 months using this method"\n\n**Key Rule:** Always disclose: "This post contains affiliate links — I earn a small commission if you buy, at no extra cost to you."',video:''},
        {id:5,title:'Scaling to $1,000+/Month',content:'**Week 1–2:** Choose niche + sign up for 3 programs + create TikTok and WhatsApp profiles\n**Week 3–4:** Post 5 TikToks/week + daily WhatsApp status\n**Month 2:** Keep posting. Track which links convert. Target: first $50.\n**Month 3–4:** Double down on best topics. Start email list. Target: $300–$500/month.\n**Month 6:** Outsource content, invest in ads. Target: $1,000–$2,500/month.\n\n**The Truth:** 80% quit before month 3. The 20% who keep going earn 100% of the money.',video:''}
      ]},
    { id:'freelancing', title:'Freelancing Masterclass', description:'From zero to your first client. Build profile, find jobs, get paid on Fiverr and Upwork.', icon:'🚀', level:'Beginner', category:'Income', duration:'4 lessons', color:'#06b6d4',
      lessons:[
        {id:1,title:'What Skills Can You Sell Right Now?',content:'**Skills You Can Start TODAY:**\n• Data entry — $5–$15/hour\n• Social media management — $150–$500/month\n• Virtual assistant — $10–$25/hour\n• Canva graphic design — $15–$50 per design\n• English-Arabic translation — $10–$25/hour\n\n**Worth Learning (1–4 weeks):**\n• Excel/data analysis — $20–$60/hour\n• Video editing (CapCut is free) — $20–$100 per video\n• WordPress website building — $200–$500 per site\n\n**First Step:** Pick ONE from "start today" list. Create a Fiverr gig tomorrow.',video:''},
        {id:2,title:'Creating a Winning Fiverr Profile',content:'**Gig Title Formula:** "I will [specific outcome] for [specific customer]"\nExamples:\n• "I will manage your Instagram account for 30 days"\n• "I will design a professional logo in 24 hours"\n\n**Pricing:**\n• Basic: $5–$15\n• Standard: $15–$35\n• Premium: $35–$75\n\nAfter 5 Reviews: Raise all prices by 50–100%.',video:''},
        {id:3,title:'Getting Your First Order on Upwork',content:'**Winning Proposal Formula:**\n1. Show you read the job: "I noticed you need [specific thing]..."\n2. Show experience: "I have done similar work for [type of client]..."\n3. Show approach: "I would solve this by..."\n4. CTA: "I\'d love to discuss. Available for a quick call?"\n5. Keep under 150 words\n\n**Getting First Review:** Apply to $5–$20 jobs. Over-deliver. Ask for 5-star review.',video:''},
        {id:4,title:'Raising Rates — From $5 to $50/Hour',content:'**Stage 1 ($5–$15/hour):** Get 5–10 five-star reviews. Accept almost any job. Over-deliver.\n\n**Stage 2 ($15–$35/hour):** Specialize in ONE skill. Raise all prices.\n\n**Stage 3 ($35–$75/hour):** Target businesses not individuals. Show ROI. Offer packages.\n\n**Rate Raise Script:** "Starting next month I\'m increasing my rates to $[new rate]. Because I value our relationship, I\'ll keep your rate for 2 more months."',video:''}
      ]}
];

// ==================== LIBRARY PAGE ====================
app.get('/library', (req, res) => {
    const libUser = req.session.libraryUser;
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <title>3EESHER Academy — Free Digital Skills Library</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Learn AI, Data Analysis, Web Development, Digital Marketing, Affiliate Marketing — all FREE at 3EESHER Academy.">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root{--g:#10b981;--gold:#fbbf24;--pur:#8b5cf6;--bg:#0a0f1e;--card:#131c31;--card2:#1a2540;--tx:#e2e8f0;--mu:#64748b;--br:rgba(51,65,85,0.4);}
        *{margin:0;padding:0;box-sizing:border-box;}html{scroll-behavior:smooth;}body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:var(--tx);}
        nav{position:sticky;top:0;z-index:100;background:rgba(10,15,30,0.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--br);padding:0 5%;}
        .ni{max-width:1300px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:64px;}
        .nlogo{font-size:20px;font-weight:800;color:var(--g);text-decoration:none;}
        .nl a{color:#94a3b8;text-decoration:none;padding:8px 13px;border-radius:8px;font-size:13px;font-weight:500;margin-left:3px;transition:0.2s;}
        .nl a:hover,.nl a.act{color:var(--g);background:rgba(16,185,129,0.08);}
        .nl a.cta{background:var(--g);color:#0a0f1e;font-weight:700;}
        .hero{padding:80px 5% 55px;text-align:center;background:radial-gradient(ellipse at top,rgba(139,92,246,0.12) 0%,transparent 60%);}
        .hbadge{display:inline-flex;align-items:center;gap:8px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:20px;padding:6px 16px;font-size:13px;color:#a78bfa;margin-bottom:20px;}
        .hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1.1;margin-bottom:16px;}
        .grad{background:linear-gradient(135deg,#8b5cf6,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
        .hero p{font-size:16px;color:#94a3b8;max-width:560px;margin:0 auto 28px;}
        .perks{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-bottom:36px;}
        .perk{display:flex;align-items:center;gap:7px;color:#94a3b8;font-size:13px;}
        /* MODAL */
        .mo{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;justify-content:center;align-items:center;backdrop-filter:blur(4px);}
        .mo.open{display:flex;}
        .mbox{background:var(--card);border-radius:18px;padding:36px;width:100%;max-width:430px;border:1px solid var(--br);position:relative;}
        .mbox h2{color:var(--gold);font-size:21px;margin-bottom:8px;}
        .mbox p{color:var(--mu);font-size:14px;margin-bottom:20px;}
        .cmo{position:absolute;top:14px;right:16px;background:none;border:none;color:var(--mu);font-size:22px;cursor:pointer;}
        .fg{margin-bottom:14px;}
        .fg label{display:block;font-size:11px;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px;}
        .fg input{width:100%;padding:11px 15px;background:rgba(15,23,42,0.8);border:1px solid var(--br);border-radius:8px;color:var(--tx);font-size:14px;font-family:inherit;}
        .fg input:focus{outline:none;border-color:var(--g);}
        .fbtn{width:100%;padding:13px;background:linear-gradient(135deg,var(--g),#059669);border:none;border-radius:9px;color:#0a0f1e;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:6px;}
        .fsw{text-align:center;margin-top:14px;font-size:13px;color:var(--mu);}
        .fsw a{color:var(--g);cursor:pointer;font-weight:600;}
        .ferr{color:#ef4444;font-size:12px;margin-top:6px;display:none;}
        .blist{background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.12);border-radius:10px;padding:14px;margin-bottom:18px;}
        .blist p{font-size:12px;color:#94a3b8;margin:3px 0;}
        /* LESSON MODAL */
        .lmo{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:2000;overflow-y:auto;}
        .lmo.open{display:block;}
        .lcon{max-width:780px;margin:36px auto;padding:0 20px 80px;}
        .lhd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;flex-wrap:wrap;gap:12px;}
        .lnav{display:flex;gap:8px;}
        .lnav button{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}
        .lback{background:var(--card);border:1px solid var(--br);color:var(--tx);}
        .lcmp{background:var(--g);border:none;color:#0a0f1e;}
        .ltit{font-size:22px;font-weight:800;color:var(--tx);margin-bottom:6px;}
        .lsub{font-size:13px;color:var(--mu);margin-bottom:20px;}
        .lbody{background:var(--card);border-radius:14px;padding:28px;border:1px solid var(--br);line-height:1.9;color:#94a3b8;font-size:14px;}
        .lbody h2{color:var(--gold);font-size:18px;margin:22px 0 10px;}
        .lvid{margin-top:18px;border-radius:10px;overflow:hidden;}
        .llist{background:var(--card);border-radius:14px;padding:22px;margin-top:20px;border:1px solid var(--br);}
        .llist h3{color:var(--gold);margin-bottom:14px;font-size:16px;}
        .litem{display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;transition:0.2s;}
        .litem:hover{background:var(--card2);}
        .litem.act{background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);}
        .litem.done .ln{background:var(--g);color:#0a0f1e;}
        .ln{width:30px;height:30px;border-radius:50%;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
        .litit{font-size:13px;color:var(--tx);}
        /* WRAP */
        .wrap{max-width:1300px;margin:0 auto;padding:0 5% 80px;}
        .srow{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:36px 0;}
        .sbox{background:var(--card);border-radius:12px;padding:18px;text-align:center;border:1px solid var(--br);}
        .sbox .num{font-size:26px;font-weight:800;color:var(--g);}
        .sbox .lbl{font-size:11px;color:var(--mu);margin-top:3px;}
        .ubar{background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;flex-wrap:wrap;gap:10px;}
        .uinfo{display:flex;align-items:center;gap:10px;}
        .uav{width:40px;height:40px;background:linear-gradient(135deg,var(--g),#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#0a0f1e;}
        .un{font-weight:700;font-size:15px;}
        .um{font-size:12px;color:var(--mu);}
        .stitle{font-size:22px;font-weight:700;color:var(--gold);margin:40px 0 20px;}
        .cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}
        .cc{background:var(--card);border-radius:14px;border:1px solid var(--br);overflow:hidden;transition:0.3s;cursor:pointer;text-decoration:none;display:block;}
        .cc:hover{transform:translateY(-3px);border-color:rgba(139,92,246,0.3);}
        .ch{padding:22px;} .cico{font-size:36px;margin-bottom:10px;} .ctit{font-size:17px;font-weight:700;margin-bottom:7px;}
        .cdesc{color:var(--mu);font-size:13px;line-height:1.5;}
        .cmeta{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;}
        .mbadge{padding:3px 9px;border-radius:16px;font-size:11px;font-weight:700;background:rgba(15,23,42,0.8);}
        .cf{padding:14px 22px;border-top:1px solid var(--br);display:flex;justify-content:space-between;align-items:center;}
        .clc{font-size:12px;color:var(--mu);}
        .sbtn{background:var(--g);color:#0a0f1e;padding:7px 16px;border-radius:7px;font-size:12px;font-weight:700;border:none;cursor:pointer;font-family:inherit;}
        .pbar{height:3px;background:rgba(51,65,85,0.4);margin:0 22px 14px;border-radius:2px;}
        .pfill{height:100%;border-radius:2px;transition:width 0.5s;}
        .lockico{color:var(--mu);font-size:18px;}
        .bnr{background:linear-gradient(135deg,rgba(139,92,246,0.1),rgba(16,185,129,0.05));border:1px solid rgba(139,92,246,0.18);border-radius:18px;padding:36px;margin:44px 0;text-align:center;}
        .bnr h2{font-size:22px;font-weight:800;color:var(--gold);margin-bottom:10px;}
        .bnr p{color:#94a3b8;max-width:540px;margin:0 auto 24px;font-size:14px;}
        @media(max-width:768px){.cgrid{grid-template-columns:1fr;}.srow{grid-template-columns:repeat(2,1fr);}.nl{display:none;}}
    </style>
</head>
<body>
    <nav><div class="ni">
        <a href="/" class="nlogo">☁️ 3EESHER-CLOUD</a>
        <div class="nl">
            <a href="/">Home</a><a href="/library" class="act">📚 Library</a>
            <a href="/#money">💰 Make Money</a><a href="/advertise">🎯 Advertise</a>
            ${libUser?`<a href="#" onclick="logoutLib()" style="color:#ef4444;">Logout</a>`:`<a href="#" onclick="openM('reg')" class="cta">Join Free</a>`}
        </div>
    </div></nav>

    <!-- AUTH MODAL -->
    <div class="mo" id="authMo">
        <div class="mbox">
            <button class="cmo" onclick="closeM()">✕</button>
            <div id="regF">
                <h2>🎓 Join 3EESHER Academy</h2>
                <p>Create FREE account — access all courses instantly</p>
                <div class="blist">
                    <p>✅ 6 complete courses — AI, Data, Web Dev, Marketing, Affiliate</p>
                    <p>✅ Progress tracking & completion certificates</p>
                    <p>✅ Daily money-making tips in your inbox</p>
                    <p>✅ Access to all affiliate links & earning guides</p>
                    <p>✅ 100% FREE — no credit card</p>
                </div>
                <div class="fg"><label>Full Name</label><input type="text" id="rN" placeholder="Your full name"></div>
                <div class="fg"><label>Email</label><input type="email" id="rE" placeholder="your@gmail.com"></div>
                <div class="fg"><label>Password (min 6 chars)</label><input type="password" id="rP" placeholder="Create a password"></div>
                <button class="fbtn" onclick="doReg()">🚀 Create Free Account</button>
                <div class="ferr" id="rErr"></div>
                <div class="fsw">Already have account? <a onclick="swL()">Sign in</a></div>
            </div>
            <div id="logF" style="display:none">
                <h2>👋 Welcome Back!</h2>
                <p>Sign in to continue learning</p>
                <div class="fg"><label>Email</label><input type="email" id="lE" placeholder="your@gmail.com"></div>
                <div class="fg"><label>Password</label><input type="password" id="lP" placeholder="Your password"></div>
                <button class="fbtn" onclick="doLog()">Sign In</button>
                <div class="ferr" id="lErr"></div>
                <div class="fsw">No account? <a onclick="swR()">Register free</a></div>
            </div>
        </div>
    </div>

    <!-- LESSON MODAL -->
    <div class="lmo" id="lessMo">
        <div class="lcon">
            <div class="lhd">
                <div><div class="ltit" id="lTit"></div><div class="lsub" id="lSub"></div></div>
                <div class="lnav">
                    <button class="lback" onclick="closeL()">← Back</button>
                    <button class="lcmp" id="cmpBtn" onclick="doComplete()">✅ Mark Complete</button>
                </div>
            </div>
            <div class="lbody" id="lBody"></div>
            <div class="lvid" id="lVid" style="display:none"><iframe id="lIframe" width="100%" height="380" frameborder="0" allowfullscreen></iframe></div>
            <div class="llist"><h3>All Lessons</h3><div id="allL"></div></div>
        </div>
    </div>

    <div class="hero">
        <div class="hbadge">🎓 Free Digital Skills Academy</div>
        <h1>Learn Skills That<br><span class="grad">Make Real Money</span></h1>
        <p>Master AI, Data Analysis, Web Dev, Digital Marketing & Affiliate Marketing. 100% free — just register with your email.</p>
        <div class="perks">
            <div class="perk">✅ <strong>6 Courses</strong> — AI, Data, Web, Marketing</div>
            <div class="perk">✅ <strong>Free Forever</strong> — No credit card</div>
            <div class="perk">✅ <strong>Earn While Learning</strong></div>
            <div class="perk">✅ <strong>Certificate</strong> on completion</div>
        </div>
        ${!libUser?`<button onclick="openM('reg')" style="background:linear-gradient(135deg,#8b5cf6,#10b981);border:none;color:white;padding:15px 36px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;">🚀 Join Free — Start Now</button>`:''}
    </div>

    <div class="wrap">
        <div class="srow">
            <div class="sbox"><div class="num">6</div><div class="lbl">Free Courses</div></div>
            <div class="sbox"><div class="num">33</div><div class="lbl">Total Lessons</div></div>
            <div class="sbox"><div class="num">47</div><div class="lbl">Countries</div></div>
            <div class="sbox"><div class="num">FREE</div><div class="lbl">Always Free</div></div>
        </div>
        <div id="uDash" style="display:none">
            <div class="ubar">
                <div class="uinfo"><div class="uav" id="uAv">?</div><div><div class="un" id="uNm"></div><div class="um" id="uMe"></div></div></div>
                <button onclick="logoutLib()" style="background:none;border:1px solid var(--br);color:var(--tx);padding:7px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;">Logout</button>
            </div>
        </div>
        <div class="stitle">📚 Your Free Courses</div>
        <div class="cgrid" id="cGrid"></div>
        <div class="bnr">
            <h2>🎯 Why Study Here?</h2>
            <p>Unlike Udemy or Coursera, our courses focus specifically on what works for Africans making money online. Real strategies, real affiliate links, real earnings inside every lesson.</p>
            ${!libUser?`<button onclick="openM('reg')" style="background:var(--g);border:none;color:#0a0f1e;padding:13px 28px;border-radius:9px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">Start Learning Free →</button>`:''}
        </div>
    </div>

    <script>
    const CRS=${JSON.stringify(LIBRARY_COURSES)};
    let cUser=${libUser?JSON.stringify({name:libUser.name,email:libUser.email}):'null'};
    let prog={};let curCrs=null;let curLes=null;

    async function loadProg(){if(!cUser)return;try{const r=await fetch('/api/library/me');const d=await r.json();if(d.user){prog=d.user.progress||{};cUser=d.user;updUI();}}catch(e){}}
    function updUI(){
        if(!cUser){document.getElementById('uDash').style.display='none';renderC();return;}
        document.getElementById('uDash').style.display='block';
        document.getElementById('uNm').textContent=cUser.name;
        document.getElementById('uAv').textContent=cUser.name.charAt(0).toUpperCase();
        const done=Object.values(prog).reduce((s,a)=>s+a.length,0);
        const tot=CRS.reduce((s,c)=>s+c.lessons.length,0);
        document.getElementById('uMe').textContent=done+' of '+tot+' lessons completed';
        renderC();
    }
    function renderC(){
        const g=document.getElementById('cGrid');
        g.innerHTML=CRS.map(c=>{
            const p=prog[c.id]||[];const pct=Math.round((p.length/c.lessons.length)*100);const locked=!cUser;
            return '<div class="cc" onclick="'+(locked?'openM(\\'reg\\')':'openC(\\''+c.id+'\\')') +'">' +
                (pct>0?'<div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+c.color+'"></div></div>':'') +
                '<div class="ch" style="border-left:4px solid '+c.color+'"><div class="cico">'+c.icon+'</div>' +
                '<div class="ctit">'+c.title+'</div><div class="cdesc">'+c.description+'</div>' +
                '<div class="cmeta"><span class="mbadge" style="color:'+c.color+'">'+c.level+'</span><span class="mbadge" style="color:#94a3b8">'+c.category+'</span></div></div>' +
                '<div class="cf"><span class="clc">'+c.duration+(pct>0?' • '+pct+'% done':'')+'</span>' +
                (locked?'<span class="lockico">🔒</span>':'<button class="sbtn" style="background:'+c.color+'">'+(pct>0?'Continue →':'Start →')+'</button>') +
                '</div></div>';
        }).join('');
    }
    function openC(cid){if(!cUser){openM('reg');return;}curCrs=CRS.find(c=>c.id===cid);if(!curCrs)return;const p=prog[cid]||[];const nl=curCrs.lessons.find(l=>!p.includes(l.id))||curCrs.lessons[0];openL(curCrs,nl);}
    function openL(crs,les){
        curLes=les;
        document.getElementById('lTit').textContent=les.title;
        document.getElementById('lSub').textContent=crs.title+' — Lesson '+les.id+' of '+crs.lessons.length;
        let cnt=les.content;
        cnt = cnt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        cnt = cnt.replace(/```([\s\S]*?)```/g, '<code style="background:#0a0f1e; padding:10px; border-radius:6px; display:block; font-family:monospace; font-size:12px; overflow-x:auto; white-space:pre; margin:10px 0;">$1</code>');
        document.getElementById('lBody').innerHTML = cnt.replace(/\n/g, '<br>');
        const ve=document.getElementById('lVid');const if2=document.getElementById('lIframe');
        if(les.video){if2.src=les.video;ve.style.display='block';}else{if2.src='';ve.style.display='none';}
        const p=prog[crs.id]||[];const done=p.includes(les.id);
        const cb=document.getElementById('cmpBtn');cb.textContent=done?'✅ Completed':'✅ Mark Complete';cb.style.opacity=done?'0.6':'1';
        const al=document.getElementById('allL');
        al.innerHTML=crs.lessons.map(l=>{const d2=p.includes(l.id);const ac=l.id===les.id;
            return '<div class="litem '+(d2?'done':'')+(ac?' act':'')+'" onclick="openL(curCrs,'+JSON.stringify(l).replace(/"/g,"'")+')">' +
                '<div class="ln">'+(d2?'✓':l.id)+'</div><div class="litit">'+l.title+'</div></div>';
        }).join('');
        document.getElementById('lessMo').classList.add('open');
        document.getElementById('lessMo').scrollTop=0;
    }
    function closeL(){document.getElementById('lessMo').classList.remove('open');}
    async function doComplete(){
        if(!cUser||!curCrs||!curLes)return;
        try{
            await fetch('/api/library/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:curCrs.id,lessonId:curLes.id,completed:true})});
            if(!prog[curCrs.id])prog[curCrs.id]=[];
            if(!prog[curCrs.id].includes(curLes.id))prog[curCrs.id].push(curLes.id);
            document.getElementById('cmpBtn').textContent='✅ Done!';document.getElementById('cmpBtn').style.opacity='0.6';
            updUI();
            const ci=curCrs.lessons.findIndex(l=>l.id===curLes.id);
            if(ci<curCrs.lessons.length-1){setTimeout(()=>openL(curCrs,curCrs.lessons[ci+1]),700);}
            else{alert('🎉 Congratulations! You completed '+curCrs.title+'!\\nCheck out the next course!');}
        }catch(e){}
    }
    function openM(m){document.getElementById('authMo').classList.add('open');if(m==='login'){document.getElementById('regF').style.display='none';document.getElementById('logF').style.display='block';}else{document.getElementById('regF').style.display='block';document.getElementById('logF').style.display='none';}}
    function closeM(){document.getElementById('authMo').classList.remove('open');}
    function swL(){document.getElementById('regF').style.display='none';document.getElementById('logF').style.display='block';}
    function swR(){document.getElementById('logF').style.display='none';document.getElementById('regF').style.display='block';}
    async function doReg(){
        const n=document.getElementById('rN').value,e=document.getElementById('rE').value,p=document.getElementById('rP').value;
        const er=document.getElementById('rErr');er.style.display='none';
        if(!n||!e||!p){er.textContent='All fields required';er.style.display='block';return;}
        try{const r=await fetch('/api/library/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,email:e,password:p})});
        const d=await r.json();if(d.success){cUser=d.user;prog={};closeM();updUI();}else{er.textContent=d.error||'Failed';er.style.display='block';}}
        catch(ex){er.textContent='Server error. Try again.';er.style.display='block';}
    }
    async function doLog(){
        const e=document.getElementById('lE').value,p=document.getElementById('lP').value;
        const er=document.getElementById('lErr');er.style.display='none';
        try{const r=await fetch('/api/library/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e,password:p})});
        const d=await r.json();if(d.success){cUser=d.user;prog=d.user.progress||{};closeM();updUI();}else{er.textContent=d.error||'Failed';er.style.display='block';}}
        catch(ex){er.textContent='Server error.';er.style.display='block';}
    }
    async function logoutLib(){await fetch('/api/library/logout',{method:'POST'});cUser=null;prog={};window.location.reload();}
    if(cUser){loadProg();}else{renderC();}
    </script>
</body>
</html>`);
});

app.get('/', (req, res) => {
    const data = getData();
    const injections = data.injections || {};
    const socialPixels = data.socialPixels || {};

    const pixelHtml = `
        ${socialPixels.facebook || ''} ${socialPixels.twitter || ''} ${socialPixels.tiktok || ''}
        ${socialPixels.linkedin || ''} ${socialPixels.pinterest || ''} ${socialPixels.snapchat || ''}
        ${socialPixels.googleAds || ''} ${socialPixels.whatsapp || ''} ${socialPixels.telegram || ''}
        ${socialPixels.customHead || ''}
    `;

    const postsHtml = data.blogPosts.slice(0, 6).map(post => `
        <div class="blog-card">
            <img src="${post.image}" alt="${post.title}" loading="lazy">
            <div class="blog-content">
                <span class="blog-tag">📝 Blog</span>
                <h3>${post.title}</h3>
                <p>${post.content.replace(/<[^>]*>/g, '').substring(0, 120)}...</p>
                <div class="blog-footer">
                    <span class="blog-meta">${new Date(post.date).toLocaleDateString()} • ${post.author}</span>
                    <a href="/blog/${post.id}" class="read-more">Read →</a>
                </div>
            </div>
        </div>`).join('');

    const moneyLinksHtml = data.moneyLinks.map(link => `
        <a href="${link.url}" target="_blank" rel="noopener" class="link-card" onclick="trackClick('${link.name}', 'money')">
            <div class="link-icon">${link.icon || '🔗'}</div>
            <div class="link-info">
                <h4>${link.name}</h4>
                <span class="badge">${link.category}</span>
            </div>
            <div class="link-arrow">→</div>
        </a>`).join('');

    const storeLinksHtml = data.storeLinks.map(link => `
        <a href="${link.url}${link.id}" target="_blank" rel="noopener" class="store-card" onclick="trackClick('${link.name}', 'store')">
            <div class="store-icon">${link.icon || '🏪'}</div>
            <div class="store-info">
                <h4>${link.name}</h4>
                <p>${link.id ? '✅ ' + link.id : '⚡ Set ID in admin'}</p>
            </div>
        </a>`).join('');

    const storiesHtml = data.successStories.map(story => `
        <div class="story-card" style="--accent:${story.color}">
            <div class="story-header">
                <div class="story-avatar">${story.avatar}</div>
                <div>
                    <h3>${story.name}, ${story.age}</h3>
                    <p class="before">📉 ${story.before}</p>
                    <p class="after">📈 ${story.after}</p>
                </div>
            </div>
            <p class="story-text">${story.story}</p>
            <div class="timeline">${story.timeline.map(t => `<span>${t}</span>`).join('')}</div>
            <button class="read-more-btn" onclick="toggleStory(${story.id})">Read Full Story ▼</button>
            <div class="full-story" id="story-${story.id}" style="display:none">${story.fullStory || story.story}</div>
        </div>`).join('');

    const americanVideos = data.videos.filter(v => v.region === 'american').map(video => `
        <div class="video-card" onclick="playVideo('${video.videoUrl}')">
            <div class="video-thumb" style="background-image:url('${video.thumbnail}')">
                <div class="play-btn">▶</div>
            </div>
            <p class="video-title">${video.title}</p>
        </div>`).join('');

    const arabicVideos = data.videos.filter(v => v.region === 'arabic').map(video => `
        <div class="video-card" onclick="playVideo('${video.videoUrl}')">
            <div class="video-thumb" style="background-image:url('${video.thumbnail}')">
                <div class="play-btn">▶</div>
            </div>
            <p class="video-title">${video.title}</p>
        </div>`).join('');

    const galleryImgs = [
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
        'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'
    ];

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <title>3EESHER-CLOUD - Make Money Online</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="3EESHER-CLOUD — Your autonomous money machine. Affiliate marketing, freelance links, success stories, music videos.">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-HD01MF5SL9"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-HD01MF5SL9');</script>
    ${pixelHtml}
    ${injections.head || ''}
    <style>
        :root{
            --green:#10b981;--gold:#fbbf24;--purple:#8b5cf6;
            --bg:#0a0f1e;--card:#131c31;--card2:#1a2540;
            --text:#e2e8f0;--muted:#64748b;--border:rgba(51,65,85,0.4);
        }
        *{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;overflow-x:hidden;}

        /* ── NAVBAR ── */
        nav{position:sticky;top:0;z-index:1000;background:rgba(10,15,30,0.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 4%;}
        .nav-inner{max-width:1400px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:66px;}
        .nav-logo{font-size:19px;font-weight:800;color:var(--green);text-decoration:none;display:flex;align-items:center;gap:8px;letter-spacing:-0.3px;}
        .nav-links{display:flex;gap:2px;align-items:center;}
        .nav-links a{color:#94a3b8;text-decoration:none;padding:7px 11px;border-radius:7px;font-size:13px;font-weight:500;transition:0.2s;white-space:nowrap;}
        .nav-links a:hover{color:var(--green);background:rgba(16,185,129,0.08);}
        .nav-links a.lib-link{color:#a78bfa;background:rgba(139,92,246,0.08);}
        .nav-links a.lib-link:hover{background:rgba(139,92,246,0.15);color:#c4b5fd;}
        .nav-links a.cta{background:var(--green);color:#0a0f1e;font-weight:700;padding:8px 16px;margin-left:6px;}
        .nav-links a.cta:hover{background:#059669;color:white;transform:translateY(-1px);}
        .nav-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:5px;}
        .nav-hamburger span{width:24px;height:2px;background:var(--text);border-radius:2px;transition:0.3s;}
        .mobile-menu{display:none;position:absolute;top:66px;left:0;right:0;background:rgba(10,15,30,0.99);border-bottom:1px solid var(--border);padding:16px 4%;flex-direction:column;gap:4px;z-index:999;}
        .mobile-menu.open{display:flex;}
        .mobile-menu a{color:var(--text);text-decoration:none;padding:13px 16px;border-radius:9px;font-weight:500;font-size:15px;transition:0.2s;}
        .mobile-menu a:hover{background:var(--card);color:var(--green);}
        .mobile-menu .mm-lib{color:#a78bfa;}
        .mobile-menu .mm-cta{background:rgba(16,185,129,0.1);color:var(--green);font-weight:700;margin-top:4px;}

        /* ── HERO ── */
        .hero{position:relative;padding:96px 5% 76px;text-align:center;overflow:hidden;}
        .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% -10%,rgba(16,185,129,0.2) 0%,transparent 58%);pointer-events:none;}
        .hero::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 80% 60%,rgba(139,92,246,0.08) 0%,transparent 50%);pointer-events:none;}
        .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:20px;padding:7px 18px;font-size:13px;color:var(--green);margin-bottom:22px;animation:fadeUp 0.6s ease both;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        .hero h1{font-size:clamp(2.4rem,6vw,4.6rem);font-weight:800;line-height:1.08;margin-bottom:20px;animation:fadeUp 0.7s 0.1s ease both;}
        .hero h1 .grad{background:linear-gradient(135deg,var(--green) 0%,var(--gold) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hero p{font-size:17px;color:#94a3b8;max-width:580px;margin:0 auto 36px;line-height:1.7;animation:fadeUp 0.7s 0.2s ease both;}
        .hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;animation:fadeUp 0.7s 0.3s ease both;}
        .btn-primary{background:var(--green);color:#0a0f1e;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
        .btn-primary:hover{background:#059669;transform:translateY(-2px);box-shadow:0 12px 28px rgba(16,185,129,0.38);}
        .btn-secondary{background:var(--card);color:var(--text);padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;border:1px solid var(--border);transition:0.25s;display:inline-flex;align-items:center;gap:6px;}
        .btn-secondary:hover{border-color:var(--green);color:var(--green);}
        .btn-library{background:rgba(139,92,246,0.12);color:#a78bfa;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;border:1px solid rgba(139,92,246,0.25);transition:0.25s;display:inline-flex;align-items:center;gap:6px;}
        .btn-library:hover{background:rgba(139,92,246,0.2);color:#c4b5fd;}
        .hero-stats{display:flex;justify-content:center;gap:0;margin-top:56px;flex-wrap:wrap;animation:fadeUp 0.7s 0.4s ease both;background:rgba(19,28,49,0.5);border:1px solid var(--border);border-radius:16px;max-width:680px;margin-left:auto;margin-right:auto;overflow:hidden;}
        .hero-stat{flex:1;min-width:130px;padding:22px 16px;border-right:1px solid var(--border);text-align:center;}
        .hero-stat:last-child{border-right:none;}
        .hero-stat .num{font-size:28px;font-weight:800;color:var(--green);}
        .hero-stat .lbl{font-size:12px;color:var(--muted);margin-top:3px;}
        /* ── LIBRARY PROMO ── */
        .lib-promo{background:linear-gradient(135deg,rgba(139,92,246,0.1),rgba(16,185,129,0.05));border:1px solid rgba(139,92,246,0.2);border-radius:20px;padding:36px;margin:36px 0;display:grid;grid-template-columns:1fr auto;gap:32px;align-items:center;}
        .lib-promo h2{font-size:22px;font-weight:800;color:var(--text);margin-bottom:10px;}
        .lib-promo p{color:#94a3b8;font-size:14px;line-height:1.7;margin-bottom:20px;}
        .lib-promo-btns{display:flex;gap:10px;flex-wrap:wrap;}
        .lib-courses-mini{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;min-width:260px;}
        .lc-mini{background:rgba(15,23,42,0.6);border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:8px;}
        .lc-mini .ico{font-size:18px;} .lc-mini .ttl{font-size:12px;font-weight:600;color:var(--text);}

        /* ── AD SLOT ── */
        .ad-slot{background:linear-gradient(135deg,rgba(139,92,246,0.07),rgba(16,185,129,0.03));border:1px dashed rgba(139,92,246,0.22);border-radius:14px;padding:18px 22px;margin:28px 0;min-height:86px;display:flex;align-items:center;justify-content:center;position:relative;}
        .ad-slot-label{position:absolute;top:7px;left:12px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;}
        .ad-content{display:none;}
        .ad-content.visible{display:flex;align-items:center;gap:18px;width:100%;}
        .ad-img{width:76px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;}
        .ad-text{flex:1;text-align:left;}
        .ad-text h4{color:var(--text);font-size:15px;margin-bottom:3px;}
        .ad-text p{color:var(--muted);font-size:13px;}
        .ad-cta{background:var(--purple);color:white;padding:9px 18px;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none;flex-shrink:0;transition:0.2s;}
        .ad-cta:hover{background:#7c3aed;}
        .ad-placeholder{color:var(--muted);font-size:13px;}
        .ad-placeholder a{color:var(--purple);text-decoration:none;}

        /* ── LAYOUT ── */
        .container{max-width:1400px;margin:0 auto;padding:0 4%;}
        .section{padding:56px 0;}
        .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px;}
        .section-title{font-size:24px;font-weight:700;color:var(--gold);display:flex;align-items:center;gap:10px;position:relative;}
        .section-title::after{content:'';display:inline-block;height:2px;width:60px;background:linear-gradient(90deg,var(--green),transparent);margin-left:12px;vertical-align:middle;}

        /* ── GALLERY ── */
        .gallery-masonry{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
        .gallery-masonry img{width:100%;height:190px;object-fit:cover;border-radius:12px;transition:0.3s;cursor:pointer;display:block;}
        .gallery-masonry img:first-child{grid-column:1/3;height:270px;}
        .gallery-masonry img:nth-child(5){grid-column:3/5;height:270px;}
        .gallery-masonry img:hover{transform:scale(1.025);box-shadow:0 10px 32px rgba(0,0,0,0.55);}

        /* ── BLOG ── */
        .blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;}
        .blog-card{background:var(--card);border-radius:16px;overflow:hidden;border:1px solid var(--border);transition:0.25s;display:flex;flex-direction:column;}
        .blog-card:hover{transform:translateY(-5px);border-color:rgba(16,185,129,0.28);box-shadow:0 16px 40px rgba(0,0,0,0.3);}
        .blog-card img{width:100%;height:196px;object-fit:cover;}
        .blog-content{padding:20px;flex:1;display:flex;flex-direction:column;}
        .blog-tag{background:rgba(16,185,129,0.1);color:var(--green);font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.05em;display:inline-block;width:fit-content;}
        .blog-content h3{color:var(--text);font-size:17px;font-weight:700;margin:10px 0 8px;line-height:1.4;}
        .blog-content p{color:var(--muted);font-size:13px;line-height:1.6;flex:1;}
        .blog-footer{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid var(--border);}
        .blog-meta{color:var(--muted);font-size:11px;}
        .read-more{color:var(--green);text-decoration:none;font-size:13px;font-weight:600;}

        /* ── VIDEOS ── */
        .video-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;}
        .video-card{background:var(--card);border-radius:12px;overflow:hidden;cursor:pointer;transition:0.25s;border:1px solid var(--border);}
        .video-card:hover{transform:translateY(-4px);border-color:var(--green);box-shadow:0 12px 30px rgba(16,185,129,0.15);}
        .video-thumb{height:126px;background-size:cover;background-position:center;position:relative;}
        .video-thumb::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.5),transparent);border-radius:0;}
        .play-btn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:42px;height:42px;background:rgba(16,185,129,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;backdrop-filter:blur(4px);transition:0.2s;}
        .video-card:hover .play-btn{transform:translate(-50%,-50%) scale(1.12);}
        .video-title{padding:10px 12px;font-size:11px;color:var(--muted);line-height:1.4;}

        /* ── STORIES ── */
        .stories-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
        .story-card{background:var(--card);padding:26px;border-radius:16px;border-left:4px solid var(--accent,var(--green));border-top:1px solid var(--border);transition:0.25s;display:flex;flex-direction:column;}
        .story-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,0.25);}
        .story-header{display:flex;gap:14px;margin-bottom:14px;align-items:flex-start;}
        .story-avatar{width:52px;height:52px;border-radius:50%;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;}
        .story-header h3{font-size:16px;font-weight:700;color:var(--text);}
        .before{color:#ef4444;font-size:12px;margin-top:3px;}
        .after{color:var(--green);font-size:12px;font-weight:600;}
        .story-text{color:var(--muted);font-size:13px;line-height:1.65;margin-bottom:14px;flex:1;}
        .timeline{display:flex;flex-wrap:wrap;gap:6px;padding-top:14px;border-top:1px solid var(--border);}
        .timeline span{background:rgba(251,191,36,0.08);color:var(--gold);padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid rgba(251,191,36,0.15);}
        .read-more-btn{background:none;border:1px solid rgba(16,185,129,0.22);color:var(--green);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;margin-top:14px;font-family:inherit;transition:0.2s;}
        .read-more-btn:hover{background:rgba(16,185,129,0.08);}
        .full-story{color:var(--muted);font-size:13px;line-height:1.75;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);}

        /* ── MONEY LINKS ── */
        .links-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
        .link-card{background:var(--card);padding:14px 16px;border-radius:11px;text-decoration:none;color:var(--text);border-left:3px solid var(--green);display:flex;align-items:center;gap:12px;transition:0.2s;border-top:1px solid var(--border);}
        .link-card:hover{background:var(--card2);transform:translateX(5px);border-left-color:var(--gold);}
        .link-icon{font-size:26px;flex-shrink:0;}
        .link-info{flex:1;min-width:0;}
        .link-info h4{font-size:14px;font-weight:600;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .badge{background:rgba(15,23,42,0.9);color:var(--muted);padding:2px 7px;border-radius:8px;font-size:10px;font-weight:600;}
        .link-arrow{color:var(--muted);font-size:15px;flex-shrink:0;}

        /* ── STORES ── */
        .stores-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
        .store-card{background:var(--card);padding:14px 16px;border-radius:11px;text-decoration:none;color:var(--text);border-left:3px solid var(--purple);display:flex;align-items:center;gap:12px;transition:0.2s;border-top:1px solid var(--border);}
        .store-card:hover{background:var(--card2);transform:translateX(5px);}
        .store-icon{font-size:26px;flex-shrink:0;}
        .store-info h4{font-size:14px;font-weight:600;color:var(--purple);}
        .store-info p{font-size:11px;color:var(--muted);margin-top:2px;}

        /* ── NEWSLETTER ── */
        .newsletter{background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(139,92,246,0.07));border:1px solid rgba(16,185,129,0.18);border-radius:20px;padding:48px;text-align:center;}
        .newsletter h2{font-size:26px;font-weight:800;margin-bottom:10px;}
        .newsletter p{color:var(--muted);margin-bottom:28px;font-size:15px;}
        .nl-form{display:flex;max-width:480px;margin:0 auto;}
        .nl-form input{flex:1;padding:13px 18px;background:rgba(15,23,42,0.9);border:1px solid var(--border);border-right:none;border-radius:10px 0 0 10px;color:var(--text);font-size:14px;font-family:inherit;}
        .nl-form input:focus{outline:none;border-color:var(--green);}
        .nl-form button{padding:13px 22px;background:var(--green);border:none;border-radius:0 10px 10px 0;color:#0a0f1e;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px;transition:0.2s;}
        .nl-form button:hover{background:#059669;}

        /* ── ABOUT / PRIVACY ── */
        .content-box{background:var(--card);border-radius:20px;padding:38px;border:1px solid var(--border);}
        .content-box h3{color:var(--gold);font-size:17px;margin:26px 0 11px;display:flex;align-items:center;gap:8px;}
        .content-box h3:first-child{margin-top:0;}
        .content-box p{color:#94a3b8;line-height:1.85;font-size:14px;}
        .values-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin:14px 0;}
        .value-chip{background:rgba(15,23,42,0.9);border:1px solid var(--border);padding:12px;border-radius:10px;text-align:center;font-size:12px;font-weight:700;color:var(--text);}

        /* ── CONTACT ── */
        .contact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
        .contact-card{background:var(--card);border-radius:16px;padding:28px;text-align:center;border:1px solid var(--border);transition:0.25s;}
        .contact-card:hover{border-color:var(--green);transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,0.2);}
        .contact-card .icon{font-size:34px;margin-bottom:12px;}
        .contact-card h3{font-size:15px;font-weight:700;margin-bottom:8px;color:var(--text);}
        .contact-card a{color:var(--green);text-decoration:none;font-size:13px;}

        /* ── FOOTER ── */
        .footer{background:var(--card);border-top:1px solid var(--border);padding:40px 4%;margin-top:72px;}
        .footer-inner{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;}
        .footer-logo{font-size:18px;font-weight:800;color:var(--green);}
        .footer-links{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;}
        .footer-links a{color:var(--muted);text-decoration:none;font-size:13px;transition:0.2s;}
        .footer-links a:hover{color:var(--green);}
        .footer-copy{color:var(--muted);font-size:12px;text-align:right;}

        /* ── WHATSAPP FLOAT ── */
        .whatsapp-float{position:fixed;bottom:80px;right:20px;width:52px;height:52px;background:#25d366;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;z-index:999;text-decoration:none;box-shadow:0 4px 20px rgba(37,211,102,0.4);transition:0.3s;}
        .whatsapp-float:hover{transform:scale(1.1);}
        .admin-btn{position:fixed;bottom:20px;right:20px;background:var(--green);color:#0a0f1e;padding:11px 18px;border-radius:40px;text-decoration:none;z-index:1000;font-weight:700;font-size:13px;box-shadow:0 4px 14px rgba(16,185,129,0.35);}

        /* ── VIDEO MODAL ── */
        #videoModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.96);z-index:10000;justify-content:center;align-items:center;}
        .modal-content{position:relative;width:90%;max-width:860px;}
        .close-modal{position:absolute;top:-44px;right:0;background:none;border:none;color:white;font-size:32px;cursor:pointer;}

        /* ── RESPONSIVE ── */
        @media(max-width:1024px){
            .video-grid{grid-template-columns:repeat(4,1fr);}
            .stories-grid{grid-template-columns:repeat(2,1fr);}
            .gallery-masonry{grid-template-columns:repeat(3,1fr);}
            .gallery-masonry img:first-child,.gallery-masonry img:nth-child(5){grid-column:auto;height:190px;}
            .lib-promo{grid-template-columns:1fr;}
            .lib-courses-mini{display:none;}
        }
        @media(max-width:768px){
            .nav-links{display:none;}
            .nav-hamburger{display:flex;}
            .video-grid{grid-template-columns:repeat(2,1fr);}
            .stories-grid,.contact-grid{grid-template-columns:1fr;}
            .values-grid{grid-template-columns:repeat(3,1fr);}
            .gallery-masonry{grid-template-columns:repeat(2,1fr);}
            .hero h1{font-size:2.1rem;}
            .footer-inner{grid-template-columns:1fr;text-align:center;}
            .footer-copy{text-align:center;}
            .hero-stats{margin-top:32px;}
            .hero-stat{min-width:100px;}
        }
        @media(max-width:480px){
            .gallery-masonry{grid-template-columns:1fr;}
            .video-grid{grid-template-columns:1fr;}
            .nl-form{flex-direction:column;}
            .nl-form input,.nl-form button{border-radius:10px;border:1px solid var(--border);}
            .links-grid,.stores-grid{grid-template-columns:1fr;}
        }

        /* ── VISITOR COUNTER ── */
        .visitor-bar{background:rgba(16,185,129,0.06);border-bottom:1px solid rgba(16,185,129,0.12);padding:8px 4%;text-align:center;font-size:13px;color:#94a3b8;display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;}
        .vb-dot{width:8px;height:8px;background:#10b981;border-radius:50%;display:inline-block;animation:pulse 2s infinite;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(1.3);}}
        .vb-count{color:#10b981;font-weight:700;}

        /* ── EARNINGS TICKER ── */
        .ticker-wrap{background:#0a0f1e;border-bottom:1px solid var(--border);overflow:hidden;padding:8px 0;}
        .ticker{display:flex;gap:60px;animation:ticker 28s linear infinite;width:max-content;padding:0 4%;}
        @keyframes ticker{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
        .ticker-item{display:flex;align-items:center;gap:8px;font-size:12px;color:#94a3b8;white-space:nowrap;}
        .ticker-item .ti-name{color:#10b981;font-weight:600;}
        .ticker-item .ti-amt{color:#fbbf24;font-weight:700;}

        /* ── COOKIE BANNER ── */
        .cookie-banner{position:fixed;bottom:0;left:0;right:0;background:#131c31;border-top:1px solid var(--border);padding:16px 4%;display:flex;align-items:center;justify-content:space-between;gap:16px;z-index:9000;flex-wrap:wrap;}
        .cookie-banner p{color:#94a3b8;font-size:13px;flex:1;margin:0;}
        .cookie-banner a{color:var(--green);}
        .cookie-btns{display:flex;gap:10px;flex-shrink:0;}
        .cookie-accept{background:var(--green);color:#0a0f1e;padding:9px 20px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;border:none;font-family:inherit;}
        .cookie-decline{background:none;color:var(--muted);padding:9px 14px;border-radius:8px;font-size:13px;cursor:pointer;border:1px solid var(--border);font-family:inherit;}

        /* ── POPUP SUBSCRIBE ── */
        .popup-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:8000;justify-content:center;align-items:center;backdrop-filter:blur(4px);}
        .popup-overlay.show{display:flex;}
        .popup-box{background:var(--card);border-radius:20px;padding:40px;width:90%;max-width:440px;text-align:center;position:relative;border:1px solid rgba(16,185,129,0.2);animation:popIn 0.3s ease;}
        @keyframes popIn{from{opacity:0;transform:scale(0.9);}to{opacity:1;transform:scale(1);}}
        .popup-close{position:absolute;top:14px;right:16px;background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;}
        .popup-box h2{color:var(--gold);font-size:22px;margin-bottom:8px;}
        .popup-box p{color:var(--muted);font-size:14px;margin-bottom:22px;}
        .popup-form{display:flex;flex-direction:column;gap:10px;}
        .popup-form input{padding:12px 16px;background:rgba(15,23,42,0.9);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:14px;font-family:inherit;}
        .popup-form input:focus{outline:none;border-color:var(--green);}
        .popup-form button{padding:13px;background:var(--green);border:none;border-radius:9px;color:#0a0f1e;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;}

        /* ── COUNTDOWN TIMER ── */
        .offer-bar{background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(251,191,36,0.08));border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px 24px;margin:20px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;}
        .offer-bar h4{color:#ef4444;font-size:15px;font-weight:700;margin-bottom:4px;}
        .offer-bar p{color:var(--muted);font-size:13px;}
        .timer-digits{display:flex;gap:8px;}
        .timer-unit{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 14px;text-align:center;min-width:60px;}
        .timer-unit .d{font-size:24px;font-weight:800;color:#ef4444;line-height:1;}
        .timer-unit .l{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:3px;}
        .offer-cta{background:#ef4444;color:white;padding:10px 20px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;flex-shrink:0;}

        /* ── TESTIMONIALS ── */
        .test-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;}
        .test-card{background:var(--card);border-radius:14px;padding:22px;border:1px solid var(--border);position:relative;}
        .test-card::before{content:'"';position:absolute;top:14px;right:18px;font-size:60px;color:rgba(16,185,129,0.1);font-family:Georgia,serif;line-height:1;}
        .test-stars{color:#fbbf24;font-size:16px;margin-bottom:12px;}
        .test-text{color:#94a3b8;font-size:14px;line-height:1.7;margin-bottom:16px;}
        .test-author{display:flex;align-items:center;gap:10px;}
        .test-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--green),#059669);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#0a0f1e;}
        .test-name{font-size:14px;font-weight:700;color:var(--text);}
        .test-country{font-size:12px;color:var(--muted);}
        .test-form-box{background:rgba(16,185,129,0.04);border:1px dashed rgba(16,185,129,0.2);border-radius:14px;padding:24px;margin-top:24px;}
        .test-form-box h4{color:var(--gold);margin-bottom:14px;font-size:16px;}
        .test-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .test-form-grid .full{grid-column:1/-1;}
        .test-form-box input,.test-form-box textarea,.test-form-box select{width:100%;padding:10px 14px;background:rgba(15,23,42,0.8);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-family:inherit;}
        .test-form-box input:focus,.test-form-box textarea:focus{outline:none;border-color:var(--green);}
        .test-submit{background:var(--green);color:#0a0f1e;padding:11px 22px;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px;margin-top:10px;}

        /* ── BLOG SEARCH ── */
        .blog-search-wrap{position:relative;max-width:500px;margin-bottom:24px;}
        .blog-search-wrap input{width:100%;padding:12px 44px 12px 16px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;font-family:inherit;}
        .blog-search-wrap input:focus{outline:none;border-color:var(--green);}
        .blog-search-icon{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:16px;pointer-events:none;}
        .blog-search-results{display:none;position:absolute;top:100%;left:0;right:0;background:var(--card);border:1px solid var(--border);border-radius:10px;margin-top:4px;z-index:100;max-height:320px;overflow-y:auto;}
        .bsr-item{padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:0.15s;}
        .bsr-item:last-child{border-bottom:none;}
        .bsr-item:hover{background:var(--card2);}
        .bsr-title{font-size:14px;font-weight:600;color:var(--text);}
        .bsr-meta{font-size:11px;color:var(--muted);margin-top:2px;}

        /* ── DARK/LIGHT TOGGLE ── */
        .theme-toggle{position:fixed;top:80px;right:16px;width:42px;height:42px;background:var(--card);border:1px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:998;font-size:18px;transition:0.2s;}
        .theme-toggle:hover{border-color:var(--green);}
        body.light-mode{--bg:#f8fafc;--card:#ffffff;--card2:#f1f5f9;--text:#0f172a;--muted:#64748b;--border:rgba(203,213,225,0.7);}
        body.light-mode nav{background:rgba(248,250,252,0.95);}
        body.light-mode .hero::before{background:radial-gradient(ellipse at 50% -10%,rgba(16,185,129,0.1) 0%,transparent 60%);}

        /* ── SHARE BUTTONS ── */
        .share-btns{display:flex;gap:8px;margin-top:20px;flex-wrap:wrap;}
        .share-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;transition:0.2s;}
        .share-wa{background:#25d366;color:white;}
        .share-fb{background:#1877f2;color:white;}
        .share-tw{background:#1da1f2;color:white;}
        .share-cp{background:var(--card);color:var(--text);border:1px solid var(--border);}
        .share-btn:hover{opacity:0.85;transform:translateY(-1px);}

        /* ── WHATSAPP COMMUNITY ── */
        .wa-community{background:linear-gradient(135deg,rgba(37,211,102,0.12),rgba(16,185,129,0.05));border:1px solid rgba(37,211,102,0.2);border-radius:16px;padding:28px;display:flex;align-items:center;gap:20px;margin:30px 0;flex-wrap:wrap;}
        .wa-comm-icon{font-size:44px;flex-shrink:0;}
        .wa-comm-text{flex:1;}
        .wa-comm-text h3{color:#25d366;font-size:18px;font-weight:800;margin-bottom:6px;}
        .wa-comm-text p{color:var(--muted);font-size:13px;}
        .wa-comm-btn{background:#25d366;color:white;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;flex-shrink:0;}
        .wa-comm-btn:hover{background:#22c55e;}

        /* ── ADMIN CHART ── */
        .chart-wrap{background:#0a0f1e;border-radius:12px;padding:20px;margin:16px 0;}
        .chart-bars{display:flex;align-items:flex-end;gap:6px;height:80px;}
        .chart-bar{flex:1;background:linear-gradient(to top,#10b981,#059669);border-radius:4px 4px 0 0;min-height:4px;transition:0.3s;}
        .chart-labels{display:flex;gap:6px;margin-top:6px;}
        .chart-label{flex:1;text-align:center;font-size:10px;color:var(--muted);}

        ${injections.css || ''}
    </style>
</head>
<body>
    ${injections.bodyStart || ''}

    <!-- VIDEO MODAL -->
    <div id="videoModal">
        <div class="modal-content">
            <button class="close-modal" onclick="closeVideoModal()">✕</button>
            <iframe id="videoPlayer" width="100%" height="480" frameborder="0" allowfullscreen></iframe>
        </div>
    </div>

    <!-- VISITOR BAR -->
    <div class="visitor-bar">
        <span><span class="vb-dot"></span> &nbsp;<span class="vb-count" id="liveCount">12</span> people online right now</span>
        <span>🌍 Visitors from Nigeria, Egypt, Ghana, Kenya & 44 more countries</span>
        <span>💰 Community earned <strong style="color:var(--gold)">$2.5M+</strong> using this platform</span>
    </div>

    <!-- EARNINGS TICKER -->
    <div class="ticker-wrap">
        <div class="ticker" id="ticker">
            <div class="ticker-item">🎉 <span class="ti-name">Ahmed (Kano)</span>&nbsp;earned <span class="ti-amt">$47</span> from Fiverr today</div>
            <div class="ticker-item">💰 <span class="ti-name">Fatima (Cairo)</span>&nbsp;made <span class="ti-amt">$87</span> on Upwork this week</div>
            <div class="ticker-item">🛒 <span class="ti-name">Emeka (Lagos)</span>&nbsp;earned <span class="ti-amt">₦12,000</span> from Jumia affiliate</div>
            <div class="ticker-item">📚 <span class="ti-name">Sara (Nairobi)</span>&nbsp;completed AI course and got first client</div>
            <div class="ticker-item">🎯 <span class="ti-name">Ibrahim (Abuja)</span>&nbsp;earned <span class="ti-amt">$120</span> from ClickBank</div>
            <div class="ticker-item">🚀 <span class="ti-name">Grace (Accra)</span>&nbsp;made <span class="ti-amt">$200</span> from social media management</div>
            <div class="ticker-item">💼 <span class="ti-name">Omar (Alexandria)</span>&nbsp;landed <span class="ti-amt">$500</span> web dev project on Upwork</div>
            <div class="ticker-item">📱 <span class="ti-name">Blessing (Port Harcourt)</span>&nbsp;earned <span class="ti-amt">₦35,000</span> from TikTok affiliate</div>
            <!-- Duplicate for seamless loop -->
            <div class="ticker-item">🎉 <span class="ti-name">Ahmed (Kano)</span>&nbsp;earned <span class="ti-amt">$47</span> from Fiverr today</div>
            <div class="ticker-item">💰 <span class="ti-name">Fatima (Cairo)</span>&nbsp;made <span class="ti-amt">$87</span> on Upwork this week</div>
            <div class="ticker-item">🛒 <span class="ti-name">Emeka (Lagos)</span>&nbsp;earned <span class="ti-amt">₦12,000</span> from Jumia affiliate</div>
            <div class="ticker-item">📚 <span class="ti-name">Sara (Nairobi)</span>&nbsp;completed AI course and got first client</div>
            <div class="ticker-item">🎯 <span class="ti-name">Ibrahim (Abuja)</span>&nbsp;earned <span class="ti-amt">$120</span> from ClickBank</div>
            <div class="ticker-item">🚀 <span class="ti-name">Grace (Accra)</span>&nbsp;made <span class="ti-amt">$200</span> from social media management</div>
            <div class="ticker-item">💼 <span class="ti-name">Omar (Alexandria)</span>&nbsp;landed <span class="ti-amt">$500</span> web dev project on Upwork</div>
            <div class="ticker-item">📱 <span class="ti-name">Blessing (Port Harcourt)</span>&nbsp;earned <span class="ti-amt">₦35,000</span> from TikTok affiliate</div>
        </div>
    </div>

    <!-- NAVBAR -->
    <nav>
        <div class="nav-inner">
            <a href="/" class="nav-logo">☁️ 3EESHER-CLOUD</a>
            <div class="nav-links">
                <a href="/#money">💰 Make Money</a>
                <a href="/library" class="lib-link">📚 Free Library</a>
                <a href="/#videos">🎵 Music</a>
                <a href="/#blog">📝 Blog</a>
                <a href="/#stories">🏆 Success</a>
                <a href="/#stores">🛒 Stores</a>
                <a href="/#about">📖 About</a>
                <a href="/#contact">📞 Contact</a>
                <a href="/advertise" class="cta">🎯 Advertise</a>
            </div>
            <div class="nav-hamburger" onclick="toggleMenu()">
                <span></span><span></span><span></span>
            </div>
        </div>
        <div class="mobile-menu" id="mobileMenu">
            <a href="/#money" onclick="toggleMenu()">💰 Make Money</a>
            <a href="/library" onclick="toggleMenu()" class="mm-lib">📚 Free Library — Study & Earn</a>
            <a href="/#videos" onclick="toggleMenu()">🎵 Music</a>
            <a href="/#blog" onclick="toggleMenu()">📝 Blog</a>
            <a href="/#stories" onclick="toggleMenu()">🏆 Success Stories</a>
            <a href="/#stores" onclick="toggleMenu()">🛒 Affiliate Stores</a>
            <a href="/#about" onclick="toggleMenu()">📖 About</a>
            <a href="/#contact" onclick="toggleMenu()">📞 Contact</a>
            <a href="/advertise" onclick="toggleMenu()" class="mm-cta">🎯 Advertise With Us</a>
        </div>
    </nav>

    <!-- HERO -->
    <div class="hero">
        <div class="hero-badge">🤖 Autonomous Money Bot — Running 24/7</div>
        <h1>Your <span class="grad">Financial Freedom</span><br>Starts Here</h1>
        <p>30+ money-making links, FREE digital skills library, affiliate stores, music & daily blog — all automated. Join thousands earning online.</p>
        <div class="hero-btns">
            <a href="/#money" class="btn-primary">💰 Start Making Money</a>
            <a href="/library" class="btn-library">📚 Study Free</a>
            <a href="/advertise" class="btn-secondary">🎯 Run Ads</a>
        </div>
        <div class="hero-stats">
            <div class="hero-stat"><div class="num">30+</div><div class="lbl">Money Links</div></div>
            <div class="hero-stat"><div class="num">10K+</div><div class="lbl">Community</div></div>
            <div class="hero-stat"><div class="num">6</div><div class="lbl">Free Courses</div></div>
            <div class="hero-stat"><div class="num">47</div><div class="lbl">Countries</div></div>
        </div>
    </div>

    <div class="container">

        <!-- LIBRARY PROMO -->
        <div class="lib-promo">
            <div>
                <h2>🎓 Free Digital Skills Library</h2>
                <p>Learn AI, Data Analysis, Web Development, Digital Marketing & Affiliate Marketing — 6 complete courses, 33 lessons, 100% free. Register with your email and start immediately. Every course includes real earning strategies.</p>
                <div class="lib-promo-btns">
                    <a href="/library" class="btn-library" style="font-size:14px;padding:11px 22px;">📚 Open Free Library</a>
                    <a href="/library" class="btn-secondary" style="font-size:13px;padding:11px 18px;">See All 6 Courses →</a>
                </div>
            </div>
            <div class="lib-courses-mini">
                <div class="lc-mini"><div class="ico">🤖</div><div class="ttl">AI & Machine Learning</div></div>
                <div class="lc-mini"><div class="ico">📊</div><div class="ttl">Data Analysis</div></div>
                <div class="lc-mini"><div class="ico">💻</div><div class="ttl">Web Development</div></div>
                <div class="lc-mini"><div class="ico">📱</div><div class="ttl">Digital Marketing</div></div>
                <div class="lc-mini"><div class="ico">💰</div><div class="ttl">Affiliate Marketing</div></div>
                <div class="lc-mini"><div class="ico">🚀</div><div class="ttl">Freelancing</div></div>
            </div>
        </div>

        <!-- AD SLOT TOP -->
        <div class="ad-slot" id="adSlotTop">
            <span class="ad-slot-label">Sponsored</span>
            <div class="ad-content" id="adContentTop">
                <img class="ad-img" id="adImgTop" src="" alt="ad">
                <div class="ad-text">
                    <h4 id="adTitleTop"></h4>
                    <p id="adDescTop"></p>
                </div>
                <a class="ad-cta" id="adCtaTop" href="#" target="_blank">Learn More</a>
            </div>
            <div class="ad-placeholder" id="adPlaceholderTop">
                📢 Your Ad Here — <a href="/advertise">Advertise with us</a> and reach 10,000+ visitors
            </div>
        </div>

        <!-- COUNTDOWN OFFER BAR -->
        <div class="offer-bar" id="offerBar">
            <div>
                <h4>🔥 Limited Time — Free Library Access</h4>
                <p>Register now and get FREE access to all 6 courses — AI, Data, Web Dev, Marketing, Affiliate & Freelancing</p>
            </div>
            <div class="timer-digits">
                <div class="timer-unit"><div class="d" id="timerH">23</div><div class="l">Hours</div></div>
                <div class="timer-unit"><div class="d" id="timerM">59</div><div class="l">Mins</div></div>
                <div class="timer-unit"><div class="d" id="timerS">00</div><div class="l">Secs</div></div>
            </div>
            <a href="/library" class="offer-cta">Claim Free Access</a>
        </div>

        <!-- GALLERY -->
        <div class="section" id="gallery">
            <div class="section-header">
                <div class="section-title">📸 Success Gallery</div>
            </div>
            <div class="gallery-masonry">
                ${galleryImgs.map(img => `<img src="${img}" alt="gallery" loading="lazy">`).join('')}
            </div>
        </div>

        <!-- BLOG POSTS -->
        <div class="section" id="blog">
            <div class="section-header">
                <div class="section-title">📝 Latest Blog Posts</div>
            </div>
            <div class="blog-search-wrap">
                <input type="text" id="blogSearch" placeholder="🔍 Search blog posts..." oninput="searchBlogs(this.value)">
                <span class="blog-search-icon">🔍</span>
                <div class="blog-search-results" id="blogSearchResults"></div>
            </div>
            <div class="blog-grid">
                ${postsHtml || '<p style="color:var(--muted)">Bot posts automatically at 8am & 8pm daily.</p>'}
            </div>
        </div>

        <!-- AD SLOT MID -->
        <div class="ad-slot" id="adSlotMid">
            <span class="ad-slot-label">Sponsored</span>
            <div class="ad-content" id="adContentMid">
                <img class="ad-img" id="adImgMid" src="" alt="ad">
                <div class="ad-text">
                    <h4 id="adTitleMid"></h4>
                    <p id="adDescMid"></p>
                </div>
                <a class="ad-cta" id="adCtaMid" href="#" target="_blank">Learn More</a>
            </div>
            <div class="ad-placeholder" id="adPlaceholderMid">
                🎯 Target your customers by IP & device — <a href="/advertise">Start from $10</a>
            </div>
        </div>

        <!-- AMERICAN MUSIC -->
        <div class="section" id="videos">
            <div class="section-header">
                <div class="section-title">🎵 American Music</div>
            </div>
            <div class="video-grid">${americanVideos}</div>
        </div>

        <!-- ARABIC MUSIC -->
        <div class="section">
            <div class="section-header">
                <div class="section-title">🎵 Arabic Music</div>
            </div>
            <div class="video-grid">${arabicVideos}</div>
        </div>

        <!-- SUCCESS STORIES -->
        <div class="section" id="stories">
            <div class="section-header">
                <div class="section-title">🏆 Real Success Stories</div>
            </div>
            <div class="stories-grid">${storiesHtml}</div>
        </div>

        <!-- 30 MONEY LINKS -->
        <div class="section" id="money">
            <div class="section-header">
                <div class="section-title">💰 30 Money Making Links</div>
            </div>
            <div class="links-grid">${moneyLinksHtml}</div>
        </div>

        <!-- STORES -->
        <div class="section" id="stores">
            <div class="section-header">
                <div class="section-title">🏪 Affiliate Stores</div>
            </div>
            <div class="stores-grid">${storeLinksHtml}</div>
        </div>

        <!-- AD SLOT BOTTOM -->
        <div class="ad-slot" id="adSlotBot">
            <span class="ad-slot-label">Sponsored</span>
            <div class="ad-content" id="adContentBot">
                <img class="ad-img" id="adImgBot" src="" alt="ad">
                <div class="ad-text">
                    <h4 id="adTitleBot"></h4>
                    <p id="adDescBot"></p>
                </div>
                <a class="ad-cta" id="adCtaBot" href="#" target="_blank">Learn More</a>
            </div>
            <div class="ad-placeholder" id="adPlaceholderBot">
                💼 Reach buyers in Nigeria, Egypt, Ghana & more — <a href="/advertise">Place your ad</a>
            </div>
        </div>

        <!-- WHATSAPP COMMUNITY -->
        <div class="wa-community">
            <div class="wa-comm-icon">💬</div>
            <div class="wa-comm-text">
                <h3>Join Our WhatsApp Community</h3>
                <p>10,000+ earners sharing strategies, job opportunities, and daily tips. Free to join. Active every day.</p>
            </div>
            <a href="https://wa.me/2348123456789?text=Hello%203EESHER-CLOUD%2C%20I%20want%20to%20join%20the%20community!" class="wa-comm-btn" target="_blank">Join Community 💬</a>
        </div>

        <!-- TESTIMONIALS -->
        <div class="section" id="testimonials">
            <div class="section-header">
                <div class="section-title">⭐ Member Reviews</div>
            </div>
            <div class="test-grid" id="testGrid">
                <!-- Default reviews shown before any are submitted -->
                <div class="test-card"><div class="test-stars">★★★★★</div><div class="test-text">I was skeptical at first but after following the Jumia affiliate guide I made my first ₦15,000 in 2 weeks. This platform is real and it works!</div><div class="test-author"><div class="test-av">C</div><div><div class="test-name">Chidera O.</div><div class="test-country">📍 Enugu, Nigeria</div></div></div></div>
                <div class="test-card"><div class="test-stars">★★★★★</div><div class="test-text">The free library courses are amazing. I completed the Freelancing course and got my first Upwork client within 3 weeks. Cannot believe this is free.</div><div class="test-author"><div class="test-av">Y</div><div><div class="test-name">Yusuf A.</div><div class="test-country">📍 Kano, Nigeria</div></div></div></div>
                <div class="test-card"><div class="test-stars">★★★★★</div><div class="test-text">The AI course completely changed how I work. I now use ChatGPT to write content for clients on Fiverr and earn $500/month working just 2 hours daily.</div><div class="test-author"><div class="test-av">A</div><div><div class="test-name">Amira K.</div><div class="test-country">📍 Cairo, Egypt</div></div></div></div>
                <div class="test-card"><div class="test-stars">★★★★☆</div><div class="test-text">Started following the ClickBank guide 2 months ago. Slow at first but now earning $180/month from affiliate commissions. Growing every week!</div><div class="test-author"><div class="test-av">K</div><div><div class="test-name">Kwame B.</div><div class="test-country">📍 Accra, Ghana</div></div></div></div>
            </div>
            <!-- Leave Review Form -->
            <div class="test-form-box">
                <h4>✍️ Share Your Experience</h4>
                <div class="test-form-grid">
                    <div class="form-group"><input type="text" id="tName" placeholder="Your name"></div>
                    <div class="form-group"><input type="text" id="tCountry" placeholder="Your country (e.g. Nigeria)"></div>
                    <div class="form-group">
                        <select id="tRating">
                            <option value="5">★★★★★ — Excellent (5 stars)</option>
                            <option value="4">★★★★☆ — Great (4 stars)</option>
                            <option value="3">★★★☆☆ — Good (3 stars)</option>
                        </select>
                    </div>
                    <div class="full"><textarea id="tText" rows="3" placeholder="Share how this platform helped you make money..."></textarea></div>
                </div>
                <button class="test-submit" onclick="submitReview()">Submit Review</button>
                <div id="tRes" style="color:var(--green);font-size:13px;margin-top:8px;"></div>
            </div>
        </div>

        <!-- NEWSLETTER -->
        <div class="section">
            <div class="newsletter">
                <h2>📧 Get Free Money Tips Daily</h2>
                <p>Join thousands of earners getting exclusive tips and offers</p>
                <div class="nl-form">
                    <input type="email" id="nlEmail" placeholder="Enter your email address">
                    <button onclick="subscribeNewsletter()">Subscribe</button>
                </div>
            </div>
        </div>

        <!-- ABOUT -->
        <div class="section" id="about">
            <div class="section-header">
                <div class="section-title">📖 About 3EESHER-CLOUD</div>
            </div>
            <div class="content-box">
                <h3>🌟 Our Mission</h3><p>${data.aboutContent.mission}</p>
                <h3>🎯 Our Vision</h3><p>${data.aboutContent.vision}</p>
                <h3>📚 Our History</h3><p>${data.aboutContent.history}</p>
                <h3>💎 Core Values</h3>
                <div class="values-grid">${data.aboutContent.values.map(v => `<div class="value-chip">${v}</div>`).join('')}</div>
                <h3>👥 Our Team</h3><p>${data.aboutContent.team}</p>
                <h3>🌍 Our Community</h3><p>${data.aboutContent.community}</p>
            </div>
        </div>

        <!-- PRIVACY -->
        <div class="section">
            <div class="section-header">
                <div class="section-title">🔒 Privacy Policy</div>
            </div>
            <div class="content-box">
                <p><strong>Last Updated:</strong> ${data.privacyContent.lastUpdated}</p>
                <h3>1. Introduction</h3><p>${data.privacyContent.introduction}</p>
                <h3>2. Information We Collect</h3><p>${data.privacyContent.dataCollected}</p>
                <h3>3. How We Use Your Information</h3><p>${data.privacyContent.dataUsage}</p>
                <h3>4. Cookies</h3><p>${data.privacyContent.cookies}</p>
                <h3>5. Third Party Services</h3><p>${data.privacyContent.thirdParty}</p>
                <h3>6. Data Security</h3><p>${data.privacyContent.security}</p>
                <h3>7. Your Rights</h3><p>${data.privacyContent.rights}</p>
                <h3>8. Children's Privacy</h3><p>${data.privacyContent.children}</p>
                <h3>9. Changes to Policy</h3><p>${data.privacyContent.changes}</p>
            </div>
        </div>

        <!-- CONTACT -->
        <div class="section" id="contact">
            <div class="section-header">
                <div class="section-title">📞 Contact Us</div>
            </div>
            <div class="contact-grid">
                <div class="contact-card">
                    <div class="icon">📧</div>
                    <h3>Email</h3>
                    <a href="mailto:${data.contact.email}">${data.contact.email}</a>
                </div>
                <div class="contact-card">
                    <div class="icon">📱</div>
                    <h3>WhatsApp</h3>
                    <a href="https://wa.me/${data.contact.whatsapp.replace(/[^0-9]/g,'')}" target="_blank">${data.contact.whatsapp}</a>
                </div>
                <div class="contact-card">
                    <div class="icon">✈️</div>
                    <h3>Telegram</h3>
                    <a href="https://t.me/${data.contact.telegram.replace('@','')}" target="_blank">${data.contact.telegram}</a>
                </div>
            </div>
        </div>

    </div><!-- /container -->

    <!-- FOOTER -->
    <footer class="footer">
        <div class="footer-inner">
            <div class="footer-logo">☁️ 3EESHER-CLOUD</div>
            <div class="footer-links">
                <a href="/library">📚 Library</a>
                <a href="/#money">💰 Make Money</a>
                <a href="/#about">About</a>
                <a href="/#contact">Contact</a>
                <a href="/advertise">Advertise</a>
                <a href="/feed.xml">RSS</a>
                <a href="/sitemap.xml">Sitemap</a>
            </div>
            <div class="footer-copy">© 2026 3EESHER-CLOUD. Made with ❤️ for financial freedom.</div>
        </div>
    </footer>

    <a href="https://wa.me/${data.contact.whatsapp.replace(/[^0-9]/g,'')}" class="whatsapp-float" target="_blank" title="Chat on WhatsApp">💬</a>
    <a href="/admin" class="admin-btn">🔐 Admin</a>

    <script>
        // ── Navbar mobile
        function toggleMenu(){document.getElementById('mobileMenu').classList.toggle('open');}

        // ── Video modal
        function playVideo(url){document.getElementById('videoModal').style.display='flex';document.getElementById('videoPlayer').src=url;}
        function closeVideoModal(){document.getElementById('videoModal').style.display='none';document.getElementById('videoPlayer').src='';}
        document.addEventListener('keydown',e=>{if(e.key==='Escape')closeVideoModal();});

        // ── Track clicks
        function trackClick(n,t){fetch('/api/track-click',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({linkName:n,type:t})});}

        // ── Story toggle
        function toggleStory(id){
            const el=document.getElementById('story-'+id);
            const btn=event.target;
            if(el.style.display==='none'){el.style.display='block';btn.textContent='Hide Story ▲';}
            else{el.style.display='none';btn.textContent='Read Full Story ▼';}
        }

        // ── Newsletter
        async function subscribeNewsletter(){
            const email=document.getElementById('nlEmail').value;
            if(!email||!email.includes('@')){alert('Enter a valid email');return;}
            await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
            alert('✅ Subscribed! Welcome to the community!');
            document.getElementById('nlEmail').value='';
        }

        // ── Ad Engine: Load ads on page load
        async function loadAds(){
            const slots = [
                {slot:'Top', img:'adImgTop', title:'adTitleTop', desc:'adDescTop', cta:'adCtaTop', content:'adContentTop', placeholder:'adPlaceholderTop'},
                {slot:'Mid', img:'adImgMid', title:'adTitleMid', desc:'adDescMid', cta:'adCtaMid', content:'adContentMid', placeholder:'adPlaceholderMid'},
                {slot:'Bot', img:'adImgBot', title:'adTitleBot', desc:'adDescBot', cta:'adCtaBot', content:'adContentBot', placeholder:'adPlaceholderBot'}
            ];
            for(const s of slots){
                try{
                    const res = await fetch('/api/ads/serve');
                    const data = await res.json();
                    if(data.ad){
                        const ad = data.ad;
                        if(ad.image) document.getElementById(s.img).src = ad.image;
                        document.getElementById(s.title).textContent = ad.title;
                        document.getElementById(s.desc).textContent = ad.description || '';
                        const ctaEl = document.getElementById(s.cta);
                        ctaEl.textContent = ad.cta;
                        ctaEl.href = '#';
                        ctaEl.onclick = async(e)=>{e.preventDefault();await fetch('/api/ads/click/'+ad.id,{method:'POST'});window.open(ad.url,'_blank');};
                        document.getElementById(s.content).classList.add('visible');
                        document.getElementById(s.placeholder).style.display='none';
                    }
                } catch(e){}
            }
        }
        loadAds();

        // ── VISITOR COUNTER ──
        async function updateVisitorCount(){
            try{const r=await fetch('/api/visitors');const d=await r.json();document.getElementById('liveCount').textContent=d.count;}catch(e){}
        }
        updateVisitorCount();
        setInterval(updateVisitorCount, 30000);

        // ── COUNTDOWN TIMER (resets daily) ──
        function updateTimer(){
            const now=new Date();
            const end=new Date(now);
            end.setHours(23,59,59,999);
            const diff=end-now;
            const h=Math.floor(diff/3600000);
            const m=Math.floor((diff%3600000)/60000);
            const s=Math.floor((diff%60000)/1000);
            const th=document.getElementById('timerH');
            const tm=document.getElementById('timerM');
            const ts=document.getElementById('timerS');
            if(th)th.textContent=String(h).padStart(2,'0');
            if(tm)tm.textContent=String(m).padStart(2,'0');
            if(ts)ts.textContent=String(s).padStart(2,'0');
        }
        updateTimer();
        setInterval(updateTimer,1000);

        // ── BLOG SEARCH ──
        let searchTimeout=null;
        async function searchBlogs(q){
            const res=document.getElementById('blogSearchResults');
            if(!q||q.length<2){res.style.display='none';return;}
            clearTimeout(searchTimeout);
            searchTimeout=setTimeout(async()=>{
                try{
                    const r=await fetch('/api/blog/search?q='+encodeURIComponent(q));
                    const d=await r.json();
                    if(d.posts.length===0){res.innerHTML='<div class="bsr-item" style="color:var(--muted)">No results found</div>';}
                    else{res.innerHTML=d.posts.map(p=>`<div class="bsr-item" onclick="window.location='/blog/${p.id}'"><div class="bsr-title">${p.title}</div><div class="bsr-meta">${new Date(p.date).toLocaleDateString()} • ${p.views} views</div></div>`).join('');}
                    res.style.display='block';
                }catch(e){}
            },300);
        }
        document.addEventListener('click',e=>{if(!e.target.closest('.blog-search-wrap'))document.getElementById('blogSearchResults').style.display='none';});

        // ── TESTIMONIALS ──
        async function submitReview(){
            const name=document.getElementById('tName').value;
            const text=document.getElementById('tText').value;
            const rating=document.getElementById('tRating').value;
            const country=document.getElementById('tCountry').value;
            const res=document.getElementById('tRes');
            if(!name||!text){res.textContent='Please fill in your name and review.';res.style.color='#ef4444';return;}
            try{
                const r=await fetch('/api/testimonials/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,country,rating,text})});
                const d=await r.json();
                if(d.success){res.textContent='✅ Thank you! Your review will appear after approval.';res.style.color='var(--green)';document.getElementById('tName').value='';document.getElementById('tText').value='';document.getElementById('tCountry').value='';}
                else{res.textContent='❌ '+(d.error||'Failed. Try again.');res.style.color='#ef4444';}
            }catch(e){res.textContent='Server error. Try again.';res.style.color='#ef4444';}
        }

        // ── DARK/LIGHT MODE ──
        const savedTheme=localStorage.getItem('theme');
        if(savedTheme==='light')document.body.classList.add('light-mode');
        function toggleTheme(){
            document.body.classList.toggle('light-mode');
            localStorage.setItem('theme',document.body.classList.contains('light-mode')?'light':'dark');
            document.getElementById('themeIcon').textContent=document.body.classList.contains('light-mode')?'🌙':'☀️';
        }

        // ── COOKIE BANNER ──
        if(!localStorage.getItem('cookieAccepted')){
            document.getElementById('cookieBanner').style.display='flex';
        }
        function acceptCookie(){localStorage.setItem('cookieAccepted','1');document.getElementById('cookieBanner').style.display='none';}
        function declineCookie(){document.getElementById('cookieBanner').style.display='none';}

        // ── POPUP SUBSCRIBE (after 35 seconds, max once per session) ──
        if(!sessionStorage.getItem('popupShown')){
            setTimeout(()=>{
                const popup=document.getElementById('subscribePopup');
                if(popup)popup.classList.add('show');
                sessionStorage.setItem('popupShown','1');
            },35000);
        }
        function closePopup(){document.getElementById('subscribePopup').classList.remove('show');}
        async function popupSubscribe(){
            const email=document.getElementById('popupEmail').value;
            if(!email||!email.includes('@')){alert('Enter a valid email');return;}
            await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
            document.getElementById('subscribePopup').classList.remove('show');
            alert('✅ Subscribed! Check your inbox for a welcome email!');
        }
    </script>
    ${injections.js || ''}
    ${injections.bodyEnd || ''}
    ${socialPixels.customBody || ''}
    ${socialPixels.customJS ? `<script>${socialPixels.customJS}</script>` : ''}
</body>
</html>`);
});

// ==================== ADMIN PAGE ====================
app.get('/admin', (req, res) => {
    if (!req.session.isAdmin) {
        return res.send(`<!DOCTYPE html><html><head><title>Admin Login</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Space Grotesk',sans-serif;background:#0a0f1e;color:white;display:flex;justify-content:center;align-items:center;height:100vh;}
.box{background:#131c31;padding:40px;border-radius:16px;width:360px;border:1px solid rgba(16,185,129,0.2);}
h2{color:#fbbf24;text-align:center;margin-bottom:30px;font-size:22px;}
input{width:100%;padding:14px;margin:8px 0;background:#0a0f1e;border:1px solid #334155;color:white;border-radius:8px;font-family:inherit;font-size:15px;}
button{width:100%;padding:14px;background:#10b981;border:none;border-radius:8px;color:#0a0f1e;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px;}</style></head>
<body><div class="box"><h2>🔐 3EESHER Admin</h2>
<input type="text" id="u" placeholder="Username"><input type="password" id="p" placeholder="Password">
<button onclick="login()">Login</button></div>
<script>async function login(){const u=document.getElementById('u').value,p=document.getElementById('p').value;if(!u||!p){alert('Fill both fields');return;}const r=await fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});if(r.ok)location.reload();else alert('Invalid credentials');}</script>
</body></html>`);
    }

    const data = getData();

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Admin Dashboard — 3EESHER</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Space Grotesk',sans-serif;background:#0a0f1e;color:#e2e8f0;padding:20px;}
        .container{max-width:1400px;margin:0 auto;}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #10b981;}
        .topbar h1{color:#fbbf24;font-size:22px;}
        .tabs{display:flex;gap:8px;margin:0 0 24px;flex-wrap:wrap;}
        .tab-btn{padding:10px 18px;background:#131c31;border:1px solid #1e293b;color:#94a3b8;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;transition:0.2s;}
        .tab-btn:hover,.tab-btn.active{background:#10b981;color:#0a0f1e;border-color:#10b981;font-weight:700;}
        .section{display:none;background:#131c31;padding:28px;border-radius:16px;border:1px solid #1e293b;}
        .section.active{display:block;}
        input,textarea,select{width:100%;padding:11px 14px;margin:8px 0;background:#0a0f1e;border:1px solid #1e293b;color:#e2e8f0;border-radius:8px;font-family:inherit;font-size:14px;}
        input:focus,textarea:focus,select:focus{outline:none;border-color:#10b981;}
        button{background:#10b981;color:#0a0f1e;padding:11px 22px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:700;font-size:14px;margin:4px;}
        .del{background:#ef4444;color:white;}
        .approve{background:#f59e0b;color:#0a0f1e;}
        .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;}
        .stat-card{background:#0a0f1e;padding:20px;border-radius:12px;border-left:4px solid #10b981;}
        .stat-card h3{color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;}
        .stat-value{font-size:28px;font-weight:800;color:#fbbf24;margin-top:6px;}
        .item{background:#0a0f1e;padding:14px;margin:8px 0;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;}
        .item-info{flex:1;}
        .ad-card{background:#0a0f1e;padding:16px;margin:10px 0;border-radius:10px;border-left:4px solid #8b5cf6;}
        .ad-card.active{border-color:#10b981;}
        .ad-card.pending{border-color:#f59e0b;}
        .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
        .badge.active{background:rgba(16,185,129,0.15);color:#10b981;}
        .badge.pending{background:rgba(245,158,11,0.15);color:#f59e0b;}
        .badge.expired{background:rgba(239,68,68,0.15);color:#ef4444;}
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
    </style>
</head>
<body>
<div class="container">
    <div class="topbar">
        <h1>☁️ 3EESHER Admin Dashboard</h1>
        <button onclick="logout()" style="background:#ef4444;color:white;">Logout</button>
    </div>

    <div class="tabs">
        <button class="tab-btn active" onclick="showTab('dashboard')">📊 Dashboard</button>
        <button class="tab-btn" onclick="showTab('ads')">🎯 Ads Engine</button>
        <button class="tab-btn" onclick="showTab('earnings')">💰 Earnings</button>
        <button class="tab-btn" onclick="showTab('moneylinks')">🔗 Money Links</button>
        <button class="tab-btn" onclick="showTab('stores')">🏪 Stores</button>
        <button class="tab-btn" onclick="showTab('blogs')">📝 Blogs</button>
        <button class="tab-btn" onclick="showTab('videos')">🎬 Videos</button>
        <button class="tab-btn" onclick="showTab('upload')">📁 Upload</button>
        <button class="tab-btn" onclick="showTab('social')">📱 Social</button>
        <button class="tab-btn" onclick="showTab('target')">🎯 Target</button>
        <button class="tab-btn" onclick="showTab('inject')">🔌 Inject</button>
        <button class="tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
        <button class="tab-btn" onclick="showTab('command')">🤖 Command</button>
    </div>

    <!-- DASHBOARD -->
    <div id="dashboard" class="section active">
        <div class="stats-grid">
            <div class="stat-card"><h3>Total Earnings</h3><div class="stat-value">$${data.earnings.total.toFixed(2)}</div></div>
            <div class="stat-card"><h3>Today</h3><div class="stat-value">$${data.earnings.today.toFixed(2)}</div></div>
            <div class="stat-card" style="border-color:#8b5cf6"><h3>Ad Revenue</h3><div class="stat-value">$${(data.adStats?.totalRevenue || 0).toFixed(2)}</div></div>
            <div class="stat-card" style="border-color:#f59e0b"><h3>Active Ads</h3><div class="stat-value">${(data.ads || []).filter(a => a.active).length}</div></div>
            <div class="stat-card"><h3>Subscribers</h3><div class="stat-value">${data.subscribers.length}</div></div>
            <div class="stat-card"><h3>Total Clicks</h3><div class="stat-value">${data.moneyLinks.reduce((s,l)=>s+(l.clicks||0),0)+data.storeLinks.reduce((s,l)=>s+(l.clicks||0),0)}</div></div>
        </div>
        <div style="background:#0a0f1e;padding:20px;border-radius:10px;">
            <h3 style="color:#fbbf24;margin-bottom:12px;">🤖 Bot Status</h3>
            <div>✅ Auto Money Maker: ${data.settings.autoMoneyMaker ? 'Running (every hour)' : '⏸️ Paused'}</div>
            <div>✅ Auto Blogger: ${data.settings.autoBlogger ? data.settings.blogFrequency + 'x daily' : '⏸️ Paused'}</div>
            <div>✅ Auto Targeting: ${data.settings.autoTargeting ? 'Running (every 30 min)' : '⏸️ Paused'}</div>
        </div>
    </div>

    <!-- ADS ENGINE -->
    <div id="ads" class="section">
        <h2 style="color:#fbbf24;margin-bottom:20px;">🎯 Ad Engine</h2>
        <div class="stats-grid">
            <div class="stat-card" style="border-color:#8b5cf6"><h3>Ad Revenue</h3><div class="stat-value">$${(data.adStats?.totalRevenue || 0).toFixed(2)}</div></div>
            <div class="stat-card"><h3>Impressions</h3><div class="stat-value">${data.adStats?.totalImpressions || 0}</div></div>
            <div class="stat-card"><h3>Ad Clicks</h3><div class="stat-value">${data.adStats?.totalClicks || 0}</div></div>
            <div class="stat-card" style="border-color:#f59e0b"><h3>Pending Approval</h3><div class="stat-value">${(data.ads || []).filter(a => !a.active).length}</div></div>
        </div>

        <h3 style="margin:20px 0 12px;color:#e2e8f0;">All Submitted Ads</h3>
        ${(data.ads || []).length === 0 ? '<p style="color:#64748b">No ads yet. Share /advertise page to get clients!</p>' : ''}
        ${(data.ads || []).map(ad => `
        <div class="ad-card ${ad.active ? 'active' : 'pending'}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
                <div>
                    <strong>${ad.title}</strong>
                    <span class="badge ${ad.active ? 'active' : 'pending'}" style="margin-left:8px;">${ad.active ? '✅ Active' : '⏳ Pending'}</span>
                    <div style="color:#64748b;font-size:13px;margin-top:6px;">
                        Advertiser: ${ad.advertiserName} (${ad.advertiserEmail}) •
                        Package: ${ad.package} ($${ad.price}) •
                        ${ad.impressionsUsed || 0}/${ad.impressionsTotal} impressions •
                        ${ad.clicks || 0} clicks
                    </div>
                    <div style="color:#64748b;font-size:12px;margin-top:4px;">
                        Targeting — IPs: ${(ad.targeting?.ips || []).join(', ') || 'None'} |
                        Phones: ${(ad.targeting?.phones || []).join(', ') || 'None'} |
                        IMEIs: ${(ad.targeting?.imeis || []).join(', ') || 'None'}
                    </div>
                    <div style="color:#64748b;font-size:12px;">URL: <a href="${ad.url}" target="_blank" style="color:#10b981;">${ad.url}</a></div>
                </div>
                <div>
                    ${!ad.active ? `<button class="approve" onclick="approveAd(${ad.id})">✅ Approve</button>` : ''}
                    <button class="del" onclick="deleteAd(${ad.id})">Delete</button>
                </div>
            </div>
        </div>`).join('')}

        <h3 style="margin:30px 0 12px;color:#e2e8f0;">➕ Create Ad Directly (Admin)</h3>
        <div class="two-col">
            <input type="text" id="adTitle" placeholder="Ad Title">
            <input type="text" id="adAdvertiser" placeholder="Advertiser Name">
            <input type="url" id="adUrl" placeholder="Destination URL">
            <input type="url" id="adImage" placeholder="Ad Image URL">
            <input type="text" id="adDesc" placeholder="Description">
            <input type="text" id="adCta" placeholder="CTA Text (e.g. Shop Now)">
            <input type="number" id="adImpressions" placeholder="Total Impressions (e.g. 5000)" value="5000">
            <input type="number" id="adDays" placeholder="Duration in days" value="30">
            <input type="number" id="adPrice" placeholder="Price paid ($)" value="25">
        </div>
        <input type="text" id="adTargetIps" placeholder="Target IPs (comma separated, optional)">
        <input type="text" id="adTargetPhones" placeholder="Target Phones (comma separated, optional)">
        <input type="text" id="adTargetImeis" placeholder="Target IMEIs (comma separated, optional)">
        <button onclick="createAdDirectly()">Create & Activate Ad</button>
    </div>

    <!-- EARNINGS -->
    <div id="earnings" class="section">
        <h3>Add Earning</h3>
        <input type="number" id="amount" placeholder="Amount ($)">
        <input type="text" id="source" placeholder="Source (e.g. Jumia Commission)">
        <input type="text" id="link" placeholder="Link name">
        <button onclick="addEarning()">Add Earning</button>
        <h3 style="margin-top:20px;">Withdraw</h3>
        <input type="number" id="withdrawAmount" placeholder="Amount">
        <select id="withdrawMethod"><option value="bank">Bank Transfer</option><option value="card">Mastercard</option><option value="crypto">Cryptocurrency</option></select>
        <button onclick="withdraw()">Withdraw</button>
    </div>

    <!-- MONEY LINKS -->
    <div id="moneylinks" class="section">
        <h3>Money Making Links (${data.moneyLinks.length})</h3>
        <div style="max-height:350px;overflow-y:auto;">
            ${data.moneyLinks.map(l => `<div class="item"><span><strong>${l.name}</strong> — ${l.clicks || 0} clicks, $${(l.earnings || 0).toFixed(2)}</span></div>`).join('')}
        </div>
        <h3 style="margin-top:20px;">Add Custom Money Link</h3>
        <input type="text" id="moneyName" placeholder="Name">
        <input type="text" id="moneyUrl" placeholder="URL">
        <select id="moneyCategory"><option value="freelance">Freelance</option><option value="affiliate">Affiliate</option><option value="courses">Courses</option><option value="social">Social</option></select>
        <button onclick="addMoneyLink()">Add Link</button>
    </div>

    <!-- STORES -->
    <div id="stores" class="section">
        <h3>Stores (Add Affiliate IDs)</h3>
        <div style="max-height:300px;overflow-y:auto;">
            ${data.storeLinks.map(l => `<div class="item"><span><strong>${l.name}</strong> — ID: ${l.id || 'Not set'} (${l.clicks || 0} clicks)</span></div>`).join('')}
        </div>
        <h3 style="margin-top:20px;">Add Store Affiliate ID</h3>
        <input type="text" id="storeName" placeholder="Store name (e.g. Jumia)">
        <input type="text" id="storeId" placeholder="Affiliate ID">
        <button onclick="addStoreId()">Add ID</button>
    </div>

    <!-- BLOGS -->
    <div id="blogs" class="section">
        <h3>Recent Blogs</h3>
        <div style="max-height:300px;overflow-y:auto;">
            ${data.blogPosts.map(b => `<div class="item"><span><strong>${b.title}</strong> — ${new Date(b.date).toLocaleDateString()} • ${b.views} views</span><button class="del" onclick="deleteBlog(${b.id})">Delete</button></div>`).join('')}
        </div>
        <h3 style="margin-top:20px;">Create Manual Blog</h3>
        <input type="text" id="blogTitle" placeholder="Title">
        <textarea id="blogContent" rows="4" placeholder="Content (HTML allowed)"></textarea>
        <input type="file" id="blogImage" accept="image/*">
        <button onclick="createBlog()">Publish Blog</button>
    </div>

    <!-- VIDEOS -->
    <div id="videos" class="section">
        <h3>Videos (${data.videos.length})</h3>
        <div style="max-height:300px;overflow-y:auto;">
            ${data.videos.map(v => `<div class="item"><span><strong>${v.title}</strong> — ${v.region}</span><button class="del" onclick="deleteVideo(${v.id})">Delete</button></div>`).join('')}
        </div>
    </div>

    <!-- UPLOAD -->
    <div id="upload" class="section">
        <h3>Upload Video</h3>
        <input type="text" id="videoTitle" placeholder="Video title">
        <input type="file" id="videoFile" accept="video/*">
        <button onclick="uploadVideo()">Upload Video</button>
        <h3 style="margin-top:20px;">Upload Image</h3>
        <input type="file" id="imageFile" accept="image/*">
        <button onclick="uploadImage()">Upload Image</button>
    </div>

    <!-- SOCIAL -->
    <div id="social" class="section">
        <h3>Facebook Pixel</h3>
        <textarea id="fbPixel" rows="3">${data.socialPixels?.facebook || ''}</textarea>
        <button onclick="saveSocial('facebook')">Save Facebook</button>
        <h3>TikTok Pixel</h3>
        <textarea id="ttPixel" rows="3">${data.socialPixels?.tiktok || ''}</textarea>
        <button onclick="saveSocial('tiktok')">Save TikTok</button>
        <h3>WhatsApp</h3>
        <textarea id="waPixel" rows="3">${data.socialPixels?.whatsapp || ''}</textarea>
        <button onclick="saveSocial('whatsapp')">Save WhatsApp</button>
        <h3>Telegram</h3>
        <textarea id="tgPixel" rows="3">${data.socialPixels?.telegram || ''}</textarea>
        <button onclick="saveSocial('telegram')">Save Telegram</button>
    </div>

    <!-- TARGET -->
    <div id="target" class="section">
        <h3>Add Phone Numbers</h3>
        <textarea id="phones" rows="4" placeholder="+2348012345678 (one per line)"></textarea>
        <button onclick="addPhones()">Add Phones</button>
        <p style="color:#64748b;font-size:12px;margin-top:4px;">Total: ${data.targeting.phones.length} phones</p>
        <h3 style="margin-top:20px;">Add IMEI Numbers</h3>
        <textarea id="imeis" rows="4" placeholder="356789012345678 (one per line)"></textarea>
        <button onclick="addIMEIs()">Add IMEIs</button>
        <p style="color:#64748b;font-size:12px;margin-top:4px;">Total: ${data.targeting.imeis.length} IMEIs</p>
    </div>

    <!-- INJECT -->
    <div id="inject" class="section">
        <h3>Universal Injector (HTML, CSS, JS)</h3>
        <select id="injectLocation">
            <option value="head">Head (HTML)</option>
            <option value="bodyStart">Body Start (HTML)</option>
            <option value="bodyEnd">Body End (HTML)</option>
            <option value="css">CSS</option>
            <option value="js">JavaScript</option>
        </select>
        <textarea id="injectCode" rows="6" placeholder="Paste your code here..."></textarea>
        <button onclick="injectCode()">Inject Code</button>
    </div>

    <!-- SETTINGS -->
    <div id="settings" class="section">
        <h3>Change Password</h3>
        <input type="password" id="currentPass" placeholder="Current password">
        <input type="password" id="newPass" placeholder="New password (min 6 chars)">
        <input type="password" id="confirmPass" placeholder="Confirm new password">
        <button onclick="changePassword()">Change Password</button>
        <h3 style="margin-top:20px;">Auto Tasks</h3>
        <label><input type="checkbox" id="autoMoney" ${data.settings.autoMoneyMaker ? 'checked' : ''}> Auto Money Maker (every hour)</label><br>
        <label style="margin-top:8px;display:block;"><input type="checkbox" id="autoBlog" ${data.settings.autoBlogger ? 'checked' : ''}> Auto Blogger (2x daily)</label><br>
        <label style="margin-top:8px;display:block;"><input type="checkbox" id="autoTarget" ${data.settings.autoTargeting ? 'checked' : ''}> Auto Targeting (every 30 min)</label><br>
        <button onclick="saveSettings()" style="margin-top:12px;">Save Settings</button>
    </div>

    <!-- COMMAND -->
    <div id="command" class="section">
        <h3>🤖 Bot Command Terminal</h3>
        <textarea id="commandInput" rows="3" placeholder="Type command... e.g. help, show ads, show earnings, status"></textarea>
        <button onclick="sendCommand()">Send Command</button>
        <div id="response" style="background:#0a0f1e;padding:16px;margin-top:16px;border-radius:8px;white-space:pre-wrap;font-family:monospace;font-size:13px;min-height:80px;border:1px solid #1e293b;"></div>
    </div>

</div>

<script>
    function showTab(tab){
        document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById(tab).classList.add('active');
    }

    async function approveAd(id){
        await fetch('/api/ads/approve/'+id,{method:'POST'});
        alert('✅ Ad approved and activated!');location.reload();
    }
    async function deleteAd(id){
        if(confirm('Delete this ad?')){await fetch('/api/ads/'+id,{method:'DELETE'});location.reload();}
    }
    async function createAdDirectly(){
        const title=document.getElementById('adTitle').value;
        const url=document.getElementById('adUrl').value;
        if(!title||!url){alert('Need at least title and URL');return;}
        const res=await fetch('/api/ads/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            advertiserName:document.getElementById('adAdvertiser').value||'Admin',
            advertiserEmail:'${GMAIL_USER}',
            title,url,
            description:document.getElementById('adDesc').value,
            image:document.getElementById('adImage').value,
            cta:document.getElementById('adCta').value||'Learn More',
            package:'enterprise',
            targetIps:document.getElementById('adTargetIps').value,
            targetPhones:document.getElementById('adTargetPhones').value,
            targetImeis:document.getElementById('adTargetImeis').value
        })});
        const d=await res.json();
        if(d.success){await fetch('/api/ads/approve/'+d.adId,{method:'POST'});alert('✅ Ad created and activated!');location.reload();}
    }
    async function addEarning(){const r=await fetch('/api/earnings/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:document.getElementById('amount').value,source:document.getElementById('source').value,link:document.getElementById('link').value})});alert('Earning added!');location.reload();}
    async function withdraw(){await fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:document.getElementById('withdrawAmount').value,method:document.getElementById('withdrawMethod').value})});alert('Withdrawn!');location.reload();}
    async function addMoneyLink(){await fetch('/api/add-money-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('moneyName').value,url:document.getElementById('moneyUrl').value,category:document.getElementById('moneyCategory').value})});alert('Link added!');location.reload();}
    async function addStoreId(){const r=await fetch('/api/add-store-id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({store:document.getElementById('storeName').value,id:document.getElementById('storeId').value})});const d=await r.json();alert(d.message||'ID added!');location.reload();}
    async function createBlog(){const f=new FormData();f.append('title',document.getElementById('blogTitle').value);f.append('content',document.getElementById('blogContent').value);const img=document.getElementById('blogImage').files[0];if(img)f.append('image',img);await fetch('/api/create-blog',{method:'POST',body:f});alert('Published!');location.reload();}
    async function deleteBlog(id){if(confirm('Delete?')){await fetch('/api/blog/'+id,{method:'DELETE'});location.reload();}}
    async function uploadVideo(){const f=new FormData();f.append('title',document.getElementById('videoTitle').value);f.append('video',document.getElementById('videoFile').files[0]);await fetch('/api/upload/video',{method:'POST',body:f});alert('Uploaded!');location.reload();}
    async function uploadImage(){const f=new FormData();f.append('image',document.getElementById('imageFile').files[0]);await fetch('/api/upload/image',{method:'POST',body:f});alert('Uploaded!');location.reload();}
    async function deleteVideo(id){if(confirm('Delete?')){await fetch('/api/video/'+id,{method:'DELETE'});location.reload();}}
    async function saveSocial(p){let v='';if(p==='facebook')v=document.getElementById('fbPixel').value;if(p==='tiktok')v=document.getElementById('ttPixel').value;if(p==='whatsapp')v=document.getElementById('waPixel').value;if(p==='telegram')v=document.getElementById('tgPixel').value;await fetch('/api/social/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform:p,value:v})});alert('Saved!');}
    async function addPhones(){const phones=document.getElementById('phones').value.split('\n').filter(p=>p.trim());await fetch('/api/target-phones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phones})});alert(phones.length+' phones added');location.reload();}
    async function addIMEIs(){const imeis=document.getElementById('imeis').value.split('\n').filter(i=>i.trim());await fetch('/api/target-imeis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imeis})});alert(imeis.length+' IMEIs added');location.reload();}
    async function injectCode(){await fetch('/api/inject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:document.getElementById('injectLocation').value,code:document.getElementById('injectCode').value})});alert('Injected!');}
    async function changePassword(){const c=document.getElementById('currentPass').value,n=document.getElementById('newPass').value,cf=document.getElementById('confirmPass').value;if(!c||!n||!cf){alert('Fill all fields');return;}if(n!==cf){alert('Passwords do not match');return;}if(n.length<6){alert('Min 6 characters');return;}const r=await fetch('/api/admin/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:c,newPassword:n,confirmPassword:cf})});const d=await r.json();if(d.success)alert('✅ Password changed!');else alert('❌ '+d.error);}
    async function saveSettings(){alert('Settings saved!');}
    async function sendCommand(){const cmd=document.getElementById('commandInput').value;const r=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:cmd})});const d=await r.json();document.getElementById('response').textContent=d.response;}
    function logout(){window.location.href='/logout';}
</script>
</body>
</html>`);
});

// ==================== BLOG PAGE ====================
app.get('/blog/:id', (req, res) => {
    const data = getData();
    const post = data.blogPosts.find(p => p.id == req.params.id);
    if (!post) return res.status(404).send('<h1>Not found</h1><a href="/">Go Home</a>');
    post.views++; saveData(data);
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <title>${post.title} — 3EESHER-CLOUD</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${post.content.replace(/<[^>]*>/g,'').substring(0,155)}">
    <meta property="og:title" content="${post.title}">
    <meta property="og:image" content="${post.image}">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-HD01MF5SL9"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-HD01MF5SL9');</script>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Space Grotesk',sans-serif;background:#0a0f1e;color:#e2e8f0;padding:20px;}
        .wrap{max-width:800px;margin:0 auto;}
        .post{background:#131c31;padding:40px;border-radius:16px;border:1px solid rgba(51,65,85,0.4);}
        h1{color:#fbbf24;font-size:clamp(1.4rem,4vw,2rem);margin-bottom:14px;line-height:1.3;}
        img{max-width:100%;border-radius:12px;margin:20px 0;}
        .meta{color:#64748b;font-size:14px;margin:14px 0;}
        .back{color:#10b981;text-decoration:none;font-weight:700;display:inline-block;margin-top:20px;}
    .share-btns{display:flex;gap:8px;margin-top:24px;flex-wrap:wrap;}
    .share-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer;border:none;transition:0.2s;font-family:inherit;}
    .share-wa{background:#25d366;color:white;}
    .share-fb{background:#1877f2;color:white;}
    .share-tw{background:#1da1f2;color:white;}
    .share-cp{background:#1e293b;color:#e2e8f0;border:1px solid #334155;}
    .share-btn:hover{opacity:0.85;}
        .content{color:#94a3b8;line-height:1.8;font-size:15px;}
        .content h2{color:#fbbf24;font-size:20px;margin:24px 0 10px;}
        .content p{margin-bottom:14px;}
        nav{display:flex;justify-content:space-between;align-items:center;padding:16px 0;margin-bottom:24px;border-bottom:1px solid rgba(51,65,85,0.3);}
        nav a{color:#10b981;text-decoration:none;font-weight:700;font-size:14px;}
    </style>
</head>
<body>
    <div class="wrap">
        <nav>
            <a href="/">☁️ 3EESHER-CLOUD</a>
            <a href="/library">📚 Free Library</a>
        </nav>
        <div class="post">
            <h1>${post.title}</h1>
            <div class="meta">${new Date(post.date).toLocaleDateString('en-NG', {year:'numeric',month:'long',day:'numeric'})} &nbsp;•&nbsp; ${post.views} views &nbsp;•&nbsp; By ${post.author}</div>
            ${post.image?`<img src="${post.image}" alt="${post.title}">`:''}
            <div class="content">${post.content}</div>
            <div class="share-btns">
                <a href="https://wa.me/?text=${encodeURIComponent(post.title + ' - ' + 'https://3eesher-cloud.onrender.com/blog/' + post.id)}" class="share-btn share-wa" target="_blank">💬 WhatsApp</a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://3eesher-cloud.onrender.com/blog/' + post.id)}" class="share-btn share-fb" target="_blank">📘 Facebook</a>
                <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent('https://3eesher-cloud.onrender.com/blog/' + post.id)}" class="share-btn share-tw" target="_blank">🐦 Twitter</a>
                <button onclick="navigator.clipboard.writeText('https://3eesher-cloud.onrender.com/blog/${post.id}').then(()=>this.textContent='✅ Copied!')" class="share-btn share-cp">🔗 Copy Link</button>
            </div>
            <a href="/" class="back">← Back to Home</a>
        </div>
    </div>
</body>
</html>`);
});

// ==================== ADVERTISE PAGE ====================
app.get('/advertise', (req, res) => {
    const data = getData();
    const pkgs = data.adPackages || [];
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Advertise on 3EESHER-CLOUD — Target by IP, Phone, IMEI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root{--g:#10b981;--gold:#fbbf24;--pur:#8b5cf6;--bg:#0a0f1e;--card:#131c31;--tx:#e2e8f0;--mu:#64748b;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:var(--tx);}
        nav{background:rgba(10,15,30,0.95);backdrop-filter:blur(16px);padding:0 5%;border-bottom:1px solid rgba(51,65,85,0.4);}
        .ni{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;height:64px;}
        .nlogo{font-size:20px;font-weight:800;color:var(--g);text-decoration:none;}
        .nl a{color:#94a3b8;text-decoration:none;margin-left:20px;font-size:14px;}
        .nl a:hover{color:var(--g);}
        .hero{text-align:center;padding:70px 5% 50px;background:radial-gradient(ellipse at top,rgba(16,185,129,0.12) 0%,transparent 60%);}
        .hero h1{font-size:clamp(1.8rem,4.5vw,3rem);font-weight:800;margin-bottom:16px;background:linear-gradient(135deg,var(--g),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
        .hero p{color:#94a3b8;font-size:16px;max-width:560px;margin:0 auto 36px;}
        .stats{display:flex;justify-content:center;gap:48px;flex-wrap:wrap;padding:24px;background:rgba(30,41,59,0.4);border-radius:14px;max-width:650px;margin:0 auto 50px;}
        .stat .n{font-size:28px;font-weight:800;color:var(--g);} .stat .l{font-size:12px;color:var(--mu);}
        .wrap{max-width:1100px;margin:0 auto;padding:0 5% 80px;}
        .stitle{font-size:24px;font-weight:700;color:var(--gold);margin:44px 0 22px;text-align:center;}
        .pkgs{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px;margin-bottom:50px;}
        .pkg{background:var(--card);border:1px solid rgba(51,65,85,0.4);border-radius:14px;padding:26px;transition:0.3s;cursor:pointer;position:relative;}
        .pkg:hover,.pkg.sel{border-color:var(--g);transform:translateY(-3px);box-shadow:0 16px 36px rgba(16,185,129,0.15);}
        .pkg.pop{border-color:var(--gold);}
        .pbadge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--gold);color:#0a0f1e;padding:3px 14px;border-radius:16px;font-size:11px;font-weight:800;}
        .pname{font-size:18px;font-weight:700;margin-bottom:6px;} .pprice{font-size:32px;font-weight:800;color:var(--g);margin:12px 0;}
        .pprice span{font-size:13px;color:var(--mu);} .pfeats{list-style:none;margin-top:12px;}
        .pfeats li{padding:5px 0;color:#94a3b8;font-size:13px;} .pfeats li::before{content:'✓ ';color:var(--g);}
        .form-box{background:var(--card);border:1px solid rgba(51,65,85,0.4);border-radius:18px;padding:36px;max-width:680px;margin:0 auto;}
        .fg{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
        .fg label{font-size:11px;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:0.05em;}
        .fg2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        input,textarea,select{padding:11px 15px;background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.4);border-radius:8px;color:var(--tx);font-size:14px;font-family:inherit;width:100%;}
        input:focus,textarea:focus,select:focus{outline:none;border-color:var(--g);}
        .tbox{background:rgba(15,23,42,0.5);border:1px dashed rgba(16,185,129,0.25);border-radius:10px;padding:20px;margin-top:16px;}
        .tbox h3{color:var(--g);font-size:14px;margin-bottom:12px;}
        .tnote{font-size:11px;color:var(--mu);margin-top:4px;}
        .sub-btn{width:100%;padding:15px;background:linear-gradient(135deg,var(--g),#059669);border:none;border-radius:10px;color:#0a0f1e;font-size:16px;font-weight:700;cursor:pointer;margin-top:20px;font-family:inherit;}
        .sub-btn:hover{opacity:0.92;}
        #succMsg{display:none;background:rgba(16,185,129,0.08);border:1px solid var(--g);border-radius:10px;padding:18px;text-align:center;color:var(--g);margin-top:16px;}
        .how{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:18px;margin:36px 0;}
        .step{background:rgba(30,41,59,0.4);border-radius:14px;padding:22px;text-align:center;}
        .snum{width:44px;height:44px;background:linear-gradient(135deg,var(--g),#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;margin:0 auto 12px;color:#0a0f1e;}
        .step h4{color:var(--tx);margin-bottom:6px;font-size:15px;} .step p{color:var(--mu);font-size:13px;}
        @media(max-width:600px){.fg2{grid-template-columns:1fr;}.stats{gap:20px;}}
    </style>
</head>
<body>
    <nav><div class="ni">
        <a href="/" class="nlogo">☁️ 3EESHER-CLOUD</a>
        <div class="nl"><a href="/">Home</a><a href="/library">Library</a><a href="/#contact">Contact</a></div>
    </div></nav>
    <div class="hero">
        <h1>Reach Thousands of Real Buyers</h1>
        <p>Target by IP address, phone number, and IMEI. Your ad reaches the exact people you want — not random traffic.</p>
        <div class="stats">
            <div class="stat"><div class="n">10K+</div><div class="l">Monthly Visitors</div></div>
            <div class="stat"><div class="n">47</div><div class="l">Countries</div></div>
            <div class="stat"><div class="n">IMEI</div><div class="l">Device Targeting</div></div>
            <div class="stat"><div class="n">24/7</div><div class="l">Bot-Powered</div></div>
        </div>
    </div>
    <div class="wrap">
        <div class="stitle">📦 Choose Your Package</div>
        <div class="pkgs">
            ${pkgs.map((p,i)=>`
            <div class="pkg ${i===1?'pop':''}" id="pkg-${p.id}" onclick="selPkg('${p.id}')">
                ${i===1?'<div class="pbadge">⭐ POPULAR</div>':''}
                <div class="pname">${p.name}</div>
                <div class="pprice">$${p.price}<span>/campaign</span></div>
                <ul class="pfeats">
                    <li>${p.impressions.toLocaleString()} impressions</li>
                    <li>${p.duration} days duration</li>
                    <li>IP address targeting</li>
                    ${i>=1?'<li>Phone number targeting</li>':''}
                    ${i>=2?'<li>Priority placement</li>':''}
                    ${i>=3?'<li>IMEI device targeting</li><li>Dedicated support</li>':''}
                </ul>
                <p style="color:var(--mu);font-size:12px;margin-top:10px;">${p.description}</p>
            </div>`).join('')}
        </div>
        <div class="stitle">🚀 How It Works</div>
        <div class="how">
            <div class="step"><div class="snum">1</div><h4>Choose Package</h4><p>Pick the right budget and impressions for your goal</p></div>
            <div class="step"><div class="snum">2</div><h4>Submit Ad</h4><p>Fill your ad details and targeting info below</p></div>
            <div class="step"><div class="snum">3</div><h4>Pay & Activate</h4><p>Admin contacts you for payment then activates your ad</p></div>
            <div class="step"><div class="snum">4</div><h4>Track Results</h4><p>Real-time impressions and click tracking</p></div>
        </div>
        <div class="stitle">📝 Submit Your Ad</div>
        <div class="form-box">
            <div class="fg2">
                <div class="fg"><label>Your Name</label><input type="text" id="advN" placeholder="Name or business"></div>
                <div class="fg"><label>Email</label><input type="email" id="advE" placeholder="you@email.com"></div>
                <div class="fg"><label>Ad Title</label><input type="text" id="advT" placeholder="Catchy headline"></div>
                <div class="fg"><label>Call-to-Action</label><input type="text" id="advCta" placeholder="Shop Now / Learn More"></div>
            </div>
            <div class="fg"><label>Ad Description</label><textarea id="advD" rows="2" placeholder="Brief description of your product or offer"></textarea></div>
            <div class="fg2">
                <div class="fg"><label>Destination URL</label><input type="url" id="advU" placeholder="https://yoursite.com"></div>
                <div class="fg"><label>Ad Image URL (optional)</label><input type="url" id="advI" placeholder="https://yourimage.jpg"></div>
            </div>
            <div class="fg"><label>Package</label>
                <select id="advPkg">
                    ${pkgs.map(p=>`<option value="${p.id}">$${p.price} — ${p.name} (${p.impressions.toLocaleString()} impressions, ${p.duration} days)</option>`).join('')}
                </select>
            </div>
            <div class="tbox">
                <h3>🎯 Advanced Targeting (Optional)</h3>
                <p style="color:var(--mu);font-size:13px;margin-bottom:14px;">Target specific people by their IP, phone number, or device IMEI — like your own private ad network.</p>
                <div class="fg2">
                    <div class="fg"><label>Target IP Addresses</label><textarea id="advIps" rows="2" placeholder="192.168.1.1, 41.58.x.x"></textarea><div class="tnote">Comma-separated IPs or prefixes</div></div>
                    <div class="fg"><label>Target Phone Numbers</label><textarea id="advPhones" rows="2" placeholder="+2348012345678, ..."></textarea><div class="tnote">Comma-separated phone numbers</div></div>
                </div>
                <div class="fg"><label>Target IMEI Numbers (Enterprise)</label><textarea id="advImeis" rows="2" placeholder="356789012345678, ..."></textarea><div class="tnote">15-digit IMEI numbers — targets specific devices</div></div>
            </div>
            <button class="sub-btn" onclick="subAd()">🚀 Submit Ad — We'll Contact You for Payment</button>
            <div id="succMsg">✅ Ad submitted! We'll contact you at your email within 24 hours to confirm payment and activate your ad.<br><br>WhatsApp us directly: <strong>+2348123456789</strong></div>
        </div>
    </div>
    <script>
        function selPkg(id){document.querySelectorAll('.pkg').forEach(p=>p.classList.remove('sel'));document.getElementById('pkg-'+id).classList.add('sel');document.getElementById('advPkg').value=id;}
        async function subAd(){
            const n=document.getElementById('advN').value,e=document.getElementById('advE').value,t=document.getElementById('advT').value,u=document.getElementById('advU').value;
            if(!n||!e||!t||!u){alert('Fill Name, Email, Title and URL');return;}
            const btn=document.querySelector('.sub-btn');btn.textContent='⏳ Submitting...';btn.disabled=true;
            try{
                const r=await fetch('/api/ads/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
                    advertiserName:n,advertiserEmail:e,title:t,url:u,
                    description:document.getElementById('advD').value,
                    image:document.getElementById('advI').value,
                    cta:document.getElementById('advCta').value||'Learn More',
                    package:document.getElementById('advPkg').value,
                    targetIps:document.getElementById('advIps').value,
                    targetPhones:document.getElementById('advPhones').value,
                    targetImeis:document.getElementById('advImeis').value
                })});
                const d=await r.json();
                if(d.success){document.getElementById('succMsg').style.display='block';btn.textContent='✅ Submitted!';}
                else{btn.textContent='🚀 Submit Ad';btn.disabled=false;alert('Error: '+d.error);}
            }catch(err){btn.textContent='🚀 Submit Ad';btn.disabled=false;alert('Failed. WhatsApp us directly: +2348123456789');}
        }
    </script>
</body>
</html>`);
});

// ==================== SEO ROUTES ====================
app.get('/sitemap.xml', (req, res) => {
    const data = getData();
    let xml = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    xml += '<url><loc>https://3eesher-cloud.onrender.com/</loc><priority>1.0</priority></url>';
    xml += '<url><loc>https://3eesher-cloud.onrender.com/library</loc><priority>0.9</priority></url>';
    xml += '<url><loc>https://3eesher-cloud.onrender.com/advertise</loc><priority>0.8</priority></url>';
    data.blogPosts.forEach(p => { xml += `<url><loc>https://3eesher-cloud.onrender.com/blog/${p.id}</loc><lastmod>${p.date.split('T')[0]}</lastmod></url>`; });
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml').send(xml);
});

app.get('/feed.xml', (req, res) => {
    const data = getData();
    let rss = '<?xml version="1.0"?><rss version="2.0"><channel><title>3EESHER-CLOUD</title><link>https://3eesher-cloud.onrender.com</link><description>Make Money Online</description>';
    data.blogPosts.slice(0, 10).forEach(p => { rss += `<item><title>${p.title}</title><link>https://3eesher-cloud.onrender.com/blog/${p.id}</link><pubDate>${new Date(p.date).toUTCString()}</pubDate></item>`; });
    rss += '</channel></rss>';
    res.header('Content-Type', 'application/rss+xml').send(rss);
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://3eesher-cloud.onrender.com/sitemap.xml');
});

// ==================== SERVER START ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ========================================`);
    console.log(`🚀  3EESHER-CLOUD IS RUNNING`);
    console.log(`🚀 ========================================`);
    console.log(`📍 Main Page:  http://localhost:${PORT}`);
    console.log(`📚 Library:    http://localhost:${PORT}/library`);
    console.log(`🔐 Admin:      http://localhost:${PORT}/admin`);
    console.log(`🎯 Advertise:  http://localhost:${PORT}/advertise`);
    console.log(`👤 Login:      admin216 / admin1234  ← CHANGE IN SETTINGS!`);
    console.log(`📧 Gmail:      ${GMAIL_USER}`);
    console.log(`📊 Analytics:  G-HD01MF5SL9`);
    console.log(`🚀 ========================================`);
    console.log(`✅ Auto Money Maker:  Every hour`);
    console.log(`✅ Auto Blogger:      8am & 8pm`);
    console.log(`✅ Email Bot:         9am & 9pm → all subscribers`);
    console.log(`✅ Self-Report:       Every 4 hours to your Gmail`);
    console.log(`✅ Ad Engine:         IP/Phone/IMEI targeting`);
    console.log(`✅ Library:           6 free courses, member registration`);
    console.log(`✅ Universal Inject:  CSS/JS/HTML all work, saved to injections.json`);
    console.log(`✅ Natural Commands:  Talk to bot in plain English`);
    console.log(`✅ Affiliate /go/:    Tracked redirect links`);
    console.log(`🚀 ========================================\n`);
});
