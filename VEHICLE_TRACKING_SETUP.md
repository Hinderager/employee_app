# Vehicle Tracking Setup Guide

## Overview
The Employee App vehicle tracking feature displays all 4 Top Shelf vehicles on a real-time map using the Bouncie GPS API.

## Features
- **Full-screen map** - No headers or footers, just the map
- **All 4 vehicles displayed** - Junk Truck, Moving Truck, F-150, Prius
- **Real-time updates** - Auto-refreshes every 5 seconds
- **No link expiration** - Always accessible (unlike customer tracking links)
- **Vehicle status** - Shows speed, running status, and location
- **Fleet overview** - Floating panel with all vehicle statuses

## Setup Instructions

### 1. Get Bouncie Access Token

The Bouncie access token can be obtained from:

**Option A: From OMW Text Project Supabase**
1. Go to the OMW Text project Supabase dashboard
2. Navigate to the `bouncie_tokens` table
3. Copy the `token_value` where `token_type = 'access_token'`

**Option B: From Bouncie API Dashboard**
1. Go to https://www.bouncie.dev/
2. Login to your account
3. Navigate to API settings
4. Copy the access token

**Option C: From Root .env File** (if available)
1. Check `D:\Top Shelf Storage Dropbox\Eric Hinderager\Online Businesses\.env`
2. Look for `BOUNCIE_ACCESS_TOKEN`

### 2. Update .env.local File

Replace the placeholder in `.env.local`:

```env
BOUNCIE_ACCESS_TOKEN=your_actual_token_here
```

### 3. Restart Development Server

```bash
npm run dev
```

### 4. Access Vehicle Tracking

Navigate to:
- **Development**: http://localhost:3000/vehicle-locations
- **Production**: https://employee-app-six-blush.vercel.app/vehicle-locations

## Deployment to Vercel

### Add Environment Variable

1. Go to Vercel dashboard
2. Select the Employee App project
3. Navigate to Settings → Environment Variables
4. Add new variable:
   - **Name**: `BOUNCIE_ACCESS_TOKEN`
   - **Value**: [your token]
   - **Environment**: Production, Preview, Development

5. Redeploy the application

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
