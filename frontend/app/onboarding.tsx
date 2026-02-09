import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as Notifications from 'expo-notifications';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const scheduleNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please enable notifications to get task reminders.');
      return false;
    }

    // Configure notifications
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00d4ff',
    });

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    return true;
  };

  const startChallenge = async () => {
    setLoading(true);
    try {
      // Request notification permissions
      const notifGranted = await scheduleNotifications();
      if (!notifGranted) {
        setLoading(false);
        return;
      }

      // Start challenge
      const response = await axios.post(`${BACKEND_URL}/api/challenge/start`, {
        user_id: 'default_user'
      });

      if (response.data.success) {
        Alert.alert(
          'Challenge Started!',
          'Your 180-day journey begins now. ARISE!',
          [{ text: 'Let\'s Go!', onPress: () => router.replace('/dashboard') }]
        );
      } else if (response.data.error) {
        Alert.alert('Already Started', 'You already have an active challenge!');
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error('Error starting challenge:', error);
      Alert.alert('Error', 'Failed to start challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>THE SHADOW PROTOCOL</Text>
      <Text style={styles.subtitle}>180-Day Transformation</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 SCHEDULE</Text>
        <Text style={styles.text}>Monday - Saturday: Full Battle Mode</Text>
        <Text style={styles.text}>Sunday: Rest Day (Auto 100%)</Text>
        <Text style={styles.highlight}>Target Sleep: ~4 Hours 10 Mins</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚔️ DAILY MISSIONS</Text>
        <Text style={styles.text}>• Morning: Wake, Meditate, College</Text>
        <Text style={styles.text}>• Evening: Gym Warfare (1h 45m)</Text>
        <Text style={styles.text}>• Night: Trading, Aptitude, Coding</Text>
        <Text style={styles.text}>• Late Night: Content Creation</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 RANKING SYSTEM</Text>
        <Text style={styles.text}>Weekly rank based on completion %:</Text>
        <View style={styles.rankList}>
          <Text style={styles.rankItem}>E: 30%+ | D: 50%+ | C: 65%+</Text>
          <Text style={styles.rankItem}>B: 75%+ | A: 85%+</Text>
          <Text style={styles.rankItem}>S: 93%+ | National: 97%+</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ COMPLETION RULES</Text>
        <Text style={styles.text}>• Partial credit: tasks completed / total</Text>
        <Text style={styles.text}>• Sword animations for Kill/Defeat</Text>
        <Text style={styles.text}>• Stats based on performance</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 NOTIFICATIONS</Text>
        <Text style={styles.text}>Each task gets its own reminder</Text>
        <Text style={styles.text}>Alerts on app open for status</Text>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ WARNING</Text>
        <Text style={styles.warningText}>Once started, this challenge runs continuously for 180 days.</Text>
        <Text style={styles.warningText}>It CANNOT be cancelled or paused.</Text>
        <Text style={styles.warningText}>Are you ready to ARISE?</Text>
      </View>

      <TouchableOpacity 
        style={[styles.startButton, loading && styles.startButtonDisabled]} 
        onPress={startChallenge}
        disabled={loading}
      >
        <Text style={styles.startButtonText}>
          {loading ? 'STARTING...' : 'START 180-DAY CHALLENGE'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00d4ff',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00d4ff',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#b8c5db',
    marginBottom: 6,
    lineHeight: 20,
  },
  highlight: {
    fontSize: 14,
    color: '#00d4ff',
    fontWeight: '700',
    marginTop: 8,
  },
  rankList: {
    marginTop: 8,
  },
  rankItem: {
    fontSize: 13,
    color: '#8b9dc3',
    marginBottom: 4,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 2,
    borderColor: '#ff6b6b',
    borderRadius: 12,
    padding: 20,
    marginVertical: 24,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ff6b6b',
    marginBottom: 12,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#ffb3b3',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#00d4ff',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 48,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#4a5568',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0a0e27',
    textAlign: 'center',
    letterSpacing: 2,
  },
});
