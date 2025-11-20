"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

// Brand colors from logo
const colors = {
  primary: "#0072BC", // Blue
  dark: "#3A3A3A", // Charcoal gray
  light: "#F8F9FA", // Light background
  success: "#10B981", // Green for total
  white: "#FFFFFF",
};

interface QuoteItem {
  description: string;
  amount: number;
  discount?: string;
  subItems?: Array<{ description: string; amount: number }>;
}

interface QuoteData {
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone: string;
  phones?: Array<{ number: string; name: string }>;
  emails?: Array<{ email: string; name: string }>;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  quote?: {
    baseRate: number;
    items: QuoteItem[];
    total: number;
  };
}

export default function QuotePage() {
  const params = useParams();
  const router = useRouter();
  const phone = params.phone as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [jobNumber, setJobNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/quote/get-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, lastName }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setQuoteData(data.quote);
        setJobNumber(data.jobNumber);
        setIsAuthenticated(true);
        setError("");
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch (err) {
      setError("Failed to load quote. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPhone = (phoneStr: string) => {
    const cleaned = phoneStr.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneStr;
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)` }}>
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "60px 20px" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ background: colors.white, padding: "30px", borderRadius: "16px", display: "inline-block", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
              <Image
                src="/images/topshelf-logo.png"
                alt="Top Shelf Moving"
                width={300}
                height={80}
                style={{ maxWidth: "100%", height: "auto" }}
                priority
              />
            </div>
          </div>

          {/* Login Card */}
          <div style={{ background: colors.white, borderRadius: "16px", padding: "40px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "700", color: colors.dark, marginBottom: "10px", textAlign: "center" }}>
              View Your Moving Quote
            </h1>
            <p style={{ color: "#6B7280", textAlign: "center", marginBottom: "30px" }}>
              Enter your details to access your personalized quote
            </p>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: colors.dark, marginBottom: "8px" }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: `2px solid ${error ? "#EF4444" : "#E5E7EB"}`,
                    borderRadius: "8px",
                    fontSize: "16px",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                  onBlur={(e) => (e.target.style.borderColor = error ? "#EF4444" : "#E5E7EB")}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: colors.dark, marginBottom: "8px" }}>
                  Last 4 Digits of Phone Number
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: `2px solid ${error ? "#EF4444" : "#E5E7EB"}`,
                    borderRadius: "8px",
                    fontSize: "16px",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                  onBlur={(e) => (e.target.style.borderColor = error ? "#EF4444" : "#E5E7EB")}
                />
              </div>

              {error && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "12px", marginBottom: "20px" }}>
                  <p style={{ color: "#DC2626", fontSize: "14px", margin: 0 }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: loading ? "#9CA3AF" : colors.primary,
                  color: colors.white,
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 12px rgba(0,114,188,0.3)",
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#005A94")}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = colors.primary)}
              >
                {loading ? "Loading..." : "View Quote"}
              </button>
            </form>

            <p style={{ marginTop: "20px", fontSize: "12px", color: "#9CA3AF", textAlign: "center" }}>
              Need help? Contact us at{" "}
              <a href="tel:+1234567890" style={{ color: colors.primary, textDecoration: "none" }}>
                (123) 456-7890
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - Show Quote
  return (
    <div style={{ minHeight: "100vh", background: colors.light, paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ background: colors.white, borderBottom: "1px solid #E5E7EB", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <Image
            src="/images/topshelf-logo.png"
            alt="Top Shelf Moving"
            width={200}
            height={55}
            style={{ maxWidth: "100%", height: "auto" }}
            priority
          />
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", color: "#6B7280" }}>
              Quote #{jobNumber}
            </span>
            <button
              onClick={() => setShowBooking(true)}
              style={{
                padding: "10px 24px",
                background: colors.success,
                color: colors.white,
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              Book This Move
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 20px" }}>
        {/* Customer Info Card */}
        <div style={{ background: colors.white, borderRadius: "12px", padding: "30px", marginBottom: "30px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: colors.dark, marginBottom: "20px" }}>
            Move Details
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {/* Customer Info */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#6B7280", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Customer
              </h3>
              <p style={{ fontSize: "16px", fontWeight: "600", color: colors.dark, marginBottom: "4px" }}>
                {quoteData?.firstName} {quoteData?.lastName}
              </p>
              {quoteData?.company && (
                <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "4px" }}>
                  {quoteData.company}
                </p>
              )}
              <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "4px" }}>
                {formatPhone(quoteData?.phones?.[0]?.number || quoteData?.phone || "")}
              </p>
              <p style={{ fontSize: "14px", color: "#6B7280" }}>
                {quoteData?.emails?.[0]?.email || quoteData?.email || ""}
              </p>
            </div>

            {/* Pickup */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#6B7280", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Pickup Location
              </h3>
              <p style={{ fontSize: "14px", color: colors.dark, lineHeight: "1.6" }}>
                {quoteData?.pickupAddress}
                <br />
                {quoteData?.pickupCity}, {quoteData?.pickupState} {quoteData?.pickupZip}
              </p>
            </div>

            {/* Delivery */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#6B7280", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Delivery Location
              </h3>
              <p style={{ fontSize: "14px", color: colors.dark, lineHeight: "1.6" }}>
                {quoteData?.deliveryAddress}
                <br />
                {quoteData?.deliveryCity}, {quoteData?.deliveryState} {quoteData?.deliveryZip}
              </p>
            </div>
          </div>
        </div>

        {/* Quote Details Card */}
        <div style={{ background: colors.white, borderRadius: "12px", padding: "30px", marginBottom: "30px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: colors.dark, marginBottom: "24px" }}>
            Your Quote
          </h2>

          {quoteData?.quote && quoteData.quote.items.length > 0 ? (
            <div>
              {/* Quote Items */}
              <div style={{ borderBottom: "2px solid #E5E7EB", paddingBottom: "20px", marginBottom: "20px" }}>
                {quoteData.quote.items.map((item, index) => (
                  <div key={index} style={{ marginBottom: "16px" }}>
                    {/* Main Item */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "16px", fontWeight: "500", color: colors.dark }}>
                          {item.description}
                        </p>
                        {item.discount && (
                          <p style={{ fontSize: "12px", color: "#10B981", marginTop: "4px" }}>
                            {item.discount}
                          </p>
                        )}
                      </div>
                      <p style={{ fontSize: "16px", fontWeight: "600", color: colors.dark, minWidth: "100px", textAlign: "right" }}>
                        {formatCurrency(item.amount)}
                      </p>
                    </div>

                    {/* Sub Items */}
                    {item.subItems && item.subItems.length > 0 && (
                      <div style={{ marginLeft: "24px", marginTop: "8px" }}>
                        {item.subItems.map((subItem, subIndex) => (
                          <div key={subIndex} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <p style={{ fontSize: "14px", color: "#6B7280" }}>
                              {subItem.description}
                            </p>
                            <p style={{ fontSize: "14px", color: "#6B7280", minWidth: "100px", textAlign: "right" }}>
                              {formatCurrency(subItem.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", background: `linear-gradient(135deg, ${colors.primary}15, ${colors.success}15)`, borderRadius: "8px" }}>
                <h3 style={{ fontSize: "20px", fontWeight: "700", color: colors.dark }}>
                  Estimated Total
                </h3>
                <p style={{ fontSize: "32px", fontWeight: "700", color: colors.success }}>
                  {formatCurrency(quoteData.quote.total)}
                </p>
              </div>

              {/* Disclaimer */}
              <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "20px", fontStyle: "italic", textAlign: "center" }}>
                *Estimate based on provided information. Final price may vary based on actual items and conditions.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: "16px", color: "#6B7280" }}>
                Quote details are being prepared. Please contact us for more information.
              </p>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.dark})`, borderRadius: "12px", padding: "40px", textAlign: "center", color: colors.white, boxShadow: "0 8px 24px rgba(0,114,188,0.3)" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "12px" }}>
            Ready to Book Your Move?
          </h2>
          <p style={{ fontSize: "16px", marginBottom: "24px", opacity: 0.9 }}>
            Secure your moving date and get started with Top Shelf Moving
          </p>
          <button
            onClick={() => setShowBooking(true)}
            style={{
              padding: "16px 48px",
              background: colors.success,
              color: colors.white,
              border: "none",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            Book Now
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
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: colors.dark, marginBottom: "16px" }}>
              Book Your Move
            </h2>
            <p style={{ fontSize: "16px", color: "#6B7280", marginBottom: "24px" }}>
              Call us to schedule your move and secure your date:
            </p>
            <a
              href="tel:+1234567890"
              style={{
                display: "block",
                padding: "16px",
                background: colors.primary,
                color: colors.white,
                textAlign: "center",
                borderRadius: "8px",
                fontSize: "20px",
                fontWeight: "600",
                textDecoration: "none",
                marginBottom: "16px",
              }}
            >
              (123) 456-7890
            </a>
            <p style={{ fontSize: "14px", color: "#9CA3AF", textAlign: "center", marginBottom: "20px" }}>
              or
            </p>
            <a
              href={`mailto:info@topshelfmoving.com?subject=Book Move - Quote ${jobNumber}`}
              style={{
                display: "block",
                padding: "16px",
                background: colors.light,
                color: colors.dark,
                textAlign: "center",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                textDecoration: "none",
                border: `2px solid ${colors.primary}`,
              }}
            >
              Email Us
            </a>
            <button
              onClick={() => setShowBooking(false)}
              style={{
                marginTop: "20px",
                padding: "12px",
                background: "transparent",
                color: "#9CA3AF",
                border: "none",
                width: "100%",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
