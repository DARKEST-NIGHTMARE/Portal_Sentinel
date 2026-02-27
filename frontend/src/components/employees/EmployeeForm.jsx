import React, { useState } from 'react';
import Button from '../common/Button';
import InputGroup from '../common/InputGroup';

const EmployeeForm = ({ onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    department: "",
    salary: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: "", role: "", department: "", salary: "" });
  };

  return (
    <div className="glass-card" style={{ marginBottom: '20px', padding: '20px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginTop: 0, color: '#2d3748' }}>Add New Employee</h3>

      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>

        <InputGroup
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <InputGroup
          name="role"
          placeholder="Job Title / Role"
          value={formData.role}
          onChange={handleChange}
          required
        />

        <InputGroup
          name="department"
          placeholder="Department"
          value={formData.department}
          onChange={handleChange}
          required
        />

        <InputGroup
          name="salary"
          type="number"
          placeholder="Salary"
          value={formData.salary}
          onChange={handleChange}
          required
        />

        <div style={{ gridColumn: "span 2", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <Button
            onClick={onCancel}
            variant="google"
            type="button"
            className="btn-action"
            style={{ width: 'auto' }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="jwt"
            disabled={isLoading}
            className="btn-action"
            style={{ width: 'auto' }}
          >
            {isLoading ? "Saving..." : "Save Employee"}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default EmployeeForm;