"use client";

import { useCallback, useSyncExternalStore } from 'react';

const TAB_EVENT = 'urltabchange';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(TAB_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(TAB_EVENT, onChange);
  };
}

/**
 * Keeps a screen's active tab in the URL (`?tab=walk-in-pos`) so a reload,
 * a shared link or the browser Back button restores the same tab.
 *
 * `tabs` maps each tab value to its URL slug. The first entry is the default
 * tab and is kept out of the URL to keep the base route clean.
 * The server snapshot is the default tab, so there is no hydration mismatch.
 */
export function useUrlTab<T extends string>(
  tabs: Record<T, string>,
  param = 'tab',
): [T, (next: T) => void] {
  const entries = Object.entries(tabs) as [T, string][];
  const defaultTab = entries[0][0];

  const getSnapshot = (): T => {
    const slug = new URLSearchParams(window.location.search).get(param);
    const match = entries.find(([, s]) => s === slug);
    return match ? match[0] : defaultTab;
  };

  const tab = useSyncExternalStore(subscribe, getSnapshot, () => defaultTab);

  const setTab = useCallback(
    (next: T) => {
      const url = new URL(window.location.href);
      if (next === defaultTab) url.searchParams.delete(param);
      else url.searchParams.set(param, tabs[next]);
      if (url.href !== window.location.href) {
        window.history.pushState(null, '', url);
        window.dispatchEvent(new Event(TAB_EVENT));
      }
    },
    // `tabs` is a module-level constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultTab, param],
  );

  return [tab, setTab];
}
