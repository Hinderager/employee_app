"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Script from "next/script";

export default function MoveWalkthrough() {
  const router = useRouter();
  const [jobNumber, setJobNumber] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [address, setAddress] = useState("");
  const [folderUrl, setFolderUrl] = useState("");
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [tempJobNumber, setTempJobNumber] = useState<string>("");

  // Dynamic phone and email arrays
  const [phones, setPhones] = useState<Array<{ number: string; name: string }>>([{ number: "", name: "" }]);
  const [emails, setEmails] = useState<Array<{ email: string; name: string }>>([{ email: "", name: "" }]);

  // Track if folder link was copied
  const [isFolderLinkCopied, setIsFolderLinkCopied] = useState(false);

  // Track if form is saved
  const [isFormSaved, setIsFormSaved] = useState(true);

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

  // Refs for autocomplete inputs
  const pickupAddressRef = useRef<HTMLInputElement>(null);
  const deliveryAddressRef = useRef<HTMLInputElement>(null);
  const additionalStopAddressRef = useRef<HTMLInputElement>(null);
  const pickupAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const deliveryAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const additionalStopAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [quote, setQuote] = useState({
    baseRate: 0,
    items: [] as Array<{
      description: string;
      amount: number;
      discount?: string;
      subItems?: Array<{ description: string; amount: number }>;
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

  const [formData, setFormData] = useState({
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

    // Addresses - Pickup
    pickupAddress: "",
    pickupUnit: "",
    pickupCity: "",
    pickupState: "",
    pickupZip: "",
    pickupLocationType: "house",
    pickupLocationOther: "",
    pickupHouseSquareFeet: "",
    pickupZestimate: "",
    pickupHowFurnished: 80,
    pickupApartmentSquareFeet: "",
    pickupApartmentBedBath: "",
    pickupApartmentHowFurnished: 80,
    pickupStorageUnitQuantity: 1,
    pickupStorageUnitSizes: [""],
    pickupStorageUnitHowFull: [""],

    // Addresses - Delivery
    deliveryAddress: "",
    deliveryUnit: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryZip: "",
    deliveryLocationType: "house",
    deliveryLocationOther: "",
    deliveryHouseSquareFeet: "",
    deliveryZestimate: "",
    deliveryApartmentSquareFeet: "",
    deliveryApartmentBedBath: "",
    deliveryApartmentHowFurnished: 80,
    deliveryStorageUnitQuantity: 1,
    deliveryStorageUnitSizes: [""],
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
    additionalStopHouseSquareFeet: "",
    additionalStopZestimate: "",
    additionalStopHowFurnished: 80,
    additionalStopApartmentBedBath: "",
    additionalStopStorageUnitQuantity: 1,
    additionalStopStorageUnitSizes: [""],
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
    junkRemovalNeeded: false,
    junkRemovalAmount: "",
    junkRemovalDetails: "",

    // Insurance
    needsInsurance: false,
    estimatedValue: "",

    // Timing
    preferredDate: "",
    moveDateUnknown: false,
    timeFlexible: false,
    readyToSchedule: false,
    timingNotes: "",

    // Estimates
    estimatedCrewSize: "",
    crewSizeNotes: "",

    // Special Notes
    specialRequests: "",

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
          formData: normalizedFormData,
          folderUrl: folderUrl,
          isTemporary: !jobNumber || jobNumber.trim() === '',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save form');
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
  }, [formData, jobNumber, address, folderUrl, phones, emails]);

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

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  // Handle phone number input with auto-formatting
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
    if (!jobNumber.trim() && !searchPhone.trim()) {
      alert('Please enter a job number or phone number');
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
      if (result.forms && result.forms.length > 0) {
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
        setAddress(selectedForm.address);
        setJobNumber(selectedForm.jobNumber);

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
        if (selectedForm.formData) {
          const { phones: savedPhones, emails: savedEmails, ...restFormData } = selectedForm.formData;

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

      // Addresses - Pickup
      pickupAddress: "",
      pickupUnit: "",
      pickupCity: "",
      pickupState: "",
      pickupZip: "",
      pickupLocationType: "house",
      pickupLocationOther: "",
      pickupHouseSquareFeet: "",
      pickupZestimate: "",
      pickupHowFurnished: 80,
      pickupApartmentSquareFeet: "",
      pickupApartmentBedBath: "",
      pickupApartmentHowFurnished: 80,
      pickupStorageUnitQuantity: 1,
      pickupStorageUnitSizes: [""],
      pickupStorageUnitHowFull: [""],

      // Addresses - Delivery
      deliveryAddress: "",
      deliveryUnit: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryLocationType: "house",
      deliveryLocationOther: "",
      deliveryHouseSquareFeet: "",
      deliveryZestimate: "",
      deliveryApartmentSquareFeet: "",
      deliveryApartmentBedBath: "",
      deliveryApartmentHowFurnished: 80,
      deliveryStorageUnitQuantity: 1,
      deliveryStorageUnitSizes: [""],
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
      additionalStopHouseSquareFeet: "",
      additionalStopZestimate: "",
      additionalStopHowFurnished: 80,
      additionalStopApartmentBedBath: "",
      additionalStopStorageUnitQuantity: 1,
      additionalStopStorageUnitSizes: [""],
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
      junkRemovalNeeded: false,
      junkRemovalAmount: "",
      junkRemovalDetails: "",

      // Insurance
      needsInsurance: false,
      estimatedValue: "",

      // Timing
      preferredDate: "",
      moveDateUnknown: false,
      timeFlexible: false,
      readyToSchedule: false,
      timingNotes: "",

      // Estimates
      estimatedCrewSize: "",
      crewSizeNotes: "",

      // Special Notes
      specialRequests: "",

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
    const parseAddressComponents = (place: google.maps.places.PlaceResult, fieldPrefix: 'pickup' | 'delivery' | 'additionalStop') => {
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

      // Build street address
      const streetAddress = [addressData.streetNumber, addressData.route].filter(Boolean).join(' ');

      // Update form data
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
      }
      if (deliveryAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(deliveryAutocompleteRef.current);
      }
      if (additionalStopAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(additionalStopAutocompleteRef.current);
      }
    };

    // Clean up before creating new instances
    cleanup();

    // Start Address Autocomplete
    if (pickupAddressRef.current && !pickupAutocompleteRef.current) {
      pickupAutocompleteRef.current = new google.maps.places.Autocomplete(pickupAddressRef.current, options);
      pickupAutocompleteRef.current.addListener('place_changed', () => {
        const place = pickupAutocompleteRef.current?.getPlace();
        if (place) parseAddressComponents(place, 'pickup');
      });
    }

    // Delivery Address Autocomplete
    if (deliveryAddressRef.current && !deliveryAutocompleteRef.current) {
      deliveryAutocompleteRef.current = new google.maps.places.Autocomplete(deliveryAddressRef.current, options);
      deliveryAutocompleteRef.current.addListener('place_changed', () => {
        const place = deliveryAutocompleteRef.current?.getPlace();
        if (place) parseAddressComponents(place, 'delivery');
      });
    }

    // Additional Stop Address Autocomplete
    if (additionalStopAddressRef.current && !additionalStopAutocompleteRef.current) {
      additionalStopAutocompleteRef.current = new google.maps.places.Autocomplete(additionalStopAddressRef.current, options);
      additionalStopAutocompleteRef.current.addListener('place_changed', () => {
        const place = additionalStopAutocompleteRef.current?.getPlace();
        if (place) parseAddressComponents(place, 'additionalStop');
      });
    }
  };

  // Initialize autocomplete when Google is loaded or when additional stop is toggled
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
  }, [isGoogleLoaded, formData.hasAdditionalStop]);

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

    // Only calculate if we have both complete addresses
    if (!formData.pickupCity || !formData.pickupState || !formData.deliveryCity || !formData.deliveryState) {
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
      const requestBody: any = {
        pickupAddress: pickupFullAddress,
        deliveryAddress: deliveryFullAddress
      };

      if (additionalStopFullAddress) {
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
          charge: parseFloat(toPickupTotalCharge.toFixed(2))
        },
        pickupToDelivery: {
          miles: result.pickupToDelivery.miles,
          minutes: result.pickupToDelivery.minutes,
          charge: parseFloat(pickupToDeliveryTotalCharge.toFixed(2))
        },
        fromDelivery: {
          miles: result.fromDelivery.miles,
          minutes: result.fromDelivery.minutes,
          charge: parseFloat(fromDeliveryTotalCharge.toFixed(2))
        },
        totalCharge: parseFloat(totalCharge.toFixed(2))
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
    formData.estimatedCrewSize
  ]);

  // Quote Calculation
  const calculateQuote = () => {
    const items: Array<{
      description: string;
      amount: number;
      subItems?: Array<{ description: string; amount: number }>;
      discount?: string;
    }> = [];
    let baseRate = 0;

    // Moving Labor - calculate based on square footage and how much is getting moved
    // Get pickup location square footage
    let pickupSquareFeet = 0;
    if (formData.pickupLocationType === 'house' && formData.pickupHouseSquareFeet) {
      pickupSquareFeet = parseInt(formData.pickupHouseSquareFeet.replace(/,/g, ''));
    } else if (formData.pickupLocationType === 'apartment' && formData.pickupApartmentSquareFeet) {
      pickupSquareFeet = parseInt(formData.pickupApartmentSquareFeet.replace(/,/g, ''));
    }

    if (pickupSquareFeet > 0) {
      // Get "how much is getting moved" slider value
      let sliderValue = 0;
      if (formData.pickupLocationType === 'house') {
        sliderValue = formData.pickupHowFurnished || 80;
      } else if (formData.pickupLocationType === 'apartment') {
        sliderValue = formData.pickupApartmentHowFurnished || 80;
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

      // Formula: square_footage × calculation_percentage × 0.8
      let movingLabor = pickupSquareFeet * (calculationPercentage / 100) * 0.8;

      // Apply parking distance factor
      // close (0-50ft) = 1.0, medium = 1.1, long/far = 1.2
      let parkingFactor = 1.0;

      // Pickup parking distance
      if (formData.pickupParkingDistance === 'medium') {
        parkingFactor += 0.1;
      } else if (formData.pickupParkingDistance === 'far') {
        parkingFactor += 0.2;
      }

      // Delivery parking distance
      if (formData.deliveryParkingDistance === 'medium') {
        parkingFactor += 0.1;
      } else if (formData.deliveryParkingDistance === 'far') {
        parkingFactor += 0.2;
      }

      movingLabor = movingLabor * parkingFactor;

      if (movingLabor > 0) {
        const materialsCharge = movingLabor * 0.05; // 5% of labor
        const totalMovingCharge = movingLabor + materialsCharge;

        items.push({
          description: 'Moving',
          amount: parseFloat(totalMovingCharge.toFixed(2)),
          subItems: [
            {
              description: 'Labor',
              amount: parseFloat(movingLabor.toFixed(2))
            },
            {
              description: 'Materials and Supplies',
              amount: parseFloat(materialsCharge.toFixed(2))
            }
          ]
        });
      }
    }

    // Travel billing - use calculated distance data
    if (distanceData && distanceData.totalCharge > 0) {
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

      // Apply free miles sequentially: Travel to Start -> Move Travel -> Return Travel

      // 1. Travel to Start (distance + time)
      let toStartBillableMiles = distanceData.toPickup.miles;
      if (toStartBillableMiles >= remainingFreeMiles) {
        toStartBillableMiles -= remainingFreeMiles;
        remainingFreeMiles = 0;
      } else {
        remainingFreeMiles -= toStartBillableMiles;
        toStartBillableMiles = 0;
      }
      const toStartDistanceCharge = toStartBillableMiles * pricePerMile;
      const toStartTimeCharge = (distanceData.toPickup.minutes / 60) * 85 * crewSize;
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
        const moveTravelTimeCharge = (distanceData.pickupToDelivery.minutes / 60) * 85 * crewSize;
        moveTravelCharge = moveTravelDistanceCharge + moveTravelTimeCharge;
      }

      // 3. Return Travel (distance + time)
      let returnTravelBillableMiles = distanceData.fromDelivery.miles;
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
      const returnTravelTimeCharge = (distanceData.fromDelivery.minutes / 60) * 85 * crewSize;
      const returnTravelCharge = returnTravelDistanceCharge + returnTravelTimeCharge;

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
            description: `Travel to Start (${distanceData.toPickup.miles.toFixed(1)} mi, ${formatDuration(distanceData.toPickup.minutes)})`,
            amount: parseFloat(toStartCharge.toFixed(2))
          }
        ];

        // Add Move Travel if present
        if (distanceData.pickupToDelivery && distanceData.pickupToDelivery.miles > 0) {
          subItems.push({
            description: `Move Travel (${distanceData.pickupToDelivery.miles.toFixed(1)} mi, ${formatDuration(distanceData.pickupToDelivery.minutes)})`,
            amount: parseFloat(moveTravelCharge.toFixed(2))
          });
        }

        subItems.push({
          description: `Return Travel (${distanceData.fromDelivery.miles.toFixed(1)} mi, ${formatDuration(distanceData.fromDelivery.minutes)})`,
          amount: parseFloat(returnTravelCharge.toFixed(2))
        });

        items.push({
          description: 'Travel (first 15 miles included)',
          amount: parseFloat(totalTravelCharge.toFixed(2)),
          subItems: subItems
        });
      }
    }

    // Pickup location factors
    if (formData.pickupStairs > 1) {
      const stairFee = (formData.pickupStairs - 1) * 25;
      items.push({ description: `Pickup Stairs (${formData.pickupStairs} flights)`, amount: stairFee });
    }

    if (formData.pickupParkingDistance === 'far') {
      items.push({ description: 'Pickup Long Carry', amount: 50 });
    }

    // Delivery location factors
    if (formData.deliveryStairs > 1) {
      const stairFee = (formData.deliveryStairs - 1) * 25;
      items.push({ description: `Delivery Stairs (${formData.deliveryStairs} flights)`, amount: stairFee });
    }

    if (formData.deliveryParkingDistance === 'far') {
      items.push({ description: 'Delivery Long Carry', amount: 50 });
    }

    // Heavy/Special Items
    const heavyItems: Array<{ description: string; amount: number }> = [];

    if (formData.pianos) {
      const pianoCount = formData.pianosQty || 1;
      const pianoCharge = 100 * pianoCount;
      heavyItems.push({ description: `Piano${pianoCount > 1 ? ` (${pianoCount})` : ''}`, amount: pianoCharge });
    }

    if (formData.gunSafes) {
      const gunSafeCount = formData.gunSafesQty || 1;
      const gunSafeCharge = 100 * gunSafeCount;
      heavyItems.push({ description: `Gun Safe${gunSafeCount > 1 ? ` (${gunSafeCount})` : ''}`, amount: gunSafeCharge });
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
        items.push({
          description: 'Junk Removal',
          amount: discountedCharge,
          discount: '*20% off w/move',
          subItems: [
            {
              description: amount,
              amount: discountedCharge
            }
          ]
        });
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
          if (formData.pickupLocationType === 'house' && formData.pickupHouseSquareFeet) {
            startSquareFeet = parseInt(formData.pickupHouseSquareFeet.replace(/,/g, ''));
          } else if (formData.pickupLocationType === 'apartment' && formData.pickupApartmentSquareFeet) {
            startSquareFeet = parseInt(formData.pickupApartmentSquareFeet.replace(/,/g, ''));
          }

          if (startSquareFeet > 0) {
            // Get "how much is getting moved" slider value and convert to percentage
            let sliderValue = 0;
            if (formData.pickupLocationType === 'house') {
              sliderValue = formData.pickupHowFurnished || 80;
            } else if (formData.pickupLocationType === 'apartment') {
              sliderValue = formData.pickupApartmentHowFurnished || 80;
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
          amount: parseFloat(totalPackingCharge.toFixed(2)),
          subItems: [
            {
              description: 'Labor',
              amount: parseFloat(packingLaborCharge.toFixed(2))
            },
            {
              description: 'Materials and Supplies',
              amount: parseFloat(materialsCharge.toFixed(2))
            }
          ]
        });
      }
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

  // Manual property data fetch functions
  const fetchPickupPropertyData = async () => {
    if (!formData.pickupAddress || !formData.pickupCity || !formData.pickupState || !formData.pickupZip) {
      alert('Please enter a complete pickup address first');
      return;
    }

    const fullAddress = `${formData.pickupAddress}, ${formData.pickupCity}, ${formData.pickupState} ${formData.pickupZip}`;

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
    }
  };

  const fetchDeliveryPropertyData = async () => {
    if (!formData.deliveryAddress || !formData.deliveryCity || !formData.deliveryState || !formData.deliveryZip) {
      alert('Please enter a complete delivery address first');
      return;
    }

    const fullAddress = `${formData.deliveryAddress}, ${formData.deliveryCity}, ${formData.deliveryState} ${formData.deliveryZip}`;

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
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                id="searchPhone"
                type="tel"
                value={searchPhone}
                onChange={handleSearchPhoneChange}
                placeholder="Phone #"
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleLoadJob}
                disabled={isLoadingJob || (!jobNumber && !searchPhone)}
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

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 space-y-6">

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
            {/* Start Address Section */}
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-blue-900">Start Address</h3>
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
                <select
                  name="pickupLocationType"
                  value={formData.pickupLocationType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="storage-unit">Storage Unit</option>
                  <option value="truck">Truck</option>
                  <option value="pod">POD</option>
                  <option value="other">Other</option>
                </select>



                {/* How Much is Getting Moved Slider - For House */}
                {formData.pickupLocationType === 'house' && (
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
                        {getHowFurnishedText(Number(formData.pickupHowFurnished))}
                      </span>
                    </div>
                  </div>
                )}

                {/* How Much is Getting Moved Slider - For Apartment */}
                {formData.pickupLocationType === 'apartment' && (
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
                      <span className="text-sm font-medium text-blue-700 min-w-[140px]">
                        {getHowFurnishedText(Number(formData.pickupApartmentHowFurnished)).replace('Whole house', 'Whole apartment')}
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
                            pickupStorageUnitHowFull: prev.pickupStorageUnitHowFull.slice(0, newQty)
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
                            pickupStorageUnitHowFull: [...prev.pickupStorageUnitHowFull, ""]
                          }));
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                      >
                        +
                      </button>
                    </div>
                    {Array.from({ length: formData.pickupStorageUnitQuantity }).map((_, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={formData.pickupStorageUnitSizes[index] || ""}
                          onChange={(e) => {
                            const newSizes = [...formData.pickupStorageUnitSizes];
                            newSizes[index] = e.target.value;
                            setFormData(prev => ({ ...prev, pickupStorageUnitSizes: newSizes }));
                          }}
                          placeholder={`Unit ${index + 1} Size`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <select
                          value={formData.pickupStorageUnitHowFull[index] || ""}
                          onChange={(e) => {
                            const newHowFull = [...formData.pickupStorageUnitHowFull];
                            newHowFull[index] = e.target.value;
                            setFormData(prev => ({ ...prev, pickupStorageUnitHowFull: newHowFull }));
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">How Full</option>
                          <option value="light">Light</option>
                          <option value="medium">Medium</option>
                          <option value="packed">Packed</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {formData.pickupLocationType === 'other' && (
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
                    name="pickupZip"
                    value={formData.pickupZip}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {formData.pickupLocationType === 'house' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="pickupHouseSquareFeet"
                      value={formatNumberWithCommas(formData.pickupHouseSquareFeet)}
                      onChange={handleInputChange}
                      placeholder="Square Feet"
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      name="pickupZestimate"
                      value={formatNumberWithCommas(formData.pickupZestimate)}
                      onChange={handleInputChange}
                      placeholder="Value"
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={fetchPickupPropertyData}
                      className="px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex-shrink-0"
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
                      value={formatNumberWithCommas(formData.pickupApartmentSquareFeet)}
                      onChange={handleInputChange}
                      placeholder="Square Feet"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="flex-1 flex gap-1 min-w-0">
                      <input
                        type="text"
                        name="pickupApartmentBedBath"
                        value={formData.pickupApartmentBedBath}
                        onChange={handleInputChange}
                        placeholder="Bed/Bath"
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={fetchPickupPropertyData}
                        className="px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex-shrink-0"
                        title="Fetch property data from Zillow"
                      >
                        sf
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address Section */}
            {formData.serviceType !== 'labor-only' && (
            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-semibold text-green-900">Delivery Address</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="deliveryAddressUnknown"
                    checked={formData.deliveryAddressUnknown}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddressUnknown: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Unknown</span>
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
                  <option value="storage-unit">Storage Unit</option>
                  <option value="pod">POD</option>
                  <option value="truck">Truck</option>
                  <option value="other">Other</option>
                </select>



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

                {/* How Much is Getting Moved Slider - For Apartment */}
                {formData.deliveryLocationType === 'apartment' && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      How much is getting moved?
                    </label>
                    <div className="flex items-center gap-4 bg-white p-3 rounded-md border border-gray-200">
                      <input
                        type="range"
                        name="deliveryApartmentHowFurnished"
                        min="0"
                        max="100"
                        step="20"
                        value={formData.deliveryApartmentHowFurnished}
                        onChange={handleInputChange}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-green-700 min-w-[140px]">
                        {getHowFurnishedText(Number(formData.deliveryApartmentHowFurnished)).replace('Whole house', 'Whole apartment')}
                      </span>
                    </div>
                  </div>
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
                            deliveryStorageUnitSizes: prev.deliveryStorageUnitSizes.slice(0, newQty)
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
                            deliveryStorageUnitSizes: [...prev.deliveryStorageUnitSizes, ""]
                          }));
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                      >
                        +
                      </button>
                    </div>
                    {Array.from({ length: formData.deliveryStorageUnitQuantity }).map((_, index) => (
                      <input
                        key={index}
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
                        name="deliveryZip"
                        value={formData.deliveryZip}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}
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
                    <option value="truck">Truck</option>
                    <option value="pod">POD</option>
                    <option value="other">Other</option>
                  </select>

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
                              additionalStopStorageUnitSizes: prev.additionalStopStorageUnitSizes.slice(0, newQty)
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
                              additionalStopStorageUnitSizes: [...prev.additionalStopStorageUnitSizes, ""]
                            }));
                          }}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-bold"
                        >
                          +
                        </button>
                      </div>
                      {Array.from({ length: formData.additionalStopStorageUnitQuantity }).map((_, index) => (
                        <input
                          key={index}
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
                      name="additionalStopZip"
                      value={formData.additionalStopZip}
                      onChange={handleInputChange}
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
          </div>
        </section>

        {/* Pickup Location Access */}
        {formData.serviceType !== 'labor-only' && (
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
                Gun Safe
              </label>
            </div>

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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="applianceWasher"
                    checked={formData.applianceWasher}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">
                    Washer
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
                    Dryer
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="applianceDishwasher"
                    checked={formData.applianceDishwasher}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">
                    Dishwasher
                  </label>
                  {formData.applianceDishwasher && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceDishwasherQty: Math.max(1, prev.applianceDishwasherQty - 1)
                        }))}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{formData.applianceDishwasherQty}</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          applianceDishwasherQty: prev.applianceDishwasherQty + 1
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

        {/* Timing & Scheduling */}
        <section className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500">
          <h2 className="text-xl font-bold text-pink-900 mb-4">Timing & Scheduling</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Move Date
              </label>
              <input
                type="date"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleInputChange}
                className="max-w-sm bg-white px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
                <option value="">Select crew size</option>
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
        {quote.total > 0 && (
          <section className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-lg p-6 border-2 border-green-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Active Estimate
            </h2>

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
                      <div key={`${index}-${subIndex}`} className="flex justify-between items-center py-1 pl-6 text-sm">
                        <span className="text-gray-600">{subItem.description}</span>
                        <span className="text-gray-700">${Math.round(subItem.amount).toLocaleString()}</span>
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
                    onClick={() => setFormData(prev => ({ ...prev, houseQuality: value }))}
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

        {/* Submit Button */}
        <div className="sticky bottom-0 bg-white p-4 shadow-lg rounded-lg">
          <button
            type="submit"
            disabled={isSaving || !jobNumber || !address || isFormSaved}
            className="w-full py-3 px-4 text-white font-bold rounded-lg shadow-md transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ backgroundColor: isSaving || !jobNumber || !address || isFormSaved ? '#9CA3AF' : '#06649b' }}
          >
            {isSaving ? 'Saving...' : (isFormSaved ? 'Saved' : 'Save')}
          </button>
        </div>
      </form>
    </main>
    </>
  );
}
