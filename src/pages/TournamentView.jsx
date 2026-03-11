import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Nav, Spinner, Modal, Alert } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import API_URL from '../utils/api';

// ── Helper: format ISO date to "10:00 AM • Mar 5" ──────────────────────────
const fmtDate = (d) => {
    if (!d) return 'TBD';
    const dt = new Date(d);
    const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${time} • ${date}`;
};
const titleCase = (s) => (s || '').split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');

const ROLES = ['Batsman', 'Bowler', 'All Rounder', 'Wicket Keeper'];
const BATTING_STYLES = ['Right Handed', 'Left Handed'];
const BOWLING_STYLES = ['Right Arm Fast', 'Right Arm Medium', 'Right Arm Spin', 'Left Arm Fast', 'Left Arm Spin', 'Does Not Bowl'];

const emptyPlayer = () => ({ name: '', role: 'Batsman', jerseyNumber: '', battingStyle: 'Right Handed', bowlingStyle: 'Right Arm Medium', mobile: '' });

const TournamentView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pointsTable, setPointsTable] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [isSaving, setIsSaving] = useState(false);

    // Team Registration
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [poolTeams, setPoolTeams] = useState([]);
    const [selectedPoolTeamId, setSelectedPoolTeamId] = useState('');
    const [newTeam, setNewTeam] = useState({ name: '', captain: '', captainMobile: '', district: '', manager: '' });

    const fetchPoolTeams = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/tournaments/teams/pool`);
            if (res.data.success) setPoolTeams(res.data.data);
        } catch (err) { }
    };

    useEffect(() => {
        if (showTeamModal) fetchPoolTeams();
    }, [showTeamModal]);

    // Player Registration
    const [showPlayersModal, setShowPlayersModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [players, setPlayers] = useState([emptyPlayer()]);

    const fetchTournament = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/tournaments/${id}`);
            if (res.data.success) setTournament(res.data.data);
        } catch {
            toast.error("Failed to load tournament");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchPointsTable = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/tournaments/${id}/points-table`);
            if (res.data.success) setPointsTable(res.data.data);
        } catch { }
    }, [id]);

    useEffect(() => { fetchTournament(); fetchPointsTable(); }, [fetchTournament, fetchPointsTable]);

    // ── Register Team ──────────────────────────────────────────────────────────
    const handleRegisterTeam = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (selectedPoolTeamId) {
                // Link existing team to this tournament
                await axios.put(`${API_URL}/api/tournaments/${id}/teams/${selectedPoolTeamId}`, { tournamentId: id });
                toast.success("Team added from pool!");
            } else {
                if (!newTeam.name.trim()) return toast.error("Team name is required");
                await axios.post(`${API_URL}/api/tournaments/${id}/teams`, newTeam);
                toast.success("New team registered!");
            }
            setShowTeamModal(false);
            setNewTeam({ name: '', captain: '', captainMobile: '', district: '', manager: '' });
            setSelectedPoolTeamId('');
            fetchTournament();
        } catch (err) {
            toast.error(err.response?.data?.message || "Registration failed");
        } finally { setIsSaving(false); }
    };

    // ── Open player modal for a team ────────────────────────────────────────────
    const openPlayersModal = (team) => {
        setSelectedTeam(team);
        const existing = Array.isArray(team.players) && team.players.length > 0 && typeof team.players[0] === 'object'
            ? team.players
            : team.players.map(p => typeof p === 'string' ? { ...emptyPlayer(), name: p } : p);
        setPlayers(existing.length > 0 ? existing : [emptyPlayer()]);
        setShowPlayersModal(true);
    };

    const updatePlayer = (idx, field, val) => setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
    const addPlayer = () => setPlayers(prev => [...prev, emptyPlayer()]);
    const removePlayer = (idx) => setPlayers(prev => prev.filter((_, i) => i !== idx));

    const handleUpdatePlayers = async (e) => {
        e.preventDefault();
        const valid = players.filter(p => p.name.trim());
        if (valid.length === 0) return toast.error("Add at least one player");
        setIsSaving(true);
        try {
            await axios.put(`${API_URL}/api/tournaments/${id}/teams/${selectedTeam.id}`, { players: valid });
            toast.success(`Squad updated (${valid.length} players)!`);
            setShowPlayersModal(false);
            fetchTournament();
        } catch { toast.error("Update failed"); }
        finally { setIsSaving(false); }
    };

    // ── Backend Action Runner ─────────────────────────────────────────────────
    const runAction = async (action, msg) => {
        try {
            setLoading(true);
            await axios.post(`${API_URL}/api/tournaments/${id}/${action}`);
            toast.success(msg);
            fetchTournament();
            fetchPointsTable();
        } catch (err) {
            toast.error(err.response?.data?.message || "Action failed");
        } finally { setLoading(false); }
    };

    if (loading && !tournament) return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;
    if (!tournament) return <div className="text-center py-5"><h4>Tournament not found</h4><Button variant="outline-primary" onClick={() => navigate('/tournaments')}>Back</Button></div>;

    const groupMatches = tournament.matches.filter(m => m.tournamentRound === 'group').sort((a, b) => new Date(a.date) - new Date(b.date));
    const knockoutMatches = tournament.matches.filter(m => m.tournamentRound !== 'group' && m.tournamentRound !== 'none');
    const TYPE_LABELS = { league: 'League', knockout: 'Knockout', league_knockout: 'Group + KO' };

    return (
        <div className="global-container py-4 min-vh-100">
            <Toaster position="top-right" />

            {/* ── Header ───────────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                <div className="bg-white rounded-4 shadow-sm border-0 overflow-hidden">
                    <div className="bg-primary p-4 text-white">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                            <div>
                                <div className="d-flex gap-2 mb-2">
                                    <Badge bg="warning" text="dark" className="text-uppercase fw-bold x-small">{TYPE_LABELS[tournament.type] || tournament.type}</Badge>
                                    <Badge bg={tournament.status === 'completed' ? 'success' : tournament.status === 'ongoing' ? 'danger' : 'secondary'} className="text-uppercase fw-bold x-small">{tournament.status}</Badge>
                                    {tournament.ballType && <Badge bg="dark" className="text-uppercase fw-bold x-small">{tournament.ballType} ball</Badge>}
                                </div>
                                <h2 className="fw-black mb-1 text-white">{tournament.name.toUpperCase()}</h2>
                                <div className="d-flex gap-3 flex-wrap mt-2">
                                    {tournament.venue && <span className="small opacity-75"><i className="bi bi-geo-alt me-1"></i>{titleCase(tournament.venue)}</span>}
                                    {tournament.organizer && <span className="small opacity-75"><i className="bi bi-building me-1"></i>{tournament.organizer}</span>}
                                    {tournament.startDate && <span className="small opacity-75"><i className="bi bi-calendar me-1"></i>{new Date(tournament.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                                    {tournament.settings?.oversPerMatch && <span className="small opacity-75"><i className="bi bi-clock me-1"></i>{tournament.settings.oversPerMatch} Overs</span>}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="fs-1 fw-black">{tournament.teams.length}<span className="fs-6 fw-bold opacity-75">/{tournament.totalTeams}</span></div>
                                <div className="x-small fw-bold opacity-75 text-uppercase">Teams Registered</div>
                            </div>
                        </div>
                    </div>

                    {/* ── Admin Action Buttons ──────────────────────────────────── */}
                    <div className="p-3 bg-light border-top d-flex gap-2 flex-wrap">
                        <Button size="sm" variant="primary" onClick={() => setShowTeamModal(true)} disabled={tournament.teams.length >= tournament.totalTeams}>
                            <i className="bi bi-plus-circle me-1"></i> Register Team
                        </Button>
                        <Button size="sm" variant="outline-success" onClick={() => runAction('generate-groups', 'Groups generated!')} disabled={tournament.teams.length < 2}>
                            <i className="bi bi-grid me-1"></i> Generate Groups
                        </Button>
                        <Button size="sm" variant="outline-warning" onClick={() => runAction('generate-schedule', 'Schedule generated!')} disabled={tournament.groups.length === 0}>
                            <i className="bi bi-calendar-event me-1"></i> Generate Schedule
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => runAction('generate-knockouts', 'Knockout bracket ready!')} disabled={groupMatches.length === 0}>
                            <i className="bi bi-trophy me-1"></i> Generate Knockouts
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* ── Tabs ─────────────────────────────────────────────────────────── */}
            <Nav variant="pills" className="gap-2 mb-4" activeKey={activeTab} onSelect={k => setActiveTab(k)}>
                {[['overview', 'bi-house', 'Overview'], ['teams', 'bi-people', 'Teams'], ['schedule', 'bi-calendar3', 'Schedule'], ['points', 'bi-bar-chart', 'Points Table'], ['bracket', 'bi-trophy', 'Bracket']].map(([key, icon, label]) => (
                    <Nav.Item key={key}>
                        <Nav.Link eventKey={key} className="fw-bold x-small px-3 py-2 rounded-pill">
                            <i className={`bi ${icon} me-1`}></i>{label}
                        </Nav.Link>
                    </Nav.Item>
                ))}
            </Nav>

            {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <Row className="g-4">
                    <Col lg={8}>
                        <Card className="border-0 shadow-sm rounded-4 mb-4">
                            <Card.Body className="p-4">
                                <h5 className="fw-black text-primary mb-4">QUICK STATS</h5>
                                <Row className="g-3 text-center">
                                    {[
                                        ['Teams', tournament.teams.length],
                                        ['Group Matches', groupMatches.length],
                                        ['KO Matches', knockoutMatches.length],
                                        ['Overs', tournament.settings?.oversPerMatch || 20],
                                        ['Gap', `${tournament.matchGapMinutes || 60}m`],
                                        ['Groups', tournament.groups.length],
                                    ].map(([label, val]) => (
                                        <Col xs={4} md={2} key={label}>
                                            <div className="p-3 bg-light rounded-4">
                                                <div className="fw-black fs-4 text-primary">{val}</div>
                                                <div className="x-small fw-bold text-muted text-uppercase">{label}</div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </Card.Body>
                        </Card>

                        {/* Group composition */}
                        {tournament.groups.length > 0 && (
                            <Card className="border-0 shadow-sm rounded-4">
                                <Card.Body className="p-4">
                                    <h5 className="fw-black mb-4">GROUPS</h5>
                                    <Row className="g-3">
                                        {tournament.groups.map(g => {
                                            const groupTeams = tournament.teams.filter(t => t.groupId === g.id);
                                            return (
                                                <Col md={6} key={g.id}>
                                                    <div className="p-3 border rounded-4 bg-light">
                                                        <div className="fw-black text-primary mb-2">{g.name}</div>
                                                        {groupTeams.map(t => (
                                                            <div key={t.id} className="x-small fw-bold text-muted py-1 border-bottom">{t.name}</div>
                                                        ))}
                                                    </div>
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </Card.Body>
                            </Card>
                        )}
                    </Col>
                    <Col lg={4}>
                        <Card className="border-0 shadow-sm rounded-4">
                            <Card.Body className="p-4">
                                <h5 className="fw-black mb-3">TOURNAMENT INFO</h5>
                                {[
                                    ['Venue', titleCase(tournament.venue), 'bi-geo-alt'],
                                    ['Organizer', tournament.organizer, 'bi-building'],
                                    ['Ball Type', titleCase(tournament.ballType), 'bi-circle'],
                                    ['Format', TYPE_LABELS[tournament.type], 'bi-grid'],
                                    ['Start Time', tournament.startTime, 'bi-clock'],
                                    ['Match Gap', `${tournament.matchGapMinutes} minutes`, 'bi-arrow-right'],
                                ].filter(([, v]) => v).map(([label, val, icon]) => (
                                    <div key={label} className="d-flex justify-content-between py-2 border-bottom">
                                        <span className="x-small fw-bold text-muted"><i className={`bi ${icon} me-1`}></i>{label}</span>
                                        <span className="x-small fw-black">{val}</span>
                                    </div>
                                ))}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* ── TEAMS TAB ──────────────────────────────────────────────────────── */}
            {activeTab === 'teams' && (
                <Row className="g-3">
                    {tournament.teams.length === 0 ? (
                        <Col><Alert variant="info" className="rounded-4 text-center">No teams registered yet. Click "Register Team" above.</Alert></Col>
                    ) : (
                        tournament.teams.map(team => {
                            const group = tournament.groups.find(g => g.id === team.groupId);
                            const playerCount = Array.isArray(team.players) ? team.players.length : 0;
                            return (
                                <Col md={6} lg={4} key={team.id}>
                                    <motion.div whileHover={{ y: -3 }}>
                                        <Card className="border-0 shadow-sm rounded-4 h-100">
                                            <Card.Body className="p-4">
                                                <div className="d-flex align-items-center gap-3 mb-3">
                                                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-black fs-5" style={{ width: 48, height: 48 }}>
                                                        {team.name[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <div className="fw-black">{team.name}</div>
                                                        {group && <Badge bg="primary" className="x-small">{group.name}</Badge>}
                                                    </div>
                                                </div>
                                                <div className="d-flex flex-column gap-1 mb-3">
                                                    {team.captain && <div className="x-small fw-bold text-muted"><i className="bi bi-person-badge me-1"></i>Captain: {team.captain}</div>}
                                                    {team.captainMobile && <div className="x-small fw-bold text-muted"><i className="bi bi-phone me-1"></i>{team.captainMobile}</div>}
                                                    {team.district && <div className="x-small fw-bold text-muted"><i className="bi bi-map me-1"></i>{titleCase(team.district)}</div>}
                                                    {team.manager && <div className="x-small fw-bold text-muted"><i className="bi bi-person me-1"></i>Manager: {team.manager}</div>}
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center mt-auto">
                                                    <Badge bg={playerCount > 0 ? 'success' : 'secondary'} className="fw-bold">
                                                        {playerCount} player{playerCount !== 1 ? 's' : ''}
                                                    </Badge>
                                                    <Button size="sm" variant="outline-primary" onClick={() => openPlayersModal(team)} className="rounded-pill fw-bold">
                                                        <i className="bi bi-person-plus me-1"></i>Players
                                                    </Button>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </motion.div>
                                </Col>
                            );
                        })
                    )}
                </Row>
            )}

            {/* ── SCHEDULE TAB ─────────────────────────────────────────────────── */}
            {activeTab === 'schedule' && (
                <div>
                    {groupMatches.length === 0 ? (
                        <Alert variant="info" className="rounded-4 text-center">Generate schedule first using the button above.</Alert>
                    ) : (
                        tournament.groups.map(g => {
                            const gMatches = groupMatches.filter(m => m.groupId === g.id);
                            return gMatches.length > 0 ? (
                                <div key={g.id} className="mb-4">
                                    <h6 className="fw-black text-primary text-uppercase mb-3"><i className="bi bi-grid me-2"></i>{g.name}</h6>
                                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                        <Table responsive hover className="mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="ps-4 x-small fw-black text-muted">#</th>
                                                    <th className="x-small fw-black text-muted">MATCH</th>
                                                    <th className="x-small fw-black text-muted">TIME</th>
                                                    <th className="x-small fw-black text-muted">VENUE</th>
                                                    <th className="x-small fw-black text-muted">STATUS</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {gMatches.map(m => (
                                                    <tr key={m.id}>
                                                        <td className="ps-4 fw-black text-muted">{m.matchNumber}</td>
                                                        <td>
                                                            <div className="fw-bold">{m.teamA} <span className="text-muted">vs</span> {m.teamB}</div>
                                                        </td>
                                                        <td className="x-small fw-bold text-muted">{fmtDate(m.date)}</td>
                                                        <td className="x-small fw-bold text-muted">{titleCase(m.venue) || '—'}</td>
                                                        <td>
                                                            <Badge bg={m.status === 'live' ? 'danger' : m.status === 'completed' ? 'success' : 'secondary'} className="text-uppercase x-small fw-bold">
                                                                {m.status}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <Button size="sm" variant="link" className="p-0 fw-bold text-primary" onClick={() => navigate(`/scorecard/${m._id || m.id}`)}>
                                                                View
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Card>
                                </div>
                            ) : null;
                        })
                    )}
                </div>
            )}

            {/* ── POINTS TABLE TAB ─────────────────────────────────────────────── */}
            {activeTab === 'points' && (
                <Row className="g-4">
                    {pointsTable.length === 0 ? (
                        <Col><Alert variant="info" className="rounded-4 text-center">Points table updates after matches are completed.</Alert></Col>
                    ) : (
                        pointsTable.map((group, idx) => (
                            <Col lg={6} key={idx}>
                                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                    <Card.Header className="bg-white border-0 py-3 px-4">
                                        <h5 className="fw-black m-0 text-primary">{group.groupName.toUpperCase()}</h5>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <Table responsive hover className="mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="ps-4 x-small">TEAM</th>
                                                    <th className="text-center x-small">M</th>
                                                    <th className="text-center x-small">W</th>
                                                    <th className="text-center x-small">L</th>
                                                    <th className="text-center x-small">T</th>
                                                    <th className="text-center x-small fw-black">PTS</th>
                                                    <th className="text-center x-small pe-4">NRR</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.teamStats.map((t, tIdx) => (
                                                    <tr key={tIdx}>
                                                        <td className="ps-4 fw-bold">
                                                            {t.teamName}
                                                            {t.captain && <div className="x-small text-muted">{t.captain} {t.district ? `• ${titleCase(t.district)}` : ''}</div>}
                                                        </td>
                                                        <td className="text-center">{t.matches}</td>
                                                        <td className="text-center text-success fw-bold">{t.wins}</td>
                                                        <td className="text-center text-danger fw-bold">{t.losses}</td>
                                                        <td className="text-center text-muted">{t.ties}</td>
                                                        <td className="text-center fw-black text-primary fs-6">{t.points}</td>
                                                        <td className="text-center pe-4 fw-bold">{t.nrr}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))
                    )}
                </Row>
            )}

            {/* ── BRACKET TAB ─────────────────────────────────────────────────── */}
            {activeTab === 'bracket' && (
                <div>
                    {knockoutMatches.length === 0 ? (
                        <Alert variant="info" className="rounded-4 text-center">Knockout bracket will appear here after group stages complete.</Alert>
                    ) : (
                        <Row className="g-3">
                            {knockoutMatches.map((m, idx) => (
                                <Col key={idx} lg={4} md={6}>
                                    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                        <div className="bg-dark text-white p-2 text-center x-small fw-black letter-spacing-1">
                                            {m.tournamentRound?.toUpperCase()} #{m.matchNumber}
                                        </div>
                                        <Card.Body className="p-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className={`fw-bold ${m.score?.winner === m.teamA ? 'text-primary' : ''}`}>{m.teamA}</span>
                                                {m.status === 'completed' && <span className="fw-black x-small">{m.score?.runs}/{m.score?.wickets}</span>}
                                            </div>
                                            <div className="text-center py-1 opacity-25 fw-black">VS</div>
                                            <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                                                <span className={`fw-bold ${m.score?.winner === m.teamB ? 'text-primary' : ''}`}>{m.teamB}</span>
                                                {m.status === 'completed' && <span className="fw-black x-small">{m.score?.runs}/{m.score?.wickets}</span>}
                                            </div>
                                            <div className="x-small text-muted fw-bold mb-2">{fmtDate(m.date)}</div>
                                            <Badge bg={m.status === 'live' ? 'danger' : m.status === 'completed' ? 'success' : 'secondary'} className="text-uppercase fw-bold w-100 text-center py-1">
                                                {m.status}
                                            </Badge>
                                            {m.score?.winner && m.status === 'completed' && (
                                                <div className="mt-2 p-2 bg-success bg-opacity-10 rounded-3 x-small fw-black text-success text-center">
                                                    🏆 {m.score.winner} WON
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </div>
            )}

            {/* ── MODALS ────────────────────────────────────────────────────────── */}

            {/* Team Registration Modal */}
            <Modal show={showTeamModal} onHide={() => setShowTeamModal(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-black text-primary"><i className="bi bi-people me-2"></i>REGISTER TEAM</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form onSubmit={handleRegisterTeam}>
                        <Row className="g-3">
                            {poolTeams.length > 0 && (
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-black text-primary text-uppercase letter-spacing-1">Select Approved Team</Form.Label>
                                        <Form.Select
                                            value={selectedPoolTeamId}
                                            onChange={e => setSelectedPoolTeamId(e.target.value)}
                                            className="py-2 border-primary border-opacity-25 rounded-3 fw-bold bg-primary bg-opacity-10"
                                        >
                                            <option value="">-- Create New Team Instead --</option>
                                            {poolTeams.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({titleCase(t.district)})</option>
                                            ))}
                                        </Form.Select>
                                        <div className="x-small text-muted mt-1 fw-bold">Selecting from this list will import an approved team.</div>
                                    </Form.Group>
                                    <div className="d-flex align-items-center gap-2 my-3">
                                        <hr className="flex-grow-1" />
                                        <span className="x-small fw-black text-muted opacity-50">OR</span>
                                        <hr className="flex-grow-1" />
                                    </div>
                                </Col>
                            )}

                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Team Name <span className="text-danger">*</span></Form.Label>
                                    <Form.Control disabled={!!selectedPoolTeamId} required={!selectedPoolTeamId} placeholder="E.g. Methur Warriors" value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Captain Name</Form.Label>
                                    <Form.Control disabled={!!selectedPoolTeamId} placeholder="Captain" value={newTeam.captain} onChange={e => setNewTeam({ ...newTeam, captain: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Captain Mobile</Form.Label>
                                    <Form.Control disabled={!!selectedPoolTeamId} placeholder="9876543210" value={newTeam.captainMobile} onChange={e => setNewTeam({ ...newTeam, captainMobile: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">District</Form.Label>
                                    <Form.Control disabled={!!selectedPoolTeamId} placeholder="E.g. Salem" value={newTeam.district} onChange={e => setNewTeam({ ...newTeam, district: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Manager Name</Form.Label>
                                    <Form.Control disabled={!!selectedPoolTeamId} placeholder="Team Manager" value={newTeam.manager} onChange={e => setNewTeam({ ...newTeam, manager: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Button variant="primary" type="submit" className="w-100 rounded-pill fw-black py-3 mt-3 shadow-lg premium-gradient border-0" disabled={isSaving}>
                                    {isSaving ? <Spinner animation="border" size="sm" /> : (selectedPoolTeamId ? "IMPORT SELECTED TEAM" : "CONFIRM NEW REGISTRATION")}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Player Registration Modal */}
            <Modal show={showPlayersModal} onHide={() => setShowPlayersModal(false)} centered size="lg">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-black text-primary"><i className="bi bi-person-plus me-2"></i>SQUAD: {selectedTeam?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                    <Form onSubmit={handleUpdatePlayers}>
                        {players.map((p, idx) => (
                            <div key={idx} className="p-3 mb-3 border rounded-4 bg-light">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="fw-black small text-primary">Player {idx + 1}</span>
                                    {players.length > 1 && <Button size="sm" variant="link" className="text-danger p-0" onClick={() => removePlayer(idx)}><i className="bi bi-trash"></i></Button>}
                                </div>
                                <Row className="g-2">
                                    <Col md={6}>
                                        <Form.Control size="sm" placeholder="Player Name *" value={p.name} onChange={e => updatePlayer(idx, 'name', e.target.value)} />
                                    </Col>
                                    <Col md={3}>
                                        <Form.Control size="sm" placeholder="Jersey #" value={p.jerseyNumber} onChange={e => updatePlayer(idx, 'jerseyNumber', e.target.value)} />
                                    </Col>
                                    <Col md={3}>
                                        <Form.Control size="sm" placeholder="Mobile" value={p.mobile} onChange={e => updatePlayer(idx, 'mobile', e.target.value)} />
                                    </Col>
                                    <Col md={4}>
                                        <Form.Select size="sm" value={p.role} onChange={e => updatePlayer(idx, 'role', e.target.value)}>
                                            {ROLES.map(r => <option key={r}>{r}</option>)}
                                        </Form.Select>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Select size="sm" value={p.battingStyle} onChange={e => updatePlayer(idx, 'battingStyle', e.target.value)}>
                                            {BATTING_STYLES.map(s => <option key={s}>{s}</option>)}
                                        </Form.Select>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Select size="sm" value={p.bowlingStyle} onChange={e => updatePlayer(idx, 'bowlingStyle', e.target.value)}>
                                            {BOWLING_STYLES.map(s => <option key={s}>{s}</option>)}
                                        </Form.Select>
                                    </Col>
                                </Row>
                            </div>
                        ))}
                        <Button variant="outline-primary" className="w-100 rounded-pill mb-3 fw-bold" onClick={addPlayer}>
                            <i className="bi bi-plus-circle me-1"></i> Add Another Player
                        </Button>
                        <Button variant="primary" type="submit" className="w-100 rounded-pill fw-bold py-3" disabled={isSaving}>
                            {isSaving ? <Spinner animation="border" size="sm" /> : `SAVE SQUAD (${players.filter(p => p.name.trim()).length} Players)`}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default TournamentView;
