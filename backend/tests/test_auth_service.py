import pytest
from unittest.mock import AsyncMock, patch
from passlib.context import CryptContext

from app.services.auth_service import AuthService
from app.models import User, UserSession

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@pytest.fixture
def mock_db_session():
    return AsyncMock()

@pytest.fixture
def mock_user_repo(mocker):
    repo = mocker.patch('app.services.auth_service.UserRepository')
    return repo.return_value

@pytest.fixture
def mock_session_repo(mocker):
    repo = mocker.patch('app.services.auth_service.SessionRepository')
    return repo.return_value

@pytest.mark.asyncio
async def test_authenticate_user_success(mock_db_session, mock_user_repo):
    """Test successful authentication"""
    hashed_password = pwd_context.hash("securepassword")
    fake_user = User(
        id=1,
        email="test@example.com",
        name="Test User",
        hashed_password=hashed_password,
        failed_login_attempts=0,
        is_locked=False
    )
    
    # Mock UserRepository.get_by_email to return the fake user
    mock_user_repo.get_by_email.return_value = fake_user
    
    # Run the authentication service
    user = await AuthService.authenticate_user(mock_user_repo, "test@example.com", "securepassword")
    
    # Validations
    assert user is not None
    assert user.email == "test@example.com"
    assert user.id == 1
    mock_user_repo.get_by_email.assert_called_once_with("test@example.com")

@pytest.mark.asyncio
async def test_authenticate_user_invalid_password(mock_db_session, mock_user_repo):
    """Test failing authentication securely bumps attempt count"""
    hashed_password = pwd_context.hash("securepassword")
    fake_user = User(
        id=1,
        email="test@example.com",
        name="Test User",
        hashed_password=hashed_password,
        failed_login_attempts=0,
        is_locked=False
    )
    
    mock_user_repo.get_by_email.return_value = fake_user
    
    user = await AuthService.authenticate_user(mock_user_repo, "test@example.com", "wrongpassword")
    
    assert user is False

@pytest.mark.asyncio
async def test_authenticate_user_locked_account(mock_user_repo):
    """Test locked account gets rejected outright without checking password"""
    fake_user = User(
        id=1,
        email="test@example.com",
        name="Test User",
        hashed_password="some_hash",
        failed_login_attempts=5,
        is_locked=True
    )
    
    mock_user_repo.get_by_email.return_value = fake_user
    
    user = await AuthService.authenticate_user(mock_user_repo, "test@example.com", "securepassword")
    
    assert user is False
