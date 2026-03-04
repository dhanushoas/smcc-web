import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Row, Col, Card, Badge, Spinner, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import API_URL from '../utils/api';
import { formatTime, pluralize } from '../utils/formatters';

const SeriesView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [series, setSeries] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSeries();
    }, [id]);

    const fetchSeries = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/series/${id}`);
            if (res.data.success) {
                setSeries(res.data.data);
                setMatches(res.data.data.matches || []);
            }
        } catch (err) {
            toast.error("Failed to load series details");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;
    if (!series) return <div className="text-center py-5"><h4>Series not found</h4></div>;

    // Calculate series score
    let teamAWins = 0;
    let teamBWins = 0;

    matches.forEach(m => {
        if (m.status === 'completed' && m.score?.winner) {
            if (m.score.winner === series.teamA) teamAWins++;
            else if (m.score.winner === series.teamB) teamBWins++;
        }
    });

    const renderMatchCard = (match) => {
        const isLive = match.status === 'live';
        const isCompleted = match.status === 'completed';

        // Use consistent formatting
        const titleCaseVenue = (match.venue || 'TBA').split(' ').map(s => s.length > 0 ? s[0].toUpperCase() + s.substring(1).toLowerCase() : '').join(' ');

        return (
            <Col xs={12} key={match.id || match._id} className="mb-3">
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -5 }}
                    className="bg-white border rounded-4 overflow-hidden shadow-sm hover-shadow transition-all"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/match/${match.id || match._id}`)}
                >
                    <div className="px-3 py-2 border-bottom bg-light d-flex justify-content-between align-items-center">
                        <span className="x-small fw-black text-muted text-uppercase letter-spacing-1">
                            {match.matchNumber ? `Match ${match.matchNumber}` : (match.title || match.series || 'SERIES MATCH')}
                        </span>
                        <div>
                            {match.status === 'upcoming' && <Badge bg="info" className="x-small px-2"><i className="bi bi-clock me-1"></i>UPCOMING</Badge>}
                            {isLive && <Badge bg="danger" className="animate-pulse x-small px-2"><i className="bi bi-broadcast me-1"></i>LIVE</Badge>}
                            {isCompleted && <Badge bg="success" className="x-small px-2"><i className="bi bi-check-circle me-1"></i>COMPLETED</Badge>}
                        </div>
                    </div>

                    <div className="p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-black fs-5 text-dark">
                                {match.teamA}
                            </span>
                            <span className="fw-black fs-5">
                                {(isLive || isCompleted) ? (match.innings?.[0]?.runs || 0) + ' / ' + (match.innings?.[0]?.wickets || 0) : ''}
                                <small className="text-dark ms-2 x-small fw-bold">{(isLive || isCompleted) ? '(' + pluralize(match.innings?.[0]?.overs || 0, 'Over') + ')' : ''}</small>
                            </span>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fw-black fs-5 text-dark">
                                {match.teamB}
                            </span>
                            <span className="fw-black fs-5">
                                {(isLive || isCompleted) ? (match.innings?.[1]?.runs || 0) + ' / ' + (match.innings?.[1]?.wickets || 0) : ''}
                                <small className="text-dark ms-2 x-small fw-bold">{(isLive || isCompleted) ? '(' + pluralize(match.innings?.[1]?.overs || 0, 'Over') + ')' : ''}</small>
                            </span>
                        </div>

                        <div className="border-top pt-2">
                            <div className="small fw-bold text-primary">
                                {isCompleted ? (
                                    <div className="d-flex align-items-center justify-content-between">
                                        <span>{(() => {
                                            const innings = match.innings || [];
                                            if (innings.length < 2) return "COMPLETED";
                                            let inn1, inn2;
                                            if (innings.length >= 4) {
                                                const lastIdx = innings.length - 1;
                                                inn2 = innings[lastIdx];
                                                inn1 = innings[lastIdx - 1];

                                                if (inn1.runs > inn2.runs) return `${inn1.team.toUpperCase()} WON VIA SUPER OVER`;
                                                if (inn2.runs > inn1.runs) return `${inn2.team.toUpperCase()} WON VIA SUPER OVER`;
                                                return "SUPER OVER TIED";
                                            } else {
                                                inn1 = innings[0];
                                                inn2 = innings[1];
                                                if (inn1.runs > inn2.runs) {
                                                    const diff = inn1.runs - inn2.runs;
                                                    return `${inn1.team} won by ${pluralize(diff, 'Run')}`;
                                                } else if (inn2.runs > inn1.runs) {
                                                    const wicketsRemaining = 10 - inn2.wickets;
                                                    return `${inn2.team} won by ${pluralize(wicketsRemaining, 'Wicket')}`;
                                                }
                                                return "Match Drawn";
                                            }
                                        })().toUpperCase()}</span>
                                    </div>
                                ) : isLive ? (
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="text-danger animate-pulse">●</span>
                                        <span>Match in progress</span>
                                    </div>
                                ) : (
                                    <span className="text-dark fw-bold"><i className="bi bi-geo-alt-fill text-danger me-1"></i> {formatTime(match.date)} • {titleCaseVenue}</span>
                                )}
                            </div>
                        </div>

                    </div>
                </motion.div>
            </Col>
        );
    };

    return (
        <Container className="py-5 min-vh-100">
            <Toaster position="top-right" />

            {/* Go Back Button */}
            <Button variant="link" className="text-decoration-none text-muted p-0 mb-3 fw-bold d-inline-flex gap-2 align-items-center hover-primary" onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left"></i> BACK
            </Button>

            {/* Header / Score Board */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-primary text-white">
                    <Card.Body className="p-4 p-md-5 position-relative">
                        <div className="text-center mb-4">
                            <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill fw-black letter-spacing-1 mb-3 shadow-sm border border-warning border-opacity-50">
                                {series.type.replace(/_/g, ' ').toUpperCase()} SERIES
                            </Badge>
                            <h1 className="fw-black mb-1 letter-spacing-1">{series.name.toUpperCase()}</h1>
                            <p className="opacity-75 fw-bold x-small letter-spacing-1 mb-0">
                                {series.oversPerMatch} OVERS FORMAT
                            </p>
                        </div>

                        <Row className="align-items-center text-center justify-content-center pt-2">
                            <Col xs={4} md={3}>
                                <div className="display-4 fw-black text-warning text-shadow">{teamAWins}</div>
                                <div className="fw-bold letter-spacing-1 mt-1 fs-5 text-truncate" title={series.teamA}>{series.teamA}</div>
                            </Col>
                            <Col xs={2} className="text-center">
                                <div className="fw-black fs-4 opacity-50">VS</div>
                            </Col>
                            <Col xs={4} md={3}>
                                <div className="display-4 fw-black text-warning text-shadow">{teamBWins}</div>
                                <div className="fw-bold letter-spacing-1 mt-1 fs-5 text-truncate" title={series.teamB}>{series.teamB}</div>
                            </Col>
                        </Row>

                        <div className="d-flex justify-content-center mt-4">
                            <div className="bg-white bg-opacity-10 px-4 py-2 rounded-pill fw-bold border border-white border-opacity-25 backdrop-blur shadow-sm">
                                {teamAWins > teamBWins ? `${series.teamA} LEADS ${teamAWins}-${teamBWins}` :
                                    teamBWins > teamAWins ? `${series.teamB} LEADS ${teamBWins}-${teamAWins}` :
                                        matches.length > 0 ? "SERIES LEVEL" : "SERIES HAS NOT STARTED YET"}
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </motion.div>

            {/* Match List */}
            <h4 className="fw-black text-primary mb-3 mt-5 px-1"><i className="bi bi-calendar3 me-2"></i>SERIES MATCHES</h4>
            <Row className="g-3">
                {matches.length > 0 ? (
                    matches.sort((a, b) => new Date(a.date) - new Date(b.date)).map(renderMatchCard)
                ) : (
                    <Col>
                        <div className="bg-white p-5 text-center rounded-4 shadow-sm border text-muted">
                            <i className="bi bi-inbox fs-1 mb-3 d-block opacity-50"></i>
                            <h5 className="fw-bold">No matches scheduled yet</h5>
                            <p className="small mb-0">Matches for this series will appear here once created by admins.</p>
                        </div>
                    </Col>
                )}
            </Row>
        </Container>
    );
};

export default SeriesView;
