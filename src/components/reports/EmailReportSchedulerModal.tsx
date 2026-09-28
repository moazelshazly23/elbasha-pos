import React, { useState } from 'react';
import {
  Mail,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  FileText,
  Download,
  Settings2,
  History,
  ShieldCheck,
  User,
  AtSign,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  ReportScheduleConfig,
  ReportScheduleLog,
  RestaurantProfile,
  Order,
  Expense,
  ReportScheduleFrequency,
  ReportContentType,
} from '../../types';
import {
  reportSchedulerService,
  DEFAULT_SCHEDULE_CONFIG,
} from '../../services/reportSchedulerService';
import { FinancialReportData } from '../../utils/financialReportPDF';

interface EmailReportSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RestaurantProfile;
  orders: Order[];
  expenses: Expense[];
  periodLabel: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد (Sunday)' },
  { value: 1, label: 'الإثنين (Monday)' },
  { value: 2, label: 'الثلاثاء (Tuesday)' },
  { value: 3, label: 'الأربعاء (Wednesday)' },
  { value: 4, label: 'الخميس (Thursday)' },
  { value: 5, label: 'الجمعة (نهاية الأسبوع)' },
  { value: 6, label: 'السبت (Saturday)' },
];

export const EmailReportSchedulerModal: React.FC<EmailReportSchedulerModalProps> = ({
  isOpen,
  onClose,
  profile,
  orders,
  expenses,
  periodLabel,
}) => {
  const [schedules, setSchedules] = useState<ReportScheduleConfig[]>(() =>
    reportSchedulerService.getSchedules()
  );
  const [activeScheduleIndex, setActiveScheduleIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'preview'>('config');
  const [logs, setLogs] = useState<ReportScheduleLog[]>(() => reportSchedulerService.getLogs());

  const [isSendingTest, setIsSendingTest] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSchedule = schedules[activeScheduleIndex] || DEFAULT_SCHEDULE_CONFIG;

  const handleUpdateCurrentSchedule = (fields: Partial<ReportScheduleConfig>) => {
    const updated = schedules.map((s, idx) => (idx === activeScheduleIndex ? { ...s, ...fields } : s));
    setSchedules(updated);
    reportSchedulerService.saveSchedules(updated);
  };

  const handleSendTestNow = async () => {
    setIsSendingTest(true);
    setSuccessBanner(null);

    try {
      const reportData: FinancialReportData = {
        profile,
        orders,
        expenses,
        periodLabel: currentSchedule.frequency === 'daily' ? `اليوم (${periodLabel})` : 'الأسبوع المنقضي',
        generatedBy: 'إرسال يدوي فوري للمدير',
      };

      const result = await reportSchedulerService.dispatchScheduleNow(currentSchedule, reportData);
      setLogs(reportSchedulerService.getLogs());
      setSuccessBanner(
        `✓ تم إطلاق التقرير وتجهيز مسودة البريد للمدير (${currentSchedule.managerEmail}) وتنزيل ملف PDF المعتمد بنجاح!`
      );
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err) {
      console.error('Test dispatch error:', err);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Preview generated email text
  const reportDataForPreview: FinancialReportData = {
    profile,
    orders,
    expenses,
    periodLabel,
    generatedBy: currentSchedule.managerName || 'المدير العام',
  };
  const emailDraft = reportSchedulerService.generateEmailDraft(currentSchedule, reportDataForPreview);

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E8DFD5] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-4 sm:px-6 bg-[#FAF7F2] border-b border-[#E8DFD5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8B1E1E] text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-[#231610]">
                  جدولة إرسال التقارير اليومية والأسبوعية للمدير
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    currentSchedule.enabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  {currentSchedule.enabled ? 'الجدولة مفعلة' : 'متوقف مؤقتاً'}
                </span>
              </div>
              <p className="text-xs text-[#7A6455] mt-0.5">
                إرسال الملخص المالي وحركة المبيعات آلياً عبر البريد الإلكتروني مع ملفات PDF معتمدة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Status */}
        <div className="px-4 sm:px-6 bg-white border-b border-[#F0E8DD] flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'config'
                  ? 'border-[#8B1E1E] text-[#8B1E1E]'
                  : 'border-transparent text-[#6F4E37] hover:text-[#231610]'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>إعدادات الجدولة والتوقيت</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'border-[#8B1E1E] text-[#8B1E1E]'
                  : 'border-transparent text-[#6F4E37] hover:text-[#231610]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>معاينة نص الرسالة والملفات</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'logs'
                  ? 'border-[#8B1E1E] text-[#8B1E1E]'
                  : 'border-transparent text-[#6F4E37] hover:text-[#231610]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سجل الإرساليات ({logs.length})</span>
            </button>
          </div>

          {/* Quick Send Test Button */}
          <button
            onClick={handleSendTestNow}
            disabled={isSendingTest}
            className="my-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-black hover:bg-[#721616] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title="إرسال فوري فوري للتقرير الحالي وتنزيل PDF"
          >
            {isSendingTest ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الإرسال والتنزيل...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>إرسال تجريبي الآن للمدير</span>
              </>
            )}
          </button>
        </div>

        {/* Success Alert Banner */}
        {successBanner && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer"
            >
              تم
            </button>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8F5F0]">
          {activeTab === 'config' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Enable / Disable Card */}
              <div className="p-4 bg-white rounded-2xl border border-[#E8DFD5] shadow-2xs flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-sm text-[#231610]">تفعيل الجدولة التلقائية</div>
                  <p className="text-xs text-[#7A6455] mt-0.5">
                    عند التفعيل، سيقوم النظام تلقائياً بتجهيز وإرسال التقارير في الموعد المحدد.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSchedule.enabled}
                    onChange={(e) => handleUpdateCurrentSchedule({ enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B1E1E]"></div>
                </label>
              </div>

              {/* Schedule Timing & Recurrence */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E8DFD5] shadow-2xs space-y-4">
                <h4 className="font-extrabold text-xs text-[#231610] flex items-center gap-1.5 border-b border-[#F0E8DD] pb-2">
                  <Calendar className="w-4 h-4 text-[#8B1E1E]" />
                  <span>دورية وتوقيت الإرسال المجدول</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      دورية التقرير (Frequency)
                    </label>
                    <select
                      value={currentSchedule.frequency}
                      onChange={(e) =>
                        handleUpdateCurrentSchedule({
                          frequency: e.target.value as ReportScheduleFrequency,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FAF7F2] font-bold"
                    >
                      <option value="daily">يومي (Daily) - نهاية كل يوم عمل</option>
                      <option value="weekly">أسبوعي (Weekly) - يوم محدد من الأسبوع</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      وقت الإرسال (توقيت المطعم)
                    </label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#8B1E1E] shrink-0" />
                      <input
                        type="time"
                        value={currentSchedule.timeOfDay}
                        onChange={(e) => handleUpdateCurrentSchedule({ timeOfDay: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] font-bold"
                      />
                    </div>
                    <span className="text-[10px] text-[#7A6455] mt-1 block">
                      يوصى بضبطه على موعد إغلاق اليومية (مثال 23:00 أو 00:00).
                    </span>
                  </div>

                  {currentSchedule.frequency === 'weekly' && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#231610] mb-1">
                        يوم الإرسال الأسبوعي
                      </label>
                      <select
                        value={currentSchedule.dayOfWeek ?? 5}
                        onChange={(e) =>
                          handleUpdateCurrentSchedule({ dayOfWeek: parseInt(e.target.value, 10) })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FAF7F2] font-bold"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Manager & Recipient Configuration */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E8DFD5] shadow-2xs space-y-4">
                <h4 className="font-extrabold text-xs text-[#231610] flex items-center gap-1.5 border-b border-[#F0E8DD] pb-2">
                  <User className="w-4 h-4 text-[#8B1E1E]" />
                  <span>بيانات المستلم والبريد الإلكتروني للإدارة</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      اسم المدير / المسؤول
                    </label>
                    <input
                      type="text"
                      value={currentSchedule.managerName || ''}
                      onChange={(e) => handleUpdateCurrentSchedule({ managerName: e.target.value })}
                      placeholder="مثال: أستاذ معاذ الشاذلي / المدير العام"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      البريد الإلكتروني الرئيسي للمدير *
                    </label>
                    <div className="flex items-center gap-2">
                      <AtSign className="w-4 h-4 text-[#8B1E1E] shrink-0" />
                      <input
                        type="email"
                        required
                        value={currentSchedule.managerEmail}
                        onChange={(e) => handleUpdateCurrentSchedule({ managerEmail: e.target.value })}
                        placeholder="manager@domain.com"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      نسخة كربونية إضافية (CC Emails - مفصولة بفواصل)
                    </label>
                    <input
                      type="text"
                      value={(currentSchedule.ccEmails || []).join(', ')}
                      onChange={(e) =>
                        handleUpdateCurrentSchedule({
                          ccEmails: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="finance@domain.com, accountant@domain.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] text-left font-mono"
                      dir="ltr"
                    />
                    <span className="text-[10px] text-[#7A6455] mt-1 block">
                      سيتم إرسال نسخة من التقرير للمحاسب أو المالك في نفس الوقت.
                    </span>
                  </div>
                </div>
              </div>

              {/* Content & Format Configuration */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#E8DFD5] shadow-2xs space-y-4">
                <h4 className="font-extrabold text-xs text-[#231610] flex items-center gap-1.5 border-b border-[#F0E8DD] pb-2">
                  <FileText className="w-4 h-4 text-[#8B1E1E]" />
                  <span>محتوى وصيغة التقرير المرسل</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      نوع التقرير المرفق
                    </label>
                    <select
                      value={currentSchedule.reportType}
                      onChange={(e) =>
                        handleUpdateCurrentSchedule({
                          reportType: e.target.value as ReportContentType,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FAF7F2] font-bold"
                    >
                      <option value="comprehensive">التقرير الشامل (ملخص مالي + حركة مبيعات)</option>
                      <option value="financial_summary">الملخص المالي وقائمة الدخل فقط</option>
                      <option value="sales_data">كشف حركة وبيانات المبيعات والطلبات فقط</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#231610] mb-1">
                      صيغة المستند المعتمد
                    </label>
                    <div className="p-2.5 rounded-xl border border-[#D7C3A5] bg-[#FFF8EF] text-xs font-bold text-[#8B1E1E] flex items-center gap-2">
                      <Download className="w-4 h-4 shrink-0" />
                      <span>مستند PDF رسمي معتمد بحجم A4 قابل للتنزيل والأرشفة</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white p-5 rounded-2xl border border-[#E8DFD5] shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                  <div>
                    <span className="text-[11px] text-[#7A6455] block">عنوان الرسالة (Email Subject):</span>
                    <strong className="text-sm text-[#231610]">{emailDraft.subject}</strong>
                  </div>
                  <a
                    href={emailDraft.mailtoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] text-xs font-bold hover:bg-[#F5EFE6]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح في تطبيق البريد</span>
                  </a>
                </div>

                <div>
                  <span className="text-[11px] text-[#7A6455] block mb-1">إلى (To):</span>
                  <div className="px-3 py-1.5 bg-[#FAF7F2] rounded-lg font-mono text-xs text-[#231610] border border-[#E8DFD5] inline-block">
                    {currentSchedule.managerEmail}
                  </div>
                  {currentSchedule.ccEmails && currentSchedule.ccEmails.length > 0 && (
                    <span className="text-xs text-[#7A6455] mr-2">
                      نسخة: {currentSchedule.ccEmails.join(', ')}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-[#7A6455] block mb-1">نص الرسالة التلقائي:</span>
                  <pre className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E8DFD5] text-xs text-[#231610] font-sans whitespace-pre-wrap leading-relaxed">
                    {emailDraft.bodyText}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-[#231610]">
                  سجل عمليات الإرسال السابقة ({logs.length})
                </h4>
                {logs.length > 0 && (
                  <span className="text-[11px] text-[#7A6455]">
                    يتم حفظ آخر 50 عملية إرسال تلقائياً
                  </span>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-[#E8DFD5] p-6 text-gray-400 text-xs">
                  <Mail className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <span>لم يتم تسجيل أي عمليات إرسال سابقة بعد. يمكنك تجربة "إرسال تجريبي الآن".</span>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#E8DFD5] overflow-hidden shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#FAF7F2] border-b border-[#E8DFD5] text-[#6F4E37] font-bold">
                      <tr>
                        <th className="p-3">تاريخ ووقت الإرسال</th>
                        <th className="p-3">المستلم</th>
                        <th className="p-3">النوع</th>
                        <th className="p-3">المبيعات والطلبات</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0E8DD]">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#FFF8EF]/50">
                          <td className="p-3 font-mono text-[11px] text-[#231610]">
                            {new Date(log.sentAt).toLocaleString('ar-EG', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-[#231610]">
                            {log.recipientEmail}
                          </td>
                          <td className="p-3 font-bold text-[#8B1E1E]">
                            {log.frequency === 'daily' ? 'تقرير يومي' : 'تقرير أسبوعي'}
                          </td>
                          <td className="p-3">
                            <span className="font-black text-[#231610] tabular-nums">
                              {log.totalRevenue.toFixed(2)} {profile.currency}
                            </span>
                            <span className="text-[10px] text-[#7A6455] block">
                              ({log.ordersCount} طلب)
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>تم الإرسال</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 bg-[#FAF7F2] border-t border-[#E8DFD5] flex items-center justify-between text-xs shrink-0">
          <div className="text-[#7A6455] text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              يتم حفظ التعديلات فورياً ويتم تجهيز ملف الـ PDF المعتمد وإرساله للمدير في الموعد المحدد.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-colors cursor-pointer"
          >
            حفظ وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
