from fastapi import HTTPException
from pydantic import BaseModel
from sqlmodel import Session, SQLModel

######################################################
# Generic CRUD operations
######################################################


def update_db_element(
    db: Session, original_element: SQLModel, element_update: BaseModel
) -> BaseModel:
    """Updates an element in database.
    Note that it doesn't take care of user ownership.
    """
    update_data = element_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(original_element, key, value)

    db.add(original_element)
    db.commit()
    db.refresh(original_element)

    return original_element


def delete_db_element(db: Session, element: SQLModel):
    """Deletes an element from database."""
    db.delete(element)
    db.commit()


######################################################
# 在这里添加你的业务相关 CRUD 操作
# 例如：jobs, resumes, profiles 等
######################################################

# 示例：
# def get_job_by_id(db: Session, job_id: UUID, user_id: UUID) -> Jobs:
#     """Returns a job by id and user id.""" 
#     return db.exec(select(Jobs).where(Jobs.id == job_id, Jobs.user_id == user_id)).first()
