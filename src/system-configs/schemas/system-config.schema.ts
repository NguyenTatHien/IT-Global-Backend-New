// BE-Test/src/system-configs/system-configs.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SystemConfigDocument = HydratedDocument<SystemConfig>;

@Schema({ timestamps: true })
export class SystemConfig {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  value: any;

  @Prop()
  description: string;
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);
