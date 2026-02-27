import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Public } from 'src/auth/auth.decorators';

@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Public()
  @Get('db')
  async db() {
    const db = await this.databaseService.healthCheck();
    return { status: 'ok', db };
  }
}
