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
    const accountsToInitialize = {
      user: keypair.publicKey,
      mint: mint,
      userAta: user_ata,
      owner: wallet.payer.publicKey,
      vaultUser: userVaultPda,
      vaultAta: vault_ata,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  };
     
        console.log("--- DEBUG: ACCOUNTS BEING SENT ---");
console.log("User:", accountsToInitialize.user.toBase58());
console.log("Mint:", accountsToInitialize.mint.toBase58()); // <-- THIS IS THE IMPORTANT ONE
console.log("Owner:", accountsToInitialize.owner.toBase58());
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
    const key = crypto.scryptSync(process.env.CRYPTO_SECRET || 'your-secret', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(keypair.secretKey.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
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

// Get Wallet Transaction History
export const getWalletHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userType } = req.params; 

    if (!userId || !userType) {
      res.status(400).json({ error: 'User ID and user type are required' });
      return;
    }

    // Get user details and PDA
    let user;
    let userPda;

    if (userType === 'merchant') {
      user = await prisma.merchant.findUnique({
        where: { id: userId }
      });
    } else if (userType === 'customer') {
      user = await prisma.customer.findUnique({
        where: { id: userId }
      });
    } else {
      res.status(400).json({ error: 'Invalid user type. Must be "merchant" or "customer"' });
      return;
    }

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

   
    const userPublicKey = new PublicKey(user.walletAddress);
    const pda = new PublicKey(user.pda)

    try {
  
      const signatures = await connection.getSignaturesForAddress(pda, { limit: 50 });
      
      const transactionHistory = [];

      for (const sig of signatures) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (tx && tx.meta) {
            const preBalances = tx.meta.preTokenBalances || [];
            const postBalances = tx.meta.postTokenBalances || [];

            // Find transfers to our PDA
            for (const postBalance of postBalances) {
              if (postBalance.owner === pda.toBase58()) {
                // This PDA received tokens in this transaction
                const preBalance = preBalances.find((pb: any) => 
                  pb.accountIndex === postBalance.accountIndex
                );

                if (preBalance) {
                  const amountReceived = (postBalance.uiTokenAmount.uiAmount || 0) - (preBalance.uiTokenAmount.uiAmount || 0);
                  
                  if (amountReceived > 0) {
                    // Find the sender's PDA
                    const senderPda = await findSenderPda(tx, pda.toBase58());
                    
                    if (senderPda) {
                      // Check if sender is in our database
                      const senderInfo = await findUserByPda(senderPda);
                      
                      transactionHistory.push({
                        type: 'received',
                        amount: amountReceived,
                        sender: senderInfo || 'External Wallet',
                        timestamp: tx.blockTime,
                        signature: sig.signature
                      });
                    }
                  }
                }
              }
            }

            // Find transfers from our PDA
            for (const preBalance of preBalances) {
              if (preBalance.owner === pda.toBase58()) {
                const postBalance = postBalances.find((pb: any) => 
                  pb.accountIndex === preBalance.accountIndex
                );

                if (postBalance) {
                  const amountSent = (preBalance.uiTokenAmount.uiAmount || 0) - (postBalance.uiTokenAmount.uiAmount || 0);
                  
                  if (amountSent > 0) {
                    // Find the receiver's PDA
                    const receiverPda = await findReceiverPda(tx, pda.toBase58());
                    
                    if (receiverPda) {
                      // Check if receiver is in our database
                      const receiverInfo = await findUserByPda(receiverPda);
                      
                      transactionHistory.push({
                        type: 'sent',
                        amount: amountSent,
                        receiver: receiverInfo || 'External Wallet',
                        timestamp: tx.blockTime,
                        signature: sig.signature
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (txError) {
          console.error('Error processing transaction:', sig.signature, txError);
          // Continue with next transaction
        }
      }

      res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          walletAddress: user.walletAddress,
          pda: pda.toBase58()
        },
        transactionHistory
      });

    } catch (solanaError) {
      console.error('Solana connection error:', solanaError);
      res.status(500).json({ error: 'Failed to fetch transaction history' });
    }

  } catch (error) {
    console.error('Wallet history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to find sender's PDA from transaction
async function findSenderPda(tx: any, receiverPda: string): Promise<string | null> {
  try {
    const preBalances = tx.meta.preTokenBalances || [];
    const postBalances = tx.meta.postTokenBalances || [];

    for (const postBalance of postBalances) {
      if (postBalance.owner === receiverPda) {
        const preBalance = preBalances.find((pb: any) => 
          pb.accountIndex === postBalance.accountIndex
        );

        if (preBalance) {
          const amountReceived = (postBalance.uiTokenAmount.uiAmount || 0) - (preBalance.uiTokenAmount.uiAmount || 0);
          
          if (amountReceived > 0) {
            // Find the account that sent tokens
            for (const preBal of preBalances) {
              if (preBal.owner !== receiverPda) {
                const postBal = postBalances.find((pb: any) => 
                  pb.accountIndex === preBal.accountIndex
                );

                if (postBal) {
                  const amountSent = (preBal.uiTokenAmount.uiAmount || 0) - (postBal.uiTokenAmount.uiAmount || 0);
                  
                  if (amountSent > 0 && Math.abs(amountSent - amountReceived) < 0.000001) {
                    // This is likely the sender
                    return preBal.owner;
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding sender PDA:', error);
  }
  
  return null;
}

// Helper function to find receiver's PDA from transaction
async function findReceiverPda(tx: any, senderPda: string): Promise<string | null> {
  try {
    const preBalances = tx.meta.preTokenBalances || [];
    const postBalances = tx.meta.postTokenBalances || [];

    for (const preBalance of preBalances) {
      if (preBalance.owner === senderPda) {
        const postBalance = postBalances.find((pb: any) => 
          pb.accountIndex === preBalance.accountIndex
        );

        if (postBalance) {
          const amountSent = (preBalance.uiTokenAmount.uiAmount || 0) - (postBalance.uiTokenAmount.uiAmount || 0);
          
          if (amountSent > 0) {
            // Find the account that received tokens
            for (const postBal of postBalances) {
              if (postBal.owner !== senderPda) {
                const preBal = preBalances.find((pb: any) => 
                  pb.accountIndex === postBal.accountIndex
                );

                if (preBal) {
                  const amountReceived = (postBal.uiTokenAmount.uiAmount || 0) - (preBal.uiTokenAmount.uiAmount || 0);
                  
                  if (amountReceived > 0 && Math.abs(amountReceived - amountSent) < 0.000001) {
                    // This is likely the receiver
                    return postBal.owner;
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding receiver PDA:', error);
  }
  
  return null;
}

// Helper function to find user by PDA
async function findUserByPda(pda: string): Promise<string | null> {
  try {
    // Check merchants
    const merchant = await prisma.merchant.findFirst({
      where: { pda: pda },
      select: { username: true }
    });

    if (merchant) {
      return merchant.username;
    }

    // Check customers
    const customer = await prisma.customer.findFirst({
      where: { pda: pda },
      select: { username: true }
    });

    if (customer) {
      return customer.username;
    }

    return null;
  } catch (error) {
    console.error('Error finding user by PDA:', error);
    return null;
  }
}

export const purchaseProduct = async (req: CustomerAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log("chec");
    const customerId = req.customer?.customerId;
    const { productId, quantity } = req.body;
    console.log("chec",customerId);

    if (!customerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!quantity || quantity <= 0) {
      res.status(400).json({ error: 'Invalid quantity' });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        merchant: true
      }
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Check stock availability
    if (product.stock < quantity) {
      res.status(400).json({ error: 'Insufficient stock' });
      return;
    }

    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }


 
    // 1. Calculate total amount in INR. Assuming `product.price` is stored in INR.
    const totalAmountInr = product.price * quantity;

    // 2. Get the current USD to INR exchange rate.
    // In a real app, you should use a reliable API for this.
    // For this example, let's use a realistic rate. (e.g., 1 USD = 83.5 INR)
    const usdToInrRate = 83.5; // IMPORTANT: Replace with a live exchange rate API call

    // 3. Convert the INR total to USD.
    const totalAmountInUsd = totalAmountInr / usdToInrRate;

    // 4. Convert the USD amount to the smallest unit for USDC (which has 6 decimals).
    const totalAmountInUsdcLamports = new anchor.BN(totalAmountInUsd * 1000000);
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('your-secret', 'salt', 32);

      const customerIv = Buffer.from(customer.iv, 'hex');
      const customerCipher = crypto.createDecipheriv(algorithm, key, customerIv);
    const decryptedBuffer = Buffer.concat([
        customerCipher.update(customer.Privatekey, 'hex'), 
        customerCipher.final(),
    ])
      const customerKeypair = Keypair.fromSecretKey(decryptedBuffer);
      const merchant = await prisma.merchant.findUnique({
        where: { id: product.merchantId }
      });
      
      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      const merchantIv = Buffer.from(merchant.iv, 'hex');
      const merchantCipher = crypto.createDecipheriv(algorithm, key, merchantIv);
      let merchantDecrypted = merchantCipher.update(merchant.Privatekey, 'hex', 'utf8');
      merchantDecrypted += merchantCipher.final('utf8');
      const merchantKeypair = Keypair.fromSecretKey(bs58.decode(merchantDecrypted));
      const mint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
      const customerAta = await getAssociatedTokenAddress(mint, customerKeypair.publicKey, false);
      const merchantAta = await getAssociatedTokenAddress(mint, merchantKeypair.publicKey, false)
      const tx = await program.methods
        .tranfer(new anchor.BN(totalAmountInUsdcLamports)) 
        .accountsStrict({
          user: customerKeypair.publicKey,
          taker: merchantKeypair.publicKey,
          mint: mint,
          userAta: customerAta,
          vaultUser:anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("user"), customerKeypair.publicKey.toBuffer()],
            program.programId
          )[0],
          vaultAta: await getAssociatedTokenAddress(mint, await anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("user"), customerKeypair.publicKey.toBuffer()],
            program.programId
          )[0], true),
          vaultSecond: await anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("user"), merchantKeypair.publicKey.toBuffer()],
            program.programId
          )[0],
          vaultSecondAta: await getAssociatedTokenAddress(mint, await anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("user"), merchantKeypair.publicKey.toBuffer()],
            program.programId
          )[0], true),
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        })
        .signers([customerKeypair])
        .rpc();

      console.log('Transfer transaction:', tx);
      await prisma.product.update({
        where: { id: productId },
        data: {
          stock: product.stock - quantity
        }
      });
      res.status(200).json({
        message: 'Purchase successful',
        transactionHash: tx,
        product: {
          id: product.id,
          name: product.name,
          quantity: quantity,
          totalAmount: totalAmountInUsdcLamports
        }
      });
    } catch (contractError) {
      console.error('Contract error:', contractError);
      res.status(500).json({ 
        error: 'Transaction failed', 
        details: contractError 
      });
    }

  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 