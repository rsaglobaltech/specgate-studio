/**
 * The session token between the desktop shell and its sidecar (draft-desktop
 * REQ-151, A2): a host started with a token answers HTTP and the WebSocket
 * only to whoever presents it — the window the shell gave it to, or a browser
 * tab `specgate-studio serve` gave its own. Any other page or local process
 * is refused, even on 127.0.0.1.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { request } from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import WebSocket from "ws";
import type { ProcessRunner, SectionReader } from "@specgate-studio/core";
import { newToken, startHost } from "../src/index.js";

const reader: SectionReader = { read: async (section) => ({ section }) };
const runner: ProcessRunner = { run: async () => 0 };

function ui(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-ui-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>studio</title>");
  return dir;
}

/** A raw GET, the redirect not followed, with the headers given. */
function get(
  url: string,
  headers: Record<string, string> = {},
): Promise<{
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: "GET", headers }, (res) => {
      let body = "";
      res.setEncoding("utf8").on("data", (c: string) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("error", reject).end();
  });
}

/** Opens a WebSocket and says whether the host let it in, and with which status if not. */
function connect(url: string, headers: Record<string, string> = {}): Promise<number | "open"> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers });
    ws.once("open", () => {
      ws.close();
      resolve("open");
    });
    ws.once("unexpected-response", (_req, res) => {
      resolve(res.statusCode ?? 0);
      res.resume();
    });
    ws.once("error", () => resolve(0));
  });
}

test("REQ-151: a token is long, random and fit for an address", () => {
  const a = newToken();
  const b = newToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/); // 32 random bytes
});

test("REQ-151 SCN-451: a request without the session token is refused — HTTP and the WebSocket, from a page or a local process", async () => {
  const token = newToken();
  const dir = ui();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader,
    runner,
    port: 0,
    ui: dir,
    tokens: [token],
  });
  const port = new URL(host.url).port;
  const base = `http://127.0.0.1:${port}/`;
  const ws = `ws://127.0.0.1:${port}/`;
  try {
    // The host's own address carries the token: the shell's window and serve's tab open it.
    assert.equal(new URL(host.url).searchParams.get("token"), token);

    // No token: a local process (no Origin), and the studio's own page without it.
    const none = await get(base);
    assert.equal(none.status, 403);
    assert.match(none.body, /token/); // it says why
    assert.equal((await get(base, { origin: `http://127.0.0.1:${port}` })).status, 403);
    assert.equal(await connect(ws), 403);
    assert.equal(await connect(ws, { origin: `http://127.0.0.1:${port}` }), 403);

    // A wrong token, in each place a token is read.
    const wrong = newToken();
    assert.equal((await get(`${base}?token=${wrong}`)).status, 403);
    assert.equal(await connect(`${ws}?token=${wrong}`), 403);
    assert.equal(await connect(ws, { authorization: `Bearer ${wrong}` }), 403);
    assert.equal(await connect(ws, { cookie: `specgate-studio-${port}=${wrong}` }), 403);
    // Another port's cookie is not this host's.
    assert.equal(await connect(ws, { cookie: `specgate-studio-1=${token}` }), 403);

    // Another local page, even holding the token, is refused by its origin.
    assert.equal(await connect(`${ws}?token=${token}`, { origin: "http://127.0.0.1:5173" }), 403);
    assert.equal(
      (await get(`${base}?token=${token}`, { origin: "http://localhost:3000" })).status,
      403,
    );
  } finally {
    await host.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-151: the window opens the address with its token — kept in a cookie of its own, the token taken out of the address — and its WebSocket is let in", async () => {
  const token = newToken();
  const dir = ui();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader,
    runner,
    port: 0,
    ui: dir,
    tokens: [token],
  });
  const port = new URL(host.url).port;
  const base = `http://127.0.0.1:${port}/`;
  try {
    const first = await get(`${base}changes?token=${token}&x=1`);
    assert.equal(first.status, 303);
    assert.equal(first.headers.location, "/changes?x=1");
    const set = String(first.headers["set-cookie"]);
    assert.match(set, new RegExp(`^specgate-studio-${port}=${token};`));
    assert.match(set, /HttpOnly/);
    assert.match(set, /SameSite=Strict/);
    const cookie = `specgate-studio-${port}=${token}`;

    const page = await get(`${base}changes?x=1`, { cookie: `other=1; ${cookie}` });
    assert.equal(page.status, 200);
    assert.match(page.body, /<title>studio<\/title>/);
    // The UI's WebSocket carries the cookie; the shell's own questions carry the token as a header.
    const origin = `http://127.0.0.1:${port}`;
    assert.equal(await connect(`ws://127.0.0.1:${port}/`, { cookie, origin }), "open");
    assert.equal(
      await connect(`ws://127.0.0.1:${port}/`, { authorization: `Bearer ${token}` }),
      "open",
    );
    assert.equal(await connect(host.url), "open");
  } finally {
    await host.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("REQ-151 REQ-158: a tab that joins gets a token of its own, issued by the host to a holder of one; it works, and the window's keeps working", async () => {
  const windowToken = newToken();
  const host = await startHost({
    projectDir: "/tmp/sprich",
    reader,
    runner,
    port: 0,
    tokens: [windowToken],
  });
  const port = new URL(host.url).port;
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`, {
      headers: { authorization: `Bearer ${windowToken}` },
    });
    await new Promise((ok, ko) => ws.once("open", ok).once("error", ko));
    const answer = await new Promise<{ result?: { token: string } }>((resolve) => {
      ws.once("message", (raw) => resolve(JSON.parse(String(raw))));
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "session.issue" }));
    });
    ws.close();
    const tabToken = answer.result!.token;
    assert.notEqual(tabToken, windowToken);
    assert.equal(await connect(`ws://127.0.0.1:${port}/?token=${tabToken}`), "open");
    assert.equal(await connect(`ws://127.0.0.1:${port}/?token=${windowToken}`), "open");
  } finally {
    await host.close();
  }
});

test("REQ-151: a host started with no token — the tests' fakes — keeps answering as before", async () => {
  const host = await startHost({ projectDir: "/tmp/sprich", reader, runner, port: 0 });
  try {
    assert.equal(new URL(host.url).search, "");
    assert.equal(await connect(host.url), "open");
  } finally {
    await host.close();
  }
});
