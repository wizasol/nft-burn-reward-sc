import { Program, web3 } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';

import { IDL as BurnIDL } from "./burn_reward";
import {
    Keypair,
    PublicKey,
    Connection,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
} from '@solana/web3.js';
import {
    GLOBAL_AUTHORITY_SEED,
    GlobalPool,
    USER_POOL_SIZE,
    MAD_TOKEN_DECIMAL,
    UserPool,
    MAD_TOKEN_MINT,
    BURN_PROGRAM_ID,
} from './types';
import {
    getAssociatedTokenAccount,
    getATokenAccountsNeedCreate,
    getNFTTokenAccount,
    getOwnerOfNFT,
    getMetadata,
    METAPLEX,
    isExistAccount,
} from './utils';

let program: Program = null;

// Address of the deployed program.
let programId = new anchor.web3.PublicKey(BURN_PROGRAM_ID);

anchor.setProvider(anchor.AnchorProvider.local(web3.clusterApiUrl("devnet")));
const solConnection = anchor.getProvider().connection;
const payer = anchor.AnchorProvider.local().wallet;

// Generate the program client from IDL.
program = new anchor.Program(BurnIDL as anchor.Idl, programId);
console.log('ProgramId: ', program.programId.toBase58());

const main = async () => {
    const [globalAuthority, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        program.programId
    );
    console.log('GlobalAuthority: ', globalAuthority.toBase58());


    await initProject();

    // await initUserPool(payer.publicKey);

    // await burnReward(new PublicKey("FvVKssmkvAxTh1P9WLtoiCQExss4rpmt3ddqiap4eK3r"));


};

export const initProject = async (
) => {
    const tx = await createInitializeTx(payer.publicKey, program);
    const { blockhash } = await solConnection.getRecentBlockhash('confirmed');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "confirmed");
    console.log("txHash =", txId);
}


export const initUserPool = async (
) => {
    const tx = await createInitUserPoolTx(payer.publicKey, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('finalized');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "finalized");
    console.log("Your transaction signature", txId);
}

export const burnReward = async (
    mint: PublicKey,
) => {

    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        payer.publicKey,
        "user-pool",
        BURN_PROGRAM_ID,
    );

    let poolAccount = await solConnection.getAccountInfo(userPoolKey);
    if (poolAccount === null || poolAccount.data === null) {
        await initUserPool();
    }

    const tx = await createBurnRewardTx(mint, payer.publicKey, program, solConnection);
    const { blockhash } = await solConnection.getRecentBlockhash('confirmed');
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = blockhash;
    payer.signTransaction(tx);
    let txId = await solConnection.sendTransaction(tx, [(payer as NodeWallet).payer]);
    await solConnection.confirmTransaction(txId, "confirmed");
    console.log("Your transaction signature", txId);
}



export const createInitializeTx = async (
    userAddress: PublicKey,
    program: anchor.Program,
) => {
    const [globalAuthority, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        BURN_PROGRAM_ID,
    );

    let tx = new Transaction();
    console.log('==>initializing program', globalAuthority.toBase58());

    tx.add(program.instruction.initialize(
        bump, {
        accounts: {
            admin: userAddress,
            globalAuthority,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
        },
        instructions: [],
        signers: [],
    }));

    return tx;
}

export const createInitUserPoolTx = async (
    userAddress: PublicKey,
    program: anchor.Program,
    connection: Connection,
) => {
    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        userAddress,
        "user-pool",
        BURN_PROGRAM_ID,
    );
    console.log(USER_POOL_SIZE);
    let ix = SystemProgram.createAccountWithSeed({
        fromPubkey: userAddress,
        basePubkey: userAddress,
        seed: "user-pool",
        newAccountPubkey: userPoolKey,
        lamports: await connection.getMinimumBalanceForRentExemption(USER_POOL_SIZE),
        space: USER_POOL_SIZE,
        programId: BURN_PROGRAM_ID,
    });

    let tx = new Transaction();
    console.log('==>initializing user PDA', userPoolKey.toBase58());
    tx.add(ix);
    tx.add(program.instruction.initializeUserPool(
        {
            accounts: {
                userPool: userPoolKey,
                owner: userAddress
            },
            instructions: [],
            signers: []
        }
    ));

    return tx;
}

export const createBurnRewardTx = async (
    mint: PublicKey,
    userAddress: PublicKey,
    program: anchor.Program,
    connection: Connection,
) => {
    const [globalAuthority, bump] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        BURN_PROGRAM_ID,
    );

    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        userAddress,
        "user-pool",
        BURN_PROGRAM_ID,
    );

    let userTokenAccount = await getAssociatedTokenAccount(userAddress, mint);
    if (!await isExistAccount(userTokenAccount, connection)) {
        let accountOfNFT = await getNFTTokenAccount(mint, connection);
        if (userTokenAccount.toBase58() != accountOfNFT.toBase58()) {
            let nftOwner = await getOwnerOfNFT(mint, connection);
            if (nftOwner.toBase58() == userAddress.toBase58()) userTokenAccount = accountOfNFT;
            else if (nftOwner.toBase58() !== globalAuthority.toBase58()) {
                throw 'Error: Nft is not owned by user';
            }
        }
    }
    console.log("NFT = ", mint.toBase58(), userTokenAccount.toBase58());

    let { instructions, destinationAccounts } = await getATokenAccountsNeedCreate(
        connection,
        userAddress,
        userAddress,
        [MAD_TOKEN_MINT]
    );

    console.log("User MAD Account = ", destinationAccounts[0].toBase58())
    let rewardVault = await getAssociatedTokenAccount(globalAuthority, MAD_TOKEN_MINT);

    const metadata = await getMetadata(mint);

    console.log("Metadata=", metadata.toBase58());
    
    let tx = new Transaction();

    if (instructions.length > 0) instructions.map((ix) => tx.add(ix));
    console.log('==>burning', mint.toBase58());

    tx.add(program.instruction.getReward(
        bump, {
        accounts: {
            owner: userAddress,
            userPool: userPoolKey,
            globalAuthority,
            userNftTokenAccount: userTokenAccount,
            nftMint: mint,
            mintMetadata: metadata,
            rewardVault,
            userRewardAccount: destinationAccounts[0],
            tokenProgram: TOKEN_PROGRAM_ID,
            tokenMetadataProgram: METAPLEX,
        },
        instructions: [],
        signers: [],
    }));

    return tx;
}

export const getUserPoolInfo = async (
    userAddress: PublicKey,
) => {
    const userInfo: UserPool = await getUserPoolState(userAddress, program);
    return {
        owner: userInfo.owner.toBase58(),
        lastClaimedTime: userInfo.lastClaimedTime.toNumber(),
    };
}

export const getGlobalInfo = async () => {
    const globalPool: GlobalPool = await getGlobalState(program);
    const result = {
        admin: globalPool.superAdmin.toBase58(),
        totalBurned: globalPool.totalBurned.toNumber()
    };

    return result;
}

export const getGlobalState = async (
    program: anchor.Program,
): Promise<GlobalPool | null> => {
    const [globalAuthority, _] = await PublicKey.findProgramAddress(
        [Buffer.from(GLOBAL_AUTHORITY_SEED)],
        BURN_PROGRAM_ID
    );
    try {
        let globalState = await program.account.globalPool.fetch(globalAuthority);
        return globalState as unknown as GlobalPool;
    } catch {
        return null;
    }
}

export const getUserPoolState = async (
    userAddress: PublicKey,
    program: anchor.Program,
): Promise<UserPool | null> => {
    let userPoolKey = await anchor.web3.PublicKey.createWithSeed(
        userAddress,
        "user-pool",
        BURN_PROGRAM_ID,
    );
    try {
        let userPoolState = await program.account.userPool.fetch(userPoolKey);
        return userPoolState as unknown as UserPool;
    } catch {
        return null;
    }
}


main();
