import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  Activity,
  Share2,
  Inbox,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { usersApi } from '../api/client';
import { formatDate, formatReportType, formatVitalType } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="card flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => usersApi.dashboard().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  const { stats, recentReports, recentVitals } = data;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-slate-600">Here's an overview of your health wallet</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total Reports" value={stats.reportCount} color="brand" />
        <StatCard icon={Activity} label="Vital Readings" value={stats.vitalCount} color="blue" />
        <StatCard icon={Share2} label="Shared Reports" value={stats.sharedCount} color="purple" />
        <StatCard icon={Inbox} label="Received Shares" value={stats.receivedCount} color="amber" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/reports" className="btn-primary">
          <Plus className="h-4 w-4" />
          Upload Report
        </Link>
        <Link to="/vitals" className="btn-secondary">
          <TrendingUp className="h-4 w-4" />
          Add Vital
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Reports</h2>
            <Link to="/reports" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentReports.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No reports yet. Upload your first report!</p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((r) => (
                <Link
                  key={r.id}
                  to={`/reports/${r.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{r.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatReportType(r.report_type)} · {formatDate(r.report_date)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Vitals</h2>
            <Link to="/vitals" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentVitals.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No vitals recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentVitals.map((v, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <div>
                    <p className="font-medium text-slate-900">{formatVitalType(v.vital_type)}</p>
                    <p className="text-xs text-slate-500">{formatDate(v.recorded_at)}</p>
                  </div>
                  <span className="text-lg font-semibold text-brand-600">
                    {v.value} <span className="text-sm font-normal text-slate-500">{v.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
