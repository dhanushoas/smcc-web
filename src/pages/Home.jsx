import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Badge, Spinner, Button } from 'react-bootstrap';
import { io } from 'socket.io-client';
import { useApp } from '../AppContext';
import { formatTime, pluralize } from '../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../utils/api';

const socket = io(API_URL);

const Home = () => {
    const navigate = useNavigate();
    const { t } = useApp();
    const [matches, setMatches] = useState([]); // Array of match objects from API
    const [loading, setLoading] = useState(true); // Initial load state
    const [activeSeries, setActiveSeries] = useState('ALL'); // Series filter state

    const [blastValue, setBlastValue] = useState(0);
    const [blastMatchId, setBlastMatchId] = useState(null);

    const fetchMatches = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/matches`);
            setMatches(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error fetching matches:", err);
            setMatches([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'SMCC LIVE | Real-time Cricket';
        fetchMatches(); // Initial data fetch

        // Socket.io listeners for real-time match and score updates
        socket.on('matchUpdate', (updatedMatch) => {
            setMatches(prevMatches => {
                const matchesArr = Array.isArray(prevMatches) ? prevMatches : [];
                const index = matchesArr.findIndex(m => m._id === updatedMatch._id || m.id === updatedMatch.id);
                if (index !== -1) {
                    const oldMatch = matchesArr[index];
                    const oldRuns = oldMatch.score?.runs || 0;
                    const newRuns = updatedMatch.score?.runs || 0;
                    const diff = newRuns - oldRuns;

                    if ((diff === 4 || diff === 6) && updatedMatch.status === 'live') {
                        setBlastValue(diff);
                        setBlastMatchId(updatedMatch._id || updatedMatch.id);
                        setTimeout(() => setBlastMatchId(null), 2500);
                    }

                    const newMatches = [...matchesArr];
                    newMatches[index] = updatedMatch;
                    return newMatches;
                }
                return [updatedMatch, ...matchesArr];
            });
        });

        socket.on('matchDeleted', (matchId) => {
            setMatches(prev => (Array.isArray(prev) ? prev : []).filter(m => m._id !== matchId && m.id !== matchId));
        });

        return () => {
            socket.off('matchUpdate');
            socket.off('matchDeleted');
        };
    }, []);

    const renderMatchCard = (match, groupType = 'head-to-head') => {
        const isLive = match.status === 'live';
        const isCompleted = match.status === 'completed';
        const isSeries = groupType === 'series';
        const isTournament = groupType === 'tournament';

        const badgeBg = isTournament ? 'warning' : isSeries ? 'primary' : 'secondary';
        const badgeText = isTournament ? 'TOURNAMENT' : isSeries ? 'SERIES' : 'HEAD-TO-HEAD';

        const handleCardClick = () => {
            if (isSeries && match.seriesId) {
                navigate(`/series/${match.seriesId}`);
            } else if (isTournament && match.tournamentId) {
                navigate(`/tournaments/${match.tournamentId}`);
            } else {
                navigate(`/match/${match._id || match.id}`);
            }
        };

        return (
            <Col xs={12} key={match._id || match.id} className="mb-3">
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border rounded-3 overflow-hidden shadow-sm hover-shadow transition-all"
                    style={{ cursor: 'pointer' }}
                    onClick={handleCardClick}
                >
                    <div className="px-3 py-2 border-bottom bg-light d-flex justify-content-between align-items-center">
                        <span className="x-small fw-black text-muted text-uppercase letter-spacing-1">
                            {match.series || 'SMCC LIVE'}
                            {isSeries && match.matchNumber ? ` • Match ${match.matchNumber}` : ''}
                            {' • '}{new Date(match.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <div>
                            <Badge bg={badgeBg} className={`x-small px-2 me-1 text-uppercase ${isTournament ? 'text-dark' : ''}`}>
                                {badgeText}
                            </Badge>
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
                                {(match.status === 'live' || isCompleted) ? (match.innings?.[0]?.runs || 0) + ' / ' + (match.innings?.[0]?.wickets || 0) : ''}
                                <small className="text-dark ms-2 x-small fw-bold">{(match.status === 'live' || isCompleted) ? '(' + pluralize(match.innings?.[0]?.overs || 0, 'Over') + ')' : ''}</small>
                            </span>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fw-black fs-5 text-dark">
                                {match.teamB}
                            </span>
                            <span className="fw-black fs-5">
                                {(match.status === 'live' || isCompleted) ? (match.innings?.[1]?.runs || 0) + ' / ' + (match.innings?.[1]?.wickets || 0) : ''}
                                <small className="text-dark ms-2 x-small fw-bold">{(match.status === 'live' || isCompleted) ? '(' + pluralize(match.innings?.[1]?.overs || 0, 'Over') + ')' : ''}</small>
                            </span>
                        </div>

                        {isLive && match.currentBatsmen && match.currentBatsmen.length > 0 && (
                            <div className="mb-3 small bg-light p-2 rounded border shadow-sm">
                                {match.score?.freeHit && (
                                    <div className="bg-danger text-white text-center fw-black x-small rounded py-1 mb-2 animate-pulse" style={{ letterSpacing: '1px' }}>🚀 FREE HIT ACTIVE</div>
                                )}
                                <Row className="g-2">
                                    <Col xs={6}>
                                        <div className="fw-black text-dark x-small text-uppercase mb-1">Batting</div>
                                        {match.currentBatsmen.map((b, idx) => (
                                            <div key={idx} className="text-truncate fw-bold text-dark d-flex align-items-center mb-1">
                                                <div className="d-inline-flex align-items-center justify-content-center rounded-circle me-1 border"
                                                    style={{ width: '22px', height: '22px', backgroundColor: '#f1f5f9', fontSize: '0.8rem' }}>
                                                    {b.onStrike ? <span title="Striker">🏏</span> : <span style={{ opacity: 0 }}>🏏</span>}
                                                </div>
                                                <span className="text-truncate">
                                                    {b.name} {b.onStrike ? '*' : ''} <span className="fw-black text-primary ms-1">{b.runs || 0} <span className="text-muted small fw-bold">({pluralize(b.balls || 0, 'Ball')})</span></span>
                                                </span>
                                            </div>
                                        ))}
                                    </Col>
                                    <Col xs={6} className="border-start ps-2">
                                        <div className="fw-black text-dark x-small text-uppercase mb-1">Bowling</div>
                                        <div className="text-truncate fw-bold text-dark mb-1 d-flex align-items-center">
                                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle me-1 border shadow-sm"
                                                style={{ width: '22px', height: '22px', backgroundColor: '#fff7ed', fontSize: '0.8rem' }}>
                                                <span title="Bowler">⚾</span>
                                            </div>
                                            <span className="text-truncate">{match.currentBowler || '...'}</span>
                                        </div>
                                        {match.score?.thisOver && match.score.thisOver.length > 0 && (
                                            <div className="d-flex gap-1 overflow-auto no-scrollbar pb-1">
                                                {match.score.thisOver.map((ball, bIdx) => {
                                                    const ballStr = ball.toString().toUpperCase();
                                                    const isFour = ballStr === '4';
                                                    const isSix = ballStr === '6';
                                                    const isWicket = ballStr.startsWith('W') || ballStr === 'OUT';
                                                    const isExtra = ballStr.startsWith('WD') || ballStr.startsWith('NB') || ballStr.startsWith('LB') || ballStr.startsWith('B');

                                                    let badgeClass = 'bg-white text-dark border';
                                                    if (isSix) badgeClass = 'bg-primary text-white border-primary';
                                                    else if (isFour) badgeClass = 'bg-success text-white border-success';
                                                    else if (isWicket) badgeClass = 'bg-danger text-white border-danger';
                                                    else if (isExtra) badgeClass = 'bg-warning text-dark border-warning';

                                                    let initialAnim = { scale: 0.8, opacity: 0 };
                                                    if (isSix) initialAnim = { scale: 1.8, rotate: [0, 360, 0], filter: 'brightness(1.5)' };
                                                    else if (isFour) initialAnim = { scale: 1.5, rotate: [0, 15, -15, 0], filter: 'brightness(1.5)' };

                                                    return (
                                                        <motion.span
                                                            key={bIdx}
                                                            initial={initialAnim}
                                                            animate={{ scale: 1, rotate: 0, opacity: 1, filter: 'brightness(1)' }}
                                                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                                            className={`badge fw-bold d-inline-flex align-items-center justify-content-center p-0 ${badgeClass}`}
                                                            style={{ minWidth: '20px', height: '20px', fontSize: '0.65rem' }}
                                                        >
                                                            {ball}
                                                        </motion.span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            </div>
                        )}

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
                                        {match.manOfTheMatch && (
                                            <span className="x-small text-muted fw-black bg-light px-2 py-1 rounded border">
                                                🥇 {match.manOfTheMatch.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                ) : isLive ? (
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="text-danger animate-pulse">●</span>
                                        <span>{(() => {
                                            if (match.score?.isPaused) return `PAUSED: ${match.score.pauseReason}`;
                                            if (match.score?.target) {
                                                const runsNeeded = match.score.target - (match.score?.runs || 0);
                                                const isSuperOver = match.innings && match.innings.length > 2;
                                                return runsNeeded > 0
                                                    ? `Target: ${pluralize(runsNeeded, 'Run')} Required`
                                                    : 'Scores Level';
                                            }
                                            return match.innings && match.innings.length > 2 ? 'Super Over in progress' : 'Match in progress';
                                        })()}</span>
                                    </div>
                                ) : (
                                    <span className="text-dark fw-bold"><i className="bi bi-geo-alt-fill text-danger me-1"></i> {formatTime(match.date)} • {(match.venue || 'TBA').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</span>
                                )}
                            </div>
                        </div>

                    </div>
                </motion.div>
            </Col>
        );
    };

    if (loading) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <Spinner animation="border" variant="primary" />
        </Container>
    );

    const seriesList = ['ALL', ...new Set(matches.map(m => m.series || 'SMCC LIVE'))];
    const filteredBySeries = activeSeries === 'ALL' ? matches : matches.filter(m => (m.series || 'SMCC LIVE') === activeSeries);

    const liveMatches = filteredBySeries.filter(m => m.status === 'live' || m.status === 'upcoming');
    const completedMatches = filteredBySeries.filter(m => m.status === 'completed');

    const renderFeed = (matchesArray) => {
        const grouped = [];
        const seenSeries = new Set();
        const seenTournaments = new Set();

        matchesArray.forEach(m => {
            if (m.competitionType === 'series' && m.seriesId) {
                if (!seenSeries.has(m.seriesId)) {
                    seenSeries.add(m.seriesId);
                    grouped.push({ type: 'series', match: m });
                }
            } else if (m.competitionType === 'tournament' && m.tournamentId) {
                if (!seenTournaments.has(m.tournamentId)) {
                    seenTournaments.add(m.tournamentId);
                    grouped.push({ type: 'tournament', match: m });
                }
            } else {
                grouped.push({ type: 'head-to-head', match: m });
            }
        });

        return grouped.map(g => renderMatchCard(g.match, g.type));
    };

    return (
        <div style={{ backgroundColor: '#f8f9fa' }}>
            <Container className="py-4 px-lg-5">
                <Row className="justify-content-center">
                    <Col lg={10} xl={8}>
                        <div className="mb-5">
                            <h5 className="fw-black text-uppercase letter-spacing-2 mb-3 d-flex align-items-center gap-2">
                                <span className="p-1 px-2 bg-danger text-white rounded x-small">LIVE</span>
                                Match Feed
                            </h5>
                            {liveMatches.length > 0 ? (
                                renderFeed(liveMatches)
                            ) : (
                                <div className="bg-white p-5 rounded-3 border text-center mb-4 shadow-sm">
                                    <h5 className="fw-black text-primary mb-2">NO ACTIVE MATCHES</h5>
                                    <p className="text-muted mb-0">There are no matches currently in progress. Please check back later for live coverage.</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <h5 className="fw-black text-uppercase letter-spacing-2 mb-3">Recently Completed</h5>
                            {completedMatches.length > 0 ? (
                                renderFeed(completedMatches)
                            ) : (
                                <div className="text-muted small">No recently completed matches.</div>
                            )}
                        </div>
                    </Col>
                </Row>
            </Container>

            <AnimatePresence>
                {blastMatchId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed-top h-100 w-100 d-flex align-items-center justify-content-center pointer-events-none"
                        style={{ zIndex: 9999, pointerEvents: 'none' }}
                    >
                        <motion.h1
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: [0, 1.5, 1], rotate: 0 }}
                            className="display-1 fw-black text-white px-5 py-3 rounded-4 shadow-lg text-center"
                            style={{
                                background: blastValue === 6 ? 'linear-gradient(45deg, #059669, #10b981)' : 'linear-gradient(45deg, #d97706, #fbbf24)',
                                border: '8px solid white'
                            }}
                        >
                            {blastValue === 6 ? 'SIX!' : 'FOUR!'}
                        </motion.h1>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Home;
