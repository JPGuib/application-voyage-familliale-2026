
  # Application de voyage familiale

  This is a code bundle for Application de voyage familiale. The original project is available at https://www.figma.com/design/0TaZ4rahuQHyodJ52DSFJz/Application-de-voyage-familiale.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Epic 6

  The app now ships with a PWA service worker generated at build time. Run `npm run build` to produce the offline shell and precached assets.

  For Vercel deployment, import the repository into Vercel and keep the default Vite settings:

  - Build command: `npm run build`
  - Output directory: `dist`

  The repository includes `vercel.json` for service worker and manifest headers.
  