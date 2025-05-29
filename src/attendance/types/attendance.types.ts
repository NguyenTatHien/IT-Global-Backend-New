export interface IShift {
    _id: string;
    name: string;
    startTime: string;
    endTime: string;
}

export interface ITransformedAttendance {
    _id: string;
    userId: {
        _id: string;
        name: string;
    };
    checkInTime: string;
    checkOutTime: string | null;
    status: string;
    totalHours: string;
    overtimeHours: number;
    lateMinutes: number;
    earlyMinutes: number;
    userShiftId: {
        _id: string;
        name: string;
        startTime?: string;
        endTime?: string;
    };
    isDeleted: boolean;
    deletedAt: string | null;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}
