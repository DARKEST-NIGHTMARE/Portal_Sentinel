import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { googleLogin } from "../redux/authSlice";

export const useGoogleLogin = () => {
  const dispatch = useDispatch();
  const processing = useRef(false);

  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL; 
  const REDIRECT_URI = process.env.REACT_APP_GOOGLE_REDIRECT_URI; 

  useEffect(() => {
    const messageListener = (event) => {
      if (event.origin !== FRONTEND_URL) return;
      
      if (processing.current) return;

      if (event.data.type === "GOOGLE_LOGIN_SUCCESS" && event.data.code) {
        console.log("Code received in Main Window:", event.data.code);
        processing.current = true; 
        dispatch(googleLogin(event.data.code));
      }
    };

    window.addEventListener("message", messageListener);

    return () => window.removeEventListener("message", messageListener);
  }, [dispatch, FRONTEND_URL]);

  const loginGooglePopup = () => {
    const scope = "openid profile email";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(url, "Google Login", `width=${width},height=${height},top=${top},left=${left}`);
  };

  return { loginGooglePopup };
};