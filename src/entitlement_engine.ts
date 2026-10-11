import BN from "bn.js";

export interface BondTerms {
  isin: string;
  name: string;
  issuer: string;
  currency: string;
  faceValueUsd: number; // e.g. 1000
  faceValueRaw: BN;     // e.g. 1_000_000_000 (6 decimals)
  annualCouponBps: number; // 1000 = 10.00%
  couponsPerYear: number;  // 2 = semi-annual
  totalSupplyBonds: number; // 10,000
  maturityTimestamp: number;
}

export interface HolderPosition {
  holderAddress: string;
  institutionName: string;
  bondsHeld: number;
}

export interface CouponEntitlementResult {
  holderAddress: string;
  institutionName: string;
  bondsHeld: number;
  couponPerBondUsd: number;
  totalCouponUsd: number;
  rawEntitlementAmount: BN;
}

export interface RedemptionEntitlementResult {
  holderAddress: string;
  institutionName: string;
  bondsHeld: number;
  nominalPerBondUsd: number;
  totalPrincipalUsd: number;
  rawEntitlementAmount: BN;
  bondsToBurn: number;
}

export interface VotingTallyResult {
  proposalId: number;
  title: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotes: number;
  quorumThreshold: number;
  quorumMet: boolean;
  passed: boolean;
  percentageFor: number;
}

export const KASE_BENCHMARK_BOND: BondTerms = {
  isin: "KZDEMO000001",
  name: "KASE Demo USD Bond 2026",
  issuer: "Demo Issuer JSC",
  currency: "USDC",
  faceValueUsd: 1000,
  faceValueRaw: new BN(1_000_000_000), // 1000 USDC with 6 decimals
  annualCouponBps: 1000, // 10.00%
  couponsPerYear: 2,     // Semi-annual
  totalSupplyBonds: 10000, // 10,000 bonds = $10,000,000 issue
  maturityTimestamp: 1798761600, // Dec 31, 2026
};

export const KASE_DEFAULT_HOLDERS: HolderPosition[] = [
  {
    holderAddress: "BankATreasury11111111111111111111111111111",
    institutionName: "Bank A",
    bondsHeld: 3500, // $3.5M nominal
  },
  {
    holderAddress: "BankBInvest1111111111111111111111111111111",
    institutionName: "Bank B",
    bondsHeld: 2500, // $2.5M nominal
  },
  {
    holderAddress: "BrokerCCustody11111111111111111111111111111",
    institutionName: "Broker C",
    bondsHeld: 2000, // $2.0M nominal
  },
  {
    holderAddress: "BankDAssetMgmt11111111111111111111111111111",
    institutionName: "Bank D",
    bondsHeld: 1200, // $1.2M nominal
  },
  {
    holderAddress: "RetailPool11111111111111111111111111111111",
    institutionName: "Retail Investors Pool",
    bondsHeld: 800,  // $0.8M nominal
  },
];

/**
 * Coupon income calculation per the rules of KASE and the Central Securities Depository of the Republic of Kazakhstan
 * Formula: Coupon = (BondsHeld * FaceValue * AnnualCouponBps) / (10,000 * CouponsPerYear)
 */
export function calculateCouponEntitlement(
  bondsHeld: number,
  terms: BondTerms = KASE_BENCHMARK_BOND
): { couponPerBondUsd: number; totalCouponUsd: number; rawAmount: BN } {
  if (bondsHeld <= 0) {
    return { couponPerBondUsd: 0, totalCouponUsd: 0, rawAmount: new BN(0) };
  }

  // 1 bond coupon: 1000 * 10% / 2 = $50
  const couponPerBondUsd = (terms.faceValueUsd * terms.annualCouponBps) / (10000 * terms.couponsPerYear);
  const totalCouponUsd = couponPerBondUsd * bondsHeld;

  // On-chain fixed point calculation with BN (6 decimals)
  const bondsBn = new BN(bondsHeld);
  const bpsBn = new BN(terms.annualCouponBps);
  const denomBn = new BN(10000 * terms.couponsPerYear);

  const rawAmount = bondsBn
    .mul(terms.faceValueRaw)
    .mul(bpsBn)
    .div(denomBn);

  return {
    couponPerBondUsd,
    totalCouponUsd,
    rawAmount,
  };
}

/**
 * Principal redemption calculation at bond maturity
 * Formula: Principal = BondsHeld * FaceValue
 */
export function calculateRedemptionEntitlement(
  bondsHeld: number,
  terms: BondTerms = KASE_BENCHMARK_BOND
): { nominalPerBondUsd: number; totalPrincipalUsd: number; rawAmount: BN } {
  if (bondsHeld <= 0) {
    return { nominalPerBondUsd: 0, totalPrincipalUsd: 0, rawAmount: new BN(0) };
  }

  const nominalPerBondUsd = terms.faceValueUsd;
  const totalPrincipalUsd = nominalPerBondUsd * bondsHeld;
  const bondsBn = new BN(bondsHeld);
  const rawAmount = bondsBn.mul(terms.faceValueRaw);

  return {
    nominalPerBondUsd,
    totalPrincipalUsd,
    rawAmount,
  };
}

/**
 * Batch calculation of coupon entitlements for all register participants (Snapshot Entitlement List)
 */
export function buildCouponSnapshot(
  holders: HolderPosition[] = KASE_DEFAULT_HOLDERS,
  terms: BondTerms = KASE_BENCHMARK_BOND
): {
  items: CouponEntitlementResult[];
  totalEligibleBonds: number;
  totalCouponPoolUsd: number;
  totalRawEntitlement: BN;
} {
  let totalEligibleBonds = 0;
  let totalCouponPoolUsd = 0;
  let totalRawEntitlement = new BN(0);

  const items = holders.map((h) => {
    const calc = calculateCouponEntitlement(h.bondsHeld, terms);
    totalEligibleBonds += h.bondsHeld;
    totalCouponPoolUsd += calc.totalCouponUsd;
    totalRawEntitlement = totalRawEntitlement.add(calc.rawAmount);

    return {
      holderAddress: h.holderAddress,
      institutionName: h.institutionName,
      bondsHeld: h.bondsHeld,
      couponPerBondUsd: calc.couponPerBondUsd,
      totalCouponUsd: calc.totalCouponUsd,
      rawEntitlementAmount: calc.rawAmount,
    };
  });

  return {
    items,
    totalEligibleBonds,
    totalCouponPoolUsd,
    totalRawEntitlement,
  };
}

/**
 * Batch calculation of principal redemption for all register participants (Snapshot Redemption List)
 */
export function buildRedemptionSnapshot(
  holders: HolderPosition[] = KASE_DEFAULT_HOLDERS,
  terms: BondTerms = KASE_BENCHMARK_BOND
): {
  items: RedemptionEntitlementResult[];
  totalBondsToBurn: number;
  totalRedemptionPoolUsd: number;
  totalRawEntitlement: BN;
} {
  let totalBondsToBurn = 0;
  let totalRedemptionPoolUsd = 0;
  let totalRawEntitlement = new BN(0);

  const items = holders.map((h) => {
    const calc = calculateRedemptionEntitlement(h.bondsHeld, terms);
    totalBondsToBurn += h.bondsHeld;
    totalRedemptionPoolUsd += calc.totalPrincipalUsd;
    totalRawEntitlement = totalRawEntitlement.add(calc.rawAmount);

    return {
      holderAddress: h.holderAddress,
      institutionName: h.institutionName,
      bondsHeld: h.bondsHeld,
      nominalPerBondUsd: calc.nominalPerBondUsd,
      totalPrincipalUsd: calc.totalPrincipalUsd,
      rawEntitlementAmount: calc.rawAmount,
      bondsToBurn: h.bondsHeld,
    };
  });

  return {
    items,
    totalBondsToBurn,
    totalRedemptionPoolUsd,
    totalRawEntitlement,
  };
}

/**
 * Tally of the bondholder vote (Scenario 3)
 */
export function tallyVotes(
  votesFor: number,
  votesAgainst: number,
  votesAbstain: number,
  quorumThreshold: number = 5000,
  proposalId: number = 101,
  title: string = "Restructuring Proposal #101: Coupon Rate Increase to 12.5% p.a."
): VotingTallyResult {
  const totalVotes = votesFor + votesAgainst + votesAbstain;
  const quorumMet = totalVotes >= quorumThreshold;
  const passed = quorumMet && votesFor > votesAgainst;
  const percentageFor = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;

  return {
    proposalId,
    title,
    votesFor,
    votesAgainst,
    votesAbstain,
    totalVotes,
    quorumThreshold,
    quorumMet,
    passed,
    percentageFor,
  };
}
