import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');

test('the root stack registers the auth route group instead of a nested screen name', () => {
  const source = readFileSync(resolve(root, 'src/app/_layout.tsx'), 'utf8');
  assert.match(source, /<Stack\.Protected guard=\{!user\}>/);
  assert.equal((source.match(/<Stack\.Protected guard=\{!!user\}>/g) ?? []).length, 2);
  assert.doesNotMatch(source, /<Stack\.Protected guard=\{!!user\}>\s*<>/);
  assert.match(source, /name="\(auth\)"/);
  assert.doesNotMatch(source, /name="\(auth\)\/login"/);
});

test('logout does not query native background-task APIs on web', () => {
  const source = readFileSync(resolve(root, 'src/services/locationService.ts'), 'utf8');
  assert.match(source, /Platform\.OS !== 'web'/);
});
