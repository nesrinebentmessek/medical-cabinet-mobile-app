import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HistoriqueRdvPageRoutingModule } from './historique-rdv-routing.module';

import { HistoriqueRdvPage } from './historique-rdv.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HistoriqueRdvPageRoutingModule
  ],
  declarations: [HistoriqueRdvPage]
})
export class HistoriqueRdvPageModule {}
