import { AfterViewInit, Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDrawer } from '@angular/material/sidenav';
import { Subject } from 'rxjs';
import { noctuaAnimations } from './../../../../@noctua/animations';
import {
  Cam,
  Contributor,
  NoctuaUserService,
  NoctuaFormConfigService,
  CamService,
  CamsService
} from 'noctua-form-base';

import { FormGroup } from '@angular/forms';
import { NoctuaSearchService } from '@noctua.search/services/noctua-search.service';
import { takeUntil } from 'rxjs/operators';
import { CamPage } from '@noctua.search/models/cam-page';
import { NoctuaSearchMenuService } from '@noctua.search/services/search-menu.service';
import { NoctuaCommonMenuService } from '@noctua.common/services/noctua-common-menu.service';
import { NoctuaDataService } from '@noctua.common/services/noctua-data.service';
import { ReviewMode } from '@noctua.search/models/review-mode';
import { LeftPanel, MiddlePanel, RightPanel } from '@noctua.search/models/menu-panels';
import { ArtBasket } from '@noctua.search/models/art-basket';
import { NoctuaReviewSearchService } from '@noctua.search/services/noctua-review-search.service';
import { NoctuaPerfectScrollbarDirective } from '@noctua/directives/noctua-perfect-scrollbar/noctua-perfect-scrollbar.directive';

@Component({
  selector: 'noc-noctua-search',
  templateUrl: './noctua-search.component.html',
  styleUrls: ['./noctua-search.component.scss'],
  // encapsulation: ViewEncapsulation.None,
  animations: noctuaAnimations
})
export class NoctuaSearchComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('leftDrawer', { static: true })
  leftDrawer: MatDrawer;

  @ViewChild('rightDrawer', { static: true })
  rightDrawer: MatDrawer;

  @ViewChildren(NoctuaPerfectScrollbarDirective)
  private _noctuaPerfectScrollbarDirectives: QueryList<NoctuaPerfectScrollbarDirective>;

  ReviewMode = ReviewMode;
  LeftPanel = LeftPanel;
  MiddlePanel = MiddlePanel;
  RightPanel = RightPanel;
  artBasket: ArtBasket = new ArtBasket();

  camPage: CamPage;
  public cam: Cam;
  public user: Contributor;

  searchResults = [];
  modelId = '';
  searchCriteria: any = {};
  searchFormData: any = [];
  searchForm: FormGroup;
  loadingSpinner: any = {
    color: 'primary',
    mode: 'indeterminate'
  };
  summary: any = {
    expanded: false,
    detail: {}
  };

  isReviewMode = false;

  cams: any[] = [];

  private _unsubscribeAll: Subject<any>;

  constructor(
    private route: ActivatedRoute,
    private camService: CamService,
    private camsService: CamsService,
    private noctuaDataService: NoctuaDataService,
    public noctuaReviewSearchService: NoctuaReviewSearchService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaCommonMenuService: NoctuaCommonMenuService,
    public noctuaSearchMenuService: NoctuaSearchMenuService,
    public noctuaUserService: NoctuaUserService,
    public noctuaSearchService: NoctuaSearchService,
  ) {
    this._unsubscribeAll = new Subject();

    this.route
      .queryParams
      .subscribe(params => {
        const baristaToken = params['barista_token'] || null;
        this.noctuaUserService.getUser(baristaToken);
      });

    this.noctuaSearchService.onCamsPageChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((camPage: CamPage) => {
        if (!camPage) {
          return;
        }
        this.camPage = camPage;
      });

    this.noctuaUserService.onUserChanged.pipe(
      takeUntil(this._unsubscribeAll))
      .subscribe((user: Contributor) => {
        this.noctuaFormConfigService.setupUrls();
        this.noctuaFormConfigService.setUniversalUrls();
        this.camsService.setup();
      });
  }

  ngOnInit(): void {
    this.noctuaSearchMenuService.setLeftDrawer(this.leftDrawer);
    this.noctuaSearchMenuService.setRightDrawer(this.rightDrawer);

    this.rightDrawer.open();

    this.noctuaSearchService.onCamsChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(cams => {
        this.cams = cams;
      });

    this.noctuaReviewSearchService.onArtBasketChanged.pipe(
      takeUntil(this._unsubscribeAll))
      .subscribe((artBasket: ArtBasket) => {
        if (artBasket) {
          this.artBasket = artBasket;
        }
      });



  }

  ngAfterViewInit(): void {
    this.noctuaSearchMenuService.resultsViewScrollbar = this._noctuaPerfectScrollbarDirectives.find((directive) => {
      return directive.elementRef.nativeElement.id === 'noc-results';
    });
  }

  loadCam(modelId) {
    const self = this;

    self.noctuaDataService.onContributorsChanged.pipe(
      takeUntil(this._unsubscribeAll))
      .subscribe((contributors: Contributor[]) => {
        if (!contributors) {
          return;
        }
        self.noctuaUserService.contributors = contributors;
        this.cam = this.camService.getCam(modelId);
      });
  }

  edit() {
    // this.loadModel(this.selectCam)
    // this.openRightDrawer(RightPanel.camForm);
  }

  openLeftDrawer(panel) {
    this.noctuaSearchMenuService.selectLeftPanel(panel);
    this.noctuaSearchMenuService.openLeftDrawer();
  }

  selectMiddlePanel(panel) {
    this.noctuaSearchMenuService.selectMiddlePanel(panel);

    switch (panel) {
      case MiddlePanel.cams:
        this.noctuaSearchMenuService.selectLeftPanel(LeftPanel.filter);
        break;
      case MiddlePanel.camsReview:
        this.noctuaSearchMenuService.selectLeftPanel(LeftPanel.artBasket);
        break;
      case MiddlePanel.reviewChanges:
        this.noctuaSearchMenuService.selectLeftPanel(LeftPanel.artBasket);
        break;
    }

  }

  openRightDrawer(panel) {
    this.noctuaSearchMenuService.selectRightPanel(panel);
    this.noctuaSearchMenuService.openRightDrawer();
  }

  toggleLeftDrawer(panel) {
    this.noctuaSearchMenuService.toggleLeftDrawer(panel);
  }

  createModel(type: 'graph-editor' | 'noctua-form') {
    this.noctuaCommonMenuService.createModel(type);
  }

  openBasketPanel() {
    this.openLeftDrawer(LeftPanel.artBasket);
    this.noctuaSearchMenuService.selectMiddlePanel(MiddlePanel.camsReview);
    this.noctuaSearchMenuService.reviewMode = ReviewMode.on;
    this.isReviewMode = true;
  }

  toggleReviewMode() {
    if (this.noctuaSearchMenuService.reviewMode === ReviewMode.off) {
      this.noctuaSearchMenuService.reviewMode = ReviewMode.on;
      this.isReviewMode = true;
      // this.noctuaSearchMenuService.closeLeftDrawer();
    } else if (this.noctuaSearchMenuService.reviewMode === ReviewMode.on) {
      this.noctuaSearchMenuService.reviewMode = ReviewMode.off;
      this.noctuaSearchMenuService.selectMiddlePanel(MiddlePanel.cams);
      this.noctuaSearchMenuService.selectLeftPanel(LeftPanel.filter);
      this.isReviewMode = false;
    }
  }

  search() {
    const searchCriteria = this.searchForm.value;
    this.noctuaSearchService.search(searchCriteria);
  }

  refresh() {
    this.noctuaSearchService.updateSearch();
  }

  reset() {
    this.noctuaSearchService.clearSearchCriteria();
  }

  selectCam(cam) {
    this.noctuaSearchService.onCamChanged.next(cam);
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
