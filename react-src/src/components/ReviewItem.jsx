import React, { useState } from 'react';
import { Heart, Edit2, MessageSquare, CornerDownRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from './MarkdownEditor';
import { RepBadge } from './DeckCard';

export default function ReviewItem({ review, currentUser, onUpdate, onVote, onComment }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(review.text_md || '');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState('');

  const isCreator = currentUser && currentUser.id === review.user_id;
  const canVote = currentUser && !isCreator;

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateString));
  };

  const handleSave = async () => {
    await onUpdate(review.id, editContent);
    setEditing(false);
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    await onComment(review.id, commentText);
    setCommentText('');
    setShowCommentBox(false);
  };

  return (
    <div className="review-item">
      <div className="review-item__header">
        <div className="review-item__author" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="review-item__author-name">by {review.username}</span>
          <RepBadge reputation={review.reputation} />
        </div>
        
        <div className="review-item__actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
           <button 
              className={`review-item__vote-btn ${review.user_voted ? 'voted' : ''}`}
              onClick={() => onVote(review.id)}
              disabled={!currentUser || isCreator}
              title={isCreator ? "You cannot vote on your own review" : (currentUser ? "Vote for this review" : "Log in to vote")}
           >
             <Heart size={14} fill={review.user_voted ? "currentColor" : "none"} />
             <span>{review.nb_votes || 0}</span>
           </button>
           
           {isCreator && (
             <button 
               className="review-action-btn" 
               onClick={() => setEditing(!editing)}
               title="Edit review"
             >
               ✏️ Edit
             </button>
           )}
        </div>
      </div>
      
      <div className="review-item__content">
        {editing ? (
           <div className="review-item__editor" style={{ marginBottom: 12 }}>
             <MarkdownEditor 
               value={editContent} 
               onChange={setEditContent} 
               placeholder="Edit your review... Markdown is supported."
             />
             <div className="review-item__editor-actions">
               <button onClick={handleSave} className="btn-save">Save</button>
               <button onClick={() => setEditing(false)} className="btn-cancel">Cancel</button>
             </div>
           </div>
        ) : (
           <div className="review-item__body">
             <ReactMarkdown>
               {review.text_md}
             </ReactMarkdown>
           </div>
        )}
      </div>
      
      <div className="review-item__footer">
        <span className="review-item__date">
           {formatDate(review.date_creation)}
        </span>
      </div>

      <div className="review-item__comments">
         {review.comments && review.comments.map(c => (
            <div key={c.id} className="review-comment">
              <CornerDownRight size={14} className="review-comment__icon" />
              <div className="review-comment__content">
                <span className="review-comment__text">{c.text}</span>
                <span className="review-comment__meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  by {c.username}
                  <RepBadge reputation={c.reputation} />
                  · {formatDate(c.date_creation)}
                </span>
              </div>
            </div>
         ))}
         
         {currentUser && (
            <div className="review-item__add-comment">
              {showCommentBox ? (
                 <div className="review-item__comment-editor">
                   <textarea 
                     value={commentText}
                     onChange={e => setCommentText(e.target.value)}
                     placeholder="Write your comment..."
                     rows={2}
                   />
                   <div className="review-item__editor-actions">
                     <button onClick={submitComment} className="btn-save">Post Comment</button>
                     <button onClick={() => { setShowCommentBox(false); setCommentText(''); }} className="btn-cancel">Cancel</button>
                   </div>
                 </div>
              ) : (
                 <button className="review-action-btn" onClick={() => setShowCommentBox(true)}>
                   💬 Add a comment
                 </button>
              )}
            </div>
         )}
      </div>
    </div>
  );
}
