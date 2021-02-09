import * as React from "react";
import Ruler, {
    PROPERTIES as RULER_PROPERTIES,
    RulerProps,
} from "@scena/react-ruler";
import { ref, refs } from "framework-utils";
import Gesto, { OnDragEnd } from "gesto";
import styled, { StyledElement } from "react-css-styled";
import {
    GUIDES,
    GUIDE,
    DRAGGING,
    ADDER,
    DISPLAY_DRAG,
    GUIDES_CSS,
} from "../consts";
import { prefix } from "../utils";
import { hasClass, addClass, removeClass } from "@daybrush/utils";
import { GuidesState, GuidesProps, GuidesInterface } from "../types";
import { getDistElementMatrix, calculateMatrixDist } from "css-to-mat";
import { getTranslateName, movePos } from "./Guides.logic";

const GuidesElement = styled("div", GUIDES_CSS);

const defaultGuides = {
    className: "",
    guidesColor: "#8f8f8f",
    type: "horizontal",
    zoom: 1,
    style: { width: "100%", height: "100%" },
    snapThreshold: 5,
    snaps: [],
    digit: 0,
    onChangeGuides: () => {},
    onDragStart: () => {},
    onDrag: () => {},
    onDragEnd: () => {},
    displayDragPos: false,
    dragPosFormat: (v) => v,
    defaultGuides: [],
    showGuides: true,
};

const Guides = (props: React.PropsWithChildren<GuidesProps>) => {
    const [guides, updateGuides] = React.useState<GuidesState>({ guides: [] });

    const adderElement = React.useRef<HTMLElement>();
    const scrollPos = React.useRef<number>(0);
    const ruler = React.useRef<Ruler>();
    const manager = React.useRef<StyledElement<HTMLElement>>();
    const guidesElement = React.useRef<HTMLElement>();
    const displayElement = React.useRef<HTMLElement>();
    const originElement = React.useRef<HTMLElement>();
    const gesto = React.useRef<Gesto>();
    const guideElements = React.useRef<HTMLElement[]>([]);

    const getGuides = (): number[] => guides;
    React.useLayoutEffect(() => {
        gesto.current = new Gesto(manager?.current?.getElement(), {
            container: document.body,
        })
            .on("dragStart", (e) => {
                const inputEvent = e.inputEvent;
                const target = inputEvent.target;
                const datas = e.datas;
                const canvasElement = ruler?.current?.canvasElement;
                const isHorizontal = props.type === "horizontal";
                const originRect = originElement?.current?.getBoundingClientRect();
                const matrix = getDistElementMatrix(
                    manager?.current?.getElement()
                );
                const offsetPos = calculateMatrixDist(matrix, [
                    e.clientX - originRect.left,
                    e.clientY - originRect.top,
                ]);
                offsetPos[0] -= guidesElement?.current?.offsetLeft;
                offsetPos[1] -= guidesElement?.current?.offsetTop;
                offsetPos[isHorizontal ? 1 : 0] +=
                    scrollPos?.current * props.zoom!;

                datas.offsetPos = offsetPos;
                datas.matrix = matrix;

                if (target === canvasElement) {
                    datas.fromRuler = true;
                    datas.target = adderElement;
                } else if (hasClass(target, GUIDE)) {
                    datas.target = target;
                } else {
                    e.stop();
                    return false;
                }
                onDragStart(e);
            })
            .on("drag", onDrag)
            .on("dragEnd", onDragEnd);
        updateGuides({ guides: defaultGuides || [] }); // pass array of guides on mount data to create gridlines or something like that in ui
        return () => {
            gesto?.current?.unset();
        };
    }, []);

    React.useLayoutEffect(() => {
        // to dynamically update guides from code rather than dragging guidelines
        updateGuides({ guides: props.defaultGuides || [] });
        return () => {};
    }, [defaultGuides]);

    const loadGuides = (guides: number[]) => updateGuides({ guides });

    const scrollGuides = (pos: number) => {
        const guidesElement = guidesElement?.current;

        scrollPos.current = pos;
        guidesElement.style.transform = `${getTranslateName({
            type: props.type,
        })}(${-pos * props.zoom}px)`;

        guideElements.current.forEach((el, i) => {
            if (!el) {
                return;
            }
            el.style.display = -pos + guides[i] < 0 ? "none" : "block";
        });
    };

    const resize = () => ruler?.current?.resize();

    const scroll = (pos: number) => ruler?.current?.scroll(pos);

    const onDragStart = (e: any) => {
        const { datas, inputEvent } = e;

        addClass(datas.target, DRAGGING);
        onDrag(e);
 
        onDragStart!({
            ...e,
            dragElement: datas.target,
        });
        inputEvent.stopPropagation();
        inputEvent.preventDefault();
    };
    const onDrag = (e: any) => {
        const nextPos = movePos(e, { displayElement, ...props });

        props.onDrag!({
            ...e,
            dragElement: e.datas.target,
        });
        return nextPos;
    };
    const onDragEnd = (e: OnDragEnd) => {
        const { datas, isDouble, distX, distY } = e;
        const pos = movePos(e, { displayElement, ...props });

        const { onChangeGuides, zoom, displayDragPos, digit } = props;
        const guidePos = parseFloat((pos / zoom!).toFixed(digit || 0));

        if (displayDragPos) {
            displayElement.current.style.cssText += `display: none;`;
        }
        removeClass(datas.target, DRAGGING);

        props.onDragEnd!({
            ...e,
            dragElement: datas.target,
        });

        if (datas.fromRuler) {
            if (pos >= scrollPos && guides.indexOf(guidePos) < 0) {
                updateGuides(
                    {
                        guides: [...guides, guidePos],
                    },
                    () => {
                        onChangeGuides!({
                            guides: state.guides,
                            distX,
                            distY,
                        });
                    }
                );
            }
        } else {
            const index = datas.target.getAttribute("data-index");

            if (isDouble  || guidePos < scrollPos) {
                guides.splice(index, 1);
            } else if (guides.indexOf(guidePos) > -1) {
                return;
            } else {
                guides[index] = guidePos;
            }
            updateGuides(
                {
                    guides: [guides],
                },
                () => {
                    const nextGuides = state.guides;
                    onChangeGuides!({
                        distX,
                        distY,
                        guides: nextGuides,
                    });
                }
            );
        }
    };
};
