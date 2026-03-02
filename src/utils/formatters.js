export const toCamelCase = (text) => {
    if (!text) return '';
    return text.toString().trim().split(' ').map(word => {
        if (!word) return '';
        if (word.length === 1) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
};

export const pluralize = (count, singular, plural) => {
    return count === 1 ? `${count} ${singular}` : `${count} ${plural || singular + 's'}`;
};
export const formatTime = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    // Get formatted time like "1:00 PM"
    const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    // ... (existing code)
    // Convert to "1.00 pm"
    return timeStr.replace(':', '.').toLowerCase();
};

export const getBallDisplay = (ball) => {
    if (ball === null || ball === undefined) return '';
    if (typeof ball === 'object') {
        if (ball.isWide) return `Wide Ball${ball.wideRuns > 0 ? ` (${ball.wideRuns} Runs)` : ''}`;
        if (ball.isNoBall) return `No Ball${ball.runs > 0 ? ` (${ball.runs} Runs)` : ''}`;
        if (ball.isWicket) return `Wicket${ball.runs > 0 ? ` (${ball.runs} Runs)` : ''}`;
        return ball.runs.toString();
    }
    const bs = ball.toString().toUpperCase();
    if (bs.startsWith('WD')) return `Wide Ball${bs.slice(2) ? ` (${bs.slice(2)} Runs)` : ''}`;
    if (bs.startsWith('NB')) return `No Ball${bs.slice(2) ? ` (${bs.slice(2)} Runs)` : ''}`;
    if (bs.startsWith('LB')) return `Leg Bye${bs.slice(2) ? ` (${bs.slice(2)} Runs)` : ''}`;
    if (bs.startsWith('B') && !isNaN(bs.slice(1))) return `Bye${bs.slice(1) ? ` (${bs.slice(1)} Runs)` : ''}`;
    if (bs.startsWith('W') && bs !== 'WICKET') return `Wicket${bs.slice(1) ? ` (${bs.slice(1)} Runs)` : ''}`;
    if (bs === 'OUT') return 'Wicket';
    return bs;
};
