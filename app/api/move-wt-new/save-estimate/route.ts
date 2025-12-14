import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Generate a unique 6-character alphanumeric quote ID
function generateQuoteId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
    const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If we have an existing estimate ID, update it
    if (body.estimateId) {
      const updateData: Record<string, any> = {
        // Customer Info
        full_name: body.fullName || null,
        first_name: body.firstName || null,
        last_name: body.lastName || null,
        phone: body.phone || null,
        email: body.email || null,

        // Service Type
        service_type: body.serviceType || 'truck',

        // Move Date/Time
        move_date: body.moveDate || null,
        time_slot: body.timeSlot || null,
        move_date_flexible: body.moveDateFlexible || false,

        // Addresses
        from_address: body.fromAddress || null,
        to_address: body.toAddress || null,

        // FROM Location
        from_property_type: body.fromPropertyType || null,
        from_bedrooms: body.fromBedrooms || null,
        from_square_footage: body.fromSquareFootage || null,
        from_garage: body.fromGarage || null,
        from_stories: body.fromStories || null,
        from_floor_level: body.fromFloorLevel || null,
        from_elevator: body.fromElevator || null,
        from_unit: body.fromUnit || null,
        from_storage_units: body.fromStorageUnits || null,
        from_is_current_home: body.fromIsCurrentHome ?? true,
        from_details: body.fromDetails || null,

        // TO Location
        to_property_type: body.toPropertyType || null,
        to_stories: body.toStories || null,
        to_floor_level: body.toFloorLevel || null,
        to_elevator: body.toElevator || null,
        to_unit: body.toUnit || null,
        to_storage_units: body.toStorageUnits || null,
        to_is_current_home: body.toIsCurrentHome ?? false,
        to_details: body.toDetails || null,

        // STOP Location
        has_stop: body.hasStop ?? false,
        stop_address: body.stopAddress || null,
        stop_property_type: body.stopPropertyType || null,
        stop_action: body.stopAction || null,
        stop_bedrooms: body.stopBedrooms || null,
        stop_square_footage: body.stopSquareFootage || null,
        stop_garage: body.stopGarage || null,
        stop_stories: body.stopStories || null,
        stop_floor_level: body.stopFloorLevel || null,
        stop_elevator: body.stopElevator || null,
        stop_unit: body.stopUnit || null,
        stop_storage_units: body.stopStorageUnits || null,
        stop_details: body.stopDetails || null,
        stop_belongings_amount: body.stopBelongingsAmount || null,
        stop_heavy_items: body.stopHeavyItems || null,
        stop_heavy_items_details: body.stopHeavyItemsDetails || null,

        // Belongings & Heavy Items
        belongings_amount: body.belongingsAmount || null,
        heavy_items: body.heavyItems || null,
        gun_safe_over_300: body.gunSafeOver300 || null,
        gun_safe_ground_level: body.gunSafeGroundLevel || null,
        piano_type: body.pianoType || null,
        piano_ground_level: body.pianoGroundLevel || null,
        pool_table_disassembly: body.poolTableDisassembly || null,
        pool_table_ground_level: body.poolTableGroundLevel || null,
        mattress_ground_level: body.mattressGroundLevel || null,
        tv_count: body.tvCount || null,
        computer_count: body.computerCount || null,
        exercise_equipment_types: body.exerciseEquipmentTypes || null,
        tool_types: body.toolTypes || null,
        tool_other_text: body.toolOtherText || null,
        heavy_items_other_text: body.heavyItemsOtherText || null,

        // Labor Only Service
        labor_service_type: body.laborServiceType || null,
        labor_item_amount: body.laborItemAmount || null,
        loading_item_amount: body.loadingItemAmount || null,
        office_item_amount: body.officeItemAmount || null,
        truck_pod_lengths: body.truckPodLengths || null,
        unloading_trucks: body.unloadingTrucks || null,
        unloading_storage_type: body.unloadingStorageType || null,
        customer_address: body.customerAddress || null,

        // Route Info
        total_distance: body.totalDistance || null,
        total_duration: body.totalDuration || null,
        route_legs: body.routeLegs || null,

        // Other Services
        packing_amount: body.packingAmount || null,
        packing_rooms: body.packingRooms || null,
        junk_removal_amount: body.junkRemovalAmount || null,

        // Employee App specific fields
        workiz_job_number: body.workizJobNumber || null,
        tags: body.tags || null,
        source: 'employee_app',

        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('move_estimates')
        .update(updateData)
        .eq('id', body.estimateId)
        .select()
        .single();

      if (error) {
        console.error('[save-estimate] Update error:', error);
        return NextResponse.json(
          { error: 'Failed to update estimate', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        estimate: data,
        isUpdate: true,
      });
    }

    // Create new estimate
    // Generate unique quote_id
    let quoteId: string | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!quoteId && attempts < maxAttempts) {
      const candidateId = generateQuoteId();
      const { data: existing } = await supabase
        .from('move_estimates')
        .select('id')
        .eq('quote_id', candidateId)
        .single();

      if (!existing) {
        quoteId = candidateId;
      }
      attempts++;
    }

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Failed to generate unique quote ID' },
        { status: 500 }
      );
    }

    // Split name into first and last
    const fullName = body.fullName || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const newEstimateData = {
      quote_id: quoteId,

      // Customer Info
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone: body.phone || null,
      email: body.email || null,
      terms_accepted: true,

      // Service Type
      service_type: body.serviceType || 'truck',

      // Move Date/Time
      move_date: body.moveDate || null,
      time_slot: body.timeSlot || null,
      move_date_flexible: body.moveDateFlexible || false,

      // Addresses
      from_address: body.fromAddress || null,
      to_address: body.toAddress || null,

      // FROM Location
      from_property_type: body.fromPropertyType || null,
      from_bedrooms: body.fromBedrooms || null,
      from_square_footage: body.fromSquareFootage || null,
      from_garage: body.fromGarage || null,
      from_stories: body.fromStories || null,
      from_floor_level: body.fromFloorLevel || null,
      from_elevator: body.fromElevator || null,
      from_unit: body.fromUnit || null,
      from_storage_units: body.fromStorageUnits || null,
      from_is_current_home: body.fromIsCurrentHome ?? true,
      from_details: body.fromDetails || null,

      // TO Location
      to_property_type: body.toPropertyType || null,
      to_square_footage: body.toSquareFootage || null,
      to_stories: body.toStories || null,
      to_floor_level: body.toFloorLevel || null,
      to_elevator: body.toElevator || null,
      to_unit: body.toUnit || null,
      to_storage_units: body.toStorageUnits || null,
      to_is_current_home: body.toIsCurrentHome ?? false,
      to_details: body.toDetails || null,

      // STOP Location
      has_stop: body.hasStop ?? false,
      stop_address: body.stopAddress || null,
      stop_property_type: body.stopPropertyType || null,
      stop_action: body.stopAction || null,
      stop_bedrooms: body.stopBedrooms || null,
      stop_square_footage: body.stopSquareFootage || null,
      stop_garage: body.stopGarage || null,
      stop_stories: body.stopStories || null,
      stop_floor_level: body.stopFloorLevel || null,
      stop_elevator: body.stopElevator || null,
      stop_unit: body.stopUnit || null,
      stop_storage_units: body.stopStorageUnits || null,
      stop_details: body.stopDetails || null,
      stop_belongings_amount: body.stopBelongingsAmount || null,
      stop_heavy_items: body.stopHeavyItems || null,

      // Belongings & Heavy Items
      belongings_amount: body.belongingsAmount || null,
      heavy_items: body.heavyItems || null,
      gun_safe_over_300: body.gunSafeOver300 || null,
      gun_safe_ground_level: body.gunSafeGroundLevel || null,
      piano_type: body.pianoType || null,
      piano_ground_level: body.pianoGroundLevel || null,
      pool_table_disassembly: body.poolTableDisassembly || null,
      pool_table_ground_level: body.poolTableGroundLevel || null,
      mattress_ground_level: body.mattressGroundLevel || null,
      tv_count: body.tvCount || null,
      exercise_equipment_types: body.exerciseEquipmentTypes || null,
      tool_types: body.toolTypes || null,
      tool_other_text: body.toolOtherText || null,

      // Labor Only Service
      labor_service_type: body.laborServiceType || null,
      labor_item_amount: body.laborItemAmount || null,
      loading_item_amount: body.loadingItemAmount || null,
      office_item_amount: body.officeItemAmount || null,
      truck_pod_lengths: body.truckPodLengths || null,
      unloading_trucks: body.unloadingTrucks || null,
      unloading_storage_type: body.unloadingStorageType || null,

      // Route Info
      total_distance: body.totalDistance || null,
      total_duration: body.totalDuration || null,

      // Other Services
      packing_amount: body.packingAmount || null,
      packing_rooms: body.packingRooms || null,
      junk_removal_amount: body.junkRemovalAmount || null,

      // Employee App specific
      workiz_job_number: body.workizJobNumber || null,
      tags: body.tags || null,
      source: 'employee_app',
      status: 'pending',
      quote_status: 'pending',
    };

    console.log('[save-estimate] Creating new estimate with data:', JSON.stringify(newEstimateData, null, 2));

    const { data, error } = await supabase
      .from('move_estimates')
      .insert([newEstimateData])
      .select()
      .single();

    if (error) {
      console.error('[save-estimate] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create estimate', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      estimate: data,
      isUpdate: false,
      quoteId: quoteId,
    });
  } catch (error) {
    console.error('[save-estimate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
