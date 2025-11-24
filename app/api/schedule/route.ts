import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable ISR caching

const WORKIZ_API_KEY = process.env.WORKIZ_API_KEY || 'api_c3o9qvf0tpw86oqmkygifxjmadj3uvcw';
const WORKIZ_API_SECRET = process.env.WORKIZ_API_SECRET || 'sec_50925302779624671511000216';

interface WorkizJob {
  UUID: string;
  SerialId: string;
  ClientFirstName: string;
  ClientLastName: string;
  ClientPhone: string;
  ClientEmail: string;
  Address: string;
  City: string;
  State: string;
  PostalCode: string;
  JobDateTime: string;
  EndDateTime: string;
  JobEndDateTime: string;
  JobType: string;
  JobStatus: string;
  JobTotalPrice: string;
  JobNotes: string;
  Tags: string[] | string;
  CrewMembers?: Array<{ Name: string; Phone: string }>;
}

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

function parseWorkizDateTime(dateTimeStr: string): Date | null {
  if (!dateTimeStr) return null;
  try {
    return new Date(dateTimeStr);
  } catch {
    return null;
  }
}

function formatTime(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function transformJob(job: WorkizJob): ScheduleJob {
  const startDate = parseWorkizDateTime(job.JobDateTime);
  const endDate = parseWorkizDateTime(job.JobEndDateTime || job.EndDateTime);

  // Parse tags - handle both string and array formats
  let tags: string[] = [];
  if (job.Tags) {
    if (Array.isArray(job.Tags)) {
      tags = job.Tags;
    } else if (typeof job.Tags === 'string') {
      tags = job.Tags.split(',').map(t => t.trim()).filter(t => t);
    }
  }

  const addressParts = [
    job.Address,
    job.City,
    job.State,
    job.PostalCode
  ].filter(Boolean);

  return {
    id: job.UUID,
    serialId: job.SerialId,
    customerName: `${job.ClientFirstName || ''} ${job.ClientLastName || ''}`.trim() || 'Unknown',
    phone: job.ClientPhone || '',
    email: job.ClientEmail || '',
    address: job.Address || '',
    city: job.City || '',
    state: job.State || '',
    postalCode: job.PostalCode || '',
    fullAddress: addressParts.join(', '),
    startTime: formatTime(startDate),
    endTime: formatTime(endDate),
    jobType: job.JobType || '',
    status: job.JobStatus || '',
    price: job.JobTotalPrice || '',
    notes: job.JobNotes || '',
    tags,
    crew: (job.CrewMembers || []).map(c => ({
      name: c.Name || '',
      phone: c.Phone || '',
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Get date in MST
    const now = new Date();
    const mstOffset = -7 * 60;
    const mstTime = new Date(now.getTime() + (mstOffset - now.getTimezoneOffset()) * 60000);
    const todayMST = mstTime.toISOString().split('T')[0];
    const selectedDate = dateParam || todayMST;

    // Fetch jobs from Workiz API
    const response = await fetch(
      `https://api.workiz.com/api/v1/${WORKIZ_API_KEY}/job/all/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Workiz API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch jobs from Workiz', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The API returns data in a nested structure
    const jobs: WorkizJob[] = data.data || data || [];

    // Filter jobs by scheduled date
    const filteredJobs = jobs.filter((job: WorkizJob) => {
      if (!job.JobDateTime) return false;
      const jobDate = new Date(job.JobDateTime);
      const jobDateStr = jobDate.toISOString().split('T')[0];
      return jobDateStr === selectedDate;
    });

    // Sort by start time
    filteredJobs.sort((a: WorkizJob, b: WorkizJob) => {
      const dateA = new Date(a.JobDateTime).getTime();
      const dateB = new Date(b.JobDateTime).getTime();
      return dateA - dateB;
    });

    // Transform jobs to our format
    const scheduleJobs = filteredJobs.map(transformJob);

    const jsonResponse = NextResponse.json({
      success: true,
      date: selectedDate,
      jobs: scheduleJobs,
      totalJobs: scheduleJobs.length,
    });
    
    // Prevent caching to ensure real-time updates (including Vercel edge)
    jsonResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    jsonResponse.headers.set('CDN-Cache-Control', 'no-store');
    jsonResponse.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    jsonResponse.headers.set('Pragma', 'no-cache');
    
    return jsonResponse;
  } catch (error) {
    console.error('Schedule API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
