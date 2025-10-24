# 🏠 ResIQ by Hostizzy

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0-blue.svg)](https://github.com/hostizzy/resiq)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](https://web.dev/progressive-web-apps/)
[![Status](https://img.shields.io/badge/Status-Production-success.svg)](https://hostizzy.com)

> **⚠️ NOTICE:** This is proprietary software owned by Hostizzy (Hostsphere India Private Limited).  
> Viewing the source code does **not** grant any rights to use, copy, modify, or redistribute it.  
> Commercial usage requires a licensing agreement with Hostizzy.

---

## 📖 About ResIQ

**ResIQ** is a powerful, mobile-first property operations dashboard designed specifically for vacation rentals, homestays, and boutique accommodations. Built as a Progressive Web App (PWA), it empowers property managers and teams to centralize reservations, manage calendars, track payments, and gain actionable performance insights—all from a single, elegant interface.

### 🎯 Built For

- 🏡 Vacation Rental Operators
- 🏨 Boutique Stay Managers
- 👥 Hospitality Teams

---

## ✨ Key Features

### 🔐 Authentication & Security
- Email-based secure login system
- Persistent sessions with automatic token management
- Role-based access control (Admin, Manager, Staff)
- Secure logout with session cleanup

### 📊 Comprehensive Dashboard
- **Real-time Performance Metrics**
  - Revenue tracking (Stay, Meals, Total)
  - Occupancy rates with targets
  - Booking analytics
  - Month-over-month trends
- **This Month Performance** card with YoY comparisons
- **Quick Stats** for instant insights
- **Action Center** for urgent tasks

### 📅 Reservation Management
- Complete booking lifecycle management
- Multi-source booking support (Direct, Airbnb, Booking.com, etc.)
- Guest information tracking
- Check-in/Check-out management
- Status tracking (Confirmed, Cancelled, Completed)
- Advanced filtering and search
- CSV export functionality

### 💰 Payment Tracking
- **Multi-Payment Entry System**
  - Hybrid layout (Desktop table + Mobile cards)
  - Bulk payment collection
  - Payment method tracking (Cash, UPI, Gateway, Bank Transfer)
- **Payment Reminders**
  - Collapsible reminder section
  - Urgent payment indicators
  - Due date tracking
  - WhatsApp reminder integration
- **Payment Status Management**
  - Automatic status calculation (Paid, Partial, Pending)
  - Payment history for each booking
  - Balance tracking with tolerance handling

### 🏘️ Property Management
- Multi-property support
- Property-specific settings
- Performance tracking per property
- Top performers analysis

### 📈 Performance Analytics
- **Interactive Charts**
  - Payment methods distribution (2x2 grid on desktop)
  - Top performing properties
  - Booking type breakdown
  - Channel performance analysis
  - Monthly trends
- **Advanced Filtering**
  - Date range selection
  - Property-specific views
  - Month-based filtering
  - Export to CSV

### 📆 Availability Calendar
- Visual booking calendar
- Property availability tracking
- Multi-property calendar view
- Direct booking indicators
- OTA blocked dates

### 👥 Team Management
- Role-based permissions
- Team member profiles
- Activity tracking

### 📱 Mobile-Optimized
- **Responsive Design**
  - Desktop (>1024px): Full-featured interface
  - Tablet (768-1024px): Optimized layouts
  - Mobile (<768px): Touch-friendly cards
- **Mobile-Specific Features**
  - Full-screen modals
  - Large touch targets (44px minimum)
  - Optimized input fields (16px to prevent zoom)
  - Sticky action buttons
  - Swipe-friendly navigation

### ⚡ Progressive Web App (PWA)
- Install to home screen
- Offline functionality
- Fast loading with service worker
- Native app-like experience
- Auto-update capabilities

---

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Safari, Firefox, Edge)
- Web server (local or cloud)
- HTTPS connection (for PWA features)

### Installation

#### Option 1: Cloud Deployment (Recommended)

**Using Vercel (Free):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy
```

**Using Netlify (Free):**
1. Drag and drop your `index.html` file to [Netlify Drop](https://app.netlify.com/drop)
2. Get instant deployment

**Using GitHub Pages:**
1. Create a new repository
2. Upload `index.html`
3. Go to Settings → Pages
4. Enable GitHub Pages
5. Access at: `https://yourusername.github.io/resiq`

#### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/hostizzy/resiq.git
cd resiq

# Start a local server
# Using Python
python -m http.server 8000

# OR using Node.js
npx http-server

# OR using PHP
php -S localhost:8000

# Open browser
http://localhost:8000
```

### First Run Setup

1. **Access the Application**
   - Open in your browser: `http://localhost:8000` or your deployed URL

2. **Login**
   - Use your credentials provided by Hostizzy admin
   - Default demo: `admin@hostizzy.com` / `admin123`

3. **Configure Properties**
   - Navigate to **Properties** tab
   - Click **+ Add Property**
   - Enter property details and save

4. **Start Using**
   - Add reservations
   - Track payments
   - Monitor performance

---

## 📱 Installing as PWA

### Desktop (Chrome/Edge/Opera)
1. Open ResIQ in your browser
2. Look for the **Install** icon (➕) in the address bar
3. Click **Install**
4. App opens in a standalone window

### iOS (Safari)
1. Open ResIQ in Safari
2. Tap the **Share** button (□↑)
3. Scroll and tap **Add to Home Screen**
4. Tap **Add**
5. ResIQ now appears on your home screen

### Android (Chrome)
1. Open ResIQ in Chrome
2. Tap the **three dots** menu (⋮)
3. Tap **Install app** or **Add to Home Screen**
4. Tap **Install**
5. App installs like a native application

---

## 🎨 Design System

### Color Palette

```css
--primary: #2563eb;      /* Blue - Primary actions */
--success: #10b981;      /* Green - Success states */
--warning: #f59e0b;      /* Orange - Warnings */
--danger: #ef4444;       /* Red - Errors/Urgent */
--text: #1f2937;         /* Dark gray - Text */
--text-secondary: #6b7280; /* Medium gray - Secondary text */
--background: #f3f4f6;   /* Light gray - Background */
--border: #e5e7eb;       /* Light gray - Borders */
```

### Typography
- **Font Family:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui
- **Font Sizes:** 
  - Headings: 24px, 20px, 18px
  - Body: 14px
  - Small: 13px, 12px
- **Font Weights:** 400 (Regular), 600 (Semibold), 700 (Bold)

### Spacing
- Base unit: 4px
- Standard gaps: 8px, 12px, 16px, 20px, 24px
- Card padding: 24px (desktop), 16px (mobile)

### Components
- **Cards:** 12px border-radius, subtle shadow
- **Buttons:** 6px border-radius, 12px padding
- **Inputs:** 6px border-radius, 10-12px padding
- **Modals:** Centered on desktop, full-screen on mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| **Storage** | LocalStorage (sessions), IndexedDB (offline data) |
| **Backend** | Supabase (PostgreSQL, Auth, Real-time) |
| **PWA** | Service Worker, Web App Manifest |
| **Charts** | Custom CSS-based visualizations |
| **Icons** | Emoji + Custom SVG |
| **Deployment** | Static hosting (Vercel, Netlify, GitHub Pages) |

### Why No Framework?
ResIQ is intentionally built with **vanilla JavaScript** for:
- ⚡ Lightning-fast performance
- 📦 Zero dependencies
- 🔒 Complete control over code
- 🎯 Smaller bundle size
- 🚀 Instant load times

---

## 📁 Project Structure

```
resiq/
│
├── index.html              # Main application file (single-page app)
├── manifest.json           # PWA manifest (app metadata)
├── sw.js                   # Service Worker (offline support)
├── README.md              # This file
│
└── assets/                 # (Optional) Static assets
    ├── icons/             # PWA icons
    └── images/            # App images
```

---

## 🔧 Configuration

### Environment Setup

ResIQ uses Supabase for backend services. Configure your Supabase credentials:

```javascript
// In index.html, update these constants:
const SUPABASE_URL = 'your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### Customization

#### Branding
Update CSS variables in `index.html`:

```css
:root {
    --primary: #your-color;
    --company-logo: url('your-logo.png');
}
```

#### Features
Enable/disable features by modifying the navigation array:

```javascript
const navigationItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'reservations', icon: '📅', label: 'Reservations' },
    // Add or remove items
];
```

---

## 📊 Database Schema

### Tables

**reservations**
- Booking information
- Guest details
- Property assignments
- Payment status
- Check-in/out dates

**properties**
- Property details
- Pricing information
- Capacity and amenities

**payments**
- Payment transactions
- Payment methods
- Recipient tracking
- Transaction history

**team**
- Team member profiles
- Role assignments
- Access permissions

---

## 🧪 Testing

### Browser Testing
```bash
# Desktop browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

# Mobile browsers
- iOS Safari 14+
- Chrome Mobile
- Samsung Internet
```

### PWA Testing
```bash
# Test offline mode
1. Open DevTools → Application → Service Workers
2. Check "Offline" checkbox
3. Reload the page
4. Verify functionality

# Test installation
1. Open DevTools → Application → Manifest
2. Click "Add to home screen"
3. Verify installation
```

---

## 🌐 Browser Compatibility

| Browser | Desktop | Mobile | PWA Support |
|---------|---------|--------|-------------|
| Chrome | ✅ 90+ | ✅ 90+ | ✅ Full |
| Safari | ✅ 14+ | ✅ 14+ | ⚠️ Limited |
| Firefox | ✅ 88+ | ✅ 88+ | ✅ Full |
| Edge | ✅ 90+ | ✅ 90+ | ✅ Full |
| Samsung Internet | ✅ | ✅ | ✅ Full |

---

## 🐛 Troubleshooting

### PWA Installation Issues
**Problem:** Install prompt doesn't appear
```
Solutions:
1. Ensure you're using HTTPS (or localhost)
2. Check manifest.json is properly linked
3. Verify Service Worker is registered
4. Clear browser cache and reload
```

**Problem:** App doesn't work offline
```
Solutions:
1. Check Service Worker status in DevTools
2. Verify cache strategy in sw.js
3. Test with Network throttling
```

### Payment Status Issues
**Problem:** Shows "Partial" when fully paid
```
Solution: Already fixed with ₹1 tolerance
- Check paid_amount matches total_amount
- Verify no floating-point errors
```

### Mobile Display Issues
**Problem:** Inputs zoom on iOS
```
Solution: Already implemented
- All inputs use 16px font-size minimum
- Touch targets are 44px minimum
```

### Data Not Persisting
**Problem:** Data lost on browser restart
```
Solutions:
1. Check browser allows LocalStorage
2. Ensure not in Incognito/Private mode
3. Check browser storage quota
4. Verify Supabase connection
```

---

## 📈 Performance

### Lighthouse Scores
- **Performance:** 95+
- **Accessibility:** 90+
- **Best Practices:** 95+
- **SEO:** 90+
- **PWA:** ✅ Installable

### Optimization Techniques
- Lazy loading for heavy components
- Debounced search inputs
- Optimized CSS (no frameworks)
- Minimal JavaScript bundle
- Efficient database queries
- Service Worker caching

---

## 🔒 Security

### Authentication
- Secure token-based authentication
- Session management via Supabase Auth
- Automatic token refresh
- Secure logout with cleanup

### Data Protection
- Row-level security (RLS) in Supabase
- Role-based access control
- Input sanitization
- XSS protection

### Best Practices
- HTTPS required for production
- Environment variables for sensitive data
- Regular security updates
- Audit logs for admin actions

---

## 🚧 Known Limitations

- Safari PWA support is limited (no push notifications)
- Offline mode requires initial online load
- Real-time updates require active connection
- Large data exports may be slow on mobile

---

## 🗺️ Roadmap

### Q4 2025
- [ ] WhatsApp API integration for reminders
- [ ] Email notification system
- [ ] Advanced reporting and analytics
- [ ] Bulk operations for reservations

### Q1 2026
- [ ] Payment gateway integration
- [ ] Guest self-check-in portal
- [ ] Mobile app (React Native)
- [ ] Multi-language support

### Q2 2026
- [ ] AI-powered pricing suggestions
- [ ] Revenue forecasting
- [ ] Automated marketing campaigns
- [ ] API for third-party integrations

---

## 🤝 Contributing

This is proprietary software. Contributions are only accepted from authorized Hostizzy team members.

For Hostizzy team members:
1. Clone the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

### For Hostizzy Customers
- 📧 Email: support@hostizzy.com
- 📱 Phone: +91-XXXX-XXXXX
- 💬 WhatsApp: +91-XXXX-XXXXX
- 🌐 Website: [www.hostizzy.com](https://www.hostizzy.com)

### For Technical Issues
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review browser console for errors
3. Contact technical support with error details

### For Feature Requests
Submit via internal team portal or email: dev@hostizzy.com

---

## 📄 License

**Proprietary Software**

© 2025 Hostizzy (Hostsphere India Private Limited). All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without explicit written permission from Hostizzy.

Commercial usage requires a valid licensing agreement.

For licensing inquiries: partnerships@hostizzy.com

---

## 🏆 Credits

### Built By
**Hostizzy Engineering Team**  
Hostsphere India Private Limited

### Technology Partners
- [Supabase](https://supabase.com) - Backend infrastructure
- [Vercel](https://vercel.com) - Hosting & deployment

### Special Thanks
To all the property managers and hospitality professionals who provided feedback and insights during development.

---

## 📊 Stats

![GitHub repo size](https://img.shields.io/github/repo-size/hostizzy/resiq)
![GitHub last commit](https://img.shields.io/github/last-commit/hostizzy/resiq)
![GitHub issues](https://img.shields.io/github/issues/hostizzy/resiq)
![GitHub pull requests](https://img.shields.io/github/issues-pr/hostizzy/resiq)

---

## 🌟 About Hostizzy

Hostizzy empowers independent hosts and property managers across India to deliver exceptional hospitality experiences. We combine technology, local expertise, and customer service to help you maximize your property's potential.

### Our Mission
To democratize hospitality technology and make professional property management accessible to everyone.

### Our Vision
A world where every property owner can compete with large hotel chains through smart technology and data-driven insights.

---

## 🔗 Links

- 🌐 Website: [hostizzy.com](https://hostizzy.com)
- 💼 LinkedIn: [linkedin.com/company/hostizzy](https://linkedin.com/company/hostizzy)
- 📸 Instagram: [@hostizzy](https://instagram.com/hostizzy)

---

<div align="center">

### Built with ❤️ for hospitality professionals

**ResIQ v2.0** | Last Updated: October 2025

[Report Bug](https://github.com/hostizzy/resiq/issues) · [Request Feature](https://github.com/hostizzy/resiq/issues)

</div>
