import { Injectable } from '@angular/core'
import { AppService, ConfigService } from 'tabby-core'
import { createServer, Server, Socket } from 'net'
import { PortForwardPreset } from '../types'

export enum PortForwardType {
    Local = 'Local',
    Remote = 'Remote',
    Dynamic = 'Dynamic',
}

export interface ForwardedPortConfig {
    type: PortForwardType
    host: string
    port: number
    targetAddress: string
    targetPort: number
    description: string
}

export class QuickForwardedPort implements ForwardedPortConfig {
    type: PortForwardType = PortForwardType.Local
    host = '127.0.0.1'
    port: number
    targetAddress: string
    targetPort: number
    description: string
    private listener: Server | null = null

    async startLocalListener(callback: (accept: () => Socket, reject: () => void, sourceAddress: string|null, sourcePort: number|null, targetAddress: string, targetPort: number) => void): Promise<void> {
        if (this.type === PortForwardType.Local) {
            const listener = this.listener = createServer(s => callback(
                () => s,
                () => s.destroy(),
                s.remoteAddress ?? null,
                s.remotePort ?? null,
                this.targetAddress,
                this.targetPort,
            ))
            return new Promise((resolve, reject) => {
                listener.listen(this.port, this.host)
                listener.on('error', reject)
                listener.on('listening', resolve)
            })
        } else if (this.type === PortForwardType.Dynamic) {
            try {
                const socksv5 = require('@luminati-io/socksv5')
                return new Promise((resolve, reject) => {
                    this.listener = socksv5.createServer((info: any, acceptConnection: any, rejectConnection: any) => {
                        callback(
                            () => acceptConnection(true),
                            () => rejectConnection(),
                            null,
                            null,
                            info.dstAddr,
                            info.dstPort,
                        )
                    }) as Server
                    this.listener.on('error', reject)
                    this.listener.listen(this.port, this.host, resolve)
                    this.listener['useAuth'](socksv5.auth.None())
                })
            } catch {
                throw new Error('SOCKS5 not available in this environment')
            }
        } else {
            throw new Error('Invalid forward type for local listener')
        }
    }

    stopLocalListener(): void {
        this.listener?.close()
    }

    toString(): string {
        if (this.type === PortForwardType.Local) {
            return `(local) ${this.host}:${this.port} -> (remote) ${this.targetAddress}:${this.targetPort}`
        } else if (this.type === PortForwardType.Remote) {
            return `(remote) ${this.host}:${this.port} -> (local) ${this.targetAddress}:${this.targetPort}`
        } else {
            return `(dynamic) ${this.host}:${this.port}`
        }
    }
}

export function instantiateForwardedPort(config: Partial<ForwardedPortConfig>): any {
    let NativeClass: any = null
    try {
        for (const k of Object.keys(require.cache || {})) {
            if (k.includes('tabby-ssh') && k.includes('forwards')) {
                NativeClass = require.cache[k]?.exports?.ForwardedPort
                if (NativeClass) break
            }
        }
    } catch {}

    const instance = NativeClass ? new NativeClass() : new QuickForwardedPort()
    Object.assign(instance, config)
    return instance
}

@Injectable({ providedIn: 'root' })
export class QuickPortForwardService {
    constructor(
        private app: AppService,
        private config: ConfigService,
    ) {}

    get presets(): PortForwardPreset[] {
        return this.config.store?.plugin?.quickPortForward?.presets || []
    }

    savePresets(presets: PortForwardPreset[]): void {
        if (!this.config.store.plugin) this.config.store.plugin = {}
        if (!this.config.store.plugin.quickPortForward) this.config.store.plugin.quickPortForward = {}
        this.config.store.plugin.quickPortForward.presets = presets
        this.config.save()
    }

    getActiveTab(): any {
        return this.app.activeTab
    }

    getActiveSSHSession(): any {
        const tab = this.getActiveTab()
        return this.resolveSessionFromTab(tab)
    }

    resolveSessionFromTab(tab: any): any {
        if (!tab) return null
        if (tab.sshSession) return tab.sshSession
        if (tab.session && tab.session.forwardedPorts !== undefined) return tab.session
        if (tab.focusedTab) return this.resolveSessionFromTab(tab.focusedTab)
        return null
    }

    isPresetForwarded(session: any, preset: PortForwardPreset): boolean {
        if (!session || !session.forwardedPorts) return false
        const targetType = preset.type === 'remote' ? PortForwardType.Remote : (preset.type === 'dynamic' ? PortForwardType.Dynamic : PortForwardType.Local)
        return session.forwardedPorts.some((fw: any) => 
            fw.type === targetType &&
            Number(fw.port) === Number(preset.localPort)
        )
    }

    getForwardForPreset(session: any, preset: PortForwardPreset): any {
        if (!session || !session.forwardedPorts) return null
        const targetType = preset.type === 'remote' ? PortForwardType.Remote : (preset.type === 'dynamic' ? PortForwardType.Dynamic : PortForwardType.Local)
        return session.forwardedPorts.find((fw: any) => 
            fw.type === targetType &&
            Number(fw.port) === Number(preset.localPort)
        )
    }

    async togglePreset(session: any, preset: PortForwardPreset): Promise<boolean> {
        if (!session) throw new Error('No active SSH session')

        const existing = this.getForwardForPreset(session, preset)
        if (existing) {
            await session.removePortForward(existing)
            return false
        } else {
            const fwType = preset.type === 'remote' ? PortForwardType.Remote : (preset.type === 'dynamic' ? PortForwardType.Dynamic : PortForwardType.Local)
            const fw = instantiateForwardedPort({
                type: fwType,
                host: preset.localHost || '127.0.0.1',
                port: Number(preset.localPort),
                targetAddress: preset.targetAddress || '127.0.0.1',
                targetPort: Number(preset.targetPort || preset.localPort),
                description: preset.description || preset.name,
            })
            await session.addPortForward(fw)
            return true
        }
    }

    async removeForward(session: any, fw: any): Promise<void> {
        if (!session) return
        await session.removePortForward(fw)
    }

    async addCustomForward(session: any, config: ForwardedPortConfig): Promise<void> {
        if (!session) throw new Error('No active SSH session')
        const fw = instantiateForwardedPort(config)
        await session.addPortForward(fw)
    }

    async fetchPresetsFromGitHub(customUrl?: string): Promise<PortForwardPreset[]> {
        const url = customUrl || this.config.store?.plugin?.quickPortForward?.presetsUrl || 'https://raw.githubusercontent.com/codewiw/tabby-quick-port-forward/main/presets.json'
        
        try {
            const res = await fetch(url, { cache: 'no-cache' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (Array.isArray(data)) return data
            throw new Error('Invalid JSON format')
        } catch (err) {
            // Fallback to local presets.json if available
            try {
                const localPresets = require('../../presets.json')
                if (Array.isArray(localPresets)) return localPresets
            } catch {}
            throw err
        }
    }
}
