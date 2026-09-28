import {
  ReportScheduleConfig,
  ReportScheduleLog,
  ReportContentType,
  ReportScheduleFrequency,
  RestaurantProfile,
  Order,
  Expense,
} from '../types';
import { posDb } from './db';
import {
  generateFinancialReportHTML,
  generateSalesReportHTML,
  downloadFinancialReportPDF,
  downloadSalesReportPDF,
  FinancialReportData,
} from '../utils/financialReportPDF';

const STORAGE_KEY_SCHEDULES = 'basha_pos_report_schedules_v1';
const STORAGE_KEY_SCHEDULE_LOGS = 'basha_pos_report_schedule_logs_v1';

export const DEFAULT_SCHEDULE_CONFIG: ReportScheduleConfig = {
  id: 'schedule_daily_manager',
  name: 'التقرير اليومي المالي للإدارة العامة',
  enabled: true,
  frequency: 'daily',
  timeOfDay: '23:00', // 11:00 PM (end of day)
  dayOfWeek: 5, // الجمعة (Friday) if weekly
  managerEmail: 'manager@elbasha-grill.com',
  managerName: 'المدير العام',
  ccEmails: ['finance@elbasha-grill.com'],
  reportType: 'comprehensive',
  format: 'pdf_and_html',
  includeExecutiveCharts: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

class ReportSchedulerService {
  /**
   * Get all schedule configurations
   */
  public getSchedules(): ReportScheduleConfig[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SCHEDULES);
      if (stored) {
        const parsed = JSON.parse(stored) as ReportScheduleConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse report schedules:', e);
    }
    return [DEFAULT_SCHEDULE_CONFIG];
  }

  /**
   * Save schedule configurations
   */
  public saveSchedules(schedules: ReportScheduleConfig[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
    } catch (e) {
      console.error('Failed to save report schedules:', e);
    }
  }

  /**
   * Update or create a single schedule
   */
  public saveSchedule(schedule: ReportScheduleConfig): void {
    const list = this.getSchedules();
    const idx = list.findIndex((s) => s.id === schedule.id);
    if (idx >= 0) {
      list[idx] = { ...schedule, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...schedule, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.saveSchedules(list);
  }

  /**
   * Delete a schedule
   */
  public deleteSchedule(id: string): void {
    const list = this.getSchedules().filter((s) => s.id !== id);
    this.saveSchedules(list);
  }

  /**
   * Get dispatch logs
   */
  public getLogs(): ReportScheduleLog[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SCHEDULE_LOGS);
      if (stored) {
        return JSON.parse(stored) as ReportScheduleLog[];
      }
    } catch (e) {
      console.warn('Failed to parse schedule logs:', e);
    }
    return [];
  }

  /**
   * Add a log entry
   */
  public addLog(log: Omit<ReportScheduleLog, 'id'>): ReportScheduleLog {
    const logs = this.getLogs();
    const newEntry: ReportScheduleLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    logs.unshift(newEntry);
    // Keep max 50 recent logs
    const trimmed = logs.slice(0, 50);
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULE_LOGS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save schedule log:', e);
    }
    return newEntry;
  }

  /**
   * Generate email text and subject line for the scheduled report
   */
  public generateEmailDraft(
    schedule: ReportScheduleConfig,
    reportData: FinancialReportData
  ): { subject: string; bodyText: string; mailtoUrl: string } {
    const { profile, orders, expenses = [], periodLabel } = reportData;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netCashFlow = totalRevenue - totalExpenses;

    const subject = `[${profile.name}] التقرير ${schedule.frequency === 'daily' ? 'اليومي' : 'الأسبوعي'} المعتمد - ${periodLabel}`;

    const bodyText = `
السيد/ ${schedule.managerName || 'المدير العام'} المحترم،
تحية طيبة وبعد،،،

مرفق لسيادتكم أدناه التقرير ${schedule.frequency === 'daily' ? 'اليومي' : 'الأسبوعي'} لعمليات مطعم [${profile.name}] عن فترة (${periodLabel}).

=============================================
📊 ملخص المؤشرات المالية والتشغيلية الرئيسية:
=============================================
• إجمالي المبيعات المحصلة: ${totalRevenue.toFixed(2)} ${profile.currency}
• عدد الطلبات والفواتير: ${totalOrders} فاتورة
• متوسط قيمة الفاتورة: ${(totalOrders > 0 ? totalRevenue / totalOrders : 0).toFixed(2)} ${profile.currency}
• إجمالي المصروفات والنثريات: ${totalExpenses.toFixed(2)} ${profile.currency}
• صافي التدفق النقدي للفترة: ${netCashFlow.toFixed(2)} ${profile.currency}

=============================================
📌 تفاصيل القنوات وطرق الدفع:
=============================================
• صالات وداخلي: ${orders.filter((o) => o.type === 'dine_in').length} طلب
• سفري وتيك أواي: ${orders.filter((o) => o.type === 'takeaway').length} طلب
• توصيل منازل: ${orders.filter((o) => o.type === 'delivery').length} طلب

تم توليد التقرير المالي الرسمي وتصديره كملف PDF معتمد ومرفق مع هذه الإرسالية.
يمكنكم أيضاً مراجعة تفاصيل العمليات الحية مباشرة عبر منظومة مشويات الباشا POS.

مع خالص التحية،
إدارة نظام نقاط البيع والمحاسبة - ${profile.name}
تاريخ الإصدار: ${new Date().toLocaleString('ar-EG')}
`.trim();

    const recipient = encodeURIComponent(schedule.managerEmail);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(bodyText);
    const ccParam =
      schedule.ccEmails && schedule.ccEmails.length > 0
        ? `&cc=${encodeURIComponent(schedule.ccEmails.join(','))}`
        : '';

    const mailtoUrl = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}${ccParam}`;

    return { subject, bodyText, mailtoUrl };
  }

  /**
   * Execute immediate send for a schedule:
   * 1. Generates & downloads PDF document to ensure manager gets the file
   * 2. Launches email client with prefilled subject, body, and recipient
   * 3. Records log entry in schedule history
   */
  public async dispatchScheduleNow(
    schedule: ReportScheduleConfig,
    reportData: FinancialReportData
  ): Promise<{ success: boolean; log: ReportScheduleLog }> {
    const { profile, orders } = reportData;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    // 1. Download corresponding PDF report based on schedule reportType
    try {
      if (schedule.reportType === 'sales_data') {
        await downloadSalesReportPDF(
          reportData,
          `تقرير_مبيعات_مجدول_${schedule.frequency === 'daily' ? 'يومي' : 'أسبوعي'}_${new Date().toISOString().slice(0, 10)}.pdf`
        );
      } else {
        await downloadFinancialReportPDF(
          reportData,
          `تقرير_مالي_مجدول_${schedule.frequency === 'daily' ? 'يومي' : 'أسبوعي'}_${new Date().toISOString().slice(0, 10)}.pdf`
        );
      }
    } catch (e) {
      console.warn('PDF auto-download encountered an issue, proceeding with email draft:', e);
    }

    // 2. Prepare email draft
    const { mailtoUrl } = this.generateEmailDraft(schedule, reportData);

    // 3. Open mail client via hidden link
    try {
      const a = document.createElement('a');
      a.href = mailtoUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to trigger mailto:', e);
    }

    // 4. Update schedule last run
    schedule.lastRunAt = new Date().toISOString();
    schedule.lastStatus = 'success';
    this.saveSchedule(schedule);

    // 5. Add log
    const log = this.addLog({
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      sentAt: new Date().toISOString(),
      recipientEmail: schedule.managerEmail,
      frequency: schedule.frequency,
      reportType: schedule.reportType,
      status: 'sent',
      totalRevenue,
      ordersCount: orders.length,
      periodLabel: reportData.periodLabel,
      message: `تم تحضير التقرير وإطلاقه لبريد المدير (${schedule.managerEmail}) مع ملف PDF.`,
    });

    return { success: true, log };
  }

  /**
   * Automated Background Checker:
   * Checks if an enabled daily or weekly schedule is due right now
   */
  public checkAndRunDueSchedules(
    profile: RestaurantProfile,
    onDueNotification?: (schedule: ReportScheduleConfig) => void
  ): void {
    const schedules = this.getSchedules().filter((s) => s.enabled);
    if (schedules.length === 0) return;

    const now = new Date();
    const currentHourMinute = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const todayStr = now.toISOString().slice(0, 10);
    const currentDayOfWeek = now.getDay(); // 0 to 6

    schedules.forEach((schedule) => {
      // Check if already ran today
      if (schedule.lastRunAt && schedule.lastRunAt.startsWith(todayStr)) {
        return;
      }

      // Check weekly day match
      if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
        if (schedule.dayOfWeek !== currentDayOfWeek) {
          return;
        }
      }

      // Check time match (within current hour or past schedule time if not run today)
      if (schedule.timeOfDay <= currentHourMinute) {
        // Schedule is due!
        const allOrders = posDb.getOrders();
        const expenses = posDb.getExpenses();

        // Filter orders for today or week
        let filteredOrders = allOrders;
        let periodLabel = 'اليوم';
        if (schedule.frequency === 'daily') {
          filteredOrders = allOrders.filter(
            (o) => new Date(o.createdAt).toISOString().slice(0, 10) === todayStr
          );
          periodLabel = `يوم ${todayStr}`;
        } else {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          filteredOrders = allOrders.filter(
            (o) => new Date(o.createdAt).getTime() >= sevenDaysAgo.getTime()
          );
          periodLabel = 'الأسبوع المنقضي';
        }

        const reportData: FinancialReportData = {
          profile,
          orders: filteredOrders,
          expenses,
          periodLabel,
          generatedBy: 'المجدول التلقائي للتقارير (Auto-Scheduler)',
        };

        // Notify app
        if (onDueNotification) {
          onDueNotification(schedule);
        }

        // Auto dispatch & log
        this.dispatchScheduleNow(schedule, reportData).catch((err) =>
          console.error('Auto dispatch error:', err)
        );
      }
    });
  }
}

export const reportSchedulerService = new ReportSchedulerService();
