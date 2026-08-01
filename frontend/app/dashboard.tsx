import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, 
  Alert, Animated, Modal, TextInput, Dimensions 

} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

interface Task {
  time: string;
  task: string;
  duration: number;
  completed: boolean;
  completed_at?: string;
  task_type?: 'permanent' | 'temporary';
  start_date?: string;
  end_date?: string;
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

  // Add Task Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('12:00 PM');
  const [taskDuration, setTaskDuration] = useState('30');
  const [taskType, setTaskType] = useState<'permanent' | 'temporary'>('permanent');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await axios.get("https://arise-presentation-api.onrender.com/api/challenge/current?user_id=default_user");
      
      if (response.data && response.data.challenge && response.data.today) {
        setChallenge(response.data.challenge);
        
        // Sorting Tasks: Permanent first, Temporary at the END
        const sortedTasks = [...response.data.today.tasks].sort((a, b) => {
          const typeA = a.task_type || 'permanent';
          const typeB = b.task_type || 'permanent';
          if (typeA === 'permanent' && typeB === 'temporary') return -1;
          if (typeA === 'temporary' && typeB === 'permanent') return 1;
          return 0;
        });

        setToday({ ...response.data.today, tasks: sortedTasks });
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('System Error', 'Server se connect nahi ho paya.');
      router.replace('/');
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
      const response = await axios.post(`https://arise-presentation-api.onrender.com/api/challenge/task`, {
        user_id: "default_user",
        day_number: today.day_number,
        task_index: taskIndex,
        completed: newStatus,
      });

      if (response.data) {
        loadData();
      }
    } catch (error) {
      console.error('Error marking task:', error);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const handleAddNewTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title');
      return;
    }

    setAddingTask(true);
    try {
      const response = await axios.post("https://arise-presentation-api.onrender.com/api/challenge/custom-task", {
        user_id: "default_user",
        task: taskTitle,
        time: taskTime,
        duration: parseInt(taskDuration) || 30,
        task_type: taskType,
        start_date: taskType === 'temporary' ? startDate : null,
        end_date: taskType === 'temporary' ? endDate : null,
      });

      if (response.data.success) {
        setIsModalVisible(false);
        setTaskTitle('');
        loadData();
        Alert.alert('Success', 'New Task added to Shadow Protocol!');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add custom task');
    } finally {
      setAddingTask(false);
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
          today.tasks.map((task, index) => {
            const isTemp = task.task_type === 'temporary';
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.taskCard,
                  isTemp && styles.temporaryTaskCard,
                  task.completed && styles.taskCardCompleted,
                  animatingTask === index && styles.taskCardAnimating,
                ]}
                onPress={() => handleTaskPress(index, task.completed)}
                activeOpacity={0.7}
              >
                <View style={styles.taskHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.taskTime}>{task.time}</Text>
                    {isTemp && <Text style={styles.tempBadge}>⏳ TEMP QUEST</Text>}
                  </View>
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
                {isTemp && (
                  <Text style={styles.dateRangeText}>
                    Active: {task.start_date} to {task.end_date}
                  </Text>
                )}
                {task.completed && task.completed_at && (
                  <Text style={styles.completedAt}>
                    ✓ Completed at {format(new Date(task.completed_at), 'HH:mm')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* FLOATING ACTION PLUS BUTTON */}
      <TouchableOpacity 
        style={styles.floatingPlusButton} 
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingPlusText}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.statsButton} onPress={() => router.push('/stats')}>
        <Text style={styles.statsButtonText}>VIEW STATS & PROGRESS</Text>
      </TouchableOpacity>

      {/* ADD TASK MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>⚔️ ADD CUSTOM QUEST</Text>

            <Text style={styles.label}>Task Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Code Review or Gym Workout"
              placeholderTextColor="#666"
              value={taskTitle}
              onChangeText={setTaskTitle}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={taskTime}
                  onChangeText={setTaskTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Duration (mins)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={taskDuration}
                  onChangeText={setTaskDuration}
                />
              </View>
            </View>

            <Text style={styles.label}>Task Timeline Type</Text>
            <View style={styles.typeSelectorContainer}>
              <TouchableOpacity
                style={[styles.typeButton, taskType === 'permanent' && styles.typeButtonActive]}
                onPress={() => setTaskType('permanent')}
              >
                <Text style={[styles.typeButtonText, taskType === 'permanent' && styles.typeTextActive]}>
                  🏛️ Permanent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, taskType === 'temporary' && styles.typeButtonActive]}
                onPress={() => setTaskType('temporary')}
              >
                <Text style={[styles.typeButtonText, taskType === 'temporary' && styles.typeTextActive]}>
                  ⏳ Temporary
                </Text>
              </TouchableOpacity>
            </View>

            {taskType === 'temporary' && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                />
                <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addSubmitButton} 
                onPress={handleAddNewTask}
                disabled={addingTask}
              >
                <Text style={styles.addSubmitText}>
                  {addingTask ? 'ADDING...' : 'ADD QUEST'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  header: { padding: 20, paddingTop: 48, backgroundColor: 'rgba(0, 212, 255, 0.05)', borderBottomWidth: 2, borderBottomColor: '#00d4ff' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rankBadge: { width: 80, height: 80, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', transform: [{ rotate: '45deg' }] },
  rankText: { fontSize: 28, fontWeight: '900', transform: [{ rotate: '-45deg' }] },
  levelText: { fontSize: 24, fontWeight: '900', color: '#00d4ff' },
  dayText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  dateText: { fontSize: 16, color: '#8b9dc3', marginBottom: 8 },
  completionText: { fontSize: 20, fontWeight: '800', color: '#00d4ff' },
  tasksList: { flex: 1 },
  tasksContent: { padding: 16, paddingBottom: 80 },
  restDayContainer: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  restDayTitle: { fontSize: 32, fontWeight: '900', color: '#00d4ff', marginBottom: 16 },
  restDayText: { fontSize: 18, color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  taskCard: { backgroundColor: 'rgba(0, 212, 255, 0.05)', borderWidth: 2, borderColor: 'rgba(0, 212, 255, 0.3)', borderRadius: 12, padding: 16, marginBottom: 12, overflow: 'hidden' },
  temporaryTaskCard: { borderColor: '#ffaa00', backgroundColor: 'rgba(255, 170, 0, 0.05)' },
  tempBadge: { fontSize: 10, fontWeight: '900', color: '#ffaa00', backgroundColor: 'rgba(255, 170, 0, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  taskCardCompleted: { backgroundColor: 'rgba(0, 255, 100, 0.05)', borderColor: 'rgba(0, 255, 100, 0.5)' },
  taskCardAnimating: { borderColor: '#00d4ff', shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 8 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTime: { fontSize: 16, fontWeight: '700', color: '#00d4ff' },
  taskActions: { flexDirection: 'row', gap: 8 },
  actionButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  killButton: { backgroundColor: '#00ff64' },
  defeatButton: { backgroundColor: '#ff6b6b' },
  actionButtonText: { fontSize: 12, fontWeight: '900', color: '#000000' },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#8b9dc3' },
  taskDuration: { fontSize: 12, color: '#8b9dc3' },
  dateRangeText: { fontSize: 11, color: '#ffaa00', marginTop: 4 },
  completedAt: { fontSize: 11, color: '#00ff64', marginTop: 4 },
  floatingPlusButton: { position: 'absolute', right: 24, bottom: 90, width: 60, height: 60, borderRadius: 30, backgroundColor: '#00d4ff', alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 10, zIndex: 999 },
  floatingPlusText: { fontSize: 36, fontWeight: '900', color: '#0a0e27', marginTop: -4 },
  statsButton: { backgroundColor: '#00d4ff', padding: 16, margin: 16, borderRadius: 12, shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
  statsButtonText: { fontSize: 16, fontWeight: '900', color: '#0a0e27', textAlign: 'center', letterSpacing: 1 },
  loadingText: { fontSize: 18, color: '#ffffff', textAlign: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#0a0e27', borderWidth: 2, borderColor: '#00d4ff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#00d4ff', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: '#8b9dc3', marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', borderRadius: 8, color: '#fff', padding: 10, fontSize: 14 },
  typeSelectorContainer: { flexDirection: 'row', gap: 10, marginTop: 6 },
  typeButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', borderRadius: 8, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
  typeButtonText: { color: '#8b9dc3', fontWeight: '700', fontSize: 12 },
  typeTextActive: { color: '#0a0e27' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ff6b6b', alignItems: 'center' },
  cancelButtonText: { color: '#ff6b6b', fontWeight: '900' },
  addSubmitButton: { flex: 1, backgroundColor: '#00d4ff', padding: 12, borderRadius: 8, alignItems: 'center' },
  addSubmitText: { color: '#0a0e27', fontWeight: '900' },
});