import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ADDRESS = '5015 N Lolo Pass Way, Meridian, ID 83646';

export async function POST(request: NextRequest) {
  try {
    const { pickupAddress, deliveryAddress, additionalStopAddress } = await request.json();

    if (!pickupAddress || !deliveryAddress) {
      return NextResponse.json(
        { error: 'Both pickup and delivery addresses are required' },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      console.error('[calculate-distance] Google Maps API key not found');
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    console.log('[calculate-distance] Calculating distances:');
    console.log('  Company -> Pickup:', COMPANY_ADDRESS, '->', pickupAddress);
    if (additionalStopAddress) {
      console.log('  Pickup -> Additional Stop:', pickupAddress, '->', additionalStopAddress);
      console.log('  Additional Stop -> Delivery:', additionalStopAddress, '->', deliveryAddress);
    } else {
      console.log('  Pickup -> Delivery:', pickupAddress, '->', deliveryAddress);
    }
    console.log('  Delivery -> Company:', deliveryAddress, '->', COMPANY_ADDRESS);

    // Calculate distance from company to pickup
    const toPickupUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(COMPANY_ADDRESS)}&destinations=${encodeURIComponent(pickupAddress)}&units=imperial&key=${googleApiKey}`;

    const toPickupResponse = await fetch(toPickupUrl);
    const toPickupData = await toPickupResponse.json();

    let pickupToAdditionalStopData = null;
    let additionalStopToDeliveryData = null;
    let pickupToDeliveryData = null;

    // Check if pickup and delivery addresses are the same (case-insensitive, trimmed)
    const pickupNormalized = pickupAddress.toLowerCase().trim();
    const deliveryNormalized = deliveryAddress.toLowerCase().trim();
    const samePickupAndDelivery = pickupNormalized === deliveryNormalized;

    if (samePickupAndDelivery) {
      console.log('[calculate-distance] Pickup and delivery addresses are identical, skipping API call for move travel');
    }

    if (additionalStopAddress) {
      // Calculate distance from pickup to additional stop
      const pickupToAdditionalStopUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickupAddress)}&destinations=${encodeURIComponent(additionalStopAddress)}&units=imperial&key=${googleApiKey}`;
      const pickupToAdditionalStopResponse = await fetch(pickupToAdditionalStopUrl);
      pickupToAdditionalStopData = await pickupToAdditionalStopResponse.json();

      // Calculate distance from additional stop to delivery
      const additionalStopToDeliveryUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(additionalStopAddress)}&destinations=${encodeURIComponent(deliveryAddress)}&units=imperial&key=${googleApiKey}`;
      const additionalStopToDeliveryResponse = await fetch(additionalStopToDeliveryUrl);
      additionalStopToDeliveryData = await additionalStopToDeliveryResponse.json();
    } else if (!samePickupAndDelivery) {
      // Calculate distance from pickup to delivery (no additional stop) - only if addresses are different
      const pickupToDeliveryUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickupAddress)}&destinations=${encodeURIComponent(deliveryAddress)}&units=imperial&key=${googleApiKey}`;
      const pickupToDeliveryResponse = await fetch(pickupToDeliveryUrl);
      pickupToDeliveryData = await pickupToDeliveryResponse.json();
    }

    // Calculate distance from delivery back to company
    const fromDeliveryUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(deliveryAddress)}&destinations=${encodeURIComponent(COMPANY_ADDRESS)}&units=imperial&key=${googleApiKey}`;

    const fromDeliveryResponse = await fetch(fromDeliveryUrl);
    const fromDeliveryData = await fromDeliveryResponse.json();

    console.log('[calculate-distance] To Pickup API Response:', JSON.stringify(toPickupData, null, 2));
    if (additionalStopAddress) {
      console.log('[calculate-distance] Pickup to Additional Stop API Response:', JSON.stringify(pickupToAdditionalStopData, null, 2));
      console.log('[calculate-distance] Additional Stop to Delivery API Response:', JSON.stringify(additionalStopToDeliveryData, null, 2));
    } else {
      console.log('[calculate-distance] Pickup to Delivery API Response:', JSON.stringify(pickupToDeliveryData, null, 2));
    }
    console.log('[calculate-distance] From Delivery API Response:', JSON.stringify(fromDeliveryData, null, 2));

    // Check for errors
    if (toPickupData.status !== 'OK' || fromDeliveryData.status !== 'OK') {
      console.error('[calculate-distance] API returned non-OK status');
      return NextResponse.json(
        { error: 'Failed to calculate distances. Please check addresses.' },
        { status: 400 }
      );
    }

    if (additionalStopAddress) {
      if (pickupToAdditionalStopData?.status !== 'OK' || additionalStopToDeliveryData?.status !== 'OK') {
        console.error('[calculate-distance] API returned non-OK status for additional stop routes');
        return NextResponse.json(
          { error: 'Failed to calculate distances with additional stop. Please check addresses.' },
          { status: 400 }
        );
      }
    } else if (!samePickupAndDelivery) {
      // Only check pickup to delivery if addresses are different
      if (pickupToDeliveryData?.status !== 'OK') {
        console.error('[calculate-distance] API returned non-OK status for pickup to delivery route');
        return NextResponse.json(
          { error: 'Failed to calculate distance from pickup to delivery. Please check addresses.' },
          { status: 400 }
        );
      }
    }

    const toPickupElement = toPickupData.rows[0]?.elements[0];
    const fromDeliveryElement = fromDeliveryData.rows[0]?.elements[0];

    if (toPickupElement?.status !== 'OK' || fromDeliveryElement?.status !== 'OK') {
      console.error('[calculate-distance] Could not find route for one or more addresses');
      return NextResponse.json(
        { error: 'Could not find route for provided addresses' },
        { status: 400 }
      );
    }

    let pickupToAdditionalStopElement = null;
    let additionalStopToDeliveryElement = null;
    let pickupToDeliveryElement = null;

    if (additionalStopAddress) {
      pickupToAdditionalStopElement = pickupToAdditionalStopData?.rows[0]?.elements[0];
      additionalStopToDeliveryElement = additionalStopToDeliveryData?.rows[0]?.elements[0];

      if (pickupToAdditionalStopElement?.status !== 'OK' || additionalStopToDeliveryElement?.status !== 'OK') {
        console.error('[calculate-distance] Could not find route for additional stop');
        return NextResponse.json(
          { error: 'Could not find route for additional stop address' },
          { status: 400 }
        );
      }
    } else if (!samePickupAndDelivery) {
      // Only extract pickup to delivery element if addresses are different
      pickupToDeliveryElement = pickupToDeliveryData?.rows[0]?.elements[0];

      if (pickupToDeliveryElement?.status !== 'OK') {
        console.error('[calculate-distance] Could not find route from pickup to delivery');
        return NextResponse.json(
          { error: 'Could not find route from pickup to delivery' },
          { status: 400 }
        );
      }
    }
    // If samePickupAndDelivery is true, pickupToDeliveryElement stays null and we'll use 0 miles/minutes

    // Extract distances and durations (in meters and seconds)
    const toPickupDistanceMeters = toPickupElement.distance.value;
    const toPickupDurationSeconds = toPickupElement.duration.value;
    const fromDeliveryDistanceMeters = fromDeliveryElement.distance.value;
    const fromDeliveryDurationSeconds = fromDeliveryElement.duration.value;

    // Convert to miles and minutes
    const toPickupMiles = toPickupDistanceMeters / 1609.34;
    const toPickupMinutes = Math.round(toPickupDurationSeconds / 60);
    const fromDeliveryMiles = fromDeliveryDistanceMeters / 1609.34;
    const fromDeliveryMinutes = Math.round(fromDeliveryDurationSeconds / 60);

    let pickupToDeliveryMiles = 0;
    let pickupToDeliveryMinutes = 0;
    let pickupToAdditionalStopMiles = 0;
    let pickupToAdditionalStopMinutes = 0;
    let additionalStopToDeliveryMiles = 0;
    let additionalStopToDeliveryMinutes = 0;

    if (additionalStopAddress && pickupToAdditionalStopElement && additionalStopToDeliveryElement) {
      // With additional stop
      const pickupToAdditionalStopDistanceMeters = pickupToAdditionalStopElement.distance.value;
      const pickupToAdditionalStopDurationSeconds = pickupToAdditionalStopElement.duration.value;
      const additionalStopToDeliveryDistanceMeters = additionalStopToDeliveryElement.distance.value;
      const additionalStopToDeliveryDurationSeconds = additionalStopToDeliveryElement.duration.value;

      pickupToAdditionalStopMiles = pickupToAdditionalStopDistanceMeters / 1609.34;
      pickupToAdditionalStopMinutes = Math.round(pickupToAdditionalStopDurationSeconds / 60);
      additionalStopToDeliveryMiles = additionalStopToDeliveryDistanceMeters / 1609.34;
      additionalStopToDeliveryMinutes = Math.round(additionalStopToDeliveryDurationSeconds / 60);

      // Total move travel is sum of both legs
      pickupToDeliveryMiles = pickupToAdditionalStopMiles + additionalStopToDeliveryMiles;
      pickupToDeliveryMinutes = pickupToAdditionalStopMinutes + additionalStopToDeliveryMinutes;
    } else if (pickupToDeliveryElement) {
      // Without additional stop
      const pickupToDeliveryDistanceMeters = pickupToDeliveryElement.distance.value;
      const pickupToDeliveryDurationSeconds = pickupToDeliveryElement.duration.value;

      pickupToDeliveryMiles = pickupToDeliveryDistanceMeters / 1609.34;
      pickupToDeliveryMinutes = Math.round(pickupToDeliveryDurationSeconds / 60);
    }
    // If samePickupAndDelivery is true, pickupToDeliveryMiles and pickupToDeliveryMinutes stay at 0
    if (samePickupAndDelivery) {
      console.log('[calculate-distance] Pickup and delivery are same address - move travel set to 0 miles, 0 minutes');
    }

    const totalMiles = toPickupMiles + fromDeliveryMiles;
    const totalMinutes = toPickupMinutes + fromDeliveryMinutes;
    const travelCharge = totalMiles * 2; // $2 per mile

    console.log('[calculate-distance] Results:');
    console.log('  To Pickup:', toPickupMiles.toFixed(2), 'miles,', toPickupMinutes, 'minutes');
    if (additionalStopAddress) {
      console.log('  Pickup to Additional Stop:', pickupToAdditionalStopMiles.toFixed(2), 'miles,', pickupToAdditionalStopMinutes, 'minutes');
      console.log('  Additional Stop to Delivery:', additionalStopToDeliveryMiles.toFixed(2), 'miles,', additionalStopToDeliveryMinutes, 'minutes');
      console.log('  Total Move Travel:', pickupToDeliveryMiles.toFixed(2), 'miles,', pickupToDeliveryMinutes, 'minutes');
    } else {
      console.log('  Pickup to Delivery:', pickupToDeliveryMiles.toFixed(2), 'miles,', pickupToDeliveryMinutes, 'minutes');
    }
    console.log('  From Delivery:', fromDeliveryMiles.toFixed(2), 'miles,', fromDeliveryMinutes, 'minutes');
    console.log('  Total:', totalMiles.toFixed(2), 'miles,', totalMinutes, 'minutes');
    console.log('  Travel Charge: $' + travelCharge.toFixed(2));

    const response: any = {
      toPickup: {
        miles: parseFloat(toPickupMiles.toFixed(2)),
        minutes: toPickupMinutes,
        text: toPickupElement.distance.text,
        duration: toPickupElement.duration.text
      },
      pickupToDelivery: {
        miles: parseFloat(pickupToDeliveryMiles.toFixed(2)),
        minutes: pickupToDeliveryMinutes
      },
      fromDelivery: {
        miles: parseFloat(fromDeliveryMiles.toFixed(2)),
        minutes: fromDeliveryMinutes,
        text: fromDeliveryElement.distance.text,
        duration: fromDeliveryElement.duration.text
      },
      total: {
        miles: parseFloat(totalMiles.toFixed(2)),
        minutes: totalMinutes,
        travelCharge: parseFloat(travelCharge.toFixed(2))
      }
    };

    // Add additional stop details if present
    if (additionalStopAddress && pickupToAdditionalStopElement && additionalStopToDeliveryElement) {
      response.pickupToAdditionalStop = {
        miles: parseFloat(pickupToAdditionalStopMiles.toFixed(2)),
        minutes: pickupToAdditionalStopMinutes,
        text: pickupToAdditionalStopElement.distance.text,
        duration: pickupToAdditionalStopElement.duration.text
      };
      response.additionalStopToDelivery = {
        miles: parseFloat(additionalStopToDeliveryMiles.toFixed(2)),
        minutes: additionalStopToDeliveryMinutes,
        text: additionalStopToDeliveryElement.distance.text,
        duration: additionalStopToDeliveryElement.duration.text
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[calculate-distance] Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate distance' },
      { status: 500 }
    );
  }
}
