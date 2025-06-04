import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { IonContent, AlertController, ToastController } from '@ionic/angular';
import { Socket } from 'ngx-socket-io';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  conversationId: string | null = null;
  messages: any[] = [];
  newMessage: string = '';
  otherPartyName: string = '';
  currentUserId: string = '';
  socketConnected: boolean = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private socket: Socket,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.conversationId = this.route.snapshot.paramMap.get('id');
    console.log('ChatPage initialized with conversationId:', this.conversationId);
    if (this.conversationId) {
      this.connectSocket();
      this.loadMessages();
      this.loadUserInfo();
    } else {
      this.showAlert('Erreur', 'ID de conversation manquant');
    }
  }

  ngOnDestroy() {
    this.socket.disconnect();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private connectSocket() {
    this.socket.connect();
    this.socketConnected = true;

    this.socket.fromEvent('connect').subscribe(() => {
      console.log('Socket connected');
      this.socket.emit('join_conversation', { conversationId: this.conversationId });
    });

    this.socket.fromEvent('new_message').subscribe((message: any) => {
      if (message.conversationId === this.conversationId) {
        this.messages.push(message);
        this.scrollToBottom();
      }
    });

    this.socket.fromEvent('new_document').subscribe((document: any) => {
      if (document.conversationId === this.conversationId) {
        this.messages.push({
          id: document.documentId,
          conversationId: document.conversationId,
          senderId: document.senderId,
          senderName: document.senderName,
          content: `Document: ${document.title}`,
          type: 'document',
          timestamp: document.timestamp
        });
        this.scrollToBottom();
      }
    });

    this.socket.fromEvent('disconnect').subscribe(() => {
      console.log('Socket disconnected');
      this.socketConnected = false;
    });
  }

  private loadUserInfo() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.currentUserId = profile.user_id;
        this.authService.getConversations().subscribe({
          next: (conversations) => {
            const conversation = conversations.find((conv: any) => conv.id === this.conversationId);
            this.otherPartyName = conversation ? conversation.otherPartyName || 'Inconnu' : 'Inconnu';
          },
          error: (error) => {
            console.error('Error loading conversations:', error);
            this.showToast('Erreur lors du chargement des conversations');
          }
        });
      },
      error: (error) => {
        console.error('Error loading user info:', error);
        this.showToast('Erreur lors du chargement des informations utilisateur');
      }
    });
  }

  private loadMessages() {
    if (!this.conversationId) return;

    this.authService.getMessages(this.conversationId).subscribe({
      next: (messages) => {
        this.messages = messages || [];
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.showToast('Erreur lors du chargement des messages');
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.conversationId) return;

    this.authService.sendMessage(this.conversationId, this.newMessage).subscribe({
      next: () => {
        this.newMessage = '';
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.showToast('Erreur lors de l\'envoi du message');
      }
    });
  }

  uploadDocument(event: any) {
    if (!this.conversationId) return;

    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);
    formData.append('conversationId', this.conversationId);

    this.authService.uploadDocument(formData).subscribe({
      next: () => {
        this.showToast('Document envoyé avec succès');
      },
      error: (error) => {
        console.error('Error uploading document:', error);
        this.showToast('Erreur lors de l\'envoi du document');
      }
    });
  }

  downloadDocument(message: any) {
    if (message.type !== 'document') return;

    this.authService.downloadDocument(message.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document_${message.id}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading document:', error);
        this.showToast('Erreur lors du téléchargement du document');
      }
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }

  async showAlert(title: string, message: string) {
    const alert = await this.alertCtrl.create({
      header: title,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }

  goToProfileOrLogin() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/user-profile']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}