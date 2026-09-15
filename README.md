# Plovdiv-Flow
Real-time traffic monitoring and analytics platform for Plovdiv, Bulgaria


![Plovdiv Flow preview](docs/preview.png)


## Development

Run the backend API:

```powershell
cd backend
npm run dev
```

Run the frontend:

```powershell
cd frontend
npx vite --host 127.0.0.1 --port 5174
```

The frontend calls `/api/routes`, which is proxied to the backend on port `8787`.

## Routing

The frontend does not call paid routing providers directly. The backend owns route
calculation through `/api/routes`.

For development, the backend uses public demo routing endpoints so routes follow
the road network without an API key:

- car routes use OSRM
- bike and walk routes use Valhalla

```env
OSRM_BASE_URL=http://localhost:5000
VALHALLA_BASE_URL=http://localhost:8002
```

This keeps the final app free of paid API dependencies and keeps provider logic
out of the browser.
# Traffic-aware car routing

Car routes use TomTom with live traffic and departure set to now when
`TOMTOM_API_KEY` is set in the ignored `backend/.env` file. The server loads
this file automatically. No paid plan is enabled by the application.

`TOMTOM_DAILY_LIMIT` defaults to 100 and cannot exceed 100. Attempts are
counted before sending, persisted in `backend/.traffic-usage.json`, and
reset by UTC date. Keep this file across restarts. This local counter is
for one server instance; it does not account for other apps using the same
TomTom account. Keep the provider account on its free plan without paid
overage. Do not delete the counter to reset usage.

Missing credentials, exhausted budget, or provider errors fall back to
OSRM without live traffic. The sidebar identifies missing traffic data.
Traffic is fetched when calculating a car route, not continuously refreshed.
Bike and walking routes still use Valhalla. Traffic map overlays are not
connected. Route traffic and a colored traffic map are separate features.
