import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav = () => {
    return (
        <div className="bottom-nav-wrapper d-block d-md-none position-fixed bottom-0 start-0 end-0 bg-white border-top shadow-lg" style={{ zIndex: 1040, height: '70px' }}>
            <div className="d-flex justify-content-around align-items-center h-100">
                <NavLink to="/" className={({ isActive }) => `nav-item d-flex flex-column align-items-center text-decoration-none transition-all ${isActive ? 'active-nav' : 'text-muted'}`}>
                    <div className="icon-wrapper d-flex align-items-center justify-content-center">
                        <i className="bi bi-house-door-fill fs-4"></i>
                    </div>
                    <span className="nav-label fw-bold mt-1">Home</span>
                </NavLink>

                <NavLink to="/points-table" className={({ isActive }) => `nav-item d-flex flex-column align-items-center text-decoration-none transition-all ${isActive ? 'active-nav' : 'text-muted'}`}>
                    <div className="icon-wrapper d-flex align-items-center justify-content-center">
                        <i className="bi bi-bar-chart-fill fs-4"></i>
                    </div>
                    <span className="nav-label fw-bold mt-1">Standings</span>
                </NavLink>

                <NavLink to="/schedule" className={({ isActive }) => `nav-item d-flex flex-column align-items-center text-decoration-none transition-all ${isActive ? 'active-nav' : 'text-muted'}`}>
                    <div className="icon-wrapper d-flex align-items-center justify-content-center">
                        <i className="bi bi-calendar-event-fill fs-4"></i>
                    </div>
                    <span className="nav-label fw-bold mt-1">Schedule</span>
                </NavLink>
            </div>

            <style jsx>{`
                .nav-item {
                    font-size: 11px;
                    width: 33.33%;
                    padding: 8px 0;
                }
                .icon-wrapper {
                    width: 54px;
                    height: 32px;
                    border-radius: 16px;
                    transition: all 0.3s ease;
                }
                .active-nav .icon-wrapper {
                    background-color: #dbeafe;
                    color: #2563eb !important;
                }
                .active-nav .nav-label {
                    color: #1e293b;
                }
                .nav-label {
                    font-size: 10px;
                    text-transform: capitalize;
                }
                .active-nav i {
                    color: #2563eb;
                }
            `}</style>
        </div>
    );
};

export default BottomNav;
