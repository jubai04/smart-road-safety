# Smart Road Safety reporting API

This service receives public road-safety reports and optional photos from the React app.

## Start locally

1. Copy `.env.example` to `.env` and set `CLIENT_ORIGIN` to the URL used by your React app.
2. Run `npm install`.
3. Run `npm run dev`.
4. Start the React app. The included `App.jsx` sends submissions to `http://localhost:4000/api/reports`.

Reports are saved to `data/reports.db`; uploaded images are kept in `uploads/`. These are deliberately ignored from source control in a real deployment and should be backed up or stored in managed services.

## Deploying

Deploy this service to a Node host (Render, Railway, Fly.io, etc.), set `CLIENT_ORIGIN` to the deployed React site, then update `REPORTS_API_URL` in `App.jsx` to `https://your-api-domain/api/reports`.

For a public production launch, use managed object storage (such as S3 or Cloudflare R2) and a managed SQL database instead of the local `uploads/` directory and SQLite file.
