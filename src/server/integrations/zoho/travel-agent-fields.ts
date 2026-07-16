export type TravelAgentCrmFields = {
  portalTravelAgentId: string;
  agencyName: string;
  email?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
  panCard?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  portalSource?: string | null;
};

export type TravelAgentCustomFieldMap = Partial<Record<
  | 'portalTravelAgentId'
  | 'gstNumber'
  | 'panCard'
  | 'postalCode'
  | 'portalSource',
  string | null | undefined
>>;

export function buildTravelAgentCrmFields(input: {
  fields: TravelAgentCrmFields;
  customFieldMap?: TravelAgentCustomFieldMap;
}): Record<string, string> {
  const mapped: Record<string, string> = {};
  const fields = input.fields;
  const customMap = input.customFieldMap ?? {};

  assign(mapped, 'Name', fields.agencyName);
  assign(mapped, 'Email', fields.email);
  assign(mapped, 'Mobile', fields.mobile);

  assignCustom(mapped, customMap.portalTravelAgentId, fields.portalTravelAgentId);
  assignCustom(mapped, customMap.gstNumber, fields.gstNumber);
  assignCustom(mapped, customMap.panCard, fields.panCard);
  assignCustom(mapped, customMap.postalCode, fields.postalCode);
  assignCustom(mapped, customMap.portalSource, fields.portalSource ?? 'V-Visa B2B Portal');

  return mapped;
}

function assign(target: Record<string, string>, key: string, value?: string | null) {
  const cleaned = value?.trim();
  if (cleaned) target[key] = cleaned;
}

function assignCustom(target: Record<string, string>, key?: string | null, value?: string | null) {
  if (!key) return;
  assign(target, key, value);
}
