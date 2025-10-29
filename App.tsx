import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';

// Slack notification sound from local assets
const SLACK_SOUND = require('./assets/slack_notification.mp3');

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [nextSoundIn, setNextSoundIn] = useState<number | null>(null);
  const [minInterval, setMinInterval] = useState(10); // seconds
  const [maxInterval, setMaxInterval] = useState(30); // seconds
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    // Request audio permissions on mount
    (async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });
    })();

    return () => {
      // Cleanup on unmount
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        SLACK_SOUND,
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;

      // Unload after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play sound. Please check your sound file.');
    }
  };

  const scheduleNextSound = () => {
    if (!isActiveRef.current) return;

    // Generate random interval between min and max
    const randomInterval = Math.floor(
      Math.random() * (maxInterval - minInterval + 1) + minInterval
    );

    setNextSoundIn(randomInterval);

    // Countdown timer
    let remaining = randomInterval;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining >= 0) {
        setNextSoundIn(remaining);
      }
    }, 1000);

    // Schedule the sound
    timerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      if (isActiveRef.current) {
        playSound();
        // Schedule the next one
        scheduleNextSound();
      } else {
        setNextSoundIn(null);
      }
    }, randomInterval * 1000);
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
  };

  const handleMaxIntervalChange = (value: number) => {
    const newMax = Math.round(value);
    setMaxInterval(newMax);
    if (newMax < minInterval) setMinInterval(newMax);
  };

  const stopTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const toggleActive = () => {
    if (isActive) {
      isActiveRef.current = false;
      setIsActive(false);
      stopTimers();
      setNextSoundIn(null);
    } else {
      isActiveRef.current = true;
      setIsActive(true);
      scheduleNextSound();
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

        {isActive && nextSoundIn !== null && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>Next sound in:</Text>
            <Text style={styles.countdown}>{formatTime(nextSoundIn)}</Text>
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

        <TouchableOpacity
          style={styles.testButton}
          onPress={playSound}
        >
          <Text style={styles.testButtonText}>🔊 Test Sound</Text>
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
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#F8F8F8',
    padding: 20,
    borderRadius: 12,
    minWidth: 200,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  countdown: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A154B',
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
  testButton: {
    backgroundColor: '#ECB22E', // Slack yellow
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
