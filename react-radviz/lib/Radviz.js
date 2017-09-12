'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _numeric = require('numeric');

var _numeric2 = _interopRequireDefault(_numeric);

var _d3Scale = require('d3-scale');

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var RadViz = (function (_Component) {
    _inherits(RadViz, _Component);

    function RadViz(props) {
        _classCallCheck(this, RadViz);

        _get(Object.getPrototypeOf(RadViz.prototype), 'constructor', this).call(this, props);
        this.state = { 'draggingAnchor': false, 'showedData': this.props.showedData, 'selected': [], 'data': undefined, 'nDims': 0 };
        this.startDragSelect = this.startDragSelect.bind(this);
        this.startDragAnchor = this.startDragAnchor.bind(this);
        this.arrangeanchors = this.arrangeanchors.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
        this.dragSVG = this.dragSVG.bind(this);
        this.unselectAllData = this.unselectAllData.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.selectionPoly = [];
        this.pointInPolygon = this.pointInPolygon.bind(this);
        this.startDragAnchorGroup = this.startDragAnchorGroup.bind(this);
        this.startanchorAngles = 0;
    }

    _createClass(RadViz, [{
        key: 'componentWillMount',
        value: function componentWillMount() {
            window.addEventListener('keydown', this.handleKeyDown); //esc key to unselect all data.
            this.preprocessingData(this.props);
        }
    }, {
        key: 'preprocessingData',
        value: function preprocessingData(props) {
            if (props.data) {
                var dimNames = Object.keys(props.data[0]);
                var nDims = dimNames.length;

                // Normalizing columns to [0, 1]
                var normalizedData = [];
                var mins = [];
                var maxs = [];

                for (var j = 0; j < nDims; ++j) {
                    mins.push(props.data[0][dimNames[j]]);
                    maxs.push(props.data[0][dimNames[j]]);
                }

                for (var i = 1; i < props.data.length; ++i) {
                    for (var j = 0; j < nDims; ++j) {
                        if (props.data[i][dimNames[j]] < mins[j]) {
                            mins[j] = props.data[i][dimNames[j]];
                        }
                        if (props.data[i][dimNames[j]] > maxs[j]) {
                            maxs[j] = props.data[i][dimNames[j]];
                        }
                    }
                }

                // computing the denominator of radviz (sums of entries). Also initializing selected array (dots that are selected)
                var denominators = [];
                var selected = [];
                for (var i = 0; i < props.data.length; ++i) {
                    var aux = [];
                    selected.push(false);
                    denominators.push(0);
                    // normalizing data by columns => equal weights to all dimensions (words)
                    var max_entry_by_row = -1;
                    for (var j = 0; j < nDims; ++j) {
                        var val = (props.data[i][dimNames[j]] - mins[j]) / (maxs[j] - mins[j]);
                        aux.push(val);
                        if (val > max_entry_by_row) {
                            max_entry_by_row = val;
                        }
                    }
                    // normalizing data by rows => sigmoid computation (max entry in row must be equal to 1)
                    if (max_entry_by_row > 0) {
                        for (var j = 0; j < nDims; ++j) {
                            aux[j] /= max_entry_by_row;
                            denominators[i] += aux[j] * this.sigmoid(aux[j], props.sigmoid_scale, props.sigmoid_translate);
                        }
                    }
                    normalizedData.push(aux);
                }

                // Computing the anchors
                var anchorAngles = [];

                for (var i = 0; i < nDims; ++i) {
                    anchorAngles.push(i * 2 * Math.PI / nDims);
                }

                this.scaleX = (0, _d3Scale.scaleLinear)().domain([-1, 1]).range([props.marginX / 2, props.width - props.marginX / 2]);
                this.scaleY = (0, _d3Scale.scaleLinear)().domain([-1, 1]).range([props.marginY / 2, props.height - props.marginY / 2]);
                var newState = { 'normalizedData': normalizedData, 'dimNames': dimNames, 'nDims': nDims,
                    'denominators': denominators, 'offsetAnchors': 0, 'sigmoid_scale': props.sigmoid_scale, 'sigmoid_translate': props.sigmoid_translate };

                if (props.selectedSearchText.length > 0) {
                    selected = [];selected = props.selectedSearchText;
                }
                if (!(props.selectedSearchText.length <= 0 && (props.showedData !== this.state.showedData || this.state.selected.length > 0))) {
                    newState['selected'] = selected;
                }
                if (this.state.data !== props.data) {
                    newState['data'] = props.data;newState['anchorAngles'] = anchorAngles;
                }
                this.setState(newState);
            }
        }
    }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
            window.removeEventListener('keydown', this.handleKeyDown);
        }
    }, {
        key: 'componentWillReceiveProps',
        value: function componentWillReceiveProps(props) {
            this.preprocessingData(props);
        }
    }, {
        key: 'anglesToXY',
        value: function anglesToXY(anchorAngle) {
            var radius = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

            var initPoint = [radius, 0];
            var offset = this.state.offsetAnchors;
            var rotMat = [[Math.cos(anchorAngle + offset), -Math.sin(anchorAngle + offset)], [Math.sin(anchorAngle + offset), Math.cos(anchorAngle + offset)]];
            return _numeric2['default'].dot(rotMat, initPoint);
        }
    }, {
        key: 'setColorPoints',
        value: function setColorPoints(i, ret, p0, p1) {
            if (this.props.showedData === 0) {
                ret.push(_react2['default'].createElement('circle', { cx: this.scaleX(p0), cy: this.scaleY(p1), r: 3, key: i, style: { stroke: this.state.selected[i] ? 'black' : 'none', fill: this.props.colors[i], opacity: this.state.selected[i] || !this.state.selected.includes(true) ? 1 : 0.3 } }));
            }
            if (this.props.showedData === 1) {
                if (!this.state.selected[i]) {
                    ret.push(_react2['default'].createElement('circle', { cx: this.scaleX(p0), cy: this.scaleY(p1), r: 3, key: i, style: { stroke: this.state.selected[i] ? 'black' : 'none', fill: this.props.colors[i], opacity: this.state.selected[i] || !this.state.selected.includes(true) ? 1 : 0.3 } }));
                }
            }
            if (this.props.showedData === 2 && this.state.selected[i]) {
                ret.push(_react2['default'].createElement('circle', { cx: this.scaleX(p0), cy: this.scaleY(p1), r: 3, key: i, style: { stroke: this.state.selected[i] ? 'black' : 'none', fill: this.props.colors[i], opacity: this.state.selected[i] || !this.state.selected.includes(true) ? 1 : 0.3 } }));
            }
            return ret;
        }
    }, {
        key: 'radvizMapping',
        value: function radvizMapping(data, anchors) {
            this.currentMapping = [];
            var ret = [];
            for (var i = 0; i < data.length; ++i) {
                var p = [0, 0];
                for (var j = 0; j < anchors.length; ++j) {
                    var s = this.sigmoid(data[i][j], this.state.sigmoid_scale, this.state.sigmoid_translate);
                    p[0] += anchors[j][0] * data[i][j] / this.state.denominators[i] * s;
                    p[1] += anchors[j][1] * data[i][j] / this.state.denominators[i] * s;
                }
                if (isNaN(p[0])) p[0] = 0; //when all dimension values were zero.
                if (isNaN(p[1])) p[1] = 0; //When all dimension values were zero
                this.currentMapping.push(p);
                if (this.props.projection == 'Model Result') {
                    if (this.props.modelResult[i] !== 'trainData') {
                        ret = this.setColorPoints(i, ret, p[0], p[1]);
                    }
                } else {
                    ret = this.setColorPoints(i, ret, p[0], p[1]);
                }
            }
            return ret;
        }
    }, {
        key: 'setSelectedAnchors',
        value: function setSelectedAnchors(data) {
            var selectedAnchors = [];
            for (var j = 0; j < this.state.dimNames.length; ++j) {
                for (var i = 0; i < data.length; ++i) {
                    if (data[i][j] > 0 && this.state.selected[i]) {
                        selectedAnchors[this.state.dimNames[j]] = true;break;
                    } else selectedAnchors[this.state.dimNames[j]] = false;
                }
            }
            return selectedAnchors;
        }
    }, {
        key: 'stopDrag',
        value: function stopDrag(e) {
            if (this.state.draggingSelection) {
                if (this.selectionPoly.length > 0) {
                    var selected = [];
                    for (var i = 0; i < this.props.data.length; ++i) {
                        var tempSelected = this.pointInPolygon(this.currentMapping[i], this.selectionPoly);
                        if (this.props.projection == 'Model Result') {
                            if (this.props.modelResult[i] !== 'trainData') {
                                if (tempSelected && this.props.showedData === 2 && !this.state.selected[i]) tempSelected = !tempSelected;
                            } else tempSelected = false;
                        } else {
                            if (tempSelected && this.props.showedData === 2 && !this.state.selected[i]) tempSelected = !tempSelected;
                        }
                        selected.push(tempSelected);
                    }
                    this.selectionPoly = [];
                    this.setState({ 'draggingSelection': false, 'selected': selected });
                    this.props.callbackSelection(selected);
                    this.props.setSelectedPoints(selected);
                }
            }
            if (this.state.draggingAnchorGroup) {
                var anchorAngles = this.state.anchorAngles.slice();
                for (var i = 0; i < anchorAngles.length; ++i) {
                    anchorAngles[i] += this.state.offsetAnchors;
                }
                this.setState({ 'draggingAnchorGroup': false, 'startAnchorGroupAngle': 0, 'anchorAngles': anchorAngles, 'offsetAnchors': 0 });
            }
            if (this.state.draggingAnchor) {
                this.setState({ 'draggingAnchor': false });
            }
        }
    }, {
        key: 'startDragAnchor',
        value: function startDragAnchor(i) {
            return (function (e) {
                var container = (0, _jquery2['default'])('#svg_radviz').get(0).getBoundingClientRect();
                var mouse = [e.nativeEvent.clientX - container.left, e.nativeEvent.clientY - container.top];

                var center = [this.props.width / 2, this.props.height / 2];
                var vec = [mouse[0] - center[0], mouse[1] - center[1]];
                var normVec = _numeric2['default'].norm2(vec);
                vec[0] /= normVec;
                vec[1] /= normVec;
                // Computing the angle by making a dot product with the [1,0] vector
                var cosAngle = vec[0];
                var angle = Math.acos(cosAngle);
                if (mouse[1] < center[1]) {
                    angle *= -1;
                }
                this.setState({ 'draggingAnchor': true, 'draggingAnchor_anchor_id': i, 'startanchorAngles': angle });
                e.stopPropagation();
            }).bind(this);
        }
    }, {
        key: 'pointInPolygon',
        value: function pointInPolygon(point, polygon) {
            polygon.push(polygon[0]);
            var inside = false;
            for (var n = polygon.length, i = 0, j = n - 1, x = point[0], y = point[1]; i < n; j = i++) {
                var xi = this.scaleX.invert(polygon[i][0]),
                    yi = this.scaleY.invert(polygon[i][1]),
                    xj = this.scaleX.invert(polygon[j][0]),
                    yj = this.scaleY.invert(polygon[j][1]);
                var intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
                if (intersect) inside = !inside;
            }
            return inside;
        }
    }, {
        key: 'dragSVG',
        value: function dragSVG(e) {

            var container = (0, _jquery2['default'])('#svg_radviz').get(0).getBoundingClientRect();
            var mouse = [e.nativeEvent.clientX - container.left, e.nativeEvent.clientY - container.top];
            if (this.state.draggingAnchor) {
                var center = [this.props.width / 2, this.props.height / 2];
                var vec = [mouse[0] - center[0], mouse[1] - center[1]];
                var normVec = _numeric2['default'].norm2(vec);
                vec[0] /= normVec;
                vec[1] /= normVec;
                // Computing the angle by making a dot product with the [1,0] vector
                var cosAngle = vec[0];
                var angle = Math.acos(cosAngle);
                if (mouse[1] < center[1]) {
                    angle *= -1;
                }
                var newAnchorAngles = this.state.anchorAngles.slice();
                newAnchorAngles[this.state.draggingAnchor_anchor_id] = angle;
                this.setState({ 'anchorAngles': newAnchorAngles });
            } else if (this.state.draggingSelection) {
                this.selectionPoly.push(mouse);
                this.setState(this.state);
            } else if (this.state.draggingAnchorGroup) {
                var center = [this.props.width / 2, this.props.height / 2];
                var vec = [mouse[0] - center[0], mouse[1] - center[1]];
                var normVec = _numeric2['default'].norm2(vec);
                vec[0] /= normVec;
                vec[1] /= normVec;
                // Computing the angle by making a dot product with the [1,0] vector
                var cosAngle = vec[0];
                var angle = Math.acos(cosAngle);
                if (mouse[1] < center[1]) {
                    angle *= -1;
                }
                var angleDifference = angle - this.state.startAnchorGroupAngle;
                this.setState({ 'offsetAnchors': angleDifference });
            }
        }
    }, {
        key: 'sigmoid',
        value: function sigmoid(x, scale, translate) {
            return 1 / (1 + Math.exp(-(scale * (x + translate))));
        }
    }, {
        key: 'svgPoly',
        value: function svgPoly(points) {

            if (points && points.length > 0) {
                var pointsStr = '';
                for (var i = 0; i < points.length; ++i) {
                    pointsStr = pointsStr + points[i][0] + ',' + points[i][1] + ' ';
                }
                return _react2['default'].createElement('polygon', { points: pointsStr, style: { fill: 'rgba(0,75,100,0.4)', stroke: 'none', strokeWidth: 1 } });
            } else {
                return;
            }
        }
    }, {
        key: 'startDragSelect',
        value: function startDragSelect(e) {
            this.setState({ 'draggingSelection': true });
            this.selectionPoly = [];
        }
    }, {
        key: 'unselectAllData',
        value: function unselectAllData(e) {
            var selected = [];
            for (var i = 0; i < this.props.data.length; ++i) {
                selected.push(false);
            }
            this.setState({ 'draggingSelection': false, 'selected': selected });
            this.props.setSelectedPoints(selected);
        }
    }, {
        key: 'handleKeyDown',
        value: function handleKeyDown(e) {
            if (e.keyCode === 27) {
                this.unselectAllData(e);
            }
        }
    }, {
        key: 'startDragAnchorGroup',
        value: function startDragAnchorGroup(e) {
            var container = (0, _jquery2['default'])('#svg_radviz').get(0).getBoundingClientRect();
            var mouse = [e.nativeEvent.clientX - container.left, e.nativeEvent.clientY - container.top];
            var center = [this.props.width / 2, this.props.height / 2];
            var vec = [mouse[0] - center[0], mouse[1] - center[1]];
            var normVec = _numeric2['default'].norm2(vec);
            vec[0] /= normVec;
            vec[1] /= normVec;
            // Computing the angle by making a dot product with the [1,0] vector
            var cosAngle = vec[0];
            var angle = Math.acos(cosAngle);
            if (mouse[1] < center[1]) {
                angle *= -1;
            }
            e.stopPropagation();
            this.setState({ 'draggingAnchorGroup': true, 'startAnchorGroupAngle': angle });
        }
    }, {
        key: 'normalizeAngle',
        value: function normalizeAngle(angle) {
            return Math.atan2(Math.sin(angle), Math.cos(angle));
        }
    }, {
        key: 'arrangeanchors',
        value: function arrangeanchors(e) {
            var container = (0, _jquery2['default'])('#svg_radviz').get(0).getBoundingClientRect();
            var mouse = [e.nativeEvent.clientX - container.left, e.nativeEvent.clientY - container.top];
            if (this.state.draggingAnchor) {
                var center = [this.props.width / 2, this.props.height / 2];
                var vec = [mouse[0] - center[0], mouse[1] - center[1]];
                var normVec = _numeric2['default'].norm2(vec);
                vec[0] /= normVec;
                vec[1] /= normVec;
                // Computing the angle by making a dot product with the [1,0] vector
                var cosAngle = vec[0];
                var angle = Math.acos(cosAngle);
                if (mouse[1] < center[1]) {
                    angle *= -1;
                }
                var newAnchorAngles = this.state.anchorAngles.slice();
                var angleDifference = angle - this.state.startanchorAngles;
                newAnchorAngles[this.state.draggingAnchor_anchor_id] = angle;
                //    console.log(newAnchorAngles.length);
                //  newAnchorAngles[this.state.draggingAnchor_anchor_id+1]= newAnchorAngles[this.state.draggingAnchor_anchor_id+1]+0.03;
                //      this.setState({'anchorAngles':newAnchorAngles});
                //console.log(angleDifference);
            }
        }
    }, {
        key: 'arrange',
        value: function arrange(props) {

            var argsort = function argsort(x1) {
                var x2 = x1.map(function (d, i) {
                    return [d, i];
                });
                var x2sorted = x2.sort(function (a, b) {
                    return a[0] - b[0];
                });
                return x2sorted.map(function (d) {
                    return d[1];
                });
            };
            //console.log(argsort(this.state.anchorAngles));
            var newAnchorAngles1 = [];
            for (var i = 0; i < this.state.anchorAngles.length; ++i) {
                console.log(argsort(this.state.anchorAngles)[i]);
                newAnchorAngles1.push(argsort(this.state.anchorAngles)[i] * 2 * Math.PI / this.state.anchorAngles.length);
            }
            //console.log(newAnchorAngles1);
            this.setState({ 'anchorAngles': newAnchorAngles1 });
        }
    }, {
        key: 'render',
        value: function render() {
            console.log('rendering radViz');
            var sampleDots = [];
            var anchorDots = [];
            var anchorText = [];
            var selectedAnchors = [];
            if (this.props.data) {
                var anchorXY = [];
                for (var i = 0; i < this.state.nDims; ++i) {
                    anchorXY.push(this.anglesToXY(this.state.anchorAngles[i], 1));
                }

                selectedAnchors = this.setSelectedAnchors(this.state.normalizedData);
                for (var i = 0; i < this.state.nDims; ++i) {

                    anchorDots.push(_react2['default'].createElement('circle', { cx: this.scaleX(anchorXY[i][0]), cy: this.scaleX(anchorXY[i][1]), r: 5,
                        key: i, style: { cursor: 'hand', stroke: this.state.selected[i] ? 'black' : 'none', fill: selectedAnchors[this.state.dimNames[i]] ? 'black' : 'black', opacity: selectedAnchors[this.state.dimNames[i]] || !this.state.selected.includes(true) ? 1 : 0.3 } }));

                    var normalizedAngle = this.normalizeAngle(this.state.anchorAngles[i] + this.state.offsetAnchors);

                    if (Math.abs(normalizedAngle) < Math.PI / 2) {
                        anchorText.push(_react2['default'].createElement(
                            'g',
                            { transform: 'translate(' + this.scaleX(anchorXY[i][0] * 1.06) + ', ' + this.scaleX(anchorXY[i][1] * 1.06) + ')', key: i },
                            _react2['default'].createElement(
                                'text',
                                { textAnchor: 'start', x: 0, y: 0, onMouseDown: this.startDragAnchor(i), onMouseUp: this.arrange.bind(this), transform: 'rotate(' + normalizedAngle * 180 / Math.PI + ')', style: { fill: selectedAnchors[this.state.dimNames[i]] ? 'black' : 'black', opacity: selectedAnchors[this.state.dimNames[i]] || !this.state.selected.includes(true) ? 1 : 0.3 } },
                                this.state.dimNames[i]
                            )
                        ));
                    } else {
                        anchorText.push(_react2['default'].createElement(
                            'g',
                            { transform: 'translate(' + this.scaleX(anchorXY[i][0] * 1.06) + ', ' + this.scaleX(anchorXY[i][1] * 1.06) + ')', key: i },
                            _react2['default'].createElement(
                                'text',
                                { textAnchor: 'end', x: 0, y: 7, onMouseDown: this.startDragAnchor(i), onMouseUp: this.arrange.bind(this), transform: 'rotate(' + normalizedAngle * 180 / Math.PI + ') rotate(180)', style: { fill: selectedAnchors[this.state.dimNames[i]] ? 'black' : 'black', opacity: selectedAnchors[this.state.dimNames[i]] || !this.state.selected.includes(true) ? 1 : 0.3 } },
                                this.state.dimNames[i]
                            )
                        ));
                    }
                }

                sampleDots = this.radvizMapping(this.state.normalizedData, anchorXY);
            }
            return _react2['default'].createElement(
                'svg',
                { id: 'svg_radviz', style: { cursor: this.state.draggingAnchor || this.state.draggingAnchorGroup ? 'hand' : 'default', width: this.props.width, height: this.props.height, MozUserSelect: 'none', WebkitUserSelect: 'none', msUserSelect: 'none' },
                    onMouseMove: this.dragSVG, onMouseUp: this.stopDrag, onMouseDown: this.startDragSelect, onDoubleClick: this.unselectAllData, onClick: this.unselectAllData, onKeyDown: this.handleKeyDown },
                _react2['default'].createElement('ellipse', { cx: this.props.width / 2, cy: this.props.height / 2, rx: (this.props.width - this.props.marginX) / 2, ry: (this.props.height - this.props.marginY) / 2,
                    style: { stroke: 'aquamarine', fill: 'none', strokeWidth: 5, cursor: 'hand' }, onMouseDown: this.startDragAnchorGroup }),
                sampleDots,
                this.svgPoly(this.selectionPoly),
                anchorText,
                anchorDots
            );
        }
    }]);

    return RadViz;
})(_react.Component);

RadViz.defaultProps = {
    width: 700,
    height: 700,
    marginX: 200,
    marginY: 200,
    sigmoid_translate: 0,
    sigmoid_scale: 1,
    colors: ['red', 'green', 'blue'],
    callbackSelection: function callbackSelection(selected) {}
};

exports['default'] = RadViz;

//{sampleDots}
//{this.svgPoly(this.selectionPoly)}
//{anchorText}
module.exports = exports['default'];