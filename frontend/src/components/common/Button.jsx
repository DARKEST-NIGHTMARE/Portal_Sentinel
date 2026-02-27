import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'jwt', 
  type = 'button', 
  disabled = false, 
  className = '',
  icon = null
}) => {
  const variantClass = variant === 'google' ? 'btn-google' : 
                       variant === 'delete' ? 'btn-delete' : 
                       variant === 'add' ? 'btn-add' : 'btn-jwt';

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={`btn ${variantClass} ${className}`}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
    >
      {icon && <img src={icon} alt="" width="20" />}
      {children}
    </button>
  );
};

export default Button;