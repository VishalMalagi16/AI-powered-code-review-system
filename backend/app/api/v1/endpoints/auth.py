from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.db.session import get_db
from app.models import User
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserUpdate,
    UserPasswordChange
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account with hashed password and initial preferences."""
    existing_user = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user = User(
        email=user_in.email.lower().strip(),
        name=user_in.name.strip(),
        password_hash=hash_password(user_in.password),
        role="developer",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password, returning a signed JWT."""
    user = db.query(User).filter(User.email == login_in.email.lower().strip()).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated."
        )

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve currently authenticated user's profile and preferences."""
    return UserResponse.model_validate(current_user)

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update profile details and editor/theme preferences."""
    if user_update.name is not None:
        current_user.name = user_update.name.strip()
    if user_update.preferences is not None:
        prefs = dict(current_user.preferences or {})
        prefs.update(user_update.preferences)
        current_user.preferences = prefs

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.post("/change-password")
def change_password(
    pwd_in: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change the user password after verifying current password."""
    if not verify_password(pwd_in.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password does not match.")
    
    current_user.password_hash = hash_password(pwd_in.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password updated successfully."}

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Acknowledge client-side session termination."""
    return {"message": "Successfully logged out."}

@router.delete("/account")
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permanently delete user account and associated review data."""
    db.delete(current_user)
    db.commit()
    return {"message": "Account and all associated reviews permanently deleted."}
