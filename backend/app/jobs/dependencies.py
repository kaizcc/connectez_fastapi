"""
Jobs module dependencies.
"""

# Import auth dependencies for now, since jobs module uses the same DB session and user auth
from ..auth.dependencies import DBSessionDependency, UserDependency

# Re-export for convenience
__all__ = ["DBSessionDependency", "UserDependency"]
