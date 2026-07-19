export interface Company {
  englishName: string;                 // A (اسم الشركة بالانجليزي)
  arabicName: string;                  // B (اسم الشركة بالعربي)
  unifiedNumber: string;               // C (الرقم الموحد)
  typeEnglish: string;                 // D (النوع بالانجليزي)
  typeArabic: string;                  // E (النوع بالعربي)
  branchEnglish: string;               // F (الفرع بالانجليزي)
  branchArabic: string;                // G (الفرع بالعربي)
  recordTypeEnglish: string;           // H (نوع السجل بالانجليزي)
  recordTypeArabic: string;            // I (نوع السجل بالعربي)
  mainRecordNumber: string;            // J (تابع لسجل رئيسي رقم)
  crNumber: string;                    // K (رقم السجل التجاري)
  articlesOfAssociation: string;       // L (عقود التأسيس / نظام الأساس) - Link
  crDocument: string;                  // M (السجل التجاري) - Link
  annualConfirmationExpiry: string;    // N (تاريخ انتهاء التأكيد السنوي)
  annualConfirmationRemaining: number; // O (المتبقي على انتهاء التأكيد السنوي)
  hrsdNumber: string;                  // P (رقم المنشأة في وزارة الموارد البشرية)
  qiwaExpiry: string;                  // Q (تاريخ انتهاء منصة قوى)
  qiwaRemaining: number;               // R (المتبقي على انتهاء منصة قوى)
  gosiNumber: string;                  // S (رقم التأمينات الاجتماعية)
  cocNumber: string;                   // T (رقم الغرفة التجارية)
  cocDocument: string;                 // U (شهادة الغرفة التجارية) - Link
  cocExpiry: string;                   // V (تاريخ انتهاء الغرفة التجارية)
  cocRemaining: number;                // W (المتبقي على انتهاء الغرفة التجارية)
  nationalAddressShort: string;        // X (العنوان الوطني المختصر)
  nationalAddressDocument: string;     // Y (العنوان الوطني) - Link
  nationalAddressExpiry: string;       // Z (تاريخ انتهاء العنوان الوطني)
  nationalAddressRemaining: number;    // AA (المتبقي على انتهاء العنوان الوطني)
  nationalAddressAccountNumber: string;// AB (رقم الحساب العنوان الوطني)
  buildingNumber: string;              // AC (رقم المبنى)
  additionalNumber: string;            // AD (الرقم الفرعي)
  postalCode: string;                  // AE (الرمز البريدي)
  city: string;                        // AF (المدينة)
  district: string;                    // AG (الحي)
  street: string;                      // AH (الشارع)
  statusEnglish: string;               // AI (الحالة بالانجليزي)
  statusArabic: string;                // AJ (الحالة بالعربي)
}

export interface Violation {
  companyName: string;                 // A (اسم الشركة)
  unifiedNumber: string;               // B (الرقم الموحد)
  authority: string;                   // C (الجهة)
  violationNumber: string;             // D (رقم المخالفه)
  objectionNumber: string;             // E (رقم الإعتراض)
  objectionStatus: string;             // F (حالة الاعتراض)
  violationDate: string;               // G (تاريخ المخالفة)
  amount: number;                      // H (مبلغ المخالفه)
  paymentStatus: string;               // I (حالة السداد)
  description: string;                 // J (وصف المخالفة)
}

export interface UpcomingRenewal {
  companyName: string;
  type: string;                        // "التأكيد السنوي" | "منصة قوى" | "الغرفة التجارية" | "العنوان الوطني"
  expiryDate: string;
  remainingDays: number;
}

export interface EmailContact {
  name: string;        // D: الاسم
  jobTitle: string;    // F: المسمى الوظيفي
  department: string;  // H: القسم
  email: string;       // I: ايميلات الخليجي
}

export interface PhoneExtension {
  name: string;        // D: الاسم (أو القسم H إذا كان الاسم فارغاً)
  jobTitle: string;    // F: المسمى الوظيفي (إن وجد)
  department: string;  // H: القسم
  extension: string;   // J: رقم التحويلة
}

