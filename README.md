# Hostizzy -  Reservation Management System

A comprehensive Progressive Web App (PWA) for managing property reservations for Hostizzy, built by Hostsphere India Private Limited.

## 🌟 Features

### Core Functionality
- **Team Authentication**: Multi-user login system with role-based access
- **Reservation Management**: Create, view, edit, and cancel reservations
- **Dashboard Analytics**: Visual insights into bookings and revenue
- **Property Management**: Manage multiple properties and their availability
- **Historical Data**: View all reservation data from the current year
- **Offline Support**: Works without internet connection
- **Mobile-First Design**: Optimized for all devices

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

## 🔐 Default Login Credentials

```
Email: admin@hostizzy.com
Password: admin123
```

**Important**: Change these credentials after first login by adding new team members.

## 📊 Features Walkthrough

### Dashboard
- **Total Reservations**: Count of all bookings this year
- **Active Reservations**: Currently checked-in guests
- **Properties**: Number of managed properties
- **Revenue**: Total earnings (in INR)
- **Recent Reservations**: Latest 5 bookings
- **Monthly Overview**: Revenue trends

### Reservations Management
- **Create New**: Add reservations with guest details
- **Search & Filter**: By name, booking ID, property, status, or date
- **Edit/Delete**: Modify or remove existing bookings
- **Status Tracking**: Pending, Confirmed, Checked-in, Checked-out, Cancelled

### Property Management
- View all properties
- Add new properties
- Track active bookings per property
- Manage capacity and details

### Team Management
- Add team members
- Assign roles (Admin/Manager/Staff)
- Remove team members (except primary admin)

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

## 💾 Data Storage

The application uses **browser LocalStorage** for data persistence:
- All data is stored locally in the browser
- No external database required
- Data persists between sessions
- Works offline

### Data Structure
- **Users/Team**: Login credentials and roles
- **Properties**: Hotel/property information
- **Reservations**: Booking details and history

### Pre-loaded Data
The system comes with:
- 1 admin account
- 3 sample properties (Delhi, Goa, Mumbai)
- 60 sample reservations (5 per month for 2025)

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

## 📈 Scalability

### Current Limitations
- LocalStorage capacity: ~5-10MB
- Recommended max: 1000-2000 reservations
- Single device storage (not cloud-synced)

### For Larger Scale
Consider migrating to:
- Backend database (MongoDB, PostgreSQL)
- Cloud hosting (AWS, Google Cloud)
- Real-time sync across devices
- Advanced analytics and reporting

## 🔒 Security Considerations

**Important**: This is a client-side application with local storage.

### For Production Use:
1. Implement backend authentication
2. Add HTTPS encryption
3. Use secure password hashing
4. Add API for data sync
5. Implement role-based access control server-side
6. Regular backups

### Current Security:
- Passwords stored in plain text (LocalStorage)
- No encryption
- Suitable for internal team use only
- Not recommended for public internet without backend

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
- [ ] Export data to Excel/CSV
- [ ] Email notifications for bookings
- [ ] SMS integration
- [ ] Payment gateway integration
- [ ] Calendar view for reservations
- [ ] Guest portal for self check-in
- [ ] Multi-language support
- [ ] Advanced analytics and reports
- [ ] Cloud backup and sync
- [ ] Mobile app (React Native)

## 📄 License

Proprietary software for Hostizzy by Hostsphere India Private Limited.

## 🏢 About Hostizzy

Hostizzy is a hospitality brand in India operated by Hostsphere India Private Limited, dedicated to providing exceptional accommodation experiences.

---

**Built with ❤️ for Hostizzy**

Version 1.0 | Last Updated: October 2025
