import { Component, OnDestroy, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { noctuaAnimations } from '@noctua/animations';
import { takeUntil } from 'rxjs/internal/operators';
import { NoctuaSearchService } from '@noctua.search/services/noctua-search.service';

import {
  NoctuaFormConfigService, NoctuaUserService, CamService, Contributor, CamsService, Cam,
} from 'noctua-form-base';

import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { CamPage } from '@noctua.search/models/cam-page';
import { NoctuaSearchMenuService } from '@noctua.search/services/search-menu.service';
import { SelectionModel } from '@angular/cdk/collections';
import { NoctuaCommonMenuService } from '@noctua.common/services/noctua-common-menu.service';
import { NoctuaDataService } from '@noctua.common/services/noctua-data.service';
import { NoctuaSearchDialogService } from '../../services/dialog.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

export function CustomPaginator() {
  const customPaginatorIntl = new MatPaginatorIntl();

  customPaginatorIntl.itemsPerPageLabel = 'GO CAMs per page:';

  return customPaginatorIntl;
}

@Component({
  selector: 'noc-cams-table',
  templateUrl: './cams-table.component.html',
  styleUrls: ['./cams-table.component.scss'],
  animations: [
    noctuaAnimations,
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  providers: [
    { provide: MatPaginatorIntl, useValue: CustomPaginator() }
  ]
})
export class CamsTableComponent implements OnInit, OnDestroy {
  private _unsubscribeAll: Subject<any>;

  //@ViewChild(MatPaginator, { static: true })
  // paginator: MatPaginator;

  displayedColumns = [
    'select',
    'expand',
    'title',
    'state',
    'date',
    'contributor',
    'edit',
    'export',
  ];

  searchCriteria: any = {};
  searchFormData: any = [];
  searchForm: FormGroup;
  loadingSpinner: any = {
    color: 'primary',
    mode: 'indeterminate'
  };

  cams: any[] = [];
  camPage: CamPage;

  tableOptions = {
    hideHeader: true,
    color: 'transparent'
  }

  selection = new SelectionModel<Cam>(true, []);

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private camService: CamService,
    private camsService: CamsService,
    private noctuaDataService: NoctuaDataService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaCommonMenuService: NoctuaCommonMenuService,
    public noctuaSearchMenuService: NoctuaSearchMenuService,
    public noctuaUserService: NoctuaUserService,
    private noctuaSearchDialogService: NoctuaSearchDialogService,
    public noctuaSearchService: NoctuaSearchService) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
    this.noctuaSearchService.onCamsChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(cams => {
        if (!cams) {
          return;
        }
        this.cams = cams;
      });

    this.noctuaSearchService.onCamsPageChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((camPage: CamPage) => {
        if (!camPage) {
          return;
        }
        this.camPage = camPage;
      });
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.cams.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.cams.forEach(row => this.selection.select(row));

    console.log(this.selection)
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  toggleLeftDrawer(panel) {
    this.noctuaSearchMenuService.toggleLeftDrawer(panel);
  }

  search() {
    const searchCriteria = this.searchForm.value;
    this.noctuaSearchService.search(searchCriteria);
  }

  getStateClass(stateLabel) {
    return {
      'noc-development': stateLabel === 'development',
      'noc-production': stateLabel === 'production',
      'noc-review': stateLabel === 'review'
    }
  }

  setPage($event) {
    console.log($event)
    if (this.camPage) {
      let pageIndex = $event.pageIndex;
      if (this.noctuaSearchService.searchCriteria.camPage.size > $event.pageSize) {
        pageIndex = 0;
      }
      this.noctuaSearchService.getPage(pageIndex, $event.pageSize);
    }
  }

  isExpansionDetailRow(i: number, cam: Cam) {
    return cam.expanded;
  }

  toggleCamExpand(cam: Cam) {
    if (!cam.expanded) {
      this.camService.loadCam(cam);
    } else {
      cam.expanded = false;
    }
    //  this._changeDetectorRef.markForCheck();

  }

  openFind() {
    console.log(this.selection,
      this.noctuaSearchService.searchCriteria.terms)

    const filter = {
      terms: this.noctuaSearchService.searchCriteria.terms
    };
    this.camsService.initializeForm(this.selection.selected);
    this.camsService.loadCams(filter);
    this.openRightDrawer(this.noctuaSearchMenuService.rightPanel.camsSelection);
  }

  openReplace() {
    const filter = {
      terms: this.noctuaSearchService.searchCriteria.terms
    };
    const success = () => { };
    this.camsService.initializeForm(this.selection.selected);
    this.camsService.loadCams(filter);
    this.noctuaSearchDialogService.openCamReplaceDialog(success);
    //this.openRightDrawer(this.noctuaSearchMenuService.rightPanel.camsReplace);
  }

  openLeftDrawer(panel) {
    this.noctuaSearchMenuService.selectLeftPanel(panel);
    this.noctuaSearchMenuService.openLeftDrawer();
  }

  openRightDrawer(panel) {
    this.noctuaSearchMenuService.selectRightPanel(panel);
    this.noctuaSearchMenuService.openRightDrawer();
  }

  refresh() {
    this.noctuaSearchService.updateSearch();
  }

  reset() {
    this.noctuaSearchService.clearSearchCriteria();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

}
