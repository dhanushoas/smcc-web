import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Table, Badge, ListGroup, Modal, Spinner, Alert, Dropdown, ButtonGroup } from 'react-bootstrap';
import { Toaster, toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { MAX_WICKETS, BALLS_PER_OVER, DEFAULT_MAX_OVERS, SUPER_OVER_WICKETS, SUPER_OVER_OVERS } from '../constants/scoring';
import { toCamelCase, formatTime, pluralize, getBallDisplay, oversToBalls, ballsToOvers } from '../utils/formatters';
import autoTable from 'jspdf-autotable';
import API_URL from '../utils/api';
import { useApp } from '../AppContext';


const socket = io(API_URL);

const AdminDashboard = () => {
    const [matches, setMatches] = useState([]);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const matchRef = useRef(null);

    useEffect(() => {
        matchRef.current = selectedMatch;
    }, [selectedMatch]);

    const [isCreating, setIsCreating] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    const { t } = useApp();


    const [createForm, setCreateForm] = useState({
        title: '', teamA: '', teamB: '', status: 'upcoming',
        date: new Date().toISOString().split('T')[0],
        time: formatTime24to12(new Date()), venue: '', totalOvers: 20
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
        fielder: '',
        runs: 0,
        whomOut: 'striker',
        ballType: 'normal',
        crossed: false
    });

    const [modalData, setModalData] = useState({
        s: '', ns: '', b: '', nextB: '', nextS: ''
    });

    const [isUpdating, setIsUpdating] = useState(false);
    const [showSquadModal, setShowSquadModal] = useState(false);
    const [showTossModal, setShowTossModal] = useState(false);
    const [squadA, setSquadA] = useState(Array(11).fill(''));
    const [squadB, setSquadB] = useState(Array(11).fill(''));
    const [tossData, setTossData] = useState({ winner: '', decision: 'bat' });

    const [showSuperOverModal, setShowSuperOverModal] = useState(false);
    const [superOverBattingTeam, setSuperOverBattingTeam] = useState('');

    const [showPauseModal, setShowPauseModal] = useState(false);
    const [pauseReason, setPauseReason] = useState('');
    const [customPauseReason, setCustomPauseReason] = useState('');
    const pauseOptions = ['Rain', 'Strong Wind', 'Floodlights Not Working', 'Power Failure', 'Ground Issue', 'Player Injury', 'Technical Issue', 'Other'];

    const [showDlsModal, setShowDlsModal] = useState(false);
    const [dlsData, setDlsData] = useState({ target: '', totalOvers: '' });

    const [showOverthrowModal, setShowOverthrowModal] = useState(false);
    const [overthrowData, setOverthrowData] = useState({
        ballType: 'normal',
        runsCompleted: 0,
        crossedOnThrow: false,
        resultType: 'boundary',
        manualRuns: 0
    });


    const parseTime12to24 = (time12) => {
        const timeTrimmed = time12.trim();
        const match = timeTrimmed.match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM)$/i);
        if (!match) return null;
        let [, h, m, modifier] = match;
        h = parseInt(h, 10);
        if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
        if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
        return `${h.toString().padStart(2, '0')}:${m}`;
    };

    const formatTime24to12 = (dateObj) => {
        let hours = dateObj.getHours();
        let minutes = dateObj.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');


    const handleSquadChange = (team, index, value) => {
        const val = toCamelCase(value);
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
        const fullA = squadA.filter(p => p.trim() !== '');
        const fullB = squadB.filter(p => p.trim() !== '');

        if (fullA.length !== 11 || fullB.length !== 11) {
            toast.error("Both teams must have exactly 11 players!");
            return false;
        }

        const nameRegex = /^[A-Za-z\s]+$/;

        const checkTeam = (squad, teamName) => {
            const seen = new Set();
            for (let i = 0; i < squad.length; i++) {
                let name = squad[i].trim();
                let rawName = name.replace(/\s?\((c|vc|wk)\)/gi, '').trim();

                if (rawName.length < 3) {
                    toast.error(`Player '${name}' in ${teamName}: Minimum 3 characters required.`);
                    return false;
                }
                if (!nameRegex.test(rawName)) {
                    toast.error(`Player '${name}' in ${teamName}: Only English alphabets and spaces allowed.`);
                    return false;
                }
                if (seen.has(rawName.toLowerCase())) {
                    toast.error(`Duplicate player '${rawName}' in ${teamName}!`);
                    return false;
                }
                seen.add(rawName.toLowerCase());
            }
            return seen;
        };

        const setA = checkTeam(fullA, 'Team A');
        if (!setA) return false;
        const setB = checkTeam(fullB, 'Team B');
        if (!setB) return false;

        const overlap = [...setA].filter(p => setB.has(p));
        if (overlap.length > 0) {
            toast.error(`Player '${overlap[0]}' cannot play for both teams!`);
            return false;
        }

        return true;
    };

    const calculateWinner = (matchData, force = false) => {
        if (!matchData || (matchData.status !== 'completed' && !force)) return null;
        const innings = matchData.innings || [];
        if (innings.length < 2) return "Match Completed";

        // Logic: Winner is determined by the LAST pair of innings if tied previously
        // or by the main match if not tied.

        let inn1, inn2;
        if (innings.length >= 4) {
            // Super Over happened
            // Find the last pair of Super Over innings
            const lastIdx = innings.length - 1;
            inn2 = innings[lastIdx];
            inn1 = innings[lastIdx - 1];

            if (inn1.runs > inn2.runs) {
                return `MATCH TIED | ${inn1.team.toUpperCase()} WON VIA SUPER OVER`;
            } else if (inn2.runs > inn1.runs) {
                return `MATCH TIED | ${inn2.team.toUpperCase()} WON VIA SUPER OVER`;
            }
            return "MATCH DRAWN | SUPER OVER TIED";
        } else {
            inn1 = innings[0];
            inn2 = innings[1];

            if (inn1.runs > inn2.runs) {
                const diff = inn1.runs - inn2.runs;
                return `${inn1.team} won the match by ${pluralize(diff, 'Run')}.`;
            } else if (inn2.runs > inn1.runs) {
                const wicketsRemaining = MAX_WICKETS - inn2.wickets;
                return `${inn2.team} won the match by ${pluralize(wicketsRemaining, 'Wicket')}.`;
            } else if (inn2.runs === inn1.runs && inn1.runs > 0) {
                return "MATCH DRAWN";
            }
        }
        return "Match Completed";
    };

    const calculateSuggestedMOM = (matchData) => {
        if (!matchData || !matchData.innings) return null;
        const playerStats = {};

        matchData.innings.forEach(inn => {
            const team = inn.team;
            (inn.batting || []).forEach(p => {
                if (!p.player) return;
                const name = p.player;
                if (!playerStats[name]) playerStats[name] = { runs: 0, fours: 0, sixes: 0, wickets: 0, team };
                playerStats[name].runs += (p.runs || 0);
                playerStats[name].fours += (p.fours || 0);
                playerStats[name].sixes += (p.sixes || 0);
            });
            (inn.bowling || []).forEach(p => {
                if (!p.player) return;
                const name = p.player;
                if (!playerStats[name]) playerStats[name] = { runs: 0, fours: 0, sixes: 0, wickets: 0, team };
                playerStats[name].wickets += (p.wickets || 0);
            });
        });

        let winningTeam = null;
        const innings = matchData.innings || [];
        if (innings.length >= 2) {
            let inn1, inn2;
            if (innings.length >= 4) {
                const lastIdx = innings.length - 1;
                inn1 = innings[lastIdx - 1]; inn2 = innings[lastIdx];
            } else {
                inn1 = innings[0]; inn2 = innings[1];
            }
            if (inn1.runs > inn2.runs) winningTeam = inn1.team;
            else if (inn2.runs > inn1.runs) winningTeam = inn2.team;
        }

        let bestPlayer = null;
        let bestScore = -1;

        Object.keys(playerStats).forEach(name => {
            const stats = playerStats[name];
            let score = (stats.runs * 1) + (stats.fours * 1) + (stats.sixes * 2) + (stats.wickets * 20);
            if (stats.team === winningTeam) score *= 1.25;

            if (score > bestScore) {
                bestScore = score;
                bestPlayer = name;
            }
        });

        return bestPlayer;
    };

    const getAvailableBatsmen = (teamType = 'batting') => {
        if (!selectedMatch) return [];
        const isTeamA = selectedMatch.score.battingTeam === selectedMatch.teamA;
        const targetTeam = teamType === 'batting' ? (isTeamA ? 'A' : 'B') : (isTeamA ? 'B' : 'A');
        const squad = targetTeam === 'A' ? squadA : squadB;

        if (teamType === 'bowling') return squad.filter(p => p.trim() !== '');

        // Determine correct innings index
        const reversed = [...selectedMatch.innings].map((inn, i) => ({ ...inn, idx: i })).reverse();
        const bInn = reversed.find(inn => inn.team === selectedMatch.score.battingTeam);
        const currentInn = bInn ? selectedMatch.innings[bInn.idx] : null;
        if (!currentInn) return squad.filter(p => p.trim() !== '');

        return squad.filter(p => {
            if (p.trim() === '') return false;
            if (p === striker || p === nonStriker) return false;
            const playerStats = currentInn.batting.find(b => b.player === p);
            if (playerStats) {
                // Allow 'retired hurt' players to return, but filter out those who are out or tactical retires
                if (playerStats.status === 'retired hurt') return true;
                return false;
            }
            return true;
        });
    };

    const handleDownloadPDF = async () => {
        if (!selectedMatch) return;
        if (!['completed', 'abandoned', 'cancelled'].includes(selectedMatch.status)) {
            toast.error("PDF Scorecard is only available after match completion!");
            return;
        }
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
            currentY += logoSize + 10;
        } catch (e) {
            // Logo not available, skip
            currentY += 4;
        }

        // Result block FIRST (most prominent)
        const result = calculateWinner(selectedMatch);
        if (result && selectedMatch.status === 'completed') {
            doc.setFontSize(14);
            doc.setTextColor(0, 146, 112); // Green
            doc.setFont(undefined, 'bold');
            doc.text(`RESULT: ${result.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 7;

            if (selectedMatch.manOfTheMatch) {
                doc.setFontSize(12);
                doc.setTextColor(190, 24, 93); // Rose/Premium color for MOM
                doc.setFont(undefined, 'bold');
                doc.text(`MAN OF THE MATCH: ${selectedMatch.manOfTheMatch.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
                currentY += 8;
            } else {
                currentY += 4;
            }
            doc.setFont(undefined, 'normal');
        }

        // SMCC header title
        doc.setFontSize(16);
        doc.setTextColor(30, 60, 114);
        doc.setFont(undefined, 'bold');
        doc.text('SMCC CRICKET OFFICIAL SCORECARD', pageWidth / 2, currentY, { align: 'center' });
        doc.setFont(undefined, 'normal');
        currentY += 6;

        // Match title
        doc.setFontSize(12);
        doc.setTextColor(50);
        doc.setFont(undefined, 'bold');
        doc.text(`${selectedMatch.teamA.toUpperCase()} VS ${selectedMatch.teamB.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
        doc.setFont(undefined, 'normal');
        currentY += 6;

        // Toss Info
        if (selectedMatch.toss?.winner) {
            doc.setFontSize(10);
            doc.setTextColor(70);
            doc.setFont(undefined, 'bold');
            const tossText = `TOSS: ${selectedMatch.toss.winner.toUpperCase()} WON AND ELECTED TO ${selectedMatch.toss.decision.toUpperCase()} FIRST`;
            doc.text(tossText, pageWidth / 2, currentY, { align: 'center' });
            currentY += 6;
        }

        // Meta info
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont(undefined, 'normal');
        doc.text(`SERIES: ${(selectedMatch.series || 'SMCC LIVE').toUpperCase()} | GROUND: ${(selectedMatch.venue || 'TBA').toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 5;
        doc.text(`DATE: ${new Date(selectedMatch.date).toLocaleDateString().toUpperCase()} ${formatTime(selectedMatch.date).toUpperCase()} | EXPORTED: ${new Date().toLocaleString().toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;

        // Divider
        doc.setDrawColor(30, 60, 114);
        doc.setLineWidth(0.5);
        doc.line(14, currentY, pageWidth - 14, currentY);
        currentY += 10;

        doc.setTextColor(0);

        (selectedMatch.innings || []).forEach((inn, idx) => {
            if (idx >= 2 && inn.runs === 0 && inn.wickets === 0 && (!inn.batting || inn.batting.length === 0)) {
                return;
            }

            if (idx > 0 && currentY > 220) {
                doc.addPage();
                currentY = 20;
            }

            const bowlingInnIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
            const bowlingInn = selectedMatch.innings[bowlingInnIdx];

            doc.setFontSize(13);
            doc.setTextColor(30, 60, 114);
            doc.setFont(undefined, 'bold');
            const getOrdinal = (n) => { const s = ["th", "st", "nd", "rd"]; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
            const titleStr = `${inn.team.toUpperCase()} ${getOrdinal(idx + 1).toUpperCase()} INNINGS${idx >= 2 ? ' (SUPER OVER)' : ''}`;
            doc.text(`${titleStr}: ${inn.runs}/${inn.wickets} (${inn.overs} OV)`, 14, currentY);
            doc.setFont(undefined, 'normal');
            currentY += 7;

            // Batting Table
            const battingData = (inn.batting || []).map(b => [b.player.toUpperCase(), b.status.toUpperCase(), b.runs, b.balls, b.fours, b.sixes, b.strikeRate]);
            if (battingData.length > 0) {
                autoTable(doc, {
                    startY: currentY,
                    head: [['Batter', 'Status', 'R', 'B', '4s', '6s', 'SR']],
                    body: battingData,
                    theme: 'striped',
                    headStyles: { fillColor: [30, 60, 114] },
                    styles: { fontSize: 9 }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            }

            // Bowling Table
            if (bowlingInn && bowlingInn.bowling && bowlingInn.bowling.length > 0) {
                autoTable(doc, {
                    startY: currentY,
                    head: [['Bowler', 'O', 'M', 'R', 'W', 'Eco']],
                    body: bowlingInn.bowling.map(b => [b.player.toUpperCase(), b.overs, b.maidens, b.runs, b.wickets, b.economy]),
                    theme: 'grid',
                    headStyles: { fillColor: [0, 146, 112] },
                    styles: { fontSize: 9 }
                });
                currentY = doc.lastAutoTable.finalY + 5;
            }

            // Extras
            const ex = inn.extras || { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 };
            doc.setFontSize(9);
            doc.setTextColor(50);
            doc.setFont(undefined, 'bold');
            doc.text(`EXTRAS: `, 14, currentY + 3);
            doc.setFont(undefined, 'normal');
            doc.text(`${ex.total} (W ${ex.wides}, NB ${ex.noBalls}, B ${ex.byes}, LB ${ex.legByes})`, 33, currentY + 3);
            currentY += 10;

            if (inn.fallOfWickets && inn.fallOfWickets.length > 0) {
                doc.setFontSize(9);
                doc.setTextColor(150, 0, 0);
                doc.setFont(undefined, 'bold');
                doc.text("FALL OF WICKETS", 14, currentY);
                doc.setFont(undefined, 'normal');
                currentY += 4;
                autoTable(doc, {
                    startY: currentY,
                    head: [['Wkt', 'Score', 'Over', 'Player']],
                    body: inn.fallOfWicklets.map(f => [f.wicket, f.runs, f.overs, f.player.toUpperCase()]),
                    theme: 'plain',
                    styles: { fontSize: 9 }
                });
                currentY = doc.lastAutoTable.finalY + 8;
            }

            // Did Not Bat
            const squad = inn.team === selectedMatch.teamA ? squadA : squadB;
            if (squad && squad.length > 0) {
                const battedPlayers = (inn.batting || []).map(b => b.player);
                const yetToBat = squad.filter(p => p && p.trim() !== '' && !battedPlayers.includes(p));
                if (yetToBat.length > 0) {
                    doc.setFontSize(9);
                    doc.setTextColor(100);
                    doc.setFont(undefined, 'bold');
                    doc.text(`DID NOT BAT: `, 14, currentY + 2);
                    doc.setFont(undefined, 'normal');
                    const textLines = doc.splitTextToSize(`${yetToBat.map(p => p.toUpperCase()).join(', ')}`, 150);
                    doc.text(textLines, 38, currentY + 2);
                    currentY += 8 + (textLines.length * 4);
                }
            }

            // Team Summary
            doc.setFontSize(9);
            doc.setTextColor(0);
            doc.setFont(undefined, 'bold');
            const teamTotalText = `TOTAL: ${inn.runs}/${inn.wickets} IN ${inn.overs} ${parseFloat(inn.overs) === 1 ? 'OVER' : 'OVERS'} | 4S: ${inn.fours || 0}, 6S: ${inn.sixes || 0}`;
            doc.text(teamTotalText, 14, currentY);
            doc.setFont(undefined, 'normal');
            currentY += 15;
        });

        const timestampFilename = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        doc.save(`${selectedMatch.teamA}_vs_${selectedMatch.teamB}_Scorecard_${timestampFilename}.pdf`);
    };

    const undoLastBall = async () => {
        if (!selectedMatch) return;
        try {
            const res = await axios.put(`${API_URL}/api/matches/${selectedMatch?._id || selectedMatch?.id}/reverse`, {}, config);
            const resData = res.data.success ? res.data.data : res.data;
            setSelectedMatch(resData);
            fetchMatches();
            toast.success("Last action reversed");
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to reverse last action");
        }
    };

    const handleSquadSave = async () => {
        if (!validateSquads()) return;

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
    const config = {
        headers: {
            'x-auth-token': activeToken,
            'Authorization': `Bearer ${activeToken}`
        }
    };

    // Verify token is still the active one on mount
    const verifySession = async () => {
        if (!activeToken) return;
        try {
            await axios.get(`${API_URL}/api/auth/verify`, config);
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                toast.error('Your session has ended. Please log in again.');
                navigate('/login');
            }
        }
    };

    const fetchMatches = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/matches`);
            const resData = res.data.success ? res.data.data : res.data;
            setMatches(Array.isArray(resData) ? resData : []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load matches");
            setMatches([]);
        }
    };

    useEffect(() => {
        document.title = 'SMCC | Admin Dashboard';
        if (!activeToken) navigate('/login');
        fetchMatches();

        socket.on('matchUpdate', (updatedMatch) => {
            setMatches(prevMatches => {
                const matchesArr = Array.isArray(prevMatches) ? prevMatches : [];
                const index = matchesArr.findIndex(m => m._id === updatedMatch._id || m.id === updatedMatch.id);
                if (index !== -1) {
                    const newMatches = [...matchesArr];
                    newMatches[index] = updatedMatch;
                    return newMatches;
                }
                return [updatedMatch, ...matchesArr];
            });

            const currentSelected = matchRef.current;
            if (currentSelected && (currentSelected._id === updatedMatch._id || currentSelected.id === updatedMatch.id)) {
                syncLocalPlayers(updatedMatch);
                setSelectedMatch(updatedMatch);
                setScorecardData(updatedMatch.innings);
            }
        });

        socket.on('matchDeleted', (matchId) => {
            setMatches(prev => (Array.isArray(prev) ? prev : []).filter(m => m._id !== matchId && m.id !== matchId));
            const currentSelected = matchRef.current;
            if (currentSelected?._id === matchId || currentSelected?.id === matchId) setSelectedMatch(null);
        });

        return () => {
            socket.off('matchUpdate');
            socket.off('matchDeleted');
        };
    }, [navigate, activeToken]); // Removed selectedMatch to prevent listener re-registration loop

    // ── Force-logout listener (cross-platform session takeover) ───────────
    useEffect(() => {
        verifySession();

        const handleForceLogout = ({ platform }) => {
            if (platform === 'web' || platform === 'all') {
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                toast.error('⚡ You have been logged out — admin session taken over on Mobile.', { duration: 6000 });
                setTimeout(() => navigate('/login'), 2000);
            }
        };

        const handleSessionExpired = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            toast.error('⏱ Admin session expired. Please log in again.', { duration: 6000 });
            setTimeout(() => navigate('/login'), 2000);
        };

        socket.on('adminForceLogout', handleForceLogout);
        socket.on('adminSessionExpired', handleSessionExpired);
        socket.on('adminSessionEnded', handleSessionExpired);

        return () => {
            socket.off('adminForceLogout', handleForceLogout);
            socket.off('adminSessionExpired', handleSessionExpired);
            socket.off('adminSessionEnded', handleSessionExpired);
        };
    }, [navigate]);

    const syncLocalPlayers = (match) => {
        if (match.currentBatsmen && match.currentBatsmen.length >= 1) {
            const s = match.currentBatsmen.find(b => b.onStrike)?.name || '';
            const ns = match.currentBatsmen.find(b => !b.onStrike)?.name || '';
            setStriker(s);
            setNonStriker(ns);
        } else {
            setStriker('');
            setNonStriker('');
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
        setIsEditingMode(false);
        syncLocalPlayers(match);

        const mDate = new Date(match.date);
        setEditDate(mDate.toISOString().split('T')[0]);
        setEditTime(formatTime24to12(mDate));

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
        // --- Prevent Editing if Match Completed ---
        if (selectedMatch.status === 'completed' && type !== 'manual') {
            toast.error("Match is completed! No further edits allowed.");
            return;
        }
        // ------------------------------------------

        setIsUpdating(true);
        // Deep copy ONCE for both update and history
        let updatedMatch = JSON.parse(JSON.stringify(selectedMatch));

        // Define locals at the top level so they are accessible everywhere
        let localStriker = striker;
        let localNonStriker = nonStriker;
        let localBowler = bowler;
        let ballCounts = false;

        // --- History Logging (Optimized to use ONE clone) ---
        if (['runs', 'extra', 'wicket', 'swap_strike', 'overthrow'].includes(type) && type !== 'init') {
            if (!updatedMatch.history) updatedMatch.history = [];
            // Create snapshot from the ALREADY cloned updatedMatch (before modification)
            const { history, ...snapshot } = updatedMatch;
            updatedMatch.history.push(snapshot);
            if (updatedMatch.history.length > 20) updatedMatch.history.shift();
        }

        if (type === 'manual') {
            updatedMatch = value;
            // Sync locals from the new manual state to ensure UI dropdowns match
            localStriker = updatedMatch.currentBatsmen?.find(b => b.onStrike)?.name || '';
            localNonStriker = updatedMatch.currentBatsmen?.find(b => !b.onStrike)?.name || '';
            localBowler = updatedMatch.currentBowler || '';
        } else {
            // Safety: Ensure innings structure exists and has 2 teams
            if (!updatedMatch.innings || updatedMatch.innings.length < 2) {
                const template = [
                    { team: updatedMatch.teamA, runs: 0, wickets: 0, overs: 0, batting: [], bowling: [], extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 } },
                    { team: updatedMatch.teamB, runs: 0, wickets: 0, overs: 0, batting: [], bowling: [], extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 } }
                ];
                updatedMatch.innings = template;
                setScorecardData(template); // Fix local state too
            }

            let battingTeam = updatedMatch.score.battingTeam?.trim() || updatedMatch.teamA?.trim();
            if (type === 'init' && value.team) {
                battingTeam = value.team.trim();
                updatedMatch.score.battingTeam = battingTeam;
            }
            if (!updatedMatch.score.thisOver) updatedMatch.score.thisOver = [];

            let battingTeamIdx;
            if (updatedMatch.innings.length > 2) {
                // Super Over Pair logic
                const pairStart = updatedMatch.innings.length - 2;
                battingTeamIdx = updatedMatch.score.target ? pairStart + 1 : pairStart;
            } else {
                // Main Match: Index 0 is 1st innings, Index 1 is 2nd innings.
                // We are in the 2nd innings if and only if a target has been set.
                battingTeamIdx = updatedMatch.score.target ? 1 : 0;

                // Initialization safety: If we are at index 0 and it's not started, assign teams.
                if (battingTeamIdx === 0) {
                    const inn0 = updatedMatch.innings[0];
                    if (inn0 && (inn0.runs === 0 && inn0.wickets === 0 && (!inn0.batting || inn0.batting.length === 0))) {
                        inn0.team = battingTeam;
                        if (updatedMatch.innings[1]) {
                            updatedMatch.innings[1].team = (battingTeam === updatedMatch.teamA ? updatedMatch.teamB : updatedMatch.teamA);
                        }
                    }
                }
            }

            let bowlingTeamIdx;
            if (updatedMatch.innings.length > 2) {
                const pairStart = updatedMatch.innings.length - 2;
                bowlingTeamIdx = (battingTeamIdx === pairStart) ? pairStart + 1 : pairStart;
            } else {
                bowlingTeamIdx = battingTeamIdx === 0 ? 1 : 0;
            }

            // Ensure the target innings exist in the array
            if (updatedMatch.innings.length > 2) {
                const last = updatedMatch.innings[updatedMatch.innings.length - 1];
                if (last.runs === 0 && last.wickets === 0 && (!last.balls || last.balls === 0) && (!last.batting || last.batting.length === 0)) {
                    updatedMatch.innings.pop();
                }
            }

            // Ensure the target innings exist in the array
            while (updatedMatch.innings.length <= Math.max(battingTeamIdx, bowlingTeamIdx)) {
                let teamName;
                const idx = updatedMatch.innings.length;
                if (idx < 2) {
                    // This block handles initialization if template was missing
                    teamName = idx === 0 ? battingTeam : (battingTeam === updatedMatch.teamA ? updatedMatch.teamB : updatedMatch.teamA);
                } else {
                    // Super Over Logic: Keep original batting order from main match
                    // Innings 0 team bats first in SO? Or original team 1st?
                    // Usually in SO, the team that batted 2nd in main match bats 1st?
                    // User said: "who bat 1st we known right this flow 1st batted team 1st innings"
                    // And Super Over usually follows the original batting order in some contexts.
                    const team1 = updatedMatch.innings[0]?.team || updatedMatch.teamA;
                    const team2 = updatedMatch.innings[1]?.team || updatedMatch.teamB;
                    teamName = idx % 2 === 0 ? team1 : team2;
                }

                updatedMatch.innings.push({
                    team: teamName,
                    runs: 0, wickets: 0, overs: 0, batting: [], bowling: [],
                    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 }
                });
            }

            // Sync batting team pointer
            if (updatedMatch.innings[battingTeamIdx]) {
                const currentInn = updatedMatch.innings[battingTeamIdx];
                updatedMatch.score.battingTeam = currentInn.team;

                // If initializing on an existing empty innings, ensure it's clean and correct
                if (type === 'init' && currentInn.runs === 0 && currentInn.wickets === 0 && currentInn.balls === 0) {
                    currentInn.batting = [];
                    currentInn.bowling = [];

                    // Enforce correct team name if it was wrong (e.g. from previous buggy creation)
                    if (battingTeamIdx >= 2) {
                        const chaser = updatedMatch.innings[1]?.team || updatedMatch.teamB;
                        const defender = updatedMatch.innings[0]?.team || updatedMatch.teamA;
                        currentInn.team = battingTeamIdx % 2 === 0 ? chaser : defender;
                        updatedMatch.score.battingTeam = currentInn.team;
                    }
                }
            }

            let currentInnings = updatedMatch.innings[battingTeamIdx];
            let currentBowling = updatedMatch.innings[bowlingTeamIdx];

            if (type === 'init') {
                const { s, ns, b } = value;
                localStriker = s;
                localNonStriker = ns;
                localBowler = b;

                const battingSquad = battingTeam === updatedMatch.teamA ? updatedMatch.teamASquad : updatedMatch.teamBSquad;
                const bowlingSquad = battingTeam === updatedMatch.teamA ? updatedMatch.teamBSquad : updatedMatch.teamASquad;

                if (battingSquad && (!battingSquad.includes(s) || !battingSquad.includes(ns))) {
                    toast.error("One or more batsmen are not in the squad!");
                    setIsUpdating(false); return;
                }
                if (bowlingSquad && !bowlingSquad.includes(b)) {
                    toast.error("Bowler is not in the squad!");
                    setIsUpdating(false); return;
                }

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
                localStriker = striker || updatedMatch.currentBatsmen?.find(b => b.onStrike)?.name || '';
                localNonStriker = nonStriker || updatedMatch.currentBatsmen?.find(b => !b.onStrike)?.name || '';
                localBowler = bowler || updatedMatch.currentBowler || '';

                // Defensive check for striker and non-striker
                if (!localStriker || !localNonStriker) {
                    toast.error("Striker or Non-Striker is not set. Please initialize the match or select players.");
                    setIsUpdating(false); return;
                }

                let sIdx = currentInnings.batting.findIndex(p => p.player === localStriker);
                let nsIdx = currentInnings.batting.findIndex(p => p.player === localNonStriker);

                // Auto-fix: If player exists in currentBatsmen but not in innings list
                if (sIdx === -1 && localStriker) {
                    currentInnings.batting.push({ player: localStriker, status: 'not out', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 });
                    sIdx = currentInnings.batting.length - 1;
                }
                if (nsIdx === -1 && localNonStriker) {
                    currentInnings.batting.push({ player: localNonStriker, status: 'not out', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 });
                    nsIdx = currentInnings.batting.length - 1;
                }

                let bIdx = currentBowling.bowling.findIndex(p => p.player === localBowler);
                if (bIdx === -1 && localBowler) {
                    currentBowling.bowling.push({ player: localBowler, overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 });
                    bIdx = currentBowling.bowling.length - 1;
                }

                if ((!localStriker || !localNonStriker || !localBowler || sIdx === -1 || nsIdx === -1 || bIdx === -1) && type !== 'new_bowler') {
                    console.error("Missing State:", { localStriker, localNonStriker, localBowler, sIdx, nsIdx, bIdx });
                    toast.error("Batsman or Bowler missing! Please check Match Info.");
                    setIsUpdating(false); return;
                }

                ballCounts = true;

                if (type === 'runs') {
                    updatedMatch.score.thisOver.push(value);
                    currentInnings.batting[sIdx].runs += value;
                    currentInnings.batting[sIdx].balls += 1;
                    if (value === 4) currentInnings.batting[sIdx].fours += 1;
                    if (value === 6) currentInnings.batting[sIdx].sixes += 1;

                    // Team breakdown
                    if (value === 0) {
                        currentInnings.dots = (currentInnings.dots || 0) + 1;
                        currentBowling.bowling[bIdx].dots = (currentBowling.bowling[bIdx].dots || 0) + 1;
                    }
                    else if (value === 1) currentInnings.ones = (currentInnings.ones || 0) + 1;
                    else if (value === 2) currentInnings.twos = (currentInnings.twos || 0) + 1;
                    else if (value === 3) currentInnings.threes = (currentInnings.threes || 0) + 1;
                    else if (value === 4) currentInnings.fours = (currentInnings.fours || 0) + 1;
                    else if (value === 6) currentInnings.sixes = (currentInnings.sixes || 0) + 1;

                    currentBowling.bowling[bIdx].runs += value;
                    currentInnings.runs += value;

                    if (value % 2 !== 0) {
                        const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                    }
                } else if (type === 'swap_strike') {
                    const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                    ballCounts = false;
                } else if (type === 'extra') {
                    const amount = params?.amount || 1;
                    const isBat = params?.isBat || false; // New flag for NB
                    currentInnings.runs += amount;
                    if (value === 'w') {
                        // Wide Ball: 1 penalty + runs ran = total Wides
                        updatedMatch.score.thisOver.push('WD' + amount);
                        currentInnings.extras.wides = (currentInnings.extras.wides || 0) + amount;
                        currentInnings.extras.total = (currentInnings.extras.total || 0) + amount;
                        currentBowling.bowling[bIdx].runs += amount;
                        currentBowling.bowling[bIdx].wides = (currentBowling.bowling[bIdx].wides || 0) + 1;
                        ballCounts = false;

                        // Strike Rotation: Swap if runs ran (amount - 1) is odd
                        const runsRan = amount - 1;
                        if (runsRan % 2 !== 0) {
                            const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                        }
                    }
                    else if (value === 'nb') {
                        // No Ball: 1 penalty (Extras) + (Runs Ran or Bat Runs)
                        updatedMatch.score.thisOver.push('NB' + amount);
                        const penalty = 1;
                        const additionalRuns = Math.max(0, amount - penalty);
                        currentInnings.extras.noBalls = (currentInnings.extras.noBalls || 0) + penalty;

                        if (isBat) {
                            // Hit by bat: 1 Extra + additionalRuns to Batter
                            if (additionalRuns > 0 && sIdx !== -1) {
                                currentInnings.batting[sIdx].runs += additionalRuns;
                                if (additionalRuns === 4) currentInnings.batting[sIdx].fours += 1;
                                if (additionalRuns === 6) currentInnings.batting[sIdx].sixes += 1;
                            }
                            currentInnings.extras.total = (currentInnings.extras.total || 0) + penalty;
                        } else {
                            // Not hit by bat: All runs are Extras
                            currentInnings.extras.noBalls = (currentInnings.extras.noBalls || 0) + additionalRuns; // Actually No Ball Byes/Leg Byes are often just recorded under NB extras in simple scoreboards
                            currentInnings.extras.total = (currentInnings.extras.total || 0) + amount;
                        }

                        currentBowling.bowling[bIdx].runs += amount;
                        currentBowling.bowling[bIdx].noBalls = (currentBowling.bowling[bIdx].noBalls || 0) + 1;
                        ballCounts = false;
                        updatedMatch.score.freeHit = true;

                        // Strike Rotation: Swap if runs ran (additionalRuns) is odd
                        if (additionalRuns % 2 !== 0) {
                            const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                        }
                    }
                    else if (value === 'b') {
                        updatedMatch.score.thisOver.push('B' + amount);
                        currentInnings.extras.byes = (currentInnings.extras.byes || 0) + amount;
                        currentInnings.extras.total = (currentInnings.extras.total || 0) + amount;
                        currentInnings.batting[sIdx].balls += 1;

                        // Strike Rotation: Swap if odd
                        if (amount % 2 !== 0) {
                            const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                        }
                    }
                    else if (value === 'lb') {
                        updatedMatch.score.thisOver.push('LB' + amount);
                        currentInnings.extras.legByes = (currentInnings.extras.legByes || 0) + amount;
                        currentInnings.extras.total = (currentInnings.extras.total || 0) + amount;
                        currentInnings.batting[sIdx].balls += 1;

                        // Strike Rotation: Swap if odd
                        if (amount % 2 !== 0) {
                            const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                        }
                    }
                } else if (type === 'run_out_striker' || type === 'run_out_nonstriker') {
                    const isStrikerOut = type === 'run_out_striker';
                    const outPlayer = isStrikerOut ? localStriker : localNonStriker;
                    const pIdx = currentInnings.batting.findIndex(p => p.player === outPlayer);

                    if (pIdx !== -1) {
                        currentInnings.wickets += 1;
                        currentInnings.batting[pIdx].status = 'run out';
                        currentInnings.batting[sIdx].balls += 1; // Ball still counts

                        setRunOutOutType(isStrikerOut ? 'striker' : 'non-striker');
                        setBatsmanModalType('wicket');
                        setShowBatsmanModal(true);
                        return;
                    }
                } else if (type === 'wicket') {
                    const wDetail = params.wicketDetails || { type: 'bowled', whomOut: 'striker' };
                    const isStrikerOut = wDetail.type === 'run out' ? wDetail.whomOut === 'striker' : true;
                    setRunOutOutType(isStrikerOut ? 'striker' : 'non-striker');

                    // Simple logic: we just need to know whom is out to show the correct replacement modal
                    // The actual state update will happen in 'wicket_with_replacement'
                    setBatsmanModalType('wicket');
                    setShowBatsmanModal(true);
                    return;
                } else if (type === 'wicket_with_replacement' || type === 'retired_with_replacement') {
                    const newName = value;
                    const battingSquad = battingTeam === updatedMatch.teamA ? updatedMatch.teamASquad : updatedMatch.teamBSquad;
                    if (battingSquad && !battingSquad.includes(newName)) {
                        toast.error("Player is not in the squad!");
                        setIsUpdating(false); return;
                    }
                    const isStrikerReplacement = runOutOutType === 'striker';

                    // Identify which player index was out
                    const outPlayerName = isStrikerReplacement ? localStriker : localNonStriker;
                    const outIdx = currentInnings.batting.findIndex(p => p.player === outPlayerName);

                    if (type === 'wicket_with_replacement') {
                        // Regular Wicket or Run Out confirmed
                        if (currentInnings.batting[outIdx]?.status === 'not out' || currentInnings.batting[outIdx]?.status === 'run out') {
                            currentInnings.wickets += 1;

                            const wDetail = params.wicketDetails || { type: 'bowled', ballType: 'normal' };
                            let outStatus = '';
                            if (wDetail.type === 'caught') outStatus = `c ${wDetail.fielder} b ${localBowler}`;
                            else if (wDetail.type === 'bowled') outStatus = `b ${localBowler}`;
                            else if (wDetail.type === 'lbw') outStatus = `lbw b ${localBowler}`;
                            else if (wDetail.type === 'stumped') outStatus = `st ${wDetail.fielder} b ${localBowler}`;
                            else if (wDetail.type === 'run out') outStatus = `run out (${wDetail.fielder})`;
                            else if (wDetail.type === 'hit wicket') outStatus = `hit wicket b ${localBowler}`;
                            else outStatus = 'out';

                            currentInnings.batting[outIdx].status = outStatus;

                            // History Log
                            updatedMatch.score.thisOver.push('W');
                            if (wDetail.type !== 'run out') {
                                currentBowling.bowling[bIdx].wickets += 1;
                            }

                            if (!currentInnings.fallOfWickets) currentInnings.fallOfWickets = [];
                            currentInnings.fallOfWickets.push({
                                wicket: currentInnings.wickets,
                                runs: currentInnings.runs,
                                overs: currentInnings.overs,
                                player: outPlayerName
                            });

                            const isMankad = wDetail.type === 'run out' && wDetail.ballType === 'mankad';
                            const isExtraBall = wDetail.type === 'run out' && (wDetail.ballType === 'wide' || wDetail.ballType === 'no-ball');

                            if (wDetail.type === 'run out') {
                                const completedRuns = parseInt(wDetail.runs || 0);
                                updatedMatch.score.thisOver[updatedMatch.score.thisOver.length - 1] = 'W' + (completedRuns > 0 ? completedRuns : '');
                                currentInnings.runs += completedRuns;
                                currentBowling.bowling[bIdx].runs += completedRuns;
                                currentInnings.batting[sIdx].runs += completedRuns;

                                if (wDetail.ballType === 'wide') {
                                    currentInnings.runs += 1;
                                    currentInnings.extras.wides = (currentInnings.extras.wides || 0) + 1;
                                    currentInnings.extras.total = (currentInnings.extras.total || 0) + 1;
                                    currentBowling.bowling[bIdx].runs += 1;
                                    currentBowling.bowling[bIdx].wides = (currentBowling.bowling[bIdx].wides || 0) + 1;
                                    ballCounts = false;
                                } else if (wDetail.ballType === 'no-ball') {
                                    currentInnings.runs += 1;
                                    currentInnings.extras.noBalls = (currentInnings.extras.noBalls || 0) + 1;
                                    currentInnings.extras.total = (currentInnings.extras.total || 0) + 1;
                                    currentBowling.bowling[bIdx].runs += 1;
                                    currentBowling.bowling[bIdx].noBalls = (currentBowling.bowling[bIdx].noBalls || 0) + 1;
                                    ballCounts = false;
                                } else if (wDetail.ballType === 'mankad') {
                                    ballCounts = false;
                                }

                                if (!isMankad && wDetail.ballType !== 'wide') {
                                    currentInnings.batting[sIdx].balls += 1;
                                }

                                // Team breakdown for run out runs
                                if (completedRuns === 1) currentInnings.ones = (currentInnings.ones || 0) + 1;
                                else if (completedRuns === 2) currentInnings.twos = (currentInnings.twos || 0) + 1;
                                else if (completedRuns === 3) currentInnings.threes = (currentInnings.threes || 0) + 1;
                                else if (completedRuns === 0) currentInnings.dots = (currentInnings.dots || 0) + 1;
                            } else {
                                // Regular wickets (caught, bowled, lbw, stumped, hit wicket)
                                // Stumped on a wide?
                                if (wDetail.type === 'stumped' && wDetail.ballType === 'wide') {
                                    currentInnings.runs += 1;
                                    currentInnings.extras.wides = (currentInnings.extras.wides || 0) + 1;
                                    currentInnings.extras.total = (currentInnings.extras.total || 0) + 1;
                                    currentBowling.bowling[bIdx].runs += 1;
                                    currentBowling.bowling[bIdx].wides = (currentBowling.bowling[bIdx].wides || 0) + 1;
                                    ballCounts = false;
                                } else {
                                    if (wDetail.ballType !== 'wide') {
                                        currentInnings.batting[sIdx].balls += 1;
                                    }
                                }
                            }

                            // If it's a valid ball that counts for the over, increment here
                            // because wicket_with_replacement is excluded from the global block
                            if (ballCounts) {
                                let currentOvers = currentInnings.overs;
                                let overFull = Math.floor(currentOvers);
                                let ballCount = Math.round((currentOvers * 10) % 10) + 1;

                                let bOvers = currentBowling.bowling[bIdx].overs;
                                let bOverFull = Math.floor(bOvers);
                                let bBallCount = Math.round((bOvers * 10) % 10) + 1;

                                const formatLimit = updatedMatch.innings.length > 2 ? SUPER_OVER_OVERS : updatedMatch.totalOvers;
                                if (ballCount >= BALLS_PER_OVER) {
                                    updatedMatch.score.thisOver = [];
                                    ballCount = 0; overFull += 1;
                                    bBallCount = 0; bOverFull += 1;
                                    const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                                    if (overFull < formatLimit) { setShowBowlerModal(true); }
                                } else {
                                    if (bBallCount >= BALLS_PER_OVER) { bBallCount = 0; bOverFull += 1; }
                                }
                                currentInnings.overs = parseFloat(`${overFull}.${ballCount}`);
                                currentBowling.bowling[bIdx].overs = parseFloat(`${bOverFull}.${bBallCount}`);
                                ballCounts = false; // Prevent double increment in global block
                            }
                        }
                    } else {
                        currentInnings.batting[outIdx].status = 'retired hurt';
                        currentInnings.batting[outIdx].balls += 1;
                    }

                    let finalIsStrikerReplacement = isStrikerReplacement;
                    if (type === 'wicket_with_replacement') {
                        const wDetailForStrike = params?.wicketDetails || { type: 'caught' };
                        if (wDetailForStrike.type === 'run out' && wDetailForStrike.crossed) {
                            const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                            finalIsStrikerReplacement = !isStrikerReplacement;
                        } else if (wDetailForStrike.type !== 'run out') {
                            finalIsStrikerReplacement = true;
                        }
                    }

                    if (finalIsStrikerReplacement) localStriker = newName;
                    else localNonStriker = newName;

                    if (!currentInnings.batting.find(p => p.player === newName)) {
                        currentInnings.batting.push({ player: newName, status: 'not out', runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 });
                    }
                    setRunOutOutType('striker'); // Reset for regular wickets
                } else if (type === 'new_bowler') {
                    if (localBowler === value) {
                        toast.error("This bowler was already bowling! Select a different replacement.");
                        setIsUpdating(false); return;
                    }
                    if (updatedMatch.score.lastOverBowler === value) {
                        toast.error("A bowler cannot bowl two overs in a row! This player bowled the previous over.");
                        setIsUpdating(false); return;
                    }

                    const bowlerStats = currentBowling.bowling.find(p => p.player === value);
                    if (bowlerStats && Math.floor(bowlerStats.overs) >= 2) {
                        toast.error("A bowler cannot bowl more than 2 overs!");
                        setIsUpdating(false); return;
                    }

                    const bowlingSquad = battingTeam === updatedMatch.teamA ? updatedMatch.teamBSquad : updatedMatch.teamASquad;
                    if (bowlingSquad && !bowlingSquad.includes(value)) {
                        toast.error("Bowler is not in the squad!");
                        setIsUpdating(false); return;
                    }
                    localBowler = value;
                    if (!currentBowling.bowling.find(p => p.player === value)) {
                        currentBowling.bowling.push({ player: value, overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 });
                    }
                } else if (type === 'overthrow') {
                    const { ballType, runsCompleted, crossedOnThrow, resultType, manualRuns } = value;
                    const overtimeRuns = resultType === 'boundary' ? 4 : manualRuns;
                    const totalRuns = (runsCompleted + (crossedOnThrow ? 1 : 0)) + overtimeRuns;

                    // Overthrow NEVER increments the ball count independently
                    ballCounts = false;

                    if (ballType === 'normal' || ballType === 'nb') {
                        // Batter scores the runs (Total runs if hit by bat)
                        const batterRuns = totalRuns;
                        currentInnings.batting[sIdx].runs += batterRuns;
                        if (batterRuns >= 4 && resultType === 'boundary') currentInnings.batting[sIdx].fours += 1;
                        if (batterRuns === 6) currentInnings.batting[sIdx].sixes += 1;

                        currentInnings.runs += batterRuns;
                        currentBowling.bowling[bIdx].runs += batterRuns;

                        if (ballType === 'nb') {
                            currentInnings.runs += 1; // NB penalty
                            currentInnings.extras.noBalls = (currentInnings.extras.noBalls || 0) + 1;
                            currentInnings.extras.total = (currentInnings.extras.total || 0) + 1;
                            currentBowling.bowling[bIdx].runs += 1;
                            currentBowling.bowling[bIdx].noBalls = (currentBowling.bowling[bIdx].noBalls || 0) + 1;
                            ballCounts = false;
                            updatedMatch.score.freeHit = true;
                            // Update last ball in thisOver if it was an NB, or push if it's the base ball
                            if (updatedMatch.score.thisOver.length > 0) {
                                const last = updatedMatch.score.thisOver[updatedMatch.score.thisOver.length - 1].toString();
                                if (last.startsWith('NB')) {
                                    updatedMatch.score.thisOver[updatedMatch.score.thisOver.length - 1] = 'NB' + (parseInt(last.slice(2)) + batterRuns);
                                } else {
                                    updatedMatch.score.thisOver.push('NB' + (batterRuns + 1));
                                }
                            } else {
                                updatedMatch.score.thisOver.push('NB' + (batterRuns + 1));
                            }
                        } else {
                            if (updatedMatch.score.thisOver.length > 0) {
                                let last = updatedMatch.score.thisOver[updatedMatch.score.thisOver.length - 1];
                                if (!isNaN(last)) {
                                    updatedMatch.score.thisOver[updatedMatch.score.thisOver.length - 1] = parseInt(last) + batterRuns;
                                } else {
                                    updatedMatch.score.thisOver.push(batterRuns);
                                }
                            } else {
                                updatedMatch.score.thisOver.push(batterRuns);
                            }
                            currentInnings.batting[sIdx].balls += 0; // Overthrow doesn't add a ball to batter stats
                        }

                        // Team breakdown
                        if (batterRuns === 1) currentInnings.ones = (currentInnings.ones || 0) + 1;
                        else if (batterRuns === 2) currentInnings.twos = (currentInnings.twos || 0) + 1;
                        else if (batterRuns === 3) currentInnings.threes = (currentInnings.threes || 0) + 1;
                        else if (batterRuns === 4) currentInnings.fours = (currentInnings.fours || 0) + 1;
                        else if (batterRuns === 6) currentInnings.sixes = (currentInnings.sixes || 0) + 1;
                    } else if (ballType === 'nb_extra') {
                        // No ball but not hit by bat (e.g. thigh pad + overthrow)
                        const nbPenalty = 1;
                        currentInnings.runs += (totalRuns + nbPenalty);
                        currentInnings.extras.noBalls = (currentInnings.extras.noBalls || 0) + (totalRuns + nbPenalty);
                        currentInnings.extras.total = (currentInnings.extras.total || 0) + (totalRuns + nbPenalty);
                        currentBowling.bowling[bIdx].runs += (totalBowling.bowling[bIdx].runs || 0) + (totalRuns + nbPenalty);
                        currentBowling.bowling[bIdx].noBalls = (currentBowling.bowling[bIdx].noBalls || 0) + 1;
                        ballCounts = false;
                        updatedMatch.score.freeHit = true;
                        if (updatedMatch.score.thisOver.length > 0) {
                            const last = updatedMatch.score.thisOver[updatedMatch.score.thisOver.length - 1].toString();
                            if (last.startsWith('NB')) {
                                updatedMatch.score.thisOver[updatedMatch.score.thisOver.length - 1] = 'NB' + (parseInt(last.slice(2)) + totalRuns);
                            } else {
                                updatedMatch.score.thisOver.push('NB' + (totalRuns + nbPenalty));
                            }
                        } else {
                            updatedMatch.score.thisOver.push('NB' + (totalRuns + nbPenalty));
                        }
                    } else if (ballType === 'w') {
                        // Wide + Runs
                        const widePenalty = 1;
                        currentInnings.runs += (totalRuns + widePenalty);
                        currentInnings.extras.wides = (currentInnings.extras.wides || 0) + (totalRuns + widePenalty);
                        currentInnings.extras.total = (currentInnings.extras.total || 0) + (totalRuns + widePenalty);
                        currentBowling.bowling[bIdx].runs += (currentBowling.bowling[bIdx].runs || 0) + (totalRuns + widePenalty);
                        currentBowling.bowling[bIdx].wides = (currentBowling.bowling[bIdx].wides || 0) + 1;
                        ballCounts = false;
                        updatedMatch.score.thisOver.push('WD' + (totalRuns + widePenalty));
                    } else if (ballType === 'b' || ballType === 'lb') {
                        // Bye/Leg Bye + Runs
                        currentInnings.runs += totalRuns;
                        if (ballType === 'b') currentInnings.extras.byes = (currentInnings.extras.byes || 0) + totalRuns;
                        else currentInnings.extras.legByes = (currentInnings.extras.legByes || 0) + totalRuns;
                        currentInnings.extras.total = (currentInnings.extras.total || 0) + totalRuns;
                        currentInnings.batting[sIdx].balls += 1;
                        updatedMatch.score.thisOver.push((ballType === 'b' ? 'B' : 'LB') + totalRuns);
                    }

                    // Strike Rotation: Total runs determine if they swap
                    if (totalRuns % 2 !== 0) {
                        const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                    }
                }

                if (ballCounts && type !== 'wicket_with_replacement' && type !== 'retired_with_replacement' && type !== 'new_bowler') {
                    const totalMatchBalls = oversToBalls(currentInnings.overs) + 1;
                    const totalBowlerBalls = oversToBalls(currentBowling.bowling[bIdx].overs) + 1;

                    const formatLimit = updatedMatch.innings.length > 2 ? SUPER_OVER_OVERS : updatedMatch.totalOvers;
                    const ballsInCurrentOver = (totalMatchBalls % BALLS_PER_OVER) === 0 ? BALLS_PER_OVER : (totalMatchBalls % BALLS_PER_OVER);

                    if (ballsInCurrentOver === BALLS_PER_OVER && (totalMatchBalls / BALLS_PER_OVER) % 1 === 0) {
                        // Over Completed
                        updatedMatch.score.lastOverBowler = localBowler;
                        updatedMatch.score.thisOver = [];
                        const temp = localStriker; localStriker = localNonStriker; localNonStriker = temp;
                        const matchOvers = ballsToOvers(totalMatchBalls);
                        if (matchOvers < formatLimit) { setShowBowlerModal(true); }
                    }

                    currentInnings.overs = ballsToOvers(totalMatchBalls);
                    currentBowling.bowling[bIdx].overs = ballsToOvers(totalBowlerBalls);
                }

                currentInnings.batting.forEach(p => { if (p.balls > 0) p.strikeRate = parseFloat(((p.runs / p.balls) * 100).toFixed(2)); });
                currentInnings.bowling.forEach(p => {
                    let totalBalls = oversToBalls(p.overs);
                    if (totalBalls > 0) p.economy = parseFloat(((p.runs / totalBalls) * BALLS_PER_OVER).toFixed(2));
                });

                // --- Check for Innings Completion ---
                const isAllOut = currentInnings.wickets >= (updatedMatch.innings.length > 2 ? SUPER_OVER_WICKETS : MAX_WICKETS);
                const isOversCompleted = currentInnings.overs >= (updatedMatch.innings.length > 2 ? SUPER_OVER_OVERS : updatedMatch.totalOvers);
                const targetChased = updatedMatch.score.target && currentInnings.runs >= updatedMatch.score.target;

                if (isAllOut || isOversCompleted || targetChased) {
                    // Update the final score in the innings array before any reset
                    updatedMatch.innings[battingTeamIdx].runs = currentInnings.runs;
                    updatedMatch.innings[battingTeamIdx].wickets = currentInnings.wickets;
                    updatedMatch.innings[battingTeamIdx].overs = currentInnings.overs;

                    if (!updatedMatch.score.target) {
                        // 1st Innings just ended
                        updatedMatch.score.target = currentInnings.runs + 1;
                        const nextTeam = updatedMatch.score.battingTeam === updatedMatch.teamA ? updatedMatch.teamB : updatedMatch.teamA;

                        toast.success(`${currentInnings.team} innings over. Target: ${updatedMatch.score.target}`, { icon: '🏏', duration: 5000 });

                        // Check if we need to add a new innings for the 2nd part of Super Over
                        if (updatedMatch.innings.length % 2 !== 0) {
                            updatedMatch.innings.push({
                                team: nextTeam, runs: 0, wickets: 0, overs: 0,
                                batting: [], bowling: [],
                                extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 }
                            });
                        }

                        // Reset score object for 2nd innings
                        updatedMatch.score.battingTeam = nextTeam;
                        updatedMatch.score.runs = 0;
                        updatedMatch.score.wickets = 0;
                        updatedMatch.score.overs = 0;
                        updatedMatch.score.thisOver = [];

                        // Clear transition states
                        localStriker = ''; localNonStriker = ''; localBowler = '';
                        setStriker(''); setNonStriker(''); setBowler('');
                        setModalData({ s: '', ns: '', b: '', nextB: '', nextS: '' });
                        updatedMatch.currentBatsmen = [];
                        updatedMatch.currentBowler = '';
                    } else {
                        // 2nd (or 4th, 6th...) Innings just ended
                        const isSuperOver = updatedMatch.innings.length > 2;
                        const firstInningsOfPair = updatedMatch.innings[updatedMatch.innings.length - 2];

                        if (currentInnings.runs === firstInningsOfPair.runs) {
                            // TIE
                            updatedMatch.status = 'live'; // Keep it live so admin can choose
                            updatedMatch.score.runs = currentInnings.runs;
                            updatedMatch.score.wickets = currentInnings.wickets;
                            updatedMatch.score.overs = currentInnings.overs;
                            setSuperOverBattingTeam(updatedMatch.innings[0].team);
                            setShowSuperOverModal(true);
                            toast.success("Scores are Level! Match Tied.", { icon: '🤝', duration: 5000 });
                        } else {
                            // Decided
                            updatedMatch.status = 'completed';
                            const suggested = calculateSuggestedMOM(updatedMatch);
                            if (suggested) updatedMatch.manOfTheMatch = suggested;
                            toast.success(`Match Completed! ${suggested ? 'Suggested POTM: ' + suggested : ''}`, { icon: '🥇', duration: 7000 });
                        }
                    }
                } else {
                    // Ongoing innings -> Keep score object in sync with current innings
                    updatedMatch.score.runs = currentInnings.runs;
                    updatedMatch.score.wickets = currentInnings.wickets;
                    updatedMatch.score.overs = currentInnings.overs;
                    updatedMatch.currentBowler = localBowler;
                    updatedMatch.currentBatsmen = [
                        { name: localStriker, onStrike: true, runs: currentInnings.batting.find(p => p.player === localStriker)?.runs || 0, balls: currentInnings.batting.find(p => p.player === localStriker)?.balls || 0 },
                        { name: localNonStriker, onStrike: false, runs: currentInnings.batting.find(p => p.player === localNonStriker)?.runs || 0, balls: currentInnings.batting.find(p => p.player === localNonStriker)?.balls || 0 }
                    ].filter(b => b.name && b.name.trim() !== '');
                }
            }
        }

        setStriker(localStriker); setNonStriker(localNonStriker); setBowler(localBowler);

        // --- Optimistic Update ---
        // This ensures that history is available IMMEDIATELY for modals (e.g. Undo in Bowler Modal)
        if (ballCounts) {
            updatedMatch.score.freeHit = false;
        }
        setSelectedMatch(updatedMatch);
        setScorecardData(updatedMatch.innings);

        try {
            // Strip irrelevant/large fields to prevent validation issues and reduce payload size
            const { id, _id, lastUpdated, toss, ...payload } = updatedMatch;
            const res = await axios.put(`${API_URL}/api/matches/${selectedMatch._id || selectedMatch.id}/score`, payload, config);

            // Response Standardization: Backend now returns { success, message, data }
            const resData = res.data.success ? res.data.data : res.data;
            let newMatchState = resData;

            // Ensure history is preserved if backend didn't return it correctly
            if ((!newMatchState.history || newMatchState.history.length === 0) && updatedMatch.history && updatedMatch.history.length > 0) {
                newMatchState.history = updatedMatch.history;
            }

            setSelectedMatch(newMatchState);
            setScorecardData(newMatchState.innings);
        } catch (err) {
            const errorMsg = err.response?.data?.msg || err.response?.data?.error || "Update sync failed";
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
                toast.error("Session expired. Please login again.");
            } else {
                toast.error(errorMsg);
            }
            // Revert on error
            fetchMatches();
        } finally {
            setIsUpdating(false);
        }
    };

    // Auto POTM logic removed for manual subjective assignment.

    const handleEditMatchForm = (m) => {
        setCreateForm({
            _id: m._id || m.id,
            title: m.title || '',
            series: m.series || '',
            teamA: m.teamA,
            teamB: m.teamB,
            status: m.status,
            date: new Date(m.date).toISOString().split('T')[0],
            time: formatTime24to12(new Date(m.date)),
            venue: m.venue || '',
            totalOvers: m.totalOvers || 20
        });
        setSquadA(m.teamASquad && m.teamASquad.length === 11 ? m.teamASquad : Array(11).fill(''));
        setSquadB(m.teamBSquad && m.teamBSquad.length === 11 ? m.teamBSquad : Array(11).fill(''));
        setIsCreating(true);
        setIsEditingMode(true);
        setSelectedMatch(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        try {
            if (!createForm.teamA || !createForm.teamB) {
                toast.error("Both Team A and Team B are required!");
                return;
            }
            if (createForm.teamA.trim().toLowerCase() === createForm.teamB.trim().toLowerCase()) {
                toast.error("Both teams cannot be same");
                return;
            }

            const teamNameRegex = /^[A-Za-z\s]+$/;
            if (createForm.teamA.trim().length < 3 || createForm.teamA.trim().length > 30) {
                toast.error("Team A name must be between 3 and 30 characters");
                return;
            }
            if (!teamNameRegex.test(createForm.teamA.trim())) {
                toast.error("Team A can only contain alphabets and spaces");
                return;
            }
            if (createForm.teamB.trim().length < 3 || createForm.teamB.trim().length > 30) {
                toast.error("Team B name must be between 3 and 30 characters");
                return;
            }
            if (!teamNameRegex.test(createForm.teamB.trim())) {
                toast.error("Team B can only contain alphabets and spaces");
                return;
            }

            if (!parseInt(createForm.totalOvers) || parseInt(createForm.totalOvers) < 1 || parseInt(createForm.totalOvers) > 50) {
                toast.error("Overs must be between 1 and 50");
                return;
            }
            if (!createForm.venue || createForm.venue.trim().length < 3 || createForm.venue.trim().length > 50) {
                toast.error("Venue must be between 3 and 50 characters");
                return;
            }
            if (!/^[A-Za-z\s]+$/.test(createForm.venue.trim())) {
                toast.error("Venue can only contain alphabets and spaces");
                return;
            }

            if (!createForm.time) {
                toast.error("Please select a match time!");
                return;
            }
            const parsedTime = parseTime12to24(createForm.time);
            if (!parsedTime) {
                toast.error("Invalid time format! Use hh:mm AM/PM (e.g. 01:30 AM)");
                return;
            }
            const selectedDateTime = new Date(`${createForm.date}T${parsedTime}`);
            const now = new Date();

            // Validate Date Range (Today to Today + 30 days)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 30);
            maxDate.setHours(23, 59, 59, 999);

            if (selectedDateTime.getTime() < todayStart.getTime()) {
                toast.error("Match cannot be scheduled in the past!");
                return;
            }
            if (selectedDateTime.getTime() > maxDate.getTime()) {
                toast.error("Match can only be scheduled within the next 30 days!");
                return;
            }

            // Allow a small buffer (e.g., 1 minute) to avoid issues if creating right at current time
            if (selectedDateTime.getTime() < now.getTime() - 60000) {
                toast.error("Match date or time cannot be in the past!");
                return;
            }

            if (!validateSquads()) return;

            setIsSaving(true);
            const autoTitle = `${createForm.teamA.trim()} vs ${createForm.teamB.trim()}`;

            const payload = {
                ...createForm,
                teamA: createForm.teamA.trim(),
                teamB: createForm.teamB.trim(),
                teamASquad: squadA,
                teamBSquad: squadB,
                date: selectedDateTime.toISOString(),
                title: autoTitle,
                series: createForm.series || 'SMCC LIVE'
            };

            if (isEditingMode) {
                // If it is live/completed, we don't allow changing Team A or Team B or Overs anyway
                // but the form holds the original values because fields were disabled.
                await axios.put(`${API_URL}/api/matches/${createForm._id}`, payload, config);
                toast.success("Match updated successfully!");
            } else {
                await axios.post(`${API_URL}/api/matches`, payload, config);
                toast.success("Match created successfully!");
            }

            fetchMatches();
            setIsCreating(false);
            setIsEditingMode(false);
            setCreateForm({
                title: '', series: '', teamA: '', teamB: '', status: 'upcoming',
                date: new Date().toISOString().split('T')[0],
                time: '09:00 AM', venue: '', totalOvers: 20
            });
            setSquadA(Array(11).fill(''));
            setSquadB(Array(11).fill(''));
        } catch (err) {
            const errorMsg = err.response?.data?.msg || err.response?.data?.error || "Failed to create match";
            toast.error(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await axios.delete(`${API_URL}/api/matches/${id}`, config);
            toast.success('Match deleted permanently'); fetchMatches();
            if (selectedMatch?._id === id || selectedMatch?.id === id) setSelectedMatch(null);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.msg || "Delete operation failed";
            toast.error(errorMsg);
        }
    };

    const handleStartSuperOver = () => {
        if (!selectedMatch) return;
        let updatedMatch = JSON.parse(JSON.stringify(selectedMatch));

        let nextBattingTeam, nextBowlingTeam;
        nextBattingTeam = superOverBattingTeam || (updatedMatch.innings && updatedMatch.innings[0]?.team) || updatedMatch.teamA;
        nextBowlingTeam = (nextBattingTeam === updatedMatch.teamA ? updatedMatch.teamB : updatedMatch.teamA);

        // Push BOTH innings for the Super Over pair to keep stats unique
        // Batting Innings
        updatedMatch.innings.push({
            team: nextBattingTeam, runs: 0, wickets: 0, overs: 0,
            batting: [], bowling: [],
            extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 }
        });
        // Bowling Innings (to store bowling stats of this team)
        updatedMatch.innings.push({
            team: nextBowlingTeam, runs: 0, wickets: 0, overs: 0,
            batting: [], bowling: [],
            extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 }
        });

        // Reset live score state
        updatedMatch.score = {
            battingTeam: nextBattingTeam,
            runs: 0, wickets: 0, overs: 0,
            thisOver: [],
            target: null
        };

        updatedMatch.status = 'live';
        updatedMatch.currentBatsmen = [];
        updatedMatch.currentBowler = null;

        setStriker(''); setNonStriker(''); setBowler('');

        handleUpdate('manual', updatedMatch);
        setShowSuperOverModal(false);
        toast.success(`Super Over Started! ${nextBattingTeam} batting first.`, { icon: '🔥' });
    };

    const handleDeclareTie = () => {
        if (!selectedMatch) return;
        let updatedMatch = JSON.parse(JSON.stringify(selectedMatch));
        updatedMatch.status = 'completed';
        handleUpdate('manual', updatedMatch);
        setShowSuperOverModal(false);
        toast.success("Match ended as a Tie! Don't forget to set Player of the Match.", { icon: '🤝', duration: 5000 });
    };

    const getBalls = (overs) => oversToBalls(overs);

    const getCRR = () => {
        const totalBalls = getBalls(selectedMatch?.score?.overs || 0);
        if (totalBalls === 0) return '0.00';
        return (((selectedMatch?.score?.runs || 0) / totalBalls) * BALLS_PER_OVER).toFixed(2);
    };

    const getRRR = () => {
        const target = selectedMatch?.score?.target;
        if (!target) return null;
        const totalBalls = (selectedMatch?.totalOvers || DEFAULT_MAX_OVERS) * BALLS_PER_OVER;
        const ballsBowled = getBalls(selectedMatch?.score?.overs || 0);
        const ballsRemaining = totalBalls - ballsBowled;
        if (ballsRemaining <= 0) return '0.00';
        const runsNeeded = target - (selectedMatch?.score?.runs || 0);
        return ((runsNeeded / ballsRemaining) * BALLS_PER_OVER).toFixed(2);
    };

    const handleSaveDateTime = () => {
        if (!selectedMatch) return;

        const isPast24h = (Date.now() - new Date(selectedMatch.date).getTime()) > 24 * 60 * 60 * 1000;
        if (isPast24h) {
            toast.error("Cannot edit a match that has been running for over 24 hours!");
            return;
        }

        const parsedTime = parseTime12to24(editTime);
        if (!parsedTime) {
            toast.error('Invalid time format! Use hh:mm AM/PM');
            return;
        }

        const newDate = new Date(`${editDate}T${parsedTime}`);
        handleUpdate('manual', { ...selectedMatch, date: newDate.toISOString() });
        toast.success("Match start time updated!");
    };

    const handlePauseToggle = async (reason = '') => {
        if (!selectedMatch) return;
        const isCurrentlyPaused = selectedMatch.score?.isPaused;
        const finalReason = reason || (pauseReason === 'Other' ? customPauseReason : pauseReason);

        if (!isCurrentlyPaused && !finalReason) {
            toast.error("Please provide a reason for pausing");
            return;
        }

        try {
            const res = await axios.put(`${API_URL}/api/matches/${selectedMatch?._id || selectedMatch?.id}/pause`, {
                reason: finalReason
            }, config);

            // Handle standardized { success, data }
            const updatedData = res.data.success ? res.data.data : res.data;
            setSelectedMatch(updatedData);
            setShowPauseModal(false);
            setPauseReason('');
            setCustomPauseReason('');
            toast.success(isCurrentlyPaused ? "Match Resumed!" : `Match Paused: ${finalReason}`);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to toggle pause");
        }
    };

    const rrr = getRRR();

    return (
        <>
            <Container fluid="lg" className="py-4">
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
                        <Button variant="primary" onClick={async () => {
                            if (!tossData.winner) return toast.error("Select a winner");
                            try {
                                const res = await axios.put(`${API_URL}/api/matches/${selectedMatch?._id || selectedMatch?.id}/toss`, {
                                    tossWinnerTeamId: tossData.winner,
                                    tossDecision: tossData.decision.toUpperCase()
                                }, config);

                                const updatedData = res.data.success ? res.data.data : res.data;
                                setSelectedMatch(updatedData);
                                setScorecardData(updatedData.innings);
                                setShowTossModal(false);
                                toast.success("Toss updated successfully");
                            } catch (err) {
                                toast.error(err.response?.data?.message || "Failed to update toss");
                            }
                        }}>Confirm Toss</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showStartModal} onHide={() => setShowStartModal(false)} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
                    <Modal.Header className="bg-primary text-white border-0 py-3 px-4"><Modal.Title className="fw-black">🚀 START MATCH</Modal.Title></Modal.Header>
                    <Modal.Body className="p-4 bg-light">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">Batting Team</Form.Label>
                            <Form.Select size="lg" className="rounded-3 border-0 shadow-sm fw-bold" value={modalData.team} onChange={e => setModalData({ ...modalData, team: e.target.value })}>
                                <option value={selectedMatch?.teamA}>{selectedMatch?.teamA} (Team A)</option>
                                <option value={selectedMatch?.teamB}>{selectedMatch?.teamB} (Team B)</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">Striker</Form.Label>
                            <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.s} onChange={e => setModalData({ ...modalData, s: e.target.value })}>
                                <option value="">Select Striker</option>
                                {(modalData.team === selectedMatch?.teamA ? squadA : squadB).map((p, i) => <option key={i} value={p}>{p}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">Non-Striker</Form.Label>
                            <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.ns} onChange={e => setModalData({ ...modalData, ns: e.target.value })}>
                                <option value="">Select Non-Striker</option>
                                {(modalData.team === selectedMatch?.teamA ? squadA : squadB).map((p, i) => <option key={i} value={p}>{p}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">Bowler</Form.Label>
                            <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.b} onChange={e => setModalData({ ...modalData, b: e.target.value })}>
                                <option value="">Select Bowler</option>
                                {(modalData.team === selectedMatch?.teamA ? squadB : squadA).map((p, i) => <option key={i} value={p}>{p}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 bg-light pb-4 px-4">
                        <Button variant="primary" size="lg" className="w-100 fw-black rounded-pill shadow" disabled={isUpdating} onClick={() => {
                            if (!modalData.s || !modalData.ns || !modalData.b) return toast.error("Select all players!");
                            if (modalData.s === modalData.ns) return toast.error("Striker and Non-Striker cannot be the same!");
                            handleUpdate('init', modalData);
                            setShowStartModal(false);
                        }}>
                            {isUpdating ? <Spinner animation="border" size="sm" /> : "LET'S PLAY"}
                        </Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showBowlerModal} onHide={() => setShowBowlerModal(false)} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
                    <Modal.Header className="bg-dark text-white border-0 py-3 px-4"><Modal.Title className="fw-black">⚾ NEXT BOWLER</Modal.Title></Modal.Header>
                    <Modal.Body className="p-4 bg-light">
                        <Form.Group>
                            <Form.Label className="fw-bold small text-uppercase text-muted">Next Bowler Name:</Form.Label>
                            <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.nextB} onChange={e => setModalData({ ...modalData, nextB: e.target.value })}>
                                <option value="">Select Bowler</option>
                                {(selectedMatch?.score?.battingTeam === selectedMatch?.teamA ? squadB : squadA).filter(p => p.trim() !== '').map((p, i) => <option key={i} value={p}>{p}</option>)}
                            </Form.Select>
                            {selectedMatch?.score?.thisOver?.length > 0 && selectedMatch.bowler && (
                                <div className="mt-2 p-2 bg-warning bg-opacity-10 border border-warning rounded-3 small text-warning-emphasis fw-bold">
                                    🩹 Replacing bowler mid-over. Remaining balls: {BALLS_PER_OVER - selectedMatch.score.thisOver.filter(b => !/WD|NB/i.test(b.toString())).length}
                                </div>
                            )}
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 bg-light pb-4 px-4 d-flex gap-2">
                        <Button variant="outline-danger" size="lg" className="flex-grow-1 fw-bold rounded-pill" onClick={() => { setShowBowlerModal(false); undoLastBall(); }}>CANCEL & UNDO</Button>
                        <Button variant="primary" size="lg" className="flex-grow-2 fw-black rounded-pill shadow" onClick={() => { if (!modalData.nextB) return toast.error("Select a bowler"); handleUpdate('new_bowler', modalData.nextB); setShowBowlerModal(false); setModalData({ ...modalData, nextB: '' }); }}>{selectedMatch?.score?.thisOver?.length > 0 ? 'CONFIRM CHANGE' : 'START OVER'}</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showBatsmanModal} onHide={() => setShowBatsmanModal(false)} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
                    <Modal.Header className={`${batsmanModalType === 'wicket' ? 'bg-danger' : 'bg-info'} text-white border-0 py-3 px-4`}>
                        <Modal.Title className="fw-black">{batsmanModalType === 'wicket' ? '🏏 WICKET! NEW BATSMAN' : '🏥 RETIRED! NEW BATSMAN'}</Modal.Title></Modal.Header>
                    <Modal.Body className="p-4 bg-light">
                        <Form.Group>
                            <Form.Label className="fw-bold small text-uppercase text-muted">Select New Batsman:</Form.Label>
                            <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={modalData.nextS} onChange={e => setModalData({ ...modalData, nextS: e.target.value })}>
                                <option value="">Select Batsman</option>
                                {getAvailableBatsmen('batting').map((p, i) => <option key={i} value={p}>{p}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 bg-light pb-4 px-4 d-flex gap-2">
                        <Button variant="outline-danger" size="lg" className="flex-grow-1 fw-bold rounded-pill" onClick={() => { setShowBatsmanModal(false); undoLastBall(); }}>CANCEL & UNDO</Button>
                        <Button variant={batsmanModalType === 'wicket' ? 'danger' : 'info'} size="lg" className="flex-grow-2 fw-black rounded-pill shadow" onClick={() => {
                            if (!modalData.nextS) return toast.error("Select a player!");
                            const currentOther = selectedMatch.currentBatsmen.find(b => b.name !== (runOutOutType === 'striker' ? striker : nonStriker))?.name;
                            if (modalData.nextS === currentOther) return toast.error("Player already on field!");
                            handleUpdate(batsmanModalType === 'wicket' ? 'wicket_with_replacement' : 'retired_with_replacement', modalData.nextS, { wicketDetails });
                            setShowBatsmanModal(false); setModalData({ ...modalData, nextS: '' });
                        }}>SUBMIT</Button>
                    </Modal.Footer>
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
                                {wicketDetails.ballType === 'normal' && !selectedMatch?.score?.freeHit && (
                                    <>
                                        <option value="caught">Caught</option>
                                        <option value="bowled">Bowled</option>
                                        <option value="lbw">LBW</option>
                                    </>
                                )}
                                {(wicketDetails.ballType === 'normal' || wicketDetails.ballType === 'no-ball' || wicketDetails.ballType === 'wide') && (
                                    <option value="run out">Run Out</option>
                                )}
                                {(wicketDetails.ballType === 'normal' || wicketDetails.ballType === 'wide') && !selectedMatch?.score?.freeHit && (
                                    <>
                                        <option value="stumped">Stumped</option>
                                        <option value="hit wicket">Hit Wicket</option>
                                    </>
                                )}
                                <option value="retired hurt">Retired Hurt</option>
                            </Form.Select>
                        </Form.Group>
                        {(wicketDetails.type === 'caught' || wicketDetails.type === 'run out' || wicketDetails.type === 'stumped') && (
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small text-uppercase text-muted">
                                    {wicketDetails.type === 'stumped' ? 'Wicket Keeper Name' : 'Fielder Name'}
                                </Form.Label>
                                <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={wicketDetails.fielder} onChange={e => setWicketDetails({ ...wicketDetails, fielder: e.target.value })}>
                                    <option value="">Select Player</option>
                                    {(selectedMatch?.score?.battingTeam === selectedMatch?.teamA ? squadB : squadA).filter(p => p.trim() !== '').map((p, i) => (
                                        <option key={i} value={p}>{p}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        )}

                        {wicketDetails.type === 'run out' && (
                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="switch"
                                    id="batters-crossed-switch"
                                    label="Batters Crossed?"
                                    className="fw-bold text-muted"
                                    checked={wicketDetails.crossed}
                                    onChange={e => setWicketDetails({ ...wicketDetails, crossed: e.target.checked })}
                                />
                                <small className="text-muted d-block mt-1">If they crossed before the wicket fell, the survivor stays at the new end.</small>
                            </Form.Group>
                        )}
                        {(wicketDetails.type === 'run out' || wicketDetails.type === 'stumped') && (
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small text-uppercase text-muted">Ball Category</Form.Label>
                                <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={wicketDetails.ballType} onChange={e => setWicketDetails({ ...wicketDetails, ballType: e.target.value })}>
                                    <option value="normal">Normal Ball</option>
                                    <option value="wide">Wide Ball (+1 Extra)</option>
                                    {wicketDetails.type === 'run out' && <option value="no-ball">No Ball (+1 Extra)</option>}
                                    {wicketDetails.type === 'run out' && <option value="mankad">Mankad (Non-striker)</option>}
                                </Form.Select>
                                {wicketDetails.ballType === 'mankad' && <small className="text-danger d-block mt-1">⚠️ Mankad does not count as a ball in the over.</small>}
                            </Form.Group>
                        )}
                        {wicketDetails.type === 'run out' && (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold small text-uppercase text-muted">Who is Out?</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Button
                                            variant={wicketDetails.whomOut === 'striker' ? 'danger' : 'outline-danger'}
                                            className="flex-grow-1 fw-bold"
                                            disabled={wicketDetails.ballType === 'mankad'}
                                            onClick={() => setWicketDetails({ ...wicketDetails, whomOut: 'striker' })}
                                        >
                                            STRIKER ({toCamelCase(striker)})
                                        </Button>
                                        <Button
                                            variant={wicketDetails.whomOut === 'non-striker' ? 'danger' : 'outline-danger'}
                                            className="flex-grow-1 fw-bold"
                                            onClick={() => setWicketDetails({ ...wicketDetails, whomOut: 'non-striker' })}
                                        >
                                            NON-STRIKER ({toCamelCase(nonStriker)})
                                        </Button>
                                    </div>
                                    {wicketDetails.ballType === 'mankad' && <small className="text-muted mt-1 d-block">Mankad only applies to the non-striker.</small>}
                                </Form.Group>
                                {wicketDetails.ballType !== 'mankad' && (
                                    <>

                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-bold small text-uppercase text-muted">Runs Completed</Form.Label>
                                            <Form.Select size="lg" className="rounded-3 border-0 shadow-sm" value={wicketDetails.runs} onChange={e => setWicketDetails({ ...wicketDetails, runs: parseInt(e.target.value) })}>
                                                {[0, 1, 2, 3].map(r => <option key={r} value={r}>{r}</option>)}
                                            </Form.Select>
                                        </Form.Group>
                                    </>
                                )}
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="border-0 bg-light pb-4 px-4">
                        <Button variant="danger" size="lg" className="w-100 fw-black rounded-pill shadow" onClick={() => {
                            handleUpdate('wicket', 0, { wicketDetails, ...wicketDetails });
                            setShowWicketModal(false);
                            setBatsmanModalType('wicket');
                            setShowBatsmanModal(true);
                        }}>CONTINUE</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showDlsModal} onHide={() => setShowDlsModal(false)} centered backdrop="static" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
                    <Modal.Header className="bg-primary text-white border-0 py-3 px-4">
                        <Modal.Title className="fw-black">🌧️ DLS ADJUSTMENTS</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4 bg-light">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">Revised Target Score</Form.Label>
                            <Form.Control
                                type="number"
                                size="lg"
                                className="rounded-3 border-0 shadow-sm"
                                value={dlsData.target}
                                onChange={e => setDlsData({ ...dlsData, target: e.target.value })}
                                placeholder="Enter new target"
                            />
                            <Form.Text className="text-muted small">The runs required to win the match.</Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-uppercase text-muted">Revised Total Overs</Form.Label>
                            <Form.Control
                                type="number"
                                size="lg"
                                className="rounded-3 border-0 shadow-sm"
                                value={dlsData.totalOvers}
                                onChange={e => setDlsData({ ...dlsData, totalOvers: e.target.value })}
                                placeholder="Enter new total overs"
                            />
                            <Form.Text className="text-muted small">The updated total overs for the match.</Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 bg-light pb-4 px-4 d-flex gap-2">
                        <Button variant="outline-secondary" size="lg" className="flex-grow-1 fw-bold rounded-pill" onClick={() => setShowDlsModal(false)}>CANCEL</Button>
                        <Button variant="primary" size="lg" className="flex-grow-1 fw-black rounded-pill shadow" onClick={() => {
                            if (!dlsData.target || !dlsData.totalOvers) return toast.error("Please fill all fields!");
                            const updatedMatch = {
                                ...selectedMatch,
                                totalOvers: parseInt(dlsData.totalOvers),
                                score: { ...selectedMatch.score, target: parseInt(dlsData.target) },
                                isDLS: true
                            };
                            handleUpdate('manual', updatedMatch);
                            setShowDlsModal(false);
                            toast.success("DLS Adjustments Applied Successfully!");
                        }}>APPLY DLS</Button>
                    </Modal.Footer>
                </Modal>

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-5">
                    <div className="d-flex gap-3 align-items-center">
                        <h2 className="fw-black premium-gradient-text m-0">Admin Dashboard</h2>
                    </div>
                    <Button variant="primary" className="rounded-pill shadow-sm px-4 py-2 fw-bold" onClick={() => { setIsCreating(true); setIsEditingMode(false); setSelectedMatch(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <i className="bi bi-plus-lg me-2"></i>New Match
                    </Button>
                </div>

                <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
                    <Row>
                        <Col lg={4} className="mb-4">
                            <Card className="shadow-sm border-0">
                                <Card.Header className="bg-white fw-bold d-flex justify-content-between"><span>Matches</span><Badge bg="secondary">{matches.length}</Badge></Card.Header>
                                <ListGroup variant="flush" className="overflow-auto" style={{ maxHeight: '75vh' }}>
                                    {matches.map(m => (
                                        <ListGroup.Item key={m._id || m.id} className="d-flex justify-content-between align-items-center py-3 border-start border-4 p-0 pointer-event" style={{ borderLeftColor: m.status === 'live' ? '#ff4b2b' : '#333' }}>
                                            <div className={`flex-grow-1 p-3 ${selectedMatch?._id === m._id || selectedMatch?.id === m.id ? 'bg-primary text-white' : ''}`} style={{ cursor: 'pointer' }} onClick={() => handleEdit(m)}>
                                                <div className="fw-bold fs-6">{m.teamA.toUpperCase()} vs {m.teamB.toUpperCase()}</div>
                                                <small className={selectedMatch?._id === m._id || selectedMatch?.id === m.id ? 'text-white-50' : 'text-muted'}>
                                                    {m.status.toUpperCase()} | {new Date(m.date).toLocaleDateString()} | {formatTime(m.date)}
                                                </small>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                {(m.status === 'completed' || m.status === 'abandoned') && (
                                                    <Button variant="link" className="text-secondary px-2" title="Copy Match & Squads" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCreateForm({
                                                            title: '', teamA: m.teamA, teamB: m.teamB, status: 'upcoming',
                                                            date: new Date().toISOString().split('T')[0], time: formatTime24to12(new Date()), venue: '', totalOvers: 20
                                                        });
                                                        setSquadA(m.teamASquad || Array(11).fill(''));
                                                        setSquadB(m.teamBSquad || Array(11).fill(''));
                                                        setIsCreating(true);
                                                        setSelectedMatch(null);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}>
                                                        <i className="bi bi-files fs-5"></i>
                                                    </Button>
                                                )}
                                                {m.status !== 'completed' && m.status !== 'abandoned' && (
                                                    <Button variant="link" className="text-danger px-3 border-start ms-2" onClick={(e) => handleDelete(e, m._id || m.id)}>
                                                        <span className="fs-4">×</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </Card>
                        </Col>

                        <Col lg={8}>
                            {isCreating ? (
                                <Card className="shadow-lg border-0">
                                    <Card.Body className="p-4">
                                        <div className="d-flex align-items-center justify-content-between mb-4">
                                            <h4 className="fw-bold mb-0">{isEditingMode ? 'Edit Match Configurations' : 'New Match'}</h4>
                                            {isEditingMode && createForm.status !== 'upcoming' && (
                                                <Badge bg="warning" text="dark">Restricted Mode: Match Live/Completed</Badge>
                                            )}
                                        </div>
                                        <Form onSubmit={handleCreateSubmit}>
                                            <Row className="g-3">
                                                <Col md={12}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold">Title</Form.Label>
                                                        <Form.Control
                                                            disabled
                                                            value={createForm.teamA && createForm.teamB ? `${createForm.teamA} vs ${createForm.teamB}` : ''}
                                                            placeholder="Auto-generated"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold">Team A</Form.Label>
                                                        <Form.Control required disabled={isEditingMode && createForm.status !== 'upcoming'} placeholder="Team Name" value={createForm.teamA} onChange={e => setCreateForm({ ...createForm, teamA: e.target.value })} />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold">Team B</Form.Label>
                                                        <Form.Control required disabled={isEditingMode && createForm.status !== 'upcoming'} placeholder="Team Name" value={createForm.teamB} onChange={e => setCreateForm({ ...createForm, teamB: e.target.value })} />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold">Overs</Form.Label>
                                                        <Form.Control type="number" min="1" max="50" disabled={isEditingMode && createForm.status !== 'upcoming'} required value={createForm.totalOvers} onChange={e => setCreateForm({ ...createForm, totalOvers: e.target.value })} />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold">Venue</Form.Label>
                                                        <Form.Control placeholder="Ground Name" value={createForm.venue} onChange={e => setCreateForm({ ...createForm, venue: e.target.value })} />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold">Date</Form.Label>
                                                        <Form.Control
                                                            type="date"
                                                            min={new Date().toISOString().split('T')[0]}
                                                            max={new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]}
                                                            value={createForm.date}
                                                            onChange={e => setCreateForm({ ...createForm, date: e.target.value })}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group>
                                                        <Form.Label className="small fw-bold">Time (Local)</Form.Label>
                                                        <Form.Control
                                                            type="time"
                                                            value={parseTime12to24(createForm.time) || ''}
                                                            onKeyDown={(e) => e.preventDefault()}
                                                            onClick={(e) => e.target.showPicker?.()}
                                                            onFocus={(e) => e.target.showPicker?.()}
                                                            onChange={e => {
                                                                const val24 = e.target.value;
                                                                if (!val24) return;
                                                                const [h, m] = val24.split(':');
                                                                const date = new Date();
                                                                date.setHours(parseInt(h), parseInt(m));
                                                                setCreateForm({ ...createForm, time: formatTime24to12(date) });
                                                            }}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>
                                            <div className="mt-4 d-flex gap-2">
                                                <Button variant="outline-primary" onClick={() => setShowSquadModal(true)} disabled={isSaving || (isEditingMode && createForm.status !== 'upcoming')}>MANAGE SQUADS (11)</Button>
                                                <Button variant="primary" type="submit" disabled={isSaving}>
                                                    {isSaving ? <Spinner animation="border" size="sm" /> : (isEditingMode ? 'Update Match' : 'Create Match')}
                                                </Button>
                                                {!isEditingMode && <Button variant="outline-danger" disabled={isSaving} onClick={() => setCreateForm({ title: '', teamA: '', teamB: '', status: 'upcoming', date: new Date().toISOString().split('T')[0], time: formatTime24to12(new Date()), venue: '', totalOvers: 20 })}>Clear</Button>}
                                                <Button variant="light" disabled={isSaving} onClick={() => { setIsCreating(false); setIsEditingMode(false); }}>Cancel</Button>
                                            </div>
                                        </Form>
                                    </Card.Body>
                                </Card>
                            ) : selectedMatch ? (
                                <Card className="shadow-lg border-0 overflow-hidden">
                                    <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-3 px-4">
                                        <h5 className="m-0 fw-bold">{selectedMatch.teamA.toUpperCase()} vs {selectedMatch.teamB.toUpperCase()}</h5>
                                        <div className="d-flex align-items-center gap-2">
                                            <Button variant="outline-light" size="sm" onClick={() => handleEditMatchForm(selectedMatch)}>
                                                <i className="bi bi-pencil-square me-1"></i> Edit Match
                                            </Button>
                                            <Badge bg={selectedMatch.status === 'live' ? 'danger' : 'info'}>{selectedMatch.status.toUpperCase()}</Badge>
                                        </div>
                                    </Card.Header>
                                    <Card.Body className="p-4">
                                        <div className="text-center mb-4 bg-light rounded-4 p-4 border">


                                            {/* Dynamic Previous Innings Display */}
                                            {selectedMatch.innings && selectedMatch.innings.length > 1 && (
                                                <div className="mt-4 mb-2 d-flex flex-wrap justify-content-center gap-2">
                                                    {selectedMatch.innings.map((inn, i) => ({ ...inn, originalIdx: i }))
                                                        .filter(inn => {
                                                            const isCurrent = inn.team === selectedMatch.score?.battingTeam;
                                                            const hasStarted = inn.runs > 0 || inn.wickets > 0 || (inn.batting && inn.batting.length > 0);
                                                            return hasStarted && !isCurrent;
                                                        })
                                                        .sort((a, b) => a.originalIdx - b.originalIdx)
                                                        .map((inn) => {
                                                            const idx = inn.originalIdx;
                                                            if (idx >= 2 && inn.runs === 0 && inn.wickets === 0 && (!inn.batting || inn.batting.length === 0)) return null;
                                                            return (
                                                                <Badge key={idx} bg="secondary" className="opacity-75 shadow-sm text-uppercase x-small">
                                                                    {idx >= 2 ? `${inn.team} SO ${Math.floor(idx / 2)}:` : `${inn.team}:`} {inn.runs}/{inn.wickets} ({inn.overs})
                                                                </Badge>
                                                            );
                                                        })}
                                                </div>
                                            )}

                                            {/* Innings Break Announcement */}
                                            {selectedMatch.status === 'live' && selectedMatch.score.target && (!selectedMatch.currentBatsmen || selectedMatch.currentBatsmen.length === 0) && (
                                                <Alert variant="warning" className="fw-black py-3 my-4 border-0 rounded-pill shadow-sm animate-bounce text-center">
                                                    ☕ {t('innings_break')}
                                                </Alert>
                                            )}

                                            {(() => {
                                                const winStr = calculateWinner(selectedMatch, true);
                                                const isFinished = selectedMatch.status === 'completed' || (
                                                    selectedMatch.score.target && (
                                                        selectedMatch.score.runs >= selectedMatch.score.target ||
                                                        (selectedMatch.score.overs >= (selectedMatch.innings.length > 2 ? 1 : selectedMatch.totalOvers) && selectedMatch.score.runs < selectedMatch.score.target - 1) ||
                                                        (selectedMatch.score.wickets >= (selectedMatch.innings.length > 2 ? 2 : 10) && selectedMatch.score.runs < selectedMatch.score.target - 1)
                                                    )
                                                );

                                                const isLive = selectedMatch.status === 'live';
                                                const target = selectedMatch.score?.target;
                                                const isSuperOver = selectedMatch.innings.length > 2;

                                                const dRuns = selectedMatch.score?.runs ?? 0;
                                                const dWickets = selectedMatch.score?.wickets ?? 0;
                                                const dOvers = selectedMatch.score?.overs ?? 0;
                                                const dLimit = isSuperOver ? 1 : (selectedMatch.totalOvers || 0);

                                                const crr = dOvers > 0 ? (dRuns / parseFloat(dOvers)).toFixed(2) : '0.00';
                                                const ballsRemaining = target && dLimit > 0
                                                    ? Math.max(0, (dLimit * 6) - Math.round((parseFloat(dOvers) % 1 * 10) + Math.floor(parseFloat(dOvers)) * 6))
                                                    : 0;
                                                const runsNeeded = target ? Math.max(0, target - dRuns) : 0;
                                                const rrr = target && ballsRemaining > 0
                                                    ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
                                                    : null;

                                                return (
                                                    <div className="clean-display-structure py-4 px-3">
                                                        {/* 1. Main Score Block */}
                                                        <div className="mb-4">
                                                            <div className="display-2 fw-black text-primary mb-1">
                                                                {dRuns} / {dWickets}
                                                            </div>
                                                            <div className="h4 fw-bold text-muted mb-0">
                                                                {isFinished ? (
                                                                    <>Completed in {pluralize(dOvers, 'Over')}</>
                                                                ) : (
                                                                    <>
                                                                        {pluralize(dOvers, 'Over')}
                                                                        <span className="mx-2 opacity-50">/</span>
                                                                        {pluralize(dLimit, 'Over')}
                                                                    </>
                                                                )}
                                                                {isSuperOver && <small className="ms-2 text-uppercase text-danger fw-black" style={{ fontSize: '0.6em' }}>(Super Over)</small>}
                                                            </div>
                                                        </div>

                                                        {/* 2. Target Block (Live & 2nd Innings) */}
                                                        {isLive && target && (
                                                            <div className="mb-4">
                                                                <Badge bg="danger" className="px-4 py-3 rounded-pill shadow-sm border border-white border-opacity-25 w-100" style={{ fontSize: '1.25rem' }}>
                                                                    <i className="bi bi-bullseye me-2"></i>
                                                                    TARGET: {pluralize(target, 'Run')} Required from {pluralize(isSuperOver ? 1 : selectedMatch.totalOvers, 'Over')}
                                                                </Badge>
                                                            </div>
                                                        )}

                                                        {/* 3. Run Rate Block (Live) */}
                                                        {isLive && (
                                                            <div className="d-flex flex-wrap justify-content-center gap-3 mb-4">
                                                                <div className="bg-white border rounded-pill px-3 py-2 shadow-sm d-flex align-items-center gap-2">
                                                                    <span className="x-small fw-black text-muted text-uppercase">Current RR:</span>
                                                                    <span className="fw-black text-primary">{crr}</span>
                                                                </div>
                                                                {rrr && (dRuns > 0 || dOvers > 0) && (
                                                                    <div className="bg-info bg-opacity-10 border border-info border-opacity-25 rounded-pill px-3 py-2 shadow-sm d-flex align-items-center gap-2">
                                                                        <span className="x-small fw-black text-info text-uppercase">Required RR:</span>
                                                                        <span className="fw-black text-info">{rrr}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* 4. Result Block (Finished) */}
                                                        {isFinished && winStr && winStr !== 'Match Completed' && (
                                                            <div className="alert alert-success fw-black text-center py-3 mb-4 border-0 rounded-4 shadow-sm animate-fade-in" style={{ fontSize: '1.25rem' }}>
                                                                🏆 {winStr.toUpperCase()}
                                                            </div>
                                                        )}

                                                        <div className="mt-2 pt-4 border-top opacity-0" style={{ height: '1px' }}></div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="d-flex gap-2 mb-4 justify-content-center flex-wrap">
                                            {(!selectedMatch.toss?.winner && (selectedMatch.status === 'upcoming' || selectedMatch.status === 'live')) && <Button variant="warning" size="lg" className="px-5 fw-bold" onClick={() => {
                                                // Allow 15 min buffer
                                                const now = new Date();
                                                const scheduled = new Date(selectedMatch.date);
                                                const bufferTime = new Date(now.getTime() + 15 * 60000);

                                                if (bufferTime < scheduled) {
                                                    toast.error(`Wait! Match starts at ${scheduled.toLocaleTimeString()}`, { icon: '⏳', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
                                                    return;
                                                }
                                                setShowTossModal(true);
                                            }}>🪙 CONDUCT TOSS</Button>}
                                            {/* INNINGS START BUTTONS */}
                                            {selectedMatch.status === 'upcoming' && (
                                                <Button variant="success" size="lg" className="px-5 fw-bold" onClick={() => {
                                                    const now = new Date();
                                                    const scheduled = new Date(selectedMatch.date);
                                                    const bufferTime = new Date(now.getTime() + 15 * 60000);
                                                    if (bufferTime < scheduled) {
                                                        toast.error(`Wait! Match starts at ${scheduled.toLocaleTimeString()}`, { icon: '⏳', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
                                                        return;
                                                    }
                                                    if (!validateSquads()) return;
                                                    if (squadA.filter(p => p).length < 11 || squadB.filter(p => p).length < 11) {
                                                        toast.error("Both teams must have 11 players!");
                                                        return;
                                                    }
                                                    // Pre-select team from toss if available
                                                    let team1st = selectedMatch.teamA;
                                                    if (selectedMatch.toss?.winner) {
                                                        const win = selectedMatch.toss.winner;
                                                        const dec = selectedMatch.toss.decision;
                                                        team1st = dec === 'bat' ? win : (win === selectedMatch.teamA ? selectedMatch.teamB : selectedMatch.teamA);
                                                    }
                                                    setModalData({ s: '', ns: '', b: '', nextB: '', nextS: '', team: team1st });
                                                    setShowStartModal(true);
                                                }}>
                                                    {(() => {
                                                        let team1st = selectedMatch.teamA;
                                                        if (selectedMatch.toss?.winner) {
                                                            const win = selectedMatch.toss.winner;
                                                            const dec = selectedMatch.toss.decision;
                                                            team1st = dec === 'bat' ? win : (win === selectedMatch.teamA ? selectedMatch.teamB : selectedMatch.teamA);
                                                        }
                                                        return `Start 1st Innings (${team1st})`;
                                                    })()}
                                                </Button>
                                            )}

                                            {/* Helper to check if current innings is done */}
                                            {(() => {
                                                let currentInnIdx;
                                                if (selectedMatch.innings.length > 2) {
                                                    const pairStart = selectedMatch.innings.length - 2;
                                                    currentInnIdx = selectedMatch.score?.target ? pairStart + 1 : pairStart;
                                                } else {
                                                    currentInnIdx = selectedMatch.score?.target ? 1 : 0;
                                                }
                                                const currentInn = selectedMatch.innings[currentInnIdx];
                                                const limit = selectedMatch.innings.length > 2 ? 1 : selectedMatch.totalOvers;

                                                const isComplete = currentInn && (
                                                    currentInn.overs >= limit ||
                                                    currentInn.wickets >= 10 ||
                                                    (selectedMatch.innings.length > 2 && currentInn.wickets >= 2)
                                                );

                                                return (
                                                    <>
                                                        {selectedMatch.status === 'live' && ((!selectedMatch.currentBatsmen || selectedMatch.currentBatsmen.length === 0) || isComplete) && (
                                                            (() => {
                                                                const targetIdx = isComplete ? selectedMatch.innings.length : currentInnIdx;
                                                                let isTie = false;
                                                                if (targetIdx >= 4 && targetIdx % 2 === 0) {
                                                                    const prevInn2 = selectedMatch.innings[targetIdx - 1];
                                                                    const prevInn1 = selectedMatch.innings[targetIdx - 2];
                                                                    if (prevInn1.runs === prevInn2.runs) isTie = true;
                                                                }

                                                                if (isTie) {
                                                                    return (
                                                                        <Button variant="warning" size="lg" className="px-5 fw-bold shadow-sm" onClick={() => {
                                                                            if (window.confirm("Super Over ended in a TIE. End match as DRAW?")) {
                                                                                handleUpdate('manual', { ...selectedMatch, status: 'completed' });
                                                                            }
                                                                        }}>End Match (Tie/Draw)</Button>
                                                                    );
                                                                }

                                                                return (
                                                                    <Button disabled={isUpdating} variant="success" size="lg" className="px-5 fw-bold shadow-sm" onClick={() => {
                                                                        const tIdx = targetIdx;
                                                                        let nextTeam;
                                                                        if (selectedMatch.innings[tIdx]?.team) {
                                                                            nextTeam = selectedMatch.innings[tIdx].team;
                                                                        } else if (tIdx === 1) {
                                                                            const team1 = selectedMatch.innings[0].team;
                                                                            nextTeam = (team1 === selectedMatch.teamA ? selectedMatch.teamB : selectedMatch.teamA);
                                                                        } else if (tIdx >= 2) {
                                                                            const team1 = selectedMatch.innings[0].team || selectedMatch.teamA;
                                                                            const team2 = (team1 === selectedMatch.teamA ? selectedMatch.teamB : selectedMatch.teamA);
                                                                            nextTeam = tIdx % 2 === 0 ? team1 : team2;
                                                                        }
                                                                        setModalData({ s: '', ns: '', b: '', nextB: '', nextS: '', team: nextTeam || selectedMatch.teamA });
                                                                        setShowStartModal(true);
                                                                    }}>
                                                                        {(() => {
                                                                            const tIdx = targetIdx;
                                                                            const team1 = selectedMatch.innings[0]?.team || selectedMatch.teamA;
                                                                            const team2 = (team1 === selectedMatch.teamA ? selectedMatch.teamB : selectedMatch.teamA);
                                                                            if (tIdx === 0) return `Start 1st Innings (${team1})`;
                                                                            if (tIdx === 1) return `Start 2nd Innings (${team2})`;
                                                                            const soBattingTeam = selectedMatch.innings[tIdx]?.team || (tIdx % 2 === 0 ? team1 : team2);
                                                                            return `Start Super Over - ${tIdx % 2 === 0 ? '1st' : '2nd'} Innings (${soBattingTeam})`;
                                                                        })()}
                                                                    </Button>
                                                                );
                                                            })()
                                                        )}

                                                        {/* SCORING PANEL - 5 ROW LAYOUT */}
                                                        {selectedMatch.status === 'live' && selectedMatch.currentBatsmen?.length > 0 && selectedMatch.currentBowler && !isComplete && (
                                                            <div className="scoring-panel-container d-grid gap-3 justify-content-center w-100">
                                                                {selectedMatch.toss?.winner && (
                                                                    <div className="alert alert-warning text-center fw-bold py-2 mb-0 border-0 shadow-sm rounded-pill">
                                                                        🪙 Toss: {selectedMatch.toss.winner} won & elected to {selectedMatch.toss.decision} first.
                                                                    </div>
                                                                )}

                                                                {/* ROW 1 – MATCH CONTROLS */}
                                                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                                                    <Button variant="outline-primary" size="lg" className="px-3 fw-bold shadow-sm" onClick={() => setShowSquadModal(true)}>
                                                                        <i className="bi bi-people-fill me-2"></i>SQUADS
                                                                    </Button>
                                                                    <Button variant="outline-primary" size="lg" className="px-3 fw-bold shadow-sm" onClick={() => setShowDlsModal(true)}>
                                                                        <i className="bi bi-cloud-rain-fill me-2"></i>DLS
                                                                    </Button>
                                                                    <Button variant="outline-warning" size="lg" className="px-3 fw-bold shadow-sm" onClick={undoLastBall} disabled={!selectedMatch.history || selectedMatch.history.length === 0}>
                                                                        <i className="bi bi-arrow-counterclockwise me-2"></i>Reverse Last Action
                                                                    </Button>
                                                                    {selectedMatch.score?.isPaused ? (
                                                                        <Button variant="success" size="lg" className="px-3 fw-bold shadow-sm" onClick={() => handlePauseToggle()}>
                                                                            <i className="bi bi-play-fill me-2"></i>RESUME MATCH
                                                                        </Button>
                                                                    ) : (
                                                                        <Button variant="danger" size="lg" className="px-3 fw-bold shadow-sm" onClick={() => setShowPauseModal(true)}>
                                                                            <i className="bi bi-pause-fill me-2"></i>Temporarily Pause Match
                                                                        </Button>
                                                                    )}
                                                                </div>

                                                                {/* ROW 2 – PRIMARY SCORING */}
                                                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                                                    {[0, 1, 2, 3, 4, 6].map(r => (
                                                                        <Button key={r} disabled={isUpdating || selectedMatch.score?.isPaused} variant="outline-primary" size="lg" className="px-4 fw-bold shadow-sm" onClick={() => {
                                                                            if (currentInn && currentInn.overs >= limit) return toast.error(`Over limit reached!`);
                                                                            handleUpdate('runs', r);
                                                                        }}>{r} {r === 1 ? 'Run' : 'Runs'}</Button>
                                                                    ))}
                                                                    <Button variant="danger" size="lg" className="px-4 fw-bold shadow-sm" disabled={isUpdating || selectedMatch.score?.isPaused} onClick={() => {
                                                                        setWicketDetails(prev => ({ ...prev, type: 'caught', fielder: '', runs: 0, whomOut: 'striker' }));
                                                                        setShowWicketModal(true);
                                                                    }}>Wicket</Button>
                                                                </div>

                                                                {/* ROW 3 – EXTRAS */}
                                                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                                                    <Dropdown as={ButtonGroup}>
                                                                        <Button variant="outline-warning" size="lg" className="px-3 fw-bold shadow-sm" disabled={isUpdating || selectedMatch.score?.isPaused} onClick={() => {
                                                                            if (currentInn && currentInn.overs >= limit) return toast.error(`Over limit reached!`);
                                                                            handleUpdate('extra', 'w', { amount: 1 });
                                                                        }}>Wide Ball</Button>
                                                                        <Dropdown.Toggle split variant="outline-warning" id="dropdown-wide" disabled={isUpdating || selectedMatch.score?.isPaused} />
                                                                        <Dropdown.Menu className="border-0 shadow-lg p-2">
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'w', { amount: 2 })}>Wide + 1 (2 Runs)</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'w', { amount: 3 })}>Wide + 2 (3 Runs)</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'w', { amount: 5 })}>Wide + 4 (5 Runs)</Dropdown.Item>
                                                                        </Dropdown.Menu>
                                                                    </Dropdown>

                                                                    <Dropdown as={ButtonGroup}>
                                                                        <Button variant="outline-warning" size="lg" className="px-3 fw-bold shadow-sm" disabled={isUpdating || selectedMatch.score?.isPaused} onClick={() => {
                                                                            if (currentInn && currentInn.overs >= limit) return toast.error(`Over limit reached!`);
                                                                            handleUpdate('extra', 'nb', { amount: 1, isBat: false });
                                                                        }}>No Ball</Button>
                                                                        <Dropdown.Toggle split variant="outline-warning" id="dropdown-noball" disabled={isUpdating || selectedMatch.score?.isPaused} />
                                                                        <Dropdown.Menu className="border-0 shadow-lg p-3" style={{ minWidth: '250px' }}>
                                                                            <div className="fw-bold small text-muted mb-2 text-uppercase">Hit by Bat (Striker)</div>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'nb', { amount: 2, isBat: true })}>No Ball + 1 Run (2)</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'nb', { amount: 3, isBat: true })}>No Ball + 2 Runs (3)</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'nb', { amount: 5, isBat: true })}>No Ball + 4 Runs (5)</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'nb', { amount: 7, isBat: true })}>No Ball + 6 Runs (7)</Dropdown.Item>
                                                                            <Dropdown.Divider />
                                                                            <div className="fw-bold small text-muted mb-2 text-uppercase">Not Hit (Byes/Leg Byes)</div>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'nb', { amount: 2, isBat: false })}>No Ball + 1 Extra (2)</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'nb', { amount: 5, isBat: false })}>No Ball + 4 Extras (5)</Dropdown.Item>
                                                                        </Dropdown.Menu>
                                                                    </Dropdown>

                                                                    <Dropdown as={ButtonGroup}>
                                                                        <Button variant="outline-warning" size="lg" className="px-3 fw-bold text-dark shadow-sm" disabled={isUpdating || selectedMatch.score?.isPaused} onClick={() => {
                                                                            if (currentInn && currentInn.overs >= limit) return toast.error(`Over limit reached!`);
                                                                            handleUpdate('extra', 'lb', { amount: 1 });
                                                                        }}>Leg Bye</Button>
                                                                        <Dropdown.Toggle split variant="outline-warning" id="dropdown-legbye" disabled={isUpdating || selectedMatch.score?.isPaused} className="text-dark" />
                                                                        <Dropdown.Menu className="border-0 shadow-lg p-2">
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'lb', { amount: 1 })}>1 Leg Bye</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'lb', { amount: 2 })}>2 Leg Byes</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'lb', { amount: 4 })}>4 Leg Byes</Dropdown.Item>
                                                                        </Dropdown.Menu>
                                                                    </Dropdown>

                                                                    <Dropdown as={ButtonGroup}>
                                                                        <Button variant="outline-warning" size="lg" className="px-3 fw-bold text-dark shadow-sm" disabled={isUpdating || selectedMatch.score?.isPaused} onClick={() => {
                                                                            if (currentInn && currentInn.overs >= limit) return toast.error(`Over limit reached!`);
                                                                            handleUpdate('extra', 'b', { amount: 1 });
                                                                        }}>Bye</Button>
                                                                        <Dropdown.Toggle split variant="outline-warning" id="dropdown-bye" disabled={isUpdating || selectedMatch.score?.isPaused} className="text-dark" />
                                                                        <Dropdown.Menu className="border-0 shadow-lg p-2">
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'b', { amount: 1 })}>1 Bye</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'b', { amount: 2 })}>2 Byes</Dropdown.Item>
                                                                            <Dropdown.Item onClick={() => handleUpdate('extra', 'b', { amount: 4 })}>4 Byes</Dropdown.Item>
                                                                        </Dropdown.Menu>
                                                                    </Dropdown>

                                                                    <Button variant="outline-dark" size="lg" className="px-3 fw-bold shadow-sm"
                                                                        disabled={isUpdating || selectedMatch.score?.isPaused || !selectedMatch.score?.thisOver?.length}
                                                                        onClick={() => {
                                                                            if (currentInn && currentInn.overs >= limit) return toast.error(`Over limit reached!`);
                                                                            setOverthrowData({ ballType: 'normal', runsCompleted: 0, crossedOnThrow: false, resultType: 'boundary', manualRuns: 0 });
                                                                            setShowOverthrowModal(true);
                                                                        }}>⚡ Overthrow</Button>
                                                                </div>

                                                                {/* ROW 4 – PLAYER ACTIONS */}
                                                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                                                    <Button variant="outline-info" size="lg" className="px-3 fw-bold shadow-sm" disabled={isUpdating || selectedMatch.score?.isPaused} onClick={() => handleUpdate('swap_strike')}>Change Strike</Button>
                                                                    <Button variant="outline-dark" size="lg" className="px-3 fw-bold shadow-sm" disabled={isUpdating || selectedMatch.score?.isPaused} onClick={() => { setBatsmanModalType('retire'); setShowBatsmanModal(true); }}>Retire Batter</Button>
                                                                    <Button variant="outline-success" size="lg" className="px-3 fw-bold shadow-sm" disabled={isUpdating || selectedMatch.score?.isPaused} onClick={() => {
                                                                        if (selectedMatch?.score?.thisOver?.length > 0) {
                                                                            const overBalls = selectedMatch.score.thisOver;
                                                                            const legalBalls = overBalls.filter(b => !/WD|NB/i.test(b.toString())).length;
                                                                            const remaining = BALLS_PER_OVER - legalBalls;
                                                                            if (remaining > 0) {
                                                                                toast(`A bowler has been replaced due to injury. There are ${pluralize(remaining, 'Ball')} remaining in this over.`, { icon: '🩹' });
                                                                            }
                                                                        }
                                                                        setShowBowlerModal(true);
                                                                    }}>Replace Bowler Due to Injury</Button>
                                                                    {/* Free Hit Toggle moved here to maintain Row 5 as indicator only */}
                                                                    <Button variant={selectedMatch?.score?.freeHit ? "danger" : "outline-secondary"} size="lg" className="px-3 fw-bold shadow-sm" onClick={() => handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, freeHit: !selectedMatch.score.freeHit } })}>
                                                                        {selectedMatch?.score?.freeHit ? '🚀 DISABLE FREE HIT' : '🚀 ENABLE FREE HIT'}
                                                                    </Button>
                                                                </div>

                                                                {/* ROW 5 – STATE INDICATOR */}
                                                                <div className="d-flex justify-content-center mt-2">
                                                                    <div className={`px-5 py-2 rounded-pill fw-black text-uppercase shadow-sm border-2 border ${selectedMatch?.score?.freeHit ? 'bg-danger text-white border-danger animate-pulse' : 'bg-light text-muted border-secondary'}`} style={{ fontSize: '0.9rem', letterSpacing: '1px' }}>
                                                                        {selectedMatch?.score?.freeHit ? '🚀 FREE HIT ON' : '🚀 FREE HIT OFF'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                            {selectedMatch.status === 'completed' && (
                                                <div className="text-center w-100 my-4 my-md-5">
                                                    <div className="mb-5 px-4 mx-auto" style={{ width: 'fit-content' }}>
                                                        <div className="bg-primary bg-opacity-10 py-2 px-3 rounded-pill d-inline-block mb-3 border border-primary border-opacity-10">
                                                            <Form.Label className="x-small fw-black text-uppercase text-primary m-0">🥇 Man of the Match</Form.Label>
                                                        </div>
                                                        <Dropdown as={ButtonGroup} className="d-block shadow-sm rounded-4 overflow-hidden border-2 border-primary border-opacity-10">
                                                            <Dropdown.Toggle
                                                                variant="white"
                                                                size="lg"
                                                                className="w-100 fw-black py-3 px-5 border-0"
                                                                style={{ fontSize: '1.25rem', minWidth: '320px', letterSpacing: '0.01em' }}
                                                            >
                                                                {selectedMatch.manOfTheMatch ? selectedMatch.manOfTheMatch.toUpperCase() : '-- CHOOSE PLAYER --'}
                                                            </Dropdown.Toggle>

                                                            <Dropdown.Menu className="border-0 shadow-lg rounded-4 p-2" style={{ maxHeight: '400px', overflowY: 'auto', minWidth: '100%' }}>
                                                                <Dropdown.Header className="fw-black text-primary text-uppercase x-small py-2">{selectedMatch.teamA}</Dropdown.Header>
                                                                {squadA.filter(p => p).map(p => (
                                                                    <Dropdown.Item
                                                                        key={`A_${p}`}
                                                                        onClick={() => handleUpdate('manual', { ...selectedMatch, manOfTheMatch: p })}
                                                                        active={selectedMatch.manOfTheMatch === p}
                                                                        className="rounded-3 fw-bold py-2 mb-1"
                                                                    >
                                                                        {p}
                                                                    </Dropdown.Item>
                                                                ))}
                                                                <Dropdown.Divider />
                                                                <Dropdown.Header className="fw-black text-primary text-uppercase x-small py-2">{selectedMatch.teamB}</Dropdown.Header>
                                                                {squadB.filter(p => p).map(p => (
                                                                    <Dropdown.Item
                                                                        key={`B_${p}`}
                                                                        onClick={() => handleUpdate('manual', { ...selectedMatch, manOfTheMatch: p })}
                                                                        active={selectedMatch.manOfTheMatch === p}
                                                                        className="rounded-3 fw-bold py-2 mb-1"
                                                                    >
                                                                        {p}
                                                                    </Dropdown.Item>
                                                                ))}
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                    <hr className="my-5 opacity-10" />
                                                    <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center px-4">
                                                        <Button variant="outline-primary" size="lg" className="px-5 py-3 fw-bold rounded-pill shadow-sm" onClick={handleDownloadPDF}>
                                                            <i className="bi bi-file-earmark-pdf-fill me-2"></i>DOWNLOAD PDF
                                                        </Button>
                                                        <Button variant="danger" size="lg" className="px-5 py-3 fw-bold rounded-pill shadow-sm" onClick={(e) => handleDelete(e, selectedMatch._id || selectedMatch.id)}>
                                                            <i className="bi bi-trash3-fill me-2"></i>DELETE MATCH
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div >
                                        {
                                            selectedMatch.status === 'live' && (
                                                <Row className="g-3 mb-4">
                                                    <Col md={6}>
                                                        <Card className="border-0 bg-info bg-opacity-10 shadow-sm">
                                                            <Card.Body className="py-3 px-4">
                                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                                    <small className="text-info fw-bold text-uppercase d-block mb-1">Batting</small>
                                                                    <Button variant="link" size="sm" className="text-info p-0 text-decoration-none fw-bold" onClick={() => handleUpdate('swap_strike')}>
                                                                        ⇄ SWAP STRIKE
                                                                    </Button>
                                                                </div>
                                                                <div className="d-flex justify-content-between">
                                                                    <div>
                                                                        <div className="fw-bold fs-5">🏏 {striker || '...'}*</div>
                                                                        <div className="text-secondary small">{nonStriker || '...'}</div>
                                                                    </div>
                                                                    <div className="text-end">
                                                                        {selectedMatch.currentBatsmen?.map(b => (
                                                                            <div key={b.name} className={`small fw-bold ${b.onStrike ? 'text-primary' : 'text-muted'}`}>
                                                                                {pluralize(b.runs, 'Run')} ({pluralize(b.balls, 'Ball')})
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </Card.Body>
                                                        </Card>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Card className="border-0 bg-success bg-opacity-10 shadow-sm">
                                                            <Card.Body className="py-3 px-4">
                                                                <small className="text-success fw-bold text-uppercase d-block mb-1">Bowling</small>
                                                                <div className="d-flex justify-content-between align-items-center">
                                                                    <div className="fw-bold fs-5">⚾ {bowler || '...'}</div>
                                                                    <div className="text-end text-success fw-bold">
                                                                        {(() => {
                                                                            const battingIdx = selectedMatch.innings.length > 2 ? selectedMatch.innings.length - 1 : (selectedMatch.score.battingTeam === selectedMatch.teamB ? 1 : 0);
                                                                            const bowlingIdx = battingIdx % 2 === 0 ? battingIdx + 1 : battingIdx - 1;
                                                                            const bStats = selectedMatch.innings[bowlingIdx]?.bowling.find(p => p.player === bowler);
                                                                            if (!bStats) return `0 ${pluralize(0, 'Over')}`;
                                                                            return `${pluralize(bStats.overs, 'Over')} | ${pluralize(bStats.runs, 'Run')} | ${pluralize(bStats.wickets, 'Wicket')}`;
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                                {selectedMatch.score.thisOver && selectedMatch.score.thisOver.length > 0 && (
                                                                    <div className="mt-3">
                                                                        <div className="small fw-bold text-muted text-uppercase mb-2">This Over</div>
                                                                        <div className="d-flex gap-2">
                                                                            {selectedMatch.score.thisOver.map((ball, idx) => {
                                                                                const bStr = ball.toString().toUpperCase();
                                                                                const isWicket = bStr.startsWith('W') || bStr === 'OUT';
                                                                                const isExtra = bStr.startsWith('WD') || bStr.startsWith('NB') || bStr.startsWith('LB') || bStr.startsWith('B');
                                                                                const isBound = bStr === '4' || bStr === '6';

                                                                                let bgClass = 'bg-white border';
                                                                                if (isWicket) bgClass = 'bg-danger text-white';
                                                                                else if (isBound) bgClass = 'bg-success text-white';
                                                                                else if (isExtra) bgClass = 'bg-warning text-dark';

                                                                                return (
                                                                                    <div key={idx} className={`rounded-circle d-flex align-items-center justify-content-center fw-bold small ${bgClass}`} style={{ width: '25px', height: '25px', fontSize: '10px' }}>
                                                                                        {ball}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Card.Body>
                                                        </Card>
                                                    </Col>
                                                </Row>
                                            )
                                        }

                                        {/* Batting Summary Table */}
                                        {
                                            selectedMatch.status === 'live' && (
                                                <Card className="border-0 shadow-sm mt-0 mb-4 overflow-hidden">
                                                    <Card.Header className="bg-primary text-white py-2 small fw-bold text-uppercase d-flex justify-content-between align-items-center">
                                                        <span><i className="bi bi-person-fill me-2"></i>Batting Summary: {selectedMatch.score.battingTeam}</span>
                                                        <Badge bg="white" text="primary" className="x-small">CRR: {getCRR()}</Badge>
                                                    </Card.Header>
                                                    <Table hover responsive size="sm" className="mb-0">
                                                        <thead className="bg-light x-small text-uppercase">
                                                            <tr>
                                                                <th className="ps-3">Batter</th>
                                                                <th className="text-center">Status</th>
                                                                <th className="text-center">R</th>
                                                                <th className="text-center">B</th>
                                                                <th className="text-center">SR</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="small">
                                                            {(() => {
                                                                const bTeam = selectedMatch.score.battingTeam?.trim();
                                                                const reversed = [...selectedMatch.innings].map((inn, i) => ({ ...inn, idx: i })).reverse();
                                                                const currentInnings = reversed.find(inn => inn.team?.trim().toLowerCase() === bTeam?.toLowerCase());

                                                                if (!currentInnings || !currentInnings.batting || currentInnings.batting.length === 0) {
                                                                    return <tr><td colSpan={5} className="text-center py-2 text-muted">No batting data yet</td></tr>;
                                                                }
                                                                return currentInnings.batting.map((b, i) => (
                                                                    <tr key={i} className={b.onStrike ? 'bg-primary bg-opacity-10' : ''}>
                                                                        <td className="ps-3 fw-bold">{toCamelCase(b.player)}{b.onStrike ? '*' : ''}</td>
                                                                        <td className="text-center small text-muted text-truncate" style={{ maxWidth: '100px' }}>{b.status}</td>
                                                                        <td className="text-center fw-bold">{b.runs}</td>
                                                                        <td className="text-center">{b.balls}</td>
                                                                        <td className="text-center text-muted">{b.strikeRate}</td>
                                                                    </tr>
                                                                ));
                                                            })()}
                                                        </tbody>
                                                    </Table>
                                                </Card>
                                            )
                                        }

                                        {/* Bowling Summary Table */}
                                        {
                                            selectedMatch.status === 'live' && (
                                                <Card className="border-0 shadow-sm mt-0 mb-4 overflow-hidden">
                                                    <Card.Header className="bg-dark text-white py-2 small fw-bold text-uppercase">
                                                        <i className="bi bi-bullseye me-2"></i>Bowling Summary: {selectedMatch.innings[selectedMatch.score.battingTeam === selectedMatch.teamA ? (selectedMatch.innings.length > 2 ? 3 : 1) : (selectedMatch.innings.length > 2 ? 2 : 0)]?.team || 'N/A'}
                                                    </Card.Header>
                                                    <Table hover responsive size="sm" className="mb-0">
                                                        <thead className="bg-light x-small text-uppercase">
                                                            <tr>
                                                                <th className="ps-3">Bowler</th>
                                                                <th className="text-center">O</th>
                                                                <th className="text-center">M</th>
                                                                <th className="text-center">R</th>
                                                                <th className="text-center">W</th>
                                                                <th className="text-center">ECON</th>
                                                                <th className="text-center">0s</th>
                                                                <th className="text-center">WD</th>
                                                                <th className="text-center">NB</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="small">
                                                            {(() => {
                                                                const bTeam = selectedMatch.score.battingTeam;
                                                                if (!bTeam) return <tr><td colSpan={9} className="text-center py-2 text-muted">Initialize innings first</td></tr>;

                                                                let battingIdx;
                                                                if (selectedMatch.innings.length > 2) {
                                                                    battingIdx = selectedMatch.innings.length - 1;
                                                                } else {
                                                                    battingIdx = (bTeam.trim().toLowerCase() === selectedMatch.teamB.trim().toLowerCase()) ? 1 : 0;
                                                                }

                                                                const bowlingIdx = battingIdx % 2 === 0 ? battingIdx + 1 : battingIdx - 1;
                                                                const bowlingInnings = selectedMatch.innings[bowlingIdx];
                                                                if (!bowlingInnings || !bowlingInnings.bowling || bowlingInnings.bowling.length === 0) {
                                                                    return <tr><td colSpan={9} className="text-center py-2 text-muted">No bowling data yet</td></tr>;
                                                                }
                                                                return bowlingInnings.bowling.map((b, i) => (
                                                                    <tr key={i}>
                                                                        <td className="ps-3 fw-bold">{toCamelCase(b.player)}</td>
                                                                        <td className="text-center">{b.overs}</td>
                                                                        <td className="text-center">{b.maidens || 0}</td>
                                                                        <td className="text-center">{b.runs}</td>
                                                                        <td className="text-center fw-bold text-danger">{b.wickets}</td>
                                                                        <td className="text-center text-muted">{b.economy}</td>
                                                                        <td className="text-center">{b.dots || 0}</td>
                                                                        <td className="text-center">{b.wides || 0}</td>
                                                                        <td className="text-center">{b.noBalls || 0}</td>
                                                                    </tr>
                                                                ));
                                                            })()}
                                                        </tbody>
                                                    </Table>
                                                </Card>
                                            )
                                        }

                                        <details className="mt-4 border rounded-3 overflow-hidden">
                                            <summary className="btn btn-sm btn-light w-100 text-start fw-black py-3 px-4 border-0 rounded-0 d-flex justify-content-between align-items-center">
                                                <span><i className="bi bi-wrench-adjustable me-2 text-primary"></i> ADVANCED CORRECTION PANEL</span>
                                                <i className="bi bi-chevron-down small"></i>
                                            </summary>
                                            <div className="bg-white p-4 border-top">
                                                <Alert variant="info" className="small py-2 border-0 shadow-sm mb-4">
                                                    <i className="bi bi-info-circle-fill me-2"></i> Use this panel ONLY for manual scoring corrections. All changes are synced in real-time.
                                                </Alert>
                                                <Row className="g-3">
                                                    <Col md={4}>
                                                        <Form.Label className="x-small fw-black text-uppercase text-muted">Runs Scored</Form.Label>
                                                        <Form.Control size="sm" className="fw-bold" type="number" min="0" value={selectedMatch.score.runs} onChange={e => handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, runs: Math.max(0, parseInt(e.target.value) || 0) } })} />
                                                    </Col>
                                                    <Col md={4}>
                                                        <Form.Label className="x-small fw-black text-uppercase text-muted">Wickets Lost</Form.Label>
                                                        <Form.Control size="sm" className="fw-bold" type="number" min="0" max="10" value={selectedMatch.score.wickets} onChange={e => handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, wickets: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)) } })} />
                                                    </Col>
                                                    <Col md={4}>
                                                        <Form.Label className="x-small fw-black text-uppercase text-muted">Overs Bowled</Form.Label>
                                                        <Form.Control size="sm" className="fw-bold" type="number" step="0.1" min="0" max={selectedMatch.totalOvers} value={selectedMatch.score.overs} onChange={e => handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, overs: Math.min(selectedMatch.totalOvers, Math.max(0, parseFloat(e.target.value) || 0)) } })} />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Label className="x-small fw-black text-uppercase text-muted">Match Title Override</Form.Label>
                                                        <Form.Control size="sm" value={selectedMatch.title} onChange={e => handleUpdate('manual', { ...selectedMatch, title: e.target.value })} placeholder="Match Title" />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Label className="x-small fw-black text-uppercase text-muted">Venue Override</Form.Label>
                                                        <Form.Control size="sm" value={selectedMatch.venue} onChange={e => handleUpdate('manual', { ...selectedMatch, venue: e.target.value })} placeholder="Match Venue" />
                                                    </Col>

                                                    <Col md={4}>
                                                        <Form.Label className="x-small fw-black text-uppercase text-muted">Striker</Form.Label>
                                                        <Form.Select size="sm" value={striker} onChange={e => {
                                                            const val = e.target.value;
                                                            setStriker(val);
                                                            const cb = [...(selectedMatch.currentBatsmen || [])];
                                                            if (cb.length > 0) cb[0] = { ...cb[0], name: val };
                                                            else cb.push({ name: val, onStrike: true, runs: 0, balls: 0 });
                                                            handleUpdate('manual', { ...selectedMatch, currentBatsmen: cb });
                                                        }}>
                                                            <option value="">Select</option>
                                                            {(selectedMatch.score.battingTeam === selectedMatch.teamA ? squadA : squadB).map(p => <option key={p} value={p}>{p}</option>)}
                                                        </Form.Select>
                                                    </Col>
                                                    <Col md={4}>
                                                        <Form.Label className="x-small fw-black text-uppercase text-muted">Non-Striker</Form.Label>
                                                        <Form.Select size="sm" value={nonStriker} onChange={e => {
                                                            const val = e.target.value;
                                                            setNonStriker(val);
                                                            const cb = [...(selectedMatch.currentBatsmen || [])];
                                                            if (cb.length > 1) cb[1] = { ...cb[1], name: val };
                                                            else if (cb.length === 1) cb.push({ name: val, onStrike: false, runs: 0, balls: 0 });
                                                            else {
                                                                cb.push({ name: '', onStrike: true, runs: 0, balls: 0 });
                                                                cb.push({ name: val, onStrike: false, runs: 0, balls: 0 });
                                                            }
                                                            handleUpdate('manual', { ...selectedMatch, currentBatsmen: cb });
                                                        }}>
                                                            <option value="">Select</option>
                                                            {(selectedMatch.score.battingTeam === selectedMatch.teamA ? squadA : squadB).map(p => <option key={p} value={p}>{p}</option>)}
                                                        </Form.Select>
                                                    </Col>
                                                    <Col md={4}>
                                                        <Form.Label className="x-small fw-black text-uppercase text-muted">Current Bowler</Form.Label>
                                                        <Form.Select size="sm" value={bowler} onChange={e => { setBowler(e.target.value); handleUpdate('manual', { ...selectedMatch, currentBowler: e.target.value }); }}>
                                                            <option value="">Select</option>
                                                            {(selectedMatch.score.battingTeam === selectedMatch.teamA ? squadB : squadA).map(p => <option key={p} value={p}>{p}</option>)}
                                                        </Form.Select>
                                                    </Col>

                                                    <Col md={12} className="pt-3">
                                                        <hr className="opacity-10" />
                                                        <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                                            <i className="bi bi-award-fill text-warning"></i> MAN OF THE MATCH
                                                        </h6>
                                                        <Row className="g-3">
                                                            <Col md={12}>
                                                                <Form.Label className="x-small fw-black text-uppercase text-muted">Select Player</Form.Label>
                                                                <Form.Select size="sm" value={selectedMatch.manOfTheMatch || ''} onChange={e => handleUpdate('manual', { ...selectedMatch, manOfTheMatch: e.target.value })}>
                                                                    <option value="">-- None Selected --</option>
                                                                    <optgroup label={selectedMatch.teamA}>
                                                                        {squadA.map(p => <option key={`A_${p}`} value={p}>{p}</option>)}
                                                                    </optgroup>
                                                                    <optgroup label={selectedMatch.teamB}>
                                                                        {squadB.map(p => <option key={`B_${p}`} value={p}>{p}</option>)}
                                                                    </optgroup>
                                                                </Form.Select>
                                                                <small className="text-muted d-block mt-1">Player of the Match is a subjective choice selected by the admin.</small>
                                                            </Col>
                                                        </Row>
                                                    </Col>

                                                    <Col md={12} className="pt-3">
                                                        <hr className="opacity-10" />
                                                        <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                                            <i className="bi bi-calendar-event text-primary"></i> MATCH DATE & TIME OVERRIDE
                                                        </h6>
                                                        <Row className="g-3">
                                                            <Col md={4}>
                                                                <Form.Label className="x-small fw-black text-uppercase text-muted">Date</Form.Label>
                                                                <Form.Control size="sm" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                                                            </Col>
                                                            <Col md={4}>
                                                                <Form.Label className="x-small fw-black text-uppercase text-muted">Time (Local)</Form.Label>
                                                                <Form.Control
                                                                    size="sm"
                                                                    type="time"
                                                                    value={parseTime12to24(editTime) || ''}
                                                                    onKeyDown={(e) => e.preventDefault()}
                                                                    onClick={(e) => e.target.showPicker?.()}
                                                                    onFocus={(e) => e.target.showPicker?.()}
                                                                    onChange={e => {
                                                                        const val24 = e.target.value;
                                                                        if (!val24) return;
                                                                        const [h, m] = val24.split(':');
                                                                        const date = new Date();
                                                                        date.setHours(parseInt(h), parseInt(m));
                                                                        setEditTime(formatTime24to12(date));
                                                                    }}
                                                                />
                                                            </Col>
                                                            <Col md={4} className="d-flex align-items-end">
                                                                <Button variant="primary" size="sm" className="w-100 fw-bold" onClick={handleSaveDateTime}>SAVE DATE & TIME</Button>
                                                            </Col>
                                                        </Row>
                                                    </Col>

                                                    <Col md={12} className="pt-4">
                                                        <div className="d-flex flex-wrap gap-2">
                                                            <Button variant="danger" size="sm" className="fw-black flex-grow-1" onClick={() => { if (window.confirm("ARE YOU SURE? This will end the current innings manually.")) handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, overs: selectedMatch.totalOvers } }); }}>
                                                                FORCE END INNINGS
                                                            </Button>
                                                            <Button variant="dark" size="sm" className="fw-black flex-grow-1" onClick={() => handleUpdate('manual', { ...selectedMatch, score: { ...selectedMatch.score, thisOver: [] } })}>
                                                                CLEAR OVER LOG
                                                            </Button>
                                                            <Button variant="outline-dark" size="sm" className="fw-black flex-grow-1" onClick={() => handleUpdate('manual', { ...selectedMatch, history: [] })}>
                                                                PURGE ALL HISTORY
                                                            </Button>
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </div>
                                        </details>
                                    </Card.Body>
                                </Card>
                            ) : (<div className="text-center py-5 bg-white rounded-4 shadow-sm d-flex flex-column align-items-center border"><Spinner animation="grow" variant="primary" className="mb-4" /><h4>Ready to Score?</h4><p className="text-muted">Select a match to start updates.</p></div>)
                            }
                        </Col >
                    </Row >
                </div >
            </Container >

            {/* Pause Modal */}
            < Modal show={showPauseModal} onHide={() => { setShowPauseModal(false); setPauseReason(''); setCustomPauseReason(''); }} centered >
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title className="fw-black text-uppercase letter-spacing-2">Pause Match</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">Select Pause Reason <span className="text-danger">*</span></Form.Label>
                        <Form.Select value={pauseReason} onChange={e => setPauseReason(e.target.value)} required>
                            <option value="">Select a reason...</option>
                            {pauseOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </Form.Select>
                    </Form.Group>
                    {pauseReason === 'Other' && (
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Specify Details</Form.Label>
                            <Form.Control type="text" placeholder="Enter reason manually" value={customPauseReason} onChange={e => setCustomPauseReason(e.target.value)} />
                        </Form.Group>
                    )}
                    <Button variant="danger" className="w-100 fw-bold mt-2" onClick={() => handlePauseToggle()}>PAUSE MATCH</Button>
                </Modal.Body>
            </Modal >

            {/* Super Over Modal */}
            < Modal show={showSuperOverModal} onHide={() => { }} centered backdrop="static" >
                <Modal.Header className="bg-primary text-white">
                    <Modal.Title className="fw-black text-uppercase letter-spacing-2">Match Tied! Tie Break Needed</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 text-center">
                    <i className="bi bi-fire text-danger display-1 mb-3"></i>
                    <h4 className="fw-black mb-3 text-uppercase">It's a Super Over!</h4>
                    <p className="text-muted mb-4">
                        Both teams have scored equal runs. According to rules, a Super Over (one-over eliminator) should be played to determine the winner.
                    </p>
                    <div className="bg-light p-3 rounded-4 mb-4 text-start small">
                        <div className="mb-3">
                            <label className="fw-bold small text-uppercase text-muted mb-2">Who bats first in Super Over?</label>
                            <Form.Select
                                size="lg"
                                className="rounded-3 border-0 shadow-sm fw-bold"
                                value={superOverBattingTeam}
                                onChange={e => setSuperOverBattingTeam(e.target.value)}
                            >
                                <option value={selectedMatch?.teamA}>{selectedMatch?.teamA}</option>
                                <option value={selectedMatch?.teamB}>{selectedMatch?.teamB}</option>
                            </Form.Select>
                        </div>
                        <ul className="mb-0 text-muted">
                            <li><strong>Format:</strong> 1 over (6 balls) per side.</li>
                            <li><strong>Wickets:</strong> 2 wickets per team in SO.</li>
                            <li><strong>Repeated Ties:</strong> Subsequent SO will be played if needed.</li>
                        </ul>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 justify-content-center pb-4">
                    <Button variant="outline-secondary" className="px-4 fw-bold" onClick={handleDeclareTie}>
                        DECLARE DRAW / TIE
                    </Button>
                    <Button variant="primary" className="px-4 fw-black premium-btn shadow" onClick={handleStartSuperOver}>
                        START SUPER OVER
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showOverthrowModal} onHide={() => setShowOverthrowModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title className="small fw-bold text-uppercase">Record Overthrow</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-uppercase text-muted">Ball Type</Form.Label>
                            <Form.Select
                                className="rounded-3 border-0 shadow-sm"
                                value={overthrowData.ballType}
                                onChange={(e) => setOverthrowData({ ...overthrowData, ballType: e.target.value })}
                            >
                                <option value="normal">Normal Ball</option>
                                <option value="w">Wide Ball</option>
                                <option value="nb">No Ball (Hit by Bat)</option>
                                <option value="nb_extra">No Ball (Extras only)</option>
                                <option value="b">Bye</option>
                                <option value="lb">Leg Bye</option>
                            </Form.Select>
                        </Form.Group>

                        <Row className="mb-4">
                            <Col xs={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold text-uppercase text-muted">Runs Completed</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        className="rounded-3 border-0 shadow-sm"
                                        value={overthrowData.runsCompleted}
                                        onChange={(e) => setOverthrowData({ ...overthrowData, runsCompleted: parseInt(e.target.value) || 0 })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={6} className="d-flex align-items-end">
                                <Form.Check
                                    type="switch"
                                    label="Crossed on Throw"
                                    className="small fw-bold text-muted"
                                    checked={overthrowData.crossedOnThrow}
                                    onChange={(e) => setOverthrowData({ ...overthrowData, crossedOnThrow: e.target.checked })}
                                />
                            </Col>
                        </Row>

                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-bold text-uppercase text-muted">Overthrow Result</Form.Label>
                            <div className="d-flex gap-4 p-3 bg-light rounded-3">
                                <Form.Check
                                    type="radio"
                                    label="Boundary (+4)"
                                    name="ovResult"
                                    className="fw-bold"
                                    checked={overthrowData.resultType === 'boundary'}
                                    onChange={() => setOverthrowData({ ...overthrowData, resultType: 'boundary' })}
                                />
                                <Form.Check
                                    type="radio"
                                    label="Manual Runs"
                                    name="ovResult"
                                    className="fw-bold"
                                    checked={overthrowData.resultType === 'manual'}
                                    onChange={() => setOverthrowData({ ...overthrowData, resultType: 'manual' })}
                                />
                            </div>
                        </Form.Group>

                        {overthrowData.resultType === 'manual' && (
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-uppercase text-muted">Extra Runs from Overthrow</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0"
                                    className="rounded-3 border-0 shadow-sm"
                                    value={overthrowData.manualRuns}
                                    onChange={(e) => setOverthrowData({ ...overthrowData, manualRuns: parseInt(e.target.value) || 0 })}
                                />
                            </Form.Group>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0 justify-content-center pb-4">
                    <Button variant="outline-secondary" className="px-4 fw-bold" onClick={() => setShowOverthrowModal(false)}>Cancel</Button>
                    <Button variant="primary" className="px-4 fw-black premium-btn shadow" onClick={() => {
                        handleUpdate('overthrow', overthrowData);
                        setShowOverthrowModal(false);
                    }}>Record Overthrow</Button>
                </Modal.Footer>
            </Modal>

        </>
    );
};

export default AdminDashboard;
