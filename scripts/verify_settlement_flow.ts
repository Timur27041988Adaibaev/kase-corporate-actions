import { Connection, PublicKey } from "@solana/web3.js";

const DEFAULT_RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz");

async function main(): Promise<void> {
  const rpcUrl = process.env.SOLANA_RPC_URL || DEFAULT_RPC;
  const connection = new Connection(rpcUrl, "confirmed");

  console.log("KASE Corporate Actions — live RPC preflight");
  console.log(`RPC endpoint: ${rpcUrl}`);
  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);

  const [version, slot, account] = await Promise.all([
    connection.getVersion(),
    connection.getSlot("confirmed"),
    connection.getAccountInfo(PROGRAM_ID, "confirmed"),
  ]);

  console.log(`RPC version: ${version["solana-core"]}`);
  console.log(`Confirmed slot: ${slot}`);

  if (!account) {
    throw new Error("The configured RPC cannot find the KASE program account.");
  }
  if (!account.executable) {
    throw new Error("The KASE program account exists but is not executable.");
  }

  console.log("Preflight result: program account exists and is executable.");
  console.log("IMPORTANT: this check does not prove the deployed binary matches repository source.");
  console.log("IMPORTANT: this check submits no transaction and does not verify coupon payout, redemption, token burn, or governance execution.");
  console.log("For actual instruction tests, run the Anchor local-validator integration suite: anchor test.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Preflight failed: ${message}`);
  process.exitCode = 1;
});
