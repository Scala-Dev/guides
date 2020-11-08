import * as React from "react";
import Ruler from "@scena/react-ruler";
import { ref, refs } from "framework-utils";
import Gesto, { OnDragEnd } from "gesto";
import styled, { StyledElement } from "react-css-styled";
import { GUIDES, GUIDE, DRAGGING, ADDER, DISPLAY_DRAG, GUIDES_CSS } from "./consts";
import { prefix } from "./utils";
import { hasClass, addClass, removeClass } from "@daybrush/utils";
import { GuidesState, GuidesProps, GuidesInterface } from "./types";
import { getDistElementMatrix, calculateMatrixDist } from "css-to-mat";

const GuidesElement = styled("div", GUIDES_CSS);

export default class Guides extends React.PureComponent<GuidesProps, GuidesState> implements GuidesInterface {
    public static defaultProps: GuidesProps = {
        className: "",
        type: "horizontal",
        setGuides: () => { },
        zoom: 1,
        style: { width: "100%", height: "100%" },
        snapThreshold: 5,
        snaps: [],
        onChangeGuides: () => { },
        onDragStart: () => { },
        onDrag: () => { },
        onDragEnd: () => { },
        displayDragPos: false,
        dragPosFormat: v => v,
        defaultGuides: [],
        showGuides: true,
    };
    public state: GuidesState = {
        guides: [],
    };
    public adderElement!: HTMLElement;
    public scrollPos: number = 0;
    public ruler!: Ruler;
    private manager!: StyledElement<HTMLElement>;
    private guidesElement!: HTMLElement;
    private displayElement!: HTMLElement;
    private originElement!: HTMLElement;
    private gesto!: Gesto;
    private guideElements: HTMLElement[] = [];

    public render() {
        const {
            className,
            type,
            width,
            height,
            unit,
            zoom,
            style,
            rulerStyle,
            backgroundColor,
            lineColor,
            textColor,
            direction,
            textFormat,
            displayDragPos,
            cspNonce,
        } = this.props as Required<GuidesProps>;
        const translateName = this.getTranslateName();

        return <GuidesElement
            ref={ref(this, "manager")}
            cspNonce={cspNonce}
            className={`${prefix("manager", type)} ${className}`}
            style={style}
        >
            <div className={prefix("guide-origin")} ref={ref(this, "originElement")}></div>
            <Ruler
                ref={ref(this, "ruler")}
                type={type}
                width={width}
                height={height}
                unit={unit}
                zoom={zoom}
                backgroundColor={backgroundColor}
                lineColor={lineColor}
                style={rulerStyle}
                textColor={textColor}
                direction={direction}
                textFormat={textFormat}
            />
            <div className={GUIDES} ref={ref(this, "guidesElement")} style={{
                transform: `${translateName}(${-this.scrollPos * zoom}px)`,
            }}>
                {displayDragPos && <div className={DISPLAY_DRAG} ref={ref(this, "displayElement")} />}
                <div className={ADDER} ref={ref(this, "adderElement")} />
                {this.renderGuides()}
            </div>
        </GuidesElement>;
    }
    public renderGuides() {
        const { type, zoom, showGuides } = this.props as Required<GuidesProps>;
        const translateName = this.getTranslateName();
        const guides = this.state.guides;

        this.guideElements = [];
        if (showGuides) {
            return guides.map((pos, i) => {
                return (<div className={prefix("guide", type)}
                    ref={refs(this, "guideElements", i)}
                    key={i}
                    data-index={i}
                    data-pos={pos}
                    style={{
                        transform: `${translateName}(${pos * zoom}px)`,
                    }}></div>);
            });
        }
        return;
    }
    public componentDidMount() {
        this.gesto = new Gesto(this.manager.getElement(), {
            container: document.body,
        }).on("dragStart", e => {
            const inputEvent = e.inputEvent;
            const target = inputEvent.target;
            const datas = e.datas;
            const canvasElement = this.ruler.canvasElement;
            const guidesElement = this.guidesElement;
            const isHorizontal = this.props.type === "horizontal";
            const originRect = this.originElement.getBoundingClientRect();
            const matrix = getDistElementMatrix(this.manager.getElement());
            const offsetPos = calculateMatrixDist(matrix, [
                e.clientX - originRect.left,
                e.clientY - originRect.top,
            ]);
            offsetPos[0] -= guidesElement.offsetLeft;
            offsetPos[1] -= guidesElement.offsetTop;
            offsetPos[isHorizontal ? 1 : 0] += this.scrollPos * this.props.zoom!;

            datas.offsetPos = offsetPos;
            datas.matrix = matrix;

            if (target === canvasElement) {
                datas.fromRuler = true;
                datas.target = this.adderElement;
            } else if (hasClass(target, GUIDE)) {
                datas.target = target;
            } else {
                e.stop();
                return false;
            }
            this.onDragStart(e);
        }).on("drag", this.onDrag).on("dragEnd", this.onDragEnd);
        this.setState({ guides: this.props.defaultGuides || [] }); // pass array of guides on mount data to create gridlines or something like that in ui
    }
    public componentWillUnmount() {
        this.gesto.unset();
    }
    public componentDidUpdate(prevProps: any) {
        if (prevProps.defaultGuides !== this.props.defaultGuides) {
            // to dynamically update guides from code rather than dragging guidelines
            this.setState({ guides: this.props.defaultGuides || [] });
        }
    }
    /**
     * Load the current guidelines.
     * @memberof Guides
     * @instance
     */
    public loadGuides(guides: number[]) {
        this.setState({
            guides,
        });
    }
    /**
     * Get current guidelines.
     * @memberof Guides
     * @instance
     */
    public getGuides(): number[] {
        return this.state.guides;
    }
    /**
     * Scroll the positions of the guidelines opposite the ruler.
     * @memberof Guides
     * @instance
     */
    public scrollGuides(pos: number) {
        const { zoom } = this.props as Required<GuidesProps>;
        const guidesElement = this.guidesElement;

        this.scrollPos = pos;
        guidesElement.style.transform = `${this.getTranslateName()}(${-pos * zoom}px)`;

        const guides = this.state.guides;
        this.guideElements.forEach((el, i) => {
            if (!el) {
                return;
            }
            el.style.display = -pos + guides[i] < 0 ? "none" : "block";
        });
    }
    /**
     * Recalculate the size of the ruler.
     * @memberof Guides
     * @instance
     */
    public resize() {
        this.ruler.resize();
    }
    /**
     * Scroll the position of the ruler.
     * @memberof Guides
     * @instance
     */
    public scroll(pos: number) {
        this.ruler.scroll(pos);
    }
    private onDragStart = (e: any) => {
        const { datas, inputEvent } = e;
        const { onDragStart } = this.props;

        addClass(datas.target, DRAGGING);
        this.onDrag(e);

        /**
         * When the drag starts, the dragStart event is called.
         * @event dragStart
         * @param {OnDragStart} - Parameters for the dragStart event
         */
        onDragStart!({
            ...e,
            dragElement: datas.target,
        });
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
    }
    private onDrag = (e: any) => {
        const nextPos = this.movePos(e);

        /**
         * When dragging, the drag event is called.
         * @event drag
         * @param {OnDrag} - Parameters for the drag event
         */
        this.props.onDrag!({
            ...e,
            dragElement: e.datas.target,
        });
        return nextPos;
    }
    private onDragEnd = (e: OnDragEnd) => {
        const { datas, isDouble, distX, distY } = e;
        const pos = this.movePos(e);
        const guides = this.state.guides;
        const { setGuides, onChangeGuides, zoom, displayDragPos } = this.props;
        const guidePos = Math.round(pos / zoom!);

        if (displayDragPos) {
            this.displayElement.style.cssText += `display: none;`;
        }
        removeClass(datas.target, DRAGGING);
        /**
         * When the drag finishes, the dragEnd event is called.
         * @event dragEnd
         * @param {OnDragEnd} - Parameters for the dragEnd event
         */
        this.props.onDragEnd!({
            ...e,
            dragElement: datas.target,
        });
        /**
        * The `changeGuides` event occurs when the guideline is added / removed / changed.
        * @memberof Guides
        * @event changeGuides
        * @param {OnChangeGuides} - Parameters for the changeGuides event
        */
        if (datas.fromRuler) {
            if (pos >= this.scrollPos && guides.indexOf(guidePos) < 0) {
                this.setState({
                    guides: [...guides, guidePos],
                }, () => {
                    onChangeGuides!({
                        guides: this.state.guides,
                        distX,
                        distY,
                    });
                    setGuides!(this.state.guides);
                });
            }
        } else {
            const index = datas.target.getAttribute("data-index");

            if (isDouble || guidePos < this.scrollPos) {
                guides.splice(index, 1);
            } else if (guides.indexOf(guidePos) > -1) {
                return;
            } else {
                guides[index] = guidePos;
            }
            this.setState({
                guides: [...guides],
            }, () => {
                const nextGuides = this.state.guides;
                setGuides!(nextGuides);
                onChangeGuides!({
                    distX,
                    distY,
                    guides: nextGuides,
                });
            });
        }
    }
    private movePos(e: any) {
        const { datas, distX, distY } = e;
        const {
            type, zoom, snaps, snapThreshold,
            displayDragPos, dragPosFormat,
        } = this.props;
        const isHorizontal = type === "horizontal";
        const matrixPos = calculateMatrixDist(datas.matrix, [distX, distY]);
        const offsetPos = datas.offsetPos;
        const offsetX = matrixPos[0] + offsetPos[0];
        const offsetY = matrixPos[1] + offsetPos[1];
        let nextPos = Math.round(isHorizontal ? offsetY : offsetX);
        let guidePos = Math.round(nextPos / zoom!);
        const guideSnaps = snaps!.slice().sort((a, b) => {
            return Math.abs(guidePos - a) - Math.abs(guidePos - b);
        });

        if (guideSnaps.length && Math.abs(guideSnaps[0] - guidePos) < snapThreshold!) {
            guidePos = guideSnaps[0];
            nextPos = guidePos * zoom!;
        }
        if (displayDragPos) {
            const displayPos = type === "horizontal"
                ? [offsetX, nextPos]
                : [nextPos, offsetY];
            this.displayElement.style.cssText += `display: block;transform: translate(-50%, -50%) translate(${
                displayPos.map(v => `${v}px`).join(", ")
                })`;
            this.displayElement.innerHTML = `${dragPosFormat!(guidePos)}`;
        }
        datas.target.setAttribute("data-pos", guidePos);
        datas.target.style.transform = `${this.getTranslateName()}(${nextPos}px)`;

        return nextPos;

    }
    private getTranslateName() {
        return this.props.type === "horizontal" ? "translateY" : "translateX";
    }
}
