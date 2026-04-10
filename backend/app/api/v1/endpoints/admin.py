from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.user import User
from app.models.image_job import ImageJob
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_jobs = db.query(func.count(ImageJob.id)).scalar() or 0
    
    recent_users = db.query(User).order_by(User.id.desc()).limit(5).all()
    user_list = [
        {"email": u.email, "id": u.id} for u in recent_users
    ]
    
    # Faol (live) foydalanuvchilar soni sun'iy hisoblandi (chunki socket.io yoki redis hali ulanmagan)
    active_now = 1 if total_users == 0 else max(1, total_users // 2)
    
    return JSONResponse(content={
        "success": True,
        "data": {
            "total_users": total_users,
            "total_jobs": total_jobs,
            "active_now": active_now,
            "recent_users": user_list
        }
    })
