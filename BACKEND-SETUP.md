# Desert Silk custom backend

## Start

Install Node.js 24 or later and pnpm. Run `pnpm install`, `pnpm build`, then `pnpm start` in this folder. Open http://127.0.0.1:8787/admin.html and choose your owner username and a password of at least 12 characters. No default owner password exists. Save your credentials privately; dashboard password recovery is not yet available.

Storefront: http://127.0.0.1:8787/. For Vite/Motion Studio development, leave the backend running and run `pnpm dev` in another terminal. Port 5173 proxies API and uploaded-photo requests to 8787.

## Working features

- Private owner login, salted password hashing, eight-hour HttpOnly sessions, CSRF/origin validation, and login rate limits.
- Add/edit products, photos, brands, descriptions, notes, prices, bottle sizes, stock and visibility. Hide products by unchecking Published. JPEG/PNG/WebP uploads up to 5 MB.
- Catalog updates appear after storefront refresh. Existing 13 seed products have demo pricing and unknown stock; enter actual quantities before recording orders.
- Manual orders reserve stock transactionally. Insufficient stock rejects the whole order. $6.99 shipping applies to the 48 contiguous states. Cancelled orders restore stock once. Shipped orders require carrier/tracking text.
- Customer review submissions persist privately until approved. Only approved reviews appear publicly. No verified-purchase labels are assigned.
- Recent activity log and SQLite persistence.

## Remaining launch work

Checkout, payments, optional customer accounts, automatic order/shipping emails and public hosting are not connected. Manual orders remain unpaid and do not charge customers. The shopping bag remains a session demo. The current design and Motion effects are preserved; the spray intro stays disabled.

## Private storage

Database: `data/store.sqlite`. Photos: `data/uploads/`. Never publicly upload or commit `data/`, `backups/` or `.env.local`. Run `pnpm backup` to save a consistent database snapshot and uploaded photos in `backups/`. Keep private backups outside this computer as well. For an exact restore, stop the backend, restore the data directory from a backup, then restart.

## Hosting

GitHub Pages can show the static demo, but cannot run this backend. A live store needs a Node 24 host with persistent storage, HTTPS and a reverse proxy. Configure HOST, PORT and the exact HTTPS APP_ORIGIN for deployment. Public owner setup is disabled; provision the owner locally and transfer the private data securely. Use one server instance with its SQLite database on a persistent local disk. Production deployment has not been performed or verified.

Static builds fall back to the seed catalog when no API exists. Admin functions and uploaded server photos require the backend.

## Checks

`pnpm test` validates owner access, CSRF/origin rejection, stock validation, overselling rejection, cancellation, shipping-state restrictions, review approval, persistence after restart, and logout. `pnpm build` creates all three pages.
