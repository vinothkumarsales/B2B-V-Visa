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
  status?: ApplicationStatus;
};

type ApiApplication = {
  id: string;
  agencyId: string;
  internalId?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  destination: string;
  visaType: string;
  visaCategory?: string | null;
  status: ApplicationStatus;
  totalAmountMinor?: number | null;
  totalPrice?: number | null;
  currency?: string | null;
  travelDate?: string | null;
  returnDate?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Some endpoints return `applicants`, others return `travelers`. */
  applicants?: ApiApplicant[];
  travelers?: ApiApplicant[];
};

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : undefined;
}

export function mapApiApplication(app: ApiApplication): VisaApplication {
  // The portal endpoint returns `travelers`; the admin/create endpoints return
  // `applicants`. Reading only one of them silently produced applications with
  // no travellers, which the list cards render as nothing at all.
  const source = app.applicants ?? app.travelers ?? [];
  const travelers: Traveler[] = source.map((applicant) => ({
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
    status: applicant.status ?? app.status,
  }));

  // `totalAmountMinor` is in paise; `totalPrice` is already in rupees.
  const totalPrice =
    app.totalAmountMinor != null ? app.totalAmountMinor / 100 : app.totalPrice ?? 0;

  return {
    id: app.id,
    agencyId: app.agencyId,
    internalId: app.internalId ?? undefined,
    groupId: app.groupId ?? undefined,
    groupName: app.groupName ?? undefined,
    destination: app.destination,
    visaType: app.visaType,
    visaCategory: app.visaCategory ?? undefined,
    status: app.status,
    totalPrice,
    travelDate: app.travelDate ?? undefined,
    returnDate: app.returnDate ?? undefined,
    travelers,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  } as VisaApplication;
}

export async function fetchPortalApplications() {
  const response = await fetch('/api/applications?limit=50', { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load applications');
  const data = await response.json();
  return Array.isArray(data.applications) ? data.applications.map(mapApiApplication) : [];
}
