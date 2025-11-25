import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to normalize phone numbers (strips non-numeric characters)
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

// Helper function to build full address string
const buildFullAddress = (addressData: any, type: 'pickup' | 'delivery'): string => {
  const parts = [];
  if (type === 'pickup') {
    if (addressData.pickupAddress) parts.push(addressData.pickupAddress);
    if (addressData.pickupUnit) parts.push(`Unit ${addressData.pickupUnit}`);
    if (addressData.pickupCity) parts.push(addressData.pickupCity);
    if (addressData.pickupState) parts.push(addressData.pickupState);
    if (addressData.pickupZip) parts.push(addressData.pickupZip);
  } else {
    if (addressData.deliveryAddress) parts.push(addressData.deliveryAddress);
    if (addressData.deliveryUnit) parts.push(`Unit ${addressData.deliveryUnit}`);
    if (addressData.deliveryCity) parts.push(addressData.deliveryCity);
    if (addressData.deliveryState) parts.push(addressData.deliveryState);
    if (addressData.deliveryZip) parts.push(addressData.deliveryZip);
  }
  return parts.join(', ');
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobNumber, address, formData, folderUrl } = body;

    if (!jobNumber || !jobNumber.trim()) {
      return NextResponse.json(
        { error: 'Job number is required' },
        { status: 400 }
      );
    }

    // Determine customer home address from the checkbox
    const customerHomeAddressType = formData?.customerHomeAddressType;
    let customerHomeAddress = '';

    if (customerHomeAddressType === 'pickup') {
      customerHomeAddress = buildFullAddress(formData, 'pickup');
    } else if (customerHomeAddressType === 'delivery') {
      customerHomeAddress = buildFullAddress(formData, 'delivery');
    }

    // Extract and normalize ALL phone numbers from formData
    const primaryPhone = formData?.phone || '';
    const normalizedPhone = normalizePhoneNumber(primaryPhone);

    // Extract all phones from the phones array
    const allPhones: string[] = [];
    if (normalizedPhone) {
      allPhones.push(normalizedPhone);
    }
    // Add phones from the phones array (if present)
    if (formData?.phones && Array.isArray(formData.phones)) {
      formData.phones.forEach((p: { number?: string }) => {
        const normalized = normalizePhoneNumber(p.number || '');
        if (normalized && normalized.length >= 10 && !allPhones.includes(normalized)) {
          allPhones.push(normalized);
        }
      });
    }
    console.log(`[move-wt/save-form] All phone numbers to save: ${allPhones.join(', ')}`);

    console.log(`[move-wt/save-form] Saving form for job: ${jobNumber}, customer home address: ${customerHomeAddress || 'Not Set'}, phone: ${normalizedPhone}`);
    console.log(`[move-wt/save-form] preferredDate in formData: "${formData?.preferredDate || 'NOT SET'}"`);
    console.log(`[move-wt/save-form] firstName: "${formData?.firstName}", lastName: "${formData?.lastName}"`);

    // If customer home address is set, use address-based UPSERT
    if (customerHomeAddress && customerHomeAddress.trim()) {
      // Check if this address already exists
      const { data: existing, error: fetchError } = await supabase
        .from('move_quote')
        .select('*')
        .eq('customer_home_address', customerHomeAddress)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[move-wt/save-form] Error fetching existing record:', fetchError);
        return NextResponse.json(
          { error: 'Failed to check existing data' },
          { status: 500 }
        );
      }

      if (existing) {
        // Address exists - UPDATE and add to arrays
        console.log(`[move-wt/save-form] Existing record found, updating...`);

        // Use the add_to_array_if_not_exists function for job numbers
        const { data: updatedData, error: updateError } = await supabase.rpc(
          'add_to_array_if_not_exists',
          {
            arr: existing.job_numbers || [],
            item: jobNumber
          }
        );

        if (updateError) {
          console.error('[move-wt/save-form] Error updating job_numbers:', updateError);
        }

        const newJobNumbers = updatedData || existing.job_numbers || [];

        // Add ALL phones to phone_numbers array
        let newPhoneNumbers = existing.phone_numbers || [];
        for (const phone of allPhones) {
          if (phone && !newPhoneNumbers.includes(phone)) {
            newPhoneNumbers.push(phone);
          }
        }

        // Update the record
        const { data, error } = await supabase
          .from('move_quote')
          .update({
            job_number: jobNumber, // Store most recent job number
            job_numbers: newJobNumbers,
            phone_number: normalizedPhone, // Store most recent phone
            phone_numbers: newPhoneNumbers,
            address: address, // Legacy field
            form_data: formData,
            move_date: formData?.preferredDate || null,
            updated_at: new Date().toISOString(),
          })
          .eq('customer_home_address', customerHomeAddress)
          .select();

        if (error) {
          console.error('[move-wt/save-form] Supabase update error:', error);
          return NextResponse.json(
            { error: 'Failed to update form data' },
            { status: 500 }
          );
        }

        console.log(`[move-wt/save-form] Form updated successfully`);

        return NextResponse.json({
          success: true,
          message: 'Form updated successfully',
          quoteNumber: existing.quote_number,
          isExisting: true,
        });

      } else {
        // New address - check if job_number exists before inserting
        console.log(`[move-wt/save-form] New address, checking if job_number exists...`);

        // Check if this job_number already exists (important for temp jobs)
        const { data: existingByJob } = await supabase
          .from('move_quote')
          .select('*')
          .eq('job_number', jobNumber)
          .maybeSingle();

        if (existingByJob) {
          // Job number exists - UPDATE it with new customer_home_address
          console.log(`[move-wt/save-form] Job number exists, updating with new address...`);

          const { data, error } = await supabase
            .from('move_quote')
            .update({
              customer_home_address: customerHomeAddress,
              address: address,
              phone_number: normalizedPhone,
              form_data: formData,
              move_date: formData?.preferredDate || null,
              updated_at: new Date().toISOString(),
            })
            .eq('job_number', jobNumber)
            .select();

          if (error) {
            console.error('[move-wt/save-form] Supabase update error:', error);
            return NextResponse.json(
              { error: 'Failed to update form data' },
              { status: 500 }
            );
          }

          return NextResponse.json({
            success: true,
            message: 'Form updated successfully',
            quoteNumber: existingByJob.quote_number,
            isExisting: true,
          });
        } else {
          // Truly new - INSERT
          console.log(`[move-wt/save-form] New job and address, inserting...`);

          const { data, error } = await supabase
            .from('move_quote')
            .insert({
              job_number: jobNumber,
              job_numbers: [jobNumber],
              customer_home_address: customerHomeAddress,
              address: address, // Legacy field
              phone_number: normalizedPhone,
              phone_numbers: allPhones,
              form_data: formData,
              move_date: formData?.preferredDate || null,
              updated_at: new Date().toISOString(),
            })
            .select();

          if (error) {
            console.error('[move-wt/save-form] Supabase insert error:', error);
            return NextResponse.json(
              { error: 'Failed to save form data' },
              { status: 500 }
            );
          }

          console.log(`[move-wt/save-form] Form saved successfully with quote number: ${data[0]?.quote_number}`);

          return NextResponse.json({
            success: true,
            message: 'Form saved successfully',
            quoteNumber: data[0]?.quote_number,
            isExisting: false,
          });
        }
      }
    } else {
      // No customer home address set - use legacy job_number based UPSERT
      console.log(`[move-wt/save-form] No customer home address set, using job_number based save`);

      const { data, error } = await supabase
        .from('move_quote')
        .upsert(
          {
            job_number: jobNumber,
            job_numbers: [jobNumber],
            address: address,
            phone_number: normalizedPhone,
            phone_numbers: normalizedPhone ? [normalizedPhone] : [],
            form_data: formData,
            move_date: formData?.preferredDate || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'job_number',
          }
        )
        .select();

      if (error) {
        console.error('[move-wt/save-form] Supabase error:', error);
        return NextResponse.json(
          { error: 'Failed to save form data' },
          { status: 500 }
        );
      }

      console.log(`[move-wt/save-form] Form saved successfully`);

      return NextResponse.json({
        success: true,
        message: 'Form saved successfully',
        quoteNumber: data[0]?.quote_number,
      });
    }

  } catch (error) {
    console.error('[move-wt/save-form] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
