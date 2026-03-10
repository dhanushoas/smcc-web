const fs = require('fs');
const file = './src/pages/FullScorecard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `const [match, setMatch] = useState(null);`,
    `const [match, setMatch] = useState(null);\n    const [seriesData, setSeriesData] = useState(null);`
);

content = content.replace(
    `            const res = await axios.get(\`\${API_URL}/api/matches/\${id}\`);\n            setMatch(res.data);\n            if (res.data.status === 'live' || res.data.status === 'completed') {`,
    `            const res = await axios.get(\`\${API_URL}/api/matches/\${id}\`);
            const matchData = res.data;
            setMatch(matchData);

            if (matchData.competitionType === 'series' && matchData.seriesId) {
                try {
                    const sRes = await axios.get(\`\${API_URL}/api/series/\${matchData.seriesId}\`);
                    if (sRes.data.success) {
                        setSeriesData(sRes.data.data);
                    }
                } catch (e) {
                    console.error("Error fetching series", e);
                }
            }

            if (res.data.status === 'live' || res.data.status === 'completed') {`
);

content = content.replace(
    `        const exportedDate = new Date();\n        const exportStr = \`EXPORTED: \${exportedDate.toLocaleDateString().toUpperCase()} \${exportedDate.toLocaleTimeString().toUpperCase()}\`;\n        doc.text(exportStr, pageWidth / 2, currentY, { align: 'center' });\n        currentY += 6; // 16px before divider`,
    `        const exportedDate = new Date();
        const exportStr = \`EXPORTED: \${exportedDate.toLocaleDateString().toUpperCase()} \${exportedDate.toLocaleTimeString().toUpperCase()}\`;
        doc.text(exportStr, pageWidth / 2, currentY, { align: 'center' });
        currentY += 6; // 16px before divider`
);

content = content.replace(
    `        doc.text(\`\${match.teamA.toUpperCase()} VS \${match.teamB.toUpperCase()} - FULL SCORECARD\`, pageWidth / 2, currentY, { align: 'center' });\n        currentY += 5; // 8px after title`,
    `        doc.text(\`\${match.teamA.toUpperCase()} VS \${match.teamB.toUpperCase()}\`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 5;

        // Dynamic Series Parsing in PDF
        let pdfSeriesStatusStr = '';
        if (match.competitionType === 'series' && match.matchNumber) {
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(\`Match \${match.matchNumber} \${seriesData ? 'of ' + seriesData.matches.length : ''}\`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 5;

            if (seriesData && seriesData.matches) {
                let s_teamAWins = 0;
                let s_teamBWins = 0;
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
                            if (w.toLowerCase() === (m.teamA || '').toLowerCase()) s_teamAWins++;
                            else if (w.toLowerCase() === (m.teamB || '').toLowerCase()) s_teamBWins++;
                        }
                    }
                });
                
                if (s_teamAWins === s_teamBWins) {
                    pdfSeriesStatusStr = \`Tied \${s_teamAWins} - \${s_teamBWins}\`;
                } else {
                    const leader = s_teamAWins > s_teamBWins ? (seriesData.matches[0]?.teamA || 'Team A') : (seriesData.matches[0]?.teamB || 'Team B');
                    pdfSeriesStatusStr = \`\${leader} leads \${Math.max(s_teamAWins, s_teamBWins)}-\${Math.min(s_teamAWins, s_teamBWins)}\`;
                    const totalReq = Math.floor(seriesData.matches.length / 2) + 1;
                    if (s_teamAWins >= totalReq || s_teamBWins >= totalReq) {
                        pdfSeriesStatusStr = \`\${leader} won the series \${Math.max(s_teamAWins, s_teamBWins)}-\${Math.min(s_teamAWins, s_teamBWins)}\`;
                    }
                }
                
                doc.setFontSize(11);
                doc.setTextColor(0, 146, 112);
                doc.text(\`Series Status: \${pdfSeriesStatusStr}\`, pageWidth / 2, currentY, { align: 'center' });
                currentY += 6;
            }
        }`
);

fs.writeFileSync(file, content);
