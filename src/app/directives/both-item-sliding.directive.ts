import { Directive, ElementRef, Renderer2, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { IonItemSliding, DomController } from '@ionic/angular';
import { Subscription, fromEvent } from 'rxjs';

@Directive({
  selector: '[appBothItemSliding]',
})
export class BothItemSlidingDirective implements AfterViewInit, OnDestroy {
  @Input('sliding') itemSliding: IonItemSliding;
  @Input('leftName') leftName: string;
  @Input('rightName') rightName: string;

  private leftBox: HTMLElement;
  private rightBox: HTMLElement;
  private ionitemStyle: CSSStyleDeclaration;
  private aniBtnBox: any;
  private parentEle: any;

  private isOpen: boolean = false;
  private canChange: boolean = false;
  private scrollFlag: boolean = false;
  private itemXPos: number;
  private childBtnCnt: number = 0;
  private showIndex: number = 1;
  // Percentage of each button
  private eachPercent: number = 0;
  // Percentage of total buttons
  private allPercent: number = 0;
  private lastDate: number = 0;

  // subscription variables for destroy
  private dragStartSub: Subscription;
  private dragSub: Subscription;
  private dragEndSub: Subscription;

  constructor(
    private ele: ElementRef,
    private renderer: Renderer2,
    private domCtrl: DomController
  ) { }

  ngAfterViewInit() {
    this.leftBox = this.ele.nativeElement.getElementsByClassName(this.leftName)[0] || '';
    this.rightBox = this.ele.nativeElement.getElementsByClassName(this.rightName)[0] || '';
    const ionitem = this.ele.nativeElement.querySelector('ion-item');
    this.parentEle = this.ele.nativeElement.parentElement;
    this.ionitemStyle = window.getComputedStyle(ionitem, null);

    this.dragStartSub = fromEvent(this.ele.nativeElement, 'touchstart').subscribe(() => {
      this.removeChildrenAni(this.aniBtnBox);
      this.isOpen = this.checkItemOpen();
      this.parentEle.style.setProperty('--scroll', this.isOpen ? 1 : 0);
      this.valReset();
    });

    this.dragSub = this.itemSliding.ionDrag.subscribe((event) => {
      window.requestAnimationFrame(() => {
        this.dragEvent();
      });
    });

    this.dragEndSub = fromEvent(this.ele.nativeElement, 'touchend').subscribe(() => {
      this.touchEndAni();
    });
  }

  ngOnDestroy() {
    if (this.dragStartSub) { this.dragStartSub.unsubscribe(); }
    if (this.dragSub) { this.dragSub.unsubscribe(); }
    if (this.dragEndSub) { this.dragEndSub.unsubscribe(); }
  }

  public touchEndAni() {
    this.domCtrl.write(() => {
      this.itemSliding.getOpenAmount().then((val) => {
        this.itemXPos = Math.abs(val);
        if (!this.scrollFlag) { return; }
        this.allPercent = this.itemXPos / (this.aniBtnBox.offsetWidth) * this.childBtnCnt;
        if (this.itemXPos > this.aniBtnBox.offsetWidth || this.allPercent > this.childBtnCnt) {
          this.allPercent = this.childBtnCnt;
        }

        this.canChange = parseFloat((this.isOpen ? this.childBtnCnt - this.allPercent : this.allPercent).toFixed(2)) > this.childBtnCnt / 2;
        const canRe = this.canChange && this.isOpen || !this.canChange && !this.isOpen;
        const isSmallerIndex = (this.containClass(this.aniBtnBox) && canRe) || (this.containClass(this.aniBtnBox, true) && !canRe);
        this.renderer.addClass(this.aniBtnBox.children[this.showIndex], 'ic-run');

        if (this.itemXPos < this.aniBtnBox.offsetWidth) {
          if (canRe) {
            this.parentEle.style.setProperty('--scroll', 1 - this.eachPercent);
            this.renderer.addClass(this.aniBtnBox.children[this.showIndex], 'ic-re');
          } else {
            this.renderer.addClass(this.aniBtnBox.children[this.showIndex], 'ic-run');
          }
          this.addChildrenAni(isSmallerIndex, canRe ? false : true);
        }
        if (this.canChange) { this.isOpen = !this.isOpen; }
        this.canChange = false;

        this.ele.nativeElement.addEventListener('transitionend', () => {
          this.removeChildrenAni(this.aniBtnBox);
          this.parentEle.style.removeProperty('--scroll');
        }, { once: true });
      });
    });
  }

  public deleteAni(ele: HTMLElement, deleteFunc?) {
    ele = ele[`el`].parentElement;
    this.renderer.addClass(ele, 'del-item');
    this.renderer.setStyle(ele, 'height', `${ele.scrollHeight}px`);
    this.renderer.setStyle(ele, 'transform', `translateX(-${ele.offsetWidth}px)`);
    ele.addEventListener('transitionend', (event) => {
      switch (event.propertyName) {
        case 'transform':
          this.renderer.setStyle(ele, 'height', '0px');
          break;
        case 'height':
          if (deleteFunc) { deleteFunc(); }
          break;
        default: break;
      }
    });
  }

  public closeItemAni(ele) {
    ele = ele[`el`].parentElement;
    if (ele && ele.closeOpened) {
      return ele.closeOpened();
    }
  }

  private containClass(ele, isRightName?): boolean {
    return ele.classList.contains(isRightName ? this.rightName : this.leftName);
  }

  private dragEvent() {
    const current = Math.round(parseFloat(this.ionitemStyle.transform.split(',')[4]));
    if (this.itemXPos === current) { return; }
    const openToClose = Math.abs(this.itemXPos) > Math.abs(current);
    this.itemXPos = current;
    if (isNaN(this.itemXPos)) { this.itemXPos = 0; }

    const isLeft = this.itemXPos > 0 ? true : false;
    const currentBox = isLeft ? this.leftBox : this.rightBox;
    if (!this.aniBtnBox || this.containClass(this.aniBtnBox) !== this.containClass(currentBox)) {
      this.removeChildrenAni(this.aniBtnBox);
      this.aniBtnBox = currentBox;
      this.removeChildrenAni(this.aniBtnBox);
      this.isOpen = false;
      this.childBtnCnt = parseInt(this.aniBtnBox.children.length, 10);
      this.showIndex = isLeft ? 0 : this.childBtnCnt - 1;
    }
    this.renderer.addClass(this.aniBtnBox.children[this.showIndex], 'ic-ani');

    if (Math.abs(this.itemXPos) > this.aniBtnBox.offsetWidth) {
      this.eachPercent = 1;
    } else {
      this.allPercent = Math.abs(this.itemXPos) / (this.aniBtnBox.offsetWidth) * this.childBtnCnt;
      this.allPercent = parseFloat(this.allPercent.toFixed(4));
      this.eachPercent = this.allPercent - parseInt(this.allPercent as any, 10);

      const intPercent = parseInt(this.allPercent.toString(), 10);
      const canLeftBtnAni = isLeft && this.showIndex !== intPercent;
      const canRightBtnAni = !isLeft && this.childBtnCnt - this.showIndex - 1 !== intPercent;

      if (intPercent !== this.childBtnCnt && (canLeftBtnAni || canRightBtnAni)) {
        this.renderer.removeClass(this.aniBtnBox.children[this.showIndex], 'ic-ani');
        this.renderer.removeStyle(this.aniBtnBox.children[this.showIndex], 'opacity');
        this.showIndex = canLeftBtnAni ? intPercent : this.childBtnCnt - intPercent - 1;
        if (!openToClose) {
          if (canLeftBtnAni && this.showIndex === this.childBtnCnt || canRightBtnAni && this.showIndex === 0) { return; }
          this.renderer.setStyle(this.aniBtnBox.children[(canLeftBtnAni ? 0 : 0) + this.showIndex], 'opacity', 0);
        }
      }
    }
    if (this.isOpen && this.eachPercent === 0) { this.eachPercent = 1; }
    this.parentEle.style.setProperty('--scroll', this.eachPercent);
    this.scrollFlag = true;
  }

  private addChildrenAni(isSmaller: boolean, isOpacity: boolean) {
    if (isSmaller) {
      for (let i = this.showIndex; i >= 0; i--) {
        if (isOpacity && i !== 0) { this.renderer.setStyle(this.aniBtnBox.children[i - 1], 'opacity', 0); }
        this.aniBtnBox.children[i].addEventListener('animationend', () => {
          if (i !== 0) { this.runAni(i - 1, (isOpacity ? 'opacity' : 'ic-re')); }
        }, { once: true });
      }
    } else {
      for (let i = this.showIndex; i < this.childBtnCnt; i++) {
        if (isOpacity && i + 1 !== this.childBtnCnt) { this.renderer.setStyle(this.aniBtnBox.children[i + 1], 'opacity', 0); }
        this.aniBtnBox.children[i].addEventListener('animationend', () => {
          if (i + 1 !== this.childBtnCnt) { this.runAni(i + 1, (isOpacity ? 'opacity' : 'ic-re')); }
        }, { once: true });
      }
    }
  }

  private runAni(index: number, diffAttr: string) {
    const childEle = this.aniBtnBox.children[index];
    if (diffAttr === 'opacity') {
      this.renderer.removeStyle(childEle, 'opacity');
    } else if (diffAttr === 'ic-re') {
      this.renderer.addClass(childEle, 'ic-re');
    }
    this.renderer.addClass(childEle, 'ic-ani');
    this.renderer.addClass(childEle, 'ic-run');
  }

  private removeChildrenAni(ele) {
    if (!ele) { return; }
    for (const child of ele.children) {
      this.renderer.removeClass(child, 'ic-ani');
      this.renderer.removeClass(child, 'ic-re');
      this.renderer.removeClass(child, 'ic-run');
      this.renderer.removeStyle(child, 'opacity');
    }
  }

  private checkItemOpen(): boolean {
    const itemTransform = parseFloat(this.ionitemStyle.transform.split(',')[4]);
    if (this.aniBtnBox === this.leftBox) {
      return !isNaN(itemTransform) && itemTransform >= this.leftBox.offsetWidth / 2;
    } else {
      return !isNaN(itemTransform) && itemTransform <= -10;
    }
  }

  private valReset() {
    this.eachPercent = 0;
    if (!this.isOpen) { this.aniBtnBox = null; }
    this.itemXPos = 0;
    this.scrollFlag = false;
    this.showIndex = this.isOpen ? this.childBtnCnt - 1 : 0;
  }

  private getSpeed(timeStamp): number {
    const delayInMs = timeStamp - this.lastDate;
    const offset = Math.abs(this.itemXPos);
    const speedInpxPerMs = Math.abs(offset / delayInMs);
    return speedInpxPerMs;
  }
}
