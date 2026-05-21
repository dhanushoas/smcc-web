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

export const oversToBalls = (overs) => {
    if (typeof overs === 'number') {
        const whole = Math.floor(overs);
        const balls = Math.round((overs - whole) * 10);
        return (whole * 6) + balls;
    }
    const ovStr = overs?.toString() || '0.0';
    const parts = ovStr.split('.');
    const whole = parseInt(parts[0]) || 0;
    const balls = parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
    return (whole * 6) + balls;
};

export const ballsToOvers = (totalBalls) => {
    const whole = Math.floor(totalBalls / 6);
    const balls = totalBalls % 6;
    return parseFloat(`${whole}.${balls}`);
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

export const formatMatchDateTime = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isSameDay = (d1, d2) => 
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toLowerCase();

    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateStr = date.toLocaleDateString('en-US', dateOptions).toUpperCase();

    if (isSameDay(date, today)) {
        return `TODAY • ${timeStr}`;
    } else if (isSameDay(date, tomorrow)) {
        return `TOMORROW • ${timeStr}`;
    } else {
        return `${dateStr} • ${timeStr}`;
    }
};

export const formatMatchDateSingleLine = (dateInput, venueInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;

    const timeStr = `${hours}.${minutes} ${ampm}`;
    const venueStr = venueInput || 'TBA';

    const titleCaseVenue = venueStr.split(' ').map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');

    return `Date : ${day} ${month} ${year} • ${timeStr} | Venue : ${titleCaseVenue}`;
};
