import React from 'react';
import { Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_API_URL;

const Navbar = ({ user, onLogout, activePage }) => {
    const avatarSrc = (u) => {
    if (!u.avatar_url) return `https://ui-avatars.com/api/?name=${u.name}`;
    return u.avatar_url.startsWith("http") 
      ? u.avatar_url 
      : `${BACKEND_URL}${u.avatar_url}`; 
  };
//   console.log(avatarSrc(user));

    return (
        <nav className="navbar">
            <div className="nav-left">
                <h3 className="brand">Portal</h3>

                <div className="nav-links">
                    <Link to="/dashboard" className={activePage === 'dashboard' ? 'active-link' : ''}>
                        Employees
                    </Link>
                    {user.role === 'admin' && (
                        <>
                        <Link to="/users" className={activePage === 'users' ? 'active-link' : ''}>
                            Users
                        </Link>
                        <Link to="/admin/security" className={activePage === 'security' ? 'active-link' : ''}>
                                Security
                            </Link>
                            </>
                    )}
                </div>
            </div>

            <div className="nav-right">
                <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-role">{user.role}</span>
                </div>

                <img src={avatarSrc(user)} className="nav-avatar" alt="profile" />

                <button onClick={onLogout} className="btn-logout">
                    Logout
                </button>
            </div>
        </nav>
    );
};
export default Navbar;