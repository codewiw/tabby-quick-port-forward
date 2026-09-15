# Tabby Quick Port Forward

SSH port forwarding plugin for [Tabby](https://tabby.sh) with presets and service icons.

![Port Forwarding](docs/screenshots/modal-tunnels.png)

## Features

- Start and stop SSH tunnels with one click
- Presets for popular services (PostgreSQL, MySQL, Redis, MongoDB, Docker, Nginx, etc.)
- Add custom services with SVG or FontAwesome icons
- Fetch catalog updates from GitHub
- Import and export presets (JSON)
- Integrated directly into the SSH session toolbar

## Screenshots

| My Tunnels | Add Tunnel | Settings |
|:---:|:---:|:---:|
| ![My Tunnels](docs/screenshots/modal-tunnels.png) | ![Add Tunnel](docs/screenshots/modal-add.png) | ![Settings](docs/screenshots/settings.png) |

## Installation

In Tabby:
1. Open **Settings** > **Plugins**
2. Search for `tabby-quick-port-forward`
3. Click **Install**

### Manual

```bash
# Linux / macOS:
cd ~/.config/tabby/plugins/node_modules
git clone https://github.com/codewiw/tabby-quick-port-forward.git

# Windows (PowerShell):
cd "$env:APPDATA\tabby\plugins\node_modules"
git clone https://github.com/codewiw/tabby-quick-port-forward.git
```

## License

[MIT](LICENSE)
