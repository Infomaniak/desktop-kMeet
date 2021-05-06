// @flow
import { AtlasKitThemeProvider } from '@atlaskit/theme';

import React, { Component } from 'react';
import { Route, Switch } from 'react-router';
import { ConnectedRouter as Router, push, replace } from 'react-router-redux';
import { connect } from 'react-redux';

import { Conference } from '../../conference';
import config from '../../config';
import { history } from '../../router';
import { Welcome } from '../../welcome';
import { Login } from '../../login';
import { createConferenceObjectFromURL } from '../../utils';

/**
 * Main component encapsulating the entire application.
 */
class App extends Component<*> {
    /**
     * Initializes a new {@code App} instance.
     *
     * @inheritdoc
     */
    constructor(props) {
        super(props);

        document.title = config.appName;

        this._listenOnProtocolMessages
            = this._listenOnProtocolMessages.bind(this);
        this._listenOnProtocolHomePage = this._listenOnProtocolHomePage.bind(this);
    }

    /**
     * Implements React's {@link Component#componentDidMount()}.
     *
     * @returns {void}
     */
    componentDidMount() {
        // start listening on this events
        window.jitsiNodeAPI.ipc.on('protocol-data-msg', this._listenOnProtocolMessages);
        window.jitsiNodeAPI.ipc.on('protocol-data-homepage', this._listenOnProtocolHomePage);

        // send notification to main process
        window.jitsiNodeAPI.ipc.send('renderer-ready');
    }

    /**
     * Implements React's {@link Component#componentWillUnmount()}.
     *
     * @returns {void}
     */
    componentWillUnmount() {
        // remove listening for this events
        window.jitsiNodeAPI.ipc.removeListener(
            'protocol-data-msg',
            this._listenOnProtocolMessages
        );
        window.jitsiNodeAPI.ipc.removeListener(
            'protocol-data-homepage',
            this._listenOnProtocolHomePage
        );
    }

    _listenOnProtocolMessages: (*) => void;

    /**
     * Handler when main proccess contact us.
     *
     * @param {Object} event - Message event triggered by .
     * @param {Object} arg - String with room and optionally server url.
     *
     * @returns {void}
     */
    _listenOnProtocolMessages(event, arg) {
        const conference = createConferenceObjectFromURL(arg);

        // Don't navigate if conference couldn't be created
        if (!conference) {
            return;
        }

        // change route when we are notified
        this.props.dispatch(replace('/'));
        this.props.dispatch(push('/conference', conference));
    }

    _listenOnProtocolHomePage: (*) => void;

    /**
     * Handler when main proccess contact us.
     *
     * @param {Object} event - Message event triggered by .
     * @param {Object} arg - String with room and optionally server url.
     *
     * @returns {void}
     */
    _listenOnProtocolHomePage(event, uri) {
        // change route when we are notified
        this.props.dispatch(push('/login', uri));
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        return (
            <AtlasKitThemeProvider mode = 'dark'>
                <Router history = { history }>
                    <Switch>
                        <Route
                            component = { Welcome }
                            exact = { true }
                            path = '/' />
                        <Route
                            component = { Conference }
                            path = '/conference' />
                        <Route
                            component = { Login }
                            path = '/login' />
                    </Switch>
                </Router>
            </AtlasKitThemeProvider>
        );
    }
}

export default connect()(App);
