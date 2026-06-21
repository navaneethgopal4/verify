import React from 'react';
import { Shield, AlertTriangle, CheckCircle, HelpCircle, Activity, Heart, RefreshCw, Globe } from 'lucide-react';

const ReportCard = ({ analysis = {}, sourceDomain = null }) => {
  const { domain = {}, clickbait = {}, bias = {}, consensus = {} } = analysis;

  // Helper for progress bar color
  const getBarColor = (score) => {
    if (score >= 75) return '#10b981'; // Emerald Green
    if (score >= 45) return '#f59e0b'; // Amber Yellow
    return '#ef4444'; // Red
  };

  // 100 - clickbait means "Headline Neutrality" (higher is better)
  const headlineNeutrality = 100 - (clickbait.score || 0);
  // 100 - bias means "Objectivity Rate" (higher is better)
  const objectivityRate = 100 - (bias.score || 0);

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Activity size={20} color="var(--color-primary)" />
        Analysis Breakdown
      </h3>

      <div className="metrics-list">
        {/* Domain Credibility */}
        <div className="metric-row">
          <div className="metric-info">
            <span className="metric-label">
              <Globe size={18} color="#a5b4fc" />
              Source Trust ({domain.name || sourceDomain || 'Unknown Source'})
            </span>
            <span className="metric-value" style={{ color: getBarColor(domain.score) }}>
              {domain.score || 50}/100
            </span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${domain.score || 50}%`, 
                backgroundColor: getBarColor(domain.score) 
              }}
            />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {domain.description || 'Unknown publisher domain. Analyzed with generic web heuristics.'}
          </p>
        </div>

        {/* Headline Neutrality */}
        <div className="metric-row">
          <div className="metric-info">
            <span className="metric-label">
              <Shield size={18} color="#a5b4fc" />
              Headline Neutrality (Low Clickbait)
            </span>
            <span className="metric-value" style={{ color: getBarColor(headlineNeutrality) }}>
              {headlineNeutrality}/100
            </span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${headlineNeutrality}%`, 
                backgroundColor: getBarColor(headlineNeutrality) 
              }}
            />
          </div>
          {clickbait.reasons && clickbait.reasons.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {clickbait.reasons.map((reason, index) => (
                <span 
                  key={index} 
                  style={{ 
                    fontSize: '11px', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    background: 'rgba(239, 68, 68, 0.12)', 
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.2)' 
                  }}
                >
                  ⚠ {reason}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#34d399', marginTop: '4px' }}>
              ✓ Headline text shows neutral, objective formatting.
            </p>
          )}
        </div>

        {/* Text Objectivity */}
        <div className="metric-row">
          <div className="metric-info">
            <span className="metric-label">
              <Heart size={18} color="#a5b4fc" />
              Linguistic Objectivity (Low Bias)
            </span>
            <span className="metric-value" style={{ color: getBarColor(objectivityRate) }}>
              {objectivityRate}/100
            </span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${objectivityRate}%`, 
                backgroundColor: getBarColor(objectivityRate) 
              }}
            />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Emotional density: <strong>{bias.emotionalDensity}%</strong>. Subjective generalizations: <strong>{bias.subjectivePhrases}</strong>.
            {bias.score > 40 && " Heavy usage of loaded/emotional adjectives detected."}
          </p>
        </div>

        {/* Web Consensus */}
        <div className="metric-row">
          <div className="metric-info">
            <span className="metric-label">
              <RefreshCw size={18} color="#a5b4fc" />
              Cross-Reference Consensus
            </span>
            <span className="metric-value" style={{ color: getBarColor(consensus.score) }}>
              {consensus.score || 50}/100
            </span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${consensus.score || 50}%`, 
                backgroundColor: getBarColor(consensus.score) 
              }}
            />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {consensus.reason}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
