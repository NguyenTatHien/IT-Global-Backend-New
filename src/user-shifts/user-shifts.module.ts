import { Module } from '@nestjs/common';
import { UserShiftsService } from './user-shifts.service';
import { UserShiftsController } from './user-shifts.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserShift, UserShiftSchema } from './schemas/user-shift.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Shift, ShiftSchema } from '../shifts/schemas/shift.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserShift.name, schema: UserShiftSchema },
      { name: User.name, schema: UserSchema },
      { name: Shift.name, schema: ShiftSchema }
    ])
  ],
  controllers: [UserShiftsController],
  providers: [UserShiftsService],
  exports: [UserShiftsService]
})
export class UserShiftsModule {}
