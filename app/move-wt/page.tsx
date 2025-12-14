"use client";

import { useState, useEffect, useRef } from "react";

// Declare global window properties for Google Maps
declare global {
  interface Window {
    google: any;
    initMoveWTMap: () => void;
  }
}

type PropertyType = 'home' | 'apartment' | 'office' | 'storage' | null;
type StorageUnit = {
  id: number;
  size: string | null;
  type: 'conditioned' | 'standard' | null;
  unitNumber: string;
  fullness: string;
};

// Office address for deadhead calculations (travel to/from shop)
const OFFICE_ADDRESS = '5015 N Lolo Pass Way, Meridian, ID 83646';

// Type for deadhead travel data
type DeadheadData = {
  toStartMiles: number;
  toStartMins: number;
  returnMiles: number;
  returnMins: number;
};

export default function MoveWTNew2Page() {
  // Client-side only rendering to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Recent estimates for quick-link tiles (from move_estimates table)
  const [recentEstimates, setRecentEstimates] = useState<Array<{
    id: string;
    quoteId: string;
    displayName: string;
    displayPhone: string;
    displayDate: string;
    fromAddress: string;
    toAddress: string;
    serviceType: string;
  }>>([]);
  const [isLoadingRecentEstimates, setIsLoadingRecentEstimates] = useState(true);
  const [isLoadingJob, setIsLoadingJob] = useState(false);

  // Quote state - matches website quote format
  type QuoteSubItem = {
    description: string;
    amount: number;
    details?: string;
    alert?: string;
  };
  type QuoteItem = {
    description: string;
    amount: number;
    subItems?: QuoteSubItem[];
    discount?: string;
    details?: string;
  };
  type Quote = {
    items: QuoteItem[];
    total: number;
    movingLabor: number;       // Completed Move labor (subject to minimum)
    movingMaterials: number;   // Materials & Supplies (variable, can be 0)
    otherServices: number;     // Boxing & Packing + Junk Removal (variable)
    fixedTotal: number;        // Travel, Stairs, Heavy Items (fixed)
    minimumCharge: number;     // Minimum move charge
  };
  const [quote, setQuote] = useState<Quote>({
    items: [],
    total: 0,
    movingLabor: 0,
    movingMaterials: 0,
    otherServices: 0,
    fixedTotal: 0,
    minimumCharge: 0
  });

  // Save state
  const [currentEstimateId, setCurrentEstimateId] = useState<string | null>(null);
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search state
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<'phone' | 'name' | 'quoteId' | 'workizJob'>('phone');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    full_name: string;
    phone: string;
    quote_id: string;
    workiz_job_number: string;
    from_address: string;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Service Type
  const [serviceType, setServiceType] = useState<'truck' | 'labor'>('truck');

  // Labor-Only Specific State
  const [laborServiceType, setLaborServiceType] = useState<string | null>('between-rooms');
  const [laborItemAmount, setLaborItemAmount] = useState<string>('2');
  const [loadingItemAmount, setLoadingItemAmount] = useState<string>('7');
  const [officeItemAmount, setOfficeItemAmount] = useState<string>('7');
  const [truckPodLengths, setTruckPodLengths] = useState<string[]>(['']);
  const [unloadingTrucks, setUnloadingTrucks] = useState<{ id: number; length: string | null; fullness: string }[]>([{ id: 1, length: null, fullness: '8' }]);
  const [unloadingStorageType, setUnloadingStorageType] = useState<string | null>(null);

  // Move Date/Time
  const [moveDate, setMoveDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [moveDuration, setMoveDuration] = useState('3');
  const [moveDateUnknown, setMoveDateUnknown] = useState(false);
  const timeSelectRef = useRef<HTMLSelectElement>(null);

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  // Address input refs for Google Places autocomplete
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const stopInputRef = useRef<HTMLInputElement>(null);
  const fromAutocompleteRef = useRef<any>(null);
  const toAutocompleteRef = useRef<any>(null);
  const stopAutocompleteRef = useRef<any>(null);

  // Google Maps state
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [routeLegs, setRouteLegs] = useState<Array<{
    start: string;
    end: string;
    distance: string;
    duration: string;
  }>>([]);
  const [totalDistance, setTotalDistance] = useState('');
  const [totalDuration, setTotalDuration] = useState('');
  const [deadhead, setDeadhead] = useState<DeadheadData | null>(null);

  // Walk-through Date/Time
  const [wtDate, setWtDate] = useState('');
  const [wtTime, setWtTime] = useState('');
  const [wtDuration, setWtDuration] = useState('1');

  // Job Tags and Notes - Move is always preselected
  const [tags, setTags] = useState<string[]>(['Move']);
  const [timingNotes, setTimingNotes] = useState('');

  // Calendar state - shows 3 days from Workiz
  type CalendarJob = {
    id: string;
    serialId: string;
    customerName: string;
    startTime: string;
    endTime: string;
    startMinutes: number; // Minutes from midnight (8am = 480)
    endMinutes: number;   // Minutes from midnight
    jobType: string;
    status: string;
    tags: string[];
  };
  type CalendarDay = {
    date: string;
    dateLabel: string;
    dayName: string;
    jobs: CalendarJob[];
    isSelected: boolean;
  };
  type CalendarTech = {
    initials: string;
    name: string;
    isScheduled: boolean;
    hasTimeOff: boolean;
  };
  type CalendarDayTechs = {
    date: string;
    techs: CalendarTech[];
  };
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calendarTechs, setCalendarTechs] = useState<CalendarDayTechs[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // Other Services state
  const [packingAmount, setPackingAmount] = useState<string>('0');
  const [packingRooms, setPackingRooms] = useState<string[]>([]);
  const [junkRemovalAmount, setJunkRemovalAmount] = useState<string>('0');

  // FROM Location state
  const [fromIsCurrentHome, setFromIsCurrentHome] = useState(true);
  const [fromAddress, setFromAddress] = useState('');
  const [fromUnit, setFromUnit] = useState('');
  const [fromPropertyType, setFromPropertyType] = useState<PropertyType>('home');
  const [fromBedrooms, setFromBedrooms] = useState<string | null>(null);
  const [fromSquareFootage, setFromSquareFootage] = useState<string | null>(null);
  const [fromZestimate, setFromZestimate] = useState<string | null>(null);
  const [fromGarage, setFromGarage] = useState<string | null>(null);
  const [fromStories, setFromStories] = useState<string | null>(null);
  const [fromFloorLevel, setFromFloorLevel] = useState('1');
  const [fromElevator, setFromElevator] = useState<'yes' | 'no' | null>(null);
  const [fromStorageUnits, setFromStorageUnits] = useState<StorageUnit[]>([{ id: 1, size: null, type: null, unitNumber: '', fullness: '5' }]);
  const [fromDetails, setFromDetails] = useState('');
  const [isLoadingFromProperty, setIsLoadingFromProperty] = useState(false);

  // Belongings & Heavy Items
  const [belongingsAmount, setBelongingsAmount] = useState('8');
  const [heavyItems, setHeavyItems] = useState<string[]>([]);
  const [gunSafeOver300, setGunSafeOver300] = useState<'yes' | 'no' | null>(null);
  const [gunSafeGroundLevel, setGunSafeGroundLevel] = useState<'yes' | 'no' | null>(null);
  const [pianoType, setPianoType] = useState<'upright' | 'grand' | null>(null);
  const [pianoGroundLevel, setPianoGroundLevel] = useState<'yes' | 'no' | null>(null);
  const [poolTableDisassembly, setPoolTableDisassembly] = useState<'yes' | 'no' | null>(null);
  const [poolTableGroundLevel, setPoolTableGroundLevel] = useState<'yes' | 'no' | null>(null);
  const [mattressGroundLevel, setMattressGroundLevel] = useState<'yes' | 'no' | null>(null);
  const [tvCount, setTvCount] = useState<string | null>(null);
  const [exerciseEquipmentTypes, setExerciseEquipmentTypes] = useState<string[]>([]);
  const [toolTypes, setToolTypes] = useState<string[]>([]);
  const [toolOtherText, setToolOtherText] = useState('');

  // TO Location state
  const [toIsCurrentHome, setToIsCurrentHome] = useState(false);
  const [toAddress, setToAddress] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [toPropertyType, setToPropertyType] = useState<PropertyType>('home');
  const [toSquareFootage, setToSquareFootage] = useState<string | null>(null);
  const [toZestimate, setToZestimate] = useState<string | null>(null);
  const [toStories, setToStories] = useState<string | null>(null);
  const [toFloorLevel, setToFloorLevel] = useState('1');
  const [toElevator, setToElevator] = useState<'yes' | 'no' | null>(null);
  const [toStorageUnits, setToStorageUnits] = useState<StorageUnit[]>([{ id: 1, size: null, type: null, unitNumber: '', fullness: '5' }]);
  const [toDetails, setToDetails] = useState('');
  const [isLoadingToProperty, setIsLoadingToProperty] = useState(false);

  // STOP Location state
  const [hasStop, setHasStop] = useState(false);
  const [stopAddress, setStopAddress] = useState('');
  const [stopUnit, setStopUnit] = useState('');
  const [stopPropertyType, setStopPropertyType] = useState<PropertyType>('home');
  const [stopAction, setStopAction] = useState<'dropoff' | 'pickup' | null>(null);
  const [stopBedrooms, setStopBedrooms] = useState<string | null>(null);
  const [stopSquareFootage, setStopSquareFootage] = useState<string | null>(null);
  const [stopGarage, setStopGarage] = useState<string | null>(null);
  const [stopStories, setStopStories] = useState<string | null>(null);
  const [stopFloorLevel, setStopFloorLevel] = useState('1');
  const [stopElevator, setStopElevator] = useState<'yes' | 'no' | null>(null);
  const [stopStorageUnits, setStopStorageUnits] = useState<StorageUnit[]>([{ id: 1, size: null, type: null, unitNumber: '', fullness: '5' }]);
  const [stopDetails, setStopDetails] = useState('');
  const [stopBelongingsAmount, setStopBelongingsAmount] = useState('2');
  const [stopHeavyItems, setStopHeavyItems] = useState<string[]>([]);

  // Options
  const propertyTypes = [
    { id: 'home', label: 'Home/Townhouse' },
    { id: 'apartment', label: 'Apartment' },
    { id: 'office', label: 'Office' },
    { id: 'storage', label: 'Storage' },
  ];
  const bedroomOptions = ['1', '2', '3', '4', '5+'];
  const squareFootageOptions = ['0-1000', '1000-1500', '1500-2000', '2000-3000', '3000+'];
  const garageOptions = ['none', '1 car', '2 car', '3+ car'];
  const storiesOptions = ['1', '2', '3'];
  const unitSizeOptions = ['5x5', '5x10', '5x15', '10x10', '10x15', '10x20', '10x25', '10x30'];
  const heavyItemOptions = ['TVs over 45"', 'Piano', 'Gun Safe', 'Exercise Equipment', 'Purple/Green Mattress', 'Shop/Garage', 'Pool Table'];

  // Field visibility helper
  const getFieldVisibility = (propertyType: PropertyType) => ({
    showBedrooms: propertyType === 'home' || propertyType === 'apartment',
    showSquareFootage: propertyType === 'home' || propertyType === 'apartment' || propertyType === 'office',
    showGarage: propertyType === 'home',
    showStories: propertyType === 'home',
    showUnitSize: propertyType === 'storage',
    showFloorLevel: propertyType === 'apartment' || propertyType === 'office' || propertyType === 'storage',
    showElevator: propertyType === 'apartment' || propertyType === 'office',
  });

  const fromFields = getFieldVisibility(fromPropertyType);
  const toFields = getFieldVisibility(toPropertyType);
  const stopFields = getFieldVisibility(stopPropertyType);

  // Handle property type changes (reset dependent fields)
  const handleFromPropertyTypeChange = (type: PropertyType) => {
    setFromPropertyType(type);
    setFromBedrooms(null);
    setFromSquareFootage(null);
    setFromGarage(null);
    setFromStories(null);
    setFromStorageUnits([{ id: 1, size: null, type: null, unitNumber: '', fullness: '5' }]);
    setFromFloorLevel('1');
    setFromElevator(null);
    setBelongingsAmount('8');
    setHeavyItems([]);
    // Reset heavy item sub-selections
    setGunSafeOver300(null);
    setGunSafeGroundLevel(null);
    setPianoType(null);
    setPianoGroundLevel(null);
    setPoolTableDisassembly(null);
    setPoolTableGroundLevel(null);
    setMattressGroundLevel(null);
    setTvCount(null);
    setExerciseEquipmentTypes([]);
    setToolTypes([]);
    setToolOtherText('');
  };

  const handleToPropertyTypeChange = (type: PropertyType) => {
    setToPropertyType(type);
    setToStories(null);
    setToStorageUnits([{ id: 1, size: null, type: null, unitNumber: '', fullness: '5' }]);
    setToFloorLevel('1');
    setToElevator(null);
  };

  const handleStopPropertyTypeChange = (type: PropertyType) => {
    setStopPropertyType(type);
    setStopAction(null);
    setStopBedrooms(null);
    setStopSquareFootage(null);
    setStopGarage(null);
    setStopStories(null);
    setStopStorageUnits([{ id: 1, size: null, type: null, unitNumber: '', fullness: '5' }]);
    setStopFloorLevel('1');
    setStopElevator(null);
  };

  // Handle "current home" mutual exclusivity
  const handleFromCurrentHomeChange = (checked: boolean) => {
    if (checked) {
      setFromIsCurrentHome(true);
      setToIsCurrentHome(false);
    } else {
      setFromIsCurrentHome(false);
      setToIsCurrentHome(true);
    }
  };

  const handleToCurrentHomeChange = (checked: boolean) => {
    if (checked) {
      setToIsCurrentHome(true);
      setFromIsCurrentHome(false);
    } else {
      setToIsCurrentHome(false);
      setFromIsCurrentHome(true);
    }
  };

  // Format number with commas for display
  const formatNumberWithCommas = (value: string | null): string => {
    if (!value) return '';
    const num = value.replace(/,/g, '');
    if (!num || isNaN(Number(num))) return value;
    return Number(num).toLocaleString();
  };

  // Fetch property data from Zillow for FROM address
  const fetchFromPropertyData = async () => {
    if (!fromAddress) {
      alert('Please enter an address first');
      return;
    }

    setIsLoadingFromProperty(true);
    try {
      const response = await fetch('/api/move-wt/get-property-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fromAddress }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Validate square feet (must be between 500 and 8000)
        const squareFeet = result.data.squareFeet;
        const validSquareFeet = (squareFeet && squareFeet >= 500 && squareFeet <= 8000)
          ? squareFeet.toString()
          : null;

        // Validate estimated value (must be between $50,000 and $5,000,000)
        const estimatedValue = result.data.estimatedValue;
        const validEstimatedValue = (estimatedValue && estimatedValue >= 50000 && estimatedValue <= 5000000)
          ? estimatedValue.toString()
          : null;

        if (validSquareFeet) setFromSquareFootage(validSquareFeet);
        if (validEstimatedValue) setFromZestimate(validEstimatedValue);
      } else {
        alert(result.message || 'Could not fetch property data');
      }
    } catch (error) {
      console.error('[Fetch From Property] Error:', error);
      alert('Failed to fetch property data');
    } finally {
      setIsLoadingFromProperty(false);
    }
  };

  // Fetch property data from Zillow for TO address
  const fetchToPropertyData = async () => {
    if (!toAddress) {
      alert('Please enter an address first');
      return;
    }

    setIsLoadingToProperty(true);
    try {
      const response = await fetch('/api/move-wt/get-property-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: toAddress }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Validate square feet (must be between 500 and 8000)
        const squareFeet = result.data.squareFeet;
        const validSquareFeet = (squareFeet && squareFeet >= 500 && squareFeet <= 8000)
          ? squareFeet.toString()
          : null;

        // Validate estimated value (must be between $50,000 and $5,000,000)
        const estimatedValue = result.data.estimatedValue;
        const validEstimatedValue = (estimatedValue && estimatedValue >= 50000 && estimatedValue <= 5000000)
          ? estimatedValue.toString()
          : null;

        if (validSquareFeet) setToSquareFootage(validSquareFeet);
        if (validEstimatedValue) setToZestimate(validEstimatedValue);
      } else {
        alert(result.message || 'Could not fetch property data');
      }
    } catch (error) {
      console.error('[Fetch To Property] Error:', error);
      alert('Failed to fetch property data');
    } finally {
      setIsLoadingToProperty(false);
    }
  };

  // Calculate quote based on form data - using Top Shelf Website formulas
  const calculateQuote = () => {
    const items: QuoteItem[] = [];

    // Constants from Top Shelf Website
    const HOURLY_RATE_PER_MOVER = 85;
    const DEADHEAD_HOURLY_RATE = 170; // Fixed rate for travel to/from shop
    const TRUCK_MINIMUM = 510; // 6 labor hours
    const LABOR_ONLY_MINIMUM = 170; // 2 labor hours
    const FREE_MILES = 15;
    const PRICE_PER_MILE = 2;

    // Helper: Parse square footage range to average
    const parseSquareFootage = (sqft: string | null): number => {
      if (!sqft) return 0;
      const ranges: Record<string, number> = {
        '0-1000': 750, '1000-1500': 1250, '1500-2000': 1750,
        '2000-3000': 2500, '3000+': 3500,
      };
      // If it's a direct number, use it
      const directNum = parseInt((sqft || '0').replace(/,/g, ''));
      return ranges[sqft] || directNum || 0;
    };

    // Helper: Parse belongings amount (slider 0-10 → percentage)
    const parseBelongingsPercent = (amount: string): number => {
      const val = parseInt(amount);
      if (val === 0) return 0.01;
      return val * 0.1; // 1→10%, 2→20%, ... 10→100%
    };

    // Helper: Calculate storage unit labor
    const calcStorageLabor = (units: StorageUnit[]): number => {
      let labor = 0;
      for (const unit of units) {
        const sizeMap: Record<string, number> = {
          '5x5': 25, '5x10': 50, '5x15': 75, '10x10': 100,
          '10x15': 150, '10x20': 200, '10x25': 250, '10x30': 300,
        };
        const sqft = sizeMap[unit.size || ''] || 0;
        const fullnessVal = parseInt(unit.fullness || '5');
        const fullnessPercent = fullnessVal === 0 ? 0.01 : fullnessVal * 0.1;
        const conditionedMult = unit.type === 'conditioned' ? 1.3 : 1.0;
        labor += 2.6 * sqft * fullnessPercent * conditionedMult;
      }
      return labor;
    };

    // Helper: Calculate unloading truck labor
    const calcTruckLabor = (trucks: typeof unloadingTrucks): number => {
      let labor = 0;
      for (const truck of trucks) {
        const lengthMap: Record<string, number> = {
          '8ft': 64, '10ft': 80, '12ft': 96, '15ft': 120,
          '16ft': 128, '20ft': 160, '26ft': 208,
        };
        const sqft = lengthMap[truck.length || ''] || 0;
        const fullnessVal = parseInt(truck.fullness || '8');
        const fullnessPercent = fullnessVal === 0 ? 0.01 : fullnessVal * 0.1;
        labor += 2.6 * sqft * fullnessPercent;
      }
      return labor;
    };

    // Helper: Get number of movers based on load/unload cost
    const getNumMovers = (cost: number): number => {
      if (cost < 600) return 2;
      if (cost < 1400) return 3;
      if (cost < 2800) return 4;
      return 5;
    };

    // Helper: Check stairs fee
    const hasStairs = (propType: string | null, stories: string | null, floor: string, elevator: 'yes' | 'no' | null): boolean => {
      const storyCount = parseInt(stories || '1');
      const floorNum = parseInt(floor) || 1;
      if (propType === 'home' && storyCount > 1) return true;
      if ((propType === 'apartment' || propType === 'office') && floorNum >= 2 && elevator !== 'yes') return true;
      return false;
    };

    // Helper: Format duration for display
    const formatDuration = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (hours > 0) return `${hours}hr ${mins}min`;
      return `${mins}min`;
    };

    const isLaborOnly = serviceType === 'labor';
    const minimum = isLaborOnly ? LABOR_ONLY_MINIMUM : TRUCK_MINIMUM;

    // ===== 1. CALCULATE LOAD/UNLOAD COST =====
    let loadUnloadCost = 0;

    if (isLaborOnly && laborServiceType === 'unloading') {
      loadUnloadCost = calcTruckLabor(unloadingTrucks);
    } else if (fromPropertyType === 'storage' && fromStorageUnits.length > 0) {
      loadUnloadCost = calcStorageLabor(fromStorageUnits);
    } else {
      const sqft = parseSquareFootage(fromSquareFootage);
      const belongingsPercent = parseBelongingsPercent(belongingsAmount);
      loadUnloadCost = 0.80 * sqft * belongingsPercent;
    }

    // Add Stop labor if pickup
    if (hasStop && stopAction === 'pickup' && stopPropertyType === 'storage' && stopStorageUnits.length > 0) {
      loadUnloadCost += calcStorageLabor(stopStorageUnits);
    } else if (hasStop && stopAction === 'pickup') {
      const stopSqft = parseSquareFootage(stopSquareFootage);
      const stopBelongingsPercent = parseBelongingsPercent(stopBelongingsAmount);
      loadUnloadCost += 0.80 * stopSqft * stopBelongingsPercent;
    }

    // ===== 2. NUMBER OF MOVERS =====
    const numMovers = isLaborOnly ? 2 : getNumMovers(loadUnloadCost);

    // ===== 3. LABOR DRIVE TIME (between customer stops) =====
    let laborDriveMins = 0;
    let moveTravelMiles = 0;
    if (!isLaborOnly && totalDuration) {
      const hourMatch = totalDuration.match(/(\d+)\s*h/i);
      const minMatch = totalDuration.match(/(\d+)\s*min/i);
      if (hourMatch) laborDriveMins += parseInt(hourMatch[1]) * 60;
      if (minMatch) laborDriveMins += parseInt(minMatch[1]);
    }
    if (!isLaborOnly && totalDistance) {
      moveTravelMiles = parseFloat(totalDistance.replace(/[^\d.]/g, '')) || 0;
    }
    const laborDriveCost = (laborDriveMins / 60) * HOURLY_RATE_PER_MOVER * numMovers;

    // ===== 4. BASE MOVING LABOR =====
    let baseMovingLabor = Math.max(loadUnloadCost + laborDriveCost, minimum);
    const materialsCharge = Math.round(baseMovingLabor * 0.05);

    // Build Moving sub-items (matching website)
    const movingSubItems: QuoteSubItem[] = [];
    movingSubItems.push({
      description: 'Completed Move',
      amount: Math.round(baseMovingLabor)
    });
    movingSubItems.push({
      description: 'Materials and Supplies',
      amount: materialsCharge,
      details: '*Only charged if used'
    });

    items.push({
      description: 'Moving',
      amount: Math.round(baseMovingLabor + materialsCharge),
      subItems: movingSubItems
    });

    // ===== 5. TRAVEL =====
    // Use actual deadhead data if available, otherwise estimate
    let travelToStartMiles: number;
    let travelToStartMins: number;
    let returnTravelMiles: number;
    let returnTravelMins: number;

    if (deadhead) {
      // Use actual Google Maps calculated distances
      travelToStartMiles = deadhead.toStartMiles;
      travelToStartMins = deadhead.toStartMins;
      returnTravelMiles = deadhead.returnMiles;
      returnTravelMins = deadhead.returnMins;
    } else {
      // Fallback estimate: assume 10 miles / 15 min each way
      travelToStartMiles = 10;
      travelToStartMins = 15;
      returnTravelMiles = 10;
      returnTravelMins = 15;
    }

    // Apply FREE_MILES discount
    let remainingFreeMiles = FREE_MILES;
    const travelToStartBillableMiles = Math.max(0, travelToStartMiles - remainingFreeMiles);
    remainingFreeMiles = Math.max(0, remainingFreeMiles - travelToStartMiles);
    const moveTravelBillableMiles = Math.max(0, moveTravelMiles - remainingFreeMiles);
    remainingFreeMiles = Math.max(0, remainingFreeMiles - moveTravelMiles);
    const returnTravelBillableMiles = Math.max(0, returnTravelMiles - remainingFreeMiles);

    // Calculate travel charges
    const travelToStartCharge = (travelToStartBillableMiles * PRICE_PER_MILE) + ((travelToStartMins / 60) * DEADHEAD_HOURLY_RATE);
    const moveTravelCharge = moveTravelBillableMiles * PRICE_PER_MILE;
    const returnTravelCharge = (returnTravelBillableMiles * PRICE_PER_MILE) + ((returnTravelMins / 60) * DEADHEAD_HOURLY_RATE);

    const rawTravelCharge = travelToStartCharge + moveTravelCharge + returnTravelCharge;
    const isMinimumTravel = rawTravelCharge < 100;
    const totalTravelCharge = Math.max(100, rawTravelCharge);

    // Build travel sub-items
    const travelSubItems: QuoteSubItem[] = [];
    if (!isMinimumTravel) {
      travelSubItems.push({
        description: 'Travel to Start',
        amount: Math.round(travelToStartCharge),
        details: `(${travelToStartMiles.toFixed(1)} mi, ${formatDuration(travelToStartMins)})`
      });
      if (!isLaborOnly && moveTravelMiles > 0) {
        travelSubItems.push({
          description: 'Move Travel',
          amount: Math.round(moveTravelCharge),
          details: `(${moveTravelMiles.toFixed(1)} mi, ${formatDuration(laborDriveMins)})`
        });
      }
      travelSubItems.push({
        description: 'Return Travel',
        amount: Math.round(returnTravelCharge),
        details: `(${returnTravelMiles.toFixed(1)} mi, ${formatDuration(returnTravelMins)})`
      });
    }

    items.push({
      description: 'Travel',
      amount: Math.round(totalTravelCharge),
      subItems: travelSubItems.length > 0 ? travelSubItems : undefined,
      details: !isMinimumTravel ? 'First 15 miles included' : undefined
    });

    // ===== 6. STAIRS FEES =====
    if (hasStairs(fromPropertyType, fromStories, fromFloorLevel, fromElevator)) {
      items.push({ description: 'Pickup Location Stairs', amount: 25 });
    }
    if (hasStop && hasStairs(stopPropertyType, stopStories, stopFloorLevel, stopElevator)) {
      items.push({ description: 'Stop Location Stairs', amount: 25 });
    }
    if (!isLaborOnly && hasStairs(toPropertyType, toStories, toFloorLevel, toElevator)) {
      items.push({ description: 'Delivery Location Stairs', amount: 25 });
    }

    // ===== 7. HEAVY ITEMS =====
    const heavySubItems: QuoteSubItem[] = [];
    let heavyTotal = 0;

    heavyItems.forEach(item => {
      switch (item) {
        case 'gun-safe':
          heavyTotal += 100;
          heavySubItems.push({
            description: '* Gun Safe (over 300lbs)',
            amount: 100,
            alert: 'Must be on ground level with no more than 2 steps'
          });
          break;
        case 'piano':
          heavyTotal += 100;
          heavySubItems.push({
            description: '* Piano',
            amount: 100,
            alert: 'Must be on ground level with no more than 2 steps'
          });
          break;
        case 'pool-table':
          heavyTotal += 100;
          heavySubItems.push({
            description: '* Pool Table',
            amount: 100,
            alert: 'Must be on ground level with no more than 2 steps'
          });
          break;
        case 'hot-tub':
          heavyTotal += 100;
          heavySubItems.push({
            description: '* Hot Tub',
            amount: 100,
            alert: 'Must be on ground level with no more than 2 steps'
          });
          break;
        case 'tvs':
          const count = parseInt(tvCount || '1');
          heavyTotal += 60 * count;
          heavySubItems.push({
            description: `TV${count > 1 ? `s (${count})` : ''} over 45"`,
            amount: 60 * count
          });
          break;
      }
    });

    if (heavyTotal > 0) {
      items.push({
        description: 'Heavy/Special Items',
        amount: heavyTotal,
        subItems: heavySubItems
      });
    }

    // ===== 8. BOXING & PACKING =====
    const packingLevel = parseInt(packingAmount);
    let packingCost = 0;
    if (packingLevel > 0) {
      const packingPercent = packingLevel * 0.1;
      const maxPackingCost = loadUnloadCost * 0.5;
      packingCost = Math.round(maxPackingCost * packingPercent);
      if (packingCost > 0) {
        const packingLabels = ['', 'A few items', 'A little bit', 'Some items', 'Less than half',
          'About half', 'More than half', 'Most items', 'Almost everything', 'Nearly all', 'Everything'];

        const packingSubItems: QuoteSubItem[] = [{
          description: packingLabels[packingLevel] || `${packingLevel * 10}% of items`,
          amount: packingCost,
          details: packingRooms.length > 0 ? packingRooms.join(', ') : undefined
        }];

        items.push({
          description: 'Boxing & Packing',
          amount: packingCost,
          subItems: packingSubItems
        });
      }
    }

    // ===== 9. JUNK REMOVAL =====
    const junkLevel = parseInt(junkRemovalAmount);
    let junkCost = 0;
    if (junkLevel > 0) {
      const junkPrices = [0, 100, 175, 250, 325, 380, 435, 470, 500];
      junkCost = junkPrices[junkLevel] || 0;
      const junkLabels = ['None', '1/8 load', '1/4 load', '3/8 load', '1/2 load', '5/8 load', '3/4 load', '7/8 load', 'Full load'];

      items.push({
        description: 'Junk Removal',
        amount: junkCost,
        subItems: [{
          description: junkLabels[junkLevel],
          amount: junkCost
        }]
      });
    }

    // ===== 10. CALCULATE TOTALS =====
    const total = items.reduce((sum, item) => sum + item.amount, 0);

    // Calculate category totals for range display (matching website)
    let movingLabor = Math.round(baseMovingLabor);
    let movingMaterials = materialsCharge;
    let otherServices = packingCost + junkCost;
    let fixedTotal = Math.round(totalTravelCharge);

    // Add stairs to fixed
    if (hasStairs(fromPropertyType, fromStories, fromFloorLevel, fromElevator)) fixedTotal += 25;
    if (hasStop && hasStairs(stopPropertyType, stopStories, stopFloorLevel, stopElevator)) fixedTotal += 25;
    if (!isLaborOnly && hasStairs(toPropertyType, toStories, toFloorLevel, toElevator)) fixedTotal += 25;

    // Add heavy items to fixed
    fixedTotal += heavyTotal;

    setQuote({
      items,
      total,
      movingLabor,
      movingMaterials,
      otherServices,
      fixedTotal,
      minimumCharge: minimum
    });
  };

  // Recalculate quote when relevant data changes
  useEffect(() => {
    calculateQuote();
  }, [
    serviceType, laborServiceType, fromSquareFootage, belongingsAmount,
    fromPropertyType, fromStories, fromFloorLevel, fromElevator, fromStorageUnits,
    toPropertyType, toStories, toFloorLevel, toElevator,
    hasStop, stopAction, stopPropertyType, stopSquareFootage, stopBelongingsAmount,
    stopStories, stopFloorLevel, stopElevator, stopStorageUnits,
    heavyItems, tvCount, packingAmount, junkRemovalAmount,
    totalDistance, totalDuration, unloadingTrucks, deadhead
  ]);

  // Helper function to get 3 days around selected date, skipping Sundays
  const getThreeDaysAroundDate = (selectedDateStr: string): string[] => {
    const selectedDate = new Date(selectedDateStr + 'T12:00:00'); // Noon to avoid timezone issues
    const days: string[] = [];

    // Get day before (skip Sunday - go to Saturday)
    let prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    if (prevDate.getDay() === 0) { // Sunday
      prevDate.setDate(prevDate.getDate() - 1); // Go to Saturday
    }
    days.push(prevDate.toISOString().split('T')[0]);

    // Selected date (if Sunday, this shouldn't happen but handle it)
    days.push(selectedDateStr);

    // Get day after (skip Sunday - go to Monday)
    let nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    if (nextDate.getDay() === 0) { // Sunday
      nextDate.setDate(nextDate.getDate() + 1); // Go to Monday
    }
    days.push(nextDate.toISOString().split('T')[0]);

    return days;
  };

  // Format date for display
  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Shift date by days, skipping Sundays
  const shiftDateSkippingSundays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr + 'T12:00:00');
    let shifted = new Date(date);
    const direction = days > 0 ? 1 : -1;
    let remaining = Math.abs(days);

    while (remaining > 0) {
      shifted.setDate(shifted.getDate() + direction);
      // Skip Sundays (day 0)
      if (shifted.getDay() !== 0) {
        remaining--;
      }
    }

    return shifted.toISOString().split('T')[0];
  };

  // Navigate calendar left/right
  const handleCalendarNav = (direction: 'prev' | 'next') => {
    if (!moveDate) return;
    const newDate = shiftDateSkippingSundays(moveDate, direction === 'next' ? 1 : -1);
    setMoveDate(newDate);
  };

  // Parse time string like "8:00 AM" or "2:30 PM" to minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 480; // Default to 8am
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return 480;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Fetch calendar data when moveDate changes
  useEffect(() => {
    if (!moveDate) {
      setCalendarDays([]);
      return;
    }

    const fetchCalendarData = async () => {
      setIsLoadingCalendar(true);
      try {
        const threeDates = getThreeDaysAroundDate(moveDate);

        // Fetch jobs for all 3 dates in parallel
        const [jobResponses, techsResponse] = await Promise.all([
          Promise.all(
            threeDates.map(date =>
              fetch(`/api/schedule?date=${date}`).then(res => res.json())
            )
          ),
          fetch(`/api/homebase/schedule?dates=${threeDates.join(',')}`).then(res => res.json()).catch(() => ({ data: [] }))
        ]);

        const calendarData: CalendarDay[] = threeDates.map((date, index) => ({
          date,
          dateLabel: formatDateLabel(date),
          dayName: getDayName(date),
          jobs: (jobResponses[index]?.jobs || []).map((job: any) => {
            const startMins = parseTimeToMinutes(job.startTime);
            let endMins = parseTimeToMinutes(job.endTime);
            // If no end time or end is before start, assume 2 hour duration
            if (!job.endTime || endMins <= startMins) {
              endMins = startMins + 120;
            }
            return {
              id: job.id,
              serialId: job.serialId,
              customerName: job.customerName || 'No Name',
              startTime: job.startTime || '',
              endTime: job.endTime || '',
              startMinutes: startMins,
              endMinutes: endMins,
              jobType: job.jobType || '',
              status: job.status || '',
              tags: job.tags || [],
            };
          }),
          isSelected: date === moveDate,
        }));

        setCalendarDays(calendarData);

        // Set techs data
        if (techsResponse?.data) {
          setCalendarTechs(techsResponse.data);
        } else {
          setCalendarTechs([]);
        }
      } catch (error) {
        console.error('Failed to fetch calendar data:', error);
        setCalendarDays([]);
        setCalendarTechs([]);
      } finally {
        setIsLoadingCalendar(false);
      }
    };

    fetchCalendarData();
  }, [moveDate]);

  // Handle save estimate
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        // Include existing ID for updates
        estimateId: currentEstimateId,

        // Customer Info
        fullName: customerName,
        phone: customerPhone,
        email: customerEmail,

        // Service Type
        serviceType: serviceType,

        // Labor-specific fields
        laborServiceType: laborServiceType,
        laborItemAmount: laborItemAmount,
        loadingItemAmount: loadingItemAmount,
        officeItemAmount: officeItemAmount,
        truckPodLengths: truckPodLengths,
        unloadingTrucks: unloadingTrucks,
        unloadingStorageType: unloadingStorageType,

        // FROM Location
        fromAddress: fromAddress,
        fromUnit: fromUnit,
        fromPropertyType: fromPropertyType,
        fromBedrooms: fromBedrooms,
        fromSquareFootage: fromSquareFootage,
        fromZestimate: fromZestimate,
        fromGarage: fromGarage,
        fromStories: fromStories,
        fromFloorLevel: fromFloorLevel,
        fromElevator: fromElevator,
        fromStorageUnits: fromStorageUnits,
        fromIsCurrentHome: fromIsCurrentHome,
        fromDetails: fromDetails,

        // TO Location
        toAddress: toAddress,
        toUnit: toUnit,
        toPropertyType: toPropertyType,
        toSquareFootage: toSquareFootage,
        toZestimate: toZestimate,
        toStories: toStories,
        toFloorLevel: toFloorLevel,
        toElevator: toElevator,
        toStorageUnits: toStorageUnits,
        toIsCurrentHome: toIsCurrentHome,
        toDetails: toDetails,

        // STOP Location
        hasStop: hasStop,
        stopAddress: stopAddress,
        stopUnit: stopUnit,
        stopPropertyType: stopPropertyType,
        stopAction: stopAction,
        stopBedrooms: stopBedrooms,
        stopSquareFootage: stopSquareFootage,
        stopGarage: stopGarage,
        stopStories: stopStories,
        stopFloorLevel: stopFloorLevel,
        stopElevator: stopElevator,
        stopStorageUnits: stopStorageUnits,
        stopDetails: stopDetails,
        stopBelongingsAmount: stopBelongingsAmount,
        stopHeavyItems: stopHeavyItems,

        // Belongings & Heavy Items
        belongingsAmount: belongingsAmount,
        heavyItems: heavyItems,
        gunSafeOver300: gunSafeOver300,
        gunSafeGroundLevel: gunSafeGroundLevel,
        pianoType: pianoType,
        pianoGroundLevel: pianoGroundLevel,
        poolTableDisassembly: poolTableDisassembly,
        poolTableGroundLevel: poolTableGroundLevel,
        mattressGroundLevel: mattressGroundLevel,
        tvCount: tvCount,
        exerciseEquipmentTypes: exerciseEquipmentTypes,
        toolTypes: toolTypes,
        toolOtherText: toolOtherText,

        // Route Info
        totalDistance: totalDistance,
        totalDuration: totalDuration,

        // Other Services
        packingAmount: packingAmount,
        packingRooms: packingRooms,
        junkRemovalAmount: junkRemovalAmount,
      };

      const response = await fetch('/api/move-wt-new/save-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        // Update IDs if this was a new estimate
        if (result.estimate?.id) setCurrentEstimateId(result.estimate.id);
        if (result.quoteId) setCurrentQuoteId(result.quoteId);

        setSaveMessage({
          type: 'success',
          text: result.isUpdate ? 'Estimate updated!' : `Saved! Quote ID: ${result.quoteId || result.estimate?.quote_id}`,
        });

        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save estimate' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle labor service type change - reset relevant fields
  const handleLaborServiceTypeChange = (type: string) => {
    setLaborServiceType(type);
    // Reset slider values to defaults
    setLaborItemAmount('2');
    setLoadingItemAmount('7');
    setOfficeItemAmount('7');
    // Reset truck/pod selections
    setTruckPodLengths(['']);
    setUnloadingTrucks([{ id: 1, length: null, fullness: '8' }]);
    setUnloadingStorageType(null);
    // Reset property type
    setFromPropertyType('home');
    setFromStorageUnits([{ id: 1, size: null, type: null, unitNumber: '', fullness: '5' }]);
    // Reset heavy items
    setHeavyItems([]);
    setGunSafeOver300(null);
    setGunSafeGroundLevel(null);
    setPianoType(null);
    setPianoGroundLevel(null);
    setPoolTableDisassembly(null);
    setPoolTableGroundLevel(null);
    setMattressGroundLevel(null);
    setTvCount(null);
    setExerciseEquipmentTypes([]);
    setToolTypes([]);
    setToolOtherText('');
    // Reset floor/elevator
    setFromFloorLevel('1');
    setFromElevator(null);
  };

  // Truck/POD helpers for loading
  const addTruckPod = () => {
    setTruckPodLengths(prev => [...prev, '']);
  };

  const removeTruckPod = (index: number) => {
    setTruckPodLengths(prev => prev.filter((_, i) => i !== index));
  };

  const updateTruckPodLength = (index: number, length: string) => {
    setTruckPodLengths(prev => prev.map((l, i) => i === index ? length : l));
  };

  // Unloading truck helpers
  const addUnloadingTruck = () => {
    setUnloadingTrucks(prev => [...prev, { id: Date.now(), length: null, fullness: '8' }]);
  };

  const removeUnloadingTruck = (id: number) => {
    setUnloadingTrucks(prev => prev.filter(t => t.id !== id));
  };

  const updateUnloadingTruck = (id: number, field: 'length' | 'fullness', value: string | null) => {
    setUnloadingTrucks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // Storage unit helpers
  const addStorageUnit = (location: 'from' | 'to' | 'stop') => {
    const newUnit: StorageUnit = { id: Date.now(), size: null, type: null, unitNumber: '', fullness: '5' };
    if (location === 'from') {
      setFromStorageUnits(prev => [...prev, newUnit]);
    } else if (location === 'to') {
      setToStorageUnits(prev => [...prev, newUnit]);
    } else {
      setStopStorageUnits(prev => [...prev, newUnit]);
    }
  };

  const removeStorageUnit = (location: 'from' | 'to' | 'stop', unitId: number) => {
    if (location === 'from') {
      setFromStorageUnits(prev => prev.filter(u => u.id !== unitId));
    } else if (location === 'to') {
      setToStorageUnits(prev => prev.filter(u => u.id !== unitId));
    } else {
      setStopStorageUnits(prev => prev.filter(u => u.id !== unitId));
    }
  };

  const updateStorageUnit = (location: 'from' | 'to' | 'stop', unitId: number, field: keyof StorageUnit, value: string | null) => {
    const updateFn = (units: StorageUnit[]) =>
      units.map(u => u.id === unitId ? { ...u, [field]: value } : u);
    if (location === 'from') {
      setFromStorageUnits(prev => updateFn(prev));
    } else if (location === 'to') {
      setToStorageUnits(prev => updateFn(prev));
    } else {
      setStopStorageUnits(prev => updateFn(prev));
    }
  };

  // Heavy item toggle
  const toggleHeavyItem = (item: string) => {
    setHeavyItems(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const toggleExerciseEquipment = (type: string) => {
    setExerciseEquipmentTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleToolType = (type: string) => {
    setToolTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleStopHeavyItem = (item: string) => {
    setStopHeavyItems(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  // Remove stop
  const handleRemoveStop = () => {
    setHasStop(false);
    setStopAddress('');
    setStopUnit('');
    setStopPropertyType('home');
    setStopAction(null);
    setStopBedrooms(null);
    setStopSquareFootage(null);
    setStopGarage(null);
    setStopStories(null);
    setStopStorageUnits([{ id: 1, size: null, type: null, unitNumber: '', fullness: '5' }]);
    setStopFloorLevel('1');
    setStopElevator(null);
    setStopDetails('');
    setStopBelongingsAmount('2');
    setStopHeavyItems([]);
  };

  // Belongings label
  const getBelongingsLabel = (val: string) => {
    const num = parseInt(val);
    const labels = ['A few items', 'A little bit', 'Some items', 'A fair amount', 'Quite a bit', 'About half', 'More than half', 'Most of it', 'Almost all', 'Nearly everything', 'Everything'];
    return labels[num] || labels[8];
  };

  const getStorageFullnessLabel = (val: string) => {
    const num = parseInt(val || '5');
    const labels = ['Nearly Empty', 'Mostly Empty', 'Quite Empty', 'Somewhat Empty', 'Less than Half', 'About Half', 'More than Half', 'Fairly Full', 'Mostly Full', 'Almost Full', 'Packed Full'];
    return labels[num] || labels[8];
  };

  // Fetch recent estimates on mount
  useEffect(() => {
    const fetchRecentEstimates = async () => {
      try {
        const response = await fetch('/api/move-wt-new/recent-estimates?limit=6');
        const data = await response.json();
        if (data.success && data.estimates) {
          setRecentEstimates(data.estimates);
        }
      } catch (error) {
        console.error('Failed to fetch recent estimates:', error);
      } finally {
        setIsLoadingRecentEstimates(false);
      }
    };
    fetchRecentEstimates();
  }, []);

  // Handler for tile click - fetch estimate by phone number
  const handleTileClick = async (phoneNumber: string, displayName: string) => {
    console.log('Selected:', displayName, phoneNumber);
    if (!phoneNumber) return;

    setIsLoadingJob(true);
    try {
      const response = await fetch('/api/move-wt-new/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchType: 'phone', searchValue: phoneNumber }),
      });

      const data = await response.json();
      if (data.success && data.estimates && data.estimates.length > 0) {
        // Load the most recent estimate (first one, sorted by updated_at desc)
        loadSearchResult(data.estimates[0]);
      }
    } catch (error) {
      console.error('Failed to load estimate:', error);
    } finally {
      setIsLoadingJob(false);
    }
  };

  // Search handler
  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch('/api/move-wt-new/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchType, searchValue: searchValue.trim() }),
      });

      const data = await response.json();
      if (data.success && data.estimates) {
        if ((searchType === 'workizJob' || searchType === 'quoteId') && data.estimates.length === 1) {
          loadSearchResult(data.estimates[0]);
        } else {
          setSearchResults(data.estimates);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchValue('');
    setSearchResults([]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadSearchResult = (estimate: any) => {
    console.log('Loading estimate:', estimate);
    setSearchResults([]);

    // Track the estimate ID for saving
    if (estimate.id) setCurrentEstimateId(estimate.id);
    if (estimate.quote_id) setCurrentQuoteId(estimate.quote_id);

    // Customer info
    if (estimate.full_name) setCustomerName(estimate.full_name);
    if (estimate.phone) setCustomerPhone(estimate.phone);
    if (estimate.email) setCustomerEmail(estimate.email);

    // Service type
    if (estimate.service_type) setServiceType(estimate.service_type);

    // Labor-specific fields
    if (estimate.labor_service_type) setLaborServiceType(estimate.labor_service_type);
    if (estimate.labor_item_amount) setLaborItemAmount(estimate.labor_item_amount);
    if (estimate.loading_item_amount) setLoadingItemAmount(estimate.loading_item_amount);
    if (estimate.office_item_amount) setOfficeItemAmount(estimate.office_item_amount);
    if (estimate.truck_pod_lengths) setTruckPodLengths(estimate.truck_pod_lengths);
    if (estimate.unloading_trucks) setUnloadingTrucks(estimate.unloading_trucks);
    if (estimate.unloading_storage_type) setUnloadingStorageType(estimate.unloading_storage_type);

    // FROM Location Fields
    if (estimate.from_address) setFromAddress(estimate.from_address);
    if (estimate.from_unit) setFromUnit(estimate.from_unit);
    if (estimate.from_property_type) setFromPropertyType(estimate.from_property_type);
    if (estimate.from_bedrooms) setFromBedrooms(estimate.from_bedrooms);
    if (estimate.from_square_footage) setFromSquareFootage(estimate.from_square_footage);
    if (estimate.from_garage) setFromGarage(estimate.from_garage);
    if (estimate.from_stories) setFromStories(estimate.from_stories);
    if (estimate.from_floor_level) setFromFloorLevel(estimate.from_floor_level);
    if (estimate.from_elevator) setFromElevator(estimate.from_elevator);
    if (estimate.from_storage_units) setFromStorageUnits(estimate.from_storage_units);
    if (estimate.from_is_current_home !== null && estimate.from_is_current_home !== undefined) {
      setFromIsCurrentHome(estimate.from_is_current_home);
    }
    if (estimate.from_details) setFromDetails(estimate.from_details);

    // TO Location Fields
    if (estimate.to_address) setToAddress(estimate.to_address);
    if (estimate.to_unit) setToUnit(estimate.to_unit);
    if (estimate.to_property_type) setToPropertyType(estimate.to_property_type);
    if (estimate.to_stories) setToStories(estimate.to_stories);
    if (estimate.to_floor_level) setToFloorLevel(estimate.to_floor_level);
    if (estimate.to_elevator) setToElevator(estimate.to_elevator);
    if (estimate.to_storage_units) setToStorageUnits(estimate.to_storage_units);
    if (estimate.to_is_current_home !== null && estimate.to_is_current_home !== undefined) {
      setToIsCurrentHome(estimate.to_is_current_home);
    }
    if (estimate.to_details) setToDetails(estimate.to_details);

    // STOP Location Fields
    if (estimate.has_stop) setHasStop(estimate.has_stop);
    if (estimate.stop_address) setStopAddress(estimate.stop_address);
    if (estimate.stop_unit) setStopUnit(estimate.stop_unit);
    if (estimate.stop_property_type) setStopPropertyType(estimate.stop_property_type);
    if (estimate.stop_action) setStopAction(estimate.stop_action);
    if (estimate.stop_bedrooms) setStopBedrooms(estimate.stop_bedrooms);
    if (estimate.stop_square_footage) setStopSquareFootage(estimate.stop_square_footage);
    if (estimate.stop_garage) setStopGarage(estimate.stop_garage);
    if (estimate.stop_stories) setStopStories(estimate.stop_stories);
    if (estimate.stop_floor_level) setStopFloorLevel(estimate.stop_floor_level);
    if (estimate.stop_elevator) setStopElevator(estimate.stop_elevator);
    if (estimate.stop_storage_units) setStopStorageUnits(estimate.stop_storage_units);
    if (estimate.stop_details) setStopDetails(estimate.stop_details);
    if (estimate.stop_belongings_amount) setStopBelongingsAmount(estimate.stop_belongings_amount);
    if (estimate.stop_heavy_items) setStopHeavyItems(estimate.stop_heavy_items);

    // Belongings & Heavy Items (from location)
    if (estimate.belongings_amount) setBelongingsAmount(estimate.belongings_amount);
    if (estimate.heavy_items) setHeavyItems(estimate.heavy_items);
    if (estimate.gun_safe_over_300) setGunSafeOver300(estimate.gun_safe_over_300);
    if (estimate.gun_safe_ground_level) setGunSafeGroundLevel(estimate.gun_safe_ground_level);
    if (estimate.piano_type) setPianoType(estimate.piano_type);
    if (estimate.piano_ground_level) setPianoGroundLevel(estimate.piano_ground_level);
    if (estimate.pool_table_disassembly) setPoolTableDisassembly(estimate.pool_table_disassembly);
    if (estimate.pool_table_ground_level) setPoolTableGroundLevel(estimate.pool_table_ground_level);
    if (estimate.mattress_ground_level) setMattressGroundLevel(estimate.mattress_ground_level);
    if (estimate.tv_count) setTvCount(estimate.tv_count);
    if (estimate.exercise_equipment_types) setExerciseEquipmentTypes(estimate.exercise_equipment_types);
    if (estimate.tool_types) setToolTypes(estimate.tool_types);
    if (estimate.tool_other_text) setToolOtherText(estimate.tool_other_text);

    // Move Date/Time
    if (estimate.move_date) setMoveDate(estimate.move_date);
    if (estimate.time_slot) setTimeSlot(estimate.time_slot);
    if (estimate.move_duration) setMoveDuration(estimate.move_duration);
    if (estimate.move_date_unknown) setMoveDateUnknown(estimate.move_date_unknown);

    // Notes and Tags
    if (estimate.timing_notes) setTimingNotes(estimate.timing_notes);
    if (estimate.tags && Array.isArray(estimate.tags)) {
      // Always include 'Move' tag
      const loadedTags = estimate.tags.includes('Move') ? estimate.tags : ['Move', ...estimate.tags];
      setTags(loadedTags);
    }

    // Other Services
    if (estimate.packing_amount) setPackingAmount(estimate.packing_amount);
    if (estimate.packing_rooms) setPackingRooms(estimate.packing_rooms);
    if (estimate.junk_removal_amount) setJunkRemovalAmount(estimate.junk_removal_amount);
  };

  // Tag toggle handler - Move cannot be deselected
  const handleTagChange = (tag: string) => {
    if (tag === 'Move') return; // Move is always selected
    setTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Get tag color classes
  const getTagColorClasses = (tag: string, isSelected: boolean) => {
    if (['OOT', 'Cat', 'RN', 'ET'].includes(tag)) {
      return isSelected
        ? 'bg-red-500 text-white border-red-600'
        : 'border-red-300 text-red-700 hover:bg-red-50';
    } else if (['2', '3', '4', '5', '6+'].includes(tag)) {
      return isSelected
        ? 'bg-green-500 text-white border-green-600'
        : 'border-green-300 text-green-700 hover:bg-green-50';
    } else if (['Move', 'WT'].includes(tag)) {
      return isSelected
        ? 'bg-blue-500 text-white border-blue-600'
        : 'border-blue-300 text-blue-700 hover:bg-blue-50';
    } else if (['Trk', 'Lbr'].includes(tag)) {
      return isSelected
        ? 'bg-purple-500 text-white border-purple-600'
        : 'border-purple-300 text-purple-700 hover:bg-purple-50';
    } else if (tag === 'PM') {
      return isSelected
        ? 'bg-yellow-400 text-gray-800 border-yellow-500'
        : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50';
    }
    return isSelected
      ? 'bg-gray-500 text-white border-gray-600'
      : 'border-gray-300 text-gray-700 hover:bg-gray-50';
  };

  // Pill button component
  const PillButton = ({ selected, onClick, children, className = '' }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all whitespace-nowrap ${
        selected
          ? 'text-white border-transparent'
          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
      } ${className}`}
      style={selected ? { backgroundColor: 'rgba(6, 100, 155, 0.8)', borderColor: 'rgba(6, 100, 155, 0.8)' } : undefined}
    >
      {children}
    </button>
  );

  // Load Google Maps script
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setGoogleMapsReady(true);
      return;
    }

    window.initMoveWTMap = () => {
      setGoogleMapsReady(true);
    };

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMoveWTMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      const checkReady = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkReady);
          setGoogleMapsReady(true);
        }
      }, 100);
      setTimeout(() => clearInterval(checkReady), 10000);
    }
  }, []);

  // Initialize map when addresses are entered
  useEffect(() => {
    if (!googleMapsReady || !mapRef.current || !fromAddress) return;
    if (serviceType === 'truck' && !toAddress) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 10,
      center: { lat: 43.6150, lng: -116.2023 }, // Boise, ID
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;

    // For Labor Only - just show a single marker
    if (serviceType === 'labor') {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: fromAddress }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          map.setCenter(location);
          map.setZoom(11);
          new window.google.maps.Marker({
            map: map,
            position: location,
            title: 'Service Location',
            label: 'A',
          });
        }
      });
      setRouteLegs([]);
      setTotalDistance('');
      setTotalDuration('');
      return;
    }

    // For Bring a Truck - show route with pins
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#06649b',
        strokeWeight: 5,
      },
    });
    directionsRendererRef.current = directionsRenderer;

    const waypoints: Array<{ location: string; stopover: boolean }> = [];
    if (hasStop && stopAddress) {
      waypoints.push({ location: stopAddress, stopover: true });
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: fromAddress,
        destination: toAddress,
        waypoints: waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
          const route = result.routes[0];
          if (route && route.legs) {
            const legs = route.legs.map((leg: any, index: number) => {
              const startLabel = index === 0 ? 'A' : index === 1 ? 'B' : 'C';
              const endLabel = index === 0 ? (hasStop && stopAddress ? 'B' : 'B') : index === 1 ? 'C' : 'D';
              return {
                start: startLabel,
                end: endLabel,
                distance: leg.distance?.text || '',
                duration: leg.duration?.text || '',
              };
            });
            setRouteLegs(legs);

            let totalDistanceMeters = 0;
            let totalDurationSeconds = 0;
            route.legs.forEach((leg: any) => {
              totalDistanceMeters += leg.distance?.value || 0;
              totalDurationSeconds += leg.duration?.value || 0;
            });

            const miles = (totalDistanceMeters / 1609.34).toFixed(1);
            const hours = Math.floor(totalDurationSeconds / 3600);
            const minutes = Math.round((totalDurationSeconds % 3600) / 60);

            setTotalDistance(`${miles} mi`);
            setTotalDuration(hours > 0 ? `${hours}hr ${minutes}min` : `${minutes}min`);

            // Calculate deadhead distances (office to start, final destination to office)
            calculateDeadhead(directionsService, fromAddress, toAddress);
          }
        } else {
          setRouteLegs([]);
          setTotalDistance('');
          setTotalDuration('');
          setDeadhead(null);
        }
      }
    );
  }, [googleMapsReady, fromAddress, toAddress, hasStop, stopAddress, serviceType]);

  // Calculate deadhead distances (office to start, final destination to office)
  const calculateDeadhead = (
    directionsService: any,
    startAddress: string,
    finalAddress: string | null
  ) => {
    let toStartMiles = 0;
    let toStartMins = 0;
    let returnMiles = 0;
    let returnMins = 0;
    let completed = 0;
    const totalRequests = 2;

    const checkComplete = () => {
      completed++;
      if (completed === totalRequests) {
        setDeadhead({
          toStartMiles,
          toStartMins,
          returnMiles,
          returnMins
        });
      }
    };

    // Calculate Office -> First Stop (fromAddress)
    directionsService.route(
      {
        origin: OFFICE_ADDRESS,
        destination: startAddress,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === 'OK' && result.routes[0]?.legs[0]) {
          const leg = result.routes[0].legs[0];
          toStartMiles = (leg.distance?.value || 0) / 1609.34;
          toStartMins = (leg.duration?.value || 0) / 60;
        }
        checkComplete();
      }
    );

    // Calculate Final Stop -> Office (return travel)
    const lastStop = finalAddress || startAddress;
    directionsService.route(
      {
        origin: lastStop,
        destination: OFFICE_ADDRESS,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === 'OK' && result.routes[0]?.legs[0]) {
          const leg = result.routes[0].legs[0];
          returnMiles = (leg.distance?.value || 0) / 1609.34;
          returnMins = (leg.duration?.value || 0) / 60;
        }
        checkComplete();
      }
    );
  };

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!googleMapsReady) return;

    const idahoBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(41.988, -117.243),
      new window.google.maps.LatLng(49.001, -111.043)
    );

    const autocompleteOptions = {
      bounds: idahoBounds,
      strictBounds: true,
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'geometry'],
      types: ['geocode'],
    };

    const stripCountry = (address: string) => {
      return address.replace(/, USA$/, '').replace(/, United States$/, '');
    };

    // Initialize "From" autocomplete
    if (fromInputRef.current && !fromAutocompleteRef.current) {
      const fromAutocomplete = new window.google.maps.places.Autocomplete(
        fromInputRef.current,
        autocompleteOptions
      );
      fromAutocompleteRef.current = fromAutocomplete;

      fromAutocomplete.addListener('place_changed', () => {
        const place = fromAutocomplete.getPlace();
        if (place && place.formatted_address) {
          setFromAddress(stripCountry(place.formatted_address));
        }
      });
    }

    // Initialize "To" autocomplete (reset ref when serviceType changes to 'truck')
    // The toInputRef DOM element is conditionally rendered based on serviceType
    if (serviceType === 'truck') {
      // Small delay to ensure DOM element is available after conditional render
      const initToAutocomplete = () => {
        if (toInputRef.current && !toAutocompleteRef.current) {
          const toAutocomplete = new window.google.maps.places.Autocomplete(
            toInputRef.current,
            autocompleteOptions
          );
          toAutocompleteRef.current = toAutocomplete;

          toAutocomplete.addListener('place_changed', () => {
            const place = toAutocomplete.getPlace();
            if (place && place.formatted_address) {
              setToAddress(stripCountry(place.formatted_address));
            }
          });
        }
      };
      setTimeout(initToAutocomplete, 100);
    } else {
      // Reset the autocomplete ref when serviceType is not 'truck'
      toAutocompleteRef.current = null;
    }

    // Initialize "Stop" autocomplete
    if (hasStop && stopInputRef.current && !stopAutocompleteRef.current) {
      const initStopAutocomplete = () => {
        if (stopInputRef.current && !stopAutocompleteRef.current) {
          const stopAutocomplete = new window.google.maps.places.Autocomplete(
            stopInputRef.current,
            autocompleteOptions
          );
          stopAutocompleteRef.current = stopAutocomplete;

          stopAutocomplete.addListener('place_changed', () => {
            const place = stopAutocomplete.getPlace();
            if (place && place.formatted_address) {
              setStopAddress(stripCountry(place.formatted_address));
            }
          });
        }
      };
      setTimeout(initStopAutocomplete, 100);
    }
  }, [googleMapsReady, hasStop, serviceType]);

  // Don't render until mounted on client to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Recent Leads Tiles */}
      {isLoadingRecentEstimates ? (
        <div className="px-4 py-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      ) : recentEstimates.length > 0 ? (
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-2 text-center">Recent Leads</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl mx-auto">
            {recentEstimates.map((estimate) => (
              <button
                key={estimate.id}
                onClick={() => handleTileClick(estimate.displayPhone, estimate.displayName)}
                disabled={isLoadingJob}
                className="px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-left"
              >
                <div className="font-semibold truncate">{estimate.displayName || 'Unknown'}</div>
                {estimate.displayPhone && (
                  <div className="text-gray-400 text-xs">{estimate.displayPhone}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">
          No recent leads
        </div>
      )}

      {/* Map Section */}
      <div className="px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-gray-700 font-medium">
                {serviceType === 'labor' ? 'Service Location' : 'Move Route'}
              </p>
              {totalDistance && totalDuration && (
                <span className="ml-auto text-xs font-medium" style={{ color: '#06649b' }}>
                  {totalDistance} • {totalDuration}
                </span>
              )}
            </div>
            <div ref={mapRef} className="h-[300px] w-full">
              {(serviceType === 'labor' ? !fromAddress : (!fromAddress || !toAddress)) && (
                <div className="h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                  {serviceType === 'labor' ? 'Enter address to see location' : 'Enter addresses to see route'}
                </div>
              )}
            </div>
            {/* Route Legs */}
            {routeLegs.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-wrap gap-3 text-xs">
                  {/* Office → A (trip to first pickup) */}
                  <div className="flex items-center gap-1">
                    <span className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold text-xs" title="Office">
                      🏢
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      A
                    </span>
                  </div>
                  {/* Actual route legs from Google */}
                  {routeLegs.map((leg, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {leg.start}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {leg.end}
                      </span>
                      <span className="text-gray-600 ml-1">{leg.distance} • {leg.duration}</span>
                    </div>
                  ))}
                  {/* Final dropoff → Office (return trip) */}
                  <div className="flex items-center gap-1">
                    <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {routeLegs.length > 0 ? routeLegs[routeLegs.length - 1].end : 'B'}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold text-xs" title="Office">
                      🏢
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Section - Shows 3 days from Workiz */}
      <div className="px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-700 font-medium">Calendar</p>
              {isLoadingCalendar && (
                <svg className="animate-spin w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {/* Navigation arrows */}
              {moveDate && (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => handleCalendarNav('prev')}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title="Previous day (skip Sunday)"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleCalendarNav('next')}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title="Next day (skip Sunday)"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="w-full overflow-hidden">
              {!moveDate ? (
                <div className="h-[300px] flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                  Select a move date to see calendar
                </div>
              ) : calendarDays.length === 0 && !isLoadingCalendar ? (
                <div className="h-[300px] flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                  No calendar data available
                </div>
              ) : (() => {
                // Calculate hours to display based on job times
                const START_HOUR = 8; // 8 AM
                const MIN_END_HOUR = 12; // Always show at least until noon
                const allJobs = calendarDays.flatMap(d => d.jobs);
                const latestEndMinutes = allJobs.length > 0
                  ? Math.max(...allJobs.map(j => j.endMinutes))
                  : MIN_END_HOUR * 60;
                const endHour = Math.max(MIN_END_HOUR, Math.ceil(latestEndMinutes / 60));
                const hoursToShow = endHour - START_HOUR + 1; // +1 to include the end hour row
                const HOUR_HEIGHT = 50; // pixels per hour
                const totalHeight = hoursToShow * HOUR_HEIGHT;

                return (
                  <div className="flex">
                    {/* Time column */}
                    <div className="w-12 flex-shrink-0 border-r border-gray-200">
                      {/* Empty header space */}
                      <div className="h-10 border-b border-gray-200"></div>
                      {/* Hour labels */}
                      <div style={{ height: totalHeight }} className="relative">
                        {Array.from({ length: hoursToShow }, (_, i) => {
                          const hour = START_HOUR + i;
                          const label = hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`;
                          return (
                            <div
                              key={hour}
                              className="absolute w-full text-right pr-1 text-xs text-gray-500"
                              style={{ top: i * HOUR_HEIGHT - 6 }}
                            >
                              {label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Days columns */}
                    <div className="flex-1 grid grid-cols-3 divide-x divide-gray-200">
                      {calendarDays.map((day) => (
                        <div key={day.date} className="flex flex-col">
                          {/* Day Header */}
                          <div className={`h-10 px-2 py-1 text-center border-b ${day.isSelected ? 'bg-[#06649b] text-white' : 'bg-gray-50'}`}>
                            <p className={`text-xs font-medium ${day.isSelected ? 'text-white' : 'text-gray-500'}`}>{day.dayName}</p>
                            <p className={`text-sm font-bold leading-tight ${day.isSelected ? 'text-white' : 'text-gray-700'}`}>{day.dateLabel}</p>
                          </div>
                          {/* Time grid with jobs */}
                          <div className="relative" style={{ height: totalHeight }}>
                            {/* Hour row backgrounds */}
                            {Array.from({ length: hoursToShow }, (_, i) => (
                              <div
                                key={i}
                                className={`absolute w-full border-b border-gray-100 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                                style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                              />
                            ))}
                            {/* Jobs - with overlap handling */}
                            {(() => {
                              // Sort jobs by start time
                              const sortedJobs = [...day.jobs].sort((a, b) => a.startMinutes - b.startMinutes);

                              // Calculate column positions for overlapping jobs
                              const jobPositions: Map<string, { column: number; totalColumns: number }> = new Map();
                              const columns: Array<{ endMinutes: number; jobId: string }[]> = [];

                              sortedJobs.forEach(job => {
                                // Find first column where this job can fit (no overlap)
                                let columnIndex = 0;
                                while (columnIndex < columns.length) {
                                  const column = columns[columnIndex];
                                  const lastInColumn = column[column.length - 1];
                                  const lastJob = sortedJobs.find(j => j.id === lastInColumn.jobId);
                                  if (lastJob && lastJob.endMinutes <= job.startMinutes) {
                                    break; // Can fit in this column
                                  }
                                  columnIndex++;
                                }

                                // Create new column if needed
                                if (columnIndex >= columns.length) {
                                  columns.push([]);
                                }

                                columns[columnIndex].push({ endMinutes: job.endMinutes, jobId: job.id });
                                jobPositions.set(job.id, { column: columnIndex, totalColumns: 0 });
                              });

                              // Calculate total columns for each job's time range
                              sortedJobs.forEach(job => {
                                let maxConcurrent = 1;
                                sortedJobs.forEach(other => {
                                  if (other.id !== job.id) {
                                    // Check if jobs overlap
                                    if (other.startMinutes < job.endMinutes && other.endMinutes > job.startMinutes) {
                                      const otherPos = jobPositions.get(other.id);
                                      const thisPos = jobPositions.get(job.id);
                                      if (otherPos && thisPos) {
                                        maxConcurrent = Math.max(maxConcurrent, Math.max(otherPos.column, thisPos.column) + 1);
                                      }
                                    }
                                  }
                                });
                                const pos = jobPositions.get(job.id);
                                if (pos) {
                                  pos.totalColumns = Math.max(pos.totalColumns, maxConcurrent);
                                }
                              });

                              // Update totalColumns based on overlapping jobs
                              sortedJobs.forEach(job => {
                                const pos = jobPositions.get(job.id);
                                if (!pos) return;
                                sortedJobs.forEach(other => {
                                  if (other.id !== job.id && other.startMinutes < job.endMinutes && other.endMinutes > job.startMinutes) {
                                    const otherPos = jobPositions.get(other.id);
                                    if (otherPos) {
                                      const maxCols = Math.max(pos.totalColumns, otherPos.totalColumns);
                                      pos.totalColumns = maxCols;
                                      otherPos.totalColumns = maxCols;
                                    }
                                  }
                                });
                              });

                              return sortedJobs.map((job) => {
                                const topOffset = ((job.startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                                const height = Math.max(20, ((job.endMinutes - job.startMinutes) / 60) * HOUR_HEIGHT);
                                const pos = jobPositions.get(job.id) || { column: 0, totalColumns: 1 };
                                const padding = 4; // pixels padding on each side
                                const totalPadding = padding * 2 * pos.totalColumns;
                                const availableWidth = pos.totalColumns > 1
                                  ? `calc((100% - ${totalPadding}px) / ${pos.totalColumns})`
                                  : 'calc(100% - 8px)';
                                const leftOffset = pos.totalColumns > 1
                                  ? `calc(${(pos.column / pos.totalColumns) * 100}% + ${padding}px)`
                                  : '4px';

                                return (
                                  <div
                                    key={job.id}
                                    className={`absolute rounded px-1 py-0.5 overflow-hidden border text-[10px] leading-tight ${
                                      job.status === 'Completed' ? 'bg-green-100 border-green-300' :
                                      job.status === 'Cancelled' ? 'bg-red-100 border-red-300 opacity-60' :
                                      'bg-blue-100 border-blue-300'
                                    }`}
                                    style={{
                                      top: Math.max(0, topOffset),
                                      height,
                                      width: availableWidth,
                                      left: leftOffset,
                                    }}
                                    title={`${job.customerName} - ${job.startTime} to ${job.endTime}`}
                                  >
                                    <div className="font-bold text-gray-900 text-xs">{job.startTime}</div>
                                    {job.customerName && job.customerName !== 'No Name' && job.customerName !== 'Unknown' && (
                                      <div className="text-gray-700 truncate">{job.customerName}</div>
                                    )}
                                    {height > 35 && job.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {job.tags.map((tag, tagIndex) => {
                                          // Match tag colors from Move Date and Time block
                                          let colorClasses = 'bg-gray-400 text-white';
                                          if (['OOT', 'Cat', 'RN', 'ET'].includes(tag)) {
                                            colorClasses = 'bg-red-500 text-white';
                                          } else if (['2', '3', '4', '5', '6+'].includes(tag)) {
                                            colorClasses = 'bg-green-500 text-white';
                                          } else if (['Move', 'WT'].includes(tag)) {
                                            colorClasses = 'bg-blue-500 text-white';
                                          } else if (['Trk', 'Lbr'].includes(tag)) {
                                            colorClasses = 'bg-purple-500 text-white';
                                          } else if (tag === 'PM') {
                                            colorClasses = 'bg-yellow-400 text-gray-800';
                                          } else if (tag.toLowerCase().includes('junk')) {
                                            colorClasses = 'bg-orange-500 text-white';
                                          }
                                          return (
                                            <span
                                              key={tagIndex}
                                              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${colorClasses}`}
                                            >
                                              {tag}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Techs Row */}
            {moveDate && calendarDays.length > 0 && (
              <div className="border-t border-gray-300 flex">
                {/* Techs label */}
                <div className="w-12 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600 -rotate-0">Techs</span>
                </div>
                {/* Techs for each day */}
                <div className="flex-1 grid grid-cols-3 divide-x divide-gray-200">
                  {calendarDays.map((day, dayIndex) => {
                    const dayTechs = calendarTechs.find(t => t.date === day.date)?.techs || [];
                    return (
                      <div
                        key={day.date}
                        className={`p-2 min-h-[44px] ${day.isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}
                      >
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {dayTechs.length === 0 ? (
                            <span className="text-xs text-gray-400">-</span>
                          ) : (
                            dayTechs.map((tech, techIndex) => (
                              <div
                                key={techIndex}
                                title={tech.name}
                                className={`relative w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                                  tech.hasTimeOff
                                    ? 'bg-gray-300 text-gray-500'
                                    : tech.isScheduled
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-gray-200 text-gray-400'
                                }`}
                              >
                                {tech.initials}
                                {/* Diagonal line for time off */}
                                {tech.hasTimeOff && (
                                  <div className="absolute inset-0 overflow-hidden rounded">
                                    <div
                                      className="absolute bg-gray-500"
                                      style={{
                                        width: '140%',
                                        height: '2px',
                                        top: '50%',
                                        left: '-20%',
                                        transform: 'rotate(-45deg)',
                                        transformOrigin: 'center',
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Customer Details Row */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* Search Section */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
              <p className="text-sm text-gray-700 font-medium">Search</p>
            </div>
            <div className="p-3">
              <div className="flex gap-2 mb-2">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as typeof searchType)}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                >
                  <option value="phone">Phone</option>
                  <option value="name">Name</option>
                  <option value="quoteId">Quote #</option>
                  <option value="workizJob">Job #</option>
                </select>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={
                    searchType === 'phone' ? '(208) 555-1234' :
                    searchType === 'name' ? 'John Smith' :
                    searchType === 'quoteId' ? 'Q-1234' :
                    searchType === 'workizJob' ? '3456' : ''
                  }
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchValue.trim()}
                  className="flex-1 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(6, 100, 155, 0.8)' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#06649b'; }}
                  onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgba(6, 100, 155, 0.8)'; }}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
                <button
                  onClick={clearSearch}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium"
                >
                  Clear
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <p className="text-xs text-gray-500 mb-2 text-center">{searchResults.length} quote(s) found</p>
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => loadSearchResult(result)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm text-left"
                      >
                        <div className="font-semibold truncate">{result.full_name || 'Unknown'}</div>
                        {result.phone && <div className="text-gray-500 text-xs">{result.phone}</div>}
                        {result.from_address && <div className="text-gray-400 text-xs truncate">From: {result.from_address}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
              <p className="text-sm text-gray-700 font-medium">Customer Details</p>
            </div>
            <div className="p-3 space-y-2">
              <div>
                <label className="text-xs text-gray-600 font-medium">Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium">Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(208) 555-1234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout - Left column first on mobile */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">

          {/* LEFT COLUMN */}
          <div className="space-y-4">

            {/* Service Type */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
                <p className="text-sm text-gray-700 font-medium">Service Type</p>
              </div>
              <div className="p-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setServiceType('truck')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      serviceType === 'truck'
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    style={serviceType === 'truck' ? { backgroundColor: 'rgba(6, 100, 155, 0.8)' } : undefined}
                  >
                    Bring a Truck
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('labor')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      serviceType === 'labor'
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    style={serviceType === 'labor' ? { backgroundColor: 'rgba(6, 100, 155, 0.8)' } : undefined}
                  >
                    Labor Only
                  </button>
                </div>
              </div>
            </div>

            {/* Move Date & Time */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
                <p className="text-sm text-gray-700 font-medium">Move Date & Time</p>
              </div>
              <div className="p-3 space-y-3">
                {/* Date and Time pickers */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={moveDate}
                    onChange={(e) => {
                      setMoveDate(e.target.value);
                      // Auto-open time dropdown after selecting date
                      if (e.target.value && timeSelectRef.current) {
                        setTimeout(() => {
                          const select = timeSelectRef.current;
                          if (select) {
                            select.focus();
                            // Try to open the dropdown programmatically
                            const event = new MouseEvent('mousedown', {
                              view: window,
                              bubbles: true,
                              cancelable: true,
                            });
                            select.dispatchEvent(event);
                          }
                        }, 150);
                      }
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <select
                    ref={timeSelectRef}
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select Time</option>
                    <option value="7:00 AM">7:00 AM</option>
                    <option value="7:30 AM">7:30 AM</option>
                    <option value="8:00 AM">8:00 AM</option>
                    <option value="8:30 AM">8:30 AM</option>
                    <option value="9:00 AM">9:00 AM</option>
                    <option value="9:30 AM">9:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="12:30 PM">12:30 PM</option>
                    <option value="1:00 PM">1:00 PM</option>
                    <option value="1:30 PM">1:30 PM</option>
                    <option value="2:00 PM">2:00 PM</option>
                    <option value="2:30 PM">2:30 PM</option>
                    <option value="3:00 PM">3:00 PM</option>
                    <option value="3:30 PM">3:30 PM</option>
                    <option value="4:00 PM">4:00 PM</option>
                    <option value="4:30 PM">4:30 PM</option>
                    <option value="5:00 PM">5:00 PM</option>
                    <option value="5:30 PM">5:30 PM</option>
                    <option value="6:00 PM">6:00 PM</option>
                    <option value="6:30 PM">6:30 PM</option>
                    <option value="7:00 PM">7:00 PM</option>
                    <option value="7:30 PM">7:30 PM</option>
                    <option value="8:00 PM">8:00 PM</option>
                  </select>
                </div>

                {/* Duration, Schedule Move, Schedule WT - all on one row */}
                <div className="flex items-center gap-2">
                  <select
                    value={moveDuration}
                    onChange={(e) => setMoveDuration(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <option key={n} value={n}>{n}hr</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="flex-1 px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(6, 100, 155, 0.8)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#06649b'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(6, 100, 155, 0.8)'}
                    onClick={async () => {
                      // Validate required tags
                      const hasTrkOrLbr = tags.includes('Trk') || tags.includes('Lbr');
                      const hasCrewSize = ['2', '3', '4', '5', '6+'].some(t => tags.includes(t));
                      if (!hasTrkOrLbr) { alert('Please select Trk or Lbr'); return; }
                      if (!hasCrewSize) { alert('Please select crew size (2, 3, 4, 5, or 6+)'); return; }
                      if (!moveDate) { alert('Please select a move date'); return; }
                      if (!timeSlot) { alert('Please select a move time'); return; }
                      if (!customerName) { alert('Please enter customer name'); return; }
                      if (!customerPhone) { alert('Please enter phone number'); return; }
                      if (!customerEmail) { alert('Please enter an email address'); return; }
                      if (!fromAddress) { alert('Please enter the pickup address'); return; }

                      // Parse name into first/last
                      const nameParts = customerName.trim().split(' ');
                      const firstName = nameParts[0] || '';
                      const lastName = nameParts.slice(1).join(' ') || '';

                      try {
                        console.log('[Schedule Move] Tags being sent:', tags);
                        const response = await fetch('/api/move-wt/schedule-moving', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            moveDate,
                            moveTime: timeSlot,
                            moveDuration: moveDuration || '4',
                            firstName,
                            lastName,
                            phone: customerPhone,
                            email: customerEmail,
                            pickupAddress: fromAddress,
                            pickupCity: '',
                            pickupState: '',
                            pickupZip: '',
                            deliveryAddress: toAddress,
                            deliveryCity: '',
                            deliveryState: '',
                            deliveryZip: '',
                            timingNotes,
                            tags,
                          }),
                        });
                        const data = await response.json();
                        if (data.success) {
                          alert('Moving job scheduled successfully in Workiz!');
                        } else {
                          alert('Failed to schedule: ' + (data.error || 'Unknown error'));
                        }
                      } catch (error) {
                        console.error('Schedule error:', error);
                        alert('Failed to schedule moving job. Please try again.');
                      }
                    }}
                  >
                    Schedule Move
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(6, 100, 155, 0.8)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#06649b'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(6, 100, 155, 0.8)'}
                    onClick={async () => {
                      // Validate required tags
                      const hasTrkOrLbr = tags.includes('Trk') || tags.includes('Lbr');
                      const hasCrewSize = ['2', '3', '4', '5', '6+'].some(t => tags.includes(t));
                      if (!hasTrkOrLbr) { alert('Please select Trk or Lbr'); return; }
                      if (!hasCrewSize) { alert('Please select crew size (2, 3, 4, 5, or 6+)'); return; }
                      if (!moveDate) { alert('Please select a walk-through date'); return; }
                      if (!timeSlot) { alert('Please select a walk-through time'); return; }
                      if (!customerName) { alert('Please enter customer name'); return; }
                      if (!customerPhone) { alert('Please enter phone number'); return; }
                      if (!customerEmail) { alert('Please enter an email address'); return; }
                      if (!fromAddress) { alert('Please enter the customer address'); return; }

                      // Parse name into first/last
                      const nameParts = customerName.trim().split(' ');
                      const firstName = nameParts[0] || '';
                      const lastName = nameParts.slice(1).join(' ') || '';

                      try {
                        console.log('[Schedule WT] Tags being sent:', tags);
                        const response = await fetch('/api/move-wt/schedule-walkthrough', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            walkThroughDate: moveDate,
                            walkThroughTime: timeSlot,
                            walkThroughDuration: moveDuration || '1',
                            firstName,
                            lastName,
                            phone: customerPhone,
                            email: customerEmail,
                            address: fromAddress,
                            city: '',
                            state: '',
                            zip: '',
                            timingNotes,
                            tags,
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
                    Schedule WT
                  </button>
                </div>

                {/* Job Tags */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {['Move', 'WT', 'Trk', 'Lbr', 'PM', 'RN', 'ET', 'OOT', 'Cat', '2', '3', '4', '5', '6+'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagChange(tag)}
                      className={`px-2 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${tag === 'Move' ? 'cursor-not-allowed' : ''} ${getTagColorClasses(tag, tags.includes(tag))}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Additional Notes */}
                <textarea
                  value={timingNotes}
                  onChange={(e) => setTimingNotes(e.target.value)}
                  rows={4}
                  placeholder="Additional notes"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                />

                {/* No Date checkbox */}
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={moveDateUnknown}
                    onChange={(e) => setMoveDateUnknown(e.target.checked)}
                    className="rounded"
                  />
                  No Date
                </label>
              </div>
            </div>

            {/* Other Services */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
                <p className="text-sm text-gray-700 font-medium">Other Services</p>
              </div>
              <div className="p-3 space-y-4">
                {/* Boxing & Packing */}
                <div>
                  <p className="text-xs text-gray-600 mb-2 font-medium">Boxing &amp; Packing</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={packingAmount}
                      onChange={(e) => setPackingAmount(e.target.value)}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    />
                    <span className="text-sm font-medium min-w-[100px]" style={{ color: '#06649b' }}>
                      {(() => {
                        const val = parseInt(packingAmount);
                        const labels = ['None', 'A few items', 'A little bit', 'Some items', 'A fair amount', 'About half', 'More than half', 'Most of it', 'Almost all', 'Nearly everything', 'Everything'];
                        return labels[val] || labels[0];
                      })()}
                    </span>
                  </div>
                  {parseInt(packingAmount) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Kitchen', 'Bedrooms', 'Garage', 'Bathrooms'].map((room) => (
                        <button
                          key={room}
                          type="button"
                          onClick={() => setPackingRooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room])}
                          className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
                            packingRooms.includes(room)
                              ? 'text-white border-transparent'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                          style={packingRooms.includes(room) ? { backgroundColor: 'rgba(6, 100, 155, 0.8)' } : undefined}
                        >
                          {room}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Junk Removal */}
                <div>
                  <p className="text-xs text-gray-600 mb-2 font-medium">Junk Removal</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={junkRemovalAmount}
                      onChange={(e) => setJunkRemovalAmount(e.target.value)}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    />
                    <span className="text-sm font-medium min-w-[100px]" style={{ color: '#06649b' }}>
                      {(() => {
                        const val = parseInt(junkRemovalAmount);
                        const labels = ['None', '1/8 load', '1/4 load', '3/8 load', '1/2 load', '5/8 load', '3/4 load', '7/8 load', 'Full load'];
                        return labels[val] || labels[0];
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
          {/* END LEFT COLUMN */}

          {/* RIGHT COLUMN */}
          <div className="space-y-4">

            {/* ========== MOVING FROM ========== */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              {/* Header with marker */}
              <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-200" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
                <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  A
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 font-medium">
                    {serviceType === 'labor' ? 'Service Address' : 'Where are you moving from?'}
                  </p>
                  <label className="flex items-center gap-1 mt-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fromIsCurrentHome}
                      onChange={(e) => handleFromCurrentHomeChange(e.target.checked)}
                      className="w-3 h-3 rounded border-gray-300 bg-white text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-gray-500 text-xs">This is my current home or business</span>
                  </label>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {/* Address inputs */}
                <div className="flex gap-2">
                  <input
                    ref={fromInputRef}
                    type="text"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder={serviceType === 'labor' ? 'Enter service address' : 'Enter pickup address'}
                    autoComplete="one-time-code"
                    autoCapitalize="off"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={fromUnit}
                    onChange={(e) => setFromUnit(e.target.value)}
                    placeholder="Unit"
                    className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                  />
                </div>

                {/* Property Data - Sq Ft, Value, $ button - Only when current home */}
                {fromIsCurrentHome && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={isLoadingFromProperty ? '' : formatNumberWithCommas(fromSquareFootage)}
                      onChange={(e) => setFromSquareFootage(e.target.value.replace(/,/g, ''))}
                      placeholder={isLoadingFromProperty ? "Loading..." : "Sq Ft"}
                      disabled={isLoadingFromProperty}
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={isLoadingFromProperty ? '' : formatNumberWithCommas(fromZestimate)}
                      onChange={(e) => setFromZestimate(e.target.value.replace(/,/g, ''))}
                      placeholder={isLoadingFromProperty ? "Loading..." : "Value"}
                      disabled={isLoadingFromProperty}
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={fetchFromPropertyData}
                      disabled={isLoadingFromProperty}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title="Fetch property data from Zillow"
                    >
                      $
                    </button>
                  </div>
                )}

                {/* LABOR SERVICE TYPE - Only for Labor Only */}
                {serviceType === 'labor' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Service Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      <PillButton selected={laborServiceType === 'between-rooms'} onClick={() => handleLaborServiceTypeChange('between-rooms')}>
                        Moving items between rooms
                      </PillButton>
                      <PillButton selected={laborServiceType === 'loading'} onClick={() => handleLaborServiceTypeChange('loading')}>
                        Loading a truck or pod
                      </PillButton>
                      <PillButton selected={laborServiceType === 'unloading'} onClick={() => handleLaborServiceTypeChange('unloading')}>
                        Unloading a truck or pod
                      </PillButton>
                      <PillButton selected={laborServiceType === 'office'} onClick={() => handleLaborServiceTypeChange('office')}>
                        Office
                      </PillButton>
                      <PillButton selected={laborServiceType === 'other'} onClick={() => handleLaborServiceTypeChange('other')}>
                        Other
                      </PillButton>
                    </div>
                  </div>
                )}

                {/* LABOR: Loading - Show "Moving From" options */}
                {serviceType === 'labor' && laborServiceType === 'loading' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Moving From</p>
                    <div className="flex gap-1.5">
                      <PillButton selected={fromPropertyType === 'home'} onClick={() => handleFromPropertyTypeChange('home')}>
                        Residence
                      </PillButton>
                      <PillButton selected={fromPropertyType === 'storage'} onClick={() => handleFromPropertyTypeChange('storage')}>
                        Storage
                      </PillButton>
                    </div>
                  </div>
                )}

                {/* LABOR: Unloading - Show "Unloading To" options */}
                {serviceType === 'labor' && laborServiceType === 'unloading' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Unloading To</p>
                    <div className="flex gap-1.5">
                      <PillButton selected={toPropertyType === 'home'} onClick={() => handleToPropertyTypeChange('home')}>
                        Residence
                      </PillButton>
                      <PillButton selected={toPropertyType === 'storage'} onClick={() => handleToPropertyTypeChange('storage')}>
                        Storage
                      </PillButton>
                    </div>
                  </div>
                )}

                {/* LABOR: Between-rooms or Loading (Residence) or Office - Show Square Footage */}
                {serviceType === 'labor' && (
                  laborServiceType === 'between-rooms' ||
                  (laborServiceType === 'loading' && fromPropertyType === 'home') ||
                  laborServiceType === 'office'
                ) && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Square Footage</p>
                    <div className="flex flex-wrap gap-1">
                      {squareFootageOptions.map((option) => (
                        <PillButton
                          key={`labor-sqft-${option}`}
                          selected={fromSquareFootage === option}
                          onClick={() => setFromSquareFootage(option)}
                        >
                          {option}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* LABOR: Loading (Storage) - Show Storage Units */}
                {serviceType === 'labor' && laborServiceType === 'loading' && fromPropertyType === 'storage' && (
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    {fromStorageUnits.map((unit, index) => (
                      <div key={unit.id} className="mb-2 last:mb-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">Unit {index + 1}</span>
                          {fromStorageUnits.length > 1 && (
                            <button onClick={() => removeStorageUnit('from', unit.id)} className="text-red-500 text-xs">Remove</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          <span className="text-xs text-gray-500 mr-1">Size:</span>
                          {unitSizeOptions.map((option) => (
                            <PillButton key={`labor-from-${unit.id}-${option}`} selected={unit.size === option} onClick={() => updateStorageUnit('from', unit.id, 'size', option)}>
                              {option}
                            </PillButton>
                          ))}
                        </div>
                        <div className="flex gap-1 mb-1">
                          <span className="text-xs text-gray-500 mr-1">Type:</span>
                          <PillButton selected={unit.type === 'conditioned'} onClick={() => updateStorageUnit('from', unit.id, 'type', 'conditioned')}>Conditioned</PillButton>
                          <PillButton selected={unit.type === 'standard'} onClick={() => updateStorageUnit('from', unit.id, 'type', 'standard')}>Standard</PillButton>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Fullness:</span>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={unit.fullness}
                            onChange={(e) => updateStorageUnit('from', unit.id, 'fullness', e.target.value)}
                            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                          />
                          <span className="text-xs text-rose-500 font-medium min-w-[70px]">{getStorageFullnessLabel(unit.fullness)}</span>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addStorageUnit('from')} className="text-rose-500 text-xs font-medium mt-1">+ Add Unit</button>
                  </div>
                )}

                {/* LABOR: Between-rooms - Show "How much needs moved" slider */}
                {serviceType === 'labor' && laborServiceType === 'between-rooms' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">How much needs moved?</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={laborItemAmount}
                        onChange={(e) => setLaborItemAmount(e.target.value)}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      />
                      <span className="text-xs text-rose-500 font-medium min-w-[80px]">{getBelongingsLabel(laborItemAmount)}</span>
                    </div>
                  </div>
                )}

                {/* LABOR: Between-rooms - Show Stories */}
                {serviceType === 'labor' && laborServiceType === 'between-rooms' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Stories</p>
                    <div className="flex gap-1">
                      {storiesOptions.map((option) => (
                        <PillButton key={`labor-stories-${option}`} selected={fromStories === option} onClick={() => setFromStories(option)} className="w-10">
                          {option}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* LABOR: Loading (Residence) - Show "How much needs moved" slider */}
                {serviceType === 'labor' && laborServiceType === 'loading' && fromPropertyType === 'home' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">How much do you need help moving?</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={loadingItemAmount}
                        onChange={(e) => setLoadingItemAmount(e.target.value)}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      />
                      <span className="text-xs text-rose-500 font-medium min-w-[80px]">{getBelongingsLabel(loadingItemAmount)}</span>
                    </div>
                  </div>
                )}

                {/* LABOR: Loading - Show Truck/POD Length */}
                {serviceType === 'labor' && laborServiceType === 'loading' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Truck/POD Length</p>
                    {truckPodLengths.map((length, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <div className="flex flex-wrap gap-1 flex-1">
                          {["8'", "10'", "12'", "15'", "16'", "20'", "26'"].map((option) => (
                            <PillButton key={`truck-${index}-${option}`} selected={length === option} onClick={() => updateTruckPodLength(index, option)}>
                              {option}
                            </PillButton>
                          ))}
                        </div>
                        {truckPodLengths.length > 1 && (
                          <button onClick={() => removeTruckPod(index)} className="text-red-500 text-xs">Remove</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addTruckPod} className="text-rose-500 text-xs font-medium">+ Add Another Truck/POD</button>
                  </div>
                )}

                {/* LABOR: Unloading - Show Truck/POD Length with Fullness */}
                {serviceType === 'labor' && laborServiceType === 'unloading' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Truck/POD</p>
                    {unloadingTrucks.map((truck, index) => (
                      <div key={truck.id} className="mb-3 bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">Truck {index + 1}</span>
                          {unloadingTrucks.length > 1 && (
                            <button onClick={() => removeUnloadingTruck(truck.id)} className="text-red-500 text-xs">Remove</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className="text-xs text-gray-500 mr-1">Length:</span>
                          {["8'", "10'", "12'", "15'", "16'", "20'", "26'"].map((option) => (
                            <PillButton key={`unload-${truck.id}-${option}`} selected={truck.length === option} onClick={() => updateUnloadingTruck(truck.id, 'length', option)}>
                              {option}
                            </PillButton>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Fullness:</span>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={truck.fullness}
                            onChange={(e) => updateUnloadingTruck(truck.id, 'fullness', e.target.value)}
                            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                          />
                          <span className="text-xs text-rose-500 font-medium min-w-[70px]">{getStorageFullnessLabel(truck.fullness)}</span>
                        </div>
                      </div>
                    ))}
                    <button onClick={addUnloadingTruck} className="text-rose-500 text-xs font-medium">+ Add Another Truck/POD</button>
                  </div>
                )}

                {/* LABOR: Unloading (Residence) - Show Stories */}
                {serviceType === 'labor' && laborServiceType === 'unloading' && toPropertyType === 'home' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Stories</p>
                    <div className="flex gap-1">
                      {storiesOptions.map((option) => (
                        <PillButton key={`unload-stories-${option}`} selected={fromStories === option} onClick={() => setFromStories(option)} className="w-10">
                          {option}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* LABOR: Unloading (Storage) - Show Storage Type */}
                {serviceType === 'labor' && laborServiceType === 'unloading' && toPropertyType === 'storage' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Storage Type</p>
                    <div className="flex gap-1.5">
                      <PillButton selected={unloadingStorageType === 'conditioned'} onClick={() => setUnloadingStorageType('conditioned')}>Conditioned</PillButton>
                      <PillButton selected={unloadingStorageType === 'standard'} onClick={() => setUnloadingStorageType('standard')}>Standard</PillButton>
                    </div>
                  </div>
                )}

                {/* LABOR: Office - Show Floor Level */}
                {serviceType === 'labor' && laborServiceType === 'office' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Floor Level</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={fromFloorLevel}
                        onChange={(e) => setFromFloorLevel(e.target.value)}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center"
                      />
                      {parseInt(fromFloorLevel) >= 2 && (
                        <div className="flex gap-1">
                          <span className="text-xs text-gray-500">Elevator?</span>
                          <PillButton selected={fromElevator === 'yes'} onClick={() => setFromElevator('yes')}>Yes</PillButton>
                          <PillButton selected={fromElevator === 'no'} onClick={() => setFromElevator('no')}>No</PillButton>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LABOR: Office - Show "How much needs moved" slider */}
                {serviceType === 'labor' && laborServiceType === 'office' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">How much needs moved?</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={officeItemAmount}
                        onChange={(e) => setOfficeItemAmount(e.target.value)}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      />
                      <span className="text-xs text-rose-500 font-medium min-w-[80px]">{getBelongingsLabel(officeItemAmount)}</span>
                    </div>
                  </div>
                )}

                {/* LABOR: Heavy/Special Items - Show for all except "other" */}
                {serviceType === 'labor' && laborServiceType !== 'other' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Heavy/Special Items</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(laborServiceType === 'office'
                        ? ['TVs over 45"', 'Exercise Equipment']
                        : heavyItemOptions
                      ).map((item) => (
                        <PillButton
                          key={`labor-heavy-${item}`}
                          selected={heavyItems.includes(item)}
                          onClick={() => setHeavyItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}
                        >
                          {item}
                        </PillButton>
                      ))}
                    </div>

                    {/* Heavy Item Details - Sub-selections */}
                    {heavyItems.length > 0 && (
                      <div className="mt-2 ml-2 p-2 bg-gray-50 rounded-lg border-l-2 border-[#F66256] text-xs space-y-2">
                        {/* TVs */}
                        {heavyItems.includes('TVs over 45"') && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">TVs over 45"</span>
                            <span className="text-gray-600">How many?</span>
                            {['1', '2', '3', '4', '5'].map((count) => (
                              <PillButton key={`labor-tv-${count}`} selected={tvCount === count} onClick={() => setTvCount(count)}>{count}</PillButton>
                            ))}
                          </div>
                        )}
                        {/* Piano */}
                        {heavyItems.includes('Piano') && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Piano</span>
                              <span className="text-gray-600">Type:</span>
                              <PillButton selected={pianoType === 'upright'} onClick={() => setPianoType('upright')}>Upright</PillButton>
                              <PillButton selected={pianoType === 'grand'} onClick={() => setPianoType('grand')}>Grand</PillButton>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap ml-4">
                              <span className="text-gray-600">Ground Level?</span>
                              <PillButton selected={pianoGroundLevel === 'yes'} onClick={() => setPianoGroundLevel('yes')}>Yes</PillButton>
                              <PillButton selected={pianoGroundLevel === 'no'} onClick={() => setPianoGroundLevel('no')}>No</PillButton>
                            </div>
                          </div>
                        )}
                        {/* Gun Safe */}
                        {heavyItems.includes('Gun Safe') && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Gun Safe</span>
                              <span className="text-gray-600">Over 300lbs?</span>
                              <PillButton selected={gunSafeOver300 === 'yes'} onClick={() => setGunSafeOver300('yes')}>Yes</PillButton>
                              <PillButton selected={gunSafeOver300 === 'no'} onClick={() => setGunSafeOver300('no')}>No</PillButton>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap ml-4">
                              <span className="text-gray-600">Ground Level?</span>
                              <PillButton selected={gunSafeGroundLevel === 'yes'} onClick={() => setGunSafeGroundLevel('yes')}>Yes</PillButton>
                              <PillButton selected={gunSafeGroundLevel === 'no'} onClick={() => setGunSafeGroundLevel('no')}>No</PillButton>
                            </div>
                          </div>
                        )}
                        {/* Exercise Equipment */}
                        {heavyItems.includes('Exercise Equipment') && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Exercise Equipment</span>
                            <span className="text-gray-600">Types:</span>
                            {['Treadmill', 'Free Weights', 'Multi-gym'].map((type) => (
                              <PillButton key={`labor-exercise-${type}`} selected={exerciseEquipmentTypes.includes(type)} onClick={() => toggleExerciseEquipment(type)}>{type}</PillButton>
                            ))}
                          </div>
                        )}
                        {/* Purple/Green Mattress */}
                        {heavyItems.includes('Purple/Green Mattress') && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Purple/Green Mattress</span>
                            <span className="text-gray-600">Ground Level?</span>
                            <PillButton selected={mattressGroundLevel === 'yes'} onClick={() => setMattressGroundLevel('yes')}>Yes</PillButton>
                            <PillButton selected={mattressGroundLevel === 'no'} onClick={() => setMattressGroundLevel('no')}>No</PillButton>
                          </div>
                        )}
                        {/* Shop/Garage */}
                        {heavyItems.includes('Shop/Garage') && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Shop/Garage</span>
                            <span className="text-gray-600">Items:</span>
                            {['Toolchest', 'Table Saw', 'Other'].map((type) => (
                              <PillButton key={`labor-tool-${type}`} selected={toolTypes.includes(type)} onClick={() => toggleToolType(type)}>{type}</PillButton>
                            ))}
                            {toolTypes.includes('Other') && (
                              <input
                                type="text"
                                placeholder="Describe..."
                                value={toolOtherText}
                                onChange={(e) => setToolOtherText(e.target.value)}
                                className="flex-1 min-w-[100px] border border-gray-300 rounded-lg px-2 py-1 text-xs"
                              />
                            )}
                          </div>
                        )}
                        {/* Pool Table */}
                        {heavyItems.includes('Pool Table') && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Pool Table</span>
                              <span className="text-gray-600">Need Disassembly?</span>
                              <PillButton selected={poolTableDisassembly === 'yes'} onClick={() => setPoolTableDisassembly('yes')}>Yes</PillButton>
                              <PillButton selected={poolTableDisassembly === 'no'} onClick={() => setPoolTableDisassembly('no')}>No</PillButton>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap ml-4">
                              <span className="text-gray-600">Ground Level?</span>
                              <PillButton selected={poolTableGroundLevel === 'yes'} onClick={() => setPoolTableGroundLevel('yes')}>Yes</PillButton>
                              <PillButton selected={poolTableGroundLevel === 'no'} onClick={() => setPoolTableGroundLevel('no')}>No</PillButton>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* LABOR: Details text area - for "other" type */}
                {serviceType === 'labor' && laborServiceType === 'other' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Any other details we should know?</p>
                    <textarea
                      value={fromDetails}
                      onChange={(e) => setFromDetails(e.target.value)}
                      placeholder="E.g., narrow staircase, items in garage, specific access instructions..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                      rows={4}
                    />
                  </div>
                )}

                {/* Property Type - Only for Truck service (Labor has its own property type handling) */}
                {serviceType !== 'labor' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Property Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {propertyTypes.map((type) => (
                        <PillButton
                          key={type.id}
                          selected={fromPropertyType === type.id}
                          onClick={() => handleFromPropertyTypeChange(type.id as PropertyType)}
                        >
                          {type.label}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Storage-specific fields */}
                {fromFields.showUnitSize && serviceType !== 'labor' && (
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    {fromStorageUnits.map((unit, index) => (
                      <div key={unit.id} className="mb-2 last:mb-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">Unit {index + 1}</span>
                          {fromStorageUnits.length > 1 && (
                            <button onClick={() => removeStorageUnit('from', unit.id)} className="text-red-500 text-xs">Remove</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          <span className="text-xs text-gray-500 mr-1">Size:</span>
                          {unitSizeOptions.map((option) => (
                            <PillButton
                              key={`from-${unit.id}-${option}`}
                              selected={unit.size === option}
                              onClick={() => updateStorageUnit('from', unit.id, 'size', option)}
                            >
                              {option}
                            </PillButton>
                          ))}
                        </div>
                        <div className="flex gap-1 mb-1">
                          <span className="text-xs text-gray-500 mr-1">Type:</span>
                          <PillButton selected={unit.type === 'conditioned'} onClick={() => updateStorageUnit('from', unit.id, 'type', 'conditioned')}>Conditioned</PillButton>
                          <PillButton selected={unit.type === 'standard'} onClick={() => updateStorageUnit('from', unit.id, 'type', 'standard')}>Standard</PillButton>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Fullness:</span>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={unit.fullness}
                            onChange={(e) => updateStorageUnit('from', unit.id, 'fullness', e.target.value)}
                            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                          />
                          <span className="text-xs text-rose-500 font-medium min-w-[70px]">{getStorageFullnessLabel(unit.fullness)}</span>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addStorageUnit('from')} className="text-rose-500 text-xs font-medium mt-1">+ Add Unit</button>
                  </div>
                )}

                {/* Bedrooms - for home/apartment only (not labor) */}
                {fromFields.showBedrooms && serviceType !== 'labor' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Bedrooms</p>
                    <div className="flex gap-1">
                      {bedroomOptions.map((option) => (
                        <PillButton
                          key={option}
                          selected={fromBedrooms === option}
                          onClick={() => setFromBedrooms(option)}
                          className="w-10"
                        >
                          {option}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Square Footage - for home/apartment/office (not labor) */}
                {fromFields.showSquareFootage && serviceType !== 'labor' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Square Footage</p>
                    <div className="flex flex-wrap gap-1">
                      {squareFootageOptions.map((option) => (
                        <PillButton
                          key={option}
                          selected={fromSquareFootage === option}
                          onClick={() => setFromSquareFootage(option)}
                        >
                          {option}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* How much will we be moving - for Truck only (not storage) */}
                {serviceType !== 'labor' && fromPropertyType !== 'storage' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">How much will we be moving?</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={belongingsAmount}
                        onChange={(e) => setBelongingsAmount(e.target.value)}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      />
                      <span className="text-xs text-rose-500 font-medium min-w-[80px]">{getBelongingsLabel(belongingsAmount)}</span>
                    </div>
                  </div>
                )}

                {/* Garage - for home only (not labor) */}
                {fromFields.showGarage && serviceType !== 'labor' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Garage</p>
                    <div className="flex flex-wrap gap-1">
                      {garageOptions.map((option) => (
                        <PillButton
                          key={option}
                          selected={fromGarage === option}
                          onClick={() => setFromGarage(option)}
                        >
                          {option}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stories - for home (not labor) */}
                {fromFields.showStories && serviceType !== 'labor' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Stories</p>
                    <div className="flex gap-1">
                      {storiesOptions.map((option) => (
                        <PillButton
                          key={option}
                          selected={fromStories === option}
                          onClick={() => setFromStories(option)}
                          className="w-10"
                        >
                          {option}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Floor Level & Elevator - for apartment/office */}
                {(fromFields.showFloorLevel && fromPropertyType !== 'storage') && (
                  <div className="flex gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1 font-medium">Floor Level</p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFromFloorLevel(String(Math.max(1, parseInt(fromFloorLevel || '1') - 1)))}
                          className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 hover:border-blue-400 text-sm"
                        >
                          -
                        </button>
                        <input
                          type="text"
                          value={fromFloorLevel}
                          onChange={(e) => setFromFloorLevel(e.target.value.replace(/\D/g, '') || '1')}
                          className="w-10 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setFromFloorLevel(String(parseInt(fromFloorLevel || '1') + 1))}
                          className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 hover:border-blue-400 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {fromFields.showElevator && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1 font-medium">Elevator</p>
                        <div className="flex gap-1">
                          <PillButton selected={fromElevator === 'yes'} onClick={() => setFromElevator('yes')}>Yes</PillButton>
                          <PillButton selected={fromElevator === 'no'} onClick={() => setFromElevator('no')}>No</PillButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Heavy/Special Items */}
                {serviceType !== 'labor' && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Heavy/Special Items</p>
                    <div className="flex flex-wrap gap-1">
                      {heavyItemOptions.map((option) => (
                        <PillButton
                          key={option}
                          selected={heavyItems.includes(option)}
                          onClick={() => toggleHeavyItem(option)}
                        >
                          {option}
                        </PillButton>
                      ))}
                    </div>

                    {/* Heavy Item Details */}
                    {heavyItems.length > 0 && (
                      <div className="mt-2 ml-2 p-2 bg-gray-50 rounded-lg border-l-2 border-[#F66256] text-xs space-y-2">
                        {/* TVs */}
                        {heavyItems.includes('TVs over 45"') && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">TVs over 45"</span>
                            <span className="text-gray-600">How many?</span>
                            {['1', '2', '3', '4', '5'].map((count) => (
                              <PillButton key={count} selected={tvCount === count} onClick={() => setTvCount(count)}>{count}</PillButton>
                            ))}
                          </div>
                        )}
                        {/* Piano */}
                        {heavyItems.includes('Piano') && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Piano</span>
                              <span className="text-gray-600">Type:</span>
                              <PillButton selected={pianoType === 'upright'} onClick={() => setPianoType('upright')}>Upright</PillButton>
                              <PillButton selected={pianoType === 'grand'} onClick={() => setPianoType('grand')}>Grand</PillButton>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap ml-4">
                              <span className="text-gray-600">Ground Level Both Locations?</span>
                              <PillButton selected={pianoGroundLevel === 'yes'} onClick={() => setPianoGroundLevel('yes')}>Yes</PillButton>
                              <PillButton selected={pianoGroundLevel === 'no'} onClick={() => setPianoGroundLevel('no')}>No</PillButton>
                            </div>
                          </div>
                        )}
                        {/* Gun Safe */}
                        {heavyItems.includes('Gun Safe') && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Gun Safe</span>
                              <span className="text-gray-600">Over 300lbs?</span>
                              <PillButton selected={gunSafeOver300 === 'yes'} onClick={() => setGunSafeOver300('yes')}>Yes</PillButton>
                              <PillButton selected={gunSafeOver300 === 'no'} onClick={() => setGunSafeOver300('no')}>No</PillButton>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap ml-4">
                              <span className="text-gray-600">Ground Level Both Locations?</span>
                              <PillButton selected={gunSafeGroundLevel === 'yes'} onClick={() => setGunSafeGroundLevel('yes')}>Yes</PillButton>
                              <PillButton selected={gunSafeGroundLevel === 'no'} onClick={() => setGunSafeGroundLevel('no')}>No</PillButton>
                            </div>
                          </div>
                        )}
                        {/* Exercise Equipment */}
                        {heavyItems.includes('Exercise Equipment') && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Exercise Equipment</span>
                            <span className="text-gray-600">Types:</span>
                            {['Treadmill', 'Free Weights', 'Multi-gym'].map((type) => (
                              <PillButton key={type} selected={exerciseEquipmentTypes.includes(type)} onClick={() => toggleExerciseEquipment(type)}>{type}</PillButton>
                            ))}
                          </div>
                        )}
                        {/* Purple/Green Mattress */}
                        {heavyItems.includes('Purple/Green Mattress') && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Purple/Green Mattress</span>
                            <span className="text-gray-600">Ground Level?</span>
                            <PillButton selected={mattressGroundLevel === 'yes'} onClick={() => setMattressGroundLevel('yes')}>Yes</PillButton>
                            <PillButton selected={mattressGroundLevel === 'no'} onClick={() => setMattressGroundLevel('no')}>No</PillButton>
                          </div>
                        )}
                        {/* Shop/Garage */}
                        {heavyItems.includes('Shop/Garage') && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Shop/Garage</span>
                            <span className="text-gray-600">Items:</span>
                            {['Toolchest', 'Table Saw', 'Other'].map((type) => (
                              <PillButton key={type} selected={toolTypes.includes(type)} onClick={() => toggleToolType(type)}>{type}</PillButton>
                            ))}
                            {toolTypes.includes('Other') && (
                              <input
                                type="text"
                                placeholder="Describe..."
                                value={toolOtherText}
                                onChange={(e) => setToolOtherText(e.target.value)}
                                className="flex-1 min-w-[100px] border border-gray-300 rounded-lg px-2 py-1 text-xs"
                              />
                            )}
                          </div>
                        )}
                        {/* Pool Table */}
                        {heavyItems.includes('Pool Table') && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Pool Table</span>
                              <span className="text-gray-600">Need Disassembly?</span>
                              <PillButton selected={poolTableDisassembly === 'yes'} onClick={() => setPoolTableDisassembly('yes')}>Yes</PillButton>
                              <PillButton selected={poolTableDisassembly === 'no'} onClick={() => setPoolTableDisassembly('no')}>No</PillButton>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap ml-4">
                              <span className="text-gray-600">Ground Level Both Locations?</span>
                              <PillButton selected={poolTableGroundLevel === 'yes'} onClick={() => setPoolTableGroundLevel('yes')}>Yes</PillButton>
                              <PillButton selected={poolTableGroundLevel === 'no'} onClick={() => setPoolTableGroundLevel('no')}>No</PillButton>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Additional details */}
                <div>
                  <p className="text-xs text-gray-600 mb-1 font-medium">Additional Details</p>
                  <textarea
                    value={fromDetails}
                    onChange={(e) => setFromDetails(e.target.value)}
                    placeholder="Additional Details"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* ========== ADDITIONAL STOP ========== */}
            {serviceType === 'truck' && (
              <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
                {/* Header - collapsible */}
                {!hasStop ? (
                  <button
                    onClick={() => setHasStop(true)}
                    className="w-full px-3 py-2 border-b border-gray-200 text-left flex items-center gap-2 hover:opacity-80 transition-colors"
                    style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}
                  >
                    <span className="font-bold" style={{ color: '#06649b' }}>+</span>
                    <span className="text-sm text-gray-700 font-medium">Add Additional Stop</span>
                  </button>
                ) : (
                  <>
                    <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          B
                        </div>
                        <div>
                          <p className="text-sm text-gray-700 font-medium">Stop 1</p>
                          <p className="text-gray-500 text-xs">Additional stop along your route</p>
                        </div>
                      </div>
                      <button onClick={handleRemoveStop} className="text-red-500 hover:text-red-700 text-xs">Remove Stop</button>
                    </div>

                    <div className="p-3 space-y-3">
                      {/* Address inputs */}
                      <div className="flex gap-2">
                        <input
                          ref={stopInputRef}
                          type="text"
                          value={stopAddress}
                          onChange={(e) => setStopAddress(e.target.value)}
                          placeholder="Enter stop address"
                          autoComplete="one-time-code"
                          autoCapitalize="off"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={stopUnit}
                          onChange={(e) => setStopUnit(e.target.value)}
                          placeholder="Unit"
                          className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                        />
                      </div>

                      {/* Property Type */}
                      <div>
                        <p className="text-xs text-gray-600 mb-1 font-medium">Property Type</p>
                        <div className="flex flex-wrap gap-1.5">
                          {propertyTypes.map((type) => (
                            <PillButton
                              key={`stop-${type.id}`}
                              selected={stopPropertyType === type.id}
                              onClick={() => handleStopPropertyTypeChange(type.id as PropertyType)}
                            >
                              {type.label}
                            </PillButton>
                          ))}
                        </div>
                      </div>

                      {/* Dropoff or Pickup */}
                      <div>
                        <p className="text-xs text-gray-600 mb-1 font-medium">Are we dropping off or picking up here?</p>
                        <div className="flex gap-2">
                          <PillButton selected={stopAction === 'dropoff'} onClick={() => setStopAction('dropoff')}>Dropping Off</PillButton>
                          <PillButton selected={stopAction === 'pickup'} onClick={() => setStopAction('pickup')}>Picking Up</PillButton>
                        </div>
                      </div>

                      {/* Pickup-specific fields */}
                      {stopAction === 'pickup' && (
                        <>
                          {/* Bedrooms - for home/apartment */}
                          {stopFields.showBedrooms && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">Bedrooms</p>
                              <div className="flex gap-1">
                                {bedroomOptions.map((option) => (
                                  <PillButton key={`stop-bed-${option}`} selected={stopBedrooms === option} onClick={() => setStopBedrooms(option)} className="w-10">{option}</PillButton>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Square Footage - for home/apartment/office */}
                          {stopFields.showSquareFootage && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">Square Footage</p>
                              <div className="flex flex-wrap gap-1">
                                {squareFootageOptions.map((option) => (
                                  <PillButton key={`stop-sqft-${option}`} selected={stopSquareFootage === option} onClick={() => setStopSquareFootage(option)}>{option}</PillButton>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Belongings Amount */}
                          {stopPropertyType !== 'storage' && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">How much are we picking up?</p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={stopBelongingsAmount}
                                  onChange={(e) => setStopBelongingsAmount(e.target.value)}
                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#F66256] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-[#F66256] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                                />
                                <span className="text-xs text-rose-500 font-medium min-w-[80px]">{getBelongingsLabel(stopBelongingsAmount)}</span>
                              </div>
                            </div>
                          )}

                          {/* Heavy Items for stop */}
                          <div>
                            <p className="text-xs text-gray-600 mb-1 font-medium">Heavy/Special Items at Stop</p>
                            <div className="flex flex-wrap gap-1">
                              {heavyItemOptions.map((option) => (
                                <PillButton
                                  key={`stop-heavy-${option}`}
                                  selected={stopHeavyItems.includes(option)}
                                  onClick={() => toggleStopHeavyItem(option)}
                                >
                                  {option}
                                </PillButton>
                              ))}
                            </div>

                            {/* Stop Heavy Item Details - Sub-selections */}
                            {stopHeavyItems.length > 0 && (
                              <div className="mt-2 ml-2 p-2 bg-gray-50 rounded-lg border-l-2 border-[#F66256] text-xs space-y-2">
                                {/* TVs */}
                                {stopHeavyItems.includes('TVs over 45"') && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">TVs over 45"</span>
                                    <span className="text-gray-600">How many?</span>
                                    {['1', '2', '3', '4', '5'].map((count) => (
                                      <PillButton key={`stop-tv-${count}`} selected={tvCount === count} onClick={() => setTvCount(count)}>{count}</PillButton>
                                    ))}
                                  </div>
                                )}
                                {/* Piano */}
                                {stopHeavyItems.includes('Piano') && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Piano</span>
                                      <span className="text-gray-600">Type:</span>
                                      <PillButton selected={pianoType === 'upright'} onClick={() => setPianoType('upright')}>Upright</PillButton>
                                      <PillButton selected={pianoType === 'grand'} onClick={() => setPianoType('grand')}>Grand</PillButton>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap ml-4">
                                      <span className="text-gray-600">Ground Level?</span>
                                      <PillButton selected={pianoGroundLevel === 'yes'} onClick={() => setPianoGroundLevel('yes')}>Yes</PillButton>
                                      <PillButton selected={pianoGroundLevel === 'no'} onClick={() => setPianoGroundLevel('no')}>No</PillButton>
                                    </div>
                                  </div>
                                )}
                                {/* Gun Safe */}
                                {stopHeavyItems.includes('Gun Safe') && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Gun Safe</span>
                                      <span className="text-gray-600">Over 300lbs?</span>
                                      <PillButton selected={gunSafeOver300 === 'yes'} onClick={() => setGunSafeOver300('yes')}>Yes</PillButton>
                                      <PillButton selected={gunSafeOver300 === 'no'} onClick={() => setGunSafeOver300('no')}>No</PillButton>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap ml-4">
                                      <span className="text-gray-600">Ground Level?</span>
                                      <PillButton selected={gunSafeGroundLevel === 'yes'} onClick={() => setGunSafeGroundLevel('yes')}>Yes</PillButton>
                                      <PillButton selected={gunSafeGroundLevel === 'no'} onClick={() => setGunSafeGroundLevel('no')}>No</PillButton>
                                    </div>
                                  </div>
                                )}
                                {/* Exercise Equipment */}
                                {stopHeavyItems.includes('Exercise Equipment') && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Exercise Equipment</span>
                                    <span className="text-gray-600">Types:</span>
                                    {['Treadmill', 'Free Weights', 'Multi-gym'].map((type) => (
                                      <PillButton key={`stop-exercise-${type}`} selected={exerciseEquipmentTypes.includes(type)} onClick={() => toggleExerciseEquipment(type)}>{type}</PillButton>
                                    ))}
                                  </div>
                                )}
                                {/* Purple/Green Mattress */}
                                {stopHeavyItems.includes('Purple/Green Mattress') && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Purple/Green Mattress</span>
                                    <span className="text-gray-600">Ground Level?</span>
                                    <PillButton selected={mattressGroundLevel === 'yes'} onClick={() => setMattressGroundLevel('yes')}>Yes</PillButton>
                                    <PillButton selected={mattressGroundLevel === 'no'} onClick={() => setMattressGroundLevel('no')}>No</PillButton>
                                  </div>
                                )}
                                {/* Shop/Garage */}
                                {stopHeavyItems.includes('Shop/Garage') && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Shop/Garage</span>
                                    <span className="text-gray-600">Items:</span>
                                    {['Toolchest', 'Table Saw', 'Other'].map((type) => (
                                      <PillButton key={`stop-tool-${type}`} selected={toolTypes.includes(type)} onClick={() => toggleToolType(type)}>{type}</PillButton>
                                    ))}
                                    {toolTypes.includes('Other') && (
                                      <input
                                        type="text"
                                        placeholder="Describe..."
                                        value={toolOtherText}
                                        onChange={(e) => setToolOtherText(e.target.value)}
                                        className="flex-1 min-w-[100px] border border-gray-300 rounded-lg px-2 py-1 text-xs"
                                      />
                                    )}
                                  </div>
                                )}
                                {/* Pool Table */}
                                {stopHeavyItems.includes('Pool Table') && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="bg-[#F66256] text-white px-2 py-0.5 rounded text-xs">Pool Table</span>
                                      <span className="text-gray-600">Need Disassembly?</span>
                                      <PillButton selected={poolTableDisassembly === 'yes'} onClick={() => setPoolTableDisassembly('yes')}>Yes</PillButton>
                                      <PillButton selected={poolTableDisassembly === 'no'} onClick={() => setPoolTableDisassembly('no')}>No</PillButton>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap ml-4">
                                      <span className="text-gray-600">Ground Level?</span>
                                      <PillButton selected={poolTableGroundLevel === 'yes'} onClick={() => setPoolTableGroundLevel('yes')}>Yes</PillButton>
                                      <PillButton selected={poolTableGroundLevel === 'no'} onClick={() => setPoolTableGroundLevel('no')}>No</PillButton>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Stories - for home */}
                      {stopFields.showStories && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1 font-medium">Stories</p>
                          <div className="flex gap-1">
                            {storiesOptions.map((option) => (
                              <PillButton key={`stop-story-${option}`} selected={stopStories === option} onClick={() => setStopStories(option)} className="w-10">{option}</PillButton>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Floor Level & Elevator - for apartment/office */}
                      {(stopFields.showFloorLevel && stopPropertyType !== 'storage') && (
                        <div className="flex gap-3">
                          <div>
                            <p className="text-xs text-gray-600 mb-1 font-medium">Floor Level</p>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => setStopFloorLevel(String(Math.max(1, parseInt(stopFloorLevel || '1') - 1)))} className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 hover:border-blue-400 text-sm">-</button>
                              <input type="text" value={stopFloorLevel} onChange={(e) => setStopFloorLevel(e.target.value.replace(/\D/g, '') || '1')} className="w-10 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm" />
                              <button type="button" onClick={() => setStopFloorLevel(String(parseInt(stopFloorLevel || '1') + 1))} className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 hover:border-blue-400 text-sm">+</button>
                            </div>
                          </div>
                          {stopFields.showElevator && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">Elevator</p>
                              <div className="flex gap-1">
                                <PillButton selected={stopElevator === 'yes'} onClick={() => setStopElevator('yes')}>Yes</PillButton>
                                <PillButton selected={stopElevator === 'no'} onClick={() => setStopElevator('no')}>No</PillButton>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Additional details */}
                      <div>
                        <p className="text-xs text-gray-600 mb-1 font-medium">Additional Details</p>
                        <textarea
                          value={stopDetails}
                          onChange={(e) => setStopDetails(e.target.value)}
                          placeholder="Additional Details"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                          rows={4}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ========== MOVING TO ========== */}
            {serviceType === 'truck' && (
              <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
                {/* Header with marker */}
                <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-200" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
                  <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {hasStop ? 'C' : 'B'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium">Where are you moving your belongings to?</p>
                    <label className="flex items-center gap-1 mt-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={toIsCurrentHome}
                        onChange={(e) => handleToCurrentHomeChange(e.target.checked)}
                        className="w-3 h-3 rounded border-gray-300 bg-white text-rose-500 focus:ring-rose-500"
                      />
                      <span className="text-gray-500 text-xs">This is my current home or business</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 space-y-3">
                  {/* Address inputs */}
                  <div className="flex gap-2">
                    <input
                      ref={toInputRef}
                      type="text"
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      placeholder="Enter destination address"
                      autoComplete="one-time-code"
                      autoCapitalize="off"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={toUnit}
                      onChange={(e) => setToUnit(e.target.value)}
                      placeholder="Unit"
                      className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                    />
                  </div>

                  {/* Property Data - Sq Ft, Value, $ button - Only when current home */}
                  {toIsCurrentHome && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={isLoadingToProperty ? '' : formatNumberWithCommas(toSquareFootage)}
                        onChange={(e) => setToSquareFootage(e.target.value.replace(/,/g, ''))}
                        placeholder={isLoadingToProperty ? "Loading..." : "Sq Ft"}
                        disabled={isLoadingToProperty}
                        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        value={isLoadingToProperty ? '' : formatNumberWithCommas(toZestimate)}
                        onChange={(e) => setToZestimate(e.target.value.replace(/,/g, ''))}
                        placeholder={isLoadingToProperty ? "Loading..." : "Value"}
                        disabled={isLoadingToProperty}
                        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={fetchToPropertyData}
                        disabled={isLoadingToProperty}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Fetch property data from Zillow"
                      >
                        $
                      </button>
                    </div>
                  )}

                  {/* Property Type */}
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Property Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {propertyTypes.map((type) => (
                        <PillButton
                          key={`to-${type.id}`}
                          selected={toPropertyType === type.id}
                          onClick={() => handleToPropertyTypeChange(type.id as PropertyType)}
                        >
                          {type.label}
                        </PillButton>
                      ))}
                    </div>
                  </div>

                  {/* Storage-specific fields */}
                  {toFields.showUnitSize && (
                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                      {toStorageUnits.map((unit, index) => (
                        <div key={unit.id} className="mb-2 last:mb-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-gray-700">Unit {index + 1}</span>
                            {toStorageUnits.length > 1 && (
                              <button onClick={() => removeStorageUnit('to', unit.id)} className="text-red-500 text-xs">Remove</button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            <span className="text-xs text-gray-500 mr-1">Size:</span>
                            {unitSizeOptions.map((option) => (
                              <PillButton
                                key={`to-${unit.id}-${option}`}
                                selected={unit.size === option}
                                onClick={() => updateStorageUnit('to', unit.id, 'size', option)}
                              >
                                {option}
                              </PillButton>
                            ))}
                          </div>
                          <div className="flex gap-1 mb-1">
                            <span className="text-xs text-gray-500 mr-1">Type:</span>
                            <PillButton selected={unit.type === 'conditioned'} onClick={() => updateStorageUnit('to', unit.id, 'type', 'conditioned')}>Conditioned</PillButton>
                            <PillButton selected={unit.type === 'standard'} onClick={() => updateStorageUnit('to', unit.id, 'type', 'standard')}>Standard</PillButton>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => addStorageUnit('to')} className="text-rose-500 text-xs font-medium mt-1">+ Add Unit</button>
                    </div>
                  )}

                  {/* Stories - for home */}
                  {toFields.showStories && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1 font-medium">Stories</p>
                      <div className="flex gap-1">
                        {storiesOptions.map((option) => (
                          <PillButton
                            key={`to-story-${option}`}
                            selected={toStories === option}
                            onClick={() => setToStories(option)}
                            className="w-10"
                          >
                            {option}
                          </PillButton>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Floor Level & Elevator - for apartment/office */}
                  {(toFields.showFloorLevel && toPropertyType !== 'storage') && (
                    <div className="flex gap-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1 font-medium">Floor Level</p>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setToFloorLevel(String(Math.max(1, parseInt(toFloorLevel || '1') - 1)))} className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 hover:border-blue-400 text-sm">-</button>
                          <input type="text" value={toFloorLevel} onChange={(e) => setToFloorLevel(e.target.value.replace(/\D/g, '') || '1')} className="w-10 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm" />
                          <button type="button" onClick={() => setToFloorLevel(String(parseInt(toFloorLevel || '1') + 1))} className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 hover:border-blue-400 text-sm">+</button>
                        </div>
                      </div>
                      {toFields.showElevator && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1 font-medium">Elevator</p>
                          <div className="flex gap-1">
                            <PillButton selected={toElevator === 'yes'} onClick={() => setToElevator('yes')}>Yes</PillButton>
                            <PillButton selected={toElevator === 'no'} onClick={() => setToElevator('no')}>No</PillButton>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional details */}
                  <div>
                    <p className="text-xs text-gray-600 mb-1 font-medium">Additional Details</p>
                    <textarea
                      value={toDetails}
                      onChange={(e) => setToDetails(e.target.value)}
                      placeholder="Additional Details"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
          {/* END RIGHT COLUMN */}

        </div>

        {/* Save Button and Estimate - Same width as columns */}
        <div className="max-w-4xl mx-auto">
          {/* Save Button - Centered, above estimate */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="py-1.5 px-8 bg-[#06649b] hover:bg-[#055180] text-white text-sm font-medium rounded-lg shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {currentEstimateId ? 'Update' : 'Save'}
                </>
              )}
            </button>

            {saveMessage && (
              <span className={`text-sm font-medium ${
                saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {saveMessage.text}
              </span>
            )}

            {currentQuoteId && (
              <span className="text-sm text-gray-500">
                Quote: {currentQuoteId}
              </span>
            )}
          </div>

          {/* Live Quote Display - Matches Website Format */}
          {quote.total > 0 && (
            <div className="mt-3 bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              {/* Header - matches other section headers */}
              <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2" style={{ backgroundColor: 'rgba(6, 100, 155, 0.1)' }}>
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-700 font-medium">Moving Estimate</p>
              </div>

              {/* Quote Items */}
              <div className="p-4 space-y-3">
                {quote.items.map((item, index) => (
                  <div key={index} className="border-b border-gray-200 pb-2 last:border-b-0">
                    {/* Main item row */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">
                          {item.description}
                          {item.details && (
                            <span className="font-normal text-gray-500 text-xs italic ml-2">{item.details}</span>
                          )}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">${item.amount.toLocaleString()}</p>
                    </div>

                    {/* Sub-items */}
                    {item.subItems && item.subItems.length > 0 && (
                      <div className="mt-1.5 ml-3 space-y-1">
                        {item.subItems.map((subItem, subIndex) => (
                          <div key={subIndex}>
                            <div className="flex justify-between text-gray-500 text-xs">
                              <span className={subItem.description.startsWith('*') ? 'text-red-600' : ''}>
                                {subItem.description}
                              </span>
                              <span>${subItem.amount.toLocaleString()}</span>
                            </div>
                            {/* Show details below the sub-item */}
                            {subItem.details && !subItem.details.startsWith('*') && (
                              <p className="text-gray-400 text-[10px] italic">{subItem.details}</p>
                            )}
                          </div>
                        ))}
                        {/* Show asterisk details at the bottom */}
                        {item.subItems.some(sub => sub.details && sub.details.startsWith('*')) && (
                          <p className="text-gray-400 text-[10px] italic">
                            {item.subItems.find(sub => sub.details?.startsWith('*'))?.details}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Total - Price Range (matching website) */}
                <div className="border-t-2 border-gray-300 pt-3 mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-bold text-gray-800">Estimated Total:</p>
                    <p className="text-lg font-bold text-green-600">
                      ${Math.round(Math.max(quote.movingLabor * 0.8, quote.minimumCharge) + quote.movingMaterials * 0.8 + quote.otherServices * 0.8 + quote.fixedTotal).toLocaleString()} - ${Math.round((quote.movingLabor + quote.movingMaterials + quote.otherServices) * 1.2 + quote.fixedTotal).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-gray-500 text-[10px] italic text-center">
                    *Estimate based on provided information. Final price may vary.
                  </p>
                </div>

                {/* Important Notes - for heavy items with alerts */}
                {quote.items.some(item => item.subItems?.some(sub => sub.alert)) && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="font-semibold text-gray-700 mb-1 text-xs">Important Notes:</p>
                    <p className="text-red-600 text-[10px]">
                      * Must be on ground level with no more than 2 steps
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
