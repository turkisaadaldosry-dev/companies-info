import { useState, useEffect } from 'react';
import { 
  Building2, 
  AlertTriangle, 
  CalendarClock, 
  Clock, 
  Download, 
  ExternalLink, 
  Search, 
  Filter, 
  RefreshCw, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  MapPin, 
  Briefcase, 
  Users, 
  FileText,
  Info,
  DollarSign,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Company, Violation, UpcomingRenewal } from './types';
import { 
  parseCSV, 
  mapCompanies, 
  mapViolations, 
  extractUpcomingRenewals, 
  formatCurrency, 
  getRemainingDaysBg,
  getRemainingDaysColor
} from './utils';

// Published CSV spreadsheet URLs
const COMPANIES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTHEm-CYLp3cpLwN_FX7VoBtQ4OhpkOchhwrQcse2bHbNqscW13jxfsVH9b7lok13sLMFGUSKIMxuBn/pub?gid=2091140512&single=true&output=csv";
const VIOLATIONS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTHEm-CYLp3cpLwN_FX7VoBtQ4OhpkOchhwrQcse2bHbNqscW13jxfsVH9b7lok13sLMFGUSKIMxuBn/pub?gid=1636739595&single=true&output=csv";

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'companies' | 'renewals' | 'violations'>('companies');
  
  // Filters State for Renewals
  const [renewalsFilters, setRenewalsFilters] = useState({
    status: '',
    companyName: '',
    type: '',
    monthYear: ''
  });
  
  // Popups State
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCompanyViolations, setSelectedCompanyViolations] = useState<{
    companyName: string;
    unifiedNumber: string;
    violationsList: Violation[];
  } | null>(null);

  // Filters State for Companies
  const [companyFilters, setCompanyFilters] = useState({
    name: '',
    unifiedNumber: '',
    branch: '',
    type: ''
  });

  // Filters State for Violations
  const [violationFilters, setViolationFilters] = useState({
    authority: '',
    companyName: '',
    paymentStatus: '',
    objectionStatus: '',
    monthYear: '',
    violationNumber: ''
  });

  // Fetch and Parse Spreadsheet Data
  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      // Fetch both sheets concurrently
      const [companiesRes, violationsRes] = await Promise.all([
        fetch(`${COMPANIES_URL}&_nocache=${Date.now()}`),
        fetch(`${VIOLATIONS_URL}&_nocache=${Date.now()}`)
      ]);

      if (!companiesRes.ok || !violationsRes.ok) {
        throw new Error("فشل الاتصال بخوادم مستندات جوجل. يرجى التحقق من الاتصال.");
      }

      const [companiesText, violationsText] = await Promise.all([
        companiesRes.text(),
        violationsRes.text()
      ]);

      const parsedCompaniesCSV = parseCSV(companiesText);
      const parsedViolationsCSV = parseCSV(violationsText);

      const mappedCompanies = mapCompanies(parsedCompaniesCSV);
      const mappedViolations = mapViolations(parsedViolationsCSV);

      setCompanies(mappedCompanies);
      setViolations(mappedViolations);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ غير متوقع أثناء تحميل البيانات.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to resolve Arabic month and year for filters
  const getMonthYearKey = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length < 3) return '';
    return `${parts[1]}/${parts[2]}`; // MM/YYYY
  };

  const getMonthYearLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length < 3) return dateStr;
    const monthInt = parseInt(parts[1], 10);
    const year = parts[2];
    const monthsArabic = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthName = monthsArabic[monthInt - 1] || parts[1];
    return `${monthName} ${year}`;
  };

  // Helper for unique values from lists
  const getUniqueValues = (list: string[]) => {
    return Array.from(new Set(list.filter(Boolean))).sort();
  };

  // Extract unique filter options
  const uniqueBranches = getUniqueValues(companies.map(c => c.branchArabic));
  const uniqueCompanyTypes = getUniqueValues(companies.map(c => c.typeArabic));
  
  const uniqueAuthorities = getUniqueValues(violations.map(v => v.authority));
  const uniqueViolationsCompanies = getUniqueValues(violations.map(v => v.companyName));
  const uniquePaymentStatuses = getUniqueValues(violations.map(v => v.paymentStatus));
  const uniqueObjectionStatuses = getUniqueValues(violations.map(v => v.objectionStatus));
  
  // Extract month-years for Violations
  const uniqueMonthYears = (Array.from(new Set(
    violations.map(v => getMonthYearKey(v.violationDate)).filter(Boolean)
  )) as string[]).sort((a: string, b: string) => {
    const [m1, y1] = a.split('/').map(Number);
    const [m2, y2] = b.split('/').map(Number);
    return y2 !== y1 ? y2 - y1 : m2 - m1; // sort descending
  });

  // Extract variables for Upcoming Renewals page filters
  const allRenewals = extractUpcomingRenewals(companies);

  const uniqueRenewalsCompanies = Array.from(new Set(allRenewals.map(r => r.companyName))).sort();

  const uniqueRenewalsMonthYears = Array.from(new Set(
    allRenewals.map(r => getMonthYearKey(r.expiryDate)).filter(Boolean)
  )).sort((a: string, b: string) => {
    const [m1, y1] = a.split('/').map(Number);
    const [m2, y2] = b.split('/').map(Number);
    return y1 !== y2 ? y1 - y2 : m1 - m2; // chronological ascending
  });

  const filteredRenewals = allRenewals.filter(r => {
    let statusText = "ساري";
    if (r.remainingDays < 0) {
      statusText = "منتهي";
    } else if (r.remainingDays < 30) {
      statusText = "قريب الانتهاء";
    }
    const matchStatus = !renewalsFilters.status || statusText === renewalsFilters.status;
    const matchCompany = !renewalsFilters.companyName || r.companyName === renewalsFilters.companyName;
    const matchType = !renewalsFilters.type || r.type === renewalsFilters.type;
    const matchMonthYear = !renewalsFilters.monthYear || getMonthYearKey(r.expiryDate) === renewalsFilters.monthYear;
    return matchStatus && matchCompany && matchType && matchMonthYear;
  });

  // Filters calculation for Companies Page
  const filteredCompanies = companies.filter(company => {
    const matchName = !companyFilters.name || 
      company.arabicName.toLowerCase().includes(companyFilters.name.toLowerCase()) ||
      company.englishName.toLowerCase().includes(companyFilters.name.toLowerCase());
    const matchUnified = !companyFilters.unifiedNumber || 
      company.unifiedNumber.includes(companyFilters.unifiedNumber);
    const matchBranch = !companyFilters.branch || 
      company.branchArabic === companyFilters.branch;
    const matchType = !companyFilters.type || 
      company.typeArabic === companyFilters.type;
    return matchName && matchUnified && matchBranch && matchType;
  });

  // Filters calculation for Violations Page
  const filteredViolations = violations.filter(v => {
    const matchAuthority = !violationFilters.authority || v.authority === violationFilters.authority;
    const matchCompany = !violationFilters.companyName || v.companyName === violationFilters.companyName;
    const matchPayment = !violationFilters.paymentStatus || v.paymentStatus === violationFilters.paymentStatus;
    const matchObjection = !violationFilters.objectionStatus || v.objectionStatus === violationFilters.objectionStatus;
    const matchViolationNum = !violationFilters.violationNumber || v.violationNumber.toLowerCase().includes(violationFilters.violationNumber.toLowerCase());
    const matchDate = !violationFilters.monthYear || getMonthYearKey(v.violationDate) === violationFilters.monthYear;
    return matchAuthority && matchCompany && matchPayment && matchObjection && matchViolationNum && matchDate;
  });

  // Calculate Summary Cards for Companies page: Expired Counts (< 0)
  const expiredChamberCount = companies.filter(c => c.cocRemaining < 0).length;
  const expiredNationalAddressCount = companies.filter(c => c.nationalAddressRemaining < 0).length;
  const expiredQiwaCount = companies.filter(c => c.qiwaRemaining < 0).length;
  const expiredAnnualConfirmationCount = companies.filter(c => c.annualConfirmationRemaining < 0).length;

  // Calculate Summary Cards for Violations Page
  const totalViolationsCount = filteredViolations.length;
  const totalViolationsAmount = filteredViolations.reduce((sum, v) => sum + v.amount, 0);

  // Unpaid/Rejected violations count and amount
  // "المخالفات غير المدفوعه أو المرفوضه ( يتم حساب عددها من خانة I واجماليها من خانة H)"
  const unpaidViolations = filteredViolations.filter(v => 
    v.paymentStatus === 'غير مدفوعة' || v.paymentStatus === 'مرفوضة' || v.paymentStatus.includes('غير')
  );
  const unpaidCount = unpaidViolations.length;
  const unpaidAmount = unpaidViolations.reduce((sum, v) => sum + v.amount, 0);

  // Paid violations
  const paidViolations = filteredViolations.filter(v => 
    v.paymentStatus === 'مدفوعة' || v.paymentStatus === 'مدفوع' || v.paymentStatus === 'تم السداد'
  );
  const paidCount = paidViolations.length;
  const paidAmount = paidViolations.reduce((sum, v) => sum + v.amount, 0);

  // Objection statuses statistics
  // "حالة الاعتراض كم عدد الاعتراضات اجماليها ( يتم حسابها اجماليها من خانة F وكم مقبول وكم مرفوض من نفس الخانة F )"
  const objectionsTotalList = filteredViolations.filter(v => v.objectionStatus && v.objectionStatus !== '-');
  const totalObjectionsCount = objectionsTotalList.length;
  const acceptedObjectionsCount = objectionsTotalList.filter(v => v.objectionStatus === 'مقبول' || v.objectionStatus.includes('مقبول')).length;
  const rejectedObjectionsCount = objectionsTotalList.filter(v => v.objectionStatus === 'مرفوض' || v.objectionStatus.includes('مرفوض')).length;

  // Handle click on violation row to open its company-wide analysis
  const handleViolationRowClick = (violation: Violation) => {
    const list = violations.filter(v => v.unifiedNumber === violation.unifiedNumber);
    setSelectedCompanyViolations({
      companyName: violation.companyName,
      unifiedNumber: violation.unifiedNumber,
      violationsList: list
    });
  };

  // Safe external link renderer
  const renderDocumentLink = (url: string, label: string) => {
    if (!url || url === '-' || !url.startsWith('http')) {
      return (
        <span className="text-gray-500 text-xs italic font-medium">غير متوفر</span>
      );
    }
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12192a] text-amber-500 hover:text-amber-400 font-medium text-xs shadow-neumorphic-raised border border-amber-500/10 hover:border-amber-500/30 transition-all active:shadow-neumorphic-active"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>{label}</span>
        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
      </a>
    );
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-400 pb-12 transition-colors duration-300">
      
      {/* HEADER SECTION WITH BRANDING */}
      <header className="w-full max-w-7xl mx-auto px-4 pt-8 pb-4">
        <div className="w-full p-6 rounded-2xl bg-app-card shadow-neumorphic-raised border border-app-border flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
          <a 
            href="https://indigo-armadillo-445421.hostingersite.com/#hero"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 group cursor-pointer"
          >
            {/* Shield Logo matching image */}
            <div className="w-14 h-14 rounded-[18px] bg-app-card shadow-neumorphic-raised border border-amber-500/20 group-hover:border-amber-500/50 flex items-center justify-center transition-all duration-300">
              <div className="w-11 h-11 rounded-[12px] bg-app-bg shadow-neumorphic-sunken flex items-center justify-center text-amber-500 group-hover:text-amber-400 transition-colors">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-6 h-6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 15V8" />
                  <path d="M9 11l3-3 3 3" />
                </svg>
              </div>
            </div>
            
            <div className="text-right">
              <h1 className="text-2xl font-extrabold text-app-text tracking-tight flex flex-col group-hover:text-amber-500 transition-colors leading-tight">
                <span className="font-sans text-xl font-bold tracking-normal">رَصَانَة</span>
                <span className="text-[11px] text-amber-500 tracking-[0.25em] font-extrabold uppercase font-display mt-0.5">
                  RASANA
                </span>
              </h1>
              <p className="text-[11px] text-app-muted mt-0.5 font-medium">
                لوحة متابعة ومراقبة الشركات والمخالفات التنظيمية
              </p>
            </div>
          </a>

          {/* Navigation Tabs (Neumorphic Segmented Control) */}
          <div className="flex flex-wrap bg-app-bg p-1.5 rounded-xl shadow-neumorphic-sunken border border-app-border/40 gap-1">
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'companies'
                  ? 'bg-app-card text-amber-500 shadow-neumorphic-raised border border-amber-500/20'
                  : 'text-app-muted hover:text-app-text'
              }`}
            >
              لوحة متابعة الشركات
            </button>
            <button
              onClick={() => setActiveTab('renewals')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'renewals'
                  ? 'bg-app-card text-amber-500 shadow-neumorphic-raised border border-amber-500/20'
                  : 'text-app-muted hover:text-app-text'
              }`}
            >
              تتبع التجديدات القادمة
            </button>
            <button
              onClick={() => setActiveTab('violations')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'violations'
                  ? 'bg-app-card text-amber-500 shadow-neumorphic-raised border border-amber-500/20'
                  : 'text-app-muted hover:text-app-text'
              }`}
            >
              سجل المخالفات
            </button>
          </div>

          {/* Actions: live update */}
          <div className="flex items-center gap-3">
            {/* Refresh / Realtime Indicator */}
            <button
              onClick={() => fetchData(true)}
              disabled={isLoading || isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-app-card shadow-neumorphic-raised hover:bg-app-bg/50 text-app-text hover:text-amber-500 transition-all active:shadow-neumorphic-active disabled:opacity-50 cursor-pointer border border-app-border/40"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
              <span className="text-xs font-semibold">تحديث مباشر</span>
            </button>
          </div>
        </div>
      </header>

      {/* ERROR STATUS */}
      {error && (
        <div className="w-full max-w-7xl mx-auto px-4 my-2">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* LOADER */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full bg-[#0e1626] shadow-neumorphic-raised flex items-center justify-center border border-amber-500/10">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">
            جاري مزامنة وقراءة البيانات من جوجل شيت مباشرة...
          </p>
        </div>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4">
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: COMPANIES DASHBOARD */}
            {activeTab === 'companies' && (
              <motion.div
                key="companies-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-8"
              >
                {/* Dashboard Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card 1: Expired COC */}
                  <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised border border-red-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">الغرفة التجارية المنتهية</p>
                      <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                        {expiredChamberCount}
                      </h3>
                      <p className="text-[10px] text-red-400 mt-1 font-medium">بحاجة للتجديد فوراً</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-red-500">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Card 2: Expired National Address */}
                  <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised border border-red-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">العنوان الوطني المنتهي</p>
                      <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                        {expiredNationalAddressCount}
                      </h3>
                      <p className="text-[10px] text-red-400 mt-1 font-medium">غير محدث</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-red-500">
                      <MapPin className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Card 3: Expired Qiwa */}
                  <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised border border-red-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">منصة قوى المنتهية</p>
                      <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                        {expiredQiwaCount}
                      </h3>
                      <p className="text-[10px] text-red-400 mt-1 font-medium">اشتراكات ميتة</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-red-500">
                      <Briefcase className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Card 4: Expired Annual Confirmation */}
                  <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised border border-red-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">التأكيد السنوي المنتهي</p>
                      <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                        {expiredAnnualConfirmationCount}
                      </h3>
                      <p className="text-[10px] text-red-400 mt-1 font-medium">تجاوز المهلة المحددة</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-red-500">
                      <CalendarClock className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Filters Section */}
                <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-5">
                    <Filter className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">تصفية وبحث معلومات الشركات</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Name Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">اسم الشركة</label>
                      <div className="relative">
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={companyFilters.name}
                          onChange={(e) => setCompanyFilters({ ...companyFilters, name: e.target.value })}
                          placeholder="ابحث بالاسم العربي أو الإنجليزي..."
                          className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent"
                        />
                      </div>
                    </div>

                    {/* Unified Number Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">الرقم الموحد</label>
                      <div className="relative">
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={companyFilters.unifiedNumber}
                          onChange={(e) => setCompanyFilters({ ...companyFilters, unifiedNumber: e.target.value })}
                          placeholder="ابحث بالرقم الموحد..."
                          className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent"
                        />
                      </div>
                    </div>

                    {/* Branch Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">الفرع</label>
                      <select
                        value={companyFilters.branch}
                        onChange={(e) => setCompanyFilters({ ...companyFilters, branch: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none"
                      >
                        <option value="">جميع الفروع</option>
                        {uniqueBranches.map((branch) => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">النوع</label>
                      <select
                        value={companyFilters.type}
                        onChange={(e) => setCompanyFilters({ ...companyFilters, type: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none"
                      >
                        <option value="">جميع الأنواع</option>
                        {uniqueCompanyTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* TABLE 1: COMPANY INFORMATION */}
                <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white">الجدول الأول: معلومات الشركات الأساسية</h3>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-[#0d121e] shadow-neumorphic-sunken text-slate-400 font-semibold">
                      عدد المنشآت المطابقة: {filteredCompanies.length} من أصل {companies.length}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-right text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#0d121e] border-b border-slate-800">
                          <th className="p-4 font-bold text-slate-300 text-xs">اسم الشركة</th>
                          <th className="p-4 font-bold text-slate-300 text-xs">النوع</th>
                          <th className="p-4 font-bold text-slate-300 text-xs">الفرع</th>
                          <th className="p-4 font-bold text-slate-300 text-xs">نوع السجل</th>
                          <th className="p-4 font-bold text-slate-300 text-xs">الرقم الموحد</th>
                          <th className="p-4 font-bold text-slate-300 text-xs">رقم السجل التجاري</th>
                          <th className="p-4 font-bold text-slate-300 text-xs">رقم الموارد البشرية</th>
                          <th className="p-4 font-bold text-slate-300 text-xs">رقم التأمينات</th>
                          <th className="p-4 font-bold text-slate-300 text-xs font-mono">رقم الغرفة</th>
                          <th className="p-4 font-bold text-slate-300 text-xs">العنوان الوطني المختصر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {filteredCompanies.length > 0 ? (
                          filteredCompanies.map((company) => (
                            <tr
                              key={company.unifiedNumber + '-' + company.crNumber}
                              onClick={() => setSelectedCompany(company)}
                              className="hover:bg-[#12192a]/50 cursor-pointer transition-all border-b border-slate-800/30"
                            >
                              <td className="p-4 font-semibold text-white max-w-[200px] truncate">{company.arabicName}</td>
                              <td className="p-4 text-slate-300 text-xs">{company.typeArabic}</td>
                              <td className="p-4 text-slate-300 text-xs">{company.branchArabic}</td>
                              <td className="p-4 text-slate-300 text-xs">{company.recordTypeArabic}</td>
                              <td className="p-4 text-slate-300 text-xs font-mono">{company.unifiedNumber}</td>
                              <td className="p-4 text-slate-300 text-xs font-mono">{company.crNumber}</td>
                              <td className="p-4 text-slate-300 text-xs font-mono">{company.hrsdNumber}</td>
                              <td className="p-4 text-slate-300 text-xs font-mono">{company.gosiNumber}</td>
                              <td className="p-4 text-slate-300 text-xs font-mono">{company.cocNumber}</td>
                              <td className="p-4 text-amber-400 font-bold font-mono text-xs">{company.nationalAddressShort}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                              لا توجد شركات مطابقة لمعايير البحث الحالية.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    * اضغط على أي سطر من الجدول أعلاه لعرض ملف المنشأة التفصيلي الكامل بشكل منبثق ومقسم.
                  </p>
                </div>

                {/* TABLE 2: FOLLOW-UP TABLE */}
                <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white">الجدول الثاني: متابعة تواريخ وصلاحيات المستندات</h3>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-right text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#0d121e] border-b border-slate-800">
                          <th className="p-4 font-bold text-slate-300 text-xs" rowSpan={2}>اسم الشركة</th>
                          <th className="p-4 font-bold text-slate-300 text-xs font-mono" rowSpan={2}>الرقم الموحد</th>
                          <th className="p-4 font-bold text-slate-300 text-center text-xs border-b border-slate-800" colSpan={2}>التأكيد السنوي</th>
                          <th className="p-4 font-bold text-slate-300 text-center text-xs border-b border-slate-800" colSpan={2}>منصة قوى</th>
                          <th className="p-4 font-bold text-slate-300 text-center text-xs border-b border-slate-800" colSpan={2}>الغرفة التجارية</th>
                          <th className="p-4 font-bold text-slate-300 text-center text-xs border-b border-slate-800" colSpan={2}>العنوان الوطني</th>
                        </tr>
                        <tr className="bg-[#0d121e] border-b border-slate-800 text-xs text-slate-400">
                          <th className="p-2 text-center font-semibold">تاريخ الانتهاء</th>
                          <th className="p-2 text-center font-semibold">المتبقي</th>
                          <th className="p-2 text-center font-semibold">تاريخ الانتهاء</th>
                          <th className="p-2 text-center font-semibold">المتبقي</th>
                          <th className="p-2 text-center font-semibold">تاريخ الانتهاء</th>
                          <th className="p-2 text-center font-semibold">المتبقي</th>
                          <th className="p-2 text-center font-semibold">تاريخ الانتهاء</th>
                          <th className="p-2 text-center font-semibold">المتبقي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-xs">
                        {filteredCompanies.length > 0 ? (
                          filteredCompanies.map((company) => (
                            <tr key={'follow-' + company.unifiedNumber} className="hover:bg-[#12192a]/30 transition-all border-b border-slate-800/30">
                              <td className="p-3 font-semibold text-white max-w-[150px] truncate">{company.arabicName}</td>
                              <td className="p-3 text-slate-400 font-mono">{company.unifiedNumber}</td>
                              
                              {/* Annual Confirmation */}
                              <td className="p-3 text-center text-slate-300 font-mono">{company.annualConfirmationExpiry || '-'}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${getRemainingDaysBg(company.annualConfirmationRemaining)}`}>
                                  {company.annualConfirmationRemaining} يوم
                                </span>
                              </td>

                              {/* Qiwa */}
                              <td className="p-3 text-center text-slate-300 font-mono">{company.qiwaExpiry || '-'}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${getRemainingDaysBg(company.qiwaRemaining)}`}>
                                  {company.qiwaRemaining} يوم
                                </span>
                              </td>

                              {/* Chamber of Commerce */}
                              <td className="p-3 text-center text-slate-300 font-mono">{company.cocExpiry || '-'}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${getRemainingDaysBg(company.cocRemaining)}`}>
                                  {company.cocRemaining} يوم
                                </span>
                              </td>

                              {/* National Address */}
                              <td className="p-3 text-center text-slate-300 font-mono">{company.nationalAddressExpiry || '-'}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${getRemainingDaysBg(company.nationalAddressRemaining)}`}>
                                  {company.nationalAddressRemaining} يوم
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                              لا توجد منشآت لعرض تفاصيل متابعتها.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-4 flex-wrap text-[11px] mt-1 font-semibold">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500/30"></span> أحمر: منتهي (أقل من 0 أيام)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/30"></span> أصفر: ينتهي قريباً (أقل من 30 يوماً)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/30"></span> أخضر: ساري وصالح (أكثر من 30 يوماً)</span>
                  </div>
                </div>

                {/* TABLE 3: COMPANY DOCUMENTS */}
                <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white">الجدول الثالث: مستندات وروابط الشركات السريعة</h3>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-right text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#0d121e] border-b border-slate-800">
                          <th className="p-4 font-bold text-slate-300 text-xs">اسم الشركة</th>
                          <th className="p-4 font-bold text-slate-300 text-xs font-mono">الرقم الموحد</th>
                          <th className="p-4 font-bold text-slate-300 text-xs text-center">عقود التأسيس / النظام الأساس</th>
                          <th className="p-4 font-bold text-slate-300 text-xs text-center">السجل التجاري</th>
                          <th className="p-4 font-bold text-slate-300 text-xs text-center">شهادة الغرفة التجارية</th>
                          <th className="p-4 font-bold text-slate-300 text-xs text-center">العنوان الوطني</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-xs">
                        {filteredCompanies.length > 0 ? (
                          filteredCompanies.map((company) => (
                            <tr key={'docs-' + company.unifiedNumber} className="hover:bg-[#12192a]/30 transition-all border-b border-slate-800/30">
                              <td className="p-4 font-semibold text-white max-w-[180px] truncate">{company.arabicName}</td>
                              <td className="p-4 text-slate-400 font-mono">{company.unifiedNumber}</td>
                              <td className="p-4 text-center">
                                {renderDocumentLink(company.articlesOfAssociation, "عقد التأسيس")}
                              </td>
                              <td className="p-4 text-center">
                                {renderDocumentLink(company.crDocument, "السجل التجاري")}
                              </td>
                              <td className="p-4 text-center">
                                {renderDocumentLink(company.cocDocument, "شهادة الغرفة")}
                              </td>
                              <td className="p-4 text-center">
                                {renderDocumentLink(company.nationalAddressDocument, "العنوان الوطني")}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                              لا توجد مستندات منشآت مطابقة لعرضها.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* VIEW 2: UPCOMING RENEWALS */}
            {activeTab === 'renewals' && (
              <motion.div
                key="renewals-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="p-6 rounded-2xl bg-app-card shadow-neumorphic-raised border border-app-border flex flex-col gap-6 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-4">
                    <div className="flex items-center gap-2.5">
                      <CalendarClock className="w-6 h-6 text-amber-500" />
                      <div>
                        <h2 className="text-lg font-bold text-app-text">تتبع التجديدات القادمة للمستندات</h2>
                        <p className="text-xs text-app-muted mt-0.5">مرتبة تنازلياً وتصاعدياً حسب التاريخ الأقرب لانتهاء الصلاحية</p>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-app-bg shadow-neumorphic-sunken text-app-muted font-semibold">
                      عدد التجديدات المطابقة: {filteredRenewals.length} من أصل {allRenewals.length}
                    </span>
                  </div>

                  {/* Renewals Filter Panel */}
                  <div className="p-5 rounded-2xl bg-app-bg shadow-neumorphic-sunken border border-app-border/40 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-app-text border-b border-app-border/20 pb-2">
                      <Filter className="w-4 h-4 text-amber-500" />
                      <span>تصفية وفلترة التجديدات القادمة</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Status Filter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-app-muted font-semibold">الحالة</label>
                        <select
                          value={renewalsFilters.status}
                          onChange={(e) => setRenewalsFilters({ ...renewalsFilters, status: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-app-card shadow-neumorphic-raised text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none cursor-pointer"
                        >
                          <option value="">كل الحالات</option>
                          <option value="ساري">ساري</option>
                          <option value="منتهي">منتهي</option>
                          <option value="قريب الانتهاء">قريب الانتهاء</option>
                        </select>
                      </div>

                      {/* Company Name Filter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-app-muted font-semibold">اسم الشركة</label>
                        <select
                          value={renewalsFilters.companyName}
                          onChange={(e) => setRenewalsFilters({ ...renewalsFilters, companyName: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-app-card shadow-neumorphic-raised text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none cursor-pointer"
                        >
                          <option value="">كل الشركات</option>
                          {uniqueRenewalsCompanies.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Renewal Type Filter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-app-muted font-semibold">نوع التجديد</label>
                        <select
                          value={renewalsFilters.type}
                          onChange={(e) => setRenewalsFilters({ ...renewalsFilters, type: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-app-card shadow-neumorphic-raised text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none cursor-pointer"
                        >
                          <option value="">كل الأنواع</option>
                          <option value="التأكيد السنوي">التأكيد السنوي</option>
                          <option value="منصة قوى">منصة قوى</option>
                          <option value="الغرفة التجارية">الغرفة التجارية</option>
                          <option value="العنوان الوطني">العنوان الوطني</option>
                        </select>
                      </div>

                      {/* Expiration Month & Year Filter */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-app-muted font-semibold">تاريخ الانتهاء (الشهر والسنة فقط)</label>
                        <select
                          value={renewalsFilters.monthYear}
                          onChange={(e) => setRenewalsFilters({ ...renewalsFilters, monthYear: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-app-card shadow-neumorphic-raised text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none cursor-pointer"
                        >
                          <option value="">كل التواريخ</option>
                          {uniqueRenewalsMonthYears.map((myKey) => (
                            <option key={myKey} value={myKey}>
                              {getMonthYearLabel(`01/${myKey}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Reset Button (Visible if any filter is set) */}
                    {(renewalsFilters.status || renewalsFilters.companyName || renewalsFilters.type || renewalsFilters.monthYear) && (
                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => setRenewalsFilters({ status: '', companyName: '', type: '', monthYear: '' })}
                          className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400 bg-app-card px-3 py-1.5 rounded-lg shadow-neumorphic-raised border border-amber-500/10 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>إعادة تعيين الفلاتر</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-right text-sm border-collapse">
                      <thead>
                        <tr className="bg-app-bg border-b border-app-border">
                          <th className="p-4 font-bold text-app-muted text-xs">الحالة</th>
                          <th className="p-4 font-bold text-app-muted text-xs">اسم الشركة</th>
                          <th className="p-4 font-bold text-app-muted text-xs">نوع التجديد</th>
                          <th className="p-4 font-bold text-app-muted text-xs font-display">تاريخ الانتهاء</th>
                          <th className="p-4 font-bold text-app-muted text-xs font-display">الأيام المتبقية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border/40 text-xs sm:text-sm">
                        {filteredRenewals.length > 0 ? (
                          filteredRenewals.map((renewal, index) => {
                            let statusText = "ساري";
                            let statusBadgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                            
                            if (renewal.remainingDays < 0) {
                              statusText = "منتهي";
                              statusBadgeStyle = "bg-red-500/10 text-red-400 border border-red-500/20";
                            } else if (renewal.remainingDays < 30) {
                              statusText = "قريب الانتهاء";
                              statusBadgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                            }
                            
                            return (
                              <tr key={`renewal-${index}`} className="hover:bg-app-bg/30 transition-all border-b border-app-border/30">
                                <td className="p-4">
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${statusBadgeStyle}`}>
                                    {statusText}
                                  </span>
                                </td>
                                <td className="p-4 font-semibold text-app-text">{renewal.companyName}</td>
                                <td className="p-4">
                                  <span className="inline-flex items-center gap-1.5 text-app-text">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <span>{renewal.type}</span>
                                  </span>
                                </td>
                                <td className="p-4 text-app-text font-display font-medium">{renewal.expiryDate}</td>
                                <td className="p-4">
                                  <span className={`font-display font-bold ${getRemainingDaysColor(renewal.remainingDays)}`}>
                                    {renewal.remainingDays} يوم
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-app-muted font-medium">
                              لا توجد سجلات تجديدات مطابقة للفلاتر المحددة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 3: VIOLATIONS REGISTER */}
            {activeTab === 'violations' && (
              <motion.div
                key="violations-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-8"
              >
                {/* Violations Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card 1: Total Violations */}
                  <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised border border-amber-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">إجمالي المخالفات المسجلة</p>
                      <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">
                        {totalViolationsCount} <span className="text-xs text-slate-400 font-normal">مخالفة</span>
                      </h3>
                      <p className="text-[11px] text-amber-400 mt-1 font-bold">
                        بقيمة {formatCurrency(totalViolationsAmount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-amber-500">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Card 2: Unpaid/Rejected Violations */}
                  <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised border border-red-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">المخالفات غير المدفوعة / المرفوضة</p>
                      <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">
                        {unpaidCount} <span className="text-xs text-slate-400 font-normal">مخالفة</span>
                      </h3>
                      <p className="text-[11px] text-red-400 mt-1 font-bold">
                        بقيمة {formatCurrency(unpaidAmount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-red-400">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Card 3: Paid Violations */}
                  <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised border border-emerald-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">المخالفات المسددة</p>
                      <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">
                        {paidCount} <span className="text-xs text-slate-400 font-normal">مخالفة</span>
                      </h3>
                      <p className="text-[11px] text-emerald-400 mt-1 font-bold">
                        بقيمة {formatCurrency(paidAmount)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Card 4: Objections Statistics */}
                  <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised border border-blue-500/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">سجل الاعتراضات وقراراتها</p>
                      <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">
                        {totalObjectionsCount} <span className="text-xs text-slate-400 font-normal">اعتراض</span>
                      </h3>
                      <p className="text-[10px] text-blue-400 mt-1 font-semibold flex flex-wrap gap-x-2">
                        <span>مقبول: {acceptedObjectionsCount}</span>
                        <span>|</span>
                        <span>مرفوض: {rejectedObjectionsCount}</span>
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-blue-400">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Filters Section for Violations */}
                <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-5">
                    <Filter className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">تصفية وبحث سجلات المخالفات</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Authority Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">الجهة</label>
                      <select
                        value={violationFilters.authority}
                        onChange={(e) => setViolationFilters({ ...violationFilters, authority: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none"
                      >
                        <option value="">جميع الجهات</option>
                        {uniqueAuthorities.map((auth) => (
                          <option key={auth} value={auth}>{auth}</option>
                        ))}
                      </select>
                    </div>

                    {/* Company Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">اسم الشركة</label>
                      <select
                        value={violationFilters.companyName}
                        onChange={(e) => setViolationFilters({ ...violationFilters, companyName: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none"
                      >
                        <option value="">جميع الشركات</option>
                        {uniqueViolationsCompanies.map((comp) => (
                          <option key={comp} value={comp}>{comp}</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Status Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">حالة السداد</label>
                      <select
                        value={violationFilters.paymentStatus}
                        onChange={(e) => setViolationFilters({ ...violationFilters, paymentStatus: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none"
                      >
                        <option value="">جميع الحالات</option>
                        {uniquePaymentStatuses.map((pStatus) => (
                          <option key={pStatus} value={pStatus}>{pStatus}</option>
                        ))}
                      </select>
                    </div>

                    {/* Objection Status Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">حالة الاعتراض</label>
                      <select
                        value={violationFilters.objectionStatus}
                        onChange={(e) => setViolationFilters({ ...violationFilters, objectionStatus: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none"
                      >
                        <option value="">جميع الاعتراضات</option>
                        {uniqueObjectionStatuses.map((oStatus) => (
                          <option key={oStatus} value={oStatus}>{oStatus || '-'}</option>
                        ))}
                      </select>
                    </div>

                    {/* Month/Year Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">تاريخ المخالفة (شهر/سنة)</label>
                      <select
                        value={violationFilters.monthYear}
                        onChange={(e) => setViolationFilters({ ...violationFilters, monthYear: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent appearance-none"
                      >
                        <option value="">جميع التواريخ</option>
                        {uniqueMonthYears.map((myKey) => (
                          <option key={myKey} value={myKey}>{getMonthYearLabel(`01/${myKey}`)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Violation Number Input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-400 font-semibold">رقم المخالفة</label>
                      <div className="relative">
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          value={violationFilters.violationNumber}
                          onChange={(e) => setViolationFilters({ ...violationFilters, violationNumber: e.target.value })}
                          placeholder="ابحث برقم المخالفة..."
                          className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 border border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* VIOLATIONS TABLE */}
                <div className="p-6 rounded-2xl bg-[#0e1626] shadow-neumorphic-raised flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white">سجل تفاصيل المخالفات</h3>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-[#0d121e] shadow-neumorphic-sunken text-slate-400 font-semibold">
                      عدد المخالفات المطابقة: {filteredViolations.length} من أصل {violations.length}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full text-right text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#0d121e] border-b border-slate-800">
                          <th className="p-4 font-bold text-slate-300 text-xs">اسم الشركة</th>
                          <th className="p-4 font-bold text-slate-300 text-xs font-mono">الرقم الموحد</th>
                          <th className="p-4 font-bold text-slate-300 text-xs">الجهة</th>
                          <th className="p-4 font-bold text-slate-300 text-xs font-mono">رقم المخالفة</th>
                          <th className="p-4 font-bold text-slate-300 text-xs font-mono">تاريخ المخالفة</th>
                          <th className="p-4 font-bold text-slate-300 text-xs font-mono">مبلغ المخالفة</th>
                          <th className="p-4 font-bold text-slate-300 text-xs max-w-[300px]">وصف المخالفة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-xs sm:text-sm">
                        {filteredViolations.length > 0 ? (
                          filteredViolations.map((violation, idx) => (
                            <tr
                              key={`violation-row-${idx}`}
                              onClick={() => handleViolationRowClick(violation)}
                              className="hover:bg-[#12192a]/50 cursor-pointer transition-all border-b border-slate-800/30"
                            >
                              <td className="p-4 font-semibold text-white max-w-[180px] truncate">{violation.companyName}</td>
                              <td className="p-4 text-slate-400 font-mono">{violation.unifiedNumber}</td>
                              <td className="p-4 text-slate-300">{violation.authority}</td>
                              <td className="p-4 text-amber-400 font-semibold font-mono">{violation.violationNumber}</td>
                              <td className="p-4 text-slate-300 font-mono">{violation.violationDate}</td>
                              <td className="p-4 text-red-400 font-bold font-mono">{formatCurrency(violation.amount)}</td>
                              <td className="p-4 text-slate-400 max-w-[300px] truncate" title={violation.description}>
                                {violation.description}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                              لا توجد سجلات مخالفات تطابق خيارات التصفية النشطة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    * اضغط على أي مخالفة في الجدول لعرض نافذة منبثقة تفصيلية تحتوي على تحليل مالي وإحصائي لجميع مخالفات هذه المنشأة فوراً.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      )}

      {/* FOOTER SECTION - AS SHOWN IN ATTACHED IMAGE */}
      <footer className="w-full max-w-7xl mx-auto px-4 mt-12 border-t border-app-border/40 pt-10">
        <div className="flex flex-col items-center text-center gap-6">
          
          {/* Centered Golden Shield Logo */}
          <a 
            href="https://indigo-armadillo-445421.hostingersite.com/#hero"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-4 group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-[20px] bg-app-card shadow-neumorphic-raised flex items-center justify-center border border-amber-500/20 group-hover:border-amber-500/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-[14px] bg-app-bg shadow-neumorphic-sunken flex items-center justify-center text-amber-500 group-hover:text-amber-400 transition-colors">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-7 h-7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 15V8" />
                  <path d="M9 11l3-3 3 3" />
                </svg>
              </div>
            </div>

            {/* Rasana Typography */}
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-3xl font-extrabold text-app-text group-hover:text-amber-500 transition-colors tracking-widest leading-none">رَصَانَة</h2>
              <p className="text-[12px] text-amber-500 tracking-[0.3em] font-extrabold uppercase font-display mt-1">
                RASANA
              </p>
            </div>
          </a>

          {/* Detailed Statement Tagline */}
          <p className="max-w-2xl text-sm leading-relaxed text-app-muted font-medium px-4">
            نبني كيانات مستقرة. نصنع حلولاً رصينة. استشارات إدارية وقانونية وذكاء اصطناعي للارتقاء بأداء المنشآت الوطنية نحو رؤية المملكة ٢٠٣٠.
          </p>

          {/* Divider line */}
          <div className="w-full max-w-lg border-b border-app-border/40 my-2"></div>

          {/* Copyright notice */}
          <p className="text-xs text-app-muted font-semibold">
            جميع الحقوق محفوظة © ٢٠٢٦ شركة رصانة للاستشارات.
          </p>

        </div>
      </footer>

      {/* POPUP 1: INDIVIDUAL COMPANY DETAILED RECORD */}
      <AnimatePresence>
        {selectedCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCompany(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0e1626] shadow-neumorphic-raised border border-slate-800/60 p-6 sm:p-8 z-10 flex flex-col gap-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-amber-500">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedCompany.arabicName}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">{selectedCompany.englishName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="w-10 h-10 rounded-full bg-[#0e1626] shadow-neumorphic-raised hover:bg-[#12192a] text-slate-400 hover:text-white flex items-center justify-center transition-all active:shadow-neumorphic-active"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Structured Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Section 1: البيانات الأساسية */}
                <div className="p-5 rounded-2xl bg-[#0d121e] shadow-neumorphic-sunken flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-amber-400 border-b border-slate-800/60 pb-2">البيانات الأساسية</h4>
                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold">اسم الشركة بالعربي</p>
                      <p className="text-white font-bold mt-1">{selectedCompany.arabicName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">اسم الشركة بالانجليزي</p>
                      <p className="text-white font-bold mt-1">{selectedCompany.englishName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">النوع</p>
                      <p className="text-slate-300 font-semibold mt-1">{selectedCompany.typeArabic || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">الفرع</p>
                      <p className="text-slate-300 font-semibold mt-1">{selectedCompany.branchArabic || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500 font-semibold">نوع السجل</p>
                      <p className="text-slate-300 font-semibold mt-1">{selectedCompany.recordTypeArabic || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: السجل التجاري */}
                <div className="p-5 rounded-2xl bg-[#0d121e] shadow-neumorphic-sunken flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-amber-400 border-b border-slate-800/60 pb-2">السجل التجاري</h4>
                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold">الرقم الموحد</p>
                      <p className="text-white font-bold font-mono mt-1">{selectedCompany.unifiedNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">رقم السجل التجاري</p>
                      <p className="text-white font-bold font-mono mt-1">{selectedCompany.crNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">انتهاء التأكيد السنوي</p>
                      <p className="text-slate-300 font-semibold font-mono mt-1">{selectedCompany.annualConfirmationExpiry || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">الأيام المتبقية للتأكيد</p>
                      <p className={`font-bold mt-1 ${getRemainingDaysColor(selectedCompany.annualConfirmationRemaining)}`}>
                        {selectedCompany.annualConfirmationRemaining} يوم
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: الموارد البشرية والتأمينات */}
                <div className="p-5 rounded-2xl bg-[#0d121e] shadow-neumorphic-sunken flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-amber-400 border-b border-slate-800/60 pb-2">معلومات الموارد البشرية والتأمينات</h4>
                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold">رقم التأمينات الاجتماعية</p>
                      <p className="text-white font-bold font-mono mt-1">{selectedCompany.gosiNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">رقم المنشأة (وزارة الموارد)</p>
                      <p className="text-white font-bold font-mono mt-1">{selectedCompany.hrsdNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">تاريخ انتهاء قوى</p>
                      <p className="text-slate-300 font-semibold font-mono mt-1">{selectedCompany.qiwaExpiry || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">المتبقي على منصة قوى</p>
                      <p className={`font-bold mt-1 ${getRemainingDaysColor(selectedCompany.qiwaRemaining)}`}>
                        {selectedCompany.qiwaRemaining} يوم
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 4: الغرف التجارية */}
                <div className="p-5 rounded-2xl bg-[#0d121e] shadow-neumorphic-sunken flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-amber-400 border-b border-slate-800/60 pb-2">معلومات الغرف التجارية</h4>
                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold">رقم الغرفة التجارية</p>
                      <p className="text-white font-bold font-mono mt-1">{selectedCompany.cocNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">تاريخ انتهاء الغرفة</p>
                      <p className="text-slate-300 font-semibold font-mono mt-1">{selectedCompany.cocExpiry || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500 font-semibold">المتبقي على اشتراك الغرفة</p>
                      <p className={`font-bold mt-1 ${getRemainingDaysColor(selectedCompany.cocRemaining)}`}>
                        {selectedCompany.cocRemaining} يوم
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 5: العنوان الوطني */}
                <div className="p-5 rounded-2xl bg-[#0d121e] shadow-neumorphic-sunken flex flex-col gap-4 md:col-span-2">
                  <h4 className="text-xs font-bold text-amber-400 border-b border-slate-800/60 pb-2">معلومات العنوان الوطني</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold">العنوان الوطني المختصر</p>
                      <p className="text-white font-extrabold text-sm font-mono mt-1 text-amber-400">{selectedCompany.nationalAddressShort || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">رقم حساب العنوان</p>
                      <p className="text-white font-bold font-mono mt-1">{selectedCompany.nationalAddressAccountNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">تاريخ انتهاء العنوان</p>
                      <p className="text-slate-300 font-semibold font-mono mt-1">{selectedCompany.nationalAddressExpiry || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">المتبقي للعنوان الوطني</p>
                      <p className={`font-bold mt-1 ${getRemainingDaysColor(selectedCompany.nationalAddressRemaining)}`}>
                        {selectedCompany.nationalAddressRemaining} يوم
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">المدينة / الحي</p>
                      <p className="text-slate-300 font-semibold mt-1">
                        {selectedCompany.city} - {selectedCompany.district}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">الشارع</p>
                      <p className="text-slate-300 font-semibold mt-1">{selectedCompany.street || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">رقم المبنى / الرقم الفرعي</p>
                      <p className="text-slate-300 font-semibold font-mono mt-1">
                        {selectedCompany.buildingNumber} / {selectedCompany.additionalNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold">الرمز البريدي</p>
                      <p className="text-slate-300 font-semibold font-mono mt-1">{selectedCompany.postalCode || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Section 6: المستندات والروابط السريعة */}
                <div className="p-5 rounded-2xl bg-[#0d121e] shadow-neumorphic-sunken flex flex-col gap-4 md:col-span-2">
                  <h4 className="text-xs font-bold text-amber-400 border-b border-slate-800/60 pb-2">المستندات والروابط السريعة</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] text-slate-500 font-semibold">عقد التأسيس / النظام الأساس:</span>
                      {renderDocumentLink(selectedCompany.articlesOfAssociation, "عقد التأسيس")}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] text-slate-500 font-semibold">السجل التجاري:</span>
                      {renderDocumentLink(selectedCompany.crDocument, "السجل التجاري")}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] text-slate-500 font-semibold">شهادة الغرفة التجارية:</span>
                      {renderDocumentLink(selectedCompany.cocDocument, "شهادة الغرفة")}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] text-slate-500 font-semibold">العنوان الوطني:</span>
                      {renderDocumentLink(selectedCompany.nationalAddressDocument, "العنوان الوطني")}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP 2: COMPANY-WIDE VIOLATIONS DETAILED ANALYSIS */}
      <AnimatePresence>
        {selectedCompanyViolations && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCompanyViolations(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0e1626] shadow-neumorphic-raised border border-slate-800/60 p-6 sm:p-8 z-10 flex flex-col gap-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken flex items-center justify-center text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedCompanyViolations.companyName}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">الرقم الموحد: {selectedCompanyViolations.unifiedNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCompanyViolations(null)}
                  className="w-10 h-10 rounded-full bg-[#0e1626] shadow-neumorphic-raised hover:bg-[#12192a] text-slate-400 hover:text-white flex items-center justify-center transition-all active:shadow-neumorphic-active"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Company Financial Analysis & Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Violations Card */}
                <div className="p-4 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken border border-slate-800/30">
                  <p className="text-slate-500 text-xs font-semibold">إجمالي المخالفات</p>
                  <h4 className="text-xl font-bold text-white font-mono mt-1.5">
                    {selectedCompanyViolations.violationsList.length} مخالفة
                  </h4>
                  <p className="text-[11px] text-amber-400 font-bold mt-1">
                    بقيمة {formatCurrency(selectedCompanyViolations.violationsList.reduce((s, v) => s + v.amount, 0))}
                  </p>
                </div>

                {/* Paid Violations Card */}
                <div className="p-4 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken border border-emerald-500/10">
                  <p className="text-slate-500 text-xs font-semibold">المخالفات المسددة</p>
                  <h4 className="text-xl font-bold text-white font-mono mt-1.5">
                    {selectedCompanyViolations.violationsList.filter(v => v.paymentStatus === 'مدفوعة' || v.paymentStatus === 'مدفوع').length} مخالفة
                  </h4>
                  <p className="text-[11px] text-emerald-400 font-bold mt-1">
                    بقيمة {formatCurrency(selectedCompanyViolations.violationsList.filter(v => v.paymentStatus === 'مدفوعة' || v.paymentStatus === 'مدفوع').reduce((s, v) => s + v.amount, 0))}
                  </p>
                </div>

                {/* Unpaid Violations Card */}
                <div className="p-4 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken border border-red-500/10">
                  <p className="text-slate-500 text-xs font-semibold">مخالفات غير مسددة / مرفوضة</p>
                  <h4 className="text-xl font-bold text-white font-mono mt-1.5">
                    {selectedCompanyViolations.violationsList.filter(v => v.paymentStatus === 'غير مدفوعة' || v.paymentStatus === 'مرفوضة' || v.paymentStatus.includes('غير')).length} مخالفة
                  </h4>
                  <p className="text-[11px] text-red-400 font-bold mt-1">
                    بقيمة {formatCurrency(selectedCompanyViolations.violationsList.filter(v => v.paymentStatus === 'غير مدفوعة' || v.paymentStatus === 'مرفوضة' || v.paymentStatus.includes('غير')).reduce((s, v) => s + v.amount, 0))}
                  </p>
                </div>

                {/* Objections Stats Card */}
                <div className="p-4 rounded-xl bg-[#0d121e] shadow-neumorphic-sunken border border-blue-500/10">
                  <p className="text-slate-500 text-xs font-semibold">قرارات الاعتراض</p>
                  <h4 className="text-xl font-bold text-white font-mono mt-1.5">
                    {selectedCompanyViolations.violationsList.filter(v => v.objectionStatus && v.objectionStatus !== '-').length} اعتراض
                  </h4>
                  <p className="text-[10px] text-blue-400 font-semibold mt-1 flex gap-2">
                    <span>مقبول: {selectedCompanyViolations.violationsList.filter(v => v.objectionStatus === 'مقبول').length}</span>
                    <span>|</span>
                    <span>مرفوض: {selectedCompanyViolations.violationsList.filter(v => v.objectionStatus === 'مرفوض').length}</span>
                  </p>
                </div>

              </div>

              {/* Table of all violations for this company */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-300">سجل المخالفات المفصل للمنشأة:</h4>
                <div className="overflow-x-auto rounded-xl">
                  <table className="w-full text-right text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#0d121e] border-b border-slate-800">
                        <th className="p-3 font-bold text-slate-300 text-xs">رقم المخالفة</th>
                        <th className="p-3 font-bold text-slate-300 text-xs">الجهة</th>
                        <th className="p-3 font-bold text-slate-300 text-xs font-mono">التاريخ</th>
                        <th className="p-3 font-bold text-slate-300 text-xs">المبلغ</th>
                        <th className="p-3 font-bold text-slate-300 text-xs">حالة السداد</th>
                        <th className="p-3 font-bold text-slate-300 text-xs">حالة الاعتراض</th>
                        <th className="p-3 font-bold text-slate-300 text-xs max-w-[200px]">وصف المخالفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {selectedCompanyViolations.violationsList.map((v, index) => (
                        <tr key={`v-list-${index}`} className="border-b border-slate-800/20">
                          <td className="p-3 font-bold text-amber-400 font-mono">{v.violationNumber}</td>
                          <td className="p-3 text-slate-300">{v.authority}</td>
                          <td className="p-3 text-slate-400 font-mono">{v.violationDate}</td>
                          <td className="p-3 font-bold text-red-400 font-mono">{formatCurrency(v.amount)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              v.paymentStatus === 'مدفوعة' || v.paymentStatus === 'مدفوع'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {v.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            {v.objectionStatus && v.objectionStatus !== '-' ? (
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                v.objectionStatus === 'مقبول'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {v.objectionStatus}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-semibold">-</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400 max-w-[200px] truncate" title={v.description}>
                            {v.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
