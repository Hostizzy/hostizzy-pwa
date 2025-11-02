# 🏠 ResIQ by Hostizzy

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-3.0-blue.svg)](https://github.com/hostizzy/resiq)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](https://web.dev/progressive-web-apps/)
[![Status](https://img.shields.io/badge/Status-Production-success.svg)](https://resiq.hostizzy.com)

> **⚠️ NOTICE:** This is proprietary software owned by Hostizzy (Hostsphere India Private Limited).  
> Viewing the source code does **not** grant any rights to use, copy, modify, or redistribute it.  
> Commercial usage requires a licensing agreement with Hostizzy.

---

## 📖 About

**ResIQ** is a powerful, mobile-first property management system built as a Progressive Web App (PWA). Designed specifically for vacation rentals, homestays, and boutique accommodations in India, it centralizes reservations, payments, guest management, and performance analytics in a single elegant interface.

### 🎯 Built For
- 🏡 Vacation Rental Operators
- 🏨 Boutique Property Managers  
- 👥 Hospitality Teams

**Live Demo:** [resiq.hostizzy.com](https://resiq.hostizzy.com)

---

## ✨ Core Features

### 📊 **Smart Dashboard**
- Real-time revenue, occupancy, and booking metrics
- Month-over-month performance tracking
- Quick action center for urgent tasks
- Enhanced metrics with guest tracking

### 📅 **Reservation Management**
- Multi-source booking support (Direct, Airbnb, Booking.com, MMT, etc.)
- Auto status updates (check-in/check-out based on dates)
- Advanced filtering, search, and bulk operations
- CSV import/export with OTA code handling
- Guest information tracking with history

### 💰 **Payment Tracking**
- Multi-payment entry system with bulk collection
- Payment reminders with WhatsApp integration
- Automatic status calculation (Paid/Partial/Pending)
- Complete payment history per booking
- Payment method tracking (Cash, UPI, Bank Transfer, Gateway)

### 👥 **Guest Management** ✨ NEW
- **Guest Directory** with 448+ guests
- Table & Card view toggle (responsive)
- Instant search & smart filters (VIP, Repeat, High Value)
- Pagination (50 per page, customizable)
- Guest profiles with complete booking history
- Quick actions: WhatsApp, Call, Email
- Guest statistics & segmentation
- CSV export

### 🏘️ **Property Management**
- Multi-property support with performance tracking
- **Top 15 Properties** with 6 metrics:
  - Revenue, Bookings, Nights, Guests, Occupancy, Avg Value
- Sort by any metric
- Property-specific analytics

### 📈 **Performance Analytics**
- Interactive charts (payment methods, property performance)
- Booking type & channel analysis
- Advanced filtering by date range and property
- Monthly trend visualization
- Export to CSV

### 📆 **Availability Calendar**
- Visual booking calendar across properties
- Property availability tracking
- Direct booking & OTA indicators
- Multi-property view

### 👥 **Team Management**
- Role-based access control (Admin, Manager, Staff)
- Team member profiles
- Activity tracking

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| **Backend** | Supabase (PostgreSQL, Auth, Real-time) |
| **Storage** | LocalStorage (sessions), IndexedDB (offline) |
| **PWA** | Service Worker, Web App Manifest |
| **Deployment** | Vercel (Recommended), Netlify, or GitHub Pages |

### Why Vanilla JS?
- ⚡ Lightning-fast performance (95+ Lighthouse score)
- 📦 Zero dependencies, zero build time
- 🎯 Smaller bundle size = instant load times
- 🔒 Complete control & security

---

## 📱 Progressive Web App

### Desktop Installation
1. Open ResIQ in Chrome/Edge
2. Click **Install** icon (➕) in address bar
3. App opens in standalone window

### Mobile Installation
**iOS (Safari):** Share → Add to Home Screen  
**Android (Chrome):** Menu (⋮) → Install app

### PWA Features
✅ Install to home screen  
✅ Offline functionality  
✅ Auto-updates  
✅ Native app-like experience  
✅ Fast loading with service worker

---

## 🎨 Design Highlights

- **Mobile-First:** Optimized for touch (44px minimum targets)
- **Responsive:** Desktop (1024+), Tablet (768-1024), Mobile (<768)
- **Accessible:** 90+ accessibility score
- **Dark Mode Ready:** CSS variables for easy theming
- **Professional UI:** Inter font, subtle shadows, smooth animations

### Color Palette
```css
--primary: #2563eb;   /* Blue */
--success: #10b981;   /* Green */
--warning: #f59e0b;   /* Orange */
--danger: #ef4444;    /* Red */
```

---

## 🔒 Security

- ✅ Supabase Row Level Security (RLS)
- ✅ Role-based access control
- ✅ Secure token-based authentication
- ✅ Input sanitization & XSS protection
- ✅ HTTPS required for production
- ✅ Automatic session management

---

## 📊 Performance

### Lighthouse Scores
- **Performance:** 95+
- **Accessibility:** 90+
- **Best Practices:** 95+
- **SEO:** 90+
- **PWA:** ✅ Installable

### Optimizations
- Debounced search inputs
- Lazy loading for heavy components
- Efficient database queries with filtering
- Service Worker caching
- Minimal JavaScript bundle

---

## 🌐 Browser Support

| Browser | Desktop | Mobile | PWA |
|---------|---------|--------|-----|
| Chrome | ✅ 90+ | ✅ 90+ | ✅ Full |
| Safari | ✅ 14+ | ✅ 14+ | ⚠️ Limited |
| Firefox | ✅ 88+ | ✅ 88+ | ✅ Full |
| Edge | ✅ 90+ | ✅ 90+ | ✅ Full |

---

## 🗺️ Roadmap

### ✅ Recently Completed (v3.0)
- Guest Management System with 448+ guests
- Auto status updates (check-in/check-out)
- OTA code handling improvements
- Enhanced property metrics (6 metrics)
- Table/Card view toggle

### 🚧 In Progress (Q1 2026)
- [ ] PWA enhancements (full offline mode)
- [ ] Push notification system
- [ ] Guest portal (self-check-in with ID upload)
- [ ] Owner portal (property-specific dashboards)
- [ ] WhatsApp API integration
- [ ] Expense tracking module

### 🔮 Future (Q2-Q3 2026)
- [ ] Payment gateway integration (Razorpay)
- [ ] Email automation templates
- [ ] AI-powered pricing suggestions
- [ ] Revenue forecasting
- [ ] Multi-language support
- [ ] Mobile app (React Native)

---

## 📞 Support

### For Hostizzy Customers
- 📧 Email: support@hostizzy.com
- 🌐 Website: [www.hostizzy.com](https://www.hostizzy.com)

### For Technical Issues
- 🐛 [Report Bug](https://github.com/hostizzy/resiq/issues)
- 💡 [Request Feature](https://github.com/hostizzy/resiq/issues)

---

## 🤝 Contributing

This is proprietary software. Contributions are only accepted from authorized Hostizzy team members.

**For Hostizzy Team:**
1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push: `git push origin feature/amazing-feature`
4. Open Pull Request

---

## 📄 License

**Proprietary Software**

© 2025 Hostizzy (Hostsphere India Private Limited). All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use is strictly prohibited without explicit written permission from Hostizzy.

**For licensing inquiries:** partnerships@hostizzy.com

---

## 🌟 About Hostizzy

Hostizzy empowers independent hosts and property managers across India to deliver exceptional hospitality experiences. We combine technology, local expertise, and customer service to help you maximize your property's potential.

### Our Mission
To democratize hospitality technology and make professional property management accessible to everyone.

### Our Vision
A world where every property owner can compete with large hotel chains through smart technology and data-driven insights.

---

## 🔗 Connect

- 🌐 [hostizzy.com](https://hostizzy.com)
- 💼 [LinkedIn](https://linkedin.com/company/hostizzy)
- 📸 [Instagram](https://instagram.com/hostizzy)

---

<div align="center">

### Built with ❤️ for hospitality professionals in India

**ResIQ v3.0** | Last Updated: November 2025

[🐛 Report Bug](https://github.com/hostizzy/resiq/issues) · [💡 Request Feature](https://github.com/hostizzy/resiq/issues) · [📖 Documentation](https://docs.hostizzy.com)

</div>
