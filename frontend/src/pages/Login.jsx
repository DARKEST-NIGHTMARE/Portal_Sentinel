import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser ,registerUser} from "../redux/authSlice";
import { useGoogleLogin } from "../hooks/useGoogleLogin";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { token, error } = useSelector((state) => state.auth);
    const [regPicture, setRegPicture] = useState(null);

    const { loginGooglePopup } = useGoogleLogin();
    const [isRegistering, setIsRegistering] = useState(false);
    const [form, setForm] = useState({ username: "", password: "", name: "", email: "" });

    useEffect(() => {
        if (token) {
            navigate("/dashboard");
        }
    }, [token, navigate]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isRegistering) {
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("email", form.username);
            formData.append("password", form.password);
            if (regPicture) {
                formData.append("profile_picture", regPicture);
            }

            try {
                await dispatch(registerUser(formData)).unwrap();
                alert("Registration successful! Please login.");
                setIsRegistering(false);
            }
            catch (err) {
                alert(`Failed: ${err}`);
            }
        } else {
            dispatch(loginUser({ username: form.username, password: form.password }));
        }
    };

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

    <form onSubmit={handleSubmit}>
      {isRegistering ? (
        <>
          <input 
            name="name" 
            onChange={handleChange} 
            placeholder="Full Name" 
            className="input-field" 
            required 
          />
          <input 
            name="username" 
            onChange={handleChange} 
            placeholder="Email Address" 
            className="input-field" 
            required 
          />
          <input 
            name="password" 
            onChange={handleChange} 
            placeholder="Password" 
            type="password" 
            className="input-field" 
            required 
          />
          
          <div className="input-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <label style={{ fontSize: "0.85rem", color: "#718096", display: "block", marginBottom: "5px", fontWeight: "600" }}>
              Profile Picture (Optional)
            </label>
            <input 
              type="file" 
              accept="image/*" 
              className="input-field" 
              style={{ padding: '8px' }}
              onChange={(e) => setRegPicture(e.target.files[0])} 
            />
          </div>

          <button type="submit" className="btn btn-jwt">Register Account</button>
        </>
      ) : (
        <>
          <input 
            name="username" 
            onChange={handleChange} 
            placeholder="Email Address" 
            className="input-field" 
            required 
          />
          <input 
            name="password" 
            onChange={handleChange} 
            placeholder="Password" 
            type="password" 
            className="input-field" 
            required 
          />
          <button type="submit" className="btn btn-jwt">Secure Login</button>
        </>
      )}
    </form>

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