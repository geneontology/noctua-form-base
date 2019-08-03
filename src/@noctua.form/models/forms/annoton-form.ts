import { FormGroup, FormControl, FormBuilder, FormArray, Validators } from '@angular/forms';
import { merge, Observable, Subscription, BehaviorSubject, fromEvent, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

import * as _ from 'lodash';
declare const require: any;
const each = require('lodash/forEach');

import { Annoton } from './../annoton/annoton';
import { AnnotonNode } from './../annoton/annoton-node';
import { AnnotonFormMetadata } from './../forms/annoton-form-metadata';
import { EntityGroupForm } from './entity-group-form';
import { termValidator } from './validators/term-validator';
import { EntityLookup } from '../annoton/entity-lookup';
import { Entity } from '../annoton/entity';

export class AnnotonForm {
  entityGroupForms: EntityGroupForm[] = [];
  gp = new FormControl();
  fd = new FormArray([]);

  _metadata: AnnotonFormMetadata;

  private _fb = new FormBuilder();

  constructor(metadata, geneProduct?: AnnotonNode) {
    this._metadata = metadata;

    if (geneProduct) {
      this.gp.setValue(geneProduct.getTerm());
      this.gp.setValidators(termValidator(geneProduct));
    }
  }

  createFunctionDescriptionForm(fdData) {
    const self = this;

    each(fdData, (nodeGroup, nodeKey) => {
      const entityGroupForm = new EntityGroupForm(this._metadata);

      this.entityGroupForms.push(entityGroupForm);
      entityGroupForm.name = nodeKey;
      entityGroupForm.createEntityForms(nodeGroup.nodes);
      self.fd.push(self._fb.group(entityGroupForm));
    });
  }

  populateAnnoton(annoton: Annoton) {
    const gpNode = annoton.getGPNode();
    gpNode.term = new Entity(this.gp.value.id, this.gp.value.label);

    this.entityGroupForms.forEach((entityGroupForm: EntityGroupForm) => {
      entityGroupForm.populateAnnotonNodes(annoton);
    });
  }

  onValueChanges(lookup: EntityLookup) {
    const self = this;

    self.gp.valueChanges.pipe(
      distinctUntilChanged(),
      debounceTime(400)
    ).subscribe(data => {
      self._metadata.lookupFunc(data, lookup.requestParams).subscribe(response => {
        lookup.results = response;
      });
    });
  }

  getErrors(error) {
    if (this.gp.errors) {
      error.push(this.gp.errors);
    }

    this.entityGroupForms.forEach((entityGroupForm: EntityGroupForm) => {
      entityGroupForm.getErrors(error);
    });
  }
}
