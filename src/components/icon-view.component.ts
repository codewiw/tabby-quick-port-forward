import { Component, Input } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'

@Component({
    selector: 'quick-forward-icon',
    template: `
        <div class="quick-forward-icon-container" [style.width.px]="size" [style.height.px]="size">
            <span *ngIf="isSvg" class="svg-wrapper" [innerHTML]="safeSvg"></span>
            <img *ngIf="isImage" [src]="icon" [style.width.px]="size" [style.height.px]="size" style="object-fit: contain;" />
            <i *ngIf="isFontAwesome" [class]="fontAwesomeClass" [style.font-size.px]="size * 0.75"></i>
            <i *ngIf="!isSvg && !isImage && !isFontAwesome" class="fas fa-plug text-muted" [style.font-size.px]="size * 0.75"></i>
        </div>
    `,
    styles: [`
        .quick-forward-icon-container {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            vertical-align: middle;
            color: currentColor;
        }
        .svg-wrapper {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: inherit;
        }
        .svg-wrapper ::ng-deep svg {
            width: 100%;
            height: 100%;
            display: block;
            fill: currentColor;
        }
    `]
})
export class QuickForwardIconComponent {
    @Input() icon: string = ''
    @Input() size: number = 22

    constructor(private sanitizer: DomSanitizer) {}

    get isSvg(): boolean {
        return !!this.icon && this.icon.trim().toLowerCase().startsWith('<svg');
    }

    get isImage(): boolean {
        if (!this.icon) return false;
        const s = this.icon.trim();
        return s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://');
    }

    get isFontAwesome(): boolean {
        if (!this.icon || this.isSvg || this.isImage) return false;
        const s = this.icon.trim().toLowerCase();
        return s.includes('fa-') || s.includes('fas') || s.includes('far') || s.includes('fab');
    }

    get fontAwesomeClass(): string {
        let s = (this.icon || '').trim();
        if (!s) return 'fas fa-plug';
        // Auto-fix: if user typed "fa-database" or "database", normalize to "fas fa-database"
        if (!s.includes('fa-')) s = 'fa-' + s;
        if (!s.includes('fas ') && !s.includes('far ') && !s.includes('fab ') && !s.includes('fa-solid') && !s.includes('fa-regular') && !s.includes('fa-brands')) {
            s = 'fas ' + s;
        }
        return s;
    }

    get safeSvg(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(this.icon);
    }
}
