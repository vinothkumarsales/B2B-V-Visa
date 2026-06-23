import { NextRequest, NextResponse } from 'next/server';
import { mockTransactions } from '@/lib/mock-data';
import { generateTransactionId } from '@/lib/transaction-id';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  let filtered = [...mockTransactions];

  if (type) {
    filtered = filtered.filter((txn) => txn.type === type);
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  const balance = mockTransactions.reduce((sum, txn) => sum + txn.amount, 0);

  return NextResponse.json({
    transactions: paginated,
    total,
    page,
    limit,
    balance,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, amount, method } = body;

    if (!type || !amount) {
      return NextResponse.json(
        { error: 'Type and amount are required' },
        { status: 400 }
      );
    }

    const newTransaction = {
      id: generateTransactionId(),
      type,
      amount,
      method: method || null,
      status: type === 'DEPOSIT' ? 'PENDING' : 'COMPLETED',
      description: body.description || `${type} - ${method || 'Wallet'}`,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { transaction: newTransaction, message: 'Transaction initiated successfully' },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}