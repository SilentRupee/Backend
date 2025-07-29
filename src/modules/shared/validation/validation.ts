import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long')
});

// Customer login validation schema
export const customerLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long')
});

export const profileSchema=z.object({
  name: z
  .string()
  .min(1, 'Name is required')
  .min(2, 'Name must be at least 2 characters long')
  .max(50, 'Name must be less than 50 characters'),
code:z.string().min(6,"Otp has to be valid"),  
email: z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format'),
username: z
  .string()
  .min(1, 'Username is required')
  .min(3, 'Username must be at least 3 characters long')
  .max(20, 'Username must be less than 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
password: z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password must be less than 100 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .min(2, 'Business name must be at least 2 characters long')
    .max(100, 'Business name must be less than 100 characters'),
  shopAddress: z
    .string()
    .min(1, 'Shop address is required')
    .min(10, 'Shop address must be at least 10 characters long')
    .max(200, 'Shop address must be less than 200 characters'),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[+]?[\d\s\-\(\)]{10,15}$/, 'Invalid phone number format'),
  type: z
    .enum(['Restaurant', 'General_Store'], {
      errorMap: () => ({ message: 'Type must be either Restaurant or General_Store' })
    }),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.literal(''))
})

// Customer profile schema
export const customerProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required')
});

export const purchaseSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be positive')
});

export type PurchaseRequest = z.infer<typeof purchaseSchema>;

export const verifyotp = z.object({
  code: z
    .string()
    .min(6, 'OTP is required'),
    email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters long')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    hashedPassword :z.string()

  
});

// Customer verify OTP schema
export const customerVerifyOtpSchema = z.object({
  code: z
    .string()
    .min(6, 'OTP is required'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters long')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  hashedPassword: z.string()
});

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters long')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
});

// Customer signup schema
export const customerSignupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters long')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type SignupRequest = z.infer<typeof signupSchema>;
export type ProfileRequest=z.infer<typeof profileSchema>;
export type verify=z.infer<typeof verifyotp>;

// Customer types
export type CustomerLoginRequest = z.infer<typeof customerLoginSchema>;
export type CustomerSignupRequest = z.infer<typeof customerSignupSchema>;
export type CustomerProfileRequest = z.infer<typeof customerProfileSchema>;
export type CustomerVerify = z.infer<typeof customerVerifyOtpSchema>;

export const productSchema = z.object({
  merchantId:z.string(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be a positive number'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  stock: z.number().int().min(0, 'Stock must be a non-negative integer').default(0),
  isAvailable: z.boolean().default(true),
  isVeg: z.boolean().optional(),
  brand: z.string().optional(),
  unit: z.string().optional(),
});

export type ProductRequest = z.infer<typeof productSchema>;

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  details?: ValidationError[];
} 