import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserShiftsService } from './user-shifts.service';
import { UserShiftsController } from './user-shifts.controller';
import { UserShift, UserShiftSchema } from './schemas/user-shift.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserShift.name, schema: UserShiftSchema }
    ])
  ],
  controllers: [UserShiftsController],
  providers: [UserShiftsService],
  exports: [UserShiftsService]
})
export class UserShiftsModule {}
