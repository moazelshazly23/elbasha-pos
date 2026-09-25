import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  Usb,
  Cloud,
  CloudUpload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FolderSync,
  Share2,
  ExternalLink,
  Clock,
  Sparkles,
  FileCheck,
  RotateCcw,
  Settings,
  Link,
  Mail,
  Key,
  Check,
  RefreshCw,
  FolderPlus,
  Send,
  HelpCircle,
  HardDrive,
} from 'lucide-react';
import { posDb } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useBrand } from '../../context/BrandContext';
import { useToast } from '../../context/ToastContext';

interface AdminDriveConfig {
  email: string;
  folderUrl: string;
  folderName: string;
  webhookUrl: string;
  autoBackupOnShiftClose: boolean;
  isConnected: boolean;
  lastBackupDate?: string;
}

interface BackupRecord {
  id: string;
  type: 'usb' | 'drive' | 'local';
  filename: string;
  sizeBytes: number;
  timestamp: string;
  userName: string;
}

interface BackupPreviewInfo {
  version?: string;
  exportedAt?: string;
  restaurantName?: string;
  branchesCount?: number;
  productsCount?: number;
  ordersCount?: number;
  customersCount?: number;
  categoriesCount?: number;
  usersCount?: number;
}

const DRIVE_CONFIG_STORAGE_KEY = 'basha_pos_admin_drive_settings';
const BACKUP_HISTORY_STORAGE_KEY = 'basha_pos_backup_history_records';

export const BackupManager: React.FC = () => {
  const { currentUser } = useAuth();
  const { profile } = useBrand();
  const { showToast } = useToast();

  // Admin Google Drive configuration state
  const [driveConfig, setDriveConfig] = useState<AdminDriveConfig>(() => {
    try {
      const saved = localStorage.getItem(DRIVE_CONFIG_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading drive config:', e);
    }
    return {
      email: '',
      folderUrl: '',
      folderName: 'نسخ احتياطية - مشويات الباشا',
      webhookUrl: '',
      autoBackupOnShiftClose: true,
      isConnected: false,
    };
  });

  const [isEditingDriveConfig, setIsEditingDriveConfig] = useState(false);
  const [history, setHistory] = useState<BackupRecord[]>(() => {
    try {
      const saved = localStorage.getItem(BACKUP_HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // 24-Hour Backup Reminder States
  const [isBackupOverdue, setIsBackupOverdue] = useState<boolean>(() => posDb.isBackupOverdue(24));
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => posDb.getLastBackupTimestamp());

  useEffect(() => {
    const updateOverdueStatus = () => {
      setIsBackupOverdue(posDb.isBackupOverdue(24));
      setLastBackupTime(posDb.getLastBackupTimestamp());
    };
    updateOverdueStatus();
    return posDb.subscribe(updateOverdueStatus);
  }, []);

  // Restore states
  const [pendingRestoreData, setPendingRestoreData] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<BackupPreviewInfo | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const saveHistoryRecord = (type: 'usb' | 'drive' | 'local', filename: string, sizeBytes: number) => {
    const record: BackupRecord = {
      id: `bak-${Date.now()}`,
      type,
      filename,
      sizeBytes,
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || 'المدير العام',
    };
    const updated = [record, ...history].slice(0, 10);
    setHistory(updated);
    try {
      localStorage.setItem(BACKUP_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Backup history write warning:', e);
    }
  };

  const getFormattedTimestamp = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  };

  /**
   * 1. حفظ نسخة احتياطية مباشرة على فلاشة USB
   */
  const handleUsbBackup = async () => {
    setIsProcessing(true);
    setLastActionMessage(null);

    const jsonStr = posDb.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const cleanBrandName = (profile?.name || 'Albasha_POS').replace(/\s+/g, '_');
    const filename = `${cleanBrandName}_USB_Backup_${getFormattedTimestamp()}.posbak`;

    try {
      // إذا كان المتصفح يدعم File System Access API لاختيار الفلاشة مباشرة
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'ملف نسخة احتياطية لنظام الباشا POS (*.posbak)',
                accept: { 'application/json': ['.posbak', '.json'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();

          saveHistoryRecord('usb', handle.name || filename, blob.size);
          posDb.logAudit({
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'المدير العام',
            action: 'نسخ احتياطي على فلاشة USB',
            category: 'settings',
            details: `تم حفظ نسخة احتياطية على فلاشة USB: ${handle.name || filename}`,
          });

          setLastActionMessage(`✓ تم حفظ النسخة الاحتياطية بنجاح على الفلاشة باسم: ${handle.name || filename}`);
          showToast('تم حفظ النسخة الاحتياطية مباشرة على فلاشة USB بنجاح!', 'success');
          setIsProcessing(false);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsProcessing(false);
            return;
          }
        }
      }

      // التنزيل المباشر لنقله للفلاشة
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      saveHistoryRecord('usb', filename, blob.size);
      posDb.logAudit({
        userId: currentUser?.id || 'admin',
        userName: currentUser?.name || 'المدير العام',
        action: 'تصدير نسخة احتياطية للفلاشة',
        category: 'settings',
        details: `تم استخراج ملف النسخة الاحتياطية لنقله للفلاشة: ${filename}`,
      });

      setLastActionMessage(`✓ تم تنزيل ملف الفلاشة (${filename}). يمكنك نقله الآن إلى وحدة USB الخاصة بك.`);
      showToast('تم تنزيل النسخة الاحتياطية بنجاح! انقل الملف إلى فلاشة USB.', 'success');
    } catch (e: any) {
      showToast('حدث خطأ أثناء استخراج النسخة الاحتياطية', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * زر مخصص للأدمن لتنزيل فوري لملف قاعدة البيانات محلياً للتخزين الخارجي
   */
  const handleManualLocalDownload = () => {
    setIsProcessing(true);
    setLastActionMessage(null);

    try {
      const jsonStr = posDb.exportFullBackup();
      const cleanBrandName = (profile?.name || 'Albasha_POS').replace(/\s+/g, '_');
      const filename = `${cleanBrandName}_Local_Database_Backup_${getFormattedTimestamp()}.json`;
      const blob = new Blob([jsonStr], { type: 'application/json' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      saveHistoryRecord('local', filename, blob.size);
      posDb.recordBackupSuccess('local', filename);
      posDb.logAudit({
        userId: currentUser?.id || 'admin',
        userName: currentUser?.name || 'المدير العام',
        action: 'تنزيل نسخة احتياطية محلية للتخزين الخارجي',
        category: 'settings',
        details: `قام المدير بتنزيل نسخة محلية كاملة لقاعدة البيانات للتخزين الخارجي: ${filename}`,
      });

      setLastActionMessage(`✓ تم تنزيل النسخة الاحتياطية بنجاح (${filename}). أصبحت جاهزة للتخزين الخارجي أو الأرشفة.`);
      showToast('تم تنزيل النسخة الاحتياطية لقاعدة البيانات بنجاح! جاهزة للنقل والتخزين الخارجي.', 'success');
    } catch (e: any) {
      showToast('حدث خطأ أثناء تنزيل النسخة الاحتياطية', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 2. حفظ وتحديث إعدادات درايف الخاصة بالأدمن
   */
  const handleSaveDriveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AdminDriveConfig = {
      ...driveConfig,
      isConnected: Boolean(driveConfig.email || driveConfig.folderUrl || driveConfig.webhookUrl),
    };
    setDriveConfig(updated);
    try {
      localStorage.setItem(DRIVE_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Drive config write error:', e);
    }
    setIsEditingDriveConfig(false);
    showToast('تم حفظ إعدادات حساب Google Drive الخاص بالأدمن بنجاح!', 'success');
  };

  /**
   * 3. رفع أو تصدير النسخة الاحتياطية إلى Google Drive الخاص بالمدير
   */
  const handleDriveBackup = async () => {
    setIsProcessing(true);
    setLastActionMessage(null);

    const jsonStr = posDb.exportFullBackup();
    const cleanBrandName = (profile?.name || 'Albasha_POS').replace(/\s+/g, '_');
    const filename = `GoogleDrive_${cleanBrandName}_Backup_${getFormattedTimestamp()}.json`;
    const blob = new Blob([jsonStr], { type: 'application/json' });

    try {
      // إذا كان الأدمن قد قام بضبط Webhook مخصص لرفع البيانات مباشرة لسحابته
      if (driveConfig.webhookUrl && driveConfig.webhookUrl.trim() !== '') {
        try {
          const res = await fetch(driveConfig.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename,
              restaurantName: profile?.name || 'مشويات الباشا',
              exportedAt: new Date().toISOString(),
              data: JSON.parse(jsonStr),
            }),
            mode: 'no-cors',
          });

          saveHistoryRecord('drive', filename, blob.size);
          const updatedConfig = { ...driveConfig, lastBackupDate: new Date().toISOString() };
          setDriveConfig(updatedConfig);
          localStorage.setItem(DRIVE_CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig));

          setLastActionMessage(`✓ تم إرسال وحفظ النسخة الاحتياطية السحابية بنجاح إلى حساب Google Drive الخاص بالأدمن!`);
          showToast('تمت المزامنة وحفظ النسخة في Google Drive بنجاح!', 'success');
          setIsProcessing(false);
          return;
        } catch (webhookErr) {
          console.warn('Webhook upload warning:', webhookErr);
        }
      }

      // تجهيز ملف التحميل وفتح مجلد درايف الخاص بالأدمن فورياً
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      saveHistoryRecord('drive', filename, blob.size);
      const updatedConfig = { ...driveConfig, lastBackupDate: new Date().toISOString() };
      setDriveConfig(updatedConfig);
      localStorage.setItem(DRIVE_CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig));

      // فتح مجلد الأدمن الخاص على درايف إذا كان مدخلاً، وإلا فتح درايف الرئيسي
      const targetDriveUrl = driveConfig.folderUrl && driveConfig.folderUrl.trim() !== ''
        ? driveConfig.folderUrl
        : 'https://drive.google.com/drive/my-drive';

      window.open(targetDriveUrl, '_blank', 'noopener,noreferrer');

      setLastActionMessage(
        `✓ تم تنزيل ملف النسخة (${filename}) وتم فتح مجلد Google Drive الخاص بك تلقائياً. اسحب الملف للمجلد ليتم حفظه بأمان.`
      );
      showToast('تم تنزيل النسخة وفتح مجلد درايف الخاص بك لرفعها فوراً!', 'success');
    } catch (err: any) {
      showToast('حدث خطأ أثناء تجهيز النسخة لـ Google Drive', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 4. مشاركة سريعة عبر تطبيق Google Drive (للهواتف والأجهزة اللوحية وحواسيب الويندوز)
   */
  const handleShareToDrive = async () => {
    try {
      const jsonStr = posDb.exportFullBackup();
      const filename = `GoogleDrive_Albasha_${getFormattedTimestamp()}.json`;
      const file = new File([jsonStr], filename, { type: 'application/json' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `نسخة احتياطية - ${profile?.name || 'مشويات الباشا'}`,
          text: `نسخة احتياطية سحابية لقاعدة بيانات المطعم (${new Date().toLocaleDateString('ar-EG')})`,
        });
        saveHistoryRecord('drive', filename, file.size);
        showToast('تمت مشاركة الملف بنجاح! اختر تطبيق Google Drive للحفظ.', 'success');
      } else {
        handleDriveBackup();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        handleDriveBackup();
      }
    }
  };

  /**
   * 5. معالجة ملف الاسترجاع وفحص سلامته
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || typeof parsed !== 'object') {
          showToast('الملف غير صالح أو لا يحتوي على بنية بيانات نظام نقطة البيع', 'error');
          return;
        }

        const preview: BackupPreviewInfo = {
          version: parsed.version || '1.0.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          restaurantName: parsed.profile?.name || 'مشويات الباشا',
          branchesCount: Array.isArray(parsed.branches) ? parsed.branches.length : 0,
          productsCount: Array.isArray(parsed.products) ? parsed.products.length : 0,
          ordersCount: Array.isArray(parsed.orders) ? parsed.orders.length : 0,
          customersCount: Array.isArray(parsed.customers) ? parsed.customers.length : 0,
          categoriesCount: Array.isArray(parsed.categories) ? parsed.categories.length : 0,
          usersCount: Array.isArray(parsed.users) ? parsed.users.length : 0,
        };

        setPreviewInfo(preview);
        setPendingRestoreData(content);
        setShowRestoreModal(true);
      } catch (err) {
        showToast('فشل قراءة الملف. تأكد من أنه ملف نسخة احتياطية صالح (*.json أو *.posbak)', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /**
   * تنفيذ الاسترجاع
   */
  const executeRestore = () => {
    if (!pendingRestoreData) return;
    setIsProcessing(true);

    try {
      const res = posDb.importBackup(pendingRestoreData);
      if (res.success) {
        posDb.logAudit({
          userId: currentUser?.id || 'admin',
          userName: currentUser?.name || 'المدير العام',
          action: 'استعادة نسخة احتياطية كاملة',
          category: 'settings',
          details: `تمت استعادة قاعدة البيانات بنجاح من النسخة الاحتياطية (${previewInfo?.restaurantName || ''})`,
        });

        showToast('تمت استعادة النسخة الاحتياطية بنجاح! جاري تحديث النظام...', 'success');
        setShowRestoreModal(false);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        showToast(`فشل استرجاع النسخة: ${res.error || 'خطأ غير معروف'}`, 'error');
      }
    } catch (e: any) {
      showToast('حدث خطأ أثناء تطبيق النسخة الاحتياطية', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Banner / Success Action Message */}
      {lastActionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <div className="flex-1 leading-relaxed">{lastActionMessage}</div>
          <button
            onClick={() => setLastActionMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* 24-HOUR BACKUP REMINDER & HEALTH BANNER */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isBackupOverdue
            ? 'bg-red-50 border-red-300 text-red-900 shadow-xs'
            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                isBackupOverdue ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'
              }`}
            >
              {isBackupOverdue ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm">
                  {isBackupOverdue
                    ? 'تنبيه أمان هام: لم يتم إجراء نسخة احتياطية خلال الـ 24 ساعة الماضية!'
                    : 'حالة النسخ الاحتياطي: ممتازة وقاعدة البيانات محمية بالكامل'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isBackupOverdue
                      ? 'bg-red-200 text-red-900'
                      : 'bg-emerald-200 text-emerald-900'
                  }`}
                >
                  {isBackupOverdue ? 'تذكير عاجل (24+ ساعة)' : 'محدثة وآمنة'}
                </span>
              </div>
              <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">
                {lastBackupTime ? (
                  <>
                    آخر نسخة تم حفظها بنجاح:{' '}
                    <strong className="text-[#231610] font-mono">
                      {new Date(lastBackupTime).toLocaleString('ar-EG')}
                    </strong>{' '}
                    {isBackupOverdue && '(مضى أكثر من 24 ساعة - يوصى بالتنزيل أو الحفظ الخارجي الآن)'}
                  </>
                ) : (
                  'لم يتم إنشاء أي نسخة احتياطية حتى الآن. بادر بحفظ نسخة لتأمين بيانات المبيعات والمخزون.'
                )}
              </p>
            </div>
          </div>

          {/* Quick Trigger Button right inside the Reminder Banner */}
          {isBackupOverdue && (
            <button
              type="button"
              onClick={handleManualLocalDownload}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل نسخة احتياطية وتأكيد الأمان الآن</span>
            </button>
          )}
        </div>
      </div>

      {/* DEDICATED ACTION BUTTON FOR ADMINS: LOCAL DB DOWNLOAD FOR EXTERNAL STORAGE */}
      <div className="p-5 bg-gradient-to-r from-[#231610] via-[#3E2723] to-[#8B1E1E] text-white rounded-2xl shadow-lg border border-[#D7C3A5]/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-white">
                تنزيل نسخة احتياطية محلية للتخزين الخارجي (Local DB Download)
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-[#B8860B] text-black text-[10px] font-black uppercase">
                خاص بالإدارة (Admin Action)
              </span>
            </div>
            <p className="text-xs text-amber-100/80 mt-1 leading-relaxed max-w-xl">
              توليد وتنزيل فوري لملف قاعدة البيانات الكامل بصيغة JSON لنقله إلى قرص صلب خارجي، فلاشة USB، أو الحفظ في أرشيف حاسوب الإدارة.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualLocalDownload}
          disabled={isProcessing}
          className="w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-[#B8860B] to-[#D4AF37] hover:from-[#A6780A] hover:to-[#B8860B] text-[#231610] text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
          title="تنزيل فوري لملف قاعدة البيانات الكاملة"
        >
          <Download className="w-4 h-4" />
          <span>تنزيل قاعدة البيانات للتخزين الخارجي</span>
        </button>
      </div>

      {/* Main Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* OPTION 1: USB FLASH DRIVE BACKUP */}
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5 space-y-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-50 rounded-br-full -z-0 pointer-events-none" />

          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1">
                <Usb className="w-3.5 h-3.5 text-emerald-700" />
                <span>حفظ محلي خارجي (Offline USB)</span>
              </span>
              <span className="text-[10px] text-gray-500 font-bold">موصى به يومياً</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Usb className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#231610]">
                  النسخ الاحتياطي على فلاشة USB
                </h4>
                <p className="text-xs text-[#7A6455] mt-1 leading-relaxed">
                  احفظ نسخة كاملة من قاعدة البيانات، الفواتير، والمنيو مباشرة على وحدة تخزين خارجية (فلاش ميموري) لحماية بيانات المطعم في حال تلف الجهاز.
                </p>
              </div>
            </div>

            <div className="bg-[#F8F5F0] p-3 rounded-xl border border-[#E8DFD5] text-[11px] text-[#5C4033] space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>مميزات النسخ على الفلاشة:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-gray-700 pr-1">
                <li>يعمل بالكامل بدون الحاجة لإنترنت (Offline 100%).</li>
                <li>تحديد مسار الحفظ مباشرة على الفلاشة بنقرة واحدة.</li>
                <li>تسمية آلية توضح التاريخ والوقت واسم المطعم.</li>
              </ul>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 relative z-10">
            <button
              type="button"
              onClick={handleUsbBackup}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white text-xs font-black transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Usb className="w-4 h-4" />
              <span>حفظ نسخة احتياطية على فلاشة USB الآن</span>
            </button>
          </div>
        </div>

        {/* OPTION 2: GOOGLE DRIVE BACKUP (CONFIGURED BY ADMIN) */}
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-24 h-24 bg-blue-50 rounded-br-full -z-0 pointer-events-none" />

          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-blue-700" />
                <span>حفظ سحابي بحساب الأدمن (Google Drive)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingDriveConfig(!isEditingDriveConfig)}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer underline"
              >
                <Settings className="w-3 h-3" />
                <span>إعدادات حساب الأدمن</span>
              </button>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <CloudUpload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#231610]">
                  النسخ الاحتياطي على Google Drive
                </h4>
                <p className="text-xs text-[#7A6455] mt-1 leading-relaxed">
                  ربط وحفظ النسخ الاحتياطية على حساب جوجل درايف الخاص بمدير المطعم لحماية البيانات سحابياً والوصول إليها من أي مكان.
                </p>
              </div>
            </div>

            {/* Admin Drive Status Banner */}
            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-[11px] text-blue-950 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1 text-blue-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>حساب درايف المعتمد:</span>
                </span>
                <span className="font-mono text-[10px] text-blue-800">
                  {driveConfig.email || 'لم يتم تحديد بريد الأدمن بعد'}
                </span>
              </div>
              <div className="text-gray-600 text-[10px] flex items-center justify-between">
                <span>مجلد الحفظ: {driveConfig.folderName}</span>
                {driveConfig.lastBackupDate && (
                  <span>آخر نسخ: {new Date(driveConfig.lastBackupDate).toLocaleDateString('ar-EG')}</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-2 relative z-10">
            <button
              type="button"
              onClick={handleDriveBackup}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white text-xs font-black transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              <span>رفع نسخة إلى Google Drive الخاص بالأدمن</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = driveConfig.folderUrl && driveConfig.folderUrl.trim() !== ''
                    ? driveConfig.folderUrl
                    : 'https://drive.google.com/drive/my-drive';
                  window.open(target, '_blank', 'noopener,noreferrer');
                }}
                className="py-2 px-2.5 rounded-xl border border-blue-300 bg-white hover:bg-blue-50 text-blue-800 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="فتح مجلد درايف الخاص بالأدمن"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح مجلد Drive</span>
              </button>

              <button
                type="button"
                onClick={handleShareToDrive}
                disabled={isProcessing}
                className="py-2 px-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-700" />
                <span>مشاركة بتطبيق Drive</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN GOOGLE DRIVE CONFIGURATION FORM (COLLAPSIBLE) */}
      {isEditingDriveConfig && (
        <form
          onSubmit={handleSaveDriveConfig}
          className="p-5 bg-white rounded-2xl border-2 border-blue-300 shadow-sm space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-700" />
              <h4 className="font-extrabold text-sm text-[#231610]">
                إعدادات ربط Google Drive الخاصة بمدير النظام (Admin Setup)
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingDriveConfig(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              إلغاء
            </button>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
            💡 يقوم مدير النظام هنا بضبط وتعيين حساب جوجل درايف الخاص به أو بمطعمه، ليتم توجيه جميع النسخ الاحتياطية السحابية إليه مباشرة.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#3E2723] mb-1">
                البريد الإلكتروني لحساب Google Drive الخاص بالمدير:
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={driveConfig.email}
                  onChange={(e) => setDriveConfig({ ...driveConfig, email: e.target.value })}
                  placeholder="admin.restaurant@gmail.com"
                  className="w-full px-3 py-2 pr-9 border border-[#D7C3A5] rounded-xl font-mono text-left bg-white text-[#231610]"
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#3E2723] mb-1">
                اسم مجلد النسخ الاحتياطية على Drive:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={driveConfig.folderName}
                  onChange={(e) => setDriveConfig({ ...driveConfig, folderName: e.target.value })}
                  placeholder="نسخ احتياطية - مشويات الباشا"
                  className="w-full px-3 py-2 pr-9 border border-[#D7C3A5] rounded-xl bg-white text-[#231610]"
                />
                <FolderPlus className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#3E2723] mb-1">
                رابط مجلد Google Drive المخصص للمطعم (URL):
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={driveConfig.folderUrl}
                  onChange={(e) => setDriveConfig({ ...driveConfig, folderUrl: e.target.value })}
                  placeholder="https://drive.google.com/drive/folders/xxxx"
                  className="w-full px-3 py-2 pr-9 border border-[#D7C3A5] rounded-xl font-mono text-left bg-white text-[#231610]"
                  dir="ltr"
                />
                <Link className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">
                عند النقر على "رفع نسخة" سيتم فتح هذا المجلد المباشر للأدمن.
              </span>
            </div>

            <div>
              <label className="block font-bold text-[#3E2723] mb-1">
                رابط Google Apps Script Webhook (اختياري للرفع التلقائي الصامت):
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={driveConfig.webhookUrl}
                  onChange={(e) => setDriveConfig({ ...driveConfig, webhookUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/xxxx/exec"
                  className="w-full px-3 py-2 pr-9 border border-[#D7C3A5] rounded-xl font-mono text-left bg-white text-[#231610]"
                  dir="ltr"
                />
                <Send className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">
                يتيح الرفع الآلي بضغطة زر مباشرة لمجلد جوجل درايف دون فتح المتصفح.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsEditingDriveConfig(false)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-extrabold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ إعدادات حساب درايف</span>
            </button>
          </div>
        </form>
      )}

      {/* RESTORE SECTION */}
      <div className="p-5 bg-[#FAF7F2] rounded-2xl border border-[#D7C3A5] space-y-3">
        <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-2.5">
          <div className="flex items-center gap-2">
            <FolderSync className="w-5 h-5 text-[#8B1E1E]" />
            <h4 className="font-extrabold text-sm text-[#231610]">
              استعادة نسخة احتياطية من الفلاشة أو Google Drive
            </h4>
          </div>
          <span className="text-[11px] text-[#7A6455] font-bold">
            يدعم ملفات (.posbak و .json)
          </span>
        </div>

        <p className="text-xs text-gray-700 leading-relaxed">
          يمكنك استعادة بيانات المطعم بالكامل في أي وقت عن طريق اختيار ملف النسخة الاحتياطية الموجود على الفلاشة أو الذي قمت بتنزيله من Google Drive. سيقوم النظام بعرض محتويات النسخة أولاً للتأكيد قبل التطبيق.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B1E1E] hover:bg-[#6E1616] text-white text-xs font-bold cursor-pointer transition-all shadow-md active:scale-98">
            <Upload className="w-4 h-4" />
            <span>اختيار ملف النسخة الاحتياطية واستعادتها</span>
            <input
              type="file"
              accept=".json,.posbak"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <span className="text-[11px] text-gray-500">
            (سيتم عمل فحص أمان ومعاينة محتويات الملف قبل الاستبدال)
          </span>
        </div>
      </div>

      {/* BACKUP HISTORY LOG */}
      {history.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFD5] space-y-3">
          <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-2">
            <h4 className="font-bold text-xs text-[#231610] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#8B1E1E]" />
              <span>سجل آخر النسخ الاحتياطية التي تم إنشاؤها:</span>
            </h4>
            <span className="text-[10px] text-gray-500">آخر {history.length} عمليات</span>
          </div>

          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#FDFBF7] border border-[#E8DFD5] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${
                      item.type === 'usb' ? 'bg-emerald-600' : 'bg-blue-600'
                    }`}
                  >
                    {item.type === 'usb' ? <Usb className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-[#231610] block truncate">
                      {item.filename}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(item.timestamp).toLocaleString('ar-EG')} • بواسطة: {item.userName}
                    </span>
                  </div>
                </div>

                <div className="text-left shrink-0 pl-1">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-700 tabular-nums">
                    {formatFileSize(item.sizeBytes)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONFIRMATION & PREVIEW MODAL BEFORE RESTORING */}
      {showRestoreModal && previewInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#E8DFD5] overflow-hidden text-right" dir="rtl">
            <div className="p-4 bg-gradient-to-r from-[#8B1E1E] to-[#A32828] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-sm">معاينة وتأكيد استعادة النسخة الاحتياطية</h3>
              </div>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="text-white/80 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">تنبيه أمان:</strong>
                  سيتم استبدال قاعدة البيانات الحالية بالكامل بالبيانات الموجودة في ملف النسخة الاحتياطية. يرجى مراجعة التفاصيل أدناه قبل المتابعة.
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8DFD5] space-y-2 text-xs">
                <div className="font-bold text-[#8B1E1E] border-b border-[#E8DFD5] pb-1.5 flex items-center justify-between">
                  <span>المطعم: {previewInfo.restaurantName}</span>
                  <span className="text-[10px] text-gray-500 font-mono">الإصدار: {previewInfo.version}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 bg-white rounded-lg border border-[#E8DFD5]">
                    <span className="text-gray-500 block text-[10px]">تاريخ النسخة:</span>
                    <span className="font-bold text-[#231610]">
                      {previewInfo.exportedAt
                        ? new Date(previewInfo.exportedAt).toLocaleDateString('ar-EG')
                        : 'غير محدد'}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-[#E8DFD5]">
                    <span className="text-gray-500 block text-[10px]">عدد الطلبات والفواتير:</span>
                    <span className="font-bold text-emerald-700 tabular-nums">
                      {previewInfo.ordersCount} طلب
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-[#E8DFD5]">
                    <span className="text-gray-500 block text-[10px]">أصناف المنيو:</span>
                    <span className="font-bold text-[#231610] tabular-nums">
                      {previewInfo.productsCount} صنف
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-[#E8DFD5]">
                    <span className="text-gray-500 block text-[10px]">العملاء المسجلون:</span>
                    <span className="font-bold text-[#231610] tabular-nums">
                      {previewInfo.customersCount} عميل
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F8F5F0] border-t border-[#E8DFD5] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={executeRestore}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isProcessing ? 'جاري الاستعادة...' : 'تأكيد استعادة هذه النسخة'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
