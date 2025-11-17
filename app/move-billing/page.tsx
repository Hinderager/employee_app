"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

// Create Supabase client once at module level
const supabase = createClient();

// Supply items data
const SUPPLY_ITEMS = [
  { id: 1, name: "X-Large Box", price: 6, image: "/supplies/asset-1.png" },
  { id: 2, name: "Large Box", price: 5, image: "/supplies/asset-2.png" },
  { id: 3, name: "Medium Box", price: 4, image: "/supplies/asset-3.png" },
  { id: 4, name: "Small Box", price: 3, image: "/supplies/asset-4.png" },
  { id: 5, name: "TV Box", price: 60, image: "/supplies/asset-5.png" },
  { id: 6, name: "5\" x 1,000' Wrap", price: 10, image: "/supplies/asset-6.png" },
  { id: 7, name: "15\" x 820' Wrap", price: 20, image: "/supplies/asset-7.png" },
  { id: 8, name: "Moving Pads", price: 10, image: "/supplies/asset-8.png" },
  { id: 9, name: "Mattress Cover", price: 8, image: "/supplies/asset-9.png" },
  { id: 10, name: "Sofa Cover", price: 8, image: "/supplies/asset-10.png" },
  { id: 11, name: "Chair Cover", price: 6, image: "/supplies/asset-11.png" },
  { id: 12, name: "Bubble Wrap", price: 30, image: "/supplies/asset-12.png" },
  { id: 13, name: "10lbs Wrapping Paper", price: 20, image: "/supplies/asset-13.png" },
  { id: 14, name: "Ratchet Strap", price: 7, image: "/supplies/asset-14.png" },
  { id: 15, name: "24\" x 50' floor runner", price: 25, image: "/supplies/asset-15.png" },
];

export default function BillingPage() {
  const [selectedItems, setSelectedItems] = useState<{[key: number]: number}>({});
  const [jobNumber, setJobNumber] = useState("");
  const [activeJobNumber, setActiveJobNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Load job when Load button is clicked
  const handleLoadJob = async () => {
    if (!jobNumber.trim()) {
      return;
    }

    setActiveJobNumber(jobNumber.trim());

      setIsLoading(true);
      isLoadingRef.current = true;

      try {
        const { data, error } = await supabase
          .from('job_materials')
          .select('materials')
          .eq('job_number', jobNumber.trim())
          .maybeSingle();

        if (error) {
          console.error('Error loading materials:', error);
          return;
        }

        // Load materials if they exist, otherwise start fresh
        if (data && data.materials) {
          setSelectedItems(data.materials);
        } else {
          setSelectedItems({});
        }
      } catch (error) {
        console.error('Error loading materials:', error);
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 500);
      }
  };

  // Clear job number and reset everything locally
  const handleClear = () => {
    setJobNumber("");
    setActiveJobNumber("");
    setSelectedItems({});
  };

  // Save materials to Supabase (debounced)
  useEffect(() => {
    if (!activeJobNumber || isLoadingRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('job_materials')
          .upsert({
            job_number: activeJobNumber,
            materials: selectedItems,
          }, {
            onConflict: 'job_number'
          });

        if (error) {
          console.error('Error saving materials:', error);
        }
      } catch (error) {
        console.error('Error saving materials:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedItems, activeJobNumber]);

  // Real-time subscription for collaborative updates
  useEffect(() => {
    if (!activeJobNumber || !jobNumber.trim()) {
      return;
    }

    const channel = supabase
      .channel(`job_materials:${activeJobNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_materials',
          filter: `job_number=eq.${activeJobNumber}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'materials' in payload.new) {
            const newMaterials = payload.new.materials as {[key: number]: number};

            // Merge strategy: if both users are editing, sum the quantities
            setSelectedItems(prevItems => {
              const merged: {[key: number]: number} = { ...newMaterials };

              // For items that exist in both old and new, use the higher value
              // This prevents losing data when multiple people add items simultaneously
              Object.keys(prevItems).forEach(key => {
                const id = parseInt(key);
                const prevQty = prevItems[id] || 0;
                const newQty = newMaterials[id] || 0;

                // Use max to prevent accidental decreases from race conditions
                merged[id] = Math.max(prevQty, newQty);
              });

              return merged;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeJobNumber]);

  const handleQuantityChange = (id: number, quantity: number) => {
    if (quantity <= 0) {
      const newItems = { ...selectedItems };
      delete newItems[id];
      setSelectedItems(newItems);
    } else {
      setSelectedItems({ ...selectedItems, [id]: quantity });
    }
  };

  const getTotalItems = () => {
    return Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalCharge = () => {
    return Object.entries(selectedItems).reduce((total, [id, qty]) => {
      const item = SUPPLY_ITEMS.find(item => item.id === parseInt(id));
      if (item && item.price) {
        const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        return total + (price * qty);
      }
      return total;
    }, 0);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-20">
      {/* Menu Button - Top Left */}
      <Link
        href="/home"
        className="fixed top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 transition-all hover:scale-105"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="font-medium text-gray-900">Menu</span>
      </Link>

      {/* Job Number Field */}
      <div className="px-6 pt-20 pb-4">
        <div className="max-w-md bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-4">
            <input
              id="jobNumberInput"
              type="text"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLoadJob()}
              placeholder="Enter job number"
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-topshelf-yellow"
            />
            <button
              onClick={handleLoadJob}
              className="px-6 py-2 bg-topshelf-blue hover:bg-blue-700 active:bg-blue-800 rounded-lg font-semibold text-white transition-colors"
            >
              {isLoading ? 'Loading...' : 'Load'}
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 rounded-lg font-semibold text-white transition-colors"
            >
              Clear
            </button>
          </div>
          {activeJobNumber && (
            <div className="mt-2 text-sm flex items-center gap-2">
              {isSaving ? (
                <span className="text-green-600">Saving...</span>
              ) : (
                <span className="text-gray-500">Job: {activeJobNumber} - Synced</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SUPPLY_ITEMS.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative h-40 bg-white">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-contain p-2"
                  quality={100}
                  unoptimized
                />
              </div>
              <div className="p-4 bg-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {item.name}
                  </h3>
                  {item.price && (
                    <span className="font-bold text-gray-900 text-4xl">
                      ${item.price}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuantityChange(item.id, (selectedItems[item.id] || 0) - 1)}
                    className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 active:bg-gray-400 flex items-center justify-center font-bold text-gray-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selectedItems[item.id] || 0}
                    onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                    onFocus={(e) => {
                      e.target.select();
                      if (parseFloat(e.target.value) === 0) {
                        e.target.value = '';
                      }
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-12 h-8 text-center border border-gray-300 rounded-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => handleQuantityChange(item.id, (selectedItems[item.id] || 0) + 1)}
                    className="w-8 h-8 rounded-lg bg-topshelf-yellow hover:bg-yellow-400 active:bg-yellow-500 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-topshelf-blue border-t border-blue-800 shadow-lg py-6 px-4 z-[1000]">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-xl font-semibold text-white">
              Total Materials Charge:
            </div>
            <div className="text-3xl font-bold text-white">
              ${getTotalCharge().toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
