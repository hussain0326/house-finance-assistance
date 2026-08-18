import { TestBed } from '@angular/core/testing';
import { AssistantPageComponent } from './assistant-page.component';
import { AssistantService } from '../../services/assistant.service';

describe('AssistantPageComponent', () => {
  let assistantService: any;

  beforeEach(async () => {
    assistantService = {
      sendMessage: jasmine.createSpy('sendMessage').and.resolveTo({
        success: true,
        message: 'You spent 42.00 on Clothing.',
        conversationId: 'conversation-1'
      })
    };

    await TestBed.configureTestingModule({
      imports: [AssistantPageComponent],
      providers: [{ provide: AssistantService, useValue: assistantService }]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AssistantPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should send a message and append the assistant reply', async () => {
    const fixture = TestBed.createComponent(AssistantPageComponent);
    const component = fixture.componentInstance;

    component.onDraftChange('How much did I spend on Clothing?');
    await component.send();

    expect(assistantService.sendMessage).toHaveBeenCalledWith('How much did I spend on Clothing?', null);
    const messages = component.messages();
    expect(messages.at(-1)?.content).toBe('You spent 42.00 on Clothing.');
  });

  it('should send a suggested prompt directly', async () => {
    const fixture = TestBed.createComponent(AssistantPageComponent);
    const component = fixture.componentInstance;

    component.usePrompt('How much did I spend this month?');
    await Promise.resolve();

    expect(assistantService.sendMessage).toHaveBeenCalledWith('How much did I spend this month?', null);
  });

  it('should reset the conversation on new chat', async () => {
    const fixture = TestBed.createComponent(AssistantPageComponent);
    const component = fixture.componentInstance;

    component.onDraftChange('Question');
    await component.send();
    component.startNewChat();

    expect(component.messages().length).toBe(1);
    expect(component.messages()[0].role).toBe('assistant');
  });
});
