import { AfterViewInit, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';

import { noctuaAnimations } from './../../../../../../../@noctua/animations';
import { NoctuaFormDialogService } from './../../../services/dialog.service';

import {
  NoctuaFormConfigService,
  NoctuaActivityFormService,
  NoctuaActivityEntityService,
  CamService,
  Evidence,
  Entity,
  noctuaFormConfig,
  NoctuaUserService,
  NoctuaFormMenuService,

  ActivityType,
  ActivityTreeNode,
  ActivityNodeType,
  ActivityDisplayType,
  NoctuaGraphService
} from '@geneontology/noctua-form-base';

import {
  Cam,
  Activity,
  ActivityNode,
  ShapeDefinition
} from '@geneontology/noctua-form-base';

import { EditorCategory } from '@noctua.editor/models/editor-category';
import { cloneDeep, find } from 'lodash';
import { InlineEditorService } from '@noctua.editor/inline-editor/inline-editor.service';
import { NoctuaUtils } from '@noctua/utils/noctua-utils';
import { FlatTreeControl } from '@angular/cdk/tree';
import { NoctuaConfirmDialogService } from '@noctua/components/confirm-dialog/confirm-dialog.service';
import { takeUntil } from 'rxjs/operators';
import { NoctuaCommonMenuService } from '@noctua.common/services/noctua-common-menu.service';
import { SettingsOptions } from '@noctua.common/models/graph-settings';
import { TableOptions } from '@noctua.common/models/table-options';

@Component({
  selector: 'noc-activity-form-table',
  templateUrl: './activity-form-table.component.html',
  styleUrls: ['./activity-form-table.component.scss'],
  animations: noctuaAnimations
})
export class ActivityFormTableComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  ActivityDisplayType = ActivityDisplayType;
  EditorCategory = EditorCategory;
  ActivityType = ActivityType;
  activityTypeOptions = noctuaFormConfig.activityType.options;

  treeNodes: ActivityTreeNode[] = [];

  settings: SettingsOptions = new SettingsOptions()
  gbSettings: SettingsOptions = new SettingsOptions()

  @ViewChild('tree') tree;
  @Input('cam') cam: Cam
  @Input('activity') activity: Activity
  @Input('options') options: TableOptions = {};

  gbOptions: TableOptions = {};

  optionsDisplay: any = {}

  gpNode: ActivityNode;
  editableTerms = false;
  currentMenuEvent: any = {};
  treeControl = new FlatTreeControl<ActivityNode>(
    node => node.treeLevel, node => node.expandable);

  treeOptions = {
    allowDrag: false,
    allowDrop: false,
    // levelPadding: 15,
    getNodeClone: (node) => ({
      ...node.data,
      //id: uuid.v4(),
      name: `Copy of ${node.data.name}`
    })
  };

  private _unsubscribeAll: Subject<any>;

  constructor(
    public camService: CamService,
    private _noctuaGraphService: NoctuaGraphService,
    private noctuaCommonMenuService: NoctuaCommonMenuService,
    private confirmDialogService: NoctuaConfirmDialogService,
    public noctuaFormMenuService: NoctuaFormMenuService,
    public noctuaUserService: NoctuaUserService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaActivityEntityService: NoctuaActivityEntityService,
    public noctuaActivityFormService: NoctuaActivityFormService,
    private inlineEditorService: InlineEditorService) {

    this._unsubscribeAll = new Subject();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // do your action

  }

  ngOnInit(): void {
    this.loadTree()
    this.gbOptions = cloneDeep(this.options)
    this.gbOptions.showMenu = this.activity.activityType === ActivityType.molecule

    this.noctuaCommonMenuService.onCamSettingsChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((settings: SettingsOptions) => {
        if (!settings) {
          return;
        }
        this.settings = settings;
        this.gbSettings = cloneDeep(settings)
        this.gbSettings.showEvidence = false;
        this.gbSettings.showEvidenceSummary = false;
      });

    if (this.options?.editableTerms) {
      this.editableTerms = this.options.editableTerms
    }

    this._noctuaGraphService.onCamGraphChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((cam: Cam) => {
        if (!cam || cam.id !== this.cam.id) {
          return;
        }
        this.cam = cam;
        this.activity = cam.findActivityById(this.activity.id)
        this.loadTree()
      })
  }

  ngAfterViewInit(): void {
    this.tree.treeModel.filterNodes((node) => {
      return (node.data.id !== this.gpNode?.id);
    });
  }


  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  loadTree() {
    if (!this.activity) return;
    this.gpNode = this.activity.getGPNode();
    this.optionsDisplay = { ...this.options, hideHeader: true };
    this.treeNodes = this.activity.buildTrees();

  }

  onTreeLoad() {
    this.tree.treeModel.expandAll();
  }

  setActivityDisplayType(displayType: ActivityDisplayType) {
    this.activity.activityDisplayType = displayType;
  }

  toggleExpand(activity: Activity) {
    activity.expanded = !activity.expanded;
  }

  toggleNodeExpand(node: ActivityNode) {
    node.expanded = !node.expanded;
  }

  displayCamErrors() {
    const errors = this.cam.getViolationDisplayErrors();
    this.noctuaFormDialogService.openCamErrorsDialog(errors);
  }

  displayActivityErrors(activity: Activity) {
    const errors = activity.getViolationDisplayErrors();
    this.noctuaFormDialogService.openCamErrorsDialog(errors);
  }


  addEvidence(entity: ActivityNode) {
    const self = this;

    entity.predicate.addEvidence();
    const data = {
      cam: this.cam,
      activity: this.activity,
      entity: entity,
      category: EditorCategory.evidenceAll,
      evidenceIndex: entity.predicate.evidence.length - 1
    };

    this.camService.onCamChanged.next(this.cam);
    this.camService.activity = this.activity;
    this.noctuaActivityEntityService.initializeForm(this.activity, entity);
    this.inlineEditorService.open(this.currentMenuEvent.target, { data });

    self.noctuaActivityFormService.initializeForm();
  }

  removeEvidence(entity: ActivityNode, index: number) {
    const self = this;

    entity.predicate.removeEvidence(index);
    self.noctuaActivityFormService.initializeForm();
  }

  toggleIsComplement() {

  }

  openSearchDatabaseDialog(entity: ActivityNode) {
    const self = this;
    const gpNode = this.noctuaActivityFormService.activity.getGPNode();

    if (gpNode) {
      const data = {
        readonly: false,
        gpNode: gpNode.term,
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
          self.noctuaActivityFormService.initializeForm();
        }
      };

      self.noctuaFormDialogService.openSearchDatabaseDialog(data, success);
    } else {
      // const error = new ActivityError(ErrorLevel.error, ErrorType.general,  "Please enter a gene product", meta)
      //errors.push(error);
      // self.dialogService.openActivityErrorsDialog(ev, entity, errors)
    }
  }


  insertEntity(entity: ActivityNode, nodeDescription: ShapeDefinition.ShapeDescription) {
    const insertedNode = this.noctuaFormConfigService.insertActivityNode(this.activity, entity, nodeDescription);
    //  this.noctuaActivityFormService.initializeForm();

    const data = {
      cam: this.cam,
      activity: this.activity,
      entity: insertedNode,
      category: EditorCategory.all,
      evidenceIndex: 0,
      insertEntity: true
    };

    this.camService.onCamChanged.next(this.cam);
    this.camService.activity = this.activity;
    this.noctuaActivityEntityService.initializeForm(this.activity, insertedNode);
    this.inlineEditorService.open(this.currentMenuEvent.target, { data });
  }

  addRootTerm(entity: ActivityNode) {
    const self = this;

    const term = find(noctuaFormConfig.rootNode, (rootNode) => {
      return rootNode.aspect === entity.aspect;
    });

    if (term) {
      entity.term = new Entity(term.id, term.label);
      self.noctuaActivityFormService.initializeForm();

      const evidence = new Evidence();
      evidence.setEvidence(new Entity(
        noctuaFormConfig.evidenceAutoPopulate.nd.evidence.id,
        noctuaFormConfig.evidenceAutoPopulate.nd.evidence.label));
      evidence.reference = noctuaFormConfig.evidenceAutoPopulate.nd.reference;
      entity.predicate.setEvidence([evidence]);
      self.noctuaActivityFormService.initializeForm();
    }
  }

  clearValues(entity: ActivityNode) {
    const self = this;

    entity.clearValues();
    self.noctuaActivityFormService.initializeForm();
  }

  openSelectEvidenceDialog(entity: ActivityNode) {
    const self = this;
    const evidences: Evidence[] = this.camService.getUniqueEvidence(self.noctuaActivityFormService.activity);
    const success = (selected) => {
      if (selected.evidences && selected.evidences.length > 0) {
        entity.predicate.setEvidence(selected.evidences);
        self.noctuaActivityFormService.initializeForm();
      }
    };

    self.noctuaFormDialogService.openSelectEvidenceDialog(evidences, success);
  }

  updateCurrentMenuEvent(event) {
    this.currentMenuEvent = event;
  }

  deleteActivity(activity: Activity) {
    const self = this;

    const success = () => {
      this.camService.deleteActivity(activity).then(() => {
        self.noctuaFormDialogService.openInfoToast('Activity successfully deleted.', 'OK');
      });
    };

    if (!self.noctuaUserService.user) {
      this.confirmDialogService.openConfirmDialog('Not Logged In',
        'Please log in to continue.',
        null);
    } else {
      this.confirmDialogService.openConfirmDialog('Confirm Delete?',
        'You are about to delete an activity.',
        success);
    }
  }



  cleanId(dirtyId: string) {
    return NoctuaUtils.cleanID(dirtyId);
  }
}

