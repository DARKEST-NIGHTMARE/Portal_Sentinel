import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const loginUser = createAsyncThunk("auth/login", async (creds, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/login", creds);
    localStorage.setItem("token", res.data.token);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response.data.detail);
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
  initialState: { user: null, token: localStorage.getItem("token"), loading: false, error: null },
  reducers: {
    logout: (state) => {
      localStorage.removeItem("token");
      state.user = null;
      state.token = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.rejected, (state) => { state.loading = false; state.error = "Login Falied"; })
      .addCase(fetchUser.fulfilled, (state, action) => { state.user = action.payload; })
      .addCase(registerUser.fulfilled, (state) => { state.loading = false; })
      .addMatcher(
        (action) => action.type === loginUser.fulfilled.type || action.type === googleLogin.fulfilled.type,
        (state, action) => {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.loading = false;
        }
      );
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;