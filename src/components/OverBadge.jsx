import React from 'react';

const OverBadge = ({ over, ball, isMatchCompleted }) => {
    // 5️⃣ Validation rules (strict integer bounds)
    const validOver = Math.max(0, parseInt(over, 10) || 0);
    const validBall = Math.max(0, Math.min(5, parseInt(ball, 10) || 0));

    // 3️⃣ Dynamic color system
    let bgColorClass = '';
    let textColorClass = '';
    let accentColorClass = '';

    if (isMatchCompleted) {
        bgColorClass = 'bg-gray-200 dark:bg-gray-700';
        textColorClass = 'text-gray-800 dark:text-gray-300';
        accentColorClass = 'text-gray-500 dark:text-gray-400';
    } else if (validOver < 6) {
        // Powerplay (Overs 0-5.x)
        bgColorClass = 'bg-teal-100 dark:bg-teal-900/40';
        textColorClass = 'text-teal-900 dark:text-teal-100';
        accentColorClass = 'text-teal-600 dark:text-teal-300';
    } else if (validOver >= 6 && validOver < 15) {
        // Middle Overs (Overs 6-14.x)
        bgColorClass = 'bg-amber-100 dark:bg-amber-900/40';
        textColorClass = 'text-amber-900 dark:text-amber-100';
        accentColorClass = 'text-amber-600 dark:text-amber-400';
    } else {
        // Death Overs (Overs 15+)
        bgColorClass = 'bg-red-100 dark:bg-red-900/40';
        textColorClass = 'text-red-900 dark:text-red-100';
        accentColorClass = 'text-red-600 dark:text-red-400';
    }

    return (
        <div
            className={`
        inline-flex items-baseline px-3.5 py-1.5 rounded-full shadow-sm
        transition-colors duration-300 ease-in-out
        ${bgColorClass} ${textColorClass}
      `}
        >
            <span className="text-sm sm:text-base font-bold tracking-tight">
                {validOver}
                <span className="mx-0.5 opacity-80">.</span>
                {/* Highlight ball number */}
                <span className={`${accentColorClass}`}>{validBall}</span>
            </span>

            <span className="ml-1.5 text-[0.65rem] sm:text-xs font-semibold tracking-wider uppercase opacity-90">
                Overs
            </span>
        </div>
    );
};

export default OverBadge;
