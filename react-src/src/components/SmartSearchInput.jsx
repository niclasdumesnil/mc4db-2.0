import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Common helper to parse query string into tokens
export function parseQueryTokens(query) {
  // Regex matches quoted strings OR whitespace OR special chars (!, |, &) OR regular words
  const regex = /("[^"]*")|(\s+)|([!|&])|(ou\b|or\b|et\b|and\b|not\b|sauf\b)|([^\s!|&"]+)/gi;
  const tokens = [];
  let match;
  while ((match = regex.exec(query)) !== null) {
    const text = match[0];
    let type = 'text';
    if (match[1]) type = 'quote';
    else if (match[2]) type = 'space';
    else if (match[3] || match[4]) {
      const lower = text.toLowerCase();
      if (lower === '!' || lower === 'not' || lower === 'sauf') type = 'not';
      else if (lower === '|' || lower === 'ou' || lower === 'or') type = 'or';
      else if (lower === '&' || lower === 'et' || lower === 'and') type = 'and';
      else type = 'text'; // fail-safe
    }
    tokens.push({ text, type });
  }
  return tokens;
}

// Helper to remove accents for robust frontend filtering
function normalizeStr(str) {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Compile tokens into a structured abstract evaluation tree for frontend filtering
export function evaluateQueryMatch(query, cardFieldText) {
  const needle = query.trim();
  if (!needle) return true;
  if (!cardFieldText) return false;
  
  const target = normalizeStr(cardFieldText);
  const needleNorm = normalizeStr(needle);
  
  // Quick pre-check if there are no operators
  if (!/[!|&"]|ou\b|or\b|et\b|and\b|not\b|sauf\b/i.test(needle)) {
    return target.includes(needleNorm);
  }

  const tokens = parseQueryTokens(query);
  
  // Transform to normalized logic groups
  // We use a simple OR(AND(terms)) structure
  const orGroups = [];
  let currentAndGroup = [];
  let isNot = false;

  for (const token of tokens) {
    if (token.type === 'space') continue;
    if (token.type === 'or') {
      if (currentAndGroup.length > 0) {
        orGroups.push(currentAndGroup);
        currentAndGroup = [];
      }
      isNot = false;
    } else if (token.type === 'and') {
      // implicit, no action needed
    } else if (token.type === 'not') {
      isNot = true;
    } else { // text or quote
      let val = token.text;
      if (token.type === 'quote') val = val.slice(1, -1);
      // fallback for prefix `-` doing NOT functionality implicitly
      if (val.startsWith('-')) {
        isNot = true;
        val = val.substring(1);
      }
      if (val.trim() !== '') {
        currentAndGroup.push({ match: normalizeStr(val), isNot });
      }
      isNot = false; // reset for next term
    }
  }
  if (currentAndGroup.length > 0) orGroups.push(currentAndGroup);

  // if nothing was parsed but the field wasn't empty, just treat as true or exact match fallback
  if (orGroups.length === 0) return target.includes(needleNorm);

  // Evaluate OR groups -> returns true if AT LEAST ONE group is true
  return orGroups.some(group => {
    // For an AND group to be true, ALL terms must be true
    return group.every(term => {
      const contains = target.includes(term.match);
      return term.isNot ? !contains : contains;
    });
  });
}

// React Component
export default function SmartSearchInput({ value, onChange, placeholder, className = '', style = {} }) {
  const [hover, setHover] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef(null);
  const backdropRef = useRef(null);
  const hideTimer = useRef(null);
  const debounceTimer = useRef(null);

  // Sync external changes (e.g., when clicking the global clear 'x' button)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange(val);
    }, 300); // 300ms debounce
  };

  const tokens = parseQueryTokens(localValue);
  const isFr = (localStorage.getItem('mc_locale') || window.__MC_LOCALE__) === 'fr';

  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (inputRef.current) {
      const rect = inputRef.current.parentElement.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      
      // Calculate right-bounded position to avoid viewport edge overflowing
      let safeLeft = rect.left + scrollX;
      if (safeLeft + 320 > window.innerWidth) {
        safeLeft = window.innerWidth - 330;
      }

      setTooltipPos({
        top: rect.bottom + scrollY,
        left: Math.max(10, safeLeft),
      });
    }
    setHover(true);
  };

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => setHover(false), 200);
  };

  const renderHighlights = () => {
    return tokens.map((t, i) => {
      if (t.type === 'space') return <span key={i}>{t.text}</span>;
      if (t.type === 'not') return <strong key={i} style={{ color: '#ef4444' }}>{t.text}</strong>;
      if (t.type === 'or') return <strong key={i} style={{ color: '#3b82f6' }}>{t.text}</strong>;
      if (t.type === 'and') return <strong key={i} style={{ color: '#10b981' }}>{t.text}</strong>;
      if (t.type === 'quote') return <span key={i} style={{ color: '#f59e0b' }}>{t.text}</span>;
      return <span key={i} style={{ color: '#e2e8f0' }}>{t.text}</span>;
    });
  };

  return (
    <div 
      className="smart-search-wrapper" 
      style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', ...style }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={backdropRef}
        className={className + " smart-search-backdrop"} 
        style={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, bottom: 0, 
          pointerEvents: 'none', 
          whiteSpace: 'pre', 
          overflow: 'hidden',
          color: 'transparent', 
          zIndex: 1,
          borderColor: 'transparent',
          background: 'transparent',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center'
        }}
        aria-hidden="true"
      >
        {renderHighlights()}
      </div>

      <input
        ref={inputRef}
        className={className}
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleInputChange}
        onScroll={e => {
          if (backdropRef.current) backdropRef.current.scrollLeft = e.target.scrollLeft;
        }}
        autoComplete="off"
        style={{
          position: 'relative',
          color: localValue ? 'transparent' : undefined, 
          caretColor: '#fff',
          zIndex: 2,
          background: 'transparent'
        }}
      />

      {/* Tooltip on Hover */}
      {hover && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'absolute',
          top: tooltipPos.top + 6,
          left: tooltipPos.left,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 999999,
          fontSize: '0.8rem',
          color: '#cbd5e1',
          width: 'max-content',
          maxWidth: '320px',
          pointerEvents: 'none' // Don't block clicking things below
        }}>
          <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '0.85rem' }}>
            {isFr ? 'Syntaxe de recherche' : 'Search Syntax'}
          </h4>
          <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.5' }}>
            <li><strong style={{ color: '#ef4444' }}>!</strong> ou <strong style={{ color: '#ef4444' }}>{isFr ? 'SAUF' : 'NOT'}</strong> : {isFr ? 'Exclure le mot' : 'Exclude a word'} (ex. <code style={{background:'#0f172a', padding:'2px 4px'}}>!Avenger</code>)</li>
            <li><strong style={{ color: '#3b82f6' }}>|</strong> ou <strong style={{ color: '#3b82f6' }}>{isFr ? 'OU' : 'OR'}</strong> : {isFr ? 'Doit contenir au moins un mot' : 'Match either word'} (ex. <code style={{background:'#0f172a', padding:'2px 4px'}}>A {isFr ? 'OU' : 'OR'} B</code>)</li>
            <li><strong style={{ color: '#10b981' }}>&</strong> ou <strong style={{ color: '#10b981' }}>{isFr ? 'ET' : 'AND'}</strong> : {isFr ? 'Exige les deux mots (l\'espace fonctionne aussi)' : 'Match both (Space also means AND)'}</li>
            <li><span style={{ color: '#f59e0b' }}>"guillemets"</span> : {isFr ? 'Rechercher la phrase exacte' : 'Search exact phrases'}</li>
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
