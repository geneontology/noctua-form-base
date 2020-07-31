

import { Component, OnDestroy, OnInit, ViewChild, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDrawer } from '@angular/material/sidenav';
import { Subject } from 'rxjs';


import {
  Cam,
  AnnotonType,
  Contributor,
  NoctuaUserService,
  NoctuaFormConfigService,
  NoctuaFormMenuService,
  NoctuaAnnotonFormService,
  CamService,
  noctuaFormConfig,
  CamsService,
  AnnotonNode,
  EntityLookup,
  NoctuaLookupService
} from 'noctua-form-base';

import { takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { NoctuaDataService } from '@noctua.common/services/noctua-data.service';
import { NoctuaSearchService } from '@noctua.search/services/noctua-search.service';
import { noctuaAnimations } from '@noctua/animations';
import { FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'noc-cams-selection',
  templateUrl: './cams-selection.component.html',
  styleUrls: ['./cams-selection.component.scss'],
  animations: noctuaAnimations,
})
export class CamsSelectionComponent implements OnInit, OnDestroy {
  AnnotonType = AnnotonType;

  @Input('panelDrawer')
  panelDrawer: MatDrawer;

  replaceForm: FormGroup;
  cams: Cam[] = [];
  terms: any[];
  searchResults = [];
  modelId = '';

  searchFormType = 'replace';
  matchedCount = 0;

  tableOptions = {
    hideHeader: true,
  }

  noctuaFormConfig = noctuaFormConfig;


  searchCriteria: any = {};
  searchForm: FormGroup;
  selectedOrganism = {};
  searchFormData: any = [];
  categories: any;

  gpNode: AnnotonNode;
  termNode: AnnotonNode;

  private _unsubscribeAll: Subject<any>;

  constructor
    (private route: ActivatedRoute,
      private camsService: CamsService,
      private noctuaDataService: NoctuaDataService,
      public noctuaSearchService: NoctuaSearchService,
      public noctuaUserService: NoctuaUserService,
      private noctuaLookupService: NoctuaLookupService,
      public noctuaFormConfigService: NoctuaFormConfigService,
      public noctuaAnnotonFormService: NoctuaAnnotonFormService,
      public noctuaFormMenuService: NoctuaFormMenuService) {

    this._unsubscribeAll = new Subject();

    this.categories = this.noctuaFormConfigService.findReplaceCategories;
    this.searchForm = this.createReplaceForm(this.categories.selected);

    this.camsService.onCamsChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(cams => {
        if (!cams) {
          return;
        }
        this.cams = cams;
        this.matchedCount = this.camsService.calculateMatchedCount();
      });

    this.terms = this.noctuaSearchService.searchCriteria.getSearchableTerms();
    this.replaceForm = this.createFilterForm();
  }

  ngOnInit(): void {
    const self = this;
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  selectSearchFormType(searchFormType) {
    this.searchFormType = searchFormType;
  }

  viewAsModel(cam: Cam) {
    cam.displayType = noctuaFormConfig.camDisplayType.options.model;
  }

  viewAsActivities(cam: Cam) {
    cam.displayType = noctuaFormConfig.camDisplayType.options.entity;
  }

  loadCam(modelId) {
    const self = this;

    self.noctuaDataService.onContributorsChanged.pipe(
      takeUntil(this._unsubscribeAll))
      .subscribe((contributors: Contributor[]) => {
        self.noctuaUserService.contributors = contributors;
        //   this.cam = this.camService.getCam(modelId);
      });
  }

  createFilterForm() {
    return new FormGroup({
      findWhat: new FormControl(),
    });
  }

  createReplaceForm(selectedCategory) {
    return new FormGroup({
      findWhat: new FormControl(),
      replaceWith: new FormControl(),
      category: new FormControl(selectedCategory),
    });
  }

  search() {
    const value = this.replaceForm.value;
    const findWhat = value.findWhat.value;
    const filter = {
      terms: findWhat
    };
    this.camsService.findInCams(filter);
  }

  replace() {

  }
  replaceAll() {

  }
  findNext() {

  }

  findPrevious() {

  }


  onValueChanges() {
    const self = this;
    const lookupFunc = self.noctuaLookupService.lookupFunc()

    this.searchForm.get('findWhat').valueChanges.pipe(
      distinctUntilChanged(),
      debounceTime(400)
    ).subscribe(data => {
      const lookup: EntityLookup = self.termNode.termLookup;
      lookupFunc.termLookup(data, lookup.requestParams).subscribe(response => {
        lookup.results = response;
      });
    });

    this.searchForm.get('replaceWith').valueChanges.pipe(
      distinctUntilChanged(),
      debounceTime(400)
    ).subscribe(data => {

    });
  }

  compareCategory(a: any, b: any) {
    if (a && b) {
      return (a.name === b.name);
    }
    return false;
  }

  close() {
    this.panelDrawer.close();
  }
}
