# PWA Assets Required for App Store Submission

This document lists all the assets needed for PWABuilder to generate app store packages.

## Icons (Required)

Create these icons from your main logo. Use a tool like:
- https://realfavicongenerator.net/
- https://maskable.app/ (for maskable icons)
- Figma/Photoshop

| File | Size | Status | Notes |
|------|------|--------|-------|
| `logo-96.png` | 96x96 | **NEEDED** | Minimum size for some platforms |
| `logo-128.png` | 128x128 | **NEEDED** | Chrome Web Store requirement |
| `logo-192.png` | 192x192 | EXISTS | Standard PWA icon |
| `logo-192-maskable.png` | 192x192 | EXISTS | Maskable version (safe zone) |
| `logo-256.png` | 256x256 | **NEEDED** | Recommended intermediate size |
| `logo-384.png` | 384x384 | **NEEDED** | Recommended intermediate size |
| `logo.png` | 512x512 | EXISTS | Large PWA icon |
| `logo-512-maskable.png` | 512x512 | EXISTS | Maskable version |

### Maskable Icon Guidelines
- Keep important content within the "safe zone" (center 80%)
- Background should extend to edges
- Test at https://maskable.app/editor

---

## Screenshots (Required for App Stores)

Place in `/assets/screenshots/` folder.

### Mobile Screenshots (narrow form factor)
| File | Size | Description |
|------|------|-------------|
| `dashboard-mobile.png` | 540x720 | Dashboard view on mobile |
| `reservations-mobile.png` | 540x720 | Reservations list view |

### Desktop Screenshots (wide form factor)
| File | Size | Description |
|------|------|-------------|
| `dashboard-desktop.png` | 1280x800 | Full dashboard on desktop |
| `analytics-desktop.png` | 1280x800 | Analytics/reports view |

### Screenshot Tips
1. Use actual app UI (not mockups)
2. Remove any sensitive/test data
3. Show key features prominently
4. Consistent styling across screenshots
5. For Play Store: minimum 2 screenshots required
6. For iOS: different sizes for different devices

---

## Additional Assets for App Stores

### Google Play Store
- **Feature Graphic**: 1024x500 PNG
- **Promo Video**: YouTube link (optional)
- **Short Description**: Max 80 characters
- **Full Description**: Max 4000 characters

### Apple App Store
- **App Icon**: 1024x1024 (no alpha/transparency)
- **Screenshots**: Multiple sizes per device type
- **App Preview Video**: Optional

---

## Quick Generation Commands

Using ImageMagick to resize:

```bash
# Generate all icon sizes from 512x512 source
convert logo.png -resize 96x96 logo-96.png
convert logo.png -resize 128x128 logo-128.png
convert logo.png -resize 256x256 logo-256.png
convert logo.png -resize 384x384 logo-384.png
```

Using online tools:
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your 512x512 logo
3. Download the generated package
4. Extract and place files in /assets/

---

## IARC Rating

For Google Play submission, you need an IARC rating ID:
1. Go to https://www.globalratings.com/
2. Complete the questionnaire for your app
3. Get the IARC certificate ID
4. Add to manifest.json: `"iarc_rating_id": "YOUR_ID_HERE"`

For ResIQ (business productivity app), expected ratings:
- PEGI: 3
- ESRB: Everyone
- USK: 0
- GRAC: All

---

## Checklist Before PWABuilder

- [ ] All icon sizes created
- [ ] Maskable icons have proper safe zone
- [ ] 2+ mobile screenshots (540x720)
- [ ] 2+ desktop screenshots (1280x800)
- [ ] IARC rating obtained
- [ ] manifest.json updated with all fields
- [ ] Service worker tested and working
- [ ] App tested on resiq.hostizzy.com
- [ ] Offline mode verified

---

## Testing PWA Readiness

1. **Lighthouse Audit**
   - Open Chrome DevTools
   - Go to Lighthouse tab
   - Run PWA audit
   - Score should be 90+

2. **PWABuilder Analysis**
   - Go to https://www.pwabuilder.com/
   - Enter https://resiq.hostizzy.com
   - Review all scores and fix issues

3. **Manual Testing**
   - Install app on mobile
   - Test offline functionality
   - Test push notifications
   - Verify all icons display correctly
