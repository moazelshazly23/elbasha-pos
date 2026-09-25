import React, { useState, useEffect } from 'react';
import { Database, Search, ShieldAlert, Clock, User, Filter } from 'lucide-react';
import { AuditLog } from '../../types';
import { posDb } from '../../services/db';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(() => posDb.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setLogs(posDb.getAuditLogs());
    });
    return unsubscribe;
  }, []);

  const filtered = logs.filter((log) => {
    if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      if (!matchAction && !matchUser && !matchDetails) return false;
    }
    return true;
  });

  const getCategoryBadge = (cat: AuditLog['category']) => {
    switch (cat) {
      case 'order':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800">طلبات وفواتير</span>;
      case 'inventory':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800">مخزون وهالك</span>;
      case 'shift':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800">ورديات وخزينة</span>;
      case 'auth':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">دخول وصلاحيات</span>;
      case 'system':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">نظام وهوية</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#F8F5F0]">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8DFD5] space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#8B1E1E]" />
          <div>
            <h2 className="text-base font-extrabold text-[#231610]">
              سجل الرقابة والعمليات (Audit Trail)
            </h2>
            <span className="text-xs text-[#7A6455]">
              سجل غير قابل للتعديل لجميع العمليات الحساسة، الخصومات، وحركات المخزون
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#7A6455]" />
            <input
              type="text"
              placeholder="ابحث في السجل بالحركة أو اسم المستخدم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-[#D7C3A5] bg-[#FBF9F6] focus:outline-none focus:ring-2 focus:ring-[#8B1E1E]"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold ${
                categoryFilter === 'all' ? 'bg-[#8B1E1E] text-white' : 'bg-gray-100 text-[#3E2723]'
              }`}
            >
              الكل ({logs.length})
            </button>
            <button
              onClick={() => setCategoryFilter('order')}
              className={`px-3 py-1.5 rounded-lg font-bold ${
                categoryFilter === 'order' ? 'bg-[#8B1E1E] text-white' : 'bg-gray-100 text-[#3E2723]'
              }`}
            >
              الطلبات
            </button>
            <button
              onClick={() => setCategoryFilter('inventory')}
              className={`px-3 py-1.5 rounded-lg font-bold ${
                categoryFilter === 'inventory' ? 'bg-[#8B1E1E] text-white' : 'bg-gray-100 text-[#3E2723]'
              }`}
            >
              المخزون
            </button>
            <button
              onClick={() => setCategoryFilter('shift')}
              className={`px-3 py-1.5 rounded-lg font-bold ${
                categoryFilter === 'shift' ? 'bg-[#8B1E1E] text-white' : 'bg-gray-100 text-[#3E2723]'
              }`}
            >
              الورديات
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-2xl border border-[#E8DFD5] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5EFE6] text-[#3E2723] font-bold border-b border-[#E8DFD5]">
                <tr>
                  <th className="p-3">الحركة</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">المستخدم المسؤول</th>
                  <th className="p-3">تفاصيل الحركة</th>
                  <th className="p-3">التوقيت الدقيق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE6]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-gray-500">
                      لا توجد سجلات رقابة مسجلة حتى الآن. يتم تسجيل وتوثيق العمليات الحساسة تلقائياً في قاعدة البيانات.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FFF8EF]">
                      <td className="p-3 font-extrabold text-[#231610]">{log.action}</td>
                      <td className="p-3">{getCategoryBadge(log.category)}</td>
                      <td className="p-3 font-semibold text-[#8B1E1E]">{log.userName}</td>
                      <td className="p-3 text-gray-700 max-w-md">{log.details}</td>
                      <td className="p-3 text-gray-500 font-mono text-[11px] tabular-nums">
                        {new Date(log.timestamp).toLocaleString('ar-EG')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
