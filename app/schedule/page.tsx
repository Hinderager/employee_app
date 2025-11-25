"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CalendarDaysIcon } from "@heroicons/react/24/solid";

interface ScheduleJob {
  id: string;
  serialId: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  fullAddress: string;
  startTime: string;
  endTime: string;
  jobType: string;
  status: string;
  price: string;
  notes: string;
  tags: string[];
  crew: Array<{ name: string; phone: string }>;
}

interface DayInfo {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  hasJobs: boolean;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 8 AM to 10 PM

function formatDateForApi(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getWeekDays(centerDate: Date): DayInfo[] {
  const days: DayInfo[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get the Sunday of the week containing centerDate
  const startOfWeek = new Date(centerDate);
  startOfWeek.setDate(centerDate.getDate() - centerDate.getDay());

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
      hasJobs: false, // Will be updated after fetching
    });
  }

  return days;
}

// Get 3 weeks (previous, current, next) for continuous carousel swiping
function getThreeWeeks(centerDate: Date): DayInfo[][] {
  const prevWeekDate = new Date(centerDate);
  prevWeekDate.setDate(centerDate.getDate() - 7);

  const nextWeekDate = new Date(centerDate);
  nextWeekDate.setDate(centerDate.getDate() + 7);

  return [
    getWeekDays(prevWeekDate),
    getWeekDays(centerDate),
    getWeekDays(nextWeekDate),
  ];
}

function getMonthName(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function parseTimeToHour(timeStr: string): number {
  if (!timeStr) return 8;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 8;

  let hour = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return hour + minutes / 60;
}

function getJobDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 2; // Default 2 hours
  const start = parseTimeToHour(startTime);
  const end = parseTimeToHour(endTime);
  return Math.max(end - start, 0.5); // Minimum 30 min display
}

// Calculate columns for overlapping jobs
function calculateJobColumns(jobs: ScheduleJob[]): Map<string, { column: number; totalColumns: number }> {
  const result = new Map<string, { column: number; totalColumns: number }>();
  
  if (jobs.length === 0) return result;
  
  // Parse job times and sort by start time
  // Filter to only jobs that start within visible hours (6am-11pm)
  const jobsWithTimes = jobs.map(job => ({
    job,
    start: parseTimeToHour(job.startTime),
    end: parseTimeToHour(job.endTime) || parseTimeToHour(job.startTime) + 2, // Default 2 hour duration
  })).filter(item => item.start >= 6 && item.start <= 23)
    .sort((a, b) => a.start - b.start);
  
  // Set default for jobs outside visible hours
  jobs.forEach(job => {
    const start = parseTimeToHour(job.startTime);
    if (start < 6 || start > 23) {
      result.set(job.id, { column: 0, totalColumns: 1 });
    }
  });
  
  // Find overlapping groups
  const groups: typeof jobsWithTimes[] = [];
  let currentGroup: typeof jobsWithTimes = [];
  let groupEnd = -1;
  
  for (const item of jobsWithTimes) {
    if (currentGroup.length === 0 || item.start < groupEnd) {
      currentGroup.push(item);
      groupEnd = Math.max(groupEnd, item.end);
    } else {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [item];
      groupEnd = item.end;
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);
  
  // Assign columns within each group
  for (const group of groups) {
    const columns: { end: number }[] = [];
    
    for (const item of group) {
      let assignedColumn = -1;
      
      // Find first available column
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].end <= item.start) {
          assignedColumn = i;
          columns[i].end = item.end;
          break;
        }
      }
      
      // Create new column if needed
      if (assignedColumn === -1) {
        assignedColumn = columns.length;
        columns.push({ end: item.end });
      }
      
      result.set(item.job.id, { column: assignedColumn, totalColumns: 0 });
    }
    
    // Update total columns for group
    const totalCols = columns.length;
    for (const item of group) {
      const existing = result.get(item.job.id)!;
      result.set(item.job.id, { ...existing, totalColumns: totalCols });
    }
  }
  
  return result;
}


function getTagColor(tag: string): string {
  const t = tag.toUpperCase();
  // Red tags: OOT, Cat, RN, ET
  if (['OOT', 'CAT', 'RN', 'ET'].includes(t)) return "bg-red-500 text-white";
  // Green tags: crew sizes
  if (['2', '3', '4', '5', '6+', '6', '7', '8'].includes(t)) return "bg-green-500 text-white";
  // Blue tags: Move, WT
  if (['MOVE', 'WT', 'MOVING'].includes(t)) return "bg-blue-500 text-white";
  // Purple tags: Trk, Lbr
  if (['TRK', 'LBR', 'TRUCK', 'LABOR'].includes(t)) return "bg-purple-500 text-white";
  // Orange tags: PM
  if (['PM', 'AFTERNOON'].includes(t)) return "bg-yellow-500 text-white";
  // Yellow tags: 2Cheri, 2Travis (team names)
  if (t.includes('CHERI') || t.includes('TRAVIS')) return "bg-yellow-500 text-white";
  return "bg-gray-500 text-white";
}

function SchedulePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pickerMode = searchParams.get('picker'); // 'moving' or 'walkthrough'
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [threeWeeks, setThreeWeeks] = useState<DayInfo[][]>([[], [], []]);
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const weekTouchStartX = useRef<number>(0);
  const weekTouchEndX = useRef<number>(0);
  const [weekSwipeOffset, setWeekSwipeOffset] = useState(0);
  const [isWeekSwiping, setIsWeekSwiping] = useState(false);
  const [jobSwipeOffset, setJobSwipeOffset] = useState(0);
  const [isJobSwiping, setIsJobSwiping] = useState(false);

  // Update three weeks when selected date changes
  useEffect(() => {
    setThreeWeeks(getThreeWeeks(selectedDate));
  }, [selectedDate]);

  // Fetch jobs when selected date changes
  const fetchJobs = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);

    try {
      // Add cache-busting timestamp to ensure fresh data from Workiz
      const cacheBuster = Date.now();
      const response = await fetch(`/api/schedule?date=${formatDateForApi(date)}&_t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch schedule");
      }

      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(selectedDate);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchJobs(selectedDate);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedDate, fetchJobs]);

  // Handle swipe gestures for jobs area with smooth animation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    setIsJobSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    const offset = touchEndX.current - touchStartX.current;
    setJobSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const containerWidth = scheduleRef.current?.offsetWidth || 300;
    const threshold = containerWidth * 0.2; // 20% to trigger

    if (Math.abs(diff) > threshold) {
      // Animate to target position first, then change day
      const targetOffset = diff > 0 ? -containerWidth : containerWidth;
      setIsJobSwiping(false);
      setJobSwipeOffset(targetOffset);
      
      setTimeout(() => {
        if (diff > 0) {
          goToNextDay();
        } else {
          goToPreviousDay();
        }
        setJobSwipeOffset(0);
      }, 300);
    } else {
      // Snap back
      setIsJobSwiping(false);
      setJobSwipeOffset(0);
    }
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(selectedDate.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(selectedDate.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(selectedDate);
    nextWeek.setDate(selectedDate.getDate() + 7);
    setSelectedDate(nextWeek);
  };

  const goToPreviousWeek = () => {
    const prevWeek = new Date(selectedDate);
    prevWeek.setDate(selectedDate.getDate() - 7);
    setSelectedDate(prevWeek);
  };

  // Week swipe handlers - for continuous carousel
  const weekContainerRef = useRef<HTMLDivElement>(null);

  const handleWeekTouchStart = (e: React.TouchEvent) => {
    weekTouchStartX.current = e.touches[0].clientX;
    weekTouchEndX.current = e.touches[0].clientX;
    setIsWeekSwiping(true);
  };

  const handleWeekTouchMove = (e: React.TouchEvent) => {
    weekTouchEndX.current = e.touches[0].clientX;
    const offset = weekTouchEndX.current - weekTouchStartX.current;
    // Allow full week width swiping
    setWeekSwipeOffset(offset);
  };

  const handleWeekTouchEnd = () => {
    const diff = weekTouchStartX.current - weekTouchEndX.current;
    const containerWidth = weekContainerRef.current?.offsetWidth || 300;
    const threshold = containerWidth * 0.2; // 20% of width to trigger

    if (Math.abs(diff) > threshold) {
      // Animate to target position first, then change week after animation
      const targetOffset = diff > 0 ? -containerWidth : containerWidth;
      setIsWeekSwiping(false);
      setWeekSwipeOffset(targetOffset);
      
      // After animation completes, swap the week data
      setTimeout(() => {
        if (diff > 0) {
          goToNextWeek();
        } else {
          goToPreviousWeek();
        }
        setWeekSwipeOffset(0);
      }, 300); // Match the CSS transition duration
    } else {
      // Snap back to original position
      setIsWeekSwiping(false);
      setWeekSwipeOffset(0);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Handle clicking on an hour slot when in picker mode
  const handleHourClick = (hour: number) => {
    if (!pickerMode) return;
    
    const dateStr = formatDateForApi(selectedDate);
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    
    // Navigate back to move-wt with selected date and time
    router.push(`/move-wt?picker=${pickerMode}&date=${dateStr}&time=${timeStr}`);
  };

  const goToMonth = (monthOffset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + monthOffset);
    newDate.setDate(1); // Go to first day of the month
    setSelectedDate(newDate);
    setShowMonthPicker(false);
  };

  const selectMonth = (month: number, year: number) => {
    const newDate = new Date(year, month, 1);
    setSelectedDate(newDate);
    setShowMonthPicker(false);
  };

  const selectDay = (date: Date) => {
    // In picker mode, just select the date and let user pick a time slot
    // In normal mode, just navigate to that day's schedule
    setSelectedDate(date);
  };

  // Calculate job columns for overlapping detection
  const jobColumns = calculateJobColumns(jobs);

  // Calculate job position, height, and column
  const getJobStyle = (job: ScheduleJob) => {
    const startHour = parseTimeToHour(job.startTime);
    const duration = getJobDuration(job.startTime, job.endTime);

    const top = (startHour - 6) * 60; // 60px per hour, starting from 6 AM
    const height = duration * 60;
    
    const columnInfo = jobColumns.get(job.id) || { column: 0, totalColumns: 1 };
    const gap = 2; // 2px gap between columns
    const totalGaps = columnInfo.totalColumns - 1;
    const availableWidth = 100; // percentage
    const colWidth = availableWidth / columnInfo.totalColumns;
    const leftPos = columnInfo.column * colWidth;

    return {
      top: `${top}px`,
      height: `${Math.max(height, 60)}px`, // Minimum 60px height
      left: `calc(${leftPos}% + ${columnInfo.column * gap}px)`,
      width: `calc(${colWidth}% - ${gap}px)`,
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col safe-top safe-bottom overflow-hidden" style={{ overscrollBehavior: 'none' }}>
      {/* Header */}
      <header className="text-white shadow-lg sticky top-0 z-40" style={{ backgroundColor: "#374151" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="relative">
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="flex items-center space-x-2 hover:bg-gray-600 px-2 py-1 rounded-lg transition-colors"
            >
              <span className="text-lg font-semibold text-yellow-400">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <ChevronRightIcon className={`w-4 h-4 text-gray-400 transition-transform ${showMonthPicker ? 'rotate-180' : 'rotate-90'}`} />
            </button>
            
            {/* Month Picker Dropdown */}
            {showMonthPicker && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl z-50 p-3 min-w-[280px]">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => goToMonth(-12)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <span className="font-semibold text-gray-800">{selectedDate.getFullYear()}</span>
                  <button
                    onClick={() => goToMonth(12)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                    <button
                      key={month}
                      onClick={() => selectMonth(idx, selectedDate.getFullYear())}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedDate.getMonth() === idx
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {month}
                    </button>
                  ))}
                </div>
                <button
                  onClick={goToToday}
                  className="w-full mt-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  Today
                </button>
              </div>
            )}
          </div>
          
          {/* Close button */}
          <Link
            href={pickerMode ? "/move-wt" : "/home"}
            className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-300" />
          </Link>
        </div>

        {/* Week Days - Continuous carousel showing 3 weeks */}
        <div
          ref={weekContainerRef}
          className="overflow-hidden pb-3 cursor-grab active:cursor-grabbing"
          onTouchStart={handleWeekTouchStart}
          onTouchMove={handleWeekTouchMove}
          onTouchEnd={handleWeekTouchEnd}
        >
          <div
            className="flex"
            style={{
              transform: `translateX(calc(-33.333% + ${weekSwipeOffset}px))`,
              transition: isWeekSwiping ? 'none' : 'transform 0.3s ease-out',
              width: '300%',
            }}
          >
            {threeWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex justify-between px-2" style={{ width: '33.333%' }}>
                {week.map((day, dayIndex) => (
                  <button
                    key={dayIndex}
                    onClick={() => selectDay(day.date)}
                    className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                      day.date.toDateString() === selectedDate.toDateString()
                        ? "bg-gray-600"
                        : ""
                    }`}
                  >
                    <span className={`text-xs ${day.isToday ? "text-yellow-400" : "text-gray-400"}`}>
                      {day.dayName}
                    </span>
                    <span className={`text-lg font-medium mt-1 w-8 h-8 flex items-center justify-center rounded-full ${
                      day.date.toDateString() === selectedDate.toDateString()
                        ? "bg-gray-500 text-white"
                        : day.isToday
                        ? "text-yellow-400"
                        : "text-white"
                    }`}>
                      {day.dayNumber}
                    </span>
                    {day.hasJobs && (
                      <span className="w-1 h-1 bg-blue-400 rounded-full mt-1" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Picker Mode Instructions */}
      {pickerMode && (
        <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium">
          Tap a time slot below to select {pickerMode === 'walkthrough' ? 'walk-through' : 'move'} time
        </div>
      )}

      {/* Schedule Grid */}
      <div
        ref={scheduleRef}
        className="flex-1 overflow-y-auto bg-white overflow-x-hidden overscroll-contain"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${jobSwipeOffset}px)`,
          transition: isJobSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={() => fetchJobs(selectedDate)}
              className="text-blue-500 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="relative" style={{ height: `${HOURS.length * 60}px` }}>
            {/* Hour Lines - clickable in picker mode */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className={`absolute left-0 right-0 border-t border-gray-200 ${pickerMode ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                style={{ top: `${(hour - 6) * 60}px`, height: '60px' }}
                onClick={() => handleHourClick(hour)}
              >
                <span className="absolute top-1 left-2 text-xs bg-white px-1 text-gray-500">
                  {hour === 12
                    ? "12 pm"
                    : hour > 12
                    ? `${hour - 12} pm`
                    : `${hour} am`}
                </span>

              </div>
            ))}

            {/* Jobs */}
            <div className="absolute left-16 right-2">
              {jobs.map((job) => {
                const style = getJobStyle(job);
                return (
                  <div
                    key={job.id}
                    className="absolute bg-blue-100 border-l-4 border-blue-500 rounded-lg p-2 overflow-hidden shadow-sm"
                    style={style}
                  >
                    <div className="text-xs font-bold text-gray-800">
                      JOB #{job.serialId}
                    </div>
                    <div className="text-xs text-gray-700 mt-1">
                      {job.tags.length > 0 && (
                        <span className="font-medium">
                          {job.tags.slice(0, 2).join(", ")}
                          {job.tags.length > 2 && "..."}
                        </span>
                      )}
                      {job.jobType && (
                        <>
                          {job.tags.length > 0 && " | "}
                          {job.jobType}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {job.serialId} - {job.fullAddress}
                    </div>

                    {/* Tags Pills */}
                    {job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className={`text-xs font-medium px-2 py-1 rounded-md ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* No jobs message */}
            {jobs.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-500">No jobs scheduled for this day</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    }>
      <SchedulePageContent />
    </Suspense>
  );
}
