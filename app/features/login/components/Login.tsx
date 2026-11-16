import { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { Dispatch, compose } from 'redux';

interface IProps {
    dispatch: Dispatch;
    location: {
        state: any;
    };
}

class Login extends Component<IProps> {
    componentDidMount() {
        if (this.props.location && this.props.location.state !== '/') {
            this.props.dispatch(push('/conference', { room: this.props.location.state.replace('/', '') }));
        } else {
            this.props.dispatch(push('/'));
        }
    }

    render() {
        return null;
    }
}

export default compose(connect())(Login) as React.ComponentType<any>;
