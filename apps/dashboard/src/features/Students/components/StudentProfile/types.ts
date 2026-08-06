export interface StudentProfileTabsProps {
  studentId?: string;
  onClose?: () => void;
  onOpenFeeRecord?: (feeId?: string) => void;
}

export interface Parent {
  id: string;
  userId: string;
  name: string;
  email: string;
  cin: string | null;
  phone: string | null;
  gender: 'M' | 'F' | 'Other';
  address: string | null;
  dateOfBirth: string | null;
  age: number | null;
  occupation: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  relationshipType: string;
  isEmergencyContact: boolean;
  financialResponsibility: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  userId: string;
  studentCode: string;
  name: string;
  email: string;
  phone: string | null;
  address: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: 'M' | 'F' | 'Other';
  classId: string;
  sectionId: string;
  enrollmentDate: string;
  medicalConditions: string | null;
  previousSchool?: string | null;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  image: string | null;
  createdAt: string;
  updatedAt: string;
  class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
}
