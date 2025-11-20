"use client";

import { useState } from "react";
import Image from "next/image";

// Brand colors with more vibrant accents
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

// Sample quote data
const sampleQuote = {
  estimateNumber: "3374-1",
  date: "Wed Nov 19, 2025",
  preparedFor: {
    name: "Eric Hinderager Top Shelf Mobile",
    address: "5015 North Lolo Pass Way",
    cityStateZip: "Meridian, Idaho 83646",
    phone: "(208) 866-2339",
    email: "erichinderager@gmail.com"
  },
  serviceLocation: {
    name: "Eric Hinderager Top Shelf Mobile",
    address: "5015 North Lolo Pass Way",
    cityStateZip: "Meridian, Idaho 83646",
    phone: "(208) 866-2339",
    email: "erichinderager@gmail.com"
  },
  quoteItems: [
    {
      category: "Moving",
      total: 850,
      items: [
        { description: "Labor", amount: 680 },
        { description: "Materials and Supplies", amount: 170 }
      ]
    },
    {
      category: "Travel (first 15 miles included)",
      total: 125,
      items: [
        { description: "Travel to Start (18.9 mi, 26 min)", amount: 38 },
        { description: "Move Travel (22.1 mi, 25 min)", amount: 30 },
        { description: "Return Travel (12.1 mi, 20 min)", amount: 24 },
        { description: "Crew Travel Time", amount: 33 }
      ]
    },
    {
      category: "Heavy/Special Items",
      total: 260,
      items: [
        { description: "Piano", amount: 100 },
        { description: "Gun Safe", amount: 100 },
        { description: "Large TV (75\")", amount: 60 }
      ]
    },
    {
      category: "Stairs & Access",
      total: 75,
      items: [
        { description: "3rd Floor (2 flights)", amount: 50 },
        { description: "Long Carry (200+ ft)", amount: 25 }
      ]
    },
    {
      category: "Packing Services",
      total: 340,
      discount: "*20% off w/move",
      items: [
        { description: "Moderate packing", amount: 340 }
      ]
    }
  ],
  total: 1650,
  terms: "Estimates are an approximation of charges to you, and they are based on the anticipated details of the work to be done. It is possible for unexpected complications to cause some deviation from the estimate. If additional parts or labor are required you will be contacted immediately.",
  notes: ""
};

export default function SampleQuotePage() {
  const [showBooking, setShowBooking] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F5", padding: "40px 20px" }}>
      {/* Print-ready container */}
      <div style={{
        maxWidth: "850px",
        margin: "0 auto",
        background: colors.white,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        padding: "60px",
        fontFamily: "Arial, sans-serif"
      }}>

        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
          {/* Left: Logo and Company Info */}
          <div>
            <Image
              src="/images/topshelf-logo.png"
              alt="TopShelf"
              width={180}
              height={120}
              style={{ marginBottom: "16px" }}
              priority
            />
            <div style={{ color: colors.gray, fontSize: "13px", lineHeight: "1.6" }}>
              <p style={{ margin: "4px 0", fontWeight: "500", color: colors.dark }}>Top Shelf Moving and Junk Removal</p>
              <p style={{ margin: "4px 0" }}>1755 N Westgate Dr Suite 110 Boise ID 83704</p>
              <p style={{ margin: "4px 0" }}>info@topshelfpros.com</p>
              <p style={{ margin: "4px 0", color: colors.primary, fontWeight: "600" }}>(208) 593-2877</p>
            </div>
          </div>

          {/* Right: Estimate Info */}
          <div style={{ textAlign: "right" }}>
            <h1 style={{ fontSize: "36px", fontWeight: "700", color: colors.gray, margin: "0 0 20px 0", letterSpacing: "1px" }}>
              ESTIMATE
            </h1>
            <table style={{ marginLeft: "auto", fontSize: "13px", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 12px 4px 0", color: colors.gray, fontWeight: "600" }}>Estimate #</td>
                  <td style={{ padding: "4px 0", color: colors.primary, textAlign: "right", fontWeight: "700" }}>{sampleQuote.estimateNumber}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 12px 4px 0", color: colors.gray, fontWeight: "600" }}>Date</td>
                  <td style={{ padding: "4px 0", color: colors.dark, textAlign: "right" }}>{sampleQuote.date}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 12px 4px 0", color: colors.gray, fontWeight: "600" }}>Total</td>
                  <td style={{ padding: "4px 0", color: colors.success, textAlign: "right", fontWeight: "700", fontSize: "15px" }}>{formatCurrency(sampleQuote.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Info Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginBottom: "40px" }}>
          {/* Prepared For */}
          <div style={{ padding: "20px", background: colors.lightGreen, borderLeft: `4px solid ${colors.success}`, borderRadius: "4px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: colors.dark, marginBottom: "12px" }}>
              Prepared For:
            </h3>
            <div style={{ fontSize: "13px", color: colors.gray, lineHeight: "1.6" }}>
              <p style={{ margin: "4px 0", fontWeight: "600", color: colors.dark }}>{sampleQuote.preparedFor.name}</p>
              <p style={{ margin: "4px 0" }}>{sampleQuote.preparedFor.address}</p>
              <p style={{ margin: "4px 0" }}>{sampleQuote.preparedFor.cityStateZip}</p>
              <p style={{ margin: "4px 0", color: colors.primary }}>{sampleQuote.preparedFor.phone}</p>
              <p style={{ margin: "4px 0", color: colors.primary }}>{sampleQuote.preparedFor.email}</p>
            </div>
          </div>

          {/* Service Location */}
          <div style={{ padding: "20px", background: "#EFF6FF", borderLeft: `4px solid ${colors.primary}`, borderRadius: "4px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: colors.dark, marginBottom: "12px" }}>
              Service Location:
            </h3>
            <div style={{ fontSize: "13px", color: colors.gray, lineHeight: "1.6" }}>
              <p style={{ margin: "4px 0", fontWeight: "600", color: colors.dark }}>{sampleQuote.serviceLocation.name}</p>
              <p style={{ margin: "4px 0" }}>{sampleQuote.serviceLocation.address}</p>
              <p style={{ margin: "4px 0" }}>{sampleQuote.serviceLocation.cityStateZip}</p>
              <p style={{ margin: "4px 0", color: colors.primary }}>{sampleQuote.serviceLocation.phone}</p>
              <p style={{ margin: "4px 0", color: colors.primary }}>{sampleQuote.serviceLocation.email}</p>
            </div>
          </div>
        </div>

        {/* Active Estimate Card */}
        <div style={{
          border: `3px solid ${colors.border}`,
          borderRadius: "12px",
          padding: "30px",
          background: colors.white,
          marginBottom: "30px"
        }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", color: colors.dark, marginBottom: "24px" }}>
            Active Estimate
          </h2>

          {/* Quote Items */}
          {sampleQuote.quoteItems.map((section, index) => (
            <div key={index} style={{ marginBottom: "24px" }}>
              {/* Category Header */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: colors.dark, margin: 0 }}>
                  {section.category}
                </h3>
                <span style={{ fontSize: "16px", fontWeight: "700", color: colors.dark }}>
                  {formatCurrency(section.total)}
                </span>
              </div>

              {/* Sub Items */}
              <div style={{ paddingLeft: "24px" }}>
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", color: colors.gray }}>
                      {item.description}
                    </span>
                    <span style={{ fontSize: "14px", color: colors.primary, fontWeight: "600" }}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                {section.discount && (
                  <div style={{ marginTop: "8px" }}>
                    <span style={{ fontSize: "12px", color: colors.success, fontStyle: "italic" }}>
                      {section.discount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Total Line */}
          <div style={{ height: "3px", background: colors.success, margin: "24px 0" }}></div>

          {/* Estimated Total */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: colors.dark, margin: 0 }}>
              Estimated Total:
            </h2>
            <span style={{ fontSize: "36px", fontWeight: "700", color: colors.success }}>
              {formatCurrency(sampleQuote.total)}
            </span>
          </div>

          {/* Disclaimer */}
          <p style={{ fontSize: "12px", color: colors.gray, fontStyle: "italic", textAlign: "center", margin: 0 }}>
            *Estimate based on provided information. Final price may vary.
          </p>
        </div>

        {/* Terms Section */}
        <div style={{ marginTop: "40px", marginBottom: "30px", padding: "20px", background: "#FEF3C7", borderLeft: `4px solid #F59E0B`, borderRadius: "4px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: colors.dark, marginBottom: "8px" }}>
            Terms:
          </h3>
          <p style={{ fontSize: "12px", color: colors.gray, lineHeight: "1.6", margin: 0 }}>
            {sampleQuote.terms}
          </p>
        </div>

        {/* Notes Section */}
        {sampleQuote.notes && (
          <div style={{ marginBottom: "50px", padding: "20px", background: "#F5F5F5", borderRadius: "4px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: colors.dark, marginBottom: "8px" }}>
              Notes:
            </h3>
            <p style={{ fontSize: "12px", color: colors.gray, lineHeight: "1.6", margin: 0 }}>
              {sampleQuote.notes}
            </p>
          </div>
        )}

        {/* Thank You Message */}
        <div style={{ textAlign: "center", marginTop: "60px", paddingTop: "30px", borderTop: `2px solid ${colors.success}` }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", color: colors.dark, margin: 0 }}>
            Thank You For Your Business
          </h2>
        </div>

        {/* Action Buttons (not in print) */}
        <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          marginTop: "40px",
          paddingTop: "30px",
          borderTop: `1px solid ${colors.lightGray}`
        }} className="no-print">
          <button
            onClick={() => window.print()}
            style={{
              padding: "14px 36px",
              background: colors.white,
              color: colors.primary,
              border: `2px solid ${colors.primary}`,
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.primary;
              e.currentTarget.style.color = colors.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.white;
              e.currentTarget.style.color = colors.primary;
            }}
          >
            📄 Print / Save PDF
          </button>
          <button
            onClick={() => setShowBooking(true)}
            style={{
              padding: "14px 36px",
              background: `linear-gradient(135deg, ${colors.success}, #059669)`,
              color: colors.white,
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            📅 Book This Move
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px",
        }} onClick={() => setShowBooking(false)}>
          <div style={{
            background: colors.white,
            borderRadius: "12px",
            padding: "40px",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            border: `3px solid ${colors.success}`,
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "28px", fontWeight: "700", color: colors.dark, marginBottom: "8px" }}>
              📅 Book Your Move
            </h2>
            <p style={{ fontSize: "14px", color: colors.gray, marginBottom: "28px" }}>
              Ready to get started? Contact us to schedule your move and secure your date:
            </p>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: colors.gray, marginBottom: "8px", fontWeight: "600" }}>
                📞 CALL US NOW:
              </p>
              <a
                href="tel:+12085932877"
                style={{
                  display: "block",
                  padding: "18px",
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: colors.white,
                  textAlign: "center",
                  borderRadius: "8px",
                  fontSize: "22px",
                  fontWeight: "700",
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                (208) 593-2877
              </a>
            </div>

            <div style={{ textAlign: "center", margin: "20px 0", color: colors.gray, fontWeight: "600" }}>
              OR
            </div>

            <div>
              <p style={{ fontSize: "12px", color: colors.gray, marginBottom: "8px", fontWeight: "600" }}>
                ✉️ EMAIL US:
              </p>
              <a
                href="mailto:info@topshelfpros.com?subject=Book Move - Quote 3374-1"
                style={{
                  display: "block",
                  padding: "18px",
                  background: colors.primary,
                  color: colors.white,
                  textAlign: "center",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#005A94")}
                onMouseLeave={(e) => (e.currentTarget.style.background = colors.primary)}
              >
                info@topshelfpros.com
              </a>
            </div>

            <button
              onClick={() => setShowBooking(false)}
              style={{
                marginTop: "24px",
                padding: "12px",
                background: "transparent",
                color: colors.gray,
                border: "none",
                width: "100%",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
