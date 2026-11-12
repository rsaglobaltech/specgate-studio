import { render } from "preact";
import { App } from "./App.js";
import { Rpc, hostUrl } from "./rpc.js";
import "./fonts.css";
import "./styles.css";

performance.mark("workbench:start");
const rpc = new Rpc(hostUrl(location), () => document.body.setAttribute("data-host", "lost"));
(window as unknown as { __studio: { rpc: Rpc } }).__studio = { rpc };
render(<App rpc={rpc} />, document.getElementById("app")!);
requestAnimationFrame(() => performance.mark("workbench:visible"));
