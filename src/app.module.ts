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
      PrivilegesModule,
      RolesModule,
      AuthModule, 
      DashboardModule, 
      SldModule,
    ],
  })
  export class AppModule {}


