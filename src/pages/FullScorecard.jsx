import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Container, Card, Table, Nav, Spinner, Button, Row, Col, Badge } from 'react-bootstrap';
import { io } from 'socket.io-client';
import { useApp } from '../AppContext';
import { jsPDF } from 'jspdf';
import { toCamelCase, formatTime, pluralize } from '../utils/formatters';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../utils/api';


const socket = io(API_URL);

const FullScorecard = () => {
    const { id } = useParams();
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeInnings, setActiveInnings] = useState(0);
    const [activeTab, setActiveTab] = useState('scorecard');
    const { t } = useApp();
    const [blastValue, setBlastValue] = useState(0);
    const [showBlast, setShowBlast] = useState(false);

    const fetchMatch = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/matches/${id}`);
            setMatch(res.data);
            if (res.data.status === 'live' || res.data.status === 'completed') {
                const bTeam = res.data.score?.battingTeam;
                if (bTeam) {
                    const reversed = [...res.data.innings].map((inn, i) => ({ ...inn, idx: i })).reverse();
                    const activeInn = reversed.find(inn =>
                        inn.team?.trim().toLowerCase() === bTeam.trim().toLowerCase()
                    );
                    if (activeInn) setActiveInnings(activeInn.idx);
                    else setActiveInnings(res.data.innings.length - 1);
                } else {
                    setActiveInnings(res.data.innings.length - 1);
                }
            }
        } catch (err) {
            console.error("Error fetching match", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'SMCC | Match Scorecard';
        fetchMatch();
        socket.on('matchUpdate', (updatedMatch) => {
            if (updatedMatch._id === id || updatedMatch.id === id) {
                setMatch(prevMatch => {
                    if (prevMatch && updatedMatch.status === 'live') {
                        const oldRuns = prevMatch.score?.runs || 0;
                        const newRuns = updatedMatch.score?.runs || 0;
                        const diff = newRuns - oldRuns;

                        if (diff === 4 || diff === 6) {
                            setBlastValue(diff);
                            setShowBlast(true);
                            setTimeout(() => setShowBlast(false), 2500);
                        }
                    }
                    return updatedMatch;
                });

                // Auto-track the current batting innings so scorecard refreshes live
                const bTeam = updatedMatch.score?.battingTeam;
                if (bTeam && updatedMatch.innings) {
                    const reversed = [...updatedMatch.innings]
                        .map((inn, i) => ({ ...inn, idx: i }))
                        .reverse();
                    const activeInn = reversed.find(
                        inn => inn.team?.trim().toLowerCase() === bTeam.trim().toLowerCase()
                    );
                    if (activeInn) setActiveInnings(activeInn.idx);
                }
            }
        });
        return () => { socket.off('matchUpdate'); };
    }, [id]);

    const downloadPDF = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        let currentY = 15;

        // Embed SMCC logo
        try {
            const logoImg = await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const size = Math.min(img.naturalWidth, img.naturalHeight);
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    // White circular background
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    // Clip image to circle
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, 0, 0, size, size);
                    ctx.restore();
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = reject;
                img.src = '/logo.png';
            });
            const logoSize = 14;
            doc.addImage(logoImg, 'PNG', pageWidth / 2 - logoSize / 2, currentY, logoSize, logoSize);
            currentY += logoSize + 7; // 20px gap after logo
        } catch (e) {
            currentY += 4;
        }

        // Result block FIRST (most prominent)
        if (match.status === 'completed') {
            const innings = match.innings || [];
            if (innings.length >= 2) {
                let inn1, inn2, winnerString = null;
                if (innings.length >= 4) {
                    const lastIdx = innings.length - 1;
                    inn2 = innings[lastIdx]; inn1 = innings[lastIdx - 1];
                    if (inn1.runs > inn2.runs) winnerString = `MATCH TIED | ${inn1.team.toUpperCase()} WON VIA SUPER OVER`;
                    else if (inn2.runs > inn1.runs) winnerString = `MATCH TIED | ${inn2.team.toUpperCase()} WON VIA SUPER OVER`;
                    else winnerString = 'MATCH DRAWN | SUPER OVER TIED';
                } else {
                    inn1 = innings[0]; inn2 = innings[1];
                    if (inn1.runs > inn2.runs) {
                        const diff = inn1.runs - inn2.runs;
                        winnerString = `${inn1.team} won the match by ${pluralize(diff, 'Run')}.`;
                    } else if (inn2.runs > inn1.runs) {
                        const wr = 10 - inn2.wickets;
                        winnerString = `${inn2.team} won the match by ${pluralize(wr, 'Wicket')}.`;
                    } else if (inn1.runs === inn2.runs && inn1.runs > 0) {
                        winnerString = 'Match Drawn';
                    }
                }
                if (winnerString) {
                    doc.setFontSize(13);
                    doc.setTextColor(0, 146, 112);
                    doc.setFont(undefined, 'bold');
                    doc.text(`RESULT: ${winnerString.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
                    currentY += 5; // 8px after result
                }
                if (match.manOfTheMatch) {
                    doc.setFontSize(11);
                    doc.setTextColor(217, 119, 6); // Amber color for MOM
                    doc.setFont(undefined, 'bold');
                    doc.text(`MAN OF THE MATCH: ${match.manOfTheMatch.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
                    currentY += 6; // 16px after MOM
                } else if (winnerString) {
                    currentY += 4;
                }
                doc.setFont(undefined, 'normal');
            }
        }

        // Match title
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 60, 114);
        doc.text(`${match.teamA.toUpperCase()} VS ${match.teamB.toUpperCase()} - FULL SCORECARD`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 5; // 8px after title

        // Toss Info
        if (match.toss?.winner) {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.setFont(undefined, 'italic');
            doc.text(`Toss won by ${match.toss.winner} and elected to ${match.toss.decision} first.`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 6;
        }

        // Meta info
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(120);
        doc.text(`COMPETITION: ${(match.competitionType || 'HEAD-TO-HEAD').toUpperCase()} | SERIES: ${(match.series || 'SMCC').toUpperCase()} | GROUND: ${(match.venue || 'TBA').toUpperCase()} | DATE: ${new Date(match.date).toDateString().toUpperCase()} ${formatTime(match.date).toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 4;
        const exportedDate = new Date();
        const exportStr = `EXPORTED: ${exportedDate.toLocaleDateString().toUpperCase()} ${exportedDate.toLocaleTimeString().toUpperCase()}`;
        doc.text(exportStr, pageWidth / 2, currentY, { align: 'center' });
        currentY += 6; // 16px before divider

        // Divider
        doc.setDrawColor(200);
        doc.line(14, currentY, pageWidth - 14, currentY);
        currentY += 7;
        doc.setTextColor(0);

        let initialTableY = currentY;

        (match.innings || []).forEach((inn, idx) => {
            if (idx >= 2 && inn.runs === 0 && inn.wickets === 0 && (!inn.batting || inn.batting.length === 0)) {
                return;
            }

            let startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : initialTableY;

            if (idx === 2) {
                // Force super over cleanly onto page 2
                doc.addPage();
                startY = 20;
            } else if (idx !== 2 && startY > 260) {
                // Emergency break if content is way too long
                doc.addPage();
                startY = 20;
            }

            const getOrdinal = (n) => { const s = ["th", "st", "nd", "rd"]; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
            const title = `${inn.team.toUpperCase()} ${getOrdinal(idx + 1).toUpperCase()} INNINGS${idx >= 2 ? ' (SUPER OVER)' : ''}`;
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(`${title}: ${inn.runs}/${inn.wickets} (${pluralize(inn.overs, 'Over')})`, 14, startY);
            doc.setFont(undefined, 'normal');

            const battingData = (inn.batting || []).map(b => [b.player.toUpperCase(), b.status.toUpperCase(), b.runs, b.balls, b.fours, b.sixes, b.strikeRate]);
            const extras = inn.extras || { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 };

            if (battingData.length > 0 || extras.total > 0) {
                autoTable(doc, {
                    startY: startY + 8,
                    head: [['Batter', 'Status', 'Runs', 'Balls', 'Fours', 'Sixes', 'Strike Rate']],
                    body: [
                        ...battingData,
                        ['Extras', '', extras.total, `(Wide: ${extras.wides}, No Ball: ${extras.noBalls}, Bye: ${extras.byes}, Leg Bye: ${extras.legByes})`, '', '', '']
                    ],
                    theme: 'grid',
                    headStyles: { fillColor: [0, 146, 112] }
                });
            }

            const breakdown = [
                `Dots: ${inn.dots || 0}`, `1s: ${inn.ones || 0}`, `2s: ${inn.twos || 0}`,
                `3s: ${inn.threes || 0}`, `4s: ${inn.fours || 0}`, `6s: ${inn.sixes || 0}`
            ].join(' | ');
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.setFont(undefined, 'bold');
            doc.text(`HIT BREAKDOWN: `, 14, doc.lastAutoTable.finalY + 8);
            doc.setFont(undefined, 'normal');
            doc.text(breakdown, 45, doc.lastAutoTable.finalY + 8);

            const bowlingTeamIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
            const bowlingInn = match.innings[bowlingTeamIdx];
            if (bowlingInn && bowlingInn.bowling && bowlingInn.bowling.length > 0) {
                autoTable(doc, {
                    startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 16 : startY + 16,
                    head: [['Bowler', 'Overs', 'Maidens', 'Runs', 'Wickets', 'Wides', 'No Balls', 'Economy']],
                    body: bowlingInn.bowling.map(b => [b.player.toUpperCase(), b.overs, b.maidens, b.runs, b.wickets, b.wides || 0, b.noBalls || 0, b.economy]),
                    theme: 'grid',
                    headStyles: { fillColor: [34, 34, 34] }
                });
            }

            // Fall of Wickets
            if (inn.fallOfWickets && inn.fallOfWickets.length > 0) {
                doc.setFontSize(10);
                doc.setTextColor(150, 0, 0);
                doc.setFont(undefined, 'bold');
                doc.text("FALL OF WICKETS", 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 14 : startY + 14);
                doc.setFont(undefined, 'normal');
                autoTable(doc, {
                    startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 18 : startY + 18,
                    head: [['Wkt', 'Score', 'Over', 'Player']],
                    body: inn.fallOfWickets.map(f => [f.wicket, f.runs, f.overs, f.player.toUpperCase()]),
                    theme: 'plain',
                    styles: { fontSize: 9 }
                });
            }

            // Did not bat
            const battingTeamName = inn.team;
            const squad = battingTeamName === match.teamA ? match.teamASquad : match.teamBSquad;
            if (squad && squad.length > 0) {
                const battedPlayers = (inn.batting || []).map(b => b.player);
                const yetToBat = squad.filter(p => p && p.trim() !== '' && !battedPlayers.includes(p));
                if (yetToBat.length > 0) {
                    const didNotBatY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : startY + 12;
                    doc.setFontSize(9);
                    doc.setTextColor(100);
                    doc.setFont(undefined, 'bold');
                    doc.text(`DID NOT BAT: `, 14, didNotBatY);
                    doc.setFont(undefined, 'normal');
                    const textLines = doc.splitTextToSize(`${yetToBat.map(p => p.toUpperCase()).join(', ')}`, 150);
                    doc.text(textLines, 40, didNotBatY);
                    if (doc.lastAutoTable) {
                        doc.lastAutoTable.finalY = didNotBatY + (textLines.length * 4);
                    }
                }
            }
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16).replace('T', '_');
        doc.save(`${match.teamA}_vs_${match.teamB}_${timestamp}.pdf`);
    };

    if (loading) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <Spinner animation="grow" variant="primary" />
        </Container>
    );

    if (!match) return <Container className="py-5 text-center"><h3>Match not found</h3></Container>;

    return (
        <Container fluid="lg" className="py-4 py-md-5">
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
            >
                <Card className="glass-card border-0 shadow-lg overflow-hidden">
                    <div className="bg-primary bg-opacity-10 px-4 py-5 d-flex flex-column flex-md-row align-items-center justify-content-between gap-4">
                        <div className="d-flex align-items-center gap-4">
                            <motion.div
                                animate={{ rotate: [0, -10, 10, 0] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                            >
                                <img
                                    src="/logo.png"
                                    alt="SMCC"
                                    height="70"
                                    className="rounded-circle border border-3 border-white shadow-lg"
                                />
                            </motion.div>
                            <div>
                                <div className="d-flex align-items-center flex-wrap gap-2">
                                    <h2 className="fw-black mb-0 premium-gradient-text letter-spacing-1">{t('full_scorecard')}</h2>
                                    <span className="mx-1 opacity-25 d-none d-md-inline">|</span>
                                    <div className="d-flex align-items-center gap-2 text-muted fw-bold small text-uppercase">
                                        <i className="bi bi-shield-check text-primary"></i>
                                        <span>{match.series || 'SMCC LIVE'}</span>
                                        <Badge bg={match.competitionType === 'tournament' ? 'warning' : match.competitionType === 'series' ? 'primary' : 'secondary'} className="x-small">
                                            {match.competitionType || 'Head-to-Head'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex gap-3 w-100 w-md-auto">
                            {['completed', 'abandoned', 'cancelled'].includes(match.status) && (
                                <Button variant="primary" size="lg" onClick={downloadPDF} className="premium-btn px-4 shadow-sm border-0">
                                    <i className="bi bi-file-earmark-pdf-fill me-2"></i> Export PDF
                                </Button>
                            )}
                        </div>
                    </div>

                    <Card.Body className="p-0">
                        <div className="p-4 p-md-5 border-bottom bg-light bg-opacity-50">
                            <Row className="align-items-center text-center text-md-start">
                                <Col lg={7} className="text-center text-lg-start mb-4 mb-lg-0">
                                    <div className="d-inline-flex flex-wrap align-items-center gap-2 px-3 py-2 bg-white bg-opacity-50 rounded-pill border mb-3 small fw-bold text-muted shadow-sm">
                                        <div className="d-flex align-items-center gap-1">
                                            <i className="bi bi-calendar3 text-primary"></i>
                                            <span>Date : {new Date(match.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {formatTime(match.date)}</span>
                                        </div>
                                        <span className="mx-1 opacity-25 d-none d-md-inline">|</span>
                                        <div className="d-flex align-items-center gap-1 mt-1 mt-md-0">
                                            <i className="bi bi-geo-alt-fill text-danger"></i>
                                            <span>Venue : <span style={{ textTransform: 'capitalize' }}>{(match.venue || 'TBA').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</span></span>
                                        </div>
                                    </div>

                                    <h2 className="fw-black mb-1 text-uppercase letter-spacing-1 text-nowrap">
                                        {match.teamA} <span className="text-primary mx-1">VS</span> {match.teamB}
                                    </h2>

                                    {match.competitionType === 'series' && (
                                        <div className="mb-4">
                                            <div className="text-secondary fw-bold mb-2 pb-1" style={{ letterSpacing: '1px' }}>
                                                Match {match.matchNumber} of {seriesData ? seriesData.matches.length : '?'}
                                            </div>
                                            {seriesData && (() => {
                                                let teamAWins = 0;
                                                let teamBWins = 0;
                                                seriesData.matches.forEach(m => {
                                                    if (m.status === 'completed') {
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
                                                });
                                                const totalReq = Math.floor(seriesData.matches.length / 2) + 1;
                                                let seriesStatusStr = '';
                                                if (teamAWins === teamBWins) {
                                                    seriesStatusStr = `Tied ${teamAWins} - ${teamBWins}`;
                                                } else {
                                                    const leader = teamAWins > teamBWins ? (seriesData.matches[0]?.teamA || 'Team A') : (seriesData.matches[0]?.teamB || 'Team B');
                                                    seriesStatusStr = `${leader} ${Math.max(teamAWins, teamBWins)} - ${Math.min(teamAWins, teamBWins)}`;
                                                }

                                                return (
                                                    <div className="fw-black text-dark mb-4 p-2 bg-light rounded d-inline-block shadow-sm">
                                                        Series Lead : <span className="text-primary">{seriesStatusStr}</span>
                                                    </div>
                                                );
                                            })()}
                                            {seriesData && seriesData.matches && seriesData.matches.length > 0 && (
                                                <div className="d-flex overflow-auto gap-2 mb-4 pb-2 pb-md-0 no-scrollbar" style={{ whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                                    {[...seriesData.matches].sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0)).map(sm => {
                                                        const isCurrent = sm.id === match.id || sm._id === match._id;
                                                        let statusSuffix = '';
                                                        if (sm.status === 'upcoming') statusSuffix = '(Upcoming)';
                                                        else if (sm.status === 'completed') statusSuffix = '(Completed)';

                                                        return (
                                                            <Link
                                                                key={sm._id || sm.id}
                                                                to={`/match/${sm._id || sm.id}`}
                                                                className={`btn btn-sm px-4 fw-bold rounded-pill border shadow-sm ${isCurrent ? 'btn-primary border-primary' : 'btn-white text-secondary'}`}
                                                                style={{ minWidth: 'max-content' }}
                                                            >
                                                                Match {sm.matchNumber} {statusSuffix && <span className="opacity-75 small">{statusSuffix}</span>}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-2 text-muted small">
                                        <div className="d-flex align-items-center gap-2 bg-white px-2 py-1 rounded-3 border shadow-sm">
                                            <i className="bi bi-layers-half text-primary"></i>
                                            <span className="fw-bold x-small">{match.totalOvers} Overs Format</span>
                                        </div>
                                        {match.toss?.winner && (
                                            <div className="d-flex align-items-center gap-2 bg-warning bg-opacity-10 px-2 py-1 rounded-3 border border-warning border-opacity-20 shadow-sm">
                                                <i className="bi bi-universal-access text-warning"></i>
                                                <span className="fw-bold text-dark x-small">{match.toss.winner} won toss & elected to {match.toss.decision}</span>
                                            </div>
                                        )}
                                    </div>
                                </Col>

                                <Col lg={5}>
                                    {(match.status === 'completed' || (match.status === 'live' && match.score?.target)) && (
                                        <div className="bg-white p-3 rounded-4 border shadow-sm position-relative overflow-hidden">
                                            <div className="position-absolute top-0 end-0 p-3 opacity-10">
                                                <i className="bi bi-trophy fs-1"></i>
                                            </div>
                                            {match.status === 'completed' ? (
                                                <div className="position-relative">
                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                        <span className="badge bg-success bg-opacity-10 text-success p-1 px-2 rounded-pill letter-spacing-2 fw-black x-small">MATCH RESULT</span>
                                                        <i className="bi bi-star-fill text-warning x-small"></i>
                                                    </div>
                                                    <h5 className="fw-black text-dark mb-3 text-nowrap">
                                                        {(() => {
                                                            const innings = match.innings || [];
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
                                                        })().toUpperCase()}
                                                    </h5>

                                                    {match.manOfTheMatch && (
                                                        <div className="mt-1 pt-3 border-top d-flex align-items-center gap-3">
                                                            <div>
                                                                <i className="bi bi-star-fill shadow-sm rounded-circle p-2 bg-white" style={{ color: '#F4B400', fontSize: '1.2rem', border: '1px solid #f8e5b4' }}></i>
                                                            </div>
                                                            <div>
                                                                <div className="x-small fw-bold text-muted letter-spacing-1">Man of the Match</div>
                                                                <h5 className="fw-black text-dark mb-0 letter-spacing-1">
                                                                    {match.manOfTheMatch.toUpperCase()}
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center p-1">
                                                    <div className="fw-black text-danger x-small mb-2 text-uppercase letter-spacing-2">Chase Requirement</div>
                                                    <div className="fs-5 fw-black text-danger mb-1">
                                                        TARGET: {match.score.target} <span className="x-small">Runs</span>
                                                    </div>
                                                    <div className="p-1 bg-danger bg-opacity-10 rounded-pill d-inline-block px-3 fw-bold text-danger x-small">
                                                        Required from {match.totalOvers} Overs
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Col>

                            </Row>
                        </div>

                        <Nav variant="tabs" className="px-4 border-bottom bg-white border-0">
                            <Nav.Item>
                                <Nav.Link
                                    className={`px-4 py-3 border-0 rounded-0 fw-bold ${activeTab === 'scorecard' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                                    onClick={() => setActiveTab('scorecard')}
                                    style={{ borderBottom: activeTab === 'scorecard' ? '3px solid var(--primary) !important' : '' }}
                                >
                                    Scorecard
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link
                                    className={`px-4 py-3 border-0 rounded-0 fw-bold ${activeTab === 'info' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                                    onClick={() => setActiveTab('info')}
                                    style={{ borderBottom: activeTab === 'info' ? '3px solid var(--primary) !important' : '' }}
                                >
                                    Match Info
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>

                        <div className="p-4 p-md-5">
                            <AnimatePresence mode="wait">
                                {activeTab === 'scorecard' ? (
                                    <motion.div
                                        key="scorecard"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                    >
                                        {match.innings && match.innings.length > 0 ? (
                                            <>
                                                <div className="bg-light p-3 rounded-4 mb-4 border shadow-inner">
                                                    <div className="fw-black text-uppercase x-small text-muted letter-spacing-2 mb-3 px-1">Match Phases</div>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {match.innings.map((inn, idx) => {
                                                            // Hide empty ghost innings (abandoned/glitched middle innings)
                                                            if (idx >= 2 && inn.runs === 0 && inn.wickets === 0 && (!inn.batting || inn.batting.length === 0)) return null;

                                                            const getOrdinal = (n) => { const s = ["th", "st", "nd", "rd"]; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
                                                            const phaseLabel = `${getOrdinal(idx + 1)} Innings${idx >= 2 ? ' (SO)' : ''}`;
                                                            return (
                                                                <Button
                                                                    key={idx}
                                                                    variant={activeInnings === idx ? 'primary' : 'white'}
                                                                    className={`flex-fill py-2 px-3 transition-all border shadow-sm ${activeInnings === idx ? 'bg-primary text-white border-primary shadow-lg' : 'text-primary bg-white border-primary border-opacity-10'}`}
                                                                    onClick={() => setActiveInnings(idx)}
                                                                    style={{ minWidth: '140px' }}
                                                                >
                                                                    <div className="d-flex flex-column align-items-center">
                                                                        <span className="fw-black text-uppercase x-small letter-spacing-1">{inn.team}</span>
                                                                        <span className="fw-bold x-small opacity-75" style={{ fontSize: '0.65rem' }}>{phaseLabel}</span>
                                                                        <span className="fw-black mt-1" style={{ fontSize: '0.85rem' }}>{inn.runs} / {inn.wickets} <small className="opacity-75">({pluralize(inn.overs, 'Over')})</small></span>
                                                                    </div>
                                                                </Button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                                                    <div className="d-flex flex-column">
                                                        <h3 className="fw-black text-uppercase premium-gradient-text mb-1">
                                                            {match.innings[activeInnings].team} {(() => {
                                                                const n = activeInnings + 1; const s = ["th", "st", "nd", "rd"]; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]);
                                                            })()} Innings {activeInnings >= 2 ? '(Super Over)' : ''}
                                                        </h3>
                                                        <div className="text-muted small fw-bold text-uppercase letter-spacing-1">
                                                            {activeInnings < 2 ? `(Total ${match.totalOvers} overs)` : `(Total 1 over)`}
                                                        </div>
                                                    </div>
                                                    {match.manOfTheMatch && (
                                                        <span className="x-small text-muted fw-black bg-light px-2 py-1 rounded border">
                                                            🥇 {match.manOfTheMatch.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>

                                                {match.innings[activeInnings] ? (
                                                    <Row className="gx-lg-4">
                                                        <Col lg={7}>
                                                            <div className="border rounded-4 overflow-hidden shadow-sm bg-white mb-5">
                                                                <Table hover responsive className="mb-0 border-0">
                                                                    <thead className="bg-dark text-white">
                                                                        <tr>
                                                                            <th className="ps-4 py-3 x-small text-uppercase letter-spacing-1">Batting</th>
                                                                            <th className="py-3 x-small text-uppercase letter-spacing-1">Status</th>
                                                                            <th className="text-center py-3 x-small text-uppercase letter-spacing-1">Runs</th>
                                                                            <th className="text-center py-3 x-small text-uppercase letter-spacing-1">Balls Faced</th>
                                                                            <th className="text-center py-3 x-small text-uppercase letter-spacing-1">Fours</th>
                                                                            <th className="text-center py-3 x-small text-uppercase letter-spacing-1">Sixes</th>
                                                                            <th className="text-center py-3 x-small text-uppercase letter-spacing-1">Strike Rate</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(match.innings[activeInnings].batting || []).map((b, idx) => (
                                                                            <tr key={idx} className="align-middle">
                                                                                <td className="ps-4 fw-black text-primary fs-6">{toCamelCase(b.player)}</td>
                                                                                <td className="text-muted fw-bold small">{b.status}</td>
                                                                                <td className="text-center fw-black fs-5">{b.runs}</td>
                                                                                <td className="text-center fw-bold">{b.balls}</td>
                                                                                <td className="text-center fw-bold">{b.fours}</td>
                                                                                <td className="text-center fw-bold">{b.sixes}</td>
                                                                                <td className="text-center text-muted fw-black small">{b.strikeRate}</td>
                                                                            </tr>
                                                                        ))}
                                                                        <tr className="bg-light bg-opacity-50">
                                                                            <td colSpan={2} className="ps-4 text-muted fw-bold">EXTRAS</td>
                                                                            <td colSpan={5} className="ps-3 fw-black fs-5">
                                                                                {match.innings[activeInnings].extras?.total || 0}
                                                                                <small className="ms-3 text-muted fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>
                                                                                    (Wide Ball: {match.innings[activeInnings].extras?.wides || 0},
                                                                                    No Ball: {match.innings[activeInnings].extras?.noBalls || 0},
                                                                                    Bye: {match.innings[activeInnings].extras?.byes || 0},
                                                                                    Leg Bye: {match.innings[activeInnings].extras?.legByes || 0})
                                                                                </small>
                                                                            </td>
                                                                        </tr>
                                                                        <tr className="bg-primary bg-opacity-10 border-top border-primary border-opacity-25">
                                                                            <td colSpan={2} className="ps-4 fw-black fs-4 py-4 text-uppercase text-primary">Total</td>
                                                                            <td colSpan={5} className="ps-3 py-4">
                                                                                <div className="d-flex align-items-baseline gap-3">
                                                                                    <span className="fw-black fs-2 text-primary">{match.innings[activeInnings].runs} / {match.innings[activeInnings].wickets}</span>
                                                                                    <span className="text-muted fs-5 fw-bold">({pluralize(match.innings[activeInnings].overs, 'Over')})</span>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </Table>
                                                                {(() => {
                                                                    const currentInnings = match.innings[activeInnings];
                                                                    const squad = currentInnings.team === match.teamA ? match.teamASquad : match.teamBSquad;
                                                                    if (!squad || squad.length === 0) return null;
                                                                    const battedPlayers = (currentInnings.batting || []).map(b => b.player);
                                                                    const yetToBat = squad.filter(p => p && p.trim() !== '' && !battedPlayers.includes(p));
                                                                    if (yetToBat.length === 0) return null;
                                                                    return (
                                                                        <div className="bg-light p-3 border-top">
                                                                            <span className="x-small fw-black text-uppercase text-muted me-2">Yet to bat:</span>
                                                                            <span className="small fw-bold text-dark">{yetToBat.map(p => toCamelCase(p)).join(', ')}</span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </Col>

                                                        <Col lg={5}>
                                                            <div className="border rounded-4 overflow-hidden shadow-sm bg-white mb-4">
                                                                <div className="bg-dark text-white px-4 py-3 fw-black text-uppercase letter-spacing-1 d-flex align-items-center gap-2">
                                                                    <i className="bi bi-bullseye text-primary"></i>
                                                                    Bowling Summary
                                                                </div>
                                                                <Table hover responsive className="mb-0">
                                                                    <thead className="bg-light">
                                                                        <tr>
                                                                            <th className="ps-4 py-3 text-muted x-small text-uppercase">Bowling</th>
                                                                            <th className="text-center py-3 text-muted x-small text-uppercase">Overs Bowled</th>
                                                                            <th className="text-center py-3 text-muted x-small text-uppercase">Runs</th>
                                                                            <th className="text-center py-3 text-muted x-small text-uppercase">Wickets Taken</th>
                                                                            <th className="text-center py-3 text-muted x-small text-uppercase">Economy</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(() => {
                                                                            const bTeamIdx = activeInnings % 2 === 0 ? activeInnings + 1 : activeInnings - 1;
                                                                            const bInn = match.innings[bTeamIdx];
                                                                            if (!bInn || !bInn.bowling) return (
                                                                                <tr><td colSpan={5} className="text-center py-4 text-muted fw-bold">No bowling data</td></tr>
                                                                            );
                                                                            return bInn.bowling.map((bowler, idx) => (
                                                                                <tr key={idx} className="align-middle">
                                                                                    <td className="ps-4 fw-black text-primary">{toCamelCase(bowler.player)}</td>
                                                                                    <td className="text-center fw-bold">{bowler.overs}</td>
                                                                                    <td className="text-center fw-black">{bowler.runs}</td>
                                                                                    <td className="text-center fw-black text-danger">{bowler.wickets}</td>
                                                                                    <td className="text-center text-muted small">{bowler.economy}</td>
                                                                                </tr>
                                                                            ));
                                                                        })()}
                                                                    </tbody>
                                                                </Table>
                                                                {(() => {
                                                                    const bowlingTeamIdx = activeInnings % 2 === 0 ? activeInnings + 1 : activeInnings - 1;
                                                                    const bowlingInnings = match.innings[bowlingTeamIdx];
                                                                    if (!bowlingInnings || !bowlingInnings.team) return null;

                                                                    const bowlingTeamName = bowlingInnings.team;
                                                                    const squad = bowlingTeamName === match.teamA ? match.teamASquad : match.teamBSquad;
                                                                    if (!squad || squad.length === 0) return null;

                                                                    const bowledPlayers = (bowlingInnings.bowling || []).map(b => b.player);
                                                                    const yetToBowl = squad.filter(p => p && p.trim() !== '' && !bowledPlayers.includes(p));
                                                                    if (yetToBowl.length === 0) return null;

                                                                    return (
                                                                        <div className="bg-light p-3 border-top">
                                                                            <span className="x-small fw-black text-uppercase text-muted me-2">Yet to bowl:</span>
                                                                            <span className="small fw-bold text-dark">{yetToBowl.map(p => toCamelCase(p)).join(', ')}</span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {match.innings[activeInnings].fallOfWickets && match.innings[activeInnings].fallOfWickets.length > 0 && (
                                                                <div className="bg-light p-4 rounded-4 border-dashed mb-4">
                                                                    <h6 className="fw-black text-uppercase x-small text-muted letter-spacing-1 mb-3">Fall of Wickets</h6>
                                                                    <div className="small fw-bold text-dark" style={{ lineHeight: '1.8' }}>
                                                                        {match.innings[activeInnings].fallOfWickets.map((fow, i) => (
                                                                            <span key={i}>
                                                                                {fow.wicket}-{fow.runs} ({toCamelCase(fow.player)})
                                                                                {i < match.innings[activeInnings].fallOfWickets.length - 1 ? <span className="text-muted mx-2">|</span> : ''}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                        </Col>
                                                    </Row>
                                                ) : (
                                                    <div className="text-center py-5 glass-card border-dashed">
                                                        <p className="text-muted fw-bold">Innings data not initialized</p>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center py-5 glass-card border-dashed">
                                                <i className="bi bi-info-circle fs-1 text-muted opacity-25 d-block mb-3"></i>
                                                <span className="text-muted fw-bold text-uppercase letter-spacing-1">No innings data available yet for this match.</span>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="info"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <Row className="gy-4">
                                            <Col md={6}>
                                                <h6 className="fw-bold text-primary mb-3">MATCH DETAILS</h6>
                                                <div className="bg-light p-4 rounded-4">
                                                    <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                                                        <span className="text-muted">Series</span>
                                                        <span className="fw-bold">{match.series || 'SMCC LIVE'}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                                                        <span className="text-muted">Ground</span>
                                                        <span className="fw-bold">{match.venue || 'TBD'}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-3 border-bottom pb-2 text-end">
                                                        <span className="text-muted">Toss</span>
                                                        <span className="fw-bold" style={{ maxWidth: '60%' }}>
                                                            {match.toss?.winner ? `${match.toss.winner}, elected to ${match.toss.decision} first` : 'To be decided'}
                                                        </span>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                                                        <span className="text-muted">Date & Time</span>
                                                        <span className="fw-bold text-end">
                                                            {new Date(match.date).toLocaleDateString()} <br />
                                                            <span className="text-muted small">{formatTime(match.date)}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col md={6}>
                                                <h6 className="fw-bold text-primary mb-3">TOURNAMENT RULES</h6>
                                                <div className="bg-dark text-white p-4 rounded-4 shadow-sm">
                                                    <ul className="small mb-0 list-unstyled" style={{ lineHeight: '1.6' }}>
                                                        <li><i className="bi bi-check-circle-fill text-success me-2"></i>Pure Bowling Format</li>
                                                        <li><i className="bi bi-check-circle-fill text-success me-2"></i>Free Hit on all No Balls</li>
                                                        <li className="mt-2 fw-bold text-info"><i className="bi bi-star-fill me-2"></i>SUPER OVER RULES:</li>
                                                        <li className="ms-4 opacity-75">1. Chasing team from main match always bats first in SO 1.</li>
                                                        <li className="ms-4 opacity-75">2. If SO is tied, team batting 2nd in previous SO bats 1st in next.</li>
                                                        <li className="ms-4 opacity-75">3. 1 Over (6 balls) and 2 Wickets per side in SO.</li>
                                                        <li className="ms-4 opacity-75">4. Dismissed batters in previous SO cannot play again.</li>
                                                        <li className="mt-2"><i className="bi bi-check-circle-fill text-success me-2"></i>Umpire Decision is Final</li>
                                                    </ul>
                                                </div>
                                            </Col>
                                        </Row>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div >
                    </Card.Body >
                </Card >
            </motion.div >
            <AnimatePresence>
                {showBlast && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed-top h-100 w-100 d-flex align-items-center justify-content-center pointer-events-none"
                        style={{ zIndex: 9999, pointerEvents: 'none' }}
                    >
                        <motion.h1
                            initial={{ scale: 0, rotate: -20, y: 100 }}
                            animate={{ scale: [0, 1.5, 1], rotate: [20, -10, 0], y: 0 }}
                            className="display-1 fw-black text-white px-5 py-4 rounded-4 shadow-lg text-center"
                            style={{
                                background: blastValue === 6 ? 'linear-gradient(45deg, #059669, #10b981)' : 'linear-gradient(45deg, #d97706, #fbbf24)',
                                border: '10px solid white',
                                textShadow: '0 10px 20px rgba(0,0,0,0.3)',
                                letterSpacing: '4px'
                            }}
                        >
                            {blastValue === 6 ? 'SIX!' : 'FOUR!'}
                        </motion.h1>
                    </motion.div>
                )}
            </AnimatePresence>
        </Container >
    );
};

export default FullScorecard;
