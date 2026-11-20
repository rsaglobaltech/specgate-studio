import * as fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import * as path from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

/**
 * The UI's files over HTTP, next to the WebSocket: a file under `dir`, the
 * index for any other address (the UI routes itself), never a file outside
 * `dir`. Hashed assets are cached for good; the index never is, so a new
 * build is picked up on reload.
 */
export function uiHandler(dir: string | undefined, options: { measure?: boolean } = {}) {
  const root = dir ? path.resolve(dir) : null;
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (!root || (req.method !== "GET" && req.method !== "HEAD")) {
      res.writeHead(404).end();
      return;
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? "/", "http://host").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(404).end();
      return;
    }
    const isFile = fs.existsSync(file) && fs.statSync(file).isFile();
    if (!isFile && path.extname(pathname)) {
      res.writeHead(404).end();
      return;
    }
    const served = isFile ? file : path.join(root, "index.html");
    if (!fs.existsSync(served)) {
      res.writeHead(404).end();
      return;
    }
    const immutable = served.includes(`${path.sep}assets${path.sep}`);
    res.writeHead(200, {
      "content-type": TYPES[path.extname(served)] ?? "application/octet-stream",
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
      "x-content-type-options": "nosniff",
    });
    if (req.method === "HEAD") res.end();
    else if (options.measure && path.extname(served) === ".html")
      // Measure mode (REQ-035 SCN-099): the page reports its cold start.
      res.end(withMeasure(fs.readFileSync(served, "utf8")));
    else fs.createReadStream(served).pipe(res);
  };
}

/** What tells the page to measure its cold start (apps/ui/src/measure.ts). */
export const MEASURE_META = '<meta name="studio-measure" content="1">';

/** The index with MEASURE_META: in its head, or after the doctype when it has none. */
export function withMeasure(html: string): string {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (h) => h + MEASURE_META);
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
  const at = doctype ? doctype[0].length : 0;
  return html.slice(0, at) + MEASURE_META + html.slice(at);
}

/** Where the page posts its cold start: the same path apps/ui/src/measure.ts posts to. */
export const MEASURE_PATH = "/__studio/measure";

/**
 * The page's cold start, written to `file` as it came (REQ-035 SCN-099):
 * only a small JSON object, only by POST. Any other request is not this one's.
 */
export function measureHandler(file: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    if (req.method !== "POST" || new URL(req.url ?? "/", "http://host").pathname !== MEASURE_PATH)
      return false;
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > 4096) req.destroy();
    });
    req.on("end", () => {
      try {
        const moments = JSON.parse(body) as unknown;
        if (typeof moments !== "object" || moments === null || Array.isArray(moments))
          throw new Error("not an object");
        fs.writeFileSync(file, JSON.stringify(moments));
        res.writeHead(204).end();
      } catch {
        res.writeHead(400).end();
      }
    });
    return true;
  };
}

const LOCAL_NAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * A request this host answers: addressed to it by a loopback name (no DNS
 * rebinding) and, when a browser says which page sent it, sent by the
 * studio's own page. A WebSocket is not covered by the browser's same-origin
 * rules, so without this any site the Developer has open could drive the
 * host: read the project's files or run specgate.
 */
export function fromStudio(req: IncomingMessage, port: () => number): boolean {
  const host = req.headers.host ?? "";
  const at = host.lastIndexOf(":");
  const name = at > host.lastIndexOf("]") ? host.slice(0, at) : host;
  if (!LOCAL_NAMES.has(name.toLowerCase())) return false;
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  const p = port();
  return origin === `http://127.0.0.1:${p}` || origin === `http://localhost:${p}`;
}
