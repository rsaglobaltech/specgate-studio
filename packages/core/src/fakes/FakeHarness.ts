import type { BuildPort, BuildProcess } from "../ports/BuildPort.js";

interface Running {
  end: (r: { exitCode: number; stdout: string }) => void;
  output: (chunk: string) => void;
}

/** A build that ends when the test says: `finish` with its exit code and JSON report. */
export class FakeHarness implements BuildPort {
  /** The arguments of every build started. */
  readonly started: string[][] = [];
  /** How many builds were stopped. */
  stopped = 0;
  private readonly running: Running[] = [];

  start(args: readonly string[], onOutput: (chunk: string) => void): BuildProcess {
    this.started.push([...args]);
    let resolve!: (r: { exitCode: number; stdout: string }) => void;
    const done = new Promise<{ exitCode: number; stdout: string }>((ok) => (resolve = ok));
    const me: Running = {
      output: onOutput,
      end: (r) => {
        const i = this.running.indexOf(me);
        if (i >= 0) this.running.splice(i, 1);
        resolve(r);
      },
    };
    this.running.push(me);
    return {
      done,
      stop: async () => {
        if (this.running.includes(me)) this.stopped++;
        me.end({ exitCode: 143, stdout: "" });
        await done;
      },
    };
  }

  /** What the running build writes to its standard error. */
  write(chunk: string): void {
    this.running[0]?.output(chunk);
  }

  /** The running build ends with this exit code and report. */
  finish(exitCode: number, report: unknown): void {
    this.running[0]?.end({ exitCode, stdout: JSON.stringify(report) });
  }

  /** Whether a build is running. */
  get busy(): boolean {
    return this.running.length > 0;
  }
}
