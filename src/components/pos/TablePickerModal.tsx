import React from 'react';
import { X, Grid, Users } from 'lucide-react';
import { RestaurantTable } from '../../types';
import { posDb } from '../../services/db';

interface TablePickerModalProps {
  isOpen: boolean;
  selectedTable: RestaurantTable | null;
  onSelect: (table: RestaurantTable) => void;
  onClose: () => void;
}

export const TablePickerModal: React.FC<TablePickerModalProps> = ({
  isOpen,
  selectedTable,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  const tables = posDb.getTables();
  const sections = Array.from(new Set(tables.map((t) => t.section)));

  const getStatusBadge = (status: RestaurantTable['status']) => {
    switch (status) {
      case 'available':
        return { label: 'متاحة', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'occupied':
        return { label: 'مشغولة', bg: 'bg-red-100 text-red-800 border-red-300' };
      case 'reserved':
        return { label: 'محجوزة', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'cleaning':
        return { label: 'تنظيف', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#E8DFD5]">
        {/* Header */}
        <div className="p-4 bg-[#F5EFE6] border-b border-[#E8DFD5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-[#8B1E1E]" />
            <h3 className="font-bold text-sm text-[#231610]">
              اختر طاولة الصالة للطلب
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#6F4E37] hover:bg-[#EAE0D2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {sections.map((section) => {
            const secTables = tables.filter((t) => t.section === section);
            return (
              <div key={section} className="space-y-2">
                <h4 className="text-xs font-bold text-[#8B1E1E] border-b border-[#E8DFD5] pb-1">
                  {section} ({secTables.length} طاولة)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {secTables.map((tbl) => {
                    const badge = getStatusBadge(tbl.status);
                    const isCurrent = selectedTable?.id === tbl.id;

                    return (
                      <button
                        key={tbl.id}
                        type="button"
                        onClick={() => {
                          onSelect(tbl);
                          onClose();
                        }}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between h-24 ${
                          isCurrent
                            ? 'ring-2 ring-[#8B1E1E] bg-[#FFF8EF] border-[#8B1E1E] shadow-sm'
                            : 'bg-[#FBF9F6] border-[#E8DFD5] hover:border-[#B8860B] hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-[#231610]">
                            {tbl.number}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-[#7A6455]">
                          <Users className="w-3.5 h-3.5" />
                          <span>{tbl.capacity} أفراد</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#E8DFD5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#6F4E37] hover:bg-[#F5EFE6] rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
