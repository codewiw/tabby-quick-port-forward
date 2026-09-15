import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import TabbyCoreModule, { ConfigProvider, TranslateService, AppService, ConfigService } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'

import { QuickPortForwardConfigProvider } from './config'
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
        QuickPortForwardService,
    ],
})
export default class QuickPortForwardModule {
    constructor(
        app: AppService,
        ngbModal: NgbModal,
        translate: TranslateService,
        forwardService: QuickPortForwardService,
        config: ConfigService,
    ) {
        const applyTranslations = () => {
            try {
                for (const [lang, trans] of Object.entries(TRANSLATIONS)) {
                    translate.setTranslation(lang, trans, true)
                }
                const activeLang = config.store?.language || 'en-US'
                translate.use(activeLang)
            } catch (e) {
                console.error('[QuickPortForward] Translation init error:', e)
            }
        }

        // Apply on config ready with safety timeout
        config.ready$.subscribe(() => {
            setTimeout(applyTranslations, 1000)
        })

        // Also update immediately if user changes language in Tabby Settings
        config.changed$.subscribe(() => {
            const activeLang = config.store?.language || 'en-US'
            translate.use(activeLang)
        })

        const openEnhancedModal = (session: any) => {
            if (!session) return
            const modal = ngbModal.open(QuickPortForwardModalComponent, { size: 'lg' })
            modal.componentInstance.session = session
        }

        // DOM Capture-phase interception on the server's taskbar "Ports" button
        if (typeof document !== 'undefined') {
            document.addEventListener('click', (event: MouseEvent) => {
                const target = (event.target as HTMLElement)?.closest('button')
                if (!target) return

                const isPortsBtn = target.querySelector('.fa-plug') || 
                                   target.innerText?.includes('Ports') || 
                                   target.innerText?.includes('Portas')

                const isInServerBar = target.closest('terminal-toolbar') || 
                                      target.closest('ssh-tab') ||
                                      target.parentElement?.tagName.toLowerCase() === 'terminal-toolbar'

                if (isPortsBtn && isInServerBar) {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    event.stopPropagation()

                    const session = forwardService.getActiveSSHSession()
                    if (session) {
                        openEnhancedModal(session)
                    }
                }
            }, true)
        }

        // Hook for SSHTabComponent instance & prototype
        const hookTab = (tab: any) => {
            if (!tab) return
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
        }

        const walk = (t: any) => {
            if (!t) return
            if (typeof t.getAllTabs === 'function') {
                const inner = t.getAllTabs()
                if (Array.isArray(inner)) inner.forEach(walk)
            }
            hookTab(t)
        }

        if (Array.isArray(app.tabs)) {
            app.tabs.forEach(walk)
        }
        if (app.tabOpened$) {
            app.tabOpened$.subscribe(t => {
                setTimeout(() => walk(t), 200)
            })
        }
    }
}
