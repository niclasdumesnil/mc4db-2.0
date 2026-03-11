import React, { useRef } from 'react';
import { Bold, Italic, Link, List, Heading, ListOrdered } from 'lucide-react';
import '../css/MarkdownEditor.css';

export default function MarkdownEditor({ value, onChange, placeholder }) {
  const textareaRef = useRef(null);

  const insertFormatting = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const replacement = prefix + selectedText + suffix;
    
    // Create new value
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    // After updating the value, restore focus and selection
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
    
    // Find the start of the current line
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

  return (
    <div className="markdown-editor-container">
      <div className="markdown-toolbar">
        <button type="button" onClick={() => insertFormatting('**', '**')} title="Bold">
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => insertFormatting('*', '*')} title="Italic">
          <Italic size={16} />
        </button>
        <button type="button" onClick={() => insertLineFormatting('### ')} title="Heading">
          <Heading size={16} />
        </button>
        <button type="button" onClick={() => insertLineFormatting('- ')} title="Unordered List">
          <List size={16} />
        </button>
        <button type="button" onClick={() => insertLineFormatting('1. ')} title="Ordered List">
          <ListOrdered size={16} />
        </button>
        <button type="button" onClick={() => insertFormatting('[', '](https://)')} title="Link">
          <Link size={16} />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="markdown-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Write a description for your deck...'}
      />
    </div>
  );
}
