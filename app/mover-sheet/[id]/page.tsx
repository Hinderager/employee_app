'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const colors = {
  primary: "#06649b",
  accent: "#00A3E0",
  dark: "#1F2937",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
  warning: "#F59E0B",
  danger: "#DC2626",
  success: "#10B981",
};

interface MoverSheetProps {
  params: {
    id: string;
  };
}

export default function MoverSheetPage({ params }: MoverSheetProps) {
  const { id } = params;
  const router = useRouter();
  const [sheetData, setSheetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const sheetPath = `/mover-sheet/${id}`;

    const fetchSheet = async () => {
      const { data, error } = await supabase
        .from('move_quote')
        .select('*')
        .eq('mover_sheet_url', sheetPath)
        .single();

      if (error || !data) {
        router.push('/404');
        return;
      }

      setSheetData(data);
      const expiresAt = data.quote_url_expires_at;
      setIsExpired(expiresAt && new Date(expiresAt) < new Date());
      setIsLoading(false);
    };

    fetchSheet();

    // Real-time subscription
    const channel = supabase
      .channel('mover-sheet-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'move_quote',
          filter: `mover_sheet_url=eq.${sheetPath}`,
        },
        (payload) => {
          setSheetData(payload.new);
          const expiresAt = payload.new.quote_url_expires_at;
          setIsExpired(expiresAt && new Date(expiresAt) < new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: colors.lightGray, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: colors.gray, fontSize: "18px" }}>Loading...</div>
      </div>
    );
  }

  if (!sheetData) return null;

  if (isExpired) {
    return (
      <div style={{ minHeight: "100vh", background: colors.lightGray, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{ maxWidth: "400px", background: colors.white, borderRadius: "12px", padding: "32px", textAlign: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: colors.dark, marginBottom: "8px" }}>Sheet Expired</h1>
          <p style={{ color: colors.gray }}>This mover sheet link has expired.</p>
        </div>
      </div>
    );
  }

  const formData = sheetData.form_data || {};
  const quoteNumber = sheetData.quote_number || 'N/A';

  // Customer info
  const customerName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Customer';
  const customerPhone = formData.phone || '';

  // Format helpers
  const formatPhone = (phone: string) => {
    const cleaned = phone?.replace(/\D/g, "") || "";
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone || "";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatLocationType = (type: string) => {
    const types: Record<string, string> = {
      'house': 'House',
      'apartment': 'Apartment',
      'storage-unit': 'Storage Unit',
      'truck': 'Truck/Container',
      'pod': 'POD',
      'business': 'Business',
      'other': 'Other'
    };
    return types[type] || type || 'Unknown';
  };

  // Build special items list
  const specialItems: string[] = [];
  if (formData.gunSafes) specialItems.push(`Gun Safe${formData.gunSafesQty > 1 ? ` (${formData.gunSafesQty})` : ''}${formData.gunSafesDetails ? `: ${formData.gunSafesDetails}` : ''}`);
  if (formData.pianos) specialItems.push(`Piano${formData.pianosQty > 1 ? ` (${formData.pianosQty})` : ''}${formData.pianosDetails ? `: ${formData.pianosDetails}` : ''}`);
  if (formData.poolTable) specialItems.push(`Pool Table${formData.poolTableDetails ? `: ${formData.poolTableDetails}` : ''}`);
  if (formData.treadmills) specialItems.push(`Treadmill${formData.treadmillsDetails ? `: ${formData.treadmillsDetails}` : ''}`);
  if (formData.gymEquipment) specialItems.push(`Gym Equipment${formData.gymEquipmentQty > 1 ? ` (${formData.gymEquipmentQty})` : ''}${formData.gymEquipmentDetails ? `: ${formData.gymEquipmentDetails}` : ''}`);

  // Appliances - only show if largeAppliances parent toggle is on
  const appliances: string[] = [];
  if (formData.largeAppliances) {
    if (formData.applianceFridge) appliances.push(`Fridge${formData.applianceFridgeQty > 1 ? ` (${formData.applianceFridgeQty})` : ''}`);
    if (formData.applianceWasher) appliances.push(`Washer${formData.applianceWasherQty > 1 ? ` (${formData.applianceWasherQty})` : ''}`);
    if (formData.applianceDryer) appliances.push(`Dryer${formData.applianceDryerQty > 1 ? ` (${formData.applianceDryerQty})` : ''}`);
    if (formData.applianceOven) appliances.push(`Oven${formData.applianceOvenQty > 1 ? ` (${formData.applianceOvenQty})` : ''}`);
    if (formData.applianceDishwasher) appliances.push(`Dishwasher${formData.applianceDishwasherQty > 1 ? ` (${formData.applianceDishwasherQty})` : ''}`);
    if (formData.applianceOtherDetails) appliances.push(formData.applianceOtherDetails);
  }

  // Equipment needed
  const equipment: string[] = [];
  if (formData.applianceDolly || appliances.length > 0) equipment.push('Appliance Dolly');
  if (formData.safeDolly || formData.gunSafes) equipment.push('Safe Dolly');
  if (formData.pianos) equipment.push('Piano Board/Skid');
  if (formData.poolTable) equipment.push('Pool Table Tools');

  // Packing services
  const packingServices: string[] = [];
  if (formData.needsPacking) {
    packingServices.push(`Packing: ${formData.packingStatus || 'Standard'}`);
    if (formData.packingKitchen) packingServices.push('Kitchen');
    if (formData.packingGarage) packingServices.push('Garage');
    if (formData.packingAttic) packingServices.push('Attic');
    if (formData.packingWardrobeBoxes) packingServices.push('Wardrobe Boxes');
    if (formData.packingFragileItems) packingServices.push('Fragile Items');
  }

  // Special disassembly
  const disassembly: string[] = [];
  if (formData.specialDisassemblyOther && formData.specialDisassemblyOtherDetails) {
    disassembly.push(formData.specialDisassemblyOtherDetails);
  }

  // Section component
  const Section = ({ title, children, color = colors.primary }: { title: string; children: React.ReactNode; color?: string }) => (
    <div style={{ marginBottom: "16px", background: colors.white, borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <div style={{ background: color, color: colors.white, padding: "8px 12px", fontWeight: "600", fontSize: "14px" }}>
        {title}
      </div>
      <div style={{ padding: "12px" }}>
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value, highlight = false }: { label: string; value: string | React.ReactNode; highlight?: boolean }) => (
    <div style={{ display: "flex", marginBottom: "4px", fontSize: "13px" }}>
      <span style={{ color: colors.gray, minWidth: "100px" }}>{label}:</span>
      <span style={{ color: highlight ? colors.danger : colors.dark, fontWeight: highlight ? "600" : "normal" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: colors.lightGray, padding: "12px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: colors.primary, color: colors.white, padding: "16px", borderRadius: "8px", marginBottom: "12px", textAlign: "center" }}>
          <Image
            src="/images/topshelf-logo.png"
            alt="TopShelf"
            width={120}
            height={80}
            style={{ marginBottom: "8px" }}
            priority
          />
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 4px 0" }}>MOVER CUT SHEET</h1>
          <p style={{ fontSize: "12px", opacity: 0.9, margin: 0 }}>Quote #{quoteNumber}</p>
        </div>

        {/* Customer & Date */}
        <Section title="📋 JOB INFO">
          <InfoRow label="Customer" value={customerName} />
          <InfoRow label="Phone" value={<a href={`tel:${customerPhone}`} style={{ color: colors.accent }}>{formatPhone(customerPhone)}</a>} />
          <InfoRow label="Move Date" value={formData.moveDateUnknown ? 'TBD' : formatDate(formData.preferredDate)} highlight={!formData.preferredDate && !formData.moveDateUnknown} />
          {formData.timeFlexible && <InfoRow label="Time" value="Flexible" />}
          <InfoRow label="Service" value={formData.serviceType === 'labor-only' ? '🔧 LABOR ONLY' : '🚚 TRUCK + LABOR'} highlight />
        </Section>

        {/* Pickup Location */}
        <Section title="📍 PICKUP" color="#10B981">
          <InfoRow label="Type" value={formatLocationType(formData.pickupLocationType)} />
          <InfoRow label="Address" value={formData.pickupAddress || 'TBD'} />
          {formData.pickupUnit && <InfoRow label="Unit" value={formData.pickupUnit} />}
          <InfoRow label="City" value={`${formData.pickupCity || ''}, ${formData.pickupState || ''} ${formData.pickupZip || ''}`} />
          {formData.pickupStairs > 1 && <InfoRow label="Stairs" value={`${formData.pickupStairs} flights`} highlight />}
          {formData.pickupElevator && <InfoRow label="Elevator" value="Yes" />}
          {formData.pickupLongCarry && <InfoRow label="Long Carry" value="Yes" highlight />}
          {formData.pickupHouseSquareFeet && <InfoRow label="Sq Ft" value={formData.pickupHouseSquareFeet} />}
          {formData.pickupApartmentSquareFeet && <InfoRow label="Sq Ft" value={formData.pickupApartmentSquareFeet} />}
          {formData.pickupStorageSize && <InfoRow label="Size" value={formData.pickupStorageSize} />}
        </Section>

        {/* Additional Stop */}
        {formData.hasAdditionalStop && formData.additionalStopAddress && (
          <Section title="📍 ADDITIONAL STOP" color="#F59E0B">
            <InfoRow label="Address" value={formData.additionalStopAddress} />
            {formData.additionalStopUnit && <InfoRow label="Unit" value={formData.additionalStopUnit} />}
            <InfoRow label="City" value={`${formData.additionalStopCity || ''}, ${formData.additionalStopState || ''} ${formData.additionalStopZip || ''}`} />
            {formData.additionalStopStairs > 1 && <InfoRow label="Stairs" value={`${formData.additionalStopStairs} flights`} highlight />}
          </Section>
        )}

        {/* Delivery Location */}
        <Section title="📍 DELIVERY" color="#3B82F6">
          <InfoRow label="Type" value={formatLocationType(formData.deliveryLocationType)} />
          <InfoRow label="Address" value={formData.deliveryAddress || 'TBD'} />
          {formData.deliveryUnit && <InfoRow label="Unit" value={formData.deliveryUnit} />}
          <InfoRow label="City" value={`${formData.deliveryCity || ''}, ${formData.deliveryState || ''} ${formData.deliveryZip || ''}`} />
          {formData.deliveryStairs > 1 && <InfoRow label="Stairs" value={`${formData.deliveryStairs} flights`} highlight />}
          {formData.deliveryElevator && <InfoRow label="Elevator" value="Yes" />}
          {formData.deliveryLongCarry && <InfoRow label="Long Carry" value="Yes" highlight />}
          {formData.deliveryStorageSize && <InfoRow label="Size" value={formData.deliveryStorageSize} />}
        </Section>

        {/* Special Items */}
        {(specialItems.length > 0 || appliances.length > 0) && (
          <Section title="⚠️ SPECIAL ITEMS" color="#DC2626">
            {specialItems.map((item, i) => (
              <div key={i} style={{ fontSize: "13px", marginBottom: "4px", color: colors.dark }}>• {item}</div>
            ))}
            {appliances.length > 0 && (
              <div style={{ marginTop: specialItems.length > 0 ? "8px" : 0 }}>
                <span style={{ fontSize: "12px", color: colors.gray }}>Appliances:</span>
                <div style={{ fontSize: "13px", color: colors.dark }}>{appliances.join(', ')}</div>
              </div>
            )}
          </Section>
        )}

        {/* Equipment Needed */}
        {equipment.length > 0 && (
          <Section title="🛠️ EQUIPMENT NEEDED" color="#8B5CF6">
            {equipment.map((item, i) => (
              <div key={i} style={{ fontSize: "13px", marginBottom: "4px", color: colors.dark }}>✓ {item}</div>
            ))}
          </Section>
        )}

        {/* Packing Services */}
        {packingServices.length > 0 && (
          <Section title="📦 PACKING SERVICES" color="#F97316">
            {packingServices.map((item, i) => (
              <div key={i} style={{ fontSize: "13px", marginBottom: "4px", color: colors.dark }}>• {item}</div>
            ))}
          </Section>
        )}

        {/* Special Disassembly */}
        {disassembly.length > 0 && (
          <Section title="🔧 SPECIAL DISASSEMBLY" color="#6366F1">
            {disassembly.map((item, i) => (
              <div key={i} style={{ fontSize: "13px", marginBottom: "4px", color: colors.dark }}>• {item}</div>
            ))}
          </Section>
        )}

        {/* Pets */}
        {formData.hasPets && (
          <Section title="🐾 PETS ON SITE" color="#EC4899">
            <div style={{ fontSize: "13px", color: colors.dark }}>
              {formData.petDetails || 'Yes - be aware of pets'}
            </div>
          </Section>
        )}

        {/* Special Notes */}
        {formData.specialRequests && (
          <Section title="📝 SPECIAL NOTES" color="#374151">
            <div style={{ fontSize: "13px", color: colors.dark, whiteSpace: "pre-wrap" }}>
              {formData.specialRequests}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "16px", fontSize: "11px", color: colors.gray }}>
          <p>Top Shelf Moving & Junk Removal</p>
          <p>(208) 593-2877</p>
        </div>
      </div>
    </div>
  );
}
