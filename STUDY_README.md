# SIET Bus Tracking App - Interview Study Guide

> [!NOTE]
> This guide is designed for developers preparing for technical interviews related to the **SIET Bus Tracking App**. It covers the architecture, technology stack, feature workflows, data models, and potential interview questions based on the real implementation of the codebase.

## 1. Project Overview

**SIET Bus App** is a comprehensive React Native application (using Expo) designed to track college buses in real-time, manage student attendance on buses, provide role-based dashboards, and generate analytics/reports for management.

### **Core Roles:**
- **Student:** View live bus location, profile, report issues, view attendance.
- **Driver:** Share live location (GPS tracking), manage trips.
- **Bus Incharge:** Manage attendance for students boarding the bus, view live tracking, report issues.
- **Management / Admin / Co-Admin:** View all buses, generate analytics and reports, manage drivers and students, oversee the entire system.

---

## 2. Technology Stack & Architecture

### **Frontend (Mobile App)**
- **Framework:** React Native with Expo (`expo: ~54.0.32`).
- **Navigation:** React Navigation (Stack and Bottom Tabs).
- **Maps & Location:** `react-native-maps`, `expo-location`, background location services.
- **UI & Styling:** Custom styles, `@expo-google-fonts/poppins`, `expo-vector-icons`.
- **State & Storage:** React Hooks (useState, useEffect, context), `@react-native-async-storage/async-storage`.
- **Media & File parsing:** `expo-image-picker`, `csv-parser` (for bulk imports).

### **Backend (Node.js Microservice / Firebase)**
- **Primary Backend/DB:** Firebase (Authentication, Firestore for Database, Firebase Storage for images).
- **Node.js Microservice:** Located in the `server/` directory.
  - **Framework:** Express.js
  - **Purpose:** Acts as a Cloud Messaging relay. Handles FCM (Firebase Cloud Messaging) for push notifications and potentially complex scheduled tasks.
  - **Key Packages:** `firebase-admin`, `cors`, `express`, `dotenv`.

### **Architecture Flow**
1. **Client App** interacts directly with **Firebase Firestore** for CRUD operations (Users, Buses, Trips, Attendance).
2. For real-time updates (like driver location), the app writes GPS coordinates to Firestore/Realtime DB, and the Student/Incharge apps listen to these changes via Firebase snapshots.
3. For **Push Notifications** (e.g., "Bus has arrived", "Route changed"), the client calls the **Node.js Express Backend** (`/send-notification`), which then uses `firebase-admin` to securely dispatch notifications to specific FCM tokens.

---

## 3. Deep Dive: Key Feature Flows

### **A. Unified Authentication & Role-Based Access**
- **Implementation:** `src/screens/UnifiedLoginScreen.js` and `LoginSelectionScreen.js`.
- **Flow:** 
  1. User selects their role or logs in directly.
  2. `authService.js` authenticates via Firebase Auth.
  3. User's role is fetched from the `users` Firestore collection.
  4. AppNavigator dynamically renders the correct Dashboard (e.g., `DriverDashboard.js`, `StudentDashboard.js`) based on the role.

### **B. Live Bus Tracking (The Core Feature)**
- **Driver Side:** 
  - `backgroundLocationService.js` and `locationService.js` use `expo-location` to grab GPS coordinates.
  - Coordinates are continuously pushed to the database (Firestore) under the active trip session (`tripSessionService.js`).
- **Student/Incharge Side:**
  - `BusLiveTrackingScreen.js` and `MapScreen.js` use `react-native-maps`.
  - A real-time listener (Firebase `onSnapshot`) is attached to the driver's location document.
  - The map UI re-renders the bus marker smoothly as coordinates update.

### **C. Attendance Management**
- **Flow:**
  - Bus Incharge uses `BusInchargeAttendanceHistory.js` and `AttendanceView.js`.
  - Can view a list of students mapped to a specific bus route.
  - Toggles attendance status (Present/Absent).
  - Uses `attendanceService.js` to batch write records to Firestore to ensure data consistency.

### **D. Push Notifications**
- **Flow:**
  - On app load, `useFcmTokenManager` hooks into `pushNotificationService.js` to get the device's FCM token.
  - Token is saved to the user's profile in Firestore.
  - When an event occurs (e.g., Driver starts a trip), the frontend calls the Node.js backend `/send-notification` endpoint.
  - The Node.js server authenticates the request and uses `firebase-admin` to push the alert to the required tokens.

---

## 4. Key Services & Utilities (`src/services/`)

- **`authService.js`**: Handles login, logout, password resets, and session persistence.
- **`locationService.js` / `backgroundLocationService.js`**: Manages foreground and background location tracking permissions and updates.
- **`attendanceService.js`**: Logic for marking, retrieving, and calculating attendance percentages.
- **`pushNotificationService.js`**: Manages Expo/Firebase notification permissions and foreground/background notification handlers.
- **`cloudinaryService.js`**: Used for uploading images (e.g., profile pictures, issue reports) to Cloudinary instead of Firebase Storage to save bandwidth/costs.

---

## 5. Potential Interview Questions & Answers

> [!TIP]
> Use these questions to practice articulating the technical decisions made in the project.

### Q1: How did you handle real-time location tracking without draining the battery excessively?
**Answer Strategy:** Discuss the balance between update frequency and accuracy. Mention `expo-location`'s options like `accuracy: Location.Accuracy.Balanced` or `High`. Explain that background location tracking is heavily restricted by iOS/Android and requires strict permissions (`BACKGROUND_LOCATION`). You can mention optimizing Firestore writes (e.g., batching or throttling updates to once every 5-10 seconds) to save bandwidth and reduce database read/write costs.

### Q2: Why did you separate the Node.js backend for notifications instead of using Firebase Functions?
**Answer Strategy:** Explain that maintaining a lightweight Express server (`server/index.js`) gives you more control over the API environment, prevents cold starts commonly associated with serverless functions (like Firebase Cloud Functions), and makes it easier to migrate away from Firebase if the application scales significantly.

### Q3: How is role-based routing handled in React Navigation?
**Answer Strategy:** Explain that after authentication, the user object and role are stored in a global state or Async Storage. The `AppNavigator` checks this role and conditionally renders different Stack Navigators. For example, if `role === 'driver'`, return `<DriverStack />`, hiding administrative screens entirely from the driver.

### Q4: How do you handle offline capabilities or poor network conditions?
**Answer Strategy:** Discuss using `@react-native-async-storage/async-storage` for caching basic user data. For Firebase, mention that Firestore has built-in offline persistence (it caches data locally and syncs mutations when the network returns). 

### Q5: If the app scales to 10,000 students, how would you optimize the database?
**Answer Strategy:** 
- **Firestore indexing:** Ensure queries for attendance and bus routes are heavily indexed.
- **Pagination:** When Management views the `ReportsAnalytics.js` or `StudentManagement.js`, use pagination (`limit` and `startAfter` in Firestore) instead of loading all users at once.
- **Real-time listeners:** Ensure `onSnapshot` listeners are properly cleaned up (unsubscribed) when a component unmounts in `useEffect` to prevent memory leaks and excessive read charges.

---

## 6. Security Considerations
- **FCM Tokens:** Ensure endpoints like `/send-notification` are secured so unauthorized users cannot spam notifications.
- **Firestore Security Rules:** Ensure that a Student can only read their own profile and their bus location, but cannot modify bus coordinates or alter attendance records. Only Bus Incharge/Management should have write access to attendance.
- **Env Variables:** Secrets (Firebase Admin keys, Node backend ports) are kept in `.env` files and never committed to version control.
