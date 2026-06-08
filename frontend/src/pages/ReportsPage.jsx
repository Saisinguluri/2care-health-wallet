import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Upload,
  Search,
  FileText,
  Image,
  Filter,
  Trash2,
  Download,
  Eye,
} from 'lucide-react';
import { reportsApi } from '../api/client';
import {
  formatDate,
  formatReportType,
  formatFileSize,
  getErrorMessage,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/ui/ToastProvider';

function UploadReportModal({ open, onClose, types }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    report_type: 'blood_test',
    report_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(false);

  const addVital = () => {
    setVitals((prev) => [...prev, { vital_type: 'blood_sugar', value: '', recorded_at: form.report_date }]);
  };

  const updateVital = (idx, field, val) => {
    setVitals((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v)));
  };

  const removeVital = (idx) => {
    setVitals((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast('Please select a file', 'error');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', form.title);
      fd.append('report_type', form.report_type);
      fd.append('report_date', form.report_date);
      if (form.notes) fd.append('notes', form.notes);
      const validVitals = vitals
        .filter((v) => v.value !== '')
        .map((v) => ({
          ...v,
          value: Number(v.value),
          recorded_at: `${v.recorded_at || form.report_date}T12:00:00.000Z`,
        }));
      if (validVitals.length) fd.append('vitals', JSON.stringify(validVitals));

      await reportsApi.create(fd);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast('Report uploaded successfully', 'success');
      onClose();
      setForm({ title: '', report_type: 'blood_test', report_date: new Date().toISOString().slice(0, 10), notes: '' });
      setFile(null);
      setVitals([]);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Health Report" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">
            {file ? file.name : 'Click to upload PDF or image'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Max 10MB · PDF, JPEG, PNG, WebP</p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Annual Blood Panel" />
          </div>
          <div>
            <label className="label">Report Type</label>
            <select className="input" value={form.report_type} onChange={(e) => setForm({ ...form, report_type: e.target.value })}>
              {(types?.reportTypes || []).map((t) => (
                <option key={t} value={t}>{formatReportType(t)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Report Date</label>
          <input type="date" className="input" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} required />
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Associated Vitals (optional)</label>
            <button type="button" onClick={addVital} className="text-sm font-medium text-brand-600 hover:text-brand-700">
              + Add vital
            </button>
          </div>
          {vitals.map((v, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <select className="input flex-1" value={v.vital_type} onChange={(e) => updateVital(i, 'vital_type', e.target.value)}>
                {(types?.vitalTypes || []).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input type="number" step="any" className="input w-28" placeholder="Value" value={v.value} onChange={(e) => updateVital(i, 'value', e.target.value)} />
              <button type="button" onClick={() => removeVital(i)} className="rounded-lg px-2 text-red-500 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Upload Report</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', reportType: '', dateFrom: '', dateTo: '', vitalType: '' });

  const { data: types } = useQuery({
    queryKey: ['reportTypes'],
    queryFn: () => reportsApi.getTypes().then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['reports', filters],
    queryFn: () =>
      reportsApi
        .list(
          Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v)
          )
        )
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => reportsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast('Report deleted', 'success');
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  const handleDownload = async (id, name) => {
    try {
      const { data: blob } = await reportsApi.download(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const reports = data?.reports || [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Health Reports</h1>
          <p className="mt-1 text-slate-600">Upload, view, and manage your medical reports</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload Report
        </Button>
      </div>

      <div className="card mb-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select className="input" value={filters.reportType} onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}>
            <option value="">All report types</option>
            {(types?.reportTypes || []).map((t) => (
              <option key={t} value={t}>{formatReportType(t)}</option>
            ))}
          </select>
          <select className="input" value={filters.vitalType} onChange={(e) => setFilters({ ...filters, vitalType: e.target.value })}>
            <option value="">Filter by vital</option>
            {(types?.vitalTypes || []).map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input type="date" className="input" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <input type="date" className="input" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="card py-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 font-medium text-slate-700">No reports found</p>
          <p className="mt-1 text-sm text-slate-500">Upload your first medical report to get started</p>
          <Button className="mt-4" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Upload Report
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <div key={r.id} className="card group transition-shadow hover:shadow-elevated">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                  {r.file_mime?.startsWith('image/') ? (
                    <Image className="h-5 w-5 text-brand-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-brand-600" />
                  )}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {formatReportType(r.report_type)}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 line-clamp-1">{r.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{formatDate(r.report_date)}</p>
              <p className="mt-1 text-xs text-slate-400">{formatFileSize(r.file_size)}</p>
              {r.user_id !== user?.id && r.owner_name && (
                <p className="mt-1 text-xs text-brand-600">Shared by {r.owner_name}</p>
              )}
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <Link to={`/reports/${r.id}`} className="btn-ghost flex-1 text-xs">
                  <Eye className="h-3.5 w-3.5" /> View
                </Link>
                <button onClick={() => handleDownload(r.id, r.file_name)} className="btn-ghost flex-1 text-xs">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                {r.user_id === user?.id && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this report?')) deleteMutation.mutate(r.id);
                    }}
                    className="btn-ghost text-xs text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadReportModal open={uploadOpen} onClose={() => setUploadOpen(false)} types={types} />
    </div>
  );
}
