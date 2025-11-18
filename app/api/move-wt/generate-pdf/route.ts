import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { google } from 'googleapis';

// Initialize OAuth client
function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NODE_ENV === 'production'
      ? process.env.GOOGLE_REDIRECT_URI
      : 'http://localhost:3001/api/auth/google/callback'
  );
}

// Get Drive client with OAuth tokens
async function getDriveClient() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error('Server not configured with Google Drive credentials');
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Refresh the access token automatically
  await oauth2Client.getAccessToken();

  return google.drive({ version: 'v3', auth: oauth2Client });
}

interface FormData {
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobNumber, address, formData, folderUrl } = body;

    if (!jobNumber || !address || !formData) {
      return NextResponse.json(
        { error: 'Job number, address, and form data are required' },
        { status: 400 }
      );
    }

    console.log(`[generate-pdf] Generating PDF for job ${jobNumber}`);

    // Get Drive client
    const drive = await getDriveClient();

    // Extract folder ID from folderUrl
    let folderId = null;
    if (folderUrl) {
      const folderIdMatch = folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (folderIdMatch) {
        folderId = folderIdMatch[1];
      }
    }

    // Fetch images from Google Drive folder if folder exists
    let images: Array<{ id: string; name: string; webContentLink: string }> = [];
    if (folderId) {
      try {
        const response = await drive.files.list({
          q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
          fields: 'files(id, name, webContentLink, mimeType)',
          orderBy: 'createdTime',
        });

        if (response.data.files) {
          images = response.data.files.map((file) => ({
            id: file.id || '',
            name: file.name || '',
            webContentLink: file.webContentLink || '',
          }));
        }

        console.log(`[generate-pdf] Found ${images.length} images in folder`);
      } catch (error) {
        console.error('[generate-pdf] Error fetching images:', error);
        // Continue without images if there's an error
      }
    }

    // Generate PDF
    const pdf = new jsPDF('p', 'mm', 'letter'); // 8.5x11 inches
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Helper function to add text with wrapping
    const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }

      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
      const lineHeight = fontSize * 0.35;

      for (const line of lines) {
        if (yPosition + lineHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 2; // Add spacing after text
    };

    const addSection = (title: string) => {
      yPosition += 5;
      pdf.setFillColor(6, 100, 155); // Blue background
      pdf.rect(margin, yPosition - 4, pageWidth - 2 * margin, 8, 'F');
      pdf.setTextColor(255, 255, 255); // White text
      addText(title, 12, true);
      pdf.setTextColor(0, 0, 0); // Reset to black
      yPosition += 2;
    };

    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MOVE CUT SHEET', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Job Information
    addSection('JOB INFORMATION');
    addText(`Job Number: ${jobNumber}`, 10, true);
    addText(`Address: ${address}`);
    yPosition += 3;

    // Customer Information
    if (formData.firstName || formData.lastName) {
      addSection('CUSTOMER INFORMATION');
      if (formData.firstName || formData.lastName) {
        addText(`Name: ${formData.firstName} ${formData.lastName}`);
      }
      if (formData.phone) addText(`Phone: ${formData.phone}`);
      if (formData.email) addText(`Email: ${formData.email}`);
      yPosition += 3;
    }

    // Service Type
    addSection('SERVICE TYPE');
    addText(`Type: ${formData.serviceType === 'truck' ? 'Truck' : 'Labor Only'}`);
    yPosition += 3;

    // Pickup Location
    if (formData.pickupAddress) {
      addSection('PICKUP LOCATION');
      addText(`${formData.pickupAddress}${formData.pickupUnit ? ` Unit ${formData.pickupUnit}` : ''}`);
      if (formData.pickupCity || formData.pickupState || formData.pickupZip) {
        addText(`${formData.pickupCity}, ${formData.pickupState} ${formData.pickupZip}`);
      }
      addText(`Type: ${formData.pickupLocationType || 'N/A'}`);
      if (formData.pickupHouseSquareFeet) {
        addText(`Size: ${formData.pickupHouseSquareFeet} sq ft`);
      }
      if (formData.pickupApartmentBedBath) {
        addText(`Beds/Baths: ${formData.pickupApartmentBedBath}`);
      }
      yPosition += 3;
    }

    // Pickup Access
    addSection('PICKUP ACCESS');
    addText(`Stairs: ${formData.pickupStairs || 0} flight(s)`);
    addText(`Narrow Doorways: ${formData.pickupNarrowDoorways ? 'Yes' : 'No'}`);
    addText(`Elevator: ${formData.pickupElevator ? 'Yes' : 'No'}`);
    addText(`Parking Distance: ${formData.pickupParkingDistance || 'N/A'}`);
    if (formData.pickupAccessNotes) {
      addText(`Notes: ${formData.pickupAccessNotes}`);
    }
    yPosition += 3;

    // Delivery Location
    if (formData.deliveryAddress) {
      addSection('DELIVERY LOCATION');
      addText(`${formData.deliveryAddress}${formData.deliveryUnit ? ` Unit ${formData.deliveryUnit}` : ''}`);
      if (formData.deliveryCity || formData.deliveryState || formData.deliveryZip) {
        addText(`${formData.deliveryCity}, ${formData.deliveryState} ${formData.deliveryZip}`);
      }
      addText(`Type: ${formData.deliveryLocationType || 'N/A'}`);
      if (formData.deliveryHouseSquareFeet) {
        addText(`Size: ${formData.deliveryHouseSquareFeet} sq ft`);
      }
      if (formData.deliveryApartmentBedBath) {
        addText(`Beds/Baths: ${formData.deliveryApartmentBedBath}`);
      }
      yPosition += 3;
    }

    // Delivery Access
    addSection('DELIVERY ACCESS');
    addText(`Stairs: ${formData.deliveryStairs || 0} flight(s)`);
    addText(`Narrow Doorways: ${formData.deliveryNarrowDoorways ? 'Yes' : 'No'}`);
    addText(`Elevator: ${formData.deliveryElevator ? 'Yes' : 'No'}`);
    addText(`Parking Distance: ${formData.deliveryParkingDistance || 'N/A'}`);
    if (formData.deliveryAccessNotes) {
      addText(`Notes: ${formData.deliveryAccessNotes}`);
    }
    yPosition += 3;

    // Special Items
    const specialItems: string[] = [];
    if (formData.gunSafes) specialItems.push(`Gun Safes (${formData.gunSafesQty})`);
    if (formData.pianos) specialItems.push(`Pianos (${formData.pianosQty})`);
    if (formData.largeTVs) specialItems.push(`Large TVs (${formData.largeTVsQty})`);
    if (formData.purpleGreenMattress) specialItems.push('Purple/Green Mattress');
    if (formData.treadmills) specialItems.push('Treadmills');
    if (formData.bunkBeds) specialItems.push(`Bunk Beds (${formData.bunkBedsQty})`);
    if (formData.trampoline) specialItems.push(`Trampoline (${formData.trampolineQty})`);
    if (formData.tableSaw) specialItems.push(`Table Saw (${formData.tableSawQty})`);
    if (formData.gymEquipment) specialItems.push(`Gym Equipment (${formData.gymEquipmentQty})`);
    if (formData.sauna) specialItems.push(`Sauna (${formData.saunaQty})`);

    if (specialItems.length > 0) {
      addSection('SPECIAL ITEMS');
      specialItems.forEach((item) => addText(`• ${item}`));
      yPosition += 3;
    }

    // Appliances
    if (formData.largeAppliances) {
      addSection('APPLIANCES');
      if (formData.applianceFridge) addText(`• Fridge (${formData.applianceFridgeQty})`);
      if (formData.applianceWasher) addText(`• Washer (${formData.applianceWasherQty})`);
      if (formData.applianceDryer) addText(`• Dryer (${formData.applianceDryerQty})`);
      if (formData.applianceOven) addText(`• Oven (${formData.applianceOvenQty})`);
      if (formData.applianceDishwasher) addText(`• Dishwasher (${formData.applianceDishwasherQty})`);
      yPosition += 3;
    }

    // Packing
    addSection('PACKING STATUS');
    addText(`Overall: ${formData.packingStatus || 'N/A'}`);
    if (formData.needsPacking) {
      const packingAreas: string[] = [];
      if (formData.packingKitchen) packingAreas.push('Kitchen');
      if (formData.packingGarage) packingAreas.push('Garage');
      if (formData.packingAttic) packingAreas.push('Attic');
      if (formData.packingWardrobeBoxes) packingAreas.push('Wardrobe Boxes');
      if (formData.packingFragileItems) packingAreas.push('Fragile Items');
      if (packingAreas.length > 0) {
        addText(`Needs Packing: ${packingAreas.join(', ')}`);
      }
    }
    yPosition += 3;

    // Junk Removal
    if (formData.junkRemovalNeeded) {
      addSection('JUNK REMOVAL');
      if (formData.junkRemovalAmount) {
        addText(`Amount: ${formData.junkRemovalAmount}`);
      }
      if (formData.junkRemovalDetails) {
        addText(`Details: ${formData.junkRemovalDetails}`);
      }
      yPosition += 3;
    }

    // Recommended Crew Size
    if (formData.recommendedCrewSize) {
      addSection('RECOMMENDED CREW SIZE');
      addText(formData.recommendedCrewSize, 12, true);
      if (formData.crewNotes) {
        addText(`Notes: ${formData.crewNotes}`);
      }
      yPosition += 3;
    }

    // Additional Considerations
    if (formData.catsPresent || formData.needsInsurance) {
      addSection('ADDITIONAL CONSIDERATIONS');
      if (formData.catsPresent) addText('• Cats present at location');
      if (formData.needsInsurance) {
        addText(`• Insurance needed (Estimated value: $${formData.estimatedValue || 'N/A'})`);
      }
      yPosition += 3;
    }

    // Add images if available
    if (images.length > 0) {
      addSection('JOB PHOTOS');
      yPosition += 5;

      const imgWidth = (pageWidth - 3 * margin) / 2; // 2 images per row
      const imgHeight = imgWidth * 0.75; // 4:3 aspect ratio
      let xPosition = margin;
      let imagesInRow = 0;

      for (const image of images) {
        try {
          // Download image from Google Drive
          const imageResponse = await drive.files.get(
            { fileId: image.id, alt: 'media' },
            { responseType: 'arraybuffer' }
          );

          const imageBuffer = Buffer.from(imageResponse.data as ArrayBuffer);
          const base64Image = imageBuffer.toString('base64');
          const imageType = image.name.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';

          // Check if we need a new page
          if (yPosition + imgHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
            xPosition = margin;
            imagesInRow = 0;
          }

          // Add image to PDF
          pdf.addImage(
            `data:image/${imageType.toLowerCase()};base64,${base64Image}`,
            imageType,
            xPosition,
            yPosition,
            imgWidth,
            imgHeight
          );

          // Add image caption
          pdf.setFontSize(8);
          pdf.text(image.name, xPosition + imgWidth / 2, yPosition + imgHeight + 3, {
            align: 'center',
            maxWidth: imgWidth,
          });

          imagesInRow++;
          if (imagesInRow === 2) {
            // Move to next row
            yPosition += imgHeight + 8;
            xPosition = margin;
            imagesInRow = 0;
          } else {
            // Move to next column
            xPosition += imgWidth + margin;
          }
        } catch (error) {
          console.error(`[generate-pdf] Error adding image ${image.name}:`, error);
          // Continue with other images
        }
      }
    }

    // Convert PDF to buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Upload PDF to Google Drive (in the same folder as images if available, otherwise root)
    const pdfFileName = `Move_Cut_Sheet_${jobNumber}_${Date.now()}.pdf`;
    const fileMetadata: any = {
      name: pdfFileName,
      mimeType: 'application/pdf',
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: 'application/pdf',
      body: require('stream').Readable.from(pdfBuffer),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const pdfUrl = file.data.webViewLink;

    console.log(`[generate-pdf] PDF generated and uploaded: ${pdfUrl}`);

    return NextResponse.json({
      success: true,
      pdf_url: pdfUrl,
      message: 'PDF generated successfully',
    });
  } catch (error) {
    console.error('[generate-pdf] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
