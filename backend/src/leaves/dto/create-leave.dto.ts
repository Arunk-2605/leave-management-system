import { IsInt, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateLeaveDto {
  @IsInt()
  leaveTypeId: number;

  @IsISO8601()
  startDate: string; // ISO date string

  @IsISO8601()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

