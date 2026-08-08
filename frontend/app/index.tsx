import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal, Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // SERVER AUTO-WAKEUP & BREATHING TIMER STATES
  const [serverAwake, setServerAwake] = useState(false);
  const [serverPingTimer, setServerPingTimer] = useState(0);
  const breathAnim = useRef(new Animated.Value(1)).current;

  // Forgot Password & Timer States
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // VIDEO ANIMATION STATE (INDEX LOGIN AWAKENING)
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    startServerWakeupPing();
    startBreathingAnimation();
    checkExistingAuth();
  }, []);

  // CYBER BREATHING PULSE ANIMATION LOGIC
  const startBreathingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.25,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // INBUILT SERVER AUTO-WAKEUP SIGNAL LOGIC
  const startServerWakeupPing = async () => {
    let seconds = 0;
    const interval = setInterval(() => {
      seconds += 1;
      setServerPingTimer(seconds);
    }, 1000);

    try {
      const pingResponse = await axios.get("https://arise-presentation-api.onrender.com/", { timeout: 35000 });
      if (pingResponse.data && pingResponse.data.status === 'Online') {
        setServerAwake(true);
      }
    } catch (e) {
      console.log('Server waking ping attempt finished.');
      setServerAwake(true); // Fallback unlock
    } finally {
      clearInterval(interval);
    }
  };

  // 60-SECOND COUNTDOWN TIMER LOGIC
  useEffect(() => {
    let interval: any = null;
    if (forgotModalVisible && resetStep === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [forgotModalVisible, resetStep, timer]);

  const checkExistingAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (token) {
        // Direct entry without index login -> Pass flag to trigger direct dashboard video
        router.replace({ pathname: '/dashboard', params: { directEntry: 'true' } });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleAuthSubmit = async () => {
    if (!isLogin && !username.trim()) {
      Alert.alert('Required', 'Please enter a unique Hunter Username!');
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

        setShowVideo(true); // Show awakening.mp4 for index login path
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Authentication failed.';
      Alert.alert('Access Denied ⚔️', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoFinish = () => {
    setShowVideo(false);
    router.replace('/dashboard');
  };

  const handleRequestOTP = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Required', 'Please enter registered Email!');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("https://arise-presentation-api.onrender.com/api/auth/forgot-password", {
        email: resetEmail.trim().toLowerCase()
      });
      if (res.data.success) {
        Alert.alert('OTP Sent 📩', res.data.message);
        setResetStep(2);
        setTimer(60);
        setCanResend(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const res = await axios.post("https://arise-presentation-api.onrender.com/api/auth/forgot-password", {
        email: resetEmail.trim().toLowerCase()
      });
      if (res.data.success) {
        Alert.alert('New OTP Sent 📩', 'A fresh OTP code has been sent to your email!');
        setTimer(60);
        setCanResend(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to resend OTP');
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
        email: resetEmail.trim().toLowerCase(),
        otp: otpCode.trim(),
        new_password: newPassword.trim()
      });
      if (res.data.success) {
        Alert.alert('Success 🎉', 'Password reset successful! You can now login.');
        handleCancelModal();
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelModal = () => {
    setForgotModalVisible(false);
    setResetStep(1);
    setResetEmail('');
    setOtpCode('');
    setNewPassword('');
    setShowNewPassword(false);
    setTimer(60);
    setCanResend(false);
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Verifying Shadow Credentials...</Text>
      </View>
    );
  }

  // FULL SCREEN AWAKENING VIDEO TRANSITION (INDEX LOGIN PATH)
  if (showVideo) {
    return (
      <View style={styles.videoContainer}>
        <Video
          source={require('../assets/awakening.mp4')}
          style={styles.fullVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              handleVideoFinish();
            }
          }}
        />
        <TouchableOpacity style={styles.skipButton} onPress={handleVideoFinish}>
          <Text style={styles.skipText}>SKIP ⏩</Text>
        </TouchableOpacity>
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

        {/* SERVER WAKEUP BREATHING TIMER OVERLAY */}
        {!serverAwake && (
          <View style={styles.serverWakeupCard}>
            <Animated.View style={[styles.breathingCircle, { transform: [{ scale: breathAnim }] }]}>
              <Text style={styles.breathingTimerText}>{serverPingTimer}s</Text>
            </Animated.View>
            <Text style={styles.serverWakeupTitle}>⚡ AWAKENING SHADOW SERVER...</Text>
            <Text style={styles.serverWakeupSub}>Connecting to Render cloud instance in background</Text>
            
            <TouchableOpacity style={styles.manualSkipBtn} onPress={() => setServerAwake(true)}>
              <Text style={styles.manualSkipText}>ENTER GATEWAY ⚡</Text>
            </TouchableOpacity>
          </View>
        )}

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
            <Text style={styles.toggleText}>{isLogin ? "New Hunter? Awaken System" : "Already Awakened? Login Here"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FORGOT PASSWORD MODAL */}
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

                <View style={styles.timerRow}>
                  <Text style={styles.timerText}>
                    {canResend ? "Didn't receive OTP?" : `Resend in ${timer}s`}
                  </Text>
                  <TouchableOpacity 
                    onPress={handleResendOTP} 
                    disabled={!canResend || loading}
                    style={styles.resendBtn}
                  >
                    <Text style={[styles.resendBtnText, !canResend && styles.resendBtnDisabled]}>
                      RESEND OTP 🔄
                    </Text>
                  </TouchableOpacity>
                </View>

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

            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={handleCancelModal}>
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
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  systemBadge: { color: '#ffd700', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  mainTitle: { color: '#00d4ff', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  subTitle: { color: '#8b9dc3', fontSize: 13, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  
  /* BREATHING SERVER WAKEUP STYLING */
  serverWakeupCard: { backgroundColor: 'rgba(0, 212, 255, 0.08)', borderWidth: 1.5, borderColor: '#00d4ff', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  breathingCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0, 212, 255, 0.2)', borderWidth: 2, borderColor: '#00d4ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  breathingTimerText: { color: '#00ff64', fontSize: 18, fontWeight: '900' },
  serverWakeupTitle: { color: '#00d4ff', fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  serverWakeupSub: { color: '#8b9dc3', fontSize: 11, textAlign: 'center', marginBottom: 12 },
  manualSkipBtn: { backgroundColor: '#00d4ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  manualSkipText: { color: '#0a0e27', fontWeight: '900', fontSize: 12 },

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
  modalTitle: { color: '#00d4ff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  timerText: { color: '#8b9dc3', fontSize: 12, fontWeight: '700' },
  resendBtn: { paddingVertical: 4 },
  resendBtnText: { color: '#00d4ff', fontSize: 12, fontWeight: '900' },
  resendBtnDisabled: { color: '#555555' },
  videoContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  fullVideo: { width: '100%', height: '100%' },
  skipButton: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0, 212, 255, 0.3)', borderWidth: 1, borderColor: '#00d4ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  skipText: { color: '#ffffff', fontWeight: '900', fontSize: 12 }
});