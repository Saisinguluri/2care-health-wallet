import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Plus, Trash2, Activity } from 'lucide-react';
import { vitalsApi, reportsApi } from '../api/client';
import { formatDate, formatVitalType, getErrorMessage } from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/ToastProvider';

function AddVitalModal({ open, onClose, vitalTypes }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    vital_type: 'blood_sugar',
    value: '',
    recorded_at: new Date().toISOString().slice(0, 16),
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await vitalsApi.create({
        ...form,
        value: Number(form.value),
        recorded_at: new Date(form.recorded_at).toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      queryClient.invalidateQueries({ queryKey: ['vitalTrends'] });
      queryClient.invalidateQueries({ queryKey: ['vitalSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast('Vital recorded', 'success');
      onClose();
      setForm({ vital_type: 'blood_sugar', value: '', recorded_at: new Date().toISOString().slice(0, 16), notes: '' });
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Vital">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Vital Type</label>
          <select className="input" value={form.vital_type} onChange={(e) => setForm({ ...form, vital_type: e.target.value })}>
            {(vitalTypes || []).map((t) => (
              <option key={t.value} value={t.value}>{t.label} ({t.unit})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Value</label>
          <input type="number" step="any" className="input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
        </div>
        <div>
          <label className="label">Date & Time</label>
          <input type="datetime-local" className="input" value={form.recorded_at} onChange={(e) => setForm({ ...form, recorded_at: e.target.value })} required />
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function VitalsPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedVital, setSelectedVital] = useState('blood_sugar');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: types } = useQuery({
    queryKey: ['reportTypes'],
    queryFn: () => reportsApi.getTypes().then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['vitalSummary'],
    queryFn: () => vitalsApi.summary().then((r) => r.data),
  });

  const trendParams = {
    vitalType: selectedVital,
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['vitalTrends', trendParams],
    queryFn: () => vitalsApi.trends(trendParams).then((r) => r.data),
  });

  const { data: vitalsList } = useQuery({
    queryKey: ['vitals', selectedVital, dateFrom, dateTo],
    queryFn: () =>
      vitalsApi
        .list({ vitalType: selectedVital, ...(dateFrom && { dateFrom }), ...(dateTo && { dateTo }) })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => vitalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      queryClient.invalidateQueries({ queryKey: ['vitalTrends'] });
      queryClient.invalidateQueries({ queryKey: ['vitalSummary'] });
      toast('Vital deleted', 'success');
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  const chartData = (trends?.data || []).map((d) => ({
    date: formatDate(d.recorded_at),
    value: d.value,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vitals Tracking</h1>
          <p className="mt-1 text-slate-600">Monitor your health metrics over time</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Record Vital
        </Button>
      </div>

      {summary?.summary?.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.summary.map((s) => (
            <button
              key={s.vital_type}
              onClick={() => setSelectedVital(s.vital_type)}
              className={`card text-left transition-all ${selectedVital === s.vital_type ? 'ring-2 ring-brand-500' : 'hover:shadow-elevated'}`}
            >
              <p className="text-sm text-slate-500">{formatVitalType(s.vital_type)}</p>
              <p className="mt-1 text-2xl font-bold text-brand-600">
                {s.latest_value} <span className="text-sm font-normal text-slate-500">{s.unit}</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">{s.count} readings</p>
            </button>
          ))}
        </div>
      )}

      <div className="card mb-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Vital Type</label>
            <select className="input" value={selectedVital} onChange={(e) => setSelectedVital(e.target.value)}>
              {(types?.vitalTypes || []).map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        {trendsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-500">
            <Activity className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm">No data for this vital type yet</p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit={` ${trends?.unit || ''}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(val) => [`${val} ${trends?.unit || ''}`, trends?.label]}
                />
                <Line type="monotone" dataKey="value" stroke="#2ea39a" strokeWidth={2.5} dot={{ fill: '#2ea39a', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-900">All Readings</h2>
        {!vitalsList?.vitals?.length ? (
          <p className="py-8 text-center text-sm text-slate-500">No readings recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Value</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Notes</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...(vitalsList.vitals)].reverse().map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 text-slate-700">{formatDate(v.recorded_at)}</td>
                    <td className="px-4 py-3 font-medium text-brand-600">{v.value} {v.unit}</td>
                    <td className="px-4 py-3 text-slate-500">{v.notes || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm('Delete this reading?')) deleteMutation.mutate(v.id);
                        }}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddVitalModal open={addOpen} onClose={() => setAddOpen(false)} vitalTypes={types?.vitalTypes} />
    </div>
  );
}
