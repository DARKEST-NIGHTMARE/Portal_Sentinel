import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { registerUser } from "../../redux/authSlice";

const RegisterForm = ({ onRegisterSuccess }) => {
    const dispatch = useDispatch();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [regPicture, setRegPicture] = useState(null);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("name", form.name);
        formData.append("email", form.email);
        formData.append("password", form.password);
        if (regPicture) {
            formData.append("profile_picture", regPicture);
        }

        try {
            await dispatch(registerUser(formData)).unwrap();
            alert("Registration successful! Please login.");
            if (onRegisterSuccess) onRegisterSuccess();
        } catch (err) {
            alert(`Failed: ${err}`);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                name="name"
                onChange={handleChange}
                placeholder="Full Name"
                className="input-field"
                value={form.name}
                required
            />
            <input
                name="email"
                onChange={handleChange}
                placeholder="Email Address"
                className="input-field"
                value={form.email}
                required
            />
            <input
                name="password"
                onChange={handleChange}
                placeholder="Password"
                type="password"
                className="input-field"
                value={form.password}
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
        </form>
    );
};

export default RegisterForm;
