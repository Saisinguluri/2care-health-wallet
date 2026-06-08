import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  FileText,
  Calendar,
} from 'lucide-react';
import { reportsApi, sharesApi } from '../api/client';
import {
  formatDate,
  formatReportType,
  formatVitalType,
  formatFileSize,
  formatDateTime,
  getErrorMessage,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/ToastProvider';
import { useAuth } from '../context/AuthContext';

function ShareModal({ open, onClose, reportId }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sharesApi.create({ report_id: reportId, viewer_email: email });
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      toast('Report shared successfully', 'success');
      onClose();
      setEmail('');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share Report">
      <form onSubmit={handleShare} className="space-y-4">
        <p className="text-sm text-slate-600">
          Enter the email of a registered user. They will get read-only access to this report.
        </p>
        <div>
          <label className="label">Viewer email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@example.com"
            required
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Share</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOwner } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => reportsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast('Report deleted', 'success');
      navigate('/reports');
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  });

  const handleDownload = async () => {
    try {
      const { data: blob } = await reportsApi.download(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.report.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (error || !data?.report) {
    return (
      <div className="card py-16 text-center">
        <p className="text-slate-600">Report not found</p>
        <Link to="/reports" className="mt-4 inline-block text-brand-600 hover:text-brand-700">
          Back to reports
        </Link>
      </div>
    );
  }

  const { report, access } = data;
  const isReportOwner = access === 'owner';

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50">
              <FileText className="h-7 w-7 text-brand-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{report.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 font-medium text-brand-700">
                  {formatReportType(report.report_type)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> {formatDate(report.report_date)}
                </span>
                <span>{formatFileSize(report.file_size)}</span>
              </div>
              {access === 'viewer' && (
                <p className="mt-2 text-sm text-brand-600">
                  Shared by {report.owner_name} ({report.owner_email})
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleDownload}>
              <Download className="h-4 w-4" /> Download
            </Button>
            {isReportOwner && isOwner && (
              <>
                <Button variant="secondary" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm('Delete this report permanently?')) deleteMutation.mutate();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {report.notes && (
          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Notes</p>
            <p className="mt-1 text-sm text-slate-600">{report.notes}</p>
          </div>
        )}

        {report.vitals?.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-semibold text-slate-900">Associated Vitals</h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Vital</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Value</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.vitals.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatVitalType(v.vital_type)}</td>
                      <td className="px-4 py-3 text-brand-600">{v.value} {v.unit}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(v.recorded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
          Uploaded {formatDateTime(report.created_at)} · {report.file_name}
        </div>
      </div>

      {isReportOwner && (
        <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} reportId={Number(id)} />
      )}
    </div>
  );
}
