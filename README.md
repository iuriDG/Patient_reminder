# Care Reminders

A medication reminder system for elderly and Alzheimer's patients. Healthcare staff create reminders via web interface, patients receive notifications on their mobile device.

## What It Is

Two-part system:
1. **Staff Web Interface** - Create reminders and generate QR codes
2. **Patient Mobile App** - iOS/Android app that scans QR codes and sends notifications

## How It Works

1. Healthcare staff opens the web interface
2. Creates reminder schedule for a patient
3. Generates a QR code
4. Patient scans QR code with mobile app
5. Patient receives notification alerts at scheduled times

All data stays on the patient's device. No cloud storage, no servers, HIPAA compliant.

## Staff Interface Setup

No installation needed. Access it two ways:

**Online (Recommended):**
```
https://iuridg.github.io/Patient_reminder/staff.html
```

**Local:**
```bash
open staff.html
```

### How to Use:
1. Enter patient name
2. Add reminders with times (e.g., "Take blood pressure medication" at 9:00 AM)
3. Click "Generate QR Code"
4. Patient scans the QR code with mobile app

**Tip:** Keep messages simple and clear. Limit to 5-15 reminders per patient.

## Mobile App Setup

### For iOS (Current Working Setup):

**Prerequisites:**
- Mac with Xcode installed
- iPhone with cable
- Apple Developer account (free Personal Team works)

**Installation:**
```bash
cd mobile-app
npm install
```

**Run on iPhone:**
1. Open Xcode project:
   ```bash
   open ios/carereminders.xcodeproj
   ```
2. Connect iPhone via cable
3. Select your iPhone as target device in Xcode
4. Click Run (Command+R)
5. App installs on your iPhone

**Important:** If you rebuild the project, you may need to set `ENABLE_USER_SCRIPT_SANDBOXING = NO` in the Xcode project settings (both Debug and Release configurations).

### For Android:

```bash
cd mobile-app
npm install
npx expo run:android
```

## Using the Mobile App

1. Open app on patient's phone
2. Tap "Scan QR Code"
3. Scan the QR code from staff interface
4. Grant notification permissions when prompted
5. App saves reminders and schedules notifications
6. Patient receives alerts at scheduled times
7. When finished, tap "Delete All Reminders"

**Note:** Patient can close the app and turn off their phone. Notifications will still fire at scheduled times.

## Privacy & Security

- No cloud storage - all data stays on patient's device
- No servers - no data transmission
- No tracking or analytics
- Easy deletion - one button wipes all data
- HIPAA compliant

## Deployment

### Staff Interface (GitHub Pages)

Already live at:
```
https://iuridg.github.io/Patient_reminder/staff.html
```

To update:
```bash
git add staff.html
git commit -m "Update staff interface"
git push origin main
```

Changes appear within 1 minute.

### Mobile App (App Stores)

**iOS App Store:**
- Requires Apple Developer account ($99/year)
- Build with EAS: `eas build --platform ios`
- Submit via App Store Connect

**Google Play Store:**
- Requires Google Play Developer account ($25 one-time)
- Build with EAS: `eas build --platform android`
- Submit via Play Console

## Project Structure

```
Patient_reminder/
├── staff.html           # Staff interface
├── mobile-app/          # Patient mobile app
│   ├── App.tsx          # Main app code
│   ├── types.ts         # TypeScript types
│   ├── app.json         # Expo config
│   └── ios/             # iOS native project
└── README.md            # This file
```

## Troubleshooting

**Staff Interface:**
- QR won't generate: Fill in patient name and add at least one reminder
- "Too much data": Reduce number of reminders or shorten messages

**Mobile App:**
- Won't scan QR: Check camera permission in phone settings
- No notifications: Check notification permission in phone settings
- Build errors in Xcode: Set `ENABLE_USER_SCRIPT_SANDBOXING = NO` in project settings

## Requirements

- Node.js 18 or higher
- For iOS: Mac with Xcode
- For Android: Android Studio or physical Android device

## Quick Commands

**Test staff interface:**
```bash
open staff.html
```

**Run mobile app (development):**
```bash
cd mobile-app
npx expo start
```

**Build for iOS (in Xcode):**
```bash
cd mobile-app
open ios/carereminders.xcodeproj
```

## License

MIT
