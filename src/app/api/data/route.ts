import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await getDb();
    const { transactions, cashback, vouchers } = db;

    // Summary calculations
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const transactionsInMonth = transactions.filter(t => {
      const d = new Date(t.time);
      const isCompleted = t.status === 'Completed' || t.status === 'Complete' || t.status === 'GPay Activity';
      return d >= firstDayOfMonth && isCompleted;
    });

    const totalSpentThisMonth = Math.abs(transactionsInMonth.reduce((acc, t) => t.amount < 0 ? acc + t.amount : acc, 0));
    const totalCashback = cashback.reduce((acc, c) => acc + (c.amount || 0), 0);
    
    // Grouping by product for charts
    const productSpending = transactions
      .filter(t => t.status === 'Completed' || t.status === 'Complete' || t.status === 'GPay Activity')
      .reduce((acc: any, t) => {
        const val = Math.abs(t.amount || 0);
        acc[t.product] = (acc[t.product] || 0) + val;
        return acc;
      }, {});

    const chartData = Object.entries(productSpending)
      .filter(([_, value]) => (value as number) > 0)
      .map(([name, value]) => ({ name, value }));

    return NextResponse.json({
      transactions,
      cashback,
      vouchers,
      summary: {
        totalSpentThisMonth,
        totalCashback,
        transactionCount: transactions.length,
        voucherCount: vouchers.length
      },
      chartData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
