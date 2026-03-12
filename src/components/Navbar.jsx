import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';
import { useApp } from '../AppContext';

const Navbar = () => {
    const navigate = useNavigate();
    const { t } = useApp();

    return (
        <nav className="border-bottom sticky-top bg-white" style={{ zIndex: 1000, height: '64px' }}>
            <Container fluid className="d-flex justify-content-between align-items-center h-100 px-3">
                <div className="d-flex align-items-center gap-3">
                    <button className="btn btn-link p-0 text-dark border-0">
                        <i className="bi bi-list fs-3"></i>
                    </button>

                    <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
                        <div className="bg-dark rounded p-1 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                            <img src="/logo.png" alt="SMCC" height="28" />
                        </div>
                        <span className="fw-black text-dark" style={{ fontSize: '18px', letterSpacing: '-0.5px' }}>SMCC LIVE</span>
                    </Link>
                </div>

                <div className="d-flex align-items-center gap-3">
                    <button className="btn btn-link p-0 text-muted border-0 d-flex align-items-center gap-1 text-decoration-none" style={{ fontSize: '12px', fontWeight: '800' }}>
                        <i className="bi bi-box-arrow-right fs-5"></i>
                        <span className="d-none d-sm-inline text-uppercase">EXIT</span>
                    </button>
                    <button className="btn btn-link p-0 text-primary border-0" onClick={() => window.location.reload()}>
                        <i className="bi bi-globe fs-4"></i>
                    </button>
                </div>
            </Container>
            <style jsx>{`
                .fw-black {
                    font-weight: 900;
                }
            `}</style>
        </nav>
    );
};

export default Navbar;
