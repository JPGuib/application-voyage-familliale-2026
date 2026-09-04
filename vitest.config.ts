import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    css: false,
    // `vitest run` (npm run test, invoqué par .github/workflows/ci.yml avant
    // le build) charge tous les fichiers de test dans le même run. Plusieurs
    // d'entre eux montent l'App.tsx complète (~19k lignes) dans jsdom ; avec
    // le pool de workers par défaut (voire même avec seulement 2 forks
    // parallèles, testé le 2026-09-04), leur mémoire cumulée dépasse la RAM
    // disponible et fait planter le worker ("Channel closed" / tinypool OOM).
    // Un seul fork = tests séquentiels, plus lents mais fiables : c'est la
    // seule configuration qui a terminé sans planter sur cette machine.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // L'exécution séquentielle (un seul fork) partage le CPU entre les 400+
    // tests plutôt qu'en parallèle : certains tests d'intégration lourds
    // (rendu complet de App.tsx) peuvent alors dépasser le timeout par
    // défaut de vitest (5s) sans qu'il y ait de régression réelle.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
