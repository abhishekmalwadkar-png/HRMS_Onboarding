// Shared UI building blocks for AutomationEdge HR.
// Design rules: design-system/mangohrms/MASTER.md (UI/UX Pro Max design system + project decisions).
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export const EASE_OUT = [0.16, 1, 0.3, 1];

// Stagger container + item for grids/lists of cards (40ms stagger with orchestrated spring cascade)
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: EASE_OUT },
  },
};

export const staggerTableRow = {
  hidden: { opacity: 0, x: -8, y: 4 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.32, ease: EASE_OUT },
  },
};

export const PAGE_HEADER_SLOT_ID = 'page-header-slot';

// Page title + actions. Rendered into the sticky top bar (Header.jsx) through a portal so pages
// don't spend a separate row on their title; falls back to inline if the slot isn't mounted.
export function PageHeader({ icon, title, description, actions }) {
  const [slot, setSlot] = useState(null);
  // Layout effect: find the slot before the browser paints, so the top bar never flashes empty
  useLayoutEffect(() => {
    setSlot(document.getElementById(PAGE_HEADER_SLOT_ID));
  }, []);

  const content = (
    <div className="page-header">
      <div className="page-header-text">
        <h1 className="page-title">
          {icon && <span className="page-title-icon" aria-hidden="true"><i className={icon}></i></span>}
          <span className="page-title-text">{title}</span>
        </h1>
        {description && <p className="page-description" title={description}>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );

  return slot ? createPortal(content, slot) : null;
}

// Card with optional title row; animates with the surrounding stagger container when `animated`
export function Card({ title, icon, actions, children, className = '', animated = true, ...rest }) {
  const Tag = animated ? motion.section : 'section';
  const motionProps = animated ? { variants: staggerItem } : {};
  return (
    <Tag className={`ui-card ${className}`} {...motionProps} {...rest}>
      {(title || actions) && (
        <div className="ui-card-head">
          {title && (
            <h2 className="ui-card-title">
              {icon && <i className={`${icon} text-accent`} aria-hidden="true"></i>}
              {title}
            </h2>
          )}
          {actions && <div className="ui-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

// Labelled form field with inline error (label is always visible and linked to the control)
export function Field({ id, label, required, error, hint, children, full }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = React.isValidElement(children)
    ? React.cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        className: `${children.props.className || 'form-control'}${error ? ' is-invalid' : ''}`,
      })
    : children;
  return (
    <div className={`field ${full ? 'full-width' : ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="required" aria-hidden="true">*</span>}
      </label>
      {control}
      {error ? (
        <span id={`${id}-error`} className="field-error" role="alert">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

// Inline success / error / info message (used instead of toasts, which are disabled app-wide)
export function StatusBanner({ tone = 'info', title, children, onDismiss }) {
  const icon = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' }[tone];
  return (
    <motion.div
      className={`status-banner status-banner-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
      <div className="status-banner-body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
      {onDismiss && (
        <button type="button" className="status-banner-close" onClick={onDismiss} aria-label="Dismiss message">
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      )}
    </motion.div>
  );
}

// Helpful empty state: icon, message, optional call to action
export function EmptyState({ icon = 'fa-solid fa-inbox', title, children, action }) {
  return (
    <div className="ui-empty">
      <span className="ui-empty-icon" aria-hidden="true"><i className={icon}></i></span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

// Accessible dialog: role="dialog", Escape and backdrop close, focus moves in on open and back on close
export function Modal({ open, onClose, title, subtitle, icon, children, footer, size = 'md' }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  // Held in a ref so an inline onClose from the parent doesn't re-run the focus effect every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    panelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ui-modal-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div
            ref={panelRef}
            className={`ui-modal ui-modal-${size}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: 'spring',
                stiffness: 340,
                damping: 28,
                mass: 0.9,
              },
            }}
            exit={{
              opacity: 0,
              y: 12,
              scale: 0.96,
              transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
            }}
          >
            <div className="ui-modal-head">
              <div className="ui-modal-heading">
                {icon}
                <div>
                  <h2 id={titleId}>{title}</h2>
                  {subtitle && <p>{subtitle}</p>}
                </div>
              </div>
              <button type="button" className="ui-modal-close" onClick={onClose} aria-label="Close dialog">
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
            <div className="ui-modal-body">{children}</div>
            {footer && <div className="ui-modal-foot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Slide-Over Drawer Component with spring animation from right/left edge
export function Drawer({ open, onClose, title, subtitle, icon, children, footer, width = '560px', side = 'right' }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ui-drawer-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 1200,
            display: 'flex',
            justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          <motion.div
            ref={panelRef}
            className="ui-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ x: side === 'right' ? '100%' : '-100%', opacity: 0.7 }}
            animate={{
              x: 0,
              opacity: 1,
              transition: {
                type: 'spring',
                stiffness: 340,
                damping: 32,
                mass: 0.85,
              },
            }}
            exit={{
              x: side === 'right' ? '100%' : '-100%',
              opacity: 0,
              transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
            }}
            style={{
              width: '100%',
              maxWidth: width,
              height: '100%',
              background: 'var(--bg-card)',
              borderLeft: side === 'right' ? '1px solid var(--border-color)' : 'none',
              borderRight: side === 'left' ? '1px solid var(--border-color)' : 'none',
              boxShadow: side === 'right' ? '-10px 0 35px rgba(0, 0, 0, 0.35)' : '10px 0 35px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div className="ui-modal-head" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="ui-modal-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {icon}
                <div>
                  <h2 id={titleId} style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 700 }}>{title}</h2>
                  {subtitle && <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                className="ui-modal-close"
                onClick={onClose}
                aria-label="Close drawer"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
            <div className="ui-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>{children}</div>
            {footer && <div className="ui-modal-foot" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Initial-letter avatar
export function Avatar({ name, size = 40 }) {
  return (
    <span className="ui-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {name ? name.charAt(0).toUpperCase() : '?'}
    </span>
  );
}

// Pagination for client-side paged tables
export function Pagination({ page, totalPages, total, pageSize, onChange, label }) {
  if (!total) return null;
  const start = (page - 1) * pageSize;
  return (
    <nav className="pagination" aria-label={label}>
      <span className="pagination-summary">
        Showing <strong>{start + 1}</strong>–<strong>{Math.min(start + pageSize, total)}</strong> of <strong>{total}</strong>
      </span>
      <div className="pagination-controls">
        <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={`page-btn ${n === page ? 'is-current' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? 'page' : undefined}
          >
            {n}
          </button>
        ))}
        <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </nav>
  );
}

// Shimmering placeholder shown while data loads (keeps the layout shape; static under reduced motion)
export function Skeleton({ width = '3.5rem', height = '1em', className = '' }) {
  return <span className={`ui-skeleton ${className}`} style={{ width, height }} aria-hidden="true" />;
}

// Spotlight border: writes the pointer position into CSS variables on the element itself.
// No React state, so moving the mouse never re-renders the component.
export function trackSpotlight(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
  el.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
}

// Maps an employee status to its badge class
export function statusBadgeClass(status) {
  if (status === 'Approved' || status === 'Completed' || status === 'Verified') return 'badge-approved';
  if (status === 'Pending Review' || status === 'Pending' || status === 'Pending ServiceNow Review') return 'badge-pending';
  return 'badge-draft';
}

// Small labelled stat used inside cards and summaries
export function StatTile({ label, value, note, tone }) {
  return (
    <motion.div className="ui-card kpi-tile" variants={staggerItem}>
      <span className="kpi-label">{label}</span>
      <div className={`kpi-value ${tone ? `tone-${tone}` : ''}`}>{value}</div>
      {note && <span className="kpi-note">{note}</span>}
    </motion.div>
  );
}
