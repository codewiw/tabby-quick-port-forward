import { Component, Injectable, OnInit } from '@angular/core'
import { ConfigService, TranslateService, NotificationsService } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import { QuickPortForwardService } from '../services/forward.service'
import { PortForwardPreset } from '../types'

@Injectable()
export class QuickPortForwardSettingsTabProvider extends SettingsTabProvider {
    id = 'quick-port-forward'
    icon = 'network-wired'
    title = 'Port Forward Presets'

    getComponentType(): any {
        return QuickPortForwardSettingsComponent
    }
}

@Component({
    template: `
        <div class="d-flex align-items-center justify-content-between mb-4">
            <div>
                <h3 class="m-0 fw-bold">{{ 'Port Forwarding Presets' | translate }}</h3>
                <div class="text-muted small">{{ 'Manage SSH port forwarding presets for 1-click access during sessions.' | translate }}</div>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary btn-sm" (click)="exportJson()">
                    <i class="fas fa-file-export me-1"></i> {{ 'Export JSON' | translate }}
                </button>
                <label class="btn btn-outline-secondary btn-sm mb-0 cursor-pointer">
                    <i class="fas fa-file-import me-1"></i> {{ 'Import JSON' | translate }}
                    <input type="file" accept=".json" class="d-none" (change)="importJson($event)">
                </label>
            </div>
        </div>

        <!-- Create / Edit Form -->
        <div class="card mb-4 border-primary bg-dark" *ngIf="editingPreset">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2 px-3">
                <span class="fw-bold">{{ isNewPreset ? ('New Preset' | translate) : (('Edit' | translate) + ': ' + editingPreset.name) }}</span>
                <button type="button" class="btn-close btn-close-white" (click)="cancelEdit()"></button>
            </div>
            <div class="card-body p-3">
                <!-- Select from catalog if new -->
                <div class="mb-3" *ngIf="isNewPreset && catalogPresets.length > 0">
                    <div class="d-flex align-items-center justify-content-between mb-1">
                        <label class="form-label small fw-bold text-light mb-0">{{ 'Fill from Official Catalog:' | translate }}</label>
                        <button type="button" 
                                class="btn btn-sm btn-link text-decoration-none py-0 px-1 text-muted" 
                                (click)="refreshCatalogFromGitHub()" 
                                [disabled]="loadingCatalog"
                                title="{{ 'Update from GitHub' | translate }}">
                            <i class="fas fa-sync-alt me-1" [class.fa-spin]="loadingCatalog"></i>
                            <small>{{ loadingCatalog ? ('Updating...' | translate) : ('Update from GitHub' | translate) }}</small>
                        </button>
                    </div>
                    <select class="form-select form-select-sm" [(ngModel)]="selectedCatalogId" (ngModelChange)="onCatalogSelect($event)">
                        <option value="">{{ 'Choose preconfigured service' | translate }} ({{ catalogPresets.length }} {{ 'available' | translate }})...</option>
                        <option *ngFor="let item of catalogPresets" [value]="item.id">
                            {{ item.name }} ({{ 'Default port' | translate }}: {{ item.localPort }})
                        </option>
                    </select>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-light">{{ 'Service Name' | translate }}</label>
                        <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light" 
                               [(ngModel)]="editingPreset.name" placeholder="ex: PostgreSQL, Redis...">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-light">{{ 'Forward Type' | translate }}</label>
                        <select class="form-select form-select-sm bg-dark border-secondary text-light" [(ngModel)]="editingPreset.type">
                            <option value="local">{{ 'Local' | translate }}</option>
                            <option value="remote">{{ 'Remote' | translate }}</option>
                            <option value="dynamic">SOCKS5</option>
                        </select>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-md-3">
                        <label class="form-label small fw-bold text-light">{{ 'Local Host' | translate }}</label>
                        <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light font-monospace" 
                               [(ngModel)]="editingPreset.localHost" placeholder="127.0.0.1">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold text-light">{{ 'Local Port' | translate }}</label>
                        <input type="number" class="form-control form-control-sm bg-dark border-secondary text-light font-monospace" 
                               [(ngModel)]="editingPreset.localPort" placeholder="5432">
                    </div>
                    <div class="col-md-6" *ngIf="editingPreset.type !== 'dynamic'">
                        <label class="form-label small fw-bold text-light">{{ 'Target Host & Port' | translate }}</label>
                        <div class="input-group input-group-sm">
                            <input type="text" class="form-control bg-dark border-secondary text-light font-monospace" 
                                   [(ngModel)]="editingPreset.targetAddress" placeholder="127.0.0.1">
                            <span class="input-group-text bg-dark border-secondary text-muted">:</span>
                            <input type="number" class="form-control bg-dark border-secondary text-light font-monospace" 
                                   [(ngModel)]="editingPreset.targetPort" placeholder="5432">
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold text-light">{{ 'Description (Optional)' | translate }}</label>
                    <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light" 
                           [(ngModel)]="editingPreset.description" placeholder="{{ 'Description (Optional)' | translate }}">
                </div>

                <!-- Icon Upload & FontAwesome Input -->
                <div class="mb-3">
                    <label class="form-label small fw-bold text-light">{{ 'Service Icon' | translate }}</label>
                    <div class="d-flex align-items-center gap-3">
                        <div class="icon-preview rounded border border-secondary p-1 d-flex align-items-center justify-content-center bg-black bg-opacity-25" 
                             style="width: 38px; height: 38px;">
                            <quick-forward-icon [icon]="editingPreset.icon || ''" [size]="24"></quick-forward-icon>
                        </div>

                        <label class="btn btn-sm btn-outline-secondary mb-0 cursor-pointer">
                            <i class="fas fa-upload me-1"></i> {{ 'Choose SVG file' | translate }}
                            <input type="file" accept=".svg,.png,.webp" class="d-none" (change)="onSvgUpload($event)">
                        </label>

                        <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light font-monospace flex-grow-1" 
                               [(ngModel)]="fontAwesomeInput" 
                               (ngModelChange)="onFontAwesomeChange($event)" 
                               placeholder="{{ 'Or enter FontAwesome (ex: fas fa-database)' | translate }}...">
                    </div>
                </div>

                <div class="d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
                    <button class="btn btn-sm btn-secondary" (click)="cancelEdit()">
                        {{ 'Cancel' | translate }}
                    </button>
                    <button class="btn btn-sm btn-primary" (click)="saveEdit()">
                        <i class="fas fa-save me-1"></i> {{ 'Save Preset' | translate }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Presets List -->
        <div class="card border-secondary bg-dark">
            <div class="card-header border-secondary py-2 px-3 d-flex justify-content-between align-items-center">
                <div class="input-group input-group-sm w-50">
                    <span class="input-group-text bg-transparent border-secondary text-muted">
                        <i class="fas fa-search"></i>
                    </span>
                    <input type="text" 
                           class="form-control bg-transparent border-secondary text-light" 
                           [(ngModel)]="searchQuery" 
                           placeholder="{{ 'Search by name or port (e.g. postgres, 5432)...' | translate }}">
                </div>
                <button class="btn btn-primary btn-sm" (click)="newPreset()" *ngIf="!editingPreset">
                    <i class="fas fa-plus me-1"></i> {{ 'New Preset' | translate }}
                </button>
            </div>

            <div class="p-4 text-center text-muted small" *ngIf="presets.length === 0">
                <i class="fas fa-network-wired fa-2x mb-2 opacity-50"></i>
                <div>{{ 'No tunnels configured yet.' | translate }}</div>
            </div>

            <ul class="list-group list-group-flush" *ngIf="presets.length > 0">
                <li *ngFor="let p of filteredPresets; let i = index" 
                    class="list-group-item bg-transparent border-secondary d-flex align-items-center justify-content-between py-2 px-3">
                    <div class="d-flex align-items-center text-truncate me-3">
                        <div class="me-3 d-flex align-items-center justify-content-center" style="width: 28px; height: 28px;">
                            <quick-forward-icon [icon]="p.icon || ''" [size]="22"></quick-forward-icon>
                        </div>
                        <div class="text-truncate">
                            <strong class="text-light fs-6">{{ p.name }}</strong>
                            <div class="font-monospace text-muted small">
                                {{ p.localHost || '127.0.0.1' }}:{{ p.localPort }} &rarr; {{ p.targetAddress }}:{{ p.targetPort }}
                                <span class="badge bg-secondary ms-2" style="font-size: 9px;">{{ p.type || 'local' }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-1 flex-shrink-0">
                        <button class="btn btn-sm btn-link text-muted py-0 px-1" [disabled]="i === 0" (click)="movePreset(i, -1)" title="{{ 'Move up' | translate }}">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <button class="btn btn-sm btn-link text-muted py-0 px-1" [disabled]="i === presets.length - 1" (click)="movePreset(i, 1)" title="{{ 'Move down' | translate }}">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary py-1 px-2 ms-2" (click)="editPreset(p)" title="{{ 'Edit' | translate }}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary py-1 px-2" (click)="duplicatePreset(p)" title="{{ 'Duplicate' | translate }}">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger py-1 px-2" (click)="deletePreset(i)" title="{{ 'Delete' | translate }}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </li>
            </ul>
        </div>
    `,
    styles: [`
        .cursor-pointer { cursor: pointer; }
    `]
})
export class QuickPortForwardSettingsComponent implements OnInit {
    searchQuery = ''
    editingPreset: PortForwardPreset | null = null
    isNewPreset = false
    fontAwesomeInput = ''
    catalogPresets: PortForwardPreset[] = []
    selectedCatalogId = ''
    loadingCatalog = false

    constructor(
        public config: ConfigService,
        private forwardService: QuickPortForwardService,
        private toastr: NotificationsService,
        private translate: TranslateService
    ) {}

    async ngOnInit(): Promise<void> {
        try {
            this.catalogPresets = await this.forwardService.getCatalogPresets()
        } catch {}
    }

    get presets(): PortForwardPreset[] {
        return this.config.store?.plugin?.quickPortForward?.presets || []
    }

    get filteredPresets(): PortForwardPreset[] {
        if (!this.searchQuery.trim()) return this.presets
        const q = this.searchQuery.toLowerCase().trim()
        return this.presets.filter(p => 
            p.name.toLowerCase().includes(q) ||
            String(p.localPort).includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        )
    }

    newPreset(): void {
        this.isNewPreset = true
        this.selectedCatalogId = ''
        this.fontAwesomeInput = ''
        this.editingPreset = {
            id: Date.now().toString(),
            name: '',
            type: 'local',
            localHost: '127.0.0.1',
            localPort: 8080,
            targetAddress: '127.0.0.1',
            targetPort: 8080,
            description: '',
            icon: 'fas fa-plug',
        }
    }

    onCatalogSelect(id: string): void {
        if (!id || !this.editingPreset) return
        const item = this.catalogPresets.find(p => p.id === id)
        if (item) {
            this.editingPreset.name = item.name
            this.editingPreset.type = item.type || 'local'
            this.editingPreset.localHost = item.localHost || '127.0.0.1'
            this.editingPreset.localPort = item.localPort
            this.editingPreset.targetAddress = item.targetAddress || '127.0.0.1'
            this.editingPreset.targetPort = item.targetPort
            this.editingPreset.description = item.description || ''
            this.editingPreset.icon = item.icon || 'fas fa-plug'
            this.fontAwesomeInput = ''
            this.toastr.info(`${this.translate.instant('Service selected.')} (${item.name})`)
        }
    }

    async refreshCatalogFromGitHub(): Promise<void> {
        this.loadingCatalog = true
        try {
            this.catalogPresets = await this.forwardService.fetchPresetsFromGitHub()
            this.toastr.notice(`${this.translate.instant('Catalog updated!')} ${this.catalogPresets.length} ${this.translate.instant('services available.')}`)
        } catch (err: any) {
            this.toastr.error(`${this.translate.instant('Failed to update from GitHub:')} ${err.message || err}`)
        } finally {
            this.loadingCatalog = false
        }
    }

    editPreset(preset: PortForwardPreset): void {
        this.isNewPreset = false
        this.editingPreset = JSON.parse(JSON.stringify(preset))
        if (preset.icon && !preset.icon.trim().startsWith('<svg')) {
            this.fontAwesomeInput = preset.icon
        } else {
            this.fontAwesomeInput = ''
        }
    }

    duplicatePreset(preset: PortForwardPreset): void {
        const copy: PortForwardPreset = JSON.parse(JSON.stringify(preset))
        copy.id = Date.now().toString()
        copy.name += ' (2)'
        copy.localPort += 1
        const list = [...this.presets, copy]
        this.forwardService.savePresets(list)
        this.toastr.info(this.translate.instant('Preset saved!'))
    }

    cancelEdit(): void {
        this.editingPreset = null
        this.isNewPreset = false
    }

    saveEdit(): void {
        if (!this.editingPreset) return
        if (!this.editingPreset.name.trim()) {
            this.toastr.notice(this.translate.instant('Please enter service name.'))
            return
        }
        if (!this.editingPreset.localPort) {
            this.toastr.notice(this.translate.instant('Please enter local port.'))
            return
        }

        const current = [...this.presets]
        if (this.isNewPreset) {
            current.push(this.editingPreset)
        } else {
            const idx = current.findIndex(p => p.id === this.editingPreset!.id)
            if (idx !== -1) current[idx] = this.editingPreset
        }

        this.forwardService.savePresets(current)
        this.toastr.notice(this.translate.instant('Preset saved!'))
        this.cancelEdit()
    }

    deletePreset(index: number): void {
        const current = [...this.presets]
        current.splice(index, 1)
        this.forwardService.savePresets(current)
        this.toastr.info(this.translate.instant('Delete'))
    }

    movePreset(index: number, delta: number): void {
        const current = [...this.presets]
        const target = index + delta
        if (target < 0 || target >= current.length) return
        const [moved] = current.splice(index, 1)
        current.splice(target, 0, moved)
        this.forwardService.savePresets(current)
    }

    onSvgUpload(event: any): void {
        const file = event.target.files && event.target.files[0]
        if (!file || !this.editingPreset) return
        const reader = new FileReader()
        reader.onload = (e: any) => {
            const content = e.target.result
            if (typeof content === 'string' && content.includes('<svg')) {
                this.editingPreset!.icon = content.substring(content.indexOf('<svg'))
                this.fontAwesomeInput = ''
                this.toastr.notice('SVG OK')
            } else {
                this.editingPreset!.icon = content
                this.fontAwesomeInput = ''
            }
        }
        if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
            reader.readAsText(file)
        } else {
            reader.readAsDataURL(file)
        }
        event.target.value = ''
    }

    onFontAwesomeChange(val: string): void {
        if (this.editingPreset && val && val.trim()) {
            this.editingPreset.icon = val.trim()
        }
    }

    exportJson(): void {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.presets, null, 2))
        const a = document.createElement('a')
        a.setAttribute('href', dataStr)
        a.setAttribute('download', 'tabby-port-forward-presets.json')
        document.body.appendChild(a)
        a.click()
        a.remove()
    }

    importJson(event: any): void {
        const file = event.target.files && event.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (e: any) => {
            try {
                const parsed = JSON.parse(e.target.result)
                if (Array.isArray(parsed)) {
                    const current = [...this.presets]
                    let count = 0
                    for (const p of parsed) {
                        if (!current.some(c => c.id === p.id)) {
                            current.push(p)
                            count++
                        }
                    }
                    this.forwardService.savePresets(current)
                    this.toastr.notice(`${count} ${this.translate.instant('Preset saved!')}`)
                }
            } catch {
                this.toastr.error('JSON Error')
            }
        }
        reader.readAsText(file)
        event.target.value = ''
    }
}
