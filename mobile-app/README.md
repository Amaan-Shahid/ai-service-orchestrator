# AI Service Orchestrator Mobile App

Expo React Native app for customer booking and provider status workflows.

## Local development

Start the backend first:

```bash
cd ../backend
npm install
npm start
```

Then start the frontend:

```bash
cd ../mobile-app
npm install
npm run web
```

During local development the app uses `http://localhost:5000/api` on web,
or `http://10.0.2.2:5000/api` on the Android emulator.

## Google Cloud deployment

Deploy the backend to Cloud Run or App Engine, then set the frontend API URL
before exporting or building:

```bash
EXPO_PUBLIC_API_URL=https://YOUR_BACKEND_SERVICE_URL/api npm run web
```

For a web export:

```bash
EXPO_PUBLIC_API_URL=https://YOUR_BACKEND_SERVICE_URL/api npx expo export --platform web
```

The exported site is created in `dist/` and can be hosted on Firebase Hosting,
Cloud Storage static hosting, or another static web host.

Preview the exported site locally:

```bash
npm run preview:web
```

## Provider accounts

Customers register from the app before logging in. Existing provider login
credentials are stored on each provider record in
`../backend/dataset/providers.json`.
