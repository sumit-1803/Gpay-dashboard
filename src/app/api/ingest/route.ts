import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { transactions, cashback, vouchers } = data;

    const db = await getDb();

    if (transactions?.length > 0) {
      // Index existing transactions to preserve manual overrides
      const existingMap = new Map(db.transactions.map(t => [t.transactionId, t]));
      
      const mergedTransactions = transactions.map((newTx: any) => {
        const existingTx = existingMap.get(newTx.transactionId);
        if (existingTx) {
          return {
            ...newTx,
            manualType: existingTx.manualType,
            manualStatus: existingTx.manualStatus
          };
        }
        return newTx;
      });

      db.transactions = mergedTransactions;
    }
    
    if (cashback?.length > 0) db.cashback = cashback;
    if (vouchers?.length > 0) db.vouchers = vouchers;

    await saveDb(db);

    return NextResponse.json({ success: true, message: 'Data ingested successfully' });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
