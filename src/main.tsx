
  import { createRoot } from "react-dom/client";
  import { registerSW } from "virtual:pwa-register";
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./app/ErrorBoundary.tsx";
  import { captureInstallPromptEvents } from "./app/pwa-install.ts";
  import "./styles/index.css";

  // Story 27.3: capture the native "Add to Home Screen" prompt as early as
  // possible so it can be replayed later from the offline media screen.
  captureInstallPromptEvents();

  registerSW({
    immediate: true,
    // Force un rechargement propre quand le nouveau SW prend le contrôle,
    // évitant la race condition où l'ancien index.html charge des chunks JS
    // avec des noms de hash que le nouveau SW ne connaît pas encore.
    onNeedRefresh() {
      window.location.reload();
    },
  });

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
