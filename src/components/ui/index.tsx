"use client";

import React, { useEffect, useId, useRef } from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: React.Ref<HTMLButtonElement>;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'custom';
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
};

/** Existing class-based buttons retain their colors and event/form behavior. */
export function Button({ className = '', variant, loading = false, disabled, leadingIcon, trailingIcon, children, ...props }: ButtonProps) {
  return <button {...props} disabled={disabled || loading} aria-busy={loading || undefined} data-variant={variant ?? (className ? 'custom' : 'primary')} className={`ui-button ${className}`}>
    {loading ? <span role="status" aria-label="Loading" className="inline-block size-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : leadingIcon}
    {children}{trailingIcon}
  </button>;
}

export function Card({ className = '', interactive = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div {...props} data-interactive={interactive} className={`ui-card ${className}`} />;
}

const STATUS_TONES: Record<string, string> = {
  COMPLETED: 'success', SETTLED: 'success', PAID: 'success', VERIFIED: 'success', APPROVED: 'success', ACTIVE: 'success',
  REQUESTED: 'neutral', PENDING: 'warning', SCHEDULED: 'info', ASSIGNED: 'info', ON_THE_WAY: 'info', ARRIVED: 'info', IN_PROGRESS: 'info',
  CANCELLED: 'error', FAILED: 'error', REJECTED: 'error', INACTIVE: 'neutral',
  IN_MAINTENANCE: 'warning', PENDING_REVIEW: 'warning', UNDER_REVIEW: 'warning',
  OPEN: 'warning', RESOLVED: 'success', CLOSED: 'neutral', DISPATCHED: 'info', RECEIVED: 'success',
};

export function StatusBadge({ status, children, className = '' }: { status: string; children?: React.ReactNode; className?: string }) {
  return <span className={`ui-badge ${className}`} data-tone={STATUS_TONES[status.toUpperCase()] ?? 'neutral'}>{children ?? status.replaceAll('_', ' ')}</span>;
}

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} aria-hidden="true" className={`ui-skeleton ${className}`} />;
}

/** Modal content keeps its existing layout; trap focus and restore it on close. */
export function DialogSurface({ children, className = '', label, onClose, ...props }: React.HTMLAttributes<HTMLDivElement> & { label: string; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = ref.current;
    const selector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>(selector) ?? []).filter(el => el.getClientRects().length > 0);
    (controls()[0] ?? panel)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeRef.current) { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) { event.preventDefault(); panel?.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    panel?.addEventListener('keydown', keydown);
    return () => { panel?.removeEventListener('keydown', keydown); document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div {...props} ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`ui-dialog-panel ${className}`}>
    <span id={titleId} className="sr-only">{label}</span>{children}
  </div>;
}
