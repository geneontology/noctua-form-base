import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit, ViewChildren, QueryList, Input } from '@angular/core';
import * as _ from 'lodash';
import * as joint from 'jointjs';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { CamGraphService } from './services/cam-graph.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute, } from '@angular/router';
import { NoctuaCommonMenuService } from '@noctua.common/services/noctua-common-menu.service';
import { NoctuaDataService } from '@noctua.common/services/noctua-data.service';
import { Cam, CamService } from '@noctua.form';
import { NoctuaShapesService } from '@noctua.graph/services/shapes.service';
import { noctuaStencil } from '@noctua.graph/data/cam-stencil';

@Component({
  selector: 'noc-cam-graph',
  templateUrl: './cam-graph.component.html',
  styleUrls: ['./cam-graph.component.scss']
})
export class CamGraphComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChildren('stencils') stencilContainers: QueryList<any>;
  @ViewChild(ContextMenuComponent, { static: true }) public basicMenu: ContextMenuComponent;

  @Input('cam')
  public cam: Cam;

  camId: string;


  private _unsubscribeAll: Subject<any>;
  stencils = [];

  constructor(
    public noctuaDataService: NoctuaDataService,
    // public noctuaCamEditorService: NoctuaCamEditorService,
    private _camService: CamService,
    public noctuaCommonMenuService: NoctuaCommonMenuService,
    public noctuaCamGraphService: CamGraphService,
    private noctuaCamShapesService: NoctuaShapesService) {

    this._unsubscribeAll = new Subject();

    this.stencils = noctuaStencil.camStencil

    console.log(this.stencils)
  }

  ngAfterViewInit() {
    const self = this;

    self.noctuaCamGraphService.initializeGraph();
    this.noctuaCamGraphService.initializeStencils();
    this._camService.onCamChanged
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((cam: Cam) => {
        if (!cam) {
          return;
        }
        self.cam = cam;
        // const pattern = generate(cam.title);
        // this.cam = cam as Cam;
        // this.cam.backgroundStyle = pattern.toDataUrl(); 
        self.noctuaCamGraphService.addToCanvas(self.cam);

      });
  }

  loadCam(camId: string): void {
    this._camService.getCam(camId);
  }

  ngOnInit() {
    const self = this;
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  canMove(e: any): boolean {
    return e.indexOf('Disabled') === -1;
  }

  save() {
    this.noctuaCamGraphService.save();
  }

  zoomIn() {
    const delta = 0.1;
    this.noctuaCamGraphService.zoom(delta);
  }

  zoomOut() {
    const delta = -0.1;
    this.noctuaCamGraphService.zoom(delta);
  }

  onCtrlScroll($event) {
    const self = this;
    const delta = Math.max(-1, Math.min(1, ($event.wheelDelta || $event.detail))) / 10;
    console.log(delta)

    if ($event.ctrlKey) {
      self.noctuaCamGraphService.zoom(delta, $event);
      $event.returnValue = false;
      // for Chrome and Firefox
      if ($event.preventDefault) {
        $event.preventDefault();
      }
    }
  }

}
