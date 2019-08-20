import { Component, Input, Inject, OnInit, ElementRef, OnDestroy, ViewEncapsulation, ViewChild, NgZone } from '@angular/core';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator, MatSort } from '@angular/material';
import { DataSource } from '@angular/cdk/collections';
import { merge, Observable, BehaviorSubject, fromEvent, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, take } from 'rxjs/operators';


import * as _ from 'lodash';
declare const require: any;
const each = require('lodash/forEach');

import { noctuaAnimations } from './../../../../../../../../@noctua/animations';


import { NoctuaFormService } from '../../../../services/noctua-form.service';

import { NoctuaTranslationLoaderService } from './../../../../../../../../@noctua/services/translation-loader.service';

import { NoctuaSearchService } from './../../../../../../../../@noctua.search/services/noctua-search.service';
import { NoctuaFormDialogService } from './../../../../services/dialog.service';

import { SparqlService } from './../../../../../../../../@noctua.sparql/services/sparql/sparql.service';

import {
  CamService,
  NoctuaFormConfigService,
  NoctuaAnnotonFormService,
  NoctuaLookupService,
  AnnotonNode,
  Evidence,
  noctuaFormConfig,
  Entity,
  EntityDefinition
} from 'noctua-form-base';


@Component({
  selector: 'noc-entity-form',
  templateUrl: './entity-form.component.html',
  styleUrls: ['./entity-form.component.scss'],
})

export class EntityFormComponent implements OnInit, OnDestroy {
  @Input('entityFormGroup')
  public entityFormGroup: FormGroup;

  evidenceFormArray: FormArray;
  entity: AnnotonNode;
  insertMenuItems = [];

  private unsubscribeAll: Subject<any>;

  constructor(private route: ActivatedRoute,
    private ngZone: NgZone,
    private formBuilder: FormBuilder,
    private noctuaFormDialogService: NoctuaFormDialogService,
    private camService: CamService,
    private noctuaSearchService: NoctuaSearchService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaAnnotonFormService: NoctuaAnnotonFormService,
    private noctuaLookupService: NoctuaLookupService,
    private noctuaFormService: NoctuaFormService,
    private sparqlService: SparqlService, ) {
    this.unsubscribeAll = new Subject();

  }

  ngOnInit(): void {

    this.entity = this.noctuaAnnotonFormService.annoton.getNode(this.entityFormGroup.get('id').value);
    this.insertMenuItems = this.noctuaFormConfigService.getInsertEntityMenuItems(this.entity.type);
    console.log(this.insertMenuItems)
  }

  addTerm(entity) {

  }

  addEvidence() {
    const self = this;

    self.entity.predicate.addEvidence();
    self.noctuaAnnotonFormService.initializeForm();
  }

  removeEvidence(index: number) {
    const self = this;

    self.entity.predicate.removeEvidence(index);
    self.noctuaAnnotonFormService.initializeForm();
  }

  toggleIsComplement(entity: AnnotonNode) {

  }

  openSearchDatabaseDialog(entity: AnnotonNode) {
    const self = this;
    const gpNode = this.noctuaAnnotonFormService.annotonForm.molecularEntity.get('term').value;

    if (gpNode) {
      const data = {
        readonly: false,
        gpNode: gpNode,
        aspect: entity.aspect,
        entity: entity,
        params: {
          term: '',
          evidence: ''
        }
      };

      const success = function (selected) {
        if (selected.term) {
          entity.term = new Entity(selected.term.term.id, selected.term.term.label);

          if (selected.evidences && selected.evidences.length > 0) {
            entity.predicate.setEvidence(selected.evidences);
          }
          self.noctuaAnnotonFormService.initializeForm();
        }
      }
      self.noctuaFormDialogService.openSearchDatabaseDialog(data, success);
    } else {
      const errors = [];
      const meta = {
        aspect: gpNode ? gpNode.label : 'Gene Product'
      }
      // const error = new AnnotonError('error', 1, "Please enter a gene product", meta)
      //errors.push(error);
      // self.dialogService.openAnnotonErrorsDialog(ev, entity, errors)
    }
  }

  insertEntity(nodeType: EntityDefinition.AnnotonNodeType) {
    this.noctuaFormConfigService.insertAnnotonNode(this.noctuaAnnotonFormService.annoton, this.entity, nodeType);
  }

  addNDEvidence() {
    const self = this;

    const evidence = new Evidence();
    evidence.setEvidence(new Entity(
      noctuaFormConfig.evidenceAutoPopulate.nd.evidence.id,
      noctuaFormConfig.evidenceAutoPopulate.nd.evidence.label));
    evidence.reference = noctuaFormConfig.evidenceAutoPopulate.nd.reference
    self.entity.predicate.setEvidence([evidence]);
    self.noctuaAnnotonFormService.initializeForm();
  }

  addRootTerm() {
    const self = this;

    const term = _.find(noctuaFormConfig.rootNode, (rootNode) => {
      return rootNode.aspect === self.entity.aspect
    });

    if (term) {
      self.entity.term = new Entity(term.id, term.label);
      self.noctuaAnnotonFormService.initializeForm();
    }
  }

  clearValues() {
    const self = this;

    self.entity.clearValues();
    self.noctuaAnnotonFormService.initializeForm();
  }

  openSelectEvidenceDialog() {
    const self = this;

    const evidences: Evidence[] = this.camService.getUniqueEvidence();

    const success = function (selected) {
      if (selected.evidences && selected.evidences.length > 0) {
        self.entity.predicate.setEvidence(selected.evidences, ['assignedBy']);
        self.noctuaAnnotonFormService.initializeForm();
      }
    }

    self.noctuaFormDialogService.openSelectEvidenceDialog(evidences, success);
  }

  termDisplayFn(term): string | undefined {
    return term ? term.label : undefined;
  }

  evidenceDisplayFn(evidence): string | undefined {
    return evidence ? evidence.label : undefined;
  }

  ngOnDestroy(): void {
    this.unsubscribeAll.next();
    this.unsubscribeAll.complete();
  }
}
