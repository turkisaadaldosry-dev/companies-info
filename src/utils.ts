import { Company, Violation, UpcomingRenewal, EmailContact, PhoneExtension } from './types';

// Robust CSV parser that handles quoted strings containing commas
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  const lines = text.split(/\r?\n/);
  
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let insideQuote = false;
    let entry = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    result.push(row);
  }
  return result;
}

// Convert a number value safely
function safeNumber(val: string): number {
  if (!val) return 0;
  // Remove quotes, commas, spaces
  const cleaned = val.replace(/[\",\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Clean string of enclosing quotes if any
function cleanString(val: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').trim();
}

// Parse Companies CSV data
export function mapCompanies(csvData: string[][]): Company[] {
  // Skip the header row
  const dataRows = csvData.slice(1);
  return dataRows.map((row) => {
    return {
      englishName: cleanString(row[0] || ''),
      arabicName: cleanString(row[1] || ''),
      unifiedNumber: cleanString(row[2] || ''),
      typeEnglish: cleanString(row[3] || ''),
      typeArabic: cleanString(row[4] || ''),
      branchEnglish: cleanString(row[5] || ''),
      branchArabic: cleanString(row[6] || ''),
      recordTypeEnglish: cleanString(row[7] || ''),
      recordTypeArabic: cleanString(row[8] || ''),
      mainRecordNumber: cleanString(row[9] || ''),
      crNumber: cleanString(row[10] || ''),
      articlesOfAssociation: cleanString(row[11] || ''),
      crDocument: cleanString(row[12] || ''),
      annualConfirmationExpiry: cleanString(row[13] || ''),
      annualConfirmationRemaining: safeNumber(row[14] || '0'),
      hrsdNumber: cleanString(row[15] || ''),
      qiwaExpiry: cleanString(row[16] || ''),
      qiwaRemaining: safeNumber(row[17] || '0'),
      gosiNumber: cleanString(row[18] || ''),
      cocNumber: cleanString(row[19] || ''),
      cocDocument: cleanString(row[20] || ''),
      cocExpiry: cleanString(row[21] || ''),
      cocRemaining: safeNumber(row[22] || '0'),
      nationalAddressShort: cleanString(row[23] || ''),
      nationalAddressDocument: cleanString(row[24] || ''),
      nationalAddressExpiry: cleanString(row[25] || ''),
      nationalAddressRemaining: safeNumber(row[26] || '0'),
      nationalAddressAccountNumber: cleanString(row[27] || ''),
      buildingNumber: cleanString(row[28] || ''),
      additionalNumber: cleanString(row[29] || ''),
      postalCode: cleanString(row[30] || ''),
      city: cleanString(row[31] || ''),
      district: cleanString(row[32] || ''),
      street: cleanString(row[33] || ''),
      statusEnglish: cleanString(row[34] || ''),
      statusArabic: cleanString(row[35] || ''),
    };
  });
}

// Parse Violations CSV data
export function mapViolations(csvData: string[][]): Violation[] {
  const dataRows = csvData.slice(1);
  return dataRows.map((row) => {
    return {
      companyName: cleanString(row[0] || ''),
      unifiedNumber: cleanString(row[1] || ''),
      authority: cleanString(row[2] || ''),
      violationNumber: cleanString(row[3] || ''),
      objectionNumber: cleanString(row[4] || ''),
      objectionStatus: cleanString(row[5] || ''),
      violationDate: cleanString(row[6] || ''),
      amount: safeNumber(row[7] || '0'),
      paymentStatus: cleanString(row[8] || ''),
      description: cleanString(row[9] || ''),
    };
  });
}

// Generate renewal events for the timeline/upcoming renewals page
export function extractUpcomingRenewals(companies: Company[]): UpcomingRenewal[] {
  const renewals: UpcomingRenewal[] = [];
  
  companies.forEach((company) => {
    // 1. Annual Confirmation
    if (company.annualConfirmationExpiry) {
      renewals.push({
        companyName: company.arabicName || company.englishName,
        type: 'التأكيد السنوي',
        expiryDate: company.annualConfirmationExpiry,
        remainingDays: company.annualConfirmationRemaining,
      });
    }
    
    // 2. Qiwa
    if (company.qiwaExpiry) {
      renewals.push({
        companyName: company.arabicName || company.englishName,
        type: 'منصة قوى',
        expiryDate: company.qiwaExpiry,
        remainingDays: company.qiwaRemaining,
      });
    }
    
    // 3. Chamber of Commerce (الغرفة التجارية)
    if (company.cocExpiry) {
      renewals.push({
        companyName: company.arabicName || company.englishName,
        type: 'الغرفة التجارية',
        expiryDate: company.cocExpiry,
        remainingDays: company.cocRemaining,
      });
    }
    
    // 4. National Address (العنوان الوطني)
    if (company.nationalAddressExpiry) {
      renewals.push({
        companyName: company.arabicName || company.englishName,
        type: 'العنوان الوطني',
        expiryDate: company.nationalAddressExpiry,
        remainingDays: company.nationalAddressRemaining,
      });
    }
  });

  // Sort: closest to expire first (ascending order of remaining days, but negative can be at the very top as they are expired)
  return renewals.sort((a, b) => a.remainingDays - b.remainingDays);
}

// Format currency in SAR
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ريال';
}

// Get helper color class for remaining days
export function getRemainingDaysColor(days: number): string {
  if (days < 0) return 'text-red-500 font-bold';
  if (days < 30) return 'text-amber-500 font-bold';
  return 'text-emerald-500 font-medium';
}

// Get background color class for table cells/status
export function getRemainingDaysBg(days: number): string {
  if (days < 0) return 'bg-red-500/10 text-red-400 border border-red-500/20';
  if (days < 30) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
}

// Map Emails CSV data (Columns D: name, F: jobTitle, H: department, I: email)
export function mapEmails(csvData: string[][]): EmailContact[] {
  if (csvData.length <= 1) return [];
  const dataRows = csvData.slice(1);
  return dataRows
    .map((row) => {
      return {
        name: cleanString(row[3] || ''),
        jobTitle: cleanString(row[5] || ''),
        department: cleanString(row[7] || ''),
        email: cleanString(row[8] || ''),
      };
    })
    .filter(item => item.name !== '' || item.email !== '');
}

// Map Extensions CSV data (J is extension, D is name, F is job, H is department)
export function mapExtensions(csvData: string[][]): PhoneExtension[] {
  if (csvData.length <= 1) return [];
  const dataRows = csvData.slice(1);
  return dataRows
    .map((row) => {
      const ext = cleanString(row[9] || '');
      const nameInD = cleanString(row[3] || '');
      const deptInH = cleanString(row[7] || '');
      const jobInF = cleanString(row[5] || '');
      
      if (!ext) return null;
      
      let finalName = '';
      let finalJobTitle = '';
      
      if (nameInD) {
        finalName = nameInD;
        finalJobTitle = jobInF;
      } else {
        finalName = deptInH;
        finalJobTitle = '';
      }
      
      return {
        name: finalName,
        jobTitle: finalJobTitle,
        department: deptInH,
        extension: ext
      };
    })
    .filter((item): item is PhoneExtension => item !== null && item.name !== '' && item.extension !== '');
}

