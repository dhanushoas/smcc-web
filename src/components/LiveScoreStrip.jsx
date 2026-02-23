import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import API_URL from '../utils/api';

const socket = io(API_URL);

const LiveScoreStrip = () => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);

    const fetchMatches = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/matches`);
            setMatches(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error fetching matches in strip:", err);
        }
    };

    useEffect(() => {
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
        });

        socket.on('matchDeleted', (matchId) => {
            setMatches(prev => (Array.isArray(prev) ? prev : []).filter(m => m._id !== matchId && m.id !== matchId));
        });

        return () => {
            socket.off('matchUpdate');
            socket.off('matchDeleted');
        };
    }, []);

    const liveAndCompleted = matches.filter(m => m.status === 'live' || m.status === 'completed' || m.status === 'upcoming');

    if (liveAndCompleted.length === 0) return null;

    return (
        <div className="bg-white border-bottom shadow-sm overflow-hidden" style={{ minHeight: '60px', zIndex: 1050 }}>
            <Container fluid className="px-lg-5">
                <div className="d-flex align-items-center gap-3 overflow-auto no-scrollbar py-2 justify-content-lg-center">
                    {liveAndCompleted.map((match, idx) => (
                        <div
                            key={idx}
                            className="border-end pe-3 flex-shrink-0"
                            style={{ minWidth: '220px', cursor: 'pointer' }}
                            onClick={() => navigate(`/match/${match._id || match.id}`)}
                        >
                            <div className="x-small fw-black text-uppercase text-muted mb-1 d-flex justify-content-between">
                                <span>{match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}</span>
                                {match.status === 'live' && <span className="text-danger animate-pulse">●</span>}
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className={`small fw-bold ${match.winner === match.teamA ? 'text-dark' : (match.status === 'completed' ? 'text-muted' : 'text-dark')}`}>{match.teamA}</span>
                                <span className="small fw-black">
                                    {(match.status === 'live' || match.status === 'completed') ? (match.innings?.[0]?.runs || 0) + '/' + (match.innings?.[0]?.wickets || 0) : ''}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className={`small fw-bold ${match.winner === match.teamB ? 'text-dark' : (match.status === 'completed' ? 'text-muted' : 'text-dark')}`}>{match.teamB}</span>
                                <span className="small fw-black">
                                    {(match.status === 'live' || match.status === 'completed') ? (match.innings?.[1]?.runs || 0) + '/' + (match.innings?.[1]?.wickets || 0) : ''}
                                </span>
                            </div>
                            <div className="x-small text-primary fw-bold text-truncate" style={{ maxWidth: '200px' }}>
                                {match.status === 'completed' ? (match.winner ? `${match.winner} won` : 'Match Drawn') : (match.toss?.winner ? 'Toss: ' + match.toss.winner + ' opts to ' + match.toss.decision : 'Upcoming')}
                            </div>
                        </div>
                    ))}
                </div>
            </Container>
        </div>
    );
};

export default LiveScoreStrip;
