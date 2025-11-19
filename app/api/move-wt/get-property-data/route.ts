import { NextRequest, NextResponse } from 'next/server';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

interface PropertyData {
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  estimatedValue?: number;
  yearBuilt?: number;
  lotSize?: string;
  rentEstimate?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    console.log('[get-property-data] Fetching property data for:', address);

    // Step 1: Search for the property on Zillow using Firecrawl
    const searchQuery = `${address} zillow`;
    console.log('[get-property-data] Searching for:', searchQuery);

    const searchResponse = await fetch(`${FIRECRAWL_API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[get-property-data] Search failed:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to search for property',
        message: 'Firecrawl search request failed. Please try again or enter data manually.',
        data: null
      }, { status: searchResponse.status });
    }

    const searchData = await searchResponse.json();
    console.log('[get-property-data] Search results:', searchData);

    // Find the Zillow property URL from search results
    const zillowUrl = searchData.data?.find((result: any) =>
      result.url?.includes('zillow.com/homedetails')
    )?.url;

    if (!zillowUrl) {
      console.log('[get-property-data] No Zillow property URL found in search results');
      return NextResponse.json({
        success: false,
        error: 'Property not found',
        message: 'Could not find this property on Zillow. Please enter data manually.',
        data: null
      });
    }

    console.log('[get-property-data] Found Zillow URL:', zillowUrl);

    // Step 2: Scrape the Zillow property page
    const scrapeResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: zillowUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('[get-property-data] Scrape failed:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to scrape property data',
        message: 'Could not retrieve property details. Please enter data manually.',
        data: null
      }, { status: scrapeResponse.status });
    }

    const scrapeData = await scrapeResponse.json();
    const content = scrapeData.data?.markdown || '';
    console.log('[get-property-data] Scraped content length:', content.length);

    // Step 3: Parse the property data from the scraped content
    const propertyData: PropertyData = {};

    // Extract square feet FIRST to avoid matching price-per-sqft patterns
    // Look for patterns like "1,144sqft" or "1,144 sqft" but NOT "$87/sqft"
    // Use negative lookbehind to avoid matching when preceded by $ or /
    const sqftMatch = content.match(/(?<![$/])([\d,]+)\s*sqft/i);
    if (sqftMatch) {
      propertyData.squareFeet = parseInt(sqftMatch[1].replace(/,/g, ''));
    }

    // Extract list price (for properties currently for sale)
    // Look for price at the very beginning of the content or after "Price cut:"
    // Reject values with 4 or fewer digits (likely price-per-sqft, not actual property values)
    const listPriceMatch = content.match(/(?:Price cut[^$]*)?^\$?([\d,]+)\s*\n/mi);
    let listPrice: number | undefined;
    if (listPriceMatch) {
      const value = parseInt(listPriceMatch[1].replace(/,/g, ''));
      if (value > 9999) {  // Only accept values with 5+ digits
        listPrice = value;
      }
    }

    // Extract sold price (for recently sold properties)
    // Look for "Sold: $XXX,XXX" or "Last sold: $XXX,XXX"
    // Reject values with 4 or fewer digits
    const soldPriceMatch = content.match(/(?:sold|last sold)[:\s]+\$?([\d,]+)/i);
    let soldPrice: number | undefined;
    if (soldPriceMatch) {
      const value = parseInt(soldPriceMatch[1].replace(/,/g, ''));
      if (value > 9999) {  // Only accept values with 5+ digits
        soldPrice = value;
      }
    }

    // Extract Zestimate (estimated value)
    // Try format 1: "$496,200 Zestimate®" (number before "Zestimate")
    // Make sure it's not "$-- Zestimate®" and has 5+ digits
    let zestimateMatch = content.match(/\$?([\d,]+)\s*Zestimate[®]*/i);
    if (!zestimateMatch || zestimateMatch[1].includes('--')) {
      // Try format 2: "Zestimate®: $496,200" (number after "Zestimate")
      zestimateMatch = content.match(/Zestimate[®]*[:\s]+\$?([\d,]+)/i);
    }

    // Priority order: Zestimate > List Price > Sold Price
    // Only accept values with 5+ digits (reject price-per-sqft matches)
    if (zestimateMatch && !zestimateMatch[1].includes('--')) {
      const value = parseInt(zestimateMatch[1].replace(/,/g, ''));
      if (value > 9999) {  // Only accept values with 5+ digits
        propertyData.estimatedValue = value;
      }
    }

    // If no valid Zestimate, use fallback values
    if (!propertyData.estimatedValue) {
      if (listPrice) {
        propertyData.estimatedValue = listPrice;
      } else if (soldPrice) {
        propertyData.estimatedValue = soldPrice;
      }
    }

    // Extract bedrooms
    const bedroomsMatch = content.match(/(\d+)\s*(?:bd|bed|bedroom)/i);
    if (bedroomsMatch) {
      propertyData.bedrooms = parseInt(bedroomsMatch[1]);
    }

    // Extract bathrooms
    const bathroomsMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:ba|bath|bathroom)/i);
    if (bathroomsMatch) {
      propertyData.bathrooms = parseFloat(bathroomsMatch[1]);
    }

    // Extract year built
    const yearMatch = content.match(/(?:built|year built)[:\s]+(\d{4})/i);
    if (yearMatch) {
      propertyData.yearBuilt = parseInt(yearMatch[1]);
    }

    // Extract lot size
    const lotMatch = content.match(/lot[:\s]+([\d,]+)\s*sqft/i);
    if (lotMatch) {
      propertyData.lotSize = `${lotMatch[1]} sqft`;
    }

    // Extract rent estimate
    const rentMatch = content.match(/rent\s*zestimate[®]*[:\s]+\$?([\d,]+)/i);
    if (rentMatch) {
      propertyData.rentEstimate = parseInt(rentMatch[1].replace(/,/g, ''));
    }

    console.log('[get-property-data] Extracted property data:', propertyData);

    // Check if we got meaningful data
    if (!propertyData.squareFeet && !propertyData.bedrooms && !propertyData.estimatedValue) {
      console.log('[get-property-data] Could not extract property details from content');
      return NextResponse.json({
        success: false,
        error: 'Could not parse property data',
        message: 'Property found but details could not be extracted. Please enter data manually.',
        data: null
      });
    }

    return NextResponse.json({
      success: true,
      data: propertyData,
      source: 'zillow',
      url: zillowUrl
    });

  } catch (error) {
    console.error('[get-property-data] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch property data',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null
      },
      { status: 500 }
    );
  }
}
