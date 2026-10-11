use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum ActionType {
    CouponPayment,
    BondRedemption,
    GovernanceVoting,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum ActionStatus {
    Scheduled,
    SnapshotActive,
    Funded,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum VoteChoice {
    For,
    Against,
    Abstain,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct BondSecurity {
    /// Международный идентификационный номер ценной бумаги (ISIN, e.g. "KZDEMO000001")
    #[max_len(16)]
    pub isin: String,

    /// Эмитент облигации (Demo Issuer JSC)
    pub issuer: Pubkey,

    /// Биржевой регулятор / Центральный Депозитарий (KASE CSD / KCSD)
    pub authority: Pubkey,

    /// SPL Mint токена облигации
    pub bond_mint: Pubkey,

    /// SPL Mint расчетной валюты (USDC / Цифровой Тенге)
    pub settlement_mint: Pubkey,

    /// Номинальная стоимость одной облигации (например, 1,000 USDC = 1_000_000_000 микро-юнитов)
    pub face_value: u64,

    /// Годовая купонная ставка в базисных пунктах (1000 bps = 10.00%)
    pub annual_coupon_bps: u16,

    /// Частота выплат купона в год (2 = полугодовая выплата)
    pub coupons_per_year: u8,

    /// Общий объем выпуска (в штуках облигаций)
    pub total_supply: u64,

    /// Текущий активный объем в обращении (уменьшается при погашении/сжигании)
    pub active_supply: u64,

    /// Дата погашения облигации (Unix timestamp)
    pub maturity_timestamp: i64,

    /// Флаг полного погашения инструмента
    pub is_matured: bool,

    /// Bump seed для PDA
    pub bump: u8,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct CorporateAction {
    /// Уникальный номер корпоративного действия в реестре KASE
    pub action_id: u64,

    /// Ссылка на мастер-аккаунт облигации
    pub bond_security: Pubkey,

    /// Тип действия (Купон, Погашение, Голосование)
    pub action_type: ActionType,

    /// Текущий статус выполнения
    pub status: ActionStatus,

    /// Дата фиксации реестра держателей (Record Date)
    pub record_date_timestamp: i64,

    /// Дата исполнения расчета (Payment / Settlement Date)
    pub settlement_timestamp: i64,

    /// Общий объем средств, требуемый для выплаты пулу держателей (в единицах расчетного токена)
    pub total_entitlement_required: u64,

    /// Общий объем фактически выплаченных средств
    pub total_settled_amount: u64,

    /// Общий объем облигаций, включенных в снимок реестра
    pub snapshot_bonds_count: u64,

    /// Количество обработанных инвесторов
    pub settled_holders_count: u32,

    /// Хранилище средств корпоративного действия (PDA токен-аккаунт)
    pub vault: Pubkey,

    /// Bump seed аккаунта действия
    pub bump: u8,

    /// Bump seed токен-хранилища
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct HolderEntitlement {
    /// Корпоративное действие
    pub corporate_action: Pubkey,

    /// Адрес кошелька держателя
    pub holder: Pubkey,

    /// Баланс облигаций на дату отсечки (Record Date)
    pub bonds_held: u64,

    /// Расчитанный объем прав (купон в USDC или номинал к погашению)
    pub entitlement_amount: u64,

    /// Флаг исполнения выплаты / погашения
    pub is_settled: bool,

    /// Временная метка исполнения
    pub settled_timestamp: i64,

    /// Bump seed для PDA права
    pub bump: u8,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct GovernanceProposal {
    /// Идентификатор предложения
    pub proposal_id: u64,

    /// Облигационный инструмент
    pub bond_security: Pubkey,

    /// Инициатор предложения (Эмитент или крупный держатель)
    pub proposer: Pubkey,

    /// Название корпоративного решения (например: "Реструктуризация: Повышение ставки купона до 12.5%")
    #[max_len(96)]
    pub title: String,

    /// Хэш описания и аудиторского заключения KASE
    pub description_hash: [u8; 32],

    /// Начало голосования
    pub voting_start: i64,

    /// Окончание голосования
    pub voting_end: i64,

    /// Суммарный вес голосов "ЗА"
    pub votes_for: u64,

    /// Суммарный вес голосов "ПРОТИВ"
    pub votes_against: u64,

    /// Суммарный вес голосов "ВОЗДЕРЖАЛСЯ"
    pub votes_abstain: u64,

    /// Порог кворума в штуках облигаций (например, 50% от выпуска)
    pub quorum_threshold_bonds: u64,

    /// Новая годовая ставка купона при одобрении реструктуризации (в bps, e.g. 1250 = 12.50%)
    pub new_coupon_rate_bps: u16,

    /// Флаг подведения итогов
    pub finalized: bool,

    /// Флаг принятия резолюции
    pub passed: bool,

    /// Bump seed
    pub bump: u8,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct VoterRecord {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub vote_weight: u64,
    pub choice: VoteChoice,
    pub timestamp: i64,
    pub bump: u8,
}
