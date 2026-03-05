import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import employeeReducer from "./employeeSlice";
import usersListReducer from "./usersListSlice";
import clioReducer from "./clioSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeeReducer,
    usersList: usersListReducer,
    clio: clioReducer,
  },
});