import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import API_URL from '../utils/api';
import { toast } from 'react-hot-toast';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, {
                username,
                password,
                platform: 'web'
            });

            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('userId', user.id);

            if (user.role !== 'admin') {
                setError('Access denied. Admin credentials required.');
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                setLoading(false);
                return;
            }

            toast.success('Logged in as Admin (Web)');
            navigate('/admin');
        } catch (err) {
            const msg = err.response?.data?.msg || 'Login failed. Check your credentials.';
            // If another admin is locked in, still allow override on next attempt
            // The backend now force-logs out the other platform automatically.
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ width: '100%', maxWidth: '420px' }}
            >
                <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
                    {/* Header */}
                    <div className="bg-primary p-4 text-center text-white">
                        <div className="fs-1 mb-2">🛡️</div>
                        <h4 className="fw-black mb-1 letter-spacing-1">ADMIN CONSOLE</h4>
                        <p className="opacity-75 small mb-0">Sign in to access the dashboard</p>
                    </div>

                    <Card.Body className="p-4">
                        {error && (
                            <Alert variant="danger" className="rounded-3 fw-semibold text-center">
                                {error}
                            </Alert>
                        )}
                        <Form onSubmit={handleLogin}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small text-uppercase text-muted">Username</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter admin username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="rounded-3 py-2"
                                    required
                                    autoFocus
                                />
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold small text-uppercase text-muted">Password</Form.Label>
                                <div className="input-group">
                                    <Form.Control
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="rounded-start-3 py-2"
                                        required
                                    />
                                    <Button
                                        variant="outline-secondary"
                                        className="rounded-end-3 px-3"
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        tabIndex={-1}
                                    >
                                        <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                                    </Button>
                                </div>
                            </Form.Group>
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-100 py-2 fw-black rounded-3"
                                disabled={loading}
                            >
                                {loading ? <><Spinner size="sm" className="me-2" />Signing in…</> : 'SIGN IN →'}
                            </Button>
                        </Form>

                        <p className="text-center text-muted small mt-3 mb-0">
                            🔐 Single session enforced across Web &amp; Mobile
                        </p>
                    </Card.Body>
                </Card>
            </motion.div>
        </Container>
    );
};

export default AdminLogin;
