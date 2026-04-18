'use client';

import React, { useState } from 'react';
import { Upload, FileWarning, CheckCircle2, Loader2 } from 'lucide-react';
import { Transaction, CashbackReward, VoucherReward } from '@/types/gpay';

export default function ImportZone({ onImportComplete }: { onImportComplete: () => void }) {
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
        type: 'idle',
        message: '',
    });

    const parseFile = (file: File): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (file.name.endsWith('.csv')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    const lines = content.split('\n');
                    const headers = lines[0].split(',');
                    const data = lines.slice(1).map(line => {
                        const values = line.split(',');
                        return headers.reduce((obj: any, header, i) => {
                            obj[header.trim()] = values[i]?.trim();
                            return obj;
                        }, {});
                    });
                    resolve(data);
                };
                reader.readAsText(file);
            } else if (file.name.endsWith('.json')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        let content = e.target?.result as string;
                        if (content.startsWith(")]}'")) {
                            content = content.substring(4);
                        }
                        resolve(JSON.parse(content));
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.readAsText(file);
            } else {
                resolve(null);
            }
        });
    };

    const parseActivityHtml = (htmlContent: string): Transaction[] => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        // Google Activity HTML uses content-cell for each activity item
        const entries = doc.querySelectorAll('.content-cell');
        const extractedTransactions: Transaction[] = [];

        // Regex to find Google's date format: MMM DD, YYYY, H:MM:SS [space] AM/PM [Timezone]
        // Handles cases where text is merged without newlines and uses special unicode spaces (\u202f)
        const dateRegex = /([A-Z][a-z]{2}\s\d{1,2},\s\d{4},\s\d{1,2}:\d{2}:\d{2}[\s\u202f]?(?:AM|PM)(?:\s[A-Z\d\s+:]+)?)/;

        entries.forEach(entry => {
            const text = entry.textContent || '';

            // Look for patterns like "Paid ₹1,234.56 to..." or "Sent ₹500 to..."
            const amountMatch = text.match(/(Paid|Sent|Received|Refunded)\s+(₹|Rs\.?)\s?([\d,.]+)/i);

            if (amountMatch) {
                const type = amountMatch[1].toLowerCase();
                const amountValue = parseFloat(amountMatch[3].replace(/,/g, ''));

                // Default direction based on keyword
                let isDebit = type === 'paid' || type === 'sent';

                // Contextual overrides for incoming payments
                const lowText = text.toLowerCase();
                if (type === 'received' ||
                    type === 'refunded' ||
                    lowText.includes('paid you') ||
                    lowText.includes('credited to') ||
                    lowText.includes('received from')) {
                    isDebit = false;
                }

                const dateMatch = text.match(dateRegex);
                let time = '';
                let description = text;

                if (dateMatch) {
                    time = dateMatch[1];
                    // Clean description by removing the date part to avoid duplication
                    description = text.replace(time, '').trim();
                } else {
                    // Fallback to newline splitting
                    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                    description = lines[0];
                    time = lines[1] || '';
                }

                // Detect status from text - Google activity often prefix with "Failed" or contains these keywords
                const failureKeywords = /failed|cancelled|declined|rejected|expired|unsuccessful|error|could[ \u202f]not|declined[ \u202f]by[ \u202f]bank/i;
                const isFailed = failureKeywords.test(text);

                // Deterministic ID generation for accurate merging across imports
                const txIdBase = `${time}_${amountValue}_${description.substring(0, 10)}`;
                const transactionId = btoa(txIdBase).substring(0, 20);

                extractedTransactions.push({
                    time,
                    transactionId,
                    description,
                    product: 'Google Pay',
                    amount: isDebit ? -amountValue : amountValue,
                    currency: 'INR',
                    status: isFailed ? 'Failed' : 'Completed',
                    paymentMethod: 'GPay Activity'
                });
            }
        });

        return extractedTransactions;
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files) return;
        setIsUploading(true);
        setStatus({ type: 'idle', message: 'Analyzing files...' });

        let transactions: Transaction[] = [];
        let cashback: CashbackReward[] = [];
        let vouchers: VoucherReward[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const path = (file as any).webkitRelativePath || file.name;

                if (file.name === 'My Activity.html') {
                    const content = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsText(file);
                    });
                    transactions = [...transactions, ...parseActivityHtml(content)];
                } else if (path.includes('Cashback Rewards.csv')) {
                    const data = await parseFile(file);
                    data.forEach((row: any) => {
                        if (row['Reward Amount']) {
                            cashback.push({
                                date: row.Date,
                                amount: parseFloat(row['Reward Amount']),
                                currency: row.Currency,
                                description: row['Rewards Description'],
                            });
                        }
                    });
                } else if (path.includes('Voucher Rewards.json')) {
                    const data = await parseFile(file);
                    if (data?.couponRewardExportRecord) {
                        vouchers = data.couponRewardExportRecord;
                    }
                }
            }

            if (transactions.length === 0 && cashback.length === 0) {
                throw new Error('No relevant data found. Make sure you selected the correct folder.');
            }

            setStatus({ type: 'idle', message: `Parsed ${transactions.length} transactions. Syncing...` });

            const res = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions, cashback, vouchers }),
            });

            if (res.ok) {
                setStatus({ type: 'success', message: 'Data synced successfully!' });
                onImportComplete();
            } else {
                throw new Error('Failed to save data');
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-12 border border-white/5 rounded-[3rem] glass shadow-2xl transition-all hover:border-blue-500/30 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="flex flex-col items-center justify-center space-y-8 relative z-10">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                    <div className="p-8 bg-blue-500/10 rounded-[2rem] group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-500 relative">
                        {isUploading ? (
                            <Loader2 className="w-14 h-14 text-blue-400 animate-spin" />
                        ) : (
                            <Upload className="w-14 h-14 text-blue-400" />
                        )}
                    </div>
                </div>

                <div className="text-center space-y-3">
                    <h3 className="text-4xl font-extrabold tracking-tight gradient-text">Import GPay History</h3>
                    <p className="text-slate-400 text-lg font-medium">Drop your Takeout folder or Select it</p>
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-sm italic">
                        <span>Reliable Activity parsing enabled</span>
                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    </div>
                </div>

                <input
                    type="file"
                    id="folder-upload"
                    className="hidden"
                    multiple
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    onChange={(e) => handleFiles(e.target.files)}
                    disabled={isUploading}
                />

                <label
                    htmlFor="folder-upload"
                    className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_60px_rgba(37,99,235,0.5)]"
                >
                    Choose Takeout Folder
                </label>

                {status.message && (
                    <div className={`flex items-center space-x-3 px-8 py-4 rounded-2xl glass border border-white/5 ${status.type === 'success' ? 'text-emerald-400' : status.type === 'error' ? 'text-rose-400' : 'text-blue-400'}`}>
                        {status.type === 'success' && <CheckCircle2 className="w-6 h-6 animate-bounce" />}
                        {status.type === 'error' && <FileWarning className="w-6 h-6" />}
                        <span className="text-base font-bold tracking-wide">{status.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
