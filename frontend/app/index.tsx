import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal 
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Forgot Password States
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (token) {
        router.replace('/dashboard');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleAuthSubmit = async () => {
    if (!isLogin && !username.trim()) {
      Alert.alert('Required', 'Please enter a unique Hunter / Shadow Username!');
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter Email and Password!');
      return;
    }

    setLoading(true);
    const endpoint = isLogin 
      ? "https://arise-presentation-api.onrender.com/api/auth/login"
      : "https://arise-presentation-api.onrender.com/api/auth/register";

    const payload = isLogin ? {
      email_or_username: email.trim().toLowerCase(),
      password: password.trim()
    } : {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim()
    };

    try {
      const response = await axios.post(endpoint, payload);

      if (response.data && response.data.success) {
        await AsyncStorage.setItem('user_token', response.data.token);
        await AsyncStorage.setItem('user_id', response.data.userId);
        await AsyncStorage.setItem('user_email', response.data.email);
        await AsyncStorage.setItem('username', response.data.username || 'Monarch');

        Alert.alert('System Awoken ⚔️', response.data.message || 'Access Granted!');
        router.replace('/dashboard');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Authentication failed.';
      Alert.alert('Access Denied ⚔️', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Required', 'Please enter registered Email!');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("https://arise-presentation-api.onrender.com/api/auth/forgot-password", {
        email: resetEmail.trim()
      });
      if (res.data.success) {
        Alert.alert('OTP Sent 📩', res.data.message);
        setResetStep(2);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode.trim() || !newPassword.trim()) {
      Alert.alert('Required', 'Please enter both OTP and New Password!');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("https://arise-presentation-api.onrender.com/api/auth/reset-password", {
        email: resetEmail.trim(),
        otp: otpCode.trim(),
        new_password: newPassword.trim()
      });
      if (res.data.success) {
        Alert.alert('Success 🎉', 'Password reset successfully! You can now login.');
        setForgotModalVisible(false);
        setResetStep(1);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to reset password');
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.systemBadge}>SOLO LEVELING SYSTEM</Text>
          <Text style={styles.mainTitle}>ARISE PROTOCOL</Text>
          <Text style={styles.subTitle}>{isLogin ? 'ENTER SHADOW GATEWAY' : 'AWAKEN NEW MONARCH'}</Text>
        </View>

        <View style={styles.authCard}>
          {!isLogin && (
            <>
              <Text style={styles.label}>UNIQUE HUNTER NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., SungJinWoo, ShadowKing"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </>
          )}

          <Text style={styles.label}>{isLogin ? 'PLAYER EMAIL / USERNAME' : 'PLAYER EMAIL'}</Text>
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
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••••••"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#00d4ff" />
            </TouchableOpacity>
          </View>

          {isLogin && (
            <TouchableOpacity onPress={() => setForgotModalVisible(true)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
              <Text style={{ color: '#00d4ff', fontSize: 12, fontWeight: '700' }}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleAuthSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#0a0e27" /> : <Text style={styles.submitBtnText}>{isLogin ? 'INITIALIZE LOGIN ⚡' : 'AWAKEN ACCOUNT ⚔️'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.toggleText}>{isLogin ? "New Player? Awaken Account" : "Already Awakened? Login Here"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FORGOT PASSWORD MODAL WITH EYE TOGGLE */}
      <Modal visible={forgotModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔑 RESET PASSWORD</Text>

            {resetStep === 1 ? (
              <>
                <Text style={styles.label}>REGISTERED EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="monarch@shadow.com"
                  placeholderTextColor="#666"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.submitBtn} onPress={handleRequestOTP} disabled={loading}>
                  <Text style={styles.submitBtnText}>SEND OTP CODE 📩</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>6-DIGIT OTP CODE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123456"
                  placeholderTextColor="#666"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>NEW PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••••••"
                    placeholderTextColor="#666"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons name={showNewPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#00d4ff" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleResetPassword} disabled={loading}>
                  <Text style={styles.submitBtnText}>VERIFY & RESET ⚡</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setForgotModalVisible(false)}>
              <Text style={{ color: '#ff6b6b', fontWeight: '800' }}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  authCard: { backgroundColor: 'rgba(0, 212, 255, 0.04)', borderWidth: 2, borderColor: '#00d4ff', borderRadius: 16, padding: 24 },
  label: { color: '#8b9dc3', fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(0, 212, 255, 0.3)', borderRadius: 10, color: '#fff', padding: 14, fontSize: 14 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(0, 212, 255, 0.3)', borderRadius: 10 },
  passwordInput: { flex: 1, color: '#fff', padding: 14, fontSize: 14 },
  eyeIconContainer: { paddingHorizontal: 14, paddingVertical: 10 },
  submitBtn: { backgroundColor: '#00d4ff', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#0a0e27', fontSize: 15, fontWeight: '900' },
  toggleBtn: { marginTop: 18, alignItems: 'center' },
  toggleText: { color: '#00d4ff', fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0a0e27', borderWidth: 2, borderColor: '#00d4ff', borderRadius: 16, padding: 24 },
  modalTitle: { color: '#00d4ff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 12 }
});