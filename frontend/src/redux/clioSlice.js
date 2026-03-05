import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import clioApi from "../services/clioApi";

export const fetchMatters = createAsyncThunk("clio/fetchMatters", async (_, { rejectWithValue }) => {
    try {
        const res = await clioApi.getMatters();
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || "Failed to fetch matters");
    }
});

export const createMatter = createAsyncThunk("clio/createMatter", async (payload, { rejectWithValue }) => {
    try {
        const res = await clioApi.createMatter(payload);
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || "Failed to create matter");
    }
});

export const fetchContacts = createAsyncThunk("clio/fetchContacts", async (_, { rejectWithValue }) => {
    try {
        const res = await clioApi.getContacts();
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || "Failed to fetch contacts");
    }
});

export const fetchCalendar = createAsyncThunk("clio/fetchCalendar", async (_, { rejectWithValue }) => {
    try {
        const res = await clioApi.getCalendarEvents();
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || "Failed to fetch calendar");
    }
});

export const fetchCommunications = createAsyncThunk("clio/fetchCommunications", async (_, { rejectWithValue }) => {
    try {
        const res = await clioApi.getCommunications();
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || "Failed to fetch communications");
    }
});

export const bookSlot = createAsyncThunk("clio/bookSlot", async (payload, { rejectWithValue, dispatch }) => {
    try {
        const res = await clioApi.bookSlot(payload);
        if (res.booked) {
            dispatch(fetchCalendar());
        }
        return res;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || "Failed to book slot");
    }
});

const clioSlice = createSlice({
    name: "clio",
    initialState: {
        matters: [],
        contacts: [],
        calendar: [],
        communications: [],
        activeTab: "matters",
        loading: false,
        error: null,
        bookingResult: null,
    },
    reducers: {
        setActiveTab: (state, action) => {
            state.activeTab = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearBookingResult: (state) => {
            state.bookingResult = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Matters
            .addCase(fetchMatters.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchMatters.fulfilled, (state, action) => { state.loading = false; state.matters = action.payload; })
            .addCase(fetchMatters.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
            // Create Matter
            .addCase(createMatter.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(createMatter.fulfilled, (state, action) => { state.loading = false; state.matters.push(action.payload); })
            .addCase(createMatter.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
            // Contacts
            .addCase(fetchContacts.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchContacts.fulfilled, (state, action) => { state.loading = false; state.contacts = action.payload; })
            .addCase(fetchContacts.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
            // Calendar
            .addCase(fetchCalendar.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchCalendar.fulfilled, (state, action) => { state.loading = false; state.calendar = action.payload; })
            .addCase(fetchCalendar.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
            // Communications
            .addCase(fetchCommunications.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchCommunications.fulfilled, (state, action) => { state.loading = false; state.communications = action.payload; })
            .addCase(fetchCommunications.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
            // Book Slot
            .addCase(bookSlot.pending, (state) => { state.loading = true; state.error = null; state.bookingResult = null; })
            .addCase(bookSlot.fulfilled, (state, action) => { state.loading = false; state.bookingResult = action.payload; })
            .addCase(bookSlot.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    },
});

export const { setActiveTab, clearError, clearBookingResult } = clioSlice.actions;
export default clioSlice.reducer;
