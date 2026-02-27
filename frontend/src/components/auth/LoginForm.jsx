import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { loginUser } from "../../redux/authSlice";
import { getUserCoordinates } from "../../hooks/useGeolocation";

const LoginForm = () => {
    const dispatch = useDispatch();
    const [form, setForm] = useState({ username: "", password: "" });
    const [isLocating, setIsLocating] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLocating(true);

        const coords = await getUserCoordinates();
        const payload = {
            username: form.username,
            password: form.password,
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lon : null
        };

        dispatch(loginUser(payload));
        setIsLocating(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                name="username"
                onChange={handleChange}
                placeholder="Email Address"
                className="input-field"
                value={form.username}
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
            <button type="submit" className="btn btn-jwt" disabled={isLocating}>
                {isLocating ? "Securing Connection..." : "Secure Login"}
            </button>
        </form>
    );
};

export default LoginForm;
