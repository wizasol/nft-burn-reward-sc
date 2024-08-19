use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Token, TokenAccount, Transfer};
use metaplex_token_metadata::state::Metadata;

pub mod account;
pub mod constants;
pub mod error;

use account::*;
use constants::*;
use error::*;

declare_id!("CvvQNDRLaXgTxgE57zz3XP85ewBSp2Lx7uw184pBfq8r");

#[program]
pub mod burn_reward {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, _global_bump: u8) -> Result<()> {
        let global_authority = &mut ctx.accounts.global_authority;
        global_authority.super_admin = ctx.accounts.admin.key();
        global_authority.total_burned = 0;
        Ok(())
    }

    pub fn initialize_user_pool(ctx: Context<InitializeUserPool>) -> Result<()> {
        let mut user_pool = ctx.accounts.user_pool.load_init()?;
        user_pool.owner = ctx.accounts.owner.key();
        Ok(())
    }

    pub fn get_reward(ctx: Context<GetReward>, global_bump: u8) -> Result<()> {
        let timestamp = Clock::get()?.unix_timestamp;
        let mut user_pool = ctx.accounts.user_pool.load_mut()?;
        let last_claimed_time = user_pool.last_claimed_time;

        require!(last_claimed_time/EPOCH != timestamp/EPOCH, BurnError::InvalidLimit);

        let mint_metadata = &mut &ctx.accounts.mint_metadata;

        msg!("Metadata Account: {:?}", ctx.accounts.mint_metadata.key());
        let (metadata, _) = Pubkey::find_program_address(
            &[
                metaplex_token_metadata::state::PREFIX.as_bytes(),
                metaplex_token_metadata::id().as_ref(),
                ctx.accounts.nft_mint.key().as_ref(),
            ],
            &metaplex_token_metadata::id(),
        );
        require!(
            metadata == mint_metadata.key(),
            BurnError::InvalidMetadata
        );

        // Verify metadata is legit
        let nft_metadata = Metadata::from_account_info(mint_metadata)?;

        // Check if this NFT is the wanted collection and verified
        if let Some(creators) = nft_metadata.data.creators {
            let mut valid: u8 = 0;
            let mut collection: Pubkey = Pubkey::default();
            for creator in creators {
                if creator.address.to_string() == CREATOR && creator.verified == true {
                    valid = 1;
                    collection = creator.address;
                    break;
                }
            }
            require!(valid == 1, BurnError::UnkownOrNotAllowedNFTCollection);
            msg!("Collection= {:?}", collection);
        } else {
            return Err(error!(BurnError::MetadataCreatorParseError));
        };

        let token_program = &mut &ctx.accounts.token_program;

        let cpi_accounts = Burn {
            mint: ctx.accounts.nft_mint.to_account_info().clone(),
            from: ctx.accounts.user_nft_token_account.to_account_info().clone(),
            authority: ctx.accounts.owner.to_account_info().clone(),
        };
        token::burn(
                CpiContext::new(token_program.to_account_info(), cpi_accounts),
            1,
        )?;

        let seeds = &[GLOBAL_AUTHORITY_SEED.as_bytes(), &[global_bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: ctx.accounts.global_authority.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info().clone(),
                cpi_accounts,
                signer,
            ),
            REWARDS,
        )?;
        let global_authority = &mut ctx.accounts.global_authority;

        global_authority.total_burned += 1;
        user_pool.last_claimed_time = timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
        space = 48,
        payer = admin
    )]
    pub global_authority: Account<'info, GlobalPool>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeUserPool<'info> {
    #[account(zero)]
    pub user_pool: AccountLoader<'info, UserPool>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub user_pool: AccountLoader<'info, UserPool>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
    )]
    pub global_authority: Box<Account<'info, GlobalPool>>,

    #[account(
        mut,
        constraint = user_nft_token_account.mint == nft_mint.key(),
        constraint = user_nft_token_account.owner == *owner.key,
        constraint = user_nft_token_account.amount == 1,
    )]
    pub user_nft_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_mint: AccountInfo<'info>,
    /// the mint metadata
    #[account(
        mut,
        constraint = mint_metadata.owner == &metaplex_token_metadata::ID
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub mint_metadata: AccountInfo<'info>,

    #[account(
        mut,
        constraint = reward_vault.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = reward_vault.owner == global_authority.key(),
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = user_reward_account.mint == REWARD_TOKEN_MINT_PUBKEY.parse::<Pubkey>().unwrap(),
        constraint = user_reward_account.owner == *owner.key,
    )]
    pub user_reward_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,

}