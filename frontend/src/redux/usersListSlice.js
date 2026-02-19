import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchAllUsers = createAsyncThunk(
    "usersList/fetchAll",
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get("/api/users");
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || "Failed to fetch users");
        }
    }
);

export const updateUserRole = createAsyncThunk(
    "usersList/updateRole",
    async ({ id, newRole }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/api/users/${id}/role`, { role: newRole });
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.detail || "Update failed");
        }
    }
);

const usersListSlice = createSlice({
    name: "usersList",
    initialState: { list: [], loading: false, error: null },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllUsers.pending, (state) => { state.loading = true; })
            .addCase(fetchAllUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchAllUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateUserRole.fulfilled, (state, action) => {
                const index = state.list.findIndex(u => u.id === action.payload.id);
                if (index !== -1) {
                    state.list[index] = action.payload;
                }
            });
    },
});

export default usersListSlice.reducer;