import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const { token, user } = useSelector((state) => state.auth);
  return token ? children : <Navigate to="/" />;
};
export default PrivateRoute;