import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

try {
  const event = JSON.parse(readFileSync(0, 'utf8'));
  const input = event.tool_input ?? {};
  const files = new Set();
  if (typeof input.file_path === 'string') files.add(input.file_path);
  if (typeof input.path === 'string') files.add(input.path);
  const patch = typeof input === 'string' ? input : input.patch ?? input.input ?? '';
  if (typeof patch === 'string') {
    for (const match of patch.matchAll(/^\*\*\* (?:Add|Update|Move to) File: (.+)$/gm)) files.add(match[1]);
    for (const match of patch.matchAll(/^\*\*\* Move to: (.+)$/gm)) files.add(match[1]);
  }
  const root = resolve(event.cwd || process.cwd());
  const targets = [...files].map(file => resolve(root, file)).filter(file => {
    const path = relative(root, file);
    return path && !path.startsWith('..') && !isAbsolute(path) && /\.(?:[cm]?js|jsx|ts|tsx)$/.test(path) && existsSync(file);
  });
  if (targets.length) {
    const result = spawnSync(process.execPath, ['node_modules/eslint/bin/eslint.js', ...targets], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) {
      process.stderr.write(result.stdout || '');
      process.stderr.write(result.stderr || 'ESLint 검사에 실패했습니다.\n');
      process.exit(2);
    }
  }
} catch (error) {
  process.stderr.write(`ESLint 훅 실행 실패: ${error.message}\n`);
  process.exit(2);
}
