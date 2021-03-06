import { SpinnerClient } from '@swagger/spinner';
import { makeInputWithBtn, makeDiv } from '../view';
import { Page } from '../page';
import { GuestService } from './guest.service';
import { Credentials } from '../credentials';
import { Logger } from '../logger';
import { ConversationModule } from '../conversation/conversation.module';
import { BoardModule } from '../board/board.module';
import { CallModule } from '../call/call.module';
import { Session } from '../../../../dist';

export class GuestModule {
  private inner: JQuery;
  private guestService: GuestService;
  private credentials: Credentials;

  public init = async (credentials: Credentials, spinnerClient: SpinnerClient): Promise<void> => {
    this.guestService = new GuestService(spinnerClient);
    this.credentials = credentials;

    if (this.credentials.isGuestSessionSaved()) {
      await this.orgCallback(this.credentials.orgId, false);
    } else {
      this.renderInputs();
    }
  }

  public toggleVisible = (visible = true): void => {
    if (visible) {
      if (this.inner) {
        this.inner.show();
      }
    }
    else {
      if (this.inner) {
        this.inner.hide();
      }
    }
  }

  private orgCallback = async (orgId: string, isNewSession = true): Promise<void> => {
    try {
      if (!isNewSession) {
        const {session, roomId} = await this.guestService.getExistingGuestSession(this.credentials);

        await this.initializeBoard(session, roomId);
      } else {
        const {leadCtx, session} = await this.guestService.getNewGuestSession(orgId, this.credentials);
        this.credentials.setGuestCtx(leadCtx.id, leadCtx.orgId, leadCtx.apiKey);

        await this.initializeBoard(session, leadCtx.roomId);
      }
    } catch (e) {
      Logger.error(e);
    }
  }

  private initializeBoard = async (session: Session, roomId: string): Promise<void> => {
    Page.contents.empty();
    const boardModule = new BoardModule(this.credentials, session, this.guestService.spinnerClient);
    const conversationModule = new ConversationModule(boardModule, this.credentials, roomId);
    const callModule = new CallModule(boardModule, this.credentials);

    boardModule.init([conversationModule, callModule], conversationModule);
  }

  private renderInputs = (): void => {
    const orgInput = makeInputWithBtn(Page.orgInputId, this.orgCallback, 'Get org guest profile', 'Org id...', 'b4aea823-cf75-470c-8d0e-6e31407ade87');

    this.inner = makeDiv().append(orgInput);

    Page.contents.empty();
    Page.contents.append(this.inner);
  }
}
