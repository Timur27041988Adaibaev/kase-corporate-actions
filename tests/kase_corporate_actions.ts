import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { KaseCorporateActions } from "../target/types/kase_corporate_actions";

describe("kase_corporate_actions local-validator integration", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.KaseCorporateActions as anchor.Program<KaseCorporateActions>;
  const payer = (provider.wallet as unknown as { payer: Keypair }).payer;
  const authority = provider.wallet.publicKey;
  const isin = "KZTEST000001";
  const actionId = new anchor.BN(101);
  const proposalId = new anchor.BN(101);

  let bondMint: PublicKey;
  let settlementMint: PublicKey;
  let bondSecurity: PublicKey;
  let corporateAction: PublicKey;
  let actionVault: PublicKey;
  let proposal: PublicKey;
  let holder: Keypair;
  let holderBondAccount: PublicKey;
  let holderSettlementAccount: PublicKey;
  let funderSettlementAccount: PublicKey;
  let holderEntitlement: PublicKey;
  let settlementTimestamp: number;

  before(async () => {
    bondMint = await createMint(provider.connection, payer, authority, null, 0);
    settlementMint = await createMint(provider.connection, payer, authority, null, 6);
    holder = Keypair.generate();
    const holderAirdrop = await provider.connection.requestAirdrop(holder.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(holderAirdrop, "confirmed");
    const holderBondAta = await getOrCreateAssociatedTokenAccount(provider.connection, payer, bondMint, holder.publicKey);
    const holderSettlementAta = await getOrCreateAssociatedTokenAccount(provider.connection, payer, settlementMint, holder.publicKey);
    const funderSettlementAta = await getOrCreateAssociatedTokenAccount(provider.connection, payer, settlementMint, authority);
    holderBondAccount = holderBondAta.address;
    holderSettlementAccount = holderSettlementAta.address;
    funderSettlementAccount = funderSettlementAta.address;
    await mintTo(provider.connection, payer, bondMint, holderBondAccount, payer, 10);
    await mintTo(provider.connection, payer, settlementMint, funderSettlementAccount, payer, 500_000_000);

    [bondSecurity] = PublicKey.findProgramAddressSync(
      [Buffer.from("bond"), Buffer.from(isin)],
      program.programId,
    );

    [holderEntitlement] = PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), corporateAction.toBuffer(), holder.publicKey.toBuffer()],
      program.programId,
    );

    const actionIdBytes = actionId.toArrayLike(Buffer, "le", 8);
    [corporateAction] = PublicKey.findProgramAddressSync(
      [Buffer.from("action"), bondSecurity.toBuffer(), actionIdBytes],
      program.programId,
    );
    [actionVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), corporateAction.toBuffer()],
      program.programId,
    );

    const proposalIdBytes = proposalId.toArrayLike(Buffer, "le", 8);
    [proposal] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), bondSecurity.toBuffer(), proposalIdBytes],
      program.programId,
    );
  });

  it("registers a bond instrument on the local validator", async () => {
    const maturity = Math.floor(Date.now() / 1000) + 3600;

    await program.methods
      .initializeBondInstrument(
        isin,
        new anchor.BN(1_000_000_000),
        1000,
        2,
        new anchor.BN(100),
        new anchor.BN(maturity),
      )
      .accounts({
        authority,
        issuer: authority,
        bondMint,
        settlementMint,
        bondSecurity,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const bond = await program.account.bondSecurity.fetch(bondSecurity);
    expect(bond.isin).to.equal(isin);
    expect(bond.activeSupply.toString()).to.equal("100");
    expect(bond.annualCouponBps).to.equal(1000);
  });

  it("schedules a corporate action and initializes its vault", async () => {
    const now = Math.floor(Date.now() / 1000);

    await program.methods
      .scheduleCorporateAction(
        actionId,
        { couponPayment: {} } as never,
        new anchor.BN(now - 60),
        new anchor.BN(now + 600),
      )
      .accounts({
        authority,
        bondSecurity,
        corporateAction,
        actionVault,
        settlementMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const action = await program.account.corporateAction.fetch(corporateAction);
    expect(action.actionId.toString()).to.equal(actionId.toString());
    expect(action.bondSecurity.equals(bondSecurity)).to.equal(true);
    expect(action.vault.equals(actionVault)).to.equal(true);
  });

  it("snapshots a real token balance, funds the vault, and pays a coupon on-chain", async () => {
    await program.methods
      .recordHolderSnapshot(new anchor.BN(10))
      .accounts({
        authority,
        bondSecurity,
        corporateAction,
        holder: holder.publicKey,
        holderBondAccount,
        holderEntitlement,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const entitlement = await program.account.holderEntitlement.fetch(holderEntitlement);
    expect(entitlement.bondsHeld.toString()).to.equal("10");
    expect(entitlement.entitlementAmount.toString()).to.equal("500000000");

    await program.methods
      .depositActionVault(new anchor.BN(500_000_000))
      .accounts({
        funder: authority,
        corporateAction,
        actionVault,
        funderTokenAccount: funderSettlementAccount,
        settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const delayMs = Math.max(0, settlementTimestamp * 1000 - Date.now() + 1500);
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));

    await program.methods
      .executeCouponPayment()
      .accounts({
        authority,
        bondSecurity,
        corporateAction,
        actionVault,
        holderEntitlement,
        holderSettlementAccount,
        settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const paidEntitlement = await program.account.holderEntitlement.fetch(holderEntitlement);
    const paidAction = await program.account.corporateAction.fetch(corporateAction);
    const holderBalance = await provider.connection.getTokenAccountBalance(holderSettlementAccount);
    expect(paidEntitlement.isSettled).to.equal(true);
    expect(paidAction.totalSettledAmount.toString()).to.equal("500000000");
    expect(holderBalance.value.amount).to.equal("500000000");
  });

  it("creates a governance proposal on-chain", async () => {
    const now = Math.floor(Date.now() / 1000);
    const descriptionHash = Array.from({ length: 32 }, (_, i) => i);

    await program.methods
      .createGovernanceProposal(
        proposalId,
        "Test proposal: coupon adjustment",
        descriptionHash,
        new anchor.BN(now - 30),
        new anchor.BN(now + 600),
        new anchor.BN(50),
        1250,
      )
      .accounts({
        proposer: authority,
        bondSecurity,
        proposal,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const result = await program.account.governanceProposal.fetch(proposal);
    expect(result.proposalId.toString()).to.equal(proposalId.toString());
    expect(result.title).to.equal("Test proposal: coupon adjustment");
    expect(result.newCouponRateBps).to.equal(1250);
    expect(result.finalized).to.equal(false);
  });
});
