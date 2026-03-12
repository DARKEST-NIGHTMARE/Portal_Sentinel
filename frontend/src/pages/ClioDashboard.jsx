import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import {
    fetchMatters,
    fetchContacts,
    fetchCalendar,
    fetchCommunications,
    setActiveTab,
    clearError,
    bookSlot,
    clearBookingResult,
} from "../redux/clioSlice";
import layoutStyles from "../components/common/Layout.module.css";
import tableStyles from "../components/EmployeeTable.module.css";
import styles from "./ClioDashboard.module.css";

const ClioDashboard = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { matters, contacts, calendar, communications, activeTab, loading, error, bookingResult } = useSelector((state) => state.clio);

    const [bookForm, setBookForm] = useState({ date: "", start_time: "", end_time: "", summary: "" });

    useEffect(() => {
        if (activeTab === "matters") dispatch(fetchMatters());
        else if (activeTab === "contacts") dispatch(fetchContacts());
        else if (activeTab === "calendar") dispatch(fetchCalendar());
        else if (activeTab === "communications") dispatch(fetchCommunications());
    }, [activeTab, dispatch]);

    if (user && user.provider !== "clio") {
        return <Navigate to="/dashboard" replace />;
    }

    if (!user) {
        return (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
                <h3>Loading Profile...</h3>
            </div>
        );
    }

    const tabs = [
        { key: "matters", label: "Matters" },
        { key: "contacts", label: "Contacts" },
        { key: "calendar", label: "Calendar" },
        { key: "communications", label: "Communications" },
    ];

    const renderTable = () => {
        switch (activeTab) {
            case "matters":
                return matters.length === 0 ? (
                    <div className={styles.emptyState}><p>No matters found.</p></div>
                ) : (
                    <table className={tableStyles.empTable}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Display #</th>
                                <th>Client</th>
                                <th>Status</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matters.map((m) => (
                                <tr key={m.id}>
                                    <td>{m.id}</td>
                                    <td>{m.display_number || "—"}</td>
                                    <td>{m.client?.name || "—"}</td>
                                    <td>
                                        <span className={
                                            m.status === "Open" ? styles.statusOpen :
                                                m.status === "Closed" ? styles.statusClosed : styles.statusPending
                                        }>
                                            {m.status || "—"}
                                        </span>
                                    </td>
                                    <td>{m.description || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case "contacts":
                return contacts.length === 0 ? (
                    <div className={styles.emptyState}><p>No contacts found.</p></div>
                ) : (
                    <table className={tableStyles.empTable}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Title</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.id}</td>
                                    <td>{c.name || "—"}</td>
                                    <td>{c.title || "—"}</td>
                                    <td>{c.type || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case "calendar":
                return (
                    <>
                        {/* Booking Form */}
                        <div className={styles.bookingForm}>
                            <h3 className={styles.bookingTitle}>📅 Book a Slot</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label>Date</label>
                                    <input type="date" value={bookForm.date}
                                        onChange={(e) => setBookForm({ ...bookForm, date: e.target.value })} />
                                </div>
                                <div className={styles.formField}>
                                    <label>Start Time</label>
                                    <input type="time" value={bookForm.start_time}
                                        onChange={(e) => setBookForm({ ...bookForm, start_time: e.target.value })} />
                                </div>
                                <div className={styles.formField}>
                                    <label>End Time</label>
                                    <input type="time" value={bookForm.end_time}
                                        onChange={(e) => setBookForm({ ...bookForm, end_time: e.target.value })} />
                                </div>
                                <div className={styles.formField}>
                                    <label>Summary</label>
                                    <input type="text" placeholder="Meeting title..." value={bookForm.summary}
                                        onChange={(e) => setBookForm({ ...bookForm, summary: e.target.value })} />
                                </div>
                            </div>
                            <button className={styles.btnBook} disabled={loading || !bookForm.date || !bookForm.start_time || !bookForm.end_time || !bookForm.summary}
                                onClick={() => { dispatch(clearBookingResult()); dispatch(bookSlot(bookForm)); }}>
                                {loading ? "Booking..." : "Book Slot"}
                            </button>

                            {bookingResult && bookingResult.booked && (
                                <div className={styles.bookingSuccess}>
                                    ✅ Slot booked successfully! Event ID: {bookingResult.event?.id}
                                </div>
                            )}

                            {bookingResult && !bookingResult.booked && (
                                <div className={styles.bookingConflict}>
                                    <p className={styles.conflictMsg}>⚠️ {bookingResult.message}</p>
                                    <p><strong>Conflicts with:</strong> {bookingResult.conflicts?.map((c, i) => (
                                        <span key={i} className={styles.conflictChip}>{c.start} – {c.end}</span>
                                    ))}</p>
                                    {(bookingResult.suggestions?.length > 0 || bookingResult.free_blocks?.length > 0) && (
                                        <>
                                            {bookingResult.suggestions?.length > 0 && (
                                                <div className={styles.suggestedSection}>
                                                    <p className={styles.sectionTitle}>✨ Suggested Slots</p>
                                                    <div className={styles.slotChips}>
                                                        {bookingResult.suggestions.map((s, i) => (
                                                            <button key={i} className={styles.slotChip}
                                                                onClick={() => {
                                                                    dispatch(clearBookingResult());
                                                                    dispatch(bookSlot({ date: s.date || bookForm.date, start_time: s.start, end_time: s.end, summary: bookForm.summary }));
                                                                    setBookForm({ ...bookForm, date: s.date || bookForm.date, start_time: s.start, end_time: s.end });
                                                                }}>
                                                                {s.date && s.date !== bookForm.date ? `${s.date} ` : ""}{s.start} – {s.end}
                                                                {s.label && <span className={styles.chipLabel}>{s.label}</span>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {bookingResult.free_blocks?.length > 0 && (
                                                <div className={styles.availabilitySection}>
                                                    <p className={styles.sectionTitle}>🕒 Total Availability</p>
                                                    <div className={styles.slotChips}>
                                                        {bookingResult.free_blocks.map((s, i) => (
                                                            <button key={i} className={styles.freeBlockChip}
                                                                onClick={() => {
                                                                    setBookForm({ ...bookForm, date: s.date, start_time: s.start, end_time: s.end });
                                                                }}>
                                                                {s.date && s.date !== bookForm.date ? `${s.date} ` : ""}{s.start} – {s.end}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p style={{ fontSize: '0.75rem', color: '#718096', marginTop: '8px' }}>
                                                        Click a block above to manually refine your selection in the form.
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Existing Events Table */}
                        {calendar.length === 0 ? (
                            <div className={styles.emptyState}><p>No calendar events found.</p></div>
                        ) : (
                            <table className={tableStyles.empTable}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Summary</th>
                                        <th>Start</th>
                                        <th>End</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {calendar.map((e) => (
                                        <tr key={e.id}>
                                            <td>{e.id}</td>
                                            <td>{e.summary || "—"}</td>
                                            <td>{e.start_at ? new Date(e.start_at).toLocaleString() : "—"}</td>
                                            <td>{e.end_at ? new Date(e.end_at).toLocaleString() : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </>
                );

            case "communications":
                return communications.length === 0 ? (
                    <div className={styles.emptyState}><p>No conversations found.</p></div>
                ) : (
                    <table className={tableStyles.empTable}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Subject</th>
                                <th>Messages</th>
                                <th>Read</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {communications.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.id}</td>
                                    <td>{c.subject || "—"}</td>
                                    <td>{c.message_count ?? "—"}</td>
                                    <td>{c.read ? "✓" : "✗"}</td>
                                    <td>{c.updated_at ? new Date(c.updated_at).toLocaleString() : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            default:
                return null;
        }
    };

    return (
            <div className={layoutStyles.glassCard}>
                <div className={styles.headerRow}>
                    <h2>Clio Dashboard</h2>
                </div>

                {error && (
                    <div className={styles.errorBanner}>
                        <span>{error}</span>
                        <button onClick={() => dispatch(clearError())}>✕</button>
                    </div>
                )}

                <div className={styles.tabBar}>
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
                            onClick={() => dispatch(setActiveTab(t.key))}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className={styles.tabContent}>
                    {renderTable()}
                </div>
            </div>
    );
};

export default ClioDashboard;
