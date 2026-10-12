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

    def test_base58_zero_address_decodes_to_32_bytes(self):
        self.assertEqual(kase_server.b58decode("11111111111111111111111111111111"), bytes(32))


if __name__ == "__main__":
    unittest.main()
