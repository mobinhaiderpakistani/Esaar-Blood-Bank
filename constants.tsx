
import { Donor, User, UserRole } from './types';

export const INITIAL_COLLECTORS: User[] = [
  { id: 'c1', name: 'Zaid Khan', phone: '03001234567', role: UserRole.COLLECTOR, username: 'zaid', password: '123', city: 'Lahore' },
  { id: 'c2', name: 'Ahmed Ali', phone: '03112233445', role: UserRole.COLLECTOR, username: 'ahmed', password: '123', city: 'Lahore' },
];

export const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Multan', 'Rawalpindi', 'Peshawar', 'Quetta'];

export const INITIAL_DONORS: Donor[] = [
  { id: 'd1', name: 'Kamran Akmal', phone: '03219876543', address: 'DHA Phase 5, Lahore', city: 'Lahore', monthlyAmount: 2000, referredBy: 'Self', assignedCollectorId: 'c1', lastPaymentDate: '2024-04-01', status: 'PENDING', joinDate: '2026-01-15' },
  { id: 'd2', name: 'Sajid Mehmood', phone: '03331112233', address: 'Gulberg 3, Lahore', city: 'Lahore', monthlyAmount: 5000, referredBy: 'Zaid Khan', assignedCollectorId: 'c1', lastPaymentDate: '2024-04-05', status: 'PENDING', joinDate: '2026-01-20' },
  { id: 'd3', name: 'Umer Gul', phone: '03005554443', address: 'Johar Town, Lahore', city: 'Lahore', monthlyAmount: 1500, referredBy: 'Ahmed Ali', assignedCollectorId: 'c2', lastPaymentDate: '2024-04-10', status: 'PENDING', joinDate: '2026-01-10' },
];
