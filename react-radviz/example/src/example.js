var React = require('react');
var ReactDOM = require('react-dom');
var Radviz = require('react-radviz');

var App = React.createClass({
	render () {
		return (
			<div>
				<Radviz />
			</div>
		);
	}
});

ReactDOM.render(<App />, document.getElementById('app'));
