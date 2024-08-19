use anchor_lang::prelude::*;

#[error_code]
pub enum BurnError {
    #[msg("Invalid Super Owner")]
    InvalidSuperOwner,
    #[msg("Invalid Global Pool Address")]
    InvalidGlobalPool,
    #[msg("Invalid User Pool Owner Address")]
    InvalidUserPool,

    #[msg("Invalid Daily Limit Per Wallet")]
    InvalidLimit,
    #[msg("Insufficient Reward Token Balance")]
    InsufficientRewardVault,

    #[msg("Invalid Metadata Address")]
    InvalidMetadata,
    #[msg("Can't Parse The NFT's Creators")]
    MetadataCreatorParseError,
    #[msg("Unknown Collection Or The Collection Is Not Allowed")]
    UnkownOrNotAllowedNFTCollection,
}