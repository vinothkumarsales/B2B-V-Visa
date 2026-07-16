import { NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { db } from '@/lib/db';
import { isApiResponse } from '@/lib/api-response';
export async function GET() { try { await requireAgencyMembership(); const now=new Date(); const sections=await db.dashboardSection.findMany({where:{status:'published',isVisible:true,AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{endsAt:null},{endsAt:{gt:now}}]}]},orderBy:{displayOrder:'asc'},select:{key:true,name:true,type:true,config:true,displayOrder:true}});return NextResponse.json({sections});}catch(error){if(isApiResponse(error))return error;throw error;} }
