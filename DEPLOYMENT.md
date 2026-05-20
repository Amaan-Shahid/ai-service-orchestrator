# Google Cloud Deployment

## Backend on Cloud Run

Build and deploy from the repository root:

```bash
gcloud run deploy ai-service-orchestrator-api \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars PROJECT_ID=YOUR_PROJECT_ID,LOCATION=us-central1,MODEL_ID=gemini-2.5-flash,AUTH_TOKEN_SECRET=REPLACE_ME
```

Make sure the Cloud Run service account has access to Firestore and Vertex AI.
The backend uses Google Cloud application credentials in Cloud Run, so you do
not need to deploy a Firebase JSON key file.

After deployment, note the Cloud Run service URL. The API base URL is:

```text
https://YOUR_CLOUD_RUN_URL/api
```

## Frontend web export

From `mobile-app`, export the web app with the backend URL:

```bash
EXPO_PUBLIC_API_URL=https://YOUR_CLOUD_RUN_URL/api npx expo export --platform web
```

Upload `mobile-app/dist` to Firebase Hosting, Cloud Storage static hosting, or
another static host.

For local development, localhost is expected:

```text
Frontend: http://localhost:19006
Backend:  http://localhost:5000
API:      http://localhost:5000/api
```
