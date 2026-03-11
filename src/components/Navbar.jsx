import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container, Button } from 'react-bootstrap';
import { useApp } from '../AppContext';
import { motion } from 'framer-motion';

import { APK_DOWNLOAD_URL } from '../constants/app';

const Navbar = () => {
    const navigate = useNavigate();
    const { t } = useApp();

    return (
        <nav className="shadow-sm sticky-top" style={{ backgroundColor: '#032333', zIndex: 1000 }}>
            <Container style={{ maxWidth: '1100px' }} className="d-flex justify-content-between align-items-center py-2 px-3">
                <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
                    <img src="/logo.png" alt="SMCC" height="32" className="rounded-circle" />
                    <span className="fw-black text-white" style={{ fontSize: '16px', letterSpacing: '1px' }}>SMCC LIVE</span>
                </Link>

                <div className="d-flex align-items-center gap-2">
                    <Button
                        variant="success"
                        className="d-flex align-items-center gap-2 border-0"
                        style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            background: 'linear-gradient(45deg, #2e7d32, #43a047)',
                            color: 'white',
                            borderRadius: '4px',
                            fontWeight: '900'
                        }}
                        onClick={() => window.open(APK_DOWNLOAD_URL, '_blank')}
                    >
                        <i className="bi bi-android2"></i>
                        <span className="d-none d-sm-inline">DOWNLOAD APP</span>
                        <span className="d-inline d-sm-none">APP</span>
                    </Button>

                    <button className="btn text-white ps-2 pe-0 border-0" style={{ fontSize: '20px' }}>
                        <i className="bi bi-list"></i>
                    </button>
                </div>
            </Container>
        </nav>
    );
};

export default Navbar;
