import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import * as SQLite from 'expo-sqlite';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { PatientData, Reminder } from './types';

// Constants
const SCAN_COOLDOWN_MS = 3000;
const DATABASE_NAME = 'patient_reminders.db';
const PRIMARY_COLOR = '#667eea';
const BACKGROUND_COLOR = '#f5f5f5';

// Translations
const TRANSLATIONS = {
  en: {
    appTitle: 'Care Reminders',
    noReminders: 'No Reminders',
    noRemindersText: 'Scan QR code to load reminders',
    scanButton: 'Scan QR Code',
    scanQRCode: 'Scan QR Code',
    cancel: 'Cancel',
    notificationsEnabled: 'Notifications On',
    yourReminders: 'Your Reminders',
    scanNew: 'Scan New QR Code',
    deleteAll: 'Delete All',
    deleteTitle: 'Delete All?',
    deleteMessage: 'Remove all reminders?',
    deleteConfirm: 'Delete',
    success: 'Success',
    remindersLoaded: 'Reminders loaded',
    allDeleted: 'All reminders deleted',
    error: 'Error',
    invalidQR: 'Invalid QR code',
    cameraPermission: 'Camera needed to scan QR codes',
    grantPermission: 'Allow Camera',
    notificationTitle: 'Reminder',
    finnish: 'Suomi',
    english: 'English',
    daily: 'Daily',
    weekly: 'Weekly',
    until: 'Until',
  },
  fi: {
    appTitle: 'Hoitomuistutukset',
    noReminders: 'Ei Muistutuksia',
    noRemindersText: 'Skannaa QR-koodi ladataksesi muistutukset',
    scanButton: 'Skannaa QR-koodi',
    scanQRCode: 'Skannaa QR-koodi',
    cancel: 'Peruuta',
    notificationsEnabled: 'Ilmoitukset Päällä',
    yourReminders: 'Muistutuksesi',
    scanNew: 'Skannaa Uusi',
    deleteAll: 'Poista Kaikki',
    deleteTitle: 'Poista Kaikki?',
    deleteMessage: 'Poistetaanko kaikki muistutukset?',
    deleteConfirm: 'Poista',
    success: 'Valmis',
    remindersLoaded: 'Muistutukset ladattu',
    allDeleted: 'Kaikki muistutukset poistettu',
    error: 'Virhe',
    invalidQR: 'Virheellinen QR-koodi',
    cameraPermission: 'Kamera tarvitaan QR-koodien skannaamiseen',
    grantPermission: 'Salli Kamera',
    notificationTitle: 'Muistutus',
    finnish: 'Suomi',
    english: 'English',
    daily: 'Päivittäin',
    weekly: 'Viikoittain',
    until: 'Päättyy',
  },
};

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [language, setLanguage] = useState<'en' | 'fi'>('en');
  const [, setTick] = useState(0);
  const isProcessingScan = useRef(false);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    initializeApp();
  }, []);

  // Auto-refresh every 30 seconds to update crossed-out reminders
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeApp = async () => {
    // Request permissions
    await requestPermissions();

    // Initialize database
    const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    setDb(database);

    // Create table if not exists
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY,
        patient_name TEXT,
        message TEXT,
        time TEXT,
        notified INTEGER DEFAULT 0,
        repeat_type TEXT,
        end_date TEXT
      );
    `);

    // Migration: Add new columns if they don't exist (for existing installations)
    try {
      await database.execAsync(`
        ALTER TABLE reminders ADD COLUMN repeat_type TEXT;
      `);
    } catch (e) {
      // Column already exists, ignore error
    }

    try {
      await database.execAsync(`
        ALTER TABLE reminders ADD COLUMN end_date TEXT;
      `);
    } catch (e) {
      // Column already exists, ignore error
    }

    // Load existing data
    await loadPatientData(database);

    // Setup deep linking
    setupDeepLinking();
  };

  const requestPermissions = async () => {
    // Camera permission for QR scanning
    if (!permission?.granted) {
      await requestPermission();
    }

    // Notification permission
    const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
    if (notificationStatus !== 'granted') {
      Alert.alert('Notifications Required', 'Please enable notifications to receive reminders.');
    }
  };

  const setupDeepLinking = () => {
    // Handle deep links when app is opened from QR code
    Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });
  };

  const handleDeepLink = async (url: string) => {
    try {
      // Extract data parameter directly from URL
      const dataMatch = url.match(/[?&]data=(.+)$/);
      if (dataMatch && dataMatch[1]) {
        const base64Data = dataMatch[1].replace(/ /g, '+');
        const jsonString = decodeURIComponent(atob(base64Data));
        const data: PatientData = JSON.parse(jsonString);
        await savePatientData(data);
      } else {
        // Try parsing the entire URL as raw JSON data
        try {
          const data: PatientData = JSON.parse(url);
          await savePatientData(data);
        } catch {
          Alert.alert(t.error, t.invalidQR);
        }
      }
    } catch (error) {
      Alert.alert(t.error, t.invalidQR);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent multiple rapid scans using ref (immediate check)
    if (isProcessingScan.current) return;

    isProcessingScan.current = true;
    setScanning(false);

    await handleDeepLink(data);

    // Cooldown period before allowing next scan
    setTimeout(() => {
      isProcessingScan.current = false;
    }, SCAN_COOLDOWN_MS);
  };

  const savePatientData = async (data: PatientData) => {
    if (!db) return;

    try {
      // Clear old reminders
      await db.execAsync('DELETE FROM reminders');

      // Insert new reminders (use INSERT OR REPLACE to handle duplicates)
      for (const reminder of data.reminders) {
        await db.runAsync(
          'INSERT OR REPLACE INTO reminders (id, patient_name, message, time, notified, repeat_type, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [reminder.id, data.patientName, reminder.message, reminder.time, 0, reminder.repeatType || null, reminder.endDate || null]
        );
      }

      setPatientData(data);

      // Schedule notifications
      await scheduleNotifications(data.reminders);

      Alert.alert(
        t.success,
        `${t.remindersLoaded}: ${data.patientName}`
      );
    } catch (error) {
      Alert.alert(t.error, t.invalidQR);
    }
  };

  const loadPatientData = async (database: SQLite.SQLiteDatabase) => {
    try {
      const result = await database.getAllAsync<{
        id: number;
        patient_name: string;
        message: string;
        time: string;
        notified: number;
        repeat_type: string | null;
        end_date: string | null;
      }>('SELECT * FROM reminders');

      if (result.length > 0) {
        const reminders: Reminder[] = result.map(row => ({
          id: row.id,
          message: row.message,
          time: row.time,
          notified: row.notified === 1,
          repeatType: row.repeat_type as 'none' | 'daily' | 'every2days' | 'every3days' | 'every4days' | 'every5days' | 'every6days' | 'weekly' | undefined,
          endDate: row.end_date || undefined
        }));

        setPatientData({
          patientName: result[0].patient_name,
          reminders
        });

        // Reschedule notifications on app restart
        await scheduleNotifications(reminders);
      }
    } catch (error) {
      // Database error on load - silent fail as this is app initialization
    }
  };

  const scheduleNotifications = async (reminders: Reminder[]) => {
    // Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const reminder of reminders) {
      const reminderDate = new Date(reminder.time);
      const now = Date.now();
      const endDateObj = reminder.endDate ? new Date(reminder.endDate) : null;
      if (endDateObj) {
        endDateObj.setHours(23, 59, 59, 999);
      }
      const endDate = endDateObj ? endDateObj.getTime() : null;
      const maxScheduleDays = 365;

      // Skip if past end date
      if (endDate && now > endDate) {
        continue;
      }

      try {
        // Handle repeating notifications
        if (reminder.repeatType === 'daily') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${t.notificationTitle} 💊`,
              body: reminder.message,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              hour: reminderDate.getHours(),
              minute: reminderDate.getMinutes(),
              repeats: true,
            },
          });
        } else if (reminder.repeatType === 'weekly') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${t.notificationTitle} 💊`,
              body: reminder.message,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              weekday: reminderDate.getDay() + 1,
              hour: reminderDate.getHours(),
              minute: reminderDate.getMinutes(),
              repeats: true,
            },
          });
        } else if (reminder.repeatType && reminder.repeatType.startsWith('every')) {
          const dayInterval = parseInt(reminder.repeatType.replace('every', '').replace('days', ''));
          let currentDate = new Date(reminder.time);
          let scheduledCount = 0;
          const maxNotifications = Math.floor(maxScheduleDays / dayInterval);

          while (scheduledCount < maxNotifications) {
            const notificationTime = currentDate.getTime();

            if (endDate && notificationTime > endDate) {
              break;
            }

            if (notificationTime > now) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `${t.notificationTitle} 💊`,
                  body: reminder.message,
                  sound: true,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: new Date(notificationTime),
                },
              });
            }

            currentDate = new Date(currentDate.getTime() + dayInterval * 24 * 60 * 60 * 1000);
            scheduledCount++;
          }
        } else {
          // One-time notification
          const delay = reminderDate.getTime() - now;
          if (delay > 0 && !reminder.notified) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${t.notificationTitle} 💊`,
                body: reminder.message,
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
              },
            });
          }
        }
      } catch (error) {
        // Notification scheduling failed for this reminder
      }
    }
  };

  const deleteAllData = async () => {
    Alert.alert(
      t.deleteTitle,
      t.deleteMessage,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.deleteConfirm,
          style: 'destructive',
          onPress: async () => {
            if (!db) return;

            await db.execAsync('DELETE FROM reminders');
            await Notifications.cancelAllScheduledNotificationsAsync();
            setPatientData(null);

            Alert.alert(t.success, t.allDeleted);
          },
        },
      ]
    );
  };

  const renderReminder = ({ item }: { item: Reminder }) => {
    const isPast = new Date(item.time) < new Date();
    const isRepeating = item.repeatType && item.repeatType !== 'none';

    const getRepeatText = () => {
      if (item.repeatType === 'daily') return language === 'fi' ? '🔁 Päivittäin' : '🔁 Daily';
      if (item.repeatType === 'every2days') return language === 'fi' ? '🔁 Joka 2. päivä' : '🔁 Every 2 Days';
      if (item.repeatType === 'every3days') return language === 'fi' ? '🔁 Joka 3. päivä' : '🔁 Every 3 Days';
      if (item.repeatType === 'every4days') return language === 'fi' ? '🔁 Joka 4. päivä' : '🔁 Every 4 Days';
      if (item.repeatType === 'every5days') return language === 'fi' ? '🔁 Joka 5. päivä' : '🔁 Every 5 Days';
      if (item.repeatType === 'every6days') return language === 'fi' ? '🔁 Joka 6. päivä' : '🔁 Every 6 Days';
      if (item.repeatType === 'weekly') return language === 'fi' ? '🔁 Viikoittain' : '🔁 Weekly';
      return '';
    };

    const getEndDateText = () => {
      if (item.endDate) {
        const prefix = language === 'fi' ? 'Päättyy' : 'Until';
        return `${prefix} ${new Date(item.endDate).toLocaleDateString()}`;
      }
      return '';
    };

    return (
      <View style={[styles.reminderCard, isPast && styles.reminderCardPast]}>
        <View style={styles.reminderHeader}>
          <Text style={[styles.reminderTime, isPast && styles.textPast]}>
            📅 {new Date(item.time).toLocaleString()}
          </Text>
          {isRepeating && (
            <View style={styles.repeatBadge}>
              <Text style={styles.repeatBadgeText}>{getRepeatText()}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.reminderMessage, isPast && styles.textPast]}>
          {item.message}
        </Text>
        {item.endDate && (
          <Text style={styles.endDateText}>{getEndDateText()}</Text>
        )}
      </View>
    );
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t.cameraPermission}</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>{t.grantPermission}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (scanning) {
    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.scanOverlay}>
          <Text style={styles.scanText}>{t.scanQRCode}</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setScanning(false)}>
            <Text style={styles.cancelButtonText}>{t.cancel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.languageButtons}>
          <TouchableOpacity
            style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.languageButtonText, language === 'en' && styles.languageButtonTextActive]}>
              {t.english}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, language === 'fi' && styles.languageButtonActive]}
            onPress={() => setLanguage('fi')}
          >
            <Text style={[styles.languageButtonText, language === 'fi' && styles.languageButtonTextActive]}>
              {t.finnish}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{t.appTitle}</Text>
        {patientData && (
          <Text style={styles.patientName}>{patientData.patientName}</Text>
        )}
      </View>

      {!patientData ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>{t.noReminders}</Text>
          <Text style={styles.emptyText}>
            {t.noRemindersText}
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => setScanning(true)}>
            <Text style={styles.buttonText}>{t.scanButton}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✓ {t.notificationsEnabled}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t.yourReminders}</Text>

          <FlatList
            data={patientData.reminders.sort((a, b) =>
              new Date(a.time).getTime() - new Date(b.time).getTime()
            )}
            renderItem={renderReminder}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
          />

          <TouchableOpacity style={styles.scanButton} onPress={() => setScanning(true)}>
            <Text style={styles.scanButtonText}>{t.scanNew}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={deleteAllData}>
            <Text style={styles.deleteButtonText}>{t.deleteAll}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: PRIMARY_COLOR,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  languageButtonActive: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  languageButtonTextActive: {
    color: PRIMARY_COLOR,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  patientName: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 35,
    lineHeight: 30,
    fontWeight: '500',
  },
  button: {
    backgroundColor: 'white',
    paddingHorizontal: 45,
    paddingVertical: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: PRIMARY_COLOR,
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    color: '#155724',
    fontWeight: '700',
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  list: {
    flex: 1,
  },
  reminderCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  reminderCardPast: {
    opacity: 0.6,
    backgroundColor: '#f0f0f0',
    borderLeftColor: '#999',
  },
  reminderTime: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    flex: 1,
  },
  reminderMessage: {
    fontSize: 20,
    color: '#333',
    lineHeight: 28,
    fontWeight: '500',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  repeatBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  repeatBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  endDateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  textPast: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  scanButton: {
    backgroundColor: '#6c757d',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  scanOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    paddingBottom: 50,
    alignItems: 'center',
  },
  scanText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: 'white',
    paddingHorizontal: 45,
    paddingVertical: 20,
    borderRadius: 15,
  },
  cancelButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 22,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 40,
    lineHeight: 28,
    fontWeight: '500',
  },
});
