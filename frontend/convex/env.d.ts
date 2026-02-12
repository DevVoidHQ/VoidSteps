// Convex runtime globals
declare global {
  // Vite import.meta.glob support (used by convex-test)
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }

  namespace NodeJS {
    interface ProcessEnv {
      USER_EMAIL?: string;
      USER_PASSWORD?: string;
    }
  }

  var process: {
    env: NodeJS.ProcessEnv;
  };

  function btoa(data: string): string;
  function atob(data: string): string;
}

export {};
