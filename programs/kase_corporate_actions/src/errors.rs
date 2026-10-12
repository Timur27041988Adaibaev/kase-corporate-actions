use anchor_lang::prelude::*;

#[error_code]
pub enum KaseError {
    #[msg("Bond face value must be greater than zero.")]
    InvalidFaceValue,

    #[msg("Annual coupon rate cannot exceed 100% (10000 bps).")]
    InvalidCouponRate,

    #[msg("Coupon payment frequency must be 1, 2, 4 or 12 times per year.")]
    InvalidCouponFrequency,

    #[msg("Instrument maturity date must be in the future.")]
    InvalidMaturityDate,

    #[msg("The corporate action date has not been reached yet.")]
    RecordDateNotReached,

    #[msg("Bond is already matured/redeemed.")]
    BondAlreadyMatured,

    #[msg("Bond maturity date has not been reached yet.")]
    MaturityNotReached,

    #[msg("Insufficient funds in the corporate action vault.")]
    InsufficientVaultFunds,

    #[msg("Investor balance on the record date is zero.")]
    ZeroHolderBalance,

    #[msg("Entitlement already claimed/settled.")]
    AlreadySettled,

    #[msg("Investor token account does not match the expected owner.")]
    InvalidHolderTokenAccount,

    #[msg("Token account does not match the settlement currency mint or the bond mint.")]
    InvalidTokenMint,

    #[msg("Unauthorized to perform this action (KASE / Issuer / CSD only).")]
    UnauthorizedAuthority,

    #[msg("Voting on this proposal has already ended or has not started yet.")]
    VotingPeriodClosed,

    #[msg("Investor has already voted on this proposal (double voting prevented).")]
    AlreadyVoted,

    #[msg("Quorum for the decision has not been reached.")]
    QuorumNotMet,

    #[msg("Proposal has already been executed on the exchange.")]
    ProposalAlreadyExecuted,

    #[msg("Math overflow while computing financial parameters.")]
    MathOverflow,

    #[msg("Invalid corporate action status.")]
    InvalidActionStatus,

    #[msg("Invalid ISIN: bond ISIN code cannot be empty or longer than 16 characters.")]
    InvalidIsin,

    #[msg("Proposal title cannot be empty or exceed 96 characters.")]
    InvalidProposalTitle,

    #[msg("Settlement date cannot precede the record date.")]
    InvalidSettlementDate,

    #[msg("Attempt to reuse a vote or register mismatch (vote recycling prevented).")]
    VoteRecyclingForbidden,

    #[msg("Governance quorum threshold must be positive and cannot exceed total bond supply.")]
    InvalidQuorumThreshold,

    #[msg("Aggregate holder snapshots cannot exceed the instrument's active bond supply.")]
    SnapshotExceedsActiveSupply,
}
