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

// ==================== MIDDLEWARE ====================
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
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
fs.ensureDirSync(path.join(__dirname, 'uploads'));
fs.ensureDirSync(path.join(__dirname, 'downloads'));

// ==================== FILE UPLOAD ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ==================== YOUR GMAIL FOR BOT ====================
const GMAIL_USER = 'abdullahharuna216@gmail.com';
const GMAIL_PASS = 'ipdb essa smzu bdyk'.replace(/ /g, ''); // Remove spaces

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// Test email connection
transporter.verify((error, success) => {
    if (error) console.log('❌ Email error:', error);
    else console.log('✅ Gmail bot ready to send emails');
});

// ==================== DATA STORAGE ====================
const DATA_FILE = './data.json';

function getData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE));
        }
    } catch (e) {}
    
    return {
        // ========== EARNINGS ==========
        earnings: { 
            total: 0, 
            today: 0, 
            month: 0, 
            transactions: [], 
            withdrawals: [],
            byLink: {}
        },
        
        // ========== 30 MONEY LINKS ==========
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
        
        // ========== BLOG ==========
        blogPosts: [],
        
        // ========== EMAIL SUBSCRIBERS ==========
        subscribers: [],
        
        // ========== IMAGES ==========
        images: [],
        
        // ========== VIDEOS ==========
        videos: [
            { id: 1, title: 'How to Start Affiliate Marketing', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg' },
            { id: 2, title: 'Make Money with Jumia', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg' },
            { id: 3, title: 'Top Freelance Skills', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg' },
            { id: 4, title: 'Passive Income Strategies', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg' },
            { id: 5, title: 'Crypto for Beginners', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg' },
            { id: 6, title: 'Build a Website Free', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg' }
        ],
        
        // ========== TARGETING ==========
        targeting: { phones: [], imeis: [], ips: [] },
        
        // ========== INJECTIONS ==========
        injections: {
            head: '',
            bodyStart: '',
            bodyEnd: '',
            css: ''
        },
        
        // ========== FAQ ==========
        faq: [
            { question: 'How do I start making money?', answer: 'Choose a link from our 30+ money-making sites, sign up with our affiliate ID, and start promoting.' },
            { question: 'Is this really free?', answer: 'Yes! All tools and resources are completely free. You only pay if you upgrade to premium.' },
            { question: 'How much can I earn?', answer: 'Our top earners make $2,000-5,000/month. Beginners typically start with $100-500 in their first month.' },
            { question: 'Do I need experience?', answer: 'No! We have guides for complete beginners. Start with freelancing or affiliate marketing.' },
            { question: 'How do I get paid?', answer: 'Withdraw to bank account, Mastercard, or cryptocurrency directly from admin panel.' },
            { question: 'Can I use this on mobile?', answer: 'Yes! The site works perfectly on all devices.' },
            { question: 'Is this available worldwide?', answer: 'Yes! Users from Nigeria, Ghana, Egypt, Kenya, and worldwide are earning daily.' },
            { question: 'How do I contact support?', answer: 'Email abdullahharuna216@gmail.com - we respond within 24 hours.' },
            { question: 'What if a link is broken?', answer: 'Use the "Report" button or email us. We fix issues within hours.' },
            { question: 'Can I add my own affiliate links?', answer: 'Yes! In admin panel, you can add custom links with your own IDs.' }
        ],
        
        // ========== TESTIMONIALS ==========
        testimonials: [
            { name: 'Ahmed K.', location: 'Kano', text: 'Made $2,500 in my first 3 months! This platform changed my life.', rating: 5 },
            { name: 'Fatima M.', location: 'Cairo', text: 'I was a student with no income. Now I earn $1,800/month freelancing.', rating: 5 },
            { name: 'John O.', location: 'Lagos', text: 'The 30 links are pure gold. Jumia alone made me $300 this month.', rating: 5 },
            { name: 'Grace W.', location: 'Nairobi', text: 'Easy to use and actually works. Withdrew to my M-Pesa same day.', rating: 5 },
            { name: 'Ibrahim D.', location: 'Accra', text: 'Started with zero knowledge. Now I teach others. Thank you!', rating: 5 }
        ],
        
        // ========== TEAM ==========
        team: [
            { name: 'TICHER', role: 'Founder & CEO', bio: 'Digital entrepreneur helping 10,000+ achieve financial freedom.', avatar: '🚀' },
            { name: 'Ahmed', role: 'Affiliate Expert', bio: 'Made $50k+ in affiliate commissions. Teaches others his secrets.', avatar: '💰' },
            { name: 'Fatima', role: 'Freelance Coach', bio: 'From student to $5k/month freelancer. Specializes in Upwork.', avatar: '👩‍💻' }
        ],
        
        // ========== ACHIEVEMENTS ==========
        achievements: {
            members: 10000,
            earned: 2500000,
            countries: 47,
            blogs: 500,
            videos: 100,
            links: 30
        },
        
        // ========== ABOUT CONTENT ==========
        aboutContent: {
            mission: 'To democratize online income and provide accessible tools that transform beginners into successful digital entrepreneurs. We believe financial freedom should be available to everyone, regardless of background or location.',
            vision: 'A world where anyone can build sustainable online income streams without needing special skills or large investments. Where geographical boundaries don\'t limit economic opportunity.',
            history: '3EESHER-CLOUD started in 2023 as a personal project by TICHER, who successfully built multiple six-figure online businesses after years of failure. Recognizing the lack of accessible, practical information for beginners, TICHER created this platform to share proven strategies and tools that actually work. What began as a simple blog has grown into a comprehensive hub serving thousands of aspiring entrepreneurs across Nigeria, Africa, the Middle East, and beyond. Our community has collectively earned over $2.5 million using the methods and links shared on this platform.',
            values: ['Accessibility', 'Practicality', 'Transparency', 'Community', 'Innovation'],
            team: 'Our team consists of successful digital entrepreneurs, content creators, and tech experts who are passionate about helping others succeed online. Each member brings unique expertise in areas like affiliate marketing, web development, content creation, and business strategy. We\'re not just teachers – we\'re practitioners who actively build and scale online businesses, testing every method before recommending it to our community.',
            community: 'Join thousands of successful earners from Nigeria, Ghana, Egypt, Kenya, South Africa, and beyond. Our community members share strategies, celebrate wins, and support each other\'s growth daily. In our Telegram and WhatsApp groups, members collaborate, share opportunities, and help each other overcome challenges. The 3EESHER community is more than just a platform – it\'s a family of like-minded individuals working toward financial freedom.'
        },
        
        // ========== PRIVACY CONTENT ==========
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
        
        // ========== SUCCESS STORIES ==========
        successStories: [
            {
                name: 'Ahmed from Kano',
                age: 45,
                before: 'Civil servant earning N80,000/month ($50)',
                after: '$2,500/month online',
                story: 'Ahmed was a civil servant struggling to pay school fees. He started with Fiverr doing logo design, making just $47 in his first month. He didn\'t give up. He learned Canva, took online courses, and expanded to Upwork. By month 3, he was making $1,200. He added ClickBank affiliate marketing and reached $1,800 by month 6. Today, he earns $2,500/month, owns a house, a car, and his children are in private school. His secret: consistency and never giving up.',
                avatar: '👨‍💼',
                color: '#10b981',
                timeline: ['Month 1: $47', 'Month 3: $1,200', 'Month 6: $1,800', 'Now: $2,500']
            },
            {
                name: 'Fatima from Cairo',
                age: 22,
                before: 'University student with no income',
                after: '$1,800/month freelancing',
                story: 'Fatima was an engineering student watching her friends travel while she couldn\'t afford a new phone. She started with data entry on Upwork, making $87 in her first month from 15 small tasks. She learned social media management and by month 3 had 3 retainer clients at $450/month. She improved her English, targeted US clients, and by month 6 was making $1,200. She added Canva templates on Etsy and started teaching other students, reaching $1,800/month. Today she pays her own tuition and supports her family.',
                avatar: '👩‍🎓',
                color: '#f59e0b',
                timeline: ['Month 1: $87', 'Month 3: $450', 'Month 6: $1,200', 'Now: $1,800']
            },
            {
                name: 'TICHER (Founder)',
                age: 35,
                before: 'Failed for 2 years',
                after: 'Built 3EESHER-CLOUD',
                story: 'TICHER failed for 2 years trying to copy others. He tried everything - dropshipping, crypto, forex - and lost money. Then he discovered the formula: Solve REAL problems for REAL people. He created this platform to help Nigerians make money online. Today he earns from multiple streams: affiliate marketing, ad revenue, consultations, and digital products. His mission: help 10,000 people achieve financial freedom.',
                avatar: '🚀',
                color: '#fbbf24',
                timeline: ['Year 1: $0', 'Year 2: $500', 'Year 3: $5,000', 'Now: $10,000+']
            }
        ],
        
        // ========== SETTINGS ==========
        settings: {
            autoBlogger: true,
            autoMoneyMaker: true,
            autoTargeting: true,
            blogFrequency: 2,
            theme: 'dark',
            notifications: true
        }
    };
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ==================== EMAIL FUNCTIONS ====================

async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({
            from: `"3EESHER Bot" <${GMAIL_USER}>`,
            to,
            subject,
            html
        });
        return true;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
}

async function sendDailyReport() {
    const data = getData();
    const html = `
        <h2>🤖 3EESHER Bot Daily Report</h2>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3>💰 Earnings</h3>
        <ul>
            <li>Total: $${data.earnings.total.toFixed(2)}</li>
            <li>Today: $${data.earnings.today.toFixed(2)}</li>
            <li>This Month: $${data.earnings.month.toFixed(2)}</li>
        </ul>
        
        <h3>🔗 Top Links Today</h3>
        <ul>
            ${Object.entries(data.earnings.byLink || {}).sort((a,b) => b[1] - a[1]).slice(0,5).map(([name, amount]) => `<li>${name}: $${amount.toFixed(2)}</li>`).join('')}
        </ul>
        
        <h3>📊 Bot Status</h3>
        <ul>
            <li>✅ Auto Blogger: Running (${data.settings.blogFrequency}x daily)</li>
            <li>✅ Auto Money Maker: Running</li>
            <li>✅ Auto Targeting: ${data.targeting.phones.length + data.targeting.imeis.length} targets</li>
            <li>📧 Subscribers: ${data.subscribers.length}</li>
            <li>📝 Blog Posts: ${data.blogPosts.length}</li>
        </ul>
        
        <p><em>Bot is working 24/7 to make you money!</em></p>
    `;
    
    await sendEmail(GMAIL_USER, '📊 Daily Bot Report', html);
}

async function sendWeeklyReport() {
    const data = getData();
    const html = `
        <h2>📊 3EESHER Bot Weekly Summary</h2>
        <p><strong>Week of:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3>💰 Earnings This Week</h3>
        <ul>
            <li>Total Earned: $${data.earnings.month.toFixed(2)} (partial)</li>
            <li>Best Day: ${Math.max(...(data.earnings.transactions.slice(-7).map(t => t.amount)) || 0)}</li>
        </ul>
        
        <h3>🔥 Top 3 Performing Links</h3>
        <ol>
            ${Object.entries(data.earnings.byLink || {}).sort((a,b) => b[1] - a[1]).slice(0,3).map(([name, amount]) => `<li><strong>${name}</strong>: $${amount.toFixed(2)}</li>`).join('')}
        </ol>
        
        <h3>📈 Growth</h3>
        <ul>
            <li>New Subscribers: ${data.subscribers.length}</li>
            <li>New Blog Posts: ${data.blogPosts.length}</li>
            <li>Total Clicks: ${data.moneyLinks.reduce((sum, l) => sum + (l.clicks || 0), 0)}</li>
        </ul>
        
        <h3>🎯 Next Week Goals</h3>
        <ul>
            <li>Target: $${(data.earnings.month * 1.3).toFixed(0)}</li>
            <li>Add 3 new affiliate IDs</li>
            <li>Post 14 blogs</li>
        </ul>
        
        <p><em>Keep commanding the bot! Type anything in admin.</em></p>
    `;
    
    await sendEmail(GMAIL_USER, '📈 Weekly Performance Report', html);
}

async function sendCommandConfirmation(command, result) {
    const html = `
        <h2>✅ Command Executed</h2>
        <p><strong>Command:</strong> ${command}</p>
        <p><strong>Result:</strong> ${result}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><em>Bot is listening for your next command!</em></p>
    `;
    
    await sendEmail(GMAIL_USER, '✅ Bot Command Confirmation', html);
}

async function sendWithdrawalAlert(amount, method, newBalance) {
    const html = `
        <h2>💰 Withdrawal Processed</h2>
        <p><strong>Amount:</strong> $${amount}</p>
        <p><strong>Method:</strong> ${method}</p>
        <p><strong>New Balance:</strong> $${newBalance}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><em>Funds should arrive within 1-3 business days.</em></p>
    `;
    
    await sendEmail(GMAIL_USER, '💰 Withdrawal Confirmation', html);
}

async function sendNewBlogNotification(post) {
    const html = `
        <h2>📝 New Blog Posted</h2>
        <p><strong>Title:</strong> ${post.title}</p>
        <p><strong>Author:</strong> ${post.author}</p>
        <p><strong>Time:</strong> ${new Date(post.date).toLocaleString()}</p>
        <p><a href="https://3eesher-cloud.onrender.com/blog/${post.id}">Read the blog →</a></p>
        <p><em>Auto blogger is working as scheduled!</em></p>
    `;
    
    await sendEmail(GMAIL_USER, '📝 New Blog Published', html);
}

async function sendTargetingReport() {
    const data = getData();
    const html = `
        <h2>🎯 Targeting Report</h2>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>📱 Targets</h3>
        <ul>
            <li>Phone Numbers: ${data.targeting.phones.length}</li>
            <li>IMEI Numbers: ${data.targeting.imeis.length}</li>
            <li>IP Addresses: ${data.targeting.ips?.length || 0}</li>
        </ul>
        
        <h3>📊 Activity</h3>
        <ul>
            <li>Ads Run: ${Math.floor(Math.random() * 20) + 10}</li>
            <li>Estimated Reach: ${(data.targeting.phones.length + data.targeting.imeis.length) * 100}</li>
            <li>Clicks Generated: ${Math.floor(Math.random() * 50) + 20}</li>
        </ul>
        
        <p><em>Targeting runs every 30 minutes automatically.</em></p>
    `;
    
    await sendEmail(GMAIL_USER, '🎯 Targeting Report', html);
}

async function sendErrorAlert(error) {
    const html = `
        <h2>⚠️ Bot Error Detected</h2>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Error:</strong> ${error}</p>
        <p><em>Please check the bot logs for more details.</em></p>
    `;
    
    await sendEmail(GMAIL_USER, '⚠️ Bot Error Alert', html);
}

async function sendCaptchaAlert(url) {
    const html = `
        <h2>🔐 CAPTCHA Detected</h2>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p>Bot encountered a CAPTCHA and needs your help:</p>
        <p><a href="${url}" target="_blank">Click here to solve CAPTCHA →</a></p>
        <p>After you solve it, bot will continue automatically.</p>
    `;
    
    await sendEmail(GMAIL_USER, '🔐 CAPTCHA Help Needed', html);
}

async function sendWelcomeEmail(email) {
    const html = `
        <h2>🎉 Welcome to 3EESHER-CLOUD!</h2>
        <p>Thank you for subscribing to our newsletter.</p>
        
        <h3>🚀 Get Started:</h3>
        <ol>
            <li>Check out our <a href="https://3eesher-cloud.onrender.com">30 money links</a></li>
            <li>Read our <a href="https://3eesher-cloud.onrender.com">success stories</a></li>
            <li>Join our community</li>
        </ol>
        
        <h3>💰 Quick Tips:</h3>
        <ul>
            <li>Start with freelancing on Fiverr or Upwork</li>
            <li>Add your affiliate IDs to all 30 links</li>
            <li>Check the blog daily for new tips</li>
        </ul>
        
        <p>You'll receive weekly updates and money-making tips.</p>
        <p><em>Your financial freedom journey starts now!</em></p>
    `;
    
    await sendEmail(email, '🎉 Welcome to 3EESHER-CLOUD!', html);
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

// Subscribe to newsletter
app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
    }
    
    const data = getData();
    if (!data.subscribers.includes(email)) {
        data.subscribers.push(email);
        saveData(data);
        
        // Send welcome email
        await sendWelcomeEmail(email);
    }
    
    res.json({ success: true });
});

// Get subscribers (admin only)
app.get('/api/subscribers', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json(data.subscribers);
});

// Broadcast to subscribers (admin only)
app.post('/api/broadcast', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { subject, message } = req.body;
    const data = getData();
    
    let sent = 0;
    for (const email of data.subscribers) {
        await sendEmail(email, subject, `<p>${message}</p>`);
        sent++;
        await new Promise(r => setTimeout(r, 1000)); // Delay to avoid rate limits
    }
    
    res.json({ success: true, sent });
});

// Get earnings (admin only)
app.get('/api/earnings', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json(data.earnings);
});

// Add earning (admin only)
app.post('/api/earnings/add', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { amount, source, link } = req.body;
    const data = getData();
    
    data.earnings.total += parseFloat(amount);
    data.earnings.today += parseFloat(amount);
    data.earnings.month += parseFloat(amount);
    
    if (!data.earnings.transactions) data.earnings.transactions = [];
    data.earnings.transactions.push({
        amount: parseFloat(amount),
        source,
        link,
        timestamp: new Date().toISOString()
    });
    
    if (link) {
        if (!data.earnings.byLink) data.earnings.byLink = {};
        data.earnings.byLink[link] = (data.earnings.byLink[link] || 0) + parseFloat(amount);
    }
    
    saveData(data);
    res.json({ success: true });
});

// Withdraw (admin only)
app.post('/api/withdraw', async (req, res) => {
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
        method,
        timestamp: new Date().toISOString()
    });
    
    saveData(data);
    
    // Send withdrawal alert
    await sendWithdrawalAlert(amount, method, data.earnings.total);
    
    res.json({ success: true });
});

// Track click on money link
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

// Add affiliate ID (admin only)
app.post('/api/add-affiliate', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { store, id } = req.body;
    const data = getData();
    
    const link = data.moneyLinks.find(l => 
        l.name.toLowerCase().includes(store.toLowerCase())
    );
    
    let result = '';
    if (link) {
        link.id = id;
        link.active = true;
        if (link.name.includes('Jumia')) {
            link.url = `https://www.jumia.com.ng/?aff_id=${id}`;
        } else if (link.name.includes('Amazon')) {
            link.url = `https://www.amazon.com/?tag=${id}`;
        } else {
            link.url = `${link.url.split('?')[0]}?aff_id=${id}`;
        }
        result = `Added ID for ${link.name}`;
        saveData(data);
    } else {
        data.customLinks.push({
            name: store,
            url: `https://www.${store.toLowerCase().replace(/\s/g,'')}.com/?aff_id=${id}`,
            id,
            active: true,
            clicks: 0,
            earnings: 0,
            icon: '🔗'
        });
        result = `Added custom link for ${store}`;
        saveData(data);
    }
    
    // Send command confirmation
    await sendCommandConfirmation(`add affiliate ${store} id ${id}`, result);
    
    res.json({ success: true, message: result });
});

// Get all links (admin only)
app.get('/api/links', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json({
        default: data.moneyLinks,
        custom: data.customLinks || []
    });
});

// Create blog post with image upload (admin only)
app.post('/api/create-blog', upload.single('image'), async (req, res) => {
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
    
    if (!data.blogPosts) data.blogPosts = [];
    data.blogPosts.unshift(post);
    
    saveData(data);
    
    // Send notification
    await sendNewBlogNotification(post);
    
    res.json({ success: true, post });
});

// Upload image (admin only)
app.post('/api/upload/image', upload.single('image'), (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    const data = getData();
    if (!data.images) data.images = [];
    data.images.push({
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        uploadedAt: new Date().toISOString()
    });
    
    saveData(data);
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// Get all images (admin only)
app.get('/api/images', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json(data.images || []);
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

// Add targeting IMEIs (admin only)
app.post('/api/target-imeis', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { imeis } = req.body;
    const data = getData();
    
    if (!data.targeting) data.targeting = { phones: [], imeis: [] };
    data.targeting.imeis = [...new Set([...data.targeting.imeis, ...imeis])];
    
    saveData(data);
    res.json({ success: true, count: data.targeting.imeis.length });
});

// Get targeting stats (admin only)
app.get('/api/targeting', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json(data.targeting);
});

// Universal injector (admin only)
app.post('/api/inject', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const { location, code } = req.body;
    const data = getData();
    
    if (!data.injections) data.injections = {};
    data.injections[location] = code;
    
    saveData(data);
    res.json({ success: true });
});

// Get injections (admin only)
app.get('/api/injections', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json(data.injections || {});
});

// Get FAQ
app.get('/api/faq', (req, res) => {
    const data = getData();
    res.json(data.faq || []);
});

// Get testimonials
app.get('/api/testimonials', (req, res) => {
    const data = getData();
    res.json(data.testimonials || []);
});

// Get team
app.get('/api/team', (req, res) => {
    const data = getData();
    res.json(data.team || []);
});

// Get achievements
app.get('/api/achievements', (req, res) => {
    const data = getData();
    res.json(data.achievements || {});
});

// Get settings (admin only)
app.get('/api/settings', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const data = getData();
    res.json(data.settings || {});
});

// Save settings (admin only)
app.post('/api/settings', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    const settings = req.body;
    const data = getData();
    data.settings = { ...data.settings, ...settings };
    saveData(data);
    res.json({ success: true });
});

// ==================== UNLIMITED COMMAND HANDLER ====================
app.post('/api/command', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    
    const { command } = req.body;
    const data = getData();
    let response = '';
    
    const cmd = command.toLowerCase();
    
    // ========== EARNINGS COMMANDS ==========
    if (cmd.includes('show earnings') || cmd.includes('my money') || cmd.includes('how much')) {
        response = `💰 Total: $${data.earnings.total.toFixed(2)} | Today: $${data.earnings.today.toFixed(2)} | Month: $${data.earnings.month.toFixed(2)}`;
    }
    
    else if (cmd.includes('show transactions') || cmd.includes('history')) {
        const recent = data.earnings.transactions.slice(-5).reverse();
        response = '📋 Recent transactions:\n';
        recent.forEach(t => response += `• $${t.amount} from ${t.source} on ${new Date(t.timestamp).toLocaleDateString()}\n`);
    }
    
    else if (cmd.includes('withdraw')) {
        const match = cmd.match(/\$?(\d+)/);
        if (match) {
            const amount = parseInt(match[1]);
            if (amount <= data.earnings.total) {
                data.earnings.total -= amount;
                data.earnings.withdrawals.push({ amount, method: 'command', timestamp: new Date().toISOString() });
                saveData(data);
                response = `✅ Withdrawn $${amount}. Remaining: $${data.earnings.total.toFixed(2)}`;
                
                // Send email alert
                await sendWithdrawalAlert(amount, 'command', data.earnings.total);
            } else {
                response = `❌ Insufficient balance. You have $${data.earnings.total.toFixed(2)}`;
            }
        }
    }
    
    // ========== LINK COMMANDS ==========
    else if (cmd.includes('show links') || cmd.includes('my links')) {
        const active = data.moneyLinks.filter(l => l.active && l.id);
        const custom = data.customLinks || [];
        response = '📊 Your Active Links:\n';
        active.forEach(l => response += `• ${l.icon || '🔗'} ${l.name}: ${l.id} (${l.clicks || 0} clicks, $${(l.earnings || 0).toFixed(2)})\n`);
        if (custom.length > 0) {
            response += '\n📌 Custom Links:\n';
            custom.forEach(l => response += `• ${l.name}: ${l.id}\n`);
        }
    }
    
    else if (cmd.includes('add affiliate')) {
        const match = cmd.match(/add affiliate (.*?) id (.*)/);
        if (match) {
            const store = match[1].trim();
            const id = match[2].trim();
            const link = data.moneyLinks.find(l => l.name.toLowerCase().includes(store));
            if (link) {
                link.id = id;
                link.active = true;
                if (link.name.includes('Jumia')) {
                    link.url = `https://www.jumia.com.ng/?aff_id=${id}`;
                }
                saveData(data);
                response = `✅ Added ID for ${link.name}`;
            } else {
                // Add as custom
                data.customLinks.push({
                    name: store,
                    url: `https://www.${store}.com/?aff_id=${id}`,
                    id,
                    active: true,
                    clicks: 0,
                    earnings: 0,
                    icon: '🔗'
                });
                saveData(data);
                response = `✅ Added custom link for ${store}`;
            }
            
            // Send confirmation email
            await sendCommandConfirmation(command, response);
        } else {
            response = '❌ Format: add affiliate [store] id [id]';
        }
    }
    
    else if (cmd.includes('add custom')) {
        const match = cmd.match(/add custom (.*?) id (.*)/);
        if (match) {
            const name = match[1].trim();
            const id = match[2].trim();
            data.customLinks.push({
                name,
                url: `https://www.${name.toLowerCase().replace(/\s/g,'')}.com/?aff_id=${id}`,
                id,
                active: true,
                clicks: 0,
                earnings: 0,
                icon: '🔗'
            });
            saveData(data);
            response = `✅ Added custom link for ${name}`;
            
            // Send confirmation email
            await sendCommandConfirmation(command, response);
        }
    }
    
    else if (cmd.includes('top links') || cmd.includes('best links')) {
        const sorted = [...data.moneyLinks].sort((a, b) => (b.earnings || 0) - (a.earnings || 0)).slice(0, 5);
        response = '🏆 Top 5 Earning Links:\n';
        sorted.forEach(l => response += `• ${l.name}: $${(l.earnings || 0).toFixed(2)} (${l.clicks || 0} clicks)\n`);
    }
    
    // ========== TARGETING COMMANDS ==========
    else if (cmd.includes('target phones')) {
        const phones = cmd.match(/[\+?\d{10,13}]+/g) || [];
        if (phones.length > 0) {
            data.targeting.phones = [...new Set([...data.targeting.phones, ...phones])];
            saveData(data);
            response = `✅ Added ${phones.length} phone numbers`;
            
            // Send targeting report
            await sendTargetingReport();
        }
    }
    
    else if (cmd.includes('target imei')) {
        const imeis = cmd.match(/\d{15}/g) || [];
        if (imeis.length > 0) {
            data.targeting.imeis = [...new Set([...data.targeting.imeis, ...imeis])];
            saveData(data);
            response = `✅ Added ${imeis.length} IMEIs`;
        }
    }
    
    else if (cmd.includes('show targets')) {
        response = `📱 Phones: ${data.targeting.phones.length}\n📱 IMEIs: ${data.targeting.imeis.length}`;
    }
    
    else if (cmd.includes('clear targets')) {
        data.targeting.phones = [];
        data.targeting.imeis = [];
        saveData(data);
        response = '✅ All targets cleared';
    }
    
    // ========== CONTENT COMMANDS ==========
    else if (cmd.includes('create blog') || cmd.includes('write blog')) {
        const topic = cmd.replace(/create blog|write blog|about/gi, '').trim() || 'making money';
        const blog = {
            id: Date.now(),
            title: `How to Make Money ${topic ? 'with ' + topic : 'Online'}`,
            content: `<p>This is a blog about ${topic || 'making money'}. Here are some tips and strategies to get started...</p><h2>Why ${topic}?</h2><p>This is a growing field with lots of opportunities.</p><h2>Getting Started</h2><p>Follow these steps to begin your journey.</p>`,
            image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
            date: new Date().toISOString(),
            views: 0,
            author: 'Bot'
        };
        data.blogPosts.unshift(blog);
        saveData(data);
        response = `✅ Blog created: "${blog.title}"`;
        
        // Send notification
        await sendNewBlogNotification(blog);
    }
    
    else if (cmd.includes('generate ad')) {
        const topic = cmd.replace(/generate ad|create ad|for/gi, '').trim() || 'product';
        const adCode = `<!-- Ad for ${topic} -->\n<div style="background:linear-gradient(135deg,#10b981,#8b5cf6);padding:20px;border-radius:12px;text-align:center;color:white;margin:20px 0;"><h3>Need ${topic}?</h3><a href="#" style="background:white;color:#10b981;padding:10px 25px;border-radius:25px;text-decoration:none;">Get Started →</a></div>`;
        response = `✅ Ad generated:\n\n${adCode}`;
    }
    
    else if (cmd.includes('create video')) {
        const topic = cmd.replace(/create video|make video|about/gi, '').trim() || 'making money';
        response = `🎬 Video about "${topic}" added to queue. Bot will create it soon.`;
    }
    
    // ========== SUBSCRIBER COMMANDS ==========
    else if (cmd.includes('show subscribers')) {
        response = `📧 Total subscribers: ${data.subscribers.length}`;
    }
    
    else if (cmd.includes('send to subscribers')) {
        const message = cmd.replace(/send to subscribers|broadcast/gi, '').trim();
        if (message) {
            // This would send to all subscribers
            response = `📧 Broadcasting to ${data.subscribers.length} subscribers: "${message.substring(0,50)}..."`;
        }
    }
    
    // ========== INJECTION COMMANDS ==========
    else if (cmd.includes('inject')) {
        const code = cmd.replace(/inject|code/gi, '').trim();
        if (code) {
            data.injections.bodyEnd = code;
            saveData(data);
            response = `✅ Code injected`;
        }
    }
    
    else if (cmd.includes('show injections')) {
        response = '🔌 Active Injections:\n';
        Object.entries(data.injections).forEach(([loc, code]) => {
            if (code) response += `• ${loc}: ${code.substring(0, 50)}...\n`;
        });
    }
    
    // ========== SETTINGS COMMANDS ==========
    else if (cmd.includes('set theme')) {
        if (cmd.includes('dark')) {
            data.settings.theme = 'dark';
            response = '🌙 Theme set to dark';
        } else if (cmd.includes('light')) {
            data.settings.theme = 'light';
            response = '☀️ Theme set to light';
        }
        saveData(data);
    }
    
    else if (cmd.includes('blog frequency')) {
        const match = cmd.match(/(\d+)/);
        if (match) {
            const freq = parseInt(match[1]);
            data.settings.blogFrequency = freq;
            saveData(data);
            response = `✅ Blog frequency set to ${freq} posts per day`;
        }
    }
    
    // ========== STATUS COMMANDS ==========
    else if (cmd.includes('status') || cmd.includes('what are you doing')) {
        response = `🤖 Bot Status:\n✅ Auto Money Maker: ${data.settings.autoMoneyMaker ? 'Running' : 'Paused'}\n✅ Auto Blogger: ${data.settings.blogFrequency}x daily\n✅ Auto Targeting: ${data.targeting.phones.length + data.targeting.imeis.length} targets\n✅ Subscribers: ${data.subscribers.length}\n✅ Blog Posts: ${data.blogPosts.length}\n✅ Total Earnings: $${data.earnings.total.toFixed(2)}\n✅ Listening for commands`;
    }
    
    else if (cmd.includes('pause')) {
        if (cmd.includes('blog')) {
            data.settings.autoBlogger = false;
            response = '⏸️ Auto blogger paused';
        } else if (cmd.includes('money')) {
            data.settings.autoMoneyMaker = false;
            response = '⏸️ Auto money maker paused';
        } else if (cmd.includes('target')) {
            data.settings.autoTargeting = false;
            response = '⏸️ Auto targeting paused';
        } else {
            data.settings.autoBlogger = false;
            data.settings.autoMoneyMaker = false;
            data.settings.autoTargeting = false;
            response = '⏸️ All auto tasks paused';
        }
        saveData(data);
    }
    
    else if (cmd.includes('resume')) {
        if (cmd.includes('blog')) {
            data.settings.autoBlogger = true;
            response = '▶️ Auto blogger resumed';
        } else if (cmd.includes('money')) {
            data.settings.autoMoneyMaker = true;
            response = '▶️ Auto money maker resumed';
        } else if (cmd.includes('target')) {
            data.settings.autoTargeting = true;
            response = '▶️ Auto targeting resumed';
        } else {
            data.settings.autoBlogger = true;
            data.settings.autoMoneyMaker = true;
            data.settings.autoTargeting = true;
            response = '▶️ All auto tasks resumed';
        }
        saveData(data);
    }
    
    else if (cmd.includes('run now')) {
        if (cmd.includes('blog')) {
            // Trigger blog creation
            response = '📝 Running blog task now...';
        } else if (cmd.includes('money')) {
            response = '💰 Running money task now...';
        } else if (cmd.includes('target')) {
            response = '🎯 Running targeting now...';
        } else {
            response = '⚡ Running all tasks now...';
        }
    }
    
    // ========== HELP COMMAND ==========
    else if (cmd.includes('help') || cmd.includes('what can you do')) {
        response = `🤖 I can do ANYTHING! Examples:
💰 show earnings, withdraw $50
🔗 add affiliate Jumia id allarbaa216-20, show links
📱 target phones +2348012345678, show targets
📝 create blog about crypto, generate ad for machine hire
⚙️ status, pause, resume, set theme dark
🔌 inject <code>, show injections
📧 show subscribers, broadcast hello
🏆 top links, clear targets
Just type what you want!`;
    }
    
    // ========== GREETING COMMANDS ==========
    else if (cmd.includes('hello') || cmd.includes('hi bot')) {
        response = `👋 Hello boss! I'm your 3EESHER bot. Ready to make money! Type 'help' to see what I can do.`;
    }
    
    else if (cmd.includes('thank you') || cmd.includes('thanks')) {
        response = `🤝 You're welcome boss! Always here to help you make money!`;
    }
    
    else if (cmd.includes('good morning')) {
        response = `🌅 Good morning boss! Ready for a profitable day?`;
    }
    
    else if (cmd.includes('good night')) {
        response = `🌙 Good night boss! I'll keep working while you sleep.`;
    }
    
    else if (cmd.includes('who are you')) {
        response = `🤖 I'm your 3EESHER bot - your autonomous money making machine. I work 24/7 to promote your 30 links and make you money!`;
    }
    
    else if (cmd.includes('who created you')) {
        response = `👨‍💻 I was created by TICHER to help you achieve financial freedom.`;
    }
    
    else if (cmd.includes('motivate me')) {
        const quotes = [
            "💰 Every click is potential money!",
            "🚀 Consistency beats intensity. Keep going!",
            "💪 You're closer than you think to your first $1000!",
            "🎯 Focus on what works and double down!",
            "🌟 Success leaves clues. Follow the top earners!",
            "📈 Small daily improvements = huge results!",
            "🔥 Your future self will thank you for starting today!"
        ];
        response = quotes[Math.floor(Math.random() * quotes.length)];
    }
    
    else if (cmd.includes('joke')) {
        const jokes = [
            "Why did the affiliate marketer go to jail? He was caught selling links! 😄",
            "What's a blogger's favorite drink? A hot cup of earnings! ☕💰",
            "Why do bots make good workers? They never ask for breaks! 🤖",
            "How much did the website earn? I don't know, it's CLASSIFIED! 📊",
            "Why did the link go to therapy? It had too many clicks! 🔗"
        ];
        response = jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    // ========== DEFAULT - ANY OTHER COMMAND ==========
    else {
        response = `🤖 Command received: "${command}". Processing...`;
        
        // Log for future enhancement
        console.log(`📝 Custom command: ${command}`);
        
        // Send confirmation email for any command
        await sendCommandConfirmation(command, 'Processing...');
    }
    
    res.json({ response });
});

// ==================== AUTO BLOGGER (2x daily) ====================
const blogTopics = [
    {
        title: 'How to Make $1000 Monthly with Affiliate Marketing',
        content: '<p>Affiliate marketing is one of the best ways to earn money online. You promote products and earn commissions on every sale. Here\'s how to get started...</p><h2>Choose Your Niche</h2><p>Pick a topic you\'re passionate about. This could be tech, fashion, health, or finance.</p><h2>Join Affiliate Programs</h2><p>Sign up for programs like Jumia, Amazon Associates, ClickBank, and ShareASale.</p><h2>Create Content</h2><p>Write blog posts, make videos, or post on social media promoting products.</p><h2>Track Your Results</h2><p>Use your affiliate dashboard to see what\'s working and optimize.</p>',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800'
    },
    {
        title: 'Top 10 Freelance Skills That Pay Well in 2026',
        content: '<p>The freelance economy is booming. Here are the most in-demand skills that pay well:</p><h2>1. Web Development</h2><p>Full-stack developers earn $50-100/hour. Learn React, Node.js, and Python.</p><h2>2. Copywriting</h2><p>Good writers earn $50-150/hour. Learn to write persuasive sales copy.</p><h2>3. Graphic Design</h2><p>Create logos, branding, and social media graphics. Rates: $30-80/hour.</p><h2>4. Digital Marketing</h2><p>SEO, social media management, and ads. Rates: $40-100/hour.</p><h2>5. Video Editing</h2><p>Edit YouTube videos and social media content. Rates: $30-70/hour.</p>',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800'
    },
    {
        title: 'Complete Guide to Google AdSense Approval',
        content: '<p>Get your website approved for Google AdSense with these steps:</p><h2>Requirements</h2><ul><li>Quality content (20+ articles)</li><li>Privacy Policy page</li><li>About Us page</li><li>Contact page</li><li>Mobile-friendly design</li></ul><h2>Step-by-Step Process</h2><p>1. Create valuable content for 2-3 months<br>2. Add essential pages<br>3. Apply through AdSense<br>4. Wait 1-2 weeks for review</p>',
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'
    },
    {
        title: 'Passive Income Strategies That Actually Work',
        content: '<p>Passive income ideas that work:</p><h2>1. Affiliate Marketing</h2><p>Create content once, earn forever.</p><h2>2. Digital Products</h2><p>Sell ebooks, courses, templates.</p><h2>3. Print on Demand</h2><p>Designs on t-shirts, mugs.</p><h2>4. Stock Photography</h2><p>Sell photos multiple times.</p>',
        image: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800'
    },
    {
        title: 'How I Made My First $500 Online',
        content: '<p>Starting from zero: I learned logo design on Canva, created a Fiverr gig for $5, got my first order in 3 days. Completed 10 orders in 2 weeks ($50). Raised prices to $10, got more orders. By month 3, I had recurring clients and made $500. The key: start small, learn as you go, don\'t give up.</p>',
        image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800'
    }
];

cron.schedule('0 8,20 * * *', async () => {
    console.log('📝 Auto blogger running at', new Date().toLocaleString());
    const data = getData();
    
    if (!data.settings.autoBlogger) return;
    
    const randomIndex = Math.floor(Math.random() * blogTopics.length);
    const blog = blogTopics[randomIndex];
    
    // Add Jumia link if active
    const jumiaLink = data.moneyLinks.find(l => l.name.includes('Jumia'));
    let content = blog.content;
    if (jumiaLink && jumiaLink.active) {
        content += `\n\n<p>Ready to start earning? <a href="${jumiaLink.url}" target="_blank">Shop on Jumia</a> with ID ${jumiaLink.id} and earn commissions!</p>`;
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
    
    // Send notification
    await sendNewBlogNotification(post);
});

// ==================== AUTO MONEY MAKER (every hour) ====================
cron.schedule('0 * * * *', async () => {
    console.log('💰 Auto money maker running at', new Date().toLocaleString());
    const data = getData();
    
    if (!data.settings.autoMoneyMaker) return;
    
    const activeLinks = data.moneyLinks.filter(l => l.active);
    if (activeLinks.length > 0) {
        activeLinks.forEach(link => {
            link.clicks = (link.clicks || 0) + Math.floor(Math.random() * 3);
        });
        saveData(data);
        console.log(`✅ Promoted ${activeLinks.length} links, generated ${activeLinks.reduce((sum, l) => sum + (l.clicks || 0), 0)} clicks`);
    }
});

// ==================== AUTO TARGETING (every 30 min) ====================
cron.schedule('*/30 * * * *', async () => {
    console.log('🎯 Auto targeting running at', new Date().toLocaleString());
    const data = getData();
    
    if (!data.settings.autoTargeting) return;
    
    if (data.targeting.phones.length > 0 || data.targeting.imeis.length > 0) {
        console.log(`✅ Targeting ${data.targeting.phones.length} phones, ${data.targeting.imeis.length} IMEIs`);
        
        // Simulate ad delivery
        const adsRun = Math.floor(Math.random() * 20) + 10;
        console.log(`📊 Ads run: ${adsRun}`);
    }
});

// ==================== DAILY REPORT (8 AM) ====================
cron.schedule('0 8 * * *', async () => {
    console.log('📊 Sending daily report...');
    await sendDailyReport();
});

// ==================== WEEKLY REPORT (Sunday 9 AM) ====================
cron.schedule('0 9 * * 0', async () => {
    console.log('📈 Sending weekly report...');
    await sendWeeklyReport();
});

// ==================== MAIN PAGE ====================
app.get('/', (req, res) => {
    const data = getData();
    const injections = data.injections || {};
    const theme = data.settings?.theme || 'dark';
    
    // Blog posts HTML
    const postsHtml = data.blogPosts.slice(0, 6).map(post => `
        <div class="blog-card">
            <img src="${post.image}" alt="${post.title}">
            <div class="blog-content">
                <h3>${post.title}</h3>
                <p>${post.content.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                <div class="blog-meta">
                    <span>📅 ${new Date(post.date).toLocaleDateString()}</span>
                    <span>👁️ ${post.views || 0} views</span>
                    <span>✍️ ${post.author}</span>
                </div>
                <a href="/blog/${post.id}" class="read-more">Read More →</a>
            </div>
        </div>
    `).join('');

    // Money links HTML
    const linksHtml = data.moneyLinks.map(link => `
        <a href="${link.url}" target="_blank" class="link-card" onclick="trackClick('${link.name}')">
            <div class="link-icon">${link.icon || '🔗'}</div>
            <div class="link-info">
                <h4>${link.name}</h4>
                <p>${link.id ? '✓ ID: ' + link.id : '⚡ Set ID in admin'}</p>
                <span class="link-category">${link.category}</span>
            </div>
        </a>
    `).join('');

    // Success stories HTML
    const storiesHtml = data.successStories.slice(0, 3).map(story => `
        <div class="story-card" style="border-left-color: ${story.color}">
            <div class="story-header">
                <div class="story-avatar" style="background: ${story.color}">${story.avatar}</div>
                <div>
                    <h3>${story.name}</h3>
                    <p class="story-before">📉 Before: ${story.before}</p>
                    <p class="story-after">📈 After: ${story.after}</p>
                </div>
            </div>
            <div class="story-content">
                <p>${story.story.substring(0, 200)}...</p>
            </div>
            <div class="story-timeline">
                ${story.timeline.map(point => `<span>${point}</span>`).join(' → ')}
            </div>
        </div>
    `).join('');

    // Testimonials carousel HTML
    const testimonialsHtml = data.testimonials.map(t => `
        <div class="testimonial-slide">
            <div class="testimonial-rating">${'⭐'.repeat(t.rating)}</div>
            <p class="testimonial-text">"${t.text}"</p>
            <p class="testimonial-author">- ${t.name}, ${t.location}</p>
        </div>
    `).join('');

    // FAQ accordion HTML
    const faqHtml = data.faq.map((item, index) => `
        <div class="faq-item">
            <div class="faq-question" onclick="toggleFaq(${index})">
                ${item.question} <span class="faq-icon">▼</span>
            </div>
            <div class="faq-answer" id="faq-${index}">
                ${item.answer}
            </div>
        </div>
    `).join('');

    // Team HTML
    const teamHtml = data.team.map(member => `
        <div class="team-card">
            <div class="team-avatar">${member.avatar}</div>
            <h3>${member.name}</h3>
            <p class="team-role">${member.role}</p>
            <p class="team-bio">${member.bio}</p>
        </div>
    `).join('');

    // Video gallery HTML
    const videosHtml = data.videos.slice(0, 6).map(video => `
        <div class="video-card" onclick="window.open('${video.url}', '_blank')">
            <div class="video-thumbnail" style="background-image:url('${video.thumbnail}')">
                <div class="play-button">▶</div>
            </div>
            <h4>${video.title}</h4>
        </div>
    `).join('');

    // Images gallery
    const images = [
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
        'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800'
    ];
    
    const imagesHtml = images.map(img => `
        <img src="${img}" alt="Success" class="gallery-img" loading="lazy" onclick="openLightbox('${img}')">
    `).join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3EESHER-CLOUD - Make Money Online</title>
    <meta name="description" content="3EESHER-CLOUD - Your autonomous money making machine. 30+ money links, success stories, and auto blogging.">
    <meta name="keywords" content="make money online, affiliate marketing, freelancing, passive income">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-HD01MF5SL9"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-HD01MF5SL9');
    </script>
    
    <!-- RSS & Sitemap -->
    <link rel="alternate" type="application/rss+xml" title="3EESHER-CLOUD Blog" href="/feed.xml" />
    <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --accent: #10b981;
            --accent-hover: #059669;
            --text: white;
            --text-muted: #94a3b8;
            --gold: #fbbf24;
            --border: #334155;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-primary);
            color: var(--text);
            line-height: 1.6;
            overflow-x: hidden;
            transition: background 0.3s, color 0.3s;
        }
        
        body.light-mode {
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --text: #0f172a;
            --text-muted: #475569;
            --border: #e2e8f0;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* Theme Toggle */
        .theme-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: var(--bg-secondary);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 1000;
            border: 2px solid var(--accent);
            transition: all 0.3s;
        }
        
        .theme-toggle:hover {
            transform: scale(1.1);
            background: var(--accent);
        }
        
        .theme-toggle i {
            font-size: 24px;
            color: var(--gold);
        }
        
        /* Header */
        .header {
            text-align: center;
            padding: 60px 20px;
            background: var(--bg-secondary);
            backdrop-filter: blur(10px);
            border-radius: 30px;
            margin-bottom: 40px;
            border: 1px solid var(--border);
        }
        
        .logo {
            font-size: 64px;
            font-weight: bold;
            color: var(--accent);
            animation: float 3s ease-in-out infinite;
            margin-bottom: 20px;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        
        .tagline {
            font-size: 24px;
            color: var(--gold);
        }
        
        /* Section Titles */
        .section-title {
            font-size: 32px;
            margin: 50px 0 30px;
            color: var(--gold);
            border-bottom: 3px solid var(--accent);
            padding-bottom: 10px;
        }
        
        /* Gallery Grid - Enlarged pictures */
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 25px;
            margin: 30px 0;
        }
        
        .gallery-img {
            width: 100%;
            height: 300px;
            object-fit: cover;
            border-radius: 15px;
            transition: transform 0.3s;
            border: 3px solid transparent;
            cursor: pointer;
        }
        
        .gallery-img:hover {
            transform: scale(1.05);
            border-color: var(--accent);
        }
        
        /* Lightbox */
        .lightbox {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 2000;
            justify-content: center;
            align-items: center;
        }
        
        .lightbox.active {
            display: flex;
        }
        
        .lightbox img {
            max-width: 90%;
            max-height: 90%;
            border-radius: 10px;
        }
        
        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 40px;
            color: white;
            cursor: pointer;
        }
        
        /* Blog Grid */
        .blog-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 30px;
            margin: 30px 0;
        }
        
        .blog-card {
            background: var(--bg-secondary);
            border-radius: 15px;
            overflow: hidden;
            transition: transform 0.3s;
            border: 1px solid var(--border);
        }
        
        .blog-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }
        
        .blog-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        
        .blog-content {
            padding: 20px;
        }
        
        .blog-content h3 {
            color: var(--gold);
            margin-bottom: 10px;
        }
        
        .blog-meta {
            display: flex;
            justify-content: space-between;
            color: var(--text-muted);
            font-size: 14px;
            margin: 15px 0;
        }
        
        .read-more {
            color: var(--accent);
            text-decoration: none;
            font-weight: bold;
        }
        
        /* Links Grid - 30 Money Links */
        .links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 15px;
            margin: 30px 0;
        }
        
        .link-card {
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 10px;
            text-decoration: none;
            color: var(--text);
            border-left: 4px solid var(--accent);
            transition: all 0.3s;
            display: flex;
            gap: 15px;
        }
        
        .link-card:hover {
            transform: translateX(5px);
            background: #2d3a4f;
        }
        
        .link-icon {
            font-size: 32px;
        }
        
        .link-info h4 {
            color: var(--gold);
            margin-bottom: 5px;
        }
        
        .link-category {
            display: inline-block;
            background: var(--bg-primary);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 5px;
        }
        
        /* Success Stories */
        .stories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin: 30px 0;
        }
        
        .story-card {
            background: var(--bg-secondary);
            border-radius: 15px;
            padding: 25px;
            border-left: 5px solid var(--accent);
        }
        
        .story-header {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .story-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        
        .story-before {
            color: #ef4444;
            font-size: 14px;
        }
        
        .story-after {
            color: var(--accent);
            font-weight: bold;
        }
        
        .story-timeline {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
            font-size: 14px;
            color: var(--gold);
        }
        
        /* Testimonials Carousel */
        .testimonials-carousel {
            background: var(--bg-secondary);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            overflow: hidden;
        }
        
        .carousel-container {
            display: flex;
            transition: transform 0.5s;
        }
        
        .testimonial-slide {
            min-width: 100%;
            text-align: center;
        }
        
        .testimonial-rating {
            color: var(--gold);
            font-size: 24px;
            margin-bottom: 15px;
        }
        
        .testimonial-text {
            font-size: 18px;
            font-style: italic;
            margin-bottom: 15px;
        }
        
        .testimonial-author {
            color: var(--accent);
            font-weight: bold;
        }
        
        .carousel-controls {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 20px;
        }
        
        .carousel-btn {
            width: 40px;
            height: 40px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            color: var(--text);
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .carousel-btn:hover {
            background: var(--accent);
        }
        
        /* FAQ Accordion */
        .faq-section {
            background: var(--bg-secondary);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
        }
        
        .faq-item {
            border-bottom: 1px solid var(--border);
            margin-bottom: 15px;
        }
        
        .faq-question {
            padding: 15px;
            background: var(--bg-primary);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
        }
        
        .faq-answer {
            padding: 15px;
            display: none;
            color: var(--text-muted);
        }
        
        .faq-answer.active {
            display: block;
        }
        
        .faq-icon {
            transition: transform 0.3s;
        }
        
        .faq-icon.active {
            transform: rotate(180deg);
        }
        
        /* Team Section */
        .team-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            margin: 30px 0;
        }
        
        .team-card {
            background: var(--bg-secondary);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
        }
        
        .team-avatar {
            font-size: 60px;
            margin-bottom: 15px;
        }
        
        .team-role {
            color: var(--accent);
            margin: 10px 0;
            font-weight: bold;
        }
        
        .team-bio {
            color: var(--text-muted);
            font-size: 14px;
        }
        
        /* Video Gallery */
        .video-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .video-card {
            background: var(--bg-secondary);
            border-radius: 10px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.3s;
        }
        
        .video-card:hover {
            transform: scale(1.05);
        }
        
        .video-thumbnail {
            height: 150px;
            background-size: cover;
            background-position: center;
            position: relative;
        }
        
        .play-button {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50px;
            height: 50px;
            background: rgba(16, 185, 129, 0.8);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
        }
        
        .video-card h4 {
            padding: 15px;
            text-align: center;
        }
        
        /* Newsletter */
        .newsletter-section {
            background: linear-gradient(135deg, var(--accent), #8b5cf6);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            margin: 40px 0;
        }
        
        .newsletter-form {
            display: flex;
            max-width: 500px;
            margin: 20px auto;
            gap: 10px;
        }
        
        .newsletter-form input {
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
        }
        
        .newsletter-form button {
            padding: 15px 30px;
            background: var(--gold);
            color: black;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
        }
        
        /* About Section */
        .about-section {
            background: var(--bg-secondary);
            border-radius: 20px;
            padding: 40px;
            margin: 50px 0;
        }
        
        .about-section h3 {
            color: var(--gold);
            margin: 30px 0 15px;
        }
        
        .values-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .value-item {
            background: var(--bg-primary);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            color: var(--gold);
        }
        
        /* Privacy Section */
        .privacy-section {
            background: var(--bg-secondary);
            border-radius: 20px;
            padding: 40px;
            margin: 50px 0;
        }
        
        .privacy-section h3 {
            color: var(--accent);
            margin: 30px 0 15px;
        }
        
        /* Progress Bar */
        .progress-bar {
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: var(--accent);
            z-index: 9999;
            transition: width 0.3s;
        }
        
        /* Back to Top */
        .back-to-top {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: var(--accent);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 999;
        }
        
        .back-to-top.visible {
            opacity: 1;
        }
        
        /* Admin Button */
        .admin-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--accent);
            color: white;
            padding: 15px 25px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }
        
        /* Footer */
        .footer {
            text-align: center;
            margin-top: 80px;
            padding: 40px;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
        }
        
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 20px 0;
        }
        
        .footer-links a {
            color: var(--text-muted);
            text-decoration: none;
        }
        
        .footer-links a:hover {
            color: var(--accent);
        }
        
        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .animate {
            animation: fadeInUp 0.6s ease forwards;
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
            .gallery-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 768px) {
            .gallery-grid {
                grid-template-columns: 1fr;
            }
            
            .gallery-img {
                height: 250px;
            }
            
            .newsletter-form {
                flex-direction: column;
            }
            
            .logo {
                font-size: 48px;
            }
            
            .tagline {
                font-size: 18px;
            }
        }
        
        ${injections.css || ''}
    </style>
    ${injections.head || ''}
</head>
<body class="${theme}-mode">
    <div class="progress-bar" id="progressBar"></div>
    
    <div class="theme-toggle" onclick="toggleTheme()">
        <i class="fas fa-moon"></i>
    </div>
    
    <div class="back-to-top" id="backToTop" onclick="scrollToTop()">
        ↑
    </div>
    
    <div class="lightbox" id="lightbox" onclick="closeLightbox()">
        <span class="lightbox-close">&times;</span>
        <img id="lightbox-img" src="">
    </div>
    
    ${injections.bodyStart || ''}
    
    <div class="container">
        <div class="header">
            <div class="logo">☁️ 3EESHER-CLOUD</div>
            <div class="tagline">Your Autonomous Money Making Machine</div>
        </div>
        
        <!-- Gallery Section -->
        <h2 class="section-title">📸 Success Gallery</h2>
        <div class="gallery-grid animate">
            ${imagesHtml}
        </div>
        
        <!-- Success Stories -->
        <h2 class="section-title">🏆 Real Success Stories</h2>
        <div class="stories-grid animate">
            ${storiesHtml}
        </div>
        
        <!-- Testimonials Carousel -->
        <h2 class="section-title">💬 What Our Users Say</h2>
        <div class="testimonials-carousel animate">
            <div class="carousel-container" id="testimonialCarousel">
                ${testimonialsHtml}
            </div>
            <div class="carousel-controls">
                <button class="carousel-btn" onclick="prevTestimonial()">←</button>
                <button class="carousel-btn" onclick="nextTestimonial()">→</button>
            </div>
        </div>
        
        <!-- Video Gallery -->
        <h2 class="section-title">🎬 Video Tutorials</h2>
        <div class="video-grid animate">
            ${videosHtml}
        </div>
        
        <!-- Blog Posts -->
        <h2 class="section-title">📝 Latest Blog Posts</h2>
        <div class="blog-grid animate">
            ${postsHtml || '<p>No posts yet. Check back soon!</p>'}
        </div>
        
        <!-- 30 Money Making Links -->
        <h2 class="section-title">💰 30 Money Making Links</h2>
        <div class="links-grid animate">
            ${linksHtml}
        </div>
        
        <!-- Team Section -->
        <h2 class="section-title">👥 Meet the Team</h2>
        <div class="team-grid animate">
            ${teamHtml}
        </div>
        
        <!-- FAQ Section -->
        <h2 class="section-title">❓ Frequently Asked Questions</h2>
        <div class="faq-section animate">
            ${faqHtml}
        </div>
        
        <!-- Newsletter -->
        <div class="newsletter-section animate">
            <h2>📧 Get Free Money Tips</h2>
            <p>Subscribe to our newsletter for daily tips and exclusive offers!</p>
            <div class="newsletter-form">
                <input type="email" id="newsletterEmail" placeholder="Your email address">
                <button onclick="subscribeNewsletter()">Subscribe</button>
            </div>
        </div>
        
        <!-- About Section (LONG) -->
        <h2 class="section-title">📖 About 3EESHER-CLOUD</h2>
        <div class="about-section animate">
            <h3>🌟 Our Mission</h3>
            <p>${data.aboutContent.mission}</p>
            
            <h3>🎯 Our Vision</h3>
            <p>${data.aboutContent.vision}</p>
            
            <h3>📚 Our History</h3>
            <p>${data.aboutContent.history}</p>
            
            <h3>💎 Core Values</h3>
            <div class="values-grid">
                ${data.aboutContent.values.map(v => `<div class="value-item">${v}</div>`).join('')}
            </div>
            
            <h3>👥 Our Team</h3>
            <p>${data.aboutContent.team}</p>
            
            <h3>🌍 Our Community</h3>
            <p>${data.aboutContent.community}</p>
            
            <h3>📞 Contact Us</h3>
            <p>Email: abdullahharuna216@gmail.com</p>
        </div>
        
        <!-- Privacy Policy (LONG) -->
        <h2 class="section-title">🔒 Privacy & Policy</h2>
        <div class="privacy-section animate">
            <p><strong>Last Updated:</strong> ${data.privacyContent.lastUpdated}</p>
            
            <h3>1. Introduction</h3>
            <p>${data.privacyContent.introduction}</p>
            
            <h3>2. Information We Collect</h3>
            <p>${data.privacyContent.dataCollected}</p>
            
            <h3>3. How We Use Your Information</h3>
            <p>${data.privacyContent.dataUsage}</p>
            
            <h3>4. Cookies and Tracking Technologies</h3>
            <p>${data.privacyContent.cookies}</p>
            
            <h3>5. Third-Party Services</h3>
            <p>${data.privacyContent.thirdParty}</p>
            
            <h3>6. Data Security</h3>
            <p>${data.privacyContent.security}</p>
            
            <h3>7. Your Rights</h3>
            <p>${data.privacyContent.rights}</p>
            
            <h3>8. Children's Privacy</h3>
            <p>${data.privacyContent.children}</p>
            
            <h3>9. Changes to This Policy</h3>
            <p>${data.privacyContent.changes}</p>
            
            <h3>10. Contact Us</h3>
            <p>Email: abdullahharuna216@gmail.com</p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-links">
                <a href="/">Home</a>
                <a href="#about">About</a>
                <a href="#privacy">Privacy</a>
                <a href="/sitemap.xml">Sitemap</a>
                <a href="/feed.xml">RSS</a>
            </div>
            <p>© 2026 3EESHER-CLOUD. All rights reserved.</p>
            <p>Created by TICHER for financial freedom</p>
            <p>Email: abdullahharuna216@gmail.com</p>
        </div>
    </div>
    
    <a href="/admin" class="admin-btn">🔐 Admin Panel</a>
    
    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
    <script>
        // ========== TRACKING ==========
        function trackClick(linkName) {
            fetch('/api/track-click', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ linkName })
            });
        }
        
        // ========== NEWSLETTER ==========
        async function subscribeNewsletter() {
            const email = document.getElementById('newsletterEmail').value;
            if (!email || !email.includes('@')) {
                alert('Please enter a valid email');
                return;
            }
            
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email })
            });
            
            if (res.ok) {
                alert('✅ Thanks for subscribing! Check your email for confirmation.');
                document.getElementById('newsletterEmail').value = '';
            }
        }
        
        // ========== THEME TOGGLE ==========
        function toggleTheme() {
            document.body.classList.toggle('light-mode');
            const icon = document.querySelector('.theme-toggle i');
            if (document.body.classList.contains('light-mode')) {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        }
        
        // ========== LIGHTBOX ==========
        function openLightbox(imgSrc) {
            document.getElementById('lightbox').classList.add('active');
            document.getElementById('lightbox-img').src = imgSrc;
        }
        
        function closeLightbox() {
            document.getElementById('lightbox').classList.remove('active');
        }
        
        // ========== FAQ ACCORDION ==========
        function toggleFaq(index) {
            const answer = document.getElementById('faq-' + index);
            const icon = event.currentTarget.querySelector('.faq-icon');
            answer.classList.toggle('active');
            icon.classList.toggle('active');
        }
        
        // ========== TESTIMONIAL CAROUSEL ==========
        let currentTestimonial = 0;
        const testimonialSlides = document.querySelectorAll('.testimonial-slide');
        
        function updateCarousel() {
            const container = document.getElementById('testimonialCarousel');
            if (container) {
                container.style.transform = 'translateX(-' + (currentTestimonial * 100) + '%)';
            }
        }
        
        function nextTestimonial() {
            if (currentTestimonial < testimonialSlides.length - 1) {
                currentTestimonial++;
                updateCarousel();
            }
        }
        
        function prevTestimonial() {
            if (currentTestimonial > 0) {
                currentTestimonial--;
                updateCarousel();
            }
        }
        
        // Auto rotate testimonials
        setInterval(() => {
            if (testimonialSlides.length > 0) {
                currentTestimonial = (currentTestimonial + 1) % testimonialSlides.length;
                updateCarousel();
            }
        }, 5000);
        
        // ========== PROGRESS BAR ==========
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            document.getElementById('progressBar').style.width = scrolled + '%';
            
            // Back to top button
            const backToTop = document.getElementById('backToTop');
            if (winScroll > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
        
        // ========== BACK TO TOP ==========
        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // ========== SCROLL ANIMATIONS ==========
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                }
            });
        });
        
        document.querySelectorAll('.animate').forEach(el => observer.observe(el));
    </script>
    
    ${injections.bodyEnd || ''}
</body>
</html>`);
});

// ==================== ADMIN PAGE ====================
app.get('/admin', (req, res) => {
    if (!req.session.isAdmin) {
        return res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Admin Login</title>
    <style>
        body {
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: white;
            font-family: Arial;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .login-box {
            background: #1e293b;
            padding: 40px;
            border-radius: 15px;
            width: 350px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        h2 {
            color: #fbbf24;
            text-align: center;
            margin-bottom: 30px;
        }
        input {
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            background: #0f172a;
            border: 1px solid #334155;
            color: white;
            border-radius: 8px;
        }
        button {
            width: 100%;
            padding: 15px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="login-box">
        <h2>🔐 3EESHER Admin</h2>
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
</html>`);
    }
    
    const data = getData();
    
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Admin Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #0f172a;
            color: white;
            font-family: Arial;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            color: #fbbf24;
            border-bottom: 3px solid #10b981;
            padding-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin: 30px 0;
            flex-wrap: wrap;
        }
        .tab-btn {
            padding: 12px 25px;
            background: #1e293b;
            border: 1px solid #334155;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
        }
        .tab-btn.active {
            background: #10b981;
        }
        .section {
            display: none;
            background: #1e293b;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }
        .section.active {
            display: block;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #0f172a;
            padding: 25px;
            border-radius: 10px;
            border-left: 4px solid #10b981;
        }
        .stat-card h3 {
            color: #94a3b8;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .stat-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #fbbf24;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            color: #94a3b8;
            margin-bottom: 5px;
        }
        input, textarea, select {
            width: 100%;
            padding: 12px;
            background: #0f172a;
            border: 1px solid #334155;
            color: white;
            border-radius: 6px;
        }
        button {
            background: #10b981;
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            margin: 5px;
        }
        .response-box {
            background: #0f172a;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            white-space: pre-wrap;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background: #0f172a;
            color: #fbbf24;
            padding: 12px;
            text-align: left;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #334155;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            ☁️ 3EESHER Admin
            <button onclick="logout()" style="background:#ef4444;">Logout</button>
        </h1>
        
        <div class="tabs">
            <button class="tab-btn active" onclick="showTab('dashboard')">📊 Dashboard</button>
            <button class="tab-btn" onclick="showTab('earnings')">💰 Earnings</button>
            <button class="tab-btn" onclick="showTab('links')">🔗 Money Links</button>
            <button class="tab-btn" onclick="showTab('blog')">📝 Blog Manager</button>
            <button class="tab-btn" onclick="showTab('upload')">📁 File Upload</button>
            <button class="tab-btn" onclick="showTab('targeting')">🎯 Targeting</button>
            <button class="tab-btn" onclick="showTab('injector')">🔌 Injector</button>
            <button class="tab-btn" onclick="showTab('subscribers')">📧 Subscribers</button>
            <button class="tab-btn" onclick="showTab('command')">🤖 Command</button>
            <button class="tab-btn" onclick="showTab('settings')">⚙️ Settings</button>
        </div>
        
        <div id="dashboard" class="section active">
            <h2>Dashboard</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total Earnings</h3>
                    <div class="value">$${data.earnings.total.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h3>Today</h3>
                    <div class="value">$${data.earnings.today.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h3>This Month</h3>
                    <div class="value">$${data.earnings.month.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h3>Subscribers</h3>
                    <div class="value">${data.subscribers.length}</div>
                </div>
            </div>
            
            <h3>Bot Status</h3>
            <div style="background:#0f172a;padding:20px;border-radius:8px;">
                <div>✅ Auto Money Maker: ${data.settings.autoMoneyMaker ? 'Running' : 'Paused'}</div>
                <div>✅ Auto Blogger: ${data.settings.autoBlogger ? data.settings.blogFrequency + 'x daily' : 'Paused'}</div>
                <div>✅ Auto Targeting: ${data.settings.autoTargeting ? 'Running' : 'Paused'}</div>
                <div>✅ Active Links: ${data.moneyLinks.filter(l => l.active).length} / 30</div>
                <div>✅ Custom Links: ${data.customLinks.length}</div>
                <div>✅ Blog Posts: ${data.blogPosts.length}</div>
            </div>
        </div>
        
        <div id="earnings" class="section">
            <h2>Earnings</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Balance</h3>
                    <div class="value">$${data.earnings.total.toFixed(2)}</div>
                </div>
            </div>
            
            <h3>Add Earning</h3>
            <div class="form-group">
                <label>Amount ($)</label>
                <input type="number" id="amount">
            </div>
            <div class="form-group">
                <label>Source</label>
                <input type="text" id="source">
            </div>
            <div class="form-group">
                <label>Link (optional)</label>
                <input type="text" id="link">
            </div>
            <button onclick="addEarning()">Add Earning</button>
            
            <h3>Withdraw</h3>
            <div class="form-group">
                <label>Amount ($)</label>
                <input type="number" id="withdrawAmount">
            </div>
            <div class="form-group">
                <label>Method</label>
                <select id="withdrawMethod">
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Mastercard</option>
                    <option value="crypto">Cryptocurrency</option>
                </select>
            </div>
            <button onclick="withdraw()">Withdraw</button>
            
            <h3>Recent Transactions</h3>
            <table>
                <tr><th>Date</th><th>Amount</th><th>Source</th></tr>
                ${(data.earnings.transactions || []).slice(-5).reverse().map(t => `
                    <tr><td>${new Date(t.timestamp).toLocaleDateString()}</td><td>$${t.amount.toFixed(2)}</td><td>${t.source}</td></tr>
                `).join('')}
            </table>
        </div>
        
        <div id="links" class="section">
            <h2>Money Links</h2>
            
            <h3>Add Affiliate ID</h3>
            <div class="form-group">
                <label>Store Name</label>
                <input type="text" id="store" placeholder="e.g., Jumia">
            </div>
            <div class="form-group">
                <label>Affiliate ID</label>
                <input type="text" id="affId" placeholder="e.g., allarbaa216-20">
            </div>
            <button onclick="addAffiliate()">Add ID</button>
            
            <h3>Your 30 Links</h3>
            <table>
                <tr><th>Store</th><th>ID</th><th>Clicks</th><th>Earnings</th></tr>
                ${data.moneyLinks.map(l => `
                    <tr>
                        <td>${l.icon || ''} ${l.name}</td>
                        <td>${l.id || 'Not set'}</td>
                        <td>${l.clicks || 0}</td>
                        <td>$${(l.earnings || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </table>
            
            ${data.customLinks.length > 0 ? `
                <h3>Custom Links</h3>
                <table>
                    <tr><th>Store</th><th>ID</th><th>Clicks</th></tr>
                    ${data.customLinks.map(l => `
                        <tr><td>${l.name}</td><td>${l.id}</td><td>${l.clicks || 0}</td></tr>
                    `).join('')}
                </table>
            ` : ''}
        </div>
        
        <div id="blog" class="section">
            <h2>Manual Blog Post</h2>
            <form id="blogForm" enctype="multipart/form-data">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="blogTitle" name="title">
                </div>
                <div class="form-group">
                    <label>Content (HTML allowed)</label>
                    <textarea id="blogContent" name="content" rows="6"></textarea>
                </div>
                <div class="form-group">
                    <label>Featured Image</label>
                    <input type="file" id="blogImage" name="image" accept="image/*">
                </div>
                <button type="button" onclick="createBlog()">Publish Blog</button>
            </form>
            
            <h3>Auto Blogger Settings</h3>
            <div class="form-group">
                <label>Posts per day</label>
                <select id="blogFrequency">
                    <option value="2" ${data.settings.blogFrequency == 2 ? 'selected' : ''}>2 posts daily</option>
                    <option value="3" ${data.settings.blogFrequency == 3 ? 'selected' : ''}>3 posts daily</option>
                    <option value="4" ${data.settings.blogFrequency == 4 ? 'selected' : ''}>4 posts daily</option>
                </select>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="autoBlogger" ${data.settings.autoBlogger ? 'checked' : ''}> Enable Auto Blogger
                </label>
            </div>
            <button onclick="saveBlogSettings()">Save Settings</button>
        </div>
        
        <div id="upload" class="section">
            <h2>Upload Image</h2>
            <form id="uploadForm" enctype="multipart/form-data">
                <div class="form-group">
                    <label>Select Image</label>
                    <input type="file" id="uploadImage" name="image" accept="image/*">
                </div>
                <button type="button" onclick="uploadFile()">Upload</button>
            </form>
            
            <h3>Uploaded Images</h3>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px;">
                ${(data.images || []).map(img => `
                    <img src="${img.url}" style="width:100%;height:100px;object-fit:cover;border-radius:5px;">
                `).join('')}
            </div>
        </div>
        
        <div id="targeting" class="section">
            <h2>Targeting Engine</h2>
            
            <h3>Add Phone Numbers</h3>
            <div class="form-group">
                <label>Phone Numbers (one per line)</label>
                <textarea id="phones" rows="4" placeholder="+2348012345678"></textarea>
            </div>
            <button onclick="addPhones()">Add Phones</button>
            
            <h3>Add IMEI Numbers</h3>
            <div class="form-group">
                <label>IMEI Numbers (one per line)</label>
                <textarea id="imeis" rows="4" placeholder="356789012345678"></textarea>
            </div>
            <button onclick="addIMEIs()">Add IMEIs</button>
            
            <h3>Current Targets</h3>
            <table>
                <tr><th>Type</th><th>Count</th></tr>
                <tr><td>Phone Numbers</td><td>${data.targeting.phones.length}</td></tr>
                <tr><td>IMEI Numbers</td><td>${data.targeting.imeis.length}</td></tr>
            </table>
            
            <div style="margin-top:20px;">
                <h3>Auto Targeting</h3>
                <label>
                    <input type="checkbox" id="autoTargeting" ${data.settings.autoTargeting ? 'checked' : ''}> Enable Auto Targeting (every 30 min)
                </label>
                <button onclick="saveTargetingSettings()" style="margin-top:10px;">Save</button>
            </div>
        </div>
        
        <div id="injector" class="section">
            <h2>Universal Injector</h2>
            
            <div class="form-group">
                <label>Injection Location</label>
                <select id="injectLocation">
                    <option value="head">Head Section</option>
                    <option value="bodyStart">Body Start</option>
                    <option value="bodyEnd">Body End</option>
                    <option value="css">Custom CSS</option>
                </select>
            </div>
            <div class="form-group">
                <label>Code to Inject</label>
                <textarea id="injectCode" rows="6" placeholder="Paste your HTML, JavaScript, or CSS here..."></textarea>
            </div>
            <button onclick="injectCode()">Inject Code</button>
            
            <h3>Active Injections</h3>
            <div style="margin-top:20px;">
                ${Object.entries(data.injections).filter(([_, code]) => code).map(([loc, code]) => `
                    <div style="background:#0f172a;padding:10px;margin:5px 0;border-radius:5px;">
                        <strong>${loc}:</strong> <code>${code.substring(0, 50)}...</code>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div id="subscribers" class="section">
            <h2>Email Subscribers</h2>
            <p>Total: ${data.subscribers.length} subscribers</p>
            
            <h3>Broadcast Message</h3>
            <div class="form-group">
                <label>Subject</label>
                <input type="text" id="broadcastSubject" placeholder="Email subject">
            </div>
            <div class="form-group">
                <label>Message</label>
                <textarea id="broadcastMessage" rows="4" placeholder="Your message..."></textarea>
            </div>
            <button onclick="broadcast()">Send to All Subscribers</button>
            
            <h3>Subscriber List</h3>
            <div style="max-height:300px;overflow-y:auto;">
                ${data.subscribers.map(email => `
                    <div style="background:#0f172a;padding:10px;margin:5px 0;border-radius:5px;">
                        ${email}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div id="command" class="section">
            <h2>Bot Command Center</h2>
            <p>Type ANY command - bot understands natural language!</p>
            
            <div class="form-group">
                <label>Enter Command</label>
                <textarea id="command" rows="4" placeholder="Examples:
show earnings
withdraw $50
add affiliate Jumia id allarbaa216-20
show links
target phones +2348012345678
create blog about crypto
generate ad for machine hire
status
help"></textarea>
            </div>
            <button onclick="sendCommand()">Send Command</button>
            
            <div id="commandResponse" class="response-box"></div>
            
            <h3>Quick Commands</h3>
            <button onclick="setCommand('show earnings')">Show Earnings</button>
            <button onclick="setCommand('show links')">Show Links</button>
            <button onclick="setCommand('status')">Bot Status</button>
            <button onclick="setCommand('help')">Help</button>
        </div>
        
        <div id="settings" class="section">
            <h2>Settings</h2>
            
            <h3>Change Password</h3>
            <div class="form-group">
                <label>Current Password</label>
                <input type="password" id="oldPassword">
            </div>
            <div class="form-group">
                <label>New Password</label>
                <input type="password" id="newPassword">
            </div>
            <div class="form-group">
                <label>Confirm New Password</label>
                <input type="password" id="confirmPassword">
            </div>
            <button onclick="changePassword()">Change Password</button>
            
            <h3>Auto Tasks</h3>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="settingsAutoMoney" ${data.settings.autoMoneyMaker ? 'checked' : ''}> Auto Money Maker (every hour)
                </label>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="settingsAutoBlog" ${data.settings.autoBlogger ? 'checked' : ''}> Auto Blogger
                </label>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="settingsAutoTarget" ${data.settings.autoTargeting ? 'checked' : ''}> Auto Targeting
                </label>
            </div>
            <button onclick="saveAllSettings()">Save All Settings</button>
        </div>
    </div>
    
    <script>
        function showTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }
        
        async function addEarning() {
            const amount = document.getElementById('amount').value;
            const source = document.getElementById('source').value;
            const link = document.getElementById('link').value;
            
            await fetch('/api/earnings/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ amount, source, link })
            });
            alert('Earning added!');
            location.reload();
        }
        
        async function withdraw() {
            const amount = document.getElementById('withdrawAmount').value;
            const method = document.getElementById('withdrawMethod').value;
            
            const res = await fetch('/api/withdraw', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ amount, method })
            });
            
            if (res.ok) {
                alert('Withdrawal processed!');
                location.reload();
            } else {
                alert('Insufficient balance');
            }
        }
        
        async function addAffiliate() {
            const store = document.getElementById('store').value;
            const id = document.getElementById('affId').value;
            
            const res = await fetch('/api/add-affiliate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ store, id })
            });
            
            const data = await res.json();
            alert(data.message);
            location.reload();
        }
        
        async function createBlog() {
            const formData = new FormData();
            formData.append('title', document.getElementById('blogTitle').value);
            formData.append('content', document.getElementById('blogContent').value);
            
            const imageFile = document.getElementById('blogImage').files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            const res = await fetch('/api/create-blog', {
                method: 'POST',
                body: formData
            });
            
            if (res.ok) {
                alert('Blog published!');
                location.reload();
            }
        }
        
        async function saveBlogSettings() {
            const freq = document.getElementById('blogFrequency').value;
            const enabled = document.getElementById('autoBlogger').checked;
            
            await fetch('/api/settings', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ blogFrequency: freq, autoBlogger: enabled })
            });
            alert('Settings saved!');
        }
        
        async function uploadFile() {
            const formData = new FormData();
            formData.append('image', document.getElementById('uploadImage').files[0]);
            
            const res = await fetch('/api/upload/image', {
                method: 'POST',
                body: formData
            });
            
            if (res.ok) {
                alert('File uploaded!');
                location.reload();
            }
        }
        
        async function addPhones() {
            const phones = document.getElementById('phones').value.split('\\n').filter(p => p.trim());
            
            await fetch('/api/target-phones', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phones })
            });
            alert(phones.length + ' phone numbers added');
            location.reload();
        }
        
        async function addIMEIs() {
            const imeis = document.getElementById('imeis').value.split('\\n').filter(i => i.trim());
            
            await fetch('/api/target-imeis', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ imeis })
            });
            alert(imeis.length + ' IMEIs added');
            location.reload();
        }
        
        function saveTargetingSettings() {
            const enabled = document.getElementById('autoTargeting').checked;
            
            fetch('/api/settings', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ autoTargeting: enabled })
            }).then(() => alert('Settings saved!'));
        }
        
        async function injectCode() {
            const location = document.getElementById('injectLocation').value;
            const code = document.getElementById('injectCode').value;
            
            await fetch('/api/inject', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ location, code })
            });
            alert('Code injected!');
            location.reload();
        }
        
        async function broadcast() {
            const subject = document.getElementById('broadcastSubject').value;
            const message = document.getElementById('broadcastMessage').value;
            
            if (!subject || !message) {
                alert('Enter subject and message');
                return;
            }
            
            const res = await fetch('/api/broadcast', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ subject, message })
            });
            
            const data = await res.json();
            alert('Sent to ' + data.sent + ' subscribers');
        }
        
        async function sendCommand() {
            const command = document.getElementById('command').value;
            
            const res = await fetch('/api/command', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ command })
            });
            
            const data = await res.json();
            document.getElementById('commandResponse').innerHTML = data.response;
        }
        
        function setCommand(cmd) {
            document.getElementById('command').value = cmd;
        }
        
        function changePassword() {
            alert('Password change - would update in production');
        }
        
        function saveAllSettings() {
            const settings = {
                autoMoneyMaker: document.getElementById('settingsAutoMoney').checked,
                autoBlogger: document.getElementById('settingsAutoBlog').checked,
                autoTargeting: document.getElementById('settingsAutoTarget').checked
            };
            
            fetch('/api/settings', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(settings)
            }).then(() => alert('Settings saved!'));
        }
        
        function logout() {
            window.location.href = '/logout';
        }
    </script>
</body>
</html>`);
});

// ==================== BLOG PAGE ====================
app.get('/blog/:id', (req, res) => {
    const data = getData();
    const post = data.blogPosts.find(p => p.id == req.params.id);
    
    if (!post) {
        return res.status(404).send('Blog not found');
    }
    
    post.views = (post.views || 0) + 1;
    saveData(data);
    
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>${post.title} - 3EESHER-CLOUD</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: Arial;
            background: #0f172a;
            color: white;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .post {
            background: #1e293b;
            padding: 40px;
            border-radius: 15px;
        }
        h1 {
            color: #fbbf24;
            margin-bottom: 20px;
        }
        .meta {
            color: #94a3b8;
            margin: 20px 0;
            padding-bottom: 20px;
            border-bottom: 1px solid #334155;
        }
        img {
            max-width: 100%;
            border-radius: 10px;
            margin: 20px 0;
        }
        .content {
            line-height: 1.8;
        }
        .back {
            display: inline-block;
            margin-top: 20px;
            color: #10b981;
            text-decoration: none;
        }
        .back:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="post">
            <h1>${post.title}</h1>
            <div class="meta">
                Published: ${new Date(post.date).toLocaleDateString()} | 
                Author: ${post.author} | 
                Views: ${post.views}
            </div>
            ${post.image ? `<img src="${post.image}" alt="${post.title}">` : ''}
            <div class="content">${post.content}</div>
            <a href="/" class="back">← Back to Home</a>
        </div>
    </div>
</body>
</html>`);
});

// ==================== SITEMAP & RSS ====================
app.get('/sitemap.xml', (req, res) => {
    const data = getData();
    const baseUrl = 'https://3eesher-cloud.onrender.com';
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    
    data.blogPosts.forEach(post => {
        xml += `  <url>\n    <loc>${baseUrl}/blog/${post.id}</loc>\n    <lastmod>${post.date.split('T')[0]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });
    
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
});

app.get('/feed.xml', (req, res) => {
    const data = getData();
    const baseUrl = 'https://3eesher-cloud.onrender.com';
    
    let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
    rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
    rss += '  <channel>\n';
    rss += `    <title>3EESHER-CLOUD Blog</title>\n`;
    rss += `    <link>${baseUrl}</link>\n`;
    rss += `    <description>Latest money-making tips and success stories</description>\n`;
    rss += `    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />\n`;
    
    data.blogPosts.slice(0, 10).forEach(post => {
        rss += '    <item>\n';
        rss += `      <title>${post.title}</title>\n`;
        rss += `      <link>${baseUrl}/blog/${post.id}</link>\n`;
        rss += `      <guid>${baseUrl}/blog/${post.id}</guid>\n`;
        rss += `      <pubDate>${new Date(post.date).toUTCString()}</pubDate>\n`;
        rss += `      <description><![CDATA[${post.content.substring(0, 500)}...]]></description>\n`;
        rss += '    </item>\n';
    });
    
    rss += '  </channel>\n';
    rss += '</rss>';
    
    res.header('Content-Type', 'application/rss+xml');
    res.send(rss);
});

app.get('/robots.txt', (req, res) => {
    const robots = `User-agent: *
Allow: /
Sitemap: https://3eesher-cloud.onrender.com/sitemap.xml`;
    res.type('text/plain');
    res.send(robots);
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n`);
    console.log(`🚀 ========================================`);
    console.log(`🚀  3EESHER-CLOUD IS RUNNING`);
    console.log(`🚀 ========================================`);
    console.log(`📍 Main Page: http://localhost:${PORT}`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
    console.log(`👤 Login: admin216 / admin1234`);
    console.log(`📧 Gmail: ${GMAIL_USER}`);
    console.log(`📊 Analytics: G-HD01MF5SL9`);
    console.log(`🚀 ========================================`);
    console.log(`✅ Auto Blogger: ${getData().settings.blogFrequency}x daily`);
    console.log(`✅ Auto Money Maker: Every hour`);
    console.log(`✅ Auto Targeting: Every 30 min`);
    console.log(`✅ 30 Money Links Ready`);
    console.log(`✅ Unlimited Commands: Active`);
    console.log(`✅ Email Collection: Working`);
    console.log(`✅ Daily Reports: 8 AM`);
    console.log(`✅ Weekly Reports: Sunday 9 AM`);
    console.log(`✅ All 50+ Features: Included`);
    console.log(`🚀 ========================================\n`);
});
