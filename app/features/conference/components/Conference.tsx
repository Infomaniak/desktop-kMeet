import {
    initPopupsConfigurationRender,
    setupPictureInPictureRender,
    setupPowerMonitorRender,
    setupRemoteControlRender,
    setupRemoteDrawRender,
    setupScreenSharingRender
} from '@infomaniak/jitsi-meet-electron-sdk/renderer';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { Dispatch } from 'redux';

import i18n from '../../../i18n';
import type { IConference, IState } from '../../../types';
import config from '../../config';
import { getSetting } from '../../settings';
import Spinner from '../../shared/components/Spinner';
import { parseURLParams } from '../../utils/parseURLParams';
import { conferenceEnded, conferenceJoined } from '../actions';
import JitsiMeetExternalAPI from '../external_api';
import { LoadingIndicator, Wrapper } from '../styled';

const ENABLE_REMOTE_CONTROL = true;

interface IProps {
    _alwaysOnTopWindowEnabled?: boolean;
    _disableAGC?: boolean;
    _serverTimeout?: number;
    _serverURL?: string;
    conference: IConference;
    dispatch: Dispatch;
    location: {
        state: {
            room: string;
            serverURL?: string;
            subject?: string;
        };
    };
}

interface IConferenceState {
    isLoading: boolean;
}

class Conference extends Component<IProps, IConferenceState> {
    _ref = React.createRef<any>();
    _api?: JitsiMeetExternalAPI;
    _conference!: { room: string; serverURL: string; subject?: string; };
    _iframeLoaded?: boolean;
    _loadTimer?: ReturnType<typeof setTimeout>;

    constructor(props: IProps) {
        super(props);

        this.state = {
            isLoading: true
        };

        this._onIframeLoad = this._onIframeLoad.bind(this);
        this._onVideoConferenceEnded = this._onVideoConferenceEnded.bind(this);
        this._listenOnProtocolCreateMeeting = this._listenOnProtocolCreateMeeting.bind(this);
        this._listenOnProtocolJoinMeeting = this._listenOnProtocolJoinMeeting.bind(this);
        this._listenOnProtocolPlanMeeting = this._listenOnProtocolPlanMeeting.bind(this);
    }

    componentDidMount() {
        const room = this.props.location.state.room;
        const subject = this.props.location.state.subject;
        const serverTimeout = this.props._serverTimeout || config.defaultServerTimeout;
        const serverURL = this.props.location.state.serverURL
            || this.props._serverURL
            || config.defaultServerURL;

        this._conference = {
            room,
            serverURL,
            subject
        };

        this._loadConference();

        this._loadTimer = setTimeout(() => {
            this._navigateToHome(
                { type: 'error' } as any,
                room,
                serverURL
            );
        }, serverTimeout * 1000);
    }

    componentWillUnmount() {
        if (this._loadTimer) {
            clearTimeout(this._loadTimer);
        }
        if (this._api) {
            this._api.dispose();
        }
    }

    componentDidUpdate(prevProps: IProps) {
        if (prevProps.location !== this.props.location) {
            this.componentWillUnmount();
            this.componentDidMount();
        }
    }

    render() {
        return (
            <Wrapper innerRef = { this._ref as any }>
                {this._maybeRenderLoadingIndicator()}
            </Wrapper>
        );
    }

    _loadConference() {
        const appProtocolSurplus = `${config.appProtocolPrefix}://`;

        if (this._conference.serverURL.startsWith(appProtocolSurplus)) {
            this._conference.serverURL = this._conference.serverURL.replace(appProtocolSurplus, 'https://');
        }
        const url = new URL(this._conference.room, this._conference.serverURL);
        const roomName = url.pathname.split('/').pop();
        const host = this._conference.serverURL.replace(/https?:\/\//, '');
        const searchParameters = Object.fromEntries(url.searchParams);
        const hashParameters = parseURLParams(url);

        const locale = { lng: i18n.language };
        const urlParameters = {
            ...searchParameters,
            ...locale
        };

        const configOverwrite: Record<string, any> = {
            disableAGC: this.props._disableAGC,
            prejoinPageEnabled: true,
            subject: this._conference.subject,
            prejoinConfig: {
                enabled: true
            }
        };

        Object.entries(hashParameters).forEach(([ key, value ]) => {
            if (key.startsWith('config.')) {
                const configKey = key.substring('config.'.length);

                configOverwrite[configKey] = value;
            }
        });

        const options = {
            configOverwrite,
            parentNode: this._ref.current,
            roomName,
            sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms'
        };

        this._api = new JitsiMeetExternalAPI(host, {
            ...options,
            ...urlParameters
        });

        this._api.on('browserSupport', this._onIframeLoad);
        this._api.on('suspendDetected', this._onVideoConferenceEnded);
        this._api.on('readyToClose', this._onVideoConferenceEnded);
        this._api.on('videoConferenceJoined', () => {
            this.props.dispatch(conferenceJoined(this._conference));
        });

        // Setup the SDK renderer helpers. These run in the page ("main world")
        // next to the iframe API and reach the main process only through the
        // window.jitsiElectronSDK bridge installed by the SDK preload.
        initPopupsConfigurationRender(this._api);
        setupScreenSharingRender(this._api);
        setupPictureInPictureRender(this._api);
        setupPowerMonitorRender(this._api);

        if (ENABLE_REMOTE_CONTROL) {
            setupRemoteControlRender(this._api);
        }

        setupRemoteDrawRender(this._api);
    }

    _maybeRenderLoadingIndicator() {
        if (this.state.isLoading) {
            return (
                <LoadingIndicator>
                    <Spinner size = 'large' />
                </LoadingIndicator>
            );
        }
    }

    _navigateToHome(event: { type?: string; }, room?: string, serverURL?: string) {
        this.props.dispatch(push('/', {
            error: event.type === 'error',
            room,
            serverURL
        }));
    }

    _onVideoConferenceEnded(event: any) {
        this.props.dispatch(conferenceEnded(this._conference));
        this._navigateToHome(event);
    }

    _onIframeLoad() {
        if (this._loadTimer) {
            clearTimeout(this._loadTimer);
            this._loadTimer = undefined;
        }

        this.setState({
            isLoading: false
        });
    }

    _listenOnProtocolCreateMeeting() {
        this.props.dispatch(push('/', { event: 'startNewMeeting' }));
    }

    _listenOnProtocolJoinMeeting() {
        this.props.dispatch(push('/', { event: 'joinMeeting' }));
    }

    _listenOnProtocolPlanMeeting() {
        this.props.dispatch(push('/', { event: 'planMeeting' }));
    }
}

function _mapStateToProps(state: IState) {
    return {
        _alwaysOnTopWindowEnabled: getSetting(state, 'alwaysOnTopWindowEnabled', true),
        _disableAGC: state.settings.disableAGC,
        _serverURL: state.settings.serverURL,
        _serverTimeout: state.settings.serverTimeout
    };
}

export default connect(_mapStateToProps)(Conference);
