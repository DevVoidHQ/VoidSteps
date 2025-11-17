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
}

export {};
