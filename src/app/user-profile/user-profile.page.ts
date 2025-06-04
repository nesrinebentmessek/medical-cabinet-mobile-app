import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.page.html',
  styleUrls: ['./user-profile.page.scss'],
  standalone:false
})
export class UserProfilePage implements OnInit {
  user: { name: string; email: string; role: string; user_id: string; profilePicture?: string } | null = null;
  consultations: any[] = [];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.authService.getProfile().subscribe({
      next: (data: { name: string; email: string; role: string; user_id: string }) => {
        this.user = { ...data, profilePicture: 'assets/1.jpg' };
        if (this.user.role === 'patient') {
          this.loadConsultations();
        }
      },
      error: (err: any) => {
        console.error('Erreur chargement profil:', err);
        this.router.navigate(['/login']);
      }
    });
  }

  loadConsultations() {
    this.authService.getMedicalHistory().subscribe({
      next: (data: any[]) => {
        this.consultations = data;
      },
      error: (err: any) => {
        console.error('Erreur chargement consultations:', err);
      }
    });
  }

  downloadDocuments(documentIds: string[]) {
    documentIds.forEach(fileId => {
      this.authService.downloadDocument(fileId).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `document_${fileId}`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err: any) => {
          console.error('Erreur téléchargement document:', err);
        }
      });
    });
  }

  // Nouvelle méthode pour le bouton back
  goBack() {
    this.location.back();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToDocuments() {
    this.router.navigate(['/documents']);
  }

  goToNotifications() {
    this.router.navigate(['/notifications']);
  }

  goToDisponibilites() {
    this.router.navigate(['/disponibilites']);
  }

  goToConsultations() {
    this.router.navigate(['/consultations']);
  }
  goToHistorique() {
    this.router.navigate(['/historique-rdv']);
  }

  goToDocsPatient() {
    this.router.navigate(['/docs-patient']);
  }

  editProfile() {
    this.router.navigate(['/edit-profile']);
  }

  goToMessaging() {
    this.router.navigate(['/messaging']);
  }
}