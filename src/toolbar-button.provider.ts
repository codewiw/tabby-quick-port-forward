import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, TranslateService } from 'tabby-core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrService } from 'ngx-toastr'
import { QuickPortForwardService } from './services/forward.service'
import { QuickPortForwardModalComponent } from './components/forward-modal.component'

@Injectable()
export class QuickPortForwardToolbarButtonProvider extends ToolbarButtonProvider {
    constructor(
        private forwardService: QuickPortForwardService,
        private ngbModal: NgbModal,
        private toastr: ToastrService,
        private translate: TranslateService
    ) {
        super()
    }

    provide(): ToolbarButton[] {
        return [{
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2V7h2v9z"/></svg>`,
            title: this.translate.instant('Quick Port Forward'),
            click: () => {
                const session = this.forwardService.getActiveSSHSession()
                if (!session) {
                    this.toastr.info(this.translate.instant('Open an SSH session first to manage port forwards.'))
                    return
                }
                const modal = this.ngbModal.open(QuickPortForwardModalComponent, { size: 'lg' })
                modal.componentInstance.session = session
            }
        }]
    }
}
