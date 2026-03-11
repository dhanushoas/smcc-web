import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Table, Badge, Spinner, Alert, Button, Modal, ListGroup } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import API_URL from '../../utils/api';

const TournamentRegistrations = () => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedReg, setSelectedReg] = useState(null);

    const fetchRegistrations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/tournaments/registrations`, {
                headers: { 'x-auth-token': token }
            });
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
            if (action === 'delete') {
                if (!window.confirm('Are you sure you want to delete this registration?')) return;
                await axios.delete(`${API_URL}/api/tournaments/registrations/${id}`, {
                    headers: { 'x-auth-token': token }
                });
            } else {
                await axios.put(`${API_URL}/api/tournaments/registrations/${id}/${action}`, {}, {
                    headers: { 'x-auth-token': token }
                });
            }
            toast.success(`Registration ${action} successful!`);
            fetchRegistrations();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${action} registration.`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleView = (reg) => {
        setSelectedReg(reg);
        setShowViewModal(true);
    };

    const approvedCount = registrations.filter(r => r.status === 'approved').length;

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="grow" variant="primary" />
        </div>
    );

    return (
        <div className="global-container py-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-5">
                <h1 className="fw-black premium-gradient-text m-0 fluid-text-h2">TEAM REGISTRATIONS</h1>
                <div className="d-flex align-items-center gap-3">
                    <Badge bg="primary" className="rounded-pill px-3 py-2 fw-bold">
                        {approvedCount} / 32 APPROVED
                    </Badge>
                    {approvedCount >= 32 && (
                        <Button
                            as={Link}
                            to="/admin"
                            variant="success"
                            className="rounded-pill px-4 py-2 fw-black shadow-sm premium-gradient border-0 text-uppercase x-small letter-spacing-1"
                        >
                            <i className="bi bi-trophy-fill me-2"></i> Create Tournament & Matches
                        </Button>
                    )}
                </div>
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
                                            <div className="d-flex gap-2 justify-content-center">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    className="rounded-pill p-1 d-flex align-items-center justify-content-center"
                                                    style={{ width: '28px', height: '28px' }}
                                                    onClick={() => handleView(reg)}
                                                    title="View Details"
                                                >
                                                    <i className="bi bi-eye-fill"></i>
                                                </Button>

                                                {reg.status === 'pending' && (
                                                    <>
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
                                                    </>
                                                )}

                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    className="rounded-pill p-1 d-flex align-items-center justify-content-center"
                                                    style={{ width: '28px', height: '28px' }}
                                                    onClick={() => handleAction(reg.id, 'delete')}
                                                    disabled={actionLoading === reg.id}
                                                    title="Delete Registration"
                                                >
                                                    <i className="bi bi-trash-fill"></i>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>

            {/* View Details Modal */}
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white premium-gradient">
                    <Modal.Title className="fw-black text-uppercase letter-spacing-1">Registration Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedReg && (
                        <ListGroup variant="flush" className="rounded-4 overflow-hidden border">
                            <ListGroup.Item className="d-flex justify-content-between p-3">
                                <span className="text-muted small fw-bold text-uppercase">Team Name</span>
                                <span className="fw-black text-primary">{selectedReg.team_name.toUpperCase()}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between p-3">
                                <span className="text-muted small fw-bold text-uppercase">Captain</span>
                                <span className="fw-bold">{selectedReg.captain_name}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between p-3">
                                <span className="text-muted small fw-bold text-uppercase">Mobile</span>
                                <span className="fw-bold">{selectedReg.mobile}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between p-3">
                                <span className="text-muted small fw-bold text-uppercase">Village/Area</span>
                                <span className="fw-bold">{selectedReg.village}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between p-3">
                                <span className="text-muted small fw-bold text-uppercase">Status</span>
                                <Badge bg={selectedReg.status === 'approved' ? 'success' : (selectedReg.status === 'rejected' ? 'danger' : 'warning')} className="text-uppercase rounded-pill">
                                    {selectedReg.status}
                                </Badge>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between p-3">
                                <span className="text-muted small fw-bold text-uppercase">Registered On</span>
                                <span className="small text-muted">{new Date(selectedReg.created_at).toLocaleString()}</span>
                            </ListGroup.Item>
                        </ListGroup>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 p-3">
                    <Button variant="secondary" className="rounded-pill px-4 fw-bold" onClick={() => setShowViewModal(false)}>
                        CLOSE
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default TournamentRegistrations;
