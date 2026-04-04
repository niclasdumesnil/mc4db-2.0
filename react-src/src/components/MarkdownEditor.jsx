import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Bold, Italic, Link, List, ListOrdered, Heading1, Heading2, Heading3, Quote, Eye, EyeOff, FileSearch } from 'lucide-react';
import MarkdownViewer from './MarkdownViewer';
import '../css/MarkdownEditor.css';

const GAME_SYMBOLS = [
  { key: 'energy',   label: 'Energy',   letter: 'E' },
  { key: 'physical', label: 'Physical', letter: 'P' },
  { key: 'mental',   label: 'Mental',   letter: 'M' },
  { key: 'wild',     label: 'Wild',     letter: 'W' },
  { key: 'unique',   label: 'Unique',   letter: 'U' },
  { key: 'star',     label: 'Star',     letter: 'S' },
  { key: 'per_hero', label: 'Per Hero', letter: 'G' },
  { key: 'boost',    label: 'Boost',    letter: 'B' },
  { key: 'crisis',   label: 'Crisis',   letter: 'C' },
  { key: 'acceleration', label: 'Acceleration', letter: 'A' },
  { key: 'amplify',  label: 'Amplify',  letter: 'F' },
  { key: 'hazard',   label: 'Hazard',   letter: 'H' },
];

export default function MarkdownEditor({ value, onChange, placeholder }) {
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  const [preview, setPreview] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);

  // ── Card autocomplete state ─────────────────────────────
  const [acQuery, setAcQuery] = useState(null);   // null = inactive
  const [acResults, setAcResults] = useState([]);
  const [acLoading, setAcLoading] = useState(false);
  const [acIndex, setAcIndex] = useState(0);
  const [acPos, setAcPos] = useState({ top: 0, left: 0 });
  const acTimerRef = useRef(null);
  const btnSelectRef = useRef(null); // tracks selection range from button click

  // ── Insert formatting helpers ───────────────────────────
  const insertFormatting = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const replacement = prefix + selectedText + suffix;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const insertLineFormatting = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeCursor = value.substring(0, start);
    const lineStart = beforeCursor.lastIndexOf('\n') + 1;
    const replacement = prefix + value.substring(lineStart, end);
    const newValue = value.substring(0, lineStart) + replacement + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const insertAtCursor = (text) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const newValue = value.substring(0, start) + text + value.substring(start);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + text.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  // ── Trigger card autocomplete from button ────────────────
  const triggerCardSearch = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end).trim();

    if (selectedText.length > 0) {
      // Text is selected → use it as search query, keep the selection range
      btnSelectRef.current = { start, end };
      setAcQuery(selectedText);
      searchCards(selectedText);
      computeDropdownPos(textarea, start);
    } else {
      // No selection → insert # at cursor
      btnSelectRef.current = null;
      const before = value.substring(0, start);
      const needsSpace = before.length > 0 && before[before.length - 1] !== '\n' && before[before.length - 1] !== ' ';
      const insert = (needsSpace ? ' ' : '') + '#';
      const newValue = before + insert + value.substring(start);
      onChange(newValue);
      const newCursor = start + insert.length;
      setAcQuery('');
      setAcResults([]);
      computeDropdownPos(textarea, newCursor - 1);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    }
  };

  // ── Symbol insertion ────────────────────────────────────
  const handleSymbol = (sym) => {
    insertAtCursor(`<span class="icon-${sym.key}"></span>`);
    setShowSymbols(false);
  };

  // ── Card autocomplete logic ─────────────────────────────
  const closeAutocomplete = useCallback(() => {
    setAcQuery(null);
    setAcResults([]);
    setAcIndex(0);
    if (acTimerRef.current) clearTimeout(acTimerRef.current);
  }, []);

  const searchCards = useCallback(async (q) => {
    if (!q || q.length < 2) { setAcResults([]); return; }
    setAcLoading(true);
    try {
      const locale = localStorage.getItem('mc_locale') || 'en';
      const res = await fetch(`/api/public/cards/search?name=${encodeURIComponent(q)}&limit=8&locale=${locale}`);
      const data = await res.json();
      setAcResults(data.cards || []);
      setAcIndex(0);
    } catch { setAcResults([]); }
    setAcLoading(false);
  }, []);

  const handleTextareaChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);

    // Detect # autocomplete trigger
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBefore = newVal.substring(0, cursorPos);

    // Find the last # that starts an autocomplete
    // #word (no space after #) = card autocomplete, # space = heading
    const hashMatch = textBefore.match(/#(\w[\w\s\-']*)$/);
    if (hashMatch) {
      const query = hashMatch[1];
      setAcQuery(query);
      // Debounce search
      if (acTimerRef.current) clearTimeout(acTimerRef.current);
      acTimerRef.current = setTimeout(() => searchCards(query), 250);

      // Position dropdown near cursor
      computeDropdownPos(textarea, cursorPos - query.length - 1);
    } else {
      closeAutocomplete();
    }

    // Detect $ symbol trigger
    const dollarMatch = textBefore.match(/\$([a-z_]*)$/);
    if (dollarMatch) {
      const sym = dollarMatch[1];
      if (sym.length > 0) {
        const match = GAME_SYMBOLS.find(s => s.key.startsWith(sym));
        if (match) {
          // Replace $xxx with the icon span
          const start = cursorPos - sym.length - 1;
          const replacement = `<span class="icon-${match.key}"></span>`;
          const finalVal = newVal.substring(0, start) + replacement + newVal.substring(cursorPos);
          onChange(finalVal);
          setTimeout(() => {
            textarea.focus();
            const newCur = start + replacement.length;
            textarea.setSelectionRange(newCur, newCur);
          }, 0);
        }
      }
    }
  };

  const computeDropdownPos = (textarea, charIndex) => {
    // Approximate position from character index
    const text = textarea.value.substring(0, charIndex);
    const lines = text.split('\n');
    const lineNum = lines.length - 1;
    const lineHeight = 21; // approximate
    const top = (lineNum + 1) * lineHeight + 8 - textarea.scrollTop;
    setAcPos({ top: Math.max(top, 20), left: 12 });
  };

  const selectCard = (card) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const link = `[${card.name}](/card/${card.code})`;

    // Case 1: triggered from the Card Link button with selected text
    if (btnSelectRef.current) {
      const { start, end } = btnSelectRef.current;
      const newVal = value.substring(0, start) + link + value.substring(end);
      onChange(newVal);
      closeAutocomplete();
      btnSelectRef.current = null;
      setTimeout(() => {
        textarea.focus();
        const newCur = start + link.length;
        textarea.setSelectionRange(newCur, newCur);
      }, 0);
      return;
    }

    // Case 2: triggered from typing #query
    const cursorPos = textarea.selectionStart;
    const textBefore = value.substring(0, cursorPos);
    const hashMatch = textBefore.match(/#(\w[\w\s\-']*)$/);
    if (hashMatch) {
      const queryWithHash = '#' + hashMatch[1];
      const start = cursorPos - queryWithHash.length;
      const newVal = value.substring(0, start) + link + value.substring(cursorPos);
      onChange(newVal);
      closeAutocomplete();
      setTimeout(() => {
        textarea.focus();
        const newCur = start + link.length;
        textarea.setSelectionRange(newCur, newCur);
      }, 0);
    }
  };

  const handleKeyDown = (e) => {
    if (acQuery !== null && acResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAcIndex(i => Math.min(i + 1, acResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAcIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectCard(acResults[acIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAutocomplete();
      }
    }
  };

  // Close symbol dropdown on outside click
  useEffect(() => {
    if (!showSymbols) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSymbols(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSymbols]);

  // Close autocomplete on outside click
  useEffect(() => {
    if (acQuery === null) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeAutocomplete();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [acQuery, closeAutocomplete]);

  return (
    <div className="markdown-editor-container" ref={containerRef}>
      <div className="markdown-toolbar">
        <button type="button" onClick={() => insertFormatting('**', '**')} className="md-tip-wrap">
          <Bold size={16} /><span className="md-tip">Bold</span>
        </button>
        <button type="button" onClick={() => insertFormatting('*', '*')} className="md-tip-wrap">
          <Italic size={16} /><span className="md-tip">Italic</span>
        </button>
        <button type="button" onClick={() => insertFormatting('[', '](https://)')} className="md-tip-wrap">
          <Link size={16} /><span className="md-tip">Insert link</span>
        </button>

        <span className="markdown-toolbar-sep" />

        <button type="button" onClick={() => insertLineFormatting('- ')} className="md-tip-wrap">
          <List size={16} /><span className="md-tip">Bullet list</span>
        </button>
        <button type="button" onClick={() => insertLineFormatting('1. ')} className="md-tip-wrap">
          <ListOrdered size={16} /><span className="md-tip">Numbered list</span>
        </button>
        <button type="button" onClick={() => insertLineFormatting('> ')} className="md-tip-wrap">
          <Quote size={16} /><span className="md-tip">Blockquote</span>
        </button>

        <span className="markdown-toolbar-sep" />

        <button type="button" onClick={() => insertLineFormatting('# ')} className="md-heading-btn md-tip-wrap">
          <Heading1 size={16} /><span className="md-tip">Heading 1</span>
        </button>
        <button type="button" onClick={() => insertLineFormatting('## ')} className="md-heading-btn md-tip-wrap">
          <Heading2 size={16} /><span className="md-tip">Heading 2</span>
        </button>
        <button type="button" onClick={() => insertLineFormatting('### ')} className="md-heading-btn md-tip-wrap">
          <Heading3 size={16} /><span className="md-tip">Heading 3</span>
        </button>

        <span className="markdown-toolbar-sep" />

        {/* Card link button */}
        <button type="button" onClick={triggerCardSearch} className="md-card-btn md-tip-wrap">
          <FileSearch size={16} /><span className="md-tip">Card link (#)</span>
        </button>

        {/* Game symbol button */}
        <div className="md-symbol-wrapper">
          <button type="button" onClick={() => setShowSymbols(!showSymbols)} className={`md-tip-wrap ${showSymbols ? 'active' : ''}`}>
            <span className="md-symbol-icon">$</span><span className="md-tip">Game symbol</span>
          </button>
          {showSymbols && (
            <div className="md-symbol-dropdown">
              {GAME_SYMBOLS.map(s => (
                <button key={s.key} type="button" className="md-symbol-item" onClick={() => handleSymbol(s)}>
                  <span className={`icon-${s.key} md-symbol-glyph`}></span>
                  <span className="md-symbol-label">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview toggle */}
        <button type="button" onClick={() => setPreview(!preview)} className={`md-preview-btn md-tip-wrap ${preview ? 'active' : ''}`} style={{ marginLeft: 'auto' }}>
          {preview ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{preview ? 'Edit' : 'Preview'}</span>
          <span className="md-tip">{preview ? 'Back to editing' : 'Preview rendered markdown'}</span>
        </button>
      </div>

      {preview ? (
        <div className="markdown-preview-area">
          {value ? <MarkdownViewer content={value} /> : <span className="md-preview-empty">Nothing to preview</span>}
        </div>
      ) : (
        <div className="markdown-textarea-wrapper">
          <textarea
            ref={textareaRef}
            className="markdown-textarea"
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Write a description for your deck... Press # to insert a card name, $ to insert a game symbol.'}
          />
          {/* Card autocomplete dropdown */}
          {acQuery !== null && (acResults.length > 0 || acLoading) && (
            <div className="md-autocomplete" style={{ top: acPos.top }}>
              {acLoading && acResults.length === 0 && <div className="md-ac-loading">Searching...</div>}
              {acResults.map((card, i) => (
                <button
                  key={card.code}
                  type="button"
                  className={`md-ac-item ${i === acIndex ? 'active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); selectCard(card); }}
                  onMouseEnter={() => setAcIndex(i)}
                >
                  <span className="md-ac-name">{card.name}</span>
                  <span className="md-ac-pack">{card.pack_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="markdown-footer">
        Press <kbd>#</kbd> to insert a card name, <kbd>$</kbd> to insert a game symbol.
      </div>
    </div>
  );
}
