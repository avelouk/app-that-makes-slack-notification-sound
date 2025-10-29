import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, AppState, AppStateStatus, Platform, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';

// Configure notification handler
// IMPORTANT: For notifications to fire when app is closed, they need to actually be presented
// The handler runs only when app is active, so we allow showing to ensure they trigger at scheduled times
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,  // Must be true for notifications to fire when app is closed
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,  // Allow banner so notification actually fires
    shouldShowList: true,    // Allow in notification list so they're not suppressed
  }),
});

const BACKGROUND_NOTIFICATION_TASK = 'background-notification';

// Register background task
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  // This task can refresh notifications when needed
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [minInterval, setMinInterval] = useState(300); // seconds
  const [maxInterval, setMaxInterval] = useState(600); // seconds
  const [scheduledCount, setScheduledCount] = useState(0);
  const isActiveRef = useRef(false);
  const notificationIdsRef = useRef<string[]>([]);
  const scheduledNotificationsRef = useRef<number>(0);

  useEffect(() => {
    // Request permissions and set up notifications
    (async () => {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: false,
          allowSound: true,
        },
      });

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Notification permission is required for background sound playback. Please enable it in settings.',
        );
      }

      // Android-specific: Request battery optimization exemption
      if (Platform.OS === 'android') {
        // Request battery optimization exemption after a short delay (so user sees it)
        setTimeout(() => {
          Alert.alert(
            'Battery Optimization Required',
            'For notifications to work when the app is closed, please disable battery optimization for this app.\n\nThis will open your device settings.',
            [
              {
                text: 'Later',
                style: 'cancel',
              },
              {
                text: 'Open Settings',
                onPress: async () => {
                  try {
                    // Open app settings directly
                    await Linking.openSettings();
                    
                    // Show instructions after opening settings
                    setTimeout(() => {
                      Alert.alert(
                        'Battery Settings',
                        'After opening Settings:\n\n' +
                        '1. Scroll down and find "app-that-makes-slack-notification-sound"\n' +
                        '2. Tap on it\n' +
                        '3. Tap "Battery"\n' +
                        '4. Tap "Battery Optimization"\n' +
                        '5. Find your app and select "Not optimized" or "Unrestricted"',
                        [{ text: 'Got it' }]
                      );
                    }, 1500);
                  } catch (error) {
                    console.error('Error opening settings:', error);
                    Alert.alert(
                      'Manual Setup Required',
                      'Please manually go to:\n\n' +
                      'Settings → Apps → app-that-makes-slack-notification-sound\n' +
                      '→ Battery → Battery Optimization\n' +
                      '→ Select "Not optimized"',
                      [{ text: 'OK' }]
                    );
                  }
                },
              },
            ]
          );
        }, 2000); // Show after 2 seconds
      }

      // Set up notification channel for Android with custom sound
      try {
        await Notifications.setNotificationChannelAsync('slack-sounds', {
          name: 'Slack Notification Sounds',
          importance: Notifications.AndroidImportance.HIGH, // HIGH importance ensures notifications fire even when app is closed
          vibrationPattern: [0, 250],
          sound: 'slack_notification.mp3',
          // Prevent grouping by using unique channel and high importance
          showBadge: false,
          enableVibrate: false,
          // Enable lights and sound to ensure notifications trigger
          enableLights: true,
          lightColor: '#4A154B',
        });
      } catch (error) {
        console.error('Error setting notification channel:', error);
      }

      // Set up notification listener to cancel and reschedule notifications
      // This listener only fires when app is active, so notifications fire directly from OS when app is closed
      const notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
        console.log('Notification received:', notification.request.identifier);
        
        // Try to dismiss the notification immediately after it fires to prevent accumulation
        if (notification.request.identifier) {
          try {
            // Cancel if still scheduled
            await Notifications.cancelScheduledNotificationAsync(notification.request.identifier);
          } catch (error) {
            // Notification may already be delivered, which is fine
          }
          // Remove from our tracking
          notificationIdsRef.current = notificationIdsRef.current.filter(
            id => id !== notification.request.identifier
          );
          scheduledNotificationsRef.current = notificationIdsRef.current.length;
          setScheduledCount(notificationIdsRef.current.length);
        }

        // Schedule next notification if active and app is open
        if (isActiveRef.current) {
          scheduleNextNotificationBatch(true);
        }
      });

      // Also handle when user interacts with notification (optional)
      const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        // Clean up the notification ID when user interacts with it
        if (response.notification.request.identifier) {
          notificationIdsRef.current = notificationIdsRef.current.filter(
            id => id !== response.notification.request.identifier
          );
          setScheduledCount(notificationIdsRef.current.length);
        }
      });

      // Monitor app state to check scheduled notifications
      const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'background' && isActiveRef.current) {
          // App going to background - verify notifications are scheduled
          try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            console.log(`App going to background. ${scheduled.length} notifications scheduled.`);
            
            // If very few notifications, schedule more before going to background
            if (scheduled.length < 10 && isActiveRef.current) {
              console.log('Scheduling additional notifications before going to background...');
              await scheduleNextNotificationBatch(false, true);
            }
          } catch (error) {
            console.error('Error checking scheduled notifications before background:', error);
          }
        } else if (nextAppState === 'active' && isActiveRef.current) {
          // App came to foreground - check how many notifications are scheduled
          try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const remainingCount = scheduled.length;
            console.log(`App came to foreground. ${remainingCount} notifications remaining.`);
            
            // If we have less than 20 notifications scheduled, reschedule a batch
            if (remainingCount < 20) {
              console.log(`Only ${remainingCount} notifications remaining, rescheduling...`);
              await scheduleNextNotificationBatch(false, true);
            }
          } catch (error) {
            console.error('Error checking scheduled notifications:', error);
          }
        }
      });

      return () => {
        notificationListener.remove();
        responseListener.remove();
        appStateSubscription.remove();
      };
    })();

    return () => {
      // Cleanup on unmount
      cancelAllNotifications();
    };
  }, []);

  const scheduleNextNotificationBatch = async (skipFirst: boolean = false, initialBatch: boolean = false) => {
    if (!isActiveRef.current) return;

    // For initial batch (when starting), schedule many notifications so they work even when app is closed
    // For ongoing (when app is open), schedule fewer to prevent grouping
    const notificationsToSchedule = initialBatch ? 32 : 2;
    const newNotificationIds: string[] = [];
    
    try {
      let currentTime = Date.now();

      if (skipFirst) {
        // Skip the first notification since we just fired one
        const firstInterval = Math.floor(
          Math.random() * (maxInterval - minInterval + 1) + minInterval
        );
        currentTime += firstInterval * 1000;
      }

      for (let i = 0; i < notificationsToSchedule; i++) {
        const randomInterval = Math.floor(
          Math.random() * (maxInterval - minInterval + 1) + minInterval
        );
        
        const triggerTime = currentTime + randomInterval * 1000;
        if (triggerTime > Date.now()) {
          // Use unique identifier to prevent grouping
          const uniqueId = `slack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const notificationId = await Notifications.scheduleNotificationAsync({
            identifier: uniqueId, // Unique identifier prevents grouping
            content: {
              title: ' ', // Minimal title (space character) to reduce visibility
              sound: 'slack_notification.mp3', // Use custom sound file
              body: ' ', // Minimal body to ensure notification fires
              data: { triggerSound: true, timestamp: triggerTime },
            },
            trigger: {
              type: SchedulableTriggerInputTypes.DATE,
              date: triggerTime,
              channelId: 'slack-sounds', // Use the custom notification channel for Android
            },
          });

          newNotificationIds.push(notificationId);
          currentTime += randomInterval * 1000;
        }
      }
      
      // Add new notification IDs to existing ones
      notificationIdsRef.current = [...notificationIdsRef.current, ...newNotificationIds];
      scheduledNotificationsRef.current = notificationIdsRef.current.length;
      setScheduledCount(notificationIdsRef.current.length);
      
      // Verify notifications were actually scheduled (important for debugging)
      try {
        const verifyScheduled = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`Scheduled ${newNotificationIds.length} notifications. Total scheduled: ${verifyScheduled.length}`);
        
        // If we scheduled notifications but they don't appear, there might be an OS limit issue
        if (verifyScheduled.length < newNotificationIds.length && initialBatch) {
          console.warn(`Warning: Only ${verifyScheduled.length} notifications scheduled out of ${newNotificationIds.length} requested. Possible OS limit.`);
        }
      } catch (error) {
        console.error('Error verifying scheduled notifications:', error);
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      // Retry if we got an error and nothing was scheduled
      if (isActiveRef.current && newNotificationIds.length === 0) {
        console.log('Retrying notification scheduling after error...');
        setTimeout(() => {
          if (isActiveRef.current) {
            scheduleNextNotificationBatch(skipFirst, initialBatch);
          }
        }, 1000);
      }
    }
  };

  const cancelAllNotifications = async () => {
    try {
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Verify cancellation
      const remaining = await Notifications.getAllScheduledNotificationsAsync();
      if (remaining.length > 0) {
        console.warn(`Warning: ${remaining.length} notifications still scheduled after cancellation`);
        // Cancel any remaining ones by ID
        for (const notif of remaining) {
          try {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier);
          } catch (err) {
            console.error('Error cancelling individual notification:', err);
          }
        }
      }
      
      // Clear tracking
      notificationIdsRef.current = [];
      scheduledNotificationsRef.current = 0;
      setScheduledCount(0);
      
      console.log('All notifications cancelled successfully');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  };

  const formatTime = (seconds: number, useFullMinutes = false) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) {
      return useFullMinutes ? `${mins} min${mins > 1 ? 's' : ''}` : `${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatIntervalLabel = (seconds: number) => formatTime(seconds, true);

  const handleMinIntervalChange = (value: number) => {
    const newMin = Math.round(value);
    setMinInterval(newMin);
    if (newMin > maxInterval) setMaxInterval(newMin);
    
    // Reschedule if active - use large batch since settings changed
    if (isActive) {
      cancelAllNotifications();
      scheduleNextNotificationBatch(false, true);
    }
  };

  const handleMaxIntervalChange = (value: number) => {
    const newMax = Math.round(value);
    setMaxInterval(newMax);
    if (newMax < minInterval) setMinInterval(newMax);
    
    // Reschedule if active - use large batch since settings changed
    if (isActive) {
      cancelAllNotifications();
      scheduleNextNotificationBatch(false, true);
    }
  };

  const toggleActive = async () => {
    if (isActive) {
      isActiveRef.current = false;
      setIsActive(false);
      await cancelAllNotifications();
    } else {
      isActiveRef.current = true;
      setIsActive(true);
      // Schedule initial large batch so notifications work even when app is closed
      await scheduleNextNotificationBatch(false, true);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <StatusBar style="auto" />
        
        <Text style={styles.title}>Slack Notification Sound</Text>
        <Text style={styles.subtitle}>Plays at random intervals</Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[styles.status, isActive && styles.statusActive]}>
            {isActive ? '🟢 Active' : '⚪ Inactive'}
          </Text>
        </View>

        {isActive && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Notifications scheduled: {scheduledCount}
            </Text>
          </View>
        )}

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderTitle}>Interval Settings</Text>
          
          <View style={styles.sliderGroup}>
            <Text style={styles.sliderLabel}>
              Min Interval: {formatIntervalLabel(minInterval)}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={1800}
              step={1}
              value={minInterval}
              onValueChange={handleMinIntervalChange}
              minimumTrackTintColor="#4A154B"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#4A154B"
              disabled={isActive}
            />
          </View>

          <View style={styles.sliderGroup}>
            <Text style={styles.sliderLabel}>
              Max Interval: {formatIntervalLabel(maxInterval)}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={1800}
              step={1}
              value={maxInterval}
              onValueChange={handleMaxIntervalChange}
              minimumTrackTintColor="#4A154B"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#4A154B"
              disabled={isActive}
            />
          </View>

          <Text style={styles.intervalSummary}>
            Range: {formatIntervalLabel(minInterval)} - {formatIntervalLabel(maxInterval)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isActive && styles.buttonActive]}
          onPress={toggleActive}
        >
          <Text style={styles.buttonText}>
            {isActive ? 'Stop' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#4A154B', // Slack purple
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  statusLabel: {
    fontSize: 18,
    marginRight: 10,
    color: '#333',
  },
  status: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  statusActive: {
    color: '#2EB67D', // Slack green
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    minWidth: 200,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sliderContainer: {
    width: '100%',
    maxWidth: 350,
    marginBottom: 40,
    padding: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  sliderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A154B',
    marginBottom: 20,
    textAlign: 'center',
  },
  sliderGroup: {
    marginBottom: 25,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  intervalSummary: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#4A154B',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonActive: {
    backgroundColor: '#E01E5A', // Slack red
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
