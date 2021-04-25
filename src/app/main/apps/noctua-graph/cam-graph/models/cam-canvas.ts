import {
    Activity,
    ActivityType,
    Cam,
    Entity,
    noctuaFormConfig,
    Predicate,
    Triple
} from 'noctua-form-base';
import { NodeCellType } from '@noctua.graph/models/shapes';
import { NodeCell, NodeLink, StencilNode } from '@noctua.graph/services/shapes.service';
import * as joint from 'jointjs';
import { each, cloneDeep } from 'lodash';
import { StencilItemNode } from '@noctua.graph/data/cam-stencil';

export class CamCanvas {

    canvasPaper: joint.dia.Paper;
    canvasGraph: joint.dia.Graph;
    selectedStencilElement;
    elementOnClick: (element: joint.shapes.noctua.NodeCell) => void;
    onLinkCreated: (
        sourceId: string,
        targetId: string,
        link: joint.shapes.noctua.NodeLink) => void;
    cam: Cam;

    constructor() {
        this._initializeCanvas()
    }

    private _initializeCanvas() {
        const self = this;
        self.canvasGraph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
        self.canvasPaper = new joint.dia.Paper({
            cellViewNamespace: joint.shapes,
            el: document.getElementById('noc-paper'),
            height: '100%',
            width: '100%',
            model: this.canvasGraph,
            restrictTranslate: true,
            multiLinks: false,
            markAvailable: true,
            // defaultConnectionPoint: { name: 'boundary', args: { extrapolate: true } },
            // defaultConnector: { name: 'rounded' },
            // defaultRouter: { name: 'orthogonal' },
            /*     defaultLink: new joint.dia.Link({
                  attrs: { '.marker-target': { d: 'M 10 0 L 0 5 L 10 10 z' } }
                }), */
            validateConnection: function (cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
                // Prevent linking from input ports.
                // if (magnetS && magnetS.getAttribute('port-group') === 'in') return false;
                // Prevent linking from output ports to input ports within one element.
                if (cellViewS === cellViewT) return false;
                // Prevent linking to input ports.
                /// return magnetT && magnetT.getAttribute('port-group') === 'in';

                return true; // (magnetS !== magnetT);
            },
            validateMagnet: function (cellView, magnet) {
                // Note that this is the default behaviour. Just showing it here for reference.
                // Disable linking interaction for magnets marked as passive (see below `.inPorts circle`).
                // return magnet.getAttribute('magnet') !== 'passive';
                return true;
            },

            // connectionStrategy: joint.connectionStrategies.pinAbsolute,
            // defaultConnectionPoint: { name: 'boundary', args: { selector: 'border' } },
            async: true,
            interactive: { labelMove: false },
            linkPinning: false,
            // frozen: true,
            gridSize: 10,
            drawGrid: {
                name: 'doubleMesh',
                args: [
                    { color: '#DDDDDD', thickness: 1 }, // settings for the primary mesh
                    { color: '#DDDDDD', scaleFactor: 5, thickness: 4 } //settings for the secondary mesh
                ]
            },
            sorting: joint.dia.Paper.sorting.APPROX,
            // markAvailable: true,
            defaultLink: function () {
                return NodeLink.create();
            },
            perpendicularLinks: false,
            // defaultRouter: {
            //   name: 'manhattan',
            //   args: {
            //  perpendicular: false,
            //    step: 20
            //    }
            //   },

        });

        this.canvasPaper.on({
            'element:pointerdblclick': function (cellView) {
                const element = cellView.model;
                self.elementOnClick(element);
            },
            'element:mouseover': function (cellView) {
                const element = cellView.model;
                if (element.get('type') === NodeCellType.cell) {
                    (element as NodeCell).hover(true);
                }
            },

            'element:mouseleave': function (cellView) {
                cellView.removeTools();
                const element = cellView.model;
                if (element.get('type') === NodeCellType.cell) {
                    (element as NodeCell).hover(false);
                }
            },
            /* 'element:pointerup': function (elementView, evt, x, y) {
                const coordinates = new joint.g.Point(x, y);
                const elementAbove = elementView.model;
                const elementBelow = this.model.findModelsFromPoint(coordinates).find(function (el) {
                    return (el.id !== elementAbove.id);
                });

                // If the two elements are connected already, don't
                if (elementBelow && self.canvasGraph.getNeighbors(elementBelow).indexOf(elementAbove) === -1) {

                    // Move the element to the position before dragging.
                    elementAbove.position(evt.data.x, evt.data.y);
                    self.createLinkFromElements(elementAbove, elementBelow)

                }
            },
            'element:gate:click': function (elementView) {
                const element = elementView.model;
                const gateType = element.gate();
                const gateTypes = Object.keys(element.gateTypes);
                const index = gateTypes.indexOf(gateType);
                const newIndex = (index + 1) % gateTypes.length;
                element.gate(gateTypes[newIndex]);
            } */
        });


        this.canvasPaper.on('link:pointerclick', function (linkView) {
            const link = linkView.model;

            self.elementOnClick(link);
            link.attr('line/stroke', 'orange');
            link.label(0, {
                attrs: {
                    body: {
                        stroke: 'orange'
                    }
                }
            });
        });

        this.canvasPaper.on('element:expand:pointerdown', function (elementView: joint.dia.ElementView, evt) {
            evt.stopPropagation(); // stop any further actions with the element view (e.g. dragging)

            const model = elementView.model;
            const activity = model.prop('activity') as Activity;
            self.toggleActivityVisibility(model, activity);
        });

        this.canvasGraph.on('change:source change:target', function (link) {
            const sourcePort = link.get('source').port;
            const sourceId = link.get('source').id;
            const targetPort = link.get('target').port;
            const targetId = link.get('target').id;

            if (targetId && sourceId) {
                // const source = self.canvasGraph.getCell(sourceId) as NodeCell;
                // const target = self.canvasGraph.getCell(targetId) as NodeCell;

                //  console.log(targetId)
                //  console.log(sourceId)

                self.onLinkCreated(sourceId, targetId, link)
            }
        });
    }

    addLink(link: NodeLink, predicate: Predicate) {
        const self = this;

        link.set({
            activity: predicate,
            id: predicate.uuid
        });

        link.setText(predicate.edge.label);


        // link.findView(this).addTools(tools);

    }

    createLinkFromElements(source: joint.shapes.noctua.NodeCell, target: joint.shapes.noctua.NodeCell) {
        const self = this;

        const subject = source.get('activity') as Activity;
        const object = target.get('activity') as Activity;

        self.createLink(subject, new Predicate(Entity.createEntity(noctuaFormConfig.edge.causallyUpstreamOf)), object)
    }

    createLink(subject: Activity, predicate: Predicate, object: Activity) {
        const self = this;
        const triple = new Triple(subject, object, predicate);

        ///self.cam.addNode(predicate);
        //self.cam.addTriple(triple);
        self.createLinkFromTriple(triple, true);
    }

    createLinkFromTriple(triple: Triple<Activity>, autoLayout?: boolean) {
        const self = this;

        const link = NodeLink.create();
        link.setText(triple.predicate.edge.label);
        link.set({
            activity: triple.predicate,
            id: triple.predicate.edge.id,
            source: {
                id: triple.subject.id,
                port: 'right'
            },
            target: {
                id: triple.object.id,
                port: 'left'
            }
        });

        link.addTo(self.canvasGraph);
        if (autoLayout) {
            self._layoutGraph(self.canvasGraph);
            // self.addCanvasGraph(self.activity);
        }
    }

    paperScale(delta: number, e) {
        const el = this.canvasPaper.$el;
        const newScale = this.canvasPaper.scale().sx + delta;

        if (newScale > 0.1 && delta < 10) {
            const offsetX = (e.offsetX || e.clientX - el.offset().left);
            const offsetY = (e.offsetY || e.clientY - el.offset().top);
            const localPoint = this._offsetToLocalPoint(offsetX, offsetY);

            this.canvasPaper.translate(0, 0);
            this.canvasPaper.scale(newScale, newScale, localPoint.x, localPoint.y);
        }
    };

    zoom(delta: number, e?) {
        if (e) {
            this.paperScale(delta, e);
        } else {
            this.canvasPaper.translate(0, 0);
            this.canvasPaper.scale(delta, delta)
        }
    }

    resetZoom() {
        this.zoom(1);
    };

    toggleActivityVisibility(cell: joint.dia.Element, activity: Activity) {
        const self = this;

        console.log(cell.position())

        //self.activity.subgraphVisibility(activity, !activity.expanded);
        const elements = self.canvasGraph.getSuccessors(cell).concat(cell);
        // find all the links between successors and the element
        const subgraph = self.canvasGraph.getSubgraph(elements);

        if (activity.expanded) {
            subgraph.forEach((element) => {
                element.attr('./visibility', 'hidden');
            });
        } else {
            subgraph.forEach((element) => {
                element.attr('./visibility', 'visible');
            });
        }

        cell.attr('./visibility', 'visible');
        activity.expanded = !activity.expanded;

        self._layoutGraph(self.canvasGraph);

        self.canvasPaper.translate(0, 0);

        //  self.canvasPaper.
    }

    createNode(activity: Activity): NodeCell {
        const el = new NodeCell()
        //.addActivityPorts()
        // .addColor(activity.backgroundColor)
        //.setSuccessorCount(activity.successorCount)

        el.attr({ nodeType: { text: activity.id ? activity.activityType : 'Activity Unity' } });
        el.attr({ noctuaTitle: { text: activity.id ? activity.title : 'New Activity' } });
        el.attr({
            expand: {
                event: 'element:expand:pointerdown',
                stroke: 'black',
                strokeWidth: 2
            },
        })
        el.set({
            activity: activity,
            id: activity.id,
            position: activity.position,
            size: activity.size,
        });

        return el
    }

    addCanvasGraph(cam: Cam) {
        const self = this;
        const nodes = [];

        self.cam = cam;
        self.canvasGraph.resetCells(nodes);

        each(cam.activities, (activity: Activity) => {
            if (activity.visible) {
                const el = self.createNode(activity);
                nodes.push(el);
            }
        });

        each(cam.causalRelations, (triple: Triple<Activity>) => {
            if (triple.predicate.visible) {
                const link = NodeLink.create();
                // link.set('connector', { name: 'jumpover', args: { type: 'gap' } })
                link.setText(triple.predicate.edge.label);
                link.set({
                    activity: triple.predicate,
                    id: triple.predicate.edge.id,
                    source: {
                        id: triple.subject.id,
                        port: 'right'
                    },
                    target: {
                        id: triple.object.id,
                        port: 'left'
                    }
                });

                link.addColor()

                nodes.push(link);
            }
        });

        self.canvasPaper.scaleContentToFit({ minScaleX: 0.3, minScaleY: 0.3, maxScaleX: 1, maxScaleY: 1 });
        self.canvasPaper.setDimensions('10000px', '10000px')
        self.canvasGraph.resetCells(nodes);
        self._layoutGraph(self.canvasGraph);
        self.canvasPaper.unfreeze();
        self.canvasPaper.render();
    }

    addStencilGraph(graph: joint.dia.Graph, activities: Activity[]) {
        const self = this;
        const nodes = [];

        each(activities, (activity: Activity) => {
            const el = new StencilNode()
            // .size(120, 80)
            // .setColor(activity.backgroundColor)
            //.setIcon(activity.iconUrl);
            el.attr('label/text', activity.title);
            el.set({ activity: cloneDeep(activity) });

            nodes.push(el);
        });

        graph.resetCells(nodes);
        self._layout(graph);
    }

    private _layout(graph: joint.dia.Graph) {
        let currentY = 10;
        graph.getElements().forEach((el) => {
            //Sel.getBBox().bottomRight();
            el.position(10, currentY);
            currentY += el.size().height + 10;
        });
    }

    private _layoutGraph(graph) {
        const autoLayoutElements = [];
        const manualLayoutElements = [];
        graph.getElements().forEach((el) => {
            if (el.attr('./visibility') !== 'hidden') {
                autoLayoutElements.push(el);
            }
        });
        // Automatic Layout
        joint.layout.DirectedGraph.layout(graph.getSubgraph(autoLayoutElements), {
            align: 'UR',
            setVertices: true,
            setLabels: true,
            marginX: 50,
            marginY: 50,
            rankSep: 200,
            // nodeSep: 2000,
            //edgeSep: 2000,
            rankDir: "LR"
        });
        // Manual Layout
        manualLayoutElements.forEach(function (el) {
            const neighbor = graph.getNeighbors(el, { inbound: true })[0];
            if (!neighbor) return;
            const neighborPosition = neighbor.getBBox().bottomRight();
            el.position(neighborPosition.x + 20, neighborPosition.y - el.size().height / 2 - 20);
        });
    }

    private _offsetToLocalPoint(x, y) {
        const self = this;

        const svgPoint = joint.Vectorizer.createSVGPoint(x, y);
        // Transform point into the viewport coordinate system.
        const pointTransformed = svgPoint.matrixTransform(self.canvasPaper.viewport.getCTM().inverse());
        return pointTransformed;
    }
}