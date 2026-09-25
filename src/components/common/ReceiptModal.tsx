import React, { useRef, useState, useEffect } from 'react';
import { Printer, X, Download, Check, Share2, CheckCircle2, RefreshCw } from 'lucide-react';
import { Order } from '../../types';
import { useBrand } from '../../context/BrandContext';
import { BrandLogo } from './BrandLogo';
import { printReceipt, generateReceiptQRCode } from '../../utils/thermalPrinter';

interface ReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, isOpen, onClose }) => {
  const { profile, updateProfile } = useBrand();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  useEffect(() => {
    if (order) {
      generateReceiptQRCode(order, profile).then((url) => {
        setQrDataUrl(url);
      });
    }
  }, [order, profile]);

  if (!isOpen || !order) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    await printReceipt(order, profile);
    setIsPrinting(false);
  };

  const getOrderTypeName = (type: Order['type']) => {
    switch (type) {
      case 'dine_in':
        return 'صالات / داخلي (Dine-in)';
      case 'takeaway':
        return 'سفري / تيك أواي (Takeaway)';
      case 'delivery':
        return 'توصيل منازل (Delivery)';
      case 'pickup':
        return 'استلام من الفرع (Pickup)';
      default:
        return 'طلب مباشر';
    }
  };

  const rs = profile.receiptSettings;
  const is58mm = (rs?.paperWidth || profile.thermalPaperWidth) === '58mm';

  // Logo settings
  const showLogo = rs ? rs.showLogo : true;
  const logoAlign = rs?.logoAlignment || 'center';
  const logoWidth = rs?.logoWidth || (is58mm ? 90 : 120);

  // Identity settings
  const showRestName = rs ? rs.showRestaurantName : true;
  const restNameArabic = rs?.restaurantNameArabic || profile.name;
  const showEngName = rs ? rs.showEnglishName : true;
  const restNameEnglish = rs?.restaurantNameEnglish || profile.englishName;
  const showSlogan = rs ? rs.showSlogan : true;
  const sloganAr = rs?.sloganArabic || profile.slogan;
  const sloganEn = rs?.sloganEnglish || profile.sloganEnglish;
  const showAddress = rs ? rs.showAddress : true;
  const addressText = rs?.addressDetails || profile.address;

  // Phone list
  const showPhone = rs ? rs.showPhone : true;
  let activePhoneNumbers: string[] = [];
  if (rs?.phones && rs.phones.length > 0) {
    activePhoneNumbers = rs.phones
      .filter((p) => p.showOnReceipt && p.number)
      .map((p) => (p.label ? `${p.label}: ${p.number}` : p.number));
  } else if (profile.phone) {
    activePhoneNumbers = [profile.phone];
    if (profile.phone2) activePhoneNumbers.push(profile.phone2);
  }

  // Socials list
  const socialLinks: string[] = [];
  if (rs?.showWhatsApp && (rs.whatsAppNumber || profile.whatsapp)) {
    socialLinks.push(`واتساب: ${rs.whatsAppNumber || profile.whatsapp}`);
  }
  if (rs?.showEmail && (rs.email || profile.email)) {
    socialLinks.push(`إيميل: ${rs.email || profile.email}`);
  }
  if (rs?.showWebsite && (rs.website || profile.website)) {
    socialLinks.push(`الموقع: ${rs.website || profile.website}`);
  }
  if (rs?.showFacebook && (rs.facebookUrl || profile.facebook)) {
    socialLinks.push(`فيسبوك: ${rs.facebookUrl || profile.facebook}`);
  }
  if (rs?.showInstagram && (rs.instagramUrl || profile.instagram)) {
    socialLinks.push(`إنستغرام: ${rs.instagramUrl || profile.instagram}`);
  }

  // Tax Info
  const taxItems: string[] = [];
  if ((rs ? rs.showTaxNumber : true) && (rs?.taxNumber || profile.taxNumber)) {
    const label = rs?.taxLabel || profile.taxLabel || 'الرقم الضريبي';
    taxItems.push(`${label}: ${rs?.taxNumber || profile.taxNumber}`);
  }
  if ((rs ? rs.showCrNumber : true) && (rs?.crNumber || profile.crNumber)) {
    taxItems.push(`س.ت: ${rs?.crNumber || profile.crNumber}`);
  }
  if ((rs ? rs.showVatNumber : false) && (rs?.vatNumber || profile.vatNumber)) {
    taxItems.push(`ض.ق.م: ${rs?.vatNumber || profile.vatNumber}`);
  }

  // Header Note
  const showHeaderNote = rs ? rs.showHeaderNote : true;
  const headerNoteText = rs?.headerNote || profile.receiptHeaderNote;

  // Order Info Flags
  const showOrderNumber = rs ? rs.showOrderNumber : true;
  const showDate = rs ? rs.showDate : true;
  const showTime = rs ? rs.showTime : true;
  const showCashier = rs ? rs.showCashier : true;
  const showCustomer = rs ? rs.showCustomer : true;
  const showTable = rs ? rs.showTable : true;
  const showOrderType = rs ? rs.showOrderType : true;
  const showBranch = rs ? rs.showBranch : true;

  // Financial Flags
  const showSubtotal = rs ? rs.showSubtotal : true;
  const showDiscount = rs ? rs.showDiscount : true;
  const showTax = rs ? rs.showTax : true;
  const showServiceCharge = rs ? (rs.showServiceCharge ?? true) : true;
  const showDeliveryFee = rs ? rs.showDeliveryFee : true;
  const showTotal = rs ? rs.showTotal : true;

  // Payment Flags
  const showPaymentMethod = rs ? rs.showPaymentMethod : true;
  const showPaidAmount = rs ? rs.showPaidAmount : true;
  const showChange = rs ? rs.showChange : true;
  const showRemaining = rs ? rs.showRemaining : false;

  // Footer Flags
  const showFooter = rs ? rs.showFooter : true;
  const footerAr = rs?.footerMessageArabic || rs?.footerMessage || profile.receiptFooterNote;
  const footerEn = rs?.footerMessageEnglish;
  const remainingAmount = Math.max(0, order.total - order.paidAmount);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[94vh] flex flex-col overflow-hidden border border-[#E8DFD5]">
        {/* Modal Header */}
        <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#8B1E1E]" />
            <span className="font-bold text-sm text-[#231610]">
              معاينة وطباعة الفاتورة | {order.orderNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6F4E37] hover:bg-[#EAE0D2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-print Banner */}
        {profile.autoPrintReceipt && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم إرسال أمر الطباعة التلقائية عبر المتصفح (تنسيق 80mm)</span>
            </div>
            <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
              تلقائي
            </span>
          </div>
        )}

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex justify-center">
          {/* Printable Receipt Paper Container */}
          <div
            ref={receiptRef}
            className={`${is58mm ? 'w-[54mm]' : 'w-[80mm]'} max-w-full bg-white p-4 shadow-sm text-black font-mono ${is58mm ? 'text-[10px]' : 'text-[11px]'} leading-tight select-text rounded-sm border border-dashed border-gray-300`}
            dir="rtl"
          >
            {/* Header / Logo */}
            <div className="flex flex-col pb-3 border-b border-black text-center">
              {showLogo && profile.logoUrl && (
                <div
                  className={`mb-2 flex ${
                    logoAlign === 'left' ? 'justify-start' : logoAlign === 'right' ? 'justify-end' : 'justify-center'
                  }`}
                >
                  <img
                    src={profile.logoUrl}
                    alt="Logo"
                    style={{ maxWidth: `${logoWidth}px` }}
                    className="max-h-20 w-auto object-contain block"
                  />
                </div>
              )}

              {showRestName && restNameArabic && (
                <div className={`${is58mm ? 'text-sm' : 'text-base'} font-extrabold font-sans mt-0.5 text-black`}>
                  {restNameArabic}
                </div>
              )}

              {showEngName && restNameEnglish && (
                <div className="text-[10px] text-gray-700 font-sans font-semibold">
                  {restNameEnglish}
                </div>
              )}

              {showSlogan && sloganAr && (
                <div className="text-[9.5px] text-gray-800 font-sans mt-0.5">{sloganAr}</div>
              )}

              {showSlogan && sloganEn && (
                <div className="text-[9px] text-gray-600 font-sans">{sloganEn}</div>
              )}

              {showAddress && addressText && (
                <div className="text-[9.5px] text-gray-800 mt-1">{addressText}</div>
              )}

              {showPhone && activePhoneNumbers.length > 0 && (
                <div className="text-[9.5px] text-gray-800 mt-0.5">
                  {activePhoneNumbers.join(' - ')}
                </div>
              )}

              {socialLinks.length > 0 && (
                <div className="text-[9px] text-gray-700 mt-1 pt-1 border-t border-dotted border-gray-300">
                  {socialLinks.join(' • ')}
                </div>
              )}

              {taxItems.length > 0 && (
                <div className="text-[9.5px] text-gray-900 font-bold mt-1">
                  {taxItems.join(' | ')}
                </div>
              )}

              {showHeaderNote && headerNoteText && (
                <div className="text-[9px] text-gray-700 italic mt-1 font-sans border-t border-dotted border-gray-400 pt-1 w-full">
                  {headerNoteText}
                </div>
              )}
            </div>

            {/* Meta Info */}
            <div className="py-2.5 border-b border-black text-[10px] space-y-1">
              <div className="flex justify-between items-center">
                {showOrderNumber ? (
                  <span className="font-bold text-xs bg-black text-white px-1.5 py-0.5 rounded-xs">
                    {order.orderNumber}
                  </span>
                ) : <span />}
                {showOrderType && (
                  <span className="font-bold text-[11px]">{getOrderTypeName(order.type)}</span>
                )}
              </div>

              {showTable && order.tableNumber && (
                <div className="font-bold text-xs bg-gray-100 border border-black text-center py-0.5 my-1 rounded-xs">
                  ★ طاولة رقم: {order.tableNumber} ★
                </div>
              )}

              <div className="flex justify-between text-[9.5px]">
                {showDate ? <span>التاريخ: {new Date(order.createdAt).toLocaleDateString('ar-EG')}</span> : <span />}
                {showTime ? <span>الوقت: {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span> : <span />}
              </div>

              <div className="flex justify-between text-[9.5px]">
                {showCashier ? <span>الكاشير: {order.cashierName || 'الرئيسي'}</span> : <span />}
                {showBranch ? <span>الفرع: {order.branchName || 'الفرع الرئيسي'}</span> : <span />}
              </div>

              {showCustomer && (order.customerName || order.customerPhone || order.deliveryAddress) && (
                <div className="border-t border-dotted border-gray-400 pt-1 mt-1 text-[9.5px]">
                  {order.customerName && <div className="font-bold">العميل: {order.customerName}</div>}
                  {order.customerPhone && <div>الهاتف: {order.customerPhone}</div>}
                  {order.deliveryAddress && <div>العنوان: {order.deliveryAddress}</div>}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-black">
              <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[10px]">
                <span className="w-1/2">الصنف</span>
                <span className="w-1/6 text-center">الكمية</span>
                <span className="w-1/6 text-center">السعر</span>
                <span className="w-1/6 text-left">الإجمالي</span>
              </div>

              {order.items.map((item) => (
                <div key={item.id} className="py-1 border-b border-dotted border-gray-300">
                  <div className="flex justify-between text-[11px] font-sans font-semibold">
                    <span className="w-1/2 leading-tight">{item.productNameAr}</span>
                    <span className="w-1/6 text-center tabular-nums font-bold">x{item.quantity}</span>
                    <span className="w-1/6 text-center tabular-nums">{item.unitPrice.toFixed(2)}</span>
                    <span className="w-1/6 text-left tabular-nums font-bold">{item.itemTotal.toFixed(2)}</span>
                  </div>

                  {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                    <div className="text-[9px] text-gray-600 pr-2">
                      {item.selectedModifiers.map((m, idx) => (
                        <div key={idx}>+ {m.nameAr} {m.priceDelta > 0 ? `(+${m.priceDelta.toFixed(2)})` : ''}</div>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <div className="text-[9px] italic text-gray-500 pr-2">
                      ملاحظة: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div className="py-2 border-b border-black text-[10.5px] space-y-1">
              {showSubtotal && (
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="tabular-nums font-bold">
                    {order.subtotal.toFixed(2)} {profile.currency}
                  </span>
                </div>
              )}

              {showDiscount && order.discountAmount > 0 && (
                <div className="flex justify-between text-black">
                  <span>الخصم ({order.discountType === 'percent' ? `${order.discountValue}%` : 'مبلغ'}):</span>
                  <span className="tabular-nums font-bold">
                    -{order.discountAmount.toFixed(2)} {profile.currency}
                  </span>
                </div>
              )}

              {showTax && (
                <div className="flex justify-between">
                  <span>{rs?.taxLabel || 'ضريبة القيمة المضافة'} ({order.taxPercent}%):</span>
                  <span className="tabular-nums font-bold">
                    {order.taxAmount.toFixed(2)} {profile.currency}
                  </span>
                </div>
              )}

              {showServiceCharge && order.serviceChargeAmount > 0 && (
                <div className="flex justify-between">
                  <span>خدمة الصالة ({order.serviceChargePercent}%):</span>
                  <span className="tabular-nums font-bold">
                    {order.serviceChargeAmount.toFixed(2)} {profile.currency}
                  </span>
                </div>
              )}

              {showDeliveryFee && order.deliveryFee && order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>رسوم التوصيل:</span>
                  <span className="tabular-nums font-bold">
                    {order.deliveryFee.toFixed(2)} {profile.currency}
                  </span>
                </div>
              )}

              {showTotal && (
                <div className="flex justify-between font-extrabold text-sm border-t-2 border-black pt-1.5 mt-1">
                  <span>المجموع النهائي:</span>
                  <span className="tabular-nums">
                    {order.total.toFixed(2)} {profile.currency}
                  </span>
                </div>
              )}
            </div>

            {/* Payments breakdown */}
            {(showPaymentMethod || showPaidAmount || showChange || showRemaining) && (
              <div className="py-2 border-b border-black text-[10px] space-y-0.5">
                <div className="font-bold mb-1">تفاصيل الدفع:</div>
                {order.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {showPaymentMethod
                        ? p.method === 'cash'
                          ? 'نقدي (Cash)'
                          : p.method === 'card'
                          ? 'بطاقة بنكية (Card)'
                          : p.method === 'instapay'
                          ? 'إنستاباي (InstaPay)'
                          : 'تحويل بنكي'
                        : 'تم التحصيل'}
                      {p.reference && ` [${p.reference}]`}:
                    </span>
                    {showPaidAmount && (
                      <span className="tabular-nums font-bold">
                        {p.amount.toFixed(2)} {profile.currency}
                      </span>
                    )}
                  </div>
                ))}
                {showChange && order.changeAmount > 0 && (
                  <div className="flex justify-between font-bold border-t border-dotted border-gray-400 pt-0.5 mt-0.5">
                    <span>الباقي للعميل (Change):</span>
                    <span className="tabular-nums">
                      {order.changeAmount.toFixed(2)} {profile.currency}
                    </span>
                  </div>
                )}
                {showRemaining && remainingAmount > 0 && (
                  <div className="flex justify-between font-bold border-t border-dotted border-gray-400 pt-0.5 mt-0.5 text-red-700">
                    <span>المتبقي (Remaining):</span>
                    <span className="tabular-nums">
                      {remainingAmount.toFixed(2)} {profile.currency}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Footer QR / Barcode & message */}
            <div className="pt-3 text-center flex flex-col items-center space-y-1.5">
              {/* QR Code */}
              {(rs ? rs.enableQrCode : true) && qrDataUrl && (
                <div
                  className={`w-full flex flex-col items-${
                    rs?.qrAlignment === 'left' ? 'start' : rs?.qrAlignment === 'right' ? 'end' : 'center'
                  } my-1`}
                >
                  <div
                    className="p-1 border border-black bg-white inline-block"
                    style={{ width: `${rs?.qrSize || (is58mm ? 90 : 110)}px`, height: `${rs?.qrSize || (is58mm ? 90 : 110)}px` }}
                  >
                    <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                  </div>
                  {rs?.qrLabel && (
                    <div className="text-[9.5px] font-bold text-gray-800 mt-1 max-w-[200px] text-center">
                      {rs.qrLabel}
                    </div>
                  )}
                </div>
              )}

              {showFooter && (
                <div className="space-y-0.5 mt-1">
                  {footerAr && (
                    <div className="text-[10px] font-sans font-bold text-black">
                      {footerAr}
                    </div>
                  )}
                  {footerEn && (
                    <div className="text-[9px] font-sans text-gray-700">
                      {footerEn}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-white border-t border-[#E8DFD5] flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#7A6455] hover:text-[#231610]">
            <input
              type="checkbox"
              checked={profile.autoPrintReceipt}
              onChange={(e) => updateProfile({ autoPrintReceipt: e.target.checked })}
              className="rounded-md border-[#D7C3A5] text-[#8B1E1E] focus:ring-[#8B1E1E]"
            />
            <span>الطباعة التلقائية فور الدفع</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F5EFE6] rounded-xl transition-colors"
            >
              إغلاق
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-colors shadow-sm disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>إعادة طباعة الإيصال (Thermal 80mm)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
