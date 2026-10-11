// KASE Corporate Actions — real Devnet scenario runner (coupon, governance, redemption + adversarial checks)
const w = require('@solana/web3.js');
const spl = require('@solana/spl-token');
const fs = require('fs');
const crypto = require('crypto');
const { PublicKey, Keypair, SystemProgram, Transaction, TransactionInstruction, SYSVAR_RENT_PUBKEY } = w;

const PROGRAM_ID = new PublicKey('5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz');
const TOKEN = spl.TOKEN_PROGRAM_ID;
const c = new w.Connection('https://api.devnet.solana.com', { commitment: 'confirmed', disableRetryOnRateLimit: false });
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(__dirname + '/../keys/deployer.json'))));
const LOG = __dirname + '/../scenario_log.json';
const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG)) : { txs: [] };
const save = () => fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
const sleep = ms => new Promise(r => setTimeout(r, ms));
process.on('unhandledRejection', e => console.log('rej', String(e).slice(0, 100)));

async function retry(fn, n = 8) { for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i >= n || !/429|fetch failed|timeout|blockhash|ECONN|socket|503|502/i.test(String(e))) throw e; await sleep(1500 * (i + 1)); } } }

const disc = n => crypto.createHash('sha256').update('global:' + n).digest().subarray(0, 8);
const u8 = v => Buffer.from([v]);
const u16 = v => { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; };
const u64 = v => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b; };
const i64 = v => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(v)); return b; };
const str = s => { const d = Buffer.from(s, 'utf8'); return Buffer.concat([Buffer.from(Uint32Array.of(d.length).buffer), d]); };
const pda = seeds => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
const m = (pubkey, isWritable = false, isSigner = false) => ({ pubkey, isWritable, isSigner });
const ix = (name, args, keys) => new TransactionInstruction({ programId: PROGRAM_ID, keys, data: Buffer.concat([disc(name), ...args]) });

async function send(label, ixs, signers, expectFail = false) {
  const tx = new Transaction().add(...ixs);
  const sig = await retry(async () => {
    const { blockhash } = await c.getLatestBlockhash();
    tx.recentBlockhash = blockhash; tx.feePayer = signers[0].publicKey; tx.signatures = []; tx.sign(...signers);
    return c.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  });
  let st = null;
  for (let i = 0; i < 60; i++) { await sleep(1200); const r = await retry(() => c.getSignatureStatuses([sig], { searchTransactionHistory: true })); st = r.value[0]; if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) break; }
  const ok = st && !st.err;
  let errMsg = null;
  if (!ok) { const t = await retry(() => c.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })).catch(() => null); errMsg = t?.meta?.logMessages?.filter(l => /Error|failed/i.test(l)).slice(-2).join(' | ') || JSON.stringify(st?.err); }
  const rec = { label, sig, ok, expectFail, err: errMsg, url: `https://explorer.solana.com/tx/${sig}?cluster=devnet` };
  log.txs.push(rec); save();
  console.log((ok ? 'OK  ' : (expectFail ? 'REJ ' : 'FAIL')), label, sig, errMsg || '');
  if (!ok && !expectFail) throw new Error('unexpected failure: ' + label + ' ' + errMsg);
  if (ok && expectFail) throw new Error('attack NOT rejected: ' + label);
  await sleep(400);
  return sig;
}

(async () => {
  const start = Math.floor(Date.now() / 1000);
  const ISIN = 'KZDEMO' + String(start).slice(-6);
  log.isin = ISIN; log.started = new Date().toISOString(); log.program = PROGRAM_ID.toBase58();
  const holders = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
  const bondsHeld = [60, 30, 10];
  fs.writeFileSync(__dirname + '/../keys/holders.json', JSON.stringify(holders.map(h => Array.from(h.secretKey))));
  const bondMintKp = Keypair.generate(), usdcMintKp = Keypair.generate();
  log.accounts = { bond_mint: bondMintKp.publicKey.toBase58(), settlement_mint: usdcMintKp.publicKey.toBase58(), holders: holders.map(h => h.publicKey.toBase58()), authority: payer.publicKey.toBase58() };

  // --- Setup: mints, ATAs, funding ---
  const rentMint = await retry(() => spl.getMinimumBalanceForRentExemptMint(c));
  await send('setup: create bond mint (0 dec) + demo-USDC mint (6 dec)', [
    SystemProgram.createAccount({ fromPubkey: payer.publicKey, newAccountPubkey: bondMintKp.publicKey, space: spl.MINT_SIZE, lamports: rentMint, programId: TOKEN }),
    spl.createInitializeMint2Instruction(bondMintKp.publicKey, 0, payer.publicKey, null),
    SystemProgram.createAccount({ fromPubkey: payer.publicKey, newAccountPubkey: usdcMintKp.publicKey, space: spl.MINT_SIZE, lamports: rentMint, programId: TOKEN }),
    spl.createInitializeMint2Instruction(usdcMintKp.publicKey, 6, payer.publicKey, null),
  ], [payer, bondMintKp, usdcMintKp]);
  const bondMint = bondMintKp.publicKey, usdc = usdcMintKp.publicKey;
  const ata = (mint, owner) => spl.getAssociatedTokenAddressSync(mint, owner);
  const payerUsdc = ata(usdc, payer.publicKey);
  const setupIxs = [spl.createAssociatedTokenAccountInstruction(payer.publicKey, payerUsdc, payer.publicKey, usdc), spl.createMintToInstruction(usdc, payerUsdc, payer.publicKey, 200_000_000_000n)];
  await send('setup: issuer demo-USDC account + mint 200,000 USDC', setupIxs, [payer]);
  for (let k = 0; k < 3; k++) {
    const h = holders[k].publicKey;
    await send(`setup: holder ${k + 1} accounts, ${bondsHeld[k]} bonds, 0.02 SOL gas`, [
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: h, lamports: 20_000_000 }),
      spl.createAssociatedTokenAccountInstruction(payer.publicKey, ata(bondMint, h), h, bondMint),
      spl.createAssociatedTokenAccountInstruction(payer.publicKey, ata(usdc, h), h, usdc),
      spl.createMintToInstruction(bondMint, ata(bondMint, h), payer.publicKey, bondsHeld[k]),
    ], [payer]);
  }

  // --- 1. Register bond ---
  const FACE = 1_000_000_000n; // 1,000 USDC
  const bond = pda([Buffer.from('bond'), Buffer.from(ISIN)]);
  log.accounts.bond_security = bond.toBase58();
  const maturity = Math.floor(Date.now() / 1000) + 150;
  await send(`1. initialize_bond_instrument ${ISIN}: 100 bonds x 1,000 USDC, 10% semi-annual`, [ix('initialize_bond_instrument',
    [str(ISIN), u64(FACE), u16(1000), u8(2), u64(100), i64(maturity)],
    [m(payer.publicKey, true, true), m(payer.publicKey), m(bondMint), m(usdc), m(bond, true), m(SystemProgram.programId), m(TOKEN), m(SYSVAR_RENT_PUBKEY)])], [payer]);

  const actionPda = id => pda([Buffer.from('action'), bond.toBuffer(), u64(id)]);
  const vaultPda = a => pda([Buffer.from('action_vault'), a.toBuffer()]);
  const entPda = (a, h) => pda([Buffer.from('entitlement'), a.toBuffer(), h.toBuffer()]);
  const now = () => Math.floor(Date.now() / 1000);
  async function schedule(id, type, label) {
    const a = actionPda(id), v = vaultPda(a); const t = now() - 60;
    await send(label, [ix('schedule_corporate_action', [u64(id), u8(type), i64(t), i64(t)],
      [m(payer.publicKey, true, true), m(bond), m(a, true), m(v, true), m(usdc), m(SystemProgram.programId), m(TOKEN), m(SYSVAR_RENT_PUBKEY)])], [payer]);
    return [a, v];
  }
  async function snapshot(a, k, tag) {
    const h = holders[k].publicKey;
    await send(`${tag} record_holder_snapshot holder ${k + 1} (${bondsHeld[k]} bonds)`, [ix('record_holder_snapshot', [u64(bondsHeld[k])],
      [m(payer.publicKey, true, true), m(bond), m(a, true), m(h), m(ata(bondMint, h)), m(entPda(a, h), true), m(SystemProgram.programId), m(SYSVAR_RENT_PUBKEY)])], [payer]);
  }
  async function deposit(a, v, amount, tag) {
    await send(`${tag} deposit_action_vault ${Number(amount) / 1e6} USDC`, [ix('deposit_action_vault', [u64(amount)],
      [m(payer.publicKey, true, true), m(a, true), m(v, true), m(payerUsdc, true), m(usdc), m(TOKEN)])], [payer]);
  }

  // --- Scenario 1: coupon ---
  const [ca, cv] = await schedule(1, 0, '2.1 schedule_corporate_action #1 CouponPayment');
  for (let k = 0; k < 3; k++) await snapshot(ca, k, '2.2');
  await deposit(ca, cv, 5_000_000_000n, '2.3');
  const couponIx = k => { const h = holders[k].publicKey; return ix('execute_coupon_payment', [],
    [m(payer.publicKey, true, true), m(bond), m(ca, true), m(cv, true), m(entPda(ca, h), true), m(ata(usdc, h), true), m(usdc), m(TOKEN)]); };
  for (let k = 0; k < 3; k++) await send(`2.4 execute_coupon_payment holder ${k + 1}: ${bondsHeld[k] * 50} USDC`, [couponIx(k)], [payer]);
  await send('ATTACK: double coupon claim holder 1 (must be rejected: AlreadySettled)', [couponIx(0)], [payer], true);
  const attacker = holders[2];
  await send('ATTACK: holder 3 tries to schedule an action (must be rejected: UnauthorizedAuthority)', [ix('schedule_corporate_action', [u64(99), u8(0), i64(now() - 60), i64(now() - 60)],
    [m(attacker.publicKey, true, true), m(bond), m(actionPda(99), true), m(vaultPda(actionPda(99)), true), m(usdc), m(SystemProgram.programId), m(TOKEN), m(SYSVAR_RENT_PUBKEY)])], [attacker], true);

  // --- Scenario 3: governance ---
  const [ga] = await schedule(3, 2, '3.1 schedule_corporate_action #3 GovernanceVoting (record date)');
  for (let k = 0; k < 3; k++) await snapshot(ga, k, '3.2');
  const prop = pda([Buffer.from('proposal'), bond.toBuffer(), u64(101)]);
  log.accounts.proposal = prop.toBase58();
  const descHash = crypto.createHash('sha256').update('KASE restructuring: raise coupon to 12.5%').digest();
  await send('3.3 create_governance_proposal #101: raise coupon 10% -> 12.5%, quorum 51', [ix('create_governance_proposal',
    [u64(101), str('Restructuring: raise coupon rate to 12.5%'), descHash, i64(now() - 60), i64(now() + 3600), u64(51), u16(1250)],
    [m(payer.publicKey, true, true), m(bond), m(prop, true), m(SystemProgram.programId), m(SYSVAR_RENT_PUBKEY)])], [payer]);
  const voteIx = (k, choice) => { const h = holders[k].publicKey; return ix('cast_bondholder_vote', [u8(choice)],
    [m(h, true, true), m(bond), m(prop, true), m(ata(bondMint, h)), m(entPda(ga, h)), m(pda([Buffer.from('voter'), prop.toBuffer(), h.toBuffer()]), true), m(SystemProgram.programId), m(SYSVAR_RENT_PUBKEY)]); };
  const names = ['For', 'Against', 'Abstain'];
  for (let k = 0; k < 3; k++) await send(`3.4 cast_bondholder_vote holder ${k + 1}: ${names[k]} (weight ${bondsHeld[k]})`, [voteIx(k, k)], [holders[k]]);
  await send('ATTACK: holder 1 votes twice (must be rejected: voter record exists)', [voteIx(0, 0)], [holders[0]], true);
  await send('3.5 finalize_governance_proposal #101 (60 for / 30 against / 10 abstain)', [ix('finalize_governance_proposal', [],
    [m(payer.publicKey, true, true), m(bond, true), m(prop, true)])], [payer]);

  // --- Scenario 2: redemption ---
  const [ra, rv] = await schedule(2, 1, '4.1 schedule_corporate_action #2 BondRedemption');
  for (let k = 0; k < 3; k++) await snapshot(ra, k, '4.2');
  await deposit(ra, rv, 100_000_000_000n, '4.3');
  const redIx = k => { const h = holders[k].publicKey; return ix('execute_bond_redemption', [],
    [m(h, false, true), m(bond, true), m(ra, true), m(rv, true), m(entPda(ra, h), true), m(bondMint, true), m(ata(bondMint, h), true), m(ata(usdc, h), true), m(usdc), m(TOKEN)]); };
  const wait = maturity - now() + 5; if (wait > 0) { console.log('waiting for maturity', wait, 's'); await sleep(wait * 1000); }
  for (let k = 0; k < 3; k++) await send(`4.4 execute_bond_redemption holder ${k + 1}: burn ${bondsHeld[k]} bonds, pay ${bondsHeld[k] * 1000} USDC`, [redIx(k)], [holders[k]]);
  await send('ATTACK: holder 1 redeems twice (must be rejected)', [redIx(0)], [holders[0]], true);

  // --- Final state ---
  const b = (await retry(() => c.getAccountInfo(bond))).data;
  let o = 8; const il = b.readUInt32LE(o); o += 4 + il + 32 * 4; o += 8; const bps = b.readUInt16LE(o); o += 2 + 1 + 8; const active = b.readBigUInt64LE(o); o += 8 + 8; const matured = b[o] === 1;
  const p = (await retry(() => c.getAccountInfo(prop))).data;
  log.final = { annual_coupon_bps: bps, active_supply: Number(active), is_matured: matured,
    holder_usdc: [], bond_mint_supply: (await retry(() => spl.getMint(c, bondMint))).supply.toString() };
  for (const h of holders) log.final.holder_usdc.push(Number((await retry(() => spl.getAccount(c, ata(usdc, h.publicKey)))).amount) / 1e6);
  log.finished = new Date().toISOString(); save();
  console.log('FINAL', JSON.stringify(log.final));
})().catch(e => { console.log('FATAL', String(e).slice(0, 300)); save(); process.exit(1); });
