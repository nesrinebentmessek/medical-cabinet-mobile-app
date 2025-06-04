import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  async onLogin() {
    if (!this.email || !this.password) {
      this.showAlert('Veuillez remplir tous les champs.');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingCtrl.create({ message: 'Connexion...' });
    await loading.present();

    try {
      const response = await this.authService.login(this.email, this.password).toPromise();
      this.authService.saveToken(response.token);
      sessionStorage.setItem('userId', response.user_id);

      // Gestion du RDV en attente
      const pendingRdv = localStorage.getItem('pendingRendezVous');
      if (pendingRdv) {
        const rdvData = JSON.parse(pendingRdv);
        try {
          await this.authService.createRendezVous(rdvData).toPromise();
        } catch (error) {
          console.error('Erreur création RDV:', error);
        } finally {
          localStorage.removeItem('pendingRendezVous');
          this.router.navigate(['/confirm-rdv'], { 
            queryParams: { rdvData: pendingRdv } 
          });
        }
      } else {
        // Redirect based on user role
        const role = response.role;
        if (role === 'medecin') {
          this.router.navigate(['/doctor-profile']);
        } else {
          this.router.navigate(['/user-profile']);
        }
      }
    } catch (error: any) {
      this.handleLoginError(error);
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  private async showAlert(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Erreur',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private handleLoginError(error: any) {
    const message = error.status === 401 
      ? 'Email ou mot de passe incorrect.' 
      : 'Erreur de connexion. Réessayez plus tard.';
    this.showAlert(message);
  }
}