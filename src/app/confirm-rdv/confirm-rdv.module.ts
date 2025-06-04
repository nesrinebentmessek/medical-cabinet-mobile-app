import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ConfirmRdvPageRoutingModule } from './confirm-rdv-routing.module';

import { ConfirmRdvPage } from './confirm-rdv.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConfirmRdvPageRoutingModule
  ],
  declarations: [ConfirmRdvPage]
})
export class ConfirmRdvPageModule {}
