import React, { useState } from 'react';
import {
  AlertTriangle,
  Package,
  Plus,
  Check,
  CheckCircle2,
  X,
  Printer,
  TrendingDown,
  ShoppingBag,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  Search,
  Filter,
} from 'lucide-react';
import { Product, Ingredient, RestaurantProfile } from '../../types';
import { posDb } from '../../services/db';
import { useToast } from '../../context/ToastContext';

export interface ReorderItem {
  id: string;
  name: string;
  type: 'product' | 'ingredient';
  category?: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  costPrice: number;
  suggestedReorderQty: number;
  deficit: number;
  isOutOfStock: boolean;
}

interface ReorderPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  reorderItems: ReorderItem[];
  profile: RestaurantProfile;
  onNavigateToTab?: (tab: string) => void;
  onStockUpdated?: () => void;
}

export const ReorderPointModal: React.FC<ReorderPointModalProps> = ({
  isOpen,
  onClose,
  reorderItems,
  profile,
  onNavigateToTab,
  onStockUpdated,
}) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'ingredients'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickRestockQuantities, setQuickRestockQuantities] = useState<Record<string, number>>({});
  const [restockingId, setRestockingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = reorderItems.filter((item) => {
    if (activeTab === 'products' && item.type !== 'product') return false;
    if (activeTab === 'ingredients' && item.type !== 'ingredient') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.category && item.category.toLowerCase().includes(q));
    }
    return true;
  });

  const outOfStockCount = reorderItems.filter((i) => i.isOutOfStock).length;
  const criticalCount = reorderItems.length - outOfStockCount;

  // Handle Quick Restock on the fly
  const handleQuickRestock = async (item: ReorderItem) => {
    const qty = quickRestockQuantities[item.id] || item.suggestedReorderQty;
    if (qty <= 0) {
      showToast('يرجى إدخال كمية توريد صحيحة أكبر من الصفر', 'error');
      return;
    }

    setRestockingId(item.id);
    try {
      if (item.type === 'product') {
        posDb.adjustProductStock(
          item.id,
          qty,
          'توريد سريع - حد إعادة الطلب',
          'استجابة لتنبيه حد إعادة الطلب من لوحة القيادة',
          'admin',
          'المدير العام'
        );
      } else {
        posDb.adjustStock(
          item.id,
          qty,
          'توريد سريع - حد إعادة الطلب',
          'استجابة لتنبيه حد إعادة الطلب من لوحة القيادة',
          'admin',
          'المدير العام'
        );
      }

      showToast(`تم توريد وإضافة ${qty} ${item.unit} إلى رصيد [${item.name}] بنجاح`, 'success');

      // Clear input
      setQuickRestockQuantities((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

      if (onStockUpdated) {
        onStockUpdated();
      }
    } catch (err) {
      console.error('Restock error:', err);
      showToast('حدث خطأ أثناء تحديث الرصيد', 'error');
    } finally {
      setRestockingId(null);
    }
  };

  // Trigger Print Purchase Requisition / Reorder Sheet
  const handlePrintReorderSheet = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { dateStyle: 'full' });
    const timeStr = now.toLocaleTimeString('ar-EG', { timeStyle: 'short' });

    const rowsHtml = reorderItems
      .map(
        (item, index) => `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.type === 'product' ? 'منتج جاهز' : 'مادة خام'}</td>
        <td style="text-align: center; color: ${item.isOutOfStock ? '#dc2626' : '#d97706'}; font-weight: bold;">
          ${item.currentStock} ${item.unit}
        </td>
        <td style="text-align: center;">${item.minStock} ${item.unit}</td>
        <td style="text-align: center; font-weight: bold; background: #fff8ef;">
          ${item.suggestedReorderQty} ${item.unit}
        </td>
        <td style="text-align: left;">${(item.suggestedReorderQty * (item.costPrice || 0)).toFixed(2)} ${profile.currency}</td>
        <td style="border: 1px dashed #ccc;"></td>
      </tr>
    `
      )
      .join('');

    const printHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>أمر شراء وتوريد نواقص المخزون - ${profile.name}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Cairo', sans-serif; direction: rtl; font-size: 10pt; color: #231610; margin: 0; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #8B1E1E; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 14pt; font-weight: 900; color: #8B1E1E; }
            table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 10px; }
            th { background: #f5efe6; border: 1px solid #d7c3a5; padding: 6px; text-align: right; }
            td { border: 1px solid #e8dfd5; padding: 5px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt; }
            .sign { margin-top: 30px; display: flex; justify-content: space-between; font-size: 9pt; }
            .sign-box { text-align: center; width: 150px; border-top: 1px solid #333; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${profile.name} - أمر شراء وتوريد نواقص المخزون</div>
              <div style="font-size: 8.5pt; color: #666;">كشف الأصناف التي بلغت حد إعادة الطلب (Reorder Point Sheet)</div>
            </div>
            <div style="text-align: left; font-size: 8.5pt; color: #555;">
              <div><strong>تاريخ الإصدار:</strong> ${dateStr}</div>
              <div><strong>التوقيت:</strong> ${timeStr}</div>
              <div><strong>عدد الأصناف:</strong> ${reorderItems.length} صنف</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th style="width: 25%;">اسم الصنف / المادة</th>
                <th style="width: 12%;">النوع</th>
                <th style="width: 12%; text-align: center;">الرصيد الحالي</th>
                <th style="width: 12%; text-align: center;">حد إعادة الطلب</th>
                <th style="width: 14%; text-align: center;">الكمية المقترحة</th>
                <th style="width: 12%; text-align: left;">التكلفة التقديرية</th>
                <th style="width: 8%; text-align: center;">التوريد</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="sign">
            <div class="sign-box">إعداد مسؤول المخزن</div>
            <div class="sign-box">مدير المشتريات</div>
            <div class="sign-box">اعتماد المدير العام</div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1500);
      }, 400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E8DFD5] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-4 sm:px-6 bg-linear-to-l from-red-50 via-[#FFF8EF] to-white border-b border-[#E8DFD5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-[#231610]">
                  نظام تنبيهات حد إعادة الطلب (Reorder Point Alert Center)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
                  {reorderItems.length} صنف حرج
                </span>
              </div>
              <p className="text-xs text-[#7A6455] mt-0.5">
                قائمة المنتجات والمواد الخام التي هبط رصيدها عن حد الأمان وإعادة الطلب المقترح
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReorderSheet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D7C3A5] bg-white text-[#6F4E37] text-xs font-bold hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              title="طباعة أمر الشراء وكشف النواقص"
            >
              <Printer className="w-3.5 h-3.5 text-[#8B1E1E]" />
              <span>طباعة كشف النواقص</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Highlights & Filter Tabs Bar */}
        <div className="p-3 sm:px-6 bg-[#FAF7F2] border-b border-[#E8DFD5] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E8DFD5] text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#F5EFE6]'
              }`}
            >
              الكل ({reorderItems.length})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#F5EFE6]'
              }`}
            >
              المنتجات ({reorderItems.filter((i) => i.type === 'product').length})
            </button>
            <button
              onClick={() => setActiveTab('ingredients')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'ingredients'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#F5EFE6]'
              }`}
            >
              المواد الخام ({reorderItems.filter((i) => i.type === 'ingredient').length})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث في النواقص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8 pl-3 py-1 text-xs rounded-xl border border-[#D7C3A5] bg-white w-48 font-bold"
            />
          </div>

          {/* Severity Counters */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-extrabold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
              <span>نفاد تام: {outOfStockCount}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold">
              تحت حد الطلب: {criticalCount}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8F5F0]">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E8DFD5] p-6 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600 mb-2" />
              <p className="font-extrabold text-sm text-[#231610]">كافة المنتجات فوق حد الأمان وإعادة الطلب!</p>
              <p className="text-xs text-[#7A6455] mt-1">المستودع ومخزون المطبخ في وضع مستقر ومكتمل.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8DFD5] overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E8DFD5] text-[#6F4E37] font-bold">
                  <tr>
                    <th className="p-3">اسم الصنف والتصنيف</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3 text-center">الرصيد الحالي</th>
                    <th className="p-3 text-center">حد إعادة الطلب</th>
                    <th className="p-3 text-center">العجز / المقترح للطلب</th>
                    <th className="p-3 text-center">توريد فوري مباشر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E8DD]">
                  {filteredItems.map((item) => {
                    const currentRestockQty =
                      quickRestockQuantities[item.id] !== undefined
                        ? quickRestockQuantities[item.id]
                        : item.suggestedReorderQty;

                    return (
                      <tr
                        key={item.id}
                        className={item.isOutOfStock ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-[#FFF8EF]/50'}
                      >
                        <td className="p-3">
                          <div className="font-extrabold text-[#231610] text-sm">{item.name}</div>
                          <div className="text-[11px] text-[#7A6455] flex items-center gap-1.5 mt-0.5">
                            {item.category && <span>{item.category}</span>}
                            {item.isOutOfStock ? (
                              <span className="text-[10px] font-black text-red-700 bg-red-100 px-1.5 py-0.2 rounded-sm">
                                نفد من المخزون
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-sm">
                                بلغ حد إعادة الطلب
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.type === 'product'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.type === 'product' ? 'منتج جاهز' : 'مادة خام'}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <div
                            className={`font-black text-sm tabular-nums ${
                              item.isOutOfStock ? 'text-red-700' : 'text-amber-700'
                            }`}
                          >
                            {item.currentStock} {item.unit}
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mt-1 overflow-hidden">
                            <div
                              className={`h-full ${item.isOutOfStock ? 'bg-red-600' : 'bg-amber-500'}`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  item.minStock > 0 ? (item.currentStock / item.minStock) * 100 : 0
                                )}%`,
                              }}
                            />
                          </div>
                        </td>

                        <td className="p-3 text-center font-bold text-[#6F4E37] tabular-nums">
                          {item.minStock} {item.unit}
                        </td>

                        <td className="p-3 text-center">
                          <div className="font-black text-[#8B1E1E] tabular-nums">
                            +{item.suggestedReorderQty} {item.unit}
                          </div>
                          <span className="text-[10px] text-[#7A6455] block">
                            (عجز: {item.deficit.toFixed(1)} {item.unit})
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              value={currentRestockQty}
                              onChange={(e) =>
                                setQuickRestockQuantities({
                                  ...quickRestockQuantities,
                                  [item.id]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 px-2 py-1 text-xs rounded-lg border border-[#D7C3A5] bg-white text-center font-bold tabular-nums"
                            />
                            <button
                              onClick={() => handleQuickRestock(item)}
                              disabled={restockingId === item.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8B1E1E] text-white text-[11px] font-bold hover:bg-[#721616] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                              title="إضافة الكمية للرصيد فوراً"
                            >
                              {restockingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              <span>توريد</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 bg-[#FAF7F2] border-t border-[#E8DFD5] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-[#7A6455] text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
            <span>
              حد إعادة الطلب (Reorder Point) هو الحد الأدنى للرصيد الذي يجب عنده عمل أمر توريد لتجنب توقف المبيعات.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToTab && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToTab('inventory');
                }}
                className="px-3.5 py-1.5 rounded-xl border border-[#D7C3A5] bg-white text-[#6F4E37] text-xs font-bold hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                فتح شاشة إدارة المخزون الكاملة ←
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
