import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ParallaxHeaderComponent } from './parallax-header/parallax-header.component';


@NgModule({
  declarations: [
    ParallaxHeaderComponent,
  ],
  imports: [
    IonicModule,
    CommonModule,
  ],
  exports: [
    ParallaxHeaderComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ComponentsModule {}
