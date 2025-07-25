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
import { ProfileRequest, verify } from './validation';
const prisma = new PrismaClient();
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      username,
      password
    }: SignupRequest = req.body;
    const existingMerchant = await prisma.merchant.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
    if (existingMerchant) {
      res.status(400).json({ error: 'Merchant already exists with this email, username, or wallet address' });
      return;
    }
   const hashedPassword=await hashPassword(password);  
    await generaotp(req, res);
 
    res.status(200).json({ message: "OTP sent. Please verify to complete registration.",email,hashedPassword,username},);  

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
export const Verify=async(req:Request,res:Response)=>{
  const { code,email,  hashedPassword ,username,
}: verify = req.body;

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
    
    const merchant = await prisma.merchant.create({
      data: {
        name:"",
        email,
        username,
        password: hashedPassword,
        pin: Math.floor(Math.random() * 9000) + 1000,
        type:'General_Store',
        walletAddress:keypair.publicKey.toBase58(),
        iv:iv.toString('hex'),
        Privatekey:encrypted,  
        businessName:"",
        shopAddress:"",
        phoneNumber:"",
        gstin:""
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
export const Profile=async(req:Request,res:Response)=>{
  const {  businessName,
    name,
    shopAddress,
    phoneNumber,
    gstin,username,
    type
} = req.body;
  try{
  
    const merchant = await prisma.merchant.update({
      where:{
        username:username
      },
      data: {
        name,
        type:type as 'General_Store' | 'Restaurant',
        businessName,
        shopAddress,
        phoneNumber,
        gstin
      }
    });
      return res.status(200).json({merchant});}
  catch(e){
      return res.status(400).json({message:e});
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

export const getProductCount = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const count = await prisma.product.count({ where: { merchantId } });
    res.json({ merchantId, productCount: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product count' });
  }
};

// CREATE Product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { merchantId, name, description, price, category, subcategory, stock, isAvailable, isVeg, brand, unit } = req.body;
    const product = await prisma.product.create({
      data: {
        merchantId,
        name,
        description,
        price,
        category,
        subcategory,
        stock,
        isAvailable,
        isVeg,
        brand,
        unit,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// READ all Products for a Merchant
export const getProductsByMerchant = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const products = await prisma.product.findMany({ where: { merchantId } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// READ single Product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// UPDATE Product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const product = await prisma.product.update({ where: { id }, data });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// DELETE Product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
}; 