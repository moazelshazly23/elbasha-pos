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
  ExternalLink,
} from 'lucide-react';
import { Order, RestaurantProfile, Expense } from '../../types';
import {
  generateFinancialReportHTML,
  triggerFinancialReportPrint,
  downloadFinancialReportHTML,
  FinancialReportData,
} from '../../utils/financialReportPDF';

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  expenses?: Expense[];
  profile: RestaurantProfile;
  periodLabel: string;
}

export const FinancialReportModal: React.FC<FinancialReportModalProps> = ({
  isOpen,
  onClose,
  orders,
  expenses = [],
  profile,
  periodLabel,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  if (!isOpen) return null;

  const reportData: FinancialReportData = {
    profile,
    orders,
    expenses,
    periodLabel,
    generatedBy: 'مدير الفرع / الإدارة المالية',
  };

  const htmlPreview = generateFinancialReportHTML(reportData);

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintSuccess(false);
    try {
      await triggerFinancialReportPrint(reportData);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = () => {
    downloadFinancialReportHTML(
      reportData,
      `تقرير_مالي_${periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E8DFD5] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="p-4 sm:px-6 bg-[#FAF7F2] border-b border-[#E8DFD5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8B1E1E] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-[#231610]">
                  تصدير التقرير المالي الرسمي (PDF Documentation)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] text-[10px] font-extrabold">
                  {periodLabel}
                </span>
              </div>
              <p className="text-xs text-[#7A6455] mt-0.5">
                مستند معتمد A4 قابل للطباعة المباشرة أو الحفظ بتنسيق PDF للمراجعة المحاسبية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls Header */}
        <div className="p-3 sm:px-6 bg-white border-b border-[#F0E8DD] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#6F4E37]">
            <span className="font-bold">حجم البيانات:</span>
            <span className="font-extrabold text-[#8B1E1E]">{orders.length} طلب</span>
            <span>•</span>
            <span>الفرع: <strong className="text-[#231610]">{profile.name}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D7C3A5] bg-[#FFF8EF] text-[#6F4E37] text-xs font-bold hover:bg-[#F5EFE6] transition-colors"
              title="تحميل نسخة المستند المستقلة بصيغة HTML"
            >
              <Download className="w-4 h-4 text-amber-700" />
              <span>تحميل المستند</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-black hover:bg-[#721616] transition-all shadow-xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'جاري تجهيز الطباعة...' : 'تصدير وحفظ كـ PDF (أمر الطباعة)'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {printSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs text-emerald-800 font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم إرسال أمر الطباعة بنجاح! يمكنك اختيار "حفظ بتنسيق PDF" (Save as PDF) من نافذة المتصفح.</span>
            </div>
          </div>
        )}

        {/* Document Preview Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#EBE5DC]">
          <div className="max-w-[780px] mx-auto bg-white rounded-xl shadow-lg border border-[#D7C3A5] overflow-hidden">
            <iframe
              title="معاينة التقرير المالي"
              srcDoc={htmlPreview}
              className="w-full h-[620px] border-0"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 bg-[#FAF7F2] border-t border-[#E8DFD5] flex items-center justify-between text-xs shrink-0">
          <div className="text-[#7A6455] text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>نصيحة: من نافذة الطباعة المنبثقة، اختر الوجهة (Destination) كـ "Save as PDF" لحفظ التقرير إلكترونياً.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[#D7C3A5] text-[#6F4E37] text-xs font-bold hover:bg-white transition-colors"
          >
            إغلاق المعاينة
          </button>
        </div>
      </div>
    </div>
  );
};
