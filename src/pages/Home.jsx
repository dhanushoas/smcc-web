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
    const [matches, setMatches] = useState(() => {
        const cached = localStorage.getItem('smcc_matches_cache');
        return cached ? JSON.parse(cached) : [];
    });
    const [loading, setLoading] = useState(matches.length === 0);
    const [activeSeries, setActiveSeries] = useState('ALL');
    const [completedFilter, setCompletedFilter] = useState('ALL');

    const [blastValue, setBlastValue] = useState(0);
    const [blastMatchId, setBlastMatchId] = useState(null);

    const fetchMatches = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/matches`);
            const data = Array.isArray(res.data) ? res.data : [];
            setMatches(data);
            localStorage.setItem('smcc_matches_cache', JSON.stringify(data));
        } catch (err) {
            console.error("Error fetching matches:", err);
            if (matches.length === 0) setMatches([]);
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
            navigate(`/scorecard/${match._id || match.id}`);
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
                        <Row className="g-1 mb-2">
                            <Col xs={12} sm={6}>
                                <div className="fw-black fs-5 text-dark">{match.teamA}</div>
                            </Col>
                            <Col xs={12} sm={6} className="text-sm-end">
                                <span className="fw-black fs-5">
                                    {(match.status === 'live' || isCompleted) ? (match.innings?.[0]?.runs || 0) + ' / ' + (match.innings?.[0]?.wickets || 0) : ''}
                                    <small className="text-muted ms-2 x-small fw-bold">{(match.status === 'live' || isCompleted) ? '(' + pluralize(match.innings?.[0]?.overs || 0, 'Over') + ')' : ''}</small>
                                </span>
                            </Col>
                        </Row>
                        <Row className="g-1 mb-3">
                            <Col xs={12} sm={6}>
                                <div className="fw-black fs-5 text-dark">{match.teamB}</div>
                            </Col>
                            <Col xs={12} sm={6} className="text-sm-end">
                                <span className="fw-black fs-5">
                                    {(match.status === 'live' || isCompleted) ? (match.innings?.[1]?.runs || 0) + ' / ' + (match.innings?.[1]?.wickets || 0) : ''}
                                    <small className="text-muted ms-2 x-small fw-bold">{(match.status === 'live' || isCompleted) ? '(' + pluralize(match.innings?.[1]?.overs || 0, 'Over') + ')' : ''}</small>
                                </span>
                            </Col>
                        </Row>

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
                                                <span className="text-truncate">
                                                    {b.onStrike && <span style={{ color: '#FF7A00', marginRight: '4px', fontSize: '0.9rem' }}>🏏</span>}
                                                    {b.name} {b.onStrike ? '*' : ''} <span className="fw-black text-primary ms-1">{b.runs || 0} <span className="text-muted small fw-bold">({b.balls || 0})</span></span>
                                                </span>
                                            </div>
                                        ))}
                                    </Col>
                                    <Col xs={6} className="border-start ps-2">
                                        <div className="fw-black text-dark x-small text-uppercase mb-1">Bowling</div>
                                        <div className="text-truncate fw-bold text-dark mb-1 d-flex align-items-center">
                                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle me-1 border"
                                                style={{ width: '22px', height: '22px', backgroundColor: '#f1f5f9', fontSize: '0.8rem' }}>
                                                <i className="bi bi-cricket text-muted"></i>
                                            </div>
                                            <span className="text-truncate">{match.currentBowler || '...'}</span>
                                        </div>
                                        {match.score?.thisOver && match.score.thisOver.length > 0 && (
                                            <div className="d-flex gap-1 overflow-auto no-scrollbar pb-1">
                                                {match.score.thisOver.map((ball, bIdx) => {
                                                    const ballStr = ball.toString().toUpperCase();
                                                    const isFour = ballStr === '4';
                                                    const isSix = ballStr === '6';
                                                    const isWicket = ballStr === 'W' || ballStr === 'OUT';
                                                    const isExtra = ballStr.includes('+') ? (ballStr.startsWith('W+') || ballStr.startsWith('NB+') || ballStr.startsWith('B+') || ballStr.startsWith('LB+')) : (ballStr === 'WD' || ballStr === 'NB' || ballStr === 'LB' || ballStr === 'B');

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
                                                            style={{ minWidth: '24px', height: '24px', fontSize: '0.7rem', padding: '0 4px' }}
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
                                    <div className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ backgroundColor: '#FFF7D6', border: '1px solid #FDE68A' }}>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle border border-warning shadow-sm" style={{ backgroundColor: '#FFF7D6', width: '32px', height: '32px' }}>
                                                <i className="bi bi-trophy-fill" style={{ color: '#F59E0B', fontSize: '1.2rem' }}></i>
                                            </div>
                                            <span className="fw-black text-dark x-small letter-spacing-1">{(() => {
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
                                        {match.manOfTheMatch && (
                                            <span className="x-small text-muted fw-black bg-white px-2 py-1 rounded border d-flex align-items-center shadow-sm">
                                                <i className="bi bi-award-fill text-warning me-1" style={{ fontSize: '1rem' }}></i>
                                                <span style={{ lineHeight: '1' }}>{match.manOfTheMatch.toUpperCase()}</span>
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

    const renderSeriesGroup = (ps) => {
        return (
            <div key={ps.seriesId} className="mb-4 bg-white rounded-3 shadow-sm border overflow-hidden">
                <div className="p-3 bg-light border-bottom text-center">
                    <h6 className="fw-black text-primary mb-1 text-uppercase letter-spacing-1">SERIES: {ps.teamA} VS {ps.teamB} ({ps.totalMatches} Matches)</h6>
                    {ps.seriesWinner ? (
                        <div className="bg-success text-white fw-bold py-2 px-3 rounded d-inline-block mt-2 font-monospace">
                            🏆 {ps.seriesWinner} won the series {Math.max(ps.teamAWins, ps.teamBWins)}-{Math.min(ps.teamAWins, ps.teamBWins)}
                        </div>
                    ) : (
                        <div className="text-dark fw-bold small mt-1">
                            Series Lead: {ps.teamAWins === ps.teamBWins ? 'Tied ' + ps.teamAWins + '-' + ps.teamBWins : (ps.teamAWins > ps.teamBWins ? ps.teamA : ps.teamB) + ' ' + Math.max(ps.teamAWins, ps.teamBWins) + '-' + Math.min(ps.teamAWins, ps.teamBWins)}
                        </div>
                    )}
                </div>
                <div className="p-3 bg-light">
                    {ps.matches.map(m => {
                        const isLive = m.computedStatus === 'live';
                        const isCompleted = m.computedStatus === 'completed';
                        const isUpcoming = m.computedStatus === 'upcoming';
                        const isLocked = m.computedStatus === 'LOCKED';
                        const isCancelled = m.computedStatus === 'CANCELLED';

                        const handleCardClick = () => {
                            if (!isLocked && !isCancelled) {
                                navigate(`/scorecard/${m._id || m.id}`);
                            }
                        };

                        return (
                            <div key={m._id || m.id} onClick={handleCardClick} className={`mb-3 bg-white border rounded-3 overflow-hidden shadow-sm ${!isLocked && !isCancelled ? 'hover-shadow transition-all' : ''}`} style={{ cursor: (!isLocked && !isCancelled) ? 'pointer' : 'default', opacity: isCancelled ? 0.6 : 1 }}>
                                <div className="px-3 py-2 border-bottom bg-light d-flex justify-content-between align-items-center">
                                    <span className="x-small fw-black text-muted text-uppercase letter-spacing-1">
                                        Match {m.matchNumber} {m.date ? ' • ' + new Date(m.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                    </span>
                                    <div>
                                        {isLive && <Badge bg="danger" className="animate-pulse x-small px-2"><i className="bi bi-broadcast me-1"></i>LIVE</Badge>}
                                        {isCompleted && <Badge bg="success" className="x-small px-2"><i className="bi bi-check-circle me-1"></i>COMPLETED</Badge>}
                                        {isUpcoming && <Badge bg="info" className="x-small px-2"><i className="bi bi-clock me-1"></i>UPCOMING</Badge>}
                                        {isLocked && <Badge bg="secondary" className="x-small px-2"><i className="bi bi-lock-fill me-1"></i>LOCKED</Badge>}
                                        {isCancelled && <Badge bg="dark" className="x-small px-2"><i className="bi bi-x-circle me-1"></i>CANCELLED</Badge>}
                                    </div>
                                </div>

                                <div className="p-3">
                                    <Row className="g-1 mb-2">
                                        <Col xs={12} sm={6}>
                                            <div className={`fw-black fs-5 ${isCancelled || isLocked ? 'text-muted' : 'text-dark'}`}>{m.teamA}</div>
                                        </Col>
                                        <Col xs={12} sm={6} className="text-sm-end">
                                            <span className={`fw-black fs-5 ${isCancelled || isLocked ? 'text-muted' : ''}`}>
                                                {(isLive || isCompleted) ? (m.innings?.[0]?.runs || 0) + ' / ' + (m.innings?.[0]?.wickets || 0) : ''}
                                                <small className="ms-2 x-small fw-bold">{(isLive || isCompleted) ? '(' + pluralize(m.innings?.[0]?.overs || 0, 'Over') + ')' : ''}</small>
                                            </span>
                                        </Col>
                                    </Row>
                                    <Row className="g-1 mb-3">
                                        <Col xs={12} sm={6}>
                                            <div className={`fw-black fs-5 ${isCancelled || isLocked ? 'text-muted' : 'text-dark'}`}>{m.teamB}</div>
                                        </Col>
                                        <Col xs={12} sm={6} className="text-sm-end">
                                            <span className={`fw-black fs-5 ${isCancelled || isLocked ? 'text-muted' : ''}`}>
                                                {(isLive || isCompleted) ? (m.innings?.[1]?.runs || 0) + ' / ' + (m.innings?.[1]?.wickets || 0) : ''}
                                                <small className="ms-2 x-small fw-bold">{(isLive || isCompleted) ? '(' + pluralize(m.innings?.[1]?.overs || 0, 'Over') + ')' : ''}</small>
                                            </span>
                                        </Col>
                                    </Row>

                                    {isLive && m.currentBatsmen && m.currentBatsmen.length > 0 && (
                                        <div className="mb-3 small bg-light p-2 rounded border shadow-sm">
                                            {m.score?.freeHit && (
                                                <div className="bg-danger text-white text-center fw-black x-small rounded py-1 mb-2 animate-pulse" style={{ letterSpacing: '1px' }}>🚀 FREE HIT ACTIVE</div>
                                            )}
                                            <Row className="g-2">
                                                <Col xs={6}>
                                                    <div className="fw-black text-dark x-small text-uppercase mb-1">Batting</div>
                                                    {m.currentBatsmen.map((b, idx) => (
                                                        <div key={idx} className="text-truncate fw-bold text-dark d-flex align-items-center mb-1">
                                                            <span className="text-truncate">
                                                                {b.onStrike && <span style={{ color: '#FF7A00', marginRight: '4px', fontSize: '0.9rem' }}>🏏</span>}
                                                                {b.name} {b.onStrike ? '*' : ''} <span className="fw-black text-primary ms-1">{b.runs || 0} <span className="text-muted small fw-bold">({b.balls || 0})</span></span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </Col>
                                                <Col xs={6} className="border-start ps-2">
                                                    <div className="fw-black text-dark x-small text-uppercase mb-1">Bowling</div>
                                                    <div className="text-truncate fw-bold text-dark mb-1 d-flex align-items-center">
                                                        <div className="d-inline-flex align-items-center justify-content-center rounded-circle me-1 border"
                                                            style={{ width: '22px', height: '22px', backgroundColor: '#f1f5f9', fontSize: '0.8rem' }}>
                                                            <i className="bi bi-cricket text-muted"></i>
                                                        </div>
                                                        <span className="text-truncate">{m.currentBowler || '...'}</span>
                                                    </div>
                                                    {m.score?.thisOver && m.score.thisOver.length > 0 && (
                                                        <div className="d-flex gap-1 overflow-auto no-scrollbar pb-1">
                                                            {m.score.thisOver.map((ball, bIdx) => {
                                                                const ballStr = ball.toString().toUpperCase();
                                                                const isFour = ballStr === '4';
                                                                const isSix = ballStr === '6';
                                                                const isWicket = ballStr === 'W' || ballStr === 'OUT';
                                                                const isExtra = ballStr.includes('+') ? (ballStr.startsWith('W+') || ballStr.startsWith('NB+') || ballStr.startsWith('B+') || ballStr.startsWith('LB+')) : (ballStr === 'WD' || ballStr === 'NB' || ballStr === 'LB' || ballStr === 'B');

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
                                                                        style={{ minWidth: '24px', height: '24px', fontSize: '0.7rem', padding: '0 4px' }}
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

                                    <div className="bg-white rounded-3 shadow-sm border p-2 mt-2" style={{ backgroundColor: '#FFF7D6' }}>
                                        {isCompleted ? (
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="d-inline-flex align-items-center justify-content-center rounded-circle border border-warning shadow-sm" style={{ backgroundColor: '#FFF7D6', width: '32px', height: '32px' }}>
                                                        <i className="bi bi-trophy-fill" style={{ color: '#F59E0B', fontSize: '1.2rem' }}></i>
                                                    </div>
                                                    <span className="fw-black text-dark x-small letter-spacing-1">{(() => {
                                                        const innings = m.innings || [];
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
                                                {m.manOfTheMatch && (
                                                    <span className="x-small text-muted fw-black bg-white px-2 py-1 rounded border d-flex align-items-center shadow-sm">
                                                        <i className="bi bi-award-fill text-warning me-1" style={{ fontSize: '1rem' }}></i>
                                                        <span style={{ lineHeight: '1' }}>{m.manOfTheMatch.toUpperCase()}</span>
                                                    </span>
                                                )}
                                            </div>
                                        ) : isLive ? (
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="text-danger animate-pulse">●</span>
                                                <span>{(() => {
                                                    if (m.score?.isPaused) return `PAUSED: ${m.score.pauseReason}`;
                                                    if (m.score?.target) {
                                                        const runsNeeded = m.score.target - (m.score?.runs || 0);
                                                        return runsNeeded > 0
                                                            ? `Target: ${pluralize(runsNeeded, 'Run')} Required`
                                                            : 'Scores Level';
                                                    }
                                                    return m.innings && m.innings.length > 2 ? 'Super Over in progress' : 'Match in progress';
                                                })()}</span>
                                            </div>
                                        ) : isLocked ? (
                                            <span className="text-secondary"><i className="bi bi-lock-fill me-1"></i>Waiting for previous match result</span>
                                        ) : isCancelled ? (
                                            <span className="text-secondary"><i className="bi bi-x-circle me-1"></i>Cancelled (Series already won)</span>
                                        ) : (
                                            <span className="text-dark fw-bold"><i className="bi bi-geo-alt-fill text-danger me-1"></i> {formatTime(m.date)} • {(m.venue || 'TBA').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (loading) return (
        <Container className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <div className="premium-spinner mb-3"></div>
            <p className="fw-black text-muted x-small letter-spacing-2 text-uppercase animate-pulse">Fetching Live Scores...</p>
            <style>{`
                .premium-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(0,0,0,0.05);
                    border-top: 3px solid #ff4b2b;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </Container>
    );

    const seriesList = ['ALL', ...new Set(matches.map(m => m.series || 'SMCC LIVE'))];
    const filteredBySeries = activeSeries === 'ALL' ? matches : matches.filter(m => (m.series || 'SMCC LIVE') === activeSeries);

    const liveMatches = filteredBySeries
        .filter(m => m.status === 'live' || m.status === 'upcoming')
        .sort((a, b) => {
            if (a.status === 'live' && b.status !== 'live') return -1;
            if (a.status !== 'live' && b.status === 'live') return 1;
            // Break ties by chronological order (next upcoming match first)
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

    const activeItems = [];
    const completedItems = [];

    const seriesGroups = {};
    filteredBySeries.forEach(m => {
        if (m.competitionType === 'series' && m.seriesId) {
            if (!seriesGroups[m.seriesId]) seriesGroups[m.seriesId] = [];
            seriesGroups[m.seriesId].push(m);
        }
    });

    const processedSeries = Object.values(seriesGroups).map(seriesMatches => {
        const sorted = [...seriesMatches].sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
        let teamAWins = 0;
        let teamBWins = 0;
        let seriesWinner = null;
        let prevCompleted = true;
        const totalMatches = sorted.length;
        const winsRequired = Math.floor(totalMatches / 2) + 1;

        let teamA = sorted[0]?.teamA || 'Team A';
        let teamB = sorted[0]?.teamB || 'Team B';
        let seriesName = sorted[0]?.series || 'Series';

        const processedMatches = sorted.map(m => {
            let status = m.status; // live, upcoming, completed
            let computedStatus = status;

            if (seriesWinner) {
                if (computedStatus !== 'completed') computedStatus = 'CANCELLED';
            } else if (computedStatus === 'upcoming') {
                if (!prevCompleted) {
                    computedStatus = 'LOCKED';
                }
            }

            if (computedStatus === 'completed' || computedStatus === 'CANCELLED') {
                if (computedStatus === 'completed') {
                    let w = m.winner;
                    if (!w && m.innings && m.innings.length >= 2) {
                        let inn1, inn2;
                        if (m.innings.length >= 4) {
                            inn1 = m.innings[m.innings.length - 2];
                            inn2 = m.innings[m.innings.length - 1];
                        } else {
                            inn1 = m.innings[0];
                            inn2 = m.innings[1];
                        }
                        if (inn1.runs > inn2.runs) w = inn1.team;
                        else if (inn2.runs > inn1.runs) w = inn2.team;
                    }

                    if (w && w !== 'Draw' && w !== 'Tie' && w !== 'Abandoned') {
                        if (w.toLowerCase() === (m.teamA || '').toLowerCase()) teamAWins++;
                        else if (w.toLowerCase() === (m.teamB || '').toLowerCase()) teamBWins++;
                    }
                }
            }

            if (!seriesWinner) {
                if (teamAWins >= winsRequired) seriesWinner = teamA;
                else if (teamBWins >= winsRequired) seriesWinner = teamB;
            }

            if (computedStatus === 'completed' || computedStatus === 'CANCELLED') {
                prevCompleted = true;
            } else {
                prevCompleted = false;
            }

            return { ...m, computedStatus };
        });

        const isFinished = seriesWinner != null || processedMatches.every(m => m.computedStatus === 'completed' || m.computedStatus === 'CANCELLED');

        return {
            seriesId: sorted[0].seriesId,
            seriesName, teamA, teamB,
            totalMatches, teamAWins, teamBWins, seriesWinner,
            matches: processedMatches, isFinished
        };
    });

    processedSeries.forEach(ps => {
        if (ps.isFinished) {
            completedItems.push({ type: 'series-group', data: ps });
        } else {
            activeItems.push({ type: 'series-group', data: ps });
        }
    });

    filteredBySeries.forEach(m => {
        if (m.competitionType !== 'series' || !m.seriesId) {
            if (m.status === 'live' || m.status === 'upcoming') {
                activeItems.push({ type: 'single', match: m, groupType: m.competitionType || 'head-to-head' });
            } else if (m.status === 'completed') {
                completedItems.push({ type: 'single', match: m, groupType: m.competitionType || 'head-to-head' });
            }
        }
    });

    activeItems.sort((a, b) => {
        const aLive = a.type === 'series-group' ? a.data.matches.some(m => m.computedStatus === 'live') : a.match.status === 'live';
        const bLive = b.type === 'series-group' ? b.data.matches.some(m => m.computedStatus === 'live') : b.match.status === 'live';
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;

        const aTime = a.type === 'series-group' ? new Date(a.data.matches[0].date).getTime() : new Date(a.match.date).getTime();
        const bTime = b.type === 'series-group' ? new Date(b.data.matches[0].date).getTime() : new Date(b.match.date).getTime();
        return aTime - bTime;
    });

    completedItems.sort((a, b) => {
        const aTime = a.type === 'series-group' ? new Date(a.data.matches[a.data.matches.length - 1].date).getTime() : new Date(a.match.date).getTime();
        const bTime = b.type === 'series-group' ? new Date(b.data.matches[b.data.matches.length - 1].date).getTime() : new Date(b.match.date).getTime();
        return bTime - aTime;
    });

    const COMPLETED_FILTERS = [
        { key: 'ALL', label: 'All' },
        { key: 'head-to-head', label: 'Head-to-Head' },
        { key: 'series', label: 'Series' },
        { key: 'tournament', label: 'Tournament' },
    ];

    const filteredCompletedItems = completedFilter === 'ALL'
        ? completedItems
        : completedItems.filter(item => {
            if (item.type === 'series-group') return completedFilter === 'series';
            return (item.match.competitionType || 'head-to-head') === completedFilter;
        });

    const renderFeed = (itemsArray) => {
        return itemsArray.map(item => {
            if (item.type === 'series-group') return renderSeriesGroup(item.data);
            return renderMatchCard(item.match, item.groupType);
        });
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
                            {activeItems.length > 0 ? (
                                renderFeed(activeItems)
                            ) : (
                                <div className="bg-white p-5 rounded-3 border text-center mb-4 shadow-sm">
                                    <h5 className="fw-black text-primary mb-2">NO ACTIVE MATCHES</h5>
                                    <p className="text-muted mb-0">There are no matches currently in progress. Please check back later for live coverage.</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                                <h5 className="fw-black text-uppercase letter-spacing-2 mb-0">Recently Completed</h5>
                                <div className="d-flex gap-1 overflow-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                    {COMPLETED_FILTERS.map(f => (
                                        <button
                                            key={f.key}
                                            onClick={() => setCompletedFilter(f.key)}
                                            className={`btn btn-sm fw-bold text-nowrap px-3 ${completedFilter === f.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            style={{ borderRadius: '20px', fontSize: '0.75rem' }}
                                        >
                                            {f.key === 'ALL' && <i className="bi bi-grid-fill me-1"></i>}
                                            {f.key === 'head-to-head' && <i className="bi bi-person-lines-fill me-1"></i>}
                                            {f.key === 'series' && <i className="bi bi-collection-fill me-1"></i>}
                                            {f.key === 'tournament' && <i className="bi bi-trophy-fill me-1"></i>}
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {filteredCompletedItems.length > 0 ? (
                                renderFeed(filteredCompletedItems)
                            ) : (
                                <div className="bg-white p-5 rounded-3 border text-center shadow-sm">
                                    <i className="bi bi-info-circle fs-1 text-muted mb-3 d-block"></i>
                                    <h6 className="fw-black text-muted text-uppercase">No Matches Found</h6>
                                    <p className="text-muted small mb-0">No completed matches for the selected filter.</p>
                                </div>
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
