import React from "react";
import styles from "./EmployeeTable.module.css";

const EmployeeTable = ({ employees, sortConfig, onSort, onDelete, isAdmin, loading }) => {
  if (loading) return <div>Loading...</div>;

  return (
    <table className={styles.empTable}>
      <thead>
        <tr>
          <th>ID</th>
          <th onClick={() => onSort("name")}>Name {sortConfig.key === "name" && (sortConfig.direction === "asc" ? "⬆" : "⬇")}</th>
          <th>Role</th>
          <th>Salary</th>
          {isAdmin && <th>Action</th>}
        </tr>
      </thead>
      <tbody>
        {employees.map((emp) => (
          <tr key={emp.id}>
            <td>#{emp.id}</td>
            <td>{emp.name}</td>
            <td>{emp.role}</td>
            <td>${emp.salary}</td>
            {isAdmin && (
              <td>
                <button className={styles.btnDelete} onClick={() => onDelete(emp.id)}>Delete</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
export default EmployeeTable;