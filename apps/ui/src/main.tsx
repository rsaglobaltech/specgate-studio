import { render } from "preact";
import { App } from "./App.js";
import { Rpc, hostUrl } from "./rpc.js";
import { measureColdStart, measuring } from "./measure.js";
import "./fonts.css";
import "./styles.css";

performance.mark("workbench:start");
const rpc = new Rpc(hostUrl(location), () => document.body.setAttribute("data-host", "lost"));
(window as unknown as { __studio: { rpc: Rpc } }).__studio = { rpc };
render(<App rpc={rpc} />, document.getElementById("app")!);
requestAnimationFrame(() => performance.mark("workbench:visible"));
// The desktop app's cold start, only when the host asks for it (REQ-035 SCN-099).
if (measuring())
  void measureColdStart(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
