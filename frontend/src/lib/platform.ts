/**
 * Thin seam over the things that differ between the browser build used for
 * development and the packaged desktop app.
 *
 * Kept deliberately small and dependency-free: Tauri's JS APIs are reached
 * through the injected global rather than an npm package, so the browser build
 * needs no extra install and nothing has to be stubbed in tests.
 */

interface TauriInternals {
  invoke?: (cmd: string, args?: unknown) => Promise<unknown>;
}

function internals(): TauriInternals | undefined {
  return (globalThis as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
}

/** True when running inside the packaged desktop app rather than a browser. */
export function isDesktop(): boolean {
  return internals()?.invoke !== undefined;
}

/**
 * Open a URL in the user's own browser or mail client.
 *
 * In a desktop shell, assigning to `window.location` would navigate the app's
 * own webview and there is no back button to recover with, so external links
 * must go through the OS handler.
 */
export async function openExternal(url: string): Promise<void> {
  const invoke = internals()?.invoke;
  if (!invoke) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  await invoke('plugin:opener|open_url', { url });
}
