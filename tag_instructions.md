# Workiz Job Tags - Implementation Guide

## Overview

Tags in Workiz are labels that can be applied to jobs for categorization and filtering. This document explains how to programmatically add tags to jobs using the Workiz API.

## Key Discovery: Tags Only Work on Update Endpoint

**IMPORTANT**: The Workiz API does NOT support adding tags when creating a job. Tags can ONLY be added via the update endpoint after the job has been created.

This means adding tags requires a **two-step process**:
1. Create the job (returns the job UUID)
2. Update the job with tags using the UUID

---

## API Endpoints

### Create Job Endpoint
```
POST https://app.workiz.com/api/v1/{API_KEY}/job/create/
```
- Does NOT support the `Tags` field
- Returns the job UUID in the response

### Update Job Endpoint
```
POST https://app.workiz.com/api/v1/{API_KEY}/job/update/
```
- DOES support the `Tags` field
- Requires the job `UUID` to identify which job to update

---

## Step-by-Step Process

### Step 1: Create the Job

```javascript
const WORKIZ_API_KEY = 'api_xxxxxxxxxxxxxxxxxxxxx';
const WORKIZ_API_SECRET = 'sec_xxxxxxxxxxxxxxxxxxxxx';

const createPayload = {
  FirstName: 'John',
  LastName: 'Doe',
  Phone: '(555) 123-4567',
  Email: 'john.doe@example.com',
  Address: '123 Main Street',
  City: 'Dallas',
  State: 'TX',
  PostalCode: '75201',
  JobType: 'Moving WT',
  JobDateTime: '2024-12-15T10:00:00.000Z',
  JobEndDateTime: '2024-12-15T11:00:00.000Z',
  JobNotes: 'Walk-through appointment',
  auth_secret: WORKIZ_API_SECRET,
};

const createResponse = await fetch(
  `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/create/`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(createPayload),
  }
);

const createData = await createResponse.json();
```

### Step 2: Extract the UUID

The create response returns the job UUID in one of two formats:

```javascript
// Response format can vary - check both paths
const jobUUID = createData.data?.[0]?.UUID || createData.data?.UUID;

// Example response:
// {
//   "flag": true,
//   "data": [
//     {
//       "UUID": "ABC123",
//       "ClientId": "1234",
//       "link": "https://app.workiz.com/root/job/ABC123/"
//     }
//   ]
// }
```

### Step 3: Update the Job with Tags

```javascript
const updatePayload = {
  auth_secret: WORKIZ_API_SECRET,
  UUID: jobUUID,  // Required - identifies the job
  Tags: ['Move', 'WT', '3'],  // Array of tag names
};

const updateResponse = await fetch(
  `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/update/`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(updatePayload),
  }
);

const updateText = await updateResponse.text();
// Success response: {"flag":true,"msg":"Job updated","data":[...],"code":200}
```

---

## Available Tags

The following tags are configured in the Employee App:

| Tag | Color | Purpose |
|-----|-------|---------|
| Move | Blue | Moving job |
| WT | Blue | Walk-through appointment |
| Trk | Purple | Truck service |
| Lbr | Purple | Labor-only service |
| PM | Yellow | PM appointment |
| RN | Red | Special flag |
| ET | Red | Special flag |
| OOT | Red | Out of town |
| Cat | Red | Special flag |
| 2 | Green | 2-person crew |
| 3 | Green | 3-person crew |
| 4 | Green | 4-person crew |
| 5 | Green | 5-person crew |
| 6+ | Green | 6+ person crew |

---

## Implementation in Employee App

### Frontend (page.tsx)

The Schedule buttons automatically include the appropriate tag:

```typescript
// Walk-Through Schedule button
tags: ['WT', ...formData.tags.filter(t => t !== 'WT')]

// Move Date Schedule button
tags: ['Move', ...formData.tags.filter(t => t !== 'Move')]
```

This ensures:
- Walk-through appointments always get the 'WT' tag
- Move appointments always get the 'Move' tag
- Any additional tags selected by the user are also included

### Backend (API Routes)

Both schedule routes follow the same pattern:

```typescript
// schedule-walkthrough/route.ts and schedule-moving/route.ts

// Step 1: Create job
const workizResponse = await fetch(WORKIZ_CREATE_JOB_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(workizPayload),
});

const workizData = await workizResponse.json();
const jobUUID = workizData.data?.[0]?.UUID || workizData.data?.UUID;

// Step 2: Add tags (only if tags exist and UUID was returned)
if (tags && tags.length > 0 && jobUUID) {
  const updatePayload = {
    auth_secret: WORKIZ_API_SECRET,
    UUID: jobUUID,
    Tags: tags,
  };

  await fetch(WORKIZ_UPDATE_JOB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload),
  });
}
```

---

## Common Issues & Troubleshooting

### Issue: Tags not appearing on jobs

**Possible causes:**
1. Tags array is empty when sent to API
2. UUID extraction failed (check both data paths)
3. Update endpoint returned an error

**Debug steps:**
1. Add console logging to see what tags are being sent
2. Verify the UUID is correctly extracted from create response
3. Check the update response for errors

### Issue: "Invalid Field" error

The `/job/all/` endpoint does not support `records_per_page` or `order_by` parameters. Use the endpoint without extra parameters:

```javascript
// Correct
`https://app.workiz.com/api/v1/${API_KEY}/job/all/?auth_secret=${SECRET}`

// Incorrect - will return error
`https://app.workiz.com/api/v1/${API_KEY}/job/all/?auth_secret=${SECRET}&records_per_page=50`
```

### Issue: Tags replacing instead of adding

The Workiz API **replaces** all tags with the provided array. To add a tag to existing tags, you would need to:
1. Fetch the current job to get existing tags
2. Merge the new tag with existing tags
3. Send the complete array

Currently, our implementation sends fresh tags on job creation, so this isn't an issue.

---

## Test Script Example

To manually test adding a tag to a specific job:

```javascript
// test-add-tag.js
const WORKIZ_API_KEY = 'api_xxxxxxxxxxxxxxxxxxxxx';
const WORKIZ_API_SECRET = 'sec_xxxxxxxxxxxxxxxxxxxxx';

async function addTagToJob(serialId, tags) {
  // Step 1: Find UUID for the job
  const listResponse = await fetch(
    `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/all/?auth_secret=${WORKIZ_API_SECRET}`,
    { method: 'GET', headers: { 'Accept': 'application/json' } }
  );

  const listData = await listResponse.json();
  const job = listData.data?.find(j =>
    j.SerialId === serialId || j.SerialId === String(serialId)
  );

  if (!job) {
    console.log('Job not found');
    return;
  }

  console.log(`Found job ${serialId}, UUID: ${job.UUID}`);

  // Step 2: Add tags
  const updatePayload = {
    auth_secret: WORKIZ_API_SECRET,
    UUID: job.UUID,
    Tags: tags,
  };

  const updateResponse = await fetch(
    `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/update/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    }
  );

  const result = await updateResponse.text();
  console.log('Result:', result);
}

// Usage
addTagToJob(3413, ['Move', 'WT', '3']);
```

---

## Summary

1. **Tags only work on the update endpoint** - not on create
2. **Two-step process required**: Create job → Get UUID → Update with tags
3. **Tags are an array of strings**: `['Move', 'WT', '3']`
4. **Schedule buttons auto-include** the appropriate tag (WT or Move)
5. **Users can add additional tags** via the tag buttons in the UI
