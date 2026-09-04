import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pagination } from '../components/Pagination';
import {
  Bell,
  Plus,
  Search,
  Copy,
  Pencil,
  Trash2,
  Send,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
} from 'lucide-react';
import type {
  LarkWebhook,
  LarkActionInfo,
  LarkWebhookListResponse,
  LarkUpdater,
} from '../types';
import {
  fetchLarkWebhooks,
  fetchLarkActions,
  fetchLarkUpdaters,
  createLarkWebhook,
  updateLarkWebhook,
  deleteLarkWebhook,
  testLarkWebhook,
  type LarkWebhookInput,
  type LarkWebhookQuery,
} from '../services/api';
import { clsx } from 'clsx';
import {
  btnPrimaryCls,
  inputCls,
  thCls,
  tdCls,
  tableHeadRowCls,
  iconBtnCls,
} from '../styles/classNames';

const HOOK_PREFIX = 'https://open.larksuite.com/open-apis/bot/v2/hook/';

interface FormState {
  chatName: string;
  botName: string;
  webhookUrl: string;
  secret: string;
  isEnabled: boolean;
  actions: string[];
}
const EMPTY_FORM: FormState = {
  chatName: '',
  botName: '',
  webhookUrl: '',
  secret: '',
  isEnabled: true,
  actions: [],
};

const fmtTime = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'Vừa xong';
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  return d.toLocaleDateString('vi-VN');
};

const maskUrl = (url: string): string => {
  const tail = url.split('/').filter(Boolean).pop() || '';
  const short =
    tail.length > 12 ? `${tail.slice(0, 6)}…${tail.slice(-4)}` : tail;
  return `…/hook/${short}`;
};

const isHttps = (s: string) => {
  try {
    return new URL(s).protocol === 'https:';
  } catch {
    return false;
  }
};

const Badge: React.FC<{ on: boolean }> = ({ on }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-[6px] text-[11.5px] font-bold py-[3px] px-[9px] rounded-full',
      on
        ? 'bg-[#ecfdf5] text-[#15803d] border border-[#bbf7d0]'
        : 'bg-[#f8fafc] text-[#94a3b8] border border-[#e5e7eb]',
    )}
  >
    <span
      className={clsx(
        'w-[6px] h-[6px] rounded-full',
        on ? 'bg-[#16a34a] border-0' : 'bg-transparent border border-[#cbd5e1]',
      )}
      // động — giữ inline
      style={on ? { animation: 'livePulse 1.4s ease-in-out infinite' } : undefined}
    />
    {on ? 'Đang bật' : 'Đã tắt'}
  </span>
);

export const NotificationConfigPage: React.FC = () => {
  const [list, setList] = useState<LarkWebhook[]>([]);
  const [meta, setMeta] = useState<LarkWebhookListResponse['meta']>({
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1,
  });
  const [stats, setStats] = useState<LarkWebhookListResponse['stats']>({
    total: 0,
    enabled: 0,
    actionsCovered: 0,
  });
  const [updaterOpts, setUpdaterOpts] = useState<LarkUpdater[]>([]);
  const [catalog, setCatalog] = useState<LarkActionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on' | 'off'>('all');
  const [updaterFilter, setUpdaterFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>(
    'all',
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(
    null,
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LarkWebhook | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [secretTouched, setSecretTouched] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [actionQuery, setActionQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<{ chatName?: string; url?: string }>(
    {},
  );

  const [deleteTarget, setDeleteTarget] = useState<LarkWebhook | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const query = useMemo<LarkWebhookQuery>(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      updatedById: updaterFilter === 'all' ? undefined : updaterFilter,
      updatedWithin: timeFilter === 'all' ? undefined : timeFilter,
      page,
      limit: pageSize,
    }),
    [search, statusFilter, updaterFilter, timeFilter, page, pageSize],
  );

  const loadList = useCallback(() => {
    setLoading(true);
    fetchLarkWebhooks(query)
      .then((res) => {
        setList(res.data);
        setMeta(res.meta);
        setStats(res.stats);
        setError(null);
      })
      .catch((e) => setError(e.message || 'Không thể tải danh sách webhook'))
      .finally(() => setLoading(false));
  }, [query]);

  const loadAux = useCallback(() => {
    Promise.all([fetchLarkActions(), fetchLarkUpdaters()])
      .then(([cat, ups]) => {
        setCatalog(cat);
        setUpdaterOpts(ups);
      })
      .catch(() => {});
  }, []);

  // Refetch khi query đổi — debounce 300ms để gõ tìm kiếm không bắn liên tục.
  useEffect(() => {
    const t = setTimeout(loadList, 300);
    return () => clearTimeout(t);
  }, [loadList]);

  useEffect(() => {
    loadAux();
  }, [loadAux]);

  // Đổi bộ lọc -> về trang 1.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, updaterFilter, timeFilter, pageSize]);

  const showToast = (msg: string, err?: boolean) => {
    setToast({ msg, err });
    setTimeout(() => setToast((t) => (t?.msg === msg ? null : t)), 2800);
  };

  const refresh = () => {
    loadList();
    loadAux();
  };

  const labelOf = useMemo(() => {
    const m = new Map(catalog.map((c) => [c.action, c.label]));
    return (a: string) => m.get(a) || a;
  }, [catalog]);

  const filterActive =
    search !== '' ||
    statusFilter !== 'all' ||
    updaterFilter !== 'all' ||
    timeFilter !== 'all';

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSecretTouched(false);
    setShowSecret(false);
    setActionQuery('');
    setFormErr({});
    setFormOpen(true);
  };
  const openEdit = (w: LarkWebhook) => {
    setEditing(w);
    setForm({
      chatName: w.chatName,
      botName: w.botName || '',
      webhookUrl: w.webhookUrl,
      secret: '',
      isEnabled: w.isEnabled,
      actions: [...w.actions],
    });
    setSecretTouched(false);
    setShowSecret(false);
    setActionQuery('');
    setFormErr({});
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);

  const toggleAction = (a: string) =>
    setForm((f) => ({
      ...f,
      actions: f.actions.includes(a)
        ? f.actions.filter((x) => x !== a)
        : [...f.actions, a],
    }));

  const urlWarn =
    form.webhookUrl.trim() !== '' &&
    !form.webhookUrl.trim().startsWith(HOOK_PREFIX);

  const save = async () => {
    const chatName = form.chatName.trim();
    const url = form.webhookUrl.trim();
    const errs: { chatName?: string; url?: string } = {};
    if (!chatName) errs.chatName = 'Vui lòng nhập tên nhóm Lark.';
    if (!url || !isHttps(url))
      errs.url = 'Đường dẫn không hợp lệ. URL phải bắt đầu bằng https://';
    setFormErr(errs);
    if (errs.chatName || errs.url) return;

    const body: LarkWebhookInput = {
      chatName,
      botName: form.botName.trim(),
      webhookUrl: url,
      isEnabled: form.isEnabled,
      actions: form.actions,
    };
    if (secretTouched) body.webhookSecret = form.secret;

    setSaving(true);
    setError(null);
    try {
      if (editing) await updateLarkWebhook(editing.id, body);
      else await createLarkWebhook(body);
      refresh();
      showToast(editing ? 'Đã cập nhật webhook' : 'Đã thêm webhook mới');
      closeForm();
    } catch (e: any) {
      setError(e.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const testRow = async (w: LarkWebhook) => {
    setBusyRow(w.id);
    try {
      const r = await testLarkWebhook(w.id);
      showToast(r.message, !r.ok);
    } catch (e: any) {
      showToast(e.message || 'Không gửi được tin thử', true);
    } finally {
      setBusyRow(null);
    }
  };

  const copyUrl = (w: LarkWebhook) => {
    navigator.clipboard?.writeText(w.webhookUrl).then(
      () => showToast('Đã sao chép webhook URL'),
      () => showToast('Không sao chép được', true),
    );
  };

  const toggleEnabled = async (w: LarkWebhook) => {
    setBusyRow(w.id);
    try {
      await updateLarkWebhook(w.id, { isEnabled: !w.isEnabled });
      refresh();
      showToast(w.isEnabled ? 'Đã tắt webhook' : 'Đã bật webhook');
    } catch (e: any) {
      showToast(e.message || 'Không đổi được trạng thái', true);
    } finally {
      setBusyRow(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLarkWebhook(deleteTarget.id);
      refresh();
      showToast('Đã xóa webhook');
      setDeleteTarget(null);
    } catch (e: any) {
      showToast(e.message || 'Xóa thất bại', true);
    } finally {
      setDeleting(false);
    }
  };

  const statCards = [
    { num: String(stats.total), label: 'Tổng số webhook' },
    { num: String(stats.enabled), label: 'Đang bật' },
    {
      num: `${stats.actionsCovered} / ${catalog.length}`,
      label: 'Hành động có nhận thông báo',
    },
  ];

  return (
    <div className="flex flex-col">
      <style>{`
        @keyframes ncp-spin { to { transform: rotate(360deg); } }
        .ncp-spin { animation: ncp-spin .8s linear infinite; }
        .ncp-ib { color: #94a3b8; transition: color .15s ease, background .15s ease; border-radius: 6px; }
        .ncp-ib:hover { color: #0f172a; background: #f1f5f9; }
        .ncp-ib.danger:hover { color: #dc2626; background: #fef2f2; }
        .ncp-row:hover { background: #fafafa; }
        .ncp-sub:hover { background: #fafafa; }
      `}</style>

      <div className="bg-surface border border-[#e5e7eb] rounded-[16px]">
        {/* header */}
        <div className="pt-[22px] px-[22px] pb-0">
          <div className="flex items-start justify-between gap-[16px] flex-wrap">
            <div>
              <h1 className="text-[24px] font-black text-[#0f172a] mb-[4px] tracking-[-0.3px] flex items-center gap-[10px]">
                <Bell size={22} /> Cấu hình thông báo Lark
              </h1>
              <p className="m-0 text-[12.5px] text-[#64748b] max-w-[620px] leading-[1.5]">
                Mỗi dòng là một nhóm Lark. Khi thêm hoặc sửa, chọn luôn nhóm đó
                nhận thông báo cho những hành động nào.
              </p>
            </div>
            <button type="button" className={btnPrimaryCls} onClick={openAdd}>
              <Plus size={14} /> Thêm webhook
            </button>
          </div>
        </div>

        <div className="pt-[18px] px-[22px] pb-[22px] flex flex-col gap-[16px]">
          {error && (
            <div className="flex gap-[6px] items-start text-[#b91c1c] text-[12px] bg-[#fef2f2] border border-[#fca5a5] py-[9px] px-[11px] rounded-[8px]">
              <AlertTriangle
                size={14}
                className="shrink-0 mt-[1px]"
              />
              <span>{error}</span>
            </div>
          )}

          {/* summary */}
          <div className="grid grid-cols-3 gap-[10px]">
            {statCards.map((c, i) => (
              <div
                key={i}
                className="border border-[#e5e7eb] rounded-[10px] py-[12px] px-[14px]"
              >
                <div className="text-[18px] font-extrabold text-[#0f172a] tabular-nums">
                  {c.num}
                </div>
                <div className="text-[11.5px] text-[#64748b] mt-[2px]">
                  {c.label}
                </div>
              </div>
            ))}
          </div>

          {/* list */}
          <div>
            <h3 className="text-[13.5px] font-extrabold text-[#0f172a] mb-[10px]">
              Danh sách webhook
            </h3>

            <div className="flex items-center gap-[8px] mb-[10px] flex-wrap">
              <div className="relative w-[220px] max-w-full">
                <Search
                  size={14}
                  className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#94a3b8]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên nhóm / bot…"
                  className={clsx(inputCls, 'pl-[30px] font-medium')}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'on' | 'off')
                }
                className={clsx(inputCls, '!w-auto cursor-pointer')}
              >
                <option value="all">Mọi trạng thái</option>
                <option value="on">Đang bật</option>
                <option value="off">Đã tắt</option>
              </select>

              <select
                value={updaterFilter}
                onChange={(e) => setUpdaterFilter(e.target.value)}
                className={clsx(inputCls, '!w-auto cursor-pointer')}
              >
                <option value="all">Mọi người cập nhật</option>
                {updaterOpts.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              <select
                value={timeFilter}
                onChange={(e) =>
                  setTimeFilter(
                    e.target.value as 'all' | '24h' | '7d' | '30d',
                  )
                }
                className={clsx(inputCls, '!w-auto cursor-pointer')}
              >
                <option value="all">Mọi thời gian</option>
                <option value="24h">Cập nhật trong 24 giờ</option>
                <option value="7d">Cập nhật trong 7 ngày</option>
                <option value="30d">Cập nhật trong 30 ngày</option>
              </select>

              {filterActive && (
                <button
                  type="button"
                  className="tool-btn"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setUpdaterFilter('all');
                    setTimeFilter('all');
                  }}
                >
                  <X size={13} /> Xóa lọc
                </button>
              )}
            </div>

            <div className="border border-[#e5e7eb] rounded-[12px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className={tableHeadRowCls}>
                      <th className={clsx(thCls, 'py-[10px] px-[16px]')}>
                        Nhóm Lark
                      </th>
                      <th className={clsx(thCls, 'py-[10px] px-[16px]')}>
                        Webhook URL
                      </th>
                      <th className={clsx(thCls, 'py-[10px] px-[16px]')}>
                        Nhận thông báo cho
                      </th>
                      <th className={clsx(thCls, 'py-[10px] px-[16px]')}>
                        Trạng thái
                      </th>
                      <th className={clsx(thCls, 'py-[10px] px-[16px]')}>
                        Cập nhật
                      </th>
                      <th className={clsx(thCls, 'py-[10px] px-[16px]')} />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-[38px] text-center text-[#64748b] text-[13px]"
                        >
                          <Loader2
                            size={16}
                            className="ncp-spin align-middle mr-[8px]"
                          />
                          Đang tải…
                        </td>
                      </tr>
                    ) : list.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-[48px] px-[20px] text-center text-[#64748b]"
                        >
                          <Bell
                            size={30}
                            className="text-[#94a3b8] mb-[8px]"
                          />
                          <div className="text-[#0f172a] font-bold text-[13.5px]">
                            {stats.total === 0
                              ? 'Chưa có webhook nào'
                              : 'Không tìm thấy webhook phù hợp'}
                          </div>
                          {stats.total === 0 && (
                            <div className="text-[12.5px] mt-[2px]">
                              Thêm webhook đầu tiên để bắt đầu nhận thông báo
                              trên Lark.
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      list.map((w) => (
                        <tr
                          key={w.id}
                          className="ncp-row border-b border-[#f1f5f9]"
                        >
                          <td className={clsx(tdCls, 'py-[12px] px-[16px] align-top')}>
                            <div className="font-bold text-[#0f172a] text-[13px]">
                              {w.chatName || '(chưa đặt tên)'}
                            </div>
                            <div className="text-[11px] text-[#94a3b8] mt-[1px]">
                              {w.botName
                                ? `Bot: ${w.botName}`
                                : 'Chưa đặt tên bot'}
                            </div>
                          </td>
                          <td className={clsx(tdCls, 'py-[12px] px-[16px] align-top')}>
                            <div className="flex items-center gap-[6px]">
                              <code
                                title={w.webhookUrl}
                                className="text-[11.5px] text-[#64748b] bg-[#f1f5f9] py-[3px] px-[7px] rounded-[6px] font-mono"
                              >
                                {maskUrl(w.webhookUrl)}
                              </code>
                              <button
                                type="button"
                                className={clsx('ncp-ib', iconBtnCls)}
                                title="Sao chép URL"
                                onClick={() => copyUrl(w)}
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                            <div className="text-[11px] text-[#94a3b8] mt-[4px]">
                              {w.hasSecret
                                ? 'Có signing secret'
                                : 'Không đặt secret'}
                            </div>
                          </td>
                          <td className={clsx(tdCls, 'py-[12px] px-[16px] align-top')}>
                            {w.actions.length === 0 ? (
                              <span className="text-[12px] text-[#94a3b8] italic">
                                Chưa chọn hành động nào
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-[5px] max-w-[320px]">
                                {w.actions.map((a) => (
                                  <span
                                    key={a}
                                    className="text-[11px] font-semibold text-[#475569] bg-[#f1f5f9] border border-[#e5e7eb] rounded-full py-[2px] px-[8px] inline-flex items-center"
                                  >
                                    {labelOf(a)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className={clsx(tdCls, 'py-[12px] px-[16px] align-top')}>
                            <button
                              type="button"
                              onClick={() => toggleEnabled(w)}
                              disabled={busyRow === w.id}
                              title={
                                w.isEnabled
                                  ? 'Bấm để tắt webhook'
                                  : 'Bấm để bật webhook'
                              }
                              className={clsx(
                                'bg-transparent border-0 p-0 cursor-pointer',
                                busyRow === w.id ? 'opacity-50' : 'opacity-100',
                              )}
                            >
                              <Badge on={w.isEnabled} />
                            </button>
                          </td>
                          <td className={clsx(tdCls, 'py-[12px] px-[16px] text-[12px] text-[#64748b] align-top')}>
                            <div className="text-[#0f172a] font-medium">
                              {w.updatedByName || '—'}
                            </div>
                            <div>{fmtTime(w.updatedAt)}</div>
                          </td>
                          <td className={clsx(tdCls, 'py-[12px] px-[16px] align-top')}>
                            <div className="flex gap-[2px] justify-end">
                              <button
                                type="button"
                                className={clsx('ncp-ib', iconBtnCls)}
                                title="Gửi thử"
                                disabled={busyRow === w.id}
                                onClick={() => testRow(w)}
                              >
                                {busyRow === w.id ? (
                                  <Loader2 size={13} className="ncp-spin" />
                                ) : (
                                  <Send size={13} />
                                )}
                              </button>
                              <button
                                type="button"
                                className={clsx('ncp-ib', iconBtnCls)}
                                title="Chỉnh sửa"
                                onClick={() => openEdit(w)}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                className={clsx('ncp-ib danger', iconBtnCls)}
                                title="Xóa"
                                onClick={() => setDeleteTarget(w)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                totalItems={meta.total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---- add / edit modal ---- */}
      {formOpen &&
        createPortal(
          <div className="modal-backdrop show" onClick={closeForm}>
            <div
              className="modal-card max-w-[560px] w-[560px] h-[min(680px,92vh)] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header shrink-0">
                <h2 className="text-[16px] font-extrabold text-[#0f172a] m-0">
                  {editing ? 'Chỉnh sửa webhook' : 'Thêm webhook'}
                </h2>
                <button
                  type="button"
                  onClick={closeForm}
                  className="bg-transparent border-0 text-[#64748b] cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body gap-[13px] py-[18px] px-[20px] flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-2 gap-[12px]">
                  <div className="form-group">
                    <label className="form-label">Tên nhóm Lark</label>
                    <input
                      className={clsx('form-control', formErr.chatName && '!border-[#ef4444]')}
                      value={form.chatName}
                      maxLength={120}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, chatName: e.target.value }))
                      }
                      placeholder="Nhóm Báo Giá VCB"
                    />
                    {formErr.chatName && (
                      <span className="text-[11.5px] text-[#ef4444]">
                        {formErr.chatName}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Tên bot{' '}
                      <span className="font-normal text-[#94a3b8]">
                        (tùy chọn)
                      </span>
                    </label>
                    <input
                      className="form-control"
                      value={form.botName}
                      maxLength={120}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, botName: e.target.value }))
                      }
                      placeholder="Nhận diện Custom Bot"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label flex items-baseline gap-[8px]">
                    Webhook URL
                    {urlWarn && !formErr.url && (
                      <span className="font-normal text-[11px] text-[#94a3b8]">
                        không giống link webhook Lark
                      </span>
                    )}
                  </label>
                  <input
                    className={clsx(
                      'form-control font-mono text-[12px]',
                      formErr.url && '!border-[#ef4444]',
                      !formErr.url && urlWarn && '!border-[#f59e0b]',
                    )}
                    value={form.webhookUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, webhookUrl: e.target.value }))
                    }
                    placeholder={`${HOOK_PREFIX}…`}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  {formErr.url && (
                    <span className="text-[11.5px] text-[#ef4444]">
                      {formErr.url}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Signing secret</label>
                  <span className="text-[11.5px] text-[#64748b] leading-[1.45] block mb-[4px]">
                  </span>
                  <div className="relative">
                    <input
                      className="form-control font-mono pr-[36px]"
                      type={showSecret ? 'text' : 'password'}
                      value={form.secret}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, secret: e.target.value }));
                        setSecretTouched(true);
                      }}
                      placeholder={
                        editing?.hasSecret
                          ? 'Đã đặt — để trống nếu giữ nguyên'
                          : 'Dán secret nếu bot bật ký xác thực'
                      }
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className={clsx(iconBtnCls, 'absolute right-[6px] top-1/2 -translate-y-1/2 text-[#94a3b8]')}
                    >
                      {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {editing?.hasSecret &&
                    secretTouched &&
                    form.secret === '' && (
                      <span className="text-[11.5px] text-[#b45309]">
                        Để trống sẽ xóa secret đang lưu.
                      </span>
                    )}
                </div>

                {/* hành động — ô tìm kiếm kiểu combobox, gõ tên để lọc rồi chọn */}
                <div className="form-group">
                  <label className="form-label m-0">
                    Nhận thông báo cho hành động
                    <span className="font-normal text-[#94a3b8] ml-[6px]">
                      đã chọn {form.actions.length}/{catalog.length}
                    </span>
                  </label>

                  {form.actions.length > 0 && (
                    <div className="flex flex-wrap gap-[5px] mt-[2px]">
                      {form.actions.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-[5px] text-[11px] font-medium text-[#0f172a] bg-[#f1f5f9] border border-[#e5e7eb] rounded-full pt-[2px] pr-[4px] pb-[2px] pl-[9px]"
                        >
                          {labelOf(a)}
                          <button
                            type="button"
                            onClick={() => toggleAction(a)}
                            className={clsx('ncp-ib', iconBtnCls, 'p-[1px] text-[#64748b]')}
                            aria-label="Bỏ chọn"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative mt-[2px]">
                    <Search
                      size={14}
                      className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[#94a3b8]"
                    />
                    <input
                      className="form-control pl-[32px]"
                      placeholder="Gõ tên hành động để lọc…"
                      value={actionQuery}
                      onChange={(e) => setActionQuery(e.target.value)}
                    />
                  </div>

                  {(() => {
                    const q = actionQuery.trim().toLowerCase();
                    const hits = catalog.filter((c) =>
                      c.label.toLowerCase().includes(q),
                    );
                    return (
                      <div className="border border-[#e5e7eb] rounded-[10px] mt-[4px] max-h-[166px] overflow-y-auto">
                          {hits.length === 0 ? (
                            <div className="p-[12px] text-[12px] text-[#94a3b8]">
                              Không có hành động khớp
                              {actionQuery ? ` "${actionQuery}"` : ''}.
                            </div>
                          ) : (
                            hits.map((c) => {
                              const on = form.actions.includes(c.action);
                              return (
                                <button
                                  type="button"
                                  key={c.action}
                                  className="ncp-sub flex items-center gap-[9px] w-full py-[7px] px-[12px] bg-transparent border-0 border-b border-[#f1f5f9] cursor-pointer text-left"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => toggleAction(c.action)}
                                >
                                  <span
                                    className={clsx(
                                      'w-[15px] h-[15px] rounded-[4px] flex items-center justify-center shrink-0 border-[1.5px]',
                                      on ? 'bg-[#0f172a] border-[#0f172a]' : 'bg-surface border-[#cbd5e1]',
                                    )}
                                  >
                                    {on && <Check size={11} color="#fff" />}
                                  </span>
                                  <span className="text-[12.5px] font-medium text-[#0f172a]">
                                    {c.label}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      );
                    })()}
                </div>
              </div>

              <div className="modal-footer shrink-0">
                <button
                  type="button"
                  className="btn-insp w-auto bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1]"
                  onClick={closeForm}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={clsx(
                    'btn-insp btn-insp-primary w-auto bg-[#0f172a]',
                    saving ? 'opacity-60' : 'opacity-100',
                  )}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={13} className="ncp-spin" /> : null}{' '}
                  Lưu webhook
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ---- delete confirm ---- */}
      {deleteTarget &&
        createPortal(
          <div
            className="modal-backdrop show"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              className="modal-card max-w-[380px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="text-[15px] font-extrabold text-[#0f172a] m-0">
                  Xóa webhook này?
                </h2>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="bg-transparent border-0 text-[#64748b] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p className="m-0 text-[12.5px] text-[#64748b] leading-[1.55]">
                  Webhook của "{deleteTarget.chatName}" và mọi đăng ký hành động
                  của nhóm này sẽ bị xóa. Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-insp w-auto bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1]"
                  onClick={() => setDeleteTarget(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={clsx(
                    'btn-insp btn-insp-danger w-auto',
                    deleting ? 'opacity-60' : 'opacity-100',
                  )}
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 size={13} className="ncp-spin" /> : null}{' '}
                  Xóa
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ---- toast ---- */}
      {toast &&
        createPortal(
          <div
            className={clsx(
              'fixed bottom-[24px] left-1/2 -translate-x-1/2 text-surface py-[11px] px-[18px] rounded-[10px] text-[12.5px] font-semibold flex items-center gap-[9px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] z-[1100] max-w-[90vw]',
              toast.err ? 'bg-[#dc2626]' : 'bg-[#0f172a]',
            )}
          >
            {toast.err ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
            {toast.msg}
          </div>,
          document.body,
        )}
    </div>
  );
};
