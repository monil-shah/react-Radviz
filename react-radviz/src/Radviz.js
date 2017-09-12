import React, { Component } from 'react';
import numeric from 'numeric';
import {scaleLinear} from 'd3-scale';
import $ from 'jquery';

class RadViz extends Component {

    constructor(props){
        super(props);
        this.state={'draggingAnchor':false, 'showedData': this.props.showedData, 'selected':[], 'data': undefined,'nDims': 0 };
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
    componentWillMount(){
      window.addEventListener('keydown', this.handleKeyDown);//esc key to unselect all data.
      this.preprocessingData(this.props);
    }

    preprocessingData(props){
      if (props.data ){
          let dimNames = Object.keys(props.data[0]);
          let nDims = dimNames.length;

          // Normalizing columns to [0, 1]
          let normalizedData = [];
          let mins = [];
          let maxs = [];

          for (let j = 0; j < nDims; ++j){
              mins.push(props.data[0][dimNames[j]]);
              maxs.push(props.data[0][dimNames[j]]);
          }

          for (let i = 1; i < props.data.length; ++i){
              for (let j = 0; j < nDims; ++j){
                  if (props.data[i][dimNames[j]] < mins[j]){
                      mins[j] = props.data[i][dimNames[j]];
                  }
                  if (props.data[i][dimNames[j]] > maxs[j]){
                      maxs[j] = props.data[i][dimNames[j]];
                  }
              }
          }

          // computing the denominator of radviz (sums of entries). Also initializing selected array (dots that are selected)
          let denominators = [];
          let selected = [];
          for (let i = 0; i < props.data.length; ++i){
              let aux = [];
            selected.push(false);
              denominators.push(0);
              // normalizing data by columns => equal weights to all dimensions (words)
              let max_entry_by_row = -1;
              for (let j = 0; j < nDims; ++j){
                  let val = (props.data[i][dimNames[j]] - mins[j])/(maxs[j] - mins[j]);
                  aux.push(val);
                  if (val > max_entry_by_row){
                      max_entry_by_row = val;
                  }
              }
              // normalizing data by rows => sigmoid computation (max entry in row must be equal to 1)
              if (max_entry_by_row > 0){
                  for (let j = 0; j < nDims; ++j){
                      aux[j] /= max_entry_by_row;
                      denominators[i] += aux[j] * this.sigmoid(aux[j], props.sigmoid_scale, props.sigmoid_translate);
                  }
              }
              normalizedData.push(aux);
          }

          // Computing the anchors
          let anchorAngles = [];

          for (let i = 0; i < nDims; ++i){
              anchorAngles.push(i * 2*Math.PI / nDims);
          }

          this.scaleX = scaleLinear().domain([-1,1]).range([props.marginX/2, props.width-props.marginX/2]);
          this.scaleY = scaleLinear().domain([-1,1]).range([props.marginY/2, props.height - props.marginY/2]);
          let newState = {'normalizedData':normalizedData, 'dimNames':dimNames, 'nDims':nDims,
                          'denominators':denominators, 'offsetAnchors':0, 'sigmoid_scale':props.sigmoid_scale, 'sigmoid_translate':props.sigmoid_translate};

          if(props.selectedSearchText.length>0) {selected = []; selected=props.selectedSearchText;}
          if(!(props.selectedSearchText.length<=0 && (props.showedData!==this.state.showedData || this.state.selected.length>0))){
            newState['selected'] = selected;
          }
          if(this.state.data !== props.data) {newState['data'] = props.data; newState['anchorAngles'] = anchorAngles;}
          this.setState(newState);

      }
    }

    componentWillUnmount(){
      window.removeEventListener('keydown', this.handleKeyDown);
    }

    componentWillReceiveProps(props){
        this.preprocessingData(props);
    }

    anglesToXY(anchorAngle, radius=1){
        let initPoint = [radius, 0];
        let offset = this.state.offsetAnchors;
        let rotMat = [[Math.cos(anchorAngle+offset), -Math.sin(anchorAngle+offset)], [Math.sin(anchorAngle+offset), Math.cos(anchorAngle+offset)]];
        return (numeric.dot(rotMat,initPoint));
    }

    setColorPoints(i, ret, p0, p1){
      if(this.props.showedData===0){
          ret.push(<circle cx={this.scaleX(p0)} cy={this.scaleY(p1)} r={3} key={i} style={{stroke:(this.state.selected[i]?'black':'none'),fill:this.props.colors[i], opacity:((this.state.selected[i]||(!(this.state.selected.includes(true))))?1:0.3),}}/>);
      }
      if(this.props.showedData===1){
        if(!this.state.selected[i]){
          ret.push(<circle cx={this.scaleX(p0)} cy={this.scaleY(p1)} r={3} key={i} style={{stroke:(this.state.selected[i]?'black':'none'),fill:this.props.colors[i], opacity:((this.state.selected[i]||(!(this.state.selected.includes(true))))?1:0.3),}}/>);
      }}
      if(this.props.showedData===2 && this.state.selected[i]){
          ret.push(<circle cx={this.scaleX(p0)} cy={this.scaleY(p1)} r={3} key={i} style={{stroke:(this.state.selected[i]?'black':'none'),fill:this.props.colors[i], opacity:((this.state.selected[i]||(!(this.state.selected.includes(true))))?1:0.3),}}/>);
      }
      return ret;
    }

    radvizMapping(data, anchors){
      	this.currentMapping = [];
          let ret = [];
          for (let i = 0; i < data.length; ++i){
            let p = [0,0];
            for (let j = 0; j < anchors.length;++j){
                let s = this.sigmoid(data[i][j], this.state.sigmoid_scale, this.state.sigmoid_translate);
                p[0] += anchors[j][0]*data[i][j]/this.state.denominators[i] * s;
                p[1] += anchors[j][1]*data[i][j]/this.state.denominators[i] * s;
            }
            if(isNaN(p[0])) p[0]=0;//when all dimension values were zero.
            if(isNaN(p[1])) p[1]=0;//When all dimension values were zero
            this.currentMapping.push(p);
            if(this.props.projection == 'Model Result'){
              if(this.props.modelResult[i]!=='trainData'){
                ret = this.setColorPoints(i, ret, p[0], p[1]);
              }
            }
            else{
              ret = this.setColorPoints(i, ret, p[0], p[1]);
            }

          }
          return ret;
    }

    setSelectedAnchors(data){
          let selectedAnchors = [];
          for (let j = 0; j < this.state.dimNames.length;++j){
            for (let i = 0; i < data.length; ++i){
                if(data[i][j]>0 && this.state.selected[i] ){
                  selectedAnchors[this.state.dimNames[j]]=true; break;
                }
                else selectedAnchors[this.state.dimNames[j]]=false;
            }
          }
          return selectedAnchors;
    }

    stopDrag(e){
    	if (this.state.draggingSelection){
            if (this.selectionPoly.length > 0){
        		let selected = [];
        		for (let i = 0; i < this.props.data.length; ++i){
              var tempSelected = this.pointInPolygon(this.currentMapping[i], this.selectionPoly);
              if(this.props.projection == 'Model Result'){
                if(this.props.modelResult[i]!=='trainData'){
                  if(tempSelected && (this.props.showedData===2 && !(this.state.selected[i]))) tempSelected = !tempSelected;
                }
                else tempSelected = false;
              }
              else{
                if(tempSelected && (this.props.showedData===2 && !(this.state.selected[i]))) tempSelected = !tempSelected;
              }
              selected.push(tempSelected);
        		}
        		this.selectionPoly= [];
        		this.setState({'draggingSelection':false, 'selected':selected});
        		this.props.callbackSelection(selected);
            this.props.setSelectedPoints(selected);
            }

    	}
    	if (this.state.draggingAnchorGroup){
    		let anchorAngles = this.state.anchorAngles.slice();
    		for (let i = 0; i < anchorAngles.length; ++i){
    			anchorAngles[i] += this.state.offsetAnchors;
    		}
    		this.setState({'draggingAnchorGroup':false, 'startAnchorGroupAngle':0, 'anchorAngles':anchorAngles, 'offsetAnchors':0});
    	}
    	if (this.state.draggingAnchor){
    		this.setState({'draggingAnchor':false});
    	}
    }

    startDragAnchor(i){
        return function(e){
          let container = $('#svg_radviz').get(0).getBoundingClientRect();
          let mouse = [e.nativeEvent.clientX - container.left, e.nativeEvent.clientY - container.top];

              let center=[this.props.width/2, this.props.height/2];
              let vec=[mouse[0] - center[0], mouse[1]-center[1]];
              let normVec=numeric.norm2(vec);
              vec[0] /= normVec;
              vec[1] /= normVec;
              // Computing the angle by making a dot product with the [1,0] vector
              let cosAngle = vec[0];
              let angle = Math.acos(cosAngle);
              if (mouse[1] < center[1])
                  {angle *= -1;}
            this.setState({'draggingAnchor':true, 'draggingAnchor_anchor_id':i,'startanchorAngles':angle});
            e.stopPropagation();

    }.bind(this);
  }

    pointInPolygon(point, polygon){
        polygon.push(polygon[0]);
    	let inside = false;
    	for (let n = polygon.length, i = 0, j = n-1, x = point[0], y = point[1]; i < n; j = i++){
    		let xi = this.scaleX.invert(polygon[i][0]), yi = this.scaleY.invert(polygon[i][1]),
    		    xj = this.scaleX.invert(polygon[j][0]), yj = this.scaleY.invert(polygon[j][1]);
        var intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    	}
    	return inside;
    }

    dragSVG(e){

        let container = $('#svg_radviz').get(0).getBoundingClientRect();
        let mouse = [e.nativeEvent.clientX - container.left, e.nativeEvent.clientY - container.top];
        if (this.state.draggingAnchor){
            let center=[this.props.width/2, this.props.height/2];
            let vec=[mouse[0] - center[0], mouse[1]-center[1]];
            let normVec=numeric.norm2(vec);
            vec[0] /= normVec;
            vec[1] /= normVec;
            // Computing the angle by making a dot product with the [1,0] vector
            let cosAngle = vec[0];
            let angle = Math.acos(cosAngle);
            if (mouse[1] < center[1])
                {angle *= -1;}
            let newAnchorAngles = this.state.anchorAngles.slice();
            newAnchorAngles[this.state.draggingAnchor_anchor_id] = angle;
            this.setState({'anchorAngles':newAnchorAngles});
        }else if(this.state.draggingSelection){
            this.selectionPoly.push(mouse);
            this.setState(this.state);
        }else if(this.state.draggingAnchorGroup){
	        let center=[this.props.width/2, this.props.height/2];
	        let vec=[mouse[0] - center[0], mouse[1]-center[1]];
	        let normVec=numeric.norm2(vec);
	        vec[0] /= normVec;
	        vec[1] /= normVec;
	        // Computing the angle by making a dot product with the [1,0] vector
	        let cosAngle = vec[0];
	        let angle = Math.acos(cosAngle);
	        if (mouse[1] < center[1])
	            {angle *= -1;}
	        let angleDifference = angle - this.state.startAnchorGroupAngle;
	        this.setState({'offsetAnchors':angleDifference});
        }
    }

    sigmoid(x, scale, translate){
        return (1/(1+Math.exp(-(scale*(x + translate)))));
    }

    svgPoly(points){

        if (points && points.length > 0){
            let pointsStr = '';
            for (let i = 0; i < points.length; ++i){
                pointsStr = pointsStr + points[i][0] + ',' + points[i][1] + ' ';
            }
            return (<polygon points={pointsStr} style={{fill:'rgba(0,75,100,0.4)',stroke:'none',strokeWidth:1}}/> );
        }else{
            return ;
        }
    }

    startDragSelect(e){
        this.setState({'draggingSelection':true});
            this.selectionPoly = [];
    }

    unselectAllData(e){
      let selected = [];
      for (let i = 0; i < this.props.data.length; ++i){
        selected.push(false);
      }
      this.setState({'draggingSelection':false, 'selected':selected});
      this.props.setSelectedPoints(selected);
    }
    handleKeyDown(e){
      if (e.keyCode === 27){
        this.unselectAllData(e);
      }
    }

    startDragAnchorGroup(e){
    	let container = $('#svg_radviz').get(0).getBoundingClientRect();
        let mouse = [e.nativeEvent.clientX - container.left, e.nativeEvent.clientY - container.top];
        let center=[this.props.width/2, this.props.height/2];
        let vec=[mouse[0] - center[0], mouse[1]-center[1]];
        let normVec=numeric.norm2(vec);
        vec[0] /= normVec;
        vec[1] /= normVec;
        // Computing the angle by making a dot product with the [1,0] vector
        let cosAngle = vec[0];
        let angle = Math.acos(cosAngle);
        if (mouse[1] < center[1])
            {angle *= -1;}
        e.stopPropagation();
    	this.setState({'draggingAnchorGroup':true, 'startAnchorGroupAngle':angle});
    }

    normalizeAngle(angle) {
      return Math.atan2(Math.sin(angle), Math.cos(angle));
    }
    arrangeanchors(e){
      let container = $('#svg_radviz').get(0).getBoundingClientRect();
      let mouse = [e.nativeEvent.clientX - container.left, e.nativeEvent.clientY - container.top];
      if (this.state.draggingAnchor){
          let center=[this.props.width/2, this.props.height/2];
          let vec=[mouse[0] - center[0], mouse[1]-center[1]];
          let normVec=numeric.norm2(vec);
          vec[0] /= normVec;
          vec[1] /= normVec;
          // Computing the angle by making a dot product with the [1,0] vector
          let cosAngle = vec[0];
          let angle = Math.acos(cosAngle);
          if (mouse[1] < center[1])
              {angle *= -1;}
          let newAnchorAngles = this.state.anchorAngles.slice();
          let angleDifference = angle - this.state.startanchorAngles;
          newAnchorAngles[this.state.draggingAnchor_anchor_id] = angle;
      //    console.log(newAnchorAngles.length);
      //  newAnchorAngles[this.state.draggingAnchor_anchor_id+1]= newAnchorAngles[this.state.draggingAnchor_anchor_id+1]+0.03;
  //      this.setState({'anchorAngles':newAnchorAngles});
      //console.log(angleDifference);
    }

}
  arrange(props){


    let argsort=(x1)=>{
	     let x2 = x1.map((d,i)=>[d,i]);
	     let x2sorted = x2.sort((a,b)=>a[0]-b[0]);
	     return x2sorted.map(d=>d[1]);
};
//console.log(argsort(this.state.anchorAngles));
let newAnchorAngles1=[];
for (let i = 0; i < this.state.anchorAngles.length; ++i){
    console.log(argsort(this.state.anchorAngles)[i]);
    newAnchorAngles1.push(argsort(this.state.anchorAngles)[i] * 2*Math.PI / this.state.anchorAngles.length);
}
//console.log(newAnchorAngles1);
  this.setState({'anchorAngles':newAnchorAngles1});

}
    render() {
        console.log('rendering radViz');
        let sampleDots = [];
        let anchorDots = [];
        let anchorText = [];
        let selectedAnchors = [];
        if (this.props.data){
            let anchorXY = [];
            for (let i = 0; i < this.state.nDims; ++i)
                {anchorXY.push(this.anglesToXY(this.state.anchorAngles[i], 1));}

            selectedAnchors = this.setSelectedAnchors(this.state.normalizedData);
            for (let i = 0; i < this.state.nDims; ++i){

                anchorDots.push(<circle cx={this.scaleX(anchorXY[i][0])} cy={this.scaleX(anchorXY[i][1])} r={5}
                        key={i} style={{cursor:'hand', stroke:(this.state.selected[i]?'black':'none'), fill:(selectedAnchors[this.state.dimNames[i]]?'black':'black'), opacity:((selectedAnchors[this.state.dimNames[i]]||(!(this.state.selected.includes(true))))?1:0.3),}}/>);

                let normalizedAngle = this.normalizeAngle(this.state.anchorAngles[i] + this.state.offsetAnchors);

                if (Math.abs(normalizedAngle) < Math.PI/2){
                  anchorText.push(
                            <g transform={`translate(${this.scaleX(anchorXY[i][0]*1.06)}, ${this.scaleX(anchorXY[i][1]*1.06)})`} key={i}>
                            <text textAnchor='start' x={0} y={0} onMouseDown={this.startDragAnchor(i)} onMouseUp={this.arrange.bind(this)}  transform={`rotate(${(normalizedAngle)*180/Math.PI})`} style={{fill:(selectedAnchors[this.state.dimNames[i]]?'black':'black'), opacity:((selectedAnchors[this.state.dimNames[i]]||(!(this.state.selected.includes(true))))?1:0.3),}}>{this.state.dimNames[i]}</text>
                            </g>);
                }else{
                  anchorText.push(
                            <g transform={`translate(${this.scaleX(anchorXY[i][0]*1.06)}, ${this.scaleX(anchorXY[i][1]*1.06)})`} key={i}>
                            <text textAnchor='end' x={0} y={7} onMouseDown={this.startDragAnchor(i)}   onMouseUp={this.arrange.bind(this)}  transform={`rotate(${(normalizedAngle)*180/Math.PI}) rotate(180)`} style={{fill:(selectedAnchors[this.state.dimNames[i]]?'black':'black'), opacity:((selectedAnchors[this.state.dimNames[i]]||(!(this.state.selected.includes(true))))?1:0.3),}}>{this.state.dimNames[i]}</text>
                            </g>);
                }
            }

              sampleDots = this.radvizMapping(this.state.normalizedData, anchorXY);
        }
        return (
                <svg  id={'svg_radviz'}  style={{cursor:((this.state.draggingAnchor || this.state.draggingAnchorGroup)?'hand':'default'), width:this.props.width, height:this.props.height, MozUserSelect:'none', WebkitUserSelect:'none', msUserSelect:'none'}}
                onMouseMove={this.dragSVG} onMouseUp={this.stopDrag} onMouseDown={this.startDragSelect} onDoubleClick = {this.unselectAllData} onClick={this.unselectAllData}  onKeyDown={this.handleKeyDown}>
	                <ellipse cx={this.props.width/2} cy={this.props.height/2} rx={(this.props.width-this.props.marginX)/2} ry={(this.props.height - this.props.marginY)/2}
                  style={{stroke:'aquamarine',fill:'none', strokeWidth:5, cursor:'hand'}} onMouseDown={this.startDragAnchorGroup}/>
                  {sampleDots}
                  {this.svgPoly(this.selectionPoly)}
                  {anchorText}
	                {anchorDots}
                </svg>
               );
    }
}

RadViz.defaultProps = {
	width:700,
	height:700,
	marginX:200,
	marginY:200,
    sigmoid_translate:0,
    sigmoid_scale:1,
	colors:['red','green','blue'],
	callbackSelection:function(selected){}
};

export default RadViz;
//{sampleDots}
//{this.svgPoly(this.selectionPoly)}
//{anchorText}
