import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'inscription',
        loadChildren: () => import('./inscription/inscription.module').then(m => m.InscriptionPageModule)
      },
      {
        path: 'login',
        loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
      },
      {
        path: 'rendez-vous',
        loadChildren: () => import('./rendez-vous/rendez-vous.module').then(m => m.RendezVousPageModule)
      },
      {
        path: 'confirm-rdv',
        loadChildren: () => import('./confirm-rdv/confirm-rdv.module').then(m => m.ConfirmRdvPageModule)
      },
      {
        path: 'historique-rdv',
        loadChildren: () => import('./historique-rdv/historique-rdv.module').then(m => m.HistoriqueRdvPageModule)
      },
      {
        path: 'user-profile',
        loadChildren: () => import('./user-profile/user-profile.module').then(m => m.UserProfilePageModule)
      },
      {
        path: 'doctor-rdv',
        loadChildren: () => import('./doctor-rdv/doctor-rdv.module').then(m => m.DoctorRdvPageModule)
      },
      {
        path: 'edit-profile',
        loadChildren: () => import('./edit-profile/edit-profile.module').then(m => m.EditProfilePageModule)
      },
     
      {
        path: 'documents',
        loadChildren: () => import('./documents/documents.module').then(m => m.DocumentsPageModule)
      },
      {
        path: 'notifications',
        loadChildren: () => import('./notifications/notifications.module').then(m => m.NotificationsPageModule)
      },
    
      {
        path: 'consultations',
        loadChildren: () => import('./consultations/consultations.module').then(m => m.ConsultationsPageModule)
      },
      {
        path: 'doctor-profile',
        loadChildren: () => import('./doctor-profile/doctor-profile.module').then(m => m.DoctorProfilePageModule)
      },
      {
        path: 'doctor-appointments',
        loadChildren: () => import('./doctor-appointments/doctor-appointments.module').then(m => m.DoctorAppointmentsPageModule)
      },
      {
        path: 'patient-notifications',
        loadChildren: () => import('./patient-notifications/patient-notifications.module').then(m => m.PatientNotificationsPageModule)
      },
      {
        path: 'docs-patient',
        loadChildren: () => import('./docs-patient/docs-patient.module').then(m => m.DocsPatientPageModule)
      },
      {
        path: 'messaging',
        loadChildren: () => import('./messaging/messaging.module').then(m => m.MessagingPageModule),
        data: { hideToolbar: true }
      },
      {
        path: 'chat/:id',
        loadChildren: () => import('./chat/chat.module').then(m => m.ChatPageModule),
        data: { hideToolbar: true }
      }
    ]
  },  {
    path: 'patient-notification',
    loadChildren: () => import('./patient-notification/patient-notification.module').then( m => m.PatientNotificationPageModule)
  },

 

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}