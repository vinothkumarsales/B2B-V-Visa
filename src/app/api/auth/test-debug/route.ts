import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyFirebaseIdToken } from '@/lib/firebase-verify';
import { apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: Boolean(process.env.DATABASE_URL),
    },
    database: null,
    firebaseVerify: null,
    apiErrorTest: null,
  };

  // Test database connection
  try {
    const userCount = await db.user.count();
    diagnostics.database = { success: true, userCount };
  } catch (e: any) {
    diagnostics.database = { success: false, error: e.message, stack: e.stack };
  }

  // Test verifyFirebaseIdToken imports & execution
  try {
    const res = await verifyFirebaseIdToken('test-token').catch((err) => err);
    diagnostics.firebaseVerify = { 
      success: true, 
      errorType: res instanceof Error ? res.constructor.name : typeof res,
      errorMessage: res instanceof Error ? res.message : String(res)
    };
  } catch (e: any) {
    diagnostics.firebaseVerify = { success: false, error: e.message, stack: e.stack };
  }

  // Test apiError function
  try {
    const res = apiError('INVALID_INPUT', 'Test message', 400);
    diagnostics.apiErrorTest = { 
      success: true, 
      status: res.status, 
      isResponse: res instanceof Response || res instanceof NextResponse 
    };
  } catch (e: any) {
    diagnostics.apiErrorTest = { success: false, error: e.message, stack: e.stack };
  }

  return NextResponse.json(diagnostics);
}
