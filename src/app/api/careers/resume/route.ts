import { NextRequest, NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { careerResumeUploadSchema, saveCareerResumeUpload } from '@/server/careers/onboarding';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = careerResumeUploadSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid career resume upload.', 400);

    const result = await saveCareerResumeUpload({
      userId: session.user.id,
      payload: parsed.data,
    });

    return NextResponse.json({ ...result, message: 'Resume uploaded and CareerOps analysis completed' });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to upload resume.', 400);
  }
}
