import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchEmployees = createAsyncThunk(
  "employees/fetchAll",
  async ({ page, search, sort }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/employees?page=${page}&limit=5&search=${search}&sort_by=${sort.key}&sort_order=${sort.direction}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const addEmployee = createAsyncThunk("employees/add", async (empData, { dispatch }) => {
  await api.post("/api/employees", empData);
  return; 
});

export const deleteEmployee = createAsyncThunk("employees/delete", async (id) => {
  await api.delete(`/api/employees/${id}`);
  return id;
});

const employeeSlice = createSlice({
  name: "employees",
  initialState: { list: [], total: 0, loading: false, page: 1, search: "", sort: { key: "id", direction: "asc" } },
  reducers: {
    setPage: (state, action) => { state.page = action.payload; },
    setSearch: (state, action) => { state.search = action.payload; state.page = 1; },
    setSort: (state, action) => {
        const key = action.payload;
        if (state.sort.key === key) {
            state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
        } else {
            state.sort = { key, direction: "asc" };
        }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => { state.loading = true; })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.list = state.list.filter(e => e.id !== action.payload);
      });
  },
});

export const { setPage, setSearch, setSort } = employeeSlice.actions;
export default employeeSlice.reducer;