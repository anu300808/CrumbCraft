# CrumbCraft v2

Three tiers: browser UI (`public/`) → Express REST API (`server/`) → JSON database (`server/data/db.json`).
Pricing, BOM forecasting, capacity and order validation live in `shared/logic.js`, so the server and the browser use the same rules and the server never trusts client prices.

    npm install
    npm start        # http://localhost:3000
    npm test         # unit tests + API tests

Opening the site asks whether you are a customer or the baker. Bakers see only incoming orders (cake details, ingredients per order, daily totals) and move each order through Received → In making → Ready → Completed; customers see an animated cake tracker for their own orders.

Baker login: `baker@crumbcraft.demo` / `baker123`. Set `SESSION_SECRET` in production so logins survive restarts.

API: `GET /api/capacity` · `POST /api/auth/signup|login` · `GET /api/me` · `POST /api/orders` · `GET /api/orders` · `GET /api/forecast/:date` (baker) · `POST /api/reset` (baker)
