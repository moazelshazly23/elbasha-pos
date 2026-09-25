import React, { useState } from 'react';
import { Download, MonitorCheck, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running as an installed PWA, hide or show installed badge
  if (isInstalled) {
    return (
      <div
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold"
        title="التطبيق مثبت ويعمل بشكل مستقل في بيئة سطح المكتب"
      >
        <MonitorCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>مثبت محلياً</span>
      </div>
    );
  }

  // Chromium / Android / Edge / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={async () => {
          setInstalling(true);
          try {
            await install();
          } finally {
            setInstalling(false);
          }
        }}
        disabled={installing}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B1E1E] text-white hover:bg-[#6e1515] active:scale-95 transition rounded-xl text-xs font-bold shadow-xs cursor-pointer"
        title="تثبيت التطبيق على جهاز الكمبيوتر للعمل بدون متصفح وبدون إنترنت"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{installing ? 'جاري التثبيت...' : 'تثبيت البرنامج (Offline App)'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FFF8EF] border border-[#D7C3A5] text-[#8B1E1E] hover:bg-[#F5EFE6] rounded-xl text-xs font-bold transition"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>تثبيت على الآيباد</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
              <h3 className="text-base font-extrabold text-gray-900 mb-2">
                تثبيت مشويات الباشا POS على iPad / iPhone
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                1. اضغط على زر <strong>مشاركة (Share)</strong> في شريط متصفح Safari.<br />
                2. مرر للأسفل واضغط على <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.<br />
                3. سيعمل التطبيق كنافذة مستقلة بدون إنترنت.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-[#8B1E1E] py-2 text-xs font-bold text-white hover:bg-[#6e1515] transition"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
