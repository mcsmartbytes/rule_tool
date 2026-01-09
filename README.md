# Rule Tool

A site-first multi-trade estimating platform for contractors. Measure properties once on satellite maps, then generate estimates across multiple trades automatically.

## Features

### Site-First Architecture
- **Draw once, estimate many** - One site model generates estimates for multiple trades
- **Persistent site model** - Objects stored and reusable
- **Change propagation** - Edit geometry and all estimates auto-update

### Map-Based Measurement
- **Satellite imagery** via Mapbox
- **Drawing tools**: Freehand, Polygon, Line, Rectangle, Circle
- **Auto-calculate**: Area (sq ft), Perimeter (ft), Length
- **3D buildings** toggle for context
- **Object classification** - Real-world taxonomy (surfaces, curbs, markings)

### Multi-Trade Estimation
- **Asphalt** - Paving, patching, crack sealing
- **Sealcoating** - Surface sealcoat application
- **Concrete** - Flatwork, curbs, sidewalks
- **Striping** - Parking lot markings, stalls, arrows

### Production-Aware Pricing
- Calculate labor hours based on production rates
- Factor in crew size, hourly rates, and labor burden
- Material costs with waste factors
- Equipment costs (fixed + hourly)
- Risk indicators for low margin jobs

### Export Options
- PDF reports
- CSV data export
- QuickBooks IIF estimates

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Maps**: Mapbox GL JS + Mapbox Draw
- **Calculations**: Turf.js
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Validation**: Zod

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main app page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Styles
├── components/
│   ├── MapView.tsx       # Mapbox map + drawing
│   ├── Toolbar.tsx       # Main toolbar
│   └── ...
└── lib/
    ├── supabase/         # Supabase client
    ├── store.ts          # App state (Zustand)
    ├── pricing-engine.ts # Calculation logic
    └── ...
```

---

## Deployment

### Vercel
1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Environment Variables for Production
Set these in your hosting platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

---

## License

Proprietary - All rights reserved.
