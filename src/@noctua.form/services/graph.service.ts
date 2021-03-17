import { environment } from './../../environments/environment';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  Cam,
  Annoton,
  Triple,
  AnnotonNode,
  Evidence,
  Entity,
  ConnectorAnnoton,
  ConnectorType,
  ConnectorState,
  Predicate
} from './../models/annoton/';

import * as ModelDefinition from './../data/config/model-definition';
import * as EntityDefinition from './../data/config/entity-definition';

import { noctuaFormConfig } from './../noctua-form-config';
import { NoctuaFormConfigService } from './config/noctua-form-config.service';
import { NoctuaLookupService } from './lookup.service';
import { NoctuaUserService } from './../services/user.service';
import { AnnotonType } from './../models/annoton/annoton';
import { Contributor } from './../models/contributor';
import { find, each } from 'lodash';
import { Group } from './../models';
import { CardinalityViolation, RelationViolation } from './../models/annoton/error/violation-error';
import { CurieService } from './../../@noctua.curie/services/curie.service';

declare const require: any;

const model = require('bbop-graph-noctua');
const amigo = require('amigo2');
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
  linker = new amigo.linker();
  curieUtil: any;

  constructor(
    private curieService: CurieService,
    private noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    private noctuaLookupService: NoctuaLookupService) {
    this.curieUtil = this.curieService.getCurieUtil();
  }

  registerManager(useReasoner = true) {
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

    manager.use_reasoner_p(useReasoner);

    return manager;
  }

  getGraphInfo(cam: Cam, modelId) {
    const self = this;
    cam.loading.status = true;
    cam.loading.message = 'Getting Models...';
    cam.onGraphChanged = new BehaviorSubject(null);
    cam.id = modelId;
    cam.manager = this.registerManager();
    cam.artManager = this.registerManager();
    cam.groupManager = this.registerManager();
    cam.replaceManager = this.registerManager(false);



    const update = (response) => {
      const noctua_graph = model.graph;

      console.log(response)
      cam.modified = response.data()['modified-p'];
      cam.pendingGraph = new noctua_graph();
      cam.pendingGraph.load_data_basic(response.data());

      self.updateCam(cam);
      cam.onGraphChanged.next(cam.annotons);
      cam.loading.status = false;
      cam.loading.message = '';
    };

    cam.manager.register('rebuild', function (resp) {
      self.rebuild(cam, resp);
    }, 10);

    cam.manager.get_model(modelId);
  }

  rebuild(cam: Cam, response) {
    const self = this;
    const noctua_graph = model.graph;

    // cam.loading.status = true;
    // cam.loading.message = 'Loading Model Entities Metadata...';

    if (cam.graph) {
      const inGraph = new noctua_graph();

      inGraph.load_data_basic(response.data());
      cam.graph.merge_special(inGraph);
    } else {
      cam.graph = new noctua_graph();

      cam.graph.load_data_basic(response.data());
    }

    cam.id = response.data().id;
    cam.modified = response.data()['modified-p'];
    cam.isReasoned = response['is-reasoned'];

    if (cam.isReasoned) {

    }

    const titleAnnotations = cam.graph.get_annotations_by_key('title');
    const stateAnnotations = cam.graph.get_annotations_by_key('state');
    const dateAnnotations = cam.graph.get_annotations_by_key('date');
    const groupAnnotations = cam.graph.get_annotations_by_key('providedBy');
    const contributorAnnotations = cam.graph.get_annotations_by_key('contributor');

    cam.contributors = self.noctuaUserService.getContributorsFromAnnotations(contributorAnnotations);
    cam.groups = self.noctuaUserService.getGroupsFromAnnotations(groupAnnotations);

    if (dateAnnotations.length > 0) {
      cam.date = dateAnnotations[0].value();
    }

    if (titleAnnotations.length > 0) {
      cam.title = titleAnnotations[0].value();
    }

    if (stateAnnotations.length > 0) {
      cam.state = self.noctuaFormConfigService.findModelState(stateAnnotations[0].value());
    }

    self.loadCam(cam);
    self.loadViolations(cam, response.data()['validation-results'])
    cam.loading.status = false;
    cam.loading.message = '';
  }

  loadCam(cam: Cam) {
    const self = this;

    cam.annotons = self.graphToAnnotons(cam.graph);
    cam.applyFilter();
    cam.onGraphChanged.next(cam.annotons);
    cam.connectorAnnotons = self.getConnectorAnnotons(cam);
    cam.setPreview();
  }

  updateCam(cam: Cam) {
    const self = this;

    self.updateAnnotons(cam, cam.pendingGraph);
    cam.applyFilter();
    cam.onGraphChanged.next(cam.annotons);
    cam.connectorAnnotons = self.getConnectorAnnotons(cam);
    cam.setPreview();
  }

  loadViolations(cam: Cam, validationResults) {
    const self = this;
    let violations;

    if (validationResults &&
      validationResults['shex-validation'] &&
      validationResults['shex-validation']['violations']) {
      violations = validationResults['shex-validation']['violations'];
      cam.hasViolations = violations.length > 0;
      cam.violations = [];
      violations.forEach((violation: any) => {
        violation.explanations.forEach((explanation) => {
          explanation.constraints.forEach((constraint) => {
            const camViolation = self.generateViolation(cam, violation.node, constraint);

            if (camViolation) {
              cam.violations.push(camViolation);
            }
          });
        });
      });
    }

    cam.setViolations();
  }

  generateViolation(cam: Cam, node, constraint) {
    const self = this;
    const annotonNode = self.nodeToAnnotonNode(cam.graph, node)

    if (!annotonNode) {
      return null;
    }

    let violation;
    if (constraint.cardinality) {
      const edge = self.noctuaFormConfigService.findEdge(constraint.property);
      violation = new CardinalityViolation(
        annotonNode,
        edge,
        constraint.nobjects,
        constraint.cardinality
      );
    } else if (constraint.object) {
      violation = new RelationViolation(annotonNode);
      violation.predicate = self.noctuaFormConfigService.findEdge(constraint.property);

      const object = constraint.object.startsWith('http')
        ? self.curieUtil.getCurie(constraint.object)
        : constraint.object

      violation.object = self.nodeToAnnotonNode(cam.graph, object);
    }

    return violation;
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

  getNodeRootInfo(node): Entity[] {
    const result = node.root_types().map((srcType) => {
      const type = srcType.type() === 'complement' ? srcType.complement_class_expression() : srcType;
      return new Entity(type.class_id(), type.class_label());
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

  nodeToAnnotonNode(graph, objectId): Partial<AnnotonNode> {
    const self = this;

    const node = graph.get_node(objectId);
    if (!node) {
      return null;
    }
    const nodeInfo = self.getNodeInfo(node);
    const result = {
      uuid: objectId,
      term: new Entity(nodeInfo.id, nodeInfo.label, self.linker.url(nodeInfo.id), objectId),
      rootTypes: self.getNodeRootInfo(node),
      classExpression: nodeInfo.classExpression,
      location: self.getNodeLocation(node),
      isComplement: self.getNodeIsComplement(node),
    };

    //if (result.uuid === 'gomodel:R-HSA-9679509/R-COV-9686310_R-HSA-9686174') {
    //  console.log(result.term.label, result.rootTypes, result.uuid)
    //}

    return new AnnotonNode(result);
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
        evidence.setEvidence(new Entity(nodeInfo.id,
          nodeInfo.label,
          self.noctuaLookupService.getTermURL(nodeInfo.id)), nodeInfo.classExpression);

        const sources = annotationNode.get_annotations_by_key('source');
        const withs = annotationNode.get_annotations_by_key('with');
        const contributorAnnotations = annotationNode.get_annotations_by_key('contributor');
        const groupAnnotations = annotationNode.get_annotations_by_key('providedBy');

        if (sources.length > 0) {
          evidence.reference = sources[0].value();
          const referenceUrl = self.noctuaLookupService.getTermURL(evidence.reference);
          evidence.referenceEntity = new Entity(evidence.reference, evidence.reference, referenceUrl, evidence.uuid)
        }

        if (withs.length > 0) {
          evidence.with = withs[0].value();
          evidence.withEntity = new Entity(evidence.with, evidence.with, null, evidence.uuid)
        }

        if (groupAnnotations.length > 0) {
          evidence.groups = self.noctuaUserService.getGroupsFromAnnotations(groupAnnotations);
        }

        if (contributorAnnotations.length > 0) {
          evidence.contributors = self.noctuaUserService.getContributorsFromAnnotations(contributorAnnotations);
        }

        result.push(evidence);
      }
    });

    return result;
  }


  graphPostParse(cam: Cam) {
    const self = this;
    const promises = [];

    each(cam.annotons, function (annoton: Annoton) {
      const mfNode = annoton.getMFNode();

      if (mfNode && mfNode.hasValue()) {
        promises.push(self.isaClosurePostParse(mfNode.getTerm().id, [EntityDefinition.GoCatalyticActivity], mfNode));
      }
    });

    return forkJoin(promises);
  }

  isaClosurePostParse(a: string, b: any[], node: AnnotonNode) {
    const self = this;
    const closure = self.noctuaLookupService.categoryToClosure(b);

    return self.noctuaLookupService.isaClosure(a, closure).pipe(
      map(result => {
        node.isCatalyticActivity = result;
        return result;
      }));
  }

  getActivityPreset(subjectNode: Partial<AnnotonNode>, predicateId, bbopSubjectEdges): Annoton {
    const self = this;
    let annotonType = AnnotonType.default;

    if (predicateId === noctuaFormConfig.edge.partOf.id &&
      subjectNode.hasRootType(EntityDefinition.GoMolecularEntity)) {
      annotonType = AnnotonType.ccOnly;
    } else if (subjectNode.term.id === noctuaFormConfig.rootNode.mf.id) {
      each(bbopSubjectEdges, function (subjectEdge) {
        if (find(noctuaFormConfig.causalEdges, { id: subjectEdge.predicate_id() })) {
          annotonType = AnnotonType.bpOnly;
        }
      });
    }

    return self.noctuaFormConfigService.createAnnotonBaseModel(annotonType);
  }

  updateAnnotons(cam: Cam, camGraph) {
    const self = this;
    each(camGraph.all_nodes(), (bbopNode) => {
      const annotonNode: AnnotonNode = cam.findNodeById(bbopNode.id(), cam.annotons);

      if (annotonNode) {
        const updatedAnnotonNode = self.nodeToAnnotonNode(camGraph, bbopNode.id());
        annotonNode.term = updatedAnnotonNode.term;
        annotonNode.classExpression = updatedAnnotonNode.classExpression;
        annotonNode.setIsComplement(updatedAnnotonNode.isComplement);
      }
    });

  }

  graphToAnnotons(camGraph): Annoton[] {
    const self = this;
    const annotons: Annoton[] = [];

    each(camGraph.all_edges(), (bbopEdge) => {
      const bbopSubjectId = bbopEdge.subject_id();
      const subjectNode = self.nodeToAnnotonNode(camGraph, bbopSubjectId);

      if (bbopEdge.predicate_id() === noctuaFormConfig.edge.enabledBy.id ||
        (bbopEdge.predicate_id() === noctuaFormConfig.edge.partOf.id &&
          subjectNode.hasRootType(EntityDefinition.GoMolecularEntity))) {

        const subjectEdges = camGraph.get_edges_by_subject(bbopSubjectId);
        const annoton: Annoton = self.getActivityPreset(subjectNode, bbopEdge.predicate_id(), subjectEdges);
        const subjectAnnotonNode = annoton.rootNode;

        subjectAnnotonNode.term = subjectNode.term;
        subjectAnnotonNode.classExpression = subjectNode.classExpression;
        subjectAnnotonNode.setIsComplement(subjectNode.isComplement);
        subjectAnnotonNode.uuid = bbopSubjectId;
        self._graphToAnnotonDFS(camGraph, annoton, subjectEdges, subjectAnnotonNode);
        annoton.id = bbopSubjectId;
        annoton.postRunUpdate();
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

        const causalEdge = <Entity>find(noctuaFormConfig.causalEdges, {
          id: predicateId
        });

        if (causalEdge) {
          if (objectInfo.hasRootType(EntityDefinition.GoMolecularFunction)) {
            const downstreamAnnoton = cam.getAnnotonByConnectionId(objectId);
            const connectorAnnoton = this.noctuaFormConfigService.createAnnotonConnectorModel(subjectAnnoton, downstreamAnnoton);

            connectorAnnoton.state = ConnectorState.editing;
            connectorAnnoton.type = ConnectorType.basic;
            connectorAnnoton.rule.r1Edge = causalEdge;
            connectorAnnoton.predicate = new Predicate(causalEdge, evidence);
            connectorAnnoton.setRule();
            connectorAnnoton.createGraph();
            connectorAnnotons.push(connectorAnnoton);
          } else if (objectInfo.hasRootType(EntityDefinition.GoBiologicalProcess)) {
            const processNodeInfo = self.nodeToAnnotonNode(cam.graph, objectId);

            const processNode = EntityDefinition.generateBaseTerm([EntityDefinition.GoBiologicalProcess], { id: 'process', isKey: true });
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

    return connectorAnnotons;
  }

  saveModelGroup(cam: Cam, groupId) {
    cam.manager.use_groups([groupId]);
    cam.groupId = groupId;
  }

  resetModel(cam: Cam) {
    const self = this;
    const reqs = new minerva_requests.request_set(self.noctuaUserService.baristaToken, cam.id);

    const req = new minerva_requests.request('model', 'reset');
    req.model(cam.id);
    reqs.add(req, 'query');
    return cam.manager.request_with(reqs);
  }

  storeModel(cam: Cam) {
    const self = this;
    const reqs = new minerva_requests.request_set(self.noctuaUserService.baristaToken, cam.id);

    if (self.noctuaUserService.user && self.noctuaUserService.user.groups.length > 0) {
      reqs.use_groups([self.noctuaUserService.user.group.id]);
    }

    reqs.store_model(cam.id);
    return cam.manager.request_with(reqs);
  }

  saveCamAnnotations(cam: Cam, annotations) {
    const self = this;

    const titleAnnotations = cam.graph.get_annotations_by_key('title');
    const stateAnnotations = cam.graph.get_annotations_by_key('state');
    const reqs = new minerva_requests.request_set(self.noctuaUserService.baristaToken, cam.id);

    each(titleAnnotations, function (annotation) {
      reqs.remove_annotation_from_model('title', annotation.value());
    });

    each(stateAnnotations, function (annotation) {
      reqs.remove_annotation_from_model('state', annotation.value());
    });

    reqs.add_annotation_to_model('title', annotations.title);
    reqs.add_annotation_to_model('state', annotations.state);

    reqs.store_model(cam.id);
    cam.manager.request_with(reqs);
  }

  saveAnnoton(cam: Cam, triples: Triple<AnnotonNode>[], title) {
    const self = this;
    const reqs = new minerva_requests.request_set(self.noctuaUserService.baristaToken, cam.model.id);

    if (!cam.title) {
      reqs.add_annotation_to_model('title', title);
    }

    self.addFact(reqs, triples);

    if (self.noctuaUserService.user && self.noctuaUserService.user.groups.length > 0) {
      reqs.use_groups([self.noctuaUserService.user.group.id]);
    }

    reqs.store_model(cam.id);
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
    const reqs = new minerva_requests.request_set(self.noctuaUserService.baristaToken, cam.id);

    each(destNodes, function (destNode: AnnotonNode) {
      const srcNode = find(srcNodes, (node: AnnotonNode) => {
        return node.uuid === destNode.uuid;
      });

      if (srcNode) {
        self.editIndividual(reqs, cam, srcNode, destNode);
      }
    });

    self.editFact(reqs, srcTriples, destTriples);
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

    if (self.noctuaUserService.user && self.noctuaUserService.user.groups.length > 0) {
      reqs.use_groups([self.noctuaUserService.user.group.id]);
    }

    reqs.store_model(cam.id);
    return cam.manager.request_with(reqs);
  }

  replaceAnnoton(manager, modelId, entities: Entity[], replaceWithTerm: Entity) {

    const self = this;
    const reqs = new minerva_requests.request_set(self.noctuaUserService.baristaToken, modelId);

    each(entities, function (entity: Entity) {
      self.replaceIndividual(reqs, modelId, entity, replaceWithTerm);
    });

    // self.editFact(reqs, cam, srcTriples, destTriples);

    if (self.noctuaUserService.user && self.noctuaUserService.user.groups.length > 0) {
      reqs.use_groups([self.noctuaUserService.user.group.id]);
    }

    // reqs.store_model(modelId);
    return manager.request_with(reqs);
  }


  bulkEditAnnoton(cam: Cam) {
    const self = this;
    const reqs = new minerva_requests.request_set(self.noctuaUserService.baristaToken, cam.id);

    each(cam.annotons, (annoton: Annoton) => {
      each(annoton.nodes, (node: AnnotonNode) => {
        self.bulkEditIndividual(reqs, cam.id, node);
        each(node.predicate.evidence, (evidence: Evidence) => {
          self.bulkEditEvidence(reqs, cam.id, evidence);
        });
      });
    });

    if (self.noctuaUserService.user && self.noctuaUserService.user.groups.length > 0) {
      reqs.use_groups([self.noctuaUserService.user.group.id]);
    }

    return cam.replaceManager.request_with(reqs);
  }

  bulkEditAnnotonNode(cam: Cam, node: AnnotonNode) {
    const self = this;
    const reqs = new minerva_requests.request_set(self.noctuaUserService.baristaToken, cam.id);

    self.bulkEditIndividual(reqs, cam.id, node);
    each(node.predicate.evidence, (evidence: Evidence) => {
      self.bulkEditEvidence(reqs, cam.id, evidence);
    });

    if (self.noctuaUserService.user && self.noctuaUserService.user.groups.length > 0) {
      reqs.use_groups([self.noctuaUserService.user.group.id]);
    }

    return cam.replaceManager.request_with(reqs);
  }

  deleteAnnoton(cam: Cam, uuids: string[], triples: Triple<AnnotonNode>[]) {
    const self = this;

    const success = () => {
      const reqs = new minerva_requests.request_set(self.noctuaUserService.baristaToken, cam.model.id);

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

      reqs.store_model(cam.id);

      if (self.noctuaUserService.user && self.noctuaUserService.user.groups.length > 0) {
        reqs.use_groups([self.noctuaUserService.user.group.id]);
      }

      return cam.manager.request_with(reqs);
    };

    return success();
  }

  private _graphToAnnotonDFS(camGraph, annoton: Annoton, bbopEdges, subjectNode: AnnotonNode) {
    const self = this;

    each(bbopEdges, (bbopEdge) => {
      const bbopPredicateId = bbopEdge.predicate_id();
      const bbopObjectId = bbopEdge.object_id();
      const evidence = self.edgeToEvidence(camGraph, bbopEdge);
      const partialObjectNode = self.nodeToAnnotonNode(camGraph, bbopObjectId);
      const objectNode = this._insertNode(annoton, bbopPredicateId, subjectNode, partialObjectNode);

      annoton.updateEntityInsertMenu();

      if (objectNode) {
        const triple: Triple<AnnotonNode> = annoton.getEdge(subjectNode.id, objectNode.id);
        if (triple) {
          triple.object.uuid = partialObjectNode.uuid;
          triple.object.term = partialObjectNode.term;
          triple.object.classExpression = partialObjectNode.classExpression;
          triple.object.setIsComplement(partialObjectNode.isComplement);
          triple.predicate.evidence = evidence;
          triple.predicate.uuid = bbopEdge.id();
          self._graphToAnnotonDFS(camGraph, annoton, camGraph.get_edges_by_subject(bbopObjectId), triple.object);
        }
      }
    });

    return annoton;
  }

  private _insertNode(annoton: Annoton, bbopPredicateId: string, subjectNode: AnnotonNode,
    partialObjectNode: Partial<AnnotonNode>): AnnotonNode {
    const nodeDescriptions: ModelDefinition.InsertNodeDescription[] = subjectNode.canInsertNodes;
    let objectNode;

    each(nodeDescriptions, (nodeDescription: ModelDefinition.InsertNodeDescription) => {
      if (bbopPredicateId === nodeDescription.predicate.id) {
        if (partialObjectNode.hasRootTypes(nodeDescription.node.category)) {
          objectNode = ModelDefinition.insertNode(annoton, subjectNode, nodeDescription);
          return false;
        }
      }
    });

    return objectNode;
  }

  private _getConnectAnnotonIntermediate(cam: Cam, bpSubjectId: string): ConnectorAnnoton {
    const self = this;
    const connectorAnnoton = new ConnectorAnnoton();

    each(cam.graph.get_edges_by_subject(bpSubjectId), (e) => {
      const predicateId = e.predicate_id();
      const objectId = e.object_id();
      const objectInfo = self.nodeToAnnotonNode(cam.graph, objectId);

      const causalEdge = <Entity>find(noctuaFormConfig.causalEdges, {
        id: predicateId
      });

      if (causalEdge) {
        if (objectInfo.hasRootType(EntityDefinition.GoMolecularFunction)) {
          const downstreamAnnoton = cam.getAnnotonByConnectionId(objectId);

          connectorAnnoton.rule.r2Edge = new Entity(causalEdge.id, causalEdge.label);;
          connectorAnnoton.downstreamAnnoton = downstreamAnnoton;
        }
      }

      if (e.predicate_id() === noctuaFormConfig.edge.hasInput.id) {
        if (objectInfo.hasRootType(EntityDefinition.GoChemicalEntity)) {
          const hasInputNodeInfo = self.nodeToAnnotonNode(cam.graph, objectId);
          const hasInputNode = EntityDefinition.generateBaseTerm([EntityDefinition.GoChemicalEntity], { id: 'has-input', isKey: true });

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

  editFact(reqs, srcTriples: Triple<AnnotonNode>[], destTriples: Triple<AnnotonNode>[]) {

    each(destTriples, (destTriple: Triple<AnnotonNode>) => {

      const srcTriple = find(srcTriples, (triple: Triple<AnnotonNode>) => {
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
        cam.id,
      );

      reqs.add_type_to_individual(
        class_expression.cls(destNode.getTerm().id),
        srcNode.uuid,
        cam.id,
      );
    }
  }

  bulkEditIndividual(reqs, camId: string, node: AnnotonNode) {
    if (node.hasValue() && node.pendingEntityChanges) {
      reqs.remove_type_from_individual(
        class_expression.cls(node.pendingEntityChanges.oldValue.id),
        node.pendingEntityChanges.uuid,
        camId,
      );

      reqs.add_type_to_individual(
        class_expression.cls(node.pendingEntityChanges.newValue.id),
        node.pendingEntityChanges.uuid,
        camId,
      );
    }
  }

  bulkEditEvidence(reqs, camId: string, evidence: Evidence) {
    if (evidence.hasValue() && evidence.pendingEvidenceChanges) {
      reqs.remove_type_from_individual(
        class_expression.cls(evidence.evidence.id),
        evidence.uuid,
        camId,
      );

      reqs.add_type_to_individual(
        class_expression.cls(evidence.pendingEvidenceChanges.id),
        evidence.pendingEvidenceChanges.uuid,
        camId,
      );

      this.editUserEvidenceAnnotations(reqs, evidence.pendingEvidenceChanges.uuid)
    }

    if (evidence.hasValue() && evidence.pendingReferenceChanges) {
      reqs.remove_annotation_from_individual('source', evidence.reference, null, evidence.pendingReferenceChanges.uuid);
      reqs.add_annotation_to_individual('source',
        evidence.pendingReferenceChanges.id,
        null,
        evidence.pendingReferenceChanges.uuid)
      this.editUserEvidenceAnnotations(reqs, evidence.pendingReferenceChanges.uuid)
    }

    if (evidence.hasValue() && evidence.pendingWithChanges) {
      reqs.remove_annotation_from_individual('with', evidence.with, null, evidence.pendingWithChanges.uuid);
      reqs.add_annotation_to_individual('with',
        evidence.pendingWithChanges.id,
        null,
        evidence.pendingWithChanges.uuid)
      this.editUserEvidenceAnnotations(reqs, evidence.pendingWithChanges.uuid)
    }
  }

  editUserEvidenceAnnotations(reqs, uuid) {
    reqs.remove_annotation_from_individual('provided-by', this.noctuaUserService.user.group.url, null, uuid);
    reqs.add_annotation_to_individual('provided-by', this.noctuaUserService.user.group.url, null, uuid);
    reqs.remove_annotation_from_individual('contributor', this.noctuaUserService.user.orcid, null, uuid);
    reqs.add_annotation_to_individual('contributor', this.noctuaUserService.user.orcid, null, uuid);
  }

  replaceIndividual(reqs, modelId: string, entity: Entity, replaceWithTerm: Entity) {
    reqs.remove_type_from_individual(
      class_expression.cls(entity.id),
      entity.uuid,
      modelId,
    );

    reqs.add_type_to_individual(
      class_expression.cls(replaceWithTerm.id),
      entity.uuid,
      modelId,
    );
  }

  deleteIndividual(reqs, node) {
    if (node.uuid) {
      reqs.remove_individual(node.uuid);
    }
  }

}