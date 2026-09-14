import { NgModule, Injectable } from '@angular/core'
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
        // Register translations
        for (const [lang, trans] of Object.entries(TRANSLATIONS)) {
            translate.setTranslation(lang, trans, true)
        }

        // Patch SSH Tab's native "showPortForwarding" method so clicking "Ports" opens our modal!
        const hookSshTab = (tab: any) => {
            if (!tab) return
            if (tab.showPortForwarding && !tab.__qpf_patched) {
                tab.__qpf_patched = true
                const originalShowPortForwarding = tab.showPortForwarding.bind(tab)
                tab.showPortForwarding = function() {
                    try {
                        const session = tab.sshSession || (tab.session && tab.session.forwardedPorts !== undefined ? tab.session : null)
                        if (session) {
                            const modal = ngbModal.open(QuickPortForwardModalComponent, { size: 'lg' })
                            modal.componentInstance.session = session
                            return
                        }
                    } catch (err) {
                        console.error('[QuickPortForward] Failed to open enhanced modal:', err)
                    }
                    return originalShowPortForwarding()
                }
            }
        }

        // Hook existing and new tabs
        if (Array.isArray(app.tabs)) {
            app.tabs.forEach(tab => hookSshTab(tab))
        }
        if (app.tabOpened$) {
            app.tabOpened$.subscribe(tab => {
                setTimeout(() => hookSshTab(tab), 100)
            })
        }
    }
}
