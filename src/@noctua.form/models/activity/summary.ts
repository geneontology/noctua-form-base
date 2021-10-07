import { ActivityNode } from "./activity-node";
import { Entity } from "./entity";
import { Evidence } from "./evidence";

export class CamSummary<T extends Entity | Evidence | ActivityNode> {
  label: string
  shorthand: string
  count: number = 0;
  frequency = 0
  tooltip = ''
  nodes: T[] = [];

  constructor(label?: string, shorthand?: string) {
    this.label = label ? label : null
    this.shorthand = shorthand ? shorthand : null
  }

  append(node: T) {
    this.nodes.push(node)
    this.count = this.nodes.length
    if (node instanceof ActivityNode) {
      this.tooltip += `${node.term.label} (${node.term.id}) \n`
    } else if (node instanceof Evidence) {
      this.tooltip += `${node.evidence.label} (${node.evidence.id}) \n
                        ${node.referenceEntity.label} \n
                        ${node.withEntity.label} \n`
    }
  }
}



export class TermsSummary {
  bp = new CamSummary<ActivityNode>('Biological Process', 'BP');
  cc = new CamSummary<ActivityNode>('Cellular Component', 'CC');
  mf = new CamSummary<ActivityNode>('Molecular Function', 'MF');
  gp = new CamSummary<ActivityNode>('Gene Product', 'GP');
  other = new CamSummary<ActivityNode>('Other');
  evidences = new CamSummary<Evidence>('Evidence');
  evidenceEcos = new CamSummary<Entity>('Evidence Eco Codes');
  references = new CamSummary<Entity>('Reference');
  withs = new CamSummary<Entity>('With/From');



  allTerms: ActivityNode[] = []

  nodes = []

  constructor() {
    this.nodes = [
      this.mf, this.bp, this.cc,
    ]
  }

}