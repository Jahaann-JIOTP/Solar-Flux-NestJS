import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/config';
import { AppModule as AppFeatureModule } from './app/app.module';  // module for the general route
import { UsersModule } from './users/users.module';
import { PrivilegesModule } from './privileges/privileges.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SldModule } from './sld/sld.module';
import { ProductionModule } from './production/production.module';
import { AnalysisModule } from './analysis/analysis.module';
import { SolaranalyticsModule } from './solaranalytics/solaranalytics.module';
import { HealthModule } from './health/health.module';



  @Module({
    imports: [
      ConfigModule.forRoot({
        load: [configuration],
      }),
      MongooseModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          uri: configService.get<string>('mongoUri'),
        }),
      }),
      AppFeatureModule,
      UsersModule,
      AnalysisModule,
      PrivilegesModule,
      RolesModule,
      AuthModule, 
      DashboardModule, 
      SldModule, ProductionModule, SolaranalyticsModule, HealthModule,
    ],
  })
  export class AppModule {}


