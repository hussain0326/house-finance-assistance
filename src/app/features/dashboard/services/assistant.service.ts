import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export type AssistantChatResult = {
  success: boolean;
  message: string;
  conversationId?: string;
};

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async sendMessage(message: string, conversationId: string | null): Promise<AssistantChatResult> {
    const { data, error } = await this.supabaseService.client.functions.invoke('ai-assistant', {
      body: { message, conversationId }
    });

    if (error) {
      const details = await this.readFunctionError(error);
      return {
        success: false,
        message: details ? `The assistant could not respond: ${details}` : 'The assistant could not respond.'
      };
    }

    return {
      success: true,
      message: data?.reply ?? 'I could not find an answer for that.',
      conversationId: data?.conversationId
    };
  }

  private async readFunctionError(error: { message?: string; context?: Response }): Promise<string> {
    const response = error.context;
    if (response) {
      try {
        const payload = (await response.clone().json()) as { error?: string; message?: string };
        const responseMessage = payload.error ?? payload.message;
        if (responseMessage) {
          return responseMessage;
        }
      } catch {
        // Fall back to the SDK error when the function did not return JSON.
      }
    }

    return error.message?.trim() ?? '';
  }
}
