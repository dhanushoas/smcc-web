import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import API_URL from '../utils/api';

const Sponsorship = () => {
    const [formData, setFormData] = useState({ company: '', contactPerson: '', email: '', phone: '', budget: '' });
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const handleSendOTP = () => {
        if (!formData.phone || formData.phone.length < 10) {
            toast.error("Please enter a valid phone number first.");
            return;
        }
        toast.success(`OTP Sent to ${formData.phone} (Simulation)`);
        setOtpSent(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            toast.error("Please upload your Sponsorship Proposal (PDF/Images).");
            return;
        }

        if (parseInt(formData.budget) < 1000) {
            toast.error("Minimum sponsorship bracket begins at ₹1,000.");
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            data.append('proposal', file);

            await axios.post(`${API_URL}/api/interactions/sponsorship`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Sponsorship application submitted! Our board will review your proposal.");
            setFormData({ company: '', contactPerson: '', email: '', phone: '', budget: '' });
            setFile(null);
            setOtpSent(false);
        } catch (err) {
            const errorMsg = err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || "Failed to submit proposal. Please verify all inputs.";
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container className="py-5" style={{ maxWidth: '900px' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-5">
                    <h1 className="fw-black premium-gradient-text text-uppercase mb-2">Partner with SMCC</h1>
                    <p className="text-muted">Empowering local cricket through strategic partnerships and sponsorships.</p>
                </div>

                <Alert variant="warning" className="border-0 shadow-sm rounded-4 p-4 mb-5">
                    <div className="d-flex gap-3">
                        <i className="bi bi-briefcase-fill fs-3 text-warning"></i>
                        <div>
                            <h6 className="fw-black mb-1">Brand Visibility & Growth</h6>
                            <p className="small mb-0 opacity-75">Partnering with SMCC LIVE offers your brand unparalleled exposure among highly engaged local sports enthusiasts.</p>
                        </div>
                    </div>
                </Alert>

                <Card className="glass-card border-0 shadow-lg p-4 p-md-5">
                    <Form onSubmit={handleSubmit}>
                        <Row className="gy-4">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">COMPANY / BRAND NAME *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        className="rounded-pill px-4 border-2"
                                        required
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">CONTACT PERSON *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        className="rounded-pill px-4 border-2"
                                        required
                                        value={formData.contactPerson}
                                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">OFFICIAL EMAIL *</Form.Label>
                                    <Form.Control
                                        type="email"
                                        className="rounded-pill px-4 border-2"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">BUSINESS PHONE *</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Form.Control
                                            type="tel"
                                            className="rounded-pill px-4 border-2"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                        <Button
                                            variant={otpSent ? "success" : "outline-primary"}
                                            className="rounded-pill px-4 fw-bold"
                                            onClick={handleSendOTP}
                                        >
                                            {otpSent ? <i className="bi bi-check-circle-fill"></i> : 'OTP'}
                                        </Button>
                                    </div>
                                    <Form.Text className="text-muted small">An OTP will be sent to verify this number.</Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">PROPOSED BUDGET (₹) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1000"
                                        step="1000"
                                        className="rounded-pill px-4 border-2"
                                        required
                                        value={formData.budget}
                                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">PROPOSAL DECK (PDF/PPT) *</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/jpeg, image/png, application/pdf"
                                        required
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="rounded-pill px-4 border-2"
                                    />
                                </Form.Group>
                            </Col>

                            <Col xs={12} className="text-center pt-4">
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button variant="primary" type="submit" disabled={submitting || !otpSent} className="premium-btn px-5 py-3 rounded-pill shadow-sm border-0 w-100 fw-black text-uppercase letter-spacing-1">
                                        {submitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-rocket-takeoff-fill me-2"></i>}
                                        {submitting ? 'Submitting Proposal...' : 'Submit Partnership Proposal'}
                                    </Button>
                                </motion.div>
                            </Col>
                        </Row>
                    </Form>
                </Card>
            </motion.div>
        </Container>
    );
};

export default Sponsorship;
