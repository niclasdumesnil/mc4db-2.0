import React, { useEffect } from 'react';
import '../css/ModalDialog.css';

export default function ModalDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  children, 
  confirmText = "OK", 
  cancelText = "Cancel", 
  showCancel = true, 
  isDestructive = false 
}) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mc-modal-overlay" onClick={onClose}>
      <div className="mc-modal-box" onClick={e => e.stopPropagation()}>
        <div className="mc-modal-header">
           <div className="mc-modal-title">
              <img src="/react/images/logo-light.png" alt="MC4DB Logo" className="mc-modal-logo light-mode-logo" />
              <img src="/react/images/logo-dark.png" alt="MC4DB Logo" className="mc-modal-logo dark-mode-logo" />
              {title && <span style={{ marginLeft: '12px' }}>{title}</span>}
           </div>
        </div>
        <div className="mc-modal-body">
           {children}
        </div>
        <div className="mc-modal-footer">
          {onConfirm && (
            <button className={`mc-modal-btn mc-modal-btn--confirm ${isDestructive ? 'mc-modal-btn--destructive' : ''}`} onClick={onConfirm}>
              {confirmText}
            </button>
          )}
          {showCancel && (
            <button className="mc-modal-btn mc-modal-btn--cancel" onClick={onClose}>
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
