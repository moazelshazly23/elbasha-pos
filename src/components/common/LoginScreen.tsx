import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBrand } from '../../context/BrandContext';
import { posDb } from '../../services/db';
import { BrandLogo } from '../common/BrandLogo';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onOpenWizard: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onOpenWizard }) => {
  const { login, allBranches, currentBranch, setCurrentBranch } = useAuth();
  const { profile } = useBrand();

  const [inputVal, setInputVal] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pin' | 'userpass'>('pin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');

  const allUsers = posDb.getUsers().filter((u) => u.active);

  const handlePinDigit = (digit: string) => {
    if (inputVal.length < 6) {
      const next = inputVal + digit;
      setInputVal(next);
      setErrorMessage(null);
      if (next.length === 4) {
        // Auto-check PIN
        setTimeout(() => {
          submitCredential(next);
        }, 80);
      }
    }
  };

  const handleBackspace = () => {
    setInputVal((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setInputVal('');
    setErrorMessage(null);
  };

  const submitCredential = (cred: string, pass?: string) => {
    const res = login(cred, pass);
    if (res.success) {
      onLoginSuccess();
    } else {
      setErrorMessage(res.message || 'رمز PIN أو بيانات الدخول غير صحيحة');
      setInputVal('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'pin') {
      submitCredential(inputVal);
    } else {
      submitCredential(username, password);
    }
  };

  const handleQuickUserSelect = (pin: string) => {
    submitCredential(pin);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#231610] flex items-center justify-center p-4 selection:bg-[#B8860B]/30" dir="rtl">
      {/* Background Graphic Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#B8860B_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="bg-[#FAF7F2] rounded-3xl shadow-2xl border border-[#D7C3A5] max-w-4xl w-full flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Left Side (Branding & Identity Column) */}
        <div className="w-full md:w-5/12 bg-gradient-to-b from-[#8B1E1E] to-[#5A1212] p-8 text-white flex flex-col justify-between items-center text-center relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-[#B8860B]/10 blur-2xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-white/10 backdrop-blur-xs rounded-2xl inline-block border border-white/20 shadow-md">
              <BrandLogo size="lg" variant="full" customName={profile?.name || 'مشويات الباشا'} />
            </div>
            <div>
              <h1 className="text-xl font-black text-amber-100 tracking-wide">
                {profile?.name || 'مشويات الباشا'}
              </h1>
              <p className="text-xs text-amber-200/80 font-medium">
                {profile?.slogan || 'نظام إدارة المطاعم والمشويات التجاري'}
              </p>
            </div>
          </div>

          {/* Branch & System Metadata */}
          <div className="w-full space-y-3 py-6">
            <div className="bg-black/20 p-3 rounded-2xl border border-white/10 text-xs text-right space-y-1.5">
              <div className="flex items-center justify-between text-amber-200">
                <span className="font-bold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>الفرع النشط:</span>
                </span>
                <span className="font-bold text-white">{currentBranch?.name || 'الفرع الرئيسي'}</span>
              </div>
              <div className="flex items-center justify-between text-amber-200">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>الإصدار:</span>
                </span>
                <span className="font-mono text-white">v1.0.0 (Windows x64)</span>
              </div>
            </div>

            {/* Production Credentials Guide */}
            <div className="text-[11px] text-amber-100/90 text-right bg-black/20 p-2.5 rounded-xl border border-white/10">
              <span className="font-bold text-amber-200 block mb-1">بيانات دخول المدير الافتراضية:</span>
              <div className="flex items-center justify-between text-[11px] text-amber-100/80">
                <span>اسم المستخدم: <strong className="text-white font-mono">admin</strong></span>
                <span>رمز PIN: <strong className="text-white font-mono">1234</strong></span>
              </div>
            </div>
          </div>

          {/* Setup Wizard Trigger */}
          <button
            type="button"
            onClick={onOpenWizard}
            className="text-[11px] text-amber-200 hover:text-white flex items-center gap-1.5 transition-colors underline underline-offset-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تشغيل معالج الإعداد الأولي (Setup Wizard)</span>
          </button>
        </div>

        {/* Right Side (Authentication PIN Pad & Password Input) */}
        <div className="w-full md:w-7/12 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3 mb-6">
              <div>
                <h2 className="text-lg font-black text-[#231610]">
                  تسجيل الدخول إلى نقطة البيع
                </h2>
                <p className="text-xs text-[#7A6455]">
                  أدخل رمز PIN السريع المكون من 4 أرقام أو اسم المستخدم
                </p>
              </div>

              {/* Method Switcher */}
              <div className="flex bg-[#EFE9DF] p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pin');
                    setErrorMessage(null);
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeTab === 'pin' ? 'bg-[#8B1E1E] text-white shadow-2xs' : 'text-[#6F4E37]'
                  }`}
                >
                  رمز PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('userpass');
                    setErrorMessage(null);
                  }}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeTab === 'userpass' ? 'bg-[#8B1E1E] text-white shadow-2xs' : 'text-[#6F4E37]'
                  }`}
                >
                  اسم المستخدم
                </button>
              </div>
            </div>

            {/* Quick User Selector Chips */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-[#5C4033] mb-1.5 flex items-center justify-between">
                <span>المستخدمون النشطون:</span>
                <span className="text-[10px] text-[#8B1E1E]">({allUsers.length} متاح)</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {allUsers.map((u) => {
                  const isSelected = activeTab === 'userpass' && username === u.username;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setUsername(u.username);
                        if (activeTab === 'pin') {
                          setInputVal('');
                        }
                        setErrorMessage(null);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-xs'
                          : 'bg-white hover:bg-amber-50 text-[#231610] border-[#E8DFD5]'
                      }`}
                      title={`${u.name} (@${u.username})`}
                    >
                      <span className="text-base">{u.avatar || '👤'}</span>
                      <span>{u.name}</span>
                      <span className="text-[9px] opacity-75">
                        ({u.role === 'admin' ? 'مدير' : u.role === 'cashier' ? 'كاشير' : u.role === 'kitchen' ? 'مطبخ' : 'فرع'})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: Quick PIN Pad */}
            {activeTab === 'pin' && (
              <div className="space-y-5">
                {/* PIN Display Dots */}
                <div className="flex items-center justify-center gap-3 py-2 bg-white rounded-2xl border border-[#D7C3A5]">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        inputVal.length > idx
                          ? 'bg-[#8B1E1E] border-[#8B1E1E] scale-110'
                          : 'border-gray-300 bg-gray-100'
                      }`}
                    />
                  ))}
                </div>

                {/* 3x4 Touch POS Keypad */}
                <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => {
                        if (btn === 'C') handleClear();
                        else if (btn === '⌫') handleBackspace();
                        else handlePinDigit(btn);
                      }}
                      className={`h-12 rounded-xl text-base font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center ${
                        btn === 'C'
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs'
                          : btn === '⌫'
                          ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs'
                          : 'bg-white hover:bg-[#F5EFE6] text-[#231610] border border-[#D7C3A5]'
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Username & Password */}
            {activeTab === 'userpass' && (
              <form onSubmit={handleFormSubmit} className="space-y-4 max-w-sm mx-auto py-2">
                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    اسم المستخدم (Username)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#D7C3A5] bg-white text-left pl-8"
                      dir="ltr"
                    />
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#231610] mb-1">
                    كلمة المرور (Password)
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#D7C3A5] bg-white text-left pl-8"
                      dir="ltr"
                    />
                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#8B1E1E] hover:bg-[#681212] text-white text-xs font-bold transition-colors shadow-md mt-2 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>دخول إلى النظام</span>
                </button>
              </form>
            )}
          </div>

          {/* Footer Offline Notice */}
          <div className="pt-4 border-t border-[#E8DFD5] text-[11px] text-[#7A6455] flex items-center justify-between">
            <span>نظام التشغيل المحلي (Offline POS)</span>
            <span className="text-emerald-700 font-bold">● قاعدة البيانات متصلة وجاهزة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
