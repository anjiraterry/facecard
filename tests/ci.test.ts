import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('CI/CD Pipeline Validation (Step 1.3)', () => {
  const rootDir = process.cwd();
  const ciPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');

  it('should have .github/workflows/ci.yml defined', () => {
    expect(fs.existsSync(ciPath)).toBe(true);
  });

  it('should execute lint, typecheck, tests, and opennext build', () => {
    const content = fs.readFileSync(ciPath, 'utf-8');
    expect(content).toContain('npx tsc --noEmit');
    expect(content).toContain('npm run lint');
    expect(content).toContain('npm test');
    expect(content).toContain('build:worker');
  });
});
