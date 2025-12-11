"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  XMarkIcon,
  PhoneIcon,
  MapPinIcon,
  PlusIcon,
  ChevronRightIcon,
  CameraIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase-client";

// Local photo state (for uploads before saving)
interface LocalClaimPhoto {
  id: string;
  file: File;
  preview: string;
}

// Database stored photo
interface StoredClaimPhoto {
  id: string;
  claim_id: string;
  update_id: string | null;
  storage_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface ClaimUpdate {
  id: string;
  claim_id: string;
  note: string;
  amount_spent: number;
  created_by: string;
  created_at: string;
  sheets_done?: boolean;
}

interface Claim {
  id: string;
  claim_number: string;
  ghl_contact_id: string;
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  contact_is_customer: boolean;
  contact_name: string;
  contact_phone: string;
  contact_ghl_id: string;
  initial_claim_details: string;
  status: string;
  total_amount_spent: number;
  created_at: string;
  updated_at: string;
  claim_updates?: ClaimUpdate[];
  claim_photos?: StoredClaimPhoto[];
}

const GHL_LOCATION_ID = "YhoyYQ8IA9po8T9NeyvQ";

interface NewClaimForm {
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  contact_is_customer: boolean;
  contact_name: string;
  contact_phone: string;
  initial_claim_details: string;
  initial_amount: string;
}

const emptyClaimForm: NewClaimForm = {
  customer_name: "",
  phone: "",
  email: "",
  address: "",
  contact_is_customer: true,
  contact_name: "",
  contact_phone: "",
  initial_claim_details: "",
  initial_amount: "",
};

export default function ClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [newClaimForm, setNewClaimForm] = useState<NewClaimForm>(emptyClaimForm);
  const [creatingClaim, setCreatingClaim] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<ClaimUpdate | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [findStatus, setFindStatus] = useState<"idle" | "searching" | "found" | "not_found">("idle");
  const [foundGhlContactId, setFoundGhlContactId] = useState<string>("");
  const [foundGhlContactData, setFoundGhlContactData] = useState<{
    contactId?: string;
    contactName: string;
    email: string;
    address: string;
  } | null>(null);
  const [claimPhotos, setClaimPhotos] = useState<LocalClaimPhoto[]>([]);
  const [updatePhotos, setUpdatePhotos] = useState<LocalClaimPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [editContactName, setEditContactName] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [editDetailsText, setEditDetailsText] = useState("");

  const claimFileInputRef = useRef<HTMLInputElement>(null);
  const claimCameraInputRef = useRef<HTMLInputElement>(null);
  const updateFileInputRef = useRef<HTMLInputElement>(null);
  const updateCameraInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Fetch claims
  const fetchClaims = async () => {
    try {
      const { data, error } = await supabase
        .from("claims")
        .select(`
          *,
          claim_updates (*),
          claim_photos (*)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching claims:", error);
        return;
      }

      setClaims(data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // Calculate total spent for a claim
  const calculateTotalSpent = (claim: Claim) => {
    if (!claim.claim_updates || claim.claim_updates.length === 0) return 0;
    return claim.claim_updates.reduce(
      (sum, update) => sum + (Number(update.amount_spent) || 0),
      0
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-700";
      case "in_progress":
        return "bg-yellow-100 text-yellow-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      case "closed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Get Supabase storage URL for a claim photo
  const getSupabasePhotoUrl = (storagePath: string): string => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jvflufcpcxlsnszlvolj.supabase.co";
    return `${supabaseUrl}/storage/v1/object/public/claim-photos/${storagePath}`;
  };

  // Get all photos for a claim from Supabase
  const getClaimStoredPhotos = (claim: Claim): StoredClaimPhoto[] => {
    return claim.claim_photos || [];
  };

  // Open claim detail
  const openClaimDetail = (claim: Claim) => {
    console.log("[openClaimDetail] Claim photos:", claim.claim_photos);
    setSelectedClaim(claim);
    setShowAddUpdate(false);
    setNewNote("");
    setNewAmount("");
  };

  // Close modal
  const closeModal = () => {
    setSelectedClaim(null);
    setShowAddUpdate(false);
    setEditingUpdate(null);
    setEditingContact(false);
    setEditingDetails(false);
    // Clear any pending update photos
    updatePhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    setUpdatePhotos([]);
  };

  // Log amount to Google Sheets
  const logToSheets = async (claimId: string, customerName: string, amountSpent: number) => {
    if (amountSpent <= 0) return;

    try {
      const today = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });

      const response = await fetch("/api/claims/log-to-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          claimId,
          customerName,
          amountSpent,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error("Failed to log to Google Sheets:", result.error, result.details);
        alert(`Warning: Amount saved but failed to log to Google Sheets.\n\n${result.error}`);
      }
    } catch (err) {
      console.error("Error logging to sheets:", err);
      alert("Warning: Amount saved but failed to connect to Google Sheets API.");
    }
  };

  // Add new update
  const handleAddUpdate = async () => {
    if (!selectedClaim || !newNote.trim()) return;

    setSubmitting(true);
    try {
      const amountValue = parseFloat(newAmount) || 0;
      const claimNumber = selectedClaim.claim_number || `CLM-${selectedClaim.id.slice(0, 8)}`;

      // First create the update to get its ID
      const { data: newUpdate, error } = await supabase
        .from("claim_updates")
        .insert({
          claim_id: selectedClaim.id,
          note: newNote.trim(),
          amount_spent: amountValue,
          created_by: "Employee",
        })
        .select()
        .single();

      if (error || !newUpdate) {
        console.error("Error adding update:", error);
        alert("Failed to add update");
        return;
      }

      // Upload photos if any (with claimId and updateId)
      if (updatePhotos.length > 0) {
        setUploadingPhotos(true);
        await uploadPhotos(updatePhotos, claimNumber, selectedClaim.id, newUpdate.id);
        setUploadingPhotos(false);
      }

      // Update total amount spent in claims table
      const totalSpent = calculateTotalSpent(selectedClaim) + amountValue;
      await supabase
        .from("claims")
        .update({ total_amount_spent: totalSpent })
        .eq("id", selectedClaim.id);

      // Log to Google Sheets if amount was added
      if (amountValue > 0) {
        await logToSheets(
          selectedClaim.claim_number || selectedClaim.id.slice(0, 8),
          selectedClaim.customer_name,
          amountValue
        );
      }

      // Clear photos
      updatePhotos.forEach((p) => URL.revokeObjectURL(p.preview));
      setUpdatePhotos([]);

      setNewNote("");
      setNewAmount("");
      setShowAddUpdate(false);
      fetchClaims();

      // Refresh selected claim
      const { data: updatedClaim } = await supabase
        .from("claims")
        .select(`*, claim_updates (*), claim_photos (*)`)
        .eq("id", selectedClaim.id)
        .single();

      if (updatedClaim) {
        setSelectedClaim(updatedClaim);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Start editing an update
  const startEditUpdate = (update: ClaimUpdate) => {
    setEditingUpdate(update);
    setEditNote(update.note);
    setEditAmount(String(update.amount_spent || ""));
    setShowAddUpdate(false);
  };

  // Save edited update
  const handleSaveEditUpdate = async () => {
    if (!selectedClaim || !editingUpdate || !editNote.trim()) return;

    setSubmitting(true);
    try {
      const oldAmount = Number(editingUpdate.amount_spent) || 0;
      const newAmountValue = parseFloat(editAmount) || 0;

      const { error } = await supabase
        .from("claim_updates")
        .update({
          note: editNote.trim(),
          amount_spent: newAmountValue,
        })
        .eq("id", editingUpdate.id);

      if (error) {
        console.error("Error updating:", error);
        alert("Failed to update");
        return;
      }

      // Recalculate total amount spent
      const totalSpent = calculateTotalSpent(selectedClaim) - oldAmount + newAmountValue;
      await supabase
        .from("claims")
        .update({ total_amount_spent: totalSpent })
        .eq("id", selectedClaim.id);

      // Log to Google Sheets if amount increased
      const amountDiff = newAmountValue - oldAmount;
      if (amountDiff > 0) {
        await logToSheets(
          selectedClaim.claim_number || selectedClaim.id.slice(0, 8),
          selectedClaim.customer_name,
          amountDiff
        );
      }

      setEditingUpdate(null);
      setEditNote("");
      setEditAmount("");
      fetchClaims();

      // Refresh selected claim
      const { data: updatedClaim } = await supabase
        .from("claims")
        .select(`*, claim_updates (*), claim_photos (*)`)
        .eq("id", selectedClaim.id)
        .single();

      if (updatedClaim) {
        setSelectedClaim(updatedClaim);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel editing
  const cancelEditUpdate = () => {
    setEditingUpdate(null);
    setEditNote("");
    setEditAmount("");
  };

  // Find contact by phone and fill form, or create new contact if not found
  const handleFindContact = async () => {
    if (!newClaimForm.phone.trim()) {
      alert("Please enter a phone number first");
      return;
    }

    setFindStatus("searching");
    try {
      // First, try to find existing contact
      const response = await fetch("/api/claims/search-ghl-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newClaimForm.phone.trim() }),
      });
      const result = await response.json();

      if (result.success && result.found) {
        setFindStatus("found");
        setFoundGhlContactId(result.contactId);
        // Store original GHL data for later comparison
        setFoundGhlContactData({
          contactName: result.contactName || "",
          email: result.email || "",
          address: result.address || "",
        });
        // Auto-fill the form fields from found contact
        setNewClaimForm({
          ...newClaimForm,
          customer_name: result.contactName || newClaimForm.customer_name,
          email: result.email || newClaimForm.email,
          address: result.address || newClaimForm.address,
        });
      } else {
        // Contact not found - create a new one if we have a name
        if (!newClaimForm.customer_name.trim()) {
          alert("Contact not found. Please enter the customer name, then click Find to create a new contact.");
          setFindStatus("not_found");
          setFoundGhlContactId("");
          return;
        }

        // Create new GHL contact with available info
        const createResponse = await fetch("/api/claims/create-ghl-contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newClaimForm.customer_name.trim(),
            phone: newClaimForm.phone.trim(),
            email: newClaimForm.email.trim() || undefined,
            address: newClaimForm.address.trim() || undefined,
          }),
        });
        const createResult = await createResponse.json();

        if (createResult.success && createResult.contactId) {
          setFindStatus("found");
          setFoundGhlContactId(createResult.contactId);
          // Store the contact data (what we sent to create it)
          setFoundGhlContactData({
            contactName: newClaimForm.customer_name.trim(),
            email: newClaimForm.email.trim(),
            address: newClaimForm.address.trim(),
          });
          // Show whether it was existing or newly created
          if (createResult.existing) {
            console.log("Found existing GHL contact:", createResult.contactId);
          } else {
            console.log("Created new GHL contact:", createResult.contactId);
          }
        } else {
          setFindStatus("not_found");
          setFoundGhlContactId("");
          alert("Failed to create GHL contact. Please try again.");
        }
      }
    } catch (err) {
      console.error("Error finding/creating contact:", err);
      setFindStatus("not_found");
      setFoundGhlContactId("");
    }
  };

  // Reset find status when phone changes
  const handlePhoneChange = (phone: string) => {
    setNewClaimForm({ ...newClaimForm, phone });
    if (findStatus !== "idle") {
      setFindStatus("idle");
      setFoundGhlContactId("");
      setFoundGhlContactData(null);
    }
  };

  // Handle photo selection for new claim
  const handleClaimPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: LocalClaimPhoto[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        newPhotos.push({
          id: Math.random().toString(36).substring(7),
          file,
          preview: URL.createObjectURL(file),
        });
      }
    });
    setClaimPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  // Handle photo selection for updates
  const handleUpdatePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: LocalClaimPhoto[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        newPhotos.push({
          id: Math.random().toString(36).substring(7),
          file,
          preview: URL.createObjectURL(file),
        });
      }
    });
    setUpdatePhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  // Remove photo from claim
  const removeClaimPhoto = (id: string) => {
    setClaimPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  // Remove photo from update
  const removeUpdatePhoto = (id: string) => {
    setUpdatePhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  // Upload photos to Supabase Storage
  const uploadPhotos = async (
    photos: LocalClaimPhoto[],
    claimNumber: string,
    claimId?: string,
    updateId?: string
  ): Promise<string[]> => {
    if (photos.length === 0) return [];

    const formData = new FormData();
    formData.append("claimNumber", claimNumber);
    if (claimId) formData.append("claimId", claimId);
    if (updateId) formData.append("updateId", updateId);
    photos.forEach((photo) => {
      formData.append("files", photo.file);
    });

    try {
      console.log("[uploadPhotos] Uploading", photos.length, "photos for claim:", claimNumber, "claimId:", claimId, "updateId:", updateId);
      const response = await fetch("/api/claims/upload-photos", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      console.log("[uploadPhotos] API response:", result);
      if (result.success) {
        if (result.errors && result.errors.length > 0) {
          alert(`Some photos failed to upload:\n${result.errors.join("\n")}`);
        }
        return result.photoUrls || [];
      }
      // Show detailed error
      const errorDetails = result.errors ? result.errors.join("\n") : result.error || "Unknown error";
      alert(`Photo upload failed:\n${errorDetails}`);
      console.error("Photo upload failed:", result.error, result.errors);
      return [];
    } catch (err) {
      console.error("Error uploading photos:", err);
      alert(`Photo upload error: ${err}`);
      return [];
    }
  };

  // Delete update
  const handleDeleteUpdate = async () => {
    if (!selectedClaim || !editingUpdate) return;

    if (!confirm("Are you sure you want to remove this update?")) return;

    setSubmitting(true);
    try {
      const deletedAmount = Number(editingUpdate.amount_spent) || 0;

      const { error } = await supabase
        .from("claim_updates")
        .delete()
        .eq("id", editingUpdate.id);

      if (error) {
        console.error("Error deleting update:", error);
        alert("Failed to delete update");
        return;
      }

      // Recalculate total amount spent
      const totalSpent = calculateTotalSpent(selectedClaim) - deletedAmount;
      await supabase
        .from("claims")
        .update({ total_amount_spent: Math.max(0, totalSpent) })
        .eq("id", selectedClaim.id);

      setEditingUpdate(null);
      setEditNote("");
      setEditAmount("");
      fetchClaims();

      // Refresh selected claim
      const { data: updatedClaim } = await supabase
        .from("claims")
        .select(`*, claim_updates (*), claim_photos (*)`)
        .eq("id", selectedClaim.id)
        .single();

      if (updatedClaim) {
        setSelectedClaim(updatedClaim);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Update claim status
  const updateStatus = async (newStatus: string) => {
    if (!selectedClaim) return;

    try {
      const { error } = await supabase
        .from("claims")
        .update({ status: newStatus })
        .eq("id", selectedClaim.id);

      if (error) {
        console.error("Error updating status:", error);
        return;
      }

      setSelectedClaim({ ...selectedClaim, status: newStatus });
      fetchClaims();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  // Start editing alternate contact
  const startEditContact = () => {
    if (!selectedClaim) return;
    setEditContactName(selectedClaim.contact_name || "");
    setEditContactPhone(selectedClaim.contact_phone || "");
    setEditingContact(true);
  };

  // Save edited alternate contact
  const handleSaveContact = async () => {
    if (!selectedClaim) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("claims")
        .update({
          contact_name: editContactName.trim(),
          contact_phone: editContactPhone.trim(),
        })
        .eq("id", selectedClaim.id);

      if (error) {
        console.error("Error updating contact:", error);
        alert("Failed to update contact");
        return;
      }

      setSelectedClaim({
        ...selectedClaim,
        contact_name: editContactName.trim(),
        contact_phone: editContactPhone.trim(),
      });
      setEditingContact(false);
      fetchClaims();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete alternate contact
  const handleDeleteContact = async () => {
    if (!selectedClaim) return;
    if (!confirm("Remove alternate contact? The customer will be used as the contact.")) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("claims")
        .update({
          contact_is_customer: true,
          contact_name: "",
          contact_phone: "",
          contact_ghl_id: "",
        })
        .eq("id", selectedClaim.id);

      if (error) {
        console.error("Error deleting contact:", error);
        alert("Failed to remove contact");
        return;
      }

      setSelectedClaim({
        ...selectedClaim,
        contact_is_customer: true,
        contact_name: "",
        contact_phone: "",
        contact_ghl_id: "",
      });
      setEditingContact(false);
      fetchClaims();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Start editing initial claim details
  const startEditDetails = () => {
    if (!selectedClaim) return;
    setEditDetailsText(selectedClaim.initial_claim_details || "");
    setEditingDetails(true);
  };

  // Save edited initial claim details
  const handleSaveDetails = async () => {
    if (!selectedClaim || !editDetailsText.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("claims")
        .update({ initial_claim_details: editDetailsText.trim() })
        .eq("id", selectedClaim.id);

      if (error) {
        console.error("Error updating details:", error);
        alert("Failed to update details");
        return;
      }

      setSelectedClaim({
        ...selectedClaim,
        initial_claim_details: editDetailsText.trim(),
      });
      setEditingDetails(false);
      fetchClaims();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete entire claim
  const handleDeleteClaim = async () => {
    if (!selectedClaim) return;

    const claimNumber = selectedClaim.claim_number || `CLM-${selectedClaim.id.slice(0, 8)}`;
    if (!confirm(`Are you sure you want to delete claim ${claimNumber}?\n\nThis will remove the claim and all associated line items from Google Sheets.`)) {
      return;
    }

    setSubmitting(true);
    try {
      // First, delete from Google Sheets
      const sheetsResponse = await fetch("/api/claims/delete-from-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimNumber }),
      });
      const sheetsResult = await sheetsResponse.json();
      if (!sheetsResult.success) {
        console.error("Failed to delete from sheets:", sheetsResult.error);
        // Continue with deletion even if sheets fails
      } else {
        console.log(`Deleted ${sheetsResult.rowsDeleted} rows from Google Sheets`);
      }

      // Delete all updates for this claim
      await supabase
        .from("claim_updates")
        .delete()
        .eq("claim_id", selectedClaim.id);

      // Delete the claim
      const { error } = await supabase
        .from("claims")
        .delete()
        .eq("id", selectedClaim.id);

      if (error) {
        console.error("Error deleting claim:", error);
        alert("Failed to delete claim");
        return;
      }

      // Close modal and refresh
      setSelectedClaim(null);
      fetchClaims();
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to delete claim");
    } finally {
      setSubmitting(false);
    }
  };

  // Get GHL contact link
  const getGHLLink = (contactId: string) => {
    return `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/contacts/detail/${contactId}`;
  };

  // Search for GHL contact by phone - returns full contact details
  const searchGHLContact = async (phone: string) => {
    try {
      const response = await fetch("/api/claims/search-ghl-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();
      if (result.success && result.found) {
        return {
          found: true,
          contactId: result.contactId,
          contactName: result.contactName || "",
          email: result.email || "",
          address: result.address || "",
        };
      }
      return { found: false, contactId: null, contactName: "", email: "", address: "" };
    } catch (err) {
      console.error("Error searching GHL contact:", err);
      return { found: false, contactId: null, contactName: "", email: "", address: "" };
    }
  };

  // Create GHL contact (for alternate contacts)
  const createGHLContact = async (name: string, phone: string, email?: string, address?: string) => {
    try {
      const response = await fetch("/api/claims/create-ghl-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, address }),
      });
      const result = await response.json();
      if (result.success && result.contactId) {
        return result.contactId;
      }
      return null;
    } catch (err) {
      console.error("Error creating GHL contact:", err);
      return null;
    }
  };

  // Generate next claim number
  const generateClaimNumber = async () => {
    const { data } = await supabase
      .from("claims")
      .select("claim_number")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].claim_number) {
      const lastNum = parseInt(data[0].claim_number.replace("CLM-", "")) || 0;
      return `CLM-${String(lastNum + 1).padStart(4, "0")}`;
    }
    return "CLM-0001";
  };

  // Helper to check if form data matches GHL contact data
  const checkGhlMismatch = (ghlData: { contactName: string; email: string; address: string }) => {
    const formName = newClaimForm.customer_name.trim().toLowerCase();
    const ghlName = ghlData.contactName.trim().toLowerCase();
    const formEmail = newClaimForm.email.trim().toLowerCase();
    const ghlEmail = ghlData.email.trim().toLowerCase();
    const formAddress = newClaimForm.address.trim().toLowerCase();
    const ghlAddress = ghlData.address.trim().toLowerCase();

    const mismatches: string[] = [];
    if (ghlName && formName && formName !== ghlName) {
      mismatches.push(`Name: "${newClaimForm.customer_name.trim()}" → "${ghlData.contactName}"`);
    }
    if (ghlEmail && formEmail && formEmail !== ghlEmail) {
      mismatches.push(`Email: "${newClaimForm.email.trim()}" → "${ghlData.email}"`);
    }
    if (ghlAddress && formAddress && formAddress !== ghlAddress) {
      mismatches.push(`Address: "${newClaimForm.address.trim()}" → "${ghlData.address}"`);
    }
    return mismatches;
  };

  // Create new claim
  const handleCreateClaim = async (confirmedGhlData?: { contactId: string; contactName: string; email: string; address: string }) => {
    if (!newClaimForm.customer_name.trim() || !newClaimForm.initial_claim_details.trim()) {
      alert("Please fill in customer name and claim details");
      return;
    }

    if (!newClaimForm.phone.trim()) {
      alert("Please fill in customer phone number to search GHL contact");
      return;
    }

    // Validate contact info if not customer
    if (!newClaimForm.contact_is_customer && !newClaimForm.contact_name.trim()) {
      alert("Please fill in contact name");
      return;
    }

    setCreatingClaim(true);
    try {
      // If we have confirmed GHL data passed in, use it directly
      let customerGhlId = confirmedGhlData?.contactId || foundGhlContactId;
      let ghlContactData = confirmedGhlData || foundGhlContactData;

      // Search for contact if we don't have one yet
      if (!customerGhlId) {
        const customerGhl = await searchGHLContact(newClaimForm.phone.trim());
        if (!customerGhl.found) {
          // No contact found - create a new one with form data
          const newContactId = await createGHLContact(
            newClaimForm.customer_name.trim(),
            newClaimForm.phone.trim(),
            newClaimForm.email?.trim(),
            newClaimForm.address?.trim()
          );
          if (newContactId) {
            customerGhlId = newContactId;
            ghlContactData = {
              contactId: newContactId,
              contactName: newClaimForm.customer_name.trim(),
              email: newClaimForm.email?.trim() || "",
              address: newClaimForm.address?.trim() || "",
            };
          } else {
            alert("Failed to create GHL contact. Please try again.");
            setCreatingClaim(false);
            return;
          }
        } else {
          // Contact found - store the data
          customerGhlId = customerGhl.contactId!;
          ghlContactData = {
            contactId: customerGhlId,
            contactName: customerGhl.contactName,
            email: customerGhl.email,
            address: customerGhl.address,
          };
        }
      }

      // Check for mismatch between form and GHL data (only if not already confirmed)
      if (!confirmedGhlData && ghlContactData) {
        const mismatches = checkGhlMismatch(ghlContactData);
        if (mismatches.length > 0) {
          setCreatingClaim(false);
          const confirmed = confirm(
            `This phone number is linked to a GHL contact with different information:\n\n${mismatches.join("\n")}\n\nClick OK to use the GHL contact details for this claim, or Cancel to go back and edit the form.`
          );
          if (confirmed) {
            // Pass GHL data directly to avoid state timing issues
            const ghlDataWithId = {
              contactId: customerGhlId,
              contactName: ghlContactData.contactName || "",
              email: ghlContactData.email || "",
              address: ghlContactData.address || "",
            };
            // Update form visually
            setNewClaimForm({
              ...newClaimForm,
              customer_name: ghlDataWithId.contactName || newClaimForm.customer_name,
              email: ghlDataWithId.email || newClaimForm.email,
              address: ghlDataWithId.address || newClaimForm.address,
            });
            // Recursively call with confirmed data (no setTimeout needed)
            await handleCreateClaim(ghlDataWithId);
          }
          return;
        }
      }

      // Create/find GHL contact for alternate contact if different from customer
      let contactGhlId = "";
      if (!newClaimForm.contact_is_customer && newClaimForm.contact_name.trim()) {
        const ghlId = await createGHLContact(
          newClaimForm.contact_name.trim(),
          newClaimForm.contact_phone.trim()
        );
        if (ghlId) {
          contactGhlId = ghlId;
        }
      }

      // Generate unique claim number
      const claimNumber = await generateClaimNumber();

      // Use confirmed GHL data if available, otherwise use form data
      const finalName = confirmedGhlData?.contactName || newClaimForm.customer_name.trim();
      const finalEmail = confirmedGhlData?.email || newClaimForm.email.trim();
      const finalAddress = confirmedGhlData?.address || newClaimForm.address.trim();
      const initialAmount = parseFloat(newClaimForm.initial_amount) || 0;

      const { data: newClaim, error } = await supabase
        .from("claims")
        .insert({
          claim_number: claimNumber,
          customer_name: finalName,
          phone: newClaimForm.phone.trim(),
          email: finalEmail,
          address: finalAddress,
          ghl_contact_id: customerGhlId,
          contact_is_customer: newClaimForm.contact_is_customer,
          contact_name: newClaimForm.contact_is_customer ? "" : newClaimForm.contact_name.trim(),
          contact_phone: newClaimForm.contact_is_customer ? "" : newClaimForm.contact_phone.trim(),
          contact_ghl_id: contactGhlId,
          initial_claim_details: newClaimForm.initial_claim_details.trim(),
          status: "open",
          total_amount_spent: initialAmount,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating claim:", error);
        alert("Failed to create claim");
        return;
      }

      // If initial amount was provided, create an update entry and log to sheets
      if (initialAmount > 0 && newClaim) {
        await supabase.from("claim_updates").insert({
          claim_id: newClaim.id,
          note: "Initial claim amount",
          amount_spent: initialAmount,
          created_by: "Employee",
        });

        // Log to Google Sheets
        await logToSheets(claimNumber, finalName, initialAmount);
      }

      // Upload photos if any (with claimId for Supabase storage)
      if (claimPhotos.length > 0 && newClaim) {
        setUploadingPhotos(true);
        await uploadPhotos(claimPhotos, claimNumber, newClaim.id);
        setUploadingPhotos(false);
      }

      // Clear photos
      claimPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
      setClaimPhotos([]);

      // Reset form and close modal
      setNewClaimForm(emptyClaimForm);
      setFoundGhlContactId("");
      setFoundGhlContactData(null);
      setFindStatus("idle");
      setShowNewClaimModal(false);
      fetchClaims();
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to create claim");
    } finally {
      setCreatingClaim(false);
      setUploadingPhotos(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom">
      {/* Header */}
      <header
        className="shadow-sm safe-top"
        style={{ backgroundColor: "#06649b" }}
      >
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/home")}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Claims</h1>
              <p className="text-sm text-white/80">Damage claim tracking</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowNewClaimModal(true);
              setFindStatus("idle");
              setFoundGhlContactId("");
              setFoundGhlContactData(null);
              setClaimPhotos([]);
            }}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            New
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-6 pb-24">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No claims found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                onClick={() => openClaimDetail(claim)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {!claim.contact_is_customer && claim.contact_name
                          ? claim.contact_name
                          : claim.customer_name}
                      </h3>
                      <span className="text-xs text-gray-400 font-mono">
                        {claim.claim_number || `CLM-${claim.id.slice(0, 4)}`}
                      </span>
                    </div>
                    {!claim.contact_is_customer && claim.contact_name && (
                      <p className="text-xs text-gray-400">
                        Customer: {claim.customer_name}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {formatDate(claim.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        claim.status
                      )}`}
                    >
                      {claim.status.replace("_", " ").toUpperCase()}
                    </span>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {claim.initial_claim_details}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {claim.claim_updates?.length || 0} update(s)
                  </span>
                  {calculateTotalSpent(claim) > 0 && (
                    <span className="font-medium text-red-600">
                      {formatCurrency(calculateTotalSpent(claim))} spent
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            Top Shelf Moving and Junk Removal
          </p>
        </div>
      </footer>

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-gray-100 w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div
              className="text-white px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ backgroundColor: "#06649b" }}
            >
              <div>
                <h2 className="font-bold text-lg">
                  {selectedClaim.customer_name}
                </h2>
                <p className="text-sm text-white/80">
                  {selectedClaim.claim_number || `Claim #${selectedClaim.id.slice(0, 8)}`}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-4 flex-1 space-y-4">
              {/* Contact Info */}
              <div className="bg-white rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Customer Info</h3>

                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <a
                    href={`tel:${selectedClaim.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {selectedClaim.phone}
                  </a>
                </div>

                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-700">{selectedClaim.address}</span>
                </div>

                {/* Customer GHL Button */}
                {selectedClaim.ghl_contact_id && selectedClaim.ghl_contact_id !== "manual-entry" && (
                  <a
                    href={getGHLLink(selectedClaim.ghl_contact_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-orange-500 text-white text-center py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Customer in GoHighLevel
                  </a>
                )}
              </div>

              {/* Alternate Contact Info (if different from customer) */}
              {!selectedClaim.contact_is_customer && selectedClaim.contact_name && (
                <div className="bg-white rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Alternate Contact</h3>
                    {!editingContact && (
                      <button
                        onClick={startEditContact}
                        className="text-blue-600 text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {editingContact ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Name</label>
                        <input
                          type="text"
                          value={editContactName}
                          onChange={(e) => setEditContactName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={editContactPhone}
                          onChange={(e) => setEditContactPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveContact}
                          disabled={!editContactName.trim() || submitting}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingContact(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteContact}
                          disabled={submitting}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-gray-700 font-medium">
                        {selectedClaim.contact_name}
                      </div>

                      {selectedClaim.contact_phone && (
                        <div className="flex items-center gap-3">
                          <PhoneIcon className="h-5 w-5 text-gray-400" />
                          <a
                            href={`tel:${selectedClaim.contact_phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {selectedClaim.contact_phone}
                          </a>
                        </div>
                      )}

                      {/* Contact GHL Button */}
                      {selectedClaim.contact_ghl_id && (
                        <a
                          href={getGHLLink(selectedClaim.contact_ghl_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full bg-orange-500 text-white text-center py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                        >
                          Contact in GoHighLevel
                        </a>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Status</h3>
                <div className="flex flex-wrap gap-2">
                  {["open", "in_progress", "resolved", "closed"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => updateStatus(status)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedClaim.status === status
                            ? getStatusColor(status) + " ring-2 ring-offset-2 ring-blue-500"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {status.replace("_", " ").toUpperCase()}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Initial Claim Details */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Initial Claim Details
                </h3>
                {editingDetails ? (
                  <div className="space-y-3">
                    <textarea
                      value={editDetailsText}
                      onChange={(e) => setEditDetailsText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDetails}
                        disabled={!editDetailsText.trim() || submitting}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingDetails(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={startEditDetails}
                    className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedClaim.initial_claim_details}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Filed on {formatDate(selectedClaim.created_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Total Spent */}
              {calculateTotalSpent(selectedClaim) > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-red-700">
                      Total Amount Spent
                    </span>
                    <span className="text-xl font-bold text-red-700">
                      {formatCurrency(calculateTotalSpent(selectedClaim))}
                    </span>
                  </div>
                </div>
              )}

              {/* Updates */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-gray-900">Updates</h3>
                  {editingUpdate ? (
                    <button
                      onClick={handleDeleteUpdate}
                      className="flex items-center gap-1 text-red-600 text-sm font-medium"
                    >
                      - Remove Update
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (showAddUpdate) {
                          // Closing - clear photos
                          updatePhotos.forEach((p) => URL.revokeObjectURL(p.preview));
                          setUpdatePhotos([]);
                        }
                        setShowAddUpdate(!showAddUpdate);
                      }}
                      className="flex items-center gap-1 text-blue-600 text-sm font-medium"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Update
                    </button>
                  )}
                </div>

                {/* Add Update Form */}
                {showAddUpdate && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-3">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Enter update notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          Amount Spent (optional)
                        </label>
                        <input
                          type="number"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={handleAddUpdate}
                        disabled={!newNote.trim() || submitting || uploadingPhotos}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-5"
                      >
                        {uploadingPhotos ? "Uploading..." : submitting ? "Saving..." : "Save"}
                      </button>
                    </div>

                    {/* Photo Upload for Update */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">
                        Photos (optional)
                      </label>
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => updateCameraInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors text-sm"
                        >
                          <CameraIcon className="h-4 w-4" />
                          Take Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors text-sm"
                        >
                          <PhotoIcon className="h-4 w-4" />
                          Upload
                        </button>
                      </div>
                      <input
                        ref={updateCameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleUpdatePhotoSelect}
                        className="hidden"
                      />
                      <input
                        ref={updateFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleUpdatePhotoSelect}
                        className="hidden"
                      />
                      {updatePhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {updatePhotos.map((photo) => (
                            <div key={photo.id} className="relative">
                              <img
                                src={photo.preview}
                                alt="Preview"
                                className="w-full h-16 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removeUpdatePhoto(photo.id)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Updates List */}
                {selectedClaim.claim_updates &&
                selectedClaim.claim_updates.length > 0 ? (
                  <div className="space-y-3">
                    {selectedClaim.claim_updates
                      .sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() -
                          new Date(a.created_at).getTime()
                      )
                      .map((update) => (
                        <div key={update.id}>
                          {editingUpdate?.id === update.id ? (
                            // Edit form
                            <div className="bg-white rounded-xl p-4 border-l-4 border-blue-400 shadow-sm space-y-3">
                              <textarea
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={3}
                              />
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-500 mb-1">
                                    Amount Spent
                                  </label>
                                  <input
                                    type="number"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <button
                                  onClick={handleSaveEditUpdate}
                                  disabled={!editNote.trim() || submitting}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-5"
                                >
                                  {submitting ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={cancelEditUpdate}
                                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors mt-5"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Display update (clickable)
                            <div
                              onClick={() => startEditUpdate(update)}
                              className="bg-white rounded-xl p-4 border-l-4 border-blue-400 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                            >
                              <p className="text-gray-700">{update.note}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500">
                                  {formatDate(update.created_at)} by{" "}
                                  {update.created_by || "Unknown"}
                                </span>
                                {Number(update.amount_spent) > 0 && (
                                  <span className="text-sm font-medium text-red-600">
                                    {formatCurrency(Number(update.amount_spent))}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No updates yet</p>
                )}
              </div>

              {/* Photos Section */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Photos ({getClaimStoredPhotos(selectedClaim).length})
                </h3>
                {getClaimStoredPhotos(selectedClaim).length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {getClaimStoredPhotos(selectedClaim).map((photo) => (
                      <a
                        key={photo.id}
                        href={getSupabasePhotoUrl(photo.storage_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={getSupabasePhotoUrl(photo.storage_path)}
                          alt={photo.file_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' /%3E%3C/svg%3E";
                          }}
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No photos uploaded yet</p>
                )}
              </div>

              {/* Delete Claim Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleDeleteClaim}
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Deleting..." : "Delete Claim"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Claim Modal */}
      {showNewClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-gray-100 w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div
              className="text-white px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ backgroundColor: "#06649b" }}
            >
              <div>
                <h2 className="font-bold text-lg">New Claim</h2>
                <p className="text-sm text-white/80">Create a damage claim</p>
              </div>
              <button
                onClick={() => {
                  setShowNewClaimModal(false);
                  setNewClaimForm(emptyClaimForm);
                  setFindStatus("idle");
                  setFoundGhlContactId("");
                  setFoundGhlContactData(null);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-4 flex-1 space-y-4">
              <div className="bg-white rounded-xl p-4 space-y-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newClaimForm.customer_name}
                    onChange={(e) =>
                      setNewClaimForm({ ...newClaimForm, customer_name: e.target.value })
                    }
                    placeholder="Enter customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Phone with Find button */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={newClaimForm.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="Enter phone number"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleFindContact}
                      disabled={!newClaimForm.phone.trim() || findStatus === "searching"}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        findStatus === "found"
                          ? "bg-green-500 text-white"
                          : findStatus === "not_found"
                          ? "bg-red-500 text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      }`}
                    >
                      {findStatus === "searching"
                        ? "..."
                        : findStatus === "found"
                        ? "Found"
                        : findStatus === "not_found"
                        ? "Not Found"
                        : "Find"}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newClaimForm.email}
                    onChange={(e) =>
                      setNewClaimForm({ ...newClaimForm, email: e.target.value })
                    }
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newClaimForm.address}
                    onChange={(e) =>
                      setNewClaimForm({ ...newClaimForm, address: e.target.value })
                    }
                    placeholder="Enter customer address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Use Different Contact Checkbox */}
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="use_different_contact"
                    checked={!newClaimForm.contact_is_customer}
                    onChange={(e) =>
                      setNewClaimForm({ ...newClaimForm, contact_is_customer: !e.target.checked })
                    }
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="use_different_contact" className="text-sm font-medium text-gray-700">
                    Use different contact
                  </label>
                </div>

                {/* Alternate Contact Fields (shown when contact is not customer) */}
                {!newClaimForm.contact_is_customer && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700">Alternate Contact</h4>

                    {/* Contact Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        value={newClaimForm.contact_name}
                        onChange={(e) =>
                          setNewClaimForm({ ...newClaimForm, contact_name: e.target.value })
                        }
                        placeholder="Enter contact name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={newClaimForm.contact_phone}
                        onChange={(e) =>
                          setNewClaimForm({ ...newClaimForm, contact_phone: e.target.value })
                        }
                        placeholder="Enter contact phone"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      A GHL contact will be created automatically for this contact
                    </p>
                  </div>
                )}

                {/* Claim Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Claim Details *
                  </label>
                  <textarea
                    value={newClaimForm.initial_claim_details}
                    onChange={(e) =>
                      setNewClaimForm({ ...newClaimForm, initial_claim_details: e.target.value })
                    }
                    placeholder="Describe the damage, when it happened, what was affected..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Initial Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Amount Spent (optional)
                  </label>
                  <input
                    type="number"
                    value={newClaimForm.initial_amount}
                    onChange={(e) =>
                      setNewClaimForm({ ...newClaimForm, initial_amount: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photos (optional)
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => claimCameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <CameraIcon className="h-5 w-5" />
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => claimFileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <PhotoIcon className="h-5 w-5" />
                      Upload
                    </button>
                  </div>
                  <input
                    ref={claimCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleClaimPhotoSelect}
                    className="hidden"
                  />
                  <input
                    ref={claimFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleClaimPhotoSelect}
                    className="hidden"
                  />
                  {claimPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {claimPhotos.map((photo) => (
                        <div key={photo.id} className="relative">
                          <img
                            src={photo.preview}
                            alt="Preview"
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeClaimPhoto(photo.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0 space-y-2">
              <button
                onClick={() => handleCreateClaim()}
                disabled={
                  !newClaimForm.customer_name.trim() ||
                  !newClaimForm.initial_claim_details.trim() ||
                  creatingClaim ||
                  uploadingPhotos
                }
                className="block w-full bg-blue-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {uploadingPhotos ? "Uploading Photos..." : creatingClaim ? "Creating..." : "Create Claim"}
              </button>
              <button
                onClick={() => {
                  setShowNewClaimModal(false);
                  setNewClaimForm(emptyClaimForm);
                  setFindStatus("idle");
                  setFoundGhlContactId("");
                  setFoundGhlContactData(null);
                  claimPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
                  setClaimPhotos([]);
                }}
                className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
