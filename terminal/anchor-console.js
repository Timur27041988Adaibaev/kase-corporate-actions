import * as anchor from "https://esm.sh/@coral-xyz/anchor@0.32.1?bundle";
import * as web3 from "https://esm.sh/@solana/web3.js@1.98.4?bundle";
import { Buffer } from "https://esm.sh/buffer@6.0.3";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID, MINT_SIZE, TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction, createInitializeMintInstruction,
  createMintToInstruction, getAssociatedTokenAddressSync
} from "https://esm.sh/@solana/spl-token@0.4.14?bundle";
if (!window.Buffer) window.Buffer = Buffer;
const {PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection} = web3;
const DEVNET = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz");
const el = id => document.getElementById(id);
const savedKey = "kaseAnchorDevnetConsoleV1";
let provider = null, program = null, wallet = null, connection = null, state = null, idl = null;
const fmt = n => new Intl.NumberFormat("en-US").format(n);
function log(message, kind="") {
  const line=document.createElement("div"); line.className="logline "+kind; line.textContent=new Date().toLocaleTimeString()+"  "+message;
  el("log").prepend(line);
}
function txLink(sig) {
  const a=document.createElement("a");a.href="https://explorer.solana.com/tx/"+sig+"?cluster=devnet";a.target="_blank";a.rel="noreferrer";a.textContent=sig;
  const line=document.createElement("div");line.className="logline ok";line.append("Confirmed on Devnet: ",a);el("log").prepend(line);
}
function setStatus(id,text){el(id).textContent=text}
function bn(n){return new anchor.BN(String(n))}
function le8(n){return bn(n).toArrayLike(Buffer,"le",8)}
function pda(seeds){return PublicKey.findProgramAddressSync(seeds,PROGRAM_ID)[0]}
function actionPda(id){return pda([Buffer.from("action"),state.bondSecurity.toBuffer(),le8(id)])}
function vaultPda(action){return pda([Buffer.from("action_vault"),action.toBuffer()])}
function entitlementPda(action){return pda([Buffer.from("entitlement"),action.toBuffer(),wallet.publicKey.toBuffer()])}
function proposalPda(id){return pda([Buffer.from("proposal"),state.bondSecurity.toBuffer(),le8(id)])}
function voterPda(proposal){return pda([Buffer.from("voter"),proposal.toBuffer(),wallet.publicKey.toBuffer()])}
async function getProgram() {
  const res=await fetch("./idl/kase_corporate_actions.json",{cache:"no-store"});
  if(!res.ok) throw new Error("Generated Anchor IDL is not published in terminal/idl yet (HTTP "+res.status+").");
  idl=await res.json();
  if(!idl.address) idl.address=PROGRAM_ID.toBase58();
  if(idl.address!==PROGRAM_ID.toBase58()) throw new Error("IDL program address does not match configured program ID.");
  program=new anchor.Program(idl,provider);
}
async function connect() {
  if(!window.solana?.isPhantom) throw new Error("Phantom wallet extension/provider not found. Open this page in a browser with Phantom installed.");
  const resp=await window.solana.connect();
  wallet={publicKey:resp.publicKey, signTransaction:tx=>window.solana.signTransaction(tx), signAllTransactions:txs=>window.solana.signAllTransactions?window.solana.signAllTransactions(txs):Promise.all(txs.map(tx=>window.solana.signTransaction(tx)))};
  connection=new Connection(DEVNET,"confirmed");
  provider=new anchor.AnchorProvider(connection,wallet,{commitment:"confirmed",preflightCommitment:"confirmed"});
  el("wallet").textContent=wallet.publicKey.toBase58();
  await getProgram();
  for(const id of ["refresh","setup"]) el(id).disabled=false;
  await checkProgram();
  restoreState();
  log("Connected wallet "+wallet.publicKey.toBase58());
}
async function checkProgram() {
  try {
    const info=await connection.getAccountInfo(PROGRAM_ID,"confirmed");
    const executable=!!info?.executable;
    setStatus("programStatus","Program: "+PROGRAM_ID.toBase58()+"\nExecutable on Devnet: "+executable+"\nIDL loaded: "+!!idl+"\nCluster: Devnet");
    if(!executable) throw new Error("The configured program account is not executable on Devnet. A program-keypair/deployer-funded deployment is still required; no financial transaction can run until then.");
    return true;
  } catch(e) { setStatus("programStatus",String(e.message||e)); throw e; }
}
async function sendWalletTx(instructions, signers=[]) {
  const tx=new Transaction().add(...instructions);
  const latest=await connection.getLatestBlockhash("confirmed");
  tx.feePayer=wallet.publicKey;tx.recentBlockhash=latest.blockhash;
  if(signers.length) tx.partialSign(...signers);
  const signed=await wallet.signTransaction(tx);
  const sig=await connection.sendRawTransaction(signed.serialize(),{skipPreflight:false,preflightCommitment:"confirmed"});
  const conf=await connection.confirmTransaction({...latest,signature:sig},"confirmed");
  if(conf.value.err) throw new Error("Transaction failed: "+JSON.stringify(conf.value.err));
  txLink(sig);return sig;
}
async function createTestMints() {
  const bondMint=Keypair.generate(), settlementMint=Keypair.generate();
  const lamports=await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const bondAta=getAssociatedTokenAddressSync(bondMint.publicKey,wallet.publicKey);
  const settlementAta=getAssociatedTokenAddressSync(settlementMint.publicKey,wallet.publicKey);
  const instructions=[
    SystemProgram.createAccount({fromPubkey:wallet.publicKey,newAccountPubkey:bondMint.publicKey,lamports,space:MINT_SIZE,programId:TOKEN_PROGRAM_ID}),
    createInitializeMintInstruction(bondMint.publicKey,0,wallet.publicKey,wallet.publicKey,TOKEN_PROGRAM_ID),
    SystemProgram.createAccount({fromPubkey:wallet.publicKey,newAccountPubkey:settlementMint.publicKey,lamports,space:MINT_SIZE,programId:TOKEN_PROGRAM_ID}),
    createInitializeMintInstruction(settlementMint.publicKey,6,wallet.publicKey,wallet.publicKey,TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountInstruction(wallet.publicKey,bondAta,wallet.publicKey,bondMint.publicKey,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountInstruction(wallet.publicKey,settlementAta,wallet.publicKey,settlementMint.publicKey,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),
    createMintToInstruction(bondMint.publicKey,bondAta,wallet.publicKey,1,[],TOKEN_PROGRAM_ID),
    createMintToInstruction(settlementMint.publicKey,settlementAta,wallet.publicKey,1_050_000_000n,[],TOKEN_PROGRAM_ID)
  ];
  await sendWalletTx(instructions,[bondMint,settlementMint]);
  return {bondMint:bondMint.publicKey,bondAta,settlementMint:settlementMint.publicKey,settlementAta};
}
async function ix(method){return method.instruction()}
async function setup() {
  el("setup").disabled=true;
  try {
    if(!program) throw new Error("Connect Phantom first.");
    await checkProgram();
    log("Creating Devnet-only test bond and settlement mints…");
    const m=await createTestMints();
    const now=Math.floor(Date.now()/1000);
    const couponId=Date.now(), redemptionId=couponId+1, governanceId=couponId+2, proposalId=couponId+3;
    const record=now-1,couponAt=now+45,voteEnd=now+45,maturity=now+75;
    const isin="KZTEST"+String(couponId).slice(-8);
    const bondSecurity=pda([Buffer.from("bond"),Buffer.from(isin)]);
    const couponAction=actionPda(couponId),redemptionAction=actionPda(redemptionId),governanceAction=actionPda(governanceId);
    const couponVault=vaultPda(couponAction),redemptionVault=vaultPda(redemptionAction),governanceVault=vaultPda(governanceAction);
    const couponEntitlement=entitlementPda(couponAction),redemptionEntitlement=entitlementPda(redemptionAction),governanceEntitlement=entitlementPda(governanceAction);
    state={...m,isin,bondSecurity,couponId,redemptionId,governanceId,proposalId,couponAction,redemptionAction,governanceAction,couponVault,redemptionVault,governanceVault,couponEntitlement,redemptionEntitlement,governanceEntitlement,record,couponAt,voteEnd,maturity,proposal:proposalPda(proposalId),createdAt:now};
    const init=program.methods.initializeBondInstrument(isin,bn(1_000_000_000),1000,2,bn(1),bn(maturity)).accounts({
      authority:wallet.publicKey,issuer:wallet.publicKey,bondMint:m.bondMint,settlementMint:m.settlementMint,bondSecurity,
      systemProgram:SystemProgram.programId,tokenProgram:TOKEN_PROGRAM_ID,rent:SYSVAR_RENT_PUBKEY
    });
    const schedule=(id,type,settle,action,vault)=>program.methods.scheduleCorporateAction(bn(id),type,bn(record),bn(settle)).accounts({
      authority:wallet.publicKey,bondSecurity,corporateAction:action,actionVault:vault,settlementMint:m.settlementMint,
      systemProgram:SystemProgram.programId,tokenProgram:TOKEN_PROGRAM_ID,rent:SYSVAR_RENT_PUBKEY
    });
    log("Initializing instrument and three corporate actions…");
    await sendWalletTx([
      await ix(init),
      await ix(schedule(couponId,{couponPayment:{}},couponAt,couponAction,couponVault)),
      await ix(schedule(redemptionId,{bondRedemption:{}},maturity,redemptionAction,redemptionVault)),
      await ix(schedule(governanceId,{governanceVoting:{}},voteEnd,governanceAction,governanceVault))
    ]);
    const snapshot=(action,entitlement)=>program.methods.recordHolderSnapshot(bn(1)).accounts({
      authority:wallet.publicKey,bondSecurity,corporateAction:action,holder:wallet.publicKey,holderBondAccount:m.bondAta,
      holderEntitlement:entitlement,systemProgram:SystemProgram.programId,rent:SYSVAR_RENT_PUBKEY
    });
    const deposit=(action,vault,amount)=>program.methods.depositActionVault(bn(amount)).accounts({
      funder:wallet.publicKey,corporateAction:action,actionVault:vault,funderTokenAccount:m.settlementAta,
      settlementMint:m.settlementMint,tokenProgram:TOKEN_PROGRAM_ID
    });
    log("Recording coupon snapshot and funding its settlement vault…");
    await sendWalletTx([await ix(snapshot(couponAction,couponEntitlement)),await ix(deposit(couponAction,couponVault,50_000_000))]);
    log("Recording redemption snapshot and funding its principal vault…");
    await sendWalletTx([await ix(snapshot(redemptionAction,redemptionEntitlement)),await ix(deposit(redemptionAction,redemptionVault,1_000_000_000))]);
    log("Recording the governance snapshot…");
    await sendWalletTx([await ix(snapshot(governanceAction,governanceEntitlement))]);
    log("Creating governance proposal. Cast the vote separately using the vote button…");
    const descriptionHash=Array(32).fill(0);
    const createProposal=program.methods.createGovernanceProposal(bn(proposalId),"Test proposal: raise coupon to 12.5%",descriptionHash,bn(now),bn(voteEnd),bn(1),1250).accounts({
      proposer:wallet.publicKey,bondSecurity,proposal:state.proposal,systemProgram:SystemProgram.programId,rent:SYSVAR_RENT_PUBKEY
    });
    await sendWalletTx([await ix(createProposal)]);
    saveState();renderState();
    log("Setup completed: on-chain test accounts and instructions confirmed. Cast the FOR vote before the deadline. Test tokens have no cash value.");
  } catch(e) {
    log("SETUP ERROR: "+(e.message||e),"bad");
    setStatus("programStatus",String(e.message||e));
  } finally {el("setup").disabled=false;}
}
function saveState() {
  const encode={};
  for(const [k,v] of Object.entries(state||{})) encode[k]=v instanceof PublicKey?v.toBase58():v;
  sessionStorage.setItem(savedKey,JSON.stringify(encode));
}
function restoreState() {
  try {
    const x=JSON.parse(sessionStorage.getItem(savedKey)||"null");if(!x)return;
    for(const k of ["bondMint","bondAta","settlementMint","settlementAta","bondSecurity","couponAction","redemptionAction","governanceAction","couponVault","redemptionVault","governanceVault","couponEntitlement","redemptionEntitlement","governanceEntitlement","proposal"]) x[k]=new PublicKey(x[k]);
    state=x;renderState();log("Restored public Devnet account references from this browser session.");
  } catch(e){sessionStorage.removeItem(savedKey);log("Saved test references could not be restored: "+e.message,"bad")}
}
function renderState() {
  if(!state)return;
  setStatus("couponState","Action: "+state.couponAction.toBase58()+"\nVault: "+state.couponVault.toBase58()+"\nSettlement unlock: "+new Date(state.couponAt*1000).toLocaleTimeString());
  setStatus("redemptionState","Action: "+state.redemptionAction.toBase58()+"\nVault: "+state.redemptionVault.toBase58()+"\nMaturity: "+new Date(state.maturity*1000).toLocaleTimeString());
  setStatus("voteState","Proposal: "+state.proposal.toBase58()+"\nGovernance action: "+state.governanceAction.toBase58()+"\nVoting ends: "+new Date(state.voteEnd*1000).toLocaleTimeString());
  for(const id of ["coupon","redeem","vote","finalize"])el(id).disabled=false;
  updateAvailability();
}
function updateAvailability() {
  if(!state)return;
  const now=Math.floor(Date.now()/1000);
  el("coupon").disabled=now<state.couponAt;
  el("redeem").disabled=now<state.maturity;
  el("finalize").disabled=now<state.voteEnd;
}
async function executeCoupon() {
  if(!state)throw new Error("Initialize the test instrument first.");
  const ix=await program.methods.executeCouponPayment().accounts({
    authority:wallet.publicKey,bondSecurity:state.bondSecurity,corporateAction:state.couponAction,
    actionVault:state.couponVault,holderEntitlement:state.couponEntitlement,
    holderSettlementAccount:state.settlementAta,settlementMint:state.settlementMint,tokenProgram:TOKEN_PROGRAM_ID
  }).instruction();
  const sig=await sendWalletTx([ix]);setStatus("couponState","SETTLED on-chain\nTransaction: "+sig);log("Coupon test tokens transferred and entitlement marked settled.");
}
async function executeRedemption() {
  if(!state)throw new Error("Initialize the test instrument first.");
  const ix=await program.methods.executeBondRedemption().accounts({
    holder:wallet.publicKey,bondSecurity:state.bondSecurity,corporateAction:state.redemptionAction,
    actionVault:state.redemptionVault,holderEntitlement:state.redemptionEntitlement,bondMint:state.bondMint,
    holderBondAccount:state.bondAta,holderSettlementAccount:state.settlementAta,settlementMint:state.settlementMint,
    tokenProgram:TOKEN_PROGRAM_ID
  }).instruction();
  const sig=await sendWalletTx([ix]);setStatus("redemptionState","REDEEMED and BURNED on-chain\nTransaction: "+sig);
  log("Principal test tokens transferred; bond token burned atomically.");
}
async function castVote() {
  if(!state)throw new Error("Initialize the test instrument first.");
  const ix=await program.methods.castBondholderVote({for:{}}).accounts({
    voter:wallet.publicKey,bondSecurity:state.bondSecurity,proposal:state.proposal,corporateAction:state.governanceAction,
    holderBondAccount:state.bondAta,holderEntitlement:state.governanceEntitlement,voterRecord:voterPda(state.proposal),
    systemProgram:SystemProgram.programId,rent:SYSVAR_RENT_PUBKEY
  }).instruction();
  const sig=await sendWalletTx([ix]);
  const proposal=await program.account.governanceProposal.fetch(state.proposal);
  setStatus("voteState","VOTE RECORDED on-chain\nFOR: "+fmt(proposal.votesFor.toNumber())+" · AGAINST: "+fmt(proposal.votesAgainst.toNumber())+" · ABSTAIN: "+fmt(proposal.votesAbstain.toNumber())+"\nVoting ends: "+new Date(state.voteEnd*1000).toLocaleTimeString()+"\nTransaction: "+sig);
  log("Vote recorded on-chain and tally read back from the proposal account.");
}
async function finalizeVote() {
  if(!state)throw new Error("Initialize the test instrument first.");
  const ix=await program.methods.finalizeGovernanceProposal().accounts({
    authority:wallet.publicKey,bondSecurity:state.bondSecurity,proposal:state.proposal
  }).instruction();
  const sig=await sendWalletTx([ix]);
  const proposal=await program.account.governanceProposal.fetch(state.proposal);
  setStatus("voteState","FINALIZED on-chain\nFOR: "+fmt(proposal.votesFor.toNumber())+" · AGAINST: "+fmt(proposal.votesAgainst.toNumber())+" · ABSTAIN: "+fmt(proposal.votesAbstain.toNumber())+"\nQuorum: "+proposal.quorumThresholdBonds.toString()+"\nPassed: "+proposal.passed+"\nTransaction: "+sig);
  log("Governance proposal finalized; on-chain vote tally read back and verified.");
}
async function guarded(fn) {
  try {await fn()} catch(e){log("ERROR: "+(e.message||e),"bad");}
}
el("connect").addEventListener("click",()=>guarded(connect));
el("refresh").addEventListener("click",()=>guarded(checkProgram));
el("setup").addEventListener("click",()=>guarded(setup));
el("coupon").addEventListener("click",()=>guarded(executeCoupon));
el("redeem").addEventListener("click",()=>guarded(executeRedemption));
el("vote").addEventListener("click",()=>guarded(castVote));
el("finalize").addEventListener("click",()=>guarded(finalizeVote));
setInterval(updateAvailability,1000);
try {
  connection=new Connection(DEVNET,"confirmed");
  setStatus("programStatus","Program ID: "+PROGRAM_ID.toBase58()+"\nChecking Devnet executable account…");
  const info=await connection.getAccountInfo(PROGRAM_ID,"confirmed");
  setStatus("programStatus","Executable on Devnet: "+!!info?.executable+"\nProgram ID: "+PROGRAM_ID.toBase58()+"\nConnect Phantom to load IDL and run account checks.");
} catch(e){setStatus("programStatus","Devnet RPC check unavailable: "+e.message)}
