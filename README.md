# ⚔️ ARISE: The Shadow Protocol 🗡️

An epic, production-ready gamified task tracking and personal transformation mobile application inspired by the Solo Leveling anime system mechanics. Built for a strict 180-day transformation journey with zero tolerance for quitting.

---

## 🌐 Live Cloud Deployment
- **Backend API Base URL:** `https://arise-presentation-api.onrender.com`
- **API Status & Health Check:** `https://arise-presentation-api.onrender.com/`[cite: 5]

---

## 🎯 Overview

ARISE is a motivational gaming-themed task tracking application that turns your daily schedule into an exciting RPG adventure. Complete tasks, earn ranks, level up, track dynamic attributes, run high-precision focus sessions, and compete on the global leaderboard over 180 continuous days[cite: 1, 2, 4].

---

## ⚔️ Features

### Core Task & Progression Engine
* **180-Day Challenge:** Continuous 180-day transformation protocol designed to enforce absolute consistency[cite: 2].
* **Strict Equal-Weight Division:** Daily permanent quests divide dynamically on an exact $100\%$ scale ($100/N\%$ per task).
* **Permanent & Temporary Quests:** Supports both persistent daily habits and timeline-locked temporary quests with start/end date validation and interactive popup calendar selection.
* **Rest Day Automation:** Automatic $100\%$ completion credit every Sunday to safeguard weekly averages[cite: 2].
* **Rank Evolution System:** Real-time rank tiers updated instantly based on daily and weekly performance[cite: 3]:
  * **1% Rank:** 97%+ Completion (Peak Hunter Dominance)
  * **S Rank:** 90% - 96% Completion
  * **A Rank:** 85% - 89% Completion
  * **B Rank:** 75% - 84% Completion
  * **C Rank:** 65% - 74% Completion
  * **D Rank:** 50% - 64% Completion
  * **E Rank:** 30% - 49% Completion
  * **F Rank:** Below 30% Completion
* **Level & Attribute Tracking:** Real-time stats progression across Strength, Vitality, Agility, and Recovery as quests are cleared.
* **Cinematic Video Cutscenes:** Native milestone video overlays triggering for awakening and elite rank advancements (1%, S, A)[cite: 4].

### 🏆 Automated Time-Locked Global Leaderboard
* **Dynamic Time Locks:** Scores remain locked throughout the day and open during the calculation window (11:57 PM - 11:59 PM IST).
* **Daily Winner:** Revealed automatically every night at 11:59 PM IST[cite: 1].
* **Weekly Champion:** Revealed every Sunday at 11:59 PM IST (Daily winner is hidden to spotlight the weekly master)[cite: 1].
* **Monthly Legend:** Declared on the last day of each month at 11:59 PM IST[cite: 1].
* **Hall of Fame:** Preserves past daily, weekly, and monthly winner archives[cite: 1].

### ⏱️ Shadow Focus Timer
* **60 FPS Smooth Ring Animation:** High-frequency SVG circular progress indicator with chromatic shift[cite: 4].
* **Custom Durations:** Configurable Hours, Minutes, and Seconds (HH : MM : SS) inputs[cite: 4].
* **Audio-Haptic Triggers:** Native sound alerts and vibration patterns on session completion[cite: 4].

### 🔐 Secure Authentication & Recovery
* **JWT & BCrypt Security:** Stateless token authentication with salted password encryption[cite: 5].
* **Automated Brevo OTP Dispatch:** Automated 6-digit email OTP generation for password resets with a 60-second cooldown timer[cite: 5].

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** React Native with Expo (Managed Workflow)
* **Routing:** Expo Router (File-based navigation)
* **Vector Graphics:** React Native SVG[cite: 3, 4]
* **Media & Audio:** Expo-AV (Native video & audio playback)[cite: 4, 5]
* **Date Utilities:** `date-fns`[cite: 3, 4]
* **Local Persistence:** AsyncStorage[cite: 3, 4, 5]

### Backend
* **Framework:** Python FastAPI (Asynchronous REST API)
* **Database:** MongoDB Atlas (Cloud NoSQL)
* **Async Database Driver:** Motor (AsyncIO MongoDB Driver)
* **Authentication:** PyJWT & BCrypt
* **Email Service:** Brevo (Sendinblue) HTTP API
* **Hosting:** Render Cloud[cite: 4, 5]

---

## 📂 Project Structure

```text
/
├── backend/
│   ├── server.py              # FastAPI backend endpoints, JWT auth & leaderboard engine
│   ├── requirements.txt       # Python dependencies (fastapi, motor, bcrypt, pyjwt, requests)
│   └── .env                   # Environment variables (Mongo URI, JWT secret, Brevo API key)
│
├── frontend/
│   ├── app/
│   │   ├── index.tsx          # Authentication Gateway (Login, Signup & OTP Modal)
│   │   ├── onboarding.tsx     # Protocol introduction & challenge initiation
│   │   ├── dashboard.tsx      # Main HUD, quest management, focus timer & calendar
│   │   ├── stats.tsx          # Attribute progression, battle chart & 180-day history
│   │   └── leaderboard.tsx    # Time-locked global leaderboard & Hall of Fame
│   ├── assets/                # Video cutscenes (awakening.mp4, rank milestones) & audio
│   ├── app.json               # Expo app configuration
│   └── package.json           # Node dependencies
└── README.md

```
📋 API Endpoints Overview
Authentication & Recovery
POST /api/auth/register - Create and awaken new player account

POST /api/auth/login - Authenticate player and issue signed JWT token

POST /api/auth/forgot-password - Generate and send 6-digit OTP via Brevo

POST /api/auth/reset-password - Verify OTP and update account password

Challenge & Quest Management
GET / - API health check and server IST timestamp

GET /api/challenge/current - Get active challenge progress, tasks, ranks, and historical data[cite: 4]

POST /api/challenge/start - Initialize 180-day challenge protocol[cite: 2]

POST /api/challenge/task - Toggle daily task status (Kill / Defeat)[cite: 4]

POST /api/challenge/custom-task - Add permanent or temporary custom quests[cite: 4]

POST /api/challenge/task/delete - Delete a custom quest and reindex history arrays[cite: 4]

Global Leaderboard
GET /api/leaderboard - Fetch daily, weekly, and monthly locked/unlocked standings and past archives[cite: 1]

⚙️ Local Setup & Installation
1. Backend Setup
Open your terminal and run:

cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate

# Install dependencies and launch the server:
pip install -r requirements.txt
uvicorn server.py:app --reload

2. Frontend Setup
Open a new terminal tab and run

cd frontend
npm install
npx expo start -c

Scan the generated QR code using the Expo Go application on your mobile device to test live.🎨 

🎨 Design Philosophy
Dark cyberpunk aesthetic inspired by Solo Leveling:
Background: Deep Shadow Navy (#060919 / #0a0e27) 
Primary Accent: Electric Cyan (#00d4ff) 
Success Indicator: Neon Green (#00ff64) 
Alert & Defeat: Crimson Red (#ff2e2e / #ff6b6b) 
Elite Highlights: Gold (#ffd700) 

📄 LicenseThis project is licensed under the MIT License.
Built for dedicated achievers and solo enthusiasts.

⚔️⚔️⚔️"Six days of war. One day of peace."🗡️🗡️🗡️
