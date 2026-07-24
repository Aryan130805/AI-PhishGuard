import sys
import os
import logging
from sqlalchemy import inspect, text

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine, Base, SessionLocal
from app.config import settings
from app.models.organization import Organization
from app.models.role import Role
from app.models.department import Department
from app.models.user import User
from app.models.learning import Lesson, Quiz
from app.security import get_password_hash

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def verify_and_setup_database():
    logger.info("====================================================================")
    logger.info("Starting PhishGuard Supabase / Database Setup & Verification Tool")
    logger.info(f"Target Database URL: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    logger.info(f"Supabase Project ID: {settings.SUPABASE_PROJECT_ID}")
    logger.info("====================================================================")

    # 1. Create all Tables via SQLAlchemy Metadata
    try:
        logger.info("1. Initializing schema tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ All database tables created / verified successfully!")
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        return False

    db = SessionLocal()
    try:
        # 2. Seed Default Roles
        logger.info("2. Checking system roles...")
        roles_data = [
            {"id": 1, "name": "admin", "description": "Organization Administrator"},
            {"id": 2, "name": "employee", "description": "Standard Employee Target"},
        ]
        for r_data in roles_data:
            existing = db.query(Role).filter(Role.id == r_data["id"]).first()
            if not existing:
                role = Role(**r_data)
                db.add(role)
                logger.info(f"   Created role: {r_data['name']}")
        db.commit()

        # 3. Seed Default Organizations
        logger.info("3. Checking default organizations...")
        default_orgs = [
            {"id": 1, "name": "Demo Org", "industry": "Technology", "company_size": "50-200", "is_verified": True},
            {"id": 2, "name": "Acme Corporation", "industry": "Manufacturing", "company_size": "500-1000", "is_verified": True},
            {"id": 3, "name": "Stark Industries", "industry": "Defense & Tech", "company_size": "1000+", "is_verified": True},
            {"id": 4, "name": "Cyberdyne Systems", "industry": "AI & Robotics", "company_size": "250-500", "is_verified": True},
        ]
        for o_data in default_orgs:
            existing = db.query(Organization).filter(Organization.name == o_data["name"]).first()
            if not existing:
                org = Organization(**o_data)
                db.add(org)
                logger.info(f"   Created organization: {o_data['name']}")
        db.commit()

        # 4. Seed Default Departments
        logger.info("4. Checking default departments...")
        acme_org = db.query(Organization).filter(Organization.name == "Acme Corporation").first()
        if acme_org:
            depts = ["Engineering", "Human Resources", "Finance", "Sales", "Executive"]
            for dept_name in depts:
                existing = db.query(Department).filter(
                    Department.organization_id == acme_org.id,
                    Department.name == dept_name
                ).first()
                if not existing:
                    d = Department(organization_id=acme_org.id, name=dept_name)
                    db.add(d)
            db.commit()

        # 5. Seed Default Admin & Employee Accounts
        logger.info("5. Checking default demo accounts...")
        default_users = [
            {
                "email": "admin@demo.com",
                "hashed_password": get_password_hash("adminpassword123"),
                "first_name": "Admin",
                "last_name": "User",
                "is_admin": True,
                "organization_id": 1,
                "role_id": 1,
            },
            {
                "email": "admin@acme.com",
                "hashed_password": get_password_hash("adminpassword123"),
                "first_name": "Acme",
                "last_name": "Admin",
                "is_admin": True,
                "organization_id": 2,
                "role_id": 1,
            },
            {
                "email": "alice.smith@acme.com",
                "hashed_password": get_password_hash("employeepassword123"),
                "first_name": "Alice",
                "last_name": "Smith",
                "is_admin": False,
                "organization_id": 2,
                "role_id": 2,
            },
        ]
        for u_data in default_users:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                u = User(**u_data)
                db.add(u)
                logger.info(f"   Created user account: {u_data['email']}")
        db.commit()

        # 6. Seed Sample Lessons
        logger.info("6. Checking security awareness lessons...")
        sample_lessons = [
            {
                "id": 1,
                "topic": "Phishing Essentials",
                "title": "Spotting Suspicious Links & Spoofed Senders",
                "content": "Phishing emails often use deceptive domain names (e.g. micr0soft.com instead of microsoft.com). Always hover over links before clicking to inspect the real URL destination.",
                "ai_generated": False
            },
            {
                "id": 2,
                "topic": "Credential Protection",
                "title": "Password Hygiene & 2FA Awareness",
                "content": "Never enter your enterprise credentials on unverified login portals. Look for SSL certificates and official organizational domains.",
                "ai_generated": False
            }
        ]
        for l_data in sample_lessons:
            existing = db.query(Lesson).filter(Lesson.id == l_data["id"]).first()
            if not existing:
                lesson = Lesson(**l_data)
                db.add(lesson)
                logger.info(f"   Created lesson: {l_data['title']}")
        db.commit()

        # 7. Print Table Verification Summary
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        logger.info("====================================================================")
        logger.info(f"🎉 Database Ready! Total Verified Tables in Database: {len(table_names)}")
        for tbl in sorted(table_names):
            logger.info(f"   • public.{tbl}")
        logger.info("====================================================================")
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error during database seeding: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = verify_and_setup_database()
    if not success:
        sys.exit(1)
