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

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    BrandingModule,
    ConfiguracionGeneralModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
