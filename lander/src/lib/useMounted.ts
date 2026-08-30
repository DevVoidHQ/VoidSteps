import { useEffect, useState } from "react";

/**
 * False on the server and on the first client render, true afterwards.
 *
 * Scroll-driven styles are computed from a scroll position the server cannot
 * know, so applying them during hydration makes the first client render
 * disagree with the server HTML. Gate them on this instead.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
