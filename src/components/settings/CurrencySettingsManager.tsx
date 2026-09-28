import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Coins,
  RefreshCw,
  TrendingUp,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Sliders,
  Eye,
  Save,
  Plus,
  Trash2,
  Search,
  Percent,
  Sparkles,
  Info,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { CurrencyInfo, MultiCurrencySettings, Product, RestaurantProfile } from '../../types';
import {
  currencyService,
  defaultMultiCurrencySettings,
  DEFAULT_SUPPORTED_CURRENCIES,
} from '../../services/currencyService';
import { posDb } from '../../services/db';
import { useToast } from '../../context/ToastContext';

interface CurrencySettingsManagerProps {
  profile: RestaurantProfile;
  onProfileUpdated?: (updated: RestaurantProfile) => void;
}

export const CurrencySettingsManager: React.FC<CurrencySettingsManagerProps> = ({
  profile,
  onProfileUpdated,
}) => {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<MultiCurrencySettings>(() =>
    currencyService.getSettings(profile)
  );

  const [products, setProducts] = useState<Product[]>(() =>
    posDb.getProducts({ includeArchived: true })
  );

  // Conversion Tool State
  const [conversionMode, setConversionMode] = useState<'rate' | 'percent'>('rate');
  const [targetCurrencyCode, setTargetCurrencyCode] = useState<string>('SAR');
  const [customRate, setCustomRate] = useState<number>(0.076);
  const [percentAdjustment, setPercentAdjustment] = useState<number>(10); // +10%
  const [roundingRule, setRoundingRule] = useState<'none' | 'decimal2' | 'ceil' | 'round5' | 'round10'>('round5');
  const [alsoUpdateCost, setAlsoUpdateCost] = useState<boolean>(false);
  const [excludedProductIds, setExcludedProductIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<string | null>(null);

  // New Custom Currency Modal/State
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [newCurrency, setNewCurrency] = useState<Partial<CurrencyInfo>>({
    code: '',
    nameAr: '',
    nameEn: '',
    symbolAr: '',
    symbolEn: '',
    exchangeRate: 1.0,
    isActive: true,
  });

  // Calculate Effective Conversion Multiplier
  const effectiveMultiplier = useMemo(() => {
    if (conversionMode === 'rate') {
      return customRate > 0 ? customRate : 1;
    } else {
      return 1 + (percentAdjustment || 0) / 100;
    }
  }, [conversionMode, customRate, percentAdjustment]);

  // Sync customRate when targetCurrencyCode changes
  useEffect(() => {
    const target = settings.supportedCurrencies.find((c) => c.code === targetCurrencyCode);
    if (target && target.exchangeRate > 0) {
      setCustomRate(target.exchangeRate);
    }
  }, [targetCurrencyCode, settings.supportedCurrencies]);

  // Preview List of Updated Product Prices
  const productPreview = useMemo(() => {
    return products.map((p) => {
      const isExcluded = excludedProductIds.includes(p.id);
      const calculatedPrice = isExcluded
        ? p.price
        : currencyService.applyPriceRounding(p.price * effectiveMultiplier, roundingRule);

      const calculatedCost = isExcluded
        ? p.costPrice
        : alsoUpdateCost
        ? currencyService.applyPriceRounding((p.costPrice || 0) * effectiveMultiplier, roundingRule)
        : p.costPrice || 0;

      const diff = calculatedPrice - p.price;
      const diffPercent = p.price > 0 ? ((diff / p.price) * 100).toFixed(1) : '0';

      return {
        product: p,
        isExcluded,
        calculatedPrice,
        calculatedCost,
        diff,
        diffPercent,
      };
    });
  }, [products, excludedProductIds, effectiveMultiplier, roundingRule, alsoUpdateCost]);

  const filteredPreview = useMemo(() => {
    if (!searchFilter.trim()) return productPreview;
    const q = searchFilter.toLowerCase();
    return productPreview.filter(
      (item) =>
        item.product.nameAr.toLowerCase().includes(q) ||
        item.product.sku?.toLowerCase().includes(q)
    );
  }, [productPreview, searchFilter]);

  const handleToggleExclude = (productId: string) => {
    setExcludedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAllExclude = () => {
    if (excludedProductIds.length === products.length) {
      setExcludedProductIds([]);
    } else {
      setExcludedProductIds(products.map((p) => p.id));
    }
  };

  // Save Currency Settings
  const handleSaveSettings = () => {
    currencyService.saveSettings(settings);
    setSaveSuccessBanner('✓ تم حفظ إعدادات العملات وأسعار الصرف بنجاح!');
    showToast('تم حفظ إعدادات العملات بنجاح', 'success');
    if (onProfileUpdated) {
      onProfileUpdated({
        ...profile,
        currency: settings.baseSymbol,
        currencySymbol: settings.baseCurrency,
        multiCurrencySettings: settings,
      });
    }
    setTimeout(() => setSaveSuccessBanner(null), 4500);
  };

  // Change Base Currency
  const handleSetBaseCurrency = (code: string) => {
    const updatedCurrencies = settings.supportedCurrencies.map((c) => ({
      ...c,
      isBase: c.code === code,
    }));
    const newBase = updatedCurrencies.find((c) => c.code === code);
    const newSettings: MultiCurrencySettings = {
      ...settings,
      baseCurrency: code,
      baseSymbol: newBase?.symbolAr || code,
      supportedCurrencies: updatedCurrencies,
    };
    setSettings(newSettings);
    currencyService.saveSettings(newSettings);
    showToast(`تم تعيين العملة الأساسية إلى: ${newBase?.nameAr} (${code})`, 'info');
  };

  // Update Exchange Rate for a currency
  const handleUpdateExchangeRate = (code: string, newRate: number) => {
    const updatedCurrencies = settings.supportedCurrencies.map((c) =>
      c.code === code ? { ...c, exchangeRate: newRate, lastUpdated: new Date().toISOString() } : c
    );
    const newSettings = { ...settings, supportedCurrencies: updatedCurrencies };
    setSettings(newSettings);
  };

  // Toggle active currency
  const handleToggleActiveCurrency = (code: string) => {
    const updatedCurrencies = settings.supportedCurrencies.map((c) =>
      c.code === code && !c.isBase ? { ...c, isActive: !c.isActive } : c
    );
    setSettings({ ...settings, supportedCurrencies: updatedCurrencies });
  };

  // Apply Batch Price Updates to Database
  const handleExecutePriceUpdate = () => {
    setIsApplying(true);
    try {
      const targetCurrency = settings.supportedCurrencies.find((c) => c.code === targetCurrencyCode);
      const reason =
        conversionMode === 'rate'
          ? `تحويل الأسعار إلى عملة ${targetCurrency?.nameAr || targetCurrencyCode} بمعامل صرف (${effectiveMultiplier.toFixed(4)})`
          : `تعديل الأسعار بنسبة (${percentAdjustment > 0 ? `+${percentAdjustment}` : percentAdjustment}%) لمواكبة تغير أسعار الصرف`;

      const result = currencyService.batchUpdateProductPrices({
        conversionMultiplier: effectiveMultiplier,
        rounding: roundingRule,
        updateCostPrice: alsoUpdateCost,
        excludedProductIds,
        userId: 'admin',
        userName: 'المدير العام',
        reasonDescription: reason,
      });

      // Reload products from posDb
      setProducts(posDb.getProducts({ includeArchived: true }));
      setIsConfirmModalOpen(false);
      setSaveSuccessBanner(
        `✓ تم بنجاح تحديث وتعديل أسعار ${result.updatedCount} صنف في قائمة الطعام وفقاً لمعامل الصرف والتقريب!`
      );
      showToast(`تم تحديث أسعار ${result.updatedCount} صنف في قاعدة البيانات`, 'success');
      setTimeout(() => setSaveSuccessBanner(null), 6000);
    } catch (err) {
      console.error('Batch price update failed:', err);
      showToast('حدث خطأ أثناء تحديث أسعار المنتجات', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Add Custom Currency
  const handleAddCustomCurrency = () => {
    if (!newCurrency.code || !newCurrency.nameAr || !newCurrency.symbolAr) {
      showToast('يرجى ملء جميع حقول العملة المطلوبة', 'error');
      return;
    }
    const cleanCode = newCurrency.code.trim().toUpperCase();
    if (settings.supportedCurrencies.some((c) => c.code === cleanCode)) {
      showToast('كود العملة موجود بالفعل في النظام', 'error');
      return;
    }

    const created: CurrencyInfo = {
      code: cleanCode,
      nameAr: newCurrency.nameAr.trim(),
      nameEn: newCurrency.nameEn?.trim() || cleanCode,
      symbolAr: newCurrency.symbolAr.trim(),
      symbolEn: newCurrency.symbolEn?.trim() || cleanCode,
      exchangeRate: newCurrency.exchangeRate && newCurrency.exchangeRate > 0 ? newCurrency.exchangeRate : 1.0,
      isBase: false,
      isActive: true,
      roundingRule: 'decimal2',
      lastUpdated: new Date().toISOString(),
    };

    const updated = {
      ...settings,
      supportedCurrencies: [...settings.supportedCurrencies, created],
    };
    setSettings(updated);
    currencyService.saveSettings(updated);
    setShowAddCurrency(false);
    setNewCurrency({ code: '', nameAr: '', nameEn: '', symbolAr: '', symbolEn: '', exchangeRate: 1.0 });
    showToast(`تمت إضافة عملة ${created.nameAr} (${created.code}) بنجاح`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Notification */}
      {saveSuccessBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessBanner}</span>
          </div>
          <button
            onClick={() => setSaveSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* SECTION 1: Base Currency & POS Display Settings */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8DFD5] shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DFD5] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center shadow-2xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#231610]">
                العملة الأساسية وإعدادات العرض في نقطة البيع
              </h3>
              <p className="text-xs text-[#7A6455]">
                تحديد العملة الرسمية للمطعم وتفعيل إظهار السعر التقديري بالعملات الأخرى للزبائن
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-black hover:bg-[#721616] transition-all shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ إعدادات العملات</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Base Currency Selection */}
          <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E8DFD5] space-y-2">
            <label className="block text-xs font-bold text-[#231610]">
              العملة الأساسية المعتمدة للمطعم (Base Currency):
            </label>
            <select
              value={settings.baseCurrency}
              onChange={(e) => handleSetBaseCurrency(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold text-[#8B1E1E]"
            >
              {settings.supportedCurrencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameAr} ({c.code} - {c.symbolAr})
                </option>
              ))}
            </select>
            <span className="text-[11px] text-[#7A6455] block">
              جميع الأسعار والحسابات والتقارير المالية الأساسية تسجل بهذه العملة.
            </span>
          </div>

          {/* Secondary Currency in POS */}
          <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E8DFD5] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#231610]">
                إظهار عملة ثانوية في شاشة الكاشير والفاتورة:
              </label>
              <input
                type="checkbox"
                checked={settings.allowSecondaryCurrencyInPOS}
                onChange={(e) =>
                  setSettings({ ...settings, allowSecondaryCurrencyInPOS: e.target.checked })
                }
                className="w-4 h-4 accent-[#8B1E1E] cursor-pointer"
              />
            </div>
            {settings.allowSecondaryCurrencyInPOS && (
              <div className="pt-2 flex items-center gap-2">
                <span className="text-xs text-[#7A6455] shrink-0">العملة الثانوية المعروضة:</span>
                <select
                  value={settings.secondaryCurrencyCode || 'USD'}
                  onChange={(e) =>
                    setSettings({ ...settings, secondaryCurrencyCode: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                >
                  {settings.supportedCurrencies
                    .filter((c) => c.code !== settings.baseCurrency && c.isActive)
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.nameAr} ({c.symbolAr})
                      </option>
                    ))}
                </select>
              </div>
            )}
            <span className="text-[11px] text-[#7A6455] block">
              مثال في شاشة الكاشير: <strong className="text-[#231610]">150 ج.م (≈ $3.08)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Supported Currencies & Exchange Rates Table */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8DFD5] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DFD5] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] flex items-center justify-center shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#231610]">
                قائمة العملات المدعومة وأسعار الصرف الحالية
              </h3>
              <p className="text-xs text-[#7A6455]">
                سعر صرف 1 وحدة من العملة الأساسية ({settings.baseSymbol}) مقابل كل عملة
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddCurrency(!showAddCurrency)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D7C3A5] bg-[#FAF7F2] text-[#6F4E37] text-xs font-bold hover:bg-[#F0E8DD] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#8B1E1E]" />
            <span>إضافة عملة جديدة</span>
          </button>
        </div>

        {/* Add Custom Currency Form */}
        {showAddCurrency && (
          <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#D7C3A5] space-y-3 animate-in fade-in">
            <h4 className="font-extrabold text-xs text-[#8B1E1E]">إضافة عملة مخصصة للنظام</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#231610] mb-1">كود العملة (ISO)</label>
                <input
                  type="text"
                  placeholder="مثال: GBP"
                  value={newCurrency.code}
                  onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#D7C3A5] bg-white font-mono uppercase"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#231610] mb-1">الاسم بالعربي</label>
                <input
                  type="text"
                  placeholder="جنيه إسترليني"
                  value={newCurrency.nameAr}
                  onChange={(e) => setNewCurrency({ ...newCurrency, nameAr: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#D7C3A5] bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#231610] mb-1">الرمز (Symbol)</label>
                <input
                  type="text"
                  placeholder="£"
                  value={newCurrency.symbolAr}
                  onChange={(e) => setNewCurrency({ ...newCurrency, symbolAr: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#D7C3A5] bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#231610] mb-1">سعر الصرف (1 {settings.baseSymbol} = )</label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="0.016"
                  value={newCurrency.exchangeRate}
                  onChange={(e) =>
                    setNewCurrency({ ...newCurrency, exchangeRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#D7C3A5] bg-white tabular-nums font-mono"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAddCurrency(false)}
                className="px-3 py-1.5 rounded-xl border border-[#D7C3A5] text-xs font-bold text-[#6F4E37] bg-white"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddCustomCurrency}
                className="px-4 py-1.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616]"
              >
                حفظ وإضافة العملة
              </button>
            </div>
          </div>
        )}

        {/* Currencies Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E8DFD5]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E8DFD5] text-[#6F4E37] font-bold">
              <tr>
                <th className="p-3">العملة والرمز</th>
                <th className="p-3">كود ISO</th>
                <th className="p-3">سعر الصرف (1 {settings.baseSymbol} = )</th>
                <th className="p-3">المعكوس التقريبي</th>
                <th className="p-3 text-center">النوع</th>
                <th className="p-3 text-center">التفعيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E8DD]">
              {settings.supportedCurrencies.map((c) => {
                const reciprocal = c.exchangeRate > 0 ? (1 / c.exchangeRate).toFixed(2) : '0';
                return (
                  <tr key={c.code} className={c.isBase ? 'bg-[#FFF8EF] font-bold' : 'hover:bg-[#FAF7F2]'}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-white border border-[#D7C3A5] flex items-center justify-center font-bold text-[#8B1E1E]">
                          {c.symbolAr}
                        </span>
                        <div>
                          <span className="font-extrabold text-[#231610]">{c.nameAr}</span>
                          <span className="text-[10px] text-[#7A6455] block">{c.nameEn}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#231610]">{c.code}</td>
                    <td className="p-3">
                      {c.isBase ? (
                        <span className="text-emerald-700 font-extrabold text-xs">1.0000 (العملة الأساسية)</span>
                      ) : (
                        <div className="flex items-center gap-1.5 max-w-[130px]">
                          <input
                            type="number"
                            step="0.0001"
                            min="0.00001"
                            value={c.exchangeRate}
                            onChange={(e) =>
                              handleUpdateExchangeRate(c.code, parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 text-xs rounded-lg border border-[#D7C3A5] bg-white tabular-nums font-mono"
                            dir="ltr"
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-[#7A6455] tabular-nums font-mono text-[11px]">
                      {c.isBase ? '—' : `1 ${c.symbolAr} ≈ ${reciprocal} ${settings.baseSymbol}`}
                    </td>
                    <td className="p-3 text-center">
                      {c.isBase ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#8B1E1E] text-white">
                          رئيسية
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                          ثانوية
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {c.isBase ? (
                        <span className="text-gray-400 text-[11px]">مفعلة دائماً</span>
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={c.isActive}
                            onChange={() => handleToggleActiveCurrency(c.code)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#8B1E1E]"></div>
                        </label>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Product Price Updating & Conversion Tool */}
      <div className="bg-linear-to-b from-[#FFF8EF] to-white p-5 sm:p-6 rounded-2xl border-2 border-[#D7C3A5] shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DFD5] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#8B1E1E] text-white flex items-center justify-center shadow-xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#231610]">
                  أداة تحديث أسعار المنتجات بناءً على العملة وسعر الصرف
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                  {products.length} صنف بالقائمة
                </span>
              </div>
              <p className="text-xs text-[#7A6455] mt-0.5">
                تطبيق أسعار الصرف وتحويل أسعار كافة وجبات المشويات والأصناف دفعة واحدة مع معاينة دقيقة قبل الحفظ
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsConfirmModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-black hover:bg-[#721616] transition-all shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تطبيق وتحديث أسعار الأصناف في النظام</span>
          </button>
        </div>

        {/* Converter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-[#E8DFD5]">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-[#231610] mb-1">طريقة التحديث:</label>
            <select
              value={conversionMode}
              onChange={(e) => setConversionMode(e.target.value as 'rate' | 'percent')}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FAF7F2] font-bold"
            >
              <option value="rate">سعر صرف عملة محددة (Exchange Rate)</option>
              <option value="percent">نسبة مئوية لتغير الأسعار (Percentage %)</option>
            </select>
          </div>

          {/* Target Currency or Percent */}
          {conversionMode === 'rate' ? (
            <div>
              <label className="block text-xs font-bold text-[#231610] mb-1">العملة المستهدفة وسعر الصرف:</label>
              <div className="flex items-center gap-1.5">
                <select
                  value={targetCurrencyCode}
                  onChange={(e) => setTargetCurrencyCode(e.target.value)}
                  className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FAF7F2] font-bold"
                >
                  {settings.supportedCurrencies
                    .filter((c) => c.code !== settings.baseCurrency)
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.nameAr} ({c.code})
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  step="0.0001"
                  value={customRate}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                  className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-[#D7C3A5] tabular-nums font-mono text-center font-bold"
                  placeholder="المعامل"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-[#231610] mb-1">نسبة التعديل المئوية (%):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  value={percentAdjustment}
                  onChange={(e) => setPercentAdjustment(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] tabular-nums font-bold"
                  placeholder="مثال: 15 (لزيادة 15%)"
                />
                <span className="text-xs font-bold text-[#7A6455]">%</span>
              </div>
            </div>
          )}

          {/* Rounding Rule */}
          <div>
            <label className="block text-xs font-bold text-[#231610] mb-1">قاعدة التقريب الذكي:</label>
            <select
              value={roundingRule}
              onChange={(e) =>
                setRoundingRule(e.target.value as 'none' | 'decimal2' | 'ceil' | 'round5' | 'round10')
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FAF7F2] font-bold"
            >
              <option value="round5">تقريب تجاري لأقرب 5 وحدات (مثال: 142 ← 145)</option>
              <option value="round10">تقريب تجاري لأقرب 10 وحدات (مثال: 142 ← 150)</option>
              <option value="ceil">تقريب لأعلى رقم صحيح (Ceil Integer)</option>
              <option value="decimal2">تقريب عادي لخانة عشرية (.00)</option>
              <option value="none">بدون تقريب (القيمة الدقيقة)</option>
            </select>
          </div>

          {/* Options: Also convert cost price? */}
          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={alsoUpdateCost}
                onChange={(e) => setAlsoUpdateCost(e.target.checked)}
                className="w-4 h-4 accent-[#8B1E1E] cursor-pointer"
              />
              <span className="text-xs font-bold text-[#231610]">
                تحديث أسعار التكلفة أيضاً (Cost Price)
              </span>
            </label>
            <span className="text-[10px] text-[#7A6455] mr-6">
              لحساب هامش الربح بنفس نسبة العملة الجديدة.
            </span>
          </div>
        </div>

        {/* Live Preview Header with Search & Filter */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#231610]">معاينة الأسعار المحسوبة قبل التطبيق:</span>
              <span className="text-xs text-[#7A6455]">
                (المعامل المطبق: <strong className="text-[#8B1E1E] font-mono">×{effectiveMultiplier.toFixed(4)}</strong>)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث في الأصناف..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pr-8 pl-3 py-1.5 text-xs rounded-xl border border-[#D7C3A5] bg-white w-44"
                />
              </div>

              <button
                onClick={handleSelectAllExclude}
                className="px-2.5 py-1.5 rounded-xl border border-[#D7C3A5] text-[11px] font-bold text-[#6F4E37] bg-white hover:bg-[#FAF7F2]"
              >
                {excludedProductIds.length === products.length ? 'تضمين الكل' : 'استثناء الكل'}
              </button>
            </div>
          </div>

          {/* Product Prices Preview Table */}
          <div className="max-h-72 overflow-y-auto rounded-xl border border-[#E8DFD5] bg-white">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] border-b border-[#E8DFD5] text-[#6F4E37] font-bold sticky top-0">
                <tr>
                  <th className="p-2.5 text-center w-10">تضمين</th>
                  <th className="p-2.5">اسم الصنف / الوجبة</th>
                  <th className="p-2.5 text-left">السعر الحالي</th>
                  <th className="p-2.5 text-left">السعر الجديد المحسوب</th>
                  <th className="p-2.5 text-left">التكلفة (حالية ← جديدة)</th>
                  <th className="p-2.5 text-center">التغيير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E8DD]">
                {filteredPreview.map((item) => {
                  const isInc = !item.isExcluded;
                  return (
                    <tr
                      key={item.product.id}
                      className={item.isExcluded ? 'bg-gray-50 opacity-60' : 'hover:bg-[#FFF8EF]/50'}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isInc}
                          onChange={() => handleToggleExclude(item.product.id)}
                          className="w-4 h-4 accent-[#8B1E1E] cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5">
                        <span className="font-extrabold text-[#231610]">{item.product.nameAr}</span>
                        {item.product.sku && (
                          <span className="text-[10px] text-[#7A6455] block font-mono">
                            {item.product.sku}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-left font-mono font-bold text-[#6F4E37]">
                        {item.product.price.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-left font-mono font-black text-emerald-800">
                        {item.isExcluded ? (
                          <span className="text-gray-400">{item.product.price.toFixed(2)} (مستثنى)</span>
                        ) : (
                          <span>{item.calculatedPrice.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-left font-mono text-[11px] text-[#7A6455]">
                        {(item.product.costPrice || 0).toFixed(1)} ←{' '}
                        <strong className="text-[#231610]">{item.calculatedCost.toFixed(1)}</strong>
                      </td>
                      <td className="p-2.5 text-center">
                        {item.isExcluded ? (
                          <span className="text-gray-400 text-[10px]">مستثنى</span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.diff >= 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.diff >= 0 ? `+${item.diffPercent}%` : `${item.diffPercent}%`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#E8DFD5] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-[#8B1E1E]">
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#8B1E1E]" />
              </div>
              <div>
                <h3 className="font-black text-base text-[#231610]">تأكيد تحديث أسعار القائمة</h3>
                <p className="text-xs text-[#7A6455]">تعديل جماعي مباشر لقاعدة بيانات المنتجات</p>
              </div>
            </div>

            <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#D7C3A5] text-xs text-[#3E2723] space-y-2">
              <p className="font-bold">
                أنت على وشك تحديث أسعار{' '}
                <strong className="text-[#8B1E1E] text-sm">
                  {products.length - excludedProductIds.length} صنف
                </strong>{' '}
                بناءً على:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#6F4E37]">
                <li>معامل التحويل المطبق: <strong>×{effectiveMultiplier.toFixed(4)}</strong></li>
                <li>قاعدة التقريب: <strong>{roundingRule}</strong></li>
                <li>تحديث أسعار التكلفة: <strong>{alsoUpdateCost ? 'نعم' : 'لا'}</strong></li>
                <li>الأصناف المستثناة: <strong>{excludedProductIds.length} صنف</strong></li>
              </ul>
              <p className="text-[10px] text-[#8B1E1E] font-bold pt-1">
                * سيتم تسجيل هذه العملية تلقائياً في سجل الرقابة والتدقيق (Audit Logs).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isApplying}
                className="px-4 py-2 rounded-xl border border-[#D7C3A5] text-xs font-bold text-[#6F4E37] hover:bg-[#FAF7F2]"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={handleExecutePriceUpdate}
                disabled={isApplying}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-black hover:bg-[#721616] transition-all shadow-xs disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد وتحديث الأسعار الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
