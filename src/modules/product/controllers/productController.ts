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
import QRCode from 'qrcode';
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
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
}; async function getUsdcToInrRate(): Promise<number> {
  try {
    // In a real app, you would fetch from an API like CoinGecko, CoinMarketCap, etc.
    // Example:
    // const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=inr');
    // return response.data['usd-coin'].inr;
    
    // Using a static rate for this example.
    console.log("Using static exchange rate for USDC to INR.");
    return 83.60; // Example: 1 USDC = ₹83.60 INR
  } catch (error) {
    console.error("Failed to fetch exchange rate, using default.", error);
    return 83.60; // Return a fallback rate on error
  }
}


function getBalanceChanges(tx: any): Map<string, number> {
  const changes = new Map<string, number>();
  const pre = tx.meta?.preTokenBalances || [];
  const post = tx.meta?.postTokenBalances || [];
  
  const allAccountIndices = new Set([
    ...pre.map((b: any) => b.accountIndex),
    ...post.map((b: any) => b.accountIndex)
  ]);
  console.log(allAccountIndices);

  for (const index of allAccountIndices) {
    const preBalance = pre.find((b: any) => b.accountIndex === index);
    const postBalance = post.find((b: any) => b.accountIndex === index);
    
    const owner = postBalance?.owner || preBalance?.owner;
    if (!owner) continue;

    const preAmount = preBalance?.uiTokenAmount?.uiAmount || 0;
    const postAmount = postBalance?.uiTokenAmount?.uiAmount || 0;
    const netChange = postAmount - preAmount;
      
    if (netChange !== 0) {
      const currentChange = changes.get(owner) || 0;
      changes.set(owner, currentChange + netChange);
   
    }
  }
  console.log(changes);
  return changes;
}
async function findSenderPda(changes: Map<string, number>, receiverVaultPda: string): Promise<string | null> {
  const amountReceived = changes.get(receiverVaultPda) || 0;
  if (amountReceived <= 0) return null;

  for (const [owner, netChange] of changes.entries()) {
    // Find an owner who is NOT the receiver and whose balance decreased by a matching amount.
    if (owner !== receiverVaultPda && Math.abs(netChange + amountReceived) < 0.000001) {
      return owner;
    }
  }
  return null;
}
async function findReceiverPda(changes: Map<string, number>, senderVaultPda: string): Promise<string | null> {
  const amountSent = changes.get(senderVaultPda) || 0;
  if (amountSent >= 0) return null;

  for (const [owner, netChange] of changes.entries()) {
  
    if (owner !== senderVaultPda && Math.abs(netChange + amountSent) < 0.000001) {
      return owner;
    }
  }
  return null;
}




export const getWalletHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userType } = req.params;

    let user;
    if (userType === 'merchant') {
      user = await prisma.merchant.findUnique({ where: { id: userId } });
    } else if (userType === 'customer') {
      user = await prisma.customer.findUnique({ where: { id: userId } });
    } else {
      res.status(400).json({ error: 'Invalid user type. Must be "merchant" or "customer".' });
      return;
    }

    // Validate that both the PDA and the vault address exist
    if (!user || !user.pda || !user.vaultuser) {
      res.status(404).json({ error: 'User, PDA, or user vault not found.' });
      return;
    }

    const userPdaAddress = user.pda;
    const userVaultAddress = user.vaultuser; // The token account owned by the PDA

    try {
      const usdcToInrRate = await getUsdcToInrRate();
      // Fetch transaction signatures for the PDA
      const signatures = await connection.getSignaturesForAddress(new PublicKey(userPdaAddress), { limit: 50 });
      const transactionHistory = [];

      for (const sig of signatures) {
        if (sig.err) continue;

        try {
          const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
          if (!tx || !tx.meta) continue;

          // This function gets token balance changes for all accounts in the transaction
          const changes = getBalanceChanges(tx);
          
          // Find the net change for the user's TOKEN ACCOUNT (vaultuser)
          const netChange = changes.get(userVaultAddress) || 0;

          // Skip transactions that didn't affect the user's token balance
          if (Math.abs(netChange) < 0.000001) {
            continue;
          }
          
          const type = netChange > 0 ? "Receiver" : "Sender";
          const amount = Math.abs(netChange);

          // Find the counterparty's address and name
          let counterpartyName = "External Wallet";
          // The counterparty is the other token account in the transaction
          const counterpartyAddress = Array.from(changes.keys()).find(k => k !== userVaultAddress);

          if (counterpartyAddress) {
            const merchant = await prisma.merchant.findUnique({ where: { vaultuser: counterpartyAddress } });
            if (merchant) {
              counterpartyName = merchant.username;
            } else {
              const customer = await prisma.customer.findUnique({ where: { vaultuser: counterpartyAddress } });
              if (customer) {
                counterpartyName = customer.username;
              }
            }
          }
          
          transactionHistory.push({
            type,
            amount: amount,
            amountInr: amount * usdcToInrRate,
            currency: 'USDC',
            counterparty: counterpartyName,
            timestamp: tx.blockTime,
            signature: sig.signature,
          });

        } catch (txError) {
          console.error(`Error processing transaction: ${sig.signature}`, txError);
        }
      }
      
      transactionHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          walletAddress: user.walletAddress,
          pda: userPdaAddress, // Report the PDA as the main account address
        },
        exchangeRate: { usdc_inr: usdcToInrRate },
        transactionHistory,
      });

    } catch (solanaError) {
      console.error('Solana connection error:', solanaError);
      res.status(500).json({ error: 'Failed to fetch transaction history from the blockchain.' });
    }
  } catch (error) {
    console.error('Wallet history error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

async function findUserByPda(pda: string): Promise<string | null> {
  try {
    const merchant = await prisma.merchant.findFirst({ where: { pda }, select: { username: true } });
    if (merchant) return merchant.username;
    
    const customer = await prisma.customer.findFirst({ where: { pda }, select: { username: true } });
    if (customer) return customer.username;

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

    const {Product} = req.body;
    console.log("chec",customerId);

    if (!customerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!Product || !Array.isArray(Product) || Product.length === 0) {
      res.status(400).json({ error: 'Product array is required' });
      return;
    }
    for (const product of Product) {
      if (!product.productId || !product.quantity || product.quantity <= 0) {
        res.status(400).json({ error: 'Each product must have valid productId and quantity' });
        return;
      }
    }
    const productIds = Product.map(p => p.productId);
    
    const products = await prisma.product.findMany({
      where: { 
        id: { in: productIds }
      },
      include: {
        merchant: true
      }
    });

    if (products.length !== productIds.length) {
      res.status(404).json({ error: 'One or more products not found' });
      return;
    }
    for (const productRequest of Product) {
      const product = products.find(p => p.id === productRequest.productId);
      if (!product) {
        res.status(404).json({ error: `Product not found: ${productRequest.productId}` });
        return;
      }
      if (product.stock < productRequest.quantity) {
        res.status(400).json({ error: `Insufficient stock for product: ${product.name}` });
        return;
      }
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const totalAmountInr = Product.reduce((total, productRequest) => {
      const product = products.find(p => p.id === productRequest.productId);
      return total + (product!.price * productRequest.quantity);
    }, 0);
    
    const usdToInrRate = 83.5; 
    const totalAmountInUsd = totalAmountInr / usdToInrRate;
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
        where: { id: products[0].merchantId }
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
    
      await Promise.all(Product.map(productRequest => {
        const product = products.find(p => p.id === productRequest.productId);
        return prisma.product.update({
          where: { id: product!.id },
          data: {
            stock: product!.stock - productRequest.quantity
          }
        });
      }));

      res.status(200).json({
        message: 'Purchase successful',
        transactionHash: tx,
        products: Product.map(productRequest => {
          const product = products.find(p => p.id === productRequest.productId);
          return {
            id: product!.id,
            name: product!.name,
            quantity: productRequest.quantity,
            price: product!.price
          };
        }),
        totalAmount: totalAmountInUsdcLamports
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

export const generateQRCode = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { items, totalAmount } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    // Create the data structure for QR code
    const qrData = {
      merchantId,
      items: items.map((sp: any) => ({
        productId: sp.productId,
        name: sp.name,
        price: sp.price,
        quantity: sp.quantity,
        total: sp.total
      })),
      totalAmount,
      timestamp: new Date().toISOString()
    };

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      qrCode: qrCodeDataUrl,
      data: qrData
    });

  } catch (error) {
    console.error('QR Code generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

export const transferToCustomer = async (req: CustomerAuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const senderCustomerId = req.customer?.customerId;
    const { receiverEmail, amount } = req.body;

    if (!senderCustomerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!receiverEmail || !amount || amount <= 0) {
      res.status(400).json({ error: 'Valid receiver email and amount are required' });
      return;
    }
    const senderCustomer = await prisma.customer.findUnique({
      where: { id: senderCustomerId }
    });

    if (!senderCustomer) {
      res.status(404).json({ error: 'Sender customer not found' });
      return;
    }
    if (senderCustomer.email === receiverEmail) {
      res.status(400).json({ error: 'Cannot transfer to yourself' });
      return;
    }

    // Get receiver customer by email
    const receiverCustomer = await prisma.customer.findUnique({
      where: { email: receiverEmail }
    });
    if (!receiverCustomer) {
      res.status(404).json({ error: 'Receiver customer not found' });
      return;
    }
    const usdToInrRate = 83.5;
    const amountInUsd = amount / usdToInrRate;
    const amountInUsdcLamports = new anchor.BN(amountInUsd * 1000000);
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('your-secret', 'salt', 32);
      const senderIv = Buffer.from(senderCustomer.iv, 'hex');
      const senderCipher = crypto.createDecipheriv(algorithm, key, senderIv);
      const senderDecryptedBuffer = Buffer.concat([
        senderCipher.update(senderCustomer.Privatekey, 'hex'),
        senderCipher.final(),
      ]);
      const senderKeypair = Keypair.fromSecretKey(senderDecryptedBuffer);
  
      const mint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
      const senderAta = await getAssociatedTokenAddress(mint, senderKeypair.publicKey, false);
      const tx = await program.methods
        .tranfer(new anchor.BN(amountInUsdcLamports))
        .accountsStrict({
          user: senderKeypair.publicKey,
          taker: receiverCustomer.walletAddress,
          mint: mint,
          userAta: senderAta,
          vaultUser:senderCustomer.vaultuser,
          vaultAta:senderCustomer.pda,
          vaultSecond:receiverCustomer.vaultuser,
          vaultSecondAta:receiverCustomer.pda,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        })
        .signers([senderKeypair])
        .rpc();

      console.log('Customer transfer transaction:', tx);

      res.status(200).json({
        message: 'Transfer successful',
        transactionHash: tx,
        transfer: {
          sender: {
            id: senderCustomer.id,
            username: senderCustomer.username,
            email: senderCustomer.email
          },
          receiver: {
            id: receiverCustomer.id,
            username: receiverCustomer.username,
            email: receiverCustomer.email
          },
          amount: amount,
          amountInUsdc: amountInUsd,
          amountInLamports: amountInUsdcLamports.toString()
        }
      });

    } catch (contractError) {
      console.error('Contract error:', contractError);
      res.status(500).json({
        error: 'Transfer failed',
        details: contractError
      });
    }

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 