import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-doctor-search-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Rechercher un médecin</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Fermer</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-searchbar [(ngModel)]="searchTerm" (ionChange)="searchDoctors()"></ion-searchbar>
      <ion-list>
        <ion-item *ngFor="let doctor of doctors" (click)="selectDoctor(doctor)">
          <ion-label>{{ doctor.nom }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class DoctorSearchModalComponent implements OnInit {
  searchTerm: string = '';
  doctors: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.searchDoctors();
  }

  async searchDoctors() {
    try {
      const doctors = await this.authService.getDoctors().toPromise();
      this.doctors = doctors?.filter((doctor: any) =>
        doctor.nom.toLowerCase().includes(this.searchTerm.toLowerCase())
      ) || [];
    } catch (error) {
      console.error('Error searching doctors:', error);
    }
  }

  selectDoctor(doctor: any) {
    this.modalCtrl.dismiss({
      doctorId: doctor.id,
      doctorName: doctor.nom
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}