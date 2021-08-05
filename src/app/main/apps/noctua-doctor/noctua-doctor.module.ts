import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NoctuaSharedModule } from '@noctua/shared.module';
import { ContextMenuModule } from 'ngx-contextmenu';
import { NoctuaSearchBaseModule } from '@noctua.search';
import { NoctuaFooterModule } from 'app/layout/components/footer/footer.module';
import { NoctuaFormModule } from '../noctua-form';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { NoctuaDoctorComponent } from './noctua-doctor.component';
import { TermCamsComponent } from './apps/term-cams/term-cams.component';
import { DoctorReviewChangesComponent } from './apps/review-changes/review-changes.component';

const routes = [
  {
    path: 'doctor',
    component: NoctuaDoctorComponent
  }
];

@NgModule({
  imports: [
    NoctuaSharedModule,
    CommonModule,
    RouterModule.forChild(routes),
    ContextMenuModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    NoctuaSearchBaseModule,
    NoctuaFooterModule,
    NoctuaFormModule,
    PerfectScrollbarModule
  ],
  declarations: [
    NoctuaDoctorComponent,
    TermCamsComponent,
    DoctorReviewChangesComponent,
  ]
})

export class NoctuaDoctorModule {
}
