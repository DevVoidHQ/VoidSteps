declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      MONGODB_URL: string;
      JWT_SECRET: string;
      USER_EMAIL: string;
      USER_PASSWORD: string;
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}

export {};
