"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  PhoneIcon,
  MapPinIcon,
  XMarkIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

// Initialize Supabase client for real-time subscriptions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Job {
  id: number;
  jobNumber: string;
  quoteNumber: string;
  customerName: string;
  phone: string;
  email: string;
  pickupAddress: string;
  deliveryAddress: string;
  serviceType: string;
  preferredDate: string;
  updatedAt: string;
  createdAt: string;
  formData: any;
  // Workiz data
  workizStatus?: string | null;
  workizJobType?: string | null;
  hasWorkizMatch?: boolean;
}

// Helper to format date as YYYY-MM-DD for comparison (using local timezone)
const formatDateForCompare = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format date for display
const formatDateDisplay = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDateForCompare(date) === formatDateForCompare(today)) {
    return "Today";
  } else if (formatDateForCompare(date) === formatDateForCompare(tomorrow)) {
    return "Tomorrow";
  } else if (formatDateForCompare(date) === formatDateForCompare(yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export default function MoveJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Helper to transform raw Supabase data to Job format
  const transformJob = useCallback((raw: any): Job => {
    const formData = raw.form_data || {};
    return {
      id: raw.id,
      jobNumber: raw.job_number || '',
      quoteNumber: raw.quote_number || '',
      customerName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Unknown',
      phone: raw.phone_number || formData.phone || '',
      email: formData.email || '',
      pickupAddress: formData.pickupAddress || raw.address || '',
      deliveryAddress: formData.deliveryAddress || '',
      serviceType: formData.serviceType || '',
      preferredDate: formData.preferredDate || '',
      updatedAt: raw.updated_at,
      createdAt: raw.created_at,
      formData: formData,
    };
  }, []);

  // Fetch jobs when selectedDate changes
  useEffect(() => {
    fetchJobs(selectedDate);
  }, [selectedDate]);

  // Real-time subscription for live updates
  useEffect(() => {
    // Subscribe to move_quote changes
    const moveQuoteChannel = supabase
      .channel('move-jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'move_quote',
        },
        (payload) => {
          console.log('[move-jobs] Real-time update received:', payload.eventType);
          // Re-fetch all jobs to get updated Workiz data
          fetchJobs();
        }
      )
      .subscribe((status) => {
        console.log('[move-jobs] move_quote subscription status:', status);
      });

    // Subscribe to all_workiz_jobs changes to update dates when Workiz syncs
    const workizChannel = supabase
      .channel('workiz-jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'all_workiz_jobs',
        },
        (payload) => {
          console.log('[move-jobs] Workiz data updated:', payload.eventType);
          // Re-fetch to get updated scheduled dates
          fetchJobs();
        }
      )
      .subscribe((status) => {
        console.log('[move-jobs] all_workiz_jobs subscription status:', status);
      });

    return () => {
      console.log('[move-jobs] Cleaning up Supabase subscriptions');
      supabase.removeChannel(moveQuoteChannel);
      supabase.removeChannel(workizChannel);
    };
  }, []);

  // Filter jobs by search query (date filtering is done by API)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredJobs(jobs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = jobs.filter((job) => {
      return (
        job.customerName.toLowerCase().includes(query) ||
        job.jobNumber.toLowerCase().includes(query) ||
        job.phone.includes(query) ||
        job.pickupAddress.toLowerCase().includes(query) ||
        job.deliveryAddress.toLowerCase().includes(query)
      );
    });

    setFilteredJobs(filtered);
  }, [searchQuery, jobs]);

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const fetchJobs = async (date: Date = selectedDate) => {
    try {
      setIsLoading(true);
      setError(null);

      // Format date as YYYY-MM-DD for the API
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const response = await fetch(`/api/move-jobs?date=${dateStr}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch jobs");
      }

      // Jobs are already filtered by date from API, set directly
      setJobs(data.jobs || []);
      setFilteredJobs(data.jobs || []);
    } catch (err) {
      console.error("[move-jobs] Error fetching jobs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    // Parse the date string manually to avoid timezone issues
    // Date-only strings like "2025-11-22" are interpreted as UTC,
    // which shifts back a day when converted to local time
    let year, month, day;
    if (dateString.includes('-')) {
      // YYYY-MM-DD format
      [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    } else if (dateString.includes('/')) {
      // MM/DD/YYYY format
      const parts = dateString.split('/').map(Number);
      [month, day, year] = parts;
    } else {
      // Fallback to Date parsing
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    // Create date at local noon to avoid any timezone edge cases
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
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

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
  };

  const closeModal = () => {
    setSelectedJob(null);
  };

  // Cut Sheet Component
  const CutSheet = ({ job }: { job: Job }) => {
    const formData = job.formData || {};

    // Helper functions
    const getHowFurnishedText = (value: number) => {
      if (value <= 20) return 'Lightly Furnished (20%)';
      if (value <= 40) return 'Partially Furnished (40%)';
      if (value <= 60) return 'Moderately Furnished (60%)';
      if (value <= 80) return 'Well Furnished (80%)';
      return 'Fully Furnished (100%)';
    };

    const getStorageFullnessText = (value: string) => {
      const map: Record<string, string> = {
        '25': '25% Full',
        '50': '50% Full',
        '75': '75% Full',
        '100': 'Completely Full'
      };
      return map[value] || value || 'Unknown';
    };

    const getParkingText = (value: string) => {
      const map: Record<string, string> = {
        'close': 'Close (< 50ft)',
        'medium': 'Medium (50-150ft)',
        'far': 'Far (150ft+)',
        'loading-dock': 'Loading Dock'
      };
      return map[value] || value || 'Unknown';
    };

    const getStorageUnitInfo = (prefix: string) => {
      const qty = formData[`${prefix}StorageUnitQuantity`] || 1;
      const sizes = formData[`${prefix}StorageUnitSizes`] || [];
      const howFull = formData[`${prefix}StorageUnitHowFull`] || [];
      const conditioned = formData[`${prefix}StorageUnitConditioned`] || [];

      const units: string[] = [];
      for (let i = 0; i < qty; i++) {
        const size = sizes[i] || 'Unknown size';
        const full = howFull[i] ? getStorageFullnessText(howFull[i]) : '';
        const climate = conditioned[i] ? ' (Climate Controlled)' : '';
        units.push(`Unit ${i + 1}: ${size}${full ? ` - ${full}` : ''}${climate}`);
      }
      return units;
    };

    // Build special items list with ALL details
    const specialItems: string[] = [];
    if (formData.gunSafes) specialItems.push(`Gun Safe${formData.gunSafesQty > 1 ? ` (${formData.gunSafesQty})` : ''}${formData.gunSafesDetails ? `: ${formData.gunSafesDetails}` : ''}`);
    if (formData.pianos) specialItems.push(`Piano${formData.pianosQty > 1 ? ` (${formData.pianosQty})` : ''}${formData.pianosDetails ? `: ${formData.pianosDetails}` : ''}`);
    if (formData.poolTables) specialItems.push(`Pool Table${formData.poolTablesQty > 1 ? ` (${formData.poolTablesQty})` : ''}${formData.poolTablesDetails ? `: ${formData.poolTablesDetails}` : ''}`);
    if (formData.hotTubs) specialItems.push(`Hot Tub${formData.hotTubsQty > 1 ? ` (${formData.hotTubsQty})` : ''}${formData.hotTubsDetails ? `: ${formData.hotTubsDetails}` : ''}`);
    if (formData.ridingMowers) specialItems.push(`Riding Mower${formData.ridingMowersQty > 1 ? ` (${formData.ridingMowersQty})` : ''}${formData.ridingMowersDetails ? `: ${formData.ridingMowersDetails}` : ''}`);
    if (formData.atvs) specialItems.push(`ATV/Golf Cart${formData.atvsQty > 1 ? ` (${formData.atvsQty})` : ''}${formData.atvsDetails ? `: ${formData.atvsDetails}` : ''}`);
    if (formData.motorcycles) specialItems.push(`Motorcycle${formData.motorcyclesQty > 1 ? ` (${formData.motorcyclesQty})` : ''}${formData.motorcyclesDetails ? `: ${formData.motorcyclesDetails}` : ''}`);
    if (formData.treadmills) specialItems.push(`Treadmill${formData.treadmillsQty > 1 ? ` (${formData.treadmillsQty})` : ''}${formData.treadmillsDetails ? `: ${formData.treadmillsDetails}` : ''}`);
    if (formData.ellipticals) specialItems.push(`Elliptical${formData.ellipticalsQty > 1 ? ` (${formData.ellipticalsQty})` : ''}${formData.ellipticalsDetails ? `: ${formData.ellipticalsDetails}` : ''}`);
    if (formData.gymEquipment) specialItems.push(`Gym Equipment${formData.gymEquipmentQty > 1 ? ` (${formData.gymEquipmentQty})` : ''}${formData.gymEquipmentDetails ? `: ${formData.gymEquipmentDetails}` : ''}`);
    if (formData.largeTVs) specialItems.push(`Large TV${formData.largeTVsQty > 1 ? ` (${formData.largeTVsQty})` : ''}${formData.largeTVsDetails ? `: ${formData.largeTVsDetails}` : ''}`);
    if (formData.purpleGreenMattress) specialItems.push(`Purple/Green Mattress${formData.purpleGreenMattressDetails ? `: ${formData.purpleGreenMattressDetails}` : ''}`);
    if (formData.plants) specialItems.push(`Plants${formData.plantsDetails ? `: ${formData.plantsDetails}` : ''}`);
    if (formData.tableSaw) specialItems.push(`Table Saw/Heavy Tools${formData.tableSawQty > 1 ? ` (${formData.tableSawQty})` : ''}${formData.tableSawDetails ? `: ${formData.tableSawDetails}` : ''}`);
    if (formData.otherHeavyItems) specialItems.push(`Other Heavy Items${formData.otherHeavyItemsDetails ? `: ${formData.otherHeavyItemsDetails}` : ''}`);
    if (formData.applianceDolly) specialItems.push('Appliance Dolly (standalone)');

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
    if (formData.poolTables) equipment.push('Pool Table Tools');
    if (formData.hotTubs) equipment.push('Hot Tub Equipment');

    // Packing services
    const packingServices: string[] = [];
    if (formData.needsPacking) {
      packingServices.push(`Level: ${formData.packingStatus || 'Standard'}`);
      if (formData.packingKitchen) packingServices.push('Kitchen');
      if (formData.packingGarage) packingServices.push('Garage');
      if (formData.packingAttic) packingServices.push('Attic');
      if (formData.packingWardrobeBoxes) packingServices.push('Wardrobe Boxes');
      if (formData.packingFragileItems) packingServices.push('Fragile Items');
    }

    // Special disassembly
    const disassembly: string[] = [];
    if (formData.trampoline) disassembly.push(`Trampoline${formData.trampolineQty > 1 ? ` (${formData.trampolineQty})` : ''}${formData.trampolineDetails ? `: ${formData.trampolineDetails}` : ''}`);
    if (formData.bunkBeds) disassembly.push(`Bunk Beds${formData.bunkBedsQty > 1 ? ` (${formData.bunkBedsQty})` : ''}${formData.bunkBedsDetails ? `: ${formData.bunkBedsDetails}` : ''}`);
    if (formData.gymEquipmentDisassembly) disassembly.push(`Gym Equipment${formData.gymEquipmentDisassemblyQty > 1 ? ` (${formData.gymEquipmentDisassemblyQty})` : ''}${formData.gymEquipmentDisassemblyDetails ? `: ${formData.gymEquipmentDisassemblyDetails}` : ''}`);
    if (formData.sauna) disassembly.push(`Sauna${formData.saunaQty > 1 ? ` (${formData.saunaQty})` : ''}${formData.saunaDetails ? `: ${formData.saunaDetails}` : ''}`);
    if (formData.playset) disassembly.push(`Playset${formData.playsetQty > 1 ? ` (${formData.playsetQty})` : ''}${formData.playsetDetails ? `: ${formData.playsetDetails}` : ''}`);
    if (formData.otherDisassembly) disassembly.push(`Other${formData.otherDisassemblyQty > 1 ? ` (${formData.otherDisassemblyQty})` : ''}${formData.otherDisassemblyDetails ? `: ${formData.otherDisassemblyDetails}` : ''}`);
    if (formData.specialDisassemblyBedFrames) disassembly.push('Bed Frames');
    if (formData.specialDisassemblyCribs) disassembly.push('Cribs');
    if (formData.specialDisassemblyFurniture) disassembly.push('Furniture');
    if (formData.specialDisassemblyOther && formData.specialDisassemblyOtherDetails) {
      disassembly.push(`Other: ${formData.specialDisassemblyOtherDetails}`);
    }

    const Section = ({ title, children, color }: { title: string; children: React.ReactNode; color: string }) => (
      <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
        <div className={`${color} text-white px-3 py-2 text-sm font-semibold`}>{title}</div>
        <div className="p-3 bg-white text-sm">{children}</div>
      </div>
    );

    const InfoRow = ({ label, value, highlight = false }: { label: string; value: string | React.ReactNode; highlight?: boolean }) => (
      <div className="flex mb-1 text-sm">
        <span className="text-gray-500 min-w-[100px]">{label}:</span>
        <span className={highlight ? "text-red-600 font-semibold" : "text-gray-900"}>{value}</span>
      </div>
    );

    // Location detail component
    const LocationDetails = ({ prefix, locationType }: { prefix: string; locationType: string }) => {
      const stairs = formData[`${prefix}Stairs`];
      const elevator = formData[`${prefix}Elevator`];
      const longCarry = formData[`${prefix}LongCarry`];
      const parking = formData[`${prefix}ParkingDistance`];
      const accessNotes = formData[`${prefix}AccessNotes`];

      return (
        <>
          {/* House details */}
          {locationType === 'house' && (
            <>
              {formData[`${prefix}HouseSquareFeet`] && <InfoRow label="Sq Ft" value={formData[`${prefix}HouseSquareFeet`]} />}
              {formData[`${prefix}Zestimate`] && <InfoRow label="Value" value={`$${Number(formData[`${prefix}Zestimate`]).toLocaleString()}`} />}
              {formData[`${prefix}HowFurnished`] && <InfoRow label="Furnished" value={getHowFurnishedText(formData[`${prefix}HowFurnished`])} />}
            </>
          )}
          {/* Apartment details */}
          {locationType === 'apartment' && (
            <>
              {formData[`${prefix}ApartmentSquareFeet`] && <InfoRow label="Sq Ft" value={formData[`${prefix}ApartmentSquareFeet`]} />}
              {formData[`${prefix}ApartmentBedBath`] && <InfoRow label="Bed/Bath" value={formData[`${prefix}ApartmentBedBath`]} />}
              {formData[`${prefix}ApartmentHowFurnished`] && <InfoRow label="Furnished" value={getHowFurnishedText(formData[`${prefix}ApartmentHowFurnished`])} />}
            </>
          )}
          {/* Storage unit details */}
          {locationType === 'storage-unit' && (
            <>
              {getStorageUnitInfo(prefix).map((unit, i) => (
                <div key={i} className="text-sm mb-1">• {unit}</div>
              ))}
            </>
          )}
          {/* Access details for all types */}
          {stairs > 1 && <InfoRow label="Stairs" value={`${stairs} flights`} highlight />}
          {elevator && stairs > 1 && <InfoRow label="Elevator" value="Yes" />}
          {longCarry && <InfoRow label="Long Carry" value="Yes" highlight />}
          {parking && <InfoRow label="Parking" value={getParkingText(parking)} />}
          {accessNotes && <InfoRow label="Access Notes" value={accessNotes} highlight />}
        </>
      );
    };

    return (
      <div className="space-y-2">
        {/* Job Info */}
        <Section title="📋 JOB INFO" color="bg-blue-600">
          <InfoRow label="Customer" value={job.customerName} />
          <InfoRow label="Phone" value={<a href={`tel:${job.phone}`} className="text-blue-600">{formatPhone(job.phone)}</a>} />
          <InfoRow label="Date" value={formData.moveDateUnknown ? 'TBD' : formatDate(job.preferredDate)} />
          {formData.timeFlexible && <InfoRow label="Time" value="Flexible" />}
          {formData.timingNotes && <InfoRow label="Timing" value={formData.timingNotes} />}
          <InfoRow label="Service" value={formData.serviceType === 'labor-only' ? '🔧 LABOR ONLY' : '🚚 TRUCK + LABOR'} highlight />
          {formData.crewSizeNotes && <InfoRow label="Crew Notes" value={formData.crewSizeNotes} />}
        </Section>

        {/* Pickup */}
        <Section title="📍 PICKUP" color="bg-green-600">
          <InfoRow label="Type" value={formatLocationType(formData.pickupLocationType)} />
          <InfoRow label="Address" value={formData.pickupAddress || 'TBD'} />
          {formData.pickupUnit && <InfoRow label="Unit" value={formData.pickupUnit} />}
          <InfoRow label="City" value={`${formData.pickupCity || ''}, ${formData.pickupState || ''} ${formData.pickupZip || ''}`} />
          <LocationDetails prefix="pickup" locationType={formData.pickupLocationType} />
        </Section>

        {/* Additional Stop */}
        {formData.hasAdditionalStop && formData.additionalStopAddress && (
          <Section title="📍 ADDITIONAL STOP" color="bg-yellow-500">
            <InfoRow label="Type" value={formatLocationType(formData.additionalStopLocationType)} />
            <InfoRow label="Address" value={formData.additionalStopAddress} />
            {formData.additionalStopUnit && <InfoRow label="Unit" value={formData.additionalStopUnit} />}
            <InfoRow label="City" value={`${formData.additionalStopCity || ''}, ${formData.additionalStopState || ''} ${formData.additionalStopZip || ''}`} />
            <LocationDetails prefix="additionalStop" locationType={formData.additionalStopLocationType} />
            {formData.additionalStopNotes && <InfoRow label="Notes" value={formData.additionalStopNotes} highlight />}
          </Section>
        )}

        {/* Delivery */}
        <Section title="📍 DELIVERY" color="bg-blue-500">
          <InfoRow label="Type" value={formatLocationType(formData.deliveryLocationType)} />
          <InfoRow label="Address" value={formData.deliveryAddress || 'TBD'} />
          {formData.deliveryUnit && <InfoRow label="Unit" value={formData.deliveryUnit} />}
          <InfoRow label="City" value={`${formData.deliveryCity || ''}, ${formData.deliveryState || ''} ${formData.deliveryZip || ''}`} />
          <LocationDetails prefix="delivery" locationType={formData.deliveryLocationType} />
        </Section>

        {/* Special Items */}
        {(specialItems.length > 0 || appliances.length > 0) && (
          <Section title="⚠️ SPECIAL ITEMS" color="bg-red-600">
            {specialItems.map((item, i) => (
              <div key={i} className="mb-1">• {item}</div>
            ))}
            {appliances.length > 0 && (
              <div className="mt-2">
                <span className="text-gray-500 text-xs">Appliances:</span>
                <div>{appliances.join(', ')}</div>
              </div>
            )}
          </Section>
        )}

        {/* Equipment */}
        {equipment.length > 0 && (
          <Section title="🛠️ EQUIPMENT NEEDED" color="bg-purple-600">
            {equipment.map((item, i) => (
              <div key={i}>✓ {item}</div>
            ))}
          </Section>
        )}

        {/* Packing */}
        {packingServices.length > 0 && (
          <Section title="📦 PACKING" color="bg-orange-500">
            {packingServices.map((item, i) => (
              <div key={i}>• {item}</div>
            ))}
          </Section>
        )}

        {/* Disassembly */}
        {disassembly.length > 0 && (
          <Section title="🔧 DISASSEMBLY" color="bg-indigo-600">
            {disassembly.map((item, i) => (
              <div key={i}>• {item}</div>
            ))}
          </Section>
        )}

        {/* Junk Removal */}
        {formData.junkRemovalNeeded && (
          <Section title="🗑️ JUNK REMOVAL" color="bg-amber-600">
            {formData.junkRemovalAmount && <InfoRow label="Amount" value={formData.junkRemovalAmount} />}
            {formData.junkRemovalDetails && <div className="mt-1">{formData.junkRemovalDetails}</div>}
          </Section>
        )}

        {/* Pets */}
        {(formData.hasPets || formData.catsPresent) && (
          <Section title="🐾 PETS ON SITE" color="bg-pink-500">
            {formData.catsPresent && <div>🐱 Cats present</div>}
            {formData.hasPets && <div>{formData.petDetails || 'Yes - be aware of pets'}</div>}
          </Section>
        )}

        {/* Special Notes */}
        {formData.specialRequests && (
          <Section title="📝 SPECIAL NOTES" color="bg-gray-700">
            <div className="whitespace-pre-wrap">{formData.specialRequests}</div>
          </Section>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom">
      {/* Header */}
      <header className="shadow-sm safe-top" style={{ backgroundColor: "#06649b" }}>
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/home" className="text-white hover:text-gray-200">
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <h1 className="text-lg font-bold text-white">Move Jobs</h1>
          </div>
        </div>
      </header>

      {/* Date Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={goToPreviousDay}
            className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>

          <button
            onClick={goToToday}
            className="flex flex-col items-center min-w-[140px]"
          >
            <span className="text-lg font-semibold text-gray-900">
              {formatDateDisplay(selectedDate)}
            </span>
            <span className="text-xs text-gray-500">
              {selectedDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </button>

          <button
            onClick={goToNextDay}
            className="p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-500">Loading jobs...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => fetchJobs()}
              className="mt-2 text-sm text-red-700 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <TruckIcon className="h-16 w-16 text-gray-300 mx-auto" />
            <p className="mt-4 text-gray-500">
              {searchQuery
                ? "No jobs match your search"
                : `No jobs scheduled for ${formatDateDisplay(selectedDate)}`}
            </p>
            {formatDateForCompare(selectedDate) !== formatDateForCompare(new Date()) && (
              <button
                onClick={goToToday}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Go to Today
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-2">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""} for {formatDateDisplay(selectedDate)}
            </p>
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => handleJobClick(job)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {job.customerName || "Unknown Customer"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {job.jobNumber.startsWith("TEMP-") ? (
                        <span className="text-orange-600">{job.jobNumber}</span>
                      ) : (
                        `Job #${job.jobNumber}`
                      )}
                      {job.quoteNumber && (
                        <span className="ml-2 text-gray-400">• Quote #{job.quoteNumber}</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      job.serviceType === "truck"
                        ? "bg-blue-100 text-blue-700"
                        : job.serviceType === "labor-only"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {job.serviceType === "truck"
                      ? "🚚 Truck"
                      : job.serviceType === "labor-only"
                      ? "🔧 Labor"
                      : "—"}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1 text-sm">
                  {job.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <PhoneIcon className="h-4 w-4 text-gray-400" />
                      {formatPhone(job.phone)}
                    </div>
                  )}
                  {job.pickupAddress && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPinIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{job.pickupAddress}</span>
                    </div>
                  )}
                  {job.deliveryAddress && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPinIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{job.deliveryAddress}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                  <span>Updated {formatDate(job.updatedAt)}</span>
                  <span className="text-blue-600 font-medium">Tap for details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-gray-100 w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-bold text-lg">{selectedJob.customerName}</h2>
                <p className="text-sm text-blue-200">Quote #{selectedJob.quoteNumber}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-blue-700 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-4 flex-1">
              <CutSheet job={selectedJob} />
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              <a
                href={`tel:${selectedJob.phone}`}
                className="block w-full bg-green-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                📞 Call {selectedJob.customerName.split(' ')[0]}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-500">Top Shelf Moving and Junk Removal</p>
        </div>
      </footer>
    </main>
  );
}
