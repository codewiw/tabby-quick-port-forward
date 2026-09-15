import { Component, Injectable, OnInit } from '@angular/core'
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
                <h3 class="m-0 fw-bold">Predefinições de Port Forwarding</h3>
                <div class="text-muted small">Gerencie as predefinições de túnel SSH para uso com 1 clique nas sessões.</div>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary btn-sm" (click)="exportJson()">
                    <i class="fas fa-file-export me-1"></i> Exportar JSON
                </button>
                <label class="btn btn-outline-secondary btn-sm mb-0 cursor-pointer">
                    <i class="fas fa-file-import me-1"></i> Importar JSON
                    <input type="file" accept=".json" class="d-none" (change)="importJson($event)">
                </label>
            </div>
        </div>

        <!-- Create / Edit Form -->
        <div class="card mb-4 border-primary bg-dark" *ngIf="editingPreset">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2 px-3">
                <span class="fw-bold">{{ isNewPreset ? 'Nova Predefinição' : 'Editar: ' + editingPreset.name }}</span>
                <button type="button" class="btn-close btn-close-white" (click)="cancelEdit()"></button>
            </div>
            <div class="card-body p-3">
                <!-- Select from catalog if new -->
                <div class="mb-3" *ngIf="isNewPreset && catalogPresets.length > 0">
                    <label class="form-label small fw-bold text-light">Preencher a partir do Catálogo Oficial:</label>
                    <select class="form-select form-select-sm" (change)="onCatalogSelect($event)">
                        <option value="">Escolher serviço predefinido (PostgreSQL, Redis, MongoDB, Khomp, Docker...)...</option>
                        <option *ngFor="let item of catalogPresets" [value]="item.id">
                            {{ item.name }} (Porta padrão: {{ item.localPort }})
                        </option>
                    </select>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-light">Nome do Serviço</label>
                        <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light" 
                               [(ngModel)]="editingPreset.name" placeholder="ex: PostgreSQL, Redis...">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-light">Tipo</label>
                        <select class="form-select form-select-sm bg-dark border-secondary text-light" [(ngModel)]="editingPreset.type">
                            <option value="local">Local</option>
                            <option value="remote">Remoto</option>
                            <option value="dynamic">Dinâmico (SOCKS5)</option>
                        </select>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-md-3">
                        <label class="form-label small fw-bold text-light">Host Local</label>
                        <input type="text" class="form-control font-monospace form-control-sm bg-dark border-secondary text-light" 
                               [(ngModel)]="editingPreset.localHost" placeholder="127.0.0.1">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold text-light">Porta Local</label>
                        <input type="number" class="form-control font-monospace form-control-sm bg-dark border-secondary text-light" 
                               [(ngModel)]="editingPreset.localPort" placeholder="5432">
                    </div>
                    <div class="col-md-6" *ngIf="editingPreset.type !== 'dynamic'">
                        <label class="form-label small fw-bold text-light">Host e Porta de Destino</label>
                        <div class="input-group input-group-sm">
                            <input type="text" class="form-control font-monospace bg-dark border-secondary text-light" 
                                   [(ngModel)]="editingPreset.targetAddress" placeholder="127.0.0.1">
                            <span class="input-group-text bg-dark border-secondary text-muted">:</span>
                            <input type="number" class="form-control font-monospace bg-dark border-secondary text-light" 
                                   [(ngModel)]="editingPreset.targetPort" placeholder="5432">
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold text-light">Descrição (Opcional)</label>
                    <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light" 
                           [(ngModel)]="editingPreset.description" placeholder="Descrição do túnel">
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold text-light">Ícone</label>
                    <div class="d-flex align-items-center gap-3">
                        <div class="p-1 rounded border border-secondary bg-black d-flex align-items-center justify-content-center text-light" 
                             style="width: 38px; height: 38px;">
                            <quick-forward-icon [icon]="editingPreset.icon || ''" [size]="24"></quick-forward-icon>
                        </div>

                        <label class="btn btn-sm btn-outline-secondary mb-0 cursor-pointer">
                            <i class="fas fa-upload me-1"></i> Escolher arquivo SVG
                            <input type="file" accept=".svg,.png,.webp" class="d-none" (change)="onSvgUpload($event)">
                        </label>

                        <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light font-monospace flex-grow-1" 
                               [(ngModel)]="fontAwesomeInput" 
                               (ngModelChange)="onFontAwesomeChange($event)" 
                               placeholder="Ou digite classe FontAwesome (ex: fas fa-database, fa-server)...">
                    </div>
                </div>

                <div class="d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
                    <button class="btn btn-sm btn-secondary" (click)="cancelEdit()">Cancelar</button>
                    <button class="btn btn-sm btn-primary" (click)="saveEdit()">Salvar Predefinição</button>
                </div>
            </div>
        </div>

        <!-- Presets List Card -->
        <div class="card bg-dark border-secondary">
            <div class="card-header bg-secondary bg-opacity-10 border-secondary d-flex justify-content-between align-items-center py-2 px-3">
                <span class="fw-bold text-light">Predefinições Salvas ({{ presets.length }})</span>
                <div class="d-flex gap-2">
                    <input type="text" class="form-control form-control-sm bg-dark border-secondary text-light" 
                           [(ngModel)]="searchQuery" placeholder="Filtrar predefinições..." style="width: 200px;">
                    <button class="btn btn-sm btn-primary" (click)="newPreset()">
                        <i class="fas fa-plus me-1"></i> Nova Predefinição
                    </button>
                </div>
            </div>

            <!-- Empty State -->
            <div *ngIf="presets.length === 0" class="card-body text-center py-5 text-muted">
                <i class="fas fa-network-wired fa-2x mb-3 text-secondary opacity-50"></i>
                <p class="mb-3 small">Nenhuma predefinição salva no momento.</p>
                <button class="btn btn-sm btn-primary" (click)="newPreset()">
                    <i class="fas fa-plus me-1"></i> Criar Predefinição
                </button>
            </div>

            <!-- List of Presets -->
            <ul class="list-group list-group-flush" *ngIf="presets.length > 0">
                <li *ngFor="let p of filteredPresets; let i = index" 
                    class="list-group-item bg-transparent border-secondary d-flex align-items-center justify-content-between py-2 px-3">
                    <div class="d-flex align-items-center flex-grow-1 me-3 text-truncate">
                        <div class="me-3 p-1 rounded border border-secondary bg-black d-flex align-items-center justify-content-center text-light" 
                             style="width: 32px; height: 32px;">
                            <quick-forward-icon [icon]="p.icon || ''" [size]="22"></quick-forward-icon>
                        </div>
                        <div class="text-truncate">
                            <div class="d-flex align-items-center gap-2">
                                <strong class="text-light fs-6">{{ p.name }}</strong>
                                <span class="badge bg-secondary text-uppercase" style="font-size: 10px;">{{ p.type }}</span>
                            </div>
                            <div class="font-monospace text-muted" style="font-size: 12px;">
                                {{ p.localHost || '127.0.0.1' }}:{{ p.localPort }} &rarr; {{ p.targetAddress }}:{{ p.targetPort }}
                            </div>
                        </div>
                    </div>

                    <div class="d-flex align-items-center gap-1 flex-shrink-0">
                        <button class="btn btn-sm btn-link text-muted py-0 px-1" [disabled]="i === 0" (click)="movePreset(i, -1)" title="Mover para cima">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <button class="btn btn-sm btn-link text-muted py-0 px-1" [disabled]="i === presets.length - 1" (click)="movePreset(i, 1)" title="Mover para baixo">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary py-1 px-2 ms-2" (click)="editPreset(p)" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary py-1 px-2" (click)="duplicatePreset(p)" title="Duplicar">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger py-1 px-2" (click)="deletePreset(i)" title="Excluir">
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

    constructor(
        public config: ConfigService,
        private forwardService: QuickPortForwardService,
        private toastr: ToastrService
    ) {}

    async ngOnInit(): Promise<void> {
        try {
            this.catalogPresets = await this.forwardService.fetchPresetsFromGitHub()
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

    onCatalogSelect(event: any): void {
        const id = event.target.value
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
        }
        event.target.value = ''
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
        copy.name += ' (Cópia)'
        copy.localPort += 1
        const list = [...this.presets, copy]
        this.forwardService.savePresets(list)
        this.toastr.info('Predefinição duplicada')
    }

    cancelEdit(): void {
        this.editingPreset = null
        this.isNewPreset = false
    }

    saveEdit(): void {
        if (!this.editingPreset) return
        if (!this.editingPreset.name.trim()) {
            this.toastr.warning('Por favor, informe um nome')
            return
        }
        if (!this.editingPreset.localPort) {
            this.toastr.warning('Por favor, informe a porta local')
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
        this.toastr.success('Predefinição salva!')
        this.cancelEdit()
    }

    deletePreset(index: number): void {
        const current = [...this.presets]
        current.splice(index, 1)
        this.forwardService.savePresets(current)
        this.toastr.info('Predefinição excluída')
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
                this.toastr.success('Ícone SVG carregado!')
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
                    this.toastr.success(`${count} predefinições importadas com sucesso!`)
                }
            } catch {
                this.toastr.error('Formato de arquivo JSON inválido.')
            }
        }
        reader.readAsText(file)
        event.target.value = ''
    }
}
