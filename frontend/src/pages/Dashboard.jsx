import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees, setPage, setSearch, setSort, deleteEmployee, addEmployee } from "../redux/employeeSlice"; // 2. Import addEmployee
import { logoutUser } from "../redux/authSlice";
import Navbar from "../components/layout/Navbar";
import EmployeeTable from "../components/employees/EmployeeTable";
import employeeTableStyles from "../components/EmployeeTable.module.css";
import styles from "./Dashboard.module.css";
import buttonStyles from "../components/common/Button.module.css";
import layoutStyles from "../components/common/Layout.module.css";
import formStyles from "../components/common/Form.module.css";
import EmployeeForm from "../components/employees/EmployeeForm";

const Dashboard = () => {
  const dispatch = useDispatch();
  const [showAddForm, setShowAddForm] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const { list, loading, page, total, search, sort } = useSelector((state) => state.employees);

  useEffect(() => {
    dispatch(fetchEmployees({ page, search, sort }));
  }, [dispatch, page, search, sort]);

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
        <h3>Loading Profile...</h3>
      </div>
    );
  }

  const handleAddSubmit = async (formData) => {
    await dispatch(addEmployee(formData));
    setShowAddForm(false);
    dispatch(fetchEmployees({ page, search, sort }));
  };

  return (
    <div className={styles.dashboardContainer}>
      <Navbar user={user} onLogout={() => dispatch(logoutUser())}
        activePage="dashboard" />

      <div className={layoutStyles.glassCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Employee Directory</h2>
          {user.role === 'ADMIN' && (
            <button
              className={`${buttonStyles.btn} ${buttonStyles.btnAdd}`}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "Cancel" : "+ Add Employee"}
            </button>
          )}
        </div>

        {showAddForm && (
          <EmployeeForm
            onSubmit={handleAddSubmit}
            onCancel={() => setShowAddForm(false)}
            isLoading={loading}
          />
        )}

        <input
          placeholder="Search..."
          className={formStyles.inputField}
          onChange={(e) => dispatch(setSearch(e.target.value))}
        />

        <EmployeeTable
          employees={list}
          loading={loading}
          sortConfig={sort}
          isAdmin={user.role === 'ADMIN'}
          onSort={(key) => dispatch(setSort(key))}
          onDelete={(id) => dispatch(deleteEmployee(id)).then(() => dispatch(fetchEmployees({ page, search, sort })))}
        />

        <div className={employeeTableStyles.pagination}>
          <button disabled={page === 1} onClick={() => dispatch(setPage(page - 1))} className={employeeTableStyles.paginationBtn}>Prev</button>
          <span>Page {page} of {Math.ceil(total / 5)}</span>
          <button disabled={page >= Math.ceil(total / 5)} onClick={() => dispatch(setPage(page + 1))} className={employeeTableStyles.paginationBtn}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;