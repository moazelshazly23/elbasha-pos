import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  Key,
  Shield,
  Phone,
  Mail,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Hash,
  Delete,
  Store,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePOS } from '../../context/POSContext';
import { UserRole } from '../../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_AVATARS = [
  { id: 'chef', emoji: '👨‍🍳', label: 'شيف' },
  { id: 'cashier', emoji: '🧑‍💼', label: 'كاشير' },
  { id: 'manager', emoji: '👔', label: 'مدير' },
  { id: 'grill', emoji: '🔥', label: 'مشويات' },
  { id: 'meat', emoji: '🥩', label: 'كباب' },
  { id: 'crown', emoji: '👑', label: 'الباشا' },
  { id: 'star', emoji: '⭐', label: 'نجم' },
  { id: 'shield', emoji: '🛡️', label: 'حماية' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, currentBranch, updateCurrentUserProfile } = useAuth();
  const { showToast } = usePOS();

  const [activeTab, setActiveTab] = useState<'info' | 'pin' | 'password'>('info');

  // Personal Info Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');

  // PIN Form State
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state when modal opens or currentUser changes
  useEffect(() => {
    if (currentUser && isOpen) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setSelectedAvatar(currentUser.avatar || '');
      setPin(currentUser.pin || '');
      setConfirmPin(currentUser.pin || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'المدير العام (Admin)';
      case 'manager':
        return 'مدير صالة / فرع (Manager)';
      case 'cashier':
        return 'كاشير ومحاسب (Cashier)';
      case 'kitchen':
        return 'شاشة المطبخ KDS (Kitchen)';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-[#8B1E1E] text-white border-amber-500/40';
      case 'manager':
        return 'bg-blue-800 text-white border-blue-400';
      case 'cashier':
        return 'bg-emerald-800 text-white border-emerald-400';
      case 'kitchen':
        return 'bg-amber-800 text-white border-amber-400';
      default:
        return 'bg-gray-800 text-white border-gray-600';
    }
  };

  const handleNumpadPress = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const handleNumpadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleNumpadClear = () => {
    setPin('');
  };

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'فارغة', color: 'bg-gray-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[a-zA-Z\u0600-\u06FF]/.test(pass)) score += 1;
    if (/[^a-zA-Z0-9\u0600-\u06FF]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'ضعيفة', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'متوسطة', color: 'bg-amber-500' };
    return { score: 3, label: 'قوية ومحمية', color: 'bg-emerald-500' };
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Basic Name & Username validations
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسمك الكامل أو اسم العرض.');
      setActiveTab('info');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('يرجى إدخال اسم المستخدم للدخول.');
      setActiveTab('info');
      return;
    }

    // 2. PIN validations if changed
    if (pin && pin.trim() !== '') {
      const clean = pin.trim();
      if (!/^\d{4,6}$/.test(clean)) {
        setErrorMsg('رمز الدخول السريع PIN يجب أن يتكون من 4 إلى 6 أرقام فقط.');
        setActiveTab('pin');
        return;
      }
      if (confirmPin && confirmPin !== clean) {
        setErrorMsg('رمز الدخول السريع وتأكيد الرمز غير متطابقين.');
        setActiveTab('pin');
        return;
      }
    }

    // 3. Password validations if new password entered
    if (newPassword && newPassword.trim() !== '') {
      if (newPassword.length < 4) {
        setErrorMsg('كلمة المرور الجديدة يجب ألا تقل عن 4 خانات.');
        setActiveTab('password');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين.');
        setActiveTab('password');
        return;
      }
      if (currentUser.password && !currentPassword) {
        setErrorMsg('يرجى إدخال كلمة المرور الحالية لتأكيد التغيير.');
        setActiveTab('password');
        return;
      }
    }

    setIsSubmitting(true);

    const result = updateCurrentUserProfile({
      name: name.trim(),
      username: username.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      avatar: selectedAvatar || undefined,
      pin: pin.trim() || undefined,
      currentPassword: currentPassword ? currentPassword.trim() : undefined,
      newPassword: newPassword ? newPassword.trim() : undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      showToast(result.message, 'success');
      onClose();
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E8DFD5] flex flex-col max-h-[92vh] overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#231610] via-[#3E2723] to-[#8B1E1E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-bold shadow-inner">
                {selectedAvatar ? (
                  <span>{selectedAvatar}</span>
                ) : (
                  <span>{(name || currentUser.name || 'م').slice(0, 1)}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-2 border-[#231610] rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">{name || currentUser.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getRoleBadgeColor(
                    currentUser.role
                  )}`}
                >
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  {currentBranch.name}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] text-white/80">@{username || currentUser.username}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#E8DFD5] bg-[#FBF9F6] px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('info');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'info'
                ? 'bg-white text-[#8B1E1E] border-[#8B1E1E] shadow-xs'
                : 'text-[#6F4E37] border-transparent hover:text-[#231610] hover:bg-[#F5EFE6]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>البيانات الشخصية</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('pin');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'pin'
                ? 'bg-white text-[#8B1E1E] border-[#8B1E1E] shadow-xs'
                : 'text-[#6F4E37] border-transparent hover:text-[#231610] hover:bg-[#F5EFE6]'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>رمز الدخول السريع (PIN)</span>
            {currentUser.pin && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="مفعّل" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'password'
                ? 'bg-white text-[#8B1E1E] border-[#8B1E1E] shadow-xs'
                : 'text-[#6F4E37] border-transparent hover:text-[#231610] hover:bg-[#F5EFE6]'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>تغيير كلمة المرور والأمان</span>
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Error Message Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL INFO */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-bold text-[#3E2723] mb-1.5">
                  اختر أيقونة الشيف أو الكاشير (Avatar)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVAILABLE_AVATARS.map((av) => {
                    const isSelected = selectedAvatar === av.emoji;
                    return (
                      <button
                        type="button"
                        key={av.id}
                        onClick={() => setSelectedAvatar(av.emoji)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-[#FFF8EF] border-[#8B1E1E] ring-2 ring-[#8B1E1E]/20 text-[#8B1E1E] shadow-xs'
                            : 'bg-white border-[#E8DFD5] hover:border-[#D7C3A5] text-gray-700'
                        }`}
                      >
                        <span className="text-2xl">{av.emoji}</span>
                        <span className="text-[10px] font-bold">{av.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3E2723] mb-1">
                    الاسم الكامل / اسم العرض <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: أحمد عبد الله"
                      className="w-full px-3 py-2 pr-9 border border-[#D7C3A5] rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E1E] focus:outline-hidden bg-white text-[#231610]"
                      required
                    />
                    <UserIcon className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-[#7A6455] mt-1 block">
                    يظهر هذا الاسم على إيصالات وفواتير الكاشير وسجل المناوبات.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3E2723] mb-1">
                    اسم المستخدم للدخول (Username) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="مثال: ahmed_pos"
                      className="w-full px-3 py-2 pr-9 border border-[#D7C3A5] rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E1E] focus:outline-hidden bg-white text-[#231610] font-mono text-left"
                      dir="ltr"
                      required
                    />
                    <Key className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-[#7A6455] mt-1 block">
                    يُستخدم لتسجيل الدخول إلى النظام (أحرف إنجليزية وأرقام).
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3E2723] mb-1">
                    رقم الهاتف / الجوال (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      className="w-full px-3 py-2 pr-9 border border-[#D7C3A5] rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E1E] focus:outline-hidden bg-white text-[#231610] font-mono text-left"
                      dir="ltr"
                    />
                    <Phone className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3E2723] mb-1">
                    البريد الإلكتروني (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@elbasha-grill.com"
                      className="w-full px-3 py-2 pr-9 border border-[#D7C3A5] rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E1E] focus:outline-hidden bg-white text-[#231610] font-mono text-left"
                      dir="ltr"
                    />
                    <Mail className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Read-only system info */}
              <div className="p-3 bg-[#F5EFE6]/60 rounded-xl border border-[#E8DFD5] flex items-center justify-between text-xs text-[#5C4033]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#8B1E1E]" />
                  <span>
                    الرتبة في النظام: <strong className="text-[#8B1E1E]">{getRoleLabel(currentUser.role)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#7A6455]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>تاريخ التسجيل: {new Date(currentUser.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUICK PIN */}
          {activeTab === 'pin' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">ما هو رمز الدخول السريع (PIN)؟</strong>
                  رمز مكون من 4 إلى 6 أرقام يتيح لك فتح قفل الشاشة سريعاً، التبديل الفوري بين الكاشير بدون كتابة كلمة المرور، وإنهاء العمليات الحساسة في ثوانٍ.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#3E2723] mb-1">
                      رمز PIN الجديد (4 إلى 6 أرقام)
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setPin(val);
                        }}
                        placeholder="••••"
                        className="w-full px-3 py-2.5 pr-9 pl-9 border border-[#D7C3A5] rounded-xl text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-[#8B1E1E] focus:outline-hidden bg-white text-[#231610]"
                        maxLength={6}
                      />
                      <Hash className="w-4 h-4 text-[#8C7665] absolute right-3 top-3.5" />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600"
                        title={showPin ? 'إخفاء' : 'إظهار'}
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#3E2723] mb-1">
                      تأكيد رمز PIN الجديد
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={confirmPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setConfirmPin(val);
                        }}
                        placeholder="••••"
                        className="w-full px-3 py-2.5 pr-9 border border-[#D7C3A5] rounded-xl text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-[#8B1E1E] focus:outline-hidden bg-white text-[#231610]"
                        maxLength={6}
                      />
                      <Hash className="w-4 h-4 text-[#8C7665] absolute right-3 top-3.5" />
                    </div>
                    {pin && confirmPin && (
                      <div className="mt-1 text-[11px] font-bold">
                        {pin === confirmPin ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> الرمزان متطابقان تماماً
                          </span>
                        ) : (
                          <span className="text-red-600">الرمزان غير متطابقين</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-[#7A6455] bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    💡 يمكنك مسح الرمز بالكامل إذا كنت تفضل الدخول بكلمة المرور فقط دون PIN.
                  </div>
                </div>

                {/* Touch Numpad for Touchscreen POS */}
                <div className="bg-[#F8F5F0] p-3 rounded-2xl border border-[#E8DFD5]">
                  <div className="text-[11px] font-bold text-[#5C4033] mb-2 text-center">
                    لوحة الأرقام السريعة لشاشات اللمس
                  </div>
                  <div className="grid grid-cols-3 gap-1.5" dir="ltr">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        type="button"
                        key={digit}
                        onClick={() => handleNumpadPress(digit)}
                        className="h-11 bg-white hover:bg-amber-50 active:bg-amber-100 rounded-xl font-bold text-base text-[#231610] shadow-xs border border-[#E8DFD5] transition-colors"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleNumpadClear}
                      className="h-11 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs shadow-xs border border-red-200 transition-colors"
                    >
                      مسح
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('0')}
                      className="h-11 bg-white hover:bg-amber-50 active:bg-amber-100 rounded-xl font-bold text-base text-[#231610] shadow-xs border border-[#E8DFD5] transition-colors"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleNumpadBackspace}
                      className="h-11 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl flex items-center justify-center shadow-xs border border-amber-200 transition-colors"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PASSWORD & SECURITY */}
          {activeTab === 'password' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">تحديث كلمة مرور الحساب</strong>
                  اترك هذه الحقول فارغة إذا كنت تريد الإبقاء على كلمة المرور الحالية دون تغيير.
                </div>
              </div>

              {currentUser.password && (
                <div>
                  <label className="block text-xs font-bold text-[#3E2723] mb-1">
                    كلمة المرور الحالية <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الحالية لتأكيد هويتك"
                      className="w-full px-3 py-2 pr-9 pl-9 border border-[#D7C3A5] rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E1E] focus:outline-hidden bg-white text-[#231610] text-left"
                      dir="ltr"
                    />
                    <Key className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3E2723] mb-1">
                    كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="كلمة مرور جديدة (4 خانات فأكثر)"
                      className="w-full px-3 py-2 pr-9 pl-9 border border-[#D7C3A5] rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E1E] focus:outline-hidden bg-white text-[#231610] text-left"
                      dir="ltr"
                    />
                    <Lock className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#6F4E37]">مستوى القوة:</span>
                        <span className="font-bold">{passwordStrength.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color} ${
                            passwordStrength.score === 1
                              ? 'w-1/3'
                              : passwordStrength.score === 2
                              ? 'w-2/3'
                              : 'w-full'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3E2723] mb-1">
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد كتابة كلمة المرور الجديدة"
                      className="w-full px-3 py-2 pr-9 pl-9 border border-[#D7C3A5] rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E1E] focus:outline-hidden bg-white text-[#231610] text-left"
                      dir="ltr"
                    />
                    <Lock className="w-4 h-4 text-[#8C7665] absolute right-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newPassword && confirmPassword && (
                    <div className="mt-1 text-[11px] font-bold">
                      {newPassword === confirmPassword ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> كلمات المرور متطابقة
                        </span>
                      ) : (
                        <span className="text-red-600">كلمات المرور غير متطابقة</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#E8DFD5] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#5C4033] hover:bg-[#F5EFE6] rounded-xl transition-colors active:scale-95"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-[#8B1E1E] to-[#A32828] hover:from-[#751919] hover:to-[#8B1E1E] rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
