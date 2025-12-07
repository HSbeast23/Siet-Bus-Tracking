# SIET Bus Tracking System

End-to-end mobile solution that keeps Sri Shakthi Institute buses connected with students, bus incharge staff, drivers, and management. Built with React Native (Expo SDK 54) and Firebase, the app delivers real-time bus tracking, attendance, reporting, and role-aware dashboards on Android and iOS.

---

## At a Glance

- **Audience** – Students, Bus Incharge staff, Drivers, and Management.
- **Core Value** – Live bus locations, incident reporting, attendance insights, and instant notifications in one place.
- **Stack** – React Native + Expo, Firebase (Auth, Firestore), Expo Location/Task Manager, Expo Notifications, Google Maps via `react-native-maps` with OSRM routing overlays.
- **Current Status (Nov 2025)** – Push token registration is automatic, management & bus incharge report inboxes support respond-and-clear, CSV seeding covers the majority of buses, and all navigation labels now use “Bus Incharge”.

---

## Role-Based Experience

| Persona          | Highlights                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Students**     | Unified login, real-time Google Maps view with native tiles, stop timeline/ETA, attendance history, and report submission to management or bus incharge.                         |
| **Bus Incharge** | Dashboard shortcuts for bus/driver/student management, real-time tracking, attendance marking, student report inbox with respond & clear actions, plus escalation to management. |
| **Drivers**      | Start/stop tracking workflow with background GPS, automatic throttling to reduce noise, profile tools, and attendance utilities.                                                 |
| **Management**   | Fleet dashboards, analytics, attendance history, complete report board with respond & clear, CSV onboarding utilities, and direct access to live maps for any bus.               |

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Mobile Client (Expo)                                           │
│  • React Navigation stack (`AppNavigator`)                      │
│  • Role-specific screens under `src/screens/`                   │
│  • Expo Location + Task Manager for background GPS             │
│  • Expo Notifications for push delivery                         │
└──────────────┬──────────────────────────────────────────────────┘
          │ Firestore / Auth REST
┌──────────────▼──────────────────────────────────────────────────┐
│  Firebase Project                                               │
│  • Auth: role-aware login with AsyncStorage persistence         │
│  • Firestore: buses, users, attendance, reports collections     │
│  • Security rules enforced via `firebaseConfig.js` setup         │
└──────────────┬──────────────────────────────────────────────────┘
          │ Admin import (optional)
┌──────────────▼──────────────────────────────────────────────────┐
│  Node Seeder (`scripts/importCSV.js`)                            │
│  • Reads `Bus_data/*.csv`                                       │
│  • Requires `serviceAccountKey.json`                            │
│  • Populates buses, drivers, students collections               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Capsules

### Live Tracking

- `MapScreen` renders a native Google basemap using `react-native-maps` with `provider="google"`.
- OSRM builds driving polylines between configured stops; failures gracefully fall back to straight segments.
- `locationService.js` normalizes bus IDs, throttles updates (<20 m movement, <4 s interval ignored), and marks terminated driver sessions.
- Drivers use the background location task (`driver-background-location-task`) so updates continue when the app is minimized.

### Reporting Workflow

- Students choose a recipient (management or bus incharge) in `StudentReportScreen`.
- Bus incharge inbox (`BusInchargeReportScreen`) filters reports by bus, supports respond & clear or clear-only actions.
- Management inbox (`Reports.js`) aggregates all management-targeted submissions, tracks counts (pending / acknowledged / resolved), and mirrors the respond & clear workflow.
- Responses are acknowledged via alert and the Firestore document is deleted, ensuring no residual data after the reply.

### Notifications

- Tokens are registered through `registerPushTokenAsync` when each persona logs in.
- `notifyBusTrackingStarted` sends targeted Expo pushes to riders and bus incharge staff for a specific bus.
- Android notification channel `tracking-alerts` ensures high-priority delivery.

---

## Project Layout

```
sietbusapp/
├── App.js                   # Expo bootstrap & font loading
├── index.js                 # Entry point
├── app.json                 # Expo manifest
├── eas.json                 # EAS build profiles
├── android/                 # Prebuild Android project (Expo run)
├── assets/                  # Icons, images, fonts
├── Bus_data/                # CSV files for seeding
├── scripts/importCSV.js     # Firestore import utility (Firebase Admin)
└── src/
   ├── components/          # Shared UI, bottom nav, guards
   ├── navigation/          # Stack navigator configuration
   ├── screens/             # Feature screens grouped by persona
   ├── services/            # Auth, reports, attendance, location, push
   └── utils/               # Constants, route config, helpers
```

---

## Technology Stack

- **React Native** 0.81 + **Expo** 54
- **Expo Dev Client** for custom native modules
- **React Navigation** (stack & bottom tabs)
- **Expo Location / Task Manager** for background GPS
- **Expo Notifications** with Expo push service
- **Firebase** Auth + Firestore (JS SDK v12)
- **Cloudinary (optional)** for media uploads via `cloudinaryService.js`
- **CSV Import** using `csv-parser` and Firebase Admin SDK

---

## Getting Started

1. **Clone & Install**

```bash
git clone https://github.com/HSbeast23/Siet-Bus-Tracking.git
cd Siet-Bus-Tracking/sietbusapp
npm install
```

2. **Configure Environment** – create `.env` in the project root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Optional convenience credentials for demo logins
EXPO_PUBLIC_MANAGEMENT_USERNAME=...
EXPO_PUBLIC_MANAGEMENT_PASSWORD=...
EXPO_PUBLIC_COADMIN_EMAIL=...
EXPO_PUBLIC_COADMIN_PASSWORD=...
EXPO_PUBLIC_COADMIN_NAME=...
EXPO_PUBLIC_COADMIN_BUS_ID=...
```

> Variables must be prefixed with `EXPO_PUBLIC_` because they are imported at build time via `babel-plugin-dotenv-import`.

3. **Run in Development**

```bash
npx expo start --dev-client
```

- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS only)
- Or scan the QR with the Expo Dev Client on device

4. **Native Builds (optional)**

```bash
npm run android   # expo run:android
npm run ios       # expo run:ios (macOS)
npm run build     # Gradle debug build inside android/
npm run eas       # EAS cloud build (development profile)
```

---

## Firestore Seeding (Optional but Recommended)

1. Place `serviceAccountKey.json` (Firebase Admin credential) in the repo root.
2. Drop institute CSV exports into `Bus_data/` and adjust the file constant in `scripts/importCSV.js` if necessary.
3. Execute the importer:

```bash
node scripts/importCSV.js
```

The script normalizes bus numbers, creates bus/driver/student documents, and ensures dashboards have baseline data.

---

## Key Workflows

### Driver Tracking Flow

1. Driver logs in → push token stored in Firestore.
2. Start tracking → `backgroundLocationService` registers GPS updates.
3. `locationService.updateBusLocation` validates movement thresholds, normalizes bus IDs, and writes to Firestore.
4. Students, bus incharge, and management map screens subscribe to bus documents for live updates.

### Reporting Flow

1. Student submits a report selecting either management or bus incharge.
2. `reportsService.submitReport` writes document tagged with `recipientRole` and normalized bus number.
3. Recipient inbox fetches with `reportsService.getReportsForRecipient` or `getAllReports`.
4. Respond & Clear → `reportsService.removeReport` deletes the document after displaying a confirmation alert.

---

## Troubleshooting

- **No push notification** – confirm Firestore `users/{uid}` has `expoPushToken`, ensure device allowed notifications.
- **Route polyline missing** – ensure at least two stops with valid coordinates are provided. If OSRM is unreachable, the app logs a fallback warning and shows a straight segment; verify network access to `router.project-osrm.org`.
- **Driver updates stopped** – the session may have been marked as terminated (duplicate login or manual stop). Restart tracking to issue a new session ID.
- **Expo build complains about new native module** – install via `expo install` and rebuild the dev client using `npm run android` or `npm run ios`.

---

## Roadmap & Open Items

- Complete CSV onboarding for the remaining bus routes.
- Harden authentication (password reset, account recovery) and migrate secrets to Expo EAS secure storage.
- Add automated testing (Jest + Detox) for core services and flows.
- Expand Google Maps styling (traffic overlays, campus theming) and evaluate hosting a private OSRM instance to avoid public endpoint limits.

---

## Maintainer & Support

This application is maintained for the SIET transport coordination team. For deployment access or production support, contact **Haarhish** (WhatsApp: +91 76959 08575).

# SIET Bus Tracking System

Mobile application that powers live tracking and coordination for the Sri Shakthi Institute bus fleet. The app is built with React Native (Expo SDK 54) and integrates Firebase for authentication, Firestore sync, and background GPS updates. Four personas are supported: students, bus incharge staff, drivers, and management.

## Personas & Capabilities

- **Students** – Unified login, real-time Google Maps view with OSRM-powered polylines, stop timeline, attendance history, and report submission to either management or the assigned bus incharge.
- **Bus Incharge** – Dashboard shortcuts for bus, driver, student, attendance, and map tools; receives student reports, can respond and clear them, and can escalate issues to management.
- **Drivers** – Foreground/background GPS tracking with start/stop workflow, automatic push token registration, profile utilities, and attendance helpers.
- **Management** – Fleet-wide dashboards, attendance and analytics screens, real-time reports board (respond & clear workflow), and CSV-based onboarding for buses, drivers, and students.

## Architecture Highlights

- **React Native + Expo** (SDK 54, RN 0.81) with custom dev client support.
- **Firebase** for auth persistence (with AsyncStorage) and Firestore for real-time data.
- **Background GPS** provided by `expo-location` and `expo-task-manager`; location writes are throttled in `locationService.js` to minimize Firestore load.
- **Maps & Routing** via `react-native-maps` (Google provider) with OSRM polyline generation (`utils/routePolylineConfig.js`) and straight-line fallback when routing is unavailable.
- **Push Notifications** using `expo-notifications`, including Android channels and token storage per user.
- **Reports Workflow** managed in `reportsService.js`, now supporting per-recipient inboxes and delete-on-response handling for management and bus incharge roles.

## Data & Service Layer

- `src/services/authService.js` – role-aware authentication, session caching, and logout.
- `src/services/backgroundLocationService.js` & `locationService.js` – normalize bus numbers, maintain active driver sessions, and push updates to Firestore.
- `src/services/reportsService.js` – submission, recipient filtering, and cleanup of student/bus incharge reports.
- `src/services/pushNotificationService.js` – token registration, Expo push payload delivery, and recipient selection per bus number.
- `src/services/attendanceService.js`, `reportsService.js`, `storage.js`, `cloudinaryService.js` – supportive utilities for attendance, reporting, local storage, and optional media uploads.

## Project Structure

```
sietbusapp/
├── App.js                   # Expo bootstrap & font loading
├── index.js                 # Entry point for Expo
├── app.json                 # Expo manifest
├── eas.json                 # EAS build profiles
├── android/                 # Prebuild native Android project
├── assets/                  # Images and other static assets
├── Bus_data/                # CSV inputs for Firestore seeding
├── scripts/importCSV.js     # Seeder script (requires Admin SDK key)
└── src/
   ├── components/          # Shared UI and navigation components
   ├── navigation/          # `AppNavigator.js` stack definitions
   ├── screens/             # Role-specific screens (>30)
   ├── services/            # Firebase, auth, reports, location, etc.
   └── utils/               # Constants, polyline config, helpers
```

## Prerequisites

- Node.js 18 or newer
- npm 9+ (ships with Node 18)
- Expo CLI (`npm install -g expo-cli`) and Expo Go or the Expo Dev Client
- Android Studio or Xcode (as needed for native builds)
- Firebase project with Firestore and Authentication enabled

## Setup

1. **Clone & Install**

```bash
git clone https://github.com/HSbeast23/Siet-Bus-Tracking.git
cd Siet-Bus-Tracking/sietbusapp
npm install
```

2. **Configure Environment** – Create a `.env` file in the project root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Optional role defaults used by some login shortcuts
EXPO_PUBLIC_MANAGEMENT_USERNAME=...
EXPO_PUBLIC_MANAGEMENT_PASSWORD=...
EXPO_PUBLIC_COADMIN_EMAIL=...
EXPO_PUBLIC_COADMIN_PASSWORD=...
EXPO_PUBLIC_COADMIN_NAME=...
EXPO_PUBLIC_COADMIN_BUS_ID=...
```

These values are read via `babel-plugin-dotenv-import`; ensure keys start with `EXPO_PUBLIC_`. 3. **Run in Development**

```bash
npx expo start --dev-client
```

Press `a` for Android, `i` for iOS (macOS only), or scan the QR code with the Expo Dev Client. 4. **Native Builds (optional)**

```bash
npm run android   # expo run:android
npm run ios       # expo run:ios (macOS)
npm run build     # Gradle debug build inside android/
```

For cloud builds, use `npm run eas`.

## Firestore Seeding (Optional)

1. Place `serviceAccountKey.json` (Firebase Admin SDK credentials) in the project root.
2. Add or update institute CSV exports under `Bus_data/`.
3. Run the importer:

```bash
node scripts/importCSV.js
```

The script writes buses, drivers, and student documents with normalized bus numbers.

## Push Notifications & Background Location

- Tokens are registered through `registerPushTokenAsync`; ensure each persona logs in at least once so Firestore stores their Expo token.
- Android push notifications require the generated channel (`tracking-alerts`); double-check device settings if notifications do not arrive.
- Drivers must grant both foreground and background location permissions. The background task (`driver-background-location-task`) continues sending updates even when the app is minimized.

## Reporting Workflow (November 2025)

- Students can route reports to management or their bus incharge from `StudentReportScreen`.
- Bus incharge staff see an inbox of student submissions and can respond-and-clear or clear-only each item.
- Management’s `Reports` screen mirrors the respond-and-clear workflow and tracks counts of pending, acknowledged, and resolved items.
- Responses are intentionally not persisted; acknowledging a report fires an alert to confirm the reply and deletes the document from Firestore.

## Known Issues & Next Steps

- Remaining CSV onboarding (30+ buses) still needs to be completed.
- Secrets should be migrated to secure storage / Expo EAS secrets before production builds.
- Automated testing (unit + end-to-end) is not yet implemented.
- Map tiles rely on public OSM servers; consider hosting if rate limited.

## Troubleshooting

- **No push received** – confirm the user has a token stored in Firestore and that the device allowed notifications.
- **Map polyline missing** – OSRM routing may have failed; inspect Metro logs for `routeWarning` messages.
- **Driver location stale** – ensure background permissions remain granted and the driver session has not been flagged as terminated in `locationService.js`.

## Support

This project is maintained for the SIET transport team. For access or deployment questions contact Haarhish (WhatsApp: +91 76959 08575).

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

   git clone https://github.com/HSbeast23/Siet-Bus-Tracking.git

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

For issues or questions, please contact Haarhish .
Whatsapp number : 7695908575.
