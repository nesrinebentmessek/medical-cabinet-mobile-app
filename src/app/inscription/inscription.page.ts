import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-inscription',
  templateUrl: './inscription.page.html',
  styleUrls: ['./inscription.page.scss'],
  standalone: false
})
export class InscriptionPage {
  name: string = '';
  email: string = '';
  password: string = '';
  role: string = 'patient';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  async onRegister() {
    const userData = {
      name: this.name,
      email: this.email,
      password: this.password,
      role: this.role
    };

    try {
      const response = await this.authService.register(userData).toPromise();
      await this.authService.saveToken(response.token);
      const toast = await this.toastController.create({
        message: 'Inscription réussie ! Bienvenue.',
        duration: 3000,
        color: 'success'
      });
      await toast.present();
      this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Échec de l\'inscription. Veuillez réessayer.';
      const toast = await this.toastController.create({
        message: this.errorMessage,
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}