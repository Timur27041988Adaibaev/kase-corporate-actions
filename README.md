# KASE Automated Corporate Actions on Solana 🇰🇿⚡

**Demo video (3:01, Solana Devnet Memo attestations):** https://youtu.be/ilgyZc630uU

**Pitch video (1:52):** https://youtu.be/h4huY2L8oc4

> **Implementation status — read before using the terminal**
>
> The browser terminal currently broadcasts Solana Memo instructions for transaction attestations. Those records do **not** transfer USDC, burn bond tokens, execute the Anchor settlement instructions, or count a governance vote. Independent AML/registry/solvency oracle providers are not connected, so oracle consensus is unavailable. The browser UI must not be treated as a production financial terminal or as proof that the scenarios have settled.
>
> The repository contains an Anchor/Rust program and integration-test source, but the web UI is not yet wired to invoke its instructions with configured bond/action/vault/mint accounts. Real settlement requires that integration, successful Anchor build/tests, and a verified deployment/program ID on the intended cluster. Until those checks pass, demo amounts and holder balances are illustrative.

> **KASE (Kazakhstan Stock Exchange) & Superteam Kazakhstan Hackathon**  
> Automating corporate actions for tokenized financial instruments (RWA) on the Solana blockchain.  
> **Prototype — Anchor program source, integration tests, and browser terminal**

---

## 🏛 Project overview

The project is a prototype intended to explore how corporate actions for tokenized bonds could be implemented on Solana for a KASE/KCSD-style workflow. It is not connected to official KASE/KCSD systems and is not a production financial service.

The repository includes the Anchor program source and a browser terminal prototype. The full end-to-end cycle is **not yet integrated or verified in the web UI**. The current UI can write Memo attestations; it does not execute the actual coupon/redemption settlement or Anchor governance vote.

---

## 💎 Test instrument parameters (KASE Benchmark Bond)

| Parameter | Value | Description |
| :--- | :--- | :--- |
| **ISIN** | `KZDEMO000001` | International Securities Identification Number |
| **Name** | `KASE Demo USD Bond 2026` | Bonds of Demo Issuer JSC |
| **Face value** | **$1,000.00 USDC** | Face value of one bond ($1,000 with 6 decimals) |
| **Coupon rate** | **10.00% per annum** | 1,000 basis points (bps) |
| **Payment frequency** | **Twice a year (semi-annual)** | Payout Frequency = Semi-Annual ($50.00 per bond) |
| **Issue size** | **10,000 bonds** | Total issue amount: **$10,000,000 USD** |
| **Maturity date** | **2026-12-31** | Date of full principal repayment |
| **Settlement currency** | **USDC / Digital Tenge** | SPL Token (6 decimals) |
| **Depository** | **KCSD / AIX CSD** | Central Securities Depository of the Republic of Kazakhstan |

---

## 🚀 The 3 required scenarios

### Scenario 1: Coupon Payment Settlement
1. **Record Date Snapshot:** On the record date, the on-chain program reads holder balances.
2. **Entitlement calculation (Entitlement Engine):**  
   $$\text{Coupon} = \frac{\text{BondsHeld} \times \text{FaceValue} \times \text{RateBps}}{10000 \times \text{Frequency}} = \frac{\text{BondsHeld} \times \$1000 \times 1000}{10000 \times 2} = \text{BondsHeld} \times \$50.00$$
   - For an issue of 10,000 bonds, the total coupon pool is **$500,000.00 USDC**.
3. **Issuer funding:** The issuer deposits $500,000 into the `CorporateAction` PDA vault.
4. **On-chain settlement:** The program makes direct transfers to investor accounts via CPI. The status changes to `is_settled = true`, eliminating the risk of a repeat claim (Double-Claim Attack).

### Scenario 2: Bond principal redemption (Bond Redemption & Token Burn)
1. **Maturity Check:** The program validates that the maturity date has been reached using `Clock::get()?.unix_timestamp`. For the benchmark instrument `KZDEMO000001` the maturity date is set to 2026-12-31. Since the on-chain check `Clock::get()?.unix_timestamp >= maturity_timestamp` blocks execution on live Devnet until maturity, a second test instrument `KZDEMO000002` with a maturity a few minutes ahead (short maturity test bond) is used, which allows the full redemption and token burn cycle to be validated on Devnet.
2. **Principal to be repaid:**  
   $$\text{Principal} = \text{BondsHeld} \times \text{FaceValue} = \text{BondsHeld} \times \$1,000.00$$
   - Total redemption pool: **$10,000,000.00 USDC**.
3. **Token Burn / Retirement:** Investors' bond SPL tokens are permanently burned via the `token::burn` CPI, ruling out re-issuance.
4. **Principal payout:** $1,000 per bond is transferred from the PDA vault to holders' wallets. `active_supply` drops to 0 and the bond is marked as redeemed (`is_matured = true`).

### Scenario 3: Bondholder Governance
1. **Proposal creation:** An on-chain proposal is created (*Proposal #101: Restructuring of terms — raise the coupon rate to 12.5% per annum and extend the bond's term*).
2. **Position-weighted voting:** Holders vote ("FOR", "AGAINST", "ABSTAIN") with a weight equal to the number of bonds they hold (1 bond = 1 vote):
   - Bank A (3,500) + Bank B (2,500) = **6,000 votes "FOR" (60%)**
   - Bank D = **1,200 votes "AGAINST" (12%)**
   - Retail Pool = **800 votes "ABSTAIN" (8%)**
   - Broker C (2,000) = **does not vote**
3. **Double-voting protection:** The `VoterRecord` PDA derived from `[b"voter", proposal.key(), voter.key()]` blocks repeat votes.
4. **Tally and quorum:** The quorum threshold (5,000 bonds = 50%) is checked. When "FOR" wins (6,000 FOR vs 1,200 AGAINST), the resolution is recorded on Solana and all coupons in the terminal are automatically recalculated from $50.00 to $62.50.

---

## ⚖️ Implemented on-chain vs Simulated

For transparency, the table below strictly separates functionality implemented directly in the on-chain Solana program (Anchor Framework) from integration / simulation-level components:

| Component / Operation | Implemented in Anchor program (code) | Simulated / Off-chain services | Implementation notes |
| :--- | :---: | :---: | :--- |
| **Devnet deployment of the program** | ✅ **Deployed & executed on Devnet** | — | Program ID `5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz`; all 3 scenarios + attack rejections run as real txs (see Live Devnet Deployment). Mainnet: not deployed. |
| **Instrument registration (`BondSecurity`)** | ✅ **Implemented on-chain** | — | PDA `[b"bond", isin]`, ISIN validation (1–16 characters), face value, rate, dates |
| **Corporate action scheduling (`CorporateAction`)** | ✅ **Implemented on-chain** | — | PDA `[b"action", bond_key, id]`, check that maturity has not passed |
| **Holder balance snapshot (`HolderEntitlement`)** | ✅ **Implemented on-chain** | — | PDA `[b"entitlement", action_key, holder]`, records the entitlement |
| **Funding the pool into the Escrow Vault** | ✅ **Implemented on-chain** | — | PDA vault, funded via SPL Token Transfer |
| **Coupon payment (DvP)** | ✅ **Implemented on-chain** | — | Atomic CPI transfer from the Vault to the investor, sets `is_settled = true` |
| **Double-Claim protection** | ✅ **Implemented on-chain** | — | Strict `require!(!entitlement.is_settled, KaseError::AlreadySettled)` |
| **Principal redemption and Token Burn** | ✅ **Implemented on-chain** | — | Clock sysvar $\ge$ maturity check, CPI `token::burn`, principal transfer |
| **Governance and voting (`GovernanceProposal`)** | ✅ **Implemented on-chain** | — | Proposal #101, FOR/AGAINST/ABSTAIN vote tally, quorum check |
| **Double-Vote protection** | ✅ **Implemented on-chain** | — | PDA collision on `[b"voter", proposal_key, voter_key]` in Sealevel |
| **Dynamic recalculation of instrument terms** | ✅ **Implemented on-chain** | — | Writes the new rate (12.5%) to `BondSecurity.annual_coupon_bps` when approved |
| **Broadcasting transactions to Solana Devnet & Mainnet** | — | ✅ **Solana Memo Program** | Uses the official Solana Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`). Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz). |
| **Mainnet Record Policy** | — | ✅ **Official Memo Program** | Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz). |
| **Initial register export from KCSD** | — | ⚙️ **Simulated** | KCSD snapshot format (5 institutional participants: Bank A-D, Retail Pool) |
| **Fiat interbank settlement (Fiat Payments)** | — | ⚙️ **Simulated** | Traditional settlement through the National Bank of Kazakhstan payment system / KZT fiat clearing (simulated; on-chain settlement uses test USD / SPL stablecoin) |
| **Dynamic Blinks builder (`server.py`)** | — | ⚙️ **Integration** | HTTP API following the Dialect Actions spec (`/actions.json`, `/api/actions/*`) |
| **ISO 20022 regulatory message export** | — | ⚙️ **Integration** | XML/JSON generator (`seev.031`, `seev.036`, `seev.004`) for the KCSD back office |
| **3-Agent Pre-Flight Oracle Consensus** | — | ⚙️ **Simulated** | Pre-flight checks of sanctions (AML), math invariants and liquidity |

> ⚠️ **Important Mainnet Invariant:** Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).


---

## 🌟 Platform architecture layers

1. **Dual-Cluster Engine (Solana Devnet & Mainnet-Beta):**
   - Instant network switching without reloading the UI.
   - Independent state machines (`clusterStates`) for each network.
   - Custom RPC support (Helius, QuickNode, Triton, Ankr).
   - Calculation and display of real network fees on Mainnet.

2. **Solana Actions & Blinks (Dialect Specification):**
   - Full `/actions.json` spec and API endpoints `/api/actions/coupon`, `/api/actions/redemption`, `/api/actions/vote`.
   - CORS support and `X-Action-Version: 2.1.3`.
   - Vote and receive payouts directly from Twitter/X, Telegram or Discord.
   - Interactive Blinks showcase in the terminal with a copy button for `dial.to` links.

3. **3-Agent Pre-Flight Oracle Consensus:**
   - **Oracle 1 (AML & Sanctions):** Checks participants' BINs (business identification numbers) and screens sanctions lists.
   - **Oracle 2 (Formal Math Invariants):** Proof of balance conservation $\sum E_i \equiv \text{PoolAmount}$.
   - **Oracle 3 (Solvency & Velocity):** Checks PDA vault liquidity and Solana block speed.
   - Cryptographic attestation with 3/3 APPROVED status before broadcasting to the network.

4. **ISO 20022 Financial MX Regulatory Engine:**
   - Standardized SWIFT / Euroclear / KCSD banking formats.
   - `seev.031.002.10` — Corporate Action Notification.
   - `seev.036.002.11` — Corporate Action Movement Confirmation.
   - `seev.004.002.08` — Meeting Instruction / Voting Ballot.
   - One-click export in `.xml` and `.json` formats.

5. **Enterprise Chaos Engineering & Adversarial Shield:**
   - Live smart-contract stress-test panel covering 4 attack vectors:
     - Replay Double-Claim Attack $\rightarrow$ Blocked by `AlreadySettled`.
     - Sybil Double-Voting $\rightarrow$ Blocked by a `VoterRecord PDA` collision.
     - Arithmetic Overflow $\rightarrow$ Caught by `Checked Math`.
     - RPC Failure $\rightarrow$ Circuit Breaker automatic failover.

6. **Priority Fee & Sealevel Compute Budget:**
   - Priority selector (Normal 0 µL / Fast +15k µL / Turbo +50k µL).
   - Injects `ComputeBudgetProgram.setComputeUnitPrice` and `setComputeUnitLimit` instructions.

7. **Raycast / Linear Keyboard-First DX & Web Audio:**
   - Hotkeys: `1` (Coupon), `2` (Redemption), `3` (Vote FOR), `4` (Vote AGAINST), `C` (Network), `O` (Oracle), `I` (ISO), `B` (Blinks), `R` (Reset), `?` (Help), `Esc` (Close).
   - Synthesized Web Audio feedback (clicks, confirmation chords, warnings).

---

## 📂 Repository structure

```
kase_corporate_actions/
├── Anchor.toml                              # Anchor config for Solana Localnet/Devnet/Mainnet
├── Cargo.toml                               # Root Rust workspace manifest
├── package.json                             # TypeScript / Mocha / Chai dependencies
├── tsconfig.json                            # TypeScript configuration
├── programs/
│   └── kase_corporate_actions/
│       ├── Cargo.toml                       # Anchor program manifest
│       └── src/
│           ├── lib.rs                       # On-chain instructions, CPIs and contexts
│           ├── state.rs                     # PDA state (BondSecurity, CorporateAction, etc.)
│           ├── errors.rs                    # Exchange-grade error codes
│           ├── events.rs                    # On-chain events for the CSD and indexers
│           └── math.rs                      # Entitlement math engine (fixed-point)
├── src/
│   └── entitlement_engine.ts                # TypeScript entitlement and quorum engine
├── tests/
│   └── kase_corporate_actions.test.ts       # Integration and adversarial tests
├── scripts/
│   └── verify_settlement_flow.ts            # E2E script verifying all 3 scenarios with Explorer links
├── terminal/                                # KASE institutional trading terminal
│   ├── index.html                           # Bloomberg/Refinitiv-style web terminal
│   ├── style.css                            # KASE Emerald / Kazakhstan Gold / Dark Slate UI
│   ├── app.js                               # Terminal controller, Web3 engine and Blinks
│   ├── server.py                            # Python server with Blinks, ISO 20022 and CORS support
│   └── actions.json                         # Dialect Solana Actions spec
├── verify.py                                # Standalone master test covering 8/8 audit areas
├── HACKATHON_SUBMISSION.md                  # Full KASE x Superteam hackathon submission
└── README.md                                # This document
```

---

## 🧪 Turnkey run and verification

### 1. Run the system master auditor (8/8 checks):
```bash
python verify.py
```
*(`verify.py` is a static checklist over the source tree. It currently reports `[FAIL] SPL Token-2022 Interface Support`: the deployed program uses the classic SPL Token program, and Token-2022 is roadmap. The authoritative proof is the real Devnet run in [DEVNET_PROOF.md](DEVNET_PROOF.md).)*

### 2. Start the terminal server:
```bash
python terminal/server.py
```
Open in a browser: **`http://localhost:8088`** *(press `Ctrl + F5`)*.

---

## 👥 Team & Acknowledgements
Built for the **KASE (Kazakhstan Stock Exchange)** and **Superteam Kazakhstan** hackathon.  
*Reliability and verification: working code and comprehensive tests.*


## Live Devnet Deployment (verified)

- **Program ID:** [`5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz`](https://explorer.solana.com/address/5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz?cluster=devnet)
- **Deploy tx:** [4u96WS31…](https://explorer.solana.com/tx/4u96WS31cUb7wozMADQhJMfej7gUN3jP3uoDGxkLFbPAGWZPhoKtKPcjr7kckPaarGhKLL4q5ADoe7RWC9ZWRVY8?cluster=devnet)
- **Demo bond:** `KZDEMO749442` → [`iA5gqu2fndMLJGX986gNcnq9a849q3Xapwu1iRvaMSs`](https://explorer.solana.com/address/iA5gqu2fndMLJGX986gNcnq9a849q3Xapwu1iRvaMSs?cluster=devnet)
- **Final on-chain state:** coupon 12.50% (after vote), active supply 0, matured, bond mint supply 0; holders received 63,000 / 31,500 / 10,500 demo-USDC.

| Step | Result | Transaction |
|---|---|---|
| 1. initialize_bond_instrument KZDEMO749442: 100 bonds x 1,000 USDC, 10% semi-annual | ✅ OK | [2oY9d6LB…](https://explorer.solana.com/tx/2oY9d6LByrFFsiK9JbGXKHbSMzy2zfB4WcXvDWsGUpa1dUYMUKK5sLYgAk8MCHfkkMMCW5CeEbHmLxRoGDsRhWim?cluster=devnet) |
| 2.1 schedule_corporate_action #1 CouponPayment | ✅ OK | [2F6f4qDD…](https://explorer.solana.com/tx/2F6f4qDDMc1wpU4X21im7JZZojeCXXMifVSk6hK8ZZBBZHU14i1vZEnjroCbd9tZNfymLmZtEuSAWQwDCW5gtuJy?cluster=devnet) |
| 2.2 record_holder_snapshot holder 1 (60 bonds) | ✅ OK | [3JNanySs…](https://explorer.solana.com/tx/3JNanySs9u1GxqVgbAfZ14jmCm1sT1Ca4523FHFMVTvqnCvWbWbGbdcVzPE4Fak3hPzsyXdCWfG9ttdGhF3Xwyr5?cluster=devnet) |
| 2.2 record_holder_snapshot holder 2 (30 bonds) | ✅ OK | [8VVAsZKg…](https://explorer.solana.com/tx/8VVAsZKgob2qRhBhMTgbs93jKnNRsFWzqLicmMUZFe5XCYZCtrZz3BuesAfegmcEw4mBrrC7jmyrNeUaToeVmG6?cluster=devnet) |
| 2.2 record_holder_snapshot holder 3 (10 bonds) | ✅ OK | [4hWs11Jz…](https://explorer.solana.com/tx/4hWs11Jzu7FQocrmy62R4AcBQetz1BRaRuy5di4362BZ4eJyrEKZGtWdfoK572X4CCPbZzPvUcDaQ7tUuDGRPn7C?cluster=devnet) |
| 2.3 deposit_action_vault 5000 USDC | ✅ OK | [4vkAAJs1…](https://explorer.solana.com/tx/4vkAAJs1PhaatjiCPvGMWp2kzJHPfJfFmJMMVsxdEhg9jh4d6iUfXSrKxc7cvhcpueniuU7fNrQNR5wdaFkvSycW?cluster=devnet) |
| 2.4 execute_coupon_payment holder 1: 3000 USDC | ✅ OK | [3F2i1r1U…](https://explorer.solana.com/tx/3F2i1r1U3nZyq61AcTFEH8zMbg2DtZRbKG44z4ZquzKsyUhJRGWe313ZTpHXVfb5yrmqafcdcfwFrLku7sTvmWzL?cluster=devnet) |
| 2.4 execute_coupon_payment holder 2: 1500 USDC | ✅ OK | [22df26NW…](https://explorer.solana.com/tx/22df26NWHjsQSFXc7MVzfvGQhXctUR6Ttqrig9ZBmKwzRxAcZfWmPhYRSzGkPFcruCGQUfzUuteE6eJnsTHHG6o9?cluster=devnet) |
| 2.4 execute_coupon_payment holder 3: 500 USDC | ✅ OK | [5T8eHM2b…](https://explorer.solana.com/tx/5T8eHM2bN9xZZSvcVLdA7xKxDubr9QjmS7bCVcUaScQdJFhTmDsCAvDgzY6zBs9VXFJetskru9W4jaddoetMCe8n?cluster=devnet) |
| ATTACK: double coupon claim holder 1 (must be rejected: AlreadySettled) | 🛡 rejected | [5pJU8Ay7…](https://explorer.solana.com/tx/5pJU8Ay7nqLAQrqqSz8e2qc562u532ge6pCrVDSrBJswp3yuRoFtNZ55VvqDc8U5aBe5ZGUGehxHdMZaSrRTq6Bn?cluster=devnet) |
| ATTACK: holder 3 tries to schedule an action (must be rejected: UnauthorizedAuthority) | 🛡 rejected | [3EHKKsHt…](https://explorer.solana.com/tx/3EHKKsHtM2bnPmPXrgBf1PL4QiToBxdcn4TSL3FJRVkghH5hvt2Cq97H5ceuSbW79LD6yQHFUbXdrzVpXz9omDFg?cluster=devnet) |
| 3.1 schedule_corporate_action #3 GovernanceVoting (record date) | ✅ OK | [4yjuhzAJ…](https://explorer.solana.com/tx/4yjuhzAJuq1nRqm1K3g6JgWGQxhFSg3TABoeqLatCynRZ54hJZXGYmkuc7Gfv6KjDJNfJATBAEGBfjDpXeiaYGYR?cluster=devnet) |
| 3.2 record_holder_snapshot holder 1 (60 bonds) | ✅ OK | [TarTZ52f…](https://explorer.solana.com/tx/TarTZ52fQn97cc24ZPv7NYFELBC8CVkLu5a3F3k8QiwTGTeTpgBvpGpZyLcGSpbm29i9Zyr1p5poTAMwQbzHKVN?cluster=devnet) |
| 3.2 record_holder_snapshot holder 2 (30 bonds) | ✅ OK | [qfBshBfi…](https://explorer.solana.com/tx/qfBshBfitr3gT1dpRRj4hCDWqHsg6vXQabTH78HpzNzQLgvMTJVm1DxFraxnYRxhePFH1Ce5Df9JgVJjoNGrvLL?cluster=devnet) |
| 3.2 record_holder_snapshot holder 3 (10 bonds) | ✅ OK | [5ABFWYmF…](https://explorer.solana.com/tx/5ABFWYmFzuWKzUTSxXftoaumGFaxUv2hcbBVqjZrgHU6fVRMyjEPtW6PDuH2rkfShx7GJGNB1ucj78Le5Gvv2w1R?cluster=devnet) |
| 3.3 create_governance_proposal #101: raise coupon 10% -> 12.5%, quorum 51 | ✅ OK | [56HCGCKm…](https://explorer.solana.com/tx/56HCGCKm4ZnUiHd9DwL4UfsETugwHpqszpCiFeQ3vEuWSg6qiK5qVGW3T4jiuKo25kEgjKL9aa8vaEFipJBPGmAH?cluster=devnet) |
| 3.4 cast_bondholder_vote holder 1: For (weight 60) | ✅ OK | [2jLorUxe…](https://explorer.solana.com/tx/2jLorUxeG8ebD531Jctv9PLFCyeUVgYaH1LrYuhJKqvhAKQJSa5RKkDK3mZw1VtXckCjJLKDdzHpo6Hm5QHXqoo7?cluster=devnet) |
| 3.4 cast_bondholder_vote holder 2: Against (weight 30) | ✅ OK | [3c1MwH8p…](https://explorer.solana.com/tx/3c1MwH8pEMF788XuSx4sJXYK1jfX9S5cn4qF6AXH9mDYFY6QoJW9vnKA9sZRXacw9ND8hhkvFx2PV1eGLxARa5XW?cluster=devnet) |
| 3.4 cast_bondholder_vote holder 3: Abstain (weight 10) | ✅ OK | [5X6L1rV8…](https://explorer.solana.com/tx/5X6L1rV8LwpFjDXBUZwBxUj98EqHNUWfCnBNAXGiyNg3VWc6gH1aRErhfErzEYjusZbh7Ma238s6tLc94DSkGkbe?cluster=devnet) |
| ATTACK: holder 1 votes twice (must be rejected: voter record exists) | 🛡 rejected | [3ond4Abv…](https://explorer.solana.com/tx/3ond4AbvZPtJxx4tC4Y8xUBUakDZSSYVGShGFYz9zPQJvXpJN4JbUV9PhLukN5wx2KBLnqBouwmsALGfnqRWrw2z?cluster=devnet) |
| 3.5 finalize_governance_proposal #101 (60 for / 30 against / 10 abstain) | ✅ OK | [3Lx15aoW…](https://explorer.solana.com/tx/3Lx15aoWpzxkDaQL3fphVsJzAJnCYhroC13mXkbQMjoYEUNi8X3F2CEAPNjiTgECnMhq9AqcVhVziswTFyRCqJww?cluster=devnet) |
| 4.1 schedule_corporate_action #2 BondRedemption | ✅ OK | [5YwBBJ8y…](https://explorer.solana.com/tx/5YwBBJ8yzwHXA8EAV52KXdEa6H1pai1WosgM5hjiZvjetqrEnJnaGCKviJ8SSaAiZeNe3a3wZYV5gRucLopvoWYJ?cluster=devnet) |
| 4.2 record_holder_snapshot holder 1 (60 bonds) | ✅ OK | [2dNBgsnh…](https://explorer.solana.com/tx/2dNBgsnhTRgCWnTU8uwSoBisMh4v5P1BNGzx7KfRyhDC4DR9ADo4ahptrAtN478LNkw8iZHkfkvJjCWSo8N8pU3f?cluster=devnet) |
| 4.2 record_holder_snapshot holder 2 (30 bonds) | ✅ OK | [2NC36xrz…](https://explorer.solana.com/tx/2NC36xrzPRrRP6MkMhfmhVFf34efsY7zKfEqbdzbbxyGSczrotLHHqwYHdbHJ84N7xvGVxi8mWQwFYjxzbLdQEVg?cluster=devnet) |
| 4.2 record_holder_snapshot holder 3 (10 bonds) | ✅ OK | [hxE4aiL9…](https://explorer.solana.com/tx/hxE4aiL9s2XF1psAva5iTJYz1TpQQsHdSridLjnZcJyRHmT1jNTvuxgs5daWyU7sXPgVqJnKooxMzTpfqttxfYA?cluster=devnet) |
| 4.3 deposit_action_vault 100000 USDC | ✅ OK | [2FNf9ijV…](https://explorer.solana.com/tx/2FNf9ijVhJwvGPAHQqYpd3ws764cHUrHaSd9yLBuccr2ZvouJ1RSBiF8yLrTEevB6Bp279CEdbZE5j9SArqMGVfc?cluster=devnet) |
| 4.4 execute_bond_redemption holder 1: burn 60 bonds, pay 60000 USDC | ✅ OK | [RkEuxZVt…](https://explorer.solana.com/tx/RkEuxZVtdfYCKf7ikQ9xYfyd5UrMq4xqGhfGZUn28jSLJHaZuny4jMvyWKcm1FtRwVftrt6MXy4cDqztMGzqfMv?cluster=devnet) |
| 4.4 execute_bond_redemption holder 2: burn 30 bonds, pay 30000 USDC | ✅ OK | [4sVSv1Kh…](https://explorer.solana.com/tx/4sVSv1Khv9LqXUvYHMR5SSqkHnCYS3w1q6NQRL5MGw2uN9jSMj2zDbsgSLUmZbrEaLiy9RQZftaTSC5M3riLj6S7?cluster=devnet) |
| 4.4 execute_bond_redemption holder 3: burn 10 bonds, pay 10000 USDC | ✅ OK | [w77unAEL…](https://explorer.solana.com/tx/w77unAEL1pUPEXNH9EWusdnFnTrguYu4tHxtGAhi57Pxh5jKRaPnS5XaexVKYK8jWCmaBbdm12eMRXwPntXUj52?cluster=devnet) |
| ATTACK: holder 1 redeems twice (must be rejected) | 🛡 rejected | [122Yd9Xu…](https://explorer.solana.com/tx/122Yd9XuX3R6216L6cAvfQZtizt6NtVEFgAoEFeAaL8HPRFhV6b4WUS3qgMGSbGB2rdScZuBLNvjRcP95ofK3o9N?cluster=devnet) |
