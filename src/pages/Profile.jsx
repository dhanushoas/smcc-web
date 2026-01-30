import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { username, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, formData);
            localStorage.setItem('token', res.data.token);
            setToken(res.data.token);
            setError('');
        } catch (err) {
            setError(err.response?.data?.msg || 'Login failed');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        navigate('/');
    };

    if (token) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <Row className="w-100">
                    <Col md={{ span: 6, offset: 3 }} lg={{ span: 4, offset: 4 }}>
                        <Card className="shadow-lg border-0">
                            <Card.Body className="p-5 text-center">
                                <h2 className="fw-bold mb-4 text-primary">Profile</h2>
                                <div className="mb-4">
                                    <p className="lead">Welcome, Admin!</p>
                                    <p className="text-muted small">You have full access to manage matches and scorecards.</p>
                                </div>
                                <div className="d-grid gap-3">
                                    <Button variant="primary" size="lg" onClick={() => navigate('/admin')}>
                                        Go to Admin Dashboard
                                    </Button>
                                    <Button variant="outline-danger" onClick={handleLogout}>
                                        Logout
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        );
    }

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <Row className="w-100">
                <Col md={{ span: 6, offset: 3 }} lg={{ span: 4, offset: 4 }}>
                    <Card className="shadow-lg border-0">
                        <Card.Body className="p-5 text-center">
                            <h2 className="fw-bold mb-4 text-primary">Admin Login</h2>
                            <p className="text-muted small mb-4">Public users do not need to login to view matches.</p>
                            {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                            <Form onSubmit={onSubmit} className="text-start">
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="username"
                                        value={username}
                                        onChange={onChange}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold">Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        name="password"
                                        value={password}
                                        onChange={onChange}
                                        required
                                    />
                                </Form.Group>
                                <Button variant="primary" type="submit" className="w-100 py-2 fw-bold">
                                    Sign In
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                    <div className="text-center mt-3 text-muted small">
                        &copy; 2026 S Mettur Cricket Council
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default Profile;
