
declare const require: any;
const getUuid = require('uuid/v1');

import { noctuaFormConfig } from './../../noctua-form-config';
import {
    AnnotonNode,
    EntityLookup,
    AnnotonNodeDisplay,
    Predicate
} from './../../models/annoton';

const baseRequestParams = {
    defType: 'edismax',
    indent: 'on',
    qt: 'standard',
    wt: 'json',
    rows: '10',
    start: '0',
    fl: '*,score',
    'facet': true,
    'facet.mincount': 1,
    'facet.sort': 'count',
    'facet.limit': '25',
    'json.nl': 'arrarr',
    packet: '1',
    callback_type: 'search',
    'facet.field': [
        'source',
        'subset',
        'isa_closure_label',
        'is_obsolete'
    ],
    qf: [
        'annotation_class^3',
        'annotation_class_label_searchable^5.5',
        'description_searchable^1',
        'comment_searchable^0.5',
        'synonym_searchable^1',
        'alternate_id^1',
        'isa_closure^1',
        'isa_closure_label_searchable^1'
    ],
    _: Date.now()
};

export enum AnnotonNodeType {
    GoProteinContainingComplex = 'GoProteinContainingComplex',
    GoCellularComponent = 'GoCellularComponent',
    GoBiologicalProcess = 'GoBiologicalProcess',
    GoMolecularFunction = 'GoMolecularFunction',
    GoMolecularEntity = 'GoMolecularEntity',
    GoChemicalEntity = 'GoChemicalEntity',
    GoEvidence = 'GoEvidence',
    GoCellTypeEntity = 'GoCellTypeEntity',
    GoAnatomicalEntity = 'GoAnatomicalEntity',
    GoOrganism = 'GoOrganism',
    GoBiologicalPhase = 'GoBiologicalPhase',
}

export class GoProteinContainingComplex {
    public static readonly id = AnnotonNodeType.GoProteinContainingComplex;
    public static readonly type = 'GO:0032991';
}

export class GoCellularComponent {
    public static readonly id = AnnotonNodeType.GoCellularComponent;
    public static readonly type = 'GO:0005575';
}

export class GoBiologicalProcess {
    public static readonly id = AnnotonNodeType.GoBiologicalProcess;
    public static readonly type = 'GO:0008150';
}

export class GoMolecularFunction {
    public static readonly id = AnnotonNodeType.GoMolecularFunction;
    public static readonly type = 'GO:0003674';
}

export class GoMolecularEntity {
    public static readonly id = AnnotonNodeType.GoMolecularEntity;
    public static readonly type = 'CHEBI:23367';
}

export class GoChemicalEntity {
    public static readonly id = AnnotonNodeType.GoChemicalEntity;
    public static readonly type = 'CHEBI:24431';
}

export class GoEvidence {
    public static readonly id = AnnotonNodeType.GoEvidence;
    public static readonly type = 'ECO:0000352';
}

export class GoCellTypeEntity {
    public static readonly id = AnnotonNodeType.GoCellTypeEntity;
    public static readonly type = 'CL:0000003';
}

export class GoAnatomicalEntity {
    public static readonly id = AnnotonNodeType.GoAnatomicalEntity;
    public static readonly type = 'UBERON:0000061';
}

export class GoOrganism {
    public static readonly id = AnnotonNodeType.GoOrganism;
    public static readonly type = 'NCBITaxon_1';
}

export class GoBiologicalPhase {
    public static readonly id = AnnotonNodeType.GoBiologicalPhase;
    public static readonly type = 'GO:0044848';
}


export const generateBaseTerm = (goType?: string, override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = new AnnotonNode();
    const predicate = new Predicate(null);

    predicate.setEvidenceMeta('eco', Object.assign({}, JSON.parse(JSON.stringify(baseRequestParams)), {
        fq: [
            'document_category:"ontology_class"',
            `isa_closure:"${GoEvidence.type}"`
        ],
    }));

    annotonNode.predicate = predicate;

    if (goType) {
        annotonNode.termLookup = new EntityLookup(null,
            Object.assign({}, JSON.parse(JSON.stringify(baseRequestParams)), {
                fq: [
                    'document_category:"ontology_class"',
                    `isa_closure:"${goType}"`
                ],
            })
        );
    }

    annotonNode.overrideValues(override);

    return annotonNode;
};

export const generateGoTerm = (): AnnotonNode => {
    const annotonNode = generateBaseTerm();

    annotonNode.id = 'goterm';
    annotonNode.ontologyClass = ['go'];
    annotonNode.termLookup = new EntityLookup(null,
        Object.assign({}, JSON.parse(JSON.stringify(baseRequestParams)), {
            fq: [
                'document_category:"ontology_class"',
                'isa_closure:"GO:0003674" OR isa_closure:"GO:0008150" OR isa_closure:"GO:0005575"',
            ],
        }),
    );

    return annotonNode;
};

export const generateProteinContainingComplex = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoProteinContainingComplex.type);

    annotonNode.id = GoProteinContainingComplex.id;
    annotonNode.name = GoProteinContainingComplex.id;
    annotonNode.type = GoProteinContainingComplex.type;
    annotonNode.label = 'Macromolecular Complex';
    annotonNode.relationship = noctuaFormConfig.edge.hasPart;
    annotonNode.displaySection = noctuaFormConfig.displaySection.gp;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.mc;

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const generateMolecularEntity = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoMolecularEntity.type);

    annotonNode.id = GoMolecularEntity.id;
    annotonNode.name = GoMolecularEntity.id;
    annotonNode.type = GoMolecularEntity.type;
    annotonNode.label = 'Gene Product';
    annotonNode.relationship = noctuaFormConfig.edge.enabledBy;
    annotonNode.displaySection = noctuaFormConfig.displaySection.gp;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.gp;

    annotonNode.ontologyClass = [];

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const generateMolecularFunction = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoMolecularFunction.type);

    annotonNode.id = GoMolecularFunction.id;
    annotonNode.type = GoMolecularFunction.type;

    annotonNode.label = 'Molecular Function';
    annotonNode.aspect = 'F';
    annotonNode.relationship = noctuaFormConfig.edge.enabledBy;
    annotonNode.displaySection = noctuaFormConfig.displaySection.fd;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.mf;

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const generateBiologicalProcess = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoBiologicalProcess.type);

    annotonNode.id = GoBiologicalProcess.id;
    annotonNode.type = GoBiologicalProcess.type;

    annotonNode.label = 'MF part of Biological Process';
    annotonNode.aspect = 'P';
    annotonNode.relationship = noctuaFormConfig.edge.partOf;
    annotonNode.displaySection = noctuaFormConfig.displaySection.fd;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.bp;

    annotonNode.treeLevel = 2;

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const generateCellularComponent = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoCellularComponent.type);

    annotonNode.id = GoCellularComponent.id;
    annotonNode.type = GoCellularComponent.type;

    annotonNode.label = 'MF occurs in Cellular Component';
    annotonNode.aspect = 'C';
    annotonNode.relationship = noctuaFormConfig.edge.occursIn;
    annotonNode.displaySection = noctuaFormConfig.displaySection.fd;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.cc;
    annotonNode.treeLevel = 2;

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const generateChemicalEntity = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoChemicalEntity.type);
    annotonNode.id = GoChemicalEntity.id;
    annotonNode.type = GoChemicalEntity.type;

    annotonNode.label = 'Has Input (Gene Product/Chemical)';
    annotonNode.relationship = noctuaFormConfig.edge.hasInput;
    annotonNode.displaySection = noctuaFormConfig.displaySection.fd;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.mf;
    annotonNode.treeLevel = 3;
    annotonNode.isExtension = true;

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const generateBiologicalPhase = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoBiologicalPhase.type);

    annotonNode.id = GoBiologicalPhase.id;
    annotonNode.type = GoBiologicalPhase.type;

    annotonNode.label = 'Happens During (Temporal Phase)';
    annotonNode.relationship = noctuaFormConfig.edge.happensDuring;
    annotonNode.displaySection = noctuaFormConfig.displaySection.fd;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.mf;
    annotonNode.treeLevel = 2;
    annotonNode.isExtension = true;

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const generateCellTypeEntity = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoCellTypeEntity.type);
    annotonNode.id = GoCellTypeEntity.id;
    annotonNode.type = GoCellTypeEntity.type;
    annotonNode.label = 'Part Of (Cell Type)';
    annotonNode.relationship = noctuaFormConfig.edge.partOf;
    annotonNode.displaySection = noctuaFormConfig.displaySection.fd;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.cc;
    annotonNode.treeLevel = 3;
    annotonNode.isExtension = true;

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const generateAnatomicalEntity = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoAnatomicalEntity.type);

    annotonNode.id = GoAnatomicalEntity.id;
    annotonNode.type = GoAnatomicalEntity.type;

    annotonNode.label = 'Part Of (Anatomy)';
    annotonNode.relationship = noctuaFormConfig.edge.partOf;
    annotonNode.displaySection = noctuaFormConfig.displaySection.fd;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.cc;
    annotonNode.treeLevel = 4;
    annotonNode.isExtension = true;

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const generateOrganism = (override: Partial<AnnotonNodeDisplay> = {}): AnnotonNode => {
    const annotonNode = generateBaseTerm(GoOrganism.type);

    annotonNode.id = GoOrganism.id;
    annotonNode.type = GoOrganism.type;

    annotonNode.label = 'Part Of (Organism)';
    annotonNode.relationship = noctuaFormConfig.edge.partOf;
    annotonNode.displaySection = noctuaFormConfig.displaySection.fd;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.cc;
    annotonNode.treeLevel = 5;
    annotonNode.isExtension = true;

    annotonNode.overrideValues(override);
    return annotonNode;
};

export const insertNode = (type: AnnotonNodeType): AnnotonNode => {
    const annotonNode = generateBaseTerm(type);
    annotonNode.id = type + '-' + getUuid();
    annotonNode.type = GoChemicalEntity.type;

    annotonNode.label = 'Has Input (Gene Product/Chemical)';
    annotonNode.relationship = noctuaFormConfig.edge.hasInput;
    annotonNode.displaySection = noctuaFormConfig.displaySection.fd;
    annotonNode.displayGroup = noctuaFormConfig.displayGroup.mf;
    annotonNode.treeLevel = 3;
    annotonNode.isExtension = true;

    return annotonNode;
};


