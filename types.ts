
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  COLLECTOR = 'COLLECTOR'
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  username: string;
  password?: string;
  city?: string;
}

export interface Donor {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  monthlyAmount: number;
  referredBy: string;
  assignedCollectorId: string | null;
  lastPaymentDate: string | null;
  status: 'PENDING' | 'COLLECTED';
  joinDate: string;
}

export interface DonationRecord {
  id: string;
  donorId: string;
  donorName: string;
  amount: number;
  collectorId: string;
  collectorName: string;
  date: string;
  paymentMethod: 'CASH' | 'ONLINE';
  receiptSent: boolean;
}

export interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
}

export interface AppState {
  currentUser: User | null;
  donors: Donor[];
  collectors: User[];
  donationHistory: DonationRecord[];
  logs: LogEntry[];
  cities: string[];
  currentMonthKey: string;
  adminPassword?: string;
  superAdminPassword?: string;
}
