import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Image from 'next/image';

// Initialize Supabase client
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Brand colors (matching QuotePreview)
const colors = {
  primary: "#0072BC",
  success: "#10B981",
  dark: "#2D2D2D",
  gray: "#6B7280",
  lightGray: "#E5E7EB",
  lightGreen: "#F0FDF4",
  white: "#FFFFFF",
  border: "#34D399",
};

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
      <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{ maxWidth: "448px", width: "100%", background: colors.white, borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", padding: "32px", textAlign: "center" }}>
          <div style={{ color: "#DC2626", fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: colors.dark, marginBottom: "8px" }}>Quote Expired</h1>
          <p style={{ color: colors.gray, marginBottom: "24px" }}>
            This quote link has expired. Please contact us for an updated quote.
          </p>
          <div style={{ fontSize: "14px", color: colors.gray, lineHeight: "1.5" }}>
            <p>Top Shelf Moving & Junk Removal</p>
            <p style={{ color: colors.primary, fontWeight: "600" }}>Phone: (208) 593-2877</p>
          </div>
        </div>
      </div>
    );
  }

  // Parse form data
  const formData = quoteData.form_data || {};
  const quoteNumber = quoteData.quote_number || 'N/A';
  const quoteItems = formData.quoteItems || [];
  const total = formData.total || 0;

  // Customer info
  const customerName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Customer';
  const customerEmail = formData.email || formData.emails?.[0]?.email || '';
  const customerPhone = formData.phone || formData.phones?.[0]?.number || '';
  const company = formData.company || '';

  // Format functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPhone = (phoneStr: string) => {
    const cleaned = phoneStr?.replace(/\D/g, "") || "";
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneStr || "";
  };

  // Group quote items into categories
  const groupedItems: any[] = [];
  quoteItems.forEach((item: any) => {
    if (item.subItems && item.subItems.length > 0) {
      groupedItems.push({
        category: item.description,
        total: item.amount,
        discount: item.discount,
        items: item.subItems.map((sub: any) => ({
          description: sub.description,
          amount: sub.amount,
          details: sub.details
        }))
      });
    } else {
      groupedItems.push({
        category: item.description,
        total: item.amount,
        discount: item.discount,
        items: [{ description: item.description, amount: item.amount }]
      });
    }
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: "20px" }}>
      <div style={{
        maxWidth: "900px",
        margin: "40px auto",
        background: colors.white,
        borderRadius: "8px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
      }}>
        {/* Quote Content */}
        <div style={{ padding: "40px" }}>
          {/* Header Section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px", flexWrap: "wrap", gap: "20px" }}>
            {/* Left: Logo and Company Info */}
            <div>
              <Image
                src="/images/topshelf-logo.png"
                alt="TopShelf"
                width={150}
                height={100}
                style={{ marginBottom: "12px" }}
                priority
              />
              <div style={{ color: colors.gray, fontSize: "12px", lineHeight: "1.6" }}>
                <p style={{ margin: "2px 0", fontWeight: "500", color: colors.dark }}>Top Shelf Moving and Junk Removal</p>
                <p style={{ margin: "2px 0" }}>1755 N Westgate Dr, Suite 110</p>
                <p style={{ margin: "2px 0" }}>Boise, ID 83704</p>
                <p style={{ margin: "2px 0" }}>info@topshelfpros.com</p>
                <p style={{ margin: "2px 0", color: colors.primary, fontWeight: "600" }}>(208) 593-2877</p>
              </div>
            </div>

            {/* Right: Estimate Info */}
            <div style={{ textAlign: "right" }}>
              <h1 style={{ fontSize: "32px", fontWeight: "700", color: colors.gray, margin: "0 0 16px 0", letterSpacing: "1px" }}>
                ESTIMATE
              </h1>
              <table style={{ marginLeft: "auto", fontSize: "12px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 24px 4px 0", color: colors.gray, fontWeight: "600" }}>Estimate #</td>
                    <td style={{ padding: "4px 0", color: colors.primary, textAlign: "right", fontWeight: "700" }}>{quoteNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 24px 4px 0", color: colors.gray, fontWeight: "600" }}>Date</td>
                    <td style={{ padding: "4px 0", color: colors.dark, textAlign: "right" }}>{currentDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 24px 4px 0", color: colors.gray, fontWeight: "600" }}>Total</td>
                    <td style={{ padding: "4px 0", color: colors.success, textAlign: "right", fontWeight: "700", fontSize: "14px" }}>{formatCurrency(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Info Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "30px" }}>
            {/* Prepared For */}
            <div style={{ padding: "16px", background: colors.lightGreen, borderLeft: `4px solid ${colors.success}`, borderRadius: "4px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: colors.dark, marginBottom: "10px" }}>
                Prepared For:
              </h3>
              <div style={{ fontSize: "12px", color: colors.gray, lineHeight: "1.5" }}>
                <p style={{ margin: "3px 0", fontWeight: "600", color: colors.dark }}>{customerName}</p>
                {company && <p style={{ margin: "3px 0" }}>{company}</p>}
                {customerPhone && <p style={{ margin: "3px 0", color: colors.primary }}>{formatPhone(customerPhone)}</p>}
                {customerEmail && <p style={{ margin: "3px 0", color: colors.primary }}>{customerEmail}</p>}
              </div>
            </div>

            {/* Primary Pickup */}
            <div style={{ padding: "16px", background: "#EFF6FF", borderLeft: `4px solid ${colors.primary}`, borderRadius: "4px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: colors.dark, marginBottom: "10px" }}>
                Primary Pickup:
              </h3>
              <div style={{ fontSize: "12px", color: colors.gray, lineHeight: "1.5" }}>
                <p style={{ margin: "3px 0", fontWeight: "600", color: colors.dark }}>
                  {formData.pickupAddress || "Address TBD"}
                </p>
                <p style={{ margin: "3px 0" }}>
                  {formData.pickupCity && formData.pickupState ? `${formData.pickupCity}, ${formData.pickupState} ${formData.pickupZip || ''}` : ''}
                </p>
              </div>
            </div>

            {/* Additional Stop - only show if delivery address exists and is different */}
            {formData.deliveryAddress && formData.deliveryAddress !== formData.pickupAddress && (
              <div style={{ padding: "16px", background: "#FEF3C7", borderLeft: `4px solid #F59E0B`, borderRadius: "4px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "700", color: colors.dark, marginBottom: "10px" }}>
                  Additional Stop:
                </h3>
                <div style={{ fontSize: "12px", color: colors.gray, lineHeight: "1.5" }}>
                  <p style={{ margin: "3px 0", fontWeight: "600", color: colors.dark }}>
                    {formData.deliveryAddress}
                  </p>
                  <p style={{ margin: "3px 0" }}>
                    {formData.deliveryCity && formData.deliveryState ? `${formData.deliveryCity}, ${formData.deliveryState} ${formData.deliveryZip || ''}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Final Destination */}
            <div style={{ padding: "16px", background: colors.lightGreen, borderLeft: `4px solid ${colors.success}`, borderRadius: "4px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: colors.dark, marginBottom: "10px" }}>
                Final Destination:
              </h3>
              <div style={{ fontSize: "12px", color: colors.gray, lineHeight: "1.5" }}>
                <p style={{ margin: "3px 0", fontWeight: "600", color: colors.dark }}>
                  {formData.deliveryAddress || "TBD"}
                </p>
                {formData.deliveryCity && formData.deliveryState && (
                  <p style={{ margin: "3px 0" }}>
                    {formData.deliveryCity}, {formData.deliveryState} {formData.deliveryZip || ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Active Estimate Card */}
          {groupedItems.length > 0 ? (
            <div style={{
              border: `3px solid ${colors.border}`,
              borderRadius: "12px",
              padding: "24px",
              background: colors.white,
              marginBottom: "24px"
            }}>
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: colors.dark, marginBottom: "20px" }}>
                Move Estimate
              </h2>

              {/* Quote Items */}
              {groupedItems.map((section, index) => (
                <div key={index} style={{ marginBottom: "20px" }}>
                  {/* Category Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", gap: "20px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: "700", color: colors.dark, margin: 0, flex: 1 }}>
                      {section.category}
                    </h3>
                    <span style={{ fontSize: "15px", fontWeight: "700", color: colors.dark, minWidth: "80px", textAlign: "right" }}>
                      {formatCurrency(section.total)}
                    </span>
                  </div>

                  {/* Discount - show before sub-items */}
                  {section.discount && (
                    <div style={{ marginBottom: "6px", paddingLeft: "20px" }}>
                      <span style={{ fontSize: "11px", color: colors.success, fontStyle: "italic" }}>
                        {section.discount}
                      </span>
                    </div>
                  )}

                  {/* Sub Items - only show if different from category */}
                  {(section.items.length > 1 || (section.items.length === 1 && section.items[0].description !== section.category)) && (
                    <div style={{ paddingLeft: "20px" }}>
                      {section.items.map((item: any, itemIndex: number) => (
                        <div key={itemIndex} style={{ marginBottom: item.details ? "10px" : "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                            <span style={{ fontSize: "13px", color: colors.gray, flex: 1 }}>
                              {item.description}
                            </span>
                            <span style={{ fontSize: "13px", color: colors.primary, fontWeight: "600", minWidth: "80px", textAlign: "right" }}>
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                          {item.details && (
                            <div style={{ fontSize: "11px", color: colors.gray, fontStyle: "italic", marginTop: "2px" }}>
                              {item.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Total Line */}
              <div style={{ height: "3px", background: colors.success, margin: "20px 0" }}></div>

              {/* Estimated Total */}
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: colors.dark, margin: "0 0 8px 0" }}>
                  Estimated Total:
                </h2>
                <span style={{ fontSize: "32px", fontWeight: "700", color: colors.success }}>
                  {formatCurrency(total)}
                </span>
              </div>

              {/* Disclaimer */}
              <p style={{ fontSize: "11px", color: colors.gray, fontStyle: "italic", textAlign: "center", margin: 0 }}>
                *Quoted rates are estimates. Final charges reflect actual hours worked, including drive time and additional labor if required.
              </p>
            </div>
          ) : (
            <div style={{
              padding: "40px",
              textAlign: "center",
              background: colors.lightGray,
              borderRadius: "8px",
              marginBottom: "24px"
            }}>
              <p style={{ color: colors.gray, fontSize: "14px" }}>
                Quote details are being prepared. Please contact us for more information.
              </p>
            </div>
          )}

          {/* Thank You Message */}
          <div style={{ textAlign: "center", marginTop: "40px", paddingTop: "24px", borderTop: `2px solid ${colors.success}` }}>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: colors.dark, margin: 0 }}>
              Thank You For Your Business
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
