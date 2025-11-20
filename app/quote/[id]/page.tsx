import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

// Initialize Supabase client
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface QuotePageProps {
  params: {
    id: string;
  };
}

export default async function QuotePage({ params }: QuotePageProps) {
  const { id } = params;

  // Look up quote by URL path
  const quotePath = `/quote/${id}`;
  const { data: quoteData, error } = await supabase
    .from('move_quote')
    .select('*')
    .eq('quote_url', quotePath)
    .single();

  if (error || !quoteData) {
    notFound();
  }

  // Check if quote has expired
  const expiresAt = quoteData.quote_url_expires_at;
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Expired</h1>
          <p className="text-gray-600 mb-6">
            This quote link has expired. Please contact us for an updated quote.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Top Shelf Moving & Junk Removal</p>
            <p>Phone: (208) 123-4567</p>
          </div>
        </div>
      </div>
    );
  }

  // Parse form data and calculate line items
  const formData = quoteData.form_data || {};
  const quoteNumber = quoteData.quote_number || 'N/A';

  // Customer info
  const customerName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Customer';
  const customerEmail = formData.email || '';
  const customerPhone = formData.phone || '';
  const company = formData.company || '';

  // Calculate the same line items as the employee form
  const lineItems: Array<{ description: string; amount: number }> = [];

  // Add line items based on form data
  // (You'll need to implement the same pricing logic as in the employee form)

  // For now, use the total from form_data
  const total = formData.total || 0;

  // Format expiration date
  const expirationDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-8">
          <h1 className="text-3xl font-bold mb-2">Moving Quote</h1>
          <p className="text-blue-100">Quote #{quoteNumber}</p>
        </div>

        {/* Expiration Notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-sm text-yellow-800">
            <strong>Valid Until:</strong> {expirationDate}
          </p>
        </div>

        {/* Customer Information */}
        <div className="p-8 border-b">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium text-gray-900">{customerName}</p>
            </div>
            {company && (
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-medium text-gray-900">{company}</p>
              </div>
            )}
            {customerPhone && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{customerPhone}</p>
              </div>
            )}
            {customerEmail && (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{customerEmail}</p>
              </div>
            )}
          </div>
        </div>

        {/* Move Details */}
        <div className="p-8 border-b">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Move Details</h2>
          <div className="space-y-3">
            {formData.pickupAddress && (
              <div>
                <p className="text-sm text-gray-600">Pickup Location</p>
                <p className="font-medium text-gray-900">{formData.pickupAddress}</p>
              </div>
            )}
            {formData.deliveryAddress && (
              <div>
                <p className="text-sm text-gray-600">Delivery Location</p>
                <p className="font-medium text-gray-900">{formData.deliveryAddress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quote Total */}
        <div className="p-8 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Total Estimate</h2>
            <p className="text-3xl font-bold text-blue-600">
              ${typeof total === 'number' ? total.toFixed(2) : '0.00'}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            This is an estimate based on the information provided. Final pricing may vary.
          </p>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-100 text-center">
          <h3 className="font-semibold text-gray-900 mb-2">Questions about your quote?</h3>
          <p className="text-gray-600 mb-4">Contact us to discuss your move</p>
          <div className="space-y-1 text-sm text-gray-700">
            <p className="font-medium">Top Shelf Moving & Junk Removal</p>
            <p>Phone: (208) 123-4567</p>
            <p>Email: info@topshelfpros.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
