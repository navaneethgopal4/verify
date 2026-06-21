import React, { useEffect, useState } from 'react';

const Gauge = ({ score = 0, tier = 'neutral' }) => {
  const [offset, setOffset] = useState(502.65);
  const radius = 80;
  const circumference = 2 * Math.PI * radius; // 502.65

  useEffect(() => {
    // Delay slightly to trigger transition animation
    const timer = setTimeout(() => {
      const progressOffset = circumference - (score / 100) * circumference;
      setOffset(progressOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  // Determine colors based on tier
  let strokeColor = '#6366f1'; // Default Indigo
  let glowColor = 'rgba(99, 102, 241, 0.4)';

  if (tier === 'verified') {
    strokeColor = '#10b981'; // Emerald
    glowColor = 'rgba(16, 185, 129, 0.4)';
  } else if (tier === 'mixed') {
    strokeColor = '#f59e0b'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.4)';
  } else if (tier === 'unreliable') {
    strokeColor = '#ef4444'; // Red
    glowColor = 'rgba(239, 68, 68, 0.4)';
  } else if (tier === 'satire') {
    strokeColor = '#8b5cf6'; // Purple
    glowColor = 'rgba(139, 92, 246, 0.4)';
  }

  const getTierLabel = () => {
    switch (tier) {
      case 'verified': return 'Verified / Reliable';
      case 'mixed': return 'Mixed / Unverified';
      case 'unreliable': return 'Unreliable / Fake';
      case 'satire': return 'Satirical News';
      default: return 'Pending Analysis';
    }
  };

  return (
    <div className="gauge-card glass-card">
      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: 'var(--text-secondary)' }}>
        Accuracy Rating
      </h3>
      
      <div className="gauge-svg-container">
        <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            className="gauge-bg"
            cx="100"
            cy="100"
            r={radius}
          />
          <circle
            className="gauge-fill"
            cx="100"
            cy="100"
            r={radius}
            stroke={strokeColor}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              '--glow-color': glowColor,
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </svg>
        
        <div className="gauge-center-text">
          <span className="gauge-score" style={{ color: strokeColor }}>{score}</span>
          <span className="gauge-max">/ 100</span>
        </div>
      </div>

      <div className={`badge ${tier}`}>
        {getTierLabel()}
      </div>
    </div>
  );
};

export default Gauge;
