"use client";

import { useState } from "react";
import Image from "next/image";

// Brand colors
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

interface QuoteItem {
  description: string;
  amount: number;
  discount?: string;
  subItems?: Array<{ description: string; amount: number }>;
}

interface QuotePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
  quote: {
    baseRate: number;
    items: QuoteItem[];
    total: number;
  };
  jobNumber: string;
}

export default function QuotePreview({ isOpen, onClose, formData, quote, jobNumber }: QuotePreviewProps) {
  const [showBooking, setShowBooking] = useState(false);

  if (!isOpen) return null;

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
  let currentCategory: any = null;

  quote.items.forEach((item) => {
    if (item.subItems && item.subItems.length > 0) {
      // This is a category with sub-items
      groupedItems.push({
        category: item.description,
        total: item.amount,
        discount: item.discount,
        items: item.subItems.map(sub => ({
          description: sub.description,
          amount: sub.amount
        }))
      });
    } else {
      // This is a standalone item - group with similar items
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

  const customerName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || "Customer";
  const customerPhone = formData.phones?.[0]?.number || formData.phone || "";
  const customerEmail = formData.emails?.[0]?.email || formData.email || "";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 9999,
        overflow: "auto",
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "40px auto",
          background: colors.white,
          borderRadius: "8px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.success})`,
          padding: "16px 30px",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: colors.white, margin: 0 }}>
            📋 Customer Quote Preview
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "2px solid white",
              color: colors.white,
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            ✕ Close Preview
          </button>
        </div>

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
                <p style={{ margin: "2px 0" }}>1755 N Westgate Dr Suite 110 Boise ID 83704</p>
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
                    <td style={{ padding: "4px 12px 4px 0", color: colors.gray, fontWeight: "600" }}>Estimate #</td>
                    <td style={{ padding: "4px 0", color: colors.primary, textAlign: "right", fontWeight: "700" }}>{jobNumber || "DRAFT"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 12px 4px 0", color: colors.gray, fontWeight: "600" }}>Date</td>
                    <td style={{ padding: "4px 0", color: colors.dark, textAlign: "right" }}>{currentDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 12px 4px 0", color: colors.gray, fontWeight: "600" }}>Total</td>
                    <td style={{ padding: "4px 0", color: colors.success, textAlign: "right", fontWeight: "700", fontSize: "14px" }}>{formatCurrency(quote.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Info Section */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px" }}>
            {/* Prepared For */}
            <div style={{ padding: "16px", background: colors.lightGreen, borderLeft: `4px solid ${colors.success}`, borderRadius: "4px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: colors.dark, marginBottom: "10px" }}>
                Prepared For:
              </h3>
              <div style={{ fontSize: "12px", color: colors.gray, lineHeight: "1.5" }}>
                <p style={{ margin: "3px 0", fontWeight: "600", color: colors.dark }}>{customerName}</p>
                {formData.company && <p style={{ margin: "3px 0" }}>{formData.company}</p>}
                <p style={{ margin: "3px 0" }}>{formData.pickupAddress || "Address TBD"}</p>
                <p style={{ margin: "3px 0" }}>
                  {formData.pickupCity && formData.pickupState ? `${formData.pickupCity}, ${formData.pickupState} ${formData.pickupZip || ''}` : ''}
                </p>
                {customerPhone && <p style={{ margin: "3px 0", color: colors.primary }}>{formatPhone(customerPhone)}</p>}
                {customerEmail && <p style={{ margin: "3px 0", color: colors.primary }}>{customerEmail}</p>}
              </div>
            </div>

            {/* Service Location */}
            <div style={{ padding: "16px", background: "#EFF6FF", borderLeft: `4px solid ${colors.primary}`, borderRadius: "4px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: colors.dark, marginBottom: "10px" }}>
                Service Location:
              </h3>
              <div style={{ fontSize: "12px", color: colors.gray, lineHeight: "1.5" }}>
                <p style={{ margin: "3px 0", fontWeight: "600", color: colors.dark }}>
                  {formData.deliveryAddress || formData.pickupAddress || "TBD"}
                </p>
                <p style={{ margin: "3px 0" }}>
                  {formData.deliveryCity && formData.deliveryState ?
                    `${formData.deliveryCity}, ${formData.deliveryState} ${formData.deliveryZip || ''}` :
                    (formData.pickupCity && formData.pickupState ? `${formData.pickupCity}, ${formData.pickupState} ${formData.pickupZip || ''}` : '')}
                </p>
              </div>
            </div>
          </div>

          {/* Active Estimate Card */}
          {quote.items.length > 0 ? (
            <div style={{
              border: `3px solid ${colors.border}`,
              borderRadius: "12px",
              padding: "24px",
              background: colors.white,
              marginBottom: "24px"
            }}>
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: colors.dark, marginBottom: "20px" }}>
                Active Estimate
              </h2>

              {/* Quote Items */}
              {groupedItems.map((section, index) => (
                <div key={index} style={{ marginBottom: "20px" }}>
                  {/* Category Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: "700", color: colors.dark, margin: 0 }}>
                      {section.category}
                    </h3>
                    <span style={{ fontSize: "15px", fontWeight: "700", color: colors.dark }}>
                      {formatCurrency(section.total)}
                    </span>
                  </div>

                  {/* Sub Items - only show if different from category */}
                  {section.items.length > 1 && (
                    <div style={{ paddingLeft: "20px" }}>
                      {section.items.map((item: any, itemIndex: number) => (
                        <div key={itemIndex} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "13px", color: colors.gray }}>
                            {item.description}
                          </span>
                          <span style={{ fontSize: "13px", color: colors.primary, fontWeight: "600" }}>
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.discount && (
                    <div style={{ marginTop: "6px", paddingLeft: "20px" }}>
                      <span style={{ fontSize: "11px", color: colors.success, fontStyle: "italic" }}>
                        {section.discount}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* Total Line */}
              <div style={{ height: "3px", background: colors.success, margin: "20px 0" }}></div>

              {/* Estimated Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: colors.dark, margin: 0 }}>
                  Estimated Total:
                </h2>
                <span style={{ fontSize: "32px", fontWeight: "700", color: colors.success }}>
                  {formatCurrency(quote.total)}
                </span>
              </div>

              {/* Disclaimer */}
              <p style={{ fontSize: "11px", color: colors.gray, fontStyle: "italic", textAlign: "center", margin: 0 }}>
                *Estimate based on provided information. Final price may vary.
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
                No quote calculated yet. Fill out the form to see the estimate.
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
