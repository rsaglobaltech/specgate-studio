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
export function uiHandler(dir: string | undefined) {
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
    else fs.createReadStream(served).pipe(res);
  };
}
