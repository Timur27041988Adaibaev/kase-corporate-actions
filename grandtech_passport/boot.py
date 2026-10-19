#!/usr/bin/env python3
"""Load GrandTech Passport original source and verified versioned upgrades."""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import zipfile
import zlib

ROOT = Path(__file__).resolve().parent
with zipfile.ZipFile(io.BytesIO(base64.b64decode((ROOT / 'bundle.b64').read_text()))) as archive:
    approved = {'app.py', 'static/', 'static/app.js', 'static/style.css'}
    if not set(archive.namelist()).issubset(approved) or 'app.py' not in archive.namelist():
        raise RuntimeError('Unexpected bundle contents')
    archive.extractall(ROOT)

def patch(filename, operations, original_hash=None):
    target = ROOT / filename
    if target.resolve().parent != ROOT.resolve() and target.parent.resolve() != (ROOT/'static').resolve():
        raise ValueError('Unexpected path')
    old = target.read_text('utf-8') if target.exists() else ''
    if original_hash and hashlib.sha256(old.encode('utf-8')).hexdigest() != original_hash:
        raise RuntimeError('Base source changed: ' + filename)
    lines = old.splitlines(keepends=True)
    for begin, end, replacement in reversed(operations):
        if not 0 <= begin <= end <= len(lines):
            raise RuntimeError('Bad patch bounds')
        lines[begin:end] = replacement.splitlines(keepends=True)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(''.join(lines), encoding='utf-8')

v2_packed = ''.join((ROOT / ('v2_part%d.b64' % i)).read_text().strip() for i in range(4))
v2 = json.loads(zlib.decompress(base64.b64decode(v2_packed)))
for name, ops in v2.items():
    patch(name, ops)

v3_packed = ''.join((ROOT / ('v3_part%d.b64' % i)).read_text().strip() for i in range(5))
v3 = json.loads(zlib.decompress(base64.b64decode(v3_packed)))
for name, entry in v3.items():
    patch(name, entry['ops'], entry['base_sha256'])

os.chdir(ROOT)
os.execv(sys.executable, [sys.executable, '-u', 'app.py'])
