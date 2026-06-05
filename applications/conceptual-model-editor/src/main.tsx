import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Application from "./page";
import { QualifierTestPage } from "./dev/demo-page";

import "./main.css";

const DEV_TEST = true;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {DEV_TEST ? <QualifierTestPage /> : <Application />}
  </StrictMode>,
);
