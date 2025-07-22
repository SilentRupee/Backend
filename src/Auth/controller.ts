import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from './password';
import { generateToken } from './jwt';
import { LoginRequest, SignupRequest, AuthResponse } from './types';
import { AuthenticatedRequest } from './middleware';
import bcrypt from "bcrypt";
import crypto from "crypto"
import  { Keypair } from "@solana/web3.js"
import { generaotp } from './mailer';
const prisma = new PrismaClient();
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      username,
      walletAddress,
    }: SignupRequest = req.body;
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
    
    await generaotp(req, res);

    res.status(200).json({ message: "OTP sent. Please verify to complete registration." });  

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;
   
    const merchant = await prisma.merchant.findUnique({
      where: { email }
    });

    if (!merchant) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }


    const isPasswordValid = await verifyPassword(password, merchant.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }


    if (!merchant.isActive) {
      res.status(401).json({ error: 'Account is deactivated' });
      return;
    }

 
    const token = generateToken({
      merchantId: merchant.id,
      email: merchant.email,
      username: merchant.username,
      type: merchant.type
    });
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
export const verify=async(req:Request,res:Response)=>{
  const { code, name, email, password ,username,
    businessName,
    shopAddress,
    phoneNumber,
    type,
    walletAddress,
    gstin
  }: SignupRequest = req.body;
  console.log("Received OTP:", code);
  console.log("User data:", { name, email, password });
  if (parseInt(code) === parseInt(req.app.locals.OTP)) {
      req.app.locals.OTP = null;
      req.app.locals.resetSession = true;
      const keypair= Keypair.generate();
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.CRYPTO_SECRET || 'your-secret', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(keypair.secretKey.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex')
  try{
    const hashedPassword = await hashPassword(password);
    const merchant = await prisma.merchant.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        pin: Math.floor(Math.random() * 9000) + 1000,
        type: type as 'Restaurant' | 'General_Store',
        walletAddress,
        iv:iv.toString('hex'),
        Privatekey:encrypted,  
        businessName,
        shopAddress,
        phoneNumber,
        gstin
      }
    });
    const token = generateToken({
      merchantId: merchant.id,
      email: merchant.email,
      username: merchant.username,
      type: merchant.type
    });
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
      return res.status(200).json({token,response});}
  catch(e){
      return res.status(400).json({message:e});
  }
}
}

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