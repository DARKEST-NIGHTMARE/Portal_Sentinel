import React, { useEffect } from "react";

const AuthCallback = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code && window.opener) {
      window.opener.postMessage(
        { type: "GOOGLE_LOGIN_SUCCESS", code },
        window.location.origin 
      );
      
      window.close();
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