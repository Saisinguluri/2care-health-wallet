export const REPORT_TYPE_LABELS = {
  blood_test: 'Blood Test',
  x_ray: 'X-Ray',
  mri: 'MRI',
  ecg: 'ECG',
  prescription: 'Prescription',
  ultrasound: 'Ultrasound',
  other: 'Other',
};

export const VITAL_TYPE_LABELS = {
  blood_pressure_systolic: 'BP Systolic',
  blood_pressure_diastolic: 'BP Diastolic',
  blood_sugar: 'Blood Sugar',
  heart_rate: 'Heart Rate',
  weight: 'Weight',
  temperature: 'Temperature',
  oxygen_saturation: 'SpO₂',
  cholesterol: 'Cholesterol',
  hemoglobin: 'Hemoglobin',
};

export function formatReportType(type) {
  return REPORT_TYPE_LABELS[type] || type;
}

export function formatVitalType(type) {
  return VITAL_TYPE_LABELS[type] || type;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getErrorMessage(err) {
  return err.response?.data?.error || err.message || 'Something went wrong';
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
