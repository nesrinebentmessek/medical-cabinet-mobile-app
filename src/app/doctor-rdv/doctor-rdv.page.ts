import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-doctor-rdv',
  templateUrl: './doctor-rdv.page.html',
  styleUrls: ['./doctor-rdv.page.scss'],
  standalone:false
})
export class DoctorRdvPage implements OnInit {
  appointments: any[] = [];

  constructor(
    private authService: AuthService,
    private alertController: AlertController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAppointments();
  }

  loadAppointments() {
    this.authService.getDoctorAppointments().subscribe({
      next: (data) => {
        this.appointments = data;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error loading appointments', err.message);
      }
    });
  }

  async confirmRdv(rdvId: string) {
    const alert = await this.alertController.create({
      header: 'Confirmer',
      message: 'Confirmer ce rendez-vous?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Confirmer',
          handler: () => {
            this.authService.updateRdvStatus(rdvId, 'confirmed').subscribe({
              next: () => this.loadAppointments(),
              error: (err: HttpErrorResponse) => console.error('Error:', err.message)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async cancelRdv(rdvId: string) {
    const alert = await this.alertController.create({
      header: 'Annuler RDV',
      message: 'Voulez-vous vraiment annuler ce rendez-vous?',
      buttons: [
        { text: 'Non', role: 'cancel' },
        {
          text: 'Oui',
          handler: () => {
            this.authService.updateRdvStatus(rdvId, 'cancelled').subscribe({
              next: () => this.loadAppointments(),
              error: (err: HttpErrorResponse) => console.error('Error:', err.message)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}