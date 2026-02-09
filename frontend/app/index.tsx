import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    checkChallengeStatus();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const checkChallengeStatus = async () => {
    const hasStarted = await AsyncStorage.getItem('challenge_started');
    if (hasStarted === 'true') {
      setTimeout(() => {
        router.replace('/dashboard');
      }, 2000);
    }
  };

  const handleStart = async () => {
    await AsyncStorage.setItem('challenge_started', 'true');
    router.push('/onboarding');
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundOverlay} />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.mainTitle}>ARISE</Text>
        <Text style={styles.subtitle}>THE SHADOW PROTOCOL</Text>
        
        <View style={styles.hexagon}>
          <Text style={styles.hexText}>180</Text>
          <Text style={styles.hexSubtext}>DAYS</Text>
        </View>
        
        <Text style={styles.motto}>"Six days of war. One day of peace."</Text>
        
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>START MY JOURNEY</Text>
        </TouchableOpacity>
        
        <Text style={styles.warning}>⚠️ Once started, cannot be cancelled</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 100, 255, 0.05)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mainTitle: {
    fontSize: 64,
    fontWeight: '900',
    color: '#00d4ff',
    letterSpacing: 8,
    textShadowColor: '#00d4ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 4,
    marginBottom: 48,
  },
  hexagon: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 3,
    borderColor: '#00d4ff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    transform: [{ rotate: '45deg' }],
  },
  hexText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00d4ff',
    transform: [{ rotate: '-45deg' }],
  },
  hexSubtext: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    transform: [{ rotate: '-45deg' }],
    marginTop: -8,
  },
  motto: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#8b9dc3',
    textAlign: 'center',
    marginBottom: 48,
  },
  startButton: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 24,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0a0e27',
    letterSpacing: 2,
  },
  warning: {
    fontSize: 12,
    color: '#ff6b6b',
    textAlign: 'center',
  },
});
