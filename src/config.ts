import { Injectable } from '@angular/core'
import { ConfigProvider } from 'tabby-core'

@Injectable()
export class QuickPortForwardConfigProvider extends ConfigProvider {
    defaults = {
        plugin: {
            quickPortForward: {
                presets: [],
                presetsUrl: 'https://raw.githubusercontent.com/codewiw/tabby-quick-port-forward/main/presets.json',
                enablePortsPatch: true,
                showToolbarButton: true,
            }
        }
    }
}
