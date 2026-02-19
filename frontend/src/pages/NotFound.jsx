import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100vh", 
      color: "#2d3748",
      textAlign: "center"
    }}>
      <h1 style={{ fontSize: "6rem", margin: 0, color: "#667eea" }}>404</h1>
      <h2 style={{ fontSize: "2rem", margin: "10px 0" }}>Page Not Found</h2>
      <p style={{ color: "#718096", marginBottom: "30px" }}>
        Oops! The page you are looking for does not exist.
      </p>
      
      <Link to="/dashboard" className="btn btn-jwt" style={{ textDecoration: "none" }}>
        Go Back Home
      </Link>
    </div>
  );
};

export default NotFound;