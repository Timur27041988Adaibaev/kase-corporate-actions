#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
KASE Automated Corporate Actions Terminal - Production Enterprise Server
Kazakhstan Stock Exchange (KASE) & Central Securities Depository (KCSD)
Solana Actions & Blinks Handler, ISO 20022 Engine & 3-Agent Oracle API
==============================================================================
"""

import http.server
import socketserver
import urllib.parse
import urllib.request
import base64
import json
import os
import sys
import hashlib
import time

PORT = int(os.environ.get("PORT", "8088"))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# ISO 20022 Schemas for KASE
ISO20022_TEMPLATES = {
    "seev031": {
        "title": "seev.031.002.10 - Corporate Action Notification",
        "docType": "seev.031.002.10",
        "xml": """<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:seev.031.002.10">
  <AppHdr>
    <MsgRef>KASE-KCSD-2026-SEEV031-001</MsgRef>
    <Fr>
      <OrgId><AnyBIC>DEMOKZKAXXX</AnyBIC></OrgId>
    </Fr>
    <To>
      <OrgId><AnyBIC>DEMOKZKAXXX</AnyBIC></OrgId>
    </To>
    <CreDt>2026-10-06T06:00:00Z</CreDt>
  </AppHdr>
  <CorpActnNtfctn>
    <NtfctnGnlInf>
      <CorpActnEvtId>CA-KZDEMO000001-2026-01</CorpActnEvtId>
      <EvtPrcgId>KCSD-PROC-DEMO</EvtPrcgId>
      <EvtTp>
        <Cd>INTR</Cd>
      </EvtTp>
      <MndtryVlntryEvtTp>
        <Cd>MAND</Cd>
      </MndtryVlntryEvtTp>
    </NtfctnGnlInf>
    <UndrlygScty>
      <FinInstrmId>
        <ISIN>KZDEMO000001</ISIN>
        <Desc>KASE Demo USD Bond 2026</Desc>
      </FinInstrmId>
    </UndrlygScty>
    <CorpActnDtls>
      <RcrdDt>2026-10-06T00:00:00Z</RcrdDt>
      <PmtDt>2026-10-06T12:00:00Z</PmtDt>
      <IntrstRate>10.00</IntrstRate>
      <Frqcy>SEMI</Frqcy>
      <Ccy>USDC</Ccy>
      <TtlAmnt>500000.00</TtlAmnt>
      <SolanaProgramId>MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr</SolanaProgramId>
    </CorpActnDtls>
  </CorpActnNtfctn>
</Document>""",
        "json": {
            "header": {
                "messageReference": "KASE-KCSD-2026-SEEV031-001",
                "senderBIC": "DEMOKZKAXXX",
                "receiverBIC": "DEMOKZKAXXX",
                "creationDate": "2026-10-06T06:00:00Z"
            },
            "notification": {
                "corporateActionEventId": "CA-KZDEMO000001-2026-01",
                "eventType": "INTR",
                "mandatoryVoluntary": "MAND",
                "isin": "KZDEMO000001",
                "securityDescription": "KASE Demo USD Bond 2026",
                "recordDate": "2026-10-06T00:00:00Z",
                "paymentDate": "2026-10-06T12:00:00Z",
                "annualCouponRate": "10.00%",
                "frequency": "Semi-Annual",
                "currency": "USDC",
                "totalPool": "$500,000.00",
                "solanaExecutionCluster": "Mainnet-Beta / Devnet"
            }
        }
    },
    "seev036": {
        "title": "seev.036.002.11 - Corporate Action Movement Confirmation",
        "docType": "seev.036.002.11",
        "xml": """<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:seev.036.002.11">
  <CorpActnMvmntConf>
    <MvmntGnlInf>
      <CorpActnEvtId>CA-KZDEMO000001-2026-01</CorpActnEvtId>
      <EvtTp><Cd>INTR</Cd></EvtTp>
      <SttlmDt>2026-10-06T06:15:00Z</SttlmDt>
      <SttlmSts><Cd>PEND</Cd></SttlmSts>
    </MvmntGnlInf>
    <UndrlygScty>
      <ISIN>KZDEMO000001</ISIN>
    </UndrlygScty>
    <CshMvmntDtls>
      <TtlSttldAmnt Ccy="USDC">500000.00</TtlSttldAmnt>
      <PtyId>KCSD-CUSTODY-POOL</PtyId>
      <OnChainVerification>
        <Network>Solana Blockchain</Network>
        <Program>MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr</Program>
        <FinalityStatus>NOT_VERIFIED</FinalityStatus>
      </OnChainVerification>
    </CshMvmntDtls>
  </CorpActnMvmntConf>
</Document>""",
        "json": {
            "movementGeneralInfo": {
                "eventId": "CA-KZDEMO000001-2026-01",
                "eventType": "INTR",
                "settlementDate": "2026-10-06T06:15:00Z",
                "settlementStatus": "NOT_EXECUTED"
            },
            "security": { "isin": "KZDEMO000001" },
            "settlementDetails": {
                "totalAmountSettled": "Illustrative only — no transfer executed",
                "holdersSettled": 0,
                "blockchainNetwork": "Solana",
                "settlementMechanism": "Not connected — no transfer executed",
                "zeroDoubleClaimGuaranteed": False
            }
        }
    },
    "seev004": {
        "title": "seev.004.002.08 - Meeting Instruction / Voting Ballot",
        "docType": "seev.004.002.08",
        "xml": """<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:seev.004.002.08">
  <MtgInstr>
    <MtgRefId>KASE-MEETING-PROP101</MtgRefId>
    <ISIN>KZDEMO000001</ISIN>
    <PrpslDtls>
      <PrpslId>101</PrpslId>
      <Titl>Restructuring: Coupon Increase from 10.0% to 12.5% p.a.</Titl>
      <QrmReq>5000</QrmReq>
      <Rslt>PEND</Rslt>
      <VtsFor>6000</VtsFor>
      <VtsAgnst>1200</VtsAgnst>
      <VtsAbstn>800</VtsAbstn>
    </PrpslDtls>
    <OnChainRegistry>
      <VoterRecordPDA>Canonical Ed25519 PDA Guard</VoterRecordPDA>
      <SybilAttackShield>ENABLED</SybilAttackShield>
    </OnChainRegistry>
  </MtgInstr>
</Document>""",
        "json": {
            "meetingInstruction": {
                "meetingReference": "KASE-MEETING-PROP101",
                "isin": "KZDEMO000001",
                "proposalId": 101,
                "proposalTitle": "Restructuring: Coupon Increase from 10.0% to 12.5% p.a.",
                "quorumThresholdBonds": 5000,
                "votesFor": 6000,
                "votesAgainst": 1200,
                "votesAbstain": 800,
                "status": "NOT_EXECUTED",
                "newCouponRate": "12.50% p.a. (1250 bps)",
                "onChainProof": "NOT_VERIFIED"
            }
        }
    }
}

# ==============================================================================
# ENTERPRISE DYNAMIC SOLANA BLINKS TRANSACTION BUILDER
# ==============================================================================
B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def b58decode(s: str) -> bytes:
    if not s or not isinstance(s, str):
        raise ValueError("Solana address cannot be empty")
    s_clean = s.strip()
    if not s_clean:
        raise ValueError("Solana address cannot be empty")
    val = 0
    for c in s_clean:
        idx = B58_ALPHABET.find(c)
        if idx == -1:
            raise ValueError(f"Invalid Base58 character '{c}' in address")
        val = val * 58 + idx
    full_bytes = bytearray()
    while val > 0:
        full_bytes.append(val & 0xFF)
        val >>= 8
    full_bytes.reverse()
    leading_zeros = 0
    for c in s_clean:
        if c == "1":
            leading_zeros += 1
        else:
            break
    res = bytes([0] * leading_zeros) + bytes(full_bytes)
    if len(res) != 32:
        raise ValueError(f"Invalid Solana public key length: expected 32 bytes, got {len(res)}")
    return res

def encode_compact_u16(val: int) -> bytes:
    out = bytearray()
    rem = val
    while True:
        elem = rem & 0x7F
        rem >>= 7
        if rem == 0:
            out.append(elem)
            break
        else:
            elem |= 0x80
            out.append(elem)
    return bytes(out)

_RPC_CACHE = {
    "blockhash": None,
    "blockhash_ts": 0.0,
    "fee": 15000,
    "fee_ts": 0.0,
}

def get_recent_blockhash(rpc_url="https://api.devnet.solana.com") -> str:
    """Return a fresh RPC blockhash or fail closed; never build transactions with a fake/expired hash."""
    now = time.time()
    if _RPC_CACHE["blockhash"] and now - _RPC_CACHE["blockhash_ts"] < 10.0:
        return _RPC_CACHE["blockhash"]
    req_body = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getLatestBlockhash",
        "params": [{"commitment": "confirmed"}]
    }).encode("utf-8")
    req = urllib.request.Request(
        rpc_url,
        data=req_body,
        headers={"Content-Type": "application/json", "User-Agent": "KASE-Terminal/4.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("error"):
            raise RuntimeError(data["error"].get("message", "Solana RPC returned an error"))
        bh = data["result"]["value"]["blockhash"]
        if not bh:
            raise RuntimeError("Solana RPC returned no recent blockhash")
        _RPC_CACHE["blockhash"] = bh
        _RPC_CACHE["blockhash_ts"] = now
        return bh
    except Exception as exc:
        raise RuntimeError(f"Unable to fetch a fresh Solana blockhash from {rpc_url}: {exc}") from exc

def get_recent_prioritization_fees(rpc_url="https://api.devnet.solana.com") -> int:
    """
    Sealevel 2026 Dynamic Priority Fee Estimation:
    Queries getRecentPrioritizationFees across recent slots on active Solana cluster.
    """
    fallback_microlamports = 15000
    now = time.time()
    if now - _RPC_CACHE["fee_ts"] < 15.0 and _RPC_CACHE["fee"] != fallback_microlamports:
        return _RPC_CACHE["fee"]
    try:
        req_body = json.dumps({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "getRecentPrioritizationFees",
            "params": [[]]
        }).encode("utf-8")
        req = urllib.request.Request(
            rpc_url,
            data=req_body,
            headers={"Content-Type": "application/json", "User-Agent": "KASE-Terminal/4.0"}
        )
        with urllib.request.urlopen(req, timeout=0.8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("result", [])
            if results and isinstance(results, list):
                fees = [item.get("prioritizationFee", 0) for item in results if isinstance(item, dict) and item.get("prioritizationFee", 0) > 0]
                if fees:
                    fees.sort()
                    median_fee = fees[len(fees) // 2]
                    val = max(5000, median_fee)
                    _RPC_CACHE["fee"] = val
                    _RPC_CACHE["fee_ts"] = now
                    return val
        _RPC_CACHE["fee_ts"] = now
        return fallback_microlamports
    except Exception:
        _RPC_CACHE["fee_ts"] = now
        return fallback_microlamports


def build_solana_memo_transaction(
    fee_payer_str: str,
    memo_payload: str,
    rpc_url="https://api.devnet.solana.com",
    tx_version="v0",
    priority_fee_micro_lamports=None,
    compute_unit_limit=80000
) -> str:
    """
    Builds a Solana Transaction in Wire Format (v0 Versioned Transaction by default).
    Supports 2024-2026 Sealevel Versioned Transaction Architecture (v0) & Dynamic Priority Fees.
    """
    payer_bytes = b58decode(fee_payer_str)
    memo_prog_bytes = b58decode("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
    blockhash_str = get_recent_blockhash(rpc_url)
    blockhash_bytes = b58decode(blockhash_str)

    if tx_version == "legacy":
        # Legacy wire format
        header = bytes([1, 0, 1])
        account_keys = encode_compact_u16(2) + payer_bytes + memo_prog_bytes
        prog_idx = bytes([1])
        ix_accounts = encode_compact_u16(1) + bytes([0])
        memo_bytes = memo_payload.encode("utf-8")
        ix_data = encode_compact_u16(len(memo_bytes)) + memo_bytes
        compiled_ix = prog_idx + ix_accounts + ix_data
        instructions = encode_compact_u16(1) + compiled_ix
        message = header + account_keys + blockhash_bytes + instructions
        signatures = encode_compact_u16(1) + (b"\x00" * 64)
        tx_bytes = signatures + message
        return base64.b64encode(tx_bytes).decode("ascii")

    # Solana Versioned Transaction (v0) Wire Format (2026 Sealevel Standard)
    compute_prog_bytes = b58decode("ComputeBudget111111111111111111111111111111")
    if priority_fee_micro_lamports is None:
        priority_fee_micro_lamports = get_recent_prioritization_fees(rpc_url)

    # 1. Message Header (1 signer, 0 readonly signed, 2 readonly unsigned)
    header = bytes([1, 0, 2])

    # 2. Account Keys: feePayer (0), memoProgram (1), computeBudgetProgram (2)
    account_keys = encode_compact_u16(3) + payer_bytes + memo_prog_bytes + compute_prog_bytes

    # 3. Compiled Instructions:
    # Instruction 0: ComputeBudget setComputeUnitPrice (prog 2, 0 accounts, tag 3 + u64 LE)
    ix0_prog_idx = bytes([2])
    ix0_accounts = encode_compact_u16(0)
    ix0_data = bytes([3]) + int(priority_fee_micro_lamports).to_bytes(8, byteorder="little")
    ix0 = ix0_prog_idx + ix0_accounts + encode_compact_u16(len(ix0_data)) + ix0_data

    # Instruction 1: ComputeBudget setComputeUnitLimit (prog 2, 0 accounts, tag 2 + u32 LE)
    ix1_prog_idx = bytes([2])
    ix1_accounts = encode_compact_u16(0)
    ix1_data = bytes([2]) + int(compute_unit_limit).to_bytes(4, byteorder="little")
    ix1 = ix1_prog_idx + ix1_accounts + encode_compact_u16(len(ix1_data)) + ix1_data

    # Instruction 2: Memo Instruction (prog 1, accounts [0], UTF-8 payload)
    ix2_prog_idx = bytes([1])
    ix2_accounts = encode_compact_u16(1) + bytes([0])
    memo_bytes = memo_payload.encode("utf-8")
    ix2_data = encode_compact_u16(len(memo_bytes)) + memo_bytes
    ix2 = ix2_prog_idx + ix2_accounts + ix2_data

    instructions = encode_compact_u16(3) + ix0 + ix1 + ix2
    address_table_lookups = encode_compact_u16(0)

    # Message v0 prefix: 0x80 (version mask 0x80 | 0)
    message = bytes([0x80]) + header + account_keys + blockhash_bytes + instructions + address_table_lookups
    signatures = encode_compact_u16(1) + (b"\x00" * 64)
    tx_bytes = signatures + message
    return base64.b64encode(tx_bytes).decode("ascii")

class KASEEnterpriseHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids, X-Action-Version"
        )
        self.send_header("Access-Control-Expose-Headers", "X-Action-Version, X-Blockchain-Ids")
        self.send_header("X-Action-Version", "2.1.3")
        self.send_header("X-Blockchain-Ids", "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG,solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9v")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")

    def end_headers(self):
        self.send_cors_headers()
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "healthy",
                "service": "kase-corporate-actions-terminal",
                "mode": "memo-attestation-prototype",
                "settlement": "not-executed-by-terminal",
            }).encode("utf-8"))
            return

        # 1. Solana Actions Specification: /actions.json and /.well-known/actions.json
        if path in ["/actions.json", "/.well-known/actions.json"]:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            data = {
                "rules": [
                    {"pathPattern": "/api/actions/**", "apiPath": "/api/actions/**"},
                    {"pathPattern": "/kase/**", "apiPath": "/api/actions/**"},
                    {"pathPattern": "/blinks/**", "apiPath": "/api/actions/**"}
                ]
            }
            self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))
            return

        # 2. Solana Action: Coupon Distribution Blink (/api/actions/coupon)
        if path == "/api/actions/coupon":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            blink_data = {
                "icon": "https://raw.githubusercontent.com/solana-developers/brand-assets/main/assets/solanaLogoMark.svg",
                "title": "KASE Demo: Coupon Memo Attestation (No Payout)",
                "description": "Creates a Solana Memo text record only. It does not transfer USDC or settle a coupon. The financial settlement Anchor instruction is not wired to this Blink.",
                "label": "Create Memo Record Only",
                "links": {
                    "actions": [
                        {
                            "label": "Create Coupon Memo Record",
                            "href": "/api/actions/coupon"
                        },
                        {
                            "label": "Parameterized Disbursement",
                            "href": "/api/actions/coupon?amount={amount}",
                            "parameters": [
                                {
                                    "name": "amount",
                                    "label": "Disbursement Amount in USDC (e.g. 500000)",
                                    "required": False
                                }
                            ]
                        }
                    ]
                }
            }
            self.wfile.write(json.dumps(blink_data, indent=2).encode("utf-8"))
            return

        # 3. Solana Action: Bond Maturity Redemption Blink (/api/actions/redemption)
        if path == "/api/actions/redemption":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            blink_data = {
                "icon": "https://raw.githubusercontent.com/solana-developers/brand-assets/main/assets/solanaLogoMark.svg",
                "title": "KASE Demo: Redemption Memo Attestation (No Burn)",
                "description": "Creates a Solana Memo text record only. It does not transfer principal USDC or burn bond tokens. The Anchor redemption instruction is not wired to this Blink.",
                "label": "Create Memo Record Only",
                "links": {
                    "actions": [
                        {
                            "label": "Create Redemption Memo Record",
                            "href": "/api/actions/redemption"
                        },
                        {
                            "label": "Batch Maturity Redemption",
                            "href": "/api/actions/redemption?bonds={bonds}",
                            "parameters": [
                                {
                                    "name": "bonds",
                                    "label": "Bond Units to Redeem (Max 10000)",
                                    "required": False
                                }
                            ]
                        }
                    ]
                }
            }
            self.wfile.write(json.dumps(blink_data, indent=2).encode("utf-8"))
            return

        # 4. Solana Action: Governance Voting Blink (/api/actions/vote)
        if path == "/api/actions/vote":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            blink_data = {
                "icon": "https://raw.githubusercontent.com/solana-developers/brand-assets/main/assets/solanaLogoMark.svg",
                "title": "KASE Governance: Restructuring Proposal #101",
                "description": "Creates a Memo text record for a stated choice only. It does not call the Anchor governance instruction or update proposal vote totals.",
                "label": "Create Memo Record Only",
                "links": {
                    "actions": [
                        {
                            "label": "Record FOR Choice in Memo",
                            "href": "/api/actions/vote?choice=for"
                        },
                        {
                            "label": "Record AGAINST Choice in Memo",
                            "href": "/api/actions/vote?choice=against"
                        },
                        {
                            "label": "Record ABSTAIN Choice in Memo",
                            "href": "/api/actions/vote?choice=abstain"
                        },
                        {
                            "label": "Submit Ballot with Decision Rationale",
                            "href": "/api/actions/vote?choice={choice}&rationale={rationale}",
                            "parameters": [
                                {
                                    "name": "choice",
                                    "label": "Ballot Choice (for / against / abstain)",
                                    "required": True
                                },
                                {
                                    "name": "rationale",
                                    "label": "Institutional Decision Rationale (Optional)",
                                    "required": False
                                }
                            ]
                        }
                    ]
                }
            }
            self.wfile.write(json.dumps(blink_data, indent=2).encode("utf-8"))
            return


        # 5. ISO 20022 Financial Engine Downloads (/api/iso20022/...)
        if path.startswith("/api/iso20022/"):
            schema_key = path.replace("/api/iso20022/", "").strip("/")
            fmt = query.get("format", ["xml"])[0].lower()
            if schema_key in ISO20022_TEMPLATES:
                template = ISO20022_TEMPLATES[schema_key]
                self.send_response(200)
                self.send_header("X-KASE-Data-Status", "illustrative-demo-only")
                if fmt == "json":
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Content-Disposition", f'attachment; filename="kase_{schema_key}.json"')
                    self.end_headers()
                    self.wfile.write(json.dumps(template["json"], indent=2).encode("utf-8"))
                else:
                    self.send_header("Content-Type", "application/xml; charset=utf-8")
                    self.send_header("Content-Disposition", f'attachment; filename="kase_{schema_key}.xml"')
                    self.end_headers()
                    self.wfile.write(template["xml"].encode("utf-8"))
                return
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"Unknown ISO 20022 schema identifier.")
                return

        # Oracle consensus is unavailable until independent, real data sources are configured.
        if path == "/api/oracle/consensus":
            self.send_response(503)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "UNAVAILABLE",
                "quorum": None,
                "consensusFingerprint": None,
                "oracles": [],
                "message": "Oracle consensus is not configured. No independent registry, AML, solvency, or entitlement providers are connected; approval must not be inferred."
            }, indent=2).encode("utf-8"))
            return

        # 7. System Health Endpoint (/api/health)
        if path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            health_data = {
                "status": "healthy",
                "version": "4.0.0",
                "service": "kase-solana-enterprise-terminal",
                "clusters": ["devnet", "mainnet-beta"],
                "actionsSpecVersion": "2.1.3",
                "iso20022Supported": ["seev.031.002.10", "seev.036.002.11", "seev.004.002.08"]
            }
            self.wfile.write(json.dumps(health_data, indent=2).encode("utf-8"))
            return

        # 404 for unknown Action endpoints
        if path.startswith("/api/actions/"):
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Action endpoint not found."}).encode("utf-8"))
            return

        # Default static file handler
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Check action endpoints first before checking body
        if path.startswith("/api/actions/") and path not in [
            "/api/actions/coupon",
            "/api/actions/redemption",
            "/api/actions/vote",
        ]:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Action endpoint not found."}).encode("utf-8"))
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except (ValueError, TypeError):
            content_length = 0

        if content_length <= 0:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Invalid request: 'account' field is required."}).encode("utf-8"))
            return

        body_bytes = self.rfile.read(content_length)
        try:
            payload = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Invalid request: 'account' field is required."}).encode("utf-8"))
            return

        if not isinstance(payload, dict) or "account" not in payload:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Invalid request: 'account' field is required."}).encode("utf-8"))
            return

        account = payload.get("account")
        if not account or not isinstance(account, str):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Invalid request: 'account' field is required."}).encode("utf-8"))
            return

        try:
            b58decode(account)
        except ValueError as err:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": f"Invalid Solana account address: {str(err)}"}).encode("utf-8"))
            return

        tx_version = query.get("version", [payload.get("version", "v0")])[0]
        if tx_version not in ["v0", "legacy"]:
            tx_version = "v0"

        if path == "/api/actions/coupon":
            amount_str = query.get("amount", [str(payload.get("amount", "500000"))])[0]
            memo_payload = f"KASE_DEMO_MEMO_ONLY | REQUESTED_ACTION=COUPON | AMOUNT_REFERENCE={amount_str}_USDC | ISIN=KZDEMO000001 | RECIPIENT={account} | EXECUTION=NOT_PERFORMED"
            try:
                tx_base64 = build_solana_memo_transaction(account, memo_payload, tx_version=tx_version)
            except (RuntimeError, ValueError) as err:
                self.send_response(503)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "UNAVAILABLE",
                    "message": f"Cannot prepare a valid transaction because Solana RPC is unavailable: {err}"
                }).encode("utf-8"))
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            res = {
                "transaction": tx_base64,
                "message": f"Memo attestation prepared for {account[:8]}... only; no USDC transfer or coupon settlement is performed.",
                "links": {
                    "next": {
                        "type": "inline",
                        "action": {
                            "title": "KASE CSD Coupon Settlement Receipt",
                            "description": "Memo attestation only. This transaction does not transfer USDC, settle a coupon, or write to a KCSD ledger.",
                            "icon": "https://raw.githubusercontent.com/solana-developers/brand-assets/main/assets/solanaLogoMark.svg",
                            "label": "Memo Attestation Only"
                        }
                    }
                }
            }
            self.wfile.write(json.dumps(res, indent=2).encode("utf-8"))
            return

        if path == "/api/actions/redemption":
            bonds_str = query.get("bonds", [str(payload.get("bonds", "10000"))])[0]
            memo_payload = f"KASE_DEMO_MEMO_ONLY | REQUESTED_ACTION=REDEMPTION_AND_BURN | AMOUNT_REFERENCE=10000000_USDC | ISIN=KZDEMO000001 | RECIPIENT={account} | EXECUTION=NOT_PERFORMED"
            tx_base64 = build_solana_memo_transaction(account, memo_payload, tx_version=tx_version)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            res = {
                "transaction": tx_base64,
                "message": f"Memo attestation prepared for {account[:8]}... only; no token burn or principal transfer is performed.",
                "links": {
                    "next": {
                        "type": "inline",
                        "action": {
                            "title": "KASE CSD Maturity Redemption Receipt",
                            "description": "Memo attestation only. This transaction does not burn bond tokens or transfer principal USDC.",
                            "icon": "https://raw.githubusercontent.com/solana-developers/brand-assets/main/assets/solanaLogoMark.svg",
                            "label": "Memo Attestation Only"
                        }
                    }
                }
            }
            self.wfile.write(json.dumps(res, indent=2).encode("utf-8"))
            return

        if path == "/api/actions/vote":
            choice = query.get("choice", ["for"])[0].lower()
            if choice not in ["for", "against", "abstain"]:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"message": f"Invalid voting choice '{choice}'. Must be one of: for, against, abstain."}).encode("utf-8"))
                return

            rationale = query.get("rationale", [str(payload.get("rationale", ""))])[0]
            rationale_suffix = f" | Rationale: {rationale[:40]}" if rationale else ""
            memo_payload = f"KASE_DEMO_MEMO_ONLY | REQUESTED_ACTION=GOVERNANCE_VOTE | CHOICE_INTENT={choice.upper()} | PROPOSAL_ID=101 | VOTER={account}{rationale_suffix} | EXECUTION=NOT_PERFORMED"
            tx_base64 = build_solana_memo_transaction(account, memo_payload, tx_version=tx_version)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            res = {
                "transaction": tx_base64,
                "message": f"Memo attestation prepared for voter {account[:8]}... only; the governance program does not count this as a vote.",
                "links": {
                    "next": {
                        "type": "inline",
                        "action": {
                            "title": "KASE Governance Ballot Attestation",
                            "description": f"Memo attestation only for choice {choice.upper()}; no Anchor program instruction or on-chain vote tally is executed.",
                            "icon": "https://raw.githubusercontent.com/solana-developers/brand-assets/main/assets/solanaLogoMark.svg",
                            "label": "Memo Attestation Only"
                        }
                    }
                }
            }
            self.wfile.write(json.dumps(res, indent=2).encode("utf-8"))
            return

        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"message": "Action endpoint not found."}).encode("utf-8"))

def run_server():
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("", PORT), KASEEnterpriseHandler) as httpd:
        print(f"KASE Automated Corporate Actions Enterprise Server running at http://localhost:{PORT}")
        print(f"Solana Actions (Blinks) specification live at http://localhost:{PORT}/actions.json")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server cleanly...")

if __name__ == "__main__":
    run_server()
