import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import API_URL from '../utils/api';

const Report = () => {
    const [formData, setFormData] = useState({ name: '', email: '', type: 'Technical Bug / App Glitch', severity: 'Medium', matchInfo: '', message: '' });
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const data = new FormData();
            data.append('issueType', formData.type);
            data.append('severity', formData.severity);
            data.append('description', formData.matchInfo ? `Match: ${formData.matchInfo} - ${formData.message}` : formData.message);
            data.append('pageUrl', window.location.href);

            if (formData.name) data.append('name', formData.name);
            if (formData.email) data.append('email', formData.email);
            if (file) data.append('screenshot', file);

            await axios.post(`${API_URL}/api/interactions/report`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Incident/Issue reported. Our team will investigate immediately.");
            setFormData({ name: '', email: '', type: 'Technical Bug / App Glitch', severity: 'Medium', matchInfo: '', message: '' });
            setFile(null);
        } catch (err) {
            const errorMsg = err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || "Failed to submit report. Please try again.";
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container className="py-5" style={{ maxWidth: '800px' }}>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <div className="text-center mb-5">
                    <h1 className="fw-black text-danger text-uppercase mb-2">Report an Issue</h1>
                    <p className="text-muted">Encountered a bug or an incident? Help us maintain the standards of SMCC.</p>
                </div>

                <Alert variant="warning" className="border-0 shadow-sm rounded-4 p-4 mb-5">
                    <div className="d-flex gap-3">
                        <i className="bi bi-exclamation-triangle-fill fs-3 text-warning"></i>
                        <div>
                            <h6 className="fw-black mb-1">Confidential Reporting</h6>
                            <p className="small mb-0 opacity-75">All reports are strictly confidential. We take bugs and misconduct reports very seriously to maintain a healthy sports ecosystem.</p>
                        </div>
                    </div>
                </Alert>

                <Card className="glass-card border-0 shadow-lg p-4 p-md-5">
                    <Form onSubmit={handleSubmit}>
                        <Row className="gy-4 mb-4">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">NAME (OPTIONAL)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Your Name"
                                        className="rounded-pill px-4 border-2"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">EMAIL (OPTIONAL)</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="john@example.com"
                                        className="rounded-pill px-4 border-2"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">REPORT TYPE</Form.Label>
                                    <Form.Select
                                        className="rounded-pill px-4 border-2 shadow-none"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="Technical Bug / App Glitch">Technical Bug / App Glitch</option>
                                        <option value="Incorrect Score Entry">Incorrect Score Entry</option>
                                        <option value="Unsportsmanlike Conduct">Unsportsmanlike Conduct</option>
                                        <option value="Umpiring Dispute">Umpiring Dispute</option>
                                        <option value="Other">Other</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">SEVERITY</Form.Label>
                                    <Form.Select
                                        className="rounded-pill px-4 border-2 shadow-none"
                                        value={formData.severity}
                                        onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                    >
                                        <option value="Low">Low - Minor inconvenience</option>
                                        <option value="Medium">Medium - Affects usage</option>
                                        <option value="High">High - Critical failure / Misconduct</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted">MATCH DETAILS (IF APPLICABLE)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g., Team A vs Team B on Feb 10"
                                className="rounded-pill px-4 border-2"
                                value={formData.matchInfo}
                                onChange={(e) => setFormData({ ...formData, matchInfo: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted">DETAILED DESCRIPTION</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={5}
                                placeholder="Explain the issue in detail..."
                                className="rounded-4 px-4 py-3 border-2"
                                required
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-5">
                            <Form.Label className="small fw-bold text-muted">ATTACH SCREENSHOT (OPTIONAL)</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/jpeg, image/png, application/pdf"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="rounded-pill px-4 border-2"
                            />
                            <div className="form-text small">Max size: 5MB (JPG, PNG, PDF).</div>
                        </Form.Group>

                        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                            <Button variant="danger" type="submit" disabled={submitting} className="w-100 py-3 rounded-pill fw-black text-uppercase letter-spacing-1 shadow">
                                {submitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-shield-exclamation me-2"></i>}
                                {submitting ? 'Submitting...' : 'Submit Incident Report'}
                            </Button>
                        </motion.div>
                    </Form>
                </Card>
            </motion.div>
        </Container>
    );
};

export default Report;
