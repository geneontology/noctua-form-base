

import { Component, Inject, Input, OnInit, ElementRef, OnDestroy, ViewEncapsulation, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator, MatSort, MatDrawer } from '@angular/material';
import { DataSource } from '@angular/cdk/collections';
import { merge, Observable, Subscription, BehaviorSubject, fromEvent, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';


import * as _ from 'lodash';
declare const require: any;
const each = require('lodash/forEach');

import { noctuaAnimations } from './../../../../../../../@noctua/animations';


import { NoctuaFormService } from '../../../services/noctua-form.service';


import { NoctuaSearchService } from './../../../../../../../@noctua.search/services/noctua-search.service';
import { CamDiagramService } from './../../cam-diagram/services/cam-diagram.service';
import { CamTableService } from './../../cam-table/services/cam-table.service';

import { SparqlService } from './../../../../../../../@noctua.sparql/services/sparql/sparql.service';

import {
  Cam,
  Annoton,
  ConnectorAnnoton,
  ConnectorState,
  ConnectorType,
  AnnotonNode,
  Evidence,
  NoctuaAnnotonConnectorService,

  NoctuaGraphService,
  NoctuaAnnotonFormService,
  NoctuaFormConfigService,
  NoctuaLookupService,
  CamService
} from 'noctua-form-base';
import { NoctuaFormDialogService } from '../../../services/dialog.service';

@Component({
  selector: 'noc-annoton-connector',
  templateUrl: './annoton-connector-form.component.html',
  styleUrls: ['./annoton-connector-form.component.scss']
})
export class AnnotonConnectorFormComponent implements OnInit, OnDestroy {

  @Input('panelDrawer')
  panelDrawer: MatDrawer;

  connectorType = ConnectorType;
  panel = {
    selectConnector: {
      id: 1
    }, annotonConnectorForm: {
      id: 2
    },
  };
  selectedPanel: any;
  annoton: Annoton;
  connectorAnnoton: ConnectorAnnoton;
  mfNode: AnnotonNode;

  cam: Cam;
  connectorFormGroup: FormGroup;
  connectorFormSub: Subscription;

  searchCriteria: any = {};
  evidenceFormArray: FormArray;
  // annoton: Annoton = new Annoton();

  selectedCausalEffect;

  private unsubscribeAll: Subject<any>;


  constructor(private route: ActivatedRoute,
    private camService: CamService,
    private formBuilder: FormBuilder,
    public noctuaAnnotonConnectorService: NoctuaAnnotonConnectorService,
    private noctuaSearchService: NoctuaSearchService,
    private camDiagramService: CamDiagramService,
    public camTableService: CamTableService,
    private noctuaGraphService: NoctuaGraphService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaAnnotonFormService: NoctuaAnnotonFormService,
    private noctuaLookupService: NoctuaLookupService,
    public noctuaFormService: NoctuaFormService,
    private sparqlService: SparqlService
  ) {
    this.unsubscribeAll = new Subject();
  }

  ngOnInit(): void {
    this.connectorFormSub = this.noctuaAnnotonConnectorService.connectorFormGroup$
      .subscribe(connectorFormGroup => {
        if (!connectorFormGroup) return;
        this.connectorFormGroup = connectorFormGroup;
        this.connectorAnnoton = this.noctuaAnnotonConnectorService.connectorAnnoton;

        this.selectedCausalEffect = this.connectorFormGroup.get('causalEffect').value

        console.log(this.selectedCausalEffect)
      });

    this.camService.onCamChanged.subscribe((cam) => {
      if (!cam) return;

      this.cam = cam
    });

    this.noctuaAnnotonConnectorService.onAnnotonChanged.subscribe((annoton) => {
      this.annoton = annoton;
      this.selectPanel(this.panel.selectConnector);
    });

    this.selectPanel(this.panel.selectConnector);
  }

  selectPanel(panel) {
    this.selectedPanel = panel;
  }

  openAnnotonConnector(connector: Annoton) {
    this.noctuaAnnotonConnectorService.initializeForm(this.noctuaAnnotonConnectorService.annoton.connectionId, connector.connectionId);
    this.selectPanel(this.panel.annotonConnectorForm);
  }


  save() {
    const self = this;
    this.noctuaAnnotonConnectorService.save();
    /*  this.noctuaAnnotonConnectorService.save().then(() => {
       self.selectPanel(self.panel.selectConnector);
       self.noctuaAnnotonConnectorService.getConnections();
       self.noctuaFormDialogService.openSuccessfulSaveToast('Causal relation successfully created.', 'OK');
     }); */
  }

  addEvidence() {
    const self = this;

    let evidenceFormGroup: FormArray = <FormArray>self.connectorFormGroup.get('evidenceFormArray');

    evidenceFormGroup.push(this.formBuilder.group({
      evidence: new FormControl(),
      reference: new FormControl(),
      with: new FormControl(),
    }));
  }

  removeEvidence(index) {
    const self = this;

    let evidenceFormGroup: FormArray = <FormArray>self.connectorFormGroup.get('evidenceFormArray');

    evidenceFormGroup.removeAt(index);
  }

  clear() {
    this.noctuaAnnotonFormService.clearForm();
  }

  close() {
    this.panelDrawer.close()
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
