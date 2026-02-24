import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const loginUser = createAsyncThunk("auth/login", async (creds, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/login", creds);
    localStorage.setItem("token", res.data.token);
    return res.data.token;
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
  const res = await api.get("/user");
  return res.data;
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
      .addCase(loginUser.fulfilled, (state, action) => { state.token = action.payload; })
      .addCase(fetchUser.fulfilled, (state, action) => { state.user = action.payload; })
      .addCase(registerUser.fulfilled, (state) => {state.loading = false;})
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;