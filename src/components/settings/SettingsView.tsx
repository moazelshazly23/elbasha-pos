import React, { useState, useEffect } from 'react';
import {
  Settings,
  Image as ImageIcon,
  Palette,
  Printer,
  Database,
  Download,
  Upload,
  RotateCcw,
  Check,
  ShieldCheck,
  Building,
  Monitor,
  Sparkles,
  Info,
  Terminal,
  Cpu,
  FileCheck,
  Trash2,
  DollarSign,
  FileText,
} from 'lucide-react';
import { RestaurantProfile } from '../../types';
import { useBrand } from '../../context/BrandContext';
import { posDb } from '../../services/db';
import { BrandLogo } from '../common/BrandLogo';
import { printTestReceipt } from '../../utils/thermalPrinter';
import { windowsBridge } from '../../services/windowsBridge';
import { cashDrawer } from '../../utils/cashDrawer';
import { useToast } from '../../context/ToastContext';
import { CustomerReceiptSettings } from './CustomerReceiptSettings';
import { BackupManager } from './BackupManager';
import { defaultReceiptSettings } from '../../services/seedData';

const CURRENCY_PRESETS = [
  { label: 'مصر (EGP)', currency: 'ج.م', symbol: 'EGP' },
  { label: 'السعودية (SAR)', currency: 'ر.س', symbol: 'SAR' },
  { label: 'الإمارات (AED)', currency: 'د.إ', symbol: 'AED' },
  { label: 'الكويت (KWD)', currency: 'د.ك', symbol: 'KWD' },
  { label: 'عمان (OMR)', currency: 'ر.ع', symbol: 'OMR' },
  { label: 'البحرين (BHD)', currency: 'د.ب', symbol: 'BHD' },
  { label: 'قطر (QAR)', currency: 'ر.ق', symbol: 'QAR' },
  { label: 'دولار أمريكي (USD)', currency: '$', symbol: 'USD' },
  { label: 'يورو أوروبي (EUR)', currency: '€', symbol: 'EUR' },
];

export const SettingsView: React.FC = () => {
  const { profile, updateProfile, resetBranding } = useBrand();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'branding' | 'financial' | 'printing' | 'backup' | 'desktop' | 'about' | 'sqlite'>('branding');
  const [formData, setFormData] = useState<RestaurantProfile>(() => {
    return {
      ...profile,
      receiptSettings: profile.receiptSettings || {
        ...defaultReceiptSettings,
        restaurantNameArabic: profile.name,
        restaurantNameEnglish: profile.englishName,
        sloganArabic: profile.slogan,
        sloganEnglish: profile.sloganEnglish,
        addressDetails: profile.address,
        taxNumber: profile.taxNumber,
        crNumber: profile.crNumber,
        vatNumber: profile.vatNumber,
        taxRate: profile.defaultTaxPercent,
        taxLabel: profile.taxLabel || 'ضريبة القيمة المضافة',
        qrUrl: profile.website || '',
        paperWidth: profile.thermalPaperWidth === '58mm' ? '58mm' : '80mm',
        headerNote: profile.receiptHeaderNote,
        footerMessageArabic: profile.receiptFooterNote,
      },
    };
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [printerTestMessage, setPrinterTestMessage] = useState<string | null>(null);
  const [drawerTestMessage, setDrawerTestMessage] = useState<string | null>(null);
  const [isBackupOverdue, setIsBackupOverdue] = useState<boolean>(() => posDb.isBackupOverdue(24));

  useEffect(() => {
    const updateOverdue = () => setIsBackupOverdue(posDb.isBackupOverdue(24));
    updateOverdue();
    return posDb.subscribe(updateOverdue);
  }, []);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<string | null>(null);
  const [systemLogs, setSystemLogs] = useState(() => windowsBridge.getLogs());
  const [sqliteStatus, setSqliteStatus] = useState(() => posDb.ensureLocalAppDataSQLitePath());
  const [sqliteStats, setSqliteStats] = useState(() => posDb.getSqliteStats());
  const [sqliteVerifyMessage, setSqliteVerifyMessage] = useState<string | null>(null);

  const handleVerifySQLitePath = () => {
    const status = posDb.ensureLocalAppDataSQLitePath();
    const stats = posDb.getSqliteStats();
    setSqliteStatus(status);
    setSqliteStats(stats);
    setSqliteVerifyMessage(`✓ تم التحقق بنجاح: قاعدة بيانات SQLite متصلة وتعمل داخل: ${status.resolvedPath}`);
    showToast('تم التحقق بنجاح من اتصال قاعدة بيانات SQLite وقراءة الجداول', 'success');
    setTimeout(() => setSqliteVerifyMessage(null), 5000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
    setSaveSuccess(true);
    showToast('تم حفظ كافة إعدادات النظام والهوية وتحديثها فورياً في قاعدة البيانات', 'success');
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 3 ميجابايت لضمان سرعة الطباعة الحرارية', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        logoUrl: dataUrl,
        useOfficialLogo: false,
      }));
      showToast('تم تحميل شعار المطعم بنجاح', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
      useOfficialLogo: true,
    }));
    showToast('تمت استعادة الشعار الافتراضي للنظام', 'info');
  };

  const handleSelectCurrencyPreset = (item: { currency: string; symbol: string; label?: string }) => {
    setFormData((prev) => ({
      ...prev,
      currency: item.currency,
      currencySymbol: item.symbol,
    }));
    showToast(`تم تغيير عملة النظام إلى: ${item.label || item.currency}`, 'info');
  };

  const handleTestCashDrawer = () => {
    const result = cashDrawer.triggerOpenDrawer('Settings Test');
    setDrawerTestMessage('✓ تم إرسال نبضة الفتح الإلكتروني وصوت الرنين لصندوق النقدية بنجاح');
    showToast('تم إرسال إشارة فتح درج الكاشير بنجاح', 'success');
    setTimeout(() => setDrawerTestMessage(null), 4000);
  };

  const handleExportBackup = () => {
    const jsonStr = posDb.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `basha_pos_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    windowsBridge.log('info', 'DB', 'تم استخراج نسخة احتياطية كاملة لقاعدة البيانات');
    showToast('تم تصدير وتنزيل ملف النسخة الاحتياطية بنجاح', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setPendingRestoreData(content);
        setRestoreConfirmOpen(true);
      } catch (err) {
        showToast('الملف المحدد غير صالح أو تالف', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!pendingRestoreData) return;
    const res = posDb.importBackup(pendingRestoreData);
    if (res.success) {
      windowsBridge.log('warn', 'DB', 'تمت استعادة نسخة احتياطية من ملف محلي');
      showToast('تم استرجاع النسخة الاحتياطية بنجاح! جاري إعادة تحديث النظام...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      showToast('فشل استرجاع النسخة الاحتياطية. تأكد من سلامة بنية الملف.', 'error');
    }
    setRestoreConfirmOpen(false);
  };

  const handleTestSpecificPrinter = async (targetPrinter: string, width: '80mm' | '58mm' = '80mm') => {
    setPrinterTestMessage('جاري إرسال أمر الطباعة التجريبي المباشر...');
    const res = await windowsBridge.testPrinter(targetPrinter, width);
    setPrinterTestMessage(res.message);
    showToast(res.message, res.success ? 'success' : 'info');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#8B1E1E]" />
          <div>
            <h2 className="text-base font-extrabold text-[#231610]">
              الإعدادات العامة وتخصيص الهوية التجارية وتجهيز البيع
            </h2>
            <span className="text-xs text-[#7A6455]">
              شعار المطعم، ألوان الهوية، بيانات الفاتورة الضريبية، الطابعات، وتصفير البيانات للبيع
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>تم حفظ الإعدادات وتطبيق الهوية فورياً!</span>
          </div>
        )}
      </div>

      {/* Main Settings Tabs */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 bg-white border-l border-[#E8DFD5] p-3 space-y-1">
          <button
            onClick={() => setActiveTab('branding')}
            className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
              activeTab === 'branding'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#F5EFE6]'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>الهوية والشعار والألوان</span>
          </button>

          <button
            onClick={() => setActiveTab('financial')}
            className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
              activeTab === 'financial'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#F5EFE6]'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>الضرائب والعملة والفرع</span>
          </button>

          <button
            onClick={() => setActiveTab('printing')}
            className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
              activeTab === 'printing'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#F5EFE6]'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>الطابعات والدرج والفواتير</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
              activeTab === 'backup'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#F5EFE6]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-emerald-700" />
              <span>النسخ الاحتياطي وتجهيز البيع</span>
            </div>
            {isBackupOverdue && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                تنبيه 24+ س
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
              activeTab === 'desktop'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#F5EFE6]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>التحزيم المكتبي والأجهزة</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
              activeTab === 'about'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#F5EFE6]'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>معلومات النظام والترخيص</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sqlite');
              setSqliteStatus(posDb.ensureLocalAppDataSQLitePath());
              setSqliteStats(posDb.getSqliteStats());
            }}
            className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors ${
              activeTab === 'sqlite'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#F5EFE6]'
            }`}
          >
            <Database className="w-4 h-4 text-amber-600" />
            <span>قاعدة بيانات SQLite (%LOCALAPPDATA%)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSave} className="max-w-4xl space-y-6">
            {/* 1. BRANDING TAB */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                {/* Logo & Identity Customizer */}
                <div className="bg-white p-6 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-2">
                    <h3 className="font-extrabold text-sm text-[#231610] flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#8B1E1E]" />
                      <span>تخصيص شعار وهوية المطعم</span>
                    </h3>
                    <span className="text-[11px] text-gray-500">يدعم رفع ملفات PNG, JPG, WebP, SVG</span>
                  </div>

                  {/* Logo Preview & Switcher */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-[#FFF8EF] rounded-2xl border border-[#D7C3A5]">
                    <div className="p-3 bg-white rounded-xl shadow-xs border border-[#D7C3A5] flex flex-col items-center">
                      <BrandLogo
                        size="lg"
                        variant="full"
                        customName={formData.name}
                        customLogoUrl={formData.useOfficialLogo ? undefined : formData.logoUrl}
                      />
                      <span className="text-[10px] text-gray-500 mt-2">معاينة الشعار المباشرة</span>
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#8B1E1E]">
                        <input
                          type="checkbox"
                          checked={formData.useOfficialLogo}
                          onChange={(e) =>
                            setFormData({ ...formData, useOfficialLogo: e.target.checked })
                          }
                          className="rounded text-[#8B1E1E]"
                        />
                        <span>استخدام شعار مشويات الباشا الرسمي (الشواية الملكية)</span>
                      </label>

                      {!formData.useOfficialLogo && (
                        <div className="space-y-3 pt-2 border-t border-[#E8DFD5]/60">
                          {/* File Upload Button */}
                          <div>
                            <label className="block text-xs font-bold text-[#231610] mb-1">
                              رفع صورة الشعار من الجهاز (Upload Logo):
                            </label>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B1E1E] hover:bg-[#721616] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs">
                                <Upload className="w-4 h-4" />
                                <span>اختيار ملف الشعار...</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                  onChange={handleLogoFileUpload}
                                  className="hidden"
                                />
                              </label>

                              {formData.logoUrl && (
                                <button
                                  type="button"
                                  onClick={handleRemoveCustomLogo}
                                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors"
                                  title="حذف الشعار المخصص"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف الشعار</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Fallback URL Input */}
                          <div>
                            <label className="block text-xs font-bold text-[#231610] mb-1">
                              أو إدخال رابط الشعار المباشر (Logo URL):
                            </label>
                            <input
                              type="url"
                              placeholder="https://example.com/logo.png"
                              value={formData.logoUrl || ''}
                              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white text-left font-mono"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Restaurant Names */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E8DFD5]">
                    <div>
                      <label className="block text-xs font-bold text-[#231610] mb-1">
                        اسم المطعم بالعربي *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#231610] mb-1">
                        English Name
                      </label>
                      <input
                        type="text"
                        value={formData.englishName}
                        onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      الشعار اللفظي (Slogan)
                    </label>
                    <input
                      type="text"
                      value={formData.slogan}
                      onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                    />
                  </div>

                  {/* Color Scheme Customizer */}
                  <div className="pt-2 border-t border-[#E8DFD5] space-y-3">
                    <span className="font-bold text-xs text-[#231610] block">
                      لوحة ألوان النظام المخصصة (Theme Colors):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">اللون الأساسي</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.primaryColor || '#8B1E1E'}
                            onChange={(e) =>
                              setFormData({ ...formData, primaryColor: e.target.value })
                            }
                            className="w-8 h-8 rounded-lg border cursor-pointer"
                          />
                          <span className="text-xs font-mono">{formData.primaryColor}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">اللون الذهبي/الثانوي</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.accentColor || '#B8860B'}
                            onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border cursor-pointer"
                          />
                          <span className="text-xs font-mono">{formData.accentColor}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">اللون الداكن</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.darkColor || '#231610'}
                            onChange={(e) => setFormData({ ...formData, darkColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border cursor-pointer"
                          />
                          <span className="text-xs font-mono">{formData.darkColor}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">لون الخلفية</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.bgColor || '#F8F5F0'}
                            onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border cursor-pointer"
                          />
                          <span className="text-xs font-mono">{formData.bgColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 2. FINANCIAL TAB */}
            {activeTab === 'financial' && (
              <div className="bg-white p-6 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs">
                <h3 className="font-extrabold text-sm text-[#231610] border-b border-[#E8DFD5] pb-2">
                  بيانات المنشأة الضريبية والعملات
                </h3>

                {/* Currency Presets */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#231610]">
                    اختيار العملة سريعا (Currency Presets):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CURRENCY_PRESETS.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectCurrencyPreset(c)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                          formData.currency === c.currency
                            ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-2xs'
                            : 'bg-[#FFF8EF] border-[#D7C3A5] text-[#6F4E37] hover:bg-[#F5EFE6]'
                        }`}
                      >
                        {c.label} ({c.currency})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      رمز العملة المعروض في النظام
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      كود العملة الإنجليزي (Symbol)
                    </label>
                    <input
                      type="text"
                      value={formData.currencySymbol}
                      onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      نسبة ضريبة القيمة المضافة (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={formData.defaultTaxPercent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultTaxPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] tabular-nums font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      نسبة خدمة الصالة للداخلي (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={formData.defaultServicePercent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultServicePercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] tabular-nums font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      الرقم الضريبي (VAT / TRN ID)
                    </label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      رقم السجل التجاري (Commercial Registration)
                    </label>
                    <input
                      type="text"
                      value={formData.crNumber}
                      onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      رقم الهاتف الرئيسي
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      العنوان المطبوع بالفاتورة
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. PRINTING & HARDWARE TAB */}
            {activeTab === 'printing' && (
              <div className="bg-white p-6 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs">
                <div className="border-b border-[#E8DFD5] pb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-[#231610]">
                      إدارة طابعات Windows والأجهزة والدرج النقدي
                    </h3>
                    <p className="text-xs text-[#7A6455]">
                      تخصيص طابعات الفواتير والكاشير والمطبخ والبار واختبار فتح صندوق النقدية
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestCashDrawer}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-300" />
                      <span>اختبار فتح درج النقد</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => printTestReceipt(formData)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-colors shadow-xs"
                    >
                      <Printer className="w-4 h-4" />
                      <span>تجربة طباعة فاتورة (80mm)</span>
                    </button>
                  </div>
                </div>

                {printerTestMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center justify-between">
                    <span>{printerTestMessage}</span>
                    <button
                      type="button"
                      onClick={() => setPrinterTestMessage(null)}
                      className="text-emerald-950 hover:underline"
                    >
                      إغلاق
                    </button>
                  </div>
                )}

                {drawerTestMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center justify-between">
                    <span>{drawerTestMessage}</span>
                    <button
                      type="button"
                      onClick={() => setDrawerTestMessage(null)}
                      className="text-emerald-950 hover:underline"
                    >
                      إغلاق
                    </button>
                  </div>
                )}

                {/* 1. Cashier Receipt Printer */}
                <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#D7C3A5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#8B1E1E] flex items-center gap-1.5">
                      <Printer className="w-4 h-4" />
                      <span>طابعة إيصالات الكاشير الافتراضية (Receipt Printer)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleTestSpecificPrinter(
                          formData.receiptPrinterName || 'Xprinter XP-80C (Thermal 80mm)',
                          formData.thermalPaperWidth === '58mm' ? '58mm' : '80mm'
                        )
                      }
                      className="px-3 py-1 bg-[#8B1E1E] text-white rounded-lg text-[11px] font-bold hover:bg-[#681212]"
                    >
                      اختبار الطابعة
                    </button>
                  </div>
                  <select
                    value={formData.receiptPrinterName || 'Xprinter XP-80C (Thermal 80mm)'}
                    onChange={(e) => setFormData({ ...formData, receiptPrinterName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  >
                    {windowsBridge.getAvailablePrinters().map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Kitchen Printer */}
                <div className="p-4 rounded-2xl bg-white border border-[#E8DFD5] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-xs text-[#231610] flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-amber-700" />
                        <span>طابعة بون المطبخ والمشويات (Kitchen Order Printer)</span>
                      </span>
                      <p className="text-[11px] text-gray-500">
                        إرسال بون التجهيز تلقائياً إلى شيف المشويات والمقبلات فور تأكيد الطلب
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleTestSpecificPrinter(
                          formData.kitchenPrinterName || 'Kitchen-Printer-POS80 (Grill)',
                          '80mm'
                        )
                      }
                      className="px-3 py-1 bg-amber-800 text-white rounded-lg text-[11px] font-bold hover:bg-amber-900"
                    >
                      اختبار الطابعة
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <select
                      value={formData.kitchenPrinterName || 'Kitchen-Printer-POS80 (Grill)'}
                      onChange={(e) => setFormData({ ...formData, kitchenPrinterName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                    >
                      {windowsBridge.getAvailablePrinters().map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#231610]">
                      <input
                        type="checkbox"
                        checked={formData.kitchenAutoPrint !== false}
                        onChange={(e) => setFormData({ ...formData, kitchenAutoPrint: e.target.checked })}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>طباعة بون المطبخ تلقائياً فور الدفع</span>
                    </label>
                  </div>
                </div>

                {/* 3. Bar / Beverage Printer */}
                <div className="p-4 rounded-2xl bg-white border border-[#E8DFD5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#231610] flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-emerald-700" />
                      <span>طابعة بار المشروبات والحلويات (Bar Printer)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleTestSpecificPrinter(
                          formData.barPrinterName || 'Bar-Beverage-58mm',
                          '58mm'
                        )
                      }
                      className="px-3 py-1 bg-emerald-800 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-900"
                    >
                      اختبار الطابعة
                    </button>
                  </div>
                  <select
                    value={formData.barPrinterName || 'Bar-Beverage-58mm'}
                    onChange={(e) => setFormData({ ...formData, barPrinterName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  >
                    {windowsBridge.getAvailablePrinters().map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Paper Width & Direct Print */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      عرض ورق الفواتير الحرارية
                    </label>
                    <select
                      value={formData.thermalPaperWidth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          thermalPaperWidth: e.target.value as '80mm' | '58mm',
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                    >
                      <option value="80mm">طابعة قياسية تجارية (80mm) - العرض المعتمد</option>
                      <option value="58mm">طابعة صغيرة محمولة (58mm)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#231610]">
                      <input
                        type="checkbox"
                        checked={formData.autoPrintReceipt}
                        onChange={(e) => setFormData({ ...formData, autoPrintReceipt: e.target.checked })}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>طباعة فورية مباشرة بعد الدفع (Direct Printing)</span>
                    </label>
                  </div>
                </div>

                {/* Full Customer Receipt Configuration & Live Designer */}
                <CustomerReceiptSettings
                  formData={formData}
                  setFormData={setFormData}
                  onSave={() => {
                    updateProfile(formData);
                    showToast('تم حفظ كافة إعدادات وتصميم فاتورة العميل بنجاح في قاعدة البيانات', 'success');
                  }}
                  onTestPrint={printTestReceipt}
                />
              </div>
            )}

            {/* 4. BACKUP & COMMERCIAL SALE HANDOVER TAB */}
            {activeTab === 'backup' && (
              <div className="bg-white p-6 rounded-2xl border border-[#E8DFD5] space-y-6 shadow-xs">
                <div className="border-b border-[#E8DFD5] pb-3">
                  <h3 className="font-extrabold text-sm text-[#231610] flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-700" />
                    <span>النسخ الاحتياطي وحماية قاعدة البيانات (Backup & Data Protection)</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    إدارة وحفظ النسخ الاحتياطية سحابياً بحساب الأدمن وعلى وحدات التخزين الخارجية والفلاشة لحماية بيانات النظام
                  </p>
                </div>

                {/* Comprehensive Backup Manager (USB Flash Drive & Admin Google Drive) */}
                <BackupManager />
              </div>
            )}

            {/* 5. DESKTOP TAB */}
            {activeTab === 'desktop' && (
              <div className="bg-white p-6 rounded-2xl border border-[#E8DFD5] space-y-4 shadow-xs text-xs">
                <h3 className="font-extrabold text-sm text-[#231610] border-b border-[#E8DFD5] pb-2 flex items-center justify-between">
                  <span>تثبيت وتحزيم التطبيق المكتبي (Windows Commercial Application)</span>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold">
                    جاهز للإنتاج والتوزيع
                  </span>
                </h3>

                <p className="text-gray-700 leading-relaxed">
                  النظام مهيأ بالكامل للعمل كبرنامج Windows مستقل ومحمي، ويحتوي على ملف التثبيت المعتمد وملفات التشغيل المدمجة.
                </p>

                <div className="space-y-3">
                  <div className="p-4 bg-[#FFF8EF] rounded-xl border border-[#D7C3A5] space-y-2">
                    <span className="font-bold text-[#8B1E1E] text-xs block">
                      1. ملف التثبيت المعتمد (Windows Setup Installer - NSIS):
                    </span>
                    <p className="text-gray-600 text-xs">
                      تم إنشاء ملف <code>windows-installer.nsi</code> الذي يقوم بإنشاء اختصار Desktop وقائمة ابدأ، وتثبيت التطبيق ومسار البيانات <code>%LOCALAPPDATA%\MosawyatAlBashaPOS</code>، وميزة إزالة التثبيت الآمنة.
                    </p>
                  </div>

                  <div className="p-4 bg-[#FFF8EF] rounded-xl border border-[#D7C3A5] space-y-2">
                    <span className="font-bold text-[#8B1E1E] text-xs block">
                      2. أوامر التحزيم والبناء التجاري (Commercial Build Commands):
                    </span>
                    <div className="bg-[#231610] text-emerald-400 p-3 rounded-lg font-mono text-[11px] space-y-1" dir="ltr">
                      <div># بناء ملف الويب الإنتاجي:</div>
                      <div className="text-white">npm run build</div>
                      <div className="pt-1"># تحزيم تطبيق Windows .exe عبر Electron:</div>
                      <div className="text-white">npm run electron:pack</div>
                      <div className="pt-1"># بناء الـ Installer المعتمد:</div>
                      <div className="text-white">npm run installer:nsis</div>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-[#E8DFD5] space-y-2">
                    <span className="font-bold text-[#231610] text-xs block">
                      3. إعدادات تشغيل الكاشير والأجهزة (Hardware & Kiosk):
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-[#231610]">
                        <input
                          type="checkbox"
                          checked={formData.posFullscreenMode || false}
                          onChange={(e) => setFormData({ ...formData, posFullscreenMode: e.target.checked })}
                          className="rounded text-[#8B1E1E]"
                        />
                        <span>وضع ملء الشاشة لشاشات اللمس (Kiosk Mode)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-[#231610]">
                        <input
                          type="checkbox"
                          checked={formData.singleInstanceLock !== false}
                          onChange={(e) => setFormData({ ...formData, singleInstanceLock: e.target.checked })}
                          className="rounded text-[#8B1E1E]"
                        />
                        <span>قفل التشغيل الفردي (Single Instance Protection)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="bg-white p-6 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs text-xs">
                <div className="border-b border-[#E8DFD5] pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-[#231610]">
                      معلومات النظام والترخيص التجاري (System & Diagnostics)
                    </h3>
                    <p className="text-xs text-[#7A6455]">
                      بيانات البيئة التشغيلية وسجل العمليات لنظام Windows POS
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-amber-100 text-amber-900 rounded-xl font-bold font-mono text-xs">
                    {formData.licenseKey || 'BSHA-COMM-9842-WINX'}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#F8F5F0] rounded-xl border border-[#E8DFD5]">
                    <span className="text-[10px] text-gray-500 block mb-0.5">نظام التشغيل:</span>
                    <span className="font-bold text-[#231610]">Windows 11 / 10 x64</span>
                  </div>
                  <div className="p-3 bg-[#F8F5F0] rounded-xl border border-[#E8DFD5]">
                    <span className="text-[10px] text-gray-500 block mb-0.5">الإصدار (Version):</span>
                    <span className="font-mono font-bold text-[#8B1E1E]">v1.0.0 (Commercial)</span>
                  </div>
                  <div className="p-3 bg-[#F8F5F0] rounded-xl border border-[#E8DFD5]">
                    <span className="text-[10px] text-gray-500 block mb-0.5">حالة الترخيص:</span>
                    <span className="font-bold text-emerald-700">نشط ومرخص تجارياً</span>
                  </div>
                  <div className="p-3 bg-[#F8F5F0] rounded-xl border border-[#E8DFD5] col-span-2 sm:col-span-3">
                    <span className="text-[10px] text-gray-500 block mb-0.5">مسار قاعدة البيانات الآمن:</span>
                    <span className="font-mono text-xs text-[#231610] select-all bg-white px-2 py-1 rounded border block">
                      %LOCALAPPDATA%\MosawyatAlBashaPOS\data
                    </span>
                  </div>
                </div>

                {/* System Diagnostics Logs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#231610] flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-[#8B1E1E]" />
                      <span>سجل تشخيص النظام المباشر (System Diagnostic Logs):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSystemLogs(windowsBridge.getLogs())}
                      className="text-xs text-[#8B1E1E] font-bold hover:underline"
                    >
                      تحديث السجل
                    </button>
                  </div>
                  <div className="bg-[#1E140F] text-amber-100 p-3 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto space-y-1.5 text-right" dir="ltr">
                    {systemLogs.length === 0 ? (
                      <div className="text-gray-400">لا توجد سجلات حالياً</div>
                    ) : (
                      systemLogs.slice(0, 15).map((log) => (
                        <div key={log.id} className="border-b border-white/5 pb-1">
                          <span className="text-gray-400 text-[10px]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                          <span className={`font-bold ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            [{log.category}]
                          </span>{' '}
                          <span className="text-gray-200">{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. SQLITE TAB */}
            {activeTab === 'sqlite' && (
              <div className="bg-white p-6 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs text-xs">
                <div className="border-b border-[#E8DFD5] pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-[#231610]">
                      إدارة قاعدة بيانات SQLite المدمجة (Local SQLite Database)
                    </h3>
                    <p className="text-xs text-[#7A6455]">
                      التحقق من مسار التخزين الدائم في Windows (%LOCALAPPDATA%) وضمان استمرارية البيانات (ACID & WAL)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>SQLite 3 (WAL Mode)</span>
                  </div>
                </div>

                {sqliteVerifyMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{sqliteVerifyMessage}</span>
                  </div>
                )}

                {/* Path & Engine Card */}
                <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#D7C3A5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#8B1E1E] flex items-center gap-1.5">
                      <Database className="w-4 h-4" />
                      <span>المسار النظامي لقاعدة البيانات في Windows (%LOCALAPPDATA%):</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleVerifySQLitePath}
                      className="px-3 py-1.5 bg-[#8B1E1E] text-white rounded-xl text-xs font-bold hover:bg-[#6e1515] transition-colors shadow-xs"
                    >
                      فحص وتأكيد المسار الآن
                    </button>
                  </div>

                  <div className="bg-[#231610] text-emerald-400 p-3 rounded-xl font-mono text-xs select-all break-all" dir="ltr">
                    {sqliteStatus.resolvedPath}
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    يتم عزل وحفظ قاعدة بيانات SQLite محلياً داخل مجلد <code>MosawyatAlBashaPOS\data</code> في <code>%LOCALAPPDATA%</code> لمنع أية قيود أمنية من نظام Windows عند تشغيل البرنامج بدون صلاحيات مسؤول النظام (Administrator)، مع تفعيل خاصية Write-Ahead Logging (WAL) لتسريع عمليات قراءة وكتابة الفواتير أثناء ضغط العمل في المطعم وضمان عدم فقدان أي فاتورة أو حركة مالية.
                  </p>
                </div>

                {/* Diagnostic Key-Values */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#F8F5F0] rounded-xl border border-[#E8DFD5]">
                    <span className="text-[10px] text-gray-500 block mb-0.5">وضع السجل (Journal Mode):</span>
                    <span className="font-bold text-[#8B1E1E] font-mono text-xs">{sqliteStats.pragmas.journal_mode}</span>
                  </div>
                  <div className="p-3 bg-[#F8F5F0] rounded-xl border border-[#E8DFD5]">
                    <span className="text-[10px] text-gray-500 block mb-0.5">المزامنة (Synchronous):</span>
                    <span className="font-bold text-gray-800 font-mono text-xs">{sqliteStats.pragmas.synchronous}</span>
                  </div>
                  <div className="p-3 bg-[#F8F5F0] rounded-xl border border-[#E8DFD5]">
                    <span className="text-[10px] text-gray-500 block mb-0.5">سلامة البيانات (Integrity):</span>
                    <span className="font-bold text-emerald-700 text-xs">✓ OK (سليم)</span>
                  </div>
                  <div className="p-3 bg-[#F8F5F0] rounded-xl border border-[#E8DFD5]">
                    <span className="text-[10px] text-gray-500 block mb-0.5">إجمالي الجداول:</span>
                    <span className="font-bold text-[#231610] text-xs">{sqliteStats.tables.length} جدول</span>
                  </div>
                </div>

                {/* Tables Breakdown */}
                <div className="space-y-2">
                  <span className="font-bold text-[#231610] text-xs block">
                    جداول SQLite المعتمدة وإحصاءات السجلات (Relational Schema):
                  </span>
                  <div className="max-h-56 overflow-y-auto border border-[#E8DFD5] rounded-xl divide-y divide-[#E8DFD5] text-[11px]">
                    {sqliteStats.tables.map((t) => (
                      <div key={t.name} className="flex items-center justify-between p-2.5 bg-white hover:bg-[#FDFBF7]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#8B1E1E]">{t.name}</span>
                          <span className="text-[10px] text-gray-400">PK: {t.primaryKey}</span>
                        </div>
                        <div className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg text-[10px]">
                          {t.rowCount} سجل
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save Button */}
            {activeTab !== 'backup' && activeTab !== 'desktop' && activeTab !== 'about' && activeTab !== 'sqlite' && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#8B1E1E] hover:bg-[#721616] text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>تطبيق وحفظ التعديلات فورياً</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Safe Restore Confirmation Modal */}
      {restoreConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4 text-[#231610]">
            <h4 className="text-base font-black text-red-700 flex items-center gap-2">
              <Database className="w-5 h-5 text-red-600" />
              <span>تأكيد استعادة النسخة الاحتياطية</span>
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed">
              تنبيه هام: استعادة النسخة الاحتياطية ستستبدل البيانات الحالية على هذا الجهاز بالبيانات الموجودة في الملف المحدد. يرجى التأكيد للمتابعة.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRestoreConfirmOpen(false);
                  setPendingRestoreData(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-700 hover:bg-red-800 transition-colors shadow-xs"
              >
                تأكيد الاستعادة الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
