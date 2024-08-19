import * as anchor from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';

export const GLOBAL_AUTHORITY_SEED = "global-authority";

export const BURN_PROGRAM_ID = new PublicKey("CvvQNDRLaXgTxgE57zz3XP85ewBSp2Lx7uw184pBfq8r");

export const MAD_TOKEN_MINT = new PublicKey("3BAfTyeyPkykQuC5g1FejbebcphhWTBgEwJ75XXBW6CW");
// export const MAD_TOKEN_MINT = new PublicKey("GkXn6PUbcvpwAzVCgJFychVhAhjwZRMJWmtqzar3SnqG");
export const MAD_TOKEN_DECIMAL = 1_000_000_000; 

export const EPOCH = 120;
export const USER_POOL_SIZE = 48;     

export interface GlobalPool {
    // 8 + 32
    superAdmin: PublicKey,          // 32
    totalBurned: anchor.BN          // 8
}


export interface UserPool {
    // 8 + 40
    owner: PublicKey,               // 32
    lastClaimedTime: anchor.BN,     // 8
}
