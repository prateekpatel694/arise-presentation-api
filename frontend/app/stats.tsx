import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { format } from 'date-fns';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

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

interface TodayData {
    day_number: number;
    date: string;
    day_of_week: string;
    completion_percentage: number;
}

export default function StatsScreen() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [currentResponse, historyResponse] = await Promise.all([
        axios.get(`https://arise-presentation-api.onrender.com/api/challenge/current?user_id=default_user`),
        axios.get(`https://arise-presentation-api.onrender.com/api/challenge/history?user_id=default_user&days=30`),
      ]);

      if (currentResponse.data && currentResponse.data.challenge) {
        setChallenge(currentResponse.data.challenge);
      }
      
      if (currentResponse.data && currentResponse.data.today) {
          setTodayData(currentResponse.data.today);
      }

      if (historyResponse.data && historyResponse.data.history) {
        const rawHistory = historyResponse.data.history;
        setHistory([...rawHistory].reverse()); 
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: string) => {
    const colors: { [key: string]: string } = {
      '1%': '#ffd700',
      'S': '#ff00ff',
      'A': '#00ff00',
      'B': '#00d4ff',
      'C': '#ffaa00',
      'D': '#888888',
      'E': '#666666',
      'F': '#444444',
    };
    return colors[rank] || '#666666';
  };

  const StatBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={styles.statBar}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBarContainer}>
        <View style={[styles.statBarFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  const chartData = [...history].reverse(); 
  const CHART_HEIGHT = 180;
  const START_X = 35; 
  const CHART_WIDTH = width - START_X - 60; 
  
  const rankLevels = [
    { label: '1%', val: 97, color: '#ffd700' },
    { label: 'S', val: 90, color: '#ff00ff' },
    { label: 'A', val: 85, color: '#00ff00' },
    { label: 'B', val: 75, color: '#00d4ff' },
    { label: 'C', val: 65, color: '#ffaa00' },
    { label: 'D', val: 50, color: '#888888' },
    { label: 'E', val: 30, color: '#666666' },
    { label: 'F', val: 0, color: '#444444' },
  ];

  const getVisualY = (actualPct: number) => {
    let visual = 0;
    if (actualPct < 30) {
      visual = (actualPct / 30) * 10; 
    } else if (actualPct < 50) {
      visual = 10 + ((actualPct - 30) / 20) * 15; 
    } else if (actualPct < 65) {
      visual = 25 + ((actualPct - 50) / 15) * 15; 
    } else if (actualPct < 75) {
      visual = 40 + ((actualPct - 65) / 10) * 15; 
    } else if (actualPct < 85) {
      visual = 55 + ((actualPct - 75) / 10) * 15; 
    } else if (actualPct < 90) {
      visual = 70 + ((actualPct - 85) / 5) * 10;  
    } else if (actualPct < 97) {
      visual = 80 + ((actualPct - 90) / 7) * 10;  
    } else {
      visual = 90 + ((actualPct - 97) / 3) * 10;  
    }
    return CHART_HEIGHT - (visual / 100) * CHART_HEIGHT;
  };

  const points = chartData.map((item, index) => {
    const x = START_X + (index / Math.max(chartData.length - 1, 1)) * CHART_WIDTH;
    const y = getVisualY(item.completion_percentage);
    return { x, y, item };
  });

  const pathData = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  const todayPct = todayData?.completion_percentage || 0;
  const correctTodayRank = rankLevels.find(rank => todayPct >= rank.val) || rankLevels[rankLevels.length - 1]; 

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Fetching Battle Data...</Text>
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
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURRENT STATUS</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Day</Text>
              <Text style={styles.statusValue}>{challenge.current_day}/180</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Rank</Text>
              <Text style={[styles.statusValue, { color: getRankColor(correctTodayRank.label) }]}>
                {correctTodayRank.label}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Level</Text>
              <Text style={styles.statusValue}>{challenge.current_level}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UNLOCK YOUR POTENTIAL</Text>
          <StatBar label="Strength" value={challenge.stats.strength} color="#00ff64" />
          <StatBar label="Vitality" value={challenge.stats.vitality} color="#00d4ff" />
          <StatBar label="Agility" value={challenge.stats.agility} color="#ffaa00" />
          <StatBar label="Recovery" value={challenge.stats.recovery} color="#ff00ff" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BATTLE GRAPH (Rank vs Days)</Text>
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            {chartData.length > 0 ? (
              <Svg height={CHART_HEIGHT + 30} width={width - 40}>
                
                {rankLevels.map((rank, i) => {
                  const yPos = getVisualY(rank.val);
                  return (
                    <React.Fragment key={`grid-${i}`}>
                      <Line x1={START_X} y1={yPos} x2={width - 40} y2={yPos} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                      <SvgText x="0" y={yPos + 4} fill={rank.color} fontSize="11" fontWeight="bold">
                        {rank.label}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                <Path d={pathData} fill="none" stroke="#00ff64" strokeWidth="3" />

                {points.map((p, i) => (
                  <React.Fragment key={`point-${i}`}>
                    <Circle cx={p.x} cy={p.y} r="4" fill="#0a0e27" stroke="#00ff64" strokeWidth="2" />
                    
                    {/* Yahan 'D' hata diya gaya hai, ab sirf number aayega (1, 2, 3...) */}
                    {(i % Math.ceil(points.length / 5) === 0 || i === points.length - 1) && (
                      <SvgText x={p.x} y={CHART_HEIGHT + 20} fill="#8b9dc3" fontSize="12" fontWeight="bold" textAnchor="middle">
                        {p.item.day_number}
                      </SvgText>
                    )}
                  </React.Fragment>
                ))}
              </Svg>
            ) : (
              <Text style={styles.rankGuideText}>Waiting for battle data...</Text>
            )}
          </View>
        </View>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RANKING SYSTEM</Text>
          <Text style={styles.rankGuideText}>Weekly ranks based on average completion:</Text>
          <View style={styles.rankList}>
            <View style={styles.rankItem}>
              <Text style={[styles.rankName, { color: '#ffd700' }]}>1%</Text>
              <Text style={styles.rankRequirement}>97%+</Text>
            </View>
            <View style={styles.rankItem}>
              <Text style={[styles.rankName, { color: '#ff00ff' }]}>S</Text>
              <Text style={styles.rankRequirement}>90%+</Text>
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