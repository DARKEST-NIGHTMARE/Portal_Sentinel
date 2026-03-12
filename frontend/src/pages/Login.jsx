import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, registerUser, verifyTwoFactor, clear2FA, resendOTP, verifyTotp } from "../redux/authSlice";
import { useGoogleLogin } from "../hooks/useGoogleLogin";
import { useClioLogin } from "../hooks/useClioLogin";
import { useNavigate } from "react-router-dom";
import buttonStyles from "../components/common/Button.module.css";
import layoutStyles from "../components/common/Layout.module.css";
import formStyles from "../components/common/Form.module.css";

const OTP_EXPIRY_SECONDS = 300;

const getUserCoordinates = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        console.log("Location denied or timed out. Falling back to IP.");
        resolve(null);
      },
      { timeout: 5000 }
    );
  });
};

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, error, loading, requiresTwoFactor, requiresTotp, tempUserId } = useSelector((state) => state.auth);
  const [regPicture, setRegPicture] = useState(null);

  const { loginGooglePopup } = useGoogleLogin();
  const { loginClioPopup } = useClioLogin();
  const [isRegistering, setIsRegistering] = useState(false);

  const [isLocating, setIsLocating] = useState(false);

  const [form, setForm] = useState({ username: "", password: "", name: "", email: "" });
  const [otpCode, setOtpCode] = useState("");

  // Timer state
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(120);
  const [resending, setResending] = useState(false);
  const timerRef = useRef(null);
  const resendTimerRef = useRef(null);

  // Start/restart the countdown when 2FA screen appears
  useEffect(() => {
    if (requiresTwoFactor) {
      setTimeLeft(OTP_EXPIRY_SECONDS);
      setResendCooldown(120);
      clearInterval(timerRef.current);
      clearInterval(resendTimerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      resendTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(resendTimerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { clearInterval(timerRef.current); clearInterval(resendTimerRef.current); };
  }, [requiresTwoFactor]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    dispatch(verifyTwoFactor({ user_id: tempUserId, code: otpCode }));
  };

  const handleVerifyTotp = (e) => {
    e.preventDefault();
    dispatch(verifyTotp({ user_id: tempUserId, code: otpCode }));
  };

  const handleResend = async () => {
    setResending(true);
    setOtpCode("");
    try {
      await dispatch(resendOTP({ user_id: tempUserId })).unwrap();
      setTimeLeft(OTP_EXPIRY_SECONDS);
      setResendCooldown(120);
      clearInterval(timerRef.current);
      clearInterval(resendTimerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      resendTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(resendTimerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Resend failed:", err);
    }
    setResending(false);
  };

  const handleBack = () => {
    dispatch(clear2FA());
    setOtpCode("");
    clearInterval(timerRef.current);
    clearInterval(resendTimerRef.current);
  };

  if (requiresTwoFactor) {
    return (
      <div className={`${layoutStyles.loginCard} ${layoutStyles.glassCard}`}>
        <h1>Two-Factor Verification</h1>
        <p className="subtitle" style={{ color: "#718096", marginBottom: "1rem", fontSize: "0.9rem" }}>
          A 6-digit code has been sent to your email.
          <br />Check your <strong>backend console</strong> for the OTP.
        </p>

        {/* Countdown Timer */}
        <div style={{
          display: "inline-block",
          background: timeLeft > 60 ? "#ebf8ff" : timeLeft > 0 ? "#fffaf0" : "#fff5f5",
          color: timeLeft > 60 ? "#2b6cb0" : timeLeft > 0 ? "#c05621" : "#c53030",
          padding: "6px 16px", borderRadius: "20px",
          fontWeight: "700", fontSize: "1rem", marginBottom: "1rem",
          border: `1px solid ${timeLeft > 60 ? "#90cdf4" : timeLeft > 0 ? "#fbd38d" : "#feb2b2"}`,
          transition: "all 0.3s"
        }}>
          {timeLeft > 0 ? `⏱ Valid till ${formatTime(timeLeft)}` : "⏱ Expired"}
        </div>

        {error && (
          <div style={{
            background: "#fff5f5", color: "#c53030", border: "1px solid #feb2b2",
            borderRadius: "8px", padding: "10px 14px", marginBottom: "1rem",
            fontSize: "0.85rem", fontWeight: "600"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyOtp}>
          <input
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className={formStyles.inputField}
            style={{
              textAlign: "center", fontSize: "1.8rem", letterSpacing: "0.4em",
              fontWeight: "700", paddingLeft: "0.4em"
            }}
            maxLength={6}
            autoFocus
            required
          />
          <button
            type="submit"
            className={`${buttonStyles.btn} ${buttonStyles.btnJwt}`}
            disabled={loading || otpCode.length !== 6 || timeLeft === 0}
          >
            {loading ? "Verifying..." : "🔐 Verify & Login"}
          </button>
        </form>

        <div style={{ marginTop: "12px", display: "flex", justifyContent: "center", gap: "16px" }}>
          <button
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            style={{
              background: "none", border: "none",
              color: resendCooldown > 0 ? "#a0aec0" : "#667eea",
              cursor: (resending || resendCooldown > 0) ? "not-allowed" : "pointer",
              fontWeight: "600", fontSize: "0.85rem",
              opacity: (resending || resendCooldown > 0) ? 0.6 : 1
            }}
          >
            {resending ? "Sending..." : resendCooldown > 0 ? `Resend in ${formatTime(resendCooldown)}` : "🔄 Resend Code"}
          </button>
          <button
            onClick={handleBack}
            style={{ background: "none", border: "none", color: "#a0aec0", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (requiresTotp) {
    return (
      <div className={`${layoutStyles.loginCard} ${layoutStyles.glassCard}`}>
        <h1>Authenticator Verification</h1>
        <p className="subtitle" style={{ color: "#718096", marginBottom: "1rem", fontSize: "0.9rem" }}>
          Please enter the 6-digit code from your <strong>Authenticator App</strong> (e.g., Google Authenticator).
        </p>

        {error && (
          <div style={{
            background: "#fff5f5", color: "#c53030", border: "1px solid #feb2b2",
            borderRadius: "8px", padding: "10px 14px", marginBottom: "1rem",
            fontSize: "0.85rem", fontWeight: "600"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyTotp}>
          <input
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className={formStyles.inputField}
            style={{
              textAlign: "center", fontSize: "1.8rem", letterSpacing: "0.4em",
              fontWeight: "700", paddingLeft: "0.4em"
            }}
            maxLength={6}
            autoFocus
            required
          />
          <button
            type="submit"
            className={`${buttonStyles.btn} ${buttonStyles.btnJwt}`}
            disabled={loading || otpCode.length !== 6}
          >
            {loading ? "Verifying..." : "🔐 Verify & Login"}
          </button>
        </form>

        <div style={{ marginTop: "12px", display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleBack}
            style={{ background: "none", border: "none", color: "#a0aec0", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${layoutStyles.loginCard} ${layoutStyles.glassCard}`}>
      <h1>{isRegistering ? "Create Account" : "Welcome Back"}</h1>
      <p className="subtitle" style={{ color: "#718096", marginBottom: "2rem", fontSize: "0.9rem" }}>
        {isRegistering ? "Register below using JWT" : "Choose an authentication strategy"}
      </p>

      {error && (
        <div style={{
          background: "#fff5f5", color: "#c53030", border: "1px solid #feb2b2",
          borderRadius: "8px", padding: "10px 14px", marginBottom: "1rem",
          fontSize: "0.85rem", fontWeight: "600"
        }}>
          {error}
        </div>
      )}

      <button onClick={loginGooglePopup} className={`${buttonStyles.btn} ${buttonStyles.btnGoogle}`} style={{ marginBottom: "0.75rem" }}>
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" alt="G" />
        Continue with Google
      </button>

      <button onClick={loginClioPopup} className={`${buttonStyles.btn}`} style={{ backgroundColor: "#00529b", color: "white", marginBottom: "0.5rem" }}>
        <img src="https://www.clio.com/wp-content/themes/clio/assets/images/favicon.png" width="20" alt="C" style={{ marginRight: "10px" }} />
        Continue with Clio Manage
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
              className={formStyles.inputField}
              required
            />
            <input
              name="username"
              onChange={handleChange}
              placeholder="Email Address"
              className={formStyles.inputField}
              required
            />
            <input
              name="password"
              onChange={handleChange}
              placeholder="Password"
              type="password"
              className={formStyles.inputField}
              required
            />

            <div className="input-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
              <label style={{ fontSize: "0.85rem", color: "#718096", display: "block", marginBottom: "5px", fontWeight: "600" }}>
                Profile Picture (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                className={formStyles.inputField}
                style={{ padding: '8px' }}
                onChange={(e) => setRegPicture(e.target.files[0])}
              />
            </div>

            <button type="submit" className={`${buttonStyles.btn} ${buttonStyles.btnJwt}`}>Register Account</button>
          </>
        ) : (
          <>
            <input
              name="username"
              onChange={handleChange}
              placeholder="Email Address"
              className={formStyles.inputField}
              required
            />
            <input
              name="password"
              onChange={handleChange}
              placeholder="Password"
              type="password"
              className={formStyles.inputField}
              required
            />
            <button type="submit" className={`${buttonStyles.btn} ${buttonStyles.btnJwt}`} disabled={isLocating || loading}>
              {isLocating ? "Securing Connection..." : loading ? "Authenticating..." : "Secure Login"}
            </button>
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