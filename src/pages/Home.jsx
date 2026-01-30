import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Button } from 'react-bootstrap';
import { io } from 'socket.io-client';
import { useApp } from '../AppContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

const Home = () => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const { t, language } = useApp();

    const renderMatchCard = (match) => {
        const getTeamScore = (teamName) => {
            const innings = match.innings?.find(inn => inn.team === teamName);
            if (!innings) return null;
            return (
                <div className="text-primary fs-3 fw-bold mt-1">
                    {innings.runs}/{innings.wickets}
                    <div className="fs-6 text-muted fw-normal">({innings.overs} {t('overs')})</div>
                </div>
            );
        };

        return (
            <Col key={match._id || match.id} xs={12} lg={6}>
                <Card className="h-100 shadow-sm border-0 position-relative overflow-hidden">
                    {match.status === 'live' && (
                        <Badge bg="danger" className="position-absolute top-0 end-0 m-3 px-3 py-2 animate-pulse">
                            ● {t('live')}
                        </Badge>
                    )}

                    <Card.Body className="p-4">
                        <div className="mb-3">
                            <h5 className="fw-bold m-0">{match.title}</h5>
                            <small className="text-muted">
                                {new Date(match.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                                {new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} | {match.venue}
                            </small>
                        </div>

                        <Row className="align-items-center text-center my-4">
                            <Col xs={5}>
                                <div className="fw-bold fs-5 text-truncate">{match.teamA}</div>
                                {match.status === 'completed' ? getTeamScore(match.teamA) : (match.score?.battingTeam === match.teamA && getTeamScore(match.teamA))}
                            </Col>
                            <Col xs={2} className="text-muted small fw-bold">VS</Col>
                            <Col xs={5}>
                                <div className="fw-bold fs-5 text-truncate">{match.teamB}</div>
                                {match.status === 'completed' ? getTeamScore(match.teamB) : (match.score?.battingTeam === match.teamB && getTeamScore(match.teamB))}
                            </Col>
                        </Row>

                        <div className="mt-4 pt-3 border-top text-center">
                            {match.status === 'live' && (
                                <div className="alert alert-info py-3 mb-0 border-0 rounded-4 shadow-sm mt-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                                        <small className="fw-bold text-uppercase opacity-75">{t('batting')}</small>
                                        <small className="fw-bold text-uppercase opacity-75">{t('bowling')}</small>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <div className="text-start">
                                            {match.currentBatsmen?.map(b => (
                                                <div key={b.name} className={`fw-bold small ${b.onStrike ? 'text-primary' : ''}`}>
                                                    {b.onStrike ? '🏏 ' : ''}{b.name}: {b.runs}({b.balls})
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-end fw-bold">
                                            ⚾ {match.currentBowler || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {match.status === 'completed' ? (
                                <div className="text-success fw-bold d-flex flex-column align-items-center justify-content-center gap-1">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="fs-5">🏆</span>
                                        {match.manOfTheMatch ? `${t('man_of_the_match')}: ${match.manOfTheMatch}` : t('completed')}
                                    </div>
                                    {match.innings && match.innings.length >= 2 && (
                                        <small className="text-muted">
                                            {match.innings[0].runs > match.innings[1].runs
                                                ? `${match.innings[0].team} won by ${match.innings[0].runs - match.innings[1].runs} runs`
                                                : `${match.innings[1].team} won by ${10 - match.innings[1].wickets} wickets`}
                                        </small>
                                    )}
                                </div>
                            ) : match.status === 'upcoming' ? (
                                <Badge bg="primary" className="fw-semibold px-4 py-2">{t('upcoming')}</Badge>
                            ) : null}
                            <div className="mt-3">
                                <Button as={Link} to={`/match/${match._id || match.id}`} variant="outline-success" size="sm" className="w-100 fw-bold rounded-pill">
                                    {t('full_scorecard')} →
                                </Button>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        );
    };

    const fetchMatches = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/matches`);
            setMatches(res.data || []);
        } catch (err) {
            console.error("Error fetching matches", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
        socket.on('matchUpdate', (updatedMatch) => {
            setMatches(prevMatches => {
                const index = prevMatches.findIndex(m => m._id === updatedMatch._id || m.id === updatedMatch.id);
                if (index !== -1) {
                    const newMatches = [...prevMatches];
                    newMatches[index] = updatedMatch;
                    return newMatches;
                } else {
                    return [updatedMatch, ...prevMatches];
                }
            });
        });

        socket.on('matchDeleted', (matchId) => {
            setMatches(prevMatches => prevMatches.filter(m => m._id !== matchId && m.id !== matchId));
        });

        return () => {
            socket.off('matchUpdate');
            socket.off('matchDeleted');
        };
    }, []);

    if (loading) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <Spinner animation="border" variant="success" />
        </Container>
    );

    return (
        <Container className="py-5">
            <header className="text-center mb-5 mt-2">
                <img src="/logo.png" alt="SMCC Logo" className="mb-3 shadow-sm rounded-circle" style={{ width: '100px', height: 'auto' }} />
                <h1 className="display-5 fw-bold mb-1 text-primary">SMCC Cricket Hub</h1>
                <p className="lead text-muted small">{t('real_time_updates')}</p>
            </header>

            {/* Live Matches Section */}
            {matches.filter(m => m.status === 'live').length > 0 && (
                <div className="mb-5">
                    <h4 className="fw-bold mb-4 d-flex align-items-center gap-2">
                        <span className="text-danger">●</span> {t('live')} {t('live_scores')}
                    </h4>
                    <Row className="g-4">
                        {matches.filter(m => m.status === 'live').map(match => renderMatchCard(match))}
                    </Row>
                </div>
            )}

            {/* Upcoming Section */}
            {matches.filter(m => m.status === 'upcoming').length > 0 && (
                <div className="mb-5">
                    <h4 className="fw-bold mb-4 text-muted">{t('upcoming')}</h4>
                    <Row className="g-4">
                        {matches.filter(m => m.status === 'upcoming').map(match => renderMatchCard(match))}
                    </Row>
                </div>
            )}

            {/* Completed Section (Results) */}
            {matches.filter(m => m.status === 'completed').length > 0 && (
                <div className="mb-5">
                    <h4 className="fw-bold mb-4 text-muted">{t('completed')}</h4>
                    <Row className="g-4">
                        {matches.filter(m => m.status === 'completed').map(match => renderMatchCard(match))}
                    </Row>
                </div>
            )}

            {matches.length === 0 && (
                <Row>
                    <Col xs={12}>
                        <Card className="text-center py-5 border-0 shadow-sm">
                            <Card.Body>
                                <div className="fs-1 mb-3">🏏</div>
                                <h3 className="fw-bold">{t('no_matches')}</h3>
                                <p className="text-muted">{t('check_back')}</p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Hidden Admin Access at Bottom */}
            <div className="text-center mt-5 pt-4 border-top">
                <p className="text-muted small mb-1">&copy; 2026 S Mettur Cricket Council</p>
                <Link to="/login" className="text-muted" style={{ fontSize: '10px', opacity: 0.3, textDecoration: 'none' }}>•</Link>
            </div>
        </Container>
    );
};

export default Home;
