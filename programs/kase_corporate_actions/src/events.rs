use anchor_lang::prelude::*;
use crate::state::VoteChoice;

#[event]
pub struct BondInstrumentRegisteredEvent {
    pub isin: String,
    pub issuer: Pubkey,
    pub authority: Pubkey,
    pub bond_mint: Pubkey,
    pub settlement_mint: Pubkey,
    pub face_value: u64,
    pub annual_coupon_bps: u16,
    pub coupons_per_year: u8,
    pub total_supply: u64,
    pub maturity_timestamp: i64,
}

#[event]
pub struct CorporateActionScheduledEvent {
    pub bond_isin: String,
    pub action_id: u64,
    pub action_type: u8,
    pub record_date_timestamp: i64,
    pub total_entitlement_required: u64,
    pub timestamp: i64,
}

#[event]
pub struct HolderSnapshotRecordedEvent {
    pub action_id: u64,
    pub holder: Pubkey,
    pub bonds_held: u64,
    pub entitlement_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct VaultFundedEvent {
    pub action_id: u64,
    pub funder: Pubkey,
    pub amount: u64,
    pub total_vault_balance: u64,
    pub timestamp: i64,
}

#[event]
pub struct CouponSettledEvent {
    pub action_id: u64,
    pub holder: Pubkey,
    pub bonds_held: u64,
    pub coupon_amount_paid: u64,
    pub timestamp: i64,
}

#[event]
pub struct BondRedeemedEvent {
    pub action_id: u64,
    pub holder: Pubkey,
    pub bonds_burned: u64,
    pub principal_payout: u64,
    pub remaining_active_supply: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProposalCreatedEvent {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub title: String,
    pub voting_start: i64,
    pub voting_end: i64,
    pub quorum_bonds: u64,
    pub timestamp: i64,
}

#[event]
pub struct VoteCastEvent {
    pub proposal_id: u64,
    pub voter: Pubkey,
    pub vote_weight: u64,
    pub choice: VoteChoice,
    pub total_for: u64,
    pub total_against: u64,
    pub total_abstain: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProposalFinalizedEvent {
    pub proposal_id: u64,
    pub passed: bool,
    pub total_votes: u64,
    pub quorum_met: bool,
    pub timestamp: i64,
}
