import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEV_SCRIPT = 'nx run-many -t serve --projects=client,server --parallel=2';

describe('dev orchestration', () => {
  it('starts client and server together through nx serve targets', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.scripts.dev).toBe(DEV_SCRIPT);

    const clientProject = JSON.parse(
      readFileSync(resolve(process.cwd(), 'client/project.json'), 'utf8')
    );
    const serverProject = JSON.parse(
      readFileSync(resolve(process.cwd(), 'server/project.json'), 'utf8')
    );

    expect(clientProject.targets.serve.executor).toBe('@nx/vite:dev-server');
    expect(serverProject.targets.serve.options.command).toContain('server/src/main.ts');
  });

  it('proxies /api to the server on port 3000 and serves client on 4200', () => {
    const viteSource = readFileSync(resolve(process.cwd(), 'client/vite.config.ts'), 'utf8');
    expect(viteSource).toMatch(/port:\s*4200/);
    expect(viteSource).toMatch(/target:\s*'http:\/\/localhost:3000'/);
    expect(viteSource).toMatch(/changeOrigin:\s*true/);
  });

  it('configures the Fastify server default port to 3000', () => {
    const mainSource = readFileSync(resolve(process.cwd(), 'server/src/main.ts'), 'utf8');
    expect(mainSource).toMatch(/process\.env\.PORT\s*\?\?\s*3000/);
  });
});
