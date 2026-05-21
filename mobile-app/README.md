# AI Service Orchestrator Mobile App

Expo React Native app for customer booking, provider status workflows, saved sessions, in-app notification feeds, and out-of-app mobile notifications.

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

For a physical device, set a backend URL that the phone can reach:

```bash
EXPO_PUBLIC_API_URL=https://YOUR_BACKEND_SERVICE_URL/api npm start
```

## Notifications

The app uses `expo-notifications` in `services/notifications.js`.

### In-app notifications

Customer and provider screens poll `/api/notifications` every 15 seconds and render the latest notification records in the app.

### Out-of-app notifications

Out-of-app delivery has two layers:

1. Backend push notifications
   - On login, the app requests notification permission and registers the Expo push token with `/api/notifications/register-token`.
   - The backend sends Expo push messages when scheduled notification records become due.
   - This is the path that works when the app is backgrounded or closed.

2. Local mobile notifications
   - Future scheduled reminders are scheduled locally on the device.
   - Newly discovered immediate/recent notification records are shown once locally, so mobile testing does not rely only on backend push.
   - Scheduled local notification ids are stored in AsyncStorage by backend notification id to avoid duplicate alerts during polling.

### Notification requirements

- Use a physical device for reliable push delivery.
- Grant notification permission when the app asks.
- For Android, the app creates a `default` notification channel automatically.
- Web builds do not receive Expo mobile push notifications.
- Expo Go can have notification limitations; use an EAS development, preview, or production build for the closest production behavior.
- The backend API URL must be reachable by the device. `localhost` only works on the same machine, not on a phone.

### Quick notification test

1. Run the backend.
2. Start the mobile app on a physical device or EAS build.
3. Log in so the device token is registered.
4. Create a booking or update a booking status.
5. Background the app and wait for the notification.

If no out-of-app notification appears:

- Confirm the device allowed notifications for the app.
- Confirm the mobile app is using the deployed/reachable API URL.
- Confirm `/api/notifications` returns records for the current user/provider.
- Confirm the backend logs do not show `Push Notification Error`.
- Confirm the notification record has `recipientRole` and either `recipientUsername` or `recipientProviderId`.

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
