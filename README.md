# ARISE - The Shadow Protocol 🗡️

An epic gamified task tracking mobile app for the ultimate 180-day transformation journey!

## 🎯 Overview

ARISE is a motivational anime/gaming-themed task tracking app that turns your daily schedule into an exciting RPG-like adventure. Complete tasks, earn ranks, level up, and track your progress over 180 days with ZERO tolerance for quitting.

## ⚔️ Features

### Core Features
- **180-Day Challenge**: Once started, runs continuously for 180 days (cannot be cancelled)
- **Shadow Protocol Timetable**: Predefined schedule from 7:30 AM to 2:10 AM (Mon-Sat)
- **Rest Day**: Automatic 100% completion every Sunday
- **Task Tracking**: Mark tasks as "Kill" (complete) or "Defeat" (incomplete) with sword animations
- **Partial Credit System**: Earn percentage based on completed tasks (e.g., 3/5 = 60%)
- **Weekly Ranking System**: Get ranked E, D, C, B, A, S, or National based on weekly average
- **Level System**: Progress through levels as you complete more tasks
- **Stats Dashboard**: Track Strength, Vitality, Agility, and Recovery stats
- **Smart Notifications**: Get reminders for each task at scheduled times
- **Progress Tracking**: View 30-day history and overall progress

### Ranking System (Weekly)
- **National**: 97%+ average completion
- **S Rank**: 93%+ average completion
- **A Rank**: 85%+ average completion
- **B Rank**: 75%+ average completion
- **C Rank**: 65%+ average completion
- **D Rank**: 50%+ average completion
- **E Rank**: 30%+ average completion

## 📱 Screenshots

The app features:
- Electric blue theme with anime/gaming aesthetic
- Animated rank badges with hexagonal design
- Sword slash animations on task completion
- Progress charts and stats visualization
- Alert system for missed tasks

## 🛠️ Tech Stack

### Frontend
- **Expo** (React Native)
- **expo-router** for file-based routing
- **expo-notifications** for task reminders
- **react-native-reanimated** for animations
- **axios** for API calls
- **date-fns** for date handling
- **AsyncStorage** for local state persistence

### Backend
- **FastAPI** (Python)
- **MongoDB** with Motor (async driver)
- **Pydantic** for data validation

## 📂 Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI backend with all endpoints
│   ├── .env               # Environment variables
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── index.tsx      # Landing page
│   │   ├── onboarding.tsx # Challenge preview & start
│   │   ├── dashboard.tsx  # Main task dashboard
│   │   └── stats.tsx      # Stats & progress screen
│   ├── app.json           # Expo configuration
│   └── package.json       # Node dependencies
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- MongoDB
- Expo CLI

### Installation

1. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
python server.py
```

2. **Frontend Setup**
```bash
cd frontend
yarn install
expo start
```

3. **Access the App**
- Web: Open the Metro bundler URL
- Mobile: Scan QR code with Expo Go app

## 📋 API Endpoints

### Challenge Management
- `POST /api/challenge/start` - Start 180-day challenge
- `GET /api/challenge/current` - Get current challenge status
- `POST /api/challenge/mark-task` - Mark task as complete/incomplete
- `GET /api/challenge/history` - Get challenge history (last N days)

### Timetable
- `GET /api/timetable/{day}` - Get tasks for specific day (Monday-Sunday)

## 🎮 How It Works

### The Shadow Protocol (Mon-Sat)
```
07:30 AM - Wake up & Water
07:30 AM - Meditation (15 mins)
07:45 AM - Shower & Breakfast (45 mins)
09:00 AM - College (8+ hours)
05:30 PM - Gym Warfare (1h 45m)
07:15 PM - Shower & Fresh
07:45 PM - Hair Oiling + Immunity Drink
08:15 PM - Dinner
09:00 PM - Trading (1h)
10:00 PM - Aptitude Study (1h)
11:00 PM - Coding (2h)
01:00 AM - Content Creation (1h)
02:00 AM - Sleep Prep
02:10 AM - SLEEP (~4h 10m)
```

### Sunday
- Automatic 100% completion (Rest Day)
- No tasks required
- Counts toward weekly average

### Completion Rules
1. Each task can be marked "Kill" (✅) or "Defeat" (❌)
2. Daily percentage = (completed tasks / total tasks) × 100
3. Weekly rank = Average of 7 days' percentages
4. Stats increase based on overall performance
5. Level increases over time with consistent performance

### Notifications
- Each task sends a notification at its scheduled time
- App open shows alert with remaining tasks
- Notifications persist until task is completed

## 🎨 Design Philosophy

The app uses a dark cyberpunk/anime aesthetic with:
- Deep blue background (#0a0e27)
- Electric cyan accents (#00d4ff)
- Neon green for success (#00ff64)
- Red for warnings/defeats (#ff6b6b)
- Hexagonal shapes for ranks and badges
- Sword slash animations for task interactions

## 📊 Data Persistence

All data is stored in MongoDB:
- `challenges` collection: User challenge records
- `daily_progress` collection: Daily task completion data

Data includes:
- Start date and current day
- Task completion status
- Weekly ranks and levels
- Stats (Strength, Vitality, Agility, Recovery)
- Complete 180-day history

## 🔔 Notifications System

The app uses `expo-notifications` with:
- Permission requests on challenge start
- Scheduled notifications for each task
- High priority Android notifications
- Custom notification channel
- Sound and vibration support

## ⚠️ Important Notes

1. **Cannot Cancel**: Once you start the 180-day challenge, it cannot be cancelled or reset
2. **Continuous Tracking**: App tracks progress even if you don't open it daily
3. **Partial Credit**: You get credit for completed tasks, even if you don't finish all
4. **Sunday Bonus**: Every Sunday is an automatic 100% day
5. **Rank Updates**: Ranks update at the end of each week based on 7-day average

## 🐛 Troubleshooting

### Backend Issues
- Check MongoDB is running: `sudo systemctl status mongodb`
- Verify environment variables in `backend/.env`
- Check logs: `tail -f /var/log/supervisor/backend.err.log`

### Frontend Issues
- Clear Expo cache: `expo start -c`
- Check notification permissions in device settings
- Restart Expo: `sudo supervisorctl restart expo`

## 📄 License

This project is for personal use. The Shadow Protocol is not for the faint of heart! 💪

## 🙏 Motivation

"Six days of war. One day of peace."

This app is designed to push your limits and help you build discipline through gamification. Every task completed is a victory. Every day is a battle. Are you ready to ARISE?

---

**Built with** ⚡ **by warriors, for warriors** ⚔️
