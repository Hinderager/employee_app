import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const normalizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

const normalizeAddress = (address: string | null | undefined): string => {
  if (!address) return '';

  let normalized = address.toLowerCase();

  // Remove punctuation (periods, commas, hashes)
  normalized = normalized.replace(/[.,#]/g, '');

  // Expand directional abbreviations
  const directions: Record<string, string> = {
    ' n ': ' north ', ' s ': ' south ', ' e ': ' east ', ' w ': ' west ',
    ' ne ': ' northeast ', ' nw ': ' northwest ', ' se ': ' southeast ', ' sw ': ' southwest ',
  };
  for (const [abbr, full] of Object.entries(directions)) {
    normalized = normalized.replace(new RegExp(abbr, 'g'), full);
  }
  // Handle directions at start of string
  if (normalized.startsWith('n ')) normalized = 'north ' + normalized.slice(2);
  if (normalized.startsWith('s ')) normalized = 'south ' + normalized.slice(2);
  if (normalized.startsWith('e ')) normalized = 'east ' + normalized.slice(2);
  if (normalized.startsWith('w ')) normalized = 'west ' + normalized.slice(2);

  // Expand street type abbreviations
  const streetTypes: Record<string, string> = {
    ' st$': ' street', ' st ': ' street ',
    ' ave$': ' avenue', ' ave ': ' avenue ',
    ' blvd$': ' boulevard', ' blvd ': ' boulevard ',
    ' dr$': ' drive', ' dr ': ' drive ',
    ' ln$': ' lane', ' ln ': ' lane ',
    ' rd$': ' road', ' rd ': ' road ',
    ' ct$': ' court', ' ct ': ' court ',
    ' cir$': ' circle', ' cir ': ' circle ',
    ' pl$': ' place', ' pl ': ' place ',
    ' pkwy$': ' parkway', ' pkwy ': ' parkway ',
    ' hwy$': ' highway', ' hwy ': ' highway ',
    ' trl$': ' trail', ' trl ': ' trail ',
    ' apt ': ' apartment ', ' ste ': ' suite ',
  };
  for (const [abbr, full] of Object.entries(streetTypes)) {
    normalized = normalized.replace(new RegExp(abbr, 'g'), full);
  }

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const now = new Date();
    const mstOffset = -7 * 60;
    const mstTime = new Date(now.getTime() + (mstOffset - now.getTimezoneOffset()) * 60000);
    const todayMST = mstTime.toISOString().split('T')[0];
    const selectedDate = dateParam || todayMST;

    const { data: workizJobs, error: workizError } = await supabase
      .from('all_workiz_jobs')
      .select('serial_id, scheduled_date, job_date_time, status, job_type, first_name, last_name, phone, address')
      .eq('scheduled_date', selectedDate)
      .or('job_type.eq.Moving,job_type.eq.Moving WT');

    if (workizError) {
      return NextResponse.json({ error: 'Failed to fetch Workiz jobs' }, { status: 500 });
    }

    if (!workizJobs || workizJobs.length === 0) {
      return NextResponse.json({ success: true, jobs: [], date: selectedDate });
    }

    const workizPhoneMap = new Map<string, any[]>();
    const workizAddressMap = new Map<string, any[]>();

    workizJobs.forEach((wj: any) => {
      const normalizedPhone = normalizePhone(wj.phone);
      if (normalizedPhone) {
        const existing = workizPhoneMap.get(normalizedPhone) || [];
        existing.push(wj);
        workizPhoneMap.set(normalizedPhone, existing);
      }
      const normalizedAddr = normalizeAddress(wj.address);
      if (normalizedAddr) {
        const existing = workizAddressMap.get(normalizedAddr) || [];
        existing.push(wj);
        workizAddressMap.set(normalizedAddr, existing);
      }
    });

    const { data: moveQuotes, error: moveQuoteError } = await supabase
      .from('move_quote')
      .select('id, job_number, quote_number, phone_number, address, customer_home_address, form_data, move_date, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (moveQuoteError) {
      return NextResponse.json({ error: 'Failed to fetch estimate forms' }, { status: 500 });
    }

    const matchedJobs: any[] = [];
    const matchedFormIds = new Set<string>();

    (moveQuotes || []).forEach((form: any) => {
      const formData = form.form_data || {};
      const formPhones: string[] = [];

      if (form.phone_number) formPhones.push(normalizePhone(form.phone_number));
      if (formData.phone) formPhones.push(normalizePhone(formData.phone));
      if (Array.isArray(formData.phones)) {
        formData.phones.forEach((p: any) => {
          if (p?.number) formPhones.push(normalizePhone(p.number));
        });
      }

      const uniquePhones = [...new Set(formPhones)].filter(p => p.length > 0);
      const formAddress = normalizeAddress(formData.pickupAddress || form.address || form.customer_home_address);

      const matchingWorkizJobs: any[] = [];

      for (const phone of uniquePhones) {
        const jobs = workizPhoneMap.get(phone) || [];
        jobs.forEach((wj: any) => {
          if (!matchingWorkizJobs.find(j => j.serial_id === wj.serial_id)) {
            matchingWorkizJobs.push(wj);
          }
        });
      }

      if (formAddress) {
        const jobs = workizAddressMap.get(formAddress) || [];
        jobs.forEach((wj: any) => {
          if (!matchingWorkizJobs.find(j => j.serial_id === wj.serial_id)) {
            matchingWorkizJobs.push(wj);
          }
        });
      }

      if (matchingWorkizJobs.length > 0 && !matchedFormIds.has(form.id)) {
        matchedFormIds.add(form.id);
        const firstName = formData.firstName || '';
        const lastName = formData.lastName || '';
        const name = (firstName + ' ' + lastName).trim() || 'Unknown';

        matchedJobs.push({
          id: form.id,
          jobNumbers: matchingWorkizJobs.map(wj => String(wj.serial_id)),
          quoteNumber: form.quote_number || '',
          customerName: name,
          phone: form.phone_number || formData.phone || '',
          email: formData.email || '',
          pickupAddress: formData.pickupAddress || form.address || '',
          deliveryAddress: formData.deliveryAddress || '',
          serviceType: formData.serviceType || '',
          preferredDate: matchingWorkizJobs[0].scheduled_date,
          updatedAt: form.updated_at,
          createdAt: form.created_at,
          formData: formData,
          workizJobs: matchingWorkizJobs.map(wj => ({
            serialId: wj.serial_id,
            status: wj.status,
            jobType: wj.job_type,
            scheduledDate: wj.scheduled_date,
          })),
          hasWorkizMatch: true,
        });
      }
    });

    return NextResponse.json({ success: true, jobs: matchedJobs, date: selectedDate });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
