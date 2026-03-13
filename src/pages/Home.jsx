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

// --- Robust Comparison Helpers ---
const checkTeamMatch = (t1, t2) => {
    if (!t1 || !t2) return false;
    return t1.toString().trim().toLowerCase() === t2.toString().trim().toLowerCase();
};

const isPlayerInSquad = (player, squad) => {
    if (!player || !squad || !Array.isArray(squad)) return false;
    return squad.some(p => p.name.toLowerCase() === player.toLowerCase());
};

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

    const renderMatchCard = (match, groupType = 'head-to-head', isNested = false) => {
        const isLive = match.status === 'live';
        const isCompleted = match.status === 'completed';
        const isUpcoming = match.status === 'upcoming';
        const isCancelled = match.status === 'cancelled';

        const handleCardClick = () => {
            navigate(`/scorecard/${match._id || match.id}`);
        };

        const innings = match.innings || [];
        const team1 = match.teamA;
        const team2 = match.teamB;
        const score1 = (isLive || isCompleted) ? (innings[0]?.runs || 0) + '/' + (innings[0]?.wickets || 0) : null;
        const overs1 = (isLive || isCompleted) ? innings[0]?.overs || 0 : null;
        const score2 = (isLive || isCompleted) ? (innings[1]?.runs || 0) + '/' + (innings[1]?.wickets || 0) : null;
        const overs2 = (isLive || isCompleted) ? innings[1]?.overs || 0 : null;

        return (
            <div
                key={match._id || match.id}
                className="cric-card mb-3 bg-white rounded-3 shadow-sm border overflow-hidden cursor-pointer transition-all w-100"
                onClick={handleCardClick}
            >
                <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center bg-white">
                    <span className="text-dark fw-black x-small text-uppercase letter-spacing-1">
                        {match.competitionType === 'tournament' ? (match.series || 'TOURNAMENT') : (match.competitionType === 'series' ? (match.series || 'SERIES') : 'HEAD-TO-HEAD')}
                        {match.matchNumber ? ` • Match ${match.matchNumber}` : ''}
                    </span>
                    <div className="d-flex align-items-center gap-2">
                        {isLive && <span className="live-dot-pulse"></span>}
                        <Badge bg={isLive ? 'danger' : isCompleted ? 'success' : isCancelled ? 'secondary' : 'info'} className="x-small px-2 fw-black border-0">
                            {isLive ? 'LIVE' : isCompleted ? 'COMPLETED' : isCancelled ? 'CANCELLED' : 'UPCOMING'}
                        </Badge>
                    </div>
                </div>

                <div className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center gap-3">
                            <div className="team-initial bg-light rounded-circle border d-flex align-items-center justify-content-center fw-black" style={{ width: '40px', height: '40px', fontSize: '11px' }}>
                                {team1?.substring(0, 2).toUpperCase() || '??'}
                            </div>
                            <span className="fw-black fs-5 text-dark">{team1}</span>
                        </div>
                        {score1 !== null && (
                            <div className="text-end">
                                <span className="fw-black fs-4 text-dark">{score1}</span>
                                <span className="text-dark fw-bold small ms-2">({overs1})</span>
                            </div>
                        )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center gap-3">
                            <div className="team-initial bg-light rounded-circle border d-flex align-items-center justify-content-center fw-black" style={{ width: '40px', height: '40px', fontSize: '11px' }}>
                                {team2?.substring(0, 2).toUpperCase() || '??'}
                            </div>
                            <span className="fw-black fs-5 text-dark">{team2}</span>
                        </div>
                        {score2 !== null && (
                            <div className="text-end">
                                <span className="fw-black fs-4 text-dark">{score2}</span>
                                <span className="text-dark fw-bold small ms-2">({overs2})</span>
                            </div>
                        )}
                    </div>

                    {match.toss?.winner && match.status !== 'completed' && !isCancelled && (
                        <div className="mt-2 mb-2 bg-warning bg-opacity-10 p-2 rounded border border-warning border-opacity-20">
                            <span className="fw-black text-dark x-small d-flex align-items-center gap-1">
                                <i className="bi bi-coin text-primary"></i>
                                {match.toss.winner} won toss & elected to {match.toss.decision}
                            </span>
                        </div>
                    )}

                    {isLive && (
                        <div className="mt-3 mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded-4 border border-opacity-50 shadow-sm">
                                <div className="d-flex gap-3">
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        {match.currentBatsmen?.map((b, idx) => (
                                            <div key={b.name} className="d-flex align-items-center gap-1">
                                                {idx > 0 && <span className="mx-1 text-muted opacity-50">|</span>}
                                                <div className="d-flex align-items-center gap-1">
                                                    {b.onStrike && <i className="bi bi-caret-right-fill text-primary" style={{ fontSize: '10px' }}></i>}
                                                    <span className={`fw-black ${b.onStrike ? 'text-primary' : 'text-muted'}`} style={{ fontSize: '11px' }}>
                                                        {b.name.split(' ')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="fw-black text-dark" style={{ fontSize: '13px' }}>
                                                    {b.runs}<span className="text-muted fw-bold" style={{ fontSize: '10px' }}>({b.balls})</span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!match.currentBatsmen || match.currentBatsmen.length === 0) && (
                                            <span className="fw-black text-muted x-small">NO BATSMEN SELECTED</span>
                                        )}
                                    </div>
                                </div>

                                {match.score?.thisOver && match.score.thisOver.length > 0 && (
                                    <div className="d-flex flex-column align-items-end" style={{ maxWidth: '100%', minWidth: 0 }}>
                                        <div className="fw-black text-muted text-uppercase mb-2 text-nowrap" style={{ fontSize: 'clamp(7px, 2vw, 9px)', letterSpacing: '0.5px' }}>
                                            THIS OVER | <span className="text-secondary">{match.currentBowler?.toUpperCase() || 'BOWLER'}</span>
                                        </div>
                                        <div className="d-flex gap-1 justify-content-end flex-wrap overflow-hidden py-1">
                                            {(Array.isArray(match.score.thisOver) ? match.score.thisOver : []).map((ball, idx) => {
                                                const bStr = ball.toString().toUpperCase();
                                                const isWicket = bStr === 'W' || bStr === 'OUT' || (bStr.startsWith('W') && !bStr.startsWith('WD'));
                                                const isExtra = bStr.includes('+') || bStr === 'WD' || bStr === 'NB' || bStr === 'LB' || bStr === 'B';
                                                const isBound = bStr === '4' || bStr === '6';

                                                const ballCount = match.score.thisOver.length;
                                                const dynamicSize = ballCount > 10 ? '16px' : ballCount > 7 ? '20px' : '24px';
                                                const dynamicFont = ballCount > 10 ? '6px' : '8px';

                                                let bg = '#f3f4f6';
                                                let text = '#4b5563';
                                                if (isWicket) { bg = '#ef4444'; text = 'white'; }
                                                else if (isBound) { bg = '#10b981'; text = 'white'; }
                                                else if (isExtra) { bg = '#f59e0b'; text = 'white'; }

                                                return (
                                                    <div key={idx}
                                                        className="rounded-circle d-flex align-items-center justify-content-center fw-black shadow-sm flex-shrink-0"
                                                        style={{
                                                            backgroundColor: bg,
                                                            color: text,
                                                            width: dynamicSize,
                                                            height: dynamicSize,
                                                            fontSize: dynamicFont,
                                                            border: '1px solid rgba(0,0,0,0.05)'
                                                        }}>
                                                        {ball}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-2 border-top">
                        <p className="mb-0 small fw-black text-dark d-flex align-items-center gap-2">
                            {isCancelled ? (
                                <>
                                    <i className="bi bi-x-circle-fill text-danger"></i>
                                    <span className="text-danger text-uppercase">{match.score?.result || 'MATCH CANCELLED'}</span>
                                </>
                            ) : isCompleted ? (
                                <>
                                    <i className="bi bi-stars text-success"></i>
                                    <span className="fw-black text-success">{match.score?.result || (() => {
                                        if (innings.length < 2) return "COMPLETED";
                                        const inn1 = innings[0];
                                        const inn2 = innings[1];
                                        if (inn1.runs > inn2.runs) return `${inn1.team} won by ${inn1.runs - inn2.runs} runs`;
                                        if (inn2.runs > inn1.runs) return `${inn2.team} won by ${10 - inn2.wickets} wickets`;
                                        return "Match Drawn";
                                    })()}</span>
                                    {match.manOfTheMatch && (
                                        <span className="ms-auto x-small bg-warning bg-opacity-10 text-dark px-2 py-1 rounded border border-warning border-opacity-25 d-flex align-items-center gap-1 fw-black">
                                            <i className="bi bi-award-fill text-warning"></i>
                                            {match.manOfTheMatch.toUpperCase()}
                                        </span>
                                    )}
                                </>
                            ) : isLive ? (
                                <>
                                    <span className="text-danger animate-pulse">●</span>
                                    <span className="fw-black text-primary text-uppercase letter-spacing-1" style={{ fontSize: 'clamp(10px, 3vw, 13px)' }}>
                                        {match.score?.target ? (() => {
                                            const getBalls = (ov) => {
                                                const o = Math.floor(ov);
                                                const b = Math.round((ov % 1) * 10);
                                                return (o * 6) + b;
                                            };
                                            const totalBalls = (match.totalOvers || 20) * 6;
                                            const ballsBowled = getBalls(match.score?.overs || 0);
                                            const rem = match.score.ballsRemaining ?? (totalBalls - ballsBowled);
                                            const runsNeeded = match.score.target - (match.score.runs || 0);
                                            return `Need ${runsNeeded} runs from ${pluralize(rem, 'ball')}`;
                                        })() : 'Match in progress'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-calendar3"></i>
                                    <span>{formatTime(match.date)} • {match.venue || 'TBA'}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const renderSeriesGroup = (ps) => {
        return (
            <React.Fragment key={ps.seriesId}>
                <div className="cric-card mb-3 overflow-hidden bg-white rounded-3 shadow-sm border">
                    <div className="p-4 bg-light text-center">
                        <h6 className="fw-black text-primary mb-0 text-uppercase letter-spacing-1">
                            {ps.teamA} VS {ps.teamB} SERIES ({ps.totalMatches} MATCHES)
                        </h6>
                        {ps.seriesWinner && (
                            <div className="badge bg-success mt-2 text-uppercase fw-black px-3 py-2 rounded-pill shadow-sm" style={{ fontSize: '11px' }}>🏆 {ps.seriesWinner} WON THE SERIES</div>
                        )}
                    </div>
                </div>
                {ps.matches.map(m => renderMatchCard(m, 'series'))}
            </React.Fragment>
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
        <div className="main-page-wrapper bg-light min-vh-100 pb-5">
            <div className="global-container py-4">
                <style>{`
                    .cric-card { cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; width: 100%; }
                    .cric-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.08) !important; }
                     .filter-btn {
                        white-space: nowrap;
                        font-weight: 900;
                        font-size: 11px;
                        padding: 8px 16px;
                        border-radius: 100px;
                        transition: all 0.2s ease;
                        border: 1px solid #e2e8f0;
                        background: white;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .filter-btn.active {
                        background: #032333;
                        color: white !important;
                        border-color: #032333;
                        box-shadow: 0 4px 12px rgba(3, 35, 51, 0.2);
                    }
                    .section-title {
                        font-weight: 900;
                        letter-spacing: 1px;
                        color: #1a1a1a;
                        margin-bottom: 0;
                    }
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>

                <div className="feed-header mb-4 d-flex align-items-center gap-3">
                    <h2 className="section-title d-flex align-items-center gap-2">
                        <span className="bg-danger text-white px-2 py-1 rounded small" style={{ fontSize: '10px' }}>LIVE</span>
                        <span>MATCH FEED</span>
                    </h2>
                </div>

                <div className="mb-5">
                    {activeItems.length > 0 ? renderFeed(activeItems) : (
                        <div className="bg-white p-5 rounded-3 border text-center shadow-sm w-100">
                            <h6 className="fw-black text-primary mb-2">NO ACTIVE MATCHES</h6>
                            <p className="text-muted x-small mb-0 text-uppercase letter-spacing-1">Stay tuned for upcoming live coverage</p>
                        </div>
                    )}
                </div>

                <div className="recently-completed-section">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                        <h4 className="section-title">RECENTLY COMPLETED</h4>
                        <div className="d-flex gap-2 overflow-auto no-scrollbar py-1 w-100 w-md-auto">
                            {COMPLETED_FILTERS.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setCompletedFilter(f.key)}
                                    className={`filter-btn ${completedFilter === f.key ? 'active' : ''}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredCompletedItems.length > 0 ? renderFeed(filteredCompletedItems) : (
                        <div className="bg-white p-5 rounded-3 border text-center shadow-sm w-100">
                            <i className="bi bi-info-circle fs-4 text-muted mb-3 d-block"></i>
                            <h6 className="fw-black text-muted text-uppercase small">No Matches Found</h6>
                            <p className="text-muted x-small mb-0">Try a different filter</p>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {blastMatchId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed-top h-100 w-100 d-flex align-items-center justify-content-center"
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
