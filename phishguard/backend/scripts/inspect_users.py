import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()
users = db.query(User).all()
print(f"Total Users: {len(users)}")
for u in users:
    print(f"ID: {u.id} | Email: {u.email} | is_admin: {u.is_admin} | Role: {u.role.name if u.role else None} | OrgID: {u.organization_id}")
db.close()
