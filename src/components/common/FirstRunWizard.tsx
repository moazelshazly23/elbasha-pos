import React, { useState } from 'react';
import {
  Sparkles,
  Building,
  Image as ImageIcon,
  DollarSign,
  Percent,
  UserCheck,
  MapPin,
  Printer,
  Database,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { RestaurantProfile, Branch, User } from '../../types';
import { posDb } from '../../services/db';
import { BrandLogo } from '../common/BrandLogo';
import { windowsBridge } from '../../services/windowsBridge';

interface FirstRunWizardProps {
  onComplete: () => void;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 10;

  // Wizard State
  const [profileData, setProfileData] = useState<RestaurantProfile>(() => posDb.getProfile());
  const [adminUser, setAdminUser] = useState({
    name: 'المدير العام',
    username: 'admin',
    password: '123',
    pin: '1234',
  });
  const [mainBranch, setMainBranch] = useState({
    name: 'الفرع الرئيسي',
    address: 'شارع جامعة الدول العربية، المهندسين، الجيزة',
    phone: '01012345678',
  });
  const [selectedPrinter, setSelectedPrinter] = useState<string>('Xprinter XP-80C (Thermal 80mm)');
  const [printerTested, setPrinterTested] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isInitializingDb, setIsInitializingDb] = useState<boolean>(false);

  const stepsMeta = [
    { num: 1, title: 'الترحيب والبدء', icon: Sparkles },
    { num: 2, title: 'بيانات المطعم', icon: Building },
    { num: 3, title: 'الشعار والهوية', icon: ImageIcon },
    { num: 4, title: 'العملة والرمز', icon: DollarSign },
    { num: 5, title: 'الضرائب والخدمة', icon: Percent },
    { num: 6, title: 'حساب المدير', icon: UserCheck },
    { num: 7, title: 'تهيئة الفرع', icon: MapPin },
    { num: 8, title: 'إعداد الطابعات', icon: Printer },
    { num: 9, title: 'تهيئة البيانات', icon: Database },
    { num: 10, title: 'جاهز للانطلاق', icon: CheckCircle2 },
  ];

  const handleTestPrinter = async () => {
    const res = await windowsBridge.testPrinter(selectedPrinter, profileData.thermalPaperWidth === '58mm' ? '58mm' : '80mm');
    setPrinterTested(true);
    setTestResult(res.message);
  };

  const handleFinalize = () => {
    setIsInitializingDb(true);
    setTimeout(() => {
      // 1. Update Profile
      posDb.updateProfile({
        ...profileData,
        setupCompleted: true,
        receiptPrinterName: selectedPrinter,
      });

      // 2. Update Admin user credentials
      const users = posDb.getUsers();
      const admin = users.find((u) => u.role === 'admin') || users[0];
      if (admin) {
        admin.name = adminUser.name;
        admin.username = adminUser.username;
        admin.password = adminUser.password;
        admin.pin = adminUser.pin;
        posDb.saveUser(admin);
      }

      // 3. Update main branch
      const branches = posDb.getBranches();
      const main = branches.find((b) => b.isMain) || branches[0];
      if (main) {
        main.name = mainBranch.name;
        main.address = mainBranch.address;
        main.phone = mainBranch.phone;
        posDb.saveBranch(main);
      }

      windowsBridge.log('info', 'APP', 'اكتمل معالج التشغيل الأول (Setup Wizard) بنجاح');
      setIsInitializingDb(false);
      onComplete();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#231610]/85 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#D7C3A5] max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Wizard Top Banner */}
        <div className="bg-gradient-to-r from-[#8B1E1E] to-[#681212] text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-[#F5C451]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide">
                معالج التهيئة للتشغيل التجاري الأول
              </h2>
              <p className="text-xs text-amber-100/80">
                إعداد النظام المكتبي Windows POS خطوة بخطوة للعمل بالمطعم
              </p>
            </div>
          </div>

          <div className="text-left font-bold text-xs bg-black/25 px-3 py-1.5 rounded-xl border border-white/10">
            الخطوة {currentStep} من {totalSteps}
          </div>
        </div>

        {/* Step Progress Indicators */}
        <div className="bg-[#FFF8EF] border-b border-[#E8DFD5] px-4 py-2.5 flex items-center justify-between overflow-x-auto text-[11px] gap-2">
          {stepsMeta.map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0 transition-colors ${
                currentStep === s.num
                  ? 'bg-[#8B1E1E] text-white font-extrabold shadow-2xs'
                  : currentStep > s.num
                  ? 'text-emerald-800 font-bold bg-emerald-50'
                  : 'text-[#8C7665]'
              }`}
            >
              <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center bg-black/10 font-mono">
                {s.num}
              </span>
              <span>{s.title}</span>
            </div>
          ))}
        </div>

        {/* Step Content Area */}
        <div className="p-6 overflow-y-auto flex-1 text-[#231610]">
          {/* STEP 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-4 text-center py-6">
              <div className="flex justify-center mb-4">
                <BrandLogo size="lg" variant="full" customName={profileData.name} />
              </div>
              <h3 className="text-2xl font-black text-[#8B1E1E]">
                مرحباً بك في نظام {profileData.name} لإدارة المطاعم
              </h3>
              <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
                تم تثبيت تطبيق Windows التجاري بنجاح على هذا الجهاز. سنرشدك خلال 10 خطوات سريعة لتخصيص بيانات مطعمك، الشعار، الطابعات، وحساب المدير للبدء فوراً في تسجيل الطلبات.
              </p>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl max-w-lg mx-auto text-xs text-emerald-900 font-semibold text-right space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تأكيد جاهزية البيئة التشغيلية:</span>
                </div>
                <div>• وضع العمل: Windows Desktop Embedded (Offline-First)</div>
                <div>• مسار البيانات الآمن: %LOCALAPPDATA%\MosawyatAlBashaPOS</div>
                <div>• حماية Concurrency و Single-Instance مفعلة</div>
              </div>
            </div>
          )}

          {/* STEP 2: Restaurant Information */}
          {currentStep === 2 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-base font-extrabold text-[#8B1E1E] border-b pb-2">
                بيانات المطعم الأساسية
              </h3>
              <div>
                <label className="block text-xs font-bold mb-1">اسم المطعم (عربي) *</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">English Name</label>
                <input
                  type="text"
                  value={profileData.englishName}
                  onChange={(e) => setProfileData({ ...profileData, englishName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">الشعار اللفظي (Slogan)</label>
                <input
                  type="text"
                  value={profileData.slogan}
                  onChange={(e) => setProfileData({ ...profileData, slogan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">الرقم الضريبي (TRN)</label>
                  <input
                    type="text"
                    value={profileData.taxNumber}
                    onChange={(e) => setProfileData({ ...profileData, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Logo & Branding */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-base font-extrabold text-[#8B1E1E] border-b pb-2">
                شعار وهوية المطعم
              </h3>
              <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#D7C3A5] flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-xs border">
                  <BrandLogo size="md" variant="icon" />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#8B1E1E]">
                    <input
                      type="checkbox"
                      checked={profileData.useOfficialLogo}
                      onChange={(e) => setProfileData({ ...profileData, useOfficialLogo: e.target.checked })}
                    />
                    <span>استخدام الشعار الرسمي الافتراضي (مشويات الباشا الملكي)</span>
                  </label>
                  <p className="text-[11px] text-gray-500 mt-1">
                    يمكنك لاحقاً رفع شعار مطعمك المخصص في أي وقت من شاشة الإعدادات العامة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Currency */}
          {currentStep === 4 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-base font-extrabold text-[#8B1E1E] border-b pb-2">
                تحديد العملة المالية
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">اسم العملة المختصر</label>
                  <input
                    type="text"
                    value={profileData.currency}
                    onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">رمز العملة (Currency Code)</label>
                  <input
                    type="text"
                    value={profileData.currencySymbol}
                    onChange={(e) => setProfileData({ ...profileData, currencySymbol: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                    dir="ltr"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                أمثلة: (ج.م - EGP) أو (ر.س - SAR) أو (د.إ - AED) أو ($ - USD).
              </p>
            </div>
          )}

          {/* STEP 5: Tax & Service */}
          {currentStep === 5 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-base font-extrabold text-[#8B1E1E] border-b pb-2">
                الضرائب ورسوم الخدمة
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">ضريبة القيمة المضافة (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={profileData.defaultTaxPercent}
                    onChange={(e) => setProfileData({ ...profileData, defaultTaxPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">خدمة صالة الداخلي (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={profileData.defaultServicePercent}
                    onChange={(e) => setProfileData({ ...profileData, defaultServicePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Admin User */}
          {currentStep === 6 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-base font-extrabold text-[#8B1E1E] border-b pb-2">
                بيانات حساب المدير العام (Admin)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">اسم المدير</label>
                  <input
                    type="text"
                    value={adminUser.name}
                    onChange={(e) => setAdminUser({ ...adminUser, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">اسم المستخدم للدخول</label>
                  <input
                    type="text"
                    value={adminUser.username}
                    onChange={(e) => setAdminUser({ ...adminUser, username: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">كلمة المرور</label>
                  <input
                    type="text"
                    value={adminUser.password}
                    onChange={(e) => setAdminUser({ ...adminUser, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">رمز الدخول السريع (PIN 4 أرقام)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={adminUser.pin}
                    onChange={(e) => setAdminUser({ ...adminUser, pin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-center font-mono text-sm tracking-widest"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Branch Setup */}
          {currentStep === 7 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-base font-extrabold text-[#8B1E1E] border-b pb-2">
                بيانات الفرع الافتراضي
              </h3>
              <div>
                <label className="block text-xs font-bold mb-1">اسم الفرع</label>
                <input
                  type="text"
                  value={mainBranch.name}
                  onChange={(e) => setMainBranch({ ...mainBranch, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">عنوان الفرع</label>
                <input
                  type="text"
                  value={mainBranch.address}
                  onChange={(e) => setMainBranch({ ...mainBranch, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">هاتف الفرع</label>
                <input
                  type="tel"
                  value={mainBranch.phone}
                  onChange={(e) => setMainBranch({ ...mainBranch, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {/* STEP 8: Printer Setup */}
          {currentStep === 8 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-base font-extrabold text-[#8B1E1E] border-b pb-2">
                إعداد الطابعة الحرارية الافتراضية
              </h3>
              <div>
                <label className="block text-xs font-bold mb-1">اختر الطابعة المتصلة بنظام Windows</label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                >
                  {windowsBridge.getAvailablePrinters().map((pr) => (
                    <option key={pr} value={pr}>
                      {pr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">عرض الورق الحراري</label>
                <select
                  value={profileData.thermalPaperWidth}
                  onChange={(e) => setProfileData({ ...profileData, thermalPaperWidth: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white"
                >
                  <option value="80mm">80mm (القياس التجاري المعتمد)</option>
                  <option value="58mm">58mm (طابعة محمولة صغيرة)</option>
                </select>
              </div>

              <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#D7C3A5] space-y-2">
                <button
                  type="button"
                  onClick={handleTestPrinter}
                  className="px-4 py-2 bg-[#8B1E1E] text-white rounded-xl text-xs font-bold hover:bg-[#681212] transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>إرسال إيصال تجريبي لاختبار الطابعة الآن</span>
                </button>
                {testResult && (
                  <p className="text-xs text-emerald-800 font-bold">{testResult}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 9: Database Initialization */}
          {currentStep === 9 && (
            <div className="space-y-4 max-w-xl mx-auto text-center py-4">
              <div className="w-14 h-14 bg-amber-100 rounded-3xl mx-auto flex items-center justify-center text-[#8B1E1E] mb-2">
                <Database className="w-7 h-7 animate-bounce" />
              </div>
              <h3 className="text-lg font-extrabold text-[#231610]">
                تهيئة قاعدة البيانات المحلية (Local Embedded Storage)
              </h3>
              <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                يقوم النظام الآن بإنشاء وتأكيد جداول المنتجات، الأصناف، العملاء، وصفات الطهي، والورديات داخل مسار بيانات التطبيق في نظام Windows.
              </p>
              <div className="bg-[#F8F5F0] p-4 rounded-2xl border border-[#E8DFD5] text-xs text-right font-mono space-y-1">
                <div className="text-emerald-700">✓ فحص مسار %LOCALAPPDATA%\MosawyatAlBashaPOS... جاهز</div>
                <div className="text-emerald-700">✓ تهيئة محرك المعاملات الذري (Atomic Transactions)... جاهز</div>
                <div className="text-emerald-700">✓ تهيئة أقفال التسجيل (Single Instance Lock)... مفعل</div>
                <div className="text-emerald-700">✓ التحقق من توافق الطابعات والمخزون... ناجح</div>
              </div>
            </div>
          )}

          {/* STEP 10: Finish */}
          {currentStep === 10 && (
            <div className="space-y-4 max-w-xl mx-auto text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-[#8B1E1E]">
                اكتملت التهيئة بنجاح!
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                أصبح نظام <b>{profileData.name}</b> جاهزاً تماماً للعمل التجاري على شاشات نقاط البيع والكاشير والمطبخ.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 inline-block font-semibold">
                اسم المستخدم للمدير: <b>{adminUser.username}</b> | رمز PIN: <b>{adminUser.pin}</b>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="bg-[#F8F5F0] border-t border-[#E8DFD5] p-4 px-6 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#6F4E37] bg-white border border-[#D7C3A5] hover:bg-[#F5EFE6] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(totalSteps, prev + 1))}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#8B1E1E] hover:bg-[#681212] transition-colors shadow-xs"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isInitializingDb}
              onClick={handleFinalize}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-md animate-pulse"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isInitializingDb ? 'جاري الحفظ والتشغيل...' : 'إنهاء وبدء استخدام النظام الآن'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
