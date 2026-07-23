import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TelecareService, TELECARE_QUEUE } from './telecare.service';
import { TelecareController } from './telecare.controller';
import { TelecareProcessor } from './telecare.processor';
import { GuestInviteService } from './guest-invite.service';
import { GuestInviteController, PublicGuestInviteController } from './guest-invite.controller';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TELECARE_QUEUE,
    }),
    StorageModule,
    NotificationsModule,
  ],
  providers: [TelecareService, TelecareProcessor, GuestInviteService],
  controllers: [TelecareController, GuestInviteController, PublicGuestInviteController],
  exports: [TelecareService],
})
export class TelecareModule {}
