export interface Reminder {
  id: number;
  message: string;
  time: string;
  notified: boolean;
  repeatType?: 'none' | 'daily' | 'every2days' | 'every3days' | 'every4days' | 'every5days' | 'every6days' | 'weekly';
  endDate?: string;
}

export interface PatientData {
  patientName: string;
  reminders: Reminder[];
}
