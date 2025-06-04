import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ConsultationsPageRoutingModule } from './consultations-routing.module';

import { ConsultationsPage } from './consultations.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConsultationsPageRoutingModule
  ],
  declarations: [ConsultationsPage]
})
export class ConsultationsPageModule {}
