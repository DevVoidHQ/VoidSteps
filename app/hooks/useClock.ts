import { useSyncExternalStore } from "react";

function createClock(interval: number) {
  let now = Date.now();
  let timer: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();
  const tick = () => {
    now = Date.now();
    for (const listener of listeners) listener();
  };
  return {
    read: () => now,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1) {
        timer = setInterval(tick, interval);
        document.addEventListener("visibilitychange", tick);
        tick();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          clearInterval(timer);
          document.removeEventListener("visibilitychange", tick);
        }
      };
    },
  };
}
const clocks = { 1000: createClock(1000), 60000: createClock(60000) };

/** A shared clock keeps long-lived views current without reading time in render. */
export function useClock(interval: 1000 | 60000 = 60000): number {
  const clock = clocks[interval];
  return useSyncExternalStore(clock.subscribe, clock.read, clock.read);
}
