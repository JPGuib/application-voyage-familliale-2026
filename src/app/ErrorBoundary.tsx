import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

// Filet de sécurité global : sans ça, la moindre exception dans un rendu ou
// un effet fait disparaître toute l'appli (écran blanc), sans aucun message
// ni moyen de s'en sortir autrement qu'en rechargeant à l'aveugle.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erreur applicative interceptée :", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#B8A898] flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-background rounded-3xl shadow-2xl p-6 text-center">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-lg font-black text-foreground mb-2">
              Oups, un problème est survenu
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              L&apos;application a rencontré une erreur inattendue. Rechargez la page pour
              continuer — votre progression sauvegardée n&apos;est pas perdue.
            </p>
            <p className="text-xs text-muted-foreground/70 mb-4 break-words">
              Détail technique : {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-primary-foreground rounded-2xl py-3 text-sm font-black active:scale-95 transition-transform"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
