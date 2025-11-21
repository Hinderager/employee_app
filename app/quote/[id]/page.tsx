'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Brand colors (matching Top Shelf brand palette)
const colors = {
  primary: "#00A3E0", // Light blue
  darkBlue: "#0A5275", // Dark blue
  success: "#00A3E0", // Using light blue for success
  dark: "#3D3D3D",
  gray: "#6B7280",
  lightGray: "#E5E7EB",
  lightBlue: "#E6F4F9", // Light blue background
  white: "#FFFFFF",
  border: "#00A3E0", // Light blue border
};

interface QuotePageProps {
  params: {
    id: string;
  };
}

export default function QuotePage({ params }: QuotePageProps) {
  const { id } = params;
  const router = useRouter();
  const [quoteData, setQuoteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  // Initialize Supabase client on client side
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const quotePath = `/quote/${id}`;

    // Fetch initial data
    const fetchQuote = async () => {
      const { data, error } = await supabase
        .from('move_quote')
        .select('*')
        .eq('quote_url', quotePath)
        .single();

      if (error || !data) {
        router.push('/404');
        return;
      }

      setQuoteData(data);

      // Check if quote has expired
      const expiresAt = data.quote_url_expires_at;
      setIsExpired(expiresAt && new Date(expiresAt) < new Date());
      setIsLoading(false);
    };

    fetchQuote();

    // Set up real-time subscription
    const channel = supabase
      .channel('quote-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'move_quote',
          filter: `quote_url=eq.${quotePath}`,
        },
        (payload) => {
          console.log('Quote updated:', payload);
          setQuoteData(payload.new);

          // Re-check expiration
          const expiresAt = payload.new.quote_url_expires_at;
          setIsExpired(expiresAt && new Date(expiresAt) < new Date());
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: colors.gray, fontSize: "18px" }}>Loading quote...</div>
      </div>
    );
  }

  if (!quoteData) {
    return null;
  }

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
          details: sub.details,
          alert: sub.alert
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
              <h1 style={{ fontSize: "32px", fontWeight: "700", color: colors.gray, margin: "0 0 16px 0", letterSpacing: "1px", textAlign: "right" }}>
                ESTIMATE
              </h1>
              <table style={{ marginLeft: "auto", marginRight: "0", fontSize: "12px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 24px 4px 0", color: colors.gray, fontWeight: "600", textAlign: "left" }}>Estimate #</td>
                    <td style={{ padding: "4px 0", color: colors.primary, textAlign: "right", fontWeight: "700" }}>{quoteNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 24px 4px 0", color: colors.gray, fontWeight: "600", textAlign: "left" }}>Date</td>
                    <td style={{ padding: "4px 0", color: colors.dark, textAlign: "right" }}>{currentDate}</td>
                  </tr>
                  {formData.preferredDate && !formData.moveDateUnknown && (
                    <tr>
                      <td style={{ padding: "4px 24px 4px 0", color: colors.gray, fontWeight: "600", textAlign: "left" }}>Move Date</td>
                      <td style={{ padding: "4px 0", color: colors.primary, textAlign: "right", fontWeight: "600" }}>
                        {new Date(formData.preferredDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: "4px 24px 4px 0", color: colors.gray, fontWeight: "600", textAlign: "left" }}>Total</td>
                    <td style={{ padding: "4px 0", color: colors.success, textAlign: "right", fontWeight: "700", fontSize: "14px" }}>{formatCurrency(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Info Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "30px" }}>
            {/* Prepared For */}
            <div style={{ padding: "16px", background: colors.lightBlue, borderLeft: `4px solid ${colors.darkBlue}`, borderRadius: "4px" }}>
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
            <div style={{ padding: "16px", background: colors.lightBlue, borderLeft: `4px solid ${colors.primary}`, borderRadius: "4px" }}>
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
            <div style={{ padding: "16px", background: colors.lightBlue, borderLeft: `4px solid ${colors.darkBlue}`, borderRadius: "4px" }}>
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
                <div key={index} style={{ marginBottom: "24px" }}>
                  {/* Category Header - Full Width */}
                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: colors.dark, margin: "0 0 8px 0" }}>
                    {section.category}
                  </h3>

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
                    <div style={{ paddingLeft: "20px", marginBottom: "8px" }}>
                      {section.items.map((item: any, itemIndex: number) => (
                        <div key={itemIndex} style={{ marginBottom: item.details || item.alert ? "10px" : "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                            <span style={{ fontSize: "13px", color: colors.gray, flex: 1 }}>
                              {item.alert && <span style={{ color: "#DC2626", fontWeight: "700" }}>* </span>}
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
                          {item.alert && (
                            <div style={{ fontSize: "11px", color: "#DC2626", fontStyle: "italic", marginTop: "2px" }}>
                              *{item.alert}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Separator Line */}
                  <div style={{ height: "1px", background: colors.lightGray, margin: "8px 0" }}></div>

                  {/* Category Total */}
                  <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "0" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: colors.dark }}>
                      {formatCurrency(section.total)}
                    </span>
                  </div>
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

              {/* Important Notes - only for items without explicit line items in the quote */}
              {(() => {
                const alerts: string[] = [];

                // Only add alerts from formData items that don't have explicit line items
                // (alerts from quote items are shown inline with the item)
                if (formData.applianceFridge && !alerts.includes('Fridge doors cannot be fully removed to fit through narrow spaces')) {
                  alerts.push('Fridge doors cannot be fully removed to fit through narrow spaces');
                }
                if (formData.treadmills && !alerts.includes('Treadmills cannot be disassembled')) {
                  alerts.push('Treadmills cannot be disassembled');
                }

                return alerts.length > 0 ? (
                  <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: `2px solid ${colors.gray}` }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#DC2626", marginBottom: "8px" }}>Important Notes:</h3>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {alerts.map((alert: string, idx: number) => (
                        <li key={idx} style={{ fontSize: "13px", color: "#DC2626", marginBottom: "4px" }}>
                          <span style={{ fontWeight: "700" }}>* </span>{alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })()}
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

          {/* Moving Truck Image */}
          <div style={{ textAlign: "center", marginTop: "30px", marginBottom: "20px" }}>
            <Image
              src="/images/moving-truck.jpg"
              alt="Top Shelf Moving Truck"
              width={1130}
              height={585}
              style={{ display: "inline-block", maxWidth: "100%", height: "auto" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
