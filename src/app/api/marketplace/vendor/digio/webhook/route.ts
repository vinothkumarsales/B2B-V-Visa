import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env, isDemoMode } from '@/lib/env';

/**
 * Authoritative Digio Webhook Endpoint
 *
 * Receives Digio asynchronous completion webhooks:
 * { "event": "kyc.completed", "id": "KID...", "status": "success", "reference_id": "<agencyId>" }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate webhook caller if credentials configured
    const authHeader = request.headers.get('authorization');
    if (env.DIGIO_CLIENT_ID && env.DIGIO_CLIENT_SECRET) {
      const expectedAuth = `Basic ${Buffer.from(`${env.DIGIO_CLIENT_ID}:${env.DIGIO_CLIENT_SECRET}`).toString('base64')}`;
      if (authHeader && authHeader !== expectedAuth) {
        console.warn('[DIGIO WEBHOOK] Unauthorized webhook call attempt');
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = await request.json().catch(() => ({}));
    const digioKycId = payload.id || payload.kyc_id;
    const referenceId = payload.reference_id; // agencyId passed during request creation
    const rawStatus = String(payload.status || payload.kyc_status || '').toLowerCase();

    if (!digioKycId) {
      return NextResponse.json({ success: false, error: 'Missing Digio KYC ID' }, { status: 400 });
    }

    // 2. Resolve target vendor profile
    const vendorProfile = await db.vendorProfile.findFirst({
      where: referenceId
        ? { agencyId: referenceId, digioKycId }
        : { digioKycId },
    });

    if (!vendorProfile) {
      console.warn('[DIGIO WEBHOOK] No vendor profile found for Digio ID:', digioKycId);
      return NextResponse.json({ success: false, error: 'Vendor profile not found' }, { status: 404 });
    }

    // 3. Authoritative verification of completion status
    const isSuccess = rawStatus === 'success' || rawStatus === 'approved' || rawStatus === 'completed';

    // If live Digio credentials exist, perform a double-check query against Digio API
    if (isSuccess && !isDemoMode && env.DIGIO_CLIENT_ID && env.DIGIO_CLIENT_SECRET) {
      const auth = `Basic ${Buffer.from(`${env.DIGIO_CLIENT_ID}:${env.DIGIO_CLIENT_SECRET}`).toString('base64')}`;
      const baseUrl = env.DIGIO_BASE_URL.replace(/\/$/, '');

      try {
        const verifyRes = await fetch(`${baseUrl}/client/kyc/v2/${digioKycId}/response`, {
          method: 'GET',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        const verifyStatus = String(verifyData.status || verifyData.kyc_status || '').toLowerCase();
        if (!verifyRes.ok || (verifyStatus !== 'success' && verifyStatus !== 'approved' && verifyStatus !== 'completed')) {
          console.warn('[DIGIO WEBHOOK] Double-check failed with Digio API:', verifyStatus);
          return NextResponse.json({ success: false, error: 'Digio server-side verification rejected' }, { status: 400 });
        }
      } catch (checkErr) {
        console.error('[DIGIO WEBHOOK] Verification error during double-check:', checkErr);
      }
    }

    if (isSuccess) {
      // 4. Update vendor profile status to COMPLETED
      await db.vendorProfile.update({
        where: { id: vendorProfile.id },
        data: {
          kycStatus: 'COMPLETED',
          vendorStatus: 'ACTIVE',
          digioKycStatus: 'COMPLETED',
          kycCompletedAt: new Date(),
          kycFailureReason: null,
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Vendor KYC authoritatively completed for agency ${vendorProfile.agencyId}`,
      });
    } else {
      // Record failure if Digio explicitly marked it rejected/failed
      const isFailed = rawStatus === 'failed' || rawStatus === 'rejected';
      if (isFailed) {
        await db.vendorProfile.update({
          where: { id: vendorProfile.id },
          data: {
            kycStatus: 'FAILED',
            digioKycStatus: rawStatus,
            kycFailureReason: payload.message || payload.error || 'Digio verification rejected',
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Digio status '${rawStatus}' recorded for agency ${vendorProfile.agencyId}`,
      });
    }
  } catch (error: any) {
    console.error('[DIGIO WEBHOOK] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal error processing webhook' }, { status: 500 });
  }
}
