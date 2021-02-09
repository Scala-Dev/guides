// import { calculateMatrixDist } from "css-to-mat";
// import { GuidesProps } from "../types";
// import Ruler, {
//     PROPERTIES as RULER_PROPERTIES,
//     RulerProps,
// } from "@scena/react-ruler";
// import { prefix } from "../utils";
// import { ADDER, DISPLAY_DRAG, GUIDES, GUIDES_CSS } from "../consts";
// import styled from "react-css-styled";


// export const GuidesElement = styled("div", GUIDES_CSS);
// export const getTranslateName = ({ type }) => {
//     return type === "horizontal" ? "translateY" : "translateX";
// };

// export const render = ({
//     adderElement,
//     className,
//     cspNonce,
//     displayDragPos,
//     displayElement,
//     guidesElement,
//     guideElements,
//     showGuides,
//     guides,
//     manager,
//     originElement,
//     ruler,
//     rulerStyle,
//     scrollPos,
//     style,
//     type,
//     zoom,
// }: GuidesProps) => {
//     const translateName = getTranslateName({ type });
//     const rulerProps: RulerProps = {};

//     RULER_PROPERTIES.forEach((name) => {
//         if (name === "style") {
//             return;
//         }
//         (rulerProps as any)[name] = name;
//     });
//     return (
//         <>
//             <GuidesElement
//                 ref={manager}
//                 cspNonce={cspNonce}
//                 className={`${prefix("manager", type)} ${className}`}
//                 style={style}
//             >
//                 <div
//                     className={prefix("guide-origin")}
//                     ref={originElement}
//                 ></div>
//                 <Ruler ref={ruler} style={rulerStyle} {...rulerProps} />
//                 <div
//                     className={GUIDES}
//                     ref={guidesElement}
//                     style={{
//                         transform: `${translateName}(${-scrollPos * zoom}px)`,
//                     }}
//                 >
//                     {displayDragPos && (
//                         <div className={DISPLAY_DRAG} ref={displayElement} />
//                     )}{" "}
//                     // Here
//                     <div className={ADDER} ref={adderElement} />
//                     {renderGuides({
//                         guides,
//                         type,
//                         zoom,
//                         showGuides,
//                         guideElements,
//                     })}
//                 </div>
//             </GuidesElement>
//         </>
//     );
// };

// export const renderGuides = ({
//     guides,
//     type,
//     zoom,
//     showGuides,
//     guideElements,
// }) => {
//     const translateName = getTranslateName({ type });

//     guideElements = [];
//     if (showGuides) {
//         return guides.map((pos, i) => {
//             return (
//                 <div
//                     className={prefix("guide", type)}
//                     ref={guideElements}
//                     key={i}
//                     data-index={i}
//                     data-pos={pos}
//                     style={{
//                         transform: `${translateName}(${pos * zoom}px)`,
//                     }}
//                 ></div>
//             );
//         });
//     }
//     return;
// };
// export const movePos = (
//     { datas, distX, distY }: any,
//     {
//         type,
//         zoom,
//         snaps,
//         snapThreshold,
//         displayDragPos,
//         digit,
//         dragPosFormat,
//         displayElement,
//     }
// ) => {
//     dragPosFormat = dragPosFormat || ((v) => v);
//     const isHorizontal = type === "horizontal";
//     const matrixPos = calculateMatrixDist(datas.matrix, [distX, distY]);
//     const offsetPos = datas.offsetPos;
//     const offsetX = matrixPos[0] + offsetPos[0];
//     const offsetY = matrixPos[1] + offsetPos[1];
//     let nextPos = Math.round(isHorizontal ? offsetY : offsetX);
//     let guidePos = parseFloat((nextPos / zoom!).toFixed(digit || 0));
//     const guideSnaps = snaps!.slice().sort((a, b) => {
//         return Math.abs(guidePos - a) - Math.abs(guidePos - b);
//     });

//     if (
//         guideSnaps.length &&
//         Math.abs(guideSnaps[0] * zoom! - nextPos) < snapThreshold!
//     ) {
//         guidePos = guideSnaps[0];
//         nextPos = guidePos * zoom!;
//     }
//     if (displayDragPos) {
//         const displayPos =
//             type === "horizontal" ? [offsetX, nextPos] : [nextPos, offsetY];
//         displayElement.style.cssText += `display: block;transform: translate(-50%, -50%) translate(${displayPos
//             .map((v) => `${v}px`)
//             .join(", ")})`;
//         displayElement.innerHTML = `${dragPosFormat!(guidePos)}`;
//     }
//     datas.target.setAttribute("data-pos", guidePos);
//     datas.target.style.transform = `${getTranslateName({
//         type,
//     })}(${nextPos}px)`;

//     return nextPos;
// };
