import { Component, Input } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'

@Component({
    selector: 'quick-forward-icon',
    template: `
        <div class="quick-forward-icon-container" [style.width.px]="size" [style.height.px]="size">
            <div *ngIf="isSvg" class="svg-wrapper" [innerHTML]="safeSvg"></div>
            <i *ngIf="!isSvg && icon" [class]="icon" [style.font-size.px]="size * 0.75"></i>
            <i *ngIf="!icon" class="fas fa-plug text-muted" [style.font-size.px]="size * 0.75"></i>
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
    @Input() size: number = 24

    constructor(private sanitizer: DomSanitizer) {}

    get isSvg(): boolean {
        return !!this.icon && this.icon.trim().startsWith('<svg');
    }

    get safeSvg(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(this.icon);
    }
}
