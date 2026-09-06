"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEFAULT_DELAY = 350;

/**
 * Generic debounce primitive. Returns `value` after it has stopped changing
 * for `delay` ms. For search UIs that don't touch the URL (e.g. a dialog
 * that calls a server action directly).
 */
export function useDebouncedValue<T>(value: T, delay: number = DEFAULT_DELAY): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

export interface UseDebouncedSearchParamOptions {
  /** Value of the param as rendered by the server (e.g. filters.search). */
  initialValue: string;
  /** Query-string key. Defaults to "search". */
  key?: string;
  /** Debounce delay in ms. Defaults to 350. */
  delay?: number;
  /** Remove `page` from the URL when the term changes. Defaults to true. */
  resetPage?: boolean;
}

export interface UseDebouncedSearchParamResult {
  /** Controlled input value — always reflects keystrokes immediately. */
  value: string;
  /** onChange handler for <Input>. */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Imperative setter that also (re)schedules the debounce. */
  setValue: (next: string) => void;
  /** Commit immediately, cancelling any pending timer. For <form onSubmit>. */
  flush: () => void;
  /** Cancel pending work and set local state WITHOUT navigating. For clearFilters. */
  reset: (next?: string) => void;
  /** True while a search navigation is in flight. */
  isSearching: boolean;
}

/**
 * Debounced, URL-driven search box for the server-paginated tables
 * (products, stock, product costs, inventory summary).
 *
 * Navigation is only ever scheduled from onChange, never from a
 * useEffect watching `value` — that would re-fire when the server
 * re-renders with the new `initialValue` and risks a navigation loop.
 * The commit itself runs inside a transition + router.replace so the
 * route's loading.tsx never mounts (which would unmount the input and
 * drop focus) and the scroll position never jumps.
 */
export function useDebouncedSearchParam({
  initialValue,
  key = "search",
  delay = DEFAULT_DELAY,
  resetPage = true,
}: UseDebouncedSearchParamOptions): UseDebouncedSearchParamResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValueState] = useState(initialValue);
  const [isSearching, startTransition] = useTransition();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last value this hook itself pushed into the URL. Distinguishes our own
  // round-trip from an external URL change (back/forward, clearFilters).
  const committedRef = useRef(initialValue);

  const commit = useCallback(
    (next: string) => {
      if (next === committedRef.current) return; // no redundant navigation
      committedRef.current = next;

      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set(key, next);
      else params.delete(key);
      if (resetPage) params.delete("page");

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [router, pathname, searchParams, key, resetPage]
  );

  // Always call the *latest* commit closure from the timer, so a debounce
  // started before another filter changed still reads current params.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Scheduled from the event handler, never from an effect on `value` —
  // this is what guarantees no navigation on mount and none on back/forward.
  const schedule = useCallback(
    (next: string) => {
      setValueState(next);
      clearTimer();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        commitRef.current(next);
      }, delay);
    },
    [clearTimer, delay]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => schedule(e.target.value),
    [schedule]
  );

  const flush = useCallback(() => {
    clearTimer();
    commitRef.current(value);
  }, [clearTimer, value]);

  const reset = useCallback(
    (next: string = "") => {
      clearTimer();
      committedRef.current = next;
      setValueState(next);
    },
    [clearTimer]
  );

  // Adopt URL changes we did not cause: browser back/forward, or a
  // router.push from clearFilters. This effect only ever calls setState,
  // never the router, so it cannot loop — and it is a legitimate use of
  // useEffect ("synchronizing with an external system", here the URL),
  // not a derived-state effect the lint rule below is meant to catch.
  useEffect(() => {
    if (timeoutRef.current) return; // user is mid-typing; do not clobber
    if (initialValue === committedRef.current) return; // our own round-trip
    committedRef.current = initialValue;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the external URL, not derived component state
    setValueState(initialValue);
  }, [initialValue]);

  // Cancel a pending commit if the component unmounts.
  useEffect(() => clearTimer, [clearTimer]);

  return { value, onChange, setValue: schedule, flush, reset, isSearching };
}
