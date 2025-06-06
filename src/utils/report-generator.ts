import fs from 'fs';
import path from 'path';
import os from 'os';
import PDFDocument from 'pdfkit';
import { logger } from '../config/logger';
import { config } from '../config';
import axios from 'axios';

// Report types
export enum ReportType {
  NATAL = 'natal',
  COMPATIBILITY = 'compatibility',
  TRANSIT = 'transit',
  SOLAR_RETURN = 'solar_return',
  LUNAR_RETURN = 'lunar_return',
  CAREER = 'career',
  RELATIONSHIP = 'relationship',
  FINANCIAL = 'financial',
}

/**
 * Generate a PDF report based on report type and parameters
 * 
 * @param reportType - Type of report to generate
 * @param parameters - Parameters for the report
 * @param title - Title of the report
 * @param userId - User ID
 * @returns Path to the generated PDF file
 */
export const generateReport = async (
  reportType: ReportType,
  parameters: any,
  title: string,
  userId: string
): Promise<string> => {
  try {
    // Create temp file path
    const tempDir = os.tmpdir();
    const fileName = `report-${userId}-${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);
    
    // Get astrological data from Astro Engine API
    const astroData = await fetchAstrologicalData(reportType, parameters);
    
    // Generate PDF with the data
    await createPDF(filePath, reportType, title, astroData);
    
    logger.info(`Report generated at: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error('Error generating report:', error);
    throw new Error(`Failed to generate ${reportType} report`);
  }
};

/**
 * Fetch astrological data from Astro Engine API
 * 
 * @param reportType - Type of report
 * @param parameters - Parameters for the API call
 * @returns Astrological data for the report
 */
const fetchAstrologicalData = async (reportType: ReportType, parameters: any): Promise<any> => {
  try {
    // Determine endpoint based on report type
    let endpoint = '';
    let payload = {};
    
    switch (reportType) {
      case ReportType.NATAL:
        endpoint = '/natal-chart';
        payload = {
          date: parameters.birthDate,
          time: parameters.birthTime,
          location: {
            latitude: parameters.latitude,
            longitude: parameters.longitude,
          },
          house_system: 'placidus',
          zodiac_type: 'tropical',
        };
        break;
        
      case ReportType.COMPATIBILITY:
        endpoint = '/compatibility';
        payload = {
          person1: {
            date: parameters.person1.birthDate,
            time: parameters.person1.birthTime,
            location: {
              latitude: parameters.person1.latitude,
              longitude: parameters.person1.longitude,
            },
          },
          person2: {
            date: parameters.person2.birthDate,
            time: parameters.person2.birthTime,
            location: {
              latitude: parameters.person2.latitude,
              longitude: parameters.person2.longitude,
            },
          },
        };
        break;
        
      case ReportType.TRANSIT:
        endpoint = '/transits';
        payload = {
          natal_date: parameters.birthDate,
          natal_time: parameters.birthTime,
          natal_location: {
            latitude: parameters.latitude,
            longitude: parameters.longitude,
          },
          transit_date: parameters.transitDate,
        };
        break;
        
      // Add other report types as needed
      default:
        endpoint = '/natal-chart';
        payload = parameters;
    }
    
    // Make API request to Astro Engine
    const response = await axios.post(
      `${config.astroEngineUrl}${endpoint}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.astroEngineKey,
        },
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching astrological data:', error);
    throw new Error('Failed to fetch astrological data');
  }
};

/**
 * Create a PDF report with the astrological data
 * 
 * @param filePath - Path to save the PDF
 * @param reportType - Type of report
 * @param title - Title of the report
 * @param data - Astrological data for the report
 */
const createPDF = async (
  filePath: string,
  reportType: ReportType,
  title: string,
  data: any
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: title,
          Author: 'Corp Astro App',
          Subject: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Astrological Report`,
        },
      });
      
      // Pipe output to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Add header with logo
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('Corp Astro', { align: 'center' })
         .fontSize(18)
         .font('Helvetica')
         .text(title, { align: 'center' })
         .moveDown(2);
      
      // Add report content based on type
      switch (reportType) {
        case ReportType.NATAL:
          addNatalReportContent(doc, data);
          break;
          
        case ReportType.COMPATIBILITY:
          addCompatibilityReportContent(doc, data);
          break;
          
        case ReportType.TRANSIT:
          addTransitReportContent(doc, data);
          break;
          
        // Add other report types as needed
        default:
          doc.text('Report data not available', { align: 'center' });
      }
      
      // Add footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Save current position
        const originalY = doc.y;
        
        // Go to bottom of page
        doc.page.margins.bottom = 50;
        doc.y = doc.page.height - doc.page.margins.bottom;
        
        // Add page number and date
        doc.fontSize(10)
           .text(
             `Generated on ${new Date().toLocaleDateString()} | Page ${i + 1} of ${pageCount}`,
             { align: 'center' }
           );
        
        // Restore position
        doc.y = originalY;
      }
      
      // Finalize PDF
      doc.end();
      
      // Handle stream events
      stream.on('finish', () => {
        resolve();
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Add natal chart report content to PDF
 * 
 * @param doc - PDF document
 * @param data - Natal chart data
 */
const addNatalReportContent = (doc: PDFKit.PDFDocument, data: any): void => {
  // Add birth information
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Birth Information')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.birth_data) {
    doc.text(`Date: ${data.birth_data.date}`)
       .text(`Time: ${data.birth_data.time}`)
       .text(`Location: ${data.birth_data.location.name || 'Custom location'}`)
       .text(`Coordinates: ${data.birth_data.location.latitude}°, ${data.birth_data.location.longitude}°`)
       .moveDown(1);
  }
  
  // Add planetary positions
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Planetary Positions')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.planets) {
    Object.entries(data.planets).forEach(([planet, info]: [string, any]) => {
      doc.text(`${planet.charAt(0).toUpperCase() + planet.slice(1)}: ${info.sign} ${info.degrees.toFixed(2)}° (${info.house ? `House ${info.house}` : 'House not available'})`)
         .moveDown(0.2);
    });
  }
  
  doc.moveDown(1);
  
  // Add houses
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Houses')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.houses) {
    Object.entries(data.houses).forEach(([house, info]: [string, any]) => {
      doc.text(`House ${house}: ${info.sign} ${info.degrees.toFixed(2)}°`)
         .moveDown(0.2);
    });
  }
  
  doc.moveDown(1);
  
  // Add aspects
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Aspects')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.aspects) {
    data.aspects.forEach((aspect: any) => {
      doc.text(`${aspect.planet1} ${aspect.aspect} ${aspect.planet2} (Orb: ${aspect.orb.toFixed(2)}°)`)
         .moveDown(0.2);
    });
  }
  
  doc.moveDown(1);
  
  // Add interpretation
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Interpretation')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.interpretation) {
    // Sun sign interpretation
    if (data.interpretation.sun_sign) {
      doc.font('Helvetica-Bold')
         .text(`Sun in ${data.planets.sun.sign}`)
         .font('Helvetica')
         .text(data.interpretation.sun_sign)
         .moveDown(0.5);
    }
    
    // Moon sign interpretation
    if (data.interpretation.moon_sign) {
      doc.font('Helvetica-Bold')
         .text(`Moon in ${data.planets.moon.sign}`)
         .font('Helvetica')
         .text(data.interpretation.moon_sign)
         .moveDown(0.5);
    }
    
    // Ascendant interpretation
    if (data.interpretation.ascendant) {
      doc.font('Helvetica-Bold')
         .text(`Ascendant in ${data.houses['1'].sign}`)
         .font('Helvetica')
         .text(data.interpretation.ascendant)
         .moveDown(0.5);
    }
  }
};

/**
 * Add compatibility report content to PDF
 * 
 * @param doc - PDF document
 * @param data - Compatibility data
 */
const addCompatibilityReportContent = (doc: PDFKit.PDFDocument, data: any): void => {
  // Add person information
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Person 1')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.person1) {
    doc.text(`Date: ${data.person1.birth_data.date}`)
       .text(`Time: ${data.person1.birth_data.time}`)
       .text(`Location: ${data.person1.birth_data.location.name || 'Custom location'}`)
       .moveDown(1);
  }
  
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Person 2')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.person2) {
    doc.text(`Date: ${data.person2.birth_data.date}`)
       .text(`Time: ${data.person2.birth_data.time}`)
       .text(`Location: ${data.person2.birth_data.location.name || 'Custom location'}`)
       .moveDown(1);
  }
  
  // Add compatibility scores
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Compatibility Scores')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.scores) {
    doc.text(`Overall: ${data.scores.overall}%`)
       .text(`Emotional: ${data.scores.emotional}%`)
       .text(`Intellectual: ${data.scores.intellectual}%`)
       .text(`Physical: ${data.scores.physical}%`)
       .moveDown(1);
  }
  
  // Add synastry aspects
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Synastry Aspects')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.synastry && data.synastry.aspects) {
    data.synastry.aspects.forEach((aspect: any) => {
      doc.text(`Person 1 ${aspect.planet1} ${aspect.aspect} Person 2 ${aspect.planet2} (Orb: ${aspect.orb.toFixed(2)}°)`)
         .moveDown(0.2);
    });
  }
  
  doc.moveDown(1);
  
  // Add interpretation
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Relationship Interpretation')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.interpretation) {
    // Overall compatibility
    if (data.interpretation.overall) {
      doc.font('Helvetica-Bold')
         .text('Overall Compatibility')
         .font('Helvetica')
         .text(data.interpretation.overall)
         .moveDown(0.5);
    }
    
    // Emotional compatibility
    if (data.interpretation.emotional) {
      doc.font('Helvetica-Bold')
         .text('Emotional Connection')
         .font('Helvetica')
         .text(data.interpretation.emotional)
         .moveDown(0.5);
    }
    
    // Communication
    if (data.interpretation.communication) {
      doc.font('Helvetica-Bold')
         .text('Communication Style')
         .font('Helvetica')
         .text(data.interpretation.communication)
         .moveDown(0.5);
    }
  }
};

/**
 * Add transit report content to PDF
 * 
 * @param doc - PDF document
 * @param data - Transit data
 */
const addTransitReportContent = (doc: PDFKit.PDFDocument, data: any): void => {
  // Add birth and transit information
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Birth Information')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.natal_data) {
    doc.text(`Date: ${data.natal_data.date}`)
       .text(`Time: ${data.natal_data.time}`)
       .text(`Location: ${data.natal_data.location.name || 'Custom location'}`)
       .moveDown(1);
  }
  
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Transit Information')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.transit_data) {
    doc.text(`Date: ${data.transit_data.date}`)
       .text(`Time: ${data.transit_data.time || '00:00:00'}`)
       .moveDown(1);
  }
  
  // Add transit aspects
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Transit Aspects')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.aspects) {
    data.aspects.forEach((aspect: any) => {
      doc.text(`Transit ${aspect.transit_planet} ${aspect.aspect} Natal ${aspect.natal_planet} (Orb: ${aspect.orb.toFixed(2)}°)`)
         .moveDown(0.2);
    });
  }
  
  doc.moveDown(1);
  
  // Add interpretation
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('Transit Interpretation')
     .font('Helvetica')
     .fontSize(12)
     .moveDown(0.5);
  
  if (data.interpretation) {
    Object.entries(data.interpretation).forEach(([transit, text]: [string, any]) => {
      doc.font('Helvetica-Bold')
         .text(transit)
         .font('Helvetica')
         .text(text)
         .moveDown(0.5);
    });
  }
};
