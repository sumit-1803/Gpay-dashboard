import clientPromise from './mongodb';

const DB_NAME = 'gpay_dashboard';
const COLLECTION_NAME = 'user_data';
const DATA_ID = 'main_config';

export interface Database {
  transactions: any[];
  cashback: any[];
  vouchers: any[];
}

export async function getDb(): Promise<Database> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);
  
  const data = await collection.findOne({ _id: DATA_ID as any });
  
  if (!data) {
    const initialDb: Database = { transactions: [], cashback: [], vouchers: [] };
    await collection.insertOne({ _id: DATA_ID as any, ...initialDb });
    return initialDb;
  }

  return {
    transactions: data.transactions || [],
    cashback: data.cashback || [],
    vouchers: data.vouchers || []
  };
}

export async function saveDb(data: Database): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  await collection.updateOne(
    { _id: DATA_ID as any },
    { $set: data },
    { upsert: true }
  );
}
