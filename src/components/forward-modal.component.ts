import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrService } from 'ngx-toastr'
import { QuickPortForwardService, PortForwardType, ForwardedPortConfig } from '../services/forward.service'
import { PortForwardPreset } from '../types'

@Component({
    selector: 'quick-port-forward-modal',
    template: `
        <div class="modal-header border-secondary">
            <div class="d-flex align-items-center">
                <i class="fas fa-network-wired text-primary me-2 fa-lg"></i>
                <div>
                    <h5 class="m-0 fw-bold" translate>Quick Port Forward</h5>
                    <small class="text-muted" *ngIf="sessionHost">
                        <i class="fas fa-server me-1"></i> {{ sessionHost }}
                    </small>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="badge bg-success bg-opacity-75 px-2 py-1" *ngIf="activeForwards.length">
                    <i class="fas fa-plug me-1"></i> {{ activeForwards.length }} {{ activeForwards.length === 1 ? 'túnel ativo' : 'túneis ativos' }}
                </span>
                <button type="button" class="btn-close btn-close-white" (click)="activeModal.close()"></button>
            </div>
        </div>

        <div class="modal-body p-3">
            <!-- Navigation Tabs -->
            <ul class="nav nav-tabs border-secondary mb-3">
                <li class="nav-item">
                    <a class="nav-link text-light cursor-pointer" [class.active]="activeTab === 'tunnels'" (click)="activeTab = 'tunnels'">
                        <i class="fas fa-bolt me-1 text-warning"></i>
                        <span translate>My Tunnels</span>
                        <span class="badge bg-secondary ms-1" *ngIf="presets.length">{{ presets.length }}</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link text-light cursor-pointer" [class.active]="activeTab === 'add'" (click)="activeTab = 'add'">
                        <i class="fas fa-plus-circle me-1 text-info"></i>
                        <span translate>Add Forward / Catalog</span>
                    </a>
                </li>
                <li class="nav-item" *ngIf="activeForwards.length > 0">
                    <a class="nav-link text-light cursor-pointer" [class.active]="activeTab === 'active'" (click)="activeTab = 'active'">
                        <i class="fas fa-plug me-1 text-success"></i>
                        <span translate>Active Tunnels</span>
                        <span class="badge bg-success ms-1">{{ activeForwards.length }}</span>
                    </a>
                </li>
            </ul>

            <!-- ============================================== -->
            <!-- TAB 1: MEUS TÚNEIS / PRESETS SALVOS            -->
            <!-- ============================================== -->
            <div *ngIf="activeTab === 'tunnels'">
                <!-- Search Bar -->
                <div class="input-group mb-3" *ngIf="presets.length > 0">
                    <span class="input-group-text bg-dark border-secondary text-muted">
                        <i class="fas fa-search"></i>
                    </span>
                    <input type="text" 
                           class="form-control bg-dark border-secondary text-light" 
                           [(ngModel)]="searchQuery" 
                           [placeholder]="'Search services or ports...' | translate">
                    <button class="btn btn-outline-secondary" *ngIf="searchQuery" (click)="searchQuery = ''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Empty State -->
                <div *ngIf="presets.length === 0" class="text-center py-5 text-muted">
                    <i class="fas fa-network-wired fa-3x mb-3 text-secondary opacity-50"></i>
                    <p class="mb-3 fs-6" translate>No tunnels configured yet.</p>
                    <button class="btn btn-primary" (click)="activeTab = 'add'">
                        <i class="fas fa-plus me-1"></i>
                        <span translate>Add Forward / Catalog</span>
                    </button>
                </div>

                <!-- Tunnels List -->
                <div class="tunnel-list d-flex flex-column gap-2" *ngIf="presets.length > 0">
                    <div *ngFor="let preset of filteredPresets" 
                         class="tunnel-row d-flex align-items-center justify-content-between p-3 rounded"
                         [class.tunnel-active]="isForwarded(preset)">
                        
                        <!-- Icon & Info -->
                        <div class="d-flex align-items-center flex-grow-1 me-3">
                            <div class="tunnel-icon-wrapper me-3">
                                <quick-forward-icon [icon]="preset.icon || ''" [size]="32"></quick-forward-icon>
                            </div>
                            <div>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="fw-bold text-light fs-6">{{ preset.name }}</span>
                                    <span class="badge" [class.badge-active]="isForwarded(preset)" [class.badge-inactive]="!isForwarded(preset)">
                                        <i class="fas fa-circle me-1" style="font-size: 7px;"></i>
                                        {{ isForwarded(preset) ? ('Active' | translate) : ('Inactive' | translate) }}
                                    </span>
                                </div>
                                <div class="font-monospace small text-muted mt-1">
                                    {{ preset.localHost || '127.0.0.1' }}:{{ preset.localPort }} &rarr; {{ preset.targetAddress }}:{{ preset.targetPort }}
                                </div>
                                <div class="small text-secondary" *ngIf="preset.description">
                                    {{ preset.description }}
                                </div>
                            </div>
                        </div>

                        <!-- Actions: Start/Stop, Edit, Delete -->
                        <div class="d-flex align-items-center gap-2">
                            <button class="btn btn-sm"
                                    [class.btn-success]="!isForwarded(preset)"
                                    [class.btn-danger]="isForwarded(preset)"
                                    [disabled]="busyPresets.has(preset.id)"
                                    (click)="togglePreset(preset)">
                                <i class="fas fa-spinner fa-spin me-1" *ngIf="busyPresets.has(preset.id)"></i>
                                <i class="fas fa-play me-1" *ngIf="!isForwarded(preset) && !busyPresets.has(preset.id)"></i>
                                <i class="fas fa-stop me-1" *ngIf="isForwarded(preset) && !busyPresets.has(preset.id)"></i>
                                <span>{{ isForwarded(preset) ? ('Stop' | translate) : ('Start' | translate) }}</span>
                            </button>

                            <button class="btn btn-sm btn-outline-secondary" (click)="editPreset(preset)" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>

                            <button class="btn btn-sm btn-outline-danger" (click)="deletePreset(preset)" title="Excluir">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>

                    <div *ngIf="filteredPresets.length === 0 && searchQuery" class="text-center py-4 text-muted">
                        <i class="fas fa-search fa-2x mb-2 opacity-50"></i>
                        <p>Nenhum serviço encontrado para "{{ searchQuery }}"</p>
                    </div>
                </div>
            </div>

            <!-- ============================================== -->
            <!-- TAB 2: NOVO ENCAMINHAMENTO / CATÁLOGO GITHUB   -->
            <!-- ============================================== -->
            <div *ngIf="activeTab === 'add'">
                <!-- GitHub Catalog Section -->
                <div class="card bg-dark border-secondary mb-3">
                    <div class="card-header bg-secondary bg-opacity-10 border-secondary d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <i class="fab fa-github fa-lg text-light me-2"></i>
                            <span class="fw-bold text-light" translate>GitHub Service Catalog</span>
                        </div>
                        <button class="btn btn-sm btn-primary" [disabled]="loadingCatalog" (click)="loadCatalog()">
                            <i class="fas fa-cloud-download-alt me-1" [class.fa-spin]="loadingCatalog"></i>
                            <span translate>{{ catalogLoaded ? 'Atualizar Catálogo' : 'Load Catalog from GitHub' }}</span>
                        </button>
                    </div>

                    <div class="card-body p-3" *ngIf="catalogLoaded">
                        <div class="input-group input-group-sm mb-3">
                            <span class="input-group-text bg-dark border-secondary text-muted"><i class="fas fa-search"></i></span>
                            <input type="text" class="form-control bg-dark border-secondary text-light" 
                                   [(ngModel)]="catalogSearch" placeholder="Pesquisar no catálogo (ex: postgres, redis, khomp, mongo)...">
                        </div>

                        <div class="catalog-grid row g-2" style="max-height: 180px; overflow-y: auto;">
                            <div class="col-md-6 col-lg-4" *ngFor="let item of filteredCatalog">
                                <div class="catalog-card d-flex align-items-center justify-content-between p-2 rounded border border-secondary bg-dark-subtle">
                                    <div class="d-flex align-items-center me-2 text-truncate">
                                        <div class="me-2" style="width: 24px; height: 24px;">
                                            <quick-forward-icon [icon]="item.icon || ''" [size]="24"></quick-forward-icon>
                                        </div>
                                        <div class="text-truncate">
                                            <div class="fw-bold small text-light text-truncate">{{ item.name }}</div>
                                            <div class="font-monospace text-muted" style="font-size: 11px;">Porta: {{ item.localPort }}</div>
                                        </div>
                                    </div>
                                    <button class="btn btn-sm btn-outline-info flex-shrink-0" (click)="selectCatalogItem(item)">
                                        <i class="fas fa-arrow-down me-1"></i> Usar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Custom Form Section -->
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-secondary bg-opacity-10 border-secondary">
                        <span class="fw-bold text-light">
                            <i class="fas fa-sliders-h me-1 text-primary"></i>
                            {{ isEditing ? 'Editar Encaminhamento' : 'Configurar Encaminhamento' }}
                        </span>
                    </div>
                    <div class="card-body p-3">
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold text-light" translate>Service Name</label>
                                <input type="text" class="form-control bg-dark border-secondary text-light" 
                                       [(ngModel)]="formPreset.name" placeholder="ex: PostgreSQL, Khomp, Redis...">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold text-light" translate>Forward Type</label>
                                <div class="btn-group w-100">
                                    <input type="radio" class="btn-check" id="fTypeLocal" name="fType" [value]="PortForwardType.Local" [(ngModel)]="formPreset.type">
                                    <label class="btn btn-outline-secondary" for="fTypeLocal">Local</label>

                                    <input type="radio" class="btn-check" id="fTypeRemote" name="fType" [value]="PortForwardType.Remote" [(ngModel)]="formPreset.type">
                                    <label class="btn btn-outline-secondary" for="fTypeRemote">Remoto</label>

                                    <input type="radio" class="btn-check" id="fTypeDynamic" name="fType" [value]="PortForwardType.Dynamic" [(ngModel)]="formPreset.type">
                                    <label class="btn btn-outline-secondary" for="fTypeDynamic">Dinâmico (SOCKS)</label>
                                </div>
                            </div>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-light" translate>Local Bind Host</label>
                                <input type="text" class="form-control font-monospace bg-dark border-secondary text-light" 
                                       [(ngModel)]="formPreset.localHost" placeholder="127.0.0.1">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-light" translate>Local Port</label>
                                <input type="number" class="form-control font-monospace bg-dark border-secondary text-light" 
                                       [(ngModel)]="formPreset.localPort" placeholder="5432">
                            </div>
                            <div class="col-md-6" *ngIf="formPreset.type !== PortForwardType.Dynamic">
                                <label class="form-label small fw-bold text-light" translate>Target Host & Port</label>
                                <div class="input-group">
                                    <input type="text" class="form-control font-monospace bg-dark border-secondary text-light" 
                                           [(ngModel)]="formPreset.targetAddress" placeholder="127.0.0.1">
                                    <span class="input-group-text bg-dark border-secondary text-muted">:</span>
                                    <input type="number" class="form-control font-monospace bg-dark border-secondary text-light" 
                                           [(ngModel)]="formPreset.targetPort" placeholder="5432">
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-light" translate>Description</label>
                            <input type="text" class="form-control bg-dark border-secondary text-light" 
                                   [(ngModel)]="formPreset.description" placeholder="Descrição opcional do túnel">
                        </div>

                        <!-- SVG Icon Upload (CLEAN, NO RAW SVG CODE!) -->
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-light" translate>Service Icon</label>
                            <div class="d-flex align-items-center gap-3">
                                <div class="selected-icon-preview p-2 rounded border border-secondary bg-dark d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                    <quick-forward-icon [icon]="formPreset.icon || ''" [size]="32"></quick-forward-icon>
                                </div>

                                <div class="d-flex flex-column gap-1">
                                    <label class="btn btn-sm btn-outline-primary mb-0">
                                        <i class="fas fa-upload me-1"></i>
                                        <span translate>Choose SVG file</span>
                                        <input type="file" accept=".svg,.png,.webp" class="d-none" (change)="onSvgUpload($event)">
                                    </label>
                                    <small class="text-muted">Faça upload de um arquivo .svg oficial ou digite classe FontAwesome abaixo.</small>
                                </div>

                                <div class="flex-grow-1 ms-3">
                                    <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light font-monospace" 
                                           [(ngModel)]="fontAwesomeInput" 
                                           (ngModelChange)="onFontAwesomeChange($event)"
                                           placeholder="Ex: fas fa-database, fas fa-phone...">
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="d-flex justify-content-end gap-2 pt-3 border-top border-secondary">
                            <button class="btn btn-secondary" *ngIf="isEditing" (click)="cancelEdit()">
                                Cancelar
                            </button>
                            <button class="btn btn-outline-light" (click)="saveAsPreset()">
                                <i class="fas fa-save me-1"></i>
                                <span translate>Save to My Presets</span>
                            </button>
                            <button class="btn btn-success" (click)="startTunnelNow()">
                                <i class="fas fa-play me-1"></i>
                                <span translate>Start Tunnel Now</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============================================== -->
            <!-- TAB 3: TÚNEIS ATIVOS                           -->
            <!-- ============================================== -->
            <div *ngIf="activeTab === 'active'">
                <div class="d-flex flex-column gap-2">
                    <div *ngFor="let fw of activeForwards" class="tunnel-row tunnel-active d-flex align-items-center justify-content-between p-3 rounded">
                        <div>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge bg-primary">{{ fw.type }}</span>
                                <strong class="text-light font-monospace fs-6">{{ fw.host }}:{{ fw.port }}</strong>
                                <span class="text-muted">&rarr;</span>
                                <span class="text-light font-monospace fs-6" *ngIf="fw.type !== PortForwardType.Dynamic">{{ fw.targetAddress }}:{{ fw.targetPort }}</span>
                                <span class="badge bg-info" *ngIf="fw.type === PortForwardType.Dynamic">SOCKS Proxy</span>
                            </div>
                            <small class="text-secondary mt-1 d-block" *ngIf="fw.description">{{ fw.description }}</small>
                        </div>
                        <button class="btn btn-sm btn-danger" (click)="stopForward(fw)">
                            <i class="fas fa-stop me-1"></i>
                            <span translate>Stop</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-footer border-secondary d-flex justify-content-between">
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="openSettings()">
                <i class="fas fa-cog me-1"></i>
                <span translate>Settings</span>
            </button>
            <button type="button" class="btn btn-secondary" (click)="activeModal.close()">
                <span translate>Close</span>
            </button>
        </div>
    `,
    styles: [`
        .cursor-pointer { cursor: pointer; }
        .tunnel-row {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.2s ease;
        }
        .tunnel-row:hover {
            background: rgba(255, 255, 255, 0.07);
            border-color: rgba(255, 255, 255, 0.15);
        }
        .tunnel-active {
            background: rgba(40, 167, 69, 0.12) !important;
            border-color: rgba(40, 167, 69, 0.5) !important;
        }
        .tunnel-icon-wrapper {
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 4px;
        }
        .badge-active {
            background: #28a745;
            color: #ffffff;
        }
        .badge-inactive {
            background: rgba(255, 255, 255, 0.1);
            color: #adb5bd;
        }
    `]
})
export class QuickPortForwardModalComponent implements OnInit {
    @Input() session: any = null
    activeTab: 'tunnels' | 'add' | 'active' = 'tunnels'
    searchQuery = ''
    catalogSearch = ''
    busyPresets = new Set<string>()
    loadingCatalog = false
    catalogLoaded = false
    catalogPresets: PortForwardPreset[] = []
    PortForwardType = PortForwardType

    isEditing = false
    editingId: string | null = null
    fontAwesomeInput = ''

    formPreset: any = {
        name: '',
        type: PortForwardType.Local,
        localHost: '127.0.0.1',
        localPort: 5432,
        targetAddress: '127.0.0.1',
        targetPort: 5432,
        description: '',
        icon: 'fas fa-plug',
    }

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
        if (this.presets.length === 0) {
            this.activeTab = 'add'
            this.loadCatalog()
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

    get filteredPresets(): PortForwardPreset[] {
        if (!this.searchQuery.trim()) return this.presets
        const q = this.searchQuery.toLowerCase().trim()
        return this.presets.filter(p => 
            p.name.toLowerCase().includes(q) ||
            String(p.localPort).includes(q) ||
            String(p.targetPort).includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        )
    }

    get filteredCatalog(): PortForwardPreset[] {
        if (!this.catalogSearch.trim()) return this.catalogPresets
        const q = this.catalogSearch.toLowerCase().trim()
        return this.catalogPresets.filter(p =>
            p.name.toLowerCase().includes(q) ||
            String(p.localPort).includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        )
    }

    get activeForwards(): any[] {
        return this.session?.forwardedPorts || []
    }

    isForwarded(preset: PortForwardPreset): boolean {
        return this.forwardService.isPresetForwarded(this.session, preset)
    }

    async togglePreset(preset: PortForwardPreset): Promise<void> {
        if (!this.session) {
            this.toastr.warning('Nenhuma sessão SSH ativa encontrada.')
            return
        }
        this.busyPresets.add(preset.id)
        this.cdr.markForCheck()

        try {
            const started = await this.forwardService.togglePreset(this.session, preset)
            if (started) {
                this.toastr.success(`Túnel iniciado para ${preset.name} na porta ${preset.localPort}`)
            } else {
                this.toastr.info(`Túnel encerrado para ${preset.name}`)
            }
        } catch (err: any) {
            this.toastr.error(`Falha: ${err.message || err}`)
        } finally {
            this.busyPresets.delete(preset.id)
            this.cdr.detectChanges()
        }
    }

    async stopForward(fw: any): Promise<void> {
        try {
            await this.forwardService.removeForward(this.session, fw)
            this.toastr.info('Túnel interrompido')
            this.cdr.detectChanges()
        } catch (err: any) {
            this.toastr.error(`Falha ao parar túnel: ${err.message || err}`)
        }
    }

    editPreset(preset: PortForwardPreset): void {
        this.isEditing = true
        this.editingId = preset.id
        this.formPreset = {
            name: preset.name,
            type: preset.type === 'remote' ? PortForwardType.Remote : (preset.type === 'dynamic' ? PortForwardType.Dynamic : PortForwardType.Local),
            localHost: preset.localHost || '127.0.0.1',
            localPort: preset.localPort,
            targetAddress: preset.targetAddress || '127.0.0.1',
            targetPort: preset.targetPort,
            description: preset.description || '',
            icon: preset.icon || 'fas fa-plug',
        }
        if (preset.icon && !preset.icon.trim().startsWith('<svg')) {
            this.fontAwesomeInput = preset.icon
        } else {
            this.fontAwesomeInput = ''
        }
        this.activeTab = 'add'
    }

    deletePreset(preset: PortForwardPreset): void {
        const list = this.presets.filter(p => p.id !== preset.id)
        this.forwardService.savePresets(list)
        this.toastr.info(`${preset.name} removido das predefinições`)
    }

    cancelEdit(): void {
        this.isEditing = false
        this.editingId = null
        this.resetForm()
        this.activeTab = 'tunnels'
    }

    resetForm(): void {
        this.formPreset = {
            name: '',
            type: PortForwardType.Local,
            localHost: '127.0.0.1',
            localPort: 5432,
            targetAddress: '127.0.0.1',
            targetPort: 5432,
            description: '',
            icon: 'fas fa-plug',
        }
        this.fontAwesomeInput = ''
        this.isEditing = false
        this.editingId = null
    }

    selectCatalogItem(item: PortForwardPreset): void {
        this.formPreset = {
            name: item.name,
            type: item.type === 'remote' ? PortForwardType.Remote : (item.type === 'dynamic' ? PortForwardType.Dynamic : PortForwardType.Local),
            localHost: item.localHost || '127.0.0.1',
            localPort: item.localPort,
            targetAddress: item.targetAddress || '127.0.0.1',
            targetPort: item.targetPort,
            description: item.description || '',
            icon: item.icon || 'fas fa-plug',
        }
        this.fontAwesomeInput = ''
        this.toastr.info(`Serviço ${item.name} selecionado! Ajuste as portas conforme desejar e salve.`)
    }

    async loadCatalog(): Promise<void> {
        this.loadingCatalog = true
        try {
            this.catalogPresets = await this.forwardService.fetchPresetsFromGitHub()
            this.catalogLoaded = true
            this.cdr.detectChanges()
        } catch (err: any) {
            this.toastr.error(`Falha ao carregar catálogo: ${err.message || err}`)
        } finally {
            this.loadingCatalog = false
            this.cdr.detectChanges()
        }
    }

    onSvgUpload(event: any): void {
        const file = event.target.files && event.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (e: any) => {
            const content = e.target.result
            if (typeof content === 'string' && content.includes('<svg')) {
                const cleanSvg = content.substring(content.indexOf('<svg'))
                this.formPreset.icon = cleanSvg
                this.fontAwesomeInput = ''
                this.toastr.success('Ícone SVG carregado com sucesso!')
            } else {
                // If image (png, webp, etc.)
                this.formPreset.icon = `<img src="${content}" style="width:100%;height:100%;object-fit:contain;"/>`
                this.fontAwesomeInput = ''
                this.toastr.success('Imagem carregada!')
            }
            this.cdr.detectChanges()
        }
        if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
            reader.readAsText(file)
        } else {
            reader.readAsDataURL(file)
        }
        event.target.value = ''
    }

    onFontAwesomeChange(val: string): void {
        if (val && val.trim()) {
            this.formPreset.icon = val.trim()
        }
    }

    saveAsPreset(): void {
        if (!this.formPreset.name.trim()) {
            this.toastr.warning('Por favor, informe o nome do serviço.')
            return
        }
        if (!this.formPreset.localPort) {
            this.toastr.warning('Por favor, informe a porta local.')
            return
        }

        const current = [...this.presets]
        const typeStr: 'local' | 'remote' | 'dynamic' = this.formPreset.type === PortForwardType.Remote ? 'remote' : (this.formPreset.type === PortForwardType.Dynamic ? 'dynamic' : 'local')

        const presetToSave: PortForwardPreset = {
            id: this.isEditing && this.editingId ? this.editingId : Date.now().toString(),
            name: this.formPreset.name.trim(),
            type: typeStr,
            localHost: this.formPreset.localHost || '127.0.0.1',
            localPort: Number(this.formPreset.localPort),
            targetAddress: this.formPreset.targetAddress || '127.0.0.1',
            targetPort: Number(this.formPreset.targetPort || this.formPreset.localPort),
            description: this.formPreset.description || '',
            icon: this.formPreset.icon || 'fas fa-plug',
        }

        if (this.isEditing && this.editingId) {
            const idx = current.findIndex(p => p.id === this.editingId)
            if (idx !== -1) current[idx] = presetToSave
        } else {
            current.push(presetToSave)
        }

        this.forwardService.savePresets(current)
        this.toastr.success(`Predefinição "${presetToSave.name}" salva com sucesso!`)
        this.resetForm()
        this.activeTab = 'tunnels'
    }

    async startTunnelNow(): Promise<void> {
        if (!this.session) {
            this.toastr.warning('Nenhuma sessão SSH ativa encontrada.')
            return
        }
        if (!this.formPreset.localPort) {
            this.toastr.warning('Por favor, informe a porta local.')
            return
        }

        try {
            await this.forwardService.addCustomForward(this.session, {
                type: this.formPreset.type,
                host: this.formPreset.localHost || '127.0.0.1',
                port: Number(this.formPreset.localPort),
                targetAddress: this.formPreset.targetAddress || '127.0.0.1',
                targetPort: Number(this.formPreset.targetPort || this.formPreset.localPort),
                description: this.formPreset.description || this.formPreset.name || '',
            })
            this.toastr.success(`Túnel iniciado na porta ${this.formPreset.localPort}!`)
            this.saveAsPreset()
        } catch (err: any) {
            this.toastr.error(`Falha ao iniciar túnel: ${err.message || err}`)
        }
    }

    openSettings(): void {
        this.activeModal.close()
        window.location.hash = '#/settings/quick-port-forward'
    }
}
