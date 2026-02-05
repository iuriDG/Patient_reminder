# 🏥 Care Reminders - Complete System

A two-part patient medication reminder system designed for elderly and Alzheimer's patients. Healthcare staff create reminders via web interface, patients receive notifications via mobile app.

---

## 🎯 System Overview

### Two Components:

1. **Staff Web Interface** (`staff.html`) - Create reminders & generate QR codes
2. **Patient Mobile App** (`mobile-app/`) - React Native app for iOS & Android

### How It Works:

```
Staff creates reminders → Generates QR code → Patient scans → Receives notifications
```

---

## 🚀 Quick Start

### For Staff (Web Interface)

No installation needed! Just open the file:

```bash
# Option 1: Open locally
open staff.html

# Option 2: Use GitHub Pages (already deployed)
# https://iuridg.github.io/Patient_reminder/staff.html
```

### For Patients (Mobile App)

```bash
# 1. Navigate to mobile app folder
cd mobile-app

# 2. Install dependencies
npm install

# 3. Start development server
npx expo start

# 4. Scan QR with Expo Go app (iOS/Android)
```

---

## 📁 Project Structure

```
Patient_reminder/
├── staff.html              # ✅ Staff interface - Create reminders
├── index.html              # Old PWA version (archived)
├── old_pwa_files/          # Archived PWA files
│   ├── manifest.json
│   └── sw.js
├── mobile-app/             # 📱 Patient mobile app
│   ├── App.tsx             # Main app code
│   ├── types.ts            # TypeScript types
│   ├── app.json            # Expo config
│   ├── package.json        # Dependencies
│   ├── README.md           # Mobile app documentation
│   └── SETUP_GUIDE.md      # Deployment guide
└── README.md               # This file
```

---

## 💡 Complete Workflow

### Step 1: Staff Creates Reminders

1. Open `staff.html` in browser
2. Enter patient name
3. Add reminders with times:
   - "Take blood pressure medication"
   - "Drink 8oz water"
   - "Call Dr. Smith: 555-1234"
4. Click "Generate QR Code"

### Step 2: Patient Receives Reminders

1. Patient opens Care Reminders app
2. Taps "Scan QR Code"
3. Scans QR code from staff
4. App saves to SQLite database
5. Schedules local notifications
6. Patient receives alerts at scheduled times
7. When done: tap "Delete All Reminders"

---

## 🏗️ Staff Interface

### Features

- ✅ Simple web form - no installation
- ✅ Create multiple reminders
- ✅ Generate QR codes
- ✅ Works offline
- ✅ No database needed
- ✅ HIPAA compliant (no data stored)

### Usage

**Local:**
```bash
open staff.html
```

**Online:**
```
https://iuridg.github.io/Patient_reminder/staff.html
```

### Best Practices

✅ **Good reminder messages:**
- "Take blue pill (blood pressure)"
- "Use eye drops - both eyes"
- "Drink water - 8oz glass"

❌ **Avoid:**
- "Lisinopril 10mg PO daily"
- Complex medical terminology

**Limit:** 5-15 reminders per patient (QR code size limit)

---

## 📱 Mobile App

### Features

- ✅ QR code scanning
- ✅ Local SQLite database
- ✅ Push notifications with sound
- ✅ Simple UI for elderly patients
- ✅ One-button data deletion
- ✅ Works offline
- ✅ iOS & Android support

### Installation

```bash
cd mobile-app
npm install
npx expo start
```

**Test on phone:**
1. Install "Expo Go" from App Store/Play Store
2. Scan QR code from terminal
3. App loads on your phone!

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

See [mobile-app/README.md](mobile-app/README.md) for complete build instructions.

---

## 🔐 Privacy & Security

### HIPAA Compliant

✅ **No cloud storage** - All data local to patient device
✅ **No servers** - No data transmission
✅ **No analytics** - No tracking
✅ **Easy deletion** - One-button wipe

### Data Flow

1. **Staff Interface** → Creates data → Embeds in QR code
2. **QR Code** → Contains all reminder data (base64 encoded)
3. **Mobile App** → Scans QR → Saves to local SQLite
4. **Patient Device** → Local notifications at scheduled times
5. **Patient** → Deletes all data when done

**No PHI leaves the patient's device!**

---

## 🚀 Deployment

### Staff Interface (GitHub Pages)

Already deployed at:
```
https://iuridg.github.io/Patient_reminder/staff.html
```

To update:
```bash
git add staff.html
git commit -m "Update staff interface"
git push origin main
```

Changes appear in ~1 minute.

### Mobile App (App Stores)

**iOS App Store:**
- Need: Apple Developer Account ($99/year)
- Build: `eas build --platform ios`
- Submit via App Store Connect

**Google Play Store:**
- Need: Google Play Developer Account ($25 one-time)
- Build: `eas build --platform android`
- Submit via Play Console

See [mobile-app/README.md](mobile-app/README.md) for detailed steps.

---

## 🔧 Development

### Prerequisites

```bash
# Check Node.js (need v18+)
node --version

# If not installed (macOS):
brew install node
```

### Staff Interface

No setup needed - just edit `staff.html` and open in browser.

### Mobile App

```bash
cd mobile-app
npm install
npx expo start
```

---

## 💊 Tips for Alzheimer's Patients

### Setup

1. **Pre-install app** before patient goes home
2. **Test together** - scan a dummy QR code
3. **Large, clear text** - keep messages simple
4. **Familiar sounds** - use default notification sound
5. **Show patient** how to read notifications

### Training Staff

**5-Minute Tutorial:**
1. Open `staff.html`
2. Create test reminder (2 minutes from now)
3. Generate QR code
4. Scan with mobile app
5. Wait for notification

**Staff should know:**
- How to create reminders
- How to generate QR codes
- How to help patient scan
- When to regenerate QR

---

## 🐛 Troubleshooting

### Staff Interface

**QR won't generate:**
- Ensure patient name is filled
- Add at least one reminder

**"Too much data" error:**
- Reduce number of reminders (max ~15)
- Shorten reminder messages

### Mobile App

**Won't scan QR:**
- Check camera permission
- Ensure good lighting
- QR must be from `staff.html`

**No notifications:**
- iOS: Only works on physical devices
- Check notification permissions in Settings
- App must be granted permission

**App won't build:**
```bash
cd mobile-app
rm -rf node_modules
npm install
npx expo start --clear
```

---

## 📚 Documentation

- **Staff Interface:** Use `staff.html` (this README)
- **Mobile App:** [mobile-app/README.md](mobile-app/README.md)
- **Deployment:** [mobile-app/SETUP_GUIDE.md](mobile-app/SETUP_GUIDE.md)

---

## 🎉 Quick Reference

**Test staff interface:**
```bash
open staff.html
```

**Test mobile app:**
```bash
cd mobile-app
npx expo start
```

**Deploy staff interface:**
```bash
git push origin main
# Live at: https://iuridg.github.io/Patient_reminder/staff.html
```

**Build mobile app:**
```bash
cd mobile-app
eas build --platform ios
eas build --platform android
```

---

## 🔗 Links

- **Staff Interface (Live):** https://iuridg.github.io/Patient_reminder/staff.html
- **GitHub Repo:** https://github.com/iuriDG/Patient_reminder
- **Mobile App Docs:** [mobile-app/README.md](mobile-app/README.md)

---

## 📄 License

MIT

---

**Built with ❤️ for better patient care**
