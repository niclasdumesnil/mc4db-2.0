import React from 'react';

export default function PageFooter() {
  const containerStyle = {
    width: '100%',
    // pull the footer up so it visually sticks to the bottom edge of the panel
    marginTop: '-12px',
    paddingTop: '0px',
    paddingBottom: '10px',
    display: 'flex',
    justifyContent: 'center',
    boxSizing: 'border-box'
  };
  const shieldStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: '#ffffff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: '14px 14px',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    boxShadow: '0 1px 0 rgba(2,6,23,0.04)',
    width: '100%',
    maxWidth: '100%'
  };
  const svgStyle = { width: 18, height: 18, display: 'block' };

  return (
    <div style={containerStyle} className="mc-page-footer-react">
      <div style={{ width: '100%' }}>
        <div style={shieldStyle} className="mc-shield-react">
          <img src="/bundles/app/css/shield.svg" alt="shield" style={{width:18,height:18,display:'block'}} />
          <span>S . H . I . E . L . D . &nbsp; DATA ACCESS</span>
        </div>
      </div>
    </div>
  );
}
