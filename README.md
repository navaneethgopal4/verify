# 🛡️ Verify - Fake News & Credibility Scanner

Verify is a modern, high-fidelity web application that audits the truthfulness, neutrality, and web consensus of news articles and claims. Users can submit URLs or paste raw news text to receive an accuracy index from 0 to 100 alongside a detailed visual breakdown of clickbait risk, linguistic bias, and search engine consensus.

![Dashboard Preview](https://img.shields.io/badge/Status-Live-emerald?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Express-blue?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge)

---

## 🚀 Key Features

*   **Accuracy Rating (0-100)**: Composite validation calculated from linguistic and external web-scraping metrics.
*   **Domain Trust Checker**: Integrates a pre-compiled database of media outlet reputation scores.
*   **Linguistic Bias & Sentiment Analysis**: Detects subjective assertions, loaded emotional adjectives, and generalizations.
*   **Clickbait Detection**: Identifies sensationalist click-hooks, excessive punctuation, and all-caps styling.
*   **Cross-Referenced Consensus**: Scrapes search engine indices to verify external coverage and flags existing debunks from fact-checking databases.
*   **Sentence-Level Highlighting**: Scans text line-by-line and highlights suspicious or biased sentences with interactive explanatory tooltips.
*   **Fact Check Explorer**: A dedicated tab to search Snopes, PolitiFact, and global outlets for viral rumors.
*   **History Logs**: Retains recent searches in localStorage for quick retrieval.

---

## 📁 Project Structure

```
verify/
├── backend/            # Express.js Server (API, Cheerio Scraper, NLP Heuristics)
│   ├── server.js       # Main server entrypoint
│   └── package.json
├── frontend/           # React + Vite Client (Glassmorphic UI)
│   ├── src/            # Components, styles, assets
│   ├── vite.config.js  # Build config (configured with relative base path)
│   └── package.json
├── vercel.json         # Vercel monorepo build deployment settings
├── .npmrc              # Forces legacy-peer-deps for React 19 installs
└── package.json        # Root workspace runner
```

---

## 💻 Running Locally

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18.0.0 or higher)
*   npm (v9.0.0 or higher)

### Installation

1.  Clone this repository:
    ```bash
    git clone https://github.com/navaneethgopal4/verify.git
    cd verify
    ```
2.  Install all dependencies across the monorepo:
    ```bash
    npm run install:all
    ```

### Starting the Application

Start both the Express API server (port 5000) and the Vite frontend (port 5173) in development mode simultaneously:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser to start auditing news!

---

## ⚙️ Scoring Algorithm Breakdown

The overall score out of 100 is composed of weighted parameters:

$$\text{Final Score} = S_{\text{domain}} \times 0.35 + (100 - S_{\text{clickbait}}) \times 0.20 + (100 - S_{\text{bias}}) \times 0.20 + S_{\text{consensus}} \times 0.25$$

*   **Source Trust ($S_{\text{domain}}$)**: High trust publishers (e.g., Reuters, BBC) baseline at 90-99. Unrated domains start at 60. Satire domains (e.g., The Onion) trigger an immediate override badge.
*   **Headline Neutrality ($100 - S_{\text{clickbait}}$)**: Penalizes title formats matching clickbait hooks, excessive punctuation, and all-caps styling.
*   **Objectivity ($100 - S_{\text{bias}}$)**: Evaluates paragraph structure, count of subjective generalizations, and density of loaded emotional adjectives.
*   **Web Consensus ($S_{\text{consensus}}$)**: Evaluates external coverage. Adds score for corroborating coverage by reputable domains and subtracts score heavily if titles match debunk identifiers.

---

## 🚀 Deploying to Vercel

The repository is pre-configured for Vercel Monorepo deployment. When you link your repository to Vercel, it automatically reads the root `vercel.json` config, bypasses React 19 peer-dependency warnings using `.npmrc`, builds the React frontend in the `frontend` folder, and serves the static production output directly.
