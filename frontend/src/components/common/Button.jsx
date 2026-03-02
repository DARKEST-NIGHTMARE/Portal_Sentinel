import React from 'react';
import styles from './common/Button.module.css';

const Button = ({
  children,
  onClick,
  variant = 'jwt',
  type = 'button',
  disabled = false,
  className = '',
  icon = null
}) => {
  const variantClass = variant === 'google' ? styles.btnGoogle :
    variant === 'delete' ? styles.btnDelete :
      variant === 'add' ? styles.btnAdd : styles.btnJwt;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${styles.btn} ${variantClass} ${className}`}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
    >
      {icon && <img src={icon} alt="" width="20" />}
      {children}
    </button>
  );
};

export default Button;