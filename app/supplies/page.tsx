"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Supply {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
  sort_order: number;
}

const COLORS = [
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
];

// Sortable Supply Item Component
function SortableSupplyItem({
  supply,
  index,
  onClick,
  rearrangeMode,
}: {
  supply: Supply;
  index: number;
  onClick: () => void;
  rearrangeMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: supply.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const getColor = (idx: number) => COLORS[idx % COLORS.length];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl shadow-md transition-all duration-200 p-6 border border-gray-200 ${
        rearrangeMode
          ? "border-dashed border-2 border-orange-300"
          : "hover:shadow-xl active:scale-98 cursor-pointer"
      } ${isDragging ? "shadow-2xl" : ""}`}
      onClick={() => !rearrangeMode && onClick()}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        {rearrangeMode && (
          <div
            {...attributes}
            {...listeners}
            className="w-full flex justify-center cursor-grab active:cursor-grabbing touch-none"
          >
            <Bars3Icon className="h-6 w-6 text-gray-400" />
          </div>
        )}
        <div
          className={`${getColor(index)} w-12 h-12 rounded-xl shadow-md flex items-center justify-center`}
        >
          <span className="text-white font-bold text-lg">{index + 1}</span>
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{supply.title}</h2>
          {supply.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {supply.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add supply modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);

  // Detail/Edit modal
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Rearrange mode
  const [rearrangeMode, setRearrangeMode] = useState(false);

  // dnd-kit sensors for mouse, touch, and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch supplies
  const fetchSupplies = async () => {
    try {
      const res = await fetch("/api/supplies-needed");
      const data = await res.json();
      if (data.success) {
        const sorted = (data.supplies as Supply[]).sort((a, b) => {
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setSupplies(sorted);
      } else {
        setError(data.error || "Failed to load supplies");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, []);

  // Add new supply
  const handleAddSupply = async () => {
    if (!newTitle.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/supplies-needed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSupplies([data.supply, ...supplies]);
        setNewTitle("");
        setNewDescription("");
        setShowAddModal(false);
      } else {
        alert(data.error || "Failed to add supply");
      }
    } catch (err) {
      alert("Failed to add supply");
    } finally {
      setAdding(false);
    }
  };

  // Open supply for editing
  const openSupply = (supply: Supply) => {
    setSelectedSupply(supply);
    setEditTitle(supply.title);
    setEditDescription(supply.description || "");
    setHasChanges(false);
  };

  // Track changes
  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    setHasChanges(value !== selectedSupply?.title || editDescription !== (selectedSupply?.description || ""));
  };

  const handleDescriptionChange = (value: string) => {
    setEditDescription(value);
    setHasChanges(editTitle !== selectedSupply?.title || value !== (selectedSupply?.description || ""));
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!selectedSupply || !editTitle.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/supplies-needed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSupply.id,
          title: editTitle,
          description: editDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSupplies(supplies.map((c) => (c.id === selectedSupply.id ? data.supply : c)));
        setSelectedSupply(data.supply);
        setHasChanges(false);
      } else {
        alert(data.error || "Failed to save changes");
      }
    } catch (err) {
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Complete supply
  const handleComplete = async () => {
    if (!selectedSupply) return;

    setCompleting(true);
    try {
      const res = await fetch("/api/supplies-needed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSupply.id,
          completed: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSupplies(supplies.filter((c) => c.id !== selectedSupply.id));
        setSelectedSupply(null);
      } else {
        alert(data.error || "Failed to complete supply");
      }
    } catch (err) {
      alert("Failed to complete supply");
    } finally {
      setCompleting(false);
    }
  };

  // Delete supply
  const handleDelete = async () => {
    if (!selectedSupply) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/supplies-needed?id=${selectedSupply.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSupplies(supplies.filter((c) => c.id !== selectedSupply.id));
        setSelectedSupply(null);
      } else {
        alert(data.error || "Failed to delete supply");
      }
    } catch (err) {
      alert("Failed to delete supply");
    } finally {
      setDeleting(false);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = supplies.findIndex((c) => c.id === active.id);
      const newIndex = supplies.findIndex((c) => c.id === over.id);

      const newSupplies = arrayMove(supplies, oldIndex, newIndex);
      const updatedSupplies = newSupplies.map((supply, index) => ({
        ...supply,
        sort_order: index,
      }));

      setSupplies(updatedSupplies);

      // Save new order to database
      try {
        await fetch("/api/supplies-needed/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orders: updatedSupplies.map((c) => ({ id: c.id, sort_order: c.sort_order })),
          }),
        });
      } catch (err) {
        console.error("Failed to save order:", err);
      }
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom">
      {/* Header */}
      <header
        className="shadow-sm safe-top"
        style={{ backgroundColor: "#06649b" }}
      >
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/home" className="mr-4">
              <ArrowLeftIcon className="h-6 w-6 text-white" />
            </Link>
            <h1 className="text-lg font-bold text-white">Supplies Needed</h1>
          </div>
          <div className="flex items-center gap-2">
            {supplies.length > 1 && (
              <button
                onClick={() => setRearrangeMode(!rearrangeMode)}
                className={`p-2 rounded-lg transition-colors ${
                  rearrangeMode ? "bg-white text-orange-600" : "bg-white/20 hover:bg-white/30"
                }`}
              >
                <Bars3Icon className={`h-6 w-6 ${rearrangeMode ? "" : "text-white"}`} />
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <PlusIcon className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Rearrange Mode Banner */}
      {rearrangeMode && (
        <div className="bg-orange-100 border-b border-orange-200 px-4 py-2 text-center">
          <p className="text-sm text-orange-800">
            Drag tiles to reorder, then tap <strong>Done</strong>
          </p>
          <button
            onClick={() => setRearrangeMode(false)}
            className="mt-1 px-4 py-1 bg-orange-500 text-white rounded-lg text-sm font-medium"
          >
            Done
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 py-8 pb-32">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchSupplies();
              }}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : supplies.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No supplies needed!</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium"
            >
              Add First Supply
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={supplies.map((c) => c.id)}
              strategy={rectSortingStrategy}
            >
              <div className="max-w-4xl mx-auto grid grid-cols-2 gap-4">
                {supplies.map((supply, index) => (
                  <SortableSupplyItem
                    key={supply.id}
                    supply={supply}
                    index={index}
                    onClick={() => openSupply(supply)}
                    rearrangeMode={rearrangeMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add Supply Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Supply</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Moving blankets"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Quantity, size, where to buy, etc..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>
              <button
                onClick={handleAddSupply}
                disabled={!newTitle.trim() || adding}
                className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? "Adding..." : "Add Supply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supply Detail/Edit Modal */}
      {selectedSupply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Supply Details</h2>
              <button
                onClick={() => setSelectedSupply(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  rows={3}
                  placeholder="Add details..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              <p className="text-xs text-gray-400 text-center">
                Added{" "}
                {new Date(selectedSupply.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={!hasChanges || saving || deleting}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving || deleting || completing}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckIcon className="h-5 w-5" />
                  {completing ? "..." : "Done"}
                </button>
              </div>
              <button
                onClick={handleDelete}
                disabled={saving || deleting}
                className="w-full py-2 text-red-500 text-sm font-medium"
              >
                Delete Supply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            Top Shelf Moving and Junk Removal
          </p>
        </div>
      </footer>
    </main>
  );
}
