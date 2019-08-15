import * as _ from 'lodash';

declare const require: any;
const each = require('lodash/forEach');

import { Evidence } from './evidence';
import { AnnotonError } from './parser/annoton-error';
import { Annoton } from './annoton';
import { Entity } from './entity';
import { EntityLookup } from './entity-lookup';
import { Contributor } from './../contributor';
import { Predicate } from '.';

export interface AnnotonNodeDisplay {
  id: string;
  label: string;
  uuid: string;
  isExtension: boolean;
  aspect: string;
  lookupGroup: string;
  displaySection: any;
  displayGroup: any;
  relationship: any;
  treeLevel: number;
  required: boolean;
  visible: boolean;
}

export class AnnotonNode implements AnnotonNodeDisplay {
  id: string;
  label: string;
  uuid: string;
  term: Entity = new Entity('', '');
  termLookup: EntityLookup = new EntityLookup();
  isExtension = false;
  aspect: string;
  lookupGroup: string;
  nodeGroup: any = {};
  annoton: Annoton;
  ontologyClass: any = [];
  isComplement = false;
  closures: any = [];
  assignedBy: boolean = null;
  contributor: Contributor = null;
  isCatalyticActivity = false;
  displaySection: any;
  displayGroup: any;
  predicate: Predicate;
  relationship: any;
  treeLevel = 1;
  required = false;
  visible = true;
  termRequiredList = ['mf'];
  edgeRange: string[];
  evidenceRequiredList = ['mf', 'bp', 'cc', 'mf-1', 'mf-2', 'bp-1', 'bp-1-1', 'cc-1', 'cc-1-1', 'c-1-1-1']
  evidenceNotRequiredList = [];
  errors = [];
  warnings = [];
  status = '0';

  constructor() {
  }


  getTerm() {
    return this.term;
  }

  get classExpression() {
    return this.term.classExpression;
  }

  set classExpression(classExpression) {
    this.term.classExpression = classExpression;
  }


  setTermOntologyClass(value) {
    this.ontologyClass = value;
  }

  toggleIsComplement() {
    const self = this;

    self.isComplement = !self.isComplement;
    self.nodeGroup.isComplement = self.isComplement;
  }

  setIsComplement(complement) {
    const self = this;

    self.isComplement = complement;
  }

  hasValue() {
    const self = this;

    return self.term.hasValue();
  }

  clearValues() {
    const self = this;

    self.term.id = null;
    self.term.label = null;
  }

  copyValues(node: AnnotonNode) {
    const self = this;

    self.uuid = node.uuid;
    self.term = node.term;
    self.assignedBy = node.assignedBy;
    self.isComplement = node.isComplement;
    self.isCatalyticActivity = node.isCatalyticActivity;
  }

  setTermLookup(value) {
    this.termLookup.requestParams = value;
  }


  setDisplay(value) {
    if (value) {
      this.displaySection = value.displaySection;
      this.displayGroup = value.displayGroup;
    }
  }


  enableRow() {
    const self = this;
    let result = true;

    if (self.nodeGroup) {
      if (self.nodeGroup.isComplement && self.treeLevel > 0) [
        result = false
      ]
    }

    return result;
  }

  enableSubmit(errors) {
    const self = this;
    let result = true;

    if (self.termRequiredList.includes(self.id) && !self.term.id) {
      self.required = true;
      const meta = {
        aspect: self.label
      }
      const error = new AnnotonError('error', 1, "A '" + self.label + "' is required", meta)
      errors.push(error);
      result = false;
    } else {
      self.required = false;
    }

    /*if (self.term.id && self.evidenceRequiredList.includes(self.id) &&
       !self.evidenceNotRequiredList.includes(self.term.id)) {
      each(self.evidence, (evidence: Evidence, key) => {
        if (self.term.id)
          result = evidence.enableSubmit(errors, self, key + 1) && result;
      }) 
    }*/

    return result;
  }

  overrideValues(override: Partial<AnnotonNodeDisplay> = {}) {
    Object.assign(this, override);
  }
}
