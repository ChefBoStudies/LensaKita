# Wedding QR Camera (Frontend Only - Phase 1)

Mobile-first web app where guests scan a QR, land on an event page, and share up to 5 photos. Live gallery updates in real time (mocked in this phase). Backend (Supabase) will be integrated in Phase 2.

## Tech
- Vanilla JavaScript (ES modules)
- Semantic HTML + modern CSS with design tokens
- Static SPA, deployable to Vercel

## Structure
```
public/
  index.html
  manifest.webmanifest
  icons/
src/
  app.js
  router.js
  state/store.js
  lib/{device, image, dom, mockApi}.js
  ui/components/{header, counter, uploader, grid, tile, toast, modal, empty}.js
  pages/eventPage.js
  styles/{tokens, base, app}.css
vercel.json
```

## Run locally
Serve the repo root with any static server so that `/public` is the web root and ES module imports work.

```bash
npx http-server -p 3000 .
# or
vercel dev
```

Then open http://localhost:3000/public/index.html

## Design
- Airbnb-inspired design system (see `src/styles/tokens.css`)
- Accessibility: WCAG 2.1 AA
- Performance: target LCP < 2.5s on mid-range mobile

## Phase 2 (Backend wiring summary)
- Swap `lib/mockApi.js` with real Supabase calls
- Keep UI/component APIs unchanged
- Implement server-side 5-photo limit and 12-hour window
- Realtime: subscribe to `photos` table for event id

## License
MIT
