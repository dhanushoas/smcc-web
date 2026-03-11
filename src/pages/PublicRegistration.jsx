import React, { useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
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
            // The interceptor unwraps data, but let's be careful. 
            // If the interceptor maps message to data.msg, we use that.
            setMessage(res.data.msg || 'Registration successful!');
            setFormData({ team_name: '', captain_name: '', mobile: '', village: '' });
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.msg || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col md={6} lg={5}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
                            <div className="bg-primary py-4 px-4 text-center text-white">
                                <h3 className="fw-black mb-1">TEAM REGISTRATION</h3>
                                <p className="small opacity-75 mb-0 text-uppercase letter-spacing-1">SMCC Village Cricket Tournament</p>
                            </div>
                            <Card.Body className="p-4 p-md-5">
                                <AnimatePresence mode="wait">
                                    {message ? (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center py-4"
                                        >
                                            <div className="display-1 text-success mb-3">✅</div>
                                            <h4 className="fw-bold text-success mb-3">Registration Successful!</h4>
                                            <p className="text-muted mb-4">{message}</p>
                                            <Button
                                                variant="outline-primary"
                                                className="rounded-pill px-4 fw-bold"
                                                onClick={() => setMessage(null)}
                                            >
                                                Register Another Team
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="form">
                                            {error && <Alert variant="danger" className="rounded-3 small fw-bold">{error}</Alert>}

                                            <Form onSubmit={handleSubmit}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-black text-muted text-uppercase">Team Name</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="team_name"
                                                        placeholder="Enter team name"
                                                        value={formData.team_name}
                                                        onChange={handleChange}
                                                        required
                                                        className="py-2 border-0 bg-light rounded-3 shadow-none fw-bold"
                                                    />
                                                </Form.Group>

                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-black text-muted text-uppercase">Captain Name</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="captain_name"
                                                        placeholder="Enter captain name"
                                                        value={formData.captain_name}
                                                        onChange={handleChange}
                                                        required
                                                        className="py-2 border-0 bg-light rounded-3 shadow-none fw-bold"
                                                    />
                                                </Form.Group>

                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-black text-muted text-uppercase">Mobile Number</Form.Label>
                                                    <Form.Control
                                                        type="tel"
                                                        name="mobile"
                                                        placeholder="10-digit mobile number"
                                                        value={formData.mobile}
                                                        onChange={handleChange}
                                                        required
                                                        className="py-2 border-0 bg-light rounded-3 shadow-none fw-bold"
                                                    />
                                                </Form.Group>

                                                <Form.Group className="mb-4">
                                                    <Form.Label className="small fw-black text-muted text-uppercase">Village / Area</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="village"
                                                        placeholder="Enter village or area"
                                                        value={formData.village}
                                                        onChange={handleChange}
                                                        required
                                                        className="py-2 border-0 bg-light rounded-3 shadow-none fw-bold"
                                                    />
                                                </Form.Group>

                                                <Button
                                                    type="submit"
                                                    variant="primary"
                                                    className="w-100 py-2 fw-black rounded-pill shadow-sm"
                                                    disabled={loading}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Spinner animation="border" size="sm" className="me-2" />
                                                            REGISTERING...
                                                        </>
                                                    ) : (
                                                        'SUBMIT REGISTRATION'
                                                    )}
                                                </Button>
                                            </Form>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card.Body>
                            <div className="bg-light py-3 px-4 text-center border-top">
                                <p className="x-small text-muted mb-0 fw-bold">Scan QR Code to share this page</p>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </Container>
    );
};

export default PublicRegistration;
