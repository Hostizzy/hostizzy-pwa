# 🧠 ResIQ by Hostizzy

⚠️ **NOTICE:** This is proprietary software owned by Hostizzy.  
Viewing the source code does **not** grant any rights to use, copy, modify, or redistribute it.  
Commercial usage requires a licensing agreement with Hostizzy.

ResIQ is a proprietary property operations dashboard designed for vacation rentals, homestays, and boutique stays.  
It helps teams centralize **reservations**, **calendar sync**, and **performance insights** in a clean, mobile-ready interface.

---

## 📌 Overview

ResIQ is a **PWA-ready** (Progressive Web App) operations tool built for daily use by on-ground property teams and central reservation teams.

It combines:
- 📅 Reservation & iCal sync  
- 🏡 Property management & settings  
- 📊 Performance dashboards  
- ⚡ Action center for daily ops  
- 🧭 Mobile-friendly UI with persistent login

---

## 🚀 Features

### 🔐 Authentication
- Email & password based login
- **Persistent sessions using `localStorage`** (users stay logged in across browser restarts)
- Clean logout state management

### 🧭 Navigation
- Single-page layout with multiple **container views** (`dashboard`, `reservations`, `payments`, `availability`, `properties`, `performance`, `team`)
- Sidebar for desktop  
- Mobile header + slide-out navigation for smaller screens

### 🏡 Property Management
- Property settings modal with:
  - iCal link management
  - Last sync timestamp display (`formatTimeAgo` function with tolerant parsing)
  - Editable property details
- Calendar sync indicators
- Inline sync metadata updates

### 📅 Reservations & Calendar
- iCal integration (imports bookings from external calendars)
- Displays reservation data in unified dashboard
- Can be extended to support multiple sources

### 📊 Performance Dashboard
- Real-time breakdown of bookings by type
- **Shared rendering function** for both dashboard and performance view
- Percentage revenue breakdown and progress bars
- Aggregated metrics (revenue, booking count, nights)

### ⚡ Action Center
- Collapsible card with state persistence
- Urgent / Today / Upcoming tabbed tasks
- Mobile-friendly segmented button UI
- Empty states supported

### 🧠 UI/UX Utilities
- **Collapsible sections** with saved states (`localStorage`)
- **Toast notifications** for key actions (login/logout/sync/errors)
- Persistent offline banner
- Mobile quick action FAB
- Sync indicator with status & manual trigger

### 📲 PWA Support
- Service Worker registration
- `beforeinstallprompt` handling
- Install bar prompt for mobile devices

### User Roles
- **Admin**: Full access to all features
- **Manager**: Can manage reservations and view reports
- **Staff**: Basic reservation access

## 🚀 Quick Start

### Installation Options

#### Option 1: Simple Deployment (Recommended)
1. Download all three files:
   - `hostizzy-pwa.html`
   - `manifest.json`
   - `sw.js`

2. Upload to any web hosting service (GitHub Pages, Netlify, Vercel, etc.)

3. Access via browser and install as PWA

#### Option 2: Local Development
1. Place all files in a folder
2. Run a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```
3. Open `http://localhost:8000/hostizzy-pwa.html`

#### Option 3: GitHub Pages (Free Hosting)
1. Create a GitHub repository
2. Upload the three files
3. Enable GitHub Pages in repository settings
4. Access via: `https://yourusername.github.io/repository-name/hostizzy-pwa.html`

## 📱 Installing as PWA

### On Desktop (Chrome/Edge)
1. Open the application in browser
2. Click the install icon (➕) in the address bar
3. Click "Install" in the prompt
4. App will open in standalone window

### On Mobile (iOS)
1. Open in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Tap "Add"

### On Mobile (Android)
1. Open in Chrome
2. Tap the three dots menu
3. Tap "Install app" or "Add to Home Screen"
4. Tap "Install"

## 🎨 Design System

### Colors
- **Primary**: #FF5A5F (Coral Red) - Brand color
- **Secondary**: #00A699 (Teal) - Accent
- **Success**: #008489 (Dark Teal) - Confirmations
- **Accent**: #FC642D (Orange) - Highlights
- **Background**: #F7F7F7 (Light Grey)
- **Text**: #484848 (Dark Grey)

### Typography
- Font Family: Inter, System Fonts
- Mobile-first responsive design
- 20px consistent spacing

---

## 🧰 Tech Stack

- **Frontend:** HTML, vanilla JS, CSS  
- **Storage:** LocalStorage (session persistence), IndexedDB (offline layer)  
- **PWA:** Service Worker, install prompt, offline banner  
- **Integrations:** iCal feed import  
- **No Frameworks:** Runs standalone in browser without React/Vue

---

## 🧪 Development Setup

### Prerequisites
- Any modern browser (Chrome, Edge, Safari, Firefox)
- A basic static server (e.g. `live-server`, `http-server`, or VS Code Live Preview)

### Run locally
```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/resiq.git
cd resiq

# 2. Start a local server
npx live-server .
# or
python3 -m http.server 8080

# 3. Open the app
http://localhost:8080


## 🔧 Customization

### Adding Your Properties
1. Login with admin credentials
2. Go to "Properties" tab
3. Click "+ Add Property"
4. Fill in property details
5. Save

### Sample Data
The app includes sample reservations for demonstration. You can:
- Delete sample reservations individually
- Start adding real reservations
- Export data (via browser developer tools if needed)

### Branding
To customize colors, edit the CSS variables in `hostizzy-pwa.html`:
```css
:root {
    --primary: #FF5A5F;
    --secondary: #00A699;
    /* ... other colors ... */
}
```

## 🌐 Browser Compatibility

### Fully Supported:
- ✅ Chrome/Edge (v90+)
- ✅ Firefox (v88+)
- ✅ Safari (v14+)
- ✅ Samsung Internet
- ✅ Opera

### PWA Features:
- ✅ Offline mode
- ✅ Install to home screen
- ✅ Push notifications (ready for implementation)
- ✅ Background sync (ready for implementation)

## 📱 Mobile Responsiveness

The app is optimized for:
- 📱 Mobile phones (320px+)
- 📲 Tablets (768px+)
- 💻 Laptops (1024px+)
- 🖥️ Desktop (1400px+)

## 🐛 Troubleshooting

### PWA not installing?
- Ensure files are served over HTTPS (except localhost)
- Check browser console for errors
- Clear browser cache and reload

### Data not persisting?
- Check if browser allows LocalStorage
- Ensure not in Incognito/Private mode
- Check browser storage settings

### Offline mode not working?
- Service worker may not be registered
- Check browser console for SW errors
- Ensure all files are in same directory

## 📞 Support

For issues with:
- **Hostizzy brand**: Contact Hostsphere India Private Limited
- **Technical setup**: Check browser console for errors
- **Feature requests**: Document for future development

## 🚀 Future Enhancements

Potential additions:
- [ ] Email notifications for bookings
- [ ] Payment gateway integration
- [ ] Guest portal for self check-in
- [ ] Multi-language support
- [ ] Mobile app (React Native)

## 📄 License

Proprietary software for Hostizzy by Hostsphere India Private Limited.

## 🏢 About Hostizzy

Hostizzy is a hospitality brand in India operated by Hostsphere India Private Limited, dedicated to providing exceptional accommodation experiences.

---

**Built with ❤️ for Hostizzy**

Version 1.0 | Last Updated: October 2025
