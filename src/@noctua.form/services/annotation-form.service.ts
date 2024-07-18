import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { FormGroup, FormBuilder } from '@angular/forms';
import { NoctuaFormConfigService } from './config/noctua-form-config.service';
import { Activity, ActivityType } from './../models/activity/activity';
import { BbopGraphService } from './bbop-graph.service';
import { CamService } from './cam.service';
import { Entity } from '../models/activity/entity';
import { Cam } from '../models/activity/cam';
import { AnnotationActivity } from '../models/standard-annotation/annotation-activity';
import * as EntityDefinition from './../data/config/entity-definition';
import { noctuaFormConfig } from './../noctua-form-config';
import { StandardAnnotationForm } from './../models/standard-annotation/form';
import { ActivityError, ErrorLevel, ErrorType } from './../models/activity/parser/activity-error';

@Injectable({
  providedIn: 'root'
})
export class NoctuaAnnotationFormService {
  public errors = [];
  public activity: Activity;
  public annotationActivity: AnnotationActivity;
  public onActivityCreated: BehaviorSubject<Activity>
  public onActivityChanged: BehaviorSubject<Activity>
  public onFormErrorsChanged: BehaviorSubject<ActivityError[]>
  public cam: Cam;

  // for setting edge when goterm is changed
  // private previousGotermRelation: string = null

  constructor(private _fb: FormBuilder, public noctuaFormConfigService: NoctuaFormConfigService,
    private camService: CamService,
    private bbopGraphService: BbopGraphService) {

    this.camService.onCamChanged.subscribe((cam) => {
      if (!cam) {
        return;
      }

      this.cam = cam;
    });

    this.onActivityCreated = new BehaviorSubject(null);
    this.onActivityChanged = new BehaviorSubject(null);
    this.onFormErrorsChanged = new BehaviorSubject([]);

  }

  initializeForm() {

    this.activity = this.noctuaFormConfigService.createActivityModel(ActivityType.simpleAnnoton);

    this.errors = [];

    this.activity.enableSubmit();
    this.annotationActivity = new AnnotationActivity(this.activity);
    this.onActivityChanged.next(this.activity);
  }

  processAnnotationFormGroup(dynamicForm: FormGroup, annotationData: StandardAnnotationForm): void {
    console.log('Annotation form group processed:', annotationData);

    const gpRootTypes = annotationData.gp?.rootTypes ?? [];
    const gotermRootTypes = annotationData.goterm?.rootTypes ?? [];
    const gpToTermRelations = this.noctuaFormConfigService.getTermRelations(
      gpRootTypes,
      gotermRootTypes,
      true
    );

    const gotTermCategories = this.noctuaFormConfigService.getObjectRange(
      gpRootTypes,
      annotationData.gpToTermEdge?.id,
      true
    );

    console.log('gotTermCategories:', gotTermCategories);

    const extensionObjects = this.noctuaFormConfigService.getObjectRange(
      gotermRootTypes,
    );

    this.annotationActivity.gpToTermEdges = gpToTermRelations;
    this.annotationActivity.goterm.category = gotTermCategories;

    if (this.annotationActivity.extensions.length === annotationData.annotationExtensions.length) {

      annotationData.annotationExtensions.forEach((ext, index) => {

        const extRootTypes = ext.extensionTerm?.rootTypes ?? [];

        const extensionEdges = this.noctuaFormConfigService.getTermRelations(
          gotermRootTypes,
          extRootTypes
        );

        this.annotationActivity.extensions[index].extensionEdges = extensionEdges;

        if (extensionObjects.length > 0) {
          this.annotationActivity.extensions[index].extensionTerm.category = extensionObjects;
        }
      });
    }

    if (gpToTermRelations?.length > 0 && annotationData.gp?.id && annotationData.goterm?.id) {

      const exists = gpToTermRelations.some(e => e.id === annotationData.gpToTermEdge?.id);
      if (!exists) {
        dynamicForm.get('gpToTermEdge').patchValue(gpToTermRelations[0]);
        const isProteinComplex = annotationData.goterm.rootTypes.find((rootType: Entity) => {
          return rootType.id === EntityDefinition.GoProteinContainingComplex.category;
        });

        if (isProteinComplex) {
          const partOfEdge = gpToTermRelations.find(e => e.id === noctuaFormConfig.edge.partOf.id);
          dynamicForm.get('gpToTermEdge').patchValue(partOfEdge);
        }
      }

    }

    this.errors = this.getActivityFormErrors(annotationData);
    this.onFormErrorsChanged.next(this.errors);
    this.camService.updateTermList(this.activity);
    this.onActivityChanged.next(this.activity);
  }

  getActivityFormErrors(annotationData: StandardAnnotationForm) {

    const errors = [];

    if (!annotationData.gp?.id) {
      const error = new ActivityError(ErrorLevel.error, ErrorType.general, `GP is required`);
      errors.push(error);
    }

    if (!annotationData.goterm?.id) {
      const error = new ActivityError(ErrorLevel.error, ErrorType.general, `GO Term is required`);
      errors.push(error);
    }

    if (!annotationData.evidenceCode?.id) {

      const error = new ActivityError(ErrorLevel.error, ErrorType.general, `Evidence is required`);
      errors.push(error);
    }

    if (!annotationData.reference) {
      const error = new ActivityError(ErrorLevel.error, ErrorType.general,
        'Reference is required');
      errors.push(error);
    }

    if (annotationData.reference) {

      if (!annotationData.reference.includes(':')) {
        const error = new ActivityError(ErrorLevel.error, ErrorType.general,
          `Use DB:accession format for reference`);
        errors.push(error);
      }
    }

    annotationData.annotationExtensions.forEach((extension, index) => {
      if ((extension.extensionEdge?.id && !extension.extensionTerm?.id) || (!extension.extensionEdge?.id && extension.extensionTerm?.id)) {
        const error = new ActivityError(ErrorLevel.error, ErrorType.general, `Both Extension relation and Extension Term must be filled (${index + 1})`);
        errors.push(error);
      }
    });

    return errors
  }


  cloneForm(srcActivity, filterNodes) {
    this.activity = this.noctuaFormConfigService.createActivityModel(
      srcActivity.activityType
    );

    if (filterNodes) {
      filterNodes.forEach((srcNode) => {

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

  saveAnnotation(annotationFormValue: StandardAnnotationForm) {
    console.log('saveAnnotation:', annotationFormValue);
    //self.activityFormToActivity();

    //self.annotationActivity.activityToAnnotation(self.activity);
    const saveData = this.annotationActivity.createSave(annotationFormValue as StandardAnnotationForm);
    return forkJoin(this.bbopGraphService.addActivity(this.cam, saveData.nodes, saveData.triples, saveData.title));
  }

  clearForm() {
    this.initializeForm();
  }
}
