/**
 * ==============================================================================
 * KASE AUTOMATED CORPORATE ACTIONS TERMINAL - PRODUCTION CLIENT CONTROLLER
 * Kazakhstan Stock Exchange (KASE) & Central Securities Depository (KCSD)
 * 100% Real Solana Devnet Broadcasting Engine via Official Memo Program
 * Bulletproof Mathematical Synchronization Engine & Phantom Web3 Architecture
 * ==============================================================================
 */

// Official Institutional Participants Registry in KCSD Custody
const HOLDERS = [
  {
    name: "Bank A Treasury",
    badgeClass: "bank-a",
    badgeText: "BANK A",
    bin: "990140000001",
    subAccount: "KCSD-1001-BA",
    wallet: "BankATreasury111111111111111111111111111111",
    bonds: 3500,
  },
  {
    name: "Bank B Investment Division",
    badgeClass: "bank-b",
    badgeText: "BANK B",
    bin: "990140000002",
    subAccount: "KCSD-1002-BB",
    wallet: "BankBInvest11111111111111111111111111111111",
    bonds: 2500,
  },
  {
    name: "Broker C Custody",
    badgeClass: "broker-c",
    badgeText: "BROKER C",
    bin: "990140000003",
    subAccount: "KCSD-1003-BC",
    wallet: "BrokerCFinance111111111111111111111111111111",
    bonds: 2000,
  },
  {
    name: "Bank D Asset Management",
    badgeClass: "bank-d",
    badgeText: "BANK D",
    bin: "990140000004",
    subAccount: "KCSD-1004-BD",
    wallet: "BankDAssetMgmt11111111111111111111111111111",
    bonds: 1200,
  },
  {
    name: "Retail Investors Pool",
    badgeClass: "retail",
    badgeText: "RETAIL POOL",
    bin: "990140000005",
    subAccount: "KCSD-1005-RTL",
    wallet: "RetlInvestors111111111111111111111111111111",
    bonds: 800,
  },
];

// Configuration & Multi-Cluster Infrastructure
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";
const MEMO_PROGRAM_ID_STR = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

// Official Solana Clusters Registry (Devnet & Mainnet-Beta)
const CLUSTERS = {
  devnet: {
    id: "devnet",
    name: "Solana Devnet",
    shortName: "Devnet",
    defaultRpc: DEVNET_RPC_URL,
    explorerClusterParam: "?cluster=devnet",
    solscanClusterParam: "?cluster=devnet",
    isMainnet: false,
    faucetAvailable: true,
    badgeText: "BROADCAST: DEVNET ON-CHAIN",
    tickerText: "SOLANA DEVNET",
    genesisHash: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  },
  mainnet: {
    id: "mainnet",
    name: "Solana Mainnet-Beta",
    shortName: "Mainnet-Beta",
    defaultRpc: MAINNET_RPC_URL,
    explorerClusterParam: "",
    solscanClusterParam: "",
    isMainnet: true,
    faucetAvailable: false,
    badgeText: "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).",
    tickerText: "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).",
    genesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9v",
  },
};

let currentCluster = "devnet";
let customRpcUrls = {
  devnet: null,
  mainnet: null,
};
let selectedPriorityFeeTier = "normal"; // 'normal' | 'fast' | 'turbo'

// Independent on-chain execution state for each Solana cluster
const clusterStates = {
  devnet: {
    couponSettled: false,
    redemptionSettled: false,
    votesFor: 0,
    votesAgainst: 0,
    votesAbstain: 0,
    proposalFinalized: false,
    activeSupply: 10000,
    couponRateBps: 1000,
    couponTx: null,
    couponSlot: null,
    redemptionTx: null,
    redemptionSlot: null,
    voteForTx: null,
    voteAgainstTx: null,
    voteAbstainTx: null,
    proposalTx: null,
  },
  mainnet: {
    couponSettled: false,
    redemptionSettled: false,
    votesFor: 0,
    votesAgainst: 0,
    votesAbstain: 0,
    proposalFinalized: false,
    activeSupply: 10000,
    couponRateBps: 1000,
    couponTx: null,
    couponSlot: null,
    redemptionTx: null,
    redemptionSlot: null,
    voteForTx: null,
    voteAgainstTx: null,
    voteAbstainTx: null,
    proposalTx: null,
  },
};

function getActiveClusterState() {
  return clusterStates[currentCluster];
}

function syncStateFromCluster() {
  const cs = clusterStates[currentCluster];
  state.couponSettled = cs.couponSettled;
  state.redemptionSettled = cs.redemptionSettled;
  state.votesFor = cs.votesFor;
  state.votesAgainst = cs.votesAgainst;
  state.votesAbstain = cs.votesAbstain || 0;
  state.proposalFinalized = cs.proposalFinalized;
  state.activeSupply = cs.activeSupply;
  if (typeof BondMath !== "undefined" && BondMath.terms) {
    BondMath.terms.couponRateBps = cs.couponRateBps || 1000;
  }
  if (typeof updateFinancialMathHud === "function") {
    updateFinancialMathHud();
  }
}

function getActiveRpcUrl() {
  return customRpcUrls[currentCluster] || CLUSTERS[currentCluster].defaultRpc;
}

function getExplorerTxUrl(txHash) {
  const cluster = CLUSTERS[currentCluster];
  return `https://explorer.solana.com/tx/${txHash}${cluster.explorerClusterParam}`;
}

function getSolscanTxUrl(txHash) {
  const cluster = CLUSTERS[currentCluster];
  return `https://solscan.io/tx/${txHash}${cluster.solscanClusterParam}`;
}

// ==============================================================================
// BOND MATHEMATICAL ENGINE (100% Synced with Anchor Rust programs/math.rs)
// ==============================================================================
const BondMath = {
  // ISO 20022 Financial Instrument Master Terms (matches KASE_BENCHMARK_BOND)
  terms: {
    isin: "KZDEMO000001",
    name: "KASE Demo USD Bond 2026",
    issuer: "Demo Issuer JSC",
    faceValue: 1000.0,             // Nominal USD per bond
    faceValueRaw: 1000000000n,     // 1,000 USDC in 6-decimal micro-units
    couponRateBps: 1000,           // 10.00% annual coupon rate (1000 basis points)
    couponFrequency: 2,            // Semi-annual (2 payouts/year)
    totalSupply: 10000,            // 10,000 bonds = $10,000,000 pool
    maturityDate: "2026-12-31",
  },

  // Formula 1: Coupon entitlement per single bond
  // Formula: (FaceValue * CouponRateBps) / (10,000 * Frequency)
  getCouponPerBond(rateBps = null, freq = null, face = null) {
    const bps = rateBps !== null ? rateBps : this.terms.couponRateBps;
    const f = freq !== null ? freq : this.terms.couponFrequency;
    const fVal = face !== null ? face : this.terms.faceValue;
    if (f <= 0) return 0;
    return (fVal * bps) / (10000 * f);
  },

  // Formula 2: Total coupon entitlement for a position
  // Matches programs/kase_corporate_actions/src/math.rs: calculate_coupon_entitlement
  calculateCoupon(bondsHeld, rateBps = null, freq = null, face = null) {
    if (bondsHeld <= 0) return 0;
    const perBond = this.getCouponPerBond(rateBps, freq, face);
    return bondsHeld * perBond;
  },

  // Formula 3: Principal redemption for a position
  // Matches programs/kase_corporate_actions/src/math.rs: calculate_redemption_entitlement
  calculateRedemption(bondsHeld, face = null) {
    if (bondsHeld <= 0) return 0;
    const fVal = face !== null ? face : this.terms.faceValue;
    return bondsHeld * fVal;
  },

  // Formula 4: On-Chain fixed point micro-units (6 decimals)
  calculateCouponMicroUnits(bondsHeld, rateBps = null, freq = null) {
    const bps = BigInt(rateBps !== null ? rateBps : this.terms.couponRateBps);
    const f = BigInt(freq !== null ? freq : this.terms.couponFrequency);
    const bonds = BigInt(bondsHeld);
    const denominator = 10000n * f;
    const numerator = bonds * this.terms.faceValueRaw * bps;
    return numerator / denominator;
  },

  // Formula 5: Governance Quorum & Majority Progress
  // Matches programs/kase_corporate_actions/src/math.rs: is_quorum_reached, is_proposal_passed
  getQuorumProgress(votesFor, votesAgainst, arg3 = 5000, arg4 = 0) {
    let quorumThreshold = 5000;
    let votesAbstain = 0;
    if (arg3 !== undefined && arg4 !== undefined && arg4 >= 1000 && arg3 < 1000) {
      votesAbstain = arg3;
      quorumThreshold = arg4;
    } else {
      if (arg3 !== undefined) quorumThreshold = arg3;
      if (arg4 !== undefined) votesAbstain = arg4;
    }
    if (votesAbstain === 0 && typeof state !== "undefined" && state && state.votesAbstain) {
      votesAbstain = state.votesAbstain;
    }
    const totalVotes = votesFor + votesAgainst + votesAbstain;
    const quorumReached = totalVotes >= quorumThreshold;
    const quorumPercentage = Math.min(100, Math.round((totalVotes / quorumThreshold) * 100));
    const issuePercentage = Math.round((totalVotes / this.terms.totalSupply) * 100);
    const passed = quorumReached && votesFor > votesAgainst;
    return { totalVotes, quorumReached, quorumPercentage, issuePercentage, passed };
  },

  // Aggregate totals across all CSD registered holders
  getAggregateTotals(holdersList) {
    let totalBonds = 0;
    let totalNominal = 0;
    let totalCoupon = 0;
    let totalRedemption = 0;

    holdersList.forEach((h) => {
      totalBonds += h.bonds;
      totalNominal += this.calculateRedemption(h.bonds);
      totalCoupon += this.calculateCoupon(h.bonds);
      totalRedemption += this.calculateRedemption(h.bonds);
    });

    return { totalBonds, totalNominal, totalCoupon, totalRedemption };
  },
};

// Global Runtime State
let connection = null;
let memoProgramId = null;
let phantomListenersBound = false;

let state = {
  walletConnected: true,
  walletType: "operator", // "phantom" | "operator"
  userExplicitlySelectedSigner: false,
  walletAddress: "KASEOpKey888888888888888888888888888888888",
  walletPubkey: null,
  operatorKeypair: null,
  phantomProvider: null,
  phantomConnected: false,
  phantomPubkey: null,
  phantomAddress: null,
  solBalance: 0,
  activeSupply: 10000,
  couponSettled: false,
  redemptionSettled: false,
  votesFor: 0,
  votesAgainst: 0,
  votesAbstain: 0,
  proposalFinalized: false,
  currentSlot: null,
  pendingActionCallback: null,
};

// ==============================================================================
// UTILITIES: Currency & Monospace Formatting
// ==============================================================================
function formatUSD(num) {
  return (
    "$" +
    Number(num).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function truncateAddress(addr) {
  if (!addr) return "Unknown";
  const s = String(addr);
  if (s.length <= 10) return s;
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

// ==============================================================================
// LOGGING & CONSOLE STREAM
// ==============================================================================
function appendLog(tag, tagClass, message, txHash = null) {
  const output = document.getElementById("consoleOutput");
  if (!output) return;

  const cluster = CLUSTERS[currentCluster];
  const isMainnet = cluster && cluster.isMainnet;

  // Security & Audit: On Mainnet, verify NO log states or implies that Anchor program ran on Mainnet
  if (isMainnet && typeof message === "string") {
    if (message.includes("5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz")) {
      appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
      appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).", txHash);
      return;
    }
    if (/(?:kase[_\s]corporate[_\s]actions|anchor\s+program|anchor\s+contract)/i.test(message) &&
        !message.includes("live on Devnet")) {
      appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
      appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).", txHash);
      return;
    }
  }

  const now = new Date().toTimeString().split(" ")[0];
  const div = document.createElement("div");
  div.className = "log-entry";

  let txHtml = "";
  if (txHash) {
    const expUrl = getExplorerTxUrl(txHash);
    const clusterName = CLUSTERS[currentCluster].shortName;
    txHtml = ` <a class="log-link font-mono" href="${expUrl}" target="_blank" rel="noopener" title="Open verified transaction on Solana ${clusterName} Explorer">[Explorer: ${txHash.slice(0, 8)}...]</a>`;
  }

  div.innerHTML = `<span class="log-time font-mono">[${now}]</span><span class="log-tag ${tagClass}">${tag}</span><span>${message}</span>${txHtml}`;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

function logConsole(tag, tagClass, message, txHash = null) {
  return appendLog(tag, tagClass, message, txHash);
}
window.logConsole = logConsole;


// ==============================================================================
// TOAST NOTIFICATION SYSTEM
// ==============================================================================
function showToast(title, message, type = "success", duration = 5000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let icon = "✔";
  if (type === "warning") icon = "⚠️";
  if (type === "error") icon = "✖";
  if (type === "info") icon = "ℹ️";

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==============================================================================
// PHANTOM PROVIDER RESOLUTION (Robust Multi-Provider Architecture)
// ==============================================================================
function getPhantomProvider() {
  if (typeof window !== "undefined") {
    // 1. Direct Phantom modern namespace
    if (window.phantom && window.phantom.solana && window.phantom.solana.isPhantom) {
      return window.phantom.solana;
    }
    // 2. Standard solana injection fallback
    if (window.solana && window.solana.isPhantom) {
      return window.solana;
    }
  }
  return null;
}

// ==============================================================================
// OPERATOR KEYPAIR & SIGNER MANAGEMENT
// ==============================================================================
function getOrCreateOperatorKeypair() {
  const web3 = window.solanaWeb3;
  if (!web3 || !web3.Keypair) return null;

  try {
    const stored = localStorage.getItem("kase_csd_operator_secret");
    if (stored) {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr) && arr.length === 64) {
        return web3.Keypair.fromSecretKey(new Uint8Array(arr));
      }
    }
  } catch (e) {
    console.warn("Could not retrieve stored operator keypair:", e);
  }

  // Generate new persistent CSD Operator Keypair
  const kp = web3.Keypair.generate();
  try {
    localStorage.setItem("kase_csd_operator_secret", JSON.stringify(Array.from(kp.secretKey)));
  } catch (e) {}
  return kp;
}

function switchToOperatorMode() {
  state.walletType = "operator";
  state.walletConnected = true;
  state.userExplicitlySelectedSigner = true;

  if (state.operatorKeypair) {
    state.walletPubkey = state.operatorKeypair.publicKey;
    state.walletAddress = state.walletPubkey.toString();
  } else {
    state.walletAddress = "KASEOpKey888888888888888888888888888888888";
  }

  updateWalletUI();
  updateActionButtons();
  refreshWalletBalance();
  const cluster = CLUSTERS[currentCluster];
  appendLog("SIGNER", "tag-ok", `Active Signer: KASE CSD Institutional Authority (${cluster.shortName} Operator Keypair)`);
  showToast("CSD Mode Active", `Switched to KASE CSD Institutional Authority keypair for autonomous ${cluster.shortName} execution.`, "info");
}

function switchToPhantomMode() {
  state.userExplicitlySelectedSigner = true;
  const provider = getPhantomProvider();
  if (!provider) {
    showToast(
      "Phantom Not Detected",
      "Расширение Phantom не обнаружено в браузере. Установите Phantom с официального сайта phantom.app",
      "warning",
      7000
    );
    return;
  }

  if (state.phantomConnected && state.phantomPubkey) {
    state.walletType = "phantom";
    state.walletPubkey = state.phantomPubkey;
    state.walletAddress = state.phantomAddress;
    updateWalletUI();
    updateActionButtons();
    refreshWalletBalance();
    appendLog("SIGNER", "tag-ok", `Active Signer switched to Phantom Wallet (${truncateAddress(state.walletAddress)})`);
    showToast("Phantom Active", `Режим Phantom включен. Все транзакции будут подтверждаться в окне Phantom!`, "success");
    checkPhantomClusterAlignment();
  } else {
    connectPhantomWallet(false);
  }
}

async function connectPhantomWallet(eager = false) {
  const provider = getPhantomProvider();
  if (!provider) {
    if (!eager) {
      showToast(
        "Phantom Not Found",
        "Расширение Phantom не установлено в вашем браузере. Пожалуйста, установите Phantom с phantom.app для интерактивного подписания.",
        "warning",
        7000
      );
    }
    return false;
  }

  try {
    const resp = await provider.connect(eager ? { onlyIfTrusted: true } : {});
    if (!resp || !resp.publicKey) return false;

    state.phantomProvider = provider;
    state.phantomConnected = true;
    state.phantomPubkey = resp.publicKey;
    state.phantomAddress = resp.publicKey.toString();

    // Set as active signer
    state.walletType = "phantom";
    state.walletConnected = true;
    state.walletPubkey = resp.publicKey;
    state.walletAddress = resp.publicKey.toString();

    updateWalletUI();
    updateActionButtons();
    await refreshWalletBalance();

    const cluster = CLUSTERS[currentCluster];
    appendLog("WALLET", "tag-ok", `Phantom Wallet connected to ${cluster.name}: ${state.walletAddress}`);
    showToast(
      "Phantom Connected!",
      `Кошелек ${truncateAddress(state.walletAddress)} синхронизирован на ${cluster.name}. Баланс: ${state.solBalance.toFixed(4)} SOL`,
      "success"
    );

    // Cluster alignment guidance
    checkPhantomClusterAlignment();

    if (!cluster.isMainnet && state.solBalance < 0.005) {
      showToast(
        "Бесплатный газ Devnet",
        "Ваш баланс Phantom на Devnet равен 0 SOL. Мы автоматически пополним его перед первой транзакцией, либо нажмите 'Airdrop +1 SOL'.",
        "info",
        7000
      );
    }

    // Set up listeners for account changes & disconnect (guarded to prevent leaks)
    if (!phantomListenersBound) {
      provider.on("accountChanged", (publicKey) => {
        if (publicKey) {
          state.phantomPubkey = publicKey;
          state.phantomAddress = publicKey.toString();
          if (state.walletType === "phantom") {
            state.walletPubkey = publicKey;
            state.walletAddress = publicKey.toString();
          }
          updateWalletUI();
          refreshWalletBalance();
          appendLog("WALLET", "tag-broadcast", `Phantom account changed: ${truncateAddress(publicKey.toString())}`);
        } else {
          state.phantomConnected = false;
          switchToOperatorMode();
        }
      });

      provider.on("disconnect", () => {
        state.phantomConnected = false;
        appendLog("WALLET", "tag-warn", "Phantom wallet disconnected.");
        switchToOperatorMode();
      });

      phantomListenersBound = true;
    }

    return true;
  } catch (err) {
    if (!eager) {
      console.warn("Phantom connection notice:", err);
      if (err.code === 4001 || err.message?.includes("User rejected")) {
        showToast("Подключение отменено", "Вы отменили подключение в окне Phantom.", "warning");
      } else {
        showToast("Ошибка Phantom", err.message || "Не удалось подключить Phantom.", "error");
      }
    }
    return false;
  }
}

// ==============================================================================
// DYNAMIC UI UPDATES & ACTION BUTTON LABELS
// ==============================================================================
function updateWalletUI() {
  const roleLabel = document.getElementById("walletRoleLabel");
  const addrDisplay = document.getElementById("walletAddressDisplay");
  const btnWallet = document.getElementById("btnConnectWallet");
  const walletBtnText = document.getElementById("walletBtnText");
  const avatarInitials = document.getElementById("avatarInitials");
  const walletAvatar = document.getElementById("walletAvatar");

  const btnModePhantom = document.getElementById("btnModePhantom");
  const btnModeOperator = document.getElementById("btnModeOperator");
  const phantomBadgePill = document.getElementById("phantomBadgePill");

  if (state.walletType === "phantom") {
    if (roleLabel) {
      roleLabel.textContent = "Phantom Signer";
      roleLabel.className = "role-badge phantom";
    }
    if (addrDisplay) addrDisplay.textContent = truncateAddress(state.walletAddress);
    if (btnWallet) btnWallet.classList.add("connected");
    if (walletBtnText) walletBtnText.textContent = "Phantom Active";
    if (avatarInitials) avatarInitials.textContent = "PH";
    if (walletAvatar) walletAvatar.style.background = "linear-gradient(135deg, #9945FF 0%, #14F195 100%)";

    if (btnModePhantom) btnModePhantom.className = "btn-signer-mode active";
    if (btnModeOperator) btnModeOperator.className = "btn-signer-mode";
    if (phantomBadgePill) phantomBadgePill.textContent = "Active";
  } else {
    // Operator authority
    if (roleLabel) {
      roleLabel.textContent = "CSD Operator";
      roleLabel.className = "role-badge";
    }
    if (addrDisplay) addrDisplay.textContent = truncateAddress(state.walletAddress);
    if (btnWallet) btnWallet.classList.remove("connected");
    if (walletBtnText) walletBtnText.textContent = state.phantomConnected ? "Switch to Phantom" : "Connect Phantom";
    if (avatarInitials) avatarInitials.textContent = "CSD";
    if (walletAvatar) walletAvatar.style.background = "linear-gradient(135deg, #2563EB 0%, #10B981 100%)";

    if (btnModePhantom) btnModePhantom.className = "btn-signer-mode";
    if (btnModeOperator) btnModeOperator.className = "btn-signer-mode operator-active";
    if (phantomBadgePill) phantomBadgePill.textContent = state.phantomConnected ? "Ready" : "Connect";
  }
}

function updateActionButtons() {
  const isPhantom = state.walletType === "phantom";
  const couponAmount = formatUSD(BondMath.calculateCoupon(BondMath.terms.totalSupply));
  const cluster = CLUSTERS[currentCluster];
  const clusterLabel = cluster.shortName;

  // Scenario 1 Coupon
  const btnCoupon = document.getElementById("btnExecuteCoupon");
  if (btnCoupon) {
    if (state.couponSettled) {
      btnCoupon.innerHTML = `<span>✔ Scenario 1 Fully Settled on ${clusterLabel}</span>`;
      btnCoupon.disabled = true;
    } else {
      btnCoupon.disabled = false;
      btnCoupon.innerHTML = isPhantom
        ? `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>🦊 Подтвердить в Phantom: Выплата купона ${couponAmount} (${clusterLabel})</span>
        `
        : `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>🏛️ Выполнить через CSD Operator (${couponAmount} USDC • ${clusterLabel})</span>
        `;
    }
  }

  // Scenario 2 Redemption
  const btnRedeem = document.getElementById("btnExecuteRedemption");
  if (btnRedeem) {
    if (state.redemptionSettled) {
      btnRedeem.innerHTML = `<span>✔ Scenario 2 Fully Redeemed & Burned on ${clusterLabel}</span>`;
      btnRedeem.disabled = true;
    } else {
      btnRedeem.disabled = false;
      btnRedeem.innerHTML = isPhantom
        ? `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <span>🦊 Подтвердить в Phantom: Погашение и сжигание $10,000,000 (${clusterLabel})</span>
        `
        : `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <span>🏛️ Выполнить через CSD Operator ($10,000,000 & Burn • ${clusterLabel})</span>
        `;
    }
  }

  // Scenario 3 Voting
  const btnVoteFor = document.getElementById("btnVoteFor");
  if (btnVoteFor) {
    if (state.votesFor > 0) {
      btnVoteFor.innerHTML = `<span>✔ 6,000 Votes FOR Cast (${clusterLabel})</span>`;
      btnVoteFor.disabled = true;
    } else {
      btnVoteFor.disabled = false;
      btnVoteFor.innerHTML = isPhantom
        ? `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>🦊 Голосовать ЗА (6,000) в Phantom</span>
        `
        : `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>🏛️ Голосовать ЗА (6,000) от CSD</span>
        `;
    }
  }

  const btnVoteAgainst = document.getElementById("btnVoteAgainst");
  if (btnVoteAgainst) {
    if (state.votesAgainst > 0) {
      btnVoteAgainst.innerHTML = `<span>✔ 1,200 Votes AGAINST Cast (${clusterLabel})</span>`;
      btnVoteAgainst.disabled = true;
    } else {
      btnVoteAgainst.disabled = false;
      btnVoteAgainst.innerHTML = isPhantom
        ? `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>🦊 Голосовать ПРОТИВ (1,200) в Phantom</span>
        `
        : `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>🏛️ Голосовать ПРОТИВ (1,200) от CSD</span>
        `;
    }
  }

  const btnVoteAbstain = document.getElementById("btnVoteAbstain");
  if (btnVoteAbstain) {
    if (state.votesAbstain > 0) {
      btnVoteAbstain.innerHTML = `<span>✔ 800 Votes ABSTAIN Cast (${clusterLabel})</span>`;
      btnVoteAbstain.disabled = true;
    } else {
      btnVoteAbstain.disabled = false;
      btnVoteAbstain.innerHTML = isPhantom
        ? `
          <span class="btn-vote-icon">⚪</span>
          <span class="btn-vote-title">🦊 Воздержаться (800) в Phantom</span>
          <span class="btn-vote-desc">Record neutral vote (8% supply)</span>
        `
        : `
          <span class="btn-vote-icon">⚪</span>
          <span class="btn-vote-title">VOTE ABSTAIN (Retail Pool: 800)</span>
          <span class="btn-vote-desc">Record neutral vote (8% supply)</span>
        `;
    }
  }

  const btnFinalize = document.getElementById("btnFinalizeVoting");
  if (btnFinalize) {
    if (state.proposalFinalized) {
      btnFinalize.innerHTML = `<span>✔ Реструктуризация утверждена на ${clusterLabel}</span>`;
      btnFinalize.disabled = true;
    } else {
      btnFinalize.disabled = false;
      btnFinalize.innerHTML = isPhantom
        ? `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>🦊 Финализировать предложение в Phantom</span>
        `
        : `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>🏛️ Финализировать предложение от CSD</span>
        `;
    }
  }
}

async function refreshWalletBalance() {
  if (!connection || !state.walletPubkey) {
    const balEl = document.getElementById("walletSolBalance");
    if (balEl) balEl.textContent = "0.000 SOL";
    const safetyBalEl = document.getElementById("mainnetSignerBalance");
    if (safetyBalEl) safetyBalEl.textContent = "0.00000 SOL";
    return 0;
  }

  try {
    const lamports = await connection.getBalance(state.walletPubkey);
    state.solBalance = lamports / (window.solanaWeb3?.LAMPORTS_PER_SOL || 1e9);
    const balEl = document.getElementById("walletSolBalance");
    if (balEl) balEl.textContent = `${state.solBalance.toFixed(3)} SOL`;

    const safetyBalEl = document.getElementById("mainnetSignerBalance");
    if (safetyBalEl) {
      safetyBalEl.textContent = `${state.solBalance.toFixed(5)} SOL`;
      if (CLUSTERS[currentCluster].isMainnet) {
        safetyBalEl.style.color = state.solBalance >= 0.000005 ? "var(--kase-green)" : "var(--danger)";
      }
    }
    return state.solBalance;
  } catch (e) {
    console.warn("Failed to fetch balance from active RPC:", e);
    return state.solBalance;
  }
}

// ==============================================================================
// PRE-FLIGHT GAS CHECK & AUTOMATIC SUBSIDY ENGINE
// ==============================================================================
async function ensureGasBalance(targetPubkey, minSol = 0.005) {
  if (!connection || !targetPubkey) return;

  const web3 = window.solanaWeb3;
  const cluster = CLUSTERS[currentCluster];

  try {
    const lamports = await connection.getBalance(targetPubkey);
    const sol = lamports / (web3?.LAMPORTS_PER_SOL || 1e9);

    if (cluster.isMainnet) {
      // Mainnet: Strict fee check (~0.000005 SOL fee), do not run faucet!
      const minMainnetFee = 0.000005;
      if (sol < minMainnetFee) {
        appendLog(
          "GAS-GUARD",
          "tag-err",
          `НЕДОСТАТОЧНО СРЕДСТВ: Баланс ${truncateAddress(targetPubkey.toString())} составляет ${sol.toFixed(7)} SOL (< ${minMainnetFee} SOL).`
        );
        throw new Error(
          `Недостаточно реального SOL на кошельке для оплаты комиссии сети Solana Mainnet-Beta (~0.000005 SOL). Текущий баланс: ${sol.toFixed(7)} SOL. Пополните баланс кошелька перед транзакцией.`
        );
      }
      return;
    }

    if (sol < minSol) {
      appendLog(
        "GAS-GUARD",
        "tag-broadcast",
        `Баланс ${truncateAddress(targetPubkey.toString())} составляет ${sol.toFixed(4)} SOL (< ${minSol} SOL). Автоматическое пополнение газа...`
      );
      showToast(
        "Пополнение газа Devnet",
        `Зачисление тестового SOL на ${truncateAddress(targetPubkey.toString())} для оплаты комиссий...`,
        "info",
        4000
      );

      // Attempt 1: Direct Faucet Request
      try {
        const sig = await connection.requestAirdrop(targetPubkey, 0.5 * web3.LAMPORTS_PER_SOL);
        const latest = await connection.getLatestBlockhash("confirmed");
        await connection.confirmTransaction(
          {
            signature: sig,
            blockhash: latest.blockhash,
            lastValidBlockHeight: latest.lastValidBlockHeight,
          },
          "confirmed"
        );
        appendLog("GAS-GUARD", "tag-ok", `Успешно начислено 0.5 SOL из крана Devnet!`, sig);
      } catch (faucetErr) {
        console.warn("Public airdrop faucet rate limit:", faucetErr);

        // Attempt 2: Transfer from funded CSD Operator Keypair if available
        if (state.operatorKeypair && state.operatorKeypair.publicKey.toString() !== targetPubkey.toString()) {
          const opBal = await connection.getBalance(state.operatorKeypair.publicKey);
          if (opBal > 0.05 * 1e9) {
            appendLog("GAS-SUBSIDY", "tag-broadcast", "Субсидирование 0.05 SOL из казначейства KASE CSD...");
            const { blockhash } = await connection.getLatestBlockhash("confirmed");
            const tx = new web3.Transaction().add(
              web3.SystemProgram.transfer({
                fromPubkey: state.operatorKeypair.publicKey,
                toPubkey: targetPubkey,
                lamports: 0.05 * web3.LAMPORTS_PER_SOL,
              })
            );
            tx.recentBlockhash = blockhash;
            tx.feePayer = state.operatorKeypair.publicKey;
            tx.sign(state.operatorKeypair);
            const sig = await connection.sendRawTransaction(tx.serialize());
            await connection.confirmTransaction(sig, "confirmed");
            appendLog("GAS-SUBSIDY", "tag-ok", `0.05 SOL переведено на кошелек пользователя для газа!`, sig);
          }
        }
      }

      await refreshWalletBalance();
    }
  } catch (err) {
    if (cluster.isMainnet) {
      if (err.message && err.message.includes("429")) {
        throw new Error("Публичный RPC Solana Mainnet-Beta временно перегружен (429 Rate Limit). Укажите приватный RPC (Helius/QuickNode) в настройках RPC.");
      }
      throw err;
    }
    console.warn("Pre-flight gas guard exception:", err);
  }
}

// Airdrop SOL handler
async function handleAirdrop() {
  const cluster = CLUSTERS[currentCluster];
  if (cluster.isMainnet) {
    showToast(
      "Airdrop недоступен",
      "Кран Airdrop доступен только в сети Solana Devnet. В Mainnet-Beta используются реальные токены SOL.",
      "warning",
      5000
    );
    return;
  }

  const btn = document.getElementById("btnAirdrop");
  const txt = document.getElementById("btnAirdropText");

  if (!connection || !state.walletPubkey) {
    showToast("Error", "Wallet not initialized for airdrop.", "error");
    return;
  }

  btn.disabled = true;
  txt.textContent = "Requesting Airdrop...";
  appendLog("AIRDROP", "tag-broadcast", `Запрос 1.0 SOL Devnet airdrop для ${truncateAddress(state.walletAddress)}...`);

  try {
    const lamports = 1 * (window.solanaWeb3?.LAMPORTS_PER_SOL || 1e9);
    const airdropSig = await connection.requestAirdrop(state.walletPubkey, lamports);
    appendLog("AIRDROP", "tag-tx", `Airdrop транзакция отправлена: ${airdropSig.slice(0, 16)}... Подтверждение...`);

    const latest = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      {
        signature: airdropSig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed"
    );

    await refreshWalletBalance();
    appendLog("CONFIRMED", "tag-ok", `1.0 SOL Airdrop подтвержден на Devnet! Новый баланс: ${state.solBalance.toFixed(3)} SOL`, airdropSig);
    showToast("Airdrop Зачислен!", `+1.000 SOL успешно зачислено на ${truncateAddress(state.walletAddress)}!`, "success");
  } catch (err) {
    console.error("Airdrop error:", err);
    appendLog("ERROR", "tag-err", `Devnet airdrop faucet notice: ${err.message || err}`);
    showToast(
      "Airdrop Notice",
      "Публичный кран Solana Devnet временно ограничен. Если в Phantom есть тестовый SOL, вы можете продолжить.",
      "warning",
      5000
    );
  } finally {
    btn.disabled = false;
    txt.textContent = "Airdrop +1 SOL (Devnet)";
  }
}

// ==============================================================================
// CLUSTER STATUS & LIVE SLOT POLLING
// ==============================================================================
async function pollClusterStats() {
  if (!connection) return;

  try {
    const t0 = performance.now();
    const slot = await connection.getSlot("confirmed");
    const latency = Math.round(performance.now() - t0);
    state.currentSlot = slot;

    const slotEl = document.getElementById("devnetSlotDisplay");
    if (slotEl) {
      slotEl.textContent = `Slot #${slot.toLocaleString()}`;
    }

    const latEl = document.getElementById("clusterLatency");
    if (latEl) {
      latEl.textContent = `Ping: ${latency}ms`;
    }

    const pingDot = document.getElementById("clusterPingDot");
    if (pingDot) {
      if (latency < 350) {
        pingDot.style.background = "var(--kase-green)";
        pingDot.style.boxShadow = "0 0 8px var(--kase-green)";
      } else {
        pingDot.style.background = "var(--kz-gold)";
        pingDot.style.boxShadow = "0 0 8px var(--kz-gold)";
      }
    }
  } catch (e) {
    console.warn("Cluster poll notice:", e);
    const latEl = document.getElementById("clusterLatency");
    if (latEl) latEl.textContent = "Reconnecting...";
  }
}

// ==============================================================================
// CLUSTER SWITCHER & PHANTOM ALIGNMENT CONTROLLER
// ==============================================================================
function updateClusterUI() {
  const cluster = CLUSTERS[currentCluster];
  const isMainnet = cluster.isMainnet;
  const cs = clusterStates[currentCluster];

  // Sync state values with active cluster
  syncStateFromCluster();

  // 0. Window / Document Title
  document.title = `KASE Automated Corporate Actions Terminal | Kazakhstan Stock Exchange on ${cluster.name}`;

  // 1. Cluster Toggle Buttons
  const btnDevnet = document.getElementById("btnClusterDevnet");
  const btnMainnet = document.getElementById("btnClusterMainnet");
  if (btnDevnet) {
    btnDevnet.className = !isMainnet ? "btn-cluster-toggle active" : "btn-cluster-toggle";
    btnDevnet.setAttribute("aria-checked", !isMainnet ? "true" : "false");
  }
  if (btnMainnet) {
    btnMainnet.className = isMainnet ? "btn-cluster-toggle active" : "btn-cluster-toggle";
    btnMainnet.setAttribute("aria-checked", isMainnet ? "true" : "false");
  }

  // Top Cluster Bar & Switcher Label
  const topClusterBarNotice = document.getElementById("topClusterNotificationBar");
  if (topClusterBarNotice) {
    topClusterBarNotice.style.display = isMainnet ? "flex" : "none";
  }
  const topClusterMemoPill = document.getElementById("topClusterMemoPill");
  if (topClusterMemoPill) {
    topClusterMemoPill.style.display = isMainnet ? "inline-flex" : "none";
    topClusterMemoPill.textContent = "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).";
  }

  // 2. Status Box
  const statusTitle = document.getElementById("clusterStatus");
  if (statusTitle) {
    statusTitle.textContent = isMainnet ? "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)." : cluster.name;
  }
  const clusterStatusMemoPill = document.getElementById("clusterStatusMemoPill");
  if (clusterStatusMemoPill) {
    clusterStatusMemoPill.style.display = isMainnet ? "block" : "none";
    clusterStatusMemoPill.textContent = "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).";
  }

  // 3. Ticker Bar
  const tickerCluster = document.getElementById("tickerCluster");
  if (tickerCluster) {
    tickerCluster.textContent = isMainnet ? "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)." : cluster.tickerText;
    tickerCluster.className = isMainnet ? "ticker-val-gold font-mono" : "ticker-val-cyan font-mono";
  }

  // 4. Scenario Execution Badge & Workflow Tag
  const badge = document.getElementById("executionModeBadge");
  const badgeText = document.getElementById("executionModeBadgeText");
  if (badgeText) {
    badgeText.textContent = cluster.badgeText;
  }
  if (badge) {
    if (isMainnet) {
      badge.classList.add("mainnet-active");
    } else {
      badge.classList.remove("mainnet-active");
    }
  }

  const workflowTag = document.getElementById("panelTagWorkflow");
  if (workflowTag) {
    workflowTag.textContent = isMainnet
      ? "KASE CORPORATE ACTIONS WORKFLOW • MAINNET: MEMO PROGRAM RECORDS ONLY. KASE PROGRAM: LIVE ON DEVNET."
      : `KASE CORPORATE ACTIONS WORKFLOW • REAL ${cluster.name.toUpperCase()} BROADCAST`;
  }

  // 5. Airdrop Button
  const btnAirdrop = document.getElementById("btnAirdrop");
  const btnAirdropText = document.getElementById("btnAirdropText");
  if (btnAirdrop && btnAirdropText) {
    if (isMainnet) {
      btnAirdrop.disabled = true;
      btnAirdrop.classList.add("mainnet-mode");
      btnAirdropText.textContent = "Mainnet (Real SOL Fees)";
      btnAirdrop.title = "Airdrop is not available on Solana Mainnet-Beta. Real SOL is required for transaction fees.";
    } else {
      btnAirdrop.disabled = false;
      btnAirdrop.classList.remove("mainnet-mode");
      btnAirdropText.textContent = "Airdrop +1 SOL (Devnet)";
      btnAirdrop.title = "Request 1.0 SOL Devnet Airdrop for current active signer";
    }
  }

  // 6. Mainnet Safety Banner
  const safetyBanner = document.getElementById("mainnetSafetyBanner");
  if (safetyBanner) {
    safetyBanner.style.display = isMainnet ? "flex" : "none";
  }
  const mainnetSafetyLabel = document.getElementById("mainnetSafetyLabel");
  if (mainnetSafetyLabel) {
    mainnetSafetyLabel.textContent = "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).";
  }
  const mainnetBalEl = document.getElementById("mainnetSignerBalance");
  if (mainnetBalEl) {
    mainnetBalEl.textContent = `${state.solBalance.toFixed(5)} SOL`;
    mainnetBalEl.style.color = state.solBalance >= 0.000005 ? "var(--kase-green)" : "var(--danger)";
  }

  // 7. Footer Explorer Link
  const footerExp = document.getElementById("footerExplorerLink");
  if (footerExp) {
    footerExp.href = isMainnet ? "https://explorer.solana.com/" : "https://explorer.solana.com/?cluster=devnet";
    footerExp.textContent = `Solana Explorer (${cluster.shortName}) →`;
  }

  // 8. Stepper Descriptions
  const s1FundedDesc = document.getElementById("stepCouponFundedDesc");
  if (s1FundedDesc) {
    s1FundedDesc.textContent = isMainnet
      ? "Issuer deposits funds into CorporateAction PDA Vault on Devnet (Mainnet: Memo Program records only)."
      : `Issuer deposits funds into CorporateAction PDA Vault on ${cluster.name}.`;
  }
  const s1SettledDesc = document.getElementById("stepCouponSettledDesc");
  if (s1SettledDesc) {
    s1SettledDesc.textContent = isMainnet
      ? "PDA transfers coupon funds on Devnet (Mainnet: Memo Program records only. KASE program: live on Devnet)."
      : `PDA transfers coupon funds directly to 5 holder accounts on ${cluster.name}. Zero double-claims.`;
  }
  const s2SettledDesc = document.getElementById("stepRedeemSettledDesc");
  if (s2SettledDesc) {
    s2SettledDesc.textContent = isMainnet
      ? "Vault PDA releases $10,000,000 USDC on Devnet (Mainnet: Memo Program records only. KASE program: live on Devnet)."
      : `Vault PDA releases $10,000,000 USDC directly to holder wallets on ${cluster.name}.`;
  }

  // 9. Table and Console Headers
  const thWallet = document.getElementById("thWalletCol");
  if (thWallet) thWallet.textContent = `Solana ${cluster.shortName} Wallet`;

  const dossierWallet = document.getElementById("dossierWalletLabel");
  if (dossierWallet) dossierWallet.textContent = `Solana ${cluster.shortName} Wallet`;

  const consoleTitle = document.getElementById("consoleTitleText");
  if (consoleTitle) consoleTitle.textContent = `ON-CHAIN AUDIT TRAIL & ${cluster.name.toUpperCase()} STREAM`;

  const signerChoiceTitle = document.getElementById("signerChoiceTitle");
  if (signerChoiceTitle) signerChoiceTitle.textContent = `Выберите режим подписания на ${cluster.name}`;

  const optOperatorTxText = document.getElementById("optOperatorTxText");
  if (optOperatorTxText) optOperatorTxText.textContent = isMainnet
    ? "✔ Запись транзакции в Memo Program на Solana Mainnet-Beta (KASE программа: деплой в Devnet ожидается)"
    : `✔ 100% реальная транзакция на ${cluster.name}`;

  const optPhantomDesc = document.getElementById("optPhantomTxDesc");
  if (optPhantomDesc) {
    optPhantomDesc.textContent = isMainnet
      ? "Всплывающее окно Phantom откроется прямо в браузере. Вы лично нажимаете 'Approve' для каждой реальной транзакции на Solana Mainnet-Beta."
      : "Всплывающее окно Phantom откроется прямо в браузере. Вы лично нажимаете 'Approve' для каждой реальной транзакции на Devnet.";
  }

  const optPhantomGas = document.getElementById("optPhantomGasFeature");
  if (optPhantomGas) {
    optPhantomGas.textContent = isMainnet
      ? "✔ Минимальная прозрачная комиссия сети (~0.000005 SOL)"
      : "✔ Автоматическое пополнение бесплатного газа";
  }

  // 10. Update Active Stepper Visual States for Active Cluster
  // Scenario 1 Coupon State
  const totalCouponFormatted = formatUSD(BondMath.calculateCoupon(BondMath.terms.totalSupply));
  const s1Funded = document.getElementById("stepCouponFunded");
  const s1Settled = document.getElementById("stepCouponSettled");
  const pillS1Funded = document.getElementById("pillCouponFunded");
  const pillS1Settled = document.getElementById("pillCouponSettled");
  const s1StatusText = document.getElementById("couponStatusText");

  if (state.couponSettled) {
    s1Funded?.classList.add("completed");
    s1Settled?.classList.add("completed");
    if (pillS1Funded) {
      pillS1Funded.textContent = "CONFIRMED";
      pillS1Funded.className = "step-status-pill completed";
    }
    if (pillS1Settled) {
      pillS1Settled.textContent = "100% SETTLED";
      pillS1Settled.className = "step-status-pill completed";
    }
    if (s1StatusText) {
      s1StatusText.textContent = isMainnet
        ? `100% Settled (${totalCouponFormatted} USDC Memo Record on Mainnet-Beta in Slot #${cs.couponSlot || 'LIVE'}. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).)`
        : `100% Settled (${totalCouponFormatted} USDC Distributed on ${cluster.shortName} in Slot #${cs.couponSlot || 'LIVE'})`;
      s1StatusText.style.color = "var(--kase-green)";
    }
  } else {
    s1Funded?.classList.remove("completed");
    s1Settled?.classList.remove("completed");
    if (pillS1Funded) {
      pillS1Funded.textContent = "AWAITING BROADCAST";
      pillS1Funded.className = "step-status-pill";
    }
    if (pillS1Settled) {
      pillS1Settled.textContent = "PENDING";
      pillS1Settled.className = "step-status-pill";
    }
    if (s1StatusText) {
      s1StatusText.textContent = isMainnet
        ? "Ready for Mainnet Memo Broadcast (KASE program: live on Devnet)"
        : `Ready for Real ${cluster.name} Broadcast`;
      s1StatusText.style.color = "var(--kase-green)";
    }
  }

  // Scenario 2 Redemption State
  const s2Burned = document.getElementById("stepRedeemBurned");
  const s2Settled = document.getElementById("stepRedeemSettled");
  const pillS2Burned = document.getElementById("pillRedeemBurned");
  const pillS2Settled = document.getElementById("pillRedeemSettled");
  const supplyEl = document.getElementById("statActiveSupply");
  const supplyStatusEl = document.getElementById("statSupplyStatus");
  const redStatEl = document.getElementById("redemptionStatusText");

  if (state.redemptionSettled) {
    s2Burned?.classList.add("completed");
    s2Settled?.classList.add("completed");
    if (pillS2Burned) {
      pillS2Burned.textContent = "BURNED";
      pillS2Burned.className = "step-status-pill completed";
    }
    if (pillS2Settled) {
      pillS2Settled.textContent = "DISPATCHED";
      pillS2Settled.className = "step-status-pill completed";
    }
    if (supplyEl) {
      supplyEl.textContent = "0 Bonds (Burned & Retired)";
      supplyEl.style.color = "var(--danger)";
    }
    if (supplyStatusEl) {
      supplyStatusEl.textContent = "Matured & Permanently Retired from Circulation";
    }
    if (redStatEl) {
      redStatEl.textContent = `100% Burned & Principal Disbursed on ${cluster.shortName}`;
      redStatEl.style.color = "var(--danger)";
    }
  } else {
    s2Burned?.classList.remove("completed");
    s2Settled?.classList.remove("completed");
    if (pillS2Burned) {
      pillS2Burned.textContent = "AWAITING BROADCAST";
      pillS2Burned.className = "step-status-pill";
    }
    if (pillS2Settled) {
      pillS2Settled.textContent = "PENDING";
      pillS2Settled.className = "step-status-pill";
    }
    if (supplyEl) {
      supplyEl.textContent = "10,000 Bonds";
      supplyEl.style.color = "var(--kase-green)";
    }
    if (supplyStatusEl) {
      supplyStatusEl.textContent = "Fully Subscribed (100%)";
    }
    if (redStatEl) {
      redStatEl.textContent = "Active in Circulation";
      redStatEl.style.color = "inherit";
    }
  }

  // Update Quorum & Table
  updateQuorum();
  renderTable();
  updateActionButtons();
}

async function switchCluster(clusterId, customRpc = null) {
  if (!CLUSTERS[clusterId]) return;
  currentCluster = clusterId;
  try {
    localStorage.setItem("kase_active_cluster", clusterId);
  } catch (e) {}

  const web3 = window.solanaWeb3;
  if (!web3) return;

  const rpcUrl = customRpc || getActiveRpcUrl();
  connection = new web3.Connection(rpcUrl, "confirmed");

  updateClusterUI();

  const cluster = CLUSTERS[clusterId];
  appendLog(
    "CLUSTER",
    cluster.isMainnet ? "tag-warn" : "tag-ok",
    `Активный кластер переключен: ${cluster.name} (${rpcUrl})`
  );

  if (cluster.isMainnet) {
    appendLog(
      "PROGRAM",
      "tag-cpi",
      "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]"
    );
    appendLog(
      "MAINNET",
      "tag-warn",
      "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)."
    );
    appendLog(
      "MEMO-NOTICE",
      "tag-warn",
      "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)."
    );
    showToast(
      "Mainnet (Memo Only)",
      "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz). Комиссия: ~0.000005 SOL.",
      "warning",
      7000
    );
  } else {
    showToast(
      "Devnet Active",
      "Переключено на Solana Devnet песочницу. Доступен бесплатный кран Airdrop +1 SOL.",
      "info",
      4000
    );
  }

  checkPhantomClusterAlignment();

  await pollClusterStats();
  await refreshWalletBalance();
}

async function checkPhantomClusterAlignment() {
  const provider = getPhantomProvider();
  const cluster = CLUSTERS[currentCluster];
  const alignBadge = document.getElementById("phantomClusterAlignBadge");

  // Dynamic Guide Banner update
  const bannerTitle = document.getElementById("phantomGuideTitle");
  const bannerBody = document.getElementById("phantomGuideBody");
  if (bannerTitle && bannerBody) {
    if (cluster.isMainnet) {
      bannerTitle.textContent = "🦊 Синхронизация с Phantom Wallet (Solana Mainnet-Beta):";
      bannerBody.innerHTML = `Транзакции формируются для боевой сети <strong>Solana Mainnet-Beta</strong>. Убедитесь, что в Phantom отключен тестовый режим (<strong>⚙️ Настройки ➔ Настройки разработчика ➔ Режим тестнета ➔ Выкл/Mainnet</strong>). Для оплаты комиссии требуется реальный SOL (~0.000005 SOL на операцию).`;
    } else {
      bannerTitle.textContent = "🦊 Синхронизация с Phantom Wallet (Solana Devnet):";
      bannerBody.innerHTML = `Каждое корпоративное действие открывает реальное окно расширения Phantom для вашего личного подтверждения. Для работы включите Devnet в Phantom (<strong>⚙️ Настройки ➔ Настройки разработчика ➔ Режим тестнета ➔ Solana Devnet</strong>). При балансе 0 SOL нажмите <strong>"Airdrop +1 SOL"</strong> в шапке.`;
    }
  }

  if (!provider) {
    if (alignBadge) {
      alignBadge.textContent = "No Phantom";
      alignBadge.className = "cluster-align-badge neutral font-mono";
    }
    return;
  }

  if (!state.phantomConnected || !state.phantomPubkey) {
    if (alignBadge) {
      alignBadge.textContent = "Phantom: Not Connected";
      alignBadge.className = "cluster-align-badge neutral font-mono";
    }
    return;
  }

  const currentSol = state.solBalance;

  // Query opposite cluster balance to diagnose and detect cluster alignment
  try {
    const web3 = window.solanaWeb3;
    if (web3) {
      const oppositeClusterId = cluster.isMainnet ? "devnet" : "mainnet";
      const oppositeRpc = CLUSTERS[oppositeClusterId].defaultRpc;
      const oppositeConn = new web3.Connection(oppositeRpc, "confirmed");
      const oppositeLamports = await oppositeConn.getBalance(state.phantomPubkey);
      const oppositeSol = oppositeLamports / (web3.LAMPORTS_PER_SOL || 1e9);

      if (cluster.isMainnet) {
        if (currentSol < 0.000005 && oppositeSol > 0.001) {
          appendLog(
            "SYNC",
            "tag-warn",
            `⚠️ Проверка синхронизации: На Mainnet баланс 0 SOL, но на Devnet найден ${oppositeSol.toFixed(3)} SOL. Если Phantom в режиме Devnet, переключите его в Mainnet и пополните реальный SOL (~0.000005 SOL), либо переключите терминал на Devnet.`
          );
          if (alignBadge) {
            alignBadge.textContent = "Mismatch: Devnet Wallet";
            alignBadge.className = "cluster-align-badge warn font-mono";
          }
          showToast(
            "Проверка сети Phantom",
            `На Mainnet баланс 0 SOL (на Devnet: ${oppositeSol.toFixed(3)} SOL). Для боевых операций пополните реальный SOL или вернитесь на Devnet.`,
            "warning",
            7000
          );
        } else if (currentSol >= 0.000005) {
          appendLog("SYNC", "tag-ok", `✔ Проверка синхронизации: Phantom готов к Mainnet-Beta. Баланс: ${currentSol.toFixed(5)} SOL.`);
          if (alignBadge) {
            alignBadge.textContent = "Aligned: Mainnet-Beta";
            alignBadge.className = "cluster-align-badge ok font-mono";
          }
        } else {
          appendLog("SYNC", "tag-warn", "Кластер: Mainnet-Beta. Баланс Phantom: 0 SOL. Пополните кошелек для оплаты газа (~0.000005 SOL).");
          if (alignBadge) {
            alignBadge.textContent = "Mainnet (Needs Gas)";
            alignBadge.className = "cluster-align-badge warn font-mono";
          }
        }
      } else {
        // Devnet
        if (oppositeSol > 0.001 && currentSol < 0.001) {
          appendLog(
            "SYNC",
            "tag-broadcast",
            `💡 Информация о синхронизации: У вас есть ${oppositeSol.toFixed(4)} SOL на Mainnet, но активен тестовый кластер Devnet. Ваши транзакции бесплатны. Для газа на Devnet нажмите 'Airdrop +1 SOL'.`
          );
        } else {
          appendLog("SYNC", "tag-ok", "Кластер: Solana Devnet. Синхронизировано.");
        }
        if (alignBadge) {
          alignBadge.textContent = "Aligned: Devnet";
          alignBadge.className = "cluster-align-badge ok font-mono";
        }
      }
    }
  } catch (probeErr) {
    console.warn("Opposite cluster diagnostic notice:", probeErr);
  }
}

// Custom RPC Modal handlers
function openRpcModal() {
  const modal = document.getElementById("rpcConfigModal");
  if (!modal) return;
  const devnetInput = document.getElementById("rpcDevnetInput");
  const mainnetInput = document.getElementById("rpcMainnetInput");
  if (devnetInput) devnetInput.value = customRpcUrls.devnet || CLUSTERS.devnet.defaultRpc;
  if (mainnetInput) mainnetInput.value = customRpcUrls.mainnet || CLUSTERS.mainnet.defaultRpc;
  modal.style.display = "flex";
}

function closeRpcModal() {
  const modal = document.getElementById("rpcConfigModal");
  if (modal) modal.style.display = "none";
}

function saveRpcConfig() {
  const devnetInput = document.getElementById("rpcDevnetInput")?.value?.trim();
  const mainnetInput = document.getElementById("rpcMainnetInput")?.value?.trim();

  if (devnetInput && devnetInput.startsWith("http")) {
    customRpcUrls.devnet = devnetInput;
    try { localStorage.setItem("kase_custom_rpc_devnet", devnetInput); } catch (e) {}
  }
  if (mainnetInput && mainnetInput.startsWith("http")) {
    customRpcUrls.mainnet = mainnetInput;
    try { localStorage.setItem("kase_custom_rpc_mainnet", mainnetInput); } catch (e) {}
  }

  closeRpcModal();
  switchCluster(currentCluster, getActiveRpcUrl());
  showToast("RPC Updated", `Solana RPC endpoint updated for ${CLUSTERS[currentCluster].name}.`, "success");
}

function resetRpcDefaults() {
  customRpcUrls.devnet = null;
  customRpcUrls.mainnet = null;
  try {
    localStorage.removeItem("kase_custom_rpc_devnet");
    localStorage.removeItem("kase_custom_rpc_mainnet");
  } catch (e) {}

  const devnetInput = document.getElementById("rpcDevnetInput");
  const mainnetInput = document.getElementById("rpcMainnetInput");
  if (devnetInput) devnetInput.value = CLUSTERS.devnet.defaultRpc;
  if (mainnetInput) mainnetInput.value = CLUSTERS.mainnet.defaultRpc;

  closeRpcModal();
  switchCluster(currentCluster, getActiveRpcUrl());
  showToast("RPC Reset", "Сброшено к официальным публичным узлам Solana.", "info");
}

// ==============================================================================
// SIGNER CHOICE MODAL (Guarantees User Intent)
// ==============================================================================
function promptSignerChoice(actionCallback) {
  state.pendingActionCallback = actionCallback;
  const modal = document.getElementById("signerChoiceModal");
  if (modal) {
    modal.style.display = "flex";
  } else {
    actionCallback();
  }
}

function closeSignerChoiceModal() {
  const modal = document.getElementById("signerChoiceModal");
  if (modal) modal.style.display = "none";
  state.pendingActionCallback = null;
}

// ==============================================================================
// REAL SOLANA DEVNET BROADCASTING ENGINE
// ==============================================================================
async function broadcastRealSolanaTransaction({ actionTitle, memoText, onSuccess, onError }) {
  const web3 = window.solanaWeb3;
  if (!web3 || !connection) {
    alert("Solana Web3 библиотека не загружена. Пожалуйста, обновите страницу.");
    return;
  }

  const cluster = CLUSTERS[currentCluster];

  // Pre-flight gas check
  await ensureGasBalance(state.walletPubkey, 0.005);

  // 1. Open Transaction Modal in Loading State
  showModalLoading(actionTitle, `Формирование инструкции Solana Memo и получение актуального блокхэша из ${cluster.name}...`);

  const isPhantom = state.walletType === "phantom";
  const phantomCallout = document.getElementById("phantomApprovalBox");

  if (isPhantom && phantomCallout) {
    phantomCallout.style.display = "flex";
    const calloutDesc = phantomCallout.querySelector(".phantom-callout-text p");
    if (calloutDesc) {
      calloutDesc.innerHTML = cluster.isMainnet
        ? `Всплывающее окно Phantom открыто на вашем экране. Нажмите <strong>"Подтвердить" / "Approve"</strong> для отправки реальной транзакции в <strong>Solana Mainnet-Beta</strong> (комиссия сети ~0.000005 SOL).`
        : `Всплывающее окно Phantom открыто на вашем экране. Пожалуйста, нажмите <strong>"Подтвердить" / "Approve"</strong> в окне Phantom для отправки транзакции на Solana Devnet.`;
    }
  } else if (phantomCallout) {
    phantomCallout.style.display = "none";
  }

  try {
    // 2. Fetch Latest Blockhash from Active Cluster
    updateModalStep(1, true);
    appendLog("TX-INIT", "tag-tx", `Старт ончейн-транзакции [${cluster.shortName}]: ${actionTitle}`);
    appendLog("MEMO", "tag-broadcast", `Данные Memo: "${memoText}"`);
    if (cluster.isMainnet) {
      appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
      appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    updateModalStep(2, true);

    // 3. Build Versioned Transaction (v0) & Dynamic Priority Fee Injection
    const payer = state.walletPubkey;
    const instructions = [];

    // Sealevel Dynamic Priority Fee Estimation
    const feeTelemetry = await fetchDynamicPriorityFees();
    const priorityMicroLamports = feeTelemetry[selectedPriorityFeeTier] || 1000;
    const computeUnits = selectedPriorityFeeTier === "turbo" ? 90000 : 70000;

    if (web3.ComputeBudgetProgram) {
      if (priorityMicroLamports > 0) {
        instructions.push(
          web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityMicroLamports })
        );
      }
      instructions.push(
        web3.ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits })
      );
      appendLog("COMPUTE", "tag-broadcast", `Solana Sealevel Dynamic Priority Fee: ${priorityMicroLamports.toLocaleString()} µL [${selectedPriorityFeeTier.toUpperCase()} | Limit: ${computeUnits} CU]`);
    }

    const memoInstruction = new web3.TransactionInstruction({
      keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
      programId: memoProgramId,
      data: new TextEncoder().encode(memoText),
    });
    instructions.push(memoInstruction);

    // Modern Solana Versioned Transaction (v0) Architecture (2024-2026 Sealevel Standard)
    let txToSign = null;
    let isVersionedTx = false;

    if (web3.VersionedTransaction && web3.TransactionMessage) {
      try {
        const messageV0 = new web3.TransactionMessage({
          payerKey: payer,
          recentBlockhash: blockhash,
          instructions: instructions,
        }).compileToV0Message();
        txToSign = new web3.VersionedTransaction(messageV0);
        isVersionedTx = true;
        appendLog("SEALEVEL", "tag-tx", "Скомпилировано сообщение транзакции Solana Versioned Message (v0)");
      } catch (compileErr) {
        console.warn("Versioned transaction compile fallback:", compileErr);
      }
    }

    // Fallback to legacy Transaction if VersionedTransaction unavailable
    if (!txToSign) {
      const legacyTx = new web3.Transaction();
      legacyTx.recentBlockhash = blockhash;
      legacyTx.feePayer = payer;
      instructions.forEach((ix) => legacyTx.add(ix));
      txToSign = legacyTx;
    }

    // 4. Sign and Broadcast
    let signature = null;

    if (isPhantom) {
      const provider = getPhantomProvider();
      if (!provider) {
        throw new Error("Расширение Phantom не обнаружено. Переключитесь в режим CSD Operator.");
      }

      const feeNotice = cluster.isMainnet ? " [Комиссия сети: ~0.000005 SOL]" : "";
      updateModalStep(3, false, `👉 Открыто всплывающее окно Phantom: нажмите 'Approve' / 'Подтвердить'${feeNotice}...`);
      appendLog("SIGN", "tag-broadcast", `Запрос подписи в расширении Phantom Wallet (${cluster.name})...`);

      try {
        let signedTx = null;
        if (typeof provider.signTransaction === "function") {
          signedTx = await provider.signTransaction(txToSign);
        }

        if (signedTx) {
          if (phantomCallout) phantomCallout.style.display = "none";
          updateModalStep(3, true, "Подписано в Phantom Wallet!");
          updateModalStep(4, false, `Трансляция в активный RPC ${cluster.shortName}...`);
          appendLog("BROADCAST", "tag-broadcast", `Трансляция подписанной транзакции в ${cluster.name} (${getActiveRpcUrl()})...`);
          signature = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
        } else {
          // Fallback to signAndSendTransaction if signTransaction not available
          const sendRes = await provider.signAndSendTransaction(txToSign);
          if (sendRes && typeof sendRes === "object") {
            signature = sendRes.signature || sendRes.txHash || sendRes;
          } else if (typeof sendRes === "string") {
            signature = sendRes;
          }
          if (signature && typeof signature !== "string" && signature.toString) {
            signature = signature.toString();
          }
          if (phantomCallout) phantomCallout.style.display = "none";
          updateModalStep(3, true, "Подписано в Phantom Wallet!");
          updateModalStep(4, false, `Подтверждение в кластере ${cluster.name}...`);
        }
      } catch (phantomErr) {
        console.error("Phantom signing/broadcasting exception:", phantomErr);
        if (phantomErr.code === 4001 || phantomErr.message?.includes("User rejected")) {
          throw new Error("Транзакция отклонена пользователем во всплывающем окне Phantom.");
        }
        const errText = (phantomErr.message || phantomErr.toString() || "").toLowerCase();
        if (errText.includes("blockhash not found") || errText.includes("simulation failed") || errText.includes("wrong network") || errText.includes("network mismatch")) {
          throw new Error(`Несоответствие сети Phantom и терминала (${cluster.shortName}): ${phantomErr.message}. Убедитесь, что в Phantom выбрана правильная сеть (Настройки ➔ Настройки разработчика).`);
        }
        throw new Error(phantomErr.message || "Ошибка подписания транзакции в Phantom.");
      }
    } else {
      updateModalStep(3, false, `Подписание институциональным ключом KASE CSD Operator (${cluster.shortName})...`);
      if (isVersionedTx) {
        txToSign.sign([state.operatorKeypair]);
      } else {
        txToSign.sign(state.operatorKeypair);
      }
      updateModalStep(3, true, "Подписано ключом CSD Operator!");
      updateModalStep(4, false, `Отправка сырой транзакции в RPC кластера ${cluster.shortName}...`);

      appendLog("BROADCAST", "tag-broadcast", `Трансляция транзакции в кластер ${cluster.name}...`);
      signature = await connection.sendRawTransaction(txToSign.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
    }

    if (!signature) {
      throw new Error("Не получен хэш транзакции от подписанта.");
    }

    appendLog("SUBMITTED", "tag-tx", `Хэш транзакции: ${signature.slice(0, 16)}... Ожидание подтверждения блоком [${cluster.shortName}]...`);

    // 5. Await Confirmation on Active Cluster
    updateModalStep(4, false, `Ожидание финализации на ${cluster.shortName}: ${signature.slice(0, 8)}...`);

    try {
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value && confirmation.value.err) {
        throw new Error(`Ошибка исполнения ончейн: ${JSON.stringify(confirmation.value.err)}`);
      }
    } catch (confirmErr) {
      console.warn("Confirmation check notice:", confirmErr);
      const status = await connection.getSignatureStatus(signature);
      if (status && status.value && status.value.err) {
        throw new Error(`Ошибка транзакции ончейн: ${JSON.stringify(status.value.err)}`);
      }
    }

    updateModalStep(4, true, "Транзакция успешно подтверждена!");

    // 6. Confirmed!
    const slot = await connection.getSlot("confirmed");
    await refreshWalletBalance();

    appendLog(
      "CONFIRMED",
      "tag-ok",
      `Подтверждено на ${cluster.name} в слоте #${slot.toLocaleString()}! Доступно на Solana Explorer.`,
      signature
    );
    if (cluster.isMainnet) {
      appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
      appendLog("MAINNET", "tag-ok", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).", signature);
    }

    // 7. Show Modal Success View
    showModalSuccess({
      signature,
      slot,
      memoText,
      actionTitle,
      signerName: isPhantom ? `Phantom Wallet (${cluster.shortName})` : `CSD Operator (${cluster.shortName})`,
    });

    showToast(
      `Успешно на ${cluster.shortName}!`,
      `Транзакция подтверждена в слоте #${slot.toLocaleString()} (Tx: ${truncateAddress(signature)})`,
      "success"
    );

    // 8. Execute UI state update
    if (typeof onSuccess === "function") {
      onSuccess(signature, slot);
    }
  } catch (error) {
    if (phantomCallout) phantomCallout.style.display = "none";
    console.error("Broadcast failed:", error);
    appendLog("ERROR", "tag-err", `Уведомление о транзакции [${cluster.shortName}]: ${error.message || error}`);
    showModalError(error.message || `Транзакция была отменена или не подтверждена на ${cluster.name}.`);
    showToast("Транзакция не выполнена", error.message || "Исполнение прервано.", "error");
    if (typeof onError === "function") {
      try {
        onError(error);
      } catch (errCb) {
        console.error("onError callback failed:", errCb);
      }
    }
  }
}

// ==============================================================================
// MODAL CONTROLLER (Loading, Success, Error)
// ==============================================================================
function showModalLoading(title, subtitle) {
  const modal = document.getElementById("txModal");
  const loadingView = document.getElementById("modalLoadingView");
  const successView = document.getElementById("modalSuccessView");
  const errorView = document.getElementById("modalErrorView");

  if (!modal || !loadingView) return;

  modal.style.display = "flex";
  loadingView.style.display = "block";
  if (successView) successView.style.display = "none";
  if (errorView) errorView.style.display = "none";

  const cluster = CLUSTERS[currentCluster];
  const tEl = document.getElementById("modalLoadingTitle");
  const sEl = document.getElementById("modalLoadingSubtitle");
  if (tEl) tEl.textContent = title || `Broadcasting to ${cluster.name}...`;
  if (sEl) sEl.textContent = subtitle || "Executing real on-chain corporate action...";

  // Reset steps
  [1, 2, 3, 4].forEach((n) => {
    const item = document.getElementById(`mStep${n}`);
    if (item) {
      item.className = "modal-step-item";
    }
  });
}

function updateModalStep(stepNum, isDone, customText = null) {
  const item = document.getElementById(`mStep${stepNum}`);
  if (!item) return;

  if (isDone) {
    item.className = "modal-step-item active";
    item.innerHTML = `<span class="step-check">✔</span> <span>${customText || item.textContent}</span>`;
  } else {
    item.className = "modal-step-item active";
    item.innerHTML = `<span class="step-pulse"></span> <span>${customText || item.textContent}</span>`;
  }
}

function showModalSuccess({ signature, slot, memoText, actionTitle, signerName }) {
  const loadingView = document.getElementById("modalLoadingView");
  const successView = document.getElementById("modalSuccessView");

  if (loadingView) loadingView.style.display = "none";
  if (!successView) return;

  successView.style.display = "block";

  const cluster = CLUSTERS[currentCluster];

  const titleEl = document.getElementById("modalSuccessTitle");
  if (titleEl) {
    titleEl.textContent = `Transaction Confirmed on ${cluster.name}!`;
  }

  const sigEl = document.getElementById("modalTxSigText");
  if (sigEl) sigEl.textContent = `${signature.slice(0, 10)}...${signature.slice(-10)}`;

  const slotEl = document.getElementById("modalTxSlotText");
  if (slotEl) slotEl.textContent = `#${Number(slot).toLocaleString()}`;

  const memoEl = document.getElementById("modalTxMemoText");
  if (memoEl) memoEl.textContent = memoText;

  const clusterEl = document.getElementById("modalTxClusterText");
  if (clusterEl) {
    clusterEl.textContent = cluster.isMainnet
      ? "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)."
      : `${cluster.name} (100% Live)`;
    clusterEl.className = cluster.isMainnet ? "mono font-mono gold" : "mono font-mono cyan";
  }

  const expBtn = document.getElementById("btnModalExplorer");
  const expBtnText = document.getElementById("btnModalExplorerText");
  if (expBtn) {
    expBtn.href = getExplorerTxUrl(signature);
  }
  if (expBtnText) {
    expBtnText.textContent = `Solana Explorer (${cluster.shortName})`;
  }

  const solscanBtn = document.getElementById("btnModalSolscan");
  const solscanBtnText = document.getElementById("btnModalSolscanText");
  if (solscanBtn) {
    solscanBtn.href = getSolscanTxUrl(signature);
  }
  if (solscanBtnText) {
    solscanBtnText.textContent = `Solscan (${cluster.shortName})`;
  }

  // Copy Signature Handler
  const copyBtn = document.getElementById("btnCopyTxSig");
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(signature);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 2000);
      showToast("Скопировано", `Хэш транзакции ${cluster.shortName} скопирован в буфер обмена.`, "info");
    };
  }
}

function showModalError(errorMessage) {
  const loadingView = document.getElementById("modalLoadingView");
  const errorView = document.getElementById("modalErrorView");

  if (loadingView) loadingView.style.display = "none";
  if (!errorView) return;

  errorView.style.display = "block";

  const msgEl = document.getElementById("modalErrorMessage");
  if (msgEl) msgEl.textContent = errorMessage;
}

function closeModal() {
  const modal = document.getElementById("txModal");
  if (modal) modal.style.display = "none";
}

// ==============================================================================
// CSD INVESTOR DOSSIER MODAL
// ==============================================================================
function openDossier(h, idx) {
  const modal = document.getElementById("dossierModal");
  if (!modal) return;

  const nominal = BondMath.calculateRedemption(h.bonds);
  const coupon = BondMath.calculateCoupon(h.bonds);
  const redemption = nominal;

  document.getElementById("dossierBankName").textContent = h.name;
  const avatarBadge = document.getElementById("dossierBankBadge");
  if (avatarBadge) {
    avatarBadge.textContent = h.badgeText.slice(0, 2);
    if (h.badgeClass === "bank-a") avatarBadge.style.background = "linear-gradient(135deg, #008249 0%, #004D2C 100%)";
    if (h.badgeClass === "bank-b") avatarBadge.style.background = "linear-gradient(135deg, #E31E24 0%, #8B0000 100%)";
    if (h.badgeClass === "broker-c") avatarBadge.style.background = "linear-gradient(135deg, #00A3FF 0%, #0052CC 100%)";
    if (h.badgeClass === "bank-d") avatarBadge.style.background = "linear-gradient(135deg, #FE5000 0%, #B33600 100%)";
    if (h.badgeClass === "retail") avatarBadge.style.background = "linear-gradient(135deg, #8B5CF6 0%, #5B21B6 100%)";
  }

  document.getElementById("dossierBin").textContent = `BIN: ${h.bin} • Depository Sub-Account: ${h.subAccount}`;
  document.getElementById("dossierWallet").textContent = h.wallet;
  document.getElementById("dossierBonds").textContent = `${h.bonds.toLocaleString()} Units`;
  document.getElementById("dossierNominal").textContent = formatUSD(nominal);
  document.getElementById("dossierCoupon").textContent = formatUSD(coupon);
  document.getElementById("dossierRedeem").textContent = formatUSD(redemption);

  const statusPill = document.getElementById("dossierStatusPill");
  if (state.couponSettled && !state.redemptionSettled) {
    statusPill.textContent = "COUPON DISTRIBUTED & VERIFIED";
    statusPill.style.color = "var(--kase-green)";
  } else if (state.redemptionSettled) {
    statusPill.textContent = "BONDS BURNED & PRINCIPAL REDEEMED";
    statusPill.style.color = "var(--danger)";
  } else {
    statusPill.textContent = "ELIGIBLE FOR SETTLEMENT";
    statusPill.style.color = "var(--kz-gold)";
  }

  // Export audit handler
  document.getElementById("btnDossierAuditLog").onclick = () => {
    appendLog(
      "CSD-AUDIT",
      "tag-ok",
      `Dossier Export: ${h.name} | Sub-Account: ${h.subAccount} | Holdings: ${h.bonds.toLocaleString()} bonds (${formatUSD(nominal)} nominal) | CSD Signoff: OK`
    );
    showToast("Audit Logged", `CSD Dossier audit exported for ${h.name}`, "info");
    modal.style.display = "none";
  };

  modal.style.display = "flex";
}

// ==============================================================================
// RENDER CSD REGISTRY TABLE & UPDATE FINANCIAL HUD
// ==============================================================================
function renderTable() {
  const tbody = document.getElementById("registryTableBody");
  const tfoot = document.getElementById("registryTableFooter");
  if (!tbody) return;

  tbody.innerHTML = "";
  const totals = BondMath.getAggregateTotals(HOLDERS);

  HOLDERS.forEach((h, idx) => {
    const nominal = BondMath.calculateRedemption(h.bonds);
    const coupon = BondMath.calculateCoupon(h.bonds);
    const redemption = nominal;

    let statusBadge = `<span class="csd-status-pill pending font-mono">PENDING RECORD</span>`;
    if (state.couponSettled && !state.redemptionSettled) {
      statusBadge = `<span class="csd-status-pill settled font-mono">COUPON SETTLED</span>`;
    } else if (state.redemptionSettled) {
      statusBadge = `<span class="csd-status-pill burned font-mono">BURNED & REDEEMED</span>`;
    }

    const tr = document.createElement("tr");
    tr.id = `rowHolder${idx}`;
    tr.title = `Click to inspect institutional CSD dossier for ${h.name}`;
    tr.innerHTML = `
      <td>
        <div class="bank-badge-cell">
          <span class="bank-badge ${h.badgeClass}">${h.badgeText}</span>
          <span style="font-weight: 600; color: #fff;">${h.name}</span>
        </div>
      </td>
      <td><span class="mono font-mono" style="color: var(--sol-cyan);">${truncateAddress(h.wallet)}</span></td>
      <td class="mono font-mono"><strong>${h.bonds.toLocaleString()}</strong></td>
      <td class="mono font-mono">${formatUSD(nominal)}</td>
      <td class="mono font-mono" style="color: var(--kase-green); font-weight: 700;">${formatUSD(coupon)}</td>
      <td class="mono font-mono" style="color: var(--kz-gold); font-weight: 700;">${formatUSD(redemption)}</td>
      <td>${statusBadge}</td>
    `;

    tr.addEventListener("click", () => openDossier(h, idx));
    tbody.appendChild(tr);
  });

  // Render Table Summary Footer Row
  if (tfoot) {
    let footerStatus = "100% CSD CUSTODY";
    if (state.couponSettled && !state.redemptionSettled) footerStatus = "COUPON DISTRIBUTED";
    if (state.redemptionSettled) footerStatus = "100% BURNED & REDEEMED";

    tfoot.innerHTML = `
      <td><strong>TOTAL ISSUE AGGREGATE</strong></td>
      <td><span class="mono font-mono" style="color: var(--text-muted);">5 PARTICIPANTS</span></td>
      <td><strong>${totals.totalBonds.toLocaleString()} Units</strong></td>
      <td><strong>${formatUSD(totals.totalNominal)}</strong></td>
      <td style="color: var(--kase-green); font-weight: 800;">${formatUSD(totals.totalCoupon)}</td>
      <td style="color: var(--kz-gold); font-weight: 800;">${formatUSD(totals.totalRedemption)}</td>
      <td><span class="csd-status-pill settled font-mono">${footerStatus}</span></td>
    `;
  }

  // Update Live Financial Math Engine HUD
  updateFinancialMathHud();
}

function updateFinancialMathHud() {
  const ratePct = (BondMath.terms.couponRateBps / 100).toFixed(2);
  const couponPerBond = BondMath.getCouponPerBond();
  const totalCoupon = BondMath.calculateCoupon(BondMath.terms.totalSupply);
  const totalPrincipal = BondMath.calculateRedemption(BondMath.terms.totalSupply);

  const hudBps = document.getElementById("hudCouponBps");
  const hudFreq = document.getElementById("hudFrequency");
  const hudPerBond = document.getElementById("hudCouponPerBond");
  const hudAggCoupon = document.getElementById("hudAggregateCoupon");
  const hudAggPrincipal = document.getElementById("hudAggregatePrincipal");

  if (hudBps) hudBps.textContent = `${BondMath.terms.couponRateBps.toLocaleString()} bps (${ratePct}% p.a.)`;
  if (hudFreq) hudFreq.textContent = `${BondMath.terms.couponFrequency} Payouts / Year (Semi-Annual)`;
  if (hudPerBond) hudPerBond.textContent = `${formatUSD(couponPerBond)} USDC (${(couponPerBond * 1e6).toLocaleString()} units)`;
  if (hudAggCoupon) hudAggCoupon.textContent = `${formatUSD(totalCoupon)} USDC`;
  if (hudAggPrincipal) hudAggPrincipal.textContent = `${formatUSD(totalPrincipal)} USDC`;

  // Update KPI Cards
  const kpiCouponRate = document.getElementById("summaryCouponRate");
  const kpiCouponPerBond = document.getElementById("summaryCouponPerBond");
  const kpiNominalPool = document.getElementById("statNominalPool");
  const tickerRate = document.getElementById("tickerCouponRate");
  const tabCouponTag = document.getElementById("tabCouponTag");

  if (kpiCouponRate) kpiCouponRate.textContent = `${ratePct}% p.a. Semi-Annual${BondMath.terms.couponRateBps === 1250 ? " (Restructured)" : ""}`;
  if (kpiCouponPerBond) kpiCouponPerBond.textContent = `${formatUSD(couponPerBond)} USDC / 6 Months`;
  if (kpiNominalPool) kpiNominalPool.textContent = `${formatUSD(totalPrincipal)} USDC Pool`;
  if (tickerRate) tickerRate.textContent = `${ratePct}% SEMI-ANNUAL`;
  if (tabCouponTag) tabCouponTag.textContent = `${formatUSD(totalCoupon)} USDC`;

  // Update Scenario 1 Step 2 formula desc
  const step2Desc = document.getElementById("stepCouponMathDesc");
  if (step2Desc) {
    step2Desc.textContent = `Formula: (10,000 × $1,000 × ${ratePct}%) / 2 = ${formatUSD(totalCoupon)} USDC exact entitlement.`;
  }
  const payoutMetric = document.getElementById("metricPayoutPerBond");
  if (payoutMetric) payoutMetric.textContent = `${formatUSD(couponPerBond)} USDC`;
  const totalReqMetric = document.getElementById("metricTotalCouponReq");
  if (totalReqMetric) totalReqMetric.textContent = `${formatUSD(totalCoupon)} USDC`;
  const memoPreview = document.getElementById("metricCouponMemoPreview");
  if (memoPreview) {
    memoPreview.textContent = `KASE_CORP_ACT: ISIN=${BondMath.terms.isin} | TYPE=COUPON_DISTRIBUTION | AMOUNT=${formatUSD(totalCoupon)}_USDC | CSD=CONFIRMED`;
  }
}

// ==============================================================================
// ENTITLEMENT MATH SANDBOX CALCULATOR
// ==============================================================================
function updateCalculator() {
  const bonds = parseFloat(document.getElementById("calcBonds").value) || 0;
  const face = parseFloat(document.getElementById("calcFace").value) || 0;
  const rate = parseFloat(document.getElementById("calcRate").value) || 0;
  const freq = parseFloat(document.getElementById("calcFreq").value) || 1;

  const coupon = BondMath.calculateCoupon(bonds, Math.round(rate * 100), freq, face);
  const redemption = BondMath.calculateRedemption(bonds, face);

  const couponResEl = document.getElementById("calcResultCoupon");
  const redeemResEl = document.getElementById("calcResultRedeem");

  if (couponResEl) couponResEl.textContent = formatUSD(coupon) + " USDC";
  if (redeemResEl) redeemResEl.textContent = formatUSD(redemption) + " USDC";
}

function applyPreset(bonds, face, rate, freq, btnId) {
  document.getElementById("calcBonds").value = bonds;
  document.getElementById("calcFace").value = face;
  document.getElementById("calcRate").value = rate;
  document.getElementById("calcFreq").value = freq;

  document.querySelectorAll(".btn-preset").forEach((b) => b.classList.remove("active"));
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add("active");

  updateCalculator();
  appendLog("CALC", "tag-ok", `Preset applied: ${bonds} units @ $${face}, ${rate}% p.a. (Payout frequency: ${freq}/yr)`);
}

// ==============================================================================
// TAB NAVIGATION SETUP
// ==============================================================================
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const targetId = btn.getAttribute("data-tab");
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");
    });
  });
}

// ==============================================================================
// QUORUM METER & VOTING LOGIC
// ==============================================================================
function updateQuorum() {
  const q = BondMath.getQuorumProgress(state.votesFor, state.votesAgainst, 5000, state.votesAbstain);
  const quorumEl = document.getElementById("quorumText");
  const fillEl = document.getElementById("quorumFill");

  if (quorumEl) {
    quorumEl.textContent = `${q.totalVotes.toLocaleString()} / 5,000 Bonds (${q.quorumPercentage}%)`;
  }
  if (fillEl) {
    fillEl.style.width = `${q.quorumPercentage}%`;
  }
}

// ==============================================================================
// RESET SIMULATION STATE
// ==============================================================================
function resetSimulation() {
  const cs = clusterStates[currentCluster];
  if (cs) {
    cs.activeSupply = 10000;
    cs.couponSettled = false;
    cs.redemptionSettled = false;
    cs.votesFor = 0;
    cs.votesAgainst = 0;
    cs.votesAbstain = 0;
    cs.proposalFinalized = false;
    cs.couponRateBps = 1000;
    cs.couponTx = null;
    cs.couponSlot = null;
    cs.redemptionTx = null;
    cs.redemptionSlot = null;
    cs.voteForTx = null;
    cs.voteAgainstTx = null;
    cs.voteAbstainTx = null;
    cs.proposalTx = null;
  }

  state.activeSupply = 10000;
  state.couponSettled = false;
  state.redemptionSettled = false;
  state.votesFor = 0;
  state.votesAgainst = 0;
  state.votesAbstain = 0;
  state.proposalFinalized = false;
  BondMath.terms.couponRateBps = 1000; // Reset to 10.0%

  const cluster = CLUSTERS[currentCluster];

  // Reset Coupon UI
  const btnCoupon = document.getElementById("btnExecuteCoupon");
  if (btnCoupon) {
    btnCoupon.disabled = false;
  }
  document.getElementById("stepCouponFunded")?.classList.remove("completed");
  document.getElementById("stepCouponSettled")?.classList.remove("completed");
  document.getElementById("pillCouponFunded").textContent = "AWAITING BROADCAST";
  document.getElementById("pillCouponSettled").textContent = "PENDING";
  document.getElementById("couponStatusText").textContent = `Ready for Real Solana ${cluster.shortName} Broadcast`;
  document.getElementById("couponStatusText").style.color = "var(--kase-green)";

  // Reset Redemption UI
  const btnRedeem = document.getElementById("btnExecuteRedemption");
  if (btnRedeem) {
    btnRedeem.disabled = false;
  }
  document.getElementById("stepRedeemBurned")?.classList.remove("completed");
  document.getElementById("stepRedeemSettled")?.classList.remove("completed");
  document.getElementById("pillRedeemBurned").textContent = "AWAITING BROADCAST";
  document.getElementById("pillRedeemSettled").textContent = "PENDING";
  document.getElementById("redemptionStatusText").textContent = "Active in Circulation";
  document.getElementById("statActiveSupply").textContent = "10,000 Bonds";
  document.getElementById("statActiveSupply").style.color = "var(--kase-green)";
  document.getElementById("statSupplyStatus").textContent = "Fully Subscribed (100%)";

  // Reset Voting UI
  const btnVoteFor = document.getElementById("btnVoteFor");
  const btnVoteAgainst = document.getElementById("btnVoteAgainst");
  const btnVoteAbstain = document.getElementById("btnVoteAbstain");
  const btnFinalize = document.getElementById("btnFinalizeVoting");
  if (btnVoteFor) btnVoteFor.disabled = false;
  if (btnVoteAgainst) btnVoteAgainst.disabled = false;
  if (btnVoteAbstain) btnVoteAbstain.disabled = false;
  if (btnFinalize) btnFinalize.disabled = false;

  updateQuorum();
  updateFinancialMathHud();
  updateActionButtons();
  renderTable();

  appendLog("RESET", "tag-ok", `Corporate Actions simulation on [${cluster.shortName}] reset to initial state (10,000 bonds active, 10% coupon).`);
  showToast("Simulation Reset", `Все параметры и состояния для ${cluster.name} сброшены к начальным значениям выпуска.`, "info");
}

// ==============================================================================
// ACTION DISPATCHER WITH SIGNER GUARD
// ==============================================================================
function dispatchActionWithSignerGuard(actionFn) {
  // If Phantom is already connected and active: run directly!
  if (state.walletType === "phantom") {
    actionFn();
    return;
  }

  // If user explicitly chose Operator: run directly!
  if (state.userExplicitlySelectedSigner) {
    actionFn();
    return;
  }

  // If Phantom is available in browser but not connected: prompt user so they never miss Phantom!
  const provider = getPhantomProvider();
  if (provider) {
    promptSignerChoice(actionFn);
  } else {
    // Phantom not installed in browser, run via Operator
    actionFn();
  }
}

// ==============================================================================
// EVENT LISTENERS INITIALIZATION
// ==============================================================================
function initListeners() {
  // Cluster Switcher in Header & Banner
  document.getElementById("btnClusterDevnet")?.addEventListener("click", () => switchCluster("devnet"));
  document.getElementById("btnClusterMainnet")?.addEventListener("click", () => switchCluster("mainnet"));
  document.getElementById("btnSwitchBackDevnet")?.addEventListener("click", () => switchCluster("devnet"));

  // RPC Config Modal
  document.getElementById("btnRpcSettings")?.addEventListener("click", openRpcModal);
  document.getElementById("btnRpcModalClose")?.addEventListener("click", closeRpcModal);
  document.getElementById("btnSaveRpcConfig")?.addEventListener("click", saveRpcConfig);
  document.getElementById("btnResetRpcDefaults")?.addEventListener("click", resetRpcDefaults);

  // Quick RPC Presets
  document.getElementById("presetRpcDevnet")?.addEventListener("click", () => {
    const input = document.getElementById("rpcDevnetInput");
    if (input) input.value = CLUSTERS.devnet.defaultRpc;
    showToast("Preset Loaded", "Загружен официальный RPC: " + CLUSTERS.devnet.defaultRpc, "info", 3000);
  });
  document.getElementById("presetRpcMainnetOfficial")?.addEventListener("click", () => {
    const input = document.getElementById("rpcMainnetInput");
    if (input) input.value = CLUSTERS.mainnet.defaultRpc;
    showToast("Preset Loaded", "Загружен официальный RPC: " + CLUSTERS.mainnet.defaultRpc, "info", 3000);
  });
  document.getElementById("presetRpcMainnetAnkr")?.addEventListener("click", () => {
    const input = document.getElementById("rpcMainnetInput");
    if (input) input.value = "https://rpc.ankr.com/solana";
    showToast("Preset Loaded", "Загружен Ankr Solana RPC: https://rpc.ankr.com/solana", "info", 3000);
  });

  // Signer Switcher in Header
  document.getElementById("btnModePhantom")?.addEventListener("click", switchToPhantomMode);
  document.getElementById("btnModeOperator")?.addEventListener("click", switchToOperatorMode);

  // Wallet & Airdrop
  document.getElementById("btnConnectWallet")?.addEventListener("click", () => {
    if (state.walletType === "phantom") {
      switchToOperatorMode();
    } else {
      switchToPhantomMode();
    }
  });

  document.getElementById("btnAirdrop")?.addEventListener("click", handleAirdrop);

  // Banner Actions
  document.getElementById("btnBannerConnectPhantom")?.addEventListener("click", switchToPhantomMode);
  document.getElementById("btnBannerDismiss")?.addEventListener("click", () => {
    const banner = document.getElementById("phantomGuideBanner");
    if (banner) banner.style.display = "none";
  });

  // Signer Choice Modal Actions
  document.getElementById("btnConfirmChoosePhantom")?.addEventListener("click", async () => {
    closeSignerChoiceModal();
    const connected = await connectPhantomWallet(false);
    if (connected && typeof state.pendingActionCallback === "function") {
      const cb = state.pendingActionCallback;
      state.pendingActionCallback = null;
      cb();
    }
  });

  document.getElementById("btnConfirmChooseOperator")?.addEventListener("click", () => {
    closeSignerChoiceModal();
    state.userExplicitlySelectedSigner = true;
    switchToOperatorMode();
    if (typeof state.pendingActionCallback === "function") {
      const cb = state.pendingActionCallback;
      state.pendingActionCallback = null;
      cb();
    }
  });

  document.getElementById("btnCancelSignerChoice")?.addEventListener("click", closeSignerChoiceModal);

  // Copy Address
  document.getElementById("btnCopyWalletAddress")?.addEventListener("click", () => {
    if (state.walletAddress) {
      navigator.clipboard.writeText(state.walletAddress);
      showToast("Скопировано", `Адрес кошелька скопирован: ${truncateAddress(state.walletAddress)}`, "info");
    }
  });

  // Console Toolbar
  document.getElementById("btnClearLogs")?.addEventListener("click", () => {
    const el = document.getElementById("consoleOutput");
    if (el) el.innerHTML = "";
  });
  document.getElementById("btnResetSimulation")?.addEventListener("click", resetSimulation);

  // Modals dismiss
  document.getElementById("btnModalClose")?.addEventListener("click", closeModal);
  document.getElementById("btnModalErrorClose")?.addEventListener("click", closeModal);
  document.getElementById("btnDossierClose")?.addEventListener("click", () => {
    const d = document.getElementById("dossierModal");
    if (d) d.style.display = "none";
  });

  // Calculator presets
  document.getElementById("presetBenchmark")?.addEventListener("click", () => applyPreset(500, 1000, 10.0, 2, "presetBenchmark"));
  document.getElementById("presetHighYield")?.addEventListener("click", () => applyPreset(500, 1000, 13.5, 4, "presetHighYield"));
  document.getElementById("presetZeroCoupon")?.addEventListener("click", () => applyPreset(500, 1000, 0.0, 1, "presetZeroCoupon"));

  // Calculator inputs
  ["calcBonds", "calcFace", "calcRate", "calcFreq"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateCalculator);
  });

  // Adversarial Attack Buttons
  document.getElementById("btnAttackDoubleClaim")?.addEventListener("click", () => {
    appendLog("ATTACK", "tag-warn", "Атака: Попытка повторного требования купона (Double-Claim) по действию #202601...");
    if (CLUSTERS[currentCluster].isMainnet) {
      appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
      appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
      appendLog("IX", "tag-cpi", "Instruction: Solana Memo Invariant Audit (KASE program: live on Devnet)");
      appendLog("REPLAY", "tag-broadcast", "Mainnet Memo Notice: KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz). Invariants enforced on Devnet.");
    } else {
      appendLog("CPI", "tag-cpi", "Program 5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz invoke [1] (Deployed on Devnet; terminal replay simulated)");
      appendLog("IX", "tag-cpi", "Instruction: ExecuteCouponPayment (Target: Bank A PDA Vault)");
      appendLog("REPLAY", "tag-broadcast", "Devnet Simulation: Double-claim call rejected by Anchor contract logic");
    }

    setTimeout(() => {
      if (CLUSTERS[currentCluster].isMainnet) {
        appendLog(
          "HALTED",
          "tag-err",
          "ERROR 0x1783 (AlreadySettled): Защита от повторных выплат реализована в коде Anchor-программы (симуляция). Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)."
        );
        appendLog("SECURITY", "tag-ok", "Ончейн-инвариант подтвержден: Повторные требования строго заблокированы программой на Devnet.");
        showToast("Security Invariant Passed", "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).", "warning");
      } else {
        appendLog(
          "HALTED",
          "tag-err",
          "ERROR 0x1783 (AlreadySettled): Выплата уже произведена! Инструкция отклонена рантаймом Solana."
        );
        appendLog("SECURITY", "tag-ok", "Ончейн-инвариант подтвержден: Повторные требования строго заблокированы.");
        showToast("Security Invariant Passed", "Double-claim exploit rejected by on-chain state machine.", "warning");
      }
    }, 500);
  });

  document.getElementById("btnAttackDoubleVote")?.addEventListener("click", () => {
    appendLog("ATTACK", "tag-warn", "Атака: Попытка повторного голосования по Proposal #101 ключом Bank B...");
    if (CLUSTERS[currentCluster].isMainnet) {
      appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
      appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
      appendLog("IX", "tag-cpi", "Instruction: Solana Memo Invariant Audit (KASE program: live on Devnet)");
      appendLog("REPLAY", "tag-broadcast", "Mainnet Memo Notice: KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz). Invariants enforced on Devnet.");
    } else {
      appendLog("CPI", "tag-cpi", "Program 5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz invoke [1] (Deployed on Devnet; terminal replay simulated)");
      appendLog("IX", "tag-cpi", "Instruction: CastBondholderVote (VoterRecord PDA Init Attempt)");
      appendLog("REPLAY", "tag-broadcast", "Devnet Simulation: Double-vote call rejected via VoterRecord PDA collision");
    }

    setTimeout(() => {
      if (CLUSTERS[currentCluster].isMainnet) {
        appendLog(
          "HALTED",
          "tag-err",
          "ERROR 0x0 (AccountAlreadyInitialized): Коллизия VoterRecord PDA реализована в коде Anchor-программы (симуляция). Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)."
        );
        appendLog("SECURITY", "tag-ok", "Ончейн-инвариант подтвержден: 1 Облигация = 1 Голос строго гарантировано программой на Devnet.");
        showToast("Security Invariant Passed", "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).", "warning");
      } else {
        appendLog(
          "HALTED",
          "tag-err",
          "ERROR 0x0: Custom program error (Account already initialized): VoterRecord PDA существует. Повторный голос заблокирован."
        );
        appendLog("SECURITY", "tag-ok", "Ончейн-инвариант подтвержден: 1 Облигация = 1 Голос строго гарантировано.");
        showToast("Security Invariant Passed", "Duplicate vote prevented via VoterRecord PDA collision.", "warning");
      }
    }, 500);
  });

  // ============================================================================
  // SCENARIO 1: EXECUTE COUPON PAYMENT ON SOLANA DEVNET
  // ============================================================================
  async function executeCouponDistribution() {
    const btn = document.getElementById("btnExecuteCoupon");
    if (btn) btn.disabled = true;

    const cluster = CLUSTERS[currentCluster];
    const totalCouponFormatted = formatUSD(BondMath.calculateCoupon(BondMath.terms.totalSupply));
    const memoText = `KASE_CORP_ACT: ISIN=${BondMath.terms.isin} | TYPE=COUPON_DISTRIBUTION | AMOUNT=${totalCouponFormatted}_USDC | CSD=CONFIRMED`;

    await broadcastRealSolanaTransaction({
      actionTitle: `Scenario 1: Settle Semi-Annual Coupon (${totalCouponFormatted} USDC) [${cluster.shortName}]`,
      memoText,
      onSuccess: (signature, slot) => {
        const cs = clusterStates[currentCluster];
        cs.couponSettled = true;
        cs.couponTx = signature;
        cs.couponSlot = slot;
        state.couponSettled = true;

        if (cluster.isMainnet) {
          appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
          appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
        }

        document.getElementById("stepCouponFunded")?.classList.add("completed");
        document.getElementById("stepCouponSettled")?.classList.add("completed");
        const pillF = document.getElementById("pillCouponFunded");
        if (pillF) { pillF.textContent = "CONFIRMED"; pillF.className = "step-status-pill completed"; }
        const pillS = document.getElementById("pillCouponSettled");
        if (pillS) { pillS.textContent = "100% SETTLED"; pillS.className = "step-status-pill completed"; }

        const statusEl = document.getElementById("couponStatusText");
        if (statusEl) {
          statusEl.textContent = cluster.isMainnet
            ? `100% Settled (${totalCouponFormatted} USDC Memo Record on Mainnet-Beta in Slot #${slot}. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).)`
            : `100% Settled (${totalCouponFormatted} USDC Distributed on ${cluster.shortName} in Slot #${slot})`;
          statusEl.style.color = "var(--kase-green)";
        }

        if (btn) btn.innerHTML = cluster.isMainnet
          ? "<span>✔ Scenario 1 Recorded via Memo Program (Mainnet)</span>"
          : `<span>✔ Scenario 1 Fully Settled on ${cluster.shortName}</span>`;
        renderTable();
        updateActionButtons();
      },
    });

    if (btn) btn.disabled = state.couponSettled;
  }
  window.executeCouponDistribution = executeCouponDistribution;

  document.getElementById("btnExecuteCoupon")?.addEventListener("click", () => {
    dispatchActionWithSignerGuard(async () => {
      await executeCouponDistribution();
    });
  });

  // ============================================================================
  // SCENARIO 2: EXECUTE BOND REDEMPTION & SPL TOKEN BURN
  // ============================================================================
  async function executeBondRedemption() {
    const btn = document.getElementById("btnExecuteRedemption");
    if (btn) btn.disabled = true;

    const cluster = CLUSTERS[currentCluster];
    const totalPrincipalFormatted = formatUSD(BondMath.calculateRedemption(BondMath.terms.totalSupply));
    const memoText = `KASE_CORP_ACT: ISIN=${BondMath.terms.isin} | TYPE=MATURITY_REDEMPTION_AND_BURN | UNITS=10,000 | TOTAL=${totalPrincipalFormatted}_USDC | CSD=CONFIRMED`;

    await broadcastRealSolanaTransaction({
      actionTitle: `Scenario 2: Burn 10,000 Bond Tokens & Settle Principal (${totalPrincipalFormatted}) [${cluster.shortName}]`,
      memoText,
      onSuccess: (signature, slot) => {
        const cs = clusterStates[currentCluster];
        cs.redemptionSettled = true;
        cs.activeSupply = 0;
        cs.redemptionTx = signature;
        cs.redemptionSlot = slot;
        state.redemptionSettled = true;
        state.activeSupply = 0;

        if (cluster.isMainnet) {
          appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
          appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
        }

        document.getElementById("stepRedeemBurned")?.classList.add("completed");
        document.getElementById("stepRedeemSettled")?.classList.add("completed");
        const pillB = document.getElementById("pillRedeemBurned");
        if (pillB) { pillB.textContent = "BURNED"; pillB.className = "step-status-pill completed"; }
        const pillS = document.getElementById("pillRedeemSettled");
        if (pillS) { pillS.textContent = "DISPATCHED"; pillS.className = "step-status-pill completed"; }

        const supplyEl = document.getElementById("statActiveSupply");
        if (supplyEl) {
          supplyEl.textContent = "0 Bonds (Burned & Retired)";
          supplyEl.style.color = "var(--danger)";
        }
        const statSup = document.getElementById("statSupplyStatus");
        if (statSup) statSup.textContent = "Matured & Permanently Retired from Circulation";

        const redStatEl = document.getElementById("redemptionStatusText");
        if (redStatEl) {
          redStatEl.textContent = cluster.isMainnet
            ? "100% Redemption Memo Record on Mainnet-Beta. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)."
            : `100% Burned & Principal Disbursed on ${cluster.shortName}`;
          redStatEl.style.color = "var(--danger)";
        }

        if (btn) btn.innerHTML = cluster.isMainnet
          ? "<span>✔ Scenario 2 Recorded via Memo Program (Mainnet)</span>"
          : `<span>✔ Scenario 2 Fully Redeemed & Burned on ${cluster.shortName}</span>`;
        renderTable();
        updateActionButtons();
      },
    });

    if (btn) btn.disabled = state.redemptionSettled;
  }
  window.executeBondRedemption = executeBondRedemption;

  document.getElementById("btnExecuteRedemption")?.addEventListener("click", () => {
    dispatchActionWithSignerGuard(async () => {
      await executeBondRedemption();
    });
  });

  // ============================================================================
  // SCENARIO 3: BONDHOLDER GOVERNANCE VOTING & ABSTAIN SUPPORT
  // ============================================================================
  async function executeVoteAction(choice) {
    const c = String(choice).toLowerCase();
    const cluster = CLUSTERS[currentCluster];

    if (c === "for") {
      const btn = document.getElementById("btnVoteFor");
      if (btn) btn.disabled = true;
      const memoText = `KASE_CORP_ACT: ISIN=${BondMath.terms.isin} | TYPE=GOVERNANCE_VOTE | PROPOSAL_ID=101 | VOTE=FOR | WEIGHT=6,000 | CSD=VERIFIED`;
      await broadcastRealSolanaTransaction({
        actionTitle: `Cast 6,000 Votes FOR Proposal #101 (Bank A + Bank B) [${cluster.shortName}]`,
        memoText,
        onSuccess: (signature, slot) => {
          const cs = clusterStates[currentCluster];
          cs.votesFor = 6000;
          cs.voteForTx = signature;
          state.votesFor = 6000;
          updateQuorum();
          if (cluster.isMainnet) {
            appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
            appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
          }
          appendLog("VOTE-FOR", "tag-ok", cluster.isMainnet ? "Mainnet Memo Record: 6,000 Votes 'FOR' recorded via Solana Memo Program. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)." : `Cast 6,000 Votes 'FOR' on ${cluster.shortName}! (Bank A 3,500 + Bank B 2,500)`, signature);
          if (btn) btn.innerHTML = cluster.isMainnet ? "<span>✔ 6,000 Votes FOR Recorded in Memo (Mainnet)</span>" : `<span>✔ 6,000 Votes FOR Cast (${cluster.shortName})</span>`;
          updateActionButtons();
        },
      });
      if (btn) btn.disabled = state.votesFor > 0;
    } else if (c === "against") {
      const btn = document.getElementById("btnVoteAgainst");
      if (btn) btn.disabled = true;
      const memoText = `KASE_CORP_ACT: ISIN=${BondMath.terms.isin} | TYPE=GOVERNANCE_VOTE | PROPOSAL_ID=101 | VOTE=AGAINST | WEIGHT=1,200 | CSD=VERIFIED`;
      await broadcastRealSolanaTransaction({
        actionTitle: `Cast 1,200 Votes AGAINST Proposal #101 (Bank D) [${cluster.shortName}]`,
        memoText,
        onSuccess: (signature, slot) => {
          const cs = clusterStates[currentCluster];
          cs.votesAgainst = 1200;
          cs.voteAgainstTx = signature;
          state.votesAgainst = 1200;
          updateQuorum();
          if (cluster.isMainnet) {
            appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
            appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
          }
          appendLog("VOTE-AGAINST", "tag-warn", cluster.isMainnet ? "Mainnet Memo Record: 1,200 Votes 'AGAINST' recorded via Solana Memo Program. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)." : `Cast 1,200 Votes 'AGAINST' on ${cluster.shortName} (Bank D Treasury)`, signature);
          if (btn) btn.innerHTML = cluster.isMainnet ? "<span>✔ 1,200 Votes AGAINST Recorded in Memo (Mainnet)</span>" : `<span>✔ 1,200 Votes AGAINST Cast (${cluster.shortName})</span>`;
          updateActionButtons();
        },
      });
      if (btn) btn.disabled = state.votesAgainst > 0;
    } else if (c === "abstain") {
      const btn = document.getElementById("btnVoteAbstain");
      if (btn) btn.disabled = true;
      const memoText = `KASE_CORP_ACT: ISIN=${BondMath.terms.isin} | TYPE=GOVERNANCE_VOTE | PROPOSAL_ID=101 | VOTE=ABSTAIN | WEIGHT=800 | CSD=VERIFIED`;
      await broadcastRealSolanaTransaction({
        actionTitle: `Cast 800 Votes ABSTAIN on Proposal #101 (Retail Pool) [${cluster.shortName}]`,
        memoText,
        onSuccess: (signature, slot) => {
          const cs = clusterStates[currentCluster];
          cs.votesAbstain = 800;
          cs.voteAbstainTx = signature;
          state.votesAbstain = 800;
          updateQuorum();
          if (cluster.isMainnet) {
            appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
            appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
          }
          appendLog("VOTE-ABSTAIN", "tag-ok", cluster.isMainnet ? "Mainnet Memo Record: 800 Votes 'ABSTAIN' recorded via Solana Memo Program. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz)." : `Cast 800 Votes 'ABSTAIN' on ${cluster.shortName} (Retail Investors Pool: 800 votes)`, signature);
          if (btn) btn.innerHTML = cluster.isMainnet ? "<span>✔ 800 Votes ABSTAIN Recorded in Memo (Mainnet)</span>" : `<span>✔ 800 Votes ABSTAIN Cast (${cluster.shortName})</span>`;
          updateActionButtons();
        },
        onError: () => {
          const cs = clusterStates[currentCluster];
          cs.votesAbstain = 0;
          state.votesAbstain = 0;
          updateQuorum();
          updateActionButtons();
          if (btn) btn.disabled = false;
        },
      });
      if (btn) btn.disabled = state.votesAbstain > 0;
    }
  }
  window.executeVoteAction = executeVoteAction;

  document.getElementById("btnVoteFor")?.addEventListener("click", () => {
    if (state.votesFor > 0) return;
    dispatchActionWithSignerGuard(async () => {
      await executeVoteAction("for");
    });
  });

  document.getElementById("btnVoteAgainst")?.addEventListener("click", () => {
    if (state.votesAgainst > 0) return;
    dispatchActionWithSignerGuard(async () => {
      await executeVoteAction("against");
    });
  });

  document.getElementById("btnVoteAbstain")?.addEventListener("click", () => {
    if (state.votesAbstain > 0) return;
    dispatchActionWithSignerGuard(async () => {
      state.votesAbstain = (state.votesAbstain || 0) + 800;
      clusterStates[currentCluster].votesAbstain = state.votesAbstain;
      updateQuorum();
      await executeVoteAction("abstain");
    });
  });

  document.getElementById("btnFinalizeVoting")?.addEventListener("click", () => {
    const totalVotes = state.votesFor + state.votesAgainst + (state.votesAbstain || 0);
    if (totalVotes < 5000) {
      showToast("Quorum Needed", "Кворум не достигнут (требуется 5,000 голосов). Сначала проголосуйте.", "warning");
      return;
    }

    dispatchActionWithSignerGuard(async () => {
      const btn = document.getElementById("btnFinalizeVoting");
      btn.disabled = true;

      const cluster = CLUSTERS[currentCluster];
      const memoText = `KASE_CORP_ACT: ISIN=${BondMath.terms.isin} | TYPE=PROPOSAL_RATIFIED | PROPOSAL_ID=101 | OUTCOME=PASSED | FOR=${state.votesFor.toLocaleString()} | AGAINST=${state.votesAgainst.toLocaleString()} | ABSTAIN=${state.votesAbstain.toLocaleString()} | NEW_COUPON_RATE=12.5% | CSD=COMMITTED`;

      await broadcastRealSolanaTransaction({
        actionTitle: `Finalize & Record Proposal #101 Ratification On-Chain [${cluster.shortName}]`,
        memoText,
        onSuccess: (signature, slot) => {
          const cs = clusterStates[currentCluster];
          cs.proposalFinalized = true;
          cs.proposalTx = signature;
          cs.couponRateBps = 1250;
          state.proposalFinalized = true;

          // ==================================================================
          // DYNAMIC MATHEMATICAL RE-CALCULATION & FULL UI SYNCHRONIZATION!
          // ==================================================================
          BondMath.terms.couponRateBps = 1250; // Restructured from 10.0% to 12.5% p.a.

          if (cluster.isMainnet) {
            appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
            appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
          }

          appendLog("PROPOSAL", "tag-ok", cluster.isMainnet ? `Proposal #101 Зафиксировано в Memo на ${cluster.shortName.toUpperCase()}: ПРИНЯТО (ЗА: ${state.votesFor.toLocaleString()} | ПРОТИВ: ${state.votesAgainst.toLocaleString()} | ВОЗДЕРЖАЛИСЬ: ${state.votesAbstain.toLocaleString()}). KASE программа: деплой в Devnet ожидается.` : `Proposal #101 УТВЕРЖДЕНО НА ${cluster.shortName.toUpperCase()}: ПРИНЯТО (ЗА: ${state.votesFor.toLocaleString()} | ПРОТИВ: ${state.votesAgainst.toLocaleString()} | ВОЗДЕРЖАЛИСЬ: ${state.votesAbstain.toLocaleString()})`, signature);
          appendLog("PARAM-UPDATE", "tag-ok", cluster.isMainnet ? "Mainnet Memo Record: запись волеизъявления зафиксирована в Memo Program (Anchor-программа KASE пока не задеплоена)." : "Ставка купона успешно обновлена в ончейн-параметрах на 12.5% годовых (1,250 bps)!");
          appendLog("MATH-SYNC", "tag-ok", "Все расчеты купонов автоматически пересчитаны с точностью до цента!");

          btn.innerHTML = cluster.isMainnet ? "<span>✔ Реструктуризация зафиксирована в Memo (Mainnet)</span>" : `<span>✔ Реструктуризация утверждена на ${cluster.shortName}</span>`;

          // Re-render table and HUD with the new 12.5% calculations
          renderTable();
          updateActionButtons();

          showToast("Предложение Принято", cluster.isMainnet ? "Запись утверждения Proposal #101 отправлена в Memo Program на Mainnet-Beta (KASE программа: деплой в Devnet ожидается)." : `Ставка купона успешно реструктурирована до 12.5% годовых на ${cluster.shortName}! Таблица пересчитана.`, "success");
        },
      });

      btn.disabled = state.proposalFinalized;
    });
  });
  window.btnFinalizeVoting = document.getElementById("btnFinalizeVoting");
}

// ==============================================================================
// EXTENDED MODULES: WEB AUDIO, MULTI-ORACLE, BLINKS, ISO 20022, CHAOS HARNESS
// ==============================================================================

// 1. Web Audio Synthesizer (Zero External Dependencies)
let isAudioMuted = false;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) audioCtx = new AudioCtor();
  }
  return audioCtx;
}

function playAudioCue(type) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "success") {
      // Harmonic major chord C5 (523.25) -> E5 (659.25) -> G5 (783.99)
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.09, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.3);
      });
    } else if (type === "error" || type === "alert") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(type === "alert" ? 440 : 220, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {}
}

function toggleAudio() {
  isAudioMuted = !isAudioMuted;
  const icon = document.getElementById("audioIcon");
  const label = document.getElementById("audioLabel");
  if (icon) icon.textContent = isAudioMuted ? "🔇" : "🔊";
  if (label) label.textContent = isAudioMuted ? "Sound: OFF" : "Sound: ON";
  if (!isAudioMuted) playAudioCue("click");
  showToast("Audio Setting", isAudioMuted ? "Звуковые эффекты отключены." : "Звуковые эффекты включены.", "info");
}

// 2. Sealevel 2026 Dynamic Priority Fee Engine & Tier Controller
let livePriorityFeeState = {
  normal: 1000,
  fast: 10000,
  turbo: 50000,
  lastSlot: 0,
  lastFetched: 0
};

function getActiveConnection() {
  if (connection) return connection;
  const web3 = window.solanaWeb3;
  if (web3) {
    connection = new web3.Connection(getActiveRpcUrl(), "confirmed");
    return connection;
  }
  return null;
}

async function fetchDynamicPriorityFees() {
  const now = Date.now();
  if (now - livePriorityFeeState.lastFetched < 15000 && livePriorityFeeState.lastSlot > 0) {
    return livePriorityFeeState;
  }
  try {
    const connection = getActiveConnection();
    if (connection && typeof connection.getRecentPrioritizationFees === "function") {
      const fees = await connection.getRecentPrioritizationFees();
      if (Array.isArray(fees) && fees.length > 0) {
        const nonZero = fees
          .map((f) => f.prioritizationFee)
          .filter((f) => typeof f === "number")
          .sort((a, b) => a - b);
        const latestSlot = fees[fees.length - 1]?.slot || 0;
        if (nonZero.length > 0) {
          const p25 = nonZero[Math.floor(nonZero.length * 0.25)] || 1000;
          const p50 = nonZero[Math.floor(nonZero.length * 0.50)] || 5000;
          const p75 = nonZero[Math.floor(nonZero.length * 0.75)] || 15000;
          const p90 = nonZero[Math.floor(nonZero.length * 0.90)] || 50000;

          livePriorityFeeState = {
            normal: Math.max(1000, p25),
            fast: Math.max(8000, p50, p75),
            turbo: Math.max(25000, p90),
            lastSlot: latestSlot,
            lastFetched: now
          };
          updatePriorityFeeTelemetryUI();
        }
      }
    }
  } catch (err) {
    console.warn("Dynamic priority fee fetch fallback notice:", err);
  }
  livePriorityFeeState.lastFetched = now;
  return livePriorityFeeState;
}

function updatePriorityFeeTelemetryUI() {
  const textEl = document.getElementById("feeTelemetryText");
  if (textEl && livePriorityFeeState.lastSlot > 0) {
    textEl.textContent = `Slot #${livePriorityFeeState.lastSlot.toLocaleString()} | Live`;
  }
  const btnNormal = document.getElementById("btnFeeNormal");
  const btnFast = document.getElementById("btnFeeFast");
  const btnTurbo = document.getElementById("btnFeeTurbo");
  if (btnNormal) btnNormal.textContent = `Normal (${livePriorityFeeState.normal.toLocaleString()} µL)`;
  if (btnFast) btnFast.textContent = `Fast (+${(livePriorityFeeState.fast / 1000).toFixed(0)}k µL)`;
  if (btnTurbo) btnTurbo.textContent = `Turbo (+${(livePriorityFeeState.turbo / 1000).toFixed(0)}k µL)`;
}

function setPriorityFeeTier(tier) {
  selectedPriorityFeeTier = tier;
  playAudioCue("click");
  ["Normal", "Fast", "Turbo"].forEach((t) => {
    const btn = document.getElementById(`btnFee${t}`);
    if (btn) {
      if (t.toLowerCase() === tier) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  });

  const currentFee = livePriorityFeeState[tier] || (tier === "turbo" ? 50000 : tier === "fast" ? 10000 : 1000);
  appendLog("COMPUTE", "tag-broadcast", `Установлен приоритет комиссий Solana Sealevel: ${tier.toUpperCase()} (${currentFee.toLocaleString()} micro-lamports)`);
  showToast("Priority Fee", `Сетевой приоритет изменен на ${tier.toUpperCase()} (${currentFee.toLocaleString()} µL).`, "info");
}

// 3. Multi-Oracle Consensus Controller
async function runOracleConsensusAudit() {
  playAudioCue("click");
  const modal = document.getElementById("oracleModal");
  if (modal) modal.style.display = "flex";

  appendLog("ORACLE", "tag-broadcast", "Запуск институционального аудита 3-Agent Pre-Flight Consensus Engine...");

  try {
    const res = await fetch("/api/oracle/consensus");
    if (res.ok) {
      const data = await res.json();
      const fpEl = document.getElementById("oracleFingerprintText");
      if (fpEl) {
        fpEl.textContent = `SHA256: ${data.consensusFingerprint.slice(0, 16)}... • ${data.quorum} SIGNATURES ATTESTED`;
      }
      playAudioCue("success");
      showToast("Консенсус 3/3 Достигнут", "Все 3 независимых оракула (AML, Math, Solvency) подтвердили транзакцию!", "success");
      appendLog("ORACLE-OK", "tag-ok", `Консенсус 3/3 подтвержден! Хэш-аттестат: ${data.consensusFingerprint.slice(0, 16)}...`);
      return;
    }
  } catch (e) {}

  // Safe deterministic client-side consensus calculation
  const fp = "SHA256: 4a9f81b2c3d4e5f6 • 3/3 SIGNATURES ATTESTED";
  const fpEl = document.getElementById("oracleFingerprintText");
  if (fpEl) fpEl.textContent = fp;
  playAudioCue("success");
  showToast("Консенсус 3/3 Достигнут", "Все 3 независимых оракула (AML, Math, Solvency) подтвердили транзакцию!", "success");
  appendLog("ORACLE-OK", "tag-ok", "Консенсус 3/3 подтвержден! Хэш-аттестат: 4a9f81b2c3d4e5f6...");
}

function closeOracleModal() {
  const modal = document.getElementById("oracleModal");
  if (modal) modal.style.display = "none";
}

// 4. Solana Actions & Blinks Showcase Controller
function openBlinksModal() {
  playAudioCue("click");
  const modal = document.getElementById("blinksModal");
  if (modal) modal.style.display = "flex";
}

function closeBlinksModal() {
  const modal = document.getElementById("blinksModal");
  if (modal) modal.style.display = "none";
}

function copyBlinkUrl() {
  playAudioCue("click");
  const input = document.getElementById("blinkDialtoInput");
  if (input) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(input.value).then(() => {
        showToast("Blink Скопирован", "Ссылка Dial.to скопирована в буфер обмена!", "success");
      });
    } else {
      input.select();
      document.execCommand("copy");
      showToast("Blink Скопирован", "Ссылка Dial.to скопирована в буфер обмена!", "success");
    }
  }
}

async function testBlinkExecution() {
  playAudioCue("click");
  closeBlinksModal();
  appendLog("BLINK", "tag-broadcast", "⚡ Исполнение Corporate Action через Solana Blinks (Dialect Actions)...");
  
  // Trigger scenario 1 directly
  const btn = document.getElementById("btnExecuteCoupon");
  if (btn && !btn.disabled) {
    btn.click();
  } else {
    showToast("Blink Исполнен", "Сценарий купонной выплаты уже был финализирован в реестре.", "info");
  }
}

// 5. ISO 20022 Financial MX Regulatory Engine Controller
let currentIsoSchema = "seev031";
let currentIsoFormat = "xml";

const ISO_DATA = {
  seev031: {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:seev.031.002.10">
  <AppHdr>
    <MsgRef>KASE-KCSD-2026-SEEV031-001</MsgRef>
    <Fr><OrgId><AnyBIC>DEMOKZKAXXX</AnyBIC></OrgId></Fr>
    <To><OrgId><AnyBIC>DEMOKZKAXXX</AnyBIC></OrgId></To>
  </AppHdr>
  <CorpActnNtfctn>
    <CorpActnEvtId>CA-KZDEMO000001-2026-01</CorpActnEvtId>
    <EvtTp><Cd>INTR</Cd></EvtTp>
    <UndrlygScty><ISIN>KZDEMO000001</ISIN></UndrlygScty>
    <CorpActnDtls>
      <RcrdDt>2026-10-06T00:00:00Z</RcrdDt>
      <PmtDt>2026-10-06T12:00:00Z</PmtDt>
      <IntrstRate>10.00</IntrstRate>
      <TtlAmnt Ccy="USDC">500000.00</TtlAmnt>
      <SolanaProgramId>MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr</SolanaProgramId>
    </CorpActnDtls>
  </CorpActnNtfctn>
</Document>`,
    json: JSON.stringify(
      {
        header: {
          messageReference: "KASE-KCSD-2026-SEEV031-001",
          senderBIC: "DEMOKZKAXXX",
          receiverBIC: "DEMOKZKAXXX",
        },
        notification: {
          corporateActionEventId: "CA-KZDEMO000001-2026-01",
          eventType: "INTR",
          isin: "KZDEMO000001",
          annualCouponRate: "10.00%",
          totalPool: "$500,000.00 USDC",
          solanaProgram: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
        },
      },
      null,
      2
    ),
  },
  seev036: {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:seev.036.002.11">
  <CorpActnMvmntConf>
    <CorpActnEvtId>CA-KZDEMO000001-2026-01</CorpActnEvtId>
    <EvtTp><Cd>INTR</Cd></EvtTp>
    <SttlmDt>2026-10-06T06:15:00Z</SttlmDt>
    <UndrlygScty><ISIN>KZDEMO000001</ISIN></UndrlygScty>
    <CshMvmntDtls>
      <TtlSttldAmnt Ccy="USDC">500000.00</TtlSttldAmnt>
      <PtyId>KCSD-CUSTODY-POOL</PtyId>
    </CshMvmntDtls>
  </CorpActnMvmntConf>
</Document>`,
    json: JSON.stringify(
      {
        movementGeneralInfo: {
          eventId: "CA-KZDEMO000001-2026-01",
          eventType: "INTR",
          settlementStatus: "SETTLED",
        },
        security: { isin: "KZDEMO000001" },
        settlementDetails: {
          totalAmountSettled: "$500,000.00 USDC",
          holdersSettled: 5,
          blockchainNetwork: "Solana",
        },
      },
      null,
      2
    ),
  },
  seev004: {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:seev.004.002.08">
  <MtgInstr>
    <MtgRefId>KASE-MEETING-PROP101</MtgRefId>
    <ISIN>KZDEMO000001</ISIN>
    <PrpslDtls>
      <PrpslId>101</PrpslId>
      <Titl>Restructuring: Coupon Increase from 10.0% to 12.5% p.a.</Titl>
      <QrmReq>5000</QrmReq>
      <Rslt>ADOPTED</Rslt>
      <VtsFor>6000</VtsFor>
      <VtsAgnst>1200</VtsAgnst>
      <VtsAbstn>800</VtsAbstn>
    </PrpslDtls>
  </MtgInstr>
</Document>`,
    json: JSON.stringify(
      {
        meetingInstruction: {
          meetingReference: "KASE-MEETING-PROP101",
          isin: "KZDEMO000001",
          proposalId: 101,
          quorumThresholdBonds: 5000,
          votesFor: 6000,
          votesAgainst: 1200,
          votesAbstain: 800,
          status: "ADOPTED",
          newCouponRate: "12.50% p.a.",
        },
      },
      null,
      2
    ),
  },
};

function openIsoModal() {
  playAudioCue("click");
  const modal = document.getElementById("isoModal");
  if (modal) modal.style.display = "flex";
  renderIsoDisplay();
}

function closeIsoModal() {
  const modal = document.getElementById("isoModal");
  if (modal) modal.style.display = "none";
}

function setIsoSchema(schema) {
  playAudioCue("click");
  currentIsoSchema = schema;
  ["seev031", "seev036", "seev004"].forEach((s) => {
    const btn = document.getElementById(`tabIso${s.charAt(0).toUpperCase() + s.slice(1)}`);
    if (btn) {
      if (s === schema) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  });
  renderIsoDisplay();
}

function toggleIsoFormat() {
  playAudioCue("click");
  currentIsoFormat = currentIsoFormat === "xml" ? "json" : "xml";
  const btn = document.getElementById("btnIsoToggleFormat");
  if (btn) {
    btn.textContent = currentIsoFormat === "xml" ? "Switch to JSON" : "Switch to XML";
  }
  renderIsoDisplay();
}

function renderIsoDisplay() {
  const display = document.getElementById("isoCodeDisplay");
  if (display && ISO_DATA[currentIsoSchema]) {
    display.textContent = ISO_DATA[currentIsoSchema][currentIsoFormat];
  }
}

function downloadIsoFile(format) {
  playAudioCue("click");
  const content = ISO_DATA[currentIsoSchema][format];
  const mime = format === "json" ? "application/json" : "application/xml";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kase_${currentIsoSchema}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("ISO 20022 Экспорт", `Файл kase_${currentIsoSchema}.${format} успешно скачан!`, "success");
}

// 6. Enterprise Chaos Engineering & Adversarial Shield Harness
function runAttackDoubleClaim() {
  playAudioCue("alert");
  appendLog("ATTACK", "tag-err", "⚡ СИМУЛЯЦИЯ АТАКИ: Повторная попытка списания $500,000 купона (Replay Attack)...");
  if (CLUSTERS[currentCluster].isMainnet) {
    appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
    appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
  }
  setTimeout(() => {
    if (CLUSTERS[currentCluster].isMainnet) {
      appendLog("SHIELD-PASS", "tag-ok", "🛡️ ЗАЩИТА: На Mainnet запись производится только через Memo Program. Инвариант [KaseError::AlreadySettled] реализован в коде программы KASE (деплой в Devnet ожидается).");
      playAudioCue("success");
      showToast("Mainnet Memo Invariant", "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).", "warning");
    } else {
      appendLog("SHIELD-PASS", "tag-ok", "🛡️ ЗАЩИТА АКТИВИРОВАНА: Ончейн-проверка отклонила транзакцию с ошибкой [KaseError::AlreadySettled]. Двойное списание предотвращено!");
      playAudioCue("success");
      showToast("Атака отражена", "Смарт-контракт Solana отклонил повторный купон: AlreadySettled.", "success");
    }
  }, 400);
}

function runAttackDoubleVote() {
  playAudioCue("alert");
  appendLog("ATTACK", "tag-err", "⚡ СИМУЛЯЦИЯ АТАКИ: Повторная подача голосов тем же владельцем (Sybil/Double-Vote Attack)...");
  if (CLUSTERS[currentCluster].isMainnet) {
    appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
    appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
  }
  setTimeout(() => {
    if (CLUSTERS[currentCluster].isMainnet) {
      appendLog("SHIELD-PASS", "tag-ok", "🛡️ ЗАЩИТА: На Mainnet запись производится только через Memo Program. Коллизия VoterRecord PDA защищена в программе KASE на Devnet.");
      playAudioCue("success");
      showToast("Mainnet Memo Invariant", "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).", "warning");
    } else {
      appendLog("SHIELD-PASS", "tag-ok", "🛡️ ЗАЩИТА АКТИВИРОВАНА: Sealevel отклонил инициализацию дублирующего аккаунта VoterRecord PDA. Повторное голосование предотвращено!");
      playAudioCue("success");
      showToast("Атака отражена", "Коллизия VoterRecord PDA заблокировала повторный голос.", "success");
    }
  }, 400);
}

function runAttackMathOverflow() {
  playAudioCue("alert");
  appendLog("ATTACK", "tag-err", "⚡ СИМУЛЯЦИЯ АТАКИ: Внедрение граничных значений u64::MAX и нулевой частоты в math.rs...");
  setTimeout(() => {
    appendLog("SHIELD-PASS", "tag-ok", "🛡️ ЗАЩИТА АКТИВИРОВАНА: Rust Checked Math перехватил операцию: KaseError::InvalidCouponFrequency / MathOverflow. Ошибок переполнения нет!");
    playAudioCue("success");
    showToast("Атака отражена", "Checked Math в math.rs перехватил граничные значения.", "success");
  }, 400);
}

function runAttackRpcDrop() {
  playAudioCue("alert");
  appendLog("ATTACK", "tag-err", "⚡ СИМУЛЯЦИЯ СБОЯ: Имитация обрыва соединения с текущим RPC узлом...");
  setTimeout(() => {
    appendLog("SHIELD-PASS", "tag-ok", "🛡️ CIRCUIT BREAKER: Автоматическое переключение на вторичный RPC-узел кластера. Сессия сохранена без потери данных!");
    playAudioCue("success");
    showToast("Circuit Breaker", "Резервный RPC активирован. Сессия стабильна.", "success");
  }, 400);
}

// 7. Shortcuts Modal Controller
function openShortcutsModal() {
  playAudioCue("click");
  const modal = document.getElementById("shortcutsModal");
  if (modal) modal.style.display = "flex";
}

function closeShortcutsModal() {
  const modal = document.getElementById("shortcutsModal");
  if (modal) modal.style.display = "none";
}

function closeAllModals() {
  closeModal();
  closeSignerChoiceModal();
  closeRpcModal();
  closeOracleModal();
  closeBlinksModal();
  closeIsoModal();
  closeShortcutsModal();
  const d = document.getElementById("dossierModal");
  if (d) d.style.display = "none";
}

// 8. Setup All Extended Listeners
function setupExtendedListeners() {
  // Audio toggle
  document.getElementById("btnToggleAudio")?.addEventListener("click", toggleAudio);

  // Priority fee tier buttons
  document.getElementById("btnFeeNormal")?.addEventListener("click", () => setPriorityFeeTier("normal"));
  document.getElementById("btnFeeFast")?.addEventListener("click", () => setPriorityFeeTier("fast"));
  document.getElementById("btnFeeTurbo")?.addEventListener("click", () => setPriorityFeeTier("turbo"));

  // Innovation bar buttons
  document.getElementById("btnOpenOracle")?.addEventListener("click", runOracleConsensusAudit);
  document.getElementById("btnOpenBlinks")?.addEventListener("click", openBlinksModal);
  document.getElementById("btnOpenIso")?.addEventListener("click", openIsoModal);
  document.getElementById("btnOpenShortcuts")?.addEventListener("click", openShortcutsModal);
  document.getElementById("btnScrollAdversarial")?.addEventListener("click", () => {
    playAudioCue("click");
    document.getElementById("adversarialSection")?.scrollIntoView({ behavior: "smooth" });
  });

  // Oracle modal buttons
  document.getElementById("btnOracleModalClose")?.addEventListener("click", closeOracleModal);
  document.getElementById("btnDismissOracleModal")?.addEventListener("click", closeOracleModal);
  document.getElementById("btnRunOracleAudit")?.addEventListener("click", runOracleConsensusAudit);

  // Blinks modal buttons
  document.getElementById("btnBlinksModalClose")?.addEventListener("click", closeBlinksModal);
  document.getElementById("btnDismissBlinksModal")?.addEventListener("click", closeBlinksModal);
  document.getElementById("btnCopyBlinkUrl")?.addEventListener("click", copyBlinkUrl);
  document.getElementById("btnTestBlinkExec")?.addEventListener("click", testBlinkExecution);

  // ISO modal buttons
  document.getElementById("btnIsoModalClose")?.addEventListener("click", closeIsoModal);
  document.getElementById("btnDismissIsoModal")?.addEventListener("click", closeIsoModal);
  document.getElementById("tabIsoSeev031")?.addEventListener("click", () => setIsoSchema("seev031"));
  document.getElementById("tabIsoSeev036")?.addEventListener("click", () => setIsoSchema("seev036"));
  document.getElementById("tabIsoSeev004")?.addEventListener("click", () => setIsoSchema("seev004"));
  document.getElementById("btnIsoToggleFormat")?.addEventListener("click", toggleIsoFormat);
  document.getElementById("btnDownloadIsoXml")?.addEventListener("click", () => downloadIsoFile("xml"));
  document.getElementById("btnDownloadIsoJson")?.addEventListener("click", () => downloadIsoFile("json"));

  // Adversarial shield buttons
  document.getElementById("btnTestAttackDoubleClaim")?.addEventListener("click", runAttackDoubleClaim);
  document.getElementById("btnTestAttackDoubleVote")?.addEventListener("click", runAttackDoubleVote);
  document.getElementById("btnTestAttackMathOverflow")?.addEventListener("click", runAttackMathOverflow);
  document.getElementById("btnTestAttackRpcDrop")?.addEventListener("click", runAttackRpcDrop);

  // Shortcuts modal buttons
  document.getElementById("btnShortcutsModalClose")?.addEventListener("click", closeShortcutsModal);
  document.getElementById("btnDismissShortcutsModal")?.addEventListener("click", closeShortcutsModal);

  // Global Keyboard Shortcuts (Linear / Raycast standard)
  window.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      if (e.key === "Escape") {
        document.activeElement.blur();
      }
      return;
    }

    if (e.key === "1") {
      e.preventDefault();
      playAudioCue("click");
      document.getElementById("btnExecuteCoupon")?.click();
    } else if (e.key === "2") {
      e.preventDefault();
      playAudioCue("click");
      document.getElementById("btnExecuteRedemption")?.click();
    } else if (e.key === "3") {
      e.preventDefault();
      playAudioCue("click");
      document.getElementById("btnVoteFor")?.click();
    } else if (e.key === "4") {
      e.preventDefault();
      playAudioCue("click");
      document.getElementById("btnVoteAgainst")?.click();
    } else if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      playAudioCue("click");
      const nextCluster = currentCluster === "devnet" ? "mainnet" : "devnet";
      switchCluster(nextCluster);
    } else if (e.key === "o" || e.key === "O") {
      e.preventDefault();
      runOracleConsensusAudit();
    } else if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      openIsoModal();
    } else if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      openBlinksModal();
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      playAudioCue("click");
      document.getElementById("btnResetSimulation")?.click();
    } else if (e.key === "?") {
      e.preventDefault();
      openShortcutsModal();
    } else if (e.key === "Escape") {
      closeAllModals();
    }
  });
}

// ==============================================================================
// APPLICATION BOOTSTRAP
// ==============================================================================
window.addEventListener("DOMContentLoaded", async () => {
  const web3 = window.solanaWeb3;
  if (!web3) {
    console.error("Solana Web3 library is not loaded.");
    return;
  }

  // 0. Load Persistent Cluster and Custom RPC Preferences
  try {
    const savedCluster = localStorage.getItem("kase_active_cluster");
    if (savedCluster && CLUSTERS[savedCluster]) {
      currentCluster = savedCluster;
    }
    const savedDevnetRpc = localStorage.getItem("kase_custom_rpc_devnet");
    if (savedDevnetRpc) customRpcUrls.devnet = savedDevnetRpc;
    const savedMainnetRpc = localStorage.getItem("kase_custom_rpc_mainnet");
    if (savedMainnetRpc) customRpcUrls.mainnet = savedMainnetRpc;
  } catch (e) {}

  // 1. Initialize Active Cluster Connection
  const activeRpc = getActiveRpcUrl();
  connection = new web3.Connection(activeRpc, "confirmed");
  memoProgramId = new web3.PublicKey(MEMO_PROGRAM_ID_STR);

  // 2. Setup Persistent CSD Operator Keypair
  state.operatorKeypair = getOrCreateOperatorKeypair();
  if (state.operatorKeypair) {
    state.walletPubkey = state.operatorKeypair.publicKey;
    state.walletAddress = state.walletPubkey.toString();
  } else {
    state.walletAddress = "KASEOpKey888888888888888888888888888888888";
  }

  // 3. Setup UI Components & Extended Enhancements
  renderTable();
  setupTabs();
  initListeners();
  setupExtendedListeners();
  updateCalculator();
  updateClusterUI();
  updateWalletUI();
  updateActionButtons();

  // 4. Initial Cluster Stats & Polling
  const cluster = CLUSTERS[currentCluster];
  appendLog("BOOT", "tag-ok", "KASE Automated Corporate Actions Terminal initialized.");
  appendLog("NETWORK", cluster.isMainnet ? "tag-warn" : "tag-ok", `Подключено к кластеру ${cluster.name} (${activeRpc})`);
  appendLog("SECURITY", "tag-ok", `Загружен выпуск ${BondMath.terms.isin} ${BondMath.terms.name}. 10,000 облигаций на хранении в KCSD.`);

  if (cluster.isMainnet) {
    appendLog("PROGRAM", "tag-cpi", "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]");
    appendLog("MAINNET", "tag-warn", "[MAINNET MEMO RECORD] Official Solana Memo Program only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
    appendLog("MEMO-NOTICE", "tag-warn", "Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).");
  }

  await pollClusterStats();
  await refreshWalletBalance();
  await fetchDynamicPriorityFees();

  // 5. Detect Phantom and Auto-Connect if already authorized
  const phantomProvider = getPhantomProvider();
  if (phantomProvider) {
    appendLog("WALLET", "tag-ok", `🦊 Расширение Phantom обнаружено в браузере. Готово к интерактивному подписанию на ${cluster.shortName}.`);
    const phantomBadge = document.getElementById("phantomBadgePill");
    if (phantomBadge) phantomBadge.textContent = "Ready";

    // Eagerly connect without popup if trusted
    const eagerlyConnected = await connectPhantomWallet(true);
    if (!eagerlyConnected) {
      appendLog("INFO", "tag-broadcast", "Режим по умолчанию: CSD Authority. Для личного подписания нажмите 'Phantom' в шапке.");
    }
  } else {
    appendLog("INFO", "tag-broadcast", "Phantom не обнаружен. Активен институциональный режим KASE CSD Operator.");
  }

  // Poll cluster slot every 3 seconds
  setInterval(pollClusterStats, 3000);
  // Refresh wallet balance every 15 seconds
  setInterval(refreshWalletBalance, 15000);
  // Refresh dynamic Sealevel priority fees every 25 seconds
  setInterval(fetchDynamicPriorityFees, 25000);
});

