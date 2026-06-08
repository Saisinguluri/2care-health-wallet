import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Share2, Trash2, Eye, Users } from 'lucide-react';
import { sharesApi } from '../api/client';
import { formatDate, formatReportType, getErrorMessage } from '../utils/helpers';
import { toast } from '../components/ui/ToastProvider';

export default function SharingPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['shares', 'sent'],
    queryFn: () => sharesApi.sent().then((r) => r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => sharesApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast('Access revoked', 'success');
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  const shares = data?.shares || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sharing Management</h1>
        <p className="mt-1 text-slate-600">
          Manage who has access to your health reports
        </p>
      </div>

      <div className="card mb-6 bg-brand-50/50 border-brand-100">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 text-brand-600" />
          <div>
            <p className="font-medium text-slate-900">How sharing works</p>
            <p className="mt-1 text-sm text-slate-600">
              Share individual reports from the report detail page. Viewers get read-only access
              and must register with the email you share to. They can view and download shared reports only.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      ) : shares.length === 0 ? (
        <div className="card py-16 text-center">
          <Share2 className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 font-medium text-slate-700">No shared reports yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Open a report and click Share to grant access
          </p>
          <Link to="/reports" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            Go to Reports →
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Report</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Shared With</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Date Shared</th>
                <th className="px-6 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shares.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{s.report_title}</p>
                    <p className="text-xs text-slate-500">
                      {formatReportType(s.report_type)} · {formatDate(s.report_date)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{s.viewer_name}</p>
                    <p className="text-xs text-slate-500">{s.viewer_email}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(s.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/reports/${s.report_id}`}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                        title="View report"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(`Revoke access for ${s.viewer_name}?`)) {
                            revokeMutation.mutate(s.id);
                          }
                        }}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        title="Revoke access"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
