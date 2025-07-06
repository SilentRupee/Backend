import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from './password';
import { generateToken } from './jwt';
import { LoginRequest, SignupRequest, AuthResponse } from './types';
import { AuthenticatedRequest } from './middleware';

const prisma = new PrismaClient();

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      username,
      password,
      businessName,
      shopAddress,
      phoneNumber,
      type,
      walletAddress,
      gstin
    }: SignupRequest = req.body;

    // Check if merchant already exists
    const existingMerchant = await prisma.merchant.findFirst({
      where: {
        OR: [
          { email },
          { username },
          { walletAddress }
        ]
      }
    });

    if (existingMerchant) {
      res.status(400).json({ error: 'Merchant already exists with this email, username, or wallet address' });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create merchant
    const merchant = await prisma.merchant.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        pin: Math.floor(Math.random() * 9000) + 1000,
        type: type as 'Restaurant' | 'General_Store',
        walletAddress,
        businessName,
        shopAddress,
        phoneNumber,
        gstin
      }
    });

    // Generate JWT token
    const token = generateToken({
      merchantId: merchant.id,
      email: merchant.email,
      username: merchant.username,
      type: merchant.type
    });

    // Prepare response
    const response: AuthResponse = {
      token,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        username: merchant.username,
        businessName: merchant.businessName,
        type: merchant.type,
        isActive: merchant.isActive,
        isVerified: merchant.isVerified
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Find merchant
    const merchant = await prisma.merchant.findUnique({
      where: { email }
    });

    if (!merchant) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, merchant.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if merchant is active
    if (!merchant.isActive) {
      res.status(401).json({ error: 'Account is deactivated' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      merchantId: merchant.id,
      email: merchant.email,
      username: merchant.username,
      type: merchant.type
    });

    // Prepare response
    const response: AuthResponse = {
      token,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        username: merchant.username,
        businessName: merchant.businessName,
        type: merchant.type,
        isActive: merchant.isActive,
        isVerified: merchant.isVerified
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant?.merchantId;

    if (!merchantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        businessName: true,
        shopAddress: true,
        phoneNumber: true,
        gstin: true,
        type: true,
        isActive: true,
        isVerified: true,
        createdAt: true
      }
    });

    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    res.json({ merchant });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 