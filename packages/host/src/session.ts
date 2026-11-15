import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

/** A per-launch secret: 32 random bytes, base64url (draft-desktop A2). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The cookie a host keeps its token in: one per port, as cookies ignore ports. */
export function cookieName(port: number): string {
  return `specgate-studio-${port}`;
}

function digest(s: string): Buffer {
  return createHash("sha256").update(s).digest();
}

/**
 * The tokens a host answers to (draft-desktop REQ-151, A2): the one its
 * starter gave it — the desktop shell's, or `specgate-studio serve`'s — and
 * those it issued since to a tab or a window that joined. With none, the host
 * asks for none (the tests' hosts on fakes).
 */
export class Session {
  private readonly tokens: Buffer[];

  constructor(tokens: readonly string[] = []) {
    this.tokens = tokens.filter((t) => t.length > 0).map(digest);
  }

  get required(): boolean {
    return this.tokens.length > 0;
  }

  /** A new token for one more window or tab. */
  issue(): string {
    const token = newToken();
    this.tokens.push(digest(token));
    return token;
  }

  /** `token` is one of this host's, compared in constant time. */
  allows(token: string | undefined): boolean {
    if (!token) return false;
    const d = digest(token);
    let ok = false;
    for (const t of this.tokens) ok = timingSafeEqual(t, d) || ok;
    return ok;
  }

  /**
   * Whether `req` carries one of the tokens, and how: in the address
   * (`?token=` — the first load of a window or a tab), in the host's cookie
   * (every load after it, and the UI's WebSocket), or as a bearer header (the
   * shell's own questions).
   */
  check(req: IncomingMessage, port: number): "query" | "cookie" | "header" | null {
    if (!this.required) return "header";
    const url = new URL(req.url ?? "/", "http://host");
    if (this.allows(url.searchParams.get("token") ?? undefined)) return "query";
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ") && this.allows(auth.slice(7))) return "header";
    const name = cookieName(port);
    for (const part of (req.headers.cookie ?? "").split(";")) {
      const at = part.indexOf("=");
      if (at > 0 && part.slice(0, at).trim() === name && this.allows(part.slice(at + 1).trim()))
        return "cookie";
    }
    return null;
  }
}

/** The address without its token, for the redirect after the first load. */
export function withoutToken(reqUrl: string | undefined): string {
  const url = new URL(reqUrl ?? "/", "http://host");
  url.searchParams.delete("token");
  return url.pathname + url.search;
}

export const NO_TOKEN_TEXT =
  "Specgate Studio: this address needs its session token. Open the address " +
  "`specgate-studio serve` printed (it ends in ?token=…), or the desktop app's window.\n";
