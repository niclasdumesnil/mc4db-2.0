import React, { useEffect, useState } from 'react';
import ReviewItem from './ReviewItem';
import MarkdownEditor from './MarkdownEditor';
import '../css/ReviewPanel.css';
import { PenTool } from 'lucide-react';

export default function ReviewPanel({ cardId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReviewText, setNewReviewText] = useState('');
  
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user'));
      if (u) setCurrentUser(u);
    } catch(e) {}
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const userIdParam = currentUser ? `?user_id=${currentUser.id}` : '';
      const r = await fetch(`/api/public/reviews/${cardId}${userIdParam}`, {
         headers: currentUser && currentUser.token ? { 'Authorization': `Bearer ${currentUser.token}` } : {}
      });
      if (!r.ok) throw new Error('Failed to fetch reviews');
      const data = await r.json();
      setReviews(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cardId) fetchReviews();
  }, [cardId, currentUser]);

  const handleUpdateReview = async (id, text_md) => {
    if (!currentUser) return;
    try {
      const r = await fetch(`/api/public/reviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ user_id: currentUser.id, text_md, text_html: text_md })
      });
      if (r.ok) {
        fetchReviews();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReview = async () => {
    if (!currentUser || !newReviewText.trim()) return;
    try {
      const r = await fetch(`/api/public/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ card_id: cardId, user_id: currentUser.id, text_md: newReviewText, text_html: newReviewText })
      });
      if (r.ok) {
        setNewReviewText('');
        setShowAddReview(false);
        fetchReviews();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleComment = async (reviewId, text) => {
    if (!currentUser) return;
    try {
      const r = await fetch(`/api/public/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ user_id: currentUser.id, text })
      });
      if (r.ok) {
         fetchReviews();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVote = async (reviewId) => {
    if (!currentUser) return;
    try {
      const r = await fetch(`/api/public/reviews/${reviewId}/vote`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${currentUser.token}`
         },
         body: JSON.stringify({ user_id: currentUser.id })
      });
      if (r.ok) {
         fetchReviews();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const userHasReviewed = currentUser && reviews.some(r => r.user_id === currentUser.id);

  return (
    <div className="review-panel">
      <div className="review-panel__header">
        <h2><PenTool size={18} /> Reviews</h2>
        {currentUser && !userHasReviewed && !showAddReview && !loading && (
          <button className="review-action-btn" onClick={() => setShowAddReview(true)}>
            📝 Write a review
          </button>
        )}
      </div>

      {showAddReview && (
        <div className="review-panel__editor">
          <MarkdownEditor 
            value={newReviewText} 
            onChange={setNewReviewText} 
            placeholder="Write your review here... Markdown is supported."
          />
          <div className="review-panel__editor-actions">
            <button className="btn-save" onClick={handleAddReview}>Submit Review</button>
            <button className="btn-cancel" onClick={() => setShowAddReview(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="review-panel__list">
        {loading ? (
          <div className="review-panel__empty">Loading reviews...</div>
        ) : error ? (
          <div className="review-panel__empty" style={{ color: 'var(--st-danger)' }}>Error: {error}</div>
        ) : reviews.length === 0 ? (
          <div className="review-panel__empty" style={{ textAlign: 'center', padding: '30px 0' }}>
            {!showAddReview && !currentUser && (
              <span>No reviews yet. Log in to be the first to review this card!</span>
            )}
            {!showAddReview && currentUser && (
              <span>No reviews yet. Be the first to share your thoughts!</span>
            )}
          </div>
        ) : (
          reviews.map(review => (
             <ReviewItem 
                key={review.id} 
                review={review} 
                currentUser={currentUser}
                onUpdate={handleUpdateReview}
                onVote={handleVote}
                onComment={handleComment}
             />
          ))
        )}
      </div>
    </div>
  );
}
