// ─────────────────────────────────────────────────────────────
// src/components/Chat/ChatInput.jsx
// Chat input field with Send button and Ctrl+Enter shortcut
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';

/**
 * @param {Object} props
 * @param {Function} props.onSend - Called with the message text
 * @param {boolean} props.disabled - Disable input during API calls
 * @param {string} props.placeholder - Custom placeholder text
 */
export default function ChatInput({ onSend, disabled = false, placeholder }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    // Send on Enter (without Shift); Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-wrapper">
      <div className="chat-input-box">
        <textarea
          ref={textareaRef}
          id="chat-input"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Describe the customers you want to reach...'}
          disabled={disabled}
          aria-label="Chat message input"
        />
        <button
          className="btn-icon"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          aria-label="Send message"
          title="Send (Enter)"
        >
          {disabled ? (
            <div className="spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
      <p className="chat-input-hint">
        Press <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for new line
      </p>
    </div>
  );
}
