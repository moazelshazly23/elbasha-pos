import React, { useState, useEffect } from 'react';
import { Scroll, Plus, Trash2, Edit2, Check, AlertCircle, Percent, DollarSign } from 'lucide-react';
import { Recipe, Product, Ingredient } from '../../types';
import { posDb } from '../../services/db';
import { useBrand } from '../../context/BrandContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

export const RecipesView: React.FC = () => {
  const { profile } = useBrand();
  const { showToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>(() => posDb.getRecipes());
  const [products, setProducts] = useState<Product[]>(() => posDb.getProducts());
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => posDb.getIngredients());

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [currentRecipeItems, setCurrentRecipeItems] = useState<{ ingredientId: string; quantity: number }[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setRecipes(posDb.getRecipes());
      setProducts(posDb.getProducts());
      setIngredients(posDb.getIngredients());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      const rec = recipes.find((r) => r.productId === selectedProductId);
      if (rec) {
        setCurrentRecipeItems(rec.items.map((i) => ({ ingredientId: i.ingredientId, quantity: i.quantity })));
      } else {
        setCurrentRecipeItems([]);
      }
    }
  }, [selectedProductId, recipes]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleAddItem = (ingId: string) => {
    if (currentRecipeItems.some((i) => i.ingredientId === ingId)) return;
    setCurrentRecipeItems((prev) => [...prev, { ingredientId: ingId, quantity: 1 }]);
  };

  const handleUpdateQuantity = (ingId: string, quantity: number) => {
    setCurrentRecipeItems((prev) =>
      prev.map((i) => (i.ingredientId === ingId ? { ...i, quantity: Math.max(0.001, quantity) } : i))
    );
  };

  const handleRemoveItem = (ingId: string) => {
    setCurrentRecipeItems((prev) => prev.filter((i) => i.ingredientId !== ingId));
  };

  // Calculate live recipe cost
  const totalCost = currentRecipeItems.reduce((acc, item) => {
    const ing = ingredients.find((i) => i.id === item.ingredientId);
    return acc + (ing ? ing.costPerUnit * item.quantity : 0);
  }, 0);

  const sellingPrice = selectedProduct?.price || 0;
  const foodCostPercent = sellingPrice > 0 ? ((totalCost / sellingPrice) * 100).toFixed(1) : '0';
  const profitMargin = sellingPrice - totalCost;

  const handleSaveRecipe = () => {
    if (!selectedProductId || !selectedProduct) return;

    const formattedItems = currentRecipeItems.map((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      return {
        ingredientId: item.ingredientId,
        ingredientName: ing?.name || '',
        quantity: item.quantity,
        unit: ing?.unit || 'كجم',
      };
    });

    posDb.saveRecipe({
      productId: selectedProductId,
      productName: selectedProduct.nameAr,
      items: formattedItems,
      totalCost,
    });

    showToast(`تم حفظ مكونات وصفة "${selectedProduct.nameAr}" بنجاح! سيتم الخصم الآلي عند كل بيع.`, 'success');
  };

  const handleConfirmDeleteRecipe = () => {
    if (!selectedProductId || !selectedProduct) return;
    const name = selectedProduct.nameAr;
    posDb.deleteRecipe(selectedProductId);
    setCurrentRecipeItems([]);
    setIsDeleteModalOpen(false);
    showToast(`تم حذف وصفة "${name}" نهائياً من قاعدة البيانات`, 'success');
  };

  const hasExistingRecipe = recipes.some((r) => r.productId === selectedProductId);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scroll className="w-5 h-5 text-[#8B1E1E]" />
          <div>
            <h2 className="text-base font-extrabold text-[#231610]">
              شجرة الوصفات والخصم الآلي (BOM & Recipe Costing)
            </h2>
            <span className="text-xs text-[#7A6455]">
              ربط كل صنف في المنيو بمكوناته الخام بدقة لاحتساب التكلفة وخصم المخزون تلقائياً
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasExistingRecipe && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors border border-red-200"
              title="حذف هذه الوصفة"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف الوصفة</span>
            </button>
          )}
          <button
            onClick={handleSaveRecipe}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-colors shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>حفظ وتحديث الوصفة</span>
          </button>
        </div>
      </div>

      {/* Main split */}
      {products.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#D7C3A5] flex items-center justify-center text-[#8B1E1E] shadow-xs">
            <Scroll className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-base text-[#231610]">لا توجد أصناف في قائمة الطعام بعد</h3>
          <p className="text-xs text-[#7A6455] max-w-md">
            قم بإضافة أصناف المنيو أولاً من تبويب "المنيو والأصناف" لضبط مكونات الوصفات وحساب التكاليف ونسب الخصم التلقائي من المخزون عند البيع.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Products selector sidebar */}
        <div className="w-full lg:w-72 bg-white border-l border-[#E8DFD5] overflow-y-auto p-3 space-y-1">
          <div className="text-xs font-bold text-[#8B1E1E] mb-2 px-2">اختر الصنف المراد ضبط وصفته:</div>
          {products.map((p) => {
            const hasRec = recipes.some((r) => r.productId === p.id);
            const isSelected = p.id === selectedProductId;

            return (
              <button
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className={`w-full text-right p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#8B1E1E] text-white border-[#8B1E1E]'
                    : 'bg-[#FBF9F6] text-[#3E2723] border-[#E8DFD5] hover:bg-[#F5EFE6]'
                }`}
              >
                <div className="truncate flex-1">
                  <div>{p.nameAr}</div>
                  <div className={`text-[10px] ${isSelected ? 'text-amber-200' : 'text-gray-500'}`}>
                    {p.price} {profile.currency}
                  </div>
                </div>

                {hasRec && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    وصفة مجهزة
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Recipe builder area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
          {selectedProduct && (
            <>
              {/* Product Analytics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#E8DFD5] shadow-xs">
                <div>
                  <span className="text-xs text-[#7A6455] font-semibold">سعر بيع الصنف:</span>
                  <div className="text-lg font-black text-[#231610] tabular-nums">
                    {sellingPrice} {profile.currency}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[#7A6455] font-semibold">تكلفة المواد الخام:</span>
                  <div className="text-lg font-black text-[#8B1E1E] tabular-nums">
                    {totalCost.toFixed(2)} {profile.currency}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[#7A6455] font-semibold">نسبة تكلفة الطعام (Food Cost):</span>
                  <div className="text-lg font-black text-amber-700 tabular-nums">
                    {foodCostPercent}%
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[#7A6455] font-semibold">صافي الربح الإجمالي:</span>
                  <div className="text-lg font-black text-emerald-700 tabular-nums">
                    +{profitMargin.toFixed(2)} {profile.currency}
                  </div>
                </div>
              </div>

              {/* Recipe Ingredients Table */}
              <div className="bg-white rounded-2xl border border-[#E8DFD5] shadow-xs overflow-hidden">
                <div className="p-3 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#231610]">
                    المواد الخام المكونة لـ ({selectedProduct.nameAr})
                  </h3>

                  {/* Add Ingredient Dropdown */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs font-bold bg-white border border-[#D7C3A5] rounded-lg px-2.5 py-1 text-[#8B1E1E]"
                  >
                    <option value="">+ إضافة مادة خام للوصفة...</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit}) - {ing.costPerUnit} {profile.currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 space-y-2">
                  {currentRecipeItems.map((item) => {
                    const ing = ingredients.find((i) => i.id === item.ingredientId);
                    if (!ing) return null;
                    const itemCost = ing.costPerUnit * item.quantity;

                    return (
                      <div
                        key={item.ingredientId}
                        className="flex items-center justify-between p-2.5 bg-[#FBF9F6] border border-[#E8DFD5] rounded-xl text-xs gap-3"
                      >
                        <div className="flex-1 font-bold text-[#231610]">
                          <span>{ing.name}</span>
                          <span className="text-[10px] text-gray-500 block">
                            سعر الكيلو / الوحدة: {ing.costPerUnit} {profile.currency}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0.001"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(item.ingredientId, parseFloat(e.target.value) || 0)
                            }
                            className="w-20 bg-white border border-[#D7C3A5] rounded-lg px-2 py-1 text-center font-bold tabular-nums"
                          />
                          <span className="text-xs font-bold text-gray-600">{ing.unit}</span>
                        </div>

                        <div className="w-28 text-left font-black text-[#8B1E1E] tabular-nums">
                          {itemCost.toFixed(2)} {profile.currency}
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.ingredientId)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {currentRecipeItems.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400">
                      لم يتم ربط أي مواد خام بهذا الصنف بعد. اختر المواد من القائمة أعلاه لتفعيل الخصم الآلي للمخزون.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="تأكيد حذف وصفة الصنف"
        message="هل أنت متأكد من حذف وصفة هذا الصنف نهائياً؟ سيتم إلغاء ربط المكونات والخصم الآلي لهذا الصنف."
        itemName={selectedProduct?.nameAr}
        confirmText="حذف الوصفة نهائياً"
        onConfirm={handleConfirmDeleteRecipe}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
