from uuid import UUID

from sqlmodel import Field, SQLModel

# SQLModel requires to define a Model for each scheme. As we want
# to reference to the auth.user table in the public scheme
# we define it here.


# User 模型，对应 auth.users 表，用于认证和外键引用
# 实际用户业务数据存储在 profiles 表中
class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}
    
    id: UUID = Field(primary_key=True)
    # 仅包含认证需要的基本字段，其他数据在 profiles 表中
