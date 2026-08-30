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
import {
  btnPrimaryStyle,
  inputStyle,
  thStyle,
  tdStyle,
  tableHeadRowStyle,
  iconBtnStyle,
} from '../styles/card';

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
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11.5px',
      fontWeight: 700,
      padding: '3px 9px',
      borderRadius: '999px',
      background: on ? '#ecfdf5' : '#f8fafc',
      color: on ? '#15803d' : '#94a3b8',
      border: `1px solid ${on ? '#bbf7d0' : '#e5e7eb'}`,
    }}
  >
    <span
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: on ? '#16a34a' : 'transparent',
        border: on ? 'none' : '1px solid #cbd5e1',
        animation: on ? 'livePulse 1.4s ease-in-out infinite' : undefined,
      }}
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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes ncp-spin { to { transform: rotate(360deg); } }
        .ncp-spin { animation: ncp-spin .8s linear infinite; }
        .ncp-ib { color: #94a3b8; transition: color .15s ease, background .15s ease; border-radius: 6px; }
        .ncp-ib:hover { color: #0f172a; background: #f1f5f9; }
        .ncp-ib.danger:hover { color: #dc2626; background: #fef2f2; }
        .ncp-row:hover { background: #fafafa; }
        .ncp-sub:hover { background: #fafafa; }
      `}</style>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
        }}
      >
        {/* header */}
        <div style={{ padding: '22px 22px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  color: '#0f172a',
                  margin: '0 0 4px',
                  letterSpacing: '-0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Bell size={22} /> Cấu hình thông báo Lark
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: '12.5px',
                  color: '#64748b',
                  maxWidth: '620px',
                  lineHeight: 1.5,
                }}
              >
                Mỗi dòng là một nhóm Lark. Khi thêm hoặc sửa, chọn luôn nhóm đó
                nhận thông báo cho những hành động nào.
              </p>
            </div>
            <button type="button" style={btnPrimaryStyle} onClick={openAdd}>
              <Plus size={14} /> Thêm webhook
            </button>
          </div>
        </div>

        <div
          style={{
            padding: '18px 22px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'flex-start',
                color: '#b91c1c',
                fontSize: '12px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                padding: '9px 11px',
                borderRadius: '8px',
              }}
            >
              <AlertTriangle
                size={14}
                style={{ flexShrink: 0, marginTop: '1px' }}
              />
              <span>{error}</span>
            </div>
          )}

          {/* summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {statCards.map((c, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#0f172a',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {c.num}
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: '#64748b',
                    marginTop: '2px',
                  }}
                >
                  {c.label}
                </div>
              </div>
            ))}
          </div>

          {/* list */}
          <div>
            <h3
              style={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 10px',
              }}
            >
              Danh sách webhook
            </h3>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '220px',
                  maxWidth: '100%',
                }}
              >
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên nhóm / bot…"
                  style={{
                    ...inputStyle,
                    paddingLeft: '30px',
                    fontWeight: 500,
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'on' | 'off')
                }
                style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
              >
                <option value="all">Mọi trạng thái</option>
                <option value="on">Đang bật</option>
                <option value="off">Đã tắt</option>
              </select>

              <select
                value={updaterFilter}
                onChange={(e) => setUpdaterFilter(e.target.value)}
                style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
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
                style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
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

            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={tableHeadRowStyle}>
                      <th style={{ ...thStyle, padding: '10px 16px' }}>
                        Nhóm Lark
                      </th>
                      <th style={{ ...thStyle, padding: '10px 16px' }}>
                        Webhook URL
                      </th>
                      <th style={{ ...thStyle, padding: '10px 16px' }}>
                        Nhận thông báo cho
                      </th>
                      <th style={{ ...thStyle, padding: '10px 16px' }}>
                        Trạng thái
                      </th>
                      <th style={{ ...thStyle, padding: '10px 16px' }}>
                        Cập nhật
                      </th>
                      <th style={{ ...thStyle, padding: '10px 16px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            padding: '38px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '13px',
                          }}
                        >
                          <Loader2
                            size={16}
                            className="ncp-spin"
                            style={{
                              verticalAlign: 'middle',
                              marginRight: '8px',
                            }}
                          />
                          Đang tải…
                        </td>
                      </tr>
                    ) : list.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            padding: '48px 20px',
                            textAlign: 'center',
                            color: '#64748b',
                          }}
                        >
                          <Bell
                            size={30}
                            style={{ color: '#94a3b8', marginBottom: '8px' }}
                          />
                          <div
                            style={{
                              color: '#0f172a',
                              fontWeight: 700,
                              fontSize: '13.5px',
                            }}
                          >
                            {stats.total === 0
                              ? 'Chưa có webhook nào'
                              : 'Không tìm thấy webhook phù hợp'}
                          </div>
                          {stats.total === 0 && (
                            <div
                              style={{ fontSize: '12.5px', marginTop: '2px' }}
                            >
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
                          className="ncp-row"
                          style={{ borderBottom: '1px solid #f1f5f9' }}
                        >
                          <td
                            style={{
                              ...tdStyle,
                              padding: '12px 16px',
                              verticalAlign: 'top',
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                color: '#0f172a',
                                fontSize: '13px',
                              }}
                            >
                              {w.chatName || '(chưa đặt tên)'}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                marginTop: '1px',
                              }}
                            >
                              {w.botName
                                ? `Bot: ${w.botName}`
                                : 'Chưa đặt tên bot'}
                            </div>
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              padding: '12px 16px',
                              verticalAlign: 'top',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <code
                                title={w.webhookUrl}
                                style={{
                                  fontSize: '11.5px',
                                  color: '#64748b',
                                  background: '#f1f5f9',
                                  padding: '3px 7px',
                                  borderRadius: '6px',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {maskUrl(w.webhookUrl)}
                              </code>
                              <button
                                type="button"
                                className="ncp-ib"
                                style={iconBtnStyle}
                                title="Sao chép URL"
                                onClick={() => copyUrl(w)}
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                marginTop: '4px',
                              }}
                            >
                              {w.hasSecret
                                ? 'Có signing secret'
                                : 'Không đặt secret'}
                            </div>
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              padding: '12px 16px',
                              verticalAlign: 'top',
                            }}
                          >
                            {w.actions.length === 0 ? (
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: '#94a3b8',
                                  fontStyle: 'italic',
                                }}
                              >
                                Chưa chọn hành động nào
                              </span>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '5px',
                                  maxWidth: '320px',
                                }}
                              >
                                {w.actions.map((a) => (
                                  <span
                                    key={a}
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#475569',
                                      background: '#f1f5f9',
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '999px',
                                      padding: '2px 8px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {labelOf(a)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              padding: '12px 16px',
                              verticalAlign: 'top',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => toggleEnabled(w)}
                              disabled={busyRow === w.id}
                              title={
                                w.isEnabled
                                  ? 'Bấm để tắt webhook'
                                  : 'Bấm để bật webhook'
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                opacity: busyRow === w.id ? 0.5 : 1,
                              }}
                            >
                              <Badge on={w.isEnabled} />
                            </button>
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              padding: '12px 16px',
                              fontSize: '12px',
                              color: '#64748b',
                              verticalAlign: 'top',
                            }}
                          >
                            <div style={{ color: '#0f172a', fontWeight: 500 }}>
                              {w.updatedByName || '—'}
                            </div>
                            <div>{fmtTime(w.updatedAt)}</div>
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              padding: '12px 16px',
                              verticalAlign: 'top',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                gap: '2px',
                                justifyContent: 'flex-end',
                              }}
                            >
                              <button
                                type="button"
                                className="ncp-ib"
                                style={iconBtnStyle}
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
                                className="ncp-ib"
                                style={iconBtnStyle}
                                title="Chỉnh sửa"
                                onClick={() => openEdit(w)}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                className="ncp-ib danger"
                                style={iconBtnStyle}
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
              className="modal-card"
              style={{
                maxWidth: '560px',
                width: '560px',
                height: 'min(680px, 92vh)',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header" style={{ flexShrink: 0 }}>
                <h2
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  {editing ? 'Chỉnh sửa webhook' : 'Thêm webhook'}
                </h2>
                <button
                  type="button"
                  onClick={closeForm}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className="modal-body"
                style={{
                  gap: '13px',
                  padding: '18px 20px',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Tên nhóm Lark</label>
                    <input
                      className="form-control"
                      style={
                        formErr.chatName
                          ? { borderColor: '#ef4444' }
                          : undefined
                      }
                      value={form.chatName}
                      maxLength={120}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, chatName: e.target.value }))
                      }
                      placeholder="Nhóm Báo Giá VCB"
                    />
                    {formErr.chatName && (
                      <span style={{ fontSize: '11.5px', color: '#ef4444' }}>
                        {formErr.chatName}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Tên bot{' '}
                      <span style={{ fontWeight: 400, color: '#94a3b8' }}>
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
                  <label
                    className="form-label"
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                    }}
                  >
                    Webhook URL
                    {urlWarn && !formErr.url && (
                      <span
                        style={{
                          fontWeight: 400,
                          fontSize: '11px',
                          color: '#94a3b8',
                        }}
                      >
                        không giống link webhook Lark
                      </span>
                    )}
                  </label>
                  <input
                    className="form-control"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      ...(formErr.url
                        ? { borderColor: '#ef4444' }
                        : urlWarn
                          ? { borderColor: '#f59e0b' }
                          : {}),
                    }}
                    value={form.webhookUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, webhookUrl: e.target.value }))
                    }
                    placeholder={`${HOOK_PREFIX}…`}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  {formErr.url && (
                    <span style={{ fontSize: '11.5px', color: '#ef4444' }}>
                      {formErr.url}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Signing secret</label>
                  <span
                    style={{
                      fontSize: '11.5px',
                      color: '#64748b',
                      lineHeight: 1.45,
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                  </span>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-control"
                      type={showSecret ? 'text' : 'password'}
                      style={{ fontFamily: 'monospace', paddingRight: '36px' }}
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
                      style={{
                        ...iconBtnStyle,
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                      }}
                    >
                      {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {editing?.hasSecret &&
                    secretTouched &&
                    form.secret === '' && (
                      <span style={{ fontSize: '11.5px', color: '#b45309' }}>
                        Để trống sẽ xóa secret đang lưu.
                      </span>
                    )}
                </div>

                {/* hành động — ô tìm kiếm kiểu combobox, gõ tên để lọc rồi chọn */}
                <div className="form-group">
                  <label className="form-label" style={{ margin: 0 }}>
                    Nhận thông báo cho hành động
                    <span
                      style={{
                        fontWeight: 400,
                        color: '#94a3b8',
                        marginLeft: '6px',
                      }}
                    >
                      đã chọn {form.actions.length}/{catalog.length}
                    </span>
                  </label>

                  {form.actions.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '5px',
                        marginTop: '2px',
                      }}
                    >
                      {form.actions.map((a) => (
                        <span
                          key={a}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#0f172a',
                            background: '#f1f5f9',
                            border: '1px solid #e5e7eb',
                            borderRadius: '999px',
                            padding: '2px 4px 2px 9px',
                          }}
                        >
                          {labelOf(a)}
                          <button
                            type="button"
                            onClick={() => toggleAction(a)}
                            className="ncp-ib"
                            style={{
                              ...iconBtnStyle,
                              padding: '1px',
                              color: '#64748b',
                            }}
                            aria-label="Bỏ chọn"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ position: 'relative', marginTop: '2px' }}>
                    <Search
                      size={14}
                      style={{
                        position: 'absolute',
                        left: '11px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                      }}
                    />
                    <input
                      className="form-control"
                      style={{ paddingLeft: '32px' }}
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
                      <div
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          marginTop: '4px',
                          maxHeight: '166px',
                          overflowY: 'auto',
                        }}
                      >
                          {hits.length === 0 ? (
                            <div
                              style={{
                                padding: '12px',
                                fontSize: '12px',
                                color: '#94a3b8',
                              }}
                            >
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
                                  className="ncp-sub"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => toggleAction(c.action)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '9px',
                                    width: '100%',
                                    padding: '7px 12px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: '1px solid #f1f5f9',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '15px',
                                      height: '15px',
                                      borderRadius: '4px',
                                      border: '1.5px solid #cbd5e1',
                                      background: on ? '#0f172a' : '#fff',
                                      borderColor: on ? '#0f172a' : '#cbd5e1',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {on && <Check size={11} color="#fff" />}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '12.5px',
                                      fontWeight: 500,
                                      color: '#0f172a',
                                    }}
                                  >
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

              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-insp"
                  style={{
                    width: 'auto',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                  }}
                  onClick={closeForm}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-insp btn-insp-primary"
                  style={{
                    width: 'auto',
                    background: '#0f172a',
                    opacity: saving ? 0.6 : 1,
                  }}
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
              className="modal-card"
              style={{ maxWidth: '380px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Xóa webhook này?
                </h2>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p
                  style={{
                    margin: 0,
                    fontSize: '12.5px',
                    color: '#64748b',
                    lineHeight: 1.55,
                  }}
                >
                  Webhook của "{deleteTarget.chatName}" và mọi đăng ký hành động
                  của nhóm này sẽ bị xóa. Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-insp"
                  style={{
                    width: 'auto',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                  }}
                  onClick={() => setDeleteTarget(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-insp btn-insp-danger"
                  style={{ width: 'auto', opacity: deleting ? 0.6 : 1 }}
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
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: toast.err ? '#dc2626' : '#0f172a',
              color: '#fff',
              padding: '11px 18px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              boxShadow: '0 10px 30px rgba(0,0,0,.25)',
              zIndex: 1100,
              maxWidth: '90vw',
            }}
          >
            {toast.err ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
            {toast.msg}
          </div>,
          document.body,
        )}
    </div>
  );
};
