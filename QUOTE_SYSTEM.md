# Customer Quote Viewer System

## Overview
Professional, customer-facing quote viewer that allows customers to view their moving quotes online using a secure, simple authentication system.

## Features
- ✅ Modern, clean design optimized for desktop, tablet, and mobile
- ✅ Secure authentication using last name + last 4 digits of phone
- ✅ Company branding with Top Shelf logo and colors
- ✅ Detailed quote breakdown with line items and subtotals
- ✅ Book appointment functionality with call/email options
- ✅ Responsive design for all screen sizes

## URL Structure
```
https://your-domain.com/quote/[last4digits]
```

Example: `https://your-domain.com/quote/1234`

## How It Works

### 1. Employee Creates Quote
- Employee fills out the quote form in the move-wt page
- Quote is automatically saved to database
- Employee can generate a shareable link

### 2. Generate Shareable Link
Use the API endpoint to generate a customer-facing link:

```bash
POST /api/quote/generate-link
Content-Type: application/json

{
  "phoneNumber": "2088662339",
  "lastName": "Smith",
  "baseUrl": "your-domain.vercel.app" // optional
}
```

Response:
```json
{
  "success": true,
  "quoteUrl": "https://your-domain.vercel.app/quote/2339",
  "last4": "2339",
  "message": "Share this link with Smith: https://your-domain.vercel.app/quote/2339"
}
```

### 3. Customer Access
1. Customer receives link: `https://your-domain.com/quote/2339`
2. Customer enters their last name
3. System verifies credentials and displays quote
4. Customer can review quote and book appointment

## Authentication

The system uses a two-factor authentication approach:
- **Public**: Last 4 digits of phone number (in URL)
- **Private**: Customer's last name

This provides security while keeping the process simple for customers.

## File Structure

```
app/
├── quote/
│   └── [phone]/
│       └── page.tsx          # Customer quote viewer page
├── api/
│   └── quote/
│       ├── get-quote/
│       │   └── route.ts      # API to fetch quote data
│       └── generate-link/
│           └── route.ts      # API to generate shareable links
public/
└── images/
    └── topshelf-logo.png     # Company logo
```

## Brand Colors

```css
Primary Blue: #0072BC
Dark Gray: #3A3A3A
Light Background: #F8F9FA
Success Green: #10B981
White: #FFFFFF
```

## Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect to Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_QUOTE_DOMAIN` (optional, defaults to Vercel URL)
4. Deploy

### Environment Variables
Add to `.env.local`:
```env
NEXT_PUBLIC_QUOTE_DOMAIN=your-custom-domain.com
```

## Contact Information Update

To update the contact information displayed on quotes:

1. Edit `app/quote/[phone]/page.tsx`
2. Find the contact info sections:
   - Line ~150: "Need help? Contact us at..."
   - Line ~560: "Call us to schedule..."
   - Line ~580: Email link

Replace placeholders with your actual contact information.

## Testing

Test the quote viewer locally:
```bash
npm run dev
```

Then visit: `http://localhost:3000/quote/1234`

Use a test customer's last name and the last 4 digits of their phone number from the database.

## Security Considerations

- ✅ No quote data in URL
- ✅ Requires knowledge of both phone number AND last name
- ✅ No public listing of available quotes
- ✅ HTTPS encryption in production
- ⚠️ Phone numbers should be kept confidential

## Future Enhancements

Potential improvements:
- Email quote links directly to customers
- Online payment integration
- Digital signature for quote acceptance
- Real-time availability calendar
- Quote expiration dates
- PDF download option

## Troubleshooting

### Quote Not Found
- Verify the quote exists in database (move_wt_jobs table)
- Check that phone number matches exactly
- Ensure quote has been saved (not just draft)

### Authentication Fails
- Verify last name spelling matches database exactly (case-insensitive)
- Check that last 4 digits in URL match phone number in database
- Look for quotes saved under phones array or legacy phone field

### Logo Not Displaying
- Verify logo exists at `public/images/topshelf-logo.png`
- Check image permissions
- Clear browser cache

## Support
For issues or questions, contact your development team.
