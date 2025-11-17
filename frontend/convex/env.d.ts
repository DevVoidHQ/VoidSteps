// Convex runtime globals
declare global {
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
