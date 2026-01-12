# Rule Tool - Site Estimating Platform

A site-first multi-trade estimating platform for parking lot and pavement contractors.

## Features

### Site Estimator (`/site`)
- **Satellite Map View** - Navigate to any address and view satellite imagery
- **Drawing Tools** - Draw polygons (A), lines (L), or select (V) on the map
- **AI Detection** - Automatically detect site features using Claude Vision AI
- **Object Classification** - Classify drawn areas as parking surfaces, sidewalks, curbs, etc.
- **Cost Calculation** - Automatic pricing based on measurements and trade mappings

### Bid Dashboard (`/dashboard`)
- **Pipeline View** - Kanban-style board with stages: Lead, Qualifying, Proposal, Submitted, Negotiation
- **Bid Management** - Create, edit, and track bids through the pipeline
- **Activity Timeline** - Track all actions and notes on each bid
- **RFI Tracking** - Manage requests for information
- **Addenda Management** - Track bid addenda and acknowledgments

### Blueprint Upload (`/blueprint`)
- **PDF Upload** - Upload multi-page blueprint PDFs
- **Page Categorization** - Auto-categorize pages (site plan, floor plan, electrical, etc.)
- **AI Analysis** - Extract features from blueprint pages
- **Attach to Site** - Link detected features to site objects

---

## Trades & Services

### Configured Trades

| Code | Trade | Color | Min Job | Mobilization |
|------|-------|-------|---------|--------------|
| ASPH | Asphalt Paving | #374151 | $5,000 | $1,500 |
| SEAL | Sealcoating | #1f2937 | $1,500 | $500 |
| STRP | Striping & Markings | #fbbf24 | $800 | $350 |
| CONC | Concrete | #9ca3af | $2,500 | $800 |
| CRCK | Crack Repair | #ef4444 | $500 | $300 |
| SITE | Site Work | #10b981 | $1,000 | $500 |

### Services & Pricing

#### Asphalt (ASPH)
| Service | Unit | Labor | Material | Equipment | Total |
|---------|------|-------|----------|-----------|-------|
| HMA Overlay 2" | sq ft | $0.85 | $1.45 | $0.35 | $2.65 |

#### Sealcoating (SEAL)
| Service | Unit | Labor | Material | Equipment | Total |
|---------|------|-------|----------|-----------|-------|
| Coal Tar 2-Coat | sq ft | $0.04 | $0.08 | $0.02 | $0.14 |

#### Striping (STRP)
| Service | Unit | Labor | Material | Equipment | Total |
|---------|------|-------|----------|-----------|-------|
| Standard Stall | each | $3.50 | $1.25 | $0.50 | $5.25 |
| ADA Stall Complete | each | $45.00 | $35.00 | $5.00 | $85.00 |
| Fire Lane Curb | lin ft | $0.75 | $0.45 | $0.15 | $1.35 |
| Crosswalk | sq ft | $0.85 | $0.65 | $0.20 | $1.70 |
| Directional Arrow | each | $18.00 | $8.00 | $2.00 | $28.00 |
| 4" Edge Line | lin ft | $0.15 | $0.08 | $0.03 | $0.26 |

#### Concrete (CONC)
| Service | Unit | Labor | Material | Equipment | Total |
|---------|------|-------|----------|-----------|-------|
| Flatwork 4" | sq ft | $3.50 | $4.25 | $1.00 | $8.75 |
| Curb 6"x18" | lin ft | $8.50 | $6.00 | $2.50 | $17.00 |
| Valley Gutter | lin ft | $12.00 | $8.50 | $3.00 | $23.50 |
| ADA Ramp | each | $450.00 | $380.00 | $75.00 | $905.00 |

#### Crack Repair (CRCK)
| Service | Unit | Labor | Material | Equipment | Total |
|---------|------|-------|----------|-----------|-------|
| Hot Pour Rubberized | lin ft | $0.45 | $0.35 | $0.15 | $0.95 |

#### Site Work (SITE)
| Service | Unit | Labor | Material | Equipment | Total |
|---------|------|-------|----------|-----------|-------|
| Steel Bollard | each | $125.00 | $185.00 | $35.00 | $345.00 |
| Light Pole Base | each | $350.00 | $275.00 | $85.00 | $710.00 |
| Sign Post | each | $85.00 | $120.00 | $25.00 | $230.00 |
| Catch Basin | each | $225.00 | $185.00 | $65.00 | $475.00 |

---

## Object Type Mappings

Each trade's `consumes` field maps object types to services:

### Asphalt Paving
- `parking-surface` → HMA Overlay 2" (area × 1.05 waste)
- `drive-lane` → HMA Overlay 2" (area × 1.05 waste)
- `loading-area` → HMA Overlay 2" (area × 1.05 waste)

### Sealcoating
- `parking-surface` → Coal Tar 2-Coat (area)
- `drive-lane` → Coal Tar 2-Coat (area)

### Striping & Markings
- `parking-stall` → Standard Stall (count)
- `stall-group` → Standard Stall (count)
- `ada-space` → ADA Stall Complete (count)
- `fire-lane` → Fire Lane Curb (length)
- `crosswalk` → Crosswalk Striping (area)
- `directional-arrow` → Directional Arrow (count)
- `edge-line` → 4" Edge Line (length)

### Concrete
- `sidewalk` → Flatwork 4" (area)
- `curb` → Concrete Curb (length)
- `gutter` → Valley Gutter (length)
- `ada-ramp` → ADA Ramp (count)
- `median` → Flatwork 4" (area)
- `island` → Flatwork 4" (area)

### Crack Repair
- `crack` → Hot Pour Rubberized (length)

### Site Work
- `bollard` → Steel Bollard (count)
- `light-pole` → Light Pole Base (count)
- `sign` → Sign Post (count)
- `drain` → Catch Basin (count)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Draw polygon (area) |
| `L` | Draw line |
| `V` | Select mode |
| `Escape` | Cancel drawing |
| `Delete` | Delete selected object |

---

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS 4, CSS Modules
- **State**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Maps**: Mapbox GL JS
- **AI**: Claude Vision API
- **Geospatial**: Turf.js

---

## Database Tables

### Core
- `sites` - Site information and settings
- `site_objects` - Detected/drawn objects with geometry
- `trades` - Trade configurations with consumes mappings
- `services` - Service pricing and production rates

### Bids
- `bids` - Bid pipeline tracking
- `bid_activities` - Activity timeline
- `bid_rfis` - RFI management
- `bid_addenda` - Addendum tracking
- `bid_notifications` - User notifications

### Blueprints
- `pdf_documents` - Uploaded PDF files
- `pdf_pages` - Extracted pages with categories
- `blueprint_features` - Detected features from blueprints
- `pdf_site_links` - Document to site associations

---

## Running Locally

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Mapbox token and Supabase credentials

# Run development server
npm run dev

# Open http://localhost:3000
```

## Scripts

```bash
# Seed trades and services
node scripts/seed-trades.mjs

# Verify seeded data
node scripts/verify-trades.mjs
```
