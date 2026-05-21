# Google Cloud Deployment

## Backend on Cloud Run

Build and deploy from the repository root:

```bash
gcloud run deploy ai-service-orchestrator-api \
  --source ./backend \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars PROJECT_ID=YOUR_PROJECT_ID,LOCATION=asia-south1,MODEL_ID=gemini-2.5-flash,AUTH_TOKEN_SECRET=REPLACE_ME,NOTIFICATION_POLL_INTERVAL_MS=60000
```

Make sure the Cloud Run service account has access to Firestore and Vertex AI.
The backend uses Google Cloud application credentials in Cloud Run, so you do
not need to deploy a Firebase JSON key file.

After deployment, note the Cloud Run service URL. The API base URL is:

```text
https://YOUR_CLOUD_RUN_URL/api
```

## Backend environment variables

Required for production:

- `PROJECT_ID`: Google Cloud project id.
- `LOCATION`: Vertex AI region, for example `asia-south1`.
- `MODEL_ID`: Gemini model id used by the backend.
- `AUTH_TOKEN_SECRET`: strong secret for auth token signing.

Optional:

- `FIRESTORE_TIMEOUT_MS`: Firestore operation timeout, default `10000`.
- `NOTIFICATION_POLL_INTERVAL_MS`: scheduler poll interval, default `60000`.
- `NOTIFICATION_PROCESSOR_SECRET`: optional secret for `POST /api/notifications/process`.
- `FIREBASE_SERVICE_ACCOUNT_PATH`: local-only Firebase service account path. Do not use this for Cloud Run unless you intentionally mount a key.

## Notifications in production

The backend creates Firestore notification records for booking matches, reminders, provider status updates, completion, and cancellation.

Out-of-app mobile notifications require:

- The mobile app built with `expo-notifications`.
- A real device with notification permission granted.
- Successful Expo push token registration through `/api/notifications/register-token`.
- A reachable backend API URL in the mobile build.
- Firestore notification records with the correct recipient fields:
  - customer: `recipientRole: "user"` and `recipientUsername`
  - provider: `recipientRole: "provider"` and `recipientProviderId`

The backend starts an in-process notification scheduler when the server starts. It also exposes:

```text
POST /api/notifications/process
```

Use this endpoint from Cloud Scheduler only if you want an external backup processor. If `NOTIFICATION_PROCESSOR_SECRET` is set, include it as the `x-scheduler-secret` header.

## Frontend web export

From `mobile-app`, export the web app with the backend URL:

```bash
EXPO_PUBLIC_API_URL=https://YOUR_CLOUD_RUN_URL/api npx expo export --platform web
```

Upload `mobile-app/dist` to Firebase Hosting, Cloud Storage static hosting, or
another static host.

Web export supports the app UI and in-app notification feed. Expo mobile push notifications are for native mobile builds, not the web export.

## Mobile app builds

For mobile notification testing, use an EAS development, preview, or production build:

```bash
cd mobile-app
npx eas build --profile preview --platform android
```

Set `EXPO_PUBLIC_API_URL` in the build profile or shell environment so the device can reach the backend:

```bash
EXPO_PUBLIC_API_URL=https://YOUR_CLOUD_RUN_URL/api npx eas build --profile preview --platform android
```

For local development, localhost is expected:

```text
Frontend: http://localhost:19006
Backend:  http://localhost:5000
API:      http://localhost:5000/api
```

For physical-device testing, do not use `localhost` unless the backend is running on the phone. Use a deployed backend URL or your computer's LAN IP address.
