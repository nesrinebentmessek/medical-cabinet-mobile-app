import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';

interface RendezVous {
  _id: string;
  doctorId: string;
  doctorName: string;
  specialite: string;
  date: string;
  heure: string;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-historique-rdv',
  templateUrl: './historique-rdv.page.html',
  styleUrls: ['./historique-rdv.page.scss'],
  standalone: false
})
export class HistoriqueRdvPage {
  rdvHistory: RendezVous[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ionViewWillEnter() {
    this.loadHistory();
  }

  async loadHistory(event?: any) {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Chargement des rendez-vous...'
    });
    await loading.present();

    try {
      const rdvs = await this.authService.getUserRendezVous().toPromise();
      this.rdvHistory = (rdvs as RendezVous[]).sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } catch (error) {
      console.error('Erreur chargement RDV:', error);
      await this.presentToast('Erreur lors du chargement des rendez-vous', 'danger');
    } finally {
      await loading.dismiss();
      if (event) event.target.complete();
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'medium';
    }
  }

  async onDeleteRdv(rdv: RendezVous) {
    const alert = await this.alertController.create({
      header: 'Confirmation',
      message: `Voulez-vous vraiment supprimer le rendez-vous avec ${rdv.doctorName} le ${this.formatDate(rdv.date)} à ${rdv.heure} ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          handler: async () => {
            await this.executeDelete(rdv._id);
          }
        }
      ]
    });

    await alert.present();
  }

  private async executeDelete(rdvId: string) {
    const loading = await this.loadingController.create({
      message: 'Suppression en cours...'
    });
    await loading.present();

    try {
      await this.authService.deleteRdv(rdvId).toPromise();
      this.rdvHistory = this.rdvHistory.filter(r => r._id !== rdvId);
      await this.presentToast('Rendez-vous supprimé', 'success');
    } catch (error) {
      console.error('Erreur suppression:', error);
      await this.presentToast('Échec de la suppression', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async onEditRdv(rdv: RendezVous) {
    const alert = await this.alertController.create({
      header: 'Modifier le rendez-vous',
      inputs: [
        {
          name: 'date',
          type: 'date',
          value: rdv.date,
          label: 'Nouvelle date'
        },
        {
          name: 'heure',
          type: 'time',
          value: rdv.heure,
          label: 'Nouvelle heure'
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Valider',
          handler: async (data) => {
            if (data.date && data.heure) {
              await this.updateRdv(rdv._id, data.date, data.heure);
            } else {
              this.presentToast('Date ou heure manquante', 'warning');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async updateRdv(id: string, date: string, heure: string) {
    const loading = await this.loadingController.create({
      message: 'Mise à jour en cours...'
    });
    await loading.present();

    try {
      await this.authService.updateRdv(id, { date, heure }).toPromise();
      await this.presentToast('Rendez-vous mis à jour', 'success');
      this.loadHistory();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      await this.presentToast('Échec de la mise à jour', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}