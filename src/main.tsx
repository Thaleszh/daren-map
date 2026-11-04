import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css"; // base + tokens; feature sheets below load after it, in cascade order
import "./styles/layout.css";
import "./styles/map.css";
import "./styles/annotate.css";
import "./styles/map-settings.css";
import "./styles/panel.css";
import "./styles/nav.css";
import "./styles/initiatives.css";
import "./styles/expeditions.css";
import "./styles/relations.css";
import "./styles/members.css";
import "./styles/timeline.css";
import "./styles/region.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
