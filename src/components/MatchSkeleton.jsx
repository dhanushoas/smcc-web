import React from 'react';

const MatchSkeleton = () => {
    return (
        <div className="cric-card mb-3 bg-white rounded-3 shadow-sm border overflow-hidden w-100 animate-pulse">
            <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center bg-white">
                <div className="skeleton-text w-25 h-10"></div>
                <div className="skeleton-badge w-15 h-20"></div>
            </div>

            <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="skeleton-circle" style={{ width: '40px', height: '40px' }}></div>
                        <div className="skeleton-text w-100 h-20" style={{ width: '100px' }}></div>
                    </div>
                    <div className="skeleton-text w-50 h-25" style={{ width: '80px' }}></div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="skeleton-circle" style={{ width: '40px', height: '40px' }}></div>
                        <div className="skeleton-text w-100 h-20" style={{ width: '100px' }}></div>
                    </div>
                    <div className="skeleton-text w-50 h-25" style={{ width: '80px' }}></div>
                </div>

                <div className="pt-2 border-top">
                    <div className="skeleton-text w-75 h-15"></div>
                </div>
            </div>
            <style jsx>{`
                .skeleton-text {
                    background: #e2e8f0;
                    border-radius: 4px;
                }
                .skeleton-badge {
                    background: #e2e8f0;
                    border-radius: 100px;
                }
                .skeleton-circle {
                    background: #e2e8f0;
                    border-radius: 50%;
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
                .h-10 { height: 10px; }
                .h-15 { height: 15px; }
                .h-20 { height: 20px; }
                .h-25 { height: 25px; }
                .w-15 { width: 15%; }
                .w-25 { width: 25%; }
                .w-50 { width: 50%; }
                .w-75 { width: 75%; }
                .w-100 { width: 100%; }
            `}</style>
        </div>
    );
};

export default MatchSkeleton;
