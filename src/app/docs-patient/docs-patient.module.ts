import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DocsPatientPageRoutingModule } from './docs-patient-routing.module';

import { DocsPatientPage } from './docs-patient.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DocsPatientPageRoutingModule
  ],
  declarations: [DocsPatientPage]
})
export class DocsPatientPageModule {}
