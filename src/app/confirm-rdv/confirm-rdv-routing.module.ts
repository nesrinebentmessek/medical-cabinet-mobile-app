import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ConfirmRdvPage } from './confirm-rdv.page';

const routes: Routes = [
  {
    path: '',
    component: ConfirmRdvPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfirmRdvPageRoutingModule {}
