from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Timetable Structure
SHADOW_PROTOCOL = {
    "Monday": [
        {"time": "07:30", "task": "Wake up & 1 Glass Water", "duration": 5},
        {"time": "07:30", "task": "Quick Fresh & Meditation", "duration": 15},
        {"time": "07:45", "task": "Shower, Breakfast & Ready", "duration": 45},
        {"time": "09:00", "task": "College", "duration": 495},
        {"time": "17:30", "task": "Gym Warfare", "duration": 105},
        {"time": "19:15", "task": "Shower & Fresh", "duration": 30},
        {"time": "19:45", "task": "Hair Oiling + Immunity Drink", "duration": 30},
        {"time": "20:15", "task": "Dinner", "duration": 30},
        {"time": "21:00", "task": "Trading", "duration": 60},
        {"time": "22:00", "task": "Aptitude Study", "duration": 60},
        {"time": "23:00", "task": "Coding", "duration": 120},
        {"time": "01:00", "task": "Content Creation", "duration": 60},
        {"time": "02:00", "task": "Brush & Sleep Prep", "duration": 10}
    ],
    "Tuesday": [
        {"time": "07:30", "task": "Wake up & 1 Glass Water", "duration": 5},
        {"time": "07:30", "task": "Quick Fresh & Meditation", "duration": 15},
        {"time": "07:45", "task": "Shower, Breakfast & Ready", "duration": 45},
        {"time": "09:00", "task": "College", "duration": 495},
        {"time": "17:30", "task": "Gym Warfare", "duration": 105},
        {"time": "19:15", "task": "Shower & Fresh", "duration": 30},
        {"time": "19:45", "task": "Hair Oiling + Immunity Drink", "duration": 30},
        {"time": "20:15", "task": "Dinner", "duration": 30},
        {"time": "21:00", "task": "Trading", "duration": 60},
        {"time": "22:00", "task": "Aptitude Study", "duration": 60},
        {"time": "23:00", "task": "Coding", "duration": 120},
        {"time": "01:00", "task": "Content Creation", "duration": 60},
        {"time": "02:00", "task": "Brush & Sleep Prep", "duration": 10}
    ],
    "Wednesday": [
        {"time": "07:30", "task": "Wake up & 1 Glass Water", "duration": 5},
        {"time": "07:30", "task": "Quick Fresh & Meditation", "duration": 15},
        {"time": "07:45", "task": "Shower, Breakfast & Ready", "duration": 45},
        {"time": "09:00", "task": "College", "duration": 495},
        {"time": "17:30", "task": "Gym Warfare", "duration": 105},
        {"time": "19:15", "task": "Shower & Fresh", "duration": 30},
        {"time": "19:45", "task": "Hair Oiling + Immunity Drink", "duration": 30},
        {"time": "20:15", "task": "Dinner", "duration": 30},
        {"time": "21:00", "task": "Trading", "duration": 60},
        {"time": "22:00", "task": "Aptitude Study", "duration": 60},
        {"time": "23:00", "task": "Coding", "duration": 120},
        {"time": "01:00", "task": "Content Creation", "duration": 60},
        {"time": "02:00", "task": "Brush & Sleep Prep", "duration": 10}
    ],
    "Thursday": [
        {"time": "07:30", "task": "Wake up & 1 Glass Water", "duration": 5},
        {"time": "07:30", "task": "Quick Fresh & Meditation", "duration": 15},
        {"time": "07:45", "task": "Shower, Breakfast & Ready", "duration": 45},
        {"time": "09:00", "task": "College", "duration": 495},
        {"time": "17:30", "task": "Gym Warfare", "duration": 105},
        {"time": "19:15", "task": "Shower & Fresh", "duration": 30},
        {"time": "19:45", "task": "Hair Oiling + Immunity Drink", "duration": 30},
        {"time": "20:15", "task": "Dinner", "duration": 30},
        {"time": "21:00", "task": "Trading", "duration": 60},
        {"time": "22:00", "task": "Aptitude Study", "duration": 60},
        {"time": "23:00", "task": "Coding", "duration": 120},
        {"time": "01:00", "task": "Content Creation", "duration": 60},
        {"time": "02:00", "task": "Brush & Sleep Prep", "duration": 10}
    ],
    "Friday": [
        {"time": "07:30", "task": "Wake up & 1 Glass Water", "duration": 5},
        {"time": "07:30", "task": "Quick Fresh & Meditation", "duration": 15},
        {"time": "07:45", "task": "Shower, Breakfast & Ready", "duration": 45},
        {"time": "09:00", "task": "College", "duration": 495},
        {"time": "17:30", "task": "Gym Warfare", "duration": 105},
        {"time": "19:15", "task": "Shower & Fresh", "duration": 30},
        {"time": "19:45", "task": "Hair Oiling + Immunity Drink", "duration": 30},
        {"time": "20:15", "task": "Dinner", "duration": 30},
        {"time": "21:00", "task": "Trading", "duration": 60},
        {"time": "22:00", "task": "Aptitude Study", "duration": 60},
        {"time": "23:00", "task": "Coding", "duration": 120},
        {"time": "01:00", "task": "Content Creation", "duration": 60},
        {"time": "02:00", "task": "Brush & Sleep Prep", "duration": 10}
    ],
    "Saturday": [
        {"time": "07:30", "task": "Wake up & 1 Glass Water", "duration": 5},
        {"time": "07:30", "task": "Quick Fresh & Meditation", "duration": 15},
        {"time": "07:45", "task": "Shower, Breakfast & Ready", "duration": 45},
        {"time": "09:00", "task": "College", "duration": 495},
        {"time": "17:30", "task": "Gym Warfare", "duration": 105},
        {"time": "19:15", "task": "Shower & Fresh", "duration": 30},
        {"time": "19:45", "task": "Hair Oiling + Immunity Drink", "duration": 30},
        {"time": "20:15", "task": "Dinner", "duration": 30},
        {"time": "21:00", "task": "Trading", "duration": 60},
        {"time": "22:00", "task": "Aptitude Study", "duration": 60},
        {"time": "23:00", "task": "Coding", "duration": 120},
        {"time": "01:00", "task": "Content Creation", "duration": 60},
        {"time": "02:00", "task": "Brush & Sleep Prep", "duration": 10}
    ],
    "Sunday": [{"time": "00:00", "task": "Rest Day", "duration": 1440}]
}

# Models
class Task(BaseModel):
    time: str
    task: str
    duration: int
    completed: bool = False
    completed_at: Optional[datetime] = None

class DailyProgress(BaseModel):
    day_number: int
    date: datetime
    day_of_week: str
    tasks: List[Task]
    completion_percentage: float = 0.0
    is_sunday: bool = False

class Challenge(BaseModel):
    user_id: str = "default_user"
    start_date: datetime
    current_day: int = 1
    current_rank: str = "E"
    current_level: int = 1
    stats: Dict[str, int] = {"strength": 0, "vitality": 0, "agility": 0, "recovery": 0}
    is_active: bool = True

class StartChallengeRequest(BaseModel):
    user_id: str = "default_user"

class MarkTaskRequest(BaseModel):
    day_number: int
    task_index: int
    completed: bool

# Helper functions
def calculate_rank(avg_percentage: float) -> str:
    if avg_percentage >= 97:
        return "National"
    elif avg_percentage >= 93:
        return "S"
    elif avg_percentage >= 85:
        return "A"
    elif avg_percentage >= 75:
        return "B"
    elif avg_percentage >= 65:
        return "C"
    elif avg_percentage >= 50:
        return "D"
    elif avg_percentage >= 30:
        return "E"
    else:
        return "E"

def calculate_stats(completion_percentage: float) -> Dict[str, int]:
    base = int(completion_percentage)
    return {
        "strength": min(100, base + 5),
        "vitality": min(100, base),
        "agility": min(100, base - 5 if base > 5 else base),
        "recovery": min(100, base + 2)
    }

def get_day_of_week_name(date: datetime) -> str:
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return days[date.weekday()]

# API Routes
@api_router.get("/")
async def root():
    return {"message": "ARISE - Shadow Protocol API"}

@api_router.post("/challenge/start")
async def start_challenge(request: StartChallengeRequest):
    # Check if user already has an active challenge
    existing = await db.challenges.find_one({"user_id": request.user_id, "is_active": True})
    if existing:
        return {"error": "Challenge already active", "challenge_id": str(existing["_id"])}
    
    # Create new challenge
    start_date = datetime.utcnow()
    challenge = Challenge(
        user_id=request.user_id,
        start_date=start_date,
        current_day=1,
        current_rank="E",
        current_level=1,
        stats={"strength": 0, "vitality": 0, "agility": 0, "recovery": 0},
        is_active=True
    )
    
    result = await db.challenges.insert_one(challenge.dict())
    challenge_id = str(result.inserted_id)
    
    # Initialize first day
    day_of_week = get_day_of_week_name(start_date)
    tasks = [Task(**task_data) for task_data in SHADOW_PROTOCOL[day_of_week]]
    
    daily_progress = DailyProgress(
        day_number=1,
        date=start_date,
        day_of_week=day_of_week,
        tasks=tasks,
        completion_percentage=100.0 if day_of_week == "Sunday" else 0.0,
        is_sunday=(day_of_week == "Sunday")
    )
    
    progress_dict = daily_progress.dict()
    progress_dict["challenge_id"] = challenge_id
    await db.daily_progress.insert_one(progress_dict)
    
    return {
        "success": True,
        "challenge_id": challenge_id,
        "start_date": start_date.isoformat(),
        "message": "Challenge started! 180 days journey begins now."
    }

@api_router.get("/challenge/current")
async def get_current_challenge(user_id: str = "default_user"):
    challenge = await db.challenges.find_one({"user_id": user_id, "is_active": True})
    if not challenge:
        return {"active": False}
    
    challenge["_id"] = str(challenge["_id"])
    
    # Get today's progress
    current_date = datetime.utcnow()
    days_passed = (current_date - challenge["start_date"]).days + 1
    
    if days_passed > 180:
        # Challenge completed
        await db.challenges.update_one(
            {"_id": ObjectId(challenge["_id"])},
            {"$set": {"is_active": False}}
        )
        return {"active": False, "completed": True, "message": "Challenge completed!"}
    
    # Update current day if needed
    if days_passed != challenge["current_day"]:
        challenge["current_day"] = days_passed
        await db.challenges.update_one(
            {"_id": ObjectId(challenge["_id"])},
            {"$set": {"current_day": days_passed}}
        )
    
    # Get or create today's progress
    today_progress = await db.daily_progress.find_one({
        "challenge_id": challenge["_id"],
        "day_number": days_passed
    })
    
    if not today_progress:
        # Create today's progress
        progress_date = challenge["start_date"] + timedelta(days=days_passed - 1)
        day_of_week = get_day_of_week_name(progress_date)
        tasks = [Task(**task_data) for task_data in SHADOW_PROTOCOL[day_of_week]]
        
        daily_progress = DailyProgress(
            day_number=days_passed,
            date=progress_date,
            day_of_week=day_of_week,
            tasks=tasks,
            completion_percentage=100.0 if day_of_week == "Sunday" else 0.0,
            is_sunday=(day_of_week == "Sunday")
        )
        
        progress_dict = daily_progress.dict()
        progress_dict["challenge_id"] = challenge["_id"]
        await db.daily_progress.insert_one(progress_dict)
        today_progress = progress_dict
    
    today_progress["_id"] = str(today_progress["_id"])
    
    # Calculate weekly rank
    week_number = (days_passed - 1) // 7 + 1
    week_start = (week_number - 1) * 7 + 1
    week_end = min(week_number * 7, days_passed)
    
    week_progress = await db.daily_progress.find({
        "challenge_id": challenge["_id"],
        "day_number": {"$gte": week_start, "$lte": week_end}
    }).to_list(7)
    
    if week_progress:
        avg_completion = sum([p["completion_percentage"] for p in week_progress]) / len(week_progress)
        new_rank = calculate_rank(avg_completion)
        
        if new_rank != challenge["current_rank"]:
            await db.challenges.update_one(
                {"_id": ObjectId(challenge["_id"])},
                {"$set": {"current_rank": new_rank}}
            )
            challenge["current_rank"] = new_rank
    
    # Calculate stats based on overall completion
    all_progress = await db.daily_progress.find({
        "challenge_id": challenge["_id"]
    }).to_list(180)
    
    if all_progress:
        overall_avg = sum([p["completion_percentage"] for p in all_progress]) / len(all_progress)
        new_stats = calculate_stats(overall_avg)
        await db.challenges.update_one(
            {"_id": ObjectId(challenge["_id"])},
            {"$set": {"stats": new_stats}}
        )
        challenge["stats"] = new_stats
    
    return {
        "active": True,
        "challenge": challenge,
        "today": today_progress,
        "days_passed": days_passed
    }

@api_router.post("/challenge/mark-task")
async def mark_task(request: MarkTaskRequest, user_id: str = "default_user"):
    challenge = await db.challenges.find_one({"user_id": user_id, "is_active": True})
    if not challenge:
        raise HTTPException(status_code=404, detail="No active challenge found")
    
    challenge_id = str(challenge["_id"])
    
    # Get day progress
    day_progress = await db.daily_progress.find_one({
        "challenge_id": challenge_id,
        "day_number": request.day_number
    })
    
    if not day_progress:
        raise HTTPException(status_code=404, detail="Day progress not found")
    
    # Update task
    tasks = day_progress["tasks"]
    if request.task_index >= len(tasks):
        raise HTTPException(status_code=400, detail="Invalid task index")
    
    tasks[request.task_index]["completed"] = request.completed
    tasks[request.task_index]["completed_at"] = datetime.utcnow().isoformat() if request.completed else None
    
    # Calculate completion percentage
    if day_progress["is_sunday"]:
        completion = 100.0
    else:
        completed_count = sum([1 for t in tasks if t["completed"]])
        total_count = len(tasks)
        completion = (completed_count / total_count) * 100 if total_count > 0 else 0
    
    # Update database
    await db.daily_progress.update_one(
        {"_id": day_progress["_id"]},
        {"$set": {"tasks": tasks, "completion_percentage": completion}}
    )
    
    return {
        "success": True,
        "completion_percentage": completion,
        "completed_tasks": sum([1 for t in tasks if t["completed"]]),
        "total_tasks": len(tasks)
    }

@api_router.get("/challenge/history")
async def get_challenge_history(user_id: str = "default_user", days: int = 7):
    challenge = await db.challenges.find_one({"user_id": user_id, "is_active": True})
    if not challenge:
        return {"error": "No active challenge found"}
    
    challenge_id = str(challenge["_id"])
    
    history = await db.daily_progress.find({
        "challenge_id": challenge_id
    }).sort("day_number", -1).limit(days).to_list(days)
    
    for item in history:
        item["_id"] = str(item["_id"])
    
    return {"history": history}

@api_router.get("/timetable/{day}")
async def get_timetable(day: str):
    if day not in SHADOW_PROTOCOL:
        raise HTTPException(status_code=400, detail="Invalid day")
    return {"day": day, "tasks": SHADOW_PROTOCOL[day]}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
