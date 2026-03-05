import React, { useEffect } from "react";

const AuthCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state"); 

    if (code && window.opener) {
      const type = state === "clio" || window.location.href.includes("clio") ? "CLIO_LOGIN_SUCCESS" : "GOOGLE_LOGIN_SUCCESS";

      console.log(`Sending ${type} message to opener...`);

      window.opener.postMessage(
        { type, code },
        "*" 
      );

      console.log("Message sent. Closing window in 500ms...");
      setTimeout(() => window.close(), 500);
    } else {
      console.error("AuthCallback Error: No code found or opener window is missing", { code, isOpenerVisible: !!window.opener });
    }
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h3>Authenticating...</h3>
      <p>Please wait while we close this window.</p>
    </div>
  );
};

export default AuthCallback;