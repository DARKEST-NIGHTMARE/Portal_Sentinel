import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { logoutUser } from '../../redux/authSlice';

const MainLayout = ({ children, activePage }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const handleLogout = () => {
        dispatch(logoutUser());
        navigate("/");
    };

    if (!user) return null;

    return (
        <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto', 
            padding: '20px',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <Navbar 
                user={user} 
                onLogout={handleLogout} 
                activePage={activePage} 
            />
            <main>
                {children}
            </main>
        </div>
    );
};

export default MainLayout;
