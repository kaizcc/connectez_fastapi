"""
Task module dependencies.
"""
from ..auth.dependencies import DBSessionDependency, UserDependency

# Re-export common dependencies for task module
__all__ = ['DBSessionDependency', 'UserDependency']
