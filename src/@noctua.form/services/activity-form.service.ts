import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { FormGroup, FormBuilder } from '@angular/forms';
import { NoctuaFormConfigService } from './config/noctua-form-config.service';
import { NoctuaLookupService } from './lookup.service';
import { Activity, ActivityState, ActivityType } from './../models/activity/activity';
import { ActivityNode } from './../models/activity/activity-node';
import { ActivityForm } from './../models/forms/activity-form';
import { ActivityFormMetadata } from './../models/forms/activity-form-metadata';
import { NoctuaGraphService } from './graph.service';
import { CamService } from './cam.service';
import { Entity } from '../models/activity/entity';
import { Evidence } from '../models/activity/evidence';
import { cloneDeep, each } from 'lodash';
import { Cam } from '../models/activity/cam';

@Injectable({
  providedIn: 'root'
})
export class NoctuaActivityFormService {
  public state: ActivityState;
  public mfLocation;
  public errors = [];
  public currentActivity: Activity;
  public activity: Activity;
  public onActivityCreated: BehaviorSubject<Activity>
  public onActivityChanged: BehaviorSubject<Activity>
  public activityForm: ActivityForm;
  public activityFormGroup: BehaviorSubject<FormGroup | undefined>;
  public activityFormGroup$: Observable<FormGroup>;
  public cam: Cam;

  constructor(private _fb: FormBuilder, public noctuaFormConfigService: NoctuaFormConfigService,
    private camService: CamService,
    private noctuaGraphService: NoctuaGraphService,
    private noctuaLookupService: NoctuaLookupService) {

    this.camService.onCamChanged.subscribe((cam) => {
      if (!cam) {
        return;
      }

      this.cam = cam;
    });
    this.activity = this.noctuaFormConfigService.createActivityModel(ActivityType.default);
    this.onActivityCreated = new BehaviorSubject(null);
    this.onActivityChanged = new BehaviorSubject(null);
    this.activityFormGroup = new BehaviorSubject(null);
    this.activityFormGroup$ = this.activityFormGroup.asObservable();

    this.initializeForm();
  }

  initializeForm(activity?: Activity) {
    const self = this;

    self.errors = [];

    if (activity) {
      self.state = ActivityState.editing;
      self.currentActivity = activity;
      self.activity = cloneDeep(activity);
    } else {
      self.state = ActivityState.creation;
      self.currentActivity = null;
    }

    self.activity.resetPresentation();
    self.activityForm = this.createActivityForm();
    self.activityFormGroup.next(this._fb.group(this.activityForm));
    self.activity.updateEntityInsertMenu();
    self.activity.enableSubmit();
    self._onActivityFormChanges();
  }

  initializeFormData() {
    this.fakester(this.activity);
    this.initializeForm();
  }

  createActivityForm() {
    const self = this;
    const formMetadata = new ActivityFormMetadata(self.noctuaLookupService.lookupFunc.bind(self.noctuaLookupService));

    const activityForm = new ActivityForm(formMetadata);

    activityForm.createFunctionDescriptionForm(self.activity.presentation.fd);
    activityForm.createMolecularEntityForm(self.activity.presentation.gp);

    return activityForm;
  }

  activityFormToActivity() {
    this.activityForm.populateActivity(this.activity);
  }

  private _onActivityFormChanges(): void {
    this.activityFormGroup.getValue().valueChanges.subscribe(() => {
      this.activityFormToActivity();
      this.activity.enableSubmit();
    });
  }

  getActivityFormErrors() {
    let errors = [];

    this.activityForm.getErrors(errors);

    return errors;
  }

  setActivityType(activityType: ActivityType) {
    this.activity = this.noctuaFormConfigService.createActivityModel(activityType);
    this.initializeForm();
  }

  linkFormNode(entity, srcNode) {
    entity.uuid = srcNode.uuid;
    entity.term = srcNode.getTerm();
  }

  cloneForm(srcActivity, filterNodes) {
    this.activity = this.noctuaFormConfigService.createActivityModel(
      srcActivity.activityType
    );

    if (filterNodes) {
      each(filterNodes, function (srcNode) {

        let destNode = this.activity.getNode(srcNode.id);
        if (destNode) {
          destNode.copyValues(srcNode);
        }
      });
    } else {
      // this.activity.copyValues(srcActivity);
    }

    this.initializeForm();
  }

  saveActivity() {
    const self = this;
    self.activityFormToActivity();

    if (self.state === ActivityState.editing) {
      const saveData = self.activity.createEdit(self.currentActivity);

      return self.noctuaGraphService.editActivity(self.cam,
        saveData.srcNodes,
        saveData.destNodes,
        saveData.srcTriples,
        saveData.destTriples,
        saveData.removeIds,
        saveData.removeTriples);
    } else { // creation
      const saveData = self.activity.createSave();
      return self.noctuaGraphService.addActivity(self.cam, saveData.triples, saveData.title);
    }
  }

  clearForm() {
    this.activity = this.noctuaFormConfigService.createActivityModel(
      this.activity.activityType
    );

    this.initializeForm();
  }


  fakester(activity: Activity) {
    const self = this;

    each(activity.nodes, (node: ActivityNode) => {
      self.noctuaLookupService.termLookup('a', Object.assign({}, node.termLookup.requestParams, { rows: 100 })).subscribe(response => {
        if (response && response.length > 0) {
          const termsCount = response.length;
          node.term = Entity.createEntity(response[Math.floor(Math.random() * termsCount)]);

          each(node.predicate.evidence, (evidence: Evidence) => {
            self.noctuaLookupService.termLookup('a', Object.assign({}, node.predicate.evidenceLookup.requestParams, { rows: 100 })).subscribe(response => {
              if (response && response.length > 0) {
                const evidenceCount = response.length;
                evidence.evidence = Entity.createEntity(response[Math.floor(Math.random() * evidenceCount)]);
                evidence.reference = `PMID:${Math.floor(Math.random() * 1000000) + 1000}`;
              }
            });
          });
        }
      });
    });
  }

}
