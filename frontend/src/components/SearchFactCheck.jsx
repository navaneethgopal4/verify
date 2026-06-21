import React, { useState } from 'react';
import axios from 'axios';
import { Search, Globe, AlertCircle, CheckCircle, HelpCircle, ExternalLink } from 'lucide-react';

const SearchFactCheck = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // Query our local backend which wraps the DuckDuckGo lookup
      const response = await axios.get(`http://localhost:5000/api/search-factchecks?q=${encodeURIComponent(query)}`);
      setResults(response.data.results || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to search fact-checks. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Heuristic checker for debunk terms in titles/snippets for status badges
  const checkDebunkStatus = (title, snippet) => {
    const fullText = `${title} ${snippet}`.toLowerCase();
    const debunkRegex = /\b(debunked|hoax|fake news|fake|false claim|misleading|untrue|myth|not real|fact check|snopes|politifact)\b/i;
    
    if (debunkRegex.test(fullText)) {
      return { label: 'Flagged / Fact-checked', class: 'debunk', icon: <AlertCircle size={14} /> };
    }
    
    // Check for standard high credibility sites
    const trustedDomains = ['reuters.com', 'apnews.com', 'bbc.com', 'bloomberg.com', 'nytimes.com', 'washingtonpost.com', 'npr.org', 'snopes.com', 'politifact.com', 'factcheck.org'];
    const matchedTrusted = trustedDomains.some(d => fullText.includes(d));
    if (matchedTrusted) {
      return { label: 'Trusted Media Report', class: 'trusted', icon: <CheckCircle size={14} /> };
    }

    return { label: 'Unverified Report', class: 'neutral', icon: <HelpCircle size={14} /> };
  };

  return (
    <div className="factcheck-search-container">
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
          Fact Check Explorer
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Search global news and fact-check summaries directly. Cross-reference rumors, claims, or viral headlines across Snopes, PolitiFact, and major news networks.
        </p>

        <form onSubmit={handleSearch} className="fc-search-bar">
          <input
            type="text"
            className="text-input"
            placeholder="Search claims e.g., 'artificial rain in Dubai', '5G virus hoax'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }} disabled={loading}>
            <Search size={18} />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #ef4444', color: '#f87171' }}>
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px auto' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Searching fact-checking references...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="fc-grid">
          {results.map((item, index) => {
            const status = checkDebunkStatus(item.title, item.snippet);
            return (
              <div key={index} className="glass-card fc-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        textTransform: 'uppercase' 
                      }}
                      className={`ref-tag ${status.class}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={12} />
                      {item.domain}
                    </span>
                  </div>
                  
                  <h4 className="fc-title">{item.title}</h4>
                  <p className="fc-snippet" style={{ marginTop: '8px' }}>{item.snippet}</p>
                </div>

                <div className="fc-footer">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ 
                      color: 'var(--color-primary)', 
                      textDecoration: 'none', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontWeight: '600'
                    }}
                  >
                    View Article Source
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="glass-card empty-state">
          <HelpCircle />
          <p>No results found. Try adjusting your keywords to search broader terms.</p>
        </div>
      )}
    </div>
  );
};

export default SearchFactCheck;
