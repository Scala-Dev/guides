import { addClass, hasClass, removeClass } from '@daybrush/utils';
import Ruler, {
  PROPERTIES as RULER_PROPERTIES,
  RulerProps,
} from '@scena/react-ruler';
import { calculateMatrixDist, getDistElementMatrix } from 'css-to-mat';
import { ref, refs } from 'framework-utils';
import Gesto, { OnDragEnd } from 'gesto';
import * as React from 'react';
import styled, { StyledElement } from 'react-css-styled';

import {
  ADDER,
  DISPLAY_DRAG,
  DRAGGING,
  GUIDE,
  GUIDES,
  GUIDES_CSS,
} from './consts';
import {
  BorderStyle,
  GuidesInterface,
  GuidesProps,
  GuidesState,
} from './types';
import { prefix } from './utils';

const GuidesElement = styled('div', GUIDES_CSS);

export default class Guides
  extends React.PureComponent<GuidesProps, GuidesState>
  implements GuidesInterface {
  public static defaultProps: GuidesProps = {
    className: '',
    defaultGuides: [],
    deleteOnDblclick: true,
    digit: 0,
    displayDragPos: false,
    dragPosFormat: (v) => v,
    guidesColor: '#8f8f8f',
    guidesStyle: 'dashed',
    lockGuides: false,
    onChangeGuides: () => {},
    onDrag: () => {},
    onDragEnd: () => {},
    onDragStart: () => {},
    showGuides: true,
    snapThreshold: 5,
    snaps: [],
    style: { height: '100%', width: '100%' },
    type: 'horizontal',
    zoom: 1,
  };
  public state: GuidesState = {
    guides: [],
  };
  public adderElement!: HTMLElement;
  public scrollPos = 0;
  public ruler!: Ruler;
  private manager!: StyledElement<HTMLElement>;
  private guidesElement!: HTMLElement;
  private displayElement!: HTMLElement;
  private originElement!: HTMLElement;
  private gesto!: Gesto;
  private guideElements: HTMLElement[] = [];

  // DES2-1606, delay create till drg
  private isTrackingCreate = false; // tracking beginning and end of create sequence
  private canCreate = false; // signal if mouse out of ruler area
  private created = false; // signal if new guide was added

  public render() {
    const {
      className,
      guidesColor,
      type,
      zoom,
      style,
      rulerStyle,
      displayDragPos,
      cspNonce,
    } = this.props as Required<GuidesProps>;
    const props = this.props;
    const translateName = this.getTranslateName();

    const rulerProps: RulerProps = {};

    RULER_PROPERTIES.forEach((name) => {
      if (name === 'style') {
        return;
      }
      (rulerProps as any)[name] = props[name];
    });

    const { draggingGuideStyle, staticGuideStyle } = this.getGuideColorStyle(
      type,
      guidesColor,
    );

    return (
      <GuidesElement
        className={`${prefix('manager', type)} ${className}`}
        cspNonce={cspNonce}
        ref={ref(this, 'manager')}
        style={style}
      >
        <div
          className={prefix('guide-origin')}
          ref={ref(this, 'originElement')}
        ></div>
        <Ruler ref={ref(this, 'ruler')} style={rulerStyle} {...rulerProps} />
        <div
          className={GUIDES}
          ref={ref(this, 'guidesElement')}
          style={{
            transform: `${translateName}(${-this.scrollPos * zoom}px)`,
          }}
        >
          {displayDragPos && (
            <div
              className={DISPLAY_DRAG}
              ref={ref(this, 'displayElement')}
              style={{ color: this.props.guidesColor }}
            />
          )}
          <div
            className={ADDER}
            ref={ref(this, 'adderElement')}
            style={draggingGuideStyle}
          />
          {this.renderGuides(staticGuideStyle)}
        </div>
      </GuidesElement>
    );
  }

  private getGuideColorStyle(type: string, guidesColor: string) {
    const guideColorStyle = (guidesStyle: BorderStyle): React.CSSProperties =>
      type === 'horizontal'
        ? { borderTop: `1px ${guidesStyle} ${guidesColor}` }
        : { borderLeft: `1px ${guidesStyle} ${guidesColor}` };

    const draggingGuideStyle: React.CSSProperties = {
      ...guideColorStyle('solid'),
    };
    const staticGuideStyle: React.CSSProperties = {
      ...guideColorStyle(this.props.guidesStyle),
    };
    return { draggingGuideStyle, staticGuideStyle };
  }

  public renderGuides(staticGuideStyle: React.CSSProperties) {
    const { type, zoom, showGuides } = this.props as Required<GuidesProps>;
    const translateName = this.getTranslateName();
    const guides = this.state.guides;

    this.guideElements = [];
    if (showGuides) {
      return guides.map((pos, i) => {
        return (
          <div
            className={prefix('guide', type)}
            data-index={i}
            data-pos={pos}
            key={i}
            ref={refs(this, 'guideElements', i)}
            style={{
              ...staticGuideStyle,
              transform: `${translateName}(${pos * zoom}px) translateZ(0px)`,
            }}
          ></div>
        );
      });
    }
    return;
  }

  public componentDidMount() {
    this.manager.getElement().addEventListener('mouseleave', this.onMouseLeave);
    this.gesto = new Gesto(this.manager.getElement(), {
      container: document.body,
    })
      .on('dragStart', (e) => {
        const { type, zoom, lockGuides } = this.props;

        if (lockGuides === true) {
          e.stop();
          return;
        }
        const inputEvent = e.inputEvent;
        const target = inputEvent.target;
        const datas = e.datas;
        const canvasElement = this.ruler.canvasElement;
        const guidesElement = this.guidesElement;
        const isHorizontal = type === 'horizontal';
        const originRect = this.originElement.getBoundingClientRect();
        const matrix = getDistElementMatrix(this.manager.getElement());
        const offsetPos = calculateMatrixDist(matrix, [
          e.clientX - originRect.left,
          e.clientY - originRect.top,
        ]);
        offsetPos[0] -= guidesElement.offsetLeft;
        offsetPos[1] -= guidesElement.offsetTop;
        offsetPos[isHorizontal ? 1 : 0] += this.scrollPos * zoom!;

        datas.offsetPos = offsetPos;
        datas.matrix = matrix;

        const isLockAdd = lockGuides && lockGuides.indexOf('add') > -1;
        const isLockRemove = lockGuides && lockGuides.indexOf('remove') > -1;
        const isLockChange = lockGuides && lockGuides.indexOf('change') > -1;

        if (target === canvasElement) {
          if (isLockAdd) {
            e.stop();
            return;
          }
          datas.fromRuler = true;
          datas.target = this.adderElement;
          // add
        } else if (hasClass(target, GUIDE)) {
          if (isLockRemove && isLockChange) {
            e.stop();
            return;
          }
          datas.target = target;
          // change
        } else {
          e.stop();
          return false;
        }
        this.onDragStart(e);
      })
      .on('drag', this.onDrag)
      .on('dragEnd', this.onDragEnd);
    this.setState({ guides: this.props.defaultGuides || [] }); // pass array of guides on mount data to create gridlines or something like that in ui
  }
  public componentWillUnmount() {
    this.manager
      .getElement()
      .removeEventListener('mouseleave', this.onMouseLeave);
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
    guidesElement.style.transform = `${this.getTranslateName()}(${
      -pos * zoom
    }px)`;

    const guides = this.state.guides;
    this.guideElements.forEach((el, i) => {
      if (!el) {
        return;
      }
      el.style.display = -pos + guides[i] < 0 ? 'none' : 'block';
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
    const { inputEvent, datas } = e;

    if (!datas.fromRuler) addClass(datas.target, DRAGGING);
    else {
      this.isTrackingCreate = true;
      // allow touch create to skip mouseleave logic
      if (inputEvent.type === 'touchstart') this.canCreate = true;
    }

    inputEvent.stopPropagation();
    inputEvent.preventDefault();
  };

  private onMouseLeave = () => {
    if (this.isTrackingCreate) this.canCreate = true;
  };

  private onDrag = (e: any) => {
    if (e.datas.fromRuler) {
      if (!this.canCreate && !this.created) {
        // do not create till mouseleave the ruler
        return;
      }
      if (this.canCreate && !this.created) {
        // DES2-1606, delay create till drg
        addClass(e.datas.target, DRAGGING);
        this.props.onDragStart!({
          ...e,
          dragElement: e.datas.target,
        });
        this.created = true;
      }
    }

    const nextPos = this.movePos(e);

    /**
     * When dragging, the drag event is called.
     * @memberof Guides
     * @event drag
     * @param {OnDrag} - Parameters for the drag event
     */
    this.props.onDrag!({
      ...e,
      dragElement: e.datas.target,
    });
    return nextPos;
  };

  private cleanupCreate = () => {
    // DES2-1606, delay create till drg
    this.canCreate = false;
    this.created = false;
    this.isTrackingCreate = false;
  };

  private onDragEnd = (e: OnDragEnd) => {
    const { datas, isDouble, distX, distY } = e;
    const pos = this.movePos(e);
    let guides = this.state.guides;
    const {
      onChangeGuides,
      zoom,
      displayDragPos,
      digit,
      lockGuides,
    } = this.props;
    const guidePos = parseFloat((pos / zoom!).toFixed(digit || 0));

    if (displayDragPos) {
      this.displayElement.style.cssText += `display: none;`;
    }
    removeClass(datas.target, DRAGGING);
    /**
     * When the drag finishes, the dragEnd event is called.
     * @memberof Guides
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
      // DES2-1852, remove position restriction
      // if (pos >= this.scrollPos && guides.indexOf(guidePos) < 0) {
      if (guides.indexOf(guidePos) < 0) {
        // DES2-1606, delay create till drg
        if (this.created) {
          if (guidePos < this.scrollPos) {
            // do not create if dragEnd on the ruler
            this.cleanupCreate();
            return;
          }
          this.setState(
            {
              guides: [...guides, guidePos],
            },
            () => {
              onChangeGuides!({
                distX,
                distY,
                guides: this.state.guides,
                isAdd: true,
                isChange: false,
                isRemove: false,
              });
            },
          );
        }
      }
    } else {
      const index = datas.target.getAttribute('data-index');
      let isRemove = false;
      let isChange = false;

      guides = [...guides];
      const deleteOnDblclick = this.props.deleteOnDblclick && isDouble;

      if (deleteOnDblclick || guidePos < this.scrollPos) {
        if (
          lockGuides &&
          (lockGuides === true || lockGuides.indexOf('remove') > -1)
        ) {
          this.cleanupCreate();
          return;
        }
        guides.splice(index, 1);
        isRemove = true;
      } else if (guides.indexOf(guidePos) > -1) {
        this.cleanupCreate();
        return;
      } else {
        if (
          lockGuides &&
          (lockGuides === true || lockGuides.indexOf('change') > -1)
        ) {
          this.cleanupCreate();
          return;
        }
        guides[index] = guidePos;
        isChange = true;
      }
      this.setState(
        {
          guides,
        },
        () => {
          const nextGuides = this.state.guides;
          onChangeGuides!({
            distX,
            distY,
            guides: nextGuides,
            isAdd: false,
            isChange,
            isRemove,
          });
        },
      );
    }
    this.cleanupCreate();
  };

  private movePos(e: any) {
    const { datas, distX, distY } = e;
    const props = this.props;
    const { type, zoom, snaps, snapThreshold, displayDragPos, digit } = props;
    const dragPosFormat = props.dragPosFormat || ((v) => v);
    const isHorizontal = type === 'horizontal';
    const matrixPos = calculateMatrixDist(datas.matrix, [distX, distY]);
    const offsetPos = datas.offsetPos;
    const offsetX = matrixPos[0] + offsetPos[0];
    const offsetY = matrixPos[1] + offsetPos[1];
    let nextPos = Math.round(isHorizontal ? offsetY : offsetX);
    let guidePos = parseFloat((nextPos / zoom!).toFixed(digit || 0));
    const guideSnaps = snaps!.slice().sort((a, b) => {
      return Math.abs(guidePos - a) - Math.abs(guidePos - b);
    });

    if (
      guideSnaps.length &&
      Math.abs(guideSnaps[0] * zoom! - nextPos) < snapThreshold!
    ) {
      guidePos = guideSnaps[0];
      nextPos = guidePos * zoom!;
    }
    if (displayDragPos) {
      const displayPos =
        type === 'horizontal' ? [offsetX, nextPos] : [nextPos, offsetY];
      this.displayElement.style.cssText += `display: block;transform: translate(-50%, -50%) translate(${displayPos
        .map((v) => `${v}px`)
        .join(', ')})`;
      this.displayElement.innerHTML = `${dragPosFormat!(guidePos)}`;
    }
    datas.target.setAttribute('data-pos', guidePos);
    datas.target.style.transform = `${this.getTranslateName()}(${nextPos}px)`;

    return nextPos;
  }
  private getTranslateName() {
    return this.props.type === 'horizontal' ? 'translateY' : 'translateX';
  }
}
