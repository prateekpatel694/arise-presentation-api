import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

interface RankUser {
  username: string;
  score: number;
}

interface LeaderboardSection {
  locked: boolean;
  winner: RankUser | null;
  winners?: RankUser[];
  is_draw?: boolean;
  rankings: RankUser[];
}

interface AriseWinArchive {
  type: string;
  date: string;
  winner_name: string;
  score: number;
  is_draw?: boolean;
  co_winners?: string[];
}

interface LeaderboardData {
  server_time: string;
  active_view: string;
  daily: LeaderboardSection;
  weekly: LeaderboardSection;
  monthly: LeaderboardSection;
  arise_wins: AriseWinArchive[];
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

  const currentSection: LeaderboardSection | null = data ? data[activeTab] : null;

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
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />}
      >
        {currentSection?.locked ? (
          <View style={styles.lockedBox}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockedTitle}>LEADERBOARD LOCKED</Text>
            <Text style={styles.lockedSubtext}>
              {activeTab === 'daily' && 'Daily Winner reveals at 11:55 PM IST'}
              {activeTab === 'weekly' && 'Weekly Champion reveals on Sunday at 11:55 PM IST'}
              {activeTab === 'monthly' && 'Monthly Legend reveals at Month-End at 11:55 PM IST'}
            </Text>
            <Text style={styles.clockText}>Server Clock: {data?.server_time}</Text>
          </View>
        ) : (
          <View style={styles.unlockedBox}>
            {currentSection?.is_draw && currentSection.winners && currentSection.winners.length > 1 ? (
              <LinearGradient colors={['#ffd700', '#ff8800']} style={styles.drawCard}>
                <Text style={styles.drawBadge}>⚔️ RANK DRAW DETECTED (CO-CHAMPIONS) ⚔️</Text>
                <Text style={styles.drawScore}>Tied High Score: {currentSection.winners[0].score}%</Text>
                <View style={styles.drawNamesContainer}>
                  {currentSection.winners.map((w, idx) => (
                    <Text key={idx} style={styles.drawWinnerName}>
                      👑 {w.username.toUpperCase()}
                    </Text>
                  ))}
                </View>
              </LinearGradient>
            ) : currentSection?.winner ? (
              <LinearGradient colors={['#ffd700', '#ffaa00']} style={styles.winnerCard}>
                <Text style={styles.winnerBadge}>👑 {activeTab.toUpperCase()} CHAMPION</Text>
                <Text style={styles.winnerName}>{currentSection.winner.username.toUpperCase()}</Text>
                <Text style={styles.winnerScore}>Score: {currentSection.winner.score}%</Text>
              </LinearGradient>
            ) : null}

            <Text style={styles.rankingsHeader}>⚔️ GLOBAL STANDINGS</Text>
            {currentSection?.rankings && currentSection.rankings.length > 0 ? (
              currentSection.rankings.map((user, idx) => (
                <View key={idx} style={styles.rankRow}>
                  <Text style={styles.rankNum}>#{idx + 1}</Text>
                  <Text style={styles.rankName}>{user.username}</Text>
                  <Text style={styles.rankScore}>{user.score}%</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No rankings recorded today yet.</Text>
            )}
          </View>
        )}

        {/* ARISE WIN (PREVIOUS WINNERS) SECTION */}
        <View style={styles.ariseWinContainer}>
          <View style={styles.ariseWinHeaderRow}>
            <Text style={styles.ariseWinTitle}>👑 ARISE WIN</Text>
            <Text style={styles.ariseWinSubtitle}>PREVIOUS WINNERS ARCHIVE</Text>
          </View>

          {data?.arise_wins && data.arise_wins.length > 0 ? (
            data.arise_wins.map((win, idx) => (
              <View key={idx} style={[styles.ariseWinCard, win.is_draw && styles.ariseWinDrawCard]}>
                <View style={styles.ariseWinMetaRow}>
                  <Text style={styles.ariseWinType}>[{win.type?.toUpperCase()}]</Text>
                  <Text style={styles.ariseWinDate}>{win.date}</Text>
                </View>
                <Text style={styles.ariseWinWinner}>
                  {win.is_draw ? `🤝 ${win.winner_name}` : `👑 ${win.winner_name}`}
                </Text>
                <Text style={styles.ariseWinScoreText}>Score: {win.score}%</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No previous winner archives available.</Text>
          )}
        </View>
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
  lockedBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  lockIcon: { fontSize: 48, marginBottom: 12 },
  lockedTitle: { color: '#ff2e2e', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  lockedSubtext: { color: '#8b9dc3', textAlign: 'center', marginVertical: 8, fontSize: 13, paddingHorizontal: 20 },
  clockText: { color: '#00d4ff', fontWeight: '800', marginTop: 4, fontSize: 13 },
  unlockedBox: { marginTop: 8 },
  winnerCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, elevation: 8 },
  winnerBadge: { color: '#0a0e27', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  winnerName: { color: '#0a0e27', fontWeight: '900', fontSize: 24, marginVertical: 4 },
  winnerScore: { color: '#0a0e27', fontWeight: '800', fontSize: 14 },
  
  drawCard: { borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#ffffff' },
  drawBadge: { color: '#0a0e27', fontWeight: '900', fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  drawScore: { color: '#0a0e27', fontWeight: '800', fontSize: 13, marginBottom: 8 },
  drawNamesContainer: { width: '100%', alignItems: 'center' },
  drawWinnerName: { color: '#0a0e27', fontWeight: '900', fontSize: 18, marginVertical: 2 },

  rankingsHeader: { color: '#00d4ff', fontWeight: '900', fontSize: 15, marginBottom: 12, letterSpacing: 1 },
  rankRow: { backgroundColor: '#082943', borderWidth: 1, borderColor: 'rgba(0, 212, 255, 0.3)', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rankNum: { color: '#ffd700', fontWeight: '900', fontSize: 16, width: 40 },
  rankName: { color: '#ffffff', fontWeight: '800', fontSize: 15, flex: 1 },
  rankScore: { color: '#00ff64', fontWeight: '900', fontSize: 15 },
  
  ariseWinContainer: { width: '100%', marginTop: 24, paddingTop: 16, borderTopWidth: 2, borderTopColor: 'rgba(0, 212, 255, 0.3)' },
  ariseWinHeaderRow: { marginBottom: 14 },
  ariseWinTitle: { color: '#ffd700', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  ariseWinSubtitle: { color: '#8b9dc3', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  ariseWinCard: { backgroundColor: 'rgba(255, 215, 0, 0.08)', borderWidth: 1.5, borderColor: '#ffd700', padding: 14, borderRadius: 10, marginBottom: 10 },
  ariseWinDrawCard: { borderColor: '#00ff64', backgroundColor: 'rgba(0, 255, 100, 0.06)' },
  ariseWinMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  ariseWinType: { color: '#ffd700', fontSize: 11, fontWeight: '900' },
  ariseWinDate: { color: '#8b9dc3', fontSize: 11, fontWeight: '700' },
  ariseWinWinner: { color: '#ffffff', fontSize: 15, fontWeight: '900', marginTop: 2 },
  ariseWinScoreText: { color: '#00ff64', fontSize: 12, fontWeight: '800', marginTop: 4 },
  emptyText: { color: '#8b9dc3', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }
});