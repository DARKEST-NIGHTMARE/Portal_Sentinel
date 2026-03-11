import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const loginUser = createAsyncThunk("auth/login", async (creds, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/login", creds);
    return res.data; 
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Login failed");
  }
});

export const verifyTwoFactor = createAsyncThunk("auth/verify2fa", async ({ user_id, code }, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/login/verify-2fa", { user_id, code });
    localStorage.setItem("token", res.data.token);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Verification failed");
  }
});

export const resendOTP = createAsyncThunk("auth/resendOTP", async ({ user_id }, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/login/resend-otp", { user_id });
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || "Failed to resend OTP");
  }
});

export const registerUser = createAsyncThunk(
  "auth/register",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/auth/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Registration failed");
    }
  }
);

export const googleLogin = createAsyncThunk("auth/google", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/google", payload);
    localStorage.setItem("token", res.data.token);
    return res.data;
  } catch (err) {
    return rejectWithValue("Google Login Failed");
  }
});

export const clioLogin = createAsyncThunk("auth/clio", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/clio", payload);
    localStorage.setItem("token", res.data.token);
    return res.data;
  } catch (err) {
    return rejectWithValue("Clio Login Failed");
  }
});

export const fetchUser = createAsyncThunk("auth/me", async () => {
  const res = await api.get("/api/users/me");
  return res.data;
});

export const logoutUser = createAsyncThunk("auth/logout", async (_, { dispatch }) => {
  try {
    await api.post("/api/auth/logout");
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    dispatch(logout());
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: localStorage.getItem("token"),
    loading: false,
    error: null,
    requiresTwoFactor: false,
    tempUserId: null,
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem("token");
      state.user = null;
      state.token = null;
      state.requiresTwoFactor = false;
      state.tempUserId = null;
    },
    clear2FA: (state) => {
      state.requiresTwoFactor = false;
      state.tempUserId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.status === "2FA_REQUIRED") {
          state.requiresTwoFactor = true;
          state.tempUserId = action.payload.user_id;
        } else {
          localStorage.setItem("token", action.payload.token);
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
      })
      .addCase(loginUser.rejected, (state, action) => { state.loading = false; state.error = action.payload || "Login Failed"; })

      .addCase(verifyTwoFactor.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(verifyTwoFactor.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.requiresTwoFactor = false;
        state.tempUserId = null;
      })
      .addCase(verifyTwoFactor.rejected, (state, action) => { state.loading = false; state.error = action.payload || "Verification Failed"; })

      .addCase(fetchUser.fulfilled, (state, action) => { state.user = action.payload; })
      .addCase(registerUser.fulfilled, (state) => { state.loading = false; })
      .addMatcher(
        (action) => [googleLogin.fulfilled.type, clioLogin.fulfilled.type].includes(action.type),
        (state, action) => {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.loading = false;
        }
      );
  },
});

export const { logout, clear2FA } = authSlice.actions;
export default authSlice.reducer;