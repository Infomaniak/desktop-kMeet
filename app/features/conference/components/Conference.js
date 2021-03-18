// @flow

import Spinner from '@atlaskit/spinner';

import React, { Component } from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';

import config from '../../config';

import { conferenceEnded, conferenceJoined } from '../actions';
import JitsiMeetExternalAPI from '../external_api';
import { LoadingIndicator, Wrapper } from '../styled';

const ENABLE_REMOTE_CONTROL = false;
const ENABLE_REMOTE_DRAW = false;

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

type State = {

    /**
     * If the conference is loading or not.
     */
    isLoading: boolean;
};

/**
 * Conference component.
 */
class Conference extends Component<Props, State> {
    /**
     * External API object.
     */
    _api: Object;

    /**
     * Conference Object.
     */
    _conference: Object;

    /**
     * Timer to cancel the joining if it takes too long.
     */
    _loadTimer: ?TimeoutID;

    /**
     * Reference to the element of this component.
     */
    _ref: Object;

    /**
     * Initializes a new {@code Conference} instance.
     *
     * @inheritdoc
     */
    constructor() {
        super();

        this.state = {
            isLoading: true
        };

        this._ref = React.createRef();

        this._onIframeLoad = this._onIframeLoad.bind(this);
        this._onVideoConferenceEnded = this._onVideoConferenceEnded.bind(this);
    }

    /**
     * Attach the script to this component.
     *
     * @returns {void}
     */
    componentDidMount() {
        const room = this.props.location.state.room;
        const subject = this.props.location.state.subject;
        const serverTimeout = config.defaultServerTimeout;
        const serverURL = this.props.location.state.serverURL || config.defaultServerURL;

        this._conference = {
            room,
            serverURL,
            subject
        };

        this._loadConference();

        // Set a timer for a timeout duration, if we haven't loaded the iframe by then,
        // give up.
        this._loadTimer = setTimeout(() => {
            this._navigateToHome(

                // $FlowFixMe
                {
                    error: 'Loading error',
                    type: 'error'
                },
                room,
                serverURL);
        }, serverTimeout * 1000);
    }

    /**
     * Remove conference on unmounting.
     *
     * @returns {void}
     */
    componentWillUnmount() {
        if (this._loadTimer) {
            clearTimeout(this._loadTimer);
        }
        if (this._api) {
            this._api.dispose();
        }
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <Wrapper innerRef = { this._ref }>
                { this._maybeRenderLoadingIndicator() }
            </Wrapper>
        );
    }

    /**
     * Load the conference by creating the iframe element in this component
     * and attaching utils from jitsi-meet-electron-utils.
     *
     * @returns {void}
     */
    _loadConference() {
        const url = new URL(this._conference.room, this._conference.serverURL);
        const roomName = url.pathname.split('/').pop();
        const host = this._conference.serverURL.replace(/https?:\/\//, '');

        const configOverwrite = {
            startWithAudioMuted: false,
            startWithVideoMuted: true,
            subject: this._conference.subject
        };

        const options = {
            configOverwrite,
            onload: this._onIframeLoad,
            parentNode: this._ref.current,
            roomName
        };

        this._api = new JitsiMeetExternalAPI(host, {
            ...options
        });


        this._api.on('suspendDetected', this._onVideoConferenceEnded);
        this._api.on('readyToClose', this._onVideoConferenceEnded);
        this._api.on('videoConferenceJoined',
            () => {
                this.props.dispatch(conferenceJoined(this._conference));
            }
        );

        const { RemoteControl,
            RemoteDraw,
            setupScreenSharingRender,
            setupAlwaysOnTopRender,
            initPopupsConfigurationRender,
            setupWiFiStats,
            setupPowerMonitorRender
        } = window.jitsiNodeAPI.jitsiMeetElectronUtils;

        initPopupsConfigurationRender(this._api);

        const iframe = this._api.getIFrame();

        setupScreenSharingRender(this._api);
        if (ENABLE_REMOTE_CONTROL) {
            new RemoteControl(iframe); // eslint-disable-line no-new
        }

        if (ENABLE_REMOTE_DRAW) {
            new RemoteDraw(iframe); // eslint-disable-line no-new
        }

        setupAlwaysOnTopRender(this._api);

        setupWiFiStats(iframe);
        setupPowerMonitorRender(this._api);
    }

    /**
     * It renders a loading indicator, if appropriate.
     *
     * @returns {?ReactElement}
     */
    _maybeRenderLoadingIndicator() {
        if (this.state.isLoading) {
            return (
                <LoadingIndicator>
                    <Spinner size = 'large' />
                </LoadingIndicator>
            );
        }
    }

    /**
     * Navigates to home screen (Welcome).
     *
     * @param {Event} event - Event by which the function is called.
     * @param {string} room - Room name.
     * @param {string} serverURL - Server URL.
     * @returns {void}
     */
    _navigateToHome(event: Event, room: ?string, serverURL: ?string) {
        this.props.dispatch(push('/', {
            error: event.type === 'error',
            room,
            serverURL
        }));
    }

    _onVideoConferenceEnded: (*) => void;

    /**
     * Dispatches conference ended and navigates to home screen.
     *
     * @param {Event} event - Event by which the function is called.
     * @returns {void}
     * @private
     */
    _onVideoConferenceEnded(event: Event) {
        this.props.dispatch(conferenceEnded(this._conference));
        this._navigateToHome(event);
    }

    _onIframeLoad: (*) => void;

    /**
     * Sets state of loading to false when iframe has completely loaded.
     *
     * @returns {void}
     */
    _onIframeLoad() {
        if (this._loadTimer) {
            clearTimeout(this._loadTimer);
            this._loadTimer = null;
        }

        this.setState({
            isLoading: false
        });
    }

}
export default connect()(Conference);
