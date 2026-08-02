import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  // Check if Monarch is already logged in
  const checkExistingAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (token) {
        router.replace('/dashboard');
      }
    } catch (e) {
      console.error('Auth Check Error', e);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter both Email and Password!');
      return;
    }

    setLoading(true);
    const endpoint = isLogin 
      ? "https://arise-presentation-api.onrender.com/api/auth/login"
      : "https://arise-presentation-api.onrender.com/api/auth/register";

    try {
      const response = await axios.post(endpoint, {
        email: email.trim().toLowerCase(),
        password: password.trim()
      });

      if (response.data && response.data.success) {
        // Save Token & User ID locally
        await AsyncStorage.setItem('user_token', response.data.token);
        await AsyncStorage.setItem('user_id', response.data.userId);
        await AsyncStorage.setItem('user_email', response.data.email);

        Alert.alert('System Notification', response.data.message || 'Access Granted!');
        router.replace('/dashboard');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Authentication failed. Please check credentials.';
      Alert.alert('Access Denied ⚔️', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Verifying Shadow Credentials...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER BRANDING */}
        <View style={styles.headerContainer}>
          <Text style={styles.systemBadge}>SOLO LEVELING SYSTEM</Text>
          <Text style={styles.mainTitle}>ARISE PROTOCOL</Text>
          <Text style={styles.subTitle}>
            {isLogin ? 'ENTER SHADOW GATEWAY' : 'AWAKEN NEW MONARCH'}
          </Text>
        </View>

        {/* AUTH CARD FORM */}
        <View style={styles.authCard}>
          <Text style={styles.label}>PLAYER EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="monarch@shadow.com"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>ACCESS PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••••••"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={styles.submitBtn}
            onPress={handleAuthSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0a0e27" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isLogin ? 'INITIALIZE LOGIN ⚡' : 'AWAKEN ACCOUNT ⚔️'}
              </Text>
            )}
          </TouchableOpacity>

          {/* TOGGLE LOGIN / SIGNUP */}
          <TouchableOpacity 
            style={styles.toggleBtn}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.toggleText}>
              {isLogin ? "New Player? Awaken Account" : "Already Awakened? Login Here"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0e27', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00d4ff', fontSize: 16, fontWeight: '800' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  systemBadge: { color: '#ffd700', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  mainTitle: { color: '#00d4ff', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  subTitle: { color: '#8b9dc3', fontSize: 13, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  authCard: { 
    backgroundColor: 'rgba(0, 212, 255, 0.04)', 
    borderWidth: 2, 
    borderColor: '#00d4ff', 
    borderRadius: 16, 
    padding: 24,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8
  },
  label: { color: '#8b9dc3', fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 12, letterSpacing: 0.5 },
  input: { 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderWidth: 1, 
    borderColor: 'rgba(0, 212, 255, 0.3)', 
    borderRadius: 10, 
    color: '#fff', 
    padding: 14, 
    fontSize: 14,
    fontWeight: '600'
  },
  submitBtn: { 
    backgroundColor: '#00d4ff', 
    borderRadius: 10, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 24,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6
  },
  submitBtnText: { color: '#0a0e27', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  toggleBtn: { marginTop: 18, alignItems: 'center' },
  toggleText: { color: '#00d4ff', fontSize: 13, fontWeight: '700' }
});