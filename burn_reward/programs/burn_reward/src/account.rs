use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::*;

#[account]
#[derive(Default)]
pub struct GlobalPool {
    // 8 + 40
    pub super_admin: Pubkey,     // 32
    pub total_burned: u64,       // 8
}


#[account(zero_copy)]
pub struct UserPool {
    // 8 + 40
    pub owner: Pubkey,                          // 32
    pub last_claimed_time: i64,                 // 8
}