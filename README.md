# AI Service Orchestrator

AI Service Orchestrator is a full-stack service booking demo with:

- An Express backend for auth, provider matching, bookings, status updates, Firestore persistence, and notifications.
- An Expo React Native app for customers and providers.
- In-app notification feeds plus out-of-app mobile notifications through Expo Notifications.

## Project Structure

```text
backend/      Express API, Firestore services, AI/provider agents, notification scheduler
mobile-app/   Expo app for customer and provider workflows
DEPLOYMENT.md Cloud Run and Expo deployment notes
```

## Local Development

Start the backend:

```bash
cd backend
npm install
npm start
```

Start the app:

```bash
cd mobile-app
npm install
npm run web
```

Default local API URLs:

- Web and iOS simulator: `http://localhost:5000/api`
- Android emulator: `http://10.0.2.2:5000/api`
- Physical device: set `EXPO_PUBLIC_API_URL` to a reachable backend URL.

## Notifications

The system stores notification records in Firestore. The mobile app reads those records for the in-app notification panels.

Out-of-app notifications use two paths:

- Backend push: the backend sends Expo push notifications to registered device tokens when scheduled notifications are due.
- Local mobile fallback: the app schedules future reminders locally and presents newly discovered immediate notifications once.

Important limits:

- Out-of-app notifications require notification permission.
- Production push delivery requires a real mobile device and a valid Expo project/build configuration.
- Web cannot show Expo mobile push notifications.
- Expo Go can be limited for push testing; use a development build or preview/production build for the most reliable test.

See [mobile-app/README.md](mobile-app/README.md) for mobile-specific notification testing and [DEPLOYMENT.md](DEPLOYMENT.md) for Cloud Run/EAS setup.

## Useful Commands

```bash
cd backend && npm start
cd mobile-app && npm run web
cd mobile-app && npm run preview:web
cd mobile-app && npx expo lint
```

`npx expo lint` requires `eslint` to be installed in the mobile app dependencies.
