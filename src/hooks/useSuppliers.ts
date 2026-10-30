import { useCallback, useEffect, useState } from 'react';
import { fetchSuppliers } from '../services/api';
import type { Supplier } from '../types';

// Danh sách NCC còn dùng (BE đã lọc xóa mềm). Chỉ ORDER/ADMIN gọi được — Sale phải truyền enabled=false
// để không bắn request bị 403.
export function useSuppliers(enabled = true) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Supplier[] = await fetchSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { suppliers, loading, error, reload };
}
