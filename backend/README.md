# Backend

Express API for AI Service Orchestrator. It handles authentication, provider matching, booking storage, booking status transitions, notification records, and Expo push delivery.

## Local Setup

```bash
npm install
npm start
```

The server listens on `PORT` or `5000` by default.

## Environment Variables

Required for deployed AI responses:

- `PROJECT_ID`: Google Cloud project id.
- `LOCATION`: Vertex AI region, default `asia-south1`.
- `MODEL_ID`: Gemini model id, default `gemini-2.5-flash`.
- `AUTH_TOKEN_SECRET`: auth token signing secret. Set a strong value in production.

Optional:

- `PORT`: API port, default `5000`.
- `FIRESTORE_TIMEOUT_MS`: Firestore operation timeout, default `10000`.
- `NOTIFICATION_POLL_INTERVAL_MS`: notification scheduler poll interval, default `60000`.
- `NOTIFICATION_PROCESSOR_SECRET`: optional secret for manual/scheduled notification processing.
- `FIREBASE_SERVICE_ACCOUNT_PATH`: local Firebase service account file path. In Cloud Run, prefer the service account attached to the service.

## API Routes

- `POST /api/auth/register`: create customer or provider account.
- `POST /api/auth/login`: log in and return account/session data.
- `PATCH /api/auth/profile`: update profile details.
- `PATCH /api/auth/password`: update password.
- `POST /api/analyze`: parse a service request, match a provider, create a booking, and create notification records.
- `GET /api/bookings`: list bookings by customer username or provider id.
- `PATCH /api/bookings/:id/status`: move a booking through status transitions or cancel it.
- `GET /api/providers`: list providers.
- `GET /api/notifications`: list notification records for a customer or provider.
- `POST /api/notifications/register-token`: save an Expo push token for out-of-app notifications.
- `POST /api/notifications/process`: process due scheduled notifications. Use `x-scheduler-secret` when `NOTIFICATION_PROCESSOR_SECRET` is configured.

## Notifications

Notification records are stored in Firestore with `status: "scheduled"` until processed.

The backend sends Expo push notifications through `services/pushService.js` when:

- the in-process scheduler reaches a due `scheduledFor` time;
- `/api/notifications/process` is called and finds due records.

The mobile app must register its Expo push token before the backend can deliver push notifications. Tokens are matched by:

- customers: `role=user` plus normalized `username`
- providers: `role=provider` plus numeric `providerId`

If `pushSent` is `0`, either no matching token was registered or delivery was skipped/failed.
