import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastrService } from 'ngx-toastr'
import { QuickPortForwardService, PortForwardType, ForwardedPortConfig } from '../services/forward.service'
import { PortForwardPreset } from '../types'

@Component({
    selector: 'quick-port-forward-modal',
    template: `
        <div class="modal-header border-secondary py-2 px-3">
            <div class="d-flex align-items-center">
                <i class="fas fa-plug text-primary me-2"></i>
                <h6 class="m-0 fw-bold">Encaminhamento de Portas</h6>
                <span class="badge bg-secondary ms-2 font-monospace" *ngIf="sessionHost">
                    {{ sessionHost }}
                </span>
            </div>
            <button type="button" class="btn-close" (click)="activeModal.close()"></button>
        </div>

        <div class="modal-body p-3">
            <!-- Tabs -->
            <ul class="nav nav-tabs border-secondary mb-3">
                <li class="nav-item">
                    <a class="nav-link cursor-pointer" [class.active]="activeTab === 'tunnels'" (click)="activeTab = 'tunnels'">
                        Meus Túneis
                        <span class="badge bg-secondary ms-1" *ngIf="presets.length">{{ presets.length }}</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link cursor-pointer" [class.active]="activeTab === 'add'" (click)="activeTab = 'add'">
                        <i class="fas fa-plus me-1"></i>
                        {{ isEditing ? 'Editar Túnel' : 'Adicionar Túnel' }}
                    </a>
                </li>
            </ul>

            <!-- ============================================== -->
            <!-- TAB 1: MEUS TÚNEIS & TÚNEIS ATIVOS             -->
            <!-- ============================================== -->
            <div *ngIf="activeTab === 'tunnels'">
                <!-- Active Tunnels Section (if any active) -->
                <div *ngIf="activeForwards.length > 0" class="card border-success border-opacity-50 mb-3 bg-dark">
                    <div class="card-header border-success border-opacity-25 py-2 px-3 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-circle text-success me-2" style="font-size: 8px;"></i>
                            <span class="small fw-bold text-success text-uppercase">Túneis Ativos no Momento ({{ activeForwards.length }})</span>
                        </div>
                    </div>
                    <div class="list-group list-group-flush">
                        <div *ngFor="let fw of activeForwards" class="list-group-item bg-transparent border-secondary d-flex align-items-center justify-content-between py-2 px-3">
                            <div class="d-flex align-items-center me-3 text-truncate">
                                <div class="tunnel-icon me-3 text-success">
                                    <quick-forward-icon [icon]="getForwardInfo(fw).icon" [size]="22"></quick-forward-icon>
                                </div>
                                <div class="text-truncate">
                                    <div class="d-flex align-items-center gap-2">
                                        <strong class="fs-6 text-truncate">{{ getForwardInfo(fw).name }}</strong>
                                        <span class="badge bg-success" style="font-size: 10px;">Ativo</span>
                                    </div>
                                    <div class="font-monospace text-muted small">
                                        {{ fw.host }}:{{ fw.port }} &rarr; {{ fw.targetAddress }}:{{ fw.targetPort }}
                                    </div>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-outline-danger" (click)="stopForward(fw)">
                                <i class="fas fa-stop me-1"></i> Parar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Search Input -->
                <div class="input-group input-group-sm mb-3" *ngIf="presets.length > 0">
                    <span class="input-group-text bg-transparent border-secondary text-muted">
                        <i class="fas fa-search"></i>
                    </span>
                    <input type="text" 
                           class="form-control bg-transparent border-secondary" 
                           [(ngModel)]="searchQuery" 
                           placeholder="Pesquisar por nome ou porta (ex: postgres, 5432, mongo, redis)...">
                    <button class="btn btn-outline-secondary" *ngIf="searchQuery" (click)="searchQuery = ''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Empty State -->
                <div *ngIf="presets.length === 0" class="text-center py-5 text-muted border border-secondary border-dashed rounded">
                    <i class="fas fa-network-wired fa-2x mb-3 opacity-50"></i>
                    <p class="mb-3 small">Nenhum túnel configurado ainda.</p>
                    <button class="btn btn-sm btn-primary" (click)="activeTab = 'add'">
                        <i class="fas fa-plus me-1"></i> Adicionar Túnel
                    </button>
                </div>

                <!-- Presets List -->
                <div class="list-group" *ngIf="presets.length > 0">
                    <div *ngFor="let preset of filteredPresets" 
                         class="list-group-item list-group-item-action border-secondary d-flex align-items-center justify-content-between py-2 px-3"
                         [class.border-success]="isForwarded(preset)">
                        
                        <div class="d-flex align-items-center flex-grow-1 me-3 text-truncate">
                            <div class="tunnel-icon me-3">
                                <quick-forward-icon [icon]="preset.icon || ''" [size]="24"></quick-forward-icon>
                            </div>
                            <div class="text-truncate">
                                <div class="d-flex align-items-center gap-2">
                                    <strong class="fs-6 text-truncate">{{ preset.name }}</strong>
                                    <span class="badge" [class.bg-success]="isForwarded(preset)" [class.bg-secondary]="!isForwarded(preset)" style="font-size: 10px;">
                                        {{ isForwarded(preset) ? 'Ativo' : 'Parado' }}
                                    </span>
                                </div>
                                <div class="font-monospace text-muted small">
                                    {{ preset.localHost || '127.0.0.1' }}:{{ preset.localPort }} &rarr; {{ preset.targetAddress }}:{{ preset.targetPort }}
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="d-flex align-items-center gap-2 flex-shrink-0">
                            <button class="btn btn-sm"
                                    [class.btn-success]="!isForwarded(preset)"
                                    [class.btn-danger]="isForwarded(preset)"
                                    [disabled]="busyPresets.has(preset.id)"
                                    (click)="togglePreset(preset)">
                                <i class="fas fa-play me-1" *ngIf="!isForwarded(preset) && !busyPresets.has(preset.id)"></i>
                                <i class="fas fa-stop me-1" *ngIf="isForwarded(preset) && !busyPresets.has(preset.id)"></i>
                                <span>{{ isForwarded(preset) ? 'Parar' : 'Iniciar' }}</span>
                            </button>

                            <button class="btn btn-sm btn-link text-muted" (click)="editPreset(preset)" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>

                            <button class="btn btn-sm btn-link text-danger" (click)="deletePreset(preset)" title="Excluir">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>

                    <div *ngIf="filteredPresets.length === 0 && searchQuery" class="text-center py-4 text-muted small">
                        Nenhum serviço encontrado para "{{ searchQuery }}"
                    </div>
                </div>
            </div>

            <!-- ============================================== -->
            <!-- TAB 2: ADICIONAR TÚNEL                         -->
            <!-- ============================================== -->
            <div *ngIf="activeTab === 'add'">
                <!-- Clean Catalog Select Dropdown -->
                <div class="mb-3" *ngIf="catalogPresets.length > 0">
                    <label class="form-label small fw-bold">Preencher a partir do Catálogo Oficial:</label>
                    <select class="form-select form-select-sm" (change)="onCatalogDropdownChange($event)">
                        <option value="">Escolher serviço predefinido (PostgreSQL, Redis, MongoDB, Khomp, Docker...)...</option>
                        <option *ngFor="let item of catalogPresets" [value]="item.id">
                            {{ item.name }} (Porta padrão: {{ item.localPort }})
                        </option>
                    </select>
                </div>

                <!-- Custom Form -->
                <div class="card bg-transparent border-secondary p-3">
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Nome do Serviço</label>
                            <input type="text" class="form-control form-control-sm" 
                                   [(ngModel)]="formPreset.name" placeholder="ex: PostgreSQL, Redis, Khomp...">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Tipo de Encaminhamento</label>
                            <div class="btn-group btn-group-sm w-100">
                                <input type="radio" class="btn-check" id="fLocal" name="fType" [value]="PortForwardType.Local" [(ngModel)]="formPreset.type">
                                <label class="btn btn-outline-secondary" for="fLocal">Local</label>

                                <input type="radio" class="btn-check" id="fRemote" name="fType" [value]="PortForwardType.Remote" [(ngModel)]="formPreset.type">
                                <label class="btn btn-outline-secondary" for="fRemote">Remoto</label>

                                <input type="radio" class="btn-check" id="fDynamic" name="fType" [value]="PortForwardType.Dynamic" [(ngModel)]="formPreset.type">
                                <label class="btn btn-outline-secondary" for="fDynamic">SOCKS5</label>
                            </div>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold">Host Local</label>
                            <input type="text" class="form-control form-control-sm font-monospace" 
                                   [(ngModel)]="formPreset.localHost" placeholder="127.0.0.1">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold">Porta Local</label>
                            <input type="number" class="form-control form-control-sm font-monospace" 
                                   [(ngModel)]="formPreset.localPort" placeholder="5432">
                        </div>
                        <div class="col-md-6" *ngIf="formPreset.type !== PortForwardType.Dynamic">
                            <label class="form-label small fw-bold">Host e Porta de Destino</label>
                            <div class="input-group input-group-sm">
                                <input type="text" class="form-control font-monospace" 
                                       [(ngModel)]="formPreset.targetAddress" placeholder="127.0.0.1">
                                <span class="input-group-text">:</span>
                                <input type="number" class="form-control font-monospace" 
                                       [(ngModel)]="formPreset.targetPort" placeholder="5432">
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label small fw-bold">Descrição (Opcional)</label>
                        <input type="text" class="form-control form-control-sm" 
                               [(ngModel)]="formPreset.description" placeholder="Descrição opcional">
                    </div>

                    <!-- Clean SVG Upload & FontAwesome Input -->
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Ícone do Serviço</label>
                        <div class="d-flex align-items-center gap-3">
                            <div class="icon-preview rounded border border-secondary p-1 d-flex align-items-center justify-content-center" 
                                 style="width: 38px; height: 38px;">
                                <quick-forward-icon [icon]="formPreset.icon || ''" [size]="24"></quick-forward-icon>
                            </div>

                            <label class="btn btn-sm btn-outline-secondary mb-0 cursor-pointer">
                                <i class="fas fa-upload me-1"></i> Escolher arquivo SVG
                                <input type="file" accept=".svg,.png,.webp" class="d-none" (change)="onSvgUpload($event)">
                            </label>

                            <input type="text" class="form-control form-control-sm font-monospace flex-grow-1" 
                                   [(ngModel)]="fontAwesomeInput" 
                                   (ngModelChange)="onFontAwesomeChange($event)" 
                                   placeholder="Ou digite classe FontAwesome (ex: fas fa-database, fa-server)...">
                        </div>
                    </div>

                    <!-- Buttons -->
                    <div class="d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
                        <button class="btn btn-sm btn-secondary" *ngIf="isEditing" (click)="cancelEdit()">
                            Cancelar
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" (click)="saveAsPreset()">
                            <i class="fas fa-save me-1"></i> Salvar Predefinição
                        </button>
                        <button class="btn btn-sm btn-primary" (click)="startTunnelNow()">
                            <i class="fas fa-play me-1"></i> Iniciar Túnel Agora
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-footer border-secondary py-2 px-3 d-flex justify-content-end">
            <button type="button" class="btn btn-secondary btn-sm" (click)="activeModal.close()">
                Fechar
            </button>
        </div>
    `,
    styles: [`
        .cursor-pointer { cursor: pointer; }
        .tunnel-icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .icon-preview {
            background: rgba(0, 0, 0, 0.2);
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

    onCatalogDropdownChange(event: any): void {
        const id = event.target.value
        if (!id) return
        const item = this.catalogPresets.find(p => p.id === id)
        if (item) {
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
            this.toastr.info(`Serviço ${item.name} selecionado.`)
        }
        event.target.value = ''
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
                this.formPreset.icon = content
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
}
