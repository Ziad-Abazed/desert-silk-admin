# Put the working dashboard online

GitHub stores the code. GitHub Pages cannot run the private API or SQLite database. The Render template in this repository runs the existing storefront and admin together on a Node server. It has not been deployed. Render requires a paid web service for the persistent disk used here. Review its price before creating the service.

1. Sign in to Render and connect this GitHub repository.
2. Create a Blueprint using `render.yaml`, review the service and disk costs, and configure its environment variables privately.
3. Set `APP_ORIGIN` to the exact HTTPS service URL with no trailing slash. Set `OWNER_USERNAME` and a unique `OWNER_PASSWORD` of at least 12 characters. Never put credentials in repository files or chat.
4. On first startup the server creates the owner account using those secrets only if no owner exists. Existing owner credentials are not overwritten on redeployment.
5. Open the deployed service URL ending in `/admin.html`. The root URL remains the perfume storefront.

Confirm login, product edits, review approvals and persistence after redeploy before using real customer data. Uploads and the database must remain on the persistent disk. Keep private backups. Payments, customer checkout and automated emails are still separate launch work.

Reference: https://render.com/docs/disks and https://render.com/docs/blueprint-spec
