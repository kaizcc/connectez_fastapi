import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm


from .dependencies import DBSessionDependency, SupabaseDependency, UserDependency
from .schemas import UserSign
from .service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/token")
async def login_for_swagger(
    supabase: SupabaseDependency, form_data: OAuth2PasswordRequestForm = Depends()
):
    """Swagger specific route to get the JWT token. To be used with
    the "Authorize" button in the Swagger UI."""
    if os.environ.get("DEV_ENV") != "dev":
        raise HTTPException(
            status_code=404, detail="This route is only available in dev."
        )
    try:
        # Use Supabase to authenticate the user
        response = supabase.auth.sign_in_with_password(
            {"email": form_data.username, "password": form_data.password}
        )
        # Return the JWT token
        return {"access_token": response.session.access_token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/register", tags=["auth"])
def register(user: UserSign, supabase: SupabaseDependency, db: DBSessionDependency):
    """用户注册"""
    return AuthService.create_user(user, supabase, db)


@router.post("/login", tags=["auth"])
def login(user: UserSign, supabase: SupabaseDependency, db: DBSessionDependency):
    """用户登录"""
    return AuthService.authenticate_user(user, supabase, db)


@router.get("/me", tags=["auth"])
def get_current_user_info(current_user: UserDependency):
    """获取当前用户信息"""
    return {
        "id": str(current_user.id),
        "email": getattr(current_user, 'email', None),
        "created_at": getattr(current_user, 'created_at', None),
        "updated_at": getattr(current_user, 'updated_at', None)
    }


@router.post("/logout", tags=["auth"])
def logout(supabase: SupabaseDependency, current_user: UserDependency):
    """用户登出"""
    return AuthService.logout_user(supabase)
