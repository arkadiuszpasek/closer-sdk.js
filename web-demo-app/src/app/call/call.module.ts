import { makeInputWithBtn } from '../view';
import { Session } from '@closerplatform/closer-sdk';
import { Page } from '../page';
import { CallService } from './call.service';
import { SpinnerClient } from '@swagger/spinner';
import { ModuleNames } from '../board/board.module';
import { SubModule } from '../board/submodule';

export class CallModule extends SubModule {
  public readonly NAME = ModuleNames.call;
  private callService: CallService;

  public init = async (session: Session, spinnerClient: SpinnerClient): Promise<void> => {
    this.callService = new CallService(session, spinnerClient);
    this.render();
  }

  protected onShow = (): Promise<void> => {
    const calleeID = this.credentials.calleeId || '';
    $(`#${Page.calleeInputId}`).val(calleeID);

    return Promise.resolve();
  }

  private onCallClick = async (calleeId: string): Promise<void> => {
    await this.callService.callToUser(calleeId, this.credentials);
  }

  private render = (): void => {
    this.inner = makeInputWithBtn(Page.calleeId, this.onCallClick, 'Call', 'Callee id...', '');
    Page.contents.append(this.inner);
  }
}
