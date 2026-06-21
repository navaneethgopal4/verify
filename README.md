# 🛡️ Verify - Fake News & Credibility Scanner

Verify is a modern, high-fidelity web application that audits the truthfulness, neutrality, and coverage of news claims. Users can submit URLs or paste raw news text to receive an accuracy index from 0 to 100 alongside a detailed visual breakdown of clickbait risk, linguistic bias, and search engine consensus.

![Dashboard Preview](https://img.shields.io/badge/Status-Ready_to_Use-emerald?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Express-blue?style=for-the-badge)

---

## 🚀 Key Features

*   **Accuracy Rating (0-100)**: Composite validation calculated from linguistic and external metrics.
*   **Domain Trust Checker**: Integrates a pre-compiled database of media outlet reputation scores.
*   **Linguistic Bias & Sentiment Analysis**: Detects subjective assertions, logical generalizations, and emotionally charged terminology.
*   **Clickbait Detection**: Identifies clickbait title formats, all-caps patterns, and sensational keywords.
*   **Cross-Referenced Consensus**: Scrapes search engine indices to verify external coverage and flags existing debunks from fact-checking databases.
*   **Sentence-level Highlighting**: Scans text line-by-line and highlights suspicious or biased sentences with interactive explanatory tooltips.
*   **History Logs**: Retains recent searches in localStorage for quick retrieval.
*   **Fact Check Explorer**: A dedicated tab to search Snopes, PolitiFact, and global outlets for viral rumors.

---

## 🛠️ Architecture & Tech Stack

*   **Frontend**: React (Vite) styled with custom, responsive glassmorphic CSS. Includes `lucide-react` icons and a clean circular gauge view.
*   **Backend**: Node.js & Express API using `cheerio` for website content scraping and regex-based NLP heuristic engines.
*   **Orchestration**: Managed with a root-level task runner to run both frontend and backend concurrently.

---

## 💻 Quick Start & Running Locally

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18.0.0 or higher)
*   npm (v9.0.0 or higher)

### Installation

1.  Clone this repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/verify.git
    cd verify
    ```
2.  Install dependencies across the monorepo:
    ```bash
    # Install root, backend, and frontend dependencies
    npm run install:all
    ```
    *If you get peer dependency errors with React 19, run `npm install --prefix frontend --legacy-peer-deps`.*

### Running the Application

Start both the API server (port 5000) and the Vite frontend (port 5173) in development mode simultaneously:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser to start auditing news!

---

## ⚙️ Scoring Algorithm Breakdown

The overall score out of 100 is composed of weighted parameters:

$$\text{Final Score} = S_{\text{domain}} \times 0.35 + (100 - S_{\text{clickbait}}) \times 0.20 + (100 - S_{\text{bias}}) \times 0.20 + S_{\text{consensus}} \times 0.25$$

*   **Source Trust ($S_{\text{domain}}$)**: High trust publishers (e.g. Reuters, BBC) baseline at 90-99. Unrated domains start at 60. Satire domains (e.g. The Onion) trigger an immediate override badge.
*   **Headline Neutrality ($100 - S_{\text{clickbait}}$)**: Penalizes title formats matching known clickbait click-hooks, excessive punctuation, and all-caps styling.
*   **Objectivity ($100 - S_{\text{bias}}$)**: Evaluates paragraph structure, count of subjective generalizations, and density of loaded emotional adjectives.
*   **Web Consensus ($S_{\text{consensus}}$)**: Evaluates external coverage. Adds score for corroborating coverage by reputable domains and subtracts score heavily if titles match debunk identifiers.
