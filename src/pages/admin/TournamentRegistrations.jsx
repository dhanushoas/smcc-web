import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import API_URL from '../../utils/api';

const TournamentRegistrations = () => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchRegistrations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/tournaments/registrations`, {
                headers: { 'x-auth-token': token }
            });
            // The interceptor might unwrap data
            setRegistrations(Array.isArray(res.data) ? res.data : (res.data.data || []));
        } catch (err) {
            setError('Failed to load registrations.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistrations();
    }, []);

    const handleAction = async (id, action) => {
        setActionLoading(id);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/tournaments/registrations/${id}/${action}`, {}, {
                headers: { 'x-auth-token': token }
            });
            toast.success(`Registration ${action} successful!`);
            fetchRegistrations();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${action} registration.`);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="grow" variant="primary" />
        </div>
    );

    return (
        <div className="global-container py-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-5">
                <h1 className="fw-black premium-gradient-text m-0 fluid-text-h2">TEAM REGISTRATIONS</h1>
                <Badge bg="primary" className="rounded-pill px-3 py-2 fw-bold">
                    {registrations.length} / 32 REGISTERED
                </Badge>
            </div>

            {error && <Alert variant="danger" className="rounded-4 border-0 shadow-sm">{error}</Alert>}

            <div className="cric-card shadow-sm border-0 rounded-4 overflow-hidden">
                <div className="p-0">
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3 small fw-black text-muted text-uppercase">Team Name</th>
                                <th className="py-3 small fw-black text-muted text-uppercase">Captain</th>
                                <th className="py-3 small fw-black text-muted text-uppercase d-none d-md-table-cell">Mobile</th>
                                <th className="py-3 small fw-black text-muted text-uppercase d-none d-lg-table-cell">Village</th>
                                <th className="py-3 small fw-black text-muted text-uppercase">Status</th>
                                <th className="py-3 small fw-black text-muted text-uppercase text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted fw-bold">No registrations found.</td>
                                </tr>
                            ) : (
                                registrations.map((reg) => (
                                    <tr key={reg.id}>
                                        <td className="px-4 fw-bold text-primary">{reg.team_name.toUpperCase()}</td>
                                        <td>{reg.captain_name}</td>
                                        <td className="d-none d-md-table-cell">{reg.mobile}</td>
                                        <td className="d-none d-lg-table-cell text-muted">{reg.village}</td>
                                        <td>
                                            <Badge
                                                bg={reg.status === 'approved' ? 'success' : (reg.status === 'rejected' ? 'danger' : 'warning')}
                                                className="text-uppercase rounded-pill"
                                                style={{ fontSize: '10px' }}
                                            >
                                                {reg.status}
                                            </Badge>
                                        </td>
                                        <td className="text-center px-3">
                                            {reg.status === 'pending' && (
                                                <div className="d-flex gap-2 justify-content-center">
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        className="rounded-pill px-3 fw-bold x-small"
                                                        onClick={() => handleAction(reg.id, 'approve')}
                                                        disabled={actionLoading === reg.id}
                                                    >
                                                        {actionLoading === reg.id ? <Spinner animation="border" size="sm" /> : 'APPROVE'}
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        className="rounded-pill px-3 fw-bold x-small"
                                                        onClick={() => handleAction(reg.id, 'reject')}
                                                        disabled={actionLoading === reg.id}
                                                    >
                                                        REJECT
                                                    </Button>
                                                </div>
                                            )}
                                            {reg.status !== 'pending' && (
                                                <span className="text-muted x-small fw-bold">PROCESSED</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default TournamentRegistrations;
