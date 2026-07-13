import sys
import os

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.organization import Organization
from app.models.department import Department
from app.models.role import Role
from app.models.user import User
from app.security import get_password_hash

def seed_db():
    print(f"Seeding database at: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # 1. Ensure Roles exist
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            admin_role = Role(name="admin", description="Administrator Role")
            db.add(admin_role)
            print("Created 'admin' role.")

        employee_role = db.query(Role).filter(Role.name == "employee").first()
        if not employee_role:
            employee_role = Role(name="employee", description="Employee/Candidate Role")
            db.add(employee_role)
            print("Created 'employee' role.")

        db.commit()
        db.refresh(admin_role)
        db.refresh(employee_role)

        # 2. Create Demo Organization
        org = db.query(Organization).filter(Organization.name == "Demo Org").first()
        if not org:
            org = Organization(name="Demo Org")
            db.add(org)
            db.commit()
            db.refresh(org)
            print(f"Created organization: {org.name}")
        else:
            print(f"Organization '{org.name}' already exists.")

        # 3. Create 3 Departments
        dept_names = ["Engineering", "Sales", "Marketing"]
        depts = {}
        for name in dept_names:
            dept = db.query(Department).filter(
                Department.name == name,
                Department.organization_id == org.id
            ).first()
            if not dept:
                dept = Department(name=name, organization_id=org.id)
                db.add(dept)
                print(f"Created department: {name}")
            depts[name] = dept
        db.commit()
        for name in dept_names:
            db.refresh(depts[name])

        # 4. Create Admin User
        admin_email = "admin@demo.com"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash("adminpassword123"),
                organization_id=org.id,
                role_id=admin_role.id,
                is_admin=True,
                is_active=True
            )
            db.add(admin_user)
            print(f"Created admin user: {admin_email}")
        else:
            print(f"Admin user '{admin_email}' already exists.")

        # 5. Create 10 Employee Users with realistic names/emails
        employees = [
            ("Alice Smith", "alice.smith@demo.com", "Engineering"),
            ("Bob Jones", "bob.jones@demo.com", "Engineering"),
            ("Charlie Brown", "charlie.brown@demo.com", "Engineering"),
            ("Diana Prince", "diana.prince@demo.com", "Marketing"),
            ("Evan Wright", "evan.wright@demo.com", "Marketing"),
            ("Fiona Gallagher", "fiona.gallagher@demo.com", "Marketing"),
            ("George Costanza", "george.costanza@demo.com", "Sales"),
            ("Hannah Abbott", "hannah.abbott@demo.com", "Sales"),
            ("Ian Malcolm", "ian.malcolm@demo.com", "Sales"),
            ("Julia Roberts", "julia.roberts@demo.com", "Sales"),
        ]

        for name, email, dept_name in employees:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    hashed_password=get_password_hash("employeepassword123"),
                    organization_id=org.id,
                    department_id=depts[dept_name].id,
                    role_id=employee_role.id,
                    is_admin=False,
                    is_active=True
                )
                db.add(user)
                print(f"Created employee user: {email} (Dept: {dept_name})")
            else:
                print(f"Employee user '{email}' already exists.")

        db.commit()
        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
