import React, { useState } from 'react';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import API_URL from '../utils/api';

const Improvements = () => {
    const [formData, setFormData] = useState({ name: '', email: '', category: 'Live Scoring Experience', priority: 'Low', title: '', message: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/api/interactions/improvement`, {
                name: formData.name,
                email: formData.email,
                category: formData.category,
                priority: formData.priority,
                title: formData.title,
                description: formData.message
            });
            toast.success("Thank you for your suggestion! We'll review it for our next update.");
            setFormData({ name: '', email: '', category: 'Live Scoring Experience', priority: 'Low', title: '', message: '' });
        } catch (err) {
            const errorMsg = err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || "Failed to submit suggestion. Please ensure title is > 5 chars and description > 20 chars.";
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container className="py-5" style={{ maxWidth: '850px' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="text-center mb-5">
                    <h1 className="fw-black premium-gradient-text text-uppercase mb-2">Platform Improvements</h1>
                    <p className="text-muted">Have an idea to make SMCC LIVE better? We're all ears.</p>
                </div>

                <Row className="gy-4 mb-5 text-center">
                    <Col md={4}>
                        <div className="p-3">
                            <i className="bi bi-lightning-charge-fill fs-2 text-warning mb-2 d-block"></i>
                            <h6 className="fw-black text-uppercase small">Suggest Features</h6>
                        </div>
                    </Col>
                    <Col md={4}>
                        <div className="p-3">
                            <i className="bi bi-brush-fill fs-2 text-primary mb-2 d-block"></i>
                            <h6 className="fw-black text-uppercase small">UI/UX Ideas</h6>
                        </div>
                    </Col>
                    <Col md={4}>
                        <div className="p-3">
                            <i className="bi bi-graph-up-arrow fs-2 text-success mb-2 d-block"></i>
                            <h6 className="fw-black text-uppercase small">Stat Insights</h6>
                        </div>
                    </Col>
                </Row>

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
                                    <Form.Label className="small fw-bold text-muted">IDEA CATEGORY</Form.Label>
                                    <Form.Select
                                        className="rounded-pill px-4 border-2 shadow-none py-2"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="Live Scoring Experience">Live Scoring Experience</option>
                                        <option value="Admin Dashboard Tools">Admin Dashboard Tools</option>
                                        <option value="Member Portal Features">Member Portal Features</option>
                                        <option value="Mobile Performance">Mobile Performance</option>
                                        <option value="Other">Other</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-muted">PRIORITY</Form.Label>
                                    <Form.Select
                                        className="rounded-pill px-4 border-2 shadow-none py-2"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="Low">Low - Nice to have</option>
                                        <option value="Medium">Medium - Important</option>
                                        <option value="High">High - Critical for Growth</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-muted">TITLE OF YOUR SUGGESTION</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Short descriptive title"
                                className="rounded-pill px-4 border-2"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-5">
                            <Form.Label className="small fw-bold text-muted">THE VISION</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={6}
                                placeholder="Describe your idea and how it would benefit the community..."
                                className="rounded-4 px-4 py-3 border-2"
                                required
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit" disabled={submitting} className="premium-btn w-100 py-3 rounded-pill fw-black text-uppercase shadow border-0">
                            {submitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-rocket-takeoff-fill me-2"></i>}
                            {submitting ? 'Submitting...' : 'Submit Suggestion'}
                        </Button>
                    </Form>
                </Card>
            </motion.div>
        </Container>
    );
};

export default Improvements;
