import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PatientNotificationPageRoutingModule } from './patient-notification-routing.module';

import { PatientNotificationPage } from './patient-notification.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PatientNotificationPageRoutingModule
  ],
  declarations: [PatientNotificationPage]
})
export class PatientNotificationPageModule {}
