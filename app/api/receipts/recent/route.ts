import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
    const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('receipts')
      .select('id, merchant_name, amount, receipt_date, image_url, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[recent-receipts] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent receipts' },
        { status: 500 }
      );
    }

    const receipts = (data || []).map(receipt => ({
      id: receipt.id,
      merchantName: receipt.merchant_name || 'Unknown Merchant',
      amount: receipt.amount,
      receiptDate: receipt.receipt_date,
      imageUrl: receipt.image_url,
      createdAt: receipt.created_at,
    }));

    return NextResponse.json(
      { success: true, receipts },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[recent-receipts] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
