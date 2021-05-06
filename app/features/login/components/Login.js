// @flow
import { Component } from 'react';
import type { Dispatch } from 'redux';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;

    /**
     * React Router location object.
     */
    location: Object;
};

/**
 * Welcome Component.
 */
class Login extends Component<Props> {

    /**
     * Redirect to the user page before login.
     *
     * @returns {void}
     */
    componentDidMount() {
        if (this.props.location && this.props.location.state !== '/') {
            this.props.dispatch(push('/conference', { room: this.props.location.state.replace('/', '') }));
        } else {
            this.props.dispatch(push('/'));
        }
    }

    /**
     * Render nothing...
     *
     * @returns {string}
     */
    render() {
        return '';
    }
}

export default compose(connect())(Login);
