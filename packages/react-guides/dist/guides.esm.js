/*
Copyright (c) 2019 Daybrush
name: @scala-universal/react-guides
license: MIT
author: Daybrush
repository: https://github.com/daybrush/guides/blob/master/packages/react-guides
version: 0.13.5
*/
import { addClass, removeClass, hasClass } from '@daybrush/utils';
import Ruler, { PROPERTIES as PROPERTIES$1 } from '@scena/react-ruler';
import { getDistElementMatrix, calculateMatrixDist } from 'css-to-mat';
import { prefixNames, prefixCSS, ref, refs } from 'framework-utils';
import Gesto from 'gesto';
import { createElement, PureComponent } from 'react';
import styled from 'react-css-styled';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

/* global Reflect, Promise */
var extendStatics = function (d, b) {
  extendStatics = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function (d, b) {
    d.__proto__ = b;
  } || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
  };

  return extendStatics(d, b);
};

function __extends(d, b) {
  extendStatics(d, b);

  function __() {
    this.constructor = d;
  }

  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function () {
  __assign = Object.assign || function __assign(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

function prefix() {
  var classNames = [];

  for (var _i = 0; _i < arguments.length; _i++) {
    classNames[_i] = arguments[_i];
  }

  return prefixNames.apply(void 0, ["scena-"].concat(classNames));
}

var RULER = prefix("ruler");
var ADDER = prefix("guide", "adder");
var GUIDES = prefix("guides");
var GUIDE = prefix("guide");
var DRAGGING = prefix("dragging");
var DISPLAY_DRAG = prefix("display-drag");
var GUIDES_CSS = prefixCSS("scena-", "\n{\n    position: relative;\n}\ncanvas {\n    position: relative;\n}\n.guide-origin {\n    position: absolute;\n    width: 1px;\n    height: 1px;\n    top: 0;\n    left: 0;\n    opacity: 0;\n}\n.guides {\n    position: absolute;\n    top: 0;\n    left: 0;\n    will-change: transform;\n    z-index: 2000;\n}\n.display-drag {\n    position: absolute;\n    will-change: transform;\n    z-index: 2000;\n    font-weight: bold;\n    font-size: 12px;\n    display: none;\n    left: 20px;\n    top: -20px;\n    color: #8f8f8f;\n}\n:host.horizontal .guides {\n    width: 100%;\n    height: 0;\n    top: 30px;\n}\n:host.vertical .guides {\n    height: 100%;\n    width: 0;\n    left: 30px;\n}\n.guide {\n    position: absolute;\n    z-index: 2;\n}\n.guide.dragging:before {\n    position: absolute;\n    content: \"\";\n    width: 100%;\n    height: 100%;\n    top: 50%;\n    left: 50%;\n    transform: translate(-50%, -50%);\n}\n:host.horizontal .guide {\n    width: 100%;\n    height: 1px;\n    cursor: row-resize;\n}\n:host.vertical .guide {\n    width: 1px;\n    height: 100%;\n    cursor: col-resize;\n}\n.mobile :host.horizontal .guide {\n    transform: scale(1, 2);\n}\n.mobile :host.vertical .guide {\n    transform: scale(2, 1);\n}\n:host.horizontal .guide:before {\n    height: 20px;\n}\n:host.vertical .guide:before {\n    width: 20px;\n}\n.adder {\n    display: none;\n}\n.adder.dragging {\n    display: block;\n}\n");
var PROPERTIES = ["className", "rulerStyle", 'snapThreshold', "snaps", "displayDragPos", "cspNonce", 'dragPosFormat', "defaultGuides", "showGuides"].concat(PROPERTIES$1);
var METHODS = ["getGuides", "loadGuides", "scroll", "scrollGuides", "resize"];
var EVENTS = ["changeGuides", "dragStart", "drag", "dragEnd"];

var GuidesElement = styled('div', GUIDES_CSS);

var Guides =
/*#__PURE__*/
function (_super) {
  __extends(Guides, _super);

  function Guides() {
    var _this = _super !== null && _super.apply(this, arguments) || this;

    _this.state = {
      guides: []
    };
    _this.scrollPos = 0;
    _this.guideElements = []; // DES2-1606, delay create till drg

    _this.isTrackingCreate = false; // tracking beginning and end of create sequence

    _this.canCreate = false; // signal if mouse out of ruler area

    _this.created = false; // signal if new guide was added

    _this.onDragStart = function (e) {
      var inputEvent = e.inputEvent,
          datas = e.datas;
      if (!datas.fromRuler) addClass(datas.target, DRAGGING);else {
        _this.isTrackingCreate = true; // allow touch create to skip mouseleave logic

        if (inputEvent.type === 'touchstart') _this.canCreate = true;
      }
      inputEvent.stopPropagation();
      inputEvent.preventDefault();
    };

    _this.onMouseLeave = function () {
      if (_this.isTrackingCreate) _this.canCreate = true;
    };

    _this.onDrag = function (e) {
      if (e.datas.fromRuler) {
        if (!_this.canCreate && !_this.created) {
          // do not create till mouseleave the ruler
          return;
        }

        if (_this.canCreate && !_this.created) {
          // DES2-1606, delay create till drg
          addClass(e.datas.target, DRAGGING);

          _this.props.onDragStart(__assign({}, e, {
            dragElement: e.datas.target
          }));

          _this.created = true;
        }
      }

      var nextPos = _this.movePos(e);
      /**
       * When dragging, the drag event is called.
       * @memberof Guides
       * @event drag
       * @param {OnDrag} - Parameters for the drag event
       */


      _this.props.onDrag(__assign({}, e, {
        dragElement: e.datas.target
      }));

      return nextPos;
    };

    _this.cleanupCreate = function () {
      // DES2-1606, delay create till drg
      _this.canCreate = false;
      _this.created = false;
      _this.isTrackingCreate = false;
    };

    _this.onDragEnd = function (e) {
      var datas = e.datas,
          isDouble = e.isDouble,
          distX = e.distX,
          distY = e.distY;

      var pos = _this.movePos(e);

      var guides = _this.state.guides;
      var _a = _this.props,
          onChangeGuides = _a.onChangeGuides,
          zoom = _a.zoom,
          displayDragPos = _a.displayDragPos,
          digit = _a.digit,
          lockGuides = _a.lockGuides;
      var guidePos = parseFloat((pos / zoom).toFixed(digit || 0));

      if (displayDragPos) {
        _this.displayElement.style.cssText += "display: none;";
      }

      removeClass(datas.target, DRAGGING);
      /**
       * When the drag finishes, the dragEnd event is called.
       * @memberof Guides
       * @event dragEnd
       * @param {OnDragEnd} - Parameters for the dragEnd event
       */

      _this.props.onDragEnd(__assign({}, e, {
        dragElement: datas.target
      }));
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
          if (_this.created) {
            if (guidePos < _this.scrollPos) {
              // do not create if dragEnd on the ruler
              _this.cleanupCreate();

              return;
            }

            _this.setState({
              guides: guides.concat([guidePos])
            }, function () {
              onChangeGuides({
                distX: distX,
                distY: distY,
                guides: _this.state.guides,
                isAdd: true,
                isChange: false,
                isRemove: false
              });
            });
          }
        }
      } else {
        var index = datas.target.getAttribute('data-index');
        var isRemove_1 = false;
        var isChange_1 = false;
        guides = guides.slice();
        var deleteOnDblclick = _this.props.deleteOnDblclick && isDouble;

        if (deleteOnDblclick || guidePos < _this.scrollPos) {
          if (lockGuides && (lockGuides === true || lockGuides.indexOf('remove') > -1)) {
            _this.cleanupCreate();

            return;
          }

          guides.splice(index, 1);
          isRemove_1 = true;
        } else if (guides.indexOf(guidePos) > -1) {
          _this.cleanupCreate();

          return;
        } else {
          if (lockGuides && (lockGuides === true || lockGuides.indexOf('change') > -1)) {
            _this.cleanupCreate();

            return;
          }

          guides[index] = guidePos;
          isChange_1 = true;
        }

        _this.setState({
          guides: guides
        }, function () {
          var nextGuides = _this.state.guides;
          onChangeGuides({
            distX: distX,
            distY: distY,
            guides: nextGuides,
            isAdd: false,
            isChange: isChange_1,
            isRemove: isRemove_1
          });
        });
      }

      _this.cleanupCreate();
    };

    return _this;
  }

  var __proto = Guides.prototype;

  __proto.render = function () {
    var _a = this.props,
        className = _a.className,
        guidesColor = _a.guidesColor,
        type = _a.type,
        zoom = _a.zoom,
        style = _a.style,
        rulerStyle = _a.rulerStyle,
        displayDragPos = _a.displayDragPos,
        cspNonce = _a.cspNonce;
    var props = this.props;
    var translateName = this.getTranslateName();
    var rulerProps = {};
    PROPERTIES$1.forEach(function (name) {
      if (name === 'style') {
        return;
      }

      rulerProps[name] = props[name];
    });

    var _b = this.getGuideColorStyle(type, guidesColor),
        draggingGuideStyle = _b.draggingGuideStyle,
        staticGuideStyle = _b.staticGuideStyle;

    return createElement(GuidesElement, {
      className: prefix('manager', type) + " " + className,
      cspNonce: cspNonce,
      ref: ref(this, 'manager'),
      style: style
    }, createElement("div", {
      className: prefix('guide-origin'),
      ref: ref(this, 'originElement')
    }), createElement(Ruler, __assign({
      ref: ref(this, 'ruler'),
      style: rulerStyle
    }, rulerProps)), createElement("div", {
      className: GUIDES,
      ref: ref(this, 'guidesElement'),
      style: {
        transform: translateName + "(" + -this.scrollPos * zoom + "px)"
      }
    }, displayDragPos && createElement("div", {
      className: DISPLAY_DRAG,
      ref: ref(this, 'displayElement'),
      style: {
        color: this.props.guidesColor
      }
    }), createElement("div", {
      className: ADDER,
      ref: ref(this, 'adderElement'),
      style: draggingGuideStyle
    }), this.renderGuides(staticGuideStyle)));
  };

  __proto.getGuideColorStyle = function (type, guidesColor) {
    var guideColorStyle = function (guidesStyle) {
      return type === 'horizontal' ? {
        borderTop: "1px " + guidesStyle + " " + guidesColor
      } : {
        borderLeft: "1px " + guidesStyle + " " + guidesColor
      };
    };

    var draggingGuideStyle = __assign({}, guideColorStyle('solid'));

    var staticGuideStyle = __assign({}, guideColorStyle(this.props.guidesStyle));

    return {
      draggingGuideStyle: draggingGuideStyle,
      staticGuideStyle: staticGuideStyle
    };
  };

  __proto.renderGuides = function (staticGuideStyle) {
    var _this = this;

    var _a = this.props,
        type = _a.type,
        zoom = _a.zoom,
        showGuides = _a.showGuides;
    var translateName = this.getTranslateName();
    var guides = this.state.guides;
    this.guideElements = [];

    if (showGuides) {
      return guides.map(function (pos, i) {
        return createElement("div", {
          className: prefix('guide', type),
          "data-index": i,
          "data-pos": pos,
          key: i,
          ref: refs(_this, 'guideElements', i),
          style: __assign({}, staticGuideStyle, {
            transform: translateName + "(" + pos * zoom + "px) translateZ(0px)"
          })
        });
      });
    }

    return;
  };

  __proto.componentDidMount = function () {
    var _this = this;

    this.manager.getElement().addEventListener('mouseleave', this.onMouseLeave);
    this.gesto = new Gesto(this.manager.getElement(), {
      container: document.body
    }).on('dragStart', function (e) {
      var _a = _this.props,
          type = _a.type,
          zoom = _a.zoom,
          lockGuides = _a.lockGuides;

      if (lockGuides === true) {
        e.stop();
        return;
      }

      var inputEvent = e.inputEvent;
      var target = inputEvent.target;
      var datas = e.datas;
      var canvasElement = _this.ruler.canvasElement;
      var guidesElement = _this.guidesElement;
      var isHorizontal = type === 'horizontal';

      var originRect = _this.originElement.getBoundingClientRect();

      var matrix = getDistElementMatrix(_this.manager.getElement());
      var offsetPos = calculateMatrixDist(matrix, [e.clientX - originRect.left, e.clientY - originRect.top]);
      offsetPos[0] -= guidesElement.offsetLeft;
      offsetPos[1] -= guidesElement.offsetTop;
      offsetPos[isHorizontal ? 1 : 0] += _this.scrollPos * zoom;
      datas.offsetPos = offsetPos;
      datas.matrix = matrix;
      var isLockAdd = lockGuides && lockGuides.indexOf('add') > -1;
      var isLockRemove = lockGuides && lockGuides.indexOf('remove') > -1;
      var isLockChange = lockGuides && lockGuides.indexOf('change') > -1;

      if (target === canvasElement) {
        if (isLockAdd) {
          e.stop();
          return;
        }

        datas.fromRuler = true;
        datas.target = _this.adderElement; // add
      } else if (hasClass(target, GUIDE)) {
        if (isLockRemove && isLockChange) {
          e.stop();
          return;
        }

        datas.target = target; // change
      } else {
        e.stop();
        return false;
      }

      _this.onDragStart(e);
    }).on('drag', this.onDrag).on('dragEnd', this.onDragEnd);
    this.setState({
      guides: this.props.defaultGuides || []
    }); // pass array of guides on mount data to create gridlines or something like that in ui
  };

  __proto.componentWillUnmount = function () {
    this.manager.getElement().removeEventListener('mouseleave', this.onMouseLeave);
    this.gesto.unset();
  };

  __proto.componentDidUpdate = function (prevProps) {
    if (prevProps.defaultGuides !== this.props.defaultGuides) {
      // to dynamically update guides from code rather than dragging guidelines
      this.setState({
        guides: this.props.defaultGuides || []
      });
    }
  };
  /**
   * Load the current guidelines.
   * @memberof Guides
   * @instance
   */


  __proto.loadGuides = function (guides) {
    this.setState({
      guides: guides
    });
  };
  /**
   * Get current guidelines.
   * @memberof Guides
   * @instance
   */


  __proto.getGuides = function () {
    return this.state.guides;
  };
  /**
   * Scroll the positions of the guidelines opposite the ruler.
   * @memberof Guides
   * @instance
   */


  __proto.scrollGuides = function (pos) {
    var zoom = this.props.zoom;
    var guidesElement = this.guidesElement;
    this.scrollPos = pos;
    guidesElement.style.transform = this.getTranslateName() + "(" + -pos * zoom + "px)";
    var guides = this.state.guides;
    this.guideElements.forEach(function (el, i) {
      if (!el) {
        return;
      }

      el.style.display = -pos + guides[i] < 0 ? 'none' : 'block';
    });
  };
  /**
   * Recalculate the size of the ruler.
   * @memberof Guides
   * @instance
   */


  __proto.resize = function () {
    this.ruler.resize();
  };
  /**
   * Scroll the position of the ruler.
   * @memberof Guides
   * @instance
   */


  __proto.scroll = function (pos) {
    this.ruler.scroll(pos);
  };

  __proto.movePos = function (e) {
    var datas = e.datas,
        distX = e.distX,
        distY = e.distY;
    var props = this.props;
    var type = props.type,
        zoom = props.zoom,
        snaps = props.snaps,
        snapThreshold = props.snapThreshold,
        displayDragPos = props.displayDragPos,
        digit = props.digit;

    var dragPosFormat = props.dragPosFormat || function (v) {
      return v;
    };

    var isHorizontal = type === 'horizontal';
    var matrixPos = calculateMatrixDist(datas.matrix, [distX, distY]);
    var offsetPos = datas.offsetPos;
    var offsetX = matrixPos[0] + offsetPos[0];
    var offsetY = matrixPos[1] + offsetPos[1];
    var nextPos = Math.round(isHorizontal ? offsetY : offsetX);
    var guidePos = parseFloat((nextPos / zoom).toFixed(digit || 0));
    var guideSnaps = snaps.slice().sort(function (a, b) {
      return Math.abs(guidePos - a) - Math.abs(guidePos - b);
    });

    if (guideSnaps.length && Math.abs(guideSnaps[0] * zoom - nextPos) < snapThreshold) {
      guidePos = guideSnaps[0];
      nextPos = guidePos * zoom;
    }

    if (displayDragPos) {
      var displayPos = type === 'horizontal' ? [offsetX, nextPos] : [nextPos, offsetY];
      this.displayElement.style.cssText += "display: block;transform: translate(-50%, -50%) translate(" + displayPos.map(function (v) {
        return v + "px";
      }).join(', ') + ")";
      this.displayElement.innerHTML = "" + dragPosFormat(guidePos);
    }

    datas.target.setAttribute('data-pos', guidePos);
    datas.target.style.transform = this.getTranslateName() + "(" + nextPos + "px)";
    return nextPos;
  };

  __proto.getTranslateName = function () {
    return this.props.type === 'horizontal' ? 'translateY' : 'translateX';
  };

  Guides.defaultProps = {
    className: '',
    defaultGuides: [],
    deleteOnDblclick: true,
    digit: 0,
    displayDragPos: false,
    dragPosFormat: function (v) {
      return v;
    },
    guidesColor: '#8f8f8f',
    guidesStyle: 'dashed',
    lockGuides: false,
    onChangeGuides: function () {},
    onDrag: function () {},
    onDragEnd: function () {},
    onDragStart: function () {},
    showGuides: true,
    snapThreshold: 5,
    snaps: [],
    style: {
      height: '100%',
      width: '100%'
    },
    type: 'horizontal',
    zoom: 1
  };
  return Guides;
}(PureComponent);

export default Guides;
export { EVENTS, METHODS, PROPERTIES };
//# sourceMappingURL=guides.esm.js.map
