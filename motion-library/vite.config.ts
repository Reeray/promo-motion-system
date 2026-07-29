import {defineConfig, Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {execFile} from 'child_process';
import {mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync} from 'fs';
import {join, resolve} from 'path';
import type {IncomingMessage} from 'http';

/** Remotion ships ffprobe inside its per-platform compositor package — the only copy guaranteed to
 *  exist after `npm install`. Globbed rather than hardcoded so this is not Windows-only. */
const ffprobe = (): string => {
  const dir = resolve(__dirname, 'node_modules', '@remotion');
  for (const pkg of readdirSync(dir).filter((d) => d.startsWith('compositor-'))) {
    for (const n of ['ffprobe.exe', 'ffprobe']) {
      const p = join(dir, pkg, n);
      try { statSync(p); return p; } catch { /* next candidate */ }
    }
  }
  throw new Error('no bundled ffprobe under node_modules/@remotion/compositor-*');
};

const DOCS = resolve(__dirname, 'docs');
const OUT = resolve(__dirname, 'out');

const run = (cmd: string, args: string[]) =>
  new Promise<{ok: boolean; out: string}>((res) =>
    execFile(cmd, args, {cwd: __dirname, maxBuffer: 8 * 1024 * 1024, shell: process.platform === 'win32'}, (err, so, se) =>
      res({ok: !err, out: `${so}${se}`.trim()})
    )
  );

/* Read a request body as BYTES.
 *
 * The previous version accumulated into a string (`b += c`), which decodes each chunk as UTF-8 and
 * silently mangles any byte that is not valid UTF-8 — fine for JSON, fatal for the audio uploads
 * the cue editor needs. A dropped WAV would arrive corrupted and look like a bad file rather than
 * a bad server. Buffers also let us cap the size, which a growing string never did. */
const rawBody = (req: IncomingMessage, cap = 32 * 1024 * 1024) =>
  new Promise<Buffer>((res, rej) => {
    const chunks: Buffer[] = [];
    let n = 0;
    req.on('data', (c: Buffer) => {
      n += c.length;
      if (n > cap) {
        req.destroy();
        return rej(new Error(`body exceeds ${Math.round(cap / 1024 / 1024)}MB`));
      }
      chunks.push(c);
    });
    req.on('error', rej);
    req.on('end', () => res(Buffer.concat(chunks)));
  });

/** Text bodies (JSON docs) ride on the byte reader, so there is one code path, not two. */
const body = async (req: IncomingMessage) => (await rawBody(req)).toString('utf8');

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
        // Return parsed content, not bare names, so the picker can show a human label
        // (id · N scenes · theme) instead of a filename. Duration stays client-side: the editor
        // runs prepare() on the doc, keeping prepare() the single duration boundary.
        const files = readdirSync(DOCS).filter((f) => f.endsWith('.promo.json'));
        return json({
          docs: files.map((f) => {
            try {
              return {f, doc: JSON.parse(readFileSync(resolve(DOCS, f), 'utf8'))};
            } catch (e) {
              return {f, doc: null, error: String((e as Error).message)};
            }
          }),
        });
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

      /* Upload one audio file into public/sfx/ (git-ignored — see public/README.md).
       *
       * Rides the Buffer-based rawBody from T23. The old string reader decoded each chunk as
       * UTF-8, which corrupts any byte that is not valid UTF-8 — a dropped WAV would have arrived
       * mangled and looked like a bad file rather than a bad server.
       *
       * Validated twice, because neither check alone is enough: the NAME is guarded so nothing can
       * escape the directory, and the BYTES are probed so a renamed .txt cannot become a cue that
       * kills the render with a decode error. */
      if (url.pathname === '/__audio' && req.method === 'POST') {
        const f = url.searchParams.get('f') ?? '';
        if (!/^[\w-]+\.(wav|mp3|m4a|ogg|aac|flac)$/i.test(f)) {
          return json({ok: false, error: 'filename must be simple and audio (wav/mp3/m4a/ogg/aac/flac)'}, 400);
        }
        let buf: Buffer;
        try {
          buf = await rawBody(req);
        } catch (e) {
          return json({ok: false, error: String((e as Error).message)}, 413);
        }
        if (!buf.length) return json({ok: false, error: 'empty upload'}, 400);

        // `d` picks the kind: cue one-shots vs the looping bed. A whitelist, not a path — the
        // two names are the only ones the schema's src rule accepts, so anything else would
        // upload a file no doc could ever legally reference.
        const kind = url.searchParams.get('d') ?? 'sfx';
        if (kind !== 'sfx' && kind !== 'music') return json({ok: false, error: 'd must be sfx or music'}, 400);
        const dir = resolve(__dirname, 'public', kind);
        mkdirSync(dir, {recursive: true});
        const dest = resolve(dir, f);
        if (!dest.startsWith(dir)) return json({ok: false, error: 'path escape'}, 400);
        writeFileSync(dest, buf);

        // Probe AFTER writing, and delete on failure, so a rejected file never lingers where a
        // doc could later name it.
        const probe = await run(ffprobe(), ['-v', 'error', '-select_streams', 'a:0',
          '-show_entries', 'stream=codec_type,duration', '-of', 'json', dest]);
        if (!probe.ok || !/"codec_type"\s*:\s*"audio"/.test(probe.out)) {
          try { unlinkSync(dest); } catch { /* already gone */ }
          return json({ok: false, error: 'not a decodable audio file'}, 400);
        }
        const dur = Number(/"duration"\s*:\s*"([\d.]+)"/.exec(probe.out)?.[1] ?? 0);
        return json({ok: true, src: `${kind}/${f}`, seconds: dur});
      }

      /* What is already in public/sfx/, so the editor can offer existing files instead of making
       * you re-upload the same click for every cue. */
      if (url.pathname === '/__audio') {
        const kind = url.searchParams.get('d') === 'music' ? 'music' : 'sfx';
        const dir = resolve(__dirname, 'public', kind);
        try {
          return json({files: readdirSync(dir).filter((n) => /\.(wav|mp3|m4a|ogg|aac|flac)$/i.test(n)).map((n) => `${kind}/${n}`)});
        } catch {
          return json({files: []}); // directory does not exist yet — no audio has been added
        }
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
  /* Serve motion-library/public at / in dev. Without this, `publicDir` defaults to <root>/public
   * — i.e. site/public — and the editor's fetch of an audio file silently returns index.html with
   * a 200, which decodeAudioData then rejects with an opaque error. Remotion's staticFile() has
   * always resolved against motion-library/public, so the RENDER worked while the EDITOR could not
   * see the same file: exactly the preview/render split this project exists to prevent. */
  publicDir: resolve(__dirname, 'public'),
  plugins: [react(), editorApi()],
  server: {host: true, port: 5173, strictPort: false, allowedHosts: true},
  build: {
    outDir: '../../docs',
    emptyOutDir: false, // docs/ is the published gallery
    /* Do NOT copy public/ into the published gallery. It now holds user-supplied audio and
     * captured third-party images — none of which belong in a public GitHub Pages build, and all
     * of which are git-ignored precisely so they are not redistributed. */
    copyPublicDir: false,
  },
});
