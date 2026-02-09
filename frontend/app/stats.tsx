import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { format } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface Stats {
  strength: number;
  vitality: number;
  agility: number;
  recovery: number;
}

interface Challenge {
  current_day: number;
  current_rank: string;
  current_level: number;
  stats: Stats;
  start_date: string;
}

interface HistoryItem {
  day_number: number;
  date: string;
  day_of_week: string;
  completion_percentage: number;
}

export default function StatsScreen() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [currentResponse, historyResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/challenge/current?user_id=default_user`),
        axios.get(`${BACKEND_URL}/api/challenge/history?user_id=default_user&days=30`),
      ]);

      if (currentResponse.data.active) {
        setChallenge(currentResponse.data.challenge);
      }

      if (historyResponse.data.history) {
        setHistory(historyResponse.data.history.reverse());
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: string) => {
    const colors: { [key: string]: string } = {
      'National': '#ffd700',
      'S': '#ff00ff',
      'A': '#00ff00',
      'B': '#00d4ff',
      'C': '#ffaa00',
      'D': '#888888',
      'E': '#666666',
    };
    return colors[rank] || '#666666';
  };

  const StatBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={styles.statBar}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBarContainer}>
        <View style={[styles.statBarFill, { width: `${value}%`, backgroundColor: color }]} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>No active challenge</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STATS & PROGRESS</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURRENT STATUS</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Day</Text>
              <Text style={styles.statusValue}>{challenge.current_day}/180</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Rank</Text>
              <Text style={[styles.statusValue, { color: getRankColor(challenge.current_rank) }]}>
                {challenge.current_rank}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Level</Text>
              <Text style={styles.statusValue}>{challenge.current_level}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UNLOCK YOUR POTENTIAL</Text>
          <StatBar label="Strength" value={challenge.stats.strength} color="#00ff64" />
          <StatBar label="Vitality" value={challenge.stats.vitality} color="#00d4ff" />
          <StatBar label="Agility" value={challenge.stats.agility} color="#ffaa00" />
          <StatBar label="Recovery" value={challenge.stats.recovery} color="#ff00ff" />
        </View>

        {/* Progress Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT PROGRESS (Last 30 Days)</Text>
          <View style={styles.progressChart}>
            {history.map((item, index) => (
              <View key={index} style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      height: `${item.completion_percentage}%`,
                      backgroundColor: item.completion_percentage >= 80 ? '#00ff64' : 
                                       item.completion_percentage >= 50 ? '#00d4ff' : '#ff6b6b',
                    },
                  ]}
                />
                {index % 5 === 0 && (
                  <Text style={styles.progressBarLabel}>D{item.day_number}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Recent History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT HISTORY</Text>
          {history.slice(0, 10).map((item, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDay}>Day {item.day_number}</Text>
                <Text style={styles.historyDate}>
                  {format(new Date(item.date), 'MMM dd, yyyy')} - {item.day_of_week}
                </Text>
              </View>
              <Text
                style={[
                  styles.historyPercentage,
                  {
                    color: item.completion_percentage >= 80 ? '#00ff64' : 
                           item.completion_percentage >= 50 ? '#00d4ff' : '#ff6b6b',
                  },
                ]}
              >
                {item.completion_percentage.toFixed(0)}%
              </Text>
            </View>
          ))}
        </View>

        {/* Rank Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RANKING SYSTEM</Text>
          <Text style={styles.rankGuideText}>Weekly ranks based on average completion:</Text>
          <View style={styles.rankList}>
            <View style={styles.rankItem}>
              <Text style={[styles.rankName, { color: '#ffd700' }]}>National</Text>
              <Text style={styles.rankRequirement}>97%+</Text>
            </View>
            <View style={styles.rankItem}>
              <Text style={[styles.rankName, { color: '#ff00ff' }]}>S</Text>
              <Text style={styles.rankRequirement}>93%+</Text>
            </View>
            <View style={styles.rankItem}>
              <Text style={[styles.rankName, { color: '#00ff00' }]}>A</Text>
              <Text style={styles.rankRequirement}>85%+</Text>
            </View>
            <View style={styles.rankItem}>
              <Text style={[styles.rankName, { color: '#00d4ff' }]}>B</Text>
              <Text style={styles.rankRequirement}>75%+</Text>
            </View>
            <View style={styles.rankItem}>
              <Text style={[styles.rankName, { color: '#ffaa00' }]}>C</Text>
              <Text style={styles.rankRequirement}>65%+</Text>
            </View>
            <View style={styles.rankItem}>
              <Text style={[styles.rankName, { color: '#888888' }]}>D</Text>
              <Text style={styles.rankRequirement}>50%+</Text>
            </View>
            <View style={styles.rankItem}>
              <Text style={[styles.rankName, { color: '#666666' }]}>E</Text>
              <Text style={styles.rankRequirement}>30%+</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    padding: 20,
    paddingTop: 48,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderBottomWidth: 2,
    borderBottomColor: '#00d4ff',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00d4ff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00d4ff',
    marginBottom: 16,
    letterSpacing: 1,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#8b9dc3',
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00d4ff',
  },
  statBar: {
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  statBarContainer: {
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  statValue: {
    position: 'absolute',
    right: 12,
    top: 6,
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  progressChart: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  progressBarFill: {
    width: '100%',
    borderRadius: 2,
  },
  progressBarLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 8,
    color: '#8b9dc3',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 212, 255, 0.1)',
  },
  historyLeft: {
    flex: 1,
  },
  historyDay: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#8b9dc3',
  },
  historyPercentage: {
    fontSize: 20,
    fontWeight: '900',
  },
  rankGuideText: {
    fontSize: 14,
    color: '#b8c5db',
    marginBottom: 16,
  },
  rankList: {
    gap: 12,
  },
  rankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rankName: {
    fontSize: 18,
    fontWeight: '900',
  },
  rankRequirement: {
    fontSize: 16,
    color: '#8b9dc3',
  },
  loadingText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 100,
  },
});
