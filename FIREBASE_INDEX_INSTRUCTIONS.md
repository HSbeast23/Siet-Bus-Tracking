# 🔥 Firebase Index Setup Instructions

## ⚠️ IMPORTANT: Create Composite Index for Report History

The Report History feature requires a composite index in Firebase Firestore to work properly.

### Option 1: Click the Auto-Generated Link (RECOMMENDED)

1. When you see this error in the console:

   ```
   ERROR  Error fetching user reports: [FirebaseError: The query requires an index.
   You can create it here: https://console.firebase.google.com/v1/r/project/...
   ```

2. **Click the URL** in the error message (it's already configured with the correct index settings)

3. Firebase Console will open in your browser

4. Click **"Create Index"** button

5. Wait 2-5 minutes for the index to build (you'll see a progress bar)

6. Once status shows **"Enabled"**, refresh your app

---

### Option 2: Manual Creation (If link doesn't work)

1. Go to [Firebase Console](https://console.firebase.google.com)

2. Select your project: **iet-bus-tracking**

3. Navigate to **Firestore Database** → **Indexes** tab

4. Click **"Create Index"**

5. Configure the index:

   - **Collection ID**: `reports`
   - **Field 1**: `reporterEmail` → **Ascending**
   - **Field 2**: `timestamp` → **Descending**
   - **Query scope**: Collection

6. Click **"Create"**

7. Wait for index to build (2-5 minutes)

---

## ✅ Verification

After creating the index:

1. Restart Expo: Press `Ctrl+C` and run `npx expo start`

2. Login as a **Student**

3. Navigate to **Dashboard** → **Report History**

4. You should see your reports without any errors!

---

## 🆘 Troubleshooting

**Still seeing errors after creating index?**

- Wait 5 minutes (index building takes time)
- Hard refresh: Stop Metro bundler and clear cache: `npx expo start --clear`
- Check Firebase Console → Indexes tab → Verify status is "Enabled"

**"Unknown" appearing in Management Reports?**

- This is now fixed! The system fetches names dynamically from `registeredUsers` collection
- Refresh the Reports & Analytics page to see updated names
