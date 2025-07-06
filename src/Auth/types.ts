// Export Zod-based types from validation
export type { LoginRequest, SignupRequest, ValidationError, ErrorResponse } from './validation';

export interface AuthResponse {
  token: string;
  merchant: {
    id: string;
    name: string;
    email: string;
    username: string;
    businessName: string;
    type: string;
    isActive: boolean;
    isVerified: boolean;
  };
}

export interface JWTPayload {
  merchantId: string;
  email: string;
  username: string;
  type: string;
} 