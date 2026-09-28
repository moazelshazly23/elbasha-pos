import { Order, RestaurantProfile, Expense } from '../types';

export interface FinancialReportData {
  profile: RestaurantProfile;
  orders: Order[];
  expenses?: Expense[];
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  generatedBy?: string;
}

/**
 * Generate full A4 Executive Financial Summary HTML Report for Browser-Native Print and PDF Export
 */
export function generateFinancialReportHTML(data: FinancialReportData): string {
  const { profile, orders, expenses = [], periodLabel, generatedBy = 'مدير النظام' } = data;

  const now = new Date();
  const printDateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const printTimeStr = now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const reportId = `FIN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Core Financial Aggregates
  const totalGrossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalSubtotal = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalTax = orders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
  const totalServiceCharge = orders.reduce((sum, o) => sum + (o.serviceChargeAmount || 0), 0);
  const totalDiscounts = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const totalOrdersCount = orders.length;
  const avgOrderTicket = totalOrdersCount > 0 ? totalGrossRevenue / totalOrdersCount : 0;

  // COGS / Cost of Goods Sold estimate
  const totalCost = orders.reduce((sum, o) => {
    return (
      sum +
      o.items.reduce(
        (iSum, item) => iSum + (item.costPrice || 0) * item.quantity,
        0
      )
    );
  }, 0);
  const grossProfit = totalSubtotal - totalCost;
  const grossMarginPercent =
    totalSubtotal > 0 ? ((grossProfit / totalSubtotal) * 100).toFixed(1) : '0';

  // Expenses Total
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netCashFlow = totalGrossRevenue - totalExpenses;

  // Payment Breakdown
  let cashSales = 0;
  let cardSales = 0;
  let instapaySales = 0;
  let otherSales = 0;

  orders.forEach((o) => {
    if (o.payments && o.payments.length > 0) {
      o.payments.forEach((p) => {
        if (p.method === 'cash') cashSales += p.amount;
        else if (p.method === 'card') cardSales += p.amount;
        else if (p.method === 'instapay') instapaySales += p.amount;
        else otherSales += p.amount;
      });
    } else {
      cashSales += o.total;
    }
  });

  const totalPayments = cashSales + cardSales + instapaySales + otherSales;
  const cashPct = totalPayments > 0 ? ((cashSales / totalPayments) * 100).toFixed(1) : '0';
  const cardPct = totalPayments > 0 ? ((cardSales / totalPayments) * 100).toFixed(1) : '0';
  const instapayPct = totalPayments > 0 ? ((instapaySales / totalPayments) * 100).toFixed(1) : '0';
  const otherPct = totalPayments > 0 ? ((otherSales / totalPayments) * 100).toFixed(1) : '0';

  // Channels Breakdown
  const channelData: Record<string, { label: string; count: number; total: number }> = {
    dine_in: { label: 'صالات وداخلي (Dine-in)', count: 0, total: 0 },
    takeaway: { label: 'سفري وتيك أواي (Takeaway)', count: 0, total: 0 },
    delivery: { label: 'توصيل منازل (Delivery)', count: 0, total: 0 },
    pickup: { label: 'استلام مسبق (Pickup)', count: 0, total: 0 },
  };

  orders.forEach((o) => {
    if (channelData[o.type]) {
      channelData[o.type].count += 1;
      channelData[o.type].total += o.total;
    }
  });

  // Top Selling Items (Top 5)
  const itemMap: Record<string, { name: string; count: number; revenue: number }> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (!itemMap[item.productId]) {
        itemMap[item.productId] = { name: item.productNameAr, count: 0, revenue: 0 };
      }
      itemMap[item.productId].count += item.quantity;
      itemMap[item.productId].revenue += item.itemTotal;
    });
  });

  const topItems = Object.values(itemMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>التقرير المالي الرسمي - ${profile.name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm;
      }

      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body {
        font-family: 'Cairo', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, sans-serif;
        background: #ffffff;
        color: #231610;
        margin: 0;
        padding: 0;
        line-height: 1.45;
        direction: rtl;
        font-size: 10pt;
      }

      .report-page {
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
        padding: 2mm 0;
      }

      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #8B1E1E;
        padding-bottom: 10px;
        margin-bottom: 12px;
      }

      .brand-box {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-emblem {
        width: 48px;
        height: 48px;
        background: #8B1E1E;
        color: #FAF7F2;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22pt;
        font-weight: 900;
        border: 2px solid #D7C3A5;
      }

      .brand-text .main-name {
        font-size: 15pt;
        font-weight: 900;
        color: #8B1E1E;
        line-height: 1.2;
      }

      .brand-text .sub-name {
        font-size: 8.5pt;
        font-weight: 700;
        color: #7A6455;
        margin-top: 2px;
      }

      .header-meta {
        text-align: left;
        font-size: 8pt;
        color: #555555;
        line-height: 1.35;
      }

      .header-meta .doc-badge {
        display: inline-block;
        background: #8B1E1E;
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 800;
        font-size: 7.5pt;
        margin-bottom: 4px;
      }

      .title-strip {
        background: #FBF9F6;
        border: 1px solid #E8DFD5;
        border-right: 4px solid #8B1E1E;
        padding: 8px 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .title-strip .main-title {
        font-size: 11pt;
        font-weight: 900;
        color: #231610;
      }

      .title-strip .period-badge {
        background: #FFF8EF;
        border: 1px solid #D7C3A5;
        color: #8B1E1E;
        font-size: 8pt;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 6px;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }

      .kpi-card {
        background: #FAFAFA;
        border: 1px solid #E5E5E5;
        border-radius: 8px;
        padding: 8px;
        text-align: center;
      }

      .kpi-card.primary {
        background: #FFF8EF;
        border-color: #D7C3A5;
      }

      .kpi-card.profit {
        background: #F0FDF4;
        border-color: #BBF7D0;
      }

      .kpi-label {
        font-size: 7.5pt;
        font-weight: 700;
        color: #666666;
        margin-bottom: 2px;
      }

      .kpi-value {
        font-size: 12pt;
        font-weight: 900;
        color: #231610;
        line-height: 1.2;
      }

      .kpi-card.primary .kpi-value {
        color: #8B1E1E;
      }

      .kpi-card.profit .kpi-value {
        color: #166534;
      }

      .kpi-sub {
        font-size: 7pt;
        color: #777777;
        margin-top: 3px;
      }

      .section-title {
        font-size: 9.5pt;
        font-weight: 800;
        color: #8B1E1E;
        border-bottom: 1.5px solid #F0E8DD;
        padding-bottom: 3px;
        margin-top: 10px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .report-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8pt;
        margin-bottom: 10px;
      }

      .report-table th {
        background: #F5EFE6;
        color: #3E2723;
        font-weight: 800;
        text-align: right;
        padding: 5px 8px;
        border-top: 1px solid #D7C3A5;
        border-bottom: 1.5px solid #D7C3A5;
      }

      .report-table td {
        padding: 4px 8px;
        border-bottom: 1px solid #EFEAE3;
        color: #241A15;
      }

      .report-table tr:nth-child(even) td {
        background: #FAF7F2;
      }

      .report-table td.num {
        font-family: 'Cairo', sans-serif;
        font-weight: 700;
        text-align: left;
        direction: ltr;
      }

      .report-table tr.total-row td {
        background: #FFF8EF;
        font-weight: 900;
        color: #8B1E1E;
        border-top: 2px solid #8B1E1E;
        border-bottom: 2px solid #8B1E1E;
        font-size: 8.5pt;
      }

      .two-cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 8px;
      }

      .footer-sign {
        margin-top: 16px;
        border-top: 1px dashed #D7C3A5;
        padding-top: 10px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 7.5pt;
        color: #666666;
      }

      .sign-box {
        text-align: center;
        width: 140px;
      }

      .sign-line {
        border-bottom: 1px solid #333333;
        margin-top: 22px;
        margin-bottom: 4px;
      }
    </style>
  </head>
  <body>
    <div class="report-page">
      <!-- HEADER -->
      <div class="header-container">
        <div class="brand-box">
          <div class="brand-emblem">ب</div>
          <div class="brand-text">
            <div class="main-name">${profile.name}</div>
            <div class="sub-name">سجل تجاري: ${profile.crNumber || '4030291823'} | ${profile.address || 'الفرع الرئيسي'}</div>
            <div style="font-size: 7.5pt; color: #888888; margin-top: 2px;">
              رقم التسجيل الضريبي: ${profile.taxNumber || '310293847500003'} | هاتف: ${profile.phone}
            </div>
          </div>
        </div>

        <div class="header-meta">
          <div class="doc-badge">مستند مالي معتمد A4</div>
          <div class="meta-line"><strong>رقم التقرير:</strong> ${reportId}</div>
          <div class="meta-line"><strong>تاريخ الطباعة:</strong> ${printDateStr}</div>
          <div class="meta-line"><strong>توقيت الإصدار:</strong> ${printTimeStr}</div>
          <div class="meta-line"><strong>المسؤول:</strong> ${generatedBy}</div>
        </div>
      </div>

      <!-- TITLE -->
      <div class="title-strip">
        <div class="main-title">ملخص المركز المالي وقائمة الدخل التشغيلي</div>
        <div class="period-badge">الفترة المحاسبية: ${periodLabel}</div>
      </div>

      <!-- KPIS -->
      <div class="kpi-grid">
        <div class="kpi-card primary">
          <div class="kpi-label">إجمالي الإيرادات المحصلة</div>
          <div class="kpi-value">${totalGrossRevenue.toLocaleString('ar-EG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} <span style="font-size: 8pt;">${profile.currency}</span></div>
          <div class="kpi-sub">شاملة ضريبة القيمة المضافة والخدمة</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">صافي المبيعات (Subtotal)</div>
          <div class="kpi-value">${totalSubtotal.toLocaleString('ar-EG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} <span style="font-size: 8pt;">${profile.currency}</span></div>
          <div class="kpi-sub">قبل إضافة الضرائب والرسوم</div>
        </div>

        <div class="kpi-card profit">
          <div class="kpi-label">إجمالي الربح التقديري (Gross Profit)</div>
          <div class="kpi-value">+${grossProfit.toLocaleString('ar-EG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} <span style="font-size: 8pt;">${profile.currency}</span></div>
          <div class="kpi-sub">هامش ربح تقديري ${grossMarginPercent}%</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">حجم العمليات والفواتير</div>
          <div class="kpi-value">${totalOrdersCount} <span style="font-size: 8pt;">فاتورة</span></div>
          <div class="kpi-sub">متوسط الفاتورة: ${avgOrderTicket.toFixed(2)} ${profile.currency}</div>
        </div>
      </div>

      <!-- INCOME STATEMENT TABLE -->
      <div class="section-title">بيان الدخل والإيرادات التفصيلي (Income & Revenue Statement)</div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 50%;">البند المالي والتشغيلي</th>
            <th style="width: 25%;">التصنيف المحاسبي</th>
            <th style="width: 25%; text-align: left;">القيمة (${profile.currency})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>إجمالي مبيعات الأصناف والمأكولات (Subtotal)</strong></td>
            <td>إيرادات نشاط مطاعم ومأكولات</td>
            <td class="num">${totalSubtotal.toFixed(2)}</td>
          </tr>
          ${
            totalDiscounts > 0
              ? `
            <tr style="color: #b91c1c;">
              <td><strong>إجمالي الخصومات والعروض الترويجية الممنوحة</strong></td>
              <td>تخفيضات ومبيعات ترويجية</td>
              <td class="num">-${totalDiscounts.toFixed(2)}</td>
            </tr>
          `
              : ''
          }
          <tr>
            <td><strong>ضريبة القيمة المضافة المحصلة (${profile.defaultTaxPercent || 14}%)</strong></td>
            <td>أمانات مصلحة الضرائب المصرية</td>
            <td class="num">+${totalTax.toFixed(2)}</td>
          </tr>
          ${
            totalServiceCharge > 0
              ? `
            <tr>
              <td><strong>رسوم خدمة الصالة المحصلة (${profile.defaultServicePercent || 12}%)</strong></td>
              <td>خدمات ضيافة الصالات الداخلية</td>
              <td class="num">+${totalServiceCharge.toFixed(2)}</td>
            </tr>
          `
              : ''
          }
          <tr class="total-row">
            <td><strong>الإجمالي الكلي للمقبوضات (Total Gross Revenue)</strong></td>
            <td>إجمالي المتحصلات النقدية والبنكية</td>
            <td class="num">${totalGrossRevenue.toFixed(2)} ${profile.currency}</td>
          </tr>
          <tr>
            <td><strong>تكلفة البضاعة المباعة التقديرية (COGS)</strong></td>
            <td>لحوم ومواد خام وتوابل</td>
            <td class="num">-${totalCost.toFixed(2)}</td>
          </tr>
          ${
            totalExpenses > 0
              ? `
            <tr>
              <td><strong>المصروفات والنثريات التشغيلية المعتمدة (Expenses)</strong></td>
              <td>نثريات، صيانة، مستلزمات تشغيل</td>
              <td class="num">-${totalExpenses.toFixed(2)}</td>
            </tr>
            <tr style="background: #E8F5E9; font-weight: 800;">
              <td><strong>صافي التدفق المالي للفترة (Net Cash Flow)</strong></td>
              <td>المقبوضات مطروحاً منها المصروفات</td>
              <td class="num" style="color: #166534;">+${netCashFlow.toFixed(2)} ${profile.currency}</td>
            </tr>
          `
              : ''
          }
        </tbody>
      </table>

      <!-- BREAKDOWN BY PAYMENT AND CHANNEL -->
      <div class="two-cols">
        <div>
          <div class="section-title">تسوية طرق الدفع (Payment Methods)</div>
          <table class="report-table">
            <thead>
              <tr>
                <th>طريقة الدفع</th>
                <th style="text-align: center;">النسبة</th>
                <th style="text-align: left;">المحصل (${profile.currency})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>💵 مدفوعات نقدية (Cash)</td>
                <td style="text-align: center;">${cashPct}%</td>
                <td class="num">${cashSales.toFixed(2)}</td>
              </tr>
              <tr>
                <td>💳 بطاقات بنكية وفيزا (Card)</td>
                <td style="text-align: center;">${cardPct}%</td>
                <td class="num">${cardSales.toFixed(2)}</td>
              </tr>
              <tr>
                <td>📱 محافظ إلكترونية وانستاباي (Instapay)</td>
                <td style="text-align: center;">${instapayPct}%</td>
                <td class="num">${instapaySales.toFixed(2)}</td>
              </tr>
              ${
                otherSales > 0
                  ? `
                <tr>
                  <td>⚡ طرق سداد أخرى (Other)</td>
                  <td style="text-align: center;">${otherPct}%</td>
                  <td class="num">${otherSales.toFixed(2)}</td>
                </tr>
              `
                  : ''
              }
              <tr class="total-row">
                <td><strong>إجمالي التسويات</strong></td>
                <td style="text-align: center;">100%</td>
                <td class="num">${totalPayments.toFixed(2)} ${profile.currency}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div class="section-title">المبيعات حسب قنوات الطلب (Channels)</div>
          <table class="report-table">
            <thead>
              <tr>
                <th>القناة</th>
                <th style="text-align: center;">الطلبات</th>
                <th style="text-align: left;">الإجمالي (${profile.currency})</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(channelData)
                .map(
                  (c) => `
                <tr>
                  <td>${c.label}</td>
                  <td style="text-align: center; font-weight: 700;">${c.count}</td>
                  <td class="num">${c.total.toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
              <tr class="total-row">
                <td><strong>الإجمالي</strong></td>
                <td style="text-align: center;">${totalOrdersCount}</td>
                <td class="num">${totalGrossRevenue.toFixed(2)} ${profile.currency}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TOP SELLING PRODUCTS -->
      ${
        topItems.length > 0
          ? `
        <div class="section-title">الأصناف والوجبات الأكثر مبيعاً وتحقيقاً للإيراد</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 55%;">الصنف / الوجبة</th>
              <th style="width: 20%; text-align: center;">الكمية المباعة</th>
              <th style="width: 25%; text-align: left;">إجمالي الإيراد (${profile.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${topItems
              .map(
                (item, idx) => `
              <tr>
                <td><strong>${idx + 1}. ${item.name}</strong></td>
                <td style="text-align: center; font-weight: 700;">${item.count} وجبة</td>
                <td class="num">${item.revenue.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `
          : ''
      }

      <!-- SIGNATURES -->
      <div class="footer-sign">
        <div class="sign-box">
          <div>إعداد الكاشير / المسؤول</div>
          <div class="sign-line"></div>
          <div>${generatedBy}</div>
        </div>

        <div style="text-align: center; font-size: 7pt; color: #888888;">
          تم توليد هذا التقرير آلياً عبر نظام مشويات الباشا POS التجاري.<br />
          مستند مالي صالح للمراجعة الدفترية والضريبية.
        </div>

        <div class="sign-box">
          <div>اعتماد المدير المالي / الفرع</div>
          <div class="sign-line"></div>
          <div>الختم والتوقيع</div>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

/**
 * Generate full A4 Detailed Sales & Orders Data HTML Report for Browser-Native Print and PDF Export
 */
export function generateSalesReportHTML(data: FinancialReportData): string {
  const { profile, orders, periodLabel, generatedBy = 'مدير النظام' } = data;

  const now = new Date();
  const printDateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const printTimeStr = now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const reportId = `SALES-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalSubtotal = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalTax = orders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
  const totalService = orders.reduce((sum, o) => sum + (o.serviceChargeAmount || 0), 0);
  const totalOrdersCount = orders.length;
  const avgOrderTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  // Order Type Names helper
  const getOrderTypeName = (type: Order['type']): string => {
    switch (type) {
      case 'dine_in':
        return 'صالات';
      case 'takeaway':
        return 'سفري';
      case 'delivery':
        return 'توصيل';
      case 'pickup':
        return 'استلام';
      default:
        return type;
    }
  };

  // Payment Label helper
  const getPaymentLabel = (order: Order): string => {
    if (!order.payments || order.payments.length === 0) return 'نقدي';
    return order.payments
      .map((p) => {
        if (p.method === 'cash') return 'نقدي';
        if (p.method === 'card') return 'بطاقة';
        if (p.method === 'instapay') return 'انستاباي';
        return p.method;
      })
      .join(' + ');
  };

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>تقرير حركة المبيعات التفصيلي - ${profile.name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      @page {
        size: A4 portrait;
        margin: 8mm;
      }

      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body {
        font-family: 'Cairo', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, sans-serif;
        background: #ffffff;
        color: #231610;
        margin: 0;
        padding: 0;
        line-height: 1.4;
        direction: rtl;
        font-size: 9.5pt;
      }

      .report-page {
        width: 100%;
        max-width: 194mm;
        margin: 0 auto;
        padding: 2mm 0;
      }

      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #8B1E1E;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }

      .brand-box {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .brand-emblem {
        width: 44px;
        height: 44px;
        background: #8B1E1E;
        color: #FAF7F2;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20pt;
        font-weight: 900;
        border: 2px solid #D7C3A5;
      }

      .brand-text .main-name {
        font-size: 14pt;
        font-weight: 900;
        color: #8B1E1E;
        line-height: 1.2;
      }

      .brand-text .sub-name {
        font-size: 8pt;
        font-weight: 700;
        color: #7A6455;
        margin-top: 2px;
      }

      .header-meta {
        text-align: left;
        font-size: 8pt;
        color: #555555;
        line-height: 1.35;
      }

      .header-meta .doc-badge {
        display: inline-block;
        background: #8B1E1E;
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 800;
        font-size: 7.5pt;
        margin-bottom: 4px;
      }

      .title-strip {
        background: #FBF9F6;
        border: 1px solid #E8DFD5;
        border-right: 4px solid #8B1E1E;
        padding: 7px 12px;
        border-radius: 8px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .title-strip .main-title {
        font-size: 11pt;
        font-weight: 900;
        color: #231610;
      }

      .title-strip .period-badge {
        background: #FFF8EF;
        border: 1px solid #D7C3A5;
        color: #8B1E1E;
        font-size: 8pt;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 6px;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }

      .kpi-card {
        background: #FAFAFA;
        border: 1px solid #E5E5E5;
        border-radius: 8px;
        padding: 6px 8px;
        text-align: center;
      }

      .kpi-card.primary {
        background: #FFF8EF;
        border-color: #D7C3A5;
      }

      .kpi-label {
        font-size: 7.5pt;
        font-weight: 700;
        color: #666666;
        margin-bottom: 2px;
      }

      .kpi-value {
        font-size: 12pt;
        font-weight: 900;
        color: #231610;
        line-height: 1.2;
      }

      .kpi-card.primary .kpi-value {
        color: #8B1E1E;
      }

      .kpi-sub {
        font-size: 7pt;
        color: #777777;
        margin-top: 2px;
      }

      .report-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 7.5pt;
        margin-bottom: 12px;
      }

      .report-table th {
        background: #F5EFE6;
        color: #3E2723;
        font-weight: 800;
        text-align: right;
        padding: 5px 6px;
        border-top: 1px solid #D7C3A5;
        border-bottom: 1.5px solid #D7C3A5;
      }

      .report-table td {
        padding: 4px 6px;
        border-bottom: 1px solid #EFEAE3;
        color: #241A15;
      }

      .report-table tr:nth-child(even) td {
        background: #FAF7F2;
      }

      .report-table td.num {
        font-family: 'Cairo', sans-serif;
        font-weight: 700;
        text-align: left;
        direction: ltr;
      }

      .report-table tr.total-row td {
        background: #FFF8EF;
        font-weight: 900;
        color: #8B1E1E;
        border-top: 2px solid #8B1E1E;
        border-bottom: 2px solid #8B1E1E;
        font-size: 8pt;
      }

      .footer-sign {
        margin-top: 14px;
        border-top: 1px dashed #D7C3A5;
        padding-top: 8px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 7.5pt;
        color: #666666;
      }

      .sign-box {
        text-align: center;
        width: 130px;
      }

      .sign-line {
        border-bottom: 1px solid #333333;
        margin-top: 20px;
        margin-bottom: 4px;
      }
    </style>
  </head>
  <body>
    <div class="report-page">
      <!-- HEADER -->
      <div class="header-container">
        <div class="brand-box">
          <div class="brand-emblem">ب</div>
          <div class="brand-text">
            <div class="main-name">${profile.name}</div>
            <div class="sub-name">سجل تجاري: ${profile.crNumber || '4030291823'} | ${profile.address || 'الفرع الرئيسي'}</div>
            <div style="font-size: 7.5pt; color: #888888; margin-top: 2px;">
              رقم التسجيل الضريبي: ${profile.taxNumber || '310293847500003'} | هاتف: ${profile.phone}
            </div>
          </div>
        </div>

        <div class="header-meta">
          <div class="doc-badge">بيان تفصيلي بالمبيعات A4</div>
          <div style="margin: 1px 0;"><strong>رقم التقرير:</strong> ${reportId}</div>
          <div style="margin: 1px 0;"><strong>تاريخ الطباعة:</strong> ${printDateStr}</div>
          <div style="margin: 1px 0;"><strong>توقيت الإصدار:</strong> ${printTimeStr}</div>
          <div style="margin: 1px 0;"><strong>المسؤول:</strong> ${generatedBy}</div>
        </div>
      </div>

      <!-- TITLE -->
      <div class="title-strip">
        <div class="main-title">تقرير حركة المبيعات وتفاصيل فواتير الطلبات</div>
        <div class="period-badge">الفترة: ${periodLabel}</div>
      </div>

      <!-- KPIS -->
      <div class="kpi-grid">
        <div class="kpi-card primary">
          <div class="kpi-label">إجمالي المبيعات المحصلة</div>
          <div class="kpi-value">${totalRevenue.toLocaleString('ar-EG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} <span style="font-size: 8pt;">${profile.currency}</span></div>
          <div class="kpi-sub">شاملة الضريبة والخدمة</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">عدد الفواتير والعمليات</div>
          <div class="kpi-value">${totalOrdersCount} <span style="font-size: 8pt;">طلب</span></div>
          <div class="kpi-sub">فواتير مسجلة بالنظام</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">متوسط قيمة الطلب</div>
          <div class="kpi-value">${avgOrderTicket.toFixed(2)} <span style="font-size: 8pt;">${profile.currency}</span></div>
          <div class="kpi-sub">متوسط الفاتورة الواحدة</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">إجمالي الضريبة والخدمة</div>
          <div class="kpi-value">${(totalTax + totalService).toFixed(2)} <span style="font-size: 8pt;">${profile.currency}</span></div>
          <div class="kpi-sub">ضريبة: ${totalTax.toFixed(1)} | خدمة: ${totalService.toFixed(1)}</div>
        </div>
      </div>

      <!-- ORDERS LIST TABLE -->
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 14%;">رقم الفاتورة</th>
            <th style="width: 10%;">النوع</th>
            <th style="width: 14%;">العميل / الطاولة</th>
            <th style="width: 12%;">الكاشير</th>
            <th style="width: 22%;">الأصناف المطلوبة</th>
            <th style="width: 10%;">الدفع</th>
            <th style="width: 9%; text-align: left;">الإجمالي</th>
            <th style="width: 9%; text-align: center;">الوقت</th>
          </tr>
        </thead>
        <tbody>
          ${
            orders.length === 0
              ? `
            <tr>
              <td colspan="8" style="text-align: center; padding: 16px; color: #888888;">
                لا توجد طلبات مسجلة خلال الفترة المحددة.
              </td>
            </tr>
          `
              : orders
                  .map((o) => {
                    const itemsSummary = o.items
                      .map((i) => `${i.quantity}× ${i.productNameAr}`)
                      .join('، ');
                    const timeStr = new Date(o.createdAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return `
              <tr>
                <td><strong>${o.orderNumber}</strong></td>
                <td>${getOrderTypeName(o.type)}</td>
                <td>${o.tableNumber ? `طاولة ${o.tableNumber}` : o.customerName || 'زبون عام'}</td>
                <td>${o.cashierName || '---'}</td>
                <td style="color: #5C4033; font-size: 7pt;" title="${itemsSummary}">${itemsSummary || '---'}</td>
                <td>${getPaymentLabel(o)}</td>
                <td class="num"><strong>${o.total.toFixed(2)}</strong></td>
                <td style="text-align: center; font-size: 7pt; color: #666;">${timeStr}</td>
              </tr>
            `;
                  })
                  .join('')
          }
          <tr class="total-row">
            <td colspan="4"><strong>إجمالي الفترة (${totalOrdersCount} فاتورة)</strong></td>
            <td colspan="2">المجموع الفرعي: ${totalSubtotal.toFixed(2)} | الضريبة: ${totalTax.toFixed(2)}</td>
            <td class="num"><strong>${totalRevenue.toFixed(2)} ${profile.currency}</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- SIGNATURES -->
      <div class="footer-sign">
        <div class="sign-box">
          <div>مسؤول نقطة البيع</div>
          <div class="sign-line"></div>
          <div>${generatedBy}</div>
        </div>

        <div style="text-align: center; font-size: 7pt; color: #888888;">
          تم استخراج وطباعة تقرير المبيعات بواسطة نظام مشويات الباشا POS.<br />
          جميع البيانات المالية مسجلة في قاعدة بيانات المطعم المعتمدة.
        </div>

        <div class="sign-box">
          <div>مدير الفرع المعتمد</div>
          <div class="sign-line"></div>
          <div>الختم والاعتماد</div>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

/**
 * Download arbitrary HTML document as a direct downloadable .pdf file using html2pdf.js
 */
export async function downloadHTMLAsPDF(
  htmlContent: string,
  filename: string,
  options?: { orientation?: 'portrait' | 'landscape' }
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default || html2pdfModule;

    // Create a temporary hidden container with appropriate dimensions and fonts
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'fixed';
    container.style.top = '-99999px';
    container.style.left = '0';
    container.style.width = options?.orientation === 'landscape' ? '1120px' : '820px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = "'Cairo', 'IBM Plex Sans Arabic', sans-serif";
    container.style.direction = 'rtl';
    container.style.boxSizing = 'border-box';
    document.body.appendChild(container);

    // Let webfonts and layout settle
    await new Promise((resolve) => setTimeout(resolve, 300));

    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

    const opt = {
      margin: [8, 8, 8, 8],
      filename: safeFilename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: options?.orientation || 'portrait',
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    await (html2pdf as any)().set(opt).from(container).save();

    document.body.removeChild(container);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF document via html2pdf:', error);
    return false;
  }
}

/**
 * Direct Download: Financial Summary Report as a downloadable PDF document
 */
export async function downloadFinancialReportPDF(
  data: FinancialReportData,
  filename?: string
): Promise<boolean> {
  const html = generateFinancialReportHTML(data);
  const nowStr = new Date().toISOString().slice(0, 10);
  const safeName =
    filename ||
    `تقرير_مالي_تنفيذي_${data.profile.name.replace(/\s+/g, '_')}_${nowStr}.pdf`;
  const success = await downloadHTMLAsPDF(html, safeName, { orientation: 'portrait' });
  if (!success) {
    // Graceful fallback to print dialog
    await triggerFinancialReportPrint(data);
  }
  return true;
}

/**
 * Direct Download: Detailed Sales Data Report as a downloadable PDF document
 */
export async function downloadSalesReportPDF(
  data: FinancialReportData,
  filename?: string
): Promise<boolean> {
  const html = generateSalesReportHTML(data);
  const nowStr = new Date().toISOString().slice(0, 10);
  const safeName =
    filename ||
    `تقرير_مبيعات_تفصيلي_${data.profile.name.replace(/\s+/g, '_')}_${nowStr}.pdf`;
  const success = await downloadHTMLAsPDF(html, safeName, { orientation: 'portrait' });
  if (!success) {
    // Graceful fallback to print dialog
    await triggerSalesReportPrint(data);
  }
  return true;
}

/**
 * Trigger browser-native print / save as PDF dialog for Financial Summary
 */
export async function triggerFinancialReportPrint(data: FinancialReportData): Promise<boolean> {
  return triggerPrintForHTML(generateFinancialReportHTML(data), 'financial-report-print-iframe');
}

/**
 * Trigger browser-native print / save as PDF dialog for Sales Data
 */
export async function triggerSalesReportPrint(data: FinancialReportData): Promise<boolean> {
  return triggerPrintForHTML(generateSalesReportHTML(data), 'sales-report-print-iframe');
}

/**
 * Helper to trigger print via an isolated iframe
 */
async function triggerPrintForHTML(html: string, iframeId: string): Promise<boolean> {
  try {
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (iframe) {
      document.body.removeChild(iframe);
    }

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      throw new Error('Unable to access iframe document');
    }

    doc.open();
    doc.write(html);
    doc.close();

    await new Promise((resolve) => setTimeout(resolve, 350));

    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.print();
    }

    return true;
  } catch (err) {
    console.error('Failed to trigger print:', err);
    return false;
  }
}

/**
 * Fallback: Download HTML report as a standalone .html file
 */
export function downloadFinancialReportHTML(data: FinancialReportData, filename?: string): void {
  const html = generateFinancialReportHTML(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename ||
    `تقرير_مالي_${data.profile.name.replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Fallback: Download Sales Data HTML report as a standalone .html file
 */
export function downloadSalesReportHTML(data: FinancialReportData, filename?: string): void {
  const html = generateSalesReportHTML(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename ||
    `تقرير_مبيعات_${data.profile.name.replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
