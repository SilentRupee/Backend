export { default as authRoutes } from './routes/routes';
export { default as customerRoutes } from './routes/customerRoutes';
export { authenticateToken, authenticateCustomerToken } from './middleware';
export type { LoginRequest, SignupRequest, AuthResponse, CustomerAuthResponse, JWTPayload, CustomerJWTPayload, ValidationError, ErrorResponse } from './types';
export type { AuthenticatedRequest, CustomerAuthenticatedRequest } from './middleware';
export { generateToken, generateCustomerToken, verifyToken, verifyCustomerToken, decodeToken } from './jwt';
export { hashPassword, verifyPassword } from './password';
export { validateRequest, asyncHandler, errorHandler } from './validationMiddleware';
export { loginSchema, signupSchema, customerLoginSchema, customerSignupSchema, customerVerifyOtpSchema, customerProfileSchema } from './validation'; 