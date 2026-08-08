from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import motor.motor_asyncio
import bcrypt
import jwt
import os
import random
import requests

app = FastAPI()

# --- DATABASE CONFIGURATION ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://monar:king123@cluster0.vytusx9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)

db = client.shadow_db
users_collection = db.users
otps_collection = db.password_reset_otps

JWT_SECRET = os.getenv("JWT_SECRET", "shadow_monarch_secret_key_123")

# --- BREVO HTTP API CONFIGURATION ---
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "prateekpatel696@gmail.com")
SENDER_NAME = "ARISE Protocol"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC SCHEMAS ---
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email_or_username: str
    password: str

class ForgotPasswordReq(BaseModel):
    email: str

class VerifyResetReq(BaseModel):
    email: str
    otp: str
    new_password: str

class StartRequest(BaseModel):
    user_id: str = "default_user"

class TaskUpdate(BaseModel):
    user_id: str = "default_user"
    task_index: int
    completed: bool

class TaskDeleteReq(BaseModel):
    user_id: str = "default_user"
    task_index: int

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

# BREVO DIRECT HTTP API EMAIL DISPATCH
def send_email_otp_brevo(to_email: str, otp_code: str):
    if not BREVO_API_KEY:
        print("BREVO_API_KEY environment variable missing!")
        return

    url = "https://api.brevo.com/v3/smtp/email"
    payload = {
        "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": "⚔️ ARISE PROTOCOL - Password Reset Verification Code",
        "htmlContent": f"""
        <div style='background-color:#0a0e27; padding:24px; color:#ffffff; font-family:Arial,sans-serif; border:2px solid #00d4ff; border-radius:12px;'>
            <h2 style='color:#00d4ff; text-align:center;'>⚔️ ARISE PROTOCOL SYSTEM</h2>
            <p style='font-size:16px;'>Monarch!</p>
            <p style='font-size:15px;'>Your 6-Digit Password Reset OTP Verification Code is:</p>
            <div style='background-color:rgba(0, 212, 255, 0.1); border:1px solid #00d4ff; padding:16px; text-align:center; font-size:28px; font-weight:bold; letter-spacing:6px; color:#00ff64; margin:20px 0;'>
                {otp_code}
            </div>
            <p style='font-size:13px; color:#8b9dc3;'>This code is valid for 10 minutes. Do not share this OTP with anyone.</p>
        </div>
        """
    }
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"Brevo API Response Status: {response.status_code}")
    except Exception as e:
        print(f"Brevo API Dispatch Error: {e}")

# --- HEALTH CHECK & WAKE-UP SIGNAL ---
@app.get("/")
async def health():
    try:
        await client.admin.command('ping')
        return {"status": "Online", "database": "Connected ✅", "server_time_ist": get_ist_time().isoformat()}
    except Exception as e:
        return {"status": "Online", "database": f"Error: {str(e)} ❌"}

# --- AUTHENTICATION ROUTES ---
@app.post("/api/auth/register")
@app.post("/auth/register")
async def register(user_data: RegisterRequest):
    email_clean = user_data.email.strip().lower()
    username_clean = user_data.username.strip()

    if len(username_clean) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters!")

    existing_username = await users_collection.find_one({"username_lower": username_clean.lower()})
    if existing_username:
        raise HTTPException(status_code=400, detail="This Username is already taken! Choose another Shadow name.")

    existing_email = await users_collection.find_one({"email": email_clean})
    if existing_email:
        raise HTTPException(status_code=400, detail="User already exists with this email!")

    hashed_pwd = hash_password(user_data.password.strip())
    ist_now = get_ist_time()
    
    new_user = {
        "username": username_clean,
        "username_lower": username_clean.lower(),
        "email": email_clean,
        "password": hashed_pwd,
        "user_id": email_clean,
        "start_date": ist_now.isoformat(),
        "active": True,
        "history": {},
        "tasks": [] 
    }

    result = await users_collection.insert_one(new_user)
    token = create_access_token({"userId": str(result.inserted_id), "email": email_clean, "username": username_clean})

    return {
        "success": True,
        "token": token,
        "userId": email_clean,
        "email": email_clean,
        "username": username_clean,
        "message": f"Monarch {username_clean} Awakened!"
    }

@app.post("/api/auth/login")
@app.post("/auth/login")
async def login(user_data: LoginRequest):
    input_clean = user_data.email_or_username.strip().lower()
    
    user = await users_collection.find_one({
        "$or": [{"email": input_clean}, {"username_lower": input_clean}]
    })
    
    if not user or not verify_password(user_data.password.strip(), user["password"]):
        raise HTTPException(status_code=400, detail="Invalid Email/Username or Password!")

    username = user.get("username", "Monarch")
    token = create_access_token({"userId": str(user["_id"]), "email": user["email"], "username": username})

    return {
        "success": True,
        "token": token,
        "userId": user.get("user_id", user["email"]),
        "email": user["email"],
        "username": username,
        "message": f"Welcome Back, Monarch {username}!"
    }

# --- FORGOT & RESET PASSWORD ---
@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordReq, background_tasks: BackgroundTasks):
    email_clean = req.email.strip().lower()
    user = await users_collection.find_one({"email": email_clean})
    
    if not user:
        raise HTTPException(status_code=404, detail="No account registered with this email!")

    otp_code = str(random.randint(100000, 999999))
    expire_time = get_ist_time() + timedelta(minutes=10)

    await otps_collection.update_one(
        {"email": email_clean},
        {"$set": {"otp": otp_code, "expires_at": expire_time}},
        upsert=True
    )

    background_tasks.add_task(send_email_otp_brevo, email_clean, otp_code)

    return {
        "success": True,
        "message": f"OTP Verification Code sent to {email_clean}! Please check your email inbox."
    }

@app.post("/api/auth/reset-password")
async def reset_password(req: VerifyResetReq):
    email_clean = req.email.strip().lower()
    record = await otps_collection.find_one({"email": email_clean})

    if not record or record.get("otp") != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP Code!")

    if get_ist_time() > record.get("expires_at"):
        raise HTTPException(status_code=400, detail="OTP Code Expired! Please click Resend OTP.")

    hashed_pwd = hash_password(req.new_password.strip())
    await users_collection.update_one({"email": email_clean}, {"$set": {"password": hashed_pwd}})
    await otps_collection.delete_one({"email": email_clean})

    return {"success": True, "message": "Password reset successful! You can now login with your new password."}

# --- QUEST & CHALLENGE MANAGEMENT (PERMANENT TASKS EQUAL 100% DIVISION) ---
@app.get("/api/challenge/current")
async def get_current_status(user_id: str = "default_user"):
    try:
        user = await users_collection.find_one({"user_id": user_id})
        if not user:
            return {"active": False}
        
        user_tasks = user.get("tasks", [])
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
        history = user.get("history", {})
        if not isinstance(history, dict): history = {}
            
        completed_today_indices = history.get(today_str, [])
        if not isinstance(completed_today_indices, list): completed_today_indices = []

        tasks_response = []
        
        permanent_total_count = 0
        permanent_completed_count = 0

        for idx, t in enumerate(user_tasks):
            task_type = t.get("task_type", "permanent")
            t_start = t.get("start_date")
            t_end = t.get("end_date")

            is_locked = False
            is_expired = False

            if task_type == "temporary":
                if t_end and today_str > t_end:
                    is_expired = True
                elif t_start and today_str < t_start:
                    is_locked = True

            if is_expired:
                continue

            is_done = idx in completed_today_indices

            if task_type == "permanent":
                permanent_total_count += 1
                if is_done:
                    permanent_completed_count += 1

            tasks_response.append({
                "task": t["task"], 
                "time": t["time"], 
                "duration": t["duration"],
                "completed": is_done,
                "task_type": task_type,
                "start_date": t_start,
                "end_date": t_end,
                "is_locked": is_locked
            })
        
        # STRICT EQUAL 100% DIVISION AMONG PERMANENT TASKS
        completion_percentage = 100.0 if is_sunday else (
            (permanent_completed_count / permanent_total_count * 100.0) if permanent_total_count > 0 else 0.0
        )
        
        total_tasks_done = sum(len(tasks) for tasks in history.values() if isinstance(tasks, list))
        current_level = 1 + (total_tasks_done // 5)
        current_rank_daily = calculate_rank(completion_percentage)
        
        stats = {
            "strength": 10 + int(total_tasks_done * 1.5),
            "vitality": 10 + int(total_tasks_done * 1.2),
            "agility": 10 + int(total_tasks_done * 1.0),
            "recovery": 10 + int(total_tasks_done * 0.8)
        }

        # GENERATE FORMATTED HISTORY LIST
        formatted_history = []
        today_date = ist_now.date()
        range_start = start_date.date()
        current_iter_date = range_start
        
        while current_iter_date <= today_date:
            date_str = current_iter_date.strftime("%Y-%m-%d")
            day_name = current_iter_date.strftime("%A")
            day_num = max(1, (current_iter_date - range_start).days + 1)
            
            if day_name == "Sunday":
                c_percent = 100.0
            elif date_str in history and isinstance(history[date_str], list):
                history_done_indices = history[date_str]
                perm_done_hist = 0
                for h_idx in history_done_indices:
                    if 0 <= h_idx < len(user_tasks) and user_tasks[h_idx].get("task_type", "permanent") == "permanent":
                        perm_done_hist += 1
                c_percent = (perm_done_hist / permanent_total_count * 100.0) if permanent_total_count > 0 else 0.0
            else:
                c_percent = 0.0
                
            formatted_history.append({
                "day_number": day_num,
                "date": date_str,
                "day_of_week": day_name,
                "completion_percentage": c_percent
            })
            current_iter_date += timedelta(days=1)
        
        return {
            "active": True,
            "username": user.get("username", "MONARCH"),
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
            },
            "history": formatted_history
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
            await users_collection.update_one({"user_id": req.user_id}, {"$set": {"active": True}})
        else:
            new_user = {
                "user_id": req.user_id,
                "start_date": ist_now.isoformat(),
                "active": True,
                "history": {},
                "tasks": []
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
        
        await users_collection.update_one(
            {"user_id": req.user_id},
            {"$push": {"tasks": new_task}}
        )
        return {"success": True, "message": "Custom task added to protocol!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/challenge/task/delete")
async def delete_task(req: TaskDeleteReq):
    try:
        user = await users_collection.find_one({"user_id": req.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        tasks = user.get("tasks", [])
        if 0 <= req.task_index < len(tasks):
            tasks.pop(req.task_index)
            await users_collection.update_one({"user_id": req.user_id}, {"$set": {"tasks": tasks}})
            return {"success": True, "message": "Task deleted successfully!"}
        
        raise HTTPException(status_code=400, detail="Invalid task index")
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
        
        history = user.get("history", {})
        if not isinstance(history, dict): history = {}
            
        completed_today = history.get(today_str, [])
        if not isinstance(completed_today, list): completed_today = []
        
        if req.completed and req.task_index not in completed_today:
            completed_today.append(req.task_index)
        elif not req.completed and req.task_index in completed_today:
            completed_today.remove(req.task_index)
            
        history[today_str] = completed_today
        await users_collection.update_one({"user_id": req.user_id}, {"$set": {"history": history}})
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/challenge/history")
async def get_history(user_id: str = "default_user", days: int = 30):
    try:
        user = await users_collection.find_one({"user_id": user_id})
        if not user:
            return {"history": []}
        
        history_dict = user.get("history", {})
        if not isinstance(history_dict, dict): history_dict = {}
            
        user_tasks = user.get("tasks", [])
        
        # Calculate total permanent tasks count
        permanent_total_count = sum(1 for t in user_tasks if t.get("task_type", "permanent") == "permanent")

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
            
            if day_name == "Sunday":
                completion_percentage = 100.0
            elif date_str in history_dict and isinstance(history_dict[date_str], list):
                history_done_indices = history_dict[date_str]
                perm_done_hist = 0
                for h_idx in history_done_indices:
                    if 0 <= h_idx < len(user_tasks) and user_tasks[h_idx].get("task_type", "permanent") == "permanent":
                        perm_done_hist += 1
                completion_percentage = (perm_done_hist / permanent_total_count * 100.0) if permanent_total_count > 0 else 0.0
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