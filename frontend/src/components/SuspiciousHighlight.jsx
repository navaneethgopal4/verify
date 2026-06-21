import React from 'react';
import { Eye } from 'lucide-react';

const SuspiciousHighlight = ({ sentences = [] }) => {
  if (!sentences || sentences.length === 0) {
    return (
      <div className="glass-card empty-state">
        <Eye />
        <p>No content loaded for highlighting analysis.</p>
      </div>
    );
  }

  // Helper to determine highlight class
  const getHighlightClass = (score) => {
    if (score >= 55) return 'highlighted-sentence level-high';
    if (score > 0) return 'highlighted-sentence level-medium';
    return '';
  };

  return (
    <div className="glass-card highlights-card" style={{ gridColumn: 'span 2' }}>
      <h3 className="highlights-title">
        <Eye size={20} color="var(--color-primary)" />
        Linguistic & Clickbait Highlighting
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Hover over the highlighted sentences (indicated by <span style={{ borderBottom: '2px dotted #ef4444', color: '#ef4444', fontWeight: 'bold' }}>red dotted underlines</span> for strong issues or <span style={{ borderBottom: '2px dotted #f59e0b', color: '#f59e0b', fontWeight: 'bold' }}>yellow underlines</span> for mild issues) to view specific flags raised by our NLP heuristic scanner.
      </p>
      
      <div className="text-analysis-box">
        {sentences.map((item, index) => {
          const highlightClass = getHighlightClass(item.score);
          
          if (highlightClass) {
            return (
              <span key={index} className={highlightClass}>
                {item.text}{' '}
                <span className="sentence-tooltip">
                  <div className="tooltip-header">Flagged Indicators:</div>
                  <ul className="tooltip-reasons" style={{ paddingLeft: '14px', margin: 0 }}>
                    {item.reasons.map((r, i) => (
                      <li key={i} style={{ margin: '2px 0' }}>{r}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '8px', fontSize: '10px', color: '#a5b4fc', textAlign: 'right' }}>
                    Risk Weight: {item.score}%
                  </div>
                </span>
              </span>
            );
          } else {
            return (
              <span key={index}>
                {item.text}{' '}
              </span>
            );
          }
        })}
      </div>
    </div>
  );
};

export default SuspiciousHighlight;
