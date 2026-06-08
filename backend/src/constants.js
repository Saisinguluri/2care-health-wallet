export const REPORT_TYPES = [
  'blood_test',
  'x_ray',
  'mri',
  'ecg',
  'prescription',
  'ultrasound',
  'other',
];

export const VITAL_TYPES = [
  { value: 'blood_pressure_systolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg' },
  { value: 'blood_pressure_diastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg' },
  { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL' },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'temperature', label: 'Temperature', unit: '°F' },
  { value: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%' },
  { value: 'cholesterol', label: 'Cholesterol', unit: 'mg/dL' },
  { value: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
];

export const VITAL_TYPE_MAP = Object.fromEntries(
  VITAL_TYPES.map((v) => [v.value, v])
);

export function getVitalUnit(vitalType) {
  return VITAL_TYPE_MAP[vitalType]?.unit || '';
}

export function getVitalLabel(vitalType) {
  return VITAL_TYPE_MAP[vitalType]?.label || vitalType;
}
