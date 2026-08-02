from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import motor.motor_asyncio
import bcrypt
import jwt
import os

app = FastAPI()

# --- DATABASE CONFIGURATION (PURANE DATABASE SE MATCHED) ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://monar:king123@cluster0.vytusx9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)

# 🎯 EXACT DATABASE NAME REVERTED TO SHADOW_PRESENTATION
db = client.shadow_presentation
users_collection = db.users

JWT_SECRET = os.getenv("JWT_SECRET", "shadow_monarch_secret_key_123")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DEFAULT PROTOCOL TASKS ---
DEFAULT_TASKS = [
    {"task": "Utho & 1 Glass Paani", "time": "07:30", "duration": 5, "task_type": "permanent"},
    {"task": "Quick Fresh & Meditation", "time": "07:35", "duration": 15, "task_type": "permanent"},
    {"task": "Shower, Breakfast & Ready", "time": "07:45", "duration": 45, "task_type": "permanent"},
    {"task": "Commute to College", "time": "08:30", "duration": 30, "task_type": "permanent"},
    {"task": "COLLEGE HOURS + Lunch Missions", "time": "09:00", "duration": 495, "task_type": "permanent"},
    {"task": "Ghar wapsi + Gear up", "time": "17:15", "duration": 15, "task_type": "permanent"},
    {"task": "GYM WARFARE (Push limits!)", "time": "17:30", "duration": 105, "task_type": "permanent"},
    {"task": "Shower & Fresh", "time": "19:15", "duration": 30, "task_type": "permanent"},
    {"task": "Hair Oiling + Immunity Drink", "time": "19:45", "duration": 30, "task_type": "permanent"},
    {"task": "Dinner (Recovery fuel)", "time": "20:15", "duration": 30, "task_type": "permanent"},
    {"task": "Power Break / Mental Prep", "time": "20:45", "duration": 15, "task_type": "permanent"},
    {"task": "TRADING (Sniper focus)", "time": "21:00", "duration": 60, "task_type": "permanent"},
    {"task": "APTITUDE STUDY", "time": "22:00", "duration": 60, "task_type": "permanent"},
    {"task": "CODING (Deep Work Mode: ON)", "time": "23:00", "duration": 120, "task_type": "permanent"},
    {"task": "CONTENT CREATION", "time": "01:00", "duration": 60, "task_type": "permanent"},
    {"task": "Brush & Sleep Prep", "time": "02:00", "duration": 10, "task_type": "permanent"}
]

# --- PYDANTIC SCHEMAS ---
class AuthRequest(BaseModel):
    email: str
    password: str

class StartRequest(BaseModel):
    user_id: str = "default_user"

class TaskUpdate(BaseModel):
    user_id: str = "default_user"
    day_number: int
    task_index: int
    completed: bool

class CustomTaskReq(BaseModel):
    user_id: str = "default_user"
    task: str
    time: str = "12:00 PM"
    duration: int = 30
    task_type: str = "permanent"
    start_date: Optional[str] = None
    end_date: Optional[str] = None

# --- HELPER FUNCTIONS ---
def get_ist_time():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

def calculate_rank(percentage):
    if percentage >= 97: return "1%"
    elif percentage >= 90: return "S"
    elif percentage >= 85: return "A"
    elif percentage >= 75: return "B"
    elif percentage >= 65: return "C"
    elif percentage >= 50: return "D"
    elif percentage >= 30: return "E"
    else: return "F" 

def get_active_tasks_for_date(user_tasks, target_date):
    active = []
    for g_idx, t in enumerate(user_tasks):
        t_type = t.get("task_type", "permanent")
        if t_type == "permanent":
            active.append((g_idx, t))
        elif t_type == "temporary":
            try:
                s_date = datetime.strptime(t.get("start_date"), "%Y-%m-%d").date()
                e_date = datetime.strptime(t.get("end_date"), "%Y-%m-%d").date()
                if s_date <= target_date <= e_date:
                    active.append((g_idx, t))
            except Exception:
                pass
    
    active.sort(key=lambda x: 0 if x[1].get("task_type", "permanent") == "permanent" else 1)
    return active

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

# --- HEALTH CHECK ---
@app.api_route("/", methods=["GET", "HEAD"])
async def health():
    try:
        await client.admin.command('ping')
        return {"status": "Online", "database": "Connected ✅", "server_time_ist": get_ist_time().isoformat()}
    except Exception as e:
        return {"status": "Online", "database": f"Error: {str(e)} ❌"}

# --- AUTHENTICATION ROUTES ---
@app.post("/api/auth/register")
@app.post("/auth/register")
async def register(user_data: AuthRequest):
    email_clean = user_data.email.strip().lower()
    existing_user = await users_collection.find_one({"email": email_clean})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists with this email!")

    hashed_pwd = hash_password(user_data.password.strip())
    ist_now = get_ist_time()
    
    new_user = {
        "email": email_clean,
        "password": hashed_pwd,
        "user_id": email_clean,
        "start_date": ist_now.isoformat(),
        "active": True,
        "history": {},
        "tasks": [] # Dynamic Tasks for New Accounts
    }

    result = await users_collection.insert_one(new_user)
    user_id = str(result.inserted_id)
    token = create_access_token({"userId": user_id, "email": email_clean})

    return {
        "success": True,
        "token": token,
        "userId": email_clean,
        "email": email_clean,
        "message": "Shadow Monarch Awakened!"
    }

@app.post("/api/auth/login")
@app.post("/auth/login")
async def login(user_data: AuthRequest):
    email_clean = user_data.email.strip().lower()
    user = await users_collection.find_one({"email": email_clean})
    
    if not user or not verify_password(user_data.password.strip(), user["password"]):
        raise HTTPException(status_code=400, detail="Invalid Email or Password!")

    token = create_access_token({"userId": str(user["_id"]), "email": user["email"]})

    return {
        "success": True,
        "token": token,
        "userId": user.get("user_id", email_clean),
        "email": user["email"],
        "message": "Welcome Back, Shadow Monarch!"
    }

# --- CHALLENGE & TASK PROGRESSION ENDPOINTS ---
@app.get("/api/challenge/current")
async def get_current_status(user_id: str = "default_user"):
    try:
        user = await users_collection.find_one({"user_id": user_id})
        if not user:
            return {"active": False}
        
        user_tasks = user.get("tasks", DEFAULT_TASKS)
        ist_now = get_ist_time()
        today_str = ist_now.strftime("%Y-%m-%d")
        day_of_week = ist_now.strftime("%A")
        is_sunday = day_of_week == "Sunday"
        
        start_date_str = user.get("start_date")
        try:
            if start_date_str:
                start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
            else:
                start_date = ist_now
        except Exception:
            start_date = ist_now 
            
        current_day = max(1, (ist_now.date() - start_date.date()).days + 1)

        history = user.get("history")
        if not isinstance(history, dict): history = {} 
            
        completed_today = history.get(today_str)
        if not isinstance(completed_today, list): completed_today = [] 

        active_tasks = get_active_tasks_for_date(user_tasks, ist_now.date())
        
        tasks_response = []
        permanent_total = 0
        permanent_completed = 0
        
        for g_idx, t in active_tasks:
            is_completed = g_idx in completed_today
            t_type = t.get("task_type", "permanent")
            
            if t_type == "permanent":
                permanent_total += 1
                if is_completed:
                    permanent_completed += 1
                    
            tasks_response.append({
                "task": t["task"], 
                "time": t["time"], 
                "duration": t["duration"],
                "completed": is_completed,
                "task_type": t_type,
                "start_date": t.get("start_date"),
                "end_date": t.get("end_date")
            })
        
        completion_percentage = 100.0 if is_sunday else ( (permanent_completed / permanent_total * 100) if permanent_total > 0 else 100.0 )
        total_tasks_done = sum(len(tasks) for tasks in history.values() if isinstance(tasks, list))
        current_level = 1 + (total_tasks_done // 5) 
        current_rank_daily = calculate_rank(completion_percentage)
        
        stats = {
            "strength": 10 + int(total_tasks_done * 1.5),
            "vitality": 10 + int(total_tasks_done * 1.2),
            "agility": 10 + int(total_tasks_done * 1.0),
            "recovery": 10 + int(total_tasks_done * 0.8)
        }
        
        return {
            "active": True,
            "challenge": {
                "current_day": current_day,
                "current_rank": current_rank_daily, 
                "current_level": current_level,
                "stats": stats,
                "start_date": start_date_str if start_date_str else ist_now.isoformat()
            },
            "today": {
                "day_number": current_day,
                "date": today_str,
                "day_of_week": day_of_week,
                "tasks": tasks_response,
                "completion_percentage": completion_percentage, 
                "is_sunday": is_sunday
            }
        }
    except Exception as e:
        print(f"CRITICAL ERROR IN CURRENT STATUS: {e}")
        return {"active": False, "error": str(e)}

@app.post("/api/challenge/start")
async def start_challenge(req: StartRequest):
    try:
        ist_now = get_ist_time()
        existing = await users_collection.find_one({"user_id": req.user_id})
        if existing:
            await users_collection.update_one(
                {"user_id": req.user_id}, 
                {"$set": {"active": True}}
            )
        else:
            new_user = {
                "user_id": req.user_id,
                "start_date": ist_now.isoformat(),
                "active": True,
                "history": {},
                "tasks": DEFAULT_TASKS
            }
            await users_collection.insert_one(new_user)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/challenge/custom-task")
async def add_custom_task(req: CustomTaskReq):
    try:
        new_task = {
            "task": req.task,
            "time": req.time,
            "duration": req.duration,
            "task_type": req.task_type,
            "start_date": req.start_date,
            "end_date": req.end_date
        }
        
        user = await users_collection.find_one({"user_id": req.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if "tasks" not in user:
            await users_collection.update_one(
                {"user_id": req.user_id}, 
                {"$set": {"tasks": DEFAULT_TASKS}}
            )
            
        await users_collection.update_one(
            {"user_id": req.user_id},
            {"$push": {"tasks": new_task}}
        )
        return {"success": True, "message": "Custom task added to protocol!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/challenge/task")
async def update_task(req: TaskUpdate):
    try:
        ist_now = get_ist_time()
        today_str = ist_now.strftime("%Y-%m-%d")
        user = await users_collection.find_one({"user_id": req.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_tasks = user.get("tasks", DEFAULT_TASKS)
        active_tasks = get_active_tasks_for_date(user_tasks, ist_now.date())
        
        if req.task_index >= len(active_tasks):
            raise HTTPException(status_code=400, detail="Invalid task index sync")
            
        global_idx = active_tasks[req.task_index][0]
        
        history = user.get("history", {})
        if not isinstance(history, dict): history = {}
            
        completed_today = history.get(today_str, [])
        if not isinstance(completed_today, list): completed_today = []
        
        if req.completed and global_idx not in completed_today:
            completed_today.append(global_idx)
        elif not req.completed and global_idx in completed_today:
            completed_today.remove(global_idx)
            
        history[today_str] = completed_today
        await users_collection.update_one({"user_id": req.user_id}, {"$set": {"history": history}})
        
        perm_total = sum(1 for _, t in active_tasks if t.get("task_type", "permanent") == "permanent")
        perm_completed = sum(1 for g_idx in completed_today if user_tasks[g_idx].get("task_type", "permanent") == "permanent")
        new_pct = 100.0 if ist_now.strftime("%A") == "Sunday" else ( (perm_completed / perm_total * 100) if perm_total > 0 else 100.0 )
        
        return {"success": True, "completion_percentage": new_pct}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/challenge/history")
async def get_history(user_id: str = "default_user", days: int = 30):
    try:
        user = await users_collection.find_one({"user_id": user_id})
        if not user:
            return {"history": []}
        
        history_dict = user.get("history")
        if not isinstance(history_dict, dict): history_dict = {}
        
        user_tasks = user.get("tasks", DEFAULT_TASKS)
        formatted_history = []
        ist_now = get_ist_time()
        today_date = ist_now.date()
        
        start_date_str = user.get("start_date")
        try:
            if start_date_str:
                start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00")).date()
            else:
                start_date = today_date
        except Exception:
            start_date = today_date
            
        range_start = max(start_date, today_date - timedelta(days=days-1))
        current_iter_date = range_start
        
        while current_iter_date <= today_date:
            date_str = current_iter_date.strftime("%Y-%m-%d")
            day_name = current_iter_date.strftime("%A")
            day_num = max(1, (current_iter_date - start_date).days + 1)
            
            active_for_day = get_active_tasks_for_date(user_tasks, current_iter_date)
            perm_total = sum(1 for _, t in active_for_day if t.get("task_type", "permanent") == "permanent")
            
            if day_name == "Sunday":
                completion_percentage = 100.0
            elif date_str in history_dict and isinstance(history_dict[date_str], list):
                completed_indices = history_dict[date_str]
                perm_completed = sum(1 for g_idx in completed_indices if g_idx < len(user_tasks) and user_tasks[g_idx].get("task_type", "permanent") == "permanent")
                completion_percentage = (perm_completed / perm_total * 100) if perm_total > 0 else 100.0
            else:
                completion_percentage = 0.0
                
            formatted_history.append({
                "day_number": day_num,
                "date": date_str,
                "day_of_week": day_name,
                "completion_percentage": completion_percentage
            })
            current_iter_date += timedelta(days=1)
        
        return {"history": formatted_history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))