#!/usr/bin/env python3
"""Boot the independent GrandTech Service Passport preview from its archived source."""
import base64
import io
import os
import pathlib
import sys
import zipfile
ROOT = pathlib.Path(__file__).resolve().parent
bundle = ROOT / "bundle.b64"
with zipfile.ZipFile(io.BytesIO(base64.b64decode(bundle.read_text().strip()))) as archive:
    expected = {"app.py", "static/", "static/app.js", "static/style.css"}
    found = set(archive.namelist())
    if not found.issubset(expected) or "app.py" not in found:
        raise RuntimeError("Unexpected preview bundle contents")
    archive.extractall(ROOT)
os.chdir(ROOT)
os.execv(sys.executable, [sys.executable, "-u", "app.py"])
