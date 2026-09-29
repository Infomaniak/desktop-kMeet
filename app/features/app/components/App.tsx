import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router';
import { ConnectedRouter as Router, push } from 'react-router-redux';
import { Dispatch } from 'redux';

import { Conference } from '../../conference';
import config from '../../config';
import { Login } from '../../login';
import { history } from '../../router';
import { createConferenceObjectFromURL } from '../../utils';
import { Welcome } from '../../welcome';

interface IProps {
    dispatch: Dispatch;
}

class App extends Component<IProps> {
    _unsubscribeProtocol: Array<() => void> = [];

    constructor(props: IProps) {
        super(props);

        document.title = config.appName;

        this._listenOnProtocolMessages
            = this._listenOnProtocolMessages.bind(this);
        this._listenOnProtocolHomePage = this._listenOnProtocolHomePage.bind(this);
    }

    componentDidMount() {
        this._unsubscribeProtocol = [
            window.jitsiNodeAPI.ipc.on('protocol-data-msg', this._listenOnProtocolMessages),
            window.jitsiNodeAPI.ipc.on('protocol-data-homepage', this._listenOnProtocolHomePage)
        ];

        window.jitsiNodeAPI.ipc.send('renderer-ready');
    }

    componentWillUnmount() {
        this._unsubscribeProtocol.forEach(unsubscribe => unsubscribe());
        this._unsubscribeProtocol = [];
    }

    _listenOnProtocolMessages(inputURL: string) {
        if (inputURL.slice(-1) === '/') {
            inputURL = inputURL.slice(0, -1);
        }

        const conference = createConferenceObjectFromURL(inputURL, config.defaultServerURL);

        if (!conference) {
            return;
        }

        this.props.dispatch(push('/conference', conference));
    }

    _listenOnProtocolHomePage(uri: string) {
        this.props.dispatch(push('/login', uri));
    }

    render() {
        return (
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
        );
    }
}

export default connect()(App);
