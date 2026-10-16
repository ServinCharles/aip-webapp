import { useEffect, useRef, useState } from 'react';
import './ChatWidget.css';

// Chat assistant for the AIP page. Talks to the aip-chat-api microservice via /api/chat.
// data-testid values are the contract with the test framework (Agentic-qa-demo).

const API_BASE = import.meta.env.VITE_API_BASE || '';

const WELCOME = {
  role: 'bot',
  text: "Hi, I'm the AIP assistant. Ask me about Agreements in Principle, credit checks or how much you could borrow.",
  handover: false
};

const STARTER_SUGGESTIONS = [
  'What is an AIP?',
  'Does it affect my credit score?',
  'How much can I borrow?',
  'Speak to an advisor'
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [suggestions, setSuggestions] = useState(STARTER_SUGGESTIONS);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send(text) {
    const message = text.trim();
    if (!message || sending) return;

    setMessages((current) => [...current, { role: 'user', text: message }]);
    setDraft('');
    setSending(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      setMessages((current) => [
        ...current,
        { role: 'bot', text: body.reply, handover: body.handover, intent: body.intent }
      ]);
      if (Array.isArray(body.suggestions)) setSuggestions(body.suggestions);
    } catch (e) {
      console.error('Chat service error:', e);
      setMessages((current) => [
        ...current,
        { role: 'bot', text: "Sorry, the assistant isn't available right now. Please try again later.", error: true }
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      {open && (
        <section
          className="chat-panel"
          role="dialog"
          aria-label="AIP assistant"
          data-testid="chat-panel"
        >
          <header className="chat-header">
            <span>AIP assistant</span>
            <button
              type="button"
              className="chat-close"
              aria-label="Close chat"
              data-testid="chat-close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <ol className="chat-messages" ref={listRef} aria-live="polite" data-testid="chat-messages">
            {messages.map((m, i) => (
              <li
                key={i}
                className={`chat-message chat-${m.role}${m.error ? ' chat-error' : ''}`}
                data-testid="chat-message"
                data-role={m.role}
                data-intent={m.intent}
              >
                {m.text}
                {m.handover && (
                  <span className="chat-handover" data-testid="chat-handover">
                    ↪ Passed to a colleague
                  </span>
                )}
              </li>
            ))}
            {sending && (
              <li className="chat-message chat-bot chat-typing" data-testid="chat-typing">
                Typing…
              </li>
            )}
          </ol>

          <div className="chat-suggestions">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="chat-suggestion"
                data-testid="chat-suggestion"
                onClick={() => send(s)}
                disabled={sending}
              >
                {s}
              </button>
            ))}
          </div>

          <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <label htmlFor="chat-input" className="visually-hidden">Your question</label>
            <input
              id="chat-input"
              ref={inputRef}
              data-testid="chat-input"
              placeholder="Ask a question…"
              maxLength={500}
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" data-testid="chat-send" disabled={sending || !draft.trim()}>
              Send
            </button>
          </form>

          <p className="chat-disclaimer">
            Demo assistant. General guidance, not financial advice. Please don't share account, card or National Insurance numbers.
          </p>
        </section>
      )}

      <button
        type="button"
        className="chat-launcher"
        aria-expanded={open}
        aria-controls="chat-input"
        data-testid="chat-open"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Close' : 'Ask us'}
      </button>
    </div>
  );
}
