import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-documents',
  templateUrl: './documents.page.html',
  styleUrls: ['./documents.page.scss'],
  standalone: false,
  providers: [DatePipe]
})
export class DocumentsPage implements OnInit {
  documents: any[] = [];
  documentTitle: string = '';
  selectedFile: File | null = null;
  isLoading: boolean = false;
  confirmedAppointments: any[] = [];
  selectedAppointmentId: string | null = null;

  constructor(
    private authService: AuthService,
    private toastController: ToastController,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.loadDocuments();
    this.loadConfirmedAppointments();
  }

  async loadDocuments() {
    this.isLoading = true;
    try {
      const response = await this.authService.getPatientDocuments().toPromise();
      this.documents = response || [];
    } catch (error) {
      console.error('Error loading documents:', error);
      this.presentToast('Erreur lors du chargement des documents');
    } finally {
      this.isLoading = false;
    }
  }

  async loadConfirmedAppointments() {
    try {
      const response = await this.authService.getUserRendezVous().toPromise();
      this.confirmedAppointments = (response || []).filter((rdv: any) => rdv.status === 'confirmed');
    } catch (error) {
      console.error('Error loading appointments:', error);
      this.presentToast('Erreur lors du chargement des rendez-vous');
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      this.selectedFile = file;
    } else {
      this.presentToast('Veuillez sélectionner un fichier PDF, JPG ou PNG');
      this.selectedFile = null;
    }
  }

  async uploadDocument() {
    if (!this.documentTitle || !this.selectedFile || !this.selectedAppointmentId) {
      this.presentToast('Veuillez remplir le titre, sélectionner un fichier et choisir un rendez-vous');
      return;
    }

    this.isLoading = true;
    const formData = new FormData();
    formData.append('title', this.documentTitle);
    formData.append('file', this.selectedFile);
    formData.append('patientId', await this.getPatientId());
    
    // Find the selected appointment to get the doctorId
    const selectedAppointment = this.confirmedAppointments.find(
      (rdv: any) => rdv._id === this.selectedAppointmentId
    );
    if (selectedAppointment) {
      formData.append('doctorId', selectedAppointment.doctorId);
    }

    try {
      await this.authService.uploadDocument(formData).toPromise();
      this.presentToast('Document envoyé avec succès');
      this.documentTitle = '';
      this.selectedFile = null;
      this.selectedAppointmentId = null;
      this.loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      this.presentToast('Erreur lors de l\'envoi du document');
    } finally {
      this.isLoading = false;
    }
  }

  async getPatientId(): Promise<string> {
    const profile = await this.authService.getProfile().toPromise();
    return profile.user_id;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return this.datePipe.transform(dateStr, 'dd MMMM yyyy, HH:mm', 'fr-FR') || dateStr;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  }

  formatAppointment(rdv: any): string {
    const date = this.datePipe.transform(rdv.date, 'dd MMMM yyyy', 'fr-FR');
    return `${rdv.doctorName} - ${date} à ${rdv.heure}`;
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }
}