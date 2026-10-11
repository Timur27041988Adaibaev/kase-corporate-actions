use anchor_lang::prelude::*;

#[error_code]
pub enum KaseError {
    #[msg("Номинал облигации должен быть больше нуля (Face value must be > 0).")]
    InvalidFaceValue,

    #[msg("Годовая ставка купона не может превышать 100% (10000 bps).")]
    InvalidCouponRate,

    #[msg("Частота выплат купона должна быть 1, 2, 4 или 12 раз в год.")]
    InvalidCouponFrequency,

    #[msg("Дата погашения инструмента должна быть в будущем.")]
    InvalidMaturityDate,

    #[msg("Срок действия корпоративного действия не наступил.")]
    RecordDateNotReached,

    #[msg("Облигация уже погашена (Bond is already matured/redeemed).")]
    BondAlreadyMatured,

    #[msg("Дата погашения облигации еще не наступила.")]
    MaturityNotReached,

    #[msg("Недостаточно средств в хранилище корпоративного действия.")]
    InsufficientVaultFunds,

    #[msg("Баланс инвестора на дату фиксации реестра равен нулю.")]
    ZeroHolderBalance,

    #[msg("Право на выплату уже исполнено (Entitlement already claimed/settled).")]
    AlreadySettled,

    #[msg("Токен-аккаунт инвестора не соответствует ожидаемому владельцу.")]
    InvalidHolderTokenAccount,

    #[msg("Токен-аккаунт не соответствует минту расчетной валюты или облигации.")]
    InvalidTokenMint,

    #[msg("Недостаточно прав для выполнения действия (Только KASE / Эмитент / ЦД).")]
    UnauthorizedAuthority,

    #[msg("Голосование по предложению уже завершено или еще не началось.")]
    VotingPeriodClosed,

    #[msg("Инвестор уже проголосовал по данному предложению (Double voting prevented).")]
    AlreadyVoted,

    #[msg("Кворум для принятия решения не достигнут.")]
    QuorumNotMet,

    #[msg("Предложение уже исполнено на бирже.")]
    ProposalAlreadyExecuted,

    #[msg("Переполнение при вычислении финансовых параметров (Math overflow).")]
    MathOverflow,

    #[msg("Недопустимый статус корпоративного действия.")]
    InvalidActionStatus,

    #[msg("ISIN код облигации не может быть пустым или длиннее 16 символов (Invalid ISIN).")]
    InvalidIsin,

    #[msg("Заголовок предложения не может быть пустым или превышать 96 символов.")]
    InvalidProposalTitle,

    #[msg("Дата расчетов не может предшествовать дате фиксации реестра (Record Date).")]
    InvalidSettlementDate,

    #[msg("Попытка повторного использования голоса или несоответствие реестру (Vote Recycling prevented).")]
    VoteRecyclingForbidden,
}
