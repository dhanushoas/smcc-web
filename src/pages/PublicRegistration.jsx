import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../utils/api';

const PublicRegistration = () => {
    const [formData, setFormData] = useState({
        team_name: '',
        captain_name: '',
        mobile: '',
        village: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateMobile = (mobile) => {
        return /^[6789]\d{9}$/.test(mobile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        if (!validateMobile(formData.mobile)) {
            setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/tournament/register`, formData);
            setMessage(res.data.message || 'Registration submitted successfully. Tournament organizers will review your request.');
            setFormData({ team_name: '', captain_name: '', mobile: '', village: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="global-container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-100"
                style={{ maxWidth: '500px' }}
            >
                <div className="cric-card shadow-lg border-0 rounded-4 overflow-hidden">
                    <div className="bg-primary py-4 px-4 text-center text-white premium-gradient">
                        <h3 className="fw-black mb-1 letter-spacing-1">TEAM REGISTRATION</h3>
                        <p className="small opacity-75 mb-0 text-uppercase fw-bold letter-spacing-1">SMCC VILLAGE CRICKET TOURNAMENT</p>
                    </div>
                    <div className="p-4 p-md-5 bg-white">
                        <AnimatePresence mode="wait">
                            {message ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-4"
                                >
                                    <div className="display-1 mb-3">✅</div>
                                    <h4 className="fw-bold text-success mb-3">SUCCESS!</h4>
                                    <p className="text-muted mb-4 fw-medium">{message}</p>
                                    <Button
                                        variant="primary"
                                        className="rounded-pill px-5 py-2 fw-black shadow-sm"
                                        onClick={() => setMessage(null)}
                                    >
                                        REGISTER ANOTHER TEAM
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div key="form">
                                    <p className="text-muted small text-center mb-4 fw-medium">Join the ultimate village cricket experience. Fill out the form below to register your team.</p>

                                    {error && <Alert variant="danger" className="rounded-4 border-0 shadow-sm small fw-bold mb-4">{error}</Alert>}

                                    <Form onSubmit={handleSubmit}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="x-small fw-black text-muted text-uppercase ms-1">Team Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="team_name"
                                                placeholder="e.g. Rising Stars XI"
                                                value={formData.team_name}
                                                onChange={handleChange}
                                                required
                                                className="py-3 px-4 border-0 bg-light rounded-4 shadow-none fw-bold"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label className="x-small fw-black text-muted text-uppercase ms-1">Captain Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="captain_name"
                                                placeholder="Enter full name"
                                                value={formData.captain_name}
                                                onChange={handleChange}
                                                required
                                                className="py-3 px-4 border-0 bg-light rounded-4 shadow-none fw-bold"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label className="x-small fw-black text-muted text-uppercase ms-1">Mobile Number</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                name="mobile"
                                                placeholder="10-digit number"
                                                value={formData.mobile}
                                                onChange={handleChange}
                                                required
                                                className="py-3 px-4 border-0 bg-light rounded-4 shadow-none fw-bold"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-4">
                                            <Form.Label className="x-small fw-black text-muted text-uppercase ms-1">Village / Area</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="village"
                                                placeholder="Enter location"
                                                value={formData.village}
                                                onChange={handleChange}
                                                required
                                                className="py-3 px-4 border-0 bg-light rounded-4 shadow-none fw-bold"
                                            />
                                        </Form.Group>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="w-100 py-3 fw-black rounded-pill shadow-lg premium-gradient border-0 mt-2"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <div className="d-flex align-items-center justify-content-center gap-2">
                                                    <Spinner animation="border" size="sm" />
                                                    <span>SUBMITTING...</span>
                                                </div>
                                            ) : (
                                                'REGISTER TEAM NOW'
                                            )}
                                        </Button>
                                    </Form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="bg-light py-3 px-4 text-center border-top">
                        <p className="x-small text-muted mb-0 fw-bold letter-spacing-1">QUESTIONS? CONTACT US DIRECTLY</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PublicRegistration;
