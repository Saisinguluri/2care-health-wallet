import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Inbox, FileText, Eye, Download } from 'lucide-react';
import { sharesApi, reportsApi } from '../api/client';
import { formatDate, formatReportType, getErrorMessage } from '../utils/helpers';
import { toast } from '../components/ui/ToastProvider';

export default function SharedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['shares', 'received'],
    queryFn: () => sharesApi.received().then((r) => r.data),
  });

  const handleDownload = async (reportId, fileName) => {
    try {
      const { data: blob } = await reportsApi.download(reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'report';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const shares = data?.shares || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Shared With Me</h1>
        <p className="mt-1 text-slate-600">
          Health reports others have shared with you (read-only access)
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      ) : shares.length === 0 ? (
        <div className="card py-16 text-center">
          <Inbox className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 font-medium text-slate-700">No shared reports</p>
          <p className="mt-1 text-sm text-slate-500">
            When someone shares a report with your email, it will appear here
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shares.map((s) => (
            <div key={s.id} className="card transition-shadow hover:shadow-elevated">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  Read-only
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{s.report_title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {formatReportType(s.report_type)} · {formatDate(s.report_date)}
              </p>
              <p className="mt-2 text-xs text-brand-600">
                Shared by {s.owner_name}
              </p>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <Link to={`/reports/${s.report_id}`} className="btn-ghost flex-1 text-xs">
                  <Eye className="h-3.5 w-3.5" /> View
                </Link>
                <button
                  onClick={() => handleDownload(s.report_id, s.report_title)}
                  className="btn-ghost flex-1 text-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
