export interface PortForwardPreset {
    id: string
    name: string
    category?: string
    type: 'local' | 'remote' | 'dynamic'
    localHost?: string
    localPort: number
    targetAddress: string
    targetPort: number
    description: string
    icon?: string
}

export interface QuickPortForwardConfig {
    presets: PortForwardPreset[]
    presetsUrl: string
    enablePortsPatch: boolean
    showToolbarButton: boolean
}
