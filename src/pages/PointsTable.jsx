import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Table, Card, Spinner, Badge, Nav } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import API_URL from '../utils/api';
import { pluralize } from '../utils/formatters';

const socket = io(API_URL);

const PointsTable = () => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSeries, setActiveSeries] = useState(null);

    const calculateStats = (matchList) => {
        const teamStats = {};

        matchList.filter(m => m.status === 'completed' || m.status === 'live').forEach(m => {
            const innings = m.innings || [];
            if (innings.length < 2) return;

            const teams = [m.teamA, m.teamB];
            teams.forEach(t => {
                if (!teamStats[t]) {
                    teamStats[t] = {
                        name: t, p: 0, w: 0, l: 0, d: 0, pts: 0, nrr: 0,
                        runsScored: 0, ballsFaced: 0,
                        runsConceded: 0, ballsBowled: 0
                    };
                }
            });

            const runsA = innings[0].runs || 0;
            const runsB = innings[1].runs || 0;
            const teamA = innings[0].team;
            const teamB = innings[1].team;

            if (m.status === 'completed') {
                teamStats[teamA].p += 1;
                teamStats[teamB].p += 1;

                if (runsA > runsB) {
                    teamStats[teamA].w += 1;
                    teamStats[teamA].pts += 2;
                    teamStats[teamB].l += 1;
                } else if (runsB > runsA) {
                    teamStats[teamB].w += 1;
                    teamStats[teamB].pts += 2;
                    teamStats[teamA].l += 1;
                } else if (innings.length >= 4) {
                    const runs3 = innings[2].runs || 0;
                    const runs4 = innings[3].runs || 0;
                    const team3 = innings[2].team;
                    const team4 = innings[3].team;
                    if (runs3 > runs4) {
                        teamStats[team3].w += 1;
                        teamStats[team3].pts += 2;
                        const loser = team3 === teamA ? teamB : teamA;
                        teamStats[loser].l += 1;
                    } else if (runs4 > runs3) {
                        teamStats[team4].w += 1;
                        teamStats[team4].pts += 2;
                        const loser = team4 === teamA ? teamB : teamA;
                        teamStats[loser].l += 1;
                    } else {
                        teamStats[teamA].d += 1;
                        teamStats[teamA].pts += 1;
                        teamStats[teamB].d += 1;
                        teamStats[teamB].pts += 1;
                    }
                } else {
                    teamStats[teamA].d += 1;
                    teamStats[teamA].pts += 1;
                    teamStats[teamB].d += 1;
                    teamStats[teamB].pts += 1;
                }
            }

            const getBalls = (overs) => (Math.floor(overs) * 6) + Math.round((overs % 1) * 10);

            teamStats[teamA].runsScored += runsA;
            teamStats[teamA].ballsFaced += getBalls(innings[0].overs || 0);
            teamStats[teamA].runsConceded += runsB;
            teamStats[teamA].ballsBowled += getBalls(innings[1].overs || 0);

            teamStats[teamB].runsScored += runsB;
            teamStats[teamB].ballsFaced += getBalls(innings[1].overs || 0);
            teamStats[teamB].runsConceded += runsA;
            teamStats[teamB].ballsBowled += getBalls(innings[0].overs || 0);
        });

        return Object.values(teamStats).map(t => {
            const oversFaced = t.ballsFaced / 6;
            const oversBowled = t.ballsBowled / 6;
            const nrrValue = ((t.runsScored / (oversFaced || 1)) - (t.runsConceded / (oversBowled || 1)));
            const nrr = nrrValue.toFixed(3);
            return { ...t, nrr };
        }).sort((a, b) => b.pts - a.pts || parseFloat(b.nrr) - parseFloat(a.nrr));
    };

    const fetchMatches = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/matches`);
            const data = Array.isArray(res.data) ? res.data : [];
            setMatches(data);

            if (data.length > 0) {
                const seriesList = [...new Set(data.map(m => m.series || 'SMCC LIVE'))];
                setActiveSeries(prev => prev || seriesList[0]);
            }
        } catch (err) {
            console.error("Error fetching matches", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
        socket.on('matchUpdate', () => fetchMatches());
        socket.on('matchDeleted', () => fetchMatches());

        return () => {
            socket.off('matchUpdate');
            socket.off('matchDeleted');
        };
    }, []);

    if (loading) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <Spinner animation="grow" variant="primary" />
        </Container>
    );

    const seriesList = [...new Set(matches.map(m => m.series || 'SMCC LIVE'))];
    const filteredMatches = matches.filter(m => (m.series || 'SMCC LIVE') === activeSeries);
    const stats = calculateStats(filteredMatches);

    return (
        <Container className="py-4 py-md-5">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="mb-4">
                    <h2 className="fw-black text-dark text-uppercase mb-3 letter-spacing-1">Series Standings</h2>

                    {seriesList.length > 1 && (
                        <Nav variant="pills" className="bg-white p-2 rounded-pill shadow-sm border mb-4 gap-2 d-inline-flex">
                            {seriesList.map(series => (
                                <Nav.Item key={series}>
                                    <Nav.Link
                                        active={activeSeries === series}
                                        onClick={() => setActiveSeries(series)}
                                        className={`rounded-pill px-4 fw-bold small text-uppercase ${activeSeries === series ? 'bg-primary' : 'text-muted'}`}
                                    >
                                        {series}
                                    </Nav.Link>
                                </Nav.Item>
                            ))}
                        </Nav>
                    )}
                </div>

                <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
                    <div className="bg-light px-4 py-3 border-bottom d-flex justify-content-between align-items-center">
                        <span className="fw-black text-uppercase x-small text-muted letter-spacing-2">
                            {activeSeries} • Points Table
                        </span>
                        <Badge bg="success" className="x-small px-2 py-1 shadow-sm">REAL-TIME</Badge>
                    </div>
                    <Card.Body className="p-0">
                        <Table hover responsive className="mb-0">
                            <thead className="bg-white">
                                <tr className="text-muted x-small text-uppercase fw-black letter-spacing-1 border-bottom">
                                    <th className="ps-4 py-3">Teams</th>
                                    <th className="text-center py-3">Played</th>
                                    <th className="text-center py-3">Won</th>
                                    <th className="text-center py-3">Lost</th>
                                    <th className="text-center py-3">Tied/NR</th>
                                    <th className="text-center py-3">Points</th>
                                    <th className="text-center py-3 pe-4">Net Run Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode='wait'>
                                    {stats.length === 0 ? (
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            key="empty"
                                        >
                                            <td colSpan={7} className="text-center py-5 text-muted fw-bold">
                                                No matches played in this series yet.
                                            </td>
                                        </motion.tr>
                                    ) : (
                                        stats.map((team, idx) => (
                                            <motion.tr
                                                key={team.name}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="align-middle border-bottom"
                                            >
                                                <td className="ps-4 py-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="fw-bold text-muted small">{idx + 1}</span>
                                                        <span className="fw-black text-dark text-uppercase">{team.name}</span>
                                                    </div>
                                                </td>
                                                <td className="text-center py-3 fw-bold">{team.p}</td>
                                                <td className="text-center py-3 text-success fw-bold">{team.w}</td>
                                                <td className="text-center py-3 text-danger fw-bold">{team.l}</td>
                                                <td className="text-center py-3 text-muted">{team.d}</td>
                                                <td className="text-center py-3 fw-black text-primary fs-5">{team.pts}</td>
                                                <td className="text-center py-3 pe-4 fw-bold text-muted">{team.nrr}</td>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>

                <div className="mt-4 p-4 border rounded-3 bg-white shadow-sm x-small text-muted">
                    <p className="mb-2 fw-black text-uppercase letter-spacing-1 text-dark">NRR Rules & Calculation</p>
                    <p className="mb-0">
                        Net Run Rate (NRR) is calculated by taking the average runs per over that a team scores across the whole tournament,
                        and subtracting the average runs per over that is scored against them.
                        <br />
                        <strong>NRR Formula:</strong> (Total Runs Scored / Total Overs Faced) - (Total Runs Conceded / Total Overs Bowled).
                    </p>
                </div>
            </motion.div>
        </Container>
    );
};

export default PointsTable;
