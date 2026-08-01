import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { format } from 'date-fns';

interface Task {
  time: string;
  task: string;
  duration: number;
  completed: boolean;
  completed_at?: string;
}

interface DailyProgress {
  day_number: number;
  date: string;
  day_of_week: string;
  tasks: Task[];
  completion_percentage: number;
  is_sunday: boolean;
}

interface Challenge {
  current_day: number;
  current_rank: string;
  current_level: number;
  stats: {
    strength: number;
    vitality: number;
    agility: number;
    recovery: number;
  };
  start_date: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [today, setToday] = useState<DailyProgress | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [animatingTask, setAnimatingTask] = useState<number | null>(null);
  const [slashAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await axios.get("https://arise-api-backend.onrender.com/api/challenge/current?user_id=default_user");
      
      // FIX 1: Removed strict '.active' check. Direct data check kiya hai.
      if (response.data && response.data.challenge && response.data.today) {
        setChallenge(response.data.challenge);
        setToday(response.data.today);
        
        const missedTasks = response.data.today.tasks.filter((t: Task) => !t.completed).length;
        if (missedTasks > 0) {
          Alert.alert(
            '⚔️ BATTLE STATUS',
            `You have ${missedTasks} tasks remaining today!`,
            [{ text: 'Roger that!' }]
          );
        }
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('System Error', 'Server se connect nahi ho paya.');
      router.replace('/'); // Ye tumhe loading par atakne se bacha lega
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, []);

  const handleTaskPress = async (taskIndex: number, currentStatus: boolean) => {
    if (!today || today.is_sunday) return;

    const newStatus = !currentStatus;
    
    setAnimatingTask(taskIndex);
    Animated.sequence([
      Animated.timing(slashAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slashAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => setAnimatingTask(null));

    try {
      // FIX 2: Placeholder hata kar asli task endpoint lagaya hai
      const response = await axios.post(`https://arise-api-backend.onrender.com/api/challenge/task`, {
        user_id: "default_user",
        day_number: today.day_number,
        task_index: taskIndex,
        completed: newStatus,
      });

      if (response.data) {
        const updatedTasks = [...today.tasks];
        updatedTasks[taskIndex].completed = newStatus;
        setToday({
          ...today,
          tasks: updatedTasks,
          completion_percentage: response.data.completion_percentage || today.completion_percentage,
        });

        loadData();
      }
    } catch (error) {
      console.error('Error marking task:', error);
      Alert.alert('Error', 'Failed to update task status');
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
    };
    return colors[rank] || '#666666';
  };

  if (!challenge || !today) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Awakening System...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={[styles.rankBadge, { borderColor: getRankColor(challenge.current_rank) }]}>
            <Text style={[styles.rankText, { color: getRankColor(challenge.current_rank) }]}>
              {challenge.current_rank}
            </Text>
          </View>
          <Text style={styles.levelText}>LVL {challenge.current_level}</Text>
          <Text style={styles.dayText}>Day {challenge.current_day}/180</Text>
        </View>
        <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMM dd')}</Text>
        <Text style={styles.completionText}>{today.completion_percentage.toFixed(0)}% Complete</Text>
      </View>

      <ScrollView
        style={styles.tasksList}
        contentContainerStyle={styles.tasksContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />}
      >
        {today.is_sunday ? (
          <View style={styles.restDayContainer}>
            <Text style={styles.restDayTitle}>🌟 REST DAY 🌟</Text>
            <Text style={styles.restDayText}>Take the day off. You've earned it!</Text>
            <Text style={styles.restDayText}>Automatic 100% completion</Text>
          </View>
        ) : (
          today.tasks.map((task, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.taskCard,
                task.completed && styles.taskCardCompleted,
                animatingTask === index && styles.taskCardAnimating,
              ]}
              onPress={() => handleTaskPress(index, task.completed)}
              activeOpacity={0.7}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskTime}>{task.time}</Text>
                <View style={styles.taskActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      task.completed ? styles.killButton : styles.defeatButton,
                    ]}
                    onPress={() => handleTaskPress(index, task.completed)}
                  >
                    <Text style={styles.actionButtonText}>
                      {task.completed ? '⚔️ KILL' : '💀 DEFEAT'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                {task.task}
              </Text>
              <Text style={styles.taskDuration}>{task.duration} mins</Text>
              {task.completed && task.completed_at && (
                <Text style={styles.completedAt}>
                  ✓ Completed at {format(new Date(task.completed_at), 'HH:mm')}
                </Text>
              )}
              {animatingTask === index && (
                <Animated.View
                  style={[
                    styles.slashEffect,
                    {
                      opacity: slashAnim,
                      transform: [
                        {
                          translateX: slashAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-100, 100],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.statsButton} onPress={() => router.push('/stats')}>
        <Text style={styles.statsButtonText}>VIEW STATS & PROGRESS</Text>
      </TouchableOpacity>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    transform: [{ rotate: '45deg' }],
  },
  rankText: {
    fontSize: 28,
    fontWeight: '900',
    transform: [{ rotate: '-45deg' }],
  },
  levelText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00d4ff',
  },
  dayText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateText: {
    fontSize: 16,
    color: '#8b9dc3',
    marginBottom: 8,
  },
  completionText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00d4ff',
  },
  tasksList: {
    flex: 1,
  },
  tasksContent: {
    padding: 16,
  },
  restDayContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restDayTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00d4ff',
    marginBottom: 16,
  },
  restDayText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  taskCard: {
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  taskCardCompleted: {
    backgroundColor: 'rgba(0, 255, 100, 0.05)',
    borderColor: 'rgba(0, 255, 100, 0.5)',
  },
  taskCardAnimating: {
    borderColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00d4ff',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  killButton: {
    backgroundColor: '#00ff64',
  },
  defeatButton: {
    backgroundColor: '#ff6b6b',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8b9dc3',
  },
  taskDuration: {
    fontSize: 12,
    color: '#8b9dc3',
  },
  completedAt: {
    fontSize: 11,
    color: '#00ff64',
    marginTop: 4,
  },
  slashEffect: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#00d4ff',
    height: 4,
    top: '50%',
    transform: [{ rotate: '-15deg' }],
  },
  statsButton: {
    backgroundColor: '#00d4ff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  statsButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0a0e27',
    textAlign: 'center',
    letterSpacing: 1,
  },
  loadingText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 100,
  },
});