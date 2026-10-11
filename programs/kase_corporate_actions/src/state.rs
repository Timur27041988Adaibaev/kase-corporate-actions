use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum ActionType {
    CouponPayment,
    BondRedemption,
    GovernanceVoting,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum ActionStatus {
    Scheduled,
    SnapshotActive,
    Funded,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum VoteChoice {
    For,
    Against,
    Abstain,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct BondSecurity {
    /// International Securities Identification Number (ISIN, e.g. "KZDEMO000001")
    #[max_len(16)]
    pub isin: String,

    /// Bond issuer (Demo Issuer JSC)
    pub issuer: Pubkey,

    /// Exchange regulator / Central Securities Depository (KASE CSD / KCSD)
    pub authority: Pubkey,

    /// SPL Mint of the bond token
    pub bond_mint: Pubkey,

    /// SPL Mint of the settlement currency (USDC / Digital Tenge)
    pub settlement_mint: Pubkey,

    /// Face value of one bond (e.g. 1,000 USDC = 1_000_000_000 micro-units)
    pub face_value: u64,

    /// Annual coupon rate in basis points (1000 bps = 10.00%)
    pub annual_coupon_bps: u16,

    /// Coupon payments per year (2 = semi-annual)
    pub coupons_per_year: u8,

    /// Total issue size (number of bonds)
    pub total_supply: u64,

    /// Current outstanding supply (decreases on redemption/burn)
    pub active_supply: u64,

    /// Bond maturity date (Unix timestamp)
    pub maturity_timestamp: i64,

    /// Flag: instrument fully redeemed
    pub is_matured: bool,

    /// Bump seed for the PDA
    pub bump: u8,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct CorporateAction {
    /// Unique corporate action number in the KASE register
    pub action_id: u64,

    /// Reference to the bond master account
    pub bond_security: Pubkey,

    /// Action type (Coupon, Redemption, Vote)
    pub action_type: ActionType,

    /// Current execution status
    pub status: ActionStatus,

    /// Holder register record date (Record Date)
    pub record_date_timestamp: i64,

    /// Settlement execution date (Payment / Settlement Date)
    pub settlement_timestamp: i64,

    /// Total funds required to pay the holder pool (in settlement token units)
    pub total_entitlement_required: u64,

    /// Total funds actually paid out
    pub total_settled_amount: u64,

    /// Total bonds included in the register snapshot
    pub snapshot_bonds_count: u64,

    /// Number of investors processed
    pub settled_holders_count: u32,

    /// Corporate action funds vault (PDA token account)
    pub vault: Pubkey,

    /// Bump seed of the action account
    pub bump: u8,

    /// Bump seed of the token vault
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct HolderEntitlement {
    /// Corporate action
    pub corporate_action: Pubkey,

    /// Holder wallet address
    pub holder: Pubkey,

    /// Bond balance on the cut-off date (Record Date)
    pub bonds_held: u64,

    /// Calculated entitlement (coupon in USDC or principal to redeem)
    pub entitlement_amount: u64,

    /// Flag: payment / redemption executed
    pub is_settled: bool,

    /// Execution timestamp
    pub settled_timestamp: i64,

    /// Bump seed of the entitlement PDA
    pub bump: u8,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct GovernanceProposal {
    /// Proposal identifier
    pub proposal_id: u64,

    /// Bond instrument
    pub bond_security: Pubkey,

    /// Proposal initiator (issuer or a major holder)
    pub proposer: Pubkey,

    /// Title of the corporate resolution (e.g. "Restructuring: raise the coupon rate to 12.5%")
    #[max_len(96)]
    pub title: String,

    /// Hash of the description and the KASE audit opinion
    pub description_hash: [u8; 32],

    /// Voting start
    pub voting_start: i64,

    /// Voting end
    pub voting_end: i64,

    /// Total weight of "FOR" votes
    pub votes_for: u64,

    /// Total weight of "AGAINST" votes
    pub votes_against: u64,

    /// Total weight of "ABSTAIN" votes
    pub votes_abstain: u64,

    /// Quorum threshold in number of bonds (e.g. 50% of the issue)
    pub quorum_threshold_bonds: u64,

    /// New annual coupon rate if the restructuring is approved (in bps, e.g. 1250 = 12.50%)
    pub new_coupon_rate_bps: u16,

    /// Flag: vote finalized
    pub finalized: bool,

    /// Flag: resolution passed
    pub passed: bool,

    /// Bump seed
    pub bump: u8,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct VoterRecord {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub vote_weight: u64,
    pub choice: VoteChoice,
    pub timestamp: i64,
    pub bump: u8,
}
