import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, 
  Alert, Animated, Modal, TextInput, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator, Vibration 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width } = Dimensions.get('window');

interface Task {
  time: string;
  task: string;
  duration: number;
  completed: boolean;
  task_type?: 'permanent' | 'temporary';
  start_date?: string; 
  end_date?: string;
  is_locked?: boolean;
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
  const params = useLocalSearchParams();
  const [userId, setUserId] = useState<string>('default_user');
  const [userName, setUserName] = useState<string>('MONARCH');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [today, setToday] = useState<DailyProgress | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [animatingTask, setAnimatingTask] = useState<number | null>(null);
  const [slashAnim] = useState(new Animated.Value(0));

  const isResettingRef = useRef<boolean>(false);
  const [showDirectVideo, setShowDirectVideo] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(50);
  const [serverAwakeSignal, setServerAwakeSignal] = useState(false);
  const strokeAnim = useRef(new Animated.Value(0)).current;

  const [rankVideoSource, setRankVideoSource] = useState<any>(null);
  const [showRankVideo, setShowRankVideo] = useState<boolean>(false);

  const [plusMenuVisible, setPlusModalVisible] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('12:00 PM');
  const [taskDuration, setTaskDuration] = useState('30');
  const [taskType, setTaskType] = useState<'permanent' | 'temporary'>('permanent');

  const [focusModalVisible, setFocusModalVisible] = useState(false);
  const [inputHours, setInputHours] = useState('');
  const [inputMins, setInputMins] = useState('');
  const [inputSecs, setInputSecs] = useState('');
  const [focusRemainingSecs, setFocusRemainingSecs] = useState<number | null>(null);
  const [focusTotalSecs, setFocusTotalSecs] = useState<number>(1500);
  const [focusRunning, setFocusRunning] = useState(false);
  const [isFocusCompleted, setIsFocusCompleted] = useState(false);
  const [smoothProgressRatio, setSmoothProgressRatio] = useState<number>(0);
  
  const focusEndTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [activeDateTarget, setActiveDateTarget] = useState<'start' | 'end'>('start');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    checkDirectEntryVideoPlayability();
    checkServerAwakeCache();
    initializeUserAndLoadData();
  }, []);

  const checkDirectEntryVideoPlayability = async () => {
    try {
      if (params.directEntry === 'true') {
        const hasPlayed = await AsyncStorage.getItem('has_played_direct_video');
        if (hasPlayed !== 'true') {
          setShowDirectVideo(true);
          await AsyncStorage.setItem('has_played_direct_video', 'true');
        }
      }
    } catch (e) {
      console.log('Direct video check handled.');
    }
  };

  const handleDirectVideoFinish = () => {
    setShowDirectVideo(false);
  };

  const checkServerAwakeCache = async () => {
    try {
      const isAwake = await AsyncStorage.getItem('server_is_awake');
      if (isAwake === 'true') {
        setServerAwakeSignal(true);
      } else {
        start50sLoadingTimer();
      }
    } catch (e) {
      console.log('Cache check handled.');
    }
  };

  const start50sLoadingTimer = () => {
    try {
      Animated.timing(strokeAnim, {
        toValue: 1,
        duration: 50000,
        useNativeDriver: true,
      }).start();

      let countdown = 50;
      const interval = setInterval(() => {
        countdown -= 1;
        if (countdown >= 0) {
          setTimerSeconds(countdown);
        } else {
          clearInterval(interval);
        }
      }, 1000);
    } catch (e) {
      console.log('Timer loop handled.');
    }
  };

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
    if (isResettingRef.current) return; 

    try {
      const response = await axios.get(
        `https://arise-presentation-api.onrender.com/api/challenge/current?user_id=${activeUserId}&t=${Date.now()}`
      );

      if (response.data && response.data.active === false) {
        if (isResettingRef.current) return;
        isResettingRef.current = true;

        await AsyncStorage.multiRemove([
          'user_id', 
          'username', 
          'user_token', 
          'user_email', 
          'server_is_awake', 
          'challenge_started',
          'has_played_direct_video'
        ]);

        Alert.alert(
          "System Reset ⚔️",
          "User record not found in database. Redirecting to login...",
          [
            { 
              text: "OK", 
              onPress: () => {
                router.replace('/');
              } 
            }
          ],
          { cancelable: false }
        );
        return;
      }

      if (response.data) {
        if (response.data.username) setUserName(response.data.username);
        if (response.data.challenge && response.data.today) {
          setChallenge(response.data.challenge);
          
          const todayDateStr = format(new Date(), 'yyyy-MM-dd');
          const loadedDateStr = response.data.today.date;

          let updatedTodayData = response.data.today;
          if (loadedDateStr && loadedDateStr !== todayDateStr) {
            updatedTodayData.tasks = updatedTodayData.tasks.map((t: Task) => ({
              ...t,
              completed: false
            }));
            updatedTodayData.completion_percentage = 0;
            updatedTodayData.date = todayDateStr;
          }

          setToday(updatedTodayData);
          setServerAwakeSignal(true);
          await AsyncStorage.setItem('server_is_awake', 'true');

          const currentRank = response.data.challenge.current_rank;
          await checkAndPlayRankAnimationOnce(currentRank, todayDateStr);
        }
      }
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    }
  };

  const checkAndPlayRankAnimationOnce = async (rank: string, todayDateStr: string) => {
    const playKey = `played_rank_${rank}_${todayDateStr}`;
    const alreadyPlayed = await AsyncStorage.getItem(playKey);

    if (alreadyPlayed === 'true') return;

    if (rank === '1%') {
      setRankVideoSource(require('../assets/rank_1percent.mp4'));
      setShowRankVideo(true);
      await AsyncStorage.setItem(playKey, 'true');
    } else if (rank === 'S') {
      setRankVideoSource(require('../assets/rank_s.mp4'));
      setShowRankVideo(true);
      await AsyncStorage.setItem(playKey, 'true');
    } else if (rank === 'A') {
      setRankVideoSource(require('../assets/rank_a.mp4'));
      setShowRankVideo(true);
      await AsyncStorage.setItem(playKey, 'true');
    }
  };

  const handleRankVideoFinish = () => {
    setShowRankVideo(false);
    setRankVideoSource(null);
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

  const handleTaskPress = async (taskIndex: number, currentStatus: boolean, isLocked?: boolean) => {
    if (isLocked) {
      Alert.alert('🔒 QUEST LOCKED', 'This temporary quest is scheduled for a future date. It cannot be completed today!');
      return;
    }

    setAnimatingTask(taskIndex);

    Animated.sequence([
      Animated.timing(slashAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slashAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start(() => setAnimatingTask(null));

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

  useEffect(() => {
    const updateSmoothTimer = () => {
      if (focusRunning && focusEndTimeRef.current !== null && focusTotalSecs > 0) {
        const now = Date.now();
        const remainingMs = Math.max(0, focusEndTimeRef.current - now);
        const remainingSecs = Math.ceil(remainingMs / 1000);

        setFocusRemainingSecs(remainingSecs);

        const totalMs = focusTotalSecs * 1000;
        const elapsedMs = totalMs - remainingMs;
        const ratio = Math.min(1.0, elapsedMs / totalMs);
        setSmoothProgressRatio(ratio);

        if (remainingMs <= 0) {
          setFocusRunning(false);
          setIsFocusCompleted(true);
          setSmoothProgressRatio(1.0);
          playTimerEndNotificationSound();
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          return;
        }

        animationFrameRef.current = requestAnimationFrame(updateSmoothTimer);
      }
    };

    if (focusRunning) {
      animationFrameRef.current = requestAnimationFrame(updateSmoothTimer);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [focusRunning, focusTotalSecs]);

  const playTimerEndNotificationSound = async () => {
    try {
      Vibration.vibrate([0, 500, 200, 500]);
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' }
      );
      await sound.playAsync();
    } catch (e) {
      console.log('Audio/Vibration Alert Played.');
    }
  };

  const startFocusTimer = async () => {
    const hrs = parseInt(inputHours) || 0;
    const mins = parseInt(inputMins) || 0;
    const secs = parseInt(inputSecs) || 0;
    const total = (hrs * 3600) + (mins * 60) + secs;

    if (total <= 0) {
      Alert.alert('Invalid Time', 'Please set a focus timer duration greater than 0 seconds!');
      return;
    }

    const endTime = Date.now() + total * 1000;
    focusEndTimeRef.current = endTime;

    setFocusTotalSecs(total);
    setFocusRemainingSecs(total);
    setSmoothProgressRatio(0);
    setIsFocusCompleted(false);
    setFocusRunning(true);
  };

  const stopFocusTimer = async () => {
    setFocusRunning(false);
    setIsFocusCompleted(false);
    setFocusRemainingSecs(null);
    setSmoothProgressRatio(0);
    focusEndTimeRef.current = null;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    Vibration.cancel();
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
    
    // OPTIMISTIC UI UPDATE: Close modal & render task instantly
    setIsModalVisible(false);
    
    const isTemp = taskType === 'temporary';
    const sd = isTemp ? format(startDate, 'yyyy-MM-dd') : undefined;
    const ed = isTemp ? format(endDate, 'yyyy-MM-dd') : undefined;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const locked = isTemp && sd ? sd > todayStr : false;

    const newTask: Task = {
      task: taskTitle.trim(),
      time: taskTime,
      duration: parseInt(taskDuration) || 30,
      completed: false,
      task_type: taskType,
      start_date: sd,
      end_date: ed,
      is_locked: locked
    };

    setToday(prev => {
      if (!prev) return prev;
      const updatedTasks = [...prev.tasks, newTask];
      
      const validTasks = updatedTasks.filter(t => !t.is_locked);
      const completedCount = validTasks.filter(t => t.completed).length;
      const newPct = validTasks.length > 0 ? (completedCount / validTasks.length) * 100 : 0;

      return {
        ...prev,
        tasks: updatedTasks,
        completion_percentage: newPct
      };
    });

    setTaskTitle('');
    setAddingTask(false);

    try {
      const response = await axios.post("https://arise-presentation-api.onrender.com/api/challenge/custom-task", {
        user_id: userId,
        task: newTask.task,
        time: newTask.time,
        duration: newTask.duration,
        task_type: newTask.task_type,
        start_date: newTask.start_date,
        end_date: newTask.end_date,
      });

      if (response.data.success) {
        loadData(userId); // Silent background sync 
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add custom task');
      loadData(userId); // Revert on error
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

  const radius = 60;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = strokeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circumference]
  });
  const formattedTime = `00:${timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}`;

  const focusDashOffsetValue = (1 - smoothProgressRatio) * circumference;

  const focusRingColorSolid = isFocusCompleted 
    ? '#ff2e2e' 
    : (smoothProgressRatio > 0.6 ? '#ff2e2e' : (smoothProgressRatio > 0.3 ? '#ffaa00' : '#00d4ff'));

  if (showDirectVideo) {
    return (
      <View style={styles.videoOverlayContainer}>
        <Video
          source={require('../assets/dashboard_awakening.mp4')}
          style={styles.fullVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              handleDirectVideoFinish();
            }
          }}
        />
        <TouchableOpacity style={styles.skipButton} onPress={handleDirectVideoFinish}>
          <Text style={styles.skipText}>SKIP ⏩</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if ((!challenge || !today) && !serverAwakeSignal) {
    return (
      <View style={styles.loadingFullContainer}>
        <Text style={styles.loadingTitle}>Awakening System...</Text>

        <View style={styles.timerCircleContainer}>
          <Svg width={140} height={140} viewBox="0 0 140 140">
            <Circle cx="70" cy="70" r={radius} stroke="#333333" strokeWidth={strokeWidth} fill="none" />
            <AnimatedCircle
              cx="70"
              cy="70"
              r={radius}
              stroke="#00d4ff"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 70 70)"
            />
          </Svg>
          <View style={styles.timerTextCenterContainer}>
            <Text style={styles.timerDigitsText}>{formattedTime}</Text>
          </View>
        </View>

        <Text style={styles.loadingSubText}>Waking up Render Cloud Server in Background...</Text>
      </View>
    );
  }

  if (!challenge || !today) {
    return (
      <View style={styles.loadingFullContainer}>
        <ActivityIndicator color="#00d4ff" size="large" />
      </View>
    );
  }

  const isHundredPercent = today.completion_percentage >= 100 && today.tasks.length > 0;

  if (showRankVideo && rankVideoSource) {
    return (
      <View style={styles.videoOverlayContainer}>
        <Video
          source={rankVideoSource}
          style={styles.fullVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              handleRankVideoFinish();
            }
          }}
        />
        <TouchableOpacity style={styles.skipButton} onPress={handleRankVideoFinish}>
          <Text style={styles.skipText}>SKIP ⏩</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentFocusHours = focusRemainingSecs !== null ? Math.floor(focusRemainingSecs / 3600) : 0;
  const currentFocusMins = focusRemainingSecs !== null ? Math.floor((focusRemainingSecs % 3600) / 60) : 0;
  const currentFocusSecs = focusRemainingSecs !== null ? focusRemainingSecs % 60 : 0;
  const focusTimeDisplay = `${currentFocusHours < 10 ? `0${currentFocusHours}` : currentFocusHours}:${currentFocusMins < 10 ? `0${currentFocusMins}` : currentFocusMins}:${currentFocusSecs < 10 ? `0${currentFocusSecs}` : currentFocusSecs}`;

  return (
    <View style={styles.container}>
      <View style={[styles.header, isHundredPercent && styles.headerFullGlow]}>
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

        <View style={styles.completionAndNameRow}>
          <Text style={[styles.completionText, isHundredPercent && styles.hundredPercentText]}>
            {today.completion_percentage.toFixed(0)}% Complete {isHundredPercent ? '👑' : ''}
          </Text>

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

      <ScrollView
        style={styles.tasksList}
        contentContainerStyle={styles.tasksContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />}
      >
        {today.tasks && today.tasks.length > 0 ? (
          today.tasks.map((task, index) => {
            const isTemp = task.task_type === 'temporary';
            const isAnimating = animatingTask === index;
            const isLocked = task.is_locked;

            return (
              <Animated.View 
                key={index} 
                style={[
                  styles.systemHudCard, 
                  task.completed ? styles.hudCardCompleted : null,
                  isLocked ? styles.hudCardLocked : null,
                  isAnimating ? styles.hudCardSlashAnim : null
                ]}
              >
                <View style={styles.hudHeaderRow}>
                  <View style={[styles.hudInfoBadge, task.completed && styles.hudInfoBadgeCompleted]}>
                    <Text style={[styles.hudInfoText, task.completed && styles.hudInfoTextCompleted]}>
                      ⓘ QUEST INFO
                    </Text>
                  </View>
                  {isTemp && (
                    <Text style={[styles.tempBadge, isLocked && styles.tempBadgeLocked]}>
                      {isLocked ? `🔒 STARTS ${task.start_date}` : '⏳ TEMP QUEST'}
                    </Text>
                  )}
                </View>

                <Text style={[styles.hudQuestTitle, task.completed ? styles.taskTitleCompleted : null]}>
                  {task.task}
                </Text>

                <View style={styles.hudMetaRow}>
                  <Text style={[styles.hudTimeText, task.completed && styles.hudTimeTextCompleted]}>
                    ⏰ {task.time}
                  </Text>
                  <Text style={styles.hudDurationText}>({task.duration} mins)</Text>
                </View>

                <View style={styles.hudActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.hudActionButton, 
                      task.completed ? styles.killButton : styles.defeatButton,
                      isLocked ? styles.lockedButton : null
                    ]}
                    onPress={() => handleTaskPress(index, task.completed, isLocked)}
                    disabled={isLocked}
                  >
                    <Text style={[styles.actionButtonText, isLocked && styles.lockedButtonText]}>
                      {isLocked ? '🔒 LOCKED' : (task.completed ? '⚔️ COMPLETED' : '💀 DEFEAT')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => handleDeleteTask(index)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>NO QUESTS ACTIVE</Text>
            <Text style={styles.emptySubText}>Press (+) below to add your daily tasks, Monarch!</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.floatingPlusButton} 
        onPress={() => setPlusModalVisible(true)}
      >
        <Text style={styles.floatingPlusText}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.statsButton} onPress={() => router.push('/stats')}>
        <Text style={styles.statsButtonText}>VIEW STATS & PROGRESS</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.statsButton, { backgroundColor: '#ffd700', marginTop: -4 }]} 
        onPress={() => router.push('/leaderboard' as any)}
      >
        <Text style={[styles.statsButtonText, { color: '#0a0e27' }]}>GLOBAL LEADERBOARD 🏆</Text>
      </TouchableOpacity>

      <Modal visible={plusMenuVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.plusMenuContainer}>
            <Text style={styles.modalTitle}>⚔️ SHADOW ACTIONS</Text>

            <TouchableOpacity 
              style={styles.plusOptionBtn} 
              onPress={() => {
                setPlusModalVisible(false);
                setIsModalVisible(true);
              }}
            >
              <Text style={styles.plusOptionText}>➕ ADD QUEST (CHALLENGE)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.plusOptionBtn, { borderColor: '#00ff64' }]} 
              onPress={() => {
                setPlusModalVisible(false);
                setFocusModalVisible(true);
              }}
            >
              <Text style={[styles.plusOptionText, { color: '#00ff64' }]}>⏱️ SHADOW FOCUS TIMER</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelFullBtn} onPress={() => setPlusModalVisible(false)}>
              <Text style={styles.cancelButtonText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={focusModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isFocusCompleted && styles.modalContainerCompletedRed]}>
            <Text style={[styles.modalTitle, isFocusCompleted && styles.modalTitleCompletedRed]}>
              {isFocusCompleted ? '🔥 FOCUS SESSION COMPLETE!' : '⏱️ SHADOW FOCUS TIMER'}
            </Text>

            {!focusRunning && !isFocusCompleted ? (
              <>
                <Text style={styles.label}>Set Focus Time (HH : MM : SS)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subLabel}>Hours</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="00"
                      placeholderTextColor="#666"
                      value={inputHours}
                      onChangeText={setInputHours}
                      maxLength={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subLabel}>Minutes</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="00"
                      placeholderTextColor="#666"
                      value={inputMins}
                      onChangeText={setInputMins}
                      maxLength={2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subLabel}>Seconds</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="00"
                      placeholderTextColor="#666"
                      value={inputSecs}
                      onChangeText={setInputSecs}
                      maxLength={2}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.addSubmitButton} onPress={startFocusTimer}>
                  <Text style={styles.addSubmitText}>START FOCUS SESSION ⚔️</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ alignItems: 'center', marginVertical: 10 }}>
                <View style={styles.timerCircleContainer}>
                  <Svg width={140} height={140} viewBox="0 0 140 140">
                    <Circle cx="70" cy="70" r={radius} stroke="#333333" strokeWidth={strokeWidth} fill="none" />
                    <Circle
                      cx="70"
                      cy="70"
                      r={radius}
                      stroke={focusRingColorSolid}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={focusDashOffsetValue}
                      strokeLinecap="round"
                      fill="none"
                      transform="rotate(-90 70 70)"
                    />
                  </Svg>
                  <View style={styles.timerTextCenterContainer}>
                    <Text style={[styles.timerDigitsText, isFocusCompleted && { color: '#ff2e2e' }]}>
                      {focusTimeDisplay}
                    </Text>
                  </View>
                </View>

                {isFocusCompleted ? (
                  <Text style={{ color: '#ff2e2e', fontWeight: '900', fontSize: 14, marginVertical: 12 }}>
                    👑 SHADOW SOLDIER EXTRACTION SUCCESSFUL!
                  </Text>
                ) : null}

                <TouchableOpacity 
                  style={[styles.modalCancelFullBtn, isFocusCompleted && { borderColor: '#ffffff', backgroundColor: '#ff2e2e' }]} 
                  onPress={stopFocusTimer}
                >
                  <Text style={[styles.cancelButtonText, isFocusCompleted && { color: '#ffffff' }]}>
                    {isFocusCompleted ? 'RESET TIMER 🔄' : 'CANCEL TIMER'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setFocusModalVisible(false)}>
              <Text style={{ color: isFocusCompleted ? '#ffffff' : '#8b9dc3', fontWeight: '800' }}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.modalHalfCancelBtn} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalHalfAddBtn} onPress={handleAddNewTask} disabled={addingTask}>
                  <Text style={styles.addSubmitText}>{addingTask ? 'ADDING...' : 'ADD QUEST ⚔️'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalHalfCancelBtn} onPress={() => setCalendarVisible(false)}>
                <Text style={styles.cancelButtonText}>CLOSE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalHalfAddBtn} onPress={confirmDateSelection}>
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
  container: { flex: 1, backgroundColor: '#060919' },
  loadingFullContainer: { flex: 1, backgroundColor: '#060919', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingTitle: { fontSize: 20, fontWeight: '900', color: '#00d4ff', letterSpacing: 1.5, marginBottom: 20 },
  timerCircleContainer: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginVertical: 12 },
  timerTextCenterContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  timerDigitsText: { color: '#ffffff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  loadingSubText: { color: '#8b9dc3', fontSize: 12, textAlign: 'center', marginVertical: 16, paddingHorizontal: 20 },

  header: { padding: 20, paddingTop: 48, backgroundColor: 'rgba(0, 212, 255, 0.05)', borderBottomWidth: 2, borderBottomColor: '#00d4ff' },
  headerFullGlow: { borderBottomColor: '#00ff64', backgroundColor: 'rgba(0, 255, 100, 0.08)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rankBadge: { width: 64, height: 64, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', transform: [{ rotate: '45deg' }] },
  rankText: { fontSize: 20, fontWeight: '900', transform: [{ rotate: '-45deg' }] },
  levelText: { fontSize: 18, fontWeight: '900', color: '#00d4ff' },
  dayText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  completionAndNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  completionText: { fontSize: 20, fontWeight: '800', color: '#00d4ff' },
  hundredPercentText: { color: '#00ff64' },
  cleanCyberBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  cleanCyberText: { fontSize: 13, fontWeight: '900', color: '#0a0e27', letterSpacing: 1 },
  logoutBtn: { backgroundColor: 'rgba(255, 107, 107, 0.15)', borderWidth: 1, borderColor: '#ff6b6b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#ff6b6b', fontSize: 11, fontWeight: '900' },
  dateText: { fontSize: 15, color: '#8b9dc3', marginBottom: 2 },
  tasksList: { flex: 1 },
  tasksContent: { padding: 16, paddingBottom: 80 },

  systemHudCard: {
    backgroundColor: '#082943',
    borderWidth: 2,
    borderColor: '#00d4ff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  hudCardCompleted: {
    backgroundColor: '#0e390e',
    borderColor: '#00ff64',
    shadowColor: '#00ff64',
  },
  hudCardLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: '#555555',
    opacity: 0.7,
  },
  hudCardSlashAnim: {
    borderColor: '#ffd700',
    transform: [{ scale: 1.02 }]
  },
  hudHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hudInfoBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hudInfoBadgeCompleted: {
    backgroundColor: 'rgba(0, 255, 100, 0.12)',
    borderColor: 'rgba(0, 255, 100, 0.5)',
  },
  hudInfoText: {
    color: '#00d4ff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hudInfoTextCompleted: {
    color: '#00ff64',
  },
  tempBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffaa00',
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  tempBadgeLocked: {
    color: '#8b9dc3',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  hudQuestTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  hudMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  hudTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00d4ff',
  },
  hudTimeTextCompleted: {
    color: '#00ff64',
  },
  hudDurationText: {
    fontSize: 13,
    color: '#8b9dc3',
  },
  hudActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  killButton: { backgroundColor: '#00ff64' },
  defeatButton: { backgroundColor: '#ff6b6b' },
  lockedButton: { backgroundColor: '#333333' },
  actionButtonText: { fontSize: 13, fontWeight: '900', color: '#000000', letterSpacing: 1 },
  lockedButtonText: { color: '#8b9dc3' },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255, 107, 107, 0.2)', borderRadius: 8 },
  deleteButtonText: { fontSize: 15 },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#8b9dc3' },

  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#00d4ff', fontSize: 18, fontWeight: '900' },
  emptySubText: { color: '#8b9dc3', fontSize: 13, textAlign: 'center', marginTop: 8 },
  floatingPlusButton: { position: 'absolute', right: 24, bottom: 90, width: 60, height: 60, borderRadius: 30, backgroundColor: '#00d4ff', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  floatingPlusText: { fontSize: 36, fontWeight: '900', color: '#0a0e27', marginTop: -4 },
  statsButton: { backgroundColor: '#00d4ff', padding: 16, margin: 16, borderRadius: 12 },
  statsButtonText: { fontSize: 16, fontWeight: '900', color: '#0a0e27', textAlign: 'center' },
  
  plusMenuContainer: { backgroundColor: '#0a0e27', borderWidth: 2, borderColor: '#00d4ff', borderRadius: 16, padding: 20, width: '85%' },
  plusOptionBtn: { backgroundColor: 'rgba(0, 212, 255, 0.1)', borderWidth: 1.5, borderColor: '#00d4ff', padding: 14, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  plusOptionText: { color: '#00d4ff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', backgroundColor: '#0a0e27', borderWidth: 2, borderColor: '#00d4ff', borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalContainerCompletedRed: { backgroundColor: '#2a0808', borderColor: '#ff2e2e', shadowColor: '#ff2e2e', shadowRadius: 15, elevation: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#00d4ff', marginBottom: 16, textAlign: 'center' },
  modalTitleCompletedRed: { color: '#ff2e2e' },
  label: { fontSize: 12, fontWeight: '700', color: '#8b9dc3', marginTop: 10, marginBottom: 4 },
  subLabel: { fontSize: 10, fontWeight: '700', color: '#8b9dc3', marginBottom: 2, textAlign: 'center' },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', borderRadius: 8, color: '#fff', padding: 12, fontSize: 14, textAlign: 'center' },
  datePickerTrigger: { backgroundColor: 'rgba(0, 212, 255, 0.12)', borderWidth: 1.5, borderColor: '#00d4ff', borderRadius: 8, padding: 14, alignItems: 'center', marginVertical: 4 },
  datePickerTriggerText: { color: '#00d4ff', fontWeight: '900', fontSize: 15 },
  typeSelectorContainer: { flexDirection: 'row', gap: 10, marginTop: 6 },
  typeButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', borderRadius: 8, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
  typeButtonText: { color: '#8b9dc3', fontWeight: '700', fontSize: 12 },
  typeTextActive: { color: '#0a0e27' },

  modalActionsRow: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  modalHalfCancelBtn: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ff6b6b', alignItems: 'center', justifyContent: 'center' },
  modalHalfAddBtn: { flex: 1, backgroundColor: '#00d4ff', padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalCancelFullBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ff6b6b', alignItems: 'center', width: '100%' },
  cancelButtonText: { color: '#ff6b6b', fontWeight: '900' },
  addSubmitButton: { backgroundColor: '#00d4ff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 14 },
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
  calendarActions: { flexDirection: 'row', gap: 12, marginTop: 16 },

  videoOverlayContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  fullVideo: { width: '100%', height: '100%' },
  skipButton: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0, 212, 255, 0.3)', borderWidth: 1, borderColor: '#00d4ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  skipText: { color: '#ffffff', fontWeight: '900', fontSize: 12 }
});