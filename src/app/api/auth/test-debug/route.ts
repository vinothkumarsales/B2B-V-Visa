import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyFirebaseIdToken } from '@/lib/firebase-verify';

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: Boolean(process.env.DATABASE_URL),
      GOOGLE_CLIENT_ID_SET: Boolean(process.env.GOOGLE_CLIENT_ID),
    },
    database: null,
    firebaseVerify: null,
  };

  // Test database connection
  try {
    const userCount = await db.user.count();
    diagnostics.database = { success: true, userCount };
  } catch (e: any) {
    diagnostics.database = { success: false, error: e.message, stack: e.stack };
  }

  // Test verifyFirebaseIdToken imports
  try {
    diagnostics.firebaseVerify = { success: true, type: typeof verifyFirebaseIdToken };
  } catch (e: any) {
    diagnostics.firebaseVerify = { success: false, error: e.message, stack: e.stack };
  }

  return NextResponse.json(diagnostics);
}
