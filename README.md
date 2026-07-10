
  # Application de voyage familiale

  This is a code bundle for Application de voyage familiale. The original project is available at https://www.figma.com/design/0TaZ4rahuQHyodJ52DSFJz/Application-de-voyage-familiale.

  ## Running the code

  Run `npm i` to install the dependencies.

  Copy `.env.example` to `.env.local` and fill Firebase variables if you want multi-device sync.

  Run `npm run dev` to start the development server.

  ## Tests

  Run `npm run test` to execute unit and integration tests.

  Owner governance integration tests are in `src/app/owner-governance.integration.test.ts`.
  They do not require a Firebase emulator because they validate the core policy layer and hashing flow directly.

  ## Epic 6

  The app now ships with a PWA service worker generated at build time. Run `npm run build` to produce the offline shell and precached assets.

  For Vercel deployment, import the repository into Vercel and keep the default Vite settings:

  - Build command: `npm run build`
  - Output directory: `dist`

  Add the same environment variables in Vercel Project Settings (`VITE_FIREBASE_*` and `VITE_FAMILY_SYNC_ID`).

  The repository includes `vercel.json` for service worker and manifest headers.
  