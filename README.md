# LaparoSim

AI-powered laparoscopic simulation using only a webcam.

LaparoSim is a browser-based surgical simulation platform for deliberate laparoscopic training. Train peg transfer, pattern cutting, and knot tying with real-time instrument analytics, assessment workflows, and performance reports.

## Product Focus

- Laparoscopy-only training pathway
- Webcam-based dual-hand instrument control
- Training and assessment modes
- Actionable simulator feedback (not gamified praise)
- Metrics optimized for instrument manipulation

## Supported Tasks

- **Peg Transfer** — bimanual coordination and economy of motion
- **Pattern Cutting** — traction stability and procedural accuracy
- **Knot Tying** — confined-space alignment and knot security

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/training` | Select task for training session |
| `/training/[taskId]` | Live training workspace |
| `/assessment` | Select task for timed assessment |
| `/assessment/[taskId]` | Live assessment workspace |
| `/report` | Session report index |
| `/report/[sessionId]` | Individual performance report |

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- MediaPipe Tasks Vision
- Custom hand-tracking signal pipeline (EMA, dead zone, velocity gate, pinch debounce)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev     # Local development
npm run build   # Production build + type checks
npm run start   # Production server
npm run lint    # ESLint
npm run check   # Lint + production build
```

## Project Structure

```text
src/
  app/
    assessment/
    report/
    training/
  components/
    analytics/
    laparoscopic/
    landing/
    layout/
  hooks/
  lib/
    engines/
    hand-tracking/
    laparoscopic/
    types/
```

## Demo Flow

1. Open `/training` or `/assessment`
2. Select a laparoscopic task
3. Click **Begin Task** and position both hands in frame
4. Complete guided or free practice
5. Review metrics at `/report`

## Requirements

- Modern browser with webcam
- HTTPS or localhost (required for camera access)
- Network on first load (MediaPipe model/WASM CDN)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faakanshajagga14%2Fsuturelab)

## Disclaimer

LaparoSim is for educational simulation only. It is not a medical device and is not intended for diagnosis, treatment, or credentialing decisions.
