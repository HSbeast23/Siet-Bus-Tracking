## 1. Project Title

SiET Bus System

## 2. Overview

SiET Bus System is a React Native (Expo managed) mobile application that serves students, drivers, bus incharge staff, and management at SIET College. It delivers live bus tracking, route visibility, fleet status, and reporting workflows backed by Firebase services and a lightweight notification relay.

## 3. Problem Statement

Campus commuters need a dependable way to know where each institute bus is, which stops are next, and how to raise transport issues. Transport staff likewise require real-time visibility into every bus, student ridership, and incident reports without switching tools.

## 4. Solution Description

The app centralizes live GPS feeds, route metadata, student rosters, and report handling on Android/iOS using a single Expo project. Firestore stores buses, routes, users, and reports; drivers update their position via background tasks; students and staff visualize each trip on Google Maps; and a Node/Express relay forwards Firebase Cloud Messaging notifications when trips start.

## 5. Key Features

- **Role-aware authentication:** `authService` validates students, drivers, bus incharge staff, and management against Firestore documents and cached credentials in [src/services/authService.js](src/services/authService.js).
- **Live Google Maps tracking:** `MapScreen` (students/staff) and `BusLiveTrackingScreen` (management/bus incharge) render bus markers, stop timelines, and OSRM-derived polylines using `react-native-maps` with Google tiles in [src/screens/MapScreen.js](src/screens/MapScreen.js) and [src/screens/BusLiveTrackingScreen.js](src/screens/BusLiveTrackingScreen.js).
- **Driver telemetry pipeline:** `DriverDashboard` orchestrates permission prompts, background tasks, Firestore writes, and trip session logging so buses broadcast continuously, as seen in [src/screens/DriverDashboard.js](src/screens/DriverDashboard.js), [src/services/backgroundLocationService.js](src/services/backgroundLocationService.js), and [src/services/locationService.js](src/services/locationService.js).
- **Fleet management dashboards:** Management and bus incharge roles monitor every bus, driver status, and student count directly from Firestore subscriptions in [src/screens/BusManagement.js](src/screens/BusManagement.js) and inspect rosters plus stop lists in [src/screens/BusDetails.js](src/screens/BusDetails.js).
- **Student self-service:** Students access quick actions, push notifications, and reporting tools inside [src/screens/StudentDashboard.js](src/screens/StudentDashboard.js) and [src/screens/StudentReportScreen.js](src/screens/StudentReportScreen.js), while `reportsService` persists and filters submissions in [src/services/reportsService.js](src/services/reportsService.js).
- **Push notification relay:** Device tokens are captured via `@react-native-firebase/messaging` inside [src/services/pushNotificationService.js](src/services/pushNotificationService.js) and relayed through the Express server in [server/src/index.js](server/src/index.js) and [server/src/routes/busRoutes.js](server/src/routes/busRoutes.js), which invoke Firebase Admin helpers in [server/src/services/notificationService.js](server/src/services/notificationService.js).
- **Route intelligence:** Stops, colors, and OSRM helpers live in [src/utils/constants.js](src/utils/constants.js) and [src/utils/routePolylineConfig.js](src/utils/routePolylineConfig.js), ensuring each bus shows consistent metadata even if Firestore data is incomplete.

## 6. Tech Stack

- **React Native + Expo:** Single codebase for Android/iOS with Expo’s managed workflow so native modules (maps, task manager) and custom fonts configured in [App.js](App.js) run consistently.
- **React Navigation:** `AppNavigator` in [src/navigation/AppNavigator.js](src/navigation/AppNavigator.js) defines the stack for every persona, simplifying guarded transitions between dashboards.
- **Firebase (Auth, Firestore, Cloud Messaging):** Initialized in [src/services/firebaseConfig.js](src/services/firebaseConfig.js) to store users, buses, reports, and push tokens while keeping device sessions synced.
- **Expo Location & Task Manager:** Background driver tracking is powered by `expo-location` and `expo-task-manager` so the GPS task defined in [src/services/backgroundLocationService.js](src/services/backgroundLocationService.js) keeps broadcasting even when minimized.
- **react-native-maps (Google Maps SDK):** Provides performant vector maps and camera controls required for live tracking overlays.
- **Node/Express + firebase-admin:** The backend under [server/](server) brokers push notifications without exposing server keys to the client.

## 7. Google Maps Integration

- **Library:** Both map screens import `MapView`, `Marker`, `Polyline`, and `PROVIDER_GOOGLE` from `react-native-maps` (see [src/screens/MapScreen.js](src/screens/MapScreen.js) and [src/screens/BusLiveTrackingScreen.js](src/screens/BusLiveTrackingScreen.js)).
- **Why Google Maps:** Native Google tiles provide reliable coverage for Coimbatore, precise camera control, and marker animations needed for live buses and stop sequencing.
- **Rendering flow:** Stops are normalized, OSRM geometry is fetched via `buildOsrmRouteUrl`, and then the app fits all coordinates while overlaying animated bus markers. Firestore listeners (`subscribeToBusLocation`) push each location delta onto the map in realtime, and map refs call `fitToCoordinates` or `animateCamera` for follow mode.

## 8. Application Flow

- Users land on `WelcomeScreen`, then `UnifiedLoginScreen` routes them by role via the stack configured in [src/navigation/AppNavigator.js](src/navigation/AppNavigator.js).
- **Students:** After auth, `StudentDashboard` exposes quick actions (track bus, routes, reports). Selecting tracking opens `MapScreen`, which subscribes to Firestore buses and renders stops plus ETAs.
- **Bus Incharge / Management:** Dashboards jump into `BusManagement` for fleet overview, `BusDetails` for rosters, and `BusLiveTrackingScreen` for focused tracking. They can traverse to route management, attendance, analytics, or reports as needed.
- **Drivers:** `DriverDashboard` enforces permissions, starts/stops background tasks, updates Firestore via `updateBusLocation`, and pings the notification relay so riders get start alerts.
- **Reports:** Students submit issues via `StudentReportScreen`; `reportsService` creates Firestore docs that management/bus incharge view through their respective report screens.

## 9. Project Structure

- **App entry:** [App.js](App.js) handles font loading, FCM token sync, and mounts `NavigationContainer`.
- **Navigation:** [src/navigation](src/navigation) hosts the stack and any auxiliary navigators.
- **Screens:** [src/screens](src/screens) contains persona-specific UI (dashboards, management tools, live maps, reports, attendance, etc.).
- **Services:** [src/services](src/services) centralizes Firebase adapters (auth, location, push, reports, trip sessions, background tracking) plus HTTP clients.
- **Utilities:** [src/utils](src/utils) stores theme constants, route definitions, and helper functions.
- **Notification server:** [server](server) exposes `/startBus` and `/notify` endpoints using Express and Firebase Admin.
- **Scripts & data:** [scripts](scripts) and [Bus_data](Bus_data) provide CSV import helpers for seeding Firestore.

## 10. Installation & Setup

1. **Install dependencies**

- `npm install` inside the project root.
- `cd server && npm install` for the notification relay.

2. **Run the mobile app**

- `npx expo start --dev-client` for local development.
- `npm run android` or `npm run ios` to build a dedicated dev client with the required native modules.

3. **Run the notification relay**

- `cd server && npm run dev` for live-reload, or `npm start` for a production-style launch.

4. **Optional build tooling**

- `npm run build` (Gradle debug) and `npm run eas` (cloud builds) are configured in [package.json](package.json).

## 11. Configuration Notes

- Firebase project credentials, notification relay endpoints, and Google Maps platform keys are intentionally excluded from the repository. Provide them through your secure Expo configuration or CI secrets before running builds so `firebaseConfig`, `pushNotificationService`, and the native map SDK can initialize correctly.
- The client automatically infers the relay base URL (see [src/services/backendClient.js](src/services/backendClient.js)) but still expects a reachable server on port 4000 or whichever host you configure privately.

## 12. Limitations

- `CONFIG.API_BASE_URL` still points to a placeholder (`http://localhost:3000/api`); axios wrappers in [src/services/api.js](src/services/api.js) are present but not wired to live endpoints.
- Route data depends on Firestore documents or the static config; if a bus lacks stop data, the map falls back to default stops and straight-line segments.
- The notification relay only exposes `/startBus` and `/notify` and does not authenticate callers, so deploy behind a trusted network or add auth before production use.
- Background GPS relies on Expo’s task manager; users must install a dev client or standalone build because Expo Go cannot execute background tasks with these native modules.
- There is no automated testing or CI, so regressions must be caught manually.

## 13. Future Enhancements

1. Implement authenticated REST endpoints (or GraphQL) to back the axios client so management CRUD screens persist changes outside of Firestore-only logic.
2. Add offline caching and retry queues for driver telemetry to cover poor network zones and reduce Firestore write contention.
3. Extend the notification relay to broadcast arrival/departure events, include rate limiting, and secure it with API tokens or mutual TLS.
4. Capture analytics/health metrics (e.g., background task uptime, OSRM latency) to surface issues to admins proactively.

## 14. Conclusion

SiET Bus System ties together live GPS tracking, fleet oversight, and student communications with a pragmatic Expo + Firebase stack. By combining Firestore listeners, Google Maps rendering, and a minimal FCM relay, the app gives every campus personal the same real-time source of truth. Configure your private credentials, seed Firestore with the latest bus data, and run both the Expo client and notification server to operate it in production.

# SIET Bus Tracking System`````# SIET Bus Tracking System# SIET Bus Tracking System

A React Native + Expo application that powers real-time tracking for the Sri Shakthi Institute bus fleet. The app targets four personas—students, bus incharge staff, drivers, and management—and synchronises data with Firebase for authentication, storage, and live location updates.Real-time GPS bus tracking with smooth animations for students, drivers, and management.A comprehensive React Native mobile application for real-time bus tracking with separate interfaces for drivers, students, and management.

---## Features## � Features

## Current Status (October 2025)- **Smooth animated bus movement** - No jumping markers

- ✅ "Co-Admin" role renamed to **Bus Incharge** across navigation, screens, and services.

- ✅ Live map (`MapScreen`) renders OpenStreetMap tiles, OSRM-generated polylines, and a draggable stop timeline showing **current** and **next** stops.- **Real-time path trail** - See the exact route traveled### Driver Portal

- ✅ Driver workflow publishes foreground/background GPS points to Firestore through `backgroundLocationService`.

- ✅ Management & Bus Incharge dashboards consume the same Firestore feed to display bus, driver, and student data.- **Auto-follow camera** - Camera rotates with bus direction

- ✅ CSV onboarding script seeds buses, drivers, and students.

- ⚠️ Pending: finish onboarding for 30+ buses, move Google Maps/third-party keys into `.env`, and add automated tests.- **Live GPS updates** - Updates every 2 seconds- Real-time GPS tracking with live location updates

---- **Bus heading rotation** - Marker shows direction of travel- Start/Stop tracking functionality

## Personas & Feature Highlights- Driver authentication and profile management

- **Students**

  - Unified login with bus selection.## Quick Start

  - Live map with ETA labels, stop timeline, and attendance history.

  - Report/feedback flows tied to Firestore collections.````bash### Student Portal

- **Bus Incharge (formerly Co-Admin)**

  - Dashboard shortcuts for bus, driver, student, attendance, map, and reporting.npm install

  - Bottom navigation (`BusInchargeBottomNav`) for Home / Track / Profile.

  - Report composer (`BusInchargeReportScreen`) stores submissions for management review.npx expo start- Track assigned bus in real-time

- **Drivers**

  - Start/stop tracking via Expo Location + Task Manager.```- View bus location on interactive map

  - Background task (`driver-background-location-task`) keeps updates flowing when minimised.

  - Profile management and attendance utilities.- Real-time status updates

- **Management**

  - Fleet-wide dashboards, attendance history, analytics, and report handling.## Tech Stack

  - CSV based onboarding and bus assignment tools.

- React Native + Expo### Management Portal

---

- Firebase Firestore (real-time sync)

## Live Tracking Stack

- **Map Rendering:** `react-native-maps` with OpenStreetMap `UrlTile` overlay.- Google Maps with animations- Monitor all buses in real-time

- **Routing:** `utils/routePolylineConfig.js` defines default stops and builds OSRM URLs (`buildOsrmRouteUrl`). Response geometry drives the polyline rendered on the map.

- **Progress Engine:** `MapScreen` computes nearest stop, arrival thresholds, ETA labels, and animates a bottom sheet that expands to reveal the full stop list.- Expo Location (GPS tracking)- Live tracking dashboard for each bus

- **Data Source:** Firestore `buses/{busNumber}` document updated by drivers through `updateBusLocation`.

- **Throttling:** Updates below 20 m movement or 4 s interval are skipped to reduce Firestore writes.- Driver and student management

---## GPS Settings- Bus fleet management

## Services & Data Flow- Accuracy: BestForNavigation- Reports and analytics

- **Authentication (`src/services/authService.js`)**

  - Role-aware login (student, driver, bus incharge, management) with bus number validation.- Update interval: 2 seconds

  - AsyncStorage persistence for offline resume and session caching.

- **Location (`src/services/locationService.js` & `backgroundLocationService.js`)**- Distance threshold: 5 meters## 📁 Project Structure

  - Normalises bus IDs (e.g. `SIET--005` → `SIET-005`).

  - Tracks active driver sessions, prevents stale updates, and supports background execution.- Smooth marker animation: 1000ms

- **Attendance & Reports:** Dedicated services manage Firestore reads/writes for attendance history and report escalations.

- **Media Handling:** `cloudinaryService.js` prepares image uploads if Cloudinary credentials are supplied.````

- **CSV Import (`scripts/importCSV.js`)**

  - Parses institute CSVs (`Bus_data/`) and writes bus, driver, and student documents.## Rolessietbusapp/

  - Requires `serviceAccountKey.json` (Firebase Admin) at the project root.

- **Driver**: Start/stop tracking with enhanced GPS├── App.js # Main app entry point

---

- **Student**: See bus with smooth movement + path trail├── index.js # App registration

## Project Layout

`````- **Admin**: Monitor all buses with auto-follow camera├── app.json # Expo configuration

sietbusapp/

├── App.js                     # Expo bootstrap & font loading├── package.json # Dependencies

├── app.json                   # Expo application manifest├── firestore.rules # Firebase security rules

├── package.json               # Scripts & dependencies├── assets/ # Images and static files

├── assets/                    # Images and static content└── src/

├── Bus_data/                  # Source CSVs for onboarding├── components/ # Reusable UI components

├── scripts/importCSV.js       # Firestore import utility│ ├── ui/ # Base UI components (Button, Card, Input)

├── android/                   # Generated native Android project│ ├── AuthGuard.js

└── src/│ └── AuthStatus.js

    ├── components/            # Shared UI & navigation elements├── navigation/ # Navigation configuration

    ├── navigation/AppNavigator.js│ └── AppNavigator.js

    ├── screens/               # >30 persona-specific screens├── screens/ # All app screens

    ├── services/              # Firebase, auth, attendance, reports, location│ ├── Driver screens (Dashboard, Login, Signup)

    └── utils/                 # Constants, polyline config, helpers│ ├── Student screens (Dashboard, Login, Signup)

```│ ├── Management screens (Dashboard, Login)

│ ├── MapScreen.js (Student tracking)

---│ ├── BusLiveTrackingScreen.js (Admin tracking)

│ └── Shared screens

## Prerequisites├── services/ # Backend services

- Node.js 18+│ ├── authService.js # Authentication

- Expo CLI (`npm install -g expo-cli`) and Expo Dev Client installed on device/emulator│ ├── locationService.js # GPS & Firestore location

- Android Studio / Xcode for native builds│ ├── firebaseConfig.js # Firebase setup

- Firebase project with Firestore & Auth enabled│ └── storage.js # Local storage

└── utils/ # Utility functions

---└── constants.js # App constants (colors, etc.)



## Getting Started````

1. **Clone & Install**

   ```bash## �️ Technologies

   git clone https://github.com/Haarhish-vs/Siet-Bus-Tracking.git

   cd Siet-Bus-Tracking/sietbusapp- **React Native** - Mobile app framework

   npm install- **Expo** - Development platform

   ```- **Firebase Firestore** - Real-time database

2. **Configure Environment Variables** (`.env` in project root)- **Firebase Auth** - User authentication

   ```env- **Expo Location** - GPS tracking

   EXPO_PUBLIC_FIREBASE_API_KEY=...- **React Navigation** - Navigation system

   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...- **React Native Maps** - Map integration

   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...

   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...## 📦 Installation

   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...

   EXPO_PUBLIC_FIREBASE_APP_ID=...1. **Clone the repository**

   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...

   EXPO_PUBLIC_MANAGEMENT_USERNAME=...```bash

   EXPO_PUBLIC_MANAGEMENT_PASSWORD=...git clone <repository-url>

   EXPO_PUBLIC_COADMIN_EMAIL=...cd siet-bus-tracking/siet/sietbusapp

   EXPO_PUBLIC_COADMIN_PASSWORD=...````

   EXPO_PUBLIC_COADMIN_NAME=...

   EXPO_PUBLIC_COADMIN_BUS_ID=...2. **Install dependencies**

`````

> Store mapping or other platform keys as `EXPO_PUBLIC_*` entries so `babel-plugin-dotenv-import` can inject them.```bash

3. **Run Locally**npm install

   `bash`

   npx expo start --dev-client

   ```3. **Configure environment variables**

   Press `a` (Android) or `i` (iOS) to launch an emulator, or scan the QR with the Expo dev client.   Create a `.env` file with your Firebase credentials:
   ```

---```env

EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key

## Native Build & Rebuild PolicyEXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain

- Install native modules with `npx expo install <package>`.EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

- After adding a module (e.g. `expo-mail-composer`), rebuild the dev client or standalone binary:EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket

  ````bashEXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id

  npx expo run:androidEXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

  npx expo run:ios        # macOS onlyEXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

  # or Expo Cloud```

  eas build --platform android --profile development

  ```4. **Start the development server**

  ````

- Expo Go includes most Expo SDK modules; rebuild is only required when using the custom dev client.

```bash

---npx expo start

```

## Firestore Seeding Workflow

1. Place `serviceAccountKey.json` (Firebase Admin credential) in the project root.5. **Run the app**

2. Drop institute CSV exports into `Bus_data/` and update `CSV_FILENAME` when needed.

3. Execute:- Scan QR code with Expo Go app (Android/iOS)

   ```bash- Press `a` for Android emulator

   node scripts/importCSV.js- Press `i` for iOS simulator

   ```

   This writes/updates documents in `buses/`, `users/`, and nested subcollections so the app can reference them immediately.## � Configuration
   ```

---### Firebase Setup

## Troubleshooting1. Create a Firebase project

- **Cannot find native module `ExpoMailComposer`** – rebuild the dev client after installing the dependency.2. Enable Firestore and Authentication

- **Polyline degraded to straight segments** – OSRM fetch failed; the app logs `routeWarning`. Validate the public OSRM endpoint or host your own instance.3. Add your Firebase config to `.env`

- **Blank OSM tiles** – check connectivity or switch to a different tile server if rate limited.4. Deploy Firestore security rules from `firestore.rules`

- **Location not updating** – ensure the driver granted both foreground and background permissions via `ensureLocationPermissionsAsync()`.

### Location Permissions

---

The app requires location permissions for GPS tracking. Permissions are requested at runtime.

## Roadmap

1. Seed the remaining bus routes and expose a selector for multi-route tracking.## 📱 User Roles

2. Harden authentication (password reset, account recovery) and migrate credentials to secure storage.

3. Introduce automated tests (Jest for services, Detox/E2E for critical flows).### Driver

4. Externalise secrets to Expo EAS (build profiles) and set up CI/CD.

5. Add analytics dashboards for punctuality, occupancy, and route performance.- Start/stop location tracking

- View current location

---- Manage profile

## License & Support### Student

This repository is maintained for the SIET internal transport team. Contact the maintainer group for reuse or distribution questions.

- View assigned bus location
- Track bus in real-time
- View bus status (active/inactive)

### Management

- Monitor all buses
- View live tracking for any bus
- Manage drivers and students
- Access reports and analytics

## � Security

- Firebase Authentication for user management
- Firestore security rules for data protection
- Bus number normalization for data consistency
- Real-time validation and error handling

## 📊 Key Features

### Real-Time GPS Tracking

- Updates every 5 seconds
- 10-meter distance threshold
- Automatic normalization of bus numbers
- Active/inactive status tracking

### Live Map Visualization

- Interactive maps for students and admin
- Real-time bus marker updates
- Status indicators
- Last updated timestamp

### Normalized Bus Numbers

All bus numbers are automatically normalized:

- Converts to uppercase
- Collapses multiple hyphens to single hyphen
- Example: "siet--005" → "SIET-005"

## � Status Indicators

- ✅ **Active** - Bus is currently tracking
- ⏸️ **Inactive** - Bus tracking stopped
- ⏳ **Waiting** - Waiting for bus to start tracking

## 🐛 Troubleshooting

### Location not updatingz

### Map not showing

- Check internet connection
- Verify Firestore rules allow read access
- Ensure bus is actively tracking

## 📄 License

This project is for educational purposes.

## 👥 Support

For issues or questions, please contact Haarhish VS  .
Whatsapp number : 7695908575.
