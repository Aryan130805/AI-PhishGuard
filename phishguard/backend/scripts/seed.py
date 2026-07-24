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
from app.models.risk import UserMetrics, RiskScore
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
            admin_role = Role(name="admin", description="Organization Administrator Role")
            db.add(admin_role)
            print("Created 'admin' role.")

        employee_role = db.query(Role).filter(Role.name == "employee").first()
        if not employee_role:
            employee_role = Role(name="employee", description="Employee Role")
            db.add(employee_role)
            print("Created 'employee' role.")

        db.commit()
        db.refresh(admin_role)
        db.refresh(employee_role)

        # 2. Define Organizations & Structure
        org_definitions = [
            {
                "name": "Acme Corporation",
                "admin_email": "admin@acme.com",
                "departments": ["Engineering", "Sales", "Marketing"],
                "employees": [
                    ("Alice Smith", "alice.smith@acme.com", "Engineering", 0.95, 0.05),
                    ("Bob Jones", "bob.jones@acme.com", "Engineering", 0.85, 0.10),
                    ("Charlie Brown", "charlie.brown@acme.com", "Sales", 0.78, 0.15),
                    ("Diana Prince", "diana.prince@acme.com", "Marketing", 0.65, 0.25),
                    ("Evan Wright", "evan.wright@acme.com", "Sales", 0.50, 0.40),
                ]
            },
            {
                "name": "Stark Industries",
                "admin_email": "admin@stark.com",
                "departments": ["Engineering", "Management", "Research", "Security"],
                "employees": [
                    ("Tony Stark", "tony.stark@stark.com", "Engineering", 0.99, 0.01),
                    ("Pepper Potts", "pepper.potts@stark.com", "Management", 0.95, 0.03),
                    ("Peter Parker", "peter.parker@stark.com", "Research", 0.88, 0.08),
                    ("James Rhodes", "james.rhodes@stark.com", "Security", 0.82, 0.12),
                    ("Happy Hogan", "happy.hogan@stark.com", "Security", 0.74, 0.18),
                ]
            },
            {
                "name": "Cyberdyne Systems",
                "admin_email": "admin@cyberdyne.com",
                "departments": ["Security", "Engineering", "R&D", "Operations"],
                "employees": [
                    ("Sarah Connor", "sarah.connor@cyberdyne.com", "Security", 0.98, 0.02),
                    ("John Connor", "john.connor@cyberdyne.com", "Engineering", 0.92, 0.05),
                    ("Miles Dyson", "miles.dyson@cyberdyne.com", "R&D", 0.85, 0.10),
                    ("Kyle Reese", "kyle.reese@cyberdyne.com", "Operations", 0.72, 0.20),
                ]
            },
            {
                "name": "Demo Org",
                "admin_email": "admin@demo.com",
                "departments": ["Engineering", "Sales", "Marketing", "R&D"],
                "employees": [
                    ("Fiona Gallagher", "fiona.gallagher@demo.com", "Marketing", 0.90, 0.08),
                    ("George Costanza", "george.costanza@demo.com", "Sales", 0.82, 0.15),
                    ("Hannah Abbott", "hannah.abbott@demo.com", "Sales", 0.75, 0.20),
                    ("Ian Malcolm", "ian.malcolm@demo.com", "R&D", 0.62, 0.30),
                ]
            }
        ]

        for org_def in org_definitions:
            # Create Organization
            org = db.query(Organization).filter(Organization.name == org_def["name"]).first()
            if not org:
                org = Organization(name=org_def["name"])
                db.add(org)
                db.commit()
                db.refresh(org)
                print(f"Created organization: {org.name}")

            # Create Departments
            depts = {}
            for dept_name in org_def["departments"]:
                dept = db.query(Department).filter(
                    Department.name == dept_name,
                    Department.organization_id == org.id
                ).first()
                if not dept:
                    dept = Department(name=dept_name, organization_id=org.id)
                    db.add(dept)
                    db.commit()
                    db.refresh(dept)
                    print(f"  Created department: {dept_name}")
                depts[dept_name] = dept

            # Create Organization Admin Account
            admin_email = org_def["admin_email"]
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
                db.commit()
                print(f"  Created admin user: {admin_email}")

            # Create Employee Accounts & Seed Metrics
            for name, email, dept_name, report_rate, click_rate in org_def["employees"]:
                emp_user = db.query(User).filter(User.email == email).first()
                if not emp_user:
                    emp_user = User(
                        email=email,
                        hashed_password=get_password_hash("employeepassword123"),
                        organization_id=org.id,
                        department_id=depts[dept_name].id,
                        role_id=employee_role.id,
                        is_admin=False,
                        is_active=True
                    )
                    db.add(emp_user)
                    db.commit()
                    db.refresh(emp_user)
                    print(f"  Created employee user: {email} ({dept_name})")

                # Seed User Metrics
                metrics = db.query(UserMetrics).filter(UserMetrics.user_id == emp_user.id).first()
                if not metrics:
                    metrics = UserMetrics(
                        user_id=emp_user.id,
                        report_rate=report_rate,
                        click_rate=click_rate,
                        open_rate=0.85,
                        avg_time_to_click=120.0
                    )
                    db.add(metrics)

                # Seed Initial Risk Score
                score_val = round((report_rate * 0.5 + (1 - click_rate) * 0.5) * 100, 1)
                existing_score = db.query(RiskScore).filter(RiskScore.user_id == emp_user.id).first()
                if not existing_score:
                    risk_row = RiskScore(user_id=emp_user.id, score=score_val)
                    db.add(risk_row)

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
