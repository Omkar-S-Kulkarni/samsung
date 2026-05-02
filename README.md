# PULSE - On-Device AI Health Coach

PULSE is a responsive, ultra-minimal health coach web application built with React and Vite. Designed specifically for smartwatches and mobile devices, it features a sleek dark sci-fi biometric UI.

## Features

- **Dashboard**: Live heart rate monitoring with an animated pulse ring and 4 core biosignal cards (HR, HRV, Sleep, Activity).
- **AI Coach**: A built-in chat interface powered by Anthropic's Claude API, featuring localized RAG pattern insights, quick-action chips, and a simulation mode if no API key is provided.
- **Signals**: 7-day trend visualizations using Recharts, including detailed sleep architecture breakdown (REM, Deep, Light, Awake).
- **Memory**: A private log of localized RAG patterns the AI has learned about the user.
- **Watch Face View**: An ultra-minimal circular interface specifically designed for viewport widths ≤ 240px, featuring edge data arcs and single-tap cycle interactions.

## Tech Stack

- React 19
- Vite
- Tailwind CSS v4
- Recharts
- Lucide React
- Anthropic SDK

## Running Locally

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the Anthropic API key (Optional):
   Create a `.env` file in the root directory and add your key:
   ```
   VITE_ANTHROPIC_API_KEY=your_api_key_here
   ```
   *Note: If no key is provided, the AI Coach will automatically fall back to simulation mode.*
4. Start the development server:
   ```bash
   npm run dev
   ```

## Responsive Breakpoints

- **Smartwatch** (≤240px): Dedicated circular Watch Face view.
- **Mobile** (≤767px): Standard app shell with bottom tab navigation and slide-up drawer AI Coach.
- **Desktop** (768px+): Expansive layout with a fixed left sidebar and a persistent right sidebar for the AI Coach.
