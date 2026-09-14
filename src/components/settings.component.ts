import { Component, Injectable } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import { ToastrService } from 'ngx-toastr'
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
                <h3 class="m-0" translate>Port Forwarding Presets</h3>
                <div class="text-muted small" translate>Manage reusable SSH port forwarding presets with custom service icons.</div>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-primary" [disabled]="loadingPresets" (click)="downloadPresets()">
                    <i class="fas fa-cloud-download-alt me-1" [class.fa-spin]="loadingPresets"></i>
                    <span translate>Download from GitHub</span>
                </button>
                <button class="btn btn-outline-secondary" (click)="newPreset()">
                    <i class="fas fa-plus me-1"></i>
                    <span translate>Add Preset</span>
                </button>
            </div>
        </div>

        <!-- Presets GitHub URL configuration -->
        <div class="card mb-4 bg-dark-subtle border-secondary">
            <div class="card-body">
                <div class="row g-3 align-items-center">
                    <div class="col-md-3">
                        <label class="form-label fw-bold mb-0" translate>GitHub Presets URL</label>
                        <div class="small text-muted" translate>URL to raw presets.json catalog</div>
                    </div>
                    <div class="col-md-9">
                        <div class="input-group">
                            <input type="text" class="form-control font-monospace" 
                                   [(ngModel)]="config.store.plugin.quickPortForward.presetsUrl" 
                                   (change)="saveConfig()">
                            <button class="btn btn-outline-secondary" (click)="resetUrl()">
                                <i class="fas fa-undo me-1"></i>
                                <span translate>Default</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Preset Editor Form (when editing or creating) -->
        <div class="card mb-4 border-primary" *ngIf="editingPreset">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <span class="fw-bold">{{ isNewPreset ? 'Create New Preset' : 'Edit Preset: ' + editingPreset.name }}</span>
                <button type="button" class="btn-close btn-close-white" (click)="cancelEdit()"></button>
            </div>
            <div class="card-body">
                <div class="row g-3 mb-3">
                    <div class="col-md-4">
                        <label class="form-label small fw-bold" translate>Service Name</label>
                        <input type="text" class="form-control" [(ngModel)]="editingPreset.name" placeholder="e.g. PostgreSQL">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold" translate>Category</label>
                        <input type="text" class="form-control" [(ngModel)]="editingPreset.category" placeholder="Database, Telephony, etc.">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold" translate>Forward Type</label>
                        <select class="form-select" [(ngModel)]="editingPreset.type">
                            <option value="local">Local</option>
                            <option value="remote">Remote</option>
                            <option value="dynamic">Dynamic (SOCKS)</option>
                        </select>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-md-4">
                        <label class="form-label small fw-bold" translate>Local Bind Host</label>
                        <input type="text" class="form-control font-monospace" [(ngModel)]="editingPreset.localHost" placeholder="127.0.0.1">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold" translate>Local Port</label>
                        <input type="number" class="form-control font-monospace" [(ngModel)]="editingPreset.localPort" placeholder="5432">
                    </div>
                    <div class="col-md-4" *ngIf="editingPreset.type !== 'dynamic'">
                        <label class="form-label small fw-bold" translate>Target Host & Port</label>
                        <div class="input-group">
                            <input type="text" class="form-control font-monospace" [(ngModel)]="editingPreset.targetAddress" placeholder="127.0.0.1">
                            <span class="input-group-text">:</span>
                            <input type="number" class="form-control font-monospace" [(ngModel)]="editingPreset.targetPort" placeholder="5432">
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold" translate>Description</label>
                    <input type="text" class="form-control" [(ngModel)]="editingPreset.description" placeholder="Brief description of this service">
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold" translate>Service Icon (SVG Code or FontAwesome class)</label>
                    <div class="input-group mb-2">
                        <input type="text" class="form-control font-monospace" [(ngModel)]="editingPreset.icon" placeholder='<svg...> or "fas fa-database"'>
                        <span class="input-group-text">
                            <quick-forward-icon [icon]="editingPreset.icon || ''" [size]="20"></quick-forward-icon>
                        </span>
                    </div>
                    <small class="text-muted">Tip: Paste SVG code or use FontAwesome classes like <code>fas fa-database</code>, <code>fas fa-server</code>, <code>fas fa-phone</code>, <code>fas fa-cubes</code>.</small>
                </div>

                <div class="d-flex justify-content-end gap-2 pt-2 border-top">
                    <button class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
                    <button class="btn btn-primary" (click)="saveEdit()">Save Preset</button>
                </div>
            </div>
        </div>

        <!-- Presets List -->
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span class="fw-bold">
                    <span translate>Configured Presets</span> ({{ presets.length }})
                </span>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-secondary" (click)="exportJson()">
                        <i class="fas fa-file-export me-1"></i>
                        <span translate>Export JSON</span>
                    </button>
                    <label class="btn btn-sm btn-outline-secondary mb-0">
                        <i class="fas fa-file-import me-1"></i>
                        <span translate>Import JSON</span>
                        <input type="file" accept=".json" class="d-none" (change)="importJson($event)">
                    </label>
                </div>
            </div>

            <!-- Empty State -->
            <div *ngIf="presets.length === 0" class="card-body text-center py-5 text-muted">
                <i class="fas fa-cubes fa-3x mb-3 text-secondary opacity-50"></i>
                <p class="mb-3" translate>No presets configured yet. Download the official catalog or create your own.</p>
                <button class="btn btn-primary" [disabled]="loadingPresets" (click)="downloadPresets()">
                    <i class="fas fa-cloud-download-alt me-1" [class.fa-spin]="loadingPresets"></i>
                    <span translate>Download Presets from GitHub</span>
                </button>
            </div>

            <!-- List -->
            <ul class="list-group list-group-flush" *ngIf="presets.length > 0">
                <li *ngFor="let p of presets; let i = index" class="list-group-item d-flex align-items-center justify-content-between p-3">
                    <div class="d-flex align-items-center flex-grow-1 me-3">
                        <div class="preset-icon-box me-3">
                            <quick-forward-icon [icon]="p.icon || ''" [size]="28"></quick-forward-icon>
                        </div>
                        <div>
                            <div class="d-flex align-items-center">
                                <strong class="me-2">{{ p.name }}</strong>
                                <span class="badge bg-secondary me-2" *ngIf="p.category">{{ p.category }}</span>
                                <span class="badge bg-dark-subtle border text-uppercase" style="font-size: 10px">{{ p.type }}</span>
                            </div>
                            <div class="font-monospace small text-muted mt-1">
                                {{ p.localHost || '127.0.0.1' }}:{{ p.localPort }} &rarr; {{ p.targetAddress }}:{{ p.targetPort }}
                            </div>
                            <div class="small text-muted" *ngIf="p.description">{{ p.description }}</div>
                        </div>
                    </div>

                    <div class="d-flex align-items-center gap-1">
                        <button class="btn btn-sm btn-link text-muted" [disabled]="i === 0" (click)="movePreset(i, -1)" title="Move up">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <button class="btn btn-sm btn-link text-muted" [disabled]="i === presets.length - 1" (click)="movePreset(i, 1)" title="Move down">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary ms-2" (click)="editPreset(p)" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" (click)="duplicatePreset(p)" title="Duplicate">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" (click)="deletePreset(i)" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </li>
            </ul>
        </div>
    `,
    styles: [`
        .preset-icon-box {
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
        }
    `]
})
export class QuickPortForwardSettingsComponent {
    loadingPresets = false
    editingPreset: PortForwardPreset | null = null
    isNewPreset = false

    constructor(
        public config: ConfigService,
        private forwardService: QuickPortForwardService,
        private toastr: ToastrService
    ) {}

    get presets(): PortForwardPreset[] {
        return this.config.store?.plugin?.quickPortForward?.presets || []
    }

    saveConfig(): void {
        this.config.save()
    }

    resetUrl(): void {
        this.config.store.plugin.quickPortForward.presetsUrl = 'https://raw.githubusercontent.com/codewiw/tabby-quick-port-forward/main/presets.json'
        this.saveConfig()
    }

    newPreset(): void {
        this.isNewPreset = true
        this.editingPreset = {
            id: Date.now().toString(),
            name: '',
            category: 'Database',
            type: 'local',
            localHost: '127.0.0.1',
            localPort: 8080,
            targetAddress: '127.0.0.1',
            targetPort: 8080,
            description: '',
            icon: 'fas fa-plug',
        }
    }

    editPreset(preset: PortForwardPreset): void {
        this.isNewPreset = false
        this.editingPreset = JSON.parse(JSON.stringify(preset))
    }

    duplicatePreset(preset: PortForwardPreset): void {
        const copy: PortForwardPreset = JSON.parse(JSON.stringify(preset))
        copy.id = Date.now().toString()
        copy.name += ' (Copy)'
        copy.localPort += 1
        const list = [...this.presets, copy]
        this.forwardService.savePresets(list)
        this.toastr.info('Preset duplicated')
    }

    cancelEdit(): void {
        this.editingPreset = null
        this.isNewPreset = false
    }

    saveEdit(): void {
        if (!this.editingPreset) return
        if (!this.editingPreset.name.trim()) {
            this.toastr.warning('Please enter a preset name')
            return
        }
        if (!this.editingPreset.localPort) {
            this.toastr.warning('Please enter a local port')
            return
        }

        const current = [...this.presets]
        if (this.isNewPreset) {
            current.push(this.editingPreset)
        } else {
            const idx = current.findIndex(p => p.id === this.editingPreset!.id)
            if (idx !== -1) {
                current[idx] = this.editingPreset
            }
        }

        this.forwardService.savePresets(current)
        this.toastr.success('Preset saved successfully!')
        this.cancelEdit()
    }

    deletePreset(index: number): void {
        const current = [...this.presets]
        current.splice(index, 1)
        this.forwardService.savePresets(current)
        this.toastr.info('Preset removed')
    }

    movePreset(index: number, delta: number): void {
        const current = [...this.presets]
        const target = index + delta
        if (target < 0 || target >= current.length) return
        const [moved] = current.splice(index, 1)
        current.splice(target, 0, moved)
        this.forwardService.savePresets(current)
    }

    async downloadPresets(): Promise<void> {
        this.loadingPresets = true
        try {
            const downloaded = await this.forwardService.fetchPresetsFromGitHub()
            const current = [...this.presets]
            let count = 0
            for (const p of downloaded) {
                if (!current.some(c => c.id === p.id)) {
                    current.push(p)
                    count++
                }
            }
            this.forwardService.savePresets(current)
            this.toastr.success(`Successfully downloaded ${count} new presets!`)
        } catch (err: any) {
            this.toastr.error(`Failed to download presets: ${err.message || err}`)
        } finally {
            this.loadingPresets = false
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
                    this.toastr.success(`Imported ${count} presets successfully!`)
                }
            } catch (err: any) {
                this.toastr.error('Invalid JSON file format')
            }
        }
        reader.readAsText(file)
        event.target.value = ''
    }
}
