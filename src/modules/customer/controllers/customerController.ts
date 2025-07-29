import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../../shared/services/passwordService';
import { generateToken, generateCustomerToken } from '../../shared/services/jwtService';
import { LoginRequest, SignupRequest, AuthResponse, CustomerAuthResponse, CustomerLoginRequest, CustomerSignupRequest, CustomerVerify, CustomerProfileRequest } from '../../shared/types/types';
import { AuthenticatedRequest, CustomerAuthenticatedRequest } from '../../shared/middleware/authMiddleware';
import bcrypt from "bcrypt";
import crypto from "crypto"
import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import { generaotp } from '../../shared/services/mailerService';
import { ProductRequest, ProfileRequest, verify } from '../../shared/validation/validation';
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { TransactionLoyalityPrgram } from '../../../idl/transaction_loyality_prgram'
import { Program } from '@coral-xyz/anchor';
import dotenv from 'dotenv';
import idl from '../../../idl/transaction_loyality_prgram.json';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
dotenv.config();

const prisma = new PrismaClient();
if(!process.env.RPC_URL){
  throw new Error("ERROR: PROGRAM_ID environment variable not set. Please check your .env file.");

}
const RPC_URL = process.env.RPC_URL!;
const secret =  bs58.decode("3xRxq7tnww8wmfR95Zyt7JjQGdRnFMRiXJycfJrLaCreDhxBPUFMESDKPR5SvBBbq9KR2n7eu1xTwF5tziSiw4LJ") // Assuming the secret is the array from the JSON file
const serverKeypair = Keypair.fromSecretKey(secret);
const connection = new Connection(RPC_URL, "confirmed");
const wallet = new anchor.Wallet(serverKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
})
const program = new Program<TransactionLoyalityPrgram>(
  idl as TransactionLoyalityPrgram, 
  provider
);
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
    const [userVaultPda, userVaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), keypair.publicKey.toBuffer()],
      program.programId
    );
    const mint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    const user_ata = await getAssociatedTokenAddress(mint, keypair.publicKey, false);
    const vault_ata = await getAssociatedTokenAddress(mint, userVaultPda, true);
   
     

const tx = await program.methods
.initialize()
.accountsStrict({
  user: keypair.publicKey,
  mint: mint,
  userAta: user_ata,
  owner:wallet.payer.publicKey,
  vaultUser: userVaultPda,
  vaultAta: vault_ata,
  systemProgram: anchor.web3.SystemProgram.programId,
  tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
})
.signers([keypair,wallet.payer])
.rpc();
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
            pda: vault_ata.toString(),
            businessName:"",
            shopAddress:"",
            phoneNumber:"",
            gstin:""
          }
          
        });
        console.log(tx);
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


export const createProduct = async (req: Request, res: Response) => {
  try {
    const { merchantId, name, description, price, category, subcategory, stock, isAvailable, isVeg, brand, unit }:ProductRequest = req.body;
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

// Customer Authentication Functions
export const customerSignup = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      username,
      password
    }: CustomerSignupRequest = req.body;
    
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
    
    if (existingCustomer) {
      res.status(400).json({ error: 'Customer already exists with this email or username' });
      return;
    }
    
    const hashedPassword = await hashPassword(password);
    await generaotp(req, res);
 
    res.status(200).json({ 
      message: "OTP sent. Please verify to complete registration.",
      email,
      hashedPassword,
      username
    });

  } catch (error) {
    console.error('Customer signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const customerLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: CustomerLoginRequest = req.body;
   
    const customer = await prisma.customer.findUnique({
      where: { email }
    });

    if (!customer) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await verifyPassword(password, customer.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateCustomerToken({
      customerId: customer.id,
      email: customer.email,
      username: customer.username
    });
    
    const response: CustomerAuthResponse = {
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        username: customer.username,
        deviceId: customer.deviceId,
        walletAddress: customer.walletAddress
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const customerVerify = async (req: Request, res: Response): Promise<void> => {
  const { code, email, hashedPassword, username }: CustomerVerify = req.body;

  if (parseInt(code) === parseInt(req.app.locals.OTP)) {
    req.app.locals.OTP = null;
    req.app.locals.resetSession = true;
    
    const keypair = Keypair.generate();
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('your-secret', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encryptedBuffer = Buffer.concat([
      cipher.update(keypair.secretKey), // Pass the buffer
      cipher.final(),
  ]);
  const encrypted = encryptedBuffer.toString('hex');;
  const first = bs58.encode(keypair.secretKey);
  console.log("Original (bs58):", first);
  const ivFromHex = iv.toString('hex');
  const customerIv = Buffer.from(ivFromHex, 'hex');
  const customerCipher = crypto.createDecipheriv(algorithm, key, customerIv);
const decryptedBuffer = Buffer.concat([
    customerCipher.update(encrypted, 'hex'), // Specify input format
    customerCipher.final(),
])
const customerKeypair = Keypair.fromSecretKey(decryptedBuffer);

// Encode the reconstructed key in the same format (bs58) for comparison
const second = bs58.encode(customerKeypair.secretKey);

    console.log("seconde",second);
    if(first==second){
      console.log(true);
    }else{
      console.log(false);
    }
    try {
      const [userVaultPda, userVaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user"), keypair.publicKey.toBuffer()],
        program.programId
      );
            const mint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
      const user_ata = await getAssociatedTokenAddress(mint, keypair.publicKey, false);
      const vault_ata = await getAssociatedTokenAddress(mint, userVaultPda, true);
      const customer = await prisma.customer.create({
        data: {
          name: "",
          email,
          username,
          password: hashedPassword,
          pda:vault_ata.toString(),
          pin: Math.floor(Math.random() * 9000) + 1000,
          deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          walletAddress: keypair.publicKey.toBase58(),
          iv: iv.toString('hex'),
          Privatekey: encrypted
        }
      });
    
    
        const tx = await program.methods
          .initialize()
          .accountsStrict({
            user: keypair.publicKey,
            mint: mint,
            userAta: user_ata,
            vaultUser: userVaultPda,
            owner:wallet.payer.publicKey,
            vaultAta: vault_ata,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          })
          .signers([keypair])
          .rpc();
          console.log(tx);

   
      
      const token = generateCustomerToken({
        customerId: customer.id,
        email: customer.email,
        username: customer.username
      });
      
      const response: CustomerAuthResponse = {
        token,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          username: customer.username,
          deviceId: customer.deviceId,
          walletAddress: customer.walletAddress
        }
      };
      
      res.status(200).json({ token, response });
    } catch (e) {
      res.status(400).json({ message: e });
    }
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
};



export const customerProfile = async (req: Request, res: Response): Promise<void> => {
  const { name, username } = req.body;
  
  try {
    const customer = await prisma.customer.update({
      where: {
        username: username
      },
      data: {
        name
      }
    });
    
    res.status(200).json({ customer });
  } catch (e) {
    res.status(400).json({ message: e });
  }
};

export const getCustomerProfile = async (req: CustomerAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.customer?.customerId;

    if (!customerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        deviceId: true,
        walletAddress: true,
        createdAt: true
      }
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({ customer });
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 