"""
Auth business logic service layer.
This module contains the core business logic for authentication operations.
"""
import logging
from typing import Dict, Any

from fastapi import HTTPException
from sqlmodel import Session, select
from supabase import Client

from .models import User
from .schemas import UserSign

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service for handling auth business logic."""
    
    @staticmethod
    def create_user(
        user_data: UserSign, 
        supabase: Client, 
        db: Session
    ) -> Dict[str, Any]:
        """
        Create a new user account.
        
        Args:
            user_data: User registration data
            supabase: Supabase client
            db: Database session
            
        Returns:
            Dict containing user creation result
            
        Raises:
            HTTPException: If registration fails
        """
        try:
            auth_response = supabase.auth.sign_up(
                {"email": user_data.email, "password": user_data.password}
            )
        except Exception as e:
            logger.error("Error during signup %s", e)
            raise HTTPException(status_code=400, detail="注册失败，请检查邮箱和密码")

        # Create an User in our database
        db_user = User(id=auth_response.user.id)
        logger.warning("Mail verification is not checked !")
        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        except Exception as e:
            logger.error("Error during user creation %s", e)
            raise HTTPException(status_code=400, detail="用户创建失败")

        return {
            "message": "注册成功，请检查邮箱进行验证",
            "user": {
                "id": str(db_user.id),
                "email": user_data.email
            }
        }
    
    @staticmethod
    def authenticate_user(
        user_data: UserSign, 
        supabase: Client, 
        db: Session
    ) -> Dict[str, Any]:
        """
        Authenticate user with email and password.
        
        Args:
            user_data: User login data
            supabase: Supabase client
            db: Database session
            
        Returns:
            Dict containing authentication result and user info
            
        Raises:
            HTTPException: If authentication fails
        """
        logger.info("🔐 尝试登录用户: %s", user_data.email)
        
        try:
            auth_response = supabase.auth.sign_in_with_password(
                {"email": user_data.email, "password": user_data.password}
            )
            logger.info("✅ Supabase认证成功: %s", user_data.email)
        except Exception as e:
            logger.error("❌ Supabase认证失败 - 用户: %s, 错误: %s", user_data.email, e)
            raise HTTPException(status_code=400, detail="登录失败，请检查邮箱和密码")

        if not auth_response.session:
            logger.error("❌ 认证响应中没有session - 用户: %s", user_data.email)
            raise HTTPException(status_code=400, detail="登录失败")

        # 获取用户信息
        user_id = auth_response.user.id
        logger.info("🔍 查找数据库用户 ID: %s", user_id)
        
        db_user = db.exec(select(User).where(User.id == user_id)).first()
        
        if not db_user:
            logger.error("❌ 数据库中未找到用户 ID: %s", user_id)
            raise HTTPException(status_code=404, detail="用户不存在")

        logger.info("✅ 登录成功 - 用户: %s, ID: %s", user_data.email, user_id)
        
        return {
            "access_token": auth_response.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": str(db_user.id),
                "email": auth_response.user.email,
                "created_at": auth_response.user.created_at,
                "updated_at": auth_response.user.updated_at
            }
        }
    
    @staticmethod
    def logout_user(supabase: Client) -> Dict[str, str]:
        """
        Logout user from Supabase.
        
        Args:
            supabase: Supabase client
            
        Returns:
            Dict containing logout result message
        """
        try:
            # 调用Supabase登出（虽然在这个架构中可能不是必需的）
            supabase.auth.sign_out()
        except Exception as e:
            logger.warning("Supabase logout error (可忽略): %s", e)
        
        return {"message": "登出成功"}
