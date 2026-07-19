import type { ApplicationStatus, Traveler, VisaApplication } from '@/types';

type ApiApplicant = {
  id: string;
  firstName: string;
  lastName: string;
  passportNumber: string;
  nationality?: string;
  sex?: string | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  placeOfIssue?: string | null;
  maritalStatus?: string | null;
  dateOfIssue?: string | null;
  dateOfExpiry?: string | null;
  isChild?: boolean;
};

type ApiApplication = {
  id: string;
  agencyId: string;
  internalId?: string | null;
  destination: string;
  visaType: string;
  status: ApplicationStatus;
  totalAmountMinor?: number | null;
  currency?: string | null;
  createdAt: string;
  updatedAt: string;
  applicants?: ApiApplicant[];
};

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : undefined;
}

export function mapApiApplication(app: ApiApplication): VisaApplication {
  const travelers: Traveler[] = (app.applicants ?? []).map((applicant) => ({
    id: applicant.id,
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    passportNumber: applicant.passportNumber,
    nationality: applicant.nationality ?? 'Indian',
    sex: applicant.sex ?? undefined,
    dateOfBirth: dateOnly(applicant.dateOfBirth),
    placeOfBirth: applicant.placeOfBirth ?? undefined,
    placeOfIssue: applicant.placeOfIssue ?? undefined,
    maritalStatus: applicant.maritalStatus ?? undefined,
    dateOfIssue: dateOnly(applicant.dateOfIssue),
    dateOfExpiry: dateOnly(applicant.dateOfExpiry),
    isChild: Boolean(applicant.isChild),
    status: app.status,
  }));

  return {
    id: app.id,
    agencyId: app.agencyId,
    internalId: app.internalId ?? undefined,
    destination: app.destination,
    visaType: app.visaType,
    status: app.status,
    totalPrice: (app.totalAmountMinor ?? 0) / 100,
    travelers,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

export async function fetchPortalApplications() {
  const response = await fetch('/api/applications?limit=50', { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load applications');
  const data = await response.json();
  return Array.isArray(data.applications) ? data.applications.map(mapApiApplication) : [];
}
