import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Hazardous waste collection schedule based on Ada County website
// dayOfWeek: 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday
interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
  quarterly?: boolean;
  quarterlyNoApril?: boolean; // Jan, Jul, Oct only (no April)
}

interface DaySchedule {
  [weekOfMonth: number]: Location[];
}

interface Schedule {
  [dayOfWeek: number]: DaySchedule;
}

const COLLECTION_SCHEDULE: Schedule = {
  1: { // Monday - Republic Services every week
    1: [{ name: 'Republic Services', address: '2130 W. Franklin Rd, Meridian, ID 83642', lat: 43.6067, lng: -116.4053 }],
    2: [{ name: 'Republic Services', address: '2130 W. Franklin Rd, Meridian, ID 83642', lat: 43.6067, lng: -116.4053 }],
    3: [{ name: 'Republic Services', address: '2130 W. Franklin Rd, Meridian, ID 83642', lat: 43.6067, lng: -116.4053 }],
    4: [{ name: 'Republic Services', address: '2130 W. Franklin Rd, Meridian, ID 83642', lat: 43.6067, lng: -116.4053 }],
    5: [{ name: 'Republic Services', address: '2130 W. Franklin Rd, Meridian, ID 83642', lat: 43.6067, lng: -116.4053 }]
  },
  2: { // Tuesday
    1: [{ name: 'Fire Station #10', address: '12065 W. McMillan, Boise, ID 83713', lat: 43.6672, lng: -116.3285 }],
    2: [{ name: 'Library! At Cole & Ustick', address: '7557 W. Ustick, Boise, ID 83704', lat: 43.6547, lng: -116.2900 }],
    3: [{ name: 'Wright Congregational Church', address: '4821 West Franklin Street, Boise, ID 83705', lat: 43.6067, lng: -116.2564 }],
    4: [{ name: 'Albertsons', address: '1653 S. Vista Ave, Boise, ID 83705', lat: 43.5971, lng: -116.2039 }]
  },
  3: { // Wednesday
    1: [{ name: 'Fire Station #14', address: '2515 S. Five Mile Rd, Boise, ID 83709', lat: 43.5901, lng: -116.3088 }],
    2: [{ name: 'Ballentyne Park & Ride', address: '1890 W. State St, Eagle, ID 83616', lat: 43.6955, lng: -116.3503, quarterly: true }],
    3: [{ name: 'Kuna City Park', address: 'Kuna, ID 83634', lat: 43.4918, lng: -116.4266, quarterlyNoApril: true }],
    4: [{ name: 'Fire Station #12', address: '3240 State Hwy 21, Boise, ID 83716', lat: 43.5731, lng: -116.1367 }]
  },
  4: { // Thursday
    1: [{ name: 'Boise City Parks and Recreation', address: '711 Mountain Cove Rd, Boise, ID 83702', lat: 43.6350, lng: -116.1858 }],
    2: [], // No collection 2nd Thursday
    3: [{ name: 'Boise City Parks and Recreation', address: '711 Mountain Cove Rd, Boise, ID 83702', lat: 43.6350, lng: -116.1858 }],
    4: [{ name: 'Republic Services', address: '11101 W. Executive Dr, Boise, ID 83713', lat: 43.6672, lng: -116.3485 }]
  }
};

// Quarterly months: January, April, July, October
const QUARTERLY_MONTHS = [0, 3, 6, 9]; // 0-indexed months
// Quarterly months without April (for Kuna): January, July, October
const QUARTERLY_NO_APRIL_MONTHS = [0, 6, 9]; // 0-indexed months

/**
 * Calculate which occurrence of this weekday in the month (1st, 2nd, 3rd, 4th, 5th)
 * E.g., Dec 2 = 1st Monday, Dec 9 = 2nd Monday, etc.
 */
function getWeekOfMonth(date: Date): number {
  const dayOfMonth = date.getDate();
  // Which occurrence of this weekday in the month
  return Math.ceil(dayOfMonth / 7);
}

/**
 * Check if date is in a quarterly collection month
 */
function isQuarterlyMonth(date: Date): boolean {
  return QUARTERLY_MONTHS.includes(date.getMonth());
}

/**
 * Get collection locations for a given date
 */
function getCollectionsForDate(date: Date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const weekOfMonth = getWeekOfMonth(date);

  // Only Monday-Thursday have collections
  if (dayOfWeek < 1 || dayOfWeek > 4) {
    return { hasCollectionToday: false, locations: [], dayOfWeek, weekOfMonth };
  }

  const daySchedule = COLLECTION_SCHEDULE[dayOfWeek];
  if (!daySchedule) {
    return { hasCollectionToday: false, locations: [], dayOfWeek, weekOfMonth };
  }

  // Handle week 5 - use week 4 schedule
  const effectiveWeek = weekOfMonth > 4 ? 4 : weekOfMonth;
  const locations = daySchedule[effectiveWeek] || [];

  // Filter out quarterly locations if not in a quarterly month
  const filteredLocations = locations.filter(loc => {
    if (loc.quarterly && !isQuarterlyMonth(date)) {
      return false;
    }
    // quarterlyNoApril = Jan, Jul, Oct only (no April)
    if (loc.quarterlyNoApril && !QUARTERLY_NO_APRIL_MONTHS.includes(date.getMonth())) {
      return false;
    }
    return true;
  });

  return {
    hasCollectionToday: filteredLocations.length > 0,
    locations: filteredLocations,
    dayOfWeek,
    weekOfMonth: effectiveWeek,
    date: date.toISOString().split('T')[0],
    hours: 'Noon - 7 p.m.'
  };
}

/**
 * GET - Check if there's a hazardous collection today
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test') === 'true';

    // Test mode - always show Republic Services for demo
    if (testMode) {
      const testResult = {
        hasCollectionToday: true,
        locations: [{ name: 'Republic Services', address: '2130 W. Franklin Rd, Meridian, ID 83642', lat: 43.6067, lng: -116.4053 }],
        dayOfWeek: 1,
        weekOfMonth: 1,
        date: new Date().toISOString().split('T')[0],
        hours: 'Noon - 7 p.m.'
      };
      return NextResponse.json({ success: true, ...testResult });
    }

    // Check for date parameter
    const dateParam = searchParams.get('date');
    let targetDate: Date;

    if (dateParam) {
      // Parse the date parameter (YYYY-MM-DD format)
      targetDate = new Date(dateParam + 'T12:00:00');
    } else {
      // Get current date in MST
      const now = new Date();
      const mstOffset = -7 * 60;
      targetDate = new Date(now.getTime() + (mstOffset - now.getTimezoneOffset()) * 60000);
    }

    const result = getCollectionsForDate(targetDate);

    const jsonResponse = NextResponse.json({
      success: true,
      ...result
    });

    // Prevent caching
    jsonResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    jsonResponse.headers.set('CDN-Cache-Control', 'no-store');
    jsonResponse.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    jsonResponse.headers.set('Pragma', 'no-cache');

    return jsonResponse;
  } catch (error) {
    console.error('Hazardous API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', hasCollectionToday: false, locations: [] },
      { status: 500 }
    );
  }
}
