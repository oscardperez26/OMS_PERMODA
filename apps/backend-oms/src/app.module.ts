import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { ConfiguracionGeneralModule } from './configuracion-general/configuracion-general.module';
import { OrdersModule } from './orders/orders.module';
import { BrandingModule } from './branding/branding.module';
import { SecurityPermissionsModule } from './security-permissions/security-permissions.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    UsersModule,
    BrandingModule,
    SecurityPermissionsModule,
    ConfiguracionGeneralModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
