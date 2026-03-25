import React, { useState, useEffect } from 'react';
import MarkdownViewer from '@components/MarkdownViewer';
import MarkdownEditor from '@components/MarkdownEditor';
import { RepBadge } from '@components/DeckCard';

export default function DeckComments({ deckId, isOwner, updateCommentCount }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user'));
      return u && (u.id || u.userId);
    } catch { return null; }
  };
  const uid = currentUserId();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/decks/${deckId}/comments`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setComments(data.data);
        }
        else setError(typeof data.error === 'string' ? data.error : (data.error?.message || 'Failed to load comments'));
        setLoading(false);
      })
      .catch(err => {
        setError('Network error');
        setLoading(false);
      });
  }, [deckId]);

  const [isWriting, setIsWriting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim() || !uid) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/decks/${deckId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, text_md: newComment })
      });
      const data = await res.json();
      if (data.ok) {
        setComments(prev => [...prev, data.data]);
        setNewComment('');
        setIsWriting(false);
        if (updateCommentCount) updateCommentCount();
      } else {
        alert(data.error || 'Failed to post comment');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="deck-description-container deck-comments-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><div style={{ color: 'var(--st-title, #fff)' }}>Loading comments...</div></div>;
  if (error) return <div className="deck-description-container deck-comments-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><div style={{ color: 'var(--st-text-muted, #8a99af)' }}>{error}</div></div>;

  return (
    <div className="deck-description-container deck-comments-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid var(--st-border)', paddingBottom: '12px', color: 'var(--st-title, #fff)' }}>
        Comments ({comments.length})
      </h3>
      
      <div style={{ flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        {comments.map(c => (
          <div key={c.id} style={{
            background: 'var(--st-surface-3, rgba(255, 255, 255, 0.05))',
            border: '1px solid var(--st-border, rgba(255,255,255,0.1))',
            borderRadius: '8px', 
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--st-title, #fff)' }}>{c.author_name}</span>
              <RepBadge reputation={c.author_reputation} />
              <span style={{ fontSize: '0.85em', color: 'var(--st-text-muted, #8a99af)', marginLeft: 'auto' }}>
                {new Date(c.date_creation).toLocaleDateString()}
              </span>
            </div>
            <MarkdownViewer content={c.text_md} />
          </div>
        ))}
      </div>

      {uid ? (
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--st-border)', paddingTop: '16px' }}>
          {!isWriting ? (
            <button className="review-action-btn" onClick={() => setIsWriting(true)}>💬 Add a comment</button>
          ) : (
            <>
              <MarkdownEditor value={newComment} onChange={setNewComment} placeholder="Write a comment..." />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '8px' }}>
                <button 
                  className="review-action-btn review-action-btn--primary" 
                  onClick={handleSubmit} 
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
                <button 
                  className="review-action-btn" 
                  onClick={() => { setIsWriting(false); setNewComment(''); }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--st-border)', paddingTop: '16px', color: 'var(--st-text-muted, #8a99af)', textAlign: 'center' }}>
          Please log in to add a comment.
        </div>
      )}
    </div>
  );
}
