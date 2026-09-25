import React, { useState, useEffect } from 'react';
import { Grid, Plus, Users, Clock, Edit2, Trash2, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { RestaurantTable, TableStatus } from '../../types';
import { posDb } from '../../services/db';
import { usePOS } from '../../context/POSContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

interface TableManagementProps {
  onNavigateToPOS?: () => void;
}

export const TableManagement: React.FC<TableManagementProps> = ({ onNavigateToPOS }) => {
  const { setSelectedTable, setOrderType } = usePOS();
  const { showToast } = useToast();

  const [tables, setTables] = useState<RestaurantTable[]>(() => posDb.getTables());
  const [activeSection, setActiveSection] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [deletingTable, setDeletingTable] = useState<RestaurantTable | null>(null);

  const [newNumber, setNewNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState<number>(4);
  const [newSection, setNewSection] = useState('الصالة الداخلية');
  const [tableStatus, setTableStatus] = useState<TableStatus>('available');

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setTables(posDb.getTables());
    });
    return unsubscribe;
  }, []);

  const sections = Array.from(new Set(tables.map((t) => t.section)));

  const filteredTables = tables.filter((t) => {
    if (activeSection !== 'all' && t.section !== activeSection) return false;
    return true;
  });

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return { label: 'متاحة للجلوس', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
      case 'occupied':
        return { label: 'مشغولة حالياً', color: 'bg-red-50 text-red-800 border-red-300' };
      case 'reserved':
        return { label: 'محجوزة', color: 'bg-amber-50 text-amber-800 border-amber-300' };
      case 'cleaning':
        return { label: 'تحت التنظيف والتجهيز', color: 'bg-blue-50 text-blue-800 border-blue-300' };
    }
  };

  const handleStatusChange = (tableId: string, status: TableStatus) => {
    posDb.updateTableStatus(tableId, status);
    const tbl = tables.find((t) => t.id === tableId);
    showToast(`تم تغيير حالة ${tbl?.number || 'الطاولة'} إلى: ${getStatusBadge(status).label}`, 'success');
  };

  const handleOpenPOSForTable = (table: RestaurantTable) => {
    setSelectedTable(table);
    setOrderType('dine_in');
    showToast(`تم اختيار ${table.number} للطلب في نقطة البيع`, 'info');
    if (onNavigateToPOS) onNavigateToPOS();
  };

  const openAddModal = () => {
    setEditingTable(null);
    setNewNumber('');
    setNewCapacity(4);
    setNewSection(sections[0] || 'الصالة الداخلية');
    setTableStatus('available');
    setIsModalOpen(true);
  };

  const openEditModal = (table: RestaurantTable) => {
    setEditingTable(table);
    setNewNumber(table.number);
    setNewCapacity(table.capacity);
    setNewSection(table.section);
    setTableStatus(table.status);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingTable) return;
    const num = deletingTable.number;
    posDb.deleteTable(deletingTable.id);
    setDeletingTable(null);
    showToast(`تم حذف ${num} نهائياً من الصالة`, 'success');
  };

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) {
      showToast('يرجى تحديد رقم أو اسم الطاولة', 'warning');
      return;
    }

    const isEdit = !!editingTable;

    if (editingTable) {
      posDb.saveTable({
        ...editingTable,
        number: newNumber.trim(),
        capacity: newCapacity,
        section: newSection.trim() || 'الصالة الداخلية',
        status: tableStatus,
      });
    } else {
      posDb.saveTable({
        id: `tbl-${Date.now()}`,
        number: newNumber.trim(),
        branchId: 'branch-1',
        capacity: newCapacity,
        section: newSection.trim() || 'الصالة الداخلية',
        status: tableStatus,
      });
    }

    setNewNumber('');
    setEditingTable(null);
    setIsModalOpen(false);
    showToast(isEdit ? `تم تعديل بيانات ${newNumber} بنجاح` : `تمت إضافة ${newNumber} إلى الصالة بنجاح`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-[#8B1E1E]" />
            <div>
              <h2 className="text-base font-extrabold text-[#231610]">
                إدارة طاولات الصالة ومخطط الجلوس
              </h2>
              <span className="text-xs text-[#7A6455]">
                متابعة إشغال الصالة، الحجوزات، وفتح طلبات مباشرة للطاولة ({tables.length} طاولة)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B1E1E] text-white text-xs font-bold hover:bg-[#721616] transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة طاولة جديدة</span>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl border border-[#E8DFD5] text-xs overflow-x-auto">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeSection === 'all'
                ? 'bg-[#8B1E1E] text-white shadow-xs'
                : 'text-[#3E2723] hover:bg-[#EAE0D2]'
            }`}
          >
            جميع المناطق ({tables.length})
          </button>
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeSection === sec
                  ? 'bg-[#8B1E1E] text-white shadow-xs'
                  : 'text-[#3E2723] hover:bg-[#EAE0D2]'
              }`}
            >
              {sec} ({tables.filter((t) => t.section === sec).length})
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTables.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-[#D7C3A5] text-center space-y-3 max-w-md mx-auto my-12">
            <Grid className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-[#231610]">لا توجد طاولات مضافة في هذا القسم</h3>
            <p className="text-xs text-[#7A6455]">قم بإضافة طاولات الصالة الداخلية والحديقة لتمكين طلبات الصالة.</p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-[#8B1E1E] text-white rounded-xl text-xs font-bold hover:bg-[#721616]"
            >
              إضافة طاولة الآن
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTables.map((tbl) => {
              const badge = getStatusBadge(tbl.status);

              return (
                <div
                  key={tbl.id}
                  className="bg-white rounded-2xl border border-[#E8DFD5] p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#B8860B] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-lg text-[#231610]">{tbl.number}</h3>
                      <span className="text-xs text-[#7A6455]">{tbl.section}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 bg-gray-100 text-[#3E2723] px-2 py-1 rounded-lg text-xs font-bold">
                        <Users className="w-3.5 h-3.5" />
                        <span>{tbl.capacity} مقاعد</span>
                      </div>
                      <button
                        onClick={() => openEditModal(tbl)}
                        className="p-1.5 text-amber-800 hover:bg-amber-50 rounded-lg transition-colors active:scale-95"
                        title="تعديل الطاولة"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingTable(tbl)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                        title="حذف الطاولة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}
                    >
                      {badge.label}
                    </span>

                    {/* Status Dropdown */}
                    <select
                      value={tbl.status}
                      onChange={(e) => handleStatusChange(tbl.id, e.target.value as TableStatus)}
                      className="text-xs font-semibold bg-gray-50 border border-[#D7C3A5] rounded-lg px-2 py-1 focus:outline-hidden"
                    >
                      <option value="available">متاحة</option>
                      <option value="occupied">مشغولة</option>
                      <option value="reserved">محجوزة</option>
                      <option value="cleaning">تنظيف</option>
                    </select>
                  </div>

                  {/* Bottom Action: Open POS */}
                  <button
                    onClick={() => handleOpenPOSForTable(tbl)}
                    className="w-full py-2 bg-[#FFF8EF] hover:bg-[#8B1E1E] text-[#8B1E1E] hover:text-white border border-[#D7C3A5] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>فتح طلب كاشير لهذه الطاولة</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Table Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-[#E8DFD5] animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-2">
              <h3 className="font-extrabold text-sm text-[#231610]">
                {editingTable ? `تعديل بيانات: ${editingTable.number}` : 'إضافة طاولة جديدة'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  رقم أو اسم الطاولة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: طاولة 15"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] focus:outline-hidden focus:ring-2 focus:ring-[#8B1E1E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  عدد المقاعد *
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value) || 4)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  المنطقة أو الصالة
                </label>
                <input
                  type="text"
                  required
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  placeholder="مثال: الصالة العائلية، التراس، الركن الخارجي"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231610] mb-1">
                  حالة الطاولة
                </label>
                <select
                  value={tableStatus}
                  onChange={(e) => setTableStatus(e.target.value as TableStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-white font-bold"
                >
                  <option value="available">متاحة للجلوس</option>
                  <option value="occupied">مشغولة حالياً</option>
                  <option value="reserved">محجوزة</option>
                  <option value="cleaning">تحت التنظيف</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-[#6F4E37] bg-[#F5EFE6] rounded-xl hover:bg-[#EAE0D2]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#8B1E1E] rounded-xl hover:bg-[#721616] shadow-xs active:scale-95"
                >
                  {editingTable ? 'حفظ التعديلات' : 'حفظ الطاولة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingTable}
        title="تأكيد حذف الطاولة"
        message="هل أنت متأكد من حذف هذه الطاولة نهائياً من مخطط الصالة؟"
        itemName={deletingTable ? `${deletingTable.number} (${deletingTable.section})` : undefined}
        confirmText="تأكيد الحذف"
        cancelText="تراجع"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTable(null)}
      />
    </div>
  );
};
