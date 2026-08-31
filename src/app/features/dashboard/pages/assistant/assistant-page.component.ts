import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubbleEllipsesOutline, personOutline, sendOutline, sparklesOutline, trendingUpOutline } from 'ionicons/icons';
import { AssistantService } from '../../services/assistant.service';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  time: string;
};

const SUGGESTED_PROMPTS = [
  'How much did I spend this month?',
  'What was my top spending category?',
  'How much did I spend on Groceries this year?',
  'Did my spending increase this month?'
];

const WELCOME_MESSAGE =
  'Ask me about your spending, e.g. "How much did I spend on Clothing in August?" or "What was my top category last month?"';

@Component({
  selector: 'app-assistant-page',
  imports: [CommonModule, FormsModule, IonButton, IonCard, IonCardContent, IonIcon],
  templateUrl: './assistant-page.component.html',
  styleUrl: './assistant-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssistantPageComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private readonly scrollContainer?: ElementRef<HTMLDivElement>;

  readonly suggestedPrompts = SUGGESTED_PROMPTS;
  readonly messages = signal<ChatMessage[]>([this.buildMessage('assistant', WELCOME_MESSAGE)]);
  readonly draft = signal('');
  readonly sending = signal(false);
  readonly errorMessage = signal('');

  private conversationId: string | null = null;
  private shouldScroll = false;

  constructor(private readonly assistantService: AssistantService) {
    addIcons({ chatbubbleEllipsesOutline, personOutline, sendOutline, sparklesOutline, trendingUpOutline });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  onDraftChange(value: string): void {
    this.draft.set(value);
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  usePrompt(prompt: string): void {
    this.draft.set(prompt);
    void this.send();
  }

  startNewChat(): void {
    this.conversationId = null;
    this.messages.set([this.buildMessage('assistant', WELCOME_MESSAGE)]);
    this.errorMessage.set('');
    this.draft.set('');
  }

  async send(): Promise<void> {
    const text = this.draft().trim();
    if (!text || this.sending()) {
      return;
    }

    this.messages.update((current) => [...current, this.buildMessage('user', text)]);
    this.draft.set('');
    this.sending.set(true);
    this.errorMessage.set('');
    this.shouldScroll = true;

    const result = await this.assistantService.sendMessage(text, this.conversationId);

    this.sending.set(false);
    this.shouldScroll = true;

    if (!result.success) {
      this.errorMessage.set(result.message);
      return;
    }

    this.conversationId = result.conversationId ?? this.conversationId;
    this.messages.update((current) => [...current, this.buildMessage('assistant', result.message)]);
  }

  private buildMessage(role: ChatMessage['role'], content: string): ChatMessage {
    return { role, content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  }
}
