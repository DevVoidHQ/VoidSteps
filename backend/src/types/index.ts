export interface JwtPayload {
  email: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    email: string;
  };
}

export interface ErrorResponse {
  error: string;
}
