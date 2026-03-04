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
        <BsNavbar expand="lg" variant="dark" className="nav-espn py-0 shadow-sm sticky-top" style={{ backgroundColor: '#032333' }}>
            <Container fluid="lg" className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 py-2">
                <BsNavbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 py-0">
                    <img src="/logo.png" alt="SMCC" height="35" className="rounded-circle shadow-sm" />
                    <span className="fw-black fs-5 text-white letter-spacing-2">SMCC LIVE</span>
                </BsNavbar.Brand>

                <BsNavbar.Toggle aria-controls="basic-navbar-nav" />
                <BsNavbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto me-3 align-items-center gap-3">
                    </Nav>
                    <Button
                        variant="success"
                        className="premium-btn d-flex align-items-center gap-2 border-0 shadow-sm hover-glow"
                        style={{
                            padding: '0.4rem 1rem',
                            fontSize: '12px',
                            background: 'linear-gradient(45deg, #2e7d32, #43a047)',
                            color: 'white'
                        }}
                        onClick={() => window.open(APK_DOWNLOAD_URL, '_blank')}
                    >
                        <i className="bi bi-android2 fs-6"></i>
                        <span className="fw-black">DOWNLOAD</span>
                    </Button>
                </BsNavbar.Collapse>
            </Container>
        </BsNavbar>
    );
};

export default Navbar;
