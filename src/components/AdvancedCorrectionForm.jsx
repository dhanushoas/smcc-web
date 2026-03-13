import React, { useState } from 'react';
import { Calendar, Clock, Check, ChevronDown } from 'lucide-react';

const CorrectionForm = () => {
    const [date, setDate] = useState('2026-03-11');
    const [time, setTime] = useState({
        hh: '06',
        mm: '58',
        period: 'PM'
    });

    // Calculate 24h preview
    const get24hPreview = () => {
        let hours = parseInt(time.hh);
        if (time.period === 'PM' && hours < 12) hours += 12;
        if (time.period === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${time.mm}`;
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4">
            <div className="bg-[#f8fafc] rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6">

                {/* Section Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-xl">
                            <Calendar className="w-5 h-5 text-gray-600" />
                        </div>
                        <h2 className="text-gray-700 font-semibold text-lg tracking-tight">MATCH DATE & TIME</h2>
                    </div>

                    <button className="bg-[#ef4444] hover:bg-[#dc2626] transition-all duration-300 text-white text-[10px] font-bold px-4 py-1.5 rounded-full tracking-wider uppercase shadow-sm active:scale-95">
                        ADVANCED CORRECTION PANEL
                    </button>
                </div>

                {/* Form Row */}
                <div className="flex flex-nowrap items-end gap-3 bg-white/50 p-1 rounded-2xl overflow-x-auto no-scrollbar">

                    {/* Date Field */}
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 rounded-xl py-2 px-3 text-sm font-medium text-gray-700 outline-none w-[130px] transition-all"
                            />
                        </div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DATE</label>
                    </div>

                    {/* Time Fields Container */}
                    <div className="flex items-center gap-3">
                        {/* HH */}
                        <div className="flex items-center gap-1">
                            <select
                                value={time.hh}
                                onChange={(e) => setTime({ ...time, hh: e.target.value })}
                                className="appearance-none bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 rounded-xl py-2 px-3 text-sm font-bold text-gray-700 outline-none transition-all cursor-pointer"
                            >
                                {[...Array(12)].map((_, i) => {
                                    const val = (i + 1).toString().padStart(2, '0');
                                    return <option key={val} value={val}>{val}</option>
                                })}
                            </select>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">HH</span>
                        </div>

                        {/* MM */}
                        <div className="flex items-center gap-1">
                            <select
                                value={time.mm}
                                onChange={(e) => setTime({ ...time, mm: e.target.value })}
                                className="appearance-none bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 rounded-xl py-2 px-3 text-sm font-bold text-gray-700 outline-none transition-all cursor-pointer"
                            >
                                {[...Array(60)].map((_, i) => {
                                    const val = i.toString().padStart(2, '0');
                                    return <option key={val} value={val}>{val}</option>
                                })}
                            </select>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">MM</span>
                        </div>

                        {/* AM/PM */}
                        <div className="flex items-center gap-1">
                            <select
                                value={time.period}
                                onChange={(e) => setTime({ ...time, period: e.target.value })}
                                className="appearance-none bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 rounded-xl py-2 px-3 text-sm font-black text-gray-700 outline-none transition-all cursor-pointer"
                            >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">AM/PM</span>
                        </div>
                    </div>

                    {/* 24h Display */}
                    <div className="flex items-center h-[52px] px-4">
                        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-blue-600 text-xs font-bold font-mono">
                                24h: {get24hPreview()}
                            </span>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex flex-1 justify-end h-[52px]">
                        <button className="bg-black hover:bg-gray-800 transition-all duration-300 text-white px-8 h-full rounded-2xl flex items-center gap-2 group active:scale-95 shadow-lg shadow-black/10">
                            <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-sm tracking-wide">SAVE</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CorrectionForm;
