/**
 * Canonical Indian Passport Location Resolver
 *
 * Maps raw OCR passport place of issue strings (including historical names,
 * abbreviations, and common OCR variants) to official MEA Regional Passport
 * Offices (RPOs), canonical cities, states, and geographic zones.
 */

export type IndianRegionZone = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'CENTRAL' | 'NORTHEAST';

export interface ResolvedPassportLocation {
  raw: string;
  normalizedCity: string;
  state: string;
  stateCode: string;
  rpo: string;
  zone: IndianRegionZone;
  isIndian: boolean;
}

interface PassportLocationRecord {
  city: string;
  state: string;
  stateCode: string;
  rpo: string;
  zone: IndianRegionZone;
  aliases: string[];
}

const PASSPORT_LOCATION_DIRECTORY: PassportLocationRecord[] = [
  // SOUTH ZONE
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    stateCode: 'TN',
    rpo: 'Chennai',
    zone: 'SOUTH',
    aliases: ['MADRAS', 'CHENNAI', 'CHENNNAI', 'CHN', 'TAMIL NADU', 'TAMILNADU', 'TN'],
  },
  {
    city: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    stateCode: 'TN',
    rpo: 'Tiruchirappalli',
    zone: 'SOUTH',
    aliases: ['TRICHY', 'TIRUCHY', 'TIRUCHIRAPPALLI', 'TRICHIRAPALLI', 'TIRUCHIRAPALLI', 'TIRUCHIRAPALLY', 'TRICHIRAPPALLI', 'TIRUCHY RPO'],
  },
  {
    city: 'Madurai',
    state: 'Tamil Nadu',
    stateCode: 'TN',
    rpo: 'Madurai',
    zone: 'SOUTH',
    aliases: ['MADURAI', 'MDU'],
  },
  {
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    stateCode: 'TN',
    rpo: 'Coimbatore',
    zone: 'SOUTH',
    aliases: ['COIMBATORE', 'CBE', 'KOVAI'],
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    stateCode: 'KA',
    rpo: 'Bengaluru',
    zone: 'SOUTH',
    aliases: ['BANGALORE', 'BENGALURU', 'BLR', 'KARNATAKA', 'KA'],
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    stateCode: 'TS',
    rpo: 'Hyderabad',
    zone: 'SOUTH',
    aliases: ['HYDERABAD', 'SECUNDERABAD', 'HYD', 'TELANGANA', 'TS'],
  },
  {
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    stateCode: 'AP',
    rpo: 'Vijayawada',
    zone: 'SOUTH',
    aliases: ['VIJAYAWADA', 'BZA', 'ANDHRA PRADESH', 'AP', 'ANDHRA'],
  },
  {
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    stateCode: 'AP',
    rpo: 'Visakhapatnam',
    zone: 'SOUTH',
    aliases: ['VISAKHAPATNAM', 'VIZAG', 'VSKP', 'WALTAIR'],
  },
  {
    city: 'Kochi',
    state: 'Kerala',
    stateCode: 'KL',
    rpo: 'Cochin',
    zone: 'SOUTH',
    aliases: ['COCHIN', 'KOCHI', 'ERNAKULAM', 'KERALA', 'KL'],
  },
  {
    city: 'Kozhikode',
    state: 'Kerala',
    stateCode: 'KL',
    rpo: 'Kozhikode',
    zone: 'SOUTH',
    aliases: ['CALICUT', 'KOZHIKODE', 'CLT'],
  },
  {
    city: 'Thiruvananthapuram',
    state: 'Kerala',
    stateCode: 'KL',
    rpo: 'Trivandrum',
    zone: 'SOUTH',
    aliases: ['TRIVANDRUM', 'THIRUVANANTHAPURAM', 'TRV', 'TVM'],
  },
  {
    city: 'Malappuram',
    state: 'Kerala',
    stateCode: 'KL',
    rpo: 'Malappuram',
    zone: 'SOUTH',
    aliases: ['MALAPPURAM', 'MLPM'],
  },

  // WEST ZONE
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: 'MH',
    rpo: 'Mumbai',
    zone: 'WEST',
    aliases: ['BOMBAY', 'MUMBAI', 'BOM', 'MAHARASHTRA', 'MH'],
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: 'MH',
    rpo: 'Pune',
    zone: 'WEST',
    aliases: ['PUNE', 'POONA', 'PNQ'],
  },
  {
    city: 'Nagpur',
    state: 'Maharashtra',
    stateCode: 'MH',
    rpo: 'Nagpur',
    zone: 'WEST',
    aliases: ['NAGPUR', 'NAG'],
  },
  {
    city: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: 'GJ',
    rpo: 'Ahmedabad',
    zone: 'WEST',
    aliases: ['AHMEDABAD', 'AMD', 'AMDAVAD', 'GUJARAT', 'GJ'],
  },
  {
    city: 'Surat',
    state: 'Gujarat',
    stateCode: 'GJ',
    rpo: 'Surat',
    zone: 'WEST',
    aliases: ['SURAT', 'ST'],
  },
  {
    city: 'Panaji',
    state: 'Goa',
    stateCode: 'GA',
    rpo: 'Goa',
    zone: 'WEST',
    aliases: ['GOA', 'PANAJI', 'PANJIM', 'GA'],
  },

  // EAST ZONE
  {
    city: 'Kolkata',
    state: 'West Bengal',
    stateCode: 'WB',
    rpo: 'Kolkata',
    zone: 'EAST',
    aliases: ['CALCUTTA', 'KOLKATA', 'CCU', 'WEST BENGAL', 'WB', 'BENGAL'],
  },
  {
    city: 'Patna',
    state: 'Bihar',
    stateCode: 'BR',
    rpo: 'Patna',
    zone: 'EAST',
    aliases: ['PATNA', 'PAT', 'BIHAR', 'BR'],
  },
  {
    city: 'Ranchi',
    state: 'Jharkhand',
    stateCode: 'JH',
    rpo: 'Ranchi',
    zone: 'EAST',
    aliases: ['RANCHI', 'RNC', 'JHARKHAND', 'JH'],
  },
  {
    city: 'Bhubaneswar',
    state: 'Odisha',
    stateCode: 'OD',
    rpo: 'Bhubaneswar',
    zone: 'EAST',
    aliases: ['BHUBANESWAR', 'BHUBANESHWAR', 'BBI', 'ODISHA', 'ORISSA', 'OD'],
  },

  // NORTH ZONE
  {
    city: 'New Delhi',
    state: 'Delhi',
    stateCode: 'DL',
    rpo: 'Delhi',
    zone: 'NORTH',
    aliases: ['DELHI', 'NEW DELHI', 'DLI', 'NDLS', 'DL', 'NCR'],
  },
  {
    city: 'Chandigarh',
    state: 'Chandigarh',
    stateCode: 'CH',
    rpo: 'Chandigarh',
    zone: 'NORTH',
    aliases: ['CHANDIGARH', 'CHD', 'CH'],
  },
  {
    city: 'Amritsar',
    state: 'Punjab',
    stateCode: 'PB',
    rpo: 'Amritsar',
    zone: 'NORTH',
    aliases: ['AMRITSAR', 'ASR', 'PUNJAB', 'PB'],
  },
  {
    city: 'Jalandhar',
    state: 'Punjab',
    stateCode: 'PB',
    rpo: 'Jalandhar',
    zone: 'NORTH',
    aliases: ['JALANDHAR', 'JUC', 'JUL'],
  },
  {
    city: 'Jaipur',
    state: 'Rajasthan',
    stateCode: 'RJ',
    rpo: 'Jaipur',
    zone: 'NORTH',
    aliases: ['JAIPUR', 'JAI', 'RAJASTHAN', 'RJ'],
  },
  {
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    stateCode: 'UP',
    rpo: 'Lucknow',
    zone: 'NORTH',
    aliases: ['LUCKNOW', 'LKO', 'UTTAR PRADESH', 'UP'],
  },
  {
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    stateCode: 'UP',
    rpo: 'Ghaziabad',
    zone: 'NORTH',
    aliases: ['GHAZIABAD', 'GZB', 'NOIDA', 'GREATER NOIDA'],
  },
  {
    city: 'Bareilly',
    state: 'Uttar Pradesh',
    stateCode: 'UP',
    rpo: 'Bareilly',
    zone: 'NORTH',
    aliases: ['BAREILLY', 'BLY'],
  },
  {
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    stateCode: 'UP',
    rpo: 'Varanasi',
    zone: 'NORTH',
    aliases: ['VARANASI', 'BENARAS', 'BANARAS', 'BSB'],
  },
  {
    city: 'Dehradun',
    state: 'Uttarakhand',
    stateCode: 'UK',
    rpo: 'Dehradun',
    zone: 'NORTH',
    aliases: ['DEHRADUN', 'DDN', 'UTTARAKHAND', 'UK', 'UTTARANCHAL'],
  },
  {
    city: 'Shimla',
    state: 'Himachal Pradesh',
    stateCode: 'HP',
    rpo: 'Shimla',
    zone: 'NORTH',
    aliases: ['SHIMLA', 'SIMLA', 'HIMACHAL PRADESH', 'HP'],
  },
  {
    city: 'Jammu',
    state: 'Jammu and Kashmir',
    stateCode: 'JK',
    rpo: 'Jammu',
    zone: 'NORTH',
    aliases: ['JAMMU', 'JMU', 'JAMMU AND KASHMIR', 'JK'],
  },
  {
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    stateCode: 'JK',
    rpo: 'Srinagar',
    zone: 'NORTH',
    aliases: ['SRINAGAR', 'SXR'],
  },

  // CENTRAL ZONE
  {
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    stateCode: 'MP',
    rpo: 'Bhopal',
    zone: 'CENTRAL',
    aliases: ['BHOPAL', 'BPL', 'MADHYA PRADESH', 'MP'],
  },
  {
    city: 'Raipur',
    state: 'Chhattisgarh',
    stateCode: 'CG',
    rpo: 'Raipur',
    zone: 'CENTRAL',
    aliases: ['RAIPUR', 'RPR', 'CHHATTISGARH', 'CG'],
  },

  // NORTHEAST ZONE
  {
    city: 'Guwahati',
    state: 'Assam',
    stateCode: 'AS',
    rpo: 'Guwahati',
    zone: 'NORTHEAST',
    aliases: ['GUWAHATI', 'GAUHATI', 'GAU', 'ASSAM', 'AS', 'NORTH EAST', 'NORTHEAST'],
  },
];

function cleanOcrString(input?: string | null): string {
  if (!input) return '';
  return input
    .toUpperCase()
    .replace(/[,\.\-\/\\#]/g, ' ')
    .replace(/\b(RPO|PASSPORT OFFICE|OFFICE|CITY|INDIA|IND|DISTRICT|DIST)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves a raw Indian passport place of issue string to canonical city, state, RPO and zone.
 */
export function resolveIndianPassportLocation(rawInput?: string | null): ResolvedPassportLocation | null {
  if (!rawInput) return null;
  const rawClean = rawInput.trim();
  if (!rawClean) return null;

  const normalized = cleanOcrString(rawClean);
  if (!normalized) return null;

  // 1. Direct match by exact alias or city name
  for (const record of PASSPORT_LOCATION_DIRECTORY) {
    if (record.city.toUpperCase() === normalized) {
      return {
        raw: rawClean,
        normalizedCity: record.city,
        state: record.state,
        stateCode: record.stateCode,
        rpo: record.rpo,
        zone: record.zone,
        isIndian: true,
      };
    }
    for (const alias of record.aliases) {
      if (alias === normalized) {
        return {
          raw: rawClean,
          normalizedCity: record.city,
          state: record.state,
          stateCode: record.stateCode,
          rpo: record.rpo,
          zone: record.zone,
          isIndian: true,
        };
      }
    }
  }

  // 2. Word-boundary token / substring matching for OCR multi-word place of issue
  // e.g. "RPO TIRUCHIRAPPALLI", "CALCUTTA, WEST BENGAL", "MADRAS INDIA"
  for (const record of PASSPORT_LOCATION_DIRECTORY) {
    for (const alias of record.aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(normalized)) {
        return {
          raw: rawClean,
          normalizedCity: record.city,
          state: record.state,
          stateCode: record.stateCode,
          rpo: record.rpo,
          zone: record.zone,
          isIndian: true,
        };
      }
    }
  }

  // 3. Fallback for unlisted Indian cities: return as is with generic zone
  return {
    raw: rawClean,
    normalizedCity: rawClean.charAt(0).toUpperCase() + rawClean.slice(1).toLowerCase(),
    state: 'Other India',
    stateCode: 'IN',
    rpo: rawClean,
    zone: 'NORTH',
    isIndian: true,
  };
}

/**
 * Returns all recognized Indian passport origin cities for dropdown selection.
 */
export function getAvailablePassportOriginCities(): { id: string; label: string; city: string; state: string; zone: IndianRegionZone }[] {
  return PASSPORT_LOCATION_DIRECTORY.map((record) => ({
    id: record.city.toLowerCase().replace(/\s+/g, '_'),
    label: `${record.city} (${record.state})`,
    city: record.city,
    state: record.state,
    zone: record.zone,
  }));
}
