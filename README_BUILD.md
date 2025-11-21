# ResIQ Build System

This document explains how to use the new Vite-based build system.

## Quick Start

```bash
# Install dependencies (run once)
npm install

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## File Structure

```
ResIQ/
├── index.html              ← OLD monolithic version (keep for now)
├── index-new.html          ← NEW modular version (Vite entry)
├── package.json
├── vite.config.js
├── src/
│   ├── main.js            ← Entry point (imports everything)
│   ├── styles/
│   │   ├── main.css       ← Imports all stylesheets
│   │   ├── variables.css
│   │   ├── base.css
│   │   └── legacy.css     ← All original CSS (to be organized)
│   └── scripts/
│       └── legacy.js      ← All original JS (to be modularized)
└── dist/                  ← Build output (generated)
```

## Development Workflow

### Option 1: Test New Version Locally

```bash
# Start dev server
npm run dev

# Opens http://localhost:3000/index-new.html
# Changes auto-reload
```

### Option 2: Keep Old Version Running

The old `index.html` still works as before:
- No build step needed
- Direct deploy to Vercel works
- All 35 properties continue operating

## Build for Production

```bash
# Build optimized bundles
npm run build

# Output goes to /dist folder
# Upload dist/ contents to Vercel
```

## Deployment

### Current (Old System)
```
index.html deployed directly to Vercel
```

### New (Build System)
```bash
1. Run: npm run build
2. Deploy: Upload dist/ folder to Vercel
   Or: Configure Vercel to run npm run build automatically
```

### Vercel Configuration

Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## Testing Checklist

Before switching from old to new version:

- [ ] `npm install` completes without errors
- [ ] `npm run build` completes without errors
- [ ] `/dist/index.html` loads successfully
- [ ] Login works
- [ ] Dashboard loads
- [ ] Create reservation works
- [ ] Record payment works
- [ ] View guest documents works
- [ ] All modals open/close
- [ ] Offline mode works
- [ ] PWA install works
- [ ] Push notifications work

## Comparison

| Feature | Old (index.html) | New (index-new.html) |
|---------|------------------|----------------------|
| **File Size** | 762 KB | ~300 KB (optimized) |
| **Load Time** | All at once | Code-split, lazy load |
| **Caching** | One big file | Granular caching |
| **Build Step** | None | Required |
| **Maintainability** | ⚠️ Difficult | ✅ Modular |
| **Type Safety** | ❌ None | ✅ TypeScript (Phase 3) |

## Troubleshooting

### "Module not found"
```bash
# Make sure dependencies are installed
npm install
```

### "Failed to resolve import"
Check that paths in `main.js` are correct:
```javascript
import './styles/main.css'  // Must start with ./
import './scripts/legacy.js'
```

### Build fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Old code breaks
Don't worry! Keep `index.html` as backup:
```bash
# Revert to old version anytime
git checkout index.html
```

## Next Steps (Phase 2)

Once this works, we'll:
1. Split `legacy.js` into modules:
   - `config.js` - Supabase setup
   - `auth.js` - Login/logout
   - `reservations.js` - Reservation logic
   - `payments.js` - Payment logic
   - etc.
2. Organize `legacy.css` into:
   - `components.css` - Buttons, cards, modals
   - `layout.css` - Grid, navbar, sidebar
   - `views.css` - Dashboard, reservations, etc.
3. Add TypeScript (Phase 3)

## Support

- Vite Documentation: https://vitejs.dev/
- Issues: Check `/Documentation/MODERNIZATION_PLAN.md`
