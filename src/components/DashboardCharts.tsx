'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#f43f5e', '#a855f7', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl min-w-[150px]">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{label}</p>
                <div className="space-y-3">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-tight mb-0.5">{entry.name}</span>
                            <span className={`text-lg font-black tracking-tighter ${entry.name === 'Spent' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                ₹{entry.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export function SpendingPieChart({ data }: { data: any[] }) {
    return (
        <div className="h-[400px] w-full animate-in fade-in zoom-in duration-700">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <defs>
                        {COLORS.map((color, i) => (
                            <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={1} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                            </linearGradient>
                        ))}
                    </defs>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={100}
                        outerRadius={140}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#grad-${index % COLORS.length})`} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-slate-400 text-xs font-bold uppercase tracking-widest px-2">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function MonthlyTrendChart({ transactions }: { transactions: any[] }) {
    const monthlyData = transactions.reduce((acc: any, t) => {
        if (!t.time) return acc;
        const date = new Date(t.time);
        if (isNaN(date.getTime())) return acc;

        // Filter for completed transactions consistently
        // We also exclude anything that looks like a failure message in the description
        const isCompleted = t.status === 'Completed' || t.status === 'Complete' || t.status === 'GPay Activity';
        const isFailed = /failed|cancelled|declined|rejected/i.test(t.description || '');
        if (!isCompleted || isFailed) return acc;

        const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!acc[month]) acc[month] = { spent: 0, earned: 0 };

        const finalType = t.manualType || (t.amount < 0 ? 'Debit' : 'Credit');
        const val = Math.abs(t.amount || 0);
        if (finalType === 'Debit') {
            acc[month].spent += val;
        } else {
            acc[month].earned += val;
        }
        return acc;
    }, {});

    const chartData = Object.entries(monthlyData)
        .map(([name, data]: [string, any]) => ({
            name,
            spent: Number(data.spent),
            earned: Number(data.earned)
        }))
        .sort((a, b) => {
            const dateA = new Date(a.name);
            const dateB = new Date(b.name);
            return dateA.getTime() - dateB.getTime();
        });

    return (
        <div className="h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="earnedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#475569"
                        fontSize={10}
                        fontWeight="bold"
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="#475569"
                        fontSize={10}
                        fontWeight="bold"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: '#ffffff05' }}
                        // Force tooltip to show all values in the group
                        shared={true}
                    />
                    <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: '20px' }}
                        formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{value}</span>}
                    />
                    <Bar name="Spent" dataKey="spent" fill="url(#spentGradient)" radius={[6, 6, 0, 0]} />
                    <Bar name="Earned" dataKey="earned" fill="url(#earnedGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
