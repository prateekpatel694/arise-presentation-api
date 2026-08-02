import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, 
  Alert, Modal, TextInput, Dimensions, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Task {
  time: string;
  task: string;
  duration: number;
  completed: boolean;
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
  const [userId, setUserId] = useState<string>('default_user');
  const [userName, setUserName] = useState<string>('MONARCH');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [today, setToday] = useState<DailyProgress | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Add Task Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('12:00 PM');
  const [taskDuration, setTaskDuration] = useState('30');
  const [taskType, setTaskType] = useState<'permanent' | 'temporary'>('permanent');

  // Calendar Modal
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [activeDateTarget, setActiveDateTarget] = useState<'start' | 'end'>('start');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    initializeUserAndLoadData();
  }, []);

  const initializeUserAndLoadData = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('user_id');
      const storedUserName = await AsyncStorage.getItem('username');
      
      const activeId = storedUserId || 'default_user';
      if (storedUserName) setUserName(storedUserName);
      setUserId(activeId);
      await loadData(activeId);
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async (activeUserId: string) => {
    try {
      const response = await axios.get(`https://arise-presentation-api.onrender.com/api/challenge/current?user_id=${activeUserId}`);
      if (response.data) {
        if (response.data.username) setUserName(response.data.username);
        if (response.data.challenge && response.data.today) {
          setChallenge(response.data.challenge);
          setToday(response.data.today);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(userId).finally(() => setRefreshing(false));
  }, [userId]);

  const handleLogout = async () => {
    Alert.alert('System Exit', 'Are you sure you want to exit the Shadow Gateway?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout ⚔️', 
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace('/');
        } 
      }
    ]);
  };

  const handleTaskPress = async (taskIndex: number, currentStatus: boolean) => {
    try {
      await axios.post(`https://arise-presentation-api.onrender.com/api/challenge/task`, {
        user_id: userId,
        task_index: taskIndex,
        completed: !currentStatus,
      });
      loadData(userId);
    } catch (error) {
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskIndex: number) => {
    Alert.alert('Delete Quest', 'Are you sure you want to delete this quest permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete 🗑️',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.post("https://arise-presentation-api.onrender.com/api/challenge/task/delete", {
              user_id: userId,
              task_index: taskIndex
            });
            loadData(userId);
          } catch (e) {
            Alert.alert('Error', 'Failed to delete task');
          }
        }
      }
    ]);
  };

  const openCalendarFor = (target: 'start' | 'end') => {
    setActiveDateTarget(target);
    const initialDate = target === 'start' ? startDate : endDate;
    setTempSelectedDate(initialDate);
    setCurrentMonth(initialDate);
    setCalendarVisible(true);
  };

  const confirmDateSelection = () => {
    if (activeDateTarget === 'start') {
      setStartDate(tempSelectedDate);
      if (tempSelectedDate > endDate) setEndDate(tempSelectedDate);
    } else {
      setEndDate(tempSelectedDate);
    }
    setCalendarVisible(false);
  };

  const handleAddNewTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title');
      return;
    }

    setAddingTask(true);
    try {
      const response = await axios.post("https://arise-presentation-api.onrender.com/api/challenge/custom-task", {
        user_id: userId,
        task: taskTitle.trim(),
        time: taskTime,
        duration: parseInt(taskDuration) || 30,
        task_type: taskType,
        start_date: taskType === 'temporary' ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: taskType === 'temporary' ? format(endDate, 'yyyy-MM-dd') : null,
      });

      if (response.data.success) {
        setIsModalVisible(false);
        setTaskTitle('');
        loadData(userId);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add custom task');
    } finally {
      setAddingTask(false);
    }
  };

  const getRankColor = (rank: string) => {
    const colors: { [key: string]: string } = {
      '1%': '#ffd700', 'S': '#ff00ff', 'A': '#00ff00', 'B': '#00d4ff', 'C': '#ffaa00', 'D': '#888888', 'E': '#666666'
    };
    return colors[rank] || '#666666';
  };

  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateGrid = startOfWeek(monthStart);
    const endDateGrid = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDateGrid;

    while (day <= endDateGrid) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day.getTime());
        const isSelected = isSameDay(day, tempSelectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <TouchableOpacity
            key={day.toString()}
            style={[
              styles.calendarDayCell,
              isSelected ? styles.calendarDaySelected : null,
              !isCurrentMonth ? styles.calendarDayDisabled : null,
            ]}
            onPress={() => setTempSelectedDate(cloneDay)}
          >
            <Text style={[
              styles.calendarDayText,
              isSelected ? styles.calendarDayTextSelected : null,
              !isCurrentMonth ? styles.calendarDayTextDisabled : null
            ]}>
              {format(day, 'd')}
            </Text>
          </TouchableOpacity>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <View style={styles.calendarRow} key={day.toString()}>{days}</View>
      );
      days = [];
    }
    return <View>{rows}</View>;
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
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={[styles.rankBadge, { borderColor: getRankColor(challenge.current_rank) }]}>
            <Text style={[styles.rankText, { color: getRankColor(challenge.current_rank) }]}>
              {challenge.current_rank}
            </Text>
          </View>
          
          <View style={{ alignItems: 'flex-start', flex: 1, marginLeft: 16 }}>
            <Text style={styles.levelText}>LVL {challenge.current_level}</Text>
            <Text style={styles.dayText}>Day {challenge.current_day}/180</Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>EXIT 🚪</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMM dd')}</Text>

        {/* CLEAN USERNAME BADGE NO CENTER LINE */}
        <View style={styles.completionAndNameRow}>
          <Text style={styles.completionText}>{today.completion_percentage.toFixed(0)}% Complete</Text>

          <LinearGradient
            colors={['#00d4ff', '#00ff64']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cleanCyberBadge}
          >
            <Text style={styles.cleanCyberText}>
              ⚔️ {userName.toUpperCase()}
            </Text>
          </LinearGradient>
        </View>
      </View>

      {/* TASKS LIST */}
      <ScrollView
        style={styles.tasksList}
        contentContainerStyle={styles.tasksContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />}
      >
        {today.tasks && today.tasks.length > 0 ? (
          today.tasks.map((task, index) => {
            const isTemp = task.task_type === 'temporary';
            return (
              <View key={index} style={[styles.taskCard, task.completed ? styles.taskCardCompleted : null]}>
                <View style={styles.taskHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.taskTime}>{task.time}</Text>
                    {isTemp && <Text style={styles.tempBadge}>⏳ TEMP QUEST</Text>}
                  </View>
                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, task.completed ? styles.killButton : styles.defeatButton]}
                      onPress={() => handleTaskPress(index, task.completed)}
                    >
                      <Text style={styles.actionButtonText}>
                        {task.completed ? '⚔️ KILL' : '💀 DEFEAT'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.deleteButton} 
                      onPress={() => handleDeleteTask(index)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.taskTitle, task.completed ? styles.taskTitleCompleted : null]}>
                  {task.task}
                </Text>
                <Text style={styles.taskDuration}>{task.duration} mins</Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>NO QUESTS ACTIVE</Text>
            <Text style={styles.emptySubText}>Press (+) below to add your daily tasks, Monarch!</Text>
          </View>
        )}
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity 
        style={styles.floatingPlusButton} 
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.floatingPlusText}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.statsButton} onPress={() => router.push('/stats')}>
        <Text style={styles.statsButtonText}>VIEW STATS & PROGRESS</Text>
      </TouchableOpacity>

      {/* ADD TASK MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>⚔️ ADD CUSTOM QUEST</Text>

              <Text style={styles.label}>Task Title</Text>
              <TextInput style={styles.input} placeholder="e.g., Code Review" placeholderTextColor="#666" value={taskTitle} onChangeText={setTaskTitle} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Time</Text>
                  <TextInput style={styles.input} value={taskTime} onChangeText={setTaskTime} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Duration (mins)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={taskDuration} onChangeText={setTaskDuration} />
                </View>
              </View>

              <Text style={styles.label}>Task Timeline Type</Text>
              <View style={styles.typeSelectorContainer}>
                <TouchableOpacity
                  style={[styles.typeButton, taskType === 'permanent' ? styles.typeButtonActive : null]}
                  onPress={() => setTaskType('permanent')}
                >
                  <Text style={[styles.typeButtonText, taskType === 'permanent' ? styles.typeTextActive : null]}>
                    🏛️ Permanent
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, taskType === 'temporary' ? styles.typeButtonActive : null]}
                  onPress={() => setTaskType('temporary')}
                >
                  <Text style={[styles.typeButtonText, taskType === 'temporary' ? styles.typeTextActive : null]}>
                    ⏳ Temporary
                  </Text>
                </TouchableOpacity>
              </View>

              {taskType === 'temporary' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.label}>Start Date</Text>
                  <TouchableOpacity style={styles.datePickerTrigger} onPress={() => openCalendarFor('start')}>
                    <Text style={styles.datePickerTriggerText}>📅 {format(startDate, 'yyyy-MM-dd')}</Text>
                  </TouchableOpacity>

                  <Text style={styles.label}>End Date</Text>
                  <TouchableOpacity style={styles.datePickerTrigger} onPress={() => openCalendarFor('end')}>
                    <Text style={styles.datePickerTriggerText}>📅 {format(endDate, 'yyyy-MM-dd')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addSubmitButton} onPress={handleAddNewTask} disabled={addingTask}>
                  <Text style={styles.addSubmitText}>{addingTask ? 'ADDING...' : 'ADD QUEST'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* POPUP VISUAL CALENDAR MODAL */}
      <Modal visible={calendarVisible} animationType="fade" transparent={true}>
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarCard}>
            <Text style={styles.calendarTitle}>
              SELECT {activeDateTarget.toUpperCase()} DATE
            </Text>
            
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <Text style={styles.monthNavBtn}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitleText}>{format(currentMonth, 'MMMM yyyy')}</Text>
              <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <Text style={styles.monthNavBtn}>▶</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <View key={idx} style={styles.calendarDayHeaderCell}>
                  <Text style={styles.calendarDayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {renderCalendarGrid()}

            <Text style={styles.selectedDatePreview}>
              Selected: {format(tempSelectedDate, 'yyyy-MM-dd')}
            </Text>

            <View style={styles.calendarActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCalendarVisible(false)}>
                <Text style={styles.cancelButtonText}>CLOSE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addSubmitButton} onPress={confirmDateSelection}>
                <Text style={styles.addSubmitText}>SELECT DATE</Text>
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
  rankBadge: { width: 64, height: 64, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', transform: [{ rotate: '45deg' }] },
  rankText: { fontSize: 20, fontWeight: '900', transform: [{ rotate: '-45deg' }] },
  levelText: { fontSize: 18, fontWeight: '900', color: '#00d4ff' },
  dayText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  completionAndNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  completionText: { fontSize: 20, fontWeight: '800', color: '#00d4ff' },
  cleanCyberBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  cleanCyberText: { fontSize: 13, fontWeight: '900', color: '#0a0e27', letterSpacing: 1 },
  logoutBtn: { backgroundColor: 'rgba(255, 107, 107, 0.15)', borderWidth: 1, borderColor: '#ff6b6b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#ff6b6b', fontSize: 11, fontWeight: '900' },
  dateText: { fontSize: 15, color: '#8b9dc3', marginBottom: 2 },
  tasksList: { flex: 1 },
  tasksContent: { padding: 16, paddingBottom: 80 },
  taskCard: { backgroundColor: 'rgba(0, 212, 255, 0.05)', borderWidth: 2, borderColor: 'rgba(0, 212, 255, 0.3)', borderRadius: 12, padding: 16, marginBottom: 12 },
  taskCardCompleted: { backgroundColor: 'rgba(0, 255, 100, 0.05)', borderColor: 'rgba(0, 255, 100, 0.5)' },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTime: { fontSize: 15, fontWeight: '700', color: '#00d4ff' },
  tempBadge: { fontSize: 10, fontWeight: '900', color: '#ffaa00', backgroundColor: 'rgba(255, 170, 0, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  killButton: { backgroundColor: '#00ff64' },
  defeatButton: { backgroundColor: '#ff6b6b' },
  actionButtonText: { fontSize: 12, fontWeight: '900', color: '#000000' },
  deleteButton: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255, 107, 107, 0.2)', borderRadius: 6 },
  deleteButtonText: { fontSize: 14 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#8b9dc3' },
  taskDuration: { fontSize: 12, color: '#8b9dc3' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#00d4ff', fontSize: 18, fontWeight: '900' },
  emptySubText: { color: '#8b9dc3', fontSize: 13, textAlign: 'center', marginTop: 8 },
  floatingPlusButton: { position: 'absolute', right: 24, bottom: 90, width: 60, height: 60, borderRadius: 30, backgroundColor: '#00d4ff', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  floatingPlusText: { fontSize: 36, fontWeight: '900', color: '#0a0e27', marginTop: -4 },
  statsButton: { backgroundColor: '#00d4ff', padding: 16, margin: 16, borderRadius: 12 },
  statsButtonText: { fontSize: 16, fontWeight: '900', color: '#0a0e27', textAlign: 'center' },
  loadingText: { fontSize: 18, color: '#ffffff', textAlign: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#0a0e27', borderWidth: 2, borderColor: '#00d4ff', borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#00d4ff', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: '#8b9dc3', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', borderRadius: 8, color: '#fff', padding: 12, fontSize: 14 },
  datePickerTrigger: { backgroundColor: 'rgba(0, 212, 255, 0.12)', borderWidth: 1.5, borderColor: '#00d4ff', borderRadius: 8, padding: 14, alignItems: 'center', marginVertical: 4 },
  datePickerTriggerText: { color: '#00d4ff', fontWeight: '900', fontSize: 15 },
  typeSelectorContainer: { flexDirection: 'row', gap: 10, marginTop: 6 },
  typeButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', borderRadius: 8, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
  typeButtonText: { color: '#8b9dc3', fontWeight: '700', fontSize: 12 },
  typeTextActive: { color: '#0a0e27' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ff6b6b', alignItems: 'center' },
  cancelButtonText: { color: '#ff6b6b', fontWeight: '900' },
  addSubmitButton: { flex: 1, backgroundColor: '#00d4ff', padding: 12, borderRadius: 8, alignItems: 'center' },
  addSubmitText: { color: '#0a0e27', fontWeight: '900' },
  calendarModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  calendarCard: { width: '100%', backgroundColor: '#0a0e27', borderWidth: 2, borderColor: '#00d4ff', borderRadius: 16, padding: 16 },
  calendarTitle: { fontSize: 16, fontWeight: '900', color: '#00d4ff', textAlign: 'center', marginBottom: 12 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 8 },
  monthTitleText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  monthNavBtn: { fontSize: 18, color: '#00d4ff', padding: 8, fontWeight: '900' },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  calendarDayHeaderCell: { width: 36, alignItems: 'center' },
  calendarDayHeaderText: { color: '#8b9dc3', fontWeight: '800', fontSize: 12 },
  calendarDayCell: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  calendarDaySelected: { backgroundColor: '#00d4ff' },
  calendarDayDisabled: { opacity: 0.2 },
  calendarDayText: { color: '#ffffff', fontWeight: '700' },
  calendarDayTextSelected: { color: '#0a0e27', fontWeight: '900' },
  calendarDayTextDisabled: { color: '#8b9dc3' },
  selectedDatePreview: { color: '#00d4ff', textAlign: 'center', fontWeight: '800', marginTop: 12, fontSize: 13 },
  calendarActions: { flexDirection: 'row', gap: 12, marginTop: 16 }
});