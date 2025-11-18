"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function MoveWalkthrough() {
  const router = useRouter();
  const [jobNumber, setJobNumber] = useState("");
  const [address, setAddress] = useState("");
  const [folderUrl, setFolderUrl] = useState("");
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    // Service Type
    serviceType: "truck",

    // Customer Information
    firstName: "",
    lastName: "",
    phone: "",
    email: "",

    // Addresses - Pickup
    pickupAddress: "",
    pickupUnit: "",
    pickupCity: "",
    pickupState: "",
    pickupZip: "",
    pickupLocationType: "house",
    pickupLocationOther: "",
    pickupHouseSquareFeet: "",
    pickupApartmentBedBath: "",
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
    deliveryApartmentBedBath: "",
    deliveryStorageUnitQuantity: 1,
    deliveryStorageUnitSizes: [""],
    deliveryPODQuantity: 1,
    deliveryPODSize: "",
    deliveryTruckLength: "",

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
    timeFlexible: false,
    readyToSchedule: false,

    // Estimates
    estimatedCrewSize: "",
    crewSizeNotes: "",

    // Special Notes
    specialRequests: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLoadJob = async () => {
    if (!jobNumber.trim()) {
      alert('Please enter a job number');
      return;
    }

    setIsLoadingJob(true);

    try {
      const response = await fetch('/api/move-wt/load-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobNumber: jobNumber.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load job');
      }

      setAddress(result.address);
      setFolderUrl(result.folderUrl || '');

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
        setFormData(prev => ({
          ...prev,
          ...result.existingFormData,
        }));
        alert('Previous form data loaded for this address!');
      }
    } catch (error) {
      console.error('Load job error:', error);
      alert(error instanceof Error ? error.message : 'Failed to load job. Please try again.');
    } finally {
      setIsLoadingJob(false);
    }
  };

  const handleClear = () => {
    setJobNumber("");
    setAddress("");
    setFolderUrl("");
    // Reset form to initial state
    setFormData({
      // Service Type
      serviceType: "truck",

      // Customer Information
      firstName: "",
      lastName: "",
      phone: "",
      email: "",

      // Addresses - Pickup
      pickupAddress: "",
      pickupUnit: "",
      pickupCity: "",
      pickupState: "",
      pickupZip: "",
      pickupLocationType: "house",
      pickupLocationOther: "",
      pickupHouseSquareFeet: "",
      pickupApartmentBedBath: "",
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
      deliveryApartmentBedBath: "",
      deliveryStorageUnitQuantity: 1,
      deliveryStorageUnitSizes: [""],
      deliveryPODQuantity: 1,
      deliveryPODSize: "",
      deliveryTruckLength: "",

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
      timeFlexible: false,
      readyToSchedule: false,

      // Estimates
      estimatedCrewSize: "",
      crewSizeNotes: "",

      // Special Notes
      specialRequests: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobNumber || !address) {
      alert('Please load a job number first');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/move-wt/save-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobNumber: jobNumber.trim(),
          address: address,
          formData: formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save form');
      }

      console.log("Form submitted:", formData);
      alert("Walk-through completed! Data saved successfully.");
    } catch (error) {
      console.error('Save form error:', error);
      alert(error instanceof Error ? error.message : 'Failed to save form. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
        {/* Job Number Section */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-center gap-4">
            <input
              id="jobNumber"
              type="text"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="Job #"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleLoadJob}
              disabled={isLoadingJob}
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
          {address && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">Address:</p>
              <p className="text-sm text-green-800">{address}</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 space-y-6">

        {/* Service Type */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Service Type</h2>

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

        {/* Pics and Videos */}
        {folderUrl && (
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pics and Videos</h2>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <a
                href={folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
              >
                View Google Drive Folder for this job →
              </a>
            </div>
          </section>
        )}

        {/* Customer Information */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Information</h2>

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
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Addresses */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Addresses</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-md font-semibold text-gray-800 mb-2">Pickup Address</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    name="pickupLocationType"
                    value={formData.pickupLocationType}
                    onChange={handleInputChange}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Location Type</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="storage-unit">Storage Unit</option>
                    <option value="other">Other</option>
                  </select>

                  {formData.pickupLocationType === 'house' && (
                    <input
                      type="text"
                      name="pickupHouseSquareFeet"
                      value={formData.pickupHouseSquareFeet}
                      onChange={handleInputChange}
                      placeholder="Square Feet"
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}

                  {formData.pickupLocationType === 'apartment' && (
                    <input
                      type="text"
                      name="pickupApartmentBedBath"
                      value={formData.pickupApartmentBedBath}
                      onChange={handleInputChange}
                      placeholder="Bed/Bath"
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}

                </div>

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
              </div>
            </div>

            <div>
              <h3 className="text-md font-semibold text-gray-800 mb-2">Delivery Address</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    name="deliveryLocationType"
                    value={formData.deliveryLocationType}
                    onChange={handleInputChange}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Location Type</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="storage-unit">Storage Unit</option>
                    <option value="pod">POD</option>
                    <option value="truck">Truck</option>
                    <option value="other">Other</option>
                  </select>

                  {formData.deliveryLocationType === 'house' && (
                    <input
                      type="text"
                      name="deliveryHouseSquareFeet"
                      value={formData.deliveryHouseSquareFeet}
                      onChange={handleInputChange}
                      placeholder="Square Feet"
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}

                  {formData.deliveryLocationType === 'apartment' && (
                    <input
                      type="text"
                      name="deliveryApartmentBedBath"
                      value={formData.deliveryApartmentBedBath}
                      onChange={handleInputChange}
                      placeholder="Bed/Bath"
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
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
                </div>

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

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
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
              </div>
            </div>

            <div>
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  name="hasAdditionalStop"
                  checked={formData.hasAdditionalStop}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-md font-semibold text-gray-800">
                  Additional Stop
                </label>
              </div>

              {formData.hasAdditionalStop && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      name="additionalStopLocationType"
                      value={formData.additionalStopLocationType}
                      onChange={handleInputChange}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Location Type</option>
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="storage-unit">Storage Unit</option>
                      <option value="other">Other</option>
                    </select>

                    {formData.additionalStopLocationType === 'house' && (
                      <input
                        type="text"
                        name="additionalStopHouseSquareFeet"
                        value={formData.additionalStopHouseSquareFeet}
                        onChange={handleInputChange}
                        placeholder="Square Feet"
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}

                    {formData.additionalStopLocationType === 'apartment' && (
                      <input
                        type="text"
                        name="additionalStopApartmentBedBath"
                        value={formData.additionalStopApartmentBedBath}
                        onChange={handleInputChange}
                        placeholder="Bed/Bath"
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}

                  </div>

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
          </div>
        </section>

        {/* Pickup Location Access */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pickup Location Access</h2>

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

        {/* Delivery Location Access */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Location Access</h2>

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

        {/* Heavy/Special Items */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Heavy/Special Items</h2>

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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="gunSafesDetails"
                  value={formData.gunSafesDetails}
                  onChange={handleInputChange}
                  placeholder="Details (e.g., approximate size, 6ft tall)"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="pianosDetails"
                  value={formData.pianosDetails}
                  onChange={handleInputChange}
                  placeholder="Details (e.g., upright, grand, baby grand)"
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
                  placeholder="Quantity & sizes (e.g., 1 King, 2 Queen)"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  name="largeTVsDetails"
                  value={formData.largeTVsDetails}
                  onChange={handleInputChange}
                  placeholder="Details (e.g., sizes: 65 inch, 55 inch)"
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
                  placeholder="List items"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Special Disassembly</h2>

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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold text-sm"
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
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pets</h2>

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
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Other Services</h2>

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
                    <option value="lots">Lots!</option>
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

        {/* Insurance */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Insurance</h2>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="needsInsurance"
                checked={formData.needsInsurance}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Customer Needs/Wants Insurance
              </label>
            </div>

            {formData.needsInsurance && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Value of Items
                </label>
                <input
                  type="text"
                  name="estimatedValue"
                  value={formData.estimatedValue}
                  onChange={handleInputChange}
                  placeholder="e.g., $50,000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </section>

        {/* Timing & Scheduling */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Timing & Scheduling</h2>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
                Customer is Flexible on Dates
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="readyToSchedule"
                checked={formData.readyToSchedule}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Customer is Ready to Schedule
              </label>
            </div>
          </div>
        </section>

        {/* Recommended Crew Size */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recommended Crew Size</h2>

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
                Notes
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
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Special Requests & Notes</h2>

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

        {/* Submit Button */}
        <div className="sticky bottom-0 bg-white p-4 shadow-lg rounded-lg">
          <button
            type="submit"
            disabled={isSaving || !jobNumber || !address}
            className="w-full py-3 px-4 text-white font-bold rounded-lg shadow-md transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ backgroundColor: isSaving || !jobNumber || !address ? '#9CA3AF' : '#06649b' }}
          >
            {isSaving ? 'Saving...' : 'Complete Walk-Through'}
          </button>
        </div>
      </form>
    </main>
  );
}
