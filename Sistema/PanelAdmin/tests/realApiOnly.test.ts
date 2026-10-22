import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

test('el Panel no expone un control para alternar a datos mock', () => {
  const app = source('src/App.tsx');
  const layout = source('src/components/Layout.tsx');
  const sidebar = source('src/components/Sidebar.tsx');

  assert.doesNotMatch(app, /toggleMockData|isMockActive|onToggleMock/);
  assert.doesNotMatch(layout, /isMockActive|onToggleMock/);
  assert.doesNotMatch(sidebar, /Mock Offline|onToggleMock|isMockActive/);
});
