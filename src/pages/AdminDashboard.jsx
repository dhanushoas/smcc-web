import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Table, Badge, ListGroup, Modal, Spinner, Alert } from 'react-bootstrap';
import { Toaster, toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

const AdminDashboard = () => {
    const [matches, setMatches] = useState([]);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const navigate = useNavigate();

    const [createForm, setCreateForm] = useState({
        title: '', teamA: '', teamB: '', status: 'upcoming',
        date: new Date().toISOString().split('T')[0],
        time: '09:00', venue: '', totalOvers: 20
    });

    const [striker, setStriker] = useState('');
    const [nonStriker, setNonStriker] = useState('');
    const [bowler, setBowler] = useState('');
    const [scorecardData, setScorecardData] = useState([]);

    // Modals State
    const [showStartModal, setShowStartModal] = useState(false);
    const [showBowlerModal, setShowBowlerModal] = useState(false);
    const [showBatsmanModal, setShowBatsmanModal] = useState(false);
    const [batsmanModalType, setBatsmanModalType] = useState('wicket');
    const [showRunOutModal, setShowRunOutModal] = useState(false);
    const [runOutOutType, setRunOutOutType] = useState('striker');

    const [showWicketModal, setShowWicketModal] = useState(false);
    const [wicketDetails, setWicketDetails] = useState({
        type: 'caught',
        fielder: ''
    });

    const [modalData, setModalData] = useState({
        s: '', ns: '', b: '', nextB: '', nextS: ''
    });

    // New State for Features
    const [showSquadModal, setShowSquadModal] = useState(false);
    const [showTossModal, setShowTossModal] = useState(false);
    const [squadA, setSquadA] = useState(Array(11).fill(''));
    const [squadB, setSquadB] = useState(Array(11).fill(''));
    const [tossData, setTossData] = useState({ winner: '', decision: 'bat' });

    const capitalizeName = (name) => {
        if (!name) return '';
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    const handleSquadChange = (team, index, value) => {
        const val = capitalizeName(value);
        if (team === 'A') {
            const newSquad = [...squadA];
            newSquad[index] = val;
            setSquadA(newSquad);
        } else {
            const newSquad = [...squadB];
            newSquad[index] = val;
            setSquadB(newSquad);
        }
    };

    const validateSquads = () => {
        const fullA = squadA.every(p => p.trim() !== '');
        const fullB = squadB.every(p => p.trim() !== '');
        return fullA && fullB;
    };

    const handleSquadSave = async () => {
        if (!validateSquads()) {
            toast.error("Please fill all 11 player names for both teams!");
            return;
        }

        if (isCreating) {
            setShowSquadModal(false);
            toast.success("Squads ready for new match!");
        } else if (selectedMatch) {
            // Save to DB immediately for existing match
            try {
                await handleUpdate('manual', {
                    ...selectedMatch,
                    teamASquad: squadA,
                    teamBSquad: squadB
                });
                setShowSquadModal(false);
                toast.success("Squads updated!");
            } catch (err) {
                toast.error("Failed to save squads");
            }
        }
    };

    const activeToken = localStorage.getItem('token');
    const config = { headers: { 'x-auth-token': activeToken } };

    const fetchMatches = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/matches`);
            setMatches(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load matches");
        }
    };

    useEffect(() => {
        if (!activeToken) navigate('/login');
        fetchMatches();

        socket.on('matchUpdate', (updatedMatch) => {
            setMatches(prevMatches => {
                const index = prevMatches.findIndex(m => m._id === updatedMatch._id || m.id === updatedMatch.id);
                if (index !== -1) {
                    const newMatches = [...prevMatches];
                    newMatches[index] = updatedMatch;
                    return newMatches;
                }
                return [updatedMatch, ...prevMatches];
            });

            if (selectedMatch && (selectedMatch._id === updatedMatch._id || selectedMatch.id === updatedMatch.id)) {
                syncLocalPlayers(updatedMatch);
                setSelectedMatch(updatedMatch);
                setScorecardData(updatedMatch.innings);
            }
        });

        socket.on('matchDeleted', (matchId) => {
            setMatches(prev => prev.filter(m => m._id !== matchId && m.id !== matchId));
            if (selectedMatch?._id === matchId || selectedMatch?.id === matchId) setSelectedMatch(null);
        });

        return () => {
            socket.off('matchUpdate');
            socket.off('matchDeleted');
        };
    }, [navigate, activeToken, selectedMatch]);

    const syncLocalPlayers = (match) => {
        if (match.currentBatsmen && match.currentBatsmen.length >= 1) {
            setStriker(match.currentBatsmen.find(b => b.onStrike)?.name || '');
            setNonStriker(match.currentBatsmen.find(b => !b.onStrike)?.name || '');
        }
        setBowler(match.currentBowler || '');

        // Sync squads if they exist
        if (match.teamASquad && match.teamASquad.length === 11) setSquadA(match.teamASquad);
        else setSquadA(Array(11).fill(''));

        if (match.teamBSquad && match.teamBSquad.length === 11) setSquadB(match.teamBSquad);
        else setSquadB(Array(11).fill(''));
    };

    const handleEdit = (match) => {
        setSelectedMatch(match);
        setIsCreating(false);
        syncLocalPlayers(match);

        if (!match.innings || match.innings.length === 0) {
            const inningsTemplate = [
                {
                    team: match.teamA, runs: 0, wickets: 0, overs: 0,
                    batting: [], bowling: [],
                    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 }
                },
                {
                    team: match.teamB, runs: 0, wickets: 0, overs: 0,
                    batting: [], bowling: [],
                    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 }
                }
            ];
            setScorecardData(inningsTemplate);
        } else {
            setScorecardData(match.innings);
        }
    };

    const handleUpdate = async (type, value, params = {}) => {
        let updatedMatch = { ...selectedMatch, innings: [...scorecardData] };

        if (type === 'manual') {
            updatedMatch = value;
        } else {
            // Safety: Ensure innings structure exists and has 2 teams
            if (!updatedMatch.innings || updatedMatch.innings.length < 2) {
                const template = [
                    { team: updatedMatch.teamA, runs: 0, wickets: 0, overs: 0, batting: [], bowling: [], extras: { total: 0, wides: 0, noBalls: 0 } },
                    { team: updatedMatch.teamB, runs: 0, wickets: 0, overs: 0, batting: [], bowling: [], extras: { total: 0, wides: 0, noBalls: 0 } }
                ];
                updatedMatch.innings = template;
                setScorecardData(template); // Fix local state too
            }

            let battingTeam = updatedMatch.score.battingTeam || updatedMatch.teamA;

            // Determine index. If team names don't match, fallback to 0/1 safely
            let battingTeamIdx = 0;
            if (battingTeam === updatedMatch.teamB) battingTeamIdx = 1;

            let bowlingTeamIdx = battingTeamIdx === 0 ? 1 : 0;

            let currentInnings = updatedMatch.innings[battingTeamIdx];
            let currentBowling = updatedMatch.innings[bowlingTeamIdx];

            // Double safety if for some reason index is out of bounds (e.g. malformed innings array)
            if (!currentInnings) {
                currentInnings = updatedMatch.innings[0];
                currentBowling = updatedMatch.innings[1];
            }

            if (type === 'init') {
                const { s, ns, b } = value;
                // Ensure arrays exist
                if (!currentInnings.batting) currentInnings.batting = [];
                if (!currentBowling.bowling) currentBowling.bowling = [];

                if (!currentInnings.batting.find(p => p.player === s)) {
                    currentInnings.batting.push({ player: s, status: 'not out', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 });
                }
                if (!currentInnings.batting.find(p => p.player === ns)) {
                    currentInnings.batting.push({ player: ns, status: 'not out', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 });
                }
                if (!currentBowling.bowling.find(p => p.player === b)) {
                    currentBowling.bowling.push({ player: b, overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 });
                }
                updatedMatch.currentBatsmen = [
                    { name: s, onStrike: true, runs: 0, balls: 0 },
                    { name: ns, onStrike: false, runs: 0, balls: 0 }
                ];
                updatedMatch.currentBowler = b;
                updatedMatch.status = 'live';
                if (!updatedMatch.score.battingTeam) updatedMatch.score.battingTeam = updatedMatch.teamA;

                setStriker(s); setNonStriker(ns); setBowler(b);
            } else {
                // Fallback: If state is empty, try to get from current match object
                let localStriker = striker || updatedMatch.currentBatsmen?.find(b => b.onStrike)?.name || '';
                let localNonStriker = nonStriker || updatedMatch.currentBatsmen?.find(b => !b.onStrike)?.name || '';
                let localBowler = bowler || updatedMatch.currentBowler || '';

                let sIdx = currentInnings.batting.findIndex(p => p.player === localStriker);

                // Auto-fix: If player exists in currentBatsmen but not in innings list (shouldn't happen but safe to handle)
                if (sIdx === -1 && localStriker) {
                    currentInnings.batting.push({ player: localStriker, status: 'not out', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 });
                    sIdx = currentInnings.batting.length - 1;
                }

                let bIdx = currentBowling.bowling.findIndex(p => p.player === localBowler);
                if (bIdx === -1 && localBowler) {
                    currentBowling.bowling.push({ player: localBowler, overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 });
                    bIdx = currentBowling.bowling.length - 1;
                }

                if ((!localStriker || !localBowler || sIdx === -1 || bIdx === -1) && type !== 'new_bowler') {
                    // Allow new_bowler to proceed even if striker is missing (edge case)
                    console.error("Missing State:", { localStriker, localBowler, sIdx, bIdx });
                    toast.error("Batsman or Bowler missing! Please check Match Info.");
                    return;
                }

                let ballCounts = true;

                if (type === 'runs') {
                    currentInnings.batting[sIdx].runs += value;
                    currentInnings.batting[sIdx].balls += 1;
                    if (value === 4) currentInnings.batting[sIdx].fours += 1;
                    if (value === 6) currentInnings.batting[sIdx].sixes += 1;
                    currentBowling.bowling[bIdx].runs += value;
                    currentInnings.runs += value;
                    if (value % 2 !== 0) {
                        const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                    }
                } else if (type === 'extra') {
                    currentInnings.runs += 1;
                    currentBowling.bowling[bIdx].runs += 1;
                    if (value === 'w') { currentInnings.extras.wides += 1; ballCounts = false; }
                    else if (value === 'nb') { currentInnings.extras.noBalls += 1; ballCounts = false; }
                    currentInnings.extras.total += 1;
                } else if (type === 'run_out_striker' || type === 'run_out_nonstriker') {
                    const isStrikerOut = type === 'run_out_striker';
                    const outPlayer = isStrikerOut ? localStriker : localNonStriker;
                    const pIdx = currentInnings.batting.findIndex(p => p.player === outPlayer);

                    if (pIdx !== -1) {
                        currentInnings.wickets += 1;
                        currentInnings.batting[pIdx].status = 'run out';
                        currentInnings.batting[sIdx].balls += 1; // Ball still counts

                        // We need a new batsman
                        setRunOutOutType(isStrikerOut ? 'striker' : 'non-striker');
                        setBatsmanModalType('wicket');
                        setShowBatsmanModal(true);
                        return; // Modal will handle the replacement
                    }
                } else if (type === 'wicket_with_replacement' || type === 'retired_with_replacement') {
                    const newName = value;
                    const isStrikerReplacement = runOutOutType === 'striker';

                    // Identify which player index was out
                    const outPlayerName = isStrikerReplacement ? localStriker : localNonStriker;
                    const outIdx = currentInnings.batting.findIndex(p => p.player === outPlayerName);

                    if (type === 'wicket_with_replacement') {
                        // Regular Wicket or Run Out confirmed
                        if (currentInnings.batting[outIdx]?.status === 'not out' || currentInnings.batting[outIdx]?.status === 'run out') {
                            currentInnings.wickets += 1;

                            const wDetail = params.wicketDetails || { type: 'bowled' };
                            let outStatus = '';
                            if (wDetail.type === 'caught') outStatus = `c ${wDetail.fielder} b ${localBowler}`;
                            else if (wDetail.type === 'bowled') outStatus = `b ${localBowler}`;
                            else if (wDetail.type === 'lbw') outStatus = `lbw b ${localBowler}`;
                            else if (wDetail.type === 'stumped') outStatus = `st ${wDetail.fielder} b ${localBowler}`;
                            else if (wDetail.type === 'run out') outStatus = `run out (${wDetail.fielder})`;
                            else if (wDetail.type === 'hit wicket') outStatus = `hit wicket b ${localBowler}`;
                            else outStatus = 'out';

                            currentInnings.batting[outIdx].status = outStatus;

                            if (wDetail.type !== 'run out') {
                                currentBowling.bowling[bIdx].wickets += 1;
                            }

                            currentInnings.batting[sIdx].balls += 1; // Ball still counts
                        }
                    } else {
                        currentInnings.batting[outIdx].status = 'retired hurt';
                        currentInnings.batting[outIdx].balls += 1;
                    }

                    if (isStrikerReplacement) localStriker = newName;
                    else localNonStriker = newName;

                    if (!currentInnings.batting.find(p => p.player === newName)) {
                        currentInnings.batting.push({ player: newName, status: 'not out', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 });
                    }
                    setRunOutOutType('striker'); // Reset for regular wickets
                } else if (type === 'new_bowler') {
                    localBowler = value;
                    if (!currentBowling.bowling.find(p => p.player === value)) {
                        currentBowling.bowling.push({ player: value, overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 });
                    }
                }

                if (ballCounts && type !== 'wicket_with_replacement' && type !== 'retired_with_replacement' && type !== 'new_bowler') {
                    let currentOvers = currentInnings.overs;
                    let overFull = Math.floor(currentOvers);
                    let ballCount = Math.round((currentOvers * 10) % 10) + 1;

                    let bOvers = currentBowling.bowling[bIdx].overs;
                    let bOverFull = Math.floor(bOvers);
                    let bBallCount = Math.round((bOvers * 10) % 10) + 1;

                    if (ballCount >= 6) {
                        ballCount = 0; overFull += 1;
                        bBallCount = 0; bOverFull += 1;
                        const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                        if (overFull < updatedMatch.totalOvers) { setShowBowlerModal(true); }
                    } else {
                        if (bBallCount >= 6) { bBallCount = 0; bOverFull += 1; }
                    }
                    currentInnings.overs = parseFloat(`${overFull}.${ballCount}`);
                    currentBowling.bowling[bIdx].overs = parseFloat(`${bOverFull}.${bBallCount}`);
                }

                currentInnings.batting.forEach(p => { if (p.balls > 0) p.strikeRate = parseFloat(((p.runs / p.balls) * 100).toFixed(2)); });
                currentBowling.bowling.forEach(p => {
                    let totalBalls = (Math.floor(p.overs) * 6) + (Math.round((p.overs * 10) % 10));
                    if (totalBalls > 0) p.economy = parseFloat(((p.runs / totalBalls) * 6).toFixed(2));
                });

                const isAllOut = currentInnings.wickets >= 10;
                const isOversCompleted = currentInnings.overs >= updatedMatch.totalOvers;
                const targetChased = updatedMatch.score.target && currentInnings.runs >= updatedMatch.score.target;

                if (isAllOut || isOversCompleted || targetChased) {
                    if (!updatedMatch.score.target) {
                        updatedMatch.score.target = currentInnings.runs + 1;
                        const nextTeam = updatedMatch.score.battingTeam === updatedMatch.teamA ? updatedMatch.teamB : updatedMatch.teamA;
                        if (window.confirm(`${currentInnings.team} innings over. Start ${nextTeam} innings?`)) {
                            updatedMatch.score.battingTeam = nextTeam;
                            updatedMatch.score.runs = 0; updatedMatch.score.wickets = 0; updatedMatch.score.overs = 0;
                            localStriker = ''; localNonStriker = ''; localBowler = '';
                            setShowStartModal(true);
                        }
                    } else {
                        updatedMatch.status = 'completed';
                        const mom = calculateMOM(updatedMatch);
                        if (mom) updatedMatch.manOfTheMatch = mom;
                    }
                }

                updatedMatch.score.runs = currentInnings.runs;
                updatedMatch.score.wickets = currentInnings.wickets;
                updatedMatch.score.overs = currentInnings.overs;
                updatedMatch.currentBowler = localBowler;
                updatedMatch.currentBatsmen = [
                    { name: localStriker, onStrike: true, runs: currentInnings.batting.find(p => p.player === localStriker)?.runs || 0, balls: currentInnings.batting.find(p => p.player === localStriker)?.balls || 0 },
                    { name: localNonStriker, onStrike: false, runs: currentInnings.batting.find(p => p.player === localNonStriker)?.runs || 0, balls: currentInnings.batting.find(p => p.player === localNonStriker)?.balls || 0 }
                ];

                setStriker(localStriker); setNonStriker(localNonStriker); setBowler(localBowler);
            }
        }

        try {
            const res = await axios.put(`${API_URL}/api/matches/${selectedMatch._id || selectedMatch.id}`, updatedMatch, config);
            setSelectedMatch(res.data);
            setScorecardData(res.data.innings);
            toast.success("Score Updated!", { id: 'score-toast' });
        } catch (err) { toast.error("Sync failed"); }
    };

    const calculateMOM = (match) => {
        const inn1 = match.innings[0];
        const inn2 = match.innings[1];
        if (!inn1 || !inn2) return null;
        let winningTeam = null;
        if (inn1.runs > inn2.runs) winningTeam = inn1.team;
        else if (inn2.runs > inn1.runs) winningTeam = inn2.team;
        else return null;
        const winnerInn = match.innings.find(i => i.team === winningTeam);
        const loserInn = match.innings.find(i => i.team !== winningTeam);
        let candidates = {};
        winnerInn?.batting.forEach(p => { candidates[p.player] = { runs: p.runs, wickets: 0 }; });
        loserInn?.bowling.forEach(p => {
            if (!candidates[p.player]) candidates[p.player] = { runs: 0, wickets: 0 };
            candidates[p.player].wickets = p.wickets;
        });
        let best = null; let max = -1;
        Object.keys(candidates).forEach(name => {
            const score = candidates[name].runs + (candidates[name].wickets * 25);
            if (score > max) { max = score; best = name; }
        });
        return best;
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!validateSquads()) {
                toast.error("Please fill all 11 player names for both teams!");
                return;
            }
            await axios.post(`${API_URL}/api/matches`, {
                ...createForm,
                teamASquad: squadA,
                teamBSquad: squadB,
                date: `${createForm.date}T${createForm.time}`,
                title: createForm.title || `${createForm.teamA} vs ${createForm.teamB}`
            }, config);
            toast.success("Match created!");
            fetchMatches(); setIsCreating(false);
        } catch (err) { toast.error("Error creating match"); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Delete this match?")) {
            try {
                await axios.delete(`${API_URL}/api/matches/${id}`, config);
                toast.success('Deleted'); fetchMatches();
                if (selectedMatch?._id === id || selectedMatch?.id === id) setSelectedMatch(null);
            } catch (err) { toast.error("Failed"); }
        }
    };

    const getOversInBalls = (overs) => {
        return (Math.floor(overs) * 6) + Math.round((overs * 10) % 10);
    };

    const crr = (selectedMatch?.score?.overs > 0) ? (selectedMatch?.score?.runs / selectedMatch?.score?.overs).toFixed(2) : '0.00';

    const calculateRRR = () => {
        if (!selectedMatch?.score?.target) return null;
        const runsNeeded = selectedMatch.score.target - selectedMatch.score.runs;
        const totalBalls = selectedMatch.totalOvers * 6;
        const ballsBowled = getOversInBalls(selectedMatch.score.overs);
        const ballsRemaining = totalBalls - ballsBowled;
        if (ballsRemaining <= 0) return runsNeeded <= 0 ? '0.00' : '∞';
        return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
    };
    const rrr = calculateRRR();

    return (
        <Container className="py-4">
            <Toaster position="top-right" />

            {/* SQUAD MODAL */}
            <Modal show={showSquadModal} onHide={() => setShowSquadModal(false)} size="xl" backdrop="static">
                <Modal.Header closeButton><Modal.Title>Manage Squads (11 Players Each)</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <h5 className="text-center text-primary fw-bold mb-3">{createForm.teamA || selectedMatch?.teamA || 'Team A'}</h5>
                            {squadA.map((p, i) => (
                                <Form.Control key={i} className="mb-2" placeholder={`Player ${i + 1}`} value={p} onChange={e => handleSquadChange('A', i, e.target.value)} />
                            ))}
                        </Col>
                        <Col md={6}>
                            <h5 className="text-center text-danger fw-bold mb-3">{createForm.teamB || selectedMatch?.teamB || 'Team B'}</h5>
                            {squadB.map((p, i) => (
                                <Form.Control key={i} className="mb-2" placeholder={`Player ${i + 1}`} value={p} onChange={e => handleSquadChange('B', i, e.target.value)} />
                            ))}
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" onClick={handleSquadSave}>Save Squads</Button>
                </Modal.Footer>
            </Modal>

            {/* TOSS MODAL */}
            <Modal show={showTossModal} onHide={() => setShowTossModal(false)} centered backdrop="static">
                <Modal.Header><Modal.Title>🪙 Coin Toss</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Winner</Form.Label>
                        <Form.Select value={tossData.winner} onChange={e => setTossData({ ...tossData, winner: e.target.value })}>
                            <option value="">Select Winner</option>
                            <option value={selectedMatch?.teamA}>{selectedMatch?.teamA}</option>
                            <option value={selectedMatch?.teamB}>{selectedMatch?.teamB}</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Decision</Form.Label>
                        <Form.Select value={tossData.decision} onChange={e => setTossData({ ...tossData, decision: e.target.value })}>
                            <option value="bat">Bat</option>
                            <option value="bowl">Bowl</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => {
                        if (!tossData.winner) return toast.error("Select a winner");
                        const battingTeam = tossData.decision === 'bat' ? tossData.winner : (tossData.winner === selectedMatch.teamA ? selectedMatch.teamB : selectedMatch.teamA);
                        handleUpdate('manual', {
                            ...selectedMatch,
                            toss: tossData,
                            score: { ...selectedMatch.score, battingTeam } // Auto set batting team
                        });
                        setShowTossModal(false);
                    }}>Confirm Toss</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showStartModal} onHide={() => setShowStartModal(false)} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
                <Modal.Header className="bg-primary text-white border-0 py-3 px-4"><Modal.Title className="fw-black">🚀 START MATCH</Modal.Title></Modal.Header>
                <Modal.Body className="p-4 bg-light">
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small text-uppercase text-muted">Striker</Form.Label>
                        <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.s} onChange={e => setModalData({ ...modalData, s: e.target.value })}>
                            <option value="">Select Striker</option>
                            {(selectedMatch?.score?.battingTeam === selectedMatch?.teamA ? squadA : squadB).map((p, i) => <option key={i} value={p}>{p}</option>)}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small text-uppercase text-muted">Non-Striker</Form.Label>
                        <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.ns} onChange={e => setModalData({ ...modalData, ns: e.target.value })}>
                            <option value="">Select Non-Striker</option>
                            {(selectedMatch?.score?.battingTeam === selectedMatch?.teamA ? squadA : squadB).map((p, i) => <option key={i} value={p}>{p}</option>)}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small text-uppercase text-muted">Bowler</Form.Label>
                        <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.b} onChange={e => setModalData({ ...modalData, b: e.target.value })}>
                            <option value="">Select Bowler</option>
                            {(selectedMatch?.score?.battingTeam === selectedMatch?.teamA ? squadB : squadA).map((p, i) => <option key={i} value={p}>{p}</option>)}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light pb-4 px-4"><Button variant="primary" size="lg" className="w-100 fw-black rounded-pill shadow" onClick={() => { handleUpdate('init', modalData); setShowStartModal(false); }}>LET'S PLAY</Button></Modal.Footer>
            </Modal>

            <Modal show={showBowlerModal} onHide={() => setShowBowlerModal(false)} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
                <Modal.Header className="bg-dark text-white border-0 py-3 px-4"><Modal.Title className="fw-black">⚾ NEXT BOWLER</Modal.Title></Modal.Header>
                <Modal.Body className="p-4 bg-light">
                    <Form.Group>
                        <Form.Label className="fw-bold small text-uppercase text-muted">Next Bowler Name:</Form.Label>
                        <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.nextB} onChange={e => setModalData({ ...modalData, nextB: e.target.value })}>
                            <option value="">Select Bowler</option>
                            {(selectedMatch?.score?.battingTeam === selectedMatch?.teamA ? squadB : squadA).map((p, i) => <option key={i} value={p}>{p}</option>)}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light pb-4 px-4"><Button variant="primary" size="lg" className="w-100 fw-black rounded-pill shadow" onClick={() => { handleUpdate('new_bowler', modalData.nextB); setShowBowlerModal(false); setModalData({ ...modalData, nextB: '' }); }}>START OVER</Button></Modal.Footer>
            </Modal>

            <Modal show={showBatsmanModal} onHide={() => setShowBatsmanModal(false)} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
                <Modal.Header className={`${batsmanModalType === 'wicket' ? 'bg-danger' : 'bg-info'} text-white border-0 py-3 px-4`}>
                    <Modal.Title className="fw-black">{batsmanModalType === 'wicket' ? '🏏 WICKET! NEW BATSMAN' : '🏥 RETIRED! NEW BATSMAN'}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 bg-light">
                    <Form.Group>
                        <Form.Label className="fw-bold small text-uppercase text-muted">Select New Batsman:</Form.Label>
                        <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.nextS} onChange={e => setModalData({ ...modalData, nextS: e.target.value })}>
                            <option value="">Select Batsman</option>
                            {(selectedMatch?.score?.battingTeam === selectedMatch?.teamA ? squadA : squadB).map((p, i) => <option key={i} value={p}>{p}</option>)}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light pb-4 px-4"><Button variant={batsmanModalType === 'wicket' ? 'danger' : 'info'} size="lg" className="w-100 fw-black rounded-pill shadow" onClick={() => {
                    handleUpdate(batsmanModalType === 'wicket' ? 'wicket_with_replacement' : 'retired_with_replacement', modalData.nextS, { wicketDetails });
                    setShowBatsmanModal(false); setModalData({ ...modalData, nextS: '' });
                }}>SUBMIT</Button></Modal.Footer>
            </Modal>

            <Modal show={showRunOutModal} onHide={() => setShowRunOutModal(false)} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
                <Modal.Header className="bg-warning text-dark border-0 py-3 px-4"><Modal.Title className="fw-black text-uppercase small">🏃 Run Out! Who is out?</Modal.Title></Modal.Header>
                <Modal.Body className="p-4 bg-light d-grid gap-3">
                    <Button variant="outline-danger" size="lg" className="fw-black py-3 rounded-3 shadow-sm border-2" onClick={() => { setRunOutOutType('striker'); setShowWicketModal(true); setWicketDetails({ ...wicketDetails, type: 'run out' }); setShowRunOutModal(false); }}>STRIKER: {striker}</Button>
                    <Button variant="outline-danger" size="lg" className="fw-black py-3 rounded-3 shadow-sm border-2" onClick={() => { setRunOutOutType('non-striker'); setShowWicketModal(true); setWicketDetails({ ...wicketDetails, type: 'run out' }); setShowRunOutModal(false); }}>NON-STRIKER: {nonStriker}</Button>
                </Modal.Body>
            </Modal>

            <Modal show={showWicketModal} onHide={() => setShowWicketModal(false)} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
                <Modal.Header className="bg-danger text-white border-0 py-3 px-4"><Modal.Title className="fw-black">☝️ WICKET DETAILS</Modal.Title></Modal.Header>
                <Modal.Body className="p-4 bg-light">
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold small text-uppercase text-muted">Wicket Type</Form.Label>
                        <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={wicketDetails.type} onChange={e => setWicketDetails({ ...wicketDetails, type: e.target.value })}>
                            <option value="caught">Caught</option>
                            <option value="bowled">Bowled</option>
                            <option value="lbw">LBW</option>
                            <option value="run out">Run Out</option>
                            <option value="stumped">Stumped</option>
                            <option value="hit wicket">Hit Wicket</option>
                        </Form.Select>
                    </Form.Group>
                    {(wicketDetails.type === 'caught' || wicketDetails.type === 'run out' || wicketDetails.type === 'stumped') && (
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">Fielder Name</Form.Label>
                            <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={wicketDetails.fielder} onChange={e => setWicketDetails({ ...wicketDetails, fielder: e.target.value })}>
                                <option value="">Select Fielder</option>
                                {(selectedMatch?.score?.battingTeam === selectedMatch?.teamA ? squadB : squadA).map((p, i) => <option key={i} value={p}>{p}</option>)}
                            </Form.Select>
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light pb-4 px-4">
                    <Button variant="danger" size="lg" className="w-100 fw-black rounded-pill shadow" onClick={() => {
                        setShowWicketModal(false);
                        setBatsmanModalType('wicket');
                        setShowBatsmanModal(true);
                    }}>CONTINUE</Button>
                </Modal.Footer>
            </Modal>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold text-gradient">Admin Panel</h2>
                <Button variant="primary" className="shadow-sm px-4" onClick={() => { setIsCreating(true); setSelectedMatch(null); }}>+ New Match</Button>
            </div>

            <Row>
                <Col lg={4} className="mb-4">
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold d-flex justify-content-between"><span>Matches</span><Badge bg="secondary">{matches.length}</Badge></Card.Header>
                        <ListGroup variant="flush" className="overflow-auto" style={{ maxHeight: '75vh' }}>
                            {matches.map(m => (
                                <ListGroup.Item key={m._id || m.id} className="d-flex justify-content-between align-items-center py-3 border-start border-4 p-0 pointer-event" style={{ borderLeftColor: m.status === 'live' ? '#ff4b2b' : '#333' }}>
                                    <div className={`flex-grow-1 p-3 ${selectedMatch?._id === m._id || selectedMatch?.id === m.id ? 'bg-primary text-white' : ''}`} style={{ cursor: 'pointer' }} onClick={() => handleEdit(m)}>
                                        <div className="fw-bold fs-6">{m.teamA} vs {m.teamB}</div>
                                        <small className={selectedMatch?._id === m._id || selectedMatch?.id === m.id ? 'text-white-50' : 'text-muted'}>{m.status.toUpperCase()} | {new Date(m.date).toLocaleDateString()}</small>
                                    </div>
                                    <Button variant="link" className="text-danger px-3" onClick={(e) => handleDelete(e, m._id || m.id)}>
                                        <span className="fs-4">×</span>
                                    </Button>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Card>
                </Col>

                <Col lg={8}>
                    {isCreating ? (
                        <Card className="shadow-lg border-0"><Card.Body className="p-4"><h4 className="mb-4 fw-bold">New Match</h4><Form onSubmit={handleCreateSubmit}><Row className="g-3"><Col md={12}><Form.Group><Form.Label className="small fw-bold">Title</Form.Label><Form.Control value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} /></Form.Group></Col><Col md={6}><Form.Group><Form.Label className="small fw-bold">Team A</Form.Label><Form.Control required value={createForm.teamA} onChange={e => setCreateForm({ ...createForm, teamA: e.target.value })} /></Form.Group></Col><Col md={6}><Form.Group><Form.Label className="small fw-bold">Team B</Form.Label><Form.Control required value={createForm.teamB} onChange={e => setCreateForm({ ...createForm, teamB: e.target.value })} /></Form.Group></Col><Col md={6}><Form.Group><Form.Label className="small fw-bold">Overs</Form.Label><Form.Control type="number" required value={createForm.totalOvers} onChange={e => setCreateForm({ ...createForm, totalOvers: e.target.value })} /></Form.Group></Col><Col md={6}><Form.Group><Form.Label className="small fw-bold">Venue</Form.Label><Form.Control value={createForm.venue} onChange={e => setCreateForm({ ...createForm, venue: e.target.value })} /></Form.Group></Col><Col md={6}><Form.Group><Form.Label className="small fw-bold">Date</Form.Label><Form.Control type="date" value={createForm.date} onChange={e => setCreateForm({ ...createForm, date: e.target.value })} /></Form.Group></Col><Col md={6}><Form.Group><Form.Label className="small fw-bold">Time</Form.Label><Form.Control type="time" value={createForm.time} onChange={e => setCreateForm({ ...createForm, time: e.target.value })} /></Form.Group></Col></Row><div className="mt-4 d-flex gap-2"><Button variant="outline-primary" onClick={() => setShowSquadModal(true)}>MANAGE SQUADS (11)</Button><Button variant="primary" type="submit">Create</Button><Button variant="light" onClick={() => setIsCreating(false)}>Cancel</Button></div></Form></Card.Body></Card>
                    ) : selectedMatch ? (
                        <Card className="shadow-lg border-0 overflow-hidden">
                            <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-3 px-4"><h5 className="m-0 fw-bold">{selectedMatch.teamA} vs {selectedMatch.teamB}</h5><Badge bg={selectedMatch.status === 'live' ? 'danger' : 'info'}>{selectedMatch.status.toUpperCase()}</Badge></Card.Header>
                            <Card.Body className="p-4">
                                <div className="text-center mb-4 bg-light rounded-4 p-4 border"><div className="display-3 fw-bold text-primary">{selectedMatch.score.runs}/{selectedMatch.score.wickets}</div><div className="lead fw-bold">{selectedMatch.score.overs} / {selectedMatch.totalOvers} Overs</div><div className="mt-3"><Badge bg="white" text="dark" className="border px-3 py-2 me-2">CRR: {crr}</Badge>{rrr && <Badge bg="info" text="white" className="px-3 py-2 me-2">RRR: {rrr}</Badge>}{selectedMatch.score.target && <Badge bg="warning" text="dark" className="px-3 py-2">TARGET: {selectedMatch.score.target}</Badge>}</div></div>
                                <div className="d-flex gap-2 mb-4 justify-content-center flex-wrap">
                                    <Button variant="outline-dark" size="lg" className="px-3 fw-bold" onClick={() => setShowSquadModal(true)}>👥 SQUADS</Button>
                                    {(selectedMatch.status === 'upcoming' || (selectedMatch.status === 'live' && !selectedMatch.toss?.winner)) && <Button variant="warning" size="lg" className="px-5 fw-bold" onClick={() => setShowTossModal(true)}>🪙 CONDUCT TOSS</Button>}
                                    {selectedMatch.status === 'upcoming' && selectedMatch.toss?.winner && <Button variant="success" size="lg" className="px-5 fw-bold" onClick={() => setShowStartModal(true)}>START MATCH</Button>}
                                    {selectedMatch.status === 'live' && (<>{[0, 1, 2, 3, 4, 6].map(r => (<Button key={r} variant="outline-primary" size="lg" className="px-3 fw-bold" onClick={() => handleUpdate('runs', r)}>{r}</Button>))}<Button variant="danger" size="lg" className="px-3 fw-bold" onClick={() => { setWicketDetails({ type: 'caught', fielder: '' }); setShowWicketModal(true); }}>OUT</Button>
                                        <Button variant="warning" size="lg" className="px-3 fw-bold" onClick={() => setShowRunOutModal(true)}>RUN OUT</Button>
                                        <Button variant="info" size="lg" className="px-3 fw-bold text-white" onClick={() => { setBatsmanModalType('retired'); setShowBatsmanModal(true); }}>RETIRE</Button><Button variant="warning" size="lg" className="px-2 fw-bold" onClick={() => handleUpdate('extra', 'w')}>WD</Button><Button variant="warning" size="lg" className="px-2 fw-bold" onClick={() => handleUpdate('extra', 'nb')}>NB</Button></>)}
                                    {selectedMatch.status === 'completed' && (
                                        <Button variant="danger" size="lg" className="px-5 fw-bold" onClick={(e) => handleDelete(e, selectedMatch._id || selectedMatch.id)}>DELETE MATCH</Button>
                                    )}
                                </div>
                                {selectedMatch.status === 'live' && (
                                    <Row className="g-3 mb-4"><Col md={6}><Card className="border-0 bg-info bg-opacity-10 shadow-sm"><Card.Body className="py-3 px-4"><small className="text-info fw-bold text-uppercase d-block mb-1">Batting</small><div className="d-flex justify-content-between"><div><div className="fw-bold fs-5">🏏 {striker || '...'}*</div><div className="text-secondary small">{nonStriker || '...'}</div></div><div className="text-end">{selectedMatch.currentBatsmen?.map(b => (<div key={b.name} className={`small fw-bold ${b.onStrike ? 'text-primary' : 'text-muted'}`}>{b.runs}({b.balls})</div>))}</div></div></Card.Body></Card></Col><Col md={6}><Card className="border-0 bg-success bg-opacity-10 shadow-sm"><Card.Body className="py-3 px-4"><small className="text-success fw-bold text-uppercase d-block mb-1">Bowling</small><div className="d-flex justify-content-between align-items-center"><div className="fw-bold fs-5">⚾ {bowler || '...'}</div><div className="text-end text-success fw-bold">{scorecardData.find(inn => inn.team !== selectedMatch.score.battingTeam)?.bowling.find(p => p.player === bowler) ? (b => `${b.overs} ov | ${b.runs} r | ${b.wickets} w`)(scorecardData.find(inn => inn.team !== selectedMatch.score.battingTeam).bowling.find(p => p.player === bowler)) : '0 ov'}</div></div></Card.Body></Card></Col></Row>
                                )}
                                {selectedMatch.toss?.winner && (
                                    <Alert variant="warning" className="text-center fw-bold">
                                        🪙 Toss won by {selectedMatch.toss.winner} and elected to {selectedMatch.toss.decision} first.
                                    </Alert>
                                )}
                                <details>
                                    <summary className="btn btn-sm btn-link text-decoration-none fw-bold p-0 text-muted">🔧 Correction Panel (Manual Overrides)</summary>
                                    <Card className="mt-2 border-0 bg-light p-3">
                                        <Row className="g-3">
                                            <Col md={4}><Form.Label className="small fw-bold">Runs</Form.Label><Form.Control size="sm" type="number" value={selectedMatch.score.runs} onChange={e => handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, runs: parseInt(e.target.value) || 0 } })} /></Col>
                                            <Col md={4}><Form.Label className="small fw-bold">Wickets</Form.Label><Form.Control size="sm" type="number" value={selectedMatch.score.wickets} onChange={e => handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, wickets: parseInt(e.target.value) || 0 } })} /></Col>
                                            <Col md={4}><Form.Label className="small fw-bold">Overs</Form.Label><Form.Control size="sm" type="number" step="0.1" value={selectedMatch.score.overs} onChange={e => handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, overs: parseFloat(e.target.value) || 0 } })} /></Col>

                                            <Col md={4}><Form.Label className="small fw-bold">Striker</Form.Label><Form.Control size="sm" value={striker} onChange={e => { setStriker(e.target.value); handleUpdate('manual', { ...selectedMatch, currentBatsmen: selectedMatch.currentBatsmen.map((b, i) => i === 0 ? { ...b, name: e.target.value } : b) }); }} /></Col>
                                            <Col md={4}><Form.Label className="small fw-bold">Non-Striker</Form.Label><Form.Control size="sm" value={nonStriker} onChange={e => { setNonStriker(e.target.value); handleUpdate('manual', { ...selectedMatch, currentBatsmen: selectedMatch.currentBatsmen.map((b, i) => i === 1 ? { ...b, name: e.target.value } : b) }); }} /></Col>
                                            <Col md={4}><Form.Label className="small fw-bold">Bowler</Form.Label><Form.Control size="sm" value={bowler} onChange={e => { setBowler(e.target.value); handleUpdate('manual', { ...selectedMatch, currentBowler: e.target.value }); }} /></Col>

                                            <Col md={6}><Form.Label className="small fw-bold">Batting Team</Form.Label><Form.Select size="sm" value={selectedMatch.score.battingTeam} onChange={e => handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, battingTeam: e.target.value } })}><option value={selectedMatch.teamA}>{selectedMatch.teamA}</option><option value={selectedMatch.teamB}>{selectedMatch.teamB}</option></Form.Select></Col>
                                            <Col md={6}><Form.Label className="small fw-bold">Status</Form.Label><Form.Select size="sm" value={selectedMatch.status} onChange={e => handleUpdate('manual', { ...selectedMatch, status: e.target.value })}><option value="upcoming">Upcoming</option><option value="live">Live</option><option value="completed">Completed</option></Form.Select></Col>
                                        </Row>
                                    </Card>
                                </details>
                            </Card.Body>
                        </Card>
                    ) : (<div className="text-center py-5 bg-white rounded-4 shadow-sm d-flex flex-column align-items-center border"><Spinner animation="grow" variant="primary" className="mb-4" /><h4>Ready to Score?</h4><p className="text-muted">Select a match to start updates.</p></div>)}
                </Col>
            </Row>
            <style>{`.fw-black { font-weight: 900; } .text-gradient { background: linear-gradient(45deg, #1e3c72, #2a5298); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }`}</style>
        </Container>
    );
};

export default AdminDashboard;
