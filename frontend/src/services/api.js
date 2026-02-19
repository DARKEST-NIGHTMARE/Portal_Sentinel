import axios from "axios";
// import { store } from "../redux/store"; 
import { logout } from "../redux/authSlice";

const API_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

let store; 

export const injectStore = (_store) => {
  store = _store;
};

// req intceptor
api.interceptors.request.use((config) => {
  const token = store?.getState()?.auth?.token || localStorage.getItem("token");
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// res interceptor to handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Session expired. Logging out...");
      
      if (store) {
        store.dispatch(logout());
      } else {
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;