# SutureLab: AI-Powered Surgical Skills Training Platform

Clinical skills training platform built for the OpenAI Hackathon.

SutureLab provides two simulation tracks:
- Suturing fundamentals with guided path following and session feedback
- FLS-style laparoscopic training with dual-hand tracking

The app is browser-based, uses webcam hand tracking via MediaPipe, and delivers real-time performance feedback for deliberate practice.

## Why SutureLab

Early surgical learners need structured repetition, immediate feedback, and measurable progress. SutureLab is designed to help trainees practice safely outside high-stakes environments with:
- real-time motion analysis
- objective skill metrics
- clinically oriented guidance

## Core Features

- Suturing module (`/session`, `/summary`)
  - Guided needle path tracking
  - Live precision, stability, and motion feedback
  - End-of-session performance summary

- Laparoscopic module (`/laparoscopic`)
  - Peg transfer, pattern cutting, knot tying
  - Dual-hand instrument control
  - Training and assessment workflows
  - Session report generation

- Signal processing pipeline for stable control
  - EMA smoothing
  - Dead-zone filtering
  - Velocity gating
  - Pinch debouncing

- Analytics and feedback engines
  - Stability and tremor analysis
  - Motion quality scoring
  - Procedural metrics and trend reporting

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
- Lucide React

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev    # Start local development server
npm run build  # Production build + type checks
npm run start  # Run production server
npm run lint   # ESLint checks
```

## Project Structure

```text
src/
  app/
    laparoscopic/
    session/
    summary/
  components/
    laparoscopic/
    training/
    summary/
  lib/
    engines/
    hand-tracking/
    laparoscopic/
    mediapipe/
    suturing/
    types/
```

## Demo Flow

1. Go to `/laparoscopic`
2. Choose a task (peg transfer, pattern cutting, knot tying)
3. Click **Begin Task**
4. Position hands in frame and follow guided feedback
5. Review session outcomes in report screens

## Requirements

- A modern browser with webcam access
- `localhost` or HTTPS (required for `getUserMedia`)
- Internet access on first run (MediaPipe model/WASM fetch)

## Deploy to Vercel

This repo is ready for Vercel (Next.js auto-detected, no env vars required).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faakanshajagga14%2Fsuturelab)

**Connect GitHub (one-time):**

1. Open the button above (or [Import `aakanshajagga14/suturelab`](https://vercel.com/new/import?s=https://github.com/aakanshajagga14/suturelab)).
2. Sign in to Vercel with **GitHub** and authorize access.
3. Select repository **`aakanshajagga14/suturelab`**, branch **`main`**.
4. Keep defaults: **Framework** Next.js, **Build Command** `npm run build`, **Install Command** `npm install`.
5. Click **Deploy**.

After the first deploy, every push to `main` redeploys automatically.

**CLI alternative (optional):**

```bash
npm i -g vercel
vercel login
vercel link
vercel --prod
```

## OpenAI Hackathon Note

This project is submitted as an OpenAI Hackathon build focused on practical, feedback-driven clinical simulation in the browser.

## Disclaimer

SutureLab is for educational simulation only. It is not a medical device and is not intended for diagnosis, treatment, or credentialing decisions.
