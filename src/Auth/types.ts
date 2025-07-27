// Export Zod-based types from validation
export type { LoginRequest, SignupRequest, ValidationError, ErrorResponse, CustomerLoginRequest, CustomerSignupRequest, CustomerVerify, CustomerProfileRequest } from './validation';

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

export interface CustomerAuthResponse {
  token: string;
  customer: {
    id: string;
    name: string;
    email: string;
    username: string;
    deviceId: string;
    walletAddress: string;
  };
}

export interface JWTPayload {
  merchantId: string;
  email: string;
  username: string;
  type: string;
}

export interface CustomerJWTPayload {
  customerId: string;
  email: string;
  username: string;
} 