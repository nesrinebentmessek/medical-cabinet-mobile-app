import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';
import { DatePipe } from '@angular/common';
import { lastValueFrom } from 'rxjs'; // Ensure RxJS >= 7.0.0

@Component({
  selector: 'app-docs-patient',
  templateUrl: './docs-patient.page.html',
  styleUrls: ['./docs-patient.page.scss'],
  standalone: false,
  providers: [DatePipe]
})
export class DocsPatientPage implements OnInit {
  documents: any[] = [];
  isLoading: boolean = false;
  annotationInput: { [key: string]: string } = {};

  constructor(
    private authService: AuthService,
    private toastController: ToastController,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.loadDocuments();
  }

  async loadDocuments() {
    this.isLoading = true;
    try {
      const response = await lastValueFrom(this.authService.getDoctorPatientDocuments());
      this.documents = response || [];
      this.documents.forEach(doc => {
        this.annotationInput[doc.id] = '';
      });
    } catch (error) {
      console.error('Error loading documents:', error);
      this.presentToast('Erreur lors du chargement des documents');
    } finally {
      this.isLoading = false;
    }
  }

  async toggleConsultedStatus(document: any, consulted: boolean) {
    try {
      await lastValueFrom(this.authService.updateDocumentStatus(document.id, consulted));
      document.consulted = consulted;
      this.presentToast(`Document marqué comme ${consulted ? 'consulté' : 'en attente'}`);
    } catch (error) {
      console.error('Error updating document status:', error);
      this.presentToast('Erreur lors de la mise à jour du statut');
      document.consulted = !consulted;
    }
  }

  async annotateDocument(document: any) {
    const annotation = this.annotationInput[document.id]?.trim();
    if (!annotation) {
      this.presentToast('Veuillez entrer une annotation');
      return;
    }
    try {
      await lastValueFrom(this.authService.annotateDocument(document.id, annotation));
      this.presentToast('Annotation ajoutée avec succès');
      this.annotationInput[document.id] = '';
      await this.loadDocuments(); // Refresh documents to show new annotation
    } catch (error) {
      console.error('Error annotating document:', error);
      this.presentToast('Erreur lors de l\'ajout de l\'annotation');
    }
  }

  async downloadDocument(fileId: string) {
    try {
      const response = await lastValueFrom(this.authService.downloadDocument(fileId));
      const blob = new Blob([response], { type: response.type });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document_${fileId}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      this.presentToast('Erreur lors du téléchargement du document');
    }
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