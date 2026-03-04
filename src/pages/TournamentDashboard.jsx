import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Button, Form, Modal, Spinner, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import API_URL from '../utils/api';

const TournamentDashboard = () => {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        totalTeams: 8,
        type: 'league_knockout',
        description: '',
        venue: '',
        organizer: 'SMCC',
        ballType: 'tennis',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        startTime: '09:00',
        matchGapMinutes: 60,
        settings: { oversPerMatch: 20, pointsPerWin: 2, pointsPerTie: 1, pointsPerLoss: 0, pointsPerNoResult: 1 }
    });

    const navigate = useNavigate();

    useEffect(() => { fetchTournaments(); }, []);

    const fetchTournaments = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/tournaments`);
            if (res.data.success) setTournaments(res.data.data);
        } catch (err) {
            toast.error("Failed to load tournaments");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error("Tournament name is required");
        if (!form.venue.trim()) return toast.error("Venue is required");

        setIsSaving(true);
        try {
            // Convert 24-hr time to "HH:MM AM/PM" for backend
            const [h24, m] = form.startTime.split(':').map(Number);
            const ampm = h24 >= 12 ? 'PM' : 'AM';
            const h12 = h24 % 12 || 12;
            const startTime12 = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;

            const payload = {
                ...form,
                startTime: startTime12,
                matchGapMinutes: Number(form.matchGapMinutes),
                settings: { ...form.settings, oversPerMatch: Number(form.settings.oversPerMatch) }
            };

            const res = await axios.post(`${API_URL}/api/tournaments`, payload);
            if (res.data.success) {
                toast.success("Tournament created successfully!");
                setShowCreateModal(false);
                fetchTournaments();
                // Auto-redirect to the new tournament detail page
                navigate(`/tournaments/${res.data.data.id}`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Create failed");
        } finally {
            setIsSaving(false);
        }
    };

    const updateSetting = (key, val) => setForm(f => ({ ...f, settings: { ...f.settings, [key]: val } }));

    const TYPE_LABELS = { league: 'League', knockout: 'Knockout', league_knockout: 'Group + KO' };

    return (
        <Container className="py-5 min-vh-100">
            <Toaster position="top-right" />
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="d-flex justify-content-between align-items-center mb-5">
                <div>
                    <h1 className="fw-black premium-gradient-text mb-0">TOURNAMENTS</h1>
                    <p className="text-muted small fw-bold text-uppercase letter-spacing-1">Manage cricket tournaments</p>
                </div>
                <Button variant="primary" className="rounded-pill px-4 py-2 fw-bold shadow-sm" onClick={() => setShowCreateModal(true)}>
                    <i className="bi bi-plus-lg me-2"></i>CREATE TOURNAMENT
                </Button>
            </motion.div>

            {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : tournaments.length === 0 ? (
                <Alert variant="info" className="text-center rounded-4 py-5 border-0 shadow-sm">
                    <i className="bi bi-trophy fs-1 mb-3 d-block text-primary opacity-50"></i>
                    <h4 className="fw-bold">No Tournaments Found</h4>
                    <p className="mb-0 text-muted">Start by creating your first tournament!</p>
                </Alert>
            ) : (
                <Row className="g-4">
                    <AnimatePresence>
                        {tournaments.map((t, idx) => (
                            <Col key={t.id} lg={4} md={6}>
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.07 }} whileHover={{ y: -5 }}>
                                    <Card className="h-100 border-0 shadow-sm rounded-4 overflow-hidden card-hover" onClick={() => navigate(`/tournaments/${t.id}`)} style={{ cursor: 'pointer' }}>
                                        <div className="bg-primary p-3 text-white d-flex justify-content-between align-items-center">
                                            <Badge bg="light" text="dark" className="text-uppercase small fw-black">{TYPE_LABELS[t.type] || t.type}</Badge>
                                            <div className="d-flex gap-2 align-items-center">
                                                {t.ballType && <Badge bg="secondary" className="text-uppercase x-small fw-bold">{t.ballType} ball</Badge>}
                                                <Badge bg={t.status === 'completed' ? 'success' : t.status === 'ongoing' ? 'danger' : 'secondary'} className="text-uppercase x-small fw-bold">{t.status}</Badge>
                                            </div>
                                        </div>
                                        <Card.Body className="p-4">
                                            <h4 className="fw-black mb-1">{t.name}</h4>
                                            {t.organizer && <p className="x-small fw-bold text-muted text-uppercase mb-1"><i className="bi bi-people me-1"></i>{t.organizer}</p>}
                                            {t.venue && <p className="x-small fw-bold text-muted text-uppercase mb-3"><i className="bi bi-geo-alt me-1"></i>{t.venue}</p>}
                                            {!t.venue && !t.organizer && <p className="text-muted small mb-4">{t.description || 'No description provided.'}</p>}
                                            <div className="d-flex gap-3 mt-auto">
                                                <div className="text-center p-2 bg-light rounded-3 flex-grow-1">
                                                    <div className="x-small fw-bold text-muted">TEAMS</div>
                                                    <div className="fs-5 fw-black text-primary">{t.totalTeams}</div>
                                                </div>
                                                <div className="text-center p-2 bg-light rounded-3 flex-grow-1">
                                                    <div className="x-small fw-bold text-muted">FORMAT</div>
                                                    <div className="fs-6 fw-bold text-dark mt-1">{TYPE_LABELS[t.type] || t.type}</div>
                                                </div>
                                                {t.matchGapMinutes && (
                                                    <div className="text-center p-2 bg-light rounded-3 flex-grow-1">
                                                        <div className="x-small fw-bold text-muted">GAP</div>
                                                        <div className="fs-6 fw-bold text-dark mt-1">{t.matchGapMinutes}m</div>
                                                    </div>
                                                )}
                                            </div>
                                        </Card.Body>
                                        <Card.Footer className="bg-white border-0 p-4 pt-0">
                                            <Button variant="outline-primary" className="w-100 rounded-pill fw-bold small py-2">
                                                MANAGE <i className="bi bi-arrow-right ms-1"></i>
                                            </Button>
                                        </Card.Footer>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </AnimatePresence>
                </Row>
            )}

            {/* ── Create Tournament Modal ── */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-black text-primary"><i className="bi bi-trophy me-2"></i>NEW TOURNAMENT</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form onSubmit={handleCreate}>
                        <Row className="g-3">
                            {/* Tournament Name */}
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Tournament Name <span className="text-danger">*</span></Form.Label>
                                    <Form.Control required placeholder="E.g. SMCC District League 2026" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </Form.Group>
                            </Col>

                            {/* Type + Total Teams */}
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Format</Form.Label>
                                    <Form.Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="league_knockout">Group + Knockout</option>
                                        <option value="knockout">Pure Knockout</option>
                                        <option value="league">Pure League</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Total Teams</Form.Label>
                                    <Form.Select value={form.totalTeams} onChange={e => setForm({ ...form, totalTeams: parseInt(e.target.value) })}>
                                        {[8, 12, 16, 20, 24, 32].map(n => <option key={n} value={n}>{n} Teams</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Overs Per Match</Form.Label>
                                    <Form.Control type="number" min="1" max="50" value={form.settings.oversPerMatch} onChange={e => updateSetting('oversPerMatch', parseInt(e.target.value))} />
                                </Form.Group>
                            </Col>

                            {/* Venue + Organizer */}
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Venue <span className="text-danger">*</span></Form.Label>
                                    <Form.Control placeholder="Ground / Stadium" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Organizer</Form.Label>
                                    <Form.Control placeholder="E.g. SMCC" value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} />
                                </Form.Group>
                            </Col>

                            {/* Ball Type */}
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Ball Type</Form.Label>
                                    <Form.Select value={form.ballType} onChange={e => setForm({ ...form, ballType: e.target.value })}>
                                        <option value="tennis">Tennis Ball</option>
                                        <option value="leather">Leather Ball</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {/* Start Date + End Date */}
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Start Date</Form.Label>
                                    <Form.Control type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">End Date</Form.Label>
                                    <Form.Control type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                                </Form.Group>
                            </Col>

                            {/* Start Time + Match Gap */}
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">First Match Start Time</Form.Label>
                                    <Form.Control type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Gap Between Matches (minutes)</Form.Label>
                                    <Form.Select value={form.matchGapMinutes} onChange={e => setForm({ ...form, matchGapMinutes: parseInt(e.target.value) })}>
                                        {[30, 45, 60, 90, 120].map(g => <option key={g} value={g}>{g} min</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {/* Description */}
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Description (Optional)</Form.Label>
                                    <Form.Control as="textarea" rows={2} placeholder="Rules, prizes, eligibility..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className="mt-4 p-3 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-25 x-small fw-bold text-primary">
                            <i className="bi bi-info-circle me-1"></i>
                            After creation, you'll be redirected to the Tournament Management page to register teams and generate matches.
                        </div>

                        <Button variant="primary" type="submit" className="w-100 rounded-pill fw-bold py-3 mt-3" disabled={isSaving}>
                            {isSaving ? <Spinner animation="border" size="sm" /> : <><i className="bi bi-trophy me-2"></i>INITIALIZE TOURNAMENT</>}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default TournamentDashboard;
