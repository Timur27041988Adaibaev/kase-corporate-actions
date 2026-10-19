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


# 3.1 validated business safeguards, applied after the v3 bundle.
app_file = ROOT / "app.py"
content = app_file.read_text("utf-8")
modifications = [
    ("import json\n", "import json\nimport math\n"),
    (
        "                    if status not in STATES:return self.error('Неизвестный статус',400,user)\n",
        """                    if status not in STATES:return self.error('Неизвестный статус',400,user)
                    if status in ('Готов','Выдан'):
                        blocked=db.execute('SELECT 1 FROM blockers WHERE repair_id=? AND resolved_at IS NULL LIMIT 1',(rid,)).fetchone()
                        if blocked:
                            return self.error('Нельзя завершить ремонт: есть незакрытые причины простоя. Сначала зафиксируйте их решение.',409,user)
                        rejected=db.execute(\"\"\"SELECT 1 FROM inspections i JOIN attachments a ON a.id=i.attachment_id
                            WHERE a.repair_id=? AND i.decision='Доработать' LIMIT 1\"\"\",(rid,)).fetchone()
                        if rejected:
                            return self.error('Нельзя завершить ремонт: есть фото- или видеоотчёты, возвращённые на доработку.',409,user)
"""
    ),
    (
        "                    if amount<=0 or amount>1000000:return self.error('Некорректное количество',400,user)",
        "                    if not math.isfinite(amount) or amount<=0 or amount>1000000:return self.error('Некорректное количество',400,user)"
    )
]
for previous, updated in modifications:
    count = content.count(previous)
    if count != 1:
        raise RuntimeError(f"v3.1 patch mismatch, expected one match, found {count}")
    content = content.replace(previous, updated, 1)
app_file.write_text(content, encoding="utf-8")

os.chdir(ROOT)
os.execv(sys.executable, [sys.executable, '-u', 'app.py'])
