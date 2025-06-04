import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-confirm-rdv',
  templateUrl: './confirm-rdv.page.html',
  styleUrls: ['./confirm-rdv.page.scss'],
  standalone: false
})
export class ConfirmRdvPage implements OnInit {
  rdvData: any = null;
  isLoggedIn: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isAuthenticated();

    // Retrieve rdvData from navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['rdvData']) {
      this.rdvData = navigation.extras.state['rdvData'];
      this.saveToHistory(this.rdvData);
    } else {
      // Fallback to localStorage if not logged in
      const pendingRdv = localStorage.getItem('pendingRendezVous');
      if (pendingRdv) {
        this.rdvData = JSON.parse(pendingRdv);
        localStorage.removeItem('pendingRendezVous');
      }
    }
  }

  private saveToHistory(rdv: any) {
    if (!this.isLoggedIn || !rdv) return;

    try {
      const history = JSON.parse(localStorage.getItem('rdvHistory') || '[]');
      const newAppointment = {
        ...rdv,
        _id: rdv.id || new Date().getTime().toString(), // Generate a temporary ID if not provided
        createdAt: new Date().toISOString(),
        status: 'confirmed'
      };

      // Check for duplicates
      const isDuplicate = history.some((item: any) =>
        item.date === rdv.date &&
        item.heure === rdv.heure &&
        item.doctorId === rdv.doctorId
      );

      if (!isDuplicate) {
        history.unshift(newAppointment);
        localStorage.setItem('rdvHistory', JSON.stringify(history));
      }
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  }

  goToHistory() {
    this.router.navigate(['/historique-rdv']);
  }

  goHome() {
    this.clearTemporaryData();
    this.router.navigate(['/home']);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Confirmation',
      message: 'Voulez-vous vraiment vous déconnecter ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Déconnecter', handler: () => this.performLogout() }
      ]
    });
    await alert.present();
  }

  private performLogout() {
    this.clearTemporaryData();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private clearTemporaryData() {
    localStorage.removeItem('pendingRendezVous');
  }
}