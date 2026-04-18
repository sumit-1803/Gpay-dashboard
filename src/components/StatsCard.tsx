import React from 'react';
import { LucideIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export function StatsCard({ title, value, icon: Icon, description, trend, className }: { title: string, value: string, icon: LucideIcon, description?: string, trend?: string, className?: string }) {
    return (
        <div className={twMerge("p-8 rounded-[2rem] glass card-hover flex flex-col justify-between group h-full transition-all duration-500", className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
            </div>
            <div className="flex flex-col">
                <span className="text-3xl font-black text-slate-100 tracking-tight">{value}</span>
                {description && <span className="text-sm text-slate-400 mt-2 font-medium">{description}</span>}
                {trend && (
                    <div className="flex items-center gap-2 mt-3 px-3 py-1 bg-emerald-500/10 rounded-full w-fit border border-emerald-500/10">
                        <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">{trend}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
