import QRCode from 'qrcode';
import { Order, RestaurantProfile, Shift } from '../types';
import { windowsBridge } from '../services/windowsBridge';

/**
 * Generate a Base64 QR Code based on dynamic ReceiptSettings
 */
export async function generateReceiptQRCode(order: Order, profile: RestaurantProfile): Promise<string> {
  const rs = profile.receiptSettings;
  if (rs && !rs.enableQrCode) {
    return '';
  }

  try {
    let qrContent = '';
    const qrType = rs?.qrType || 'tax_einvoice';

    if (qrType === 'custom' && rs?.qrUrl) {
      qrContent = rs.qrUrl;
    } else if (qrType === 'website') {
      qrContent = rs?.website || profile.website || rs?.qrUrl || '';
    } else if (qrType === 'google_maps') {
      qrContent = rs?.qrUrl || '';
    } else if (qrType === 'whatsapp') {
      const waNumber = (rs?.whatsAppNumber || profile.whatsapp || '').replace(/\D/g, '');
      qrContent = waNumber ? `https://wa.me/${waNumber}` : (rs?.qrUrl || '');
    } else if (qrType === 'facebook') {
      qrContent = rs?.facebookUrl || profile.facebook || rs?.qrUrl || '';
    } else if (qrType === 'instagram') {
      qrContent = rs?.instagramUrl || profile.instagram || rs?.qrUrl || '';
    } else if (qrType === 'review') {
      qrContent = rs?.qrUrl || rs?.website || profile.website || '';
    } else {
      // Default e-invoice / tax authority QR payload
      qrContent = JSON.stringify({
        seller: rs?.restaurantNameArabic || profile.name,
        trn: rs?.taxNumber || profile.taxNumber,
        invoice: order.orderNumber,
        date: order.createdAt,
        total: `${order.total.toFixed(2)} ${profile.currency}`,
        tax: `${order.taxAmount.toFixed(2)} ${profile.currency}`,
      });
    }

    if (!qrContent) {
      qrContent = JSON.stringify({
        seller: rs?.restaurantNameArabic || profile.name,
        invoice: order.orderNumber,
        total: `${order.total.toFixed(2)} ${profile.currency}`,
      });
    }

    const qrSize = rs?.qrSize || 110;
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: qrSize,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });

    return qrDataUrl;
  } catch (err) {
    console.warn('Failed to generate QR code:', err);
    return '';
  }
}

/**
 * Helper to get Arabic title for order type
 */
function getOrderTypeLabel(type: Order['type']): string {
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
}

/**
 * Generate pixel-perfect HTML string for 80mm / 58mm Thermal Printer
 * Completely driven by Admin Receipt Settings (White Label & Dynamic)
 */
export function generateThermalReceiptHTML(
  order: Order,
  profile: RestaurantProfile,
  qrDataUrl = ''
): string {
  const rs = profile.receiptSettings;
  const paperWidth = rs?.paperWidth || profile.thermalPaperWidth || '80mm';
  const is58mm = paperWidth === '58mm';
  const widthStyle = is58mm ? 'width: 54mm; max-width: 54mm;' : 'width: 76mm; max-width: 76mm;';

  const orderDate = new Date(order.createdAt).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const orderTime = new Date(order.createdAt).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Settings values with graceful profile fallbacks
  const showLogo = rs ? rs.showLogo : true;
  const logoAlign = rs?.logoAlignment || 'center';
  const logoWidth = rs?.logoWidth || (is58mm ? 90 : 120);
  const logoMargin =
    logoAlign === 'left' ? '0 auto 0 0' : logoAlign === 'right' ? '0 0 0 auto' : '0 auto';

  const showRestName = rs ? rs.showRestaurantName : true;
  const restNameArabic = rs?.restaurantNameArabic || profile.name;
  const showEngName = rs ? rs.showEnglishName : true;
  const restNameEnglish = rs?.restaurantNameEnglish || profile.englishName;

  const showSlogan = rs ? rs.showSlogan : true;
  const sloganAr = rs?.sloganArabic || profile.slogan;
  const sloganEn = rs?.sloganEnglish || profile.sloganEnglish;

  const showAddress = rs ? rs.showAddress : true;
  const addressText = rs?.addressDetails || profile.address;

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

  // Items Rows HTML
  const itemsRows = order.items
    .map((item) => {
      const modifiersHtml =
        item.selectedModifiers && item.selectedModifiers.length > 0
          ? `<div style="font-size: ${is58mm ? '9px' : '10px'}; color: #333; padding-right: 6px; margin-top: 1px;">
              ${item.selectedModifiers
                .map((m) => `<div>+ ${m.nameAr} ${m.priceDelta > 0 ? `(+${m.priceDelta.toFixed(2)} ${profile.currency})` : ''}</div>`)
                .join('')}
            </div>`
          : '';

      const notesHtml = item.notes
        ? `<div style="font-size: 9px; font-style: italic; color: #444; padding-right: 6px; margin-top: 1px;">
            ملاحظة: ${item.notes}
          </div>`
        : '';

      return `
        <tr style="border-bottom: 1px dashed #777;">
          <td style="padding: 3px 0; text-align: right; vertical-align: top;">
            <div style="font-weight: 700; font-size: ${is58mm ? '11px' : '12px'}; color: #000; line-height: 1.2;">
              ${item.productNameAr}
            </div>
            ${modifiersHtml}
            ${notesHtml}
          </td>
          <td style="padding: 3px 2px; text-align: center; vertical-align: top; font-weight: 800; font-size: ${is58mm ? '11px' : '12px'}; white-space: nowrap;">
            ${item.quantity}x
          </td>
          <td style="padding: 3px 2px; text-align: center; vertical-align: top; font-size: ${is58mm ? '10px' : '11px'}; white-space: nowrap;">
            ${item.unitPrice.toFixed(2)}
          </td>
          <td style="padding: 3px 0; text-align: left; vertical-align: top; font-weight: 800; font-size: ${is58mm ? '11px' : '12px'}; white-space: nowrap;">
            ${item.itemTotal.toFixed(2)}
          </td>
        </tr>
      `;
    })
    .join('');

  // Payments List HTML
  const paymentsHtml = order.payments
    .map((p) => {
      let methodLabel = 'نقدي (Cash)';
      if (p.method === 'card') methodLabel = 'بطاقة بنكية (Card)';
      else if (p.method === 'instapay') methodLabel = 'إنستاباي (InstaPay)';
      else if (p.method === 'bank_transfer') methodLabel = 'تحويل بنكي';
      else if (p.method === 'other') methodLabel = 'دفع إلكتروني';

      return `
        <div style="display: flex; justify-content: space-between; font-size: ${is58mm ? '10px' : '11px'}; margin-bottom: 2px;">
          ${showPaymentMethod ? `<span>${methodLabel}${p.reference ? ` [${p.reference}]` : ''}:</span>` : '<span>تم التحصيل:</span>'}
          ${showPaidAmount ? `<span style="font-weight: 700;">${p.amount.toFixed(2)} ${profile.currency}</span>` : ''}
        </div>
      `;
    })
    .join('');

  const remainingAmount = Math.max(0, order.total - order.paidAmount);

  return `
    <div class="thermal-receipt" style="${widthStyle} margin: 0 auto; padding: 4px 2px; font-family: 'Cairo', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, sans-serif; direction: rtl; text-align: right; color: #000; background: #fff; line-height: 1.35; box-sizing: border-box;">
      
      <!-- HEADER / BRANDING -->
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
        ${
          showLogo && profile.logoUrl
            ? `<div style="text-align: ${logoAlign}; margin-bottom: 4px;">
                <img 
                  src="${profile.logoUrl}" 
                  alt="Logo" 
                  style="max-width: ${logoWidth}px; width: 100%; height: auto; max-height: 80px; object-fit: contain; margin: ${logoMargin}; display: block; filter: grayscale(100%) contrast(125%); -webkit-filter: grayscale(100%) contrast(125%);" 
                />
              </div>`
            : ''
        }

        ${
          showRestName && restNameArabic
            ? `<div style="font-size: ${is58mm ? '15px' : '18px'}; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 2px; color: #000;">
                ${restNameArabic}
              </div>`
            : ''
        }

        ${
          showEngName && restNameEnglish
            ? `<div style="font-size: ${is58mm ? '10px' : '11px'}; font-weight: 700; color: #333; margin-bottom: 2px;">
                ${restNameEnglish}
              </div>`
            : ''
        }

        ${
          showSlogan && sloganAr
            ? `<div style="font-size: 10px; color: #222; margin-bottom: 2px;">
                ${sloganAr}
              </div>`
            : ''
        }

        ${
          showSlogan && sloganEn
            ? `<div style="font-size: 9.5px; color: #444; margin-bottom: 2px;">
                ${sloganEn}
              </div>`
            : ''
        }

        ${
          showAddress && addressText
            ? `<div style="font-size: 10px; color: #222; margin-top: 2px;">
                ${addressText}
              </div>`
            : ''
        }

        ${
          showPhone && activePhoneNumbers.length > 0
            ? `<div style="font-size: 10px; color: #222; margin-top: 1px;">
                ${activePhoneNumbers.join(' - ')}
              </div>`
            : ''
        }

        ${
          socialLinks.length > 0
            ? `<div style="font-size: 9px; color: #333; margin-top: 2px; border-top: 1px dotted #ccc; padding-top: 2px;">
                ${socialLinks.join(' • ')}
              </div>`
            : ''
        }

        ${
          taxItems.length > 0
            ? `<div style="font-size: 9.5px; font-weight: 700; margin-top: 3px;">
                ${taxItems.join(' | ')}
              </div>`
            : ''
        }

        ${
          showHeaderNote && headerNoteText
            ? `<div style="font-size: 9.5px; font-style: italic; color: #444; border-top: 1px dotted #888; margin-top: 4px; padding-top: 3px;">
                ${headerNoteText}
              </div>`
            : ''
        }
      </div>

      <!-- INVOICE METADATA -->
      <div style="border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 6px; font-size: ${is58mm ? '10px' : '11px'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
          ${
            showOrderNumber
              ? `<span style="font-size: ${is58mm ? '12px' : '14px'}; font-weight: 900; background: #000; color: #fff; padding: 1px 6px; border-radius: 2px;">
                  ${order.orderNumber}
                </span>`
              : '<span></span>'
          }
          ${
            showOrderType
              ? `<span style="font-weight: 800; font-size: ${is58mm ? '10px' : '11px'};">
                  ${getOrderTypeLabel(order.type)}
                </span>`
              : ''
          }
        </div>

        ${
          showTable && order.tableNumber
            ? `<div style="font-size: ${is58mm ? '11px' : '12px'}; font-weight: 900; text-align: center; border: 1.5px solid #000; padding: 2px; margin: 3px 0; background: #f0f0f0;">
                ★ طاولة رقم: ${order.tableNumber} ★
              </div>`
            : ''
        }

        <div style="display: flex; justify-content: space-between; margin-top: 2px; font-size: ${is58mm ? '9.5px' : '10px'};">
          ${showDate ? `<span>التاريخ: ${orderDate}</span>` : '<span></span>'}
          ${showTime ? `<span>الوقت: ${orderTime}</span>` : '<span></span>'}
        </div>

        <div style="display: flex; justify-content: space-between; font-size: ${is58mm ? '9.5px' : '10px'}; margin-top: 2px;">
          ${showCashier ? `<span>الكاشير: ${order.cashierName || 'الرئيسي'}</span>` : '<span></span>'}
          ${showBranch ? `<span>الفرع: ${order.branchName || 'الفرع الرئيسي'}</span>` : '<span></span>'}
        </div>

        ${
          showCustomer && (order.customerName || order.customerPhone || order.deliveryAddress)
            ? `<div style="border-top: 1px dotted #777; margin-top: 3px; padding-top: 3px; font-size: ${is58mm ? '9.5px' : '10.5px'};">
                ${order.customerName ? `<div style="font-weight: 700;">العميل: ${order.customerName}</div>` : ''}
                ${order.customerPhone ? `<div>الهاتف: ${order.customerPhone}</div>` : ''}
                ${order.deliveryAddress ? `<div>العنوان: ${order.deliveryAddress}</div>` : ''}
              </div>`
            : ''
        }
      </div>

      <!-- ORDER ITEMS TABLE -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
        <thead>
          <tr style="border-bottom: 1.5px solid #000; font-size: ${is58mm ? '10px' : '11px'}; font-weight: 800;">
            <th style="padding: 3px 0; text-align: right; width: 48%;">الصنف</th>
            <th style="padding: 3px 2px; text-align: center; width: 14%;">الكمية</th>
            <th style="padding: 3px 2px; text-align: center; width: 18%;">السعر</th>
            <th style="padding: 3px 0; text-align: left; width: 20%;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- FINANCIAL SUMMARY -->
      <div style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0; margin-bottom: 6px; font-size: ${is58mm ? '10px' : '11px'};">
        ${
          showSubtotal
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>المجموع الفرعي:</span>
                <span style="font-weight: 700;">${order.subtotal.toFixed(2)} ${profile.currency}</span>
              </div>`
            : ''
        }

        ${
          showDiscount && order.discountAmount > 0
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #000;">
                <span>الخصم ${order.discountType === 'percent' ? `(${order.discountValue}%)` : ''}:</span>
                <span style="font-weight: 700;">-${order.discountAmount.toFixed(2)} ${profile.currency}</span>
              </div>`
            : ''
        }

        ${
          showTax
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>${rs?.taxLabel || 'ضريبة القيمة المضافة'} (${order.taxPercent}%):</span>
                <span style="font-weight: 700;">${order.taxAmount.toFixed(2)} ${profile.currency}</span>
              </div>`
            : ''
        }

        ${
          showServiceCharge && order.serviceChargeAmount > 0
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>خدمة الصالة (${order.serviceChargePercent}%):</span>
                <span style="font-weight: 700;">${order.serviceChargeAmount.toFixed(2)} ${profile.currency}</span>
              </div>`
            : ''
        }

        ${
          showDeliveryFee && order.deliveryFee && order.deliveryFee > 0
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>رسوم التوصيل:</span>
                <span style="font-weight: 700;">${order.deliveryFee.toFixed(2)} ${profile.currency}</span>
              </div>`
            : ''
        }

        ${
          showTotal
            ? `<div style="display: flex; justify-content: space-between; font-size: ${is58mm ? '13px' : '15px'}; font-weight: 900; border-top: 2px solid #000; padding-top: 3px; margin-top: 3px;">
                <span>المجموع النهائي:</span>
                <span>${order.total.toFixed(2)} ${profile.currency}</span>
              </div>`
            : ''
        }
      </div>

      <!-- PAYMENTS BREAKDOWN -->
      ${
        showPaymentMethod || showPaidAmount || showChange || showRemaining
          ? `<div style="border-bottom: 1.5px solid #000; padding-bottom: 5px; margin-bottom: 6px;">
              <div style="font-size: ${is58mm ? '9.5px' : '10px'}; font-weight: 800; margin-bottom: 3px;">تفاصيل الدفع:</div>
              ${paymentsHtml}
              ${
                showChange && order.changeAmount > 0
                  ? `<div style="display: flex; justify-content: space-between; font-size: ${is58mm ? '10px' : '11px'}; font-weight: 800; border-top: 1px dotted #000; padding-top: 2px; margin-top: 2px;">
                      <span>الباقي للعميل (Change):</span>
                      <span>${order.changeAmount.toFixed(2)} ${profile.currency}</span>
                    </div>`
                  : ''
              }
              ${
                showRemaining && remainingAmount > 0
                  ? `<div style="display: flex; justify-content: space-between; font-size: ${is58mm ? '10px' : '11px'}; font-weight: 800; border-top: 1px dotted #000; padding-top: 2px; margin-top: 2px; color: #b00;">
                      <span>المتبقي (Remaining):</span>
                      <span>${remainingAmount.toFixed(2)} ${profile.currency}</span>
                    </div>`
                  : ''
              }
            </div>`
          : ''
      }

      <!-- QR CODE & FOOTER -->
      <div style="text-align: center; padding-top: 4px;">
        ${
          qrDataUrl && (rs ? rs.enableQrCode : true)
            ? `<div style="margin: 0 auto 4px; text-align: ${rs?.qrAlignment || 'center'};">
                <div style="display: inline-block; padding: 2px; border: 1px solid #000; background: #fff;">
                  <img src="${qrDataUrl}" alt="QR" style="width: ${rs?.qrSize || (is58mm ? 90 : 110)}px; height: ${rs?.qrSize || (is58mm ? 90 : 110)}px; display: block;" />
                </div>
                ${rs?.qrLabel ? `<div style="font-size: ${is58mm ? '9px' : '10px'}; font-weight: 700; margin-top: 3px; color: #222;">${rs.qrLabel}</div>` : ''}
              </div>`
            : ''
        }

        ${
          showFooter
            ? `<div style="margin-top: 4px;">
                ${footerAr ? `<div style="font-size: ${is58mm ? '9px' : '10px'}; font-weight: 700; color: #222; margin-bottom: 2px;">${footerAr}</div>` : ''}
                ${footerEn ? `<div style="font-size: 8.5px; color: #444; margin-bottom: 2px;">${footerEn}</div>` : ''}
              </div>`
            : ''
        }
        
        <div style="margin-top: 6px; border-top: 1px dashed #aaa; padding-top: 4px; font-size: 8px; color: #999;">
          ✂ - - - - - - - - - - - - - - - - - - - - - - - - - ✂
        </div>
      </div>

    </div>
  `;
}

/**
 * Execute Direct Silent Thermal Receipt Printing with fallback
 */
export async function printReceipt(
  order: Order,
  profile: RestaurantProfile
): Promise<boolean> {
  try {
    // 1. Ensure print area container exists
    let printArea = document.getElementById('thermal-receipt-print-area');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'thermal-receipt-print-area';
      printArea.className = 'hidden print:block';
      document.body.appendChild(printArea);
    }

    // 2. Generate QR code
    const qrDataUrl = await generateReceiptQRCode(order, profile);

    // 3. Generate 80mm/58mm Thermal Receipt HTML
    const receiptHtml = generateThermalReceiptHTML(order, profile, qrDataUrl);

    // 4. Mount HTML inside print area
    printArea.innerHTML = receiptHtml;

    // 5. Try Native Direct Printing via Windows Bridge first (silent without browser dialog)
    const targetPrinter = profile.receiptPrinterName || 'Default POS Thermal 80mm';
    const paperWidth = profile.thermalPaperWidth === '58mm' ? '58mm' : '80mm';
    const nativeRes = await windowsBridge.printDirect(receiptHtml, {
      printerName: targetPrinter,
      silent: true,
      paperWidth,
      copies: 1,
    });

    if (nativeRes.success) {
      windowsBridge.log('info', 'PRINTER', `تمت طباعة الفاتورة ${order.orderNumber} مباشرة على ${targetPrinter}`);
      return true;
    }

    // 6. Fallback to window.print() if native direct printing is not active in current environment
    await new Promise((resolve) => setTimeout(resolve, 80));
    window.print();
    return true;
  } catch (err) {
    console.error('Failed to trigger thermal receipt print:', err);
    return false;
  }
}

/**
 * Print Kitchen Order Ticket directly to kitchen printer
 */
export async function printKitchenOrderDirect(
  order: Order,
  profile: RestaurantProfile
): Promise<boolean> {
  try {
    const kitchenHtml = `
      <div style="font-family: Cairo, Tahoma, sans-serif; font-size: 13px; font-weight: bold; width: 80mm; padding: 10px;" dir="rtl">
        <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: 18px;">بون المطبخ والمشويات (KITCHEN)</h2>
          <div style="font-size: 14px; margin-top: 4px;">طلب رقم: ${order.orderNumber}</div>
          <div style="font-size: 12px;">نوع الطلب: ${order.type === 'dine_in' ? `طاولة (${order.tableNumber || 'غير محدد'})` : order.type === 'takeaway' ? 'تيك أواي / سفري' : 'توصيل منازل'}</div>
          <div style="font-size: 11px; color: #555;">الوقت: ${new Date(order.createdAt).toLocaleTimeString()}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #000; font-size: 12px;">
              <th style="text-align: right; width: 75%; padding: 4px 0;">الصنف المطلوب</th>
              <th style="text-align: center; width: 25%; padding: 4px 0;">الكمية</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (item) => `
              <tr style="border-bottom: 1px dotted #ccc;">
                <td style="padding: 6px 0; font-size: 14px;">
                  <div>${item.productNameAr}</div>
                  ${item.selectedModifiers && item.selectedModifiers.length > 0 ? `<div style="font-size: 11px; color: #444;">• ${item.selectedModifiers.map(m => m.nameAr).join(', ')}</div>` : ''}
                  ${item.notes ? `<div style="font-size: 11px; color: #c00;">ملاحظة: ${item.notes}</div>` : ''}
                </td>
                <td style="text-align: center; font-size: 16px; font-weight: 900; vertical-align: top; padding-top: 6px;">
                  x${item.quantity}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        ${order.notes ? `<div style="margin-top: 8px; border-top: 1px dashed #000; padding-top: 4px; font-size: 12px; color: #b00;">ملاحظات عامة: ${order.notes}</div>` : ''}
        <div style="margin-top: 15px; text-align: center; font-size: 10px; border-top: 1px solid #000; padding-top: 4px;">
          ${profile.name || 'نظام إدارة المطاعم POS'} - محطة المطبخ والتجهيز
        </div>
      </div>
    `;

    const targetPrinter = profile.kitchenPrinterName || 'Kitchen-Printer-POS80 (Grill)';
    const res = await windowsBridge.printDirect(kitchenHtml, {
      printerName: targetPrinter,
      silent: true,
      paperWidth: '80mm',
      copies: 1,
    });
    return res.success;
  } catch (err) {
    console.error('Failed to print kitchen order direct:', err);
    return false;
  }
}

/**
 * Generate and print a test receipt to verify 80mm printer calibration
 */
export async function printTestReceipt(profile: RestaurantProfile): Promise<boolean> {
  const dummyOrder: Order = {
    id: `test-ord-${Date.now()}`,
    orderNumber: `ORD-TEST`,
    type: 'dine_in',
    branchId: 'branch-1',
    branchName: 'الفرع الرئيسي',
    cashierId: 'cashier-1',
    cashierName: 'كاشير التجربة',
    tableNumber: '05',
    items: [
      {
        id: 't-1',
        productId: 'p-1',
        productNameAr: 'نصف كيلو كباب ضاني بلدي مشوي ع الفحم',
        productNameEn: 'Lamb Kebab 0.5kg',
        unitPrice: 280,
        costPrice: 170,
        quantity: 1,
        selectedModifiers: [
          {
            groupId: 'grp-1',
            groupNameAr: 'درجة التسوية',
            optionId: 'opt-1',
            nameAr: 'ويل دان مشوي زيادة',
            priceDelta: 0,
          },
        ],
        itemTotal: 280,
        notes: 'مع خبز بلدي ساخن',
        kitchenStation: 'grill',
        status: 'ready',
      },
      {
        id: 't-2',
        productId: 'p-2',
        productNameAr: 'سلطة طحينة سمسم فاخرة',
        productNameEn: 'Sesame Tahini',
        unitPrice: 25,
        costPrice: 8,
        quantity: 2,
        selectedModifiers: [],
        itemTotal: 50,
        kitchenStation: 'cold',
        status: 'ready',
      },
      {
        id: 't-3',
        productId: 'p-3',
        productNameAr: 'شوربة كوارع مخلية بالليمون',
        productNameEn: 'Knuckle Soup',
        unitPrice: 95,
        costPrice: 40,
        quantity: 1,
        selectedModifiers: [],
        itemTotal: 95,
        kitchenStation: 'kitchen',
        status: 'ready',
      },
    ],
    subtotal: 425,
    discountType: 'percent',
    discountValue: 0,
    discountAmount: 0,
    taxPercent: profile.defaultTaxPercent || 14,
    taxAmount: Number(((425 * (profile.defaultTaxPercent || 14)) / 100).toFixed(2)),
    serviceChargePercent: profile.defaultServicePercent || 12,
    serviceChargeAmount: Number(((425 * (profile.defaultServicePercent || 12)) / 100).toFixed(2)),
    total: Number(
      (
        425 +
        Number(((425 * (profile.defaultTaxPercent || 14)) / 100).toFixed(2)) +
        Number(((425 * (profile.defaultServicePercent || 12)) / 100).toFixed(2))
      ).toFixed(2)
    ),
    payments: [
      {
        method: 'cash',
        amount: 550,
      },
    ],
    paidAmount: 550,
    changeAmount: Number(
      (
        550 -
        (425 +
          Number(((425 * (profile.defaultTaxPercent || 14)) / 100).toFixed(2)) +
          Number(((425 * (profile.defaultServicePercent || 12)) / 100).toFixed(2)))
      ).toFixed(2)
    ),
    status: 'completed',
    createdAt: new Date().toISOString(),
  };

  return printReceipt(dummyOrder, profile);
}

export interface ShiftReportData {
  shift: Shift;
  branchName: string;
  totalRevenue: number;
  taxCollected: number;
  orderCount: number;
  netSales: number;
  avgOrderValue: number;
  cashSales: number;
  cardSales: number;
  otherSales: number;
  expenses: number;
  startingCash: number;
  expectedCash: number;
  dineInSales: { count: number; total: number };
  takeawaySales: { count: number; total: number };
  deliverySales: { count: number; total: number };
}

/**
 * Execute Browser Print Directly for 80mm Daily Sales Summary / Shift X-Report
 */
export async function printShiftXReport(
  data: ShiftReportData,
  profile: RestaurantProfile
): Promise<boolean> {
  try {
    let printArea = document.getElementById('thermal-receipt-print-area');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'thermal-receipt-print-area';
      printArea.className = 'hidden print:block';
      document.body.appendChild(printArea);
    }

    const printDate = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const printTime = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const shiftStartTime = new Date(data.shift.startTime).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const reportHtml = `
      <div style="font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; text-align: right; color: #000; background: #fff; width: 76mm; max-width: 76mm; margin: 0 auto; padding: 4px; box-sizing: border-box; font-size: 12px; line-height: 1.4;">
        <!-- HEADER -->
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px;">
          <div style="font-size: 16px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 2px;">
            ${profile.name}
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #333;">
            ${data.branchName}
          </div>
          <div style="font-size: 10px; color: #444; margin-top: 2px;">
            الرقم الضريبي: ${profile.taxNumber || '---'}
          </div>
          <div style="display: inline-block; background: #000; color: #fff; padding: 3px 10px; font-size: 12px; font-weight: 900; border-radius: 4px; margin-top: 6px;">
            تقرير ملخص المبيعات اليومي (X-Report)
          </div>
        </div>

        <!-- SHIFT META -->
        <div style="font-size: 10.5px; border-bottom: 1.5px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 700;">كاشير الوردية:</span>
            <span>${data.shift.userName}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 700;">بدء الوردية:</span>
            <span>${shiftStartTime}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 700;">تاريخ ووقت الطباعة:</span>
            <span>${printDate} - ${printTime}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 700;">حالة الوردية:</span>
            <span>${data.shift.status === 'open' ? 'نشطة ومفتوحة (قيد العمل)' : 'مغلقة ومقفلة'}</span>
          </div>
        </div>

        <!-- 3 CORE METRICS -->
        <div style="border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; background: #f9f9f9; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin-bottom: 4px;">
            <span>إجمالي الإيرادات:</span>
            <span>${data.totalRevenue.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: #222; margin-bottom: 2px;">
            <span>الضريبة المحصلة (VAT):</span>
            <span>${data.taxCollected.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: #222;">
            <span>عدد الطلبات المنجزة:</span>
            <span>${data.orderCount} طلب</span>
          </div>
        </div>

        <!-- BREAKDOWN -->
        <div style="font-size: 11px; border-bottom: 1.5px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="font-weight: 800; margin-bottom: 4px; font-size: 11.5px;">تفاصيل المبيعات وطرق الدفع:</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>صافي المبيعات (قبل الضريبة):</span>
            <span style="font-weight: 700;">${data.netSales.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>متوسط قيمة الطلب:</span>
            <span style="font-weight: 700;">${data.avgOrderValue.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>مبيعات نقدي (Cash):</span>
            <span style="font-weight: 700;">${data.cashSales.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>مبيعات شبكة وبطاقة (Card):</span>
            <span style="font-weight: 700;">${data.cardSales.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>مبيعات إلكترونية وانستاباي:</span>
            <span style="font-weight: 700;">${data.otherSales.toFixed(2)} ${profile.currency}</span>
          </div>
        </div>

        <!-- CASH DRAWER RECONCILIATION -->
        <div style="font-size: 11px; border-bottom: 1.5px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="font-weight: 800; margin-bottom: 4px; font-size: 11.5px;">مطابقة درج النقدية والخزينة:</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>العهدة الافتتاحية:</span>
            <span style="font-weight: 700;">${data.startingCash.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>المقبوضات النقدية:</span>
            <span style="font-weight: 700;">+${data.cashSales.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>المصروفات المنصرفة من الدرج:</span>
            <span style="font-weight: 700; color: #b00;">-${data.expenses.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 12px; border-top: 1px dotted #000; padding-top: 3px; margin-top: 3px;">
            <span>النقد المتوقع في الدرج:</span>
            <span>${data.expectedCash.toFixed(2)} ${profile.currency}</span>
          </div>
        </div>

        <!-- ORDER CHANNELS -->
        <div style="font-size: 10.5px; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px;">
          <div style="font-weight: 800; margin-bottom: 4px;">توزيع قنوات البيع:</div>
          <div style="display: flex; justify-content: space-between;">
            <span>صالات (Dine-in): ${data.dineInSales.count} طلب</span>
            <span>${data.dineInSales.total.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>سفري (Takeaway): ${data.takeawaySales.count} طلب</span>
            <span>${data.takeawaySales.total.toFixed(2)} ${profile.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>توصيل (Delivery): ${data.deliverySales.count} طلب</span>
            <span>${data.deliverySales.total.toFixed(2)} ${profile.currency}</span>
          </div>
        </div>

        <!-- SIGNATURES -->
        <div style="margin-top: 10px; font-size: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
            <div>توقيع الكاشير: ........................</div>
            <div>توقيع المشرف: ........................</div>
          </div>
          <div style="text-align: center; color: #666; font-size: 8.5px;">
            *** تم استخراج هذا التقرير تلقائياً من نظام الباشا لنقاط البيع ***
          </div>
        </div>
      </div>
    `;

    printArea.innerHTML = reportHtml;
    await new Promise((resolve) => setTimeout(resolve, 80));
    window.print();
    return true;
  } catch (err) {
    console.error('Failed to print Shift X-Report:', err);
    return false;
  }
}
