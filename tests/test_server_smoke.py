import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "terminal"))
import server as kase_server


class KaseServerSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), kase_server.KASEEnterpriseHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.httpd.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join(timeout=2)

    def test_health_endpoint_reports_service_health(self):
        with urllib.request.urlopen(self.base_url + "/api/health", timeout=2) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertEqual(payload.get("status"), "healthy")
        self.assertIn("service", payload)

    def test_chain_status_checks_real_rpc_and_never_claims_settlement(self):
        rpc_result = {"result": {"value": {"executable": True}}}
        mock_response = type("MockResponse", (), {
            "__enter__": lambda self: self,
            "__exit__": lambda self, *args: False,
            "read": lambda self: json.dumps(rpc_result).encode("utf-8"),
        })()
        real_urlopen = urllib.request.urlopen
        def mocked_urlopen(request, *args, **kwargs):
            url = request if isinstance(request, str) else request.full_url
            if url == "https://api.devnet.solana.com":
                return mock_response
            return real_urlopen(request, *args, **kwargs)
        with patch.object(kase_server.urllib.request, "urlopen", side_effect=mocked_urlopen):
            with real_urlopen(self.base_url + "/api/chain-status", timeout=2) as response:
                payload = json.loads(response.read().decode("utf-8"))
        self.assertEqual(payload.get("status"), "PROGRAM_DEPLOYED")
        self.assertTrue(payload.get("rpc_verified"))
        self.assertFalse(payload.get("settlement_executed"))
        self.assertEqual(payload.get("settlement_integration"), "not-connected-to-browser-terminal")

    def test_oracle_endpoint_does_not_claim_fake_consensus(self):
        request = urllib.request.Request(self.base_url + "/api/oracle/consensus")
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(request, timeout=2)
        self.assertEqual(ctx.exception.code, 503)
        payload = json.loads(ctx.exception.read().decode("utf-8"))
        self.assertEqual(payload.get("status"), "UNAVAILABLE")
        self.assertEqual(payload.get("oracles"), [])

    def test_blockhash_failure_fails_closed(self):
        with patch.object(kase_server.urllib.request, "urlopen", side_effect=OSError("RPC offline")):
            kase_server._RPC_CACHE["blockhash"] = None
            kase_server._RPC_CACHE["blockhash_ts"] = 0
            with self.assertRaisesRegex(RuntimeError, "Unable to fetch a fresh Solana blockhash"):
                kase_server.get_recent_blockhash("https://rpc.invalid")

    def test_action_endpoint_returns_503_when_rpc_blockhash_is_unavailable(self):
        body = json.dumps({"account": "11111111111111111111111111111111"}).encode("utf-8")
        request = urllib.request.Request(
            self.base_url + "/api/actions/coupon",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with patch.object(kase_server, "get_recent_blockhash", side_effect=RuntimeError("RPC offline")):
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                urllib.request.urlopen(request, timeout=2)
        self.assertEqual(ctx.exception.code, 503)
        payload = json.loads(ctx.exception.read().decode("utf-8"))
        self.assertEqual(payload.get("status"), "UNAVAILABLE")

    def test_all_action_endpoints_fail_closed_when_transaction_cannot_be_prepared(self):
        for route, payload in [
            ("/api/actions/coupon", {"account": "11111111111111111111111111111111"}),
            ("/api/actions/redemption", {"account": "11111111111111111111111111111111"}),
            ("/api/actions/vote", {"account": "11111111111111111111111111111111"}),
        ]:
            with self.subTest(route=route):
                request = urllib.request.Request(
                    self.base_url + route,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with patch.object(kase_server, "build_solana_memo_transaction", side_effect=RuntimeError("RPC offline")):
                    with self.assertRaises(urllib.error.HTTPError) as ctx:
                        urllib.request.urlopen(request, timeout=2)
                self.assertEqual(ctx.exception.code, 503)
                response = json.loads(ctx.exception.read().decode("utf-8"))
                self.assertEqual(response.get("status"), "UNAVAILABLE")

    def test_invalid_amount_and_redemption_count_are_rejected(self):
        for route, query, payload in [
            ("/api/actions/coupon?amount=-1", {}, {"account": "11111111111111111111111111111111"}),
            ("/api/actions/redemption?bonds=10001", {}, {"account": "11111111111111111111111111111111"}),
        ]:
            with self.subTest(route=route):
                request = urllib.request.Request(
                    self.base_url + route,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with patch.object(kase_server, "build_solana_memo_transaction") as build:
                    with self.assertRaises(urllib.error.HTTPError) as ctx:
                        urllib.request.urlopen(request, timeout=2)
                self.assertEqual(ctx.exception.code, 400)
                build.assert_not_called()

    def test_base58_zero_address_decodes_to_32_bytes(self):
        self.assertEqual(kase_server.b58decode("11111111111111111111111111111111"), bytes(32))


if __name__ == "__main__":
    unittest.main()
