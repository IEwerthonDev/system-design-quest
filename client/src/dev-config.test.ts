import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('dev orchestration', () => {
  it('starts client on 4200 and server on 3000 via npm run dev', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.scripts.dev).toContain('nx run-many -t serve');
    expect(pkg.scripts.dev).toContain('client,server');
  });

  it('proxies /api to the server on port 3000', () => {
    const viteSource = readFileSync(resolve(process.cwd(), 'client/vite.config.ts'), 'utf8');
    expect(viteSource).toContain('port: 4200');
    expect(viteSource).toContain("target: 'http://localhost:3000'");
    expect(viteSource).toContain("'/api'");
  });

  it('configures the Fastify server default port to 3000', () => {
    const mainSource = readFileSync(resolve(process.cwd(), 'server/src/main.ts'), 'utf8');
    expect(mainSource).toContain('process.env.PORT ?? 3000');
  });
});
