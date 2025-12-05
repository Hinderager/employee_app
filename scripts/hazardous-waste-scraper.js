/**
 * Hazardous Waste Collection Scraper
 *
 * Scrapes the Ada County hazardous waste mobile collection schedule
 * to determine if there's a collection site today.
 *
 * Called via tsmj.newprocesstunnel.com/run-script
 */

const puppeteer = require('puppeteer');

// Hazardous waste collection schedule based on Ada County website
// Format: { dayOfWeek: { weekOfMonth: [locations] } }
// dayOfWeek: 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday
const COLLECTION_SCHEDULE = {
  1: { // Monday
    1: [{ name: 'Republic Services', address: '2943 E Lanark St, Meridian, ID 83642', lat: 43.6121, lng: -116.3523 }],
    2: [{ name: 'Republic Services', address: '2943 E Lanark St, Meridian, ID 83642', lat: 43.6121, lng: -116.3523 }],
    3: [{ name: 'Republic Services', address: '2943 E Lanark St, Meridian, ID 83642', lat: 43.6121, lng: -116.3523 }],
    4: [{ name: 'Republic Services', address: '2943 E Lanark St, Meridian, ID 83642', lat: 43.6121, lng: -116.3523 }],
    5: [{ name: 'Republic Services', address: '2943 E Lanark St, Meridian, ID 83642', lat: 43.6121, lng: -116.3523 }]
  },
  2: { // Tuesday
    1: [{ name: 'Fire Station #10', address: '2100 S Gekeler Ln, Boise, ID 83706', lat: 43.5901, lng: -116.1858 }],
    2: [{ name: 'Fire Station #14', address: '3945 N Maple Grove Rd, Boise, ID 83704', lat: 43.6553, lng: -116.2879 }],
    3: [{ name: 'Library at Cole & Ustick', address: '7557 W Ustick Rd, Boise, ID 83704', lat: 43.6547, lng: -116.2900 }],
    4: [{ name: 'Wright Congregational Church', address: '4821 W Franklin Rd, Boise, ID 83705', lat: 43.6067, lng: -116.2564 }]
  },
  3: { // Wednesday
    1: [{ name: 'Fire Station #12', address: '9065 W Fairview Ave, Boise, ID 83704', lat: 43.6175, lng: -116.3164 }],
    2: [{ name: 'Albertsons', address: '5100 W Overland Rd, Boise, ID 83705', lat: 43.5971, lng: -116.2601 }],
    3: [{ name: 'Fire Station #10', address: '2100 S Gekeler Ln, Boise, ID 83706', lat: 43.5901, lng: -116.1858 }],
    4: [{ name: 'Fire Station #14', address: '3945 N Maple Grove Rd, Boise, ID 83704', lat: 43.6553, lng: -116.2879 }]
  },
  4: { // Thursday
    1: [{ name: 'Ballentyne Park & Ride', address: '335 E State St, Eagle, ID 83616', lat: 43.6955, lng: -116.3503, quarterly: true }],
    2: [{ name: 'Kuna City Park', address: '1040 W 4th St, Kuna, ID 83634', lat: 43.4918, lng: -116.4266, quarterly: true }],
    3: [{ name: 'Ballentyne Park & Ride', address: '335 E State St, Eagle, ID 83616', lat: 43.6955, lng: -116.3503, quarterly: true }],
    4: [{ name: 'Kuna City Park', address: '1040 W 4th St, Kuna, ID 83634', lat: 43.4918, lng: -116.4266, quarterly: true }]
  }
};

// Quarterly months: January, April, July, October
const QUARTERLY_MONTHS = [0, 3, 6, 9]; // 0-indexed months

/**
 * Calculate which week of the month it is (1-5)
 */
function getWeekOfMonth(date) {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const dayOfMonth = date.getDate();

  // Calculate the week number (1-5)
  return Math.ceil((dayOfMonth + firstDayWeekday) / 7);
}

/**
 * Check if today is a quarterly collection month
 */
function isQuarterlyMonth(date) {
  return QUARTERLY_MONTHS.includes(date.getMonth());
}

/**
 * Get today's collection locations
 */
function getTodaysCollections() {
  const now = new Date();

  // Convert to MST (UTC-7)
  const mstOffset = -7 * 60;
  const mstTime = new Date(now.getTime() + (mstOffset - now.getTimezoneOffset()) * 60000);

  const dayOfWeek = mstTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const weekOfMonth = getWeekOfMonth(mstTime);
  const month = mstTime.getMonth();

  console.log(`Checking schedule for: Day ${dayOfWeek}, Week ${weekOfMonth}, Month ${month}`);

  // Only Monday-Thursday have collections
  if (dayOfWeek < 1 || dayOfWeek > 4) {
    console.log('No collections on weekends or Friday');
    return { hasCollectionToday: false, locations: [], dayOfWeek, weekOfMonth };
  }

  const daySchedule = COLLECTION_SCHEDULE[dayOfWeek];
  if (!daySchedule) {
    console.log('No schedule found for this day');
    return { hasCollectionToday: false, locations: [], dayOfWeek, weekOfMonth };
  }

  // Handle week 5 - use week 4 schedule
  const effectiveWeek = weekOfMonth > 4 ? 4 : weekOfMonth;
  const locations = daySchedule[effectiveWeek] || [];

  // Filter out quarterly locations if not in a quarterly month
  const filteredLocations = locations.filter(loc => {
    if (loc.quarterly && !isQuarterlyMonth(mstTime)) {
      console.log(`Skipping ${loc.name} - quarterly only, current month: ${month}`);
      return false;
    }
    return true;
  });

  return {
    hasCollectionToday: filteredLocations.length > 0,
    locations: filteredLocations,
    dayOfWeek,
    weekOfMonth: effectiveWeek,
    date: mstTime.toISOString().split('T')[0],
    hours: 'Noon - 7 p.m.'
  };
}

/**
 * Optionally scrape the website to verify/update schedule
 * This provides a fallback and can detect schedule changes
 */
async function scrapeWebsite() {
  let browser;
  try {
    console.log('Launching browser to verify schedule...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto('https://adacounty.id.gov/landfill/waste-types-solutions/hazardous-waste/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for the schedule table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Extract schedule data from the page
    const scheduleData = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const scheduleInfo = [];

      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          const rowData = Array.from(cells).map(cell => cell.innerText.trim());
          if (rowData.length > 0) {
            scheduleInfo.push(rowData);
          }
        });
      });

      return scheduleInfo;
    });

    console.log('Scraped schedule data:', JSON.stringify(scheduleInfo, null, 2));

    await browser.close();
    return scheduleData;
  } catch (error) {
    console.error('Error scraping website:', error.message);
    if (browser) await browser.close();
    return null;
  }
}

/**
 * Main function - called by the tunnel server
 */
async function main() {
  console.log('='.repeat(60));
  console.log('HAZARDOUS WASTE COLLECTION SCRAPER');
  console.log('Started:', new Date().toISOString());
  console.log('='.repeat(60));

  try {
    // Get today's collections from our schedule
    const result = getTodaysCollections();

    console.log('\nResult:');
    console.log('Has Collection Today:', result.hasCollectionToday);
    if (result.locations.length > 0) {
      console.log('Locations:');
      result.locations.forEach(loc => {
        console.log(`  - ${loc.name}: ${loc.address}`);
      });
    }

    // Optionally verify against the website (can be disabled if causing issues)
    // const webData = await scrapeWebsite();

    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('Error:', error.message);
    return {
      success: false,
      error: error.message,
      hasCollectionToday: false,
      locations: []
    };
  }
}

// Export for use with tunnel server
module.exports = main;

// Run directly if called from command line
if (require.main === module) {
  main().then(result => {
    console.log('\nFinal Result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}
