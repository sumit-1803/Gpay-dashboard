import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { transactions } = data;

    if (!transactions) {
      return NextResponse.json({ success: false, error: 'No transactions provided' }, { status: 400 });
    }

    const db = await getDb();
    db.transactions = transactions;

    await saveDb(db);

    return NextResponse.json({ 
      success: true, 
      message: 'State saved successfully',
      count: transactions.length 
    });
  } catch (error: any) {
    console.error('Save error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
