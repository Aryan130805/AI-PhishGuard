"""Standalone seed script - runs ensure_seeded_lessons() and ensure_user_assignments() for all users."""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.routers.training import ensure_seeded_lessons, ensure_user_assignments
from app.models.user import User

db = SessionLocal()

try:
    print("Seeding default lessons...")
    ensure_seeded_lessons(db)
    
    from app.models.learning import Lesson
    lessons = db.query(Lesson).all()
    print(f"Total lessons in DB: {len(lessons)}")
    for l in lessons:
        print(f"  [{l.id}] {l.title[:50]} | {getattr(l, 'category', 'N/A')} | {getattr(l, 'difficulty', 'N/A')}")
    
    print("\nAssigning lessons to all users...")
    users = db.query(User).all()
    for u in users:
        ensure_user_assignments(u.id, db)
    print(f"Done. Assigned lessons to {len(users)} users.")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
