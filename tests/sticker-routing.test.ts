import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveIndianPassportLocation,
  getAvailablePassportOriginCities,
} from '../src/lib/ocr/passport-location-resolver.ts';
import {
  resolveStickerSubmissionRoute,
  getStandardStickerRoutesForVisa,
} from '../src/lib/sticker-routing.ts';
import { resolveVisaPricing } from '../src/lib/pricing.ts';
import { isTouristVisa, validateTravelDates } from '../src/lib/visa-rules.ts';
import type { VisaType } from '../src/types/index.ts';

test('resolves Indian passport place of issue aliases to canonical city, state, and RPO', () => {
  // Tiruchirappalli / Trichy variants
  const trichy1 = resolveIndianPassportLocation('TIRUCHY');
  assert.equal(trichy1?.normalizedCity, 'Tiruchirappalli');
  assert.equal(trichy1?.state, 'Tamil Nadu');
  assert.equal(trichy1?.stateCode, 'TN');
  assert.equal(trichy1?.rpo, 'Tiruchirappalli');
  assert.equal(trichy1?.zone, 'SOUTH');

  const trichy2 = resolveIndianPassportLocation('RPO TRICHIRAPALLI');
  assert.equal(trichy2?.normalizedCity, 'Tiruchirappalli');
  assert.equal(trichy2?.stateCode, 'TN');

  // Kolkata / Calcutta
  const calcutta = resolveIndianPassportLocation('CALCUTTA');
  assert.equal(calcutta?.normalizedCity, 'Kolkata');
  assert.equal(calcutta?.state, 'West Bengal');
  assert.equal(calcutta?.stateCode, 'WB');
  assert.equal(calcutta?.zone, 'EAST');

  // Mumbai / Bombay
  const bombay = resolveIndianPassportLocation('BOMBAY');
  assert.equal(bombay?.normalizedCity, 'Mumbai');
  assert.equal(bombay?.state, 'Maharashtra');
  assert.equal(bombay?.stateCode, 'MH');
  assert.equal(bombay?.zone, 'WEST');

  // Chennai / Madras
  const madras = resolveIndianPassportLocation('MADRAS');
  assert.equal(madras?.normalizedCity, 'Chennai');
  assert.equal(madras?.stateCode, 'TN');
  assert.equal(madras?.zone, 'SOUTH');

  // Delhi / New Delhi
  const delhi = resolveIndianPassportLocation('NEW DELHI');
  assert.equal(delhi?.normalizedCity, 'New Delhi');
  assert.equal(delhi?.stateCode, 'DL');
  assert.equal(delhi?.zone, 'NORTH');

  // Bengaluru / Bangalore
  const bangalore = resolveIndianPassportLocation('BANGALORE');
  assert.equal(bangalore?.normalizedCity, 'Bengaluru');
  assert.equal(bangalore?.stateCode, 'KA');
  assert.equal(bangalore?.zone, 'SOUTH');

  // Kochi / Cochin
  const cochin = resolveIndianPassportLocation('COCHIN');
  assert.equal(cochin?.normalizedCity, 'Kochi');
  assert.equal(cochin?.stateCode, 'KL');
  assert.equal(cochin?.zone, 'SOUTH');
});

test('resolves UK sticker visa submission centre based on passport origin city', () => {
  const mockUkVisa = {
    id: 'uk-standard-visitor',
    name: 'Standard Visitor Visa',
    destination: 'United Kingdom',
    destinationCode: 'GBR',
    category: 'STANDARD',
    entry: 'Multiple',
    visaKind: 'STICKER_VISA',
    purpose: 'Tourism, business, family visits',
    validity: '6 Months',
    duration: '180 Days',
    processingTime: '3 Weeks',
    price: 13500,
    amountMinor: 1350000,
    currency: 'INR',
    documents: ['Passport', 'Photo'],
    documentRequirements: { mandatory: [], optional: [], conditional: [] },
  } as unknown as VisaType;

  // 1. Kolkata passport -> Kolkata VFS VAC
  const kolkataRoute = resolveStickerSubmissionRoute(mockUkVisa, {
    passportOriginCity: 'Kolkata',
  });
  assert.equal(kolkataRoute.isVerified, true);
  assert.equal(kolkataRoute.submissionCity, 'Kolkata');
  assert.match(kolkataRoute.submissionCentreName, /Kolkata/i);
  assert.equal(kolkataRoute.serviceFeeAdjustmentMinor, 0);

  // 2. Tiruchirappalli passport -> Chennai VFS VAC
  const trichyRoute = resolveStickerSubmissionRoute(mockUkVisa, {
    passportOriginCity: 'Tiruchy',
  });
  assert.equal(trichyRoute.isVerified, true);
  assert.equal(trichyRoute.submissionCity, 'Chennai');
  assert.match(trichyRoute.submissionCentreName, /Chennai/i);

  // 3. Mumbai passport -> Mumbai VFS VAC
  const mumbaiRoute = resolveStickerSubmissionRoute(mockUkVisa, {
    passportOriginCity: 'Bombay',
  });
  assert.equal(mumbaiRoute.isVerified, true);
  assert.equal(mumbaiRoute.submissionCity, 'Mumbai');

  // 4. Delhi passport -> New Delhi VFS VAC
  const delhiRoute = resolveStickerSubmissionRoute(mockUkVisa, {
    passportOriginCity: 'New Delhi',
  });
  assert.equal(delhiRoute.isVerified, true);
  assert.equal(delhiRoute.submissionCity, 'New Delhi');
});

test('pricing engine prices sticker visas without false manual quotation blocking', () => {
  const mockUkVisa = {
    id: 'uk-standard-visitor',
    name: 'Standard Visitor Visa',
    destination: 'United Kingdom',
    destinationCode: 'GBR',
    category: 'STANDARD',
    entry: 'Multiple',
    visaKind: 'STICKER_VISA',
    purpose: 'Tourism and visitor',
    validity: '6 Months',
    duration: '180 Days',
    processingTime: '3 Weeks',
    price: 13500,
    amountMinor: 1350000,
    currency: 'INR',
    documents: [],
    stickerRoutes: [], // 0 routes in DB
  } as unknown as VisaType;

  // Pricing with Kolkata origin city
  const resultKolkata = resolveVisaPricing(mockUkVisa, {
    quantity: 1,
    routeKey: 'Kolkata',
  });
  assert.equal(resultKolkata.status, 'PRICED');
  assert.equal(resultKolkata.manualQuotationRequired, false);
  assert.equal(resultKolkata.visibleTotalMinor, 1350000);

  // Pricing with no origin city specified yet (nationwide standard)
  const resultDefault = resolveVisaPricing(mockUkVisa, {
    quantity: 1,
  });
  assert.equal(resultDefault.status, 'PRICED');
  assert.equal(resultDefault.manualQuotationRequired, false);
  assert.equal(resultDefault.visibleTotalMinor, 1350000);
});

test('tourist visa categories strictly enforce mandatory travel dates', () => {
  const touristVisa = {
    id: 'france-tourist',
    name: 'France Tourist Schengen Visa',
    destination: 'France',
    category: 'TOURIST',
    entry: 'Single',
    validity: '90 Days',
    duration: '30 Days',
    processingTime: '15 Days',
    price: 8500,
    documents: [],
  } as unknown as VisaType;

  // Missing both travel date and return date
  const missingBoth = validateTravelDates(touristVisa, '', '');
  assert.equal(missingBoth.length, 2);
  assert.equal(missingBoth[0].blocksSubmit, true);
  assert.match(missingBoth[0].message, /Departure \/ Travel Date is mandatory/i);
  assert.equal(missingBoth[1].blocksSubmit, true);
  assert.match(missingBoth[1].message, /Return Date is mandatory/i);

  // Missing return date only
  const missingReturn = validateTravelDates(touristVisa, '2026-10-01', '');
  assert.equal(missingReturn.length, 1);
  assert.match(missingReturn[0].message, /Return Date is mandatory/i);

  // Return date earlier than travel date
  const invertedDates = validateTravelDates(touristVisa, '2026-10-10', '2026-10-05');
  assert.equal(invertedDates.length, 1);
  assert.match(invertedDates[0].message, /Return Date cannot be earlier/i);

  // Valid dates provided
  const validDates = validateTravelDates(touristVisa, '2026-10-01', '2026-10-15');
  assert.equal(validDates.length, 0);
});

test('non-tourist visas (Work, Study, Business, PR) allow optional travel dates', () => {
  const workVisa = {
    id: 'germany-work',
    name: 'Germany EU Blue Card Employment Visa',
    destination: 'Germany',
    category: 'EMPLOYMENT',
    purpose: 'Long term employment under contract',
    entry: 'Multiple',
    validity: '1 Year',
    duration: '365 Days',
    processingTime: '6 Weeks',
    price: 12000,
    documents: [],
  } as unknown as VisaType;

  assert.equal(isTouristVisa(workVisa), false);

  // Empty travel dates should NOT block submission for non-tourist visa
  const workMissingDates = validateTravelDates(workVisa, '', '');
  assert.equal(workMissingDates.length, 0);

  const studentVisa = {
    id: 'uk-student',
    name: 'UK Student Visa (Tier 4)',
    destination: 'United Kingdom',
    category: 'STUDY',
    purpose: 'Higher education degree study',
    entry: 'Multiple',
    validity: '2 Years',
    duration: '730 Days',
    processingTime: '3 Weeks',
    price: 36000,
    documents: [],
  } as unknown as VisaType;

  assert.equal(isTouristVisa(studentVisa), false);
  const studentMissingDates = validateTravelDates(studentVisa, '', '');
  assert.equal(studentMissingDates.length, 0);
});

test('available passport origin cities directory is non-empty and well structured', () => {
  const cities = getAvailablePassportOriginCities();
  assert.ok(cities.length >= 25);
  const trichy = cities.find((c) => c.city === 'Tiruchirappalli');
  assert.ok(trichy);
  assert.equal(trichy?.state, 'Tamil Nadu');
  assert.equal(trichy?.zone, 'SOUTH');
});
