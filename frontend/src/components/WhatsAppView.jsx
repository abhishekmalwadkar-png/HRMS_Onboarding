import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PageHeader, Card, EASE_OUT } from './ui';
import { WHATSAPP_FLOWS } from './whatsappFlows';

// Playback timing (ms at 1x): bots "type" before sending, scaled a little by message length
const USER_DELAY = 900;
const BOT_TYPING_BASE = 700;
const BOT_TYPING_PER_CHAR = 12;
const BOT_TYPING_MAX = 1800;

const messageDelay = (msg) => {
  if (msg.from === 'user') return USER_DELAY;
  const len = (msg.text || msg.card?.title || msg.file?.name || '').length;
  return Math.min(BOT_TYPING_MAX, BOT_TYPING_BASE + len * BOT_TYPING_PER_CHAR);
};

const clock = (i) => `10:${String(2 + i).padStart(2, '0')}`;

function ChatMessage({ msg, index, isLatest }) {
  return (
    <motion.div
      className={`wa-msg wa-msg-${msg.from} ${isLatest ? 'wa-msg-latest' : ''}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      {msg.text && <p>{msg.text}</p>}

      {msg.file && (
        <div className="wa-file">
          <span className="wa-file-icon" aria-hidden="true"><i className="fa-solid fa-file-pdf"></i></span>
          <span className="wa-file-name">
            <strong>{msg.file.name}</strong>
            <small>PDF · {msg.file.size}</small>
          </span>
        </div>
      )}

      {msg.card && (
        <div className="wa-card">
          <strong><i className={`fa-solid ${msg.card.icon}`} aria-hidden="true"></i> {msg.card.title}</strong>
          {msg.card.lines.map((l) => <span key={l}>{l}</span>)}
        </div>
      )}

      <span className="wa-meta">
        {clock(index)}
        {msg.from === 'user' && <i className="fa-solid fa-check-double" aria-label="Read"></i>}
      </span>

      {msg.buttons && (
        <div className="wa-buttons">
          {msg.buttons.map((b) => <span key={b} className="wa-button">{b}</span>)}
        </div>
      )}
    </motion.div>
  );
}

export default function WhatsAppView() {
  const reduceMotion = useReducedMotion();
  const [flowId, setFlowId] = useState(WHATSAPP_FLOWS[0].id);
  const flow = WHATSAPP_FLOWS.find((f) => f.id === flowId);
  const total = flow.messages.length;

  // Autoplay is off when the OS requests reduced motion: the full conversation is shown instead
  const [shown, setShown] = useState(reduceMotion ? total : 0);
  const [playing, setPlaying] = useState(!reduceMotion);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const chatRef = useRef(null);

  const nextMsg = flow.messages[shown];
  const isActive = playing && !hoverPaused && shown < total;
  const isTyping = isActive && nextMsg?.from === 'bot';

  // Playback engine: reveal the next message after its delay
  useEffect(() => {
    if (!isActive) return undefined;
    const t = setTimeout(() => setShown((n) => n + 1), messageDelay(nextMsg) / speed);
    return () => clearTimeout(t);
  }, [isActive, shown, speed, nextMsg]);

  // Stop at the end
  useEffect(() => {
    if (shown >= total) setPlaying(false);
  }, [shown, total]);

  // Follow new messages only while the viewer is at the bottom; if they scrolled up to read,
  // leave their position alone and offer a "New messages" button instead
  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true);
  const BOTTOM_THRESHOLD_PX = 40;
  const AUTO_SCROLL_GRACE_MS = 600;
  const autoScrollAtRef = useRef(0);

  const handleChatScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    // Ignore scroll events produced by our own smooth auto-scroll
    if (Date.now() - autoScrollAtRef.current < AUTO_SCROLL_GRACE_MS) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX;
    atBottomRef.current = near;
    setAtBottom(near);
  };

  const scrollToLatest = (smooth = true) => {
    const el = chatRef.current;
    if (!el) return;
    autoScrollAtRef.current = Date.now();
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
    atBottomRef.current = true;
    setAtBottom(true);
  };

  useEffect(() => {
    if (atBottomRef.current) scrollToLatest();
  }, [shown, isTyping]);

  const selectFlow = (id) => {
    const next = WHATSAPP_FLOWS.find((f) => f.id === id);
    atBottomRef.current = true;
    setAtBottom(true);
    setFlowId(id);
    setShown(reduceMotion ? next.messages.length : 0);
    setPlaying(!reduceMotion);
  };

  const togglePlay = () => {
    if (shown >= total) {
      setShown(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };
  const restart = () => { atBottomRef.current = true; setAtBottom(true); setShown(0); setPlaying(true); };
  const stepBack = () => { setPlaying(false); setShown((n) => Math.max(0, n - 1)); };
  const stepForward = () => { setPlaying(false); setShown((n) => Math.min(total, n + 1)); };

  // Highest backend system reached by the visible messages
  const reachedSystem = useMemo(() => {
    let max = -1;
    flow.messages.slice(0, shown).forEach((m) => {
      if (typeof m.system === 'number') max = Math.max(max, m.system);
    });
    return max;
  }, [flow, shown]);

  const progress = total ? shown / total : 0;
  const finished = shown >= total;

  return (
    <section className="view-section active page wa-page">
      <PageHeader
        icon="fa-brands fa-whatsapp"
        title="WhatsApp discovery"
        description="How employees complete HR tasks on WhatsApp, and what the bot updates behind the scenes."
        actions={
          /* Flow selector lives in the top bar to give the phone the full content height */
          <div className="wa-tabs" role="tablist" aria-label="WhatsApp flows">
            {WHATSAPP_FLOWS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={f.id === flowId}
                aria-label={f.title}
                title={f.title}
                className={`wa-tab ${f.id === flowId ? 'is-active' : ''}`}
                onClick={() => selectFlow(f.id)}
              >
                {f.id === flowId && (
                  <motion.span layoutId="wa-tab-pill" className="wa-tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
                )}
                <i className={`fa-solid ${f.icon}`} aria-hidden="true"></i>
                <span>{f.title}</span>
              </button>
            ))}
          </div>
        }
      />

      <div className="wa-layout">
        {/* Phone "video" */}
        <div className="wa-stage">
          <div
            className="wa-phone"
            onMouseEnter={() => setHoverPaused(true)}
            onMouseLeave={() => setHoverPaused(false)}
          >
            <div className="wa-statusbar" aria-hidden="true">
              <span>9:41</span>
              <span className="wa-island"></span>
              <span className="wa-status-icons">
                <i className="fa-solid fa-signal"></i>
                <i className="fa-solid fa-wifi"></i>
                <i className="fa-solid fa-battery-three-quarters"></i>
              </span>
            </div>
            <div className="wa-header">
              <span className="wa-avatar" aria-hidden="true"><i className="fa-solid fa-robot"></i></span>
              <div>
                <strong>AutomationEdge HR</strong>
                <span>{isTyping ? 'typing…' : 'online'}</span>
              </div>
              <i className="fa-solid fa-video" aria-hidden="true"></i>
              <i className="fa-solid fa-phone" aria-hidden="true"></i>
            </div>

            {/* Scrollable chat (wheel, touch, or Tab then arrow keys); full text is also in the transcript */}
            <div
              className="wa-chat"
              ref={chatRef}
              onScroll={handleChatScroll}
              tabIndex={0}
              role="log"
              aria-live="off"
              aria-label={`${flow.title} chat preview`}
            >
              <div className="wa-day">Today</div>
              <AnimatePresence initial={false}>
                {flow.messages.slice(0, shown).map((m, i) => (
                  <ChatMessage key={`${flowId}-${i}`} msg={m} index={i} isLatest={i === shown - 1 && playing} />
                ))}
              </AnimatePresence>
              {isTyping && (
                <div className="wa-msg wa-msg-bot wa-typing" aria-hidden="true">
                  <span></span><span></span><span></span>
                </div>
              )}
            </div>

            <div className="wa-composer" aria-hidden="true">
              <span><i className="fa-regular fa-face-smile"></i> Message</span>
              <span className="wa-mic"><i className="fa-solid fa-microphone"></i></span>
            </div>

            <AnimatePresence>
              {!atBottom && (
                <motion.button
                  type="button"
                  className="wa-jump"
                  onClick={() => scrollToLatest()}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                >
                  {shown < total || isTyping ? 'New messages' : 'Latest'} <i className="fa-solid fa-arrow-down" aria-hidden="true"></i>
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {hoverPaused && playing && !finished && (
                <motion.span className="wa-hover-pause" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <i className="fa-solid fa-pause" aria-hidden="true"></i> Paused while you read
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Player controls */}
          <div className="wa-player" role="group" aria-label="Playback controls">
            <div
              className="wa-progress"
              role="progressbar"
              aria-label="Conversation progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={shown}
              aria-valuetext={`Message ${shown} of ${total}`}
            >
              <motion.span className="wa-progress-fill" animate={{ scaleX: progress }} transition={{ duration: 0.3 }} style={{ originX: 0 }} />
            </div>
            <div className="wa-player-row">
              <button className="wa-ctrl" onClick={restart} aria-label="Restart">
                <i className="fa-solid fa-rotate-left" aria-hidden="true"></i>
              </button>
              <button className="wa-ctrl" onClick={stepBack} disabled={shown === 0} aria-label="Previous message">
                <i className="fa-solid fa-backward-step" aria-hidden="true"></i>
              </button>
              <button className="wa-ctrl wa-ctrl-main" onClick={togglePlay} aria-label={finished ? 'Replay' : playing ? 'Pause' : 'Play'}>
                <i className={`fa-solid ${finished ? 'fa-rotate-right' : playing ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i>
              </button>
              <button className="wa-ctrl" onClick={stepForward} disabled={finished} aria-label="Next message">
                <i className="fa-solid fa-forward-step" aria-hidden="true"></i>
              </button>
              <button className="wa-ctrl wa-speed" onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))} aria-label={`Playback speed ${speed}x, change speed`}>
                {speed}x
              </button>
              <span className="wa-counter">{shown} / {total}</span>
            </div>
          </div>
        </div>

        {/* Explanation + backend systems */}
        <div className="wa-side">
          <Card animated={false} title={flow.title} icon={`fa-solid ${flow.icon}`}>
            <p className="wa-summary">{flow.summary}</p>
            <p className="wa-persona"><i className="fa-solid fa-user" aria-hidden="true"></i> {flow.persona}</p>

            <h3 className="subsection-title">What happens behind the chat</h3>
            <ol className="wa-systems">
              {flow.systems.map((s, i) => {
                const state = i <= reachedSystem ? 'done' : i === reachedSystem + 1 && isActive ? 'active' : 'waiting';
                return (
                  <li key={s.label} className={`wa-system is-${state}`}>
                    <span className="wa-system-node" aria-hidden="true">
                      <i className={state === 'done' ? 'fa-solid fa-check' : state === 'active' ? 'fa-solid fa-spinner fa-spin' : s.icon}></i>
                    </span>
                    <span className="wa-system-text">
                      <strong>{s.label}</strong>
                      <span>{s.note}</span>
                    </span>
                    <span className={`badge ${state === 'done' ? 'badge-approved' : state === 'active' ? 'badge-pending' : 'badge-draft'}`}>
                      {state === 'done' ? 'Done' : state === 'active' ? 'In progress' : 'Waiting'}
                    </span>
                  </li>
                );
              })}
            </ol>

            <button className="btn btn-ghost btn-sm wa-transcript-toggle" onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript}>
              <i className="fa-solid fa-align-left" aria-hidden="true"></i> {showTranscript ? 'Hide transcript' : 'Show full transcript'}
            </button>
            {showTranscript && (
              <ol className="wa-transcript">
                {flow.messages.map((m, i) => (
                  <li key={i}>
                    <strong>{m.from === 'user' ? 'Employee' : 'HR bot'}:</strong>{' '}
                    {m.text || (m.file && `Sent ${m.file.name}`) || (m.card && `${m.card.title}. ${m.card.lines.join('. ')}`)}
                    {m.buttons && <span className="cell-sub"> Options: {m.buttons.join(', ')}</span>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
