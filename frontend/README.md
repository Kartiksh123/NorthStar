# Northstar frontend

A React and JavaScript interface for the Intelligent Database Platform backend.

## Run it locally

1. Start the backend from `../Backend` with `npm run dev`.
2. In this folder, run `npm install` once.
3. Run `npm run dev` and open the local URL printed by Vite (usually `http://localhost:5173`).

Vite forwards `/api` requests to `http://localhost:3000`, so the browser can use the backend without a separate CORS setup during local development. Set `VITE_API_URL` if the API uses another URL. For separate production hosting, put a reverse proxy in front of the API or configure CORS on the backend.

## Main files

- `index.html` is the browser page and React mount point.
- `src/main.jsx` starts React and imports the global styles.
- `src/App.jsx` owns login state, navigation, workspace data, and notifications.
- `src/services/api.js` keeps HTTP requests and bearer-token headers in one place.
- `src/components/AuthPage.jsx` handles sign-in and account creation.
- `src/components/Sidebar.jsx` provides workspace navigation.
- `src/components/OverviewPage.jsx` shows workspace totals and getting-started actions.
- `src/components/DatasetsPage.jsx` uploads files, lists datasets, and previews schemas and rows.
- `src/components/ConnectionsPage.jsx` saves PostgreSQL connections and inspects their schemas.
- `src/components/QueryPage.jsx` selects data sources, sends natural-language questions, and renders SQL results.
- `src/components/DataTable.jsx` displays dataset previews and query results.
- `src/styles.css` contains the shared colors, layout, and responsive styles.
- `vite.config.js` configures the React plugin and local API proxy.

## Build

Run `npm run build` to create a static production build in `dist/`. The query studio requires `GEMINI_API_KEY` in the backend `.env` file.
