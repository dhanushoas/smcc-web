import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Table, Badge, Spinner, Alert, Button, Modal, ListGroup, Row, Col, Card } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import API_URL from '../../utils/api';

const TournamentRegistrations = () => {
    const [registrations, setRegistrations] = useState([]);
    const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedReg, setSelectedReg] = useState(null);
    const [schedulingLoading, setSchedulingLoading] = useState(false);

    const fetchRegistrations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/tournaments/registrations`, {
                headers: { 'x-auth-token': token }
            });
            setRegistrations(Array.isArray(res.data.data) ? res.data.data : []);
            setStats(res.data.stats || { total: 0, approved: 0, rejected: 0 });
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

    const handleGenerateSchedule = async () => {
        if (!window.confirm('This will clear existing tournament matches and generate a new 32-team knockout schedule. Proceed?')) return;

        setSchedulingLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/tournaments/registrations/generate-schedule`, {}, {
                headers: { 'x-auth-token': token }
            });
            toast.success('Tournament schedule generated successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to generate schedule.');
        } finally {
            setSchedulingLoading(false);
        }
    };

    const handleView = (reg) => {
        setSelectedReg(reg);
        setShowViewModal(true);
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center py-5 vh-100">
            <Spinner animation="grow" variant="primary" />
        </div>
    );

    return (
        <div className="py-4 px-3" style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header & Stats Section */}
            <div className="mb-4">
                <Row className="align-items-center g-3">
                    <Col xs={12} md={6}>
                        <h1 className="fw-black premium-gradient-text m-0 mb-2" style={{ fontSize: '1.75rem' }}>TEAM REGISTRATIONS</h1>
                        <Badge bg="dark" className="rounded-pill px-3 py-2 fw-bold letter-spacing-1">
                            {stats.approved} / 32 TOURNAMENT POOL
                        </Badge>
                    </Col>
                    <Col xs={12} md={6}>
                        <div className="d-flex flex-wrap gap-2 justify-content-md-end">
                            <Card className="border-0 shadow-sm bg-white rounded-4 overflow-hidden" style={{ minWidth: '100px' }}>
                                <div className="p-2 text-center">
                                    <div className="x-small fw-black text-muted text-uppercase mb-0">Total</div>
                                    <div className="h5 fw-black m-0 text-primary">{stats.total}</div>
                                </div>
                            </Card>
                            <Card className="border-0 shadow-sm bg-white rounded-4 overflow-hidden" style={{ minWidth: '100px' }}>
                                <div className="p-2 text-center">
                                    <div className="x-small fw-black text-muted text-uppercase mb-0">Approved</div>
                                    <div className="h5 fw-black m-0 text-success">{stats.approved}</div>
                                </div>
                            </Card>
                            <Card className="border-0 shadow-sm bg-white rounded-4 overflow-hidden" style={{ minWidth: '100px' }}>
                                <div className="p-2 text-center">
                                    <div className="x-small fw-black text-muted text-uppercase mb-0">Rejected</div>
                                    <div className="h5 fw-black m-0 text-danger">{stats.rejected}</div>
                                </div>
                            </Card>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* Scheduling Action */}
            {stats.approved >= 32 && (
                <div className="mb-4 p-4 border-0 rounded-4 shadow-sm bg-white text-center premium-border">
                    <h5 className="fw-black text-primary mb-3">TOURNAMENT READY!</h5>
                    <p className="small text-muted mb-3 fw-bold">Exactly 32 teams have been approved. You can now generate the knockout schedule.</p>
                    <Button
                        variant="success"
                        className="rounded-pill px-5 py-3 fw-black shadow-lg premium-gradient border-0 text-uppercase letter-spacing-1"
                        onClick={handleGenerateSchedule}
                        disabled={schedulingLoading}
                    >
                        {schedulingLoading ? <Spinner animation="border" size="sm" /> : <><i className="bi bi-diagram-3-fill me-2"></i> Generate Tournament Schedule</>}
                    </Button>
                </div>
            )}

            {error && <Alert variant="danger" className="rounded-4 border-0 shadow-sm mb-4">{error}</Alert>}

            {/* Registration Table */}
            <div className="cric-card shadow-sm border-0 rounded-4 overflow-hidden bg-white">
                <div className="table-responsive no-scrollbar">
                    <Table hover className="mb-0 align-middle" style={{ minWidth: '800px' }}>
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3 small fw-black text-muted text-uppercase">Team & Captain</th>
                                <th className="py-3 small fw-black text-muted text-uppercase">Contact Info</th>
                                <th className="py-3 small fw-black text-muted text-uppercase">Status</th>
                                <th className="py-3 small fw-black text-muted text-uppercase text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-5 text-muted fw-bold">No registrations found.</td>
                                </tr>
                            ) : (
                                registrations.map((reg) => (
                                    <tr key={reg.id} className="border-bottom">
                                        <td className="px-4 py-3">
                                            <div className="fw-black text-primary text-uppercase letter-spacing-1">{reg.team_name}</div>
                                            <div className="x-small fw-bold text-muted mt-1">CAPTAIN: {reg.captain_name.toUpperCase()}</div>
                                        </td>
                                        <td className="py-3">
                                            <div className="fw-bold small">{reg.mobile}</div>
                                            <div className="x-small text-muted">{reg.village.toUpperCase()}</div>
                                        </td>
                                        <td>
                                            <Badge
                                                bg={reg.status === 'approved' ? 'success' : (reg.status === 'rejected' ? 'danger' : 'warning')}
                                                className="text-uppercase rounded-pill fw-black"
                                                style={{ fontSize: '10px', padding: '5px 12px' }}
                                            >
                                                {reg.status}
                                            </Badge>
                                        </td>
                                        <td className="text-center px-4">
                                            <div className="d-flex gap-2 justify-content-center flex-wrap">
                                                <Button
                                                    variant="dark"
                                                    size="sm"
                                                    className="rounded-pill p-0 d-flex align-items-center justify-content-center shadow-sm"
                                                    style={{ width: '32px', height: '32px' }}
                                                    onClick={() => handleView(reg)}
                                                    title="View Details"
                                                >
                                                    <i className="bi bi-eye-fill"></i>
                                                </Button>

                                                {reg.status !== 'approved' && (
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        className="rounded-pill px-3 fw-black x-small shadow-sm"
                                                        onClick={() => handleAction(reg.id, 'approve')}
                                                        disabled={actionLoading === reg.id}
                                                    >
                                                        APPROVE
                                                    </Button>
                                                )}

                                                {reg.status === 'pending' && (
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        className="rounded-pill px-3 fw-black x-small shadow-sm"
                                                        onClick={() => handleAction(reg.id, 'reject')}
                                                        disabled={actionLoading === reg.id}
                                                    >
                                                        REJECT
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    className="rounded-pill p-0 d-flex align-items-center justify-content-center shadow-sm"
                                                    style={{ width: '32px', height: '32px' }}
                                                    onClick={() => handleAction(reg.id, 'delete')}
                                                    disabled={actionLoading === reg.id}
                                                    title="Delete"
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
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="bg-primary text-white premium-gradient border-0 px-4">
                    <Modal.Title className="fw-black text-uppercase letter-spacing-1 h6 m-0">Registration Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    {selectedReg && (
                        <ListGroup variant="flush">
                            <ListGroup.Item className="d-flex justify-content-between p-4 border-0 border-bottom">
                                <span className="text-muted x-small fw-black text-uppercase">Team Name</span>
                                <span className="fw-black text-primary text-uppercase">{selectedReg.team_name}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between p-4 border-0 border-bottom">
                                <span className="text-muted x-small fw-black text-uppercase">Captain Name</span>
                                <span className="fw-bold">{selectedReg.captain_name}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between p-4 border-0 border-bottom">
                                <span className="text-muted x-small fw-black text-uppercase">Mobile Contact</span>
                                <span className="fw-bold text-dark">{selectedReg.mobile}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between p-4 border-0 border-bottom">
                                <span className="text-muted x-small fw-black text-uppercase">Village / Area</span>
                                <span className="fw-bold text-dark">{selectedReg.village}</span>
                            </ListGroup.Item>
                            <ListGroup.Item className="d-flex justify-content-between p-4 border-0">
                                <span className="text-muted x-small fw-black text-uppercase">Current Status</span>
                                <Badge bg={selectedReg.status === 'approved' ? 'success' : (selectedReg.status === 'rejected' ? 'danger' : 'warning')} className="text-uppercase rounded-pill px-3">
                                    {selectedReg.status}
                                </Badge>
                            </ListGroup.Item>
                        </ListGroup>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 p-4 pt-0">
                    <Button variant="light" className="w-100 rounded-pill py-3 fw-black text-uppercase small shadow-none border" onClick={() => setShowViewModal(false)}>
                        Dismiss
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Mobile CSS Helper */}
            <style>{`
                .letter-spacing-1 { letter-spacing: 1px; }
                .fw-black { font-weight: 900; }
                .x-small { font-size: 0.65rem; }
                .premium-border { border: 2px solid #eef2f7; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @media (max-width: 768px) {
                    .fluid-text-h2 { font-size: 1.5rem !important; }
                    .cric-card { border-radius: 1rem !important; }
                }
            `}</style>
        </div>
    );
};

export default TournamentRegistrations;
