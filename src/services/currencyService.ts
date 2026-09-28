import { CurrencyInfo, MultiCurrencySettings, Product, RestaurantProfile } from '../types';
import { posDb } from './db';

export const DEFAULT_SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  {
    code: 'EGP',
    nameAr: 'جنيه مصري',
    nameEn: 'Egyptian Pound',
    symbolAr: 'ج.م',
    symbolEn: 'EGP',
    exchangeRate: 1.0,
    isBase: true,
    isActive: true,
    roundingRule: 'decimal2',
    lastUpdated: new Date().toISOString(),
  },
  {
    code: 'SAR',
    nameAr: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    symbolAr: 'ر.س',
    symbolEn: 'SAR',
    exchangeRate: 0.076, // 1 EGP = 0.076 SAR (approx 1 SAR = 13.15 EGP)
    isBase: false,
    isActive: true,
    roundingRule: 'decimal2',
    lastUpdated: new Date().toISOString(),
  },
  {
    code: 'AED',
    nameAr: 'درهم إماراتي',
    nameEn: 'UAE Dirham',
    symbolAr: 'د.إ',
    symbolEn: 'AED',
    exchangeRate: 0.075,
    isBase: false,
    isActive: true,
    roundingRule: 'decimal2',
    lastUpdated: new Date().toISOString(),
  },
  {
    code: 'USD',
    nameAr: 'دولار أمريكي',
    nameEn: 'US Dollar',
    symbolAr: '$',
    symbolEn: 'USD',
    exchangeRate: 0.0205, // 1 EGP = 0.0205 USD (approx 1 USD = 48.8 EGP)
    isBase: false,
    isActive: true,
    roundingRule: 'decimal2',
    lastUpdated: new Date().toISOString(),
  },
  {
    code: 'EUR',
    nameAr: 'يورو أوروبي',
    nameEn: 'Euro',
    symbolAr: '€',
    symbolEn: 'EUR',
    exchangeRate: 0.019,
    isBase: false,
    isActive: true,
    roundingRule: 'decimal2',
    lastUpdated: new Date().toISOString(),
  },
  {
    code: 'KWD',
    nameAr: 'دينار كويتي',
    nameEn: 'Kuwaiti Dinar',
    symbolAr: 'د.ك',
    symbolEn: 'KWD',
    exchangeRate: 0.0063,
    isBase: false,
    isActive: true,
    roundingRule: 'decimal2',
    lastUpdated: new Date().toISOString(),
  },
  {
    code: 'QAR',
    nameAr: 'ريال قطري',
    nameEn: 'Qatari Riyal',
    symbolAr: 'ر.ق',
    symbolEn: 'QAR',
    exchangeRate: 0.074,
    isBase: false,
    isActive: true,
    roundingRule: 'decimal2',
    lastUpdated: new Date().toISOString(),
  },
  {
    code: 'BHD',
    nameAr: 'دينار بحريني',
    nameEn: 'Bahraini Dinar',
    symbolAr: 'د.ب',
    symbolEn: 'BHD',
    exchangeRate: 0.0077,
    isBase: false,
    isActive: false,
    roundingRule: 'decimal2',
    lastUpdated: new Date().toISOString(),
  },
  {
    code: 'OMR',
    nameAr: 'ريال عماني',
    nameEn: 'Omani Rial',
    symbolAr: 'ر.ع',
    symbolEn: 'OMR',
    exchangeRate: 0.0079,
    isBase: false,
    isActive: false,
    roundingRule: 'decimal2',
    lastUpdated: new Date().toISOString(),
  },
];

export const defaultMultiCurrencySettings: MultiCurrencySettings = {
  baseCurrency: 'EGP',
  baseSymbol: 'ج.م',
  supportedCurrencies: DEFAULT_SUPPORTED_CURRENCIES,
  allowSecondaryCurrencyInPOS: true,
  secondaryCurrencyCode: 'USD',
  autoUpdatePricesOnBaseChange: false,
  priceRounding: 'decimal2',
  lastRateUpdate: new Date().toISOString(),
};

const STORAGE_KEY_CURRENCIES = 'basha_pos_currency_settings_v1';

class CurrencyService {
  /**
   * Load currency settings from storage or profile
   */
  public getSettings(profile?: RestaurantProfile): MultiCurrencySettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENCIES);
      if (stored) {
        const parsed = JSON.parse(stored) as MultiCurrencySettings;
        if (parsed.supportedCurrencies && parsed.supportedCurrencies.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored currency settings:', e);
    }

    if (profile?.multiCurrencySettings) {
      return profile.multiCurrencySettings;
    }

    // Default with profile currency if present
    const baseCode = profile?.currencySymbol || 'EGP';
    const baseSym = profile?.currency || 'ج.م';

    const currencies = DEFAULT_SUPPORTED_CURRENCIES.map((c) => ({
      ...c,
      isBase: c.code === baseCode,
    }));

    return {
      ...defaultMultiCurrencySettings,
      baseCurrency: baseCode,
      baseSymbol: baseSym,
      supportedCurrencies: currencies,
    };
  }

  /**
   * Save currency settings to localStorage and update restaurant profile
   */
  public saveSettings(settings: MultiCurrencySettings): void {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCIES, JSON.stringify(settings));

      // Also sync base currency to RestaurantProfile so the entire POS stays aligned
      const profile = posDb.getProfile();
      const baseInfo = settings.supportedCurrencies.find((c) => c.code === settings.baseCurrency);
      const updatedProfile: Partial<RestaurantProfile> = {
        currency: baseInfo?.symbolAr || settings.baseSymbol,
        currencySymbol: settings.baseCurrency,
        multiCurrencySettings: settings,
      };
      posDb.updateProfile(updatedProfile);
    } catch (e) {
      console.error('Failed to save currency settings:', e);
    }
  }

  /**
   * Apply rounding rule to numerical price
   */
  public applyPriceRounding(
    price: number,
    rule: 'none' | 'decimal2' | 'ceil' | 'round5' | 'round10' = 'decimal2'
  ): number {
    if (isNaN(price) || price <= 0) return 0;

    switch (rule) {
      case 'none':
        return Number(price.toFixed(4));
      case 'decimal2':
        return Math.round(price * 100) / 100;
      case 'ceil':
        return Math.ceil(price);
      case 'round5':
        return Math.round(price / 5) * 5;
      case 'round10':
        return Math.round(price / 10) * 10;
      default:
        return Math.round(price * 100) / 100;
    }
  }

  /**
   * Convert an amount between two currencies based on settings
   */
  public convertAmount(
    amount: number,
    fromCode: string,
    toCode: string,
    settings: MultiCurrencySettings
  ): number {
    if (fromCode === toCode || amount === 0) return amount;

    const fromCurr = settings.supportedCurrencies.find((c) => c.code === fromCode);
    const toCurr = settings.supportedCurrencies.find((c) => c.code === toCode);

    if (!fromCurr || !toCurr) return amount;

    // Convert from fromCurr to Base, then Base to toCurr
    // Note: exchangeRate is 1 Base = X Target
    // So: amountInBase = amount / fromCurr.exchangeRate
    // targetAmount = amountInBase * toCurr.exchangeRate
    const amountInBase = fromCurr.isBase ? amount : amount / (fromCurr.exchangeRate || 1);
    const targetAmount = toCurr.isBase ? amountInBase : amountInBase * (toCurr.exchangeRate || 1);

    return this.applyPriceRounding(targetAmount, toCurr.roundingRule || settings.priceRounding);
  }

  /**
   * Format an amount with secondary currency display string (e.g. "150 ج.م (≈ $3.10)")
   */
  public formatWithSecondary(
    amount: number,
    settings: MultiCurrencySettings
  ): { primary: string; secondary?: string } {
    const baseInfo = settings.supportedCurrencies.find((c) => c.code === settings.baseCurrency);
    const baseSymbol = baseInfo?.symbolAr || settings.baseSymbol || 'ج.م';
    const primary = `${amount.toFixed(2)} ${baseSymbol}`;

    if (!settings.allowSecondaryCurrencyInPOS || !settings.secondaryCurrencyCode) {
      return { primary };
    }

    const secInfo = settings.supportedCurrencies.find((c) => c.code === settings.secondaryCurrencyCode);
    if (!secInfo || secInfo.code === settings.baseCurrency) {
      return { primary };
    }

    const converted = this.convertAmount(amount, settings.baseCurrency, secInfo.code, settings);
    const secondary = `(≈ ${converted.toFixed(2)} ${secInfo.symbolAr})`;

    return { primary, secondary };
  }

  /**
   * Batch update all product prices and optionally cost prices in posDb
   * Returns details of converted products
   */
  public batchUpdateProductPrices(options: {
    conversionMultiplier: number;
    rounding: 'none' | 'decimal2' | 'ceil' | 'round5' | 'round10';
    updateCostPrice?: boolean;
    excludedProductIds?: string[];
    userId?: string;
    userName?: string;
    reasonDescription?: string;
  }): {
    success: boolean;
    updatedCount: number;
    preview: Array<{
      id: string;
      nameAr: string;
      oldPrice: number;
      newPrice: number;
      oldCost: number;
      newCost: number;
    }>;
  } {
    const {
      conversionMultiplier,
      rounding = 'decimal2',
      updateCostPrice = false,
      excludedProductIds = [],
      userId = 'admin',
      userName = 'المدير العام',
      reasonDescription = 'تحديث الأسعار بناءً على سعر صرف العملة',
    } = options;

    if (isNaN(conversionMultiplier) || conversionMultiplier <= 0) {
      return { success: false, updatedCount: 0, preview: [] };
    }

    const allProducts = posDb.getProducts({ includeArchived: true });
    const excludedSet = new Set(excludedProductIds);
    const preview: Array<{
      id: string;
      nameAr: string;
      oldPrice: number;
      newPrice: number;
      oldCost: number;
      newCost: number;
    }> = [];

    allProducts.forEach((product) => {
      if (excludedSet.has(product.id)) return;

      const oldPrice = product.price;
      const newPrice = this.applyPriceRounding(oldPrice * conversionMultiplier, rounding);
      const oldCost = product.costPrice || 0;
      const newCost = updateCostPrice
        ? this.applyPriceRounding(oldCost * conversionMultiplier, rounding)
        : oldCost;

      preview.push({
        id: product.id,
        nameAr: product.nameAr,
        oldPrice,
        newPrice,
        oldCost,
        newCost,
      });

      // Save each product
      posDb.saveProduct(
        {
          ...product,
          price: newPrice,
          costPrice: newCost,
        },
        userId,
        userName
      );
    });

    // Log batch audit
    posDb.logAudit({
      userId,
      userName,
      action: 'UPDATE_INVENTORY_ITEM',
      category: 'inventory',
      details: `${reasonDescription}: تم تحديث أسعار ${preview.length} صنف بمعامل تحويل (${conversionMultiplier.toFixed(4)}) وتقريب (${rounding}).`,
    });

    return {
      success: true,
      updatedCount: preview.length,
      preview,
    };
  }
}

export const currencyService = new CurrencyService();
