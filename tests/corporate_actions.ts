import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { expect } from "chai";

describe("KASE corporate actions — real local-validator settlement", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.KaseCorporateActions as Program<any>;
  const authority = (provider.wallet as anchor.Wallet).payer;

  it("initializes a bond, snapshots a holder, funds the PDA vault, and pays a coupon", async () => {
    const connection = provider.connection;
    const holder = Keypair.generate();
    const now = Math.floor(Date.now() / 1000);
    const isin = `KZTEST${now.toString().slice(-8)}`.slice(0, 16);
    const actionId = new BN(now);
    const faceValue = new BN(1_000_000_000); // 1,000 settlement tokens at 6 decimals
    const couponBps = 1_000;
    const couponsPerYear = 2;
    const supply = new BN(1);
    const maturity = new BN(now + 86_400);

    const bondMint = await createMint(
      connection,
      authority,
      authority.publicKey,
      null,
      0,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID,
    );
    const settlementMint = await createMint(
      connection,
      authority,
      authority.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID,
    );

    const holderBond = await getOrCreateAssociatedTokenAccount(
      connection, authority, bondMint, holder.publicKey,
    );
    const funderSettlement = await getOrCreateAssociatedTokenAccount(
      connection, authority, settlementMint, authority.publicKey,
    );
    const holderSettlement = await getOrCreateAssociatedTokenAccount(
      connection, authority, settlementMint, holder.publicKey,
    );

    await mintTo(connection, authority, bondMint, holderBond.address, authority, 1);
    const couponAmount = new BN(50_000_000); // 1 bond × 1,000 × 10% / 2, in 6-decimal units
    await mintTo(
      connection, authority, settlementMint, funderSettlement.address, authority,
      BigInt(couponAmount.toString()),
    );

    const [bondSecurity] = PublicKey.findProgramAddressSync(
      [Buffer.from("bond"), Buffer.from(isin)],
      program.programId,
    );
    const [corporateAction] = PublicKey.findProgramAddressSync(
      [Buffer.from("action"), bondSecurity.toBuffer(), actionId.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    const [actionVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("action_vault"), corporateAction.toBuffer()],
      program.programId,
    );
    const [holderEntitlement] = PublicKey.findProgramAddressSync(
      [Buffer.from("entitlement"), corporateAction.toBuffer(), holder.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .initializeBondInstrument(isin, faceValue, couponBps, couponsPerYear, supply, maturity)
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
    const settlementDate = new BN(now + 30);
    await program.methods
      .scheduleCorporateAction(
        actionId,
        { couponPayment: {} },
        recordDate,
        settlementDate,
      )
      .accounts({
        authority: authority.publicKey,
        bondSecurity,
        corporateAction,
        actionVault,
        settlementMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    await program.methods
      .recordHolderSnapshot(new BN(1))
      .accounts({
        authority: authority.publicKey,
        bondSecurity,
        corporateAction,
        holder: holder.publicKey,
        holderBondAccount: holderBond.address,
        holderEntitlement,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    await program.methods
      .depositActionVault(couponAmount)
      .accounts({
        funder: authority.publicKey,
        corporateAction,
        actionVault,
        funderTokenAccount: funderSettlement.address,
        settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const before = await connection.getTokenAccountBalance(holderSettlement.address);
    expect(before.value.amount).to.equal("0");

    const waitMs = Math.max(0, (settlementDate.toNumber() - Math.floor(Date.now() / 1000) + 1) * 1000);
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));

    await program.methods
      .executeCouponPayment()
      .accounts({
        authority: authority.publicKey,
        bondSecurity,
        corporateAction,
        actionVault,
        holderEntitlement,
        holderSettlementAccount: holderSettlement.address,
        settlementMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const after = await connection.getTokenAccountBalance(holderSettlement.address);
    expect(after.value.amount).to.equal(couponAmount.toString());

    const entitlement = await program.account.holderEntitlement.fetch(holderEntitlement);
    expect(entitlement.isSettled).to.equal(true);
    const action = await program.account.corporateAction.fetch(corporateAction);
    expect(action.settledHoldersCount.toNumber()).to.equal(1);
    expect(action.totalSettledAmount.toString()).to.equal(couponAmount.toString());
  });
});
