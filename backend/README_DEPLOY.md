Backend deployment notes
========================

This file contains quick deploy notes for the Express backend used by the Vanuatu Smart Transport project.

Start command (production):

```bash
node server.js
```

Development command (local):

```bash
npm run dev
```

Health check
- The server exposes a simple health endpoint at `/` which returns `{ "status": "ok" }`.

Environment variables
- Configure these in your host (Render / Heroku / etc) or in a `.env` file locally (backend reads via `dotenv`):

```
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vanuatu_transport
PORT=5001  # optional locally; platforms set PORT automatically
```

Render / Platform notes
- Use `node server.js` as the start command in production. Do not use `nodemon` as it is a dev watcher.
- Ensure the service's environment has `PORT` set by the platform (Render sets it automatically). The server will bind to `process.env.PORT`.
- If you see 502, check platform logs for DB connection errors or binding issues.

Security
- For production use stronger passwords and do not commit `.env` to source control.
