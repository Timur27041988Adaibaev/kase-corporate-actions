# KASE Automated Corporate Actions on Solana 🇰🇿⚡

> **Хакатон KASE (Kazakhstan Stock Exchange) & Superteam Kazakhstan**  
> Автоматизация корпоративных действий для токенизированных финансовых инструментов (RWA) на блокчейне Solana.  
> **Институциональная архитектура — Функциональная реализация и верификация**

---

## 🏛 Обзор проекта

Проект представляет собой институциональную платформу для автоматизации жизненного цикла ценных бумаг (облигаций) Казахстанской фондовой биржи (KASE) и Центрального Депозитария Ценных Бумаг РК (KCSD / Central Securities Depository).

Реализован полный сквозной цикл корпоративных действий:
$$\text{Идентификация держателей} \longrightarrow \text{Расчет прав (Entitlements)} \longrightarrow \text{Ончейн-исполнение} \longrightarrow \text{Неизменяемый аудит KASE}$$

---

## 💎 Параметры тестового финансового инструмента (KASE Benchmark Bond)

| Параметр | Значение | Описание |
| :--- | :--- | :--- |
| **ISIN** | `KZDEMO000001` | Международный идентификационный номер ценной бумаги |
| **Наименование** | `KASE Demo USD Bond 2026` | Облигации Demo Issuer JSC |
| **Номинальная стоимость** | **$1,000.00 USDC** | Номинал одной облигации ($1,000 с 6 десятичными знаками) |
| **Купонная ставка** | **10.00% годовых** | 1,000 базисных пунктов (bps) |
| **Периодичность выплат** | **2 раза в год (Полугодовая)** | Payout Frequency = Semi-Annual ($50.00 на облигацию) |
| **Объем выпуска** | **10,000 облигаций** | Суммарный объем эмиссии: **$10,000,000 USD** |
| **Дата погашения** | **2026-12-31** | Срок полного погашения номинала |
| **Расчетная валюта** | **USDC / Цифровой Тенге** | SPL Token (6 decimals) |
| **Депозитарий** | **KCSD / AIX CSD** | Центральный депозитарий Республики Казахстан |

---

## 🚀 Реализация 3 обязательных сценариев

### Сценарий 1: Выплата купонного дохода (Coupon Payment Settlement)
1. **Фиксация реестра (Record Date Snapshot):** На дату фиксации реестра ончейн-программа считывает балансы держателей.
2. **Расчет прав (Entitlement Engine):**  
   $$\text{Купон} = \frac{\text{BondsHeld} \times \text{FaceValue} \times \text{RateBps}}{10000 \times \text{Frequency}} = \frac{\text{BondsHeld} \times \$1000 \times 1000}{10000 \times 2} = \text{BondsHeld} \times \$50.00$$
   - Для эмиссии 10,000 облигаций общий объем купонного пула составляет **$500,000.00 USDC**.
3. **Депонирование средств эмитентом:** Эмитент пополняет хранилище `CorporateAction` PDA на $500,000.
4. **Ончейн-расчет (Settlement):** Программа через CPI осуществляет прямые переводы на счета инвесторов. Статус меняется на `is_settled = true`, исключая риск повторного списания (Double-Claim Attack).

### Сценарий 2: Погашение номинала облигаций (Bond Redemption & Token Burn)
1. **Проверка наступления срока погашения (Maturity Check):** Программа валидирует наступление даты погашения через `Clock::get()?.unix_timestamp`. Для бенчмарк-инструмента `KZDEMO000001` дата погашения установлена на 2026-12-31. Если ончейн-проверка `Clock::get()?.unix_timestamp >= maturity_timestamp` блокирует исполнение в живом Devnet до наступления срока обращения, используется второй тестовый инструмент `KZDEMO000002` со сроком погашения на несколько минут вперед (short maturity test bond), позволяющий полностью валидировать цикл погашения и сжигания токенов на Devnet.
2. **Расчет номинала к возврату:**  
   $$\text{Principal} = \text{BondsHeld} \times \text{FaceValue} = \text{BondsHeld} \times \$1,000.00$$
   - Полный объем пула погашения: **$10,000,000.00 USDC**.
3. **Сжигание токенов (Token Burn / Retirement):** Облигационные SPL-токены инвесторов безвозвратно сжигаются через `token::burn` CPI, гарантируя исключение реэмиссии.
4. **Выплата номинала:** Из PDA-хранилища на кошельки держателей перечисляются $1,000 за каждую облигацию. `active_supply` уменьшается до 0, облигация помечается как погашенная (`is_matured = true`).

### Сценарий 3: Голосование держателей облигаций (Bondholder Governance)
1. **Инициация предложения:** Создание ончейн-предложения (*Предложение №101: Реструктуризация условий — повышение ставки купона до 12.5% годовых и продление срока обращения*).
2. **Голосование с весом позиции:** Держатели голосуют («ЗА», «ПРОТИВ», «ВОЗДЕРЖАЛСЯ») с весом, равным количеству облигаций (1 облигация = 1 голос):
   - Bank A (3,500) + Bank B (2,500) = **6,000 голосов «ЗА» (60%)**
   - Bank D = **1,200 голосов «ПРОТИВ» (12%)**
   - Retail Pool = **800 голосов «ВОЗДЕРЖАЛСЯ» (8%)**
   - Broker C (2,000) = **не участвует в голосовании**
3. **Защита от двойного голосования:** Аккаунт `VoterRecord` PDA на базе `[b"voter", proposal.key(), voter.key()]` блокирует повторные голоса.
4. **Подведение итогов и кворум:** Проверка достижения порога кворума (5,000 облигаций = 50%). При победе голосов «ЗА» (6,000 ЗА против 1,200 ПРОТИВ) резолюция фиксируется в реестре Solana с автоматическим динамическим пересчетом всех купонов в терминале с $50.00 до $62.50.

---

## ⚖️ Реализовано ончейн vs Симулировано (Implemented vs Simulated)

Для прозрачности оценки жюри хакатона ниже приведено строгое сопоставление функционала, реализованного непосредственно в ончейн-программе Solana (Anchor Framework), и компонентов интеграционного / симуляционного уровня:

| Компонент / Операция | Implemented in Anchor program (code) | Симулировано / Офчейн-сервисы | Примечания реализации |
| :--- | :---: | :---: | :--- |
| **Devnet deployment of the program** | ✅ **Deployed & executed on Devnet** | — | Program ID `5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz`; all 3 scenarios + attack rejections run as real txs (see Live Devnet Deployment). Mainnet: not deployed. |
| **Регистрация инструмента (`BondSecurity`)** | ✅ **Реализовано ончейн** | — | PDA `[b"bond", isin]`, валидация ISIN (12 байт), номинал, ставка, даты |
| **Планирование корпоративного действия (`CorporateAction`)** | ✅ **Реализовано ончейн** | — | PDA `[b"action", bond_key, id]`, проверка неистекшей даты погашения |
| **Снимок балансов держателей (`HolderEntitlement`)** | ✅ **Реализовано ончейн** | — | PDA `[b"entitlement", action_key, holder]`, фиксирует объем прав |
| **Депонирование пула средств в Escrow Vault** | ✅ **Реализовано ончейн** | — | PDA-хранилище, пополнение через SPL Token Transfer |
| **Выплата купонного дохода (DvP)** | ✅ **Реализовано ончейн** | — | Атомарный CPI трансфер из Vault инвестору, отметка `is_settled = true` |
| **Защита от двойного списания (Double-Claim)** | ✅ **Реализовано ончейн** | — | Строгий `require!(!entitlement.is_settled, KaseError::AlreadySettled)` |
| **Погашение номинала и сжигание (Token Burn)** | ✅ **Реализовано ончейн** | — | Проверка Clock sysvar $\ge$ maturity, CPI `token::burn`, перевод номинала |
| **Управление и голосование (`GovernanceProposal`)** | ✅ **Реализовано ончейн** | — | Предложение #101, учет голосов ЗА/ПРОТИВ/ВОЗДЕРЖАЛСЯ, проверка кворума |
| **Защита от повторного голосования (Double-Vote)** | ✅ **Реализовано ончейн** | — | Коллизия PDA `[b"voter", proposal_key, voter_key]` в Sealevel |
| **Динамический пересчет параметров инструмента** | ✅ **Реализовано ончейн** | — | Запись новой ставки (12.5%) в `BondSecurity.annual_coupon_bps` при принятии |
| **Бродкаст транзакций в Solana Devnet & Mainnet** | — | ✅ **Solana Memo Program** | Uses the official Solana Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`). Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz). |
| **Mainnet Record Policy** | — | ✅ **Official Memo Program** | Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz). |
| **Первичная выгрузка реестра из KCSD** | — | ⚙️ **Симулировано** | Формат снимка KCSD (5 институциональных участников: Bank A-D, Retail Pool) |
| **Фиатные межбанковские расчеты (Fiat Payments)** | — | ⚙️ **Симулировано** | Традиционные расчеты через платежную систему Национального Банка РК / KZT фиатный клиринг (симулировано; ончейн расчеты выполняются в test USD / SPL stablecoin) |
| **Динамический конструктор Blinks (`server.py`)** | — | ⚙️ **Интеграция** | HTTP API спецификации Dialect Actions (`/actions.json`, `/api/actions/*`) |
| **Экспорт регуляторных сообщений ISO 20022** | — | ⚙️ **Интеграция** | Генератор XML/JSON (`seev.031`, `seev.036`, `seev.004`) для бэк-офиса KCSD |
| **3-Agent Pre-Flight Oracle Consensus** | — | ⚙️ **Симулировано** | Предварительная проверка санкций (AML), мат-инвариантов и ликвидности |

> ⚠️ **Important Mainnet Invariant:** Mainnet: Memo Program records only. KASE program: deployed on Devnet (5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz).


---

## 🌟 Архитектурные уровни платформы

1. **Dual-Cluster Engine (Solana Devnet & Mainnet-Beta):**
   - Мгновенное переключение сетей без перезагрузки интерфейса.
   - Независимые машины состояний (`clusterStates`) для каждой сети.
   - Поддержка пользовательских RPC (Helius, QuickNode, Triton, Ankr).
   - Расчет и отображение реальных комиссий сети на Mainnet.

2. **Solana Actions & Blinks (Dialect Specification):**
   - Полная спецификация `/actions.json` и API эндпоинты `/api/actions/coupon`, `/api/actions/redemption`, `/api/actions/vote`.
   - Поддержка стандартов CORS и `X-Action-Version: 2.1.3`.
   - Возможность голосовать и получать выплаты прямо из Twitter/X, Telegram или Discord.
   - Интерактивная витрина Blinks в терминале с кнопкой копирования ссылок `dial.to`.

3. **3-Agent Pre-Flight Oracle Consensus:**
   - **Оракул 1 (AML & Sanctions):** Проверка БИН участников и скрининг санкционных списков.
   - **Оракул 2 (Formal Math Invariants):** Доказательство сохранения баланса $\sum E_i \equiv \text{PoolAmount}$.
   - **Оракул 3 (Solvency & Velocity):** Проверка ликвидности PDA-хранилища и скорости блоков Solana.
   - Криптографический аттестат со статусом 3/3 APPROVED перед трансляцией в сеть.

4. **ISO 20022 Financial MX Regulatory Engine:**
   - Стандартизированные банковские форматы SWIFT / Euroclear / KCSD.
   - `seev.031.002.10` — Corporate Action Notification.
   - `seev.036.002.11` — Corporate Action Movement Confirmation.
   - `seev.004.002.08` — Meeting Instruction / Voting Ballot.
   - Однокликовая выгрузка в `.xml` и `.json` форматах.

5. **Enterprise Chaos Engineering & Adversarial Shield:**
   - Панель живых испытаний смарт-контракта на 4 вектора атак:
     - Replay Double-Claim Attack $\rightarrow$ Блокировка `AlreadySettled`.
     - Sybil Double-Voting $\rightarrow$ Блокировка коллизией `VoterRecord PDA`.
     - Arithmetic Overflow $\rightarrow$ Перехват `Checked Math`.
     - RPC Failure $\rightarrow$ Circuit Breaker автоматический фейловер.

6. **Priority Fee & Sealevel Compute Budget:**
   - Селектор приоритета (Normal 0 µL / Fast +10k µL / Turbo +50k µL).
   - Инъекция инструкций `ComputeBudgetProgram.setComputeUnitPrice` и `setComputeUnitLimit`.

7. **Raycast / Linear Keyboard-First DX & Web Audio:**
   - Горячие клавиши: `1` (Купон), `2` (Погашение), `3` (Голос ЗА), `4` (Голос ПРОТИВ), `C` (Сеть), `O` (Оракул), `I` (ISO), `B` (Blinks), `R` (Сброс), `?` (Справка), `Esc` (Закрыть).
   - Синтезированный Web Audio тактильный отклик (щелчки, аккорды подтверждения, предупреждения).

---

## 📂 Структура репозитория

```
kase_corporate_actions/
├── Anchor.toml                              # Конфигурация Anchor Solana Localnet/Devnet/Mainnet
├── Cargo.toml                               # Корневой манифест Rust Workspace
├── package.json                             # Зависимости TypeScript / Mocha / Chai
├── tsconfig.json                            # TypeScript конфигурация
├── programs/
│   └── kase_corporate_actions/
│       ├── Cargo.toml                       # Манифест Anchor-программы
│       └── src/
│           ├── lib.rs                       # Ончейн-инструкции, CPI и контексты
│           ├── state.rs                     # Состояния PDA (BondSecurity, CorporateAction, etc.)
│           ├── errors.rs                    # Коды ошибок биржевого уровня
│           ├── events.rs                    # Ончейн-события для CSD и индексёров
│           └── math.rs                      # Математический движок расчета прав (Fixed-point)
├── src/
│   └── entitlement_engine.ts                # TypeScript движок расчета прав и кворума
├── tests/
│   └── kase_corporate_actions.test.ts       # Интеграционные и адверсориальные тесты
├── scripts/
│   └── verify_settlement_flow.ts            # E2E скрипт проверки всех 3 сценариев с Explorer-ссылками
├── terminal/                                # Институциональный биржевой терминал KASE
│   ├── index.html                           # Bloomberg/Refinitiv стиль веб-терминала
│   ├── style.css                            # KASE Emerald / Kazakhstan Gold / Dark Slate UI
│   ├── app.js                               # Контроллер терминала, Web3 движок и Blinks
│   ├── server.py                            # Python сервер с поддержкой Blinks, ISO 20022 и CORS
│   └── actions.json                         # Спецификация Dialect Solana Actions
├── verify.py                                # Автономный мастер-тест 8/8 направлений аудита
├── HACKATHON_SUBMISSION.md                  # Полная заявка на хакатон KASE x Superteam
└── README.md                                # Данный документ
```

---

## 🧪 Запуск и проверка под ключ

### 1. Запуск мастер-аудитора системы (8/8 проверок):
```bash
python verify.py
```
*(Все 8 сьютов проходят со статусом PASS, Exit Code: 0).*

### 2. Запуск серверного терминала:
```bash
python terminal/server.py
```
Откройте в браузере: **`http://localhost:8088`** *(нажмите `Ctrl + F5`)*.

---

## 👥 Команда & Благодарности
Разработано для хакатона **KASE (Kazakhstan Stock Exchange)** и **Superteam Kazakhstan**.  
*Надежность и верификация: рабочий код и комплексные тесты.*


## Live Devnet Deployment (verified)

- **Program ID:** [`5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz`](https://explorer.solana.com/address/5sbnpE6Q3kXTKTbvBoxHL94H82qSxKaZ3F9WhpwsHCiz?cluster=devnet)
- **Deploy tx:** [4u96WS31…](https://explorer.solana.com/tx/4u96WS31cUb7wozMADQhJMfej7gUN3jP3uoDGxkLFbPAGWZPhoKtKPcjr7kckPaarGhKLL4q5ADoe7RWC9ZWRVY8?cluster=devnet)
- **Demo bond:** `KZDEMO749442` → [`iA5gqu2fndMLJGX986gNcnq9a849q3Xapwu1iRvaMSs`](https://explorer.solana.com/address/iA5gqu2fndMLJGX986gNcnq9a849q3Xapwu1iRvaMSs?cluster=devnet)
- **Final on-chain state:** coupon 12.50% (after vote), active supply 0, matured, bond mint supply 0; holders received 63,000 / 31,500 / 10,500 demo-USDC.

| Шаг | Результат | Транзакция |
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
| ATTACK: double coupon claim holder 1 (must be rejected: AlreadySettled) | 🛡 отклонено | [5pJU8Ay7…](https://explorer.solana.com/tx/5pJU8Ay7nqLAQrqqSz8e2qc562u532ge6pCrVDSrBJswp3yuRoFtNZ55VvqDc8U5aBe5ZGUGehxHdMZaSrRTq6Bn?cluster=devnet) |
| ATTACK: holder 3 tries to schedule an action (must be rejected: UnauthorizedAuthority) | 🛡 отклонено | [3EHKKsHt…](https://explorer.solana.com/tx/3EHKKsHtM2bnPmPXrgBf1PL4QiToBxdcn4TSL3FJRVkghH5hvt2Cq97H5ceuSbW79LD6yQHFUbXdrzVpXz9omDFg?cluster=devnet) |
| 3.1 schedule_corporate_action #3 GovernanceVoting (record date) | ✅ OK | [4yjuhzAJ…](https://explorer.solana.com/tx/4yjuhzAJuq1nRqm1K3g6JgWGQxhFSg3TABoeqLatCynRZ54hJZXGYmkuc7Gfv6KjDJNfJATBAEGBfjDpXeiaYGYR?cluster=devnet) |
| 3.2 record_holder_snapshot holder 1 (60 bonds) | ✅ OK | [TarTZ52f…](https://explorer.solana.com/tx/TarTZ52fQn97cc24ZPv7NYFELBC8CVkLu5a3F3k8QiwTGTeTpgBvpGpZyLcGSpbm29i9Zyr1p5poTAMwQbzHKVN?cluster=devnet) |
| 3.2 record_holder_snapshot holder 2 (30 bonds) | ✅ OK | [qfBshBfi…](https://explorer.solana.com/tx/qfBshBfitr3gT1dpRRj4hCDWqHsg6vXQabTH78HpzNzQLgvMTJVm1DxFraxnYRxhePFH1Ce5Df9JgVJjoNGrvLL?cluster=devnet) |
| 3.2 record_holder_snapshot holder 3 (10 bonds) | ✅ OK | [5ABFWYmF…](https://explorer.solana.com/tx/5ABFWYmFzuWKzUTSxXftoaumGFaxUv2hcbBVqjZrgHU6fVRMyjEPtW6PDuH2rkfShx7GJGNB1ucj78Le5Gvv2w1R?cluster=devnet) |
| 3.3 create_governance_proposal #101: raise coupon 10% -> 12.5%, quorum 51 | ✅ OK | [56HCGCKm…](https://explorer.solana.com/tx/56HCGCKm4ZnUiHd9DwL4UfsETugwHpqszpCiFeQ3vEuWSg6qiK5qVGW3T4jiuKo25kEgjKL9aa8vaEFipJBPGmAH?cluster=devnet) |
| 3.4 cast_bondholder_vote holder 1: For (weight 60) | ✅ OK | [2jLorUxe…](https://explorer.solana.com/tx/2jLorUxeG8ebD531Jctv9PLFCyeUVgYaH1LrYuhJKqvhAKQJSa5RKkDK3mZw1VtXckCjJLKDdzHpo6Hm5QHXqoo7?cluster=devnet) |
| 3.4 cast_bondholder_vote holder 2: Against (weight 30) | ✅ OK | [3c1MwH8p…](https://explorer.solana.com/tx/3c1MwH8pEMF788XuSx4sJXYK1jfX9S5cn4qF6AXH9mDYFY6QoJW9vnKA9sZRXacw9ND8hhkvFx2PV1eGLxARa5XW?cluster=devnet) |
| 3.4 cast_bondholder_vote holder 3: Abstain (weight 10) | ✅ OK | [5X6L1rV8…](https://explorer.solana.com/tx/5X6L1rV8LwpFjDXBUZwBxUj98EqHNUWfCnBNAXGiyNg3VWc6gH1aRErhfErzEYjusZbh7Ma238s6tLc94DSkGkbe?cluster=devnet) |
| ATTACK: holder 1 votes twice (must be rejected: voter record exists) | 🛡 отклонено | [3ond4Abv…](https://explorer.solana.com/tx/3ond4AbvZPtJxx4tC4Y8xUBUakDZSSYVGShGFYz9zPQJvXpJN4JbUV9PhLukN5wx2KBLnqBouwmsALGfnqRWrw2z?cluster=devnet) |
| 3.5 finalize_governance_proposal #101 (60 for / 30 against / 10 abstain) | ✅ OK | [3Lx15aoW…](https://explorer.solana.com/tx/3Lx15aoWpzxkDaQL3fphVsJzAJnCYhroC13mXkbQMjoYEUNi8X3F2CEAPNjiTgECnMhq9AqcVhVziswTFyRCqJww?cluster=devnet) |
| 4.1 schedule_corporate_action #2 BondRedemption | ✅ OK | [5YwBBJ8y…](https://explorer.solana.com/tx/5YwBBJ8yzwHXA8EAV52KXdEa6H1pai1WosgM5hjiZvjetqrEnJnaGCKviJ8SSaAiZeNe3a3wZYV5gRucLopvoWYJ?cluster=devnet) |
| 4.2 record_holder_snapshot holder 1 (60 bonds) | ✅ OK | [2dNBgsnh…](https://explorer.solana.com/tx/2dNBgsnhTRgCWnTU8uwSoBisMh4v5P1BNGzx7KfRyhDC4DR9ADo4ahptrAtN478LNkw8iZHkfkvJjCWSo8N8pU3f?cluster=devnet) |
| 4.2 record_holder_snapshot holder 2 (30 bonds) | ✅ OK | [2NC36xrz…](https://explorer.solana.com/tx/2NC36xrzPRrRP6MkMhfmhVFf34efsY7zKfEqbdzbbxyGSczrotLHHqwYHdbHJ84N7xvGVxi8mWQwFYjxzbLdQEVg?cluster=devnet) |
| 4.2 record_holder_snapshot holder 3 (10 bonds) | ✅ OK | [hxE4aiL9…](https://explorer.solana.com/tx/hxE4aiL9s2XF1psAva5iTJYz1TpQQsHdSridLjnZcJyRHmT1jNTvuxgs5daWyU7sXPgVqJnKooxMzTpfqttxfYA?cluster=devnet) |
| 4.3 deposit_action_vault 100000 USDC | ✅ OK | [2FNf9ijV…](https://explorer.solana.com/tx/2FNf9ijVhJwvGPAHQqYpd3ws764cHUrHaSd9yLBuccr2ZvouJ1RSBiF8yLrTEevB6Bp279CEdbZE5j9SArqMGVfc?cluster=devnet) |
| 4.4 execute_bond_redemption holder 1: burn 60 bonds, pay 60000 USDC | ✅ OK | [RkEuxZVt…](https://explorer.solana.com/tx/RkEuxZVtdfYCKf7ikQ9xYfyd5UrMq4xqGhfGZUn28jSLJHaZuny4jMvyWKcm1FtRwVftrt6MXy4cDqztMGzqfMv?cluster=devnet) |
| 4.4 execute_bond_redemption holder 2: burn 30 bonds, pay 30000 USDC | ✅ OK | [4sVSv1Kh…](https://explorer.solana.com/tx/4sVSv1Khv9LqXUvYHMR5SSqkHnCYS3w1q6NQRL5MGw2uN9jSMj2zDbsgSLUmZbrEaLiy9RQZftaTSC5M3riLj6S7?cluster=devnet) |
| 4.4 execute_bond_redemption holder 3: burn 10 bonds, pay 10000 USDC | ✅ OK | [w77unAEL…](https://explorer.solana.com/tx/w77unAEL1pUPEXNH9EWusdnFnTrguYu4tHxtGAhi57Pxh5jKRaPnS5XaexVKYK8jWCmaBbdm12eMRXwPntXUj52?cluster=devnet) |
| ATTACK: holder 1 redeems twice (must be rejected) | 🛡 отклонено | [122Yd9Xu…](https://explorer.solana.com/tx/122Yd9XuX3R6216L6cAvfQZtizt6NtVEFgAoEFeAaL8HPRFhV6b4WUS3qgMGSbGB2rdScZuBLNvjRcP95ofK3o9N?cluster=devnet) |
