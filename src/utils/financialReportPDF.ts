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

  // Top Selling Items
  const itemMap: Record<
    string,
    { name: string; count: number; total: number; cost: number }
  > = {};

  orders.forEach((o) => {
    o.items.forEach((i) => {
      if (!itemMap[i.productId]) {
        itemMap[i.productId] = {
          name: i.productNameAr,
          count: 0,
          total: 0,
          cost: 0,
        };
      }
      itemMap[i.productId].count += i.quantity;
      itemMap[i.productId].total += i.itemTotal;
      itemMap[i.productId].cost += (i.costPrice || 0) * i.quantity;
    });
  });

  const topItems = Object.values(itemMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>التقرير المالي التنفيذي - ${profile.name} - ${periodLabel}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 14mm 12mm 14mm;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
          background: #ffffff;
          color: #1f1f1f;
          margin: 0;
          padding: 0;
          font-size: 11pt;
          line-height: 1.45;
          direction: rtl;
        }

        .report-page {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          background: #ffffff;
        }

        /* HEADER */
        .report-header {
          border-bottom: 2.5px solid #8B1E1E;
          padding-bottom: 12px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo-badge {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: #FFF8EF;
          border: 1.5px solid #D7C3A5;
          color: #8B1E1E;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          font-weight: 900;
        }

        .brand-text h1 {
          margin: 0;
          font-size: 16pt;
          font-weight: 900;
          color: #8B1E1E;
          line-height: 1.2;
        }

        .brand-text .sub-name {
          font-size: 9pt;
          font-weight: 700;
          color: #7A6455;
          margin-top: 2px;
        }

        .header-meta {
          text-align: left;
          font-size: 8.5pt;
          color: #555555;
          line-height: 1.4;
        }

        .header-meta .doc-badge {
          display: inline-block;
          background: #8B1E1E;
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 8pt;
          margin-bottom: 4px;
        }

        .meta-line {
          margin: 1px 0;
        }

        .meta-line strong {
          color: #222;
        }

        /* TITLE BAR */
        .title-strip {
          background: #FBF9F6;
          border: 1px solid #E8DFD5;
          border-right: 4px solid #8B1E1E;
          padding: 8px 12px;
          border-radius: 8px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .title-strip .main-title {
          font-size: 12pt;
          font-weight: 900;
          color: #231610;
        }

        .title-strip .period-badge {
          background: #FFF8EF;
          border: 1px solid #D7C3A5;
          color: #8B1E1E;
          font-size: 8.5pt;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 6px;
        }

        /* KPI GRID */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .kpi-card {
          background: #FAFAFA;
          border: 1px solid #E5E5E5;
          border-radius: 8px;
          padding: 8px 10px;
          text-align: center;
        }

        .kpi-card.primary {
          background: #FFF8EF;
          border-color: #D7C3A5;
        }

        .kpi-label {
          font-size: 8pt;
          font-weight: 700;
          color: #666666;
          margin-bottom: 2px;
        }

        .kpi-value {
          font-size: 13pt;
          font-weight: 900;
          color: #231610;
          line-height: 1.2;
        }

        .kpi-card.primary .kpi-value {
          color: #8B1E1E;
        }

        .kpi-card.profit .kpi-value {
          color: #15803d;
        }

        .kpi-sub {
          font-size: 7.5pt;
          color: #888888;
          margin-top: 2px;
        }

        /* SECTION HEADINGS */
        .section-title {
          font-size: 10pt;
          font-weight: 800;
          color: #231610;
          border-bottom: 1.5px solid #E8DFD5;
          padding-bottom: 4px;
          margin: 12px 0 8px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .section-title::before {
          content: "";
          display: inline-block;
          width: 6px;
          height: 14px;
          background: #8B1E1E;
          border-radius: 2px;
        }

        /* TABLES */
        table.report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 8.5pt;
        }

        table.report-table th {
          background: #F5EFE6;
          color: #3E2723;
          font-weight: 800;
          text-align: right;
          padding: 6px 8px;
          border: 1px solid #E8DFD5;
        }

        table.report-table td {
          padding: 5px 8px;
          border: 1px solid #EFE8DF;
          color: #222222;
        }

        table.report-table tr:nth-child(even) td {
          background: #FCFAF7;
        }

        table.report-table td.num {
          text-align: left;
          font-weight: 700;
          font-family: inherit;
          direction: ltr;
        }

        table.report-table tr.total-row td {
          background: #FFF8EF !important;
          font-weight: 900;
          font-size: 9pt;
          border-top: 1.5px solid #8B1E1E;
          border-bottom: 1.5px solid #8B1E1E;
          color: #8B1E1E;
        }

        /* TWO COLUMN LAYOUT */
        .two-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 10px;
        }

        /* SIGNATURES */
        .signatures-section {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1.5px dashed #C5BAAF;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
          text-align: center;
          font-size: 8pt;
          page-break-inside: avoid;
        }

        .sig-box {
          border: 1px solid #E8DFD5;
          background: #FAFAFA;
          border-radius: 6px;
          padding: 8px 6px;
        }

        .sig-title {
          font-weight: 800;
          color: #333333;
          margin-bottom: 26px;
        }

        .sig-line {
          border-top: 1px dotted #888888;
          padding-top: 3px;
          color: #777777;
          font-size: 7.5pt;
        }

        .report-footer {
          margin-top: 12px;
          text-align: center;
          font-size: 7.5pt;
          color: #888888;
          border-top: 1px solid #EFE8DF;
          padding-top: 6px;
        }

        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="report-page">
        <!-- HEADER -->
        <div class="report-header">
          <div class="header-brand">
            <div class="brand-logo-badge">🍗</div>
            <div class="brand-text">
              <h1>${profile.name}</h1>
              <div class="sub-name">${profile.englishName || 'Restaurant & Grill Commercial Management System'}</div>
              <div style="font-size: 8pt; color: #555; margin-top: 3px;">
                ${profile.address || 'القاهرة، جمهورية مصر العربية'}
              </div>
            </div>
          </div>

          <div class="header-meta">
            <div class="doc-badge">مستند رسمي معتمد</div>
            <div class="meta-line">رقم التقرير: <strong>${reportId}</strong></div>
            <div class="meta-line">الرقم الضريبي: <strong>${profile.taxNumber || '948-201-773'}</strong></div>
            <div class="meta-line">تاريخ الاستخراج: <strong>${printDateStr}</strong></div>
            <div class="meta-line">وقت الإصدار: <strong>${printTimeStr}</strong></div>
            <div class="meta-line">المعتمد بواسطة: <strong>${generatedBy}</strong></div>
          </div>
        </div>

        <!-- TITLE STRIP -->
        <div class="title-strip">
          <div>
            <div class="main-title">تقرير الملخص المالي التنفيذي وإيرادات المبيعات</div>
            <div style="font-size: 8pt; color: #666; margin-top: 1px;">
              المؤشرات المالية المجمعة، تسوية النقدية والشبكة، وحسابات الضريبة والأرباح
            </div>
          </div>
          <div class="period-badge">
            فترة التقرير: ${periodLabel}
          </div>
        </div>

        <!-- KPI OVERVIEW CARDS -->
        <div class="kpi-grid">
          <div class="kpi-card primary">
            <div class="kpi-label">إجمالي الإيرادات (Gross Revenue)</div>
            <div class="kpi-value">${totalGrossRevenue.toLocaleString('ar-EG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} <span style="font-size: 9pt;">${profile.currency}</span></div>
            <div class="kpi-sub">شامل الضرائب والخدمات</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">المبيعات الصافية (Net Sales)</div>
            <div class="kpi-value">${totalSubtotal.toLocaleString('ar-EG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} <span style="font-size: 9pt;">${profile.currency}</span></div>
            <div class="kpi-sub">قبل إضافة الضريبة والخدمة</div>
          </div>

          <div class="kpi-card profit">
            <div class="kpi-label">إجمالي الربح التقديري (Gross Profit)</div>
            <div class="kpi-value">+${grossProfit.toLocaleString('ar-EG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} <span style="font-size: 9pt;">${profile.currency}</span></div>
            <div class="kpi-sub">هامش ربح صافي ${grossMarginPercent}%</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">حجم العمليات (Orders Count)</div>
            <div class="kpi-value">${totalOrdersCount} <span style="font-size: 9pt;">فاتورة</span></div>
            <div class="kpi-sub">متوسط الفاتورة: ${avgOrderTicket.toFixed(2)} ${profile.currency}</div>
          </div>
        </div>

        <!-- FINANCIAL SUMMARY STATEMENT -->
        <div class="section-title">بيان الدخل والإيرادات التفصيلي (Income & Revenue Statement)</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 45%;">البند المالي</th>
              <th style="width: 25%;">التصنيف المحاسبي</th>
              <th style="width: 30%; text-align: left;">القيمة المالية (${profile.currency})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>إجمالي المبيعات الفرعية (Subtotal)</strong></td>
              <td>إيرادات نشاط مطاعم ومأكولات</td>
              <td class="num">${totalSubtotal.toFixed(2)}</td>
            </tr>
            ${
              totalDiscounts > 0
                ? `
              <tr style="color: #b91c1c;">
                <td><strong>إجمالي الخصومات والعروض الممنوحة</strong></td>
                <td>تخفيضات تجارية وترويجية</td>
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
                <td><strong>رسوم خدمة الصالة (${profile.defaultServicePercent || 12}%)</strong></td>
                <td>خدمة عملاء وضيافة الصالات</td>
                <td class="num">+${totalServiceCharge.toFixed(2)}</td>
              </tr>
            `
                : ''
            }
            <tr class="total-row">
              <td><strong>الإجمالي الكلي المحصل (Total Collected)</strong></td>
              <td>إجمالي المقبوضات المالية</td>
              <td class="num">${totalGrossRevenue.toFixed(2)} ${profile.currency}</td>
            </tr>
            <tr>
              <td><strong>تكلفة البضاعة المباعة التقديرية (COGS)</strong></td>
              <td>تكاليف اللحوم والمواد الخام المستهلكة</td>
              <td class="num">-${totalCost.toFixed(2)}</td>
            </tr>
            ${
              totalExpenses > 0
                ? `
              <tr>
                <td><strong>المصروفات التشغيلية المعتمدة (Expenses)</strong></td>
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

        <!-- TWO COLUMN BREAKDOWN: PAYMENT METHODS & CHANNELS -->
        <div class="two-cols">
          <!-- Column 1: Payment Reconciliation -->
          <div>
            <div class="section-title">تسوية طرق الدفع (Payment Settlement)</div>
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
                  <td>💵 <strong>نقدية (Cash)</strong> بالخزينة</td>
                  <td style="text-align: center;">${cashPct}%</td>
                  <td class="num">${cashSales.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>💳 <strong>بطاقات وشبكة (Card POS)</strong></td>
                  <td style="text-align: center;">${cardPct}%</td>
                  <td class="num">${cardSales.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>📱 <strong>إنستاباي ومحافظ (InstaPay)</strong></td>
                  <td style="text-align: center;">${instapayPct}%</td>
                  <td class="num">${instapaySales.toFixed(2)}</td>
                </tr>
                ${
                  otherSales > 0
                    ? `
                  <tr>
                    <td>🔄 <strong>طرق أخرى</strong></td>
                    <td style="text-align: center;">${otherPct}%</td>
                    <td class="num">${otherSales.toFixed(2)}</td>
                  </tr>
                `
                    : ''
                }
                <tr class="total-row">
                  <td><strong>المجموع الإجمالي</strong></td>
                  <td style="text-align: center;">100%</td>
                  <td class="num">${totalPayments.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Column 2: Order Channels -->
          <div>
            <div class="section-title">توزيع قنوات البيع (Sales Channels)</div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>القناة</th>
                  <th style="text-align: center;">الطلبات</th>
                  <th style="text-align: left;">الإيراد (${profile.currency})</th>
                </tr>
              </thead>
              <tbody>
                ${Object.values(channelData)
                  .map(
                    (c) => `
                  <tr>
                    <td><strong>${c.label}</strong></td>
                    <td style="text-align: center; font-weight: 700;">${c.count}</td>
                    <td class="num">${c.total.toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
                <tr class="total-row">
                  <td><strong>الإجمالي</strong></td>
                  <td style="text-align: center;">${totalOrdersCount}</td>
                  <td class="num">${totalGrossRevenue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TOP DISHES TABLE -->
        ${
          topItems.length > 0
            ? `
          <div class="section-title">الأصناف الأكثر مساهمة في المبيعات والأرباح (Top Selling Dishes)</div>
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">#</th>
                <th style="width: 42%;">اسم الصنف</th>
                <th style="width: 15%; text-align: center;">الكمية المباعة</th>
                <th style="width: 20%; text-align: left;">إجمالي الإيراد (${profile.currency})</th>
                <th style="width: 15%; text-align: center;">نسبة المساهمة</th>
              </tr>
            </thead>
            <tbody>
              ${topItems
                .map((item, idx) => {
                  const share =
                    totalGrossRevenue > 0
                      ? ((item.total / totalGrossRevenue) * 100).toFixed(1)
                      : '0';
                  return `
                  <tr>
                    <td style="text-align: center; font-weight: 800; color: #8B1E1E;">${idx + 1}</td>
                    <td><strong>${item.name}</strong></td>
                    <td style="text-align: center; font-weight: 700;">${item.count} وجبة</td>
                    <td class="num">${item.total.toFixed(2)}</td>
                    <td style="text-align: center; font-weight: 700; color: #666;">${share}%</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }

        <!-- LEGAL SIGNATURES BLOCK -->
        <div class="signatures-section">
          <div class="sig-box">
            <div class="sig-title">إعداد الكاشير / المسؤول المالي</div>
            <div class="sig-line">الاسم والتوقيع: ............................</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">مراجعة المحاسب العام</div>
            <div class="sig-line">الاسم والتوقيع: ............................</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">اعتماد مدير عام الفرع / الختم</div>
            <div class="sig-line">الختم والتاريخ: ............................</div>
          </div>
        </div>

        <!-- FOOTER NOTE -->
        <div class="report-footer">
          تم استخراج هذا التقرير المالي آلياً عبر نظام مشويات الباشا التجاري لإدارة المطاعم ونقاط البيع المعتمد • وثيقة صالحة للمراجعة الداخلية والتوثيق المحاسبي
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Triggers Browser-Native Print and PDF Export using an isolated hidden iframe
 */
export async function triggerFinancialReportPrint(data: FinancialReportData): Promise<boolean> {
  try {
    const html = generateFinancialReportHTML(data);

    // 1. Create a hidden print iframe to isolate styles and print dialog
    const iframeId = 'financial-report-print-iframe';
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

    // 2. Wait for fonts & rendering to settle
    await new Promise((resolve) => setTimeout(resolve, 350));

    // 3. Trigger native print / save as PDF
    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.print();
    }

    return true;
  } catch (err) {
    console.error('Failed to trigger financial report print:', err);
    // Fallback: window print with print area
    return false;
  }
}

/**
 * Fallback: Download HTML report as a standalone .html file that can be opened and printed/saved as PDF in any browser
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
