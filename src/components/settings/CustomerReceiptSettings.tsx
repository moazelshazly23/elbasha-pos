import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Receipt,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Building,
  Phone,
  Globe,
  Facebook,
  Instagram,
  MessageCircle,
  MapPin,
  FileText,
  Sliders,
  Printer,
  Save,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  QrCode as QrCodeIcon,
  HelpCircle,
  Maximize2,
  X,
  Upload,
} from 'lucide-react';
import { Order, RestaurantProfile, ReceiptSettings, ReceiptPhoneEntry } from '../../types';
import { defaultReceiptSettings } from '../../services/seedData';
import { useToast } from '../../context/ToastContext';

interface CustomerReceiptSettingsProps {
  formData: RestaurantProfile;
  setFormData: React.Dispatch<React.SetStateAction<RestaurantProfile>>;
  onSave: () => void;
  onTestPrint: (profile: RestaurantProfile) => void;
}

export const CustomerReceiptSettings: React.FC<CustomerReceiptSettingsProps> = ({
  formData,
  setFormData,
  onSave,
  onTestPrint,
}) => {
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<
    'identity' | 'contact' | 'qr' | 'tax' | 'order_display' | 'footer'
  >('identity');

  const [previewPaperWidth, setPreviewPaperWidth] = useState<'80mm' | '58mm'>(() => {
    return formData.receiptSettings?.paperWidth || formData.thermalPaperWidth === '58mm'
      ? '58mm'
      : '80mm';
  });

  const [showFullPreviewModal, setShowFullPreviewModal] = useState(false);
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string>('');

  // New Phone entry temporary inputs
  const [newPhoneLabel, setNewPhoneLabel] = useState('هاتف رئيسي');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newPhoneShowOnReceipt, setNewPhoneShowOnReceipt] = useState(true);

  // Logo file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure current receipt settings object is always intact
  const rs: ReceiptSettings = formData.receiptSettings || defaultReceiptSettings;

  // Helper to update receipt settings
  const updateRS = <K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => {
    setFormData((prev) => {
      const currentRs = prev.receiptSettings || defaultReceiptSettings;
      const nextRs: ReceiptSettings = { ...currentRs, [key]: value };

      // Sync high-level profile fields when corresponding receipt field changes
      const syncProfile: Partial<RestaurantProfile> = {};
      if (key === 'restaurantNameArabic') syncProfile.name = value as string;
      if (key === 'restaurantNameEnglish') syncProfile.englishName = value as string;
      if (key === 'sloganArabic') syncProfile.slogan = value as string;
      if (key === 'sloganEnglish') syncProfile.sloganEnglish = value as string;
      if (key === 'addressDetails') syncProfile.address = value as string;
      if (key === 'taxNumber') syncProfile.taxNumber = value as string;
      if (key === 'crNumber') syncProfile.crNumber = value as string;
      if (key === 'vatNumber') syncProfile.vatNumber = value as string;
      if (key === 'taxRate') syncProfile.defaultTaxPercent = value as number;
      if (key === 'paperWidth') syncProfile.thermalPaperWidth = value as '80mm' | '58mm';
      if (key === 'headerNote') syncProfile.receiptHeaderNote = value as string;
      if (key === 'footerMessageArabic') syncProfile.receiptFooterNote = value as string;

      return {
        ...prev,
        ...syncProfile,
        receiptSettings: nextRs,
      };
    });
  };

  // Generate Live QR code on any relevant setting change
  useEffect(() => {
    if (!rs.enableQrCode) {
      setLiveQrDataUrl('');
      return;
    }

    let qrContent = '';
    const qrType = rs.qrType || 'tax_einvoice';

    if (qrType === 'custom' && rs.qrUrl) {
      qrContent = rs.qrUrl;
    } else if (qrType === 'website') {
      qrContent = rs.website || formData.website || rs.qrUrl || 'https://example.com';
    } else if (qrType === 'google_maps') {
      qrContent = rs.qrUrl || 'https://maps.google.com';
    } else if (qrType === 'whatsapp') {
      const cleanWa = (rs.whatsAppNumber || formData.whatsapp || '').replace(/\D/g, '');
      qrContent = cleanWa ? `https://wa.me/${cleanWa}` : rs.qrUrl || 'https://wa.me';
    } else if (qrType === 'facebook') {
      qrContent = rs.facebookUrl || formData.facebook || rs.qrUrl || 'https://facebook.com';
    } else if (qrType === 'instagram') {
      qrContent = rs.instagramUrl || formData.instagram || rs.qrUrl || 'https://instagram.com';
    } else if (qrType === 'review') {
      qrContent = rs.qrUrl || 'https://example.com/review';
    } else {
      // Tax / Electronic invoice metadata
      qrContent = JSON.stringify({
        seller: rs.restaurantNameArabic || formData.name,
        trn: rs.taxNumber || formData.taxNumber,
        invoice: '#1258',
        date: new Date().toISOString(),
        total: `315.00 ${formData.currency}`,
        tax: `39.00 ${formData.currency}`,
      });
    }

    if (qrContent) {
      QRCode.toDataURL(qrContent, {
        width: rs.qrSize || 120,
        margin: 1,
        errorCorrectionLevel: 'M',
      })
        .then(setLiveQrDataUrl)
        .catch((err) => {
          console.warn('QR Code generation error:', err);
        });
    }
  }, [
    rs.enableQrCode,
    rs.qrType,
    rs.qrUrl,
    rs.qrSize,
    rs.website,
    rs.whatsAppNumber,
    rs.facebookUrl,
    rs.instagramUrl,
    rs.restaurantNameArabic,
    rs.taxNumber,
    formData.name,
    formData.website,
    formData.whatsapp,
    formData.taxNumber,
    formData.currency,
  ]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('حجم الشعار كبير، يرجى اختيار صورة أقل من 3 ميجابايت', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        logoUrl: dataUrl,
        useOfficialLogo: false,
      }));
      updateRS('showLogo', true);
      showToast('تم تحميل شعار الفاتورة بنجاح', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
      useOfficialLogo: false,
    }));
    showToast('تم إزالة الشعار من الفاتورة', 'info');
  };

  // Multiple Phones Handlers
  const handleAddPhone = () => {
    if (!newPhoneNumber.trim()) {
      showToast('يرجى إدخال رقم الهاتف أولاً', 'warning');
      return;
    }
    const currentList = rs.phones || [];
    const newEntry: ReceiptPhoneEntry = {
      id: `ph-${Date.now()}`,
      label: newPhoneLabel.trim() || 'هاتف',
      number: newPhoneNumber.trim(),
      showOnReceipt: newPhoneShowOnReceipt,
    };
    updateRS('phones', [...currentList, newEntry]);
    setNewPhoneNumber('');
    setNewPhoneLabel('هاتف');
    showToast('تمت إضافة رقم الهاتف', 'success');
  };

  const handleRemovePhone = (id: string) => {
    const currentList = rs.phones || [];
    updateRS(
      'phones',
      currentList.filter((p) => p.id !== id)
    );
    showToast('تم حذف رقم الهاتف', 'info');
  };

  const handleTogglePhoneShow = (id: string) => {
    const currentList = rs.phones || [];
    updateRS(
      'phones',
      currentList.map((p) => (p.id === id ? { ...p, showOnReceipt: !p.showOnReceipt } : p))
    );
  };

  // Clean representative order for Live Mockup Preview
  const sampleOrder: Order = {
    id: 'preview-1001',
    orderNumber: '#1001',
    type: 'dine_in',
    branchId: 'branch-1',
    branchName: 'الفرع الرئيسي',
    cashierId: 'cashier-1',
    cashierName: 'كاشير الصالة',
    tableNumber: '1',
    customerName: 'عميل نقدي',
    customerPhone: formData.phone || '',
    deliveryAddress: formData.address || '',
    deliveryFee: 15,
    items: [
      {
        id: 'it-1',
        productId: 'p-1',
        productNameAr: 'وجبة مشويات فاخرة',
        unitPrice: 90,
        costPrice: 50,
        quantity: 2,
        selectedModifiers: [
          { groupId: 'm-1', groupNameAr: 'إضافات', optionId: 'o-1', nameAr: 'طحينة إضافية', priceDelta: 5 },
        ],
        itemTotal: 185,
        notes: '',
        kitchenStation: 'grill',
        status: 'completed',
      },
      {
        id: 'it-2',
        productId: 'p-2',
        productNameAr: 'طبق أرز وسلطات خضراء',
        unitPrice: 40,
        costPrice: 15,
        quantity: 1,
        selectedModifiers: [],
        itemTotal: 40,
        kitchenStation: 'kitchen',
        status: 'completed',
      },
      {
        id: 'it-3',
        productId: 'p-3',
        productNameAr: 'مشروب بارد',
        unitPrice: 20,
        costPrice: 10,
        quantity: 2,
        selectedModifiers: [],
        itemTotal: 40,
        kitchenStation: 'cold',
        status: 'completed',
      },
    ],
    subtotal: 265,
    discountType: 'percent',
    discountValue: 0,
    discountAmount: 0,
    taxPercent: rs.taxRate ?? formData.defaultTaxPercent,
    taxAmount: Number(((265 * (rs.taxRate ?? formData.defaultTaxPercent)) / 100).toFixed(2)),
    serviceChargePercent: formData.defaultServicePercent,
    serviceChargeAmount: Number(((265 * formData.defaultServicePercent) / 100).toFixed(2)),
    total: Number(
      (
        265 +
        Number(((265 * (rs.taxRate ?? formData.defaultTaxPercent)) / 100).toFixed(2)) +
        Number(((265 * formData.defaultServicePercent) / 100).toFixed(2))
      ).toFixed(2)
    ),
    payments: [
      {
        method: 'cash',
        amount: 350,
      },
    ],
    paidAmount: 350,
    changeAmount: Number(
      (
        350 -
        (265 +
          Number(((265 * (rs.taxRate ?? formData.defaultTaxPercent)) / 100).toFixed(2)) +
          Number(((265 * formData.defaultServicePercent) / 100).toFixed(2)))
      ).toFixed(2)
    ),
    status: 'completed',
    createdAt: new Date().toISOString(),
  };

  // Render Live Receipt Sheet
  const renderLiveReceiptPaper = (isCompact = false) => {
    const is58 = previewPaperWidth === '58mm';
    const logoAlignClass =
      rs.logoAlignment === 'left' ? 'justify-start' : rs.logoAlignment === 'right' ? 'justify-end' : 'justify-center';

    const activePhones =
      rs.phones && rs.phones.length > 0
        ? rs.phones.filter((p) => p.showOnReceipt && p.number)
        : formData.phone
        ? [{ id: '1', number: formData.phone, label: 'هاتف', showOnReceipt: true }]
        : [];

    const socials: string[] = [];
    if (rs.showWhatsApp && (rs.whatsAppNumber || formData.whatsapp)) {
      socials.push(`واتساب: ${rs.whatsAppNumber || formData.whatsapp}`);
    }
    if (rs.showEmail && (rs.email || formData.email)) {
      socials.push(`إيميل: ${rs.email || formData.email}`);
    }
    if (rs.showWebsite && (rs.website || formData.website)) {
      socials.push(`الموقع: ${rs.website || formData.website}`);
    }
    if (rs.showFacebook && (rs.facebookUrl || formData.facebook)) {
      socials.push(`فيسبوك: ${rs.facebookUrl || formData.facebook}`);
    }
    if (rs.showInstagram && (rs.instagramUrl || formData.instagram)) {
      socials.push(`إنستغرام: ${rs.instagramUrl || formData.instagram}`);
    }

    const taxItems: string[] = [];
    if (rs.showTaxNumber && (rs.taxNumber || formData.taxNumber)) {
      taxItems.push(`${rs.taxLabel || 'الرقم الضريبي'}: ${rs.taxNumber || formData.taxNumber}`);
    }
    if (rs.showCrNumber && (rs.crNumber || formData.crNumber)) {
      taxItems.push(`س.ت: ${rs.crNumber || formData.crNumber}`);
    }
    if (rs.showVatNumber && (rs.vatNumber || formData.vatNumber)) {
      taxItems.push(`ض.ق.م: ${rs.vatNumber || formData.vatNumber}`);
    }

    return (
      <div
        className={`${
          is58 ? 'w-[54mm]' : 'w-[76mm]'
        } max-w-full bg-white p-3.5 shadow-md text-black font-mono select-text border border-dashed border-gray-300 rounded-sm mx-auto text-right leading-tight transition-all`}
        style={{ fontSize: is58 ? '10px' : '11px' }}
        dir="rtl"
      >
        {/* Header / Logo */}
        <div className="text-center pb-2.5 border-b border-black">
          {rs.showLogo && formData.logoUrl && (
            <div className={`flex ${logoAlignClass} mb-1.5`}>
              <img
                src={formData.logoUrl}
                alt="Receipt Logo"
                style={{
                  maxWidth: `${rs.logoWidth || (is58 ? 90 : 120)}px`,
                  maxHeight: '75px',
                  filter: 'grayscale(100%) contrast(125%)',
                }}
                className="w-auto h-auto object-contain block"
              />
            </div>
          )}

          {rs.showRestaurantName && (
            <div className={`${is58 ? 'text-sm' : 'text-base'} font-black font-sans text-black leading-tight`}>
              {rs.restaurantNameArabic || formData.name}
            </div>
          )}

          {rs.showEnglishName && (rs.restaurantNameEnglish || formData.englishName) && (
            <div className="text-[10px] font-bold text-gray-700 font-sans tracking-wide mt-0.5">
              {rs.restaurantNameEnglish || formData.englishName}
            </div>
          )}

          {rs.showSlogan && (rs.sloganArabic || formData.slogan) && (
            <div className="text-[9.5px] text-gray-800 font-sans mt-0.5">
              {rs.sloganArabic || formData.slogan}
            </div>
          )}

          {rs.showSlogan && (rs.sloganEnglish || formData.sloganEnglish) && (
            <div className="text-[9px] text-gray-600 font-sans">
              {rs.sloganEnglish || formData.sloganEnglish}
            </div>
          )}

          {rs.showAddress && (rs.addressDetails || formData.address) && (
            <div className="text-[9.5px] text-gray-800 mt-1 leading-normal">
              {rs.addressDetails || formData.address}
            </div>
          )}

          {rs.showPhone && activePhones.length > 0 && (
            <div className="text-[9.5px] text-gray-800 mt-0.5">
              {activePhones.map((p) => (p.label ? `${p.label}: ${p.number}` : p.number)).join(' - ')}
            </div>
          )}

          {socials.length > 0 && (
            <div className="text-[9px] text-gray-700 mt-1 pt-1 border-t border-dotted border-gray-300">
              {socials.join(' • ')}
            </div>
          )}

          {taxItems.length > 0 && (
            <div className="text-[9.5px] font-bold text-gray-900 mt-1">
              {taxItems.join(' | ')}
            </div>
          )}

          {rs.showHeaderNote && (rs.headerNote || formData.receiptHeaderNote) && (
            <div className="text-[9px] italic text-gray-700 mt-1 pt-1 border-t border-dotted border-gray-400 font-sans">
              {rs.headerNote || formData.receiptHeaderNote}
            </div>
          )}
        </div>

        {/* Invoice Meta */}
        <div className="py-2 border-b border-black text-[10px] space-y-1">
          <div className="flex justify-between items-center">
            {rs.showOrderNumber ? (
              <span className="font-extrabold text-xs bg-black text-white px-1.5 py-0.5 rounded-xs">
                {sampleOrder.orderNumber}
              </span>
            ) : <span />}
            {rs.showOrderType && (
              <span className="font-bold text-[11px]">صالات / داخلي</span>
            )}
          </div>

          {rs.showTable && (
            <div className="font-bold text-xs bg-gray-100 border border-black text-center py-0.5 my-1 rounded-xs">
              ★ طاولة رقم: 3 ★
            </div>
          )}

          <div className="flex justify-between text-[9.5px]">
            {rs.showDate ? <span>التاريخ: {new Date().toLocaleDateString('ar-EG')}</span> : <span />}
            {rs.showTime ? <span>الوقت: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span> : <span />}
          </div>

          <div className="flex justify-between text-[9.5px]">
            {rs.showCashier ? <span>الكاشير: أحمد</span> : <span />}
            {rs.showBranch ? <span>الفرع: الفرع الرئيسي</span> : <span />}
          </div>

          {rs.showCustomer && (
            <div className="border-t border-dotted border-gray-400 pt-1 mt-1 text-[9.5px]">
              <div className="font-bold">العميل: كريم عبد العزيز</div>
              <div>الهاتف: 01098765432</div>
            </div>
          )}
        </div>

        {/* Order Items Table */}
        <div className="py-2 border-b border-black">
          <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[10px]">
            <span className="w-1/2">الصنف</span>
            <span className="w-1/6 text-center">الكمية</span>
            <span className="w-1/6 text-center">السعر</span>
            <span className="w-1/6 text-left">الإجمالي</span>
          </div>

          {sampleOrder.items.map((item) => (
            <div key={item.id} className="py-1 border-b border-dotted border-gray-200">
              <div className="flex justify-between font-sans font-semibold text-[11px]">
                <span className="w-1/2 leading-tight">{item.productNameAr}</span>
                <span className="w-1/6 text-center tabular-nums font-bold">x{item.quantity}</span>
                <span className="w-1/6 text-center tabular-nums">{item.unitPrice.toFixed(2)}</span>
                <span className="w-1/6 text-left tabular-nums font-bold">{item.itemTotal.toFixed(2)}</span>
              </div>
              {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                <div className="text-[9px] text-gray-600 pr-2">
                  {item.selectedModifiers.map((m, idx) => (
                    <div key={idx}>+ {m.nameAr}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="py-2 border-b border-black text-[10.5px] space-y-1">
          {rs.showSubtotal && (
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="tabular-nums font-bold">315.00 {formData.currency}</span>
            </div>
          )}

          {rs.showDiscount && (
            <div className="flex justify-between text-black">
              <span>الخصم:</span>
              <span className="tabular-nums font-bold">0.00 {formData.currency}</span>
            </div>
          )}

          {rs.showTax && (
            <div className="flex justify-between">
              <span>{rs.taxLabel || 'ضريبة القيمة المضافة'} ({rs.taxRate ?? formData.defaultTaxPercent}%):</span>
              <span className="tabular-nums font-bold">
                {((315 * (rs.taxRate ?? formData.defaultTaxPercent)) / 100).toFixed(2)} {formData.currency}
              </span>
            </div>
          )}

          {rs.showServiceCharge && (
            <div className="flex justify-between">
              <span>خدمة الصالة ({formData.defaultServicePercent}%):</span>
              <span className="tabular-nums font-bold">
                {((315 * formData.defaultServicePercent) / 100).toFixed(2)} {formData.currency}
              </span>
            </div>
          )}

          {rs.showTotal && (
            <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1.5 mt-1">
              <span>المجموع النهائي:</span>
              <span className="tabular-nums font-sans">
                {(
                  315 +
                  (315 * (rs.taxRate ?? formData.defaultTaxPercent)) / 100 +
                  (315 * formData.defaultServicePercent) / 100
                ).toFixed(2)}{' '}
                {formData.currency}
              </span>
            </div>
          )}
        </div>

        {/* Payments breakdown */}
        {(rs.showPaymentMethod || rs.showPaidAmount || rs.showChange || rs.showRemaining) && (
          <div className="py-2 border-b border-black text-[10px] space-y-0.5">
            <div className="font-bold mb-1">تفاصيل الدفع:</div>
            <div className="flex justify-between">
              <span>{rs.showPaymentMethod ? 'نقدي (Cash):' : 'المدفوع:'}</span>
              {rs.showPaidAmount && <span className="tabular-nums font-bold">400.00 {formData.currency}</span>}
            </div>
            {rs.showChange && (
              <div className="flex justify-between font-bold border-t border-dotted border-gray-400 pt-0.5 mt-0.5">
                <span>الباقي للعميل (Change):</span>
                <span className="tabular-nums">
                  {(
                    400 -
                    (315 +
                      (315 * (rs.taxRate ?? formData.defaultTaxPercent)) / 100 +
                      (315 * formData.defaultServicePercent) / 100)
                  ).toFixed(2)}{' '}
                  {formData.currency}
                </span>
              </div>
            )}
          </div>
        )}

        {/* QR Code & Footer */}
        <div className="pt-2.5 text-center flex flex-col items-center space-y-1.5">
          {rs.enableQrCode && liveQrDataUrl && (
            <div
              className={`w-full flex flex-col items-${
                rs.qrAlignment === 'left' ? 'start' : rs.qrAlignment === 'right' ? 'end' : 'center'
              } my-1`}
            >
              <div
                className="p-1 border border-black bg-white inline-block"
                style={{
                  width: `${rs.qrSize || (is58 ? 85 : 110)}px`,
                  height: `${rs.qrSize || (is58 ? 85 : 110)}px`,
                }}
              >
                <img src={liveQrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
              </div>
              {rs.qrLabel && (
                <div className="text-[9.5px] font-bold text-gray-800 mt-1 max-w-[200px] text-center font-sans">
                  {rs.qrLabel}
                </div>
              )}
            </div>
          )}

          {rs.showFooter && (
            <div className="space-y-0.5 mt-1">
              {(rs.footerMessageArabic || rs.footerMessage || formData.receiptFooterNote) && (
                <div className="text-[10px] font-sans font-bold text-black">
                  {rs.footerMessageArabic || rs.footerMessage || formData.receiptFooterNote}
                </div>
              )}
              {rs.footerMessageEnglish && (
                <div className="text-[9px] font-sans text-gray-700">
                  {rs.footerMessageEnglish}
                </div>
              )}
            </div>
          )}

          <div className="mt-2 text-[8px] text-gray-400 font-mono">
            ✂ - - - - - - - - - - - - - - - - - - ✂
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pt-4 border-t-2 border-[#D7C3A5]">
      {/* Section Header */}
      <div className="bg-[#FFF8EF] p-4 sm:p-5 rounded-2xl border-2 border-[#D7C3A5] flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#8B1E1E] text-white">
              <Receipt className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#231610]">
              🧾 إعدادات فاتورة العميل (Custom Receipt Settings)
            </h2>
          </div>
          <p className="text-xs text-[#6F4E37] max-w-2xl">
            تحكم كامل وديناميكي في تصميم وبيانات الفاتورة الحرارية (اسم المطعم، الشعار، أرقام الهاتف، رمز QR، البيانات الضريبية، والتذييل) وحفظها بقاعدة البيانات.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowFullPreviewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D7C3A5] text-[#231610] text-xs font-extrabold hover:bg-[#F5EFE6] transition-colors shadow-2xs"
          >
            <Eye className="w-4 h-4 text-indigo-700" />
            <span>👁 معاينة الفاتورة</span>
          </button>

          <button
            type="button"
            onClick={() => onTestPrint(formData)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-extrabold hover:bg-[#721616] transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>🖨 طباعة اختبارية</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-black hover:bg-emerald-800 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>حفظ إعدادات الفاتورة</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls on Left / Right + Live Preview on other */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Configuration Tabs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Sub-tab Navigation */}
          <div className="flex flex-wrap gap-1.5 bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#E8DFD5]">
            <button
              type="button"
              onClick={() => setActiveSubTab('identity')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeSubTab === 'identity'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#6F4E37] hover:bg-white/80'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>الهوية والشعار</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('contact')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeSubTab === 'contact'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#6F4E37] hover:bg-white/80'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>العنوان والهواتف</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('qr')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeSubTab === 'qr'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#6F4E37] hover:bg-white/80'
              }`}
            >
              <QrCodeIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>رمز QR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('tax')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeSubTab === 'tax'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#6F4E37] hover:bg-white/80'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>البيانات الضريبية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('order_display')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeSubTab === 'order_display'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#6F4E37] hover:bg-white/80'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>عرض الطلب والحسابات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('footer')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeSubTab === 'footer'
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#6F4E37] hover:bg-white/80'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>التذييل والورق</span>
            </button>
          </div>

          {/* Sub-Tab 1: Identity, Logo & Slogan */}
          {activeSubTab === 'identity' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs">
              <h3 className="font-extrabold text-sm text-[#231610] pb-2 border-b border-[#E8DFD5] flex items-center justify-between">
                <span>هوية المطعم والشعار على الفاتورة</span>
                <span className="text-[11px] text-gray-500 font-normal">بيانات ديناميكية للمطعم الحالي</span>
              </h3>

              {/* Restaurant Name Arabic & English */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#231610]">اسم المطعم بالعربي</label>
                    <label className="flex items-center gap-1 text-[11px] text-[#6F4E37] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rs.showRestaurantName}
                        onChange={(e) => updateRS('showRestaurantName', e.target.checked)}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>إظهار</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={rs.restaurantNameArabic || formData.name}
                    onChange={(e) => updateRS('restaurantNameArabic', e.target.value)}
                    placeholder="مثلاً: مشويات الباشا"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#231610]">اسم المطعم بالإنجليزي</label>
                    <label className="flex items-center gap-1 text-[11px] text-[#6F4E37] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rs.showEnglishName}
                        onChange={(e) => updateRS('showEnglishName', e.target.checked)}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>إظهار</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={rs.restaurantNameEnglish || formData.englishName || ''}
                    onChange={(e) => updateRS('restaurantNameEnglish', e.target.value)}
                    placeholder="مثلاً: EL BASHA GRILL"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white text-left font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Slogans */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DFD5] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#231610]">شعار المطعم (Slogan)</span>
                  <label className="flex items-center gap-1.5 text-xs text-[#6F4E37] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rs.showSlogan}
                      onChange={(e) => updateRS('showSlogan', e.target.checked)}
                      className="rounded text-[#8B1E1E]"
                    />
                    <span>إظهار الشعار (Show Slogan ON/OFF)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">الشعار بالعربي</label>
                    <input
                      type="text"
                      value={rs.sloganArabic || formData.slogan || ''}
                      onChange={(e) => updateRS('sloganArabic', e.target.value)}
                      placeholder="مثلاً: مشويات .. أصالة الطعم"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">الشعار بالإنجليزي</label>
                    <input
                      type="text"
                      value={rs.sloganEnglish || formData.sloganEnglish || ''}
                      onChange={(e) => updateRS('sloganEnglish', e.target.value)}
                      placeholder="مثلاً: Authentic Taste"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white text-left font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Management */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DFD5] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#231610]">شعار الفاتورة (Logo)</span>
                  <label className="flex items-center gap-1.5 text-xs text-[#6F4E37] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rs.showLogo}
                      onChange={(e) => updateRS('showLogo', e.target.checked)}
                      className="rounded text-[#8B1E1E]"
                    />
                    <span>إظهار الشعار بالفاتورة</span>
                  </label>
                </div>

                {/* Logo Upload & Preview Box */}
                <div className="flex flex-wrap items-center gap-4 bg-white p-3.5 rounded-xl border border-[#E8DFD5]">
                  <div className="w-20 h-20 rounded-xl bg-[#FAF7F2] border border-dashed border-gray-300 flex items-center justify-center p-1.5 overflow-hidden">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400 text-center font-bold">لا يوجد شعار</span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <div className="text-xs font-bold text-[#231610]">صورة الشعار الحالية</div>
                    <p className="text-[11px] text-gray-500">
                      يتم الحفاظ الكامل على أبعاد الصورة (Aspect Ratio) بدون أي اقتصاص أو تشويه.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B1E1E] text-white text-xs font-bold rounded-lg hover:bg-[#721616]"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{formData.logoUrl ? 'استبدال الشعار' : 'رفع شعار جديد'}</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />

                      {formData.logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>إزالة الشعار</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo Alignment & Width */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      محاذاة الشعار (Logo Alignment)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['right', 'center', 'left'] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateRS('logoAlignment', align)}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors ${
                            rs.logoAlignment === align
                              ? 'bg-[#8B1E1E] text-white border-[#8B1E1E]'
                              : 'bg-white border-[#D7C3A5] text-[#6F4E37] hover:bg-[#F5EFE6]'
                          }`}
                        >
                          {align === 'right' ? 'يمين' : align === 'center' ? 'وسط' : 'يسار'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-gray-700">
                        عرض الشعار بالفاتورة (Logo Width)
                      </label>
                      <span className="text-xs font-mono font-bold text-[#8B1E1E]">
                        {rs.logoWidth || 120} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="200"
                      step="5"
                      value={rs.logoWidth || 120}
                      onChange={(e) => updateRS('logoWidth', parseInt(e.target.value) || 120)}
                      className="w-full accent-[#8B1E1E] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Address, Phones & Socials */}
          {activeSubTab === 'contact' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs">
              <h3 className="font-extrabold text-sm text-[#231610] pb-2 border-b border-[#E8DFD5]">
                العنوان الكامل وأرقام الهواتف وقنوات التواصل
              </h3>

              {/* Full Address */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#231610] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>العنوان الكامل للمطعم (المحافظة / المدينة / المنطقة / الشارع)</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-[#6F4E37] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rs.showAddress}
                      onChange={(e) => updateRS('showAddress', e.target.checked)}
                      className="rounded text-[#8B1E1E]"
                    />
                    <span>إظهار العنوان بالفاتورة</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={rs.addressDetails || formData.address}
                  onChange={(e) => updateRS('addressDetails', e.target.value)}
                  placeholder="مثال: الجيزة / المهندسين / شارع جامعة الدول العربية"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-medium"
                />
              </div>

              {/* Multiple Phone Numbers Manager */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DFD5] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#231610] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>إدارة أرقام الهواتف المتعددة للفاتورة</span>
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-[#6F4E37] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rs.showPhone}
                      onChange={(e) => updateRS('showPhone', e.target.checked)}
                      className="rounded text-[#8B1E1E]"
                    />
                    <span>إظهار الهواتف بالفاتورة</span>
                  </label>
                </div>

                {/* Phone List */}
                <div className="space-y-2">
                  {(rs.phones || []).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-[#E8DFD5]"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={p.label || ''}
                          onChange={(e) => {
                            const updated = (rs.phones || []).map((item) =>
                              item.id === p.id ? { ...item, label: e.target.value } : item
                            );
                            updateRS('phones', updated);
                          }}
                          placeholder="مسمى الرقم"
                          className="w-28 px-2 py-1 text-xs rounded-lg border border-gray-300 font-bold"
                        />
                        <input
                          type="text"
                          value={p.number}
                          onChange={(e) => {
                            const updated = (rs.phones || []).map((item) =>
                              item.id === p.id ? { ...item, number: e.target.value } : item
                            );
                            updateRS('phones', updated);
                          }}
                          placeholder="الرقم"
                          className="w-36 px-2 py-1 text-xs rounded-lg border border-gray-300 font-mono text-left"
                          dir="ltr"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={p.showOnReceipt}
                            onChange={() => handleTogglePhoneShow(p.id)}
                            className="rounded text-[#8B1E1E]"
                          />
                          <span>ظهور بالفاتورة</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemovePhone(p.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add New Phone */}
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-white/70 rounded-xl border border-dashed border-[#D7C3A5]">
                    <input
                      type="text"
                      value={newPhoneLabel}
                      onChange={(e) => setNewPhoneLabel(e.target.value)}
                      placeholder="التسمية (مثلاً: هاتف 2)"
                      className="w-28 px-2.5 py-1.5 text-xs rounded-xl border border-gray-300"
                    />
                    <input
                      type="text"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      placeholder="رقم الهاتف (مثلاً: 01012345678)"
                      className="flex-1 min-w-[150px] px-2.5 py-1.5 text-xs rounded-xl border border-gray-300 text-left font-mono"
                      dir="ltr"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPhoneShowOnReceipt}
                        onChange={(e) => setNewPhoneShowOnReceipt(e.target.checked)}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>ظهور</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddPhone}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#8B1E1E] text-white text-xs font-bold rounded-xl hover:bg-[#721616]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة رقم</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Social Channels & Links */}
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-[#231610] block">
                  قنوات التواصل والموقع الإلكتروني (مع خيار إظهار/إخفاء كل عنصر)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* WhatsApp */}
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8DFD5] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>رقم الواتساب (WhatsApp)</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rs.showWhatsApp}
                          onChange={(e) => updateRS('showWhatsApp', e.target.checked)}
                          className="rounded text-[#8B1E1E]"
                        />
                        <span>إظهار</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={rs.whatsAppNumber || formData.whatsapp || ''}
                      onChange={(e) => updateRS('whatsAppNumber', e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white font-mono text-left"
                      dir="ltr"
                    />
                  </div>

                  {/* Email */}
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8DFD5] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-gray-800">البريد الإلكتروني (Email)</label>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rs.showEmail}
                          onChange={(e) => updateRS('showEmail', e.target.checked)}
                          className="rounded text-[#8B1E1E]"
                        />
                        <span>إظهار</span>
                      </label>
                    </div>
                    <input
                      type="email"
                      value={rs.email || formData.email || ''}
                      onChange={(e) => updateRS('email', e.target.value)}
                      placeholder="info@restaurant.com"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white font-mono text-left"
                      dir="ltr"
                    />
                  </div>

                  {/* Website */}
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8DFD5] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>الموقع الإلكتروني (Website)</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rs.showWebsite}
                          onChange={(e) => updateRS('showWebsite', e.target.checked)}
                          className="rounded text-[#8B1E1E]"
                        />
                        <span>إظهار</span>
                      </label>
                    </div>
                    <input
                      type="url"
                      value={rs.website || formData.website || ''}
                      onChange={(e) => updateRS('website', e.target.value)}
                      placeholder="https://restaurant.com"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white font-mono text-left"
                      dir="ltr"
                    />
                  </div>

                  {/* Facebook */}
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8DFD5] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                        <Facebook className="w-3.5 h-3.5 text-blue-700" />
                        <span>صفحة الفيسبوك (Facebook)</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rs.showFacebook}
                          onChange={(e) => updateRS('showFacebook', e.target.checked)}
                          className="rounded text-[#8B1E1E]"
                        />
                        <span>إظهار</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={rs.facebookUrl || formData.facebook || ''}
                      onChange={(e) => updateRS('facebookUrl', e.target.value)}
                      placeholder="https://facebook.com/page"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white font-mono text-left"
                      dir="ltr"
                    />
                  </div>

                  {/* Instagram */}
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8DFD5] space-y-1.5 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                        <Instagram className="w-3.5 h-3.5 text-pink-600" />
                        <span>حساب إنستغرام (Instagram)</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rs.showInstagram}
                          onChange={(e) => updateRS('showInstagram', e.target.checked)}
                          className="rounded text-[#8B1E1E]"
                        />
                        <span>إظهار</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={rs.instagramUrl || formData.instagram || ''}
                      onChange={(e) => updateRS('instagramUrl', e.target.value)}
                      placeholder="https://instagram.com/page"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: QR Code Settings */}
          {activeSubTab === 'qr' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8DFD5]">
                <h3 className="font-extrabold text-sm text-[#231610] flex items-center gap-2">
                  <QrCodeIcon className="w-4 h-4 text-[#8B1E1E]" />
                  <span>🔲 إعدادات رمز الاستجابة السريعة (QR Code Settings)</span>
                </h3>
                <label className="flex items-center gap-2 text-xs font-bold text-[#8B1E1E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rs.enableQrCode}
                    onChange={(e) => updateRS('enableQrCode', e.target.checked)}
                    className="rounded text-[#8B1E1E]"
                  />
                  <span>تفعيل رمز QR بالفاتورة (Enable QR Code ON/OFF)</span>
                </label>
              </div>

              {/* QR Source Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#231610]">
                  مصدر كود الـ QR (QR Code Source):
                </label>
                <select
                  value={rs.qrType || 'tax_einvoice'}
                  onChange={(e) => {
                    const nextType = e.target.value as ReceiptSettings['qrType'];
                    updateRS('qrType', nextType);
                    // Prepopulate suggested label if default
                    if (nextType === 'review' && !rs.qrLabel) {
                      updateRS('qrLabel', 'امسح الكود لتقييم تجربتك');
                    } else if (nextType === 'facebook' && !rs.qrLabel) {
                      updateRS('qrLabel', 'تابعنا على فيسبوك');
                    } else if (nextType === 'website' && !rs.qrLabel) {
                      updateRS('qrLabel', 'زوروا موقعنا الإلكتروني');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                >
                  <option value="tax_einvoice">الفاتورة الإلكترونية والبيانات الضريبية (Tax e-Invoice)</option>
                  <option value="website">موقع المطعم الإلكتروني (Website)</option>
                  <option value="review">رابط تقييم تجربة العميل (Review Link)</option>
                  <option value="google_maps">رابط خرائط جوجل والفرع (Google Maps)</option>
                  <option value="whatsapp">محادثة واتساب سريعة (WhatsApp)</option>
                  <option value="facebook">صفحة الفيسبوك (Facebook)</option>
                  <option value="instagram">صفحة الإنستغرام (Instagram)</option>
                  <option value="custom">رابط مخصص (Custom URL)</option>
                </select>
              </div>

              {/* QR URL Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#231610]">
                  الرابط المشفر داخل الـ QR (QR URL):
                </label>
                <input
                  type="text"
                  value={rs.qrUrl || ''}
                  onChange={(e) => updateRS('qrUrl', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-mono text-left"
                  dir="ltr"
                />
                <span className="text-[11px] text-gray-500 block">
                  عند تغيير هذا الرابط، يتحدث الـ QR Preview والمعاينة فورياً دون إعادة تحميل الصفحة.
                </span>
              </div>

              {/* QR Label Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#231610]">
                  النص التوضيحي أسفل الـ QR (QR Code Label):
                </label>
                <input
                  type="text"
                  value={rs.qrLabel || ''}
                  onChange={(e) => updateRS('qrLabel', e.target.value)}
                  placeholder="مثلاً: امسح الكود لتقييم تجربتك أو طلب فاتورة إلكترونية"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                />
              </div>

              {/* QR Alignment & Size Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    محاذاة الـ QR (Alignment)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['right', 'center', 'left'] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => updateRS('qrAlignment', align)}
                        className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors ${
                          rs.qrAlignment === align
                            ? 'bg-[#8B1E1E] text-white border-[#8B1E1E]'
                            : 'bg-white border-[#D7C3A5] text-[#6F4E37] hover:bg-[#F5EFE6]'
                        }`}
                      >
                        {align === 'right' ? 'يمين' : align === 'center' ? 'وسط' : 'يسار'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-gray-700">
                      حجم الـ QR (Size in px)
                    </label>
                    <span className="text-xs font-mono font-bold text-[#8B1E1E]">
                      {rs.qrSize || 110} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="75"
                    max="160"
                    step="5"
                    value={rs.qrSize || 110}
                    onChange={(e) => updateRS('qrSize', parseInt(e.target.value) || 110)}
                    className="w-full accent-[#8B1E1E] cursor-pointer"
                  />
                </div>
              </div>

              {/* Live QR Box Inside Settings */}
              <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E8DFD5] flex flex-col items-center justify-center space-y-2">
                <span className="text-xs font-bold text-[#231610]">معاينة كود الـ QR الحية (Live QR Preview)</span>
                {liveQrDataUrl ? (
                  <div className="p-2 bg-white border border-gray-300 rounded-xl shadow-xs">
                    <img
                      src={liveQrDataUrl}
                      alt="Live QR"
                      style={{ width: `${rs.qrSize || 110}px`, height: `${rs.qrSize || 110}px` }}
                      className="block object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 rounded-xl">
                    كود QR معطل
                  </div>
                )}
                {rs.qrLabel && (
                  <span className="text-xs font-bold text-gray-700 text-center max-w-xs">{rs.qrLabel}</span>
                )}
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Tax & Regulatory */}
          {activeSubTab === 'tax' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs">
              <h3 className="font-extrabold text-sm text-[#231610] pb-2 border-b border-[#E8DFD5]">
                البيانات الضريبية والتنظيمية على الفاتورة
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tax Number */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#231610]">الرقم الضريبي (Tax Number)</label>
                    <label className="flex items-center gap-1 text-[11px] text-[#6F4E37] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rs.showTaxNumber}
                        onChange={(e) => updateRS('showTaxNumber', e.target.checked)}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>إظهار</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={rs.taxNumber || formData.taxNumber}
                    onChange={(e) => updateRS('taxNumber', e.target.value)}
                    placeholder="مثلاً: 482-910-384"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {/* Commercial Registration (CR) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#231610]">السجل التجاري (Commercial Reg.)</label>
                    <label className="flex items-center gap-1 text-[11px] text-[#6F4E37] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rs.showCrNumber}
                        onChange={(e) => updateRS('showCrNumber', e.target.checked)}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>إظهار</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={rs.crNumber || formData.crNumber}
                    onChange={(e) => updateRS('crNumber', e.target.value)}
                    placeholder="مثلاً: 984210"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {/* VAT Number */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#231610]">رقم ضريبة القيمة المضافة (VAT)</label>
                    <label className="flex items-center gap-1 text-[11px] text-[#6F4E37] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rs.showVatNumber}
                        onChange={(e) => updateRS('showVatNumber', e.target.checked)}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>إظهار</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={rs.vatNumber || formData.vatNumber || ''}
                    onChange={(e) => updateRS('vatNumber', e.target.value)}
                    placeholder="مثلاً: EG-482910384"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {/* Tax Label */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#231610]">
                    مسمى الضريبة المطبوع (Tax Label)
                  </label>
                  <input
                    type="text"
                    value={rs.taxLabel || formData.taxLabel || 'ضريبة القيمة المضافة'}
                    onChange={(e) => updateRS('taxLabel', e.target.value)}
                    placeholder="ضريبة القيمة المضافة (VAT)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                  />
                </div>

                {/* Tax Rate % */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-[#231610]">
                    نسبة الضريبة الافتراضية (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={rs.taxRate ?? formData.defaultTaxPercent}
                    onChange={(e) => updateRS('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 5: Order Details, Calculations & Payment Info */}
          {activeSubTab === 'order_display' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs">
              <h3 className="font-extrabold text-sm text-[#231610] pb-2 border-b border-[#E8DFD5]">
                خيارات إظهار حقول الطلب والحسابات والدفع
              </h3>

              {/* 1. Order Info Flags */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-[#231610] block">
                  بيانات الطلب الرئيسية (Order Info):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { key: 'showOrderNumber' as const, label: 'رقم الطلب' },
                    { key: 'showDate' as const, label: 'التاريخ' },
                    { key: 'showTime' as const, label: 'الوقت' },
                    { key: 'showCashier' as const, label: 'اسم الكاشير' },
                    { key: 'showCustomer' as const, label: 'بيانات العميل' },
                    { key: 'showTable' as const, label: 'رقم الطاولة' },
                    { key: 'showOrderType' as const, label: 'نوع الطلب' },
                    { key: 'showBranch' as const, label: 'اسم الفرع' },
                  ].map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-[#FAF7F2] text-xs font-bold text-[#231610] cursor-pointer hover:bg-white transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={rs[field.key]}
                        onChange={(e) => updateRS(field.key, e.target.checked)}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Financial Calculations Flags */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-xs font-extrabold text-[#231610] block">
                  حسابات الفاتورة والأسعار (Calculations):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { key: 'showSubtotal' as const, label: 'المجموع الفرعي' },
                    { key: 'showDiscount' as const, label: 'الخصومات' },
                    { key: 'showTax' as const, label: 'مبلغ الضريبة' },
                    { key: 'showServiceCharge' as const, label: 'خدمة الصالة' },
                    { key: 'showDeliveryFee' as const, label: 'رسوم التوصيل' },
                    { key: 'showTotal' as const, label: 'المجموع النهائي' },
                  ].map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-[#FAF7F2] text-xs font-bold text-[#231610] cursor-pointer hover:bg-white transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={rs[field.key] ?? true}
                        onChange={(e) => updateRS(field.key, e.target.checked)}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Payment Details Flags */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-xs font-extrabold text-[#231610] block">
                  تفاصيل السداد والتحصيل (Payment Information):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { key: 'showPaymentMethod' as const, label: 'طريقة الدفع' },
                    { key: 'showPaidAmount' as const, label: 'المبلغ المدفوع' },
                    { key: 'showChange' as const, label: 'الباقي للعميل' },
                    { key: 'showRemaining' as const, label: 'المتبقي الآجل' },
                  ].map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-[#FAF7F2] text-xs font-bold text-[#231610] cursor-pointer hover:bg-white transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={rs[field.key]}
                        onChange={(e) => updateRS(field.key, e.target.checked)}
                        className="rounded text-[#8B1E1E]"
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 6: Footer & Paper Configuration */}
          {activeSubTab === 'footer' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E8DFD5] space-y-5 shadow-xs">
              <h3 className="font-extrabold text-sm text-[#231610] pb-2 border-b border-[#E8DFD5]">
                رسائل الترحيب والشكر وتخصيص الورق الحراري
              </h3>

              {/* Header Note */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#231610]">
                    رسالة ترحيب رأس الفاتورة (Header Note)
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-[#6F4E37] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rs.showHeaderNote ?? true}
                      onChange={(e) => updateRS('showHeaderNote', e.target.checked)}
                      className="rounded text-[#8B1E1E]"
                    />
                    <span>إظهار</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={rs.headerNote || formData.receiptHeaderNote || ''}
                  onChange={(e) => updateRS('headerNote', e.target.value)}
                  placeholder="أهلاً بكم في مطعمنا - نسعد بخدمتكم دائماً"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-medium"
                />
              </div>

              {/* Footer Note Arabic & English */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DFD5] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#231610]">
                    رسالة شكر تذييل الفاتورة (Receipt Footer)
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-[#6F4E37] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rs.showFooter}
                      onChange={(e) => updateRS('showFooter', e.target.checked)}
                      className="rounded text-[#8B1E1E]"
                    />
                    <span>إظهار التذييل (Show Footer ON/OFF)</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      رسالة الشكر بالعربي (Arabic Footer Message)
                    </label>
                    <input
                      type="text"
                      value={rs.footerMessageArabic || rs.footerMessage || formData.receiptFooterNote || ''}
                      onChange={(e) => {
                        updateRS('footerMessageArabic', e.target.value);
                        updateRS('footerMessage', e.target.value);
                      }}
                      placeholder="شكراً لزيارتكم ❤️ نتمنى لكم وجبة هنيئة!"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">
                      رسالة الشكر بالإنجليزي (English Footer Message)
                    </label>
                    <input
                      type="text"
                      value={rs.footerMessageEnglish || ''}
                      onChange={(e) => updateRS('footerMessageEnglish', e.target.value)}
                      placeholder="Thank You For Visiting Us"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white text-left font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Paper Width Selection */}
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DFD5] space-y-2">
                <span className="text-xs font-extrabold text-[#231610] block">
                  عرض الورق الحراري الافتراضي (Thermal Paper Width)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {(['80mm', '58mm'] as const).map((width) => (
                    <button
                      key={width}
                      type="button"
                      onClick={() => {
                        updateRS('paperWidth', width);
                        setPreviewPaperWidth(width);
                      }}
                      className={`p-3 rounded-xl border text-right transition-colors ${
                        (rs.paperWidth || formData.thermalPaperWidth) === width
                          ? 'bg-[#8B1E1E] text-white border-[#8B1E1E] shadow-2xs'
                          : 'bg-white border-[#D7C3A5] text-[#231610] hover:bg-[#F5EFE6]'
                      }`}
                    >
                      <div className="font-bold text-xs">
                        {width === '80mm' ? 'ورق قياسي (80mm)' : 'ورق مدمج (58mm)'}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          (rs.paperWidth || formData.thermalPaperWidth) === width
                            ? 'text-red-100'
                            : 'text-gray-500'
                        }`}
                      >
                        {width === '80mm'
                          ? 'العرض القياسي لمطاعم الكاشير ومحطات الخدمة'
                          : 'للطابعات الصغيرة المحمولة والـ Bluetooth'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Preview Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs space-y-3 sticky top-4">
            <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-2.5">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#8B1E1E]" />
                <span className="font-extrabold text-xs text-[#231610]">
                  معاينة حية فورية للفاتورة (Live Preview)
                </span>
              </div>

              {/* 80mm / 58mm Toggle */}
              <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-gray-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewPaperWidth('80mm')}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${
                    previewPaperWidth === '80mm'
                      ? 'bg-[#8B1E1E] text-white'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPaperWidth('58mm')}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${
                    previewPaperWidth === '58mm'
                      ? 'bg-[#8B1E1E] text-white'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  58mm
                </button>
              </div>
            </div>

            {/* Scrollable Receipt Preview Container */}
            <div className="max-h-[620px] overflow-y-auto bg-[#F4EFE6] p-3 rounded-xl border border-[#D7C3A5]">
              {renderLiveReceiptPaper()}
            </div>

            {/* Preview Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowFullPreviewModal(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#D7C3A5] text-[#231610] text-xs font-bold hover:bg-[#F5EFE6]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>تكبير المعاينة</span>
              </button>

              <button
                type="button"
                onClick={() => onTestPrint(formData)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616]"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة تجريبية</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      {showFullPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#E8DFD5]">
            <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#8B1E1E]" />
                <span className="font-extrabold text-sm text-[#231610]">
                  معاينة فاتورة العميل ({previewPaperWidth})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewPaperWidth('80mm')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      previewPaperWidth === '80mm'
                        ? 'bg-[#8B1E1E] text-white'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    80mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPaperWidth('58mm')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      previewPaperWidth === '58mm'
                        ? 'bg-[#8B1E1E] text-white'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    58mm
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFullPreviewModal(false)}
                  className="p-1 rounded-lg text-gray-500 hover:bg-[#EAE0D2]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-gray-100 flex justify-center">
              {renderLiveReceiptPaper()}
            </div>

            <div className="p-3 bg-white border-t border-[#E8DFD5] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowFullPreviewModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                إغلاق
              </button>

              <button
                type="button"
                onClick={() => onTestPrint(formData)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616]"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة على الطابعة الفعلية ({previewPaperWidth})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
