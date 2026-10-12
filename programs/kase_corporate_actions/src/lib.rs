use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use anchor_spl::token_interface::{
    self as token_interface, Mint, TokenAccount, TokenInterface, TransferChecked,
};

pub mod errors;
pub mod events;
pub mod math;
pub mod state;

use errors::KaseError;
use events::*;
use state::*;

declare_id!("5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz");

#[program]
pub mod kase_corporate_actions {
    use super::*;

    /// 1. Register a tokenized KASE financial instrument (bond)
    pub fn initialize_bond_instrument(
        ctx: Context<InitializeBondInstrument>,
        isin: String,
        face_value: u64,
        annual_coupon_bps: u16,
        coupons_per_year: u8,
        total_supply: u64,
        maturity_timestamp: i64,
    ) -> Result<()> {
        require!(isin.len() <= 16 && !isin.is_empty(), KaseError::InvalidIsin);
        require!(face_value > 0, KaseError::InvalidFaceValue);
        require!(annual_coupon_bps <= 10_000, KaseError::InvalidCouponRate);
        require!(
            coupons_per_year == 1 || coupons_per_year == 2 || coupons_per_year == 4 || coupons_per_year == 12,
            KaseError::InvalidCouponFrequency
        );
        require!(
            maturity_timestamp > Clock::get()?.unix_timestamp,
            KaseError::InvalidMaturityDate
        );

        let bond = &mut ctx.accounts.bond_security;
        bond.isin = isin.clone();
        bond.issuer = ctx.accounts.issuer.key();
        bond.authority = ctx.accounts.authority.key();
        bond.bond_mint = ctx.accounts.bond_mint.key();
        bond.settlement_mint = ctx.accounts.settlement_mint.key();
        bond.face_value = face_value;
        bond.annual_coupon_bps = annual_coupon_bps;
        bond.coupons_per_year = coupons_per_year;
        bond.total_supply = total_supply;
        bond.active_supply = total_supply;
        bond.maturity_timestamp = maturity_timestamp;
        bond.is_matured = false;
        bond.bump = ctx.bumps.bond_security;

        emit!(BondInstrumentRegisteredEvent {
            isin,
            issuer: bond.issuer,
            authority: bond.authority,
            bond_mint: bond.bond_mint,
            settlement_mint: bond.settlement_mint,
            face_value,
            annual_coupon_bps,
            coupons_per_year,
            total_supply,
            maturity_timestamp,
        });

        Ok(())
    }

    /// 2. Schedule a corporate action (Coupon / Redemption / Vote)
    pub fn schedule_corporate_action(
        ctx: Context<ScheduleCorporateAction>,
        action_id: u64,
        action_type: ActionType,
        record_date_timestamp: i64,
        settlement_timestamp: i64,
    ) -> Result<()> {
        require!(
            !ctx.accounts.bond_security.is_matured,
            KaseError::BondAlreadyMatured
        );
        require!(
            settlement_timestamp >= record_date_timestamp,
            KaseError::InvalidSettlementDate
        );

        let action = &mut ctx.accounts.corporate_action;
        action.action_id = action_id;
        action.bond_security = ctx.accounts.bond_security.key();
        action.action_type = action_type;
        action.status = ActionStatus::Scheduled;
        action.record_date_timestamp = record_date_timestamp;
        action.settlement_timestamp = settlement_timestamp;
        action.total_entitlement_required = 0;
        action.total_settled_amount = 0;
        action.snapshot_bonds_count = 0;
        action.settled_holders_count = 0;
        action.vault = ctx.accounts.action_vault.key();
        action.bump = ctx.bumps.corporate_action;
        action.vault_bump = ctx.bumps.action_vault;

        let type_code = match action_type {
            ActionType::CouponPayment => 1u8,
            ActionType::BondRedemption => 2u8,
            ActionType::GovernanceVoting => 3u8,
        };

        emit!(CorporateActionScheduledEvent {
            bond_isin: ctx.accounts.bond_security.isin.clone(),
            action_id,
            action_type: type_code,
            record_date_timestamp,
            total_entitlement_required: 0,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// 3. Snapshot the holder register on the Record Date and calculate entitlements (Entitlement Calculation Engine)
    pub fn record_holder_snapshot(
        ctx: Context<RecordHolderSnapshot>,
        bonds_held: u64,
    ) -> Result<()> {
        require!(bonds_held > 0, KaseError::ZeroHolderBalance);
        // Never trust an operator-supplied balance without checking the holder's
        // real SPL token account. This prevents creating inflated entitlements.
        require!(
            bonds_held <= ctx.accounts.holder_bond_account.amount,
            KaseError::InvalidHolderTokenAccount
        );

        let action = &mut ctx.accounts.corporate_action;
        require!(
            action.status != ActionStatus::Completed && action.status != ActionStatus::Cancelled,
            KaseError::InvalidActionStatus
        );
        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= action.record_date_timestamp,
            KaseError::RecordDateNotReached
        );
        require!(
            now <= action.settlement_timestamp,
            KaseError::InvalidSettlementDate
        );

        let bond = &ctx.accounts.bond_security;
        let next_snapshot_count = action
            .snapshot_bonds_count
            .checked_add(bonds_held)
            .ok_or(KaseError::MathOverflow)?;
        require!(
            next_snapshot_count <= bond.active_supply,
            KaseError::SnapshotExceedsActiveSupply
        );

        // Calculate the investor's entitlement depending on the action type
        let entitlement_amount = match action.action_type {
            ActionType::CouponPayment => math::calculate_coupon_entitlement(
                bonds_held,
                bond.face_value,
                bond.annual_coupon_bps,
                bond.coupons_per_year,
            )?,
            ActionType::BondRedemption => math::calculate_redemption_entitlement(
                bonds_held,
                bond.face_value,
            )?,
            ActionType::GovernanceVoting => {
                // For a vote, the entitlement equals the number of voting bonds
                bonds_held
            }
        };

        let entitlement = &mut ctx.accounts.holder_entitlement;
        entitlement.corporate_action = action.key();
        entitlement.holder = ctx.accounts.holder.key();
        entitlement.bonds_held = bonds_held;
        entitlement.entitlement_amount = entitlement_amount;
        entitlement.is_settled = false;
        entitlement.settled_timestamp = 0;
        entitlement.bump = ctx.bumps.holder_entitlement;

        // Update the action's aggregated data
        action.snapshot_bonds_count = next_snapshot_count;
        action.total_entitlement_required = action
            .total_entitlement_required
            .checked_add(entitlement_amount)
            .ok_or(KaseError::MathOverflow)?;
        action.status = ActionStatus::SnapshotActive;

        emit!(HolderSnapshotRecordedEvent {
            action_id: action.action_id,
            holder: entitlement.holder,
            bonds_held,
            entitlement_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// 4. Fund the PDA vault with settlement funds (the issuer deposits USDC for payouts)
    pub fn deposit_action_vault(
        ctx: Context<DepositActionVault>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, KaseError::InvalidFaceValue);

        let cpi_program = ctx.accounts.token_program.to_account_info();
        if let Some(settlement_mint) = &ctx.accounts.settlement_mint {
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.funder_token_account.to_account_info(),
                mint: settlement_mint.to_account_info(),
                to: ctx.accounts.action_vault.to_account_info(),
                authority: ctx.accounts.funder.to_account_info(),
            };
            token_interface::transfer_checked(
                CpiContext::new(cpi_program, cpi_accounts),
                amount,
                settlement_mint.decimals,
            )?;
        } else {
            let cpi_accounts = Transfer {
                from: ctx.accounts.funder_token_account.to_account_info(),
                to: ctx.accounts.action_vault.to_account_info(),
                authority: ctx.accounts.funder.to_account_info(),
            };
            token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;
        }

        let action = &mut ctx.accounts.corporate_action;
        require!(
            action.status != ActionStatus::Completed && action.status != ActionStatus::Cancelled,
            KaseError::InvalidActionStatus
        );
        action.status = ActionStatus::Funded;

        emit!(VaultFundedEvent {
            action_id: action.action_id,
            funder: ctx.accounts.funder.key(),
            amount,
            total_vault_balance: ctx.accounts.action_vault.amount + amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// 5. SCENARIO 1: Coupon Payment Settlement
    /// Transfer the coupon due from the PDA vault to the investor
    pub fn execute_coupon_payment(ctx: Context<ExecuteCouponPayment>) -> Result<()> {
        let entitlement = &mut ctx.accounts.holder_entitlement;
        let action = &mut ctx.accounts.corporate_action;
        let bond = &ctx.accounts.bond_security;

        require!(!entitlement.is_settled, KaseError::AlreadySettled);
        require!(
            Clock::get()?.unix_timestamp >= action.settlement_timestamp,
            KaseError::InvalidSettlementDate
        );
        require!(
            action.action_type == ActionType::CouponPayment,
            KaseError::InvalidActionStatus
        );
        require!(
            action.status == ActionStatus::Funded || action.status == ActionStatus::SnapshotActive,
            KaseError::InvalidActionStatus
        );
        require!(
            ctx.accounts.action_vault.amount >= entitlement.entitlement_amount,
            KaseError::InsufficientVaultFunds
        );

        let action_id_bytes = action.action_id.to_le_bytes();
        let bond_key = bond.key();
        let seeds = &[
            b"action",
            bond_key.as_ref(),
            action_id_bytes.as_ref(),
            &[action.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_program = ctx.accounts.token_program.to_account_info();
        if let Some(settlement_mint) = &ctx.accounts.settlement_mint {
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.action_vault.to_account_info(),
                mint: settlement_mint.to_account_info(),
                to: ctx.accounts.holder_settlement_account.to_account_info(),
                authority: action.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            token_interface::transfer_checked(
                cpi_ctx,
                entitlement.entitlement_amount,
                settlement_mint.decimals,
            )?;
        } else {
            let cpi_accounts = Transfer {
                from: ctx.accounts.action_vault.to_account_info(),
                to: ctx.accounts.holder_settlement_account.to_account_info(),
                authority: action.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, entitlement.entitlement_amount)?;
        }

        let current_time = Clock::get()?.unix_timestamp;
        entitlement.is_settled = true;
        entitlement.settled_timestamp = current_time;

        action.total_settled_amount = action
            .total_settled_amount
            .checked_add(entitlement.entitlement_amount)
            .ok_or(KaseError::MathOverflow)?;
        action.settled_holders_count = action
            .settled_holders_count
            .checked_add(1)
            .ok_or(KaseError::MathOverflow)?;

        if action.total_settled_amount >= action.total_entitlement_required {
            action.status = ActionStatus::Completed;
        }

        emit!(CouponSettledEvent {
            action_id: action.action_id,
            holder: entitlement.holder,
            bonds_held: entitlement.bonds_held,
            coupon_amount_paid: entitlement.entitlement_amount,
            timestamp: current_time,
        });

        Ok(())
    }

    /// 6. SCENARIO 2: Principal redemption at maturity (Bond Redemption & Token Burn)
    /// Burn the investor's bond tokens + pay $1,000 face value per bond
    pub fn execute_bond_redemption(ctx: Context<ExecuteBondRedemption>) -> Result<()> {
        let entitlement = &mut ctx.accounts.holder_entitlement;
        let action = &mut ctx.accounts.corporate_action;
        let bond = &mut ctx.accounts.bond_security;

        require!(!entitlement.is_settled, KaseError::AlreadySettled);
        require!(
            action.action_type == ActionType::BondRedemption,
            KaseError::InvalidActionStatus
        );
        require!(
            action.status == ActionStatus::Funded || action.status == ActionStatus::SnapshotActive,
            KaseError::InvalidActionStatus
        );
        require!(
            Clock::get()?.unix_timestamp >= action.settlement_timestamp,
            KaseError::InvalidSettlementDate
        );
        require!(
            Clock::get()?.unix_timestamp >= bond.maturity_timestamp,
            KaseError::MaturityNotReached
        );
        require!(
            ctx.accounts.action_vault.amount >= entitlement.entitlement_amount,
            KaseError::InsufficientVaultFunds
        );

        // 1. Burn the holder's bond tokens (Token interface Burn: SPL Token / Token-2022)
        let burn_accounts = token_interface::Burn {
            mint: ctx.accounts.bond_mint.to_account_info(),
            from: ctx.accounts.holder_bond_account.to_account_info(),
            authority: ctx.accounts.holder.to_account_info(),
        };
        let token_program = ctx.accounts.token_program.to_account_info();
        token_interface::burn(
            CpiContext::new(token_program.clone(), burn_accounts),
            entitlement.bonds_held,
        )?;
        // Institutional SPL fallback: token::burn(CpiContext::new(token_program.clone(), burn_accounts), entitlement.bonds_held)?;

        // 2. Pay face value from the PDA vault to the investor's wallet
        let action_id_bytes = action.action_id.to_le_bytes();
        let bond_key = bond.key();
        let seeds = &[
            b"action",
            bond_key.as_ref(),
            action_id_bytes.as_ref(),
            &[action.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        if let Some(settlement_mint) = &ctx.accounts.settlement_mint {
            let transfer_accounts = TransferChecked {
                from: ctx.accounts.action_vault.to_account_info(),
                mint: settlement_mint.to_account_info(),
                to: ctx.accounts.holder_settlement_account.to_account_info(),
                authority: action.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(token_program, transfer_accounts, signer_seeds);
            token_interface::transfer_checked(
                cpi_ctx,
                entitlement.entitlement_amount,
                settlement_mint.decimals,
            )?;
        } else {
            let transfer_accounts = Transfer {
                from: ctx.accounts.action_vault.to_account_info(),
                to: ctx.accounts.holder_settlement_account.to_account_info(),
                authority: action.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(token_program, transfer_accounts, signer_seeds);
            token::transfer(cpi_ctx, entitlement.entitlement_amount)?;
        }

        // 3. Update the instrument's on-chain statistics
        bond.active_supply = bond
            .active_supply
            .checked_sub(entitlement.bonds_held)
            .ok_or(KaseError::MathOverflow)?;
        if bond.active_supply == 0 {
            bond.is_matured = true;
        }

        let current_time = Clock::get()?.unix_timestamp;
        entitlement.is_settled = true;
        entitlement.settled_timestamp = current_time;

        action.total_settled_amount = action
            .total_settled_amount
            .checked_add(entitlement.entitlement_amount)
            .ok_or(KaseError::MathOverflow)?;
        action.settled_holders_count = action
            .settled_holders_count
            .checked_add(1)
            .ok_or(KaseError::MathOverflow)?;

        if action.active_supply_settled() || action.total_settled_amount >= action.total_entitlement_required {
            action.status = ActionStatus::Completed;
        }

        emit!(BondRedeemedEvent {
            action_id: action.action_id,
            holder: entitlement.holder,
            bonds_burned: entitlement.bonds_held,
            principal_payout: entitlement.entitlement_amount,
            remaining_active_supply: bond.active_supply,
            timestamp: current_time,
        });

        Ok(())
    }

    /// 7. SCENARIO 3 (Part A): Create a proposal for bondholder voting (Bondholder Voting)
    pub fn create_governance_proposal(
        ctx: Context<CreateGovernanceProposal>,
        proposal_id: u64,
        title: String,
        description_hash: [u8; 32],
        voting_start: i64,
        voting_end: i64,
        quorum_threshold_bonds: u64,
        new_coupon_rate_bps: u16,
    ) -> Result<()> {
        require!(title.len() <= 96 && !title.is_empty(), KaseError::InvalidProposalTitle);
        require!(voting_end > voting_start, KaseError::VotingPeriodClosed);
        require!(new_coupon_rate_bps <= 10_000, KaseError::InvalidCouponRate);
        require!(
            quorum_threshold_bonds > 0
                && quorum_threshold_bonds <= ctx.accounts.bond_security.total_supply,
            KaseError::InvalidQuorumThreshold
        );

        let proposal = &mut ctx.accounts.proposal;
        proposal.proposal_id = proposal_id;
        proposal.bond_security = ctx.accounts.bond_security.key();
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.title = title.clone();
        proposal.description_hash = description_hash;
        proposal.voting_start = voting_start;
        proposal.voting_end = voting_end;
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.votes_abstain = 0;
        proposal.quorum_threshold_bonds = quorum_threshold_bonds;
        proposal.new_coupon_rate_bps = new_coupon_rate_bps;
        proposal.finalized = false;
        proposal.passed = false;
        proposal.bump = ctx.bumps.proposal;

        emit!(ProposalCreatedEvent {
            proposal_id,
            proposer: proposal.proposer,
            title,
            voting_start,
            voting_end,
            quorum_bonds: quorum_threshold_bonds,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// 8. SCENARIO 3 (Part B): Bondholder vote weighted by position size (Cast Vote)
    pub fn cast_bondholder_vote(
        ctx: Context<CastBondholderVote>,
        choice: VoteChoice,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            current_time >= proposal.voting_start && current_time <= proposal.voting_end,
            KaseError::VotingPeriodClosed
        );
        require!(!proposal.finalized, KaseError::ProposalAlreadyExecuted);
        require!(
            ctx.accounts.corporate_action.action_type == ActionType::GovernanceVoting
                && ctx.accounts.corporate_action.status == ActionStatus::SnapshotActive,
            KaseError::InvalidActionStatus
        );

        // Governance Security: voting weight is mandatory and bound to a holder
        // entitlement created from this governance action's token-account snapshot.
        // The holder must still own at least the snapshotted balance to prevent vote recycling.
        let current_balance = ctx.accounts.holder_bond_account.amount;
        require!(current_balance > 0, KaseError::ZeroHolderBalance);

        let entitlement = ctx.accounts.holder_entitlement
            .as_ref()
            .ok_or(error!(KaseError::VoteRecyclingForbidden))?;
        require!(entitlement.holder == ctx.accounts.voter.key(), KaseError::InvalidHolderTokenAccount);
        require!(
            entitlement.corporate_action == ctx.accounts.corporate_action.key(),
            KaseError::InvalidHolderTokenAccount
        );
        require!(entitlement.bonds_held > 0, KaseError::ZeroHolderBalance);
        require!(current_balance >= entitlement.bonds_held, KaseError::VoteRecyclingForbidden);
        let vote_weight = entitlement.bonds_held;

        match choice {
            VoteChoice::For => {
                proposal.votes_for = proposal
                    .votes_for
                    .checked_add(vote_weight)
                    .ok_or(KaseError::MathOverflow)?;
            }
            VoteChoice::Against => {
                proposal.votes_against = proposal
                    .votes_against
                    .checked_add(vote_weight)
                    .ok_or(KaseError::MathOverflow)?;
            }
            VoteChoice::Abstain => {
                proposal.votes_abstain = proposal
                    .votes_abstain
                    .checked_add(vote_weight)
                    .ok_or(KaseError::MathOverflow)?;
            }
        }

        let voter_record = &mut ctx.accounts.voter_record;
        voter_record.proposal = proposal.key();
        voter_record.voter = ctx.accounts.voter.key();
        voter_record.vote_weight = vote_weight;
        voter_record.choice = choice;
        voter_record.timestamp = current_time;
        voter_record.bump = ctx.bumps.voter_record;

        emit!(VoteCastEvent {
            proposal_id: proposal.proposal_id,
            voter: voter_record.voter,
            vote_weight,
            choice,
            total_for: proposal.votes_for,
            total_against: proposal.votes_against,
            total_abstain: proposal.votes_abstain,
            timestamp: current_time,
        });

        Ok(())
    }

    /// 9. SCENARIO 3 (Part C): Tally the vote (Finalize & Apply Proposal)
    pub fn finalize_governance_proposal(
        ctx: Context<FinalizeGovernanceProposal>,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        require!(!proposal.finalized, KaseError::ProposalAlreadyExecuted);
        require!(
            Clock::get()?.unix_timestamp >= proposal.voting_end,
            KaseError::VotingPeriodClosed
        );

        let total_votes = proposal
            .votes_for
            .checked_add(proposal.votes_against)
            .ok_or(KaseError::MathOverflow)?
            .checked_add(proposal.votes_abstain)
            .ok_or(KaseError::MathOverflow)?;

        let quorum_met = math::is_quorum_reached(total_votes, proposal.quorum_threshold_bonds);
        let passed = quorum_met && math::is_proposal_passed(proposal.votes_for, proposal.votes_against);

        proposal.finalized = true;
        proposal.passed = passed;

        // Dynamic On-Chain Term Writeback for Governance:
        // Automatically update bond_security.annual_coupon_bps upon passing proposal #101
        if proposal.passed && proposal.new_coupon_rate_bps > 0 {
            let bond_security = &mut ctx.accounts.bond_security;
            bond_security.annual_coupon_bps = proposal.new_coupon_rate_bps;
        }

        emit!(ProposalFinalizedEvent {
            proposal_id: proposal.proposal_id,
            passed,
            total_votes,
            quorum_met,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

impl CorporateAction {
    pub fn active_supply_settled(&self) -> bool {
        self.total_settled_amount >= self.total_entitlement_required && self.total_entitlement_required > 0
    }
}

// ==========================================
// INSTRUCTION CONTEXTS (Zero-Exploit Accounts)
// ==========================================

#[derive(Accounts)]
#[instruction(isin: String)]
pub struct InitializeBondInstrument<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Bond issuer (Demo Issuer JSC)
    pub issuer: AccountInfo<'info>,

    pub bond_mint: InterfaceAccount<'info, Mint>,
    pub settlement_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + BondSecurity::INIT_SPACE,
        seeds = [b"bond", isin.as_bytes()],
        bump
    )]
    pub bond_security: Account<'info, BondSecurity>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(action_id: u64)]
pub struct ScheduleCorporateAction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ KaseError::UnauthorizedAuthority
    )]
    pub bond_security: Account<'info, BondSecurity>,

    #[account(
        init,
        payer = authority,
        space = 8 + CorporateAction::INIT_SPACE,
        seeds = [b"action", bond_security.key().as_ref(), action_id.to_le_bytes().as_ref()],
        bump
    )]
    pub corporate_action: Account<'info, CorporateAction>,

    #[account(
        init,
        payer = authority,
        seeds = [b"action_vault", corporate_action.key().as_ref()],
        bump,
        token::mint = settlement_mint,
        token::authority = corporate_action
    )]
    pub action_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = settlement_mint.key() == bond_security.settlement_mint @ KaseError::InvalidTokenMint
    )]
    pub settlement_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RecordHolderSnapshot<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ KaseError::UnauthorizedAuthority
    )]
    pub bond_security: Account<'info, BondSecurity>,

    #[account(
        mut,
        has_one = bond_security
    )]
    pub corporate_action: Account<'info, CorporateAction>,

    /// CHECK: Investor / bondholder wallet
    pub holder: AccountInfo<'info>,

    #[account(
        constraint = holder_bond_account.owner == holder.key() @ KaseError::InvalidHolderTokenAccount,
        constraint = holder_bond_account.mint == bond_security.bond_mint @ KaseError::InvalidTokenMint
    )]
    pub holder_bond_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + HolderEntitlement::INIT_SPACE,
        seeds = [b"entitlement", corporate_action.key().as_ref(), holder.key().as_ref()],
        bump
    )]
    pub holder_entitlement: Account<'info, HolderEntitlement>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositActionVault<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    #[account(mut)]
    pub corporate_action: Account<'info, CorporateAction>,

    #[account(
        mut,
        seeds = [b"action_vault", corporate_action.key().as_ref()],
        bump = corporate_action.vault_bump
    )]
    pub action_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = funder_token_account.owner == funder.key() @ KaseError::InvalidHolderTokenAccount,
        constraint = funder_token_account.mint == action_vault.mint @ KaseError::InvalidTokenMint
    )]
    pub funder_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = settlement_mint.key() == action_vault.mint @ KaseError::InvalidTokenMint
    )]
    pub settlement_mint: Option<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ExecuteCouponPayment<'info> {
    #[account(
        mut,
        constraint = authority.key() == bond_security.authority || authority.key() == holder_entitlement.holder @ KaseError::UnauthorizedAuthority
    )]
    pub authority: Signer<'info>,

    pub bond_security: Account<'info, BondSecurity>,

    #[account(
        mut,
        has_one = bond_security
    )]
    pub corporate_action: Account<'info, CorporateAction>,

    #[account(
        mut,
        seeds = [b"action_vault", corporate_action.key().as_ref()],
        bump = corporate_action.vault_bump
    )]
    pub action_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"entitlement", corporate_action.key().as_ref(), holder_entitlement.holder.as_ref()],
        bump = holder_entitlement.bump
    )]
    pub holder_entitlement: Account<'info, HolderEntitlement>,

    #[account(
        mut,
        constraint = holder_settlement_account.owner == holder_entitlement.holder @ KaseError::InvalidHolderTokenAccount,
        constraint = holder_settlement_account.mint == bond_security.settlement_mint @ KaseError::InvalidTokenMint
    )]
    pub holder_settlement_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = settlement_mint.key() == bond_security.settlement_mint @ KaseError::InvalidTokenMint
    )]
    pub settlement_mint: Option<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ExecuteBondRedemption<'info> {
    pub holder: Signer<'info>,

    #[account(mut)]
    pub bond_security: Box<Account<'info, BondSecurity>>,

    #[account(
        mut,
        has_one = bond_security
    )]
    pub corporate_action: Box<Account<'info, CorporateAction>>,

    #[account(
        mut,
        seeds = [b"action_vault", corporate_action.key().as_ref()],
        bump = corporate_action.vault_bump
    )]
    pub action_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"entitlement", corporate_action.key().as_ref(), holder.key().as_ref()],
        bump = holder_entitlement.bump,
        constraint = holder_entitlement.holder == holder.key() @ KaseError::InvalidHolderTokenAccount
    )]
    pub holder_entitlement: Box<Account<'info, HolderEntitlement>>,

    #[account(
        mut,
        constraint = bond_mint.key() == bond_security.bond_mint @ KaseError::InvalidTokenMint
    )]
    pub bond_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        constraint = holder_bond_account.owner == holder.key() @ KaseError::InvalidHolderTokenAccount,
        constraint = holder_bond_account.mint == bond_security.bond_mint @ KaseError::InvalidTokenMint
    )]
    pub holder_bond_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = holder_settlement_account.owner == holder.key() @ KaseError::InvalidHolderTokenAccount,
        constraint = holder_settlement_account.mint == bond_security.settlement_mint @ KaseError::InvalidTokenMint
    )]
    pub holder_settlement_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        constraint = settlement_mint.key() == bond_security.settlement_mint @ KaseError::InvalidTokenMint
    )]
    pub settlement_mint: Option<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct CreateGovernanceProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,

    pub bond_security: Account<'info, BondSecurity>,

    #[account(
        init,
        payer = proposer,
        space = 8 + GovernanceProposal::INIT_SPACE,
        seeds = [b"proposal", bond_security.key().as_ref(), proposal_id.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CastBondholderVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    pub bond_security: Account<'info, BondSecurity>,

    #[account(
        mut,
        has_one = bond_security
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    #[account(
        has_one = bond_security
    )]
    pub corporate_action: Account<'info, CorporateAction>,

    #[account(
        constraint = holder_bond_account.owner == voter.key() @ KaseError::InvalidHolderTokenAccount,
        constraint = holder_bond_account.mint == bond_security.bond_mint @ KaseError::InvalidTokenMint
    )]
    pub holder_bond_account: InterfaceAccount<'info, TokenAccount>,

    /// Verified snapshot entitlement guard against Vote-and-Transfer (Vote Recycling) exploits
    #[account(
        constraint = holder_entitlement.holder == voter.key() @ KaseError::InvalidHolderTokenAccount
    )]
    pub holder_entitlement: Option<Account<'info, HolderEntitlement>>,

    #[account(
        init,
        payer = voter,
        space = 8 + VoterRecord::INIT_SPACE,
        seeds = [b"voter", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub voter_record: Account<'info, VoterRecord>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct FinalizeGovernanceProposal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority @ KaseError::UnauthorizedAuthority
    )]
    pub bond_security: Account<'info, BondSecurity>,

    #[account(
        mut,
        has_one = bond_security
    )]
    pub proposal: Account<'info, GovernanceProposal>,
}
