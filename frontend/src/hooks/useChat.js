// ─────────────────────────────────────────────────────────────
// src/hooks/useChat.js
// Custom hook for the chat flow: intent → RFM segment
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { chatWithAI } from '../api/client';

/**
 * Manages the chat state: message history, segment data, loading, errors.
 *
 * Usage:
 *   const { messages, segment, isLoading, error, sendMessage } = useChat();
 */
export default function useChat() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'ai',
      content: 'Hi! I\'m your AI campaign assistant. Tell me which customers you want to reach — describe them in plain English.',
      timestamp: new Date(),
    },
  ]);
  const [segment, setSegment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    setError(null);

    // Add user message to history
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Call backend /api/chat
      const data = await chatWithAI(text.trim());

      // Build AI response message
      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: data.reasoning || `Found segment: ${data.segment_name}`,
        segment: data,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
      setSegment(data);
    } catch (err) {
      setError(err.message || 'Failed to analyze your request. Please try again.');
      const errMsg = {
        id: `err-${Date.now()}`,
        role: 'ai',
        content: `Sorry, I couldn't process that. ${err.message}`,
        isError: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const resetChat = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'ai',
      content: 'Hi! I\'m your AI campaign assistant. Tell me which customers you want to reach.',
      timestamp: new Date(),
    }]);
    setSegment(null);
    setError(null);
  }, []);

  return { messages, segment, isLoading, error, sendMessage, resetChat };
}
