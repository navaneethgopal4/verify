import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Search, Link2, FileText, ArrowLeft, History, AlertTriangle, ExternalLink, Info, CheckCircle, HelpCircle } from 'lucide-react';
import Gauge from './components/Gauge';
import ReportCard from './components/ReportCard';
import SuspiciousHighlight from './components/SuspiciousHighlight';
import SearchFactCheck from './components/SearchFactCheck';

const ROTATING_TIPS = [
  "Connecting to URL and scraping article content...",
  "Running natural language parsing on sentences...",
  "Checking publisher against source credibility database...",
  "Cross-referencing headline against current search indexes...",
  "Analyzing sensational clickbait phrasing and tone bias...",
  "Computing composite accuracy verification score..."
];

const App = () => {
  const [activeTab, setActiveTab] = useState('verify'); // 'verify' or 'explorer'
  const [inputMode, setInputMode] = useState('url'); // 'url' or 'text'
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('verify_search_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
  }, []);

  // Cycle loading messages when API is processing
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingTipIndex((prev) => (prev + 1) % ROTATING_TIPS.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const saveToHistory = (newReport) => {
    const item = {
      title: newReport.title,
      domain: newReport.sourceDomain || 'Text Input',
      score: newReport.finalScore,
      tier: newReport.ratingTier,
      timestamp: new Date().toLocaleTimeString(),
      fullReport: newReport // Save the whole object to load immediately
    };
    
    // De-duplicate: filter out previous item with same title
    const filteredHistory = history.filter(h => h.title !== newReport.title);
    const updatedHistory = [item, ...filteredHistory].slice(0, 6); // Keep last 6
    
    setHistory(updatedHistory);
    localStorage.setItem('verify_search_history', JSON.stringify(updatedHistory));
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setLoadingTipIndex(0);

    const payload = inputMode === 'url' 
      ? { url: inputValue.trim() } 
      : { text: inputValue.trim() };

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    try {
      const response = await axios.post(`${apiBaseUrl}/api/verify`, payload);
      setReport(response.data);
      saveToHistory(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Unable to reach the verification server. Ensure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHistoryItem = (historyItem) => {
    setReport(historyItem.fullReport);
    setError(null);
  };

  const handleClearHistory = (e) => {
    e.stopPropagation();
    setHistory([]);
    localStorage.removeItem('verify_search_history');
  };

  const getVerdictDetails = (tier, score) => {
    switch (tier) {
      case 'verified':
        return {
          title: "Verified & Highly Reliable News",
          desc: `With an accuracy index of ${score}/100, this article aligns perfectly with standards of journalistic integrity. It is sourced from a reputable domain and is corroborated by wide external coverage without debunking indications.`,
          class: 'verified',
          icon: <CheckCircle size={24} />
        };
      case 'mixed':
        return {
          title: "Mixed Truth or Unverified Claim",
          desc: `Scoring ${score}/100, this content contains elements of truth but also raises flags. We detected clickbait phrasing in the headline, subjective opinion leaning, or lack of strong corroboration among reputable news agencies. Use secondary sources to confirm.`,
          class: 'mixed',
          icon: <Info size={24} />
        };
      case 'unreliable':
        return {
          title: "Misleading or Disreputable News",
          desc: `Scoring ${score}/100, this article contains significant indicators of fake news, clickbait, or outright misinformation. It originates from a publisher with a low trust rating, features extreme emotional bias, or search engine reports explicitly debunk the claims.`,
          class: 'unreliable',
          icon: <AlertTriangle size={24} />
        };
      case 'satire':
        return {
          title: "Humorous / Satirical Parody",
          desc: "This article is published by a known satirical source (e.g., The Onion, Babylon Bee). It is written as parody for entertainment and should not be taken as factual reporting.",
          class: 'satire',
          icon: <HelpCircle size={24} />
        };
      default:
        return { title: '', desc: '', class: '', icon: null };
    }
  };

  return (
    <div className="app-container">
      {/* Header section */}
      <header className="header">
        <div className="logo" id="app-logo">
          <ShieldCheck size={32} />
          <span>VERIFY</span>
        </div>
        <div className="tagline">Fake News Detection & Credibility scoring</div>
        
        <nav className="nav-tabs">
          <button 
            id="tab-verify"
            className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('verify'); setError(null); }}
          >
            <ShieldCheck size={16} />
            Verify Claims
          </button>
          <button 
            id="tab-explorer"
            className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('explorer'); setError(null); }}
          >
            <Search size={16} />
            Fact Check Explorer
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main style={{ paddingBottom: '40px' }}>
        {activeTab === 'explorer' ? (
          <SearchFactCheck />
        ) : (
          /* Verification Dashboard */
          <div>
            {!report && !loading && (
              <div className="input-section glass-card">
                <h1>Shield Your Feed From Fake News</h1>
                <p>Instantly evaluate articles, links, or statements. We cross-examine sources, analyze sensational clickbait phrasing, and verify web consensus to score truthfulness.</p>

                <div className="mode-selector">
                  <button 
                    id="mode-url"
                    className={`mode-btn ${inputMode === 'url' ? 'active' : ''}`}
                    onClick={() => { setInputMode('url'); setInputValue(''); }}
                  >
                    <Link2 size={16} />
                    Submit URL
                  </button>
                  <button 
                    id="mode-text"
                    className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
                    onClick={() => { setInputMode('text'); setInputValue(''); }}
                  >
                    <FileText size={16} />
                    Submit Raw Text
                  </button>
                </div>

                <form onSubmit={handleVerify} className="input-container">
                  {inputMode === 'url' ? (
                    <div className="url-input-container">
                      <input
                        id="url-input-field"
                        type="url"
                        className="text-input"
                        placeholder="Paste article web link (e.g., https://reuters.com/...)"
                        required
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="input-field-wrapper">
                      <textarea
                        id="text-input-field"
                        className="text-input"
                        placeholder="Paste the raw text of the claim or news body here..."
                        required
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                      />
                    </div>
                  )}

                  <button 
                    id="verify-submit-btn"
                    type="submit" 
                    className="btn-primary" 
                    disabled={!inputValue.trim()}
                  >
                    <ShieldCheck size={20} />
                    Run Credibility Audit
                  </button>
                </form>
              </div>
            )}

            {/* Loading Spinner with Rotating Tips */}
            {loading && (
              <div className="glass-card loader-container">
                <div className="spinner"></div>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Running Verification Scan...</h3>
                <p className="rotating-tip">{ROTATING_TIPS[loadingTipIndex]}</p>
              </div>
            )}

            {/* Error alerts */}
            {error && (
              <div className="glass-card" style={{ maxWidth: '600px', margin: '20px auto', borderLeft: '4px solid #ef4444', color: '#f87171', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                  <AlertTriangle size={18} />
                  <strong>Audit Failed</strong>
                </div>
                <p style={{ fontSize: '14px' }}>{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className="back-btn" 
                  style={{ marginTop: '14px', width: 'fit-content' }}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Detailed Verification Report screen */}
            {report && !loading && (
              <div>
                <div className="report-header">
                  <button onClick={() => setReport(null)} className="back-btn" id="btn-back-report">
                    <ArrowLeft size={16} />
                    Audit Another Claim
                  </button>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Audit Report: "{report.title}"
                    </h2>
                    {report.sourceDomain && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Source Domain: <strong>{report.sourceDomain}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Verdict Highlight alert */}
                {(() => {
                  const verdict = getVerdictDetails(report.ratingTier, report.finalScore);
                  return (
                    <div className={`verdict-alert ${verdict.class}`}>
                      {verdict.icon}
                      <div>
                        <div className="verdict-title">{verdict.title}</div>
                        <div className="verdict-desc">{verdict.desc}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Layout Grid */}
                <div className="report-grid">
                  {/* Left Column: Gauge */}
                  <Gauge score={report.finalScore} tier={report.ratingTier} />

                  {/* Right Column: Metrics Cards */}
                  <ReportCard analysis={report.analysis} sourceDomain={report.sourceDomain} />

                  {/* Highlighter section */}
                  <SuspiciousHighlight sentences={report.analysis.flaggedSentences} />

                  {/* Web Consensus references */}
                  {report.analysis.consensus.references && report.analysis.consensus.references.length > 0 && (
                    <div className="glass-card consensus-card" style={{ gridColumn: 'span 2' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
                        <ExternalLink size={18} color="var(--color-primary)" />
                        Corroborating Web Evidence
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Top search coverage matches from fact checkers and international networks:
                      </p>
                      
                      <div className="reference-list">
                        {report.analysis.consensus.references.map((ref, idx) => (
                          <div key={idx} className="reference-item">
                            <div className="ref-info">
                              <a href={ref.url} target="_blank" rel="noopener noreferrer" className="ref-title">
                                {ref.title}
                              </a>
                              <span className="ref-snippet">{ref.snippet}</span>
                            </div>
                            <span className={`ref-tag ${ref.status}`}>{ref.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search History Shelf */}
            {!report && !loading && history.length > 0 && (
              <div className="history-section">
                <div className="history-title">
                  <History size={18} />
                  <span>Recent Audits</span>
                  <button 
                    onClick={handleClearHistory} 
                    style={{ 
                      marginLeft: 'auto', 
                      background: 'transparent', 
                      border: 'none', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer',
                      fontSize: '12px',
                      textDecoration: 'underline'
                    }}
                  >
                    Clear History
                  </button>
                </div>
                
                <div className="history-list">
                  {history.map((item, index) => (
                    <div 
                      key={index} 
                      className="history-item"
                      onClick={() => handleLoadHistoryItem(item)}
                    >
                      <div className="history-header">
                        <span className="history-domain">{item.domain}</span>
                        <span className={`history-score-badge ${item.tier}`}>
                          {item.score}/100
                        </span>
                      </div>
                      <div className="history-item-title" title={item.title}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Verified at {item.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer bar */}
      <footer className="footer">
        <div>© 2026 Verify Project. Ready to protect your news feed.</div>
        <div className="footer-links">
          <a href="#privacy" className="footer-link">Privacy Policy</a>
          <a href="#about" className="footer-link">Heuristics Engine Documentation</a>
          <a href="#terms" className="footer-link">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
