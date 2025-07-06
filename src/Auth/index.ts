export { default as authRoutes } from './routes';
export { authenticateToken } from './middleware';
export type { LoginRequest, SignupRequest, AuthResponse, JWTPayload, ValidationError, ErrorResponse } from './types';
export type { AuthenticatedRequest } from './middleware';
export { generateToken, verifyToken, decodeToken } from './jwt';
export { hashPassword, verifyPassword } from './password';
export { validateRequest, asyncHandler, errorHandler } from './validationMiddleware';
export { loginSchema, signupSchema } from './validation'; 