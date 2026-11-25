import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['test'], { cwd: process.cwd(), encoding: 'utf8' });
if (result.status !== 0) {
  process.stderr.write(result.stdout || '');
  process.stderr.write(result.stderr || 'npm test 실행에 실패했습니다.\n');
  process.exit(2);
}
