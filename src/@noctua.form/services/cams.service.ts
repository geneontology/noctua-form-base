import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { FormGroup, FormBuilder } from '@angular/forms';
import { CurieService } from './../../@noctua.curie/services/curie.service';
import { NoctuaGraphService } from './../services/graph.service';
import { NoctuaFormConfigService } from './../services/config/noctua-form-config.service';
import { NoctuaLookupService } from './lookup.service';
import { NoctuaUserService } from './user.service';
import { Annoton } from './../models/annoton/annoton';
import { CamForm } from './../models/forms/cam-form';
import { AnnotonFormMetadata } from './../models/forms/annoton-form-metadata';
import { Evidence, compareEvidence } from './../models/annoton/evidence';

import { v4 as uuid } from 'uuid';
import { Cam } from './../models/annoton/cam';
import { uniqWith, each, map, groupBy, find, remove } from 'lodash';
import { CamService } from './cam.service';
import { Entity } from './../models/annoton/entity';

@Injectable({
  providedIn: 'root'
})
export class CamsService {

  curieUtil: any;
  loading = false;
  cams: Cam[] = [];
  foundMatchCount = 0;
  onCamsChanged: BehaviorSubject<any>;
  currentHighlightedUuid;

  public annoton: Annoton;
  private camForm: CamForm;
  private camFormGroup: BehaviorSubject<FormGroup | undefined>;
  public camFormGroup$: Observable<FormGroup>;
  private _replaceBbopManager;

  constructor(public noctuaFormConfigService: NoctuaFormConfigService,
    private _fb: FormBuilder,
    private noctuaUserService: NoctuaUserService,
    private _noctuaGraphService: NoctuaGraphService,
    private camService: CamService,
    private noctuaLookupService: NoctuaLookupService,
    private curieService: CurieService) {
    this.onCamsChanged = new BehaviorSubject(null);
    this.curieUtil = this.curieService.getCurieUtil();
    this.camFormGroup = new BehaviorSubject(null);
    this.camFormGroup$ = this.camFormGroup.asObservable();
  }

  setup() {
    this._replaceBbopManager = this._noctuaGraphService.registerManager();
  }

  initializeForm(cams?: Cam[]) {
    const self = this;

    if (cams) {
      this.cams = cams;
    }

    // self.camForm = this.createCamForm();
    // self.camFormGroup.next(this._fb.group(this.camForm));
  }

  createCamForm() {
    const self = this;

    const formMetadata = new AnnotonFormMetadata(self.noctuaLookupService.lookupFunc.bind(self.noctuaLookupService));
    const camForm = new CamForm(formMetadata);

    // camForm.createCamForm(this.cams, this.noctuaUserService.user);

    return camForm;
  }

  loadCams(filter?: any) {
    const self = this;
    each(this.cams, (cam: Cam) => {
      cam.expanded = true;
      self.camService.loadCam(cam, filter);
    });

    self.onCamsChanged.next(this.cams);
  }

  addCamToReview(cam: Cam) {
    const self = this;

    // cam.expanded = true;
    const found = find(this.cams, { id: cam.id })

    if (!found) {
      cam.dateReviewAdded = Date.now();
      self.cams.push(cam);
      self.camService.loadCam(cam);
      self.sortCams();

      self.onCamsChanged.next(this.cams);
    }
  }

  removeCamFromReview(cam: Cam) {
    remove(this.cams, { id: cam.id });
  }

  findInCams(filter?: any) {
    const self = this;

    each(self.cams, (cam: Cam) => {
      cam.expanded = true;
      if (filter) {
        cam.filter = filter;
      }
    });

    self.onCamsChanged.next(this.cams);
  }

  expandMatch(uuid: string) {
    const self = this;

    each(self.cams, (cam: Cam) => {
      cam.expanded = true;
      const annotons = cam.findAnnotonByNodeId(uuid);

      each(annotons, (annoton: Annoton) => {
        annoton.expanded = true;
      });
    });
  }

  replace(entities: Entity[], replaceWithTerm: Entity) {
    const self = this;

    const groupedEntities = groupBy(entities, 'modelId') as { string: Entity[] };

    each(groupedEntities, (values: Entity[], key) => {
      const cam: Cam = find(this.cams, { modelId: key });
      cam.replace(entities, replaceWithTerm);
      // this.camService.replaceAnnotonInternal(cam)

    });
  }

  bulkEdit() {
    const self = this;
    const promises = [];

    each(this.cams, (cam: Cam) => {
      promises.push(self._noctuaGraphService.bulkEditAnnoton(cam));
    });

    return forkJoin(promises).subscribe(results => {
      console.log(results);
    });
  }

  reviewChanges() {
    const self = this;

    const result = this.cams.map((cam: Cam) => {
      return {
        cam: cam,
        changes: self.camService.reviewChanges(cam)
      };
    });

    return result;
  }

  sortCams() {
    this.cams.sort(this._compareDateReviewAdded);
  }

  private _compareDateReviewAdded(a: Cam, b: Cam): number {
    if (a.dateReviewAdded > b.dateReviewAdded) {
      return -1;
    } else {
      return 1;
    }
  }

}
