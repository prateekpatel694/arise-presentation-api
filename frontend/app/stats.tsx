import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface Task {
  task: string;
  completed: boolean;
}

interface DayHistory {
  day_number: number;
  date: string;
  completion_percentage: number;
  rank?: string;
  tasks?: Task[];
}

interface ChallengeData {
  current_day: number;
  current_rank: string;
  current_level: number;
  stats: {
    strength: number;
    vitality: number;
    agility: number;
    recovery: number;
  };
}

const RANKS = ['1%', 'S', 'A', 'B', 'C', 'D', 'E'];
const RANK_COLORS: { [key: string]: string } = {
  '1%': '#ffd700',
  'S': '#ff00ff',
  'A': '#00ff00',
  'B': '#00d4ff',
  'C': '#ffaa00',
  'D': '#888888',
  'E': '#666666',
};

// HELPER TO CALCULATE RANK FROM DAILY COMPLETION PERCENTAGE
const calculateDayRank = (percentage: number): string => {
  if (percentage >= 100) return '1%';
  if (percentage >= 90) return 'S';
  if (percentage >= 85) return 'A';
  if (percentage >= 75) return 'B';
  if (percentage >= 65) return 'C';
  if (percentage >= 50) return 'D';
  return 'E';
};

export default function StatsScreen() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // NEW STATS METRICS STATES
  const [dailyTaskRatio, setDailyTaskRatio] = useState<string>('0/0');
  const [weeklyAvgRate, setWeeklyAvgRate] = useState<string>('0%');
  const [weeklyAvgRank, setWeeklyAvgRank] = useState<string>('E');
  const [remainingDays, setRemainingDays] = useState<number>(180);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('user_id');
      const activeUserId = storedUserId || 'default_user';

      const response = await axios.get(`https://arise-presentation-api.onrender.com/api/challenge/current?user_id=${activeUserId}`);
      
      if (response && response.data) {
        if (response.data.challenge) {
          setChallenge(response.data.challenge);
          const currentDayNum = response.data.challenge.current_day || 1;
          setRemainingDays(Math.max(0, 180 - currentDayNum));
        }
        
        // 1. CALCULATE DAILY TASK RATIO (Completed/Total)
        if (response.data.today && Array.isArray(response.data.today.tasks)) {
          const tasks = response.data.today.tasks;
          const completedCount = tasks.filter((t: any) => t.completed).length;
          setDailyTaskRatio(`${completedCount}/${tasks.length}`);
        }

        const currentDay = response.data.challenge?.current_day || 1;
        let historyList: DayHistory[] = [];

        if (Array.isArray(response.data.history) && response.data.history.length > 0) {
          historyList = response.data.history.map((h: any) => ({
            ...h,
            rank: calculateDayRank(h.completion_percentage || 0)
          }));
        } else {
          for (let d = 1; d <= currentDay; d++) {
            const compPercent = d === currentDay ? (response.data.today?.completion_percentage || 0) : 0;
            historyList.push({
              day_number: d,
              date: new Date(Date.now() - (currentDay - d) * 86400000).toISOString(),
              completion_percentage: compPercent,
              rank: calculateDayRank(compPercent),
              tasks: response.data.today?.tasks || []
            });
          }
        }

        setHistory(historyList);

        // 2. CALCULATE WEEKLY AVERAGE COMPLETION RATE & RANK
        if (historyList.length > 0) {
          const recentDays = historyList.slice(-7); // Last 7 days
          const totalPct = recentDays.reduce((acc, item) => acc + (item.completion_percentage || 0), 0);
          const avgPct = Math.round(totalPct / recentDays.length);
          
          setWeeklyAvgRate(`${avgPct}%`);
          setWeeklyAvgRank(calculateDayRank(avgPct));
        }
      }
    } catch (e) {
      console.error('Error fetching user stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const getRankYPosition = (rank: string, height: number, padding: number) => {
    const index = RANKS.indexOf(rank);
    const validIndex = index !== -1 ? index : 6;
    return padding + (validIndex / (RANKS.length - 1)) * (height - padding * 2);
  };

  const renderRankGraph = () => {
    const svgWidth = width - 90;
    const svgHeight = 200;
    const padding = 20;

    if (!history || history.length === 0) return null;

    const points = history.map((item, idx) => {
      const x = history.length === 1 
        ? svgWidth / 2 
        : padding + (idx / (history.length - 1)) * (svgWidth - padding * 2);
      const computedRank = calculateDayRank(item.completion_percentage || 0);
      const y = getRankYPosition(computedRank, svgHeight, padding);
      return { x, y, day: item.day_number, rank: computedRank };
    });

    let dPath = `M ${points[0].x} ${points[0].y}`;
    if (points.length > 1) {
      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        const cp1X = curr.x + (next.x - curr.x) / 2;
        const cp1Y = curr.y;
        const cp2X = curr.x + (next.x - curr.x) / 2;
        const cp2Y = next.y;
        dPath += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${next.x} ${next.y}`;
      }
    } else {
      dPath += ` L ${svgWidth - padding} ${points[0].y}`;
    }

    const dArea = `${dPath} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;

    return (
      <View style={styles.graphContainer}>
        <View style={styles.yAxisContainer}>
          {RANKS.map((r, i) => (
            <Text key={i} style={[styles.yAxisText, { color: RANK_COLORS[r] }]}>
              {r}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          <Svg width={svgWidth} height={svgHeight}>
            <Defs>
              <LinearGradient id="cyberGlow" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#00d4ff" stopOpacity="0.5" />
                <Stop offset="100%" stopColor="#00d4ff" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {RANKS.map((_, idx) => {
              const yPos = padding + (idx / (RANKS.length - 1)) * (svgHeight - padding * 2);
              return (
                <Line
                  key={idx}
                  x1={0}
                  y1={yPos}
                  x2={svgWidth}
                  y2={yPos}
                  stroke="rgba(0, 212, 255, 0.12)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              );
            })}

            <Path d={dArea} fill="url(#cyberGlow)" />
            <Path d={dPath} fill="none" stroke="#00ff64" strokeWidth="3.5" />

            {points.map((pt, i) => (
              <React.Fragment key={i}>
                <Circle cx={pt.x} cy={pt.y} r="6" fill="#0a0e27" stroke="#00ff64" strokeWidth="2.5" />
                <Circle cx={pt.x} cy={pt.y} r="3" fill="#00d4ff" />
              </React.Fragment>
            ))}
          </Svg>

          <View style={styles.xAxisRow}>
            {history.map((item, idx) => (
              <Text key={idx} style={styles.xAxisText}>{item.day_number}</Text>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Fetching Shadow Records...</Text>
      </View>
    );
  }

  // REVERSE HISTORY LIST SEQUENCE (DAY 4 -> DAY 3 -> DAY 2 -> DAY 1)
  const reversedHistory = history ? [...history].reverse() : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>◀ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STATS & PROGRESS</Text>
      </View>

      <ScrollView 
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {challenge && (
          <View style={styles.overviewCard}>
            <View style={styles.rankContainer}>
              <View style={[styles.rankBadge, { borderColor: RANK_COLORS[challenge.current_rank] || '#00d4ff' }]}>
                <Text style={[styles.rankText, { color: RANK_COLORS[challenge.current_rank] || '#00d4ff' }]}>
                  {challenge.current_rank}
                </Text>
              </View>
              <View>
                <Text style={styles.levelText}>LVL {challenge.current_level}</Text>
                <Text style={styles.subText}>Current Day: Day {challenge.current_day}</Text>
              </View>
            </View>
          </View>
        )}

        {/* MODIFIED SHADOW ATTRIBUTES SECTION */}
        <Text style={styles.sectionTitle}>⚔️ SHADOW ATTRIBUTES</Text>
        <View style={styles.statsGrid}>
          {/* 1. DAILY TASKS (Completed / Total) */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DAILY TASKS</Text>
            <Text style={styles.statValue}>{dailyTaskRatio}</Text>
          </View>

          {/* 2. WILLPOWER (Weekly Average Completion Rate) */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WILLPOWER</Text>
            <Text style={styles.statValue}>{weeklyAvgRate}</Text>
          </View>

          {/* 3. AVG RANK (Weekly Average Rank) */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>AVG RANK</Text>
            <Text style={[styles.statValue, { color: RANK_COLORS[weeklyAvgRank] || '#00d4ff' }]}>
              {weeklyAvgRank}
            </Text>
          </View>

          {/* 4. END (Remaining Days out of 180) */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>END</Text>
            <Text style={styles.statValue}>{remainingDays} Days</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>📈 BATTLE GRAPH (Rank vs Days)</Text>
        <View style={styles.cyberCard}>
          {renderRankGraph()}
        </View>

        <Text style={styles.sectionTitle}>📜 RECENT HISTORY</Text>
        <View style={styles.historyListContainer}>
          {reversedHistory && reversedHistory.length > 0 ? (
            reversedHistory.map((dayItem, index) => {
              const compPercent = dayItem.completion_percentage || 0;
              return (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.dayNumText}>DAY {dayItem.day_number}</Text>
                    <Text style={styles.dateText}>
                      {dayItem.date ? format(new Date(dayItem.date), 'MMM dd, yyyy') : ''}
                    </Text>
                  </View>

                  <View style={styles.historyBody}>
                    <Text style={styles.taskCountText}>Tasks Completed</Text>
                    <Text style={styles.percentageText}>{compPercent.toFixed(0)}%</Text>
                  </View>

                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${compPercent}%` }
                      ]} 
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noHistoryText}>No past history records found.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: 48, 
    paddingBottom: 16, 
    borderBottomWidth: 1.5, 
    borderBottomColor: 'rgba(0,212,255,0.3)',
    backgroundColor: '#0a0e27',
  },
  backButton: { padding: 8, marginRight: 12 },
  backButtonText: { color: '#00d4ff', fontWeight: '900', fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  mainScrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  loadingText: { fontSize: 16, color: '#ffffff', textAlign: 'center', marginTop: 100 },
  overviewCard: { 
    backgroundColor: 'rgba(0, 212, 255, 0.05)', 
    borderWidth: 2, 
    borderColor: '#00d4ff', 
    borderRadius: 14, 
    padding: 16, 
    marginBottom: 20 
  },
  rankContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  rankBadge: { width: 64, height: 64, borderRadius: 12, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', transform: [{ rotate: '45deg' }] },
  rankText: { fontSize: 24, fontWeight: '900', transform: [{ rotate: '-45deg' }] },
  levelText: { fontSize: 22, fontWeight: '900', color: '#00d4ff', marginBottom: 2 },
  subText: { fontSize: 13, color: '#8b9dc3', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#00d4ff', marginTop: 12, marginBottom: 12, letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statBox: { width: (width - 42) / 2, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', borderRadius: 10, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '800', color: '#8b9dc3' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginTop: 4 },
  cyberCard: { 
    backgroundColor: 'rgba(0, 212, 255, 0.03)', 
    borderWidth: 1.5, 
    borderColor: '#00d4ff', 
    borderRadius: 14, 
    padding: 12, 
    marginBottom: 16,
  },
  graphContainer: { flexDirection: 'row', alignItems: 'center' },
  yAxisContainer: { height: 200, justifyContent: 'space-between', paddingRight: 10, alignItems: 'center' },
  yAxisText: { fontSize: 12, fontWeight: '900' },
  xAxisRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 8 },
  xAxisText: { color: '#8b9dc3', fontSize: 12, fontWeight: '800' },
  historyListContainer: { marginTop: 4 },
  historyCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', borderRadius: 10, padding: 12, marginBottom: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  dayNumText: { fontSize: 14, fontWeight: '900', color: '#00d4ff' },
  dateText: { fontSize: 12, color: '#8b9dc3', fontWeight: '600' },
  historyBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskCountText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
  percentageText: { fontSize: 14, fontWeight: '900', color: '#00ff64' },
  progressBarBackground: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#00ff64', borderRadius: 3 },
  noHistoryText: { color: '#8b9dc3', textAlign: 'center', marginTop: 20, fontStyle: 'italic' }
});