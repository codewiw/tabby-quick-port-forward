import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrModule } from 'ngx-toastr'
import TabbyCoreModule, { ConfigProvider, ToolbarButtonProvider, TranslateService, AppService } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'

import { QuickPortForwardConfigProvider } from './config'
import { QuickPortForwardToolbarButtonProvider } from './toolbar-button.provider'
import { QuickPortForwardSettingsComponent, QuickPortForwardSettingsTabProvider } from './components/settings.component'
import { QuickPortForwardModalComponent } from './components/forward-modal.component'
import { QuickForwardIconComponent } from './components/icon-view.component'
import { QuickPortForwardService } from './services/forward.service'
import { TRANSLATIONS } from './translations'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        NgbModule,
        ToastrModule,
        TabbyCoreModule,
    ],
    declarations: [
        QuickForwardIconComponent,
        QuickPortForwardModalComponent,
        QuickPortForwardSettingsComponent,
    ],
    entryComponents: [
        QuickPortForwardModalComponent,
        QuickPortForwardSettingsComponent,
    ],
    providers: [
        { provide: ConfigProvider, useClass: QuickPortForwardConfigProvider, multi: true },
        { provide: SettingsTabProvider, useClass: QuickPortForwardSettingsTabProvider, multi: true },
        { provide: ToolbarButtonProvider, useClass: QuickPortForwardToolbarButtonProvider, multi: true },
        QuickPortForwardService,
    ],
})
export default class QuickPortForwardModule {
    constructor(
        app: AppService,
        ngbModal: NgbModal,
        translate: TranslateService,
        forwardService: QuickPortForwardService,
    ) {
        // Register Portuguese and English translations
        for (const [lang, trans] of Object.entries(TRANSLATIONS)) {
            translate.setTranslation(lang, trans, true)
        }

        const openEnhancedModal = (session: any) => {
            if (!session) return
            const modal = ngbModal.open(QuickPortForwardModalComponent, { size: 'lg' })
            modal.componentInstance.session = session
        }

        // Hook function to patch SSH tab instances and their prototypes
        const hookSshTab = (tab: any) => {
            if (!tab) return

            // Patch instance
            if (tab.showPortForwarding && !tab.__qpf_patched) {
                tab.__qpf_patched = true
                const orig = tab.showPortForwarding.bind(tab)
                tab.showPortForwarding = function() {
                    const session = tab.sshSession || (tab.session && tab.session.forwardedPorts !== undefined ? tab.session : null)
                    if (session) {
                        openEnhancedModal(session)
                        return
                    }
                    return orig()
                }
            }

            // Patch prototype once
            const proto = Object.getPrototypeOf(tab)
            if (proto && proto.showPortForwarding && !proto.__qpf_proto_patched) {
                proto.__qpf_proto_patched = true
                const origProto = proto.showPortForwarding
                proto.showPortForwarding = function() {
                    const session = this.sshSession || (this.session && this.session.forwardedPorts !== undefined ? this.session : null)
                    if (session) {
                        openEnhancedModal(session)
                        return
                    }
                    return origProto.apply(this, arguments)
                }
            }
        }

        // Hook existing tabs
        if (Array.isArray(app.tabs)) {
            app.tabs.forEach(tab => hookSshTab(tab))
        }

        // Hook new tabs as they open
        if (app.tabOpened$) {
            app.tabOpened$.subscribe(tab => {
                setTimeout(() => hookSshTab(tab), 150)
            })
        }
    }
}
