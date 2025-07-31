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
      username: customer.username,
      role:"Customer"
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

// Encrypt the raw 64-byte secret key, NOT the base58 string.
const encryptedBuffer = Buffer.concat([
    cipher.update(keypair.secretKey),
    cipher.final(),
]);

const encryptedPrivateKey = encryptedBuffer.toString('hex');

    
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
          vaultuser: userVaultPda.toString(),
          pin: Math.floor(Math.random() * 9000) + 1000,
          deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          walletAddress: keypair.publicKey.toBase58(),
          iv: iv.toString('hex'),
          Privatekey: encryptedPrivateKey
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
        username: customer.username,
        role:"Customer"
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