import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllUsers, updateUserRole } from "../redux/usersListSlice";
import { logout } from "../redux/authSlice"; 
import Navbar from "../components/Navbar";

const BACKEND_URL = process.env.REACT_APP_API_URL;

const Users = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { list, loading } = useSelector((state) => state.usersList);

  useEffect(() => {
    if (user?.role === "admin") {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, user]);

  const handleRoleChange = (id, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const action = newRole === "admin" ? "Promote" : "Demote";
    
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      dispatch(updateUserRole({ id, newRole }))
        .unwrap()
        .then(() => {
        })
        .catch((err) => {
            alert(`Error: ${err}`); 
        });
    }
  };

  const getAvatarUrl = (u) => {
    if (!u.avatar_url) return `https://ui-avatars.com/api/?name=${u.name}`;
    return u.avatar_url.startsWith("http") 
      ? u.avatar_url 
      : `${BACKEND_URL}${u.avatar_url}`;
  };

  return (
    <div className="dashboard-container">
      <Navbar user={user} onLogout={() => dispatch(logout())} activePage="users" />

      <div className="glass-card">
        <h2>System Users</h2>
        <table className="emp-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Avatar</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th style={{textAlign: "center"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign:"center", padding:"30px"}}>Loading users...</td></tr>
            ) : list.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td>
                  <img 
                    src={getAvatarUrl(u)} 
                    alt="avatar" 
                    className="nav-avatar"
                    style={{ width: "35px", height: "35px", borderRadius: "50%", objectFit: "cover" }}
                  />
                </td>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                    {u.role ? u.role.toUpperCase() : "USER"}
                  </span>
                </td>
                <td style={{textAlign: "center"}}>
                  {u.role === "admin" ? (
                    <button 
                      className="btn-demote"
                      onClick={() => handleRoleChange(u.id, "admin")}
                      disabled={u.id === user.id} 
                      style={u.id === user.id ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                    >
                      ▼ Demote
                    </button>
                  ) : (
                    <button 
                      className="btn-promote"
                      onClick={() => handleRoleChange(u.id, "user")}
                    >
                      ▲ Promote
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;