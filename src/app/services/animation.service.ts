import { Injectable } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { fromEventPattern, Observable, zip } from 'rxjs';
import { switchMap, tap, takeUntil, filter } from 'rxjs/operators';
import * as Hammer from 'hammerjs';

@Injectable({
  providedIn: 'root',
})

export class AnimationService {
  public content$;

  public initEvent(scrollArea: IonContent, panFunc?, scrollFunc?) {
    const mc = new Hammer(scrollArea[`el`], {
      inputClass: Hammer.TouchMouseInput,
      touchAction: 'auto',
    });
    const panning = new Hammer.Pan({ event: 'pan', direction: Hammer.DIRECTION_ALL, enable: true });
    mc.add(panning);
    const pan$ = fromEventPattern(handler =>
      mc.on('panstart panend', handler)
    );

    const hammer$ = this.gestureEvent(panFunc, scrollArea, pan$);
    const ionScroll$ = this.gestureEvent(scrollFunc, scrollArea);

    const initContent$ = zip(hammer$, ionScroll$);

    if (this.content$) {
      this.content$ = zip(this.content$, initContent$);
    } else {
      this.content$ = zip(hammer$, ionScroll$);
    }
  }
  private gestureEvent(props, scrollArea, panEv?) {
    const isHammer = panEv ? true : false;
    const start$ = isHammer ? this.selectEvt(panEv, 'panstart') : scrollArea.ionScrollStart;
    const move$ = scrollArea.ionScroll;
    const end$ = isHammer ? this.selectEvt(panEv, 'panend') : scrollArea.ionScrollEnd;

    return start$.pipe(
      switchMap(() => {
        if (props.onStart) {
          props.onStart();
        }
        const moveCng$ = move$.pipe(
          tap((content) => {
            if (!isHammer) { props.onScroll(content); }
          }),
          takeUntil(end$)
        );
        moveCng$.subscribe({
          next: null,
          error: null,
          complete: props.onEnd,
        });
        return moveCng$;
      })
    );
  }

  private selectEvt(evt: Observable<unknown>, type: string) {
    return evt.pipe(filter((e: any) => e.type === type));
  }

  public delete() {
    if (this.content$ && this.content$.unsubscribe) {
      this.content$.unsubscribe(() => {
        this.content$ = null;
      });
    } else {
      this.content$ = null;
    }
  }
}
