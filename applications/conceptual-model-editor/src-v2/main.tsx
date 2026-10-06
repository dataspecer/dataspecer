// FROZEN: src-v2 should be merged back into src/.
// Do not implement new features into this package.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Application } from "./application/application";
import "./application";

(function main() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Application />
    </StrictMode>,
  );
})();
