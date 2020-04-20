import { Component, OnInit, Input, ViewChild, AfterViewInit } from '@angular/core';
import { DomController } from '@ionic/angular';
import { AnimationService } from 'src/app/services/animation.service';
import { takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-parallax',
  templateUrl: './parallax.page.html',
  styleUrls: ['./parallax.page.scss'],
})
export class ParallaxPage implements OnInit, AfterViewInit {
  public imageUrl: string;
  public subName: string;
  public title: string;
  private _isActive: boolean = true;

  constructor(
    public domCtrl: DomController,
    private animation: AnimationService
  ) {}

  ngOnInit() {
    this.imageUrl = '/assets/imgs/back-image.jpg';
    this.subName = 'Sub Name';
    this.title = 'My Title';
  }

  ngAfterViewInit() {
    this.domCtrl.write(() => {
      this.animation.content$.pipe(
        takeWhile(_ => this._isActive)
      ).subscribe();
    });
  }
}
