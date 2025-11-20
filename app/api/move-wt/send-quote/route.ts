import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GHL Configuration
const GHL_API_KEY = process.env.GHL_API_KEY!;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;
const GHL_PIPELINE_ID = process.env.GHL_PIPELINE_ID!;
// TODO: Find correct stage ID for "Quote Sent" stage
const GHL_QUOTE_SENT_STAGE_ID = process.env.GHL_QUOTE_SENT_STAGE_ID || '752daf82-f827-4bd4-9e68-ba8b683b29fa';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

// Generate unique quote URL path
function generateQuoteUrl(): string {
  // Generate a random string for the URL
  const randomString = crypto.randomBytes(16).toString('hex');
  return `/quote/${randomString}`;
}

// Helper function to normalize phone numbers
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

// Search for existing GHL contact by phone number
async function findGHLContact(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);

  const response = await fetch(
    `${GHL_API_BASE}/contacts/?locationId=${GHL_LOCATION_ID}&query=${normalizedPhone}`,
    {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[send-quote] GHL API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      apiKey: GHL_API_KEY ? `${GHL_API_KEY.substring(0, 10)}...` : 'MISSING',
      locationId: GHL_LOCATION_ID,
    });
    throw new Error(`Failed to search GHL contacts: ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  return data.contacts && data.contacts.length > 0 ? data.contacts[0] : null;
}

// Create or update GHL contact
async function upsertGHLContact(contactData: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  company?: string;
}) {
  // First, search for existing contact
  const existingContact = await findGHLContact(contactData.phone);

  const payload: any = {
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    phone: normalizePhoneNumber(contactData.phone),
    address1: contactData.address,
    companyName: contactData.company || '',
  };

  // Only include email if it's provided and valid
  if (contactData.email && contactData.email.includes('@')) {
    payload.email = contactData.email;
  }

  if (existingContact) {
    // Update existing contact
    console.log('[send-quote] Updating contact:', existingContact.id, 'with payload:', payload);
    const response = await fetch(
      `${GHL_API_BASE}/contacts/${existingContact.id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[send-quote] Update contact error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        payload: payload,
      });
      throw new Error(`Failed to update GHL contact: ${response.statusText} - ${errorBody}`);
    }

    return await response.json();
  } else {
    // Create new contact
    console.log('[send-quote] Creating new contact with payload:', payload);
    const response = await fetch(
      `${GHL_API_BASE}/contacts/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[send-quote] Create contact error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        payload: payload,
      });
      throw new Error(`Failed to create GHL contact: ${response.statusText} - ${errorBody}`);
    }

    return await response.json();
  }
}

// Create GHL opportunity
async function createGHLOpportunity(contactId: string, quoteNumber: string, quoteTotal: number) {
  const payload = {
    pipelineId: GHL_PIPELINE_ID,
    locationId: GHL_LOCATION_ID,
    name: `Moving Quote ${quoteNumber}`,
    pipelineStageId: GHL_QUOTE_SENT_STAGE_ID,
    status: 'open',
    contactId: contactId,
    monetaryValue: Math.round(quoteTotal),
  };

  console.log('[send-quote] Creating opportunity with payload:', payload);

  const response = await fetch(
    `${GHL_API_BASE}/opportunities/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[send-quote] Create opportunity error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      payload: payload,
      pipelineId: GHL_PIPELINE_ID,
      locationId: GHL_LOCATION_ID,
      stageId: GHL_QUOTE_SENT_STAGE_ID,
    });
    throw new Error(`Failed to create GHL opportunity: ${response.statusText} - ${errorBody}`);
  }

  return await response.json();
}

// Send SMS via GHL
async function sendGHLSMS(contactId: string, message: string) {
  const response = await fetch(
    `${GHL_API_BASE}/conversations/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId: contactId,
        message: message,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to send GHL SMS: ${response.statusText}`);
  }

  return await response.json();
}

// Send Email via GHL
async function sendGHLEmail(contactId: string, subject: string, body: string) {
  const response = await fetch(
    `${GHL_API_BASE}/conversations/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'Email',
        contactId: contactId,
        subject: subject,
        html: body,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to send GHL email: ${response.statusText}`);
  }

  return await response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteNumber, quoteTotal } = body;

    if (!quoteNumber || !quoteNumber.trim()) {
      return NextResponse.json(
        { error: 'Quote number is required' },
        { status: 400 }
      );
    }

    console.log(`[send-quote] Sending quote ${quoteNumber} to customer`);

    // Get quote data from Supabase
    const { data: quoteData, error: fetchError } = await supabase
      .from('move_quote')
      .select('*')
      .eq('quote_number', quoteNumber)
      .single();

    if (fetchError || !quoteData) {
      console.error('[send-quote] Error fetching quote:', fetchError);
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Extract customer info from form_data
    const formData = quoteData.form_data || {};
    const firstName = formData.firstName || '';
    const lastName = formData.lastName || '';
    const phone = formData.phone || '';
    const email = formData.email || '';
    const company = formData.company || '';

    // Get customer home address
    const customerHomeAddress = quoteData.customer_home_address || quoteData.address || '';

    if (!phone) {
      return NextResponse.json(
        { error: 'Customer phone number is required' },
        { status: 400 }
      );
    }

    // Generate unique quote URL if not already exists
    let quoteUrl = quoteData.quote_url;
    if (!quoteUrl) {
      quoteUrl = generateQuoteUrl();

      // Calculate expiration date (2 months from now)
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 2);

      // Update quote with the URL and expiration
      const { error: updateError } = await supabase
        .from('move_quote')
        .update({
          quote_url: quoteUrl,
          quote_url_expires_at: expiresAt.toISOString()
        })
        .eq('quote_number', quoteNumber);

      if (updateError) {
        console.error('[send-quote] Error updating quote URL:', updateError);
      }
    }

    // Build full quote URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://employeeapp.topshelfpros.com';
    const fullQuoteUrl = `${baseUrl}${quoteUrl}`;

    console.log(`[send-quote] Quote URL: ${fullQuoteUrl}`);

    // Step 1: Create/Update GHL Contact
    console.log(`[send-quote] Upserting GHL contact for ${firstName} ${lastName}`);
    const contact = await upsertGHLContact({
      firstName,
      lastName,
      phone,
      email,
      address: customerHomeAddress,
      company,
    });

    const contactId = contact.contact?.id || contact.id;
    console.log(`[send-quote] GHL Contact ID: ${contactId}`);

    // Step 2: Create GHL Opportunity
    console.log(`[send-quote] Creating GHL opportunity with value: $${quoteTotal || 0}`);

    const opportunity = await createGHLOpportunity(contactId, quoteNumber, quoteTotal || 0);
    console.log(`[send-quote] Created opportunity: ${opportunity.id}`);

    // Step 3: Send SMS
    const smsMessage = `Hi ${firstName}, your moving quote is ready! View it here: ${fullQuoteUrl}`;
    console.log(`[send-quote] Sending SMS`);
    await sendGHLSMS(contactId, smsMessage);

    // Step 4: Send Email
    const emailSubject = `Your Moving Quote is Ready - ${quoteNumber}`;
    const emailBody = `
      <p>Hi ${firstName},</p>
      <p>Your moving quote is ready! View it here: <a href="${fullQuoteUrl}">${fullQuoteUrl}</a></p>
      <p>Thank you for choosing Top Shelf Moving!</p>
    `;
    console.log(`[send-quote] Sending email`);
    await sendGHLEmail(contactId, emailSubject, emailBody);

    console.log(`[send-quote] Quote sent successfully`);

    return NextResponse.json({
      success: true,
      message: 'Quote sent to customer',
      quoteUrl: fullQuoteUrl,
      contactId: contactId,
      opportunityId: opportunity.id,
    });

  } catch (error) {
    console.error('[send-quote] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
