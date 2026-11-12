/**
 * The button the studio's terminal names for each run it echoes (REQ-053).
 * A button whose command runs next is pending until a run starts; a build's
 * button is kept by its requirement, so a queued build — started later, after
 * other buttons were pressed — is echoed with its own (demo-findings REQ-103).
 */
export class Echoes {
  private pending: string | null = null;
  private readonly builds = new Map<string, string>();

  /** The button whose command runs next. */
  announce(label: string): void {
    this.pending = label;
  }

  /** The button that builds `req`, now or once its turn comes. */
  build(req: string, label: string): void {
    this.builds.set(req, label);
  }

  /** A build refused, or a button whose command never ran: it names no later run. */
  forget(req?: string): void {
    if (req === undefined) this.pending = null;
    else this.builds.delete(req);
  }

  /**
   * The label a run that just started is echoed with: a build's own button,
   * else the pending one, else `fallback`, else the command itself.
   */
  started(command: string, fallback?: string | null): string {
    const req = /\bharness run --req (REQ-\d+)\b/.exec(command)?.[1];
    const own = req !== undefined ? this.builds.get(req) : undefined;
    if (req !== undefined) this.builds.delete(req);
    if (own !== undefined) return own;
    if (this.pending !== null) {
      const label = this.pending;
      this.pending = null;
      return label;
    }
    return fallback ?? command;
  }
}
