// ─────────────────────────────────────────────────────────────
// src/components/Chat/ChatBubbles.jsx
// Message history display — user messages vs AI responses
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

/**
 * @param {Object} props
 * @param {Array} props.messages - [{ id, role: 'user'|'ai', content, isError? }]
 * @param {boolean} props.isLoading - Show typing indicator for AI
 */
export default function ChatBubbles({ messages, isLoading, children }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages, loading, or children changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, children]);

  return (
    <div className="chat-messages">
      {messages.map((msg) => (
        <div key={msg.id} className={`bubble-row ${msg.role}`}>
          {/* Avatar */}
          <div className={`bubble-avatar ${msg.role}`}>
            {msg.role === 'ai' ? '✦' : '⦿'}
          </div>

          {/* Bubble */}
          <div
            className={`bubble ${msg.role} ${msg.isError ? 'error' : ''}`}
            style={msg.isError ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' } : {}}
          >
            <div className="bubble-label">
              {msg.role === 'ai' ? 'Xeno AI' : 'You'}
            </div>
            {msg.content}
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {isLoading && (
        <div className="bubble-row ai">
          <div className="bubble-avatar ai">✦</div>
          <div className="bubble ai">
            <div className="bubble-label">Xeno AI</div>
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        </div>
      )}

      {/* Contextual panels (Segment Preview, Message Variants, Dashboard, etc.) */}
      {children}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
