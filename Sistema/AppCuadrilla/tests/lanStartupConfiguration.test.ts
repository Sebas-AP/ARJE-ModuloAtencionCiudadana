import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('anuncia a Metro y a la API la IPv4 LAN elegida', () => {
  const binDir = mkdtempSync(join(tmpdir(), 'arje-npx-'));
  const npxPath = join(binDir, 'npx');
  writeFileSync(npxPath, '#!/usr/bin/env bash\nprintf "API=%s\\nMETRO=%s\\n" "$EXPO_PUBLIC_API_BASE_URL" "$REACT_NATIVE_PACKAGER_HOSTNAME"\n');
  chmodSync(npxPath, 0o755);

  try {
    const output = execFileSync('bash', ['scripts/start-lan.sh'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        EXPO_LOCAL_IP: '192.168.0.11',
        PATH: `${binDir}:${process.env.PATH}`,
      },
      encoding: 'utf8',
    });

    assert.match(output, /API=http:\/\/192\.168\.0\.11:5170\/api/);
    assert.match(output, /METRO=192\.168\.0\.11/);
  } finally {
    rmSync(binDir, { recursive: true, force: true });
  }
});
