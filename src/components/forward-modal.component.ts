import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrService } from 'ngx-toastr'
import { QuickPortForwardService, PortForwardType, ForwardedPortConfig } from '../services/forward.service'
import { PortForwardPreset } from '../types'

@Component({
    selector: 'quick-port-forward-modal',
    template: `
        <div class="modal-header">
            <div class="d-flex align-items-center">
                <i class="fas fa-network-wired me-2 text-primary"></i>
                <h5 class="m-0" translate>Quick Port Forward</h5>
            </div>
            <div class="ms-auto d-flex align-items-center">
                <span class="badge bg-secondary me-3" *ngIf="sessionHost">
                    <i class="fas fa-server me-1"></i> {{ sessionHost }}
                </span>
                <button type="button" class="btn-close" (click)="activeModal.close()"></button>
            </div>
        </div>

        <div class="modal-body">
            <!-- Tabs / Navigation -->
            <ul class="nav nav-tabs mb-3">
                <li class="nav-item">
                    <a class="nav-link" [class.active]="activeTab === 'presets'" (click)="activeTab = 'presets'">
                        <i class="fas fa-bolt me-1 text-warning"></i>
                        <span translate>Quick Presets</span>
                        <span class="badge bg-secondary ms-1">{{ presets.length }}</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" [class.active]="activeTab === 'active'" (click)="activeTab = 'active'">
                        <i class="fas fa-plug me-1 text-success"></i>
                        <span translate>Active Tunnels</span>
                        <span class="badge bg-success ms-1" *ngIf="activeForwards.length">{{ activeForwards.length }}</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" [class.active]="activeTab === 'custom'" (click)="activeTab = 'custom'">
                        <i class="fas fa-plus-circle me-1"></i>
                        <span translate>Custom Forward</span>
                    </a>
                </li>
            </ul>

            <!-- 1. PRESETS TAB -->
            <div *ngIf="activeTab === 'presets'">
                <!-- Empty State -->
                <div *ngIf="presets.length === 0" class="text-center py-4 text-muted">
                    <i class="fas fa-inbox fa-3x mb-3 text-secondary opacity-50"></i>
                    <p class="mb-3" translate>No presets configured yet.</p>
                    <button class="btn btn-primary me-2" [disabled]="loadingPresets" (click)="downloadPresets()">
                        <i class="fas fa-cloud-download-alt me-1" [class.fa-spin]="loadingPresets"></i>
                        <span translate>Download Presets from GitHub</span>
                    </button>
                    <button class="btn btn-secondary" (click)="activeTab = 'custom'">
                        <i class="fas fa-plus me-1"></i>
                        <span translate>Create Custom</span>
                    </button>
                </div>

                <!-- Presets List -->
                <div *ngIf="presets.length > 0">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted" translate>Click on any service to start or stop the tunnel.</small>
                        <button class="btn btn-sm btn-link text-decoration-none" [disabled]="loadingPresets" (click)="downloadPresets()">
                            <i class="fas fa-sync-alt me-1" [class.fa-spin]="loadingPresets"></i>
                            <span translate>Update from GitHub</span>
                        </button>
                    </div>

                    <div class="list-group">
                        <div *ngFor="let preset of presets" 
                             class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3"
                             [class.list-group-item-success]="isForwarded(preset)">
                            <div class="d-flex align-items-center flex-grow-1 me-3">
                                <div class="preset-icon-box me-3">
                                    <quick-forward-icon [icon]="preset.icon" [size]="28"></quick-forward-icon>
                                </div>
                                <div>
                                    <div class="d-flex align-items-center">
                                        <strong class="me-2">{{ preset.name }}</strong>
                                        <span class="badge bg-secondary" *ngIf="preset.category">{{ preset.category }}</span>
                                    </div>
                                    <div class="small text-muted font-monospace mt-1">
                                        {{ preset.localHost || '127.0.0.1' }}:{{ preset.localPort }} &rarr; {{ preset.targetAddress }}:{{ preset.targetPort }}
                                    </div>
                                    <div class="small text-muted" *ngIf="preset.description">{{ preset.description }}</div>
                                </div>
                            </div>

                            <div class="d-flex align-items-center">
                                <span class="badge bg-success me-3" *ngIf="isForwarded(preset)">
                                    <i class="fas fa-check-circle me-1"></i> Active
                                </span>
                                <button class="btn" 
                                        [class.btn-success]="!isForwarded(preset)"
                                        [class.btn-outline-danger]="isForwarded(preset)"
                                        [disabled]="busyPresets.has(preset.id)"
                                        (click)="togglePreset(preset)">
                                    <i class="fas fa-spinner fa-spin me-1" *ngIf="busyPresets.has(preset.id)"></i>
                                    <i class="fas fa-play me-1" *ngIf="!isForwarded(preset) && !busyPresets.has(preset.id)"></i>
                                    <i class="fas fa-stop me-1" *ngIf="isForwarded(preset) && !busyPresets.has(preset.id)"></i>
                                    <span>{{ isForwarded(preset) ? 'Stop' : 'Forward' }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. ACTIVE TUNNELS TAB -->
            <div *ngIf="activeTab === 'active'">
                <div *ngIf="activeForwards.length === 0" class="text-center py-4 text-muted">
                    <i class="fas fa-plug-circle-xmark fa-3x mb-3 text-secondary opacity-50"></i>
                    <p translate>No active tunnels on this session.</p>
                    <button class="btn btn-primary btn-sm" (click)="activeTab = 'presets'">
                        <i class="fas fa-bolt me-1"></i>
                        <span translate>Explore Presets</span>
                    </button>
                </div>

                <div class="list-group" *ngIf="activeForwards.length > 0">
                    <div *ngFor="let fw of activeForwards" class="list-group-item d-flex align-items-center justify-content-between">
                        <div>
                            <div class="d-flex align-items-center">
                                <span class="badge bg-primary me-2">{{ fw.type }}</span>
                                <strong class="font-monospace">{{ fw.host }}:{{ fw.port }}</strong>
                                <span class="mx-2">&rarr;</span>
                                <span class="font-monospace" *ngIf="fw.type !== PortForwardType.Dynamic">{{ fw.targetAddress }}:{{ fw.targetPort }}</span>
                                <span class="badge bg-info ms-2" *ngIf="fw.type === PortForwardType.Dynamic">SOCKS Proxy</span>
                            </div>
                            <small class="text-muted" *ngIf="fw.description">{{ fw.description }}</small>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" (click)="stopForward(fw)">
                            <i class="fas fa-stop me-1"></i>
                            <span translate>Stop</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 3. CUSTOM FORWARD TAB -->
            <div *ngIf="activeTab === 'custom'">
                <div class="mb-3">
                    <label class="form-label fw-bold" translate>Forward Type</label>
                    <div class="btn-group w-100">
                        <input type="radio" class="btn-check" id="fwTypeLocal" name="customFwType" [value]="PortForwardType.Local" [(ngModel)]="customFw.type">
                        <label class="btn btn-outline-secondary" for="fwTypeLocal">Local</label>

                        <input type="radio" class="btn-check" id="fwTypeRemote" name="customFwType" [value]="PortForwardType.Remote" [(ngModel)]="customFw.type">
                        <label class="btn btn-outline-secondary" for="fwTypeRemote">Remote</label>

                        <input type="radio" class="btn-check" id="fwTypeDynamic" name="customFwType" [value]="PortForwardType.Dynamic" [(ngModel)]="customFw.type">
                        <label class="btn btn-outline-secondary" for="fwTypeDynamic">Dynamic (SOCKS)</label>
                    </div>
                </div>

                <!-- Host & Port inputs -->
                <div class="row g-2 mb-3" *ngIf="customFw.type !== PortForwardType.Dynamic">
                    <div class="col-6">
                        <label class="form-label small text-muted" translate>Local Bind Address & Port</label>
                        <div class="input-group">
                            <input type="text" class="form-control font-monospace" [(ngModel)]="customFw.host" placeholder="127.0.0.1">
                            <span class="input-group-text">:</span>
                            <input type="number" class="form-control font-monospace" [(ngModel)]="customFw.port" placeholder="Port">
                        </div>
                    </div>
                    <div class="col-6">
                        <label class="form-label small text-muted" translate>Target Host & Port</label>
                        <div class="input-group">
                            <input type="text" class="form-control font-monospace" [(ngModel)]="customFw.targetAddress" placeholder="127.0.0.1">
                            <span class="input-group-text">:</span>
                            <input type="number" class="form-control font-monospace" [(ngModel)]="customFw.targetPort" placeholder="Port">
                        </div>
                    </div>
                </div>

                <div class="mb-3" *ngIf="customFw.type === PortForwardType.Dynamic">
                    <label class="form-label small text-muted" translate>SOCKS Bind Address & Port</label>
                    <div class="input-group">
                        <input type="text" class="form-control font-monospace" [(ngModel)]="customFw.host" placeholder="127.0.0.1">
                        <span class="input-group-text">:</span>
                        <input type="number" class="form-control font-monospace" [(ngModel)]="customFw.port" placeholder="1080">
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label small text-muted" translate>Description (Optional)</label>
                    <input type="text" class="form-control" [(ngModel)]="customFw.description" placeholder="e.g. Production Redis Tunnel">
                </div>

                <div class="d-flex align-items-center justify-content-between pt-2 border-top">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="saveAsPresetCheck" [(ngModel)]="saveAsPreset">
                        <label class="form-check-label" for="saveAsPresetCheck" translate>
                            Save as reusable preset
                        </label>
                    </div>
                    <button class="btn btn-primary" (click)="addCustomForward()">
                        <i class="fas fa-check me-1"></i>
                        <span translate>Forward port</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="modal-footer d-flex justify-content-between">
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="openSettings()">
                <i class="fas fa-cog me-1"></i>
                <span translate>Manage Presets</span>
            </button>
            <button type="button" class="btn btn-secondary" (click)="activeModal.close()">
                <span translate>Close</span>
            </button>
        </div>
    `,
    styles: [`
        .preset-icon-box {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
        }
        .list-group-item-action {
            cursor: pointer;
            transition: background 0.15s ease-in-out;
        }
    `]
})
export class QuickPortForwardModalComponent implements OnInit {
    @Input() session: any = null
    activeTab: 'presets' | 'active' | 'custom' = 'presets'
    busyPresets = new Set<string>()
    loadingPresets = false
    PortForwardType = PortForwardType

    customFw: ForwardedPortConfig = {
        type: PortForwardType.Local,
        host: '127.0.0.1',
        port: 8080,
        targetAddress: '127.0.0.1',
        targetPort: 80,
        description: '',
    }
    saveAsPreset = false

    constructor(
        public activeModal: NgbActiveModal,
        private forwardService: QuickPortForwardService,
        private toastr: ToastrService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        if (!this.session) {
            this.session = this.forwardService.getActiveSSHSession()
        }
        if (this.presets.length === 0 && this.activeForwards.length > 0) {
            this.activeTab = 'active'
        }
    }

    get sessionHost(): string {
        if (!this.session) return ''
        const p = this.session.profile || this.session.options
        if (p) return `${p.user ? p.user + '@' : ''}${p.host || ''}`
        return ''
    }

    get presets(): PortForwardPreset[] {
        return this.forwardService.presets
    }

    get activeForwards(): any[] {
        return this.session?.forwardedPorts || []
    }

    isForwarded(preset: PortForwardPreset): boolean {
        return this.forwardService.isPresetForwarded(this.session, preset)
    }

    async togglePreset(preset: PortForwardPreset): Promise<void> {
        if (!this.session) {
            this.toastr.warning('No active SSH session found.')
            return
        }
        this.busyPresets.add(preset.id)
        this.cdr.markForCheck()

        try {
            const started = await this.forwardService.togglePreset(this.session, preset)
            if (started) {
                this.toastr.success(`Forwarded ${preset.name} on port ${preset.localPort}`)
            } else {
                this.toastr.info(`Stopped forward for ${preset.name}`)
            }
        } catch (err: any) {
            this.toastr.error(`Failed: ${err.message || err}`)
        } finally {
            this.busyPresets.delete(preset.id)
            this.cdr.detectChanges()
        }
    }

    async stopForward(fw: any): Promise<void> {
        try {
            await this.forwardService.removeForward(this.session, fw)
            this.toastr.info('Stopped forward')
            this.cdr.detectChanges()
        } catch (err: any) {
            this.toastr.error(`Failed to stop: ${err.message || err}`)
        }
    }

    async addCustomForward(): Promise<void> {
        if (!this.session) {
            this.toastr.warning('No active SSH session found.')
            return
        }
        if (!this.customFw.port) {
            this.toastr.warning('Please specify a local port.')
            return
        }

        try {
            await this.forwardService.addCustomForward(this.session, this.customFw)
            this.toastr.success(`Forwarded port ${this.customFw.port}`)

            if (this.saveAsPreset) {
                const newPreset: PortForwardPreset = {
                    id: Date.now().toString(),
                    name: this.customFw.description || `Port ${this.customFw.port}`,
                    type: this.customFw.type === PortForwardType.Remote ? 'remote' : (this.customFw.type === PortForwardType.Dynamic ? 'dynamic' : 'local'),
                    localHost: this.customFw.host,
                    localPort: this.customFw.port,
                    targetAddress: this.customFw.targetAddress,
                    targetPort: this.customFw.targetPort,
                    description: this.customFw.description || '',
                    icon: 'fas fa-plug',
                }
                const current = [...this.presets, newPreset]
                this.forwardService.savePresets(current)
                this.toastr.info('Saved as preset!')
            }

            this.activeTab = 'active'
            this.cdr.detectChanges()
        } catch (err: any) {
            this.toastr.error(`Failed to forward: ${err.message || err}`)
        }
    }

    async downloadPresets(): Promise<void> {
        this.loadingPresets = true
        try {
            const downloaded = await this.forwardService.fetchPresetsFromGitHub()
            // Merge without overwriting duplicate IDs
            const current = [...this.presets]
            let count = 0
            for (const p of downloaded) {
                if (!current.some(c => c.id === p.id)) {
                    current.push(p)
                    count++
                }
            }
            this.forwardService.savePresets(current)
            this.toastr.success(`Downloaded ${count} presets successfully!`)
            this.cdr.detectChanges()
        } catch (err: any) {
            this.toastr.error(`Failed to download presets: ${err.message || err}`)
        } finally {
            this.loadingPresets = false
            this.cdr.detectChanges()
        }
    }

    openSettings(): void {
        this.activeModal.close()
        // Open Tabby settings tab for quick-port-forward
        const electron = (window as any).require ? (window as any).require('electron') : null
        window.location.hash = '#/settings/quick-port-forward'
    }
}
