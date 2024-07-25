import { ActivityNode } from './../activity/activity-node';
import { Entity, RootTypes } from './../activity/entity';
import { noctuaFormConfig } from './../../noctua-form-config';
import { Activity } from './../activity/activity';
import { Triple, TriplePair } from './../activity/triple';
import { Predicate } from './../activity/predicate';
import * as ShapeUtils from './../../data/config/shape-utils';
import * as EntityDefinition from './../../data/config/entity-definition';
import { Evidence } from './../activity/evidence';
import { StandardAnnotationForm } from './form';


export interface AnnotationEdgeConfig {
  gpToTermPredicate?: string;
  gpToTermReverse?: boolean;
  mfNodeRequired: boolean;
  mfToTermPredicate?: string;
  root?: RootTypes;
  mfToTermReverse?: boolean;
}

export class AnnotationExtension {
  extensionTerm: ActivityNode;
  extensionEdge: Entity;
  extensionEdges: Entity[] = [];

  constructor(extension?: ActivityNode) {
    if (extension) {
      this.extensionTerm = extension;
    } else {
      this.extensionTerm = ShapeUtils.generateBaseTerm([]);
      this.extensionTerm.label = 'Extension Term';
    }
  }
}


export class AnnotationActivity {
  gp: ActivityNode;
  goterm: ActivityNode;
  gpToTermEdge: Entity;
  gotermAspect: string;

  evidenceCode = ShapeUtils.generateBaseTerm([]);
  reference = ShapeUtils.generateBaseTerm([]);
  with = ShapeUtils.generateBaseTerm([]);
  comments: string[] = [];

  extensions: AnnotationExtension[] = [];
  gpToTermEdges: Entity[] = [];
  activity: Activity;


  constructor(activity?: Activity) {

    if (activity) {
      this.activityToAnnotation(activity);
    }

    this.evidenceCode.category = [EntityDefinition.GoEvidence];
    this.evidenceCode.label = 'Evidence'
    this.reference.label = 'Reference'
    this.with.label = 'With/From'
  }


  activityToAnnotation(activity: Activity) {
    this.gp = activity.getNode('gp');
    this.goterm = activity.getNode('goterm');

    const extensionTriples: Triple<ActivityNode>[] = activity.getEdges(this.goterm.id);
    this.extensions = extensionTriples.map(triple => {
      const extension = new AnnotationExtension();
      extension.extensionTerm = triple.object;
      extension.extensionEdge = triple.predicate.edge;
      return extension;
    });

  }

  findEdgeByCriteria(matchCriteria: AnnotationEdgeConfig): string {

    const config = noctuaFormConfig.simpleAnnotationEdgeConfig;

    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        let allCriteriaMatch = true;
        const entry = config[key];

        for (const criterion in matchCriteria) {
          if (entry[criterion] !== matchCriteria[criterion]) {
            allCriteriaMatch = false;
            break;
          }
        }

        if (allCriteriaMatch) {
          return key;
        }
      }
    }
    return null;
  }

  private _populateAnnotationActivity(annotationForm: StandardAnnotationForm) {

    this.gp.term.id = annotationForm.gp.id;
    this.goterm.term.id = annotationForm.goterm.id;
    this.gpToTermEdge = annotationForm.gpToTermEdge;

    this.goterm.isComplement = annotationForm.isComplement;

    this.evidenceCode.term.id = annotationForm.evidenceCode.id;
    this.reference.term.id = annotationForm.reference;
    this.with.term.id = annotationForm.withFrom;

    this.comments = Array.from(new Set(annotationForm.annotationComments.map(comment => comment.comment)));

    annotationForm.annotationExtensions.forEach((ext, index) => {
      this.extensions[index].extensionEdge = ext.extensionEdge;
      this.extensions[index].extensionTerm.term.id = ext.extensionTerm.id;
    });
  }

  getEvidenceNodes(): Evidence[] {
    const evidenceNodes: Evidence[] = [];
    this.activity.edges.forEach(triple => {
      triple.predicate.evidence.forEach(evidence => {
        evidenceNodes.push(evidence);
      });
    });

    return evidenceNodes;
  }

  getPredicates(): Predicate[] {
    return this.activity.edges.map(triple => {
      return triple.predicate;
    });
  }

  getExtensionTriple(predicateId: string, extension: ActivityNode): Triple<ActivityNode> {
    const triple = this.activity.edges.find(edge => edge.object.uuid === extension.uuid && edge.predicate.edge.id === predicateId);

    return triple

  }

  getTriplePair(predicateId: string, goterm: ActivityNode, newPredicateId: string): TriplePair<ActivityNode> {
    const oldTriple = this.activity.edges.find(edge => edge.object.uuid === goterm.uuid && edge.predicate.edge.id === predicateId);

    let newTriple: Triple<ActivityNode> | undefined;
    if (oldTriple) {
      newTriple = oldTriple

      const edgeType = newPredicateId
      const config = noctuaFormConfig.simpleAnnotationEdgeConfig[edgeType]

      if (!config) {
        newTriple = undefined;
      }
      newTriple.predicate.edge = new Entity(config.mfToTermPredicate, '');
    } else {
      newTriple = undefined;
    }

    return { a: oldTriple, b: newTriple };
  }

  genExtensionTriple(relationId: string, extensionId: string) {
    const edge = new Entity(relationId, '');
    const extension = new ActivityNode();
    const evidence = this._createEvidence();
    const predicate = new Predicate(edge, [evidence]);

    extension.term = new Entity(extensionId, '');
    predicate.comments = this.comments;

    return new Triple(this.goterm, extension, predicate);
  }

  createSave(annotationForm: StandardAnnotationForm) {

    this._populateAnnotationActivity(annotationForm);
    const saveData = {
      title: 'enabled by ' + annotationForm.gp?.label,
      triples: [],
      nodes: [this.gp, this.goterm],
      graph: null
    };

    const edgeType = this.gpToTermEdge.id
    const config = noctuaFormConfig.simpleAnnotationEdgeConfig[edgeType]
    const evidence = this._createEvidence();

    if (!config) {
      console.warn('No configuration defined for edge:', edgeType);
      return;
    }

    if (config.mfNodeRequired) {
      const mfNode = ShapeUtils.generateBaseTerm([]);

      const rootMF = noctuaFormConfig.rootNode.mf;
      mfNode.term = new Entity(rootMF.id, rootMF.label);

      const triple = this._createTriple(mfNode, this.gp, config.gpToTermPredicate, evidence, config.gpToTermReverse)
      saveData.triples.push(triple);

      if (config.mfToTermPredicate) {
        const mfTriple = this._createTriple(mfNode, this.goterm, config.mfToTermPredicate, evidence)
        saveData.triples.push(mfTriple);
      }

    } else {
      const triple = this._createTriple(this.gp, this.goterm, config.gpToTermPredicate, evidence, config.gpToTermReverse)
      saveData.triples.push(triple);
    }

    this.extensions.forEach(ext => {

      if (ext.extensionTerm?.hasValue()) {
        const extensionTriple = this._createTriple(this.goterm, ext.extensionTerm, ext.extensionEdge.id, evidence);

        saveData.nodes.push(ext.extensionTerm);
        saveData.triples.push(extensionTriple);
      }
    });

    return saveData;
  }

  private _createEvidence() {
    const evidence = new Evidence();

    evidence.evidence = new Entity(this.evidenceCode?.term.id, "");
    evidence.reference = this.reference?.term.id;
    evidence.with = this.with?.term.id;

    return evidence;
  }


  private _createTriple(subjectNode: ActivityNode, objectNode: ActivityNode, predicateId: string, evidence: Evidence, reverse = false) {
    const edgeConfig = noctuaFormConfig.allEdges.find(edge => edge.id === predicateId);

    if (!edgeConfig) {
      throw new Error(`Edge configuration not found for predicate ID: ${predicateId}`);
    }

    const predicateEntity = Entity.createEntity(edgeConfig);
    const predicate = new Predicate(predicateEntity, [evidence]);
    predicate.comments = this.comments;

    return reverse
      ? new Triple(objectNode, subjectNode, predicate)
      : new Triple(subjectNode, objectNode, predicate);
  }


  updateAspect() {
    if (!this.goterm.hasValue()) return

    let aspect: string | null = null;
    const rootNode = noctuaFormConfig.rootNode
    for (const key in noctuaFormConfig.rootNode) {
      if (this.goterm.rootTypes && this.goterm.rootTypes.some(item => item.id === rootNode[key].id)) {
        this.gotermAspect = rootNode[key].aspect;
        break;
      }
    }

    return aspect;
  }

}
