import React, { useEffect, useState } from "react"; 
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees, setPage, setSearch, setSort, deleteEmployee, addEmployee } from "../redux/employeeSlice"; // 2. Import addEmployee
import { logout } from "../redux/authSlice";
import Navbar from "../components/Navbar";
import EmployeeTable from "../components/EmployeeTable";
import EmployeeForm from "../components/EmployeeForm"; 

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
    <div className="dashboard-container">
      <Navbar user={user} onLogout={() => dispatch(logout())}
      activePage= "dashboard" />
      
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Employee Directory</h2>
            {user.role === 'admin' && (
                <button 
                  className="btn btn-add" 
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
          className="input-field" 
          onChange={(e) => dispatch(setSearch(e.target.value))} 
        />
        
        <EmployeeTable 
          employees={list} 
          loading={loading} 
          sortConfig={sort}
          isAdmin={user.role === 'admin'}
          onSort={(key) => dispatch(setSort(key))}
          onDelete={(id) => dispatch(deleteEmployee(id)).then(() => dispatch(fetchEmployees({ page, search, sort })))} 
        />

        <div className="pagination">
           <button disabled={page === 1} onClick={() => dispatch(setPage(page - 1))} className="btn btn-google" style={{width: "100px"}}>Prev</button>
           <span>Page {page} of {Math.ceil(total / 5)}</span>
           <button disabled={page >= Math.ceil(total / 5)} onClick={() => dispatch(setPage(page + 1))} className="btn btn-google" style={{width: "100px"}}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;