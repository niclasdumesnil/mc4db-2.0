import React from 'react';
import ReactMarkdown from 'react-markdown';
import '../css/MarkdownViewer.css';

export default function MarkdownViewer({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-viewer">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
