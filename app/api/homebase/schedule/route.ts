import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Homebase API configuration - uses Token auth, not Bearer
const HOMEBASE_API_KEY = process.env.HOMEBASE_API_KEY || 'HGJqqfH5iscRjyxCcLlvg2DIXQgH4cLAJli5A3abugM';
const HOMEBASE_API_URL = 'https://app.joinhomebase.com/api';

interface HomebaseShift {
  id: string;
  employee_id: string;
  start_at: string;  // ISO date string
  end_at: string;
  date?: string;     // YYYY-MM-DD
  role?: string;
}

interface HomebaseEmployee {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  mobile?: string;
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

    // Fetch employees from Homebase
    const employeesResponse = await fetch(`${HOMEBASE_API_URL}/employees`, {
      headers: {
        'Authorization': `Token token=${HOMEBASE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!employeesResponse.ok) {
      const errorText = await employeesResponse.text();
      console.error('[homebase/schedule] Failed to fetch employees:', employeesResponse.status, errorText);
      return NextResponse.json({
        error: 'Failed to fetch employees from Homebase',
        status: employeesResponse.status,
        details: errorText
      }, { status: 500 });
    }

    const employees: HomebaseEmployee[] = await employeesResponse.json();
    console.log('[homebase/schedule] Found employees:', employees.length);

    // Fetch all shifts from Homebase
    const shiftsResponse = await fetch(`${HOMEBASE_API_URL}/shifts`, {
      headers: {
        'Authorization': `Token token=${HOMEBASE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    let allShifts: HomebaseShift[] = [];
    if (shiftsResponse.ok) {
      allShifts = await shiftsResponse.json();
      console.log('[homebase/schedule] Found shifts:', allShifts.length);
    } else {
      console.error('[homebase/schedule] Failed to fetch shifts:', shiftsResponse.status);
    }

    // Try to fetch time off requests (may not be available on all plans)
    let allTimeOff: HomebaseTimeOff[] = [];
    try {
      const timeOffResponse = await fetch(`${HOMEBASE_API_URL}/time_off_requests`, {
        headers: {
          'Authorization': `Token token=${HOMEBASE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (timeOffResponse.ok) {
        allTimeOff = await timeOffResponse.json();
        console.log('[homebase/schedule] Found time off requests:', allTimeOff.length);
      }
    } catch (e) {
      console.log('[homebase/schedule] Time off endpoint not available');
    }

    // Process each requested date
    const results = dates.map((date) => {
      // Filter shifts for this date
      const shiftsForDate = allShifts.filter(shift => {
        const shiftDate = shift.start_at?.split('T')[0] || shift.date;
        return shiftDate === date;
      });

      // Filter time off for this date
      const timeOffForDate = allTimeOff.filter(to => {
        // Check if the date falls within the time off range
        return to.status === 'approved' && date >= to.start_date && date <= to.end_date;
      });

      // Get employee IDs scheduled for this date
      const scheduledEmployeeIds = new Set(shiftsForDate.map(s => s.employee_id));

      // Get employee IDs with time off for this date
      const timeOffEmployeeIds = new Set(timeOffForDate.map(t => t.employee_id));

      // Map employees to tech info - only include those scheduled or with time off
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

      return {
        date,
        techs,
      };
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
