# Desert Silk Fragrances

Vite storefront with Motion animations and Motion Studio in development. The Arabian heritage design uses emerald, warm cream, antique gold, and arched product displays. The spray introduction is disabled on all devices. Product detail pages and the demo shopping bag are preserved.

## Start locally

Install Node.js 24 or later and pnpm. Read [BACKEND-SETUP.md](BACKEND-SETUP.md) for the working custom backend and private admin dashboard. For storefront development, run these commands in this folder:

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:5173 and click **Open Motion timeline**. Entrance animations are recorded on page load; hover over a product or open and close the bag to record those interactions.

## Connect Studio to Codex

Copy `.env.example` to `.env.local` to select Codex as the agent provider. Sign into the Codex CLI from your own terminal with `codex login`, then restart the development server. The Codex SDK is included. Agent editing may require a Motion Studio plan; the timeline can be used independently of connecting an agent.

## Publish

```sh
pnpm build
```

Upload the **contents of `dist/`** to your existing GitHub Pages website, including the `assets/` folder, both HTML files, and all product photos. The build uses relative paths so it also works under a GitHub repository URL. Motion Studio is excluded from this production build.

## Files

- `catalog.js`: backend catalog loading and static fallback
- `seed-catalog.js`: initial demo product data and photos
- `admin.html`, `admin.js`, `admin.css`: owner dashboard
- `backend/`: private API, SQLite storage, tests and backup utility
- `main.js`: homepage and category filtering
- `product-page.js`: product details and quantity controls
- `store.js`: shared session shopping bag and bag animations
- `motion-effects.js`: entrances and hover animations
- `spray-intro.js`: archived spray effect (not loaded)
- `vite.config.js`: three-page build, API proxy and Motion Studio plugin

This remains a demo: prices and inventory are examples, and checkout is not connected. The bag persists between pages for the current browser session. Animations respect the visitor's reduced-motion setting.


Product discovery includes combined name/brand/scent-note search, brand selection, scent filters, result counts, and clear-filter controls. With the backend running, products load from SQLite and customer reviews are saved for owner approval. Without the backend, the static demo uses seed products and review previews. Online checkout, payments and emails remain unconnected. GitHub Pages cannot run the admin backend.



## October 29 catalog update

The public catalog snapshot includes 92 published products: the original 13 demo items and 79 new perfumes priced at $40 with one in stock each. All 82 prepared bottle photos are included, and their ivory backgrounds blend into the arched collection and product frames.

`seed-catalog.js` also supplies the static storefront when a backend is unavailable. A new backend database imports the published snapshot. Existing backend databases receive missing products once per catalog release; later restarts preserve stock changes and owner edits. The three original bundled photos are refreshed only if they have not been replaced by the owner.

Private SQLite databases, owner credentials, sessions, orders, backups, local photo paths and research manifests are excluded. GitHub Pages serves the storefront preview; the working admin still requires the Node backend described in HOSTING.md. Building and pushing source does not deploy that backend.
