# Job Locations Map - Setup Guide

This system displays a real-time map of all jobs scheduled for today, with pins showing job details. The map auto-updates every 5 minutes as jobs are synced from Workiz.

## System Overview

### Architecture
1. **n8n Workflow**: Polls Workiz API every 5 minutes for today's scheduled jobs
2. **Supabase Database**: Stores job location data in the `job_locations` table
3. **Next.js API**: Serves job data to the frontend (`/api/job-locations`)
4. **React + Leaflet**: Displays interactive map with job markers

### Components Created
- **Database**: `supabase/migrations/004_create_job_locations.sql`
- **n8n Workflow**: "Workiz Job Locations Sync" (ID: B8ugJkaMYYddpcBC)
- **API Endpoint**: `app/api/job-locations/route.ts`
- **Frontend Page**: `app/job-locations/page.tsx`
- **Map Component**: `app/job-locations/JobMap.tsx`

---

## Setup Steps

### 1. Apply Database Migration

Run the migration to create the `job_locations` table in Supabase:

```bash
# Option A: Using Supabase CLI (if installed)
cd "C:/Users/Administrator/Top Shelf Storage Dropbox/Eric Hinderager/Online Businesses/Top Shelf Moving and Junk Removal/Employee App"
supabase db push

# Option B: Run SQL directly in Supabase Dashboard
# 1. Go to https://supabase.com/dashboard
# 2. Select your project (jvflufcpcxlsnszlvolj)
# 3. Go to SQL Editor
# 4. Copy and run the contents of:
#    supabase/migrations/004_create_job_locations.sql
```

### 2. Configure Supabase Credentials in n8n

The n8n workflow needs access to your Supabase database:

1. Open your n8n instance
2. Go to **Credentials** → **Supabase**
3. Create or update credential named "Top Shelf Supabase" with:
   - **Host**: `jvflufcpcxlsnszlvolj.supabase.co`
   - **Service Role Secret**: [Get from Supabase Dashboard → Project Settings → API → service_role key]

### 3. Configure Workiz API Credentials in n8n

The workflow needs Workiz API access:

1. In n8n, go to **Credentials** → **Header Auth**
2. Create credential named "Workiz API" with:
   - **Name**: `token`
   - **Value**: [Your Workiz API token]

**Note**: You may need to adjust the "Fetch Workiz Jobs" node based on your actual Workiz API structure. The workflow currently uses these fields (you may need to modify):
- `JobNumber` or `job_number` or `id`
- `JobType` or `job_type`
- `ScheduledStart` or `scheduled_start`
- `Description` or `description`
- `CustomerName` or `customer_name` or `Client.Name`
- `CustomerPhone` or `customer_phone` or `Client.Phone`
- `Address` or `address` or `Location.Address`

### 4. Activate the n8n Workflow

1. Open n8n workflow: **Workiz Job Locations Sync**
2. Test the workflow manually first:
   - Click "Execute Workflow" to run a test
   - Check the output at each node
   - Verify data appears in Supabase `job_locations` table
3. Once verified, toggle the workflow to **Active**
4. The workflow will now run every 5 minutes automatically

### 5. Verify the Frontend

1. Start the development server (if not running):
   ```bash
   npm run dev
   ```

2. Navigate to the Job Locations page:
   - Go to `/job-locations` in your app
   - You should see a map with pins for today's jobs

---

## Features

### Map Display
- **OpenStreetMap** base layer (free, no API key required)
- **Auto-zoom** to fit all job markers
- **Color-coded pins**:
  - Blue (#06649b): General jobs
  - Teal (#4ECDC4): Moving jobs
  - Red (#FF6B6B): Junk removal jobs

### Job Markers - Compact View
Each pin shows:
- Job number
- Job type
- Start time

### Job Markers - Expanded View (on click)
When you click a pin, it expands to show:
- Job description
- Customer name
- Customer phone (clickable to call)
- Address (clickable to open in Google Maps)

### Auto-Refresh
- The page automatically refreshes data every 5 minutes
- Syncs with the n8n workflow schedule
- Shows last update time in the header

---

## Customization

### Adjust n8n Sync Frequency

To change from 5 minutes to a different interval:

1. Open the n8n workflow
2. Edit the "Every 5 Minutes" (Schedule Trigger) node
3. Change `minutesInterval` to your desired value
4. Update the frontend auto-refresh in `page.tsx` line 59:
   ```typescript
   const interval = setInterval(fetchJobs, 5 * 60 * 1000); // Change 5 to match
   ```

### Customize Map Appearance

Edit `JobMap.tsx`:
- **Marker colors**: Lines 32-40 (change hex colors)
- **Default zoom**: Line 111 (change `maxZoom: 13`)
- **Tile layer**: Lines 114-117 (switch to Mapbox, CartoDB, etc.)

### Modify Job Fields

If you need different data fields:

1. Update database schema in `004_create_job_locations.sql`
2. Modify n8n "Extract Job Data" node
3. Update TypeScript interface in `page.tsx` (lines 12-23)
4. Adjust display in `JobMap.tsx`

---

## Troubleshooting

### No jobs appearing on map

1. **Check Supabase table**:
   ```sql
   SELECT * FROM job_locations WHERE scheduled_date = CURRENT_DATE;
   ```

2. **Check n8n workflow**:
   - View execution history
   - Look for errors in any node
   - Verify Workiz API is returning data

3. **Check API endpoint**:
   - Visit `/api/job-locations` directly
   - Should return JSON with jobs array

### Map not displaying

1. **Check browser console** for Leaflet errors
2. **Verify Leaflet CSS** is loaded (line 7 in `page.tsx`)
3. **Check coordinates** are valid (latitude/longitude not null)

### Geocoding issues

The workflow uses OpenStreetMap Nominatim for geocoding. If addresses aren't geocoding correctly:

1. Check the "Geocode Address" node output in n8n
2. Consider adding more specific address formatting
3. Alternative: Use Google Geocoding API (requires API key)

---

## API Reference

### GET /api/job-locations

Returns today's scheduled job locations.

**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "job_number": "12345",
      "job_type": "Moving",
      "job_start_time": "2025-11-17T09:00:00Z",
      "job_description": "3 bedroom house move",
      "customer_name": "John Doe",
      "customer_phone": "5551234567",
      "address": "123 Main St, City, State 12345",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "scheduled_date": "2025-11-17"
    }
  ],
  "count": 1,
  "timestamp": "2025-11-17T14:30:00Z",
  "date": "2025-11-17"
}
```

---

## Database Schema

### job_locations table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| job_number | TEXT | Unique job number from Workiz |
| job_type | TEXT | Type of job (Moving, Junk Removal, etc.) |
| job_start_time | TIMESTAMP | Scheduled start time |
| job_description | TEXT | Description of work |
| customer_name | TEXT | Customer name |
| customer_phone | TEXT | Customer phone number |
| address | TEXT | Job site address |
| latitude | DECIMAL(10,8) | Geocoded latitude |
| longitude | DECIMAL(11,8) | Geocoded longitude |
| scheduled_date | DATE | Job date (indexed for fast queries) |
| workiz_job_id | TEXT | Original Workiz job ID |
| last_synced_at | TIMESTAMP | Last sync from n8n |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

---

## Next Steps

1. Apply the database migration
2. Configure n8n credentials
3. Test the n8n workflow manually
4. Activate the workflow for automatic syncing
5. Access the map at `/job-locations`

For questions or issues, check the n8n execution logs and browser console for error details.
