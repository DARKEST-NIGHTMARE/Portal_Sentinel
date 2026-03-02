import React from 'react';
import formStyles from './Form.module.css';

const InputGroup = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  accept
}) => {
  return (
    <div className="input-group" style={{ marginBottom: '1rem', textAlign: 'left' }}>
      {label && (
        <label style={{
          fontSize: "0.85rem",
          color: "#718096",
          marginBottom: "5px",
          display: "block",
          fontWeight: "600"
        }}>
          {label}
        </label>
      )}
      <input
        className={formStyles.inputField}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        accept={accept}
      />
    </div>
  );
};

export default InputGroup;