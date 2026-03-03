import React from 'react';

const BowlerBadge = ({ bowlerName }) => {
    if (!bowlerName) return null;

    return (
        <div className="inline-flex items-center px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full shadow-sm transition-colors duration-300">
            <span className="mr-1.5 text-sm sm:text-base leading-none">⚾</span>
            <span className="text-sm sm:text-base font-semibold tracking-tight truncate max-w-[120px] sm:max-w-[160px]">
                {bowlerName}
            </span>
        </div>
    );
};

export default BowlerBadge;
