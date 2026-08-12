import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { purgeLegacyStorage } from "./lib/legacyStorage";

// P1: remove the retired visitor UUID and local health-consent flag from every
// browser that still carries them, before any app code runs.
purgeLegacyStorage();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

