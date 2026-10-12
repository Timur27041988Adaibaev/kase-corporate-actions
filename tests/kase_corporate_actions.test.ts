import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import BN from "bn.js";

describe("KASE Corporate Actions on Solana: Formal & Adversarial Verification", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // We load or mock-free declare program types
  const program = anchor.workspace.KaseCorporateActions as Program<any>;

  let authority = anchor.web3.Keypair.generate(); // KASE CSD
  let issuer = anchor.web3.Keypair.generate();    // Demo Issuer JSC
  let bankA = anchor.web3.Keypair.generate();     // Institutional Holder 1 (Bank A)
  let bankB = anchor.web3.Keypair.generate();     // Institutional Holder 2 (Bank B)
  let hacker = anchor.web3.Keypair.generate();    // Adversary

  let settlementMint: anchor.web3.PublicKey; // USDC Mint (6 decimals)
  let bondMint: anchor.web3.PublicKey;       // Bond SPL Mint (0 decimals)

  let issuerSettlementAccount: anchor.web3.PublicKey;
  let bankABondAccount: anchor.web3.PublicKey;
  let bankASettlementAccount: anchor.web3.PublicKey;
  let bankBBondAccount: anchor.web3.PublicKey;
  let bankBSettlementAccount: anchor.web3.PublicKey;
  let hackerSettlementAccount: anchor.web3.PublicKey;

  const isin = "KZDEMO000001";
  const faceValue = new BN(1_000_000_000); // $1,000 in USDC (6 dec)
  const annualCouponBps = 1000;            // 10.00% p.a.
  const couponsPerYear = 2;                // Semi-annual
  const totalSupply = new BN(10000);       // 10,000 bonds = $10M

  let bondSecurityPda: anchor.web3.PublicKey;
  let couponActionPda: anchor.web3.PublicKey;
  let couponVaultPda: anchor.web3.PublicKey;
  let bankAEntitlementPda: anchor.web3.PublicKey;

  let redemptionActionPda: anchor.web3.PublicKey;
  let redemptionVaultPda: anchor.web3.PublicKey;
  let bankARedemptionPda: anchor.web3.PublicKey;

  let proposalPda: anchor.web3.PublicKey;
  let bankAVoterRecordPda: anchor.web3.PublicKey;

  const couponActionId = new BN(202601);
  const redemptionActionId = new BN(202699);
  const proposalId = new BN(101);

  before(async () => {
    // 1. Airdrop SOL to test actors
    for (const kp of [authority, issuer, bankA, bankB, hacker]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    // 2. Create Mints (Settlement USDC: 6 decimals, Bond: 0 decimals)
    settlementMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      6
    );

    bondMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      0
    );

    // 3. Create Token Accounts
    issuerSettlementAccount = await createAccount(
      provider.connection,
      issuer,
      settlementMint,
      issuer.publicKey
    );

    bankABondAccount = await createAccount(
      provider.connection,
      bankA,
      bondMint,
      bankA.publicKey
    );
    bankASettlementAccount = await createAccount(
      provider.connection,
      bankA,
      settlementMint,
      bankA.publicKey
    );

    bankBBondAccount = await createAccount(
      provider.connection,
      bankB,
      bondMint,
      bankB.publicKey
    );
    bankBSettlementAccount = await createAccount(
      provider.connection,
      bankB,
      settlementMint,
      bankB.publicKey
    );

    hackerSettlementAccount = await createAccount(
      provider.connection,
      hacker,
      settlementMint,
      hacker.publicKey
    );

    // 4. Distribute initial balances
    // Mint 500,000 USDC to Issuer for coupon payouts ($500k)
    await mintTo(
      provider.connection,
      authority,
      settlementMint,
      issuerSettlementAccount,
      authority.publicKey,
      500_000_000_000 // $500,000 USDC
    );

    // Mint Bond tokens to holders:
    // Bank A: 3,500 bonds ($3.5M nominal)
    await mintTo(
      provider.connection,
      authority,
      bondMint,
      bankABondAccount,
      authority.publicKey,
      3500
    );

    // Bank B: 2,500 bonds ($2.5M nominal)
    await mintTo(
      provider.connection,
      authority,
      bondMint,
      bankBBondAccount,
      authority.publicKey,
      2500
    );

    // 5. Derive PDAs
    [bondSecurityPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bond"), Buffer.from(isin)],
      program.programId
    );

    [couponActionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("action"),
        bondSecurityPda.toBuffer(),
        couponActionId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [couponVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), couponActionPda.toBuffer()],
      program.programId
    );

    [bankAEntitlementPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("entitlement"),
        couponActionPda.toBuffer(),
        bankA.publicKey.toBuffer(),
      ],
      program.programId
    );

    [redemptionActionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("action"),
        bondSecurityPda.toBuffer(),
        redemptionActionId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [redemptionVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), redemptionActionPda.toBuffer()],
      program.programId
    );

    [bankARedemptionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("entitlement"),
        redemptionActionPda.toBuffer(),
        bankA.publicKey.toBuffer(),
      ],
      program.programId
    );

    [proposalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        bondSecurityPda.toBuffer(),
        proposalId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [bankAVoterRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        proposalPda.toBuffer(),
        bankA.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("Step 1: KASE CSD registers bond instrument KZDEMO000001", async () => {
    const maturity = new anchor.BN(Math.floor(Date.now() / 1000) + 60); // Leave enough time for the initialization transaction to confirm

    await program.methods
      .initializeBondInstrument(
        isin,
        faceValue,
        annualCouponBps,
        couponsPerYear,
        totalSupply,
        maturity
      )
      .accounts({
        authority: authority.publicKey,
        issuer: issuer.publicKey,
        bondMint: bondMint,
        settlementMint: settlementMint,
        bondSecurity: bondSecurityPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    const bondState = await program.account.bondSecurity.fetch(bondSecurityPda);
    assert.equal(bondState.isin, isin);
    assert.equal(bondState.annualCouponBps, 1000);
    assert.equal(bondState.couponsPerYear, 2);
    assert.equal(bondState.activeSupply.toString(), "10000");
  });

  // ==========================================
  // SCENARIO 1: COUPON PAYMENT EXECUTION
  // ==========================================

  it("Step 2 [Scenario 1]: Schedule Coupon Corporate Action #202601", async () => {
    const recordDate = new anchor.BN(Math.floor(Date.now() / 1000) - 100);
    const settlementDate = new anchor.BN(Math.floor(Date.now() / 1000) + 60);

    await program.methods
      .scheduleCorporateAction(
        couponActionId,
        { couponPayment: {} },
        recordDate,
        settlementDate
      )
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: couponActionPda,
        actionVault: couponVaultPda,
        settlementMint: settlementMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    const actionState = await program.account.corporateAction.fetch(couponActionPda);
    assert.deepEqual(actionState.actionType, { couponPayment: {} });
  });

  it("Pass [Adversarial Attack]: Reject inflated holder snapshot above real SPL balance", async () => {
    try {
      await program.methods
        .recordHolderSnapshot(new BN(3501))
        .accounts({
          authority: authority.publicKey,
          bondSecurity: bondSecurityPda,
          corporateAction: couponActionPda,
          holder: bankA.publicKey,
          holderBondAccount: bankABondAccount,
          holderEntitlement: bankAEntitlementPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();
      assert.fail("Snapshot must not exceed the holder's real token balance.");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidHolderTokenAccount");
    }
  });

  it("Step 3 [Scenario 1]: Record Snapshot for Bank A (3,500 bonds = $175,000 coupon entitlement)", async () => {
    const bondsHeld = new BN(3500);

    await program.methods
      .recordHolderSnapshot(bondsHeld)
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: couponActionPda,
        holder: bankA.publicKey,
        holderBondAccount: bankABondAccount,
        holderEntitlement: bankAEntitlementPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    const entState = await program.account.holderEntitlement.fetch(bankAEntitlementPda);
    // Calculation: 3,500 * $1,000 * 10% / 2 = $175,000 USDC = 175,000,000,000 raw
    const expectedCoupon = new BN(175_000_000_000);
    assert.equal(
      entState.entitlementAmount.toString(),
      expectedCoupon.toString(),
      "Coupon entitlement must be exactly $175,000 USDC"
    );
    assert.equal(entState.isSettled, false);
  });

  it("Pass [Adversarial Attack]: Reject aggregate holder snapshots above active bond supply", async () => {
    // Bank B's real SPL balance is increased, but the aggregate snapshot must
    // still be capped by the instrument's registered active supply.
    await mintTo(
      provider.connection,
      authority,
      bondMint,
      bankBBondAccount,
      authority.publicKey,
      7000
    );
    const [bankBCouponEntitlementPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), couponActionPda.toBuffer(), bankB.publicKey.toBuffer()],
      program.programId
    );
    try {
      await program.methods
        .recordHolderSnapshot(new BN(6501))
        .accounts({
          authority: authority.publicKey,
          bondSecurity: bondSecurityPda,
          corporateAction: couponActionPda,
          holder: bankB.publicKey,
          holderBondAccount: bankBBondAccount,
          holderEntitlement: bankBCouponEntitlementPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();
      assert.fail("Aggregate snapshot must not exceed registered active supply.");
    } catch (err: any) {
      expect(err.toString()).to.include("SnapshotExceedsActiveSupply");
    }
  });

  it("Step 4 [Scenario 1]: Issuer deposits $200,000 USDC to Action Vault PDA", async () => {
    const depositAmount = new BN(200_000_000_000); // 200,000 USDC

    await program.methods
      .depositActionVault(depositAmount)
      .accounts({
        funder: issuer.publicKey,
        corporateAction: couponActionPda,
        actionVault: couponVaultPda,
        funderTokenAccount: issuerSettlementAccount,
        settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([issuer])
      .rpc();

    const vaultAccount = await getAccount(provider.connection, couponVaultPda);
    assert.equal(vaultAccount.amount.toString(), depositAmount.toString());
  });

  it("Step 5 [Scenario 1]: Execute Coupon Settlement to Bank A ($175,000 USDC transferred)", async () => {
    const couponActionState = await program.account.corporateAction.fetch(couponActionPda);
    const couponWaitMs = couponActionState.settlementTimestamp.toNumber() * 1000 - Date.now() + 250;
    if (couponWaitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, couponWaitMs));
    }
    const balBefore = (await getAccount(provider.connection, bankASettlementAccount)).amount;

    await program.methods
      .executeCouponPayment()
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: couponActionPda,
        actionVault: couponVaultPda,
        holderEntitlement: bankAEntitlementPda,
        holderSettlementAccount: bankASettlementAccount,
        settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([authority])
      .rpc();

    const balAfter = (await getAccount(provider.connection, bankASettlementAccount)).amount;
    const diff = balAfter - balBefore;
    assert.equal(diff.toString(), "175000000000", "Bank A received exactly $175,000 in coupon");

    const entState = await program.account.holderEntitlement.fetch(bankAEntitlementPda);
    assert.equal(entState.isSettled, true, "Payment status must be isSettled=true");
  });

  it("Pass [Adversarial Attack]: Repeat coupon claim attempt (Double-Claim Attack) blocked", async () => {
    try {
      await program.methods
        .executeCouponPayment()
        .accounts({
          authority: authority.publicKey,
          bondSecurity: bondSecurityPda,
          corporateAction: couponActionPda,
          actionVault: couponVaultPda,
          holderEntitlement: bankAEntitlementPda,
          holderSettlementAccount: bankASettlementAccount,
          settlementMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([authority])
        .rpc();
      assert.fail("A repeat coupon payout must be blocked!");
    } catch (err: any) {
      expect(err.toString()).to.include("AlreadySettled");
    }
  });

  it("Pass [Adversarial Attack]: Payout attempt before the settlement date (Premature Coupon) blocked", async () => {
    const futureActionId = new BN(202602);
    const [futureActionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("action"),
        bondSecurityPda.toBuffer(),
        futureActionId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    const [futureVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), futureActionPda.toBuffer()],
      program.programId
    );
    const [futureEntitlementPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("entitlement"),
        futureActionPda.toBuffer(),
        bankB.publicKey.toBuffer(),
      ],
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .scheduleCorporateAction(
        futureActionId,
        { couponPayment: {} },
        new anchor.BN(now - 100),
        new anchor.BN(now + 86400) // Settlement date in the future
      )
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: futureActionPda,
        actionVault: futureVaultPda,
        settlementMint: settlementMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    await program.methods
      .recordHolderSnapshot(new BN(2500))
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: futureActionPda,
        holder: bankB.publicKey,
        holderBondAccount: bankBBondAccount,
        holderEntitlement: futureEntitlementPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    await program.methods
      .depositActionVault(new BN(125_000_000_000))
      .accounts({
        funder: issuer.publicKey,
        corporateAction: futureActionPda,
        actionVault: futureVaultPda,
        funderTokenAccount: issuerSettlementAccount,
        settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([issuer])
      .rpc();

    try {
      await program.methods
        .executeCouponPayment()
        .accounts({
          authority: authority.publicKey,
          bondSecurity: bondSecurityPda,
          corporateAction: futureActionPda,
          actionVault: futureVaultPda,
          holderEntitlement: futureEntitlementPda,
          holderSettlementAccount: bankBSettlementAccount,
          settlementMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([authority])
        .rpc();
      assert.fail("A coupon payout before the settlement date must be rejected!");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidSettlementDate");
    }
  });

  // ==========================================
  // SCENARIO 2: BOND REDEMPTION & TOKEN BURN
  // ==========================================

  it("Step 6 [Scenario 2]: Schedule Redemption Corporate Action #202699 & Deposit Principal", async () => {
    const recordDate = new anchor.BN(Math.floor(Date.now() / 1000) - 100);
    const settlementDate = new anchor.BN(Math.floor(Date.now() / 1000) + 60);

    await program.methods
      .scheduleCorporateAction(
        redemptionActionId,
        { bondRedemption: {} },
        recordDate,
        settlementDate
      )
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: redemptionActionPda,
        actionVault: redemptionVaultPda,
        settlementMint: settlementMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    // Snapshot Bank A for 3,500 bonds redemption ($3,500,000 principal)
    await program.methods
      .recordHolderSnapshot(new BN(3500))
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: redemptionActionPda,
        holder: bankA.publicKey,
        holderBondAccount: bankABondAccount,
        holderEntitlement: bankARedemptionPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    // Fund redemption vault: 3,500 bonds * $1,000 = $3,500,000 USDC
    await mintTo(
      provider.connection,
      authority,
      settlementMint,
      redemptionVaultPda,
      authority.publicKey,
      3_500_000_000_000
    );
  });

  it("Step 7 [Scenario 2]: Execute Redemption -> Burn 3,500 Bond Tokens & Pay $3,500,000 Principal", async () => {
    const bondCheck = await program.account.bondSecurity.fetch(bondSecurityPda);
    const redemptionActionState = await program.account.corporateAction.fetch(redemptionActionPda);
    const earliestExecution = Math.max(
      bondCheck.maturityTimestamp.toNumber(),
      redemptionActionState.settlementTimestamp.toNumber()
    );
    const waitMs = earliestExecution * 1000 - Date.now() + 250;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const bondsBefore = (await getAccount(provider.connection, bankABondAccount)).amount;
    const usdcBefore = (await getAccount(provider.connection, bankASettlementAccount)).amount;

    await program.methods
      .executeBondRedemption()
      .accounts({
        holder: bankA.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: redemptionActionPda,
        actionVault: redemptionVaultPda,
        holderEntitlement: bankARedemptionPda,
        bondMint: bondMint,
        holderBondAccount: bankABondAccount,
        holderSettlementAccount: bankASettlementAccount,
        settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bankA])
      .rpc();

    const bondsAfter = (await getAccount(provider.connection, bankABondAccount)).amount;
    const usdcAfter = (await getAccount(provider.connection, bankASettlementAccount)).amount;

    assert.equal((bondsBefore - bondsAfter).toString(), "3500", "Exactly 3,500 bonds burned");
    assert.equal((usdcAfter - usdcBefore).toString(), "3500000000000", "Bank A received $3,500,000");

    const bondState = await program.account.bondSecurity.fetch(bondSecurityPda);
    assert.equal(bondState.activeSupply.toString(), "6500", "6,500 bonds remain outstanding");
  });

  // ==========================================
  // SCENARIO 3: BONDHOLDER GOVERNANCE VOTING
  // ==========================================

  it("Step 8 [Scenario 3]: Create Restructuring Proposal #101", async () => {
    const now = Math.floor(Date.now() / 1000);
    const votingStart = new anchor.BN(now - 100);
    const votingEnd = new anchor.BN(now + 180);
    const quorumThreshold = new anchor.BN(2000); // 2,000 bonds quorum

    const title = "Restructure: Increase Coupon to 12.5% p.a.";
    const descHash = new Array(32).fill(42);

    await program.methods
      .createGovernanceProposal(
        proposalId,
        title,
        descHash,
        votingStart,
        votingEnd,
        quorumThreshold,
        1250
      )
      .accounts({
        proposer: issuer.publicKey,
        bondSecurity: bondSecurityPda,
        proposal: proposalPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([issuer])
      .rpc();

    const prop = await program.account.governanceProposal.fetch(proposalPda);
    assert.equal(prop.title, title);
    assert.equal(prop.quorumThresholdBonds.toString(), "2000");

    // Create a dedicated on-chain governance action and a real token-backed
    // snapshot for Bank B; coupon entitlements must not be reusable as votes.
    const governanceActionId = new BN(202603);
    const [governanceActionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action"), bondSecurityPda.toBuffer(), governanceActionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [governanceVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), governanceActionPda.toBuffer()],
      program.programId
    );
    const [bankBGovernanceEntitlementPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), governanceActionPda.toBuffer(), bankB.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .scheduleCorporateAction(
        governanceActionId,
        { governanceVoting: {} },
        new anchor.BN(now - 100),
        new anchor.BN(now + 180)
      )
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: governanceActionPda,
        actionVault: governanceVaultPda,
        settlementMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();
    await program.methods
      .recordHolderSnapshot(new BN(2500))
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        corporateAction: governanceActionPda,
        holder: bankB.publicKey,
        holderBondAccount: bankBBondAccount,
        holderEntitlement: bankBGovernanceEntitlementPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();
  });

  it("Step 9 [Scenario 3]: Bank B votes 'FOR' with 2,500 bonds weight", async () => {
    const governanceActionId = new BN(202603);
    const [governanceActionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action"), bondSecurityPda.toBuffer(), governanceActionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [bankBGovernanceEntitlementPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), governanceActionPda.toBuffer(), bankB.publicKey.toBuffer()],
      program.programId
    );
    const [bankBVoterPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), proposalPda.toBuffer(), bankB.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .castBondholderVote({ for: {} })
      .accounts({
        voter: bankB.publicKey,
        bondSecurity: bondSecurityPda,
        proposal: proposalPda,
        corporateAction: governanceActionPda,
        holderBondAccount: bankBBondAccount,
        holderEntitlement: bankBGovernanceEntitlementPda,
        voterRecord: bankBVoterPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([bankB])
      .rpc();

    const prop = await program.account.governanceProposal.fetch(proposalPda);
    assert.equal(prop.votesFor.toString(), "2500");
  });

  it("Pass [Adversarial Attack]: Double Voting attempt blocked", async () => {
    const governanceActionId = new BN(202603);
    const [governanceActionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action"), bondSecurityPda.toBuffer(), governanceActionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [bankBGovernanceEntitlementPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), governanceActionPda.toBuffer(), bankB.publicKey.toBuffer()],
      program.programId
    );
    const [bankBVoterPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), proposalPda.toBuffer(), bankB.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .castBondholderVote({ for: {} })
        .accounts({
          voter: bankB.publicKey,
          bondSecurity: bondSecurityPda,
          proposal: proposalPda,
          corporateAction: governanceActionPda,
          holderBondAccount: bankBBondAccount,
          holderEntitlement: bankBGovernanceEntitlementPda,
          voterRecord: bankBVoterPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([bankB])
        .rpc();
      assert.fail("Bank B's repeat vote must be blocked!");
    } catch (err: any) {
      // PDA collision prevents re-initialization
      const errStr = err.toString();
      expect(errStr.includes("0x0") || errStr.includes("already in use") || errStr.includes("custom program error")).to.be.true;
    }
  });

  it("Pass [Adversarial Attack]: Unauthorized action scheduling by an attacker blocked", async () => {
    const fakeActionId = new BN(999999);
    const [fakeActionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("action"),
        bondSecurityPda.toBuffer(),
        fakeActionId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    const [fakeVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), fakeActionPda.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .scheduleCorporateAction(
          fakeActionId,
          { couponPayment: {} },
          new anchor.BN(Math.floor(Date.now() / 1000)),
          new anchor.BN(Math.floor(Date.now() / 1000) + 86400)
        )
        .accounts({
          authority: hacker.publicKey,
          bondSecurity: bondSecurityPda,
          corporateAction: fakeActionPda,
          actionVault: fakeVaultPda,
          settlementMint: settlementMint,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([hacker])
        .rpc();
      assert.fail("An attacker must not be able to schedule actions!");
    } catch (err: any) {
      expect(err.toString()).to.include("UnauthorizedAuthority");
    }
  });

  it("Pass [Adversarial Attack]: Unauthorized resolution approval by an attacker blocked", async () => {
    try {
      await program.methods
        .finalizeGovernanceProposal()
        .accounts({
          authority: hacker.publicKey,
          bondSecurity: bondSecurityPda,
          proposal: proposalPda,
        })
        .signers([hacker])
        .rpc();
      assert.fail("An attacker must not be able to approve a vote!");
    } catch (err: any) {
      expect(err.toString()).to.include("UnauthorizedAuthority");
    }
  });

  it("Step 10 [Scenario 3]: Finalize Proposal -> Quorum Met & Passed (2500 > 2000)", async () => {
    const currentProposal = await program.account.governanceProposal.fetch(proposalPda);
    const waitMs = currentProposal.votingEnd.toNumber() * 1000 - Date.now() + 250;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    await program.methods
      .finalizeGovernanceProposal()
      .accounts({
        authority: authority.publicKey,
        bondSecurity: bondSecurityPda,
        proposal: proposalPda,
      })
      .signers([authority])
      .rpc();

    const prop = await program.account.governanceProposal.fetch(proposalPda);
    assert.equal(prop.finalized, true);
    assert.equal(prop.passed, true);

    const bondState = await program.account.bondSecurity.fetch(bondSecurityPda);
    assert.equal(bondState.annualCouponBps, 1250, "Coupon rate must update to 12.5% (1250 bps)");
  });

  it("Pass [Adversarial Attack]: Scheduling an action on a matured bond (BondAlreadyMatured) blocked", async () => {
    const maturedIsin = "KZDEMO000002";
    const [maturedBondPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bond"), Buffer.from(maturedIsin)],
      program.programId
    );
    let testMaturityTimestamp: number;
    let testMaturity: anchor.BN;
    const testBondMint = await createMint(provider.connection, authority, authority.publicKey, null, 0);
    const holderAcc = await createAccount(provider.connection, bankA, testBondMint, bankA.publicKey);
    await mintTo(provider.connection, authority, testBondMint, holderAcc, authority.publicKey, 1);
    testMaturityTimestamp = Math.floor(Date.now() / 1000) + 60;
    testMaturity = new anchor.BN(testMaturityTimestamp);

    await program.methods
      .initializeBondInstrument(
        maturedIsin,
        faceValue,
        annualCouponBps,
        couponsPerYear,
        new BN(1),
        testMaturity
      )
      .accounts({
        authority: authority.publicKey,
        issuer: issuer.publicKey,
        bondMint: testBondMint,
        settlementMint: settlementMint,
        bondSecurity: maturedBondPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    const testActionId = new BN(202677);
    const [testActionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action"), maturedBondPda.toBuffer(), testActionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [testVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), testActionPda.toBuffer()],
      program.programId
    );
    const [testEntitlementPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), testActionPda.toBuffer(), bankA.publicKey.toBuffer()],
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .scheduleCorporateAction(
        testActionId,
        { bondRedemption: {} },
        new anchor.BN(now - 20),
        new anchor.BN(testMaturityTimestamp)
      )
      .accounts({
        authority: authority.publicKey,
        bondSecurity: maturedBondPda,
        corporateAction: testActionPda,
        actionVault: testVaultPda,
        settlementMint: settlementMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    await program.methods
      .recordHolderSnapshot(new BN(1))
      .accounts({
        authority: authority.publicKey,
        bondSecurity: maturedBondPda,
        corporateAction: testActionPda,
        holder: bankA.publicKey,
        holderBondAccount: holderAcc,
        holderEntitlement: testEntitlementPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    await mintTo(provider.connection, authority, settlementMint, testVaultPda, authority.publicKey, 1_000_000_000);

    // Wait until the valid future maturity timestamp before redemption.
    const maturityWaitMs = testMaturityTimestamp * 1000 - Date.now() + 250;
    if (maturityWaitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, maturityWaitMs));
    }

    // Redeem single bond so activeSupply reaches 0 and is_matured = true
    await program.methods
      .executeBondRedemption()
      .accounts({
        holder: bankA.publicKey,
        bondSecurity: maturedBondPda,
        corporateAction: testActionPda,
        actionVault: testVaultPda,
        holderEntitlement: testEntitlementPda,
        bondMint: testBondMint,
        holderBondAccount: holderAcc,
        holderSettlementAccount: bankASettlementAccount,
        settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bankA])
      .rpc();

    const maturedState = await program.account.bondSecurity.fetch(maturedBondPda);
    assert.equal(maturedState.isMatured, true);

    // Now attempt to schedule another corporate action on the matured bond
    const nextActionId = new BN(202678);
    const [nextActionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action"), maturedBondPda.toBuffer(), nextActionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [nextVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), nextActionPda.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .scheduleCorporateAction(
          nextActionId,
          { couponPayment: {} },
          new anchor.BN(now - 10),
          new anchor.BN(now - 5)
        )
        .accounts({
          authority: authority.publicKey,
          bondSecurity: maturedBondPda,
          corporateAction: nextActionPda,
          actionVault: nextVaultPda,
          settlementMint: settlementMint,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();
      assert.fail("Scheduling a corporate action on a matured bond must be blocked!");
    } catch (err: any) {
      expect(err.toString()).to.include("BondAlreadyMatured");
    }
  });
});
