import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  createAccount,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { expect } from "chai";
import { sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";

describe("KASE corporate actions — local-validator end-to-end", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.KaseCorporateActions as Program<any>;
  const authority = (provider.wallet as anchor.Wallet).payer;

async function chainTimestamp(connection: any): Promise<number> {
  let slot = await connection.getSlot("confirmed");
  for (let offset = 0; offset < 10 && slot > offset; offset++) {
    const timestamp = await connection.getBlockTime(slot - offset);
    if (timestamp !== null) return timestamp;
  }
  return Math.floor(Date.now() / 1000);
}

async function waitUntilTimestamp(connection: any, targetTimestamp: number, _payer?: any): Promise<void> {
  // The local validator advances its Clock sysvar naturally. Do not call
  // undocumented warpSlot RPCs or submit heartbeat transactions: both can
  // stall blockhash acquisition on some validator releases.
  const targetWallClock = targetTimestamp * 1000 + 1500;
  const remainingMs = targetWallClock - Date.now();
  if (remainingMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingMs));
  }
  // Wait until a confirmed block reports the target timestamp, with a small
  // polling interval and a bounded timeout.
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const slot = await connection.getSlot("confirmed");
    for (let offset = 0; offset < 8 && slot > offset; offset++) {
      const timestamp = await connection.getBlockTime(slot - offset);
      if (timestamp !== null && timestamp >= targetTimestamp) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Validator clock did not reach ${targetTimestamp} within 15 seconds after scheduled time.`);
}

  it("executes a real coupon transfer, governance vote/finalization, and redemption/burn", async () => {
    const connection = provider.connection;
    const now = await chainTimestamp(connection);
    const isin = `KZTEST${now.toString().slice(-8)}`.slice(0, 16);
    const couponActionId = new BN(now + 1);
    const redemptionActionId = new BN(now + 2);
    const governanceActionId = new BN(now + 3);
    const proposalId = new BN(now + 101);
    const couponSettlementAt = now + 30;
    const voteEndsAt = now + 45;
    const maturityAt = now + 60;
    const faceValue = new BN(1_000_000_000); // 1,000 settlement tokens at 6 decimals
    const couponAmount = new BN(50_000_000); // 10% annual coupon, paid semi-annually
    const principalAmount = new BN(1_000_000_000);

    const bondMint = await createMint(
      connection, authority, authority.publicKey, null, 0,
      undefined, undefined, TOKEN_PROGRAM_ID,
    );
    const settlementMint = await createMint(
      connection, authority, authority.publicKey, null, 6,
      undefined, undefined, TOKEN_PROGRAM_ID,
    );
    const holderBond = await getOrCreateAssociatedTokenAccount(
      connection, authority, bondMint, authority.publicKey,
    );
    const holderSettlement = await getOrCreateAssociatedTokenAccount(
      connection, authority, settlementMint, authority.publicKey,
    );
    // Separate funding account so the test proves a real transfer to the holder ATA.
    const funderSettlement = await createAccount(
      connection, authority, settlementMint, authority.publicKey,
    );
    await mintTo(connection, authority, bondMint, holderBond.address, authority, 1);
    await mintTo(
      connection, authority, settlementMint, funderSettlement, authority,
      BigInt(couponAmount.add(principalAmount).toString()),
    );

    const [bondSecurity] = PublicKey.findProgramAddressSync(
      [Buffer.from("bond"), Buffer.from(isin)],
      program.programId,
    );
    const [couponAction] = PublicKey.findProgramAddressSync(
      [Buffer.from("action"), bondSecurity.toBuffer(), couponActionId.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    const [redemptionAction] = PublicKey.findProgramAddressSync(
      [Buffer.from("action"), bondSecurity.toBuffer(), redemptionActionId.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    const [governanceAction] = PublicKey.findProgramAddressSync(
      [Buffer.from("action"), bondSecurity.toBuffer(), governanceActionId.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    const [couponVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), couponAction.toBuffer()], program.programId,
    );
    const [redemptionVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), redemptionAction.toBuffer()], program.programId,
    );
    const [couponEntitlement] = PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), couponAction.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [redemptionEntitlement] = PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), redemptionAction.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [governanceEntitlement] = PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), governanceAction.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [proposal] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), bondSecurity.toBuffer(), proposalId.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    const [voterRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("voter"), proposal.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .initializeBondInstrument(
        isin, faceValue, 1_000, 2, new BN(1), new BN(maturityAt),
      )
      .accounts({
        authority: authority.publicKey,
        issuer: authority.publicKey,
        bondMint,
        settlementMint,
        bondSecurity,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const recordDate = new BN(now - 5);
    await program.methods
      .scheduleCorporateAction(
        couponActionId, { couponPayment: {} }, recordDate, new BN(couponSettlementAt),
      )
      .accounts({
        authority: authority.publicKey, bondSecurity, corporateAction: couponAction,
        actionVault: couponVault, settlementMint, systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID, rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    await program.methods.recordHolderSnapshot(new BN(1)).accounts({
      authority: authority.publicKey, bondSecurity, corporateAction: couponAction,
      holder: authority.publicKey, holderBondAccount: holderBond.address,
      holderEntitlement: couponEntitlement, systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    }).rpc();
    await program.methods.depositActionVault(couponAmount).accounts({
      funder: authority.publicKey, corporateAction: couponAction, actionVault: couponVault,
      funderTokenAccount: funderSettlement, settlementMint, tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();

    await program.methods
      .scheduleCorporateAction(
        redemptionActionId, { bondRedemption: {} }, recordDate, new BN(maturityAt),
      )
      .accounts({
        authority: authority.publicKey, bondSecurity, corporateAction: redemptionAction,
        actionVault: redemptionVault, settlementMint, systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID, rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    await program.methods.recordHolderSnapshot(new BN(1)).accounts({
      authority: authority.publicKey, bondSecurity, corporateAction: redemptionAction,
      holder: authority.publicKey, holderBondAccount: holderBond.address,
      holderEntitlement: redemptionEntitlement, systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    }).rpc();
    await program.methods.depositActionVault(principalAmount).accounts({
      funder: authority.publicKey, corporateAction: redemptionAction, actionVault: redemptionVault,
      funderTokenAccount: funderSettlement, settlementMint, tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();

    await program.methods
      .scheduleCorporateAction(
        governanceActionId, { governanceVoting: {} }, recordDate, new BN(voteEndsAt),
      )
      .accounts({
        authority: authority.publicKey, bondSecurity, corporateAction: governanceAction,
        actionVault: PublicKey.findProgramAddressSync(
          [Buffer.from("action_vault"), governanceAction.toBuffer()], program.programId,
        )[0],
        settlementMint, systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID, rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    await program.methods.recordHolderSnapshot(new BN(1)).accounts({
      authority: authority.publicKey, bondSecurity, corporateAction: governanceAction,
      holder: authority.publicKey, holderBondAccount: holderBond.address,
      holderEntitlement: governanceEntitlement, systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    }).rpc();

    const descriptionHash = Array.from(new Uint8Array(32));
    await program.methods
      .createGovernanceProposal(
        proposalId, "Increase coupon to 12.5%", descriptionHash,
        new BN(now - 5), new BN(voteEndsAt), new BN(1), 1_250,
      )
      .accounts({
        proposer: authority.publicKey, bondSecurity, proposal,
        systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    await program.methods.castBondholderVote({ for: {} }).accounts({
      voter: authority.publicKey, bondSecurity, proposal, corporateAction: governanceAction,
      holderBondAccount: holderBond.address, holderEntitlement: governanceEntitlement,
      voterRecord, systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
    }).rpc();

    // The same wallet cannot cast a second vote for the same proposal.
    try {
      await program.methods.castBondholderVote({ against: {} }).accounts({
        voter: authority.publicKey, bondSecurity, proposal, corporateAction: governanceAction,
        holderBondAccount: holderBond.address, holderEntitlement: governanceEntitlement,
        voterRecord, systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
      }).rpc();
      expect.fail("A duplicate vote should have been rejected by the voter-record PDA.");
    } catch (error: any) {
      expect(String(error?.message || error)).to.match(/already in use|custom program error|already voted|0x0/i);
    }

    const waitUntil = async (timestamp: number) => waitUntilTimestamp(connection, timestamp, authority);

    await waitUntil(couponSettlementAt);
    const beforeCoupon = await connection.getTokenAccountBalance(holderSettlement.address);
    await program.methods.executeCouponPayment().accounts({
      authority: authority.publicKey, bondSecurity, corporateAction: couponAction,
      actionVault: couponVault, holderEntitlement: couponEntitlement,
      holderSettlementAccount: holderSettlement.address, settlementMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();
    const afterCoupon = await connection.getTokenAccountBalance(holderSettlement.address);
    expect(Number(afterCoupon.value.amount) - Number(beforeCoupon.value.amount))
      .to.equal(Number(couponAmount.toString()));
    expect((await program.account.holderEntitlement.fetch(couponEntitlement)).isSettled).to.equal(true);
    try {
      await program.methods.executeCouponPayment().accounts({
        authority: authority.publicKey, bondSecurity, corporateAction: couponAction,
        actionVault: couponVault, holderEntitlement: couponEntitlement,
        holderSettlementAccount: holderSettlement.address, settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).rpc();
      expect.fail("A duplicate coupon claim must be rejected.");
    } catch (error: any) {
      expect(String(error?.message || error)).to.match(/AlreadySettled|already.*settled|custom program error/i);
    }

    await waitUntil(voteEndsAt);
    await program.methods.finalizeGovernanceProposal().accounts({
      authority: authority.publicKey, bondSecurity, proposal,
    }).rpc();
    const finalized = await program.account.governanceProposal.fetch(proposal);
    expect(finalized.finalized).to.equal(true);
    expect(finalized.passed).to.equal(true);
    expect((await program.account.bondSecurity.fetch(bondSecurity)).annualCouponBps).to.equal(1_250);

    await waitUntil(maturityAt);
    const beforeRedemption = await connection.getTokenAccountBalance(holderSettlement.address);
    await program.methods.executeBondRedemption().accounts({
      holder: authority.publicKey, bondSecurity, corporateAction: redemptionAction,
      actionVault: redemptionVault, holderEntitlement: redemptionEntitlement,
      bondMint, holderBondAccount: holderBond.address,
      holderSettlementAccount: holderSettlement.address, settlementMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();
    const afterRedemption = await connection.getTokenAccountBalance(holderSettlement.address);
    expect(Number(afterRedemption.value.amount) - Number(beforeRedemption.value.amount))
      .to.equal(Number(principalAmount.toString()));
    expect((await connection.getTokenAccountBalance(holderBond.address)).value.amount).to.equal("0");
    expect((await program.account.holderEntitlement.fetch(redemptionEntitlement)).isSettled).to.equal(true);
  });
});
