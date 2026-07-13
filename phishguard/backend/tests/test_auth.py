import pytest
import time
from datetime import datetime, timedelta, timezone
from app.security import create_access_token
from app.models.user import User
from app.models.role import Role

def test_register_success(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "admin@example.com",
            "password": "strongpassword123",
            "organization_name": "Acme Corp"
        }
    )
    assert response.status_code == 201
    assert response.json()["message"] == "Registration successful"
    assert "user_id" in response.json()

def test_register_duplicate_email(client):
    # Register first
    client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password123",
            "organization_name": "Org A"
        }
    )
    # Register second with same email
    response = client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password456",
            "organization_name": "Org B"
        }
    )
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_login_success(client):
    # Register user
    client.post(
        "/auth/register",
        json={
            "email": "login@example.com",
            "password": "mypassword",
            "organization_name": "Org"
        }
    )
    # Login
    response = client.post(
        "/auth/login",
        json={
            "email": "login@example.com",
            "password": "mypassword"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password(client):
    # Register user
    client.post(
        "/auth/register",
        json={
            "email": "wrongpass@example.com",
            "password": "correctpassword",
            "organization_name": "Org"
        }
    )
    # Login with incorrect password
    response = client.post(
        "/auth/login",
        json={
            "email": "wrongpass@example.com",
            "password": "incorrectpassword"
        }
    )
    assert response.status_code == 400
    assert "Incorrect email or password" in response.json()["detail"]

def test_refresh_token_success(client):
    # Register & login to get refresh token
    client.post(
        "/auth/register",
        json={
            "email": "refresh@example.com",
            "password": "mypassword",
            "organization_name": "Org"
        }
    )
    login_res = client.post(
        "/auth/login",
        json={
            "email": "refresh@example.com",
            "password": "mypassword"
        }
    )
    refresh_token = login_res.json()["refresh_token"]

    # Exchange refresh token
    response = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_refresh_token_expired_or_invalid(client):
    response = client.post(
        "/auth/refresh",
        json={"refresh_token": "invalid_token_signature_values"}
    )
    assert response.status_code == 401
    assert "Invalid refresh token" in response.json()["detail"]

def test_get_profile_success(client):
    # Register & Login
    client.post(
        "/auth/register",
        json={
            "email": "profile@example.com",
            "password": "profilepassword",
            "organization_name": "Acme Inc"
        }
    )
    login_res = client.post(
        "/auth/login",
        json={
            "email": "profile@example.com",
            "password": "profilepassword"
        }
    )
    access_token = login_res.json()["access_token"]

    # Get profile
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    profile = response.json()
    assert profile["email"] == "profile@example.com"
    assert profile["organization_name"] == "Acme Inc"
    assert profile["role_name"] == "admin"

def test_get_profile_expired_or_invalid_jwt(client):
    # Expired token (simulate by manually creating an expired token)
    expired_token = create_access_token(subject="1", expires_delta=timedelta(seconds=-10))
    
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]

def test_update_profile_success(client):
    # Register & Login
    client.post(
        "/auth/register",
        json={
            "email": "update@example.com",
            "password": "oldpassword",
            "organization_name": "Acme Inc"
        }
    )
    login_res = client.post(
        "/auth/login",
        json={
            "email": "update@example.com",
            "password": "oldpassword"
        }
    )
    access_token = login_res.json()["access_token"]

    # Update email
    response = client.put(
        "/users/me",
        json={"email": "updated@example.com"},
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "updated@example.com"

    # Login with new email should work if we login with correct old password
    login_new = client.post(
        "/auth/login",
        json={
            "email": "updated@example.com",
            "password": "oldpassword"
        }
    )
    assert login_new.status_code == 200

def test_admin_ping_access_control(client, db_session):
    # Register admin user
    client.post(
        "/auth/register",
        json={
            "email": "test-admin@example.com",
            "password": "adminpassword",
            "organization_name": "Acme Inc"
        }
    )
    
    # Login admin
    login_admin = client.post(
        "/auth/login",
        json={
            "email": "test-admin@example.com",
            "password": "adminpassword"
        }
    )
    admin_access_token = login_admin.json()["access_token"]

    # Check ping as admin
    response_admin = client.get(
        "/admin/ping",
        headers={"Authorization": f"Bearer {admin_access_token}"}
    )
    assert response_admin.status_code == 200
    assert response_admin.json() == {"ping": "pong"}

    # Create an employee user
    # Note: We can create another user, and manually set their role to 'employee'
    client.post(
        "/auth/register",
        json={
            "email": "test-employee@example.com",
            "password": "employeepassword",
            "organization_name": "Acme Inc"
        }
    )
    
    # Update role of test-employee to 'employee'
    employee_role = db_session.query(Role).filter(Role.name == "employee").first()
    employee_user = db_session.query(User).filter(User.email == "test-employee@example.com").first()
    employee_user.role_id = employee_role.id
    db_session.commit()

    # Login as employee
    login_employee = client.post(
        "/auth/login",
        json={
            "email": "test-employee@example.com",
            "password": "employeepassword"
        }
    )
    employee_access_token = login_employee.json()["access_token"]

    # Try to ping as employee -> should get 403 Forbidden
    response_employee = client.get(
        "/admin/ping",
        headers={"Authorization": f"Bearer {employee_access_token}"}
    )
    assert response_employee.status_code == 403
    assert "Forbidden" in response_employee.json()["detail"]
