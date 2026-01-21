import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Application from "./page";
import { UiLanguageProvider } from "./application/ui-language-provider";

import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UiLanguageProvider>
      <Application />
    </UiLanguageProvider>
  </StrictMode>,
);
