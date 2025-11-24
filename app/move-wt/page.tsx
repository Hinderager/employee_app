"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import QuotePreview from "../components/QuotePreview";
import Script from "next/script";

function MoveWalkthroughContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobNumber, setJobNumber] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchQuoteNum, setSearchQuoteNum] = useState("");
  const [address, setAddress] = useState("");
  const [folderUrl, setFolderUrl] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [tempJobNumber, setTempJobNumber] = useState<string>("");
  const [isLoadingPickupProperty, setIsLoadingPickupProperty] = useState(false);
  const [isLoadingDeliveryProperty, setIsLoadingDeliveryProperty] = useState(false);

  // Recent forms for quick-link buttons
  const [recentForms, setRecentForms] = useState<Array<{
    id: string;
    quoteNumber: string;
    jobNumber: string;
    phoneNumber: string;
    displayName: string;
    displayDate: string;
  }>>([]);
  const [isLoadingRecentForms, setIsLoadingRecentForms] = useState(true);

  // Dynamic phone and email arrays
  const [phones, setPhones] = useState<Array<{ number: string; name: string }>>([{ number: "", name: "" }]);
  const [emails, setEmails] = useState<Array<{ email: string; name: string }>>([{ email: "", name: "" }]);

  // Track if folder link was copied
  const [isFolderLinkCopied, setIsFolderLinkCopied] = useState(false);

  // Track if form is saved
  const [isFormSaved, setIsFormSaved] = useState(true);
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);

  // Custom styles for invisible slider
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"][name="houseQuality"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 0;
        height: 0;
        opacity: 0;
      }
      input[type="range"][name="houseQuality"]::-moz-range-thumb {
        width: 0;
        height: 0;
        opacity: 0;
        border: none;
        background: transparent;
      }
      input[type="range"][name="houseQuality"]::-webkit-slider-runnable-track {
        background: transparent;
        height: 0;
      }
      input[type="range"][name="houseQuality"]::-moz-range-track {
        background: transparent;
        height: 0;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch recent forms on mount
  useEffect(() => {
    const fetchRecentForms = async () => {
      try {
        const response = await fetch('/api/move-wt/recent-forms?limit=6');
        const data = await response.json();
        if (data.success && data.forms) {
          setRecentForms(data.forms);
        }
      } catch (error) {
        console.error('Failed to fetch recent forms:', error);
      } finally {
        setIsLoadingRecentForms(false);
      }
    };
    fetchRecentForms();
  }, []);

  // Handle date/time returned from schedule picker
  useEffect(() => {
    const pickerType = searchParams.get('picker');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    
    if (pickerType && date && time) {
      if (pickerType === 'moving') {
        setFormData(prev => ({
          ...prev,
          preferredDate: date,
          preferredTime: time,
        }));
      } else if (pickerType === 'walkthrough') {
        setFormData(prev => ({
          ...prev,
          walkThroughDate: date,
          walkThroughTime: time,
        }));
      }
      // Clear URL params after reading
      router.replace('/move-wt', { scroll: false });
    }
  }, [searchParams, router]);

  // Refs for autocomplete inputs
  const pickupAddressRef = useRef<HTMLInputElement>(null);
  const deliveryAddressRef = useRef<HTMLInputElement>(null);
  const additionalStopAddressRef = useRef<HTMLInputElement>(null);
  const pickupAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const deliveryAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const additionalStopAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const previousEffectiveSqFtRef = useRef<number>(0);
  const [quote, setQuote] = useState({
    baseRate: 0,
    items: [] as Array<{
      description: string;
      amount: number;
      discount?: string;
      subItems?: Array<{ description: string; amount: number; details?: string; alert?: string }>;
    }>,
    total: 0
  });
  const [distanceData, setDistanceData] = useState<{
    toPickup: { miles: number; minutes: number; charge: number };
    pickupToDelivery: { miles: number; minutes: number; charge: number };
    fromDelivery: { miles: number; minutes: number; charge: number };
    totalCharge: number;
  } | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [isBudgetInsufficient, setIsBudgetInsufficient] = useState(false);

  const [formData, setFormData] = useState({
    // Service Type
    serviceType: "truck",
    waiveTravel: false,
    travelBilling: "local",
    travelCost: "",

    // Customer Information
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
    phoneName: "",
    email: "",
    emailName: "",

    // Current Home or Business Indicator
    customerHomeAddressType: "pickup" as "" | "pickup" | "delivery",
    
    // Labor Only - same address checkbox
    laborOnlySameAddress: true,

    // Addresses - Pickup
    pickupAddress: "",
    pickupUnit: "",
    pickupCity: "",
    pickupState: "",
    pickupZip: "",
    pickupLocationType: "house",
    pickupLocationOther: "",
    pickupBusinessName: "",
    pickupBusinessSquareFeet: "",
    pickupOtherSquareFeet: "",
    pickupHouseSquareFeet: "",
    pickupZestimate: "",
    pickupHowFurnished: 80,
    pickupApartmentSquareFeet: "",
    pickupApartmentBedBath: "",
    pickupApartmentHowFurnished: 80,
    pickupStorageUnitQuantity: 1,
    pickupStorageUnitSizes: [""],
    pickupStorageUnitHowFull: [""],
    pickupStorageUnitConditioned: [""],
    pickupTruckPodLength: "",
    pickupTruckPodWidth: "",
    pickupTruckPodHowFull: 100,
    pickupManualOverride: false,
    pickupManualOverrideHours: "",

    // Addresses - Delivery
    deliveryAddress: "",
    deliveryUnit: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryZip: "",
    deliveryLocationType: "house",
    deliveryLocationOther: "",
    deliveryBusinessName: "",
    deliveryHouseSquareFeet: "",
    deliveryZestimate: "",
    deliveryHowFurnished: 80,
    deliveryApartmentSquareFeet: "",
    deliveryApartmentBedBath: "",
    deliveryApartmentHowFurnished: 80,
    deliveryStorageUnitQuantity: 1,
    deliveryStorageUnitSizes: [""],
    deliveryStorageUnitConditioned: [""],
    deliveryPODQuantity: 1,
    deliveryPODSize: "",
    deliveryTruckLength: "",
    deliveryAddressUnknown: false,

    // Addresses - Additional Stop
    hasAdditionalStop: false,
    additionalStopAddress: "",
    additionalStopUnit: "",
    additionalStopCity: "",
    additionalStopState: "",
    additionalStopZip: "",
    additionalStopLocationType: "house",
    additionalStopLocationOther: "",
    additionalStopBusinessName: "",
    additionalStopHouseSquareFeet: "",
    additionalStopZestimate: "",
    additionalStopHowFurnished: 80,
    additionalStopApartmentBedBath: "",
    additionalStopStorageUnitQuantity: 1,
    additionalStopStorageUnitSizes: [""],
    additionalStopStorageUnitConditioned: [""],
    additionalStopNotes: "",

    // Property Access - Pickup
    pickupStairs: 1,
    pickupNarrowDoorways: false,
    pickupElevator: false,
    pickupParkingDistance: "close",
    pickupAccessNotes: "",

    // Property Access - Delivery
    deliveryStairs: 1,
    deliveryNarrowDoorways: false,
    deliveryElevator: false,
    deliveryParkingDistance: "close",
    deliveryAccessNotes: "",

    // Heavy/Special Items
    gunSafes: false,
    gunSafesQty: 1,
    gunSafesDetails: "",
    pianos: false,
    pianosQty: 1,
    pianosDetails: "",
    poolTables: false,
    poolTablesQty: 1,
    poolTablesDetails: "",
    otherHeavyItems: false,
    otherHeavyItemsDetails: "",
    largeTVs: false,
    largeTVsQty: 1,
    largeTVsDetails: "",
    purpleGreenMattress: false,
    purpleGreenMattressDetails: "",
    treadmills: false,
    treadmillsDetails: "",
    largeAppliances: false,
    applianceFridge: false,
    applianceFridgeQty: 1,
    applianceWasher: false,
    applianceWasherQty: 1,
    applianceDryer: false,
    applianceDryerQty: 1,
    applianceOven: false,
    applianceOvenQty: 1,
    applianceDishwasher: false,
    applianceDishwasherQty: 1,
    applianceOtherDetails: "",
    plants: false,
    plantsDetails: "",
    bunkBeds: false,
    bunkBedsQty: 1,
    bunkBedsDetails: "",
    trampoline: false,
    trampolineQty: 1,
    trampolineDetails: "",
    tableSaw: false,
    tableSawQty: 1,
    tableSawDetails: "",
    gymEquipment: false,
    gymEquipmentQty: 1,
    gymEquipmentDetails: "",
    sauna: false,
    saunaQty: 1,
    saunaDetails: "",
    playsets: false,
    playsetsQty: 1,
    playsetsDetails: "",
    specialDisassemblyOther: false,
    specialDisassemblyOtherDetails: "",

    // Pets
    catsPresent: false,

    // Packing
    packingStatus: "moderate",
    needsPacking: false,
    packingKitchen: false,
    packingGarage: false,
    packingAttic: false,
    packingWardrobeBoxes: false,
    packingFragileItems: false,
    packingBedrooms: false,
    packingNotes: "",
    junkRemovalNeeded: false,
    junkRemovalAmount: "",
    junkRemovalDetails: "",

    // Insurance
    needsInsurance: false,
    estimatedValue: "",

    // Timing
    walkThroughDate: "",
    walkThroughTime: "",
    walkThroughDuration: "1",
    preferredDate: "",
    preferredTime: "",
    moveDuration: "3",
    moveDateUnknown: false,
    timeFlexible: false,
    readyToSchedule: false,
    timingNotes: "",
    tags: [] as string[],

    // Estimates
    estimatedCrewSize: "2-3",
    crewSizeNotes: "",

    // Special Notes
    specialRequests: "",
    fixedBudgetRequested: false,
    desiredBudget: "",

    // House Quality Rating
    houseQuality: 3, // 1-5 scale, default to middle

    // Tools Needed
    hd4Wheel: false,
    airSled: false,
    applianceDolly: false,
    socketWrenches: false,
    safeDolly: false,
    toolCustom1: "",
    toolCustom2: "",
    toolCustom3: "",
  });

  // Format number with commas
  const formatNumberWithCommas = (value: string): string => {
    if (!value) return '';
    // Remove any existing commas
    const numericValue = value.replace(/,/g, '');
    // Return original if not a valid number
    if (!/^\d+$/.test(numericValue)) return value;
    // Add commas
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Get text for how much is getting moved slider
  const getHowFurnishedText = (percentage: number): string => {
    switch (percentage) {
      case 0: return 'Barely anything';
      case 20: return 'A couple rooms';
      case 40: return 'Half the house';
      case 60: return 'Most of the house';
      case 80: return 'Whole house';
      case 100: return "It's Loaded!";
      default: return `${percentage}% of the house`;
    }
  };

  // Get text for storage unit slider (percentage-based)
  const getStorageUnitSliderText = (percentage: number): string => {
    switch (percentage) {
      case 0: return 'Barely anything';
      case 20: return '20%';
      case 40: return '40%';
      case 60: return '60%';
      case 80: return '80%';
      case 100: return '100%';
      default: return `${percentage}%`;
    }
  };

  // Get text for additional stop slider (added or dropped off)
  const getAdditionalStopText = (percentage: number): string => {
    switch (percentage) {
      case 0: return 'Barely anything';
      case 20: return 'Couple rooms';
      case 40: return 'Half the house';
      case 60: return 'Nearly everything';
      case 80: return 'Nearly everything';
      case 100: return 'Nearly everything';
      default: return `${percentage}%`;
    }
  };

  // Format minutes into "Xhr Ymin" format
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}hr`;
    }
    return `${hours}hr ${mins}min`;
  };

  // Phone number normalization - strips all non-numeric characters
  const normalizePhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  // Phone number formatting - formats to (XXX) XXX-XXXX
  const formatPhoneNumber = (phone: string): string => {
    const normalized = normalizePhoneNumber(phone);

    // Handle different lengths
    if (normalized.length === 0) return '';
    if (normalized.length <= 3) return normalized;
    if (normalized.length <= 6) return `(${normalized.slice(0, 3)}) ${normalized.slice(3)}`;
    if (normalized.length <= 10) {
      return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
    }
    // Limit to 10 digits
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6, 10)}`;
  };

  // Auto-save functionality
  const isInitialMount = useRef(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extract save logic into a reusable function
  const saveFormData = async (showSuccessMessage: boolean = false) => {
    // Require at least phone number and pickup address
    const phoneNumber = phones[0]?.number || formData?.phone;
    const pickupAddress = formData?.pickupAddress;

    if (!phoneNumber || phoneNumber.trim() === '') {
      return; // Need phone number to save
    }

    try {
      // Generate temporary job number if real one doesn't exist
      let effectiveJobNumber = jobNumber;
      let effectiveAddress = address;

      if (!effectiveJobNumber || effectiveJobNumber.trim() === '') {
        // Use existing temp job number if we have one, otherwise create new one
        if (tempJobNumber) {
          effectiveJobNumber = tempJobNumber;
          effectiveAddress = pickupAddress || 'Work in Progress';
        } else {
          // Create temp job number from phone only (don't include address so it doesn't change)
          const normalizedPhone = normalizePhoneNumber(phoneNumber);
          effectiveJobNumber = `TEMP-${normalizedPhone}`;
          effectiveAddress = pickupAddress || 'Work in Progress';
          setTempJobNumber(effectiveJobNumber); // Store it so it doesn't change
        }
      }

      // Normalize phone numbers before saving and include arrays
      const normalizedFormData = {
        ...formData,
        phone: normalizePhoneNumber(phoneNumber),
        phones: phones.map(p => ({ ...p, number: normalizePhoneNumber(p.number) })),
        emails: emails
      };

      const response = await fetch('/api/move-wt/save-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobNumber: effectiveJobNumber,
          address: effectiveAddress,
          formData: {
            ...normalizedFormData,
            quoteItems: quote?.items || [],
            total: quote?.total || 0,
            baseRate: quote?.baseRate || 0
          },
          folderUrl: folderUrl,
          isTemporary: !jobNumber || jobNumber.trim() === '',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save form');
      }

      // Capture quote number from response
      if (result.quoteNumber) {
        setQuoteNumber(result.quoteNumber);
        console.log("Quote number set:", result.quoteNumber);
      } else {
        console.warn("No quote number in save response:", result);
      }

      console.log("Form auto-saved:", new Date().toLocaleTimeString());

      // Mark form as saved
      setIsFormSaved(true);

      if (showSuccessMessage) {
        alert("Walk-through completed! Data saved successfully.");
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      // Only show error alerts for manual saves, not auto-saves
      if (showSuccessMessage) {
        alert(error instanceof Error ? error.message : 'Failed to save form. Please try again.');
      }
    }
  };

  // Auto-save effect - triggers whenever formData changes
  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Skip if no phone number is entered (check first phone in phones array)
    const phoneNumber = phones[0]?.number || formData?.phone;
    if (!phoneNumber || phoneNumber.trim() === '') {
      return;
    }

    // Mark form as unsaved when changes are detected
    setIsFormSaved(false);

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Debounce: wait 1 second after last change before saving
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveFormData(false);
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, jobNumber, address, folderUrl, phones, emails, quote]);

  // Auto-calculate crew size based on square footage and how furnished
  useEffect(() => {
    let squareFeet = 0;
    let furnishedPercent = 0;

    // Get the appropriate square footage and percentage based on location type
    if (formData.pickupLocationType === 'house' || formData.pickupLocationType === 'loading-truck-pod') {
      squareFeet = parseFloat(formData.pickupHouseSquareFeet) || 0;
      furnishedPercent = formData.pickupHowFurnished || 80;
    } else if (formData.pickupLocationType === 'apartment') {
      squareFeet = parseFloat(formData.pickupApartmentSquareFeet) || 0;
      furnishedPercent = formData.pickupHowFurnished || 80;
    } else if (formData.pickupLocationType === 'unloading-truck-pod') {
      const length = parseFloat(formData.pickupTruckPodLength) || 0;
      const width = parseFloat(formData.pickupTruckPodWidth) || 0;
      squareFeet = length * width;
      furnishedPercent = formData.pickupTruckPodHowFull || 100;
    }

    // Calculate effective square footage (sqft × percentage/100)
    const effectiveSqFt = squareFeet * (furnishedPercent / 100);

    // Only update crew size if effective square footage actually changed
    if (effectiveSqFt !== previousEffectiveSqFtRef.current && squareFeet > 0) {
      // Determine crew size based on effective square footage
      let recommendedCrewSize = "2-3"; // default

      if (effectiveSqFt < 500) {
        recommendedCrewSize = "2 max";
      } else if (effectiveSqFt >= 500 && effectiveSqFt < 1500) {
        recommendedCrewSize = "2-3";
      } else if (effectiveSqFt >= 1500 && effectiveSqFt < 2500) {
        recommendedCrewSize = "3-4";
      } else if (effectiveSqFt >= 2500 && effectiveSqFt < 3000) {
        recommendedCrewSize = "4-6";
      } else if (effectiveSqFt >= 3000) {
        recommendedCrewSize = "6+";
      }

      setFormData(prev => ({ ...prev, estimatedCrewSize: recommendedCrewSize }));
      previousEffectiveSqFtRef.current = effectiveSqFt;
    }
  }, [
    formData.pickupLocationType,
    formData.pickupHouseSquareFeet,
    formData.pickupApartmentSquareFeet,
    formData.pickupHowFurnished,
    formData.pickupTruckPodLength,
    formData.pickupTruckPodWidth,
    formData.pickupTruckPodHowFull
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // List of fields that should have comma formatting
    const numberFields = [
      'pickupHouseSquareFeet', 'pickupZestimate',
      'deliveryHouseSquareFeet', 'deliveryZestimate',
      'additionalStopHouseSquareFeet', 'additionalStopZestimate'
    ];

    // For number fields, strip commas before storing
    let processedValue = value;
    if (numberFields.includes(name)) {
      processedValue = value.replace(/,/g, '');
    }

    // Reset location types when service type changes to truck
    if (name === 'serviceType' && value === 'truck') {
      const invalidLocationTypes = ['truck', 'pod'];
      setFormData(prev => ({
        ...prev,
        serviceType: value,
        pickupLocationType: invalidLocationTypes.includes(prev.pickupLocationType) ? 'house' : prev.pickupLocationType,
        deliveryLocationType: invalidLocationTypes.includes(prev.deliveryLocationType) ? 'house' : prev.deliveryLocationType,
        additionalStopLocationType: invalidLocationTypes.includes(prev.additionalStopLocationType) ? 'house' : prev.additionalStopLocationType
      }));
      return;
    }

    // Handle service type change to labor-only
    if (name === 'serviceType' && value === 'labor-only') {
      setFormData(prev => ({
        ...prev,
        serviceType: value,
        customerHomeAddressType: 'pickup',
        // Clear delivery address fields
        deliveryAddress: "",
        deliveryUnit: "",
        deliveryCity: "",
        deliveryState: "",
        deliveryZip: "",
        deliveryLocationType: "house",
        deliveryLocationOther: "",
        deliveryHouseSquareFeet: "",
        deliveryZestimate: "",
        deliveryHowFurnished: 80,
        deliveryApartmentSquareFeet: "",
        deliveryApartmentBedBath: "",
        deliveryApartmentHowFurnished: 80,
        deliveryStorageUnitQuantity: 1,
        deliveryStorageUnitSizes: [""],
    deliveryStorageUnitConditioned: [""],
        deliveryPODQuantity: 1,
        deliveryPODSize: "",
        deliveryTruckLength: "",
        deliveryAddressUnknown: false,
        deliveryStairs: 1,
        deliveryNarrowDoorways: false,
        deliveryElevator: false,
        deliveryParkingDistance: "close",
        deliveryAccessNotes: "",
        // Deselect and clear additional stop
        hasAdditionalStop: false,
        additionalStopAddress: "",
        additionalStopUnit: "",
        additionalStopCity: "",
        additionalStopState: "",
        additionalStopZip: "",
        additionalStopLocationType: "house",
        additionalStopLocationOther: "",
        additionalStopHouseSquareFeet: "",
        additionalStopZestimate: "",
        additionalStopHowFurnished: 80,
        additionalStopApartmentBedBath: "",
        additionalStopStorageUnitQuantity: 1,
        additionalStopStorageUnitSizes: [""],
    additionalStopStorageUnitConditioned: [""],
        additionalStopNotes: ""
      }));
      return;
    }

    // Clear all additional stop fields when clicking the additional stop checkbox
    if (name === 'hasAdditionalStop' && type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        hasAdditionalStop: checked,
        ...(checked ? {} : {
          additionalStopAddress: "",
          additionalStopUnit: "",
          additionalStopCity: "",
          additionalStopState: "",
          additionalStopZip: "",
          additionalStopLocationType: "house",
          additionalStopLocationOther: "",
          additionalStopHouseSquareFeet: "",
          additionalStopZestimate: "",
          additionalStopHowFurnished: 80,
          additionalStopApartmentBedBath: "",
          additionalStopStorageUnitQuantity: 1,
          additionalStopStorageUnitSizes: [""],
          additionalStopStorageUnitConditioned: [""],
          additionalStopNotes: ""
        })
      }));
      return;
    }
    // Clear all appliance fields when Large Appliances is unchecked
    if (name === 'largeAppliances' && type === 'checkbox' && !checked) {
      setFormData(prev => ({
        ...prev,
        largeAppliances: false,
        applianceFridge: false,
        applianceFridgeQty: 1,
        applianceWasher: false,
        applianceWasherQty: 1,
        applianceDryer: false,
        applianceDryerQty: 1,
        applianceOven: false,
        applianceOvenQty: 1,
        applianceDishwasher: false,
        applianceDishwasherQty: 1,
        applianceOtherDetails: ""
      }));
      return;
    }
    // Clear all packing fields when Packing is unchecked
    if (name === 'needsPacking' && type === 'checkbox' && !checked) {
      setFormData(prev => ({
        ...prev,
        needsPacking: false,
        packingStatus: "moderate",
        packingKitchen: false,
        packingGarage: false,
        packingAttic: false,
        packingWardrobeBoxes: false,
        packingFragileItems: false
      }));
      return;
    }
    // Clear junk removal fields when Junk Removal is unchecked
    if (name === 'junkRemovalNeeded' && type === 'checkbox' && !checked) {
      setFormData(prev => ({
        ...prev,
        junkRemovalNeeded: false,
        junkRemovalAmount: "",
        junkRemovalDetails: ""
      }));
      return;
    }
    // Clear qty/details when individual heavy items or appliances are unchecked
    if (type === 'checkbox' && !checked) {
      const itemClearMap: Record<string, Record<string, any>> = {
        // Heavy/Special Items
        gunSafes: { gunSafesQty: 1, gunSafesDetails: "" },
        pianos: { pianosQty: 1, pianosDetails: "" },
        poolTables: { poolTablesQty: 1, poolTablesDetails: "" },
        largeTVs: { largeTVsQty: 1, largeTVsDetails: "" },
        treadmills: { treadmillsDetails: "" },
        // Special Disassembly
        trampoline: { trampolineQty: 1, trampolineDetails: "" },
        bunkBeds: { bunkBedsQty: 1, bunkBedsDetails: "" },
        gymEquipment: { gymEquipmentQty: 1, gymEquipmentDetails: "" },
        sauna: { saunaQty: 1, saunaDetails: "" },
        // Appliances
        applianceFridge: { applianceFridgeQty: 1 },
        applianceWasher: { applianceWasherQty: 1 },
        applianceDryer: { applianceDryerQty: 1 },
        applianceOven: { applianceOvenQty: 1 },
        applianceDishwasher: { applianceDishwasherQty: 1 }
      };
      if (itemClearMap[name]) {
        setFormData(prev => ({
          ...prev,
          [name]: false,
          ...itemClearMap[name]
        }));
        return;
      }
    }
    // Auto-check Safe Dolly if Piano or Gun Safe is checked
    else if ((name === 'pianos' || name === 'gunSafes') && type === 'checkbox' && checked) {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        safeDolly: true
      }));
    }
    // Auto-check Socket Wrenches if any Special Disassembly item is checked
    else if ((name === 'trampoline' || name === 'bunkBeds' || name === 'gymEquipment' || name === 'sauna') && type === 'checkbox' && checked) {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        socketWrenches: true
      }));
    }
    // Auto-check Air Sled if home quality is set to 5 AND any Large Appliances are selected
    else if (name === 'houseQuality' && processedValue === '5') {
      setFormData(prev => {
        const hasLargeAppliances = prev.applianceFridge || prev.applianceWasher || prev.applianceDryer;
        return {
          ...prev,
          [name]: Number(processedValue),
          airSled: hasLargeAppliances ? true : prev.airSled
        };
      });
    }
    // Auto-check Appliance Dolly if Fridge is checked; also check Air Sled if house quality is 5
    else if (name === 'applianceFridge' && type === 'checkbox' && checked) {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        applianceDolly: true,
        airSled: prev.houseQuality === 5 ? true : prev.airSled
      }));
    }
    // Auto-check Air Sled if Clothes Washer or Dryer is checked and house quality is 5
    else if ((name === 'applianceWasher' || name === 'applianceDryer') && type === 'checkbox' && checked) {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        airSled: prev.houseQuality === 5 ? true : prev.airSled
      }));
    }
    else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : processedValue
      }));
    }
  };

  // Handle phone number input with auto-formatting

  // Handle tag checkbox changes
  const handleTagChange = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = formatPhoneNumber(value);
    setFormData(prev => ({
      ...prev,
      [name]: formatted
    }));
  };

  // Handle search phone input with auto-formatting
  const handleSearchPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setSearchPhone(formatted);
  };

  // Handlers for dynamic phone entries
  const handlePhoneNumberChange = (index: number, value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhones(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], number: formatted };
      return updated;
    });
  };

  const handlePhoneNameChange = (index: number, value: string) => {
    setPhones(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: value };
      return updated;
    });
  };

  const handleAddPhone = () => {
    setPhones(prev => [...prev, { number: "", name: "" }]);
  };

  const handleRemovePhone = (index: number) => {
    if (phones.length > 1) {
      setPhones(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Handlers for dynamic email entries
  const handleEmailChange = (index: number, value: string) => {
    setEmails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], email: value };
      return updated;
    });
  };

  const handleEmailNameChange = (index: number, value: string) => {
    setEmails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: value };
      return updated;
    });
  };

  const handleAddEmail = () => {
    setEmails(prev => [...prev, { email: "", name: "" }]);
  };

  const handleRemoveEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleLoadJob = async () => {
    if (!jobNumber.trim() && !searchPhone.trim() && !searchQuoteNum.trim()) {
      alert('Please enter a job number, phone number, or quote number');
      return;
    }

    setIsLoadingJob(true);

    try {
      const requestBody: any = {};
      if (jobNumber.trim()) {
        requestBody.jobNumber = jobNumber.trim();
      }
      if (searchPhone.trim()) {
        // Normalize phone number before sending (strip formatting)
        requestBody.phoneNumber = normalizePhoneNumber(searchPhone);
      }
      if (searchQuoteNum.trim()) {
        requestBody.quoteNumber = searchQuoteNum.trim();
      }

      const response = await fetch('/api/move-wt/load-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load job');
      }

      // Check if phone search returned multiple forms
      if (result.multiple && result.forms) {
        // Show selection dialog for multiple forms
        let message = `Found ${result.forms.length} saved form(s) for this contact:\n\n`;
        result.forms.forEach((form: any, index: number) => {
          const date = form.updatedAt ? new Date(form.updatedAt).toLocaleDateString() : 'No date';
          message += `${index + 1}. ${date} - ${form.address}\n`;
        });
        message += `\nEnter number to load that form, or type "new" to start a new form with just contact info:`;

        const selection = prompt(message);

        if (!selection) {
          // User cancelled
          setIsLoadingJob(false);
          return;
        }

        if (selection.toLowerCase() === 'new') {
          // Load just customer info, no form data
          if (result.customerInfo) {
            setFormData(prev => ({
              ...prev,
              firstName: result.customerInfo.firstName || prev.firstName,
              lastName: result.customerInfo.lastName || prev.lastName,
              phone: result.customerInfo.phone || prev.phone,
              email: result.customerInfo.email || prev.email,
              pickupAddress: result.customerInfo.pickupAddress || prev.pickupAddress,
              pickupUnit: result.customerInfo.pickupUnit || prev.pickupUnit,
              pickupCity: result.customerInfo.pickupCity || prev.pickupCity,
              pickupState: result.customerInfo.pickupState || prev.pickupState,
              pickupZip: result.customerInfo.pickupZip || prev.pickupZip,
            }));
          }
          setIsLoadingJob(false);
          return;
        }

        const selectedIndex = parseInt(selection) - 1;
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= result.forms.length) {
          alert('Invalid selection');
          setIsLoadingJob(false);
          return;
        }

        const selectedForm = result.forms[selectedIndex];

        // Load the selected form
        setAddress(result.address);
        setJobNumber(result.job_number);
        setFolderUrl(result.folderUrl || '');
        setIsFolderLinkCopied(false);
        setIsFormSaved(true);

        // Capture quote number if present
        if (result.quoteNumber) {
          setQuoteNumber(result.quoteNumber);
        }

        // Load customer info if available
        if (result.customerInfo) {
          setFormData(prev => ({
            ...prev,
            firstName: result.customerInfo.firstName || prev.firstName,
            lastName: result.customerInfo.lastName || prev.lastName,
            phone: result.customerInfo.phone || prev.phone,
            email: result.customerInfo.email || prev.email,
            pickupAddress: result.customerInfo.pickupAddress || prev.pickupAddress,
            pickupUnit: result.customerInfo.pickupUnit || prev.pickupUnit,
            pickupCity: result.customerInfo.pickupCity || prev.pickupCity,
            pickupState: result.customerInfo.pickupState || prev.pickupState,
            pickupZip: result.customerInfo.pickupZip || prev.pickupZip,
          }));
        }

        // Load form data
        if (result.existingFormData) {
          const { phones: savedPhones, emails: savedEmails, ...restFormData } = result.existingFormData;

          setFormData(prev => ({
            ...prev,
            ...restFormData,
          }));

          if (savedPhones && Array.isArray(savedPhones) && savedPhones.length > 0) {
            setPhones(savedPhones);
          }
          if (savedEmails && Array.isArray(savedEmails) && savedEmails.length > 0) {
            setEmails(savedEmails);
          }
        }

        setIsLoadingJob(false);
        return;
      }

      // Regular job number load (original logic)
      setAddress(result.address);
      setFolderUrl(result.folderUrl || '');
      setIsFolderLinkCopied(false);
      setIsFormSaved(true);

      // Capture quote number if present
      if (result.quoteNumber) {
        setQuoteNumber(result.quoteNumber);
      }

      // Populate customer information
      if (result.customerInfo) {
        setFormData(prev => ({
          ...prev,
          firstName: result.customerInfo.firstName || prev.firstName,
          lastName: result.customerInfo.lastName || prev.lastName,
          phone: result.customerInfo.phone || prev.phone,
          email: result.customerInfo.email || prev.email,
          pickupAddress: result.customerInfo.pickupAddress || prev.pickupAddress,
          pickupUnit: result.customerInfo.pickupUnit || prev.pickupUnit,
          pickupCity: result.customerInfo.pickupCity || prev.pickupCity,
          pickupState: result.customerInfo.pickupState || prev.pickupState,
          pickupZip: result.customerInfo.pickupZip || prev.pickupZip,
        }));
      }

      // Populate existing form data if available
      if (result.existingFormData) {
        const { phones: savedPhones, emails: savedEmails, ...restFormData } = result.existingFormData;

        setFormData(prev => ({
          ...prev,
          ...restFormData,
        }));

        // Restore phones and emails arrays if they exist
        if (savedPhones && Array.isArray(savedPhones) && savedPhones.length > 0) {
          setPhones(savedPhones);
        }
        if (savedEmails && Array.isArray(savedEmails) && savedEmails.length > 0) {
          setEmails(savedEmails);
        }
      }
    } catch (error) {
      console.error('Load job error:', error);
      alert(error instanceof Error ? error.message : 'Failed to load job. Please try again.');
    } finally {
      setIsLoadingJob(false);
    }
  };

  // Handler to load a recent form by phone number
  const handleLoadRecentForm = async (phoneNumber: string) => {
    if (!phoneNumber) return;

    setIsLoadingJob(true);
    setSearchPhone(phoneNumber);
    setJobNumber('');

    // IMPORTANT: Clear ALL form data first to prevent old data from persisting
    // Reset form to initial state
    setFormData({
      // Service Type
      serviceType: "truck",
      travelBilling: "local",
      travelCost: "",

      // Customer Information
      firstName: "",
      lastName: "",
      company: "",
      phone: "",
      phoneName: "",
      email: "",
      emailName: "",

      // Current Home or Business Indicator
      customerHomeAddressType: "pickup" as "" | "pickup" | "delivery",

      // Labor Only - same address checkbox
      laborOnlySameAddress: true,

      // Addresses - Pickup
      pickupAddress: "",
      pickupUnit: "",
      pickupCity: "",
      pickupState: "",
      pickupZip: "",
      pickupLocationType: "house",
      pickupLocationOther: "",
      pickupBusinessName: "",
      pickupBusinessSquareFeet: "",
      pickupOtherSquareFeet: "",
      pickupHouseSquareFeet: "",
      pickupZestimate: "",
      pickupHowFurnished: 80,
      pickupApartmentSquareFeet: "",
      pickupApartmentBedBath: "",
      pickupApartmentHowFurnished: 80,
      pickupStorageUnitQuantity: 1,
      pickupStorageUnitSizes: [""],
      pickupStorageUnitHowFull: [""],
      pickupStorageUnitConditioned: [""],
      pickupTruckPodLength: "",
      pickupTruckPodWidth: "",
      pickupTruckPodHowFull: 100,

      // Addresses - Delivery
      deliveryAddress: "",
      deliveryUnit: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryLocationType: "house",
      deliveryLocationOther: "",
      deliveryBusinessName: "",
      deliveryHouseSquareFeet: "",
      deliveryZestimate: "",
      deliveryHowFurnished: 80,
      deliveryApartmentSquareFeet: "",
      deliveryApartmentBedBath: "",
      deliveryApartmentHowFurnished: 80,
      deliveryStorageUnitQuantity: 1,
      deliveryStorageUnitSizes: [""],
      deliveryStorageUnitConditioned: [""],
      deliveryPODQuantity: 1,
      deliveryPODSize: "",
      deliveryTruckLength: "",
      deliveryAddressUnknown: false,

      // Addresses - Additional Stop
      hasAdditionalStop: false,
      additionalStopAddress: "",
      additionalStopUnit: "",
      additionalStopCity: "",
      additionalStopState: "",
      additionalStopZip: "",
      additionalStopLocationType: "house",
      additionalStopLocationOther: "",
      additionalStopBusinessName: "",
      additionalStopHouseSquareFeet: "",
      additionalStopZestimate: "",
      additionalStopHowFurnished: 80,
      additionalStopApartmentBedBath: "",
      additionalStopStorageUnitQuantity: 1,
      additionalStopStorageUnitSizes: [""],
      additionalStopStorageUnitConditioned: [""],
      additionalStopNotes: "",

      // Property Access - Pickup
      pickupStairs: 1,
      pickupNarrowDoorways: false,
      pickupElevator: false,
      pickupParkingDistance: "close",
      pickupAccessNotes: "",

      // Property Access - Delivery
      deliveryStairs: 1,
      deliveryNarrowDoorways: false,
      deliveryElevator: false,
      deliveryParkingDistance: "close",
      deliveryAccessNotes: "",

      // Heavy/Special Items
      gunSafes: false,
      gunSafesQty: 1,
      gunSafesDetails: "",
      pianos: false,
      pianosQty: 1,
      pianosDetails: "",
      poolTables: false,
      poolTablesQty: 1,
      poolTablesDetails: "",
      otherHeavyItems: false,
      otherHeavyItemsDetails: "",
      largeTVs: false,
      largeTVsQty: 1,
      largeTVsDetails: "",
      purpleGreenMattress: false,
      purpleGreenMattressDetails: "",
      treadmills: false,
      treadmillsDetails: "",
      largeAppliances: false,
      applianceFridge: false,
      applianceFridgeQty: 1,
      applianceWasher: false,
      applianceWasherQty: 1,
      applianceDryer: false,
      applianceDryerQty: 1,
      applianceOven: false,
      applianceOvenQty: 1,
      applianceDishwasher: false,
      applianceDishwasherQty: 1,
      applianceOtherDetails: "",
      plants: false,
      plantsDetails: "",
      bunkBeds: false,
      bunkBedsQty: 1,
      bunkBedsDetails: "",
      trampoline: false,
      trampolineQty: 1,
      trampolineDetails: "",
      tableSaw: false,
      tableSawQty: 1,
      tableSawDetails: "",
      gymEquipment: false,
      gymEquipmentQty: 1,
      gymEquipmentDetails: "",
      sauna: false,
      saunaQty: 1,
      saunaDetails: "",
      playsets: false,
      playsetsQty: 1,
      playsetsDetails: "",
      specialDisassemblyOther: false,
      specialDisassemblyOtherDetails: "",

      // Pets
      catsPresent: false,

      // Packing
      packingStatus: "moderate",
      needsPacking: false,
      packingKitchen: false,
      packingGarage: false,
      packingAttic: false,
      packingWardrobeBoxes: false,
      packingFragileItems: false,
      packingBedrooms: false,
      packingNotes: "",
      junkRemovalNeeded: false,
      junkRemovalAmount: "",
      junkRemovalDetails: "",

      // Insurance
      needsInsurance: false,
      tags: formData.tags || [],
      estimatedValue: "",

      // Timing
      walkThroughDate: "",
    walkThroughTime: "",
    walkThroughDuration: "1",
      preferredDate: "",
    preferredTime: "",
    moveDuration: "3",
      moveDateUnknown: false,
      timeFlexible: false,
      readyToSchedule: false,
      timingNotes: "",

      // Estimates
      estimatedCrewSize: "2-3",
      crewSizeNotes: "",

      // Special Notes
      specialRequests: "",
      fixedBudgetRequested: false,
      desiredBudget: "",

      // House Quality Rating
      houseQuality: 3, // 1-5 scale, default to middle

      // Tools Needed
      hd4Wheel: false,
      airSled: false,
      applianceDolly: false,
      socketWrenches: false,
      safeDolly: false,
      toolCustom1: "",
      toolCustom2: "",
      toolCustom3: "",
    });

    // Reset phones and emails arrays to empty state
    setPhones([{ number: "", name: "" }]);
    setEmails([{ email: "", name: "" }]);

    try {
      const response = await fetch('/api/move-wt/load-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: normalizePhoneNumber(phoneNumber) }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load job');
      }

      // If multiple forms, load the first one (most recent)
      if (result.multiple && result.forms) {

        setAddress(result.address);
        setJobNumber(result.job_number);
        setFolderUrl(result.folderUrl || '');
        setIsFolderLinkCopied(false);
        setIsFormSaved(true);

        if (result.quoteNumber) {
          setQuoteNumber(result.quoteNumber);
        }

        // Now load the new data into the cleared form
        if (result.customerInfo) {
          setFormData(prev => ({
            ...prev,
            firstName: result.customerInfo.firstName || "",
            lastName: result.customerInfo.lastName || "",
            phone: result.customerInfo.phone || "",
            email: result.customerInfo.email || "",
            pickupAddress: result.customerInfo.pickupAddress || "",
            pickupUnit: result.customerInfo.pickupUnit || "",
            pickupCity: result.customerInfo.pickupCity || "",
            pickupState: result.customerInfo.pickupState || "",
            pickupZip: result.customerInfo.pickupZip || "",
          }));
        }

        if (result.existingFormData) {
          const { phones: savedPhones, emails: savedEmails, ...restFormData } = result.existingFormData;
          // Replace all form data (not merge) - ensure tags defaults to empty array
          setFormData({ ...restFormData, tags: restFormData.tags || [] });

          // Load phones and emails arrays
          if (savedPhones && Array.isArray(savedPhones) && savedPhones.length > 0) {
            setPhones(savedPhones);
          }
          if (savedEmails && Array.isArray(savedEmails) && savedEmails.length > 0) {
            setEmails(savedEmails);
          }
        }
      } else if (result.success) {
        // Handle single form result (most common case from Recent Leads tiles)
        setAddress(result.address || '');
        setJobNumber(result.job_number || '');
        setFolderUrl(result.folderUrl || '');
        setIsFolderLinkCopied(false);
        setIsFormSaved(true);

        if (result.quoteNumber) {
          setQuoteNumber(result.quoteNumber);
        }

        if (result.customerInfo) {
          setFormData(prev => ({
            ...prev,
            firstName: result.customerInfo.firstName || "",
            lastName: result.customerInfo.lastName || "",
            phone: result.customerInfo.phone || "",
            email: result.customerInfo.email || "",
            pickupAddress: result.customerInfo.pickupAddress || "",
            pickupUnit: result.customerInfo.pickupUnit || "",
            pickupCity: result.customerInfo.pickupCity || "",
            pickupState: result.customerInfo.pickupState || "",
            pickupZip: result.customerInfo.pickupZip || "",
          }));
        }

        if (result.existingFormData) {
          const { phones: savedPhones, emails: savedEmails, ...restFormData } = result.existingFormData;
          // Ensure tags defaults to empty array for older saved forms
          setFormData({ ...restFormData, tags: restFormData.tags || [] });

          if (savedPhones && Array.isArray(savedPhones) && savedPhones.length > 0) {
            setPhones(savedPhones);
          }
          if (savedEmails && Array.isArray(savedEmails) && savedEmails.length > 0) {
            setEmails(savedEmails);
          }
        }
      }
    } catch (error) {
      console.error('Load recent form error:', error);
      alert(error instanceof Error ? error.message : 'Failed to load form. Please try again.');
    } finally {
      setIsLoadingJob(false);
    }
  };

  const handleMakePictureFolder = async () => {
    if (!formData.pickupAddress.trim()) {
      alert('Please enter a street address first');
      return;
    }

    setIsLoadingJob(true);

    try {
      // Build full address from pickup fields
      const addressParts = [];
      if (formData.pickupAddress) addressParts.push(formData.pickupAddress);
      if (formData.pickupCity) addressParts.push(formData.pickupCity);
      if (formData.pickupState) addressParts.push(formData.pickupState);
      if (formData.pickupZip) addressParts.push(formData.pickupZip);

      const fullAddress = addressParts.join(', ').trim();

      if (!fullAddress) {
        alert('Please enter a complete address');
        return;
      }

      const response = await fetch('/api/move-wt/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: fullAddress,
          jobNumber: jobNumber.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create folder');
      }

      setFolderUrl(result.folderUrl || '');
      setIsFolderLinkCopied(false);
      setAddress(fullAddress);
      alert(`Picture folder created successfully!\n${result.folderUrl}`);
    } catch (error) {
      console.error('Create folder error:', error);
      alert(error instanceof Error ? error.message : 'Failed to create folder. Please try again.');
    } finally {
      setIsLoadingJob(false);
    }
  };

  const handleFindCustomer = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert('Please enter first name and last name to search for a customer');
      return;
    }

    setIsLoadingJob(true);

    try {
      const response = await fetch('/api/move-wt/find-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.jobs) {
        // If multiple jobs found, show selection popup
        if (result.multiple && result.jobs.length > 1) {
          // Build selection message
          let message = `Found ${result.jobs.length} jobs for ${formData.firstName} ${formData.lastName}:\n\n`;
          result.jobs.forEach((job: any, index: number) => {
            message += `${index + 1}. Job #${job.jobNumber} - ${job.address}\n`;
          });
          message += '\nEnter the number of the job you want to load (1-' + result.jobs.length + '):';

          const selection = prompt(message);

          if (selection === null) {
            // User cancelled
            setIsLoadingJob(false);
            return;
          }

          const selectedIndex = parseInt(selection) - 1;

          if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= result.jobs.length) {
            alert('Invalid selection. Please try again.');
            setIsLoadingJob(false);
            return;
          }

          // Load the selected job
          const selectedJob = result.jobs[selectedIndex];
          setJobNumber(selectedJob.jobNumber);

          // Trigger handleLoadJob by calling it directly
          await handleLoadJobInternal(selectedJob.jobNumber);
        } else {
          // Only one job found, load it automatically
          const job = result.jobs[0];
          setJobNumber(job.jobNumber);
          await handleLoadJobInternal(job.jobNumber);
        }
      } else {
        alert(result.error || 'No jobs found for this customer.');
        setIsLoadingJob(false);
      }
    } catch (error) {
      console.error('Find customer error:', error);
      alert(error instanceof Error ? error.message : 'Failed to find customer. Please try again.');
      setIsLoadingJob(false);
    }
  };

  // Internal function to load job by job number (extracted from handleLoadJob)
  const handleLoadJobInternal = async (jobNumberToLoad: string) => {
    try {
      const response = await fetch('/api/move-wt/load-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobNumber: jobNumberToLoad,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load job');
      }

      setAddress(result.address);
      setFolderUrl(result.folderUrl || '');
      setIsFolderLinkCopied(false);
      setIsFormSaved(true);

      // Capture quote number if present
      if (result.quoteNumber) {
        setQuoteNumber(result.quoteNumber);
      }

      // Populate customer information
      if (result.customerInfo) {
        setFormData(prev => ({
          ...prev,
          firstName: result.customerInfo.firstName || prev.firstName,
          lastName: result.customerInfo.lastName || prev.lastName,
          phone: result.customerInfo.phone || '',
          phoneName: '',
          email: result.customerInfo.email || '',
          emailName: '',
          company: result.customerInfo.company || '',
          pickupAddress: result.customerInfo.pickupAddress || '',
          pickupUnit: result.customerInfo.pickupUnit || '',
          pickupCity: result.customerInfo.pickupCity || '',
          pickupState: result.customerInfo.pickupState || '',
          pickupZip: result.customerInfo.pickupZip || '',
        }));
      }

      // Load existing form data if it exists
      if (result.existingFormData) {
        const { phones: savedPhones, emails: savedEmails, ...restFormData } = result.existingFormData;

        setFormData(prev => ({
          ...prev,
          ...restFormData,
        }));

        // Restore phones and emails arrays if they exist
        if (savedPhones && Array.isArray(savedPhones) && savedPhones.length > 0) {
          setPhones(savedPhones);
        }
        if (savedEmails && Array.isArray(savedEmails) && savedEmails.length > 0) {
          setEmails(savedEmails);
        }
      }

      alert(`Job #${jobNumberToLoad} loaded successfully!`);
    } catch (error) {
      console.error('Load job error:', error);
      throw error;
    } finally {
      setIsLoadingJob(false);
    }
  };

  const handleCopyFolderLink = async () => {
    if (!folderUrl) return;
    try {
      await navigator.clipboard.writeText(folderUrl);
      setIsFolderLinkCopied(true);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClear = () => {
    setJobNumber("");
    setSearchPhone("");
    setSearchQuoteNum("");
    setAddress("");
    setFolderUrl("");
    setPhones([{ number: "", name: "" }]);
    setEmails([{ email: "", name: "" }]);
    setIsFolderLinkCopied(false);
    setIsFormSaved(true);
    // Reset form to initial state
    setFormData({
      // Service Type
      serviceType: "truck",
      travelBilling: "local",
      travelCost: "",

      // Customer Information
      firstName: "",
      lastName: "",
      company: "",
      phone: "",
      phoneName: "",
      email: "",
      emailName: "",
      customerHomeAddressType: "pickup" as "" | "pickup" | "delivery",

      // Labor Only - same address checkbox
      laborOnlySameAddress: true,

      // Addresses - Pickup
      pickupAddress: "",
      pickupUnit: "",
      pickupCity: "",
      pickupState: "",
      pickupZip: "",
      pickupLocationType: "house",
      pickupLocationOther: "",
      pickupBusinessName: "",
      pickupBusinessSquareFeet: "",
      pickupOtherSquareFeet: "",
      pickupHouseSquareFeet: "",
      pickupZestimate: "",
      pickupHowFurnished: 80,
      pickupApartmentSquareFeet: "",
      pickupApartmentBedBath: "",
      pickupApartmentHowFurnished: 80,
      pickupStorageUnitQuantity: 1,
      pickupStorageUnitSizes: [""],
      pickupStorageUnitHowFull: [""],
      pickupStorageUnitConditioned: [""],
      pickupTruckPodLength: "",
      pickupTruckPodWidth: "",
      pickupTruckPodHowFull: 100,

      // Addresses - Delivery
      deliveryAddress: "",
      deliveryUnit: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryLocationType: "house",
      deliveryLocationOther: "",
      deliveryBusinessName: "",
      deliveryHouseSquareFeet: "",
      deliveryZestimate: "",
      deliveryHowFurnished: 80,
      deliveryApartmentSquareFeet: "",
      deliveryApartmentBedBath: "",
      deliveryApartmentHowFurnished: 80,
      deliveryStorageUnitQuantity: 1,
      deliveryStorageUnitSizes: [""],
    deliveryStorageUnitConditioned: [""],
      deliveryPODQuantity: 1,
      deliveryPODSize: "",
      deliveryTruckLength: "",
      deliveryAddressUnknown: false,

      // Addresses - Additional Stop
      hasAdditionalStop: false,
      additionalStopAddress: "",
      additionalStopUnit: "",
      additionalStopCity: "",
      additionalStopState: "",
      additionalStopZip: "",
      additionalStopLocationType: "house",
      additionalStopLocationOther: "",
      additionalStopBusinessName: "",
      additionalStopHouseSquareFeet: "",
      additionalStopZestimate: "",
      additionalStopHowFurnished: 80,
      additionalStopApartmentBedBath: "",
      additionalStopStorageUnitQuantity: 1,
      additionalStopStorageUnitSizes: [""],
    additionalStopStorageUnitConditioned: [""],
      additionalStopNotes: "",

      // Property Access - Pickup
      pickupStairs: 1,
      pickupNarrowDoorways: false,
      pickupElevator: false,
      pickupParkingDistance: "close",
      pickupAccessNotes: "",

      // Property Access - Delivery
      deliveryStairs: 1,
      deliveryNarrowDoorways: false,
      deliveryElevator: false,
      deliveryParkingDistance: "close",
      deliveryAccessNotes: "",

      // Heavy/Special Items
      gunSafes: false,
      gunSafesQty: 1,
      gunSafesDetails: "",
      pianos: false,
      pianosQty: 1,
      pianosDetails: "",
      poolTables: false,
      poolTablesQty: 1,
      poolTablesDetails: "",
      otherHeavyItems: false,
      otherHeavyItemsDetails: "",
      largeTVs: false,
      largeTVsQty: 1,
      largeTVsDetails: "",
      purpleGreenMattress: false,
      purpleGreenMattressDetails: "",
      treadmills: false,
      treadmillsDetails: "",
      largeAppliances: false,
      applianceFridge: false,
      applianceFridgeQty: 1,
      applianceWasher: false,
      applianceWasherQty: 1,
      applianceDryer: false,
      applianceDryerQty: 1,
      applianceOven: false,
      applianceOvenQty: 1,
      applianceDishwasher: false,
      applianceDishwasherQty: 1,
      applianceOtherDetails: "",
      plants: false,
      plantsDetails: "",
      bunkBeds: false,
      bunkBedsQty: 1,
      bunkBedsDetails: "",
      trampoline: false,
      trampolineQty: 1,
      trampolineDetails: "",
      tableSaw: false,
      tableSawQty: 1,
      tableSawDetails: "",
      gymEquipment: false,
      gymEquipmentQty: 1,
      gymEquipmentDetails: "",
      sauna: false,
      saunaQty: 1,
      saunaDetails: "",
      playsets: false,
      playsetsQty: 1,
      playsetsDetails: "",
      specialDisassemblyOther: false,
      specialDisassemblyOtherDetails: "",

      // Pets
      catsPresent: false,

      // Packing
      packingStatus: "moderate",
      needsPacking: false,
      packingKitchen: false,
      packingGarage: false,
      packingAttic: false,
      packingWardrobeBoxes: false,
      packingFragileItems: false,
    packingBedrooms: false,
    packingNotes: "",
      junkRemovalNeeded: false,
      junkRemovalAmount: "",
      junkRemovalDetails: "",

      // Insurance
      needsInsurance: false,
      estimatedValue: "",
      tags: [],

      // Timing
      walkThroughDate: "",
    walkThroughTime: "",
    walkThroughDuration: "1",
      preferredDate: "",
    preferredTime: "",
    moveDuration: "3",
      moveDateUnknown: false,
      timeFlexible: false,
      readyToSchedule: false,
      timingNotes: "",

      // Estimates
      estimatedCrewSize: "2-3",
      crewSizeNotes: "",

      // Special Notes
      specialRequests: "",
      fixedBudgetRequested: false,
      desiredBudget: "",

      // House Quality Rating
      houseQuality: 3, // 1-5 scale, default to middle

      // Tools Needed
      hd4Wheel: false,
      airSled: false,
      applianceDolly: false,
      socketWrenches: false,
      safeDolly: false,
      toolCustom1: "",
      toolCustom2: "",
      toolCustom3: "",
    });
  };

  // Initialize Google Places Autocomplete
  const initializeAutocomplete = () => {
    if (!isGoogleLoaded || typeof google === 'undefined') return;

    const options = {
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address'],
      types: ['address']
    };

    // Helper function to parse address components
    const parseAddressComponents = (place: google.maps.places.PlaceResult, fieldPrefix: 'pickup' | 'delivery' | 'additionalStop', inputRef: React.RefObject<HTMLInputElement>) => {
      if (!place.address_components) return;

      const addressData: any = {};

      place.address_components.forEach((component) => {
        const types = component.types;

        if (types.includes('street_number')) {
          addressData.streetNumber = component.long_name;
        }
        if (types.includes('route')) {
          addressData.route = component.long_name;
        }
        if (types.includes('locality')) {
          addressData.city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          addressData.state = component.short_name;
        }
        if (types.includes('postal_code')) {
          addressData.zip = component.long_name;
        }
      });

      // Build street address (only street number and route, NOT city/state/zip)
      const streetAddress = [addressData.streetNumber, addressData.route].filter(Boolean).join(' ');

      // Update form data with parsed components
      // React will update the input value through the controlled component
      setFormData(prev => ({
        ...prev,
        [`${fieldPrefix}Address`]: streetAddress || '',
        [`${fieldPrefix}City`]: addressData.city || '',
        [`${fieldPrefix}State`]: addressData.state || '',
        [`${fieldPrefix}Zip`]: addressData.zip || ''
      }));
    };

    // Cleanup function to remove existing autocomplete instances
    const cleanup = () => {
      if (pickupAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(pickupAutocompleteRef.current);
        pickupAutocompleteRef.current = null;
      }
      if (deliveryAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(deliveryAutocompleteRef.current);
        deliveryAutocompleteRef.current = null;
      }
      if (additionalStopAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(additionalStopAutocompleteRef.current);
        additionalStopAutocompleteRef.current = null;
      }
    };

    // Clean up before creating new instances
    cleanup();

    // Start Address Autocomplete
    if (pickupAddressRef.current && !pickupAutocompleteRef.current) {
      pickupAutocompleteRef.current = new google.maps.places.Autocomplete(pickupAddressRef.current, options);
      pickupAutocompleteRef.current.addListener('place_changed', () => {
        const place = pickupAutocompleteRef.current?.getPlace();
        if (place) parseAddressComponents(place, 'pickup', pickupAddressRef);
      });
    }

    // Delivery Address Autocomplete
    if (deliveryAddressRef.current && !deliveryAutocompleteRef.current) {
      deliveryAutocompleteRef.current = new google.maps.places.Autocomplete(deliveryAddressRef.current, options);
      deliveryAutocompleteRef.current.addListener('place_changed', () => {
        const place = deliveryAutocompleteRef.current?.getPlace();
        if (place) parseAddressComponents(place, 'delivery', deliveryAddressRef);
      });
    }

    // Additional Stop Address Autocomplete
    if (additionalStopAddressRef.current && !additionalStopAutocompleteRef.current) {
      additionalStopAutocompleteRef.current = new google.maps.places.Autocomplete(additionalStopAddressRef.current, options);
      additionalStopAutocompleteRef.current.addListener('place_changed', () => {
        const place = additionalStopAutocompleteRef.current?.getPlace();
        if (place) parseAddressComponents(place, 'additionalStop', additionalStopAddressRef);
      });
    }
  };

  // Initialize autocomplete when Google is loaded or when additional stop is toggled or when delivery address visibility changes
  useEffect(() => {
    if (isGoogleLoaded) {
      initializeAutocomplete();
    }

    // Cleanup on unmount
    return () => {
      if (pickupAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(pickupAutocompleteRef.current);
      }
      if (deliveryAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(deliveryAutocompleteRef.current);
      }
      if (additionalStopAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(additionalStopAutocompleteRef.current);
      }
    };
  }, [isGoogleLoaded, formData.hasAdditionalStop, formData.deliveryAddressUnknown]);

  // Calculate Distance
  const calculateDistance = async () => {
    // Determine price per mile based on service type
    const pricePerMile = formData.serviceType === 'labor-only' ? 1 : 2;

    // Build full addresses
    const pickupFullAddress = [
      formData.pickupAddress,
      formData.pickupUnit,
      formData.pickupCity,
      formData.pickupState,
      formData.pickupZip
    ].filter(Boolean).join(', ');

    const deliveryFullAddress = [
      formData.deliveryAddress,
      formData.deliveryUnit,
      formData.deliveryCity,
      formData.deliveryState,
      formData.deliveryZip
    ].filter(Boolean).join(', ');

    // Build additional stop address if present
    const additionalStopFullAddress = formData.hasAdditionalStop ? [
      formData.additionalStopAddress,
      formData.additionalStopUnit,
      formData.additionalStopCity,
      formData.additionalStopState,
      formData.additionalStopZip
    ].filter(Boolean).join(', ') : null;

    // For labor-only, we only need pickup address. For truck service, we need both.
    if (!formData.pickupCity || !formData.pickupState) {
      setDistanceData(null);
      return;
    }

    // For truck service, also require delivery address
    if (formData.serviceType !== 'labor-only' && (!formData.deliveryCity || !formData.deliveryState)) {
      setDistanceData(null);
      return;
    }

    // If additional stop is enabled, check if it has city and state
    if (formData.hasAdditionalStop && (!formData.additionalStopCity || !formData.additionalStopState)) {
      setDistanceData(null);
      return;
    }

    setIsCalculatingDistance(true);

    try {
      // For labor-only, use pickup address as delivery address (no actual move, just round trip)
      const effectiveDeliveryAddress = formData.serviceType === 'labor-only'
        ? pickupFullAddress
        : deliveryFullAddress;

      const requestBody: any = {
        pickupAddress: pickupFullAddress,
        deliveryAddress: effectiveDeliveryAddress
      };

      if (additionalStopFullAddress && formData.serviceType !== 'labor-only') {
        requestBody.additionalStopAddress = additionalStopFullAddress;
      }

      const response = await fetch('/api/move-wt/calculate-distance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Distance calculation error:', result.error);
        setDistanceData(null);
        return;
      }

      console.log('[Move WT] Distance calculation result:', result);

      // Parse crew size (handle ranges like "4-6")
      let crewSize = 2; // default
      if (formData.estimatedCrewSize) {
        const crewStr = formData.estimatedCrewSize.toString().trim();
        if (crewStr.includes('-')) {
          // Range like "4-6", use smaller number
          crewSize = parseInt(crewStr.split('-')[0]);
        } else {
          crewSize = parseInt(crewStr) || 2;
        }
      }

      // Calculate travel charge for each leg (first 30 miles free)
      const FREE_MILES = 30;

      // Deduct free miles sequentially: Travel to Start -> Move Travel -> Return Travel
      let toPickupBillableMiles = result.toPickup.miles;
      let pickupToDeliveryBillableMiles = result.pickupToDelivery.miles;
      let fromDeliveryBillableMiles = result.fromDelivery.miles;
      let remainingFreeMiles = FREE_MILES;

      // 1. Deduct from Travel to Start first
      if (toPickupBillableMiles >= remainingFreeMiles) {
        toPickupBillableMiles -= remainingFreeMiles;
        remainingFreeMiles = 0;
      } else {
        remainingFreeMiles -= toPickupBillableMiles;
        toPickupBillableMiles = 0;
      }

      // 2. Deduct from Move Travel if there are remaining free miles
      if (remainingFreeMiles > 0) {
        if (pickupToDeliveryBillableMiles >= remainingFreeMiles) {
          pickupToDeliveryBillableMiles -= remainingFreeMiles;
          remainingFreeMiles = 0;
        } else {
          remainingFreeMiles -= pickupToDeliveryBillableMiles;
          pickupToDeliveryBillableMiles = 0;
        }
      }

      // 3. Deduct from Return Travel if there are still remaining free miles
      if (remainingFreeMiles > 0) {
        if (fromDeliveryBillableMiles >= remainingFreeMiles) {
          fromDeliveryBillableMiles -= remainingFreeMiles;
          remainingFreeMiles = 0;
        } else {
          remainingFreeMiles -= fromDeliveryBillableMiles;
          fromDeliveryBillableMiles = 0;
        }
      }

      // To Pickup charges (billable miles + time)
      const toPickupDistanceCharge = toPickupBillableMiles * pricePerMile;
      const toPickupTimeCharge = (result.toPickup.minutes / 60) * 85 * crewSize;
      const toPickupTotalCharge = toPickupDistanceCharge + toPickupTimeCharge;

      // Pickup to Delivery (Move Travel) charges (billable miles + time)
      const pickupToDeliveryDistanceCharge = pickupToDeliveryBillableMiles * pricePerMile;
      const pickupToDeliveryTimeCharge = (result.pickupToDelivery.minutes / 60) * 85 * crewSize;
      const pickupToDeliveryTotalCharge = pickupToDeliveryDistanceCharge + pickupToDeliveryTimeCharge;

      // From Delivery charges (billable miles + time)
      const fromDeliveryDistanceCharge = fromDeliveryBillableMiles * pricePerMile;
      const fromDeliveryTimeCharge = (result.fromDelivery.minutes / 60) * 85 * crewSize;
      const fromDeliveryTotalCharge = fromDeliveryDistanceCharge + fromDeliveryTimeCharge;

      const totalCharge = toPickupTotalCharge + pickupToDeliveryTotalCharge + fromDeliveryTotalCharge;

      setDistanceData({
        toPickup: {
          miles: result.toPickup.miles,
          minutes: result.toPickup.minutes,
          charge: Math.round(toPickupTotalCharge)
        },
        pickupToDelivery: {
          miles: result.pickupToDelivery.miles,
          minutes: result.pickupToDelivery.minutes,
          charge: Math.round(pickupToDeliveryTotalCharge)
        },
        fromDelivery: {
          miles: result.fromDelivery.miles,
          minutes: result.fromDelivery.minutes,
          charge: Math.round(fromDeliveryTotalCharge)
        },
        totalCharge: Math.round(totalCharge)
      });

    } catch (error) {
      console.error('Distance calculation error:', error);
      setDistanceData(null);
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  // Trigger distance calculation when addresses change
  useEffect(() => {
    calculateDistance();
  }, [
    formData.pickupAddress,
    formData.pickupCity,
    formData.pickupState,
    formData.pickupZip,
    formData.deliveryAddress,
    formData.deliveryCity,
    formData.deliveryState,
    formData.deliveryZip,
    formData.hasAdditionalStop,
    formData.additionalStopAddress,
    formData.additionalStopCity,
    formData.additionalStopState,
    formData.additionalStopZip,
    formData.estimatedCrewSize,
    formData.serviceType
  ]);

  // Quote Calculation
  const calculateQuote = () => {
    const items: Array<{
      description: string;
      amount: number;
      subItems?: Array<{ description: string; amount: number; details?: string; alert?: string }>;
      discount?: string;
    }> = [];
    let baseRate = 0;

    // Moving Labor - calculate based on square footage and how much is getting moved
    // Get pickup location square footage
    let pickupSquareFeet = 0;
    if ((formData.pickupLocationType === 'house' || formData.pickupLocationType === 'loading-truck-pod') && formData.pickupHouseSquareFeet) {
      pickupSquareFeet = parseInt(formData.pickupHouseSquareFeet.replace(/,/g, ''));
    } else if (formData.pickupLocationType === 'apartment' && formData.pickupApartmentSquareFeet) {
      pickupSquareFeet = parseInt(formData.pickupApartmentSquareFeet.replace(/,/g, ''));
    } else if (formData.pickupLocationType === 'business' && formData.pickupBusinessSquareFeet) {
      pickupSquareFeet = parseInt(formData.pickupBusinessSquareFeet.replace(/,/g, ''));
    }

    // Get "how much is getting moved" slider value (unified for house, apartment, business, and loading-truck-pod)
    let sliderValue = 0;
    if (formData.pickupLocationType === 'house' || formData.pickupLocationType === 'apartment' || formData.pickupLocationType === 'business' || formData.pickupLocationType === 'loading-truck-pod') {
      sliderValue = formData.pickupHowFurnished || 80;
    }

    const MINIMUM_LABOR = formData.serviceType === 'truck' ? 100 : 170;
    let movingLabor = MINIMUM_LABOR;

    // Manual Override for Labor Hours
    if (formData.pickupManualOverride && formData.pickupManualOverrideHours) {
      const hours = parseFloat(formData.pickupManualOverrideHours);

      // Get crew size for labor calculations
      let crewSize = 2; // default
      if (formData.estimatedCrewSize) {
        const crewStr = formData.estimatedCrewSize.toString().trim();
        if (crewStr.includes('-')) {
          crewSize = parseInt(crewStr.split('-')[0]);
        } else {
          crewSize = parseInt(crewStr) || 2;
        }
      }

      const hourlyRatePerPerson = 85;
      movingLabor = hours * crewSize * hourlyRatePerPerson;

      // Enforce minimum labor even with manual override
      if (movingLabor < MINIMUM_LABOR) {
        movingLabor = MINIMUM_LABOR;
      }
    } else if (formData.pickupLocationType === 'storage-unit') {
      // Storage unit labor calculation
      console.log('[Storage Labor] pickupLocationType:', formData.pickupLocationType);
      // Calculate labor for each storage unit
      let totalStorageLabor = 0;
      console.log('[Storage Labor] Quantity:', formData.pickupStorageUnitQuantity);
      console.log('[Storage Labor] Sizes:', formData.pickupStorageUnitSizes);
      console.log('[Storage Labor] HowFull:', formData.pickupStorageUnitHowFull);
      console.log('[Storage Labor] Conditioned:', formData.pickupStorageUnitConditioned);

      for (let i = 0; i < formData.pickupStorageUnitQuantity; i++) {
        const sizeValue = formData.pickupStorageUnitSizes[i] || '';
        const howFull = formData.pickupStorageUnitHowFull[i] || '';
        const conditioned = formData.pickupStorageUnitConditioned[i] || '';

        // Map size to average square footage
        let avgSF = 0;
        if (sizeValue === '<100sf') avgSF = 75;
        else if (sizeValue === '100-200sf') avgSF = 150;
        else if (sizeValue === '200-300sf') avgSF = 250;
        else if (sizeValue === '300-400sf') avgSF = 350;
        else if (sizeValue === '400+sf') avgSF = 500;

        // Map "how full" to percentage
        let howFullPercent = 0;
        if (howFull === 'light') howFullPercent = 0.25;
        else if (howFull === 'medium') howFullPercent = 0.60;
        else if (howFull === 'packed') howFullPercent = 1.0;

        // Conditioned factor (130% if conditioned)
        const conditionedFactor = conditioned === 'yes' ? 1.3 : 1.0;

        // Formula: SF × howFull% × conditioned factor × 2.6
        const unitLabor = avgSF * howFullPercent * conditionedFactor * 2.6;
        console.log(`[Storage Labor] Unit ${i}: avgSF=${avgSF}, howFullPercent=${howFullPercent}, conditionedFactor=${conditionedFactor}, unitLabor=${unitLabor}`);
        totalStorageLabor += unitLabor;
      }

      console.log('[Storage Labor] totalStorageLabor:', totalStorageLabor, 'MINIMUM_LABOR:', MINIMUM_LABOR);
      movingLabor = totalStorageLabor > MINIMUM_LABOR ? totalStorageLabor : MINIMUM_LABOR;
      console.log('[Storage Labor] Final movingLabor:', movingLabor);
    } else if (formData.pickupLocationType === 'unloading-truck-pod') {
      // Unloading truck/POD labor calculation: L × W × % × 4 / (26 × 8) × 85
      const length = parseFloat(formData.pickupTruckPodLength) || 0;
      const width = parseFloat(formData.pickupTruckPodWidth) || 0;
      const howFullPercent = (formData.pickupTruckPodHowFull || 100) / 100;
      const truckPodLabor = (length * width * howFullPercent * 4) / (26 * 8) * 85;
      console.log('[Truck/POD Labor] L:', length, 'W:', width, '%:', howFullPercent, 'Labor:', truckPodLabor);
      movingLabor = truckPodLabor > MINIMUM_LABOR ? truckPodLabor : MINIMUM_LABOR;
    } else if (pickupSquareFeet === 0 || sliderValue < 20) {
      // If no square feet or slider value is very low (barely anything), just use minimum labor
      movingLabor = MINIMUM_LABOR;
    } else {
      // Convert slider value to calculation percentage
      // Slider at 80% ("Whole house") = 100% for calculation
      // Slider at 100% ("It's Loaded!") = 120% for calculation
      let calculationPercentage = 0;
      if (sliderValue <= 80) {
        calculationPercentage = sliderValue * 1.25;
      } else {
        calculationPercentage = 100 + (sliderValue - 80);
      }

      // Formula: square_footage × calculation_percentage × 0.8
      movingLabor = pickupSquareFeet * (calculationPercentage / 100) * 0.8;

      // Apply parking distance factor
      // short = 0%, medium = 5%, long = 10%
      let parkingFactor = 1.0;

      // Pickup parking distance
      if (formData.pickupParkingDistance === 'medium') {
        parkingFactor += 0.05;
      } else if (formData.pickupParkingDistance === 'far' || formData.pickupParkingDistance === 'long') {
        parkingFactor += 0.10;
      }

      // Delivery parking distance
      if (formData.deliveryParkingDistance === 'medium') {
        parkingFactor += 0.05;
      } else if (formData.deliveryParkingDistance === 'far' || formData.deliveryParkingDistance === 'long') {
        parkingFactor += 0.10;
      }

      movingLabor = movingLabor * parkingFactor;

      // Enforce base minimum labor ($100 for truck, $170 otherwise)
      if (movingLabor < MINIMUM_LABOR) {
        movingLabor = MINIMUM_LABOR;
      }
    }

    if (movingLabor > 0) {
      const materialsCharge = movingLabor * 0.05; // 5% of labor
      const totalMovingCharge = movingLabor + materialsCharge;

      items.push({
        description: 'Moving',
        amount: Math.round(totalMovingCharge),
        subItems: [
          {
            description: 'Loading/Unloading Labor',
            amount: Math.round(movingLabor)
          },
          {
            description: 'Materials and Supplies',
            amount: Math.round(materialsCharge)
          }
        ]
      });
    }

    // Travel billing - use calculated distance data
    if (distanceData) {
      const FREE_MILES = 15; // Total free miles to distribute across all legs
      let remainingFreeMiles = FREE_MILES;

      // Get crew size for labor calculations
      let crewSize = 2; // default
      if (formData.estimatedCrewSize) {
        const crewStr = formData.estimatedCrewSize.toString().trim();
        if (crewStr.includes('-')) {
          crewSize = parseInt(crewStr.split('-')[0]);
        } else {
          crewSize = parseInt(crewStr) || 2;
        }
      }

      // Determine price per mile based on service type
      const pricePerMile = formData.serviceType === 'labor-only' ? 1 : 2;

      // For labor-only, use average of to/from distances for both legs
      let adjustedToPickup = distanceData.toPickup;
      let adjustedFromDelivery = distanceData.fromDelivery;

      if (formData.serviceType === 'labor-only') {
        const avgMiles = (distanceData.toPickup.miles + distanceData.fromDelivery.miles) / 2;
        const avgMinutes = (distanceData.toPickup.minutes + distanceData.fromDelivery.minutes) / 2;
        adjustedToPickup = { miles: avgMiles, minutes: avgMinutes, charge: 0 };
        adjustedFromDelivery = { miles: avgMiles, minutes: avgMinutes, charge: 0 };
      }

      // Apply free miles sequentially: Travel to Start -> Move Travel -> Return Travel

      // 1. Travel to Start (distance + time)
      let toStartBillableMiles = adjustedToPickup.miles;
      if (toStartBillableMiles >= remainingFreeMiles) {
        toStartBillableMiles -= remainingFreeMiles;
        remainingFreeMiles = 0;
      } else {
        remainingFreeMiles -= toStartBillableMiles;
        toStartBillableMiles = 0;
      }
      const toStartDistanceCharge = toStartBillableMiles * pricePerMile;
      const toStartTimeCharge = (adjustedToPickup.minutes / 60) * 170; // Always 2-person crew for travel time
      const toStartCharge = toStartDistanceCharge + toStartTimeCharge;

      // 2. Move Travel (distance + time)
      let moveTravelBillableMiles = 0;
      let moveTravelCharge = 0;
      if (distanceData.pickupToDelivery) {
        moveTravelBillableMiles = distanceData.pickupToDelivery.miles;

        if (remainingFreeMiles > 0) {
          if (moveTravelBillableMiles >= remainingFreeMiles) {
            moveTravelBillableMiles -= remainingFreeMiles;
            remainingFreeMiles = 0;
          } else {
            remainingFreeMiles -= moveTravelBillableMiles;
            moveTravelBillableMiles = 0;
          }
        }

        const moveTravelDistanceCharge = moveTravelBillableMiles * pricePerMile;
        const moveTravelTimeCharge = (distanceData.pickupToDelivery.minutes / 60) * 170; // Always 2-person crew for travel time
        moveTravelCharge = moveTravelDistanceCharge + moveTravelTimeCharge;
      }

      // 3. Return Travel (distance + time)
      let returnTravelBillableMiles = adjustedFromDelivery.miles;
      if (remainingFreeMiles > 0) {
        if (returnTravelBillableMiles >= remainingFreeMiles) {
          returnTravelBillableMiles -= remainingFreeMiles;
          remainingFreeMiles = 0;
        } else {
          remainingFreeMiles -= returnTravelBillableMiles;
          returnTravelBillableMiles = 0;
        }
      }
      const returnTravelDistanceCharge = returnTravelBillableMiles * pricePerMile;
      const returnTravelTimeCharge = (adjustedFromDelivery.minutes / 60) * 170; // Always 2-person crew for travel time
      const returnTravelCharge = returnTravelDistanceCharge + returnTravelTimeCharge;

      // If waive travel is checked, only include Move Travel (skip Travel to Start and Return Travel)
      if (formData.waiveTravel) {
        // Only add Move Travel if it exists and has miles
        if (distanceData.pickupToDelivery && distanceData.pickupToDelivery.miles > 0) {
          items.push({
            description: 'Move Travel',
            details: `(${distanceData.pickupToDelivery.miles.toFixed(1)} mi, ${formatDuration(distanceData.pickupToDelivery.minutes)})`,
            amount: Math.round(moveTravelCharge)
          });
        }
      } else {
        const totalTravelCharge = toStartCharge + moveTravelCharge + returnTravelCharge;

        if (totalTravelCharge < 100) {
          // Flat travel charge if less than $100
          items.push({
            description: 'Travel',
            amount: 100
          });
        } else {
          // Show breakdown if $100 or more
          const subItems = [
            {
              description: 'Travel to Start',
              details: `(${adjustedToPickup.miles.toFixed(1)} mi, ${formatDuration(adjustedToPickup.minutes)})`,
              amount: Math.round(toStartCharge)
            }
          ];

          // Add Move Travel if present
          if (distanceData.pickupToDelivery && distanceData.pickupToDelivery.miles > 0) {
            subItems.push({
              description: 'Move Travel',
              details: `(${distanceData.pickupToDelivery.miles.toFixed(1)} mi, ${formatDuration(distanceData.pickupToDelivery.minutes)})`,
              amount: Math.round(moveTravelCharge)
            });
          }

          subItems.push({
            description: 'Return Travel',
            details: `(${adjustedFromDelivery.miles.toFixed(1)} mi, ${formatDuration(adjustedFromDelivery.minutes)})`,
            amount: Math.round(returnTravelCharge)
          });

          items.push({
            description: 'Travel (first 15 miles included)',
            amount: Math.round(totalTravelCharge),
            subItems: subItems
          });
        }
      }
    }

    // Pickup location factors
    if (formData.pickupStairs > 1 && !formData.pickupElevator) {
      const stairFee = (formData.pickupStairs - 1) * 25;
      items.push({ description: `Pickup Location Stairs (${formData.pickupStairs} levels)`, amount: stairFee });
    }

    // Delivery location factors
    if (formData.deliveryStairs > 1 && !formData.deliveryElevator) {
      const stairFee = (formData.deliveryStairs - 1) * 25;
      items.push({ description: `Delivery Location Stairs (${formData.deliveryStairs} levels)`, amount: stairFee });
    }

    // Heavy/Special Items
    const heavyItems: Array<{ description: string; amount: number; alert?: string }> = [];

    if (formData.pianos) {
      const pianoCount = formData.pianosQty || 1;
      const pianoCharge = 100 * pianoCount;
      heavyItems.push({
        description: `Piano${pianoCount > 1 ? ` (${pianoCount})` : ''}`,
        amount: pianoCharge,
        alert: 'Must be on ground level with no more than 2 steps'
      });
    }

    if (formData.poolTables) {
      const poolTableCount = formData.poolTablesQty || 1;
      const poolTableCharge = 100 * poolTableCount;
      heavyItems.push({
        description: `Pool Table${poolTableCount > 1 ? ` (${poolTableCount})` : ''}`,
        amount: poolTableCharge,
        alert: 'Must be on ground level with no more than 2 steps'
      });
    }

    if (formData.gunSafes) {
      const gunSafeCount = formData.gunSafesQty || 1;
      const gunSafeCharge = 100 * gunSafeCount;
      heavyItems.push({
        description: `Gun Safe${gunSafeCount > 1 ? ` (${gunSafeCount})` : ''}`,
        amount: gunSafeCharge,
        alert: 'Must be on ground level with no more than 2 steps'
      });
    }

    if (formData.largeTVs) {
      const tvCount = formData.largeTVsQty || 1;
      const tvCharge = 60 * tvCount;
      heavyItems.push({ description: `TV${tvCount > 1 ? `s (${tvCount})` : ''}`, amount: tvCharge });
    }

    if (heavyItems.length > 0) {
      const totalHeavyItems = heavyItems.reduce((sum, item) => sum + item.amount, 0);
      items.push({
        description: 'Heavy/Special Items',
        amount: totalHeavyItems,
        subItems: heavyItems
      });
    }

    // Junk Removal
    if (formData.junkRemovalNeeded && formData.junkRemovalAmount) {
      let junkRemovalCharge = 0;
      const amount = formData.junkRemovalAmount;

      if (amount === 'up to 1/4') {
        junkRemovalCharge = 100;
      } else if (amount === '1/4-1/2') {
        junkRemovalCharge = 200;
      } else if (amount === '1/2-3/4') {
        junkRemovalCharge = 300;
      } else if (amount === '3/4-full' || amount === 'full+') {
        junkRemovalCharge = 400;
      }

      // Apply 20% discount for booking with move
      const discountedCharge = junkRemovalCharge * 0.8;

      if (junkRemovalCharge > 0) {
        // Format junk removal amount for display
        let displayAmount = amount;
        if (amount === 'up to 1/4') {
          displayAmount = 'Up to 1/4 Truckload';
        } else if (amount === '1/4-1/2') {
          displayAmount = '1/4-1/2 Truckload';
        } else if (amount === '1/2-3/4') {
          displayAmount = '1/2-3/4 Truckload';
        } else if (amount === '3/4-full') {
          displayAmount = '3/4-Full Truckload';
        } else if (amount === 'full+') {
          displayAmount = 'Full+ Truckload';
        }

        items.push({
          description: 'Junk Removal',
          amount: discountedCharge,
          discount: '*20% off w/move',
          subItems: [
            {
              description: displayAmount,
              amount: discountedCharge
            }
          ]
        });
      }
    }

        // Enforce combined minimum for truck service ($510 for Moving Labor + Move Travel Time)
    if (formData.serviceType === 'truck' && distanceData?.pickupToDelivery) {
      const COMBINED_MINIMUM = 510;
      // Calculate move travel TIME charge only (not mileage)
      const moveTravelTimeOnlyCharge = (distanceData.pickupToDelivery.minutes / 60) * 170;

      // Find Moving item
      const movingItem = items.find(item => item.description === 'Moving');

      if (movingItem) {
        const movingLaborSubItem = movingItem.subItems?.find(sub => sub.description === 'Loading/Unloading Labor');
        const currentLaborAmount = movingLaborSubItem?.amount || 0;

        // Combined = labor + move travel time
        const currentCombined = currentLaborAmount + moveTravelTimeOnlyCharge;

        if (currentCombined < COMBINED_MINIMUM) {
          // Need to increase moving labor to meet combined minimum
          const shortfall = COMBINED_MINIMUM - currentCombined;

          if (movingLaborSubItem) {
            // Increase labor by shortfall
            const newLabor = movingLaborSubItem.amount + shortfall;
            movingLaborSubItem.amount = Math.round(newLabor);

            // Recalculate materials (5% of new labor)
            const materialsSubItem = movingItem.subItems?.find(sub => sub.description === 'Materials and Supplies');
            if (materialsSubItem) {
              materialsSubItem.amount = Math.round(newLabor * 0.05);
            }

            // Update moving total
            movingItem.amount = Math.round(newLabor) + (materialsSubItem?.amount || Math.round(newLabor * 0.05));
          }
        }
      }
    }

    // Packing and Boxing
    if (formData.needsPacking) {
      const packingStatus = formData.packingStatus;
      let packingLaborCharge = 0;
      let packingLevel = '';

      if (packingStatus === 'a few') {
        // Flat $50 for "a few"
        packingLaborCharge = 50;
        packingLevel = 'A Few';
      } else {
        // For moderate, quite a bit, and lots - use formula
        // Get packing factor based on selection
        let packingFactor = 0;

        if (packingStatus === 'moderate') {
          packingFactor = 0.25;
          packingLevel = 'Moderate';
        } else if (packingStatus === 'quite a bit') {
          packingFactor = 0.60;
          packingLevel = 'Quite a Bit';
        } else if (packingStatus === 'lots') {
          packingFactor = 1.0;
          packingLevel = 'Everything!';
        }

        if (packingFactor > 0) {
          // Get start address square feet
          let startSquareFeet = 0;
          if ((formData.pickupLocationType === 'house' || formData.pickupLocationType === 'loading-truck-pod') && formData.pickupHouseSquareFeet) {
            startSquareFeet = parseInt(formData.pickupHouseSquareFeet.replace(/,/g, ''));
          } else if (formData.pickupLocationType === 'apartment' && formData.pickupApartmentSquareFeet) {
            startSquareFeet = parseInt(formData.pickupApartmentSquareFeet.replace(/,/g, ''));
          } else if (formData.pickupLocationType === 'business' && formData.pickupBusinessSquareFeet) {
            startSquareFeet = parseInt(formData.pickupBusinessSquareFeet.replace(/,/g, ''));
          }

          if (startSquareFeet > 0) {
            // Get "how much is getting moved" slider value and convert to percentage (unified for house, apartment, business, and loading-truck-pod)
            let sliderValue = 0;
            if (formData.pickupLocationType === 'house' || formData.pickupLocationType === 'apartment' || formData.pickupLocationType === 'business' || formData.pickupLocationType === 'loading-truck-pod') {
              sliderValue = formData.pickupHowFurnished || 80;
            }

            // Convert slider value to calculation percentage
            // Slider at 80% ("Whole house") = 100% for calculation
            // Slider at 100% ("It's Loaded!") = 120% for calculation
            let calculationPercentage = 0;
            if (sliderValue <= 80) {
              calculationPercentage = sliderValue * 1.25;
            } else {
              calculationPercentage = 100 + (sliderValue - 80);
            }

            // Formula: packing_factor × square_feet × 0.5 × calculation_percentage
            packingLaborCharge = packingFactor * startSquareFeet * 0.5 * (calculationPercentage / 100);
          }
        }
      }

      // Add Packing and Boxing as a header with sub-items
      if (packingLaborCharge > 0) {
        const materialsCharge = packingLaborCharge * 0.20;
        const totalPackingCharge = packingLaborCharge + materialsCharge;

        items.push({
          description: `Packing and Boxing (${packingLevel})`,
          amount: Math.round(totalPackingCharge),
          subItems: [
            {
              description: 'Labor',
              amount: Math.round(packingLaborCharge)
            },
            {
              description: 'Materials and Supplies',
              amount: Math.round(materialsCharge)
            }
          ]
        });
      }
    }

    // If Fixed Budget Requested, check if budget is sufficient (don't artificially increase labor)
    if (formData.fixedBudgetRequested && formData.desiredBudget) {
      const desiredBudget = parseFloat(formData.desiredBudget.replace(/,/g, ''));

      if (!isNaN(desiredBudget) && desiredBudget > 0) {
        // Calculate fixed costs (everything except Moving)
        let fixedCosts = 0;
        let originalMovingLabor = 0;

        items.forEach(item => {
          if (item.description !== 'Moving') {
            fixedCosts += item.amount;
          } else if (item.subItems) {
            const laborSubItem = item.subItems.find(sub => sub.description === 'Labor');
            originalMovingLabor = laborSubItem?.amount || 0;
          }
        });

        // Calculate what budget allows for
        // Formula: desiredBudget = fixedCosts + movingLabor + (movingLabor * 0.05)
        // Solving: movingLabor = (desiredBudget - fixedCosts) / 1.05
        const availableForMoving = desiredBudget - fixedCosts;
        const budgetAllowsLabor = availableForMoving / 1.05;

        // Minimum is 2 movers for 1 hour = $170
        const minimumMovingLabor = 170;

        if (budgetAllowsLabor < minimumMovingLabor) {
          // Budget is insufficient
          setIsBudgetInsufficient(true);
        } else {
          setIsBudgetInsufficient(false);

          // Only reduce labor if budget is insufficient
          // NEVER increase labor beyond the normal recommendation
          if (budgetAllowsLabor < originalMovingLabor) {
            // Budget is constraining - reduce labor to fit
            const movingItemIndex = items.findIndex(item => item.description === 'Moving');
            if (movingItemIndex !== -1) {
              const materialsCharge = budgetAllowsLabor * 0.05;
              const totalMovingCharge = budgetAllowsLabor + materialsCharge;

              items[movingItemIndex] = {
                description: 'Moving',
                amount: Math.round(totalMovingCharge),
                subItems: [
                  {
                    description: 'Labor',
                    amount: Math.round(budgetAllowsLabor)
                  },
                  {
                    description: 'Materials and Supplies',
                    amount: Math.round(materialsCharge)
                  }
                ]
              };
            }
          }
          // If budgetAllowsLabor >= originalMovingLabor, leave the Moving item unchanged
        }
      }
    } else {
      setIsBudgetInsufficient(false);
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.amount, 0);

    setQuote({
      baseRate,
      items,
      total
    });
  };

  // Recalculate quote when form data or distance data changes
  useEffect(() => {
    calculateQuote();
  }, [formData, distanceData]);

  // Calculate crew configurations for fixed budget (applies to Moving labor only)
  const calculateBudgetCrewOptions = () => {
    if (!formData.fixedBudgetRequested || !formData.desiredBudget || !quote) {
      return null;
    }

    const desiredBudget = parseFloat(formData.desiredBudget);
    if (isNaN(desiredBudget) || desiredBudget <= 0) {
      return null;
    }

    // Find the normal Moving labor amount (without budget constraints)
    let normalMovingLabor = 0;
    let normalMovingMaterials = 0;

    const movingItem = quote.items.find(item => item.description === 'Moving');
    if (movingItem && movingItem.subItems) {
      const laborSubItem = movingItem.subItems.find(sub => sub.description === 'Labor');
      const materialsSubItem = movingItem.subItems.find(sub => sub.description === 'Materials and Supplies');
      normalMovingLabor = laborSubItem?.amount || 0;
      normalMovingMaterials = materialsSubItem?.amount || 0;
    }

    // Calculate fixed costs (everything except Moving labor and its materials)
    // Moving materials are 5% of Moving labor, so they'll be calculated based on the new labor amount
    let fixedCosts = 0;

    quote.items.forEach(item => {
      if (item.description === 'Moving') {
        // Skip entirely - we'll calculate new moving labor and materials
      } else {
        // All other items are fixed costs (Travel, Stairs, Heavy Items, Junk, Packing, etc.)
        fixedCosts += item.amount;
      }
    });

    // Available budget for moving labor + materials
    // Formula: desiredBudget = fixedCosts + movingLabor + (movingLabor * 0.05)
    // Solving for movingLabor: movingLabor = (desiredBudget - fixedCosts) / 1.05
    const availableForMoving = desiredBudget - fixedCosts;
    let movingLaborBudget = availableForMoving / 1.05;

    // Check if budget is sufficient to cover normal recommended labor
    // If yes, return early - no need to calculate alternative crew configurations
    if (normalMovingLabor > 0 && movingLaborBudget >= normalMovingLabor) {
      const normalTotal = normalMovingLabor + normalMovingMaterials;
      const totalWithFixedCosts = Math.round(fixedCosts + normalTotal);

      return {
        viable: true,
        budgetSufficient: true,
        message: `Your budget of $${desiredBudget.toLocaleString()} is sufficient to cover the recommended labor. The quote shows the normal recommended crew and hours (not adjusted for budget).`,
        desiredBudget,
        fixedCosts,
        movingLaborBudget: normalMovingLabor,
        movingMaterialsBudget: normalMovingMaterials,
        estimatedTotal: totalWithFixedCosts
      };
    }

    const movingMaterialsBudget = movingLaborBudget * 0.05;

    // Hourly rate per person is $85
    const hourlyRatePerPerson = 85;

    // Minimum viable option is 2 people for 1 hour
    const minimumLaborCost = 2 * 1 * hourlyRatePerPerson;

    if (movingLaborBudget < minimumLaborCost) {
      // Calculate minimum budget: fixedCosts + minimumLabor + materials (5% of labor)
      // Using formula: minimumBudget = fixedCosts + (minimumLabor * 1.05)
      const minimumBudget = Math.ceil(fixedCosts + (minimumLaborCost * 1.05));

      return {
        viable: false,
        message: `With your address locations and requested services, the minimum budget for 2 movers to work at least 1 hour is $${minimumBudget.toLocaleString()}`
      };
    }

    // Calculate viable crew configurations
    // 2 people: 1-5 hours per person
    // 3+ people: 3-5 hours per person (don't allow too many people finishing too quickly)
    const options: Array<{ crewSize: number; hours: number; totalHours: number; laborCost: number; totalCost: number }> = [];

    for (let crewSize = 2; crewSize <= 6; crewSize++) {
      // Calculate max hours this crew can work within moving labor budget
      const maxHours = movingLaborBudget / (crewSize * hourlyRatePerPerson);

      // Determine minimum hours based on crew size
      const minHours = crewSize === 2 ? 1 : 3;

      // Only include if hours per person is between min and 5 hours
      if (maxHours >= minHours && maxHours <= 5) {
        const totalHours = crewSize * maxHours;
        const laborCost = crewSize * maxHours * hourlyRatePerPerson;
        const materialsCost = laborCost * 0.05;
        const totalCost = laborCost + materialsCost;
        options.push({ crewSize, hours: maxHours, totalHours, laborCost, totalCost });
      }
    }

    if (options.length === 0) {
      // Calculate minimum budget for viable crew configuration
      const minimumBudget = Math.ceil(fixedCosts + (minimumLaborCost * 1.05));

      return {
        viable: false,
        message: `With your address locations and requested services, the minimum budget for 2 movers to work at least 1 hour is $${minimumBudget.toLocaleString()}`
      };
    }

    return {
      viable: true,
      movingLaborBudget,
      movingMaterialsBudget,
      fixedCosts,
      options,
      desiredBudget
    };
  };

  const budgetCrewOptions = calculateBudgetCrewOptions();

  // Helper function to format hours and minutes
  const formatHoursMinutes = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) {
      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
    }
    return `${wholeHours} hr${wholeHours !== 1 ? 's' : ''} ${minutes} min`;
  };

  // Manual property data fetch functions
  const fetchPickupPropertyData = async () => {
    if (!formData.pickupAddress || !formData.pickupCity || !formData.pickupState || !formData.pickupZip) {
      alert('Please enter a complete pickup address first');
      return;
    }

    const fullAddress = `${formData.pickupAddress}, ${formData.pickupCity}, ${formData.pickupState} ${formData.pickupZip}`;

    setIsLoadingPickupProperty(true);
    try {
      const response = await fetch('/api/move-wt/get-property-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fullAddress }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Format bed/bath as "X bed / Y bath" if available
        const bedBath = (result.data.bedrooms && result.data.bathrooms)
          ? `${result.data.bedrooms} bed / ${result.data.bathrooms} bath`
          : '';

        // Validate square feet (must be between 500 and 8000)
        const squareFeet = result.data.squareFeet;
        const validSquareFeet = (squareFeet && squareFeet >= 500 && squareFeet <= 8000)
          ? squareFeet.toString()
          : '';

        // Validate estimated value (must be between $50,000 and $5,000,000)
        const estimatedValue = result.data.estimatedValue;
        const validEstimatedValue = (estimatedValue && estimatedValue >= 50000 && estimatedValue <= 5000000)
          ? estimatedValue.toString()
          : '';

        setFormData(prev => ({
          ...prev,
          pickupHouseSquareFeet: validSquareFeet || prev.pickupHouseSquareFeet,
          pickupZestimate: validEstimatedValue || prev.pickupZestimate,
          pickupApartmentSquareFeet: validSquareFeet || prev.pickupApartmentSquareFeet,
          pickupApartmentBedBath: bedBath || prev.pickupApartmentBedBath,
        }));
      } else {
        alert(result.message || 'Could not fetch property data');
      }
    } catch (error) {
      console.error('[Manual Fetch Pickup] Error:', error);
      alert('Failed to fetch property data');
    } finally {
      setIsLoadingPickupProperty(false);
    }
  };

  const fetchDeliveryPropertyData = async () => {
    if (!formData.deliveryAddress || !formData.deliveryCity || !formData.deliveryState || !formData.deliveryZip) {
      alert('Please enter a complete delivery address first');
      return;
    }

    const fullAddress = `${formData.deliveryAddress}, ${formData.deliveryCity}, ${formData.deliveryState} ${formData.deliveryZip}`;

    setIsLoadingDeliveryProperty(true);
    try {
      const response = await fetch('/api/move-wt/get-property-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fullAddress }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Format bed/bath as "X bed / Y bath" if available
        const bedBath = (result.data.bedrooms && result.data.bathrooms)
          ? `${result.data.bedrooms} bed / ${result.data.bathrooms} bath`
          : '';

        // Validate square feet (must be between 500 and 8000)
        const squareFeet = result.data.squareFeet;
        const validSquareFeet = (squareFeet && squareFeet >= 500 && squareFeet <= 8000)
          ? squareFeet.toString()
          : '';

        // Validate estimated value (must be between $50,000 and $5,000,000)
        const estimatedValue = result.data.estimatedValue;
        const validEstimatedValue = (estimatedValue && estimatedValue >= 50000 && estimatedValue <= 5000000)
          ? estimatedValue.toString()
          : '';

        setFormData(prev => ({
          ...prev,
          deliveryHouseSquareFeet: validSquareFeet || prev.deliveryHouseSquareFeet,
          deliveryZestimate: validEstimatedValue || prev.deliveryZestimate,
          deliveryApartmentSquareFeet: validSquareFeet || prev.deliveryApartmentSquareFeet,
          deliveryApartmentBedBath: bedBath || prev.deliveryApartmentBedBath,
        }));
      } else {
        alert(result.message || 'Could not fetch property data');
      }
    } catch (error) {
      console.error('[Manual Fetch Delivery] Error:', error);
      alert('Failed to fetch property data');
    } finally {
      setIsLoadingDeliveryProperty(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobNumber || !address) {
      alert('Please load a job number first');
      return;
    }

    setIsSaving(true);

    try {
      await saveFormData(true); // true = show success message
      console.log("Form submitted:", formData);
    } catch (error) {
      console.error('Save form error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return (
    <>
      {googleMapsApiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => setIsGoogleLoaded(true)}
        />
      )}
      <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="shadow-sm sticky top-0 z-10" style={{ backgroundColor: '#06649b' }}>
        <div className="px-4 py-4 flex items-center">
          <button
            onClick={() => router.back()}
            className="text-white mr-3"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Move Walk-Through</h1>
            {isLoadingJob ? (
              <div className="flex items-center gap-2 text-sm text-gray-100">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Loading job details...</span>
              </div>
            ) : address ? (
              <p className="text-sm text-gray-100">{address}</p>
            ) : (
              <p className="text-sm text-gray-100">Complete the move walk-through</p>
            )}
          </div>
        </div>
      </header>

      {/* Recent Forms Quick Links */}
      {recentForms.length > 0 && (
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <p className="text-xs text-gray-500 mb-2 text-center">Recent Leads</p>
          <div className="grid grid-cols-2 gap-2">
            {recentForms.map((form) => (
              <button
                key={form.id}
                onClick={() => handleLoadRecentForm(form.phoneNumber)}
                disabled={isLoadingJob}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-left"
              >
                <div className="font-semibold truncate">{form.displayName || 'Unknown'}</div>
                {form.phoneNumber && (
                  <div className="text-gray-500 text-xs">{form.phoneNumber}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-8 space-y-6">
        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <input
                id="jobNumber"
                type="text"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="Job #"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                id="searchPhone"
                type="tel"
                value={searchPhone}
                onChange={handleSearchPhoneChange}
                placeholder="Phone #"
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                id="searchQuoteNum"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={searchQuoteNum}
                onChange={(e) => setSearchQuoteNum(e.target.value.replace(/D/g, '').slice(0, 4))}
                placeholder="Quote #"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleLoadJob}
                disabled={isLoadingJob || (!jobNumber && !searchPhone && !searchQuoteNum)}
                className="px-6 py-2 bg-blue-600 rounded-lg font-semibold text-white transition-colors disabled:bg-gray-400"
              >
                {isLoadingJob ? 'Loading...' : 'Load'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-2 bg-gray-500 rounded-lg font-semibold text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          {address && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">Address:</p>
              <p className="text-sm text-green-800">{address}</p>
            </div>
          )}
        </div>

        {/* Upload to Google Drive Button */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <a
            href={folderUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg font-semibold text-white transition-all text-sm ${
              folderUrl && !isLoadingJob
                ? 'bg-green-500 hover:bg-green-600 active:scale-95 cursor-pointer'
                : 'bg-gray-400 cursor-not-allowed pointer-events-none'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span>
              {isLoadingJob ? 'Loading...' : folderUrl ? 'Upload Walk-Through Pictures and Videos' : 'Upload Walk-Through Pictures and Videos'}
            </span>
          </a>
          {folderUrl && !isLoadingJob && (
            <div className="flex flex-col items-center mt-2 gap-1">
              <p className="text-xs text-center text-gray-500">
                Opens Google Drive folder
              </p>
              <button
                type="button"
                onClick={handleCopyFolderLink}
                className={`text-sm font-bold cursor-pointer transition-colors ${
                  isFolderLinkCopied
                    ? 'text-gray-400'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                Copy Folder Link
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 space-y-6 md:pb-24">

        {/* Clear Job Details Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to clear all job details? Customer info will be preserved.')) {
                // Keep customer info, clear everything else
                const preservedData = {
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  company: formData.company,
                  phone: formData.phone,
                  phoneName: formData.phoneName,
                  email: formData.email,
                  emailName: formData.emailName,
                };
                setFormData(prev => ({
                  // Service Type - reset to defaults
                  serviceType: "truck",
                  travelBilling: "local",
                  travelCost: "",

                  // Customer Information - PRESERVE
                  ...preservedData,
                  customerHomeAddressType: "pickup" as "" | "pickup" | "delivery",

                  // Labor Only
                  laborOnlySameAddress: true,

                  // Addresses - Pickup (clear all)
                  pickupAddress: "",
                  pickupUnit: "",
                  pickupCity: "",
                  pickupState: "",
                  pickupZip: "",
                  pickupLocationType: "house",
                  pickupLocationOther: "",
                  pickupBusinessName: "",
                  pickupBusinessSquareFeet: "",
                  pickupOtherSquareFeet: "",
                  pickupHouseSquareFeet: "",
                  pickupZestimate: "",
                  pickupHowFurnished: 80,
                  pickupApartmentSquareFeet: "",
                  pickupApartmentBedBath: "",
                  pickupApartmentHowFurnished: 80,
                  pickupStorageUnitQuantity: 1,
                  pickupStorageUnitSizes: [""],
                  pickupStorageUnitHowFull: [""],
                  pickupStorageUnitConditioned: [""],
                  pickupTruckPodLength: "",
                  pickupTruckPodWidth: "",
                  pickupTruckPodHowFull: 100,

                  // Addresses - Delivery (clear all)
                  deliveryAddress: "",
                  deliveryUnit: "",
                  deliveryCity: "",
                  deliveryState: "",
                  deliveryZip: "",
                  deliveryLocationType: "house",
                  deliveryLocationOther: "",
                  deliveryBusinessName: "",
                  deliveryHouseSquareFeet: "",
                  deliveryZestimate: "",
                  deliveryHowFurnished: 80,
                  deliveryApartmentSquareFeet: "",
                  deliveryApartmentBedBath: "",
                  deliveryApartmentHowFurnished: 80,
                  deliveryStorageUnitQuantity: 1,
                  deliveryStorageUnitSizes: [""],
                  deliveryStorageUnitConditioned: [""],
                  deliveryPODQuantity: 1,
                  deliveryPODSize: "",
                  deliveryTruckLength: "",
                  deliveryAddressUnknown: false,

                  // Additional Stop (clear all)
                  hasAdditionalStop: false,
                  additionalStopAddress: "",
                  additionalStopUnit: "",
                  additionalStopCity: "",
                  additionalStopState: "",
                  additionalStopZip: "",
                  additionalStopLocationType: "house",
                  additionalStopLocationOther: "",
                  additionalStopBusinessName: "",
                  additionalStopHouseSquareFeet: "",
                  additionalStopZestimate: "",
                  additionalStopHowFurnished: 80,
                  additionalStopApartmentBedBath: "",
                  additionalStopStorageUnitQuantity: 1,
                  additionalStopStorageUnitSizes: [""],
                  additionalStopStorageUnitConditioned: [""],
                  additionalStopNotes: "",

                  // Pickup Access (clear all)
                  pickupStairs: 1,
                  pickupNarrowDoorways: false,
                  pickupElevator: false,
                  pickupParkingDistance: "close",
                  pickupAccessNotes: "",

                  // Delivery Access (clear all)
                  deliveryStairs: 1,
                  deliveryNarrowDoorways: false,
                  deliveryElevator: false,
                  deliveryParkingDistance: "close",
                  deliveryAccessNotes: "",

                  // Heavy/Special Items (clear all)
                  gunSafes: false,
                  gunSafesQty: 1,
                  gunSafesDetails: "",
                  pianos: false,
                  pianosQty: 1,
                  pianosDetails: "",
                  poolTables: false,
                  poolTablesQty: 1,
                  poolTablesDetails: "",
                  otherHeavyItems: false,
                  otherHeavyItemsDetails: "",
                  largeTVs: false,
                  largeTVsQty: 1,
                  largeTVsDetails: "",
                  purpleGreenMattress: false,
                  purpleGreenMattressDetails: "",
                  treadmills: false,
                  treadmillsDetails: "",
                  largeAppliances: false,
                  applianceFridge: false,
                  applianceFridgeQty: 1,
                  applianceWasher: false,
                  applianceWasherQty: 1,
                  applianceDryer: false,
                  applianceDryerQty: 1,
                  applianceOven: false,
                  applianceOvenQty: 1,
                  applianceDishwasher: false,
                  applianceDishwasherQty: 1,
                  applianceOtherDetails: "",
                  plants: false,
                  plantsDetails: "",
                  bunkBeds: false,
                  bunkBedsQty: 1,
                  bunkBedsDetails: "",
                  trampoline: false,
                  trampolineQty: 1,
                  trampolineDetails: "",
                  tableSaw: false,
                  tableSawQty: 1,
                  tableSawDetails: "",
                  gymEquipment: false,
                  gymEquipmentQty: 1,
                  gymEquipmentDetails: "",
                  sauna: false,
                  saunaQty: 1,
                  saunaDetails: "",
                  playsets: false,
                  playsetsQty: 1,
                  playsetsDetails: "",
                  specialDisassemblyOther: false,
                  specialDisassemblyOtherDetails: "",

                  // Pets
                  catsPresent: false,

                  // Packing (clear all)
                  packingStatus: "moderate",
                  needsPacking: false,
                  packingKitchen: false,
                  packingGarage: false,
                  packingAttic: false,
                  packingWardrobeBoxes: false,
                  packingFragileItems: false,
    packingBedrooms: false,
    packingNotes: "",
                  junkRemovalNeeded: false,
                  junkRemovalAmount: "",
                  junkRemovalDetails: "",

                  // Insurance
                  needsInsurance: false,
                  estimatedValue: "",

                  // Timing (clear)
                  walkThroughDate: "",
    walkThroughTime: "",
    walkThroughDuration: "1",
                  preferredDate: "",
    preferredTime: "",
    moveDuration: "3",
                  moveDateUnknown: false,
                  timeFlexible: false,
                  readyToSchedule: false,
                  timingNotes: "",
                  tags: [],

                  // Estimates
                  estimatedCrewSize: "2-3",
                  crewSizeNotes: "",

                  // Special Notes (clear)
                  specialRequests: "",
                  fixedBudgetRequested: false,
                  desiredBudget: "",

                  // House Quality Rating
                  houseQuality: 3,

                  // Tools Needed (clear all)
                  hd4Wheel: false,
                  airSled: false,
                  applianceDolly: false,
                  socketWrenches: false,
                  safeDolly: false,
                  toolCustom1: "",
                  toolCustom2: "",
                  toolCustom3: "",
                }));
                setDistanceData(null);
                setQuote({ baseRate: 0, items: [], total: 0 });
              }
            }}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Clear Job Details
          </button>
        </div>

        {/* Timing & Scheduling */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500">
          <h2 className="text-xl font-bold text-pink-900 mb-4">Timing & Scheduling</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Walk-Through Date
              </label>
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0 w-[105px] 2xl:w-[160px]">
                  <input
                    type="text"
                    readOnly
                    value={formData.walkThroughDate ? new Date(formData.walkThroughDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ''}
                    placeholder="mm/dd/yyyy"
                    onClick={() => router.push('/schedule?picker=walkthrough')}
                    className="bg-white px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full cursor-pointer"
                  />
                </div>
                <div className="relative flex-shrink-0 w-[105px] 2xl:w-[160px]">
                  <select
                    name="walkThroughTime"
                    value={formData.walkThroughTime}
                    onChange={handleInputChange}
                    className="bg-white px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  >
                    <option value="">--:-- --</option>
                    {Array.from({ length: 65 }, (_, i) => {
                      const hour = Math.floor(i / 4) + 6;
                      const minute = (i % 4) * 15;
                      if (hour > 22 || (hour === 22 && minute > 0)) return null;
                      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      const ampm = hour < 12 ? 'AM' : 'PM';
                      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      const label = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
                      return <option key={value} value={value}>{label}</option>;
                    }).filter(Boolean)}
                  </select>

                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <select
                  name="walkThroughDuration"
                  value={formData.walkThroughDuration}
                  onChange={handleInputChange}
                  className="bg-white px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}hr</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium"
                  onClick={async () => {
                    // Validate required fields
                    if (!formData.walkThroughDate) {
                      alert('Please select a walk-through date');
                      return;
                    }
                    if (!formData.walkThroughTime) {
                      alert('Please select a walk-through time');
                      return;
                    }
                    if (!formData.firstName || !formData.lastName) {
                      alert('Please enter customer first and last name');
                      return;
                    }
                    if (!phones[0]?.number) {
                      alert('Please enter a phone number');
                      return;
                    }
                    if (!emails[0]?.email) {
                      alert('Please enter an email address');
                      return;
                    }
                    
                    // Get the current home/business address based on customerHomeAddressType
                    const isPickup = formData.customerHomeAddressType === 'pickup';
                    const address = isPickup ? formData.pickupAddress : formData.deliveryAddress;
                    const city = isPickup ? formData.pickupCity : formData.deliveryCity;
                    const state = isPickup ? formData.pickupState : formData.deliveryState;
                    const zip = isPickup ? formData.pickupZip : formData.deliveryZip;
                    
                    if (!address && !city && !state && !zip) {
                      alert("Please enter the customer current home or business address");
                      return;
                    }
                    
                    const phone = phones[0]?.number || '';
                    const email = emails[0]?.email || '';
                    
                    try {
                      console.log('[Schedule WT] Tags being sent:', formData.tags);
                      const response = await fetch('/api/move-wt/schedule-walkthrough', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          walkThroughDate: formData.walkThroughDate,
                          walkThroughTime: formData.walkThroughTime,
                          walkThroughDuration: formData.walkThroughDuration || '1',
                          firstName: formData.firstName,
                          lastName: formData.lastName,
                          phone,
                          email,
                          address,
                          city,
                          state,
                          zip,
                          timingNotes: formData.timingNotes,
                          tags: formData.tags,
                        }),
                      });

                      const data = await response.json();

                      if (data.success) {
                        alert('Walk-through scheduled successfully in Workiz!');
                      } else {
                        alert('Failed to schedule: ' + (data.error || 'Unknown error'));
                      }
                    } catch (error) {
                      console.error('Schedule error:', error);
                      alert('Failed to schedule walk-through. Please try again.');
                    }
                  }}
                >
                  Schedule
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Move Date
              </label>
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0 w-[105px] 2xl:w-[160px]">
                  <input
                    type="text"
                    readOnly
                    value={formData.preferredDate ? new Date(formData.preferredDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : ''}
                    placeholder="mm/dd/yyyy"
                    onClick={() => router.push('/schedule?picker=moving')}
                    className="bg-white px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full cursor-pointer"
                  />
                </div>
                <div className="relative flex-shrink-0 w-[105px] 2xl:w-[160px]">
                  <select
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleInputChange}
                    className="bg-white px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  >
                    <option value="">--:-- --</option>
                    {Array.from({ length: 65 }, (_, i) => {
                      const hour = Math.floor(i / 4) + 6;
                      const minute = (i % 4) * 15;
                      if (hour > 22 || (hour === 22 && minute > 0)) return null;
                      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      const ampm = hour < 12 ? 'AM' : 'PM';
                      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      const label = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
                      return <option key={value} value={value}>{label}</option>;
                    }).filter(Boolean)}
                  </select>

                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <select
                  name="moveDuration"
                  value={formData.moveDuration}
                  onChange={handleInputChange}
                  className="bg-white px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}hr</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium"
                  onClick={async () => {
                    // Validate required fields
                    if (!formData.preferredDate) { alert('Please select a move date'); return; }
                    if (!formData.preferredTime) { alert('Please select a move time'); return; }
                    if (!formData.firstName || !formData.lastName) { alert('Please enter customer first and last name'); return; }
                    if (!phones[0]?.number) { alert('Please enter a phone number'); return; }
                    if (!emails[0]?.email) { alert('Please enter an email address'); return; }
                    if (!formData.pickupAddress) { alert('Please enter the pickup address'); return; }
                    const phone = phones[0]?.number || '';
                    const email = emails[0]?.email || '';
                    try {
                      console.log('[Schedule Move] Tags being sent:', formData.tags);
                      const response = await fetch('/api/move-wt/schedule-moving', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          moveDate: formData.preferredDate,
                          moveTime: formData.preferredTime,
                          moveDuration: formData.moveDuration || '4',
                          firstName: formData.firstName,
                          lastName: formData.lastName,
                          phone,
                          email,
                          pickupAddress: formData.pickupAddress,
                          pickupCity: formData.pickupCity,
                          pickupState: formData.pickupState,
                          pickupZip: formData.pickupZip,
                          deliveryAddress: formData.deliveryAddress,
                          deliveryCity: formData.deliveryCity,
                          deliveryState: formData.deliveryState,
                          deliveryZip: formData.deliveryZip,
                          timingNotes: formData.timingNotes,
                          tags: formData.tags,
                        }),
                      });
                      const data = await response.json();
                      if (data.success) { alert('Moving job scheduled successfully in Workiz!'); }
                      else { alert('Failed to schedule: ' + (data.error || 'Unknown error')); }
                    } catch (error) { console.error('Schedule error:', error); alert('Failed to schedule moving job. Please try again.'); }
                  }}
                >
                  Schedule
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="moveDateUnknown"
                checked={formData.moveDateUnknown}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Move date is unknown
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="timeFlexible"
                checked={formData.timeFlexible}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Move date is flexible
              </label>
            </div>

            {/* Job Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Tags
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
                {['Move', 'WT', 'Trk', 'Lbr', 'PM', 'RN', 'ET', 'OOT', 'Cat', '2', '3', '4', '5', '6+'].map(tag => {
                  // Determine color based on tag
                  let colorClasses = '';
                  if (['OOT', 'Cat', 'RN', 'ET'].includes(tag)) {
                    colorClasses = formData.tags.includes(tag)
                      ? 'bg-red-500 text-white border-red-600'
                      : 'border-red-300 text-red-700 hover:bg-red-50';
                  } else if (['2', '3', '4', '5', '6+'].includes(tag)) {
                    colorClasses = formData.tags.includes(tag)
                      ? 'bg-green-500 text-white border-green-600'
                      : 'border-green-300 text-green-700 hover:bg-green-50';
                  } else if (['Move', 'WT'].includes(tag)) {
                    colorClasses = formData.tags.includes(tag)
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'border-blue-300 text-blue-700 hover:bg-blue-50';
                  } else if (['Trk', 'Lbr'].includes(tag)) {
                    colorClasses = formData.tags.includes(tag)
                      ? 'bg-purple-500 text-white border-purple-600'
                      : 'border-purple-300 text-purple-700 hover:bg-purple-50';
                  } else if (tag === 'PM') {
                    colorClasses = formData.tags.includes(tag)
                      ? 'bg-yellow-400 text-gray-800 border-yellow-500'
                      : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50';
                  }

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagChange(tag)}
                      className={`px-3 py-1.5 rounded-md border-2 font-medium transition-all duration-200 ${colorClasses}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                name="timingNotes"
                value={formData.timingNotes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes about timing and scheduling"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

          </div>
        </section>

        {/* Service Type */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
          <h2 className="text-xl font-bold text-indigo-900 mb-4">Service Type</h2>

          <div className="flex gap-6">
            <div className="flex items-center">
              <input
                type="radio"
                id="serviceTruck"
                name="serviceType"
                value="truck"
                checked={formData.serviceType === "truck"}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="serviceTruck" className="ml-2 text-sm font-medium text-gray-700">
                Truck
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="radio"
                id="serviceLaborOnly"
                name="serviceType"
                value="labor-only"
                checked={formData.serviceType === "labor-only"}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="serviceLaborOnly" className="ml-2 text-sm font-medium text-gray-700">
                Labor Only
              </label>
            </div>

            <div className="flex items-center ml-auto">
              <input
                type="checkbox"
                id="waiveTravel"
                name="waiveTravel"
                checked={formData.waiveTravel}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="waiveTravel" className="ml-2 text-sm font-medium text-gray-700">
                Waive Travel
              </label>
            </div>
          </div>
        </section>

        {/* Customer Information */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-cyan-900">Customer Information</h2>
            <button
              type="button"
              onClick={handleFindCustomer}
              disabled={!formData.firstName.trim() || !formData.lastName.trim() || isLoadingJob}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingJob ? 'Searching...' : 'Find Customer'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Dynamic Phone Entries */}
            <div className="space-y-2">
              {phones.map((phone, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={phone.number}
                        onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={phone.name}
                        onChange={(e) => handlePhoneNameChange(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhone(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
                      title="Remove phone"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPhone}
                className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
              >
                +Phone
              </button>
            </div>

            {/* Dynamic Email Entries */}
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email.email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={email.name}
                        onChange={(e) => handleEmailNameChange(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
                      title="Remove email"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddEmail}
                className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
              >
                +Email
              </button>
            </div>
          </div>
        </section>

        {/* Addresses */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-slate-500">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Addresses</h2>

          <div className="space-y-6">
            {/* Start Address / Customer Address Section */}
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-6">
                  <h3 className="text-lg font-semibold text-blue-900">
                    {formData.serviceType === 'labor-only' ? 'Customer Address' : 'Start Address'}
                  </h3>
                  {formData.serviceType === 'labor-only' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.laborOnlySameAddress}
                        onChange={() => {
                          setFormData(prev => ({
                            ...prev,
                            laborOnlySameAddress: !prev.laborOnlySameAddress
                          }));
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Same as Service Address</span>
                    </label>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="customerHomeAddress"
                        checked={formData.customerHomeAddressType === "pickup"}
                        onChange={() => {
                          setFormData(prev => {
                            // If setting pickup as customer home and service type is truck, reset invalid delivery/additional stop locations
                            const invalidLocationTypes = ['pod', 'truck'];
                            const shouldResetLocations = prev.serviceType === 'truck';
                            return {
                              ...prev,
                              customerHomeAddressType: "pickup",
                              deliveryLocationType: shouldResetLocations && invalidLocationTypes.includes(prev.deliveryLocationType) ? "storage-unit" : prev.deliveryLocationType,
                              additionalStopLocationType: shouldResetLocations && invalidLocationTypes.includes(prev.additionalStopLocationType) ? "storage-unit" : prev.additionalStopLocationType
                            };
                          });
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Current Home or Business</span>
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleMakePictureFolder}
                  disabled={!formData.pickupAddress.trim() || isLoadingJob}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoadingJob ? 'Creating...' : 'Make Picture Folder'}
                </button>
              </div>
              <div className="space-y-2">
                {/* Property Type - Hidden for labor-only when Service Address is separate */}
                {!(formData.serviceType === 'labor-only' && !formData.laborOnlySameAddress) && (
                <select
                  name="pickupLocationType"
                  value={formData.pickupLocationType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {formData.serviceType === 'labor-only' && formData.laborOnlySameAddress ? (
                    <>
                      <option value="moving-between-rooms">Moving items between rooms</option>
                      <option value="loading-truck-pod">Loading a Truck or POD</option>
                      <option value="unloading-truck-pod">Unloading a Truck or POD</option>
                      <option value="business">Business</option>
                      <option value="other">Other</option>
                    </>
                  ) : formData.customerHomeAddressType === 'delivery' ? (
                    <>
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="storage-unit">Storage Unit</option>
                      <option value="business">Business</option>
                      <option value="other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      {formData.customerHomeAddressType !== 'pickup' && (
                        <option value="storage-unit">Storage Unit</option>
                      )}
                      {formData.serviceType !== 'truck' && (
                        <>
                          <option value="truck">Truck</option>
                          <option value="pod">POD</option>
                        </>
                      )}
                      <option value="business">Business</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
                )}

                {/* Manual Override for Labor Hours */}
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="checkbox"
                    id="pickupManualOverride"
                    name="pickupManualOverride"
                    checked={formData.pickupManualOverride}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="pickupManualOverride" className="text-sm font-medium text-gray-700">
                    Manual Override
                  </label>
                  {formData.pickupManualOverride && (
                    <input
                      type="number"
                      name="pickupManualOverrideHours"
                      value={formData.pickupManualOverrideHours}
                      onChange={handleInputChange}
                      placeholder="Hours"
                      step="0.5"
                      min="0"
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>

                {/* Business Name field */}
                {formData.pickupLocationType === 'business' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name
                      </label>
                      <input
                        type="text"
                        name="pickupBusinessName"
                        value={formData.pickupBusinessName}
                        onChange={handleInputChange}
                        placeholder="Enter business name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Square Feet
                      </label>
                      <input
                        type="text"
                        name="pickupBusinessSquareFeet"
                        value={formData.pickupBusinessSquareFeet}
                        onChange={handleInputChange}
                        placeholder="Enter square feet"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* How Much is Getting Moved Slider - Always visible for Start Address (hidden for labor-only when Service Address is separate, and for unloading-truck-pod) */}
                {!(formData.serviceType === 'labor-only' && !formData.laborOnlySameAddress) && formData.pickupLocationType !== 'unloading-truck-pod' && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      How much is getting moved?
                    </label>
                    <div className="flex items-center gap-4 bg-white p-3 rounded-md border border-gray-200">
                      <input
                        type="range"
                        name="pickupHowFurnished"
                        min="0"
                        max="100"
                        step="20"
                        value={formData.pickupHowFurnished}
                        onChange={handleInputChange}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-blue-700 min-w-[140px]">
                        {formData.pickupLocationType === 'storage-unit'
                          ? getStorageUnitSliderText(Number(formData.pickupHowFurnished))
                          : getHowFurnishedText(Number(formData.pickupHowFurnished))}
                      </span>
                    </div>
                  </div>
                )}

                {formData.pickupLocationType === 'storage-unit' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Quantity:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newQty = Math.max(1, formData.pickupStorageUnitQuantity - 1);
                          setFormData(prev => ({
                            ...prev,
                            pickupStorageUnitQuantity: newQty,
                            pickupStorageUnitSizes: prev.pickupStorageUnitSizes.slice(0, newQty),
                            pickupStorageUnitHowFull: prev.pickupStorageUnitHowFull.slice(0, newQty),
                            pickupStorageUnitConditioned: prev.pickupStorageUnitConditioned.slice(0, newQty)
                          }));
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-semibold">{formData.pickupStorageUnitQuantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            pickupStorageUnitQuantity: prev.pickupStorageUnitQuantity + 1,
                            pickupStorageUnitSizes: [...prev.pickupStorageUnitSizes, ""],
                            pickupStorageUnitHowFull: [...prev.pickupStorageUnitHowFull, ""],
                            pickupStorageUnitConditioned: [...prev.pickupStorageUnitConditioned, ""]
                          }));
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                      >
                        +
                      </button>
                    </div>
                    {Array.from({ length: formData.pickupStorageUnitQuantity }).map((_, index) => (
                      <div key={index} className="grid grid-cols-3 gap-2">
                        <select
                          value={formData.pickupStorageUnitSizes[index] || ""}
                          onChange={(e) => {
                            const newSizes = [...formData.pickupStorageUnitSizes];
                            newSizes[index] = e.target.value;
                            setFormData(prev => ({ ...prev, pickupStorageUnitSizes: newSizes }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Size</option>
                          <option value="<100sf">&lt;100sf</option>
                          <option value="100-200sf">100-200sf</option>
                          <option value="200-300sf">200-300sf</option>
                          <option value="300-400sf">300-400sf</option>
                          <option value="400+sf">400+sf</option>
                        </select>
                        <select
                          value={formData.pickupStorageUnitHowFull[index] || ""}
                          onChange={(e) => {
                            const newHowFull = [...formData.pickupStorageUnitHowFull];
                            newHowFull[index] = e.target.value;
                            setFormData(prev => ({ ...prev, pickupStorageUnitHowFull: newHowFull }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">How Full</option>
                          <option value="light">Light</option>
                          <option value="medium">Medium</option>
                          <option value="packed">Packed</option>
                        </select>
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 mb-1">Conditioned</span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`pickupStorageConditioned-${index}`}
                                checked={formData.pickupStorageUnitConditioned[index] === "yes"}
                                onChange={() => {
                                  const newConditioned = [...formData.pickupStorageUnitConditioned];
                                  newConditioned[index] = "yes";
                                  setFormData(prev => ({ ...prev, pickupStorageUnitConditioned: newConditioned }));
                                }}
                                className="w-3 h-3 text-blue-600"
                              />
                              <span className="text-xs">Yes</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`pickupStorageConditioned-${index}`}
                                checked={formData.pickupStorageUnitConditioned[index] === "no"}
                                onChange={() => {
                                  const newConditioned = [...formData.pickupStorageUnitConditioned];
                                  newConditioned[index] = "no";
                                  setFormData(prev => ({ ...prev, pickupStorageUnitConditioned: newConditioned }));
                                }}
                                className="w-3 h-3 text-blue-600"
                              />
                              <span className="text-xs">No</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formData.pickupLocationType === 'unloading-truck-pod' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Length (ft)
                        </label>
                        <input
                          type="text"
                          name="pickupTruckPodLength"
                          value={formData.pickupTruckPodLength}
                          onChange={handleInputChange}
                          placeholder="Length"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Width (ft)
                        </label>
                        <input
                          type="text"
                          name="pickupTruckPodWidth"
                          value={formData.pickupTruckPodWidth}
                          onChange={handleInputChange}
                          placeholder="Width"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How full is the truck/POD?
                      </label>
                      <div className="flex items-center gap-4 bg-white p-3 rounded-md border border-gray-200">
                        <input
                          type="range"
                          name="pickupTruckPodHowFull"
                          min="20"
                          max="100"
                          step="20"
                          value={formData.pickupTruckPodHowFull}
                          onChange={handleInputChange}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium text-blue-700 min-w-[60px]">
                          {formData.pickupTruckPodHowFull}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {formData.pickupLocationType === 'other' && (
                  <div className="space-y-2">
                    <div>
                      <input
                        type="text"
                        name="pickupLocationOther"
                        value={formData.pickupLocationOther}
                        onChange={handleInputChange}
                        placeholder="Specify Location Type"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Square Feet
                      </label>
                      <input
                        type="text"
                        name="pickupOtherSquareFeet"
                        value={formData.pickupOtherSquareFeet}
                        onChange={handleInputChange}
                        placeholder="Enter square feet"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      ref={pickupAddressRef}
                      type="text"
                      name="pickupAddress"
                      value={formData.pickupAddress}
                      onChange={handleInputChange}
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit/Apt #
                    </label>
                    <input
                      type="text"
                      name="pickupUnit"
                      value={formData.pickupUnit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="pickupCity"
                      value={formData.pickupCity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      name="pickupState"
                      value={formData.pickupState}
                      onChange={handleInputChange}
                      maxLength={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="pickupZip"
                    value={formData.pickupZip}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      setFormData(prev => ({ ...prev, pickupZip: numericValue }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {(formData.pickupLocationType === 'house' || formData.pickupLocationType === 'loading-truck-pod') && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="pickupHouseSquareFeet"
                      value={isLoadingPickupProperty ? '' : formatNumberWithCommas(formData.pickupHouseSquareFeet)}
                      onChange={handleInputChange}
                      placeholder={isLoadingPickupProperty ? "Loading..." : "Square Feet"}
                      disabled={isLoadingPickupProperty}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      name="pickupZestimate"
                      value={isLoadingPickupProperty ? '' : formatNumberWithCommas(formData.pickupZestimate)}
                      onChange={handleInputChange}
                      placeholder={isLoadingPickupProperty ? "Loading..." : "Value"}
                      disabled={isLoadingPickupProperty}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={fetchPickupPropertyData}
                      disabled={isLoadingPickupProperty}
                      className="px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title="Fetch property data from Zillow"
                    >
                      $
                    </button>
                  </div>
                )}

                {formData.pickupLocationType === 'apartment' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="pickupApartmentSquareFeet"
                      value={isLoadingPickupProperty ? '' : formatNumberWithCommas(formData.pickupApartmentSquareFeet)}
                      onChange={handleInputChange}
                      placeholder={isLoadingPickupProperty ? "Loading..." : "Square Feet"}
                      disabled={isLoadingPickupProperty}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1 flex gap-1 min-w-0">
                      <input
                        type="text"
                        name="pickupApartmentBedBath"
                        value={isLoadingPickupProperty ? '' : formData.pickupApartmentBedBath}
                        onChange={handleInputChange}
                        placeholder={isLoadingPickupProperty ? "Loading..." : "Bed/Bath"}
                        disabled={isLoadingPickupProperty}
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={fetchPickupPropertyData}
                        disabled={isLoadingPickupProperty}
                        className="px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Fetch property data from Zillow"
                      >
                        sf
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Service Address Section - Labor Only */}
            {formData.serviceType === 'labor-only' && !formData.laborOnlySameAddress && (
              <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-green-900">Service Address</h3>
                </div>
                <div className="space-y-2">
                  <select
                    name="deliveryLocationType"
                    value={formData.deliveryLocationType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="storage-to-truck">Storage Unit to Truck</option>
                    <option value="truck-to-storage">Truck to Storage Unit</option>
                    <option value="other">Other</option>
                  </select>

                  {/* Notes field for Service Address "Other" */}
                  {formData.deliveryLocationType === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        name="deliveryLocationOther"
                        value={formData.deliveryLocationOther}
                        onChange={handleInputChange}
                        placeholder="Describe the service location..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* How Much is Getting Moved Slider - For House (Service Address) - HIDDEN since options changed */}
                  {false && formData.deliveryLocationType === 'house' && (
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How much is getting moved?
                      </label>
                      <div className="flex items-center gap-4 bg-white p-3 rounded-md border border-gray-200">
                        <input
                          type="range"
                          name="pickupHowFurnished"
                          min="0"
                          max="100"
                          step="20"
                          value={formData.pickupHowFurnished}
                          onChange={handleInputChange}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium text-green-700 min-w-[140px]">
                          {getHowFurnishedText(Number(formData.pickupHowFurnished))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* How Much is Getting Moved Slider - For Apartment (Service Address) - HIDDEN since options changed */}
                  {false && formData.deliveryLocationType === 'apartment' && (
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How much is getting moved?
                      </label>
                      <div className="flex items-center gap-4 bg-white p-3 rounded-md border border-gray-200">
                        <input
                          type="range"
                          name="pickupApartmentHowFurnished"
                          min="0"
                          max="100"
                          step="20"
                          value={formData.pickupApartmentHowFurnished}
                          onChange={handleInputChange}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium text-green-700 min-w-[140px]">
                          {getHowFurnishedText(Number(formData.pickupApartmentHowFurnished)).replace('Whole house', 'Whole apartment')}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      <input
                        ref={deliveryAddressRef}
                        type="text"
                        name="deliveryAddress"
                        value={formData.deliveryAddress}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit/Apt #
                      </label>
                      <input
                        type="text"
                        name="deliveryUnit"
                        value={formData.deliveryUnit}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="deliveryCity"
                        value={formData.deliveryCity}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        name="deliveryState"
                        value={formData.deliveryState}
                        onChange={handleInputChange}
                        maxLength={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      name="deliveryZip"
                      value={formData.deliveryZip}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, deliveryZip: numericValue }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Stop Section */}
            {formData.serviceType !== 'labor-only' && (
            <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  name="hasAdditionalStop"
                  checked={formData.hasAdditionalStop}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-lg font-semibold text-purple-900">
                  Additional Stop
                </label>
              </div>

              {formData.hasAdditionalStop && (
                <div className="space-y-2">
                  <select
                    name="additionalStopLocationType"
                    value={formData.additionalStopLocationType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="storage-unit">Storage Unit</option>
                    {formData.serviceType !== 'truck' && (
                      <>
                        <option value="truck">Truck</option>
                        <option value="pod">POD</option>
                      </>
                    )}
                    <option value="business">Business</option>
                      <option value="other">Other</option>
                  </select>

                  {/* Business Name field */}
                  {formData.additionalStopLocationType === 'business' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name
                      </label>
                      <input
                        type="text"
                        name="additionalStopBusinessName"
                        value={formData.additionalStopBusinessName}
                        onChange={handleInputChange}
                        placeholder="Enter business name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {formData.additionalStopLocationType === 'apartment' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        name="additionalStopApartmentBedBath"
                        value={formData.additionalStopApartmentBedBath}
                        onChange={handleInputChange}
                        placeholder="Bed/Bath"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* How Much is Getting Added or Dropped Off Slider - Only for House */}
                  {formData.additionalStopLocationType === 'house' && (
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How much is getting added or dropped off?
                      </label>
                      <div className="flex items-center gap-4 bg-white p-3 rounded-md border border-gray-200">
                        <input
                          type="range"
                          name="additionalStopHowFurnished"
                          min="0"
                          max="100"
                          step="20"
                          value={formData.additionalStopHowFurnished}
                          onChange={handleInputChange}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium text-purple-700 min-w-[140px]">
                          {getAdditionalStopText(Number(formData.additionalStopHowFurnished))}
                        </span>
                      </div>
                    </div>
                  )}

                  {formData.additionalStopLocationType === 'storage-unit' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Quantity:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = Math.max(1, formData.additionalStopStorageUnitQuantity - 1);
                            setFormData(prev => ({
                              ...prev,
                              additionalStopStorageUnitQuantity: newQty,
                              additionalStopStorageUnitSizes: prev.additionalStopStorageUnitSizes.slice(0, newQty),
                              additionalStopStorageUnitConditioned: prev.additionalStopStorageUnitConditioned.slice(0, newQty)
                            }));
                          }}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-semibold">{formData.additionalStopStorageUnitQuantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              additionalStopStorageUnitQuantity: prev.additionalStopStorageUnitQuantity + 1,
                              additionalStopStorageUnitSizes: [...prev.additionalStopStorageUnitSizes, ""],
                              additionalStopStorageUnitConditioned: [...prev.additionalStopStorageUnitConditioned, ""]
                            }));
                          }}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                        >
                          +
                        </button>
                      </div>
                      {Array.from({ length: formData.additionalStopStorageUnitQuantity }).map((_, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={formData.additionalStopStorageUnitSizes[index] || ""}
                            onChange={(e) => {
                              const newSizes = [...formData.additionalStopStorageUnitSizes];
                              newSizes[index] = e.target.value;
                              setFormData(prev => ({ ...prev, additionalStopStorageUnitSizes: newSizes }));
                            }}
                            placeholder={`Unit ${index + 1} Size`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 mb-1">Conditioned</span>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`additionalStopStorageConditioned-${index}`}
                                  checked={formData.additionalStopStorageUnitConditioned[index] === "yes"}
                                  onChange={() => {
                                    const newConditioned = [...formData.additionalStopStorageUnitConditioned];
                                    newConditioned[index] = "yes";
                                    setFormData(prev => ({ ...prev, additionalStopStorageUnitConditioned: newConditioned }));
                                  }}
                                  className="w-3 h-3 text-purple-600"
                                />
                                <span className="text-xs">Yes</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`additionalStopStorageConditioned-${index}`}
                                  checked={formData.additionalStopStorageUnitConditioned[index] === "no"}
                                  onChange={() => {
                                    const newConditioned = [...formData.additionalStopStorageUnitConditioned];
                                    newConditioned[index] = "no";
                                    setFormData(prev => ({ ...prev, additionalStopStorageUnitConditioned: newConditioned }));
                                  }}
                                  className="w-3 h-3 text-purple-600"
                                />
                                <span className="text-xs">No</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.additionalStopLocationType === 'other' && (
                    <div>
                      <input
                        type="text"
                        name="additionalStopLocationOther"
                        value={formData.additionalStopLocationOther}
                        onChange={handleInputChange}
                        placeholder="Specify Location Type"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      <input
                        ref={additionalStopAddressRef}
                        type="text"
                        name="additionalStopAddress"
                        value={formData.additionalStopAddress}
                        onChange={handleInputChange}
                        autoComplete="off"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit/Apt #
                      </label>
                      <input
                        type="text"
                        name="additionalStopUnit"
                        value={formData.additionalStopUnit}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="additionalStopCity"
                        value={formData.additionalStopCity}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        name="additionalStopState"
                        value={formData.additionalStopState}
                        onChange={handleInputChange}
                        maxLength={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      name="additionalStopZip"
                      value={formData.additionalStopZip}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, '');
                        setFormData(prev => ({ ...prev, additionalStopZip: numericValue }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="additionalStopNotes"
                      value={formData.additionalStopNotes}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Delivery Address Section */}
            {formData.serviceType !== 'labor-only' && (
            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-semibold text-green-900">Delivery Address</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customerHomeAddress"
                    checked={formData.customerHomeAddressType === "delivery"}
                    disabled={formData.deliveryAddressUnknown}
                    onChange={() => {
                      setFormData(prev => {
                        // If setting delivery as customer home, reset pickup location to valid option (house, apartment, other)
                        const invalidPickupTypes = ['storage-unit', 'truck', 'pod'];
                        const needsReset = invalidPickupTypes.includes(prev.pickupLocationType);
                        return {
                          ...prev,
                          customerHomeAddressType: "delivery",
                          pickupLocationType: needsReset ? "house" : prev.pickupLocationType
                        };
                      });
                    }}
                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm ${formData.deliveryAddressUnknown ? 'text-gray-400' : 'text-gray-600'}`}>Current Home or Business</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="deliveryAddressUnknown"
                    checked={formData.deliveryAddressUnknown}
                    disabled={formData.customerHomeAddressType === "delivery"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Clear all delivery address fields when Unknown is checked
                        setFormData(prev => ({
                          ...prev,
                          deliveryAddressUnknown: true,
                          deliveryAddress: "",
                          deliveryUnit: "",
                          deliveryCity: "",
                          deliveryState: "",
                          deliveryZip: "",
                          deliveryLocationType: "house",
                          deliveryLocationOther: "",
                          deliveryHouseSquareFeet: "",
                          deliveryZestimate: "",
                          deliveryHowFurnished: 80,
                          deliveryApartmentSquareFeet: "",
                          deliveryApartmentBedBath: "",
                          deliveryApartmentHowFurnished: 80,
                          deliveryStorageUnitQuantity: 1,
                          deliveryStorageUnitSizes: [""],
    deliveryStorageUnitConditioned: [""],
                          deliveryPODQuantity: 1,
                          deliveryPODSize: "",
                          deliveryTruckLength: "",
                          deliveryStairs: 1,
                          deliveryNarrowDoorways: false,
                          deliveryElevator: false,
                          deliveryParkingDistance: "close",
                          deliveryAccessNotes: ""
                        }));
                      } else {
                        setFormData(prev => ({ ...prev, deliveryAddressUnknown: false }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm ${formData.customerHomeAddressType === "delivery" ? 'text-gray-400' : 'text-gray-700'}`}>Unknown</span>
                </label>
              </div>
              <div className="space-y-2">
                <select
                  name="deliveryLocationType"
                  value={formData.deliveryLocationType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  {formData.customerHomeAddressType !== 'delivery' && (
                    <option value="storage-unit">Storage Unit</option>
                  )}
                  {formData.serviceType !== 'truck' && (
                    <>
                      <option value="pod">POD</option>
                      <option value="truck">Truck</option>
                    </>
                  )}
                  <option value="business">Business</option>
                      <option value="other">Other</option>
                </select>

                {/* Business Name field */}
                {formData.deliveryLocationType === 'business' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      name="deliveryBusinessName"
                      value={formData.deliveryBusinessName}
                      onChange={handleInputChange}
                      placeholder="Enter business name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {formData.deliveryLocationType === 'truck' && (
                  <input
                    type="text"
                    name="deliveryTruckLength"
                    value={formData.deliveryTruckLength}
                    onChange={handleInputChange}
                    placeholder="Truck Length (ft)"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}

                {formData.deliveryLocationType === 'storage-unit' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Quantity:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newQty = Math.max(1, formData.deliveryStorageUnitQuantity - 1);
                          setFormData(prev => ({
                            ...prev,
                            deliveryStorageUnitQuantity: newQty,
                            deliveryStorageUnitSizes: prev.deliveryStorageUnitSizes.slice(0, newQty),
                            deliveryStorageUnitConditioned: prev.deliveryStorageUnitConditioned.slice(0, newQty)
                          }));
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-semibold">{formData.deliveryStorageUnitQuantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            deliveryStorageUnitQuantity: prev.deliveryStorageUnitQuantity + 1,
                            deliveryStorageUnitSizes: [...prev.deliveryStorageUnitSizes, ""],
                            deliveryStorageUnitConditioned: [...prev.deliveryStorageUnitConditioned, ""]
                          }));
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                      >
                        +
                      </button>
                    </div>
                    {Array.from({ length: formData.deliveryStorageUnitQuantity }).map((_, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={formData.deliveryStorageUnitSizes[index] || ""}
                          onChange={(e) => {
                            const newSizes = [...formData.deliveryStorageUnitSizes];
                            newSizes[index] = e.target.value;
                            setFormData(prev => ({ ...prev, deliveryStorageUnitSizes: newSizes }));
                          }}
                          placeholder={`Unit ${index + 1} Size`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 mb-1">Conditioned</span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`deliveryStorageConditioned-${index}`}
                                checked={formData.deliveryStorageUnitConditioned[index] === "yes"}
                                onChange={() => {
                                  const newConditioned = [...formData.deliveryStorageUnitConditioned];
                                  newConditioned[index] = "yes";
                                  setFormData(prev => ({ ...prev, deliveryStorageUnitConditioned: newConditioned }));
                                }}
                                className="w-3 h-3 text-green-600"
                              />
                              <span className="text-xs">Yes</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`deliveryStorageConditioned-${index}`}
                                checked={formData.deliveryStorageUnitConditioned[index] === "no"}
                                onChange={() => {
                                  const newConditioned = [...formData.deliveryStorageUnitConditioned];
                                  newConditioned[index] = "no";
                                  setFormData(prev => ({ ...prev, deliveryStorageUnitConditioned: newConditioned }));
                                }}
                                className="w-3 h-3 text-green-600"
                              />
                              <span className="text-xs">No</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formData.deliveryLocationType === 'pod' && (
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 w-1/2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          deliveryPODQuantity: Math.max(1, prev.deliveryPODQuantity - 1)
                        }))}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        name="deliveryPODQuantity"
                        value={formData.deliveryPODQuantity}
                        onChange={handleInputChange}
                        min="1"
                        placeholder="Qty"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          deliveryPODQuantity: prev.deliveryPODQuantity + 1
                        }))}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                      >
                        +
                      </button>
                    </div>
                    <input
                      type="text"
                      name="deliveryPODSize"
                      value={formData.deliveryPODSize}
                      onChange={handleInputChange}
                      placeholder="POD Size"
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {formData.deliveryLocationType === 'other' && (
                  <div>
                    <input
                      type="text"
                      name="deliveryLocationOther"
                      value={formData.deliveryLocationOther}
                      onChange={handleInputChange}
                      placeholder="Specify Location Type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {!formData.deliveryAddressUnknown && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Street Address
                        </label>
                        <input
                          ref={deliveryAddressRef}
                          type="text"
                          name="deliveryAddress"
                          value={formData.deliveryAddress}
                          onChange={handleInputChange}
                          autoComplete="off"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit/Apt #
                        </label>
                        <input
                          type="text"
                          name="deliveryUnit"
                          value={formData.deliveryUnit}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          name="deliveryCity"
                          value={formData.deliveryCity}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          name="deliveryState"
                          value={formData.deliveryState}
                          onChange={handleInputChange}
                          maxLength={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="deliveryZip"
                        value={formData.deliveryZip}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/\D/g, '');
                          setFormData(prev => ({ ...prev, deliveryZip: numericValue }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {formData.deliveryLocationType === 'house' && formData.customerHomeAddressType === 'delivery' && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="deliveryHouseSquareFeet"
                          value={isLoadingDeliveryProperty ? '' : formatNumberWithCommas(formData.deliveryHouseSquareFeet)}
                          onChange={handleInputChange}
                          placeholder={isLoadingDeliveryProperty ? "Loading..." : "Square Feet"}
                          disabled={isLoadingDeliveryProperty}
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <input
                          type="text"
                          name="deliveryZestimate"
                          value={isLoadingDeliveryProperty ? '' : formatNumberWithCommas(formData.deliveryZestimate)}
                          onChange={handleInputChange}
                          placeholder={isLoadingDeliveryProperty ? "Loading..." : "Value"}
                          disabled={isLoadingDeliveryProperty}
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={fetchDeliveryPropertyData}
                          disabled={isLoadingDeliveryProperty}
                          className="px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          title="Fetch property data from Zillow"
                        >
                          $
                        </button>
                      </div>
                    )}

                    {formData.deliveryLocationType === 'apartment' && formData.customerHomeAddressType === 'delivery' && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="deliveryApartmentSquareFeet"
                          value={isLoadingDeliveryProperty ? '' : formatNumberWithCommas(formData.deliveryApartmentSquareFeet)}
                          onChange={handleInputChange}
                          placeholder={isLoadingDeliveryProperty ? "Loading..." : "Square Feet"}
                          disabled={isLoadingDeliveryProperty}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1 flex gap-1 min-w-0">
                          <input
                            type="text"
                            name="deliveryApartmentBedBath"
                            value={isLoadingDeliveryProperty ? '' : formData.deliveryApartmentBedBath}
                            onChange={handleInputChange}
                            placeholder={isLoadingDeliveryProperty ? "Loading..." : "Bed/Bath"}
                            disabled={isLoadingDeliveryProperty}
                            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={fetchDeliveryPropertyData}
                            disabled={isLoadingDeliveryProperty}
                            className="px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title="Fetch property data from Zillow"
                          >
                            sf
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            )}
          </div>
        </section>

        {/* Pickup Location Access */}
        {formData.serviceType !== 'labor-only' && formData.pickupLocationType !== 'storage-unit' && (
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
          <h2 className="text-xl font-bold text-amber-900 mb-4">Pickup Location Access</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Levels
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    pickupStairs: Math.max(1, prev.pickupStairs - 1)
                  }))}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                >
                  -
                </button>
                <span className="w-12 text-center font-semibold">{formData.pickupStairs}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    pickupStairs: prev.pickupStairs + 1
                  }))}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="pickupNarrowDoorways"
                checked={formData.pickupNarrowDoorways}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Narrow Doorways/Tight Spaces
              </label>
            </div>

            {formData.pickupStairs > 1 && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="pickupElevator"
                  checked={formData.pickupElevator}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Elevator Available
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parking to Door Distance
              </label>
              <select
                name="pickupParkingDistance"
                value={formData.pickupParkingDistance}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="close">Close (0-50 ft)</option>
                <option value="medium">Medium (50-150 ft)</option>
                <option value="long">Long (150+ ft)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Notes (gates, codes, restrictions)
              </label>
              <textarea
                name="pickupAccessNotes"
                value={formData.pickupAccessNotes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>
        )}

        {/* Delivery Location Access */}
        {formData.serviceType !== 'labor-only' && (
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-lime-500">
          <h2 className="text-xl font-bold text-lime-900 mb-4">Delivery Location Access</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Levels
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    deliveryStairs: Math.max(1, prev.deliveryStairs - 1)
                  }))}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                >
                  -
                </button>
                <span className="w-12 text-center font-semibold">{formData.deliveryStairs}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    deliveryStairs: prev.deliveryStairs + 1
                  }))}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="deliveryNarrowDoorways"
                checked={formData.deliveryNarrowDoorways}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Narrow Doorways/Tight Spaces
              </label>
            </div>

            {formData.deliveryStairs > 1 && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="deliveryElevator"
                  checked={formData.deliveryElevator}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Elevator Available
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parking to Door Distance
              </label>
              <select
                name="deliveryParkingDistance"
                value={formData.deliveryParkingDistance}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="close">Close (0-50 ft)</option>
                <option value="medium">Medium (50-150 ft)</option>
                <option value="long">Long (150+ ft)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Notes (gates, codes, restrictions)
              </label>
              <textarea
                name="deliveryAccessNotes"
                value={formData.deliveryAccessNotes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>
        )}

        {/* Heavy/Special Items */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-rose-500">
          <h2 className="text-xl font-bold text-rose-900 mb-4">Heavy/Special Items</h2>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="gunSafes"
                checked={formData.gunSafes}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Gun Safe (over 300 pounds)
              </label>
            </div>

            {formData.gunSafes && (
              <div className="ml-6 text-xs text-red-600 italic">
                *Must be on ground level with no more than 2 steps
              </div>
            )}

            {formData.gunSafes && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      gunSafesQty: Math.max(1, prev.gunSafesQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.gunSafesQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      gunSafesQty: prev.gunSafesQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="gunSafesDetails"
                  value={formData.gunSafesDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="pianos"
                checked={formData.pianos}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Piano
              </label>
            </div>

            {formData.pianos && (
              <div className="ml-6 text-xs text-red-600 italic">
                *Must be on ground level with no more than 2 steps
              </div>
            )}

            {formData.pianos && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      pianosQty: Math.max(1, prev.pianosQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.pianosQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      pianosQty: prev.pianosQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="pianosDetails"
                  value={formData.pianosDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="poolTables"
                checked={formData.poolTables}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Pool Table
              </label>
            </div>

            {formData.poolTables && (
              <div className="ml-6 text-xs text-red-600 italic">
                *Must be on ground level with no more than 2 steps
              </div>
            )}

            {formData.poolTables && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      poolTablesQty: Math.max(1, prev.poolTablesQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.poolTablesQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      poolTablesQty: prev.poolTablesQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="poolTablesDetails"
                  value={formData.poolTablesDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="purpleGreenMattress"
                checked={formData.purpleGreenMattress}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Purple/Green Mattress
              </label>
            </div>

            {formData.purpleGreenMattress && (
              <div className="ml-6">
                <input
                  type="text"
                  name="purpleGreenMattressDetails"
                  value={formData.purpleGreenMattressDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="largeTVs"
                checked={formData.largeTVs}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Large TVs 45"+
              </label>
            </div>

            {formData.largeTVs && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      largeTVsQty: Math.max(1, prev.largeTVsQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.largeTVsQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      largeTVsQty: prev.largeTVsQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="largeTVsDetails"
                  value={formData.largeTVsDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="treadmills"
                checked={formData.treadmills}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Treadmills/Exercise Equipment
              </label>
            </div>

            {formData.treadmills && (
              <div className="ml-6 text-xs text-red-600 italic">
                *Treadmills cannot be disassembled
              </div>
            )}

            {formData.treadmills && (
              <div className="ml-6">
                <input
                  type="text"
                  name="treadmillsDetails"
                  value={formData.treadmillsDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="largeAppliances"
                checked={formData.largeAppliances}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Large Appliances
              </label>
            </div>

            {formData.largeAppliances && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="applianceFridge"
                    checked={formData.applianceFridge}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">
                    Fridge
                  </label>
                  {formData.applianceFridge && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceFridgeQty: Math.max(1, prev.applianceFridgeQty - 1)
                        }))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{formData.applianceFridgeQty}</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceFridgeQty: prev.applianceFridgeQty + 1
                        }))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {formData.applianceFridge && (
                  <div className="ml-6 text-xs text-red-600 italic">
                    *Fridge doors cannot be fully removed to fit through narrow spaces
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="applianceWasher"
                    checked={formData.applianceWasher}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">
                    Clothes Washer
                  </label>
                  {formData.applianceWasher && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceWasherQty: Math.max(1, prev.applianceWasherQty - 1)
                        }))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{formData.applianceWasherQty}</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceWasherQty: prev.applianceWasherQty + 1
                        }))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="applianceDryer"
                    checked={formData.applianceDryer}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">
                    Clothes Dryer
                  </label>
                  {formData.applianceDryer && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceDryerQty: Math.max(1, prev.applianceDryerQty - 1)
                        }))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{formData.applianceDryerQty}</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceDryerQty: prev.applianceDryerQty + 1
                        }))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="applianceOven"
                    checked={formData.applianceOven}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">
                    Oven
                  </label>
                  {formData.applianceOven && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceOvenQty: Math.max(1, prev.applianceOvenQty - 1)
                        }))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{formData.applianceOvenQty}</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceOvenQty: prev.applianceOvenQty + 1
                        }))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Details
                  </label>
                  <input
                    type="text"
                    name="applianceOtherDetails"
                    value={formData.applianceOtherDetails}
                    onChange={handleInputChange}
                    placeholder="Other appliance details"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="plants"
                checked={formData.plants}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Plants
              </label>
            </div>

            {formData.plants && (
              <div className="ml-6">
                <input
                  type="text"
                  name="plantsDetails"
                  value={formData.plantsDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="tableSaw"
                checked={formData.tableSaw}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Table Saw / Heavy Tools
              </label>
            </div>

            {formData.tableSaw && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      tableSawQty: Math.max(1, prev.tableSawQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.tableSawQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      tableSawQty: prev.tableSawQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="tableSawDetails"
                  value={formData.tableSawDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="otherHeavyItems"
                checked={formData.otherHeavyItems}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Other Heavy Items
              </label>
            </div>

            {formData.otherHeavyItems && (
              <div className="ml-6">
                <input
                  type="text"
                  name="otherHeavyItemsDetails"
                  value={formData.otherHeavyItemsDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </section>

        {/* Special Disassembly */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <h2 className="text-xl font-bold text-orange-900 mb-4">Special Disassembly</h2>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="trampoline"
                checked={formData.trampoline}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Trampoline
              </label>
            </div>

            {formData.trampoline && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      trampolineQty: Math.max(1, prev.trampolineQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.trampolineQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      trampolineQty: prev.trampolineQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="trampolineDetails"
                  value={formData.trampolineDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="bunkBeds"
                checked={formData.bunkBeds}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Bunk Beds
              </label>
            </div>

            {formData.bunkBeds && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      bunkBedsQty: Math.max(1, prev.bunkBedsQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.bunkBedsQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      bunkBedsQty: prev.bunkBedsQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="bunkBedsDetails"
                  value={formData.bunkBedsDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="gymEquipment"
                checked={formData.gymEquipment}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Gym Equipment
              </label>
            </div>

            {formData.gymEquipment && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      gymEquipmentQty: Math.max(1, prev.gymEquipmentQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.gymEquipmentQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      gymEquipmentQty: prev.gymEquipmentQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="gymEquipmentDetails"
                  value={formData.gymEquipmentDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="sauna"
                checked={formData.sauna}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Sauna
              </label>
            </div>

            {formData.sauna && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      saunaQty: Math.max(1, prev.saunaQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.saunaQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      saunaQty: prev.saunaQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="saunaDetails"
                  value={formData.saunaDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="playsets"
                checked={formData.playsets}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Playset
              </label>
            </div>

            {formData.playsets && (
              <div className="ml-6 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      playsetsQty: Math.max(1, prev.playsetsQty - 1)
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{formData.playsetsQty}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      playsetsQty: prev.playsetsQty + 1
                    }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="playsetsDetails"
                  value={formData.playsetsDetails}
                  onChange={handleInputChange}
                  placeholder="Details"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="specialDisassemblyOther"
                checked={formData.specialDisassemblyOther}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Other
              </label>
            </div>

            {formData.specialDisassemblyOther && (
              <div className="ml-6">
                <input
                  type="text"
                  name="specialDisassemblyOtherDetails"
                  value={formData.specialDisassemblyOtherDetails}
                  onChange={handleInputChange}
                  placeholder="Describe other special disassembly items"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </section>

        {/* Pets */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <h2 className="text-xl font-bold text-yellow-900 mb-4">Pets</h2>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="catsPresent"
              checked={formData.catsPresent}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Cats Present
            </label>
          </div>
        </section>

        {/* Other Services */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-teal-500">
          <h2 className="text-xl font-bold text-teal-900 mb-4">Other Services</h2>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="needsPacking"
                checked={formData.needsPacking}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Customer Needs Packing Services
              </label>
            </div>

            {formData.needsPacking && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Packing Needs (boxes)
                  </label>
                  <select
                    name="packingStatus"
                    value={formData.packingStatus}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="a few">A Few</option>
                    <option value="moderate">Moderate</option>
                    <option value="quite a bit">Quite a Bit</option>
                    <option value="lots">Everything!</option>
                  </select>
                </div>

                <div className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    name="packingKitchen"
                    checked={formData.packingKitchen}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Kitchen
                  </label>
                </div>

                <div className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    name="packingGarage"
                    checked={formData.packingGarage}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Garage/Shop (Heavy Items)
                  </label>
                </div>

                <div className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    name="packingAttic"
                    checked={formData.packingAttic}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Attic
                  </label>
                </div>

                <div className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    name="packingBedrooms"
                    checked={formData.packingBedrooms}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Bedrooms
                  </label>
                </div>

                <div className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    name="packingWardrobeBoxes"
                    checked={formData.packingWardrobeBoxes}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Wardrobe Boxes
                  </label>
                </div>

                <div className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    name="packingFragileItems"
                    checked={formData.packingFragileItems}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Lots of Fragile Items
                  </label>
                </div>

                <div className="mt-3 ml-6">
                  <label className="block text-sm text-gray-700 mb-1">
                    Packing Notes
                  </label>
                  <textarea
                    name="packingNotes"
                    value={formData.packingNotes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Additional packing details..."
                  />
                </div>
              </>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="junkRemovalNeeded"
                checked={formData.junkRemovalNeeded}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Junk Removal Needed
              </label>
            </div>

            {formData.junkRemovalNeeded && (
              <div className="ml-6 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Amount
                  </label>
                  <select
                    name="junkRemovalAmount"
                    value={formData.junkRemovalAmount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select amount</option>
                    <option value="up to 1/4">up to 1/4</option>
                    <option value="1/4-1/2">1/4-1/2</option>
                    <option value="1/2-3/4">1/2-3/4</option>
                    <option value="3/4-full">3/4-full</option>
                    <option value="full+">full+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details
                  </label>
                  <input
                    type="text"
                    name="junkRemovalDetails"
                    value={formData.junkRemovalDetails}
                    onChange={handleInputChange}
                    placeholder="Describe items to be removed"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recommended Crew Size */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-violet-500">
          <h2 className="text-xl font-bold text-violet-900 mb-4">Recommended Crew Size</h2>

          <div className="space-y-3">
            <div>
              <select
                name="estimatedCrewSize"
                value={formData.estimatedCrewSize}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="2 max">2 max</option>
                <option value="2-3">2-3</option>
                <option value="3-4">3-4</option>
                <option value="4-6">4-6</option>
                <option value="6+">6+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                name="crewSizeNotes"
                value={formData.crewSizeNotes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes about crew size requirements"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Special Requests/Notes */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-fuchsia-500">
          <h2 className="text-xl font-bold text-fuchsia-900 mb-4">Special Requests & Notes</h2>

          <div className="space-y-4">
            {/* Fixed Budget Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="fixedBudgetRequested"
                name="fixedBudgetRequested"
                checked={formData.fixedBudgetRequested}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="fixedBudgetRequested" className="ml-2 text-sm font-medium text-gray-700">
                Fixed Budget Requested
              </label>
            </div>

            {/* Budget Input Field */}
            {formData.fixedBudgetRequested && (
              <div>
                <label htmlFor="desiredBudget" className="block text-sm font-medium text-gray-700 mb-1">
                  Desired Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="desiredBudget"
                    name="desiredBudget"
                    value={formData.desiredBudget}
                    onChange={handleInputChange}
                    placeholder="Enter budget amount"
                    min="0"
                    step="1"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Budget Crew Options */}
                {budgetCrewOptions && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    {budgetCrewOptions.viable ? (
                      <div>
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Budget Breakdown:
                          </p>
                          <p className="text-sm text-gray-600">
                            Desired Budget: <span className="font-semibold">${budgetCrewOptions.desiredBudget?.toLocaleString() || '0'}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Fixed Costs (Travel, Packing, Stairs, etc.): <span className="font-semibold">${Math.round(budgetCrewOptions.fixedCosts || 0).toLocaleString()}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Available for Moving Labor: <span className="font-semibold text-green-600">${Math.round(budgetCrewOptions.movingLaborBudget || 0).toLocaleString()}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Moving Materials (5%): <span className="font-semibold">${Math.round(budgetCrewOptions.movingMaterialsBudget || 0).toLocaleString()}</span>
                          </p>
                        </div>

                        {/* Display crew options (non-selectable) */}
                        {budgetCrewOptions.options && budgetCrewOptions.options.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Possible Crew Configurations:
                            </p>
                            <div className="space-y-2">
                              {budgetCrewOptions.options.map((option, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-white border border-gray-200 rounded-md opacity-75 cursor-not-allowed"
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="text-sm">
                                      <span className="font-semibold text-gray-800">
                                        {option.crewSize} {option.crewSize === 1 ? 'Mover' : 'Movers'}
                                      </span>
                                      <span className="text-gray-600"> × </span>
                                      <span className="font-semibold text-gray-800">
                                        {option.hours.toFixed(1)} {option.hours === 1 ? 'Hour' : 'Hours'}
                                      </span>
                                      <span className="text-gray-500 text-xs ml-2">
                                        ({option.totalHours.toFixed(1)} total hours)
                                      </span>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-700">
                                      ${Math.round(option.totalCost).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-sm text-gray-700 italic mt-3">
                          Crew configuration will be determined based on availability
                        </p>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-red-600 font-semibold">
                          {budgetCrewOptions.message}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                rows={4}
                placeholder="Any other important information..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Tools Needed */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
          <h2 className="text-xl font-bold text-emerald-900 mb-4">Tools Needed</h2>

          <div className="space-y-3">
            {/* Predefined Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="hd4Wheel"
                  checked={formData.hd4Wheel}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  HD 4-Wheel
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="airSled"
                  checked={formData.airSled}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Air Sled
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="applianceDolly"
                  checked={formData.applianceDolly}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Appliance Dolly
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="socketWrenches"
                  checked={formData.socketWrenches}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Socket Wrenches
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="safeDolly"
                  checked={formData.safeDolly}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Safe Dolly
                </label>
              </div>
            </div>

            {/* Custom Tool Fields */}
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Additional Tools
              </label>
              <input
                type="text"
                name="toolCustom1"
                value={formData.toolCustom1}
                onChange={handleInputChange}
                placeholder="Other tool needed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                name="toolCustom2"
                value={formData.toolCustom2}
                onChange={handleInputChange}
                placeholder="Other tool needed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                name="toolCustom3"
                value={formData.toolCustom3}
                onChange={handleInputChange}
                placeholder="Other tool needed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Quote Display */}
        {quote && quote.total > 0 && (
          <section id="quote-section" className={`rounded-lg shadow-lg p-6 border-2 ${
            isBudgetInsufficient
              ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
              : 'bg-gradient-to-br from-green-50 to-blue-50 border-green-300'
          }`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Moving Estimate
            </h2>

            {/* Move Date Display */}
            {formData.preferredDate && (
              <div className="text-sm text-gray-700 mb-4">
                {formData.moveDateUnknown ? (
                  <span className="font-medium">Move Date Unknown</span>
                ) : (
                  <span className="font-medium">
                    Move date {new Date(formData.preferredDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                    {formData.timeFlexible && ' (flexible)'}
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2 mb-4">
              {quote.items.map((item, index) => {
                // Split description to make parenthetical text italic
                const descParts = item.description.match(/^(.+?)(\s*\([^)]+\))?$/);
                const mainDesc = descParts?.[1] || item.description;
                const italicDesc = descParts?.[2]?.trim();

                return (
                  <div key={index}>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-700 font-medium">
                        {mainDesc}
                        {italicDesc && <span className="italic text-gray-600"> {italicDesc}</span>}
                      </span>
                      <span className="font-semibold text-gray-900">${Math.round(item.amount).toLocaleString()}</span>
                    </div>
                    {item.discount && (
                      <div className="pl-6 py-0.5">
                        <span className="text-xs italic text-gray-500">{item.discount}</span>
                      </div>
                    )}
                    {item.subItems && item.subItems.map((subItem, subIndex) => (
                      <div key={`${index}-${subIndex}`} className="py-1 pl-6 text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-gray-600">
                              {subItem.alert && <span className="text-red-600 font-bold">* </span>}
                              {subItem.description}
                            </div>
                            {subItem.details && <div className="text-gray-500 text-xs mt-0.5">{subItem.details}</div>}
                          </div>
                          <span className="text-gray-700 ml-2 flex-shrink-0">${Math.round(subItem.amount).toLocaleString()}</span>
                        </div>
                        {subItem.description === 'Materials and Supplies' && (
                          <div className="text-xs text-gray-500 italic mt-0.5">
                            *Only charged if used
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t-2 border-green-400">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Estimated Total:</span>
                <span className="text-3xl font-bold text-green-600">${Math.round(quote.total).toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-right italic">
                *Estimate based on provided information. Final price may vary.
              </p>
            </div>

            {/* Important Alerts */}
            {(() => {
              const alerts: string[] = [];

              // Collect alerts from quote items
              quote.items.forEach(item => {
                if (item.subItems) {
                  item.subItems.forEach(subItem => {
                    if (subItem.alert && !alerts.includes(subItem.alert)) {
                      alerts.push(subItem.alert);
                    }
                  });
                }
              });

              // Add alerts from formData items that don't have costs
              if (formData.applianceFridge && !alerts.includes('Fridge doors cannot be fully removed to fit through narrow spaces')) {
                alerts.push('Fridge doors cannot be fully removed to fit through narrow spaces');
              }
              if (formData.treadmills && !alerts.includes('Treadmills cannot be disassembled')) {
                alerts.push('Treadmills cannot be disassembled');
              }

              return alerts.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <h3 className="text-sm font-semibold text-red-600 mb-2">Important Notes:</h3>
                  <ul className="space-y-1">
                    {alerts.map((alert, idx) => (
                      <li key={idx} className="text-sm text-red-600">
                        <span className="font-bold">* </span>{alert}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </section>
        )}

        {/* Quote Action Buttons */}
        {quote && quote.total > 0 && (
          <section className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setShowQuotePreview(true)}
                className="py-4 px-6 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #0072BC, #10B981)',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                }}
              >
                Preview Quote
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!quoteNumber) {
                    alert('Please save the form first to generate a quote number.');
                    return;
                  }

                  const phoneNumber = phones[0]?.number || formData?.phone;
                  if (!formData.firstName || !phoneNumber) {
                    alert('Customer name and phone number are required.');
                    return;
                  }

                  setIsSendingQuote(true);

                  try {
                    const response = await fetch('/api/move-wt/send-quote', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        quoteNumber: quoteNumber,
                        quoteTotal: quote.total,
                      }),
                    });

                    const result = await response.json();

                    if (!response.ok) {
                      throw new Error(result.error || 'Failed to send quote');
                    }

                    console.log(`Quote sent successfully to ${formData.firstName}. URL: ${result.quoteUrl}`);

                    // Show "Sent" for 3 seconds
                    setQuoteSent(true);
                    setTimeout(() => {
                      setQuoteSent(false);
                    }, 3000);
                  } catch (error) {
                    console.error('Send quote error:', error);
                    alert(error instanceof Error ? error.message : 'Failed to send quote. Please try again.');
                  } finally {
                    setIsSendingQuote(false);
                  }
                }}
                disabled={!quoteNumber || !formData.firstName || !(phones[0]?.number || formData?.phone) || isSendingQuote}
                className="py-4 px-6 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #0072BC)',
                  boxShadow: '0 4px 12px rgba(0,114,188,0.3)'
                }}
              >
                {isSendingQuote ? 'Sending...' : (quoteSent ? 'Sent' : 'Send to Customer')}
              </button>
            </div>
          </section>
        )}

        {/* House Quality Rating */}
        <div className="bg-white p-4 rounded-lg shadow flex items-center justify-center">
          <div className="w-full">
            <div className="relative px-2">
              {/* Hidden slider for accessibility */}
              <input
                type="range"
                name="houseQuality"
                min="1"
                max="5"
                step="1"
                value={formData.houseQuality}
                onChange={handleInputChange}
                className="sr-only"
              />
              {/* Clickable dot markers */}
              <div className="flex justify-between px-2" style={{ paddingTop: '2px' }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData(prev => {
                      const hasLargeAppliances = prev.applianceFridge || prev.applianceWasher || prev.applianceDryer;
                      return {
                        ...prev,
                        houseQuality: value,
                        // Auto-check Air Sled if quality level 5 is selected AND any Large Appliances are selected
                        airSled: (value === 5 && hasLargeAppliances) ? true : prev.airSled
                      };
                    })}
                    className={`w-4 h-4 rounded-full border-2 transition-all cursor-pointer ${
                      formData.houseQuality === value
                        ? 'bg-gray-300 border-gray-400 scale-125'
                        : 'bg-white border-gray-400 hover:bg-gray-100'
                    }`}
                    aria-label={`Quality level ${value}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button - Fixed on desktop, normal on mobile */}
        <div className="bg-white p-4 shadow-lg rounded-lg md:fixed md:bottom-0 md:left-0 md:right-0 md:z-50">
          <div className="max-w-2xl mx-auto">
            <button
              type="submit"
              disabled={isSaving || !jobNumber || !address || isFormSaved}
              className="w-full py-3 px-4 text-white font-bold rounded-lg shadow-md transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
              style={{ backgroundColor: isSaving || !jobNumber || !address || isFormSaved ? '#9CA3AF' : '#06649b' }}
            >
              {isSaving ? 'Saving...' : (isFormSaved ? 'Saved' : 'Save')}
            </button>
          </div>
        </div>
      </form>

      {/* Floating See Quote Button */}
      {quote && quote.total > 0 && (
        <button
          onClick={() => {
            const quoteSection = document.getElementById('quote-section');
            if (quoteSection) {
              quoteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all z-40 flex items-center gap-2"
          style={{ backgroundColor: '#10b981' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
          See Quote
        </button>
      )}
    </main>
      {/* Quote Preview Modal */}
      <QuotePreview
        isOpen={showQuotePreview}
        onClose={() => setShowQuotePreview(false)}
        formData={formData}
        quote={quote}
        jobNumber={jobNumber}
      />

    </>
  );
}

export default function MoveWalkthrough() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <MoveWalkthroughContent />
    </Suspense>
  );
}
