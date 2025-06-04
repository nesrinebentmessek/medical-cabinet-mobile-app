import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-patient-notifications',
  templateUrl: './patient-notifications.page.html',
  styleUrls: ['./patient-notifications.page.scss'],
  standalone: false,
  providers: [DatePipe]
})
export class PatientNotificationsPage implements OnInit {
  notifications: any[] = [];
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private toastController: ToastController,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  async loadNotifications() {
    this.isLoading = true;
    try {
      const response = await this.authService.getNotifications().toPromise();
      this.notifications = response || [];
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.presentToast('Erreur lors du chargement des notifications');
    } finally {
      this.isLoading = false;
    }
  }

  async refreshNotifications(event: any) {
    await this.loadNotifications();
    event.target.complete();
  }

  async toggleReadStatus(notification: any, read: boolean) {
    try {
      await this.authService.updateNotificationReadStatus(notification._id, read).toPromise();
      notification.read = read;
      this.presentToast(`Notification marquée comme ${read ? 'lue' : 'non lue'}`);
    } catch (error) {
      console.error('Error updating notification status:', error);
      this.presentToast('Erreur lors de la mise à jour du statut');
      notification.read = !read;
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