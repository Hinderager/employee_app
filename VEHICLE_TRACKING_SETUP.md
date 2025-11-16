# Vehicle Tracking Setup Guide

## Overview
The Employee App vehicle tracking feature displays all 4 Top Shelf vehicles on a real-time map using the Bouncie GPS API with **automatic token refresh**.

## Features
- **Full-screen map** - No headers or footers, just the map
- **All 4 vehicles displayed** - Junk Truck, Moving Truck, F-150, Prius
- **Real-time updates** - Auto-refreshes every 5 seconds
- **No link expiration** - Always accessible (unlike customer tracking links)
- **Auto-refreshing tokens** - Shares Supabase with OMW Text project for always-fresh tokens
- **Vehicle status** - Shows speed, running status, and location
- **Long-term solution** - No manual token updates needed

## How It Works

### Token Management
The app uses **Supabase** to fetch always-fresh Bouncie tokens:

1. **Shared Database**: Uses the same Supabase instance as OMW Text project
2. **Auto-Refresh**: OMW Text's n8n workflow refreshes the token every 50 minutes
3. **Automatic Retrieval**: Employee App fetches the latest token from Supabase on each request
4. **Fallback**: Environment variable used only if Supabase is unavailable

**Result:** Tokens never expire - they're always fresh!

## Setup Instructions

### 1. Configure Supabase Connection

Add to `.env.local`:

```env
# Supabase Configuration (shared with OMW Text project)
SUPABASE_URL="https://lwwjffbeboijnwrbksrf.supabase.co"
SUPABASE_ANON_KEY="your_supabase_anon_key"

# Optional fallback (not required if Supabase is working)
BOUNCIE_ACCESS_TOKEN="fallback_token"
```

### 2. Install Dependencies

```bash
npm install
```

The `@supabase/supabase-js` package is already in package.json.

### 3. Restart Development Server

```bash
npm run dev
```

### 4. Access Vehicle Tracking

Navigate to:
- **Development**: http://localhost:3000/vehicle-locations
- **Production**: https://employee-app-six-blush.vercel.app/vehicle-locations

## Deployment to Vercel

### Add Environment Variables

1. Go to Vercel dashboard
2. Select the Employee App project
3. Navigate to Settings → Environment Variables
4. Add these variables:
   - **SUPABASE_URL**: `https://lwwjffbeboijnwrbksrf.supabase.co`
   - **SUPABASE_ANON_KEY**: `[get from OMW Text .env]`
   - **Environment**: Production, Preview, Development

5. Redeploy the application

**Note:** No need to add `BOUNCIE_ACCESS_TOKEN` to Vercel! The app fetches it from Supabase automatically.

## Technical Details

### Vehicles Tracked

| Vehicle | IMEI | Icon | Color |
|---------|------|------|-------|
| Junk Truck | 865612071394114 | 🚛 | Red (#FF6B6B) |
| Moving Truck | 865612071391698 | 🚚 | Teal (#4ECDC4) |
| F-150 Pickup | 865612071397489 | 🛻 | Blue (#45B7D1) |
| Prius | 865612071479667 | 🚗 | Green (#96CEB4) |

### API Endpoint

**GET** `/api/vehicles/all`

Returns JSON with all vehicle locations:

```json
{
  "vehicles": [
    {
      "name": "Junk Truck",
      "imei": "865612071394114",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "speed": 35,
      "heading": 180,
      "timestamp": "2024-01-01T12:00:00Z",
      "address": "123 Main St, City, State",
      "isRunning": true,
      "color": "#FF6B6B",
      "icon": "🚛"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Map Library

- **Leaflet.js** v1.9.4 - Loaded from CDN
- **CartoDB Voyager** tiles - OpenStreetMap-based
- **Auto-fit bounds** - Map automatically centers to show all vehicles

### Update Frequency

- **5 seconds** - Default polling interval
- Can be adjusted in `app/vehicle-locations/page.tsx` line 109

### Data Source

- **Bouncie API**: https://api.bouncie.dev/v1/vehicles
- **OAuth 2.0**: Uses bearer token authentication
- **Same source as OMW Text project** - Ensures consistency

## Troubleshooting

### "Failed to fetch vehicle locations" Error

**Cause**: Missing or invalid Bouncie token

**Solution**:
1. Verify `.env.local` file exists
2. Check token is correct (no extra spaces/quotes)
3. Restart dev server: `npm run dev`

### Vehicles Show "Location unavailable"

**Cause**: Vehicle not reporting GPS data

**Solution**:
- Check vehicle is turned on
- Verify Bouncie device is installed and active
- Wait for vehicle to start moving

### Map Not Loading

**Cause**: Leaflet.js not loaded

**Solution**:
- Check browser console for errors
- Verify internet connection (Leaflet loads from CDN)
- Clear browser cache

### Token Expired

**Cause**: Bouncie tokens expire after 1 hour

**Solution**:
- Use the token refresh workflow from OMW Text project
- Set up automated token refresh (see n8n workflow: `Bouncie-Token-Refresh.json`)

## Differences from OMW Text Project

| Feature | OMW Text (Customer View) | Employee App (Internal View) |
|---------|--------------------------|------------------------------|
| Vehicles Shown | 1 per link | All 4 simultaneously |
| Link Expiration | 2 hours | Never (permanent access) |
| Authentication | Token-based | Employee login (future) |
| Header/Footer | Yes | No (full-screen map) |
| Target Audience | Customers | Employees |

## Future Enhancements

- [ ] Add employee authentication (login required)
- [ ] Vehicle history/playback
- [ ] Geofencing alerts
- [ ] Driver assignment display
- [ ] Export location data
- [ ] Custom map styles
- [ ] Offline support (PWA)

## Support

For issues or questions:
1. Check OMW Text project documentation
2. Review Bouncie API docs: https://www.bouncie.dev/docs
3. Check Supabase dashboard for token status

---

**Last Updated**: 2025-01-16
**Related Projects**: OMW Text GPS Tracker
**API Version**: Bouncie v1
