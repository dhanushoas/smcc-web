import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import axios from 'axios';

const Footer = () => {
    const [links, setLinks] = useState({ quick_links: [], support: [], community: [] });
    const [socials, setSocials] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const fetchFooterData = async () => {
            try {
                const [linksRes, socialsRes] = await Promise.all([
                    axios.get(`${API_URL}/api/footer/links`),
                    axios.get(`${API_URL}/api/footer/socials`)
                ]);

                // Only bind if the grouped structure returns safely
                if (linksRes.data && linksRes.data.quick_links) {
                    setLinks(linksRes.data);
                }
                if (socialsRes.data) {
                    setSocials(socialsRes.data);
                }
            } catch (error) {
                console.error('Failed to load dynamic footer data:', error);

                // Fallback static links if backend is unreachable 
                setLinks({
                    quick_links: [
                        { title: 'Live Matches', route: '/' },
                        { title: 'Upcoming Schedule', route: '/schedule' },
                        { title: 'Points Table', route: '/points-table' },
                    ],
                    support: [
                        { title: 'Contact Us', route: '/contact' },
                        { title: 'Share Feedback', route: '/feedback' },
                        { title: 'Report Issues', route: '/report' },
                    ],
                    community: [
                        { title: 'Improvements', route: '/improvements' },
                        { title: 'Join Council', route: '/join' },
                        { title: 'Sponsorship', route: '/sponsorship' },
                        { title: 'Console', route: '/login' },
                    ]
                });
            } finally {
                setLoading(false);
            }
        };

        fetchFooterData();
    }, [API_URL]);

    const getSocialIcon = (platform) => {
        const p = platform.toLowerCase();
        if (p.includes('facebook')) return <i className="bi bi-facebook"></i>;
        if (p.includes('instagram')) return <i className="bi bi-instagram"></i>;
        if (p.includes('twitter') || p.includes('x')) return <i className="bi bi-twitter-x"></i>;
        if (p.includes('whatsapp')) return <i className="bi bi-whatsapp"></i>;
        if (p.includes('youtube')) return <i className="bi bi-youtube"></i>;
        return <i className="bi bi-link-45deg"></i>;
    };

    const getSocialColor = (platform) => {
        const p = platform.toLowerCase();
        if (p.includes('facebook')) return 'bg-primary';
        if (p.includes('instagram')) return 'bg-danger';
        if (p.includes('twitter') || p.includes('x')) return 'bg-dark';
        if (p.includes('whatsapp')) return 'bg-success';
        if (p.includes('youtube')) return 'bg-danger';
        return 'bg-secondary';
    };

    return (
        <footer className="py-5 mt-auto border-top bg-light bg-opacity-75 backdrop-blur">
            <Container>
                <Row className="gy-5">
                    <Col lg={4} className="text-center text-lg-start">
                        <div className="d-flex align-items-center justify-content-center justify-content-lg-start gap-2 mb-3">
                            <img src="/logo.png" alt="SMCC" height="45" className="rounded-circle shadow-sm border border-white" />
                            <span className="fw-black premium-gradient-text fs-4 letter-spacing-1">SMCC LIVE</span>
                        </div>
                        <p className="text-muted small mb-4 pe-lg-4">
                            S Mettur Cricket Council (SMCC) is dedicated to bringing professional-grade cricket scoring and live updates to our community. Experience cricket like never before.
                        </p>
                        <div className="d-flex justify-content-center justify-content-lg-start gap-3">
                            {!loading && socials.length > 0 ? (
                                socials.map(social => (
                                    <motion.a
                                        key={social.id || social.platform}
                                        whileHover={{ y: -3 }}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`social-icon text-white ${getSocialColor(social.platform)}`}
                                    >
                                        {getSocialIcon(social.platform)}
                                    </motion.a>
                                ))
                            ) : (
                                <>
                                    <motion.a whileHover={{ y: -3 }} href="#" className="social-icon bg-primary text-white"><i className="bi bi-facebook"></i></motion.a>
                                    <motion.a whileHover={{ y: -3 }} href="#" className="social-icon bg-danger text-white"><i className="bi bi-instagram"></i></motion.a>
                                    <motion.a whileHover={{ y: -3 }} href="#" className="social-icon bg-dark text-white"><i className="bi bi-twitter-x"></i></motion.a>
                                </>
                            )}
                        </div>
                    </Col>

                    <Col lg={8}>
                        <Row className="gy-4">
                            <Col xs={6} md={4} className="text-center text-md-start">
                                <h6 className="fw-black text-uppercase small letter-spacing-2 mb-4 text-primary">Quick Links</h6>
                                <ul className="list-unstyled d-grid gap-2 small">
                                    {loading ? <span className="text-muted spinner-border spinner-border-sm"></span> : links.quick_links.map((link, idx) => (
                                        <li key={link.id || idx}><Link to={link.route} className="text-muted text-decoration-none hover-text-primary transition-all">{link.title}</Link></li>
                                    ))}
                                </ul>
                            </Col>

                            <Col xs={6} md={4} className="text-center text-md-start">
                                <h6 className="fw-black text-uppercase small letter-spacing-2 mb-4 text-primary">Support</h6>
                                <ul className="list-unstyled d-grid gap-2 small">
                                    {loading ? <span className="text-muted spinner-border spinner-border-sm"></span> : links.support.map((link, idx) => (
                                        <li key={link.id || idx}><Link to={link.route} className="text-muted text-decoration-none hover-text-primary transition-all">{link.title}</Link></li>
                                    ))}
                                </ul>
                            </Col>

                            <Col xs={12} md={4} className="text-center text-md-start">
                                <h6 className="fw-black text-uppercase small letter-spacing-2 mb-4 text-primary">Community</h6>
                                <ul className="list-unstyled d-grid gap-2 small">
                                    {loading ? <span className="text-muted spinner-border spinner-border-sm"></span> : links.community.map((link, idx) => (
                                        <li key={link.id || idx}><Link to={link.route} className="text-muted text-decoration-none hover-text-primary transition-all">{link.title}</Link></li>
                                    ))}
                                </ul>
                            </Col>
                        </Row>
                    </Col>
                </Row>

                <hr className="my-5 opacity-10" />

                <Row className="align-items-center gy-3">
                    <Col md={6} className="text-center text-md-start">
                        <p className="text-muted x-small mb-0 fw-bold">
                            &copy; {new Date().getFullYear()} SMCC LIVE. ALL RIGHTS RESERVED.
                        </p>
                    </Col>
                    <Col md={6} className="text-center text-md-end">
                        <p className="text-muted x-small mb-0">
                            DESIGNED & DEVELOPED BY <span className="text-primary fw-black letter-spacing-1">DHANUSH THANGARAJ</span>
                        </p>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
};

export default Footer;
