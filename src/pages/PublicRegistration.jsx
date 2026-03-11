import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from "react-qr-code";
import { Toaster, toast } from 'react-hot-toast';
import API_URL from '../utils/api';

const PublicRegistration = () => {
    const [formData, setFormData] = useState({
        team_name: '',
        captain_name: '',
        mobile: '',
        village: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const validateField = (name, value) => {
        let error = '';
        if (name === 'team_name') {
            if (!value) error = 'Team name is required';
            else if (value.length < 3) error = 'Team name must be at least 3 characters';
        }
        if (name === 'captain_name') {
            if (!value) error = 'Captain name is required';
        }
        if (name === 'mobile') {
            if (!value) error = 'Mobile number is required';
            else if (!/^[6789]\d{9}$/.test(value)) error = 'Invalid mobile number. Must be 10 digits and start with 6, 7, 8, or 9';
        }
        if (name === 'village') {
            if (!value) error = 'Village or area is required';
        }
        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'mobile') {
            // Only allow digits and max 10
            const val = value.replace(/\D/g, '').slice(0, 10);
            setFormData({ ...formData, [name]: val });
        } else {
            setFormData({ ...formData, [name]: value });
        }

        // Clear error when user types
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleMobileKeyDown = (e) => {
        // Allow: backspace, delete, tab, escape, enter, numbers
        if ([46, 8, 9, 27, 13, 110].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
            (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
            (e.keyCode === 86 && (e.ctrlKey === true || e.metaKey === true)) ||
            (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }
        // Ensure that it is a number and stop the keypress if length is already 10
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105) || formData.mobile.length >= 10) {
            e.preventDefault();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all fields
        const newErrors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Please fix the errors in the form');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/tournaments/register`, formData);
            toast.success('Registration submitted successfully');
            setMessage(res.data.message || 'Registration submitted successfully. Tournament organizers will review your request.');
            setFormData({ team_name: '', captain_name: '', mobile: '', village: '' });
            setErrors({});
        } catch (err) {
            toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const registrationUrl = window.location.href;

    return (
        <div className="global-container py-5 min-vh-100 bg-light">
            <Toaster position="top-right" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto"
                style={{ maxWidth: '500px' }}
            >
                <AnimatePresence mode="wait">
                    {!showForm && !message ? (
                        <motion.div
                            key="qr-view"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="text-center mb-4 mt-4"
                        >
                            <h1 className="fw-black text-uppercase letter-spacing-1 text-primary mb-2">Tournament Registration</h1>
                            <p className="fw-bold text-muted small mb-3">Scan the QR code to register via your smartphone</p>
                            <div className="bg-white p-4 rounded-4 shadow-sm d-inline-block border">
                                <QRCode
                                    value={registrationUrl}
                                    size={180}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    viewBox={`0 0 256 256`}
                                />
                            </div>
                            <div className="mt-4">
                                <a
                                    href="#register"
                                    onClick={(e) => { e.preventDefault(); setShowForm(true); window.scrollTo(0, 0); }}
                                    className="text-primary fw-black text-uppercase letter-spacing-1 text-decoration-none hover-underline small"
                                >
                                    <i className="bi bi-pencil-square me-2"></i> Click and Register Tournament
                                </a>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form-view"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-100"
                        >
                            {/* FORM CARD */}
                            <div className="cric-card shadow-lg border-0 rounded-4 overflow-hidden mb-5">
                                <div className="bg-primary py-4 px-4 text-center text-white premium-gradient position-relative">
                                    <Button
                                        variant="link"
                                        className="text-white position-absolute start-0 top-50 translate-middle-y ms-2 text-decoration-none p-0"
                                        onClick={() => { setShowForm(false); window.scrollTo(0, 0); }}
                                    >
                                        <i className="bi bi-chevron-left fs-4"></i>
                                    </Button>
                                    <h3 className="fw-black mb-1 letter-spacing-1 text-uppercase">Tournament Registration</h3>
                                    <p className="small opacity-75 mb-0 text-uppercase fw-bold letter-spacing-1">Join the Tournament</p>
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
                                                <p className="text-muted mb-4 fw-medium small">{message}</p>
                                                <Button
                                                    variant="primary"
                                                    className="rounded-pill px-5 py-3 fw-black shadow-sm w-100"
                                                    onClick={() => { setMessage(null); setShowForm(true); }}
                                                >
                                                    REGISTER ANOTHER TEAM
                                                </Button>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="form">
                                                <Form onSubmit={handleSubmit} noValidate>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="x-small fw-black text-muted text-uppercase ms-1">Team Name</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="team_name"
                                                            placeholder="e.g. Rising Stars XI"
                                                            value={formData.team_name}
                                                            onChange={handleChange}
                                                            onBlur={(e) => setErrors({ ...errors, [e.target.name]: validateField(e.target.name, e.target.value) })}
                                                            isInvalid={!!errors.team_name}
                                                            className="py-3 px-4 border-2 bg-light rounded-4 shadow-none fw-bold"
                                                        />
                                                        <Form.Control.Feedback type="invalid" className="ms-2 fw-bold small">
                                                            {errors.team_name}
                                                        </Form.Control.Feedback>
                                                    </Form.Group>

                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="x-small fw-black text-muted text-uppercase ms-1">Captain Name</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="captain_name"
                                                            placeholder="Enter full name"
                                                            value={formData.captain_name}
                                                            onChange={handleChange}
                                                            onBlur={(e) => setErrors({ ...errors, [e.target.name]: validateField(e.target.name, e.target.value) })}
                                                            isInvalid={!!errors.captain_name}
                                                            className="py-3 px-4 border-2 bg-light rounded-4 shadow-none fw-bold"
                                                        />
                                                        <Form.Control.Feedback type="invalid" className="ms-2 fw-bold small">
                                                            {errors.captain_name}
                                                        </Form.Control.Feedback>
                                                    </Form.Group>

                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="x-small fw-black text-muted text-uppercase ms-1">Mobile Number</Form.Label>
                                                        <Form.Control
                                                            type="tel"
                                                            name="mobile"
                                                            placeholder="10-digit number"
                                                            value={formData.mobile}
                                                            onChange={handleChange}
                                                            onBlur={(e) => setErrors({ ...errors, [e.target.name]: validateField(e.target.name, e.target.value) })}
                                                            onKeyDown={handleMobileKeyDown}
                                                            isInvalid={!!errors.mobile}
                                                            className="py-3 px-4 border-2 bg-light rounded-4 shadow-none fw-bold"
                                                        />
                                                        <Form.Control.Feedback type="invalid" className="ms-2 fw-bold small">
                                                            {errors.mobile}
                                                        </Form.Control.Feedback>
                                                    </Form.Group>

                                                    <Form.Group className="mb-4">
                                                        <Form.Label className="x-small fw-black text-muted text-uppercase ms-1">Village / Area</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="village"
                                                            placeholder="Enter location"
                                                            value={formData.village}
                                                            onChange={handleChange}
                                                            onBlur={(e) => setErrors({ ...errors, [e.target.name]: validateField(e.target.name, e.target.value) })}
                                                            isInvalid={!!errors.village}
                                                            className="py-3 px-4 border-2 bg-light rounded-4 shadow-none fw-bold"
                                                        />
                                                        <Form.Control.Feedback type="invalid" className="ms-2 fw-bold small">
                                                            {errors.village}
                                                        </Form.Control.Feedback>
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
                                    <p className="x-small text-muted mb-0 fw-bold letter-spacing-1">QUESTIONS? CONTACT US DIRECTLY +91 77085 22584</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default PublicRegistration;
