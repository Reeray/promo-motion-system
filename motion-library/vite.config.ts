import {defineConfig, Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {execFile} from 'child_process';
import {readdirSync, readFileSync, writeFileSync} from 'fs';
import {resolve} from 'path';
import type {IncomingMessage} from 'http';

const DOCS = resolve(__dirname, 'docs');
const OUT = resolve(__dirname, 'out');

const run = (cmd: string, args: string[]) =>
  new Promise<{ok: boolean; out: string}>((res) =>
    execFile(cmd, args, {cwd: __dirname, maxBuffer: 8 * 1024 * 1024, shell: process.platform === 'win32'}, (err, so, se) =>
      res({ok: !err, out: `${so}${se}`.trim()})
    )
  );

const body = (req: IncomingMessage) =>
  new Promise<string>((res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => res(b));
  });

/* DEV-ONLY editor backend. The editor must write docs/*.promo.json and shell the render, and the
 * render step needs the file on disk at a known path — a browser download cannot do that.
 * `apply: 'serve'` keeps it out of `vite build`: the published gallery is static and stays so. */
const editorApi = (): Plugin => ({
  name: 'promo-editor-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://x');
      const json = (v: unknown, code = 200) => {
        res.statusCode = code;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(v));
      };
      const safe = (f: string) => /^[\w.-]+\.promo\.json$/.test(f);

      if (url.pathname === '/__docs') {
        return json({docs: readdirSync(DOCS).filter((f) => f.endsWith('.promo.json'))});
      }

      if (url.pathname === '/__doc') {
        const f = url.searchParams.get('f') ?? '';
        if (!safe(f)) return json({error: 'bad filename'}, 400);
        if (req.method === 'POST') {
          const raw = await body(req);
          try {
            JSON.parse(raw);
          } catch {
            return json({ok: false, error: 'not valid JSON'}, 400);
          }
          writeFileSync(resolve(DOCS, f), raw.endsWith('\n') ? raw : raw + '\n');
          return json({ok: true});
        }
        return json(JSON.parse(readFileSync(resolve(DOCS, f), 'utf8')));
      }

      if (url.pathname === '/__render') {
        const f = url.searchParams.get('f') ?? '';
        const frames = url.searchParams.get('frames') ?? '';
        if (!safe(f)) return json({error: 'bad filename'}, 400);
        const id = f.replace(/\.promo\.json$/, '');
        const mp4 = `out/${id}.mp4`;
        const steps: {name: string; ok: boolean; out: string}[] = [];

        // Same order the laws demand: static + doc gates, then render, then the pixel gate.
        // Any failure stops the chain — no MP4 is offered until every gate has passed.
        const check = await run('npm', ['run', 'check']);
        steps.push({name: 'npm run check', ...check});
        if (check.ok) {
          const r = await run('npx', ['remotion', 'render', 'Promo', mp4, `--props=docs/${f}`, '--log=error']);
          steps.push({name: `remotion render → ${mp4}`, ...r});
          if (r.ok) {
            const g = await run('python', ['scripts/check-render.py', mp4, '--expect-frames', frames]);
            steps.push({name: 'check-render.py', ...g});
          }
        }
        return json({ok: steps.every((s) => s.ok), steps, mp4});
      }

      if (url.pathname.startsWith('/__out/')) {
        try {
          const data = readFileSync(resolve(OUT, url.pathname.slice(7)));
          res.setHeader('content-type', 'video/mp4');
          return res.end(data);
        } catch {
          res.statusCode = 404;
          return res.end();
        }
      }
      next();
    });
  },
});

export default defineConfig({
  root: 'site',
  base: './',
  plugins: [react(), editorApi()],
  server: {host: true, port: 5173, strictPort: false, allowedHosts: true},
  build: {
    outDir: '../../docs',
    emptyOutDir: false, // docs/ is the published gallery
  },
});
