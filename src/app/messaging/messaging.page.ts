import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AlertController } from '@ionic/angular';

interface Conversation {
  id: string;
  patientId: string;
  doctorId: string;
  otherPartyName: string;
  createdAt: string;
  lastMessageAt: string;
}

@Component({
  selector: 'app-messaging',
  templateUrl: './messaging.page.html',
  styleUrls: ['./messaging.page.scss'],
  standalone: false
})
export class MessagingPage implements OnInit {
  conversations: Conversation[] = [];
  doctors: any[] = [];
  isLoading: boolean = false;
  isAuthenticated: boolean = false;
  userRole: string | null = null;
  userId: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.authService.getProfile().subscribe({
        next: (profile) => {
          this.userRole = profile.role || null;
          this.userId = profile._id || null;
          console.log('User profile:', { role: this.userRole, id: this.userId });
          this.loadConversations();
          if (this.userRole === 'patient') {
            this.loadDoctors();
          }
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          if (error.status === 404) {
            console.warn('Profile not found, clearing session');
            this.authService.logout();
            this.showAlert('Erreur', 'Utilisateur non trouvé. Veuillez vous reconnecter.');
            this.router.navigate(['/login']);
          } else {
            this.showAlert('Erreur', 'Impossible de charger le profil: ' + (error.message || 'Erreur inconnue'));
            this.router.navigate(['/login']);
          }
        }
      });
    } else {
      console.log('User not authenticated');
      this.router.navigate(['/login']);
    }
  }

  loadConversations() {
    this.isLoading = true;
    this.authService.getConversations().subscribe({
      next: (conversations) => {
        console.log('Raw conversations response:', conversations);
        if (!conversations) {
          console.warn('No conversations returned from backend');
          this.conversations = [];
        } else if (!Array.isArray(conversations)) {
          console.error('Conversations response is not an array:', conversations);
          this.conversations = [];
        } else {
          this.conversations = conversations.map(conv => {
            console.log('Processing conversation:', conv);
            return {
              ...conv,
              lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString() : ''
            };
          });
        }
        this.isLoading = false;
        console.log('Conversations loaded:', this.conversations);
        if (this.conversations.length === 0) {
          console.warn('No conversations found for this user');
          this.showAlert('Information', 'Aucune conversation trouvée.');
        }
      },
      error: (err) => {
        console.error('Error loading conversations:', err);
        this.isLoading = false;
        this.conversations = [];
        this.showAlert('Erreur', 'Impossible de charger les conversations. Veuillez réessayer.');
      }
    });
  }

  loadDoctors() {
    this.authService.getDoctors().subscribe({
      next: (doctors) => {
        this.doctors = doctors || [];
        console.log('Doctors loaded:', this.doctors);
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
        this.showAlert('Erreur', 'Impossible de charger la liste des médecins.');
      }
    });
  }

  startNewConversation(doctorId: string) {
    console.log('Starting new conversation with doctorId:', doctorId);
    if (!doctorId) {
      console.error('No doctorId provided');
      this.showAlert('Erreur', 'ID du médecin manquant.');
      return;
    }
    this.authService.createConversation(doctorId).subscribe({
      next: (conversation) => {
        console.log('Conversation created:', conversation);
        const doctor = this.doctors.find(d => d.id === doctorId);
        const newConversation: Conversation = {
          id: conversation.id,
          otherPartyName: doctor ? doctor.nom : 'Inconnu',
          doctorId: doctorId,
          patientId: '',
          createdAt: new Date().toISOString(),
          lastMessageAt: ''
        };
        this.conversations = [newConversation, ...this.conversations];
        this.router.navigate(['/chat', conversation.id]);
        console.log('Navigated to chat:', conversation.id);
      },
      error: (error: any) => {
        console.error('Error creating conversation:', error);
        const message = error.message === 'Conversation existante'
          ? 'Une conversation avec ce médecin existe déjà.'
          : error.message || 'Impossible de démarrer une nouvelle conversation.';
        this.showAlert('Erreur', message);
      }
    });
  }

  openChat(conversation: Conversation) {
    console.log('Opening chat with conversation:', conversation);
    this.router.navigate(['/chat', conversation.id]).catch(error => {
      console.error('Error navigating to chat:', error);
      this.showAlert('Erreur', 'Impossible d\'ouvrir la conversation.');
    });
  }

  refreshConversations() {
    console.log('Refreshing conversations');
    this.loadConversations();
  }

  async showAlert(title: string, message: string) {
    const alert = await this.alertCtrl.create({
      header: title,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  goToProfileOrLogin() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/user-profile']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}