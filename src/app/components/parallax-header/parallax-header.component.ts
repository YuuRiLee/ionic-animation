import { Component, Input, ElementRef, Renderer2, AfterViewInit, OnDestroy } from '@angular/core';
import { Platform, IonContent, DomController } from '@ionic/angular';
import { AnimationService } from 'src/app/services/animation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'parallax-header',
  templateUrl: './parallax-header.component.html',
  styleUrls: ['./parallax-header.component.scss'],
})
export class ParallaxHeaderComponent implements AfterViewInit, OnDestroy {
  // Can change values
  private _imageUrl: string;
  private _subName: string;
  private _title: string;
  private _titlebgColor;

  @Input() set imageUrl(path) { this.changeInputVal('url', path); }
  @Input() set subName(sub) { this.changeInputVal('sub', sub); }
  @Input() set title(title) { this.changeInputVal('title', title); }
  @Input() set titlebgColor(color) { this.changeInputVal('bgColor', color); }

  @Input('scrollContent') content: IonContent;
  @Input('contentWrapp') contentWrapp: HTMLElement;
  @Input() titleColor: string = '#FFF';
  @Input() backimage: string;
  @Input() maximumHeight: number = 128;
  @Input() isBackimage: boolean = true;
  @Input() titleCenter: boolean = false;
  @Input() autoReturnFlag: boolean = false;

  // Has other Element ex -> search-bar
  @Input() otherHeaderEle: any;
  // .className or tagName
  @Input() otherEleName: string;
  private otherEle: HTMLElement;
  private otherEleHeight: number = 0;
  private searchWrapEle: HTMLElement;

  private header: HTMLElement;
  private toolbar: HTMLElement;
  private imageOverlay: HTMLElement;
  private scrollContent: HTMLElement;
  private headerMinHeight: number;
  private overlayTitle: HTMLElement;
  private ionTitle: any;
  private subSpace: HTMLElement;

  private scrollTop: number;
  private beforeProgress: number;
  private safeArea: number = 0;

  private dinamicValFlag: boolean = false;
  // Indicates whether the finger touch is maintained
  private touching: boolean = false;
  // Indicates whether scrawling is in progress or not
  private scrolling: boolean = false;
  private isShowOverlay: boolean = true;
  private imgHeaderHeight: number;
  private ticking = false;
  private scale: number;
  private fastFlag: boolean = false;

  // subscribe
  private scrollSub: Subscription;
  private scrollEndSub: Subscription;
  private scrollStartSub: Subscription;

  constructor(
    private headerRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private plt: Platform,
    private domCtrl: DomController,
    private animation: AnimationService
  ) { }

  ngAfterViewInit() {
    this.domCtrl.write(() => {
      this.initElements();
      this.initStyles();
      this.initEvent(this.content);
    });
  }

  ngOnDestroy() {
    if (this.scrollStartSub) { this.scrollStartSub.unsubscribe(); }
    if (this.scrollSub) { this.scrollSub.unsubscribe(); }
    if (this.scrollEndSub) { this.scrollEndSub.unsubscribe(); }
  }

  private initElements() {
    this.header = this.headerRef.nativeElement;
    this.toolbar = this.header.querySelector('ion-toolbar');
    if (!this.toolbar) { throw new Error('Parallax directive requires a toolbar or navbar element on the page to work.'); }
    this.ionTitle = this.header.querySelector('ion-title');
    this.searchWrapEle = this.header.parentElement.querySelector('.search-wrapp');

    this.scrollContent = this.content[`el`].shadowRoot.querySelector('.inner-scroll');
    if (!this.scrollContent) { throw new Error('Parallax directive requires an <ion-content> element on the page to work.'); }

    // Create image overlay
    this.imageOverlay = this.renderer.createElement('div');
    this.renderer.addClass(this.imageOverlay, 'image-overlay');
    this.header.appendChild(this.imageOverlay);

    // Create subSpace
    if (this._subName) {
      this.subSpace = this.renderer.createElement('div');
      this.subSpace.innerText = this._subName;
      this.renderer.addClass(this.subSpace, 'sub-title');
      this.imageOverlay.appendChild(this.subSpace);
    }

    // Copy title
    this.overlayTitle = this.ionTitle && this.ionTitle.cloneNode(true) as HTMLElement;

    if (this.overlayTitle) {
      this.overlayTitle.addEventListener('click', () => {
        this.ionTitle.click();
      });
      if (this.isAndroid()) {
        // If md, make it look the same as iOS for title animation
        this.renderer.addClass(this.ionTitle, 'md-to-ios');
      }
      if (!this.overlayTitle.firstElementChild) { throw new Error('Parallax directive requires an child element in <ion-title>'); }
      this.renderer.addClass(this.overlayTitle, 'parallax-title');
      const toolbarTitle = this.overlayTitle.shadowRoot.querySelector('.toolbar-title');
      if (toolbarTitle) {
        this.renderer.setStyle(toolbarTitle, 'pointer-events', 'unset');
        this.renderer.setStyle(this.ionTitle.shadowRoot.querySelector('.toolbar-title'), 'text-overflow', 'clip');
      }
      this.imageOverlay.appendChild(this.overlayTitle);
    }
    if (this.otherEleName) {
      this.otherEle = this.content[`el`].querySelector(this.otherEleName);
      if (!this.otherEle) { throw new Error('Parallax directive requires an child element in <ion-title>'); }
      this.otherEleHeight = (this.otherEle as HTMLElement).offsetHeight;
    }
  }

  private getSafeArea(firstFlag?: boolean) {
    const safeArea = parseInt(getComputedStyle(this.content[`el`]).getPropertyValue('--ion-safe-area-top'), 10);
    if (firstFlag || this.safeArea !== safeArea && this.imageOverlay) {
      this.safeArea = safeArea;
      this.imgHeaderHeight = this.maximumHeight = this.maximumHeight + this.safeArea;
      this.imageOverlay.style.setProperty('--image-header-height', `${this.maximumHeight}px`);
      this.dinamicValFlag = false;
      if (this.contentWrapp) {
        this.renderer.setStyle(this.contentWrapp, 'top', `${this.maximumHeight}px`);
        this.renderer.setStyle(this.contentWrapp, 'position', 'relative');
      }
    }
  }

  private initStyles() {
    if (!this.scrollContent || !toolbar) { return; }
    this.headerMinHeight = this.toolbar.offsetHeight;
    this.getSafeArea(true);
    this.renderer.setStyle(this.header, 'position', 'absolute');
    const paddingTop = this.searchWrapEle
      ? (this.searchWrapEle.firstChild as HTMLElement).offsetHeight + this.maximumHeight
      : this.maximumHeight;
    this.renderer.setStyle(this.scrollContent, 'padding-top', `${paddingTop}px`);
    if (this.overlayTitle) {
      this.renderer.addClass(this.ionTitle, 'opacity-ctrl');
      this.renderer.setStyle(this.overlayTitle, 'color', this.titleColor || 'black');
      this.renderer.addClass(this.overlayTitle.firstElementChild, 'title');
      if (!this._title) { this._title = 'MY_WORKSPACE'; }
      (this.ionTitle.firstElementChild as HTMLElement).innerText = this._title;
      (this.overlayTitle.firstElementChild as HTMLElement).innerText = this._title;
      this.setDynamicVal();
    }
    if (this._imageUrl) {
      this.renderer.setStyle(
        this.imageOverlay,
        'background-image',
        `linear-gradient(to bottom, #0006, #0004 25%, #0000), url(${this._imageUrl || ''})`
      );
    } else {
      this.renderer.setStyle(this.imageOverlay, 'background-color', `${this._titlebgColor || 'var(--ion-color-primary)'}`);
    }
  }

  private initEvent(scrollArea) {
    const panFunc = {
      onStart: () => this.touching = true,
      onEnd: () => {
        this.touching = false;
        if (!this.scrolling) { this.autoReturn(); }
      },
    };

    const scrollFunc = {
      onScroll: (content: CustomEvent) => this.ionScrollAni(content.detail.scrollTop),
      onEnd: () => {
        this.scrolling = false;
        if (this.touching) { return; }
        this.autoReturn();
      },
    };

    this.animation.initEvent(scrollArea, panFunc, scrollFunc);
  }

  private ionScrollAni(top) {
    this.scrolling = true;
    if (top <= 0) { this.resetVal(); }
    const canScrollTop = this.otherEleName ? this.otherEleHeight + this.maximumHeight : this.maximumHeight;
    if ((top > canScrollTop && this.imgHeaderHeight <= this.headerMinHeight)
      || (this.otherEleName && top <= this.otherEleHeight && top >= 0)) {
      return;
    }
    if (!this.ticking) {
      this.domCtrl.write(() => {
        this.updateElasticHeader(top);
      });
      this.ticking = true;
    }
  }

  private autoReturn() {
    if (!this.autoReturnFlag) { return; }
    const headerDiff = this.maximumHeight - this.headerMinHeight;
    if (this.scrollTop >= headerDiff || this.otherEleName && this.scrollContent.scrollTop <= this.otherEleHeight) { return; }
    let position = 0;
    if (this.scrollTop < headerDiff) {
      if (this.scrollTop > headerDiff / 2) {
        position = this.maximumHeight - this.headerMinHeight;
      } else {
        position = this.otherEleHeight;
      }
    }
    this.content.scrollToPoint(0, position, 300);
  }

  private resetVal() {
    if (this.imageOverlay.style.height === (this.maximumHeight + 'px')) { return; }
    this.imageOverlay.style.removeProperty('--scroll');
    // FIXME
    // this.renderer.removeStyle(this.ionTitle, 'transition');
    // this.renderer.removeStyle(this.overlayTitle, 'transition');
    this.renderer.addClass(this.ionTitle, 'opacity-ctrl');
    this.renderer.removeClass(this.overlayTitle, 'opacity-ctrl');
  }

  private updateElasticHeader(top: number) {
    this.ticking = false;
    if (!this.dinamicValFlag) {
      this.setDynamicVal();
    }
    this.scrolling = true;
    top = this.otherEleName ? top - this.otherEleHeight : top;
    if (!this.scrollContent || !toolbar || this.scrollTop === top) { return; }

    // Parallax total progress
    let progress = (this.maximumHeight - top - this.headerMinHeight) / (this.maximumHeight - this.headerMinHeight);
    progress = parseFloat((1 - Math.max(progress, 0)).toFixed(4));
    progress = progress < 0 ? 0 : progress;

    if (this.beforeProgress === progress) {
      this.beforeProgress = progress;
      this.scrollTop = top;

      return;
    }
    this.headerMinHeight = this.toolbar.offsetHeight;

    // ion-header: set height
    let targetHeight = this.maximumHeight - top;
    targetHeight = Math.max(targetHeight, this.headerMinHeight);
    const height = targetHeight > this.maximumHeight ? this.maximumHeight : targetHeight;

    if (Math.abs(this.imgHeaderHeight - height) > (this.maximumHeight - this.headerMinHeight) / 2) {
      const dir = this.scrollTop > top ? 'up' : 'down';
      this.renderer.setAttribute(this.imageOverlay, 'scroll-dir', dir);
      this.fastFlag = true;
      this.overlayTitle.addEventListener('transitionend', (e) => {
        this.fastFlag = false;
      }, { once: true });
    } else if (!this.fastFlag) {
      this.renderer.removeAttribute(this.imageOverlay, 'scroll-dir');
    }

    this.imgHeaderHeight = height;
    this.imageOverlay.style.setProperty('--image-header-height', `${this.imgHeaderHeight}px`);
    if (this.searchWrapEle) { this.searchWrapEle.style.setProperty('--search-pos', `${(this.maximumHeight - height) * -1}px`); }

    if (this.overlayTitle) {
      const scale = 1 - progress * (1 - this.scale) > 1 ? 1 : 1 - progress * (1 - this.scale);
      this.overlayTitle.style.setProperty('--scale', scale.toString());
      this.imageOverlay.style.setProperty('--scroll', `${progress}`);
      if (!this.isShowOverlay && targetHeight > this.headerMinHeight) {
        // FIXME
        // this.renderer.removeClass(this.header, 'opacity-transition');
        // this.renderer.addClass(this.ionTitle, 'opacity-ctrl');
        // this.renderer.removeClass(this.overlayTitle, 'opacity-ctrl');
        this.isShowOverlay = true;
      } else if (this.isShowOverlay && targetHeight <= this.headerMinHeight) {
        // FIXME
        // this.renderer.addClass(this.header, 'opacity-transition');
        // this.renderer.removeClass(this.ionTitle, 'opacity-ctrl');
        // this.renderer.addClass(this.overlayTitle, 'opacity-ctrl');
        this.isShowOverlay = false;
      }
    }
    this.beforeProgress = progress;
    this.scrollTop = top;
  }

  private isAndroid(): boolean {
    return this.plt.platforms().includes('android') ? true : false;
  }

  private changeInputVal(type: string, val: any) {
    switch (type) {
      case 'url':
        this._imageUrl = val || '/assets/imgs/back-image.jpg';
        if (this.imageOverlay) {
          this.renderer.setStyle(
            this.imageOverlay,
            'background-image',
            `linear-gradient(to bottom, #0006, #0004 25%, #0002), url(${this._imageUrl})`
          );
        }
        break;
      case 'bgColor':
        if (val && val.indexOf('project') !== -1) { val = `var(--ion-color-${val})`; }
        this._titlebgColor = val;
        if (this.imageOverlay) { this.renderer.setStyle(this.imageOverlay, 'background-color', `${val || 'var(--ion-color-primary)'}`); }
        break;
      case 'sub':
        if (!val) { val = 'unknown'; }
        this._subName = val;
        if (this.subSpace) { this.subSpace.innerText = val; }
        break;
      case 'title':
        this._title = val;
        if (this.overlayTitle && this.overlayTitle.firstElementChild) {
          (this.overlayTitle.firstElementChild as HTMLElement).innerText = val;
          (this.ionTitle.firstElementChild as HTMLElement).innerText = val;
        }
        this.dinamicValFlag = false;
        break;
      default: break;
    }
  }

  private setDynamicVal() {
    const orgTitleWidth = this.ionTitle.firstElementChild.offsetWidth;
    if (orgTitleWidth === 0 || this.ionTitle.getBoundingClientRect().x !== 0) { return; }
    this.renderer.removeClass(this.overlayTitle, 'add-ani');
    const ionTitleCss = window.getComputedStyle(this.ionTitle, null);
    const ionTitleSize = parseInt(ionTitleCss.fontSize.replace('px', ''), 10);
    const overlayTitleSize = parseInt(window.getComputedStyle(this.overlayTitle, null).fontSize.replace('px', ''), 10);
    this.overlayTitle.style.setProperty('--scale', `1`);

    this.scale = parseFloat((ionTitleSize / overlayTitleSize).toFixed(2));
    const overlayLeftPadding = parseInt(getComputedStyle(this.header).getPropertyValue('--title-left-padding').replace('px', ''), 10);
    const ionTitleLeftPadding = parseInt(ionTitleCss.paddingLeft.replace('px', ''), 10);
    const flag = orgTitleWidth > this.ionTitle.offsetWidth - ionTitleLeftPadding * 2;
    let xPos: number;
    let yPos: number;

    if (this.titleCenter) {
      const titleX = this.ionTitle.firstElementChild.getBoundingClientRect().x;
      xPos = titleX - (orgTitleWidth / this.scale / 2 - orgTitleWidth / 2);
      xPos = (xPos < 0 && !flag || xPos > 0) ? xPos - overlayLeftPadding : 0;
    } else {
      const start = (this.content[`el`].offsetWidth - ((this.content[`el`].offsetWidth - overlayLeftPadding * 2) * this.scale)) / 2;
      xPos = (start - ionTitleLeftPadding) * -1;
    }
    yPos = (this.maximumHeight - overlayLeftPadding * 2 - this.header.offsetHeight)
      * this.scale / (this.isAndroid() ? 3 : 2) + this.safeArea / 2;
    yPos = parseFloat((yPos / 2).toFixed(2));
    this.overlayTitle.style.setProperty('--x', `${xPos}px`);
    this.overlayTitle.style.setProperty('--y', `${yPos}px`);

    if (orgTitleWidth > this.ionTitle.offsetWidth - ionTitleLeftPadding * 2) {
      this.renderer.addClass(this.ionTitle.firstElementChild, 'title');
    }
    this.renderer.addClass(this.overlayTitle, 'add-ani');
    this.dinamicValFlag = true;
  }
}
