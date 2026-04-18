export interface Transaction {
  time: string;
  transactionId: string;
  description: string;
  product: string;
  paymentMethod: string;
  status: string;
  amount: number;
  currency: string;
  manualType?: 'Credit' | 'Debit';
  manualStatus?: 'Completed' | 'Failed';
}

export interface CashbackReward {
  date: string;
  amount: number;
  currency: string;
  description: string;
}

export interface VoucherReward {
  code: string;
  summary: string;
  details: string;
  expiryTimestamp: string;
}
