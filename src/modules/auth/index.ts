export { default as authRoutes } from './routes/authRoutes';
export { default as customerRoutes } from '../customer/routes/customerRoutes';
export { authenticateToken, authenticateCustomerToken } from '../shared/middleware/authMiddleware';
export type { LoginRequest, SignupRequest, AuthResponse, CustomerAuthResponse, JWTPayload, CustomerJWTPayload, ValidationError, ErrorResponse } from '../shared/types/types';
export type { AuthenticatedRequest, CustomerAuthenticatedRequest } from '../shared/middleware/authMiddleware';
export { generateToken, generateCustomerToken, verifyToken, verifyCustomerToken, decodeToken } from '../shared/services/jwtService';
export { hashPassword, verifyPassword } from '../shared/services/passwordService';
export { validateRequest, asyncHandler, errorHandler } from '../shared/validation/validationMiddleware';
export { loginSchema, signupSchema, customerLoginSchema, customerSignupSchema, customerVerifyOtpSchema, customerProfileSchema } from '../shared/validation/validation'; 