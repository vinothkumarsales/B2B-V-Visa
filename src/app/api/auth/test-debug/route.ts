import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyFirebaseIdToken } from '@/lib/firebase-verify';

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: Boolean(process.env.DATABASE_URL),
    },
    database: null,
    firebaseVerify: null,
    registerMockTest: null,
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

  // Test invoking register handler with dummy request using dynamic import
  try {
    const { POST: registerHandler } = await import('../register/route');
    const dummyReq = new NextRequest('https://business.vvisa.in/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        token: 'test-token',
        phone: '1234567890',
        firstName: 'Test',
        lastName: 'User',
        gender: 'Male',
        designation: 'Manager',
        country: 'IN',
        businessName: 'Test Business',
        billingType: 'NON_GST',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const res = await registerHandler(dummyReq);
    const status = res.status;
    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch {}
    diagnostics.registerMockTest = { success: true, status, body: bodyText };
  } catch (e: any) {
    diagnostics.registerMockTest = { success: false, error: e.message, stack: e.stack };
  }

  return NextResponse.json(diagnostics);
}
