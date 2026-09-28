import React, { useState } from 'react';
import {
  Printer,
  FileText,
  Download,
  X,
  CheckCircle2,
  Calendar,
  Building,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Receipt,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Order, RestaurantProfile, Expense } from '../../types';
import {
  generateFinancialReportHTML,
  generateSalesReportHTML,
  downloadFinancialReportPDF,
  downloadSalesReportPDF,
  triggerFinancialReportPrint,
  triggerSalesReportPrint,
  downloadFinancialReportHTML,
  downloadSalesReportHTML,
  FinancialReportData,
} from '../../utils/financialReportPDF';

export type ReportDocType = 'financial' | 'sales';

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  expenses?: Expense[];
  profile: RestaurantProfile;
  periodLabel: string;
  initialType?: ReportDocType;
}

export const FinancialReportModal: React.FC<FinancialReportModalProps> = ({
  isOpen,
  onClose,
  orders,
  expenses = [],
  profile,
  periodLabel,
  initialType = 'financial',
}) => {
  const [activeType, setActiveType] = useState<ReportDocType>(initialType);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const reportData: FinancialReportData = {
    profile,
    orders,
    expenses,
    periodLabel,
    generatedBy: 'مدير الفرع / الإدارة المالية',
  };

  const htmlPreview =
    activeType === 'financial'
      ? generateFinancialReportHTML(reportData)
      : generateSalesReportHTML(reportData);

  // Direct PDF Download Handler
  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    setSuccessMessage(null);
    try {
      if (activeType === 'financial') {
        await downloadFinancialReportPDF(reportData);
      } else {
        await downloadSalesReportPDF(reportData);
      }
      setSuccessMessage('تم إنشاء ملف الـ PDF وتنزيله إلى جهازك بنجاح!');
      setTimeout(() => setSuccessMessage(null), 4500);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Browser Print / Save Dialog Handler
  const handlePrint = async () => {
    setIsPrinting(true);
    setSuccessMessage(null);
    try {
      if (activeType === 'financial') {
        await triggerFinancialReportPrint(reportData);
      } else {
        await triggerSalesReportPrint(reportData);
      }
      setSuccessMessage('تم إرسال أمر الطباعة بنجاح! يمكنك اختيار "حفظ بتنسيق PDF" من نافذة المتصفح.');
      setTimeout(() => setSuccessMessage(null), 4500);
    } catch (err) {
      console.error('Print trigger failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Standalone HTML Download
  const handleDownloadHTML = () => {
    if (activeType === 'financial') {
      downloadFinancialReportHTML(reportData);
    } else {
      downloadSalesReportHTML(reportData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-[#E8DFD5] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="p-4 sm:px-6 bg-[#FAF7F2] border-b border-[#E8DFD5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8B1E1E] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-[#231610]">
                  تصدير المستندات والتقارير المالية (PDF)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] text-[10px] font-extrabold">
                  {periodLabel}
                </span>
              </div>
              <p className="text-xs text-[#7A6455] mt-0.5">
                توليد وتنزيل ملفات PDF معتمدة للملخص المالي وحركة المبيعات وفق المعايير المحاسبية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Document Type Selector Tabs & Actions Header */}
        <div className="p-3 sm:px-6 bg-white border-b border-[#F0E8DD] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFD5] text-xs">
            <button
              onClick={() => setActiveType('financial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeType === 'financial'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>تقرير الملخص المالي وقائمة الدخل</span>
            </button>
            <button
              onClick={() => setActiveType('sales')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeType === 'sales'
                  ? 'bg-[#8B1E1E] text-white shadow-2xs'
                  : 'text-[#6F4E37] hover:bg-[#EAE0D2]'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>تقرير حركة وتفاصيل المبيعات ({orders.length})</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct PDF Download Button (Primary) */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-black hover:bg-[#721616] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="تنزيل ملف PDF قابل للتحميل فوراً وحفظه بالجهاز"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري إنشاء ملف PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف PDF مباشر</span>
                </>
              )}
            </button>

            {/* Native Browser Print / Save as PDF Dialog */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D7C3A5] bg-[#FFF8EF] text-[#6F4E37] text-xs font-bold hover:bg-[#F5EFE6] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
              title="طباعة مباشرة أو استخدام أمر الحفظ كـ PDF"
            >
              <Printer className="w-4 h-4 text-[#8B1E1E]" />
              <span>{isPrinting ? 'جاري الفتح...' : 'طباعة A4'}</span>
            </button>

            {/* Standalone HTML Fallback */}
            <button
              onClick={handleDownloadHTML}
              className="p-2 rounded-xl border border-[#D7C3A5] text-[#6F4E37] hover:bg-[#F5EFE6] transition-colors cursor-pointer"
              title="تنزيل المستند بنسخة HTML مستقلة"
            >
              <Download className="w-4 h-4 text-amber-700" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Document Preview Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#EBE5DC]">
          <div className="max-w-[820px] mx-auto bg-white rounded-xl shadow-lg border border-[#D7C3A5] overflow-hidden">
            <iframe
              title="معاينة المستند الرسمي"
              srcDoc={htmlPreview}
              className="w-full h-[620px] border-0"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 bg-[#FAF7F2] border-t border-[#E8DFD5] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-[#7A6455] text-[11px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              يمكنك الضغط على <strong>تحميل ملف PDF مباشر</strong> لحفظ المستند بصيغة PDF فوراً، أو استخدام <strong>طباعة A4</strong> للطباعة الورقية.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[#D7C3A5] text-[#6F4E37] text-xs font-bold hover:bg-white transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
