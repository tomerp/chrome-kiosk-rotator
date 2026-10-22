#!/usr/bin/env python3
"""Build a deterministic extension-only ZIP; uses only the Python standard library."""
import hashlib
import json
from pathlib import Path
import struct
import sys
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
extension = root / 'extension'
manifest = json.loads((extension / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert len(manifest['description']) <= 132
for name in [manifest['background']['service_worker'], manifest['action']['default_popup'], manifest['options_ui']['page']]:
    assert (extension / name).is_file(), f'Missing entry point: {name}'
for size, name in manifest['icons'].items():
    blob = (extension / name).read_bytes()
    assert blob[:8] == b'\x89PNG\r\n\x1a\n', f'Not PNG: {name}'
    assert struct.unpack('>II', blob[16:24]) == (int(size), int(size)), f'Wrong icon size: {name}'
for size, name in manifest['action']['default_icon'].items():
    assert manifest['icons'][size] == name
config = (extension / 'config.js').read_text()
assert 'https://example.com/' in config and 'https://example.org/' in config
assert 'preview-api.js' not in ''.join(p.read_text() for p in extension.glob('*.html'))
output = Path(sys.argv[1] if len(sys.argv) > 1 else root / 'dist')
output.mkdir(parents=True, exist_ok=True)
archive = output / f"kiosk-rotator-{manifest['version']}.zip"
files = sorted(p for p in extension.rglob('*') if p.is_file() and p.name != '.DS_Store')
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as z:
    for p in files:
        assert p.suffix in {'.html', '.css', '.js', '.json', '.png'}, f'Unexpected packaged file: {p.name}'
        info = ZipInfo(p.relative_to(extension).as_posix(), date_time=(2020, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        z.writestr(info, p.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'manifest.json' in z.namelist()
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.zip.sha256')).write_text(f'{checksum}  {archive.name}\n')
print(f'Validated {len(files)} extension files; wrote {archive.name}')
print(f'SHA-256: {checksum}')
