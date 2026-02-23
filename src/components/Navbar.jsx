import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container, Button } from 'react-bootstrap';
import { useApp } from '../AppContext';
import { motion } from 'framer-motion';

const Navbar = () => {
    const navigate = useNavigate();
    const { t } = useApp();

    return (
        <BsNavbar expand="lg" variant="dark" className="nav-espn py-0 shadow-sm sticky-top" style={{ backgroundColor: '#032333' }}>
            <Container className="d-flex justify-content-center justify-content-lg-start align-items-center">
                <BsNavbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 py-2">
                    <img src="/logo.png" alt="SMCC" height="35" className="rounded-circle shadow-sm" />
                    <span className="fw-black fs-5 text-white letter-spacing-2">SMCC LIVE</span>
                </BsNavbar.Brand>
            </Container>
        </BsNavbar>
    );
};

export default Navbar;
