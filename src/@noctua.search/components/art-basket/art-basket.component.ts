import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { Cam, CamsService, NoctuaFormConfigService, NoctuaUserService } from 'noctua-form-base';
import { NoctuaSearchService } from './../..//services/noctua-search.service';
import { NoctuaSearchMenuService } from '../../services/search-menu.service';
import { takeUntil } from 'rxjs/operators';
import { ArtBasket, ArtBasketItem } from './../..//models/art-basket';
import { NoctuaReviewSearchService } from './../../services/noctua-review-search.service';
import { NoctuaConfirmDialogService } from '@noctua/components/confirm-dialog/confirm-dialog.service';
import { MiddlePanel } from './../../models/menu-panels';
import { NoctuaSearchDialogService } from './../../services/dialog.service';

@Component({
  selector: 'noc-art-basket',
  templateUrl: './art-basket.component.html',
  styleUrls: ['./art-basket.component.scss']
})
export class ArtBasketComponent implements OnInit, OnDestroy {
  MiddlePanel = MiddlePanel;
  artBasket: ArtBasket = new ArtBasket();
  cams: Cam[] = [];
  summary;

  private _unsubscribeAll: Subject<any>;

  constructor(
    public camsService: CamsService,
    private confirmDialogService: NoctuaConfirmDialogService,
    public noctuaSearchDialogService: NoctuaSearchDialogService,
    public noctuaUserService: NoctuaUserService,
    public noctuaReviewSearchService: NoctuaReviewSearchService,
    public noctuaSearchMenuService: NoctuaSearchMenuService,
    public noctuaSearchService: NoctuaSearchService,
    public noctuaFormConfigService: NoctuaFormConfigService) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
    this.noctuaReviewSearchService.onArtBasketChanged.pipe(
      takeUntil(this._unsubscribeAll))
      .subscribe((artBasket: ArtBasket) => {
        if (artBasket) {
          this.artBasket = artBasket;
        }
      });

    this.camsService.onCamsChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(cams => {
        if (!cams) {
          return;
        }
        this.cams = cams;

        console.log(cams);
      });

    this.camsService.onCamsCheckoutChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(summary => {
        if (!summary) {
          return;
        }

        this.summary = summary;
      });

  }

  selectItem(artBasketItem: ArtBasketItem) {
    this.camsService.onSelectedCamChanged.next(artBasketItem.id);
    const q = '#noc-review-cams-' + artBasketItem.displayId;
    this.noctuaSearchMenuService.scrollTo(q);
  }

  remove(cam: Cam) {
    this.camsService.removeCamFromReview(cam);
    this.noctuaReviewSearchService.removeFromArtBasket(cam.id);
  }

  clear() {

    const success = (cancel) => {
      if (cancel) {

        this.noctuaReviewSearchService.clear();
        this.camsService.reset();
        this.noctuaReviewSearchService.clearBasket();
      }
    };

    const options = {
      cancelLabel: 'No',
      confirmLabel: 'Yes'
    };

    this.confirmDialogService.openConfirmDialog('Confirm Clear Basket?',
      'You are about to remove all items from the basket. All your unsaved changes will be lost.',
      success, options);
  }

  backToReview() {
    this.noctuaSearchMenuService.selectMiddlePanel(MiddlePanel.camsReview);
  }

  cancel() {
    const self = this;

    const success = (cancel) => {
      if (cancel) {
        const element = document.querySelector('#noc-review-results');

        if (element) {
          element.scrollTop = 0;
        }
        this.noctuaReviewSearchService.clear();
        this.noctuaReviewSearchService.onResetReview.next(true);
      }
    };

    const options = {
      cancelLabel: 'No',
      confirmLabel: 'Yes'
    };

    this.confirmDialogService.openConfirmDialog('Confirm Cancel?',
      'You are about to cancel annotation review. All your unsaved changes will be lost.',
      success, options);
  }

  resetAll() {
    this.camsService.loadCams();
  }

  reviewChanges() {
    const self = this;

    self.camsService.reviewChanges();
    self.noctuaSearchMenuService.selectMiddlePanel(MiddlePanel.reviewChanges);
  }

  submitChanges() {
    const self = this;

    this.noctuaSearchMenuService.selectMiddlePanel(MiddlePanel.reviewChanges);

    const success = (replace) => {
      if (replace) {
        const element = document.querySelector('#noc-review-results');

        if (element) {
          element.scrollTop = 0;
        }
        self.noctuaReviewSearchService.bulkEdit();
        self.noctuaReviewSearchService.clear();
        self.noctuaReviewSearchService.onResetReview.next(true);
        self.close();
      }
    };
    const options = {
      cancelLabel: 'Go Back',
      confirmLabel: 'Submit'
    };

    if (self.summary) {
      const occurrences = self.summary.termsCount;
      this.confirmDialogService.openConfirmDialog('Save Changes?',
        `Bulk edit ${occurrences} occurrences across ${self.summary.camsCount} models`,
        success, options);
    }
  }

  close() {
    this.noctuaSearchMenuService.closeLeftDrawer();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
