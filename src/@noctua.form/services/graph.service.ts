import { environment } from './../../environments/environment';
import { Injectable } from '@angular/core';



import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, forkJoin, Observable, Subscriber } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  Cam,
  Annoton,
  Triple,
  AnnotonNode,
  AnnotonParser,
  AnnotonError,
  Evidence,
  SimpleAnnoton,
  Entity,
  ConnectorAnnoton,
  ConnectorType,
  ConnectorState,
  Predicate
} from './../models/annoton/';
//Config
import { noctuaFormConfig } from './../noctua-form-config';
import { NoctuaFormConfigService } from './config/noctua-form-config.service';
import { NoctuaLookupService } from './lookup.service';
import { NoctuaUserService } from './../services/user.service';

import 'rxjs/add/observable/forkJoin';
import * as _ from 'lodash';
import { annotonNodeType } from './../data/config/entity-definition';
import { AnnotonType } from '@noctua.form/models/annoton/annoton';


declare const require: any;



const each = require('lodash/forEach');
const forOwn = require('lodash/forOwn');
const model = require('bbop-graph-noctua');
const amigo = require('amigo2');
const bbopx = require('bbopx');
const golr_response = require('bbop-response-golr');
const golr_manager = require('bbop-manager-golr');
const golr_conf = require('golr-conf');
const node_engine = require('bbop-rest-manager').node;
const barista_response = require('bbop-response-barista');
const minerva_requests = require('minerva-requests');
const jquery_engine = require('bbop-rest-manager').jquery;
const class_expression = require('class-expression');
const minerva_manager = require('bbop-manager-minerva');

@Injectable({
  providedIn: 'root'
})
export class NoctuaGraphService {
  baristaLocation = environment.globalBaristaLocation;
  minervaDefinitionName = environment.globalMinervaDefinitionName;
  locationStore = new bbopx.noctua.location_store();
  baristaToken;
  linker;
  userInfo;
  modelInfo;

  constructor(
    private noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    private httpClient: HttpClient,
    private noctuaLookupService: NoctuaLookupService) {
    this.linker = new amigo.linker();
    this.userInfo = {
      groups: [],
      selectedGroup: {}
    };
    this.modelInfo = {
      graphEditorUrl: ''
    };
  }

  registerManager() {
    const engine = new jquery_engine(barista_response);
    engine.method('POST');

    const manager = new minerva_manager(
      this.baristaLocation,
      this.minervaDefinitionName,
      this.noctuaUserService.baristaToken,
      engine, 'async');


    const managerError = (resp) => {
      console.log('There was a manager error (' +
        resp.message_type() + '): ' + resp.message());
    };

    const warning = (resp) => {
      alert('Warning: ' + resp.message() + '; ' +
        'your operation was likely not performed');
    };

    const error = (resp) => {
      const perm_flag = 'InsufficientPermissionsException';
      const token_flag = 'token';
      if (resp.message() && resp.message().indexOf(perm_flag) !== -1) {
        alert('Error: it seems like you do not have permission to ' +
          'perform that operation. Did you remember to login?');
      } else if (resp.message() && resp.message().indexOf(token_flag) !== -1) {
        alert('Error: it seems like you have a bad token...');
      } else {
        console.log('error:', resp, resp.message_type(), resp.message());

        if (resp.message().includes('UnknownIdentifierException')) {
          //  cam.error = true
        }
      }
    };

    const shieldsUp = () => { };
    const shieldsDown = () => { };

    manager.register('prerun', shieldsUp);
    manager.register('postrun', shieldsDown, 9);
    manager.register('manager_error', managerError, 10);
    manager.register('warning', warning, 10);
    manager.register('error', error, 10);

    return manager;
  }

  getGraphInfo(cam: Cam, modelId) {
    const self = this;

    cam.onGraphChanged = new BehaviorSubject(null);
    cam.modelId = modelId;
    cam.manager = this.registerManager();
    cam.individualManager = this.registerManager();
    cam.groupManager = this.registerManager();

    const rebuild = (resp) => {
      const noctua_graph = model.graph;

      cam.graph = new noctua_graph();
      cam.modelId = resp.data().id;
      cam.graph.load_data_basic(resp.data());
      const titleAnnotations = cam.graph.get_annotations_by_key('title');
      const stateAnnotations = cam.graph.get_annotations_by_key('state');

      if (titleAnnotations.length > 0) {
        cam.title = titleAnnotations[0].value();
      }

      if (stateAnnotations.length > 0) {
        cam.state = self.noctuaFormConfigService.findModelState(stateAnnotations[0].value());
      }

      self.graphPreParse(cam.graph).subscribe((data) => {
        cam.annotons = self.graphToAnnotons(cam);
        cam.connectorAnnotons = self.getConnectorAnnotons(cam);
        cam.setPreview();
        self.graphPostParse(cam, cam.graph).subscribe((data) => {
          cam.onGraphChanged.next(cam.annotons);
        });
      });
    };

    cam.manager.register('rebuild', function (resp) {
      rebuild(resp);
    }, 10);

    cam.manager.get_model(modelId);
  }


  addModel(manager) {
    manager.add_model();
  }

  getNodeInfo(node) {
    const result: any = {};

    each(node.types(), function (srcType) {
      const type = srcType.type() === 'complement' ? srcType.complement_class_expression() : srcType;

      result.id = type.class_id();
      result.label = type.class_label();
      result.classExpression = type;
    });

    return result;
  }

  getNodeLocation(node) {
    const result = {
      x: 0,
      y: 0
    };

    const x_annotations = node.get_annotations_by_key('hint-layout-x');
    const y_annotations = node.get_annotations_by_key('hint-layout-y');

    if (x_annotations.length === 1) {
      result.x = parseInt(x_annotations[0].value());
    }

    if (y_annotations.length === 1) {
      result.y = parseInt(y_annotations[0].value());
    }

    return result;
  }

  getNodeIsComplement(node) {
    let result = true;

    if (node) {
      each(node.types(), function (in_type) {
        const t = in_type.type();
        result = result && (t === 'complement');
      });
    }

    return result;
  }

  nodeToAnnotonNode(graph, objectId) {
    const self = this;

    const node = graph.get_node(objectId);
    const nodeInfo = self.getNodeInfo(node);
    const result = {
      uuid: objectId,
      term: new Entity(nodeInfo.id, nodeInfo.label),
      classExpression: nodeInfo.classExpression,
      location: self.getNodeLocation(node),
      isComplement: self.getNodeIsComplement(node)
    };

    return result;
  }

  edgeToEvidence(graph, edge) {
    const self = this;
    const evidenceAnnotations = edge.get_annotations_by_key('evidence');
    const result = [];

    each(evidenceAnnotations, function (evidenceAnnotation) {
      const annotationId = evidenceAnnotation.value();
      const annotationNode = graph.get_node(annotationId);
      const evidence = new Evidence();

      evidence.edge = new Entity(edge.predicate_id(), '');
      evidence.uuid = annotationNode.id();
      if (annotationNode) {

        const nodeInfo = self.getNodeInfo(annotationNode);
        evidence.setEvidence(new Entity(nodeInfo.id, nodeInfo.label), nodeInfo.classExpression);

        const sources = annotationNode.get_annotations_by_key('source');
        const withs = annotationNode.get_annotations_by_key('with');
        const assignedBys = annotationNode.get_annotations_by_key('providedBy');
        if (sources.length > 0) {
          evidence.reference = sources[0].value();
        }
        if (withs.length > 0) {
          if (withs[0].value().startsWith('gomodel')) {
            evidence.with = withs[0].value();
          } else {
            evidence.with = withs[0].value();
          }
        }
        if (assignedBys.length > 0) {
          evidence.assignedBy = new Entity(null, assignedBys[0].value(), assignedBys[0].value());
        }
        result.push(evidence);
      }
    });

    return result;
  }

  graphPreParse(graph) {
    const self = this;
    const promises = [];

    each(graph.get_nodes(), function (node) {
      const termNodeInfo = self.getNodeInfo(node);

      each(graph.get_edges_by_subject(node.id()), function (e) {
        const predicateId = e.predicate_id();
        const objectNode = graph.get_node(e.object_id());
        const objectTermNodeInfo = self.getNodeInfo(objectNode);

        each(noctuaFormConfig.closures, (closure) => {
          promises.push(self.isaClosurePreParse(objectTermNodeInfo.id, closure.id, node));
        });

      });
    });

    return forkJoin(promises);
  }

  graphPostParse(cam: Cam, graph) {
    const self = this;
    const promises = [];

    each(cam.annotons, function (annoton: Annoton) {
      const mfNode = annoton.getMFNode();

      if (mfNode && mfNode.hasValue()) {
        promises.push(self.isaClosurePostParse(mfNode.getTerm().id, self.noctuaFormConfigService.closures.catalyticActivity.id, mfNode));
      }

    });

    return forkJoin(promises);
  }

  isaClosurePreParse(a, b, node) {
    const self = this;

    return self.noctuaLookupService.isaClosure(a, b)
      .pipe(
        map((response) => {
          self.noctuaLookupService.addLocalClosure(a, b, response);
        })
      );
  }

  isaClosurePostParse(a, b, node: AnnotonNode) {
    const self = this;

    return self.noctuaLookupService.isaClosure(a, b).pipe(
      map(result => {
        node.isCatalyticActivity = result;
        return result;
      }));
  }


  determineAnnotonType(mfNode, mfEdgesIn) {
    const self = this;
    let result = noctuaFormConfig.annotonType.options.default.name;

    if (mfNode.term.id === noctuaFormConfig.rootNode.mf.id) {
      each(mfEdgesIn, function (toMFEdge) {
        const predicateId = toMFEdge.predicate_id();

        if (_.find(noctuaFormConfig.causalEdges, {
          id: predicateId
        })) {
          result = noctuaFormConfig.annotonType.options.bpOnly.name;
        }
      });
    }

    return result;
  }

  graphToAnnotons(cam: Cam): Annoton[] {
    const self = this;
    const annotons: Annoton[] = [];

    each(cam.graph.all_edges(), (bbopEdge) => {
      if (bbopEdge.predicate_id() === noctuaFormConfig.edge.enabledBy.id) {
        const bbopSubjectId = bbopEdge.subject_id();
        const bbopObjectId = bbopEdge.object_id();
        const subjectNode = self.nodeToAnnotonNode(cam.graph, bbopSubjectId);
        const objectNode = self.nodeToAnnotonNode(cam.graph, bbopObjectId);
        const evidence = self.edgeToEvidence(cam.graph, bbopEdge);
        const subjectEdges = cam.graph.get_edges_by_subject(bbopSubjectId);
        const annotonType = self.determineAnnotonType(subjectNode, subjectEdges);
        const annoton = self.noctuaFormConfigService.createAnnotonModel(AnnotonType.default);
        const annotonNode = annoton.getNode(annotonNodeType.GoMolecularFunction);
        const triple = annoton.getEdge(annotonNodeType.GoMolecularFunction, annotonNodeType.GoMolecularEntity);

        annotonNode.term = subjectNode.term;
        annotonNode.classExpression = subjectNode.classExpression;
        annotonNode.setIsComplement(subjectNode.isComplement);
        annotonNode.uuid = bbopSubjectId;
        triple.predicate.evidence = evidence;
        triple.predicate.uuid = bbopEdge.id();
        self._graphToAnnatonDFS(cam, annoton, subjectEdges, annotonNode);

        annoton.id = bbopSubjectId;
        annotons.push(annoton);
      }
    });

    return annotons;
  }

  getConnectorAnnotons(cam: Cam) {
    const self = this;
    const connectorAnnotons: ConnectorAnnoton[] = [];

    each(cam.annotons, (subjectAnnoton: Annoton) => {
      each(cam.graph.get_edges_by_subject(subjectAnnoton.id), (bbopEdge) => {
        const predicateId = bbopEdge.predicate_id();
        const evidence = self.edgeToEvidence(cam.graph, bbopEdge);
        const objectId = bbopEdge.object_id();
        const objectInfo = self.nodeToAnnotonNode(cam.graph, objectId);

        const causalEdge = <Entity>_.find(noctuaFormConfig.causalEdges, {
          id: predicateId
        });

        if (causalEdge) {
          if (self.noctuaLookupService.getLocalClosure(objectInfo.term.id, noctuaFormConfig.closures.mf.id)) {
            const downstreamAnnoton = cam.getAnnotonByConnectionId(objectId);
            const connectorAnnoton = this.noctuaFormConfigService.createAnnotonConnectorModel(subjectAnnoton, downstreamAnnoton);

            connectorAnnoton.state = ConnectorState.editing;
            connectorAnnoton.type = ConnectorType.basic;
            connectorAnnoton.rule.r1Edge = causalEdge;
            connectorAnnoton.predicate = new Predicate(causalEdge, evidence);
            connectorAnnoton.setRule();
            connectorAnnoton.createGraph();
            connectorAnnotons.push(connectorAnnoton);
          } else if (self.noctuaLookupService.getLocalClosure(objectInfo.term.id, noctuaFormConfig.closures.bp.id)) {
            const processNodeInfo = self.nodeToAnnotonNode(cam.graph, objectId);
            const processNode = self.noctuaFormConfigService.generateAnnotonNode('bp', { id: 'process' });
            const connectorAnnotonDTO = this._getConnectAnnotonIntermediate(cam, objectId);

            if (connectorAnnotonDTO.downstreamAnnoton) {
              processNode.uuid = objectId;
              processNode.term = processNodeInfo.term;
              // processNode.setEvidence(self.edgeToEvidence(cam.graph, e));

              const connectorAnnoton = this.noctuaFormConfigService.createAnnotonConnectorModel(subjectAnnoton, connectorAnnotonDTO.downstreamAnnoton, processNode, connectorAnnotonDTO.hasInputNode);

              connectorAnnoton.state = ConnectorState.editing;
              connectorAnnoton.type = ConnectorType.intermediate;
              connectorAnnoton.rule.r1Edge = new Entity(causalEdge.id, causalEdge.label);
              connectorAnnoton.rule.r2Edge = connectorAnnotonDTO.rule.r2Edge;
              connectorAnnoton.predicate = new Predicate(causalEdge, evidence);
              connectorAnnoton.setRule();
              connectorAnnoton.createGraph();
              connectorAnnotons.push(connectorAnnoton);
            }
          }
        }
      });
    });

    console.log(connectorAnnotons);
    return connectorAnnotons;
  }

  graphToAnnatonDFSError(annoton, annotonNode) {
    const self = this;
    const edge = annoton.getEdges(annotonNode.id);

    each(edge.nodes, function (node) {
      node.object.status = 2;
      self.graphToAnnatonDFSError(annoton, node.object);
    });
  }

  evidenceUseGroups(reqs, evidence: Evidence) {
    const self = this;
    const assignedBy = evidence.assignedBy;

    if (assignedBy) {
      reqs.use_groups(['http://purl.obolibrary.org/go/groups/' + assignedBy]);
    } else if (self.userInfo.groups.length > 0) {
      reqs.use_groups([self.userInfo.selectedGroup.id]);
    } else {
      reqs.use_groups([]);
    }
  }

  adjustBPOnly(annoton, srcEdge) {
    const self = this;
    const mfNode = annoton.getNode(annotonNodeType.GoMolecularFunction);
    const bpNode = annoton.getNode('bp');

    if (mfNode && bpNode && annoton.annotonType === noctuaFormConfig.annotonType.options.bpOnly.name) {
      mfNode.displaySection = noctuaFormConfig.displaySection.fd;
      mfNode.displayGroup = noctuaFormConfig.displayGroup.mf;
      annoton.editEdge(annotonNodeType.GoMolecularFunction, 'bp', srcEdge);
      bpNode.relationship = annoton.getEdge(annotonNodeType.GoMolecularFunction, 'bp').edge;
    }
  }

  saveModelGroup(cam: Cam, groupId) {
    cam.manager.use_groups([groupId]);
  }

  saveCamAnnotations(cam: Cam, annotations) {
    const self = this;

    const titleAnnotations = cam.graph.get_annotations_by_key('title');
    const stateAnnotations = cam.graph.get_annotations_by_key('state');
    const reqs = new minerva_requests.request_set(cam.manager.user_token(), cam.modelId);

    each(titleAnnotations, function (annotation) {
      reqs.remove_annotation_from_model('title', annotation.value());
    });

    each(stateAnnotations, function (annotation) {
      reqs.remove_annotation_from_model('state', annotation.value());
    });

    reqs.add_annotation_to_model('title', annotations.title);
    reqs.add_annotation_to_model('state', annotations.state);

    cam.manager.request_with(reqs);
  }

  saveAnnoton(cam, triples: Triple<AnnotonNode>[], title) {
    const self = this;
    const reqs = new minerva_requests.request_set(cam.manager.user_token(), cam.model.id);

    if (!cam.title) {
      reqs.add_annotation_to_model('title', title);
    }

    self.addFact(reqs, triples);
    reqs.store_model(cam.modelId);

    if (self.userInfo.groups.length > 0) {
      reqs.use_groups([self.userInfo.selectedGroup.id]);
    }

    return cam.manager.request_with(reqs);

  }

  editAnnoton(cam: Cam,
    srcNodes: AnnotonNode[],
    destNodes: AnnotonNode[],
    srcTriples: Triple<AnnotonNode>[],
    destTriples: Triple<AnnotonNode>[],
    removeIds: string[],
    removeTriples: Triple<AnnotonNode>[]) {

    const self = this;
    const reqs = new minerva_requests.request_set(cam.manager.user_token(), cam.modelId);

    each(destNodes, function (destNode: AnnotonNode) {
      const srcNode = _.find(srcNodes, (node: AnnotonNode) => {
        return node.uuid === destNode.uuid;
      });

      if (srcNode) {
        self.editIndividual(reqs, cam, srcNode, destNode);
      }
    });

    self.editFact(reqs, cam, srcTriples, destTriples);
    self.addFact(reqs, destTriples);

    each(removeTriples, function (triple: Triple<AnnotonNode>) {
      reqs.remove_fact([
        triple.subject.uuid,
        triple.object.uuid,
        triple.predicate.edge.id
      ]);
    });

    each(removeIds, function (uuid: string) {
      reqs.remove_individual(uuid);
    });

    console.dir(reqs._requests);

    reqs.store_model(cam.modelId);

    if (self.userInfo.groups.length > 0) {
      reqs.use_groups([self.userInfo.selectedGroup.id]);
    }

    return cam.manager.request_with(reqs);
  }

  deleteAnnoton(cam: Cam, uuids: string[], triples: Triple<AnnotonNode>[]) {
    const self = this;

    const success = () => {
      const reqs = new minerva_requests.request_set(cam.manager.user_token(), cam.model.id);

      each(triples, function (triple: Triple<AnnotonNode>) {
        reqs.remove_fact([
          triple.subject.uuid,
          triple.object.uuid,
          triple.predicate.edge.id
        ]);
      });

      each(uuids, function (uuid: string) {
        reqs.remove_individual(uuid);
      });

      reqs.store_model(cam.modelId);

      if (self.userInfo.groups.length > 0) {
        reqs.use_groups([self.userInfo.selectedGroup.id]);
      }

      return cam.manager.request_with(reqs);
    };

    return success();
  }

  private _graphToAnnatonDFS(cam: Cam, annoton: Annoton, bbopEdges, annotonNode: AnnotonNode) {
    const self = this;
    const triples: Triple<AnnotonNode>[] = annoton.getEdges(annotonNode.id);

    each(bbopEdges, (bbopEdge) => {
      const bbopPredicateId = bbopEdge.predicate_id();
      const bbopObjectId = bbopEdge.object_id();
      const evidence = self.edgeToEvidence(cam.graph, bbopEdge);

      if (annoton.annotonType === noctuaFormConfig.annotonType.options.bpOnly.name) {
        const causalEdge = _.find(noctuaFormConfig.causalEdges, {
          id: bbopPredicateId
        });

        if (causalEdge) {
          //   self.adjustBPOnly(annoton, causalEdge);
        }
      }

      each(triples, (triple: Triple<AnnotonNode>) => {
        if (bbopPredicateId === triple.predicate.edge.id) {
          const objectNode = self.nodeToAnnotonNode(cam.graph, bbopObjectId);

          triple.object.uuid = objectNode.uuid;
          triple.object.term = objectNode.term;
          triple.object.classExpression = objectNode.classExpression;
          triple.object.setIsComplement(objectNode.isComplement);

          triple.predicate.evidence = evidence;
          triple.predicate.uuid = bbopEdge.id();
          self._graphToAnnatonDFS(cam, annoton, cam.graph.get_edges_by_subject(bbopObjectId), triple.object);
        }
      });
    });

    return annoton;
  }

  private _getConnectAnnotonIntermediate(cam: Cam, bpSubjectId: string): ConnectorAnnoton {
    const self = this;
    const connectorAnnoton = new ConnectorAnnoton()

    each(cam.graph.get_edges_by_subject(bpSubjectId), (e) => {
      const predicateId = e.predicate_id();
      const objectId = e.object_id();
      const objectInfo = self.nodeToAnnotonNode(cam.graph, objectId);

      const causalEdge = <Entity>_.find(noctuaFormConfig.causalEdges, {
        id: predicateId
      })

      if (causalEdge) {
        if (self.noctuaLookupService.getLocalClosure(objectInfo.term.id, noctuaFormConfig.closures.mf.id)) {
          const downstreamAnnoton = cam.getAnnotonByConnectionId(objectId);

          connectorAnnoton.rule.r2Edge = new Entity(causalEdge.id, causalEdge.label);;
          connectorAnnoton.downstreamAnnoton = downstreamAnnoton;
        }
      }

      if (e.predicate_id() === noctuaFormConfig.edge.hasInput.id) {
        if (self.noctuaLookupService.getLocalClosure(objectInfo.term.id, noctuaFormConfig.closures.gpHasInput.id)) {
          const hasInputNodeInfo = self.nodeToAnnotonNode(cam.graph, objectId);
          const hasInputNode = self.noctuaFormConfigService.generateAnnotonNode('mf-1', { id: 'has-input' });

          hasInputNode.uuid = objectId;
          hasInputNode.term = hasInputNodeInfo.term;
          hasInputNode.predicate.setEvidence(self.edgeToEvidence(cam.graph, e));
          connectorAnnoton.hasInputNode = hasInputNode;
        }
      }
    });

    return connectorAnnoton;
  }

  addFact(reqs, triples: Triple<AnnotonNode>[]) {
    const self = this;

    each(triples, function (triple: Triple<AnnotonNode>) {
      const subject = self.addIndividual(reqs, triple.subject);
      const object = self.addIndividual(reqs, triple.object);

      if (subject && object) {
        triple.predicate.uuid = reqs.add_fact([
          subject,
          object,
          triple.predicate.edge.id
        ]);

        each(triple.predicate.evidence, function (evidence: Evidence) {
          const evidenceReference = evidence.reference;
          const evidenceWith = evidence.with;

          reqs.add_evidence(evidence.evidence.id, evidenceReference, evidenceWith, triple.predicate.uuid);
        });
      }
    });
  }

  editFact(reqs, cam: Cam, srcTriples: Triple<AnnotonNode>[], destTriples: Triple<AnnotonNode>[]) {
    const self = this;

    each(destTriples, (destTriple: Triple<AnnotonNode>) => {

      const srcTriple = _.find(srcTriples, (triple: Triple<AnnotonNode>) => {
        return triple.subject.uuid === destTriple.subject.uuid && triple.object.uuid === destTriple.object.uuid;
      });

      if (srcTriple) {
        reqs.remove_fact([
          srcTriple.subject.uuid,
          srcTriple.object.uuid,
          srcTriple.predicate.edge.id
        ]);
      }
    });
  }

  deleteFact(reqs, triples: Triple<AnnotonNode>[]) {
    const self = this;

    each(triples, function (triple: Triple<AnnotonNode>) {
      const subject = self.addIndividual(reqs, triple.subject);
      const object = self.addIndividual(reqs, triple.object);
      each(triple.predicate.evidence, function (evidence: Evidence) {
        reqs.remove_individual(evidence.uuid);
      });
      reqs.remove_individual(triple.subject.uuid);
    });
  }


  addIndividual(reqs: any, node: AnnotonNode): string | null {
    if (node.uuid) {
      return node.uuid;
    }

    if (node.hasValue()) {
      if (node.isComplement) {
        const ce = new class_expression();
        ce.as_complement(node.term.id);
        node.uuid = reqs.add_individual(ce);
      } else {
        node.uuid = reqs.add_individual(node.term.id);
      }
      return node.uuid;
    }

    return null;
  }

  editIndividual(reqs, cam: Cam, srcNode, destNode) {
    if (srcNode.hasValue() && destNode.hasValue()) {
      reqs.remove_type_from_individual(
        srcNode.classExpression,
        srcNode.uuid,
        cam.modelId,
      );

      reqs.add_type_to_individual(
        class_expression.cls(destNode.getTerm().id),
        srcNode.uuid,
        cam.modelId,
      );
    }
  }

  deleteIndividual(reqs, node) {
    if (node.uuid) {
      reqs.remove_individual(node.uuid);
    }
  }

}