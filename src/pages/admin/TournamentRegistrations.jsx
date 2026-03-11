import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Table, Badge, Card, Spinner, Alert } from 'react-bootstrap';
import API_URL from '../../utils/api';

const TournamentRegistrations = () => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRegistrations = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/tournament/registrations`, {
                    headers: { 'x-auth-token': token }
                });
                // The interceptor unwraps res.data.data into res.data
                setRegistrations(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                setError('Failed to load registrations.');
            } finally {
                setLoading(false);
            }
        };

        fetchRegistrations();
    }, []);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" variant="primary" />
        </div>
    );

    return (
        <Container className="py-4">
            <h2 className="fw-black mb-4">TOURNAMENT REGISTRATIONS</h2>
            {error && <Alert variant="danger">{error}</Alert>}

            <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3 small fw-black text-muted text-uppercase">Team Name</th>
                                <th className="py-3 small fw-black text-muted text-uppercase">Captain</th>
                                <th className="py-3 small fw-black text-muted text-uppercase">Mobile</th>
                                <th className="py-3 small fw-black text-muted text-uppercase">Village</th>
                                <th className="py-3 small fw-black text-muted text-uppercase">Date</th>
                                <th className="py-3 small fw-black text-muted text-uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">No registrations found.</td>
                                </tr>
                            ) : (
                                registrations.map((reg) => (
                                    <tr key={reg.id}>
                                        <td className="px-4 fw-bold">{reg.team_name}</td>
                                        <td>{reg.captain_name}</td>
                                        <td>{reg.mobile}</td>
                                        <td>{reg.village}</td>
                                        <td className="small text-muted">
                                            {new Date(reg.createdAt).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <Badge bg="info" className="text-uppercase" style={{ fontSize: '0.7rem' }}>
                                                {reg.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
                <Card.Footer className="bg-white py-3 px-4 border-0">
                    <p className="small text-muted mb-0 fw-bold">
                        Total Registrations: {registrations.length} / 32
                    </p>
                </Card.Footer>
            </Card>
        </Container>
    );
};

export default TournamentRegistrations;
