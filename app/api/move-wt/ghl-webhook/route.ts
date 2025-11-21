import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to normalize phone numbers
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

// Helper function to build full address string
const buildFullAddress = (city: string, state: string, zip: string): string => {
  const parts = [];
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (zip) parts.push(zip);
  return parts.join(', ');
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[ghl-webhook] Received webhook:', JSON.stringify(body, null, 2));

    // GHL webhook payload structure varies - extract contact data
    // The contact can be in body directly or nested under 'contact'
    const contact = body.contact || body;
    const tags = contact.tags || [];

    // Check if contact has "equate media" tag
    const hasEquateMediaTag = tags.some((tag: string | { name?: string }) => {
      const tagName = typeof tag === 'string' ? tag : tag.name;
      return tagName === 'equate media' || tagName?.toLowerCase() === 'equate media';
    });

    if (!hasEquateMediaTag) {
      console.log('[ghl-webhook] Contact does not have equate media tag, skipping');
      return NextResponse.json({
        success: true,
        message: 'Contact does not have Equate Media tag, skipped'
      });
    }

    console.log('[ghl-webhook] Equate Media tag found, processing contact');

    // Extract contact information from GHL
    // GHL field names can vary - check common variations
    const firstName = contact.firstName || contact.first_name || contact.name?.split(' ')[0] || '';
    const lastName = contact.lastName || contact.last_name || contact.name?.split(' ').slice(1).join(' ') || '';
    const email = contact.email || '';
    const phone = contact.phone || contact.phoneNumber || contact.phone_number || '';

    // Extract custom fields - GHL stores these in customField array or customFields object
    const customFields = contact.customField || contact.customFields || contact.custom_fields || {};

    // Try to find move date - check various possible field names
    let preferredDate = '';
    if (Array.isArray(customFields)) {
      const dateField = customFields.find((f: any) =>
        f.key?.toLowerCase().includes('move') && f.key?.toLowerCase().includes('date') ||
        f.key?.toLowerCase().includes('preferred') && f.key?.toLowerCase().includes('date') ||
        f.id?.toLowerCase().includes('move_date') ||
        f.id?.toLowerCase().includes('preferred_date')
      );
      preferredDate = dateField?.value || '';
    } else if (typeof customFields === 'object') {
      preferredDate = customFields.move_date || customFields.moveDate ||
                     customFields.preferred_date || customFields.preferredDate ||
                     customFields['Move Date'] || customFields['Preferred Date'] || '';
    }

    // Extract from/to location fields
    let fromCity = '', fromState = '', fromZip = '';
    let toCity = '', toState = '', toZip = '';

    if (Array.isArray(customFields)) {
      customFields.forEach((f: any) => {
        const key = (f.key || f.id || '').toLowerCase();
        const value = f.value || '';

        // From location
        if (key.includes('from') && key.includes('city')) fromCity = value;
        else if (key.includes('from') && key.includes('state')) fromState = value;
        else if (key.includes('from') && key.includes('zip')) fromZip = value;

        // To location
        else if (key.includes('to') && key.includes('city')) toCity = value;
        else if (key.includes('to') && key.includes('state')) toState = value;
        else if (key.includes('to') && key.includes('zip')) toZip = value;
      });
    } else if (typeof customFields === 'object') {
      // Try common naming patterns
      fromCity = customFields.from_city || customFields.fromCity || customFields['From City'] || '';
      fromState = customFields.from_state || customFields.fromState || customFields['From State'] || '';
      fromZip = customFields.from_zip || customFields.fromZip || customFields['From Zip'] || '';
      toCity = customFields.to_city || customFields.toCity || customFields['To City'] || '';
      toState = customFields.to_state || customFields.toState || customFields['To State'] || '';
      toZip = customFields.to_zip || customFields.toZip || customFields['To Zip'] || '';
    }

    // Also check top-level address fields from GHL (used as "from" location)
    if (!fromCity && contact.city) fromCity = contact.city;
    if (!fromState && contact.state) fromState = contact.state;
    if (!fromZip && (contact.postalCode || contact.zip)) fromZip = contact.postalCode || contact.zip;

    console.log('[ghl-webhook] Location data - From:', { fromCity, fromState, fromZip }, 'To:', { toCity, toState, toZip });

    const normalizedPhone = normalizePhoneNumber(phone);

    // Build form data matching the move-wt form structure
    const formData = {
      // Service Type - defaults
      serviceType: "truck",
      travelBilling: "local",
      travelCost: "",

      // Customer Information
      firstName,
      lastName,
      company: contact.companyName || contact.company || '',
      phone: normalizedPhone,
      phoneName: '',
      email,
      emailName: '',

      // Customer home address type - default to pickup
      customerHomeAddressType: "pickup",
      laborOnlySameAddress: true,

      // Pickup Address (From location)
      pickupAddress: "",
      pickupUnit: "",
      pickupCity: fromCity,
      pickupState: fromState,
      pickupZip: fromZip,
      pickupLocationType: "house",
      pickupLocationOther: "",
      pickupBusinessName: "",
      pickupBusinessSquareFeet: "",
      pickupOtherSquareFeet: "",
      pickupHouseSquareFeet: "",
      pickupZestimate: "",
      pickupHowFurnished: 80,
      pickupApartmentSquareFeet: "",
      pickupApartmentBedBath: "",
      pickupApartmentHowFurnished: 80,
      pickupStorageUnitQuantity: 1,
      pickupStorageUnitSizes: [""],
      pickupStorageUnitHowFull: [""],
      pickupStorageUnitConditioned: [""],
      pickupTruckPodLength: "",
      pickupTruckPodWidth: "",
      pickupTruckPodHowFull: 100,

      // Delivery Address (To location)
      deliveryAddress: "",
      deliveryUnit: "",
      deliveryCity: toCity,
      deliveryState: toState,
      deliveryZip: toZip,
      deliveryLocationType: "house",
      deliveryLocationOther: "",
      deliveryBusinessName: "",
      deliveryHouseSquareFeet: "",
      deliveryZestimate: "",
      deliveryHowFurnished: 80,
      deliveryApartmentSquareFeet: "",
      deliveryApartmentBedBath: "",
      deliveryApartmentHowFurnished: 80,
      deliveryStorageUnitQuantity: 1,
      deliveryStorageUnitSizes: [""],
      deliveryStorageUnitConditioned: [""],
      deliveryPODQuantity: 1,
      deliveryPODSize: "",
      deliveryTruckLength: "",
      deliveryAddressUnknown: false,

      // Additional Stop - defaults
      hasAdditionalStop: false,
      additionalStopAddress: "",
      additionalStopUnit: "",
      additionalStopCity: "",
      additionalStopState: "",
      additionalStopZip: "",
      additionalStopLocationType: "house",
      additionalStopLocationOther: "",
      additionalStopBusinessName: "",
      additionalStopHouseSquareFeet: "",
      additionalStopZestimate: "",
      additionalStopHowFurnished: 80,
      additionalStopApartmentBedBath: "",
      additionalStopStorageUnitQuantity: 1,
      additionalStopStorageUnitSizes: [""],
      additionalStopStorageUnitConditioned: [""],
      additionalStopNotes: "",

      // Property Access - defaults
      pickupStairs: 1,
      pickupNarrowDoorways: false,
      pickupElevator: false,
      pickupParkingDistance: "close",
      pickupAccessNotes: "",
      deliveryStairs: 1,
      deliveryNarrowDoorways: false,
      deliveryElevator: false,
      deliveryParkingDistance: "close",
      deliveryAccessNotes: "",

      // Heavy/Special Items - all false by default
      gunSafes: false,
      gunSafesQty: 1,
      gunSafesDetails: "",
      pianos: false,
      pianosQty: 1,
      pianosDetails: "",
      poolTables: false,
      poolTablesQty: 1,
      poolTablesDetails: "",
      otherHeavyItems: false,
      otherHeavyItemsDetails: "",
      largeTVs: false,
      largeTVsQty: 1,
      largeTVsDetails: "",
      purpleGreenMattress: false,
      purpleGreenMattressDetails: "",
      treadmills: false,
      treadmillsDetails: "",
      largeAppliances: false,
      applianceFridge: false,
      applianceFridgeQty: 1,
      applianceWasher: false,
      applianceWasherQty: 1,
      applianceDryer: false,
      applianceDryerQty: 1,
      applianceOven: false,
      applianceOvenQty: 1,
      applianceDishwasher: false,
      applianceDishwasherQty: 1,
      applianceOtherDetails: "",
      plants: false,
      plantsDetails: "",
      bunkBeds: false,
      bunkBedsQty: 1,
      bunkBedsDetails: "",
      trampoline: false,
      trampolineQty: 1,
      trampolineDetails: "",
      tableSaw: false,
      tableSawQty: 1,
      tableSawDetails: "",
      gymEquipment: false,
      gymEquipmentQty: 1,
      gymEquipmentDetails: "",
      sauna: false,
      saunaQty: 1,
      saunaDetails: "",
      playsets: false,
      playsetsQty: 1,
      playsetsDetails: "",
      specialDisassemblyOther: false,
      specialDisassemblyOtherDetails: "",

      // Other defaults
      catsPresent: false,
      packingStatus: "moderate",
      needsPacking: false,
      packingKitchen: false,
      packingGarage: false,
      packingAttic: false,
      packingWardrobeBoxes: false,
      packingFragileItems: false,
      junkRemovalNeeded: false,
      junkRemovalAmount: "",
      junkRemovalDetails: "",
      needsInsurance: false,
      estimatedValue: "",
      preferredDate: preferredDate,
      moveDateUnknown: false,
      timeFlexible: false,
      readyToSchedule: false,
      timingNotes: "",
      estimatedCrewSize: "2-3",
      crewSizeNotes: "",
      specialRequests: "",
      fixedBudgetRequested: false,
      desiredBudget: "",
      houseQuality: 3,
      hd4Wheel: false,
      airSled: false,
      applianceDolly: false,
      socketWrenches: false,
      safeDolly: false,
      toolCustom1: "",
      toolCustom2: "",
      toolCustom3: "",

      // Store phones and emails as arrays
      phones: normalizedPhone ? [{ number: normalizedPhone, name: '' }] : [],
      emails: email ? [{ email, name: '' }] : [],

      // Quote data - empty defaults
      quoteItems: [],
      total: 0,
      baseRate: 0,

      // Source tracking
      source: 'equate-media',
      ghlContactId: contact.id || contact.contactId || '',
    };

    // Generate a temporary job number based on phone
    const tempJobNumber = `TEMP-${normalizedPhone || Date.now()}`;

    // Build customer home address for uniqueness
    const customerHomeAddress = buildFullAddress(fromCity, fromState, fromZip);

    console.log('[ghl-webhook] Saving form with data:', {
      tempJobNumber,
      customerHomeAddress,
      firstName,
      lastName,
      phone: normalizedPhone,
      email,
      fromCity, fromState, fromZip,
      toCity, toState, toZip,
      preferredDate
    });

    // Check if this address already exists
    let existingRecord = null;
    if (customerHomeAddress && customerHomeAddress.trim()) {
      const { data: existing } = await supabase
        .from('move_quote')
        .select('*')
        .eq('customer_home_address', customerHomeAddress)
        .maybeSingle();
      existingRecord = existing;
    }

    // Also check by phone number if no address match
    if (!existingRecord && normalizedPhone) {
      const { data: existingByPhone } = await supabase
        .from('move_quote')
        .select('*')
        .contains('phone_numbers', [normalizedPhone])
        .maybeSingle();
      existingRecord = existingByPhone;
    }

    if (existingRecord) {
      // Update existing record
      console.log('[ghl-webhook] Found existing record, updating...');

      const { data, error } = await supabase
        .from('move_quote')
        .update({
          form_data: formData,
          move_date: preferredDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRecord.id)
        .select();

      if (error) {
        console.error('[ghl-webhook] Update error:', error);
        return NextResponse.json(
          { error: 'Failed to update form data' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Existing record updated from Equate Media lead',
        quoteNumber: existingRecord.quote_number,
        isExisting: true,
      });

    } else {
      // Insert new record
      console.log('[ghl-webhook] Creating new record...');

      const { data, error } = await supabase
        .from('move_quote')
        .insert({
          job_number: tempJobNumber,
          job_numbers: [tempJobNumber],
          customer_home_address: customerHomeAddress || null,
          address: customerHomeAddress || 'Equate Media Lead',
          phone_number: normalizedPhone,
          phone_numbers: normalizedPhone ? [normalizedPhone] : [],
          form_data: formData,
          move_date: preferredDate || null,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('[ghl-webhook] Insert error:', error);
        return NextResponse.json(
          { error: 'Failed to save form data' },
          { status: 500 }
        );
      }

      console.log('[ghl-webhook] New record created with quote number:', data[0]?.quote_number);

      return NextResponse.json({
        success: true,
        message: 'New form created from Equate Media lead',
        quoteNumber: data[0]?.quote_number,
        isExisting: false,
      });
    }

  } catch (error) {
    console.error('[ghl-webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for webhook verification (some services require this)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'GHL webhook endpoint active'
  });
}
