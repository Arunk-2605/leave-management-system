import { IsOptional, IsString } from 'class-validator';

export class UpdateLeaveStatusDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

