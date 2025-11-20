// Test GHL API Key
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

console.log('Testing GHL API Key...');
console.log('API Key:', GHL_API_KEY ? `${GHL_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('Location ID:', GHL_LOCATION_ID || 'NOT SET');
console.log('');

async function testGHLAPI() {
  try {
    // Test 1: Search Contacts (exact endpoint used in app)
    console.log('Test 1: Searching contacts by phone...');
    const contactResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&query=2088662339`,
      {
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Status:', contactResponse.status, contactResponse.statusText);

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.log('Error:', errorText);
    } else {
      const contactData = await contactResponse.json();
      console.log('✅ Contacts found:', contactData.contacts?.length || 0);
    }
    console.log('');

    // Test 2: Get Pipelines
    console.log('Test 2: Fetching pipelines...');
    const pipelinesResponse = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Version': '2021-07-28',
        },
      }
    );

    console.log('Status:', pipelinesResponse.status, pipelinesResponse.statusText);

    if (!pipelinesResponse.ok) {
      const errorText = await pipelinesResponse.text();
      console.log('Error:', errorText);
      return;
    }

    const pipelinesData = await pipelinesResponse.json();
    console.log('✅ Pipelines:', pipelinesData.pipelines?.length || 0);

    if (pipelinesData.pipelines?.length > 0) {
      console.log('   Available pipelines:');
      pipelinesData.pipelines.forEach(p => {
        console.log(`   - ${p.name} (${p.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGHLAPI();
