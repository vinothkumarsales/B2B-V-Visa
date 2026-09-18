import type { VisaStickerRoute, VisaType } from '@/types';
import { resolveIndianPassportLocation, type IndianRegionZone } from './ocr/passport-location-resolver.ts';

export type StickerRoutingBasis =
  | 'PASSPORT_ISSUE'
  | 'RESIDENCE'
  | 'PASSPORT_ISSUE_OR_RESIDENCE'
  | 'FIXED'
  | 'MANUAL';

export interface ResolvedStickerSubmissionRoute {
  routingBasis: StickerRoutingBasis;
  isVerified: boolean;
  originCity: string;
  originState?: string;
  originZone?: IndianRegionZone;
  submissionCity: string;
  submissionCentreName: string;
  submissionCentreAddress?: string;
  serviceProvider: string;
  serviceFeeAdjustmentMinor: number;
  courierFeeMinor: number;
  requiresPhysicalPresence: boolean;
  instructions: string;
  routeKey: string;
  asStickerRoute: VisaStickerRoute;
}

interface DestinationRoutingConfig {
  defaultBasis: StickerRoutingBasis;
  provider: string;
  requiresPhysicalBiometrics: boolean;
  centres: {
    submissionCity: string;
    centreName: string;
    address?: string;
    servedZones: IndianRegionZone[];
    servedStates?: string[];
    servedCities?: string[];
    serviceFeeAdjustmentMinor?: number;
  }[];
}

const DESTINATION_ROUTING_CONFIGS: Record<string, DestinationRoutingConfig> = {
  // UK / United Kingdom (VFS Global Nationwide VAC Network)
  GBR: {
    defaultBasis: 'PASSPORT_ISSUE_OR_RESIDENCE',
    provider: 'VFS Global',
    requiresPhysicalBiometrics: true,
    centres: [
      {
        submissionCity: 'Kolkata',
        centreName: 'VFS Global UK - Kolkata (East India VAC)',
        address: 'Rene Tower, 4th Floor, Plot No. AA-I, Sector 1, Rajarhat, Kolkata, WB 700156',
        servedZones: ['EAST', 'NORTHEAST'],
        servedStates: ['West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Assam'],
        servedCities: ['Kolkata', 'Patna', 'Ranchi', 'Bhubaneswar', 'Guwahati'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Chennai',
        centreName: 'VFS Global UK - Chennai (South India Hub)',
        address: 'Fagun Towers, Third Floor, No 74, Ethiraj Salai, Egmore, Chennai, TN 600008',
        servedZones: ['SOUTH'],
        servedStates: ['Tamil Nadu', 'Kerala', 'Puducherry'],
        servedCities: ['Chennai', 'Tiruchirappalli', 'Madurai', 'Coimbatore', 'Kochi', 'Thiruvananthapuram', 'Kozhikode'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Bengaluru',
        centreName: 'VFS Global UK - Bengaluru (Karnataka Hub)',
        address: 'Gopalan Innovation Mall, Bannerghatta Main Rd, Sarakki Industrial Layout, Bengaluru, KA 560076',
        servedZones: ['SOUTH'],
        servedStates: ['Karnataka'],
        servedCities: ['Bengaluru', 'Mangalore', 'Mysore'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Hyderabad',
        centreName: 'VFS Global UK - Hyderabad (Telangana / AP Hub)',
        address: '8-2-572/1, Road No. 7, Banjara Hills, Hyderabad, TS 500034',
        servedZones: ['SOUTH'],
        servedStates: ['Telangana', 'Andhra Pradesh'],
        servedCities: ['Hyderabad', 'Vijayawada', 'Visakhapatnam'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Mumbai',
        centreName: 'VFS Global UK - Mumbai South (West India Hub)',
        address: 'Trade Centre, 5th Floor, Bandra Kurla Complex, Bandra (East), Mumbai, MH 400051',
        servedZones: ['WEST'],
        servedStates: ['Maharashtra', 'Goa'],
        servedCities: ['Mumbai', 'Pune', 'Nagpur', 'Panaji'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Ahmedabad',
        centreName: 'VFS Global UK - Ahmedabad (Gujarat Hub)',
        address: 'Gujarat Chamber of Commerce & Industry, Ashram Road, Ahmedabad, GJ 380009',
        servedZones: ['WEST'],
        servedStates: ['Gujarat'],
        servedCities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'New Delhi',
        centreName: 'VFS Global UK - New Delhi (North India Hub)',
        address: 'Shivaji Stadium Metro Station, Mezzanine Level, Baba Kharak Singh Marg, Connaught Place, New Delhi, DL 110001',
        servedZones: ['NORTH', 'CENTRAL'],
        servedStates: ['Delhi', 'Uttar Pradesh', 'Punjab', 'Haryana', 'Rajasthan', 'Uttarakhand', 'Himachal Pradesh', 'Jammu and Kashmir', 'Madhya Pradesh', 'Chhattisgarh'],
        servedCities: ['New Delhi', 'Chandigarh', 'Jalandhar', 'Amritsar', 'Jaipur', 'Lucknow', 'Varanasi', 'Bareilly', 'Bhopal', 'Raipur'],
        serviceFeeAdjustmentMinor: 0,
      },
    ],
  },

  // US / United States (USTravelDocs / VFS VAC)
  USA: {
    defaultBasis: 'PASSPORT_ISSUE_OR_RESIDENCE',
    provider: 'US TravelDocs',
    requiresPhysicalBiometrics: true,
    centres: [
      {
        submissionCity: 'Kolkata',
        centreName: 'US Consulate General & VAC - Kolkata',
        address: '5/1 Ho Chi Minh Sarani, Kolkata, WB 700071',
        servedZones: ['EAST', 'NORTHEAST'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Chennai',
        centreName: 'US Consulate General & VAC - Chennai',
        address: '220 Anna Salai, Gemini Circle, Chennai, TN 600006',
        servedZones: ['SOUTH'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Hyderabad',
        centreName: 'US Consulate General & VAC - Hyderabad',
        address: 'Nanakramguda, Financial District, Hyderabad, TS 500032',
        servedZones: ['SOUTH'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Mumbai',
        centreName: 'US Consulate General & VAC - Mumbai',
        address: 'C-49, G-Block, Bandra Kurla Complex, Bandra East, Mumbai, MH 400051',
        servedZones: ['WEST'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'New Delhi',
        centreName: 'US Embassy & VAC - New Delhi',
        address: 'Shantipath, Chanakyapuri, New Delhi, DL 110021',
        servedZones: ['NORTH', 'CENTRAL'],
        serviceFeeAdjustmentMinor: 0,
      },
    ],
  },

  // South Korea (KVAC South - Chennai vs KVAC North - New Delhi)
  KOR: {
    defaultBasis: 'PASSPORT_ISSUE_OR_RESIDENCE',
    provider: 'KVAC',
    requiresPhysicalBiometrics: false,
    centres: [
      {
        submissionCity: 'Chennai',
        centreName: 'KVAC Chennai (South India Jurisdiction)',
        address: 'Chaitanya Exotica, 5th Floor, Anna Salai, Teynampet, Chennai, TN 600018',
        servedZones: ['SOUTH'],
        servedStates: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'New Delhi',
        centreName: 'KVAC New Delhi (North/West/East India Jurisdiction)',
        address: 'DLF Towers, Shivaji Stadium Metro Station, Connaught Place, New Delhi, DL 110001',
        servedZones: ['NORTH', 'WEST', 'EAST', 'CENTRAL', 'NORTHEAST'],
        serviceFeeAdjustmentMinor: 0,
      },
    ],
  },

  // Germany (Consular Jurisdictions)
  DEU: {
    defaultBasis: 'RESIDENCE',
    provider: 'VFS Global (German Missions)',
    requiresPhysicalBiometrics: true,
    centres: [
      {
        submissionCity: 'Chennai',
        centreName: 'Consulate General of Germany - Chennai (South India)',
        servedZones: ['SOUTH'],
        servedStates: ['Tamil Nadu', 'Kerala', 'Puducherry', 'Andhra Pradesh', 'Telangana'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Bengaluru',
        centreName: 'Consulate General of Germany - Bengaluru (Karnataka)',
        servedZones: ['SOUTH'],
        servedStates: ['Karnataka'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Mumbai',
        centreName: 'Consulate General of Germany - Mumbai (West India)',
        servedZones: ['WEST', 'CENTRAL'],
        servedStates: ['Maharashtra', 'Gujarat', 'Goa', 'Madhya Pradesh', 'Chhattisgarh'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'Kolkata',
        centreName: 'Consulate General of Germany - Kolkata (East India)',
        servedZones: ['EAST', 'NORTHEAST'],
        servedStates: ['West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Assam'],
        serviceFeeAdjustmentMinor: 0,
      },
      {
        submissionCity: 'New Delhi',
        centreName: 'Embassy of the Federal Republic of Germany - New Delhi',
        servedZones: ['NORTH'],
        serviceFeeAdjustmentMinor: 0,
      },
    ],
  },
};

// Generic / Nationwide Fallback VAC Centres for all other sticker visa destinations
const GENERIC_STICKER_CENTRES: DestinationRoutingConfig['centres'] = [
  {
    submissionCity: 'Kolkata',
    centreName: 'VFS Global Application Centre - Kolkata',
    address: 'East India Regional Hub, Rajarhat, Kolkata',
    servedZones: ['EAST', 'NORTHEAST'],
    serviceFeeAdjustmentMinor: 0,
  },
  {
    submissionCity: 'Chennai',
    centreName: 'VFS Global Application Centre - Chennai',
    address: 'South India Regional Hub, Egmore, Chennai',
    servedZones: ['SOUTH'],
    servedStates: ['Tamil Nadu', 'Kerala', 'Puducherry'],
    serviceFeeAdjustmentMinor: 0,
  },
  {
    submissionCity: 'Bengaluru',
    centreName: 'VFS Global Application Centre - Bengaluru',
    address: 'Karnataka Regional Hub, Bannerghatta Rd, Bengaluru',
    servedZones: ['SOUTH'],
    servedStates: ['Karnataka'],
    serviceFeeAdjustmentMinor: 0,
  },
  {
    submissionCity: 'Hyderabad',
    centreName: 'VFS Global Application Centre - Hyderabad',
    address: 'Telangana & AP Regional Hub, Banjara Hills, Hyderabad',
    servedZones: ['SOUTH'],
    servedStates: ['Telangana', 'Andhra Pradesh'],
    serviceFeeAdjustmentMinor: 0,
  },
  {
    submissionCity: 'Mumbai',
    centreName: 'VFS Global Application Centre - Mumbai',
    address: 'West India Regional Hub, BKC, Mumbai',
    servedZones: ['WEST'],
    serviceFeeAdjustmentMinor: 0,
  },
  {
    submissionCity: 'Ahmedabad',
    centreName: 'VFS Global Application Centre - Ahmedabad',
    address: 'Gujarat Regional Hub, Ashram Road, Ahmedabad',
    servedZones: ['WEST'],
    servedStates: ['Gujarat'],
    serviceFeeAdjustmentMinor: 0,
  },
  {
    submissionCity: 'New Delhi',
    centreName: 'VFS Global Application Centre - New Delhi',
    address: 'North India Regional Hub, Connaught Place, New Delhi',
    servedZones: ['NORTH', 'CENTRAL'],
    serviceFeeAdjustmentMinor: 0,
  },
];

function getDestinationConfig(destinationCode?: string, destinationName?: string): DestinationRoutingConfig {
  const code = (destinationCode || '').toUpperCase();
  if (DESTINATION_ROUTING_CONFIGS[code]) return DESTINATION_ROUTING_CONFIGS[code];

  const name = (destinationName || '').toLowerCase();
  if (name.includes('united kingdom') || name.includes('uk') || name.includes('britain') || name.includes('england')) {
    return DESTINATION_ROUTING_CONFIGS.GBR;
  }
  if (name.includes('united states') || name.includes('usa') || name.includes('america')) {
    return DESTINATION_ROUTING_CONFIGS.USA;
  }
  if (name.includes('korea')) {
    return DESTINATION_ROUTING_CONFIGS.KOR;
  }
  if (name.includes('germany')) {
    return DESTINATION_ROUTING_CONFIGS.DEU;
  }

  // Generic configuration
  return {
    defaultBasis: 'PASSPORT_ISSUE_OR_RESIDENCE',
    provider: 'VFS Global',
    requiresPhysicalBiometrics: true,
    centres: GENERIC_STICKER_CENTRES,
  };
}

/**
 * Resolves the physical submission city and centre for a sticker visa based on
 * passport place of issue and/or residence city.
 */
export function resolveStickerSubmissionRoute(
  visa: VisaType,
  input: {
    passportOriginCity?: string | null;
    residenceCity?: string | null;
    residenceState?: string | null;
  }
): ResolvedStickerSubmissionRoute {
  const config = getDestinationConfig(visa.destinationCode, visa.destination);

  // 1. Resolve passport origin location if provided
  const passportLoc = resolveIndianPassportLocation(input.passportOriginCity);
  const residenceLoc = resolveIndianPassportLocation(input.residenceCity);

  // Determine location to use based on routing basis
  let effectiveLocation = passportLoc;
  if (config.defaultBasis === 'RESIDENCE') {
    effectiveLocation = residenceLoc || passportLoc;
  } else if (!effectiveLocation) {
    effectiveLocation = residenceLoc;
  }

  const originCity = effectiveLocation?.normalizedCity || input.passportOriginCity?.trim() || 'All India';
  const originState = effectiveLocation?.state;
  const originZone = effectiveLocation?.zone;

  // 2. Match nearest centre
  let matchedCentre = config.centres.find((c) => {
    if (effectiveLocation?.normalizedCity && c.servedCities?.some((sc) => sc.toLowerCase() === effectiveLocation.normalizedCity.toLowerCase())) {
      return true;
    }
    if (effectiveLocation?.state && c.servedStates?.some((st) => st.toLowerCase() === effectiveLocation.state.toLowerCase())) {
      return true;
    }
    if (effectiveLocation?.zone && c.servedZones.includes(effectiveLocation.zone)) {
      return true;
    }
    return false;
  });

  // Fallback to New Delhi or first centre in list
  if (!matchedCentre) {
    matchedCentre = config.centres.find((c) => c.submissionCity === 'New Delhi') || config.centres[0];
  }

  const routeKey = `${visa.destinationCode || 'STICKER'}_${originCity.toUpperCase().replace(/\s+/g, '_')}`;
  const asStickerRoute: VisaStickerRoute = {
    id: routeKey,
    type: 'SUBMISSION',
    origin: originCity,
    destination: matchedCentre.submissionCity,
    routeKey,
    visaProductId: visa.id,
    originCityCode: originCity.toUpperCase().replace(/\s+/g, '_'),
    originCityLabel: originState ? `${originCity} (${originState})` : originCity,
    processingCentreCity: matchedCentre.submissionCity,
    processingCentreAddress: matchedCentre.address,
    courierFeeMinor: 0,
    serviceFeeAdjustmentMinor: matchedCentre.serviceFeeAdjustmentMinor ?? 0,
    isActive: true,
  };

  return {
    routingBasis: config.defaultBasis,
    isVerified: true,
    originCity,
    originState,
    originZone,
    submissionCity: matchedCentre.submissionCity,
    submissionCentreName: matchedCentre.centreName,
    submissionCentreAddress: matchedCentre.address,
    serviceProvider: config.provider,
    serviceFeeAdjustmentMinor: matchedCentre.serviceFeeAdjustmentMinor ?? 0,
    courierFeeMinor: 0,
    requiresPhysicalPresence: config.requiresPhysicalBiometrics,
    instructions: `Physical submission at ${matchedCentre.centreName} is required for document handover and biometrics.`,
    routeKey,
    asStickerRoute,
  };
}

/**
 * Returns available submission routes for a sticker visa to populate UI dropdowns.
 */
export function getStandardStickerRoutesForVisa(visa: VisaType): VisaStickerRoute[] {
  // If visa already has explicit routes in DB, prefer those
  if (visa.stickerRoutes?.length) return visa.stickerRoutes;
  if (visa.courierRules?.routes?.length) return visa.courierRules.routes;

  const config = getDestinationConfig(visa.destinationCode, visa.destination);
  const commonOriginCities = [
    'New Delhi',
    'Mumbai',
    'Chennai',
    'Kolkata',
    'Bengaluru',
    'Hyderabad',
    'Ahmedabad',
    'Kochi',
    'Tiruchirappalli',
    'Pune',
    'Chandigarh',
    'Jalandhar',
    'Jaipur',
    'Goa',
  ];

  return commonOriginCities.map((city) => {
    const resolved = resolveStickerSubmissionRoute(visa, { passportOriginCity: city });
    return resolved.asStickerRoute;
  });
}
