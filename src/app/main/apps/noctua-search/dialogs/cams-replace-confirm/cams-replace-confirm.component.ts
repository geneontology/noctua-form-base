
import { Component, OnDestroy, OnInit, ViewChild, Input, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDrawer } from '@angular/material/sidenav';
import { Subject } from 'rxjs';


import {
  Cam,
  AnnotonType,
  NoctuaUserService,
  NoctuaFormConfigService,
  NoctuaFormMenuService,
  NoctuaAnnotonFormService,
  noctuaFormConfig,
  CamsService,
  AnnotonNode,
  EntityLookup,
  NoctuaLookupService,
  EntityDefinition,
  Entity
} from 'noctua-form-base';

import { takeUntil, distinctUntilChanged, } from 'rxjs/operators';
import { NoctuaDataService } from '@noctua.common/services/noctua-data.service';
import { NoctuaSearchService } from '@noctua.search/services/noctua-search.service';
import { noctuaAnimations } from '@noctua/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormControl } from '@angular/forms';
import { NoctuaReviewSearchService } from '@noctua.search/services/noctua-review-search.service';
import { groupBy, each, find } from 'lodash';

@Component({
  selector: 'noc-cams-replace-confirm-dialog',
  templateUrl: './cams-replace-confirm.component.html',
  styleUrls: ['./cams-replace-confirm.component.scss'],
  animations: noctuaAnimations,
})
export class CamsReplaceConfirmDialogComponent implements OnInit, OnDestroy {
  groupedEntities;
  occurrences = 0;
  models = 0;


  private _unsubscribeAll: Subject<any>;

  constructor
    (
      private _matDialogRef: MatDialogRef<CamsReplaceConfirmDialogComponent>,
      @Inject(MAT_DIALOG_DATA) private _data: any,
      private camsService: CamsService,
      private noctuaLookupService: NoctuaLookupService,
      private noctuaDataService: NoctuaDataService,
      public noctuaReviewSearchService: NoctuaReviewSearchService,
      public noctuaSearchService: NoctuaSearchService,
      public noctuaUserService: NoctuaUserService,
      public noctuaFormConfigService: NoctuaFormConfigService,
      public noctuaAnnotonFormService: NoctuaAnnotonFormService,
      public noctuaFormMenuService: NoctuaFormMenuService) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
    const self = this;

    const groupedEntities = groupBy(this._data.entities, 'modelId') as { string: Entity[] };

    this.models = Object.keys(this.groupedEntities).length;
    this.occurrences = this.noctuaReviewSearchService.matchedCount;
    const promises = []
    each(groupedEntities, (values: Entity[], key) => {
      const cam: Cam = find(this.noctuaReviewSearchService.cams, { modelId: key });

      promises.push({
        cam,
        values
      });
    });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  save() {
    this._matDialogRef.close(true);
  }

  close() {
    this._matDialogRef.close();
  }
}


