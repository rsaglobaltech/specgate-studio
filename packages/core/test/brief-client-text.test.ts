/**
 * The client's text kept in the brief once its proposal is accepted
 * (brief-keep-client-text REQ-238): the body below the front matter.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { withClientText } from "../src/index.js";

const FM = "---\nproduct: Sprich\nmodules: [pedidos]\n---\n";
const CLIENT = "# Notes from the call\n\nOrders are cancelled until 24 h before shipping.\n";

test("REQ-238 SCN-1016: a brief with no body — the client's text becomes its body, the front matter untouched", () => {
  assert.equal(withClientText(FM, CLIENT), `${FM}${CLIENT}`);
  assert.equal(withClientText(`${FM}\n\n`, CLIENT), `${FM}${CLIENT}`, "blank lines are no body");
});

test("REQ-238: a brief with a body keeps it; the client's text follows after a blank line", () => {
  const body = "# Why\n\nOrders for Sprich.\n";
  assert.equal(withClientText(FM + body, CLIENT), `${FM}${body}\n${CLIENT}`);
});

test("REQ-238 SCN-1017: the same text accepted again is not written twice — line endings and outer blank lines aside", () => {
  const once = withClientText(FM, CLIENT);
  assert.equal(withClientText(once, CLIENT), once);
  assert.equal(
    withClientText(once.replace(/\n/g, "\r\n"), `\n${CLIENT}\n\n`),
    once.replace(/\n/g, "\r\n"),
  );
});

test("REQ-238: a brief with no front matter — the text after what is there; empty text changes nothing", () => {
  assert.equal(withClientText("", CLIENT), CLIENT);
  assert.equal(withClientText(FM, "  \n"), FM);
});
