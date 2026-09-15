import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrService } from 'ngx-toastr'
import { QuickPortForwardService, PortForwardType, ForwardedPortConfig } from '../services/forward.service'
import { PortForwardPreset } from '../types'

@Component({
    selector: 'quick-port-forward-modal',
    template: `
        <div class="modal-header border-secondary bg-dark py-2 px-3">
            <div class="d-flex align-items-center">
                <i class="fas fa-network-wired text-primary me-2"></i>
                <h6 class="m-0 fw-bold text-light">Encaminhamento de Portas (SSH)</h6>
                <span class="badge bg-secondary bg-opacity-50 text-light ms-2 font-monospace" *ngIf="sessionHost">
                    {{ sessionHost }}
                </span>
            </div>
            <button type="button" class="btn-close btn-close-white" (click)="activeModal.close()"></button>
        </div>

        <div class="modal-body p-3 bg-dark">
            <!-- Navigation Tabs -->
            <ul class="nav nav-pills nav-fill bg-black bg-opacity-40 p-1 rounded border border-secondary mb-3">
                <li class="nav-item">
                    <a class="nav-link py-1 px-3 text-light cursor-pointer" 
                       [class.active]="activeTab === 'tunnels'" 
                       (click)="activeTab = 'tunnels'">
                        <i class="fas fa-list-ul me-1"></i>
                        Meus Túneis
                        <span class="badge bg-secondary ms-1" *ngIf="presets.length">{{ presets.length }}</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link py-1 px-3 text-light cursor-pointer" 
                       [class.active]="activeTab === 'add'" 
                       (click)="activeTab = 'add'">
                        <i class="fas fa-plus-circle me-1"></i>
                        {{ isEditing ? 'Editar Túnel' : 'Adicionar Túnel' }}
                    </a>
                </li>
            </ul>

            <!-- ============================================== -->
            <!-- TAB 1: MEUS TÚNEIS & TÚNEIS ATIVOS             -->
            <!-- ============================================== -->
            <div *ngIf="activeTab === 'tunnels'">
                <!-- Active Tunnels Alert Section (if any active) -->
                <div *ngIf="activeForwards.length > 0" class="active-tunnels-box p-3 rounded mb-3">
                    <div class="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom border-success border-opacity-25">
                        <span class="small fw-bold text-success text-uppercase">
                            <i class="fas fa-plug fa-pulse me-1"></i> Túneis Ativos no Momento ({{ activeForwards.length }})
                        </span>
                    </div>

                    <div class="d-flex flex-column gap-2">
                        <div *ngFor="let fw of activeForwards" 
                             class="d-flex align-items-center justify-content-between p-2 rounded bg-black bg-opacity-40 border border-success border-opacity-25">
                            <div class="d-flex align-items-center me-2">
                                <div class="tunnel-icon-box me-2 text-success">
                                    <quick-forward-icon [icon]="getForwardInfo(fw).icon" [size]="24"></quick-forward-icon>
                                </div>
                                <div>
                                    <div class="d-flex align-items-center gap-2">
                                        <strong class="text-light fs-6">{{ getForwardInfo(fw).name }}</strong>
                                        <span class="badge bg-success" style="font-size: 10px;">Ativo</span>
                                    </div>
                                    <div class="font-monospace text-light text-opacity-75" style="font-size: 12px;">
                                        {{ fw.host }}:{{ fw.port }} &rarr; {{ fw.targetAddress }}:{{ fw.targetPort }}
                                    </div>
                                </div>
                            </div>

                            <button class="btn btn-sm btn-danger py-0 px-2" (click)="stopForward(fw)">
                                <i class="fas fa-stop me-1"></i> Parar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Search Filter -->
                <div class="input-group input-group-sm mb-3" *ngIf="presets.length > 0">
                    <span class="input-group-text bg-black bg-opacity-50 border-secondary text-muted">
                        <i class="fas fa-search"></i>
                    </span>
                    <input type="text" 
                           class="form-control bg-black bg-opacity-50 border-secondary text-light" 
                           [(ngModel)]="searchQuery" 
                           placeholder="Pesquisar por serviço ou porta (ex: postgres, 5432, mongo, redis)...">
                    <button class="btn btn-outline-secondary" *ngIf="searchQuery" (click)="searchQuery = ''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Empty State -->
                <div *ngIf="presets.length === 0" class="text-center py-5 text-muted border border-secondary border-dashed rounded">
                    <i class="fas fa-network-wired fa-2x mb-3 text-secondary opacity-50"></i>
                    <p class="mb-3 small">Nenhum túnel configurado ainda.</p>
                    <button class="btn btn-sm btn-primary" (click)="activeTab = 'add'">
                        <i class="fas fa-plus me-1"></i> Adicionar do Catálogo ou Personalizado
                    </button>
                </div>

                <!-- Presets List -->
                <div class="d-flex flex-column gap-2" *ngIf="presets.length > 0">
                    <div *ngFor="let preset of filteredPresets" 
                         class="tunnel-card d-flex align-items-center justify-content-between p-2 px-3 rounded"
                         [class.tunnel-card-active]="isForwarded(preset)">
                        
                        <div class="d-flex align-items-center flex-grow-1 me-2 text-truncate">
                            <div class="tunnel-icon-box me-3">
                                <quick-forward-icon [icon]="preset.icon || ''" [size]="28"></quick-forward-icon>
                            </div>
                            <div class="text-truncate">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="fw-bold text-light fs-6 text-truncate">{{ preset.name }}</span>
                                    <span class="badge" [class.bg-success]="isForwarded(preset)" [class.bg-secondary]="!isForwarded(preset)" style="font-size: 10px;">
                                        {{ isForwarded(preset) ? 'Ativo' : 'Parado' }}
                                    </span>
                                </div>
                                <div class="font-monospace text-muted" style="font-size: 12px;">
                                    {{ preset.localHost || '127.0.0.1' }}:{{ preset.localPort }} &rarr; {{ preset.targetAddress }}:{{ preset.targetPort }}
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="d-flex align-items-center gap-2 flex-shrink-0">
                            <button class="btn btn-sm"
                                    [class.btn-success]="!isForwarded(preset)"
                                    [class.btn-danger]="isForwarded(preset)"
                                    [disabled]="busyPresets.has(preset.id)"
                                    (click)="togglePreset(preset)">
                                <i class="fas fa-spinner fa-spin me-1" *ngIf="busyPresets.has(preset.id)"></i>
                                <i class="fas fa-play me-1" *ngIf="!isForwarded(preset) && !busyPresets.has(preset.id)"></i>
                                <i class="fas fa-stop me-1" *ngIf="isForwarded(preset) && !busyPresets.has(preset.id)"></i>
                                <span>{{ isForwarded(preset) ? 'Parar' : 'Iniciar' }}</span>
                            </button>

                            <button class="btn btn-sm btn-outline-secondary py-1 px-2" (click)="editPreset(preset)" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>

                            <button class="btn btn-sm btn-outline-danger py-1 px-2" (click)="deletePreset(preset)" title="Excluir">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>

                    <div *ngIf="filteredPresets.length === 0 && searchQuery" class="text-center py-4 text-muted">
                        <small>Nenhum serviço encontrado para "{{ searchQuery }}"</small>
                    </div>
                </div>
            </div>

            <!-- ============================================== -->
            <!-- TAB 2: ADICIONAR TÚNEL / ESCOLHER DO CATÁLOGO   -->
            <!-- ============================================== -->
            <div *ngIf="activeTab === 'add'">
                <!-- Catalog Quick Picker -->
                <div class="catalog-picker p-3 rounded border border-secondary mb-3 bg-black bg-opacity-30">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span class="small fw-bold text-light">
                            <i class="fas fa-cubes text-info me-1"></i> Escolher Serviço do Catálogo
                        </span>
                        <span class="small text-muted">Clique para preencher os dados</span>
                    </div>

                    <div class="catalog-chips-container d-flex flex-wrap gap-2" style="max-height: 120px; overflow-y: auto;">
                        <button *ngFor="let item of catalogPresets" 
                                type="button" 
                                class="catalog-chip btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 py-1 px-2 text-light"
                                (click)="selectCatalogItem(item)">
                            <quick-forward-icon [icon]="item.icon || ''" [size]="18"></quick-forward-icon>
                            <span class="small">{{ item.name }}</span>
                            <span class="font-monospace text-muted" style="font-size: 11px;">({{ item.localPort }})</span>
                        </button>
                    </div>
                </div>

                <!-- Custom Form -->
                <div class="form-container p-3 rounded border border-secondary bg-black bg-opacity-20">
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-light">Nome do Serviço</label>
                            <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light" 
                                   [(ngModel)]="formPreset.name" placeholder="ex: PostgreSQL, Redis, Khomp...">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-light">Tipo de Encaminhamento</label>
                            <div class="btn-group btn-group-sm w-100">
                                <input type="radio" class="btn-check" id="modalFwLocal" name="modalFwType" [value]="PortForwardType.Local" [(ngModel)]="formPreset.type">
                                <label class="btn btn-outline-secondary" for="modalFwLocal">Local</label>

                                <input type="radio" class="btn-check" id="modalFwRemote" name="modalFwType" [value]="PortForwardType.Remote" [(ngModel)]="formPreset.type">
                                <label class="btn btn-outline-secondary" for="modalFwRemote">Remoto</label>

                                <input type="radio" class="btn-check" id="modalFwDynamic" name="modalFwType" [value]="PortForwardType.Dynamic" [(ngModel)]="formPreset.type">
                                <label class="btn btn-outline-secondary" for="modalFwDynamic">SOCKS5</label>
                            </div>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-light">Host Local</label>
                            <input type="text" class="form-control form-control-sm font-monospace bg-dark border-secondary text-light" 
                                   [(ngModel)]="formPreset.localHost" placeholder="127.0.0.1">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-light">Porta Local</label>
                            <input type="number" class="form-control form-control-sm font-monospace bg-dark border-secondary text-light" 
                                   [(ngModel)]="formPreset.localPort" placeholder="5432">
                        </div>
                        <div class="col-md-6" *ngIf="formPreset.type !== PortForwardType.Dynamic">
                            <label class="form-label small fw-bold text-light">Host e Porta de Destino</label>
                            <div class="input-group input-group-sm">
                                <input type="text" class="form-control font-monospace bg-dark border-secondary text-light" 
                                       [(ngModel)]="formPreset.targetAddress" placeholder="127.0.0.1">
                                <span class="input-group-text bg-dark border-secondary text-muted">:</span>
                                <input type="number" class="form-control font-monospace bg-dark border-secondary text-light" 
                                       [(ngModel)]="formPreset.targetPort" placeholder="5432">
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label small fw-bold text-light">Descrição (Opcional)</label>
                        <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light" 
                               [(ngModel)]="formPreset.description" placeholder="ex: Banco de dados de produção">
                    </div>

                    <!-- Clean SVG Upload & Preview -->
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-light">Ícone</label>
                        <div class="d-flex align-items-center gap-3">
                            <div class="icon-preview-box rounded border border-secondary bg-black d-flex align-items-center justify-content-center text-light" 
                                 style="width: 42px; height: 42px;">
                                <quick-forward-icon [icon]="formPreset.icon || ''" [size]="28"></quick-forward-icon>
                            </div>

                            <label class="btn btn-sm btn-outline-secondary mb-0 cursor-pointer">
                                <i class="fas fa-upload me-1"></i> Escolher arquivo SVG
                                <input type="file" accept=".svg,.png,.webp" class="d-none" (change)="onSvgUpload($event)">
                            </label>

                            <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light font-monospace flex-grow-1" 
                                   [(ngModel)]="fontAwesomeInput" 
                                   (ngModelChange)="onFontAwesomeChange($event)" 
                                   placeholder="Ou digite classe FontAwesome (ex: fas fa-database)...">
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
                        <button class="btn btn-sm btn-secondary" *ngIf="isEditing" (click)="cancelEdit()">
                            Cancelar
                        </button>
                        <button class="btn btn-sm btn-outline-light" (click)="saveAsPreset()">
                            <i class="fas fa-save me-1"></i> Salvar Predefinição
                        </button>
                        <button class="btn btn-sm btn-success" (click)="startTunnelNow()">
                            <i class="fas fa-play me-1"></i> Iniciar Túnel Agora
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-footer border-secondary bg-dark py-2 px-3 d-flex justify-content-between">
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="openSettings()">
                <i class="fas fa-cog me-1"></i> Configurações
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="activeModal.close()">
                Fechar
            </button>
        </div>
    `,
    styles: [`
        .cursor-pointer { cursor: pointer; }
        .tunnel-card {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.15s ease;
        }
        .tunnel-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
        }
        .tunnel-card-active {
            background: rgba(40, 167, 69, 0.12) !important;
            border-color: rgba(40, 167, 69, 0.45) !important;
        }
        .active-tunnels-box {
            background: rgba(40, 167, 69, 0.08);
            border: 1px solid rgba(40, 167, 69, 0.3);
        }
        .tunnel-icon-box {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 6px;
            padding: 4px;
        }
        .catalog-chip {
            background: rgba(255, 255, 255, 0.03);
            border-color: rgba(255, 255, 255, 0.1);
            transition: all 0.15s ease;
        }
        .catalog-chip:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.3);
            color: #fff !important;
        }
    `]
})
export class QuickPortForwardModalComponent implements OnInit {
    @Input() session: any = null
    activeTab: 'tunnels' | 'add' = 'tunnels'
    searchQuery = ''
    busyPresets = new Set<string>()
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

    async ngOnInit(): Promise<void> {
        if (!this.session) {
            this.session = this.forwardService.getActiveSSHSession()
        }
        try {
            this.catalogPresets = await this.forwardService.fetchPresetsFromGitHub()
        } catch {}

        if (this.presets.length === 0 && this.activeForwards.length === 0) {
            this.activeTab = 'add'
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

    get activeForwards(): any[] {
        return this.session?.forwardedPorts || []
    }

    isForwarded(preset: PortForwardPreset): boolean {
        return this.forwardService.isPresetForwarded(this.session, preset)
    }

    getForwardInfo(fw: any): { name: string, icon: string } {
        const match = this.presets.find(p => Number(p.localPort) === Number(fw.port)) ||
                      this.catalogPresets.find(p => Number(p.localPort) === Number(fw.port))
        if (match) {
            return { name: match.name, icon: match.icon || 'fas fa-plug' }
        }
        return {
            name: fw.description || `Porta ${fw.port}`,
            icon: 'fas fa-plug',
        }
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
        this.toastr.info(`${item.name} selecionado. Ajuste as portas e salve.`)
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
        this.toastr.info(`${preset.name} removido`)
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
        this.toastr.success(`Predefinição "${presetToSave.name}" salva!`)
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
