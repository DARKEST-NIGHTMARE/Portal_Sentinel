import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import Navbar from '../components/layout/Navbar';
import { logoutUser, fetchUser } from '../redux/authSlice';
import styles from './ProfileSettings.module.css';
import layoutStyles from '../components/common/Layout.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

const ProfileSettings = () => {
    const { user, token } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    
    const [name, setName] = useState(user?.name || '');
    const [profilePic, setProfilePic] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    const [showTotpSetup, setShowTotpSetup] = useState(false);
    const [totpData, setTotpData] = useState({ secret: '', provisioning_uri: '' });
    const [totpCode, setTotpCode] = useState('');
    const [totpError, setTotpError] = useState('');
    const [totpLoading, setTotpLoading] = useState(false);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileMessage({ type: '', text: '' });

        const formData = new FormData();
        if (name) formData.append('name', name);
        if (profilePic) formData.append('avatar', profilePic);

        try {
            await axios.put(`${API_URL}/api/users/me/profile`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
            dispatch(fetchUser());
        } catch (err) {
            setProfileMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setProfileLoading(false);
        }
    };

    const initiateTotpSetup = async () => {
        setTotpLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/totp/setup`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTotpData(res.data);
            setShowTotpSetup(true);
        } catch (err) {
            setTotpError('Failed to initialize TOTP.');
        } finally {
            setTotpLoading(false);
        }
    };

    const verifyTotpSetup = async () => {
        if (totpCode.length !== 6) return;
        setTotpLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/totp/verify-setup`, {
                secret: totpData.secret,
                code: totpCode
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            dispatch(fetchUser());
            setShowTotpSetup(false);
            setTotpCode('');
        } catch (err) {
            setTotpError('Invalid verification code.');
        } finally {
            setTotpLoading(false);
        }
    };

    const avatarDisplay = user?.avatar_url 
        ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`)
        : `https://ui-avatars.com/api/?name=${user?.name}`;

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '2rem' }}>
            <Navbar user={user} onLogout={() => dispatch(logoutUser())} activePage="settings" />
            
            <div className={styles.settingsContainer}>
                <div className={`${styles.settingsCard} ${layoutStyles.glassCard}`}>
                    <div className={styles.settingsHeader}>
                        <h2 className={styles.settingsTitle}>Account Security & Profile</h2>
                    </div>

                    {/* Profile Section */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>👤 Profile Information</h3>
                        <form onSubmit={handleProfileUpdate}>
                            <div className={styles.avatarSection}>
                                <img src={avatarDisplay} className={styles.largeAvatar} alt="avatar" />
                                <div className={styles.uploadContainer}>
                                    <label className={styles.uploadBtn}>
                                        Change Photo
                                        <input 
                                            type="file" 
                                            hidden 
                                            accept="image/*" 
                                            onChange={(e) => setProfilePic(e.target.files[0])} 
                                        />
                                    </label>
                                    {profilePic && <span style={{display:'block', fontSize:'0.8rem', marginTop:'10px', color: '#00bfff'}}>{profilePic.name}</span>}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Full Name</label>
                                <input 
                                    className={styles.inputField}
                                    type="text" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                />
                            </div>

                            <button type="submit" className={styles.btnPrimary} disabled={profileLoading}>
                                {profileLoading ? 'Saving...' : 'Update Profile'}
                            </button>
                            {profileMessage.text && (
                                <div className={profileMessage.type === 'success' ? styles.success : styles.error}>
                                    {profileMessage.text}
                                </div>
                            )}
                        </form>
                    </section>

                    {/* 2FA Section */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>🛡️ Two-Factor Authentication</h3>
                        
                        <div className={styles.totpCard}>
                            <div className={styles.totpStatus}>
                                <div className={`${styles.statusIndicator} ${user?.is_totp_enabled ? styles.statusEnabled : styles.statusDisabled}`} />
                                <span style={{fontWeight:'600'}}>
                                    TOTP Authenticator: {user?.is_totp_enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>

                            {!user?.is_totp_enabled && !showTotpSetup && (
                                <button 
                                    onClick={initiateTotpSetup} 
                                    className={styles.btnPrimary} 
                                    style={{marginTop: '1.5rem'}}
                                    disabled={totpLoading}
                                >
                                    Enable Google Authenticator
                                </button>
                            )}

                            {showTotpSetup && (
                                <div style={{marginTop: '2rem'}}>
                                    <p style={{fontSize: '0.9rem', color: '#9ca3af', marginBottom: '1rem'}}>
                                        1. Scan the QR code with Google Authenticator or Authy.
                                    </p>
                                    <div className={styles.qrContainer}>
                                        <QRCodeSVG value={totpData.provisioning_uri} size={180} />
                                    </div>
                                    <p style={{fontSize: '0.9rem', color: '#9ca3af', marginBottom: '1rem', marginTop: '1rem'}}>
                                        2. Enter the 6-digit code from your app to verify.
                                    </p>
                                    <div className={styles.verifyGrid}>
                                        <div className={styles.formGroup} style={{marginBottom: 0}}>
                                            <input 
                                                className={styles.inputField}
                                                style={{width: '150px'}}
                                                placeholder="000000"
                                                maxLength={6}
                                                value={totpCode}
                                                onChange={(e) => setTotpCode(e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            onClick={verifyTotpSetup} 
                                            className={styles.btnPrimary}
                                            disabled={totpCode.length !== 6 || totpLoading}
                                        >
                                            Verify & Activate
                                        </button>
                                        <button 
                                             onClick={() => setShowTotpSetup(false)}
                                             className={styles.uploadBtn}
                                             style={{border: 'none'}}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {totpError && <div className={styles.error}>{totpError}</div>}
                                </div>
                            )}

                            {user?.is_totp_enabled && (
                                <p style={{color: '#9ca3af', fontSize: '0.9rem', marginTop: '1rem'}}>
                                    You are using Google Authenticator for enhanced security.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
