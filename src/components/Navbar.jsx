import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { useApp } from '../AppContext';

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const { theme, toggleTheme, language, toggleLanguage, t } = useApp();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <BsNavbar bg={theme === 'dark' ? 'dark' : 'white'} variant={theme === 'dark' ? 'dark' : 'light'} expand="lg" sticky="top" className="shadow-sm border-bottom">
            <Container>
                <BsNavbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
                    <img src="/logo.png" alt="SMCC" style={{ height: '40px' }} />
                    <span className="fw-bold fs-4">SMCC Live</span>
                </BsNavbar.Brand>
                <BsNavbar.Toggle aria-controls="basic-navbar-nav" />
                <BsNavbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto align-items-center gap-2">
                        <Nav.Link as={Link} to="/" className="fw-semibold">{t('home')}</Nav.Link>

                        <Dropdown className="mx-2">
                            <Dropdown.Toggle variant="outline-secondary" size="sm" className="fw-bold">
                                {language === 'en' ? '🇺🇸 EN' : '🇮🇳 தமிழ்'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end">
                                <Dropdown.Item onClick={() => toggleLanguage('en')}>🇺🇸 English</Dropdown.Item>
                                <Dropdown.Item onClick={() => toggleLanguage('ta')}>🇮🇳 தமிழ்</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>

                        <Button variant={theme === 'dark' ? 'light' : 'dark'} size="sm" onClick={toggleTheme} className="rounded-circle p-1" title="Toggle Theme">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </Button>

                        <Nav.Link as={Link} to="/profile" className="fw-semibold">
                            {token ? (
                                <span className="d-flex align-items-center gap-1">
                                    <span style={{ fontSize: '1.2rem' }}>👤</span> {t('admin')}
                                </span>
                            ) : (
                                <span className="d-flex align-items-center gap-1">
                                    <span style={{ fontSize: '1.2rem' }}>👤</span> {t('login')}
                                </span>
                            )}
                        </Nav.Link>
                    </Nav>
                </BsNavbar.Collapse>
            </Container>
        </BsNavbar>
    );
};

export default Navbar;
