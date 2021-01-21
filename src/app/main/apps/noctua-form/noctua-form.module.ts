import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NoctuaFormComponent } from './noctua-form.component';
import { NoctuaSharedModule } from './../../../../@noctua/shared.module';
import { NoctuaFormDialogService } from './services/dialog.service';
import { ContextMenuModule } from 'ngx-contextmenu';
import { AnnotonFormComponent } from './cam/annoton/annoton-form/annoton-form.component';
import { AnnotonEntityFormComponent } from './cam/annoton/annoton-entity-form/annoton-entity-form.component';
import { EntityFormComponent } from './cam/annoton/annoton-form/entity-form/entity-form.component';
import { CamTableComponent } from './cam/cam-table/cam-table.component';
import { CamFormComponent } from './cam/cam-form/cam-form.component';
import { AddEvidenceDialogComponent } from './dialogs/add-evidence/add-evidence.component';
import { AnnotonErrorsDialogComponent } from './dialogs/annoton-errors/annoton-errors.component';
import { BeforeSaveDialogComponent } from './dialogs/before-save/before-save.component';
import { CreateFromExistingDialogComponent } from './dialogs/create-from-existing/create-from-existing.component';
import { LinkToExistingDialogComponent } from './dialogs/link-to-existing/link-to-existing.component';
import { SelectEvidenceDialogComponent } from './dialogs/select-evidence/select-evidence.component';
import { SearchDatabaseDialogComponent } from './dialogs/search-database/search-database.component';
import { CamDiagramComponent } from './cam/cam-diagram/cam-diagram.component';
import { NodeComponent } from './cam/cam-diagram/nodes/node/node.component';
import { NodesContainerComponent } from './cam/cam-diagram/nodes/nodes-container.component';
import { CamDiagramService } from './cam/cam-diagram/services/cam-diagram.service';
import { CamTableService } from './cam/cam-table/services/cam-table.service';
import { NodeService } from './cam/cam-diagram/nodes/services/node.service';
import { AnnotonConnectorFormComponent } from './cam/annoton/annoton-connector-form/annoton-connector-form.component';
import { AnnotonEntityTableComponent } from './cam/cam-table/annoton-entity-table/annoton-entity-table.component';
import { AnnotonTableComponent } from './cam/cam-table/annoton-table/annoton-table.component';
import { TripleTableComponent } from './cam/cam-table/triple-table/triple-table.component';
import { EvidenceTableComponent } from './cam/cam-table/triple-table/evidence-table/evidence-table.component';
import { GraphPreviewComponent } from './cam/cam-preview/graph-preview/graph-preview.component';
import { NoctuaConfirmDialogModule } from '@noctua/components';
import { CamPreviewComponent } from './cam/cam-preview/cam-preview.component';
import { CamGraphComponent } from './cam/cam-preview/cam-graph/cam-graph.component';
import { NoctuaEditorModule } from '@noctua.editor/noctua-editor.module';
import { PreviewAnnotonDialogComponent } from './dialogs/preview-annoton/preview-annoton.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatRippleModule } from '@angular/material/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { SearchEvidenceDialogComponent } from './dialogs/search-evidence/search-evidence.component';
import { SelectEvidenceComponent } from './components/select-evidence/select-evidence.component';
import { MatTreeModule } from '@angular/material/tree';
import { CamErrorsDialogComponent } from './dialogs/cam-errors/cam-errors.component';

const routes = [
  {
    path: 'f',
    component: NoctuaFormComponent
  }
];

@NgModule({
  imports: [
    NoctuaSharedModule,
    CommonModule,
    // NoctuaModule.forRoot(noctuaConfig),
    RouterModule.forChild(routes),
    ContextMenuModule.forRoot(),
    NoctuaConfirmDialogModule,
    NoctuaEditorModule,

    //Material
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatRippleModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    MatTreeModule,
  ],
  exports: [
    AnnotonFormComponent,
    AnnotonEntityFormComponent,
    EntityFormComponent,
    CamTableComponent,
    AddEvidenceDialogComponent,
    AnnotonErrorsDialogComponent,
    CamErrorsDialogComponent,
    BeforeSaveDialogComponent,
    CreateFromExistingDialogComponent,
    LinkToExistingDialogComponent,
    SelectEvidenceDialogComponent,
    SearchDatabaseDialogComponent,
    SearchEvidenceDialogComponent,
    PreviewAnnotonDialogComponent,
    CamDiagramComponent,
    CamFormComponent,
    NodeComponent,
    NodesContainerComponent,
    AnnotonConnectorFormComponent,
    AnnotonEntityTableComponent,
    AnnotonTableComponent,
    TripleTableComponent,
    CamPreviewComponent
  ],
  providers: [
    NoctuaFormDialogService,
    NodeService,
    CamDiagramService,
    CamTableService,
  ],
  declarations: [
    NoctuaFormComponent,
    AnnotonFormComponent,
    AnnotonEntityFormComponent,
    EntityFormComponent,
    CamTableComponent,
    AddEvidenceDialogComponent,
    AnnotonErrorsDialogComponent,
    CamErrorsDialogComponent,
    BeforeSaveDialogComponent,
    PreviewAnnotonDialogComponent,
    CreateFromExistingDialogComponent,
    LinkToExistingDialogComponent,
    SelectEvidenceDialogComponent,
    SearchDatabaseDialogComponent,
    SearchEvidenceDialogComponent,
    CamDiagramComponent,
    CamFormComponent,
    NodeComponent,
    NodesContainerComponent,
    AnnotonConnectorFormComponent,
    AnnotonEntityTableComponent,
    TripleTableComponent,
    AnnotonTableComponent,
    EvidenceTableComponent,
    GraphPreviewComponent,
    CamPreviewComponent,
    CamGraphComponent,
    SelectEvidenceComponent,
  ],
  entryComponents: [
    AddEvidenceDialogComponent,
    AnnotonErrorsDialogComponent,
    CamErrorsDialogComponent,
    BeforeSaveDialogComponent,
    CreateFromExistingDialogComponent,
    LinkToExistingDialogComponent,
    SelectEvidenceDialogComponent,
    SearchDatabaseDialogComponent,
    SearchEvidenceDialogComponent,
    PreviewAnnotonDialogComponent
    //  NodeComponent,
    // NodesContainerComponent
  ]
})

export class NoctuaFormModule {
}
