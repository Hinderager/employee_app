import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Homebase API configuration
// Correct base URL is api.joinhomebase.com (NOT app.joinhomebase.com)
const HOMEBASE_API_KEY = process.env.HOMEBASE_API_KEY || 'HGJqqfH5iscRjyxCcLlvg2DIXQgH4cLAJli5A3abugM';
const HOMEBASE_LOCATION_UUID = process.env.HOMEBASE_LOCATION_UUID || '243321fc-abcf-435c-9a5d-e1a992be0cf7';
const HOMEBASE_API_URL = 'https://api.joinhomebase.com';

// Generate Bearer auth header
function getAuthHeader(): string {
  if (HOMEBASE_API_KEY) {
    return `Bearer ${HOMEBASE_API_KEY}`;
  }
  return '';
}

interface HomebaseShift {
  id: number;
  user_id: number;      // This is the employee ID field
  employee_id?: number; // Alternative field name
  start_at: string;     // ISO date string like "2025-12-01T10:00:00-07:00"
  end_at: string;
  role?: string;
  first_name?: string;
  last_name?: string;
}

interface HomebaseEmployee {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  job?: {
    default_role?: string;
    level?: string;
  };
}

interface HomebaseTimeOff {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface TechInfo {
  initials: string;
  name: string;
  isScheduled: boolean;
  hasTimeOff: boolean;
}

// Get initials from name
function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dates = searchParams.get('dates')?.split(',') || [];

    if (dates.length === 0) {
      return NextResponse.json({ error: 'Dates parameter required' }, { status: 400 });
    }

    console.log('[homebase/schedule] Fetching data for dates:', dates);

    const authHeader = getAuthHeader();
    if (!authHeader) {
      console.log('[homebase/schedule] No API credentials configured');
      const results = dates.map(date => ({ date, techs: [] }));
      return NextResponse.json({
        success: true,
        data: results,
        apiStatus: 'no_credentials',
        message: 'Homebase API credentials not configured'
      });
    }

    // Try to fetch employees from Homebase
    let employees: HomebaseEmployee[] = [];
    let allShifts: HomebaseShift[] = [];
    let allTimeOff: HomebaseTimeOff[] = [];
    let apiWorking = false;

    try {
      // V2 API uses location-based endpoints
      const employeesUrl = `${HOMEBASE_API_URL}/locations/${HOMEBASE_LOCATION_UUID}/employees`;
      console.log('[homebase/schedule] Fetching employees from:', employeesUrl);

      const employeesResponse = await fetch(employeesUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('[homebase/schedule] Employees response status:', employeesResponse.status);

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        // V2 API may return data in different formats
        employees = Array.isArray(employeesData) ? employeesData : (employeesData.employees || employeesData.data || []);
        apiWorking = true;
        console.log('[homebase/schedule] Found employees:', employees.length);

        // Fetch shifts for the date range
        const minDate = dates.reduce((a, b) => a < b ? a : b);
        const maxDate = dates.reduce((a, b) => a > b ? a : b);
        const shiftsUrl = `${HOMEBASE_API_URL}/locations/${HOMEBASE_LOCATION_UUID}/shifts?start_date=${minDate}&end_date=${maxDate}`;
        console.log('[homebase/schedule] Fetching shifts from:', shiftsUrl);

        const shiftsResponse = await fetch(shiftsUrl, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        console.log('[homebase/schedule] Shifts response status:', shiftsResponse.status);

        if (shiftsResponse.ok) {
          const shiftsData = await shiftsResponse.json();
          allShifts = Array.isArray(shiftsData) ? shiftsData : (shiftsData.shifts || shiftsData.data || []);
          console.log('[homebase/schedule] Found shifts:', allShifts.length);
        } else {
          const shiftsError = await shiftsResponse.text();
          console.log('[homebase/schedule] Shifts error:', shiftsError);
        }

        // Try time off
        try {
          const timeOffUrl = `${HOMEBASE_API_URL}/locations/${HOMEBASE_LOCATION_UUID}/time_off_requests`;
          const timeOffResponse = await fetch(timeOffUrl, {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });
          if (timeOffResponse.ok) {
            const timeOffData = await timeOffResponse.json();
            allTimeOff = Array.isArray(timeOffData) ? timeOffData : (timeOffData.time_off_requests || timeOffData.data || []);
          }
        } catch (e) {
          // Time off endpoint may not be available
          console.log('[homebase/schedule] Time off fetch error:', e);
        }
      } else {
        const errorText = await employeesResponse.text();
        console.log('[homebase/schedule] Homebase API returned:', employeesResponse.status, errorText, '- using fallback');
      }
    } catch (e) {
      console.log('[homebase/schedule] Homebase API error:', e, '- using fallback');
    }

    // If API is not working, return empty techs (no mock data to avoid confusion)
    if (!apiWorking) {
      const results = dates.map(date => ({ date, techs: [] }));
      return NextResponse.json({
        success: true,
        data: results,
        apiStatus: 'unavailable',
        message: 'Homebase API not accessible - check API key or plan level'
      });
    }

    // Process each requested date
    const results = dates.map((date) => {
      const shiftsForDate = allShifts.filter(shift => {
        // Extract date from ISO string like "2025-12-01T10:00:00-07:00"
        const shiftDate = shift.start_at?.split('T')[0];
        return shiftDate === date;
      });

      const timeOffForDate = allTimeOff.filter(to => {
        return to.status === 'approved' && date >= to.start_date && date <= to.end_date;
      });

      // Use user_id (the actual field from the API) or fall back to employee_id
      const scheduledEmployeeIds = new Set(shiftsForDate.map(s => s.user_id || s.employee_id));
      const timeOffEmployeeIds = new Set(timeOffForDate.map(t => Number(t.employee_id)));

      const techs: TechInfo[] = employees
        .map(emp => {
          const isScheduled = scheduledEmployeeIds.has(emp.id);
          const hasTimeOff = timeOffEmployeeIds.has(emp.id);

          return {
            initials: getInitials(emp.first_name, emp.last_name),
            name: `${emp.first_name} ${emp.last_name}`,
            isScheduled,
            hasTimeOff,
          };
        })
        .filter(t => t.isScheduled || t.hasTimeOff);

      return { date, techs };
    });

    console.log('[homebase/schedule] Returning results for dates:', results.map(r => `${r.date}: ${r.techs.length} techs`));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('[homebase/schedule] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
