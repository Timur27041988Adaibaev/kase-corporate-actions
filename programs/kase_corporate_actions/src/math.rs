use crate::errors::KaseError;
use anchor_lang::prelude::*;

/// Вычисление купонного дохода по позиции держателя:
/// Coupon = (BondsHeld * FaceValue * CouponRateBps) / (10,000 * Frequency)
///
/// Пример:
/// - BondsHeld = 50
/// - FaceValue = 1,000 USDC (1_000_000_000 микро-юнитов, 6 знаков)
/// - CouponRateBps = 1000 (10.00% годовых)
/// - Frequency = 2 (полугодовая выплата)
/// -> Entitlement = 50 * 1,000,000,000 * 1000 / (10000 * 2) = 2,500,000,000 (2,500 USDC, т.е. $50 на облигацию)
pub fn calculate_coupon_entitlement(
    bonds_held: u64,
    face_value: u64,
    coupon_rate_bps: u16,
    frequency: u8,
) -> Result<u64> {
    require!(frequency > 0, KaseError::InvalidCouponFrequency);

    let bonds_held_u128 = bonds_held as u128;
    let face_value_u128 = face_value as u128;
    let coupon_bps_u128 = coupon_rate_bps as u128;
    let denominator = 10_000u128
        .checked_mul(frequency as u128)
        .ok_or(KaseError::MathOverflow)?;

    let numerator = bonds_held_u128
        .checked_mul(face_value_u128)
        .ok_or(KaseError::MathOverflow)?
        .checked_mul(coupon_bps_u128)
        .ok_or(KaseError::MathOverflow)?;

    let entitlement = numerator
        .checked_div(denominator)
        .ok_or(KaseError::MathOverflow)?;

    u64::try_from(entitlement).map_err(|_| KaseError::MathOverflow.into())
}

/// Вычисление суммы погашения номинала облигаций:
/// Principal = BondsHeld * FaceValue
pub fn calculate_redemption_entitlement(
    bonds_held: u64,
    face_value: u64,
) -> Result<u64> {
    bonds_held
        .checked_mul(face_value)
        .ok_or_else(|| KaseError::MathOverflow.into())
}

/// Проверка достижения кворума для голосования держателей облигаций:
/// QuorumReached = TotalVotes >= QuorumThreshold
pub fn is_quorum_reached(total_votes: u64, quorum_threshold: u64) -> bool {
    total_votes >= quorum_threshold
}

/// Проверка принятия решения (простое большинство голосов "ЗА" от поданных):
/// Passed = VotesFor > VotesAgainst
pub fn is_proposal_passed(votes_for: u64, votes_against: u64) -> bool {
    votes_for > votes_against
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_coupon_calculation_standard() {
        // 1 облигация номиналом $1000, 10% годовых, 2 раза в год -> $50
        let face_value = 1_000_000_000u64; // 1,000 USDC
        let coupon = calculate_coupon_entitlement(1, face_value, 1000, 2).unwrap();
        assert_eq!(coupon, 50_000_000); // 50 USDC

        // 100 облигаций -> $5,000
        let coupon_100 = calculate_coupon_entitlement(100, face_value, 1000, 2).unwrap();
        assert_eq!(coupon_100, 5_000_000_000); // 5,000 USDC
    }

    #[test]
    fn test_redemption_calculation() {
        let face_value = 1_000_000_000u64;
        let redemption = calculate_redemption_entitlement(50, face_value).unwrap();
        assert_eq!(redemption, 50_000_000_000); // 50,000 USDC
    }
}
