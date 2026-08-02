
  import { createRoot } from "react-dom/client";
  import { registerSW } from "virtual:pwa-register";
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./app/ErrorBoundary.tsx";
  import "./styles/index.css";

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
