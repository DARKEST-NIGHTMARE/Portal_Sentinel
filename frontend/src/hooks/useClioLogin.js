import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { clioLogin } from "../redux/authSlice";

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

export const useClioLogin = () => {
    const dispatch = useDispatch();
    const processing = useRef(false);

    const CLIO_CLIENT_ID = process.env.REACT_APP_CLIO_CLIENT_ID;
    const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || "http://127.0.0.1:3000";
    const REDIRECT_URI = process.env.REACT_APP_CLIO_REDIRECT_URI || `${FRONTEND_URL}/auth/callback`;
    const CLIO_REGION_URL = process.env.REACT_APP_CLIO_REGION_URL || "https://app.clio.com";

    useEffect(() => {
        const messageListener = async (event) => {
            console.log("Message received in Main Window from origin:", event.origin, "Data:", event.data);

            // Allow both localhost and 127.0.0.1 for development flexibility
            if (event.origin !== FRONTEND_URL && !event.origin.includes("localhost") && !event.origin.includes("127.0.0.1")) {
                console.warn("Ignoring message from untrusted origin:", event.origin);
                return;
            }

            if (processing.current) {
                console.log("Already processing a login request, ignoring message.");
                return;
            }

            if (event.data.type === "CLIO_LOGIN_SUCCESS" && event.data.code) {
                console.log("Clio Code successfully captured:", event.data.code);
                processing.current = true;

                const coords = await getUserCoordinates();
                dispatch(clioLogin({
                    code: event.data.code,
                    latitude: coords ? coords.lat : null,
                    longitude: coords ? coords.lon : null
                }));

                // Reset processing after a delay to allow future attempts if one fails
                setTimeout(() => {
                    processing.current = false;
                }, 3000);
            }
        };

        window.addEventListener("message", messageListener);

        return () => window.removeEventListener("message", messageListener);
    }, [dispatch, FRONTEND_URL]);

    const loginClioPopup = () => {
        // Clio authorization URL
        const state = "clio";
        const url = `${CLIO_REGION_URL}/oauth/authorize?response_type=code&client_id=${CLIO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        window.open(url, "Clio Login", `width=${width},height=${height},top=${top},left=${left}`);
    };

    return { loginClioPopup };
};
