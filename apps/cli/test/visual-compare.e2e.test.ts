/**
 * visual-regression REQ-231, the comparison itself: what makes a screen
 * pass, fail, or get its reference written. The images are drawn here from
 * flat blocks of colour, with no text, so they are the same on every
 * operating system and these tests run on all three.
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { browser } from "./support.js";
import { MAX_DIFF_RATIO, comparePng, failureOf, judge, screenPaths } from "./visual.js";

/**
 * A 1440×900 screen of flat blocks: a dark ground, a card, and a line of
 * `lineHeight` px under it at `lineTop` — the "line flush against the card"
 * of SCN-1009 is this line moved by a few pixels.
 */
async function screen(opts: { lineTop: number; lineColour?: string }): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.setContent(`
      <body style="margin:0;background:#15161a">
        <div style="position:absolute;left:80px;top:116px;width:972px;height:94px;background:#1c1d22;border:1px solid #2a2b31"></div>
        <div style="position:absolute;left:80px;top:${opts.lineTop}px;width:470px;height:14px;background:${opts.lineColour ?? "#9a9ba3"}"></div>
        <div style="position:absolute;left:80px;top:260px;width:972px;height:100px;background:#2a1d16"></div>
      </body>`);
    return await page.screenshot();
  } finally {
    await page.close();
  }
}

/** A folder of references and one of results, as the tests keep them, made fresh. */
function dirs() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sg-visual-"));
  return {
    root,
    dirs: { references: path.join(root, "visual"), results: path.join(root, "test-results") },
  };
}

test("REQ-231 SCN-1008: an unchanged screen passes against its reference", async () => {
  const { root, dirs: d } = dirs();
  try {
    const png = await screen({ lineTop: 230 });
    fs.mkdirSync(path.join(d.references, "linux"), { recursive: true });
    fs.writeFileSync(screenPaths("home", "linux", d).reference, png);
    const again = await screen({ lineTop: 230 });
    const v = await judge("home", again, { platform: "linux", ci: true, update: false, dirs: d });
    assert.deepEqual(v, { kind: "same", ratio: 0 });
    assert.equal(failureOf("home", v), null);
    // Nothing written beside the results when it passes.
    assert.equal(fs.existsSync(d.results), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-231 SCN-1009: a line moved 8 px fails — the screen as it is now and its differences in red, written beside the results", async () => {
  const { root, dirs: d } = dirs();
  try {
    fs.mkdirSync(path.join(d.references, "linux"), { recursive: true });
    fs.writeFileSync(
      screenPaths("home-adopted", "linux", d).reference,
      await screen({ lineTop: 230 }),
    );
    const moved = await screen({ lineTop: 238 });
    const v = await judge("home-adopted", moved, {
      platform: "linux",
      ci: true,
      update: false,
      dirs: d,
    });
    assert.equal(v.kind, "changed");
    if (v.kind !== "changed") return;
    assert.ok(v.ratio > MAX_DIFF_RATIO, `${v.ratio}`);
    const p = screenPaths("home-adopted", "linux", d);
    assert.equal(v.actual, p.actual);
    assert.equal(v.diff, p.diff);
    assert.ok(fs.readFileSync(p.actual).equals(moved), "the screen as it is now");
    // The differences image: red where the line was and where it is now.
    const c = await comparePng(fs.readFileSync(p.reference), fs.readFileSync(p.diff), 0);
    assert.ok(c.differing > 0);
    assert.match(failureOf("home-adopted", v)!, /home-adopted: .* % of the pixels differ/);
    assert.match(failureOf("home-adopted", v)!, /STUDIO_VISUAL_UPDATE=1/);
    // The reference is left as it was.
    assert.ok(!fs.readFileSync(p.reference).equals(moved));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-231 SCN-1009: a change under 0.2 % of the pixels passes; a colour within the tolerance is the same", async () => {
  const ref = await screen({ lineTop: 230, lineColour: "#9a9ba3" });
  // A shade off — antialiasing noise, not a change.
  const shade = await comparePng(ref, await screen({ lineTop: 230, lineColour: "#a0a1a9" }));
  assert.equal(shade.differing, 0);
  // Another colour: every pixel of the line differs, 470×14 of 1440×900 (0.5 %).
  const colour = await comparePng(ref, await screen({ lineTop: 230, lineColour: "#ff5b1f" }));
  assert.equal(colour.differing, 470 * 14);
  assert.ok(colour.differing / colour.total > MAX_DIFF_RATIO);
});

test("REQ-231 SCN-1010: STUDIO_VISUAL_UPDATE=1 rewrites the reference, an intended change", async () => {
  const { root, dirs: d } = dirs();
  try {
    fs.mkdirSync(path.join(d.references, "linux"), { recursive: true });
    const p = screenPaths("home-adopted", "linux", d);
    fs.writeFileSync(p.reference, await screen({ lineTop: 230 }));
    const intended = await screen({ lineTop: 238 });
    const v = await judge("home-adopted", intended, {
      platform: "linux",
      ci: true,
      update: true,
      dirs: d,
    });
    assert.deepEqual(v, { kind: "written", reference: p.reference });
    assert.ok(fs.readFileSync(p.reference).equals(intended));
    // Compared again, it passes.
    const after = await judge("home-adopted", intended, {
      platform: "linux",
      ci: true,
      update: false,
      dirs: d,
    });
    assert.equal(after.kind, "same");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-231 SCN-1011: a screen with no reference — written on the Developer's machine; on CI it fails, with the screen it took", async () => {
  const { root, dirs: d } = dirs();
  try {
    const png = await screen({ lineTop: 230 });
    const p = screenPaths("readiness", "linux", d);
    // On CI: it fails, and the screen is where the workflow uploads it from.
    const ci = await judge("readiness", png, {
      platform: "linux",
      ci: true,
      update: false,
      dirs: d,
    });
    assert.deepEqual(ci, { kind: "missing", actual: p.actual });
    assert.ok(fs.readFileSync(p.actual).equals(png));
    assert.equal(fs.existsSync(p.reference), false, "CI writes no reference");
    assert.match(failureOf("readiness", ci)!, /no reference/);
    // On the Developer's machine: written, and it passes.
    const local = await judge("readiness", png, {
      platform: "linux",
      ci: false,
      update: false,
      dirs: d,
    });
    assert.deepEqual(local, { kind: "written", reference: p.reference });
    assert.equal(failureOf("readiness", local), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-231: a screen of another size than its reference fails", async () => {
  const { root, dirs: d } = dirs();
  try {
    fs.mkdirSync(path.join(d.references, "linux"), { recursive: true });
    fs.writeFileSync(screenPaths("home", "linux", d).reference, await screen({ lineTop: 230 }));
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const small = await page.screenshot();
    await page.close();
    const v = await judge("home", small, { platform: "linux", ci: true, update: false, dirs: d });
    assert.equal(v.kind, "resized");
    assert.match(failureOf("home", v)!, /size differs/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
