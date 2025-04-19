// BE-Test/src/reports/reports.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true })
export class Report{
  @Prop({ required: true })
  type: string; // attendance, payroll, leave

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  data: any;

  @Prop()
  createdBy: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);