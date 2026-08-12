import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

interface RankUser {
  username: string;
  score: number;
}

interface LeaderboardData {
  server_time: string;
  active_view: string;
  daily: { locked: boolean; winner: RankUser | null; rankings: RankUser[] };
  weekly: { locked: boolean; winner: RankUser | null; rankings: RankUser[] };
  monthly: { locked: boolean; winner: RankUser | null; rankings: RankUser[] };
  archives: any[];
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get('https://arise-presentation-api.onrender.com/api/leaderboard');
      if (res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00d4ff" />
        <Text style={styles.loadingText}>CALCULATING GLOBAL LEADERBOARD...</Text>
      </View>
    );
  }

  const currentSection = data ? data[activeTab] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>◀ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GLOBAL LEADERBOARD 🏆</Text>
      </View>

      <View style={styles.tabBar}>
        {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />}
      >
        {currentSection?.locked ? (
          <View style={styles.lockedBox}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockedTitle}>LEADERBOARD LOCKED</Text>
            <Text style={styles.lockedSubtext}>
              {activeTab === 'daily' && 'Daily Winner reveals at 11:59 PM IST (Unlocks at 11:57 PM)'}
              {activeTab === 'weekly' && 'Weekly Champion reveals on Sunday at 11:59 PM IST'}
              {activeTab === 'monthly' && 'Monthly Legend reveals at Month-End at 11:59 PM IST'}
            </Text>
            <Text style={styles.clockText}>Server Clock: {data?.server_time}</Text>

            {data?.archives && data.archives.length > 0 && (
              <View style={styles.archiveContainer}>
                <Text style={styles.archiveHeader}>🏆 HALL OF FAME (PAST WINNERS)</Text>
                {data.archives.map((win, idx) => (
                  <View key={idx} style={styles.archiveCard}>
                    <Text style={styles.archiveType}>[{win.type?.toUpperCase()}] {win.date}</Text>
                    <Text style={styles.archiveWinner}>👑 {win.winner_name} ({win.score}%)</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.unlockedBox}>
            {currentSection?.winner && (
              <LinearGradient colors={['#ffd700', '#ffaa00']} style={styles.winnerCard}>
                <Text style={styles.winnerBadge}>👑 {activeTab.toUpperCase()} CHAMPION</Text>
                <Text style={styles.winnerName}>{currentSection.winner.username.toUpperCase()}</Text>
                <Text style={styles.winnerScore}>Score: {currentSection.winner.score}%</Text>
              </LinearGradient>
            )}

            <Text style={styles.rankingsHeader}>⚔️ GLOBAL RANKINGS</Text>
            {currentSection?.rankings.map((user, idx) => (
              <View key={idx} style={styles.rankRow}>
                <Text style={styles.rankNum}>#{idx + 1}</Text>
                <Text style={styles.rankName}>{user.username}</Text>
                <Text style={styles.rankScore}>{user.score}%</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060919' },
  centerContainer: { flex: 1, backgroundColor: '#060919', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00d4ff', fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: 'rgba(0, 212, 255, 0.05)', borderBottomWidth: 2, borderBottomColor: '#00d4ff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { backgroundColor: 'rgba(0, 212, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#00d4ff' },
  backText: { color: '#00d4ff', fontWeight: '900', fontSize: 12 },
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 16, marginLeft: 16, letterSpacing: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#082943', marginHorizontal: 16, marginTop: 16, borderRadius: 10, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTabBtn: { backgroundColor: '#00d4ff' },
  tabText: { color: '#8b9dc3', fontWeight: '900', fontSize: 12 },
  activeTabText: { color: '#0a0e27' },
  lockedBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  lockIcon: { fontSize: 54, marginBottom: 12 },
  lockedTitle: { color: '#ff2e2e', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  lockedSubtext: { color: '#8b9dc3', textAlign: 'center', marginVertical: 10, fontSize: 13, paddingHorizontal: 20 },
  clockText: { color: '#00d4ff', fontWeight: '800', marginTop: 6, fontSize: 13 },
  unlockedBox: { marginTop: 10 },
  winnerCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, elevation: 8 },
  winnerBadge: { color: '#0a0e27', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  winnerName: { color: '#0a0e27', fontWeight: '900', fontSize: 24, marginVertical: 4 },
  winnerScore: { color: '#0a0e27', fontWeight: '800', fontSize: 14 },
  rankingsHeader: { color: '#00d4ff', fontWeight: '900', fontSize: 15, marginBottom: 12, letterSpacing: 1 },
  rankRow: { backgroundColor: '#082943', borderWidth: 1, borderColor: 'rgba(0, 212, 255, 0.3)', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rankNum: { color: '#ffd700', fontWeight: '900', fontSize: 16, width: 40 },
  rankName: { color: '#ffffff', fontWeight: '800', fontSize: 15, flex: 1 },
  rankScore: { color: '#00ff64', fontWeight: '900', fontSize: 15 },
  archiveContainer: { width: '100%', marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(0, 212, 255, 0.2)' },
  archiveHeader: { color: '#ffd700', fontWeight: '900', fontSize: 14, marginBottom: 12, letterSpacing: 1 },
  archiveCard: { backgroundColor: 'rgba(255, 215, 0, 0.08)', borderWidth: 1, borderColor: '#ffd700', padding: 12, borderRadius: 8, marginBottom: 8 },
  archiveType: { color: '#8b9dc3', fontSize: 11, fontWeight: '700' },
  archiveWinner: { color: '#ffffff', fontSize: 14, fontWeight: '900', marginTop: 2 }
});