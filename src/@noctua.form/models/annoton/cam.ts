import * as _ from 'lodash';
declare const require: any;
const each = require('lodash/forEach');
const uuid = require('uuid/v1');
import { Edge as NgxEdge, Node as NgxNode, NodeDimension, ClusterNode, Layout } from '@swimlane/ngx-graph';

import { noctuaFormConfig } from './../../noctua-form-config';
import { Annoton } from './annoton'
import { AnnotonNode } from './annoton-node'
import { Group } from '../group';
import { Contributor } from '../contributor';
import { Evidence } from './evidence';
import { Triple } from './triple';
import { Entity } from './entity';
import { ConnectorAnnoton } from './connector-annoton';


export class Cam {

  //Details
  title: string;
  state: any;
  //User Info
  groups: Group[] = [];
  contributors: Contributor[] = [];
  group: any;

  id: string;
  expanded?: boolean;
  model: any;
  annotatedEntity?: {};
  camRow?: any;
  annotons: Annoton[] = [];
  connectorAnnotons: ConnectorAnnoton[] = [];
  triples: Triple<AnnotonNode>[] = [];

  error = false;
  engine;
  onGraphChanged;
  manager;
  individualManager;
  groupManager;
  graph;
  date;
  modelId;
  summaryExpanded = false;

  ///
  filter = {
    contributor: null,
    uuids: [],
  };

  displayType;

  grid: any = [];
  goterms: Entity[] = [];

  graphPreview = {
    nodes: [],
    edges: []
  };

  constructor() {
    this.displayType = noctuaFormConfig.camDisplayType.options.model;
  }

  getConnectorAnnoton(upstreamId: string, downstreamId: string): ConnectorAnnoton {
    const self = this;

    return _.find(self.connectorAnnotons, (connectorAnnoton: ConnectorAnnoton) => {
      return connectorAnnoton.upstreamNode.uuid === upstreamId &&
        connectorAnnoton.downstreamNode.uuid === downstreamId;
    });
  }

  configureDisplayType() {
    if (this.filter.uuids.length > 0) {
      this.displayType = noctuaFormConfig.camDisplayType.options.entity;
    }
  }


  resetFilter() {
    this.filter.contributor = null;
    this.filter.uuids = [];
  }

  findAnnotonById(id) {
    const self = this;

    return _.find(self.annotons, (annoton) => {
      return annoton.id === id;
    })
  }

  findAnnotonNode() {
    const self = this;
    let result = [];

    each(self.annotons, function (annotonData) {
      each(annotonData.annoton.nodes, function (node) {
        if (node.id === 'mf') {
          result.push({
            node: node,
            annoton: annotonData.annoton
          })
        }
      });
    });

    return result;
  }


  applyFilter() {
    const self = this;

    if (self.filter.uuids.length > 0) {
      self.grid = [];

      each(self.annotons, (annoton: Annoton) => {
        each(annoton.nodes, (node: AnnotonNode) => {
          each(self.filter.uuids, (uuid) => {
            let match = false
            // each(node.evidence, (evidence: Evidence) => {
            //    match = match || (evidence.uuid === uuid);
            //  })
            match = match || (node.uuid === uuid);
            if (match) {
              self.generateGridRow(annoton, node);
            }
          });
        });
      });
    }
  }

  getAnnotonByConnectionId(connectionId) {
    const self = this;
    let result = _.find(self.annotons, (annoton: Annoton) => {
      return annoton.id === connectionId;
    })

    return result;
  }

  getUniqueEvidences(result?) {
    const self = this;

    if (!result) {
      result = [];
    }

    each(self.annotons, function (annoton: Annoton) {
      each(annoton.edges, function (triple: Triple<AnnotonNode>) {
        each(triple.predicate.evidence, function (evidence: Evidence) {
          if (evidence.hasValue()) {
            if (!self.evidenceExists(result, evidence)) {
              result.push(evidence);
            }
          }
        });
      });
    });

    return result;
  }

  evidenceExists(data, evidence) {
    const self = this;

    return _.find(data, function (x) {
      return x.isEvidenceEqual(evidence)
    })
  }

  addUniqueEvidences(existingEvidence, data) {
    const self = this;
    let result = [];

    each(data, function (annotation) {
      each(annotation.annotations, function (node) {
        each(node.evidence, function (evidence) {
          if (evidence.hasValue()) {
            if (!self.evidenceExists(result, evidence)) {
              result.push(evidence);
            }
          }
        });
      });
    });

    return result;
  }

  addUniqueEvidencesFromAnnoton(annoton) {
    const self = this;
    let result = [];

    each(annoton.nodes, function (node) {
      each(node.evidence, function (evidence) {
        if (evidence.hasValue()) {
          if (!self.evidenceExists(result, evidence)) {
            result.push(evidence);
          }
        }
      });
    });

    return result;
  }


  setPreview() {
    const self = this;

    self.graphPreview.nodes = <NgxNode[]>self.annotons.map((annoton: Annoton) => {
      return {
        id: annoton.id,
        label: annoton.presentation.mfText
      };
    });

    console.log(self.graphPreview.nodes);
    /*
        self.graphPreview.edges = <NgxEdge[]>triples.map((triple: Triple<AnnotonNode>) => {
          return {
            source: triple.subject.id,
            target: triple.object.id,
            label: triple.predicate.edge.label
          };
        });*/
  }

  generateTripleGrid() {
    let grid = [...this.triples.map((triple) => {
      return triple.grid;
    })]



    console.log(grid)

    return grid;
    //return _.flattenDeep(grid);
  }



  generateGridRow(annoton: Annoton, node: AnnotonNode) {
    const self = this;

    let term = node.getTerm();

    self.grid.push({
      displayEnabledBy: self.tableCanDisplayEnabledBy(node),
      treeLevel: node.treeLevel,
      relationship: node.isExtension ? '' : self.tableDisplayExtension(node),
      relationshipExt: node.isExtension ? node.relationship.label : '',
      term: node.isExtension ? {} : term,
      extension: node.isExtension ? term : {},
      aspect: node.aspect,
      /*  evidence: node.evidence.length > 0 ? node.evidence[0].evidence : {},
       reference: node.evidence.length > 0 ? node.evidence[0].reference : {},
       with: node.evidence.length > 0 ? node.evidence[0].with : {},
       assignedBy: node.evidence.length > 0 ? node.evidence[0].assignedBy : {}, */
      annoton: annoton,
      node: node
    })
    /* 
        for (let i = 1; i < node.evidence.length; i++) {
          self.grid.push({
            treeLevel: node.treeLevel,
            evidence: node.evidence[i].evidence,
            reference: node.evidence[i].reference,
            with: node.evidence[i].with.control,
            assignedBy: node.evidence[i].assignedBy,
            node: node,
          }) 
        }*/
  }

  tableCanDisplayEnabledBy(node: AnnotonNode) {
    const self = this;

    return node.relationship.id === noctuaFormConfig.edge.enabledBy.id
  }

  tableDisplayExtension(node: AnnotonNode) {
    const self = this;

    if (node.id === 'mf') {
      return '';
    } else if (node.isComplement) {
      return 'NOT ' + node.relationship.label;
    } else {
      return node.relationship.label;
    }
  }
}