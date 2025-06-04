import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HistoriqueRdvPage } from './historique-rdv.page';

const routes: Routes = [
  {
    path: '',
    component: HistoriqueRdvPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HistoriqueRdvPageRoutingModule {}
