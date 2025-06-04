import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DocsPatientPage } from './docs-patient.page';

const routes: Routes = [
  {
    path: '',
    component: DocsPatientPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DocsPatientPageRoutingModule {}
