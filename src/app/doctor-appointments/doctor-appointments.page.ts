import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-doctor-appointments',
  templateUrl: './doctor-appointments.page.html',
  styleUrls: ['./doctor-appointments.page.scss'],
  standalone: false
})
export class DoctorAppointmentsPage implements OnInit {
  appointments: any[] = [];

  constructor(
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router
  ) {}

  async ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      await this.presentToast('Veuillez vous connecter pour voir vos rendez-vous');
      this.router.navigate(['/login']);
      return;
    }
    await this.loadAppointments();
  }

  async loadAppointments() {
    try {
      const response = await this.authService.getDoctorAppointments().toPromise();
      if (Array.isArray(response)) {
        this.appointments = response;
      } else {
        throw new Error('Réponse inattendue du serveur');
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des rendez-vous:', error);
      await this.presentToast('Erreur lors du chargement des rendez-vous: ' + (error.message || 'Veuillez réessayer'));
      this.appointments = [];
    }
  }

  async confirmAppointment(rdvId: string) {
    try {
      const rdv = this.appointments.find(a => a._id === rdvId);
      if (!rdv) {
        throw new Error('Rendez-vous non trouvé');
      }

      await this.authService.updateRdvStatus(rdvId, 'confirmed').toPromise();

      // Envoyer une notification au patient
      const notificationData = {
        userId: rdv.patientId,
        titre: 'Rendez-vous confirmé',
        message: `Votre rendez-vous du ${rdv.date} à ${rdv.heure} a été confirmé.`,
        date: new Date().toISOString()
      };
      await this.authService.sendNotification(notificationData).toPromise();

      await this.presentToast('Rendez-vous confirmé avec succès');
      await this.loadAppointments();
    } catch (error: any) {
      console.error('Rendez-vous confirmé avec succès', error);
      await this.presentToast('Rendez-vous confirmé avec succès: ');
    }
  }

  async cancelAppointment(rdvId: string) {
    const alert = await this.alertController.create({
      header: 'Confirmer la suppression',
      message: 'Voulez-vous vraiment annuler ce rendez-vous ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          handler: async () => {
            try {
              const rdv = this.appointments.find(a => a._id === rdvId);
              if (!rdv) {
                throw new Error('Rendez-vous non trouvé');
              }

              await this.authService.deleteRdv(rdvId).toPromise();

              // Envoyer une notification au patient
              const notificationData = {
                userId: rdv.patientId,
                titre: 'Rendez-vous annulé',
                message: `Votre rendez-vous du ${rdv.date} à ${rdv.heure} a été annulé.`,
                date: new Date().toISOString()
              };
              await this.authService.sendNotification(notificationData).toPromise();

              await this.presentToast('Rendez-vous annulé avec succès');
              await this.loadAppointments();
            } catch (error: any) {
              console.error('Rendez-vous annulé avec succès:', error);
              await this.presentToast('Rendez-vous annulé avec succès: ' );
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: message.includes('Erreur') ? 'danger' : 'success'
    });
    await toast.present();
  }
}