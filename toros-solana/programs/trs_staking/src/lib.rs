use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("TRSStake1111111111111111111111111111111111");

#[program]
pub mod trs_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.admin = *ctx.accounts.admin.key;
        state.trs_mint = ctx.accounts.trs_mint.key();
        Ok(())
    }
}

#[account]
pub struct StakingState {
    pub admin: Pubkey,
    pub trs_mint: Pubkey,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + 32 + 32)]
    pub state: Account<'info, StakingState>,
    pub trs_mint: Account<'info, Mint>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}
