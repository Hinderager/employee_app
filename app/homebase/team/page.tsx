"use client";

import { useState, useEffect } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { Employee, Role, CreateEmployeeRequest } from "../types/scheduling";

// ==================== MOCK DATA ====================

const mockRoles: Role[] = [
  { id: "1", name: "Hauler", color: "#10B981", hourly_rate: 18, sort_order: 1, is_active: true, created_at: "", updated_at: "" },
  { id: "2", name: "Driver", color: "#3B82F6", hourly_rate: 20, sort_order: 2, is_active: true, created_at: "", updated_at: "" },
  { id: "3", name: "Mover", color: "#8B5CF6", hourly_rate: 16, sort_order: 3, is_active: true, created_at: "", updated_at: "" },
  { id: "4", name: "Manager", color: "#F59E0B", hourly_rate: 25, sort_order: 4, is_active: true, created_at: "", updated_at: "" },
];

const mockEmployees: Employee[] = [
  { id: "1", first_name: "Ali", last_name: "Abdullah", email: "ali@topshelf.com", phone: "(208) 555-0101", hourly_rate: 18.00, role_id: "1", is_manager: false, is_admin: false, is_active: true, pin_code: "1234", profile_photo_url: null, homebase_id: 101, homebase_user_id: null, employment_type: "full_time", hire_date: "2023-01-15", termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "2", first_name: "Bennett", last_name: "Gray", email: "bennett@topshelf.com", phone: "(208) 555-0102", hourly_rate: 18.00, role_id: "1", is_manager: false, is_admin: false, is_active: true, pin_code: "5678", profile_photo_url: null, homebase_id: 102, homebase_user_id: null, employment_type: "full_time", hire_date: "2023-03-20", termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "3", first_name: "Chad", last_name: "Heisey", email: "chad@topshelf.com", phone: "(208) 555-0103", hourly_rate: 20.00, role_id: "2", is_manager: false, is_admin: false, is_active: true, pin_code: "9012", profile_photo_url: null, homebase_id: 103, homebase_user_id: null, employment_type: "full_time", hire_date: "2022-08-10", termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "4", first_name: "Zac", last_name: "Hembree", email: "zac@topshelf.com", phone: "(208) 555-0104", hourly_rate: 18.00, role_id: "3", is_manager: false, is_admin: false, is_active: true, pin_code: "3456", profile_photo_url: null, homebase_id: 104, homebase_user_id: null, employment_type: "part_time", hire_date: "2024-02-01", termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "5", first_name: "Eric", last_name: "Hinderager", email: "eric@topshelf.com", phone: "(208) 555-0105", hourly_rate: 25.00, role_id: "4", is_manager: true, is_admin: true, is_active: true, pin_code: "0457", profile_photo_url: null, homebase_id: 105, homebase_user_id: null, employment_type: "full_time", hire_date: "2020-01-01", termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "6", first_name: "Tommy", last_name: "Simonson", email: null, phone: "(208) 555-0106", hourly_rate: 16.00, role_id: "3", is_manager: false, is_admin: false, is_active: true, pin_code: "7890", profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "full_time", hire_date: "2024-06-15", termination_date: null, settings: {}, created_at: "", updated_at: "" },
];

// ==================== COMPONENTS ====================

interface EmployeeCardProps {
  employee: Employee;
  role?: Role;
  onEdit: () => void;
  onDelete: () => void;
}

function EmployeeCard({ employee, role, onEdit, onDelete }: EmployeeCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: role?.color || "#6B7280" }}
          >
            {employee.first_name.charAt(0)}
            {employee.last_name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {employee.first_name} {employee.last_name}
            </h3>
            <div className="flex items-center space-x-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: role?.color || "#6B7280" }}
              >
                {role?.name || "No role"}
              </span>
              {employee.is_manager && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                  Manager
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {employee.email && (
          <a
            href={`mailto:${employee.email}`}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400" />
            {employee.email}
          </a>
        )}
        {employee.phone && (
          <a
            href={`tel:${employee.phone}`}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
            {employee.phone}
          </a>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
        <span className="text-gray-500">${employee.hourly_rate}/hr</span>
        <span className="text-gray-400">
          {employee.employment_type === "full_time" ? "Full-time" : "Part-time"}
        </span>
      </div>
    </div>
  );
}

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSave: (employee: CreateEmployeeRequest) => void;
}

function AddEmployeeModal({ isOpen, onClose, roles, onSave }: AddEmployeeModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  const [hourlyRate, setHourlyRate] = useState("18.00");
  const [pinCode, setPinCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      first_name: firstName,
      last_name: lastName,
      email: email || undefined,
      phone: phone || undefined,
      role_id: roleId,
      hourly_rate: parseFloat(hourlyRate),
      pin_code: pinCode || undefined,
    });
    onClose();
    // Reset form
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRoleId(roles[0]?.id || "");
    setHourlyRate("18.00");
    setPinCode("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add Employee</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Rate
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIN Code (for time clock)
            </label>
            <input
              type="text"
              maxLength={6}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="4-6 digits"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-[#3D2B1F] text-white rounded-lg hover:bg-[#4D3B2F] transition-colors"
            >
              Add Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function TeamPage() {
  const [employees, setEmployees] = useState(mockEmployees);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !search ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase());

    const matchesRole = !roleFilter || emp.role_id === roleFilter;

    return matchesSearch && matchesRole && emp.is_active;
  });

  // Import from Homebase
  const handleImport = async () => {
    setImporting(true);
    try {
      const response = await fetch("/api/scheduling/employees/import", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        alert(`Imported ${data.imported} new employees, updated ${data.updated}`);
        // Refresh employees list
        // In real app, would refetch from API
      } else {
        alert("Import failed: " + data.error);
      }
    } catch (error) {
      alert("Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Add employee
  const handleAddEmployee = (data: CreateEmployeeRequest) => {
    const newEmployee: Employee = {
      id: `new-${Date.now()}`,
      ...data,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || null,
      phone: data.phone || null,
      role_id: data.role_id || null,
      hourly_rate: data.hourly_rate || 18,
      employment_type: data.employment_type || "full_time",
      is_manager: data.is_manager || false,
      is_admin: false,
      is_active: true,
      pin_code: data.pin_code || null,
      profile_photo_url: null,
      homebase_id: null,
      homebase_user_id: null,
      hire_date: new Date().toISOString().split("T")[0],
      termination_date: null,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEmployees([...employees, newEmployee]);
  };

  // Delete employee
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this employee?")) {
      setEmployees(employees.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">Team</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              {importing ? "Importing..." : "Import"}
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-[#3D2B1F] rounded-lg hover:bg-[#4D3B2F]"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add
            </button>
          </div>
        </div>

        {/* Search and filter */}
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={roleFilter || ""}
            onChange={(e) => setRoleFilter(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Roles</option>
            {mockRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Employee count */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-500">
          {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Employee grid */}
      <div className="px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              role={mockRoles.find((r) => r.id === employee.role_id)}
              onEdit={() => console.log("Edit", employee.id)}
              onDelete={() => handleDelete(employee.id)}
            />
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No employees found
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        roles={mockRoles}
        onSave={handleAddEmployee}
      />
    </div>
  );
}
