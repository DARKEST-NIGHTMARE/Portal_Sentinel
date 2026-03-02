import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllUsers, updateUserRole } from "../redux/usersListSlice";
import { logoutUser } from "../redux/authSlice";
import Navbar from "../components/layout/Navbar";
import buttonStyles from "../components/common/Button.module.css";
import layoutStyles from "../components/common/Layout.module.css";
import styles from "./Dashboard.module.css";
import employeeTableStyles from "../components/EmployeeTable.module.css";

const BACKEND_URL = process.env.REACT_APP_API_URL;

const Users = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { list, loading } = useSelector((state) => state.usersList);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, user]);

  const handleRoleChange = (id, currentRole) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const action = newRole === "ADMIN" ? "Promote" : "Demote";

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
    <div className={styles.dashboardContainer}>
      <Navbar user={user} onLogout={() => dispatch(logoutUser())} activePage="users" />

      <div className={layoutStyles.glassCard}>
        <h2>System Users</h2>
        {/* <div className="table-wrapper" style={{ overflowX: "auto", width: "100%" }}> */}
        <table className={employeeTableStyles.empTable} style={{ width: "100%", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: "10%" }}>ID</th>
              <th style={{ width: "10%" }}>Avatar</th>
              <th style={{ width: "25%" }}>Name</th>
              <th style={{ width: "25%" }}>Email</th>
              <th style={{ width: "12%" }}>Role</th>
              <th style={{ width: "18%", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: "30px" }}>Loading users...</td></tr>
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
                <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><strong>{u.name}</strong></td>
                <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</td>
                <td>
                  <span className={`${buttonStyles.badge} ${u.role === 'ADMIN' ? buttonStyles.badgeAdmin : buttonStyles.badgeUser}`}>
                    {u.role ? u.role.toUpperCase() : "USER"}
                  </span>
                </td>
                <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  {u.role === "ADMIN" ? (
                    <button
                      className={buttonStyles.btnDemote}
                      onClick={() => handleRoleChange(u.id, "ADMIN")}
                      disabled={u.id === user.id}
                      style={{
                        ...(u.id === user.id ? { opacity: 0.5, cursor: "not-allowed" } : {}),
                        width: "100%", padding: "6px 4px", fontSize: "0.8rem", whiteSpace: "nowrap",
                        overflow: "hidden", textOverflow: "ellipsis"
                      }}
                    >
                      ▼ Demote
                    </button>
                  ) : (
                    <button
                      className={buttonStyles.btnPromote}
                      onClick={() => handleRoleChange(u.id, "USER")}
                      style={{
                        width: "100%", padding: "6px 4px", fontSize: "0.8rem",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                      }}
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