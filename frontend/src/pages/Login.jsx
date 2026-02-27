import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useGoogleLogin } from "../hooks/useGoogleLogin";
import { useNavigate } from "react-router-dom";

import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";

const Login = () => {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  const { loginGooglePopup } = useGoogleLogin();
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

  return (
    <div className="login-card glass-card">
      <h1>{isRegistering ? "Create Account" : "Welcome Back"}</h1>
      <p className="subtitle" style={{ color: "#718096", marginBottom: "2rem", fontSize: "0.9rem" }}>
        {isRegistering ? "Register below using JWT" : "Choose an authentication strategy"}
      </p>

      <button onClick={loginGooglePopup} className="btn btn-google">
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" alt="G" />
        Continue with Google
      </button>

      <div className="divider" style={{ display: "flex", alignItems: "center", color: "#cbd5e0", fontSize: "0.8rem", margin: "1.5rem 0", fontWeight: "bold" }}>
        <span style={{ flex: 1, borderBottom: "1px solid #e2e8f0", marginRight: "10px" }}></span>
        OR USE JWT
        <span style={{ flex: 1, borderBottom: "1px solid #e2e8f0", marginLeft: "10px" }}></span>
      </div>

      {isRegistering ? (
        <RegisterForm onRegisterSuccess={() => setIsRegistering(false)} />
      ) : (
        <LoginForm />
      )}

      <button
        onClick={() => setIsRegistering(!isRegistering)}
        className="toggle-btn"
        style={{ background: "none", border: "none", color: "#667eea", cursor: "pointer", fontWeight: "600", marginTop: "10px" }}
      >
        {isRegistering ? "Already have an account? Log in here" : "Don't have an account? Register here"}
      </button>
    </div>
  );
};

export default Login;