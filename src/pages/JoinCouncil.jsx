import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import API_URL from '../utils/api';

const JoinCouncil = () => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', age: '', role: 'Player', experience: '' });
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
            toast.error("Please upload a valid ID Document (Aadhar/Passport).");
            return;
        }

        if (parseInt(formData.age) < 18) {
            toast.error("You must be at least 18 years old to join the Council.");
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            data.append('idDocument', file);

            await axios.post(`${API_URL}/api/interactions/join-council`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Application submitted successfully! Our team will contact you soon.");
            setFormData({ name: '', email: '', phone: '', age: '', role: 'Player', experience: '' });
            setFile(null);
            setOtpSent(false);
        } catch (err) {
            const errorMsg = err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || "Failed to submit application. Please check your inputs.";
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container className="py-5" style={{ maxWidth: '900px' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-5">
                    <h1 className="fw-black premium-gradient-text text-uppercase mb-2">Join the Council</h1>
                    <p className="text-muted">Register as an official player, umpire, or organizer in the SMCC ecosystem.</p>
                </div>

                <Alert variant="info" className="border-0 shadow-sm rounded-4 p-4 mb-5">
                    <div className="d-flex gap-3">
                        <i className="bi bi-shield-check fs-3 text-info"></i>
                        <div>
                            <h6 className="fw-black mb-1">Identity Verification Required</h6>
                            <p className="small mb-0 opacity-75">To maintain the integrity of our leagues, all members must undergo KYC verification.</p>
                        </div>
                    </div>
                </Alert>

                <Card className="glass-card border-0 shadow-lg p-4 p-md-5">
                    <Form onSubmit={handleSubmit}>
                        <Row className="gy-4">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">FULL LEGAL NAME *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        className="rounded-pill px-4 border-2"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">EMAIL ADDRESS *</Form.Label>
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
                                    <Form.Label className="small fw-bold text-muted">PHONE NUMBER *</Form.Label>
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
                                    <Form.Label className="small fw-bold text-muted">AGE *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="18"
                                        className="rounded-pill px-4 border-2"
                                        required
                                        value={formData.age}
                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">REQUESTED ROLE *</Form.Label>
                                    <Form.Select
                                        className="rounded-pill px-4 border-2 shadow-none py-2"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="Player">Player</option>
                                        <option value="Umpire">Umpire</option>
                                        <option value="Scorer">Scorer</option>
                                        <option value="Event Organizer">Event Organizer</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">ID DOCUMENT (PDF/PNG/JPG) *</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/jpeg, image/png, application/pdf"
                                        required
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="rounded-pill px-4 border-2"
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={12}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">PREVIOUS EXPERIENCE *</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        placeholder="Outline your cricketing background, clubs played for, or officiating experience..."
                                        className="rounded-4 px-4 py-3 border-2"
                                        required
                                        value={formData.experience}
                                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={12} className="text-center pt-4">
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button variant="primary" type="submit" disabled={submitting || !otpSent} className="premium-btn px-5 py-3 rounded-pill shadow-sm border-0 w-100 fw-black text-uppercase letter-spacing-1">
                                        {submitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-person-lines-fill me-2"></i>}
                                        {submitting ? 'Submitting Application...' : 'Submit Official Application'}
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

export default JoinCouncil;
