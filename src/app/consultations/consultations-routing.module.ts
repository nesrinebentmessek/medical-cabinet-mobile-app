import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ConsultationsPage } from './consultations.page';

const routes: Routes = [
  {
    path: '',
    component: ConsultationsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConsultationsPageRoutingModule {}
