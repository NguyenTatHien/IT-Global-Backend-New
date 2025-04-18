export interface IShift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface IPopulatedUserShift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  shiftId: IShift | null;
}

export interface ITransformedAttendance {
  _id: string;
  userId: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
  totalHours: string;
  overtimeHours: number;
  lateMinutes: number;
  earlyMinutes: number;
  userShiftId: IPopulatedUserShift | null;
  isDeleted: boolean;
  deletedAt: string | null;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
